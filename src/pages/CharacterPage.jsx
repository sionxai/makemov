import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CopyBlockCode } from '../components/CopyBlock';
import { updateFirestoreProject } from '../firebase/projectStore';
import { storage } from '../firebase/client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { generateTextStream } from '../services/geminiTextService';
import { GoogleGenAI } from '@google/genai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const IMAGE_MODEL = import.meta.env.VITE_GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image-preview';
const IMAGE_SIZE = import.meta.env.VITE_GEMINI_IMAGE_SIZE || '2K';
const IMAGE_TIMEOUT_MS = Math.max(15000, Number(import.meta.env.VITE_GEMINI_IMAGE_TIMEOUT_MS || 90000));
const IMAGE_FALLBACK_MODELS = (() => {
    const fromEnv = String(import.meta.env.VITE_GEMINI_IMAGE_FALLBACK_MODELS || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    if (fromEnv.length > 0) {
        return fromEnv;
    }

    if (IMAGE_MODEL === 'gemini-3-pro-image-preview') {
        return ['gemini-3.1-flash-image-preview', 'gemini-2.5-flash-image'];
    }

    if (IMAGE_MODEL === 'gemini-3.1-flash-image-preview') {
        return ['gemini-2.5-flash-image'];
    }

    return [];
})();

const CHARACTER_SYSTEM_PROMPT = `You are makemov's character design pipeline.

Your task: produce a detailed CHARACTER SHEET for each character in a film/video project.
Return only valid JSON that matches the provided schema.
Write all human-readable prose in Korean.

Rules:
- Each character gets a structured sheet with visual details precise enough for AI image generation
- Include face structure, skin tone, hair, build, signature features, costume details
- Provide an English image generation prompt for each character
- The imagePrompt MUST describe a professional character reference sheet in 16:9 landscape layout with:
  * Full-body front view (center, largest)
  * Full-body back view (right side)
  * Face close-up front view (top left)
  * Face close-up 3/4 side view (top right)
  * Clean white/light gray background
  * Label each view with small text
  * Photorealistic, cinematic quality, film production reference sheet style
- Include emotional range, key props, and color associations
- Use cinematic, photorealistic language in prompts
- set status to draft`;

const CHARACTER_SHEET_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['characters'],
    properties: {
        characters: {
            type: 'array',
            minItems: 1,
            items: {
                type: 'object',
                additionalProperties: false,
                required: [
                    'name', 'nameEn', 'role', 'age', 'gender',
                    'face', 'hair', 'build', 'skinTone', 'signatureFeatures',
                    'costume', 'colorPalette', 'emotionalRange', 'keyProps',
                    'imagePrompt', 'imagePromptNegative',
                ],
                properties: {
                    name: { type: 'string' },
                    nameEn: { type: 'string' },
                    role: { type: 'string' },
                    age: { type: 'string' },
                    gender: { type: 'string' },
                    face: { type: 'string' },
                    hair: { type: 'string' },
                    build: { type: 'string' },
                    skinTone: { type: 'string' },
                    signatureFeatures: { type: 'string' },
                    costume: { type: 'string' },
                    colorPalette: { type: 'string' },
                    emotionalRange: { type: 'string' },
                    keyProps: { type: 'string' },
                    imagePrompt: { type: 'string' },
                    imagePromptNegative: { type: 'string' },
                },
            },
        },
    },
};

function emptyCharacter() {
    return {
        name: '',
        nameEn: '',
        role: '',
        age: '',
        gender: '',
        face: '',
        hair: '',
        build: '',
        skinTone: '',
        signatureFeatures: '',
        costume: '',
        colorPalette: '',
        emotionalRange: '',
        keyProps: '',
        imagePrompt: '',
        imagePromptNegative: '',
    };
}

function formatActionError(error, fallback = '작업에 실패했습니다.') {
    const message = String(error?.message || fallback).trim();
    const code = String(error?.code || error?.status || error?.cause?.status || '').trim();

    if (code && !message.includes(code)) {
        return `${message} (code: ${code})`;
    }

    return message || fallback;
}

function normalizeImageSize(value) {
    return value === '1K' ? '1K' : '2K';
}

function isRetriableImageError(error) {
    const message = String(error?.message || error || '');
    const status = Number(error?.status || error?.code || error?.cause?.status);

    if (error?.name === 'AbortError') return true;
    if ([408, 429, 500, 502, 503, 504].includes(status)) return true;

    return /429|408|500|502|503|504|timeout|timed out|temporarily unavailable|overloaded|service unavailable|networkerror|failed to fetch/i.test(message);
}

function formatImageGenerationError(error, { model, timeoutMs }) {
    if (error?.name === 'AbortError') {
        const seconds = Math.round(timeoutMs / 1000);
        return new Error(`${seconds}초 안에 이미지 응답이 없어 요청을 중단했습니다. 잠시 후 다시 시도하거나 더 빠른 이미지 모델로 전환해주세요.`, {
            cause: { status: 'TIMEOUT', model },
        });
    }

    const status = String(error?.status || error?.code || error?.cause?.status || '').trim();
    const message = String(error?.message || error || '이미지 생성 실패').trim();

    if (status === '503' || /503|service unavailable|overloaded/i.test(message)) {
        return new Error(`Gemini 이미지 모델이 일시적으로 바쁩니다. (${model}) 잠시 후 다시 시도하거나 Flash Image 모델로 전환해주세요.`, {
            cause: { status: status || '503', model },
        });
    }

    return new Error(message || '이미지 생성 실패', {
        cause: { status, model },
    });
}

function buildImageModelSequence() {
    return [IMAGE_MODEL, ...IMAGE_FALLBACK_MODELS]
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .filter((item, index, list) => list.indexOf(item) === index);
}

function extractJson(text) {
    const source = String(text || '');
    const fenced = source.match(/```json\s*([\s\S]*?)```/i) || source.match(/```\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return fenced[1].trim();

    const objectStart = source.indexOf('{');
    const objectEnd = source.lastIndexOf('}');
    if (objectStart !== -1 && objectEnd > objectStart) {
        return source.slice(objectStart, objectEnd + 1);
    }

    const arrayStart = source.indexOf('[');
    const arrayEnd = source.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd > arrayStart) {
        return source.slice(arrayStart, arrayEnd + 1);
    }

    return source;
}

/* ──── 이미지 생성 + Firebase Storage 업로드 ──── */

function buildSheetPrompt(char) {
    const base = char.imagePrompt || '';
    if (base.toLowerCase().includes('character reference sheet') || base.toLowerCase().includes('character sheet')) {
        return base;
    }
    return `Professional character reference sheet, 16:9 landscape layout, clean white background.
Multiple views of the SAME character arranged on a single sheet:
- Center: Full-body front view (largest, dominant)
- Right: Full-body back view showing rear details
- Top-left: Face close-up, front view portrait
- Top-right: Face close-up, 3/4 side view portrait

Character description: ${base}

Additional details:
- Face: ${char.face || 'N/A'}
- Hair: ${char.hair || 'N/A'}
- Build: ${char.build || 'N/A'}
- Skin tone: ${char.skinTone || 'N/A'}
- Costume: ${char.costume || 'N/A'}
- Signature features: ${char.signatureFeatures || 'N/A'}
- Key props: ${char.keyProps || 'N/A'}

Style: Photorealistic, cinematic quality, film production character reference sheet. Ultra-detailed, consistent lighting across all views. NOT illustration, NOT cartoon, NOT anime. Photorealistic only.`;
}

function base64ToBlob(base64DataUrl) {
    const parts = base64DataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const byteString = atob(parts[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
}

async function generateCharacterSheetImage(char, { onStatus, imageSize = IMAGE_SIZE } = {}) {
    if (!API_KEY) throw new Error('API 키가 설정되지 않았습니다');

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const prompt = buildSheetPrompt(char);
    const charName = char?.name || 'unknown';
    const models = buildImageModelSequence();
    const normalizedImageSize = normalizeImageSize(imageSize);
    let lastError = null;

    for (let index = 0; index < models.length; index += 1) {
        const activeModel = models[index];
        const abortController = new AbortController();
        const timeoutId = window.setTimeout(() => abortController.abort(), IMAGE_TIMEOUT_MS);
        const slowNoticeId = window.setTimeout(() => {
            onStatus?.(`${charName}: ${activeModel} 응답이 지연되고 있습니다. 보통 10~90초 정도 걸릴 수 있습니다.`);
        }, 15000);

        try {
            onStatus?.(`${charName}: Gemini 이미지 생성 중... (${activeModel} ${index + 1}/${models.length}, ${normalizedImageSize})`);

            const response = await ai.models.generateContent({
                model: activeModel,
                contents: { parts: [{ text: prompt }] },
                config: {
                    abortSignal: abortController.signal,
                    imageConfig: {
                        imageSize: normalizedImageSize,
                        aspectRatio: '16:9',
                    },
                },
            });

            const parts = response?.candidates?.[0]?.content?.parts;
            if (!Array.isArray(parts)) {
                throw new Error('이미지 생성 실패: 응답 없음');
            }

            for (const part of parts) {
                if (part?.inlineData?.data) {
                    return {
                        base64DataUrl: `data:image/png;base64,${part.inlineData.data}`,
                        modelUsed: activeModel,
                        imageSizeUsed: normalizedImageSize,
                    };
                }
            }

            throw new Error('이미지 데이터가 반환되지 않았습니다');
        } catch (error) {
            lastError = error;

            if (index < models.length - 1 && isRetriableImageError(error)) {
                onStatus?.(`${charName}: ${activeModel} 응답이 불안정해 다음 모델로 재시도합니다...`);
                continue;
            }

            throw formatImageGenerationError(error, {
                model: activeModel,
                timeoutMs: IMAGE_TIMEOUT_MS,
            });
        } finally {
            window.clearTimeout(timeoutId);
            window.clearTimeout(slowNoticeId);
        }
    }

    throw formatImageGenerationError(lastError, {
        model: models[models.length - 1] || IMAGE_MODEL,
        timeoutMs: IMAGE_TIMEOUT_MS,
    });
}

async function uploadImageToStorage(projectId, charName, base64DataUrl) {
    if (!storage) throw new Error('Firebase Storage가 설정되지 않았습니다');

    const safeName = (charName || 'character').replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
    const timestamp = Date.now();
    const storagePath = `makemov_projects/${projectId}/character-sheets/${safeName}_${timestamp}.png`;

    const blob = base64ToBlob(base64DataUrl);
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, blob, { contentType: 'image/png' });
    const downloadUrl = await getDownloadURL(storageRef);

    return { downloadUrl, storagePath };
}

/* ──── 컴포넌트 ──── */

function DetailRow({ icon, label, value }) {
    if (!value) return null;
    return (
        <div className="cs-detail-row">
            <span className="cs-detail-icon">{icon}</span>
            <span className="cs-detail-label">{label}</span>
            <span className="cs-detail-value">{value}</span>
        </div>
    );
}

function CharacterSheetCard({
    char,
    onGenerateImage,
    imageLoading,
    imageGenerationEnabled = true,
    imageGenerationHint = '',
}) {
    const [expanded, setExpanded] = useState(true);
    const [copied, setCopied] = useState(false);

    function copyPrompt() {
        navigator.clipboard.writeText(char.imagePrompt || '').then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }

    const roleColors = {
        주인공: '#6c5ce7',
        조연: '#00cec9',
        적대자: '#ff6b6b',
        안타고니스트: '#ff6b6b',
    };
    const accentColor = Object.entries(roleColors).find(([key]) => (char.role || '').includes(key))?.[1] || '#a29bfe';

    const hasImage = !!char.sheetImageUrl;

    return (
        <div className="cs-card" style={{ '--cs-accent': accentColor }}>
            <div className="cs-card-header" onClick={() => setExpanded(!expanded)}>
                <div className="cs-card-avatar">{char.name?.charAt(0) || '?'}</div>
                <div className="cs-card-identity">
                    <div className="cs-card-name">
                        {char.name || '(이름 없음)'}
                        {char.nameEn && <span className="cs-card-name-en">{char.nameEn}</span>}
                    </div>
                    <div className="cs-card-role">
                        {char.role}{char.age && ` · ${char.age}`}{char.gender && ` · ${char.gender}`}
                    </div>
                </div>
                {hasImage && <span className="cs-card-badge">🖼️</span>}
                <span className="cs-card-toggle">{expanded ? '▼' : '▶'}</span>
            </div>

            {expanded && (
                <div className="cs-card-body">
                    {/* 캐릭터 시트 이미지 영역 */}
                    <div className="cs-image-section">
                        {hasImage ? (
                            <div className="cs-sheet-image-wrap">
                                <img
                                    src={char.sheetImageUrl}
                                    alt={`${char.name} character sheet`}
                                    className="cs-sheet-image"
                                />
                                <div className="cs-sheet-image-actions">
                                    <a
                                        href={char.sheetImageUrl}
                                        download={`${char.nameEn || char.name || 'character'}_sheet.png`}
                                        className="btn btn-sm btn-ghost"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        💾 다운로드
                                    </a>
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => onGenerateImage(char)}
                                        disabled={imageLoading || !imageGenerationEnabled}
                                        title={imageGenerationHint || undefined}
                                    >
                                        {imageLoading ? '생성 중...' : imageGenerationEnabled ? '🔄 재생성' : '승인 후 재생성 가능'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="cs-image-placeholder">
                                <button
                                    className="btn btn-primary"
                                    onClick={() => onGenerateImage(char)}
                                    disabled={imageLoading || !imageGenerationEnabled}
                                    title={imageGenerationHint || undefined}
                                >
                                    {imageLoading ? (
                                        <><span className="cs-spinner" /> 이미지 생성 중...</>
                                    ) : !imageGenerationEnabled ? (
                                        '✅ 승인 후 이미지 생성'
                                    ) : (
                                        '🎨 캐릭터 시트 이미지 생성'
                                    )}
                                </button>
                                <p className="cs-image-placeholder-desc">
                                    {imageGenerationEnabled
                                        ? '16:9 비율 · 전신 정면/후면 + 얼굴 정면/측면'
                                        : imageGenerationHint || '승인 & 저장 후 디자인 탭에서 생성할 수 있습니다.'}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="cs-detail-grid">
                        <DetailRow icon="👤" label="얼굴" value={char.face} />
                        <DetailRow icon="💇" label="헤어" value={char.hair} />
                        <DetailRow icon="🏋️" label="체형" value={char.build} />
                        <DetailRow icon="🎨" label="피부톤" value={char.skinTone} />
                        <DetailRow icon="⭐" label="시그니처" value={char.signatureFeatures} />
                        <DetailRow icon="👔" label="의상" value={char.costume} />
                        <DetailRow icon="🎭" label="감정 범위" value={char.emotionalRange} />
                        <DetailRow icon="🔧" label="핵심 소품" value={char.keyProps} />
                        <DetailRow icon="🌈" label="컬러 팔레트" value={char.colorPalette} />
                    </div>

                    {char.imagePrompt && (
                        <div className="cs-prompt-section">
                            <div className="cs-prompt-header">
                                <span>🖼️ Image Generation Prompt</span>
                                <div className="cs-prompt-actions">
                                    <button
                                        className={`btn btn-sm ${copied ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={copyPrompt}
                                    >
                                        {copied ? '✓ 복사됨' : '📋 복사'}
                                    </button>
                                </div>
                            </div>
                            <div className="cs-prompt-text">{char.imagePrompt}</div>
                            {char.imagePromptNegative && (
                                <div className="cs-prompt-neg">
                                    <strong>Negative:</strong> {char.imagePromptNegative}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function DesignView({
    characters,
    onGenerateImage,
    imageLoadingName,
    imageSize,
    onImageSizeChange,
    imageGenerationEnabled = true,
    imageGenerationHint = '',
}) {
    if (!characters?.length) return null;

    const imageCount = characters.filter((c) => c.sheetImageUrl).length;
    const missingImages = characters.filter((c) => c.imagePrompt && !c.sheetImageUrl);

    return (
        <div className="cs-design">
            <div className="cs-stats-bar">
                <div className="cs-stat">
                    <span className="cs-stat-num">{characters.length}</span>
                    <span className="cs-stat-label">등장인물</span>
                </div>
                <div className="cs-stat">
                    <span className="cs-stat-num">{characters.filter((c) => c.imagePrompt).length}</span>
                    <span className="cs-stat-label">프롬프트 완료</span>
                </div>
                <div className="cs-stat">
                    <span className="cs-stat-num">{imageCount}</span>
                    <span className="cs-stat-label">이미지 완료</span>
                </div>
            </div>

            {imageGenerationEnabled && (
                <div className="cs-batch-actions">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label className="form-label" style={{ margin: 0, fontSize: '0.8rem' }}>생성 해상도</label>
                        <select
                            className="form-select"
                            value={imageSize}
                            onChange={(event) => onImageSizeChange?.(normalizeImageSize(event.target.value))}
                            disabled={!!imageLoadingName}
                            style={{ minWidth: '110px' }}
                        >
                            <option value="1K">1K</option>
                            <option value="2K">2K</option>
                        </select>
                    </div>
                    {missingImages.length > 0 && (
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => missingImages.forEach((c) => onGenerateImage(c))}
                            disabled={!!imageLoadingName}
                        >
                            🎨 누락 이미지 일괄 생성 ({missingImages.length}건)
                        </button>
                    )}
                </div>
            )}

            <div className="cs-card-list">
                {characters.map((char, index) => (
                    <CharacterSheetCard
                        key={`${char.name || 'character'}-${index}`}
                        char={char}
                        onGenerateImage={onGenerateImage}
                        imageLoading={imageLoadingName === char.name}
                        imageGenerationEnabled={imageGenerationEnabled}
                        imageGenerationHint={imageGenerationHint}
                    />
                ))}
            </div>
        </div>
    );
}

function EditView({ characters, setCharacters, onSave, saving }) {
    function addCharacter() {
        setCharacters([...characters, emptyCharacter()]);
    }

    function updateChar(index, field, value) {
        const updated = [...characters];
        updated[index] = { ...updated[index], [field]: value };
        setCharacters(updated);
    }

    function removeChar(index) {
        setCharacters(characters.filter((_, currentIndex) => currentIndex !== index));
    }

    function moveChar(index, direction) {
        if ((direction === -1 && index === 0) || (direction === 1 && index === characters.length - 1)) {
            return;
        }
        const updated = [...characters];
        const temp = updated[index];
        updated[index] = updated[index + direction];
        updated[index + direction] = temp;
        setCharacters(updated);
    }

    const fields = [
        { key: 'name', label: '이름', type: 'input', placeholder: '예: 김시민' },
        { key: 'nameEn', label: '영문 이름', type: 'input', placeholder: '예: Kim Si-min' },
        { key: 'role', label: '역할', type: 'input', placeholder: '예: 주인공 / 진주 목사' },
        { key: 'age', label: '나이', type: 'input', placeholder: '예: 40대 중반' },
        { key: 'gender', label: '성별', type: 'input', placeholder: '예: 남성' },
        { key: 'face', label: '얼굴 특징', type: 'textarea', placeholder: '예: 각진 턱선, 깊은 눈매, 전장의 풍파가 새겨진 이마 주름...' },
        { key: 'hair', label: '헤어스타일', type: 'input', placeholder: '예: 상투, 약간의 백발이 섞인 흑발' },
        { key: 'build', label: '체형', type: 'input', placeholder: '예: 장신, 마른 근육질' },
        { key: 'skinTone', label: '피부톤', type: 'input', placeholder: '예: 햇볕에 그을린 올리브 톤' },
        { key: 'signatureFeatures', label: '시그니처 특징', type: 'textarea', placeholder: '예: 왼쪽 눈썹 위 칼자국, 전투 때 좌측 어깨를 약간 올리는 버릇' },
        { key: 'costume', label: '의상', type: 'textarea', placeholder: '예: 전갑(두정갑) 위에 남색 전포, 투구 양 옆 날개장식...' },
        { key: 'colorPalette', label: '컬러 팔레트', type: 'input', placeholder: '예: 남색, 검정, 철회색, 붉은 안감' },
        { key: 'emotionalRange', label: '감정 범위', type: 'input', placeholder: '예: 침착 → 비장 → 결의' },
        { key: 'keyProps', label: '핵심 소품', type: 'input', placeholder: '예: 장검, 활, 전통 병부 인장' },
        { key: 'imagePrompt', label: '이미지 프롬프트 (영문)', type: 'textarea', placeholder: 'AI 이미지 생성용 영문 프롬프트...' },
        { key: 'imagePromptNegative', label: '네거티브 프롬프트', type: 'input', placeholder: '예: NOT illustration, NOT anime...' },
    ];

    return (
        <div>
            <div className="flex-between mb-lg">
                <button className="btn btn-secondary btn-sm" onClick={addCharacter}>＋ 인물 추가</button>
                {characters.length > 0 && (
                    <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving}>
                        {saving ? '저장 중...' : '💾 저장'}
                    </button>
                )}
            </div>

            {characters.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">👤</div>
                    <h3>캐릭터를 추가해주세요</h3>
                    <p>등장인물의 시각적 특성을 정의합니다</p>
                    <button className="btn btn-primary" onClick={addCharacter}>첫 인물 추가하기</button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                    {characters.map((char, index) => (
                        <div key={`${char.name || 'character'}-${index}`} className="card" style={{ padding: 'var(--space-lg)' }}>
                            <div className="flex-between mb-md">
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-primary-light)' }}>
                                    {char.name || `인물 ${index + 1}`}
                                </h3>
                                <div className="flex gap-sm">
                                    <button className="btn btn-ghost btn-sm" onClick={() => moveChar(index, -1)} disabled={index === 0}>↑</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => moveChar(index, 1)} disabled={index === characters.length - 1}>↓</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => removeChar(index)}>🗑</button>
                                </div>
                            </div>
                            {char.sheetImageUrl && (
                                <div className="cs-sheet-image-wrap" style={{ marginBottom: 'var(--space-md)' }}>
                                    <img src={char.sheetImageUrl} alt={char.name} className="cs-sheet-image" />
                                </div>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                {fields.map((field) => (
                                    <div
                                        key={field.key}
                                        style={{ gridColumn: field.type === 'textarea' ? '1 / -1' : undefined }}
                                    >
                                        <label className="form-label" style={{ marginBottom: '4px' }}>{field.label}</label>
                                        {field.type === 'textarea' ? (
                                            <textarea
                                                className="form-textarea"
                                                value={char[field.key] || ''}
                                                onChange={(event) => updateChar(index, field.key, event.target.value)}
                                                placeholder={field.placeholder}
                                                rows={2}
                                                style={{ minHeight: '60px' }}
                                            />
                                        ) : (
                                            <input
                                                className="form-input"
                                                value={char[field.key] || ''}
                                                onChange={(event) => updateChar(index, field.key, event.target.value)}
                                                placeholder={field.placeholder}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function AiGenerateView({ project, onSave, onApproved, saving, imageSize }) {
    const [prompt, setPrompt] = useState('');
    const [streamText, setStreamText] = useState('');
    const [error, setError] = useState('');
    const [generatedData, setGeneratedData] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [durationMs, setDurationMs] = useState(0);

    const synopsisChars = project?.synopsis?.structured?.characters || [];
    const hasSynopsis = synopsisChars.length > 0;
    const defaultPrompt = '시놉시스 인물 정보를 바탕으로 실사형 캐릭터 시트를 만들어줘. 시대/톤/의상 디테일을 촬영용 기준으로 구체화해줘.';

    async function handleGenerate() {
        if (generating) return;

        setGenerating(true);
        setStreamText('');
        setError('');
        setGeneratedData(null);
        setDurationMs(0);

        const synopsisContext = project?.synopsis?.structured
            ? JSON.stringify(project.synopsis.structured, null, 2)
            : '시놉시스 데이터 없음';

        const userPrompt = `프로젝트 제목: ${project?.title || '제목 미정'}

시놉시스 데이터:
${synopsisContext}

사용자 지시:
${prompt.trim() || defaultPrompt}

작업:
- 각 등장인물에 대해 상세 캐릭터 시트를 작성한다.
- 얼굴, 헤어, 체형, 피부톤, 시그니처 특징, 의상, 컬러 팔레트, 감정 범위, 핵심 소품을 포함한다.
- imagePrompt는 영문으로, 16:9 landscape character reference sheet 형태로 작성한다.
  * Center: Full-body front view (largest)
  * Right: Full-body back view
  * Top-left: Face close-up front
  * Top-right: Face close-up 3/4 side view
  * Clean white background
  * Photorealistic, cinematic
- imagePromptNegative에 부정어를 포함한다.
- 응답은 반드시 JSON만 반환한다.`;

        let finalText = '';

        try {
            for await (const chunk of generateTextStream({
                apiKey: API_KEY,
                systemPrompt: CHARACTER_SYSTEM_PROMPT,
                userPrompt,
                responseMimeType: 'application/json',
                responseJsonSchema: CHARACTER_SHEET_SCHEMA,
                maxOutputTokens: 16384,
                temperature: 0.7,
            })) {
                setStreamText(chunk.accumulatedText);
                finalText = chunk.accumulatedText;
                if (chunk.done) {
                    setDurationMs(chunk.durationMs || 0);
                }
            }
        } catch (err) {
            setError(err.message || 'AI 생성 실패');
            setGenerating(false);
            return;
        }

        setGenerating(false);

        try {
            const json = extractJson(finalText);
            const parsed = JSON.parse(json);
            setGeneratedData(parsed.characters || parsed);
        } catch (parseErr) {
            setError(`JSON 파싱 실패: ${parseErr.message}`);
        }
    }

    async function handleApplyAndSave() {
        if (!generatedData) return;
        try {
            await onSave(generatedData);
            onApproved?.(generatedData);
        } catch (err) {
            setError(formatActionError(err, '저장 실패'));
        }
    }

    return (
        <div className="cs-ai-panel">
            <div className="cs-ai-header">
                <h3 className="cs-ai-title">🤖 AI 캐릭터 시트 생성</h3>
                <p className="cs-ai-desc">
                    시놉시스의 등장인물 정보를 기반으로 상세 캐릭터 시트를 자동 생성합니다.
                </p>
            </div>

            {hasSynopsis && (
                <div className="cs-synopsis-chars">
                    <div className="cs-synopsis-chars-title">📋 시놉시스 등장인물 ({synopsisChars.length}명)</div>
                    <div className="cs-synopsis-chars-list">
                        {synopsisChars.map((character, index) => (
                            <div key={index} className="cs-synopsis-char-chip">
                                <span className="cs-chip-name">{character.name}</span>
                                <span className="cs-chip-role">{character.role}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!hasSynopsis && (
                <div className="cs-error" style={{ marginBottom: 'var(--space-md)' }}>
                    시놉시스 생성 후 캐릭터 시트를 만들 수 있습니다.
                </div>
            )}

            <div className="cs-ai-prompt-area">
                <label className="form-label">프롬프트 (선택)</label>
                <textarea
                    className="form-textarea"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder={defaultPrompt}
                    rows={4}
                    disabled={generating}
                />
            </div>

            <div className="cs-ai-actions">
                <button className="btn btn-primary" onClick={handleGenerate} disabled={generating || !hasSynopsis || !API_KEY}>
                    {generating ? (
                        <><span className="cs-spinner" /> 생성 중...</>
                    ) : (
                        '✨ AI로 생성'
                    )}
                </button>
                {generatedData && !generating && (
                    <>
                        <button className="btn btn-secondary" onClick={handleGenerate}>🔄 재생성</button>
                        <button className="btn btn-primary" onClick={handleApplyAndSave} disabled={saving}>
                            {saving ? (
                                <><span className="cs-spinner" /> 저장 중...</>
                            ) : (
                                '✅ 승인 & 저장'
                            )}
                        </button>
                    </>
                )}
            </div>

            {error && <div className="cs-error">⚠️ {error}</div>}

            {(generating || streamText) && !generatedData && (
                <div className="cs-stream-box">
                    <div className="cs-stream-header">
                        {generating && <span className="cs-cursor">▍</span>}
                        <span>AI 응답</span>
                    </div>
                    <pre className="cs-stream-text">{streamText || '생성 대기 중...'}</pre>
                </div>
            )}

            {generatedData && !generating && (
                <div className="cs-preview">
                    <div className="cs-preview-header">
                        <span>✅ 생성 완료 — 승인 후 디자인 뷰에서 이미지를 생성할 수 있습니다</span>
                        {durationMs > 0 && (
                            <span className="cs-preview-meta">⏱ {(durationMs / 1000).toFixed(1)}초</span>
                        )}
                    </div>
                    <DesignView
                        characters={generatedData}
                        onGenerateImage={() => {}}
                        imageLoadingName={null}
                        imageSize={imageSize}
                        onImageSizeChange={() => {}}
                        imageGenerationEnabled={false}
                        imageGenerationHint="이 화면은 미리보기입니다. 승인 & 저장 후 디자인 탭에서 실제 이미지를 생성할 수 있습니다."
                    />
                </div>
            )}
        </div>
    );
}

/* ──── 메인 페이지 ──── */

export default function CharacterPage() {
    const { project, reload } = useOutletContext();
    const [view, setView] = useState(() => {
        const chars = project?.characterSheets || [];
        return chars.length === 0 ? 'ai' : 'design';
    });
    const [characters, setCharacters] = useState(project?.characterSheets || []);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveStatus, setSaveStatus] = useState('');
    const [imageLoadingName, setImageLoadingName] = useState(null);
    const [imageSize, setImageSize] = useState(() => normalizeImageSize(IMAGE_SIZE));
    const [imageStatus, setImageStatus] = useState('');
    const [imageError, setImageError] = useState('');

    const jsonText = useMemo(() => JSON.stringify(characters, null, 2), [characters]);

    async function handleSave(data) {
        setSaving(true);
        setSaveError('');
        setSaveStatus(data ? '캐릭터 시트를 저장하는 중...' : '변경사항을 저장하는 중...');
        try {
            const charsToSave = data || characters;
            await updateFirestoreProject(project.id, {
                characterSheets: charsToSave,
                characterSheetsUpdatedAt: new Date().toISOString(),
            });
            setCharacters(charsToSave);
            await reload();
            setSaveStatus('캐릭터 시트를 저장했습니다. 디자인 탭에서 이미지를 생성할 수 있습니다.');
        } catch (err) {
            const detail = formatActionError(err, '저장 실패');
            console.error('[CharacterPage] 저장 실패:', detail);
            setSaveError(detail);
            setSaveStatus('');
            throw new Error(detail);
        } finally {
            setSaving(false);
        }
    }

    async function handleGenerateImage(char) {
        const charName = char.name || 'unknown';
        setImageLoadingName(charName);
        setSaveError('');
        setImageError('');
        setImageStatus(`${charName}: Gemini 이미지 생성 요청 중... (${imageSize})`);

        try {
            // 1) Gemini로 이미지 생성 (base64)
            const { base64DataUrl, modelUsed, imageSizeUsed } = await generateCharacterSheetImage(char, {
                onStatus: setImageStatus,
                imageSize,
            });

            // 2) Firebase Storage에 업로드
            setImageStatus(`${charName}: Firebase Storage 업로드 중... (생성 모델: ${modelUsed}, ${imageSizeUsed})`);
            const { downloadUrl, storagePath } = await uploadImageToStorage(project.id, charName, base64DataUrl);

            // 3) 캐릭터 데이터에 URL 추가
            const updatedChars = characters.map((c) => {
                if (c.name === charName) {
                    return {
                        ...c,
                        sheetImageUrl: downloadUrl,
                        sheetImagePath: storagePath,
                        sheetImageGeneratedAt: new Date().toISOString(),
                    };
                }
                return c;
            });

            // 4) Firestore에 저장 (영구 저장)
            setImageStatus(`${charName}: 프로젝트에 저장 중...`);
            await updateFirestoreProject(project.id, {
                characterSheets: updatedChars,
                characterSheetsUpdatedAt: new Date().toISOString(),
            });

            setCharacters(updatedChars);
            setImageStatus(`${charName}: 이미지 생성이 완료되었습니다. (모델: ${modelUsed}, ${imageSizeUsed})`);
            console.log(`[CharacterPage] ✅ ${charName} 이미지 생성 & 저장 완료`);
        } catch (err) {
            const detail = formatActionError(err, '이미지 생성 실패');
            console.error('[CharacterPage] 이미지 생성 실패:', detail);
            setImageError(`${charName}: ${detail}`);
            setImageStatus('');
        } finally {
            setImageLoadingName(null);
        }
    }

    const updatedAt = project?.characterSheetsUpdatedAt;

    return (
        <div className="section" style={{ animation: 'fadeIn 300ms ease' }}>
            <div className="flex-between mb-lg">
                <div className="section-title">
                    <span className="section-icon">👤</span>
                    캐릭터 설정
                </div>
                <div className="view-tabs">
                    {[
                        { key: 'design', label: '디자인', icon: '🎨' },
                        { key: 'edit', label: '편집', icon: '✏️' },
                        { key: 'ai', label: 'AI 생성', icon: '🤖' },
                        { key: 'json', label: 'JSON', icon: '{ }' },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            className={`view-tab ${view === tab.key ? 'active' : ''}`}
                            onClick={() => setView(tab.key)}
                        >
                            <span>{tab.icon}</span> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {imageError && (
                <div className="cs-error" style={{ marginBottom: 'var(--space-md)' }}>
                    ⚠️ 이미지 생성 실패: {imageError}
                </div>
            )}

            {saveError && (
                <div className="cs-error" style={{ marginBottom: 'var(--space-md)' }}>
                    ⚠️ 저장 실패: {saveError}
                </div>
            )}

            {(saving || imageLoadingName || imageStatus || saveStatus) && (
                <div className={`cs-note ${imageLoadingName || saving ? 'cs-note--progress' : 'cs-note--success'}`} style={{ marginBottom: 'var(--space-md)' }}>
                    <div className="cs-note-title">
                        {imageLoadingName || saving ? <span className="cs-cursor">▍</span> : null}
                        <span>{imageLoadingName ? '이미지 생성 진행 상태' : '저장 상태'}</span>
                    </div>
                    <div className="cs-note-body">{imageStatus || saveStatus}</div>
                </div>
            )}

            {view === 'design' && (
                characters.length > 0 ? (
                    <DesignView
                        characters={characters}
                        onGenerateImage={handleGenerateImage}
                        imageLoadingName={imageLoadingName}
                        imageSize={imageSize}
                        onImageSizeChange={setImageSize}
                    />
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">👤</div>
                        <h3>캐릭터 시트가 없습니다</h3>
                        <p>AI로 시놉시스 인물을 기반으로 자동 생성하거나, 직접 편집할 수 있어요</p>
                        <button className="btn btn-primary" onClick={() => setView('ai')}>
                            🤖 AI로 생성하기
                        </button>
                    </div>
                )
            )}

            {view === 'edit' && (
                <EditView
                    characters={characters}
                    setCharacters={setCharacters}
                    onSave={() => handleSave()}
                    saving={saving}
                />
            )}

            {view === 'ai' && (
                <AiGenerateView
                    project={project}
                    onSave={handleSave}
                    onApproved={() => setView('design')}
                    saving={saving}
                    imageSize={imageSize}
                />
            )}

            {view === 'json' && (
                <CopyBlockCode label="캐릭터 시트 (JSON)" content={jsonText} id="character-json" />
            )}

            {updatedAt && (
                <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 'var(--space-lg)' }}>
                    마지막 수정: {new Date(updatedAt).toLocaleString('ko-KR')}
                </div>
            )}
        </div>
    );
}
