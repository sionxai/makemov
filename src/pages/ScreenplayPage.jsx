import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import AiGeneratePanel from '../components/AiGeneratePanel';
import ApprovalBar from '../components/ApprovalBar';
import { CopyBlock, CopyBlockCode } from '../components/CopyBlock';
import { screenplayToMarkdown } from '../data/jinju-seed';
import { updateFirestoreScreenplay } from '../firebase/projectStore';
import { getStageImpact } from '../services/changeTracker';
import { getStageStatus, isApprovedStatus, stageHasContent, transitionStatus } from '../services/approvalService';
import { normalizeGeneratedStageData } from '../services/pipelinePrompts';

function DesignView({ scenes }) {
    if (!scenes || scenes.length === 0) return null;

    const sceneIcons = ['🌅', '⚔️', '🌧️', '💀', '🌊', '🏯', '🌙'];
    const sceneColors = ['#d4a574', '#e74c3c', '#5b7bb4', '#c0392b', '#3498db', '#e67e22', '#9b59b6'];

    return (
        <div className="sp-design">
            <div className="sp-header">
                <div className="sp-header-badge">SCREENPLAY</div>
                <h1 className="sp-header-title">시나리오</h1>
                <p className="sp-header-sub">{scenes.length}개 씬</p>
            </div>

            <div className="sp-timeline">
                {scenes.map((scene, index) => (
                    <div key={scene.uid || index} className="sp-scene-card" style={{ '--scene-color': sceneColors[index] || '#8b5cf6' }}>
                        <div className="sp-scene-header">
                            <div className="sp-scene-number">{scene.number}</div>
                            <div className="sp-scene-meta">
                                <span className="sp-scene-icon">{sceneIcons[index] || '🎬'}</span>
                                <h3 className="sp-scene-heading">{scene.heading || `Scene ${scene.number}`}</h3>
                            </div>
                        </div>

                        <div className="sp-scene-body">
                            {scene.action && (
                                <div className="sp-block sp-block-action">
                                    <div className="sp-block-label">
                                        <span className="sp-label-icon">🎬</span> 액션
                                    </div>
                                    <div className="sp-block-content">
                                        {scene.action.split('\n').map((line, lineIndex) => <p key={lineIndex}>{line}</p>)}
                                    </div>
                                </div>
                            )}

                            {scene.dialogue && (
                                <div className="sp-block sp-block-dialogue">
                                    <div className="sp-block-label">
                                        <span className="sp-label-icon">💬</span> 대사
                                    </div>
                                    <div className="sp-block-content sp-dialogue-lines">
                                        {scene.dialogue.split('\n').map((line, lineIndex) => (
                                            <p key={lineIndex} className={line.startsWith('(') ? 'sp-stage-dir' : 'sp-line'}>
                                                {line}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {scene.notes && (
                                <div className="sp-block sp-block-notes">
                                    <div className="sp-block-label">
                                        <span className="sp-label-icon">📋</span> 연출 노트
                                    </div>
                                    <div className="sp-block-content">{scene.notes}</div>
                                </div>
                            )}
                        </div>

                        <CopyBlock
                            content={`Scene ${scene.number}: ${scene.heading}\n\n[액션]\n${scene.action || ''}\n\n[대사]\n${scene.dialogue || ''}\n\n[연출 노트]\n${scene.notes || ''}`}
                            id={`sp-scene-${index}`}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

function EditView({ scenes, setScenes, onSave, saving }) {
    function addScene() {
        setScenes([
            ...scenes,
            {
                number: scenes.length + 1,
                scene_id: `S${scenes.length + 1}`,
                heading: '',
                action: '',
                dialogue: '',
                notes: '',
            },
        ]);
    }

    function updateScene(index, field, value) {
        const nextScenes = [...scenes];
        nextScenes[index] = { ...nextScenes[index], [field]: value };
        setScenes(nextScenes);
    }

    function removeScene(index) {
        const nextScenes = scenes
            .filter((_, sceneIndex) => sceneIndex !== index)
            .map((scene, sceneIndex) => ({
                ...scene,
                number: sceneIndex + 1,
                scene_id: `S${sceneIndex + 1}`,
            }));
        setScenes(nextScenes);
    }

    function moveScene(index, direction) {
        if ((direction === -1 && index === 0) || (direction === 1 && index === scenes.length - 1)) {
            return;
        }

        const nextScenes = [...scenes];
        const temp = nextScenes[index];
        nextScenes[index] = nextScenes[index + direction];
        nextScenes[index + direction] = temp;
        setScenes(nextScenes.map((scene, sceneIndex) => ({
            ...scene,
            number: sceneIndex + 1,
            scene_id: `S${sceneIndex + 1}`,
        })));
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
                    <p>시나리오를 씬 단위로 구성할 수 있어요.</p>
                    <button className="btn btn-primary" onClick={addScene}>첫 씬 추가하기</button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {scenes.map((scene, index) => (
                        <div key={scene.uid || index} className="card" style={{ padding: 'var(--space-lg)' }}>
                            <div className="flex-between mb-md">
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-primary-light)' }}>
                                    Scene {scene.number}{scene.heading && `: ${scene.heading}`}
                                </h3>
                                <div className="flex gap-sm">
                                    <button className="btn btn-ghost btn-sm" onClick={() => moveScene(index, -1)} disabled={index === 0}>↑</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => moveScene(index, 1)} disabled={index === scenes.length - 1}>↓</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => removeScene(index)}>🗑</button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">씬 제목</label>
                                    <input className="form-input" value={scene.heading} onChange={(event) => updateScene(index, 'heading', event.target.value)} placeholder="예: INT. 한강변 - 새벽" />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">액션 / 설명</label>
                                    <textarea className="form-textarea" value={scene.action} onChange={(event) => updateScene(index, 'action', event.target.value)} placeholder="화면에 보이는 장면을 설명..." rows={4} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">대사</label>
                                    <textarea className="form-textarea" value={scene.dialogue} onChange={(event) => updateScene(index, 'dialogue', event.target.value)} placeholder="캐릭터 대사..." rows={3} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">연출 노트</label>
                                    <textarea className="form-textarea" value={scene.notes} onChange={(event) => updateScene(index, 'notes', event.target.value)} placeholder="카메라, 조명, 사운드 노트..." rows={2} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ScreenplayPage() {
    const { project, reload } = useOutletContext();
    const synopsisData = project?.synopsis?.structured || null;
    const normalizedSection = useMemo(() => (
        normalizeGeneratedStageData('screenplay', project?.screenplay || { scenes: [] }, {
            previousData: project?.screenplay,
            parentData: synopsisData,
            forceRevisionBump: false,
        })
    ), [project, synopsisData]);
    const [view, setView] = useState(stageHasContent(project, 'screenplay') ? 'design' : 'ai');
    const [scenes, setScenes] = useState(normalizedSection.scenes || []);
    const [saving, setSaving] = useState(false);
    const [transitioning, setTransitioning] = useState(false);

    const mdText = useMemo(() => screenplayToMarkdown(scenes), [scenes]);
    const jsonText = useMemo(() => JSON.stringify({ ...normalizedSection, scenes }, null, 2), [normalizedSection, scenes]);
    const screenplayStatus = getStageStatus(project, 'screenplay');
    const synopsisStatus = getStageStatus(project, 'synopsis');
    const impact = getStageImpact(project, 'screenplay');
    const canUseSynopsis = isApprovedStatus(synopsisStatus);

    async function handleSave(section, meta = {}) {
        setSaving(true);
        try {
            await updateFirestoreScreenplay(project.id, section, meta);
            await reload();
            setView('design');
        } catch (error) {
            console.error('[ScreenplayPage] 저장 실패:', error?.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleManualSave() {
        const nextSection = normalizeGeneratedStageData('screenplay', {
            ...normalizedSection,
            scenes,
        }, {
            previousData: normalizedSection,
            parentData: synopsisData,
            forceRevisionBump: true,
        });
        await handleSave(nextSection, {
            sourcePrompt: project?.screenplay?.sourcePrompt || '',
            options: project?.screenplay?.options || null,
            generation: { source: 'manual' },
        });
    }

    async function handleStatusChange(nextStatus) {
        setTransitioning(true);
        try {
            await transitionStatus(project.id, 'screenplay', nextStatus);
            await reload();
        } catch (error) {
            console.error('[ScreenplayPage] 상태 전환 실패:', error?.message);
        } finally {
            setTransitioning(false);
        }
    }

    const updatedAt = project?.screenplay?.updatedAt;

    return (
        <div className="section" style={{ animation: 'fadeIn 300ms ease' }}>
            <div className="flex-between mb-lg" style={{ gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                <div className="section-title">
                    <span className="section-icon">📝</span>
                    시나리오
                </div>
                <div className="view-tabs">
                    {[
                        { key: 'design', label: '디자인', icon: '🎨' },
                        { key: 'edit', label: '편집', icon: '✏️' },
                        { key: 'ai', label: 'AI 생성', icon: '🤖' },
                        { key: 'md', label: 'MD', icon: '📄' },
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
                stage="screenplay"
                status={screenplayStatus}
                hasContent={stageHasContent(project, 'screenplay')}
                onTransition={handleStatusChange}
                transitioning={transitioning}
                nextStage="conti"
                impact={impact}
            />

            {view === 'ai' && (
                <AiGeneratePanel
                    stage="screenplay"
                    projectTitle={project.title}
                    inputData={synopsisData}
                    currentData={normalizedSection}
                    prerequisite={{
                        satisfied: canUseSynopsis,
                        message: '시놉시스가 아직 승인되지 않았습니다. 그래도 강제로 시나리오 생성을 진행할 수 있습니다.',
                    }}
                    onGenerated={(generated) => setScenes(generated.scenes || [])}
                    onSave={handleSave}
                    renderPreview={(generated) => <DesignView scenes={generated.scenes || []} />}
                />
            )}

            {view === 'design' && (
                scenes.length > 0 ? (
                    <DesignView scenes={scenes} />
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">🤖</div>
                        <h3>시나리오가 아직 없습니다</h3>
                        <p>시놉시스를 바탕으로 AI 생성 탭에서 첫 시나리오를 작성해보세요.</p>
                        <button className="btn btn-primary" onClick={() => setView('ai')}>AI 생성으로 이동</button>
                    </div>
                )
            )}

            {view === 'edit' && (
                <EditView scenes={scenes} setScenes={setScenes} onSave={handleManualSave} saving={saving} />
            )}
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
