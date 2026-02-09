const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

let _db = null;

function getAdminDb() {
    if (_db) return _db;

    if (getApps().length === 0) {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

        if (raw) {
            try {
                const serviceAccount = JSON.parse(raw);
                initializeApp({ credential: cert(serviceAccount) });
            } catch (parseErr) {
                console.error('[firebase-admin] JSON parse failed:', parseErr.message);
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

function getProjectsCollection() {
    return getAdminDb().collection(COLLECTION);
}

function verifyApiKey(req) {
    const key = req.headers['x-api-key'] || (req.headers['authorization'] || '').replace('Bearer ', '');
    const expected = process.env.MAKEMOV_API_KEY;
    if (!expected) return true;
    return key === expected;
}

function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Authorization');
}

function sendError(res, status, message) {
    return res.status(status).json({ error: message });
}

function now() {
    return new Date().toISOString();
}

module.exports = { getAdminDb, getProjectsCollection, verifyApiKey, setCorsHeaders, sendError, now };
