/**
 * V6 左下角「半透明虛擬搖桿」＋ 右側「按 [E] 鍵互動提示鈕」
 * - 需求 #2：走進互動光圈、拜墊或靠近 NPC 時亮起右側互動鈕，按 [E] 鍵或點擊按鈕進入動作！
 */
export class VirtualJoystickUI {
  constructor(joyRoot, actionRoot, { onMoveVector, onTriggerProximity }) {
    this.joyRoot = joyRoot;
    this.actionRoot = actionRoot;
    this.onMoveVector = onMoveVector;
    this.onTriggerProximity = onTriggerProximity;

    this.visible = false; // ★ 已依需求取消虛擬搖桿，僅保留互動按鈕！
    this.activePointerId = null;
    this.maxRadius = 40;
    this.currentProximity = null;

    if (this.joyRoot) this.joyRoot.innerHTML = '';
    this.setProximityTarget(null);
  }

  _detectMobileOrTouch() {
    return false;
  }

  toggleJoystick() {
    this.visible = false;
    if (this.joyRoot) this.joyRoot.innerHTML = '';
    this.onMoveVector?.(0, 0);
    return false;
  }

  renderJoystick() {
    if (this.joyRoot) this.joyRoot.innerHTML = '';
    this.onMoveVector?.(0, 0);
    return;
  }

  /**
   * 走進互動光圈、拜墊或靠近 NPC 時亮起右側 [E] 互動鈕（位於相機控制列上方不遮擋）
   */
  setProximityTarget(target) {
    this.currentProximity = target;
    if (!target) {
      this.actionRoot.innerHTML = '';
      return;
    }

    this.actionRoot.innerHTML = `
      <div class="fixed right-3 bottom-[114px] sm:right-4 sm:bottom-20 z-30 flex flex-col items-end gap-1.5 animate-fade-in">
        <div class="px-3 py-1 rounded-full bg-[#FFFBF2] border-2 border-[#8E1515] text-[#240E08] text-xs font-black shadow-md whitespace-nowrap">
          已進入【${this._esc(target.title)}】
        </div>
        <button id="btn-proximity-interact"
          class="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-b from-[#9E1A18] to-[#731010] text-[#FFFDF6] border-2 border-[#FCE07C] shadow-[0_8px_24px_rgba(120,18,18,0.45)] hover:brightness-110 active:scale-95 transition">
          <span class="text-xl sm:text-2xl">${target.icon || '✨'}</span>
          <div class="text-left">
            <div class="font-black text-sm sm:text-base leading-tight whitespace-nowrap">${this._esc(target.actionText || target.title)}</div>
            <div class="text-[11px] text-[#FFE899] font-extrabold whitespace-nowrap">
              <span class="sm:hidden">點擊此按鈕互動</span>
              <span class="hidden sm:inline">按 [E] 鍵或點擊進入</span>
            </div>
          </div>
        </button>
      </div>
    `;

    this.actionRoot.querySelector('#btn-proximity-interact')?.addEventListener('click', () => {
      if (this.currentProximity) {
        this.onTriggerProximity?.(this.currentProximity);
      }
    });
  }

  triggerCurrent() {
    if (this.currentProximity) {
      this.onTriggerProximity?.(this.currentProximity);
      return true;
    }
    return false;
  }

  _esc(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
}
