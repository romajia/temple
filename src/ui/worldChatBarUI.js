/**
 * V7 底部統一即時聊天紀錄（完整整合廟埕聊天 ＋ 板凳／椅子聊天 ＋ 多人即時發言紀錄！）
 * ------------------------------------------------------------
 * - 坐上任何木頭板凳／長椅時，直接從此處統一「💬 紀錄」抽屜彈開（不再另開第二個視窗！）
 * - 內建「收合 ▼」與「起身走動」切換，收合後仍安坐板凳欣賞廟景
 * - 只有 1 位真人上線時由廟公阿財伯陪聊；超過 1 位真人上線時關閉 NPC 自動回話
 * - 強化「廟埕清淨守護機制」：單字髒話（幹／操等）與穿插符號自動以「*」號淨化，累犯 3 次啟動 60 秒靜心冷卻
 */
import { storageSync, sanitizeChatText } from '../services/storageSync.js';
import { generateBenchAIReply } from '../services/aiTempleKeeper.js';
import { soundEngine } from '../audio/soundEngine.js';

const QUICK_SAY = [
  '大家好🙏',
  '祈求平安順利✨',
  '德慈宮夜景好美🌙',
  '有人一起念經嗎📿'
];

export class WorldChatBarUI {
  constructor(root, { onSpeak, onStandUp }) {
    this.root = root;
    this.onSpeak = onSpeak;
    this.onStandUp = onStandUp;
    this.mounted = false;
    this.drawerOpen = false;
    this.benchMode = false;
    this.benchTitle = '';
    this.lastSendAt = 0;
    this.unreadCount = 0;
    this.lastSeenMsgCount = storageSync.getChatMessages().length;
    this._lastRenderSig = '';
    this._userScrolledUp = false;
    this._npcReplyTimer = null;

    storageSync.subscribe('chat', () => {
      if (!this.mounted) return;
      const total = storageSync.getChatMessages().length;
      if (this.drawerOpen) {
        this.unreadCount = 0;
        this.lastSeenMsgCount = total;
        this._renderMessages({ forceScrollBottom: false });
      } else if (total > this.lastSeenMsgCount) {
        this.unreadCount += (total - this.lastSeenMsgCount);
        this.lastSeenMsgCount = total;
        this._updateUnreadBadge();
      }
    });

    storageSync.subscribe('presence', () => {
      if (this.mounted) this._updateModeHeader();
    });
  }

  mount() {
    if (this.mounted) return;
    this.mounted = true;
    this.lastSeenMsgCount = storageSync.getChatMessages().length;
    this.root.innerHTML = `
      <div id="world-chat-container" class="fixed bottom-2.5 left-2.5 right-2.5 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-30 sm:w-[475px] flex flex-col items-center gap-1.5 pointer-events-auto">
        <!-- 廟埕清淨提醒／冷卻浮動通知條 -->
        <div id="wc-guard-banner" class="hidden w-full px-3 py-2 rounded-xl bg-[#FEF2F2] border-2 border-[#B91C1C] text-[#7F1D1D] text-xs font-black shadow-lg text-center animate-fade-in"></div>

        <!-- 統一聊天紀錄抽屜（廟埕聊天 ＋ 板凳聊天 ＋ 多人發言全部整合於此！） -->
        <div id="wc-drawer" class="hidden w-full bg-[#FFFBF2] border-2 border-[#C98A28] rounded-2xl shadow-2xl overflow-hidden text-[#1C2D28] animate-fade-in">
          <div class="px-3.5 py-2 bg-[#F4E6C8] border-b border-[#D4B47C] flex items-center justify-between gap-2 text-xs">
            <div class="min-w-0">
              <div id="wc-header-title" class="font-black text-[#8E1515] truncate">💬 廟埕＆板凳統一聊天紀錄</div>
              <div id="wc-mode-sub" class="text-[10px] font-bold text-[#4A2E1B] truncate"></div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <button id="wc-stand-up-drawer" type="button" class="hidden px-2 py-0.5 rounded-lg bg-[#8E1515] hover:bg-[#701010] text-[#FFFDF6] font-black text-[11px] whitespace-nowrap">起身走動</button>
              <button id="wc-close-drawer" type="button" class="text-[#183C32] hover:text-[#8E1515] font-black px-2 py-0.5 rounded-lg bg-white/70 border border-[#D4B47C] whitespace-nowrap">收合 ▼</button>
            </div>
          </div>
          <div class="relative">
            <div id="wc-msg-list" class="max-h-52 overflow-y-auto p-2.5 space-y-1.5 text-xs"></div>
            <button id="wc-jump-latest" type="button"
              class="hidden absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#8E1515] hover:bg-[#701010] text-[#FFFDF6] text-[11px] font-black shadow-lg border border-[#FAD364] transition">
              ↓ 有新紀錄・跳至最新
            </button>
          </div>
          <div class="px-2.5 pb-2 pt-1.5 bg-[#FAF1DC] border-t border-[#E6D2AE] flex flex-wrap gap-1.5">
            ${QUICK_SAY.map(s => `
              <button type="button" data-wc-quick="${s}"
                class="px-2.5 py-1 rounded-full bg-white hover:bg-[#FEF3C7] border border-[#C98A28] text-[11px] font-extrabold text-[#3B2010] transition">
                ${s}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- 主輸入列（常駐底部） -->
        <form id="wc-form" class="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-2xl bg-[#FFFBF2] border-2 border-[#C98A28] shadow-[0_8px_24px_rgba(16,28,22,0.28)]">
          <button id="wc-toggle-drawer" type="button" title="展開/收合統一聊天紀錄"
            class="relative shrink-0 px-2.5 h-8 rounded-xl bg-[#F3E6CA] hover:bg-[#E7D1A4] text-[#3B2010] text-xs font-black transition flex items-center gap-1 border border-[#D4B47C]">
            <span id="wc-toggle-icon">💬</span>
            <span>紀錄</span>
            <span id="wc-unread-badge" class="hidden -top-1.5 -right-1.5 absolute min-w-[18px] h-[18px] px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-black flex items-center justify-center shadow">0</span>
          </button>
          <button id="wc-stand-up-bar" type="button" title="離開板凳起身走動"
            class="hidden shrink-0 px-2 h-8 rounded-xl bg-[#5A2A14] hover:bg-[#7D3E1E] text-[#FFF8E2] text-[11px] font-black transition whitespace-nowrap">
            🪑起身
          </button>
          <input id="wc-input" type="text" maxlength="60" autocomplete="off"
            placeholder="輸入聊天內容，送出會浮在頭頂並存入紀錄…"
            class="flex-1 min-w-0 bg-white text-[#183C32] placeholder-[#6B7A72] border border-[#D4C3A1] text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8E1515]" />
          <button type="submit"
            class="shrink-0 px-3.5 h-8 rounded-xl bg-[#8E1515] hover:bg-[#701010] text-[#FFFDF6] text-xs font-black shadow transition active:scale-95">
            送出
          </button>
        </form>
      </div>
    `;

    const toggleBtn = this.root.querySelector('#wc-toggle-drawer');
    const closeBtn = this.root.querySelector('#wc-close-drawer');
    const standBtnDrawer = this.root.querySelector('#wc-stand-up-drawer');
    const standBtnBar = this.root.querySelector('#wc-stand-up-bar');
    const form = this.root.querySelector('#wc-form');
    const input = this.root.querySelector('#wc-input');

    toggleBtn?.addEventListener('click', () => {
      soundEngine.playSoftClick();
      this.setDrawerOpen(!this.drawerOpen);
    });
    closeBtn?.addEventListener('click', () => {
      soundEngine.playSoftClick();
      this.setDrawerOpen(false);
    });

    const handleStandUp = () => {
      soundEngine.playSoftClick();
      this.exitBenchMode();
      this.onStandUp?.();
    };
    standBtnDrawer?.addEventListener('click', handleStandUp);
    standBtnBar?.addEventListener('click', handleStandUp);

    this.root.querySelectorAll('[data-wc-quick]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (btn.disabled) return;
        btn.disabled = true;
        setTimeout(() => { btn.disabled = false; }, 1200);
        const text = btn.getAttribute('data-wc-quick');
        this._submitText(text);
      });
    });

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = input.value.trim();
      if (!raw) return;
      const ok = this._submitText(raw);
      if (ok) {
        input.value = '';
      }
    });

    const listEl = this.root.querySelector('#wc-msg-list');
    const jumpLatestBtn = this.root.querySelector('#wc-jump-latest');
    listEl?.addEventListener('scroll', () => {
      const distFromBottom = listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight;
      this._userScrolledUp = distFromBottom > 32;
      if (!this._userScrolledUp) {
        jumpLatestBtn?.classList.add('hidden');
      }
    });
    jumpLatestBtn?.addEventListener('click', () => {
      soundEngine.playSoftClick();
      if (listEl) listEl.scrollTop = listEl.scrollHeight;
      this._userScrolledUp = false;
      jumpLatestBtn.classList.add('hidden');
    });

    this._updateModeHeader();
  }

  setDrawerOpen(open) {
    if (!this.mounted) return;
    const drawer = this.root.querySelector('#wc-drawer');
    if (!drawer) return;
    this.drawerOpen = Boolean(open);
    drawer.classList.toggle('hidden', !this.drawerOpen);
    if (this.drawerOpen) {
      this.unreadCount = 0;
      this.lastSeenMsgCount = storageSync.getChatMessages().length;
      this._userScrolledUp = false;
      this._updateUnreadBadge();
      this._updateModeHeader();
      this._renderMessages({ forceScrollBottom: true });
    }
  }

  /**
   * ★ V32 坐上任何板凳／椅子時，不自動彈開聊天視窗（保持畫面清爽欣賞廟景）；
   *   若有人發言時底部「💬 紀錄」按鈕將跳出紅色未讀數字，角色想聊隨時點開即可！
   */
  enterBenchMode(title = '廟埕板凳聊天') {
    this.benchMode = true;
    this.benchTitle = title;
    if (!this.mounted) return;
    this._syncBenchUI();
    this._updateUnreadBadge();
    const input = this.root.querySelector('#wc-input');
    if (input) input.placeholder = '安坐板凳乘涼～想聊直接輸入或點左側「紀錄」展開…';
  }

  exitBenchMode() {
    if (!this.benchMode) return;
    this.benchMode = false;
    this.benchTitle = '';
    if (!this.mounted) return;
    this._syncBenchUI();
    const input = this.root.querySelector('#wc-input');
    if (input) input.placeholder = '輸入聊天內容，送出會浮在頭頂並存入紀錄…';
  }

  _syncBenchUI() {
    const titleEl = this.root.querySelector('#wc-header-title');
    const iconEl = this.root.querySelector('#wc-toggle-icon');
    const standDrawer = this.root.querySelector('#wc-stand-up-drawer');
    const standBar = this.root.querySelector('#wc-stand-up-bar');
    if (titleEl) {
      titleEl.textContent = this.benchMode
        ? `🪑 ${this.benchTitle || '板凳聊天'}・統一聊天紀錄`
        : '💬 廟埕＆板凳統一聊天紀錄';
    }
    if (iconEl) iconEl.textContent = this.benchMode ? '🪑' : '💬';
    standDrawer?.classList.toggle('hidden', !this.benchMode);
    standBar?.classList.toggle('hidden', !this.benchMode);
  }

  _updateUnreadBadge() {
    const badge = this.root.querySelector('#wc-unread-badge');
    if (!badge) return;
    if (this.unreadCount > 0 && !this.drawerOpen) {
      badge.textContent = this.unreadCount > 9 ? '9+' : String(this.unreadCount);
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  _updateModeHeader() {
    const sub = this.root.querySelector('#wc-mode-sub');
    if (!sub) return;
    sub.textContent = storageSync.getSyncModeLabel();
  }

  _showGuardNotice(msg, duration = 4200) {
    const el = this.root.querySelector('#wc-guard-banner');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(this._guardTimer);
    this._guardTimer = setTimeout(() => el.classList.add('hidden'), duration);
  }

  _submitText(raw) {
    // 1. 檢查是否處於「廟埕清淨靜心冷卻」中
    const muteLeft = storageSync.getChatMuteRemainingMs();
    if (muteLeft > 0) {
      const sec = Math.ceil(muteLeft / 1000);
      this._showGuardNotice(`🙏 廟埕清淨靜心冷卻中（剩餘 ${sec} 秒），請平心靜氣、口說好話喔！`, 3400);
      return false;
    }

    // 2. 防洗版冷卻
    const now = Date.now();
    if (now - this.lastSendAt < 1800) {
      this._showGuardNotice('⏳ 發言間隔太短，請稍候再送出喔～', 1800);
      return false;
    }

    // 3. ★ 廟埕清淨守護：偵測髒話（含單字「幹／操」與穿插符號），自動以「*」號淨化並累犯靜心冷卻！
    const { clean, flagged } = sanitizeChatText(raw);
    if (!clean) return false;
    if (flagged) {
      const { strikes, mutedSeconds, penalty } = storageSync.recordProfanityViolation();
      if (mutedSeconds > 0) {
        this._showGuardNotice(`🙏 多次偵測到不雅字詞，已淨化、扣除 ${penalty || 3} 功德並啟動「靜心冷卻 ${mutedSeconds} 秒」！`, 5200);
      } else {
        this._showGuardNotice(`🙏 廟埕乃神明清淨聖地，說髒話已以 * 號淨化並扣除 ${penalty || 3} 功德！請口說好話（提醒 ${strikes}/3）`, 4400);
      }
    }

    this.lastSendAt = now;
    const player = storageSync.getPlayer();
    const sender = player.name || '虔誠香客';

    soundEngine.playSoftClick();
    storageSync.addChatMessage({
      sender,
      role: 'player',
      avatar: '🙏',
      channel: this.benchMode ? 'bench' : '',
      text: clean
    });
    this.onSpeak?.(clean);
    if (this.drawerOpen) this._renderMessages({ forceScrollBottom: true });

    // 4. ★ 只有目前僅 1 位真人上線時才由 NPC 親切回話；超過 1 位真人上線時不觸發 NPC 對話！
    if (storageSync.getRealPlayerCount() <= 1 && !flagged) {
      clearTimeout(this._npcReplyTimer);
      this._npcReplyTimer = setTimeout(() => {
        if (storageSync.getRealPlayerCount() > 1) return;
        const reply = generateBenchAIReply(clean, sender);
        storageSync.addChatMessage({ ...reply, channel: this.benchMode ? 'bench' : '' });
      }, 1250 + Math.random() * 800);
    }

    return true;
  }

  _renderMessages({ forceScrollBottom = false } = {}) {
    const listEl = this.root.querySelector('#wc-msg-list');
    if (!listEl) return;
    const msgs = storageSync.getChatMessages().slice(-80);
    const last = msgs[msgs.length - 1];
    const sig = `${msgs.length}|${last?.id || ''}|${last?.timestamp || ''}|${last?.text || ''}`;

    // ★ V33 輪詢若無新訊息絕不重繪 DOM，完全保留玩家向上捲動翻看歷史紀錄的位置！
    if (!forceScrollBottom && sig === this._lastRenderSig) {
      return;
    }

    const prevScrollTop = listEl.scrollTop;
    const prevDistFromBottom = listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight;
    const wasAtBottom = prevDistFromBottom <= 36;
    const hadPreviousContent = Boolean(this._lastRenderSig);
    this._lastRenderSig = sig;

    listEl.innerHTML = msgs.map(m => {
      const timeStr = m.timestamp
        ? new Date(m.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
        : '';
      const isPeer = m.role === 'peer';
      const roleColor = m.role === 'keeper'
        ? 'text-[#8E1515]'
        : m.role === 'player'
          ? 'text-[#0F766E]'
          : 'text-[#1D4ED8]';
      const benchTag = m.channel === 'bench'
        ? '<span class="inline-block px-1 py-0.2 rounded bg-[#FEF3C7] border border-[#D97706] text-[9px] font-black text-[#92400E] mr-1">🪑板凳</span>'
        : '';
      const peerTag = isPeer
        ? '<span class="text-[10px] text-[#2563EB] font-bold ml-1">(連線)</span>'
        : '';
      return `
        <div class="flex items-start gap-1.5 leading-snug ${isPeer ? 'bg-[#EFF6FF] border-[#93C5FD]' : 'bg-white/80 border-[#EFE2C6]'} rounded-xl px-2.5 py-1.5 border">
          <span class="shrink-0">${this._esc(m.avatar || '🙏')}</span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-1">
              <span class="font-black ${roleColor} truncate">${benchTag}${this._esc(m.sender)}${peerTag}</span>
              <span class="text-[10px] text-[#8B7355] shrink-0">${timeStr}</span>
            </div>
            <div class="text-[#1C2D28] font-medium break-words mt-0.5">${this._esc(m.text)}</div>
          </div>
        </div>
      `;
    }).join('');

    const jumpLatestBtn = this.root.querySelector('#wc-jump-latest');
    if (forceScrollBottom || !hadPreviousContent || (wasAtBottom && !this._userScrolledUp)) {
      listEl.scrollTop = listEl.scrollHeight;
      this._userScrolledUp = false;
      jumpLatestBtn?.classList.add('hidden');
    } else {
      // 玩家正在往回翻閱先前紀錄：穩穩停在原本閱讀高度，並顯示可手動點擊的「↓ 有新紀錄」浮動按鈕！
      listEl.scrollTop = prevScrollTop;
      jumpLatestBtn?.classList.remove('hidden');
    }
  }

  _esc(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
}
