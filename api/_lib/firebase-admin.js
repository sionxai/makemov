import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let _db = null;

export function getAdminDb() {
    if (_db) return _db;

    if (getApps().length === 0) {
        // Vercel 환경변수에서 서비스 계정 정보를 가져온다
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
            : null;

        if (serviceAccount) {
            initializeApp({ credential: cert(serviceAccount) });
        } else {
            // 서비스 계정 없이 프로젝트 ID만으로 초기화 (로컬 에뮬레이터 등)
            initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'makemov-1deec' });
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
