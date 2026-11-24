/**
 * 《御朱燈影：跟著宮廟去旅行》全站設定檔
 * - 可自由替換贊助連結、LINE Pay / 街口支付 QR Code 圖片、宮廟合作 LINE 聯絡連結
 * - 預留 Firebase / Supabase 串接欄位，供未來 B2B 宮廟打卡統計上線使用
 */

export const SITE_CONFIG = {
  appName: '御朱燈影',
  appSubtitle: '跟著宮廟去旅行',
  version: '1.0.0',

  // GPS 打卡半徑（公尺）
  checkInRadiusMeters: 100,

  // 同時可放入香囊的香火苗上限
  maxSeedSlots: 4,

  // GPS 移動距離過濾設定（兼顧散步與跨縣市搭車/騎車進香）
  geoFilter: {
    minStepMeters: 8,         // 低於 8 公尺視為靜止 GPS 飄移，不計入
    maxAccuracyMeters: 85,    // GPS 精度劣於 85 公尺時略過該筆定位點
    maxSpeedKmh: 135          // 支援日常步行、單車、機車、高鐵以外之跨縣市車行巡禮
  },

  // 四種靈韻香火苗設定（對應 PRD 模組 B）
  seedTypes: {
    gold: {
      id: 'gold',
      targetKm: 2.0,
      color: '#D4AF37',
      accentBg: '#FEF6DC',
      borderColor: '#C5961B',
      name: {
        'zh-TW': '金色香火苗',
        en: 'Golden Incense Seed',
        ja: '金色の香火苗'
      },
      theme: {
        'zh-TW': '財運・土地公／財神',
        en: 'Prosperity · Earth God & Wealth',
        ja: '財運・土地公／財神'
      },
      shortDesc: {
        'zh-TW': '步行或巡禮累積 2.0 公里即顯化',
        en: 'Hatches after 2.0 km of travel',
        ja: '2.0 km の旅で御朱印が顕現'
      }
    },
    vermilion: {
      id: 'vermilion',
      targetKm: 3.0,
      color: '#C83C2B',
      accentBg: '#FCEBE8',
      borderColor: '#B12F20',
      name: {
        'zh-TW': '朱紅香火苗',
        en: 'Vermilion Incense Seed',
        ja: '朱紅の香火苗'
      },
      theme: {
        'zh-TW': '平安・媽祖／王爺／玄天上帝',
        en: 'Peace · Mazu & Royal Lords',
        ja: '平安・媽祖／王爺'
      },
      shortDesc: {
        'zh-TW': '步行或巡禮累積 3.0 公里即顯化',
        en: 'Hatches after 3.0 km of travel',
        ja: '3.0 km の旅で御朱印が顕現'
      }
    },
    jade: {
      id: 'jade',
      targetKm: 5.0,
      color: '#2E6F5E',
      accentBg: '#E6F3EE',
      borderColor: '#23594B',
      name: {
        'zh-TW': '青玉香火苗',
        en: 'Jade Craft Seed',
        ja: '青玉の香火苗'
      },
      theme: {
        'zh-TW': '智慧工藝・文昌／百年古蹟',
        en: 'Wisdom & Craft · Historic Monuments',
        ja: '知恵と工芸・古蹟名社'
      },
      shortDesc: {
        'zh-TW': '累積 5.0 公里深度走讀顯化',
        en: 'Hatches after 5.0 km cultural journey',
        ja: '5.0 km の文化巡りで顕現'
      }
    },
    purple_gold: {
      id: 'purple_gold',
      targetKm: 10.0,
      color: '#6D2E46',
      accentBg: '#F6EAF0',
      borderColor: '#D4AF37',
      name: {
        'zh-TW': '紫金限定苗',
        en: 'Imperial Pilgrimage Seed',
        ja: '紫金限定苗'
      },
      theme: {
        'zh-TW': '繞境・節慶跨縣市特別版',
        en: 'Festival · Cross-County Pilgrimage',
        ja: '巡礼・祭典特別版'
      },
      shortDesc: {
        'zh-TW': '跨縣市進香累積 10.0 公里顯化珍稀金框朱印',
        en: '10.0 km pilgrimage for rare gold-foil Goshuin',
        ja: '10.0 km 達成で金箔特別御朱印が顕現'
      }
    }
  },

  // ☕ 設計師贊助設定（請替換為您的真實連結與 QR Code 圖片路徑）
  sponsor: {
    designerName: '御朱燈影獨立設計團隊',
    message: '本專案免下載、無廣告、開放全台香客免費使用。如果這趟宮廟旅行帶給您一點溫暖，歡迎請設計師喝杯咖啡，支持我們繪製更多台灣宮廟工藝御朱印！',
    // 若您已上傳街口 / LINE Pay 收款 QR Code 圖片，請將下方設為 './assets/pay-qr.png'
    qrImageUrl: '',
    qrLabel: '街口支付 / LINE Pay 贊助碼',
    qrAccountNote: '可於 js/config/siteConfig.js 替換為您的專屬收款 QR Code 圖片',
    buyMeACoffeeUrl: 'https://buymeacoffee.com/',
    portalyUrl: 'https://portaly.cc/'
  },

  // 🏮 宮廟申請加入計畫（B2B 合作導流設定）
  partnerB2B: {
    lineOfficialUrl: 'https://line.me/R/ti/p/@templego',
    contactEmail: 'hello@templego.tw',
    webhookUrl: '', // 選填：可接 Google Apps Script / Formspree / Supabase Edge Function
    benefits: [
      '免費客製宮廟專屬「朱紅御朱印」與建築工藝徽章設計',
      '內建「結緣品兌換憑證」核銷畫面，自然導流健走與觀光旅人走入廟埕',
      '提供廟宇專屬打卡 QR Code 立牌圖檔，室內外皆可一秒完成參拜播種',
      '未來串接後台統計月度打卡人次、外縣市旅人佔比，協助文化行銷提案'
    ]
  },

  // ☁️ 雲端分析預留介面（Firebase / Supabase）
  cloud: {
    provider: 'local', // 'local' | 'firebase' | 'supabase'
    firebase: {
      databaseURL: '',
      apiKey: '',
      projectId: ''
    },
    supabase: {
      url: '',
      anonKey: '',
      checkinsTable: 'temple_checkins'
    }
  },

  // 預設示範參考座標（未授權 GPS 時可供體驗距離排序）
  demoLocations: [
    { id: 'shoutian_area', label: '南投・松柏嶺受天宮周邊', lat: 23.8318, lng: 120.6290 },
    { id: 'tainan_anding', label: '臺南・安定德慈宮周邊', lat: 23.0932, lng: 120.2340 },
    { id: 'taipei_wanhua', label: '臺北・萬華龍山寺周邊', lat: 25.0390, lng: 121.5012 },
    { id: 'taichung_dajia', label: '臺中・大甲鎮瀾宮周邊', lat: 24.3468, lng: 120.6245 }
  ]
};
