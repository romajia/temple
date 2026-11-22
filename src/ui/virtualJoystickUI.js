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

    this.visible = this._detectMobileOrTouch();
    this.activePointerId = null;
    this.maxRadius = 40;
    this.currentProximity = null;

    this.renderJoystick();
    this.setProximityTarget(null);
  }

  _detectMobileOrTouch() {
    return (
      window.innerWidth <= 1024 ||
      'ontouchstart' in window ||
      (navigator.maxTouchPoints || 0) > 0
    );
  }

  toggleJoystick() {
    this.visible = !this.visible;
    this.renderJoystick();
    return this.visible;
  }

  renderJoystick() {
    if (!this.visible) {
      this.joyRoot.innerHTML = '';
      this.onMoveVector?.(0, 0);
      return;
    }

    this.joyRoot.innerHTML = `
      <div id="vjoy-base"
        class="fixed left-4 bottom-20 z-30 w-28 h-28 rounded-full bg-[#2A130C]/40 border-2 border-[#FAD364]/65 backdrop-blur-sm flex items-center justify-center touch-none select-none shadow-lg transition-opacity"
        style="opacity: 0.44;">
        <div class="w-16 h-16 rounded-full border border-dashed border-[#FFF3C4]/45 pointer-events-none"></div>
        <div id="vjoy-knob"
          class="absolute w-12 h-12 rounded-full bg-gradient-to-b from-[#FCE07C] to-[#D97706] border-2 border-white shadow-md pointer-events-none flex items-center justify-center text-xs font-bold text-[#4A1C0A]">
          ✦
        </div>
        <span class="absolute -bottom-6 text-[11px] font-black text-[#1C2D28] bg-[#FFFBF2]/95 border border-[#C98A28] px-2.5 py-0.5 rounded-full shadow pointer-events-none whitespace-nowrap">移動搖桿</span>
      </div>
    `;

    const base = this.joyRoot.querySelector('#vjoy-base');
    const knob = this.joyRoot.querySelector('#vjoy-knob');

    const updateStick = (clientX, clientY) => {
      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > this.maxRadius) {
        dx = (dx / dist) * this.maxRadius;
        dy = (dy / dist) * this.maxRadius;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.onMoveVector?.(dx / this.maxRadius, dy / this.maxRadius);
    };

    const resetStick = () => {
      this.activePointerId = null;
      knob.style.transform = 'translate(0px, 0px)';
      base.style.opacity = '0.44';
      this.onMoveVector?.(0, 0);
    };

    base.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.activePointerId = e.pointerId;
      base.setPointerCapture(e.pointerId);
      base.style.opacity = '0.78';
      updateStick(e.clientX, e.clientY);
    });

    base.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.activePointerId) return;
      e.stopPropagation();
      updateStick(e.clientX, e.clientY);
    });

    base.addEventListener('pointerup', (e) => {
      if (e.pointerId !== this.activePointerId) return;
      resetStick();
    });

    base.addEventListener('pointercancel', resetStick);
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
      <div class="fixed right-4 bottom-28 sm:bottom-20 z-30 flex flex-col items-end gap-1.5 animate-fade-in">
        <div class="px-3 py-1 rounded-full bg-[#FFFBF2]/98 border-2 border-[#8E1515] text-[#240E08] text-xs font-black shadow-md">
          已進入【${this._esc(target.title)}】
        </div>
        <button id="btn-proximity-interact"
          class="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-gradient-to-b from-[#9E1A18] to-[#731010] text-[#FFFDF6] border-2 border-[#FCE07C] shadow-[0_8px_24px_rgba(120,18,18,0.45)] hover:brightness-110 active:scale-95 transition">
          <span class="text-2xl">${target.icon || '✨'}</span>
          <div class="text-left">
            <div class="font-black text-sm sm:text-base leading-tight">${this._esc(target.actionText || target.title)}</div>
            <div class="text-[11px] text-[#FFE899] font-extrabold">按 [E] 鍵或點擊進入</div>
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
