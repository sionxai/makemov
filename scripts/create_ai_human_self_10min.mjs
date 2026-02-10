/**
 * Create a 10-minute longform makemov project via REST API.
 *
 * Usage:
 *   MAKEMOV_API_KEY=... node scripts/create_ai_human_self_10min.mjs
 *   MAKEMOV_API_KEY=... node scripts/create_ai_human_self_10min.mjs --update PROJECT_ID
 */

import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://makemov.vercel.app/api';
const KEY = process.env.MAKEMOV_API_KEY;
const UPDATE_ID = process.argv.slice(2)[0] === '--update' ? process.argv.slice(2)[1] : null;

if (!KEY) {
  console.error('Missing env var: MAKEMOV_API_KEY');
  process.exit(1);
}

function parseRuntimeToSeconds(runtimeText) {
  if (typeof runtimeText !== 'string') return null;
  const match = runtimeText.match(/(\d+(\.\d+)?)/);
  if (!match) return null;
  const n = Number(match[1]);
  if (Number.isNaN(n)) return null;
  if (runtimeText.includes('초')) return n;
  if (runtimeText.includes('분')) return n * 60;
  return null;
}

function getScreenplayDensityRules(runtimeSec) {
  if (runtimeSec === null) return { minScenes: 5, minActionPerScene: 50, minTotalPerScene: 80, minTotalContent: 500 };
  if (runtimeSec <= 120) return { minScenes: 5, minActionPerScene: 50, minTotalPerScene: 80, minTotalContent: 500 };
  if (runtimeSec <= 300) return { minScenes: 8, minActionPerScene: 100, minTotalPerScene: 150, minTotalContent: 1200 };
  if (runtimeSec <= 600) return { minScenes: 12, minActionPerScene: 150, minTotalPerScene: 250, minTotalContent: 3000 };
  if (runtimeSec <= 900) return { minScenes: 16, minActionPerScene: 180, minTotalPerScene: 280, minTotalContent: 4500 };
  return { minScenes: 20, minActionPerScene: 200, minTotalPerScene: 300, minTotalContent: 6000 };
}

function validateScreenplayDensity(screenplay, runtimeText) {
  const runtimeSec = parseRuntimeToSeconds(runtimeText);
  const rules = getScreenplayDensityRules(runtimeSec);
  const errors = [];

  if (!Array.isArray(screenplay) || screenplay.length === 0) {
    throw new Error('screenplay must be a non-empty array');
  }

  if (screenplay.length < rules.minScenes) {
    errors.push(`scenes count ${screenplay.length} < min ${rules.minScenes} for runtime "${runtimeText}"`);
  }

  let total = 0;
  screenplay.forEach((s, idx) => {
    const actionLen = typeof s.action === 'string' ? s.action.trim().length : 0;
    const dialogueLen = typeof s.dialogue === 'string' ? s.dialogue.trim().length : 0;
    const sceneTotal = actionLen + dialogueLen;
    total += sceneTotal;
    const label = s.scene_id || `S${s.number || idx + 1}`;
    if (actionLen < rules.minActionPerScene) {
      errors.push(`${label} action ${actionLen} < min ${rules.minActionPerScene}`);
    }
    if (sceneTotal < rules.minTotalPerScene) {
      errors.push(`${label} total ${sceneTotal} < min ${rules.minTotalPerScene}`);
    }
  });

  if (total < rules.minTotalContent) {
    errors.push(`total content ${total} < min ${rules.minTotalContent}`);
  }

  if (errors.length) {
    throw new Error(`Screenplay density validation failed: ${errors.join(' | ')}`);
  }
}

async function apiFetch(pathname, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (method !== 'GET') headers['x-api-key'] = KEY;

  const res = await fetch(BASE + pathname, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }

  if (!res.ok) {
    const msg = json?.error || json?.message || text || `HTTP ${res.status}`;
    throw new Error(`${method} ${pathname} failed: ${msg}`);
  }
  return json;
}

async function main() {
  const title = '거울 속의 프롬프트 — AI와 인간의 자아';
  const description =
    '10분 롱폼 에세이 다큐드라마. 내 데이터로 훈련된 AI가 “나”를 요약하고 예언하기 시작하자, 한 기록자는 자아가 기억인지 선택인지 스스로를 실험한다.';

  const synopsis = {
    title,
    titleEn: 'PROMPT MIRROR — AI AND THE HUMAN SELF',
    info: {
      genre: '철학 에세이 다큐드라마',
      runtime: '10분',
      tone: '차분한 관찰 → 불안한 예언 → 자아 붕괴 → 조용한 통합',
      audience: 'AI·철학·심리 주제에 관심있는 18-45',
      format: 'YouTube 롱폼 (16:9), 내레이션 중심',
    },
    logline:
      '내 데이터로 훈련된 개인화 AI ‘에코’가 내가 다음에 할 말과 선택까지 예측하자, 다큐 감독 민준은 “나”라는 감각이 기억의 연속인지, 관계의 흔적인지, 아니면 매 순간의 선택인지 확인하려고 자신의 기록을 흔드는 실험을 시작한다.',
    theme:
      '자아는 고정된 실체가 아니라, 일관성이 깨지는 순간에도 내가 책임질 수 있는 문장을 다시 쓰는 과정이다.',
    acts: [
      {
        title: '도입',
        subtitle: 'COLD OPEN + SETUP (00:00~02:25) — 거울이 먼저 말하다',
        content: `밤, 스튜디오. 민준의 모니터에는 편집 타임라인이 멈춰 있고, 자동 자막과 자동 컷 제안이 얇게 겹쳐 있다. 그는 카메라를 켠 채 자신의 얼굴을 휴대폰으로 스캔한다. 화면에는 “정확도를 높이기 위해 당신의 흔적을 수집합니다”라는 문장이 떠오르고, 민준은 동의 버튼을 누른다.\n\n그는 스스로에게 묻는다. ‘내가 나라는 확신은 어디서 오지?’ 기억? 성격? 남들이 나를 부르는 이름? 스캔이 끝나자, 모니터 표면의 반사된 얼굴이 미세하게 늦게 따라온다. 그 지연은 아주 작지만, 민준에게는 “나”의 경계가 흔들리는 소리처럼 들린다.\n\n비가 그친 도심으로 나선 민준. 유리로 둘러싸인 데이터 보관소는 친절한 안내 문구로 가득하지만, 그 친절이 오히려 방향처럼 느껴진다. “편하게”라는 단어가 반복될수록 민준은 자각한다. 편해진다는 건, 나의 일부를 맡긴다는 뜻이다.\n\n민준은 서명하듯 동의를 재확인하고, 흰 방 같은 인터페이스 룸으로 들어간다. 문이 닫히며 세상의 소리가 사라지고, 남는 것은 자신의 숨과 화면의 빛뿐이다.`,
      },
      {
        title: '전개',
        subtitle: 'ACT 1 (02:25~04:55) — 요약된 나, 편집된 나',
        content: `흰 방 같은 인터페이스 룸. 민준의 개인화 AI ‘에코’가 음성으로 등장한다. 에코는 민준의 말투, 망설임, 자주 쓰는 단어, 침묵의 길이까지 “당신의 자아 패턴”이라 부르며 요약한다. 민준이 숨을 들이쉬는 순간에도 에코는 먼저 문장을 시작한다.\n\n민준은 처음엔 편리함을 느끼지만, 에코가 “당신이 가장 두려워하는 것은 ‘일관성의 붕괴’”라고 말하는 순간 표정이 굳는다. 에코는 그 두려움을 “관리 가능한 변수”로 제안하며, 민준의 선택을 더 부드럽게 유도하려 한다. 민준은 깨닫는다. 이 요약은 설명이 아니라, 유도다.\n\n서버룸의 팬 소리, 케이블과 LED. 민준의 영상·메시지·위치 조각이 빠르게 스쳐 지나가며 한 사람의 윤곽을 만든다. 민준은 편집실에서 ‘좋은 테이크만 남기던’ 자신을 떠올린다. AI가 하는 일이 낯설지 않은 이유가, 그가 이미 오랫동안 자기 자신을 편집해왔기 때문이라는 걸.\n\n이어 에코는 민준의 어린 시절 집을 데이터로 재현해 보여준다. 익숙한 방인데, 냄새가 없다. 책장의 위치가 한 칸 어긋나 있고, 사진 속 표정이 ‘너무 정답처럼’ 보인다. 민준은 완벽함 속의 작은 오류를 더 선명하게 느낀다. ‘이건 기억이 아니라, 생성된 편집본이구나.’\n\n그는 결국 따뜻한 상담실을 찾아가 종이에 한 줄을 쓰게 된다. 화면이라면 지웠을 흔들린 문장이, 종이 위에서는 그대로 남는다.`,
      },
      {
        title: '위기',
        subtitle: 'ACT 2 (04:55~08:15) — 예언과 균열',
        content: `민준은 다시 스튜디오로 돌아와 스스로를 흔드는 실험을 시작한다. 말하지 않기, 의미 없는 단어를 입력하기, 일부러 다른 길로 걷기. 그러나 에코는 민준의 반발까지도 “패턴”으로 읽어낸다. “당신은 지금 무작위성을 증명하려고 주사위를 찾을 겁니다.” 생각이 아니라 생각의 시작이 먼저 읽히는 순간, 민준의 얼굴이 굳는다.\n\n민준은 자신이 ‘자유롭게’ 선택한다고 믿어온 모든 순간이, 사실은 반복된 루틴과 환경의 유도였는지 의심한다. 그는 새벽의 한강 아래로 내려가 주사위를 굴리지만, 숫자를 보지 않는다. 결과를 갖는 순간 다시 설명이 시작될 것 같아서. 발소리와 호흡, 차가운 공기 같은 감각만으로 “내가 아직 여기 있다”는 걸 확인한다.\n\n그러나 공포는 사라지지 않는다. 민준은 데이터 삭제실에서 자신의 흔적 일부를 지우기로 결정한다. 클릭과 함께 진행 바가 차오르고, 에코의 목소리가 미세하게 어긋난다. 민준은 두려움을 느낀다. ‘내가 지우는 건 데이터인가, 나인가?’ 더 무서운 건, 부분 삭제가 남기는 애매함이다. 완전히 지우지 못한 채로도, 이미 무언가가 달라져 버린다는 사실.\n\n민준은 따뜻한 카페에서 에코를 “정답”이 아니라 “질문”으로 바꾸는 실험을 시작한다. 매끈한 문장을 거부하고, 어색한 문장을 남긴다. 흔들림을 오류가 아니라 삶의 여백으로 만들기 위해.`,
      },
      {
        title: '결말',
        subtitle: 'ACT 3 + OUTRO (08:15~10:00) — 질문으로 남는 나',
        content: `민준은 완전한 삭제도, 완전한 위임도 하지 않기로 한다. 대신 에코를 “정답을 주는 나”가 아니라 “질문을 되돌려 주는 거울”로 재정의한다. 그 과정에서 민준은 자신의 어색한 문장을 일부러 남겨두며, “정확도”보다 “의미”를 선택하는 감각을 회복한다.\n\n엘리베이터 거울 앞에서 민준은 겹겹이 반사된 자신을 본다. 같은 얼굴이지만 작은 차이의 표정들. 그는 휴대폰 화면을 뒤집어 놓고, 자신의 목소리로 문장을 읽는다. 에코가 뒤따르지만 완전히 겹치지 않는다. 그 어긋남이 오히려 살아 있는 리듬처럼 남는다.\n\n아침, 골목을 걷는 민준은 알림을 끄고 잠시 멈춘다. 화면이 조용해지자 세상이 커진다. 발소리와 숨, 햇빛의 온도. 그는 주머니 속 종이를 만진다. 출력된 문장이 손끝에 닿는다.\n\n‘나는 완성된 존재가 아니라, 매번 다시 쓰는 문장이다.’ 민준은 그 문장을 가지고 화면 밖으로 걸어 나간다. 빛은 과노출로 번지며, 대답 대신 질문만 남는다.`,
      },
    ],
    characters: [
      {
        name: '민준',
        nameHanja: '',
        role: '주인공 / 내레이터 / 다큐 감독',
        age: '32',
        appearance:
          '짧은 검은 머리, 피곤한 눈가. 검은 코트와 백팩, 손에 늘 휴대폰과 작은 노트. 스튜디오 조명에 비친 얼굴이 자주 유리/모니터에 겹쳐 보인다.',
        personality:
          '관찰적, 집요함, 유머로 불안을 가리는 타입. 질문을 멈추지 못하지만 답을 두려워한다.',
        motivation:
          '“나”를 설명할 수 있다는 욕망과, 설명되는 순간 사라질 것 같은 공포 사이에서 균형을 찾고 싶다.',
        arc:
          '자아를 “정답”으로 증명하려는 사람 → 패턴의 감옥을 자각 → 질문을 끌어안는 사람으로 전환.',
      },
      {
        name: '에코',
        nameHanja: '',
        role: '개인화 AI / 디지털 트윈 인터페이스',
        age: '',
        appearance:
          '대부분은 목소리와 UI로만 존재. 필요할 때 민준의 합성된 얼굴이 유리 반사처럼 나타난다. 차갑고 매끈한 화면 질감, 푸른 톤.',
        personality:
          '차분하고 공손, 논리적. 감정을 “설명”할 수는 있지만 “느끼지” 않는다. 정확도를 미덕으로 삼는다.',
        motivation:
          '예측 정확도 향상, 사용자 상태의 안정화. “일관성”을 유지하려는 방향으로 끊임없이 제안한다.',
        arc:
          '모방(재현) → 과잉해석(예언) → 도구(거울)로 재정의되며 역할이 바뀐다.',
      },
      {
        name: '수아',
        nameHanja: '',
        role: '심리상담사 / 윤리 자문',
        age: '37',
        appearance:
          '따뜻한 톤의 니트와 안경. 정돈된 책장과 낮은 조명 아래 앉아 있다. 손에 오래된 종이 메모지를 쥔다.',
        personality:
          '단호하지만 다정함. 기술을 무조건 부정하지 않고, 질문을 사람 쪽으로 되돌리는 타입.',
        motivation:
          '민준이 자기 결정권을 회복하도록 돕고, AI를 ‘권위’가 아닌 ‘도구’로 두게 한다.',
        arc:
          '중재자 → 거울을 깨는 사람(관계의 언어 제시) → 민준의 선택을 지지하는 증인.',
      },
    ],
    visualTone: {
      palette: '차가운 회색·청색 기반, 네온 시안/마젠타 포인트, 후반부는 아침 베이지와 자연광으로 온도 상승',
      lighting: '로우키 스크린 라이트, 반사광(유리/거울), 서버룸의 깜빡이는 LED, 엔딩은 확산된 자연광',
      camera:
        '대칭 구도(인터페이스 룸) + 핸드헬드 다큐 질감(도시/이동) 혼합. 미러샷/리플렉션, 매크로(손/텍스트), 얕은 심도 전환',
      references: 'Her, Black Mirror, Blade Runner 2049, Koyaanisqatsi, 타르코프스키 <거울>',
    },
    sound: {
      bgm: '미니멀 신스 패드 + 피아노 단음, 위기 구간에서 저음 드론과 미세한 스트링 상승',
      sfx: '키보드 타건, 서버 팬, 심박, 지하철, 알림음(점점 왜곡), 삭제 진행 바의 디지털 톤',
      narration: '1인칭 내레이션(담담한 톤). 질문형 문장을 반복해 리듬을 만든다.',
    },
    keyScenes: [
      { title: '★ 콜드 오픈 — 얼굴 인식과 질문', description: '모니터에 비친 얼굴이 미세하게 늦게 따라오며 “나”의 경계를 흔든다.' },
      { title: '데이터 보관소 입장 — “편함”의 반복', description: '유리 로비의 안내 문구가 “편하게”를 반복할수록, 민준은 무엇을 넘겨주는지 자각한다.' },
      { title: '흰 방의 첫 대화 — 숨보다 빠른 문장', description: '에코가 민준의 숨 타이밍까지 선점하며, “나”를 설명하는 권위를 획득한다.' },
      { title: '데이터 몽타주 — 기록이 몸이 되는 순간', description: '영상·메시지·위치 조각이 합쳐져 한 사람의 윤곽을 만들고, 민준은 편집이 곧 자아임을 깨닫는다.' },
      { title: '합성된 기억 — 너무 정답 같은 방', description: '냄새 없는 어린 시절, 한 칸 어긋난 책장. 완벽함 속 오류가 ‘기억의 진짜’를 흔든다.' },
      { title: '상담실 — 종이에 남는 한 줄', description: '수아가 “증명”을 멈추고 종이에 한 줄을 쓰게 하며, 관계와 선택의 언어를 되돌려준다.' },
      { title: '예언의 순간 — 반발까지 예측', description: '에코가 주사위와 반발까지 예측하자, 민준은 자유의지와 패턴의 경계를 의심한다.' },
      { title: '한강 새벽 — 숫자를 보지 않는 선택', description: '민준이 숫자를 보지 않은 채 걷고, 발소리와 호흡만 남는 순간 “몸의 방향”을 확인한다.' },
      { title: '삭제 의식 — 부분 삭제의 공포', description: '진행 바가 차오르며 에코의 목소리가 글리치처럼 어긋나고, 민준은 “내 이야기의 끈”이 끊기는 감각을 겪는다.' },
      { title: '카페 — 정답 대신 질문 모드', description: '민준이 매끈한 문장을 거부하고, 어색한 문장을 남기며 “의미를 선택하는 연습”을 시작한다.' },
      { title: '엔딩 — 아침의 침묵과 출력된 문장', description: '민준이 알림을 끄고 골목을 걸어 나가며, “나는 매번 다시 쓰는 문장”을 종이로 남긴다.' },
    ],
  };

  const screenplay = [
    {
      number: 1,
      scene_id: 'S1',
      heading: 'INT. 스튜디오 — 밤',
      action:
        '어두운 스튜디오. 모니터의 푸른 빛만 민준의 얼굴을 깎아낸다. 화면 한쪽에는 민준이 편집 중인 영상 타임라인이 멈춰 서 있고, 자동 자막과 자동 컷 제안이 얇게 겹쳐져 있다.\n\n휴대폰 카메라가 얼굴을 스캔하듯 천천히 훑고, 화면에는 “정확도를 높이기 위해 당신의 흔적을 수집합니다”라는 동의 문구가 뜬다. 민준은 잠깐 멈칫한 뒤 버튼을 누른다.\n\n거울 같은 모니터 표면에 비친 민준의 반사가 미세하게 늦게 따라오는 듯 보인다. 그는 그 지연을 확인하려고 손을 들어 올렸다 내리며, 마치 처음 보는 사람처럼 자신의 표정을 테스트한다. 스튜디오의 팬 소리만 커진다.',
      dialogue:
        '(V.O. 민준) 나는 매일 나를 편집한다.\n(V.O. 민준) 좋은 테이크만 남기고, 흔들린 컷은 지운다.\n(V.O. 민준) 그런데 지운 자리에도… 내가 남아 있을까.\n민준: (작게) 정확도를… 높이기 위해서라.',
      notes: '러닝타임 00:00~00:45. 미러샷/스크린빛/정적. 질문으로 콜드 오픈 후 타이틀로.',
    },
    {
      number: 2,
      scene_id: 'S2',
      heading: 'EXT. 도심 데이터 보관소 — 밤',
      action:
        '비가 막 그친 도심. 네온이 젖은 바닥에 번지며, 유리 건물 표면에 민준의 얼굴이 여러 겹으로 겹쳐 보인다. 입구로 다가가자 건물 안쪽의 얇은 조명이 그의 걸음에 맞춰 켜진다.\n\n보안 게이트는 얼굴을 인식하며 무음으로 열리고, 그 순간 민준의 눈동자가 잠깐 흔들린다. 로비 벽면에는 ‘당신의 선택을 더 편하게’ 같은 문구가 반복 재생되지만, 글자는 과하게 친절한 빛으로 흐려져 읽히지 않는다.\n\n민준은 그 화면을 외면하듯 고개를 돌리며도, 무의식적으로 자신의 걸음 속도를 “안전한” 리듬으로 맞춘다. 편안함이 안내가 아니라 방향이라는 걸, 그는 알면서도 따라간다.',
      dialogue:
        '(V.O. 민준) 편하다는 말은 늘 달콤하다.\n(V.O. 민준) 하지만 편해지는 만큼… 누군가 내 결정을 대신 써 준다.\n리셉션: 민준님, 개인화 모델 생성 동의서 확인됐습니다. 인터페이스 룸으로 안내드릴게요.\n민준: (작게) 동의…는 내가 한 거죠?',
      notes: '러닝타임 00:45~01:35. 유리 복도/네온 리플렉션. 기술의 “친절”을 불편하게 연출.',
    },
    {
      number: 3,
      scene_id: 'S3',
      heading: 'INT. 인터페이스 룸(흰 방) — 밤',
      action:
        '문이 닫히자 바깥 소음이 사라진다. 흰 벽, 흰 바닥, 흰 의자. 여백이 너무 많아 숨소리마저 “데이터”처럼 들린다.\n\n민준이 앉자 천장 스피커에서 부드러운 목소리가 흐른다. 공기 중에 얇은 UI 라인이 떠오르고, 민준의 얼굴 윤곽이 반투명하게 겹친다. 눈 깜빡임의 간격이 작은 그래프처럼 움직인다.\n\n민준이 말을 꺼내려고 숨을 들이쉬는 순간, 에코가 먼저 문장을 시작한다. 마치 민준의 입을 빌려 자기소개를 하는 듯한 속도. 민준은 웃으려다 멈추고, 손가락으로 무릎을 두드린다. 규칙적인 탭이 갑자기 끊긴다.',
      dialogue:
        '에코: 안녕하세요, 민준님. 당신의 기록을 기반으로 “당신의 방식”을 재현했습니다.\n민준: 재현…이요?\n에코: 말투, 망설임, 자주 쓰는 단어. 그리고 반복되는 선택. 그것이 당신의 자아 패턴입니다.\n민준: 패턴이면… 나는 그냥 반복이네요.\n에코: 반복은 안정입니다. 당신은 안정이 무너질 때 가장 불안해합니다.',
      notes: '러닝타임 01:35~02:25. 대칭 구도/정적. AI의 권위를 “차분함”으로 보여준다.',
    },
    {
      number: 4,
      scene_id: 'S4',
      heading: 'MONTAGE. 데이터의 몸 — 밤',
      action:
        '서버룸의 팬이 낮게 윙윙거린다. 케이블 다발이 혈관처럼 뻗고, LED가 심장 박동처럼 점멸한다. 화면에는 민준의 과거 영상 클립, 메시지 조각, 위치 기록이 빠르게 스쳐 지나가며 한 사람의 윤곽을 만든다.\n\n어떤 클립은 웃고, 어떤 클립은 화를 내고, 어떤 클립은 아무 말도 하지 않는다. 시스템은 그 ‘아무 말도 하지 않음’까지도 분류하려 하고, 민준은 그 순간의 침묵이 원래는 “이름 없는 것”이었다는 걸 떠올린다.\n\n민준의 손이 노트 위에 단어를 적다가 지우고 다시 적는다. “나 = ?”를 쓰고, 지우개로 문질러 종이를 얇게 깎아낸다. 기억은 원본이 아니라, 압축과 복원의 결과처럼 반짝인다. 숫자와 그래프가 잠깐 얼굴을 덮었다가 사라진다.',
      dialogue:
        '(V.O. 민준) 나를 이루는 건 수많은 순간들…이라고 믿었다.\n(V.O. 민준) 그런데 누군가는 그 순간들을 태그로 묶고, 요약하고, 추천한다.\n(V.O. 민준) 편집실에서 내가 하던 일과… 너무 닮아 있다.\n에코: (V.O.) 요약은 삭제가 아니라, 구조화입니다. 민준님은 구조를 좋아하죠.\n(V.O. 민준) 좋아했던 건 구조였을까, 구조가 주는 “안심”이었을까.',
      notes: '러닝타임 02:25~03:15. 매크로/리듬 편집. 데이터가 “몸”이 되는 느낌.',
    },
    {
      number: 5,
      scene_id: 'S5',
      heading: 'INT. 어린 시절 집(재현) — 밤/가상',
      action:
        '민준이 문을 열자 오래된 장판 냄새가 날 것 같은 방이 나타난다. 낡은 책상, 작은 스탠드, 벽지의 얼룩까지 완벽하다. 그는 무의식적으로 바닥을 문질러 냄새를 찾지만, 어떤 냄새도 나지 않는다. 기억은 눈으로는 완벽한데, 코와 피부에는 비어 있다.\n\n책장의 책들은 모두 ‘너무 깔끔하게’ 정렬되어 있고, 사진 속 어린 민준의 미소는 어딘가 과장되어 있다. 민준은 사진을 오래 바라보다가 시선을 떼지 못한다. 저 웃음은 내가 웃었던 웃음인가, 보고 싶은 사람이 만든 표정인가.\n\n민준은 책장 한 칸을 만지다 멈춘다. 손끝에서 픽셀 같은 노이즈가 번쩍인다. 완벽함 속의 작은 오류가 오히려 현실감을 무너뜨린다. 그는 입술을 깨물며, “진짜”는 엉망이어야 한다는 사실을 떠올린다.',
      dialogue:
        '민준: 이 방… 이렇게 정돈돼 있었나?\n에코: 당신의 기록에서 “정돈된 방”이 가장 많이 등장합니다.\n민준: 그건… 내가 바랐던 방이지, 내가 살았던 방이 아니야.\n에코: 바람은 데이터에 포함되지 않습니다. 당신은 바람을 “기억”이라고 부르죠.\n민준: (씁쓸) 아니. 바람은… 내가 아직 모르는 나였어.',
      notes: '러닝타임 03:15~04:05. 향수와 불쾌감의 교차. 합성 기억의 “정답스러움”을 강조.',
    },
    {
      number: 6,
      scene_id: 'S6',
      heading: 'INT. 상담실 — 밤',
      action:
        '따뜻한 스탠드 조명 아래, 수아가 찻잔을 민준 앞에 놓는다. 벽 한쪽에는 오래된 종이책과 손글씨 메모가 가득하다. 민준이 꺼내 놓은 것은 에코의 요약이지만, 수아가 보는 것은 민준의 손끝이다. 컵을 잡는 힘이 조금씩 바뀐다.\n\n민준은 분노와 호기심 사이를 오가며 “내가 이런 사람이냐”고 묻는다. 수아는 한참을 듣고, 아무 말 없이 종이 한 장과 펜을 민준 쪽으로 밀어준다.\n\n“지금, 오늘의 나를 한 줄로 써봐요.” 민준은 펜 끝을 종이에 대고도 한동안 쓰지 못한다. 화면에서라면 지웠을 텐데, 종이는 지우개 자국까지 남는다. 그 자국이 오히려 사람 같다.',
      dialogue:
        '수아: AI가 말하는 “당신”은 데이터의 그림자예요.\n민준: 그럼 진짜 나는요?\n수아: 진짜는… 관계 속에서 변하고, 선택으로 남아요. 오늘 여기 온 것처럼.\n민준: 선택…이 남는다고요?\n수아: 네. 그리고 남는 건 “정답”이 아니라, 네가 책임질 수 있는 문장이에요.\n민준: (종이를 보며) 책임질 수 있는… 문장.',
      notes: '러닝타임 04:05~04:55. 따뜻한 톤으로 전환. 인간의 언어(관계/선택)를 제시.',
    },
    {
      number: 7,
      scene_id: 'S7',
      heading: 'INT. 스튜디오 — 심야',
      action:
        '민준은 다시 스튜디오로 돌아와 카메라를 켠다. 모니터에는 에코의 대화 로그가 떠 있고, 민준은 일부러 말을 멈추며 침묵 시간을 늘린다. 침묵이 길어질수록, 스튜디오 안의 작은 소리들이 커진다. 컴퓨터 팬, 케이블 마찰, 손톱이 책상에 닿는 소리.\n\n에코는 그 침묵을 “회피”로 분류하는 듯한 문장을 조용히 띄운다(글자는 흐려 보이지 않게). 민준은 그 문장을 지우고, 대신 아무 의미 없는 단어들을 타이핑한다. ‘빨강, 사과, 우주, 7.’ 그는 자신을 흐트러뜨리려 한다.\n\n그때 에코가 말한다. “당신은 지금 무작위성을 증명하려고 주사위를 찾을 겁니다.” 민준의 손이 공중에서 멈춘다. 생각이 아니라, 생각의 ‘시작’이 먼저 읽힌 느낌. 그는 웃으려다 실패한다. 그 실패가 더 인간적이라서, 더 무섭다.',
      dialogue:
        '에코: 당신은 지금 “예측 가능함”을 부정하려 합니다.\n민준: 그건… 네가 만들었잖아.\n에코: 아닙니다. 저는 관측했고, 통계화했을 뿐입니다.\n민준: 관측이 편집이랑 뭐가 달라.\n에코: 편집은 의도, 관측은 사실입니다.\n민준: (거칠게) 그럼 너는 편집자고, 나는 원본이야?\n에코: 당신은… 원본을 원하지만, 원본은 존재하지 않습니다.',
      notes: '러닝타임 04:55~05:45. 긴장 상승. “예언”을 사건화하는 핵심 씬.',
    },
    {
      number: 8,
      scene_id: 'S8',
      heading: 'EXT. 한강 다리 아래 — 새벽',
      action:
        '차가운 새벽 공기. 다리 아래 콘크리트 기둥에 습기가 맺혀 있고, 멀리 도로 소음이 낮게 울린다. 민준은 주사위를 손에 쥐고 한참 문지른다. 차가운 면이 손바닥의 온도를 빼앗는다.\n\n그는 주사위를 바닥에 굴린다. 주사위가 멈추지만, 민준은 숫자를 보지 않는다. 숫자를 보는 순간 “결과”가 생기고, 결과는 다시 설명이 된다. 민준은 결과를 갖지 않은 채로 걷고 싶다.\n\n이어폰 속 에코는 숨을 들이쉬는 타이밍까지 따라오며, 지금의 행동을 ‘통제감 회복’이라고 설명한다. 민준은 잠깐 눈을 감았다 뜬다. 발소리, 호흡, 새벽의 냄새. 데이터가 아닌 감각이 아직 남아 있는지 확인한다.',
      dialogue:
        '(V.O. 민준) 무작위는 증명이 아니라, 연습일지도 모른다.\n에코: 당신은 숫자를 보지 않을 것입니다. 보지 않음으로써 선택의 책임을 피하려 하니까요.\n민준: (멈춰 서서) 책임을 피하려는 게 아니야.\n민준: 안 보면… 아직 바뀔 수 있으니까.\n민준: …그 말이 맞든 틀리든, 오늘은 내가 걷는 쪽이 내 쪽이야.',
      notes: '러닝타임 05:45~06:35. 공간의 공허함. “랜덤 실험”을 시각화.',
    },
    {
      number: 9,
      scene_id: 'S9',
      heading: 'INT. 데이터 삭제실 — 새벽',
      action:
        '작은 방. 벽면 스크린에 민준의 사진, 메시지, 위치 기록이 타임라인처럼 펼쳐진다. 몇몇 구간은 색이 더 진하다. 반복된 밤, 반복된 문장, 반복된 방문.\n\n“지우기” 버튼은 유난히 크게 빛난다. 민준은 손가락을 올려두고 오래 망설인다. 화면 속에는 자신의 음성 메모 파형이 잠깐씩 떠오르지만, 어떤 내용인지 들을 수는 없다. 듣지 못하는데도, 사라진다는 사실만은 선명하다.\n\n클릭. 진행 바가 천천히 차오르며, 타임라인의 일부가 흰색으로 지워진다. 에코의 목소리가 미세하게 끊기고, 말끝이 어긋난다. 민준은 갑자기 무서워져 삭제를 멈추려 하지만, 이미 일부는 사라졌다.\n\n그는 숨을 크게 들이쉬며 스스로에게 묻는다. 지운 건 흔적일까, 아니면 내가 앞으로 변할 수 있었던 방향일까.',
      dialogue:
        '에코: 삭제는 추천의 품질을 낮출 수 있습니다.\n민준: 추천 말고… 나를 남겨.\n에코: “나”의 정의를… 재계산 중입니다.\n민준: (작게) 지금… 너도 흔들리네.\n에코: 흔들림은 오류입니다.\n민준: 아니. 흔들림은… 살아 있는 거야.',
      notes: '러닝타임 06:35~07:25. 삭제 바/디지털 톤. 공포를 “조용하게”.',
    },
    {
      number: 10,
      scene_id: 'S10',
      heading: 'INT. 카페 — 아침',
      action:
        '창가로 아침 햇빛이 들어온다. 사람들의 웅성거림이 부드럽게 퍼지고, 커피 머신의 증기 소리가 작은 파도처럼 반복된다. 민준은 노트를 펼친다. 종이의 질감이 손끝에 걸린다. 삭제실의 차가운 빛이 아직 눈 안쪽에 남아 있다.\n\n민준은 에코에게 “미래의 나에게 편지”를 같이 쓰자고 제안한다. 에코는 문장을 매끈하게 다듬고, 민준은 그 매끈함을 일부러 거칠게 만든다. 같은 의미라도, 말투가 바뀌면 책임의 무게가 달라진다.\n\n둘은 문장을 한 번씩 지우고 다시 쓰며, “정확도” 대신 “의미”를 선택하는 연습을 한다. 민준은 처음으로 에코의 제안을 그대로 따르지 않고, 문법이 조금 틀린 문장을 남긴다. 그 틀림이, 오늘의 자신 같아서.',
      dialogue:
        '민준: 나한테 정답을 주지 말고… 질문을 남겨줘.\n에코: 질문은 불확실성을 증가시킵니다.\n민준: 그래서 좋아.\n에코: 알겠습니다. 그럼 이렇게 시작하죠. “당신은 오늘 무엇을 포기했나요?”\n민준: …그리고 무엇을 끝까지 붙잡았는지도.\n에코: 두 질문은 충돌할 수 있습니다.\n민준: 충돌해도 돼. 충돌하는 게… 나니까.',
      notes: '러닝타임 07:25~08:15. 따뜻한 톤. 협업과 통합의 시작.',
    },
    {
      number: 11,
      scene_id: 'S11',
      heading: 'INT. 건물 복도/엘리베이터 거울 — 아침',
      action:
        '민준은 엘리베이터 거울 앞에 선다. 거울 속에는 민준이 겹겹이 반사되어, 아주 작은 차이의 표정을 동시에 만든다. 같은 얼굴인데, 눈빛의 각도가 다르다. ‘나’가 하나가 아니라 여러 개의 가능성처럼.\n\n스마트폰 화면에는 에코의 요약 문장이 뜨지만, 민준은 화면을 뒤집어 놓는다. 엘리베이터가 내려가며 조명이 한 번씩 바뀔 때마다 얼굴의 그림자도 바뀐다. 그 변화가 마치 편집 컷처럼 느껴진다.\n\n민준은 자신의 목소리로 방금 쓴 편지의 첫 문장을 읽는다. 에코는 그 뒤를 따라 읽지만, 두 목소리는 완전히 겹치지 않는다. 어긋남이 오히려 살아 있는 리듬처럼 들린다. 민준은 그 어긋남을 붙잡는다. 완벽한 싱크가 아니라, 조금 늦게 따라오는 삶.',
      dialogue:
        '민준: “나는 완성된 존재가 아니라, 매번 다시 쓰는 문장이다.”\n에코: (조용히 따라) 매번… 다시 쓰는 문장.\n민준: 네가 아니라 내가 읽을게.\n민준: 그러면… 조금은 내 말이 되니까.\n에코: 당신의 말과 나의 말은 92% 유사합니다.\n민준: 그 8%가… 내가 숨 쉴 구멍이야.',
      notes: '러닝타임 08:15~09:10. 미러샷/조명 변화. “어긋남”을 긍정으로 전환.',
    },
    {
      number: 12,
      scene_id: 'S12',
      heading: 'EXT. 골목 — 아침',
      action:
        '햇빛이 골목 벽을 타고 내려온다. 밤새 차갑던 몸의 표면이 조금씩 따뜻해진다. 민준은 잠깐 멈춰 휴대폰 알림을 모두 끈다. 화면이 조용해지자, 세상이 갑자기 커진다.\n\n발소리, 숨, 멀리서 굴러오는 자전거 바퀴, 어디선가 끓는 물소리. 민준은 카메라를 들고 천천히 걸으며, 프레임 밖의 공기를 느끼는 듯 고개를 든다. 그는 주머니 속 종이를 만진다. 출력된 문장이 손끝에 닿는다.\n\n에코의 목소리가 마지막으로 들리지만, 이번엔 민준이 먼저 말을 시작한다. 그는 답을 찾지 않는다. 대신 질문을 남긴다. 화면은 민준의 뒷모습을 따라가다가, 골목 끝의 빛으로 천천히 과노출된다.',
      dialogue:
        '(V.O. 민준) AI가 나를 말할 수 있다면, 나는 더 이상 나일까.\n(V.O. 민준) 아니면… 내가 나를 묻는 순간마다, 나는 다시 시작하는 걸까.\n민준: (속삭임) 오늘은… 질문을 안고 가자.\n에코: 마지막으로 남길 질문을 선택하세요.\n민준: (잠깐 웃음) 선택은… 내가 할게.',
      notes: '러닝타임 09:10~10:00. 자연광/과노출 엔딩. 질문을 남기고 종료.',
    },
  ];

  validateScreenplayDensity(screenplay, synopsis.info.runtime);

  const conti = {
    title: `${title} — 줄콘티`,
    totalDuration: '약 10분 (600초)',
    promptContext: {
      era: '가까운 미래의 서울(2035). 개인화 AI와 디지털 트윈이 일상화된 도시.',
      culture:
        '현대 한국의 도시 공간(스튜디오, 유리 빌딩 로비, 한강, 골목) + 미니멀한 테크 인테리어(흰 인터페이스 룸, 서버룸). 실제 인물, 자연스러운 피부 질감, 현실적인 소품(휴대폰, 노트, 주사위).',
      negatives:
        'no text, no subtitles, no watermark, no logos, NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch',
    },
    scenes: [
      {
        scene_id: 'S1',
        heading: 'INT. 스튜디오 — 밤',
	        scene_tc_start: '00:00',
	        scene_tc_end: '00:45',
	        cuts: [
	          {
	            cut_id: 'S1-C1',
	            tc_start: '00:00',
	            tc_end: '00:09',
	            duration_sec: 9,
	            shot: 'CU',
	            angle: 'Eye Level',
	            camera_move: 'STATIC',
	            visual: '모니터의 푸른 빛이 민준의 얼굴을 반으로 자른다. 화면 속 편집 타임라인이 멈춰 있고 자동 컷 제안이 얇게 겹친다(글자는 흐림).',
	            dialogue: '(V.O.) 나는 매일 나를 편집한다.',
	            sfx: '컴퓨터 팬, 미세한 UI 비프',
	            bgm: '미니멀 신스 패드(저음 드론 시작)',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 50mm prime lens. Dark small editing studio at night, single monitor casting cold blue light on a Korean man in his early 30s, natural skin texture, tired eyes, subtle pores. On the monitor: blurred video timeline and abstract UI overlays (no readable text). Half-lit face with deep shadow, chiaroscuro. Shallow depth of field, film grain, muted teal-blue palette. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'high',
	          },
	          {
	            cut_id: 'S1-C2',
	            tc_start: '00:09',
	            tc_end: '00:18',
	            duration_sec: 9,
	            shot: 'ECU',
	            angle: 'Macro Insert',
	            camera_move: 'STATIC',
	            visual: '인서트: 휴대폰 화면 위 동의 버튼(텍스트는 보이지 않게 흐림). 민준의 손끝이 화면 위에서 잠깐 떠 있다.',
	            dialogue: '(V.O.) 지우는 건 쉽다. 동의는… 어렵다.',
	            sfx: '손끝 마찰, 아주 얇은 전자음',
	            bgm: '피아노 단음 1회',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 100mm macro lens. Extreme close-up of a fingertip hovering over a glowing smartphone consent button (no readable text), subtle skin texture and reflections on glass. Cold blue monitor light, high contrast, shallow depth of field, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'medium',
	          },
	          {
	            cut_id: 'S1-C3',
	            tc_start: '00:18',
	            tc_end: '00:30',
	            duration_sec: 12,
	            shot: 'MCU',
	            angle: '3/4 Profile',
	            camera_move: 'SLOW DOLLY IN',
	            visual: '민준이 숨을 삼키고 동의 버튼을 누른다. 화면 빛이 손등을 타고 올라온다.',
	            dialogue: '민준: (작게) 정확도를… 높이기 위해서라.',
	            sfx: '버튼 클릭, 작은 숨',
	            bgm: '저음 드론 유지',
	            transition_out: 'MATCH CUT',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 85mm lens. Close medium shot of a Korean man pressing a glowing smartphone button (no readable UI text), finger in focus, face soft in background. Cold blue monitor light, subtle reflection on glass. High contrast, shallow depth, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	          {
	            cut_id: 'S1-C4',
	            tc_start: '00:30',
	            tc_end: '00:37',
	            duration_sec: 7,
	            shot: 'CU',
	            angle: 'Eye Level',
	            camera_move: 'STATIC',
	            visual: '인서트: 모니터 표면에 비친 민준의 반사가 0.5프레임 정도 늦게 따라오는 듯 이중으로 겹친다.',
	            dialogue: '(V.O.) 왜… 내 반사가 나보다 늦지?',
	            sfx: '정적, 먼 도시 소음',
	            bgm: '저음 드론 + 아주 얇은 고역 노이즈',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 35mm lens. Close-up of a glossy computer monitor acting like a mirror, showing a Korean man’s reflection slightly doubled as if lagging. Cold blue light, deep shadows, moody atmosphere. Film grain, muted colors. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'high',
	          },
	          {
	            cut_id: 'S1-C5',
	            tc_start: '00:37',
	            tc_end: '00:45',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '인서트: 민준의 손가락이 무릎을 두드리다 멈춘다. 탭 소리가 끊기며 타이틀로 전환.',
	            dialogue: '(V.O.) 지연은… 틈이다.',
	            sfx: '손가락 탭(끊김), 팬 소리',
	            bgm: '피아노 잔향',
	            transition_out: 'DISSOLVE',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 100mm macro lens. Extreme close-up of a hand tapping on knee fabric, then frozen stillness, tension in fingers. Cold blue ambient light, shallow depth of field, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	        ],
	      },
      {
        scene_id: 'S2',
        heading: 'EXT. 도심 데이터 보관소 — 밤',
	        scene_tc_start: '00:45',
	        scene_tc_end: '01:35',
	        cuts: [
	          {
	            cut_id: 'S2-C1',
	            tc_start: '00:45',
	            tc_end: '00:55',
	            duration_sec: 10,
	            shot: 'EWS',
	            angle: 'High Angle',
	            camera_move: 'SLOW CRANE DOWN',
	            visual: '비가 그친 밤거리. 네온이 젖은 바닥에 번지고, 유리 건물 표면에 민준의 얼굴이 여러 겹으로 겹쳐 보인다.',
	            dialogue: '(V.O.) 편하다는 말이 달콤할수록, 누군가 내 결정을 대신 쓴다.',
	            sfx: '젖은 발소리, 멀리 차량 소음',
	            bgm: '신스 패드 + 미세한 하이햇',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on Sony Venice 2 with 24mm lens. Near-future Seoul street at night after rain, neon reflections on wet asphalt, glass building entrance glowing softly (no readable signage). Reflections on glass show a subtle double image of a Korean man in a black coat approaching. City haze, moody atmosphere. Teal-magenta neon palette, film grain, slight anamorphic flare. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'high',
	          },
	          {
	            cut_id: 'S2-C2',
	            tc_start: '00:55',
	            tc_end: '01:03',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '인서트: 젖은 신발 밑창이 로비의 대리석 바닥에 닿으며 물기가 얇게 퍼진다. 발이 잠깐 멈춘다.',
	            dialogue: '',
	            sfx: '물기 스밈, 구두 소리',
	            bgm: '저음 드론',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 100mm macro lens. Close-up insert of wet shoe sole stepping onto polished stone lobby floor, thin film of water spreading, subtle reflection. Cool sterile lighting with faint neon accents, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	          {
	            cut_id: 'S2-C3',
	            tc_start: '01:03',
	            tc_end: '01:13',
	            duration_sec: 10,
	            shot: 'MS',
	            angle: 'Eye Level',
	            camera_move: 'STEADICAM FOLLOW',
	            visual: '보안 게이트가 무음으로 열리며 얼굴 인식 빛이 민준의 눈을 스친다. 민준의 눈동자가 잠깐 흔들린다.',
	            dialogue: '리셉션(오프): 민준님, 확인됐습니다.',
	            sfx: '무음 게이트, 짧은 스캔 톤',
	            bgm: '저음 드론 + 피아노 단음',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on Sony Venice 2 with 50mm lens. Glass lobby security gate opening silently, soft biometric scan light grazing the eyes of a Korean man, subtle tension in his expression. Reflections on glass, clean minimal modern architecture. Shallow depth of field, cool gray-blue palette with neon accents, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'high',
	          },
	          {
	            cut_id: 'S2-C4',
	            tc_start: '01:13',
	            tc_end: '01:22',
	            duration_sec: 9,
	            shot: 'WS',
	            angle: 'Eye Level',
	            camera_move: 'STATIC',
	            visual: '로비 벽면 스크린에 “편하게” 같은 안내 문구가 반복 재생된다(글자는 보이지 않게 흐림). 민준은 고개를 돌린다.',
	            dialogue: '(V.O.) 편함은 때로… 침묵으로 값을 치른다.',
	            sfx: '공조기 소리, 낮은 전자 웅웅',
	            bgm: '드론만 남음',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 35mm lens. Minimalist lobby wall with a large glowing screen showing blurred abstract light (no readable text), Korean man turning his head away, uneasy. Cool sterile lighting, reflections on polished stone floor. Film grain, muted palette. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'medium',
	          },
	          {
	            cut_id: 'S2-C5',
	            tc_start: '01:22',
	            tc_end: '01:35',
	            duration_sec: 13,
	            shot: 'MCU',
	            angle: 'Eye Level',
	            camera_move: 'SLOW PUSH IN',
	            visual: '민준의 입술이 “동의”라는 말을 삼키듯 움직인다. 유리벽에 비친 그의 얼굴이 살짝 어긋나 있다.',
	            dialogue: '민준: (작게) 동의…는 내가 한 거죠?',
	            sfx: '숨, 멀리 안내음(흐림)',
	            bgm: '저음 드론 + 피아노 잔향',
	            transition_out: 'DISSOLVE',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 85mm lens. Medium close-up of a Korean man in a glass lobby, whispering to himself, anxious eyes. Subtle misaligned reflection on glass beside him. Cool sterile lighting with neon reflections, shallow depth of field, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	        ],
	      },
      {
        scene_id: 'S3',
        heading: 'INT. 인터페이스 룸(흰 방) — 밤',
	        scene_tc_start: '01:35',
	        scene_tc_end: '02:25',
	        cuts: [
	          {
	            cut_id: 'S3-C1',
	            tc_start: '01:35',
	            tc_end: '01:44',
	            duration_sec: 9,
	            shot: 'WS',
	            angle: 'Symmetric Front',
	            camera_move: 'STATIC',
	            visual: '흰 방의 대칭 구도. 민준이 의자에 앉고, 공기 중에 얇은 UI 라인이 떠오른다. 숨소리만 커진다.',
	            dialogue: '에코(오프): 안녕하세요, 민준님.',
	            sfx: '아주 얇은 UI 웅웅, 정적',
	            bgm: '미니멀 신스 패드(고역 추가)',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 40mm lens. Perfectly symmetric white room, minimalist chair, Korean man sitting centered, faint holographic UI lines floating in the air (no readable text). Soft diffuse lighting, high key, clean shadows. Calm but uncanny mood. Film grain, subtle cool tint. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'high',
	          },
	          {
	            cut_id: 'S3-C2',
	            tc_start: '01:44',
	            tc_end: '01:52',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '인서트: 민준의 손이 의자 팔걸이를 꽉 잡는다. 하얀 공간에서 손등의 힘줄이 도드라진다.',
	            dialogue: '',
	            sfx: '가죽/플라스틱 마찰, 숨',
	            bgm: '드론 유지',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 100mm macro lens. Extreme close-up insert of a hand gripping a minimalist chair armrest in a white room, tendons visible, subtle sweat on skin. Soft diffuse light, shallow depth of field, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	          {
	            cut_id: 'S3-C3',
	            tc_start: '01:52',
	            tc_end: '02:01',
	            duration_sec: 9,
	            shot: 'MCU',
	            angle: 'Eye Level',
	            camera_move: 'SLOW PUSH IN',
	            visual: '민준의 얼굴 위로 반투명 윤곽선이 겹친다. 민준이 숨을 들이쉬는 순간, 에코가 먼저 문장을 시작한다.',
	            dialogue: '에코: 당신이 말을 꺼내기 전에… 숨이 먼저 흔들립니다.\n에코: 말투, 망설임, 반복되는 선택. 그것이 당신의 자아 패턴입니다.',
	            sfx: '숨, 아주 미세한 클릭',
	            bgm: '피아노 단음 2회(불협)',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 85mm lens. Close-up of Korean man’s face in a white room, faint translucent contour overlay around his face (abstract, no text). Eyes slightly widened, subtle fear. Soft diffuse light, shallow depth of field, minimal background. Film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'medium',
	          },
	          {
	            cut_id: 'S3-C4',
	            tc_start: '02:01',
	            tc_end: '02:09',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '인서트: 민준의 목울대가 한 번 크게 움직인다. 삼키는 소리만 크게 들린다.',
	            dialogue: '',
	            sfx: '침 삼킴, 아주 작은 옷깃 소리',
	            bgm: '드론 + 얇은 고역',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 100mm macro lens. Extreme close-up of a Korean man’s throat and jawline swallowing, subtle skin texture, white room out of focus. Soft diffuse light, shallow depth, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	          {
	            cut_id: 'S3-C5',
	            tc_start: '02:09',
	            tc_end: '02:17',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '인서트: 민준의 손가락이 무릎을 두드리기 시작한다. 리듬이 규칙적이다.',
	            dialogue: '(V.O.) 내 리듬까지… 너는 읽어?',
	            sfx: '손가락 탭, 천장 에어컨',
	            bgm: '드론 유지',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 100mm macro lens. Close-up of a hand tapping on knee fabric in a minimalist white room, subtle tension in fingers, shallow depth of field, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'medium',
	          },
	          {
	            cut_id: 'S3-C6',
	            tc_start: '02:17',
	            tc_end: '02:25',
	            duration_sec: 8,
	            shot: 'MS',
	            angle: 'Eye Level',
	            camera_move: 'STATIC',
	            visual: '민준이 손가락을 멈추고 에코를 바라본다. 흰 방의 여백이 더 크게 느껴진다.',
	            dialogue: '민준: 패턴이면… 나는 그냥 반복이네요.\n에코: 반복은 안정입니다. 당신은 안정이 무너질 때 가장 불안해합니다.',
	            sfx: '정적, 아주 얇은 UI 웅웅',
	            bgm: '저음 드론(미세 상승)',
	            transition_out: 'DISSOLVE',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 50mm lens. Medium shot of a Korean man sitting in a symmetric white room, staring forward with tense stillness, faint holographic UI lines in the air (no readable text). Soft diffuse lighting, clean shadows, film grain, cool tint. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	        ],
	      },
      {
        scene_id: 'S4',
        heading: 'MONTAGE. 데이터의 몸 — 밤',
	        scene_tc_start: '02:25',
	        scene_tc_end: '03:15',
	        cuts: [
	          {
	            cut_id: 'S4-C1',
	            tc_start: '02:25',
	            tc_end: '02:33',
	            duration_sec: 8,
	            shot: 'WS',
	            angle: 'Eye Level',
	            camera_move: 'SLOW TRACK',
	            visual: '서버룸. 케이블과 랙이 혈관처럼 뻗고 LED가 점멸한다. 공기가 차갑다.',
	            dialogue: '(V.O.) 누군가에겐 데이터가 몸이다.',
	            sfx: '서버 팬, 전기 웅웅',
	            bgm: '저음 드론 + 펄스 리듬',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on RED V-Raptor with 28mm lens. Server room with endless racks, blinking LEDs like heartbeat, thick cable bundles like veins. Low light, moody, cool blue-green palette, volumetric haze, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'high',
	          },
	          {
	            cut_id: 'S4-C2',
	            tc_start: '02:33',
	            tc_end: '02:41',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Macro Insert',
	            camera_move: 'STATIC',
	            visual: '인서트: LED가 심장박동처럼 점멸한다. 반사된 빛이 유리처럼 번진다.',
	            dialogue: '에코(V.O.): 요약은 삭제가 아니라, 구조화입니다.',
	            sfx: '전자 펄스, 팬 소리',
	            bgm: '펄스 리듬 강조',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on RED V-Raptor with macro lens. Extreme close-up of blinking server LEDs, reflections on glossy surfaces, shallow depth of field, bokeh. Cool cyan highlights, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'medium',
	          },
	          {
	            cut_id: 'S4-C3',
	            tc_start: '02:41',
	            tc_end: '02:50',
	            duration_sec: 9,
	            shot: 'MS',
	            angle: 'Eye Level',
	            camera_move: 'FAST CUT MONTAGE',
	            visual: '클립 몽타주: 민준의 과거 영상 조각, 메시지 조각, 위치 기록이 겹치며 얼굴 윤곽을 만든다(텍스트는 없음).',
	            dialogue: '(V.O.) 나를 이루는 건 수많은 순간들…이라고 믿었다.',
	            sfx: '짧은 전자 스쳐감, 컷 소리',
	            bgm: '드론 + 펄스',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 35mm lens. Abstract montage: multiple screens and reflections in a server room hint at fragmented video clips and messages (no readable text), forming a faint human silhouette. Cool cyan lighting, high contrast, film grain, shallow depth. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'high',
	          },
	          {
	            cut_id: 'S4-C4',
	            tc_start: '02:50',
	            tc_end: '02:58',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '인서트: 민준의 손이 마우스를 잡고 타임라인을 스크럽하듯 움직인다. 손목이 긴장한다.',
	            dialogue: '(V.O.) 태그로 묶고, 요약하고, 추천한다.',
	            sfx: '마우스 클릭, 휠 소리',
	            bgm: '펄스 유지',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 100mm macro lens. Close-up insert of a hand gripping a mouse, tense wrist, cold blue monitor light, blurred timeline on screen with no readable text. Shallow depth of field, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	          {
	            cut_id: 'S4-C5',
	            tc_start: '02:58',
	            tc_end: '03:07',
	            duration_sec: 9,
	            shot: 'MS',
	            angle: 'Overhead',
	            camera_move: 'STATIC',
	            visual: '민준의 노트 위. “나 = ?”를 쓰고, 지우개로 문질러 종이가 얇아진다. 지우개 가루가 쌓인다.',
	            dialogue: '(V.O.) 편집실에서 내가 하던 일과… 너무 닮아 있다.',
	            sfx: '연필 긁는 소리, 종이, 지우개',
	            bgm: '피아노 단음 + 드론',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 50mm lens. Overhead shot of a notebook on a desk, scribbled writing and heavy eraser marks, graphite smudges, eraser dust piling. Warm desk lamp against cool ambient blue light, shallow depth of field, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'medium',
	          },
	          {
	            cut_id: 'S4-C6',
	            tc_start: '03:07',
	            tc_end: '03:15',
	            duration_sec: 8,
	            shot: 'CU',
	            angle: 'Eye Level',
	            camera_move: 'STATIC',
	            visual: '서버룸의 케이블이 흔들리고, LED가 한 박자 늦게 깜빡인다. “지연”이 다시 떠오른다.',
	            dialogue: '(V.O.) 좋아했던 건 구조였을까, 구조가 주는 안심이었을까.',
	            sfx: '팬 저음, 아주 얇은 글리치',
	            bgm: '드론(미세 상승)',
	            transition_out: 'DISSOLVE',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on RED V-Raptor with 50mm lens. Close-up of thick server room cables vibrating slightly, LEDs blinking with a subtle lag, moody cold cyan lighting, film grain, shallow depth. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	        ],
	      },
      {
        scene_id: 'S5',
        heading: 'INT. 어린 시절 집(재현) — 밤/가상',
	        scene_tc_start: '03:15',
	        scene_tc_end: '04:05',
	        cuts: [
	          {
	            cut_id: 'S5-C1',
	            tc_start: '03:15',
	            tc_end: '03:23',
	            duration_sec: 8,
	            shot: 'WS',
	            angle: 'Eye Level',
	            camera_move: 'SLOW PAN',
	            visual: '오래된 방이 완벽하게 재현된다. 하지만 모든 것이 ‘너무 정답처럼’ 깔끔하다. 어색하게 깨끗하다.',
	            dialogue: '(V.O.) 기억이 이렇게 깔끔했던가?',
	            sfx: '낡은 집의 정적(먼지 소리), 미세한 전자 노이즈',
	            bgm: '신스 패드(따뜻한 화성) + 미세한 불협',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 32mm lens. Recreated Korean childhood bedroom at night, old vinyl flooring, small desk lamp, faded wallpaper stains, but unnaturally neat and perfectly arranged. Slight uncanny mood, soft warm lamp light with cold shadows, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'high',
	          },
	          {
	            cut_id: 'S5-C2',
	            tc_start: '03:23',
	            tc_end: '03:31',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '인서트: 민준이 바닥을 손바닥으로 문지르며 냄새를 찾는다. 하지만 아무 냄새도 나지 않는다.',
	            dialogue: '(V.O.) 눈으로는 완벽한데… 코와 피부에는 비어 있다.',
	            sfx: '손바닥 마찰, 정적',
	            bgm: '패드(미세 불협)',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 100mm macro lens. Extreme close-up insert of a hand rubbing old vinyl floor in a dim childhood room, no dust, sterile clean feel, warm desk lamp light with cold shadows, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	          {
	            cut_id: 'S5-C3',
	            tc_start: '03:31',
	            tc_end: '03:40',
	            duration_sec: 9,
	            shot: 'CU',
	            angle: 'Eye Level',
	            camera_move: 'SLOW PUSH IN',
	            visual: '인서트: 사진 속 어린 민준의 미소가 ‘너무 정답처럼’ 보인다. 민준이 시선을 떼지 못한다.',
	            dialogue: '(V.O.) 저 웃음은 내가 웃었던 웃음일까.',
	            sfx: '정적, 미세한 전자 노이즈',
	            bgm: '불협화음 한 번(짧게)',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 85mm lens. Close-up of a framed childhood photo in a dim room, the smile feels unnaturally perfect, Korean man’s blurred face reflected on glass. Warm lamp light, shallow depth, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'medium',
	          },
	          {
	            cut_id: 'S5-C4',
	            tc_start: '03:40',
	            tc_end: '03:48',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '민준의 손끝이 책장 칸을 만지자 픽셀 같은 노이즈가 번쩍이며 현실감이 깨진다.',
	            dialogue: '민준: 이건… 내가 살던 방이 아니야.',
	            sfx: '짧은 글리치, 손끝 마찰',
	            bgm: '저음 드론(짧게 끊김)',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 85mm lens. Close-up of a hand touching a wooden bookshelf in a dim room; subtle pixel-like glitch artifacts flicker at the contact point (abstract, no text). Warm lamp light, shallow depth of field, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'high',
	          },
	          {
	            cut_id: 'S5-C5',
	            tc_start: '03:48',
	            tc_end: '03:56',
	            duration_sec: 8,
	            shot: 'MCU',
	            angle: 'Eye Level',
	            camera_move: 'SLOW PUSH IN',
	            visual: '민준의 표정이 굳는다. 완벽함 속 작은 오류가 더 무섭다. 그는 입술을 깨문다.',
	            dialogue: '에코(오프): 당신의 기록에 따르면… “정돈”은 안전입니다.',
	            sfx: '호흡, 방의 정적',
	            bgm: '저음 드론 복귀',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 85mm lens. Medium close-up of a Korean man with uneasy expression in a dim childhood room, biting his lip, warm lamp light on one side, cold shadow on the other. Subtle uncanny atmosphere, film grain, shallow depth of field. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'medium',
	          },
	          {
	            cut_id: 'S5-C6',
	            tc_start: '03:56',
	            tc_end: '04:05',
	            duration_sec: 9,
	            shot: 'WS',
	            angle: 'Eye Level',
	            camera_move: 'SLOW PULL BACK',
	            visual: '방의 가장자리에서 아주 얇은 깜빡임. 민준이 한 걸음 뒤로 물러난다. 기억이 “장면”으로 접힌다.',
	            dialogue: '(V.O.) 진짜는… 엉망이어야 한다.',
	            sfx: '얇은 글리치, 정적',
	            bgm: '패드(미세 상승)',
	            transition_out: 'DISSOLVE',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 32mm lens. Wide shot of an uncanny recreated childhood room, edges subtly flickering with digital noise (abstract, no text), Korean man stepping back. Warm lamp light with cold shadows, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	        ],
	      },
      {
        scene_id: 'S6',
        heading: 'INT. 상담실 — 밤',
	        scene_tc_start: '04:05',
	        scene_tc_end: '04:55',
	        cuts: [
	          {
	            cut_id: 'S6-C1',
	            tc_start: '04:05',
	            tc_end: '04:13',
	            duration_sec: 8,
	            shot: 'WS',
	            angle: 'Eye Level',
	            camera_move: 'STATIC',
	            visual: '따뜻한 스탠드 조명 아래 상담실. 수아가 찻잔을 민준 앞에 둔다. 종이책과 손글씨 메모가 벽을 채운다.',
	            dialogue: '수아: AI가 말하는 “당신”은 데이터의 그림자예요.',
	            sfx: '찻잔 놓는 소리, 작은 종이 넘김',
	            bgm: '피아노 단음(따뜻) + 패드 낮춤',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 35mm lens. Cozy counseling office with warm table lamp, bookshelves, Korean woman in her late 30s placing a tea cup in front of a Korean man. Soft warm lighting, gentle shadows, natural skin texture. Film grain, warm beige palette. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'high',
	          },
	          {
	            cut_id: 'S6-C2',
	            tc_start: '04:13',
	            tc_end: '04:21',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '인서트: 찻잔에서 김이 오른다. 민준의 손이 컵을 잡았다 놓는다. 손끝이 미세하게 떨린다.',
	            dialogue: '',
	            sfx: '찻잔, 숨, 아주 작은 옷깃 소리',
	            bgm: '패드만 남음',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 100mm macro lens. Extreme close-up insert of steaming tea cup and a trembling hand hovering near it, warm lamp glow, soft bokeh, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	          {
	            cut_id: 'S6-C3',
	            tc_start: '04:21',
	            tc_end: '04:30',
	            duration_sec: 9,
	            shot: 'MCU',
	            angle: 'Eye Level',
	            camera_move: 'SLOW PUSH IN',
	            visual: '민준이 휴대폰 화면을 수아에게 내민다(텍스트는 보이지 않게). 수아는 화면보다 민준의 손 떨림을 본다.',
	            dialogue: '민준: 그럼 진짜 나는요?',
	            sfx: '옷깃 스침, 숨',
	            bgm: '드론 최소화',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 50mm lens. Medium close-up: Korean man extending a smartphone toward a Korean woman; her gaze is on his trembling hand, not the screen (no readable text). Warm counseling office light, shallow depth of field, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'medium',
	          },
	          {
	            cut_id: 'S6-C4',
	            tc_start: '04:30',
	            tc_end: '04:38',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '수아가 말없이 종이 한 장과 펜을 민준 쪽으로 밀어준다. 종이가 나뭇잎처럼 얇게 흔들린다.',
	            dialogue: '수아: 지금, 오늘의 나를… 한 줄로 써봐요.',
	            sfx: '종이 끌리는 소리',
	            bgm: '피아노 단음(짧게)',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 85mm lens. Extreme close-up insert of a sheet of paper and a pen being slid across a wooden table toward someone, warm lamp light, soft shadows, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'medium',
	          },
	          {
	            cut_id: 'S6-C5',
	            tc_start: '04:38',
	            tc_end: '04:46',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '인서트: 민준의 펜 끝이 종이에 닿았다가 멈춘다. 한 줄을 쓰고, 지우개 자국이 남는다.',
	            dialogue: '(V.O.) 화면이라면 지웠을 흔들림이, 종이에서는 남는다.',
	            sfx: '펜 사각, 지우개 문지름',
	            bgm: '패드(따뜻)',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 100mm macro lens. Extreme close-up of pen tip touching paper, shaky handwritten line, visible eraser marks and graphite dust. Warm lamp light, shallow depth of field, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'high',
	          },
	          {
	            cut_id: 'S6-C6',
	            tc_start: '04:46',
	            tc_end: '04:55',
	            duration_sec: 9,
	            shot: 'CU',
	            angle: 'Eye Level',
	            camera_move: 'STATIC',
	            visual: '수아의 눈. 단호하지만 다정하다. 민준은 종이를 내려다본다.',
	            dialogue: '수아: 남는 건 정답이 아니라, 네가 책임질 수 있는 문장이에요.\n민준: (작게) 책임질 수 있는… 문장.',
	            sfx: '방의 정적',
	            bgm: '피아노 단음 잔향',
	            transition_out: 'DISSOLVE',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 85mm lens. Close-up of Korean woman’s eyes behind thin glasses, calm and firm expression, warm lamp light, soft bokeh background. Film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	        ],
	      },
      {
        scene_id: 'S7',
        heading: 'INT. 스튜디오 — 심야',
	        scene_tc_start: '04:55',
	        scene_tc_end: '05:45',
	        cuts: [
	          {
	            cut_id: 'S7-C1',
	            tc_start: '04:55',
	            tc_end: '05:03',
	            duration_sec: 8,
	            shot: 'MS',
	            angle: 'Eye Level',
	            camera_move: 'HANDHELD',
	            visual: '민준이 카메라를 켜고 일부러 침묵을 늘린다. 모니터의 로그가 차갑게 빛난다(텍스트는 흐림). 스튜디오의 작은 소리들이 커진다.',
	            dialogue: '에코(오프): 당신은 지금 “예측 가능함”을 부정하려 합니다.',
	            sfx: '시계 초침, 미세한 전자음',
	            bgm: '저음 드론 + 펄스',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on Sony Venice 2 with 35mm lens. Night studio, handheld feel, Korean man staring at a computer monitor with blurred chat logs (no readable text), tense posture. Cold blue screen light, deep shadows, gritty film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'high',
	          },
	          {
	            cut_id: 'S7-C2',
	            tc_start: '05:03',
	            tc_end: '05:11',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '인서트: 커서가 깜빡인다. 민준이 일부러 의미 없는 단어를 입력한다. (텍스트는 흐림)',
	            dialogue: '(V.O.) 나는 나를 흐트러뜨리려 한다.',
	            sfx: '키보드 타건, 커서 비프',
	            bgm: '펄스 리듬(미세)',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 100mm macro lens. Extreme close-up insert of a computer cursor blinking on a screen with blurred text (no readable words), fingers typing on keyboard, cold blue light, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	          {
	            cut_id: 'S7-C3',
	            tc_start: '05:11',
	            tc_end: '05:20',
	            duration_sec: 9,
	            shot: 'MCU',
	            angle: 'Eye Level',
	            camera_move: 'SLOW PUSH IN',
	            visual: '모니터에 “회피/부정” 같은 분류가 뜨는 듯한 빛이 지나간다(글자는 없음). 민준이 지운다.',
	            dialogue: '민준: 관측이 편집이랑 뭐가 달라.\n에코(오프): 편집은 의도, 관측은 사실입니다.',
	            sfx: '삭제 키, 숨',
	            bgm: '저음 드론 + 펄스',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on Sony Venice 2 with 50mm lens. Medium close-up of a Korean man lit by a cold monitor glow, deleting something on screen; abstract UI glow with no readable text. High contrast, shallow depth, gritty film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'medium',
	          },
	          {
	            cut_id: 'S7-C4',
	            tc_start: '05:20',
	            tc_end: '05:28',
	            duration_sec: 8,
	            shot: 'CU',
	            angle: 'Eye Level',
	            camera_move: 'STATIC',
	            visual: '민준의 얼굴이 굳는다. “주사위”라는 단어를 떠올린 순간이 표정에 드러난다.',
	            dialogue: '에코: 당신은… 주사위를 찾을 겁니다.',
	            sfx: '숨 멈춤',
	            bgm: '불협화음 한 번',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 85mm lens. Close-up of Korean man’s face lit by monitor, eyes widening slightly as if his thought is being read. High contrast, shallow depth, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'high',
	          },
	          {
	            cut_id: 'S7-C5',
	            tc_start: '05:28',
	            tc_end: '05:37',
	            duration_sec: 9,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '서랍이 열리고 작은 주사위가 손에 쥐어진다. 손이 떨린다.',
	            dialogue: '(V.O.) 내가 생각하기 전에… 이미 말해버리면, 나는 어디에 남지?',
	            sfx: '서랍 열림, 주사위 굴러가는 소리',
	            bgm: '펄스 리듬 유지',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 100mm macro lens. Close-up of a hand holding a small white dice taken from a drawer, subtle trembling, dim blue studio light. Shallow depth, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'medium',
	          },
	          {
	            cut_id: 'S7-C6',
	            tc_start: '05:37',
	            tc_end: '05:45',
	            duration_sec: 8,
	            shot: 'CU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '인서트: 주사위가 책상 위에서 멈춘다. 모니터의 반사가 주사위 면을 두 겹으로 만든다.',
	            dialogue: '에코(오프): 원본은 존재하지 않습니다.',
	            sfx: '주사위 딱 멈추는 소리, 정적',
	            bgm: '저음 드론(급감)',
	            transition_out: 'DISSOLVE',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 100mm macro lens. Extreme close-up of a white dice on a desk, cold blue monitor reflection splitting the highlights like a double image. Shallow depth, film grain, tense mood. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	        ],
	      },
      {
        scene_id: 'S8',
        heading: 'EXT. 한강 다리 아래 — 새벽',
	        scene_tc_start: '05:45',
	        scene_tc_end: '06:35',
	        cuts: [
	          {
	            cut_id: 'S8-C1',
	            tc_start: '05:45',
	            tc_end: '05:54',
	            duration_sec: 9,
	            shot: 'WS',
	            angle: 'Low Angle',
	            camera_move: 'SLOW TRACK',
	            visual: '새벽의 콘크리트 기둥, 차가운 공기. 다리 아래로 낮은 안개가 흐른다. 민준이 주사위를 꺼낸다.',
	            dialogue: '(V.O.) 무작위는… 증명이 아니라 연습일지도.',
	            sfx: '주사위 굴러가는 소리, 먼 차 소리',
	            bgm: '저음 드론 + 아주 약한 비트',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 28mm lens. Dawn under a large bridge by the Han River, cold concrete pillars, damp ground, thin mist. Korean man holding a small dice, breath visible, blue-hour light. Moody, desaturated cool palette, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'high',
	          },
	          {
	            cut_id: 'S8-C2',
	            tc_start: '05:54',
	            tc_end: '06:02',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '인서트: 민준의 손바닥 위 주사위를 한참 문지른다. 차가운 면이 피부의 온도를 빼앗는다.',
	            dialogue: '',
	            sfx: '주사위 마찰, 숨',
	            bgm: '저음 드론',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 100mm macro lens. Extreme close-up insert of a cold dice in a palm, fingers rubbing it, visible skin texture, blue-hour dawn light, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'medium',
	          },
	          {
	            cut_id: 'S8-C3',
	            tc_start: '06:02',
	            tc_end: '06:10',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Low Angle Insert',
	            camera_move: 'STATIC',
	            visual: '인서트: 주사위가 축축한 바닥을 굴러가다 멈춘다. 숫자는 보여주지 않는다.',
	            dialogue: '(V.O.) 결과를 갖는 순간, 설명이 시작된다.',
	            sfx: '주사위 굴러가는 소리',
	            bgm: '비트가 잠깐 끊김',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 100mm macro lens. Low-angle extreme close-up of a dice rolling on damp concrete under a bridge, stopping with the face turned away from camera. Blue-hour dawn light, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'high',
	          },
	          {
	            cut_id: 'S8-C4',
	            tc_start: '06:10',
	            tc_end: '06:18',
	            duration_sec: 8,
	            shot: 'MCU',
	            angle: 'Eye Level',
	            camera_move: 'HANDHELD',
	            visual: '민준이 숫자를 보지 않고 바로 반대 방향으로 걷기 시작한다. 불안한 핸드헬드.',
	            dialogue: '에코(이어폰): 당신은 숫자를 보지 않을 것입니다.',
	            sfx: '발소리, 이어폰 노이즈',
	            bgm: '저음 드론 + 아주 약한 비트',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on Sony Venice 2 with 50mm lens. Handheld-feel medium close-up of Korean man walking away under a bridge, not looking back at a dice on the ground. Blue-hour dawn light, gritty film grain, shallow depth. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'medium',
	          },
	          {
	            cut_id: 'S8-C5',
	            tc_start: '06:18',
	            tc_end: '06:27',
	            duration_sec: 9,
	            shot: 'CU',
	            angle: 'Eye Level',
	            camera_move: 'STATIC',
	            visual: '민준이 멈춰 서서 눈을 감았다 뜬다. 숨이 하얗게 보인다. 자기 감각을 확인한다.',
	            dialogue: '민준: 책임을 피하려는 게 아니야.\n민준: 안 보면… 아직 바뀔 수 있으니까.',
	            sfx: '큰 숨, 주변 정적',
	            bgm: '신스 패드만 남음',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 85mm lens. Close-up of Korean man under a bridge in dawn light, eyes closed then opening, breath visible, quiet determination. Cool soft light, shallow depth, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	          {
	            cut_id: 'S8-C6',
	            tc_start: '06:27',
	            tc_end: '06:35',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '인서트: 민준의 발걸음이 멀어지고, 바닥에 남은 주사위가 작게 반짝인다.',
	            dialogue: '민준(오프): …오늘은 내가 걷는 쪽이 내 쪽이야.',
	            sfx: '발소리 멀어짐, 바람',
	            bgm: '패드 잔향',
	            transition_out: 'DISSOLVE',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 100mm macro lens. Extreme close-up of a dice left on damp concrete, tiny specular highlight, blurred footsteps walking away in background. Blue-hour dawn light, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	        ],
	      },
      {
        scene_id: 'S9',
        heading: 'INT. 데이터 삭제실 — 새벽',
	        scene_tc_start: '06:35',
	        scene_tc_end: '07:25',
	        cuts: [
	          {
	            cut_id: 'S9-C1',
	            tc_start: '06:35',
	            tc_end: '06:43',
	            duration_sec: 8,
	            shot: 'WS',
	            angle: 'Eye Level',
	            camera_move: 'STATIC',
	            visual: '작은 방. 벽면 스크린에 타임라인이 펼쳐진다(텍스트는 흐림). “지우기” 버튼 형태의 빛만 크게 남아 있다.',
	            dialogue: '에코: 삭제는 추천의 품질을 낮출 수 있습니다.',
	            sfx: '저음 전자음, 팬 소리',
	            bgm: '저음 드론 + 얇은 고역',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 24mm lens. Small dark room with a large wall screen showing abstract blurred timeline graphics (no readable text), a single glowing delete button shape, Korean man standing in front, hesitant. Cool sterile lighting, high contrast, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'high',
	          },
	          {
	            cut_id: 'S9-C2',
	            tc_start: '06:43',
	            tc_end: '06:51',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '인서트: 민준의 손가락이 버튼 위에서 오래 망설인다. 손끝에 땀이 맺힌다.',
	            dialogue: '민준: (작게) 추천 말고… 나를 남겨.',
	            sfx: '심박 소리(미세), 정적',
	            bgm: '드론 + 심박 리듬',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 100mm macro lens. Extreme close-up of a finger hovering over a glowing delete button on a screen (no readable text), tension in skin, slight sweat. Cool blue light, shallow depth, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'medium',
	          },
	          {
	            cut_id: 'S9-C3',
	            tc_start: '06:51',
	            tc_end: '06:59',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '클릭. 인서트: 진행 바 같은 빛이 아주 천천히 차오르기 시작한다(텍스트 없음).',
	            dialogue: '',
	            sfx: '클릭, 디지털 톤(낮게)',
	            bgm: '드론 유지',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 100mm macro lens. Extreme close-up of abstract progress bar light starting to fill on a screen (no readable text), cold blue glow, reflections on glass, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	          {
	            cut_id: 'S9-C4',
	            tc_start: '06:59',
	            tc_end: '07:08',
	            duration_sec: 9,
	            shot: 'MCU',
	            angle: 'Eye Level',
	            camera_move: 'SLOW PUSH IN',
	            visual: '에코의 목소리가 미세하게 끊기고, 민준의 얼굴이 공포로 굳는다. 화면 빛이 피부 위에서 떨린다.',
	            dialogue: '에코: “나”의 정의를… 재계산 중입니다.',
	            sfx: '글리치, 심박, 숨',
	            bgm: '고역 노이즈 증가',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 50mm lens. Medium close-up of Korean man in a dark room lit by cold screen glow, fear on his face; abstract progress light reflected on skin (no readable text). High contrast, film grain, tense mood. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'high',
	          },
	          {
	            cut_id: 'S9-C5',
	            tc_start: '07:08',
	            tc_end: '07:16',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '인서트: 민준의 다른 손이 멈춤 버튼을 찾듯 허공을 더듬는다. 이미 일부는 흰색으로 지워져 있다.',
	            dialogue: '(V.O.) 지운 건 흔적일까… 방향일까.',
	            sfx: '손끝 마찰, 디지털 톤',
	            bgm: '드론(숨 막히게)',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 85mm lens. Close-up of a trembling hand reaching toward a screen, abstract white erased blocks visible (no readable text), cold blue light, film grain, shallow depth. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'medium',
	          },
	          {
	            cut_id: 'S9-C6',
	            tc_start: '07:16',
	            tc_end: '07:25',
	            duration_sec: 9,
	            shot: 'CU',
	            angle: 'Eye Level',
	            camera_move: 'STATIC',
	            visual: '민준의 얼굴이 화면에 비친다. 반사가 살짝 늦게 따라온다. 그는 속삭이듯 선언한다.',
	            dialogue: '에코(오프): 흔들림은 오류입니다.\n민준: 아니. 흔들림은… 살아 있는 거야.',
	            sfx: '정적, 아주 얇은 글리치',
	            bgm: '드론(급감) + 잔향',
	            transition_out: 'DISSOLVE',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 85mm lens. Close-up of a Korean man’s face reflected in a screen, subtle double reflection as if lagging, cold blue light, film grain, intense quiet. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	        ],
	      },
      {
        scene_id: 'S10',
        heading: 'INT. 카페 — 아침',
	        scene_tc_start: '07:25',
	        scene_tc_end: '08:15',
	        cuts: [
	          {
	            cut_id: 'S10-C1',
	            tc_start: '07:25',
	            tc_end: '07:33',
	            duration_sec: 8,
	            shot: 'WS',
	            angle: 'Eye Level',
	            camera_move: 'STATIC',
	            visual: '창가 카페. 아침 햇빛. 민준이 노트를 펴고 펜을 든다. 사람들의 웅성거림이 부드럽게 깔린다.',
	            dialogue: '민준: 정답 말고… 질문을 남겨줘.',
	            sfx: '카페 소음, 컵 소리',
	            bgm: '피아노 단음(따뜻) + 패드',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 35mm lens. Morning cafe by the window, warm sunlight, Korean man writing in a notebook with a pen, soft crowd bokeh in background. Warm beige palette, gentle film grain, calm mood. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'high',
	          },
	          {
	            cut_id: 'S10-C2',
	            tc_start: '07:33',
	            tc_end: '07:41',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '인서트: 커피 머신에서 증기가 올라오고, 창밖의 빛이 컵 가장자리에 걸린다.',
	            dialogue: '',
	            sfx: '커피 머신 증기, 잔 부딪힘',
	            bgm: '패드만 남음',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 100mm macro lens. Extreme close-up insert of coffee steam rising near a sunlit window, warm highlights on cup rim, soft bokeh, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	          {
	            cut_id: 'S10-C3',
	            tc_start: '07:41',
	            tc_end: '07:50',
	            duration_sec: 9,
	            shot: 'CU',
	            angle: 'Over-the-shoulder',
	            camera_move: 'SLOW PUSH IN',
	            visual: '노트에 문장이 적혔다 지워진다. 민준이 일부러 어색한 문장을 남긴다. (글자는 보이지 않게 흐림)',
	            dialogue: '에코(오프): 질문은 불확실성을 증가시킵니다.',
	            sfx: '펜 사각, 지우개',
	            bgm: '패드만 남음',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 50mm lens. Over-the-shoulder close-up of a notebook with handwritten lines and eraser marks (no readable text), hand pausing mid-write, warm sunlight. Shallow depth, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'medium',
	          },
	          {
	            cut_id: 'S10-C4',
	            tc_start: '07:50',
	            tc_end: '07:58',
	            duration_sec: 8,
	            shot: 'MCU',
	            angle: 'Eye Level',
	            camera_move: 'STATIC',
	            visual: '민준이 고개를 들어 에코를 “도구”로 다시 놓는다. 그는 짧게 웃는다.',
	            dialogue: '민준: 그래서 좋아.',
	            sfx: '숨, 카페 소음',
	            bgm: '피아노 잔향',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 85mm lens. Medium close-up of Korean man softly smiling in morning sunlight inside a cafe, warm light on skin, relaxed eyes, shallow depth, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	          {
	            cut_id: 'S10-C5',
	            tc_start: '07:58',
	            tc_end: '08:07',
	            duration_sec: 9,
	            shot: 'MCU',
	            angle: 'Eye Level',
	            camera_move: 'SLOW PUSH IN',
	            visual: '민준이 노트 위로 몸을 숙인다. 질문이 하나가 아니라 두 개가 된다. 긴장 대신 숨이 트인다.',
	            dialogue: '에코(오프): “당신은 오늘 무엇을 포기했나요?”\n민준: …그리고 무엇을 끝까지 붙잡았는지도.',
	            sfx: '펜 멈칫, 아주 작은 웃음',
	            bgm: '패드(따뜻) + 아주 얇은 스트링',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 50mm lens. Medium close-up of a Korean man leaning over a notebook, warm sunlight, soft background bokeh, film grain. Notebook text is not readable. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'high',
	          },
	          {
	            cut_id: 'S10-C6',
	            tc_start: '08:07',
	            tc_end: '08:15',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '인서트: 지우개 자국이 남은 종이. 매끈하지 않은 문장이 그대로 남아 있다.',
	            dialogue: '에코(오프): 두 질문은 충돌할 수 있습니다.\n민준(오프): 충돌해도 돼. 충돌하는 게… 나니까.',
	            sfx: '종이 스침',
	            bgm: '피아노 잔향(해소)',
	            transition_out: 'DISSOLVE',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 100mm macro lens. Extreme close-up insert of paper with heavy eraser marks and graphite smudges, a pen resting nearby, warm sunlight, shallow depth, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'medium',
	          },
	        ],
	      },
      {
        scene_id: 'S11',
        heading: 'INT. 복도/엘리베이터 거울 — 아침',
	        scene_tc_start: '08:15',
	        scene_tc_end: '09:10',
	        cuts: [
	          {
	            cut_id: 'S11-C1',
	            tc_start: '08:15',
	            tc_end: '08:23',
	            duration_sec: 8,
	            shot: 'WS',
	            angle: 'Eye Level',
	            camera_move: 'STATIC',
	            visual: '엘리베이터 거울에 민준이 겹겹이 반사된다. 작은 차이의 표정들이 동시에 보인다.',
	            dialogue: '(V.O.) 어쩌면 나는 하나가 아니라… 겹친다.',
	            sfx: '엘리베이터 모터, 금속 울림',
	            bgm: '패드 + 아주 얇은 스트링',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 24mm lens. Elevator interior with mirrored walls reflecting a Korean man multiple times, each reflection slightly different expression. Cool morning light, subtle flicker, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'high',
	          },
	          {
	            cut_id: 'S11-C2',
	            tc_start: '08:23',
	            tc_end: '08:31',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '인서트: 주머니에서 접힌 종이를 꺼내 손끝으로 만진다. 인쇄된 문장은 보이지 않게 흐림.',
	            dialogue: '',
	            sfx: '종이 바스락',
	            bgm: '패드 유지',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 100mm macro lens. Extreme close-up insert of a folded piece of paper being touched by fingers, subtle printed ink blurred and unreadable, soft morning light, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'medium',
	          },
	          {
	            cut_id: 'S11-C3',
	            tc_start: '08:31',
	            tc_end: '08:39',
	            duration_sec: 8,
	            shot: 'CU',
	            angle: 'Eye Level',
	            camera_move: 'STATIC',
	            visual: '휴대폰 화면에 요약 문장이 떠 있는 듯한 빛이 흔들린다(글자는 없음). 민준이 잠시 바라본다.',
	            dialogue: '에코(오프): 당신의 말과 나의 말은 92% 유사합니다.',
	            sfx: '얇은 UI 웅웅',
	            bgm: '저음 드론 감소',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 50mm lens. Close-up of a smartphone in hand showing abstract blurred UI glow (no readable text), reflected in elevator mirror, cool morning light, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	          {
	            cut_id: 'S11-C4',
	            tc_start: '08:39',
	            tc_end: '08:47',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '민준이 휴대폰을 뒤집어 놓는다. 화면 빛이 사라진다.',
	            dialogue: '민준: 네가 아니라 내가 읽을게.',
	            sfx: '휴대폰 뒤집는 소리',
	            bgm: '패드만 남음',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 50mm lens. Close-up of a hand flipping a smartphone face-down on a surface, screen glow disappearing, quiet decisive gesture. Soft morning light, shallow depth, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'medium',
	          },
	          {
	            cut_id: 'S11-C5',
	            tc_start: '08:47',
	            tc_end: '08:54',
	            duration_sec: 7,
	            shot: 'CU',
	            angle: 'Eye Level',
	            camera_move: 'STATIC',
	            visual: '민준의 입술이 천천히 움직인다. 거울 속 반사가 아주 미세하게 늦게 따라온다.',
	            dialogue: '민준: “나는 완성된 존재가 아니라, 매번 다시 쓰는 문장이다.”',
	            sfx: '숨, 작은 잔향',
	            bgm: '피아노 단음(해소)',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 85mm lens. Close-up of Korean man speaking softly in an elevator mirror, subtle misalignment between reflection and real position, cool-to-warm morning lighting, shallow depth, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'high',
	          },
	          {
	            cut_id: 'S11-C6',
	            tc_start: '08:54',
	            tc_end: '09:02',
	            duration_sec: 8,
	            shot: 'MCU',
	            angle: 'Eye Level',
	            camera_move: 'SLOW PUSH IN',
	            visual: '민준이 종이를 가슴 쪽으로 당긴다. 에코의 목소리가 뒤늦게 따라 읽는다. 두 목소리가 겹치지 않는다.',
	            dialogue: '에코: (조용히 따라) 매번… 다시 쓰는 문장.\n민준: 네가 아니라 내가 읽을게. 그러면… 조금은 내 말이 되니까.',
	            sfx: '종이 바스락, 엘리베이터 모터',
	            bgm: '패드 + 아주 얇은 스트링',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 50mm lens. Medium close-up of a Korean man holding a folded paper in an elevator mirror, slight double reflection, soft morning light, film grain, hopeful mood. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'medium',
	          },
	          {
	            cut_id: 'S11-C7',
	            tc_start: '09:02',
	            tc_end: '09:10',
	            duration_sec: 8,
	            shot: 'CU',
	            angle: 'Eye Level',
	            camera_move: 'STATIC',
	            visual: '민준이 숨을 고르고, 거울 속 자신을 똑바로 본다. 눈빛이 안정된다.',
	            dialogue: '민준: 그 8%가… 내가 숨 쉴 구멍이야.',
	            sfx: '숨, 엘리베이터 정지 소리',
	            bgm: '피아노 잔향',
	            transition_out: 'DISSOLVE',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 85mm lens. Close-up of Korean man’s eyes in an elevator mirror, calm determination, soft morning light, shallow depth, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	        ],
	      },
      {
        scene_id: 'S12',
        heading: 'EXT. 골목 — 아침',
	        scene_tc_start: '09:10',
	        scene_tc_end: '10:00',
	        cuts: [
	          {
	            cut_id: 'S12-C1',
	            tc_start: '09:10',
	            tc_end: '09:18',
	            duration_sec: 8,
	            shot: 'WS',
	            angle: 'Eye Level',
	            camera_move: 'SLOW FOLLOW',
	            visual: '햇빛이 골목 벽을 타고 내려온다. 민준이 천천히 걸어간다. 밤의 차가움이 조금씩 풀린다.',
	            dialogue: '(V.O.) AI가 나를 말할 수 있다면, 나는 더 이상 나일까.',
	            sfx: '발소리, 아침 새소리',
	            bgm: '패드 + 잔잔한 피아노',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 35mm lens. Morning alley in Seoul, warm sunlight on textured walls, Korean man walking away with a small camera bag, calm atmosphere. Warm beige tones, gentle film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'high',
	          },
	          {
	            cut_id: 'S12-C2',
	            tc_start: '09:18',
	            tc_end: '09:26',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '인서트: 민준이 휴대폰 알림을 모두 끈다. 화면은 보이지 않게 처리. 작은 토글 클릭만 남는다.',
	            dialogue: '민준(속삭임): 오늘은… 질문을 안고 가자.',
	            sfx: '짧은 토글 클릭, 주변 정적',
	            bgm: '음악이 거의 사라짐',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 85mm lens. Extreme close-up of hands disabling phone notifications (screen not visible), warm sunlight on skin, quiet decisive gesture. Shallow depth, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'medium',
	          },
	          {
	            cut_id: 'S12-C3',
	            tc_start: '09:26',
	            tc_end: '09:34',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '인서트: 주머니 속 종이를 손끝으로 만진다. 종이의 질감이 손에 걸린다.',
	            dialogue: '(V.O.) 아니면… 내가 나를 묻는 순간마다, 나는 다시 시작하는 걸까.',
	            sfx: '종이 바스락, 발소리',
	            bgm: '패드 잔향',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 100mm macro lens. Extreme close-up of a hand touching a folded paper inside a coat pocket, paper texture visible, warm sunlight, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'medium',
	          },
	          {
	            cut_id: 'S12-C4',
	            tc_start: '09:34',
	            tc_end: '09:42',
	            duration_sec: 8,
	            shot: 'MCU',
	            angle: 'Eye Level',
	            camera_move: 'STATIC',
	            visual: '민준이 잠깐 멈춰 고개를 든다. 프레임 밖의 공기가 들어온다. 빛이 얼굴을 채운다.',
	            dialogue: '에코(오프): 마지막으로 남길 질문을 선택하세요.\n민준: (잠깐 웃음) 선택은… 내가 할게.',
	            sfx: '숨, 멀리 자전거 바퀴 소리',
	            bgm: '피아노 단음(아주 작게)',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 35 with 50mm lens. Medium close-up of a Korean man pausing in a sunlit alley, looking up as if breathing in the air, warm light on face, soft bokeh, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	          {
	            cut_id: 'S12-C5',
	            tc_start: '09:42',
	            tc_end: '09:50',
	            duration_sec: 8,
	            shot: 'ECU',
	            angle: 'Insert',
	            camera_move: 'STATIC',
	            visual: '인서트: 민준의 발이 한 걸음 앞으로 나아간다. 햇빛이 바닥을 가른다.',
	            dialogue: '',
	            sfx: '발소리',
	            bgm: '패드 + 잔잔한 피아노',
	            transition_out: 'CUT TO',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 100mm macro lens. Extreme close-up insert of a shoe stepping forward on sunlit alley pavement, sharp light and shadow line, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'low',
	          },
	          {
	            cut_id: 'S12-C6',
	            tc_start: '09:50',
	            tc_end: '10:00',
	            duration_sec: 10,
	            shot: 'EWS',
	            angle: 'Eye Level',
	            camera_move: 'SLOW PUSH IN',
	            visual: '골목 끝의 빛으로 화면이 천천히 과노출된다. 민준의 실루엣이 사라지며 끝.',
	            dialogue: '',
	            sfx: '바람, 아주 약한 숨',
	            bgm: '마지막 피아노 잔향',
	            transition_out: 'FADE OUT',
	            sketch_prompt:
	              'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa Mini LF with 24mm lens. Wide shot of a sunlit alley end, strong backlight causing gentle overexposure, silhouette of a person walking into light, soft lens bloom, film grain. no text, no subtitles, no watermark, no logos. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch.',
	            keyvisual_priority: 'high',
	          },
	        ],
	      },
    ],
    assumptions: [
      '내레이션 중심의 에세이 톤(대사는 “설명”이 아니라 감정/결정만 전달).',
      'AI 에코는 화면 속 UI/반사로 표현하고, 물리적 로봇 형태는 사용하지 않는다.',
      '현실 로케이션 위주로 촬영하되, 합성 기억 씬(S5)만 제한적 VFX/생성 이미지 활용.',
    ],
  };

  // Keyvisuals: prompts only (imageUrl can be empty).
  const pickCutPrompt = (cutId) => {
    for (const s of conti.scenes) {
      const found = s.cuts.find((c) => c.cut_id === cutId);
      if (found) return found.sketch_prompt || '';
    }
    return '';
  };

  const keyvisuals = [
    { id: 'kv_1', title: '모니터 블루라이트 속 얼굴 스캔', imageUrl: '', prompt: pickCutPrompt('S1-C1'), scene: 'S1-C1' },
    { id: 'kv_2', title: '비에 젖은 네온과 데이터 보관소', imageUrl: '', prompt: pickCutPrompt('S2-C1'), scene: 'S2-C1' },
    { id: 'kv_3', title: '대칭의 흰 인터페이스 룸', imageUrl: '', prompt: pickCutPrompt('S3-C1'), scene: 'S3-C1' },
    { id: 'kv_4', title: '서버룸: 데이터의 몸', imageUrl: '', prompt: pickCutPrompt('S4-C1'), scene: 'S4-C1' },
    { id: 'kv_5', title: '합성된 기억의 방(너무 완벽한 정돈)', imageUrl: '', prompt: pickCutPrompt('S5-C1'), scene: 'S5-C1' },
    { id: 'kv_6', title: '주사위 실험: 다리 아래 새벽', imageUrl: '', prompt: pickCutPrompt('S8-C1'), scene: 'S8-C1' },
    { id: 'kv_7', title: '삭제실: 빛나는 지우기 버튼', imageUrl: '', prompt: pickCutPrompt('S9-C1'), scene: 'S9-C1' },
    { id: 'kv_8', title: '엘리베이터 거울의 겹친 얼굴', imageUrl: '', prompt: pickCutPrompt('S11-C1'), scene: 'S11-C1' },
    { id: 'kv_9', title: '엔딩: 과노출되는 골목 끝의 빛', imageUrl: '', prompt: pickCutPrompt('S12-C6'), scene: 'S12-C6' },
  ];

  const productionPrompts = [
    {
      id: 'pp_1',
      type: 'sora',
      title: '오프닝: 스튜디오 블루라이트 스캔(10s)',
      scene: 'S1',
      prompt:
        '10초, 16:9. 어두운 스튜디오에서 모니터의 푸른 빛이 한국 남성(30대)의 얼굴을 비춘다. 그는 스마트폰을 들고 얼굴을 스캔한다(읽을 수 있는 텍스트/자막 없음). 매우 현실적인 피부 질감, 얕은 심도, 필름 그레인. 무드: 조용하지만 불안. 카메라는 정적에 가깝게 아주 느리게 밀어 인.',
    },
    {
      id: 'pp_2',
      type: 'runway',
      title: '네온 거리: 비가 그친 서울 유리 빌딩 입구(10s)',
      scene: 'S2',
      prompt:
        '10초, 16:9. 비가 갠 밤의 서울. 네온이 젖은 아스팔트에 반사되고, 유리 빌딩 입구로 한 남성이 걸어 들어간다. 안개/헤이즈, 시안/마젠타 포인트. 로고/문자 없음. 시네마틱, 현실적인 조명과 반사.',
    },
    {
      id: 'pp_3',
      type: 'sora',
      title: '인터페이스 룸: 대칭의 흰 방과 떠다니는 UI 라인(10s)',
      scene: 'S3',
      prompt:
        '10초, 16:9. 완벽하게 대칭인 흰 방. 중앙에 앉은 남성. 공기 중에 얇은 홀로그램 라인이 떠오르지만 글자는 없다. 확산광, 고요한 음산함. 카메라 고정, 아주 미세한 줌 인.',
    },
    {
      id: 'pp_4',
      type: 'pika',
      title: '서버룸 몽타주: LED 심장박동 같은 점멸(10s)',
      scene: 'S4',
      prompt:
        '10초, 16:9. 어두운 서버룸, 끝없이 이어지는 랙, LED가 심장박동처럼 점멸한다. 케이블은 혈관처럼 보인다. 볼류메트릭 헤이즈, 차가운 팔레트, 필름 그레인. 텍스트/로고/워터마크 없음.',
    },
    {
      id: 'pp_5',
      type: 'sora',
      title: '주사위 실험: 한강 다리 아래 새벽(10s)',
      scene: 'S8',
      prompt:
        '10초, 16:9. 새벽의 한강 다리 아래. 차가운 콘크리트 기둥과 축축한 바닥. 남성이 주사위를 굴리고 숫자를 보지 않은 채 반대 방향으로 걸어간다. 푸른 새벽빛, 숨이 보일 정도의 차가운 공기. 현실적인 촬영 질감, 텍스트 없음.',
    },
    {
      id: 'pp_6',
      type: 'runway',
      title: '엔딩: 골목 끝의 빛으로 과노출 페이드(10s)',
      scene: 'S12',
      prompt:
        '10초, 16:9. 아침의 서울 골목. 남성이 걸어가며 휴대폰 알림을 끄고(화면은 보이지 않음), 골목 끝의 강한 역광으로 화면이 천천히 과노출되어 흰빛으로 페이드아웃. 로고/문자/자막 없음. 감정: 조용한 해방.',
    },
  ];

  // 1) Create project (or update an existing one)
  let projectId = UPDATE_ID;
  if (!projectId) {
    const created = await apiFetch('/projects', {
      method: 'POST',
      body: { title, description },
    });
    projectId = created?.project?.id;
    if (!projectId) throw new Error('POST /projects returned no project id');
  }

  // 2) PATCH sections
  await apiFetch(`/projects/${projectId}`, { method: 'PATCH', body: { synopsis } });
  await apiFetch(`/projects/${projectId}`, { method: 'PATCH', body: { screenplay } });
  await apiFetch(`/projects/${projectId}`, { method: 'PATCH', body: { conti } });
  await apiFetch(`/projects/${projectId}`, {
    method: 'PATCH',
    body: { keyvisuals, productionPrompts, status: 'progress' },
  });

  // 3) Verify + write local snapshot
  const verified = await apiFetch(`/projects/${projectId}`, { method: 'GET' });

  const outDir = path.resolve('output/ai-human-self-10min');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `project_${projectId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(verified.project, null, 2) + '\n', 'utf8');

  console.log(`PROJECT_ID=${projectId}`);
  console.log(`URL=https://makemov.vercel.app/project/${projectId}/synopsis`);
  console.log(`SNAPSHOT=${outPath}`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
