import { useState, useEffect, useCallback } from 'react';
import { useParams, Outlet, useNavigate } from 'react-router-dom';
import { getFirestoreProject, updateFirestoreProject } from '../firebase/projectStore';
import { Pipeline } from '../components/Pipeline';

export default function ProjectLayout() {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const loadProject = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getFirestoreProject(id);
            if (!data) {
                setLoading(false);
                navigate('/');
                return;
            }
            setProject(data);
        } catch (err) {
            console.error('[ProjectLayout] 프로젝트 로딩 실패:', err?.message);
            navigate('/');
        }
        setLoading(false);
    }, [id, navigate]);

    useEffect(() => {
        loadProject();
    }, [loadProject]);

    async function handleProjectUpdate(updates) {
        try {
            const updated = await updateFirestoreProject(id, updates);
            setProject(updated);
            return updated;
        } catch (err) {
            console.error('[ProjectLayout] 업데이트 실패:', err?.message);
            return project;
        }
    }

    if (loading) {
        return <div className="empty-state"><div style={{ animation: 'pulse 1.5s infinite' }}>로딩중...</div></div>;
    }

    if (!project) return null;

    return (
        <div>
            <div className="page-header">
                <div className="flex-between">
                    <div>
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => navigate('/')}
                            style={{ marginBottom: 'var(--space-sm)' }}
                        >
                            ← 프로젝트 목록
                        </button>
                        <h1>{project.title}</h1>
                        {project.description && <p className="subtitle">{project.description}</p>}
                    </div>
                    <div className="flex gap-sm">
                        <select
                            className="form-select"
                            value={project.status}
                            onChange={(e) => handleProjectUpdate({ status: e.target.value })}
                            style={{ width: 'auto' }}
                        >
                            <option value="draft">초안</option>
                            <option value="progress">진행 중</option>
                            <option value="complete">완료</option>
                        </select>
                    </div>
                </div>
            </div>

            <Pipeline projectId={id} project={project} />

            <Outlet
                key={`${id}:${project.updatedAt || ''}`}
                context={{ project, setProject, onUpdate: handleProjectUpdate, reload: loadProject }}
            />
        </div>
    );
}
