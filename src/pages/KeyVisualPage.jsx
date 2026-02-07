import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { addKeyVisual, removeKeyVisual, updateProject } from '../db';
import { CopyBlock } from '../components/CopyBlock';

export default function KeyVisualPage() {
    const { project, reload } = useOutletContext();
    const [visuals, setVisuals] = useState(project?.keyvisuals || []);
    const [showAdd, setShowAdd] = useState(false);
    const [newVisual, setNewVisual] = useState({ title: '', prompt: '', imageUrl: '', scene: '' });

    useEffect(() => {
        setVisuals(project?.keyvisuals || []);
    }, [project]);

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
                    {visuals.length > 0 && (
                        <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 400 }}>
                            ({visuals.length}개)
                        </span>
                    )}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAdd(!showAdd)}>
                    {showAdd ? '취소' : '＋ 키비주얼 추가'}
                </button>
            </div>

            {showAdd && (
                <div className="card mb-lg" style={{ borderColor: 'var(--border-active)' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>새 키비주얼</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">제목</label>
                            <input className="form-input" value={newVisual.title} onChange={(e) => setNewVisual({ ...newVisual, title: e.target.value })} placeholder="예: 한강 새벽 안개" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">씬 번호</label>
                            <input className="form-input" value={newVisual.scene} onChange={(e) => setNewVisual({ ...newVisual, scene: e.target.value })} placeholder="예: 1" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">이미지 생성 프롬프트 *</label>
                            <textarea className="form-textarea" value={newVisual.prompt} onChange={(e) => setNewVisual({ ...newVisual, prompt: e.target.value })} placeholder="Midjourney, DALL-E 등에 사용할 프롬프트..." rows={4} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">이미지 URL (선택)</label>
                            <input className="form-input" value={newVisual.imageUrl} onChange={(e) => setNewVisual({ ...newVisual, imageUrl: e.target.value })} placeholder="생성된 이미지 URL" />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-primary" onClick={handleAdd} disabled={!newVisual.prompt.trim()}>추가</button>
                        </div>
                    </div>
                </div>
            )}

            {visuals.length === 0 && !showAdd ? (
                <div className="empty-state">
                    <div className="empty-icon">🎨</div>
                    <h3>키비주얼을 추가해주세요</h3>
                    <p>장면별 핵심 이미지와 프롬프트를 관리해요</p>
                    <button className="btn btn-primary" onClick={() => setShowAdd(true)}>첫 키비주얼 추가하기</button>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                    gap: 'var(--space-md)',
                }}>
                    {visuals.map((visual) => (
                        <div key={visual.id} className="image-card">
                            {visual.imageUrl ? (
                                <img src={visual.imageUrl} alt={visual.title} />
                            ) : (
                                <div className="image-placeholder">
                                    🎨
                                </div>
                            )}
                            <div className="image-info">
                                <div className="flex-between mb-sm">
                                    <div>
                                        <span className="scene-label">
                                            {visual.scene ? `Scene ${visual.scene}` : 'Key Visual'}
                                        </span>
                                        {visual.title && (
                                            <div style={{ fontWeight: 600, marginTop: '4px' }}>{visual.title}</div>
                                        )}
                                    </div>
                                    <button className="btn btn-ghost btn-sm" onClick={() => handleRemove(visual.id)}>🗑</button>
                                </div>
                                <CopyBlock
                                    label="이미지 프롬프트"
                                    content={visual.prompt}
                                    id={`kv-${visual.id}`}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
