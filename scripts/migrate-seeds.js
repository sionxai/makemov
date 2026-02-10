/**
 * 로컬 시드 데이터 → Firestore 마이그레이션 (1회 실행)
 * POST로 프로젝트 생성 → PATCH로 데이터 주입
 */

import { JINJU_SYNOPSIS, JINJU_SCREENPLAY, JINJU_STORYBOARD, JINJU_KEYVISUALS, JINJU_PROMPTS } from '../src/data/jinju-seed.js';
import { JINJU_CONTI } from '../src/data/jinju-conti.js';
import { REDCLIFF_SYNOPSIS } from '../src/data/redcliff-synopsis.js';
import { REDCLIFF_SCREENPLAY } from '../src/data/redcliff-screenplay.js';
import { REDCLIFF_CONTI } from '../src/data/redcliff-conti.js';
import { DONGNAE_SYNOPSIS, DONGNAE_SCREENPLAY } from '../src/data/dongnae-seed.js';
import { CHILCHEON_SYNOPSIS, CHILCHEON_SCREENPLAY } from '../src/data/chilcheon-seed.js';

const BASE = 'https://makemov.vercel.app/api';
const KEY = process.env.MAKEMOV_API_KEY;
if (!KEY) { console.error('❌ MAKEMOV_API_KEY 필요'); process.exit(1); }
const headers = { 'Content-Type': 'application/json', 'x-api-key': KEY };

// 기존 프로젝트 목록
const existing = await fetch(BASE + '/projects', { headers }).then(r => r.json());
const existingTitles = new Set(existing.projects.map(p => p.title));

const SEEDS = [
    {
        title: '1차 진주성전투 — 시간원정대 타임슬립',
        description: '1592년 1차 진주성 전투. 약 180초 숏폼.',
        synopsis: JINJU_SYNOPSIS,
        screenplay: JINJU_SCREENPLAY,
        conti: JINJU_CONTI,
        storyboard: JINJU_STORYBOARD || [],
        keyvisuals: JINJU_KEYVISUALS || [],
        productionPrompts: JINJU_PROMPTS || [],
    },
    {
        title: '박상률 완역 삼국지 — 적벽대전편',
        description: '20년 만에 완성된 삼국지 완역의 결정판. 적벽대전편 유튜브 숏츠 광고 90초.',
        synopsis: REDCLIFF_SYNOPSIS,
        screenplay: REDCLIFF_SCREENPLAY,
        conti: REDCLIFF_CONTI,
    },
    {
        title: '칠천량 해전 — 원균의 패전',
        description: '1597년 칠천량 해전. 조선 수군 궤멸의 비극.',
        synopsis: CHILCHEON_SYNOPSIS,
        screenplay: CHILCHEON_SCREENPLAY,
        conti: null,
    },
];

for (const seed of SEEDS) {
    if (existingTitles.has(seed.title)) {
        console.log(`⏭️ 이미 존재: ${seed.title}`);
        continue;
    }

    // 1. POST로 생성
    console.log(`📤 생성: ${seed.title}...`);
    const createRes = await fetch(BASE + '/projects', {
        method: 'POST', headers,
        body: JSON.stringify({ title: seed.title, description: seed.description }),
    });
    if (!createRes.ok) {
        console.error(`❌ 생성 실패:`, await createRes.text());
        continue;
    }
    const { project } = await createRes.json();
    const id = project.id;
    console.log(`  → ID: ${id}`);

    // 2. PATCH로 데이터 주입
    const patchBody = { status: 'progress' };
    if (seed.synopsis) patchBody.synopsis = seed.synopsis;
    if (seed.screenplay) patchBody.screenplay = seed.screenplay;
    if (seed.conti) patchBody.conti = seed.conti;
    if (seed.storyboard) patchBody.storyboard = { frames: seed.storyboard };
    if (seed.keyvisuals) patchBody.keyvisuals = seed.keyvisuals;
    if (seed.productionPrompts) patchBody.productionPrompts = seed.productionPrompts;

    const patchRes = await fetch(BASE + '/projects/' + id, {
        method: 'PATCH', headers,
        body: JSON.stringify(patchBody),
    });
    if (!patchRes.ok) {
        console.error(`❌ 데이터 주입 실패:`, await patchRes.text());
    } else {
        console.log(`✅ 완료: ${seed.title}`);
    }
}

// 최종 확인
const final = await fetch(BASE + '/projects', { headers }).then(r => r.json());
console.log('\n📊 Firestore 프로젝트 목록:');
for (const p of final.projects) {
    const syn = p.synopsis?.structured ? '✅' : '❌';
    const sp = (p.screenplay?.scenes?.length || 0) > 0 ? '✅' : '❌';
    const ct = (p.conti?.scenes?.length || 0) > 0 ? '✅' : '❌';
    console.log(`  ${p.id.slice(0, 12)}... | ${p.title.slice(0, 30).padEnd(30)} | syn${syn} sp${sp} ct${ct}`);
}
console.log('\n🏁 마이그레이션 완료');
