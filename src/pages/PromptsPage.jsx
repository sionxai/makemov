import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { addProductionPrompt, removeProductionPrompt } from '../db';
import { CopyBlock, CopyBlockCode } from '../components/CopyBlock';

const PROMPT_TYPES = [
    { value: 'sora', label: 'Sora', icon: '🎬' },
    { value: 'runway', label: 'Runway', icon: '🎥' },
    { value: 'pika', label: 'Pika', icon: '✨' },
    { value: 'midjourney', label: 'Midjourney', icon: '🎨' },
    { value: 'other', label: '기타', icon: '📝' },
];

export default function PromptsPage() {
    const { project, reload } = useOutletContext();
    const [prompts, setPrompts] = useState(project?.productionPrompts || []);
    const [showAdd, setShowAdd] = useState(false);
    const [newPrompt, setNewPrompt] = useState({ type: 'sora', content: '', scene: '', label: '' });
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        setPrompts(project?.productionPrompts || []);
    }, [project]);

    async function handleAdd() {
        if (!newPrompt.content.trim()) return;
        await addProductionPrompt(project.id, newPrompt);
        await reload();
        setNewPrompt({ type: 'sora', content: '', scene: '', label: '' });
        setShowAdd(false);
    }

    async function handleRemove(promptId) {
        await removeProductionPrompt(project.id, promptId);
        await reload();
    }

    const filteredPrompts = filter === 'all'
        ? prompts
        : prompts.filter(p => p.type === filter);

    const getTypeInfo = (type) => PROMPT_TYPES.find(t => t.value === type) || PROMPT_TYPES[4];

    return (
        <div className="section" style={{ animation: 'fadeIn 300ms ease' }}>
            <div className="flex-between mb-lg">
                <div className="section-title">
                    <span className="section-icon">🎥</span>
                    영상제작 프롬프트
                    {prompts.length > 0 && (
                        <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 400 }}>
                            ({prompts.length}개)
                        </span>
                    )}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAdd(!showAdd)}>
                    {showAdd ? '취소' : '＋ 프롬프트 추가'}
                </button>
            </div>

            {/* Filter tabs */}
            {prompts.length > 0 && (
                <div className="flex gap-sm mb-lg" style={{ flexWrap: 'wrap' }}>
                    <button
                        className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setFilter('all')}
                    >
                        전체 ({prompts.length})
                    </button>
                    {PROMPT_TYPES.map(type => {
                        const count = prompts.filter(p => p.type === type.value).length;
                        if (count === 0) return null;
                        return (
                            <button
                                key={type.value}
                                className={`btn btn-sm ${filter === type.value ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setFilter(type.value)}
                            >
                                {type.icon} {type.label} ({count})
                            </button>
                        );
                    })}
                </div>
            )}

            {showAdd && (
                <div className="card mb-lg" style={{ borderColor: 'var(--border-active)' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>새 프롬프트</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                <label className="form-label">플랫폼</label>
                                <select className="form-select" value={newPrompt.type} onChange={(e) => setNewPrompt({ ...newPrompt, type: e.target.value })}>
                                    {PROMPT_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                <label className="form-label">씬 번호</label>
                                <input className="form-input" value={newPrompt.scene} onChange={(e) => setNewPrompt({ ...newPrompt, scene: e.target.value })} placeholder="예: 1" />
                            </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">라벨 (선택)</label>
                            <input className="form-input" value={newPrompt.label} onChange={(e) => setNewPrompt({ ...newPrompt, label: e.target.value })} placeholder="예: 오프닝 시퀀스" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">프롬프트 *</label>
                            <textarea
                                className="form-textarea font-mono"
                                value={newPrompt.content}
                                onChange={(e) => setNewPrompt({ ...newPrompt, content: e.target.value })}
                                placeholder="영상 생성 프롬프트를 작성하세요..."
                                rows={6}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-primary" onClick={handleAdd} disabled={!newPrompt.content.trim()}>추가</button>
                        </div>
                    </div>
                </div>
            )}

            {filteredPrompts.length === 0 && !showAdd ? (
                <div className="empty-state">
                    <div className="empty-icon">🎥</div>
                    <h3>영상제작 프롬프트를 추가해주세요</h3>
                    <p>Sora, Runway 등 영상 생성 AI에 사용할 프롬프트를 관리해요</p>
                    <button className="btn btn-primary" onClick={() => setShowAdd(true)}>첫 프롬프트 추가하기</button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {filteredPrompts.map((prompt) => {
                        const typeInfo = getTypeInfo(prompt.type);
                        return (
                            <div key={prompt.id} className="card" style={{ padding: 'var(--space-lg)' }}>
                                <div className="flex-between mb-md">
                                    <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                                        <span style={{
                                            padding: '2px 10px',
                                            borderRadius: '20px',
                                            background: 'rgba(108,92,231,0.15)',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            color: 'var(--accent-primary-light)',
                                        }}>
                                            {typeInfo.icon} {typeInfo.label}
                                        </span>
                                        {prompt.scene && (
                                            <span className="text-muted" style={{ fontSize: '0.8rem' }}>Scene {prompt.scene}</span>
                                        )}
                                        {prompt.label && (
                                            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{prompt.label}</span>
                                        )}
                                    </div>
                                    <button className="btn btn-ghost btn-sm" onClick={() => handleRemove(prompt.id)}>🗑</button>
                                </div>
                                <CopyBlockCode
                                    label={`${typeInfo.label} 프롬프트`}
                                    content={prompt.content}
                                    id={`prompt-${prompt.id}`}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
