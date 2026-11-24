/**
 * 儀式彈窗與互動視窗集合：
 * 1. 御朱印開花顯化（蓋章動畫）彈窗
 * 2. 1080×1920 旅行祝賀分享卡預覽與分享彈窗
 * 3. QR Code 掃碼打卡備案彈窗（支援鏡頭掃描、手動代碼、與一鍵模擬宮廟 QR 卡）
 * 4. ☕ 請設計師喝杯咖啡贊助彈窗
 * 5. 🏮 宮廟申請加入計畫 B2B 彈窗
 * 6. 結緣品核銷二次確認彈窗
 */

import { SITE_CONFIG } from '../config/siteConfig.js';
import { t, getTempleField } from '../services/i18n.js';
import { renderTempleGoshuinSVG, renderCraftBadgeSVG, renderStyledQrSVG } from './sealArt.js';
import { BLESSING_PRESETS } from '../services/shareCardCanvas.js';

export function renderHatchRevealModal(temple) {
  return `
    <div class="modal-backdrop" data-action="close-backdrop">
      <div class="modal-panel hatch-modal-panel" role="dialog" aria-modal="true" aria-labelledby="hatch-title">
        <div class="hatch-glow-burst" aria-hidden="true"></div>
        <div class="hatch-scroll-label">✨ 香火圓滿・御朱印顯化 ✨</div>
        <h2 id="hatch-title" class="hatch-temple-name">${getTempleField(temple, 'name')}</h2>
        <p class="hatch-blessing">${getTempleField(temple, 'blessing')}</p>

        <div class="stamp-stage">
          <div class="stamp-slam-wrapper">
            ${renderTempleGoshuinSVG(temple, true)}
          </div>
          <div class="hatch-craft-reveal">
            ${renderCraftBadgeSVG(temple.craftId, false)}
            <div>
              <div class="craft-unlock-tag">獲得建築工藝徽章</div>
              <strong>${getTempleField(temple, 'craftName')}</strong>
            </div>
          </div>
        </div>

        ${
          temple.rewardItem
            ? `<div class="hatch-voucher-banner">🎟️ 已解鎖廟方結緣品兌換憑證：${getTempleField(temple, 'rewardItem')}</div>`
            : ''
        }

        <div class="modal-btn-stack">
          <button type="button" class="btn-vermilion btn-full" data-action="open-share-card" data-temple-id="${temple.id}">
            ${t('btnMakeShareCard')}
          </button>
          <button type="button" class="btn-ink-outline btn-full" data-action="go-album-from-modal">
            📖 收納並查看御朱印冊
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderShareCardModal({ temple, dataUrl, selectedBlessingId }) {
  const presetBtns = BLESSING_PRESETS.map((p) => {
    const label = p.id === 'temple' ? `本廟祝福（${temple.blessing}）` : p.label;
    return `
      <button type="button" class="blessing-chip ${selectedBlessingId === p.id ? 'is-active' : ''}"
        data-action="select-share-blessing" data-temple-id="${temple.id}" data-blessing-id="${p.id}">
        ${label}
      </button>
    `;
  }).join('');

  return `
    <div class="modal-backdrop" data-action="close-backdrop">
      <div class="modal-panel share-modal-panel" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <div class="modal-head">
          <h2 id="share-title" class="modal-title">🖼️ 旅行祝賀分享卡（1080×1920）</h2>
          <button type="button" class="modal-close-btn" data-action="close-modal" aria-label="${t('btnClose')}">✕</button>
        </div>

        <p class="modal-desc">專為 LINE 親友問候與 Instagram 限時動態設計的直式御朱印祝賀圖：</p>

        <div class="blessing-chip-row">
          ${presetBtns}
        </div>

        <div class="share-preview-frame">
          ${
            dataUrl
              ? `<img src="${dataUrl}" alt="${temple.name} 旅行祝賀分享卡" class="share-preview-img" />`
              : `<div class="share-loading">🏮 正在揮毫合成 1080×1920 和紙祝賀圖…</div>`
          }
        </div>

        <div class="modal-btn-row">
          <button type="button" id="btn-download-share-card" class="btn-ink-outline" data-action="download-share-card" ${!dataUrl ? 'disabled' : ''}>
            ${t('btnDownloadCard')}
          </button>
          <button type="button" id="btn-native-share-card" class="btn-vermilion" data-action="native-share-card" ${!dataUrl ? 'disabled' : ''}>
            ${t('btnWebShare')}
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderQrScannerModal(temples) {
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const quickCards = temples
    .slice(0, 6)
    .map(
      (tpl) => `
      <button type="button" class="qr-demo-card" data-action="qr-direct-checkin" data-temple-id="${tpl.id}">
        <div class="qr-demo-thumb">${renderStyledQrSVG(tpl.id)}</div>
        <div class="qr-demo-meta">
          <strong>${tpl.name}</strong>
          <span>?temple_id=${tpl.id}</span>
        </div>
      </button>
    `
    )
    .join('');

  return `
    <div class="modal-backdrop" data-action="close-backdrop">
      <div class="modal-panel qr-modal-panel" role="dialog" aria-modal="true" aria-labelledby="qr-title">
        <div class="modal-head">
          <h2 id="qr-title" class="modal-title">📷 掃描宮廟 QR Code 備案打卡</h2>
          <button type="button" class="modal-close-btn" data-action="close-modal" aria-label="${t('btnClose')}">✕</button>
        </div>
        <p class="modal-desc">解決室內 GPS 飄移或未開啟定位權限的問題：直接掃描廟方立牌 QR Code（含 <code>?temple_id=xxx</code>），或輸入宮廟代碼即可請香火苗。</p>

        <div class="qr-camera-box">
          <video id="qr-camera-video" class="qr-video hidden" playsinline muted></video>
          <div id="qr-camera-status" class="qr-camera-placeholder">
            <p>📱 點擊下方按鈕開啟手機相機掃描廟宇 QR Code</p>
            <button type="button" class="btn-vermilion-sm" data-action="start-camera-scan">開啟鏡頭掃描</button>
          </div>
        </div>

        <form class="qr-manual-form" data-action="submit-qr-code">
          <label for="qr-code-input" class="form-label">或手動輸入宮廟代碼 / 網址（例如 <code>shoutian</code> 或 <code>deci</code>）：</label>
          <div class="qr-input-row">
            <input id="qr-code-input" name="code" type="text" class="washi-input" placeholder="輸入代碼如 shoutian、deci、zinan..." required />
            <button type="submit" class="btn-vermilion-sm">確認打卡</button>
          </div>
        </form>

        <div class="qr-demo-section">
          <div class="qr-demo-heading">🧪 測試用宮廟立牌 QR（點擊模擬掃碼直達打卡）</div>
          <p class="qr-url-tip">實際部署網址格式：<code>${baseUrl}?temple_id=shoutian</code></p>
          <div class="qr-demo-grid">
            ${quickCards}
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderCoffeeSponsorModal() {
  const { sponsor } = SITE_CONFIG;
  const qrVisual = sponsor.qrImageUrl
    ? `<img src="${sponsor.qrImageUrl}" alt="${sponsor.qrLabel}" class="sponsor-qr-img" />`
    : renderStyledQrSVG('COFFEE_SPONSOR_TW');

  return `
    <div class="modal-backdrop" data-action="close-backdrop">
      <div class="modal-panel sponsor-modal-panel" role="dialog" aria-modal="true" aria-labelledby="coffee-title">
        <div class="modal-head">
          <h2 id="coffee-title" class="modal-title">☕ 請設計師喝杯咖啡</h2>
          <button type="button" class="modal-close-btn" data-action="close-modal" aria-label="${t('btnClose')}">✕</button>
        </div>

        <p class="modal-desc">${sponsor.message}</p>

        <div class="sponsor-qr-box">
          <div class="sponsor-qr-frame">
            ${qrVisual}
          </div>
          <div class="sponsor-qr-label">${sponsor.qrLabel}</div>
          <p class="sponsor-qr-note">${sponsor.qrAccountNote}</p>
        </div>

        <div class="modal-btn-stack">
          <a href="${sponsor.buyMeACoffeeUrl}" target="_blank" rel="noopener noreferrer" class="btn-vermilion btn-full">
            ☕ Buy Me a Coffee 贊助支持
          </a>
          <a href="${sponsor.portalyUrl}" target="_blank" rel="noopener noreferrer" class="btn-ink-outline btn-full">
            🧡 前往 Portaly 贊助頁
          </a>
        </div>
      </div>
    </div>
  `;
}

export function renderPartnerB2BModal() {
  const { partnerB2B } = SITE_CONFIG;
  const benefitItems = partnerB2B.benefits.map((b) => `<li>✨ ${b}</li>`).join('');

  return `
    <div class="modal-backdrop" data-action="close-backdrop">
      <div class="modal-panel partner-modal-panel" role="dialog" aria-modal="true" aria-labelledby="partner-title">
        <div class="modal-head">
          <h2 id="partner-title" class="modal-title">🏮 宮廟申請加入計畫</h2>
          <button type="button" class="modal-close-btn" data-action="close-modal" aria-label="${t('btnClose')}">✕</button>
        </div>

        <p class="modal-desc">誠摯邀請全臺宮廟管委會與文化團隊免費加入《御朱燈影》合作計畫，讓年輕旅人與健走香客帶著手機走進廟埕參拜結緣！</p>

        <ul class="partner-benefits-list">
          ${benefitItems}
        </ul>

        <div class="partner-line-box">
          <a href="${partnerB2B.lineOfficialUrl}" target="_blank" rel="noopener noreferrer" class="btn-line-oa btn-full">
            💬 一鍵加設計師 LINE 洽談合作
          </a>
        </div>

        <form class="partner-inquiry-form" data-action="submit-partner-form">
          <h3 class="form-section-title">或線上填寫宮廟聯絡資料</h3>
          <div class="form-grid">
            <label class="form-field">
              <span>宮廟名稱 *</span>
              <input name="templeName" type="text" class="washi-input" placeholder="例如：臺南安定德慈宮" required />
            </label>
            <label class="form-field">
              <span>所在縣市 *</span>
              <input name="city" type="text" class="washi-input" placeholder="例如：臺南市安定區" required />
            </label>
            <label class="form-field">
              <span>聯絡人稱呼與電話 / LINE *</span>
              <input name="contact" type="text" class="washi-input" placeholder="王總幹事 0912-345-678" required />
            </label>
            <label class="form-field">
              <span>預計提供之現有結緣品（選填）</span>
              <input name="reward" type="text" class="washi-input" placeholder="例如：加持平安水、平安符、發財金" />
            </label>
          </div>
          <button type="submit" class="btn-vermilion btn-full">📨 送出加入申請（複製並通知設計師）</button>
        </form>
      </div>
    </div>
  `;
}

export function renderRedeemConfirmModal(temple, record) {
  return `
    <div class="modal-backdrop" data-action="close-backdrop">
      <div class="modal-panel redeem-modal-panel" role="dialog" aria-modal="true" aria-labelledby="redeem-title">
        <div class="modal-head">
          <h2 id="redeem-title" class="modal-title">🎟️ 廟方結緣品核銷確認</h2>
          <button type="button" class="modal-close-btn" data-action="close-modal" aria-label="${t('btnClose')}">✕</button>
        </div>

        <div class="redeem-summary-box">
          <div class="redeem-temple">${getTempleField(temple, 'name')}</div>
          <div class="redeem-code">憑證序號：<strong>${record.voucherCode}</strong></div>
          <p class="redeem-gift">🎁 ${getTempleField(temple, 'rewardItem')}</p>
        </div>

        <p class="redeem-warning">⚠️ 請交由<strong>廟方服務人員</strong>確認後再點擊核銷，核銷完成後此券將蓋上「已完成結緣核銷」印記。</p>

        <div class="modal-btn-row">
          <button type="button" class="btn-ink-outline" data-action="close-modal">暫不核銷</button>
          <button type="button" class="btn-vermilion" data-action="execute-redeem" data-temple-id="${temple.id}">
            ✅ 確認核銷兌換
          </button>
        </div>
      </div>
    </div>
  `;
}
