import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let _db = null;

export function getAdminDb() {
    if (_db) return _db;

    if (getApps().length === 0) {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

        if (raw) {
            try {
                const serviceAccount = JSON.parse(raw);
                initializeApp({ credential: cert(serviceAccount) });
            } catch (parseErr) {
                console.error('[firebase-admin] JSON parse failed:', parseErr.message);
                console.error('[firebase-admin] raw length:', raw?.length, 'starts with:', raw?.substring(0, 20));
                throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON parse failed: ' + parseErr.message);
            }
        } else {
            console.error('[firebase-admin] FIREBASE_SERVICE_ACCOUNT_JSON not set');
            throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not configured');
        }
    }

    _db = getFirestore();
    return _db;
}

const COLLECTION = 'makemov_projects';

export function getProjectsCollection() {
    return getAdminDb().collection(COLLECTION);
}

// 간단한 API Key 검증
export function verifyApiKey(req) {
    const key = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    const expected = process.env.MAKEMOV_API_KEY;

    if (!expected) {
        // API 키가 설정되지 않았으면 모든 요청 허용 (개발 편의)
        return true;
    }

    return key === expected;
}

// CORS 헤더 설정
export function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Authorization');
}

// 공통 에러 응답
export function sendError(res, status, message) {
    return res.status(status).json({ error: message });
}

// 현재 시간 ISO 문자열
export function now() {
    return new Date().toISOString();
}
