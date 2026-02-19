# makemov Skill Index

makemov 프리프로덕션 파이프라인 스킬 인덱스.

기준 경로:
- `/Users/nohshinhee/Documents/2. coding/makemov/.agent/skills`

## 파이프라인

1. 시놉시스: `synopsis/SKILL.md` — v1.2.0
2. 시나리오: `screenplay/SKILL.md` — v2.1.0 런타임 밀도 공식 + ACT-씬 정합 규칙
3. 줄콘티: `storyboard/SKILL.md` — v2.1.0 실사 프롬프트 + 컷 리스트
4. 키비주얼: `keyvisual/SKILL.md` — v2.0.0 앵커 잠금 + 승인 루프 + 생성기 어댑트
5. **프리비즈**: `previs/SKILL.md` — v1.0.0 ⬅️ 신규
6. 영상화: `videoproduction/SKILL.md` — v2.0.0 QA 루프 + 플랫폼 검증

## 보조 스킬
- 시네마틱 실사 프롬프트: `cinematic_prompt/SKILL.md` v2.1.0 (줄콘티 필수 참조) + 프롬프트 스코어링

---

## 🔗 공통 규약 1: ID/버전 연속성 (v3.0 신설)

### 1.1 하이브리드 ID 체계

모든 파이프라인 산출물은 **인간가독 체인 ID** + **UUID v7** 을 병행한다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `entity_id` | string | 인간가독 체인 ID (예: `S03-C05`, `KV-S03-C05-A01`) |
| `uid` | UUIDv7 | 불변 참조 키 — 생성 시 1회 발급, 수정해도 변하지 않음 |
| `parent_uid` | UUIDv7 \| null | 상위 단계 산출물의 uid |
| `rev` | string | 리비전 (`r1`, `r2`, ...) — 내용 수정 시 증가 |

### 1.2 단계별 ID 체인

```
synopsis (uid: A, parent_uid: null)
  └─ scene S03 (uid: B, parent_uid: A)
       └─ cut S03-C05 (uid: C, parent_uid: B)
            └─ asset KV-S03-C05-A01 (uid: D, parent_uid: C)
                 └─ previs PV-S03-C05 (uid: E, parent_uid: D)
                      └─ video VP-S03-C05-sora (uid: F, parent_uid: E)
```

### 1.3 규칙

- `entity_id`는 사람이 디버깅할 때 사용한다.
- `parent_uid` 그래프가 **정식 추적 소스**이다.
- `rev`는 같은 uid 내에서 내용이 변경될 때만 증가한다.
- 새로운 자산을 만들면 새 uid를 발급한다 (기존 자산 수정은 rev만 증가).

---

## ✅ 공통 규약 2: 승인 상태기계 (v3.0 신설)

### 2.1 상태 정의

```
Draft → Review → Approved → Locked
  ↑        ↓
  └── Rejected
```

| 상태 | 의미 | 다음 단계 전달 |
|------|------|--------------|
| `draft` | 초안 작성 중 | ❌ 불가 |
| `review` | 검토 요청됨 | ❌ 불가 |
| `approved` | 승인 완료 | ✅ 가능 |
| `locked` | 확정·동결 | ✅ 가능 (수정 불가) |
| `rejected` | 반려 → Draft로 복귀 | ❌ 불가 |

### 2.2 금지 전이 (Invariant)

다음 상태 전이는 **절대 허용하지 않는다**:
- `approved` → `draft` (승인 취소 불가, 수정하려면 `rev` 증가 후 `review`로)
- `locked` → `draft` / `review` / `approved` (동결 해제 불가)
- `rejected` → `approved` / `locked` (반려된 자산 직접 승인 불가, `draft`부터 재시작)

### 2.3 적용 범위

- **모든 단계** 산출물에 `status` 필드를 포함한다.
- 다음 단계 입력으로 전달할 때는 `approved` 또는 `locked` 상태만 허용한다.
- `rejected` 시 반려 사유를 `rejection_reason` 필드에 기록한다.

### 2.3 상태 전환 규칙

```javascript
{
  status: 'draft',           // 초안
  status: 'review',          // 검토 요청
  status: 'approved',        // 승인
  status: 'locked',          // 동결
  status: 'rejected',        // 반려
  rejection_reason: '',      // 반려 사유 (rejected일 때만)
  approved_at: '',           // 승인 시각 (approved/locked일 때만)
  approved_by: '',           // 승인자 (사용자 or AI)
}
```

### 2.5 rev 충돌 해결 정책

동시 수정 시 `rev` 충돌이 발생하면:
- **기본 정책**: 최신 우선 (Last Write Wins)
- 수동 머지가 필요한 경우 `rev` 접미사로 분기 표시 (`r3a`, `r3b`)
- 충돌 발생 시 `conflict_note` 필드에 사유 기록
```

---

## 🔄 공통 규약 3: 변경 영향도 전파 (v3.0 신설)

### 3.1 원칙

상위 단계 산출물이 수정되면, 하위 단계 산출물에 영향을 미친다.

### 3.2 전파 규칙

| 변경 단계 | 영향 범위 | 조치 |
|-----------|----------|------|
| 시놉시스 수정 | 시나리오 이하 전체 | 시나리오 재검증, 영향받는 씬 `review`로 전환 |
| 시나리오 씬 수정 | 해당 씬의 콘티·키비주얼·프리비즈·영상화 | **hard**: 해당 컷 `review`로 전환, **soft**: 인접 컷 플래그만 |
| 줄콘티 컷 수정 | 해당 컷의 키비주얼·프리비즈·영상화 | **hard**: 해당 자산 `review`로 전환 |
| 키비주얼 수정 | 해당 자산의 프리비즈·영상화 | **hard**: 해당 출력 `review`로 전환 |
| 프리비즈 수정 | 해당 시퀀스의 영상화 | **soft**: 프롬프트 재검토 플래그 |

> **soft**: 플래그만 붙이고 상태는 유지. **hard**: `review`로 강제 전환.

### 3.3 최소 범위 패치 원칙

- 수정 요청은 전체 재작성보다 **해당 단계 JSON의 최소 범위 패치**를 우선한다.
- `parent_uid` 그래프를 통해 영향받는 하위 자산을 자동 식별한다.

---

## 단계별 입력/출력

1. 시놉시스
   - 입력: 아이디어
   - 출력: 시놉시스 문서 + synopsis JSON (`uid`, `status` 포함)

2. 시나리오
   - 입력: synopsis JSON (approved/locked)
   - 출력: 시나리오 문서 (MD) + scenes JSON (`uid`, `parent_uid`, `status` 포함)

3. 줄콘티 (Line Conti)
   - 입력: scenes JSON (approved/locked) 또는 시나리오 MD
   - 출력: 실사 프롬프트 상수 + 줄콘티 데이터 (JS/JSON) (`uid`, `parent_uid`, `status` 포함)
   - 참조: `cinematic_prompt/SKILL.md` (6단계 실사 프롬프트)
   - 핵심: sketch_prompt = 완성형 실사 프롬프트 (스케치 아님)

4. 키비주얼
   - 입력: conti JSON (keyvisual_priority=high 컷 우선) + synopsis JSON
   - 출력: 키비주얼 자산 목록 + asset JSON (`uid`, `parent_uid`, `status` 포함)
   - 핵심: 앵커 잠금 → 승인 루프 → 생성기별 어댑트

5. 프리비즈 (Previs/Animatic) ⬅️ 신규
   - 입력: conti JSON + approved asset JSON
   - 출력: 프리비즈 시퀀스 JSON (`uid`, `parent_uid`, `status` 포함)
   - 핵심: 타이밍/리듬 검증, 일관성 QA (캐릭터 드리프트, 카메라 점프)

6. 영상화
   - 입력: conti JSON + approved asset JSON + previs JSON (optional)
   - 출력: 플랫폼별 프롬프트 패키지 + video_prompts JSON (`uid`, `parent_uid`, `status` 포함)
   - 핵심: QA 루프 (qa_flags, retry_policy, 플랫폼별 검증)

## 운영 원칙
- 각 단계는 이전 단계의 **approved/locked** JSON을 입력으로 사용한다.
- 모든 산출물에 `uid`, `parent_uid`, `rev`, `status` 필드를 포함한다.
- 수정 요청은 전체 재작성보다 해당 단계 JSON의 최소 범위 패치를 우선한다.
- 줄콘티 sketch_prompt는 **완성형 실사**로 작성한다 (cinematic_prompt/SKILL.md 6단계 준용).
- 상위 단계 수정 시 변경 영향도 전파 규칙에 따라 하위 자산 상태를 전환한다.

## 🔮 향후 로드맵 (후순위)
- ~~프롬프트 자동 스코어링~~ — cinematic_prompt v2.1에 기초 구조 포함 완료
- 비용/시간 추정 — 컷별 예상 비용·소요 시간 자동 산출
- 운영 대시보드 — 파이프라인 전체 진행 상황 시각화
- 포스트프로덕션 단계 — 편집(EDL/타임라인), 사운드 디자인, QC/Delivery
- QA score 임계값 자동화 — 품질 점수 기반 자동 재시도/수동검수/중단 분기
- 플랫폼 어댑터 회귀 테스트 — 프롬프트 출력 포맷 스냅샷 검증
- 비용/시간 텔레메트리 — 컷별 평균 시도횟수, 승인까지 소요시간, 실패유형 TOP3 자동 집계
- E2E 리허설 — synopsis→delivery까지 샘플 프로젝트 1개로 전체 파이프라인 병목 확인

*Version: 3.1.0*
*Updated: 2026-02-20*
*Changelog:*
*v2.0.0 — 줄콘티 단계 전면 개편 반영*
*v3.0.0 — 공통 규약 3종 신설, 프리비즈 단계 추가, 키비주얼·영상화 v2.0 업그레이드*
*v3.1.0 — 이안 피드백 반영: 금지전이 규칙, rev충돌 정책, soft/hard 변경전파, 후순위 로드맵 확장*

