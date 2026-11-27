/**
 * 廟埕／樹蔭「木頭板凳聊天室」(V3)
 * - 完整整合進統一「聊天紀錄」（與底部聊天條、所有多人連線玩家發言共用同一份紀錄）
 * - 新增「收合 ▼／展開 ▲」功能，收合時仍保持安坐板凳欣賞風景，不強制起身！
 * - 多人上線規則：僅 1 位真人時由廟公阿財伯／NPC 陪聊；超過 1 位真人時關閉 NPC 自動回話
 * - 整合「廟埕清淨守護機制」：攔截髒話不雅言詞並對累犯啟動 60 秒靜心冷卻
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
    this.collapsed = false;
    this.lastSendTime = 0;
    this.cooldownMs = 2200;

    storageSync.subscribe('chat', () => {
      if (this.isOpen && !this.collapsed) this.renderMessages();
    });
    storageSync.subscribe('presence', () => {
      if (this.isOpen) this._updateSyncStatus();
    });
  }

  open() {
    this.isOpen = true;
    this.collapsed = false;
    this.render();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.collapsed = false;
    this.container.innerHTML = '';
    this.onStandUp?.();
  }

  toggleCollapse() {
    this.collapsed = !this.collapsed;
    this.render();
  }

  _updateSyncStatus() {
    const el = this.container.querySelector('#bench-sync-label');
    if (el) el.textContent = storageSync.getSyncModeLabel();
  }

  render() {
    const player = storageSync.getPlayer();
    const syncLabel = storageSync.getSyncModeLabel();

    if (this.collapsed) {
      this.container.innerHTML = `
        <div class="fixed left-3 bottom-[114px] sm:left-5 sm:bottom-20 z-40 flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#FFFBF2] border-2 border-[#B46B24] shadow-xl text-[#261109] animate-fade-in">
          <span class="text-base">🪑</span>
          <span class="text-xs font-black text-[#5A2A14] whitespace-nowrap">板凳休息聊天中</span>
          <button id="bench-expand" type="button"
            class="px-2.5 py-1 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-[#FFFDF6] text-xs font-black transition whitespace-nowrap">
            展開紀錄 ▲
          </button>
          <button id="bench-stand-up" type="button"
            class="px-2.5 py-1 rounded-xl bg-[#F3E6CA] hover:bg-[#E7D1A4] text-[#4A2210] border border-[#C98A28] text-xs font-black transition whitespace-nowrap">
            起身走動 ✕
          </button>
        </div>
      `;
      this.container.querySelector('#bench-expand')?.addEventListener('click', () => {
        soundEngine.playSoftClick();
        this.toggleCollapse();
      });
      this.container.querySelector('#bench-stand-up')?.addEventListener('click', () => this.close());
      return;
    }

    this.container.innerHTML = `
      <div class="fixed left-3 right-3 sm:left-5 sm:right-auto bottom-[114px] sm:bottom-20 z-40 sm:w-[410px] bg-[#FFFBF2] border-2 border-[#B46B24] rounded-2xl shadow-2xl overflow-hidden text-[#261109] animate-fade-in">
        <div class="bg-gradient-to-r from-[#5A2A14] to-[#7D3E1E] px-3.5 py-2.5 flex items-center justify-between gap-2 text-[#FFF8E2]">
          <div class="min-w-0">
            <div class="font-bold text-sm flex items-center gap-1.5">
              <span>🪑</span> 板凳聊天・統一聊天紀錄
            </div>
            <div class="text-[11px] text-[#FFE8A8] flex items-center gap-1.5 truncate">
              <span class="inline-block w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse shrink-0"></span>
              <span id="bench-sync-label" class="truncate">${syncLabel}</span>
            </div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button id="bench-collapse" type="button" class="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-xs font-bold border border-white/35 whitespace-nowrap">
              收合 ▼
            </button>
            <button id="bench-stand-up" type="button" class="px-2.5 py-1 rounded-full bg-[#B91C1C]/90 hover:bg-[#DC2626] text-xs font-bold border border-[#FAD364]/70 whitespace-nowrap">
              起身走動 ✕
            </button>
          </div>
        </div>

        <!-- 廟埕清淨守護提示列 -->
        <div class="px-3 py-1.5 bg-[#FEF3C7] border-b border-[#E6B44C] text-[11px] text-[#6B3410] font-semibold flex items-center justify-between gap-2">
          <span>🙏 廟埕清淨地，請互相尊重、口說好話喔！</span>
          <span class="text-[#8E1515] font-bold shrink-0">${this._esc(player.name || '虔誠香客')}</span>
        </div>

        <div id="bench-messages" class="h-[210px] overflow-y-auto p-3 space-y-2.5 text-sm"></div>

        <div id="bench-notice" class="px-3 py-1.5 bg-[#FEF2F2] border-t border-[#FECACA] text-[11px] text-[#B91C1C] font-black hidden"></div>
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
          <input id="bench-input" type="text" maxlength="120" placeholder="坐下聊聊天，對話會同步至聊天紀錄..."
            class="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white border-2 border-[#C98A28] text-sm font-medium text-[#261109] focus:outline-none focus:ring-2 focus:ring-[#D97706]" />
          <button type="submit" class="shrink-0 px-4 py-2 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-[#FFF9E6] text-sm font-bold shadow">
            送出
          </button>
        </form>
      </div>
    `;

    this.renderMessages();

    this.container.querySelector('#bench-collapse')?.addEventListener('click', () => {
      soundEngine.playSoftClick();
      this.toggleCollapse();
    });
    this.container.querySelector('#bench-stand-up')?.addEventListener('click', () => this.close());
    this.container.querySelectorAll('[data-chip]').forEach(btn => {
      btn.addEventListener('click', () => this._sendUserMessage(btn.getAttribute('data-chip')));
    });

    this.container.querySelector('#bench-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = this.container.querySelector('#bench-input');
      const text = input.value.trim();
      if (!text) return;
      const res = this._sendUserMessage(text);
      if (res === true || res === 'blocked') {
        input.value = '';
      }
    });
  }

  _showNotice(msg, duration = 3600) {
    const el = this.container.querySelector('#bench-notice');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(this._noticeTimer);
    this._noticeTimer = setTimeout(() => el.classList.add('hidden'), duration);
  }

  _sendUserMessage(rawText) {
    // 1. 檢查靜心冷卻
    const muteLeft = storageSync.getChatMuteRemainingMs();
    if (muteLeft > 0) {
      this._showNotice(`🙏 廟埕清淨靜心冷卻中（剩餘 ${Math.ceil(muteLeft / 1000)} 秒），請平心靜氣喔！`);
      return false;
    }

    // 2. 防刷屏冷卻
    const now = Date.now();
    const waitLeft = this.cooldownMs - (now - this.lastSendTime);
    if (waitLeft > 0) {
      this._showNotice(`⏳ 發言太快囉～請稍候 ${(waitLeft / 1000).toFixed(1)} 秒再送出（防刷屏保護）`, 2200);
      return false;
    }

    // 3. 廟埕清淨守護：偵測不雅言詞直接攔截不送出
    const { clean, blocked } = sanitizeChatText(rawText);
    if (!clean) return false;
    if (blocked) {
      const { strikes, mutedSeconds } = storageSync.recordProfanityViolation();
      if (mutedSeconds > 0) {
        this._showNotice(`🙏 多次偵測到不雅言詞，已啟動靜心冷卻 ${mutedSeconds} 秒，請共同維護廟埕清淨！`, 4800);
      } else {
        this._showNotice(`🙏 廟埕乃神明清淨聖地，偵測到不雅言詞已攔截！請口說好話（提醒 ${strikes}/3）`, 4200);
      }
      return 'blocked';
    }

    this.lastSendTime = now;
    const nickname = storageSync.getPlayer().name || '虔誠香客';
    soundEngine.playSoftClick();

    // 寫入統一聊天紀錄（加上 channel: 'bench' 標記，於底部聊天紀錄也會同步出現！）
    storageSync.addChatMessage({
      sender: nickname,
      role: 'player',
      avatar: '🙏',
      channel: 'bench',
      text: clean
    });
    this.onPlayerSpeak?.(clean);

    // ★ 需求 #3：只有目前僅 1 位真人上線時才由 NPC 回話；> 1 位真人上線時改由真人彼此對話，不觸發 NPC 回話！
    if (storageSync.getRealPlayerCount() <= 1) {
      const typingEl = this.container.querySelector('#bench-typing');
      if (typingEl) typingEl.classList.remove('hidden');

      setTimeout(() => {
        if (storageSync.getRealPlayerCount() > 1) {
          if (typingEl) typingEl.classList.add('hidden');
          return;
        }
        const reply = generateBenchAIReply(clean, nickname);
        storageSync.addChatMessage({ ...reply, channel: 'bench' });
        if (typingEl) typingEl.classList.add('hidden');
        soundEngine.playSoftClick();
      }, 1150 + Math.random() * 950);
    }

    return true;
  }

  renderMessages() {
    const listEl = this.container.querySelector('#bench-messages');
    if (!listEl) return;
    const msgs = storageSync.getChatMessages().slice(-50);

    listEl.innerHTML = msgs.map(m => {
      const isSelf = m.role === 'player';
      const isPeer = m.role === 'peer';
      const timeStr = new Date(m.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="flex flex-col ${isSelf ? 'items-end' : 'items-start'}">
          <div class="text-[11px] text-[#5C3A21] mb-0.5 px-1 font-semibold">
            ${this._esc(m.avatar || '🙏')} <strong>${this._esc(m.sender)}</strong>${isPeer ? ' <span class="text-[#1D4ED8] font-black">(連線香客)</span>' : ''} · ${timeStr}
          </div>
          <div class="max-w-[86%] px-3 py-2 rounded-2xl text-xs sm:text-[13px] font-medium leading-relaxed shadow-sm ${
            isSelf
              ? 'bg-[#B91C1C] text-[#FFFDF5] rounded-tr-sm'
              : isPeer
                ? 'bg-[#EFF6FF] border border-[#60A5FA] text-[#1E3A8A] rounded-tl-sm'
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
