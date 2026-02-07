import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { addKeyVisual, removeKeyVisual } from '../db';
import { CopyBlock, CopyBlockCode } from '../components/CopyBlock';

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
    const [visuals, setVisuals] = useState(project?.keyvisuals || []);
    const [showAdd, setShowAdd] = useState(false);
    const [newVisual, setNewVisual] = useState({ title: '', prompt: '', imageUrl: '', scene: '' });

    useEffect(() => {
        setVisuals(project?.keyvisuals || []);
    }, [project]);

    const jsonText = JSON.stringify(visuals, null, 2);

    async function handleAdd() {
        if (!newVisual.prompt.trim()) return;
        await addKeyVisual(project.id, newVisual);
        await reload();
        setNewVisual({ title: '', prompt: '', imageUrl: '', scene: '' });
        setShowAdd(false);
    }

    async function handleRemove(visualId) {
        await removeKeyVisual(project.id, visualId);
        await reload();
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
