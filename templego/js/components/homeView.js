/**
 * 模組 A & C：首頁大廳 (Home Dashboard) + 當前香火苗培育與 GPS 距離累加控制
 */

import { SITE_CONFIG } from '../config/siteConfig.js';
import { t, getTempleField, getSeedTypeLabel } from '../services/i18n.js';
import { getActiveSeed } from '../services/storage.js';
import { renderHeroMainSealSVG, renderIncenseSeedSVG } from './sealArt.js';

export function renderHomeView({ state, temples, geoSnapshot }) {
  const activeSeed = getActiveSeed();
  const unlockedEntries = Object.values(state.unlockedGoshuin);
  const collectedCount = unlockedEntries.length;
  const activeVouchersCount = unlockedEntries.filter(
    (entry) => entry.hasReward && !entry.voucherRedeemedAt
  ).length;

  const activeTemple = activeSeed
    ? temples.find((tpl) => tpl.id === activeSeed.templeId)
    : null;
  const activeSeedDef = activeSeed
    ? SITE_CONFIG.seedTypes[activeSeed.seedType] || SITE_CONFIG.seedTypes.vermilion
    : null;

  const progressRatio = activeSeed
    ? Math.min(1, activeSeed.currentDistance / activeSeed.targetDistance)
    : 0;
  const progressPct = Math.round(progressRatio * 100);
  const isReadyToHatch = activeSeed && activeSeed.currentDistance >= activeSeed.targetDistance;

  // 香囊待育清單
  const otherSeeds = state.seeds.filter((s) => !activeSeed || s.uid !== activeSeed.uid);

  const incubatorHtml = activeSeed && activeTemple
    ? `
      <div class="incubator-body ${isReadyToHatch ? 'is-ready' : ''}">
        <div class="incubator-visual">
          ${renderIncenseSeedSVG(activeSeed.seedType, progressRatio)}
          <span class="seed-type-pill" style="--seed-color:${activeSeedDef.color};--seed-bg:${activeSeedDef.accentBg};">
            ${getSeedTypeLabel(activeSeedDef, 'name')}
          </span>
        </div>

        <div class="incubator-info">
          <div class="incubator-origin">
            <span class="origin-tag">${getTempleField(activeTemple, 'city')}</span>
            <h3 class="origin-name">${getTempleField(activeTemple, 'name')}</h3>
          </div>
          <p class="origin-deity">${t('deityLabel')}：${getTempleField(activeTemple, 'deity')}</p>

          <div class="progress-block">
            <div class="progress-meta">
              <span>${t('progressLabel')} <strong>${activeSeed.currentDistance.toFixed(2)} / ${activeSeed.targetDistance.toFixed(1)} km</strong></span>
              <span class="progress-pct">${progressPct}%</span>
            </div>
            <div class="progress-track" role="progressbar" aria-valuenow="${progressPct}" aria-valuemin="0" aria-valuemax="100">
              <div class="progress-fill ${isReadyToHatch ? 'is-full' : ''}" style="width:${progressPct}%"></div>
            </div>
          </div>

          ${
            isReadyToHatch
              ? `
                <button type="button" id="btn-hatch-goshuin" class="btn-vermilion btn-hatch-pulse" data-action="hatch-seed" data-uid="${activeSeed.uid}">
                  ${t('btnHatchReady')}
                </button>
              `
              : `
                <button type="button" id="btn-toggle-tracking" class="btn-track ${geoSnapshot.isTracking ? 'is-tracking' : ''}" data-action="toggle-tracking">
                  <span class="track-dot ${geoSnapshot.isTracking ? 'is-live' : ''}"></span>
                  <span>${geoSnapshot.isTracking ? t('btnStopTrack') : t('btnStartTrack')}</span>
                </button>
              `
          }
        </div>
      </div>

      ${
        geoSnapshot.isTracking
          ? `
            <div class="tracking-telemetry" role="status" aria-live="polite">
              <span>📡 GPS 追蹤中（精度約 ${geoSnapshot.position.accuracy}m）</span>
              <span>本次行程 <strong>+${geoSnapshot.sessionDistanceKm.toFixed(2)} km</strong></span>
            </div>
          `
          : `<p class="gps-helper-note">🧭 ${t('gpsHint')}</p>`
      }

      <!-- 開發／驗收模擬測試列（可一鍵驗證步行、跨縣市旅行與開花顯化） -->
      <details class="qa-drawer">
        <summary class="qa-summary">🧪 ${t('qaToggle')}</summary>
        <div class="qa-actions">
          <button type="button" class="btn-qa" data-action="sim-distance" data-km="0.6">${t('qaWalk')}</button>
          <button type="button" class="btn-qa" data-action="sim-distance" data-km="1.8">${t('qaTrip')}</button>
          <button type="button" class="btn-qa btn-qa-gold" data-action="sim-fill-seed">${t('qaFill')}</button>
        </div>
      </details>
    `
    : `
      <div class="incubator-empty">
        <div class="empty-icon">🌱</div>
        <h3>${t('incubatorEmptyTitle')}</h3>
        <p>${t('incubatorEmptyDesc')}</p>
        <button type="button" class="btn-vermilion" data-action="switch-tab" data-tab="explore">
          🏮 ${t('btnGoExplore')}
        </button>
      </div>
    `;

  const queueHtml =
    otherSeeds.length > 0
      ? `
        <div class="seed-queue-section">
          <h4 class="seed-queue-title">${t('seedQueueTitle')}（${state.seeds.length} / ${SITE_CONFIG.maxSeedSlots}）</h4>
          <div class="seed-queue-list">
            ${otherSeeds
              .map((seed) => {
                const tpl = temples.find((x) => x.id === seed.templeId);
                const sDef = SITE_CONFIG.seedTypes[seed.seedType] || SITE_CONFIG.seedTypes.vermilion;
                const pct = Math.min(100, Math.round((seed.currentDistance / seed.targetDistance) * 100));
                const ready = seed.currentDistance >= seed.targetDistance;
                return `
                  <div class="seed-queue-item">
                    <div class="queue-item-left">
                      <span class="queue-dot" style="background:${sDef.color}"></span>
                      <div>
                        <div class="queue-temple">${tpl ? getTempleField(tpl, 'name') : seed.templeId}</div>
                        <div class="queue-meta">${getSeedTypeLabel(sDef, 'name')}・${seed.currentDistance.toFixed(1)} / ${seed.targetDistance.toFixed(1)} km (${pct}%)</div>
                      </div>
                    </div>
                    <button type="button" class="btn-outline-sm" data-action="${ready ? 'hatch-seed' : 'activate-seed'}" data-uid="${seed.uid}">
                      ${ready ? t('badgeReady') : t('btnSwitchActive')}
                    </button>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      `
      : '';

  return `
    <section class="view-section home-view" aria-label="首頁大廳">
      <!-- 受天宮留白朱印美學首屏 -->
      <div class="washi-card hero-goshuin-card">
        <div class="hero-seal-layout">
          <div class="hero-seal-emblem">
            ${renderHeroMainSealSVG()}
          </div>
          <div class="hero-copy-block">
            <span class="hero-eyebrow">${t('heroBadge')}</span>
            <h1 class="hero-main-title">${t('appTitle')}<span class="hero-sub-colon">：</span><br class="sm-break"/>${t('appSubtitle')}</h1>
            <p class="hero-desc">${t('heroDesc')}</p>
            <div class="hero-quick-actions">
              <button type="button" id="btn-hero-radar" class="btn-vermilion" data-action="switch-tab" data-tab="explore">
                🧭 ${t('navExplore')}
              </button>
              <button type="button" id="btn-hero-album" class="btn-ink-outline" data-action="switch-tab" data-tab="album">
                📖 ${t('navAlbum')}（${collectedCount}/${temples.length}）
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 個人旅行儀表板 -->
      <div class="stats-strip" role="region" aria-label="個人旅行數據">
        <div class="stat-tile">
          <div class="stat-label">${t('statTotalKm')}</div>
          <div class="stat-value">
            <span class="stat-num">${state.totalDistanceKm.toFixed(2)}</span>
            <span class="stat-unit">${t('unitKm')}</span>
          </div>
        </div>
        <div class="stat-tile">
          <div class="stat-label">${t('statCollected')}</div>
          <div class="stat-value">
            <span class="stat-num stat-vermilion">${collectedCount}</span>
            <span class="stat-unit">/ ${temples.length} ${t('unitSeals')}</span>
          </div>
        </div>
        <div class="stat-tile">
          <div class="stat-label">${t('statPartnerCheckins')}</div>
          <div class="stat-value">
            <span class="stat-num stat-gold">${activeVouchersCount}</span>
            <span class="stat-unit">張可兌換</span>
          </div>
        </div>
      </div>

      <!-- 當前培育中香火苗進度卡 -->
      <div class="washi-card incubator-card">
        <div class="section-card-head">
          <h2 class="section-heading">
            <span class="heading-seal-mark">苗</span>
            ${t('incubatorTitle')}
          </h2>
          <span class="slot-counter">香囊 ${state.seeds.length}/${SITE_CONFIG.maxSeedSlots}</span>
        </div>
        ${incubatorHtml}
        ${queueHtml}
      </div>

      <!-- 固定底部雙向導流區（咖啡贊助 ＋ 宮廟 B2B 合作加入） -->
      <div class="washi-card dual-cta-card" role="region" aria-label="贊助與宮廟合作入口">
        <div class="dual-cta-grid">
          <button type="button" id="btn-open-coffee" class="cta-coffee-btn" data-action="open-coffee">
            <span class="cta-main">${t('footerCoffee')}</span>
            <span class="cta-sub">LINE Pay / 街口支付 / 贊助支持</span>
          </button>
          <button type="button" id="btn-open-partner" class="cta-partner-btn" data-action="open-partner">
            <span class="cta-main">${t('footerPartner')}</span>
            <span class="cta-sub">免費專屬御朱印 × 香客結緣導流</span>
          </button>
        </div>
      </div>
    </section>
  `;
}
