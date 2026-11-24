/**
 * 隱藏版「廟公管理後臺」
 * 功能：
 * 1. 修改「公佈欄」最新消息、建廟進度與捐款芳名錄（即時同步 3D 場景公佈欄貼圖）
 * 2. 批次匯入與管理「安太歲真實名單」（即時同步 3D 紅紙牆貼圖）
 * 3. 整理供桌、匯出 JSON 資料設定檔
 */
import { TEMPLE_CONFIG } from '../config/templeConfig.js';
import { storageSync } from '../services/storageSync.js';
import { soundEngine } from '../audio/soundEngine.js';

export class AdminPanelUI {
  constructor(modalRoot, { onDataChanged }) {
    this.modalRoot = modalRoot;
    this.onDataChanged = onDataChanged;
    this.authenticated = false;
    this.activeTab = 'bulletin'; // 'bulletin' | 'taisui' | 'system'
    this.isOpen = false;
    this.statusBanner = '';
  }

  _flashStatus(msg) {
    this.statusBanner = msg;
  }

  open() {
    this.isOpen = true;
    storageSync.refreshCloudShared(true).then(() => {
      if (this.isOpen && this.authenticated && this.activeTab === 'taisui') {
        const batchEl = this.modalRoot.querySelector('#adm-ts-batch');
        if (!batchEl || !batchEl.value.trim()) this.renderDashboard();
      }
    });
    if (!this.authenticated) {
      this.renderLogin();
    } else {
      this.renderDashboard();
    }
  }

  close() {
    this.isOpen = false;
    this.modalRoot.innerHTML = '';
  }

  renderLogin() {
    this.modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div class="bg-[#FFF9EE] border-4 border-[#8E1B1B] rounded-2xl shadow-2xl w-full max-w-sm p-6 text-[#3E1C11]">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-bold text-lg text-[#8E1B1B] flex items-center gap-2">🔑 廟務管理後臺登入</h2>
            <button id="adm-close" class="text-gray-500 hover:text-black text-lg font-bold">✕</button>
          </div>
          <p class="text-xs text-[#6B4E3D] mb-4">請輸入廟務管理員密碼以驗證身分。</p>
          <form id="adm-login-form" class="space-y-3">
            <input id="adm-pass" type="password" placeholder="請輸入管理密碼" autofocus
              class="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#D49B35] text-center tracking-widest text-base focus:outline-none focus:ring-2 focus:ring-[#B92B27]" />
            <div id="adm-err" class="text-xs text-red-600 text-center hidden">密碼驗證失敗，請確認後再試一次</div>
            <button type="submit" class="w-full py-2.5 rounded-xl bg-[#9E1F1B] hover:bg-[#7F1714] text-[#FFF8E7] font-bold text-sm">
              驗證並進入後臺
            </button>
          </form>
        </div>
      </div>
    `;

    this.modalRoot.querySelector('#adm-close')?.addEventListener('click', () => this.close());
    this.modalRoot.querySelector('#adm-dismiss-status')?.addEventListener('click', () => {
      this.statusBanner = '';
      this.renderDashboard();
    });
    this.modalRoot.querySelector('#adm-login-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = this.modalRoot.querySelector('#adm-pass').value.trim();
      if (val === TEMPLE_CONFIG.admin.defaultPasscode) {
        this.authenticated = true;
        soundEngine.playBlessingChime();
        this.renderDashboard();
      } else {
        this.modalRoot.querySelector('#adm-err').classList.remove('hidden');
      }
    });
  }

  renderDashboard() {
    const bulletin = storageSync.getBulletin();
    const taisui = storageSync.getTaiSuiList();

    this.modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-5">
        <div class="bg-[#FFF9EE] border-4 border-[#8E1B1B] rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-[#3E1C11]">
          <!-- 標題 -->
          <div class="bg-[#6D1412] px-5 py-3.5 flex items-center justify-between text-[#FFF5DA] border-b-2 border-[#F2C94C]">
            <div>
              <h2 class="font-bold text-lg flex items-center gap-2">🏛️ 玉勅代天府德慈宮・廟公管理後臺</h2>
              <p class="text-xs text-[#FFE59E]">所有更新將即時套用至 3D 廟宇場景與線上介面</p>
            </div>
            <button id="adm-close" class="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold">✕</button>
          </div>

          <!-- 頁籤 -->
          <div class="flex gap-2 px-5 pt-3 bg-[#F6E8CC] border-b border-[#D49B35]">
            ${[
              ['bulletin', '📋 公佈欄與建廟進度'],
              ['taisui', `🏮 安太歲名單 (${taisui.length})`],
              ['system', '⚙️ 系統與資料備份']
            ].map(([id, label]) => `
              <button data-tab="${id}" class="px-4 py-2 rounded-t-xl text-sm font-bold transition ${
                this.activeTab === id
                  ? 'bg-[#FFF9EE] text-[#8E1B1B] border-t-2 border-x-2 border-[#D49B35] -mb-px'
                  : 'text-[#6B4E3D] hover:bg-white/40'
              }">${label}</button>
            `).join('')}
          </div>

          <!-- 內容 -->
          <div id="adm-body" class="flex-1 overflow-y-auto p-5 space-y-5">
            ${this.statusBanner ? `
              <div class="px-4 py-2.5 rounded-2xl bg-[#ECFDF5] border-2 border-[#10B981] text-[#065F46] text-xs sm:text-sm font-black flex items-center justify-between gap-2 animate-fade-in">
                <span>✅ ${this._esc(this.statusBanner)}</span>
                <button id="adm-dismiss-status" type="button" class="text-[#047857] hover:underline text-xs font-bold">關閉</button>
              </div>
            ` : ''}
            ${this.activeTab === 'bulletin' ? this._renderBulletinTab(bulletin) : ''}
            ${this.activeTab === 'taisui' ? this._renderTaiSuiTab(taisui) : ''}
            ${this.activeTab === 'system' ? this._renderSystemTab() : ''}
          </div>
        </div>
      </div>
    `;

    this.modalRoot.querySelector('#adm-close')?.addEventListener('click', () => this.close());
    this.modalRoot.querySelector('#adm-dismiss-status')?.addEventListener('click', () => {
      this.statusBanner = '';
      this.renderDashboard();
    });
    this.modalRoot.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.getAttribute('data-tab');
        this.renderDashboard();
      });
    });

    if (this.activeTab === 'bulletin') this._bindBulletinEvents(bulletin);
    if (this.activeTab === 'taisui') this._bindTaiSuiEvents();
    if (this.activeTab === 'system') this._bindSystemEvents();
  }

  _renderBulletinTab(bulletin) {
    const c = bulletin.construction || { percent: 70, stage: '', targetDate: '', note: '' };
    return `
      <!-- 1. 建廟進度編輯 -->
      <section class="bg-white rounded-2xl border border-[#E5D3B3] p-4">
        <h3 class="font-bold text-base text-[#8E1B1B] mb-3">🏯 新廟建廟進度更新</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <label class="block text-xs font-bold text-[#6B4E3D] mb-1">完成進度百分比 (${c.percent}%)</label>
            <input id="adm-const-pct" type="number" min="0" max="100" value="${c.percent}" class="w-full px-3 py-1.5 rounded-lg border border-[#D49B35]" />
          </div>
          <div>
            <label class="block text-xs font-bold text-[#6B4E3D] mb-1">預計里程碑</label>
            <input id="adm-const-date" type="text" value="${this._esc(c.targetDate)}" class="w-full px-3 py-1.5 rounded-lg border border-[#D49B35]" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-[#6B4E3D] mb-1">目前施工階段</label>
            <input id="adm-const-stage" type="text" value="${this._esc(c.stage)}" class="w-full px-3 py-1.5 rounded-lg border border-[#D49B35]" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-[#6B4E3D] mb-1">建廟說明備註</label>
            <input id="adm-const-note" type="text" value="${this._esc(c.note)}" class="w-full px-3 py-1.5 rounded-lg border border-[#D49B35]" />
          </div>
        </div>
        <button id="adm-save-const" class="mt-3 px-4 py-1.5 rounded-xl bg-[#B92B27] text-white text-xs font-bold hover:brightness-110">儲存建廟進度</button>
      </section>

      <!-- 2. 最新消息管理 -->
      <section class="bg-white rounded-2xl border border-[#E5D3B3] p-4">
        <h3 class="font-bold text-base text-[#8E1B1B] mb-3">📌 最新消息管理</h3>
        <form id="adm-add-ann" class="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-3 text-xs">
          <input id="ann-tag" type="text" value="廟務公告" placeholder="標籤" class="sm:col-span-2 px-2.5 py-2 rounded-lg border border-[#D49B35]" />
          <input id="ann-title" type="text" required placeholder="公告標題" class="sm:col-span-4 px-2.5 py-2 rounded-lg border border-[#D49B35]" />
          <input id="ann-content" type="text" required placeholder="公告內容說明" class="sm:col-span-4 px-2.5 py-2 rounded-lg border border-[#D49B35]" />
          <button type="submit" class="sm:col-span-2 py-2 rounded-lg bg-[#D97706] text-white font-bold">＋ 新增公告</button>
        </form>
        <div class="space-y-2 max-h-48 overflow-y-auto">
          ${(bulletin.announcements || []).map(a => `
            <div class="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-[#FFF9EC] border border-[#EAD8B8] text-xs">
              <div>
                <span class="px-1.5 py-0.5 rounded bg-[#B92B27] text-white mr-1">${this._esc(a.tag)}</span>
                <strong class="text-[#3E1C11]">${this._esc(a.title)}</strong>
                <span class="text-gray-500 ml-1">${this._esc(a.date)}</span>
                <p class="text-[#6B4E3D] mt-1">${this._esc(a.content)}</p>
              </div>
              <button data-del-ann="${a.id}" class="shrink-0 text-red-600 hover:underline font-bold">刪除</button>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- 3. 捐款芳名錄管理 -->
      <section class="bg-white rounded-2xl border border-[#E5D3B3] p-4">
        <h3 class="font-bold text-base text-[#8E1B1B] mb-3">🙏 捐款芳名錄管理</h3>
        <form id="adm-add-donor" class="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-3 text-xs">
          <input id="donor-name" type="text" required placeholder="善信芳名（例：王小明 闔家）" class="sm:col-span-4 px-2.5 py-2 rounded-lg border border-[#D49B35]" />
          <input id="donor-amount" type="text" required placeholder="金額（例：NT$ 3,600）" class="sm:col-span-3 px-2.5 py-2 rounded-lg border border-[#D49B35]" />
          <input id="donor-item" type="text" placeholder="功德項目" class="sm:col-span-3 px-2.5 py-2 rounded-lg border border-[#D49B35]" />
          <button type="submit" class="sm:col-span-2 py-2 rounded-lg bg-[#D97706] text-white font-bold">＋ 新增芳名</button>
        </form>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto">
          ${(bulletin.donors || []).map(d => `
            <div class="flex items-center justify-between p-2 rounded-xl bg-[#FFF6E5] border border-[#EAD8B8] text-xs">
              <div>
                <strong>${this._esc(d.name)}</strong> · <span class="text-[#B92B27] font-bold">${this._esc(d.amount)}</span>
                <div class="text-[11px] text-[#7A5944]">${this._esc(d.item)} (${this._esc(d.date)})</div>
              </div>
              <button data-del-donor="${d.id}" class="text-red-600 hover:underline font-bold ml-2">刪除</button>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  _bindBulletinEvents(bulletin) {
    const syncScope = storageSync.getCloudDbUrl() ? '並已同步至雲端資料庫（全站即時生效）' : '（已存於本機；若要同步給所有線上訪客，請至「系統與資料備份」填入 Firebase 網址）';
    const safeClone = () => {
      const next = structuredClone(bulletin || {});
      next.announcements = Array.isArray(next.announcements) ? next.announcements : [];
      next.donors = Array.isArray(next.donors) ? next.donors : [];
      next.construction = next.construction || { percent: 72, stage: '', targetDate: '', note: '' };
      return next;
    };

    this.modalRoot.querySelector('#adm-save-const')?.addEventListener('click', () => {
      const next = safeClone();
      next.construction = {
        percent: Math.min(100, Math.max(0, Number(this.modalRoot.querySelector('#adm-const-pct').value) || 0)),
        targetDate: this.modalRoot.querySelector('#adm-const-date').value.trim(),
        stage: this.modalRoot.querySelector('#adm-const-stage').value.trim(),
        note: this.modalRoot.querySelector('#adm-const-note').value.trim()
      };
      storageSync.updateBulletin(next);
      soundEngine.playBlessingChime();
      this._flashStatus(`建廟進度（${next.construction.percent}%）已儲存${syncScope}`);
      if (this.onDataChanged) this.onDataChanged('bulletin');
      this.renderDashboard();
    });

    this.modalRoot.querySelector('#adm-add-ann')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const next = safeClone();
      next.announcements.unshift({
        id: `ann-${Date.now()}`,
        tag: this.modalRoot.querySelector('#ann-tag').value.trim() || '公告',
        title: this.modalRoot.querySelector('#ann-title').value.trim(),
        content: this.modalRoot.querySelector('#ann-content').value.trim(),
        date: new Date().toLocaleDateString('zh-TW')
      });
      storageSync.updateBulletin(next);
      soundEngine.playSoftClick();
      this._flashStatus(`已新增最新公告${syncScope}`);
      if (this.onDataChanged) this.onDataChanged('bulletin');
      this.renderDashboard();
    });

    this.modalRoot.querySelectorAll('[data-del-ann]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-del-ann');
        const next = safeClone();
        next.announcements = next.announcements.filter(a => a.id !== id);
        storageSync.updateBulletin(next);
        this._flashStatus(`已刪除該則公告${syncScope}`);
        if (this.onDataChanged) this.onDataChanged('bulletin');
        this.renderDashboard();
      });
    });

    this.modalRoot.querySelector('#adm-add-donor')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const next = safeClone();
      next.donors.unshift({
        id: `d-${Date.now()}`,
        name: this.modalRoot.querySelector('#donor-name').value.trim(),
        amount: this.modalRoot.querySelector('#donor-amount').value.trim(),
        item: this.modalRoot.querySelector('#donor-item').value.trim() || '隨喜建廟功德',
        date: new Date().toLocaleDateString('zh-TW')
      });
      storageSync.updateBulletin(next);
      soundEngine.playSoftClick();
      this._flashStatus(`已新增捐款芳名${syncScope}`);
      if (this.onDataChanged) this.onDataChanged('bulletin');
      this.renderDashboard();
    });

    this.modalRoot.querySelectorAll('[data-del-donor]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-del-donor');
        const next = safeClone();
        next.donors = next.donors.filter(d => d.id !== id);
        storageSync.updateBulletin(next);
        this._flashStatus(`已移除該筆芳名${syncScope}`);
        if (this.onDataChanged) this.onDataChanged('bulletin');
        this.renderDashboard();
      });
    });
  }

  _renderTaiSuiTab(list) {
    return `
      <section class="bg-white rounded-2xl border border-[#E5D3B3] p-4">
        <h3 class="font-bold text-base text-[#8E1B1B] mb-2">📥 批次匯入真實信眾安太歲名單</h3>
        <p class="text-xs text-[#6B4E3D] mb-2">每行一筆，格式支援：<code>姓名</code> 或 <code>姓名,生肖,祈福語</code>（以逗號分隔）</p>
        <textarea id="adm-ts-batch" rows="4" placeholder="林大雄,馬,闔家平安&#10;陳美華,鼠,出入平安、身體健康&#10;王小寶"
          class="w-full p-3 rounded-xl border border-[#D49B35] text-xs font-mono focus:outline-none"></textarea>
        <div class="flex items-center justify-between mt-2">
          <span id="adm-ts-msg" class="text-xs text-green-700 font-bold"></span>
          <button id="adm-ts-import-btn" class="px-4 py-2 rounded-xl bg-[#B92B27] text-white text-xs font-bold hover:brightness-110">
            一鍵批次匯入至紅紙牆
          </button>
        </div>
      </section>

      <section class="bg-white rounded-2xl border border-[#E5D3B3] p-4">
        <h3 class="font-bold text-base text-[#8E1B1B] mb-3">🏮 現有太歲燈名單管理（共 ${list.length} 筆）</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
          ${list.map(item => `
            <div class="flex items-center justify-between p-2 rounded-xl bg-[#FFF6E5] border border-[#EAD8B8] text-xs">
              <div class="truncate">
                <strong>${this._esc(item.name)}</strong> (${this._esc(item.zodiac)})
                <div class="text-[11px] text-[#7A5944] truncate">${this._esc(item.wish)}</div>
              </div>
              <button data-del-ts="${item.id}" class="shrink-0 ml-2 text-red-600 hover:underline font-bold">移除</button>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  _bindTaiSuiEvents() {
    this.modalRoot.querySelector('#adm-ts-import-btn')?.addEventListener('click', () => {
      const raw = this.modalRoot.querySelector('#adm-ts-batch').value.trim();
      if (!raw) return;
      const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const parsed = lines.map(line => {
        const parts = line.split(/[,，]/).map(p => p.trim());
        return { name: parts[0] || '', zodiac: parts[1] || '平安', wish: parts[2] || '消災解厄、平安順遂' };
      }).filter(x => x.name);

      const count = storageSync.batchImportTaiSui(parsed);
      soundEngine.playBlessingChime();
      this._flashStatus(`已成功批次匯入 ${count} 位信眾至紅紙太歲牆！`);
      if (this.onDataChanged) this.onDataChanged('taisui');
      this.renderDashboard();
    });

    this.modalRoot.querySelectorAll('[data-del-ts]').forEach(btn => {
      btn.addEventListener('click', () => {
        storageSync.removeTaiSuiEntry(btn.getAttribute('data-del-ts'));
        this._flashStatus('已從紅紙太歲牆移除該筆名單！');
        if (this.onDataChanged) this.onDataChanged('taisui');
        this.renderDashboard();
      });
    });
  }

  _renderSystemTab() {
    const dbUrl = storageSync.getCloudDbUrl();
    return `
      <section class="bg-[#FFF8E7] rounded-2xl border-2 border-[#D97706] p-4 space-y-3 text-sm">
        <h3 class="font-bold text-base text-[#8E1B1B]">☁️ 線上版跨裝置多人連線＆雲端儲存設定（GitHub Pages 必備）</h3>
        <p class="text-xs text-[#4A2210] leading-relaxed">
          目前狀態：<strong>${this._esc(storageSync.getSyncModeLabel())}</strong><br>
          GitHub Pages 為純靜態網站，若要讓不同手機／電腦的香客<strong>即時看到彼此走動、多人即時聊天、並讓管理者儲存的公佈欄／太歲名單同步給所有訪客</strong>，只需免費建立一個 Google Firebase Realtime Database，將網址貼入下方即可立即啟用（也可直接寫入 <code>src/config/firebaseConfig.js</code> 永久生效）！
        </p>
        <div class="flex flex-col sm:flex-row gap-2">
          <input id="adm-cloud-url" type="url" value="${this._esc(dbUrl)}"
            placeholder="貼上 Firebase 網址，例：https://your-temple-default-rtdb.asia-southeast1.firebasedatabase.app"
            class="flex-1 px-3 py-2 rounded-xl bg-white border-2 border-[#D49B35] text-xs font-mono text-[#183C32]" />
          <button id="adm-test-cloud" type="button"
            class="px-4 py-2 rounded-xl bg-[#183C32] hover:bg-[#235245] text-[#FFFBF2] text-xs font-black whitespace-nowrap">
            ☁️ 測試並啟用雲端同步
          </button>
        </div>
        <div id="adm-cloud-msg" class="text-xs font-bold text-[#183C32]"></div>
      </section>

      <section class="bg-white rounded-2xl border border-[#E5D3B3] p-4 space-y-3 text-sm">
        <h3 class="font-bold text-base text-[#8E1B1B]">⚙️ 廟務維護與資料備份</h3>
        <div class="flex flex-wrap gap-2 pt-1">
          <button id="adm-export-json" class="px-4 py-2 rounded-xl bg-[#D97706] text-white text-xs font-bold">📥 匯出完整 JSON 資料備份</button>
          <button id="adm-clear-offerings" class="px-4 py-2 rounded-xl bg-[#78350F] text-white text-xs font-bold">🧹 立即整理清空供桌</button>
          <button id="adm-reset-defaults" class="px-4 py-2 rounded-xl bg-red-700 text-white text-xs font-bold">↺ 還原預設示範資料</button>
        </div>
      </section>
    `;
  }

  _bindSystemEvents() {
    this.modalRoot.querySelector('#adm-test-cloud')?.addEventListener('click', async () => {
      const inp = this.modalRoot.querySelector('#adm-cloud-url');
      const msgEl = this.modalRoot.querySelector('#adm-cloud-msg');
      const val = inp?.value.trim() || '';
      if (!val) {
        storageSync.setCloudDbUrl('');
        this._flashStatus('已清除雲端資料庫設定，切回本機模式');
        this.renderDashboard();
        return;
      }
      if (msgEl) msgEl.textContent = '⏳ 正在連線測試 Firebase Realtime Database...';
      const res = await storageSync.testCloudDbConnection(val);
      if (res.ok) {
        soundEngine.playBlessingChime();
        this._flashStatus(res.message);
        this.renderDashboard();
      } else if (msgEl) {
        msgEl.className = 'text-xs font-bold text-[#B91C1C]';
        msgEl.textContent = '❌ ' + res.message;
      }
    });

    this.modalRoot.querySelector('#adm-export-json')?.addEventListener('click', () => {
      const json = storageSync.exportAllData();
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deci-temple-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    this.modalRoot.querySelector('#adm-clear-offerings')?.addEventListener('click', () => {
      storageSync.clearOfferings();
      soundEngine.playSoftClick();
      if (this.onDataChanged) this.onDataChanged('offerings');
      alert('已將正殿供桌整理清空！');
    });

    this.modalRoot.querySelector('#adm-reset-defaults')?.addEventListener('click', () => {
      if (confirm('確定要將公佈欄與安太歲名單還原為初始示範資料嗎？')) {
        storageSync.resetDefaults();
        if (this.onDataChanged) this.onDataChanged('all');
        this.renderDashboard();
      }
    });
  }

  _esc(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
}
