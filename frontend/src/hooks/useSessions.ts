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
                // Parse as UTC (append Z if missing) then localize
                date: new Date(item.created_at + (item.created_at.endsWith('Z') ? '' : 'Z')).toLocaleString(),
                isoDate: item.created_at.split('T')[0]
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
            await Promise.all(ids.map(id => client.delete(endpoints.sessions.detail(id))));
            setSessions(prev => prev.filter(s => !ids.includes(s.id)));
        } catch (err) {
            console.error(err);
            // Handle error (maybe toast)
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
                date: new Date(response.data.created_at).toLocaleString(),
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
        updateSessionTitle,
        createSession
    };
};
