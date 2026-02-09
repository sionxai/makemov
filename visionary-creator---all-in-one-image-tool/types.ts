
export enum ToolMode {
  MULTI_ANGLE = 'MULTI_ANGLE',
  CHARACTER_SHEET = 'CHARACTER_SHEET',
  ACTION_SCENE = 'ACTION_SCENE',
  TONE_MANNER = 'TONE_MANNER'
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export interface GeneratedImage {
  id: string;
  url: string;
  label: string;
}

export interface AngleDefinition {
  name: string;
  description: string;
}

export const CINEMATIC_ANGLES: AngleDefinition[] = [
  { name: "익스트림 롱 샷 (ELS)", description: "인물이 아주 작고 환경/스케일이 주인공인 구도" },
  { name: "롱 샷 / 풀 샷 (LS / FS)", description: "인물 전신 중심. 동선/액션/블로킹 보여주기" },
  { name: "미디엄 롱 / 아메리칸 샷 (MLS)", description: "허벅지~머리(또는 무릎 위). 대화+몸짓 균형" },
  { name: "미디엄 샷 (MS)", description: "허리~머리. 드라마 대사의 기본 커버리지" },
  { name: "미디엄 클로즈업 (MCU)", description: "가슴~머리. 감정이 잘 읽히는 표준 감정 거리" },
  { name: "클로즈업 (CU)", description: "얼굴 중심. 리액션/감정 강조" },
  { name: "익스트림 클로즈업 (ECU)", description: "눈/입/손/트리거 같은 디테일로 긴장 극대화" },
  { name: "투 샷 (Two-Shot)", description: "두 인물을 한 프레임에. 관계/거리/권력 구도" },
  { name: "오버 더 숄더 (OTS)", description: "전경에 어깨/뒷머리를 걸고 상대를 담는 대화 구도" },
  { name: "POV 샷 (주관샷)", description: "인물이 보는 그대로. 몰입/공포/스릴" },
  { name: "하이 앵글", description: "카메라가 위에서 아래로. 피사체를 작게/약하게 압박" },
  { name: "로우 앵글", description: "아래에서 위로. 위압감/권위/영웅성 또는 불안감" },
  { name: "탑샷 (버드아이뷰)", description: "수직에 가깝게 위에서 내려다보는 구도. 동선/구조" },
  { name: "더치 앵글", description: "수평을 일부러 기울임. 불안, 혼란, 비틀린 심리" },
  { name: "인서트 샷", description: "물건/손동작/단서 등 정보 전달용 디테일 컷" }
];
