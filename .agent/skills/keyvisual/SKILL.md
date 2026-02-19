---
name: 키비주얼 제작 (Key Visual Production)
description: 스토리보드의 핵심 컷을 고품질 이미지 자산으로 변환한다. 앵커 잠금(룩 표준화), 승인 루프(Draft→Locked), 생성기별 어댑트, 일관성 QA를 포함.
---

# Key Visual Production v2.0

## 목표
스토리보드 핵심 컷을 **프로젝트 일관성이 보장된** 영상 제작 기준 이미지 세트로 확정한다.

> ⚠️ **핵심 원칙**: 콘티 sketch_prompt는 "의도(intent)"이다.
> 키비주얼은 그 의도를 **일관된 시각 자산으로 기준화(canonicalize)**하는 단계이다.
> 단순 복사가 아니라, **앵커 잠금 → 승인 루프 → 생성기 어댑트** 과정을 거친다.

> 📌 공통 규약: `SKILL_INDEX.md` §1(ID체계) §2(승인기계) §3(변경전파) 참조.

---

## 입력 계약

### 필수 입력
- 줄콘티 JSON (`status=approved/locked`, `cuts[]`, `keyvisual_priority`, `sketch_prompt` 포함)
- 시놉시스 JSON (`status=approved/locked`, `visualTone`, `characters`)

### 선택 입력
- 생성 도구 선호 (Midjourney, OpenAI Images, Runway, FLUX 등)
- 우선 산출물 유형 (인물/장면/환경)
- 참조 이미지 (이전 프로젝트 키비주얼, 레퍼런스 아트 등)

---

## 출력 계약

항상 아래 2가지를 함께 출력한다.

### 1) 읽기용 자산 목록
- 인물 키비주얼 (풀바디/클로즈업/감정)
- 장면 키비주얼 (에스타블리싱/핵심 프레이밍)
- 환경 키비주얼 (시간대 변화)

### 2) 기계 처리용 JSON

```json
{
  "uid": "<UUIDv7>",
  "parent_uid": "<conti.uid>",
  "rev": "r1",
  "status": "draft",
  "style_anchor": "",
  "character_anchors": [
    {
      "character": "",
      "anchor_text": "",
      "canonical_image_url": "",
      "consistency_params": {
        "face_seed": 0,
        "style_weight": 0.8,
        "reference_strength": 0.7
      }
    }
  ],
  "assets": [
    {
      "asset_id": "KV-S1-C1-01",
      "uid": "<UUIDv7>",
      "parent_uid": "<cut.uid>",
      "rev": "r1",
      "status": "draft",
      "type": "scene",
      "source_cut_ids": ["S1-C1"],
      "prompt": "",
      "negative_prompt": "",
      "model_hint": "",
      "generator": "",
      "generator_version": "",
      "params": {
        "aspect_ratio": "16:9",
        "seed": 0,
        "quality": "high",
        "style_reference": "",
        "character_reference": ""
      },
      "qa": {
        "consistency_score": null,
        "style_match": null,
        "character_match": null,
        "qa_notes": ""
      },
      "rejection_reason": "",
      "approved_at": "",
      "approved_by": "",
      "image_url": "",
      "retry_count": 0,
      "retry_history": []
    }
  ],
  "assumptions": []
}
```

---

## 🔒 앵커 잠금 (Style/Character Canonicalization) ★

### 목적
프로젝트 전체에서 **동일 인물이 동일 인물로, 동일 스타일이 동일 스타일로** 인식되도록 기준을 확정한다.

### 3.1 Style Anchor

프로젝트의 시각적 기준 톤을 1회 확정한다.

```
- 색감 팔레트 (예: desaturated warm amber, Kodak Vision3)
- 조명 패턴 (예: chiaroscuro, practical torch)
- 필름 에뮬레이션 (예: heavy film grain, Kodak Vision3 500T)
- 카메라 언어 (예: RED V-Raptor, Zeiss Supreme Prime)
- 참조 스타일 (예: 영화 명량/한산, Dunkirk)
```

### 3.2 Character Anchors

각 핵심 인물에 대해 **표준 시각 정의**를 확정한다.

```
인물별 체크리스트:
- [ ] 인종/외모 특징 고정 (피부색, 얼굴형, 주름, 상흔 등)
- [ ] 의상/갑옷 재질 고정 (정확한 소재명, 색상, 마모도)
- [ ] 헤어스타일 고정
- [ ] 체형/자세 고정
- [ ] 기준 이미지(canonical image) 1장 확정
- [ ] 기준 이미지 seed/파라미터 기록
```

### 3.3 앵커 적용 순서

1. **Style Anchor** — 모든 자산에 적용
2. **Character Anchor** — 인물 컷에만 적용
3. **컷 고유 동작/구도** — sketch_prompt의 고유 부분

---

## ✅ 승인 루프 (Approval Loop) ★

### 4.1 상태 전환

```
Draft → Review → Approved → Locked
  ↑        ↓
  └── Rejected (rejection_reason 필수)
```

### 4.2 승인 기준

| 기준 | 체크 |
|------|------|
| 인물 일관성 | 동일 인물이 다른 컷에서도 동일 인물로 인식되는가? |
| 스타일 일관성 | 색감/조명/필름 효과가 프로젝트 톤과 일치하는가? |
| 프롬프트 충실도 | 원래 sketch_prompt의 의도가 반영되었는가? |
| 기술 품질 | 해상도/비율/디테일이 요구사양을 충족하는가? |
| 재생성 가능성 | 프롬프트+파라미터만으로 유사 결과를 얻을 수 있는가? |

### 4.3 반려 시 재시도 규칙

1. `rejection_reason`에 구체적 사유를 기록한다.
2. 재시도 시 **단일 변수만 변경**한다 (seed, weight, 프롬프트 일부 등).
3. `retry_count`를 증가시키고, `retry_history`에 이전 시도를 기록한다.
4. 3회 재시도 후에도 통과하지 못하면, 프롬프트 재작성 또는 도구 변경을 검토한다.

---

## 🔧 생성기별 어댑트 (Generator Adaptation) ★

### 5.1 원칙

- **공통 프롬프트(prompt)를 먼저 작성**하고, 생성기별 문법은 마지막에 변환한다.
- 동일 프롬프트라도 생성기마다 결과가 크게 다르므로, **생성기별 최적화**가 필요하다.

### 5.2 생성기별 어댑트 규칙

| 생성기 | 어댑트 사항 |
|--------|-----------|
| **Midjourney** | `--ar`, `--seed`, `--sref`, `--cref` 파라미터 suffix. 스타일 참조 이미지 활용. |
| **OpenAI Images** | `size` 매핑 (1024x1792 등). 프롬프트 길이 제한 주의. |
| **FLUX** | LoRA 참조. 프롬프트 구조 차이 반영. |
| **Runway Image** | 참조 이미지 ID. motion-free 정지 이미지 명시. |
| **Ideogram** | 스타일 프리셋 매핑. 텍스트 렌더링 필요 시 활용. |

### 5.3 기록 필수 항목

모든 자산에 아래를 기록한다:
- `generator`: 사용한 생성기 이름
- `generator_version`: 생성기 버전/모델
- `params`: 생성기 고유 파라미터
- `seed`: 재생성용 시드 (불가 시 0, 사유 기록)

---

## 작성 워크플로

1. 줄콘티의 `keyvisual_priority=high` 컷을 우선 정렬한다.
2. **Style Anchor** 확정 — 프로젝트 시각 톤 1회 결정.
3. **Character Anchors** 확정 — 인물별 기준 이미지 1장씩 생성·승인.
4. 컷별 프롬프트 작성 — sketch_prompt 기반 + 앵커 적용.
5. 생성기 선택 및 어댑트.
6. 이미지 생성 → QA 체크 → 승인/반려 루프.
7. 승인본은 `status=approved`로 전환, 최종본은 `status=locked`.

---

## QA 체크리스트 (Quality Assurance)

### 일관성 QA
- [ ] 동일 인물이 컷 간 동일 인물로 인식되는가?
- [ ] 스타일/색감/조명이 프로젝트 톤과 일치하는가?
- [ ] 시대/문화적 요소가 정확한가? (갑옷 양식, 건축물, 의상 등)

### 기술 QA
- [ ] 프롬프트와 파라미터만으로 재생성 가능한가?
- [ ] 모든 승인 자산이 source_cut과 연결되는가?
- [ ] 해상도/비율이 요구사양을 충족하는가?
- [ ] seed/파라미터가 기록되었는가?

### 파이프라인 QA
- [ ] 다음 단계(프리비즈/영상화)가 승인 자산만으로 시작 가능한가?
- [ ] 컷당 최소 1개 참조 자산이 보장되는가?
- [ ] 모든 high priority 컷에 승인 자산이 있는가?

---

## 금지

- 생성기별 문법을 공통 프롬프트 본문에 섞어 쓰기
- 승인 자산인데 seed/파라미터 누락
- source_cut_ids 없는 고아 자산 생성
- 앵커 설정 없이 바로 컷별 생성 시작
- 3회 이상 반려된 자산을 동일 조건으로 재시도

---

## 다음 단계 Handoff

- `status=approved` 또는 `locked` 자산만 프리비즈(`previs/SKILL.md`) 및 영상화(`videoproduction/SKILL.md`) 스킬에 전달한다.
- 컷당 최소 1개 참조 자산을 보장한다.
- 자산 수정 시 해당 자산의 하위 출력(프리비즈·영상화)에 변경 전파 규칙(SKILL_INDEX §3)을 적용한다.

---

## 관련 스킬

- `storyboard/SKILL.md` — 줄콘티 입력 규격 (sketch_prompt 원본)
- `cinematic_prompt/SKILL.md` — 실사 프롬프트 6단계 (품질 기준)
- `previs/SKILL.md` — 프리비즈 (다음 단계)
- `videoproduction/SKILL.md` — 영상화 프롬프트 (최종 단계)

---

*Skill Version: 2.0.0*
*Updated: 2026-02-20*
*Changelog:*
*v1.0.0 — 키비주얼 초안*
*v1.1.0 — 앵커 시스템, 툴 어댑터 규칙 추가*
*v2.0.0 — 전면 개편: 앵커 잠금 프로토콜(Style/Character Canonicalization), 승인 루프(5단계 상태기계), 생성기별 어댑트 규칙, QA 체크리스트, uid/parent_uid/rev/status 공통 규약 적용, 재시도 규칙, retry_history 추가*
