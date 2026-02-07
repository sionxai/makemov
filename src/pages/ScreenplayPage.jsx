import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { updateScreenplay } from '../db';
import { CopyBlock } from '../components/CopyBlock';

export default function ScreenplayPage() {
    const { project, reload } = useOutletContext();
    const [scenes, setScenes] = useState(project?.screenplay?.scenes || []);
    const [editingIdx, setEditingIdx] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setScenes(project?.screenplay?.scenes || []);
    }, [project]);

    async function handleSave() {
        setSaving(true);
        await updateScreenplay(project.id, scenes);
        await reload();
        setEditingIdx(null);
        setSaving(false);
    }

    function addScene() {
        const newScene = {
            number: scenes.length + 1,
            heading: '',
            action: '',
            dialogue: '',
            notes: '',
        };
        setScenes([...scenes, newScene]);
        setEditingIdx(scenes.length);
    }

    function updateScene(idx, field, value) {
        const updated = [...scenes];
        updated[idx] = { ...updated[idx], [field]: value };
        setScenes(updated);
    }

    function removeScene(idx) {
        const updated = scenes.filter((_, i) => i !== idx);
        // Renumber
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

    function getFullSceneText(scene) {
        let text = `Scene ${scene.number}`;
        if (scene.heading) text += `: ${scene.heading}`;
        text += '\n';
        if (scene.action) text += `\n[액션]\n${scene.action}`;
        if (scene.dialogue) text += `\n\n[대사]\n${scene.dialogue}`;
        if (scene.notes) text += `\n\n[노트]\n${scene.notes}`;
        return text;
    }

    function getAllScenesText() {
        return scenes.map(getFullSceneText).join('\n\n---\n\n');
    }

    return (
        <div className="section" style={{ animation: 'fadeIn 300ms ease' }}>
            <div className="flex-between mb-lg">
                <div className="section-title">
                    <span className="section-icon">📝</span>
                    시나리오
                    {scenes.length > 0 && (
                        <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 400 }}>
                            ({scenes.length}개 씬)
                        </span>
                    )}
                </div>
                <div className="flex gap-sm">
                    <button className="btn btn-secondary btn-sm" onClick={addScene}>＋ 씬 추가</button>
                    {scenes.length > 0 && (
                        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                            {saving ? '저장 중...' : '💾 저장'}
                        </button>
                    )}
                </div>
            </div>

            {scenes.length > 0 && (
                <CopyBlock
                    label="전체 시나리오 복사"
                    content={getAllScenesText()}
                    id="screenplay-all"
                />
            )}

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
                                    Scene {scene.number}
                                    {scene.heading && `: ${scene.heading}`}
                                </h3>
                                <div className="flex gap-sm">
                                    <button className="btn btn-ghost btn-sm" onClick={() => moveScene(idx, -1)} disabled={idx === 0}>↑</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => moveScene(idx, 1)} disabled={idx === scenes.length - 1}>↓</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}>
                                        {editingIdx === idx ? '접기' : '✏️'}
                                    </button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => removeScene(idx)}>🗑</button>
                                </div>
                            </div>

                            {editingIdx === idx ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">씬 제목</label>
                                        <input
                                            className="form-input"
                                            value={scene.heading}
                                            onChange={(e) => updateScene(idx, 'heading', e.target.value)}
                                            placeholder="예: INT. 한강변 - 새벽"
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">액션 / 설명</label>
                                        <textarea
                                            className="form-textarea"
                                            value={scene.action}
                                            onChange={(e) => updateScene(idx, 'action', e.target.value)}
                                            placeholder="화면에 보이는 장면을 설명..."
                                            rows={4}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">대사</label>
                                        <textarea
                                            className="form-textarea"
                                            value={scene.dialogue}
                                            onChange={(e) => updateScene(idx, 'dialogue', e.target.value)}
                                            placeholder="캐릭터 대사..."
                                            rows={3}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">노트 / 메모</label>
                                        <textarea
                                            className="form-textarea"
                                            value={scene.notes}
                                            onChange={(e) => updateScene(idx, 'notes', e.target.value)}
                                            placeholder="연출 노트, 카메라 방향 등..."
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <CopyBlock
                                    content={getFullSceneText(scene)}
                                    id={`scene-${idx}`}
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
