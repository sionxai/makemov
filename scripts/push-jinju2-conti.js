// 2차 진주성 콘티 데이터를 Firestore API로 주입하는 스크립트
import { JINJU2_CONTI } from '../src/data/jinju2-conti.js';

const BASE = 'https://makemov.vercel.app/api';
const KEY = process.env.MAKEMOV_API_KEY;

if (!KEY) {
    console.error('❌ MAKEMOV_API_KEY 환경변수가 필요합니다');
    process.exit(1);
}

const headers = {
    'Content-Type': 'application/json',
    'x-api-key': KEY,
};

async function main() {
    // 1. 기존 프로젝트 확인
    const listRes = await fetch(BASE + '/projects');
    const list = await listRes.json();
    let projId = null;

    for (const p of list.projects) {
        if (p.title.includes('2차 진주성') || p.title.includes('진주성전투')) {
            projId = p.id;
            console.log('기존 프로젝트 발견:', projId, p.title);
            break;
        }
    }

    // 2. 없으면 생성
    if (!projId) {
        console.log('프로젝트 생성 중...');
        const createRes = await fetch(BASE + '/projects', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                title: '2차 진주성전투 — 시간원정대',
                description: '1593년 2차 진주성전투. 3분 숏폼 시네마틱 단편. 시간원정대 타임슬립 시나리오.',
            }),
        });
        const createData = await createRes.json();
        projId = createData.project.id;
        console.log('✅ 프로젝트 생성:', projId);
    }

    // 3. 콘티 데이터 주입
    console.log('콘티 데이터 주입 중... (', JINJU2_CONTI.scenes.length, '씬,',
        JINJU2_CONTI.scenes.reduce((a, s) => a + s.cuts.length, 0), '컷)');

    const contiPayload = {
        conti: {
            title: JINJU2_CONTI.title,
            totalDuration: JINJU2_CONTI.totalDuration,
            promptContext: JINJU2_CONTI.promptContext,
            scenes: JINJU2_CONTI.scenes,
            assumptions: JINJU2_CONTI.assumptions,
        },
    };

    const patchRes = await fetch(BASE + '/projects/' + projId, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(contiPayload),
    });

    if (!patchRes.ok) {
        const err = await patchRes.text();
        console.error('❌ PATCH 실패:', patchRes.status, err);
        process.exit(1);
    }

    const result = await patchRes.json();
    console.log('✅ 콘티 주입 완료');

    // 4. 검증
    const verifyRes = await fetch(BASE + '/projects/' + projId);
    const verify = await verifyRes.json();
    const conti = verify.project.conti;
    const totalCuts = conti.scenes.reduce((a, s) => a + s.cuts.length, 0);
    console.log(`✅ 검증: ${conti.scenes.length}씬, ${totalCuts}컷`);
}

main().catch(console.error);
