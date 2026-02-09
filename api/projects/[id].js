import { getProjectsCollection, verifyApiKey, setCorsHeaders, sendError, now } from '../_lib/firebase-admin.js';

export default async function handler(req, res) {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!verifyApiKey(req)) {
        return sendError(res, 401, 'Invalid or missing API key');
    }

    const { id } = req.query;
    if (!id) return sendError(res, 400, 'Project ID is required');

    const col = getProjectsCollection();
    const docRef = col.doc(id);

    try {
        if (req.method === 'GET') {
            const doc = await docRef.get();
            if (!doc.exists) return sendError(res, 404, `Project ${id} not found`);
            return res.json({ project: { id: doc.id, ...doc.data() } });
        }

        if (req.method === 'PATCH') {
            const doc = await docRef.get();
            if (!doc.exists) return sendError(res, 404, `Project ${id} not found`);

            const body = req.body || {};
            const update = { updatedAt: now() };

            if (body.synopsis !== undefined) update.synopsis = { structured: body.synopsis, updatedAt: now() };
            if (body.screenplay !== undefined) update.screenplay = { scenes: body.screenplay, updatedAt: now() };
            if (body.conti !== undefined) update.conti = { ...body.conti, updatedAt: now() };
            if (body.storyboard !== undefined) update.storyboard = body.storyboard;
            if (body.keyvisuals !== undefined) update.keyvisuals = body.keyvisuals;
            if (body.productionPrompts !== undefined) update.productionPrompts = body.productionPrompts;
            if (body.title) update.title = body.title;
            if (body.description !== undefined) update.description = body.description;
            if (body.status) update.status = body.status;

            await docRef.update(update);
            const updated = await docRef.get();
            return res.json({ message: `Project ${id} updated`, project: { id: updated.id, ...updated.data() } });
        }

        if (req.method === 'DELETE') {
            const doc = await docRef.get();
            if (!doc.exists) return sendError(res, 404, `Project ${id} not found`);
            await docRef.delete();
            return res.json({ message: `Project ${id} deleted` });
        }

        return sendError(res, 405, `Method ${req.method} not allowed`);
    } catch (err) {
        console.error(`[api/projects/${id}]`, err);
        return sendError(res, 500, err.message);
    }
}
