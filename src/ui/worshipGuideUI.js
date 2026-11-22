/**
 * 左上方「參拜進度引導條」＋「引導／自由探索切換」(V2)
 * - 去工程化：清爽高對比設計，不顯示內部開發熱區表
 * - 點擊「前往 ➔」會使用 A* 避障走到該區光圈內，待進入光圈亮起互動鈕！
 */
import { WORSHIP_STEPS } from '../config/templeConfig.js';

export class WorshipGuideUI {
  constructor(container, { initialCompleted = [], onGoZone, onModeChange, onResetRound }) {
    this.container = container;
    this.onGoZone = onGoZone;
    this.onModeChange = onModeChange;
    this.onResetRound = onResetRound;

    this.mode = 'guided';
    this.completed = new Set(Array.isArray(initialCompleted) ? initialCompleted : []);
    // 手機螢幕預設收合參拜進度條，避免遮住一半畫面（點一下即可展開！）
    this.collapsed = window.innerWidth < 640;
    this.render();
  }

  getNextStep() {
    return WORSHIP_STEPS.find(s => !this.completed.has(s.key)) || null;
  }

  markComplete(stepKey) {
    if (this.completed.has(stepKey)) return false;
    this.completed.add(stepKey);
    this.render();
    return this.completed.size === WORSHIP_STEPS.length;
  }

  resetProgress() {
    this.completed.clear();
    this.render();
  }

  render() {
    const next = this.getNextStep();
    const doneCount = this.completed.size;
    const allDone = doneCount === WORSHIP_STEPS.length;

    this.container.innerHTML = `
      <div class="bg-[#FFFBF2] border-2 border-[#C98A28] rounded-2xl shadow-lg p-2.5 sm:p-3 w-[250px] sm:w-[325px] text-[#261109]">
        <div class="flex items-center justify-between gap-2 mb-2">
          <div class="flex items-center gap-1.5">
            <span class="text-lg">🏮</span>
            <span class="font-black text-sm tracking-wide text-[#8E1515]">參拜進度 (${doneCount}/5)</span>
          </div>
          <div class="flex items-center gap-1">
            <button data-action="toggle-mode" class="text-xs px-2.5 py-1 rounded-full font-bold border transition ${
              this.mode === 'guided'
                ? 'bg-[#B91C1C] text-[#FFF9E6] border-[#7C1414]'
                : 'bg-[#F5E6CC] text-[#4A2210] border-[#C98A28]'
            }">
              ${this.mode === 'guided' ? '引導模式' : '自由探索'}
            </button>
            <button data-action="toggle-collapse" class="text-xs px-2 py-1 rounded-lg bg-[#F5E6CC] hover:bg-[#EAD2AC] text-[#4A2210] font-bold" title="收合/展開">
              ${this.collapsed ? '▼' : '▲'}
            </button>
          </div>
        </div>

        ${this.collapsed ? '' : `
          <div class="grid grid-cols-5 gap-1 mb-2.5">
            ${WORSHIP_STEPS.map(s => {
              const done = this.completed.has(s.key);
              const isCurrent = this.mode === 'guided' && next && next.key === s.key;
              return `
                <button data-step-zone="${s.zoneId}" class="flex flex-col items-center p-1 rounded-lg border text-[11px] transition ${
                  done
                    ? 'bg-[#DCFCE7] border-[#16A34A] text-[#14532D] font-black'
                    : isCurrent
                      ? 'bg-[#FEF3C7] border-[#D97706] text-[#78350F] font-black ring-2 ring-[#F59E0B]/60'
                      : 'bg-white border-[#DEC9A2] text-[#5C3A21] font-semibold hover:bg-[#FFF5DC]'
                }" title="${s.hint}">
                  <span>${done ? '✓' : s.step}</span>
                  <span class="truncate w-full text-center">${s.short}</span>
                </button>
              `;
            }).join('')}
          </div>

          ${allDone ? `
            <div class="bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] border-2 border-[#D97706] rounded-xl p-2.5 text-center">
              <div class="font-black text-sm text-[#8E1515]">✨ 參拜禮儀圓滿完成！✨</div>
              <div class="text-xs font-semibold text-[#5C3A21] mt-0.5">五府千歲・觀音佛祖・天上聖母庇佑平安</div>
              <button data-action="reset-round" class="mt-2 text-xs font-bold px-3.5 py-1 rounded-full bg-[#B91C1C] text-white hover:bg-[#991B1B]">
                開啟新一輪參拜
              </button>
            </div>
          ` : this.mode === 'guided' && next ? `
            <div class="bg-[#FFF3D6] border border-[#D97706] rounded-xl p-2.5 flex items-center justify-between gap-2">
              <div class="text-xs leading-snug">
                <div class="font-black text-[#8E1515]">下一步：${next.title}</div>
                <div class="text-[#4A2210] font-medium mt-0.5">${next.hint}</div>
              </div>
              <button data-action="go-next" class="shrink-0 px-3 py-1.5 rounded-xl bg-gradient-to-b from-[#D93829] to-[#991B1B] text-[#FFF9E6] text-xs font-black shadow hover:brightness-110 active:scale-95 transition">
                走過去 ➔
              </button>
            </div>
          ` : `
            <div class="text-xs font-medium text-[#4A2210] bg-white rounded-xl p-2 border border-[#DEC9A2]">
              🌿 <strong>自由走動中</strong>：WASD / 方向鍵、搖桿或點擊地面，走入各處光圈後按 <strong>[E]</strong> 互動！
            </div>
          `}
        `}
      </div>
    `;

    this.container.querySelector('[data-action="toggle-mode"]')?.addEventListener('click', () => {
      this.mode = this.mode === 'guided' ? 'free' : 'guided';
      this.render();
      this.onModeChange?.(this.mode, this.getNextStep()?.zoneId || null);
    });

    this.container.querySelector('[data-action="toggle-collapse"]')?.addEventListener('click', () => {
      this.collapsed = !this.collapsed;
      this.render();
    });

    this.container.querySelector('[data-action="go-next"]')?.addEventListener('click', () => {
      if (next) this.onGoZone?.(next.zoneId);
    });

    this.container.querySelector('[data-action="reset-round"]')?.addEventListener('click', () => {
      this.resetProgress();
      this.onResetRound?.();
    });

    this.container.querySelectorAll('[data-step-zone]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.onGoZone?.(btn.getAttribute('data-step-zone'));
      });
    });
  }
}
