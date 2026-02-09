import { useState, useEffect } from 'react';

// ── Copy 버튼 ────────────────────────────────────
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button className="agent-copy-btn" onClick={handleCopy}>
      {copied ? '✅ 복사됨' : '📋 복사'}
    </button>
  );
}

// ── 코드 블록 ────────────────────────────────────
function CodeBlock({ title, code, lang = 'javascript' }) {
  return (
    <div className="agent-code-block">
      <div className="agent-code-header">
        <span className="agent-code-lang">{lang}</span>
        <span className="agent-code-title">{title}</span>
        <CopyBtn text={code} />
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
}

// ── 섹션 카드 ────────────────────────────────────
function Section({ icon, title, id, children }) {
  return (
    <section className="agent-section" id={id}>
      <h2><span className="agent-section-icon">{icon}</span>{title}</h2>
      {children}
    </section>
  );
}

// ── 테이블 ───────────────────────────────────────
function ApiTable({ rows }) {
  return (
    <div className="agent-table-wrap">
      <table className="agent-table">
        <thead>
          <tr>
            <th>함수</th>
            <th>파라미터</th>
            <th>설명</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td><code>{r.fn}</code></td>
              <td><code>{r.params}</code></td>
              <td>{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════════════
export default function AgentGuidePage() {
  const [projectList, setProjectList] = useState([]);

  useEffect(() => {
    (async () => {
      if (window.__makemov) {
        const projects = await window.__makemov.getAllProjects();
        setProjectList(projects.map(p => ({ id: p.id, title: p.title, status: p.status })));
      }
    })();
  }, []);

  return (
    <div className="agent-guide-page">
      {/* ── Hero ──────────────────────────── */}
      <header className="agent-hero">
        <div className="agent-hero-badge">🤖 AI AGENT GUIDE</div>
        <h1>makemov API 가이드</h1>
        <p className="agent-hero-sub">
          이 페이지를 AI 에이전트에게 전달하세요.<br />
          에이전트가 자동으로 영상 프리프로덕션 데이터를 생성·수정할 수 있습니다.
        </p>
        <div className="agent-hero-links">
          <a href="#rest-api" className="agent-btn-primary">🌐 REST API (권장)</a>
          <a href="#schemas" className="agent-btn-secondary">📐 데이터 스키마</a>
          <a href="#instructions" className="agent-btn-secondary">🔧 로컬 DEV API</a>
        </div>
      </header>

      {/* ── Agent Instructions (DEV-only) ─── */}
      <Section icon="🔧" title="로컬 개발 전용 API (DEV_SERVER_ONLY)" id="instructions">
        <p className="agent-note">
          ⚠️ <strong>이 섹션은 로컬 개발 서버(localhost)에서만 사용 가능합니다.</strong><br />
          프로덕션에서는 위의 <a href="#rest-api">🌐 REST API</a>를 사용하세요.<br />
          <code>window.__makemov</code>는 <code>import.meta.env.DEV</code> 모드에서만 노출됩니다.
        </p>
        <div className="agent-instruction-box">
          <div className="agent-kv-row"><span className="agent-kv-key">RUNTIME</span><span className="agent-kv-val">Browser JavaScript (window.__makemov)</span></div>
          <div className="agent-kv-row"><span className="agent-kv-key">DEV_SERVER</span><span className="agent-kv-val">http://localhost:5177</span></div>
          <div className="agent-kv-row"><span className="agent-kv-key">AUTH</span><span className="agent-kv-val">없음 (로컬 개발 전용)</span></div>
          <div className="agent-kv-row"><span className="agent-kv-key">DB</span><span className="agent-kv-val">IndexedDB (브라우저 내장)</span></div>
          <div className="agent-kv-row"><span className="agent-kv-key">LANGUAGE</span><span className="agent-kv-val">ko-KR (한국어 필수)</span></div>
        </div>

        <CodeBlock title="에이전트 사용법" code={`# MAKEMOV AI AGENT INSTRUCTIONS
# 이 지침을 따라 영상 프리프로덕션 데이터를 생성·수정하세요.

## 접속 방법
1. 브라우저에서 http://localhost:5177 접속
2. window.__makemov 객체로 모든 API 사용 가능
3. 인증 불필요 (로컬 개발 환경)

## ⚠️ 핵심 주의: IndexedDB 인스턴스 격리
IndexedDB는 브라우저 인스턴스별로 독립적입니다.
- AI 에이전트가 별도 브라우저(Puppeteer, Playwright 등)에서
  window.__makemov API를 호출하면, 그 데이터는 그 브라우저에만 저장됩니다.
- 사용자의 브라우저(Chrome, Safari 등)에는 반영되지 않습니다!

## ✅ 올바른 데이터 수정 방법 (2가지)

### 방법 A: 사용자 브라우저 콘솔에서 실행 (임시 수정)
- 사용자에게 JavaScript 코드를 전달
- 사용자가 직접 브라우저 콘솔(F12)에서 실행
- 장점: 즉시 반영 / 단점: 브라우저 데이터 삭제 시 소실

### 방법 B: 소스 파일 직접 수정 (영구 보존) ← 권장
- src/data/ 디렉토리의 JS 소스 파일을 수정
- 앱 시작 시 seed 함수가 자동으로 DB에 반영
- 장점: 영구 보존, 어떤 브라우저에서든 동일 / 단점: 버전관리 필요

소스 파일 경로:
  시놉시스: src/data/{project}-synopsis.js (export const XXX_SYNOPSIS)
  시나리오: src/data/{project}-screenplay.js
  줄콘티:   src/data/{project}-conti.js
  스토리보드: src/data/{project}-storyboard.js
  프로젝트 메타: src/data/{project}-seed.js (제목, 설명, 상태 등)
  시드 등록: src/db.js → seed{ProjectName}Project() 함수

## STEP 1: 프로젝트 목록 확인
await window.__makemov.getAllProjects()
// → [{ id, title, status, synopsis, screenplay, conti, ... }]

## STEP 2: 특정 프로젝트 조회
await window.__makemov.getProject('proj_id')

## STEP 3: 새 프로젝트 생성
await window.__makemov.createProject('프로젝트 제목', '프로젝트 설명')
// → { id: 'proj_xxx', title, description, ... }

## STEP 4: 시놉시스 작성/수정
await window.__makemov.updateSynopsis('proj_id', synopsisData)
// synopsisData = { title, titleEn, info, logline, theme, acts, characters, visualTone, sound, keyScenes }
// ⚠️ 자동 검증: 필수 필드, 최소 분량, 런타임별 ACT 길이 체크
// 검증 실패 시 [SynopsisValidation] 에러 발생

## STEP 5: 시나리오 작성/수정
await window.__makemov.updateScreenplay('proj_id', scenesArray)
// scenesArray = [{ number, scene_id, heading, action, dialogue, notes }]
// ⚠️ 자동 검증: 시놉시스의 info.runtime 기반 밀도 검증
//   - 10분 → 최소 12씬, 씬당 action 150자+, total 250자+, 전체 3000자+
//   - 80초 → 최소 5씬, 씬당 action 50자+, total 80자+, 전체 500자+
// 검증 실패 시 [ScreenplayValidation] 에러 발생

## STEP 6: 줄콘티 작성/수정
await window.__makemov.updateConti('proj_id', contiData)
// contiData = { title, totalDuration, scenes: [{ scene_id, cuts: [...] }] }

## STEP 7: 스토리보드 업데이트
await window.__makemov.updateStoryboard('proj_id', framesArray)

## STEP 8: 키비주얼 추가
await window.__makemov.addKeyVisual('proj_id', { title, imageUrl, prompt, scene })

## STEP 9: 프로덕션 프롬프트 추가
await window.__makemov.addProductionPrompt('proj_id', { title, type, prompt, scene })

## IMPORTANT RULES
1. 모든 콘텐츠는 한국어로 작성
2. 시놉시스 스키마를 정확히 준수할 것
3. 수정 시 전체 재작성보다 해당 필드만 패치 권장
4. 작업 후 getProject()로 결과 검증 필수
5. ⚠️ 별도 브라우저에서 API 호출 시 사용자 브라우저에 반영 안 됨
6. 영구 보존이 필요하면 반드시 src/data/ 소스 파일을 수정할 것`} lang="markdown" />
      </Section>

      {/* ── REST API (외부 AI용) ────────────── */}
      <Section icon="🌐" title="REST API (외부 AI 에이전트용)" id="rest-api">
        <div className="agent-instruction-box">
          <div className="agent-kv-row"><span className="agent-kv-key">BASE_URL</span><span className="agent-kv-val">https://makemov.vercel.app/api</span></div>
          <div className="agent-kv-row"><span className="agent-kv-key">AUTH_READ</span><span className="agent-kv-val">불필요 (GET은 공개)</span></div>
          <div className="agent-kv-row"><span className="agent-kv-key">AUTH_WRITE</span><span className="agent-kv-val">x-api-key 헤더 필수 (POST/PATCH/DELETE)</span></div>
          <div className="agent-kv-row"><span className="agent-kv-key">CONTENT_TYPE</span><span className="agent-kv-val">application/json</span></div>
          <div className="agent-kv-row"><span className="agent-kv-key">DB</span><span className="agent-kv-val">Cloud Firestore (모든 브라우저에서 공유)</span></div>
        </div>

        <p className="agent-note">
          ✅ <strong>이 API는 브라우저 없이 HTTP 요청만으로 사용 가능합니다.</strong><br />
          외부 AI 에이전트(ChatGPT, Claude, Gemini 등)가 직접 호출할 수 있습니다.<br />
          GET은 인증 없이 공개. <strong>쓰기(POST/PATCH/DELETE)는 x-api-key 헤더 필수.</strong><br />
          생성된 프로젝트는 Firestore에 저장되어 <strong>모든 브라우저에서 즉시 확인</strong>할 수 있습니다.
        </p>

        <h3>📋 엔드포인트 목록</h3>
        <div className="agent-table-wrap">
          <table className="agent-table">
            <thead>
              <tr><th>Method</th><th>Endpoint</th><th>설명</th></tr>
            </thead>
            <tbody>
              <tr><td><code>GET</code></td><td><code>/api/projects</code></td><td>전체 프로젝트 목록 조회</td></tr>
              <tr><td><code>POST</code></td><td><code>/api/projects</code></td><td>새 프로젝트 생성</td></tr>
              <tr><td><code>GET</code></td><td><code>/api/projects/[id]</code></td><td>단일 프로젝트 조회</td></tr>
              <tr><td><code>PATCH</code></td><td><code>/api/projects/[id]</code></td><td>프로젝트 업데이트 (시놉시스, 시나리오, 콘티 등)</td></tr>
              <tr><td><code>DELETE</code></td><td><code>/api/projects/[id]</code></td><td>프로젝트 삭제</td></tr>
            </tbody>
          </table>
        </div>

        <CodeBlock title="1. 프로젝트 생성" code={`// POST /api/projects
const res = await fetch('https://makemov.vercel.app/api/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: '적벽대전 — 화공의 밤',
    description: '208년 조조 대군을 상대로 한 제갈량과 주유의 화공 작전'
  })
});
const { project } = await res.json();
console.log('Created:', project.id);`} />

        <CodeBlock title="2. 시놉시스 작성" code={`// PATCH /api/projects/[id]
const res = await fetch('https://makemov.vercel.app/api/projects/' + projectId, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    synopsis: {
      title: '적벽대전 — 화공의 밤',
      titleEn: 'RED CLIFF — NIGHT OF FIRE',
      info: {
        genre: '역사 서사극',
        runtime: '약 3분 (180초)',
        tone: '장엄 / 비장 / 카타르시스',
        audience: '역사 관심층, 밀리터리 팬',
        format: '숏폼 시네마틱 (세로 9:16 / 가로)'
      },
      logline: '208년 겨울, ...',
      // ... 전체 시놉시스 스키마는 아래 '데이터 스키마' 섹션 참조
    }
  })
});`} />

        <CodeBlock title="3. 시나리오 작성" code={`// PATCH /api/projects/[id]
const res = await fetch('https://makemov.vercel.app/api/projects/' + projectId, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    screenplay: [
      { number: 1, scene_id: 'S1', heading: 'EXT. 장강 수면 — 새벽', action: '안개가...', dialogue: '', notes: '' },
      { number: 2, scene_id: 'S2', heading: 'INT. 주유 진영 — 밤', action: '주유가...', dialogue: '주유: 때가 왔다.', notes: '' },
      // ...
    ]
  })
});`} />

        <CodeBlock title="4. 줄콘티 작성" code={`// PATCH /api/projects/[id]
const res = await fetch('https://makemov.vercel.app/api/projects/' + projectId, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    conti: {
      title: '적벽대전 줄콘티',
      totalDuration: '약 180초',
      promptContext: { era: '208, Three Kingdoms...', culture: '...', negatives: '...' },
      scenes: [
        { scene_id: 'S1', heading: 'EXT. 장강 — 새벽', scene_tc_start: '00:00.0', scene_tc_end: '00:25.0',
          cuts: [
            { cut_id: 'S1-C1', tc_start: '00:00.0', tc_end: '00:05.0', duration_sec: 5, shot: 'EWS', ... }
          ]
        }
      ]
    }
  })
});`} />

        <CodeBlock title="curl 예시 (터미널/CLI)" code={`# 프로젝트 목록 조회
curl https://makemov.vercel.app/api/projects

# 새 프로젝트 생성
curl -X POST https://makemov.vercel.app/api/projects \\
  -H "Content-Type: application/json" \\
  -d '{"title":"테스트 프로젝트","description":"AI가 만든 테스트"}'

# 프로젝트 상세 조회
curl https://makemov.vercel.app/api/projects/PROJECT_ID

# 시놉시스 업데이트
curl -X PATCH https://makemov.vercel.app/api/projects/PROJECT_ID \\
  -H "Content-Type: application/json" \\
  -d '{"synopsis":{"title":"...","info":{...},...}}'

# 프로젝트 삭제
curl -X DELETE https://makemov.vercel.app/api/projects/PROJECT_ID`} lang="bash" />
      </Section>

      {/* ── API 함수 목록 ─────────────────── */}
      <Section icon="📚" title="API 함수 목록" id="api">
        <ApiTable rows={[
          { fn: 'getAllProjects()', params: '없음', desc: '전체 프로젝트 목록 조회' },
          { fn: 'getProject(id)', params: 'id: string', desc: '특정 프로젝트 상세 조회' },
          { fn: 'createProject(title, desc)', params: 'title: string, desc: string', desc: '새 프로젝트 생성' },
          { fn: 'updateProject(id, updates)', params: 'id: string, updates: object', desc: '프로젝트 메타 수정' },
          { fn: 'deleteProject(id)', params: 'id: string', desc: '프로젝트 삭제' },
          { fn: 'updateSynopsis(id, data)', params: 'id: string, data: object|string', desc: '시놉시스 작성/수정 (핵심 API)' },
          { fn: 'updateScreenplay(id, scenes)', params: 'id: string, scenes: array', desc: '시나리오 작성/수정' },
          { fn: 'updateConti(id, contiData)', params: 'id: string, contiData: object', desc: '줄콘티 작성/수정' },
          { fn: 'updateStoryboard(id, frames)', params: 'id: string, frames: array', desc: '스토리보드 업데이트' },
          { fn: 'addKeyVisual(id, visual)', params: 'id: string, visual: object', desc: '키비주얼 추가' },
          { fn: 'removeKeyVisual(projId, visId)', params: 'projId: string, visId: string', desc: '키비주얼 삭제' },
          { fn: 'addProductionPrompt(id, prompt)', params: 'id: string, prompt: object', desc: '프로덕션 프롬프트 추가' },
          { fn: 'removeProductionPrompt(projId, pId)', params: 'projId: string, pId: string', desc: '프로덕션 프롬프트 삭제' },
          { fn: 'exportProject(id)', params: 'id: string', desc: '프로젝트 JSON 내보내기' },
          { fn: 'importProject(jsonString)', params: 'jsonString: string', desc: '프로젝트 JSON 가져오기' },
        ]} />
      </Section>

      {/* ── 데이터 스키마 ─────────────────── */}
      <Section icon="📐" title="데이터 스키마" id="schemas">
        <h3>시놉시스 (Synopsis) — <code>updateSynopsis(id, data)</code></h3>
        <p className="agent-note">⚠️ 이 스키마가 <code>project.synopsis.structured</code>에 저장되어 UI에 직접 반영됩니다. 필드명을 정확히 준수하세요.</p>
        <CodeBlock title="Synopsis Schema" code={`{
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
}`} lang="json" />

        <h3>시나리오 (Screenplay) — <code>updateScreenplay(id, scenes)</code></h3>
        <p className="agent-note">⚠️ <strong>런타임 기반 자동 검증:</strong> 시놉시스의 <code>info.runtime</code>에 따라 씬 수·action 밀도·전체 분량이 자동으로 검증됩니다. 기준 미달 시 저장이 거부됩니다.</p>
        <CodeBlock title="Screenplay Scene Schema" code={`[
  {
    "number": 1,
    "scene_id": "S1",
    "heading": "EXT. 장강 — 밤",
    "action": "붉은 화염이 강 위를 뒤덮는다. (10분 기준: 최소 150자 이상)",
    "dialogue": "조조군 병사: 불길이 배를 삼킨다!",
    "notes": "러닝타임 00:00~00:45. 항공 롱샷에서 화염 클로즈업으로 전환"
  }
]

// 런타임별 밀도 기준:
// ≤120초: 5씬+, action 50자+, total 80자+, 전체 500자+
// ≤5분:   8씬+, action 100자+, total 150자+, 전체 1200자+
// ≤10분: 12씬+, action 150자+, total 250자+, 전체 3000자+
// ≤15분: 16씬+, action 180자+, total 280자+, 전체 4500자+`} lang="json" />

        <h3>줄콘티 (Line Conti) — <code>updateConti(id, contiData)</code></h3>
        <CodeBlock title="Conti Schema" code={`{
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
}`} lang="json" />
      </Section>

      {/* ── 빠른 예제 ────────────────────── */}
      <Section icon="💡" title="빠른 예제" id="examples">
        <h3>예제 1: 시놉시스 수정 (특정 필드만 패치)</h3>
        <CodeBlock title="시놉시스 부분 수정" code={`// 제갈량 캐릭터 설명만 수정하기
const project = await window.__makemov.getProject('proj_redcliff_ad');
const syn = project.synopsis.structured;

// characters 배열에서 제갈량 찾기
const idx = syn.characters.findIndex(c => c.name === '제갈량');
syn.characters[idx].personality = '냉철하지만 유머 감각이 있는 전략가';
syn.characters[idx].arc = '관찰자 → 동풍 조종자 → 승리의 설계자';

await window.__makemov.updateSynopsis('proj_redcliff_ad', syn);
// → UI 새로고침하면 즉시 반영`} />

        <h3>예제 2: 새 프로젝트 생성 + 시놉시스 주입</h3>
        <CodeBlock title="새 프로젝트 풀 워크플로" code={`// 1. 프로젝트 생성
const proj = await window.__makemov.createProject(
  '관우의 오관참장',
  '5개의 관문을 돌파하는 관우의 여정. 유튜브 숏츠 60초.'
);

// 2. 시놉시스 작성
const synopsis = {
  title: '관우의 오관참장',
  titleEn: 'GUAN YU — PASSAGE THROUGH FIVE PASSES',
  info: {
    genre: '역사 액션 / 서사극',
    runtime: '60초',
    tone: '비장 → 액션 → 의리 → 감동',
    audience: '삼국지 팬 20-45',
    format: 'YouTube Shorts 세로형 (9:16)',
  },
  logline: '형을 찾아 5개의 관문을 돌파하는 관우. 칼은 적을 베지만, 의리는 적마저 감동시킨다.',
  theme: '의리는 칼보다 강하다',
  acts: [
    { title: '도입', subtitle: 'COLD OPEN (0~8초)', content: '관문 앞 관우의 적토마...' },
    { title: '전개', subtitle: 'ACT 1 (8~25초)', content: '5개 관문 연속 돌파...' },
    { title: '위기', subtitle: 'ACT 2 (25~42초)', content: '마지막 관문의 딜레마...' },
    { title: '결말', subtitle: 'OUTRO (42~60초)', content: '형제 재회...' },
  ],
  characters: [
    { name: '관우', nameHanja: '關羽', role: '주인공', age: '38', appearance: '붉은 얼굴, 장대한 체구', personality: '의리, 충절', motivation: '유비를 찾아가야 한다', arc: '고립된 장수 → 전설의 무장' },
  ],
  visualTone: { palette: '붉은 톤, 황금빛', lighting: '역광, 새벽빛', camera: '로우 앵글, 슬로모션', references: '적벽대전, 삼국지 연의' },
  sound: { bgm: '얼후 + 오케스트라', sfx: '검 부딪힘, 말발굽', narration: '' },
  keyScenes: [
    { title: '적토마 질주', description: '관문을 향해 달리는 관우' },
    { title: '청룡언월도', description: '한 칼에 적장을 베는 순간' },
  ],
};

await window.__makemov.updateSynopsis(proj.id, synopsis);
console.log('✅ 완료! ID:', proj.id);`} />

        <h3>예제 3: 결과 검증</h3>
        <CodeBlock title="작업 결과 검증" code={`const project = await window.__makemov.getProject('proj_xxx');
console.log({
  title: project.title,
  hasSynopsis: !!project.synopsis?.structured,
  hasScreenplay: !!project.screenplay?.scenes?.length,
  hasConti: !!project.conti?.scenes?.length,
  actsCount: project.synopsis?.structured?.acts?.length,
  charactersCount: project.synopsis?.structured?.characters?.length,
});`} />
      </Section>

      {/* ── 파이프라인 흐름 ───────────────── */}
      <Section icon="🔄" title="파이프라인 흐름" id="pipeline">
        <p className="agent-note">💡 <strong>핵심:</strong> 시놉시스의 <code>info.runtime</code>이 시나리오의 밀도를 결정합니다. 80초 숏츠와 10분 단편은 같은 구조가 될 수 없습니다.</p>
        <div className="agent-pipeline-flow">
          <div className="agent-pipeline-step">
            <div className="agent-pipeline-num">1</div>
            <div className="agent-pipeline-label">시놉시스</div>
            <div className="agent-pipeline-fn">updateSynopsis()</div>
            <div className="agent-pipeline-detail">runtime 설정 → 밀도 기준 결정</div>
          </div>
          <div className="agent-pipeline-arrow">→</div>
          <div className="agent-pipeline-step">
            <div className="agent-pipeline-num">2</div>
            <div className="agent-pipeline-label">시나리오</div>
            <div className="agent-pipeline-fn">updateScreenplay()</div>
            <div className="agent-pipeline-detail">runtime 기반 밀도 자동 검증</div>
          </div>
          <div className="agent-pipeline-arrow">→</div>
          <div className="agent-pipeline-step">
            <div className="agent-pipeline-num">3</div>
            <div className="agent-pipeline-label">줄콘티</div>
            <div className="agent-pipeline-fn">updateConti()</div>
          </div>
          <div className="agent-pipeline-arrow">→</div>
          <div className="agent-pipeline-step">
            <div className="agent-pipeline-num">4</div>
            <div className="agent-pipeline-label">스토리보드</div>
            <div className="agent-pipeline-fn">updateStoryboard()</div>
          </div>
          <div className="agent-pipeline-arrow">→</div>
          <div className="agent-pipeline-step">
            <div className="agent-pipeline-num">5</div>
            <div className="agent-pipeline-label">키비주얼</div>
            <div className="agent-pipeline-fn">addKeyVisual()</div>
          </div>
          <div className="agent-pipeline-arrow">→</div>
          <div className="agent-pipeline-step">
            <div className="agent-pipeline-num">6</div>
            <div className="agent-pipeline-label">프롬프트</div>
            <div className="agent-pipeline-fn">addProductionPrompt()</div>
          </div>
        </div>
      </Section>

      {/* ── 현재 프로젝트 목록 ────────────── */}
      <Section icon="📦" title="현재 프로젝트" id="projects">
        {projectList.length > 0 ? (
          <div className="agent-table-wrap">
            <table className="agent-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>제목</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {projectList.map(p => (
                  <tr key={p.id}>
                    <td><code>{p.id}</code></td>
                    <td>{p.title}</td>
                    <td><span className={`agent-status agent-status-${p.status}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="agent-note">⚠️ DEV 모드에서만 프로젝트 목록이 표시됩니다.</p>
        )}
      </Section>

      {/* ── 주의사항 ──────────────────────── */}
      <Section icon="⚠️" title="주의사항" id="rules">
        <div className="agent-rules-grid">
          <div className="agent-rule-card">
            <div className="agent-rule-icon">🌐</div>
            <div className="agent-rule-text">
              <strong>한국어 필수</strong>
              <p>모든 콘텐츠(제목, 설명, 대사, 액션)는 한국어로 작성</p>
            </div>
          </div>
          <div className="agent-rule-card">
            <div className="agent-rule-icon">📐</div>
            <div className="agent-rule-text">
              <strong>스키마 준수</strong>
              <p>필드명을 정확히 준수하세요. 잘못된 필드명은 UI가 렌더링하지 않습니다.</p>
            </div>
          </div>
          <div className="agent-rule-card">
            <div className="agent-rule-icon">🔧</div>
            <div className="agent-rule-text">
              <strong>최소 범위 패치</strong>
              <p>수정 시 전체 재작성보다 해당 필드만 변경하세요.</p>
            </div>
          </div>
          <div className="agent-rule-card">
            <div className="agent-rule-icon">✅</div>
            <div className="agent-rule-text">
              <strong>결과 검증</strong>
              <p>작업 후 반드시 getProject()로 저장 결과를 확인하세요.</p>
            </div>
          </div>
          <div className="agent-rule-card">
            <div className="agent-rule-icon">🎬</div>
            <div className="agent-rule-text">
              <strong>시각 중심 서술</strong>
              <p>모든 묘사는 촬영 가능한 시각 정보 중심으로 작성하세요.</p>
            </div>
          </div>
          <div className="agent-rule-card">
            <div className="agent-rule-icon">💾</div>
            <div className="agent-rule-text">
              <strong>로컬 전용</strong>
              <p>IndexedDB 기반이므로 브라우저 데이터 삭제 시 데이터가 사라집니다. 중요 데이터는 exportProject()로 백업하세요.</p>
            </div>
          </div>
          <div className="agent-rule-card">
            <div className="agent-rule-icon">🚨</div>
            <div className="agent-rule-text">
              <strong>브라우저 인스턴스 격리</strong>
              <p>IndexedDB는 브라우저 인스턴스별로 독립적입니다. Puppeteer/Playwright 등 별도 브라우저에서 API를 호출하면 사용자 브라우저에 반영되지 않습니다.</p>
            </div>
          </div>
          <div className="agent-rule-card">
            <div className="agent-rule-icon">📁</div>
            <div className="agent-rule-text">
              <strong>영구 보존 = 소스 파일</strong>
              <p>영구적으로 유지할 데이터는 src/data/ 소스 파일을 직접 수정하세요. seed 함수가 앱 시작 시 자동 반영합니다.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 빠른 시작 (사람용) ────────────── */}
      <Section icon="🚀" title="빠른 시작 (사람용)" id="quickstart">
        <div className="agent-quickstart">
          <div className="agent-qs-step">
            <div className="agent-qs-num">1</div>
            <div className="agent-qs-text">
              <strong>이 URL을 AI에게 전달</strong>
              <p>AI 에이전트에게 <code>/agent-guide</code> 페이지 URL을 알려주세요.</p>
            </div>
          </div>
          <div className="agent-qs-step">
            <div className="agent-qs-num">2</div>
            <div className="agent-qs-text">
              <strong>주제를 말하세요</strong>
              <p>"적벽대전으로 시놉시스 만들어줘" — 이렇게만 말하면 됩니다.</p>
            </div>
          </div>
          <div className="agent-qs-step">
            <div className="agent-qs-num">3</div>
            <div className="agent-qs-text">
              <strong>AI가 API로 데이터 주입</strong>
              <p>에이전트가 <code>window.__makemov</code> API를 통해 데이터를 생성합니다.</p>
            </div>
          </div>
          <div className="agent-qs-step">
            <div className="agent-qs-num">4</div>
            <div className="agent-qs-text">
              <strong>UI에서 확인 & 수정 요청</strong>
              <p>프로젝트 페이지에서 결과를 확인하고, 수정할 부분을 말하면 즉시 반영됩니다.</p>
            </div>
          </div>
        </div>
      </Section>

      <footer className="agent-footer">
        <p>makemov v0.1.0 — 영상 프리프로덕션 파이프라인 by Aeon & Sion</p>
      </footer>
    </div>
  );
}
