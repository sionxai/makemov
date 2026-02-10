---
description: makemov 파이프라인 리팩토링 — 제작→수정→재수정 효율화
---

# makemov 파이프라인 리팩토링: Firestore SSOT

## 목표

> **데이터 수정 지점을 1곳(Firestore)으로 고정.** IDB 혼합 로딩 제거.

## 현재 아키텍처 (Before)

```
                     ┌─ src/data/*.js (시드/템플릿)
                     │
                     ▼
Dashboard ──→ seedXxxProject() ──→ IndexedDB ──→ UI (로컬 우선)
                                                     ↑
                                        Firestore ──┘ (보조, 중복 제거)
```

**문제:**
- IDB에 시드 데이터가 고착 (버전 수동 관리)
- Firestore에 push해도 IDB가 우선이라 무시됨
- 수정 시 3곳 동기화 필요

## 리팩토링 후 아키텍처 (After)

```
src/data/*.js (템플릿/fixture)
      │
      │ 최초 1회: initTemplates()
      ▼
  Firestore ◀──── REST API (/api/projects) ◀──── 외부 AI
      │
      │ 읽기 (getFirestoreProjects / getFirestoreProject)
      ▼
    UI (단일 경로)
```

**해결:**
- 수정 지점 = Firestore 1곳
- UI 읽기 = Firestore 1곳
- `src/data/*.js` = 초기 템플릿 (SSOT 아님)
- IDB = 제거

---

## 영향 범위 분석

### 변경이 필요한 파일

| 파일 | 현재 역할 | 변경 |
|------|----------|------|
| `src/db.js` | IDB CRUD + 시드 + 검증 | IDB 제거, 검증 유틸은 보존 |
| `src/pages/Dashboard.jsx` | IDB 시드 + 혼합 로딩 | Firestore only 로딩 |
| `src/pages/ProjectLayout.jsx` | IDB → Firestore 폴백 | Firestore only 로딩 |
| `src/pages/ContiPage.jsx` | `updateConti` (IDB 저장) | Firestore API 저장 |
| `src/pages/ScreenplayPage.jsx` | `updateScreenplay` (IDB) | Firestore API 저장 |
| `src/pages/StoryboardPage.jsx` | `updateStoryboard` (IDB) | Firestore API 저장 |
| `src/pages/KeyVisualPage.jsx` | `addKeyVisual` (IDB) | Firestore API 저장 |
| `src/pages/PromptsPage.jsx` | `addProductionPrompt` (IDB) | Firestore API 저장 |
| `src/firebase/projectStore.js` | 읽기 전용 | 읽기 + 쓰기 |
| `src/main.jsx` | window.__makemov (IDB) | 제거 또는 Firestore로 변경 |

### 변경하지 않는 파일

| 파일 | 이유 |
|------|------|
| `src/data/*.js` | 템플릿으로 보존 (코드 삭제 없음) |
| `api/projects.js` | 이미 Firestore CRUD (변경 불필요) |
| `api/projects/[id].js` | 이미 Firestore CRUD (변경 불필요) |
| `src/pages/SynopsisPage.jsx` | 읽기 전용 (project context에서 받음) |
| `src/pages/AgentGuidePage.jsx` | 문서 페이지 (데이터 비의존) |
| `src/components/*` | UI 컴포넌트 (데이터 비의존) |

---

## 단계별 실행 계획

### Phase 1: projectStore.js 확장 (쓰기 추가)
- Firestore 클라이언트로 직접 쓰기 OR REST API(`/api/projects/{id}`) PATCH 호출
- **추천: REST API PATCH** (API 키 필요하지만 서버 검증 일관성 유지)
- 단, UI에서 읽기 전용이면 쓰기는 불필요 (현재 클라우드 프로젝트는 read-only)
- **결정 필요**: UI에서 Firestore 프로젝트 편집 가능하게 할 것인가?

### Phase 2: Dashboard.jsx — Firestore only 로딩
- `seedXxxProject()` 호출 제거
- `getAllProjects()` (IDB) 제거
- `getFirestoreProjects()` 만 사용
- 템플릿 초기화: 별도 "템플릿에서 생성" 버튼

### Phase 3: ProjectLayout.jsx — Firestore only 로딩
- `getProject()` (IDB) 제거
- `getFirestoreProject()` 만 사용
- 클라우드 프로젝트의 `_source: 'cloud'` 구분 및 read-only 제한 제거

### Phase 4: 각 페이지 저장 로직 전환
- `updateConti`, `updateScreenplay` 등 IDB 함수 → Firestore API PATCH로 교체
- 검증 로직(validateSynopsisStructured, validateScreenplay)은 별도 유틸로 분리 + 보존

### Phase 5: db.js 정리 + IDB 제거
- 시드 함수 전체 제거
- IDB CRUD 제거
- 검증 함수만 `src/utils/validators.js`로 이동
- `idb` 패키지 제거

### Phase 6: 시드 데이터 → Firestore 초기 마이그레이션
- 로컬 시드 데이터 중 Firestore에 없는 것만 API로 push
- 1회 실행 스크립트 (`scripts/migrate-seeds.js`)

### Phase 7: 정리 + 검증
- `window.__makemov` 업데이트 또는 제거
- 전체 페이지 동작 검증
- git commit

---

## 리스크 & 완화

| 리스크 | 완화 방법 |
|--------|----------|
| Firestore 느리면 UI 렌더링 지연 | 로딩 스켈레톤 + 캐시 전략 |
| Firestore 다운 시 서비스 불가 | try/catch + "서비스 일시 중단" 안내 |
| API 키 노출 위험 | 읽기는 공개, 쓰기는 서버리스 함수 경유 |
| 기존 IDB 데이터 유실 | 마이그레이션 스크립트로 Firestore에 백업 |
| UI 쓰기 시 API 키 관리 | Option A: 클라이언트 Firestore SDK 직접 쓰기 (Rules로 보호) |
|                        | Option B: /api PATCH + 프론트에서 키 관리 |

---

## 성공 조건 체크리스트

- [ ] 데이터 수정 지점이 1곳 (Firestore)
- [ ] UI 읽기 경로가 단일 (Firestore)
- [ ] `src/data/*.js` 수정해도 UI에 영향 없음
- [ ] IDB 완전 제거
- [ ] 기존 프로젝트 데이터 Firestore에 존재
- [ ] 대시보드 프로젝트 목록 정상 표시
- [ ] 각 페이지(시놉시스/시나리오/콘티/키비주얼/프롬프트) 정상 표시
- [ ] 외부 AI의 API 워크플로 영향 없음
