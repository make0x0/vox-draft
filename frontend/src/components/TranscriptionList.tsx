import React, { useRef, useState } from 'react';
import { Mic, Upload, Type, GripVertical, Maximize2, Play, RefreshCw, Trash2, Save, Copy, RotateCcw, CheckSquare, Square, Palette } from 'lucide-react';
import type { TranscriptionBlock } from '../types';

interface TranscriptionListProps {
    blocks: TranscriptionBlock[];
    insertPosition?: 'top' | 'bottom';
    setBlocks: React.Dispatch<React.SetStateAction<TranscriptionBlock[]>>;
    onAddTextBlock: () => void;
    onUploadFile: (file: File) => void;
    onDeleteBlock: (id: string) => void;
    onReTranscribe: (id: string) => void;
    onUpdateBlock: (id: string, text: string) => void;
    onCheckBlock: (id: string, isChecked: boolean) => void;
    onRestoreBlock: (id: string) => void;
    onEmptyTrash: () => void;
    onToggleAllBlocks: (check: boolean) => void;
    onColorChange: (id: string, color: string | null) => void;
    onReorderBlocks?: (blockIds: string[]) => void;
}

// Pastel colors for blocks (8 options)
const BLOCK_COLORS = [
    { name: 'なし', value: null, bg: 'bg-white', border: 'border-gray-200' },
    { name: '黄色', value: 'yellow', bg: 'bg-yellow-50', border: 'border-yellow-200' },
    { name: '青', value: 'blue', bg: 'bg-blue-50', border: 'border-blue-200' },
    { name: '緑', value: 'green', bg: 'bg-green-50', border: 'border-green-200' },
    { name: 'ピンク', value: 'pink', bg: 'bg-pink-50', border: 'border-pink-200' },
    { name: '紫', value: 'purple', bg: 'bg-purple-50', border: 'border-purple-200' },
    { name: 'オレンジ', value: 'orange', bg: 'bg-orange-50', border: 'border-orange-200' },
    { name: '水色', value: 'cyan', bg: 'bg-cyan-50', border: 'border-cyan-200' },
    { name: 'グレー', value: 'gray', bg: 'bg-gray-100', border: 'border-gray-300' },
];

export const TranscriptionList: React.FC<TranscriptionListProps> = ({
    blocks,
    insertPosition = 'bottom',
    setBlocks,
    onAddTextBlock,
    onUploadFile,
    onDeleteBlock,
    onReTranscribe,
    onUpdateBlock,
    onCheckBlock,
    onRestoreBlock,
    onEmptyTrash,
    onToggleAllBlocks,
    onColorChange,
    onReorderBlocks
}) => {
    const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
    const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [draggedBlockHeight, setDraggedBlockHeight] = useState<number | null>(null);
    const [showTrash, setShowTrash] = useState(false);
    const [colorPickerBlockId, setColorPickerBlockId] = useState<string | null>(null);
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

    const resetDragState = () => {
        setDraggedBlockIndex(null);
        setDragOverIndex(null);
        setDraggedBlockHeight(null);
    };

    // Reset drag state on mouse up (backup for when dragend doesn't fire)
    const handleMouseUp = () => {
        if (draggedBlockIndex !== null) {
            resetDragState();
        }
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        // Prevent default ghost image issues
        e.dataTransfer.setData('text/plain', '');
        setDraggedBlockIndex(index);
        setDraggedBlockHeight(e.currentTarget.offsetHeight);
        // Required for Firefox
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDragEnter = (index: number) => {
        if (draggedBlockIndex !== null && draggedBlockIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDrop = (dropIndex: number) => {
        if (draggedBlockIndex === null) {
            resetDragState();
            return;
        }

        // 1. Get dragged block ID safely
        const draggedBlock = displayBlocks[draggedBlockIndex];
        if (!draggedBlock) {
            resetDragState();
            return;
        }

        // 2. Remove dragged block from the FULL list (based on ID)
        // We operate on 'blocks' (the full state), not just displayBlocks
        const newBlocks = blocks.filter(b => b.id !== draggedBlock.id);

        // 3. Determine insertion index in the new list
        let insertIndex = -1;

        if (dropIndex >= displayBlocks.length) {
            // Appending to the end of visible list
            // Find the last visible block (excluding the dragged one if it was last)
            const remainingVisible = displayBlocks.filter(b => b.id !== draggedBlock.id);

            if (remainingVisible.length === 0) {
                // List was empty or only contained the dragged item
                newBlocks.push(draggedBlock);
            } else {
                const lastVisibleBlock = remainingVisible[remainingVisible.length - 1];
                const lastIndex = newBlocks.findIndex(b => b.id === lastVisibleBlock.id);
                // Insert after the last visible block
                newBlocks.splice(lastIndex + 1, 0, draggedBlock);
            }
        } else {
            // Importing before a specific target block
            // Note: dropIndex is based on the list BEFORE modification?
            // Actually, dropIndex is just the index in displayBlocks where we want to drop.

            // If we are dropping on the drop zone BEFORE displayBlocks[dropIndex]

            // If dropIndex was greater than draggedBlockIndex, we need to adjust?
            // No, because we use ID of the target block.

            // Caution: If we drag item 0 to position 1 (dropIndex 1), 
            // the target block at old index 1 becomes index 0 after removal.
            // But we use ID lookups so it should be fine.

            let targetBlock = displayBlocks[dropIndex];

            // Special case: if dropping exactly where we started (target is same as dragged)
            // The UI logic usually prevents dropIndex === draggedBlockIndex but check ID to be sure
            if (targetBlock.id === draggedBlock.id) {
                resetDragState();
                return;
            }

            const targetRealIndex = newBlocks.findIndex(b => b.id === targetBlock.id);
            if (targetRealIndex !== -1) {
                newBlocks.splice(targetRealIndex, 0, draggedBlock);
            } else {
                // Fallback
                newBlocks.push(draggedBlock);
            }
        }

        setBlocks(newBlocks);
        onReorderBlocks?.(newBlocks.map(b => b.id));
        resetDragState();
    };

    const handleDragEnd = () => {
        resetDragState();
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Only reset if leaving the container entirely
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
            setDragOverIndex(null);
        }
    };

    const expandedBlock = blocks.find(b => b.id === expandedBlockId);

    // Filter blocks based on trash mode using optional isDeleted
    // If showTrash is true, show blocks where isDeleted === true
    // If showTrash is false, show blocks where isDeleted is falsy (false or undefined)
    const displayBlocks = blocks.filter(b => showTrash ? (b.isDeleted === true) : (!b.isDeleted));

    const trashCount = blocks.filter(b => b.isDeleted).length;

    return (
        <section className="flex-1 flex flex-col border-r border-gray-200 bg-white min-w-[300px] h-full overflow-hidden">
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex flex-col gap-2">
                <div className="flex justify-between items-center">
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
                            {showTrash ? "戻る" : <><Trash2 size={12} /> ({trashCount})</>}                        </button>
                    </div>
                </div>

                {!showTrash && displayBlocks.length > 0 && (
                    <div className="flex gap-2 items-center">
                        <span className="text-xs text-gray-500">一括操作:</span>
                        <button
                            onClick={() => onToggleAllBlocks(true)}
                            className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-green-50 text-green-600 flex items-center gap-1 shadow-sm"
                            title="全て選択"
                        >
                            <CheckSquare size={12} /> 全選択
                        </button>
                        <button
                            onClick={() => onToggleAllBlocks(false)}
                            className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-orange-50 text-orange-600 flex items-center gap-1 shadow-sm"
                            title="全て解除"
                        >
                            <Square size={12} /> 全解除
                        </button>
                    </div>
                )}
            </div>

            <div
                className="flex-1 overflow-y-auto p-4 bg-gray-50/50 flex flex-col gap-3"
                onMouseUp={handleMouseUp}
                onDragLeave={handleDragLeave}
            >
                {displayBlocks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-sm">
                        {showTrash ? "ゴミ箱は空です" : "ブロックがありません"}
                    </div>
                )}

                {/* First drop zone - drop at position 0 */}
                {draggedBlockIndex !== null && draggedBlockIndex !== 0 && displayBlocks.length > 0 && (
                    <div
                        className={`border-2 border-dashed rounded-lg transition-all duration-200 flex items-center justify-center text-gray-400 font-bold ${dragOverIndex === 0 ? 'bg-blue-100 border-blue-400' : 'bg-gray-100 border-gray-300'
                            }`}
                        style={{ minHeight: draggedBlockHeight ? `${draggedBlockHeight}px` : '60px' }}
                        onDragOver={handleDragOver}
                        onDragEnter={() => handleDragEnter(0)}
                        onDrop={() => handleDrop(0)}
                    >
                        ここにドロップ
                    </div>
                )}

                {displayBlocks.map((block, index) => {
                    // Detect status
                    const isProcessing = (!block.isDeleted) && block.text.startsWith('(') && block.text.endsWith(')');
                    const isError = block.text.startsWith('[Error]') || block.text.includes('Error:') || block.text.includes('Failed:');

                    const isReadOnly = isProcessing || showTrash;

                    // DnD Placeholder Logic
                    const isDragged = draggedBlockIndex === index;

                    // Show drop target BEFORE this block if dragOverIndex matches this index
                    // Special case: if dragging downwards (dragged < index), we target after, but the drop logic uses index
                    // Here we simplify: if dragOverIndex is THIS index, show drop zone BEFORE this block
                    const isDropTarget = dragOverIndex === index && !isDragged;

                    return (
                        <React.Fragment key={block.id}>
                            {/* Drop Zone */}
                            {draggedBlockIndex !== null && isDropTarget && (
                                <div
                                    className="bg-gray-100 border-2 border-dashed border-gray-400 rounded-lg mx-1 animate-pulse flex items-center justify-center text-gray-400 font-bold mb-3 transition-all duration-200"
                                    style={{ height: draggedBlockHeight ? `${draggedBlockHeight}px` : '100px', minHeight: '60px' }}
                                    onDragOver={handleDragOver}
                                    onDrop={() => handleDrop(index)}
                                >
                                    ここにドロップ
                                </div>
                            )}
                            <div
                                onDragOver={handleDragOver}
                                onDragEnter={() => handleDragEnter(index)}
                                onDrop={() => handleDrop(index)}
                                className={`p-3 rounded-lg shadow-sm border transition-all flex gap-3 group relative
                                    ${block.isChecked ? 'ring-1 ring-blue-100' : ''}
                                    ${isDragged ? 'opacity-40 scale-95' : 'opacity-100'}
                                    ${isProcessing ? 'bg-blue-50/50' : ''}
                                    ${block.color === 'yellow' ? 'bg-yellow-50 border-yellow-200' : ''}
                                    ${block.color === 'blue' ? 'bg-blue-50 border-blue-200' : ''}
                                    ${block.color === 'green' ? 'bg-green-50 border-green-200' : ''}
                                    ${block.color === 'pink' ? 'bg-pink-50 border-pink-200' : ''}
                                    ${block.color === 'purple' ? 'bg-purple-50 border-purple-200' : ''}
                                    ${block.color === 'orange' ? 'bg-orange-50 border-orange-200' : ''}
                                    ${block.color === 'cyan' ? 'bg-cyan-50 border-cyan-200' : ''}
                                    ${block.color === 'gray' ? 'bg-gray-100 border-gray-300' : ''}
                                    ${!block.color ? 'bg-white border-gray-200' : ''}
                                `}
                            >
                                <div
                                    draggable={!showTrash && !isProcessing}
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragEnd={handleDragEnd}
                                    className={`flex flex-col items-center justify-center pt-1 hover:bg-black/5 rounded px-0.5 transition-colors select-none
                                        ${(!showTrash && !isProcessing) ? 'cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500' : 'cursor-not-allowed text-gray-200'}
                                    `}
                                >
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
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setExpandedBlockId(block.id)} className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50" title="拡大して編集"><Maximize2 size={14} /></button>
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
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setColorPickerBlockId(colorPickerBlockId === block.id ? null : block.id)}
                                                            className="p-1 text-gray-400 hover:text-purple-600 rounded hover:bg-purple-50"
                                                            title="色を変更"
                                                        >
                                                            <Palette size={14} />
                                                        </button>
                                                        {colorPickerBlockId === block.id && (
                                                            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2 min-w-[120px]">
                                                                <div className="grid grid-cols-3 gap-1">
                                                                    {BLOCK_COLORS.map((c) => (
                                                                        <button
                                                                            key={c.value || 'none'}
                                                                            onClick={() => {
                                                                                onColorChange(block.id, c.value);
                                                                                setColorPickerBlockId(null);
                                                                            }}
                                                                            className={`w-8 h-8 rounded border-2 ${c.bg} ${c.border} hover:scale-110 transition-transform ${block.color === c.value ? 'ring-2 ring-blue-400' : ''}`}
                                                                            title={c.name}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button onClick={() => onDeleteBlock(block.id)} className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 ml-4" title="削除"><Trash2 size={14} /></button>
                                                </>
                                            )}
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
                        </React.Fragment>
                    );
                })}

                {/* Final Drop Zone (for appending to end) */}
                {draggedBlockIndex !== null && displayBlocks.length > 0 && (
                    <div
                        className={`border-2 border-dashed rounded-lg transition-all duration-200 flex items-center justify-center text-gray-400 font-bold ${dragOverIndex === displayBlocks.length ? 'bg-blue-100 border-blue-400' : 'bg-transparent border-transparent h-10'
                            }`}
                        style={{
                            height: dragOverIndex === displayBlocks.length ? (draggedBlockHeight ? `${draggedBlockHeight}px` : '100px') : '40px',
                            minHeight: dragOverIndex === displayBlocks.length ? '60px' : '20px'
                        }}
                        onDragOver={handleDragOver}
                        onDragEnter={() => handleDragEnter(displayBlocks.length)}
                        onDrop={() => handleDrop(displayBlocks.length)}
                    >
                        {dragOverIndex === displayBlocks.length ? 'ここにドロップ' : ''}
                    </div>
                )}

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
