import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';

export interface TaskStatus {
    id: string;
    type: 'processing' | 'success' | 'error';
    message: string;
    startTime: number;
    endTime?: number;
}

interface NotificationManagerProps {
    tasks: TaskStatus[];
    onDismiss: (id: string) => void;
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({ tasks, onDismiss }) => {
    // Current time state for ticking timers
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        // Update timer every second
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    if (tasks.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-80 pointer-events-none">
            {tasks.map(task => {
                const durationMs = (task.endTime || now) - task.startTime;
                const durationSec = Math.floor(durationMs / 1000);
                const minutes = Math.floor(durationSec / 60);
                const seconds = durationSec % 60;
                const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

                let bgColor = 'bg-white';
                let borderColor = 'border-gray-200';
                let icon = <Loader2 size={20} className="animate-spin text-blue-500" />;
                let title = "処理中...";

                if (task.type === 'success') {
                    bgColor = 'bg-green-50';
                    borderColor = 'border-green-200';
                    icon = <CheckCircle size={20} className="text-green-500" />;
                    title = "完了";
                } else if (task.type === 'error') {
                    bgColor = 'bg-red-50';
                    borderColor = 'border-red-200';
                    icon = <AlertCircle size={20} className="text-red-500" />;
                    title = "エラー";
                }

                return (
                    <div
                        key={task.id}
                        className={`pointer-events-auto p-4 rounded-lg border ${borderColor} ${bgColor} shadow-lg flex flex-col gap-2 transition-all animate-in slide-in-from-right fade-in duration-300`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 font-medium text-gray-800">
                                {icon}
                                <span>{title}</span>
                            </div>
                            <button onClick={() => onDismiss(task.id)} className="text-gray-400 hover:text-gray-600">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="text-sm text-gray-600 pl-7 break-words">
                            {task.message}
                        </div>
                        <div className="text-xs text-gray-500 pl-7 font-mono flex gap-2">
                            <span>開始: {new Date(task.startTime).toLocaleTimeString()}</span>
                            <span className="font-bold">経過: {timeStr}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
