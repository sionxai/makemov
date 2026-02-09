import { getProjectsCollection, verifyApiKey, setCorsHeaders, sendError, now } from './_lib/firebase-admin.js';

// GET  /api/projects         → 전체 프로젝트 목록
// POST /api/projects         → 새 프로젝트 생성
// GET  /api/projects?id=xxx  → 단일 프로젝트 조회
export default async function handler(req, res) {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!verifyApiKey(req)) {
        return sendError(res, 401, 'Invalid or missing API key');
    }

    const col = getProjectsCollection();

    try {
        // ── GET ──
        if (req.method === 'GET') {
            const { id } = req.query;

            if (id) {
                // 단일 프로젝트 조회
                const doc = await col.doc(id).get();
                if (!doc.exists) return sendError(res, 404, `Project ${id} not found`);
                return res.json({ project: { id: doc.id, ...doc.data() } });
            }

            // 전체 목록
            const snapshot = await col.orderBy('updatedAt', 'desc').get();
            const projects = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            return res.json({ projects });
        }

        // ── POST ──
        if (req.method === 'POST') {
            const { title, description = '' } = req.body || {};
            if (!title) return sendError(res, 400, 'title is required');

            const timestamp = now();
            const project = {
                title,
                description,
                status: 'draft',
                createdAt: timestamp,
                updatedAt: timestamp,
                synopsis: { structured: null, updatedAt: null },
                screenplay: { scenes: [], updatedAt: null },
                conti: { scenes: [], updatedAt: null },
                storyboard: [],
                keyvisuals: [],
                prompts: [],
            };

            const ref = await col.add(project);
            return res.status(201).json({
                message: `Project created: ${ref.id}`,
                project: { id: ref.id, ...project },
            });
        }

        return sendError(res, 405, `Method ${req.method} not allowed`);
    } catch (err) {
        console.error('[api/projects]', err);
        return sendError(res, 500, err.message);
    }
}
