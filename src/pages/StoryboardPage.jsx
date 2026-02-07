import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { updateStoryboard } from '../db';
import { CopyBlock } from '../components/CopyBlock';

export default function StoryboardPage() {
    const { project, reload } = useOutletContext();
    const [frames, setFrames] = useState(project?.storyboard?.frames || []);
    const [editingIdx, setEditingIdx] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setFrames(project?.storyboard?.frames || []);
    }, [project]);

    async function handleSave() {
        setSaving(true);
        await updateStoryboard(project.id, frames);
        await reload();
        setEditingIdx(null);
        setSaving(false);
    }

    function addFrame() {
        const newFrame = {
            number: frames.length + 1,
            shot: '',
            description: '',
            camera: '',
            duration: '',
            audio: '',
            imageUrl: '',
        };
        setFrames([...frames, newFrame]);
        setEditingIdx(frames.length);
    }

    function updateFrame(idx, field, value) {
        const updated = [...frames];
        updated[idx] = { ...updated[idx], [field]: value };
        setFrames(updated);
    }

    function removeFrame(idx) {
        const updated = frames.filter((_, i) => i !== idx);
        updated.forEach((f, i) => { f.number = i + 1; });
        setFrames(updated);
    }

    function getFrameText(frame) {
        let text = `[프레임 ${frame.number}]`;
        if (frame.shot) text += ` — ${frame.shot}`;
        text += '\n';
        if (frame.description) text += `설명: ${frame.description}\n`;
        if (frame.camera) text += `카메라: ${frame.camera}\n`;
        if (frame.duration) text += `길이: ${frame.duration}\n`;
        if (frame.audio) text += `오디오: ${frame.audio}`;
        return text.trim();
    }

    return (
        <div className="section" style={{ animation: 'fadeIn 300ms ease' }}>
            <div className="flex-between mb-lg">
                <div className="section-title">
                    <span className="section-icon">🎬</span>
                    스토리보드
                    {frames.length > 0 && (
                        <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 400 }}>
                            ({frames.length}개 프레임)
                        </span>
                    )}
                </div>
                <div className="flex gap-sm">
                    <button className="btn btn-secondary btn-sm" onClick={addFrame}>＋ 프레임 추가</button>
                    {frames.length > 0 && (
                        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                            {saving ? '저장 중...' : '💾 저장'}
                        </button>
                    )}
                </div>
            </div>

            {frames.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🎬</div>
                    <h3>스토리보드 프레임을 추가해주세요</h3>
                    <p>각 프레임별 샷, 카메라, 오디오 정보를 관리해요</p>
                    <button className="btn btn-primary" onClick={addFrame}>첫 프레임 추가하기</button>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                    gap: 'var(--space-md)',
                }}>
                    {frames.map((frame, idx) => (
                        <div key={idx} className="image-card">
                            {frame.imageUrl ? (
                                <img src={frame.imageUrl} alt={`Frame ${frame.number}`} />
                            ) : (
                                <div className="image-placeholder">
                                    <span>{frame.number}</span>
                                </div>
                            )}
                            <div className="image-info">
                                <div className="flex-between mb-sm">
                                    <span className="scene-label">프레임 {frame.number}</span>
                                    <div className="flex gap-sm">
                                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}>
                                            {editingIdx === idx ? '접기' : '✏️'}
                                        </button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => removeFrame(idx)}>🗑</button>
                                    </div>
                                </div>

                                {editingIdx === idx ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                        <input className="form-input" value={frame.shot} onChange={(e) => updateFrame(idx, 'shot', e.target.value)} placeholder="샷 타입 (예: CU, WS, MS...)" />
                                        <textarea className="form-textarea" value={frame.description} onChange={(e) => updateFrame(idx, 'description', e.target.value)} placeholder="장면 설명..." rows={3} />
                                        <input className="form-input" value={frame.camera} onChange={(e) => updateFrame(idx, 'camera', e.target.value)} placeholder="카메라 움직임" />
                                        <input className="form-input" value={frame.duration} onChange={(e) => updateFrame(idx, 'duration', e.target.value)} placeholder="길이 (예: 3초)" />
                                        <input className="form-input" value={frame.audio} onChange={(e) => updateFrame(idx, 'audio', e.target.value)} placeholder="오디오 / 사운드" />
                                        <input className="form-input" value={frame.imageUrl} onChange={(e) => updateFrame(idx, 'imageUrl', e.target.value)} placeholder="이미지 URL (선택)" />
                                    </div>
                                ) : (
                                    <CopyBlock content={getFrameText(frame)} id={`frame-${idx}`} />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
