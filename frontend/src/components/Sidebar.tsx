import React, { useState } from 'react';
import { Book, CheckSquare, Search, Calendar, Trash2, Settings, Edit3, Check, Plus, Sparkles, RotateCcw } from 'lucide-react';
import type { HistoryItem } from '../types';

interface SidebarProps {
    history: HistoryItem[];
    onSelectSession: (id: string) => void;
    onDeleteSessions: (ids: string[]) => void;
    onUpdateSessionTitle: (id: string, newTitle: string) => void;
    onGenerateTitle: (id: string) => Promise<string>;
    onOpenSettings: () => void;
    onNewSession: () => void;
    onResetLayout: () => void;
    width?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
    history,
    onSelectSession,
    onDeleteSessions,
    onUpdateSessionTitle,
    onGenerateTitle,
    onOpenSettings,
    onNewSession,
    onResetLayout,
    width = 300
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchDateFrom, setSearchDateFrom] = useState("");
    const [searchDateTo, setSearchDateTo] = useState("");
    const [showSearchFilters, setShowSearchFilters] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
    const [tempTitle, setTempTitle] = useState("");

    const toggleHistorySelection = (id: string) => {
        const newSet = new Set(selectedHistoryIds);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedHistoryIds(newSet);
    };

    const selectAll = () => {
        // Select all displayed history items
        setSelectedHistoryIds(new Set(displayedHistory.map(h => h.id)));
    };

    const handleBulkDelete = () => { if (selectedHistoryIds.size > 0) setShowDeleteConfirm(true); };

    // Explicit Delete All History Button Handler
    const handleDeleteAllHistory = () => {
        // Select ALL history (not just displayed/filtered)
        setSelectedHistoryIds(new Set(history.map(h => h.id)));
        setShowDeleteConfirm(true);
    };

    const confirmBulkDelete = () => {
        onDeleteSessions(Array.from(selectedHistoryIds));
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
            onUpdateSessionTitle(editingTitleId, tempTitle);
            setEditingTitleId(null);
        }
    };

    const filteredHistory = history.filter(h => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            if (!h.summary.toLowerCase().includes(q) && !h.date.includes(q)) return false;
        }
        if (searchDateFrom && h.isoDate < searchDateFrom) return false;
        if (searchDateTo && h.isoDate > searchDateTo) return false;
        return true;
    });

    const displayedHistory = (!searchQuery && !searchDateFrom && !searchDateTo) ? filteredHistory.slice(0, 50) : filteredHistory;

    return (
        <aside
            className="bg-white border-r border-gray-200 flex flex-col flex-shrink-0 z-20 shadow-sm h-full overflow-hidden"
            style={{ width: width }}
        >
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <h2 className="text-sm font-bold text-gray-600 flex items-center gap-2"><Book size={16} /> 履歴</h2>
                    {/* Toggle Moved from here */}
                </div>

                <button
                    onClick={onNewSession}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-md shadow-sm flex items-center justify-center gap-2 transition-colors"
                >
                    <Plus size={16} /> 新しいセッション
                </button>
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

                {/* Selection Toggle & Tools Row */}
                <div className="flex justify-between items-center mt-1">
                    <button onClick={() => setIsSelectionMode(!isSelectionMode)} className={`p-1.5 rounded text-xs flex items-center gap-1 border ${isSelectionMode ? 'bg-blue-100 text-blue-700 border-blue-200' : 'text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                        <CheckSquare size={14} /> {isSelectionMode ? '選択モード終了' : '選択モード'}
                    </button>
                    {isSelectionMode && (
                        <button onClick={handleDeleteAllHistory} className="text-xs text-red-600 hover:text-red-800 hover:underline flex items-center gap-1">
                            <Trash2 size={12} /> 全履歴削除
                        </button>
                    )}
                </div>

                {isSelectionMode && (
                    <div className="bg-blue-50 border border-blue-100 rounded p-2 flex justify-between items-center gap-2">
                        <div className="flex gap-2 items-center">
                            <span className="text-xs text-blue-800 font-bold">{selectedHistoryIds.size}件</span>
                            <button onClick={selectAll} className="text-[10px] bg-white border border-blue-200 text-blue-600 px-2 py-0.5 rounded hover:bg-blue-100">全選択(表示中)</button>
                        </div>
                        <button onClick={handleBulkDelete} disabled={selectedHistoryIds.size === 0} className="text-xs bg-white border border-red-200 text-red-600 px-2 py-1 rounded hover:bg-red-100 flex items-center gap-1 disabled:opacity-50"><Trash2 size={12} /> 削除</button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                {displayedHistory.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">履歴が見つかりません</div> : displayedHistory.map(item => (
                    <div key={item.id} className={`p-3 border-b border-gray-100 transition-colors group relative ${isSelectionMode ? 'hover:bg-gray-50' : selectedHistoryIds.has(item.id) ? 'bg-blue-50' : 'hover:bg-blue-50 cursor-pointer'}`}>
                        <div className="flex gap-2">
                            {isSelectionMode && <div className="pt-1"><input type="checkbox" checked={selectedHistoryIds.has(item.id)} onChange={() => toggleHistorySelection(item.id)} className="w-4 h-4 text-blue-600 rounded cursor-pointer" /></div>}
                            <div className="flex-1 min-w-0" onClick={() => !isSelectionMode && !editingTitleId && onSelectSession(item.id)}>
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
                                        <button onClick={saveTitle} className="text-green-600 p-1 hover:bg-green-50 rounded"><Check size={14} /></button>
                                        <button onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                                const newT = await onGenerateTitle(item.id);
                                                setTempTitle(newT);
                                            } catch (err) {
                                                alert("AIタイトルの生成に失敗しました");
                                            }
                                        }} className="text-purple-600 p-1 hover:bg-purple-50 rounded" title="AIでタイトルを生成"><Sparkles size={14} /></button>
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
            <div className="p-2 border-t border-gray-200 flex gap-2">
                <button onClick={onOpenSettings} className="flex-1 flex items-center justify-center gap-1 text-xs text-gray-600 hover:text-gray-900 p-1.5 rounded hover:bg-gray-100 transition-colors bg-white border border-gray-200 shadow-sm"><Settings size={14} /><span>設定</span></button>
                <button onClick={onResetLayout} className="p-1.5 text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-100 shadow-sm" title="画面のレイアウトがリセットされます">
                    <RotateCcw size={14} />
                </button>
            </div>

            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 animate-in zoom-in duration-200">
                        <div className="flex items-center gap-3 text-red-600 mb-4">
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
        </aside>
    );
};
