import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import AiGeneratePanel from '../components/AiGeneratePanel';
import ApprovalBar from '../components/ApprovalBar';
import { CopyBlockCode } from '../components/CopyBlock';
import { updateFirestoreConti } from '../firebase/projectStore';
import { getStageImpact } from '../services/changeTracker';
import { getStageStatus, isApprovedStatus, stageHasContent, transitionStatus } from '../services/approvalService';
import { normalizeGeneratedStageData } from '../services/pipelinePrompts';

function CopyBtn({ text, label }) {
    const [copied, setCopied] = useState(false);

    function handleCopy() {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }

    return (
        <button
            className={`ct-copy-btn ${copied ? 'ct-copy-btn--ok' : ''}`}
            onClick={handleCopy}
            title={`${label} 복사`}
        >
            {copied ? '✓ 복사됨' : `📋 ${label}`}
        </button>
    );
}

function buildFullPrompt(cut) {
    return cut.sketch_prompt || '';
}

function DesignView({ conti }) {
    if (!conti?.scenes?.length) return null;

    const totalCuts = conti.scenes.reduce((sum, scene) => sum + scene.cuts.length, 0);
    const highPriority = conti.scenes.reduce((sum, scene) => sum + scene.cuts.filter((cut) => cut.keyvisual_priority === 'high').length, 0);
    const sceneColors = ['#d4a574', '#e74c3c', '#5b7bb4', '#c0392b', '#3498db', '#e67e22', '#9b59b6'];
    const priorityColors = { high: '#e74c3c', medium: '#e67e22', low: '#666' };

    return (
        <div className="ct-design">
            <div className="ct-header">
                <div className="ct-header-badge">LINE CONTI</div>
                <h1 className="ct-header-title">줄콘티</h1>
                <p className="ct-header-sub">
                    {conti.scenes.length}개 씬 · {totalCuts}개 컷 · 키비주얼 우선 {highPriority}컷
                </p>
            </div>

            {conti.promptContext && (
                <div className="ct-context-bar">
                    <div className="ct-context-title">🔧 프롬프트 공통 맥락</div>
                    <div className="ct-context-items">
                        {conti.promptContext.era && (
                            <div className="ct-context-item">
                                <span className="ct-context-label">시대</span>
                                <span className="ct-context-value">{conti.promptContext.era}</span>
                            </div>
                        )}
                        {conti.promptContext.culture && (
                            <div className="ct-context-item">
                                <span className="ct-context-label">문화</span>
                                <span className="ct-context-value">{conti.promptContext.culture}</span>
                            </div>
                        )}
                        {conti.promptContext.negatives && (
                            <div className="ct-context-item">
                                <span className="ct-context-label">부정어</span>
                                <span className="ct-context-value">{conti.promptContext.negatives}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="ct-stats">
                <div className="ct-stat">
                    <span className="ct-stat-num">{conti.scenes.length}</span>
                    <span className="ct-stat-label">씬</span>
                </div>
                <div className="ct-stat">
                    <span className="ct-stat-num">{totalCuts}</span>
                    <span className="ct-stat-label">컷</span>
                </div>
                <div className="ct-stat">
                    <span className="ct-stat-num">{highPriority}</span>
                    <span className="ct-stat-label">KV 우선</span>
                </div>
                <div className="ct-stat">
                    <span className="ct-stat-num">{conti.totalDuration || '—'}</span>
                    <span className="ct-stat-label">러닝타임</span>
                </div>
            </div>

            {conti.scenes.map((scene, sceneIndex) => (
                <div key={scene.uid || scene.scene_id} className="ct-scene" style={{ '--scene-accent': sceneColors[sceneIndex] || '#8b5cf6' }}>
                    <div className="ct-scene-header">
                        <div className="ct-scene-id">{scene.scene_id}</div>
                        <div className="ct-scene-meta">
                            <h3 className="ct-scene-heading">{scene.heading}</h3>
                            <span className="ct-scene-tc">
                                {scene.scene_tc_start} — {scene.scene_tc_end} · {scene.cuts.length}컷
                            </span>
                        </div>
                    </div>

                    <div className="ct-cuts">
                        {scene.cuts.map((cut) => {
                            const fullPrompt = buildFullPrompt(cut);

                            return (
                                <div key={cut.uid || cut.cut_id} className={`ct-cut ${cut.keyvisual_priority === 'high' ? 'ct-cut--high' : ''}`}>
                                    <div className="ct-cut-head">
                                        <span className="ct-cut-id">{cut.cut_id}</span>
                                        <span className="ct-cut-tc">{cut.tc_start}–{cut.tc_end}</span>
                                        <span className="ct-cut-dur">{cut.duration_sec}s</span>
                                        <div className="ct-cut-tags-inline">
                                            <span className="ct-tag">{cut.shot}</span>
                                            <span className="ct-tag ct-tag--angle">{cut.angle}</span>
                                            {cut.camera_move && <span className="ct-tag ct-tag--move">🎥 {cut.camera_move}</span>}
                                        </div>
                                        <span className="ct-cut-priority" style={{ color: priorityColors[cut.keyvisual_priority] }}>
                                            {cut.keyvisual_priority === 'high' ? '★ HIGH' : cut.keyvisual_priority === 'medium' ? '◆ MED' : ''}
                                        </span>
                                    </div>

                                    <div className="ct-cut-split">
                                        <div className="ct-cut-story">
                                            <div className="ct-story-visual">
                                                <span className="ct-story-label">📷</span>
                                                <span>{cut.visual}</span>
                                            </div>
                                            {cut.dialogue && (
                                                <div className="ct-story-dialogue">
                                                    <span className="ct-story-label">💬</span>
                                                    <span>{cut.dialogue}</span>
                                                </div>
                                            )}
                                            <div className="ct-story-audio">
                                                {cut.sfx && <span className="ct-audio-tag">🔊 {cut.sfx}</span>}
                                                {cut.bgm && <span className="ct-audio-tag">🎵 {cut.bgm}</span>}
                                                {cut.transition_out && <span className="ct-audio-tag ct-audio-tag--trans">→ {cut.transition_out}</span>}
                                            </div>
                                        </div>

                                        <div className="ct-cut-prompt">
                                            <div className="ct-prompt-header">
                                                <span className="ct-prompt-title">🖼️ Image Prompt</span>
                                                {fullPrompt && <CopyBtn text={fullPrompt} label="복사" />}
                                            </div>
                                            {fullPrompt ? (
                                                <div className="ct-prompt-text">{fullPrompt}</div>
                                            ) : (
                                                <div className="ct-prompt-empty">프롬프트 미작성</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {conti.assumptions?.length > 0 && (
                <div className="ct-assumptions">
                    <h4>📋 전제 및 가정</h4>
                    <ul>
                        {conti.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}
                    </ul>
                </div>
            )}
        </div>
    );
}

function EditView({ conti, setConti, onSave, saving }) {
    function updateContext(field, value) {
        setConti({
            ...conti,
            promptContext: { ...(conti.promptContext || {}), [field]: value },
        });
    }

    function addScene() {
        const newId = `S${conti.scenes.length + 1}`;
        setConti({
            ...conti,
            scenes: [...conti.scenes, {
                uid: '',
                scene_id: newId,
                heading: '',
                scene_tc_start: '',
                scene_tc_end: '',
                cuts: [],
            }],
        });
    }

    function addCut(sceneIndex) {
        const updated = { ...conti, scenes: [...conti.scenes] };
        const scene = { ...updated.scenes[sceneIndex] };
        const newCutId = `${scene.scene_id}-C${scene.cuts.length + 1}`;
        scene.cuts = [...scene.cuts, {
            cut_id: newCutId,
            tc_start: '',
            tc_end: '',
            duration_sec: 0,
            shot: '',
            angle: '',
            camera_move: '',
            visual: '',
            dialogue: '',
            sfx: '',
            bgm: '',
            transition_out: 'CUT TO',
            sketch_prompt: '',
            keyvisual_priority: 'low',
        }];
        updated.scenes[sceneIndex] = scene;
        setConti(updated);
    }

    function updateCut(sceneIndex, cutIndex, field, value) {
        const updated = { ...conti, scenes: [...conti.scenes] };
        const scene = { ...updated.scenes[sceneIndex], cuts: [...updated.scenes[sceneIndex].cuts] };
        scene.cuts[cutIndex] = { ...scene.cuts[cutIndex], [field]: value };
        updated.scenes[sceneIndex] = scene;
        setConti(updated);
    }

    function removeCut(sceneIndex, cutIndex) {
        const updated = { ...conti, scenes: [...conti.scenes] };
        const scene = { ...updated.scenes[sceneIndex] };
        scene.cuts = scene.cuts.filter((_, index) => index !== cutIndex);
        updated.scenes[sceneIndex] = scene;
        setConti(updated);
    }

    const context = conti.promptContext || {};

    return (
        <div>
            <div className="flex-between mb-lg">
                <button className="btn btn-secondary btn-sm" onClick={addScene}>＋ 씬 추가</button>
                <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving}>
                    {saving ? '저장 중...' : '💾 저장'}
                </button>
            </div>

            <div className="card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)', borderLeft: '3px solid var(--accent-secondary)' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-secondary)', marginBottom: 'var(--space-md)' }}>
                    🔧 프롬프트 공통 맥락 (모든 컷에 자동 삽입)
                </h3>
                <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                    <div>
                        <label className="ct-edit-label">시대 맥락</label>
                        <input className="form-input" value={context.era || ''} onChange={(event) => updateContext('era', event.target.value)} />
                    </div>
                    <div>
                        <label className="ct-edit-label">문화 맥락</label>
                        <textarea className="form-textarea" value={context.culture || ''} onChange={(event) => updateContext('culture', event.target.value)} rows={3} />
                    </div>
                    <div>
                        <label className="ct-edit-label">부정어</label>
                        <input className="form-input" value={context.negatives || ''} onChange={(event) => updateContext('negatives', event.target.value)} />
                    </div>
                </div>
            </div>

            {conti.scenes.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🎬</div>
                    <h3>줄콘티를 작성해주세요</h3>
                    <p>시나리오를 씬 → 컷 단위로 분해합니다.</p>
                    <button className="btn btn-primary" onClick={addScene}>첫 씬 추가하기</button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                    {conti.scenes.map((scene, sceneIndex) => (
                        <div key={scene.uid || sceneIndex} className="card" style={{ padding: 'var(--space-lg)' }}>
                            <div className="flex-between mb-md">
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-primary-light)' }}>
                                    {scene.scene_id}: {scene.heading || '(씬 제목 없음)'}
                                </h3>
                                <button className="btn btn-secondary btn-sm" onClick={() => addCut(sceneIndex)}>＋ 컷 추가</button>
                            </div>

                            {scene.cuts.map((cut, cutIndex) => (
                                <div key={cut.uid || cutIndex} className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-sm)', background: 'var(--bg-tertiary)' }}>
                                    <div className="flex-between mb-sm">
                                        <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--accent-secondary)' }}>{cut.cut_id}</span>
                                        <button className="btn btn-ghost btn-sm" onClick={() => removeCut(sceneIndex, cutIndex)}>🗑</button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-xs)' }}>
                                        <input className="form-input" value={cut.shot} onChange={(event) => updateCut(sceneIndex, cutIndex, 'shot', event.target.value)} placeholder="샷" />
                                        <input className="form-input" value={cut.angle} onChange={(event) => updateCut(sceneIndex, cutIndex, 'angle', event.target.value)} placeholder="앵글" />
                                        <input className="form-input" value={cut.camera_move} onChange={(event) => updateCut(sceneIndex, cutIndex, 'camera_move', event.target.value)} placeholder="카메라 무브" />
                                    </div>
                                    <textarea className="form-textarea" value={cut.visual} onChange={(event) => updateCut(sceneIndex, cutIndex, 'visual', event.target.value)} placeholder="비주얼 설명..." rows={2} style={{ marginTop: 'var(--space-xs)' }} />
                                    <textarea className="form-textarea" value={cut.dialogue} onChange={(event) => updateCut(sceneIndex, cutIndex, 'dialogue', event.target.value)} placeholder="대사..." rows={2} style={{ marginTop: 'var(--space-xs)' }} />
                                    <div style={{ marginTop: 'var(--space-sm)', borderTop: '1px dashed var(--border-subtle)', paddingTop: 'var(--space-sm)' }}>
                                        <label className="ct-edit-label" style={{ marginBottom: '4px' }}>🖼️ 이미지 프롬프트</label>
                                        <textarea className="form-textarea" value={cut.sketch_prompt} onChange={(event) => updateCut(sceneIndex, cutIndex, 'sketch_prompt', event.target.value)} rows={3} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xs)', marginTop: 'var(--space-xs)' }}>
                                        <input className="form-input" value={cut.sfx} onChange={(event) => updateCut(sceneIndex, cutIndex, 'sfx', event.target.value)} placeholder="SFX" />
                                        <input className="form-input" value={cut.bgm} onChange={(event) => updateCut(sceneIndex, cutIndex, 'bgm', event.target.value)} placeholder="BGM" />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-xs)', marginTop: 'var(--space-xs)' }}>
                                        <input className="form-input" value={cut.duration_sec} onChange={(event) => updateCut(sceneIndex, cutIndex, 'duration_sec', Number(event.target.value))} placeholder="길이(초)" type="number" />
                                        <input className="form-input" value={cut.transition_out} onChange={(event) => updateCut(sceneIndex, cutIndex, 'transition_out', event.target.value)} placeholder="전환" />
                                        <select className="form-input" value={cut.keyvisual_priority} onChange={(event) => updateCut(sceneIndex, cutIndex, 'keyvisual_priority', event.target.value)}>
                                            <option value="high">★ High</option>
                                            <option value="medium">◆ Medium</option>
                                            <option value="low">· Low</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ContiPage() {
    const { project, reload } = useOutletContext();
    const screenplayData = useMemo(() => project?.screenplay || { scenes: [] }, [project?.screenplay]);
    const normalizedConti = useMemo(() => (
        normalizeGeneratedStageData('conti', project?.conti || { scenes: [], assumptions: [] }, {
            previousData: project?.conti,
            parentData: screenplayData,
            projectTitle: project?.title,
            forceRevisionBump: false,
        })
    ), [project, screenplayData]);
    const [view, setView] = useState(stageHasContent(project, 'conti') ? 'design' : 'ai');
    const [conti, setConti] = useState(normalizedConti);
    const [saving, setSaving] = useState(false);
    const [transitioning, setTransitioning] = useState(false);

    const jsonText = JSON.stringify(conti, null, 2);
    const contiStatus = getStageStatus(project, 'conti');
    const screenplayStatus = getStageStatus(project, 'screenplay');
    const impact = getStageImpact(project, 'conti');
    const canUseScreenplay = isApprovedStatus(screenplayStatus);

    async function handleSave(nextConti, meta = {}) {
        setSaving(true);
        try {
            await updateFirestoreConti(project.id, nextConti, meta);
            await reload();
            setView('design');
        } catch (error) {
            console.error('[ContiPage] 저장 실패:', error?.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleManualSave() {
        const nextConti = normalizeGeneratedStageData('conti', conti, {
            previousData: normalizedConti,
            parentData: screenplayData,
            projectTitle: project.title,
            forceRevisionBump: true,
        });
        await handleSave(nextConti, {
            sourcePrompt: project?.conti?.sourcePrompt || '',
            options: project?.conti?.options || null,
            generation: { source: 'manual' },
        });
    }

    async function handleStatusChange(nextStatus) {
        setTransitioning(true);
        try {
            await transitionStatus(project.id, 'conti', nextStatus);
            await reload();
        } catch (error) {
            console.error('[ContiPage] 상태 전환 실패:', error?.message);
        } finally {
            setTransitioning(false);
        }
    }

    const updatedAt = project?.conti?.updatedAt;

    return (
        <div className="section" style={{ animation: 'fadeIn 300ms ease' }}>
            <div className="flex-between mb-lg" style={{ gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                <div className="section-title">
                    <span className="section-icon">📋</span>
                    줄콘티
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

            <ApprovalBar
                projectId={project.id}
                stage="conti"
                status={contiStatus}
                hasContent={stageHasContent(project, 'conti')}
                onTransition={handleStatusChange}
                transitioning={transitioning}
                impact={impact}
            />

            {view === 'ai' && (
                <AiGeneratePanel
                    stage="conti"
                    projectTitle={project.title}
                    inputData={screenplayData}
                    currentData={normalizedConti}
                    prerequisite={{
                        satisfied: canUseScreenplay,
                        message: '시나리오가 아직 승인되지 않았습니다. 그래도 강제로 줄콘티 생성을 진행할 수 있습니다.',
                    }}
                    onGenerated={(generated) => setConti(generated)}
                    onSave={handleSave}
                    renderPreview={(generated) => <DesignView conti={generated} />}
                />
            )}

            {view === 'design' && (
                conti?.scenes?.length ? (
                    <DesignView conti={conti} />
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">🤖</div>
                        <h3>줄콘티가 아직 없습니다</h3>
                        <p>시나리오를 바탕으로 AI 생성 탭에서 첫 줄콘티를 만들어주세요.</p>
                        <button className="btn btn-primary" onClick={() => setView('ai')}>AI 생성으로 이동</button>
                    </div>
                )
            )}

            {view === 'edit' && <EditView conti={conti} setConti={setConti} onSave={handleManualSave} saving={saving} />}
            {view === 'json' && <CopyBlockCode label="줄콘티 (JSON)" content={jsonText} id="conti-json" />}

            {updatedAt && (
                <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 'var(--space-lg)' }}>
                    마지막 수정: {new Date(updatedAt).toLocaleString('ko-KR')}
                </div>
            )}
        </div>
    );
}
