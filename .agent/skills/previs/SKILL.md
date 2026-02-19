---
name: 프리비즈 (Previs / Animatic)
description: 승인된 키비주얼 자산과 줄콘티를 기반으로 타이밍·리듬·연결성을 검증하는 반동적(half-motion) 시퀀스를 생성한다. 캐릭터 드리프트, 카메라 점프, 편집 리듬 문제를 영상화 전에 사전 검출한다.
---

# Previs / Animatic v1.0

## 목표
키비주얼로 룩이 고정된 후, **영상화 전에 타이밍·리듬·연결성을 검증**하여 영상 생성 비용과 재시도를 최소화한다.

> ⚠️ **AI 기반 프리비즈의 핵심**: 전통 animatic(정적 보드 연결)과 달리, AI 환경에서는 **반동적(half-motion) 시퀀스** 생성이 가능하다. 대신 **일관성 붕괴(캐릭터 드리프트/카메라 점프)** 검출이 더 중요하다.

> 📌 공통 규약: `SKILL_INDEX.md` §1(ID체계) §2(승인기계) §3(변경전파) 참조.

---

## 입력 계약

### 필수 입력
- 줄콘티 JSON (`status=approved/locked`, `cuts[]`, `tc_start`, `tc_end`, `duration_sec`)
- 승인된 키비주얼 JSON (`status=approved/locked`, `assets[]`)

### 선택 입력
- 시놉시스 JSON — 감정 곡선 참조
- 시나리오 JSON — 대사 타이밍 참조
- 참조 음악/사운드 — 리듬 검증용
- 타이밍 조정 오버라이드 — 특정 컷의 길이 변경 요청

---

## 출력 계약

항상 아래 2가지를 함께 출력한다.

### 1) 읽기용 프리비즈 리포트
- 시퀀스 타이밍 요약 (총 길이, ACT별 길이, 패이싱 곡선)
- 일관성 QA 결과 (드리프트/점프 검출)
- 편집 리듬 분석 (빠른 컷/느린 컷 분포)
- 수정 권장사항

### 2) 기계 처리용 JSON

```json
{
  "uid": "<UUIDv7>",
  "parent_uid": "<keyvisual_package.uid>",
  "rev": "r1",
  "status": "draft",
  "total_duration_sec": 600,
  "sequences": [
    {
      "sequence_id": "PV-S1",
      "uid": "<UUIDv7>",
      "parent_uid": "<scene.uid>",
      "rev": "r1",
      "status": "draft",
      "scene_id": "S1",
      "duration_sec": 50.0,
      "cuts": [
        {
          "cut_id": "PV-S1-C1",
          "uid": "<UUIDv7>",
          "parent_uid": "<asset.uid>",
          "source_cut_id": "S1-C1",
          "source_asset_id": "KV-S1-C1-01",
          "duration_sec": 6.0,
          "timing": {
            "planned_duration": 6.0,
            "adjusted_duration": 6.0,
            "adjustment_reason": ""
          },
          "transition": {
            "type": "DISSOLVE",
            "duration_sec": 0.5
          },
          "motion": {
            "type": "half-motion",
            "camera_move": "SLOW DOLLY FORWARD",
            "subject_motion": "static",
            "parallax": true,
            "motion_intensity": "low"
          },
          "audio_sync": {
            "bgm_cue": "",
            "sfx_cue": "",
            "dialogue_sync": false
          }
        }
      ],
      "pacing": {
        "avg_cut_duration": 0,
        "cut_count": 0,
        "rhythm_pattern": "slow_build"
      }
    }
  ],
  "consistency_qa": {
    "character_drift_flags": [],
    "camera_jump_flags": [],
    "style_break_flags": [],
    "timing_flags": []
  },
  "pacing_analysis": {
    "overall_rhythm": "",
    "tension_curve": [],
    "recommended_adjustments": []
  },
  "assumptions": []
}
```

---

## 🎬 프리비즈 vs 전통 Animatic

| 항목 | 전통 Animatic | AI 기반 Previs |
|------|-------------|----------------|
| 소스 | 스케치/스토리보드 이미지 | 승인된 키비주얼(실사 이미지) |
| 움직임 | 정적 이미지 → 팬/줌만 | 반동적(half-motion) — 패럴렉스, 줌, 미세 움직임 |
| 교체 비용 | 재촬영/재작화 | 빠른 교체 (이미지 스왑, 길이 조정) |
| 핵심 QA | 스토리 흐름, 타이밍 | + **캐릭터 드리프트, 카메라 점프 검출** |
| 편집 | 수동 | 반자동 (JSON 기반 시퀀스 조합) |

---

## 🔍 일관성 QA (Consistency QA) ★

### 4.1 캐릭터 드리프트 검출

인접 컷에서 동일 인물의 시각적 차이를 검사한다.

| 검사 항목 | 기준 | 플래그 |
|----------|------|--------|
| 얼굴 유사도 | 동일 인물 인식 가능 | `character_face_drift` |
| 의상 일관성 | 의상/갑옷 디테일 유지 | `character_costume_drift` |
| 체형 일관성 | 체형/자세 연속성 | `character_body_drift` |
| 색감 일관성 | 피부/의상 색감 유지 | `character_color_drift` |

### 4.2 카메라 점프 검출

인접 컷 사이의 시각적 불연속을 검사한다.

| 검사 항목 | 기준 | 플래그 |
|----------|------|--------|
| 180도 규칙 | 축선 위반 여부 | `camera_axis_jump` |
| 사이즈 점프 | 인접 컷 사이즈 차이 | `camera_size_jump` |
| 조명 불연속 | 시간대 변화 없이 조명 급변 | `lighting_jump` |
| 구도 불연속 | 시선 방향/위치 불연속 | `composition_jump` |

### 4.3 타이밍 검증

| 검사 항목 | 기준 | 플래그 |
|----------|------|--------|
| ACT 비율 | ACT별 시간 배분이 서사 구조에 맞는가 | `pacing_imbalance` |
| 컷 길이 분포 | 극단적으로 짧거나 긴 컷 | `timing_outlier` |
| 클라이맥스 타이밍 | 절정 컷의 위치가 적절한가 | `climax_position` |
| 전환 속도 | 전환 효과 길이가 적절한가 | `transition_speed` |

---

## 🎵 반동적(Half-Motion) 시퀀스 규격

### 5.1 모션 유형

| 유형 | 설명 | 적합 상황 |
|------|------|----------|
| `static` | 정지 이미지 그대로 | 강렬한 정지 컷, 인서트 |
| `pan` | 수평 이동 | 풍경, 전장 전경 |
| `tilt` | 수직 이동 | 인물 전신, 건물 |
| `zoom` | 줌인/줌아웃 | 감정 강조, 초점 이동 |
| `parallax` | 전경/중경/후경 레이어 분리 이동 | 깊이감 강조, 영웅 등장 |
| `kenburns` | 팬+줌 조합 | 범용 다큐멘터리 스타일 |
| `half-motion` | AI 기반 미세 움직임 (머리카락, 연기, 물결) | 실사 이미지의 생동감 부여 |

### 5.2 모션 강도

| 강도 | 설명 |
|------|------|
| `none` | 정지 |
| `low` | 미세 움직임 (호흡, 바람) |
| `medium` | 중간 움직임 (고개 돌림, 걷기) |
| `high` | 강한 움직임 (전투, 달리기) |

---

## 작성 워크플로

1. 줄콘티의 씬/컷 구조를 시퀀스로 매핑한다.
2. 각 컷에 승인된 키비주얼 자산을 연결한다.
3. 컷별 모션 유형/강도를 지정한다.
4. 전환 효과를 지정한다 (콘티의 `transition_out` 참조).
5. 오디오 동기화 포인트를 표시한다.
6. **일관성 QA** 실행 — 드리프트/점프/타이밍 플래그 검출.
7. **패이싱 분석** — ACT별 긴장 곡선, 리듬 패턴 확인.
8. 수정 권장사항을 정리한다.
9. 품질 게이트 통과 후 `status=approved` 전환.

---

## 품질 게이트

### 타이밍 체크
- [ ] 총 길이가 시놉시스 runtime과 일치하는가? (±10%)
- [ ] ACT별 시간 비율이 서사 구조에 맞는가?
- [ ] 모든 컷의 타이밍 합계가 씬 길이와 일치하는가?
- [ ] 극단적으로 짧거나(1초↓) 긴(15초↑) 컷이 의도적인가?

### 일관성 체크
- [ ] character_drift_flags가 비어있는가? (또는 의도적 변화)
- [ ] camera_jump_flags가 비어있는가? (또는 의도적 점프 컷)
- [ ] style_break_flags가 비어있는가?
- [ ] 180도 규칙 위반이 없는가?

### 리듬 체크
- [ ] 긴장-이완 곡선이 서사 구조와 일치하는가?
- [ ] 클라이맥스 위치가 적절한가?
- [ ] 전환 효과가 리듬을 방해하지 않는가?

### 파이프라인 체크
- [ ] 모든 컷에 승인된 키비주얼 자산이 연결되었는가?
- [ ] 다음 단계(영상화)가 이 시퀀스를 참조하여 시작 가능한가?
- [ ] uid/parent_uid 그래프가 완전한가?

---

## 금지

- 키비주얼 미승인 자산으로 프리비즈 구성
- 일관성 QA 미실행 상태로 승인
- 콘티 타이밍과 10% 이상 차이 나는데 사유 미기록
- 모든 컷에 동일 모션(ken burns) 적용 — 변화 없는 프리비즈는 무의미
- 오디오 동기화 포인트 없이 음악 의존 컷 구성

---

## 다음 단계 Handoff

- `status=approved` 또는 `locked`인 시퀀스를 영상화 스킬(`videoproduction/SKILL.md`)에 전달한다.
- 일관성 QA 결과를 함께 전달하여, 영상화 단계에서 동일 문제를 반복하지 않도록 한다.
- 타이밍 조정 결과가 원래 콘티와 다르면, 콘티도 함께 업데이트한다 (변경 전파 규칙 §3).

### 🔒 필드 잠금 계약 (Handoff Lock)

프리비즈에서 `approved`/`locked`된 다음 필드는 **영상화 단계에서 강제 준수**해야 한다:

| 잠금 필드 | 의미 | 영상화에서의 제약 |
|----------|------|-----------------|
| `timing.adjusted_duration` | 확정된 컷 길이 | `params.seconds`가 이 값과 일치해야 함 |
| `transition.type` | 확정된 전환 효과 | `continuity.match_to_next`에 반영 |
| `transition.duration_sec` | 전환 길이 | 영상 생성 시 겹침 구간 확보 |
| `motion.motion_intensity` | 모션 강도 | 프롬프트의 움직임 기술어와 일치 |
| `audio_sync` 포인트 | 오디오 동기화 | `audio_plan`에 그대로 반영 |

> ⚠️ 잠금 필드를 변경하려면 프리비즈 단계로 돌아가서 수정 후 `rev` 증가해야 한다.

---

## 관련 스킬

- `keyvisual/SKILL.md` — 키비주얼 자산 (필수 입력)
- `storyboard/SKILL.md` — 줄콘티 (구조/타이밍 원본)
- `videoproduction/SKILL.md` — 영상화 (다음 단계)
- `cinematic_prompt/SKILL.md` — 시각 품질 기준

---

*Skill Version: 1.0.0*
*Created: 2026-02-20*
*Changelog:*
*v1.0.0 — 신규 생성: 반동적 프리비즈 스킬. 일관성 QA(캐릭터 드리프트/카메라 점프), 패이싱 분석, half-motion 시퀀스 규격, uid/parent_uid/status 공통 규약 적용*
