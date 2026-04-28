export const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'];

export const CINEMATIC_ANGLES = [
  { name: '익스트림 롱 샷 (ELS)', description: '인물이 아주 작고 환경/스케일이 주인공인 구도' },
  { name: '롱 샷 / 풀 샷 (LS / FS)', description: '인물 전신 중심. 동선/액션/블로킹 보여주기' },
  { name: '미디엄 롱 / 아메리칸 샷 (MLS)', description: '허벅지~머리(또는 무릎 위). 대화+몸짓 균형' },
  { name: '미디엄 샷 (MS)', description: '허리~머리. 드라마 대사의 기본 커버리지' },
  { name: '미디엄 클로즈업 (MCU)', description: '가슴~머리. 감정이 잘 읽히는 표준 감정 거리' },
  { name: '클로즈업 (CU)', description: '얼굴 중심. 리액션/감정 강조' },
  { name: '익스트림 클로즈업 (ECU)', description: '눈/입/손/트리거 같은 디테일로 긴장 극대화' },
  { name: '투 샷 (Two-Shot)', description: '두 인물을 한 프레임에. 관계/거리/권력 구도' },
  { name: '오버 더 숄더 (OTS)', description: '전경에 어깨/뒷머리를 걸고 상대를 담는 대화 구도' },
  { name: 'POV 샷 (주관샷)', description: '인물이 보는 그대로. 몰입/공포/스릴' },
  { name: '하이 앵글', description: '카메라가 위에서 아래로. 피사체를 작게/약하게 압박' },
  { name: '로우 앵글', description: '아래에서 위로. 위압감/권위/영웅성 또는 불안감' },
  { name: '탑샷 (버드아이뷰)', description: '수직에 가깝게 위에서 내려다보는 구도. 동선/구조' },
  { name: '더치 앵글', description: '수평을 일부러 기울임. 불안, 혼란, 비틀린 심리' },
  { name: '인서트 샷', description: '물건/손동작/단서 등 정보 전달용 디테일 컷' },
];

export const LOCATION_ANGLES = [
  { name: '설정 샷 (Establishing Shot)', description: 'Wide establishing shot that shows the entire location in context. Capture the full scope of the environment, surrounding geography, and architectural scale. This is the master reference shot.' },
  { name: '항공 버드아이뷰', description: 'Aerial top-down bird\'s eye view of the location. Show the layout, spatial relationships, roads, and surrounding terrain from directly above at high altitude.' },
  { name: '드론 45° 오버뷰', description: 'Drone perspective at 45-degree angle, showing the location from an elevated diagonal viewpoint. Reveal both the ground plan and vertical structure simultaneously.' },
  { name: '정면 파사드', description: 'Straight-on frontal view of the main facade or entrance. Capture architectural details, signage, and the primary visual impression a visitor would see upon approach.' },
  { name: '내부 와이드', description: 'Wide interior shot showing the full internal space. Capture ceiling height, floor plan, lighting conditions, furniture/props placement, and overall atmosphere of the indoor environment.' },
  { name: '내부 디테일', description: 'Close-up interior detail shot focusing on textures, materials, decorative elements, or distinctive features. Show wall surfaces, flooring patterns, fixtures, and tactile qualities of the space.' },
  { name: '측면 프로필', description: 'Side profile view of the location showing depth and layered structures. Capture the building or environment from a 90-degree lateral angle to reveal proportion and side details.' },
  { name: '후면/이면', description: 'Rear or backside view of the location. Show service areas, back entrances, hidden courtyards, or the less curated side that reveals practical functionality.' },
  { name: '골든아워 석양', description: 'Golden hour sunset lighting on the location. Warm amber tones, long shadows, dramatic sky gradient. Capture how the location transforms under golden hour cinematographic lighting.' },
  { name: '야간 / 블루아워', description: 'Night or blue hour view of the location. Show artificial lighting, neon signs, moonlight, street lamps, and the moody atmospheric quality of the space after dark.' },
  { name: '날씨 변형 (우천/안개)', description: 'The location under dramatic weather conditions — rain, fog, mist, or overcast skies. Wet reflections on surfaces, atmospheric haze, and moody diffused lighting.' },
  { name: '인물 스케일 참조', description: 'The location with a human figure for scale reference. Place a single person naturally within the environment to demonstrate the proportional relationship between human and space.' },
];

export const ACTION_STEPS = [
  '준비 동작',
  '도약',
  '발차기 진입',
  '공중 회전',
  '무기끼리 근접 매크로 충돌',
  '슬로모션 잔상 연출',
  '타격 시작',
  '임팩트',
  '충돌 스파크 분출',
  '카메라 쉐이크 강타',
  '공간 파괴',
  '파편/잔해 비산',
  '반동',
  '역광 실루엣 강조',
  '착지 준비',
  '착지 및 먼지',
  '피니시',
];
