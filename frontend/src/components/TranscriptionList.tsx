import React, { useRef, useState } from 'react';
import { Mic, Upload, Type, GripVertical, Maximize2, Play, RefreshCw, Trash2, Save, Copy, RotateCcw } from 'lucide-react';
import type { TranscriptionBlock } from '../types';

interface TranscriptionListProps {
    blocks: TranscriptionBlock[];
    setBlocks: React.Dispatch<React.SetStateAction<TranscriptionBlock[]>>;
    onAddTextBlock: () => void;
    onUploadFile: (file: File) => void;
    onDeleteBlock: (id: string) => void;
    onReTranscribe: (id: string) => void;
    onUpdateBlock: (id: string, text: string) => void;
    onCheckBlock: (id: string, isChecked: boolean) => void;
    onRestoreBlock: (id: string) => void;
    onEmptyTrash: () => void;
}

export const TranscriptionList: React.FC<TranscriptionListProps> = ({
    blocks,
    setBlocks,
    onAddTextBlock,
    onUploadFile,
    onDeleteBlock,
    onReTranscribe,
    onUpdateBlock,
    onCheckBlock,
    onRestoreBlock,
    onEmptyTrash
}) => {
    const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
    const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);
    const [showTrash, setShowTrash] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const toggleBlockCheck = (id: string, currentChecked: boolean) => {
        onCheckBlock(id, !currentChecked);
    };

    const updateLocalBlockText = (id: string, text: string) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, text } : b));
    };

    const persistBlockText = (id: string, text: string) => {
        onUpdateBlock(id, text);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onUploadFile(file);
            e.target.value = '';
        }
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

    const expandedBlock = blocks.find(b => b.id === expandedBlockId);

    // Filter blocks based on trash mode using optional isDeleted
    // If showTrash is true, show blocks where isDeleted === true
    // If showTrash is false, show blocks where isDeleted is falsy (false or undefined)
    const displayBlocks = blocks.filter(b => showTrash ? (b.isDeleted === true) : (!b.isDeleted));

    const trashCount = blocks.filter(b => b.isDeleted).length;

    return (
        <section className="flex-1 flex flex-col border-r border-gray-200 bg-white min-w-[300px] h-full overflow-hidden">
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="text-sm font-bold text-gray-600 flex items-center gap-2">
                    <Mic size={16} /> {showTrash ? "ゴミ箱" : "ブロックリスト"}
                </h2>
                <div className="flex gap-2 items-center">
                    {!showTrash ? (
                        <>
                            <input type="file" ref={fileInputRef} className="hidden" accept="audio/*,video/*,.m4a,.mp3,.wav" onChange={handleFileUpload} />
                            <button onClick={() => fileInputRef.current?.click()} className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-blue-50 text-blue-600 flex items-center gap-1 shadow-sm" title="音声ファイルをアップロード">
                                <Upload size={12} /> 音声
                            </button>
                            <button onClick={onAddTextBlock} className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-blue-50 text-blue-600 flex items-center gap-1 shadow-sm" title="テキストブロックを追加">
                                <Type size={12} /> テキスト
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => {
                                if (confirm("ゴミ箱を空にしますか？この操作は取り消せません。")) {
                                    onEmptyTrash();
                                }
                            }}
                            className="text-xs bg-red-50 border border-red-200 px-2 py-1 rounded hover:bg-red-100 text-red-600 flex items-center gap-1 shadow-sm font-bold"
                            disabled={trashCount === 0}
                        >
                            <Trash2 size={12} /> ゴミ箱を空にする
                        </button>
                    )}

                    <button
                        onClick={() => setShowTrash(!showTrash)}
                        className={`text-xs border px-2 py-1 rounded flex items-center gap-1 shadow-sm transition-colors ${showTrash ? 'bg-gray-200 border-gray-300 text-gray-700' : 'bg-white border-gray-300 text-gray-500 hover:text-gray-700'}`}
                        title={showTrash ? "リストに戻る" : "ゴミ箱を表示"}
                    >
                        {showTrash ? "戻る" : <><Trash2 size={12} /> ({trashCount})</>}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                {displayBlocks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-sm">
                        {showTrash ? "ゴミ箱は空です" : "ブロックがありません"}
                    </div>
                )}
                {displayBlocks.map((block, index) => {
                    // Detect status
                    const isProcessing = (!block.isDeleted) && block.text.startsWith('(') && block.text.endsWith(')');
                    const isError = block.text.startsWith('[Error]') || block.text.includes('Error:') || block.text.includes('Failed:');

                    const isReadOnly = isProcessing || showTrash;

                    return (
                        <div
                            key={block.id}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(index)}
                            className={`bg-white p-3 rounded-lg shadow-sm border transition-all flex gap-3 group relative 
                                ${block.isChecked ? 'border-blue-400 ring-1 ring-blue-100' : 'border-gray-200'}
                                ${draggedBlockIndex === index ? 'opacity-50' : 'opacity-100'}
                                ${isProcessing ? 'bg-blue-50/50' : ''}
                            `}
                        >
                            <div className="flex flex-col items-center justify-center cursor-grab text-gray-300 hover:text-gray-500 pt-1">
                                <GripVertical size={16} />
                            </div>
                            <div className="pt-1">
                                <input type="checkbox" checked={block.isChecked} onChange={() => toggleBlockCheck(block.id, block.isChecked)} className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col relative">
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                        {block.type === 'audio' ? <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 rounded font-mono">AUDIO</span> : <span className="bg-green-100 text-green-700 text-[10px] px-1.5 rounded font-mono">TEXT</span>}
                                        <span className="text-xs text-gray-400 font-mono">{block.timestamp} {block.duration && `(${block.duration})`}</span>
                                        {block.fileName && <span className="text-[10px] text-gray-400 truncate max-w-[150px] border border-gray-200 rounded px-2" title={block.fileName}>File: {block.fileName}</span>}
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => setExpandedBlockId(block.id)} className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50" title="拡大して編集"><Maximize2 size={14} /></button>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {showTrash ? (
                                                <button onClick={() => onRestoreBlock(block.id)} className="p-1 text-gray-400 hover:text-green-600 rounded hover:bg-green-50" title="元に戻す"><RotateCcw size={14} /></button>
                                            ) : (
                                                <>
                                                    {block.type === 'audio' && (
                                                        <>
                                                            <button className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50" title="再生"><Play size={14} /></button>
                                                            <button onClick={() => onReTranscribe(block.id)} className="p-1 text-gray-400 hover:text-green-600 rounded hover:bg-green-50" title="再認識"><RefreshCw size={14} /></button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(block.text);
                                                        }}
                                                        className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                                                        title="コピー"
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                    <button onClick={() => onDeleteBlock(block.id)} className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50" title="削除"><Trash2 size={14} /></button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Status Overlay / Banner */}
                                {isProcessing && (
                                    <div className="mb-2 bg-blue-100 border border-blue-200 text-blue-800 text-xs px-2 py-1.5 rounded-md flex items-center gap-2 animate-pulse">
                                        <RefreshCw size={12} className="animate-spin" />
                                        <span className="font-bold">処理中:</span> {block.text.replace(/^\(|\)$/g, '')}
                                    </div>
                                )}
                                {isError && (
                                    <div className="mb-2 bg-red-50 border border-red-200 text-red-800 text-xs px-2 py-1.5 rounded-md">
                                        <span className="font-bold">エラー:</span> {block.text}
                                    </div>
                                )}

                                <textarea
                                    className={`w-full text-sm text-gray-800 leading-relaxed outline-none focus:bg-yellow-50 rounded px-2 py-1 -mx-2 resize-y bg-transparent min-h-[4rem]
                                        ${isProcessing ? 'opacity-50 cursor-not-allowed select-none' : ''}
                                        ${isError ? 'text-red-600' : ''}
                                    `}
                                    rows={Math.min(Math.max(3, block.text.split('\n').length), 10)}
                                    value={block.text}
                                    onChange={(e) => updateLocalBlockText(block.id, e.target.value)}
                                    onBlur={(e) => persistBlockText(block.id, e.target.value)}
                                    disabled={isReadOnly}
                                    readOnly={isReadOnly}
                                />
                            </div>
                        </div>
                    );
                })}
                <div className="h-8"></div>
            </div>

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
                            <textarea
                                className="w-full h-full p-6 resize-none focus:outline-none text-base leading-relaxed text-gray-800 bg-white font-sans"
                                value={expandedBlock.text}
                                onChange={(e) => updateLocalBlockText(expandedBlock.id, e.target.value)}
                                onBlur={(e) => persistBlockText(expandedBlock.id, e.target.value)}
                                placeholder="テキストを入力..."
                                autoFocus
                            />
                        </div>
                        <div className="p-2 border-t bg-gray-50 text-xs text-gray-400 text-right">{expandedBlock.text.length} 文字</div>
                    </div>
                </div>
            )}
        </section>
    );
};
