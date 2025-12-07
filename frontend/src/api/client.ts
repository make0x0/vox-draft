import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const endpoints = {
    audio: {
        upload: '/api/audio/upload',
    },
    stt: {
        transcribe: (id: string) => `/api/stt/transcribe/${id}`,
    },
    llm: {
        stream: '/api/llm/chat/stream',
    },
    data: {
        export: '/api/data/export',
        import: '/api/data/import',
    },
    sessions: {
        list: '/api/sessions',
        detail: (id: string) => `/api/sessions/${id}`,
        blocks: {
            list: (sessionId: string) => `/api/sessions/${sessionId}/blocks`,
            create: (sessionId: string) => `/api/sessions/${sessionId}/blocks`,
            delete: (blockId: string) => `/api/sessions/blocks/${blockId}`,
            update: (blockId: string) => `/api/sessions/blocks/${blockId}`,
        }
    }
};
