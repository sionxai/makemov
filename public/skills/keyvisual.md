---
name: 키비주얼 제작 (Key Visual Production)
description: 스토리보드의 핵심 컷을 고품질 이미지 자산으로 변환한다. 캐릭터/장면/환경 키비주얼을 일관된 스타일과 재생성 가능한 파라미터로 확정해야 할 때 사용.
---

# Key Visual Production

## 목표
스토리보드 핵심 컷을 영상 제작 기준 이미지 세트로 확정한다.

## 입력 계약
필수 입력:
- 스토리보드 JSON (`cuts[]`, `keyvisual_priority` 포함)
- 시놉시스 JSON (`visual_tone`, `characters`)

선택 입력:
- 툴 선호(Midjourney, OpenAI Images, Runway 등)
- 우선 산출물 유형(인물/장면/환경)

## 출력 계약
항상 아래 2가지를 함께 출력한다.

1) 읽기용 자산 목록
- 인물 키비주얼(풀바디/클로즈업/감정)
- 장면 키비주얼(에스타블리싱/핵심 프레이밍)
- 환경 키비주얼(시간대 변화)

2) 기계 처리용 JSON
```json
{
  "style_anchor": "",
  "character_anchors": [
    {
      "character": "",
      "anchor_text": ""
    }
  ],
  "assets": [
    {
      "asset_id": "KV-S1-C1-01",
      "type": "scene",
      "source_cut_ids": ["S1-C1"],
      "prompt": "",
      "negative_prompt": "",
      "model_hint": "",
      "params": {
        "aspect_ratio": "16:9",
        "seed": 0,
        "quality": "high"
      },
      "status": "draft",
      "image_url": ""
    }
  ],
  "assumptions": []
}
```

## 공통 파라미터 규칙
- 모든 자산은 `asset_id`, `source_cut_ids`, `prompt`, `seed`를 반드시 기록한다.
- 앵커 적용 순서:
  1) style_anchor
  2) character_anchor (인물 컷만)
  3) 컷 고유 동작/구도
- seed를 고정하지 못하는 도구는 `seed=0`으로 두고 이유를 기록한다.

## 툴 어댑터 규칙
- 공통 프롬프트를 먼저 작성하고, 툴별 문법은 마지막에 변환한다.
- Midjourney: 종횡비/seed 파라미터를 suffix로 추가한다.
- OpenAI Images: 종횡비를 지원 크기(size)로 매핑해 기록한다.
- Runway Image: 참조 이미지 ID와 motion-free 정지 이미지 목적을 명시한다.

## 작성 워크플로
1. `keyvisual_priority=high` 컷부터 우선순위를 정한다.
2. 프로젝트 style_anchor를 1회 확정한다.
3. 인물별 character_anchor를 작성한다.
4. 자산 유형(인물/장면/환경)별 프롬프트를 작성한다.
5. 결과를 검수하고 필요시 단일 변수만 바꿔 재생성한다.
6. 승인본은 `status=approved`로 고정한다.

## 품질 게이트
- 동일 인물이 컷 간 동일 인물로 인식되는가?
- 스타일/색감/조명이 프로젝트 톤과 일치하는가?
- 프롬프트와 파라미터만으로 재생성 가능한가?
- 모든 승인 자산이 source_cut과 연결되는가?
- 다음 단계(영상화)가 승인 자산만으로 시작 가능한가?

## 금지
- 툴별 문법을 공통 프롬프트 본문에 섞어 쓰기
- 승인 자산인데 seed/파라미터 누락
- source_cut_ids 없는 고아 자산 생성

## 다음 단계 Handoff
- `status=approved` 자산만 영상화 스킬에 전달한다.
- 컷당 최소 1개 참조 자산을 보장한다.

*Skill Version: 1.1.0*
*Updated: 2026-02-07*
