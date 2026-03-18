import { useMemo, useState } from 'react';
import { CopyBlockCode } from './CopyBlock';
import StageOptions from './StageOptions';
import StreamingText from './StreamingText';
import { generateText } from '../services/geminiTextService';
import {
    STAGE_UI,
    buildStageUserPrompt,
    getStageDefaultOptions,
    getStageSchema,
    getStageSystemPrompt,
    parseStageResponse,
} from '../services/pipelinePrompts';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_TEXT_MODEL = import.meta.env.VITE_GEMINI_TEXT_MODEL || 'gemini-3-pro-preview';

export default function AiGeneratePanel({
    stage,
    projectTitle,
    inputData,
    currentData,
    onGenerated,
    onSave,
    renderPreview,
    prerequisite,
}) {
    const stageUi = STAGE_UI[stage];
    const [prompt, setPrompt] = useState('');
    const [options, setOptions] = useState(() => getStageDefaultOptions(stage));
    const [streamText, setStreamText] = useState('');
    const [result, setResult] = useState(null);
    const [previewMode, setPreviewMode] = useState('preview');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [meta, setMeta] = useState(null);
    const [bypassRequirement, setBypassRequirement] = useState(false);

    const inputPreview = useMemo(() => (
        inputData ? JSON.stringify(inputData, null, 2) : ''
    ), [inputData]);

    const canGenerate = !isGenerating
        && Boolean(GEMINI_API_KEY)
        && (!prerequisite || prerequisite.satisfied || bypassRequirement)
        && (Boolean(prompt.trim()) || Boolean(inputData));

    async function handleGenerate() {
        if (!canGenerate) return;

        setError('');
        setResult(null);
        setStreamText('');
        setMeta(null);
        setPreviewMode('preview');
        setIsGenerating(true);

        try {
            const response = await generateText({
                apiKey: GEMINI_API_KEY,
                model: GEMINI_TEXT_MODEL,
                systemPrompt: getStageSystemPrompt(stage),
                userPrompt: buildStageUserPrompt(stage, {
                    projectTitle,
                    userPrompt: prompt,
                    options,
                    inputData,
                }),
                responseMimeType: 'application/json',
                responseJsonSchema: getStageSchema(stage),
                onChunk: (chunk) => {
                    setStreamText(chunk.accumulatedText);
                },
            });

            const parsed = parseStageResponse(stage, response.text, {
                projectTitle,
                options,
                inputData,
                previousData: currentData,
                parentData: inputData,
                forceRevisionBump: Boolean(currentData),
            });

            setResult(parsed);
            setMeta({
                durationMs: response.durationMs,
                usageMetadata: response.usageMetadata,
                model: response.model,
            });
            if (onGenerated) {
                onGenerated(parsed);
            }
        } catch (err) {
            setError(err?.message || 'AI 생성에 실패했습니다.');
        } finally {
            setIsGenerating(false);
        }
    }

    async function handleSave() {
        if (!result || !onSave) return;

        setIsSaving(true);
        setError('');

        try {
            await onSave(result, {
                sourcePrompt: prompt,
                options,
                generation: {
                    model: GEMINI_TEXT_MODEL,
                    durationMs: meta?.durationMs || null,
                    usageMetadata: meta?.usageMetadata || null,
                    generatedAt: new Date().toISOString(),
                    source: 'ai',
                },
            });
        } catch (err) {
            setError(err?.message || '생성 결과 저장에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="ai-panel">
            <div className="ai-panel__hero">
                <div>
                    <div className="ai-panel__eyebrow">AI Pipeline</div>
                    <h3 className="ai-panel__title">{stageUi.title}</h3>
                    <p className="ai-panel__desc">{stageUi.description}</p>
                </div>

                <div className="ai-panel__meta-chip">{GEMINI_TEXT_MODEL}</div>
            </div>

            {!GEMINI_API_KEY && (
                <div className="ai-panel__warning">
                    `VITE_GEMINI_API_KEY`가 설정되지 않아 AI 생성 기능을 사용할 수 없습니다.
                </div>
            )}

            {prerequisite && !prerequisite.satisfied && (
                <div className="ai-panel__warning">
                    <div>{prerequisite.message}</div>
                    <label className="ai-panel__checkbox">
                        <input
                            type="checkbox"
                            checked={bypassRequirement}
                            onChange={(event) => setBypassRequirement(event.target.checked)}
                        />
                        <span>강제로 진행 허용</span>
                    </label>
                </div>
            )}

            <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="form-label">프롬프트 입력</label>
                <textarea
                    className="form-textarea ai-panel__textarea"
                    value={prompt}
                    placeholder={stageUi.promptPlaceholder}
                    onChange={(event) => setPrompt(event.target.value)}
                    rows={5}
                />
            </div>

            <StageOptions stage={stage} value={options} onChange={setOptions} />

            {inputData && (
                <details className="ai-panel__context">
                    <summary>이전 단계 컨텍스트 보기</summary>
                    <pre>{inputPreview}</pre>
                </details>
            )}

            <div className="ai-panel__toolbar">
                <div className="ai-panel__toolbar-left">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                            setResult(null);
                            setStreamText('');
                            setMeta(null);
                        }}
                        disabled={isGenerating}
                    >
                        🔄 초기화
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleGenerate}
                        disabled={!canGenerate}
                    >
                        {isGenerating ? '생성 중...' : '✨ AI로 생성'}
                    </button>
                </div>

                {result && (
                    <div className="view-tabs">
                        <button
                            type="button"
                            className={`view-tab ${previewMode === 'preview' ? 'active' : ''}`}
                            onClick={() => setPreviewMode('preview')}
                        >
                            프리뷰
                        </button>
                        <button
                            type="button"
                            className={`view-tab ${previewMode === 'json' ? 'active' : ''}`}
                            onClick={() => setPreviewMode('json')}
                        >
                            JSON
                        </button>
                    </div>
                )}
            </div>

            {error && <div className="ai-panel__error">{error}</div>}

            {(isGenerating || streamText) && !result && (
                <StreamingText
                    text={streamText}
                    isStreaming={isGenerating}
                    label={`${stageUi.label} 생성 결과`}
                />
            )}

            {result && (
                <div className="ai-panel__result">
                    {previewMode === 'preview' && (
                        renderPreview
                            ? renderPreview(result)
                            : <StreamingText text={JSON.stringify(result, null, 2)} isStreaming={false} />
                    )}
                    {previewMode === 'json' && (
                        <CopyBlockCode
                            label={`${stageUi.label} JSON`}
                            content={JSON.stringify(result, null, 2)}
                            language="json"
                            id={`ai-result-${stage}`}
                        />
                    )}
                </div>
            )}

            {meta && (
                <div className="ai-panel__footnote">
                    생성 시간: {(meta.durationMs / 1000).toFixed(1)}초
                    {meta.usageMetadata?.totalTokenCount ? ` · 토큰: ${meta.usageMetadata.totalTokenCount.toLocaleString()}` : ''}
                </div>
            )}

            {result && (
                <div className="ai-panel__save-row">
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? '저장 중...' : '✅ 초안 저장'}
                    </button>
                </div>
            )}
        </div>
    );
}
