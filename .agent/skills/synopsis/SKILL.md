---
name: 시놉시스 작성 (Synopsis Writing)
description: 아이디어를 영상 제작의 기준 시놉시스로 구조화한다. 로그라인, 테마, 인물, 핵심 장면, 비주얼 톤을 정리하거나 시나리오 입력용 기획 문서를 만들어야 할 때 사용.
---

# Synopsis Writing

## 목표
아이디어를 후속 단계(시나리오/스토리보드)에서 바로 사용할 수 있는 시놉시스로 확정한다.

## 입력 계약
필수 입력:
- 핵심 아이디어(1~3문장)

선택 입력(없으면 합리적으로 제안):
- 장르
- 타깃 러닝타임
- 톤/무드
- 타깃 오디언스
- 레퍼런스
- 제작 제약(예산, 로케이션, AI/실사 비율)

입력 보완 규칙:
- 결과 품질에 치명적인 정보만 질문한다.
- 치명 정보가 아니면 가정하고, 결과 하단에 가정 목록을 명시한다.

## 출력 계약
항상 아래 2가지를 함께 출력한다.

1) 읽기용 시놉시스
- 기본 정보(장르, 러닝타임, 톤/무드, 타깃 오디언스, 형식)
- 로그라인(1~2문장)
- 테마
- 시놉시스 본문(Setup -> Confrontation -> Crisis -> Resolution)
- 주요 인물(외형/성격/동기/아크)
- 비주얼 톤 & 미장센
- 사운드 방향
- 핵심 장면 리스트(3~7개)

2) 기계 처리용 JSON
```json
{
  "title": "",
  "basic_info": {
    "genre": "",
    "runtime_sec": 0,
    "tone_mood": "",
    "target_audience": "",
    "format": ""
  },
  "logline": "",
  "theme": "",
  "synopsis": {
    "setup": "",
    "confrontation": "",
    "crisis": "",
    "resolution": ""
  },
  "characters": [
    {
      "name": "",
      "role": "",
      "appearance": "",
      "personality": "",
      "motivation": "",
      "arc": ""
    }
  ],
  "visual_tone": {
    "palette": "",
    "lighting": "",
    "camera_style": "",
    "references": []
  },
  "sound_direction": {
    "bgm_tone": "",
    "sfx_keywords": [],
    "narration": "none"
  },
  "core_scenes": [
    {
      "scene_id": "S1",
      "title": "",
      "summary": "",
      "emotion_goal": ""
    }
  ],
  "assumptions": []
}
```

## 작성 워크플로
1. 입력을 구조화하고 빈 항목을 식별한다.
2. 러닝타임에 맞는 서사 밀도(씬 수, 갈등 강도)를 먼저 결정한다.
3. 로그라인과 테마를 먼저 확정한다.
4. 4단 구조(Setup/Confrontation/Crisis/Resolution)로 본문을 작성한다.
5. 인물/비주얼/사운드/핵심 장면을 연결해 후속 단계 입력을 완성한다.
6. 체크리스트로 검수 후 최종본과 JSON을 함께 제출한다.

## 결정 규칙
- scene_id는 `S1`부터 순차 증가시킨다.
- `runtime_sec`는 가능하면 숫자로 변환한다(예: 3분 -> 180).
- 레퍼런스가 불명확하면 고유명사 남발 대신 톤/질감/카메라 언어로 대체한다.

## 품질 게이트
- 로그라인만 읽어도 갈등과 목표가 보이는가?
- 핵심 장면 3~7개가 이야기 진행에 직접 기여하는가?
- 모든 문장이 촬영 가능한 시각 정보 중심인가?
- 인물 아크가 시작/중간/끝에서 변화를 보이는가?
- 다음 단계(시나리오)가 JSON만으로 시작 가능한가?

## 금지
- 내면 설명만 있고 행동 근거가 없는 문장
- 톤이 섞여 일관성이 깨지는 설정
- core_scenes 없이 추상 요약만 제시하는 결과

## 다음 단계 Handoff
- 이 스킬의 JSON 전체를 시나리오 스킬 입력으로 넘긴다.
- 추가 피드백이 있으면 `assumptions`부터 우선 수정한다.

*Skill Version: 1.1.0*
*Updated: 2026-02-07*
