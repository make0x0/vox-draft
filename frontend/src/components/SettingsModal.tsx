import React, { useState } from 'react';
import { Settings, Save, X, Plus, Trash2, Database, Download, Upload, HardDrive, FileArchive } from 'lucide-react';
import type { PromptTemplate, VocabularyItem, ApiConfig } from '../types';

interface SettingsModalProps {
    onClose: () => void;
    templates: PromptTemplate[];
    setTemplates: (t: PromptTemplate[]) => void;
    vocabulary: VocabularyItem[];
    setVocabulary: (v: VocabularyItem[]) => void;
    apiConfig: { stt: ApiConfig, llm: ApiConfig };
    generalSettings: { language: string; encoding: string; lineEnding: string; promptStructure: string };
    setGeneralSettings: (settings: { language: string; encoding: string; lineEnding: string; promptStructure: string }) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
    onClose,
    templates,
    setTemplates,
    vocabulary,
    setVocabulary,
    apiConfig,
    generalSettings,
    setGeneralSettings
}) => {
    const [settingsTab, setSettingsTab] = useState<'general' | 'api' | 'prompts' | 'vocab' | 'data'>('general');
    // const [generalSettings, setGeneralSettings] = useState({ language: 'ja', encoding: 'UTF-8', lineEnding: 'LF' }); // Removed local state
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(templates[0]?.id || null);

    // Data Management
    const [exportFrom, setExportFrom] = useState("");
    const [exportTo, setExportTo] = useState("");
    const [exportOptions, setExportOptions] = useState({ text: true, audio: true, config: true });
    const [archiveFrom, setArchiveFrom] = useState("");
    const [archiveTo, setArchiveTo] = useState("");
    const importInputRef = React.useRef<HTMLInputElement>(null);

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

    const addVocab = () => setVocabulary([...vocabulary, { id: `v_${Date.now()}`, reading: '', word: '' }]);
    const updateVocab = (id: string, field: 'reading' | 'word', value: string) => {
        setVocabulary(vocabulary.map(v => v.id === id ? { ...v, [field]: value } : v));
    };
    const deleteVocab = (id: string) => setVocabulary(vocabulary.filter(v => v.id !== id));

    const handleExport = () => {
        // Trigger generic file download
        // In real environment, should use the API URL
        const exportUrl = import.meta.env.VITE_API_BASE_URL
            ? `${import.meta.env.VITE_API_BASE_URL}/api/data/export`
            : `http://localhost:8000/api/data/export`;
        window.open(exportUrl, '_blank');
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm("現在のデータに上書きインポートしますか？\n(既存のデータと競合するファイルは上書きされます)")) {
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            // We need to import client to use it here, or use fetch
            // But SettingsModal doesn't import client currently.
            // Let's assume we can fetch directly or use a prop if we want to be clean,
            // but for now I'll use fetch to avoid adding imports at top of file via separate edit if possible.
            // Actually, let's use fetch.
            const importUrl = import.meta.env.VITE_API_BASE_URL
                ? `${import.meta.env.VITE_API_BASE_URL}/api/data/import`
                : `http://localhost:8000/api/data/import`;

            const response = await fetch(importUrl, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                alert("インポートが完了しました。ページをリロードして反映を確認してください。");
                window.location.reload();
            } else {
                throw new Error(await response.text());
            }
        } catch (err: any) {
            console.error(err);
            alert(`インポートに失敗しました: ${err.message}`);
        }

        // Reset input
        if (importInputRef.current) {
            importInputRef.current.value = '';
        }
    };

    const handleArchiveDelete = () => {
        alert("Not implemented in mock.");
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Settings size={20} /> 設定</h3>
                    <div className="flex gap-2"><button onClick={onClose} className="px-4 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm flex items-center gap-2"><Save size={14} /> 保存</button><button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-200"><X size={20} /></button></div>
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
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">プロンプト構成 (上級者向け)</label>
                                        <div className="text-xs text-gray-500 mb-2">
                                            利用可能なプレースホルダー:<br />
                                            <code className="bg-gray-100 px-1 rounded">{`{system_prompt}`}</code>: 選択したテンプレート<br />
                                            <code className="bg-gray-100 px-1 rounded">{`{user_prompt}`}</code>: プロンプト入力欄<br />
                                            <code className="bg-gray-100 px-1 rounded">{`{checked_transcribe_list}`}</code>: 文字起こし結果<br />
                                            <code className="bg-gray-100 px-1 rounded">{`{recentry_output}`}</code>: エディタの内容
                                        </div>
                                        <textarea
                                            value={(generalSettings as any).promptStructure || `{system_prompt}\n\n{checked_transcribe_list}\n\n{recentry_output}\n\n{user_prompt}`}
                                            onChange={(e) => setGeneralSettings({ ...generalSettings, promptStructure: e.target.value } as any)}
                                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono h-64"
                                            placeholder="プロンプトの構成を入力..."
                                        />
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
                                    <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-500 mb-1">Endpoint URL</label><input type="text" value={apiConfig.stt.url} readOnly className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-sm text-gray-600 font-mono" /></div>
                                </div>
                                <h4 className="text-md font-bold text-gray-900 border-b pb-2 mb-4 mt-8">文章生成 API (LLM)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-500 mb-1">Endpoint URL</label><input type="text" value={apiConfig.llm.url} readOnly className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-sm text-gray-600 font-mono" /></div>
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
    );
}
