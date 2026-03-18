import { useMemo, useState } from 'react';
import { safeParseGeneratedJson } from '../services/pipelinePrompts';

function formatJson(text) {
    try {
        return JSON.stringify(safeParseGeneratedJson(text), null, 2);
    } catch {
        return text;
    }
}

export default function StreamingText({
    text,
    isStreaming,
    label = '생성 결과',
    mimeType = 'application/json',
}) {
    const [copied, setCopied] = useState(false);
    const [mode, setMode] = useState(mimeType === 'application/json' ? 'formatted' : 'raw');
    const prettyText = useMemo(() => formatJson(text), [text]);
    const displayText = mode === 'formatted' ? prettyText : text;

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(displayText);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch (error) {
            console.error('[StreamingText] 복사 실패:', error);
        }
    }

    return (
        <div className="streaming-text">
            <div className="streaming-text__header">
                <div className="streaming-text__title">
                    <span>📄</span>
                    <span>{label}</span>
                </div>

                <div className="streaming-text__actions">
                    {mimeType === 'application/json' && (
                        <div className="streaming-text__modes">
                            <button
                                type="button"
                                className={`view-tab ${mode === 'formatted' ? 'active' : ''}`}
                                onClick={() => setMode('formatted')}
                            >
                                JSON
                            </button>
                            <button
                                type="button"
                                className={`view-tab ${mode === 'raw' ? 'active' : ''}`}
                                onClick={() => setMode('raw')}
                            >
                                Raw
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        className={`btn btn-ghost btn-sm ${copied ? 'copied' : ''}`}
                        onClick={handleCopy}
                    >
                        {copied ? '✓ 복사됨' : '📋 복사'}
                    </button>
                </div>
            </div>

            <pre className="streaming-text__body">
                {displayText || '응답 대기 중...'}
                {isStreaming && <span className="streaming-text__cursor">▍</span>}
            </pre>
        </div>
    );
}
