export interface TranscriptionBlock {
    id: string;
    type: 'audio' | 'text';
    text: string;
    timestamp: string;
    isChecked: boolean;
    duration?: string;
    fileName?: string;
    filePath?: string; // Added for backend integration
    isDeleted?: boolean;
}

export interface HistoryItem {
    id: string;
    date: string;
    isoDate: string;
    summary: string;
}

export interface PromptTemplate {
    id: string;
    title: string;
    content: string;
    is_system?: boolean;
}

export interface ApiConfig {
    provider: string;
    url: string; // Base URL
    model?: string; // LLM only
    azure_deployment?: string;
    azure_endpoint?: string;
    timeout?: number;
    // Legacy fields (optional)
    authType?: 'api-key' | 'bearer';
    keyMasked?: string;
}

export interface VocabularyItem {
    id: string;
    reading: string;
    word: string;
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface EditorRevision {
    id: string;
    session_id: string;
    content: string;
    note?: string;
    created_at: string;
}
