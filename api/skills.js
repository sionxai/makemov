import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// /api/skills?name=synopsis  → synopsis.md 내용 반환
// /api/skills?name=index     → 스킬 인덱스 반환
// /api/skills (파라미터 없음) → 사용 가능한 스킬 목록 반환
export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'GET only' });
    }

    const SKILLS = ['synopsis', 'screenplay', 'storyboard', 'cinematic_prompt', 'keyvisual', 'videoproduction'];

    const { name } = req.query;

    // 파라미터 없으면 목록 반환
    if (!name) {
        return res.status(200).json({
            skills: SKILLS,
            usage: 'GET /api/skills?name=synopsis',
            description: '각 스킬의 마크다운 원문을 반환합니다.',
            index: 'GET /api/skills?name=index',
        });
    }

    // index 요청
    if (name === 'index') {
        const indexPath = join(process.cwd(), 'public', 'skills', 'index.md');
        if (existsSync(indexPath)) {
            const content = readFileSync(indexPath, 'utf-8');
            res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
            return res.status(200).send(content);
        }
        return res.status(404).json({ error: 'index.md not found' });
    }

    // 스킬 이름 검증
    if (!SKILLS.includes(name)) {
        return res.status(400).json({
            error: `Invalid skill name: ${name}`,
            available: SKILLS,
        });
    }

    const filePath = join(process.cwd(), 'public', 'skills', `${name}.md`);

    if (!existsSync(filePath)) {
        return res.status(404).json({ error: `Skill file not found: ${name}.md` });
    }

    const content = readFileSync(filePath, 'utf-8');
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    return res.status(200).send(content);
}
