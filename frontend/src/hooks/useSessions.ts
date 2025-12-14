import { useState, useEffect, useCallback } from 'react';
import { client, endpoints } from '../api/client';
import type { HistoryItem } from '../types';

export const useSessions = () => {
    const [sessions, setSessions] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSessions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await client.get(endpoints.sessions.list);
            if (!Array.isArray(response.data)) {
                throw new Error('Invalid response format: expected array');
            }
            const data = response.data.map((item: any) => ({
                id: item.id,
                summary: item.title || item.summary || 'No Title', // Use title as summary for now
                date: (() => {
                    const d = new Date(item.created_at + (item.created_at.endsWith('Z') ? '' : 'Z'));
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    const h = String(d.getHours()).padStart(2, '0');
                    const min = String(d.getMinutes()).padStart(2, '0');
                    return `${y}-${m}-${day} ${h}:${min}`;
                })(),
                isoDate: item.created_at.split('T')[0],
                isDeleted: item.is_deleted // Add this
            }));
            setSessions(data);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch sessions');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const deleteSessions = async (ids: string[]) => {
        try {
            await Promise.all(ids.map(id => client.delete(endpoints.sessions.delete(id))));
            // Soft delete: Mark as deleted locally
            setSessions(prev => prev.map(s => ids.includes(s.id) ? { ...s, isDeleted: true } : s));
        } catch (err) {
            console.error(err);
        }
    };

    const restoreSession = async (id: string) => {
        try {
            await client.post(endpoints.sessions.restore(id), {});
            setSessions(prev => prev.map(s => s.id === id ? { ...s, isDeleted: false } : s));
        } catch (err) {
            console.error('Failed to restore session:', err);
        }
    };

    const emptySessionTrash = async () => {
        try {
            await client.delete(endpoints.sessions.emptyTrash);
            setSessions(prev => prev.filter(s => !s.isDeleted));
        } catch (err) {
            console.error('Failed to empty session trash:', err);
        }
    };

    const updateSessionTitle = async (id: string, newTitle: string) => {
        try {
            await client.patch(endpoints.sessions.detail(id), { title: newTitle });
            setSessions(prev => prev.map(s => s.id === id ? { ...s, summary: newTitle } : s));
        } catch (err) {
            console.error(err);
        }
    };

    const createSession = async (title: string, summary?: string) => {
        try {
            const response = await client.post(endpoints.sessions.list, { title, summary });
            const newSession = {
                id: response.data.id,
                summary: response.data.title || response.data.summary || 'No Title',
                date: (() => {
                    const d = new Date(response.data.created_at);
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    const h = String(d.getHours()).padStart(2, '0');
                    const min = String(d.getMinutes()).padStart(2, '0');
                    return `${y}-${m}-${day} ${h}:${min}`;
                })(),
                isoDate: response.data.created_at.split('T')[0]
            };
            setSessions(prev => [newSession, ...prev]);
            return newSession;
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    return {
        sessions,
        isLoading,
        error,
        fetchSessions,
        deleteSessions,
        restoreSession,
        emptySessionTrash,
        updateSessionTitle,
        createSession
    };
};
