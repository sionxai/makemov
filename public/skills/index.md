# makemov 스킬 문서 인덱스

> 각 단계의 품질 기준·작성 규칙·프롬프트 엔지니어링 가이드.
> 
> `agent-guide.md`의 스키마(형식)만으로는 **품질**이 보장되지 않습니다.
> 아래 스킬 문서를 반드시 참조하여 각 단계의 밀도·톤·구조 기준을 지켜주세요.

## 파이프라인별 스킬

| 순서 | 단계 | 스킬 문서 | 설명 |
|------|------|-----------|------|
| 1 | 시놉시스 | [synopsis.md](./synopsis.md) | 로그라인·테마·인물·ACT 구조·밀도 기준 |
| 2 | 시나리오 | [screenplay.md](./screenplay.md) | 씬 단위 배분·타임코드·대사·밀도 공식 |
| 3 | 줄콘티 | [storyboard.md](./storyboard.md) | 컷 단위 화면 설계·샷사이즈·프롬프트 생성 |
| 4 | 시네마틱 프롬프트 | [cinematic_prompt.md](./cinematic_prompt.md) | AI 이미지 생성용 실사 프롬프트 가이드 |
| 5 | 키비주얼 | [keyvisual.md](./keyvisual.md) | 핵심 컷 이미지 자산 확정 |
| 6 | 영상화 프롬프트 | [videoproduction.md](./videoproduction.md) | 플랫폼별 영상 생성 프롬프트 |

## 접근 방법

```
BASE: https://makemov.vercel.app/skills/

예시:
  https://makemov.vercel.app/skills/index.md        ← 이 문서
  https://makemov.vercel.app/skills/synopsis.md     ← 시놉시스 스킬
  https://makemov.vercel.app/skills/storyboard.md   ← 줄콘티 스킬
```

## 주의사항

1. **스킬 문서 = 품질 기준**. 스키마만 지키면 "빈 껍데기"가 될 수 있습니다.
2. 각 스킬은 **밀도 공식**, **품질 게이트**, **체크리스트**를 포함합니다.
3. 러닝타임에 따라 밀도 기준이 달라집니다 — 80초 숏츠 ≠ 10분 단편.
4. `cinematic_prompt.md`는 줄콘티의 `sketch_prompt` 필드 생성에 필수입니다.
