import { useState, useEffect, useCallback, useRef } from 'react';
import type { PromptTemplate, VocabularyItem } from '../types';
import { client, endpoints } from '../api/client';

// Generate or retrieve device ID from localStorage
const getDeviceId = (): string => {
    const key = 'vox_device_id';
    let deviceId = localStorage.getItem(key);
    if (!deviceId) {
        deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        localStorage.setItem(key, deviceId);
    }
    return deviceId;
};

// Detect if mobile device
const getIsMobile = (): boolean => {
    return window.innerWidth < 768;
};

export const useSettingsData = () => {
    const [templates, setTemplates] = useState<PromptTemplate[]>([]);
    const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
    const [deviceId] = useState<string>(getDeviceId());
    const [isMobile, setIsMobile] = useState<boolean>(getIsMobile());

    // Default layout settings
    const defaultLayout = {
        sidebar_width: isMobile ? 0 : 300,  // Hidden on mobile by default
        editor_width: isMobile ? 0 : 350,
        prompt_height: '80px',
        sidebar_collapsed: isMobile  // Collapsed on mobile
    };

    const [generalSettings, setGeneralSettings] = useState<any>({
        language: 'ja',
        encoding: 'UTF-8',
        lineEnding: 'LF',
        promptStructure: `{system_prompt}\n\n<Context>\n{checked_transcribe_list}\n</Context>\n\n<CurrentContent>\n{recentry_output}\n</CurrentContent>\n\n<UserInstruction>\n{user_prompt}\n</UserInstruction>`,
        // Layout settings will be merged from device-specific storage
        ...defaultLayout
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Listen for window resize to detect mobile/desktop switch
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(getIsMobile());
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch initial data
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [templatesRes, vocabRes, settingsRes] = await Promise.all([
                client.get(endpoints.templates.list),
                client.get(endpoints.vocabulary.list),
                client.get(endpoints.settings.list)
            ]);

            setTemplates(templatesRes.data);
            setVocabulary(vocabRes.data);

            // Merge defaults with server data
            // Device-specific layout is stored under device_layouts[deviceId]
            const serverSettings = settingsRes.data || {};
            const deviceLayouts = serverSettings.device_layouts || {};
            const myLayout = deviceLayouts[deviceId] || {};

            setGeneralSettings((prev: any) => ({
                ...prev,
                ...serverSettings,
                // Override with device-specific layout if exists
                sidebar_width: myLayout.sidebar_width ?? prev.sidebar_width,
                editor_width: myLayout.editor_width ?? prev.editor_width,
                prompt_height: myLayout.prompt_height ?? prev.prompt_height,
                sidebar_collapsed: myLayout.sidebar_collapsed ?? prev.sidebar_collapsed
            }));
        } catch (e: any) {
            console.error("Error fetching settings data:", e);
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [deviceId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Templates CRUD ---
    const addTemplate = useCallback(async (template: { title: string; content: string }) => {
        try {
            const res = await client.post(endpoints.templates.list, template);
            const newTemplate = res.data;
            setTemplates(prev => [...prev, newTemplate]);
            return newTemplate;
        } catch (e) {
            console.error(e);
            throw e;
        }
    }, []);

    const updateTemplate = useCallback(async (template: PromptTemplate) => {
        try {
            const res = await client.put(endpoints.templates.detail(template.id), {
                title: template.title,
                content: template.content,
                is_system: template.is_system
            });
            const updated = res.data;
            setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
        } catch (e) {
            console.error(e);
            throw e;
        }
    }, []);

    const deleteTemplate = useCallback(async (id: string) => {
        try {
            await client.delete(endpoints.templates.detail(id));
            setTemplates(prev => prev.filter(t => t.id !== id));
        } catch (e) {
            console.error(e);
            throw e;
        }
    }, []);

    // --- Vocabulary CRUD ---
    const addVocabularyItem = useCallback(async (item: { reading: string; word: string }) => {
        try {
            const res = await client.post(endpoints.vocabulary.list, item);
            const newItem = res.data;
            setVocabulary(prev => [...prev, newItem]);
            return newItem;
        } catch (e) {
            console.error(e);
            throw e;
        }
    }, []);

    const updateVocabularyItem = useCallback(async (item: VocabularyItem) => {
        try {
            const res = await client.put(endpoints.vocabulary.detail(item.id), {
                reading: item.reading,
                word: item.word
            });
            const updated = res.data;
            setVocabulary(prev => prev.map(v => v.id === updated.id ? updated : v));
        } catch (e) {
            console.error(e);
            throw e;
        }
    }, []);

    const deleteVocabularyItem = useCallback(async (id: string) => {
        try {
            await client.delete(endpoints.vocabulary.detail(id));
            setVocabulary(prev => prev.filter(v => v.id !== id));
        } catch (e) {
            console.error(e);
            throw e;
        }
    }, []);

    // --- General Settings ---
    // Layout keys that should be stored per device
    const layoutKeys = ['sidebar_width', 'editor_width', 'prompt_height', 'sidebar_collapsed'];

    const updateGeneralSettings = useCallback(async (updates: any) => {
        // Optimistic update
        setGeneralSettings((prev: any) => ({ ...prev, ...updates }));

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            try {
                // Separate layout updates (device-specific) from general updates
                const layoutUpdates: any = {};
                const generalUpdates: any = {};

                for (const [key, value] of Object.entries(updates)) {
                    if (layoutKeys.includes(key)) {
                        layoutUpdates[key] = value;
                    } else {
                        generalUpdates[key] = value;
                    }
                }

                // If there are layout updates, wrap them in device_layouts[deviceId]
                if (Object.keys(layoutUpdates).length > 0) {
                    generalUpdates.device_layouts = {
                        [deviceId]: layoutUpdates
                    };
                }

                await client.patch(endpoints.settings.list, generalUpdates);
            } catch (e) {
                console.error(e);
                // Revert or error handling? For now just log. 
            }
        }, 1000);
    }, [deviceId]);

    return {
        templates,
        vocabulary,
        isLoading,
        error,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        addVocabularyItem,
        updateVocabularyItem,
        deleteVocabularyItem,
        // Setters exposed for compatibility if needed, but preferable to use CRUD methods
        setTemplates,
        setVocabulary,
        generalSettings,
        updateGeneralSettings,
        // Device info
        deviceId,
        isMobile,
    };
};
