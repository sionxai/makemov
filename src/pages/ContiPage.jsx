import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { updateConti } from '../db';
import { CopyBlockCode } from '../components/CopyBlock';

/* ──── 프롬프트 복사 버튼 ──── */
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

/* ──── 프롬프트 빌더: sketch_prompt 자체가 실사 완성형 (cinematic_prompt/SKILL.md 준용) ──── */
function buildFullPrompt(cut) {
    return cut.sketch_prompt || '';
}

/* ──── 디자인 뷰: 2분할 (스토리 | 프롬프트) ──── */
function DesignView({ conti }) {
    if (!conti?.scenes?.length) return null;

    const totalCuts = conti.scenes.reduce((sum, s) => sum + s.cuts.length, 0);
    const highPriority = conti.scenes.reduce(
        (sum, s) => sum + s.cuts.filter(c => c.keyvisual_priority === 'high').length, 0
    );

    const sceneColors = ['#d4a574', '#e74c3c', '#5b7bb4', '#c0392b', '#3498db', '#e67e22', '#9b59b6'];
    const priorityColors = { high: '#e74c3c', medium: '#e67e22', low: '#666' };

    return (
        <div className="ct-design">
            {/* 헤더 */}
            <div className="ct-header">
                <div className="ct-header-badge">LINE CONTI</div>
                <h1 className="ct-header-title">줄콘티</h1>
                <p className="ct-header-sub">
                    {conti.scenes.length}개 씬 · {totalCuts}개 컷 · 키비주얼 우선 {highPriority}컷
                </p>
            </div>

            {/* 공통 맥락 설정 표시 */}
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

            {/* 통계 바 */}
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

            {/* 씬별 컷 리스트 */}
            {conti.scenes.map((scene, si) => (
                <div key={scene.scene_id} className="ct-scene" style={{ '--scene-accent': sceneColors[si] || '#8b5cf6' }}>
                    {/* 씬 헤더 */}
                    <div className="ct-scene-header">
                        <div className="ct-scene-id">{scene.scene_id}</div>
                        <div className="ct-scene-meta">
                            <h3 className="ct-scene-heading">{scene.heading}</h3>
                            <span className="ct-scene-tc">
                                {scene.scene_tc_start} — {scene.scene_tc_end} · {scene.cuts.length}컷
                            </span>
                        </div>
                    </div>

                    {/* 컷 2-column 레이아웃 */}
                    <div className="ct-cuts">
                        {scene.cuts.map((cut) => {
                            const fullPrompt = buildFullPrompt(cut, scene, conti);

                            return (
                                <div
                                    key={cut.cut_id}
                                    className={`ct-cut ${cut.keyvisual_priority === 'high' ? 'ct-cut--high' : ''}`}
                                >
                                    {/* 컷 헤더 라인 */}
                                    <div className="ct-cut-head">
                                        <span className="ct-cut-id">{cut.cut_id}</span>
                                        <span className="ct-cut-tc">{cut.tc_start}–{cut.tc_end}</span>
                                        <span className="ct-cut-dur">{cut.duration_sec}s</span>
                                        <div className="ct-cut-tags-inline">
                                            <span className="ct-tag">{cut.shot}</span>
                                            <span className="ct-tag ct-tag--angle">{cut.angle}</span>
                                            {cut.camera_move && <span className="ct-tag ct-tag--move">🎥 {cut.camera_move}</span>}
                                        </div>
                                        <span
                                            className="ct-cut-priority"
                                            style={{ color: priorityColors[cut.keyvisual_priority] }}
                                        >
                                            {cut.keyvisual_priority === 'high' ? '★ HIGH' : cut.keyvisual_priority === 'medium' ? '◆ MED' : ''}
                                        </span>
                                    </div>

                                    {/* 2분할 본문: 왼쪽 스토리 | 오른쪽 프롬프트 */}
                                    <div className="ct-cut-split">
                                        {/* 왼쪽: 콘티 스토리 2줄 */}
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
                                            {/* 오디오 메모 (컴팩트) */}
                                            <div className="ct-story-audio">
                                                {cut.sfx && <span className="ct-audio-tag">🔊 {cut.sfx}</span>}
                                                {cut.bgm && <span className="ct-audio-tag">🎵 {cut.bgm}</span>}
                                                {cut.transition_out && <span className="ct-audio-tag ct-audio-tag--trans">→ {cut.transition_out}</span>}
                                            </div>
                                        </div>

                                        {/* 오른쪽: 이미지 프롬프트 */}
                                        <div className="ct-cut-prompt">
                                            <div className="ct-prompt-header">
                                                <span className="ct-prompt-title">🖼️ Image Prompt</span>
                                                {fullPrompt && (
                                                    <CopyBtn text={fullPrompt} label="복사" />
                                                )}
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

            {/* 가정/전제 */}
            {conti.assumptions?.length > 0 && (
                <div className="ct-assumptions">
                    <h4>📋 전제 및 가정</h4>
                    <ul>
                        {conti.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                </div>
            )}
        </div>
    );
}

/* ──── 편집 뷰 ──── */
function EditView({ conti, setConti, onSave, saving }) {
    // 공통 맥락 편집
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
                scene_id: newId,
                heading: '',
                scene_tc_start: '',
                scene_tc_end: '',
                cuts: [],
            }],
        });
    }

    function addCut(si) {
        const updated = { ...conti, scenes: [...conti.scenes] };
        const scene = { ...updated.scenes[si] };
        const newCutId = `${scene.scene_id}-C${scene.cuts.length + 1}`;
        scene.cuts = [...scene.cuts, {
            cut_id: newCutId,
            tc_start: '', tc_end: '', duration_sec: 0,
            shot: '', angle: '', camera_move: '',
            visual: '', dialogue: '', sfx: '', bgm: '',
            transition_out: 'CUT TO',
            sketch_prompt: '',
            keyvisual_priority: 'low',
        }];
        updated.scenes[si] = scene;
        setConti(updated);
    }

    function updateCut(si, ci, field, value) {
        const updated = { ...conti, scenes: [...conti.scenes] };
        const scene = { ...updated.scenes[si], cuts: [...updated.scenes[si].cuts] };
        scene.cuts[ci] = { ...scene.cuts[ci], [field]: value };
        updated.scenes[si] = scene;
        setConti(updated);
    }

    function removeCut(si, ci) {
        const updated = { ...conti, scenes: [...conti.scenes] };
        const scene = { ...updated.scenes[si] };
        scene.cuts = scene.cuts.filter((_, i) => i !== ci);
        updated.scenes[si] = scene;
        setConti(updated);
    }

    const ctx = conti.promptContext || {};

    return (
        <div>
            <div className="flex-between mb-lg">
                <button className="btn btn-secondary btn-sm" onClick={addScene}>＋ 씬 추가</button>
                <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving}>
                    {saving ? '저장 중...' : '💾 저장'}
                </button>
            </div>

            {/* 프롬프트 공통 맥락 설정 */}
            <div className="card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)', borderLeft: '3px solid var(--accent-secondary)' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-secondary)', marginBottom: 'var(--space-md)' }}>
                    🔧 프롬프트 공통 맥락 (모든 컷에 자동 삽입)
                </h3>
                <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                    <div>
                        <label className="ct-edit-label">시대 맥락 (Era)</label>
                        <input
                            className="form-input"
                            value={ctx.era || ''}
                            onChange={e => updateContext('era', e.target.value)}
                            placeholder="예: 1593, Joseon Dynasty Korea, Second Siege of Jinju Castle (진주성 제2차 전투), Imjin War"
                        />
                    </div>
                    <div>
                        <label className="ct-edit-label">문화 맥락 (Culture)</label>
                        <textarea
                            className="form-textarea"
                            value={ctx.culture || ''}
                            onChange={e => updateContext('culture', e.target.value)}
                            placeholder="예: Korean defenders wear traditional Joseon armor (두정갑) with Korean war helmets (투구), topknot hair. Japanese attackers wear samurai ashigaru armor with kabuto helmets."
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="ct-edit-label">부정어 (Negatives)</label>
                        <input
                            className="form-input"
                            value={ctx.negatives || ''}
                            onChange={e => updateContext('negatives', e.target.value)}
                            placeholder="예: NOT illustration, NOT painting, NOT anime, NOT 3D render."
                        />
                    </div>
                </div>
            </div>

            {conti.scenes.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🎬</div>
                    <h3>줄콘티를 작성해주세요</h3>
                    <p>시나리오를 씬 → 컷 단위로 분해합니다</p>
                    <button className="btn btn-primary" onClick={addScene}>첫 씬 추가하기</button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                    {conti.scenes.map((scene, si) => (
                        <div key={si} className="card" style={{ padding: 'var(--space-lg)' }}>
                            <div className="flex-between mb-md">
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-primary-light)' }}>
                                    {scene.scene_id}: {scene.heading || '(씬 제목 없음)'}
                                </h3>
                                <button className="btn btn-secondary btn-sm" onClick={() => addCut(si)}>＋ 컷 추가</button>
                            </div>

                            {scene.cuts.map((cut, ci) => (
                                <div key={ci} className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-sm)', background: 'var(--bg-tertiary)' }}>
                                    <div className="flex-between mb-sm">
                                        <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--accent-secondary)' }}>{cut.cut_id}</span>
                                        <button className="btn btn-ghost btn-sm" onClick={() => removeCut(si, ci)}>🗑</button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-xs)' }}>
                                        <input className="form-input" value={cut.shot} onChange={e => updateCut(si, ci, 'shot', e.target.value)} placeholder="샷 (WS/MS/CU...)" />
                                        <input className="form-input" value={cut.angle} onChange={e => updateCut(si, ci, 'angle', e.target.value)} placeholder="앵글" />
                                        <input className="form-input" value={cut.camera_move} onChange={e => updateCut(si, ci, 'camera_move', e.target.value)} placeholder="카메라 무브" />
                                    </div>
                                    {/* 스토리 영역 */}
                                    <textarea className="form-textarea" value={cut.visual} onChange={e => updateCut(si, ci, 'visual', e.target.value)} placeholder="비주얼 설명..." rows={2} style={{ marginTop: 'var(--space-xs)' }} />
                                    <textarea className="form-textarea" value={cut.dialogue} onChange={e => updateCut(si, ci, 'dialogue', e.target.value)} placeholder="대사..." rows={2} style={{ marginTop: 'var(--space-xs)' }} />
                                    {/* 프롬프트 영역 */}
                                    <div style={{ marginTop: 'var(--space-sm)', borderTop: '1px dashed var(--border-subtle)', paddingTop: 'var(--space-sm)' }}>
                                        <label className="ct-edit-label" style={{ marginBottom: '4px' }}>🖼️ 이미지 프롬프트 (씬별 장면 묘사만 — 공통 맥락은 자동 삽입)</label>
                                        <textarea
                                            className="form-textarea"
                                            value={cut.sketch_prompt}
                                            onChange={e => updateCut(si, ci, 'sketch_prompt', e.target.value)}
                                            placeholder="씬 고유 묘사만 작성. 예: Wide shot, fortress wall crumbling in rain, soldiers scrambling..."
                                            rows={3}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xs)', marginTop: 'var(--space-xs)' }}>
                                        <input className="form-input" value={cut.sfx} onChange={e => updateCut(si, ci, 'sfx', e.target.value)} placeholder="SFX" />
                                        <input className="form-input" value={cut.bgm} onChange={e => updateCut(si, ci, 'bgm', e.target.value)} placeholder="BGM" />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-xs)', marginTop: 'var(--space-xs)' }}>
                                        <input className="form-input" value={cut.duration_sec} onChange={e => updateCut(si, ci, 'duration_sec', Number(e.target.value))} placeholder="길이(초)" type="number" />
                                        <input className="form-input" value={cut.transition_out} onChange={e => updateCut(si, ci, 'transition_out', e.target.value)} placeholder="전환" />
                                        <select className="form-input" value={cut.keyvisual_priority} onChange={e => updateCut(si, ci, 'keyvisual_priority', e.target.value)}>
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

/* ──── 메인 페이지 ──── */
export default function ContiPage() {
    const { project, reload } = useOutletContext();
    const [view, setView] = useState('design');
    const [conti, setConti] = useState(project?.conti || { scenes: [], assumptions: [] });
    const [saving, setSaving] = useState(false);

    const jsonText = JSON.stringify(conti, null, 2);

    async function handleSave() {
        setSaving(true);
        await updateConti(project.id, conti);
        await reload();
        setSaving(false);
    }

    const updatedAt = project?.conti?.updatedAt;

    return (
        <div className="section" style={{ animation: 'fadeIn 300ms ease' }}>
            <div className="flex-between mb-lg">
                <div className="section-title">
                    <span className="section-icon">📋</span>
                    줄콘티
                </div>
                <div className="view-tabs">
                    {[
                        { key: 'design', label: '디자인', icon: '🎨' },
                        { key: 'edit', label: '편집', icon: '✏️' },
                        { key: 'json', label: 'JSON', icon: '{ }' },
                    ].map(t => (
                        <button
                            key={t.key}
                            className={`view-tab ${view === t.key ? 'active' : ''}`}
                            onClick={() => setView(t.key)}
                        >
                            <span>{t.icon}</span> {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {view === 'design' && <DesignView conti={conti} />}
            {view === 'edit' && <EditView conti={conti} setConti={setConti} onSave={handleSave} saving={saving} />}
            {view === 'json' && <CopyBlockCode label="줄콘티 (JSON)" content={jsonText} id="conti-json" />}

            {updatedAt && (
                <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 'var(--space-lg)' }}>
                    마지막 수정: {new Date(updatedAt).toLocaleString('ko-KR')}
                </div>
            )}
        </div>
    );
}
