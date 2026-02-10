/**
 * 줄콘티 S2 재설계 → Firestore push
 * S2 확장(15~50초)에 따라 S3~S8 타임코드 10초 자동 밀림
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const g = k => env.match(new RegExp(`${k}="?([^"\n]+)`))?.[1];
const app = initializeApp({ apiKey: g('VITE_FIREBASE_API_KEY'), projectId: 'makemov-1deec' });
const db = getFirestore(app);

const PROJECT_ID = 'kbhJeWE61C80IK5uXMp4';
const ref = doc(db, 'makemov_projects', PROJECT_ID);

// 현재 콘티 로드
const snap = await getDoc(ref);
const conti = snap.data().conti;
console.log('📋 현재 총 씬:', conti.scenes.length);

// 로컬 파일에서 새 S2 가져오기
const { JINJU2_CONTI } = await import('../src/data/jinju2-conti.js');
const newS2 = JINJU2_CONTI.scenes.find(s => s.scene_id === 'S2');
console.log('✅ 새 S2 컷 수:', newS2.cuts.length);
console.log('  tc:', newS2.scene_tc_start, '~', newS2.scene_tc_end);

// 타임코드 밀기 유틸
function shiftTC(tc, seconds) {
    const [min, secMs] = tc.split(':');
    const [sec, ms] = secMs.split('.');
    const totalSec = parseInt(min) * 60 + parseInt(sec) + parseFloat('0.' + (ms || '0')) + seconds;
    const newMin = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const newSec = Math.floor(totalSec % 60).toString().padStart(2, '0');
    const newMs = (totalSec % 1).toFixed(1).slice(2);
    return `${newMin}:${newSec}.${newMs}`;
}

const SHIFT = 10; // 10초 밀림

// S2 교체 + S3~S8 타임코드 밀기
const updatedScenes = conti.scenes.map(scene => {
    if (scene.scene_id === 'S2') {
        return newS2; // 새 S2로 교체
    }

    // S3 이후 씬들 타임코드 밀기
    const sceneNum = parseInt(scene.scene_id.replace('S', ''));
    if (sceneNum >= 3) {
        const shifted = {
            ...scene,
            scene_tc_start: shiftTC(scene.scene_tc_start, SHIFT),
            scene_tc_end: shiftTC(scene.scene_tc_end, SHIFT),
            cuts: scene.cuts.map(cut => ({
                ...cut,
                tc_start: shiftTC(cut.tc_start, SHIFT),
                tc_end: shiftTC(cut.tc_end, SHIFT),
            })),
        };
        return shifted;
    }

    return scene; // S1 그대로
});

// 검증
console.log('\n=== 타임코드 검증 ===');
updatedScenes.forEach(s => {
    console.log(`${s.scene_id}: ${s.scene_tc_start} ~ ${s.scene_tc_end} (${s.cuts.length}컷)`);
});

// 총 컷 수 계산
const totalCuts = updatedScenes.reduce((sum, s) => sum + s.cuts.length, 0);
const kvHigh = updatedScenes.reduce((sum, s) =>
    sum + s.cuts.filter(c => c.keyvisual_priority === 'high').length, 0);

console.log(`\n총 컷: ${totalCuts}, KV 우선: ${kvHigh}`);

// Firestore 업데이트
const updatedConti = {
    ...conti,
    totalDuration: '약 190초 (3분 10초)',
    scenes: updatedScenes,
};

await updateDoc(ref, {
    conti: updatedConti,
    updatedAt: new Date().toISOString(),
});

console.log('\n✅ Firestore 줄콘티 업데이트 완료!');
process.exit(0);
