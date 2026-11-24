/**
 * 《御朱燈影：跟著宮廟去旅行》主應用控制器
 */

import { SITE_CONFIG } from './config/siteConfig.js';
import { setLanguage, t, getTempleField } from './services/i18n.js';
import {
  getState,
  subscribeState,
  updatePreference,
  getActiveSeed,
  setActiveSeed,
  plantSeedFromTemple,
  addTravelDistance,
  hatchSeed,
  redeemVoucher
} from './services/storage.js';
import { geoTracker, extractTempleIdFromUrl } from './services/geoTracker.js';
import { soundFX } from './services/soundFX.js';
import { recordTempleAnalyticsEvent } from './services/cloudAdapter.js';
import {
  BLESSING_PRESETS,
  generateShareCard,
  downloadShareCard,
  shareCardViaWebShare
} from './services/shareCardCanvas.js';
import { getSharedSvgDefs } from './components/sealArt.js';
import { renderLanternHeader } from './components/lanternHeader.js';
import { renderHomeView } from './components/homeView.js';
import { renderExploreView } from './components/exploreView.js';
import { renderAlbumView } from './components/albumView.js';
import {
  renderHatchRevealModal,
  renderShareCardModal,
  renderQrScannerModal,
  renderCoffeeSponsorModal,
  renderPartnerB2BModal,
  renderRedeemConfirmModal
} from './components/modals.js';

class TempleGoApp {
  constructor() {
    this.temples = [];
    this.activeTab = 'home'; // 'home' | 'explore' | 'album'
    this.exploreFilter = 'all';
    this.flippedFolios = new Set();
    this.activeModal = null; // { type, payload }
    this.shareCardCache = null; // { temple, dataUrl, blob, blessingText, selectedBlessingId }
    this.cameraStream = null;
    this.cameraScanTimer = null;

    this.rootEl = document.getElementById('app-root');
    this.modalEl = document.getElementById('modal-root');
    this.toastEl = document.getElementById('toast-root');
  }

  async init() {
    // 注入共用 SVG 印泥濾鏡與漸層定義
    const defsHost = document.getElementById('svg-defs-host');
    if (defsHost) defsHost.innerHTML = getSharedSvgDefs();

    // 套用儲存的偏好設定
    const state = getState();
    this.applyDocumentPreferences(state.preferences);

    // 載入獨立抽離的 temples.json
    try {
      const resp = await fetch('./data/temples.json');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      this.temples = await resp.json();
    } catch (err) {
      console.error('[TempleGo] Failed to load temples.json:', err);
      this.showToast('無法載入宮廟資料檔 temples.json，請確認透過伺服器開啟網頁。', 'error');
      return;
    }

    // 訂閱狀態與 GPS 更新
    subscribeState((nextState) => {
      this.applyDocumentPreferences(nextState.preferences);
      this.render();
    });
    geoTracker.subscribe(() => {
      this.render();
    });

    // 綁定全域事件委派
    this.bindEvents();
    this.render();

    // 檢查網址是否有 QR Code 打卡參數 (?temple_id=xxx)
    const qrTempleId = extractTempleIdFromUrl(window.location.search);
    if (qrTempleId) {
      this.handleTempleCheckIn(qrTempleId, 'qr_url');
      // 清除網址參數避免重整重複觸發
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    // 註冊 PWA Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  applyDocumentPreferences(prefs) {
    setLanguage(prefs.lang || 'zh-TW');
    soundFX.setEnabled(prefs.soundEnabled !== false);
    document.documentElement.classList.toggle('theme-night', prefs.theme === 'night');
    document.documentElement.classList.toggle('font-large', Boolean(prefs.largeFont));
  }

  render() {
    if (!this.rootEl) return;
    const state = getState();
    const geoSnapshot = geoTracker.getSnapshot();
    const collectedCount = Object.keys(state.unlockedGoshuin).length;
    const activeSeed = getActiveSeed();
    const hasReadySeed = state.seeds.some((s) => s.currentDistance >= s.targetDistance);

    let mainContent = '';
    if (this.activeTab === 'home') {
      mainContent = renderHomeView({ state, temples: this.temples, geoSnapshot });
    } else if (this.activeTab === 'explore') {
      mainContent = renderExploreView({
        state,
        temples: this.temples,
        geoSnapshot,
        activeFilter: this.exploreFilter
      });
    } else {
      mainContent = renderAlbumView({
        state,
        temples: this.temples,
        flippedIds: this.flippedFolios
      });
    }

    this.rootEl.innerHTML = `
      ${renderLanternHeader(state)}

      <main class="app-main" id="main-content">
        ${mainContent}
      </main>

      <!-- 底部固定導覽列（桌機置中膠囊／手機原生感大按鈕） -->
      <nav class="bottom-nav" role="navigation" aria-label="主導覽選單">
        <button type="button" id="nav-tab-home" class="nav-tab ${this.activeTab === 'home' ? 'is-active' : ''}" data-action="switch-tab" data-tab="home">
          <span class="nav-icon">🏮${hasReadySeed ? '<i class="nav-alert-dot"></i>' : ''}</span>
          <span class="nav-label">${t('navHome')}</span>
        </button>
        <button type="button" id="nav-tab-explore" class="nav-tab ${this.activeTab === 'explore' ? 'is-active' : ''}" data-action="switch-tab" data-tab="explore">
          <span class="nav-icon">🧭</span>
          <span class="nav-label">${t('navExplore')}</span>
        </button>
        <button type="button" id="nav-tab-album" class="nav-tab ${this.activeTab === 'album' ? 'is-active' : ''}" data-action="switch-tab" data-tab="album">
          <span class="nav-icon">📖</span>
          <span class="nav-label">${t('navAlbum')} <small>(${collectedCount})</small></span>
        </button>
      </nav>
    `;

    this.renderModal();

    // 同步無障礙狀態提示（如果有剛培育完成的香火苗且在首頁外，可透過紅點提醒）
    if (activeSeed && activeSeed.currentDistance >= activeSeed.targetDistance) {
      document.title = `✨ 香火圓滿！｜${t('appTitle')}`;
    } else {
      document.title = `${t('appTitle')}：${t('appSubtitle')}`;
    }
  }

  renderModal() {
    if (!this.modalEl) return;
    if (!this.activeModal) {
      this.stopCameraScan();
      this.modalEl.innerHTML = '';
      document.body.classList.remove('modal-open');
      return;
    }

    document.body.classList.add('modal-open');
    const { type, payload } = this.activeModal;

    if (type === 'hatch') {
      this.modalEl.innerHTML = renderHatchRevealModal(payload.temple);
    } else if (type === 'share') {
      this.modalEl.innerHTML = renderShareCardModal(payload);
    } else if (type === 'qr') {
      this.modalEl.innerHTML = renderQrScannerModal(this.temples);
    } else if (type === 'coffee') {
      this.modalEl.innerHTML = renderCoffeeSponsorModal();
    } else if (type === 'partner') {
      this.modalEl.innerHTML = renderPartnerB2BModal();
    } else if (type === 'redeem') {
      this.modalEl.innerHTML = renderRedeemConfirmModal(payload.temple, payload.record);
    }
  }

  bindEvents() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;

      const action = target.dataset.action;
      switch (action) {
        case 'switch-tab':
          soundFX.playTap();
          this.activeTab = target.dataset.tab || 'home';
          window.scrollTo({ top: 0, behavior: 'smooth' });
          this.render();
          break;

        case 'set-lang':
          soundFX.playTap();
          updatePreference('lang', target.dataset.lang);
          break;

        case 'toggle-theme':
          soundFX.playTap();
          updatePreference('theme', getState().preferences.theme === 'night' ? 'day' : 'night');
          break;

        case 'toggle-font':
          soundFX.playTap();
          updatePreference('largeFont', !getState().preferences.largeFont);
          break;

        case 'toggle-sound': {
          const next = !getState().preferences.soundEnabled;
          updatePreference('soundEnabled', next);
          if (next) soundFX.playTap();
          break;
        }

        case 'toggle-tracking':
          this.handleToggleTracking();
          break;

        case 'sim-distance': {
          const km = parseFloat(target.dataset.km || '0.6');
          this.handleAddDistance(km, true);
          break;
        }

        case 'sim-fill-seed': {
          const active = getActiveSeed();
          if (active) {
            const remain = Math.max(0.1, active.targetDistance - active.currentDistance);
            this.handleAddDistance(remain, true);
          }
          break;
        }

        case 'activate-seed':
          soundFX.playTap();
          setActiveSeed(target.dataset.uid);
          this.showToast('🌱 已切換為目前培育中的香火苗！', 'success');
          break;

        case 'hatch-seed':
          this.handleHatchSeed(target.dataset.uid);
          break;

        case 'request-gps':
          this.handleRequestSingleGPS();
          break;

        case 'set-explore-filter':
          soundFX.playTap();
          this.exploreFilter = target.dataset.filter || 'all';
          this.render();
          break;

        case 'simulate-arrive':
          this.handleSimulateArrival(target.dataset.templeId);
          break;

        case 'checkin-temple':
          this.handleTempleCheckIn(target.dataset.templeId, target.dataset.method || 'gps');
          break;

        case 'qr-direct-checkin':
          this.closeModal();
          this.handleTempleCheckIn(target.dataset.templeId, 'qr_scan');
          break;

        case 'open-qr-modal':
          soundFX.playTap();
          this.activeModal = { type: 'qr', payload: {} };
          this.renderModal();
          break;

        case 'start-camera-scan':
          this.startCameraScan();
          break;

        case 'set-album-layout':
          soundFX.playTap();
          updatePreference('albumLayout', target.dataset.layout || 'accordion');
          break;

        case 'flip-folio': {
          soundFX.playTap();
          const id = target.dataset.templeId;
          if (this.flippedFolios.has(id)) {
            this.flippedFolios.delete(id);
          } else {
            this.flippedFolios.add(id);
          }
          this.render();
          break;
        }

        case 'confirm-redeem': {
          soundFX.playTap();
          const temple = this.temples.find((x) => x.id === target.dataset.templeId);
          const record = getState().unlockedGoshuin[target.dataset.templeId];
          if (temple && record && !record.voucherRedeemedAt) {
            this.activeModal = { type: 'redeem', payload: { temple, record } };
            this.renderModal();
          }
          break;
        }

        case 'execute-redeem': {
          const id = target.dataset.templeId;
          if (redeemVoucher(id)) {
            soundFX.playStampSeal();
            recordTempleAnalyticsEvent({ templeId: id, eventType: 'redeem' });
            this.closeModal();
            this.showToast('✅ 結緣品核銷完成！願神明庇佑旅途平安。', 'success');
          }
          break;
        }

        case 'open-share-card':
          this.openShareCardStudio(target.dataset.templeId, 'temple');
          break;

        case 'select-share-blessing':
          this.openShareCardStudio(target.dataset.templeId, target.dataset.blessingId);
          break;

        case 'download-share-card':
          if (this.shareCardCache) {
            soundFX.playTap();
            downloadShareCard(this.shareCardCache.dataUrl, this.shareCardCache.temple.name);
            this.showToast('📥 已開始下載 1080×1920 高畫質祝賀分享卡！', 'success');
          }
          break;

        case 'native-share-card':
          this.handleNativeShare();
          break;

        case 'go-album-from-modal':
          soundFX.playTap();
          this.closeModal();
          this.activeTab = 'album';
          this.render();
          break;

        case 'open-coffee':
          soundFX.playTap();
          this.activeModal = { type: 'coffee', payload: {} };
          this.renderModal();
          break;

        case 'open-partner':
          soundFX.playTap();
          this.activeModal = { type: 'partner', payload: {} };
          this.renderModal();
          break;

        case 'close-backdrop':
          if (e.target === target) {
            this.closeModal();
          }
          break;

        case 'close-modal':
          this.closeModal();
          break;
      }
    });

    // 示範基準點下拉選單
    document.addEventListener('change', (e) => {
      const sel = e.target.closest('[data-action="select-demo-loc"]');
      if (!sel) return;
      const loc = SITE_CONFIG.demoLocations.find((l) => l.id === sel.value);
      if (loc) {
        soundFX.playTap();
        geoTracker.setSimulatedPosition(loc.lat, loc.lng, loc.label);
        this.showToast(`📍 已切換雷達參考點至「${loc.label}」`, 'info');
      }
    });

    // 表單送出委派（手動 QR 代碼輸入 ＋ 宮廟合作申請表單）
    document.addEventListener('submit', (e) => {
      const form = e.target.closest('form[data-action]');
      if (!form) return;
      e.preventDefault();
      const action = form.dataset.action;

      if (action === 'submit-qr-code') {
        const raw = (new FormData(form).get('code') || '').toString().trim();
        const extracted = extractTempleIdFromUrl(raw) || raw.toLowerCase();
        const found = this.temples.find(
          (tpl) => tpl.id.toLowerCase() === extracted || tpl.name.includes(raw)
        );
        if (!found) {
          this.showToast('找不到對應的宮廟代碼，請試試 shoutian、deci、zinan 或點擊下方模擬立牌。', 'error');
          return;
        }
        this.closeModal();
        this.handleTempleCheckIn(found.id, 'qr_manual');
      }

      if (action === 'submit-partner-form') {
        const fd = new FormData(form);
        const summary = [
          '【御朱燈影｜宮廟合作加入申請】',
          `宮廟名稱：${fd.get('templeName')}`,
          `所在縣市：${fd.get('city')}`,
          `聯絡窗口：${fd.get('contact')}`,
          `預計結緣品：${fd.get('reward') || '待討論'}`
        ].join('\n');

        if (navigator.clipboard) {
          navigator.clipboard.writeText(summary).catch(() => {});
        }
        if (SITE_CONFIG.partnerB2B.webhookUrl) {
          fetch(SITE_CONFIG.partnerB2B.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              templeName: fd.get('templeName'),
              city: fd.get('city'),
              contact: fd.get('contact'),
              reward: fd.get('reward')
            })
          }).catch(() => {});
        }
        soundFX.playSeedChime();
        this.closeModal();
        this.showToast('🏮 感謝申請！已為您複製宮廟聯絡資訊，可直接貼給設計師 LINE 或寄送 Email。', 'success');
      }
    });

    // ESC 鍵關閉彈窗
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.closeModal();
      }
    });
  }

  closeModal() {
    this.activeModal = null;
    this.renderModal();
  }

  handleToggleTracking() {
    const snap = geoTracker.getSnapshot();
    if (snap.isTracking) {
      geoTracker.stopTravelTracking();
      soundFX.playTap();
      this.showToast('⏸️ 已暫停 GPS 旅行計程模式，里程已自動儲存。', 'info');
      return;
    }

    const res = geoTracker.startTravelTracking((deltaKm) => {
      this.handleAddDistance(deltaKm, false);
    });
    if (res.ok) {
      soundFX.playSeedChime();
      this.showToast('📡 已開啟旅行計程模式！散步或搭車移動皆會自動累積距離。', 'success');
    } else {
      this.showToast(res.error || '無法啟動 GPS 追蹤', 'error');
    }
  }

  handleAddDistance(deltaKm, isSimulated = false) {
    const { becameReady, activeSeed } = addTravelDistance(deltaKm);
    if (isSimulated) {
      geoTracker.addSimulatedSessionKm(deltaKm);
      soundFX.playTap();
    }
    if (becameReady && activeSeed) {
      const tpl = this.temples.find((x) => x.id === activeSeed.templeId);
      soundFX.playSeedChime();
      this.showToast(
        `✨「${tpl ? tpl.name : ''}」香火苗已圓滿！點擊即可顯化專屬御朱印！`,
        'success'
      );
    } else if (isSimulated) {
      this.showToast(`🚶 已累積旅行距離 +${deltaKm.toFixed(2)} km`, 'info');
    }
  }

  handleHatchSeed(uid) {
    const seed = getState().seeds.find((s) => s.uid === uid);
    if (!seed) return;
    const temple = this.temples.find((tItem) => tItem.id === seed.templeId);
    if (!temple) return;

    const entry = hatchSeed(uid, temple);
    if (!entry) return;

    soundFX.playStampSeal();
    recordTempleAnalyticsEvent({ templeId: temple.id, eventType: 'hatch' });

    this.activeModal = { type: 'hatch', payload: { temple, entry } };
    this.renderModal();
  }

  async handleRequestSingleGPS() {
    soundFX.playTap();
    this.showToast('📡 正在定位您的座標並重新排序宮廟雷達…', 'info');
    try {
      await geoTracker.requestSingleLocation();
      this.showToast('✅ 已更新為您的即時 GPS 位置！', 'success');
    } catch (err) {
      this.showToast(err.message || '無法取得定位', 'error');
    }
  }

  handleSimulateArrival(templeId) {
    const temple = this.temples.find((x) => x.id === templeId);
    if (!temple) return;
    soundFX.playTap();
    // 移動至宮廟約 12 公尺內（<= 100m 解鎖門檻）
    geoTracker.setSimulatedPosition(
      temple.lat + 0.00009,
      temple.lng + 0.00006,
      `模擬抵達・${temple.name}廟埕`
    );
    this.showToast(`🧭 已模擬抵達「${temple.name}」廟埕（距離約 12 公尺），打卡按鈕已解鎖！`, 'success');
  }

  handleTempleCheckIn(templeId, method = 'gps') {
    const temple = this.temples.find((x) => x.id.toLowerCase() === String(templeId).toLowerCase());
    if (!temple) {
      this.showToast('找不到此宮廟資料，請確認 QR Code 連結是否正確。', 'error');
      return;
    }

    const result = plantSeedFromTemple(temple, method);
    if (!result.ok) {
      if (result.reason === 'duplicate_seed') {
        this.showToast(`🌱 您的香囊中已有「${getTempleField(temple, 'name')}」的香火苗正在培育！`, 'info');
      } else if (result.reason === 'pouch_full') {
        this.showToast(`🎒 香囊已滿（最多 ${SITE_CONFIG.maxSeedSlots} 顆），請先至大廳孵化現有香火苗！`, 'error');
      }
      return;
    }

    // 將剛請回的香火苗若目前無培育中或剛收進來時提示
    soundFX.playSeedChime();
    recordTempleAnalyticsEvent({ templeId: temple.id, eventType: 'checkin', method });

    const seedDef = SITE_CONFIG.seedTypes[temple.seedType] || SITE_CONFIG.seedTypes.vermilion;
    this.showToast(
      `🏮 參拜打卡成功！已請回「${getTempleField(temple, 'name')}」${seedDef.name['zh-TW']}（需 ${seedDef.targetKm} km 孵化）`,
      'success'
    );
  }

  async openShareCardStudio(templeId, blessingId = 'temple') {
    const temple = this.temples.find((x) => x.id === templeId);
    if (!temple) return;
    const state = getState();
    const record = state.unlockedGoshuin[templeId];
    const preset = BLESSING_PRESETS.find((p) => p.id === blessingId) || BLESSING_PRESETS[0];
    const blessingText = preset.text || temple.blessing;

    soundFX.playTap();
    this.activeModal = {
      type: 'share',
      payload: { temple, dataUrl: '', selectedBlessingId: blessingId }
    };
    this.renderModal();

    try {
      const { dataUrl, blob } = await generateShareCard({
        temple,
        totalDistanceKm: state.totalDistanceKm,
        collectedCount: Object.keys(state.unlockedGoshuin).length,
        stampedAt: record?.lastStampedAt || new Date().toISOString(),
        blessingText
      });

      this.shareCardCache = { temple, dataUrl, blob, blessingText, selectedBlessingId: blessingId };
      if (this.activeModal && this.activeModal.type === 'share') {
        this.activeModal.payload = { temple, dataUrl, selectedBlessingId: blessingId };
        this.renderModal();
      }
    } catch (err) {
      console.error('[TempleGo] ShareCard generation failed:', err);
      this.showToast('分享卡合成失敗，請再試一次。', 'error');
    }
  }

  async handleNativeShare() {
    if (!this.shareCardCache) return;
    const state = getState();
    const res = await shareCardViaWebShare({
      blob: this.shareCardCache.blob,
      dataUrl: this.shareCardCache.dataUrl,
      temple: this.shareCardCache.temple,
      totalDistanceKm: state.totalDistanceKm,
      blessingText: this.shareCardCache.blessingText
    });

    if (res.ok && res.mode === 'fallback_download') {
      this.showToast('📥 桌機瀏覽器已自動下載圖片並複製祝福語，可直接貼至 LINE 分享！', 'success');
    } else if (res.ok) {
      this.showToast('📤 已開啟系統分享面板！', 'success');
    }
  }

  async startCameraScan() {
    const videoEl = document.getElementById('qr-camera-video');
    const statusEl = document.getElementById('qr-camera-status');
    if (!videoEl || !statusEl) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      statusEl.innerHTML = '<p>此裝置不支援網頁鏡頭存取，請使用下方手動代碼或測試宮廟立牌。</p>';
      return;
    }

    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      videoEl.srcObject = this.cameraStream;
      videoEl.classList.remove('hidden');
      await videoEl.play();

      if ('BarcodeDetector' in window) {
        statusEl.innerHTML = '<p>📷 鏡頭已啟動，請對準廟方立牌 QR Code…</p>';
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        this.cameraScanTimer = setInterval(async () => {
          try {
            const codes = await detector.detect(videoEl);
            if (codes.length > 0 && codes[0].rawValue) {
              const id = extractTempleIdFromUrl(codes[0].rawValue) || codes[0].rawValue.trim();
              this.stopCameraScan();
              this.closeModal();
              this.handleTempleCheckIn(id, 'qr_camera');
            }
          } catch {
            // continue scanning
          }
        }, 500);
      } else {
        statusEl.innerHTML =
          '<p>📷 鏡頭已開啟（此瀏覽器未內建原生 QR 解碼器，請直接以手機相機掃描含 <code>?temple_id=</code> 之網址或點選下方立牌測試）。</p>';
      }
    } catch {
      statusEl.innerHTML =
        '<p>⚠️ 未取得相機權限，請改用下方「手動輸入代碼」或點擊測試宮廟立牌體驗！</p>';
    }
  }

  stopCameraScan() {
    if (this.cameraScanTimer) {
      clearInterval(this.cameraScanTimer);
      this.cameraScanTimer = null;
    }
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((track) => track.stop());
      this.cameraStream = null;
    }
  }

  showToast(message, variant = 'info') {
    if (!this.toastEl) return;
    const item = document.createElement('div');
    item.className = `toast-pill toast-${variant}`;
    item.setAttribute('role', 'status');
    item.textContent = message;
    this.toastEl.appendChild(item);

    setTimeout(() => {
      item.classList.add('is-leaving');
      setTimeout(() => item.remove(), 320);
    }, 3600);
  }
}

const app = new TempleGoApp();
app.init();
