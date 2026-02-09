// 동래성 최후의 하루 - 시드 데이터 (agent-guide 스키마 준수)

export const DONGNAE_SYNOPSIS = {
  title: '동래성 최후의 하루',
  titleEn: 'THE LAST DAY OF DONGNAE FORTRESS',
  info: {
    genre: '역사 전쟁 드라마',
    runtime: '12분 단편',
    tone: '긴장, 결의, 비장, 침묵의 여운',
    audience: '역사 콘텐츠 애호가, 한국사 학습자, 시네마틱 단편 시청자',
    format: 'AI 영상 생성 기반 시네마틱 단편 (16:9)',
  },
  logline:
    '1592년 4월, 임진왜란의 파도가 부산 앞바다를 넘어 동래성에 닿는다. 항복을 권하는 서신 앞에서 동래부사 송상현은 끝까지 성문을 지키고, 하루 동안의 항전은 패배 속에서도 한 도시의 존엄을 남긴다.',
  theme:
    '패배가 예정된 순간에도 인간은 선택으로 존엄을 증명한다. 동래성 전투는 승리의 기록이 아니라 책임과 의리의 기록이다.',
  acts: [
    {
      title: '도입',
      subtitle: '새벽 전야 - 불길한 바다',
      content:
        '1592년 4월의 새벽, 동래읍성 바깥 바다는 검은 돛으로 가득 찬다. 급보를 들고 달려온 전령은 부산진이 이미 붕괴 직전이라 말하고, 성 안의 군민은 공포와 침묵 속에서 밤을 맞는다.\n\n송상현은 관아 마당에서 군관들과 마지막 회의를 열고, 성문을 닫은 채 하루라도 더 버티겠다고 선언한다. 도망칠 길을 열어두자는 의견이 나오지만 그는 동래가 무너지면 한양까지 공포가 번진다고 답한다.',
    },
    {
      title: '전개',
      subtitle: '오전 - 항복 권유와 첫 공성',
      content:
        '일본군 사자가 성문 앞에 서신을 내밀며 항복을 요구한다. 성벽 위 병사들은 흔들리지만, 송상현은 단호히 거절한다.\n\n곧바로 조총 사격과 사다리 돌격이 시작된다. 성벽 위에서는 화살과 돌이 쏟아지고, 군민들은 물과 화살을 나르며 병사들을 돕는다. 동래의 오전은 이미 전쟁의 한가운데로 빨려 들어간다.',
    },
    {
      title: '위기',
      subtitle: '정오 - 성벽 붕괴와 시가전',
      content:
        '정오 무렵, 서문 인근 성벽 일부가 무너지고 일본군이 성 안으로 밀려든다. 좁은 골목마다 백병전이 벌어지고, 부상자는 관아 마당으로 끊임없이 실려 온다.\n\n송상현은 후퇴 대신 객사 앞 최후 방어선을 지시한다. 군사 수는 급격히 줄고 탄약은 바닥나지만, 남은 이들은 서로의 이름을 부르며 마지막 진형을 유지한다.',
    },
    {
      title: '결말',
      subtitle: '오후-밤 - 최후의 결의',
      content:
        '객사 앞 마지막 교전에서 송상현은 중상을 입고도 물러서지 않는다. 그는 끝내 항복하지 않고 쓰러지고, 해가 진 뒤 동래성은 완전히 함락된다.\n\n불타는 관아와 무너진 성문 위로 밤안개가 내려앉는다. 다음 날 아침, 전장에 남은 깃발과 침묵이 동래의 하루를 증언한다. 자막은 짧게 묻는다. "무너진 성은 사라져도, 선택은 사라지는가."',
    },
  ],
  characters: [
    {
      name: '송상현',
      nameHanja: '宋象賢',
      role: '동래부사, 수성 지휘관',
      age: '40대 후반',
      appearance: '검은 관복 위 급히 덧댄 갑옷, 지친 눈가, 단정한 수염',
      personality: '신중하고 강직하며, 두려움을 숨긴 채 책임을 짊어지는 성품',
      motivation: '동래의 붕괴를 최대한 늦추고 군민의 탈출 시간을 확보하려는 의지',
      arc: '행정관 -> 결단하는 지휘관 -> 죽음으로 책임을 완수한 인물',
    },
    {
      name: '이각',
      nameHanja: '李珏',
      role: '동래 군관',
      age: '30대',
      appearance: '흙먼지와 피가 묻은 전투복, 이마의 상처',
      personality: '직선적이고 거칠지만 부하를 끝까지 챙기는 인물',
      motivation: '상관의 명령을 지키고 남은 병사를 끝까지 이끄는 것',
      arc: '충동적인 장수 -> 잔여 병력의 중심축 -> 최후 방어선의 선봉',
    },
    {
      name: '고니시 유키나가',
      nameHanja: '小西行長',
      role: '일본군 지휘관',
      age: '30대 후반',
      appearance: '검은 갑주와 화려한 투구 장식, 냉정한 눈빛',
      personality: '계산적이며 신속한 공성으로 상대를 압도하려는 성향',
      motivation: '개전 초반의 속전속결과 진격로 확보',
      arc: '항복 권유자 -> 공성 지휘자 -> 함락의 승자(그러나 침묵 속 퇴장)',
    },
    {
      name: '동래 군민들',
      nameHanja: '',
      role: '방어 보조와 생존자들',
      age: '다양',
      appearance: '평민복과 작업복, 먼지와 연기에 젖은 얼굴',
      personality: '두려움 속에서도 서로를 붙드는 연대감',
      motivation: '가족을 지키고 성 안의 시간을 하루라도 벌기 위함',
      arc: '피난민 -> 수성 참여자 -> 전투의 증언자',
    },
  ],
  visualTone: {
    palette: '새벽의 청회색 -> 오전의 흙빛/철색 -> 정오의 탁한 적갈색 -> 밤의 먹색과 불꽃 주황',
    lighting: '자연광 중심, 연기와 화염광을 보조광으로 사용. 후반부로 갈수록 콘트라스트 상승.',
    camera: '도입은 느린 와이드, 전투는 핸드헬드와 짧은 컷, 결말은 고정 롱테이크로 침묵 강조.',
    references: '명량, 1917, 안시성, 한국 사극 회화 톤',
  },
  sound: {
    bgm: '대금 저음 드론과 북 리듬, 후반부는 현악 저역 중심으로 축소',
    sfx: '조총 발사음, 성문 충돌음, 화재의 타는 소리, 군중 웅성, 바람',
    narration: '내레이션 없음. 필요한 정보는 자막과 현장음으로 전달.',
  },
  keyScenes: [
    { title: '검은 돛', description: '새벽 바다를 뒤덮는 일본군 함대의 실루엣' },
    { title: '서신', description: '항복 권유 문서를 받아든 송상현의 침묵' },
    { title: '첫 사다리', description: '성벽을 타고 오르는 첫 공성 파도' },
    { title: '무너진 서문', description: '정오 붕괴와 동시에 시작된 시가전' },
    { title: '객사 앞 진형', description: '남은 병력이 마지막 방어선을 맞추는 장면' },
    { title: '마지막 명령', description: '송상현의 최후 지휘와 낙하하는 깃발' },
    { title: '다음 날 아침', description: '연기 사이로 보이는 빈 성문과 정적' },
  ],
};

export const DONGNAE_PROJECT = {
  id: 'proj_dongnae_last_day',
  title: '동래성 최후의 하루',
  description: '1592년 임진왜란 초기 동래성 전투를 다룬 역사 시네마틱 프로젝트',
  status: 'progress',
};

export const DONGNAE_SCREENPLAY = [
  {
    number: 1,
    scene_id: 'S1',
    heading: 'EXT. 동래 앞바다 / 성벽 - 새벽',
    action:
      '새벽 안개 위로 검은 돛이 끝없이 이어진다. 성벽 위 망루에서 군관들이 북소리를 듣고 서로 눈빛을 교환한다. 카메라는 바다에서 성벽으로 천천히 이동한다.',
    dialogue:
      '전령: 부산진에서 급보입니다! 적선이 이미 육지에 닿았습니다.\n송상현: (짧게) 성문을 닫아라. 오늘은 동래의 시간이다.',
    notes: 'EWS 드론 샷으로 시작, 차가운 톤. 북소리와 바람으로 불안감 형성.',
  },
  {
    number: 2,
    scene_id: 'S2',
    heading: 'EXT. 동래성 남문 - 아침',
    action:
      '일본군 사자가 백기를 들고 성문 앞에 멈춘다. 성벽 위 병사들의 표정이 흔들린다. 송상현은 서신을 읽고 조용히 접어 불에 태운다.',
    dialogue:
      '사자: 성문을 열면 목숨을 보장하겠다.\n송상현: (성벽 위에서) 답은 이미 정해져 있다.',
    notes: 'MS와 CU 교차편집. 대사 직후 무음 1초로 결단 강조.',
  },
  {
    number: 3,
    scene_id: 'S3',
    heading: 'EXT. 동래성 서문 성벽 - 오전',
    action:
      '조총 연기가 성벽을 덮고 사다리가 일제히 올라온다. 병사와 군민이 돌과 화살을 옮긴다. 핸드헬드 카메라가 전선 사이를 가르며 움직인다.',
    dialogue:
      '이각: 서문 집중! 사다리부터 끊어!\n군민: 물이다! 화살 더 가져와!',
    notes: '빠른 컷 편집. 금속 충돌과 조총음을 리듬처럼 배치.',
  },
  {
    number: 4,
    scene_id: 'S4',
    heading: 'INT/EXT. 동래성 내부 골목 - 정오',
    action:
      '서문 일부가 무너지고 적군이 성 안으로 밀려든다. 좁은 골목에서 근접전이 벌어진다. 부상자들이 관아 마당으로 옮겨진다.',
    dialogue:
      '이각: 객사 앞으로 모여! 흩어지면 끝이다!\n송상현: (피 묻은 손으로) 줄을 맞춰라. 여기서 끊는다.',
    notes: '로우앵글과 숄더캠 위주. 먼지와 연기로 시야 제한.',
  },
  {
    number: 5,
    scene_id: 'S5',
    heading: 'EXT. 동래 객사 앞 - 오후',
    action:
      '남은 병력이 마지막 진형을 만든다. 송상현은 중상을 입고도 칼을 내려놓지 않는다. 깃발이 천천히 무너지고 전장은 정적에 잠긴다.',
    dialogue:
      '송상현: (숨을 고르며) 성이 무너져도 뜻은 남는다.\n이각: ...끝까지 따르겠습니다.',
    notes: '슬로우 모션 최소화. 고정 롱샷으로 체념과 결의 동시 표현.',
  },
  {
    number: 6,
    scene_id: 'S6',
    heading: 'EXT. 동래성 성문 / 객사 터 - 밤에서 새벽',
    action:
      '불타는 관아와 무너진 성문. 밤이 지나고 새벽빛이 들어오자 전장의 소음이 사라진다. 카메라는 빈 성문을 오래 응시한다.',
    dialogue:
      '자막: 1592년 4월, 동래성 함락.\n자막: 하루의 항전은 조선 전역에 전쟁의 현실을 알렸다.',
    notes: '무음에 가까운 사운드 디자인. 마지막 컷은 6초 이상 정지 프레임처럼 유지.',
  },
];

// -- 시네마틱 실사 프롬프트 상수 (storyboard + cinematic_prompt 스킬 기준) --
const DONGNAE_PROMPT_PREFIX =
  'Photorealistic cinematic still photograph, 16:9, 8K. Shot on ARRI Alexa 65 with Panavision anamorphic 40mm lens. 1592, Joseon Dynasty Korea, Battle of Dongnae Fortress, Imjin War.';
const DONGNAE_COMMANDER =
  'Korean Joseon governor commander Song Sang-hyeon, late 40s, black official robe under dark lacquered brigandine armor, oxidized iron studs, Korean war helmet with tied chin strap, weathered East Asian face, short beard, natural skin texture with pores and sweat';
const DONGNAE_DEFENDER =
  'Korean Joseon defenders in worn iron-plated armor (두정갑), cotton underlayers soaked with sweat, topknot hair, battered wooden shields, natural East Asian faces';
const DONGNAE_CIVILIAN =
  'Korean civilians in rough hemp hanbok workwear carrying water jars and arrow bundles, dust-covered fabric weave, frightened but determined expressions';
const DONGNAE_JAPANESE =
  'Japanese ashigaru and samurai in black lacquered do-maru armor, kabuto helmets with metal crests, matchlock guns (teppo), mud-stained war banners';
const DONGNAE_FORTRESS =
  'Dongnae fortress stone walls and wooden gate towers, rough-hewn granite blocks, burnt timber beams, narrow Joseon-era alleys';
const DONGNAE_NEG =
  'Real human faces, real armor textures, real fabric weave. NOT illustration, NOT painting, NOT anime, NOT drawing, NOT 3D render, NOT CGI, NOT fantasy armor, NOT modern uniforms.';

export const DONGNAE_CONTI = {
  title: '동래성 최후의 하루 - 줄콘티',
  totalDuration: '약 4분 20초',
  promptContext: {
    era: '1592, Joseon Dynasty Korea, Battle of Dongnae Fortress, Imjin War.',
    culture:
      'Joseon defenders: twojeong-gap armor, topknot, Korean fortress architecture. Japanese attackers: ashigaru/samurai armor, kabuto helmets, matchlock infantry.',
    negatives:
      'Real human faces, real armor textures, real fabric weave. NOT illustration, NOT painting, NOT anime, NOT drawing, NOT 3D render, NOT CGI.',
  },
  scenes: [
    {
      scene_id: 'S1',
      heading: 'EXT. 동래 앞바다 / 성벽 - 새벽',
      scene_tc_start: '00:00.0',
      scene_tc_end: '00:48.0',
      cuts: [
        {
          cut_id: 'S1-C1',
          tc_start: '00:00.0',
          tc_end: '00:24.0',
          duration_sec: 24,
          shot: 'EWS',
          angle: 'High Angle',
          camera_move: 'SLOW DOLLY IN',
          visual: '안개 낀 바다를 가득 메운 검은 돛과 동래성 전경',
          dialogue: '',
          sfx: '바람, 먼 북소리',
          bgm: '대금 저음 드론',
          transition_out: 'DISSOLVE',
          sketch_prompt:
            `${DONGNAE_PROMPT_PREFIX} Blue-hour dawn over Busan coast, heavy sea fog and cold wind. ${DONGNAE_FORTRESS} seen from high aerial angle while hundreds of black war sails emerge through mist. ${DONGNAE_JAPANESE} fleet massing offshore. Ominous, anticipatory atmosphere. Diffused soft light through fog, volumetric mist, deep perspective layering, subtle anamorphic lens flare. Cool blue-grey desaturated grading, Kodak Vision3 film emulation, gritty film grain. ${DONGNAE_NEG}`,
          keyvisual_priority: 'high',
        },
        {
          cut_id: 'S1-C2',
          tc_start: '00:24.0',
          tc_end: '00:48.0',
          duration_sec: 24,
          shot: 'MCU',
          angle: 'Eye Level',
          camera_move: 'SLOW PUSH IN',
          visual: '성벽 위 송상현의 얼굴, 뒤편으로 흔들리는 깃발',
          dialogue: '송상현: 성문을 닫아라. 오늘은 동래의 시간이다.',
          sfx: '깃발 천소리',
          bgm: '저역 현악 합류',
          transition_out: 'CUT TO',
          sketch_prompt:
            `${DONGNAE_PROMPT_PREFIX} Dawn light with lingering fog on fortress wall. ${DONGNAE_COMMANDER} in medium close-up, eyes fixed toward sea, war flag whipping behind him. Quiet resolve and dread coexist. Side backlight with soft rim on helmet edge, shallow depth of field, micro-contrast on beard and armor rivets, faint atmospheric haze. Cool muted palette with low saturation and cinematic grain. ${DONGNAE_NEG}`,
          keyvisual_priority: 'high',
        },
      ],
    },
    {
      scene_id: 'S2',
      heading: 'EXT. 동래성 남문 - 아침',
      scene_tc_start: '00:48.0',
      scene_tc_end: '01:36.0',
      cuts: [
        {
          cut_id: 'S2-C1',
          tc_start: '00:48.0',
          tc_end: '01:10.0',
          duration_sec: 22,
          shot: 'MS',
          angle: 'Eye Level',
          camera_move: 'FIXED',
          visual: '항복 서신을 들고 선 사자와 긴장한 성문 수비대',
          dialogue: '사자: 성문을 열면 목숨을 보장하겠다.',
          sfx: '말발굽, 갑옷 마찰음',
          bgm: '음악 거의 없음',
          transition_out: 'CUT TO',
          sketch_prompt:
            `${DONGNAE_PROMPT_PREFIX} Early morning at fortress south gate under pale sunlight. Japanese envoy under white truce flag stands before closed gate while ${DONGNAE_DEFENDER} line the battlements with trembling tension. ${DONGNAE_JAPANESE} armor textures and banners visible in mid-ground. Suspended silence before violence. Natural hard morning key light with soft bounced fill from stone walls, restrained contrast, slight lens breathing. Desaturated earth-and-steel palette with film grain. ${DONGNAE_NEG}`,
          keyvisual_priority: 'medium',
        },
        {
          cut_id: 'S2-C2',
          tc_start: '01:10.0',
          tc_end: '01:36.0',
          duration_sec: 26,
          shot: 'CU',
          angle: '3/4 Profile',
          camera_move: 'FIXED',
          visual: '송상현이 서신을 접어 횃불에 태우는 손 클로즈업',
          dialogue: '송상현: 답은 이미 정해져 있다.',
          sfx: '종이 타는 소리',
          bgm: '짧은 북 타격',
          transition_out: 'SMASH CUT',
          sketch_prompt:
            `${DONGNAE_PROMPT_PREFIX} Close-up, three-quarter profile framing at gate parapet. ${DONGNAE_COMMANDER} hands fold surrender letter and hold it over torch flame; ash curls upward and embers scatter. Defiance, precision, and finality. Warm practical flame as key light against cool ambient morning fill, chiaroscuro on knuckles and sleeve fibers, macro paper texture, shallow depth of field. Warm-cool split grading, high local detail, gritty grain. ${DONGNAE_NEG}`,
          keyvisual_priority: 'high',
        },
      ],
    },
    {
      scene_id: 'S3',
      heading: 'EXT. 서문 성벽 - 오전',
      scene_tc_start: '01:36.0',
      scene_tc_end: '02:30.0',
      cuts: [
        {
          cut_id: 'S3-C1',
          tc_start: '01:36.0',
          tc_end: '02:00.0',
          duration_sec: 24,
          shot: 'WS',
          angle: 'Low Angle',
          camera_move: 'HANDHELD PAN',
          visual: '사다리 돌격과 조총 연기 속 성벽 전투',
          dialogue: '이각: 사다리부터 끊어!',
          sfx: '조총 발사, 함성, 금속 충돌',
          bgm: '타악기 리듬 가속',
          transition_out: 'CUT TO',
          sketch_prompt:
            `${DONGNAE_PROMPT_PREFIX} Late morning siege assault at west wall, low-angle wide frame with chaotic motion. ${DONGNAE_JAPANESE} rush ladders through matchlock smoke while ${DONGNAE_DEFENDER} push down poles and strike from battlements. Violent urgency and compressed space. Harsh sun filtered by black powder haze, directional rim highlights on wet metal, handheld motion blur at frame edges, particle-rich air. Gritty desaturated war grade with heavy grain and high contrast. ${DONGNAE_NEG}`,
          keyvisual_priority: 'high',
        },
        {
          cut_id: 'S3-C2',
          tc_start: '02:00.0',
          tc_end: '02:30.0',
          duration_sec: 30,
          shot: 'MS',
          angle: 'Eye Level',
          camera_move: 'TRACKING',
          visual: '군민들이 화살과 물을 나르며 전선을 지탱',
          dialogue: '군민: 화살 더 왔다! 물 비켜!',
          sfx: '달리는 발소리, 통 부딪힘',
          bgm: '현악 저음 유지',
          transition_out: 'CUT TO',
          sketch_prompt:
            `${DONGNAE_PROMPT_PREFIX} Mid-shot tracking through inner corridor. ${DONGNAE_CIVILIAN} sprint with arrow bundles and water jars between wounded soldiers, skirts and sleeves soaked with mud. ${DONGNAE_FORTRESS} alley textures emphasize claustrophobic logistics under fire. Breathless solidarity and fear. Overhead daylight broken by smoke plumes, soft shadow transitions, bokeh highlights on metal jar rims, slight anamorphic distortion. Muted brown-grey palette with documentary grain. ${DONGNAE_NEG}`,
          keyvisual_priority: 'medium',
        },
      ],
    },
    {
      scene_id: 'S4',
      heading: 'INT/EXT. 성내 골목 - 정오',
      scene_tc_start: '02:30.0',
      scene_tc_end: '03:18.0',
      cuts: [
        {
          cut_id: 'S4-C1',
          tc_start: '02:30.0',
          tc_end: '02:54.0',
          duration_sec: 24,
          shot: 'WS',
          angle: 'Eye Level',
          camera_move: 'SHAKY HANDHELD',
          visual: '붕괴된 성벽 틈으로 밀려드는 적과 성내 혼전',
          dialogue: '',
          sfx: '붕괴음, 비명, 검 격돌',
          bgm: '저음 드론 + 북',
          transition_out: 'CUT TO',
          sketch_prompt:
            `${DONGNAE_PROMPT_PREFIX} Noon breach aftermath in narrow inner streets. Collapsed stone section of ${DONGNAE_FORTRESS} spills rubble while ${DONGNAE_JAPANESE} force entry and clash with ${DONGNAE_DEFENDER} at arm's length. Dust, splinters, and smoke choke the air. Panic and violent compression. Hard overhead sunlight cutting through debris clouds, stark chiaroscuro pockets, lens flare streaks, suspended particles, rough handheld cadence. Desaturated rust-grey war palette with gritty grain. ${DONGNAE_NEG}`,
          keyvisual_priority: 'high',
        },
        {
          cut_id: 'S4-C2',
          tc_start: '02:54.0',
          tc_end: '03:18.0',
          duration_sec: 24,
          shot: 'MCU',
          angle: 'Low Angle',
          camera_move: 'SLOW PUSH IN',
          visual: '피 묻은 송상현이 객사 앞 방어선 집결 명령',
          dialogue: '송상현: 줄을 맞춰라. 여기서 끊는다.',
          sfx: '거친 호흡, 먼 총성',
          bgm: '음악 급감, 저역만 유지',
          transition_out: 'CUT TO',
          sketch_prompt:
            `${DONGNAE_PROMPT_PREFIX} Medium close-up low angle in front of guest hall. ${DONGNAE_COMMANDER} blood-smeared sleeve gripping sword hilt while issuing final formation order; exhausted defenders blur behind him. Command presence under collapse. Backlit smoke creates silver edge light, hard key from noon sun, deep shadow across one cheek in Rembrandt-like triangle, shallow depth with crisp skin and fabric microtexture. Cold steel-and-ash grading with restrained saturation and film grain. ${DONGNAE_NEG}`,
          keyvisual_priority: 'high',
        },
      ],
    },
    {
      scene_id: 'S5',
      heading: 'EXT. 객사 앞 / 성문 - 오후-새벽',
      scene_tc_start: '03:18.0',
      scene_tc_end: '04:20.0',
      cuts: [
        {
          cut_id: 'S5-C1',
          tc_start: '03:18.0',
          tc_end: '03:46.0',
          duration_sec: 28,
          shot: 'LS',
          angle: 'Eye Level',
          camera_move: 'STATIC',
          visual: '최후 방어선에서 깃발이 쓰러지고 송상현이 무릎을 꿇는다',
          dialogue: '송상현: 성이 무너져도 뜻은 남는다.',
          sfx: '불타는 소리, 먼 함성',
          bgm: '현악 단음 지속',
          transition_out: 'FADE TO BLACK',
          sketch_prompt:
            `${DONGNAE_PROMPT_PREFIX} Late afternoon long shot, static composition at guest hall forecourt. Torn battle flag collapses as ${DONGNAE_COMMANDER} drops to one knee amid scattered bodies and burning beams. Tragic dignity, last resistance ending. Warm fire practicals mix with dying daylight, deep long shadows, smoke veil creating layered depth, subtle lens bloom on embers. Desaturated amber-charcoal grading, high dynamic contrast, cinematic grain. ${DONGNAE_NEG}`,
          keyvisual_priority: 'high',
        },
        {
          cut_id: 'S5-C2',
          tc_start: '03:46.0',
          tc_end: '04:20.0',
          duration_sec: 34,
          shot: 'EWS',
          angle: 'High Angle',
          camera_move: 'LOCKED-OFF',
          visual: '다음 날 새벽, 연기 자욱한 빈 성문과 멈춘 전장',
          dialogue: '자막: 1592년 4월, 동래성 함락.',
          sfx: '바람, 아주 멀리 새소리',
          bgm: '거의 무음',
          transition_out: 'END',
          sketch_prompt:
            `${DONGNAE_PROMPT_PREFIX} Dawn after battle, high-angle extreme wide frame held in silence. Broken gate of ${DONGNAE_FORTRESS}, burnt timbers, abandoned weapons, thin smoke drifting across empty ground. Aftermath, grief, and stillness. Cool moonlight-to-dawn transition with soft ambient fill, low-contrast fog layers, no motion blur, long-lens compression feel. Blue-grey monochrome leaning grade, subtle film grain, solemn archival realism. ${DONGNAE_NEG}`,
          keyvisual_priority: 'high',
        },
      ],
    },
  ],
  assumptions: [
    '역사 세부 수치(정확 병력/시각)는 연출상 범용 표현으로 단순화했다.',
    '인물 대사는 기록 문구 직인용 대신 영상화 목적의 현대 한국어로 정리했다.',
  ],
};

export const DONGNAE_STORYBOARD = DONGNAE_CONTI.scenes.flatMap((scene) =>
  scene.cuts.map((cut) => ({
    cut_id: cut.cut_id,
    imageUrl: '',
  }))
);

export const DONGNAE_KEYVISUALS = [
  {
    id: 'kv_dongnae_001',
    title: '검은 돛의 새벽',
    scene: '1',
    prompt:
      'Photorealistic cinematic aerial shot of dawn sea filled with dark Japanese war sails approaching Dongnae fortress, cold mist, tense historical war mood, 16:9.',
    imageUrl: '',
    createdAt: '2026-02-07T12:00:00Z',
  },
  {
    id: 'kv_dongnae_002',
    title: '서신을 태우는 손',
    scene: '2',
    prompt:
      'Photorealistic close-up of Joseon commander burning surrender letter over torch flame, embers, armor texture, symbolic refusal, dramatic contrast lighting.',
    imageUrl: '',
    createdAt: '2026-02-07T12:05:00Z',
  },
  {
    id: 'kv_dongnae_003',
    title: '붕괴된 서문',
    scene: '4',
    prompt:
      'Photorealistic wide shot of breached fortress wall and chaotic alley combat inside Dongnae, smoke, debris, handheld war realism, noon haze.',
    imageUrl: '',
    createdAt: '2026-02-07T12:10:00Z',
  },
  {
    id: 'kv_dongnae_004',
    title: '최후의 방어선',
    scene: '5',
    prompt:
      'Photorealistic long shot of final defensive line at Dongnae guest hall, falling flag, wounded commander still standing, firelit dusk tragedy.',
    imageUrl: '',
    createdAt: '2026-02-07T12:15:00Z',
  },
];

export const DONGNAE_PROMPTS = [
  {
    id: 'pr_dongnae_001',
    type: 'sora',
    title: '오프닝 - 검은 돛의 접근',
    scene: '1',
    prompt:
      'Cinematic aerial opening over dawn coast near Dongnae fortress in 1592. Hundreds of dark sails emerge through sea fog. Camera slowly descends from extreme wide to fortress wall where Korean defenders realize the scale of invasion. Cold blue-gray palette, low wind rumble, no dialogue.',
    createdAt: '2026-02-07T12:20:00Z',
  },
  {
    id: 'pr_dongnae_002',
    type: 'runway',
    title: '항복 서신 거절',
    scene: '2',
    prompt:
      'Medium-close historical drama shot at fortress gate. Korean commander reads surrender letter and burns it over torch flame. Hold one beat of silence after line delivery. Natural morning light, smoke particles, tense expressions.',
    createdAt: '2026-02-07T12:25:00Z',
  },
  {
    id: 'pr_dongnae_003',
    type: 'sora',
    title: '성벽 붕괴와 시가전',
    scene: '4',
    prompt:
      'Handheld war sequence inside Dongnae fortress right after wall breach. Dust, matchlock smoke, narrow alley combat. Alternate short 2-3 second beats between defenders and attackers. Keep camera close to faces and armor texture.',
    createdAt: '2026-02-07T12:30:00Z',
  },
  {
    id: 'pr_dongnae_004',
    type: 'pika',
    title: '엔딩 - 침묵의 성문',
    scene: '6',
    prompt:
      'Static wide shot at dawn after battle: empty broken fortress gate, drifting smoke, no visible crowd, almost silent atmosphere. End with subtitle fade-in.',
    createdAt: '2026-02-07T12:35:00Z',
  },
];
