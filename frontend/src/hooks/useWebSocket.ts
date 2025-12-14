import { useEffect, useRef, useCallback } from 'react';

// Get WebSocket URL based on current page location
const getWsUrl = (): string => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const port = '8000'; // Backend port
    return `${protocol}//${hostname}:${port}/ws`;
};

export interface SyncMessage {
    type: 'session_created' | 'session_updated' | 'session_deleted' |
    'block_created' | 'block_updated' | 'block_deleted' |
    'revision_created' | 'settings_updated';
    payload: {
        session_id?: string;
        block_id?: string;
        [key: string]: any;
    };
}

interface UseWebSocketOptions {
    onSessionChange?: () => void;
    onBlockChange?: (sessionId: string) => void;
    onSettingsChange?: () => void;
    onRevisionChange?: (sessionId: string) => void;
}

export function useWebSocket(options: UseWebSocketOptions) {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const optionsRef = useRef(options);

    // Keep options ref up to date
    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        const wsUrl = getWsUrl();
        console.log('[WebSocket] Connecting to', wsUrl);

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('[WebSocket] Connected');
        };

        ws.onmessage = (event) => {
            try {
                const message: SyncMessage = JSON.parse(event.data);
                console.log('[WebSocket] Received:', message.type, message.payload);

                const opts = optionsRef.current;

                switch (message.type) {
                    case 'session_created':
                    case 'session_updated':
                    case 'session_deleted':
                        opts.onSessionChange?.();
                        break;
                    case 'block_created':
                    case 'block_updated':
                    case 'block_deleted':
                        if (message.payload.session_id) {
                            opts.onBlockChange?.(message.payload.session_id);
                        }
                        break;
                    case 'revision_created':
                        if (message.payload.session_id) {
                            opts.onRevisionChange?.(message.payload.session_id);
                        }
                        break;
                    case 'settings_updated':
                        opts.onSettingsChange?.();
                        break;
                }
            } catch (err) {
                console.error('[WebSocket] Failed to parse message:', err);
            }
        };

        ws.onclose = () => {
            console.log('[WebSocket] Disconnected, reconnecting in 3s...');
            wsRef.current = null;

            // Auto-reconnect after 3 seconds
            reconnectTimeoutRef.current = setTimeout(() => {
                connect();
            }, 3000);
        };

        ws.onerror = (error) => {
            console.error('[WebSocket] Error:', error);
        };

        wsRef.current = ws;
    }, []);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    return {
        isConnected: wsRef.current?.readyState === WebSocket.OPEN
    };
}
