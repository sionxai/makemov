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
    const key = req.headers['x-api-key'] || (req.headers['authorization'] || '').replace('Bearer ', '');
    const expected = process.env.MAKEMOV_API_KEY;
    if (!expected) return true;
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
