/**
 * makemov Firestore Client Store (SSOT)
 * ─────────────────────────────────────
 * Firestore = Single Source of Truth
 * 읽기 + 쓰기 모두 이 모듈을 통해 수행한다.
 */

import {
    collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
    orderBy, query,
} from 'firebase/firestore';
import { db as firestoreDb } from './client';
import { buildDownstreamImpactPayload } from '../services/changeTracker';

const COLLECTION = 'makemov_projects';

function colRef() {
    return collection(firestoreDb, COLLECTION);
}
function docRef(id) {
    return doc(firestoreDb, COLLECTION, id);
}

function createStageSectionDefaults(stage) {
    switch (stage) {
        case 'synopsis':
            return {
                status: 'draft',
                structured: null,
                content: '',
                sourcePrompt: '',
                options: null,
                generation: null,
                upstreamChanged: null,
                updatedAt: null,
            };
        case 'screenplay':
            return {
                status: 'draft',
                uid: '',
                parent_uid: '',
                rev: '',
                scenes: [],
                sourcePrompt: '',
                options: null,
                generation: null,
                upstreamChanged: null,
                updatedAt: null,
            };
        case 'conti':
            return {
                status: 'draft',
                uid: '',
                parent_uid: '',
                rev: '',
                title: '',
                totalDuration: '',
                promptContext: { era: '', culture: '', negatives: '' },
                scenes: [],
                assumptions: [],
                sourcePrompt: '',
                options: null,
                generation: null,
                upstreamChanged: null,
                updatedAt: null,
            };
        default:
            return {};
    }
}

// ──── 읽기 ────

export async function getFirestoreProjects() {
    if (!firestoreDb) return [];
    try {
        const q = query(colRef(), orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
        console.warn('[firestore] getFirestoreProjects failed:', err?.message || err);
        return [];
    }
}

export async function getFirestoreProject(projectId) {
    if (!firestoreDb) return null;
    try {
        const docSnap = await getDoc(docRef(projectId));
        if (!docSnap.exists()) return null;
        return { id: docSnap.id, ...docSnap.data() };
    } catch (err) {
        console.warn('[firestore] getFirestoreProject failed:', err?.message || err);
        return null;
    }
}

// ──── 쓰기 ────

function generateId() {
    return 'proj_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function createFirestoreProject(title, description = '') {
    if (!firestoreDb) throw new Error('Firestore not configured');
    const id = generateId();
    const now = new Date().toISOString();
    const project = {
        title,
        description,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
        synopsis: createStageSectionDefaults('synopsis'),
        characterSheets: [],
        characterSheetsUpdatedAt: null,
        screenplay: createStageSectionDefaults('screenplay'),
        conti: createStageSectionDefaults('conti'),
        storyboard: { frames: [] },
        keyvisuals: [],
        productionPrompts: [],
    };
    await setDoc(docRef(id), project);
    return { id, ...project };
}

export async function updateFirestoreProject(id, updates) {
    if (!firestoreDb) throw new Error('Firestore not configured');
    const now = new Date().toISOString();
    const payload = { ...updates, updatedAt: now };
    await updateDoc(docRef(id), payload);
    // 업데이트 후 최신 문서 반환
    return getFirestoreProject(id);
}

export async function deleteFirestoreProject(id) {
    if (!firestoreDb) throw new Error('Firestore not configured');
    await deleteDoc(docRef(id));
}

// ──── 섹션별 업데이트 헬퍼 ────

export async function updateFirestoreSynopsis(id, data, meta = {}) {
    const project = await getFirestoreProject(id);
    if (!project) throw new Error(`Project ${id} not found`);

    const now = new Date().toISOString();
    const previous = project.synopsis || createStageSectionDefaults('synopsis');
    const structured = typeof data === 'string' ? previous.structured : data;
    const status = structured?.status || 'draft';
    const synopsis = {
        ...previous,
        status,
        structured,
        content: typeof data === 'string' ? data : (meta.content ?? previous.content ?? ''),
        sourcePrompt: meta.sourcePrompt ?? previous.sourcePrompt ?? '',
        options: meta.options ?? previous.options ?? null,
        generation: meta.generation ? { ...previous.generation, ...meta.generation } : previous.generation,
        upstreamChanged: null,
        updatedAt: now,
    };
    const impacts = buildDownstreamImpactPayload(project, 'synopsis', now);
    return updateFirestoreProject(id, { synopsis, ...impacts });
}

export async function updateFirestoreScreenplay(id, scenesOrSection, meta = {}) {
    const project = await getFirestoreProject(id);
    if (!project) throw new Error(`Project ${id} not found`);

    const now = new Date().toISOString();
    const previous = project.screenplay || createStageSectionDefaults('screenplay');
    const section = Array.isArray(scenesOrSection)
        ? { ...previous, scenes: scenesOrSection }
        : { ...previous, ...(scenesOrSection || {}) };

    const screenplay = {
        ...previous,
        ...section,
        status: section.status || 'draft',
        sourcePrompt: meta.sourcePrompt ?? section.sourcePrompt ?? previous.sourcePrompt ?? '',
        options: meta.options ?? section.options ?? previous.options ?? null,
        generation: meta.generation ? { ...previous.generation, ...meta.generation } : (section.generation ?? previous.generation),
        upstreamChanged: null,
        updatedAt: now,
    };
    const impacts = buildDownstreamImpactPayload(project, 'screenplay', now);
    return updateFirestoreProject(id, {
        screenplay,
        ...impacts,
    });
}

export async function updateFirestoreConti(id, contiData, meta = {}) {
    const project = await getFirestoreProject(id);
    if (!project) throw new Error(`Project ${id} not found`);

    const now = new Date().toISOString();
    const previous = project.conti || createStageSectionDefaults('conti');
    const conti = {
        ...previous,
        ...(contiData || {}),
        status: contiData?.status || 'draft',
        sourcePrompt: meta.sourcePrompt ?? contiData?.sourcePrompt ?? previous.sourcePrompt ?? '',
        options: meta.options ?? contiData?.options ?? previous.options ?? null,
        generation: meta.generation ? { ...previous.generation, ...meta.generation } : (contiData?.generation ?? previous.generation),
        upstreamChanged: null,
        updatedAt: now,
    };
    const impacts = buildDownstreamImpactPayload(project, 'conti', now);
    return updateFirestoreProject(id, {
        conti,
        ...impacts,
    });
}

export async function updateFirestoreStoryboard(id, frames) {
    const project = await getFirestoreProject(id);
    if (!project) throw new Error(`Project ${id} not found`);
    const now = new Date().toISOString();
    const storyboard = Array.isArray(frames)
        ? { frames, updatedAt: now }
        : {
            frames: Array.isArray(frames?.frames) ? frames.frames : [],
            sketches: frames?.sketches || null,
            updatedAt: now,
        };
    const impacts = buildDownstreamImpactPayload(project, 'storyboard', now);
    return updateFirestoreProject(id, { storyboard, ...impacts });
}

export async function addFirestoreKeyVisual(id, visual) {
    const project = await getFirestoreProject(id);
    if (!project) throw new Error(`Project ${id} not found`);
    const keyvisuals = [
        ...(project.keyvisuals || []),
        { ...visual, id: 'kv_' + Date.now().toString(36), createdAt: new Date().toISOString() },
    ];
    const impacts = buildDownstreamImpactPayload(project, 'keyvisual', new Date().toISOString());
    return updateFirestoreProject(id, { keyvisuals, ...impacts });
}

export async function addFirestoreKeyVisuals(id, visuals) {
    const project = await getFirestoreProject(id);
    if (!project) throw new Error(`Project ${id} not found`);
    const now = new Date().toISOString();
    const visualItems = (Array.isArray(visuals) ? visuals : [])
        .filter(Boolean)
        .map((visual, index) => ({
            ...visual,
            id: visual.id || `kv_${Date.now().toString(36)}_${index}_${Math.random().toString(36).slice(2, 7)}`,
            createdAt: visual.createdAt || now,
        }));
    if (visualItems.length === 0) return project;
    const keyvisuals = [
        ...(project.keyvisuals || []),
        ...visualItems,
    ];
    const impacts = buildDownstreamImpactPayload(project, 'keyvisual', now);
    return updateFirestoreProject(id, { keyvisuals, ...impacts });
}

export async function removeFirestoreKeyVisual(projectId, visualId) {
    const project = await getFirestoreProject(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);
    const keyvisuals = (project.keyvisuals || []).filter(v => v.id !== visualId);
    return updateFirestoreProject(projectId, { keyvisuals });
}

export async function addFirestoreProductionPrompt(id, prompt) {
    const project = await getFirestoreProject(id);
    if (!project) throw new Error(`Project ${id} not found`);
    const productionPrompts = [
        ...(project.productionPrompts || []),
        { ...prompt, id: 'pp_' + Date.now().toString(36), createdAt: new Date().toISOString() },
    ];
    return updateFirestoreProject(id, { productionPrompts });
}

export async function removeFirestoreProductionPrompt(projectId, promptId) {
    const project = await getFirestoreProject(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);
    const productionPrompts = (project.productionPrompts || []).filter(p => p.id !== promptId);
    return updateFirestoreProject(projectId, { productionPrompts });
}

// ──── 시드 템플릿 초기화 ────

export async function initTemplateProject(templateData) {
    if (!firestoreDb) throw new Error('Firestore not configured');
    const { id, ...rest } = templateData;
    // 이미 존재하면 스킵
    const existing = await getFirestoreProject(id);
    if (existing) return null; // 이미 있음
    await setDoc(docRef(id), rest);
    console.log(`🏗️ [firestore] 템플릿 초기화: ${rest.title}`);
    return { id, ...rest };
}
