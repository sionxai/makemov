import { getProjectsCollection, verifyApiKey, setCorsHeaders, sendError, now } from './_lib/firebase-admin.js';

export default async function handler(req, res) {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!verifyApiKey(req)) {
        return sendError(res, 401, 'Invalid or missing API key');
    }

    const col = getProjectsCollection();

    try {
        if (req.method === 'GET') {
            const { id } = req.query;
            if (id) {
                const doc = await col.doc(id).get();
                if (!doc.exists) return sendError(res, 404, `Project ${id} not found`);
                return res.json({ project: { id: doc.id, ...doc.data() } });
            }
            const snapshot = await col.orderBy('updatedAt', 'desc').get();
            const projects = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            return res.json({ projects });
        }

        if (req.method === 'POST') {
            const { title, description = '' } = req.body || {};
            if (!title) return sendError(res, 400, 'title is required');

            const timestamp = now();
            const project = {
                title, description, status: 'draft',
                createdAt: timestamp, updatedAt: timestamp,
                synopsis: { structured: null, updatedAt: null },
                screenplay: { scenes: [], updatedAt: null },
                conti: { scenes: [], updatedAt: null },
                storyboard: [], keyvisuals: [], prompts: [],
            };
            const ref = await col.add(project);
            return res.status(201).json({ message: `Project created: ${ref.id}`, project: { id: ref.id, ...project } });
        }

        return sendError(res, 405, `Method ${req.method} not allowed`);
    } catch (err) {
        console.error('[api/projects]', err);
        return sendError(res, 500, err.message);
    }
}
