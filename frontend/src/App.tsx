import { useEffect, useState } from 'react';
import { Mic, Square, Send, Loader2 } from 'lucide-react';
import { client, endpoints } from './api/client';
import { useSessions } from './hooks/useSessions';
import { useBlocks } from './hooks/useBlocks';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useLLM } from './hooks/useLLM';

import { Sidebar } from './components/Sidebar';
import { TranscriptionList } from './components/TranscriptionList';
import { Editor } from './components/Editor';
import { SettingsModal } from './components/SettingsModal';
import type {
  PromptTemplate,
  ApiConfig,
  VocabularyItem
} from './types';

// --- Dummy Data (Templates & Vocab still dummy for now) ---
const initialTemplates: PromptTemplate[] = [
  { id: 't1', title: '要約 (リスト形式)', content: '以下のテキストを要約し、重要なポイントを箇条書きのリスト形式で出力してください。' },
  { id: 't2', title: 'Markdownレポート', content: '以下の内容を元に、見出し、太字などを適切に使用したMarkdown形式のレポートを作成してください。' },
  { id: 't3', title: 'メール返信作成', content: '以下の入力テキスト（相手からのメール文面など）に対し、適切な返信案を作成してください。丁寧なビジネスメールの口調でお願いします。' },
];

const initialVocabulary: VocabularyItem[] = [
  { id: 'v1', reading: 'きょうぎかい', word: '協議会' },
  { id: 'v2', reading: 'ぷろじぇくとあるふぁ', word: 'Project Alpha' },
];

const mockApiConfig: { stt: ApiConfig, llm: ApiConfig } = {
  stt: { url: '/api/stt/transcribe', authType: 'bearer', keyMasked: '●●●●●●●● (Backend Config)' },
  llm: { url: '/api/llm/chat/stream', authType: 'bearer', keyMasked: '●●●●●●●● (Backend Config)' }
};

export default function App() {
  // --- State ---
  const { sessions, fetchSessions, deleteSessions, updateSessionTitle, createSession } = useSessions();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const { blocks, isLoading: blocksLoading, addBlock, updateBlock, deleteBlock, fetchBlocks, setBlocks } = useBlocks();

  const [editorContent, setEditorContent] = useState<string>("# New Session...");

  // Audio Recorder
  const {
    isRecording,
    duration: recordingDuration,
    startRecording,
    stopRecording,
    error: recordingError
  } = useAudioRecorder();

  // Fetch blocks when session selected
  useEffect(() => {
    if (selectedSessionId) {
      fetchBlocks(selectedSessionId);
      // Also reset editor content (or fetch editor content if persisted)
      const session = sessions.find(s => s.id === selectedSessionId);
      setEditorContent(`# ${session?.summary || 'Session'}\n...`);
    } else {
      setBlocks([]);
      setEditorContent("");
    }
  }, [selectedSessionId, fetchBlocks, sessions]); // Added sessions to dep array for title update

  // UI State
  const [isPromptRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Settings State
  // Settings State
  const [templates, setTemplates] = useLocalStorage<PromptTemplate[]>('vox_templates', initialTemplates);
  const [vocabulary, setVocabulary] = useLocalStorage<VocabularyItem[]>('vox_vocabulary', initialVocabulary);
  const [generalSettings, setGeneralSettings] = useLocalStorage('vox_general_settings', { language: 'ja', encoding: 'UTF-8', lineEnding: 'LF' });

  // Prompt Input State
  const [promptText, setPromptText] = useState("");
  const [selectedFooterTemplateId, setSelectedFooterTemplateId] = useState("");

  // --- Text Block Handling ---
  const handleAddTextBlock = async () => {
    console.log("handleAddTextBlock called");
    // If no session exists, create one first
    const currentSession = sessions.find(s => s.id === selectedSessionId);
    let targetSessionId = currentSession?.id;

    if (!targetSessionId) {
      console.log("No session selected, creating new session...");
      try {
        const timestamp = new Date().toLocaleString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        const newSession = await createSession(`Memo ${timestamp}`, "Text Note");
        console.log("New session created:", newSession);
        targetSessionId = newSession.id;
        // Select the new session
        // The Sidebar expects a session ID, not a full object.
        setSelectedSessionId(newSession.id);
        console.log("selectedSessionId set to:", newSession.id);
        // Also ensure sessions are re-fetched to include the new one
        await fetchSessions();
      } catch (error) {
        console.error("Failed to auto-create session:", error);
        alert("セッションの作成に失敗しました。");
        return;
      }
    }

    if (targetSessionId) {
      console.log("Adding text block to session:", targetSessionId);
      await addBlock(targetSessionId, "text", "");
      console.log("Text block added");
    }
  };

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    if (selectedSessionId) {
      formData.append('session_id', selectedSessionId);
    }

    try {
      const response = await client.post(endpoints.audio.upload, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { session_id } = response.data;

      if (session_id !== selectedSessionId) {
        // New session created
        await fetchSessions();
        setSelectedSessionId(session_id);
      } else {
        // Existing session, just refresh blocks
        fetchBlocks(session_id);
      }
    } catch (err) {
      console.error("Upload failed", err);
      alert("アップロードに失敗しました。");
    }
  };

  const handleReTranscribe = async (id: string) => {
    try {
      await client.post(endpoints.stt.transcribe(id));
      alert(`ブロックID: ${id} の再認識を開始しました (バックグラウンド)`);
      if (selectedSessionId) fetchBlocks(selectedSessionId);
    } catch (err) {
      console.error(err);
    }
  };

  // LLM Hook
  const { isGenerating, generate } = useLLM();

  const handleRunLLM = async () => {
    if (!selectedSessionId) {
      alert("セッションが選択されていません。");
      return;
    }

    const template = templates.find(t => t.id === selectedFooterTemplateId);
    const systemPrompt = template ? template.content : "";
    const extraPrompt = promptText;

    // Build context from blocks
    // If blocks selected, use them. Else use all? For now use checked blocks or all if none checked.
    const checkedBlocks = blocks.filter(b => b.isChecked);
    const targetBlocks = checkedBlocks.length > 0 ? checkedBlocks : blocks;

    if (targetBlocks.length === 0) {
      alert("対象となる文字起こしブロックがありません。");
      return;
    }

    const contextText = targetBlocks.map(b => `- ${b.text}`).join('\n');

    const messages: any[] = [
      { role: "system", content: systemPrompt || "あなたは優秀なアシスタントです。" },
      { role: "user", content: `以下のテキストを元に処理を行ってください。\n\n[Context]\n${contextText}\n\n[Instruction]\n${extraPrompt}` }
    ];

    // Reset or prepare editor content
    // We want to APPEND or replace? 
    // Let's create a new Markdown section
    setEditorContent(prev => prev + `\n\n## AI生成結果\n`);

    try {
      await generate(messages, (chunk) => {
        setEditorContent(prev => prev + chunk);
      });
    } catch (err) {
      console.error(err);
      alert("AI生成中にエラーが発生しました。");
    }
  };

  const handleDeleteBlock = async (id: string) => {
    await deleteBlock(id);
  };

  // Wrapper for setting blocks locally if needed (e.g. checkbox)
  // The useBlocks hook exposes updateBlock which does PATCH.
  // TranscriptionList might expect setBlocks to just update local state?
  // We should modify TranscriptionList to use updateBlock callback instead of setBlocks if possible.
  // BUT for now, we intercept setBlocks to support local updates via TranscriptionList props?
  // Actually TranscriptionList takes setBlocks.
  // We can wrap it:
  const handleSetBlocks = (newBlocksOrFn: any) => {
    // This is complex because setBlocks supports function update.
    // It's better to update TranscriptionList to accept specific handlers.
    // But to minimize changes, let's just use the local state setter from hook
    // and assume handleBlockUpdate handles persistence.
    // Wait, hook returns setBlocks which is simple state setter.
    // If we only use setBlocks, it won't persist.
    setBlocks(newBlocksOrFn);
  };

  const handleBlockUpdate = (id: string, newText: string) => {
    updateBlock(id, { text: newText });
  };

  const handleBlockCheck = (id: string, isChecked: boolean) => {
    updateBlock(id, { isChecked });
  };

  const handleDeleteSessions = async (ids: string[]) => {
    await deleteSessions(ids);
    if (selectedSessionId && ids.includes(selectedSessionId)) {
      setSelectedSessionId(null);
    }
  };

  const handleUpdateSessionTitle = async (id: string, newTitle: string) => {
    await updateSessionTitle(id, newTitle);
  };

  const handleFooterTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFooterTemplateId(e.target.value);
    const tmpl = templates.find(t => t.id === e.target.value);
    if (tmpl) setPromptText(tmpl.content);
  };

  const handlePromptRecordToggle = async () => {
    alert("プロンプト音声入力機能は現在開発中です。");
  };

  const handleMainRecordingToggle = async () => {
    if (isRecording) {
      const file = await stopRecording();
      if (file) {
        await handleFileUpload(file);
      }
    } else {
      await startRecording();
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-100 text-gray-800 font-sans overflow-hidden">

      {/* --- Left Pane: Sidebar --- */}
      <Sidebar
        history={sessions}
        onSelectSession={(id) => setSelectedSessionId(id)}
        onDeleteSessions={handleDeleteSessions}
        onUpdateSessionTitle={handleUpdateSessionTitle}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* --- Main Area --- */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 flex min-h-0">

          {/* --- Center Pane: Transcription List --- */}
          {(selectedSessionId && !blocksLoading) ? (
            <TranscriptionList
              blocks={blocks}
              setBlocks={handleSetBlocks} // Passing setBlocks but mainly for local optmistic?
              onAddTextBlock={handleAddTextBlock}
              onUploadFile={handleFileUpload}
              onDeleteBlock={handleDeleteBlock}
              onReTranscribe={handleReTranscribe}
              onUpdateBlock={handleBlockUpdate}
              onCheckBlock={handleBlockCheck}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-400 gap-4">
              {blocksLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <p>セッションを選択またはファイルを作成してください</p>
                  <button
                    onClick={handleAddTextBlock}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Square size={16} /> テキストノートを作成
                  </button>
                </>
              )}
            </div>
          )}

          {/* --- Right Pane: Editor --- */}
          <Editor
            content={editorContent}
            setContent={setEditorContent}
          />
        </div>

        {/* --- Footer Control --- */}
        <footer className="h-auto border-t border-gray-200 bg-white p-4 shadow-lg z-10 flex flex-col gap-3">
          <div className="flex items-center gap-4">
            {/* Left: Mic Button */}
            <button
              onClick={handleMainRecordingToggle}
              className={`
              w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all
              ${isRecording
                  ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200'
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:shadow-lg hover:scale-105'
                }
            `}
              title={isRecording ? "録音を停止" : "録音を開始"}
            >
              {isRecording ? <Square size={20} fill="currentColor" /> : <Mic size={24} />}
            </button>

            {/* Recording Status / Timer */}
            {isRecording && (
              <div className="ml-4 flex items-center gap-2">
                <span className="text-red-500 text-sm font-mono font-bold animate-pulse">● REC</span>
                <span className="text-gray-600 text-sm font-mono">{new Date(recordingDuration * 1000).toISOString().substr(14, 5)}</span>
              </div>
            )}
            {recordingError && (
              <div className="ml-4 text-red-500 text-xs">{recordingError}</div>
            )}
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <select className="text-sm border border-gray-300 rounded px-2 py-1 bg-gray-50 hover:bg-gray-100 focus:outline-none text-gray-700" value={selectedFooterTemplateId} onChange={handleFooterTemplateSelect}>
                  <option value="">テンプレートを選択...</option>
                  {templates.map((t) => (<option key={t.id} value={t.id}>{t.title}</option>))}
                </select>
                <span className="text-xs text-gray-400">{blocks.filter(b => b.isChecked).length} ブロック選択中</span>
              </div>
              <div className="flex gap-2 w-full">
                <div className="relative flex-1 flex">
                  <textarea className="w-full border border-gray-300 rounded-l-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-h-[42px] max-h-[80px] resize-y" placeholder="プロンプトを入力..." value={promptText} onChange={(e) => setPromptText(e.target.value)} />
                  <button onClick={handlePromptRecordToggle} className={`px-3 border-y border-r border-gray-300 rounded-r-lg hover:bg-gray-50 flex items-center justify-center transition-colors ${isPromptRecording ? 'text-red-500 bg-red-50 border-red-200' : 'text-gray-500'}`} title="音声で指示を追加"><Mic size={18} className={isPromptRecording ? "animate-pulse" : ""} /></button>
                </div>
                <button onClick={handleRunLLM} disabled={isGenerating} className={`bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-colors h-auto ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} 実行
                </button>
              </div>
            </div>
          </div>
        </footer>
      </main>

      {/* --- Settings Modal --- */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          templates={templates}
          setTemplates={setTemplates}
          vocabulary={vocabulary}
          setVocabulary={setVocabulary}
          apiConfig={mockApiConfig}
          generalSettings={generalSettings}
          setGeneralSettings={setGeneralSettings}
        />
      )}
    </div>
  );
}
