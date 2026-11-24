/**
 * localStorage 狀態持久化管理器
 * 免註冊、打開即玩，自動保存旅行里程、香火苗孵化狀態、已解鎖御朱印與結緣品核銷紀錄
 */

import { SITE_CONFIG } from '../config/siteConfig.js';

const STORAGE_KEY = 'templego_goshuin_state_v1';

function createDefaultState() {
  return {
    version: 1,
    totalDistanceKm: 0,
    activeSeedUid: 'seed-starter-shoutian',
    seeds: [
      {
        uid: 'seed-starter-shoutian',
        templeId: 'shoutian',
        seedType: 'vermilion',
        currentDistance: 0,
        targetDistance: SITE_CONFIG.seedTypes.vermilion.targetKm,
        plantedAt: new Date().toISOString(),
        source: 'welcome'
      }
    ],
    // { [templeId]: { templeId, unlockedAt, count, voucherCode, voucherRedeemedAt, checkInMethod } }
    unlockedGoshuin: {},
    preferences: {
      lang: 'zh-TW',
      theme: 'day', // 'day' | 'night'
      largeFont: false,
      soundEnabled: true,
      albumLayout: 'accordion' // 'accordion' | 'grid'
    },
    checkInHistory: []
  };
}

let state = loadState();
const listeners = new Set();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw);
    const base = createDefaultState();
    return {
      ...base,
      ...parsed,
      preferences: { ...base.preferences, ...(parsed.preferences || {}) },
      seeds: Array.isArray(parsed.seeds) ? parsed.seeds : base.seeds,
      unlockedGoshuin: parsed.unlockedGoshuin || {},
      checkInHistory: Array.isArray(parsed.checkInHistory) ? parsed.checkInHistory : []
    };
  } catch (err) {
    console.warn('[TempleGo] Failed to load state, using fresh state:', err);
    return createDefaultState();
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[TempleGo] Failed to save state:', err);
  }
  listeners.forEach((fn) => {
    try {
      fn(state);
    } catch (e) {
      console.error(e);
    }
  });
}

export function subscribeState(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState() {
  return state;
}

export function updatePreference(key, value) {
  state.preferences[key] = value;
  persist();
}

export function getActiveSeed() {
  if (!state.seeds.length) return null;
  const found = state.seeds.find((s) => s.uid === state.activeSeedUid);
  return found || state.seeds[0];
}

export function setActiveSeed(uid) {
  if (state.seeds.some((s) => s.uid === uid)) {
    state.activeSeedUid = uid;
    persist();
  }
}

/**
 * 參拜打卡並請回香火苗
 * @returns {{ ok: boolean, reason?: string, seed?: object }}
 */
export function plantSeedFromTemple(temple, method = 'gps') {
  if (!temple) return { ok: false, reason: 'invalid_temple' };

  const alreadyHas = state.seeds.some((s) => s.templeId === temple.id);
  if (alreadyHas) {
    return { ok: false, reason: 'duplicate_seed' };
  }

  if (state.seeds.length >= SITE_CONFIG.maxSeedSlots) {
    return { ok: false, reason: 'pouch_full' };
  }

  const seedDef = SITE_CONFIG.seedTypes[temple.seedType] || SITE_CONFIG.seedTypes.vermilion;
  const uid = `seed-${temple.id}-${Date.now()}`;
  const newSeed = {
    uid,
    templeId: temple.id,
    seedType: seedDef.id,
    currentDistance: 0,
    targetDistance: seedDef.targetKm,
    plantedAt: new Date().toISOString(),
    source: method
  };

  state.seeds.push(newSeed);
  if (!state.activeSeedUid || !state.seeds.some((s) => s.uid === state.activeSeedUid)) {
    state.activeSeedUid = uid;
  }

  state.checkInHistory.unshift({
    templeId: temple.id,
    method,
    timestamp: new Date().toISOString()
  });
  state.checkInHistory = state.checkInHistory.slice(0, 60);

  persist();
  return { ok: true, seed: newSeed };
}

/**
 * 累加旅行距離（同時累計至總距離與當前培育中香火苗）
 */
export function addTravelDistance(deltaKm) {
  if (!Number.isFinite(deltaKm) || deltaKm <= 0) return { becameReady: false };

  const roundedDelta = Math.round(deltaKm * 1000) / 1000;
  state.totalDistanceKm = Math.round((state.totalDistanceKm + roundedDelta) * 1000) / 1000;

  let becameReady = false;
  const active = getActiveSeed();
  if (active) {
    const wasReady = active.currentDistance >= active.targetDistance;
    active.currentDistance = Math.min(
      active.targetDistance,
      Math.round((active.currentDistance + roundedDelta) * 1000) / 1000
    );
    if (!wasReady && active.currentDistance >= active.targetDistance) {
      becameReady = true;
    }
  }

  persist();
  return { becameReady, activeSeed: active };
}

/**
 * 顯化御朱印（將滿進度香火苗轉化為御朱印收錄圖鑑）
 */
export function hatchSeed(uid, temple) {
  const idx = state.seeds.findIndex((s) => s.uid === uid);
  if (idx === -1) return null;
  const seed = state.seeds[idx];
  if (seed.currentDistance < seed.targetDistance) return null;

  state.seeds.splice(idx, 1);
  if (state.activeSeedUid === uid) {
    state.activeSeedUid = state.seeds[0] ? state.seeds[0].uid : null;
  }

  const nowIso = new Date().toISOString();
  const existing = state.unlockedGoshuin[seed.templeId];
  const serialSuffix = String(Math.floor(1000 + Math.random() * 9000));
  const voucherCode = existing?.voucherCode || `TG-${seed.templeId.slice(0, 4).toUpperCase()}-${serialSuffix}`;

  const entry = {
    templeId: seed.templeId,
    seedType: seed.seedType,
    unlockedAt: existing ? existing.unlockedAt : nowIso,
    lastStampedAt: nowIso,
    count: existing ? existing.count + 1 : 1,
    voucherCode,
    voucherRedeemedAt: existing ? existing.voucherRedeemedAt : null,
    hasReward: Boolean(temple && temple.rewardItem)
  };

  state.unlockedGoshuin[seed.templeId] = entry;
  persist();
  return entry;
}

/**
 * 廟方結緣品核銷
 */
export function redeemVoucher(templeId) {
  const entry = state.unlockedGoshuin[templeId];
  if (!entry || entry.voucherRedeemedAt) return false;
  entry.voucherRedeemedAt = new Date().toISOString();
  persist();
  return true;
}

/**
 * 重設體驗進度
 */
export function resetAllProgress() {
  const keepPrefs = { ...state.preferences };
  state = createDefaultState();
  state.preferences = keepPrefs;
  persist();
}
