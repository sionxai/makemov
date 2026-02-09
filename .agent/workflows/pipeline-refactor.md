---
description: makemov 파이프라인 리팩토링 — 제작→수정→재수정 효율화
---

# makemov 파이프라인 리팩토링

## 문제 진단

### 현재 구조 (비효율적)
```
시온님 요청 → 에온이 seed JS 파일 생성 → db.js에 import 추가
→ Dashboard.jsx에 seed 호출 추가 → 브라우저 확인
→ 데이터 구조 불일치 → 크래시 → 디버그 → 재생성
```

### 핵심 문제 3가지
1. **스킬 양식 ≠ UI 양식**: synopsis/SKILL.md JSON과 DesignView가 기대하는 필드가 다름
2. **하드코딩 시드**: 프로젝트마다 seed 파일/import/호출을 수동 추가해야 함
3. **수정 불편**: 데이터를 고치려면 소스코드를 편집하고 IndexedDB 캐시도 처리해야 함

---

## 리팩토링 목표

```
시온님 요청 → 에온이 스킬 참조하여 데이터 생성
→ db.js API 호출로 IndexedDB에 직접 저장
→ UI 자동 반영 (새로고침만)
→ 수정 요청 → 에온이 해당 필드만 API로 패치
```

**핵심 원칙: 소스코드 수정 없이 데이터 CRUD만으로 제작/수정/재수정**

---

## Phase 1: 스키마 통일

### 1-1. 시놉시스 스키마 통일 (UI 기준으로 통합)

UI가 기대하는 구조 = 표준 스키마:

```javascript
// project.synopsis.structured 의 구조
{
    title: '',
    titleEn: '',
    info: {
        genre: '',
        runtime: '',
        tone: '',
        audience: '',
        format: '',
    },
    logline: '',
    theme: '',
    acts: [{ title: '', subtitle: '', content: '' }],
    characters: [{
        name: '', nameHanja: '', role: '', age: '',
        appearance: '', personality: '', motivation: '', arc: '',
    }],
    visualTone: {
        palette: '', lighting: '', camera: '', references: '',
    },
    sound: {
        bgm: '', sfx: '', narration: '',
    },
    keyScenes: [{ title: '', description: '' }],
}
```

**작업**: synopsis/SKILL.md의 JSON 출력 규격을 위 구조로 수정

### 1-2. 시나리오 스키마 확인

UI가 기대하는 구조:
```javascript
// project.screenplay.scenes[]
{
    scene_id: 'S1',
    slugline: '',
    tc_start: '',
    tc_end: '',
    duration_sec: 0,
    objective: '',
    conflict: '',
    turn: '',
    beats: [{ beat_id: '', type: '', duration_sec: 0, content: '', camera_hint: '' }],
    transition_out: '',
}
```

### 1-3. 줄콘티 스키마 확인

UI가 기대하는 구조:
```javascript
// project.conti (전체)
{
    title: '',
    totalDuration: '',
    promptContext: { era: '', culture: '', negatives: '' },
    scenes: [{
        scene_id: '',
        heading: '',
        scene_tc_start: '',
        scene_tc_end: '',
        cuts: [{
            cut_id: '',
            tc_start: '',
            tc_end: '',
            duration_sec: 0,
            shot: '',
            angle: '',
            camera_move: '',
            visual: '',
            dialogue: '',
            sfx: '',
            bgm: '',
            transition_out: '',
            sketch_prompt: '',
            keyvisual_priority: '',
        }],
    }],
    assumptions: [],
}
```

---

## Phase 2: DB API 정비

### 2-1. updateSynopsis 수정

현재 `updateSynopsis(id, content)` → content를 평문으로 저장
수정 → `updateSynopsis(id, structured)` → structured 객체로 저장

```javascript
export async function updateSynopsis(id, structured) {
    return updateProject(id, {
        synopsis: { structured, updatedAt: new Date().toISOString() },
    });
}
```

### 2-2. 나머지 API는 이미 올바르게 동작
- `updateScreenplay(id, scenes)` ✅
- `updateConti(id, contiData)` ✅
- `updateStoryboard(id, frames)` ✅

---

## Phase 3: Seed 의존성 제거

### 3-1. 새 프로젝트 = UI에서 생성 + API로 데이터 주입

워크플로:
1. 시온님이 UI에서 "새 프로젝트" 버튼 → 빈 프로젝트 생성 (이미 있는 기능)
2. 에온이 프로젝트 ID를 확인
3. 에온이 스킬 참조하여 각 단계 데이터를 생성
4. 에온이 브라우저에서 JS 실행으로 API 호출하여 데이터 주입
   ```javascript
   // 브라우저 콘솔에서 실행
   import { updateSynopsis } from '/src/db.js';
   await updateSynopsis('proj_xxx', synopsisData);
   ```
   또는 db.js 함수를 window에 노출시켜서 에온이 직접 호출

### 3-2. 기존 seed 함수 유지 (진주성/적벽대전)

기존 프로젝트의 seed는 유지하되, 새 프로젝트부터는 seed 불필요.

### 3-3. window에 API 노출 (개발 모드)

```javascript
// main.jsx 또는 App.jsx에 추가
if (import.meta.env.DEV) {
    window.__makemov = {
        updateSynopsis,
        updateScreenplay,
        updateConti,
        updateStoryboard,
        getProject,
        getAllProjects,
    };
}
```

이렇게 하면 에온이 브라우저에서:
```javascript
await window.__makemov.updateSynopsis('proj_xxx', data);
```
로 직접 데이터를 주입/수정 가능.

---

## Phase 4: 스킬 문서 업데이트

### 4-1. synopsis/SKILL.md — JSON 출력 규격을 Phase 1-1 스키마로 수정
### 4-2. SKILL_INDEX.md — 운영 원칙에 "API 주입 방식" 추가
### 4-3. 각 스킬에 "데이터 주입 방법" 섹션 추가

---

## Phase 5: 에온 워크플로 표준화

### 새 프로젝트 제작 흐름
```
1. 시온님: 주제/스토리 전달
2. 에온: synopsis/SKILL.md 참조 → 시놉시스 JSON 생성
3. 에온: 브라우저에서 window.__makemov.updateSynopsis(id, data) 실행
4. 시온님: UI에서 확인 → 피드백
5. 에온: 해당 필드만 패치하여 재주입
6. 시온님: 승인 → 다음 단계로
```

### 수정 흐름 (핵심!)
```
시온님: "제갈량 캐릭터 설명 수정해줘"
에온: synopsis.characters에서 해당 항목만 수정
에온: window.__makemov.updateSynopsis(id, updatedData) 실행
→ UI 즉시 반영 (새로고침)
```

---

## 실행 순서

// turbo-all

1. Phase 2-1: `updateSynopsis` API 수정 (structured 지원)
2. Phase 3-3: window에 API 노출 (개발 모드)
3. Phase 1-1: synopsis/SKILL.md 스키마를 UI 기준으로 통일
4. Phase 4: 스킬 문서 업데이트
5. 적벽대전 프로젝트로 새 워크플로 검증

---

## 성공 기준

- [ ] 새 프로젝트 생성 시 소스코드 수정 0건
- [ ] 시놉시스 데이터를 브라우저 콘솔에서 직접 주입 가능
- [ ] 수정 요청 시 해당 필드만 패치하여 UI 즉시 반영
- [ ] 스킬 JSON 출력 = UI 렌더링 입력 (변환 불필요)
