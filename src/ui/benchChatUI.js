/**
 * 廟門左側「木頭板凳聊天室」(V2)
 * 新增：基本禮貌提示、2.5 秒發言冷卻防刷屏、不雅詞彙自動過濾，並同步玩家頭頂氣泡！
 */
import { storageSync, sanitizeChatText } from '../services/storageSync.js';
import { generateBenchAIReply } from '../services/aiTempleKeeper.js';
import { soundEngine } from '../audio/soundEngine.js';

const QUICK_CHIPS = [
  '大家平安！剛來德慈宮拜拜 🙏',
  '請問怎麼求籤跟解籤？',
  '想幫家人點一盞安太歲燈',
  '最近工作有點累，來吹吹風',
  '新廟建廟進度如何了呢？'
];

export class BenchChatUI {
  constructor(container, { onStandUp, onPlayerSpeak }) {
    this.container = container;
    this.onStandUp = onStandUp;
    this.onPlayerSpeak = onPlayerSpeak;
    this.isOpen = false;
    this.lastSendTime = 0;
    this.cooldownMs = 2500;

    storageSync.subscribe('chat', () => {
      if (this.isOpen) this.renderMessages();
    });
  }

  open() {
    this.isOpen = true;
    this.render();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.container.innerHTML = '';
    this.onStandUp?.();
  }

  render() {
    const player = storageSync.getPlayer();
    const syncLabel = storageSync.getSyncModeLabel();

    this.container.innerHTML = `
      <div class="fixed left-3 right-3 sm:left-5 sm:right-auto bottom-20 z-40 sm:w-[400px] bg-[#FFFBF2]/92 backdrop-blur-md border-2 border-[#B46B24] rounded-2xl shadow-2xl overflow-hidden text-[#261109] animate-fade-in">
        <div class="bg-gradient-to-r from-[#5A2A14] to-[#7D3E1E] px-4 py-2.5 flex items-center justify-between text-[#FFF8E2]">
          <div>
            <div class="font-bold text-sm flex items-center gap-1.5">
              <span>🪑</span> 廟前木頭板凳・香客聊天區
            </div>
            <div class="text-[11px] text-[#FFE8A8] flex items-center gap-1.5">
              <span class="inline-block w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse"></span>
              <span>${syncLabel}</span>
            </div>
          </div>
          <button id="bench-stand-up" class="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-xs font-bold border border-white/40">
            起身走動 ✕
          </button>
        </div>

        <!-- 禮貌與防刷屏提示列 -->
        <div class="px-3 py-1.5 bg-[#FEF3C7] border-b border-[#E6B44C] text-[11px] text-[#6B3410] font-semibold flex items-center justify-between gap-2">
          <span>🙏 廟埕清淨地，請互相尊重、口說好話喔！</span>
          <span class="text-[#8E1515] font-bold shrink-0">${this._esc(player.name || '虔誠香客')}</span>
        </div>

        <div id="bench-messages" class="h-[220px] overflow-y-auto p-3 space-y-2.5 text-sm"></div>

        <div id="bench-notice" class="px-3 pb-1 text-[11px] text-[#B91C1C] font-bold hidden"></div>
        <div id="bench-typing" class="px-3 pb-1 text-[11px] text-[#78350F] italic hidden">
          👴 阿財伯／熱心香客正在端茶接話中…
        </div>

        <div class="px-3 py-1.5 flex gap-1.5 overflow-x-auto border-t border-[#EBD8B7] bg-[#FFF5E2]">
          ${QUICK_CHIPS.map(txt => `
            <button data-chip="${this._esc(txt)}" class="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white border border-[#C98A28] text-[#5A2A14] hover:bg-[#FEF3C7] transition">
              ${this._esc(txt)}
            </button>
          `).join('')}
        </div>

        <form id="bench-form" class="p-2.5 bg-[#FFFBF2] border-t border-[#E5CFA6] flex items-center gap-2">
          <input id="bench-input" type="text" maxlength="120" placeholder="坐下聊聊天，說聲平安或問問廟公..."
            class="flex-1 px-3 py-2 rounded-xl bg-white border-2 border-[#C98A28] text-sm font-medium text-[#261109] focus:outline-none focus:ring-2 focus:ring-[#D97706]" />
          <button type="submit" class="px-4 py-2 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-[#FFF9E6] text-sm font-bold shadow">
            送出
          </button>
        </form>
      </div>
    `;

    this.renderMessages();

    this.container.querySelector('#bench-stand-up')?.addEventListener('click', () => this.close());
    this.container.querySelectorAll('[data-chip]').forEach(btn => {
      btn.addEventListener('click', () => this._sendUserMessage(btn.getAttribute('data-chip')));
    });

    this.container.querySelector('#bench-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = this.container.querySelector('#bench-input');
      const text = input.value.trim();
      if (!text) return;
      if (this._sendUserMessage(text)) {
        input.value = '';
      }
    });
  }

  _showNotice(msg) {
    const el = this.container.querySelector('#bench-notice');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 2600);
  }

  _sendUserMessage(rawText) {
    const now = Date.now();
    const waitLeft = this.cooldownMs - (now - this.lastSendTime);
    if (waitLeft > 0) {
      this._showNotice(`⏳ 發言太快囉～請稍候 ${(waitLeft / 1000).toFixed(1)} 秒再送出（防刷屏保護）`);
      return false;
    }

    const { clean, flagged } = sanitizeChatText(rawText);
    if (!clean) return false;
    if (flagged) {
      this._showNotice('🙏 已自動修飾不雅字詞，廟埕清淨地請一起口說好話喔！');
    }

    this.lastSendTime = now;
    const nickname = storageSync.getPlayer().name || '虔誠香客';
    soundEngine.playSoftClick();

    storageSync.addChatMessage({
      sender: nickname,
      role: 'player',
      avatar: '🙏',
      text: clean
    });
    this.onPlayerSpeak?.(clean);

    const typingEl = this.container.querySelector('#bench-typing');
    if (typingEl) typingEl.classList.remove('hidden');

    setTimeout(() => {
      const reply = generateBenchAIReply(clean, nickname);
      storageSync.addChatMessage(reply);
      if (typingEl) typingEl.classList.add('hidden');
      soundEngine.playSoftClick();
    }, 1150 + Math.random() * 1100);

    return true;
  }

  renderMessages() {
    const listEl = this.container.querySelector('#bench-messages');
    if (!listEl) return;
    const msgs = storageSync.getChatMessages();

    listEl.innerHTML = msgs.map(m => {
      const isPlayer = m.role === 'player';
      const timeStr = new Date(m.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="flex flex-col ${isPlayer ? 'items-end' : 'items-start'}">
          <div class="text-[11px] text-[#5C3A21] mb-0.5 px-1 font-semibold">
            ${m.avatar || '🙏'} <strong>${this._esc(m.sender)}</strong> · ${timeStr}
          </div>
          <div class="max-w-[86%] px-3 py-2 rounded-2xl text-xs sm:text-[13px] font-medium leading-relaxed shadow-sm ${
            isPlayer
              ? 'bg-[#B91C1C] text-[#FFFDF5] rounded-tr-sm'
              : m.role === 'keeper'
                ? 'bg-[#FEF3C7] border border-[#D97706] text-[#2B130B] rounded-tl-sm'
                : 'bg-white border border-[#DEC9A2] text-[#261109] rounded-tl-sm'
          }">
            ${this._esc(m.text)}
          </div>
        </div>
      `;
    }).join('');

    listEl.scrollTop = listEl.scrollHeight;
  }

  _esc(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
}
