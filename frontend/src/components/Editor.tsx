import React, { useState, useRef, useEffect } from 'react';
import * as Diff from 'diff';
import { Edit3, Eye, Save, ChevronLeft, ChevronRight, Clock, Trash2, ChevronDown, FilePlus, RefreshCw, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { EditorRevision } from '../types';

interface EditorProps {
    content: string;
    setContent: (content: string) => void;
    width?: number;
    // Revision Props
    revisions?: EditorRevision[];
    currentRevisionIndex?: number;
    onLoadRevision?: (index: number) => void;
    onSaveRevision?: () => void; // Used for "Create Revision" or "Restore"
    onDeleteRevision?: () => void;
    // Locking
    isBusy?: boolean;
}

export const Editor: React.FC<EditorProps> = ({
    content,
    setContent,
    width = 350,
    revisions = [],
    currentRevisionIndex = -1,
    onLoadRevision,
    onSaveRevision,
    onDeleteRevision,
    isBusy = false
}) => {
    const [editorMode, setEditorMode] = useState<'write' | 'preview' | 'diff'>('write');
    const [showSaveMenu, setShowSaveMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const hasPrev = currentRevisionIndex < revisions.length - 1;
    const hasNext = currentRevisionIndex > 0;

    // Display info for current view
    const currentRev = (currentRevisionIndex >= 0 && revisions.length > 0) ? revisions[currentRevisionIndex] : null;
    const isLatest = currentRevisionIndex === 0 || currentRevisionIndex === -1;

    // Read-only if viewing past revision OR busy
    const isReadOnly = !isLatest || isBusy;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowSaveMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Diff Logic
    const renderDiff = () => {
        const prevContent = (hasPrev && revisions.length > 0)
            ? revisions[currentRevisionIndex + 1].content
            : "";
        const changes = Diff.diffChars(prevContent, content);

        return (
            <div className="w-full h-full p-6 overflow-y-auto bg-white whitespace-pre-wrap font-mono text-sm">
                {changes.map((part, index) => {
                    const color = part.added ? 'bg-green-100 text-green-800' :
                        part.removed ? 'bg-red-100 text-red-800 decoration-red-500 line-through' :
                            'text-gray-800';
                    return (
                        <span key={index} className={color}>
                            {part.value}
                        </span>
                    );
                })}
            </div>
        );
    };

    return (
        <section
            className="flex flex-col bg-white flex-shrink-0 h-full overflow-hidden"
            style={{ width: width }}
        >
            <div className="p-2 border-b border-gray-200 bg-gray-50 flex flex-col gap-2">

                {/* Top Row: Toolbar */}
                <div className="flex justify-between items-center">
                    <div className="flex gap-1 bg-gray-200 p-1 rounded">
                        <button onClick={() => setEditorMode('write')} className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${editorMode === 'write' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Edit3 size={12} /> 編集</button>
                        <button onClick={() => setEditorMode('preview')} className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${editorMode === 'preview' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Eye size={12} /> プレビュー</button>
                        {revisions.length > 0 && <button onClick={() => setEditorMode('diff')} disabled={!hasPrev} className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${editorMode === 'diff' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 disabled:opacity-50'}`}>Diff</button>}
                    </div>

                    {/* Save Menu */}
                    <div className="relative flex items-center gap-2" ref={menuRef}>
                        <button
                            onClick={() => setShowSaveMenu(!showSaveMenu)}
                            className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50 flex items-center gap-1 transition-colors"
                        >
                            {isLatest ? <Save size={12} /> : <RefreshCw size={12} />}
                            <span>{isLatest ? "新Rev作成" : "最新へ復元(新Rev)"}</span>
                            <ChevronDown size={10} />
                        </button>

                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(content);
                                // Simple feedback?
                            }}
                            className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50 flex items-center gap-1 transition-colors"
                            title="全体をコピー"
                        >
                            <Copy size={12} />
                            <span>Copy</span>
                        </button>

                        {showSaveMenu && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1">
                                <button
                                    onClick={() => { onSaveRevision && onSaveRevision(); setShowSaveMenu(false); }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                >
                                    <FilePlus size={14} />
                                    <div>
                                        <div className="font-bold">新しいリビジョンを作成</div>
                                        <div className="text-[10px] text-gray-500">現在の内容を履歴に保存</div>
                                    </div>
                                </button>
                                {!isLatest && (
                                    <button
                                        onClick={() => { onSaveRevision && onSaveRevision(); setShowSaveMenu(false); }}
                                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 text-gray-700 border-t border-gray-100"
                                    >
                                        <RefreshCw size={14} />
                                        <div>
                                            <div className="font-bold">この版を最新として保存</div>
                                            <div className="text-[10px] text-gray-500">最新リビジョンとしてコピー</div>
                                        </div>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Revision Bar */}
                {revisions.length > 0 && (
                    <div className="flex items-center justify-between bg-blue-50 px-2 py-1.5 rounded border border-blue-100">
                        {/* Navigation */}
                        <div className="flex items-center gap-1">
                            <button
                                disabled={!hasPrev}
                                onClick={() => onLoadRevision && onLoadRevision(currentRevisionIndex + 1)}
                                className={`p-1 rounded hover:bg-blue-100 ${!hasPrev ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600'}`}
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <div className="flex flex-col items-center px-2 min-w-[100px]">
                                <span className={`text-xs font-bold ${isLatest ? 'text-blue-800' : 'text-gray-600'}`}>
                                    {isLatest ? `Rev ${revisions.length + 1} (Latest)` : `Rev ${revisions.length - currentRevisionIndex}`}
                                </span>
                                {currentRev && (
                                    <span className="text-[10px] text-blue-600 flex items-center gap-1">
                                        <Clock size={10} />
                                        {new Date(currentRev.created_at).toLocaleString()}
                                    </span>
                                )}
                            </div>

                            <button
                                disabled={!hasNext}
                                onClick={() => onLoadRevision && onLoadRevision(currentRevisionIndex - 1)}
                                className={`p-1 rounded hover:bg-blue-100 ${!hasNext ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600'}`}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        {!isLatest && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">閲覧専用 (ReadOnly)</span>
                                <button onClick={onDeleteRevision} className="text-red-500 hover:bg-red-100 p-1 rounded" title="このリビジョンを削除">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        )}
                        {isLatest && (
                            <span className="text-[10px] text-green-600 font-bold">Editing</span>
                        )}
                    </div>
                )}
            </div>

            <div className="flex-1 relative overflow-hidden">
                {isBusy && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <div className="bg-white px-4 py-2 rounded-lg shadow-lg border border-blue-100 flex items-center gap-3 animate-in fade-in zoom-in duration-200">
                            <RefreshCw size={20} className="animate-spin text-blue-600" />
                            <span className="text-sm font-bold text-gray-700">AIが生成中...</span>
                        </div>
                    </div>
                )}
                {editorMode === 'write' ? (
                    <textarea
                        readOnly={isReadOnly}
                        className={`w-full h-full p-6 resize-none focus:outline-none font-mono text-sm leading-relaxed text-gray-800 ${isReadOnly ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder={isReadOnly ? (isBusy ? "AIが生成中です..." : "過去のリビジョンは編集できません。") : "# ここに生成結果が表示されます..."}
                    />
                ) : editorMode === 'preview' ? (
                    <div className={`w-full h-full p-6 overflow-y-auto ${isReadOnly ? 'bg-gray-50' : 'bg-white'}`}>
                        <article className="prose prose-sm max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-a:text-blue-600 hover:prose-a:text-blue-500">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                        </article>
                    </div>
                ) : (
                    renderDiff()
                )}
            </div>
        </section>
    );
};
