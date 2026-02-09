/**
 * makemov Firestore Client Store
 * ─────────────────────────────────
 * 프론트엔드에서 Firestore의 makemov_projects 컬렉션을 읽어온다.
 * 쓰기는 REST API(/api/projects)를 통해서만 수행한다.
 */

import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore';
import { db as firestoreDb } from './client';

const COLLECTION = 'makemov_projects';

/**
 * 모든 프로젝트 목록을 Firestore에서 가져온다.
 */
export async function getFirestoreProjects() {
    if (!firestoreDb) return [];
    try {
        const q = query(collection(firestoreDb, COLLECTION), orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
        console.warn('[firestore] getFirestoreProjects failed:', err?.message || err);
        return [];
    }
}

/**
 * 특정 프로젝트를 Firestore에서 가져온다.
 */
export async function getFirestoreProject(projectId) {
    if (!firestoreDb) return null;
    try {
        const docSnap = await getDoc(doc(firestoreDb, COLLECTION, projectId));
        if (!docSnap.exists()) return null;
        return { id: docSnap.id, ...docSnap.data() };
    } catch (err) {
        console.warn('[firestore] getFirestoreProject failed:', err?.message || err);
        return null;
    }
}
