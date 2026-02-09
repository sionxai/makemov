import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllProjects, createProject, deleteProject, seedJinjuProject, seedRedcliffProject, seedDongnaeProject, seedChilcheonProject, seedJinju2Project } from '../db';
import { getFirestoreProjects } from '../firebase/projectStore';
import { CreateProjectModal, ConfirmModal } from '../components/Modal';

export default function Dashboard() {
    const [projects, setProjects] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const loadProjects = useCallback(async () => {
        setLoading(true);
        await seedJinjuProject(); // 시드 데이터 자동 생성 (이미 있으면 무시)
        await seedDongnaeProject(); // 동래성 전투 시드
        await seedChilcheonProject(); // 칠천량 해전 시드
        await seedRedcliffProject(); // 적벽대전 시드
        await seedJinju2Project(); // 2차 진주성전투 시드
        const localData = await getAllProjects();

        // Firestore에서 외부 AI가 생성한 프로젝트도 불러온다
        let cloudData = [];
        try {
            cloudData = await getFirestoreProjects();
        } catch (err) {
            console.warn('[Dashboard] Firestore 조회 실패 (로컬만 표시):', err?.message);
        }

        // 로컬 + 클라우드 병합 (제목 기준 중복 제거, 로컬 우선)
        const localTitles = new Set(localData.map(p => p.title));
        const merged = [
            ...localData,
            ...cloudData.filter(p => !localTitles.has(p.title)).map(p => ({ ...p, _source: 'cloud' })),
        ];

        setProjects(merged);
        setLoading(false);
    }, []);

    // Initial sync from IndexedDB.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadProjects();
    }, [loadProjects]);

    async function handleCreate(title, description) {
        const project = await createProject(title, description);
        navigate(`/project/${project.id}/synopsis`);
    }

    async function handleDelete() {
        if (deleteTarget) {
            await deleteProject(deleteTarget);
            setDeleteTarget(null);
            loadProjects();
        }
    }

    function getCompletionCount(project) {
        let count = 0;
        if (project.synopsis?.content || project.synopsis?.structured) count++;
        if (project.screenplay?.scenes?.length > 0) count++;
        if (project.conti?.scenes?.length > 0) count++;
        if (project.storyboard?.frames?.length > 0) count++;
        if (project.keyvisuals?.length > 0) count++;
        if (project.productionPrompts?.length > 0) count++;
        return count;
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    const statusLabels = {
        draft: { label: '초안', className: 'status-draft' },
        progress: { label: '진행 중', className: 'status-progress' },
        complete: { label: '완료', className: 'status-complete' },
    };

    return (
        <div>
            <div className="page-header flex-between">
                <div>
                    <h1>프로젝트</h1>
                    <p className="subtitle">아이디어에서 영상까지, 모든 과정을 관리합니다</p>
                </div>
                <button className="btn btn-primary btn-lg" onClick={() => setShowCreate(true)}>
                    <span>＋</span> 새 프로젝트
                </button>
            </div>

            {loading ? (
                <div className="empty-state">
                    <div style={{ animation: 'pulse 1.5s infinite' }}>로딩중...</div>
                </div>
            ) : projects.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🎬</div>
                    <h3>아직 프로젝트가 없어요</h3>
                    <p>새 프로젝트를 만들어서 영상 제작을 시작해보세요</p>
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                        첫 프로젝트 만들기
                    </button>
                </div>
            ) : (
                <div className="card-grid">
                    {projects.map(project => (
                        <div
                            key={project.id}
                            className="project-card"
                            onClick={() => navigate(`/project/${project.id}/synopsis`)}
                        >
                            <div className="flex-between" style={{ marginBottom: 'var(--space-sm)' }}>
                                <span className={`project-status ${statusLabels[project.status]?.className || 'status-draft'}`}>
                                    {statusLabels[project.status]?.label || '초안'}
                                </span>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteTarget(project.id);
                                    }}
                                    title="삭제"
                                >
                                    🗑
                                </button>
                            </div>
                            <h3 className="project-title">{project.title}</h3>
                            {project.description && (
                                <p className="project-desc">{project.description}</p>
                            )}
                            <div className="project-meta">
                                <span>{formatDate(project.updatedAt)}</span>
                                <span>·</span>
                                <span>진행 {getCompletionCount(project)}/6</span>
                                <div style={{ flex: 1 }} />
                                <div style={{
                                    display: 'flex',
                                    gap: '2px',
                                }}>
                                    {['synopsis', 'screenplay', 'conti', 'storyboard', 'keyvisual', 'prompts'].map((step, i) => {
                                        const filled = [
                                            project.synopsis?.content || project.synopsis?.structured,
                                            project.screenplay?.scenes?.length > 0,
                                            project.conti?.scenes?.length > 0,
                                            project.storyboard?.frames?.length > 0,
                                            project.keyvisuals?.length > 0,
                                            project.productionPrompts?.length > 0,
                                        ][i];
                                        return (
                                            <div
                                                key={step}
                                                style={{
                                                    width: '20px',
                                                    height: '4px',
                                                    borderRadius: '2px',
                                                    background: filled ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <CreateProjectModal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                onCreate={handleCreate}
            />

            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="프로젝트 삭제"
                message="이 프로젝트를 삭제하면 모든 데이터가 영구적으로 사라집니다. 정말 삭제하시겠습니까?"
            />
        </div>
    );
}
