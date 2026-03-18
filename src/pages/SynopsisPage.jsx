import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import AiGeneratePanel from '../components/AiGeneratePanel';
import ApprovalBar from '../components/ApprovalBar';
import { CopyBlock, CopyBlockCode } from '../components/CopyBlock';
import { updateFirestoreSynopsis } from '../firebase/projectStore';
import { synopsisToMarkdown } from '../data/jinju-seed';
import { getStageImpact } from '../services/changeTracker';
import { getStageStatus, stageHasContent, transitionStatus } from '../services/approvalService';
import { createEmptyStageDocument, normalizeGeneratedStageData } from '../services/pipelinePrompts';

const ACT_ICONS = ['🌅', '⚔️', '🔥', '🌸'];
const ACT_COLORS = ['#d4a574', '#c0392b', '#e74c3c', '#9b59b6'];

function ViewTabs({ view, setView }) {
    const tabs = [
        { key: 'design', label: '디자인', icon: '🎨' },
        { key: 'edit', label: '편집', icon: '✏️' },
        { key: 'ai', label: 'AI 생성', icon: '🤖' },
        { key: 'md', label: 'MD', icon: '📄' },
        { key: 'json', label: 'JSON', icon: '{ }' },
    ];

    return (
        <div className="view-tabs">
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    className={`view-tab ${view === tab.key ? 'active' : ''}`}
                    onClick={() => setView(tab.key)}
                >
                    <span className="view-tab-icon">{tab.icon}</span>
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

function InfoGrid({ info }) {
    const items = [
        { label: '장르', value: info.genre, icon: '🎭' },
        { label: '러닝타임', value: info.runtime, icon: '⏱' },
        { label: '톤 & 무드', value: info.tone, icon: '🎨' },
        { label: '오디언스', value: info.audience, icon: '👥' },
        { label: '형식', value: info.format, icon: '📽' },
    ];

    return (
        <div className="syn-info-grid">
            {items.map((item) => (
                <div key={item.label} className="syn-info-item">
                    <span className="syn-info-icon">{item.icon}</span>
                    <div>
                        <div className="syn-info-label">{item.label}</div>
                        <div className="syn-info-value">{item.value || '—'}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function ActCard({ act, index }) {
    return (
        <div className="syn-act-card" style={{ '--act-color': ACT_COLORS[index] || ACT_COLORS[0] }}>
            <div className="syn-act-header">
                <span className="syn-act-icon">{ACT_ICONS[index] || '📌'}</span>
                <div>
                    <div className="syn-act-title">{act.title}</div>
                    <div className="syn-act-subtitle">{act.subtitle}</div>
                </div>
            </div>
            <div className="syn-act-content">
                {String(act.content || '')
                    .split('\n\n')
                    .filter(Boolean)
                    .map((paragraph, paragraphIndex) => (
                        <p key={paragraphIndex}>{paragraph}</p>
                    ))}
            </div>
            <CopyBlock content={act.content} id={`act-${index}`} />
        </div>
    );
}

function CharacterCard({ char }) {
    return (
        <div className="syn-char-card">
            <div className="syn-char-header">
                <div className="syn-char-avatar">{char.name?.charAt(0) || '?'}</div>
                <div>
                    <div className="syn-char-name">
                        {char.name || '이름 미정'}
                        {char.nameHanja && <span className="syn-char-hanja">{char.nameHanja}</span>}
                    </div>
                    <div className="syn-char-role">
                        {char.role || '역할 미정'}{char.age ? ` · ${char.age}` : ''}
                    </div>
                </div>
            </div>
            <div className="syn-char-details">
                <div className="syn-char-row"><span className="syn-char-label">외형</span>{char.appearance || '—'}</div>
                <div className="syn-char-row"><span className="syn-char-label">성격</span>{char.personality || '—'}</div>
                <div className="syn-char-row"><span className="syn-char-label">동기</span>{char.motivation || '—'}</div>
                <div className="syn-char-row"><span className="syn-char-label">아크</span><strong>{char.arc || '—'}</strong></div>
            </div>
        </div>
    );
}

function DesignView({ data }) {
    if (!data) return null;

    return (
        <div className="syn-design">
            <div className="syn-hero">
                <h2 className="syn-hero-title">{data.title || '제목 미정'}</h2>
                {data.titleEn && <div className="syn-hero-subtitle">{data.titleEn}</div>}
            </div>

            <div className="syn-section">
                <div className="syn-section-header">
                    <span>📋</span> 기본 정보
                </div>
                <InfoGrid info={data.info} />
            </div>

            <div className="syn-section syn-logline">
                <div className="syn-section-header">
                    <span>🎯</span> 로그라인
                </div>
                <blockquote className="syn-quote">{data.logline || '로그라인을 작성해주세요.'}</blockquote>
                <CopyBlock content={data.logline} id="logline" />
            </div>

            <div className="syn-section syn-theme">
                <div className="syn-section-header">
                    <span>💎</span> 테마
                </div>
                <blockquote className="syn-quote syn-quote-theme">{data.theme || '테마를 작성해주세요.'}</blockquote>
                <CopyBlock content={data.theme} id="theme" />
            </div>

            <div className="syn-section">
                <div className="syn-section-header">
                    <span>📖</span> 시놉시스 본문
                </div>
                <div className="syn-acts">
                    {data.acts.map((act, index) => (
                        <ActCard key={`${act.title}-${index}`} act={act} index={index} />
                    ))}
                </div>
            </div>

            <div className="syn-section">
                <div className="syn-section-header">
                    <span>👤</span> 주요 인물
                </div>
                <div className="syn-chars">
                    {data.characters.map((character, index) => (
                        <CharacterCard key={`${character.name || 'char'}-${index}`} char={character} />
                    ))}
                </div>
            </div>

            <div className="syn-section">
                <div className="syn-section-header">
                    <span>🎨</span> 비주얼 톤 & 미장센
                </div>
                <div className="syn-visual-grid">
                    {[
                        { icon: '🎨', label: '색감/팔레트', value: data.visualTone.palette },
                        { icon: '💡', label: '조명', value: data.visualTone.lighting },
                        { icon: '📷', label: '카메라', value: data.visualTone.camera },
                        { icon: '🎬', label: '레퍼런스', value: data.visualTone.references },
                    ].map((item) => (
                        <div key={item.label} className="syn-visual-item">
                            <div className="syn-visual-label">{item.icon} {item.label}</div>
                            <div className="syn-visual-value">{item.value || '—'}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="syn-section">
                <div className="syn-section-header">
                    <span>🔊</span> 사운드 & 음악 방향
                </div>
                <div className="syn-visual-grid">
                    {[
                        { icon: '🎵', label: 'BGM', value: data.sound.bgm },
                        { icon: '🔊', label: '효과음', value: data.sound.sfx },
                        { icon: '🎙', label: '내레이션', value: data.sound.narration },
                    ].map((item) => (
                        <div key={item.label} className="syn-visual-item">
                            <div className="syn-visual-label">{item.icon} {item.label}</div>
                            <div className="syn-visual-value">{item.value || '—'}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="syn-section">
                <div className="syn-section-header">
                    <span>🎬</span> 핵심 장면 리스트
                </div>
                <div className="syn-scenes">
                    {data.keyScenes.map((scene, index) => (
                        <div key={`${scene.title || 'scene'}-${index}`} className="syn-scene-item">
                            <span className="syn-scene-num">{index + 1}</span>
                            <div>
                                <div className="syn-scene-title">{scene.title || '장면 제목'}</div>
                                <div className="syn-scene-desc">{scene.description || '설명을 입력해주세요.'}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function EditView({ data, setData, onSave, saving }) {
    function updateRoot(field, value) {
        setData({ ...data, [field]: value });
    }

    function updateInfo(field, value) {
        setData({
            ...data,
            info: { ...data.info, [field]: value },
        });
    }

    function updateVisualTone(field, value) {
        setData({
            ...data,
            visualTone: { ...data.visualTone, [field]: value },
        });
    }

    function updateSound(field, value) {
        setData({
            ...data,
            sound: { ...data.sound, [field]: value },
        });
    }

    function updateAct(index, field, value) {
        const acts = [...data.acts];
        acts[index] = { ...acts[index], [field]: value };
        setData({ ...data, acts });
    }

    function addAct() {
        setData({
            ...data,
            acts: [...data.acts, { title: `막 ${data.acts.length + 1}`, subtitle: '', content: '' }],
        });
    }

    function removeAct(index) {
        setData({
            ...data,
            acts: data.acts.filter((_, actIndex) => actIndex !== index),
        });
    }

    function updateCharacter(index, field, value) {
        const characters = [...data.characters];
        characters[index] = { ...characters[index], [field]: value };
        setData({ ...data, characters });
    }

    function addCharacter() {
        setData({
            ...data,
            characters: [
                ...data.characters,
                {
                    name: '',
                    nameHanja: '',
                    role: '',
                    age: '',
                    appearance: '',
                    personality: '',
                    motivation: '',
                    arc: '',
                },
            ],
        });
    }

    function removeCharacter(index) {
        setData({
            ...data,
            characters: data.characters.filter((_, characterIndex) => characterIndex !== index),
        });
    }

    function updateKeyScene(index, field, value) {
        const keyScenes = [...data.keyScenes];
        keyScenes[index] = { ...keyScenes[index], [field]: value };
        setData({ ...data, keyScenes });
    }

    function addKeyScene() {
        setData({
            ...data,
            keyScenes: [...data.keyScenes, { title: '', description: '' }],
        });
    }

    function removeKeyScene(index) {
        setData({
            ...data,
            keyScenes: data.keyScenes.filter((_, sceneIndex) => sceneIndex !== index),
        });
    }

    return (
        <div className="syn-edit">
            <div className="flex-between mb-lg">
                <div className="text-secondary">필드 단위로 수정한 뒤 저장하면 새 리비전으로 반영됩니다.</div>
                <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving}>
                    {saving ? '저장 중...' : '💾 저장'}
                </button>
            </div>

            <div className="syn-edit-grid">
                <div className="card syn-edit-card">
                    <h3 className="syn-edit-card__title">기본 정보</h3>
                    <div className="syn-edit-stack">
                        <div className="form-group">
                            <label className="form-label">제목</label>
                            <input className="form-input" value={data.title} onChange={(event) => updateRoot('title', event.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">영문 제목</label>
                            <input className="form-input" value={data.titleEn} onChange={(event) => updateRoot('titleEn', event.target.value)} />
                        </div>
                        <div className="syn-edit-inline">
                            <div className="form-group">
                                <label className="form-label">장르</label>
                                <input className="form-input" value={data.info.genre} onChange={(event) => updateInfo('genre', event.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">러닝타임</label>
                                <input className="form-input" value={data.info.runtime} onChange={(event) => updateInfo('runtime', event.target.value)} />
                            </div>
                        </div>
                        <div className="syn-edit-inline">
                            <div className="form-group">
                                <label className="form-label">톤 & 무드</label>
                                <input className="form-input" value={data.info.tone} onChange={(event) => updateInfo('tone', event.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">타깃 관객</label>
                                <input className="form-input" value={data.info.audience} onChange={(event) => updateInfo('audience', event.target.value)} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">형식</label>
                            <input className="form-input" value={data.info.format} onChange={(event) => updateInfo('format', event.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">로그라인</label>
                            <textarea className="form-textarea" rows={4} value={data.logline} onChange={(event) => updateRoot('logline', event.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">테마</label>
                            <textarea className="form-textarea" rows={4} value={data.theme} onChange={(event) => updateRoot('theme', event.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="card syn-edit-card">
                    <h3 className="syn-edit-card__title">연출 방향</h3>
                    <div className="syn-edit-stack">
                        <div className="form-group">
                            <label className="form-label">색감 / 팔레트</label>
                            <textarea className="form-textarea" rows={3} value={data.visualTone.palette} onChange={(event) => updateVisualTone('palette', event.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">조명</label>
                            <textarea className="form-textarea" rows={3} value={data.visualTone.lighting} onChange={(event) => updateVisualTone('lighting', event.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">카메라</label>
                            <textarea className="form-textarea" rows={3} value={data.visualTone.camera} onChange={(event) => updateVisualTone('camera', event.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">레퍼런스</label>
                            <textarea className="form-textarea" rows={3} value={data.visualTone.references} onChange={(event) => updateVisualTone('references', event.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">BGM</label>
                            <textarea className="form-textarea" rows={3} value={data.sound.bgm} onChange={(event) => updateSound('bgm', event.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">효과음</label>
                            <textarea className="form-textarea" rows={3} value={data.sound.sfx} onChange={(event) => updateSound('sfx', event.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">내레이션</label>
                            <textarea className="form-textarea" rows={3} value={data.sound.narration} onChange={(event) => updateSound('narration', event.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="card syn-edit-card">
                <div className="flex-between mb-md">
                    <h3 className="syn-edit-card__title">4막 구조</h3>
                    <button className="btn btn-secondary btn-sm" onClick={addAct}>＋ 막 추가</button>
                </div>
                <div className="syn-edit-list">
                    {data.acts.map((act, index) => (
                        <div key={`act-${index}`} className="syn-edit-item">
                            <div className="flex-between mb-sm">
                                <strong>Act {index + 1}</strong>
                                {data.acts.length > 1 && (
                                    <button className="btn btn-ghost btn-sm" onClick={() => removeAct(index)}>삭제</button>
                                )}
                            </div>
                            <div className="syn-edit-inline">
                                <input className="form-input" value={act.title} placeholder="막 제목" onChange={(event) => updateAct(index, 'title', event.target.value)} />
                                <input className="form-input" value={act.subtitle} placeholder="부제 / 타임코드" onChange={(event) => updateAct(index, 'subtitle', event.target.value)} />
                            </div>
                            <textarea className="form-textarea" rows={5} value={act.content} placeholder="막 내용" onChange={(event) => updateAct(index, 'content', event.target.value)} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="card syn-edit-card">
                <div className="flex-between mb-md">
                    <h3 className="syn-edit-card__title">주요 인물</h3>
                    <button className="btn btn-secondary btn-sm" onClick={addCharacter}>＋ 인물 추가</button>
                </div>
                <div className="syn-edit-list">
                    {data.characters.map((character, index) => (
                        <div key={`char-${index}`} className="syn-edit-item">
                            <div className="flex-between mb-sm">
                                <strong>{character.name || `인물 ${index + 1}`}</strong>
                                {data.characters.length > 1 && (
                                    <button className="btn btn-ghost btn-sm" onClick={() => removeCharacter(index)}>삭제</button>
                                )}
                            </div>
                            <div className="syn-edit-inline">
                                <input className="form-input" value={character.name} placeholder="이름" onChange={(event) => updateCharacter(index, 'name', event.target.value)} />
                                <input className="form-input" value={character.nameHanja} placeholder="한자명" onChange={(event) => updateCharacter(index, 'nameHanja', event.target.value)} />
                                <input className="form-input" value={character.age} placeholder="연령대" onChange={(event) => updateCharacter(index, 'age', event.target.value)} />
                            </div>
                            <div className="syn-edit-inline">
                                <input className="form-input" value={character.role} placeholder="역할" onChange={(event) => updateCharacter(index, 'role', event.target.value)} />
                                <input className="form-input" value={character.motivation} placeholder="동기" onChange={(event) => updateCharacter(index, 'motivation', event.target.value)} />
                            </div>
                            <textarea className="form-textarea" rows={2} value={character.appearance} placeholder="외형" onChange={(event) => updateCharacter(index, 'appearance', event.target.value)} />
                            <textarea className="form-textarea" rows={2} value={character.personality} placeholder="성격" onChange={(event) => updateCharacter(index, 'personality', event.target.value)} />
                            <textarea className="form-textarea" rows={2} value={character.arc} placeholder="아크" onChange={(event) => updateCharacter(index, 'arc', event.target.value)} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="card syn-edit-card">
                <div className="flex-between mb-md">
                    <h3 className="syn-edit-card__title">핵심 장면</h3>
                    <button className="btn btn-secondary btn-sm" onClick={addKeyScene}>＋ 장면 추가</button>
                </div>
                <div className="syn-edit-list">
                    {data.keyScenes.map((scene, index) => (
                        <div key={`scene-${index}`} className="syn-edit-item">
                            <div className="flex-between mb-sm">
                                <strong>장면 {index + 1}</strong>
                                {data.keyScenes.length > 1 && (
                                    <button className="btn btn-ghost btn-sm" onClick={() => removeKeyScene(index)}>삭제</button>
                                )}
                            </div>
                            <input className="form-input" value={scene.title} placeholder="장면 제목" onChange={(event) => updateKeyScene(index, 'title', event.target.value)} />
                            <textarea className="form-textarea" rows={3} value={scene.description} placeholder="장면 설명" onChange={(event) => updateKeyScene(index, 'description', event.target.value)} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function SynopsisPage() {
    const { project, reload } = useOutletContext();
    const normalizedData = useMemo(() => (
        project?.synopsis?.structured
            ? normalizeGeneratedStageData('synopsis', project.synopsis.structured, {
                projectTitle: project.title,
                forceRevisionBump: false,
            })
            : null
    ), [project]);
    const hasContent = stageHasContent(project, 'synopsis');
    const [view, setView] = useState(hasContent ? 'design' : 'ai');
    const [saving, setSaving] = useState(false);
    const [transitioning, setTransitioning] = useState(false);
    const [draftData, setDraftData] = useState(() => normalizedData || createEmptyStageDocument('synopsis', { projectTitle: project?.title }));

    const mdText = useMemo(() => normalizedData ? synopsisToMarkdown(normalizedData) : (project?.synopsis?.content || ''), [normalizedData, project]);
    const jsonText = useMemo(() => normalizedData ? JSON.stringify(normalizedData, null, 2) : '{}', [normalizedData]);
    const status = getStageStatus(project, 'synopsis');
    const impact = getStageImpact(project, 'synopsis');

    async function handleSaveDraft(nextData, meta = {}) {
        setSaving(true);
        try {
            await updateFirestoreSynopsis(project.id, nextData, meta);
            await reload();
            setView('design');
        } catch (error) {
            console.error('[SynopsisPage] 저장 실패:', error?.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleEditSave() {
        const nextData = normalizeGeneratedStageData('synopsis', draftData, {
            projectTitle: project.title,
            previousData: normalizedData,
            forceRevisionBump: true,
        });
        await handleSaveDraft(nextData, {
            sourcePrompt: project?.synopsis?.sourcePrompt || '',
            options: draftData.info,
            generation: { source: 'manual' },
        });
    }

    async function handleStatusChange(nextStatus) {
        setTransitioning(true);
        try {
            await transitionStatus(project.id, 'synopsis', nextStatus);
            await reload();
        } catch (error) {
            console.error('[SynopsisPage] 상태 전환 실패:', error?.message);
        } finally {
            setTransitioning(false);
        }
    }

    return (
        <div className="section" style={{ animation: 'fadeIn 300ms ease' }}>
            <div className="flex-between mb-lg" style={{ gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                <div className="section-title">
                    <span className="section-icon">📄</span>
                    시놉시스
                </div>
                <ViewTabs view={view} setView={setView} />
            </div>

            <ApprovalBar
                projectId={project.id}
                stage="synopsis"
                status={status}
                hasContent={hasContent}
                onTransition={handleStatusChange}
                transitioning={transitioning}
                nextStage="screenplay"
                impact={impact}
            />

            {view === 'ai' && (
                <AiGeneratePanel
                    stage="synopsis"
                    projectTitle={project.title}
                    currentData={normalizedData}
                    onGenerated={(generated) => setDraftData(generated)}
                    onSave={handleSaveDraft}
                    renderPreview={(generated) => <DesignView data={generated} />}
                />
            )}

            {view === 'design' && (
                normalizedData ? (
                    <DesignView data={normalizedData} />
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">🤖</div>
                        <h3>시놉시스가 아직 없습니다</h3>
                        <p>AI 생성 탭에서 아이디어를 입력해 첫 시놉시스를 만들어주세요.</p>
                        <button className="btn btn-primary" onClick={() => setView('ai')}>AI 생성으로 이동</button>
                    </div>
                )
            )}

            {view === 'edit' && (
                <EditView
                    data={draftData}
                    setData={setDraftData}
                    onSave={handleEditSave}
                    saving={saving}
                />
            )}

            {view === 'md' && (
                <CopyBlock
                    label="시놉시스 (Markdown)"
                    content={mdText}
                    id="synopsis-md"
                />
            )}

            {view === 'json' && (
                <CopyBlockCode
                    label="시놉시스 (JSON)"
                    content={jsonText}
                    language="json"
                    id="synopsis-json"
                />
            )}

            {project?.synopsis?.updatedAt && (
                <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 'var(--space-lg)' }}>
                    마지막 수정: {new Date(project.synopsis.updatedAt).toLocaleString('ko-KR')}
                </div>
            )}
        </div>
    );
}
