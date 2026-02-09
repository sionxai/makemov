import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { updateScreenplay } from '../db';
import { CopyBlock, CopyBlockCode } from '../components/CopyBlock';
import { screenplayToMarkdown } from '../data/jinju-seed';

/* ──── 디자인 뷰 ──── */
function DesignView({ scenes }) {
    if (!scenes || scenes.length === 0) return null;

    const sceneIcons = ['🌅', '⚔️', '🌧️', '💀', '🌊', '🏯', '🌙'];
    const sceneColors = [
        '#d4a574', '#e74c3c', '#5b7bb4', '#c0392b', '#3498db', '#e67e22', '#9b59b6'
    ];

    return (
        <div className="sp-design">
            {/* 헤더 */}
            <div className="sp-header">
                <div className="sp-header-badge">SCREENPLAY</div>
                <h1 className="sp-header-title">시나리오</h1>
                <p className="sp-header-sub">{scenes.length}개 씬</p>
            </div>

            {/* 타임라인 */}
            <div className="sp-timeline">
                {scenes.map((scene, i) => (
                    <div key={i} className="sp-scene-card" style={{ '--scene-color': sceneColors[i] || '#8b5cf6' }}>
                        <div className="sp-scene-header">
                            <div className="sp-scene-number">{scene.number}</div>
                            <div className="sp-scene-meta">
                                <span className="sp-scene-icon">{sceneIcons[i] || '🎬'}</span>
                                <h3 className="sp-scene-heading">{scene.heading}</h3>
                            </div>
                        </div>

                        <div className="sp-scene-body">
                            {/* 액션 */}
                            {scene.action && (
                                <div className="sp-block sp-block-action">
                                    <div className="sp-block-label">
                                        <span className="sp-label-icon">🎬</span> 액션
                                    </div>
                                    <div className="sp-block-content">
                                        {scene.action.split('\n').map((line, j) => (
                                            <p key={j}>{line}</p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 대사 */}
                            {scene.dialogue && (
                                <div className="sp-block sp-block-dialogue">
                                    <div className="sp-block-label">
                                        <span className="sp-label-icon">💬</span> 대사
                                    </div>
                                    <div className="sp-block-content sp-dialogue-lines">
                                        {scene.dialogue.split('\n').map((line, j) => (
                                            <p key={j} className={line.startsWith('(') ? 'sp-stage-dir' : 'sp-line'}>{line}</p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 연출 노트 */}
                            {scene.notes && (
                                <div className="sp-block sp-block-notes">
                                    <div className="sp-block-label">
                                        <span className="sp-label-icon">📋</span> 연출 노트
                                    </div>
                                    <div className="sp-block-content">{scene.notes}</div>
                                </div>
                            )}
                        </div>

                        {/* 복사 */}
                        <CopyBlock
                            content={`Scene ${scene.number}: ${scene.heading}\n\n[액션]\n${scene.action || ''}\n\n[대사]\n${scene.dialogue || ''}\n\n[연출 노트]\n${scene.notes || ''}`}
                            id={`sp-scene-${i}`}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ──── 편집 모드 ──── */
function EditView({ scenes, setScenes, onSave, saving }) {
    function addScene() {
        setScenes([...scenes, {
            number: scenes.length + 1,
            heading: '',
            action: '',
            dialogue: '',
            notes: '',
        }]);
    }

    function updateScene(idx, field, value) {
        const updated = [...scenes];
        updated[idx] = { ...updated[idx], [field]: value };
        setScenes(updated);
    }

    function removeScene(idx) {
        const updated = scenes.filter((_, i) => i !== idx);
        updated.forEach((s, i) => { s.number = i + 1; });
        setScenes(updated);
    }

    function moveScene(idx, dir) {
        if ((dir === -1 && idx === 0) || (dir === 1 && idx === scenes.length - 1)) return;
        const updated = [...scenes];
        const temp = updated[idx];
        updated[idx] = updated[idx + dir];
        updated[idx + dir] = temp;
        updated.forEach((s, i) => { s.number = i + 1; });
        setScenes(updated);
    }

    return (
        <div>
            <div className="flex-between mb-lg">
                <button className="btn btn-secondary btn-sm" onClick={addScene}>＋ 씬 추가</button>
                {scenes.length > 0 && (
                    <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving}>
                        {saving ? '저장 중...' : '💾 저장'}
                    </button>
                )}
            </div>

            {scenes.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📝</div>
                    <h3>씬을 추가해주세요</h3>
                    <p>시나리오를 씬 단위로 구성할 수 있어요</p>
                    <button className="btn btn-primary" onClick={addScene}>첫 씬 추가하기</button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {scenes.map((scene, idx) => (
                        <div key={idx} className="card" style={{ padding: 'var(--space-lg)' }}>
                            <div className="flex-between mb-md">
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-primary-light)' }}>
                                    Scene {scene.number}{scene.heading && `: ${scene.heading}`}
                                </h3>
                                <div className="flex gap-sm">
                                    <button className="btn btn-ghost btn-sm" onClick={() => moveScene(idx, -1)} disabled={idx === 0}>↑</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => moveScene(idx, 1)} disabled={idx === scenes.length - 1}>↓</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => removeScene(idx)}>🗑</button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">씬 제목</label>
                                    <input className="form-input" value={scene.heading} onChange={(e) => updateScene(idx, 'heading', e.target.value)} placeholder="예: INT. 한강변 - 새벽" />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">액션 / 설명</label>
                                    <textarea className="form-textarea" value={scene.action} onChange={(e) => updateScene(idx, 'action', e.target.value)} placeholder="화면에 보이는 장면을 설명..." rows={4} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">대사</label>
                                    <textarea className="form-textarea" value={scene.dialogue} onChange={(e) => updateScene(idx, 'dialogue', e.target.value)} placeholder="캐릭터 대사..." rows={3} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">연출 노트</label>
                                    <textarea className="form-textarea" value={scene.notes} onChange={(e) => updateScene(idx, 'notes', e.target.value)} placeholder="카메라, 조명, 사운드 노트..." rows={2} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ──── 메인 페이지 ──── */
export default function ScreenplayPage() {
    const { project, reload } = useOutletContext();
    const [view, setView] = useState('design');
    const [scenes, setScenes] = useState(project?.screenplay?.scenes || []);
    const [saving, setSaving] = useState(false);

    const mdText = useMemo(() => screenplayToMarkdown(scenes), [scenes]);
    const jsonText = useMemo(() => JSON.stringify(scenes, null, 2), [scenes]);

    async function handleSave() {
        setSaving(true);
        await updateScreenplay(project.id, scenes);
        await reload();
        setSaving(false);
    }

    const updatedAt = project?.screenplay?.updatedAt;

    return (
        <div className="section" style={{ animation: 'fadeIn 300ms ease' }}>
            <div className="flex-between mb-lg">
                <div className="section-title">
                    <span className="section-icon">📝</span>
                    시나리오
                </div>
                <div className="view-tabs">
                    {[
                        { key: 'design', label: '디자인', icon: '🎨' },
                        { key: 'edit', label: '편집', icon: '✏️' },
                        { key: 'md', label: 'MD', icon: '📄' },
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

            {view === 'design' && <DesignView scenes={scenes} />}
            {view === 'edit' && <EditView scenes={scenes} setScenes={setScenes} onSave={handleSave} saving={saving} />}
            {view === 'md' && <CopyBlock label="시나리오 (Markdown)" content={mdText} id="screenplay-md" />}
            {view === 'json' && <CopyBlockCode label="시나리오 (JSON)" content={jsonText} id="screenplay-json" />}

            {updatedAt && (
                <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 'var(--space-lg)' }}>
                    마지막 수정: {new Date(updatedAt).toLocaleString('ko-KR')}
                </div>
            )}
        </div>
    );
}
