/**
 * 玉勅代天府德慈宮 - V5 總設定檔
 * 升級包含：
 * - 全新原創台灣廟埕文創 8 款角色（老中青小孩男女，原創服裝飾品零雷同）
 * - 修正天公爐站位：位於靠廟那側 (z = 12.6)，面向外三拜後直接往前插香
 * - 拜主神（中央走道正面神明）與 36 拜墊（純粹靜坐念經）功能完全獨立
 * - 廟宇後方增設男女廁所互動區
 * - 全面清除內部開發指令字樣
 */
export const AVATAR_PRESETS = [
  {
    id: 'elderMale',
    name: '茶香阿公',
    ageGroup: '長輩',
    gender: '男',
    subtitle: '青玉圓框鏡・靛藍苧麻衫',
    swatchA: '#325368',
    swatchB: '#D9C7A7',
    shirtColor: 0x325368,
    pantsColor: 0x4A443C,
    hairColor: 0xE8E5DE,
    scale: 0.98,
    hairStyle: 'elderPart',
    accessory: 'jadeGlasses'
  },
  {
    id: 'elderFemale',
    name: '花布阿嬤',
    ageGroup: '長輩',
    gender: '女',
    subtitle: '牡丹紅髮帶・藕紫盤扣衫',
    swatchA: '#8E4B63',
    swatchB: '#E6685C',
    shirtColor: 0x8E4B63,
    pantsColor: 0x4B4046,
    hairColor: 0xD8D4CC,
    scale: 0.93,
    hairStyle: 'grandmaBun',
    accessory: 'floralBand'
  },
  {
    id: 'middleMale',
    name: '廟藝匠師',
    ageGroup: '中年',
    gender: '男',
    subtitle: '手染藍工裝圍裙・金繡帶',
    swatchA: '#2D5A50',
    swatchB: '#26436E',
    shirtColor: 0x2D5A50,
    pantsColor: 0x363D42,
    hairColor: 0x2A2320,
    scale: 1.04,
    hairStyle: 'neatPart',
    accessory: 'craftApron'
  },
  {
    id: 'middleFemale',
    name: '奉茶姊姊',
    ageGroup: '中年',
    gender: '女',
    subtitle: '精緻小竹笠・陶紅亞麻披肩',
    swatchA: '#B8543B',
    swatchB: '#E2C38B',
    shirtColor: 0xB8543B,
    pantsColor: 0x624E42,
    hairColor: 0x36241D,
    scale: 0.97,
    hairStyle: 'lowPonytail',
    accessory: 'bambooConical'
  },
  {
    id: 'youngMale',
    name: '廟埕攝影師',
    ageGroup: '青年',
    gender: '男',
    subtitle: '復古底片機・薑黃機能背心',
    swatchA: '#D1912E',
    swatchB: '#3A4A5E',
    shirtColor: 0xD1912E,
    pantsColor: 0x3A4A5E,
    hairColor: 0x241E1C,
    scale: 1.01,
    hairStyle: 'messyWave',
    accessory: 'retroCamera'
  },
  {
    id: 'youngFemale',
    name: '手作少女',
    ageGroup: '青年',
    gender: '女',
    subtitle: '紅金小獅髮夾・湖青漢短襖',
    swatchA: '#3E8E87',
    swatchB: '#E55A4A',
    shirtColor: 0x3E8E87,
    pantsColor: 0xE6D7BE,
    hairColor: 0x332220,
    scale: 0.95,
    hairStyle: 'braids',
    accessory: 'lionClip'
  },
  {
    id: 'childBoy',
    name: '小舞獅弟',
    ageGroup: '小孩',
    gender: '男',
    subtitle: '超萌紅金獅頭帽・明黃背心',
    swatchA: '#D6382E',
    swatchB: '#F2C14E',
    shirtColor: 0xF2C14E,
    pantsColor: 0x365B7C,
    hairColor: 0x2A1F1B,
    scale: 0.76,
    hairStyle: 'short',
    accessory: 'lionHat'
  },
  {
    id: 'childGirl',
    name: '小燈籠妹',
    ageGroup: '小孩',
    gender: '女',
    subtitle: '迷你雙紅燈籠飾・桃粉雲領',
    swatchA: '#E8737A',
    swatchB: '#F7D275',
    shirtColor: 0xE8737A,
    pantsColor: 0xB85560,
    hairColor: 0x30201C,
    scale: 0.74,
    hairStyle: 'twinBuns',
    accessory: 'lanternPins'
  }
];

export const LIGHTING_THEMES = {
  day: {
    skyColor: '#9AC0B2',
    fogColor: '#A6C8BC',
    sunColor: '#FFF0D4',
    sunIntensity: 1.48,
    hemiSky: '#F5EAD0',
    hemiGround: '#6B8C6A',
    hemiIntensity: 0.76,
    fillColor: '#C4E0E8',
    fillIntensity: 0.32,
    shrineLightIntensity: 2.0,
    furnaceLightIntensity: 1.5,
    lanternEmissive: 0.44,
    nightFactor: 0
  },
  night: {
    skyColor: '#132738',
    fogColor: '#183042',
    sunColor: '#A6C2F5',
    sunIntensity: 0.88,
    hemiSky: '#8AA8DF',
    hemiGround: '#2A3646',
    hemiIntensity: 0.88,
    fillColor: '#5675A8',
    fillIntensity: 0.48,
    shrineLightIntensity: 7.4,
    furnaceLightIntensity: 4.2,
    lanternEmissive: 2.1,
    nightFactor: 1
  }
};

function generate36KneelMats() {
  const mats = [];
  const leftCols = [-5.3, -3.85, -2.4];
  const rightCols = [2.4, 3.85, 5.3];
  const rowsZ = [-3.2, -1.7, -0.2, 1.3, 2.8, 4.3];
  let idx = 1;
  rowsZ.forEach((z, r) => {
    leftCols.forEach((x, c) => {
      mats.push({ id: `L-${r + 1}-${c + 1}`, index: idx++, side: 'left', x, z });
    });
    rightCols.forEach((x, c) => {
      mats.push({ id: `R-${r + 1}-${c + 1}`, index: idx++, side: 'right', x, z });
    });
  });
  return mats;
}

export const KNEEL_MATS_36 = generate36KneelMats();

/**
 * 廟旁樹蔭下加設 5 組雙人長板凳（每張椅子皆可讓兩位信徒並肩坐下聊天！）
 */
export const SIDE_BENCHES = [
  {
    id: 'bench-left-1',
    name: '西側樹蔭雙人長板凳',
    x: -19.2,
    z: 2.8,
    rotY: Math.PI / 2,
    seats: [
      [-18.96, 0.03, 2.20],
      [-18.96, 0.03, 3.40]
    ],
    standPos: [-17.7, 0.03, 2.8],
    faceYaw: Math.PI / 2
  },
  {
    id: 'bench-left-2',
    name: '西北欒樹下雙人長板凳',
    x: -19.2,
    z: -8.6,
    rotY: Math.PI / 2,
    seats: [
      [-18.96, 0.03, -9.20],
      [-18.96, 0.03, -8.00]
    ],
    standPos: [-17.7, 0.03, -8.6],
    faceYaw: Math.PI / 2
  },
  {
    id: 'bench-right-1',
    name: '東側林蔭雙人長板凳',
    x: 19.2,
    z: -6.8,
    rotY: -Math.PI / 2,
    seats: [
      [18.96, 0.03, -7.40],
      [18.96, 0.03, -6.20]
    ],
    standPos: [17.7, 0.03, -6.8],
    faceYaw: -Math.PI / 2
  },
  {
    id: 'bench-rear-1',
    name: '後院樹蔭雙人長板凳（左）',
    x: -4.2,
    z: -19.6,
    rotY: 0,
    seats: [
      [-4.80, 0.03, -19.36],
      [-3.60, 0.03, -19.36]
    ],
    standPos: [-4.2, 0.03, -18.1],
    faceYaw: 0
  },
  {
    id: 'bench-rear-2',
    name: '後院樹蔭雙人長板凳（右）',
    x: 4.2,
    z: -19.6,
    rotY: 0,
    seats: [
      [3.60, 0.03, -19.36],
      [4.80, 0.03, -19.36]
    ],
    standPos: [4.2, 0.03, -18.1],
    faceYaw: 0
  }
];

export const TEMPLE_CONFIG = {
  templeName: '玉勅代天府德慈宮',
  shortName: '德慈宮',
  subtitle: '觀音佛祖・代天巡狩・奉祀十一尊神聖',
  plaqueText: '玉勅代天府德慈宮',
  couplets: {
    right: '神威顯赫德配代天巡九洲',
    left: '佛祖如來慈音會悟三千界',
    top: '慈聖威德'
  },
  // ★ 本宮正式確認奉祀神尊（共計 11 位）
  enshrinedDeities: [
    '保生大帝',
    '代天巡狩',
    '觀音佛祖',
    '天上聖母',
    '黑虎將軍',
    '鎮海大元帥',
    '五府千歲',
    '五佛佛祖',
    '楊府太師',
    '中壇元帥',
    '百足真人'
  ],
  deities: [
    { id: 'daitian', name: '代天巡狩（五年千歲・盧千歲）', robeColor: '#C4312C', trimColor: '#E8B84B', crownType: 'king', xOffset: 0, scale: 1.32 },
    { id: 'guanyin', name: '觀音佛祖', robeColor: '#FBF7EE', trimColor: '#E5B968', crownType: 'lotus', xOffset: -2.2, scale: 1.12 },
    { id: 'mazu', name: '天上聖母', robeColor: '#D97724', trimColor: '#F7D060', crownType: 'phoenix', xOffset: 2.2, scale: 1.12 }
  ],
  palette: {
    vermilion: '#BA342E',
    deepRed: '#851D1B',
    imperialGold: '#E5B968',
    brightGold: '#FCE07C',
    wallCream: '#F7F0E2',
    roofTerracotta: '#C25B38',
    rosewood: '#5A3022',
    darkWood: '#3D1E15',
    stoneGrey: '#CFCAC0'
  },
  offerings: {
    maxCount: 12,
    ttlMs: 10 * 60 * 1000
  },
  admin: {
    // ★ V50 資安強化：已移除明文寫死密碼，全面改由 Firebase Authentication（Email/密碼）驗證
    authMode: 'firebase'
  },
  camera: {
    fov: 35,
    followOffset: [15.5, 18.5, 21.5],
    godViewOffset: [0, 38.0, 14.5],
    // 視角方案 B：固定 4 方向一鍵切換（正面 / 左側 / 右側 / 上帝俯瞰）
    presets: {
      front: [0, 17.5, 24.5],
      left: [-23.0, 17.5, 13.5],
      right: [23.0, 17.5, 13.5],
      god: [0, 38.0, 14.5]
    },
    minDistance: 7.5,
    maxDistance: 62,
    maxPolarAngle: Math.PI / 2 - 0.08
  },
  worldBounds: {
    minX: -25.0,
    maxX: 25.0,
    minZ: -22.5,
    maxZ: 25.5
  },
  hallBounds: {
    minX: -10.2,
    maxX: 10.2,
    minZ: -12.6,
    maxZ: 8.8
  },
  zones: {
    incense: {
      id: 'incense',
      name: '香燭金紙區',
      shortLabel: '點香領金紙',
      icon: '🪔',
      stepOrder: 1,
      position: [-8.2, 0, 1.2],
      standPos: [-6.6, 0, 1.2],
      lookAt: [-8.2, 1.2, 1.2],
      triggerRadius: 1.5,
      color: '#F59E0B',
      desc: '領取三柱清香與敬神金紙'
    },
    tiangong: {
      id: 'tiangong',
      name: '廟外天公爐',
      shortLabel: '拜天公',
      icon: '☀️',
      stepOrder: 2,
      position: [0, 0, 15.0],
      // ★ 修正站位：站在靠廟那側 (z = 12.85)，面向廟外天際三拜後直接往前插香！
      standPos: [0, 0, 12.85],
      lookAt: [0, 1.5, 15.0],
      triggerRadius: 1.65,
      color: '#EAB308',
      desc: '站在天公爐靠廟一側面向天際三拜，拜畢直接往前插上三柱清香'
    },
    offeringTable: {
      id: 'offeringTable',
      name: '正殿左右大供桌',
      shortLabel: '擺放供品',
      icon: '🍎',
      stepOrder: 3,
      position: [-4.10, 0, -5.4],
      // ★ V34 雙光圈對齊左供桌 (-4.10, -4.12) 與右供桌 (+4.10, -4.12)「壽」字正前方！
      standPos: [-4.10, 0, -4.12],
      extraStandPositions: [
        { pos: [4.10, 0, -4.12], side: 'right' }
      ],
      lookAt: [-4.10, 1.15, -5.4],
      triggerRadius: 1.35,
      color: '#EC4899',
      desc: '從香火背包挑選供品，自由選擇左側或右側大供桌擺放祈願'
    },
    // ★ V34 拜主神長跪墊兩側留出寬敞通行走道（仍不可踩踏，可同時容納 3 人並肩下跪參拜！）
    mainWorship: {
      id: 'mainWorship',
      name: '正殿中央・拜主神',
      shortLabel: '拜主神',
      icon: '🙏',
      stepOrder: 4,
      position: [0, 0, -5.0],
      standPos: [0, 0, -4.15],
      kneelSlots: [
        [-0.70, 0.455, -5.08],
        [0, 0.455, -5.08],
        [0.70, 0.455, -5.08]
      ],
      lookAt: [0, 2.8, -10.4],
      triggerRadius: 1.65,
      color: '#DC2626',
      desc: '於正殿中央紅毯橫式長跪墊（可容納 3 人同時下跪）虔誠三拜主神，拜畢起身插香'
    },
    furnace: {
      id: 'furnace',
      name: '廟宇右側寶塔金爐',
      shortLabel: '燒金紙',
      icon: '🔥',
      stepOrder: 5,
      position: [16.2, 0, 4.4],
      standPos: [14.0, 0, 5.4],
      lookAt: [16.2, 1.5, 4.4],
      triggerRadius: 1.75,
      color: '#EA580C',
      desc: '將敬神金紙一張一張投入金爐化金祈福'
    },
    fortune: {
      id: 'fortune',
      name: '正殿右側・求籤擲筊案',
      shortLabel: '求籤解籤',
      icon: '🎋',
      // ★ V34 配合右供桌對齊併排 (7.15, -5.4)
      position: [7.15, 0, -5.4],
      standPos: [7.15, 0, -4.12],
      lookAt: [7.15, 1.2, -5.4],
      triggerRadius: 1.35,
      color: '#8B5CF6',
      desc: '位於右側大供桌旁併排，虔誠擲聖筊求取六十甲子靈籤與解籤'
    },
    taisui: {
      id: 'taisui',
      name: '紅紙太歲燈牆',
      shortLabel: '安太歲牆',
      icon: '🏮',
      position: [9.65, 0, -2.8],
      standPos: [8.0, 0, -2.8],
      lookAt: [9.65, 2.4, -2.8],
      triggerRadius: 1.75,
      color: '#E11D48',
      desc: '查詢信眾與公司行號太歲燈或線上點燈祈福'
    },
    bench: {
      id: 'bench',
      name: '廟前大榕樹象棋板凳區',
      shortLabel: '象棋板凳',
      icon: '🪑',
      position: [-11.40, 0, 15.10],
      // ★ V38 四面皆設有感應站位（南、北、西、東），走近任一張板凳都會亮起坐下提示，且 4 張板凳全部空位皆可點坐！
      standPos: [-11.40, 0, 17.80],
      extraStandPositions: [
        { pos: [-11.40, 0, 12.40], side: 'north' },
        { pos: [-13.80, 0, 15.10], side: 'west' },
        { pos: [-9.00, 0, 15.10], side: 'east' }
      ],
      sitPos: [-10.85, 0, 13.56],
      // ★ V38 四面長板凳共 10 個空位（附 benchSide 標籤，點擊哪張板凳優先落座該張板凳最近的空位！）
      seats: [
        { side: 'north', pos: [-12.15, 0.03, 13.56], yaw: 0, approach: [-12.15, 12.45] },
        { side: 'north', pos: [-11.40, 0.03, 13.56], yaw: 0, approach: [-11.40, 12.45] },
        { side: 'north', pos: [-10.65, 0.03, 13.56], yaw: 0, approach: [-10.65, 12.45] },
        { side: 'south', pos: [-12.15, 0.03, 16.64], yaw: Math.PI, approach: [-12.15, 17.75] },
        { side: 'south', pos: [-11.40, 0.03, 16.64], yaw: Math.PI, approach: [-11.40, 17.75] },
        { side: 'south', pos: [-10.65, 0.03, 16.64], yaw: Math.PI, approach: [-10.65, 17.75] },
        { side: 'west', pos: [-12.68, 0.03, 14.22], yaw: Math.PI / 2, approach: [-13.78, 14.22] },
        { side: 'west', pos: [-12.68, 0.03, 15.98], yaw: Math.PI / 2, approach: [-13.78, 15.98] },
        { side: 'east', pos: [-10.12, 0.03, 14.22], yaw: -Math.PI / 2, approach: [-9.02, 14.22] },
        { side: 'east', pos: [-10.12, 0.03, 15.98], yaw: -Math.PI / 2, approach: [-9.02, 15.98] }
      ],
      lookAt: [-11.40, 0.9, 15.10],
      triggerRadius: 1.75,
      color: '#10B981',
      desc: '點選或走近大榕樹旁任一張象棋長板凳空位即可坐下觀棋喝茶，與文雄伯、阿忠哥及線上香客聊天'
    },
    bulletin: {
      id: 'bulletin',
      name: '紅底木框公佈欄',
      shortLabel: '公佈欄',
      icon: '📢',
      // ★ 需求 #5：移至母獅（10.1, 10.1）左側，完全不遮擋右側寶塔金爐燒金紙視線！
      position: [6.7, 0, 11.55],
      standPos: [6.7, 0, 13.25],
      lookAt: [6.7, 1.8, 11.55],
      triggerRadius: 1.7,
      color: '#EF4444',
      desc: '選擇想看的主題海報：公告、建廟進度或芳名錄'
    },
    offeringShop: {
      id: 'offeringShop',
      name: '廟埕文創供品鋪',
      shortLabel: '供品鋪',
      icon: '🛍️',
      position: [-16.8, 0, 20.0],
      standPos: [-14.8, 0, 20.0],
      lookAt: [-16.8, 1.4, 20.0],
      triggerRadius: 2.35,
      color: '#D97706',
      desc: '以功德請購鮮花、水果與限定壽桃塔收入香火背包'
    },
    quizBooth: {
      id: 'quizBooth',
      name: '民俗智慧挑戰攤',
      shortLabel: '每日挑戰',
      icon: '🎯',
      position: [12.2, 0, 20.0],
      standPos: [10.2, 0, 20.0],
      lookAt: [12.2, 1.4, 20.0],
      triggerRadius: 2.35,
      color: '#0D9488',
      desc: '每日限玩一次（隨機 6 題），答對輕鬆賺功德！'
    },
    fishPond: {
      id: 'fishPond',
      name: '假山瀑布錦鯉池',
      shortLabel: '水池餵魚',
      icon: '🐟',
      position: [19.0, 0, 15.2],
      standPos: [16.5, 0, 15.2],
      lookAt: [20.6, 0.3, 15.2],
      triggerRadius: 2.2,
      color: '#0EA5E9',
      desc: '灑一把魚飼料餵食七彩錦鯉魚群，欣賞錦鯉爭食超療癒！'
    },
    // ★ V36 奉茶區文字精簡為「茶壺」，縮小觸發半徑避免與淑芬重疊誤觸！
    teaStation: {
      id: 'teaStation',
      name: '正殿左側・奉茶區',
      shortLabel: '拿取茶壺',
      icon: '🍵',
      position: [-8.55, 0, 4.45],
      standPos: [-6.85, 0, 4.45],
      lookAt: [-8.55, 1.3, 4.45],
      triggerRadius: 1.15,
      color: '#0D9488',
      desc: '提起茶壺，前往主神桌為神明敬奉清茶三杯'
    },
    // ★ V1.1 新增：主神桌清茶三杯（倒茶敬茶）
    teaOffer: {
      id: 'teaOffer',
      name: '主神桌・清茶三杯',
      shortLabel: '敬奉清茶',
      icon: '🍵',
      position: [-1.45, 0, -8.1],
      standPos: [-1.35, 0, -7.45],
      lookAt: [0, 1.45, -8.4],
      triggerRadius: 1.8,
      color: '#059669',
      desc: '手持茶壺為神桌清茶三杯緩緩添茶，誠心敬茶（+10 功德）'
    },
    // ★ V1.3 桌下虎爺（黑虎將軍）參拜點（每次 +1 功德，每日最多 3 次）
    tigerDeity: {
      id: 'tigerDeity',
      name: '神桌下方・虎爺（黑虎將軍）',
      shortLabel: '拜虎爺獻蛋',
      icon: '🐯',
      position: [1.45, 0, -8.1],
      standPos: [1.35, 0, -7.45],
      lookAt: [0, 0.72, -8.25],
      triggerRadius: 1.85,
      color: '#D97706',
      desc: '拉近視角參拜桌下黑虎將軍、插香或獻上土雞蛋（每次 +1 功德，每日限 3 次）'
    },
    // ★ V1.1 新增：主神桌左側「五營旗（五營將軍）」參拜與插香點
    fiveCamps: {
      id: 'fiveCamps',
      name: '正殿左側・五營旗（五營將軍）',
      shortLabel: '拜五營旗',
      icon: '🚩',
      position: [-4.15, 0, -8.65],
      standPos: [-4.15, 0, -7.2],
      lookAt: [-4.15, 1.55, -9.15],
      triggerRadius: 1.8,
      color: '#15803D',
      desc: '誠心敬拜鎮守五方之五營將軍並於五營香爐插上三柱清香（+8 功德）'
    },
    // ★ V31 功德箱與平安符展示桌交換位置且功能分開：北側 (z = 2.05) 平安符桌僅供展示介紹；南側 (z = 3.45) 功德箱投 100 功德求符！
    talismanTable: {
      id: 'talismanTable',
      name: '太歲牆旁・平安符展示桌',
      shortLabel: '平安符介紹',
      icon: '📜',
      position: [8.42, 0, 2.05],
      standPos: [6.75, 0, 2.05],
      lookAt: [8.42, 1.15, 2.05],
      triggerRadius: 1.12,
      color: '#D97706',
      desc: '查看觀音佛祖平安符與代天巡狩順遂符介紹（欲求符請至旁邊功德箱投入 100 功德）'
    },
    meritBox: {
      id: 'meritBox',
      name: '服務台旁・德慈宮功德箱',
      shortLabel: '投功德求符',
      icon: '🧧',
      position: [8.42, 0, 3.45],
      standPos: [6.75, 0, 3.45],
      lookAt: [8.42, 1.15, 3.45],
      triggerRadius: 1.12,
      color: '#B91C1C',
      desc: '投入 100 功德添香油，誠心求取觀音佛祖或代天巡狩數位平安符'
    },
    // ★ V31 東側南段「德慈宮服務台」(7.90, 5.75)：與公佈欄徹底分開，專注「點燈登記／祈福登記／參拜諮詢」；夜間自動開燈！
    serviceDesk: {
      id: 'serviceDesk',
      name: '正殿東側・德慈宮服務台',
      shortLabel: '服務台登記',
      icon: '🛎️',
      position: [7.90, 0, 5.75],
      standPos: [6.45, 0, 5.75],
      lookAt: [7.90, 1.15, 5.75],
      triggerRadius: 1.75,
      color: '#991B1B',
      desc: '廟公阿財伯專責辦理：安太歲點燈登記、祈福疏文現場登記與參拜動線諮詢'
    }
  },
  npcs: {
    keeper: {
      id: 'keeper',
      name: '廟公阿財伯',
      title: '玉勅代天府德慈宮服務台守廟人',
      avatar: '👴',
      presetId: 'elderMale',
      questId: 'q_incense_stubs',
      mode: 'stationary',
      // ★ V29 隨服務台位置互換，阿財伯站立於東側南段服務台後方 (9.04, 0.37, 5.75)！
      position: [9.04, 0.37, 5.75],
      facing: -Math.PI / 2,
      bubbleLines: ['服務台在這邊！有事歡迎找阿財伯～', '點燈、求平安符都在服務台旁喔！', '五年千歲就是十二瘟王的盧千歲喔！'],
      dialogues: [
        '歡迎來到安定區港口里「玉勅代天府德慈宮」全新落成大廟！本宮共奉祀 11 位神尊：保生大帝、代天巡狩、觀音佛祖、天上聖母、黑虎將軍、鎮海大元帥、五府千歲、五佛佛祖、楊府太師、中壇元帥與百足真人！',
        '跟您分享一個德慈宮神尊小知識：殿內「代天巡狩五年千歲」正是十二瘟王中的【盧千歲】喔！民間尊稱「盧千歲＝五年千歲＝十二瘟王＝代天巡狩千歲爺＝千歲爺＝代天巡狩＝王爺公」，指的都是同一位王爺公！',
        '走進大殿正中央面向主神按 [E] 即可三拜插香，左邊案桌還安奉著威嚴的五營旗，左右兩側 36 個拜墊隨時都能走過去按 [E] 跪坐敲木魚！',
        '拜天公時記得站在靠廟這邊面向外面天際三拜，拜完直接向前把三柱香插進金色頂蓋天公爐喔！'
      ]
    },
    shopkeeper: {
      id: 'shopkeeper',
      name: '供品鋪老闆娘阿芬姊',
      title: '廟埕文創供品鋪・熱心老闆娘',
      avatar: '🛍️',
      presetId: 'middleFemale',
      mode: 'stationary',
      position: [-17.8, 0.03, 20.0],
      facing: Math.PI / 2,
      bubbleLines: ['新鮮旺來鳳梨與壽桃塔喔🍍', '來挑選敬神鮮花水果吧！', '按 [E] 即可選購供品🛍️'],
      dialogues: [
        '人客來坐喔～我是供品鋪老闆娘阿芬姊！這裡有最新鮮的旺來鳳梨、平安蘋果、清香鮮花，還有超喜氣的德慈宮限定壽桃塔！',
        '只要站到我攤位前的發光光圈按 [E] 鍵（或點右側按鈕），就能用功德值把供品收進隨身香火背包，再拿到正殿大供桌誠心敬獻喔！'
      ]
    },
    quizMaster: {
      id: 'quizMaster',
      name: '挑戰攤關主阿哲',
      title: '民俗智慧挑戰攤・廟會小學堂關主',
      avatar: '🎯',
      presetId: 'middleMale',
      mode: 'stationary',
      position: [13.2, 0.03, 20.0],
      facing: -Math.PI / 2,
      bubbleLines: ['每日 6 題民俗智慧大挑戰🎯', '台灣宮廟民俗小知識等你挑戰！', '全對加碼送 +20 功德喔🏆'],
      dialogues: [
        '歡迎來到民俗智慧挑戰攤！我是關主阿哲～這裡有豐富的台灣宮廟禮儀與德慈宮文化小知識，每天會隨機抽出 6 題考考您！',
        '站到攤位前光圈按 [E] 就能開始挑戰，每答對一題直接送 15 功德，全部答對還有滿分獎金，拿去對面找阿芬姊請購供品最剛好啦！'
      ]
    },
    shufen: {
      id: 'shufen',
      name: '奉茶姊姊淑芬',
      title: '正殿奉茶區志工',
      avatar: '👩',
      presetId: 'middleFemale',
      questId: 'q_pour_tea',
      mode: 'stationary',
      // ★ V36 淑芬移離牆角並與奉茶桌保持清爽間距 (-6.85, 0.37, 6.75)，面向殿門熱情招呼、絕不再誤點奉茶框！
      position: [-6.85, 0.37, 6.75],
      facing: Math.PI * 0.62,
      bubbleLines: ['奉茶桌上有燒好的茶壺喔🍵', '來喝杯熱奉茶，也能提壺幫神明添茶！', '神桌清茶快見底了，能幫我添茶嗎？'],
      dialogues: [
        '平安你好！我就在正殿左側奉茶區招呼大家～桌上這壺茶壺剛煮好熱茶，歡迎隨時提壺到神桌前幫神明敬奉清茶三杯喔！',
        '拜完想歇腳的話，廟門外大榕樹下還有文雄伯跟阿忠哥在下象棋，右側假山瀑布池也能免費灑飼料餵錦鯉呢！'
      ]
    },
    chessUncleA: {
      id: 'chessUncleA',
      name: '棋友文雄伯',
      title: '大榕樹象棋桌・紅方棋手',
      avatar: '👴',
      presetId: 'elderMale',
      mode: 'sit',
      position: [-12.68, 0.03, 15.10],
      facing: Math.PI / 2,
      bubbleLines: ['將軍！這步炮打中卒看你怎麼擋 😆', '起手無回大丈夫喔，阿忠哥！', '下完這盤進殿拜五年千歲～'],
      dialogues: [
        '哈哈少年仔來看棋喔！我跟阿忠哥每天下午都會來德慈宮大榕樹下殺兩盤象棋，吹風喝淑芬的奉茶最爽快啦！',
        '你看這張大理石棋桌多有味道，旁邊板凳還有空位，歡迎坐下來一起觀棋聊天！'
      ]
    },
    chessUncleB: {
      id: 'chessUncleB',
      name: '棋友阿忠哥',
      title: '大榕樹象棋桌・黑方棋手',
      avatar: '👨',
      presetId: 'middleMale',
      mode: 'sit',
      position: [-10.12, 0.03, 15.10],
      facing: -Math.PI / 2,
      bubbleLines: ['哎呀差點中計，跳馬解圍！', '文雄伯今天棋藝特別猛喔哈哈～', '廟前樹下邊下棋邊聞香火最療癒🍵'],
      dialogues: [
        '安安！文雄伯這步炮攻真犀利，害我差點被將死！還好我留了一步馬後炮～',
        '德慈宮廟埕現在整理得超寬敞舒服，參拜完記得來找我們切磋閒聊喔！'
      ]
    },
    benchCompanion: {
      id: 'benchCompanion',
      name: '納涼阿伯旺福',
      title: '後院樹蔭雙人椅乘涼老香客',
      avatar: '🍵',
      presetId: 'elderMale',
      mode: 'sit',
      position: [-4.80, 0.03, -19.36],
      facing: 0,
      bubbleLines: ['這邊還有空位一起坐吧🪑', '樹蔭下吹風真涼快～', '新廟神龕超莊嚴！'],
      dialogues: [
        '哈囉少年仔！這張樹蔭長板凳可以坐兩個人喔，我旁邊留了一個好位子，按 [E] 坐下來一起吹風聊天喝茶吧！',
        '正殿神龕裡的觀音背壁畫、玉勅代天黃令旗跟三尊神聖金身都跟本尊超像的，有空記得細細欣賞喔！'
      ]
    },
    aming: {
      id: 'aming',
      name: '攝影師阿明',
      title: '背著底片機的廟埕文創攝影師',
      avatar: '🧑',
      presetId: 'youngMale',
      mode: 'patrol',
      canSitOnMats: false,
      waypoints: [
        [-4.5, 17.8], [5.0, 17.5], [11.2, 16.2], [14.2, 9.5],
        [14.0, -14.5], [0, -16.8], [-14.2, -14.5], [-15.0, 4.5]
      ],
      bubbleLines: ['紅磚牆配寶藍燕尾超好拍📸', '屋頂上的福祿壽三仙好精緻！', '右側假山瀑布池美翻了🌊'],
      dialogues: [
        '嘿你好！你看我胸前這台復古底片機！這座安定區港口里新廟真的太壯觀了——紅磚側牆、青斗石圓窗、門口石獅子，屋脊上還有福祿壽三仙！',
        '別忘了點右下角切換「上帝視角」看看整座新廟和右側假山瀑布池的全景，超震撼的！'
      ]
    },
    xiaomei: {
      id: 'xiaomei',
      name: '手作少女小美',
      title: '喜歡在大殿拜墊靜坐念經的少女',
      avatar: '👧',
      presetId: 'youngFemale',
      mode: 'patrol',
      canSitOnMats: true,
      preferredMats: [1, 3, 5, 7, 9],
      waypoints: [
        [0, 6.4], [0, -1.5], [-6.2, 1.2], [0, 5.2], [6.2, 3.5], [7.2, -2.8]
      ],
      bubbleLines: ['我要找個拜墊坐下念經🙏', '南無觀世音菩薩✨', '心靜下來好舒服～'],
      dialogues: [
        '嗨～大殿裡面左右 36 個拜墊每一個都可以坐！我最喜歡挑前排靠走道的拜墊跪坐一會兒聽輕音樂～',
        '你也可以直接走上任何一個沒人坐的拜墊，就會立刻坐下進入念經模式囉！'
      ]
    },
    grandpaWalk: {
      id: 'grandpaWalk',
      name: '茶香阿公添財',
      title: '愛在殿內靜坐與環廟散步的阿公',
      avatar: '👴',
      presetId: 'elderMale',
      mode: 'patrol',
      canSitOnMats: true,
      preferredMats: [2, 4, 6, 8, 12],
      waypoints: [
        [-15.5, 12.0], [-16.5, -2.0], [-15.2, -16.5], [0, -16.2],
        [15.2, -16.0], [18.0, 10.5], [0, 7.0], [0, 1.0]
      ],
      bubbleLines: ['繞廟散步再進殿坐坐～', '五年千歲保佑平安🙏', '天天來簽到賺功德！'],
      dialogues: [
        '少年仔平安！阿公剛剛繞廟後面散步一圈，進大殿找個拜墊坐下念了幾句心經，整個人神清氣爽！',
        '記得右前方的民俗小挑戰每天有 6 道隨機題目，內容超豐富有趣，每天來玩一次賺功德喔！'
      ]
    },
    grandmaWalk: {
      id: 'grandmaWalk',
      name: '花布阿嬤秀英',
      title: '虔誠阿嬤（虎爺尋蛋委託）',
      avatar: '👵',
      presetId: 'elderFemale',
      questId: 'q_tiger_egg',
      mode: 'patrol',
      canSitOnMats: false,
      waypoints: [
        [-6.2, 16.5], [-2.5, 17.5], [3.5, 16.5], [4.5, 13.5], [-3.8, 14.0]
      ],
      bubbleLines: ['我想拜虎爺，忘了帶雞蛋🥚', '後埕的放山雞會生蛋喔！', '阿彌陀佛・闔家平安🙏'],
      dialogues: [
        '阿彌陀佛～平安順心！阿嬤剛剛去太歲牆幫兒子的公司行號點了一盞平安燈，長長的公司名字縮放排在紅紙上好清楚喔！'
      ]
    },
    // ★ V1.1 新增：公佈欄旁「總幹事阿國」（向前移 1 格至 z = 13.8，完全不擋通道動線！）
    director: {
      id: 'director',
      name: '總幹事阿國',
      title: '玉勅代天府德慈宮廟務總幹事',
      avatar: '🏮',
      presetId: 'middleMale',
      questId: 'q_night_patrol',
      mode: 'stationary',
      position: [8.85, 0.03, 13.8],
      facing: -0.45,
      bubbleLines: ['準備夜巡廟埕囉🌙', '幫我點右上角切換夜景巡視吧！', '德慈宮夜景燈火超壯觀✨'],
      dialogues: [
        '平安你好！我是德慈宮總幹事阿國，平常負責廟務公告與夜間巡守，有任何活動消息都在旁邊公佈欄喔！'
      ]
    },
    kidBoy: {
      id: 'kidBoy',
      name: '小舞獅弟小寶',
      title: '戴著可愛獅頭帽的活力小弟',
      avatar: '👦',
      presetId: 'childBoy',
      mode: 'patrol',
      canSitOnMats: false,
      waypoints: [
        [-5.8, 15.8], [-3.2, 20.0], [4.8, 20.4], [8.8, 16.8], [4.2, 12.2], [-4.4, 12.2]
      ],
      bubbleLines: ['看我的小舞獅帽威風嗎🦁', '每日挑戰 6 題我全對！', '金爐火花好漂亮🔥'],
      dialogues: [
        '嘿嘿你看我的紅金獅頭帽可愛嗎？我今天玩完民俗智慧挑戰 6 題了，明天還要再來抽新題目！'
      ]
    },
    kidGirl: {
      id: 'kidGirl',
      name: '小燈籠妹小晴',
      title: '頭戴小紅燈籠髮飾的可愛妹妹',
      avatar: '👧',
      presetId: 'childGirl',
      mode: 'patrol',
      canSitOnMats: true,
      preferredMats: [25, 28, 30, 32],
      waypoints: [
        [7.8, 18.2], [14.8, 14.5], [17.8, 8.5], [0, 6.5], [2.0, 17.0]
      ],
      bubbleLines: ['我的小燈籠會搖搖晃晃🏮', '我也來坐拜墊念經！', '祝大家平安開心✨'],
      dialogues: [
        '哈囉～我頭上是一對迷你紅燈籠喔！等一下我也要去大殿拜墊上坐坐看，陪大家一起祈福！'
      ]
    }
  }
};

export const WORSHIP_STEPS = [
  {
    step: 1,
    key: 'incense',
    zoneId: 'incense',
    title: '① 點香領金紙',
    short: '點香',
    hint: '前往正殿左側「香燭金紙區」點燃三柱清香'
  },
  {
    step: 2,
    key: 'tiangong',
    zoneId: 'tiangong',
    title: '② 拜天公',
    short: '天公',
    hint: '立於天公爐靠廟一側，向外三拜並直接插香'
  },
  {
    step: 3,
    key: 'offering',
    zoneId: 'offeringTable',
    title: '③ 擺放供品',
    short: '供品',
    hint: '前往正殿大供桌，獻上香火背包供品並祈願'
  },
  {
    step: 4,
    key: 'mainDeity',
    zoneId: 'mainWorship',
    title: '④ 拜主神',
    short: '主神',
    hint: '立於正殿中央走道，正面神明三拜並插香'
  },
  {
    step: 5,
    key: 'furnace',
    zoneId: 'furnace',
    title: '⑤ 燒金紙',
    short: '化金',
    hint: '前往廟宇右側「寶塔金爐」逐張化金祈福'
  }
];

// ★ V1.1 功德箱數位平安符目錄（100 功德求取）
export const TALISMAN_CATALOG = [
  {
    id: 'guanyin_safe',
    name: '觀音佛祖出入平安符',
    shortName: '觀音平安符',
    deity: '觀音佛祖',
    emoji: '🌸',
    cost: 100,
    themeBg: '#164E3F',
    desc: '觀音佛祖慈悲護佑，保佑出入平安、消災解厄、身心安泰。'
  },
  {
    id: 'daitian_smooth',
    name: '代天巡狩順遂符',
    shortName: '代天順遂符',
    deity: '代天巡狩',
    emoji: '🏮',
    cost: 100,
    themeBg: '#8E1515',
    desc: '代天巡狩王爺公威靈顯赫，庇佑事業順遂、闔家吉慶、貴人相助。'
  }
];

// ★ V1.1 廟埕生活化每日任務（單次 30 秒內完成，每日自動重置）
export const DAILY_QUESTS = [
  {
    id: 'q_incense_stubs',
    npcId: 'keeper',
    npcName: '廟公阿財伯',
    npcAvatar: '👴',
    title: '廟埕環境小幫手',
    icon: '🧹',
    reward: 10,
    targetCount: 4,
    introLine: '剛才風大吹落不少香腳，幫我撿 4 根廟埕地上的香腳回來吧！',
    progressLine: '廟埕地上還有掉落的發光香腳喔，點擊撿滿 4 根再回來找阿財伯！',
    completeLine: '真是太感謝你啦！廟埕乾乾淨淨神明最歡喜，這 +10 功德結緣禮送給你！',
    doneLine: '今天的廟埕已經非常清淨囉！明天再麻煩小幫手幫忙巡視～'
  },
  {
    id: 'q_pour_tea',
    npcId: 'shufen',
    npcName: '奉茶姊姊淑芬',
    npcAvatar: '👩',
    title: '正殿敬茶協助',
    icon: '🍵',
    reward: 15,
    targetCount: 1,
    introLine: '神桌上的清茶快見底了，去大殿左側「奉茶區」提茶壺幫神明添個清茶三杯吧！',
    progressLine: '記得先進大殿左側「奉茶區」拿茶壺，再到神桌前倒清茶三杯喔！',
    completeLine: '清茶醇香敬神明，真是誠心好孩子！這 +15 功德感謝你的幫忙！',
    doneLine: '今天神桌上的清茶已經添滿囉，歇歇腳喝杯奉茶吧～'
  },
  {
    id: 'q_tiger_egg',
    npcId: 'grandmaWalk',
    npcName: '花布阿嬤秀英',
    npcAvatar: '👵',
    title: '虎爺尋蛋委託',
    icon: '🥚',
    reward: 20,
    targetCount: 1,
    introLine: '我想拜虎爺求孫子好帶大，可是忘了帶雞蛋，你能幫我去廟後埕撿一顆新鮮土雞蛋獻給桌下虎爺嗎？',
    progressLine: '走到廟宇後方草坪找放山母雞撿 1 顆發光土雞蛋，再進正殿獻給神桌下的虎爺喔！',
    completeLine: '阿彌陀佛～虎爺公一定很開心！謝謝你幫忙，這 +20 功德請一定要收下！',
    doneLine: '今天已經誠心幫阿嬤獻蛋給虎爺公囉，祝福你也平安順遂！'
  },
  {
    id: 'q_night_patrol',
    npcId: 'director',
    npcName: '總幹事阿國',
    npcAvatar: '🏮',
    title: '廟埕夜巡巡視',
    icon: '🌙',
    reward: 15,
    targetCount: 1,
    introLine: '晚上準備夜巡了，幫我點擊右上角「🌙 切換夜景」巡視一下廟埕燈火吧！',
    progressLine: '點擊右上角的「🌙 切換夜景」按鈕，巡視一下大廟夜景就可以回來回報囉！',
    completeLine: '燈火輝煌、莊嚴又平安！辛苦協助夜巡，這 +15 功德送給你！',
    doneLine: '今天的夜巡圓滿完成！晚上點燈後的德慈宮真的很美吧！'
  }
];

// ★ V1.1 真人玩家雙向結緣互動動作
export const PEER_EMOTES = [
  { id: 'wave', label: '揮手打招呼', emoji: '👋', bubble: '嗨！你好呀 👋', replyText: '回揮招呼 👋' },
  { id: 'salute', label: '雙手合十作揖', emoji: '🙏', bubble: '平安吉祥 🙏', replyText: '合十回禮 🙏' },
  { id: 'handshake', label: '握手結緣', emoji: '🤝', bubble: '很高興認識你 🤝', replyText: '握手結緣 🤝' }
];
