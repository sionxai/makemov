import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { addProductionPrompt } from '../db';
import { CopyBlock, CopyBlockCode } from '../components/CopyBlock';

const PROMPT_TYPES = [
    { value: 'sora', label: 'Sora', icon: '🎥', color: '#e74c3c' },
    { value: 'runway', label: 'Runway', icon: '🎬', color: '#3498db' },
    { value: 'pika', label: 'Pika', icon: '✨', color: '#f39c12' },
    { value: 'midjourney', label: 'Midjourney', icon: '🎨', color: '#9b59b6' },
    { value: 'other', label: '기타', icon: '📝', color: '#95a5a6' },
];

function getTypeInfo(type) {
    return PROMPT_TYPES.find(t => t.value === type) || PROMPT_TYPES[4];
}

/* ──── 디자인 뷰 ──── */
function DesignView({ prompts }) {
    if (!prompts || prompts.length === 0) return null;

    // 타입별 그룹핑
    const grouped = {};
    prompts.forEach(p => {
        const type = p.type || 'other';
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(p);
    });

    return (
        <div className="pm-design">
            <div className="pm-header">
                <div className="pm-header-badge">PRODUCTION PROMPTS</div>
                <h1 className="pm-header-title">프로덕션 프롬프트</h1>
                <p className="pm-header-sub">{prompts.length}개 프롬프트 · AI 영상 생성용</p>
            </div>

            {/* 타입별 통계 */}
            <div className="pm-stats">
                {PROMPT_TYPES.filter(t => grouped[t.value]).map(t => (
                    <div key={t.value} className="pm-stat-card" style={{ '--type-color': t.color }}>
                        <span className="pm-stat-icon">{t.icon}</span>
                        <span className="pm-stat-label">{t.label}</span>
                        <span className="pm-stat-count">{grouped[t.value]?.length || 0}</span>
                    </div>
                ))}
            </div>

            {/* 프롬프트 카드 */}
            <div className="pm-list">
                {prompts.map((prompt, i) => {
                    const info = getTypeInfo(prompt.type);
                    return (
                        <div key={prompt.id || i} className="pm-card" style={{ '--type-color': info.color }}>
                            <div className="pm-card-header">
                                <div className="pm-type-badge" style={{ background: info.color }}>
                                    {info.icon} {info.label}
                                </div>
                                {prompt.scene && (
                                    <span className="pm-scene-tag">Scene {prompt.scene}</span>
                                )}
                            </div>
                            <h3 className="pm-card-title">{prompt.title}</h3>
                            <div className="pm-prompt-content">
                                <p>{prompt.prompt}</p>
                            </div>
                            <CopyBlock content={prompt.prompt} id={`pm-${prompt.id || i}`} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function PromptsPage() {
    const { project, reload } = useOutletContext();
    const [view, setView] = useState('design');
    const prompts = project?.productionPrompts || [];
    const [showAdd, setShowAdd] = useState(false);
    const [newPrompt, setNewPrompt] = useState({ type: 'sora', title: '', prompt: '', scene: '' });

    const jsonText = JSON.stringify(prompts, null, 2);

    async function handleAdd() {
        if (!newPrompt.prompt.trim()) return;
        await addProductionPrompt(project.id, newPrompt);
        await reload();
        setNewPrompt({ type: 'sora', title: '', prompt: '', scene: '' });
        setShowAdd(false);
    }

    return (
        <div className="section" style={{ animation: 'fadeIn 300ms ease' }}>
            <div className="flex-between mb-lg">
                <div className="section-title">
                    <span className="section-icon">🎯</span>
                    프롬프트
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

            {view === 'design' && (
                <>
                    <DesignView prompts={prompts} />
                    <div style={{ marginTop: 'var(--space-lg)' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowAdd(!showAdd)}>
                            {showAdd ? '취소' : '＋ 프롬프트 추가'}
                        </button>
                    </div>
                    {showAdd && (
                        <div className="card" style={{ marginTop: 'var(--space-md)', padding: 'var(--space-lg)', borderColor: 'var(--border-active)' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>새 프롬프트</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">AI 도구</label>
                                    <select className="form-input" value={newPrompt.type} onChange={(e) => setNewPrompt({ ...newPrompt, type: e.target.value })}>
                                        {PROMPT_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <input className="form-input" value={newPrompt.title} onChange={(e) => setNewPrompt({ ...newPrompt, title: e.target.value })} placeholder="제목" />
                                <input className="form-input" value={newPrompt.scene} onChange={(e) => setNewPrompt({ ...newPrompt, scene: e.target.value })} placeholder="씬 번호 (선택)" />
                                <textarea className="form-textarea" value={newPrompt.prompt} onChange={(e) => setNewPrompt({ ...newPrompt, prompt: e.target.value })} placeholder="프롬프트 내용 *" rows={5} />
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button className="btn btn-primary" onClick={handleAdd} disabled={!newPrompt.prompt.trim()}>추가</button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {view === 'json' && <CopyBlockCode label="프로덕션 프롬프트 (JSON)" content={jsonText} id="prompts-json" />}
        </div>
    );
}
