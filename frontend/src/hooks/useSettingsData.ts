import { useState, useEffect, useCallback } from 'react';
import type { PromptTemplate, VocabularyItem } from '../types';
import { client, endpoints } from '../api/client';

export const useSettingsData = () => {
    const [templates, setTemplates] = useState<PromptTemplate[]>([]);
    const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch initial data
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Parallel fetch using client
            const [templatesRes, vocabRes] = await Promise.all([
                client.get(endpoints.templates.list),
                client.get(endpoints.vocabulary.list)
            ]);

            setTemplates(templatesRes.data);
            setVocabulary(vocabRes.data);
        } catch (e: any) {
            console.error("Error fetching settings data:", e);
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

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
        setVocabulary
    };
};
