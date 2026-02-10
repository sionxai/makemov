// 2차 진주성 시놉시스 + 시나리오를 Firestore API로 주입
import { JINJU2_SYNOPSIS } from '../src/data/jinju2-synopsis.js';
import { JINJU2_SCREENPLAY } from '../src/data/jinju2-screenplay.js';

const BASE = 'https://makemov.vercel.app/api';
const KEY = process.env.MAKEMOV_API_KEY;
const PROJECT_ID = 'kbhJeWE61C80IK5uXMp4';

const headers = { 'Content-Type': 'application/json', 'x-api-key': KEY };

async function main() {
    // 시놉시스
    console.log('시놉시스 주입 중...');
    const synRes = await fetch(BASE + '/projects/' + PROJECT_ID, {
        method: 'PATCH', headers,
        body: JSON.stringify({ synopsis: JINJU2_SYNOPSIS }),
    });
    if (!synRes.ok) { console.error('❌ 시놉시스 실패:', await synRes.text()); return; }
    console.log('✅ 시놉시스 완료');

    // 시나리오
    console.log('시나리오 주입 중...');
    const spRes = await fetch(BASE + '/projects/' + PROJECT_ID, {
        method: 'PATCH', headers,
        body: JSON.stringify({ screenplay: JINJU2_SCREENPLAY }),
    });
    if (!spRes.ok) { console.error('❌ 시나리오 실패:', await spRes.text()); return; }
    console.log('✅ 시나리오 완료');

    // 검증
    const v = await fetch(BASE + '/projects/' + PROJECT_ID);
    const d = await v.json();
    const p = d.project;
    console.log('───────────────');
    console.log('프로젝트:', p.title);
    console.log('시놉시스:', p.synopsis?.structured?.title || '없음');
    console.log('시나리오 씬:', p.screenplay?.scenes?.length || 0);
    console.log('콘티 씬:', p.conti?.scenes?.length || 0, '컷:', (p.conti?.scenes || []).reduce((a, s) => a + s.cuts.length, 0));
}

main().catch(console.error);
