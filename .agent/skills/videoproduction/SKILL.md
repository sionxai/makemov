---
name: 영상화 프롬프트 작성 (Video Production Prompts)
description: 스토리보드 컷과 승인된 키비주얼을 기반으로 플랫폼별 영상 생성 프롬프트를 작성한다. QA 루프(qa_flags, retry_policy), 플랫폼별 검증, 컷 연속성, 오디오 계획까지 포함한 실행 패키지.
---

# Video Production Prompts v2.0

## 목표
컷 단위 영상 생성 프롬프트를 플랫폼별 실행 형식으로 변환하고, **결과물 검증/재시도 흐름**까지 관리한다.

> 📌 공통 규약: `SKILL_INDEX.md` §1(ID체계) §2(승인기계) §3(변경전파) 참조.

---

## 입력 계약

### 필수 입력
- 줄콘티 JSON (`status=approved/locked`, `cuts[]`, `duration_sec`, `camera_move`)
- 승인된 키비주얼 JSON (`status=approved/locked`, `assets[]`)

### 선택 입력 (강화)
- 프리비즈 시퀀스 JSON — 타이밍/리듬 검증 결과 반영
- 플랫폼 우선순위 (Sora/Runway/Pika/Kling/Veo)
- 컷별 제작 예산/속도 우선순위
- 플랫폼 capability matrix (실행 시점 기준)

---

## 출력 계약

항상 아래 2가지를 함께 출력한다.

### 1) 읽기용 컷 프롬프트 패키지
- 컷 ID, 플랫폼 태그, 프롬프트, 길이/비율 파라미터
- 컷 연결 전략 (action/eyeline/color/time)
- 오디오 레이어 계획 (BGM/SFX/VO)
- **QA 플래그 및 재시도 정책**

### 2) 기계 처리용 JSON

```json
{
  "uid": "<UUIDv7>",
  "parent_uid": "<conti.uid 또는 previs.uid>",
  "rev": "r1",
  "status": "draft",
  "video_prompts": [
    {
      "cut_id": "S1-C1",
      "uid": "<UUIDv7>",
      "parent_uid": "<asset.uid>",
      "rev": "r1",
      "status": "draft",
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
        "kling": "",
        "veo": ""
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
      },
      "qa": {
        "qa_flags": [],
        "quality_score": null,
        "motion_quality": null,
        "character_consistency": null,
        "style_consistency": null,
        "timing_accuracy": null,
        "qa_notes": ""
      },
      "retry_policy": {
        "max_retries": 3,
        "retry_count": 0,
        "retry_history": [],
        "fallback_platform": "",
        "escalation_action": "prompt_rewrite"
      },
      "rejection_reason": "",
      "approved_at": "",
      "approved_by": "",
      "output_url": ""
    }
  ],
  "assumptions": []
}
```

---

## 🔄 QA 루프 (Quality Assurance Loop) ★

### 3.1 QA 플래그 (qa_flags)

생성 결과물에 대해 자동/수동으로 다음 플래그를 부여한다:

| 플래그 | 의미 | 조치 |
|--------|------|------|
| `motion_artifact` | 부자연스러운 움직임 (워핑, 글리치) | 재시도 또는 파라미터 조정 |
| `character_drift` | 인물 외형이 키비주얼과 불일치 | 참조 이미지 강화 또는 seed 조정 |
| `style_mismatch` | 색감/조명이 프로젝트 톤과 불일치 | 프롬프트 색감 키워드 보정 |
| `timing_off` | 타이밍이 콘티 지정 길이와 불일치 | duration 파라미터 재조정 |
| `continuity_break` | 이전/다음 컷과 시각적 불연속 | 연결 컷 함께 재생성 |
| `prompt_hallucination` | 프롬프트에 없는 요소가 생성됨 | 부정어(negative) 보강 |
| `low_resolution` | 해상도/품질 미달 | 업스케일 또는 재생성 |
| `audio_mismatch` | 오디오 계획과 영상이 불일치 | 영상 재편집 또는 오디오 조정 |

### 3.2 재시도 정책 (retry_policy)

```
1회차: seed 변경만
2회차: 프롬프트 미세 수정 (키워드 1~2개 교체)
3회차: 프롬프트 구조 변경 또는 플랫폼 교체 (fallback_platform)
3회 초과: escalation_action 수행 (prompt_rewrite / platform_change / manual_review)
```

### 3.3 QA 점수 (quality_score)

자산별 품질을 5점 척도로 평가한다:

| 점수 | 의미 | 조치 |
|------|------|------|
| 5 | 완벽 | Locked 가능 |
| 4 | 우수 | Approved, 미세 보정 선택적 |
| 3 | 보통 | Approved, 보정 권장 |
| 2 | 미달 | Rejected, 재시도 필수 |
| 1 | 불가 | Rejected, 프롬프트 재작성 |

---

## 🔌 플랫폼 정책 (강화)

### 4.1 원칙
- 플랫폼 수치 스펙(길이/해상도/모델)은 자주 변경된다.
- 고정 수치 하드코딩 대신, **실행 시점 공식 문서를 확인**하고 `assumptions`에 기준일을 기록한다.
- 이 문서는 구조와 변환 규칙을 정의한다.

### 4.2 플랫폼 Capability Matrix (실행 시점 확인)

| 항목 | 확인 사항 |
|------|----------|
| 최대 길이 | 플랫폼별 1회 생성 최대 초 |
| 해상도 | 지원 해상도/비율 |
| 참조 이미지 | 이미지→영상(i2v) 지원 여부 |
| 카메라 컨트롤 | 카메라 이동 지시 정확도 |
| 인물 일관성 | 참조 이미지 기반 인물 유지 정확도 |
| 비용 | 크레딧/비용 단위 |
| API 지원 | 자동화 가능 여부 |

> ⚠️ 위 표의 **구체적 수치**는 기록하지 않는다. 실행 시점에 공식 문서를 확인한다.

---

## 변환 규칙

- `prompt_base`를 먼저 작성하고 플랫폼별 문체로 어댑트한다.
- 컷당 핵심 동작은 1개로 제한한다.
- 카메라 동작은 스토리보드 `camera_move`를 자연어로 풀어쓴다.
- 인물 컷은 반드시 `reference_assets`를 1개 이상 연결한다.
- 프리비즈 시퀀스가 있으면 타이밍/리듬 피드백을 반영한다.

---

## 작성 워크플로

1. 컷별 목적과 난이도로 플랫폼을 매핑한다.
2. 키비주얼 앵커를 사용해 `prompt_base`를 작성한다.
3. 플랫폼별 프롬프트를 생성한다.
4. 컷 간 연속성 전략을 지정한다.
5. 오디오 레이어 계획을 컷별로 채운다.
6. **QA 루프**: 생성 → 검증 → 승인/반려 → 재시도.
7. 검수 후 실행 패키지(JSON)를 확정한다.

---

## 품질 게이트 (강화)

### 구조 체크
- [ ] 모든 컷에 플랫폼 프롬프트가 존재하는가?
- [ ] duration_sec와 seconds 파라미터가 일치하는가?
- [ ] reference_assets 없이 인물 컷이 생성되지 않았는가?
- [ ] 컷 간 연결 전략이 명시되어 있는가?
- [ ] 실행자가 복붙만으로 렌더를 시작할 수 있는가?

### QA 체크
- [ ] 모든 생성 결과에 qa_flags가 기록되었는가?
- [ ] quality_score 2 이하인 자산이 승인되지 않았는가?
- [ ] retry_count가 max_retries를 초과한 자산에 escalation_action이 수행되었는가?
- [ ] character_consistency/style_consistency가 확인되었는가?

### 파이프라인 체크
- [ ] 모든 승인 자산의 uid가 parent_uid 그래프에 연결되었는가?
- [ ] assumptions에 플랫폼 스펙 기준일이 기록되었는가?

---

## 금지

- 스토리보드와 불일치한 카메라/동작 추가
- 한 컷에 다중 핵심 액션 과적재
- 플랫폼별 제약 무시한 파라미터 제시
- QA 없이 자산 승인
- qa_flags 미기록 상태로 다음 단계 전달

---

## 다음 단계 Handoff

- `status=approved` 또는 `locked`인 출력 JSON을 렌더 실행 체크리스트와 함께 전달한다.
- 실패한 컷은 해당 `cut_id`만 단일 수정한다.
- 수정 시 `rev`를 증가시키고, 변경 전파 규칙(SKILL_INDEX §3)을 확인한다.

---

## 관련 스킬

- `storyboard/SKILL.md` — 줄콘티 입력 규격
- `keyvisual/SKILL.md` — 키비주얼 자산 (필수 참조)
- `previs/SKILL.md` — 프리비즈 (선택 입력)
- `cinematic_prompt/SKILL.md` — 프롬프트 품질 기준

---

*Skill Version: 2.0.0*
*Updated: 2026-02-20*
*Changelog:*
*v1.0.0 — 영상화 초안*
*v1.1.0 — 플랫폼 정책, 변환 규칙 추가*
*v2.0.0 — 전면 개편: QA 루프(qa_flags/retry_policy/quality_score) 추가, 플랫폼 capability matrix 구조화, uid/parent_uid/rev/status 공통 규약 적용, 프리비즈 입력 연동, Veo 플랫폼 추가*
