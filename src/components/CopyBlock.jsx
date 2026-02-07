import { useState, useCallback } from 'react';

export function CopyBlock({ label, content, id }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    }, [content]);

    if (!content) return null;

    return (
        <div className="copy-block" id={id}>
            {label && <span className="copy-label">{label}</span>}
            <div className="copy-content">{content}</div>
            <button
                className={`copy-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
                title={copied ? '복사됨!' : '클립보드에 복사'}
            >
                {copied ? '✓' : '📋'}
            </button>
        </div>
    );
}

export function CopyBlockCode({ label, content, language, id }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    }, [content]);

    if (!content) return null;

    return (
        <div className="copy-block" id={id}>
            {label && <span className="copy-label">{label}{language && ` · ${language}`}</span>}
            <pre className="font-mono" style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>{content}</pre>
            <button
                className={`copy-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
                title={copied ? '복사됨!' : '클립보드에 복사'}
            >
                {copied ? '✓' : '📋'}
            </button>
        </div>
    );
}
