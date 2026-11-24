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
import { TEMPLE_CONFIG } from '../config/templeConfig.js';
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
  chat: 'deci_temple_chat_v5',
  player: 'deci_temple_player_v5',
  cloudDbUrl: 'deci_temple_cloud_db_url_v1'
};

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
    this.lastBubbleText = '';
    this.lastBubbleAt = 0;
    this._peerLoggedBubbles = new Map();

    // 1. 解析雲端 Firebase RTDB 網址（優先順序：網址 ?db= > 管理者本機設定 > firebaseConfig.js）
    this.cloudDbUrl = this._resolveInitialCloudDbUrl();
    this.cloudConnected = false;
    this.cloudLastError = '';
    this.mode = this.cloudDbUrl ? 'firebase' : (isStaticHost ? 'local-only' : 'server-mp');
    this.serverMpAvailable = !this.cloudDbUrl && !isStaticHost;

    // 2. 廟埕清淨守護（不雅字詞違規計次與靜心冷卻）
    this.profanityStrikes = Number(sessionStorage.getItem('deci_profanity_strikes') || 0);
    this.chatMuteUntil = Number(sessionStorage.getItem('deci_chat_mute_until') || 0);

    this.listeners = {
      bulletin: new Set(),
      taisui: new Set(),
      offerings: new Set(),
      chat: new Set(),
      presence: new Set(),
      player: new Set()
    };

    this.remotePeers = new Map();
    this.hasExistingRecord = false;

    this.state = {
      bulletin: this._load(STORAGE_KEYS.bulletin, INITIAL_BULLETIN),
      taisui: this._load(STORAGE_KEYS.taisui, INITIAL_TAISUI_LIST),
      offerings: this._loadOfferings(),
      chat: this._dedupeChatList(this._load(STORAGE_KEYS.chat, INITIAL_CHAT_MESSAGES)),
      player: this._loadPlayer()
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

    // 啟動即拉取共享資料（雲端 Firebase 或本機 LAN 伺服器）
    if (this.cloudDbUrl) {
      this._pullCloudShared();
      this._pullCloudPresenceAndChat();
    } else if (this.serverMpAvailable) {
      this._pullServerShared();
    }

    setInterval(() => {
      this.pruneExpiredOfferings();
      this._pruneOfflinePeers();
    }, 1000);

    // 定期同步雲端共享資料（公佈欄／太歲牆／供桌）與多人聊天（縮短至 2.5 秒讓信徒即時看到最新安太歲牆！）
    setInterval(() => {
      if (this.cloudDbUrl) {
        this._pullCloudShared();
      } else if (this.serverMpAvailable) {
        this._pullServerShared();
      }
    }, 2500);
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
      this._pullCloudPresenceAndChat();
    } else {
      this.mode = this.isStaticHost ? 'local-only' : 'server-mp';
      this.serverMpAvailable = !this.isStaticHost;
    }
    this._emit('presence');
    return clean;
  }

  async testCloudDbConnection(rawUrl) {
    const url = normalizeDbUrl(rawUrl);
    if (!url) {
      return { ok: false, message: '網址格式不正確，請輸入 https://xxx.firebasedatabase.app 或 https://xxx.firebaseio.com' };
    }
    try {
      const pingPayload = { at: Date.now(), client: this.clientId };
      const putRes = await fetch(`${url}/_ping.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pingPayload)
      });
      if (!putRes.ok) {
        return {
          ok: false,
          message: `Firebase 拒絕寫入（HTTP ${putRes.status}），請至 Firebase Realtime Database 的「規則（Rules）」將讀寫權限開放！`
        };
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
      const res = await fetch(`${this.cloudDbUrl}/${path}.json`, {
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

      const cloudTaiSui = this._normalizeArrayFromCloud(data.taisui);
      if (cloudTaiSui || data.taisuiEmpty === true) {
        const nextList = cloudTaiSui || [];
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
    } catch {
    } finally {
      this._cloudSharedPulling = false;
    }
  }

  async _pullCloudPresenceAndChat() {
    if (!this.cloudDbUrl || this._cloudMpPulling) return;
    this._cloudMpPulling = true;
    try {
      const [pRes, cRes] = await Promise.all([
        fetch(`${this.cloudDbUrl}/presence.json`, { cache: 'no-store' }),
        fetch(`${this.cloudDbUrl}/chat.json`, { cache: 'no-store' })
      ]);
      // ★ 先合併正式聊天頻道（chat.json），再更新角色位置與頭頂氣泡（presence.json）
      if (cRes.ok) {
        const cMap = await cRes.json();
        if (cMap && typeof cMap === 'object') {
          const list = Array.isArray(cMap) ? cMap.filter(Boolean) : Object.values(cMap).filter(Boolean);
          this._mergeIncomingChats(list);
        }
      }
      if (pRes.ok) {
        const pMap = await pRes.json();
        this.cloudConnected = true;
        const now = Date.now();
        const activeRemoteIds = new Set();
        if (pMap && typeof pMap === 'object') {
          Object.values(pMap).forEach((p) => {
            if (!p || !p.id || p.id === this.clientId) return;
            if (now - (p.updatedAt || 0) > 14000) return;
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
    try { sessionStorage.setItem('deci_profanity_strikes', String(this.profanityStrikes)); } catch {}
    let mutedSeconds = 0;
    if (this.profanityStrikes >= 3) {
      mutedSeconds = 60;
      this.chatMuteUntil = Date.now() + mutedSeconds * 1000;
      try { sessionStorage.setItem('deci_chat_mute_until', String(this.chatMuteUntil)); } catch {}
    }
    return { strikes: this.profanityStrikes, mutedSeconds };
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
      name: this.state.player.name || '虔誠香客',
      presetId: this.state.player.presetId || 'youngMale',
      x: poseData.x,
      y: poseData.y,
      z: poseData.z,
      rotY: poseData.rotY,
      state: poseData.state,
      holdingIncense: poseData.holdingIncense,
      bubble: now - this.lastBubbleAt < 4500 ? this.lastBubbleText : '',
      bubbleAt: this.lastBubbleAt,
      updatedAt: now
    };

    // 1. 同瀏覽器 0 延遲同步
    this._broadcast('presence', packet);

    // 2. 雲端 Firebase RTDB 跨裝置多人同步（每 1.1 秒同步心跳與拉取同場玩家／聊天）
    if (this.cloudDbUrl) {
      if (!this._lastCloudSync || now - this._lastCloudSync >= 1100) {
        this._lastCloudSync = now;
        this._putCloud(`presence/${this.clientId}`, packet);
        this._pullCloudPresenceAndChat();
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
    const timeout = this.cloudDbUrl ? 14000 : 8500;
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
      return `☁️ 雲端多人連線（${real} 位真人・${real > 1 ? '真人互動' : '單人 NPC 陪聊'}）`;
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
    return Object.values(inv).reduce((s, n) => s + (Number(n) || 0), 0);
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

      this.state.taisui = nextList;
      this._save(STORAGE_KEYS.taisui, nextList);
      this._broadcast('taisui', nextList);
      this._emit('taisui');
      await this._putCloud('shared/taisui', nextList);
      await this._putCloud('shared/taisuiEmpty', nextList.length === 0);
      return;
    }
    this._pushSharedToBackend('taisui', this.state.taisui);
  }

  addTaiSuiEntry({ name, zodiac = '平安', wish = '闔家平安、消災解厄', type = 'online' }) {
    const cleanName = name.trim();
    if (!cleanName) return null;
    const entry = {
      id: `ts-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      zodiac,
      wish: wish.trim() || '闔家平安、諸事順遂',
      type,
      createdAt: new Date().toLocaleDateString('zh-TW')
    };
    this.state.taisui = [entry, ...this.state.taisui];
    this._save(STORAGE_KEYS.taisui, this.state.taisui);
    this._broadcast('taisui', this.state.taisui);
    this._emit('taisui');
    this._mergeAndPushTaiSui({ prepend: [entry] });
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

  addOffering(catalogId, donorName = '虔誠香客', customWish = '') {
    this.pruneExpiredOfferings();
    const maxCount = TEMPLE_CONFIG.offerings.maxCount;
    const itemDef = OFFERING_CATALOG.find(o => o.id === catalogId) || OFFERING_CATALOG[0];

    let trimmedOldest = false;
    if (this.state.offerings.length >= maxCount) {
      this.state.offerings = this.state.offerings.slice(1);
      trimmedOldest = true;
    }

    const record = {
      id: `off-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      catalogId: itemDef.id,
      name: itemDef.name,
      emoji: itemDef.emoji,
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
        this._putCloud(`chat/${msg.id}`, msg);
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

  exportAllData() {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      temple: TEMPLE_CONFIG.templeName,
      bulletin: this.state.bulletin,
      taisui: this.state.taisui
    }, null, 2);
  }

  resetDefaults() {
    this.updateBulletin(structuredClone(INITIAL_BULLETIN));
    this.replaceTaiSuiList(structuredClone(INITIAL_TAISUI_LIST));
  }
}

export const storageSync = new TempleStorageSync();
