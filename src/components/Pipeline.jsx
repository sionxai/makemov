import { NavLink } from 'react-router-dom';

const PIPELINE_STEPS = [
    { key: 'synopsis', label: '시놉시스', icon: '📄', path: 'synopsis' },
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

    return (
        <div className="pipeline">
            {PIPELINE_STEPS.map((step, i) => (
                <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <NavLink
                        to={`/project/${projectId}/${step.path}`}
                        className={({ isActive }) =>
                            `pipeline-step ${isActive ? 'active' : ''} ${getStepStatus(step.key)}`
                        }
                    >
                        <span>{step.icon}</span>
                        <span>{step.label}</span>
                        {getStepStatus(step.key) === 'completed' && <span style={{ fontSize: '0.7rem' }}>✓</span>}
                    </NavLink>
                    {i < PIPELINE_STEPS.length - 1 && <span className="pipeline-arrow">→</span>}
                </div>
            ))}
        </div>
    );
}

export { PIPELINE_STEPS };
