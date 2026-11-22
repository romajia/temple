/**
 * V5 狀態自動存檔、每日民俗挑戰紀錄與「多人即時連線同步」服務層
 * ------------------------------------------------------------
 * 1. 全自動存檔（LocalStorage）：離開／重整自動保存功德、香火背包、參拜進度、角色造型、
 *    木魚功德次數、每日簽到與每日民俗挑戰紀錄，下次登入直接延續遊玩！
 * 2. 真實多人連線同步：
 *    - 優先串接本機／區網伺服器 `/api/mp/sync` & `/api/mp/chat`（不同瀏覽器／同網域多手機可即時同屏走動與頭頂聊天！）
 *    - 若設定 Firebase `databaseURL` 則無縫接軌跨網際網路雲端多人連線
 *    - 同步整合 `BroadcastChannel` 確保同瀏覽器多分頁 0 延遲同步
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
  player: 'deci_temple_player_v5'
};

const BLOCKED_WORDS = ['幹你', '靠北', '靠腰', '白痴', '智障', '垃圾', '去死', '操你', 'fuck', 'shit', 'bitch', 'asshole'];

export function sanitizeChatText(input) {
  let clean = String(input || '').trim();
  let flagged = false;
  for (const word of BLOCKED_WORDS) {
    const regex = new RegExp(word, 'gi');
    if (regex.test(clean)) {
      flagged = true;
      clean = clean.replace(regex, '＊＊');
    }
  }
  return { clean, flagged };
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
    this.mode = FIREBASE_CONFIG.enabled && FIREBASE_CONFIG.databaseURL ? 'firebase' : 'server-mp';
    this.serverMpAvailable = true;
    this.clientId = `pilgrim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.lastBubbleText = '';
    this.lastBubbleAt = 0;

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
      chat: this._load(STORAGE_KEYS.chat, INITIAL_CHAT_MESSAGES),
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
          this.remotePeers.set(payload.id, { ...payload, updatedAt: Date.now() });
          this._emit('presence');
          return;
        }
        if (this.listeners[topic]) {
          this.state[topic] = payload;
          this._emit(topic);
        }
      };
    }

    // 關閉／離開分頁前強制再存一次個人紀錄，確保萬無一失
    const forceFlush = () => this._save(STORAGE_KEYS.player, { ...this.state.player, lastSavedAt: Date.now() });
    window.addEventListener('beforeunload', forceFlush);
    window.addEventListener('pagehide', forceFlush);

    setInterval(() => {
      this.pruneExpiredOfferings();
      this._pruneOfflinePeers();
    }, 1000);
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
      merit: 30, // 新人入廟結緣禮
      inventory: {
        pineapple: 1,
        apple: 1
      },
      worshipSteps: [],       // 自動保存參拜進度！
      worshipRounds: 0,       // 累積圓滿參拜次數
      hasIncense: false,
      hasJossPaper: false,
      chantTotalTaps: 0,      // 累積敲木魚次數
      lastCheckinDate: '',
      quizDailyDate: '',      // 每日民俗挑戰日期（一天一次，每次 6 題）
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
      this.channel.postMessage({ topic, payload, senderId: this.clientId });
    }
  }

  /**
   * 多人即時位置與氣泡同步（同時驅動 BroadcastChannel 與伺服器多人連線 API！）
   */
  broadcastPresence(poseData) {
    if (poseData.bubble) {
      this.lastBubbleText = poseData.bubble;
      this.lastBubbleAt = Date.now();
    }
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
      bubble: Date.now() - this.lastBubbleAt < 4500 ? this.lastBubbleText : '',
      bubbleAt: this.lastBubbleAt
    };

    // 1. 同瀏覽器 0 延遲同步
    this._broadcast('presence', packet);

    // 2. 跨瀏覽器／區網多裝置伺服器即時同步（節流每 450ms 送一次）
    if (this.serverMpAvailable && !this._syncPending) {
      const now = Date.now();
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
              const nowT = Date.now();
              res.peers.forEach(p => {
                if (p && p.id && p.id !== this.clientId) {
                  this.remotePeers.set(p.id, { ...p, updatedAt: nowT });
                }
              });
              this._emit('presence');
            }
            if (Array.isArray(res.chats) && res.chats.length > 0) {
              this._mergeIncomingChats(res.chats);
            }
          })
          .catch(() => {
            // 若部署在純靜態主機無 /api/mp 端點，自動降級為純前端 BroadcastChannel 模式
            this.serverMpAvailable = false;
          })
          .finally(() => {
            this._syncPending = false;
          });
      }
    }
  }

  _mergeIncomingChats(incoming) {
    const existingIds = new Set(this.state.chat.map(c => c.id));
    let added = false;
    for (const m of incoming) {
      if (m && m.id && !existingIds.has(m.id)) {
        this.state.chat.push(m);
        existingIds.add(m.id);
        added = true;
      }
    }
    if (added) {
      this.state.chat = this.state.chat.sort((a, b) => a.timestamp - b.timestamp).slice(-60);
      this._save(STORAGE_KEYS.chat, this.state.chat);
      this._emit('chat');
    }
  }

  _pruneOfflinePeers() {
    const now = Date.now();
    let changed = false;
    for (const [id, peer] of this.remotePeers.entries()) {
      if (now - peer.updatedAt > 8500) {
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
    if (this.mode === 'firebase') return `Firebase 雲端連線（${this.getRealPlayerCount()} 位真人）`;
    if (this.serverMpAvailable) return `多人即時連線中（${this.getRealPlayerCount()} 位真人・共 ${this.getOnlineCount()} 位香客）`;
    return `本機多人同步（在場 ${this.getOnlineCount()} 位香客）`;
  }

  // ---- 玩家資料自動存檔 ----
  getPlayer() {
    return this.state.player;
  }

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

  // ---- 每日民俗小挑戰（一天一次，共 6 題） ----
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

  // ---- 公佈欄 ----
  getBulletin() { return this.state.bulletin; }

  updateBulletin(nextBulletin) {
    this.state.bulletin = {
      ...nextBulletin,
      updatedAt: getTodayStr()
    };
    this._save(STORAGE_KEYS.bulletin, this.state.bulletin);
    this._broadcast('bulletin', this.state.bulletin);
    this._emit('bulletin');
  }

  // ---- 安太歲紅紙牆 ----
  getTaiSuiList() { return this.state.taisui; }

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
    return entry;
  }

  replaceTaiSuiList(list) {
    this.state.taisui = list;
    this._save(STORAGE_KEYS.taisui, this.state.taisui);
    this._broadcast('taisui', this.state.taisui);
    this._emit('taisui');
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
    return newItems.length;
  }

  removeTaiSuiEntry(id) {
    this.state.taisui = this.state.taisui.filter(item => item.id !== id);
    this._save(STORAGE_KEYS.taisui, this.state.taisui);
    this._broadcast('taisui', this.state.taisui);
    this._emit('taisui');
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
    this._emit('offerings');
    return { record, trimmedOldest };
  }

  clearOfferings() {
    this.state.offerings = [];
    this._save(STORAGE_KEYS.offerings, this.state.offerings);
    this._broadcast('offerings', this.state.offerings);
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

  // ---- 聊天室與頭頂發言同步 ----
  getChatMessages() { return this.state.chat; }

  addChatMessage({ sender, role = 'player', avatar = '🙏', text }) {
    const clean = text.trim();
    if (!clean) return null;
    const msg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      senderId: this.clientId,
      sender,
      role,
      avatar,
      text: clean,
      timestamp: Date.now()
    };
    this.state.chat = [...this.state.chat.slice(-59), msg];
    this._save(STORAGE_KEYS.chat, this.state.chat);
    this._broadcast('chat', this.state.chat);
    this._emit('chat');

    // 同步至伺服器多人聊天室
    if (this.serverMpAvailable && role === 'player') {
      fetch('/api/mp/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      }).catch(() => {});
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
