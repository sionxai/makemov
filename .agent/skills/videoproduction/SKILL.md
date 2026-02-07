---
name: 영상화 프롬프트 작성 (Video Production Prompts)
description: 스토리보드 컷과 승인된 키비주얼을 기반으로 플랫폼별 영상 생성 프롬프트를 작성한다. 컷별 프롬프트, 파라미터, 연속성, 오디오 계획까지 포함한 실행 패키지가 필요할 때 사용.
---

# Video Production Prompts

## 목표
컷 단위 영상 생성 프롬프트를 플랫폼별 실행 형식으로 변환한다.

## 입력 계약
필수 입력:
- 스토리보드 JSON (`cuts[]`, `duration_sec`, `camera_move`)
- 승인된 키비주얼 JSON (`assets[]`, `status=approved`)

선택 입력:
- 플랫폼 우선순위(Sora/Runway/Pika/Kling)
- 컷별 제작 예산/속도 우선순위

## 출력 계약
항상 아래 2가지를 함께 출력한다.

1) 읽기용 컷 프롬프트 패키지
- 컷 ID, 플랫폼 태그, 프롬프트, 길이/비율 파라미터
- 컷 연결 전략(action/eyeline/color/time)
- 오디오 레이어 계획(BGM/SFX/VO)

2) 기계 처리용 JSON
```json
{
  "video_prompts": [
    {
      "cut_id": "S1-C1",
      "duration_sec": 4,
      "reference_assets": ["KV-S1-C1-01"],
      "prompt_base": {
        "subject": "",
        "action": "",
        "environment": "",
        "lighting": "",
        "camera": "",
        "mood": "",
        "constraints": []
      },
      "platform_prompts": {
        "sora": "",
        "runway": "",
        "pika": "",
        "kling": ""
      },
      "params": {
        "aspect_ratio": "16:9",
        "seconds": "4",
        "seed": 0
      },
      "continuity": {
        "in": "",
        "out": "",
        "match_to_next": "action"
      },
      "audio_plan": {
        "bgm": "",
        "sfx": [],
        "vo": ""
      }
    }
  ],
  "assumptions": []
}
```

## 플랫폼 정책
- 플랫폼 수치 스펙(길이/해상도/모델)은 자주 변경된다.
- 고정 수치 하드코딩 대신, 실행 시점 공식 문서를 확인하고 `assumptions`에 기준일을 기록한다.
- 이 문서는 구조와 변환 규칙을 정의한다.

## 변환 규칙
- `prompt_base`를 먼저 작성하고 플랫폼별 문체로 어댑트한다.
- 컷당 핵심 동작은 1개로 제한한다.
- 카메라 동작은 스토리보드 `camera_move`를 자연어로 풀어쓴다.
- 인물 컷은 반드시 `reference_assets`를 1개 이상 연결한다.

## 작성 워크플로
1. 컷별 목적과 난이도로 플랫폼을 매핑한다.
2. 키비주얼 앵커를 사용해 `prompt_base`를 작성한다.
3. 플랫폼별 프롬프트를 생성한다.
4. 컷 간 연속성 전략을 지정한다.
5. 오디오 레이어 계획을 컷별로 채운다.
6. 검수 후 실행 패키지(JSON)를 확정한다.

## 품질 게이트
- 모든 컷에 플랫폼 프롬프트가 존재하는가?
- duration_sec와 seconds 파라미터가 일치하는가?
- reference_assets 없이 인물 컷이 생성되지 않았는가?
- 컷 간 연결 전략이 명시되어 있는가?
- 실행자가 복붙만으로 렌더를 시작할 수 있는가?

## 금지
- 스토리보드와 불일치한 카메라/동작 추가
- 한 컷에 다중 핵심 액션 과적재
- 플랫폼별 제약 무시한 파라미터 제시

## 다음 단계 Handoff
- 출력 JSON을 렌더 실행 체크리스트와 함께 전달한다.
- 실패한 컷은 해당 `cut_id`만 단일 수정한다.

*Skill Version: 1.1.0*
*Updated: 2026-02-07*
