/**
 * V6 狀態自動存檔、廟埕清淨守護機制、跨裝置雲端多人同步（Firebase RTDB REST ＋ 本機伺服器 ＋ 多分頁即時同步）
 * ------------------------------------------------------------
 * 1. 全自動存檔（LocalStorage）：離開／重整自動保存功德、香火背包、參拜進度、角色造型、
 *    木魚功德次數、每日簽到與每日民俗挑戰紀錄。
 * 2. 真實多人連線與管理者雲端同步（三層自動架構）：
 *    - 雲端層（GitHub Pages 跨手機／跨電腦必備）：只要於 firebaseConfig.js 或廟務後臺填入
 *      Firebase Realtime Database 網址（免費 Spark 方案即可），立即啟用跨裝置多人同屏、
 *      多人即時聊天紀錄、以及管理者公佈欄／建廟進度／安太歲名單／供桌全站即時同步！
 *    - 區網／本機伺服器層：自動串接 `/api/mp/sync`、`/api/mp/chat`、`/api/mp/shared`
 *    - 同瀏覽器多分頁層：同步整合 `BroadcastChannel` ＋ `storage` 事件零延遲合併同步
 * 3. 廟埕清淨守護機制：強化中台英文髒話／諧音／符號穿插偵測、攔截不雅發言並對累犯啟動 60 秒靜心冷卻。
 */
import { FIREBASE_CONFIG } from '../config/firebaseConfig.js';
import { TEMPLE_CONFIG, TALISMAN_CATALOG, DAILY_QUESTS } from '../config/templeConfig.js';
import {
  INITIAL_BULLETIN,
  INITIAL_TAISUI_LIST,
  INITIAL_CHAT_MESSAGES,
  OFFERING_CATALOG
} from '../data/initialData.js';

const STORAGE_KEYS = {
  bulletin: 'deci_temple_bulletin_v5',
  taisui: 'deci_temple_taisui_v5',
  offerings: 'deci_temple_offerings_v5',
  tigerEggs: 'deci_temple_tiger_eggs_v1',
  teaOffer: 'deci_temple_tea_offer_v1',
  chat: 'deci_temple_chat_v5',
  player: 'deci_temple_player_v5',
  playerUid: 'deci_temple_player_uid_v1',
  cloudDbUrl: 'deci_temple_cloud_db_url_v1',
  visitStats: 'deci_temple_visit_stats_v1',
  firebaseApiKey: 'deci_temple_firebase_api_key_v1',
  adminAccounts: 'deci_temple_admin_accounts_v53'
};

// ★ V53：管理員驗證工作階段僅暫存於 sessionStorage（關閉分頁即自動登出）
const ADMIN_SESSION_KEY = 'deci_temple_admin_auth_v53';
const ADMIN_LOCK_KEY = 'deci_temple_admin_lock_v53';

// ★ V53 初始最高權限管理員（僅存加鹽 SHA-256 雜湊，絕不存放明文密碼；登入後可於「👤 管理員帳號」一鍵改密碼並新增其他管理員！）
const BOOTSTRAP_SUPER_ADMIN = {
  username: 'admin',
  displayName: '最高權限管理員',
  role: 'super',
  salt: 'deci_super_v53_9f4a2c8e',
  passwordHash: '34459693b920d032bb109a79d37e1cc93f018004ccbc78707ad0265dc18b826c',
  isDefaultPass: true,
  createdAt: '系統預設',
  createdBy: 'system'
};

// 純 JS 標準 SHA-256 備援（確保非 HTTPS 區網環境與 HTTPS 正式站算出 100% 相同雜湊！）
function _sha256PureJs(bytes) {
  const K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const l = bytes.length;
  const bitLen = l * 8;
  const paddedLen = Math.ceil((l + 9) / 64) * 64;
  const buf = new Uint8Array(paddedLen);
  buf.set(bytes);
  buf[l] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);
  const W = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let i = 0; i < paddedLen; i += 64) {
    for (let t = 0; t < 16; t++) W[t] = view.getUint32(i + t * 4, false);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  return H.map((v) => v.toString(16).padStart(8, '0')).join('');
}

async function sha256Hex(str) {
  const bytes = new TextEncoder().encode(String(str));
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    try {
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {}
  }
  return _sha256PureJs(bytes);
}

// 安全白名單（先暫時保護日常正常詞彙，避免誤判「幹嘛、操作、靠廟」等字眼）
const SAFE_WHITELIST = [
  '幹嘛', '幹麻', '幹活', '幹部', '骨幹', '樹幹', '主幹', '才幹', '能幹', '實幹', '精幹', '軀幹', '枝幹',
  '苦幹', '蠻幹', '包幹', '幹練', '幹勁', '幹員', '幹事', '幹探', '幹線', '幹道', '幹預', '公幹', '餅乾',
  '操作', '操場', '體操', '早操', '操心', '操勞', '操守', '操縱', '操控', '操演', '操練', '操辦', '節操', '情操', '曹操',
  '依靠', '可靠', '靠近', '靠邊', '靠岸', '靠山', '靠背', '靠墊', '靠窗', '靠牆', '靠廟', '靠右', '靠左', '靠前', '靠後', '牢靠', '倚靠', '投靠', '停靠', '背靠',
  '什麼', '甚麼', '屁股', '馬屁'
];

// 廟埕清淨守護強化詞庫（含單字髒話「幹、操、肏、尻、賤、婊、妓、淫、嫖、屎」與完整國台英不雅詞、諧音、網路髒話、詐騙廣告）
const BLOCKED_WORDS = [
  // 多字優先比對（依長到短）
  '幹你娘機掰', '幹你老母', '幹你老師', '幹你娘', '幹您娘', '幹妳娘', '幹林娘', '幹拎娘', '甘霖老木', '甘霖娘',
  '操你全家', '操你祖宗', '操你媽', '肏你媽', '草泥馬', '趕羚羊', '去給車撞', '不得好死', '死全家', '全家死',
  '烏龜王八', '王八蛋', '狗娘養', '狗東西', '臭三八', '肖查某', '蕭雜某', '神經病', '衝三小', '關你屁事',
  '線上娛樂城', '代操獲利', '加賴領飆股', '加line',
  '操你', '肏你', '幹你', '幹您', '幹妳', '幹死', '靠北', '靠杯', '靠腰', '靠邀', '靠么', '我靠', '哇靠',
  '他媽的', '她媽的', '你媽的', '老媽的', '馬的', '媽的', '媽逼', '馬逼', '他媽', '她媽', '你娘', '老娘', '他娘',
  '機掰', '雞掰', '機巴', '雞巴', '機歪', '雞歪', '懶覺', '覽叫', '陰莖', '陰道', '屁眼',
  '三小', '殺小', '啥小', '沙小', '林北', '拎北', '林娘', '恁爸', '恁娘', '林祖媽',
  '白痴', '白癡', '智障', '北七', '白七', '白目', '腦殘', '低能', '弱智', '蠢蛋', '笨蛋', '飯桶',
  '去死', '死掉', '下地獄', '垃圾', '廢物', '混帳', '混蛋', '畜生', '賤人', '賤貨', '婊子', '雜種', '雜碎',
  '滾蛋', '滾開', '快滾', '給我滾', '吃屎', '放屁', '屁話', '閉嘴', '臭嘴', '變態', '色狼', '色魔',
  '色情', '約炮', '援交', '裸聊', '一夜情', '賭博', '博弈', '詐騙',
  'motherfucker', 'asshole', 'bastard', 'bullshit', 'bitch', 'b1tch', 'fucker', 'fuck', 'fuk', 'fck',
  'shit', 'sh1t', 'dick', 'cock', 'pussy', 'cunt', 'whore', 'slut', 'wtf', 'stfu', 'nmsl', 'mlgb', 'dllm', 'cnm', 'tmd',
  '87', 'gy', 'sb', 'mb',
  // 單字強效攔截（白名單已先保護正常詞彙）
  '幹', '操', '肏', '尻', '屄', '賤', '婊', '妓', '淫', '嫖', '屎'
];

function toHalfWidth(str) {
  return String(str || '').replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
}

/**
 * 檢查並以「*」號淨化聊天文字（支援單字「幹／操」、穿插空白與符號繞過「幹.你.娘 / f u c k」偵測，同時保護白名單詞彙！）
 * 回傳 { clean, flagged, blocked, matchedWord }
 */
export function sanitizeChatText(input) {
  const raw = String(input || '').trim();
  if (!raw) return { clean: '', flagged: false, blocked: false, matchedWord: '' };

  const chars = Array.from(raw);
  const protectedMask = new Array(chars.length).fill(false);

  // 1. 標記安全白名單區間（例如「幹嘛、操作、靠廟」不誤傷）
  const lowerRaw = toHalfWidth(raw).toLowerCase();
  for (const safe of SAFE_WHITELIST) {
    let idx = lowerRaw.indexOf(safe);
    while (idx !== -1) {
      for (let k = idx; k < idx + safe.length && k < chars.length; k++) {
        protectedMask[k] = true;
      }
      idx = lowerRaw.indexOf(safe, idx + safe.length);
    }
  }

  // 2. 建立去除空白與標點後的緊湊索引表（識破「幹.你.娘」「f u c k」等穿插符號繞過！）
  const compactChars = [];
  const compactOrigIdx = [];
  const sepRegex = /[\s.,_\-*~`'"+=|/\\!@#$%^&()[\]{}:;<>?，。、！？「」『』（）【】…—－·]/;
  for (let i = 0; i < chars.length; i++) {
    if (protectedMask[i]) {
      // 白名單位置以特殊佔位符隔開，避免跨詞誤拼
      compactChars.push('\u0001');
      compactOrigIdx.push(i);
      continue;
    }
    const ch = toHalfWidth(chars[i]).toLowerCase();
    if (!sepRegex.test(ch)) {
      compactChars.push(ch);
      compactOrigIdx.push(i);
    }
  }
  const compactStr = compactChars.join('');

  const replaceMask = new Array(chars.length).fill(false);
  let flagged = false;
  let matchedWord = '';

  const isAlphaNumWord = (w) => /^[a-z0-9]+$/i.test(w);

  for (const word of BLOCKED_WORDS) {
    const normWord = word.toLowerCase();
    let pos = compactStr.indexOf(normWord);
    while (pos !== -1) {
      let validHit = true;
      // 短英數縮寫（如 87 / gy / sb / mb）避免誤傷長英文單字或數字（如 1987、energy）
      if (isAlphaNumWord(normWord) && normWord.length <= 3) {
        const prevCh = pos > 0 ? compactStr[pos - 1] : '';
        const nextCh = pos + normWord.length < compactStr.length ? compactStr[pos + normWord.length] : '';
        if (/[a-z0-9]/i.test(prevCh) || /[a-z0-9]/i.test(nextCh)) {
          validHit = false;
        }
      }
      if (validHit) {
        flagged = true;
        if (!matchedWord) matchedWord = word;
        const startOrig = compactOrigIdx[pos];
        const endOrig = compactOrigIdx[pos + normWord.length - 1];
        for (let j = startOrig; j <= endOrig; j++) {
          if (!protectedMask[j]) replaceMask[j] = true;
        }
      }
      pos = compactStr.indexOf(normWord, pos + normWord.length);
    }
  }

  let clean = raw;
  if (flagged) {
    clean = chars.map((ch, idx) => (replaceMask[idx] ? '*' : ch)).join('');
  }

  return { clean, flagged, blocked: flagged, matchedWord };
}

function normalizeDbUrl(raw) {
  const s = String(raw || '').trim().replace(/\/+$/, '');
  if (!s) return '';
  if (!/^https:\/\/[a-z0-9.-]+(?:firebaseio\.com|firebasedatabase\.app)$/i.test(s)) {
    return '';
  }
  return s;
}

function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

class TempleStorageSync {
  constructor() {
    const isStaticHost = /(?:github\.io|pages\.dev|netlify\.app|vercel\.app)$/i.test(window.location.hostname || '');
    this.isStaticHost = isStaticHost;
    this.clientId = `pilgrim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    this.playerUid = this._resolveOrCreatePlayerUid();
    this.lastBubbleText = '';
    this.lastBubbleAt = 0;
    this._peerLoggedBubbles = new Map();
    this._processedInteractionIds = new Set();

    // 1. 解析雲端 Firebase RTDB 網址（優先順序：網址 ?db= > 管理者本機設定 > firebaseConfig.js）
    this.cloudDbUrl = this._resolveInitialCloudDbUrl();
    this.cloudConnected = false;
    this.cloudLastError = '';
    this.adminAccounts = this._loadLocalAdminAccounts();
    this.adminAuth = this._loadAdminSession();
    // ★ V52 Firebase Realtime Database SDK 即時監聽狀態（WebSocket 增量推播，完全取代 presence/chat/interactions 輪詢！）
    this.fbSdk = null;
    this.fbApp = null;
    this.fbDb = null;
    this.sdkStreamActive = false;
    this.sdkConnected = false;
    this.sdkError = '';
    this._sdkUnsubs = [];
    this._sdkOfflineTimer = null;
    this._sdkPausedByHidden = false;
    this.mode = this.cloudDbUrl ? 'firebase' : (isStaticHost ? 'local-only' : 'server-mp');
    this.serverMpAvailable = !this.cloudDbUrl && !isStaticHost;

    // 2. 廟埕清淨守護（不雅字詞違規計次與靜心冷卻）
    this.profanityStrikes = Number(sessionStorage.getItem('deci_profanity_strikes') || 0);
    this.chatMuteUntil = Number(sessionStorage.getItem('deci_chat_mute_until') || 0);

    this.listeners = {
      bulletin: new Set(),
      taisui: new Set(),
      offerings: new Set(),
      tigerEggs: new Set(),
      teaOffer: new Set(),
      chat: new Set(),
      presence: new Set(),
      player: new Set(),
      quests: new Set(),
      interaction: new Set(),
      visitStats: new Set()
    };

    this.remotePeers = new Map();
    this.hasExistingRecord = false;

    this.state = {
      bulletin: this._load(STORAGE_KEYS.bulletin, INITIAL_BULLETIN),
      taisui: this._load(STORAGE_KEYS.taisui, INITIAL_TAISUI_LIST),
      offerings: this._loadOfferings(),
      tigerEggs: this._loadTigerEggs(),
      teaOffer: this._loadTeaOffer(),
      chat: this._dedupeChatList(this._load(STORAGE_KEYS.chat, INITIAL_CHAT_MESSAGES)),
      player: this._loadPlayer(),
      visitStats: this._loadVisitStats()
    };

    this.channel = typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel('deci_temple_realtime_v5')
      : null;

    if (this.channel) {
      this.channel.onmessage = (ev) => {
        const { topic, payload, senderId } = ev.data || {};
        if (!topic || senderId === this.clientId) return;
        if (topic === 'presence') {
          this._ingestRemotePeer(payload);
          this._emit('presence');
          return;
        }
        if (topic === 'chatMsg') {
          this._mergeIncomingChats([payload]);
          return;
        }
        if (topic === 'interaction') {
          if (payload && (payload.toUid === this.playerUid || payload.toClientId === this.clientId)) {
            this._handleIncomingInteraction(payload);
          }
          return;
        }
        if (this.listeners[topic]) {
          this.state[topic] = payload;
          this._emit(topic);
        }
      };
    }

    // 跨分頁 storage 事件備援同步（確保 Safari 等環境也能即時同步管理者儲存與聊天紀錄！）
    window.addEventListener('storage', (ev) => {
      if (!ev.key || !ev.newValue) return;
      try {
        const parsed = JSON.parse(ev.newValue);
        if (ev.key === STORAGE_KEYS.bulletin) {
          this.state.bulletin = parsed;
          this._emit('bulletin');
        } else if (ev.key === STORAGE_KEYS.taisui) {
          this.state.taisui = parsed;
          this._emit('taisui');
        } else if (ev.key === STORAGE_KEYS.offerings) {
          this.state.offerings = parsed;
          this._emit('offerings');
        } else if (ev.key === STORAGE_KEYS.chat && Array.isArray(parsed)) {
          this._mergeIncomingChats(parsed);
        }
      } catch {}
    });

    // 關閉／離開分頁前強制存檔並通知雲端離線
    const forceFlush = () => {
      this._save(STORAGE_KEYS.player, { ...this.state.player, lastSavedAt: Date.now() });
      if (this.cloudDbUrl) {
        try {
          fetch(`${this.cloudDbUrl}/presence/${this.clientId}.json`, {
            method: 'DELETE',
            keepalive: true
          }).catch(() => {});
        } catch {}
      }
    };
    window.addEventListener('beforeunload', forceFlush);
    window.addEventListener('pagehide', forceFlush);

    // 啟動即拉取共享資料（雲端 Firebase 或本機 LAN 伺服器）與全站參拜人數統計
    this.isPageHidden = typeof document !== 'undefined' && Boolean(document.hidden);
    this._mpPullCounter = 0;
    this._lastPresenceSignature = '';
    this._lastPresencePutAt = 0;

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        const wasHidden = this.isPageHidden;
        this.isPageHidden = Boolean(document.hidden);
        if (this.isPageHidden) {
          // ★ V52 背景分頁／手機鎖屏超過 15 秒自動斷開 WebSocket（0 背景流量與電量消耗！）
          clearTimeout(this._sdkOfflineTimer);
          this._sdkOfflineTimer = setTimeout(() => {
            if (this.isPageHidden && this.fbDb && this.fbSdk?.goOffline) {
              try {
                this.fbSdk.goOffline(this.fbDb);
                this._sdkPausedByHidden = true;
              } catch {}
            }
          }, 15000);
        } else if (wasHidden && this.cloudDbUrl) {
          clearTimeout(this._sdkOfflineTimer);
          this._lastCloudSync = 0;
          this._lastPresenceSignature = '';
          if (this._sdkPausedByHidden && this.fbDb && this.fbSdk?.goOnline) {
            try {
              this.fbSdk.goOnline(this.fbDb);
              this._sdkPausedByHidden = false;
            } catch {}
          }
          this._pullCloudShared();
          if (!this.sdkStreamActive) {
            this._pullCloudPresenceAndChat({ forceChat: true });
          }
          this._pullCloudVisitStats();
        }
      });
    }

    if (this.cloudDbUrl) {
      this._pullCloudShared();
      this._pullCloudVisitStats();
      // ★ V52 啟動 Firebase SDK WebSocket 即時監聽（presence / chat / interactions 零輪詢增量推播；若 CDN 受限自動降級 REST！）
      this._initFirebaseRealtimeSdk(this.cloudDbUrl);
    } else if (this.serverMpAvailable) {
      this._pullServerShared();
    }

    setInterval(() => {
      if (this.isPageHidden) return;
      this.pruneExpiredOfferings();
      this.pruneExpiredTigerEggs();
      this.pruneExpiredTeaOffer();
      this._pruneOfflinePeers();
    }, 1000);

    // ★ V51 省流量輪詢：公佈欄／太歲牆／供桌由每 2.5 秒放寬為每 20 秒（自己操作或切回分頁仍立即同步；背景分頁自動暫停，大幅省下 ~85% shared.json 流量！）
    setInterval(() => {
      if (this.isPageHidden) return;
      if (this.cloudDbUrl) {
        this._pullCloudShared();
      } else if (this.serverMpAvailable) {
        this._pullServerShared();
      }
    }, 20000);

    // ★ V51 省流量輪詢：全站參拜人數統計由每 15 秒放寬為每 60 秒（開啟後臺統計頁仍即時刷新；背景分頁自動暫停，省下 75% 流量！）
    setInterval(() => {
      if (this.isPageHidden) return;
      if (this.cloudDbUrl) {
        this._pullCloudVisitStats();
      }
    }, 60000);
  }

  getBandwidthSaverConfig() {
    return {
      version: 'V52',
      realtimeTransport: this.sdkStreamActive ? 'firebase-sdk-websocket' : 'rest-polling-fallback',
      sdkConnected: Boolean(this.sdkConnected),
      sdkStreamActive: Boolean(this.sdkStreamActive),
      sdkError: this.sdkError || '',
      onDisconnectEnabled: Boolean(this.sdkStreamActive),
      chatLimitToLast: 80,
      sharedPollMs: 20000,
      visitStatsPollMs: 60000,
      presencePollActiveMs: 2000,
      presencePollSoloMs: 4000,
      chatEveryNCycles: 2,
      idleHeartbeatMs: this.sdkStreamActive ? 12000 : 6000,
      pauseWhenHidden: true
    };
  }

  // ---- V52 Firebase Realtime Database SDK 即時監聽（WebSocket 增量推播，徹底取代 presence / chat / interactions 輪詢！） ----
  _teardownFirebaseRealtimeSdk() {
    clearTimeout(this._sdkOfflineTimer);
    this._sdkPausedByHidden = false;
    this.sdkStreamActive = false;
    this.sdkConnected = false;
    for (const unsub of this._sdkUnsubs) {
      try { if (typeof unsub === 'function') unsub(); } catch {}
    }
    this._sdkUnsubs = [];
    if (this.fbDb && this.fbSdk?.goOffline) {
      try { this.fbSdk.goOffline(this.fbDb); } catch {}
    }
    if (this.fbApp && this.fbSdk?.deleteApp) {
      try { this.fbSdk.deleteApp(this.fbApp).catch(() => {}); } catch {}
    }
    this.fbDb = null;
    this.fbApp = null;
  }

  async _loadFirebaseSdkModules() {
    if (this.fbSdk) return this.fbSdk;
    const [appMod, dbMod] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js')
    ]);
    this.fbSdk = {
      initializeApp: appMod.initializeApp,
      deleteApp: appMod.deleteApp,
      getDatabase: dbMod.getDatabase,
      ref: dbMod.ref,
      query: dbMod.query,
      limitToLast: dbMod.limitToLast,
      onValue: dbMod.onValue,
      onChildAdded: dbMod.onChildAdded,
      onChildChanged: dbMod.onChildChanged,
      onChildRemoved: dbMod.onChildRemoved,
      set: dbMod.set,
      remove: dbMod.remove,
      onDisconnect: dbMod.onDisconnect,
      goOffline: dbMod.goOffline,
      goOnline: dbMod.goOnline
    };
    return this.fbSdk;
  }

  async _initFirebaseRealtimeSdk(dbUrl) {
    this._teardownFirebaseRealtimeSdk();
    if (!dbUrl) return false;
    const initToken = `${dbUrl}|${Date.now()}`;
    this._sdkInitToken = initToken;
    this.sdkError = '';

    try {
      const sdk = await this._loadFirebaseSdkModules();
      if (this._sdkInitToken !== initToken || this.cloudDbUrl !== dbUrl) return false;

      const appCfg = { databaseURL: dbUrl };
      if (FIREBASE_CONFIG.projectId) appCfg.projectId = FIREBASE_CONFIG.projectId;
      const webApiKey = this.getFirebaseWebApiKey();
      if (webApiKey) appCfg.apiKey = webApiKey;

      const appName = `deci-rtdb-${Date.now().toString(36)}`;
      this.fbApp = sdk.initializeApp(appCfg, appName);
      this.fbDb = sdk.getDatabase(this.fbApp);

      // 1) 監聽真實 WebSocket 連線狀態，連線瞬間向 Firebase 伺服器註冊 onDisconnect 自動移除離線殘留！
      const connRef = sdk.ref(this.fbDb, '.info/connected');
      const unsubConn = sdk.onValue(connRef, (snap) => {
        const connected = Boolean(snap.val());
        this.sdkConnected = connected;
        if (connected) {
          this.cloudConnected = true;
          this.cloudLastError = '';
          this.sdkStreamActive = true;
          try {
            sdk.onDisconnect(sdk.ref(this.fbDb, `presence/${this.clientId}`)).remove().catch(() => {});
          } catch {}
          // 重新連線後強制推送最新位置
          this._lastPresenceSignature = '';
          this._emit('presence');
        }
      });
      this._sdkUnsubs.push(unsubConn);

      // 2) presence 即時增量串流（僅推送單一位變動香客，零全表重複下載！）
      const presenceRef = sdk.ref(this.fbDb, 'presence');
      const handlePeerSnap = (snap) => {
        const p = snap.val();
        if (!p || !p.id || p.id === this.clientId) return;
        const now = Date.now();
        if (now - (Number(p.updatedAt) || 0) > 25000) return;
        this._ingestRemotePeer(p);
        this._emit('presence');
      };
      this._sdkUnsubs.push(
        sdk.onChildAdded(presenceRef, handlePeerSnap, (err) => { this.sdkError = err?.message || 'presence_err'; }),
        sdk.onChildChanged(presenceRef, handlePeerSnap, (err) => { this.sdkError = err?.message || 'presence_err'; }),
        sdk.onChildRemoved(presenceRef, (snap) => {
          const removedId = snap.key;
          if (removedId && this.remotePeers.delete(removedId)) {
            this._emit('presence');
          }
        })
      );

      // 3) chat 即時增量串流（僅載入最新 80 則，之後每則新訊息僅收 ~150 bytes！）
      const chatQuery = sdk.query(sdk.ref(this.fbDb, 'chat'), sdk.limitToLast(80));
      this._sdkUnsubs.push(
        sdk.onChildAdded(chatQuery, (snap) => {
          const msg = snap.val();
          if (msg && typeof msg === 'object') {
            this._mergeIncomingChats([{ ...msg, id: msg.id || snap.key }]);
          }
        }, (err) => { this.sdkError = err?.message || 'chat_err'; })
      );

      // 4) 真人結緣互動／贈禮收件匣即時監聽（揮手／回禮／贈禮 < 150ms 即時跳出！）
      const safeUid = encodeURIComponent(this.playerUid);
      const interRef = sdk.ref(this.fbDb, `interactions/${safeUid}`);
      this._sdkUnsubs.push(
        sdk.onChildAdded(interRef, (snap) => {
          const ev = snap.val();
          const evKey = snap.key;
          if (!ev || typeof ev !== 'object') return;
          const evObj = { ...ev, id: ev.id || evKey };
          if (Date.now() - (evObj.createdAt || 0) > 180000) {
            sdk.remove(sdk.ref(this.fbDb, `interactions/${safeUid}/${evKey}`)).catch(() => {});
            return;
          }
          this._handleIncomingInteraction(evObj, evKey);
        }, (err) => { this.sdkError = err?.message || 'interaction_err'; })
      );

      this.sdkStreamActive = true;
      return true;
    } catch (err) {
      this.sdkStreamActive = false;
      this.sdkConnected = false;
      this.sdkError = err?.message || 'sdk_load_failed';
      console.warn('[StorageSync] Firebase SDK 載入失敗，自動降級為 V51 省流量 REST 輪詢：', this.sdkError);
      this._pullCloudPresenceAndChat({ forceChat: true });
      return false;
    }
  }

  _resolveOrCreatePlayerUid() {
    try {
      let uid = localStorage.getItem(STORAGE_KEYS.playerUid);
      if (!uid) {
        uid = `uid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem(STORAGE_KEYS.playerUid, uid);
      }
      return uid;
    } catch {
      return `uid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    }
  }

  getPlayerUid() {
    return this.playerUid;
  }

  getOnlinePeers() {
    return Array.from(this.remotePeers.values());
  }

  _resolveInitialCloudDbUrl() {
    try {
      const params = new URLSearchParams(window.location.search || '');
      const qDb = normalizeDbUrl(params.get('db'));
      if (qDb) {
        localStorage.setItem(STORAGE_KEYS.cloudDbUrl, qDb);
        return qDb;
      }
    } catch {}
    try {
      const saved = normalizeDbUrl(localStorage.getItem(STORAGE_KEYS.cloudDbUrl));
      if (saved) return saved;
    } catch {}
    if (FIREBASE_CONFIG.enabled && FIREBASE_CONFIG.databaseURL) {
      return normalizeDbUrl(FIREBASE_CONFIG.databaseURL);
    }
    return '';
  }

  getCloudDbUrl() {
    return this.cloudDbUrl || '';
  }

  setCloudDbUrl(rawUrl) {
    const clean = normalizeDbUrl(rawUrl);
    this.cloudDbUrl = clean;
    this.cloudConnected = false;
    this.cloudLastError = '';
    try {
      if (clean) localStorage.setItem(STORAGE_KEYS.cloudDbUrl, clean);
      else localStorage.removeItem(STORAGE_KEYS.cloudDbUrl);
    } catch {}
    if (clean) {
      this.mode = 'firebase';
      this.serverMpAvailable = false;
      this._pullCloudShared();
      this._pullCloudVisitStats();
      this._initFirebaseRealtimeSdk(clean);
    } else {
      this._teardownFirebaseRealtimeSdk();
      this.mode = this.isStaticHost ? 'local-only' : 'server-mp';
      this.serverMpAvailable = !this.isStaticHost;
    }
    this._emit('presence');
    return clean;
  }

  // ---- V53 簡易多層級廟務管理員帳號系統（最高管理員＋可新增其他管理員，加鹽 SHA-256 雜湊＋雲端跨裝置同步！） ----
  _loadLocalAdminAccounts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.adminAccounts);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          return parsed;
        }
      }
    } catch {}
    return { [BOOTSTRAP_SUPER_ADMIN.username]: { ...BOOTSTRAP_SUPER_ADMIN } };
  }

  _saveLocalAdminAccounts(map) {
    this.adminAccounts = map && Object.keys(map).length > 0
      ? map
      : { [BOOTSTRAP_SUPER_ADMIN.username]: { ...BOOTSTRAP_SUPER_ADMIN } };
    try {
      localStorage.setItem(STORAGE_KEYS.adminAccounts, JSON.stringify(this.adminAccounts));
    } catch {}
  }

  _generateAdminSalt() {
    const rand = new Uint8Array(12);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(rand);
      return 'deci_' + Array.from(rand).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    return `deci_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  async refreshAdminAccounts() {
    if (!this.cloudDbUrl || this._suppressAdminCloudWriteForTest) {
      return this.adminAccounts;
    }
    const { ok, data } = await this._getCloud('admin/accounts');
    if (ok && data && typeof data === 'object' && Object.keys(data).length > 0) {
      const normalized = {};
      Object.entries(data).forEach(([k, v]) => {
        if (v && typeof v === 'object' && v.passwordHash && v.salt) {
          const uname = String(v.username || k).trim().toLowerCase();
          if (uname) normalized[uname] = { ...v, username: uname };
        }
      });
      if (Object.keys(normalized).length > 0) {
        this._saveLocalAdminAccounts(normalized);
      }
    }
    return this.adminAccounts;
  }

  async _persistAdminAccountsCloud() {
    this._saveLocalAdminAccounts(this.adminAccounts);
    if (this.cloudDbUrl && !this._suppressAdminCloudWriteForTest) {
      return await this._putCloud('admin/accounts', this.adminAccounts);
    }
    return true;
  }

  _loadAdminSession() {
    try {
      const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.username || parsed.idToken || (parsed.localPreview && this.isLocalDevHost()))) {
        return parsed;
      }
    } catch {}
    return null;
  }

  _saveAdminSession(sessionObj) {
    this.adminAuth = sessionObj || null;
    try {
      if (sessionObj) sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(sessionObj));
      else sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {}
  }

  isLocalDevHost() {
    return /^(127\.0\.0\.1|localhost)$/i.test(window.location.hostname || '');
  }

  getFirebaseWebApiKey() {
    try {
      const saved = (localStorage.getItem(STORAGE_KEYS.firebaseApiKey) || '').trim();
      if (saved) return saved;
    } catch {}
    return String(FIREBASE_CONFIG.apiKey || '').trim();
  }

  setFirebaseWebApiKey(rawKey) {
    const clean = String(rawKey || '').trim();
    try {
      if (clean) localStorage.setItem(STORAGE_KEYS.firebaseApiKey, clean);
      else localStorage.removeItem(STORAGE_KEYS.firebaseApiKey);
    } catch {}
    return clean;
  }

  getAdminEmailHint() {
    return String(FIREBASE_CONFIG.adminEmailHint || '').trim();
  }

  isAdminAuthenticated() {
    return Boolean(this.adminAuth && (this.adminAuth.username || this.adminAuth.idToken || (this.adminAuth.localPreview && this.isLocalDevHost())));
  }

  isAdminFirebaseSignedIn() {
    return Boolean(this.adminAuth && this.adminAuth.idToken);
  }

  isSuperAdmin() {
    return Boolean(this.adminAuth && (this.adminAuth.role === 'super' || this.adminAuth.idToken));
  }

  getCurrentAdminAccount() {
    if (!this.adminAuth) return null;
    return {
      username: this.adminAuth.username || this.adminAuth.email || 'admin',
      displayName: this.adminAuth.displayName || this.adminAuth.email || '廟務管理員',
      role: this.adminAuth.role || (this.adminAuth.idToken ? 'super' : 'staff'),
      isDefaultPass: Boolean(this.adminAuth.isDefaultPass),
      authType: this.adminAuth.idToken ? 'firebase' : 'account'
    };
  }

  getAdminEmail() {
    return this.adminAuth?.displayName || this.adminAuth?.username || this.adminAuth?.email || '';
  }

  getAdminAccountsList() {
    const list = Object.values(this.adminAccounts || {}).map((a) => ({
      username: a.username,
      displayName: a.displayName || a.username,
      role: a.role === 'super' ? 'super' : 'staff',
      isDefaultPass: Boolean(a.isDefaultPass),
      createdAt: a.createdAt || '',
      createdBy: a.createdBy || ''
    }));
    return list.sort((a, b) => {
      if (a.role !== b.role) return a.role === 'super' ? -1 : 1;
      return a.username.localeCompare(b.username);
    });
  }

  _getAdminLoginLockState() {
    try {
      const raw = sessionStorage.getItem(ADMIN_LOCK_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { fails: 0, lockUntil: 0 };
  }

  _setAdminLoginLockState(st) {
    try {
      sessionStorage.setItem(ADMIN_LOCK_KEY, JSON.stringify(st));
    } catch {}
  }

  async signInAdminAccount(rawUsername, rawPassword) {
    const lock = this._getAdminLoginLockState();
    const now = Date.now();
    if (lock.lockUntil && now < lock.lockUntil) {
      const sec = Math.ceil((lock.lockUntil - now) / 1000);
      return { ok: false, message: `嘗試錯誤次數過多，請等待 ${sec} 秒後再試` };
    }

    const uname = String(rawUsername || '').trim().toLowerCase();
    const pass = String(rawPassword || '');
    if (!uname || !pass) {
      return { ok: false, message: '請輸入管理員帳號與密碼' };
    }

    // 先同步雲端最新帳號名單，確保剛由最高管理員新增的新帳號立即可在任何手機登入！
    await this.refreshAdminAccounts();

    // 若使用者輸入的是 Email 且專案已設 Firebase Web API Key，亦向下相容 Firebase Auth 登入
    if (uname.includes('@') && this.getFirebaseWebApiKey() && !this.adminAccounts[uname]) {
      const fbRes = await this.signInAdminWithFirebase(uname, pass);
      if (fbRes.ok) {
        this._setAdminLoginLockState({ fails: 0, lockUntil: 0 });
        return { ok: true, account: this.getCurrentAdminAccount() };
      }
      return fbRes;
    }

    const acct = this.adminAccounts[uname];
    if (!acct || !acct.salt || !acct.passwordHash) {
      const nextFails = (lock.fails || 0) + 1;
      this._setAdminLoginLockState({ fails: nextFails, lockUntil: nextFails >= 5 ? now + 60000 : 0 });
      return { ok: false, message: '帳號或密碼不正確，請確認後再試一次' };
    }

    const computed = await sha256Hex(`${acct.salt}:${pass}`);
    if (computed !== acct.passwordHash) {
      const nextFails = (lock.fails || 0) + 1;
      this._setAdminLoginLockState({ fails: nextFails, lockUntil: nextFails >= 5 ? now + 60000 : 0 });
      return { ok: false, message: nextFails >= 5 ? '密碼連續錯誤 5 次，請等待 60 秒後再試' : '帳號或密碼不正確，請確認後再試一次' };
    }

    this._setAdminLoginLockState({ fails: 0, lockUntil: 0 });
    this._saveAdminSession({
      username: acct.username,
      displayName: acct.displayName || acct.username,
      role: acct.role === 'super' ? 'super' : 'staff',
      isDefaultPass: Boolean(acct.isDefaultPass),
      authType: 'account',
      signedInAt: now
    });
    return { ok: true, account: this.getCurrentAdminAccount() };
  }

  async createAdminAccount({ username, displayName = '', password, role = 'staff' }) {
    if (!this.isSuperAdmin()) {
      return { ok: false, message: '僅最高權限管理員可新增其他管理員帳號' };
    }
    const uname = String(username || '').trim().toLowerCase();
    if (!/^[a-z0-9_.-]{3,24}$/.test(uname)) {
      return { ok: false, message: '帳號請使用 3～24 碼英文字母、數字或底線（如 staff01）' };
    }
    if (this.adminAccounts[uname]) {
      return { ok: false, message: `帳號「${uname}」已存在，請改用其他帳號名稱` };
    }
    const pass = String(password || '');
    if (pass.length < 6) {
      return { ok: false, message: '密碼長度至少需要 6 個字元' };
    }
    const cleanRole = role === 'super' ? 'super' : 'staff';
    const cleanDisplay = String(displayName || '').trim().slice(0, 20) || (cleanRole === 'super' ? '最高管理員' : '廟務管理員');
    const salt = this._generateAdminSalt();
    const passwordHash = await sha256Hex(`${salt}:${pass}`);
    const cur = this.getCurrentAdminAccount();

    this.adminAccounts = {
      ...this.adminAccounts,
      [uname]: {
        username: uname,
        displayName: cleanDisplay,
        role: cleanRole,
        salt,
        passwordHash,
        isDefaultPass: false,
        createdAt: getTodayStr(),
        createdBy: cur?.username || 'admin'
      }
    };
    const synced = await this._persistAdminAccountsCloud();
    return {
      ok: true,
      synced,
      username: uname,
      displayName: cleanDisplay,
      role: cleanRole
    };
  }

  async changeOwnAdminPassword(currentPassword, newPassword) {
    const cur = this.getCurrentAdminAccount();
    if (!cur || !cur.username || !this.adminAccounts[cur.username]) {
      return { ok: false, message: '找不到目前登入的管理員帳號' };
    }
    const acct = this.adminAccounts[cur.username];
    const checkHash = await sha256Hex(`${acct.salt}:${String(currentPassword || '')}`);
    if (checkHash !== acct.passwordHash) {
      return { ok: false, message: '目前密碼輸入不正確' };
    }
    const nextPass = String(newPassword || '');
    if (nextPass.length < 6) {
      return { ok: false, message: '新密碼長度至少需要 6 個字元' };
    }
    const nextSalt = this._generateAdminSalt();
    const nextHash = await sha256Hex(`${nextSalt}:${nextPass}`);
    this.adminAccounts = {
      ...this.adminAccounts,
      [cur.username]: {
        ...acct,
        salt: nextSalt,
        passwordHash: nextHash,
        isDefaultPass: false,
        updatedAt: getTodayStr()
      }
    };
    this._saveAdminSession({ ...this.adminAuth, isDefaultPass: false });
    const synced = await this._persistAdminAccountsCloud();
    return { ok: true, synced };
  }

  async resetOtherAdminPassword(targetUsername, newPassword) {
    if (!this.isSuperAdmin()) {
      return { ok: false, message: '僅最高權限管理員可重設他人密碼' };
    }
    const uname = String(targetUsername || '').trim().toLowerCase();
    const acct = this.adminAccounts[uname];
    if (!acct) {
      return { ok: false, message: '找不到該管理員帳號' };
    }
    const nextPass = String(newPassword || '');
    if (nextPass.length < 6) {
      return { ok: false, message: '新密碼長度至少需要 6 個字元' };
    }
    const nextSalt = this._generateAdminSalt();
    const nextHash = await sha256Hex(`${nextSalt}:${nextPass}`);
    this.adminAccounts = {
      ...this.adminAccounts,
      [uname]: {
        ...acct,
        salt: nextSalt,
        passwordHash: nextHash,
        isDefaultPass: false,
        updatedAt: getTodayStr()
      }
    };
    const synced = await this._persistAdminAccountsCloud();
    return { ok: true, synced };
  }

  async deleteAdminAccount(targetUsername) {
    if (!this.isSuperAdmin()) {
      return { ok: false, message: '僅最高權限管理員可移除管理員帳號' };
    }
    const uname = String(targetUsername || '').trim().toLowerCase();
    const cur = this.getCurrentAdminAccount();
    if (cur && cur.username === uname) {
      return { ok: false, message: '不能移除目前正在登入中的自己帳號' };
    }
    const acct = this.adminAccounts[uname];
    if (!acct) {
      return { ok: false, message: '找不到該管理員帳號' };
    }
    if (acct.role === 'super') {
      const superCount = Object.values(this.adminAccounts).filter((a) => a.role === 'super').length;
      if (superCount <= 1) {
        return { ok: false, message: '系統至少必須保留 1 位最高權限管理員' };
      }
    }
    const nextMap = { ...this.adminAccounts };
    delete nextMap[uname];
    this.adminAccounts = nextMap;
    const synced = await this._persistAdminAccountsCloud();
    return { ok: true, synced };
  }

  enterLocalPreviewAdmin() {
    if (!this.isLocalDevHost() || this.getFirebaseWebApiKey()) {
      return { ok: false, message: '請使用管理員帳號密碼登入' };
    }
    this._saveAdminSession({
      localPreview: true,
      username: 'admin',
      displayName: '最高權限管理員（本機預覽）',
      role: 'super',
      signedInAt: Date.now()
    });
    return { ok: true };
  }

  signOutAdmin() {
    this._saveAdminSession(null);
  }

  async signInAdminWithFirebase(email, password, optionalApiKey = '') {
    const cleanEmail = String(email || '').trim();
    const cleanPass = String(password || '');
    if (!cleanEmail || !cleanPass) {
      return { ok: false, message: '請輸入完整的管理員 Email 與密碼' };
    }
    const apiKey = String(optionalApiKey || '').trim() || this.getFirebaseWebApiKey();
    if (!apiKey) {
      return {
        ok: false,
        message: '尚未設定 Firebase Web API Key（請參考 FIREBASE_SECURITY_SETUP.md 填入 src/config/firebaseConfig.js 或下方欄位）'
      };
    }
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password: cleanPass,
            returnSecureToken: true
          })
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.idToken) {
        const code = String(data?.error?.message || '');
        let friendly = '驗證失敗，請確認管理員 Email 與密碼是否正確';
        if (code.includes('API_KEY_INVALID') || code.includes('INVALID_API_KEY')) {
          friendly = 'Firebase Web API Key 格式不正確，請確認 Firebase 專案設定中的「網路 API 金鑰」';
        } else if (code.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
          friendly = '嘗試次數過多，帳號已暫時保護鎖定，請稍後再試';
        } else if (code.includes('USER_DISABLED')) {
          friendly = '此管理員帳號已被停用，請洽最高管理員';
        } else if (code.includes('OPERATION_NOT_ALLOWED')) {
          friendly = 'Firebase 尚未啟用「電子郵件／密碼」登入方式，請至 Firebase Console → Authentication 開啟';
        }
        return { ok: false, message: friendly };
      }

      if (optionalApiKey && String(optionalApiKey).trim()) {
        this.setFirebaseWebApiKey(optionalApiKey);
      }
      const expiresSec = Math.max(300, Number(data.expiresIn) || 3600);
      this._saveAdminSession({
        idToken: data.idToken,
        refreshToken: data.refreshToken || '',
        email: data.email || cleanEmail,
        localId: data.localId || '',
        expiresAt: Date.now() + (expiresSec - 120) * 1000
      });
      return { ok: true, email: data.email || cleanEmail };
    } catch (err) {
      return { ok: false, message: `無法連線至 Firebase 認證伺服器：${err?.message || '請檢查網路連線'}` };
    }
  }

  async _getValidAdminToken() {
    if (!this.adminAuth || !this.adminAuth.idToken) return null;
    if (Date.now() < Number(this.adminAuth.expiresAt || 0)) {
      return this.adminAuth.idToken;
    }
    const apiKey = this.getFirebaseWebApiKey();
    if (!apiKey || !this.adminAuth.refreshToken) {
      return this.adminAuth.idToken;
    }
    try {
      const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(this.adminAuth.refreshToken)}`
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.id_token) {
        const expiresSec = Math.max(300, Number(data.expires_in) || 3600);
        this._saveAdminSession({
          ...this.adminAuth,
          idToken: data.id_token,
          refreshToken: data.refresh_token || this.adminAuth.refreshToken,
          expiresAt: Date.now() + (expiresSec - 120) * 1000
        });
        return data.id_token;
      }
    } catch {}
    return this.adminAuth.idToken;
  }

  async _buildCloudEndpoint(path, attachAdminAuth = false, baseUrl = null) {
    const root = baseUrl || this.cloudDbUrl;
    const base = `${root}/${path}.json`;
    if (!attachAdminAuth) return base;
    const token = await this._getValidAdminToken();
    return token ? `${base}?auth=${encodeURIComponent(token)}` : base;
  }

  async testCloudDbConnection(rawUrl) {
    const url = normalizeDbUrl(rawUrl);
    if (!url) {
      return { ok: false, message: '網址格式不正確，請輸入 https://xxx.firebasedatabase.app 或 https://xxx.firebaseio.com' };
    }
    try {
      const pingPayload = { at: Date.now(), client: this.clientId };
      const endpoint = await this._buildCloudEndpoint('_ping', true, url);
      const putRes = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pingPayload)
      });
      if (!putRes.ok) {
        const hint = (putRes.status === 401 || putRes.status === 403)
          ? 'Firebase 拒絕未驗證寫入（HTTP ' + putRes.status + '）：若已套用資安規則 database.rules.json，請先以 Firebase 管理員帳號密碼登入後臺！'
          : `Firebase 拒絕寫入（HTTP ${putRes.status}），請檢查 Firebase Realtime Database 規則設定！`;
        return { ok: false, message: hint };
      }
      this.setCloudDbUrl(url);
      // 立即將目前公佈欄／太歲牆／供桌同步至雲端（若雲端尚未初始化）
      await this._pushCloudSharedAllIfEmpty();
      this.cloudConnected = true;
      return { ok: true, message: '雲端多人資料庫連線成功！所有玩家與管理者資料將跨裝置即時同步！' };
    } catch (err) {
      return { ok: false, message: `連線失敗：${err?.message || '請檢查網路與資料庫網址'}` };
    }
  }

  _normalizeArrayFromCloud(raw) {
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (raw && typeof raw === 'object') return Object.values(raw).filter(Boolean);
    return null;
  }

  async _getCloud(path) {
    if (!this.cloudDbUrl) return { ok: false, data: null };
    try {
      const res = await fetch(`${this.cloudDbUrl}/${path}.json`, { cache: 'no-store' });
      if (!res.ok) return { ok: false, data: null };
      const data = await res.json();
      this.cloudConnected = true;
      return { ok: true, data };
    } catch {
      return { ok: false, data: null };
    }
  }

  async _pushCloudSharedAllIfEmpty() {
    if (!this.cloudDbUrl) return;
    try {
      const r = await fetch(`${this.cloudDbUrl}/shared.json`, { cache: 'no-store' });
      const existing = r.ok ? await r.json() : null;
      if (!existing || !existing.bulletin) {
        await this._putCloud('shared/bulletin', this.state.bulletin);
      }
      if (!existing || !this._normalizeArrayFromCloud(existing.taisui)) {
        await this._putCloud('shared/taisui', this.state.taisui);
      }
      if (!existing || !this._normalizeArrayFromCloud(existing.offerings)) {
        await this._putCloud('shared/offerings', this.state.offerings);
      }
    } catch {}
  }

  async _putCloud(path, data) {
    if (!this.cloudDbUrl) return false;
    try {
      const endpoint = await this._buildCloudEndpoint(path, true);
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        this.cloudConnected = true;
        this.cloudLastError = '';
        return true;
      }
      this.cloudLastError = `HTTP ${res.status}`;
    } catch (e) {
      this.cloudLastError = e?.message || 'network';
    }
    return false;
  }

  async _deleteCloud(path) {
    if (!this.cloudDbUrl) return false;
    try {
      const endpoint = await this._buildCloudEndpoint(path, true);
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (res.ok) {
        this.cloudConnected = true;
        this.cloudLastError = '';
        return true;
      }
      this.cloudLastError = `HTTP ${res.status}`;
    } catch (e) {
      this.cloudLastError = e?.message || 'network';
    }
    return false;
  }

  _mergeTaiSuiSources(officialRaw, onlineRaw) {
    const official = this._normalizeArrayFromCloud(officialRaw) || [];
    const online = (this._normalizeArrayFromCloud(onlineRaw) || []).sort((a, b) => {
      const ta = Number(String(a?.id || '').split('-')[1]) || 0;
      const tb = Number(String(b?.id || '').split('-')[1]) || 0;
      return tb - ta;
    });
    const out = [];
    const seen = new Set();
    for (const item of [...online, ...official]) {
      if (!item || !item.id || seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
    return out;
  }

  refreshCloudShared(forceEmit = false) {
    if (this.cloudDbUrl) return this._pullCloudShared(forceEmit);
    if (this.serverMpAvailable) return this._pullServerShared(forceEmit);
    return Promise.resolve();
  }

  async _pullCloudShared(forceEmit = false) {
    if (!this.cloudDbUrl) return;
    if (this._cloudSharedPulling && !forceEmit) return;
    this._cloudSharedPulling = true;
    try {
      const res = await fetch(`${this.cloudDbUrl}/shared.json`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      this.cloudConnected = true;
      if (!data) return;

      if (data.bulletin && typeof data.bulletin === 'object') {
        const nextJson = JSON.stringify(data.bulletin);
        if (forceEmit || nextJson !== JSON.stringify(this.state.bulletin)) {
          this.state.bulletin = data.bulletin;
          this._save(STORAGE_KEYS.bulletin, this.state.bulletin);
          this._emit('bulletin');
        }
      }

      const hasTaiSuiOfficial = Boolean(this._normalizeArrayFromCloud(data.taisui));
      const hasTaiSuiOnline = Boolean(this._normalizeArrayFromCloud(data.taisuiOnline));
      if (hasTaiSuiOfficial || hasTaiSuiOnline || data.taisuiEmpty === true) {
        const nextList = this._mergeTaiSuiSources(data.taisui, data.taisuiOnline);
        const nextJson = JSON.stringify(nextList);
        if (forceEmit || nextJson !== JSON.stringify(this.state.taisui)) {
          this.state.taisui = nextList;
          this._save(STORAGE_KEYS.taisui, this.state.taisui);
          this._emit('taisui');
        }
      }

      const cloudOfferings = this._normalizeArrayFromCloud(data.offerings);
      if (cloudOfferings || data.offeringsEmpty === true) {
        const now = Date.now();
        const ttl = TEMPLE_CONFIG.offerings.ttlMs;
        const valid = (cloudOfferings || []).filter(item => item && now - item.createdAt < ttl);
        if (forceEmit || JSON.stringify(valid) !== JSON.stringify(this.state.offerings)) {
          this.state.offerings = valid;
          this._save(STORAGE_KEYS.offerings, this.state.offerings);
          this._emit('offerings');
        }
      }

      const cloudTigerEggs = this._normalizeArrayFromCloud(data.tigerEggs);
      if (cloudTigerEggs || data.tigerEggsEmpty === true) {
        const now = Date.now();
        const ttl = TEMPLE_CONFIG.offerings.ttlMs; // 10 分鐘自動消失
        const validEggs = (cloudTigerEggs || []).filter(item => item && now - item.createdAt < ttl).slice(-3);
        if (forceEmit || JSON.stringify(validEggs) !== JSON.stringify(this.state.tigerEggs)) {
          this.state.tigerEggs = validEggs;
          this._save(STORAGE_KEYS.tigerEggs, this.state.tigerEggs);
          this._emit('tigerEggs');
        }
      }

      // ★ V34 主神桌清茶三杯雲端同步（同樣 10 分鐘自動消失！）
      if (data.teaOffer !== undefined) {
        const now = Date.now();
        const ttl = TEMPLE_CONFIG.offerings.ttlMs;
        const rec = data.teaOffer && typeof data.teaOffer === 'object' && (now - Number(data.teaOffer.pouredAt || 0) < ttl)
          ? data.teaOffer
          : null;
        if (forceEmit || JSON.stringify(rec) !== JSON.stringify(this.state.teaOffer)) {
          this.state.teaOffer = rec;
          this._save(STORAGE_KEYS.teaOffer, rec);
          this._emit('teaOffer');
        }
      }
    } catch {
    } finally {
      this._cloudSharedPulling = false;
    }
  }

  async _pullCloudPresenceAndChat({ forceChat = false } = {}) {
    if (!this.cloudDbUrl || this._cloudMpPulling || this.isPageHidden) return;
    this._cloudMpPulling = true;
    this._mpPullCounter = (this._mpPullCounter || 0) + 1;
    // ★ V51 省流量：聊天室 chat.json 每 2 輪拉取一次（發言或切回分頁時立即強制拉取），直接減半聊天輪詢流量！
    const shouldFetchChat = forceChat || (this._mpPullCounter % 2 === 1);
    try {
      const [pRes, cRes, iRes] = await Promise.all([
        fetch(`${this.cloudDbUrl}/presence.json`, { cache: 'no-store' }),
        shouldFetchChat ? fetch(`${this.cloudDbUrl}/chat.json`, { cache: 'no-store' }) : Promise.resolve(null),
        fetch(`${this.cloudDbUrl}/interactions/${encodeURIComponent(this.playerUid)}.json`, { cache: 'no-store' })
      ]);
      // ★ 處理真人互動／回禮／贈禮收件匣
      if (iRes && iRes.ok) {
        const iMap = await iRes.json();
        if (iMap && typeof iMap === 'object') {
          const now = Date.now();
          Object.entries(iMap).forEach(([evKey, ev]) => {
            if (!ev || typeof ev !== 'object') return;
            const evObj = { ...ev, id: ev.id || evKey };
            // 超過 3 分鐘的過期互動直接清除
            if (now - (evObj.createdAt || 0) > 180000) {
              fetch(`${this.cloudDbUrl}/interactions/${encodeURIComponent(this.playerUid)}/${encodeURIComponent(evKey)}.json`, {
                method: 'DELETE'
              }).catch(() => {});
              return;
            }
            this._handleIncomingInteraction(evObj, evKey);
          });
        }
      }
      // ★ 先合併正式聊天頻道（chat.json），再更新角色位置與頭頂氣泡（presence.json）
      if (cRes && cRes.ok) {
        const cMap = await cRes.json();
        if (cMap && typeof cMap === 'object') {
          const list = Array.isArray(cMap) ? cMap.filter(Boolean) : Object.values(cMap).filter(Boolean);
          this._mergeIncomingChats(list);
        }
      }
      if (pRes && pRes.ok) {
        const pMap = await pRes.json();
        this.cloudConnected = true;
        const now = Date.now();
        const activeRemoteIds = new Set();
        if (pMap && typeof pMap === 'object') {
          Object.values(pMap).forEach((p) => {
            if (!p || !p.id || p.id === this.clientId) return;
            if (now - (p.updatedAt || 0) > 18000) return;
            activeRemoteIds.add(p.id);
            this._ingestRemotePeer(p);
          });
        }
        for (const id of Array.from(this.remotePeers.keys())) {
          if (!activeRemoteIds.has(id)) this.remotePeers.delete(id);
        }
        this._emit('presence');
      }
    } catch {
    } finally {
      this._cloudMpPulling = false;
    }
  }

  async _pullServerShared(forceEmit = false) {
    if (!this.serverMpAvailable) return;
    if (this._serverSharedPulling && !forceEmit) return;
    this._serverSharedPulling = true;
    try {
      const res = await fetch('/api/mp/shared', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.bulletin && (forceEmit || JSON.stringify(data.bulletin) !== JSON.stringify(this.state.bulletin))) {
        this.state.bulletin = data.bulletin;
        this._save(STORAGE_KEYS.bulletin, this.state.bulletin);
        this._emit('bulletin');
      }
      if (Array.isArray(data?.taisui) && (forceEmit || JSON.stringify(data.taisui) !== JSON.stringify(this.state.taisui))) {
        this.state.taisui = data.taisui;
        this._save(STORAGE_KEYS.taisui, this.state.taisui);
        this._emit('taisui');
      }
      if (Array.isArray(data?.offerings) && (forceEmit || JSON.stringify(data.offerings) !== JSON.stringify(this.state.offerings))) {
        this.state.offerings = data.offerings;
        this._save(STORAGE_KEYS.offerings, this.state.offerings);
        this._emit('offerings');
      }
    } catch {
    } finally {
      this._serverSharedPulling = false;
    }
  }

  _pushSharedToBackend(field, payload) {
    if (this.cloudDbUrl) {
      this._putCloud(`shared/${field}`, payload);
    } else if (this.serverMpAvailable) {
      fetch('/api/mp/shared', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, payload })
      }).catch(() => {});
    }
  }

  // ---- 廟埕清淨守護：不雅言詞累犯冷卻 ----
  getChatMuteRemainingMs() {
    const left = this.chatMuteUntil - Date.now();
    return left > 0 ? left : 0;
  }

  recordProfanityViolation() {
    this.profanityStrikes += 1;
    // ★ V1.3 說髒話扣功德（-3 功德），維護廟埕清淨！
    this.addMerit(-3);
    try { sessionStorage.setItem('deci_profanity_strikes', String(this.profanityStrikes)); } catch {}
    let mutedSeconds = 0;
    if (this.profanityStrikes >= 3) {
      mutedSeconds = 60;
      this.chatMuteUntil = Date.now() + mutedSeconds * 1000;
      try { sessionStorage.setItem('deci_chat_mute_until', String(this.chatMuteUntil)); } catch {}
    }
    return { strikes: this.profanityStrikes, mutedSeconds, penalty: 3 };
  }

  _ingestRemotePeer(peer) {
    if (!peer || !peer.id || peer.id === this.clientId) return;
    const safeBubble = peer.bubble ? sanitizeChatText(peer.bubble).clean : '';
    const enriched = { ...peer, bubble: safeBubble, updatedAt: Date.now() };
    this.remotePeers.set(peer.id, enriched);
    // ★ 修正重複訊息 Bug：多人聊天文字已由正式 chat.json / BroadcastChannel 通道同步，
    //   此處不再重複把 presence 頭頂氣泡另建 peer-* 假訊息塞進聊天紀錄，徹底消除送一次變兩次的重複問題！
  }

  _load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('讀取本機資料失敗，使用預設值', e);
    }
    return structuredClone(fallback);
  }

  _loadPlayer() {
    const defaults = {
      name: '',
      presetId: 'youngMale',
      merit: 30,
      inventory: {
        pineapple: 1,
        apple: 1
      },
      eggs: 0,
      talismans: {
        guanyin_safe: 0,
        daitian_smooth: 0
      },
      talismanCollection: [],
      dailyQuests: {
        date: '',
        states: {}
      },
      tigerWorshipDaily: {
        date: '',
        count: 0
      },
      pairQuota: {},
      lastTeaPourAt: 0,
      worshipSteps: [],
      worshipRounds: 0,
      hasIncense: false,
      hasJossPaper: false,
      chantTotalTaps: 0,
      lastCheckinDate: '',
      quizDailyDate: '',
      quizDailyScore: 0,
      seenStoryIntro: false,
      lastSavedAt: 0
    };
    const saved = this._load(STORAGE_KEYS.player, null);
    if (!saved) return defaults;
    if (saved.name) this.hasExistingRecord = true;
    return {
      ...defaults,
      ...saved,
      inventory: { ...defaults.inventory, ...(saved.inventory || {}) },
      eggs: Math.max(0, Number(saved.eggs) || 0),
      talismans: { ...defaults.talismans, ...(saved.talismans || {}) },
      talismanCollection: Array.isArray(saved.talismanCollection) ? saved.talismanCollection : [],
      dailyQuests: saved.dailyQuests && typeof saved.dailyQuests === 'object' ? saved.dailyQuests : defaults.dailyQuests,
      pairQuota: saved.pairQuota && typeof saved.pairQuota === 'object' ? saved.pairQuota : {},
      worshipSteps: Array.isArray(saved.worshipSteps) ? saved.worshipSteps : []
    };
  }

  _save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('儲存本機資料失敗', e);
    }
  }

  _loadTigerEggs() {
    const saved = this._load(STORAGE_KEYS.tigerEggs, null);
    const now = Date.now();
    const ttl = TEMPLE_CONFIG.offerings.ttlMs;
    if (Array.isArray(saved)) {
      return saved.filter(item => item && now - item.createdAt < ttl).slice(-3);
    }
    return [];
  }

  getTigerEggs() {
    this.pruneExpiredTigerEggs();
    return this.state.tigerEggs || [];
  }

  addTigerEggOffering(donorName = '虔誠香客') {
    this.pruneExpiredTigerEggs();
    const cur = [...(this.state.tigerEggs || [])];
    if (cur.length >= 3) cur.shift();
    const rec = {
      id: `tegg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      donor: String(donorName || '虔誠香客').trim(),
      createdAt: Date.now()
    };
    this.state.tigerEggs = [...cur, rec];
    this._save(STORAGE_KEYS.tigerEggs, this.state.tigerEggs);
    this._broadcast('tigerEggs', this.state.tigerEggs);
    if (this.cloudDbUrl) {
      this._putCloud('shared/tigerEggs', this.state.tigerEggs);
      this._putCloud('shared/tigerEggsEmpty', false);
    }
    this._emit('tigerEggs');
    return this.state.tigerEggs;
  }

  pruneExpiredTigerEggs() {
    const now = Date.now();
    const ttl = TEMPLE_CONFIG.offerings.ttlMs; // 10 分鐘自動消失
    const list = this.state.tigerEggs || [];
    const next = list.filter(item => item && now - item.createdAt < ttl).slice(-3);
    if (next.length !== list.length) {
      this.state.tigerEggs = next;
      this._save(STORAGE_KEYS.tigerEggs, next);
      this._broadcast('tigerEggs', next);
      this._emit('tigerEggs');
    }
  }

  // ---- V34 主神桌奉茶三杯（與虎爺雞蛋、供品相同，滿 10 分鐘自動消失！） ----
  _loadTeaOffer() {
    const saved = this._load(STORAGE_KEYS.teaOffer, null);
    const now = Date.now();
    const ttl = TEMPLE_CONFIG.offerings.ttlMs; // 10 分鐘
    if (saved && typeof saved === 'object' && now - Number(saved.pouredAt || 0) < ttl) {
      return saved;
    }
    return null;
  }

  getTeaOffer() {
    this.pruneExpiredTeaOffer();
    return this.state.teaOffer || null;
  }

  recordTeaOffer(donorName = '虔誠香客') {
    const rec = {
      id: `tea-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      donor: String(donorName || '虔誠香客').trim(),
      pouredAt: Date.now()
    };
    this.state.teaOffer = rec;
    this._save(STORAGE_KEYS.teaOffer, rec);
    this._broadcast('teaOffer', rec);
    if (this.cloudDbUrl) {
      this._putCloud('shared/teaOffer', rec);
    }
    this._emit('teaOffer');
    return rec;
  }

  pruneExpiredTeaOffer() {
    const cur = this.state.teaOffer;
    if (!cur) return;
    const ttl = TEMPLE_CONFIG.offerings.ttlMs; // 10 分鐘自動消失
    if (Date.now() - Number(cur.pouredAt || 0) >= ttl) {
      this.state.teaOffer = null;
      this._save(STORAGE_KEYS.teaOffer, null);
      this._broadcast('teaOffer', null);
      this._emit('teaOffer');
    }
  }

  _loadOfferings() {
    const saved = this._load(STORAGE_KEYS.offerings, null);
    const now = Date.now();
    const ttl = TEMPLE_CONFIG.offerings.ttlMs;
    if (Array.isArray(saved)) {
      const valid = saved.filter(item => now - item.createdAt < ttl);
      if (valid.length > 0) return valid;
    }
    return [
      {
        id: 'off-demo-1',
        catalogId: 'flower',
        name: '清香鮮花',
        emoji: '💐',
        donor: '淑芬阿姨',
        blessing: '闔家平安順遂',
        createdAt: now - 85 * 1000
      },
      {
        id: 'off-demo-2',
        catalogId: 'pineapple',
        name: '旺來鳳梨',
        emoji: '🍍',
        donor: '文創旅人阿明',
        blessing: '好運旺旺來',
        createdAt: now - 35 * 1000
      }
    ];
  }

  subscribe(topic, fn) {
    if (!this.listeners[topic]) return () => {};
    this.listeners[topic].add(fn);
    return () => this.listeners[topic].delete(fn);
  }

  _emit(topic) {
    const data = topic === 'presence' ? Array.from(this.remotePeers.values()) : this.state[topic];
    this.listeners[topic]?.forEach(fn => {
      try { fn(data); } catch (err) { console.error(`Listener error on ${topic}:`, err); }
    });
  }

  _broadcast(topic, payload) {
    if (this.channel) {
      try {
        this.channel.postMessage({ topic, payload, senderId: this.clientId });
      } catch {}
    }
  }

  /**
   * 多人即時位置與氣泡同步（同時驅動 BroadcastChannel、雲端 Firebase 與本機伺服器 API！）
   */
  broadcastPresence(poseData) {
    if (poseData.bubble) {
      this.lastBubbleText = poseData.bubble;
      this.lastBubbleAt = Date.now();
    }
    const now = Date.now();
    const packet = {
      id: this.clientId,
      uid: this.playerUid,
      name: this.state.player.name || '虔誠香客',
      presetId: this.state.player.presetId || 'youngMale',
      x: Number.isFinite(Number(poseData.x)) ? Number(poseData.x) : 0,
      y: Number.isFinite(Number(poseData.y)) ? Number(poseData.y) : 0.03,
      z: Number.isFinite(Number(poseData.z)) ? Number(poseData.z) : 19.5,
      rotY: Number.isFinite(Number(poseData.rotY)) ? Number(poseData.rotY) : 0,
      state: poseData.state || 'idle',
      holdingIncense: Boolean(poseData.holdingIncense),
      holdingTeapot: Boolean(poseData.holdingTeapot),
      bubble: now - this.lastBubbleAt < 4500 ? this.lastBubbleText : '',
      bubbleAt: Number(this.lastBubbleAt) || 0,
      updatedAt: now
    };

    // 1. 同瀏覽器 0 延遲同步
    this._broadcast('presence', packet);

    // 2. ★ V52 Firebase SDK WebSocket 即時推播（完全取代 presence / chat / interactions REST 輪詢！）
    //    - 啟用 SDK 時：靜止不動僅每 12 秒心跳，走動／說話時每 350ms 透過 WebSocket 增量推送自身狀態，0 輪詢下載！
    //    - 若 SDK 尚未載入或受限：自動無縫退回 V51 智慧省流量 REST 輪詢
    if (this.cloudDbUrl) {
      if (this.isPageHidden) return;
      const sig = `${packet.x}|${packet.y}|${packet.z}|${packet.rotY}|${packet.state}|${packet.holdingIncense ? 1 : 0}|${packet.holdingTeapot ? 1 : 0}|${packet.bubble}|${packet.name}|${packet.presetId}`;
      const poseChanged = sig !== this._lastPresenceSignature;
      const hasNewBubble = Boolean(poseData.bubble);

      if (this.sdkStreamActive && this.fbDb && this.fbSdk) {
        const minWriteGap = poseChanged ? 380 : 12000;
        if (hasNewBubble || (now - (this._lastPresencePutAt || 0) >= minWriteGap)) {
          this._lastPresenceSignature = sig;
          this._lastPresencePutAt = now;
          this.fbSdk.set(this.fbSdk.ref(this.fbDb, `presence/${this.clientId}`), packet).catch(() => {
            this._putCloud(`presence/${this.clientId}`, packet);
          });
        }
        return;
      }

      const syncIntervalMs = this.remotePeers.size > 0 ? 2000 : 4000;
      if (!this._lastCloudSync || now - this._lastCloudSync >= syncIntervalMs || hasNewBubble) {
        this._lastCloudSync = now;
        if (poseChanged || hasNewBubble || (now - (this._lastPresencePutAt || 0) >= 6000)) {
          this._lastPresenceSignature = sig;
          this._lastPresencePutAt = now;
          this._putCloud(`presence/${this.clientId}`, packet);
        }
        this._pullCloudPresenceAndChat({ forceChat: hasNewBubble });
      }
      return;
    }

    // 3. 本機／區網多裝置伺服器即時同步（每 450ms 送一次）
    if (this.serverMpAvailable && !this._syncPending) {
      if (!this._lastServerSync || now - this._lastServerSync >= 450) {
        this._lastServerSync = now;
        this._syncPending = true;
        fetch('/api/mp/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(packet)
        })
          .then(r => (r.ok ? r.json() : Promise.reject()))
          .then(res => {
            if (Array.isArray(res.peers)) {
              res.peers.forEach(p => this._ingestRemotePeer(p));
              this._emit('presence');
            }
            if (Array.isArray(res.chats) && res.chats.length > 0) {
              this._mergeIncomingChats(res.chats);
            }
          })
          .catch(() => {
            this.serverMpAvailable = false;
          })
          .finally(() => {
            this._syncPending = false;
          });
      }
    }
  }

  _dedupeChatList(list) {
    if (!Array.isArray(list)) return [];
    const sorted = [...list]
      .filter((m) => m && m.id && m.text && !String(m.id).startsWith('peer-'))
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    const out = [];
    const seenIds = new Set();
    for (const m of sorted) {
      if (seenIds.has(m.id)) continue;
      const isNearDup = out.some(
        (ex) =>
          ex.text === m.text &&
          (ex.senderId && m.senderId ? ex.senderId === m.senderId : ex.sender === m.sender) &&
          Math.abs((ex.timestamp || 0) - (m.timestamp || 0)) < 8000
      );
      if (isNearDup) continue;
      seenIds.add(m.id);
      out.push(m);
    }
    return out.slice(-80);
  }

  _mergeIncomingChats(incoming) {
    const existingIds = new Set(this.state.chat.map(c => c.id));
    let added = false;
    for (const rawMsg of incoming) {
      if (!rawMsg || !rawMsg.id || existingIds.has(rawMsg.id)) continue;
      if (String(rawMsg.id).startsWith('peer-')) continue;
      // 外部傳入訊息再做一層清淨防護
      const { clean } = sanitizeChatText(rawMsg.text || '');
      if (!clean) continue;
      const ts = Number(rawMsg.timestamp) || Date.now();
      // ★ 雙重防重機制：同一發言者於 8 秒內送出相同文字絕不重複寫入！
      const isNearDup = this.state.chat.some(
        (ex) =>
          ex.text === clean &&
          (ex.senderId && rawMsg.senderId ? ex.senderId === rawMsg.senderId : ex.sender === rawMsg.sender) &&
          Math.abs((ex.timestamp || 0) - ts) < 8000
      );
      if (isNearDup) {
        existingIds.add(rawMsg.id);
        continue;
      }
      const role = rawMsg.senderId === this.clientId ? 'player' : (rawMsg.role === 'player' ? 'peer' : (rawMsg.role || 'peer'));
      this.state.chat.push({
        ...rawMsg,
        role,
        text: clean,
        timestamp: ts
      });
      existingIds.add(rawMsg.id);
      added = true;
    }
    if (added) {
      this.state.chat = this.state.chat.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)).slice(-80);
      this._save(STORAGE_KEYS.chat, this.state.chat);
      this._emit('chat');
    }
  }

  _pruneOfflinePeers() {
    const now = Date.now();
    const timeout = this.cloudDbUrl ? (this.sdkStreamActive ? 25000 : 18000) : 8500;
    let changed = false;
    for (const [id, peer] of this.remotePeers.entries()) {
      if (now - peer.updatedAt > timeout) {
        this.remotePeers.delete(id);
        changed = true;
      }
    }
    if (changed) this._emit('presence');
  }

  getRealPlayerCount() {
    return 1 + this.remotePeers.size;
  }

  getOnlineCount() {
    return 1 + this.remotePeers.size + Object.keys(TEMPLE_CONFIG.npcs).length;
  }

  getSyncModeLabel() {
    const real = this.getRealPlayerCount();
    if (this.cloudDbUrl) {
      const transportTag = this.sdkConnected ? '⚡ SDK 即時推播' : '☁️ 雲端連線';
      return `${transportTag}（${real} 位真人・${real > 1 ? '真人互動' : '單人 NPC 陪聊'}）`;
    }
    if (this.serverMpAvailable) {
      return `🟢 多人即時連線（${real} 位真人・${real > 1 ? '真人互動' : '單人 NPC 陪聊'}）`;
    }
    return `💻 本機同步（${real} 位真人・可於廟務後臺設定 Firebase 啟用跨裝置連線）`;
  }

  // ---- 玩家資料自動存檔 ----
  getPlayer() { return this.state.player; }

  updatePlayer(patch) {
    this.state.player = {
      ...this.state.player,
      ...patch,
      lastSavedAt: Date.now()
    };
    this._save(STORAGE_KEYS.player, this.state.player);
    this._emit('player');
  }

  addMerit(amount) {
    const next = Math.max(0, (this.state.player.merit || 0) + amount);
    this.updatePlayer({ merit: next });
    return next;
  }

  recordWorshipStep(stepKey) {
    const cur = new Set(this.state.player.worshipSteps || []);
    if (cur.has(stepKey)) return { added: false, allDone: false };
    cur.add(stepKey);
    const list = Array.from(cur);
    const allDone = list.length >= 5;
    this.updatePlayer({
      worshipSteps: list,
      worshipRounds: allDone ? (this.state.player.worshipRounds || 0) + 1 : (this.state.player.worshipRounds || 0)
    });
    return { added: true, allDone };
  }

  resetWorshipRound() {
    this.updatePlayer({
      worshipSteps: [],
      hasIncense: false,
      hasJossPaper: false
    });
  }

  addChantTap() {
    const next = (this.state.player.chantTotalTaps || 0) + 1;
    const reward = next % 5 === 0 ? 5 : 0;
    this.updatePlayer({
      chantTotalTaps: next,
      merit: (this.state.player.merit || 0) + reward
    });
    return { total: next, reward };
  }

  buyOffering(catalogId) {
    const item = OFFERING_CATALOG.find(o => o.id === catalogId);
    if (!item) return { ok: false, reason: '找不到供品項目' };
    const currentMerit = this.state.player.merit || 0;
    if (currentMerit < item.cost) {
      return { ok: false, reason: `功德值不足（需要 ${item.cost} 功德，可透過參拜、念經或民俗小挑戰獲得！）` };
    }
    const inv = { ...(this.state.player.inventory || {}) };
    inv[catalogId] = (inv[catalogId] || 0) + 1;
    this.updatePlayer({
      merit: currentMerit - item.cost,
      inventory: inv
    });
    return { ok: true, item };
  }

  consumeInventoryOffering(catalogId) {
    const inv = { ...(this.state.player.inventory || {}) };
    if ((inv[catalogId] || 0) <= 0) return false;
    inv[catalogId] = inv[catalogId] - 1;
    this.updatePlayer({ inventory: inv });
    return true;
  }

  getInventoryTotal() {
    const inv = this.state.player.inventory || {};
    const offerSum = Object.values(inv).reduce((s, n) => s + (Number(n) || 0), 0);
    const eggSum = Math.max(0, Number(this.state.player.eggs) || 0);
    const talSum = Object.values(this.state.player.talismans || {}).reduce((s, n) => s + (Number(n) || 0), 0);
    return offerSum + eggSum + talSum;
  }

  // ---- V1.3 拜虎爺每日功德上限（每次 +1 功德，1 日最多 3 次） ----
  getTigerWorshipCountToday() {
    const today = getTodayStr();
    const rec = this.state.player.tigerWorshipDaily;
    if (!rec || rec.date !== today) return 0;
    return Math.max(0, Number(rec.count) || 0);
  }

  claimTigerWorshipMerit() {
    const today = getTodayStr();
    const cur = this.getTigerWorshipCountToday();
    if (cur >= 3) {
      return { granted: false, used: 3, max: 3, reward: 0 };
    }
    const next = cur + 1;
    this.updatePlayer({
      tigerWorshipDaily: { date: today, count: next },
      merit: (Number(this.state.player.merit) || 0) + 1
    });
    return { granted: true, used: next, max: 3, reward: 1 };
  }

  // ---- V1.1 廟後埕土雞蛋與數位平安符（功德箱 100 功德求取） ----
  getEggCount() {
    return Math.max(0, Number(this.state.player.eggs) || 0);
  }

  addEgg(count = 1) {
    const next = this.getEggCount() + Math.max(1, Number(count) || 1);
    this.updatePlayer({ eggs: next });
    return next;
  }

  consumeEgg(count = 1) {
    const cur = this.getEggCount();
    if (cur < count) return false;
    this.updatePlayer({ eggs: cur - count });
    return true;
  }

  getTalismans() {
    return {
      guanyin_safe: 0,
      daitian_smooth: 0,
      ...(this.state.player.talismans || {})
    };
  }

  getTalismanCollection() {
    return Array.isArray(this.state.player.talismanCollection) ? this.state.player.talismanCollection : [];
  }

  exchangeTalisman(talismanId) {
    const def = TALISMAN_CATALOG.find(t => t.id === talismanId);
    if (!def) return { ok: false, reason: '找不到此平安符項目' };
    const currentMerit = Number(this.state.player.merit) || 0;
    if (currentMerit < def.cost) {
      return { ok: false, reason: `功德值不足（需要 ${def.cost} 功德，目前累積 ${currentMerit} 功德）` };
    }
    const talismans = this.getTalismans();
    talismans[talismanId] = (talismans[talismanId] || 0) + 1;
    const col = new Set(this.getTalismanCollection());
    col.add(talismanId);
    this.updatePlayer({
      merit: currentMerit - def.cost,
      talismans,
      talismanCollection: Array.from(col)
    });
    return { ok: true, talisman: def, count: talismans[talismanId] };
  }

  // ---- V1.1 廟埕生活化每日任務系統（每日自動重置） ----
  _ensureTodayQuests() {
    const today = getTodayStr();
    const dq = this.state.player.dailyQuests;
    if (!dq || dq.date !== today) {
      this.state.player.dailyQuests = { date: today, states: {} };
      this._save(STORAGE_KEYS.player, this.state.player);
    }
    return this.state.player.dailyQuests;
  }

  getQuestState(questId) {
    const dq = this._ensureTodayQuests();
    const def = DAILY_QUESTS.find(q => q.id === questId);
    const cur = dq.states?.[questId] || { status: 'none', progress: 0 };
    return {
      ...cur,
      target: def?.targetCount || 1,
      def
    };
  }

  getAllQuestStates() {
    return DAILY_QUESTS.map(def => ({
      ...def,
      ...this.getQuestState(def.id)
    }));
  }

  acceptQuest(questId) {
    const def = DAILY_QUESTS.find(q => q.id === questId);
    if (!def) return null;
    const dq = this._ensureTodayQuests();
    const cur = dq.states[questId];
    if (cur && cur.status !== 'none') return cur;
    const nextStates = { ...dq.states, [questId]: { status: 'active', progress: 0 } };
    this.updatePlayer({ dailyQuests: { date: dq.date, states: nextStates } });
    this._emit('quests');
    return nextStates[questId];
  }

  progressQuest(questId, delta = 1) {
    const def = DAILY_QUESTS.find(q => q.id === questId);
    if (!def) return { updated: false };
    const dq = this._ensureTodayQuests();
    const cur = dq.states[questId];
    if (!cur || cur.status !== 'active') return { updated: false };
    const nextProg = Math.min(def.targetCount, (cur.progress || 0) + delta);
    const justReady = nextProg >= def.targetCount;
    const nextEntry = {
      status: justReady ? 'ready' : 'active',
      progress: nextProg
    };
    const nextStates = { ...dq.states, [questId]: nextEntry };
    this.updatePlayer({ dailyQuests: { date: dq.date, states: nextStates } });
    this._emit('quests');
    return { updated: true, justReady, progress: nextProg, target: def.targetCount, def };
  }

  completeQuest(questId) {
    const def = DAILY_QUESTS.find(q => q.id === questId);
    if (!def) return { ok: false };
    const dq = this._ensureTodayQuests();
    const cur = dq.states[questId];
    if (!cur || cur.status !== 'ready') return { ok: false };
    const nextStates = { ...dq.states, [questId]: { status: 'done', progress: def.targetCount } };
    this.updatePlayer({
      dailyQuests: { date: dq.date, states: nextStates },
      merit: (Number(this.state.player.merit) || 0) + def.reward
    });
    this._emit('quests');
    return { ok: true, reward: def.reward, def };
  }

  // ---- V1.1 Firebase 真人玩家雙向結緣互動（揮手／作揖／握手 ＋ 即時回禮 ＋ 贈禮，同人每日限 3 次功德） ----
  _getPairKey(otherUid) {
    return [String(this.playerUid), String(otherUid)].sort().join('__');
  }

  getPairQuotaToday(otherUid) {
    const today = getTodayStr();
    const key = this._getPairKey(otherUid);
    const dayMap = this.state.player.pairQuota?.[today] || {};
    return Math.max(0, Number(dayMap[key]) || 0);
  }

  _incrementLocalPairQuota(otherUid, forcedVal = null) {
    const today = getTodayStr();
    const key = this._getPairKey(otherUid);
    const prev = this.getPairQuotaToday(otherUid);
    const nextVal = forcedVal !== null ? Math.max(prev, forcedVal) : prev + 1;
    const nextQuota = {
      [today]: {
        ...(this.state.player.pairQuota?.[today] || {}),
        [key]: nextVal
      }
    };
    this.updatePlayer({ pairQuota: nextQuota });
    return nextVal;
  }

  async _consumePairRewardSlot(otherUid) {
    const today = getTodayStr();
    const pairKey = this._getPairKey(otherUid);
    let cur = this.getPairQuotaToday(otherUid);
    if (this.cloudDbUrl) {
      const { ok, data } = await this._getCloud(`pairQuota/${today}/${encodeURIComponent(pairKey)}`);
      if (ok && Number.isFinite(Number(data))) {
        cur = Math.max(cur, Number(data));
      }
    }
    if (cur >= 3) {
      this._incrementLocalPairQuota(otherUid, cur);
      return { granted: false, used: cur, max: 3 };
    }
    const next = cur + 1;
    this._incrementLocalPairQuota(otherUid, next);
    if (this.cloudDbUrl) {
      await this._putCloud(`pairQuota/${today}/${encodeURIComponent(pairKey)}`, next);
    }
    return { granted: true, used: next, max: 3 };
  }

  async _deliverInteraction(targetUid, eventPayload) {
    this._broadcast('interaction', eventPayload);
    if (this.cloudDbUrl && targetUid) {
      const path = `interactions/${encodeURIComponent(targetUid)}/${encodeURIComponent(eventPayload.id)}`;
      if (this.sdkStreamActive && this.fbDb && this.fbSdk) {
        try {
          await this.fbSdk.set(this.fbSdk.ref(this.fbDb, path), eventPayload);
          return true;
        } catch {}
      }
      return await this._putCloud(path, eventPayload);
    }
    return true;
  }

  async sendPeerEmote(targetPeer, actionId = 'wave') {
    if (!targetPeer) return { ok: false, reason: '找不到對方玩家' };
    const toUid = targetPeer.uid || targetPeer.id;
    const ev = {
      id: `int-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: 'emote',
      action: actionId,
      fromUid: this.playerUid,
      fromClientId: this.clientId,
      fromName: this.state.player.name || '虔誠香客',
      toUid,
      toClientId: targetPeer.id || '',
      toName: targetPeer.name || '線上香客',
      createdAt: Date.now()
    };
    await this._deliverInteraction(toUid, ev);
    return { ok: true, event: ev };
  }

  async replyPeerEmote(incomingEvent) {
    if (!incomingEvent || !incomingEvent.fromUid) return { ok: false };
    const quota = await this._consumePairRewardSlot(incomingEvent.fromUid);
    if (quota.granted) {
      this.addMerit(1);
    }
    const replyEv = {
      id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: 'reply',
      action: incomingEvent.action || 'salute',
      refEventId: incomingEvent.id,
      rewardGranted: quota.granted,
      usedToday: quota.used,
      fromUid: this.playerUid,
      fromClientId: this.clientId,
      fromName: this.state.player.name || '虔誠香客',
      toUid: incomingEvent.fromUid,
      toClientId: incomingEvent.fromClientId || '',
      toName: incomingEvent.fromName || '線上香客',
      createdAt: Date.now()
    };
    await this._deliverInteraction(incomingEvent.fromUid, replyEv);
    return { ok: true, granted: quota.granted, used: quota.used };
  }

  async sendGiftToPeer(targetPeer, giftType) {
    if (!targetPeer) return { ok: false, reason: '請先選擇要贈送的在線香客' };
    const toUid = targetPeer.uid || targetPeer.id;
    let giftLabel = '';
    if (giftType === 'egg') {
      if (!this.consumeEgg(1)) return { ok: false, reason: '背包內沒有新鮮土雞蛋可贈送' };
      giftLabel = '🥚 新鮮土雞蛋';
    } else {
      const def = TALISMAN_CATALOG.find(t => t.id === giftType);
      if (!def) return { ok: false, reason: '無效的贈禮項目' };
      const tals = this.getTalismans();
      if ((tals[giftType] || 0) <= 0) return { ok: false, reason: `背包內尚未持有「${def.name}」` };
      tals[giftType] -= 1;
      this.updatePlayer({ talismans: tals });
      giftLabel = `${def.emoji} ${def.name}`;
    }

    const ev = {
      id: `gift-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: 'gift',
      action: giftType,
      giftLabel,
      fromUid: this.playerUid,
      fromClientId: this.clientId,
      fromName: this.state.player.name || '虔誠香客',
      toUid,
      toClientId: targetPeer.id || '',
      toName: targetPeer.name || '線上香客',
      createdAt: Date.now()
    };
    await this._deliverInteraction(toUid, ev);
    return { ok: true, giftLabel };
  }

  _handleIncomingInteraction(ev, cloudKey = null) {
    if (!ev || !ev.id) return;
    if (this._processedInteractionIds.has(ev.id)) return;
    this._processedInteractionIds.add(ev.id);

    // 收到後立即清理雲端收件匣該筆事件避免重複觸發
    if (this.cloudDbUrl && cloudKey) {
      const delPath = `interactions/${encodeURIComponent(this.playerUid)}/${encodeURIComponent(cloudKey)}`;
      if (this.sdkStreamActive && this.fbDb && this.fbSdk) {
        this.fbSdk.remove(this.fbSdk.ref(this.fbDb, delPath)).catch(() => {});
      } else {
        fetch(`${this.cloudDbUrl}/${delPath}.json`, {
          method: 'DELETE'
        }).catch(() => {});
      }
    }

    // 處理回禮獎勵與贈禮入袋
    if (ev.kind === 'reply') {
      if (ev.rewardGranted) {
        this.addMerit(1);
        if (ev.fromUid) this._incrementLocalPairQuota(ev.fromUid, ev.usedToday || null);
      }
    } else if (ev.kind === 'gift') {
      if (ev.action === 'egg') {
        this.addEgg(1);
      } else if (TALISMAN_CATALOG.some(t => t.id === ev.action)) {
        const tals = this.getTalismans();
        tals[ev.action] = (tals[ev.action] || 0) + 1;
        const col = new Set(this.getTalismanCollection());
        col.add(ev.action);
        this.updatePlayer({ talismans: tals, talismanCollection: Array.from(col) });
      }
    }

    // 通知 UI 與 3D 場景顯示回饋
    this.listeners.interaction?.forEach(fn => {
      try { fn(ev); } catch (err) { console.error('Interaction listener error:', err); }
    });
  }

  // ---- 每日民俗小挑戰 ----
  hasPlayedQuizToday() {
    return this.state.player.quizDailyDate === getTodayStr();
  }

  completeDailyQuiz(correctCount) {
    const today = getTodayStr();
    const reward = correctCount * 15 + (correctCount === 6 ? 20 : 0);
    this.updatePlayer({
      quizDailyDate: today,
      quizDailyScore: correctCount,
      merit: (this.state.player.merit || 0) + reward
    });
    return { reward, correctCount };
  }

  claimDailyCheckin() {
    const today = getTodayStr();
    if (this.state.player.lastCheckinDate === today) {
      return { ok: false, already: true };
    }
    this.updatePlayer({
      lastCheckinDate: today,
      merit: (this.state.player.merit || 0) + 20
    });
    return { ok: true, reward: 20 };
  }

  // ---- 公佈欄（本機 ＋ 多分頁 ＋ 雲端／伺服器即時儲存同步） ----
  getBulletin() { return this.state.bulletin; }

  updateBulletin(nextBulletin) {
    this.state.bulletin = {
      announcements: Array.isArray(nextBulletin.announcements) ? nextBulletin.announcements : [],
      construction: nextBulletin.construction || { percent: 72, stage: '', targetDate: '', note: '' },
      donors: Array.isArray(nextBulletin.donors) ? nextBulletin.donors : [],
      updatedAt: getTodayStr()
    };
    this._save(STORAGE_KEYS.bulletin, this.state.bulletin);
    this._broadcast('bulletin', this.state.bulletin);
    this._pushSharedToBackend('bulletin', this.state.bulletin);
    this._emit('bulletin');
  }

  // ---- 安太歲紅紙牆（雲端先讀再合併寫入，避免多人同時點燈覆蓋彼此！） ----
  getTaiSuiList() { return this.state.taisui; }

  async _mergeAndPushTaiSui({ prepend = [], removeId = null, replaceAll = null } = {}) {
    if (this.cloudDbUrl) {
      let nextList;
      if (Array.isArray(replaceAll)) {
        nextList = replaceAll;
      } else {
        const { ok, data } = await this._getCloud('shared/taisui');
        const base = (ok && this._normalizeArrayFromCloud(data)) ? this._normalizeArrayFromCloud(data) : this.state.taisui;
        let merged = [...base];
        if (removeId) {
          merged = merged.filter(item => item && item.id !== removeId);
        }
        if (prepend.length > 0) {
          const existingIds = new Set(merged.map(item => item?.id).filter(Boolean));
          const fresh = prepend.filter(item => item && !existingIds.has(item.id));
          merged = [...fresh, ...merged];
        }
        nextList = merged;
      }

      if (removeId) {
        await this._deleteCloud(`shared/taisuiOnline/${encodeURIComponent(removeId)}`);
      }
      await this._putCloud('shared/taisui', nextList);
      await this._putCloud('shared/taisuiEmpty', nextList.length === 0);
      const { ok: okOn, data: onlineData } = await this._getCloud('shared/taisuiOnline');
      const combined = okOn ? this._mergeTaiSuiSources(nextList, onlineData) : nextList;
      this.state.taisui = combined;
      this._save(STORAGE_KEYS.taisui, combined);
      this._broadcast('taisui', combined);
      this._emit('taisui');
      return;
    }
    this._pushSharedToBackend('taisui', this.state.taisui);
  }

  addTaiSuiEntry({ name, zodiac = '平安', wish = '闔家平安、消災解厄', type = 'online' }) {
    const cleanName = name.trim().slice(0, 24);
    if (!cleanName) return null;
    const entry = {
      id: `ts-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      zodiac: String(zodiac || '平安').trim().slice(0, 16),
      wish: (wish.trim() || '闔家平安、諸事順遂').slice(0, 80),
      type,
      createdAt: new Date().toLocaleDateString('zh-TW')
    };
    this.state.taisui = [entry, ...this.state.taisui];
    this._save(STORAGE_KEYS.taisui, this.state.taisui);
    this._broadcast('taisui', this.state.taisui);
    this._emit('taisui');
    // ★ V50 資安分流：一般信眾線上點太歲燈改寫入 append-only 節點 shared/taisuiOnline/{id}（免管理員登入且無法覆蓋他人紀錄！）
    if (type === 'online' && this.cloudDbUrl) {
      this._putCloud(`shared/taisuiOnline/${encodeURIComponent(entry.id)}`, entry);
    } else {
      this._mergeAndPushTaiSui({ prepend: [entry] });
    }
    return entry;
  }

  replaceTaiSuiList(list) {
    const next = Array.isArray(list) ? list : [];
    this.state.taisui = next;
    this._save(STORAGE_KEYS.taisui, this.state.taisui);
    this._broadcast('taisui', this.state.taisui);
    this._emit('taisui');
    this._mergeAndPushTaiSui({ replaceAll: next });
  }

  batchImportTaiSui(entries) {
    const today = new Date().toLocaleDateString('zh-TW');
    const newItems = entries.map((item, idx) => ({
      id: `ts-imp-${Date.now()}-${idx}`,
      name: item.name.trim(),
      zodiac: item.zodiac?.trim() || '太歲',
      wish: item.wish?.trim() || '消災解厄、平安順遂',
      type: 'official',
      createdAt: today
    })).filter(i => i.name.length > 0);

    this.state.taisui = [...newItems, ...this.state.taisui];
    this._save(STORAGE_KEYS.taisui, this.state.taisui);
    this._broadcast('taisui', this.state.taisui);
    this._emit('taisui');
    this._mergeAndPushTaiSui({ prepend: newItems });
    return newItems.length;
  }

  removeTaiSuiEntry(id) {
    this.state.taisui = this.state.taisui.filter(item => item.id !== id);
    this._save(STORAGE_KEYS.taisui, this.state.taisui);
    this._broadcast('taisui', this.state.taisui);
    this._emit('taisui');
    this._mergeAndPushTaiSui({ removeId: id });
  }

  // ---- 供桌供品（上限 12 份，滿 10 分鐘自動清理） ----
  getOfferings() { return this.state.offerings; }

  addOffering(catalogId, donorName = '虔誠香客', customWish = '', side = 'left') {
    this.pruneExpiredOfferings();
    const maxCount = TEMPLE_CONFIG.offerings.maxCount;
    const itemDef = OFFERING_CATALOG.find(o => o.id === catalogId) || OFFERING_CATALOG[0];

    let trimmedOldest = false;
    if (this.state.offerings.length >= maxCount) {
      this.state.offerings = this.state.offerings.slice(1);
      trimmedOldest = true;
    }

    const normalizedSide = side === 'right' ? 'right' : 'left';
    const record = {
      id: `off-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      catalogId: itemDef.id,
      name: itemDef.name,
      emoji: itemDef.emoji,
      side: normalizedSide,
      donor: donorName.trim() || '虔誠香客',
      blessing: customWish.trim() || itemDef.blessing,
      createdAt: Date.now()
    };

    this.state.offerings = [...this.state.offerings, record];
    this._save(STORAGE_KEYS.offerings, this.state.offerings);
    this._broadcast('offerings', this.state.offerings);
    this._pushSharedToBackend('offerings', this.state.offerings);
    this._emit('offerings');
    return { record, trimmedOldest };
  }

  clearOfferings() {
    this.state.offerings = [];
    this._save(STORAGE_KEYS.offerings, this.state.offerings);
    this._broadcast('offerings', this.state.offerings);
    this._pushSharedToBackend('offerings', this.state.offerings);
    this._emit('offerings');
  }

  pruneExpiredOfferings() {
    const now = Date.now();
    const ttl = TEMPLE_CONFIG.offerings.ttlMs;
    const before = this.state.offerings.length;
    const next = this.state.offerings.filter(item => now - item.createdAt < ttl);
    if (next.length !== before) {
      this.state.offerings = next;
      this._save(STORAGE_KEYS.offerings, this.state.offerings);
      this._broadcast('offerings', this.state.offerings);
      this._emit('offerings');
    }
  }

  // ---- 統一聊天紀錄與跨裝置多人聊天同步 ----
  getChatMessages() { return this.state.chat; }

  addChatMessage({ sender, role = 'player', avatar = '🙏', text, channel = '' }) {
    const clean = String(text || '').trim();
    if (!clean) return null;
    const msg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      senderId: role === 'player' ? this.clientId : `npc-${role}`,
      sender,
      role,
      avatar,
      channel, // '' | 'bench'
      text: clean,
      timestamp: Date.now()
    };
    this.state.chat = [...this.state.chat.slice(-79), msg];
    this._save(STORAGE_KEYS.chat, this.state.chat);
    // 廣播單筆訊息避免覆蓋其他分頁聊天紀錄！
    this._broadcast('chatMsg', msg);
    this._emit('chat');

    if (role === 'player') {
      if (this.cloudDbUrl) {
        if (this.sdkStreamActive && this.fbDb && this.fbSdk) {
          this.fbSdk.set(this.fbSdk.ref(this.fbDb, `chat/${msg.id}`), msg).catch(() => {
            this._putCloud(`chat/${msg.id}`, msg);
          });
        } else {
          this._putCloud(`chat/${msg.id}`, msg);
        }
      } else if (this.serverMpAvailable) {
        fetch('/api/mp/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(msg)
        }).catch(() => {});
      }
    }
    return msg;
  }

  // ---- V46 全站線上參拜人數統計（每日／每週／每月／每年／累積上線人數，跨裝置 Firebase RTDB 原子同步） ----
  _loadVisitStats() {
    const saved = this._load(STORAGE_KEYS.visitStats, null);
    if (saved && typeof saved === 'object') {
      return {
        daily: saved.daily && typeof saved.daily === 'object' ? saved.daily : {},
        allTime: saved.allTime && typeof saved.allTime === 'object' ? saved.allTime : {}
      };
    }
    return { daily: {}, allTime: {} };
  }

  _mergeVisitStatsData(incoming) {
    if (!incoming || typeof incoming !== 'object') return false;
    const cur = this.state.visitStats || { daily: {}, allTime: {} };
    const nextDaily = { ...(cur.daily || {}) };
    const nextAllTime = { ...(cur.allTime || {}) };

    if (incoming.daily && typeof incoming.daily === 'object') {
      Object.entries(incoming.daily).forEach(([dateKey, dayVal]) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !dayVal) return;
        if (typeof dayVal === 'object') {
          const baseObj = nextDaily[dateKey] && typeof nextDaily[dateKey] === 'object' ? nextDaily[dateKey] : {};
          nextDaily[dateKey] = { ...baseObj, ...dayVal };
        } else if (typeof dayVal === 'number' && !nextDaily[dateKey]) {
          nextDaily[dateKey] = dayVal;
        }
      });
    }
    if (incoming.allTime && typeof incoming.allTime === 'object') {
      Object.entries(incoming.allTime).forEach(([uid, rec]) => {
        if (!uid || !rec) return;
        const prev = nextAllTime[uid];
        nextAllTime[uid] = prev && typeof prev === 'object'
          ? {
              firstAt: Math.min(Number(prev.firstAt || Date.now()), Number(rec.firstAt || Date.now())),
              lastAt: Math.max(Number(prev.lastAt || 0), Number(rec.lastAt || 0)),
              name: rec.name || prev.name || ''
            }
          : rec;
      });
    }

    const beforeStr = JSON.stringify(cur);
    const nextObj = { daily: nextDaily, allTime: nextAllTime };
    const afterStr = JSON.stringify(nextObj);
    if (beforeStr !== afterStr) {
      this.state.visitStats = nextObj;
      this._save(STORAGE_KEYS.visitStats, nextObj);
      return true;
    }
    return false;
  }

  async _pullCloudVisitStats(forceEmit = false) {
    if (!this.cloudDbUrl) return;
    if (this._cloudVisitPulling && !forceEmit) return;
    this._cloudVisitPulling = true;
    try {
      const res = await fetch(`${this.cloudDbUrl}/stats/visits.json`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      this.cloudConnected = true;
      const changed = this._mergeVisitStatsData(data);
      if (changed || forceEmit) {
        this._emit('visitStats');
      }
    } catch {
    } finally {
      this._cloudVisitPulling = false;
    }
  }

  refreshVisitStats(forceEmit = false) {
    if (this.cloudDbUrl) return this._pullCloudVisitStats(forceEmit);
    if (forceEmit) this._emit('visitStats');
    return Promise.resolve();
  }

  recordOnlineVisit(playerName = '') {
    const today = getTodayStr();
    const uid = String(this.playerUid || this.clientId).replace(/[.#$[\]/]/g, '_');
    const now = Date.now();
    const cleanName = String(playerName || this.state.player?.name || '虔誠香客').trim().slice(0, 20);

    const cur = this.state.visitStats || { daily: {}, allTime: {} };
    const dayMap = cur.daily[today] && typeof cur.daily[today] === 'object' ? { ...cur.daily[today] } : {};
    const alreadyRecordedToday = Boolean(dayMap[uid]);
    dayMap[uid] = { at: dayMap[uid]?.at || now, lastAt: now, name: cleanName };
    cur.daily = { ...(cur.daily || {}), [today]: dayMap };

    const prevAll = cur.allTime?.[uid];
    const allRec = {
      firstAt: prevAll?.firstAt || now,
      lastAt: now,
      name: cleanName
    };
    cur.allTime = { ...(cur.allTime || {}), [uid]: allRec };

    this.state.visitStats = cur;
    this._save(STORAGE_KEYS.visitStats, cur);
    this._broadcast('visitStats', cur);
    this._emit('visitStats');

    // ★ 本機測試環境（localhost / 127.0.0.1）不寫入正式 Firebase，線上正式站才原子寫入當日與累積人次！
    const isLocalDev = /^(127\.0\.0\.1|localhost)$/i.test(window.location.hostname || '');
    if (this.cloudDbUrl && !isLocalDev) {
      if (!alreadyRecordedToday) {
        this._putCloud(`stats/visits/daily/${today}/${encodeURIComponent(uid)}`, dayMap[uid]);
      }
      this._putCloud(`stats/visits/allTime/${encodeURIComponent(uid)}`, allRec);
    }
    return this.getVisitAnalytics();
  }

  getVisitAnalytics() {
    const stats = this.state.visitStats || { daily: {}, allTime: {} };
    const dailyObj = stats.daily || {};
    const allTimeObj = stats.allTime || {};
    const now = new Date();
    const todayStr = getTodayStr();
    const currentYear = now.getFullYear();
    const currentMonthPrefix = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentYearPrefix = `${currentYear}-`;

    const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const countDayRaw = (dateKey) => {
      const val = dailyObj[dateKey];
      if (!val) return 0;
      if (typeof val === 'number') return Math.max(0, Math.floor(val));
      if (typeof val === 'object') return Object.keys(val).length;
      return 0;
    };

    const onlineNow = this.getRealPlayerCount();
    const getDayCount = (dateKey) => {
      const raw = countDayRaw(dateKey);
      return dateKey === todayStr ? Math.max(raw, onlineNow) : raw;
    };

    const todayCount = getDayCount(todayStr);

    // 本週區間（台灣習慣：週一至週日）
    const dayOfWeek = (now.getDay() + 6) % 7; // 0 = 週一 .. 6 = 週日
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    const weekStartStr = fmtDate(monday);
    const weekEndStr = fmtDate(sunday);

    let weekCount = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      weekCount += getDayCount(fmtDate(d));
    }

    // 彙總所有紀錄日期（本月／今年／累積總人次／歷年清單／不重複信眾）
    const allDates = new Set(Object.keys(dailyObj).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)));
    allDates.add(todayStr);

    let monthCount = 0;
    let yearCount = 0;
    let cumulativeCount = 0;
    const monthTotals = new Array(12).fill(0);
    const yearMap = new Map();
    yearMap.set(String(currentYear), 0);
    const uniqueUidSet = new Set(Object.keys(allTimeObj || {}));

    allDates.forEach((dk) => {
      const c = getDayCount(dk);
      cumulativeCount += c;
      if (dk.startsWith(currentMonthPrefix)) monthCount += c;
      if (dk.startsWith(currentYearPrefix)) {
        yearCount += c;
        const mIdx = Number(dk.slice(5, 7)) - 1;
        if (mIdx >= 0 && mIdx < 12) monthTotals[mIdx] += c;
      }
      const yKey = dk.slice(0, 4);
      yearMap.set(yKey, (yearMap.get(yKey) || 0) + c);
      const val = dailyObj[dk];
      if (val && typeof val === 'object') {
        Object.keys(val).forEach((u) => uniqueUidSet.add(u));
      }
    });

    const uniquePilgrims = Math.max(uniqueUidSet.size, todayCount);
    cumulativeCount = Math.max(cumulativeCount, uniquePilgrims);

    // 1) 每日序列（近 14 日）
    const weekNames = ['日', '一', '二', '三', '四', '五', '六'];
    const dailySeries = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dk = fmtDate(d);
      dailySeries.push({
        key: dk,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        subLabel: `週${weekNames[d.getDay()]}`,
        count: getDayCount(dk),
        isCurrent: dk === todayStr
      });
    }

    // 2) 每週序列（近 8 週，週一至週日）
    const weeklySeries = [];
    for (let w = 7; w >= 0; w--) {
      const ws = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - w * 7);
      const we = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 6);
      let wSum = 0;
      for (let dIdx = 0; dIdx < 7; dIdx++) {
        const curD = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + dIdx);
        wSum += getDayCount(fmtDate(curD));
      }
      weeklySeries.push({
        key: fmtDate(ws),
        label: `${ws.getMonth() + 1}/${ws.getDate()}`,
        subLabel: `${ws.getMonth() + 1}/${ws.getDate()}~${we.getMonth() + 1}/${we.getDate()}`,
        count: wSum,
        isCurrent: w === 0
      });
    }

    // 3) 每月序列（本年度 1 月至 12 月）
    const curMonthIdx = now.getMonth();
    const monthlySeries = monthTotals.map((cnt, idx) => ({
      key: `${currentYear}-${String(idx + 1).padStart(2, '0')}`,
      label: `${idx + 1}月`,
      subLabel: `${currentYear}/${String(idx + 1).padStart(2, '0')}`,
      count: cnt,
      isCurrent: idx === curMonthIdx
    }));

    // 4) 每年序列（歷年由舊到新）
    const yearlySeries = Array.from(yearMap.entries())
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([yKey, cnt]) => ({
        key: yKey,
        label: `${yKey}年`,
        subLabel: `西元 ${yKey} 年度`,
        count: cnt,
        isCurrent: yKey === String(currentYear)
      }));

    return {
      todayStr,
      weekRangeLabel: `${weekStartStr.slice(5)} ~ ${weekEndStr.slice(5)}`,
      monthLabel: `${currentYear} 年 ${now.getMonth() + 1} 月`,
      yearLabel: `${currentYear} 年`,
      today: todayCount,
      week: weekCount,
      month: monthCount,
      year: yearCount,
      cumulative: cumulativeCount,
      uniquePilgrims,
      onlineNow,
      dailySeries,
      weeklySeries,
      monthlySeries,
      yearlySeries
    };
  }

  exportVisitStatsCsv() {
    const a = this.getVisitAnalytics();
    const rows = [
      ['玉勅代天府德慈宮 參拜人數統計報表', `匯出時間：${new Date().toLocaleString('zh-TW')}`],
      [],
      ['統計指標', '人數／人次', '備註說明'],
      ['今日參拜人數', a.today, a.todayStr],
      ['本週參拜人數', a.week, a.weekRangeLabel],
      ['本月參拜人數', a.month, a.monthLabel],
      ['今年參拜人數', a.year, a.yearLabel],
      ['累積上線總人次', a.cumulative, '歷年每日上線總計'],
      ['累計不重複信眾', a.uniquePilgrims, '依裝置識別累計'],
      ['目前同時在線真人', a.onlineNow, '即時線上人數'],
      [],
      ['近 14 日每日明細', '日期', '參拜人數'],
      ...a.dailySeries.map((d) => [d.subLabel, d.key, d.count]),
      [],
      ['本年度每月明細', '月份', '參拜人數'],
      ...a.monthlySeries.map((m) => [m.label, m.key, m.count]),
      [],
      ['歷年每年明細', '年度', '參拜人數'],
      ...a.yearlySeries.map((y) => [y.label, y.key, y.count])
    ];
    const csvSafe = (v) => {
      const s = String(v ?? '');
      const guarded = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
      return `"${guarded.replace(/"/g, '""')}"`;
    };
    return '\uFEFF' + rows.map((r) => r.map(csvSafe).join(',')).join('\r\n');
  }

  exportAllData() {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      temple: TEMPLE_CONFIG.templeName,
      bulletin: this.state.bulletin,
      taisui: this.state.taisui,
      visitAnalytics: this.getVisitAnalytics()
    }, null, 2);
  }

  resetDefaults() {
    this.updateBulletin(structuredClone(INITIAL_BULLETIN));
    this.replaceTaiSuiList(structuredClone(INITIAL_TAISUI_LIST));
  }
}

export const storageSync = new TempleStorageSync();
