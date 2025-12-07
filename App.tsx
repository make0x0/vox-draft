import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    Mic, Square, Play, Trash2, Settings,
    Save, X, Plus, Eye, Edit3,
    Send, GripVertical, RefreshCw, Type, Book, Maximize2,
    Search, Calendar, CheckSquare, AlertTriangle, Check, Upload,
    Database, Download, FileArchive, HardDrive
} from 'lucide-react';

// --- Types ---
interface TranscriptionBlock {
    id: string;
    type: 'audio' | 'text';
    text: string;
    timestamp: string;
    isChecked: boolean;
    duration?: string;
    fileName?: string;
}

interface HistoryItem {
    id: string;
    date: string;
    isoDate: string;
    summary: string;
}

interface PromptTemplate {
    id: string;
    title: string;
    content: string;
}

interface ApiConfig {
    url: string;
    authType: 'api-key' | 'bearer';
    keyMasked: string;
}

interface VocabularyItem {
    id: string;
    reading: string;
    word: string;
}

// --- Dummy Data ---
const generateHistory = (): HistoryItem[] => {
    const items: HistoryItem[] = [
        { id: '1', date: '2023/10/27 14:30', isoDate: '2023-10-27', summary: 'Q3決算報告の要約作成' },
        { id: '2', date: '2023/10/26 09:15', isoDate: '2023-10-26', summary: '週次定例ミーティング議事録' },
        { id: '3', date: '2023/10/25 18:00', isoDate: '2023-10-25', summary: 'アイデア出しブレインストーミング' },
    ];
    for (let i = 4; i <= 60; i++) {
        items.push({
            id: `${i}`,
            date: `2023/09/${String(30 - (i % 30)).padStart(2, '0')} 10:00`,
            isoDate: `2023-09-${String(30 - (i % 30)).padStart(2, '0')}`,
            summary: `過去の議事録データ #${i}`
        });
    }
    return items;
};

const initialHistory = generateHistory();

const initialBlocks: TranscriptionBlock[] = [
    { id: 'b1', type: 'audio', text: 'えー、本日は株式会社〇〇の第3四半期の決算についてご報告いたします。\n当期の売上高は非常に好調に推移しておりまして...', timestamp: '14:30:05', isChecked: true, duration: '00:45' },
    { id: 'b2', type: 'audio', text: '売上高は前年同期比で15%増の、えーと、30億円となりました。', timestamp: '14:30:25', isChecked: true, duration: '00:10' },
    { id: 'b_text1', type: 'text', text: '（ここにメールの文面を貼り付け...）', timestamp: '14:31:00', isChecked: true },
];

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
    stt: { url: 'https://api.openai.com/v1/audio/transcriptions', authType: 'bearer', keyMasked: 'sk-....... (Loaded from config.yaml)' },
    llm: { url: 'https://api.openai.com/v1/chat/completions', authType: 'bearer', keyMasked: 'sk-....... (Loaded from config.yaml)' }
};

export default function App() {
    // --- State ---
    const [history, setHistory] = useState<HistoryItem[]>(initialHistory);
    const [blocks, setBlocks] = useState<TranscriptionBlock[]>(initialBlocks);
    const [editorContent, setEditorContent] = useState<string>("# Q3決算報告要約...");

    // UI State
    const [isRecording, setIsRecording] = useState(false);
    const [isPromptRecording, setIsPromptRecording] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [editorMode, setEditorMode] = useState<'write' | 'preview'>('write');
    const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);

    // History Search & Selection
    const [searchQuery, setSearchQuery] = useState("");
    const [searchDateFrom, setSearchDateFrom] = useState("");
    const [searchDateTo, setSearchDateTo] = useState("");
    const [showSearchFilters, setShowSearchFilters] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
    const [tempTitle, setTempTitle] = useState("");

    // Settings State
    const [settingsTab, setSettingsTab] = useState<'general' | 'api' | 'prompts' | 'vocab' | 'data'>('general');
    const [templates, setTemplates] = useState<PromptTemplate[]>(initialTemplates);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(initialTemplates[0].id);
    const [vocabulary, setVocabulary] = useState<VocabularyItem[]>(initialVocabulary);
    const [generalSettings, setGeneralSettings] = useState({ language: 'ja', encoding: 'UTF-8', lineEnding: 'LF' });

    // Data Management State
    const [exportFrom, setExportFrom] = useState("");
    const [exportTo, setExportTo] = useState("");
    const [exportOptions, setExportOptions] = useState({ text: true, audio: true, config: true });
    const [archiveFrom, setArchiveFrom] = useState("");
    const [archiveTo, setArchiveTo] = useState("");

    // Prompt Input State
    const [promptText, setPromptText] = useState("");
    const [selectedFooterTemplateId, setSelectedFooterTemplateId] = useState("");
    const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const importInputRef = useRef<HTMLInputElement>(null);

    // --- Handlers ---
    const toggleBlockCheck = (id: string) => {
        setBlocks(blocks.map(b => b.id === id ? { ...b, isChecked: !b.isChecked } : b));
    };

    const deleteBlock = (id: string) => {
        setBlocks(blocks.filter(b => b.id !== id));
    };

    const addTextBlock = () => {
        const newBlock: TranscriptionBlock = {
            id: `text_${Date.now()}`,
            type: 'text',
            text: 'ここにテキストを入力...',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isChecked: true
        };
        setBlocks([...blocks, newBlock]);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const newBlock: TranscriptionBlock = {
            id: `upload_${Date.now()}`,
            type: 'audio',
            text: `(ファイルアップロード: ${file.name})\n音声認識処理を実行中...`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isChecked: true,
            duration: '??:??',
            fileName: file.name
        };
        setBlocks([...blocks, newBlock]);
        e.target.value = '';
        setTimeout(() => {
            setBlocks(prev => prev.map(b => b.id === newBlock.id ? {
                ...b,
                text: `(ファイルアップロード: ${file.name})\n認識が完了しました。`,
                duration: '05:30'
            } : b));
        }, 2000);
    };

    const triggerFileUpload = () => fileInputRef.current?.click();

    const reTranscribeBlock = (id: string) => {
        alert(`ブロックID: ${id} の音声を再認識させます...`);
        setBlocks(blocks.map(b => b.id === id ? { ...b, text: b.text + " (再認識済)" } : b));
    };

    const updateBlockText = (id: string, text: string) => {
        setBlocks(blocks.map(b => b.id === id ? { ...b, text } : b));
    };

    const handleDragStart = (index: number) => setDraggedBlockIndex(index);
    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    const handleDrop = (index: number) => {
        if (draggedBlockIndex === null || draggedBlockIndex === index) {
            setDraggedBlockIndex(null);
            return;
        }
        const newBlocks = [...blocks];
        const draggedBlock = newBlocks[draggedBlockIndex];
        newBlocks.splice(draggedBlockIndex, 1);
        newBlocks.splice(index, 0, draggedBlock);
        setBlocks(newBlocks);
        setDraggedBlockIndex(null);
    };

    const handleBulkDelete = () => { if (selectedHistoryIds.size > 0) setShowDeleteConfirm(true); };
    const confirmBulkDelete = () => {
        setHistory(history.filter(h => !selectedHistoryIds.has(h.id)));
        setSelectedHistoryIds(new Set());
        setShowDeleteConfirm(false);
        setIsSelectionMode(false);
    };

    const startEditingTitle = (item: HistoryItem) => {
        setEditingTitleId(item.id);
        setTempTitle(item.summary);
    };

    const saveTitle = () => {
        if (editingTitleId) {
            setHistory(history.map(h => h.id === editingTitleId ? { ...h, summary: tempTitle } : h));
            setEditingTitleId(null);
        }
    };

    const handleTemplateChange = (field: 'title' | 'content', value: string) => {
        if (!selectedTemplateId) return;
        setTemplates(templates.map(t => t.id === selectedTemplateId ? { ...t, [field]: value } : t));
    };
    const addNewTemplate = () => {
        const newId = `new_${Date.now()}`;
        setTemplates([...templates, { id: newId, title: '新規テンプレート', content: '' }]);
        setSelectedTemplateId(newId);
    };
    const deleteTemplate = (id: string) => {
        setTemplates(templates.filter(t => t.id !== id));
        if (selectedTemplateId === id) setSelectedTemplateId(null);
    };
    const handleFooterTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedFooterTemplateId(e.target.value);
        const tmpl = templates.find(t => t.id === e.target.value);
        if (tmpl) setPromptText(tmpl.content);
    };
    const handlePromptRecordToggle = () => {
        setIsPromptRecording(!isPromptRecording);
        if (!isPromptRecording) {
            setTimeout(() => {
                setPromptText(prev => prev + (prev ? "\n" : "") + "あと、誤字脱字も直しておいてください。");
                setIsPromptRecording(false);
            }, 1500);
        }
    };

    const addVocab = () => setVocabulary([...vocabulary, { id: `v_${Date.now()}`, reading: '', word: '' }]);
    const updateVocab = (id: string, field: 'reading' | 'word', value: string) => {
        setVocabulary(vocabulary.map(v => v.id === id ? { ...v, [field]: value } : v));
    };
    const deleteVocab = (id: string) => setVocabulary(vocabulary.filter(v => v.id !== id));

    const handleExport = () => {
        alert(`エクスポートを開始します...\n期間: ${exportFrom || '指定なし'} ~ ${exportTo || '指定なし'}\n対象: ${[
            exportOptions.text ? 'テキスト/DB' : '',
            exportOptions.audio ? '音声ファイル' : '',
            exportOptions.config ? '設定' : ''
        ].filter(Boolean).join(', ')}`);
    };

    const handleArchiveDelete = () => {
        if (!archiveFrom && !archiveTo) {
            alert("削除する期間を指定してください。");
            return;
        }
        if (confirm(`警告: ${archiveFrom} ~ ${archiveTo} のデータを完全に削除します。\nエクスポート済みであることを確認してください。\n実行しますか？`)) {
            alert("削除を実行しました。");
        }
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            alert(`ファイル "${file.name}" を読み込み、インポート/マージ処理を開始します...`);
            e.target.value = '';
        }
    };

    // Helper
    const toggleHistorySelection = (id: string) => {
        const newSet = new Set(selectedHistoryIds);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedHistoryIds(newSet);
    };

    const filteredHistory = useMemo(() => {
        let result = history;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(h => h.summary.toLowerCase().includes(q) || h.date.includes(q));
        }
        if (searchDateFrom) result = result.filter(h => h.isoDate >= searchDateFrom);
        if (searchDateTo) result = result.filter(h => h.isoDate <= searchDateTo);
        return result;
    }, [history, searchQuery, searchDateFrom, searchDateTo]);

    const displayedHistory = useMemo(() => {
        if (!searchQuery && !searchDateFrom && !searchDateTo) return filteredHistory.slice(0, 50);
        return filteredHistory;
    }, [filteredHistory, searchQuery, searchDateFrom, searchDateTo]);

    const expandedBlock = blocks.find(b => b.id === expandedBlockId);

    return (
        <div className="flex h-screen w-full bg-gray-100 text-gray-800 font-sans overflow-hidden">

            {/* --- Left Pane: History --- */}
            <aside className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 z-20 shadow-sm">
                <div className="p-3 border-b border-gray-200 bg-gray-50 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <h2 className="text-sm font-bold text-gray-600 flex items-center gap-2"><Book size={16} /> 履歴</h2>
                        <div className="flex gap-1">
                            <button onClick={() => setIsSelectionMode(!isSelectionMode)} className={`p-1.5 rounded text-xs flex items-center gap-1 ${isSelectionMode ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-200'}`}>
                                <CheckSquare size={16} /> {isSelectionMode && <span className="font-bold">完了</span>}
                            </button>
                        </div>
                    </div>
                    <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input type="text" className="w-full text-sm border border-gray-300 rounded-md pl-8 pr-8 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none" placeholder="タイトル・日付で検索" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        <button onClick={() => setShowSearchFilters(!showSearchFilters)} className={`absolute right-1.5 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100 ${showSearchFilters || searchDateFrom || searchDateTo ? 'text-blue-500' : 'text-gray-400'}`}><Calendar size={14} /></button>
                    </div>
                    {(showSearchFilters || searchDateFrom || searchDateTo) && (
                        <div className="bg-white border border-gray-200 rounded p-2 text-xs flex flex-col gap-2">
                            <div className="flex items-center justify-between"><span className="font-bold text-gray-500">期間指定</span>{(searchDateFrom || searchDateTo) && (<button onClick={() => { setSearchDateFrom(""); setSearchDateTo(""); }} className="text-blue-500 hover:text-blue-700 text-[10px]">クリア</button>)}</div>
                            <div className="flex items-center gap-1"><input type="date" value={searchDateFrom} onChange={(e) => setSearchDateFrom(e.target.value)} className="border rounded px-1 py-1 w-full" /><span className="text-gray-400">~</span><input type="date" value={searchDateTo} onChange={(e) => setSearchDateTo(e.target.value)} className="border rounded px-1 py-1 w-full" /></div>
                        </div>
                    )}
                    {isSelectionMode && selectedHistoryIds.size > 0 && (
                        <div className="bg-red-50 border border-red-100 rounded p-2 flex justify-between items-center"><span className="text-xs text-red-700 font-bold">{selectedHistoryIds.size}件 選択中</span><button onClick={handleBulkDelete} className="text-xs bg-white border border-red-200 text-red-600 px-2 py-1 rounded hover:bg-red-100 flex items-center gap-1"><Trash2 size={12} /> 一括削除</button></div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto">
                    {displayedHistory.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">履歴が見つかりません</div> : displayedHistory.map(item => (
                        <div key={item.id} className={`p-3 border-b border-gray-100 transition-colors group relative ${isSelectionMode ? 'hover:bg-gray-50' : 'hover:bg-blue-50 cursor-pointer'}`}>
                            <div className="flex gap-2">
                                {isSelectionMode && <div className="pt-1"><input type="checkbox" checked={selectedHistoryIds.has(item.id)} onChange={() => toggleHistorySelection(item.id)} className="w-4 h-4 text-blue-600 rounded cursor-pointer" /></div>}
                                <div className="flex-1 min-w-0" onClick={() => !isSelectionMode && !editingTitleId && console.log("Load session", item.id)}>
                                    <div className="text-xs text-gray-500 mb-0.5 flex justify-between">{item.date}</div>
                                    {editingTitleId === item.id ? (
                                        <div className="flex gap-1 items-center mt-1">
                                            <input
                                                type="text"
                                                value={tempTitle}
                                                onChange={(e) => setTempTitle(e.target.value)}
                                                className="w-full text-sm border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                autoFocus
                                                onBlur={saveTitle}
                                                onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                                            />
                                            <button onClick={saveTitle} className="text-green-600 p-1"><Check size={14} /></button>
                                        </div>
                                    ) : (
                                        <div className="text-sm font-medium text-gray-800 line-clamp-2" title={item.summary}>
                                            {item.summary}
                                        </div>
                                    )}
                                </div>
                                {!isSelectionMode && editingTitleId !== item.id && (
                                    <div className="flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-opacity pl-1">
                                        <button onClick={(e) => { e.stopPropagation(); startEditingTitle(item); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white rounded shadow-sm border border-transparent hover:border-gray-200"><Edit3 size={14} /></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-gray-200">
                    <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 w-full p-2 rounded hover:bg-gray-100 transition-colors"><Settings size={16} /><span>設定</span></button>
                </div>
            </aside>

            {/* --- Main Area --- */}
            <main className="flex-1 flex flex-col min-w-0">
                <div className="flex-1 flex min-h-0">

                    {/* --- Center Pane: Transcription List --- */}
                    <section className="flex-1 flex flex-col border-r border-gray-200 bg-white min-w-[300px]">
                        <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h2 className="text-sm font-bold text-gray-600 flex items-center gap-2">
                                <Mic size={16} />
                                認識結果リスト
                            </h2>
                            <div className="flex gap-2 items-center">
                                <input type="file" ref={fileInputRef} className="hidden" accept="audio/*,video/*,.m4a,.mp3,.wav" onChange={handleFileUpload} />
                                <button onClick={triggerFileUpload} className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-blue-50 text-blue-600 flex items-center gap-1 shadow-sm" title="音声ファイルをアップロード">
                                    <Upload size={12} /> ファイル
                                </button>
                                <button onClick={addTextBlock} className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-blue-50 text-blue-600 flex items-center gap-1 shadow-sm" title="テキストブロックを追加">
                                    <Type size={12} /> テキスト追加
                                </button>
                                <span className="text-xs text-gray-400">Auto-saved</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                            {blocks.map((block, index) => (
                                <div
                                    key={block.id}
                                    draggable
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={handleDragOver}
                                    onDrop={() => handleDrop(index)}
                                    className={`bg-white p-3 rounded-lg shadow-sm border transition-all flex gap-3 group relative 
                    ${block.isChecked ? 'border-blue-400 ring-1 ring-blue-100' : 'border-gray-200'}
                    ${draggedBlockIndex === index ? 'opacity-50' : 'opacity-100'}
                  `}
                                >
                                    <div className="flex flex-col items-center justify-center cursor-grab text-gray-300 hover:text-gray-500 pt-1">
                                        <GripVertical size={16} />
                                    </div>
                                    <div className="pt-1">
                                        <input type="checkbox" checked={block.isChecked} onChange={() => toggleBlockCheck(block.id)} className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                {block.type === 'audio' ? <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 rounded font-mono">AUDIO</span> : <span className="bg-green-100 text-green-700 text-[10px] px-1.5 rounded font-mono">TEXT</span>}
                                                <span className="text-xs text-gray-400 font-mono">{block.timestamp} {block.duration && `(${block.duration})`}</span>
                                                {block.fileName && <span className="text-[10px] text-gray-400 truncate max-w-[150px] border border-gray-200 rounded px-2" title={block.fileName}>File: {block.fileName}</span>}
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => setExpandedBlockId(block.id)} className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50" title="拡大して編集"><Maximize2 size={14} /></button>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {block.type === 'audio' && (
                                                        <>
                                                            <button className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50" title="再生"><Play size={14} /></button>
                                                            <button onClick={() => reTranscribeBlock(block.id)} className="p-1 text-gray-400 hover:text-green-600 rounded hover:bg-green-50" title="再認識"><RefreshCw size={14} /></button>
                                                        </>
                                                    )}
                                                    <button onClick={() => deleteBlock(block.id)} className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50" title="削除"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        </div>
                                        <textarea
                                            className="w-full text-sm text-gray-800 leading-relaxed outline-none focus:bg-yellow-50 rounded px-2 py-1 -mx-2 resize-y bg-transparent min-h-[3rem] max-h-[50vh]"
                                            rows={Math.min(Math.max(2, block.text.split('\n').length), 20)}
                                            value={block.text}
                                            onChange={(e) => updateBlockText(block.id, e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                            <div className="h-8"></div>
                        </div>
                    </section>

                    {/* --- Right Pane: Editor --- */}
                    <section className="flex-1 flex flex-col bg-white min-w-[300px]">
                        <div className="p-2 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <div className="flex gap-1 bg-gray-200 p-1 rounded">
                                <button onClick={() => setEditorMode('write')} className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${editorMode === 'write' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Edit3 size={12} /> 編集</button>
                                <button onClick={() => setEditorMode('preview')} className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${editorMode === 'preview' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Eye size={12} /> プレビュー</button>
                            </div>
                            <button className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50 flex items-center gap-1"><Save size={12} /> ファイル同期</button>
                        </div>
                        <div className="flex-1 relative overflow-hidden">
                            {editorMode === 'write' ? (
                                <textarea className="w-full h-full p-6 resize-none focus:outline-none font-mono text-sm leading-relaxed text-gray-800 bg-white" value={editorContent} onChange={(e) => setEditorContent(e.target.value)} placeholder="# ここに生成結果が表示されます..." />
                            ) : (
                                <div className="w-full h-full p-6 overflow-y-auto prose prose-sm max-w-none bg-white">
                                    <h1 className="text-xl font-bold mb-4 border-b pb-2">プレビューモード</h1>
                                    <div className="whitespace-pre-wrap text-gray-700">{editorContent}</div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* --- Footer Control --- */}
                <footer className="h-auto border-t border-gray-200 bg-white p-4 shadow-lg z-10 flex flex-col gap-3">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsRecording(!isRecording)} className={`flex flex-col items-center justify-center w-16 h-16 rounded-full transition-all shadow-md ${isRecording ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-100' : 'bg-gray-800 text-white hover:bg-gray-700'}`}>
                            {isRecording ? <Square fill="currentColor" size={24} /> : <Mic size={24} />}
                            <span className="text-[10px] mt-1 font-medium">{isRecording ? "00:12" : "録音"}</span>
                        </button>
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
                                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-colors h-auto"><Send size={18} /> 実行</button>
                            </div>
                        </div>
                    </div>
                </footer>
            </main>

            {/* --- Expanded Block Edit Modal --- */}
            {expandedBlockId && expandedBlock && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                            <div className="flex items-center gap-2">
                                {expandedBlock.type === 'audio' ? <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-mono font-bold">AUDIO</span> : <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded font-mono font-bold">TEXT</span>}
                                <span className="text-sm text-gray-500 font-mono">{expandedBlock.timestamp} {expandedBlock.duration && `(${expandedBlock.duration})`}</span>
                                {expandedBlock.fileName && <span className="text-[10px] text-gray-400 truncate max-w-[150px] border border-gray-200 rounded px-2" title={expandedBlock.fileName}>File: {expandedBlock.fileName}</span>}
                            </div>
                            <div className="flex gap-2"><button onClick={() => setExpandedBlockId(null)} className="px-4 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm flex items-center gap-2"><Save size={14} /> 完了して閉じる</button></div>
                        </div>
                        <div className="flex-1 p-0 relative">
                            <textarea className="w-full h-full p-6 resize-none focus:outline-none text-base leading-relaxed text-gray-800 bg-white font-sans" value={expandedBlock.text} onChange={(e) => updateBlockText(expandedBlock.id, e.target.value)} placeholder="テキストを入力..." autoFocus />
                        </div>
                        <div className="p-2 border-t bg-gray-50 text-xs text-gray-400 text-right">{expandedBlock.text.length} 文字</div>
                    </div>
                </div>
            )}

            {/* --- Delete Confirmation Modal --- */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 animate-in zoom-in duration-200">
                        <div className="flex items-center gap-3 text-red-600 mb-4">
                            <div className="bg-red-100 p-2 rounded-full"><AlertTriangle size={24} /></div>
                            <h3 className="text-lg font-bold">削除の確認</h3>
                        </div>
                        <p className="text-gray-600 text-sm mb-6">選択した {selectedHistoryIds.size} 件の履歴を削除してもよろしいですか？<br />この操作は取り消せません。</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">キャンセル</button>
                            <button onClick={confirmBulkDelete} className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded font-medium">削除する</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Settings Modal --- */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Settings size={20} /> 設定</h3>
                            <div className="flex gap-2"><button onClick={() => alert("設定を保存しました")} className="px-4 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm flex items-center gap-2"><Save size={14} /> 保存</button><button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-200"><X size={20} /></button></div>
                        </div>
                        <div className="flex flex-1 overflow-hidden">
                            <div className="w-48 bg-gray-100 border-r border-gray-200 flex flex-col p-2 gap-1">
                                <button onClick={() => setSettingsTab('general')} className={`px-3 py-2 text-sm text-left rounded ${settingsTab === 'general' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-200'}`}>一般設定</button>
                                <button onClick={() => setSettingsTab('api')} className={`px-3 py-2 text-sm text-left rounded ${settingsTab === 'api' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-200'}`}>API設定</button>
                                <button onClick={() => setSettingsTab('prompts')} className={`px-3 py-2 text-sm text-left rounded ${settingsTab === 'prompts' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-200'}`}>プロンプト管理</button>
                                <button onClick={() => setSettingsTab('vocab')} className={`px-3 py-2 text-sm text-left rounded ${settingsTab === 'vocab' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-200'}`}>単語登録</button>
                                <div className="border-t my-1 border-gray-300"></div>
                                <button onClick={() => setSettingsTab('data')} className={`px-3 py-2 text-sm text-left rounded flex items-center gap-2 ${settingsTab === 'data' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-200'}`}>
                                    <Database size={14} /> データ管理
                                </button>
                            </div>
                            <div className="flex-1 p-6 bg-white overflow-y-auto">

                                {/* --- General Tab --- */}
                                {settingsTab === 'general' && (
                                    <div className="space-y-6 max-w-lg">
                                        <h4 className="text-md font-bold text-gray-900 border-b pb-2 mb-4">一般設定</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">表示言語</label>
                                                <select value={generalSettings.language} onChange={(e) => setGeneralSettings({ ...generalSettings, language: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                                                    <option value="ja">日本語</option><option value="en">English</option>
                                                </select>
                                            </div><div />
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">保存エンコード</label>
                                                <select value={generalSettings.encoding} onChange={(e) => setGeneralSettings({ ...generalSettings, encoding: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                                                    <option value="UTF-8">UTF-8 (推奨)</option><option value="Shift_JIS">Shift_JIS</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">改行コード</label>
                                                <select value={generalSettings.lineEnding} onChange={(e) => setGeneralSettings({ ...generalSettings, lineEnding: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                                                    <option value="LF">LF (\n)</option><option value="CRLF">CRLF (\r\n)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* --- API Tab --- */}
                                {settingsTab === 'api' && (
                                    <div className="space-y-6">
                                        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm text-yellow-800 mb-4"><span className="font-bold">Info:</span> API設定は `config.yaml` から読み込まれています。</div>
                                        <h4 className="text-md font-bold text-gray-900 border-b pb-2 mb-4">音声認識 API (STT)</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-500 mb-1">Endpoint URL</label><input type="text" value={mockApiConfig.stt.url} readOnly className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-sm text-gray-600 font-mono" /></div>
                                        </div>
                                        <h4 className="text-md font-bold text-gray-900 border-b pb-2 mb-4 mt-8">文章生成 API (LLM)</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-500 mb-1">Endpoint URL</label><input type="text" value={mockApiConfig.llm.url} readOnly className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-sm text-gray-600 font-mono" /></div>
                                        </div>
                                    </div>
                                )}

                                {/* --- Prompts Tab --- */}
                                {settingsTab === 'prompts' && (
                                    <div className="flex h-full gap-4">
                                        <div className="w-1/3 border border-gray-200 rounded flex flex-col">
                                            <div className="p-2 border-b bg-gray-50 flex justify-between items-center"><span className="text-xs font-bold text-gray-500">テンプレート一覧</span><button onClick={addNewTemplate} className="text-blue-600 hover:bg-blue-100 p-1 rounded"><Plus size={16} /></button></div>
                                            <div className="flex-1 overflow-y-auto">
                                                {templates.map(t => (<div key={t.id} onClick={() => setSelectedTemplateId(t.id)} className={`p-3 border-b text-sm cursor-pointer hover:bg-gray-50 ${selectedTemplateId === t.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}><div className="font-medium truncate">{t.title}</div></div>))}
                                            </div>
                                        </div>
                                        <div className="flex-1 flex flex-col gap-4">
                                            {selectedTemplateId ? (
                                                <>
                                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">テンプレート名</label><input type="text" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" value={templates.find(t => t.id === selectedTemplateId)?.title || ''} onChange={(e) => handleTemplateChange('title', e.target.value)} /></div>
                                                    <div className="flex-1 flex flex-col"><label className="block text-sm font-medium text-gray-700 mb-1">プロンプト内容</label><textarea className="flex-1 w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 font-mono" value={templates.find(t => t.id === selectedTemplateId)?.content || ''} onChange={(e) => handleTemplateChange('content', e.target.value)} /></div>
                                                    <div className="flex justify-end pt-2"><button onClick={() => deleteTemplate(selectedTemplateId)} className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"><Trash2 size={14} /> 削除</button></div>
                                                </>
                                            ) : <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">左側から選択してください</div>}
                                        </div>
                                    </div>
                                )}

                                {/* --- Vocab Tab --- */}
                                {settingsTab === 'vocab' && (
                                    <div className="space-y-4 max-w-3xl">
                                        <div className="flex justify-between items-center border-b pb-2 mb-4">
                                            <div><h4 className="text-md font-bold text-gray-900">単語登録 (辞書)</h4><p className="text-xs text-gray-500 mt-1">音声認識時に優先して認識させたい社内用語を登録。</p></div>
                                            <button onClick={addVocab} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 flex items-center gap-1"><Plus size={14} /> 単語を追加</button>
                                        </div>
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-100 text-gray-600 font-medium"><tr><th className="p-3 w-1/3">読み</th><th className="p-3 w-1/3">単語</th><th className="p-3 w-16 text-center">削除</th></tr></thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {vocabulary.map(v => (
                                                        <tr key={v.id} className="bg-white">
                                                            <td className="p-2"><input type="text" className="w-full border border-gray-300 rounded px-2 py-1.5 outline-none" value={v.reading} onChange={(e) => updateVocab(v.id, 'reading', e.target.value)} /></td>
                                                            <td className="p-2"><input type="text" className="w-full border border-gray-300 rounded px-2 py-1.5 outline-none" value={v.word} onChange={(e) => updateVocab(v.id, 'word', e.target.value)} /></td>
                                                            <td className="p-2 text-center"><button onClick={() => deleteVocab(v.id)} className="text-gray-400 hover:text-red-500 p-1 rounded"><Trash2 size={16} /></button></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* --- Data Management Tab --- */}
                                {settingsTab === 'data' && (
                                    <div className="space-y-8 max-w-2xl">

                                        {/* Export Section */}
                                        <section className="border border-gray-200 rounded-lg p-5 shadow-sm bg-gray-50">
                                            <h4 className="text-md font-bold text-gray-800 flex items-center gap-2 mb-4">
                                                <Download size={18} className="text-blue-600" /> エクスポート (バックアップ)
                                            </h4>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 mb-1">期間 (開始)</label>
                                                        <input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 mb-1">期間 (終了)</label>
                                                        <input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 mb-2">出力対象</label>
                                                    <div className="flex flex-wrap gap-4">
                                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                            <input type="checkbox" checked={exportOptions.text} onChange={(e) => setExportOptions({ ...exportOptions, text: e.target.checked })} className="rounded text-blue-600" />
                                                            <span>テキスト・DB (軽量)</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                            <input type="checkbox" checked={exportOptions.audio} onChange={(e) => setExportOptions({ ...exportOptions, audio: e.target.checked })} className="rounded text-blue-600" />
                                                            <span>音声ファイル (大容量)</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                            <input type="checkbox" checked={exportOptions.config} onChange={(e) => setExportOptions({ ...exportOptions, config: e.target.checked })} className="rounded text-blue-600" />
                                                            <span>設定情報 (ユーザー設定)</span>
                                                        </label>
                                                    </div>
                                                </div>

                                                <div className="pt-2">
                                                    <button onClick={handleExport} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium flex items-center justify-center gap-2 shadow-sm">
                                                        <FileArchive size={16} /> エクスポート実行 (tar.gz)
                                                    </button>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Import Section */}
                                        <section className="border border-gray-200 rounded-lg p-5 shadow-sm bg-white">
                                            <h4 className="text-md font-bold text-gray-800 flex items-center gap-2 mb-4">
                                                <Upload size={18} className="text-green-600" /> インポート (リストア・結合)
                                            </h4>
                                            <div className="text-sm text-gray-600 mb-4">
                                                エクスポートしたファイル (.tar.gz) を読み込みます。<br />
                                                音声ファイルが含まれる場合、既存のセッション情報(ID一致)があればファイルを追加します。
                                            </div>
                                            <input
                                                type="file"
                                                ref={importInputRef}
                                                className="hidden"
                                                accept=".tar.gz,.tar,.zip"
                                                onChange={handleImport}
                                            />
                                            <button
                                                onClick={() => importInputRef.current?.click()}
                                                className="w-full border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 py-2 rounded font-medium flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                <Upload size={16} /> バックアップファイルを選択
                                            </button>
                                        </section>

                                        {/* Delete/Archive Section */}
                                        <section className="border border-red-100 rounded-lg p-5 shadow-sm bg-red-50">
                                            <h4 className="text-md font-bold text-red-800 flex items-center gap-2 mb-4">
                                                <HardDrive size={18} /> 期間指定削除 (アーカイブ)
                                            </h4>
                                            <p className="text-xs text-red-600 mb-4">
                                                指定した期間のデータをシステムから完全に削除します。<br />
                                                <span className="font-bold">事前にエクスポート(バックアップ)を行った上で実行してください。</span>
                                            </p>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 mb-1">期間 (開始)</label>
                                                        <input type="date" value={archiveFrom} onChange={(e) => setArchiveFrom(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 mb-1">期間 (終了)</label>
                                                        <input type="date" value={archiveTo} onChange={(e) => setArchiveTo(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white" />
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={handleArchiveDelete}
                                                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded font-medium flex items-center justify-center gap-2 shadow-sm"
                                                >
                                                    <Trash2 size={16} /> 削除を実行
                                                </button>
                                            </div>
                                        </section>

                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}