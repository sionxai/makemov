import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// /api/agent-guide → agent-guide.md 마크다운 원문 반환
export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'GET only' });
    }

    const filePath = join(process.cwd(), 'public', 'agent-guide.md');

    if (!existsSync(filePath)) {
        return res.status(404).json({ error: 'agent-guide.md not found' });
    }

    const content = readFileSync(filePath, 'utf-8');
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    return res.status(200).send(content);
}
