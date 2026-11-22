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
  subtitle: '代天巡狩・五府千歲・觀音佛祖・天上聖母',
  plaqueText: '玉勅代天府德慈宮',
  couplets: {
    right: '神威顯赫德配代天巡九洲',
    left: '佛祖如來慈音會悟三千界',
    top: '神威顯赫'
  },
  deities: [
    { id: 'wufu', name: '代天巡狩・五府千歲', robeColor: '#C4312C', trimColor: '#E8B84B', crownType: 'king', xOffset: 0, scale: 1.32 },
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
    defaultPasscode: '1688'
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
      name: '正殿大供桌',
      shortLabel: '擺放供品',
      icon: '🍎',
      stepOrder: 3,
      position: [0, 0, -6.2],
      standPos: [0, 0, -4.5],
      lookAt: [0, 1.2, -6.2],
      triggerRadius: 1.65,
      color: '#EC4899',
      desc: '從香火背包挑選供品擺上供桌並送出祈願'
    },
    // ★ 拜主神與念經完全分開：主神在中央走道正面神明即可拜，不用上拜墊！
    mainWorship: {
      id: 'mainWorship',
      name: '正殿中央・拜主神',
      shortLabel: '拜主神',
      icon: '🙏',
      stepOrder: 4,
      position: [0, 0, -2.0],
      standPos: [0, 0, -2.0],
      lookAt: [0, 2.8, -10.4],
      triggerRadius: 1.5,
      color: '#DC2626',
      desc: '立於中央走道正面主神，虔誠三拜並插香'
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
      position: [6.6, 0, -8.8],
      standPos: [5.4, 0, -7.6],
      lookAt: [6.6, 1.2, -8.8],
      triggerRadius: 1.75,
      color: '#8B5CF6',
      desc: '位於神明右側殿內，虔誠擲聖筊求取六十甲子靈籤與阿財伯解籤'
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
      name: '廟前大榕樹板凳區',
      shortLabel: '板凳聊天',
      icon: '🪑',
      position: [-11.0, 0, 13.8],
      standPos: [-10.2, 0, 15.1],
      sitPos: [-10.35, 0, 13.94],
      seats: [
        { pos: [-10.35, 0.03, 13.94], yaw: 0 },
        { pos: [-11.55, 0.03, 13.94], yaw: 0 },
        { pos: [-12.80, 0.03, 14.78], yaw: Math.PI / 2 },
        { pos: [-12.80, 0.03, 15.72], yaw: Math.PI / 2 }
      ],
      lookAt: [-10.4, 1.0, 18.0],
      triggerRadius: 1.7,
      color: '#10B981',
      desc: '坐下喝平安茶，與線上香客及阿財伯聊天'
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
      position: [-12.2, 0, 20.0],
      standPos: [-10.2, 0, 20.0],
      lookAt: [-12.2, 1.4, 20.0],
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
    }
  },
  npcs: {
    keeper: {
      id: 'keeper',
      name: '廟公阿財伯',
      title: '安定區港口里・玉勅代天府德慈宮駐廟阿伯',
      avatar: '👴',
      presetId: 'elderMale',
      mode: 'stationary',
      position: [-4.8, 0.03, 11.4],
      facing: 0.35,
      bubbleLines: ['新廟紅瓦藍脊真宏偉！', '拜天公記得靠廟向外拜喔～', '右側還有假山瀑布池！'],
      dialogues: [
        '歡迎來到安定區港口里「玉勅代天府德慈宮」全新落成大廟！您瞧瞧這前後兩進紅瓦燕尾、寶藍剪黏屋脊，屋頂正中央還立著福祿壽三仙呢！',
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
      position: [-13.2, 0.03, 20.0],
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
      title: '大榕樹板凳區暖心奉茶姊姊',
      avatar: '👩',
      presetId: 'elderFemale',
      mode: 'sit',
      position: [-11.55, 0.03, 13.94],
      facing: 0,
      bubbleLines: ['坐下來喝杯熱茶吧🍵', '下方聊天框打字會浮在頭頂喔！', '水池還能餵錦鯉魚喔🐟'],
      dialogues: [
        '哈囉！走累了隨時來板凳喝杯奉茶～廟宇兩側跟後院樹蔭下的雙人長板凳都可以兩個人一起坐喔！',
        '對了，新廟右側假山瀑布池裡有九尾七彩錦鯉，走過去按 [E] 還能親手灑飼料餵魚呢！'
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
      bubbleLines: ['繞廟散步再進殿坐坐～', '五府千歲保佑平安🙏', '天天來簽到賺功德！'],
      dialogues: [
        '少年仔平安！阿公剛剛繞廟後面散步一圈，進大殿找個拜墊坐下念了幾句心經，整個人神清氣爽！',
        '記得右前方的民俗小挑戰每天有 6 道隨機題目，內容超豐富有趣，每天來玩一次賺功德喔！'
      ]
    },
    grandmaWalk: {
      id: 'grandmaWalk',
      name: '花布阿嬤秀英',
      title: '虔誠念佛的慈祥花布阿嬤',
      avatar: '👵',
      presetId: 'elderFemale',
      mode: 'patrol',
      canSitOnMats: true,
      preferredMats: [11, 14, 16, 18, 20],
      waypoints: [
        [-7.5, 20.0], [-16.0, 16.5], [-16.2, -15.5], [6.0, -16.2],
        [0, 6.8], [0, 2.5], [4.0, 18.5]
      ],
      bubbleLines: ['阿彌陀佛・闔家平安🙏', '太歲牆也能幫公司點燈喔！', '供品鋪的壽桃塔好喜氣！'],
      dialogues: [
        '阿彌陀佛～平安順心！阿嬤剛剛去太歲牆幫兒子的公司行號點了一盞平安燈，長長的公司名字縮放排在紅紙上好清楚喔！'
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
    hint: '走到正殿左側「香燭金紙區」按 [E] 點燃三柱清香'
  },
  {
    step: 2,
    key: 'tiangong',
    zoneId: 'tiangong',
    title: '② 拜天公',
    short: '拜天公',
    hint: '走到天公爐靠廟一側按 [E] 向外三拜並直接插香'
  },
  {
    step: 3,
    key: 'offering',
    zoneId: 'offeringTable',
    title: '③ 擺放供品',
    short: '獻供品',
    hint: '走到正殿大供桌按 [E] 獻上香火背包供品並祈願'
  },
  {
    step: 4,
    key: 'mainDeity',
    zoneId: 'mainWorship',
    title: '④ 拜主神',
    short: '拜主神',
    hint: '走到正殿中央走道正面神明按 [E] 三拜並插香'
  },
  {
    step: 5,
    key: 'furnace',
    zoneId: 'furnace',
    title: '⑤ 燒金紙',
    short: '燒金紙',
    hint: '繞行至廟宇右側外部「寶塔金爐」按 [E] 逐張化金'
  }
];
