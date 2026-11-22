/**
 * V5 RPG 沉浸式浮現劇情與對話引導系統（需求 #4）
 * ------------------------------------------------------------
 * - 告別生硬文字介紹！採用 RPG 逐字浮現打字機效果 ＋ 靈動跳動指引箭頭
 * - 支援入廟開場引導、NPC 互動對話、後方盥洗室趣味互動與區域浮動旁白
 * - 點擊對話框或按空白鍵：打字中可立刻展開全文，打字完成則進入下一句或結束
 */
import { soundEngine } from '../audio/soundEngine.js';

export class RPGNarratorUI {
  constructor(root) {
    this.root = root;
    this.active = false;
    this.timer = null;
    this.bannerTimer = null;
    this.queue = [];
    this.lineIdx = 0;
    this.charIdx = 0;
    this.currentFullText = '';
    this.isTyping = false;
    this.meta = { speaker: '廟公阿財伯', title: '德慈宮守廟人', avatar: '👴' };
    this.onDone = null;

    this._onKeyDown = (e) => {
      if (!this.active) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this.advance();
      } else if (e.code === 'Escape') {
        this.close();
      }
    };
    window.addEventListener('keydown', this._onKeyDown);
  }

  /**
   * 顯示 RPG 逐字浮現對話序列
   */
  showDialogueSequence({ speaker = '廟公阿財伯', title = '玉勅代天府德慈宮', avatar = '👴', lines = [], onDone = null }) {
    if (!lines || lines.length === 0) return;
    this.stopTyping();
    this.active = true;
    this.meta = { speaker, title, avatar };
    this.queue = lines;
    this.lineIdx = 0;
    this.onDone = onDone;

    this._renderFrame();
    this._startLine(0);
  }

  /**
   * 場景上方浮動 RPG 氛圍旁白條（不打斷玩家走動）
   */
  showFloatingBanner(text, icon = '✨', duration = 4200) {
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    let bannerHost = document.getElementById('rpg-floating-banner');
    if (!bannerHost) {
      bannerHost = document.createElement('div');
      bannerHost.id = 'rpg-floating-banner';
      bannerHost.className = 'fixed top-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none w-[90vw] max-w-xl flex justify-center';
      document.body.appendChild(bannerHost);
    }

    bannerHost.innerHTML = `
      <div class="px-5 py-2.5 rounded-2xl bg-[#FFFBF2]/97 border-2 border-[#8E1515] text-[#240E08] shadow-[0_8px_28px_rgba(16,24,20,0.28)] backdrop-blur-md flex items-center gap-2.5 animate-fade-in">
        <span class="text-lg shrink-0">${icon}</span>
        <span id="rpg-banner-text" class="text-xs sm:text-sm font-black tracking-wide leading-snug"></span>
      </div>
    `;

    const span = bannerHost.querySelector('#rpg-banner-text');
    let i = 0;
    const typeStep = () => {
      if (!span) return;
      i += 2;
      span.textContent = text.slice(0, i);
      if (i < text.length) {
        requestAnimationFrame(typeStep);
      }
    };
    typeStep();

    this.bannerTimer = setTimeout(() => {
      if (bannerHost) bannerHost.innerHTML = '';
    }, duration);
  }

  _renderFrame() {
    this.root.innerHTML = `
      <div id="rpg-dialog-wrap" class="fixed left-1/2 -translate-x-1/2 bottom-20 sm:bottom-24 z-50 w-[94vw] max-w-2xl animate-fade-in select-none">
        <div id="rpg-dialog-card"
          class="relative cursor-pointer bg-[#FFFBF2]/98 border-2 border-[#B46B24] ring-2 ring-[#8E1515]/20 rounded-3xl shadow-[0_16px_42px_rgba(16,24,20,0.38)] backdrop-blur-md px-5 py-4 text-[#1C2D28]">
          <!-- 說話角色立牌標籤 -->
          <div class="flex items-center justify-between gap-3 mb-2">
            <div class="flex items-center gap-2.5">
              <div class="w-11 h-11 rounded-2xl bg-[#8E1515] border-2 border-[#E5B968] flex items-center justify-center text-2xl shadow-md shrink-0">
                ${this.meta.avatar}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-black text-base tracking-wider text-[#8E1515]">${this._esc(this.meta.speaker)}</span>
                  <span class="px-2 py-0.5 rounded-full bg-[#F5E6CC] border border-[#C98A28] text-[11px] font-bold text-[#4A2210]">${this._esc(this.meta.title)}</span>
                </div>
                <div id="rpg-line-progress" class="text-[11px] text-[#5C4938] font-bold mt-0.5"></div>
              </div>
            </div>
            <button id="rpg-skip-btn" type="button"
              class="px-2.5 py-1 rounded-full bg-[#F3E6CA] hover:bg-[#E7D1A4] text-xs font-extrabold text-[#4A2210] border border-[#C98A28] transition">
              略過 ✕
            </button>
          </div>

          <!-- RPG 逐字浮現台詞區（深墨字體，輕鬆閱讀不費眼！） -->
          <div id="rpg-text-body" class="min-h-[62px] text-sm sm:text-base font-bold leading-relaxed tracking-wide text-[#1C2D28] px-1"></div>

          <!-- 右下繼續指示 -->
          <div class="flex items-center justify-between mt-2 pt-2 border-t border-[#E5D4B3] text-xs text-[#6B4A2B] font-bold">
            <span>點擊對話框或按空白鍵繼續</span>
            <span id="rpg-next-hint" class="font-black text-[#8E1515] animate-bounce">▼ 繼續</span>
          </div>
        </div>
      </div>
    `;

    this.root.querySelector('#rpg-dialog-card')?.addEventListener('click', (e) => {
      if (e.target.closest('#rpg-skip-btn')) return;
      this.advance();
    });

    this.root.querySelector('#rpg-skip-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      soundEngine.playSoftClick();
      this.close();
    });
  }

  _startLine(idx) {
    this.stopTyping();
    this.lineIdx = idx;
    this.currentFullText = String(this.queue[idx] || '');
    this.charIdx = 0;
    this.isTyping = true;

    const bodyEl = this.root.querySelector('#rpg-text-body');
    const progEl = this.root.querySelector('#rpg-line-progress');
    const hintEl = this.root.querySelector('#rpg-next-hint');
    if (progEl) progEl.textContent = `引導對話 ${idx + 1} / ${this.queue.length}`;
    if (bodyEl) bodyEl.textContent = '';
    if (hintEl) hintEl.textContent = '…';

    this.timer = setInterval(() => {
      this.charIdx++;
      if (bodyEl) bodyEl.textContent = this.currentFullText.slice(0, this.charIdx);
      if (this.charIdx >= this.currentFullText.length) {
        this.stopTyping();
        if (hintEl) {
          hintEl.textContent = idx < this.queue.length - 1 ? '▼ 下一句' : '✦ 進入場景';
        }
      }
    }, 32);
  }

  advance() {
    if (!this.active) return;
    soundEngine.playSoftClick();

    if (this.isTyping) {
      // 立刻顯示完整本句
      this.stopTyping();
      const bodyEl = this.root.querySelector('#rpg-text-body');
      const hintEl = this.root.querySelector('#rpg-next-hint');
      if (bodyEl) bodyEl.textContent = this.currentFullText;
      if (hintEl) hintEl.textContent = this.lineIdx < this.queue.length - 1 ? '▼ 下一句' : '✦ 進入場景';
      return;
    }

    if (this.lineIdx + 1 < this.queue.length) {
      this._startLine(this.lineIdx + 1);
    } else {
      this.close();
    }
  }

  stopTyping() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isTyping = false;
  }

  close() {
    this.stopTyping();
    const cb = this.onDone;
    this.onDone = null;
    this.active = false;
    this.root.innerHTML = '';
    cb?.();
  }

  _esc(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
}
