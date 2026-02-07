import { useState, useCallback } from 'react';

export function useCopyClipboard(resetMs = 2000) {
    const [copiedId, setCopiedId] = useState(null);

    const copy = useCallback(async (text, id = 'default') => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), resetMs);
            return true;
        } catch (err) {
            console.error('Copy failed:', err);
            return false;
        }
    }, [resetMs]);

    return { copy, copiedId };
}
