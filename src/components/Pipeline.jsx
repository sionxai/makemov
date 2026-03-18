import { NavLink } from 'react-router-dom';
import { getStageStatus } from '../services/approvalService';

const PIPELINE_STEPS = [
    { key: 'synopsis', label: '시놉시스', icon: '📄', path: 'synopsis' },
    { key: 'characters', label: '캐릭터', icon: '👤', path: 'characters' },
    { key: 'screenplay', label: '시나리오', icon: '📝', path: 'screenplay' },
    { key: 'conti', label: '줄콘티', icon: '📋', path: 'conti' },
    { key: 'storyboard', label: '스토리보드', icon: '🎬', path: 'storyboard' },
    { key: 'keyvisual', label: '키비주얼', icon: '🎨', path: 'keyvisual' },
    { key: 'prompts', label: '프롬프트', icon: '🎥', path: 'prompts' },
];

export function Pipeline({ projectId, project }) {
    const getStepStatus = (key) => {
        if (!project) return '';
        switch (key) {
            case 'synopsis':
                return project.synopsis?.content || project.synopsis?.structured ? 'completed' : '';
            case 'characters':
                return project.characterSheets?.length > 0 ? 'completed' : '';
            case 'screenplay':
                return project.screenplay?.scenes?.length > 0 ? 'completed' : '';
            case 'conti':
                return project.conti?.scenes?.length > 0 ? 'completed' : '';
            case 'storyboard':
                return project.storyboard?.frames?.length > 0 ? 'completed' : '';
            case 'keyvisual':
                return project.keyvisuals?.length > 0 ? 'completed' : '';
            case 'prompts':
                return project.productionPrompts?.length > 0 ? 'completed' : '';
            default:
                return '';
        }
    };

    const getApprovalClass = (key) => {
        if (!['synopsis', 'screenplay', 'conti'].includes(key)) return '';
        return `pipeline-step--${getStageStatus(project, key)}`;
    };

    const getStatusBadge = (key) => {
        if (!['synopsis', 'screenplay', 'conti'].includes(key)) return null;

        const status = getStageStatus(project, key);
        const labels = {
            draft: '초안',
            review: '검토',
            approved: '승인',
            locked: '잠금',
            rejected: '반려',
        };

        return (
            <span className={`pipeline-badge pipeline-badge--${status}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="pipeline">
            {PIPELINE_STEPS.map((step, i) => (
                <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <NavLink
                        to={`/project/${projectId}/${step.path}`}
                        className={({ isActive }) =>
                            `pipeline-step ${isActive ? 'active' : ''} ${getStepStatus(step.key)} ${getApprovalClass(step.key)}`
                        }
                    >
                        <span>{step.icon}</span>
                        <span>{step.label}</span>
                        {getStatusBadge(step.key)}
                        {getStepStatus(step.key) === 'completed' && <span style={{ fontSize: '0.7rem' }}>✓</span>}
                    </NavLink>
                    {i < PIPELINE_STEPS.length - 1 && <span className="pipeline-arrow">→</span>}
                </div>
            ))}
        </div>
    );
}

export { PIPELINE_STEPS };
