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
            // Parallel fetch
            const [templatesRes, vocabRes] = await Promise.all([
                fetch(`http://localhost:8000/api/templates/`),
                fetch(`http://localhost:8000/api/vocabulary/`)
            ]);

            if (!templatesRes.ok) throw new Error("Failed to fetch templates");
            if (!vocabRes.ok) throw new Error("Failed to fetch vocabulary");

            const templatesData = await templatesRes.json();
            const vocabData = await vocabRes.json();

            setTemplates(templatesData);
            setVocabulary(vocabData);
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
    const addTemplate = async (template: { title: string; content: string }) => {
        try {
            const res = await fetch(`http://localhost:8000/api/templates/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(template)
            });
            if (!res.ok) throw new Error("Failed to create template");
            const newTemplate = await res.json();
            setTemplates(prev => [...prev, newTemplate]);
            return newTemplate;
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const updateTemplate = async (template: PromptTemplate) => {
        try {
            const res = await fetch(`http://localhost:8000/api/templates/${template.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: template.title, content: template.content })
            });
            if (!res.ok) throw new Error("Failed to update template");
            const updated = await res.json();
            setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const deleteTemplate = async (id: string) => {
        try {
            const res = await fetch(`http://localhost:8000/api/templates/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error("Failed to delete template");
            setTemplates(prev => prev.filter(t => t.id !== id));
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    // --- Vocabulary CRUD ---
    const addVocabularyItem = async (item: { reading: string; word: string }) => {
        try {
            const res = await fetch(`http://localhost:8000/api/vocabulary/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
            if (!res.ok) throw new Error("Failed to create vocabulary item");
            const newItem = await res.json();
            setVocabulary(prev => [...prev, newItem]);
            return newItem;
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const updateVocabularyItem = async (item: VocabularyItem) => {
        try {
            const res = await fetch(`http://localhost:8000/api/vocabulary/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reading: item.reading, word: item.word })
            });
            if (!res.ok) throw new Error("Failed to update vocabulary item");
            const updated = await res.json();
            setVocabulary(prev => prev.map(v => v.id === updated.id ? updated : v));
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const deleteVocabularyItem = async (id: string) => {
        try {
            const res = await fetch(`http://localhost:8000/api/vocabulary/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error("Failed to delete vocabulary item");
            setVocabulary(prev => prev.filter(v => v.id !== id));
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

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
