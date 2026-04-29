---
name: 프로젝트 순차 제작 프로토콜
description: 사용자 제공 시놉시스에서 시작해 캐릭터 시트, 시나리오, 줄콘티, 스토리보드, 키비주얼, 프로덕션 프롬프트까지 한 프로젝트 안에서 순차 제작·검증·저장하는 오케스트레이션 규칙.
---

# Project Sequential Production Protocol v1.0

## 목적
사용자 제공 시놉시스를 기준으로 makemov 프로젝트를 **한 단계씩 이전 산출물을 참조하며** 완성한다.

이 스킬은 개별 단계 스킬보다 우선하는 오케스트레이션 규칙이다. 개별 단계 상세 규칙은 아래를 참조한다.

- 시놉시스: `../synopsis/SKILL.md`
- 시나리오: `../screenplay/SKILL.md`
- 줄콘티/스토리보드 설계: `../storyboard/SKILL.md`
- 키비주얼: `../keyvisual/SKILL.md`
- 시네마틱 프롬프트: `../cinematic_prompt/SKILL.md`

## 절대 원칙

1. **순서 보존**
   - 산출물은 항상 `S1-C1`부터 마지막 컷까지 프로젝트 타임라인 순서로 만든다.
   - `keyvisual_priority=high`는 우선 검토/강조 기준일 뿐, 앞 단계 컷을 생략하거나 순서를 바꾸는 근거가 아니다.

2. **이전 단계 참조**
   - 캐릭터 시트는 시놉시스의 인물 설명을 참조한다.
   - 시나리오는 시놉시스와 캐릭터 시트를 참조한다.
   - 줄콘티는 시나리오와 캐릭터 시트를 참조한다.
   - 스토리보드는 줄콘티의 모든 컷을 참조한다.
   - 키비주얼은 스토리보드, 캐릭터 시트, 시놉시스의 장르/톤을 참조한다.

3. **출력 단위 분리**
   - 캐릭터 시트, 스토리보드, 키비주얼, 최종 포스터는 서로 다른 산출물이다.
   - 세로형 광고 포맷이 9:16이어도, 프로젝트 관리용 스토리보드/키비주얼은 기본적으로 16:9 컷 이미지로 만든다.
   - 9:16 이미지는 별도 `delivery` 또는 `poster/endcard` 산출물로만 만든다.

4. **완료 기준 엄격 적용**
   - “완료”라고 말하기 전에 Firestore 문서와 Storage URL을 검증한다.
   - 일부 대표 컷만 만든 상태를 전체 완료로 보고하지 않는다.

## 단계별 산출물 계약

### 1. 프로젝트 생성

Firestore 문서는 클라이언트 기본 스키마와 동일한 필드를 가져야 한다.

필수 필드:
- `title`
- `description`
- `status`
- `createdAt`
- `updatedAt`
- `synopsis`
- `characterSheets`
- `characterSheetsUpdatedAt`
- `screenplay`
- `conti`
- `storyboard`
- `keyvisuals`
- `productionPrompts`

`synopsis`, `screenplay`, `conti` 섹션에는 최소한 아래 필드가 있어야 한다.

- `status`
- `sourcePrompt`
- `options`
- `generation`
- `upstreamChanged`
- `updatedAt`

### 2. 시놉시스 구축

입력:
- 사용자 제공 시놉시스 원문

출력:
- `synopsis.structured`
- `synopsis.content`
- `status=approved` 또는 사용자 검토 전이면 `review`

필수 포함:
- 제목
- 로그라인
- 주제 한 문장
- 장르/톤/러닝타임/포맷
- 인물 목록
- 시각 톤
- 사운드 톤
- 핵심 장면

### 3. 캐릭터 시트

입력:
- 승인된 시놉시스

출력:
- `characterSheets[]`
- 인물별 `sheetImageUrl`

이미지 규칙:
- **인물별 1장씩 생성한다.**
- 한 장에 모든 인물을 몰아넣지 않는다.
- 기본 비율은 **16:9 landscape**.
- 각 인물 시트는 같은 인물의 기준 이미지로 쓸 수 있어야 한다.
- 한 인물 시트 안에는 전신 정면, 전신 후면, 얼굴 정면, 얼굴 3/4 뷰를 포함할 수 있다.

금지:
- 그룹 캐릭터 시트를 개별 캐릭터 시트로 대체하지 않는다.
- 인물별 `sheetImageUrl`이 같은 그룹 이미지 URL만 가리키는 상태를 완료로 보지 않는다.

### 4. 시나리오

입력:
- 승인된 시놉시스
- 인물별 캐릭터 시트

출력:
- `screenplay.scenes[]`

규칙:
- 사용자가 지정한 러닝타임과 씬 수를 우선한다.
- 각 씬은 `scene_id`를 `S1`, `S2` 순서로 가진다.
- 대사, 액션, 연출 노트가 있어야 한다.
- 캐릭터의 의상/감정/역할은 캐릭터 시트와 충돌하면 안 된다.

### 5. 줄콘티

입력:
- 승인된 시나리오
- 인물별 캐릭터 시트
- 시놉시스의 장르/톤/시각 톤

출력:
- `conti.scenes[].cuts[]`

규칙:
- 컷 ID는 `S1-C1`, `S1-C2`처럼 씬 순서와 컷 순서를 보존한다.
- 모든 컷은 `tc_start`, `tc_end`, `duration_sec`, `shot`, `angle`, `camera_move`, `visual`, `dialogue`, `sfx`, `bgm`, `transition_out`, `sketch_prompt`, `keyvisual_priority`를 가진다.
- `sketch_prompt`는 다음 단계 이미지 생성의 직접 입력으로 쓸 수 있을 정도로 구체적이어야 한다.

### 6. 스토리보드

입력:
- 승인된 줄콘티 전체 컷

출력:
- `storyboard.frames[]`
- `storyboard.sketches`
- 각 컷별 `imageUrl`

이미지 규칙:
- **모든 컷을 만든다.**
- 기본 비율은 **16:9 landscape**.
- 최종 저장 단위는 컷별 단일 이미지다.
- 제작 편의를 위해 2패널/시트 이미지를 임시 생성할 수는 있지만, Firestore에 저장할 때는 컷별 단일 이미지로 분리해야 한다.

완료 조건:
- `storyboard.frames.length === conti cut count`
- `Object.values(storyboard.sketches).filter(x => x.imageUrl).length === conti cut count`
- 모든 스토리보드 이미지 URL이 HTTP 200으로 접근 가능해야 한다.

### 7. 키비주얼

입력:
- 승인된 스토리보드 컷 이미지
- 인물별 캐릭터 시트
- 시놉시스 장르/톤/시각 톤

출력:
- `keyvisuals[]`

이미지 규칙:
- 기본은 **모든 컷에 대해 S1-C1부터 순차 생성**한다.
- 별도 합의가 있을 때만 high-priority 컷 부분 생성으로 축소한다.
- 기본 비율은 **16:9 landscape**.
- 9:16 세로 이미지는 `delivery` 또는 `poster/endcard`로 별도 표기한다.

필수 메타데이터:
- `id`
- `title`
- `scene`
- `cutId`
- `prompt`
- `imageUrl`
- `imagePath`
- `source`
- `sourceSketchUrl`
- `model`
- `imageSize`
- `generatedAt`
- `createdAt`

완료 조건:
- 기본 모드에서는 `keyvisuals.length === conti cut count`
- `keyvisuals` 정렬은 conti 컷 순서와 같아야 한다.
- 모든 키비주얼 이미지 URL이 HTTP 200으로 접근 가능해야 한다.

### 8. 프로덕션 프롬프트

입력:
- 줄콘티
- 스토리보드
- 키비주얼

출력:
- `productionPrompts[]`

규칙:
- 컷별 영상 생성 프롬프트를 만든다.
- 기본 개수는 conti cut count와 같아야 한다.
- 각 프롬프트는 `scene`, `cutId`, `title`, `type`, `prompt`를 포함한다.

## 이미지 생성·업로드 프로토콜

### Codex 직접 생성 방식

사용자가 “여기서 이미지 생성해서 업로드”를 요청하면 다음 방식을 쓴다.

1. Codex 이미지 생성 도구로 이미지를 생성한다.
2. 원본은 `.codex/generated_images/...`에 남긴다.
3. 필요한 경우 작업용 사본/crop만 `/tmp`에 만든다.
4. Firebase Admin SDK로 Storage에 업로드한다.
5. Firestore 문서에는 Storage 다운로드 URL을 저장한다.

금지:
- 이 방식에서 앱 서버에 OpenAI API 키를 요구하지 않는다.
- Gemini 이미지 경로와 섞지 않는다.
- 임시 대표 이미지만 넣고 완료로 보고하지 않는다.

### Firebase Admin 보안

- 서비스 계정 키는 `.agent/secrets/` 아래에만 둔다.
- `.agent/secrets/`는 반드시 `.gitignore`에 포함한다.
- 키가 채팅이나 로그에 노출되면 작업 후 Firebase Console에서 폐기/재발급한다.
- 비밀키 파일은 커밋하지 않는다.

## 완료 전 검증 체크리스트

아래 체크를 통과하기 전에는 완료로 보고하지 않는다.

- [ ] Firestore 프로젝트 문서가 존재한다.
- [ ] `characterSheets.length`가 시놉시스 주요 인물 수와 같다.
- [ ] 모든 캐릭터 시트에 개별 `sheetImageUrl`이 있다.
- [ ] `screenplay.scenes`가 계획 씬 수와 같다.
- [ ] conti 컷 수가 계획과 일치한다.
- [ ] `storyboard.frames.length === conti cut count`
- [ ] 스토리보드 `imageUrl` 개수가 conti cut count와 같다.
- [ ] 기본 모드에서는 `keyvisuals.length === conti cut count`
- [ ] 키비주얼 순서가 `S1-C1`부터 conti 순서와 같다.
- [ ] `productionPrompts.length === conti cut count`
- [ ] 모든 Storage 이미지 URL이 HTTP 200이다.
- [ ] 16:9/9:16 산출물 역할이 섞이지 않았다.

## 실패 사례 방지 규칙

다음 상태는 완료가 아니다.

- 키비주얼이 하이라이트 컷 일부만 있는 상태
- 키비주얼이 S1부터 순서대로 정렬되지 않은 상태
- 스토리보드에 프레임은 있지만 `imageUrl`이 없는 상태
- 캐릭터 시트가 그룹 이미지 1장으로만 대체된 상태
- 9:16 최종 광고 포스터를 16:9 컷 키비주얼로 잘못 저장한 상태
- 이미지 URL 검증 없이 완료 보고한 상태

## Review Finding 대응 규칙

### Finding 1: 키비주얼 생성 연결

- 앱 내부 생성 경로를 쓸 때는 키비주얼 페이지가 생성 결과를 `project.keyvisuals`에 저장해야 한다.
- Codex 직접 생성 경로를 쓸 때는 생성 이미지를 Admin 업로드 후 `project.keyvisuals`에 저장한다.
- 어느 경로든 수동 URL만 남기는 상태를 완료로 보지 않는다.

### Finding 2: 프로젝트 기본 스키마

- 클라이언트와 서버 API의 프로젝트 기본 스키마가 달라지면 안 된다.
- 새 프로젝트 생성 시 항상 전체 기본 스키마를 사용한다.

### Finding 3: 변경 추적

- 시놉시스/시나리오/줄콘티/스토리보드가 바뀌면 하위 산출물에 `upstreamChanged`를 남겨야 한다.
- 변경 영향은 줄콘티 이후 스토리보드, 키비주얼, 프로덕션 프롬프트까지 전파되어야 한다.
