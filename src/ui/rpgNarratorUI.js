/**
 * V5 RPG 沉浸式浮現劇情與對話引導系統（需求 #4）
 * ------------------------------------------------------------
 * - 告別生硬文字介紹！採用 RPG 逐字浮現打字機效果 ＋ 靈動跳動指引箭頭
 * - 支援入廟開場引導、NPC 互動對話、後方盥洗室趣味互動與區域浮動旁白
 * - 點擊對話框或按空白鍵：打字中可立刻展開全文，打字完成則進入下一句或結束
 */
import { soundEngine } from '../audio/soundEngine.js';

export class RPGNarratorUI {
  constructor(root, { onActiveChange = null } = {}) {
    this.root = root;
    this.onActiveChange = onActiveChange;
    this.active = false;
    this.timer = null;
    this.bannerTimer = null;
    this.queue = [];
    this.lineIdx = 0;
    this.charIdx = 0;
    this.currentFullText = '';
    this.isTyping = false;
    this.meta = { speaker: '廟公阿財伯', title: '德慈宮守廟人', avatar: '👴' };
    this.actions = [];
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
   * 顯示 RPG 逐字浮現對話序列（★ V1.1 手機端精簡 Bottom Sheet 防遮擋 ＋ 任務快捷按鈕！）
   */
  showDialogueSequence({ speaker = '廟公阿財伯', title = '玉勅代天府德慈宮', avatar = '👴', lines = [], actions = [], onDone = null }) {
    if (!lines || lines.length === 0) return;
    this.stopTyping();
    this.active = true;
    this.meta = { speaker, title, avatar };
    this.queue = lines;
    this.actions = Array.isArray(actions) ? actions : [];
    this.lineIdx = 0;
    this.onDone = onDone;

    this._setMobileHudSuppressed(true);
    this.onActiveChange?.(true);
    this._renderFrame();
    this._startLine(0);
  }

  _setMobileHudSuppressed(hide) {
    document.body.classList.toggle('rpg-dialogue-open', Boolean(hide));
  }

  /**
   * 場景上方浮動 RPG 氛圍旁白條（★ V32 迅速流暢出字 ＋ 自動多停留 2 秒方便閱讀！）
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
      <div class="px-5 py-2.5 rounded-2xl bg-[#FFFBF2] border-2 border-[#8E1515] text-[#240E08] shadow-[0_8px_28px_rgba(16,24,20,0.28)] flex items-center gap-2.5 animate-fade-in">
        <span class="text-lg shrink-0">${icon}</span>
        <span id="rpg-banner-text" class="text-xs sm:text-sm font-black tracking-wide leading-snug"></span>
      </div>
    `;

    const span = bannerHost.querySelector('#rpg-banner-text');
    let i = 0;
    const typeStep = () => {
      if (!span) return;
      i += 4;
      span.textContent = text.slice(0, i);
      if (i < text.length) {
        requestAnimationFrame(typeStep);
      }
    };
    typeStep();

    this.bannerTimer = setTimeout(() => {
      if (bannerHost) bannerHost.innerHTML = '';
    }, duration + 2000);
  }

  _renderFrame() {
    const actionsHtml = this.actions.length > 0
      ? `<div id="rpg-action-row" class="flex flex-wrap items-center gap-1.5 mt-2 pt-1.5 border-t border-[#E5D4B3]">
          ${this.actions.map((act, i) => `
            <button type="button" data-rpg-action="${i}"
              class="px-3 py-1.5 rounded-xl text-xs font-black shadow-xs transition active:scale-95 ${
                act.primary
                  ? 'bg-gradient-to-r from-[#B91C1C] to-[#8E1515] text-[#FFFDF5] border border-[#FAD364]'
                  : 'bg-[#F5E6CC] hover:bg-[#EAD2AC] text-[#4A2210] border border-[#C98A28]'
              }">
              ${this._esc(act.label)}
            </button>
          `).join('')}
        </div>`
      : '';

    this.root.innerHTML = `
      <div id="rpg-dialog-wrap" class="fixed left-1/2 -translate-x-1/2 bottom-2 sm:bottom-20 z-[60] w-[96vw] max-w-xl animate-fade-in select-none">
        <div id="rpg-dialog-card"
          class="relative cursor-pointer bg-[#FFFBF2] border-2 border-[#B46B24] ring-2 ring-[#8E1515]/25 rounded-2xl sm:rounded-3xl shadow-[0_14px_36px_rgba(16,24,20,0.42)] px-3.5 py-2.5 sm:px-5 sm:py-3.5 text-[#1C2D28]">
          <!-- 精簡單行角色列（手機不佔高度、絕不遮擋主角與 NPC！） -->
          <div class="flex items-center justify-between gap-2 mb-1.5">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#8E1515] border-2 border-[#E5B968] flex items-center justify-center text-lg sm:text-xl shadow-xs shrink-0">
                ${this.meta.avatar}
              </div>
              <div class="min-w-0 flex items-center gap-1.5 flex-wrap">
                <span class="font-black text-sm sm:text-base tracking-wide text-[#8E1515] truncate">${this._esc(this.meta.speaker)}</span>
                <span class="hidden sm:inline px-2 py-0.5 rounded-full bg-[#F5E6CC] border border-[#C98A28] text-[10px] font-bold text-[#4A2210]">${this._esc(this.meta.title)}</span>
                <span id="rpg-line-progress" class="text-[10px] text-[#6B543E] font-bold"></span>
              </div>
            </div>
            <button id="rpg-skip-btn" type="button"
              class="shrink-0 px-2.5 py-1 rounded-full bg-[#F3E6CA] hover:bg-[#E7D1A4] text-[11px] font-extrabold text-[#4A2210] border border-[#C98A28] transition">
              關閉 ✕
            </button>
          </div>

          <!-- RPG 逐字浮現台詞區（精簡高度、高對比清晰好讀） -->
          <div id="rpg-text-body" class="min-h-[42px] sm:min-h-[54px] text-xs sm:text-sm font-bold leading-relaxed tracking-wide text-[#1C2D28] px-0.5"></div>

          ${actionsHtml}

          <!-- 精簡繼續提示列 -->
          <div class="flex items-center justify-between mt-1.5 pt-1 border-t border-[#E5D4B3]/80 text-[11px] text-[#6B4A2B] font-bold">
            <span>點擊對話框繼續</span>
            <span id="rpg-next-hint" class="font-black text-[#8E1515]">▼ 繼續</span>
          </div>
        </div>
      </div>
    `;

    this.root.querySelector('#rpg-dialog-card')?.addEventListener('click', (e) => {
      if (e.target.closest('#rpg-skip-btn') || e.target.closest('[data-rpg-action]')) return;
      this.advance();
    });

    this.root.querySelector('#rpg-skip-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      soundEngine.playSoftClick();
      this.close();
    });

    this.root.querySelectorAll('[data-rpg-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute('data-rpg-action'));
        const act = this.actions[idx];
        soundEngine.playSoftClick();
        if (act?.onClick) {
          this.close(false);
          act.onClick();
        }
      });
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

    // ★ V32 按鍵控制停留的對話框打字機加速至迅速流暢（每 14ms 推進 2 字，絲滑無拖沓！）
    this.timer = setInterval(() => {
      this.charIdx += 2;
      if (bodyEl) bodyEl.textContent = this.currentFullText.slice(0, this.charIdx);
      if (this.charIdx >= this.currentFullText.length) {
        this.stopTyping();
        if (hintEl) {
          hintEl.textContent = idx < this.queue.length - 1 ? '▼ 下一句' : '✓ 結束對話';
        }
      }
    }, 14);
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
      if (hintEl) hintEl.textContent = this.lineIdx < this.queue.length - 1 ? '▼ 下一句' : '✓ 結束對話';
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

  close(runDone = true) {
    this.stopTyping();
    const cb = runDone ? this.onDone : null;
    this.onDone = null;
    this.actions = [];
    this.active = false;
    this.root.innerHTML = '';
    this._setMobileHudSuppressed(false);
    this.onActiveChange?.(false);
    cb?.();
  }

  _esc(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
}
