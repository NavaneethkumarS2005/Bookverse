import React from 'react';

type InlineAlertType = 'success' | 'error' | 'info';

interface InlineAlertProps {
    type: InlineAlertType;
    message: string;
    onClose?: () => void;
    className?: string;
}

const InlineAlert: React.FC<InlineAlertProps> = ({ type, message, onClose, className = '' }) => {
    const baseStyle = 'rounded-xl border p-4 text-sm font-medium flex items-start justify-between gap-3';

    const typeStyle = type === 'success'
        ? 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-900/50'
        : type === 'error'
            ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/50'
            : 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-900/50';

    return (
        <div className={`${baseStyle} ${typeStyle} ${className}`}>
            <p>{message}</p>
            {onClose && (
                <button
                    type="button"
                    onClick={onClose}
                    className="text-lg leading-none opacity-70 hover:opacity-100"
                    aria-label="Dismiss message"
                >
                    ×
                </button>
            )}
        </div>
    );
};

export default InlineAlert;
