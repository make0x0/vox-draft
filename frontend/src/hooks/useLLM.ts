import { useState, useCallback, useRef } from 'react';
import { endpoints } from '../api/client';
import type { ChatMessage } from '../types';

interface UseLLMReturn {
    isGenerating: boolean;
    generate: (messages: ChatMessage[], onData: (chunk: string) => void, onStatus?: (status: string, type: 'status' | 'error') => void) => Promise<void>;
    error: string | null;
}

export const useLLM = (): UseLLMReturn => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const generate = useCallback(async (messages: ChatMessage[], onData: (chunk: string) => void, onStatus?: (status: string, type: 'status' | 'error') => void) => {
        setIsGenerating(true);
        setError(null);

        // Cancel previous request if any
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            // Using fetch directly for streaming support
            const url = import.meta.env.VITE_API_BASE_URL
                ? `${import.meta.env.VITE_API_BASE_URL}${endpoints.llm.stream}`
                : `http://localhost:8000${endpoints.llm.stream}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ messages }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error: ${response.status} ${errorText}`);
            }

            if (!response.body) {
                throw new Error("Response body is null");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6);
                        if (dataStr === '[DONE]') continue;
                        try {
                            const data = JSON.parse(dataStr);

                            // Check for status/error messages first
                            if (data.type === 'status' || data.type === 'error') {
                                if (onStatus) {
                                    onStatus(data.message, data.type);
                                }
                                if (data.type === 'error') {
                                    // If strict error, maybe throw? Or just let caller handle notification.
                                    // Let's not throw here to allow partial content if any? 
                                    // But usually error event means stop.
                                    // Wait, backend yields error event then returns.
                                }
                            } else if (data.content) {
                                onData(data.content);
                            }
                        } catch (e) {
                            console.warn("Failed to parse SSE data", e);
                        }
                    }
                }
            }
        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.log('LLM generation aborted');
            } else {
                console.error("LLM Generation Error:", err);
                setError(err.message || 'Failed to generate text');
                throw err; // Re-throw so caller can handle it
            }
        } finally {
            setIsGenerating(false);
            abortControllerRef.current = null;
        }
    }, []);

    return { isGenerating, generate, error };
};
