import axios from 'axios';

// Use relative paths by default for cross-device access (mobile, etc.)
// Only set VITE_API_BASE_URL if you need to point to a different server
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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
        update: (id: string) => `/api/sessions/${id}`,
        delete: (id: string) => `/api/sessions/${id}`,
        restore: (id: string) => `/api/sessions/${id}/restore`,
        emptyTrash: '/api/sessions/trash/empty',
        blocks: {
            list: (sessionId: string) => `/api/sessions/${sessionId}/blocks`,
            create: (sessionId: string) => `/api/sessions/${sessionId}/blocks`,
            delete: (blockId: string) => `/api/sessions/blocks/${blockId}`,
            update: (blockId: string) => `/api/sessions/blocks/${blockId}`,
            restore: (blockId: string) => `/api/sessions/blocks/${blockId}/restore`,
            batchUpdate: (sessionId: string) => `/api/sessions/${sessionId}/blocks/batch_update`,
        },
        trash: {
            empty: (sessionId: string) => `/api/sessions/${sessionId}/trash`,
        }
    },
    templates: {
        list: '/api/templates/',
        detail: (id: string) => `/api/templates/${id}`,
    },
    vocabulary: {
        list: '/api/vocabulary/',
        detail: (id: string) => `/api/vocabulary/${id}`,
    },
    settings: {
        list: '/api/settings/',
    }
};
