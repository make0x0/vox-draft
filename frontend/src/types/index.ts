export interface TranscriptionBlock {
    id: string;
    type: 'audio' | 'text';
    text: string;
    timestamp: string;
    isChecked: boolean;
    duration?: string;
    fileName?: string;
    filePath?: string; // Added for backend integration
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
}

export interface ApiConfig {
    url: string;
    authType: 'api-key' | 'bearer';
    keyMasked: string;
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
