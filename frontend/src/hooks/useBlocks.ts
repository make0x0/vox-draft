import { useState, useCallback } from 'react';
import { client, endpoints } from '../api/client';
import type { TranscriptionBlock } from '../types';

export const useBlocks = () => {
    const [blocks, setBlocks] = useState<TranscriptionBlock[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBlocks = useCallback(async (sessionId: string) => {
        if (!sessionId) {
            setBlocks([]);
            return;
        }
        setIsLoading(true);
        try {
            // Note: backend endpoint is not yet explicit for blocks listing in sessions.py
            // sessions.py get_session returns session WITH blocks.
            // But we might want separate endpoint or just use get_session.
            // Let's use get_session for now.
            const response = await client.get(endpoints.sessions.detail(sessionId));
            if (!response.data || !Array.isArray(response.data.blocks)) {
                console.warn('Invalid blocks format', response.data);
                setBlocks([]);
                return;
            }
            const fetchedBlocks = response.data.blocks.map((b: any) => ({
                id: b.id,
                type: b.type,
                text: b.text || '',
                timestamp: new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isChecked: b.is_checked,
                duration: b.duration,
                fileName: b.file_name
            }));
            setBlocks(fetchedBlocks);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch blocks');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const addBlock = async (sessionId: string, type: 'text' | 'audio', content: string, _file?: File) => {
        if (!sessionId) return;
        try {
            if (type === 'text') {
                await client.post(endpoints.sessions.blocks.create(sessionId), {
                    type: 'text',
                    text: content,
                    session_id: sessionId
                });
                await fetchBlocks(sessionId);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const addAudioBlock = async (sessionId: string, file: File) => {
        if (!sessionId) return;
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('session_id', sessionId);
            await client.post(endpoints.audio.upload, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            await fetchBlocks(sessionId);
        } catch (err) {
            console.error(err);
        }
    };

    const updateBlock = async (blockId: string, updates: Partial<TranscriptionBlock>) => {
        try {
            // Assuming the backend expects 'is_checked' for the boolean field
            const payload: any = {};
            if (updates.text !== undefined) payload.text = updates.text;
            if (updates.isChecked !== undefined) payload.is_checked = updates.isChecked;

            await client.patch(endpoints.sessions.blocks.update(blockId), payload);
            setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, ...updates } : b));
        } catch (error) {
            console.error('Failed to update block:', error);
        }
    };

    const deleteBlock = async (blockId: string) => {
        try {
            await client.delete(endpoints.sessions.blocks.delete(blockId));
            setBlocks(prev => prev.filter(b => b.id !== blockId));
        } catch (error) {
            console.error('Failed to delete block:', error);
        }
    };

    const reTranscribeBlock = async (_blockId: string) => {
        // Placeholder for re-transcription logic
        console.log("Re-transcribe requested for", _blockId);
        // Implementation depends on backend capabilities
    };

    return {
        blocks,
        setBlocks, // Expose setter for optimistic updates if needed
        isLoading,
        error,
        fetchBlocks,
        addBlock,
        addAudioBlock,
        updateBlock,
        deleteBlock,
        reTranscribeBlock
    };
};
