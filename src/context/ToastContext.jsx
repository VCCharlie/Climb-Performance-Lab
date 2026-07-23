import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

const DEFAULT_DURATION_MS = 6000;

let toastCounter = 0;

const VARIANT_CLASS = {
    success: 'bg-green-500/15 border-green-500/40 text-green-200',
    error: 'bg-red-500/15 border-red-500/40 text-red-200',
    info: 'bg-blue-500/15 border-blue-500/40 text-blue-200',
    warning: 'bg-amber-500/15 border-amber-500/40 text-amber-100',
};

function ToastStack({ toasts, onDismiss, variantClass }) {
    if (toasts.length === 0) return null;

    return (
        <div
            className="fixed bottom-20 left-1/2 z-[200] flex w-[min(92vw,28rem)] -translate-x-1/2 flex-col gap-2 pointer-events-none"
            role="status"
            aria-live="polite"
        >
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`pointer-events-auto flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm shadow-lg backdrop-blur-sm ${variantClass[toast.variant] || variantClass.info}`}
                >
                    <span className="leading-snug">{toast.message}</span>
                    <button
                        type="button"
                        onClick={() => onDismiss(toast.id)}
                        className="shrink-0 text-xs opacity-70 hover:opacity-100 underline"
                        aria-label="Dismiss notification"
                    >
                        Dismiss
                    </button>
                </div>
            ))}
        </div>
    );
}

/**
 * Lightweight toast stack for sync/import feedback (replaces alert() in key flows).
 */
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const timersRef = useRef(new Map());

    const dismissToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        const timer = timersRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(id);
        }
    }, []);

    const showToast = useCallback((message, options = {}) => {
        const id = `toast-${++toastCounter}`;
        const variant = options.variant || 'info';
        const durationMs = options.durationMs ?? DEFAULT_DURATION_MS;
        const toast = { id, message: String(message), variant };

        setToasts((prev) => [...prev, toast]);

        if (durationMs > 0) {
            const timer = setTimeout(() => dismissToast(id), durationMs);
            timersRef.current.set(id, timer);
        }

        return id;
    }, [dismissToast]);

    const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastStack toasts={toasts} onDismiss={dismissToast} variantClass={VARIANT_CLASS} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        return {
            showToast: () => null,
            dismissToast: () => {},
        };
    }
    return ctx;
}
