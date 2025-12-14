import axios from 'axios';

// Dynamic API URL based on current hostname and port
// This allows access from any device on the same network
const getApiBaseUrl = (): string => {
    // If VITE_API_BASE_URL is set and not localhost, use it
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl && !envUrl.includes('localhost')) {
        return envUrl;
    }

    // Check if we're accessing through nginx (ports 80, 443, or empty)
    const port = window.location.port;
    const protocol = window.location.protocol;

    if (port === '' || port === '80' || port === '443') {
        // We're behind nginx proxy - use relative URL (nginx will proxy /api/ to backend)
        const baseUrl = `${protocol}//${window.location.host}`;
        console.log('[API Client] Using nginx proxy, base URL:', baseUrl);
        return baseUrl;
    }

    // Direct access (development mode on port 5173)
    // Use the backend directly on port 8000
    const hostname = window.location.hostname;
    const url = `http://${hostname}:8000`;
    console.log('[API Client] Direct access, using API URL:', url);
    return url;
};

const API_BASE_URL = getApiBaseUrl();
console.log('[API Client] Final API_BASE_URL:', API_BASE_URL);

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
        list: '/api/sessions/',
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
            reorder: (sessionId: string) => `/api/sessions/${sessionId}/blocks/reorder`,
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
        test: '/api/settings/test',
    }
};
