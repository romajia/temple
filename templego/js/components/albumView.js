/**
 * 模組 D：台灣宮廟御朱印圖鑑與社交分享 (Goshuin Album)
 * - 日式折疊帳（蛇腹折頁感）與典雅卡片網格雙模式切換
 * - 未解鎖淡灰線稿剪影 vs 已解鎖全彩朱紅御朱印＋建築工藝徽章
 * - 點擊翻面閱讀中／英／日語建築工藝與神明故事
 * - 廟方現有結緣品兌換憑證與核銷按鈕
 * - 一鍵開啟 1080×1920 旅行祝賀分享卡合成器
 */

import { SITE_CONFIG } from '../config/siteConfig.js';
import { t, getTempleField, getSeedTypeLabel } from '../services/i18n.js';
import { renderTempleGoshuinSVG, renderCraftBadgeSVG } from './sealArt.js';

export function renderAlbumView({ state, temples, flippedIds }) {
  const unlockedMap = state.unlockedGoshuin;
  const unlockedCount = Object.keys(unlockedMap).length;
  const totalCount = temples.length;
  const completionPct = Math.round((unlockedCount / Math.max(1, totalCount)) * 100);
  const layout = state.preferences.albumLayout || 'accordion';

  // 已解鎖的排前面，方便快速回顧與展示給廟方人員
  const sortedTemples = [...temples].sort((a, b) => {
    const aUn = Boolean(unlockedMap[a.id]);
    const bUn = Boolean(unlockedMap[b.id]);
    if (aUn !== bUn) return aUn ? -1 : 1;
    return 0;
  });

  const cardsHtml = sortedTemples
    .map((temple) => {
      const record = unlockedMap[temple.id];
      const isUnlocked = Boolean(record);
      const isFlipped = isUnlocked && flippedIds.has(temple.id);
      const sDef = SITE_CONFIG.seedTypes[temple.seedType] || SITE_CONFIG.seedTypes.vermilion;
      const isRare = temple.seedType === 'purple_gold';
      const rewardText = getTempleField(temple, 'rewardItem');
      const dateStr = record?.lastStampedAt
        ? new Date(record.lastStampedAt).toLocaleDateString('zh-TW')
        : '';

      if (!isUnlocked) {
        return `
          <article class="goshuin-folio is-locked" aria-label="${getTempleField(temple, 'name')}（未解鎖）">
            <div class="folio-paper-locked">
              <div class="folio-locked-header">
                <span class="locked-pill">${t('lockedStatus')}</span>
                <span class="seed-mini-tag" style="--seed-color:${sDef.color};--seed-bg:${sDef.accentBg};">
                  ${getSeedTypeLabel(sDef, 'name')} ${sDef.targetKm}km
                </span>
              </div>
              <div class="folio-visual-pair">
                ${renderTempleGoshuinSVG(temple, false)}
                <div class="craft-corner-badge">
                  ${renderCraftBadgeSVG(temple.craftId, true)}
                  <span class="craft-badge-caption">${getTempleField(temple, 'craftName')}</span>
                </div>
              </div>
              <div class="folio-locked-footer">
                <div class="folio-meta-city">${getTempleField(temple, 'city')}${getTempleField(temple, 'district')}</div>
                <button type="button" class="btn-outline-sm" data-action="switch-tab" data-tab="explore">
                  前往雷達探索 →
                </button>
              </div>
            </div>
          </article>
        `;
      }

      const voucherSection = rewardText
        ? `
          <div class="voucher-ticket ${record.voucherRedeemedAt ? 'is-redeemed' : ''}">
            <div class="voucher-head">
              <span class="voucher-title">🎟️ ${t('voucherTitle')}</span>
              <span class="voucher-code">${record.voucherCode}</span>
            </div>
            <p class="voucher-desc">${rewardText}</p>
            ${
              record.voucherRedeemedAt
                ? `<div class="voucher-stamped">✅ ${t('voucherRedeemed')}（${new Date(record.voucherRedeemedAt).toLocaleDateString('zh-TW')}）</div>`
                : `
                  <p class="voucher-note">${t('voucherNote')}</p>
                  <button type="button" class="btn-voucher-redeem" data-action="confirm-redeem" data-temple-id="${temple.id}">
                    ${t('voucherRedeemBtn')}
                  </button>
                `
            }
          </div>
        `
        : '';

      return `
        <article class="goshuin-folio is-unlocked ${isRare ? 'is-rare' : ''} ${isFlipped ? 'is-flipped' : ''}">
          <div class="folio-flip-inner">
            <!-- 正面：朱紅御朱印章 ＋ 建築工藝飾品徽章 -->
            <div class="folio-face folio-front">
              <div class="folio-front-top">
                <span class="unlocked-pill ${isRare ? 'is-rare' : ''}">
                  ${isRare ? '👑 紫金珍藏' : '🏮 ' + t('unlockedStatus')}
                </span>
                <span class="stamp-date">${dateStr}</span>
              </div>

              <button type="button" class="folio-tap-area" data-action="flip-folio" data-temple-id="${temple.id}" aria-label="${t('flipHint')}">
                <div class="folio-visual-pair">
                  ${renderTempleGoshuinSVG(temple, true)}
                  <div class="craft-corner-badge">
                    ${renderCraftBadgeSVG(temple.craftId, false)}
                    <span class="craft-badge-caption">${getTempleField(temple, 'craftName')}</span>
                  </div>
                </div>
                <div class="flip-hint-bar">🔄 ${t('flipHint')}</div>
              </button>

              <div class="folio-front-actions">
                <button type="button" class="btn-vermilion-sm btn-full" data-action="open-share-card" data-temple-id="${temple.id}">
                  ${t('btnMakeShareCard')}
                </button>
                ${
                  rewardText && !record.voucherRedeemedAt
                    ? `<button type="button" class="btn-gold-sm" data-action="flip-folio" data-temple-id="${temple.id}">🎟️ 查看結緣券</button>`
                    : ''
                }
              </div>
            </div>

            <!-- 背面：建築工藝看點 ＋ 神明故事 ＋ 廟方結緣品兌換憑證 -->
            <div class="folio-face folio-back">
              <div class="folio-back-header">
                <div>
                  <h3 class="back-temple-title">${getTempleField(temple, 'name')}</h3>
                  <p class="back-temple-sub">${getTempleField(temple, 'city')}${getTempleField(temple, 'district')} ・ ${getTempleField(temple, 'deity')}</p>
                </div>
                <button type="button" class="btn-outline-sm" data-action="flip-folio" data-temple-id="${temple.id}">
                  ↩ ${t('flipBack')}
                </button>
              </div>

              <div class="back-story-scroll">
                <div class="story-block">
                  <h4>🏛️ ${t('craftHeading')}：${getTempleField(temple, 'craftName')}</h4>
                  <p>${getTempleField(temple, 'craftStory')}</p>
                </div>
                <div class="story-block">
                  <h4>🏮 ${t('storyHeading')}</h4>
                  <p>${getTempleField(temple, 'story')}</p>
                </div>
                ${voucherSection}
              </div>

              <div class="folio-back-footer">
                <button type="button" class="btn-vermilion-sm btn-full" data-action="open-share-card" data-temple-id="${temple.id}">
                  ${t('btnMakeShareCard')}
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  return `
    <section class="view-section album-view" aria-label="台灣宮廟御朱印圖鑑">
      <div class="washi-card album-header-card">
        <div class="section-card-head">
          <div>
            <h2 class="section-heading">
              <span class="heading-seal-mark">印</span>
              ${t('albumTitle')}
            </h2>
            <p class="section-subcopy">${t('albumSubtitle')}</p>
          </div>
          <div class="album-layout-toggle" role="group" aria-label="圖鑑排列方式">
            <button type="button" class="layout-btn ${layout === 'accordion' ? 'is-active' : ''}" data-action="set-album-layout" data-layout="accordion">
              📜 ${t('viewAccordion')}
            </button>
            <button type="button" class="layout-btn ${layout === 'grid' ? 'is-active' : ''}" data-action="set-album-layout" data-layout="grid">
              ⊞ ${t('viewGrid')}
            </button>
          </div>
        </div>

        <div class="album-progress-wrap">
          <div class="album-progress-info">
            <span>完走收集進度：<strong>${unlockedCount} / ${totalCount} 枚</strong>（${completionPct}%）</span>
            ${
              unlockedCount >= totalCount
                ? '<span class="gold-medal-pill">🏅 全臺圓滿完走勳章</span>'
                : unlockedCount >= 3
                  ? '<span class="gold-medal-pill">✨ 進香達人徽章</span>'
                  : ''
            }
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width:${completionPct}%"></div>
          </div>
        </div>
      </div>

      <div class="goshuin-collection layout-${layout}">
        ${cardsHtml}
      </div>
    </section>
  `;
}
