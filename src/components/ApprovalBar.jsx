import { Link } from 'react-router-dom';
import { VALID_TRANSITIONS, normalizeApprovalStatus } from '../services/approvalService';
import { getStageLabel } from '../services/pipelinePrompts';

const STATUS_LABELS = {
    draft: '초안',
    review: '검토 중',
    approved: '승인',
    locked: '잠금',
    rejected: '반려',
};

const ACTION_LABELS = {
    review: '검토 요청',
    approved: '승인',
    rejected: '반려',
    locked: '잠금',
    draft: '초안으로 복귀',
};

export default function ApprovalBar({
    projectId,
    stage,
    status,
    hasContent,
    onTransition,
    transitioning = false,
    nextStage,
    impact,
}) {
    const normalizedStatus = normalizeApprovalStatus(status, hasContent);
    const actions = VALID_TRANSITIONS[normalizedStatus] || [];

    return (
        <div className="approval-bar">
            <div className="approval-bar__left">
                <div className="approval-bar__eyebrow">승인 플로우</div>
                <div className="approval-bar__status">
                    <span className={`approval-bar__badge approval-bar__badge--${normalizedStatus}`}>
                        {STATUS_LABELS[normalizedStatus] || normalizedStatus}
                    </span>
                    <span className="approval-bar__stage">{getStageLabel(stage)}</span>
                </div>
                {impact && (
                    <div className="approval-bar__impact">
                        상위 단계 변경 감지: {getStageLabel(impact.sourceStage)} 수정됨
                    </div>
                )}
            </div>

            <div className="approval-bar__right">
                {actions.map((action) => (
                    <button
                        key={action}
                        type="button"
                        className={`btn btn-sm ${action === 'approved' || action === 'review' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => onTransition(action)}
                        disabled={!hasContent || transitioning}
                    >
                        {ACTION_LABELS[action]}
                    </button>
                ))}

                {nextStage && (normalizedStatus === 'approved' || normalizedStatus === 'locked') && (
                    <Link className="btn btn-secondary btn-sm" to={`/project/${projectId}/${nextStage}`}>
                        → {getStageLabel(nextStage)}
                    </Link>
                )}
            </div>
        </div>
    );
}
