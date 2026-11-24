/**
 * 模組 B：探索打卡與「請香火苗」播種系統 (Explore & Seeding)
 * - Haversine 距離排序宮廟雷達
 * - 雙軌打卡：GPS <= 100 公尺自動解鎖（附模擬抵達測試鈕）＋ QR Code 掃碼備案 (?temple_id=xxx)
 * - 四種靈韻香火苗（金 2km / 朱紅 3km / 青玉 5km / 紫金 10km）
 */

import { SITE_CONFIG } from '../config/siteConfig.js';
import { t, getTempleField, getSeedTypeLabel } from '../services/i18n.js';
import { haversineMeters, formatDistance } from '../services/geoTracker.js';
import { renderCraftBadgeSVG } from './sealArt.js';

export function renderExploreView({ state, temples, geoSnapshot, activeFilter }) {
  const userLat = geoSnapshot.position.lat;
  const userLng = geoSnapshot.position.lng;

  // 以 Haversine 計算並由近到遠排序
  const enriched = temples
    .map((temple) => {
      const distanceM = haversineMeters(userLat, userLng, temple.lat, temple.lng);
      return { ...temple, distanceM };
    })
    .sort((a, b) => a.distanceM - b.distanceM);

  const filtered = enriched.filter((tpl) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'partner') return Boolean(tpl.isPartner);
    return tpl.seedType === activeFilter;
  });

  const plantedIds = new Set(state.seeds.map((s) => s.templeId));
  const unlockedIds = new Set(Object.keys(state.unlockedGoshuin));

  // 四種香火苗圖例與篩選列
  const seedLegendHtml = Object.values(SITE_CONFIG.seedTypes)
    .map((sDef) => {
      const active = activeFilter === sDef.id;
      return `
        <button type="button" class="seed-legend-chip ${active ? 'is-active' : ''}"
          style="--seed-color:${sDef.color};--seed-bg:${sDef.accentBg};"
          data-action="set-explore-filter" data-filter="${sDef.id}">
          <span class="seed-dot" style="background:${sDef.color}"></span>
          <span class="seed-chip-text">
            <strong>${getSeedTypeLabel(sDef, 'name')}</strong>
            <small>${sDef.targetKm.toFixed(1)} km・${getSeedTypeLabel(sDef, 'theme')}</small>
          </span>
        </button>
      `;
    })
    .join('');

  const demoLocOptions = SITE_CONFIG.demoLocations
    .map((loc) => `<option value="${loc.id}" ${geoSnapshot.position.label === loc.label ? 'selected' : ''}>${loc.label}</option>`)
    .join('');

  const listHtml = filtered
    .map((temple) => {
      const sDef = SITE_CONFIG.seedTypes[temple.seedType] || SITE_CONFIG.seedTypes.vermilion;
      const inRange = temple.distanceM <= SITE_CONFIG.checkInRadiusMeters;
      const alreadyPlanted = plantedIds.has(temple.id);
      const isCollected = unlockedIds.has(temple.id);
      const rewardText = getTempleField(temple, 'rewardItem');

      return `
        <article class="washi-card temple-radar-card ${inRange ? 'is-in-range' : ''}">
          <div class="radar-card-top">
            <div class="radar-craft-thumb">
              ${renderCraftBadgeSVG(temple.craftId, false)}
            </div>
            <div class="radar-main-meta">
              <div class="radar-badges-row">
                <span class="dist-badge ${inRange ? 'is-near' : ''}">📍 ${formatDistance(temple.distanceM)}</span>
                <span class="seed-mini-tag" style="--seed-color:${sDef.color};--seed-bg:${sDef.accentBg};">
                  ${getSeedTypeLabel(sDef, 'name')} (${sDef.targetKm}km)
                </span>
                ${temple.isPartner ? `<span class="partner-badge">🏮 ${t('partnerTag')}</span>` : ''}
                ${isCollected ? `<span class="collected-mini-badge">✓ 已收錄</span>` : ''}
              </div>
              <h3 class="radar-temple-name">${getTempleField(temple, 'name')}</h3>
              <p class="radar-temple-loc">${getTempleField(temple, 'city')}${getTempleField(temple, 'district')} ・ ${t('deityLabel')}：${getTempleField(temple, 'deity')}</p>
            </div>
          </div>

          <p class="radar-story-snippet">${getTempleField(temple, 'story')}</p>

          ${
            rewardText
              ? `<div class="radar-reward-strip">🎁 <strong>${t('rewardLabel')}：</strong>${rewardText}</div>`
              : ''
          }

          <div class="radar-checkin-zone">
            ${
              alreadyPlanted
                ? `<div class="checkin-done-banner">🌱 ${t('btnAlreadyPlanted')}（請至大廳累積距離孵化）</div>`
                : inRange
                  ? `
                    <div class="range-status is-unlocked">✨ ${t('radiusUnlocked')}</div>
                    <button type="button" class="btn-vermilion btn-full" data-action="checkin-temple" data-temple-id="${temple.id}" data-method="gps">
                      ${t('btnCheckIn')}
                    </button>
                  `
                  : `
                    <div class="range-status is-locked">🔒 ${t('radiusLocked')} ${formatDistance(temple.distanceM)}（需 100 公尺內）</div>
                    <div class="dual-checkin-actions">
                      <button type="button" class="btn-sim-arrive" data-action="simulate-arrive" data-temple-id="${temple.id}">
                        ${t('btnSimArrive')}
                      </button>
                      <button type="button" class="btn-qr-inline" data-action="qr-direct-checkin" data-temple-id="${temple.id}">
                        📷 QR 掃碼備案
                      </button>
                    </div>
                  `
            }
            ${
              temple.externalUrl
                ? `<a href="${temple.externalUrl}" class="external-3d-link">${t('visit3D')} →</a>`
                : ''
            }
          </div>
        </article>
      `;
    })
    .join('');

  return `
    <section class="view-section explore-view" aria-label="探索宮廟雷達">
      <div class="washi-card radar-header-card">
        <div class="section-card-head">
          <div>
            <h2 class="section-heading">
              <span class="heading-seal-mark">探</span>
              ${t('exploreTitle')}
            </h2>
            <p class="section-subcopy">${t('exploreSubtitle')}</p>
          </div>
        </div>

        <div class="gps-status-bar">
          <div class="gps-coord-pill">
            <span>${geoSnapshot.position.isSimulated ? '🧭 參考位置：' : '📡 即時定位：'}</span>
            <strong>${geoSnapshot.position.label}</strong>
          </div>
          <div class="radar-primary-btns">
            <button type="button" id="btn-locate-gps" class="btn-vermilion-sm" data-action="request-gps">
              ${t('btnLocate')}
            </button>
            <button type="button" id="btn-open-qr" class="btn-ink-outline-sm" data-action="open-qr-modal">
              ${t('btnScanQr')}
            </button>
          </div>
        </div>

        <div class="demo-loc-row">
          <label for="demo-loc-select" class="demo-loc-label">${t('demoLocLabel')}</label>
          <select id="demo-loc-select" class="demo-loc-select" data-action="select-demo-loc">
            ${demoLocOptions}
          </select>
        </div>

        <!-- 四種香火苗屬性篩選 -->
        <div class="filter-bar">
          <button type="button" class="filter-pill ${activeFilter === 'all' ? 'is-active' : ''}" data-action="set-explore-filter" data-filter="all">
            ${t('filterAll')} (${temples.length})
          </button>
          <button type="button" class="filter-pill ${activeFilter === 'partner' ? 'is-active' : ''}" data-action="set-explore-filter" data-filter="partner">
            🏮 ${t('filterPartner')}
          </button>
        </div>

        <div class="seed-legend-grid" aria-label="四種靈韻香火苗說明">
          ${seedLegendHtml}
        </div>
      </div>

      <div class="temple-radar-list">
        ${listHtml}
      </div>
    </section>
  `;
}
