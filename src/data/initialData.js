/**
 * 玉勅代天府德慈宮 - V4 資料集（含供品鋪價格、豪華供品與民俗小挑戰題庫）
 */
export const OFFERING_CATALOG = [
  {
    id: 'pineapple',
    name: '旺來鳳梨',
    emoji: '🍍',
    cost: 10,
    blessing: '好運旺旺來・事業興隆',
    color: '#EAB308',
    type: 'pineapple'
  },
  {
    id: 'apple',
    name: '平安紅蘋果',
    emoji: '🍎',
    cost: 10,
    blessing: '出入平平安安・闔家順心',
    color: '#DC2626',
    type: 'apple'
  },
  {
    id: 'tangerine',
    name: '大吉橘子',
    emoji: '🍊',
    cost: 10,
    blessing: '大吉大利・諸事順遂',
    color: '#F97316',
    type: 'tangerine'
  },
  {
    id: 'flower',
    name: '清香鮮花',
    emoji: '💐',
    cost: 15,
    blessing: '人緣芬芳・心境清淨',
    color: '#EC4899',
    type: 'flower'
  },
  {
    id: 'jossPaper',
    name: '敬神壽金',
    emoji: '🟨',
    cost: 10,
    blessing: '添財補運・福祿綿長',
    color: '#D97706',
    type: 'jossPaper'
  },
  {
    id: 'turtleCake',
    name: '平安紅龜粿',
    emoji: '🏮',
    cost: 15,
    blessing: '福壽雙全・吉祥如意',
    color: '#E11D48',
    type: 'turtleCake'
  },
  {
    id: 'peachTower',
    name: '豪華壽桃塔',
    emoji: '🍑',
    cost: 25,
    blessing: '延年益壽・鴻運大發',
    color: '#F472B6',
    type: 'turtleCake',
    featured: true
  },
  {
    id: 'orchid',
    name: '特級祈福蝴蝶蘭',
    emoji: '🌺',
    cost: 30,
    blessing: '貴人盈門・圓滿吉祥',
    color: '#C084FC',
    type: 'flower',
    featured: true
  }
];

export const FOLKLORE_QUIZ = [
  {
    id: 'q1',
    question: '台灣傳統宮廟參拜時，站在「天公爐」前向玉皇大帝敬拜應該面向哪個方向？',
    options: ['面向廟宇外面的天際', '背對外面面向神龕', '面向左邊板凳區'],
    answerIdx: 0,
    explain: '拜天公時應面向廟外開闊天際向玉皇大帝行三拜禮，拜畢再轉身將三柱清香插入天公爐！'
  },
  {
    id: 'q2',
    question: '玉勅代天府德慈宮正殿所供奉的主神包含下列哪幾位神聖？',
    options: ['代天巡狩五年千歲（盧千歲）、觀音佛祖、天上聖母', '僅供奉土地公一位', '僅供奉月老星君'],
    answerIdx: 0,
    explain: '玉勅代天府德慈宮正殿主祀代天巡狩五年千歲（十二瘟王之盧千歲＝五年千歲＝十二瘟王＝代天巡狩千歲爺＝千歲爺＝代天巡狩＝王爺公）、觀音佛祖與天上聖母！'
  },
  {
    id: 'q3',
    question: '求籤擲筊時，擲出哪一種筊象代表神明應允賜籤？',
    options: ['聖筊（一平一凸）', '笑筊（兩平面向上）', '陰筊（兩凸面向上）'],
    answerIdx: 0,
    explain: '一正一反的「聖筊」代表神明同意賜籤；笑筊表示神明微笑要您再說明清楚，陰筊則需靜心重新稟報。'
  },
  {
    id: 'q4',
    question: '在供桌上擺放「鳳梨、蘋果、橘子」分別寓意著什麼美好祝福？',
    options: ['旺來、平安、大吉大利', '早起、散步、喝茶', '長高、考試、旅遊'],
    answerIdx: 0,
    explain: '台語「鳳梨」諧音旺來、「蘋果」代表平安、「橘子」象徵大吉大利，是最受歡迎的祈福三果！'
  },
  {
    id: 'q5',
    question: '玉勅代天府德慈宮正殿案桌旁所供奉的「五營旗」由哪五種顏色組成？',
    options: ['青、紅、白、黑、黃', '粉、紫、灰、棕、銀', '只有紅色跟藍色'],
    answerIdx: 0,
    explain: '五營旗代表東青、南紅、西白、北黑、中黃五方兵馬，守護庄頭與信眾出入平安！'
  },
  {
    id: 'q6',
    question: '在德慈宮紅紙牆「線上安太歲」點燈時，可以幫誰點平安燈？',
    options: ['自己、父母、親友或公司行號都可以點燈祈福！', '只能幫本人點燈', '必須滿 60 歲才能點燈'],
    answerIdx: 0,
    explain: '無論是否犯太歲，隨時都能幫自己、摯愛家人或公司行號點上一盞太歲平安燈！'
  }
];

export const INITIAL_BULLETIN = {
  updatedAt: '2026-11-22',
  announcements: [
    {
      id: 'ann-1',
      tag: '大殿升級',
      title: '德慈宮 3D 大殿全新擴建：36 拜墊與環廟林蔭步道開放！',
      date: '2026/11/22',
      content: '正殿左右擴大至 36 個繡花拜墊與中央大道，並新增環繞廟宇四周的散步步道、廟埕文創供品鋪與民俗挑戰攤，歡迎十方善信體驗！'
    },
    {
      id: 'ann-2',
      tag: '建廟進度',
      title: '新廟主體結構與傳統剪黏工藝持續推進中',
      date: '2026/11/10',
      content: '感謝各地信眾護持！目前大殿木作雕花與燕尾屋脊瓦作已進入細部修飾階段，待新廟落成後將同步升級 3D 線上宮廟實景。'
    },
    {
      id: 'ann-3',
      tag: '法會訊息',
      title: '初一、十五誦經祈福暨免費結緣平安米',
      date: '2026/11/01',
      content: '每逢農曆初一、十五上午九時舉辦誦經消災法會，歡迎善信親臨或於正殿 36 拜墊一同靜心持誦《心經》，共沐神恩。'
    }
  ],
  construction: {
    percent: 72,
    stage: '正殿屋脊剪黏與木雕彩繪階段',
    targetDate: '預計來年吉日入火安座',
    note: '一磚一瓦皆承載善信虔誠心意，歡迎隨喜護持建廟基金。'
  },
  donors: [
    { id: 'd1', name: '林建宏 闔家', amount: 'NT$ 20,000', item: '大殿龍柱建廟基金', date: '2026/11/18' },
    { id: 'd2', name: '陳淑芬', amount: 'NT$ 10,000', item: '燕尾屋瓦添磚', date: '2026/11/15' },
    { id: 'd3', name: '張志明・張王秀英', amount: 'NT$ 6,000', item: '香油功德暨平安米', date: '2026/11/12' },
    { id: 'd4', name: '黃宇軒', amount: 'NT$ 3,600', item: '敬獻鮮花素果基金', date: '2026/11/08' },
    { id: 'd5', name: '吳佩珊 闔家', amount: 'NT$ 12,000', item: '太歲殿光明燈具護持', date: '2026/11/05' },
    { id: 'd6', name: '善心大德（無名氏）', amount: 'NT$ 5,000', item: '隨喜建廟功德', date: '2026/11/02' }
  ]
};

export const INITIAL_TAISUI_LIST = [
  { id: 'ts-01', name: '林志明', zodiac: '馬', wish: '闔家平安、身體健康', type: 'official', createdAt: '2026/01/15' },
  { id: 'ts-02', name: '陳淑芬', zodiac: '鼠', wish: '出入平安、貴人相助', type: 'official', createdAt: '2026/01/15' },
  { id: 'ts-03', name: '張文華', zodiac: '兔', wish: '事業順遂、財源廣進', type: 'official', createdAt: '2026/01/16' },
  { id: 'ts-04', name: '李美玲', zodiac: '雞', wish: '身體康健、心想事成', type: 'official', createdAt: '2026/01/16' },
  { id: 'ts-05', name: '王建國', zodiac: '馬', wish: '行車平安、工作順利', type: 'official', createdAt: '2026/01/18' },
  { id: 'ts-06', name: '黃雅婷', zodiac: '鼠', wish: '學業進步、金榜題名', type: 'official', createdAt: '2026/01/18' },
  { id: 'ts-07', name: '吳宗憲', zodiac: '兔', wish: '生意興隆、消災解厄', type: 'official', createdAt: '2026/01/20' },
  { id: 'ts-08', name: '蔡佳蓉', zodiac: '雞', wish: '姻緣美滿、諸事順心', type: 'official', createdAt: '2026/01/20' },
  { id: 'ts-09', name: '劉俊宏', zodiac: '龍', wish: '平安健康、福慧增長', type: 'official', createdAt: '2026/01/22' },
  { id: 'ts-10', name: '許芳瑜', zodiac: '蛇', wish: '長輩安康、家庭和樂', type: 'official', createdAt: '2026/01/22' },
  { id: 'ts-11', name: '鄭家豪', zodiac: '馬', wish: '轉換跑道順利、遇貴人', type: 'official', createdAt: '2026/01/25' },
  { id: 'ts-12', name: '謝佩君', zodiac: '鼠', wish: '心神安寧、遠離小人', type: 'official', createdAt: '2026/01/25' },
  { id: 'ts-13', name: '郭明哲', zodiac: '猴', wish: '工程順利、平安納福', type: 'official', createdAt: '2026/02/01' },
  { id: 'ts-14', name: '洪宜蓁', zodiac: '羊', wish: '業績長紅、身體健康', type: 'official', createdAt: '2026/02/01' },
  { id: 'ts-15', name: '曾冠宇', zodiac: '虎', wish: '步步高升、出入平安', type: 'official', createdAt: '2026/02/03' },
  { id: 'ts-16', name: '邱玉蘭', zodiac: '牛', wish: '延年益壽、子孫賢孝', type: 'official', createdAt: '2026/02/03' },
  { id: 'ts-17', name: '周柏翰', zodiac: '狗', wish: '創業順遂、客源不斷', type: 'official', createdAt: '2026/02/05' },
  { id: 'ts-18', name: '葉欣怡', zodiac: '豬', wish: '旅途平安、好運連連', type: 'official', createdAt: '2026/02/05' },
  { id: 'ts-19', name: '廖振宇', zodiac: '馬', wish: '化險為夷、吉星高照', type: 'official', createdAt: '2026/02/08' },
  { id: 'ts-20', name: '蘇婉清', zodiac: '兔', wish: '心情開朗、順遂平安', type: 'official', createdAt: '2026/02/08' },
  { id: 'ts-21', name: '簡志偉', zodiac: '鼠', wish: '專案順利、家庭美滿', type: 'official', createdAt: '2026/02/10' },
  { id: 'ts-22', name: '莊惠雯', zodiac: '雞', wish: '平安健康、事事如意', type: 'official', createdAt: '2026/02/10' },
  { id: 'ts-23', name: '游明德', zodiac: '龍', wish: '五年千歲庇佑安康', type: 'official', createdAt: '2026/02/12' },
  { id: 'ts-24', name: '呂思穎', zodiac: '馬', wish: '逢凶化吉、所求皆應', type: 'official', createdAt: '2026/02/12' }
];

export const INITIAL_CHAT_MESSAGES = [
  {
    id: 'msg-init-1',
    sender: '阿財伯（廟公）',
    role: 'keeper',
    avatar: '👴',
    text: '歡迎來到擴建後的玉勅代天府德慈宮！大殿現在有 36 個拜墊，廟外四周也能散步逛供品鋪跟挑戰民俗問答喔～',
    timestamp: Date.now() - 180000
  },
  {
    id: 'msg-init-2',
    sender: '淑芬阿姨（香客）',
    role: 'ai-pilgrim',
    avatar: '👩',
    text: '今天天氣真好！我剛剛去後院林蔭步道散步一圈，還去供品鋪請了鳳梨來大供桌祈福，心情超舒暢！',
    timestamp: Date.now() - 90000
  }
];
