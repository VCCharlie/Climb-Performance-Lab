/**
 * Imperative toast bridge for modules outside the React tree (e.g. App handlers).
 * ToastProvider registers the live handler on mount.
 */
let notifyHandler = null;

export function registerNotifyHandler(handler) {
    notifyHandler = handler;
}

export function unregisterNotifyHandler(handler) {
    if (notifyHandler === handler) notifyHandler = null;
}

export function notify(message, options = {}) {
    if (typeof notifyHandler === 'function') {
        return notifyHandler(message, options);
    }
    return null;
}
