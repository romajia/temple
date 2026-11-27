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
    this.authenticated = storageSync.isAdminAuthenticated();
    this.activeTab = 'bulletin'; // 'bulletin' | 'taisui' | 'stats' | 'accounts' | 'system'
    this.statsPeriod = 'daily'; // 'daily' | 'weekly' | 'monthly' | 'yearly'
    this.isOpen = false;
    this.statusBanner = '';
    this.resettingUser = '';
  }

  _flashStatus(msg) {
    this.statusBanner = msg;
  }

  open() {
    this.isOpen = true;
    this.authenticated = storageSync.isAdminAuthenticated();
    Promise.all([
      storageSync.refreshCloudShared(true),
      storageSync.refreshVisitStats(true),
      storageSync.refreshAdminAccounts()
    ]).then(() => {
      if (this.isOpen && this.authenticated && (this.activeTab === 'taisui' || this.activeTab === 'stats' || this.activeTab === 'accounts')) {
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
    this.resettingUser = '';
    this.modalRoot.innerHTML = '';
  }

  renderLogin() {
    this.modalRoot.innerHTML = `
      <div class="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div class="bg-[#FFF9EE] border-4 border-[#8E1B1B] rounded-2xl shadow-2xl w-full max-w-sm p-6 text-[#3E1C11]">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-bold text-lg text-[#8E1B1B] flex items-center gap-2">🔑 廟務管理後臺登入</h2>
            <button id="adm-close" class="text-gray-500 hover:text-black text-lg font-bold">✕</button>
          </div>
          <p class="text-xs text-[#6B4E3D] leading-relaxed mb-4">
            請輸入您的<strong>管理員帳號</strong>與<strong>密碼</strong>即可進入廟務後臺（最高管理員登入後可於後臺直接修改密碼與新增其他管理員）。
          </p>
          <form id="adm-login-form" class="space-y-3">
            <div>
              <label for="adm-username" class="block text-xs font-bold text-[#5B3A24] mb-1">管理員帳號</label>
              <input id="adm-username" type="text" autocomplete="username" required
                placeholder="請輸入管理員帳號" autofocus
                class="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#D49B35] text-sm focus:outline-none focus:ring-2 focus:ring-[#B92B27]" />
            </div>
            <div>
              <label for="adm-pass" class="block text-xs font-bold text-[#5B3A24] mb-1">管理員密碼</label>
              <input id="adm-pass" type="password" autocomplete="current-password" required
                placeholder="請輸入管理員密碼"
                class="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#D49B35] text-sm focus:outline-none focus:ring-2 focus:ring-[#B92B27]" />
            </div>
            <div id="adm-err" class="text-xs text-red-700 font-bold bg-red-50 border border-red-200 rounded-xl px-3 py-2 hidden"></div>
            <button id="adm-submit-btn" type="submit" class="w-full py-2.5 rounded-xl bg-[#9E1F1B] hover:bg-[#7F1714] text-[#FFF8E7] font-bold text-sm transition">
              🔓 登入廟務後臺
            </button>
          </form>
        </div>
      </div>
    `;

    this.modalRoot.querySelector('#adm-close')?.addEventListener('click', () => this.close());
    this.modalRoot.querySelector('#adm-login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = this.modalRoot.querySelector('#adm-username')?.value.trim() || '';
      const pass = this.modalRoot.querySelector('#adm-pass')?.value || '';
      const errEl = this.modalRoot.querySelector('#adm-err');
      const btn = this.modalRoot.querySelector('#adm-submit-btn');
      if (errEl) errEl.classList.add('hidden');
      if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ 正在驗證帳號密碼...';
      }
      const res = await storageSync.signInAdminAccount(username, pass);
      if (res.ok) {
        this.authenticated = true;
        soundEngine.playBlessingChime();
        const acct = res.account || storageSync.getCurrentAdminAccount();
        const roleLabel = acct?.role === 'super' ? '👑 最高權限管理員' : '🔑 廟務管理員';
        this._flashStatus(`歡迎回來！已登入為 ${roleLabel}（${acct?.displayName || acct?.username}）`);
        this.renderDashboard();
      } else {
        if (errEl) {
          errEl.textContent = '❌ ' + (res.message || '帳號或密碼驗證失敗');
          errEl.classList.remove('hidden');
        }
        if (btn) {
          btn.disabled = false;
          btn.textContent = '🔓 登入廟務後臺';
        }
      }
    });
  }

  renderDashboard() {
    const bulletin = storageSync.getBulletin();
    const taisui = storageSync.getTaiSuiList();
    const acct = storageSync.getCurrentAdminAccount();
    const isSuper = storageSync.isSuperAdmin();
    const roleTag = isSuper ? '👑 最高權限管理員' : '🔑 廟務管理員';
    const acctLabel = acct ? `${acct.displayName} (${acct.username})` : '管理員';
    const accountsCount = storageSync.getAdminAccountsList().length;

    this.modalRoot.innerHTML = `
      <div class="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-5">
        <div class="bg-[#FFF9EE] border-4 border-[#8E1B1B] rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-[#3E1C11]">
          <!-- 標題 -->
          <div class="bg-[#6D1412] px-5 py-3.5 flex items-center justify-between gap-2 text-[#FFF5DA] border-b-2 border-[#F2C94C]">
            <div class="min-w-0">
              <h2 class="font-bold text-lg flex items-center gap-2">🏛️ 玉勅代天府德慈宮・廟公管理後臺</h2>
              <p class="text-xs text-[#FFE59E] truncate">
                ${roleTag}：${this._esc(acctLabel)}・所有更新將即時套用至 3D 廟宇場景
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button id="adm-logout" type="button" title="登出管理後臺"
                class="px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-xs font-bold text-[#FFF5DA] transition">
                🚪 登出
              </button>
              <button id="adm-close" class="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold">✕</button>
            </div>
          </div>

          <!-- 頁籤 -->
          <div class="flex flex-wrap gap-1.5 sm:gap-2 px-4 sm:px-5 pt-3 bg-[#F6E8CC] border-b border-[#D49B35]">
            ${[
              ['bulletin', '📋 公佈欄與建廟進度'],
              ['taisui', `🏮 安太歲名單 (${taisui.length})`],
              ['stats', '📊 參拜人數統計'],
              ['accounts', isSuper ? `👤 管理員帳號 (${accountsCount})` : '🔐 修改密碼'],
              ['system', '⚙️ 系統與資料備份']
            ].map(([id, label]) => `
              <button data-tab="${id}" class="px-3.5 sm:px-4 py-2 rounded-t-xl text-xs sm:text-sm font-bold transition ${
                this.activeTab === id
                  ? 'bg-[#FFF9EE] text-[#8E1B1B] border-t-2 border-x-2 border-[#D49B35] -mb-px'
                  : 'text-[#6B4E3D] hover:bg-white/40'
              }">${label}</button>
            `).join('')}
          </div>

          <!-- 內容 -->
          <div id="adm-body" class="flex-1 overflow-y-auto p-5 space-y-5">
            ${acct?.isDefaultPass && this.activeTab !== 'accounts' ? `
              <div class="px-4 py-2.5 rounded-2xl bg-[#FFFBEB] border-2 border-[#D97706] text-[#92400E] text-xs sm:text-sm font-bold flex flex-wrap items-center justify-between gap-2">
                <span>💡 提醒：您目前使用系統初始密碼登入，建議立即修改為專屬密碼！</span>
                <button id="adm-goto-accounts" type="button" class="px-3 py-1 rounded-xl bg-[#D97706] text-white text-xs font-bold hover:brightness-110">
                  👉 立即改密碼
                </button>
              </div>
            ` : ''}
            ${this.statusBanner ? `
              <div class="px-4 py-2.5 rounded-2xl bg-[#ECFDF5] border-2 border-[#10B981] text-[#065F46] text-xs sm:text-sm font-black flex items-center justify-between gap-2 animate-fade-in">
                <span>✅ ${this._esc(this.statusBanner)}</span>
                <button id="adm-dismiss-status" type="button" class="text-[#047857] hover:underline text-xs font-bold">關閉</button>
              </div>
            ` : ''}
            ${this.activeTab === 'stats' ? this._renderStatsTab() : ''}
            ${this.activeTab === 'bulletin' ? this._renderBulletinTab(bulletin) : ''}
            ${this.activeTab === 'taisui' ? this._renderTaiSuiTab(taisui) : ''}
            ${this.activeTab === 'accounts' ? this._renderAccountsTab() : ''}
            ${this.activeTab === 'system' ? this._renderSystemTab() : ''}
          </div>
        </div>
      </div>
    `;

    this.modalRoot.querySelector('#adm-close')?.addEventListener('click', () => this.close());
    this.modalRoot.querySelector('#adm-logout')?.addEventListener('click', () => {
      storageSync.signOutAdmin();
      this.authenticated = false;
      this.statusBanner = '';
      this.resettingUser = '';
      this.renderLogin();
    });
    this.modalRoot.querySelector('#adm-goto-accounts')?.addEventListener('click', () => {
      this.activeTab = 'accounts';
      this.renderDashboard();
    });
    this.modalRoot.querySelector('#adm-dismiss-status')?.addEventListener('click', () => {
      this.statusBanner = '';
      this.renderDashboard();
    });
    this.modalRoot.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.getAttribute('data-tab');
        this.resettingUser = '';
        if (this.activeTab === 'stats') storageSync.refreshVisitStats(false);
        if (this.activeTab === 'accounts') storageSync.refreshAdminAccounts().then(() => { if (this.isOpen && this.activeTab === 'accounts') this.renderDashboard(); });
        this.renderDashboard();
      });
    });

    if (this.activeTab === 'stats') this._bindStatsEvents();
    if (this.activeTab === 'bulletin') this._bindBulletinEvents(bulletin);
    if (this.activeTab === 'taisui') this._bindTaiSuiEvents();
    if (this.activeTab === 'accounts') this._bindAccountsEvents();
    if (this.activeTab === 'system') this._bindSystemEvents();
  }

  _renderStatsTab() {
    const a = storageSync.getVisitAnalytics();
    const periodMap = {
      daily: { title: '每日參拜趨勢（近 14 日）', unit: '人', list: a.dailySeries },
      weekly: { title: '每週參拜趨勢（近 8 週）', unit: '人次', list: a.weeklySeries },
      monthly: { title: `每月參拜趨勢（${a.yearLabel}全年）`, unit: '人次', list: a.monthlySeries },
      yearly: { title: '歷年每年參拜總計', unit: '人次', list: a.yearlySeries }
    };
    const activeChart = periodMap[this.statsPeriod] || periodMap.daily;
    const maxVal = Math.max(1, ...activeChart.list.map((it) => it.count));
    const periodSum = activeChart.list.reduce((acc, it) => acc + it.count, 0);

    return `
      <!-- 1. 五大核心參拜 KPI 總覽卡片（每日／每週／每月／每年／累積上線人數） -->
      <section class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="font-black text-base text-[#8E1B1B] flex items-center gap-1.5">📊 玉勅代天府德慈宮・線上參拜人數統計儀表板</h3>
            <p class="text-xs text-[#6B4E3D] mt-0.5">
              即時掌握每日、每週、每月、每年與累積上線香客人次（目前同時在線：<strong class="text-[#15803D]">${a.onlineNow} 位真人</strong>）
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button id="adm-stats-refresh" type="button" class="px-3 py-1.5 rounded-xl bg-[#183C32] hover:bg-[#235245] text-[#FFFBF2] text-xs font-bold transition">
              🔄 同步最新雲端數據
            </button>
            <button id="adm-stats-csv" type="button" class="px-3 py-1.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold transition">
              📥 匯出報表 CSV
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          ${[
            { icon: '📅', label: '每日參拜人數', value: a.today, unit: '人', sub: `今日 ${a.todayStr}`, accent: 'border-[#B91C1C] bg-gradient-to-br from-[#FFF5F5] to-[#FFFDF8]', numCls: 'text-[#B91C1C]' },
            { icon: '📆', label: '每週參拜人數', value: a.week, unit: '人次', sub: `本週 ${a.weekRangeLabel}`, accent: 'border-[#D97706] bg-gradient-to-br from-[#FFFBEB] to-[#FFFDF8]', numCls: 'text-[#B45309]' },
            { icon: '🗓️', label: '每月參拜人數', value: a.month, unit: '人次', sub: a.monthLabel, accent: 'border-[#047857] bg-gradient-to-br from-[#ECFDF5] to-[#FFFDF8]', numCls: 'text-[#047857]' },
            { icon: '🏮', label: '每年參拜人數', value: a.year, unit: '人次', sub: `${a.yearLabel}度累計`, accent: 'border-[#1D4ED8] bg-gradient-to-br from-[#EFF6FF] to-[#FFFDF8]', numCls: 'text-[#1D4ED8]' },
            { icon: '👑', label: '累積上線總人數', value: a.cumulative, unit: '人次', sub: `不重複信眾 ${a.uniquePilgrims.toLocaleString('zh-TW')} 位`, accent: 'border-[#8E1B1B] bg-gradient-to-br from-[#FEF3C7] via-[#FFF8E7] to-[#FFE8D6] col-span-2 sm:col-span-1', numCls: 'text-[#7F1D1D]' }
          ].map((c) => `
            <div class="rounded-2xl border-2 ${c.accent} p-3.5 shadow-sm flex flex-col justify-between">
              <div class="flex items-center justify-between text-xs font-extrabold text-[#5B3A24]">
                <span>${c.icon} ${c.label}</span>
              </div>
              <div class="mt-2 flex items-baseline gap-1">
                <span class="text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${c.numCls}">${c.value.toLocaleString('zh-TW')}</span>
                <span class="text-xs font-bold text-[#6B4E3D]">${c.unit}</span>
              </div>
              <div class="mt-1.5 text-[11px] font-bold text-[#7A5944] truncate">${this._esc(c.sub)}</div>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- 2. 互動週期切換柱狀趨勢圖（每日／每週／每月／每年） -->
      <section class="bg-white rounded-2xl border-2 border-[#E5D3B3] p-4 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 class="font-black text-sm sm:text-base text-[#8E1B1B]">📈 ${activeChart.title}</h4>
            <p class="text-[11px] text-[#7A5944]">此區間合計：<strong class="text-[#8E1B1B]">${periodSum.toLocaleString('zh-TW')} ${activeChart.unit}</strong>・單期最高：<strong>${maxVal.toLocaleString('zh-TW')} ${activeChart.unit}</strong></p>
          </div>
          <div class="inline-flex rounded-xl bg-[#F6E8CC] p-1 border border-[#D49B35] gap-1">
            ${[
              ['daily', '每日'],
              ['weekly', '每週'],
              ['monthly', '每月'],
              ['yearly', '每年']
            ].map(([pid, plabel]) => `
              <button data-stats-period="${pid}" type="button" class="px-3 py-1 rounded-lg text-xs font-black transition ${
                this.statsPeriod === pid
                  ? 'bg-[#8E1B1B] text-[#FFFBF2] shadow'
                  : 'text-[#5B3A24] hover:bg-white/60'
              }">${plabel}</button>
            `).join('')}
          </div>
        </div>

        <!-- 視覺化直條圖 -->
        <div class="w-full overflow-x-auto pb-1">
          <div class="min-w-[420px] h-52 flex items-end justify-between gap-1.5 sm:gap-2 px-2 pt-6 pb-2 rounded-xl bg-gradient-to-b from-[#FFFBF2] to-[#FDF3DC] border border-[#EAD8B8]">
            ${activeChart.list.map((item) => {
              const pct = item.count > 0 ? Math.max(10, Math.round((item.count / maxVal) * 100)) : 4;
              const barCls = item.isCurrent
                ? 'bg-gradient-to-t from-[#991B1B] via-[#DC2626] to-[#F59E0B] ring-2 ring-[#F59E0B]/60'
                : (item.count > 0 ? 'bg-gradient-to-t from-[#B45309] to-[#FBBF24]' : 'bg-[#E5D3B3]/70');
              return `
                <div class="flex-1 flex flex-col items-center justify-end h-full min-w-[26px]" title="${this._esc(item.subLabel)}：${item.count} ${activeChart.unit}">
                  <div class="text-[10px] font-black tabular-nums ${item.isCurrent ? 'text-[#B91C1C]' : 'text-[#5B3A24]'} mb-1">${item.count}</div>
                  <div class="w-full max-w-[34px] rounded-t-lg transition-all duration-300 ${barCls}" style="height: ${pct}%"></div>
                  <div class="mt-1.5 text-[10px] font-bold ${item.isCurrent ? 'text-[#B91C1C] font-black' : 'text-[#6B4E3D]'} whitespace-nowrap">${this._esc(item.label)}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </section>
    `;
  }

  _bindStatsEvents() {
    this.modalRoot.querySelectorAll('[data-stats-period]').forEach((btn) => {
      btn.addEventListener('click', () => {
        soundEngine.playSoftClick();
        this.statsPeriod = btn.getAttribute('data-stats-period') || 'daily';
        this.renderDashboard();
      });
    });

    this.modalRoot.querySelector('#adm-stats-refresh')?.addEventListener('click', async () => {
      soundEngine.playSoftClick();
      await storageSync.refreshVisitStats(true);
      this._flashStatus('已重新同步最新雲端參拜統計數據！');
      this.renderDashboard();
    });

    this.modalRoot.querySelector('#adm-stats-csv')?.addEventListener('click', () => {
      soundEngine.playSoftClick();
      const csv = storageSync.exportVisitStatsCsv();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deci-temple-visits-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      this._flashStatus('已匯出參拜人數統計報表（CSV）！');
      this.renderDashboard();
    });
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

  _renderAccountsTab() {
    const cur = storageSync.getCurrentAdminAccount();
    const isSuper = storageSync.isSuperAdmin();
    const accounts = storageSync.getAdminAccountsList();

    return `
      <!-- 1. 修改目前登入管理員自己的密碼 -->
      <section class="bg-white rounded-2xl border border-[#E5D3B3] p-4 space-y-3 text-sm">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-bold text-base text-[#8E1B1B]">🔐 修改我的登入密碼</h3>
          <span class="text-xs font-bold px-2.5 py-1 rounded-full ${isSuper ? 'bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B]' : 'bg-[#E0F2FE] text-[#075985] border border-[#38BDF8]'}">
            ${isSuper ? '👑 最高權限管理員' : '🔑 一般廟務管理員'}：${this._esc(cur?.username || '')}
          </span>
        </div>
        <form id="adm-chpass-form" class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <input id="adm-cur-pass" type="password" required placeholder="目前密碼"
            class="px-3 py-2 rounded-xl bg-[#FFFDF8] border border-[#D49B35] text-xs focus:outline-none focus:ring-2 focus:ring-[#B92B27]" />
          <input id="adm-new-pass" type="password" required minlength="6" placeholder="新密碼（至少 6 碼）"
            class="px-3 py-2 rounded-xl bg-[#FFFDF8] border border-[#D49B35] text-xs focus:outline-none focus:ring-2 focus:ring-[#B92B27]" />
          <input id="adm-new-pass2" type="password" required minlength="6" placeholder="再次確認新密碼"
            class="px-3 py-2 rounded-xl bg-[#FFFDF8] border border-[#D49B35] text-xs focus:outline-none focus:ring-2 focus:ring-[#B92B27]" />
          <div class="sm:col-span-3 flex flex-wrap items-center justify-between gap-2">
            <div id="adm-chpass-err" class="text-xs font-bold text-red-700 hidden"></div>
            <button type="submit" class="px-4 py-2 rounded-xl bg-[#8E1B1B] hover:bg-[#701414] text-white text-xs font-bold">
              💾 更新我的密碼（同步至所有裝置）
            </button>
          </div>
        </form>
      </section>

      ${isSuper ? `
        <!-- 2. 最高權限管理員專屬：新增其他管理員帳號密碼 -->
        <section class="bg-[#FFF8E7] rounded-2xl border-2 border-[#D97706] p-4 space-y-3 text-sm">
          <div>
            <h3 class="font-bold text-base text-[#8E1B1B]">➕ 新增其他廟務管理員帳號</h3>
            <p class="text-xs text-[#6B4E3D] mt-0.5">
              建立後會立即同步至雲端，其他廟務人員即可用自己的帳號密碼從手機或電腦登入協助管理公佈欄與安太歲名單（所有密碼皆經加鹽 SHA-256 加密儲存）。
            </p>
          </div>
          <form id="adm-create-acct-form" class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label class="block text-[11px] font-bold text-[#5B3A24] mb-1">新管理員帳號（3～24 碼英數）</label>
              <input id="adm-add-user" type="text" required placeholder="例如：staff01、wang"
                class="w-full px-3 py-2 rounded-xl bg-white border border-[#D49B35] text-xs focus:outline-none focus:ring-2 focus:ring-[#B92B27]" />
            </div>
            <div>
              <label class="block text-[11px] font-bold text-[#5B3A24] mb-1">稱呼／姓名</label>
              <input id="adm-add-name" type="text" required placeholder="例如：總幹事阿國、會計小姐"
                class="w-full px-3 py-2 rounded-xl bg-white border border-[#D49B35] text-xs focus:outline-none focus:ring-2 focus:ring-[#B92B27]" />
            </div>
            <div>
              <label class="block text-[11px] font-bold text-[#5B3A24] mb-1">登入密碼（至少 6 碼）</label>
              <input id="adm-add-pass" type="password" required minlength="6" placeholder="請設定初始密碼"
                class="w-full px-3 py-2 rounded-xl bg-white border border-[#D49B35] text-xs focus:outline-none focus:ring-2 focus:ring-[#B92B27]" />
            </div>
            <div>
              <label class="block text-[11px] font-bold text-[#5B3A24] mb-1">管理權限等級</label>
              <select id="adm-add-role" class="w-full px-3 py-2 rounded-xl bg-white border border-[#D49B35] text-xs font-bold focus:outline-none">
                <option value="staff">🔑 一般廟務管理員（公佈欄／太歲／統計／改自己密碼）</option>
                <option value="super">👑 最高權限管理員（全部權限＋新增／刪除管理員）</option>
              </select>
            </div>
            <div class="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 pt-1">
              <div id="adm-add-err" class="text-xs font-bold text-red-700 hidden"></div>
              <button type="submit" class="px-5 py-2 rounded-xl bg-[#183C32] hover:bg-[#235245] text-[#FFFBF2] text-xs font-black">
                ➕ 建立管理員帳號
              </button>
            </div>
          </form>
        </section>

        <!-- 3. 現有管理員帳號清單 -->
        <section class="bg-white rounded-2xl border border-[#E5D3B3] p-4 space-y-3 text-sm">
          <h3 class="font-bold text-base text-[#8E1B1B]">👥 現有管理員帳號清單（共 ${accounts.length} 位）</h3>
          <div class="space-y-2">
            ${accounts.map((a) => {
              const isSelf = cur && cur.username === a.username;
              const isResetting = this.resettingUser === a.username;
              return `
                <div class="p-3 rounded-2xl bg-[#FFF9EE] border border-[#E5D3B3] space-y-2">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-1.5">
                        <span class="font-black text-sm text-[#3E1C11]">${this._esc(a.displayName)}</span>
                        <code class="text-xs px-2 py-0.5 rounded-lg bg-white border border-[#E5D3B3] font-mono text-[#6B4E3D]">${this._esc(a.username)}</code>
                        <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${a.role === 'super' ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#E0F2FE] text-[#075985]'}">
                          ${a.role === 'super' ? '👑 最高權限' : '🔑 一般管理員'}
                        </span>
                        ${isSelf ? '<span class="text-[11px] font-bold text-[#047857]">（目前登入）</span>' : ''}
                      </div>
                      <div class="text-[11px] text-[#7A5944] mt-0.5">建立：${this._esc(a.createdAt || '系統')}</div>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                      ${!isSelf ? `
                        <button type="button" data-toggle-reset="${this._esc(a.username)}"
                          class="px-3 py-1.5 rounded-xl bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] text-xs font-bold">
                          🔑 重設密碼
                        </button>
                        <button type="button" data-del-acct="${this._esc(a.username)}"
                          class="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold">
                          🗑️ 移除
                        </button>
                      ` : '<span class="text-xs text-[#7A5944]">請由上方表單改密碼</span>'}
                    </div>
                  </div>
                  ${isResetting ? `
                    <form data-reset-form="${this._esc(a.username)}" class="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#E5D3B3]">
                      <input type="password" required minlength="6" placeholder="輸入「${this._esc(a.username)}」的新密碼（至少 6 碼）"
                        class="flex-1 px-3 py-1.5 rounded-xl bg-white border border-[#D49B35] text-xs" />
                      <div class="flex gap-1.5">
                        <button type="submit" class="px-3.5 py-1.5 rounded-xl bg-[#8E1B1B] text-white text-xs font-bold">確認重設</button>
                        <button type="button" data-cancel-reset class="px-3 py-1.5 rounded-xl bg-gray-200 text-gray-700 text-xs font-bold">取消</button>
                      </div>
                    </form>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}
    `;
  }

  _bindAccountsEvents() {
    this.modalRoot.querySelector('#adm-chpass-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const curP = this.modalRoot.querySelector('#adm-cur-pass')?.value || '';
      const newP = this.modalRoot.querySelector('#adm-new-pass')?.value || '';
      const newP2 = this.modalRoot.querySelector('#adm-new-pass2')?.value || '';
      const errEl = this.modalRoot.querySelector('#adm-chpass-err');
      if (errEl) errEl.classList.add('hidden');
      if (newP !== newP2) {
        if (errEl) { errEl.textContent = '❌ 兩次輸入的新密碼不一致'; errEl.classList.remove('hidden'); }
        return;
      }
      const res = await storageSync.changeOwnAdminPassword(curP, newP);
      if (res.ok) {
        soundEngine.playBlessingChime();
        this._flashStatus('您的管理員密碼已更新並同步至雲端！下次請使用新密碼登入。');
        this.renderDashboard();
      } else if (errEl) {
        errEl.textContent = '❌ ' + (res.message || '更新失敗');
        errEl.classList.remove('hidden');
      }
    });

    this.modalRoot.querySelector('#adm-create-acct-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = this.modalRoot.querySelector('#adm-add-user')?.value.trim() || '';
      const displayName = this.modalRoot.querySelector('#adm-add-name')?.value.trim() || '';
      const password = this.modalRoot.querySelector('#adm-add-pass')?.value || '';
      const role = this.modalRoot.querySelector('#adm-add-role')?.value || 'staff';
      const errEl = this.modalRoot.querySelector('#adm-add-err');
      if (errEl) errEl.classList.add('hidden');

      const res = await storageSync.createAdminAccount({ username, displayName, password, role });
      if (res.ok) {
        soundEngine.playBlessingChime();
        this._flashStatus(`已新增管理員「${res.displayName}（帳號：${res.username}）」，對方立即可用新帳號密碼登入！`);
        this.renderDashboard();
      } else if (errEl) {
        errEl.textContent = '❌ ' + (res.message || '建立失敗');
        errEl.classList.remove('hidden');
      }
    });

    this.modalRoot.querySelectorAll('[data-toggle-reset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const u = btn.getAttribute('data-toggle-reset');
        this.resettingUser = this.resettingUser === u ? '' : u;
        this.renderDashboard();
      });
    });

    this.modalRoot.querySelectorAll('[data-cancel-reset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.resettingUser = '';
        this.renderDashboard();
      });
    });

    this.modalRoot.querySelectorAll('[data-reset-form]').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = form.getAttribute('data-reset-form');
        const newP = form.querySelector('input[type="password"]')?.value || '';
        const res = await storageSync.resetOtherAdminPassword(u, newP);
        if (res.ok) {
          soundEngine.playBlessingChime();
          this.resettingUser = '';
          this._flashStatus(`已成功重設帳號「${u}」的登入密碼！`);
          this.renderDashboard();
        } else {
          alert(res.message || '重設失敗');
        }
      });
    });

    this.modalRoot.querySelectorAll('[data-del-acct]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const u = btn.getAttribute('data-del-acct');
        if (!confirm(`確定要移除管理員帳號「${u}」嗎？移除後對方將無法再登入後臺。`)) return;
        const res = await storageSync.deleteAdminAccount(u);
        if (res.ok) {
          soundEngine.playSoftClick();
          this._flashStatus(`已移除管理員帳號「${u}」`);
          this.renderDashboard();
        } else {
          alert(res.message || '移除失敗');
        }
      });
    });
  }

  _renderSystemTab() {
    const dbUrl = storageSync.getCloudDbUrl();
    const acct = storageSync.getCurrentAdminAccount();
    const isSuper = storageSync.isSuperAdmin();
    const bw = storageSync.getBandwidthSaverConfig();
    const crowd = window.__deciScene?.getRemotePeerRenderStats?.() || { rendered: 0, totalRemote: 0, cap: 30 };
    return `
      <section class="bg-[#ECFDF5] rounded-2xl border-2 border-[#10B981] p-4 space-y-2.5 text-sm">
        <h3 class="font-bold text-base text-[#065F46]">🛡️ 系統權限與即時串流／效能狀態（V53）</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div class="p-2.5 rounded-xl bg-white border border-[#A7F3D0]">
            <div class="text-[#047857] font-bold">目前登入管理員</div>
            <div class="mt-0.5 font-extrabold text-[#183C32]">
              ${isSuper ? '👑 最高權限' : '🔑 一般管理員'}：${this._esc(acct?.username || '')}
            </div>
          </div>
          <div class="p-2.5 rounded-xl bg-white border border-[#A7F3D0]">
            <div class="text-[#047857] font-bold">⚡ 多人即時傳輸模式（極致省流量）</div>
            <div class="mt-0.5 font-extrabold text-[#183C32]">
              ${bw.sdkConnected
                ? '✅ Firebase SDK WebSocket 即時推播（零輪詢）'
                : bw.sdkStreamActive
                  ? '⏳ Firebase SDK 串流連線中…'
                  : `🔄 省流量輪詢（共享 ${bw.sharedPollMs / 1000}s｜統計 ${bw.visitStatsPollMs / 1000}s）`}
            </div>
          </div>
          <div class="p-2.5 rounded-xl bg-white border border-[#A7F3D0]">
            <div class="text-[#047857] font-bold">📱 3D 同屏人數上限保護</div>
            <div class="mt-0.5 font-extrabold text-[#183C32]">
              本裝置上限 ${crowd.cap} 人（手機 15／桌機 30）
            </div>
          </div>
        </div>
        <p class="text-xs text-[#064E3B] leading-relaxed">
          所有管理員密碼皆以 <strong>加鹽 SHA-256 雜湊</strong>加密同步；<code>presence</code>、<code>chat</code>（最新 ${bw.chatLimitToLast} 則）與結緣互動採用 <strong>Firebase SDK WebSocket 增量推播＋斷線自動清理（onDisconnect）</strong>。
        </p>
      </section>

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
