import { getFirestoreProject, updateFirestoreProject } from '../firebase/projectStore';

export const VALID_TRANSITIONS = {
    draft: ['review'],
    review: ['approved', 'rejected'],
    approved: ['locked'],
    rejected: ['draft'],
    locked: [],
};

export function normalizeApprovalStatus(status, hasContent = false) {
    const normalized = String(status || '').trim();
    if (VALID_TRANSITIONS[normalized]) {
        return normalized;
    }
    return hasContent ? 'draft' : 'draft';
}

export function stageHasContent(project, stage) {
    const section = project?.[stage];
    switch (stage) {
        case 'synopsis':
            return Boolean(section?.structured || section?.content);
        case 'screenplay':
            return Array.isArray(section?.scenes) && section.scenes.length > 0;
        case 'conti':
            return Array.isArray(section?.scenes) && section.scenes.length > 0;
        default:
            return false;
    }
}

export function getStageStatus(project, stage) {
    const section = project?.[stage];
    const hasContent = stageHasContent(project, stage);

    if (section?.status) {
        return normalizeApprovalStatus(section.status, hasContent);
    }

    if (stage === 'synopsis') {
        return normalizeApprovalStatus(section?.structured?.status, hasContent);
    }

    if (stage === 'screenplay') {
        return normalizeApprovalStatus(section?.scenes?.[0]?.status, hasContent);
    }

    if (stage === 'conti') {
        return normalizeApprovalStatus(section?.scenes?.[0]?.cuts?.[0]?.status, hasContent);
    }

    return normalizeApprovalStatus('', hasContent);
}

export function canTransition(from, to) {
    if (from === to) return true;
    return VALID_TRANSITIONS[from]?.includes(to) || false;
}

export function isApprovedStatus(status) {
    return status === 'approved' || status === 'locked';
}

function applyStatusToSection(stage, section = {}, nextStatus) {
    if (stage === 'synopsis') {
        return {
            ...section,
            status: nextStatus,
            structured: section.structured
                ? { ...section.structured, status: nextStatus }
                : section.structured,
            upstreamChanged: null,
        };
    }

    if (stage === 'screenplay') {
        return {
            ...section,
            status: nextStatus,
            scenes: (section.scenes || []).map((scene) => ({
                ...scene,
                status: nextStatus,
            })),
            upstreamChanged: null,
        };
    }

    if (stage === 'conti') {
        return {
            ...section,
            status: nextStatus,
            scenes: (section.scenes || []).map((scene) => ({
                ...scene,
                cuts: (scene.cuts || []).map((cut) => ({
                    ...cut,
                    status: nextStatus,
                })),
            })),
            upstreamChanged: null,
        };
    }

    return {
        ...section,
        status: nextStatus,
        upstreamChanged: null,
    };
}

export async function transitionStatus(projectId, stage, newStatus) {
    const project = await getFirestoreProject(projectId);
    if (!project) {
        throw new Error(`Project ${projectId} not found`);
    }

    const currentStatus = getStageStatus(project, stage);
    if (!canTransition(currentStatus, newStatus)) {
        throw new Error(`상태 전환 불가: ${currentStatus} -> ${newStatus}`);
    }

    const nextSection = applyStatusToSection(stage, project[stage], newStatus);
    return updateFirestoreProject(projectId, {
        [stage]: nextSection,
    });
}
