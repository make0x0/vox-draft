import { useState, useRef, useCallback } from 'react';

interface AudioRecorderState {
    isRecording: boolean;
    duration: number;
    error: string | null;
}

export const useAudioRecorder = () => {
    const [state, setState] = useState<AudioRecorderState>({
        isRecording: false,
        duration: 0,
        error: null
    });

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                // Cleanup tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setState(prev => ({ ...prev, isRecording: true, error: null, duration: 0 }));

            timerRef.current = setInterval(() => {
                setState(prev => ({ ...prev, duration: prev.duration + 1 }));
            }, 1000);

        } catch (err: any) {
            console.error("Error accessing microphone:", err);
            setState(prev => ({ ...prev, error: "マイクへのアクセスが拒否されました。" }));
        }
    }, []);

    const stopRecording = useCallback((): Promise<File | null> => {
        return new Promise((resolve) => {
            const mediaRecorder = mediaRecorderRef.current;
            if (!mediaRecorder || mediaRecorder.state === 'inactive') {
                resolve(null);
                return;
            }

            // We need to listen to onstop here to ensure we have the final blob
            // But we already defined onstop above. We can just wait a bit or use a promise wrapper around the event.
            // A common pattern is to wrap the functionality.

            // Override onstop to handle finalization
            const originalOnStop = mediaRecorder.onstop;
            mediaRecorder.onstop = (e) => {
                if (originalOnStop) originalOnStop.call(mediaRecorder, e);

                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                // Note: file type might vary by browser. Chrome defaults to webm.
                // We should check what the browser recorded, but webm is standard for MediaRecorder.

                const file = new File([blob], `recording_${Date.now()}.webm`, { type: blob.type });
                resolve(file);
            };

            mediaRecorder.stop();
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            setState(prev => ({ ...prev, isRecording: false }));
        });
    }, []);

    return {
        ...state,
        startRecording,
        stopRecording
    };
};
