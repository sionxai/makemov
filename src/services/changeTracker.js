const PIPELINE_ORDER = ['synopsis', 'screenplay', 'conti', 'storyboard', 'keyvisual', 'prompts'];
const PROJECT_FIELD_BY_STAGE = {
    keyvisual: 'keyvisuals',
    prompts: 'productionPrompts',
};

function hasStageData(stage, section) {
    if (!section) return false;
    switch (stage) {
        case 'synopsis':
            return Boolean(section.structured || section.content);
        case 'screenplay':
            return Array.isArray(section.scenes) && section.scenes.length > 0;
        case 'conti':
            return Array.isArray(section.scenes) && section.scenes.length > 0;
        case 'storyboard':
            return Array.isArray(section.frames) && section.frames.length > 0;
        case 'keyvisual':
            return Array.isArray(section) ? section.length > 0 : Array.isArray(section.assets) && section.assets.length > 0;
        case 'prompts':
            return Array.isArray(section) ? section.length > 0 : Array.isArray(section.items) && section.items.length > 0;
        default:
            return false;
    }
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function applyReviewStatus(stage, section, changedStage, changedAt) {
    if (Array.isArray(section)) {
        return section.map((item) => ({
            ...item,
            status: 'review',
            upstreamChanged: {
                sourceStage: changedStage,
                changedAt,
            },
        }));
    }

    const next = clone(section);
    next.status = 'review';
    next.upstreamChanged = {
        sourceStage: changedStage,
        changedAt,
    };

    if (stage === 'screenplay') {
        next.scenes = (next.scenes || []).map((scene) => ({ ...scene, status: 'review' }));
    }

    if (stage === 'conti') {
        next.scenes = (next.scenes || []).map((scene) => ({
            ...scene,
            cuts: (scene.cuts || []).map((cut) => ({ ...cut, status: 'review' })),
        }));
    }

    if (stage === 'synopsis' && next.structured) {
        next.structured = { ...next.structured, status: 'review' };
    }

    if (stage === 'storyboard') {
        next.frames = (next.frames || []).map((frame) => ({ ...frame, status: 'review' }));
        if (next.sketches && typeof next.sketches === 'object') {
            next.sketches = Object.fromEntries(
                Object.entries(next.sketches).map(([key, sketch]) => [
                    key,
                    { ...sketch, status: 'review' },
                ]),
            );
        }
    }

    return next;
}

export function getDownstreamStages(stage) {
    const index = PIPELINE_ORDER.indexOf(stage);
    if (index === -1) return [];
    return PIPELINE_ORDER.slice(index + 1);
}

export function buildDownstreamImpactPayload(project, changedStage, changedAt = new Date().toISOString()) {
    const payload = {};

    getDownstreamStages(changedStage)
        .forEach((stage) => {
            const field = PROJECT_FIELD_BY_STAGE[stage] || stage;
            const section = project?.[field];
            if (!hasStageData(stage, section)) return;
            payload[field] = applyReviewStatus(stage, section, changedStage, changedAt);
        });

    return payload;
}

export function getStageImpact(project, stage) {
    return project?.[stage]?.upstreamChanged || null;
}
