---
name: 줄콘티 작성 (Line Conti / Shot List)
description: 시나리오 MD 또는 JSON을 입력으로 받아 컷 단위 화면 설계(줄콘티)를 작성하고, 시네마틱 실사 프롬프트(cinematic_prompt/SKILL.md 준용)를 자동 생성한다.
---

# 📋 줄콘티 작성 스킬 v2.1

## 개요
시나리오 씬을 편집 가능한 **컷 리스트(줄콘티)**와 **시네마틱 실사 프롬프트**로 변환한다.
콘티 페이지에서 디자인 뷰/편집 뷰/JSON 뷰로 관리 가능하도록 데이터를 구조화한다.

> ⚠️ **핵심 원칙**: sketch_prompt는 **완성형 실사 프롬프트**로 작성한다.
> 스케치/흑백/러프 스타일이 아니라, `cinematic_prompt/SKILL.md`의 6단계를 따르는 포토리얼리스틱 프롬프트.

---

## 용어 정의

| 용어 | 정의 |
|------|------|
| Scene | 장소/시간 단위 이야기 구간 |
| Cut | 연속 촬영·편집 단위의 시간 구간 |
| Frame | 단일 정지 이미지 (Cut ≠ Frame) |
| sketch_prompt | 이미지 생성 AI에 전달하는 완성형 실사 프롬프트 |
| promptContext | 프로젝트 공통 참조 정보 (시대/문화/부정어) — 표시용 |

---

## 입력 계약

### 필수 입력
- **승인된 시나리오** (`status=approved/locked`) — 다음 중 하나:
  - 시나리오 JSON (`scenes[]`, `beats[]`, 타임코드 포함)
  - 시나리오 MD (씬별 슬러그라인, 액션, 대사 포함)

### 선택 입력
- 컷 밀도 (느림 / 보통 / 빠름)
- 프로젝트 시각 톤 (promptContext로 반영)

---

## 출력 계약

항상 아래 3가지를 함께 출력한다.

> 📌 공통 규약: `SKILL_INDEX.md` §1(ID체계) §2(승인기계) §3(변경전파) 참조.

### 1) 프롬프트 상수 블록

프로젝트 단위로 **실사 프롬프트 상수**를 먼저 정의한다.
`cinematic_prompt/SKILL.md`의 **역사 전쟁 템플릿** 또는 해당 장르 템플릿을 참조.

```javascript
// ── 시네마틱 실사 프롬프트 상수 (cinematic_prompt/SKILL.md 준용) ──
const PROMPT_PREFIX = 'Photorealistic cinematic still photograph, 16:9, 8K. Shot on [카메라] with [렌즈]. [시대], [배경].';
const CHARACTER_A = '[인물A 상세: 인종, 의상 재질, 갑주/복장 디테일, 피부 질감]';
const CHARACTER_B = '[인물B 상세]';
const SETTING = '[장소 상세: 건축양식, 재질, 특징]';
const NEG = 'Real human faces, real armor textures, real fabric weave. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch, NOT pencil drawing.';
```

**상수 작성 체크리스트:**
- [ ] `PROMPT_PREFIX`에 `Photorealistic` + 카메라/렌즈 명시
- [ ] 인물 상수에 **재질**(lacquered iron, silk, worn leather 등) 포함
- [ ] 인물 상수에 **인종/외모** 명시 (East Asian face, natural skin texture 등)
- [ ] `NEG` 상수에 부정어 포함 (`NOT illustration`, `NOT painting` 등)
- [ ] 장소 상수에 **건축 재질**(rough-hewn granite, carved wood 등) 포함

### 2) 줄콘티 데이터 (JS/JSON)

```javascript
export const PROJECT_CONTI = {
    uid: '<UUIDv7>',
    parent_uid: '<screenplay.uid>',
    rev: 'r1',
    status: 'draft',
    title: '프로젝트 제목 — 줄콘티',
    totalDuration: '약 XX분',
    promptContext: {
        era: '[시대 맥락 — 표시용]',
        culture: '[문화 맥락 — 복장/갑주/건축 상세]',
        negatives: '[부정어 — 표시용]',
    },
    scenes: [
        {
            scene_id: 'S1',
            heading: 'EXT/INT. 장소 — 시간대',
            scene_tc_start: '00:00.0',
            scene_tc_end: '00:45.0',
            cuts: [
                {
                    cut_id: 'S1-C1',
                    uid: '<UUIDv7>',
                    parent_uid: '<scene.uid>',
                    rev: 'r1',
                    status: 'draft',
                    tc_start: '00:00.0',
                    tc_end: '00:06.0',
                    duration_sec: 6.0,
                    shot: 'EWS',           // 샷 타입
                    angle: 'High Angle',   // 앵글
                    camera_move: 'DOLLY FORWARD',  // 카메라 이동
                    visual: '화면 묘사 (한글)',
                    dialogue: '',
                    sfx: '효과음',
                    bgm: '배경음악',
                    transition_out: 'DISSOLVE',
                    sketch_prompt: `${PROMPT_PREFIX} [완성형 실사 프롬프트]. ${NEG}`,
                    keyvisual_priority: 'high',  // high / medium / low
                },
            ],
        },
    ],
    assumptions: [],
};
```

### 3) promptContext의 역할

`promptContext`는 **ContiPage UI 표시용**이다. 실제 프롬프트에는 영향을 주지 않는다.

| 필드 | 용도 | 예시 |
|------|------|------|
| `era` | 시대 배경 표시 | `1593, Joseon Dynasty Korea, Second Siege of Jinju Castle` |
| `culture` | 문화·복장 가이드 표시 | `Korean defenders: traditional Joseon armor (두정갑/갑주)...` |
| `negatives` | 부정어 표시 | `Real human faces, real armor textures. NOT illustration...` |

> **주의**: 이전 버전에서는 `buildFullPrompt` 함수가 promptContext를 sketch_prompt에 합성했으나,
> v2.0부터 sketch_prompt 자체가 완성형이므로 `buildFullPrompt(cut)`은 그대로 반환만 한다.

---

## sketch_prompt 작성법 (핵심)

### ⚠️ 반드시 `cinematic_prompt/SKILL.md` 참조

각 컷의 `sketch_prompt`는 다음 **6단계**를 반드시 포함한다:

```
1. 스타일 선언: Photorealistic [촬영유형], [비율], [해상도]. Shot on [카메라] with [렌즈].
2. 장면 설정: [시간대]. [장소 구체 묘사]. [날씨/분위기].
3. 피사체: [인물: 외모+의상재질+표정+자세] 또는 [사물: 재질+상태].
4. 분위기: [감정 키워드].
5. 조명: [주광원] + [보조광]. [명암 패턴]. [렌즈 효과].
6. 기술 마감: [필름/색감]. [참고 스타일]. Real textures. NOT illustration...
```

### 실사 프롬프트 vs 스케치 프롬프트 비교

| 단계 | ❌ 구 스케치 방식 | ✅ 신 실사 방식 |
|------|-----------------|---------------|
| 스타일 | `storyboard pencil sketch, black and white` | `Photorealistic cinematic still photograph, 16:9, 8K. Shot on RED V-Raptor with Zeiss Supreme Prime lens.` |
| 피사체 재질 | `traditional armor` | `weathered iron-plated Joseon lamellar armor (두정갑), riveted metal plates catching dim light` |
| 조명 | 없음 | `Chiaroscuro lighting, volumetric smoke, anamorphic lens flare` |
| 색감 | 없음 | `Desaturated warm tones, heavy film grain, Kodak Vision3 film emulation` |
| 부정어 | 없음 | `NOT illustration, NOT painting, NOT anime, NOT 3D render` |

### 씬 시간대별 조명/분위기 가이드

| 씬 시간대 | 조명 키워드 | 색감 |
|-----------|-----------|------|
| 황혼/골든아워 | `Golden hour sunset, warm amber backlight, rim light` | `Desaturated warm tones, Kodak Vision3` |
| 새벽/안개 | `Diffused soft light through fog, volumetric mist, blue-hour` | `Cool blue-grey desaturated tones` |
| 낮 전투 | `Harsh midday sun through smoke, hard directional light` | `Gritty desaturated tones, high contrast` |
| 야간/폭우 | `Practical torch lighting, rain on wet surfaces, chiaroscuro` | `Desaturated cold palette, film grain` |
| 야간/실내 | `Warm practical lantern/candle light, Rembrandt shadows` | `Rich warm amber tones, soft bokeh` |
| 달빛 | `Cool moonlight, silver-blue rim light, atmospheric haze` | `Cool silver-blue monochrome` |

---

## 시나리오 → 줄콘티 변환 워크플로

### Step 1: 시나리오 분석
```
시나리오 MD/JSON 읽기
→ 씬별 슬러그라인, 비트, 대사, 타임코드 파악
→ 감정 곡선 매핑 (긴장/이완/절정 포인트 표시)
```

### Step 2: 프롬프트 상수 정의
```
cinematic_prompt/SKILL.md 읽기
→ 프로젝트 장르에 맞는 템플릿 선택 (영화/전쟁/인물/풍경 등)
→ PROMPT_PREFIX, 인물 상수, 장소 상수, NEG 정의
→ 상수 체크리스트 검증
```

### Step 3: 씬 → 컷 분해
```
각 씬의 비트(beat)를 컷으로 분해:
  1. 비트 1개 = 컷 1~2개 (감정 밀도에 따라)
  2. 샷 타입/앵글/카메라 무브 지정
  3. 컷 길이 산정:
     - 정적 정보: 2~4초
     - 대화 리액션: 2~3초
     - 행동/이동: 3~6초
     - 감정 클라이맥스: 6~12초
  4. 씬 내 컷 길이 합계 = 씬 길이 (오차 0.3초 이내)
```

### Step 4: sketch_prompt 작성
```
각 컷에 대해:
  1. 씬의 시간대/날씨 → 조명/분위기 가이드 참조
  2. 해당 컷의 visual + dialogue → 피사체/행동 묘사
  3. 6단계 프롬프트 조립:
     ${PROMPT_PREFIX} [샷타입]. [시간대/날씨]. [피사체 상세].
     [분위기 키워드]. [조명 패턴]. [색감/필름]. ${NEG}
  4. 키비주얼 우선도 지정 (high/medium/low)
```

### Step 5: promptContext 작성
```
프로젝트 공통 참조 정보를 promptContext에 정리 (표시용):
  - era: 시대 배경 한 줄
  - culture: 복장/건축 가이드
  - negatives: 부정어 목록
```

### Step 6: 품질 검증
```
아래 체크리스트 전수 확인 후 제출:
```

---

## 금지 사항

- ❌ `storyboard sketch`, `black and white`, `pencil drawing` 등 **스케치 키워드** 사용
- ❌ 카메라/렌즈 명시 없이 `Photorealistic`만 쓰기
- ❌ 인물 재질 없이 `traditional armor`, `hanbok` 같은 추상 명사만 쓰기
- ❌ 조명/색감/필름 효과 누락
- ❌ `NOT illustration` 등 부정어 누락
- ❌ 시대/문화 맥락 없는 범용 영어 명사 (`general`, `soldier`, `fortress`)
- ❌ 비유적/문학적 표현 (`like a wave`, `as if the sky were crying`)
- ❌ 카메라 이동을 한 컷에 여러 개 중첩
- ❌ 동일 정보 반복 컷 남발
- ❌ 오디오 지시 없는 중요한 감정 컷

---

## 품질 게이트 (제출 전 체크리스트)

### 구조 품질
- [ ] 모든 씬이 컷으로 분해되었는가?
- [ ] 컷 타임 합계가 씬 타임과 일치하는가? (오차 0.3초 이내)
- [ ] 컷 간 시선/동작/색감 연속성 단서가 있는가?
- [ ] 키비주얼 `high` 컷이 합리적으로 분배되었는가?

### 프롬프트 품질 (cinematic_prompt/SKILL.md 검증 체크리스트)
- [ ] `Photorealistic` 키워드가 맨 앞에 있는가?
- [ ] 카메라/렌즈가 명시되어 있는가?
- [ ] 비유적 표현이 **없는가**?
- [ ] 피사체의 **재질/질감**이 구체적인가?
- [ ] `NOT illustration` 등 부정어가 포함되어 있는가?
- [ ] 조명의 방향/패턴이 명시되어 있는가?
- [ ] 렌즈 효과(`bokeh`, `depth of field` 등)가 있는가?
- [ ] 색감/필름 스타일이 지정되어 있는가?

---

## 실전 사례: 진주성 프로젝트

### 상수 정의
```javascript
const PROMPT_PREFIX = 'Photorealistic cinematic still photograph, 16:9, 8K. Shot on RED V-Raptor with Zeiss Supreme Prime lens. 1593, Joseon Dynasty Korea, Second Siege of Jinju Castle, Imjin War.';
const JOSEON_GENERAL = 'elderly Korean Joseon-era general in dark lacquered Korean brigandine armor (갑주), oxidized iron studs, Korean war helmet (투구) with horsehair plume, long gray beard wind-blown, deep wrinkles, weathered East Asian face';
const FORTRESS = 'Korean stone fortress Jinjuseong (진주성) with curved-roof wooden guard towers, rough-hewn granite walls moss-covered at the base';
const NEG = 'Real human faces, real armor textures, real fabric weave. NOT illustration, NOT painting, NOT anime, NOT 3D render, NOT sketch, NOT pencil drawing.';
```

### 완성 프롬프트 예시 (S1-C1)
```
Photorealistic cinematic still photograph, 16:9, 8K.
Shot on RED V-Raptor with Zeiss Supreme Prime lens.
1593, Joseon Dynasty Korea, Second Siege of Jinju Castle, Imjin War.

Extreme wide aerial drone shot.
Golden hour sunset, warm amber light casting long shadows.
Korean stone fortress Jinjuseong (진주성) beside the Namgang River,
tiny silhouette of a Korean warrior in weathered iron-plated Joseon
lamellar armor (두정갑) standing alone on the stone wall.

Dramatic Korean mountain landscape with mist rising from the river.
Volumetric light through haze, golden hour backlighting.
Desaturated warm tones, heavy film grain.
Style of 영화 명량 cinematography.

Real human faces, real armor textures, real fabric weave.
NOT illustration, NOT painting, NOT anime, NOT 3D render,
NOT sketch, NOT pencil drawing.
```

---

## 다음 단계 Handoff

- `status=approved` 또는 `locked`인 콘티만 키비주얼 스킬로 전달한다.
- `keyvisual_priority=high` 컷을 `keyvisual/SKILL.md` 우선 입력으로 전달한다.
- sketch_prompt가 이미 실사 완성형이므로, 키비주얼 단계에서 그대로 이미지 생성에 사용 가능.
- 나머지 컷은 보조 참조로 전달한다.
- 컷 수정 시 해당 컷의 하위 자산에 변경 전파 규칙(SKILL_INDEX §3)을 적용한다.

---

## 관련 스킬

- `cinematic_prompt/SKILL.md` — 실사 프롬프트 6단계 (필수 참조)
- `screenplay/SKILL.md` — 시나리오 JSON 입력 규격
- `keyvisual/SKILL.md` — 키비주얼 생성 (다음 단계)
- `videoproduction/SKILL.md` — 영상화 프롬프트 (최종 단계)

---

*Skill Version: 2.1.0*
*Updated: 2026-02-20*
*Changelog:*
*v1.0.0 — 스토리보드 & 콘티 초안*
*v1.2.0 — 시대/문화/스토리 맥락 필수 규칙 추가*
*v2.0.0 — 전면 개편: 줄콘티 전용 스킬로 전환, 스케치→실사 프롬프트 방식 변경*
*v2.1.0 — uid/parent_uid/rev/status 추가(공통 규약 적용), 승인 게이트 반영, 변경 전파 규칙 연동*
