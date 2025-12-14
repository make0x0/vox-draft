import { useEffect, useState, useRef } from 'react';
import { Mic, Square, Send, Loader2, Upload } from 'lucide-react';

import { client, endpoints } from './api/client';
import { useSessions } from './hooks/useSessions';
import { useBlocks } from './hooks/useBlocks';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useLLM } from './hooks/useLLM';
import { useSettingsData } from './hooks/useSettingsData';

import { Sidebar } from './components/Sidebar';
import { TranscriptionList } from './components/TranscriptionList';
import { Editor } from './components/Editor';
import { SettingsModal } from './components/SettingsModal';
import { NotificationManager } from './components/NotificationManager';
import type { TaskStatus } from './components/NotificationManager';
import type {
  EditorRevision
} from './types';

// --- Dummy Data Removed ---

export default function App() {
  // --- State ---
  const { sessions, fetchSessions, deleteSessions, updateSessionTitle, createSession, restoreSession, emptySessionTrash } = useSessions();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const { blocks, isLoading: blocksLoading, addBlock, updateBlock, deleteBlock, fetchBlocks, setBlocks, restoreBlock, emptyTrash } = useBlocks();

  // Settings Data Hook (Persistence)
  const settingsData = useSettingsData();
  // Unwrap for cleaner usage if desired, or pass settingsData directly
  const { templates, vocabulary, setTemplates: _setTemplates, setVocabulary: _setVocabulary } = settingsData;

  const [editorContent, setEditorContent] = useState<string>("# New Session...");

  // Ref for footer upload
  const footerFileInputRef = useRef<HTMLInputElement>(null);

  // Audio Recorder
  const {
    isRecording,
    duration: recordingDuration,
    startRecording,
    stopRecording,
    error: recordingError
  } = useAudioRecorder();

  // Fetch blocks when session selected
  // Fetch blocks when session selected
  useEffect(() => {
    if (selectedSessionId) {
      fetchBlocks(selectedSessionId);
      // Editor content is now handled by handleDisplaySession / Revision loading
    } else {
      setBlocks([]);
      // setEditorContent(""); // Handled by handleNewSession / logic
    }
  }, [selectedSessionId, fetchBlocks]); // Removed sessions from dep array if not needed

  // UI State
  const [isPromptRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tasks, setTasks] = useState<TaskStatus[]>([]);
  // System Config State
  const [systemConfig, setSystemConfig] = useState<any>({
    notifications: {
      processing: { enabled: true },
      success: { enabled: true, duration: 4000 },
      error: { enabled: true, duration: 8000 }
    },
    stt: { provider: 'loading...', url: '' },
    llm: { provider: 'loading...', url: '' }
  });

  // Fetch System Config
  useEffect(() => {
    client.get('/api/system/config')
      .then(res => {
        setSystemConfig(res.data);
      })
      .catch(err => {
        console.error("Failed to fetch system config:", err);
      });
  }, []);

  // Monitor blocks to update tasks
  useEffect(() => {
    // 1. Detect new processing blocks
    const processingBlocks = blocks.filter(b => !b.isDeleted && (b.text === '(Transcription queued...)' || b.text === '(Processing...)'));

    setTasks(prevTasks => {
      let newTasks = [...prevTasks];
      let changed = false;

      // Add new tasks
      processingBlocks.forEach(b => {
        if (!newTasks.find(t => t.id === b.id)) {
          newTasks.push({
            id: b.id,
            type: 'processing',
            message: `ブロック ${b.id.substring(0, 6)}... の音声を認識中`,
            startTime: Date.now(),
            source: 'block'
          });
          changed = true;
        }
      });

      // Update existing active tasks
      newTasks = newTasks.map(t => {
        if (t.type !== 'processing') return t; // Already done

        // Skip system tasks (LLM etc)
        if (t.source === 'system') return t;

        // Find current block state
        const block = blocks.find(b => b.id === t.id);
        if (!block) {
          console.log(`[Debug] Block ${t.id} disappeared`);
          // Block disappeared? Mark error or ignore?
          // Let's mark error
          changed = true;
          return { ...t, type: 'error', message: 'ブロックが見つかりません', endTime: Date.now() };
        }

        console.log(`[Debug] Checking block ${block.id}: text="${block.text}"`);

        // Check for specific processing states (queued, retrying, etc.)
        // Backend now sends: "(Transcription queued...)", "(Retry 1/3...)", "(Error 500: Retrying...)"
        // All start with "(".
        if (block.text.startsWith('(') && block.text.endsWith(')')) {
          console.log(`[Debug] Processing: ${block.id}, text: ${block.text}`);
          // Still processing, update message if changed
          if (block.text !== t.message) {
            changed = true;
            return { ...t, type: 'processing', message: block.text, endTime: undefined };
          }
          return t;
        }

        changed = true;

        // Define explicit error conditions
        const isError = block.text.startsWith('[Error]') ||
          block.text.includes('Error:') ||
          block.text.includes('Failed:') ||
          // If text is very short/empty and NOT processing, it might be an empty transcription or failure
          (!block.text && !block.filePath); // Just a heuristic, maybe not reliable

        if (isError) {
          console.log(`[Debug] Error detected: ${block.id}, text: ${block.text}`);
          return { ...t, type: 'error', message: block.text || '認識エラー', endTime: Date.now() };
        } else if (block.text.startsWith('(') && block.text.includes('Connection Error')) {
          // Should be caught by the first if, but just in case
          console.log(`[Debug] Connection Error Retry: ${block.id}, text: ${block.text}`);
          if (block.text !== t.message) {
            changed = true;
            return { ...t, type: 'processing', message: block.text, endTime: undefined };
          }
          return t;
        } else {
          // Success case
          // Assuming if it's not processing (starts with paren) and not explicit error, it's content.
          // However, if we crashed, we might have garbage or old text? 
          // We rely on backend updating to [Error] on crash.
          console.log(`[Debug] Success: ${block.id}, text: ${block.text}`);
          return { ...t, type: 'success', message: '認識が完了しました', endTime: Date.now() };
        }
      });

      return changed ? newTasks : prevTasks;
    });
  }, [blocks]);

  // Polling for active tasks
  useEffect(() => {
    const hasProcessing = tasks.some(t => t.type === 'processing');
    if (!hasProcessing || !selectedSessionId) return;

    const interval = setInterval(() => {
      fetchBlocks(selectedSessionId, true); // Poll for updates silently
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [tasks, selectedSessionId, fetchBlocks]);

  // Auto dismiss success/error tasks based on Config
  useEffect(() => {
    // Dismiss Success
    const successTasks = tasks.filter(t => t.type === 'success');
    if (successTasks.length > 0) {
      const duration = systemConfig.notifications?.success?.duration || 4000;
      const timer = setTimeout(() => {
        setTasks(prev => prev.filter(t => t.type !== 'success'));
      }, duration);
      return () => clearTimeout(timer);
    }

    // Dismiss Error
    const errorTasks = tasks.filter(t => t.type === 'error');
    if (errorTasks.length > 0) {
      const duration = systemConfig.notifications?.error?.duration || 8000;
      const timer = setTimeout(() => {
        setTasks(prev => prev.filter(t => t.type !== 'error'));
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [tasks, systemConfig]);

  const handleDismissTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const addNotification = (type: 'success' | 'error' | 'processing', message: string) => {
    // Check config if enabled (optional logic here, but easier in UI to just hide)
    // But if we don't add to state, we don't need UI logic.
    // However, for processing, we NEED state for logic.
    // For success/error, we can skip adding if disabled?
    // User asked "ON/OFF". If OFF, maybe just don't show.
    // If I skip active adding, logic breaks? No, logic uses 'processing'.
    // 'success'/'error' are terminal states.
    // If I don't add 'success', it's fine.
    // But let's handle visibility in NotificationManager for consistency with "processing" which MUST exist in state.

    setTasks(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      type,
      message,
      startTime: Date.now(),
      endTime: type !== 'processing' ? Date.now() : undefined
    }]);
  };

  // Settings State - Server Side
  const { generalSettings, updateGeneralSettings } = settingsData;
  const setGeneralSettings = (updater: any) => {
    // Adapter for existing code expecting useState-like setter
    const newSettings = typeof updater === 'function' ? updater(generalSettings) : updater;
    updateGeneralSettings(newSettings);
  };
  // const [generalSettings, setGeneralSettings] = useLocalStorage('vox_general_settings', { ... }); // Removed

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
        const newSession = await createSession("", "Text Note");
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
        addNotification("error", "セッションの作成に失敗しました。");
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
      addNotification("error", "アップロードに失敗しました。");
    }
  };

  const handleReTranscribe = async (id: string) => {
    try {
      await client.post(endpoints.stt.transcribe(id));
      addNotification("success", `ブロックID: ${id.substring(0, 6)}... の再認識を開始しました`);
      if (selectedSessionId) fetchBlocks(selectedSessionId);
    } catch (err) {
      console.error(err);
    }
  };

  // LLM Hook
  const { isGenerating, generate } = useLLM();

  const handleRunLLM = async () => {
    if (!selectedSessionId) {
      addNotification("error", "セッションが選択されていません。");
      return;
    }

    const template = templates.find(t => t.id === selectedFooterTemplateId);
    const systemPrompt = template ? template.content : "";
    const extraPrompt = promptText;

    // Build context from blocks
    // Exclude deleted blocks
    const checkedBlocks = blocks.filter(b => b.isChecked && !b.isDeleted);

    // User requested checked blocks concatenated in order. 
    // `blocks` is already sorted by backend response (usually creation time or index).
    // If user wants specific drag-order, `blocks` state should reflect that.
    const targetBlocks = (checkedBlocks.length > 0 ? checkedBlocks : blocks.filter(b => !b.isDeleted))
      .filter(b => !b.text.startsWith("[Error]") && !b.text.includes("Error:") && !b.text.includes("Failed:"));

    if (targetBlocks.length === 0 && !editorContent.trim() && !extraPrompt.trim()) {
      addNotification("error", "コンテキスト（文字起こし、エディタ、またはプロンプト）が空です。");
      return;
    }

    const contextText = targetBlocks.map(b => `- ${b.text}`).join('\n');

    // Construct the full prompt content using configurable structure
    const structure = (generalSettings as any).promptStructure || `{system_prompt}\n\n<Context>\n{checked_transcribe_list}\n</Context>\n\n<CurrentContent>\n{recentry_output}\n</CurrentContent>\n\n<UserInstruction>\n{user_prompt}\n</UserInstruction>`;

    const fullUserContent = structure
      .replace('{system_prompt}', systemPrompt || "あなたは優秀なアシスタントです。") // Wait, system prompt is typically separate. If used here, should we clear system role?
      // Actually, standard practice: system role instruction goes to "system" message.
      // But user might want to embed it in user prompt?
      // "System Prompt" usually implies independent system instruction.
      // If user puts {system_prompt} in the structure, we embed it in USER message.
      // For now let's keep the system message separate as "You are helpful assistant" or whatever, 
      // AND allow embedding the specific template instruction in the user message if configured.
      // BUT `systemPrompt` variable above IS the template content.
      // If user wants to format it:
      .replace('{user_prompt}', extraPrompt)
      .replace('{checked_transcribe_list}', contextText)
      .replace('{recentry_output}', editorContent);

    console.log("Full Prompt Constructed:", fullUserContent);

    const messages: any[] = [
      { role: "system", content: "You are a helpful and intelligent AI assistant. Please output your response in Markdown format." },
      { role: "user", content: fullUserContent }
    ];

    // Save current state as revision before overwriting
    await handleSaveRevision("Before AI Execution");

    // Clear editor content to receive new AI output
    setEditorContent("");

    const llmTaskId = Math.random().toString(36).substring(7);

    // Manually add initial task to track ID
    setTasks(prev => [...prev, {
      id: llmTaskId,
      type: 'processing',
      message: "AI生成を開始します...",
      startTime: Date.now(),
      source: 'system'
    }]);

    let generatedText = "";

    try {
      await generate(messages, (chunk) => {
        generatedText += chunk;
        setEditorContent(prev => prev + chunk);
      }, (statusMsg, type) => {
        // Handle status updates
        setTasks(prev => prev.map(t => t.id === llmTaskId ? {
          ...t,
          message: statusMsg,
          type: type === 'error' ? 'error' : 'processing',
          endTime: type === 'error' ? Date.now() : undefined
        } : t));
      });

      // Success completion (if not already error)
      setTasks(prev => prev.map(t => t.id === llmTaskId ? { ...t, type: 'success', message: '生成が完了しました', endTime: Date.now() } : t));

      // Auto-save revision of the result
      await handleSaveRevision("AI Generation Result", generatedText); // Use generatedText directly

    } catch (err) {
      console.error("LLM Generation Error caught in App.tsx:", err);
      // Ensure error shown
      const errMsg = (err as Error).message || "AI生成中にエラーが発生しました。";
      setTasks(prev => prev.map(t => t.id === llmTaskId ? { ...t, type: 'error', message: errMsg, endTime: Date.now() } : t));
    }
  };

  const handleDeleteBlock = async (id: string) => {
    await deleteBlock(id);
  };

  const handleSetBlocks = (newBlocksOrFn: any) => {
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
    addNotification("error", "プロンプト音声入力機能は現在開発中です。");
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

  // Revisions State
  const [revisions, setRevisions] = useState<EditorRevision[]>([]);
  const [currentRevisionIndex, setCurrentRevisionIndex] = useState(-1);

  const fetchRevisions = async (sessionId: string) => {
    try {
      const res = await client.get(`/api/sessions/${sessionId}/revisions`);
      setRevisions(res.data);
      return res.data;
    } catch (err) {
      console.error("Failed to fetch revisions", err);
      return [];
    }
  };

  const handleSaveRevision = async (note?: string, contentOverride?: string) => {
    if (!selectedSessionId) return;
    try {
      const res = await client.post(`/api/sessions/${selectedSessionId}/revisions`, {
        content: contentOverride || editorContent,
        note: note || "Manual Save"
      });
      setRevisions(prev => [res.data, ...prev]);
      setCurrentRevisionIndex(0); // Switch to the newly created revision (latest)
      addNotification("success", "リビジョンを保存しました");
    } catch (err) {
      console.error(err);
      addNotification("error", "保存に失敗しました");
    }
  };

  const handleLoadRevision = (index: number) => {
    if (index < -1 || index >= revisions.length) return;
    setCurrentRevisionIndex(index);
    // If index is -1, it means "Head". Logic depends on whether we want to allow editing "dirty" head.
    // For now, if we go back to -1, we might ideally want to clear editor or keep last state?
    // Actually, "Latest (Unsaved)" implies the state BEFORE we started browsing.
    // But we are overwriting `editorContent` when we browse.
    // So "Unsaved" state is lost unless we saved it?
    // Let's assume user saves before browsing if they care.
    // OR: revision 0 IS the latest saved.
    // Let's just load content of revisions[index].
    const rev = revisions[index];
    if (rev) {
      setEditorContent(rev.content);
    }
  };

  const handleDeleteRevision = async () => {
    if (currentRevisionIndex < 0) return;
    const rev = revisions[currentRevisionIndex];
    if (!rev) return;
    if (!confirm("このリビジョンを削除しますか？")) return;

    try {
      await client.delete(`/api/revisions/${rev.id}`);
      const newRevisions = revisions.filter(r => r.id !== rev.id);
      setRevisions(newRevisions);

      // Navigate to nearest available
      if (newRevisions.length > 0) {
        const newIndex = Math.min(currentRevisionIndex, newRevisions.length - 1);
        setCurrentRevisionIndex(newIndex);
        setEditorContent(newRevisions[newIndex].content);
      } else {
        setCurrentRevisionIndex(-1);
        setEditorContent("");
      }
      addNotification("success", "リビジョンを削除しました");
    } catch (err) {
      addNotification("error", "削除に失敗しました");
    }
  };

  const handleDisplaySession = async (sessionId: string) => {
    setSelectedSessionId(sessionId);

    // Fetch Revisions
    const revs = await fetchRevisions(sessionId);
    if (revs && revs.length > 0) {
      // Load latest revision by default
      setRevisions(revs);
      setEditorContent(revs[0].content);
      setCurrentRevisionIndex(0);
    } else {
      setRevisions([]);
      setCurrentRevisionIndex(-1);
      // Fallback to summary logic if no revisions
      const session = sessions.find(s => s.id === sessionId);
      setEditorContent(`# ${session?.summary || 'Session'}\n...`);
    }
  };

  const handleNewSession = () => {
    setSelectedSessionId(null);
    setRevisions([]);
    setCurrentRevisionIndex(-1);
    setEditorContent("# New Session...");
  };

  const handleGenerateTitle = async (sessionId: string): Promise<string> => {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/sessions/${sessionId}/blocks`);
    if (!res.ok) throw new Error("Failed to fetch blocks");
    const blocksData = await res.json();
    const fullText = blocksData.map((b: any) => b.text).join("\n");

    const genRes = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/llm/generate_title`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: fullText })
    });
    if (!genRes.ok) throw new Error("Failed to generate title");
    const data = await genRes.json();
    return data.title;
  };

  // ... imports

  // Resizing State
  const [sidebarWidth, setSidebarWidth] = useLocalStorage('vox_sidebar_width', 300);
  const [editorWidth, setEditorWidth] = useLocalStorage('vox_editor_width', 350);
  const [promptHeight, setPromptHeight] = useLocalStorage('vox_prompt_height', '80px');

  const handleResetLayout = () => {
    setSidebarWidth(300);
    setEditorWidth(350);
    setPromptHeight('80px');
  };

  const isDraggingSidebar = useRef(false);
  const isDraggingEditor = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSidebar.current) {
        setSidebarWidth(Math.max(200, Math.min(600, e.clientX)));
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
      } else if (isDraggingEditor.current) {
        // Calculate width from right edge
        const newWidth = window.innerWidth - e.clientX;
        setEditorWidth(Math.max(250, Math.min(800, newWidth)));
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
      }
    };

    const handleMouseUp = () => {
      if (isDraggingSidebar.current || isDraggingEditor.current) {
        isDraggingSidebar.current = false;
        isDraggingEditor.current = false;
        document.body.style.cursor = 'default';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="flex h-screen w-full bg-gray-100 text-gray-800 font-sans overflow-hidden relative">
      <NotificationManager tasks={tasks} onDismiss={handleDismissTask} config={systemConfig.notifications} />

      {/* --- Left Pane: Sidebar --- */}
      {/* --- Left Pane: Sidebar --- */}
      <Sidebar
        history={sessions}
        onSelectSession={handleDisplaySession}
        onDeleteSessions={handleDeleteSessions}
        onUpdateSessionTitle={handleUpdateSessionTitle}
        onGenerateTitle={handleGenerateTitle}
        onOpenSettings={() => setShowSettings(true)}
        onNewSession={handleNewSession}
        onResetLayout={handleResetLayout}
        width={sidebarWidth}
        onRestoreSession={restoreSession}
        onEmptyTrash={emptySessionTrash}
      />

      {/* Resize Handle Left */}
      <div
        className="w-1 hover:w-1.5 bg-gray-200 hover:bg-blue-400 cursor-col-resize z-30 transition-colors flex-shrink-0"
        onMouseDown={() => { isDraggingSidebar.current = true; }}
      />

      {/* --- Main Area --- */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 flex min-h-0">

          {/* --- Center Pane: Transcription List & Recording --- */}
          <div className="flex-1 flex flex-col min-w-0 bg-white relative">
            <div className="flex-1 overflow-hidden flex flex-col">
              {(selectedSessionId && !blocksLoading) ? (
                <TranscriptionList
                  blocks={blocks}
                  setBlocks={handleSetBlocks}
                  onAddTextBlock={handleAddTextBlock}
                  onUploadFile={handleFileUpload}
                  onDeleteBlock={handleDeleteBlock}
                  onReTranscribe={handleReTranscribe}
                  onUpdateBlock={handleBlockUpdate}
                  onCheckBlock={handleBlockCheck}
                  onRestoreBlock={restoreBlock}
                  onEmptyTrash={() => {
                    if (selectedSessionId) emptyTrash(selectedSessionId);
                  }}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-400 gap-6 p-4">
                  {blocksLoading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>
                      <div className="text-center">
                        <p className="text-lg font-medium text-gray-600 mb-2">セッションを開始</p>
                        <p className="text-sm">左側のリストからセッションを選択するか、<br />新規作成・録音を開始してください。</p>
                      </div>

                      <div className="flex flex-col gap-3 w-full max-w-xs">
                        <button
                          onClick={handleAddTextBlock}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all font-medium"
                        >
                          <Square size={18} /> テキストノートを作成
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* --- Center Pane Footer: Recording Controls --- */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 backdrop-blur-sm flex items-center justify-center gap-4">
              <button
                onClick={handleMainRecordingToggle}
                className={`
                    w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-105
                    ${isRecording
                    ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200'
                    : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                  }
                    `}
                title={isRecording ? "録音を停止" : "ブロックに音声を追加 / 新規録音"}
              >
                {isRecording ? <Square size={24} fill="currentColor" /> : <Mic size={28} />}
              </button>

              {isRecording && (
                <div className="flex flex-col">
                  <span className="text-red-500 text-xs font-bold animate-pulse">● RECORDING</span>
                  <span className="text-gray-800 text-xl font-mono font-medium">{new Date(recordingDuration * 1000).toISOString().substr(14, 5)}</span>
                </div>
              )}

              {!isRecording && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 font-medium hidden sm:block">
                    {selectedSessionId ? "このセッションに音声を追加" : "録音して新規セッションを作成"}
                  </span>

                  <div className="flex items-center">
                    <input
                      type="file"
                      ref={footerFileInputRef}
                      className="hidden"
                      accept="audio/*,video/*,.m4a,.mp3,.wav"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                          e.target.value = ''; // Reset
                        }
                      }}
                    />
                    <button
                      onClick={() => footerFileInputRef.current?.click()}
                      className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded-md transition-all border border-transparent hover:border-blue-100"
                      title="音声ファイルをアップロードして開始"
                    >
                      <Upload size={14} />
                      <span>ファイル選択</span>
                    </button>
                  </div>
                </div>
              )}

              {recordingError && (
                <div className="text-red-500 text-xs bg-red-50 px-2 py-1 rounded border border-red-100">{recordingError}</div>
              )}
            </div>
          </div>

          {/* Resize Handle Right */}
          <div
            className="w-1 hover:w-1.5 bg-gray-200 hover:bg-blue-400 cursor-col-resize z-30 transition-colors flex-shrink-0"
            onMouseDown={() => { isDraggingEditor.current = true; }}
          />

          {/* --- Right Pane: Editor --- */}
          <Editor
            content={editorContent}
            setContent={setEditorContent}
            width={editorWidth}
            revisions={revisions}
            currentRevisionIndex={currentRevisionIndex}
            onLoadRevision={handleLoadRevision}
            onSaveRevision={() => handleSaveRevision("Manual Save")}
            onDeleteRevision={handleDeleteRevision}
            isBusy={isGenerating}
          />
        </div>

        {/* --- Footer Control (LLM Only) --- */}
        <footer className="h-auto border-t border-gray-200 bg-white p-4 shadow-lg z-10 flex flex-col gap-3">
          <div className="flex items-center gap-4">
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
                  <textarea
                    className="w-full border border-gray-300 rounded-l-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-h-[42px] max-h-[400px] resize-y"
                    placeholder="AIへの指示・プロンプトを入力..."
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    style={{ height: promptHeight }}
                    onMouseUp={(e) => {
                      // Save height after resize
                      const h = e.currentTarget.style.height;
                      if (h && h !== promptHeight) {
                        setPromptHeight(h);
                      }
                    }}
                  />
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
          vocabulary={vocabulary}
          // Pass Persistence Handlers
          onAddTemplate={settingsData.addTemplate}
          onUpdateTemplate={settingsData.updateTemplate}
          onDeleteTemplate={settingsData.deleteTemplate}
          onAddVocab={settingsData.addVocabularyItem}
          onUpdateVocab={settingsData.updateVocabularyItem}
          onDeleteVocab={settingsData.deleteVocabularyItem}

          apiConfig={{ stt: systemConfig.stt, llm: systemConfig.llm }}
          generalSettings={generalSettings}
          setGeneralSettings={setGeneralSettings}
          onDataUpdated={fetchSessions}
        />
      )}
    </div>
  );
}
