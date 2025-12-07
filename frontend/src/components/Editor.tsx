import React, { useState } from 'react';
import { Edit3, Eye, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface EditorProps {
    content: string;
    setContent: (content: string) => void;
}

export const Editor: React.FC<EditorProps> = ({ content, setContent }) => {
    const [editorMode, setEditorMode] = useState<'write' | 'preview'>('write');

    return (
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
