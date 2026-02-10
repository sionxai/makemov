---
description: makemov 프로젝트 데이터(시놉시스, 시나리오, 콘티 등) 수정 시 반드시 따를 체크리스트. 로컬 파일 수정만으로는 반영되지 않음.
---

# makemov 데이터 업데이트 워크플로

## ⚠️ 핵심 원칙

> **데이터는 3겹으로 존재한다. 1곳만 수정하면 반영되지 않는다.**

```
src/data/*.js (로컬 시드)
  → db.js seedXxxProject() (IDB 버전 관리)
    → 브라우저 IndexedDB (로컬 대시보드)
  → Firestore (클라우드 대시보드 + 외부 AI)
```

---

## 체크리스트 (모든 단계 필수)

### STEP 1: 로컬 시드 파일 수정
- [ ] `src/data/{project}-conti.js` (또는 synopsis, screenplay 등) 수정
- [ ] `node -e "import(...).then(...)"` 으로 데이터 무결성 확인 (씬 수, 컷 수, 총 시간)

### STEP 2: IDB 시드 버전 올리기
- [ ] `src/db.js`에서 해당 프로젝트의 `CURRENT_CONTI_VER` (또는 `_synVer`, `_spVer`) **+1 증가**
- [ ] 이걸 안 하면 로컬 대시보드(localhost + production)에서 old 데이터가 계속 보임
- [ ] 시드 함수 내 버전 변수 위치: `seedJinju2Project()` → `CURRENT_CONTI_VER`

### STEP 3: Firestore에 API로 push
- [ ] API 키 확보: `MAKEMOV_API_KEY=$(grep MAKEMOV_API_KEY .env.production | cut -d'"' -f2)`
  - `.env.production` 없으면: `npx vercel env pull .env.production --environment production`
- [ ] push 스크립트 실행 또는 curl로 PATCH
- [ ] GET으로 검증: `curl -s https://makemov.vercel.app/api/projects/{id}`
- [ ] `.env.production` 삭제 (API 키 노출 방지)

### STEP 4: 커밋 & 배포
// turbo
- [ ] `git add -A && git commit && git push`
- [ ] Vercel 배포 완료 대기 (약 30초)

### STEP 5: 최종 검증
- [ ] 프로덕션 대시보드에서 데이터 확인
- [ ] API GET으로 Firestore 데이터 확인

---

## 각 프로젝트별 시드 함수 위치

| 프로젝트 | 시드 함수 | 시드 파일 |
|---------|----------|----------|
| 1차 진주성 | `seedJinjuProject()` | `jinju-conti.js` |
| 2차 진주성 | `seedJinju2Project()` | `jinju2-conti.js` |
| 동래성 | `seedDongnaeProject()` | `dongnae-seed.js` |
| 칠천량 | `seedChilcheonProject()` | `chilcheon-seed.js` |
| 적벽대전 | `seedRedcliffProject()` | `redcliff-conti.js` |

---

## 흔한 실수와 증상

| 증상 | 빠뜨린 단계 |
|------|------------|
| 로컬+프로덕션 대시보드 다 안 바뀜 | STEP 2 (IDB 버전) |
| 로컬은 OK인데 외부 AI가 old 데이터 | STEP 3 (Firestore push) |
| API GET은 OK인데 대시보드 안 바뀜 | STEP 2 (IDB가 우선이라 Firestore 무시) |
| `/skills/*.md` 접근 불가 (727B HTML) | vercel.json SPA 리라이트가 가로챔 → `/api/` 경로 사용 |

---

## 아키텍처 메모

- 대시보드는 **IDB 우선** (로컬 > Firestore, 제목 중복 시 로컬 승)
- 외부 AI는 Firestore **만** 접근 (`/api/projects/`)
- 로컬 시드 파일 수정 → IDB 버전 올려야 로컬에서도 반영
- 정적 파일은 vercel.json SPA 리라이트에 의해 가로채질 수 있음 → API 라우트가 안전
