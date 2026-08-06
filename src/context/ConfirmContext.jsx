import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Button } from '../components/ui';
import ModalPortal from '../components/ui/ModalPortal';
import { modalScrimClass } from '../components/ui/modalStyles';
import { useModalA11y } from '../hooks/useModalA11y';

const ConfirmContext = createContext(null);

function ConfirmDialog({ request, onResolve }) {
    const panelRef = useModalA11y({
        isOpen: Boolean(request),
        onClose: () => onResolve(false),
    });

    if (!request) return null;

    const {
        title = 'Confirm',
        message,
        confirmLabel = 'Confirm',
        cancelLabel = 'Cancel',
        variant = 'default',
    } = request;

    return (
        <ModalPortal>
            <div
                className={modalScrimClass}
                onMouseDown={(event) => {
                    if (event.target === event.currentTarget) onResolve(false);
                }}
            >
                <div
                    ref={panelRef}
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="confirm-dialog-title"
                    aria-describedby="confirm-dialog-message"
                    className="w-full max-w-md rounded-cdxl border border-cdborder/60 bg-cdsurface shadow-lg p-5 space-y-4"
                >
                    <div className="space-y-2">
                        <h2 id="confirm-dialog-title" className="text-lg font-head font-bold text-cdtext">
                            {title}
                        </h2>
                        <p id="confirm-dialog-message" className="text-sm text-cdmuted leading-relaxed whitespace-pre-line">
                            {message}
                        </p>
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                        <Button type="button" variant="text" onClick={() => onResolve(false)}>
                            {cancelLabel}
                        </Button>
                        <Button
                            type="button"
                            variant={variant === 'danger' ? 'danger' : 'filled'}
                            onClick={() => onResolve(true)}
                        >
                            {confirmLabel}
                        </Button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}

export function ConfirmProvider({ children }) {
    const [request, setRequest] = useState(null);
    const resolverRef = useRef(null);

    const confirm = useCallback((options = {}) => {
        return new Promise((resolve) => {
            resolverRef.current = resolve;
            setRequest({
                title: options.title,
                message: String(options.message ?? ''),
                confirmLabel: options.confirmLabel,
                cancelLabel: options.cancelLabel,
                variant: options.variant,
            });
        });
    }, []);

    const handleResolve = useCallback((result) => {
        setRequest(null);
        const resolve = resolverRef.current;
        resolverRef.current = null;
        resolve?.(result);
    }, []);

    const value = useMemo(() => ({ confirm }), [confirm]);

    return (
        <ConfirmContext.Provider value={value}>
            {children}
            <ConfirmDialog request={request} onResolve={handleResolve} />
        </ConfirmContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is co-located with provider
export function useConfirm() {
    const ctx = useContext(ConfirmContext);
    if (!ctx) {
        return {
            confirm: async () => false,
        };
    }
    return ctx;
}
