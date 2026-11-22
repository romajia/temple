/**
 * V5 玩家登入後底部即時聊天對話框（需求 #15 & #16）
 * ------------------------------------------------------------
 * - 實際玩家登入後，畫面正下方常駐優雅的聊天輸入條
 * - 送出後文字立即「浮現在主角 3D 頭頂上」並透過多人連線同步給同場所有玩家頭頂與聊天紀錄！
 * - 支援展開／收合即時聊天紀錄抽屜、快捷祝福語、敏感詞過濾與 2 秒防洗版
 */
import { storageSync, sanitizeChatText } from '../services/storageSync.js';
import { soundEngine } from '../audio/soundEngine.js';

const QUICK_SAY = ['大家好🙏', '祈求平安順利✨', '德慈宮夜景好美🌙', '有人一起念經嗎🪵'];

export class WorldChatBarUI {
  constructor(root, { onSpeak }) {
    this.root = root;
    this.onSpeak = onSpeak;
    this.mounted = false;
    this.drawerOpen = false;
    this.lastSendAt = 0;

    storageSync.subscribe('chat', () => {
      if (this.mounted && this.drawerOpen) this._renderMessages();
    });
  }

  mount() {
    this.mounted = true;
    this.root.innerHTML = `
      <div id="world-chat-container" class="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 w-[92vw] sm:w-[460px] max-w-[calc(100vw-24px)] flex flex-col items-center gap-1.5 pointer-events-auto">
        <!-- 可展開的即時聊天紀錄抽屜（★ 溫潤宣紙底＋深墨字高對比閱讀優化！） -->
        <div id="wc-drawer" class="hidden w-full bg-[#FFFBF2] border-2 border-[#C98A28] rounded-2xl shadow-2xl overflow-hidden text-[#1C2D28] animate-fade-in">
          <div class="px-3.5 py-2 bg-[#F4E6C8] border-b border-[#D4B47C] flex items-center justify-between text-xs">
            <span class="font-black text-[#8E1515]">💬 廟埕即時聊天頻道（訊息同步浮現頭頂）</span>
            <button id="wc-close-drawer" type="button" class="text-[#183C32] hover:text-[#8E1515] font-black px-1">收合 ▼</button>
          </div>
          <div id="wc-msg-list" class="max-h-40 overflow-y-auto p-2.5 space-y-1.5 text-xs"></div>
          <div class="px-2.5 pb-2 pt-1 bg-[#FAF1DC] border-t border-[#E6D2AE] flex flex-wrap gap-1">
            ${QUICK_SAY.map(s => `
              <button type="button" data-wc-quick="${s}"
                class="px-2.5 py-0.5 rounded-full bg-white hover:bg-[#FEF3C7] border border-[#C98A28] text-[11px] font-bold text-[#3B2010] transition">
                ${s}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- 主輸入列（常駐底部） -->
        <form id="wc-form" class="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-2xl bg-[#FFFBF2] border-2 border-[#C98A28] shadow-[0_8px_24px_rgba(16,28,22,0.28)]">
          <button id="wc-toggle-drawer" type="button" title="展開/收合聊天紀錄"
            class="shrink-0 px-2.5 h-8 rounded-xl bg-[#F3E6CA] hover:bg-[#E7D1A4] text-[#3B2010] text-xs font-black transition flex items-center gap-1 border border-[#D4B47C]">
            <span>💬</span>
            <span class="hidden sm:inline">紀錄</span>
          </button>
          <input id="wc-input" type="text" maxlength="45" autocomplete="off"
            placeholder="輸入聊天內容，送出會浮在角色頭頂喔…"
            class="flex-1 min-w-0 bg-white text-[#183C32] placeholder-[#6B7A72] border border-[#D4C3A1] text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8E1515]" />
          <button type="submit"
            class="shrink-0 px-3.5 h-8 rounded-xl bg-[#8E1515] hover:bg-[#701010] text-[#FFFDF6] text-xs font-black shadow transition active:scale-95">
            送出
          </button>
        </form>
      </div>
    `;

    const drawer = this.root.querySelector('#wc-drawer');
    const toggleBtn = this.root.querySelector('#wc-toggle-drawer');
    const closeBtn = this.root.querySelector('#wc-close-drawer');
    const form = this.root.querySelector('#wc-form');
    const input = this.root.querySelector('#wc-input');

    const toggleDrawer = (force) => {
      this.drawerOpen = typeof force === 'boolean' ? force : !this.drawerOpen;
      drawer.classList.toggle('hidden', !this.drawerOpen);
      if (this.drawerOpen) this._renderMessages();
    };

    toggleBtn?.addEventListener('click', () => {
      soundEngine.playSoftClick();
      toggleDrawer();
    });
    closeBtn?.addEventListener('click', () => toggleDrawer(false));

    this.root.querySelectorAll('[data-wc-quick]').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-wc-quick');
        this._submitText(text);
      });
    });

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = input.value.trim();
      if (!raw) return;
      if (this._submitText(raw)) {
        input.value = '';
      }
    });
  }

  _submitText(raw) {
    const now = Date.now();
    if (now - this.lastSendAt < 1800) {
      return false;
    }
    const { clean } = sanitizeChatText(raw);
    if (!clean) return false;
    this.lastSendAt = now;

    const player = storageSync.getPlayer();
    const sender = player.name || '虔誠香客';

    soundEngine.playSoftClick();
    storageSync.addChatMessage({
      sender,
      role: 'player',
      avatar: '🙏',
      text: clean
    });
    this.onSpeak?.(clean);
    if (this.drawerOpen) this._renderMessages();
    return true;
  }

  _renderMessages() {
    const listEl = this.root.querySelector('#wc-msg-list');
    if (!listEl) return;
    const msgs = storageSync.getChatMessages().slice(-24);
    listEl.innerHTML = msgs.map(m => `
      <div class="flex items-start gap-1.5 leading-snug">
        <span class="shrink-0">${m.avatar || '🙏'}</span>
        <div class="min-w-0">
          <span class="font-black ${m.role === 'keeper' ? 'text-[#8E1515]' : m.role === 'player' ? 'text-[#0F766E]' : 'text-[#1D4ED8]'}">${this._esc(m.sender)}：</span>
          <span class="text-[#1C2D28] font-medium break-words">${this._esc(m.text)}</span>
        </div>
      </div>
    `).join('');
    listEl.scrollTop = listEl.scrollHeight;
  }

  _esc(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
}
