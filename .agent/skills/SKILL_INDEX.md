# makemov Skill Index

makemov 프리프로덕션 파이프라인 스킬 인덱스.

기준 경로:
- `/Users/nohshinhee/Documents/2. coding/makemov/.agent/skills`

## 파이프라인
1. 시놉시스: `synopsis/SKILL.md`
2. 시나리오: `screenplay/SKILL.md`
3. 줄콘티: `storyboard/SKILL.md` ← v2.0 전면 개편 (스케치→실사 프롬프트)
4. 키비주얼: `keyvisual/SKILL.md`
5. 영상화: `videoproduction/SKILL.md`

## 보조 스킬
- 시네마틱 실사 프롬프트: `cinematic_prompt/SKILL.md` (줄콘티 필수 참조)

## 단계별 입력/출력
1. 시놉시스
- 입력: 아이디어
- 출력: 시놉시스 문서 + synopsis JSON

2. 시나리오
- 입력: synopsis JSON
- 출력: 시나리오 문서 (MD) + scenes JSON

3. 줄콘티 (Line Conti)
- 입력: scenes JSON 또는 시나리오 MD
- 출력: **실사 프롬프트 상수** + 줄콘티 데이터 (JS/JSON)
- 참조: `cinematic_prompt/SKILL.md` (6단계 실사 프롬프트)
- 핵심: sketch_prompt = 완성형 실사 프롬프트 (스케치 아님)

4. 키비주얼
- 입력: conti JSON (keyvisual_priority=high 컷 우선) + synopsis JSON
- 출력: 키비주얼 자산 목록 + asset JSON

5. 영상화
- 입력: conti JSON + approved asset JSON
- 출력: 플랫폼별 프롬프트 패키지 + video_prompts JSON

## 운영 원칙
- 각 단계는 이전 단계 JSON을 그대로 입력으로 사용한다.
- 승인 상태가 필요한 단계는 `approved` 자산만 전달한다.
- 수정 요청은 전체 재작성보다 해당 단계 JSON의 최소 범위 패치를 우선한다.
- 줄콘티 sketch_prompt는 **완성형 실사**로 작성한다 (cinematic_prompt/SKILL.md 6단계 준용).

*Version: 2.0.0*
*Updated: 2026-02-07*
*Changelog: v2.0.0 — 줄콘티 단계 전면 개편 반영 (스케치→실사 프롬프트, 시나리오 MD/JSON 입력 지원)*
