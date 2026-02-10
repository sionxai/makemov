/**
 * makemov Firestore Client Store (SSOT)
 * ─────────────────────────────────────
 * Firestore = Single Source of Truth
 * 읽기 + 쓰기 모두 이 모듈을 통해 수행한다.
 */

import {
    collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
    orderBy, query, serverTimestamp,
} from 'firebase/firestore';
import { db as firestoreDb } from './client';

const COLLECTION = 'makemov_projects';

function colRef() {
    return collection(firestoreDb, COLLECTION);
}
function docRef(id) {
    return doc(firestoreDb, COLLECTION, id);
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
        synopsis: { structured: null, updatedAt: null },
        screenplay: { scenes: [], updatedAt: null },
        conti: { scenes: [], updatedAt: null },
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

export async function updateFirestoreSynopsis(id, data) {
    const now = new Date().toISOString();
    const synopsis = typeof data === 'string'
        ? { content: data, updatedAt: now }
        : { structured: data, updatedAt: now };
    return updateFirestoreProject(id, { synopsis });
}

export async function updateFirestoreScreenplay(id, scenes) {
    const now = new Date().toISOString();
    return updateFirestoreProject(id, {
        screenplay: { scenes, updatedAt: now },
    });
}

export async function updateFirestoreConti(id, contiData) {
    const now = new Date().toISOString();
    return updateFirestoreProject(id, {
        conti: { ...contiData, updatedAt: now },
    });
}

export async function updateFirestoreStoryboard(id, frames) {
    return updateFirestoreProject(id, {
        storyboard: { frames, updatedAt: new Date().toISOString() },
    });
}

export async function addFirestoreKeyVisual(id, visual) {
    const project = await getFirestoreProject(id);
    if (!project) throw new Error(`Project ${id} not found`);
    const keyvisuals = [
        ...(project.keyvisuals || []),
        { ...visual, id: 'kv_' + Date.now().toString(36), createdAt: new Date().toISOString() },
    ];
    return updateFirestoreProject(id, { keyvisuals });
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
