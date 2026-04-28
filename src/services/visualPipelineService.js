import { GoogleGenAI } from '@google/genai';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { storage } from '../firebase/client';

const DEFAULT_IMAGE_MODEL = import.meta.env.VITE_GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image-preview';
const DEFAULT_IMAGE_SIZE = import.meta.env.VITE_GEMINI_IMAGE_SIZE || '2K';
const DEFAULT_TIMEOUT_MS = Math.max(15000, Number(import.meta.env.VITE_GEMINI_IMAGE_TIMEOUT_MS || 90000));
const DEFAULT_FALLBACK_MODELS = (() => {
    const fromEnv = String(import.meta.env.VITE_GEMINI_IMAGE_FALLBACK_MODELS || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    if (fromEnv.length > 0) return fromEnv;
    if (DEFAULT_IMAGE_MODEL === 'gemini-3-pro-image-preview') {
        return ['gemini-3.1-flash-image-preview', 'gemini-2.5-flash-image'];
    }
    if (DEFAULT_IMAGE_MODEL === 'gemini-3.1-flash-image-preview') {
        return ['gemini-2.5-flash-image'];
    }
    return [];
})();

function normalizeImageSize(value) {
    return value === '1K' ? '1K' : '2K';
}

function buildModelSequence(model = DEFAULT_IMAGE_MODEL, fallbackModels = DEFAULT_FALLBACK_MODELS) {
    return [model, ...fallbackModels]
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .filter((item, index, list) => list.indexOf(item) === index);
}

function getInlineImageData(response) {
    const parts = response?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return '';
    for (const part of parts) {
        if (part?.inlineData?.data) return part.inlineData.data;
    }
    return '';
}

function isRetriableImageError(error) {
    const message = String(error?.message || error || '');
    const status = Number(error?.status || error?.code || error?.cause?.status);
    if (error?.name === 'AbortError') return true;
    if ([408, 429, 500, 502, 503, 504].includes(status)) return true;
    return /429|408|500|502|503|504|timeout|timed out|temporarily unavailable|overloaded|service unavailable|networkerror|failed to fetch/i.test(message);
}

function formatImageError(error, { model, timeoutMs }) {
    if (error?.name === 'AbortError') {
        return new Error(`${Math.round(timeoutMs / 1000)}초 안에 이미지 응답이 없어 요청을 중단했습니다. 잠시 후 다시 시도해주세요.`);
    }
    const message = String(error?.message || error || '이미지 생성 실패').trim();
    const status = String(error?.status || error?.code || error?.cause?.status || '').trim();
    if (status === '503' || /503|service unavailable|overloaded/i.test(message)) {
        return new Error(`Gemini 이미지 모델이 일시적으로 바쁩니다. (${model}) 잠시 후 다시 시도해주세요.`);
    }
    return new Error(message || '이미지 생성 실패');
}

function parseDataUrl(source) {
    const match = String(source || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
        throw new Error('지원되지 않는 이미지 데이터 형식입니다.');
    }
    return {
        mimeType: match[1] || 'image/png',
        data: match[2] || '',
    };
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = (error) => reject(error);
    });
}

async function sourceToInlineImage(source, fallbackMimeType = 'image/png') {
    const url = String(source || '').trim();
    if (!url) throw new Error('이미지 소스가 비어 있습니다.');

    if (url.startsWith('data:image/')) {
        return parseDataUrl(url);
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`이미지 로드 실패 (${response.status})`);
    }
    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);
    const inline = parseDataUrl(dataUrl);
    return {
        data: inline.data,
        mimeType: inline.mimeType || fallbackMimeType,
    };
}

export function getProjectCharacterReferenceImages(characterSheets = []) {
    return (Array.isArray(characterSheets) ? characterSheets : [])
        .filter((character) => character?.sheetImageUrl)
        .map((character) => ({
            url: character.sheetImageUrl,
            mimeType: 'image/png',
            label: character.name || character.nameEn || 'character',
        }));
}

export async function buildInlineImageReferences(images = [], { limit = 6 } = {}) {
    const refs = [];
    for (const image of images.slice(0, limit)) {
        if (!image?.url) continue;
        const inline = await sourceToInlineImage(image.url, image.mimeType || 'image/png');
        refs.push({
            data: inline.data,
            mimeType: inline.mimeType || image.mimeType || 'image/png',
        });
    }
    return refs;
}

export async function generateVisualImage({
    apiKey,
    prompt,
    aspectRatio = '16:9',
    imageSize = DEFAULT_IMAGE_SIZE,
    referenceImages = [],
    model = DEFAULT_IMAGE_MODEL,
    fallbackModels = DEFAULT_FALLBACK_MODELS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    onStatus,
    label = '이미지',
}) {
    if (!apiKey) throw new Error('Gemini API 키가 설정되지 않았습니다.');
    if (!String(prompt || '').trim()) throw new Error('이미지 프롬프트가 비어 있습니다.');

    const ai = new GoogleGenAI({ apiKey });
    const models = buildModelSequence(model, fallbackModels);
    const imageSizeValue = normalizeImageSize(imageSize);
    const inlineReferences = await buildInlineImageReferences(referenceImages);
    const parts = [
        ...inlineReferences.map((inlineData) => ({ inlineData })),
        { text: prompt },
    ];
    let lastError = null;

    for (let index = 0; index < models.length; index += 1) {
        const activeModel = models[index];
        const abortController = new AbortController();
        const timeoutId = window.setTimeout(() => abortController.abort(), timeoutMs);

        try {
            onStatus?.(`${label}: ${activeModel} 생성 중... (${index + 1}/${models.length}, ${imageSizeValue})`);
            const response = await ai.models.generateContent({
                model: activeModel,
                contents: { parts },
                config: {
                    abortSignal: abortController.signal,
                    imageConfig: {
                        imageSize: imageSizeValue,
                        aspectRatio,
                    },
                },
            });

            const data = getInlineImageData(response);
            if (!data) throw new Error('이미지 데이터가 반환되지 않았습니다.');

            return {
                dataUrl: `data:image/png;base64,${data}`,
                modelUsed: activeModel,
                imageSizeUsed: imageSizeValue,
                referenceCount: inlineReferences.length,
            };
        } catch (error) {
            lastError = error;
            if (index < models.length - 1 && isRetriableImageError(error)) {
                onStatus?.(`${label}: ${activeModel} 실패, 다음 모델로 재시도합니다...`);
                continue;
            }
            throw formatImageError(error, { model: activeModel, timeoutMs });
        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    throw formatImageError(lastError, { model: models[models.length - 1] || model, timeoutMs });
}

export async function uploadProjectImage({ projectId, kind, name, dataUrl }) {
    if (!storage) throw new Error('Firebase Storage가 설정되지 않았습니다.');
    if (!String(dataUrl || '').startsWith('data:image/')) {
        throw new Error('업로드할 이미지 데이터가 올바르지 않습니다.');
    }

    const safeKind = String(kind || 'visual').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeName = String(name || 'image').replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
    const storagePath = `makemov_projects/${projectId}/${safeKind}/${safeName}_${Date.now()}.png`;
    const storageRef = ref(storage, storagePath);

    await uploadString(storageRef, dataUrl, 'data_url', {
        contentType: 'image/png',
        cacheControl: 'public,max-age=31536000',
    });

    return {
        downloadUrl: await getDownloadURL(storageRef),
        storagePath,
    };
}

export { DEFAULT_IMAGE_SIZE, normalizeImageSize };
