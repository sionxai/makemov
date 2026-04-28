import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { updateFirestoreStoryboard } from '../firebase/projectStore';
import { CopyBlockCode } from '../components/CopyBlock';
import { generateVisualImage, normalizeImageSize, uploadProjectImage } from '../services/visualPipelineService';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const DEFAULT_SKETCH_IMAGE_SIZE = normalizeImageSize(import.meta.env.VITE_GEMINI_IMAGE_SIZE || '1K');

function buildStoryboardSketchPrompt(project, scene, cut) {
    const synopsis = project?.synopsis?.structured || {};
    const info = synopsis.info || {};
    const visualTone = synopsis.visualTone || {};
    const promptContext = project?.conti?.promptContext || {};

    return `Create a single cinematic storyboard sketch frame for a film previsualization board.

Project: ${project?.title || 'Untitled'}
Genre: ${info.genre || 'cinematic drama'}
Runtime format: ${info.runtime || ''}
Tone and mood: ${info.tone || ''}
Visual palette: ${visualTone.palette || ''}
Lighting: ${visualTone.lighting || ''}
Camera language: ${visualTone.camera || ''}
Era/context: ${promptContext.era || ''}
Culture/context: ${promptContext.culture || ''}

Scene: ${scene.scene_id} — ${scene.heading}
Cut: ${cut.cut_id}
Timecode: ${cut.tc_start || ''} - ${cut.tc_end || ''}
Shot: ${cut.shot || ''}
Angle: ${cut.angle || ''}
Camera move: ${cut.camera_move || ''}
Visual action: ${cut.visual || ''}
Dialogue cue: ${cut.dialogue || ''}
Base image prompt: ${cut.sketch_prompt || ''}

Style requirements:
- 16:9 single frame, not a collage
- grayscale cinematic storyboard sketch, ink and pencil previsualization
- clear subject blocking, readable composition, production storyboard quality
- preserve the camera angle and shot size exactly
- no subtitles, no UI text, no watermark
Negative constraints: ${promptContext.negatives || 'no text, no logo, no watermark, no extra limbs'}`;
}

/* ──── 스케치 이미지 (로딩 실패 시 플레이스홀더 폴백) ──── */
function SketchImage({ sketch, cut }) {
    const [imgError, setImgError] = useState(false);

    if (!sketch?.imageUrl || imgError) {
        return (
            <div className="sb2-sketch-empty">
                <div className="sb2-sketch-cross" />
                <span className="sb2-sketch-label">{cut.cut_id}</span>
                <span className="sb2-sketch-shot">{cut.shot}</span>
            </div>
        );
    }

    return (
        <img
            src={sketch.imageUrl}
            alt={cut.cut_id}
            className="sb2-sketch-img"
            onError={() => setImgError(true)}
        />
    );
}

/* ──── 디자인 뷰: 줄콘티 기반 스토리보드 ──── */
function DesignView({ contiScenes, storyboardMap, onGenerateSketch, sketchLoadingCutId }) {
    if (!contiScenes?.length) {
        return (
            <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>줄콘티 데이터가 없습니다</h3>
                <p>먼저 줄콘티를 작성해야 스토리보드를 생성할 수 있습니다.</p>
            </div>
        );
    }

    const totalCuts = contiScenes.reduce((s, sc) => s + sc.cuts.length, 0);
    const drawnCuts = Object.values(storyboardMap).filter((item) => item?.imageUrl).length;

    return (
        <div className="sb2-design">
            {/* 헤더 */}
            <div className="sb2-header">
                <div className="sb2-header-badge">STORYBOARD</div>
                <h1 className="sb2-header-title">스토리보드</h1>
                <p className="sb2-header-sub">
                    줄콘티 기반 · {contiScenes.length}씬 · {totalCuts}컷 · 스케치 {drawnCuts}/{totalCuts}
                </p>
            </div>

            {/* 씬별 렌더 */}
            {contiScenes.map((scene) => (
                <div key={scene.scene_id} className="sb2-scene">
                    {/* 씬 디바이더 */}
                    <div className="sb2-scene-divider">
                        <span className="sb2-scene-tag">{scene.scene_id}</span>
                        <span className="sb2-scene-heading">{scene.heading}</span>
                        <span className="sb2-scene-tc">{scene.scene_tc_start} — {scene.scene_tc_end}</span>
                    </div>

                    {/* 컷 리스트 */}
                    {scene.cuts.map((cut) => {
                        const sketch = storyboardMap[cut.cut_id];
                        const isHigh = cut.keyvisual_priority === 'high';

                        return (
                            <div key={cut.cut_id} className={`sb2-row ${isHigh ? 'sb2-row--high' : ''}`}>
                                {/* 왼쪽: 컷 정보 */}
                                <div className="sb2-info">
                                    <div className="sb2-info-head">
                                        <span className="sb2-cut-id">{cut.cut_id}</span>
                                        <span className="sb2-cut-tc">{cut.tc_start}–{cut.tc_end}</span>
                                        <span className="sb2-cut-dur">{cut.duration_sec}s</span>
                                    </div>

                                    {/* 샷 태그 */}
                                    <div className="sb2-tags">
                                        <span className="sb2-tag sb2-tag--shot">{cut.shot}</span>
                                        <span className="sb2-tag sb2-tag--angle">{cut.angle}</span>
                                        {cut.camera_move && <span className="sb2-tag sb2-tag--move">🎥 {cut.camera_move}</span>}
                                    </div>

                                    {/* 비주얼 설명 */}
                                    <p className="sb2-visual">{cut.visual}</p>

                                    {/* 대사 */}
                                    {cut.dialogue && (
                                        <div className="sb2-detail">
                                            <span className="sb2-detail-icon">💬</span>
                                            <span className="sb2-detail-text">{cut.dialogue}</span>
                                        </div>
                                    )}

                                    {/* 오디오 */}
                                    <div className="sb2-audio-row">
                                        {cut.sfx && <span className="sb2-audio">🔊 {cut.sfx}</span>}
                                        {cut.bgm && <span className="sb2-audio">🎵 {cut.bgm}</span>}
                                    </div>

                                    {/* 전환 */}
                                    {cut.transition_out && (
                                        <div className="sb2-transition">→ {cut.transition_out}</div>
                                    )}
                                </div>

                                {/* 오른쪽: 16:9 스케치 영역 */}
                                <div className="sb2-sketch-wrap">
                                    <div className="sb2-sketch">
                                        <SketchImage sketch={sketch} cut={cut} />
                                        {onGenerateSketch && (
                                            <button
                                                type="button"
                                                className="btn btn-primary btn-sm"
                                                onClick={() => onGenerateSketch(scene, cut)}
                                                disabled={!!sketchLoadingCutId}
                                                style={{
                                                    position: 'absolute',
                                                    right: '8px',
                                                    bottom: '8px',
                                                    boxShadow: '0 10px 24px rgba(0,0,0,0.25)',
                                                }}
                                            >
                                                {sketchLoadingCutId === cut.cut_id ? '생성 중...' : sketch?.imageUrl ? '재생성' : '스케치 생성'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

/* ──── 편집 뷰 ──── */
function EditView({ contiScenes, storyboardMap, setStoryboardMap, onSave, saving }) {
    if (!contiScenes?.length) {
        return (
            <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>줄콘티 데이터가 없습니다</h3>
                <p>먼저 줄콘티를 작성해야 스토리보드를 편집할 수 있습니다.</p>
            </div>
        );
    }

    function updateSketch(cutId, field, value) {
        setStoryboardMap(prev => ({
            ...prev,
            [cutId]: { ...(prev[cutId] || {}), cut_id: cutId, [field]: value },
        }));
    }

    return (
        <div>
            <div className="flex-between mb-lg">
                <span className="text-muted" style={{ fontSize: '0.82rem' }}>
                    줄콘티 컷별로 스케치 이미지 URL을 지정하세요
                </span>
                <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving}>
                    {saving ? '저장 중...' : '💾 저장'}
                </button>
            </div>

            {contiScenes.map(scene => (
                <div key={scene.scene_id} className="card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-md)' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-primary-light)', marginBottom: 'var(--space-md)' }}>
                        {scene.scene_id}: {scene.heading}
                    </h3>
                    {scene.cuts.map(cut => (
                        <div key={cut.cut_id} style={{
                            display: 'grid',
                            gridTemplateColumns: '80px 1fr 1fr',
                            gap: 'var(--space-xs)',
                            alignItems: 'center',
                            padding: 'var(--space-xs) 0',
                            borderBottom: '1px solid var(--border-subtle)',
                        }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-secondary)' }}>
                                {cut.cut_id}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {cut.visual?.slice(0, 40)}...
                            </span>
                            <input
                                className="form-input"
                                style={{ fontSize: '0.78rem' }}
                                value={storyboardMap[cut.cut_id]?.imageUrl || ''}
                                onChange={e => updateSketch(cut.cut_id, 'imageUrl', e.target.value)}
                                placeholder="이미지 URL (예: /img/jinju/...)"
                            />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

/* ──── 기본 이미지 매핑 생성 ──── */
function buildDefaultSketchMap(contiScenes) {
    const map = {};
    if (!contiScenes?.length) return map;
    contiScenes.forEach(scene => {
        scene.cuts.forEach(cut => {
            map[cut.cut_id] = {
                cut_id: cut.cut_id,
                prompt: cut.sketch_prompt || '',
            };
        });
    });
    return map;
}

/* ──── 메인 페이지 ──── */
export default function StoryboardPage() {
    const { project, reload } = useOutletContext();
    const [view, setView] = useState('design');
    const [saving, setSaving] = useState(false);
    const [sketchLoadingCutId, setSketchLoadingCutId] = useState('');
    const [sketchStatus, setSketchStatus] = useState('');
    const [sketchError, setSketchError] = useState('');
    const [imageSize, setImageSize] = useState(DEFAULT_SKETCH_IMAGE_SIZE);

    // 줄콘티 데이터에서 씬/컷 구조를 읽어온다
    const contiScenes = project?.conti?.scenes || [];

    // 스토리보드 데이터를 { cut_id → { imageUrl, ... } } 맵으로 관리
    const [storyboardMap, setStoryboardMap] = useState(() => {
        const map = {};
        // 기존 frames 배열 호환 (레거시)
        if (project?.storyboard?.frames?.length) {
            project.storyboard.frames.forEach(f => {
                if (f.cut_id) map[f.cut_id] = f;
            });
        }
        // sketches 맵 (새 구조)
        if (project?.storyboard?.sketches) {
            Object.assign(map, project.storyboard.sketches);
        }
        // 저장된 데이터가 없으면 기본 매핑 생성
        if (Object.keys(map).length === 0 && contiScenes.length > 0) {
            Object.assign(map, buildDefaultSketchMap(contiScenes));
        }
        return map;
    });

    const missingSketchCuts = contiScenes.flatMap((scene) => (
        (scene.cuts || [])
            .filter((cut) => !storyboardMap[cut.cut_id]?.imageUrl)
            .map((cut) => ({ scene, cut }))
    ));

    async function persistStoryboardMap(nextMap, { shouldReload = false } = {}) {
        const frames = Object.values(nextMap);
        await updateFirestoreStoryboard(project.id, {
            frames,
            sketches: nextMap,
        });
        if (shouldReload) {
            await reload();
        }
    }

    async function createSketch(scene, cut) {
        if (!GEMINI_API_KEY) {
            throw new Error('VITE_GEMINI_API_KEY가 설정되어 있지 않습니다.');
        }

        const prompt = buildStoryboardSketchPrompt(project, scene, cut);
        const { dataUrl, modelUsed, imageSizeUsed } = await generateVisualImage({
            apiKey: GEMINI_API_KEY,
            prompt,
            aspectRatio: '16:9',
            imageSize,
            label: cut.cut_id,
            onStatus: setSketchStatus,
        });

        setSketchStatus(`${cut.cut_id}: Firebase Storage 업로드 중...`);
        const { downloadUrl, storagePath } = await uploadProjectImage({
            projectId: project.id,
            kind: 'storyboard-sketches',
            name: cut.cut_id,
            dataUrl,
        });

        return {
            ...(storyboardMap[cut.cut_id] || {}),
            cut_id: cut.cut_id,
            scene_id: scene.scene_id,
            imageUrl: downloadUrl,
            imagePath: storagePath,
            prompt,
            sourceSketchPrompt: cut.sketch_prompt || '',
            model: modelUsed,
            imageSize: imageSizeUsed,
            generatedAt: new Date().toISOString(),
        };
    }

    async function handleGenerateSketch(scene, cut) {
        setSketchLoadingCutId(cut.cut_id);
        setSketchError('');
        setSketchStatus(`${cut.cut_id}: 스케치 생성 준비 중...`);
        try {
            const sketch = await createSketch(scene, cut);
            const nextMap = {
                ...storyboardMap,
                [cut.cut_id]: sketch,
            };
            setStoryboardMap(nextMap);
            await persistStoryboardMap(nextMap, { shouldReload: true });
            setSketchStatus(`${cut.cut_id}: 스케치 콘티 저장 완료`);
        } catch (err) {
            setSketchError(err?.message || '스케치 생성 실패');
            setSketchStatus('');
        } finally {
            setSketchLoadingCutId('');
        }
    }

    async function handleGenerateMissingSketches() {
        if (missingSketchCuts.length === 0 || sketchLoadingCutId) return;
        setSketchError('');
        let nextMap = { ...storyboardMap };

        try {
            for (const { scene, cut } of missingSketchCuts) {
                setSketchLoadingCutId(cut.cut_id);
                setSketchStatus(`${cut.cut_id}: 누락 스케치 생성 중...`);
                const sketch = await createSketch(scene, cut);
                nextMap = {
                    ...nextMap,
                    [cut.cut_id]: sketch,
                };
                setStoryboardMap(nextMap);
                await persistStoryboardMap(nextMap);
            }
            await reload();
            setSketchStatus(`누락 스케치 ${missingSketchCuts.length}건 생성 완료`);
        } catch (err) {
            setSketchError(err?.message || '누락 스케치 일괄 생성 실패');
            setSketchStatus('');
        } finally {
            setSketchLoadingCutId('');
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            await persistStoryboardMap(storyboardMap, { shouldReload: true });
        } catch (err) {
            console.error('[StoryboardPage] 저장 실패:', err?.message);
        }
        setSaving(false);
    }

    const jsonText = JSON.stringify({ contiScenes, storyboardMap }, null, 2);
    const updatedAt = project?.storyboard?.updatedAt;

    return (
        <div className="section" style={{ animation: 'fadeIn 300ms ease' }}>
            <div className="flex-between mb-lg">
                <div className="section-title">
                    <span className="section-icon">🎬</span>
                    스토리보드
                </div>
                <div className="view-tabs">
                    {[
                        { key: 'design', label: '디자인', icon: '🎨' },
                        { key: 'edit', label: '편집', icon: '✏️' },
                        { key: 'json', label: 'JSON', icon: '{ }' },
                    ].map(t => (
                        <button key={t.key} className={`view-tab ${view === t.key ? 'active' : ''}`} onClick={() => setView(t.key)}>
                            <span>{t.icon}</span> {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <div className="flex-between" style={{ gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                    <div>
                        <div className="form-label" style={{ marginBottom: '4px' }}>스케치 콘티 생성</div>
                        <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                            줄콘티의 컷별 `sketch_prompt`를 기반으로 16:9 스토리보드 스케치를 생성해 저장합니다.
                        </div>
                    </div>
                    <div className="flex gap-sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <select
                            className="form-select"
                            value={imageSize}
                            onChange={(event) => setImageSize(normalizeImageSize(event.target.value))}
                            disabled={!!sketchLoadingCutId}
                            style={{ width: 'auto' }}
                        >
                            <option value="1K">1K</option>
                            <option value="2K">2K</option>
                        </select>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={handleGenerateMissingSketches}
                            disabled={!GEMINI_API_KEY || missingSketchCuts.length === 0 || !!sketchLoadingCutId}
                        >
                            누락 스케치 일괄 생성 ({missingSketchCuts.length})
                        </button>
                    </div>
                </div>
                {!GEMINI_API_KEY && (
                    <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: '8px' }}>
                        `VITE_GEMINI_API_KEY`가 설정되어야 스케치 이미지를 생성할 수 있습니다.
                    </div>
                )}
                {sketchStatus && (
                    <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: '8px' }}>{sketchStatus}</div>
                )}
                {sketchError && (
                    <div style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginTop: '8px' }}>{sketchError}</div>
                )}
            </div>

            {view === 'design' && (
                <DesignView
                    contiScenes={contiScenes}
                    storyboardMap={storyboardMap}
                    onGenerateSketch={handleGenerateSketch}
                    sketchLoadingCutId={sketchLoadingCutId}
                />
            )}
            {view === 'edit' && <EditView contiScenes={contiScenes} storyboardMap={storyboardMap} setStoryboardMap={setStoryboardMap} onSave={handleSave} saving={saving} />}
            {view === 'json' && <CopyBlockCode label="스토리보드 (JSON)" content={jsonText} id="storyboard-json" />}

            {updatedAt && (
                <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 'var(--space-lg)' }}>
                    마지막 수정: {new Date(updatedAt).toLocaleString('ko-KR')}
                </div>
            )}
        </div>
    );
}
