import { getProjectsCollection, verifyApiKey, setCorsHeaders, sendError, now } from './_lib/firebase-admin.js';

// PATCH  /api/projects/[id]  → 프로젝트 업데이트 (synopsis, screenplay, conti 등)
// DELETE /api/projects/[id]  → 프로젝트 삭제
// GET    /api/projects/[id]  → 단일 프로젝트 조회
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
        // ── GET ──
        if (req.method === 'GET') {
            const doc = await docRef.get();
            if (!doc.exists) return sendError(res, 404, `Project ${id} not found`);
            return res.json({ project: { id: doc.id, ...doc.data() } });
        }

        // ── PATCH ── 부분 업데이트 (synopsis, screenplay, conti, storyboard, keyvisuals, prompts)
        if (req.method === 'PATCH') {
            const doc = await docRef.get();
            if (!doc.exists) return sendError(res, 404, `Project ${id} not found`);

            const body = req.body || {};
            const update = { updatedAt: now() };

            // ── 시놉시스
            if (body.synopsis !== undefined) {
                update.synopsis = { structured: body.synopsis, updatedAt: now() };
            }

            // ── 시나리오 (scenes 배열)
            if (body.screenplay !== undefined) {
                update.screenplay = { scenes: body.screenplay, updatedAt: now() };
            }

            // ── 줄콘티 (전체 conti 객체)
            if (body.conti !== undefined) {
                update.conti = { ...body.conti, updatedAt: now() };
            }

            // ── 스토리보드
            if (body.storyboard !== undefined) {
                update.storyboard = body.storyboard;
            }

            // ── 키비주얼
            if (body.keyvisuals !== undefined) {
                update.keyvisuals = body.keyvisuals;
            }

            // ── 프롬프트
            if (body.prompts !== undefined) {
                update.prompts = body.prompts;
            }

            // ── 제목/설명/상태
            if (body.title) update.title = body.title;
            if (body.description !== undefined) update.description = body.description;
            if (body.status) update.status = body.status;

            await docRef.update(update);
            const updated = await docRef.get();

            return res.json({
                message: `Project ${id} updated`,
                project: { id: updated.id, ...updated.data() },
            });
        }

        // ── DELETE ──
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
