import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { addFirestoreKeyVisual, addFirestoreKeyVisuals } from '../firebase/projectStore';
import { CopyBlock, CopyBlockCode } from '../components/CopyBlock';
import {
    generateVisualImage,
    getProjectCharacterReferenceImages,
    normalizeImageSize,
    uploadProjectImage,
} from '../services/visualPipelineService';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const DEFAULT_KEYVISUAL_IMAGE_SIZE = normalizeImageSize(import.meta.env.VITE_GEMINI_IMAGE_SIZE || '1K');

function getStoryboardMap(project) {
    const map = {};
    if (project?.storyboard?.frames?.length) {
        project.storyboard.frames.forEach((frame) => {
            if (frame?.cut_id) map[frame.cut_id] = frame;
        });
    }
    if (project?.storyboard?.sketches) {
        Object.assign(map, project.storyboard.sketches);
    }
    return map;
}

function flattenContiCuts(project) {
    const scenes = project?.conti?.scenes || [];
    const storyboardMap = getStoryboardMap(project);
    const existingCutIds = new Set((project?.keyvisuals || []).map((visual) => visual.cutId || visual.cut_id).filter(Boolean));
    const rows = scenes.flatMap((scene) => (
        (scene.cuts || []).map((cut) => ({
            scene,
            cut,
            sketch: storyboardMap[cut.cut_id] || null,
            alreadyGenerated: existingCutIds.has(cut.cut_id),
        }))
    ));

    const highPriority = rows.filter((row) => row.cut.keyvisual_priority === 'high');
    return (highPriority.length > 0 ? highPriority : rows)
        .filter((row) => !row.alreadyGenerated && row.sketch?.imageUrl)
        .sort((a, b) => {
            const score = { high: 0, medium: 1, low: 2 };
            return (score[a.cut.keyvisual_priority] ?? 3) - (score[b.cut.keyvisual_priority] ?? 3);
        });
}

function buildKeyVisualPrompt(project, candidate, characterReferenceCount) {
    const synopsis = project?.synopsis?.structured || {};
    const info = synopsis.info || {};
    const visualTone = synopsis.visualTone || {};
    const promptContext = project?.conti?.promptContext || {};
    const { scene, cut } = candidate;

    return `Create a finished cinematic key visual from the provided storyboard sketch and character sheet references.

Project: ${project?.title || 'Untitled'}
Genre: ${info.genre || 'cinematic'}
Runtime/format: ${info.runtime || ''} / ${info.format || ''}
Tone and mood: ${info.tone || ''}
Audience: ${info.audience || ''}
Visual palette: ${visualTone.palette || ''}
Lighting: ${visualTone.lighting || ''}
Camera language: ${visualTone.camera || ''}
Reference mood: ${visualTone.references || ''}
Era/context: ${promptContext.era || ''}
Culture/context: ${promptContext.culture || ''}

Scene: ${scene.scene_id} — ${scene.heading}
Cut: ${cut.cut_id}
Shot: ${cut.shot || ''}
Angle: ${cut.angle || ''}
Camera move: ${cut.camera_move || ''}
Visual action: ${cut.visual || ''}
Storyboard prompt: ${candidate.sketch?.prompt || cut.sketch_prompt || ''}
Character sheet references attached: ${characterReferenceCount}

Requirements:
- Use the storyboard sketch as composition/blocking reference.
- Use character sheets to preserve identity, face, costume, props, and silhouette.
- Apply the project's genre and visual tone to make a polished production key visual.
- Photorealistic cinematic frame, 16:9, rich lighting, production still quality.
- Single coherent image, no collage, no split screen, no subtitles, no watermark, no readable UI text.
Negative constraints: ${promptContext.negatives || 'no text, no logo, no watermark, no extra limbs, no distorted hands, no duplicate faces'}`;
}

/* ──── 디자인 뷰 ──── */
function DesignView({ visuals }) {
    if (!visuals || visuals.length === 0) return null;

    return (
        <div className="kv-design">
            <div className="kv-header">
                <div className="kv-header-badge">KEY VISUALS</div>
                <h1 className="kv-header-title">키비주얼</h1>
                <p className="kv-header-sub">{visuals.length}개 레퍼런스 · 시각 가이드</p>
            </div>

            <div className="kv-gallery">
                {visuals.map((visual, i) => (
                    <div key={visual.id || i} className="kv-card">
                        <div className="kv-visual-area">
                            {visual.imageUrl ? (
                                <img src={visual.imageUrl} alt={visual.title} />
                            ) : (
                                <div className="kv-placeholder">
                                    <span className="kv-placeholder-icon">🎨</span>
                                    <span className="kv-placeholder-text">이미지 미생성</span>
                                </div>
                            )}
                            {visual.scene && (
                                <span className="kv-scene-badge">Scene {visual.scene}</span>
                            )}
                        </div>
                        <div className="kv-info">
                            <h3 className="kv-title">{visual.title}</h3>
                            <div className="kv-prompt-box">
                                <div className="kv-prompt-label">🔮 이미지 프롬프트</div>
                                <p className="kv-prompt-text">{visual.prompt}</p>
                            </div>
                            <CopyBlock content={visual.prompt} id={`kv-${visual.id || i}`} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function KeyVisualPage() {
    const { project, reload } = useOutletContext();
    const [view, setView] = useState('design');
    const visuals = project?.keyvisuals || [];
    const [showAdd, setShowAdd] = useState(false);
    const [newVisual, setNewVisual] = useState({ title: '', prompt: '', imageUrl: '', scene: '' });
    const [imageSize, setImageSize] = useState(DEFAULT_KEYVISUAL_IMAGE_SIZE);
    const [generatingCutId, setGeneratingCutId] = useState('');
    const [generationStatus, setGenerationStatus] = useState('');
    const [generationError, setGenerationError] = useState('');

    const jsonText = JSON.stringify(visuals, null, 2);
    const candidates = flattenContiCuts(project);
    const candidateBatch = candidates.slice(0, 4);

    async function handleAdd() {
        if (!newVisual.prompt.trim()) return;
        try {
            await addFirestoreKeyVisual(project.id, newVisual);
            await reload();
        } catch (err) {
            console.error('[KeyVisualPage] 추가 실패:', err?.message);
        }
        setNewVisual({ title: '', prompt: '', imageUrl: '', scene: '' });
        setShowAdd(false);
    }

    async function generateKeyVisual(candidate) {
        if (!GEMINI_API_KEY) {
            throw new Error('VITE_GEMINI_API_KEY가 설정되어 있지 않습니다.');
        }

        const characterRefs = getProjectCharacterReferenceImages(project?.characterSheets || []);
        const referenceImages = [
            ...(candidate.sketch?.imageUrl ? [{
                url: candidate.sketch.imageUrl,
                mimeType: 'image/png',
                label: `${candidate.cut.cut_id} sketch`,
            }] : []),
            ...characterRefs,
        ];
        const prompt = buildKeyVisualPrompt(project, candidate, characterRefs.length);

        const { dataUrl, modelUsed, imageSizeUsed, referenceCount } = await generateVisualImage({
            apiKey: GEMINI_API_KEY,
            prompt,
            aspectRatio: '16:9',
            imageSize,
            referenceImages,
            label: candidate.cut.cut_id,
            onStatus: setGenerationStatus,
        });

        setGenerationStatus(`${candidate.cut.cut_id}: Firebase Storage 업로드 중...`);
        const { downloadUrl, storagePath } = await uploadProjectImage({
            projectId: project.id,
            kind: 'keyvisuals',
            name: candidate.cut.cut_id,
            dataUrl,
        });

        return {
            title: `${candidate.scene.scene_id} ${candidate.cut.cut_id} 키비주얼`,
            scene: candidate.scene.scene_id,
            cutId: candidate.cut.cut_id,
            prompt,
            imageUrl: downloadUrl,
            imagePath: storagePath,
            source: 'storyboard-character-tone',
            sourceSketchUrl: candidate.sketch?.imageUrl || '',
            keyvisual_priority: candidate.cut.keyvisual_priority || 'medium',
            model: modelUsed,
            imageSize: imageSizeUsed,
            referenceCount,
            generatedAt: new Date().toISOString(),
        };
    }

    async function handleGenerateCandidate(candidate) {
        setGeneratingCutId(candidate.cut.cut_id);
        setGenerationError('');
        setGenerationStatus(`${candidate.cut.cut_id}: 키비주얼 생성 준비 중...`);
        try {
            const visual = await generateKeyVisual(candidate);
            await addFirestoreKeyVisuals(project.id, [visual]);
            await reload();
            setGenerationStatus(`${candidate.cut.cut_id}: 키비주얼 저장 완료`);
        } catch (err) {
            setGenerationError(err?.message || '키비주얼 생성 실패');
            setGenerationStatus('');
        } finally {
            setGeneratingCutId('');
        }
    }

    async function handleGenerateBatch() {
        if (candidateBatch.length === 0 || generatingCutId) return;
        setGenerationError('');
        const generated = [];
        try {
            for (const candidate of candidateBatch) {
                setGeneratingCutId(candidate.cut.cut_id);
                setGenerationStatus(`${candidate.cut.cut_id}: 추천 키비주얼 생성 중...`);
                generated.push(await generateKeyVisual(candidate));
            }
            await addFirestoreKeyVisuals(project.id, generated);
            await reload();
            setGenerationStatus(`추천 키비주얼 ${generated.length}건 저장 완료`);
        } catch (err) {
            setGenerationError(err?.message || '추천 키비주얼 일괄 생성 실패');
            setGenerationStatus('');
        } finally {
            setGeneratingCutId('');
        }
    }

    return (
        <div className="section" style={{ animation: 'fadeIn 300ms ease' }}>
            <div className="flex-between mb-lg">
                <div className="section-title">
                    <span className="section-icon">🎨</span>
                    키비주얼
                </div>
                <div className="view-tabs">
                    {[
                        { key: 'design', label: '디자인', icon: '🎨' },
                        { key: 'json', label: 'JSON', icon: '{ }' },
                    ].map(t => (
                        <button key={t.key} className={`view-tab ${view === t.key ? 'active' : ''}`} onClick={() => setView(t.key)}>
                            <span>{t.icon}</span> {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <div className="flex-between" style={{ gap: 'var(--space-sm)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div>
                        <div className="form-label" style={{ marginBottom: '4px' }}>스케치 + 캐릭터 시트 기반 키비주얼</div>
                        <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                            스케치 콘티, 캐릭터 시트 이미지, 시놉시스 장르/톤을 참조해 최종 키비주얼을 생성합니다.
                        </div>
                    </div>
                    <div className="flex gap-sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <select
                            className="form-select"
                            value={imageSize}
                            onChange={(event) => setImageSize(normalizeImageSize(event.target.value))}
                            disabled={!!generatingCutId}
                            style={{ width: 'auto' }}
                        >
                            <option value="1K">1K</option>
                            <option value="2K">2K</option>
                        </select>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={handleGenerateBatch}
                            disabled={!GEMINI_API_KEY || candidateBatch.length === 0 || !!generatingCutId}
                        >
                            추천 키비주얼 생성 ({candidateBatch.length})
                        </button>
                    </div>
                </div>

                {!GEMINI_API_KEY && (
                    <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: '8px' }}>
                        `VITE_GEMINI_API_KEY`가 설정되어야 키비주얼 이미지를 생성할 수 있습니다.
                    </div>
                )}

                {candidates.length > 0 ? (
                    <div style={{ display: 'grid', gap: '8px', marginTop: 'var(--space-md)' }}>
                        {candidates.slice(0, 8).map((candidate) => (
                            <div
                                key={candidate.cut.cut_id}
                                className="card"
                                style={{
                                    padding: 'var(--space-sm)',
                                    display: 'grid',
                                    gridTemplateColumns: '92px 1fr auto',
                                    gap: '10px',
                                    alignItems: 'center',
                                    background: 'var(--bg-tertiary)',
                                }}
                            >
                                {candidate.sketch?.imageUrl ? (
                                    <img
                                        src={candidate.sketch.imageUrl}
                                        alt={candidate.cut.cut_id}
                                        style={{ width: '92px', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            width: '92px',
                                            aspectRatio: '16 / 9',
                                            borderRadius: 'var(--radius-sm)',
                                            background: 'var(--bg-elevated)',
                                            display: 'grid',
                                            placeItems: 'center',
                                            color: 'var(--text-muted)',
                                            fontSize: '0.72rem',
                                        }}
                                    >
                                        no sketch
                                    </div>
                                )}
                                <div>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                                        {candidate.scene.scene_id} · {candidate.cut.cut_id}
                                        {candidate.cut.keyvisual_priority === 'high' ? ' · HIGH' : ''}
                                    </div>
                                    <div className="text-muted" style={{ fontSize: '0.76rem', marginTop: '3px' }}>
                                        {candidate.cut.visual || candidate.scene.heading}
                                    </div>
                                </div>
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleGenerateCandidate(candidate)}
                                    disabled={!GEMINI_API_KEY || !!generatingCutId}
                                >
                                    {generatingCutId === candidate.cut.cut_id ? '생성 중...' : '생성'}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: '8px' }}>
                        생성 후보가 없습니다. 줄콘티와 스케치 콘티를 먼저 만들거나 이미 생성된 키비주얼을 확인하세요.
                    </div>
                )}

                {generationStatus && (
                    <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: '8px' }}>{generationStatus}</div>
                )}
                {generationError && (
                    <div style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginTop: '8px' }}>{generationError}</div>
                )}
            </div>

            {view === 'design' && (
                <>
                    <DesignView visuals={visuals} />
                    <div style={{ marginTop: 'var(--space-lg)' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowAdd(!showAdd)}>
                            {showAdd ? '취소' : '＋ 키비주얼 추가'}
                        </button>
                    </div>
                    {showAdd && (
                        <div className="card" style={{ marginTop: 'var(--space-md)', padding: 'var(--space-lg)', borderColor: 'var(--border-active)' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>새 키비주얼</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <input className="form-input" value={newVisual.title} onChange={(e) => setNewVisual({ ...newVisual, title: e.target.value })} placeholder="제목" />
                                <input className="form-input" value={newVisual.scene} onChange={(e) => setNewVisual({ ...newVisual, scene: e.target.value })} placeholder="씬 번호" />
                                <textarea className="form-textarea" value={newVisual.prompt} onChange={(e) => setNewVisual({ ...newVisual, prompt: e.target.value })} placeholder="이미지 생성 프롬프트 *" rows={4} />
                                <input className="form-input" value={newVisual.imageUrl} onChange={(e) => setNewVisual({ ...newVisual, imageUrl: e.target.value })} placeholder="이미지 URL (선택)" />
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button className="btn btn-primary" onClick={handleAdd} disabled={!newVisual.prompt.trim()}>추가</button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {view === 'json' && <CopyBlockCode label="키비주얼 (JSON)" content={jsonText} id="kv-json" />}
        </div>
    );
}
