---
name: 스토리보드 & 콘티 작성 (Storyboard & Conti)
description: 시나리오를 컷 단위 화면 설계로 분해하고 콘티 프롬프트를 생성한다. 샷 구성, 카메라 움직임, 컷 길이, 오디오 지시가 포함된 제작용 스토리보드가 필요할 때 사용.
---

# Storyboard and Conti

## 목표
시나리오 씬을 편집 가능한 컷 리스트와 콘티 프롬프트로 변환한다.

## 용어 정의
- Scene: 장소/시간 단위 이야기 구간
- Cut: 연속 촬영/연속 편집 단위의 시간 구간
- Frame: 단일 정지 이미지

주의:
- Cut은 Frame과 다르다. `1컷 = 1프레임`으로 취급하지 않는다.

## 입력 계약
필수 입력:
- 승인된 시나리오 JSON (`scenes[]`, `beats[]`, 타임코드 포함)

선택 입력:
- 콘티 스타일(러프 스케치/그레이스케일/컬러 블록)
- 컷 밀도(느림/보통/빠름)

## 출력 계약
항상 아래 2가지를 함께 출력한다.

1) 읽기용 스토리보드
- 씬별 컷 리스트
- 컷별 샷 타입/앵글/카메라 이동/설명/대사/SFX/BGM/전환
- 콘티 생성 프롬프트

2) 기계 처리용 JSON
```json
{
  "title": "",
  "storyboard": [
    {
      "scene_id": "S1",
      "scene_tc_start": "00:00.0",
      "scene_tc_end": "00:18.5",
      "cuts": [
        {
          "cut_id": "S1-C1",
          "tc_start": "00:00.0",
          "tc_end": "00:04.0",
          "duration_sec": 4.0,
          "shot": "WS",
          "angle": "Eye Level",
          "camera_move": "TILT DOWN",
          "visual": "",
          "dialogue": "",
          "sfx": "",
          "bgm": "",
          "transition_out": "CUT TO",
          "continuity_out": "",
          "sketch_prompt": "",
          "keyvisual_priority": "high"
        }
      ]
    }
  ],
  "assumptions": []
}
```

## 컷 분해 규칙
- 컷 ID는 `S#-C#` 순차 부여한다.
- 컷 하나에 핵심 행동 하나를 배치한다.
- 컷당 기본 길이:
  - 정적 정보 전달: 2~4초
  - 대화 리액션: 2~3초
  - 행동/이동: 3~6초
- 씬 내 컷 길이 합계는 씬 길이와 오차 0.3초 이내로 맞춘다.

## 콘티 프롬프트 규칙
프롬프트 구성:
`[스타일] + [샷/앵글] + [피사체] + [행동] + [환경] + [조명] + [무드] + [카메라 이동]`

기본 스타일 문구:
`storyboard sketch, black and white rough drawing, cinematic composition, minimal shading, 16:9`

## 작성 워크플로
1. 시나리오 씬을 비트 단위로 분석한다.
2. 비트를 컷으로 변환하고 샷/앵글/무브를 지정한다.
3. 컷 길이와 씬 타임코드를 맞춘다.
4. 컷별 오디오와 전환을 채운다.
5. 콘티 프롬프트를 작성한다.
6. 키비주얼 우선 컷(`keyvisual_priority=high`)을 표시한다.

## 품질 게이트
- 모든 씬이 컷으로 분해되었는가?
- 컷 타임 합계가 씬 타임과 일치하는가?
- 컷 간 시선/동작/색감 연속성 단서가 있는가?
- 콘티 프롬프트만으로 구도 복원이 가능한가?
- 다음 단계(키비주얼)가 `high` 컷 중심으로 시작 가능한가?

## 금지
- 카메라 이동을 한 컷에 여러 개 중첩
- 동일 정보 반복 컷 남발
- 오디오 지시 없는 중요한 감정 컷

## 다음 단계 Handoff
- `keyvisual_priority=high` 컷을 키비주얼 스킬의 우선 입력으로 전달한다.
- 나머지 컷은 보조 참조로 전달한다.

*Skill Version: 1.1.0*
*Updated: 2026-02-07*
