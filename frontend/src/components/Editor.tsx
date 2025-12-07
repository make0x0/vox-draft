import React, { useState } from 'react';
import { Edit3, Eye, Save, ChevronLeft, ChevronRight, Clock, Trash2 } from 'lucide-react';
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
    onSaveRevision?: () => void;
    onDeleteRevision?: () => void;
}

export const Editor: React.FC<EditorProps> = ({
    content,
    setContent,
    width = 350,
    revisions = [],
    currentRevisionIndex = -1,
    onLoadRevision,
    onSaveRevision,
    onDeleteRevision
}) => {
    const [editorMode, setEditorMode] = useState<'write' | 'preview'>('write');

    const hasPrev = currentRevisionIndex < revisions.length - 1;
    const hasNext = currentRevisionIndex > 0;

    // Display info for current view
    // If index -1 (or no revisions), it's "Current / Unsaved"
    // If index >= 0, it's "Rev X"
    const currentRev = (currentRevisionIndex >= 0 && revisions.length > 0) ? revisions[currentRevisionIndex] : null;
    const isLatest = currentRevisionIndex === 0 || currentRevisionIndex === -1;

    return (
        <section
            className="flex flex-col bg-white flex-shrink-0"
            style={{ width: width }}
        >
            <div className="p-2 border-b border-gray-200 bg-gray-50 flex flex-col gap-2">

                {/* Top Row: Toolbar */}
                <div className="flex justify-between items-center">
                    <div className="flex gap-1 bg-gray-200 p-1 rounded">
                        <button onClick={() => setEditorMode('write')} className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${editorMode === 'write' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Edit3 size={12} /> 編集</button>
                        <button onClick={() => setEditorMode('preview')} className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${editorMode === 'preview' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Eye size={12} /> プレビュー</button>
                    </div>
                    <button onClick={onSaveRevision} className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50 flex items-center gap-1"><Save size={12} /> 保存(Rev作成)</button>
                </div>

                {/* Revision Bar */}
                {revisions.length > 0 && (
                    <div className="flex items-center justify-between bg-blue-50 px-2 py-1.5 rounded border border-blue-100">
                        <div className="flex items-center gap-1">
                            <button
                                disabled={!hasPrev}
                                onClick={() => onLoadRevision && onLoadRevision(currentRevisionIndex + 1)}
                                className={`p-1 rounded hover:bg-blue-100 ${!hasPrev ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600'}`}
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <div className="flex flex-col items-center px-2 min-w-[100px]">
                                <span className="text-xs font-bold text-blue-800">
                                    {isLatest && currentRevisionIndex === -1 ? `Latest (Unsaved)` : `Rev ${revisions.length - currentRevisionIndex}`}
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
                            <button onClick={onDeleteRevision} className="text-red-500 hover:bg-red-100 p-1 rounded" title="このリビジョンを削除">
                                <Trash2 size={14} />
                            </button>
                        )}
                        {isLatest && (
                            <span className="text-[10px] text-gray-400">Current</span>
                        )}
                    </div>
                )}
            </div>

            <div className="flex-1 relative overflow-hidden">
                {editorMode === 'write' ? (
                    <textarea className="w-full h-full p-6 resize-none focus:outline-none font-mono text-sm leading-relaxed text-gray-800 bg-white" value={content} onChange={(e) => setContent(e.target.value)} placeholder="# ここに生成結果が表示されます..." />
                ) : (
                    <div className="w-full h-full p-6 overflow-y-auto bg-white">
                        <article className="prose prose-sm max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-a:text-blue-600 hover:prose-a:text-blue-500">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                        </article>
                    </div>
                )}
            </div>
        </section>
    );
};
