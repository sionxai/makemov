const STAGE_LABELS = {
    synopsis: '시놉시스',
    screenplay: '시나리오',
    conti: '줄콘티',
};

const STAGE_DEPENDENCIES = {
    synopsis: null,
    screenplay: 'synopsis',
    conti: 'screenplay',
};

export const SYNOPSIS_SYSTEM_PROMPT = `You are makemov's synopsis pipeline.

Return only valid JSON that matches the provided schema.
Write all human-readable prose in Korean.
Use the synopsis skill rules:
- create a production-ready synopsis from a short idea
- include title, logline, theme, 4-act structure, 3 or more major characters
- include visual tone, sound direction, and 5 or more key scenes
- prioritize visual, shootable language over abstract interior monologue
- make reasonable assumptions when the user leaves gaps
- keep field names exactly as defined in the schema
- set status to draft`;

export const SCREENPLAY_SYSTEM_PROMPT = `You are makemov's screenplay pipeline.

Return only valid JSON that matches the provided schema.
Write all scene text in Korean.
Use the screenplay skill rules:
- convert the approved synopsis into a shootable scene list
- respect runtime-driven density and scene count
- keep scene numbering sequential from S1
- include heading, action, dialogue, and notes for every scene
- notes must include runtime hints and directing intent
- prefer externalized action and concise dialogue over exposition
- set status to draft`;

export const CONTI_SYSTEM_PROMPT = `You are makemov's line conti pipeline.

Return only valid JSON that matches the provided schema.
Write Korean for visual, dialogue, and audio fields.
Use the storyboard skill rules:
- convert screenplay scenes into cut-based line conti
- preserve scene order and timing continuity
- include shot, angle, camera_move, visual, dialogue, sfx, bgm, transition_out
- generate photorealistic cinematic sketch_prompt strings when enabled
- promptContext is for UI display and should summarize era, culture, negatives
- set status to draft`;

export const SYNOPSIS_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['uid', 'rev', 'status', 'title', 'titleEn', 'info', 'logline', 'theme', 'acts', 'characters', 'visualTone', 'sound', 'keyScenes'],
    properties: {
        uid: { type: 'string' },
        rev: { type: 'string' },
        status: { type: 'string', enum: ['draft', 'review', 'approved', 'locked', 'rejected'] },
        title: { type: 'string' },
        titleEn: { type: 'string' },
        info: {
            type: 'object',
            additionalProperties: false,
            required: ['genre', 'runtime', 'tone', 'audience', 'format'],
            properties: {
                genre: { type: 'string' },
                runtime: { type: 'string' },
                tone: { type: 'string' },
                audience: { type: 'string' },
                format: { type: 'string' },
            },
        },
        logline: { type: 'string' },
        theme: { type: 'string' },
        acts: {
            type: 'array',
            minItems: 4,
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['title', 'subtitle', 'content'],
                properties: {
                    title: { type: 'string' },
                    subtitle: { type: 'string' },
                    content: { type: 'string' },
                },
            },
        },
        characters: {
            type: 'array',
            minItems: 3,
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['name', 'nameHanja', 'role', 'age', 'appearance', 'personality', 'motivation', 'arc'],
                properties: {
                    name: { type: 'string' },
                    nameHanja: { type: 'string' },
                    role: { type: 'string' },
                    age: { type: 'string' },
                    appearance: { type: 'string' },
                    personality: { type: 'string' },
                    motivation: { type: 'string' },
                    arc: { type: 'string' },
                },
            },
        },
        visualTone: {
            type: 'object',
            additionalProperties: false,
            required: ['palette', 'lighting', 'camera', 'references'],
            properties: {
                palette: { type: 'string' },
                lighting: { type: 'string' },
                camera: { type: 'string' },
                references: { type: 'string' },
            },
        },
        sound: {
            type: 'object',
            additionalProperties: false,
            required: ['bgm', 'sfx', 'narration'],
            properties: {
                bgm: { type: 'string' },
                sfx: { type: 'string' },
                narration: { type: 'string' },
            },
        },
        keyScenes: {
            type: 'array',
            minItems: 5,
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['title', 'description'],
                properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                },
            },
        },
    },
};

export const SCREENPLAY_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['uid', 'parent_uid', 'rev', 'status', 'scenes'],
    properties: {
        uid: { type: 'string' },
        parent_uid: { type: 'string' },
        rev: { type: 'string' },
        status: { type: 'string', enum: ['draft', 'review', 'approved', 'locked', 'rejected'] },
        scenes: {
            type: 'array',
            minItems: 1,
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['uid', 'parent_uid', 'rev', 'status', 'number', 'scene_id', 'heading', 'action', 'dialogue', 'notes'],
                properties: {
                    uid: { type: 'string' },
                    parent_uid: { type: 'string' },
                    rev: { type: 'string' },
                    status: { type: 'string', enum: ['draft', 'review', 'approved', 'locked', 'rejected'] },
                    number: { type: 'number' },
                    scene_id: { type: 'string' },
                    heading: { type: 'string' },
                    action: { type: 'string' },
                    dialogue: { type: 'string' },
                    notes: { type: 'string' },
                },
            },
        },
    },
};

export const CONTI_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['uid', 'parent_uid', 'rev', 'status', 'title', 'totalDuration', 'promptContext', 'scenes', 'assumptions'],
    properties: {
        uid: { type: 'string' },
        parent_uid: { type: 'string' },
        rev: { type: 'string' },
        status: { type: 'string', enum: ['draft', 'review', 'approved', 'locked', 'rejected'] },
        title: { type: 'string' },
        totalDuration: { type: 'string' },
        promptContext: {
            type: 'object',
            additionalProperties: false,
            required: ['era', 'culture', 'negatives'],
            properties: {
                era: { type: 'string' },
                culture: { type: 'string' },
                negatives: { type: 'string' },
            },
        },
        scenes: {
            type: 'array',
            minItems: 1,
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['uid', 'scene_id', 'heading', 'scene_tc_start', 'scene_tc_end', 'cuts'],
                properties: {
                    uid: { type: 'string' },
                    scene_id: { type: 'string' },
                    heading: { type: 'string' },
                    scene_tc_start: { type: 'string' },
                    scene_tc_end: { type: 'string' },
                    cuts: {
                        type: 'array',
                        minItems: 1,
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            required: ['cut_id', 'uid', 'parent_uid', 'rev', 'status', 'tc_start', 'tc_end', 'duration_sec', 'shot', 'angle', 'camera_move', 'visual', 'dialogue', 'sfx', 'bgm', 'transition_out', 'sketch_prompt', 'keyvisual_priority'],
                            properties: {
                                cut_id: { type: 'string' },
                                uid: { type: 'string' },
                                parent_uid: { type: 'string' },
                                rev: { type: 'string' },
                                status: { type: 'string', enum: ['draft', 'review', 'approved', 'locked', 'rejected'] },
                                tc_start: { type: 'string' },
                                tc_end: { type: 'string' },
                                duration_sec: { type: 'number' },
                                shot: { type: 'string' },
                                angle: { type: 'string' },
                                camera_move: { type: 'string' },
                                visual: { type: 'string' },
                                dialogue: { type: 'string' },
                                sfx: { type: 'string' },
                                bgm: { type: 'string' },
                                transition_out: { type: 'string' },
                                sketch_prompt: { type: 'string' },
                                keyvisual_priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                            },
                        },
                    },
                },
            },
        },
        assumptions: {
            type: 'array',
            items: { type: 'string' },
        },
    },
};

export const STAGE_UI = {
    synopsis: {
        label: STAGE_LABELS.synopsis,
        title: 'AI 시놉시스 생성',
        description: '아이디어와 옵션을 입력하면 구조화된 시놉시스 JSON을 생성합니다.',
        promptPlaceholder: '예: 조선시대 진주성 전투를 배경으로, 패배가 예정된 전장에서 끝까지 싸우는 사람들의 존엄을 다룬 90초 시네마틱 영상을 만들고 싶다.',
    },
    screenplay: {
        label: STAGE_LABELS.screenplay,
        title: 'AI 시나리오 생성',
        description: '승인된 시놉시스를 바탕으로 씬 단위 시나리오를 생성합니다.',
        promptPlaceholder: '예: 대사는 절제하고 비주얼 액션을 강조해줘. 전투와 감정 씬의 리듬 대비를 크게 가져가.',
    },
    conti: {
        label: STAGE_LABELS.conti,
        title: 'AI 줄콘티 생성',
        description: '시나리오를 컷 리스트와 실사 프롬프트로 분해합니다.',
        promptPlaceholder: '예: 키비주얼 우선 컷은 감정 클라이맥스와 상징 장면에 배치하고, 프롬프트는 포토리얼 중심으로 정리해줘.',
    },
};

export const STAGE_OPTION_DEFS = {
    synopsis: [
        {
            key: 'genre',
            label: '장르',
            type: 'select',
            options: ['역사 드라마', '다큐멘터리', '전쟁 시네마틱', '광고/브랜디드', '판타지', 'SF'],
        },
        { key: 'runtime', label: '러닝타임', type: 'text', placeholder: '예: 90초' },
        { key: 'tone', label: '톤 & 무드', type: 'text', placeholder: '예: 비장하고 시네마틱' },
        { key: 'audience', label: '타깃 관객', type: 'text', placeholder: '예: 역사 콘텐츠 관심층' },
        { key: 'format', label: '형식', type: 'text', placeholder: '예: AI 영상 생성 기반 단편' },
        { key: 'characterCount', label: '주요 인물 수', type: 'number', min: 3, max: 8 },
    ],
    screenplay: [
        { key: 'sceneCount', label: '목표 씬 수', type: 'number', min: 3, max: 30 },
        {
            key: 'dialogueWeight',
            label: '대사 비중',
            type: 'select',
            options: ['낮음', '균형', '높음'],
        },
        {
            key: 'pacing',
            label: '전개 속도',
            type: 'select',
            options: ['빠름', '균형', '느림'],
        },
        {
            key: 'includeNotes',
            label: '연출 노트 포함',
            type: 'checkbox',
        },
    ],
    conti: [
        {
            key: 'cutDensity',
            label: '컷 밀도',
            type: 'select',
            options: ['느림', '보통', '빠름'],
        },
        {
            key: 'keyvisualPriority',
            label: '키비주얼 우선 기준',
            type: 'select',
            options: ['감정 클라이맥스', '액션 하이라이트', '세계관 확립'],
        },
        {
            key: 'promptLook',
            label: '프롬프트 룩',
            type: 'select',
            options: ['포토리얼 시네마틱', '다큐멘터리 리얼리즘', '광고형 하이엔드'],
        },
        {
            key: 'autoPrompt',
            label: '실사 프롬프트 자동 생성',
            type: 'checkbox',
        },
    ],
};

export const STAGE_DEFAULT_OPTIONS = {
    synopsis: {
        genre: '역사 드라마',
        runtime: '90초',
        tone: '시네마틱',
        audience: '일반 관객',
        format: 'AI 영상 생성 기반 단편',
        characterCount: 3,
    },
    screenplay: {
        sceneCount: 8,
        dialogueWeight: '균형',
        pacing: '균형',
        includeNotes: true,
    },
    conti: {
        cutDensity: '보통',
        keyvisualPriority: '감정 클라이맥스',
        promptLook: '포토리얼 시네마틱',
        autoPrompt: true,
    },
};

const DEFAULT_ACTS = [
    { title: '도입', subtitle: '', content: '' },
    { title: '전개', subtitle: '', content: '' },
    { title: '위기', subtitle: '', content: '' },
    { title: '결말', subtitle: '', content: '' },
];

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function ensureString(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
}

function ensureNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function ensureArray(value, fallback = []) {
    return Array.isArray(value) ? value : fallback;
}

function randomHex(length) {
    const size = Math.ceil(length / 2);
    const bytes = new Uint8Array(size);

    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < size; i += 1) {
            bytes[i] = Math.floor(Math.random() * 256);
        }
    }

    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, length);
}

export function createUuidv7Like() {
    const timeHex = Date.now().toString(16).padStart(12, '0');
    const versionGroup = `7${randomHex(3)}`;
    const variantGroup = `${(8 + Math.floor(Math.random() * 4)).toString(16)}${randomHex(3)}`;
    return `${timeHex.slice(0, 8)}-${timeHex.slice(8, 12)}-${versionGroup}-${variantGroup}-${randomHex(12)}`;
}

export function incrementRevision(rev = 'r0') {
    const match = String(rev || '').match(/(\d+)/);
    const nextNumber = match ? Number(match[1]) + 1 : 1;
    return `r${nextNumber}`;
}

function nextRevision(previousData, incomingRev, forceRevisionBump = false) {
    if (forceRevisionBump && previousData?.rev) {
        return incrementRevision(previousData.rev);
    }
    if (incomingRev) return incomingRev;
    if (previousData?.rev) return previousData.rev;
    return 'r1';
}

function formatOptions(options = {}) {
    return Object.entries(options)
        .filter(([, value]) => value !== '' && value !== null && value !== undefined)
        .map(([key, value]) => `- ${key}: ${String(value)}`)
        .join('\n');
}

function extractJsonCandidate(text) {
    const source = ensureString(text).trim();
    if (!source) {
        throw new Error('AI 응답이 비어 있습니다.');
    }

    const fencedMatch = source.match(/```json\s*([\s\S]*?)```/i) || source.match(/```\s*([\s\S]*?)```/i);
    const fenced = fencedMatch?.[1]?.trim();
    if (fenced) return fenced;

    const objectStart = source.indexOf('{');
    const objectEnd = source.lastIndexOf('}');
    if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
        return source.slice(objectStart, objectEnd + 1);
    }

    const arrayStart = source.indexOf('[');
    const arrayEnd = source.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
        return source.slice(arrayStart, arrayEnd + 1);
    }

    return source;
}

export function safeParseGeneratedJson(text) {
    const candidate = extractJsonCandidate(text);
    return JSON.parse(candidate);
}

export function getStageLabel(stage) {
    return STAGE_LABELS[stage] || stage;
}

export function getStageDependency(stage) {
    return STAGE_DEPENDENCIES[stage] || null;
}

export function getStageOptionDefs(stage) {
    return STAGE_OPTION_DEFS[stage] || [];
}

export function getStageDefaultOptions(stage) {
    return clone(STAGE_DEFAULT_OPTIONS[stage] || {});
}

export function getStageSystemPrompt(stage) {
    switch (stage) {
        case 'synopsis':
            return SYNOPSIS_SYSTEM_PROMPT;
        case 'screenplay':
            return SCREENPLAY_SYSTEM_PROMPT;
        case 'conti':
            return CONTI_SYSTEM_PROMPT;
        default:
            return '';
    }
}

export function getStageSchema(stage) {
    switch (stage) {
        case 'synopsis':
            return SYNOPSIS_SCHEMA;
        case 'screenplay':
            return SCREENPLAY_SCHEMA;
        case 'conti':
            return CONTI_SCHEMA;
        default:
            return null;
    }
}

export function createEmptyStageDocument(stage, context = {}) {
    if (stage === 'synopsis') {
        return {
            uid: createUuidv7Like(),
            rev: 'r1',
            status: 'draft',
            title: ensureString(context.projectTitle),
            titleEn: '',
            info: {
                genre: context.options?.genre || STAGE_DEFAULT_OPTIONS.synopsis.genre,
                runtime: context.options?.runtime || STAGE_DEFAULT_OPTIONS.synopsis.runtime,
                tone: context.options?.tone || STAGE_DEFAULT_OPTIONS.synopsis.tone,
                audience: context.options?.audience || STAGE_DEFAULT_OPTIONS.synopsis.audience,
                format: context.options?.format || STAGE_DEFAULT_OPTIONS.synopsis.format,
            },
            logline: '',
            theme: '',
            acts: clone(DEFAULT_ACTS),
            characters: Array.from({ length: Math.max(3, Number(context.options?.characterCount) || 3) }, () => ({
                name: '',
                nameHanja: '',
                role: '',
                age: '',
                appearance: '',
                personality: '',
                motivation: '',
                arc: '',
            })),
            visualTone: {
                palette: '',
                lighting: '',
                camera: '',
                references: '',
            },
            sound: {
                bgm: '',
                sfx: '',
                narration: '',
            },
            keyScenes: Array.from({ length: 5 }, () => ({
                title: '',
                description: '',
            })),
        };
    }

    if (stage === 'screenplay') {
        return {
            uid: createUuidv7Like(),
            parent_uid: ensureString(context.parentData?.uid),
            rev: 'r1',
            status: 'draft',
            scenes: [],
        };
    }

    if (stage === 'conti') {
        return {
            uid: createUuidv7Like(),
            parent_uid: ensureString(context.parentData?.uid),
            rev: 'r1',
            status: 'draft',
            title: context.projectTitle ? `${context.projectTitle} — 줄콘티` : '줄콘티',
            totalDuration: '',
            promptContext: {
                era: '',
                culture: '',
                negatives: '',
            },
            scenes: [],
            assumptions: [],
        };
    }

    return {};
}

function normalizeSynopsisData(data = {}, context = {}) {
    const previous = context.previousData || null;
    const empty = createEmptyStageDocument('synopsis', context);
    const acts = ensureArray(data.acts, previous?.acts || empty.acts)
        .slice(0, 12)
        .map((act, index) => ({
            title: ensureString(act?.title, DEFAULT_ACTS[index]?.title || `막 ${index + 1}`),
            subtitle: ensureString(act?.subtitle),
            content: ensureString(act?.content),
        }));

    while (acts.length < 4) {
        acts.push(clone(DEFAULT_ACTS[acts.length] || { title: `막 ${acts.length + 1}`, subtitle: '', content: '' }));
    }

    const characterCount = Math.max(
        3,
        ensureNumber(context.options?.characterCount, 0),
        ensureArray(data.characters, []).length,
        ensureArray(previous?.characters, []).length,
    );

    const characters = Array.from({ length: characterCount }, (_, index) => {
        const fallback = previous?.characters?.[index] || empty.characters[index] || {};
        const incoming = ensureArray(data.characters, [])[index] || {};
        return {
            name: ensureString(incoming.name, fallback.name || ''),
            nameHanja: ensureString(incoming.nameHanja, fallback.nameHanja || ''),
            role: ensureString(incoming.role, fallback.role || ''),
            age: ensureString(incoming.age, fallback.age || ''),
            appearance: ensureString(incoming.appearance, fallback.appearance || ''),
            personality: ensureString(incoming.personality, fallback.personality || ''),
            motivation: ensureString(incoming.motivation, fallback.motivation || ''),
            arc: ensureString(incoming.arc, fallback.arc || ''),
        };
    });

    const keySceneCount = Math.max(5, ensureArray(data.keyScenes, []).length, ensureArray(previous?.keyScenes, []).length || 0);
    const keyScenes = Array.from({ length: keySceneCount }, (_, index) => {
        const fallback = previous?.keyScenes?.[index] || empty.keyScenes[index] || {};
        const incoming = ensureArray(data.keyScenes, [])[index] || {};
        return {
            title: ensureString(incoming.title, fallback.title || ''),
            description: ensureString(incoming.description, fallback.description || ''),
        };
    });

    return {
        uid: previous?.uid || ensureString(data.uid) || empty.uid,
        rev: nextRevision(previous, ensureString(data.rev), context.forceRevisionBump),
        status: 'draft',
        title: ensureString(data.title, previous?.title || empty.title),
        titleEn: ensureString(data.titleEn, previous?.titleEn || ''),
        info: {
            genre: ensureString(data.info?.genre, previous?.info?.genre || empty.info.genre),
            runtime: ensureString(data.info?.runtime, previous?.info?.runtime || empty.info.runtime),
            tone: ensureString(data.info?.tone, previous?.info?.tone || empty.info.tone),
            audience: ensureString(data.info?.audience, previous?.info?.audience || empty.info.audience),
            format: ensureString(data.info?.format, previous?.info?.format || empty.info.format),
        },
        logline: ensureString(data.logline, previous?.logline || ''),
        theme: ensureString(data.theme, previous?.theme || ''),
        acts,
        characters,
        visualTone: {
            palette: ensureString(data.visualTone?.palette, previous?.visualTone?.palette || ''),
            lighting: ensureString(data.visualTone?.lighting, previous?.visualTone?.lighting || ''),
            camera: ensureString(data.visualTone?.camera, previous?.visualTone?.camera || ''),
            references: ensureString(data.visualTone?.references, previous?.visualTone?.references || ''),
        },
        sound: {
            bgm: ensureString(data.sound?.bgm, previous?.sound?.bgm || ''),
            sfx: ensureString(data.sound?.sfx, previous?.sound?.sfx || ''),
            narration: ensureString(data.sound?.narration, previous?.sound?.narration || ''),
        },
        keyScenes,
    };
}

function normalizeScreenplayData(data = {}, context = {}) {
    const previous = context.previousData || null;
    const empty = createEmptyStageDocument('screenplay', context);
    const rawScenes = Array.isArray(data) ? data : ensureArray(data.scenes, previous?.scenes || empty.scenes);
    const parentUid = ensureString(context.parentData?.uid, previous?.parent_uid || data.parent_uid || empty.parent_uid);
    const stageUid = previous?.uid || ensureString(data.uid) || empty.uid;
    const stageRev = nextRevision(previous, ensureString(data.rev), context.forceRevisionBump);
    const sceneRev = context.forceRevisionBump && previous?.rev ? incrementRevision(previous.rev) : stageRev;

    return {
        uid: stageUid,
        parent_uid: parentUid,
        rev: stageRev,
        status: 'draft',
        scenes: rawScenes.map((scene, index) => ({
            uid: ensureString(scene?.uid) || createUuidv7Like(),
            parent_uid: parentUid,
            rev: ensureString(scene?.rev) || sceneRev,
            status: 'draft',
            number: index + 1,
            scene_id: ensureString(scene?.scene_id) || `S${index + 1}`,
            heading: ensureString(scene?.heading),
            action: ensureString(scene?.action),
            dialogue: ensureString(scene?.dialogue),
            notes: ensureString(scene?.notes),
        })),
    };
}

function normalizeContiData(data = {}, context = {}) {
    const previous = context.previousData || null;
    const empty = createEmptyStageDocument('conti', context);
    const parentUid = ensureString(context.parentData?.uid, previous?.parent_uid || data.parent_uid || empty.parent_uid);
    const stageUid = previous?.uid || ensureString(data.uid) || empty.uid;
    const stageRev = nextRevision(previous, ensureString(data.rev), context.forceRevisionBump);
    const incomingScenes = ensureArray(data.scenes, previous?.scenes || empty.scenes);

    return {
        uid: stageUid,
        parent_uid: parentUid,
        rev: stageRev,
        status: 'draft',
        title: ensureString(data.title, previous?.title || empty.title),
        totalDuration: ensureString(data.totalDuration, previous?.totalDuration || ''),
        promptContext: {
            era: ensureString(data.promptContext?.era, previous?.promptContext?.era || ''),
            culture: ensureString(data.promptContext?.culture, previous?.promptContext?.culture || ''),
            negatives: ensureString(data.promptContext?.negatives, previous?.promptContext?.negatives || ''),
        },
        scenes: incomingScenes.map((scene, sceneIndex) => {
            const sceneUid = ensureString(scene?.uid) || createUuidv7Like();
            return {
                uid: sceneUid,
                scene_id: ensureString(scene?.scene_id) || `S${sceneIndex + 1}`,
                heading: ensureString(scene?.heading),
                scene_tc_start: ensureString(scene?.scene_tc_start),
                scene_tc_end: ensureString(scene?.scene_tc_end),
                cuts: ensureArray(scene?.cuts).map((cut, cutIndex) => ({
                    cut_id: ensureString(cut?.cut_id) || `S${sceneIndex + 1}-C${cutIndex + 1}`,
                    uid: ensureString(cut?.uid) || createUuidv7Like(),
                    parent_uid: ensureString(cut?.parent_uid) || sceneUid,
                    rev: ensureString(cut?.rev) || stageRev,
                    status: 'draft',
                    tc_start: ensureString(cut?.tc_start),
                    tc_end: ensureString(cut?.tc_end),
                    duration_sec: ensureNumber(cut?.duration_sec, 0),
                    shot: ensureString(cut?.shot),
                    angle: ensureString(cut?.angle),
                    camera_move: ensureString(cut?.camera_move),
                    visual: ensureString(cut?.visual),
                    dialogue: ensureString(cut?.dialogue),
                    sfx: ensureString(cut?.sfx),
                    bgm: ensureString(cut?.bgm),
                    transition_out: ensureString(cut?.transition_out, 'CUT TO'),
                    sketch_prompt: ensureString(cut?.sketch_prompt),
                    keyvisual_priority: ensureString(cut?.keyvisual_priority, 'low'),
                })),
            };
        }),
        assumptions: ensureArray(data.assumptions, previous?.assumptions || []).map((item) => ensureString(item)),
    };
}

export function normalizeGeneratedStageData(stage, data, context = {}) {
    switch (stage) {
        case 'synopsis':
            return normalizeSynopsisData(data, context);
        case 'screenplay':
            return normalizeScreenplayData(data, context);
        case 'conti':
            return normalizeContiData(data, context);
        default:
            return data;
    }
}

export function parseStageResponse(stage, text, context = {}) {
    const parsed = safeParseGeneratedJson(text);
    return normalizeGeneratedStageData(stage, parsed, context);
}

export function buildStageUserPrompt(stage, { projectTitle = '', userPrompt = '', options = {}, inputData = null } = {}) {
    const promptLines = [
        `프로젝트 제목: ${projectTitle || '제목 미정'}`,
        '',
        '사용자 추가 지시:',
        userPrompt.trim() || '추가 지시 없음. 기본 규칙에 따라 최선의 결과를 생성.',
        '',
        '옵션:',
        formatOptions(options) || '- 없음',
    ];

    if (stage === 'synopsis') {
        return `${promptLines.join('\n')}

작업:
- 아이디어를 바탕으로 구조화된 시놉시스를 작성한다.
- 4막 구조를 명확히 만들고, 최소 3명의 주요 인물과 5개의 핵심 장면을 포함한다.
- 레퍼런스를 모를 경우 톤/질감/카메라 언어로 대체한다.
- 응답은 반드시 JSON만 반환한다.`;
    }

    if (stage === 'screenplay') {
        return `${promptLines.join('\n')}

입력 시놉시스 JSON:
${JSON.stringify(inputData || {}, null, 2)}

작업:
- 시놉시스를 씬 단위 시나리오로 변환한다.
- 씬 번호와 scene_id를 순차적으로 유지한다.
- notes에는 러닝타임 힌트와 연출 키워드를 포함한다.
- 응답은 반드시 JSON만 반환한다.`;
    }

    if (stage === 'conti') {
        return `${promptLines.join('\n')}

입력 시나리오 JSON:
${JSON.stringify(inputData || {}, null, 2)}

작업:
- 각 씬을 컷으로 분해하고 컷별 실사 프롬프트를 생성한다.
- promptContext는 시대, 문화, 부정어를 한 줄씩 정리한다.
- autoPrompt가 true면 sketch_prompt를 빈칸으로 두지 않는다.
- 응답은 반드시 JSON만 반환한다.`;
    }

    return promptLines.join('\n');
}
