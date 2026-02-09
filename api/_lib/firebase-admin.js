import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let _db = null;

export function getAdminDb() {
    if (_db) return _db;

    if (getApps().length === 0) {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

        if (raw) {
            const serviceAccount = JSON.parse(raw);
            initializeApp({ credential: cert(serviceAccount) });
        } else {
            throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON env var is not configured');
        }
    }

    _db = getFirestore();
    return _db;
}

const COLLECTION = 'makemov_projects';

export function getProjectsCollection() {
    return getAdminDb().collection(COLLECTION);
}

export function verifyApiKey(req) {
    // GET/OPTIONS는 항상 공개 (public read)
    if (req.method === 'GET' || req.method === 'OPTIONS') return true;

    const key = req.headers['x-api-key'] || (req.headers['authorization'] || '').replace('Bearer ', '');
    const expected = process.env.MAKEMOV_API_KEY;

    // API 키가 미설정이면 쓰기 차단 (보안 기본값)
    if (!expected) {
        console.warn('[verifyApiKey] MAKEMOV_API_KEY not set — blocking write request');
        return false;
    }

    return key === expected;
}

export function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Authorization');
}

export function sendError(res, status, message) {
    return res.status(status).json({ error: message });
}

export function now() {
    return new Date().toISOString();
}
