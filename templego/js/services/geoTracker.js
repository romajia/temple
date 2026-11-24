/**
 * GPS 雷達距離計算（Haversine 公式）＋ 位移累加追蹤引擎 ＋ QR 網址參數解析
 */

import { SITE_CONFIG } from '../config/siteConfig.js';

const EARTH_RADIUS_M = 6371000;

/**
 * Haversine 公式計算兩組經緯度的球面距離（回傳單位：公尺）
 */
export function haversineMeters(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

export function formatDistance(meters) {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) return '--';
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(meters >= 10000 ? 1 : 2)} km`;
}

/**
 * 解析網址 ?temple_id=xxx 參數（QR Code 掃碼直達打卡備案）
 */
export function extractTempleIdFromUrl(urlOrSearch = window.location.search) {
  try {
    let search = urlOrSearch;
    if (urlOrSearch.includes('://')) {
      const parsed = new URL(urlOrSearch);
      search = parsed.search;
    } else if (urlOrSearch.includes('?')) {
      search = urlOrSearch.slice(urlOrSearch.indexOf('?'));
    }
    const params = new URLSearchParams(search);
    const id = params.get('temple_id');
    return id ? id.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * 距離追蹤與位置狀態管理
 */
class GeoTracker {
  constructor() {
    // 預設提供松柏嶺受天宮周邊作為示範參考點，授權真實 GPS 後即自動替換
    this.position = {
      lat: SITE_CONFIG.demoLocations[0].lat,
      lng: SITE_CONFIG.demoLocations[0].lng,
      accuracy: 15,
      isSimulated: true,
      label: SITE_CONFIG.demoLocations[0].label,
      timestamp: Date.now()
    };
    this.watchId = null;
    this.isTracking = false;
    this.lastValidTrackFix = null;
    this.sessionDistanceKm = 0;
    this.listeners = new Set();
    this.distanceCallback = null;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((fn) => fn(snapshot));
  }

  getSnapshot() {
    return {
      position: { ...this.position },
      isTracking: this.isTracking,
      sessionDistanceKm: this.sessionDistanceKm
    };
  }

  setSimulatedPosition(lat, lng, label = '模擬位置') {
    this.position = {
      lat,
      lng,
      accuracy: 8,
      isSimulated: true,
      label,
      timestamp: Date.now()
    };
    this.emit();
  }

  /**
   * 單次取得真實 GPS 定位
   */
  requestSingleLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('此瀏覽器不支援 GPS 定位，請使用 QR Code 掃碼打卡。'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.position = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 20),
            isSimulated: false,
            label: '即時 GPS 定位',
            timestamp: pos.timestamp || Date.now()
          };
          this.emit();
          resolve(this.position);
        },
        (err) => {
          const msgMap = {
            1: '尚未允許定位權限，您可使用「掃描廟宇 QR Code」或「模擬抵達測試」。',
            2: '目前無法取得衛星訊號，建議移至室外或使用 QR Code 打卡。',
            3: 'GPS 定位逾時，請稍後再試或改用 QR Code 打卡。'
          };
          reject(new Error(msgMap[err.code] || '無法取得定位資訊'));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    });
  }

  /**
   * 開啟旅行模式：定期比對前後兩次有效 GPS 座標位移並累加距離
   */
  startTravelTracking(onDistanceDelta) {
    if (!navigator.geolocation) {
      return { ok: false, error: '瀏覽器不支援 GPS 追蹤，可使用模擬移動測試體驗。' };
    }
    if (this.isTracking) return { ok: true };

    this.distanceCallback = onDistanceDelta;
    this.lastValidTrackFix = null;
    this.isTracking = true;
    this.emit();

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const now = pos.timestamp || Date.now();
        const acc = Number.isFinite(accuracy) ? accuracy : 30;

        this.position = {
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(acc),
          isSimulated: false,
          label: '旅行計程追蹤中',
          timestamp: now
        };

        // 精度過濾，避免室內訊號漂移灌水
        if (acc <= SITE_CONFIG.geoFilter.maxAccuracyMeters) {
          if (this.lastValidTrackFix) {
            const distM = haversineMeters(
              this.lastValidTrackFix.lat,
              this.lastValidTrackFix.lng,
              latitude,
              longitude
            );
            const dtSec = Math.max(1, (now - this.lastValidTrackFix.timestamp) / 1000);
            const speedKmh = (distM / 1000) / (dtSec / 3600);

            if (
              distM >= SITE_CONFIG.geoFilter.minStepMeters &&
              speedKmh <= SITE_CONFIG.geoFilter.maxSpeedKmh
            ) {
              const deltaKm = distM / 1000;
              this.sessionDistanceKm = Math.round((this.sessionDistanceKm + deltaKm) * 1000) / 1000;
              this.lastValidTrackFix = { lat: latitude, lng: longitude, timestamp: now };
              if (this.distanceCallback) {
                this.distanceCallback(deltaKm, { speedKmh, distM });
              }
            }
          } else {
            this.lastValidTrackFix = { lat: latitude, lng: longitude, timestamp: now };
          }
        }
        this.emit();
      },
      (err) => {
        console.warn('[TempleGo] watchPosition error:', err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 15000
      }
    );

    return { ok: true };
  }

  stopTravelTracking() {
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    this.watchId = null;
    this.isTracking = false;
    this.lastValidTrackFix = null;
    this.emit();
  }

  addSimulatedSessionKm(km) {
    this.sessionDistanceKm = Math.round((this.sessionDistanceKm + km) * 1000) / 1000;
    this.emit();
  }
}

export const geoTracker = new GeoTracker();
