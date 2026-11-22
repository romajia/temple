/**
 * 免金鑰「AI 廟公」引擎
 * ------------------------------------------------------------
 * 1. 專屬白話解籤產生器：結合六十甲子籤詩等級、原詩意象、使用者姓名、祈求類別與煩惱關鍵字，
 *    模擬台灣親切老廟公「阿財伯」溫暖接地氣的口吻解籤。
 * 2. 板凳聊天室智慧接話：由「AI 廟公阿財伯」與「AI 熱心香客淑芬阿姨／阿明」依話題自然互動。
 * （亦預留外接 LLM API 的擴充點）
 */

const CATEGORY_LABELS = {
  general: '綜合運勢',
  career: '事業工作',
  wealth: '財運投資',
  love: '感情姻緣',
  health: '身體健康',
  study: '學業考試',
  family: '家運平安'
};

const TOPIC_KEYWORDS = [
  {
    category: 'career',
    keywords: ['工作', '離職', '轉職', '跳槽', '升遷', '面試', '老闆', '主管', '同事', '事業', '創業', '加班', '專案', '職場'],
    adviceGood: '你在職場上的努力五府千歲都看在眼裡！這段時間適合主動爭取表現機會，如果有想推進的計畫或新職務，放心踏出第一步，貴人就在身旁。',
    adviceMid: '工作上的卡關只是暫時的過渡期，先別急著衝動辭職或硬碰硬，把手邊核心任務顧穩，多跟前輩請益，很快就會看見轉機。',
    adviceCareful: '職場氣場最近比較浮動，切記「少說話、多做事、留紀錄」，遇到無理要求別往心裡去，先沉住氣累積實力，等時機成熟再華麗轉身。'
  },
  {
    category: 'wealth',
    keywords: ['錢', '財', '投資', '股票', '基金', '買房', '生意', '業績', '加薪', '貸款', '創業', '賺錢', '副業', '財務'],
    adviceGood: '正財運勢相當旺！只要腳踏實地、不貪快錢，這波努力很有機會轉化為實質進帳，記得有盈餘也留一份回饋家人或行善積福喔。',
    adviceMid: '財庫正在慢慢累積中，適合穩健理財、細水長流，千萬別聽信別人報明牌就一把梭哈，守住本金就是贏。',
    adviceCareful: '近期偏財運較弱，看到高報酬誘惑一定要踩煞車！把開銷盤點清楚、先把現金留在身邊，度過這陣子財運自然會回溫。'
  },
  {
    category: 'love',
    keywords: ['感情', '愛情', '桃花', '曖昧', '分手', '復合', '結婚', '對象', '老公', '老婆', '男友', '女友', '單身', '姻緣', '吵架'],
    adviceGood: '觀音佛祖跟媽祖娘娘都在幫你牽好緣喔！有伴的記得多說幾句暖心話，單身的朋友多出門走走，溫柔真誠的態度最能吸引對的人。',
    adviceMid: '感情最忌諱猜來猜去，心裡有什麼感受就溫柔地講出來，給彼此一點喘息空間，緣分自然會往好的方向走。',
    adviceCareful: '別為了一段讓你內耗的關係委屈自己。神明提醒你先把重心放回照顧自己、讓自己發光，是你的正緣跑不掉，不適合的就當作消業障啦。'
  },
  {
    category: 'health',
    keywords: ['健康', '生病', '手術', '開刀', '身體', '睡不著', '失眠', '壓力', '焦慮', '疲累', '爸媽', '長輩', '平安', '醫院', '復原'],
    adviceGood: '身體與元氣正在慢慢回升！記得按時吃飯、早點休息，配合醫囑並保持心情開朗，神明保佑你與家人平平安安。',
    adviceMid: '最近是不是太操勞、心思太重了呢？身體在提醒你要放慢腳步，偶爾深呼吸、散散步、少熬夜，心安了身體就會跟著順。',
    adviceCareful: '千萬別硬撐！有不舒服就早點去做檢查、乖乖休養，也可以在正殿拜墊多敲幾下木魚念念心經，把緊繃的壓力交給菩薩幫忙扛一點。'
  },
  {
    category: 'study',
    keywords: ['考試', '考上', '國考', '學測', '統測', '論文', '研究所', '升學', '成績', '證照', '讀書', '面試'],
    adviceGood: '文昌運與考運很不錯喔！維持現在的讀書節奏，考前把常錯的重點再溫習一遍，進考場深呼吸，實力一定能正常發揮！',
    adviceMid: '讀書難免有撞牆期，覺得卡住就起來喝杯水、動一動再看，把大目標拆成每天的小進度，穩穩寫完就贏過很多人了。',
    adviceCareful: '別因為模擬成績或別人的進度就慌了陣腳！現在最重要的是顧好基本題與作息，踏實打好底子，黑馬往往都是最後沉住氣的人。'
  },
  {
    category: 'family',
    keywords: ['家人', '家庭', '父母', '小孩', '孩子', '家運', '搬家', '房子', '婆媳', '兄弟', '姐妹'],
    adviceGood: '家和萬事興！家裡最近的氣場很溫暖，有空多陪長輩吃頓飯、說句平安祝福，家運會越來越興旺。',
    adviceMid: '家人間難免意見不同，多半都是出於關心，退一步海闊天空，換個語氣溝通，很多誤會一下子就化開了。',
    adviceCareful: '家裡若近期有大小煩心事，切忌在氣頭上說重話。不妨替家人在紅紙牆點一盞平安太歲燈，用柔和與耐心化解紛爭。'
  }
];

function classifyLevel(level) {
  if (['上上', '大吉', '上吉'].includes(level)) return 'good';
  if (['中吉', '中平'].includes(level)) return 'mid';
  return 'careful';
}

/**
 * 產生 AI 廟公專屬白話解籤
 */
export function generateFortuneInterpretation({ userName, category, question, poem }) {
  const name = (userName || '').trim() || '善信大德';
  const cleanQ = (question || '').trim();
  const tier = classifyLevel(poem.level);

  // 偵測使用者煩惱中的關鍵字主題
  let matchedTopic = TOPIC_KEYWORDS.find(t =>
    t.keywords.some(kw => cleanQ.includes(kw))
  );
  if (!matchedTopic) {
    matchedTopic = TOPIC_KEYWORDS.find(t => t.category === category);
  }

  // 開場白（台灣親切老廟公口吻）
  const openings = {
    good: `哎呀～${name}，恭喜你抽到這支【第 ${poem.id} 籤・${poem.stem}・${poem.level}】好籤！阿財伯替你開心喔，五府千歲跟觀音佛祖給你滿滿的鼓勵呢。`,
    mid: `${name} 來來來，先坐下來喝口茶別緊張。你求到的這支【第 ${poem.id} 籤・${poem.stem}・${poem.level}】，是一支很實在、很有智慧的指引籤喔。`,
    careful: `${name} 別看到「${poem.level}」就嚇一跳喔！阿財伯跟你說，廟裡常講「逢凶早知道，就是神明來提醒避坑」，這支【第 ${poem.id} 籤・${poem.stem}】其實是神明疼惜你、先幫你踩煞車！`
  };

  // 針對使用者輸入的煩惱回應
  const catLabel = CATEGORY_LABELS[category] || '心中所求';
  const questionEcho = cleanQ
    ? `針對你剛剛跟神明稟報的「${cleanQ.slice(0, 48)}${cleanQ.length > 48 ? '…' : ''}」，`
    : `針對你所問的【${catLabel}】，`;

  const poemMeaning = `籤詩裡寫道「${poem.poem[0]}，${poem.poem[1]}」，這是在告訴你：${poem.summary}`;

  let specificAdvice = '';
  if (matchedTopic) {
    specificAdvice = tier === 'good'
      ? matchedTopic.adviceGood
      : tier === 'mid'
        ? matchedTopic.adviceMid
        : matchedTopic.adviceCareful;
  } else {
    specificAdvice = tier === 'good'
      ? '現在整體氣場順遂，心裡想做的正當事就放膽去執行，保持感恩與謙遜，好運會一路跟著你。'
      : tier === 'mid'
        ? '這件事急不得，就像泡茶要等水滾、茶葉舒展才香。照著自己的步調穩穩做，時間到了自然水到渠成。'
        : '這陣子先「守成不躁進」，把步調放慢、多觀察少衝動，多說好話、多行小善，轉個念很快就能撥雲見日。';
  }

  // 具體行動小撇步（3 項）
  const actionTips = tier === 'good'
    ? [
        '把握近期好氣場，把延宕已久的計畫列成第一步立刻動手。',
        '記得分享喜悅給身邊重要的人，貴人緣會加倍放大。',
        '有空常懷善念，德慈宮眾神明會一路庇佑你平安順遂。'
      ]
    : tier === 'mid'
      ? [
          '先給自己 3 到 7 天沉澱，不急著在情緒波動時做重大決定。',
          '找一位你信任且務實的長輩或朋友聊聊，會獲得意外盲點提醒。',
          '睡前放下手機深呼吸五次，心穩了，好運自然就會靠過來。'
        ]
      : [
          '近期重要合約、金錢或口舌是非務必多看兩眼、三思而後行。',
          '不妨到正殿拜墊跪坐敲木魚念一段《心經》，把緊繃焦慮卸下來。',
          '低谷正是蓄力期，把作息和身體顧好，就是最好的改運方法！'
        ];

  // 精選圖卡短金句
  const cardQuote = tier === 'good'
    ? '心誠則靈，好運正朝你走來，放手前行必有貴人相伴！'
    : tier === 'mid'
      ? '慢一點沒關係，穩住步伐，時間會為你帶來最好的安排。'
      : '暫退一步不是輸，而是神明護你避開風浪，蓄勢迎向光明。';

  return {
    opening: openings[tier],
    analysis: `${questionEcho}${poemMeaning}`,
    advice: specificAdvice,
    actionTips,
    cardQuote,
    story: poem.story
  };
}

/**
 * 板凳聊天室 AI 陪聊引擎（阿財伯廟公 + 熱心香客淑芬阿姨 & 阿明）
 */
const AI_PERSONAS = [
  { name: '阿財伯（廟公）', role: 'keeper', avatar: '👴' },
  { name: '淑芬阿姨（香客）', role: 'ai-pilgrim', avatar: '👩' },
  { name: '阿明（香客）', role: 'ai-pilgrim', avatar: '🧑' }
];

const CHAT_RULES = [
  {
    match: ['你好', '哈囉', '安安', '早安', '午安', '晚安', '大家好', '嗨'],
    replies: [
      { persona: 0, text: '平安平安！來德慈宮拜拜心情就會變好喔，剛到可以先去左邊香燭區點三柱清香，再從天公爐開始拜～' },
      { persona: 1, text: '哈囉你好呀！快坐下來一起吹吹微風，今天廟埕氣氛超舒服的～' }
    ]
  },
  {
    match: ['籤', '擲筊', '聖筊', '解籤', '笑筊', '陰筊'],
    replies: [
      { persona: 0, text: '求籤記得心要靜下來，跟五府千歲還有觀音佛祖把名字、煩惱講清楚再擲筊喔！如果是笑筊，代表神明笑笑要你再想清楚一點～' },
      { persona: 2, text: '我剛剛也去求了一支籤！阿財伯解得超暖心，還可以把籤詩圖卡下載存成手機桌布保平安喔！' }
    ]
  },
  {
    match: ['太歲', '點燈', '紅紙', '犯太歲', '光明燈'],
    replies: [
      { persona: 0, text: '正殿右手邊那整面紅紙牆就是我們德慈宮的太歲燈牆！可以輸入名字找找自己或家人的燈位，也能直接線上貼一張專屬紅紙祈福喔。' },
      { persona: 1, text: '我每年都會幫全家人安太歲，剛剛在紅紙牆看到自己的名字發亮，真的超有臨場感！' }
    ]
  },
  {
    match: ['供品', '水果', '鳳梨', '蘋果', '橘子', '鮮花', '金紙'],
    replies: [
      { persona: 0, text: '拜拜講究的是誠心！鳳梨代表旺來、蘋果代表平安、橘子代表大吉大利。對了，供桌空間大家輪流用，供品擺滿 10 分鐘就會自動收起來讓下一位善信方便擺放喔～' },
      { persona: 2, text: '最後別忘了拿金紙去廟宇右邊外面的金爐燒化，火焰跟煙霧特效超療癒的！' }
    ]
  },
  {
    match: ['工作', '累', '壓力', '煩', '迷茫', '難過', '焦慮', '辛苦', '加油'],
    replies: [
      { persona: 0, text: '辛苦你了孩子～人生難免有起起伏伏，累的時候就來板凳坐坐，或是去神明前拜墊敲敲木魚念一段《心經》，把煩惱交給五府千歲跟觀音佛祖分擔一點。' },
      { persona: 1, text: '拍拍你！別給自己太大壓力喔，深呼吸喝杯溫水，大家在這裡一起替你加油祈福，一定會越來越順利的！' }
    ]
  },
  {
    match: ['建廟', '新廟', '捐款', '公佈欄', '進度'],
    replies: [
      { persona: 0, text: '感謝關心我們德慈宮建廟進度！最新工程消息跟捐款芳名錄都貼在廟右邊的紅底木框公佈欄上，等新廟落成我們還會把 3D 廟景升級得更莊嚴華麗喔！' }
    ]
  },
  {
    match: ['念經', '木魚', '心經', '跪坐'],
    replies: [
      { persona: 1, text: '正殿拜墊的跪坐念經模式超療癒的！慢慢敲著木魚看著《心經》字幕，煩躁的心真的很快就平靜下來了。' },
      { persona: 0, text: '心無罣礙，無罣礙故，無有恐怖。每天花一分鐘靜心敲木魚，也是很棒的修心功夫喔！' }
    ]
  },
  {
    match: ['謝謝', '感謝', '平安', '保佑', '祝福'],
    replies: [
      { persona: 0, text: '不客氣不客氣！祝福你闔家平安、身體健康、萬事如意、貴人常在喔！🙏' },
      { persona: 2, text: '大家一起平安順心！有空常回來德慈宮走走聊天呀！' }
    ]
  }
];

const FALLBACK_REPLIES = [
  { persona: 0, text: '說得真好～有空常來德慈宮跟五府千歲、觀音佛祖還有天上聖母說說話，心誠自然有感應喔！' },
  { persona: 1, text: '真的耶！能在板凳上這樣跟大家輕鬆聊聊天，覺得整個人都溫暖起來了～祝你今天一切順心！' },
  { persona: 2, text: '哈哈我也有同感！對了你走完五步驟參拜了嗎？看著手上的三柱清香冒煙超有台灣廟埕的味道！' },
  { persona: 0, text: '來來來，阿財伯幫你添一杯平安茶～不管遇到什麼事，記得保持微笑，好事正在路上呢！' }
];

export function generateBenchAIReply(userText, senderName = '香客') {
  const lower = userText.toLowerCase();
  for (const rule of CHAT_RULES) {
    if (rule.match.some(kw => lower.includes(kw))) {
      const pick = rule.replies[Math.floor(Math.random() * rule.replies.length)];
      const persona = AI_PERSONAS[pick.persona];
      return {
        sender: persona.name,
        role: persona.role,
        avatar: persona.avatar,
        text: pick.text.replace('{name}', senderName)
      };
    }
  }
  const fb = FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)];
  const persona = AI_PERSONAS[fb.persona];
  return {
    sender: persona.name,
    role: persona.role,
    avatar: persona.avatar,
    text: fb.text
  };
}
