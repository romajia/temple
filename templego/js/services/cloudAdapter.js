/**
 * B2B 宮廟打卡統計預留串接層（Firebase Realtime DB / Supabase REST）
 * - MVP 階段預設使用本機統計，不需外部金鑰即可運作
 * - 未來只要在 js/config/siteConfig.js 填入 Firebase 或 Supabase 憑證即可即時回傳各宮廟打卡人次
 */

import { SITE_CONFIG } from '../config/siteConfig.js';

const LOCAL_STATS_KEY = 'templego_b2b_analytics_v1';

function readLocalStats() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STATS_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeLocalStats(data) {
  try {
    localStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

export async function recordTempleAnalyticsEvent({ templeId, eventType, method = 'gps' }) {
  const stats = readLocalStats();
  if (!stats[templeId]) {
    stats[templeId] = { checkins: 0, hatches: 0, redemptions: 0 };
  }
  if (eventType === 'checkin') stats[templeId].checkins += 1;
  if (eventType === 'hatch') stats[templeId].hatches += 1;
  if (eventType === 'redeem') stats[templeId].redemptions += 1;
  stats[templeId].lastUpdated = new Date().toISOString();
  writeLocalStats(stats);

  const cloud = SITE_CONFIG.cloud;
  const payload = {
    temple_id: templeId,
    event_type: eventType,
    method,
    created_at: new Date().toISOString()
  };

  try {
    if (cloud.provider === 'firebase' && cloud.firebase.databaseURL) {
      const endpoint = `${cloud.firebase.databaseURL.replace(/\/$/, '')}/analytics/${templeId}.json`;
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else if (cloud.provider === 'supabase' && cloud.supabase.url && cloud.supabase.anonKey) {
      const endpoint = `${cloud.supabase.url.replace(/\/$/, '')}/rest/v1/${cloud.supabase.checkinsTable}`;
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: cloud.supabase.anonKey,
          Authorization: `Bearer ${cloud.supabase.anonKey}`
        },
        body: JSON.stringify(payload)
      });
    }
  } catch (err) {
    console.warn('[TempleGo CloudAdapter] Remote analytics skipped:', err);
  }
}

export function getTempleAnalyticsSnapshot() {
  return readLocalStats();
}
