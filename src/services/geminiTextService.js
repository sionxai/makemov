import { GoogleGenAI } from '@google/genai';

const DEFAULT_TEXT_MODEL = import.meta.env.VITE_GEMINI_TEXT_MODEL || 'gemini-3-pro-preview';

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function isRetriableError(error) {
    const message = String(error?.message || error || '');
    const status = Number(error?.status || error?.code || error?.cause?.status);

    if ([429, 500, 502, 503, 504].includes(status)) {
        return true;
    }

    return /429|rate limit|resource exhausted|temporarily unavailable|timeout|overloaded/i.test(message);
}

function formatGeminiError(error) {
    const message = String(error?.message || error || '알 수 없는 오류');
    if (/api key/i.test(message)) {
        return new Error('Gemini API 키를 확인해주세요.');
    }
    if (/429|rate limit|resource exhausted/i.test(message)) {
        return new Error('Gemini 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
    }
    return new Error(`Gemini 텍스트 생성 실패: ${message}`);
}

function buildRequest({
    model,
    systemPrompt,
    userPrompt,
    responseMimeType,
    responseJsonSchema,
    temperature,
    maxOutputTokens,
    abortSignal,
}) {
    return {
        model: model || DEFAULT_TEXT_MODEL,
        contents: userPrompt,
        config: {
            abortSignal,
            systemInstruction: systemPrompt,
            temperature: temperature ?? 0.7,
            maxOutputTokens: maxOutputTokens ?? 8192,
            responseMimeType: responseMimeType || 'text/plain',
            ...(responseJsonSchema ? { responseJsonSchema } : {}),
        },
    };
}

export async function* generateTextStream({
    apiKey,
    systemPrompt,
    userPrompt,
    responseMimeType = 'text/plain',
    responseJsonSchema,
    model = DEFAULT_TEXT_MODEL,
    temperature = 0.7,
    maxOutputTokens = 8192,
    retries = 2,
    retryDelayMs = 900,
    abortSignal,
    onChunk,
}) {
    if (!apiKey) {
        throw new Error('Gemini API key is required');
    }

    const ai = new GoogleGenAI({ apiKey });
    const startedAt = performance.now();

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            const stream = await ai.models.generateContentStream(
                buildRequest({
                    model,
                    systemPrompt,
                    userPrompt,
                    responseMimeType,
                    responseJsonSchema,
                    temperature,
                    maxOutputTokens,
                    abortSignal,
                }),
            );

            let accumulatedText = '';
            let usageMetadata = null;

            for await (const chunk of stream) {
                const deltaText = chunk?.text || '';
                if (deltaText) {
                    accumulatedText += deltaText;
                }
                if (chunk?.usageMetadata) {
                    usageMetadata = chunk.usageMetadata;
                }

                const payload = {
                    done: false,
                    deltaText,
                    accumulatedText,
                    usageMetadata,
                    model,
                };
                if (onChunk) {
                    onChunk(payload);
                }
                yield payload;
            }

            const donePayload = {
                done: true,
                deltaText: '',
                accumulatedText,
                usageMetadata,
                model,
                durationMs: performance.now() - startedAt,
            };
            if (onChunk) {
                onChunk(donePayload);
            }
            yield donePayload;
            return;
        } catch (error) {
            if (attempt < retries && isRetriableError(error)) {
                await sleep(retryDelayMs * (attempt + 1));
                continue;
            }
            throw formatGeminiError(error);
        }
    }
}

export async function generateText({
    onChunk,
    ...options
}) {
    let finalPayload = {
        accumulatedText: '',
        usageMetadata: null,
        model: options.model || DEFAULT_TEXT_MODEL,
        durationMs: 0,
    };

    for await (const payload of generateTextStream({ ...options, onChunk })) {
        finalPayload = payload;
    }

    return {
        text: finalPayload.accumulatedText,
        usageMetadata: finalPayload.usageMetadata,
        model: finalPayload.model,
        durationMs: finalPayload.durationMs,
    };
}
