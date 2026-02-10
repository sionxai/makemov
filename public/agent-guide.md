# makemov AI Agent Guide — REST API

> 이 문서를 읽는 AI 에이전트는 아래 REST API로 영상 프리프로덕션 프로젝트를 생성·수정할 수 있습니다.
> 생성된 데이터는 Cloud Firestore에 저장되어 모든 브라우저에서 즉시 확인 가능합니다.

## 핵심 정보

| 항목 | 값 |
|------|-----|
| BASE_URL | 이 문서를 읽은 도메인 + `/api` (예: `https://makemov-ioe7.vercel.app/api`) |
| AUTH (읽기) | 불필요 (GET은 공개) |
| AUTH (쓰기) | `x-api-key` 헤더 필수 (POST/PATCH/DELETE) |
| Content-Type | `application/json` |
| 언어 | 모든 콘텐츠는 **한국어**로 작성 |

---

## ⚠️ 스킬 문서 (품질 기준 — 필독!)

> **스키마(형식)만으로는 품질이 보장되지 않습니다.** 아래 스킬 문서를 반드시 참조하세요.
> 각 단계의 밀도 공식, 품질 게이트, 체크리스트가 포함되어 있습니다.
>
> ⚡ 모든 스킬 문서는 **`/api/skills?name=`** 엔드포인트로 접근하세요 (SPA 폴백 없이 마크다운 원문 반환).

| 단계 | API 접근 | 핵심 내용 |
|------|----------|-----------|
| 시놉시스 | `GET /api/skills?name=synopsis` | ACT 구조, 밀도 기준, 인물 설계 |
| 시나리오 | `GET /api/skills?name=screenplay` | 씬 배분, 타임코드 정합, 대사 밀도 |
| 줄콘티 | `GET /api/skills?name=storyboard` | 컷 설계, 샷사이즈, 프롬프트 생성 규칙 |
| 프롬프트 | `GET /api/skills?name=cinematic_prompt` | AI 실사 이미지 프롬프트 가이드 |
| 키비주얼 | `GET /api/skills?name=keyvisual` | 핵심 컷 이미지 자산 확정 |
| 영상화 | `GET /api/skills?name=videoproduction` | 플랫폼별 영상 생성 프롬프트 |

📌 **스킬 목록:** `GET /api/skills` (파라미터 없이)



## 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| `GET` | `/api/agent-guide` | 이 가이드 문서 (마크다운 원문) |
| `GET` | `/api/skills` | 스킬 목록 조회 |
| `GET` | `/api/skills?name={name}` | 개별 스킬 문서 조회 (마크다운 원문) |
| `GET` | `/api/projects` | 전체 프로젝트 목록 조회 |
| `POST` | `/api/projects` | 새 프로젝트 생성 |
| `GET` | `/api/projects/{id}` | 단일 프로젝트 조회 |
| `PATCH` | `/api/projects/{id}` | 프로젝트 업데이트 (시놉시스, 시나리오, 콘티 등) |
| `DELETE` | `/api/projects/{id}` | 프로젝트 삭제 |

---

## STEP 1: 프로젝트 생성

```bash
curl -X POST https://makemov-ioe7.vercel.app/api/projects \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"title":"적벽대전 — 화공의 밤","description":"208년 제갈량과 주유의 화공 작전"}'
```

**응답:**
```json
{
  "message": "Project created: PROJECT_ID",
  "project": {
    "id": "PROJECT_ID",
    "title": "적벽대전 — 화공의 밤",
    "status": "draft",
    "synopsis": { "structured": null },
    "screenplay": { "scenes": [] },
    "conti": { "scenes": [] },
    "storyboard": { "frames": [] },
    "keyvisuals": [],
    "productionPrompts": []
  }
}
```

---

## STEP 2: 시놉시스 작성

```bash
curl -X PATCH https://makemov-ioe7.vercel.app/api/projects/PROJECT_ID \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"synopsis": { ...시놉시스 스키마... }}'
```

### 시놉시스 스키마 (Synopsis Schema)

⚠️ 이 스키마가 `project.synopsis.structured`에 저장되어 UI에 직접 반영됩니다. 필드명을 정확히 준수하세요.

```json
{
  "title": "프로젝트 제목 (한국어)",
  "titleEn": "PROJECT TITLE — ENGLISH SUBTITLE",
  "info": {
    "genre": "역사 서사극 / 코믹 / 출판 광고",
    "runtime": "80초",
    "tone": "압도적 전장 → 감탄 → 시간이동 → 서사극 → 코믹 → 경외",
    "audience": "역사·문학 콘텐츠 소비자 25-55",
    "format": "YouTube Shorts 세로형 (9:16)"
  },
  "logline": "1~2문장. 갈등과 목표가 보여야 한다.",
  "theme": "핵심 테마 한 줄",
  "acts": [
    {
      "title": "도입",
      "subtitle": "COLD OPEN (0~10초) — 핵심 키워드",
      "content": "문단별 \\n\\n 구분. 촬영 가능한 시각 묘사 중심."
    },
    {
      "title": "전개",
      "subtitle": "ACT 1 (10~30초) — 핵심 키워드",
      "content": "..."
    },
    {
      "title": "위기",
      "subtitle": "ACT 2 (30~52초) — 핵심 키워드",
      "content": "..."
    },
    {
      "title": "결말",
      "subtitle": "ACT 3 + OUTRO (52~80초) — 핵심 키워드",
      "content": "..."
    }
  ],
  "characters": [
    {
      "name": "제갈량",
      "nameHanja": "諸葛亮",
      "role": "오군 군사",
      "age": "27",
      "appearance": "외형 묘사",
      "personality": "성격 키워드",
      "motivation": "동기",
      "arc": "캐릭터 아크"
    }
  ],
  "visualTone": {
    "palette": "색감 팔레트 설명",
    "lighting": "조명 스타일",
    "camera": "카메라/렌즈/앵글",
    "references": "레퍼런스 쉼표 구분"
  },
  "sound": {
    "bgm": "BGM 방향",
    "sfx": "SFX 키워드 쉼표 구분",
    "narration": "내레이션 스타일"
  },
  "keyScenes": [
    {
      "title": "★ 콜드 오픈 — 불바다",
      "description": "1줄 요약"
    }
  ]
}
```

---

## STEP 3: 시나리오 작성

```bash
curl -X PATCH https://makemov-ioe7.vercel.app/api/projects/PROJECT_ID \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"screenplay": [ ...씬 배열... ]}'
```

### 시나리오 스키마 (Screenplay Scene Schema)

```json
[
  {
    "number": 1,
    "scene_id": "S1",
    "heading": "EXT. 장강 — 밤",
    "action": "붉은 화염이 강 위를 뒤덮는다. (10분 기준: 최소 150자 이상)",
    "dialogue": "조조군 병사: 불길이 배를 삼킨다!",
    "notes": "러닝타임 00:00~00:45. 항공 롱샷에서 화염 클로즈업으로 전환"
  }
]
```

**런타임별 밀도 기준:**

| 러닝타임 | 최소 씬 | 씬당 action | 씬당 total | 전체 |
|----------|---------|-------------|------------|------|
| ≤120초 | 5 | 50자+ | 80자+ | 500자+ |
| ≤5분 | 8 | 100자+ | 150자+ | 1200자+ |
| ≤10분 | 12 | 150자+ | 250자+ | 3000자+ |
| ≤15분 | 16 | 180자+ | 280자+ | 4500자+ |

---

## STEP 4: 줄콘티 작성

```bash
curl -X PATCH https://makemov-ioe7.vercel.app/api/projects/PROJECT_ID \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"conti": { ...줄콘티 스키마... }}'
```

### 줄콘티 스키마 (Conti Schema)

```json
{
  "title": "줄콘티 제목",
  "totalDuration": "80초",
  "promptContext": {
    "era": "후한 말기 208년",
    "culture": "삼국시대 군사/외교",
    "negatives": "네거티브 프롬프트 키워드"
  },
  "scenes": [
    {
      "scene_id": "S1",
      "heading": "EXT. 장강 — 밤",
      "scene_tc_start": "00:00",
      "scene_tc_end": "00:10",
      "cuts": [
        {
          "cut_id": "S1-C1",
          "tc_start": "00:00",
          "tc_end": "00:05",
          "duration_sec": 5,
          "shot": "EWS (Extreme Wide Shot)",
          "angle": "HIGH ANGLE",
          "camera_move": "SLOW DOLLY IN",
          "visual": "시각 묘사",
          "dialogue": "대사",
          "sfx": "불꽃 소리, 함성",
          "bgm": "오케스트라 포르티시모",
          "transition_out": "MATCH CUT",
          "sketch_prompt": "완성형 실사 프롬프트",
          "keyvisual_priority": "HIGH"
        }
      ]
    }
  ],
  "assumptions": ["가정 사항 목록"]
}
```

---

## STEP 5: 키비주얼 & 프로덕션 프롬프트

```bash
# 키비주얼 추가
curl -X PATCH https://makemov-ioe7.vercel.app/api/projects/PROJECT_ID \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"keyvisuals": [{"id":"kv_1","title":"장면 제목","imageUrl":"...","prompt":"프롬프트","scene":"S1-C1"}]}'

# 프로덕션 프롬프트 추가
curl -X PATCH https://makemov-ioe7.vercel.app/api/projects/PROJECT_ID \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"productionPrompts": [{"id":"pp_1","title":"제목","type":"video","prompt":"...","scene":"S1"}]}'
```

---

## 파이프라인 흐름

```
시놉시스 → 시나리오 → 줄콘티 → 스토리보드/키비주얼 → 프로덕션 프롬프트 → 영상화
```

- `info.runtime`이 시나리오의 밀도를 결정합니다
- 80초 숏츠와 10분 단편은 같은 구조가 될 수 없습니다
- 모든 콘텐츠는 **한국어**로 작성하세요

---

## 완전한 워크플로 예시

```javascript
const BASE = 'https://makemov-ioe7.vercel.app/api';
const KEY = 'YOUR_API_KEY';

// 1. 프로젝트 생성
const res1 = await fetch(BASE + '/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': KEY },
  body: JSON.stringify({
    title: '관우의 오관참장',
    description: '5개의 관문을 돌파하는 관우의 여정. 유튜브 숏츠 60초.'
  })
});
const { project } = await res1.json();
const projectId = project.id;

// 2. 시놉시스 작성
await fetch(BASE + '/projects/' + projectId, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', 'x-api-key': KEY },
  body: JSON.stringify({
    synopsis: {
      title: '관우의 오관참장',
      titleEn: 'GUAN YU — PASSAGE THROUGH FIVE PASSES',
      info: { genre: '역사 액션', runtime: '60초', tone: '비장 → 액션 → 감동', audience: '삼국지 팬', format: 'YouTube Shorts (9:16)' },
      logline: '형을 찾아 5개의 관문을 돌파하는 관우.',
      theme: '의리는 칼보다 강하다',
      acts: [
        { title: '도입', subtitle: 'COLD OPEN (0~8초)', content: '관문 앞 관우의 적토마...' },
        { title: '전개', subtitle: 'ACT 1 (8~25초)', content: '5개 관문 연속 돌파...' },
        { title: '위기', subtitle: 'ACT 2 (25~42초)', content: '마지막 관문의 딜레마...' },
        { title: '결말', subtitle: 'OUTRO (42~60초)', content: '형제 재회...' }
      ],
      characters: [{ name: '관우', nameHanja: '關羽', role: '주인공', age: '38', appearance: '붉은 얼굴', personality: '의리', motivation: '유비를 찾아야 한다', arc: '장수 → 전설' }],
      visualTone: { palette: '붉은 톤', lighting: '역광', camera: '로우 앵글', references: '적벽대전' },
      sound: { bgm: '얼후 + 오케스트라', sfx: '검 부딪힘', narration: '' },
      keyScenes: [{ title: '적토마 질주', description: '관문을 향해 달리는 관우' }]
    }
  })
});

// 3. 시나리오 작성
await fetch(BASE + '/projects/' + projectId, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', 'x-api-key': KEY },
  body: JSON.stringify({
    screenplay: [
      { number: 1, scene_id: 'S1', heading: 'EXT. 관문 — 새벽', action: '적토마 위의 관우...', dialogue: '', notes: '' },
      // ... 추가 씬
    ]
  })
});

// 4. 결과 확인 (인증 불필요)
const check = await fetch(BASE + '/projects/' + projectId);
const result = await check.json();
console.log('✅ 완료:', result.project.title);
```

---

## 중요 규칙

1. 모든 콘텐츠는 **한국어**로 작성
2. 시놉시스 스키마를 **정확히** 준수할 것
3. 수정 시 전체 재작성보다 해당 필드만 패치 권장
4. 작업 후 `GET /api/projects/{id}`로 결과 검증 필수
5. 쓰기 작업에는 반드시 `x-api-key` 헤더 포함
