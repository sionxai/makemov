---
name: 시네마틱 실사 이미지 프롬프트 (Cinematic Photorealistic Prompt)
description: 이미지 생성 AI에서 포토리얼리스틱(실사) 결과물을 얻기 위한 범용 프롬프트 가이드. 인물, 풍경, 음식, 건축, 패션, 역사, 전투 등 모든 장르에 적용 가능.
---

# 🎬 시네마틱 실사 이미지 프롬프트 스킬 v2.0

## 개요
이미지 생성 AI에서 **포토리얼리스틱(실사)** 결과물을 얻기 위한 범용 프롬프트 가이드.
인물, 풍경, 음식, 건축, 패션, 역사, 전투 등 **모든 장르**에 적용 가능.

> ⚠️ **핵심 원칙**: 이미지 AI는 **비유적/문학적 표현을 해석하지 못한다.**
> "지옥의 입구처럼" → ❌ | "강한 오렌지색 역광 화염" → ✅

---

## 🚨 실사가 안 나오는 5대 실수

| 실수 | 예시 | 문제 |
|------|------|------|
| 비유적 표현 | "검은 파도처럼 밀려드는" | AI가 문자 그대로 파도를 그림 |
| 스타일 미지정 | 장면만 묘사 | 일러스트/페인팅으로 렌더링 |
| 카메라 미지정 | 해상도만 적음 | 디지털 아트 느낌 |
| 부정어 누락 | "시네마틱"만 적음 | 애니메이션/만화 스타일 혼입 |
| 재질 미묘사 | "드레스를 입은 여자" | 플라스틱/3D 렌더 질감 |

---

## ✅ 실사 프롬프트 필수 구조 (6단계)

### 1단계: 스타일 선언 (Style Declaration) — 반드시 맨 앞

```
Photorealistic [촬영 유형], [비율], [해상도].
Shot on [카메라] with [렌즈].
```

**촬영 유형별 키워드:**

| 장르 | 촬영 유형 키워드 |
|------|----------------|
| 영화 스틸 | `cinematic still photograph` |
| 인물 화보 | `editorial portrait photograph` |
| 풍경 | `landscape photograph` |
| 음식 | `food photography, editorial style` |
| 패션 | `fashion editorial photograph, Vogue style` |
| 건축/인테리어 | `architectural photograph` |
| 거리/다큐 | `street photography, documentary style` |
| 제품 | `product photography, studio shot` |
| 공중 | `aerial photograph, drone shot` |
| 수중 | `underwater photograph` |

**카메라/렌즈 추천 (장르별):**

| 장르 | 카메라 | 렌즈 | 효과 |
|------|--------|------|------|
| 영화/시네마틱 | ARRI Alexa 65 | Panavision anamorphic 40mm | 영화적 렌즈플레어, 와이드 |
| 인물/초상 | Sony A7R V | Sony 85mm f/1.4 GM | 부드러운 보케, 피부 질감 |
| 풍경 | Nikon Z9 | Nikkor 14-24mm f/2.8 | 광활한 시야, 선명한 디테일 |
| 음식 | Canon EOS R5 | Canon RF 100mm f/2.8L Macro | 클로즈업 질감 극대화 |
| 패션 | Hasselblad X2D | XCD 80mm f/1.9 | 고해상 피부결, 매거진 느낌 |
| 건축 | Canon EOS R5 | Canon TS-E 17mm f/4L tilt-shift | 왜곡 없는 건축 라인 |
| 거리/다큐 | Leica M11 | Summicron 35mm f/2 | 자연스러운 거리 느낌 |
| 제품 | Phase One IQ4 | Schneider 120mm Macro | 극도의 디테일, 상업 품질 |
| 드론/공중 | DJI Mavic 3 Pro | Hasselblad 24mm equiv. | 넓은 항공 시점 |
| 수중 | Nikon Z8 | Nikkor 8-15mm fisheye + housing | 수중 왜곡과 빛 산란 |

**필수 부정어 (스타일 차단):**
```
NOT illustration, NOT painting, NOT anime, NOT drawing, NOT 3D render, NOT CGI.
```

---

### 2단계: 장면 설정 (Setting)

```
[시간대/계절]. [장소]. [날씨/분위기].
```

**시간대별 조명 효과:**

| 시간대 | 빛의 특성 | 적합한 장르 |
|--------|----------|------------|
| 골든아워 (일출/일몰) | 따뜻한 금빛, 긴 그림자 | 인물, 풍경, 로맨스 |
| 블루아워 (해뜨기 직전/직후) | 차가운 보라-파란빛 | 도시, 건축, 몽환적 분위기 |
| 정오 | 강한 하이키, 짧은 그림자 | 여름 비치, 건축 |
| 야간 | 인공조명 + 어둠 | 네온, 거리, 누아르 |
| 새벽 안개 | 부드럽고 확산된 빛 | 풍경, 자연, 미스터리 |
| 폭풍/비 | 극적인 구름, 젖은 반사 | 드라마틱, 전쟁, 감정 |

**장소 묘사 팁:**
- ❌ "아름다운 카페" → ✅ "서울 성수동 노출 콘크리트 카페, 대형 아치형 창문으로 오후 햇살이 들어옴"
- ❌ "숲길" → ✅ "가을 설악산 자작나무 숲, 노란 낙엽이 젖은 흙길에 깔려 있음"
- ❌ "해변" → ✅ "제주 협재해수욕장, 에메랄드빛 바다, 백사장 위 하얀 포말"

---

### 3단계: 피사체 (Subjects)

#### 👤 인물

```
[성별/나이대], [인종/외모 특징], [표정], [의상 재질+색상], [자세/동작].
```

**재질감 구체화 (핵심!):**

| ❌ 추상적 | ✅ 구체적 |
|----------|----------|
| 드레스를 입은 여자 | 아이보리색 실크 새틴 슬립 드레스, 빛에 은은하게 광택 |
| 양복 입은 남자 | 차콜 그레이 울 트위드 더블 브레스트 수트, 라펠에 미세한 헤링본 패턴 |
| 한복 입은 여자 | 연분홍 모시 저고리, 옥색 실크 치마, 은장 노리개 |
| 갑옷 입은 병사 | 검붉은 옻칠 철판 갑옷(토세이구소쿠), 빗물에 젖어 번들거림 |
| 가죽 자켓 | 빈티지 워싱된 브라운 카프스킨 레더, 지퍼 금속이 산화됨 |

**피부/헤어 묘사:**
- 피부: `natural skin texture with pores, subtle freckles, no airbrushing`
- 헤어: `wind-blown dark hair, individual strands catching light`
- 땀/물: `droplets of water on skin, reflecting ambient light`

#### 🍽️ 음식

```
[요리명], [그릇/접시 재질], [재료 질감], [증기/윤기/소스], [배경 세팅].
```

#### 🏛️ 건축/공간

```
[건축 양식], [재질], [빛의 방향], [규모감], [인간 스케일 요소].
```

#### 🌿 자연/풍경

```
[지형], [식생 디테일], [기상 현상], [원근감/스케일], [특수 광학 효과].
```

---

### 4단계: 분위기/감정 (Mood & Atmosphere)

| 분위기 | 키워드 |
|--------|--------|
| 따뜻함/향수 | `warm golden tones, nostalgic atmosphere, soft diffused light` |
| 차가움/고독 | `cool blue-grey tones, isolated, misty, melancholic` |
| 긴장/서스펜스 | `high contrast shadows, dramatic tension, ominous clouds` |
| 화려/럭셔리 | `rich deep colors, jewel tones, glossy reflections, opulent` |
| 평화/고요함 | `serene, pastel tones, gentle breeze, still water, silence` |
| 에너지/역동 | `motion blur, dynamic movement, vibrant saturated colors` |
| 비극/처절함 | `desaturated palette, smoke-filled, embers, overcast` |
| 로맨틱 | `soft bokeh, candlelight, intimate close-up, warm amber` |
| 미래적/SF | `neon accents, holographic reflections, chrome surfaces` |
| 빈티지/레트로 | `film grain, faded colors, 70s color palette, analog feel` |

---

### 5단계: 조명 설계 (Lighting)

```
조명: [주광원] + [보조광]. [명암 스타일]. [특수 효과].
```

**조명 패턴:**

| 패턴 | 설명 | 적합한 장르 |
|------|------|------------|
| **Chiaroscuro** | 극단적 명암 대비 (카라바조) | 드라마, 전쟁, 누아르 |
| **Rembrandt** | 45도 측면광, 삼각형 그림자 | 인물 초상, 캐릭터 |
| **Butterfly (Paramount)** | 정면 위에서 아래로 | 뷰티, 패션 |
| **Split** | 얼굴 반만 빛 | 미스터리, 이중성 |
| **Backlighting** | 피사체 뒤에서 오는 빛 | 실루엣, 영웅적 |
| **Rim Light** | 피사체 윤곽만 빛남 | 분리감, 극적 |
| **Practical** | 장면 내 실제 광원 (횃불, 네온, 촛불) | 자연스러운 분위기 |
| **Soft/Diffused** | 부드럽고 균일한 빛 (흐린 날) | 인물, 음식, 제품 |
| **Hard Light** | 날카로운 그림자 | 팝아트, 패션, 건축 |
| **Golden Hour** | 낮은 태양의 따뜻한 빛 | 풍경, 로맨스, 인물 |

**필수 렌즈 효과 키워드:**

| 효과 | 키워드 | 용도 |
|------|--------|------|
| 배경 흐림 | `shallow depth of field, bokeh` | 인물 분리, 집중 |
| 빛줄기 | `volumetric light, god rays` | 신비로움, 극적 |
| 렌즈 플레어 | `anamorphic lens flare` | 시네마틱 |
| 반사 | `wet surface reflections` | 비 오는 거리, 고급감 |
| 파티클 | `dust particles, rain drops, snow` | 공기감, 생동감 |
| 안개 | `atmospheric haze, fog` | 깊이감, 몽환 |
| 이슬/결로 | `condensation, morning dew` | 음식, 음료, 자연 |

---

### 6단계: 기술 마감 (Technical Finisher)

```
[해상도]. [비율]. [필름 효과]. [참고 작품/포토그래퍼].
Real human faces, real textures, real materials.
NOT illustration, NOT painting, NOT anime, NOT drawing, NOT 3D render.
```

**해상도/비율:**

| 용도 | 비율 | 적합한 장르 |
|------|------|------------|
| 시네마틱 와이드 | `16:9` | 영화, 풍경, 전쟁 |
| 극장 초와이드 | `2.39:1` | 서사시, 대서사 |
| 정방형 | `1:1` | SNS, 인물, 제품 |
| 세로 포스터 | `9:16` | 모바일, 포스터 |
| 전통 사진 | `3:2` | 인물, 풍경 |
| 매거진 | `4:5` | 패션, 에디토리얼 |

**필름/컬러 그레이딩:**

| 효과 | 키워드 | 느낌 |
|------|--------|------|
| 영화 블록버스터 | `teal and orange color grading` | 할리우드 대작 |
| 빈티지 필름 | `Kodak Portra 400 film emulation` | 따뜻한 필름 느낌 |
| 차가운 필름 | `Fuji Pro 400H film emulation` | 차분한 청록 톤 |
| 흑백 클래식 | `black and white, Tri-X 400 grain` | 클래식, 다큐 |
| 채도 낮은 무드 | `desaturated muted tones` | 시네마틱 무드 |
| 네온 | `neon-lit, cyberpunk color palette` | 미래적, 도시 야경 |
| 거친 전장 | `film grain, gritty, high contrast` | 전쟁, 서바이벌 |

**참고 작품/포토그래퍼 (장르별):**

| 장르 | 참고 |
|------|------|
| 시네마틱/영화 | Roger Deakins 촬영 스타일, Denis Villeneuve 영화 |
| 인물/초상 | Annie Leibovitz, Peter Lindbergh 스타일 |
| 패션 | Mario Testino, Steven Meisel 스타일 |
| 풍경 | Ansel Adams, Peter Lik 스타일 |
| 음식 | Bon Appétit magazine 스타일 |
| 거리 | Steve McCurry, Fan Ho 스타일 |
| 건축 | Iwan Baan, Julius Shulman 스타일 |
| 한국 역사 전쟁 | 영화 명량, 한산, 킹덤 |
| 서양 전쟁 | 영화 1917, 덩케르크, 글래디에이터 |
| 판타지 | 반지의 제왕, 왕좌의 게임 |
| SF | 블레이드러너 2049, 듄 |
| 로맨스 | 영화 콜 미 바이 유어 네임, 노트북 |

---

## 📋 완성 프롬프트 템플릿

### 범용 템플릿
```
Photorealistic [촬영유형] photograph, [비율], [해상도].
Shot on [카메라] with [렌즈].

[시간대/계절]. [장소 구체 묘사]. [날씨/분위기].

[피사체 상세: 인물이면 외모+의상재질+표정+자세, 
 음식이면 요리+질감+증기+그릇,
 건축이면 양식+재질+규모+빛].

분위기: [감정 키워드].

조명: [주광원] + [보조광]. [명암 패턴]. 
[렌즈효과: bokeh/volumetric light/lens flare 등].

[필름/색감]. [참고 스타일].
Real [relevant] textures, real materials.
NOT illustration, NOT painting, NOT anime, NOT 3D render.
```

### 장르별 빠른 템플릿

#### 🎬 시네마틱 (영화 스틸)
```
Photorealistic cinematic still photograph, 16:9, 8K.
Shot on ARRI Alexa 65 with Panavision anamorphic lens.
[장면 묘사]. [인물/환경 재질 상세]. 
Chiaroscuro lighting, shallow depth of field, anamorphic lens flare.
Teal and orange color grading, film grain.
Style of Roger Deakins cinematography.
NOT illustration, NOT painting, NOT anime.
```

#### ⚔️ 역사 전쟁
```
Photorealistic cinematic still photograph, 16:9, 8K.
Shot on RED V-Raptor with Zeiss Supreme Prime lens.
[연도]년 [전투 장소]. [시간대], [날씨].
[군대 A 묘사: 인원, 갑옷 재질, 무기, 동작].
[군대 B 묘사: 인원, 복장 재질, 무기, 동작].
[환경: 전장 디테일].
Chiaroscuro lighting, [주광원], volumetric light through smoke.
Desaturated warm tones, heavy film grain.
Style of 영화 명량/킹덤/1917.
Real human faces, real armor textures. 
NOT illustration, NOT painting, NOT anime.
```

#### 👤 인물 화보
```
Photorealistic editorial portrait photograph, 4:5, 8K.
Shot on Sony A7R V with 85mm f/1.4 GM lens.
[인물 묘사: 외모, 의상 재질, 표정].
[배경 묘사].
Rembrandt lighting, creamy bokeh, natural skin texture with pores.
Kodak Portra 400 color palette.
Style of Annie Leibovitz.
NOT illustration, NOT painting, NOT anime, NOT airbrushed.
```

---

## 💡 고급 기법

### 1. 비대칭 앵커 (Asymmetry Anchor)
대비되는 요소로 시각적 긴장감 생성:
```
거대한 콘크리트 건물 사이 좁은 골목에 핀 한 송이 벚꽃.
50,000 흰옷의 의병 vs 1,600 검은 갑옷의 사무라이.
텅 빈 고급 레스토랑에 홀로 앉은 노인.
```

### 2. 감정 앵커 (Emotion Anchor)
한 디테일에 감정을 집중:
```
클로즈업: 빗물에 젖은 뺨 위로 흐르는 한 줄기 눈물.
매크로: 커피잔 위 라떼아트가 천천히 무너지는 순간.
디테일: 피아니스트의 손가락 끝이 건반을 누르기 직전의 긴장.
```

### 3. 시간 동결 (Frozen Moment)
역동적 순간을 정지시킨 듯한 효과:
```
공중에 멈춘 빗방울 사이를 뛰어가는 아이.
부서지는 파도의 물보라가 정지된 순간.
칼날에서 튀어오르는 불꽃이 공중에 떠 있는 장면.
```

### 4. 레이어드 컴포지션 (Layered Composition)
전경-중경-후경으로 깊이감 강조:
```
전경: [초점이 맞은 핵심 피사체, 상세 묘사]
중경: [보조 요소, 약간 흐릿]
후경: [배경, 보케 처리, 분위기 형성]
```

### 5. 한국어 vs 영어
- 이미지 AI는 **영어 키워드**를 더 정확하게 해석
- 한국어 프롬프트도 가능하지만, 핵심 기술어는 영어 병기 권장

---

## 🎯 검증 체크리스트

프롬프트 작성 후 반드시 확인:

- [ ] `Photorealistic` 키워드가 맨 앞에 있는가?
- [ ] 카메라/렌즈가 명시되어 있는가?
- [ ] 비유적 표현이 **없는가**? ("~처럼", "마치 ~같은" 제거)
- [ ] 피사체의 **재질/질감**이 구체적인가?
- [ ] `NOT illustration` 등 부정어가 포함되어 있는가?
- [ ] 조명의 방향/패턴이 명시되어 있는가?
- [ ] 렌즈 효과(`bokeh`, `depth of field` 등)가 있는가?
- [ ] 색감/필름 스타일이 지정되어 있는가?

---

## 📎 관련 스킬

- `storyboard/SKILL.md` — 콘티 프롬프트 규칙 (시대/문화 맥락 필수)
- `keyvisual/SKILL.md` — 키비주얼 생성 프로토콜

---

*에온 스킬 v2.0 | 2026-02-07 생성*
*v1.0 → v2.0: 전쟁 특화 → 범용 시네마틱 실사로 확장*
*교훈: "기질"이 아니라 "프롬프트 문법"이 핵심*
