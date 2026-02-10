/**
 * 황진 연설 확장 → Firestore 직접 push (SDK 방식)
 * REST API key 불필요 — Firestore Rules에서 client write 허용됨
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
import { JINJU2_SCREENPLAY } from '../src/data/jinju2-screenplay.js';

// .env.local에서 Firebase config 읽기
import { readFileSync } from 'fs';
const envFile = readFileSync('.env.local', 'utf-8');
const get = (k) => envFile.match(new RegExp(`${k}="?([^"\n]+)`))?.[1];

const firebaseConfig = {
    apiKey: get('VITE_FIREBASE_API_KEY'),
    authDomain: get('VITE_FIREBASE_AUTH_DOMAIN') || 'makemov-1deec.firebaseapp.com',
    projectId: get('VITE_FIREBASE_PROJECT_ID') || 'makemov-1deec',
    storageBucket: get('VITE_FIREBASE_STORAGE_BUCKET') || 'makemov-1deec.firebasestorage.app',
    appId: get('VITE_FIREBASE_APP_ID'),
};

console.log('🔧 Firebase 프로젝트:', firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const PROJECT_ID = 'kbhJeWE61C80IK5uXMp4';
const ref = doc(db, 'makemov_projects', PROJECT_ID);

// 현재 데이터 확인
const snap = await getDoc(ref);
if (!snap.exists()) {
    console.error('❌ 프로젝트를 찾을 수 없음:', PROJECT_ID);
    process.exit(1);
}
const current = snap.data();
const oldScenes = current.screenplay?.scenes || [];
const oldS2 = oldScenes.find(s => s.scene_id === 'S2');
const newS2 = JINJU2_SCREENPLAY.find(s => s.scene_id === 'S2');

console.log('\n📋 현재 S2 대사 길이:', oldS2?.dialogue?.length, 'chars');
console.log('📝 새 S2 대사 길이:', newS2?.dialogue?.length, 'chars');
console.log('\n--- 새 S2 대사 미리보기 ---');
console.log(newS2?.dialogue?.slice(0, 200) + '...\n');

// Firestore 업데이트
await updateDoc(ref, {
    screenplay: {
        scenes: JINJU2_SCREENPLAY,
        updatedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
});

console.log('✅ Firestore 업데이트 완료!');
console.log(`  씬 수: ${JINJU2_SCREENPLAY.length}`);
console.log(`  S2 대사: ${oldS2?.dialogue?.length} → ${newS2?.dialogue?.length} chars`);

process.exit(0);
