/**
 * 玉勅代天府德慈宮 - 核心互動彈窗、NPC 對話與跪坐念經模式 (V2)
 * 升級項目：
 * - 供品擺放加入明確祈願送出流程與「祈願已上達神明」視覺回饋（驗收 #7）
 * - 拜天公向外三拜轉身插香提示（驗收 #6）
 * - 跪坐念經 UI 排版清晰高對比，不遮擋操作（驗收 #8）
 * - 燒金紙逐張投入爐口觸發（驗收 #9）
 * - 常駐與巡遊 NPC 專屬親切對話視窗（阿財伯、淑芬阿姨、阿明、小美）
 */
import { TEMPLE_CONFIG } from '../config/templeConfig.js';
import { OFFERING_CATALOG } from '../data/initialData.js';
import { FOLKLORE_QUIZ_50 } from '../data/folkloreQuiz50.js';
import { SIXTY_FORTUNE_POEMS } from '../data/sixtyFortunePoems.js';
import { SUTRA_LIST } from '../data/sutraData.js';
import { storageSync } from '../services/storageSync.js';
import { generateFortuneInterpretation } from '../services/aiTempleKeeper.js';
import { generateFortuneCardDataURL } from '../services/fortuneCardGenerator.js';
import { soundEngine } from '../audio/soundEngine.js';

const QUICK_WISHES = [
  '祈求闔家平安、身體健康',
  '保佑工作事業順利、貴人相助',
  '祈願財源廣進、平安順心',
  '保佑考試金榜題名、學業進步',
  '祈求感情圓滿、出入行車平安'
];

/**
 * 精緻供品圖像渲染（特別為「平安紅龜粿」與「敬神壽金」繪製專屬 SVG 工藝圖示！）
 */
function renderOfferingIcon(item, sizeClass = 'text-2xl') {
  if (item.id === 'turtleCake') {
    return `<span class="inline-flex items-center justify-center align-middle" title="平安紅龜粿">
      <svg viewBox="0 0 48 48" class="w-8 h-8 inline-block drop-shadow-xs">
        <ellipse cx="24" cy="33" rx="20" ry="10" fill="#2F855A" />
        <ellipse cx="24" cy="27" rx="17" ry="12" fill="#E11D48" stroke="#9F1239" stroke-width="2" />
        <ellipse cx="24" cy="25" rx="12" ry="8" fill="none" stroke="#FDA4AF" stroke-width="1.4" stroke-dasharray="3 2" />
        <text x="24" y="29" text-anchor="middle" font-size="11" font-weight="900" fill="#FEF08A" font-family="serif">壽</text>
      </svg>
    </span>`;
  }
  if (item.id === 'jossPaper') {
    return `<span class="inline-flex items-center justify-center align-middle" title="敬神壽金">
      <svg viewBox="0 0 48 48" class="w-8 h-8 inline-block drop-shadow-xs">
        <rect x="6" y="18" width="36" height="20" rx="3" fill="#F4C44E" stroke="#B45309" stroke-width="1.8" />
        <rect x="8" y="12" width="32" height="18" rx="3" fill="#FDE068" stroke="#B45309" stroke-width="1.8" />
        <rect x="14" y="15" width="20" height="12" rx="1.5" fill="#F59E0B" stroke="#FEF9C3" stroke-width="1.2" />
        <rect x="20" y="11" width="8" height="28" fill="#DC2626" />
        <text x="24" y="24" text-anchor="middle" font-size="9" font-weight="900" fill="#FEF08A" font-family="serif">壽</text>
      </svg>
    </span>`;
  }
  return `<span class="${sizeClass}">${item.emoji}</span>`;
}

export class TempleModalsUI {
  constructor(modalRoot, chantRoot, hooks = {}) {
    this.modalRoot = modalRoot;
    this.chantRoot = chantRoot;
    this.hooks = hooks;
    this.offeringInterval = null;

    // 供品選擇狀態
    this.selectedOfferingId = OFFERING_CATALOG[0].id;
    this.lastWishConfirm = null;

    // 念經模式狀態
    this.chantActive = false;
    this.chantAutoTimer = null;
    this.chantSutraIdx = 0;
    this.chantLineIdx = 0;
    this.chantTapCount = 0;

    // 求籤流程狀態
    this.fortuneState = {
      step: 'form',
      userName: '',
      category: 'general',
      question: '',
      lastCast: null,
      poem: null,
      interpretation: null,
      cardUrl: ''
    };
  }

  closeModal() {
    if (this.offeringInterval) {
      clearInterval(this.offeringInterval);
      this.offeringInterval = null;
    }
    this.modalRoot.innerHTML = '';
    this.hooks.onModalClosed?.();
  }

  // =========================================================================
  // 0. 常駐／巡遊 NPC 對話視窗
  // =========================================================================
  openNpcDialogueModal(npcCfg) {
    this.closeModal();
    let lineIdx = 0;
    const dialogues = npcCfg.dialogues || ['祝您平安順心！'];

    const render = () => {
      const hasNext = lineIdx < dialogues.length - 1;
      this.modalRoot.innerHTML = `
        <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div class="bg-[#FFFBF2] border-4 border-[#9E1F1B] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden text-[#261109] animate-fade-in">
            <div class="bg-gradient-to-r from-[#7C1414] to-[#A81C18] px-5 py-3 flex items-center justify-between text-[#FFF8E2] border-b-2 border-[#FAD364]">
              <div class="flex items-center gap-2.5">
                <span class="text-2xl">${npcCfg.avatar}</span>
                <div>
                  <h3 class="font-black text-base">${this._esc(npcCfg.name)}</h3>
                  <p class="text-[11px] text-[#FFE89E]">${this._esc(npcCfg.title)}</p>
                </div>
              </div>
              <button data-close class="w-8 h-8 rounded-full bg-black/25 hover:bg-black/45 text-white font-bold">✕</button>
            </div>
            <div class="p-5 space-y-4">
              <div class="bg-[#FFF4DC] border-2 border-[#E6B44C] rounded-2xl p-4 text-sm sm:text-base font-medium leading-relaxed text-[#2B130B] min-h-[104px]">
                「${this._esc(dialogues[lineIdx])}」
              </div>
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-bold text-[#7A5038]">對話 ${lineIdx + 1} / ${dialogues.length}</span>
                <div class="flex gap-2">
                  ${hasNext ? `
                    <button id="npc-next" class="px-5 py-2 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-[#FFF9E6] text-sm font-bold shadow">
                      繼續聽說 ➔
                    </button>
                  ` : `
                    <button data-close class="px-5 py-2 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-sm font-bold shadow">
                      謝謝分享 🙏
                    </button>
                  `}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      this.modalRoot.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => this.closeModal()));
      this.modalRoot.querySelector('#npc-next')?.addEventListener('click', () => {
        soundEngine.playSoftClick();
        lineIdx++;
        render();
      });
    };

    render();
  }

  // =========================================================================
  // 1. 香燭金紙區（領香觸發 Zoom-in 特寫與自動拉回視角）
  // =========================================================================
  openIncenseModal(playerStatus) {
    this.closeModal();
    this.modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
        <div class="bg-[#FFFBF2] border-4 border-[#9E1F1B] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden text-[#261109]">
          <div class="bg-gradient-to-r from-[#7C1414] to-[#B91C1C] px-5 py-3.5 flex items-center justify-between text-[#FFF8E2] border-b-2 border-[#FAD364]">
            <h2 class="font-black text-lg">🪔 香燭金紙區</h2>
            <button data-close class="w-8 h-8 rounded-full bg-black/25 hover:bg-black/45 text-white font-bold">✕</button>
          </div>
          <div class="p-5 space-y-4 text-center">
            <div class="text-5xl">🕯️✨🟨</div>
            <p class="text-sm text-[#3E1C11] font-medium leading-relaxed">
              誠心領取<strong>三柱清香</strong>與<strong>敬神壽金</strong>。<br>
              點香時鏡頭將拉近特寫三柱清香微光冒煙，隨後平滑拉回您的人物主視角！
            </p>
            <div class="bg-[#FEF3C7] border-2 border-[#E6B44C] rounded-xl p-3 text-xs font-bold text-[#6B3410] flex justify-around">
              <span>目前持香：${playerStatus.hasIncense ? '✓ 已點燃三柱清香' : '尚未領取'}</span>
              <span>敬神金紙：${playerStatus.hasJossPaper ? '✓ 已領取' : '尚未領取'}</span>
            </div>
            <button id="btn-take-incense" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#D93829] to-[#991B1B] text-[#FFF9E6] font-black text-base shadow-lg border border-[#FAD364] hover:brightness-110 active:scale-[0.98] transition">
              🔥 點燃三柱清香並領取金紙
            </button>
          </div>
        </div>
      </div>
    `;
    this.modalRoot.querySelector('[data-close]').addEventListener('click', () => this.closeModal());
    this.modalRoot.querySelector('#btn-take-incense').addEventListener('click', () => {
      soundEngine.playBlessingChime();
      this.closeModal();
      this.hooks.onTakeIncense?.();
    });
  }

  // =========================================================================
  // 2. 廟外天公爐（需求 #8：站在靠廟那側面向外三拜 → 直接上前插香）
  // =========================================================================
  openTianGongModal(playerStatus) {
    this.closeModal();
    this.modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
        <div class="bg-[#FFFBF2] border-4 border-[#B45309] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden text-[#261109]">
          <div class="bg-gradient-to-r from-[#92400E] to-[#D97706] px-5 py-3.5 flex items-center justify-between text-[#FFFDF5] border-b-2 border-[#FCE07C]">
            <h2 class="font-black text-lg">☀️ 廟外廣場・天公爐</h2>
            <button data-close class="w-8 h-8 rounded-full bg-black/25 hover:bg-black/45 text-white font-bold">✕</button>
          </div>
          <div class="p-5 space-y-4 text-center">
            <div class="text-5xl">🙏🌤️</div>
            <p class="text-sm text-[#3E1C11] font-medium leading-relaxed">
              依台灣傳統禮儀，您已站定在<strong>靠大殿一側</strong>、面向廟外天際與天公爐。<br>
              向玉皇大帝行三拜禮稟報後，將<strong>直接向前把三柱清香插入天公爐</strong>！
            </p>
            ${!playerStatus.hasIncense ? `
              <div class="text-xs font-bold bg-amber-100 border border-amber-500 text-amber-950 rounded-xl p-2.5">
                💡 溫馨提醒：建議先至廟內左側香燭區點香；若直接參拜也會自動備妥三柱清香。
              </div>
            ` : ''}
            <button id="btn-bow-tiangong" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#D97706] to-[#B45309] text-white font-black text-base shadow-lg border border-[#FCE07C] hover:brightness-110">
              🙏 面向天際三拜天公・直接上前插香
            </button>
          </div>
        </div>
      </div>
    `;
    this.modalRoot.querySelector('[data-close]').addEventListener('click', () => this.closeModal());
    this.modalRoot.querySelector('#btn-bow-tiangong').addEventListener('click', () => {
      soundEngine.playBell(0.24, 392);
      this.closeModal();
      this.hooks.onWorshipTianGong?.();
    });
  }

  // =========================================================================
  // 3. 正殿供桌（驗收 #7：選擇供品＋輸入送出祈願＋明確「祈願已上達神明」回饋＋10分鐘倒數）
  // =========================================================================
  openOfferingsModal() {
    this.closeModal();
    this.lastWishConfirm = null;
    const player = storageSync.getPlayer();

    const updateActiveList = () => {
      storageSync.pruneExpiredOfferings();
      const current = storageSync.getOfferings();
      const maxCount = TEMPLE_CONFIG.offerings.maxCount;
      const ttl = TEMPLE_CONFIG.offerings.ttlMs;
      const now = Date.now();

      const listContainer = this.modalRoot.querySelector('#off-active-list');
      const countBadge = this.modalRoot.querySelector('#off-count-badge');
      if (countBadge) countBadge.textContent = `${current.length} / ${maxCount}`;
      if (!listContainer) return;

      if (current.length === 0) {
        listContainer.innerHTML = `<div class="text-xs font-medium text-center text-[#6B4E3D] py-6">目前供桌淨空，歡迎搶頭香擺上您的供品與祈願！</div>`;
        return;
      }

      listContainer.innerHTML = current.map(item => {
        const remainMs = Math.max(0, ttl - (now - item.createdAt));
        const mins = Math.floor(remainMs / 60000);
        const secs = Math.floor((remainMs % 60000) / 1000);
        const pct = Math.max(0, Math.min(100, (remainMs / ttl) * 100));
        return `
          <div class="p-2.5 rounded-xl bg-white border border-[#DEC9A2] text-xs shadow-xs">
            <div class="flex items-center justify-between gap-1">
              <span class="font-black text-[#261109]">${item.emoji} ${this._esc(item.name)}</span>
              <span class="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#92400E]">⏳ ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}</span>
            </div>
            <div class="text-[11px] text-[#5C3A21] font-medium mt-0.5">信眾：<strong>${this._esc(item.donor)}</strong></div>
            <div class="text-[11px] text-[#8E1515] font-semibold mt-0.5">🙏「${this._esc(item.blessing)}」</div>
            <div class="w-full h-1.5 bg-[#F3E5CC] rounded-full overflow-hidden mt-1.5">
              <div class="h-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] transition-all" style="width: ${pct}%"></div>
            </div>
          </div>
        `;
      }).join('');
    };

    const renderModal = () => {
      const selectedDef = OFFERING_CATALOG.find(o => o.id === this.selectedOfferingId) || OFFERING_CATALOG[0];
      const livePlayer = storageSync.getPlayer();
      const inv = livePlayer.inventory || {};
      const ownedCount = inv[selectedDef.id] || 0;

      this.modalRoot.innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
          <div class="bg-[#FFFBF2] border-4 border-[#9E1F1B] rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-[#261109]">
            <div class="bg-gradient-to-r from-[#7C1414] to-[#B91C1C] px-5 py-3.5 flex items-center justify-between text-[#FFF8E2] border-b-2 border-[#FAD364]">
              <div>
                <h2 class="font-black text-lg">🍎 正殿大供桌・香火背包獻供與祈願</h2>
                <p class="text-xs text-[#FFE89E]">目前持有功德：<strong>${livePlayer.merit || 0}</strong>｜供品擺放 <strong>10 分鐘</strong> 後自動圓滿清理</p>
              </div>
              <button data-close class="w-8 h-8 rounded-full bg-black/25 hover:bg-black/45 text-white font-bold">✕</button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto p-4 gap-4">
              <!-- 左側：從香火背包挑選供品與祈願送出 -->
              <div class="md:col-span-7 space-y-3">
                ${this.lastWishConfirm ? `
                  <div class="p-3.5 rounded-2xl bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] border-2 border-[#D97706] shadow-md animate-fade-in">
                    <div class="font-black text-sm text-[#8E1515] flex items-center gap-1.5">
                      <span>✨</span> 祈願已上達神明！德慈宮眾神庇佑您 <span>✨</span>
                    </div>
                    <div class="text-xs font-bold text-[#4A2210] mt-1">
                      已敬獻【${this.lastWishConfirm.emoji} ${this._esc(this.lastWishConfirm.name)}】｜稟報心願：「${this._esc(this.lastWishConfirm.blessing)}」
                    </div>
                  </div>
                ` : ''}

                <div>
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="text-xs font-black text-[#6B2F1A]">步驟 1：從隨身香火背包挑選供品（不足可直接功德請購）</span>
                    <button type="button" id="off-open-shop" class="text-[11px] font-black text-[#B45309] hover:underline">🛍️ 逛供品鋪 ➔</button>
                  </div>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    ${OFFERING_CATALOG.map(item => {
                      const active = item.id === this.selectedOfferingId;
                      const qty = inv[item.id] || 0;
                      return `
                        <button type="button" data-select-off="${item.id}" class="relative p-2 rounded-2xl border-2 text-center transition ${
                          active
                            ? 'bg-[#FEF3C7] border-[#B91C1C] ring-2 ring-[#F59E0B]/50 shadow-md scale-[1.02]'
                            : 'bg-white border-[#DEC9A2] hover:bg-[#FFF6E0]'
                        }">
                          <span class="absolute top-1 right-1.5 text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                            qty > 0 ? 'bg-[#183C32] text-[#FCE07C]' : 'bg-[#F3E5CC] text-[#7A5038]'
                          }">${qty > 0 ? `背包×${qty}` : `${item.cost}功德`}</span>
                          <div class="mt-2 flex items-center justify-center min-h-[34px]">${renderOfferingIcon(item, 'text-2xl')}</div>
                          <div class="font-black text-[11px] text-[#261109] mt-0.5 truncate">${item.name}</div>
                        </button>
                      `;
                    }).join('')}
                  </div>
                </div>

                <form id="off-submit-form" class="space-y-2.5 bg-[#FFF6E5] border-2 border-[#E6B44C] rounded-2xl p-3.5">
                  <div class="text-xs font-black text-[#6B2F1A]">步驟 2：輸入祈願語並送出稟報給神明</div>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <label class="font-bold text-[#5C3A21] block mb-1">信眾稱呼</label>
                      <input id="off-donor" type="text" maxlength="10" value="${this._esc(livePlayer.name || '虔誠香客')}"
                        class="w-full px-2.5 py-2 rounded-xl bg-white border-2 border-[#C98A28] font-bold text-[#261109]" />
                    </div>
                    <div class="sm:col-span-2">
                      <label class="font-bold text-[#5C3A21] block mb-1">心中祈願語（將傳達給神明）*</label>
                      <input id="off-wish" type="text" required maxlength="36"
                        placeholder="例：祈求五府千歲保佑闔家平安健康..."
                        value="${this._esc(selectedDef.blessing)}"
                        class="w-full px-3 py-2 rounded-xl bg-white border-2 border-[#C98A28] font-bold text-[#261109]" />
                    </div>
                  </div>

                  <div class="flex flex-wrap gap-1">
                    ${QUICK_WISHES.map(w => `
                      <button type="button" data-quick-wish="${this._esc(w)}"
                        class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white border border-[#D49B35] text-[#6B3410] hover:bg-[#FEF3C7]">
                        ${w}
                      </button>
                    `).join('')}
                  </div>

                  <div id="off-err-msg" class="text-xs font-bold text-red-700 hidden"></div>

                  <button type="submit" class="w-full py-3 rounded-xl bg-gradient-to-r from-[#C8232C] to-[#991B1B] text-[#FFF9E6] font-black text-sm shadow-lg border border-[#FAD364] hover:brightness-110 active:scale-[0.98] transition">
                    ${ownedCount > 0
                      ? `🙏 取出背包【${selectedDef.emoji} ${selectedDef.name}】擺桌並送出祈願`
                      : `✨ 以 ${selectedDef.cost} 功德現場請購【${selectedDef.emoji} ${selectedDef.name}】並送出祈願`}
                  </button>
                </form>
              </div>

              <!-- 右側：供桌即時擺放中與 10 分鐘自動清理倒數 -->
              <div class="md:col-span-5 bg-[#F6E8CC] rounded-2xl p-3.5 border-2 border-[#DEC494] flex flex-col">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-black text-sm text-[#8E1515]">供桌即時供品（10分鐘自動清理）</span>
                  <span id="off-count-badge" class="text-xs font-black px-2.5 py-0.5 rounded-full bg-[#B91C1C] text-white">0 / 12</span>
                </div>
                <div id="off-active-list" class="space-y-2 overflow-y-auto max-h-[340px] pr-1 flex-1"></div>
              </div>
            </div>
          </div>
        </div>
      `;

      updateActiveList();

      this.modalRoot.querySelector('[data-close]').addEventListener('click', () => this.closeModal());
      this.modalRoot.querySelector('#off-open-shop')?.addEventListener('click', () => {
        soundEngine.playSoftClick();
        this.openOfferingShopModal();
      });

      this.modalRoot.querySelectorAll('[data-select-off]').forEach(btn => {
        btn.addEventListener('click', () => {
          soundEngine.playSoftClick();
          this.selectedOfferingId = btn.getAttribute('data-select-off');
          renderModal();
        });
      });

      this.modalRoot.querySelectorAll('[data-quick-wish]').forEach(btn => {
        btn.addEventListener('click', () => {
          soundEngine.playSoftClick();
          const inp = this.modalRoot.querySelector('#off-wish');
          if (inp) inp.value = btn.getAttribute('data-quick-wish');
        });
      });

      this.modalRoot.querySelector('#off-submit-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const donor = this.modalRoot.querySelector('#off-donor').value.trim() || '虔誠香客';
        const wish = this.modalRoot.querySelector('#off-wish').value.trim() || selectedDef.blessing;

        // 優先消耗香火背包；若無庫存則嘗試用功德即時請購（若功德不足則提醒並可免費結緣清茶水果不卡主線！）
        let used = storageSync.consumeInventoryOffering(this.selectedOfferingId);
        if (!used) {
          const buy = storageSync.buyOffering(this.selectedOfferingId);
          if (!buy.ok) {
            const errEl = this.modalRoot.querySelector('#off-err-msg');
            if (errEl) {
              errEl.textContent = `⚠️ ${buy.reason}`;
              errEl.classList.remove('hidden');
            }
            return;
          }
          storageSync.consumeInventoryOffering(this.selectedOfferingId);
        }

        const { record, trimmedOldest } = storageSync.addOffering(this.selectedOfferingId, donor, wish);
        this.lastWishConfirm = record;
        soundEngine.playBlessingChime();
        this.hooks.onOfferingPlaced?.(record, trimmedOldest);
        renderModal();
      });
    };

    renderModal();
    this.offeringInterval = setInterval(updateActiveList, 1000);
  }

  // =========================================================================
  // 4. 正殿中央大道・拜主神（需求 #9：與 36 拜墊念經完全分開，站在中央面向神明直接拜！）
  // =========================================================================
  openMainWorshipModal() {
    this.closeModal();
    this.modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
        <div class="bg-[#FFFBF2] border-4 border-[#9E1F1B] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden text-[#261109]">
          <div class="bg-gradient-to-r from-[#7C1414] to-[#B91C1C] px-5 py-3.5 flex items-center justify-between text-[#FFF8E2] border-b-2 border-[#FAD364]">
            <h2 class="font-black text-lg">🙏 正殿中央・誠心拜主神</h2>
            <button data-close class="w-8 h-8 rounded-full bg-black/25 hover:bg-black/45 text-white font-bold">✕</button>
          </div>
          <div class="p-5 space-y-4 text-center">
            <div class="bg-[#FFF3D6] border-2 border-[#E6B44C] rounded-2xl p-3.5">
              <div class="font-black text-sm text-[#8E1515]">玉勅代天府德慈宮・主祀神聖</div>
              <div class="text-xs font-bold text-[#5C3A21] mt-1">代天巡狩・五府千歲 ｜ 觀音佛祖 ｜ 天上聖母</div>
            </div>
            <p class="text-xs text-[#4A2210] leading-relaxed">
              立於正殿中央紅毯面向神龕，無需移至拜墊即可虔誠行三拜禮並上前插上三柱清香。<br>
              <span class="text-[#8E1515] font-bold">（若想靜心敲木魚念經，可直接走上左右兩側任一拜墊喔！）</span>
            </p>
            <button id="btn-worship-main" class="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#C8232C] to-[#991B1B] text-[#FFF9E6] font-black text-sm shadow-lg border border-[#FAD364] hover:brightness-110 flex items-center justify-center gap-2">
              <span>🔥</span> 三拜主神並上前插香（完成步驟 ④）
            </button>
          </div>
        </div>
      </div>
    `;

    this.modalRoot.querySelector('[data-close]').addEventListener('click', () => this.closeModal());
    this.modalRoot.querySelector('#btn-worship-main').addEventListener('click', () => {
      soundEngine.playBell(0.26, 392);
      this.closeModal();
      this.hooks.onWorshipMainDeity?.();
    });
  }

  /**
   * 跪坐念經模式（需求 #9 & #10：36 個拜墊任意走上自動跪坐，敲木魚累積功德自動存檔）
   */
  startChantingMode(matLabel = '正殿拜墊') {
    this.stopChantingMode(false);
    this.chantActive = true;
    this.chantMatLabel = matLabel;
    this.chantLineIdx = 0;
    this.chantTapCount = 0;
    this.hooks.onEnterChantMode?.();
    this._renderChantHUD();
  }

  stopChantingMode(notify = true) {
    this.chantActive = false;
    if (this.chantAutoTimer) {
      clearInterval(this.chantAutoTimer);
      this.chantAutoTimer = null;
    }
    this.chantRoot.innerHTML = '';
    if (notify) this.hooks.onExitChantMode?.();
  }

  _renderChantHUD() {
    if (!this.chantActive) return;
    const sutra = SUTRA_LIST[this.chantSutraIdx];
    const currentLine = sutra.lines[this.chantLineIdx % sutra.lines.length];
    const nextLine = sutra.lines[(this.chantLineIdx + 1) % sutra.lines.length];
    const totalSavedTaps = storageSync.getPlayer().chantTotalTaps || 0;

    this.chantRoot.innerHTML = `
      <div class="fixed left-1/2 -translate-x-1/2 bottom-16 z-40 w-[94vw] max-w-2xl bg-[#26110A]/94 backdrop-blur-md border-2 border-[#FAD364] rounded-3xl shadow-[0_14px_45px_rgba(0,0,0,0.55)] p-4 text-[#FFFBF0]">
        <div class="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#FAD364]/30">
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-2.5 py-1 rounded-full bg-[#8E2523] border border-[#FAD364]/60 text-[11px] font-black text-[#FFF3B0]">🙏 ${this._esc(this.chantMatLabel || '正殿拜墊')}</span>
            <select id="chant-select" class="bg-[#4A2014] border border-[#FAD364] text-[#FFF3B0] text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none">
              ${SUTRA_LIST.map((s, idx) => `<option value="${idx}" ${idx === this.chantSutraIdx ? 'selected' : ''}>📜 ${s.title}</option>`).join('')}
            </select>
            <span class="text-xs font-bold text-[#FFE599] bg-black/35 px-2.5 py-1 rounded-full">本次 ${this.chantTapCount} 下｜累計 ${totalSavedTaps} 下</span>
          </div>
          <button id="chant-exit" class="px-3.5 py-1.5 rounded-full bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-black border border-[#FAD364] shadow">
            起身離開念經 ✕
          </button>
        </div>

        <div class="bg-black/40 rounded-2xl px-4 py-3.5 text-center my-3 border border-[#FAD364]/35">
          <div class="font-serif text-lg sm:text-xl font-black text-[#FFF3B0] tracking-wider leading-relaxed">
            ${currentLine}
          </div>
          <div class="text-xs text-[#E5C9A5] mt-1.5 font-medium">
            下一句：${nextLine}
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-3">
          <button id="btn-tap-fish" class="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-b from-[#F59E0B] to-[#B45309] text-white font-black text-sm shadow-lg border border-[#FCE07C] active:scale-90 transition">
            <span id="fish-icon" class="text-xl inline-block transition-transform">🪵</span>
            <span>輕敲木魚（誦下一句）</span>
          </button>
          <button id="btn-auto-fish" class="px-4 py-2.5 rounded-full text-xs font-bold border-2 transition ${
            this.chantAutoTimer
              ? 'bg-[#16A34A] border-[#86EFAC] text-white'
              : 'bg-white/10 border-[#FAD364] text-[#FFF3B0] hover:bg-white/20'
          }">
            ${this.chantAutoTimer ? '⏸ 暫停自動慢敲' : '▶ 自動慢敲誦經'}
          </button>
        </div>
      </div>
    `;

    const doTap = () => {
      soundEngine.playWoodenFish();
      this.chantTapCount++;
      const tapRes = storageSync.addChantTap();
      if (tapRes.reward > 0) {
        this.hooks.onMeritEarned?.(tapRes.reward, `🪵 虔誠敲擊木魚念經（累計 ${tapRes.total} 下），獲得 +${tapRes.reward} 功德！`);
      }
      this.chantLineIdx = (this.chantLineIdx + 1) % sutra.lines.length;
      if (this.chantLineIdx === 0) soundEngine.playBell(0.18, 440);
      this._renderChantHUD();
      const icon = this.chantRoot.querySelector('#fish-icon');
      if (icon) {
        icon.style.transform = 'scale(1.35) rotate(-14deg)';
        setTimeout(() => { icon.style.transform = ''; }, 140);
      }
    };

    this.chantRoot.querySelector('#btn-tap-fish').addEventListener('click', doTap);
    this.chantRoot.querySelector('#chant-select').addEventListener('change', (e) => {
      this.chantSutraIdx = Number(e.target.value);
      this.chantLineIdx = 0;
      this._renderChantHUD();
    });
    this.chantRoot.querySelector('#btn-auto-fish').addEventListener('click', () => {
      if (this.chantAutoTimer) {
        clearInterval(this.chantAutoTimer);
        this.chantAutoTimer = null;
      } else {
        doTap();
        this.chantAutoTimer = setInterval(doTap, 2400);
      }
      this._renderChantHUD();
    });
    this.chantRoot.querySelector('#chant-exit').addEventListener('click', () => this.stopChantingMode(true));
  }

  // =========================================================================
  // 5. 祈福求籤與 AI 廟公解籤
  // =========================================================================
  openFortuneModal() {
    this.closeModal();
    const player = storageSync.getPlayer();
    this.fortuneState = {
      step: 'form',
      userName: player.name || '',
      category: 'general',
      question: '',
      lastCast: null,
      poem: null,
      interpretation: null,
      cardUrl: ''
    };
    this._renderFortuneModal();
  }

  _renderFortuneModal() {
    const fs = this.fortuneState;
    this.modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-5">
        <div class="bg-[#FFFBF2] border-4 border-[#9E1F1B] rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-[#261109]">
          <div class="bg-gradient-to-r from-[#7C1414] via-[#A81C18] to-[#7C1414] px-5 py-3.5 flex items-center justify-between text-[#FFF8E2] border-b-2 border-[#FAD364]">
            <div>
              <h2 class="font-black text-lg">🎋 祈福求籤・擲筊與 AI 廟公解籤</h2>
              <p class="text-xs text-[#FFE89E]">稟報心事 ➔ 誠心擲聖筊 ➔ 抽六十甲子靈籤 ➔ 阿財伯專屬解籤</p>
            </div>
            <button data-close class="w-8 h-8 rounded-full bg-black/25 hover:bg-black/45 text-white font-bold">✕</button>
          </div>
          <div class="p-5 overflow-y-auto flex-1">
            ${fs.step === 'form' ? this._renderFortuneForm() : ''}
            ${fs.step === 'blocks' ? this._renderFortuneBlocks() : ''}
            ${fs.step === 'result' ? this._renderFortuneResult() : ''}
          </div>
        </div>
      </div>
    `;
    this.modalRoot.querySelector('[data-close]').addEventListener('click', () => this.closeModal());
    if (fs.step === 'form') this._bindFortuneForm();
    if (fs.step === 'blocks') this._bindFortuneBlocks();
    if (fs.step === 'result') this._bindFortuneResult();
  }

  _renderFortuneForm() {
    const fs = this.fortuneState;
    return `
      <form id="fort-form" class="space-y-4">
        <div class="bg-[#FEF3C7] border-2 border-[#E6B44C] rounded-2xl p-3.5 text-xs font-medium text-[#5C2D0C] leading-relaxed">
          👴 <strong>阿財伯叮嚀：</strong>求籤前先靜心，把您的姓名和目前最想問的事誠心稟報給五府千歲、觀音佛祖與天上聖母喔！
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-[#4A2210] mb-1">您的姓名 / 稱呼 *</label>
            <input id="fort-name" type="text" required maxlength="12" value="${this._esc(fs.userName)}"
              class="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#C98A28] text-sm font-bold text-[#261109]" />
          </div>
          <div>
            <label class="block text-xs font-bold text-[#4A2210] mb-1">祈求事項類別</label>
            <select id="fort-cat" class="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#C98A28] text-sm font-bold text-[#261109]">
              <option value="general" ${fs.category === 'general' ? 'selected' : ''}>✨ 綜合運勢指引</option>
              <option value="career" ${fs.category === 'career' ? 'selected' : ''}>💼 事業工作轉職</option>
              <option value="wealth" ${fs.category === 'wealth' ? 'selected' : ''}>💰 財運投資創業</option>
              <option value="love" ${fs.category === 'love' ? 'selected' : ''}>💕 感情桃花姻緣</option>
              <option value="health" ${fs.category === 'health' ? 'selected' : ''}>🌿 身體健康平安</option>
              <option value="study" ${fs.category === 'study' ? 'selected' : ''}>📚 學業考試升學</option>
              <option value="family" ${fs.category === 'family' ? 'selected' : ''}>🏠 家運長輩平安</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold text-[#4A2210] mb-1">心中煩惱或祈求事項 *</label>
          <textarea id="fort-question" rows="3" required maxlength="120" placeholder="例：最近考慮轉換跑道，希望神明指點方向..."
            class="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#C98A28] text-sm text-[#261109]">${this._esc(fs.question)}</textarea>
        </div>
        <button type="submit" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#C8232C] to-[#991B1B] text-[#FFF9E6] font-black text-base shadow-lg border border-[#FAD364] hover:brightness-110">
          🙏 誠心稟報神明・前往擲筊
        </button>
      </form>
    `;
  }

  _bindFortuneForm() {
    this.modalRoot.querySelector('#fort-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.fortuneState.userName = this.modalRoot.querySelector('#fort-name').value.trim() || '善信大德';
      this.fortuneState.category = this.modalRoot.querySelector('#fort-cat').value;
      this.fortuneState.question = this.modalRoot.querySelector('#fort-question').value.trim();
      this.fortuneState.step = 'blocks';
      this.fortuneState.lastCast = null;
      soundEngine.playSoftClick();
      this._renderFortuneModal();
    });
  }

  _renderFortuneBlocks() {
    const fs = this.fortuneState;
    const cast = fs.lastCast;
    const isSheng = cast?.type === 'sheng';
    const renderBlock = (isFlat, deg) => `
      <div class="w-24 h-12 rounded-t-full border-4 shadow-lg flex items-center justify-center font-black text-xs ${
        isFlat
          ? 'bg-gradient-to-b from-[#FDE2B8] to-[#E9B872] border-[#B91C1C] text-[#7C1414]'
          : 'bg-gradient-to-b from-[#DC2626] to-[#991B1B] border-[#7F1D1D] text-[#FFF3B0]'
      }" style="transform: rotate(${deg}deg);">
        ${isFlat ? '平面（陽）' : '凸面（陰）'}
      </div>
    `;

    return `
      <div class="text-center space-y-4">
        <div class="bg-[#FFF3D6] border border-[#E6B44C] rounded-2xl p-3 text-xs font-bold text-[#5C3A21]">
          稟報善信：${this._esc(fs.userName)} ｜ 所問：「${this._esc(fs.question)}」
        </div>
        <div id="bei-stage" class="bg-gradient-to-b from-[#7C1414] to-[#520D0D] rounded-3xl p-6 border-2 border-[#FAD364] min-h-[172px] flex flex-col items-center justify-center gap-3">
          ${cast ? `
            <div class="flex items-center justify-center gap-6 animate-bounce-once">
              ${renderBlock(cast.leftFlat, -12)}
              ${renderBlock(cast.rightFlat, 14)}
            </div>
            <div class="text-2xl font-black tracking-widest ${isSheng ? 'text-[#FFE66D]' : 'text-[#FECACA]'}">
              ${cast.type === 'sheng' ? '✨ 聖 筊（一正一反）✨' : cast.type === 'xiao' ? '😊 笑 筊（兩平向上）' : '🌙 陰 筊（兩凸向上）'}
            </div>
            <p class="text-xs text-[#FFF8E2] max-w-md font-medium leading-relaxed">
              ${cast.type === 'sheng'
                ? '神明已應允賜籤！請點擊下方按鈕抽出六十甲子靈籤。'
                : cast.type === 'xiao'
                  ? '神明笑笑的喔～請把心願再默念清楚一點後重新擲筊！'
                  : '神明暫未應允，請深呼吸靜心重新稟報後再誠心擲筊一次。'}
            </p>
          ` : `
            <div class="flex items-center gap-5">${renderBlock(true, -8)}${renderBlock(false, 8)}</div>
            <div class="text-sm text-[#FFF3B0] font-bold">請默念心願，點擊下方按鈕誠心擲筊</div>
          `}
        </div>
        <div class="flex flex-wrap gap-2 justify-center">
          ${isSheng ? `
            <button id="btn-draw-poem" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#D97706] to-[#B45309] text-white font-black text-base shadow-xl border border-[#FCE07C] animate-pulse">
              🎋 誠心抽出六十甲子靈籤！
            </button>
          ` : `
            <button id="btn-cast-bei" class="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#C8232C] to-[#991B1B] text-[#FFF9E6] font-black text-base shadow-lg border border-[#FAD364]">
              🌙 ${cast ? '重新稟報・再次擲筊' : '點擊擲筊'}
            </button>
            <button id="btn-back-form" class="px-4 py-3 rounded-2xl bg-[#F5E6CC] border-2 border-[#C98A28] text-xs font-bold text-[#4A2210]">
              修改內容
            </button>
          `}
        </div>
      </div>
    `;
  }

  _bindFortuneBlocks() {
    this.modalRoot.querySelector('#btn-back-form')?.addEventListener('click', () => {
      this.fortuneState.step = 'form';
      this._renderFortuneModal();
    });
    this.modalRoot.querySelector('#btn-cast-bei')?.addEventListener('click', () => {
      soundEngine.playMoonBlocks();
      const stage = this.modalRoot.querySelector('#bei-stage');
      if (stage) stage.innerHTML = `<div class="text-[#FFF3B0] font-black text-base animate-pulse">🌙 聖筊翻飛落地中…</div>`;
      setTimeout(() => {
        const r = Math.random();
        let cast;
        if (r < 0.6) {
          cast = { type: 'sheng', leftFlat: true, rightFlat: false };
          soundEngine.playBlessingChime();
          this.hooks.onFortuneShengBei?.();
        } else if (r < 0.82) {
          cast = { type: 'xiao', leftFlat: true, rightFlat: true };
        } else {
          cast = { type: 'yin', leftFlat: false, rightFlat: false };
        }
        this.fortuneState.lastCast = cast;
        this._renderFortuneModal();
      }, 620);
    });
    this.modalRoot.querySelector('#btn-draw-poem')?.addEventListener('click', () => {
      soundEngine.playBlessingChime();
      const poem = SIXTY_FORTUNE_POEMS[Math.floor(Math.random() * SIXTY_FORTUNE_POEMS.length)];
      const interpretation = generateFortuneInterpretation({
        userName: this.fortuneState.userName,
        category: this.fortuneState.category,
        question: this.fortuneState.question,
        poem
      });
      const cardUrl = generateFortuneCardDataURL({ userName: this.fortuneState.userName, poem, interpretation });
      this.fortuneState.poem = poem;
      this.fortuneState.interpretation = interpretation;
      this.fortuneState.cardUrl = cardUrl;
      this.fortuneState.step = 'result';
      this._renderFortuneModal();
    });
  }

  _renderFortuneResult() {
    const { poem, interpretation, userName } = this.fortuneState;
    return `
      <div class="space-y-4">
        <div class="bg-gradient-to-b from-[#FFFDF7] to-[#FCEFD5] border-2 border-[#C98A28] rounded-2xl p-5 text-center shadow-inner">
          <div class="inline-block px-4 py-1 rounded-full bg-[#B91C1C] text-[#FFF8E2] font-black text-sm mb-3">
            第 ${poem.id} 籤 ・ ${poem.stem} ・ ${poem.level}
          </div>
          <div class="font-serif text-xl sm:text-2xl font-black text-[#261109] tracking-widest space-y-1.5 my-2">
            ${poem.poem.map(line => `<div>${line}</div>`).join('')}
          </div>
          <div class="text-xs text-[#8E1515] font-bold mt-3">【聖意典故】${poem.story}</div>
        </div>
        <div class="bg-white border-2 border-[#E6B44C] rounded-2xl p-4 space-y-2.5 text-sm leading-relaxed">
          <div class="flex items-center gap-2 font-black text-[#8E1515] border-b border-[#F3E2BE] pb-2">
            <span class="text-xl">👴</span>
            <span>AI 廟公「阿財伯」給 ${this._esc(userName)} 的專屬白話解籤</span>
          </div>
          <p class="text-[#2B130B] font-bold">${this._esc(interpretation.opening)}</p>
          <p class="text-[#3E1C11] font-medium">${this._esc(interpretation.analysis)}</p>
          <p class="text-[#3E1C11] bg-[#FFF8E7] p-3 rounded-xl border border-[#E6B44C] font-medium">
            💡 <strong>廟公實戰建議：</strong>${this._esc(interpretation.advice)}
          </p>
          <ul class="text-xs text-[#4A2210] font-medium space-y-1 list-disc list-inside pt-1">
            ${interpretation.actionTips.map(t => `<li>${this._esc(t)}</li>`).join('')}
          </ul>
        </div>
        <div class="flex flex-wrap gap-2">
          <button id="btn-download-card" class="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#C8232C] to-[#991B1B] text-[#FFF9E6] font-black text-sm shadow-lg border border-[#FAD364]">
            🖼️ 下載「祈福籤詩圖卡」分享親友 (PNG)
          </button>
          <button id="btn-retry-fortune" class="px-4 py-3 rounded-2xl bg-[#F5E6CC] border-2 border-[#C98A28] text-xs font-bold text-[#4A2210]">
            重新求籤
          </button>
        </div>
      </div>
    `;
  }

  _bindFortuneResult() {
    this.modalRoot.querySelector('#btn-download-card')?.addEventListener('click', () => {
      soundEngine.playBlessingChime();
      const a = document.createElement('a');
      a.href = this.fortuneState.cardUrl;
      a.download = `玉勅代天府德慈宮-第${this.fortuneState.poem.id}籤祈福圖卡.png`;
      a.click();
    });
    this.modalRoot.querySelector('#btn-retry-fortune')?.addEventListener('click', () => {
      this.fortuneState.step = 'form';
      this._renderFortuneModal();
    });
  }

  // =========================================================================
  // 6. 廟右邊紅底木框公佈欄（需求 #13：海報挑選模式，每次只專注閱讀一張海報不雜亂！）
  // =========================================================================
  openBulletinModal() {
    this.closeModal();
    let selectedPoster = null; // null | 'announcements' | 'construction' | 'donors'

    const renderBulletin = () => {
      const b = storageSync.getBulletin();
      const c = b.construction || { percent: 72, stage: '', targetDate: '', note: '' };
      const anns = b.announcements || [];
      const donors = b.donors || [];

      let bodyHtml = '';
      if (!selectedPoster) {
        // 海報牆總覽：三張俐落文創海報供信眾挑選閱讀
        bodyHtml = `
          <div class="text-center mb-4">
            <p class="text-sm font-black text-[#6B2F1A]">請點擊想閱覽的廟務海報，專心查看單一主題內容：</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <!-- 海報 1：最新廟務公告 -->
            <button data-open-poster="announcements"
              class="group text-left rounded-2xl overflow-hidden border-3 border-[#C8232C] bg-gradient-to-b from-[#9E1B1B] to-[#741111] text-[#FFF9E6] shadow-xl hover:-translate-y-1 transition flex flex-col justify-between min-h-[250px] p-4">
              <div>
                <div class="flex items-center justify-between">
                  <span class="px-2 py-0.5 rounded-full bg-[#FAD364] text-[#6A1010] text-[10px] font-black">POSTER 01</span>
                  <span class="text-2xl">📌</span>
                </div>
                <h3 class="font-serif font-black text-xl tracking-wider mt-4 text-[#FFE89E]">最新廟務公告</h3>
                <p class="text-xs text-[#FDE8C8] mt-2 leading-relaxed">法會慶典、開廟門時刻與最新活動通知一覽。</p>
              </div>
              <div class="pt-4 border-t border-white/20 flex items-center justify-between text-xs font-bold text-[#FFE89E]">
                <span>共 ${anns.length} 則公告</span>
                <span class="group-hover:translate-x-1 transition">點開閱讀 ➔</span>
              </div>
            </button>

            <!-- 海報 2：新廟建廟進度 -->
            <button data-open-poster="construction"
              class="group text-left rounded-2xl overflow-hidden border-3 border-[#D97706] bg-gradient-to-b from-[#B45309] to-[#78350F] text-[#FFF9E6] shadow-xl hover:-translate-y-1 transition flex flex-col justify-between min-h-[250px] p-4">
              <div>
                <div class="flex items-center justify-between">
                  <span class="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#78350F] text-[10px] font-black">POSTER 02</span>
                  <span class="text-2xl">🏯</span>
                </div>
                <h3 class="font-serif font-black text-xl tracking-wider mt-4 text-[#FDE68A]">新廟建廟進度</h3>
                <p class="text-xs text-[#FEF3C7] mt-2 leading-relaxed">最新主體工程里程碑與新廟落成願景報告。</p>
                <div class="mt-4">
                  <div class="flex justify-between text-xs font-black text-[#FFE89E] mb-1">
                    <span>目前進度</span><span>${c.percent}%</span>
                  </div>
                  <div class="w-full h-2.5 bg-black/30 rounded-full overflow-hidden">
                    <div class="h-full bg-[#FDE047] rounded-full" style="width:${c.percent}%"></div>
                  </div>
                </div>
              </div>
              <div class="pt-4 border-t border-white/20 flex items-center justify-between text-xs font-bold text-[#FDE68A]">
                <span>工程報告</span>
                <span class="group-hover:translate-x-1 transition">點開閱讀 ➔</span>
              </div>
            </button>

            <!-- 海報 3：捐款芳名錄 -->
            <button data-open-poster="donors"
              class="group text-left rounded-2xl overflow-hidden border-3 border-[#183C32] bg-gradient-to-b from-[#1E4D40] to-[#112E26] text-[#FBF7E9] shadow-xl hover:-translate-y-1 transition flex flex-col justify-between min-h-[250px] p-4">
              <div>
                <div class="flex items-center justify-between">
                  <span class="px-2 py-0.5 rounded-full bg-[#E5B968] text-[#183C32] text-[10px] font-black">POSTER 03</span>
                  <span class="text-2xl">🙏</span>
                </div>
                <h3 class="font-serif font-black text-xl tracking-wider mt-4 text-[#FBE39C]">功德捐款芳名錄</h3>
                <p class="text-xs text-[#DCEEE2] mt-2 leading-relaxed">感謝十方善信護持建廟與香油功德，福澤綿長。</p>
              </div>
              <div class="pt-4 border-t border-white/20 flex items-center justify-between text-xs font-bold text-[#FBE39C]">
                <span>共 ${donors.length} 筆善信芳名</span>
                <span class="group-hover:translate-x-1 transition">點開閱讀 ➔</span>
              </div>
            </button>
          </div>
        `;
      } else if (selectedPoster === 'announcements') {
        bodyHtml = `
          <div class="space-y-3 animate-fade-in">
            <div class="flex items-center justify-between pb-2 border-b border-[#E5D3B3]">
              <h3 class="font-serif font-black text-xl text-[#8E1515]">📌 最新廟務公告海報</h3>
              <button data-back-posters class="px-3.5 py-1.5 rounded-xl bg-[#F5E6CC] hover:bg-[#EAD2AC] border border-[#C98A28] text-xs font-black text-[#4A2210]">← 返回海報牆</button>
            </div>
            ${anns.length === 0 ? `<div class="text-center text-sm text-[#7A543E] py-8">目前尚無最新公告。</div>` : anns.map(a => `
              <div class="bg-white rounded-2xl p-4 border-2 border-[#E5D3B3] shadow-xs">
                <div class="flex items-center justify-between gap-2 mb-1.5">
                  <div class="flex items-center gap-2">
                    <span class="px-2.5 py-0.5 rounded-full bg-[#B91C1C] text-white text-[11px] font-bold">${this._esc(a.tag)}</span>
                    <span class="font-black text-base text-[#261109]">${this._esc(a.title)}</span>
                  </div>
                  <span class="text-xs font-semibold text-[#7A543E] shrink-0">${this._esc(a.date)}</span>
                </div>
                <p class="text-sm text-[#3E1C11] font-medium leading-relaxed">${this._esc(a.content)}</p>
              </div>
            `).join('')}
          </div>
        `;
      } else if (selectedPoster === 'construction') {
        bodyHtml = `
          <div class="space-y-4 animate-fade-in">
            <div class="flex items-center justify-between pb-2 border-b border-[#E5D3B3]">
              <h3 class="font-serif font-black text-xl text-[#8E1515]">🏯 新廟建廟進度報告海報</h3>
              <button data-back-posters class="px-3.5 py-1.5 rounded-xl bg-[#F5E6CC] hover:bg-[#EAD2AC] border border-[#C98A28] text-xs font-black text-[#4A2210]">← 返回海報牆</button>
            </div>
            <div class="bg-gradient-to-b from-[#FEF3C7] to-[#FFF8E7] border-2 border-[#D97706] rounded-3xl p-6 text-center space-y-4">
              <div class="text-5xl font-black text-[#B91C1C]">${c.percent}%</div>
              <div class="w-full h-5 bg-white rounded-full overflow-hidden border-2 border-[#C98A28] shadow-inner">
                <div class="h-full bg-gradient-to-r from-[#F59E0B] via-[#D97706] to-[#B91C1C] rounded-full" style="width:${c.percent}%"></div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
                <div class="bg-white rounded-2xl p-3.5 border border-[#E5D3B3]">
                  <div class="text-[11px] font-bold text-[#7A543E]">目前施工階段</div>
                  <div class="font-black text-sm text-[#261109] mt-1">${this._esc(c.stage)}</div>
                </div>
                <div class="bg-white rounded-2xl p-3.5 border border-[#E5D3B3]">
                  <div class="text-[11px] font-bold text-[#7A543E]">預計里程碑</div>
                  <div class="font-black text-sm text-[#261109] mt-1">${this._esc(c.targetDate)}</div>
                </div>
              </div>
              <p class="text-sm text-[#4A2210] font-medium leading-relaxed bg-white/80 rounded-2xl p-4 border border-[#E6C994]">
                ${this._esc(c.note)}
              </p>
            </div>
          </div>
        `;
      } else if (selectedPoster === 'donors') {
        bodyHtml = `
          <div class="space-y-3 animate-fade-in">
            <div class="flex items-center justify-between pb-2 border-b border-[#E5D3B3]">
              <h3 class="font-serif font-black text-xl text-[#183C32]">🙏 建廟暨香油捐款芳名錄</h3>
              <button data-back-posters class="px-3.5 py-1.5 rounded-xl bg-[#F5E6CC] hover:bg-[#EAD2AC] border border-[#C98A28] text-xs font-black text-[#4A2210]">← 返回海報牆</button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              ${donors.map(d => `
                <div class="flex items-center justify-between bg-[#FFF4E0] border-2 border-[#E6B44C] rounded-xl px-4 py-3">
                  <div>
                    <div class="font-black text-sm text-[#261109]">${this._esc(d.name)}</div>
                    <div class="text-xs font-medium text-[#6B4E3D]">${this._esc(d.item)} · ${this._esc(d.date)}</div>
                  </div>
                  <div class="font-black text-sm text-[#B91C1C]">${this._esc(d.amount)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      this.modalRoot.innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-5">
          <div class="bg-[#FFFBF2] border-4 border-[#8E1515] rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-[#261109]">
            <div class="bg-gradient-to-r from-[#7C1414] to-[#B91C1C] px-5 py-3.5 flex items-center justify-between text-[#FFF8E2] border-b-2 border-[#FAD364]">
              <div>
                <h2 class="font-black text-lg">📢 玉勅代天府德慈宮・廟務海報牆</h2>
                <p class="text-xs text-[#FFE89E]">最後更新：${this._esc(b.updatedAt || '')}</p>
              </div>
              <button data-close class="w-8 h-8 rounded-full bg-black/25 hover:bg-black/45 text-white font-bold">✕</button>
            </div>
            <div class="p-5 overflow-y-auto flex-1">
              ${bodyHtml}
            </div>
          </div>
        </div>
      `;

      this.modalRoot.querySelector('[data-close]')?.addEventListener('click', () => this.closeModal());
      this.modalRoot.querySelectorAll('[data-open-poster]').forEach(btn => {
        btn.addEventListener('click', () => {
          soundEngine.playSoftClick();
          selectedPoster = btn.getAttribute('data-open-poster');
          renderBulletin();
        });
      });
      this.modalRoot.querySelector('[data-back-posters]')?.addEventListener('click', () => {
        soundEngine.playSoftClick();
        selectedPoster = null;
        renderBulletin();
      });
    };

    renderBulletin();
  }

  // =========================================================================
  // 7. 廟宇右側外部金爐（驗收 #9：逐張飛入金爐火焰煙霧動畫）
  // =========================================================================
  openFurnaceModal() {
    this.closeModal();
    this.modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
        <div class="bg-[#FFFBF2] border-4 border-[#C2410C] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden text-[#261109]">
          <div class="bg-gradient-to-r from-[#9A3412] to-[#EA580C] px-5 py-3.5 flex items-center justify-between text-white border-b-2 border-[#FCE07C]">
            <h2 class="font-black text-lg">🔥 廟宇右側外部・寶塔金爐</h2>
            <button data-close class="w-8 h-8 rounded-full bg-black/25 hover:bg-black/45 text-white font-bold">✕</button>
          </div>
          <div class="p-5 space-y-4 text-center">
            <div class="text-5xl">🔥🟨✨</div>
            <p class="text-sm text-[#3E1C11] font-medium leading-relaxed">
              誠心將敬神壽金<strong>一張一張投入寶塔金爐爐口</strong>，<br>
              隨著溫暖火焰跳動與化金青煙冉冉升起，祈願消災解厄、平安納福！
            </p>
            <button id="btn-burn-joss" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#EA580C] to-[#B91C1C] text-white font-black text-base shadow-lg border border-[#FCE07C] hover:brightness-110 active:scale-95 transition">
              🔥 開始逐張投入金紙化金
            </button>
          </div>
        </div>
      </div>
    `;
    this.modalRoot.querySelector('[data-close]').addEventListener('click', () => this.closeModal());
    this.modalRoot.querySelector('#btn-burn-joss').addEventListener('click', () => {
      this.closeModal();
      this.hooks.onBurnJossPaper?.();
    });
  }

  // =========================================================================
  // 8. 廟埕文創供品鋪（功德請購供品收入隨身香火背包）
  // =========================================================================
  openOfferingShopModal() {
    this.closeModal();
    const renderShop = (flashMsg = '') => {
      const player = storageSync.getPlayer();
      const inv = player.inventory || {};
      this.modalRoot.innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-5">
          <div class="bg-[#FBF7E9] border-4 border-[#B45309] rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-[#1C2D28]">
            <div class="bg-gradient-to-r from-[#78350F] to-[#B45309] px-5 py-3.5 flex items-center justify-between text-[#FFF8E2] border-b-2 border-[#E5B968]">
              <div>
                <h2 class="font-black text-lg">🛍️ 廟埕文創供品鋪</h2>
                <p class="text-xs text-[#FCE09B]">目前功德值：<strong>✨ ${player.merit || 0} 功德</strong>｜請購後自動放入隨身香火背包</p>
              </div>
              <button data-close class="w-8 h-8 rounded-full bg-black/25 hover:bg-black/45 text-white font-bold">✕</button>
            </div>
            <div class="p-4 sm:p-5 overflow-y-auto space-y-3">
              ${flashMsg ? `<div class="p-2.5 rounded-xl bg-[#FEF3C7] border border-[#D97706] text-xs font-black text-[#78350F]">${flashMsg}</div>` : ''}
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                ${OFFERING_CATALOG.map(item => `
                  <div class="rounded-2xl bg-white border-2 ${item.featured ? 'border-[#D97706]' : 'border-[#E2D4B7]'} p-3 flex flex-col justify-between text-center shadow-xs">
                    <div>
                      <div class="flex justify-between items-center text-[10px] font-bold mb-1">
                        <span class="${item.featured ? 'text-[#B45309]' : 'text-[#6B7A72]'}">${item.featured ? '★ 限定' : '經典'}</span>
                        <span class="px-1.5 py-0.5 rounded-full bg-[#E1EFE6] text-[#183C32]">已有 ×${inv[item.id] || 0}</span>
                      </div>
                      <div class="my-1 flex items-center justify-center min-h-[38px]">${renderOfferingIcon(item, 'text-3xl')}</div>
                      <div class="font-black text-sm text-[#183C32]">${item.name}</div>
                      <div class="text-[11px] text-[#53635A] mt-0.5">${item.blessing}</div>
                    </div>
                    <button data-buy-id="${item.id}" class="mt-3 w-full py-1.5 rounded-xl bg-[#183C32] hover:bg-[#1E4D40] text-[#FBF7E9] text-xs font-black transition active:scale-95">
                      ✨ ${item.cost} 功德請購
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
      this.modalRoot.querySelector('[data-close]').addEventListener('click', () => this.closeModal());
      this.modalRoot.querySelectorAll('[data-buy-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-buy-id');
          const res = storageSync.buyOffering(id);
          if (res.ok) {
            soundEngine.playBlessingChime();
            renderShop(`✓ 已請購【${res.item.emoji} ${res.item.name}】放入隨身香火背包！快去正殿大供桌擺放祈願吧～`);
          } else {
            soundEngine.playSoftClick();
            renderShop(`⚠️ ${res.reason}`);
          }
        });
      });
    };
    renderShop();
  }

  // =========================================================================
  // 9. 民俗智慧挑戰攤（需求 #6：50 題庫隨機抽 6 題，每日限挑戰一次！）
  // =========================================================================
  openQuizBoothModal() {
    this.closeModal();

    if (storageSync.hasPlayedQuizToday()) {
      const p = storageSync.getPlayer();
      this.hooks.onQuizAlreadyDone?.(p.quizDailyScore || 0);
      this.modalRoot.innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div class="bg-[#FBF7E9] border-4 border-[#0F766E] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden text-[#1C2D28]">
            <div class="bg-gradient-to-r from-[#115E59] to-[#0D9488] px-5 py-3.5 flex items-center justify-between text-[#FBF7E9] border-b-2 border-[#E5B968]">
              <h2 class="font-black text-lg">🎯 民俗智慧挑戰攤（每日限一次）</h2>
              <button data-close class="w-8 h-8 rounded-full bg-black/25 hover:bg-black/45 text-white font-bold">✕</button>
            </div>
            <div class="p-6 text-center space-y-4">
              <div class="text-5xl">🏅</div>
              <div class="font-black text-lg text-[#0F766E]">今日 6 題民俗智慧挑戰已完成！</div>
              <div class="bg-[#ECFDF5] border-2 border-[#10B981] rounded-2xl p-3.5 text-sm font-bold text-[#065F46]">
                今日成績：答對 <span class="text-xl text-[#B91C1C]">${p.quizDailyScore || 0} / 6</span> 題
              </div>
              <p class="text-xs text-[#53635A] leading-relaxed">
                民俗智慧挑戰每日可參與一次，明天凌晨 00:00 將重新抽出 6 題全新題目，歡迎明天再來考驗智慧賺功德喔！
              </p>
              <button data-close class="w-full py-3 rounded-xl bg-[#183C32] text-[#FBF7E9] font-black text-sm">
                明天再來挑戰 🙏
              </button>
            </div>
          </div>
        </div>
      `;
      this.modalRoot.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => this.closeModal()));
      return;
    }

    // 從 50 題庫 Fisher-Yates 洗牌抽出 6 題，並將每題選項隨機打亂（修復欄位對應 q / opts / ans / exp！）
    const pool = [...FOLKLORE_QUIZ_50];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const questions = pool.slice(0, 6).map((raw) => {
      const rawOpts = raw.opts || raw.options || [];
      const rawAns = raw.ans ?? raw.answerIdx ?? 0;
      const tagged = rawOpts.map((text, i) => ({ text, isCorrect: i === rawAns }));
      for (let k = tagged.length - 1; k > 0; k--) {
        const r = Math.floor(Math.random() * (k + 1));
        [tagged[k], tagged[r]] = [tagged[r], tagged[k]];
      }
      return {
        id: raw.id,
        question: raw.q || raw.question || '',
        options: tagged.map(t => t.text),
        answerIdx: tagged.findIndex(t => t.isCorrect),
        explain: raw.exp || raw.explain || ''
      };
    });

    let step = 0;
    let correctCount = 0;
    let feedback = null;
    let finishedResult = null;

    const renderQuiz = () => {
      const player = storageSync.getPlayer();

      if (finishedResult) {
        const { reward } = finishedResult;
        this.modalRoot.innerHTML = `
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div class="bg-[#FBF7E9] border-4 border-[#0F766E] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden text-[#1C2D28] animate-fade-in">
              <div class="bg-gradient-to-r from-[#115E59] to-[#0D9488] px-5 py-3.5 flex items-center justify-between text-[#FBF7E9] border-b-2 border-[#E5B968]">
                <h2 class="font-black text-lg">🎉 每日民俗智慧挑戰結算</h2>
                <button data-close class="w-8 h-8 rounded-full bg-black/25 hover:bg-black/45 text-white font-bold">✕</button>
              </div>
              <div class="p-6 text-center space-y-4">
                <div class="text-5xl">${correctCount === 6 ? '🏆' : correctCount >= 4 ? '🌟' : '🙏'}</div>
                <div class="font-black text-xl text-[#183C32]">
                  答對 ${correctCount} / 6 題！
                </div>
                <div class="bg-[#FEF3C7] border-2 border-[#D97706] rounded-2xl p-4 space-y-1">
                  <div class="text-sm font-black text-[#8E1515]">獲得功德結緣禮：✨ +${reward} 功德</div>
                  ${correctCount === 6 ? `<div class="text-xs font-bold text-[#B45309]">🎊 全對滿分額外加贈 +20 智慧功德！</div>` : ''}
                  <div class="text-xs text-[#5C3A21]">紀錄已自動存檔，明日可再次抽題挑戰！</div>
                </div>
                <button data-close class="w-full py-3 rounded-xl bg-[#183C32] hover:bg-[#1E4D40] text-[#FBF7E9] font-black text-sm">
                  收下功德・繼續逛德慈宮 ✨
                </button>
              </div>
            </div>
          </div>
        `;
        this.modalRoot.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => this.closeModal()));
        return;
      }

      const q = questions[step];
      const pct = Math.round(((step + (feedback ? 1 : 0)) / 6) * 100);
      this.modalRoot.innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-5">
          <div class="bg-[#FBF7E9] border-4 border-[#0F766E] rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden text-[#1C2D28]">
            <div class="bg-gradient-to-r from-[#115E59] to-[#0D9488] px-5 py-3.5 flex items-center justify-between text-[#FBF7E9] border-b-2 border-[#E5B968]">
              <div>
                <h2 class="font-black text-lg">🎯 民俗智慧挑戰攤（每日限 1 次・共 6 題）</h2>
                <p class="text-xs text-[#CCFBF1]">精選台灣宮廟與民俗文化隨機抽題｜目前已答對 <strong>${correctCount}</strong> 題｜功德：<strong>${player.merit || 0}</strong></p>
              </div>
              <button data-close class="w-8 h-8 rounded-full bg-black/25 hover:bg-black/45 text-white font-bold">✕</button>
            </div>
            <div class="p-5 space-y-4">
              <div>
                <div class="flex justify-between text-xs font-black text-[#0F766E] mb-1">
                  <span>第 ${step + 1} / 6 題</span>
                  <span>答對每題 +15 功德（滿分加贈 +20）</span>
                </div>
                <div class="w-full h-2 bg-[#E6DCC6] rounded-full overflow-hidden">
                  <div class="h-full bg-[#0D9488] transition-all duration-300" style="width:${pct}%"></div>
                </div>
              </div>

              <div class="bg-white border-2 border-[#C9B898] rounded-2xl p-4">
                <div class="font-black text-base text-[#183C32] leading-relaxed">${this._esc(q.question)}</div>
              </div>

              <div class="space-y-2">
                ${q.options.map((opt, idx) => `
                  <button data-quiz-opt="${idx}" ${feedback ? 'disabled' : ''} class="w-full text-left px-4 py-3 rounded-xl border-2 font-bold text-sm transition ${
                    feedback
                      ? (idx === q.answerIdx ? 'bg-[#DCFCE7] border-[#16A34A] text-[#14532D]' : idx === feedback.picked ? 'bg-[#FEE2E2] border-[#EF4444] text-[#991B1B]' : 'bg-[#F5F1E6] border-[#DFD5C0] text-[#7A756B]')
                      : 'bg-white border-[#D4C3A1] hover:bg-[#FEF3C7] hover:border-[#D97706] text-[#183C32]'
                  }">
                    ${['A', 'B', 'C'][idx]}. ${this._esc(opt)}
                  </button>
                `).join('')}
              </div>

              ${feedback ? `
                <div class="p-3.5 rounded-2xl border-2 ${feedback.ok ? 'bg-[#ECFDF5] border-[#10B981] text-[#065F46]' : 'bg-[#FEF2F2] border-[#EF4444] text-[#991B1B]'} text-xs leading-relaxed">
                  <div class="font-black text-sm mb-1">${feedback.title}</div>
                  <p>${this._esc(q.explain)}</p>
                  <button id="quiz-next" class="mt-3 px-4 py-2 rounded-xl bg-[#183C32] text-[#FBF7E9] text-xs font-black">
                    ${step < 5 ? `前往第 ${step + 2} / 6 題 ➔` : '查看今日結算與領取功德 🏆'}
                  </button>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;

      this.modalRoot.querySelector('[data-close]').addEventListener('click', () => this.closeModal());
      this.modalRoot.querySelectorAll('[data-quiz-opt]').forEach(btn => {
        btn.addEventListener('click', () => {
          const picked = Number(btn.getAttribute('data-quiz-opt'));
          if (picked === q.answerIdx) {
            correctCount++;
            soundEngine.playBlessingChime();
            feedback = { ok: true, picked, title: '🎉 答對了！這題民俗智慧難不倒您！' };
          } else {
            soundEngine.playSoftClick();
            feedback = { ok: false, picked, title: '😊 差一點點！來看看正確的台灣宮廟知識：' };
          }
          renderQuiz();
        });
      });

      this.modalRoot.querySelector('#quiz-next')?.addEventListener('click', () => {
        soundEngine.playSoftClick();
        if (step < 5) {
          step++;
          feedback = null;
          renderQuiz();
        } else {
          finishedResult = storageSync.completeDailyQuiz(correctCount);
          soundEngine.playBlessingChime();
          this.hooks.onMeritEarned?.(finishedResult.reward, `🏆 完成每日民俗挑戰（答對 ${correctCount}/6 題），獲得 +${finishedResult.reward} 功德！`);
          renderQuiz();
        }
      });
    };
    renderQuiz();
  }

  // =========================================================================
  // 10. 隨身香火背包 ＋ 每日祈福簽到
  // =========================================================================
  openBackpackModal() {
    this.closeModal();
    const renderBag = (msg = '') => {
      const player = storageSync.getPlayer();
      const inv = player.inventory || {};
      const today = new Date().toISOString().slice(0, 10);
      const checkedIn = player.lastCheckinDate === today;

      this.modalRoot.innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-5">
          <div class="bg-[#FBF7E9] border-4 border-[#183C32] rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden text-[#1C2D28]">
            <div class="bg-[#183C32] px-5 py-3.5 flex items-center justify-between text-[#FBF7E9] border-b-2 border-[#E5B968]">
              <div>
                <h2 class="font-black text-lg">🎒 隨身香火背包與每日簽到</h2>
                <p class="text-xs text-[#E5B968]">香客：${this._esc(player.name || '虔誠香客')} ｜ 累積功德：<strong>✨ ${player.merit || 0}</strong></p>
              </div>
              <button data-close class="w-8 h-8 rounded-full bg-black/25 hover:bg-black/45 text-white font-bold">✕</button>
            </div>
            <div class="p-5 space-y-4">
              ${msg ? `<div class="p-2.5 rounded-xl bg-[#FEF3C7] border border-[#D97706] text-xs font-black text-[#78350F]">${msg}</div>` : ''}

              <!-- 每日簽到領功德 -->
              <div class="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#E9F3EC] border border-[#9BBAA8]">
                <div>
                  <div class="font-black text-sm text-[#183C32]">📅 每日德慈宮平安簽到</div>
                  <div class="text-xs text-[#53635A]">每日簽到領取 +20 功德結緣禮</div>
                </div>
                <button id="bag-checkin" ${checkedIn ? 'disabled' : ''} class="px-4 py-2 rounded-xl text-xs font-black ${
                  checkedIn ? 'bg-gray-300 text-gray-600' : 'bg-[#183C32] hover:bg-[#1E4D40] text-[#FBF7E9]'
                }">
                  ${checkedIn ? '✓ 今日已簽到' : '領取 +20 功德'}
                </button>
              </div>

              <!-- 背包現有供品 -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="font-black text-sm text-[#183C32]">背包內的供品庫存</span>
                  <button id="bag-go-shop" class="text-xs font-black text-[#B45309] hover:underline">🛍️ 前往供品鋪請購 ➔</button>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  ${OFFERING_CATALOG.map(item => {
                    const qty = inv[item.id] || 0;
                    return `
                      <div class="p-2.5 rounded-xl border text-center ${qty > 0 ? 'bg-white border-[#C98A28]' : 'bg-[#F4EEE0] border-[#E4D7BC] opacity-60'}">
                        <div class="flex items-center justify-center min-h-[34px]">${renderOfferingIcon(item, 'text-2xl')}</div>
                        <div class="font-black text-xs mt-0.5 truncate">${item.name}</div>
                        <div class="text-[11px] font-bold ${qty > 0 ? 'text-[#8E1515]' : 'text-[#7A756B]'}">持有 ×${qty}</div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      this.modalRoot.querySelector('[data-close]').addEventListener('click', () => this.closeModal());
      this.modalRoot.querySelector('#bag-go-shop')?.addEventListener('click', () => {
        soundEngine.playSoftClick();
        this.openOfferingShopModal();
      });
      this.modalRoot.querySelector('#bag-checkin')?.addEventListener('click', () => {
        const r = storageSync.claimDailyCheckin();
        if (r.ok) {
          soundEngine.playBlessingChime();
          renderBag('✨ 今日平安簽到完成！已領取 +20 功德結緣禮！');
        }
      });
    };
    renderBag();
  }

  // =========================================================================
  // 11. 假山瀑布錦鯉池・水池餵魚互動（需求 #1）
  // =========================================================================
  openFishPondModal() {
    this.closeModal();
    this.modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
        <div class="bg-[#FBF7E9] border-4 border-[#0284C7] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden text-[#1C2D28] animate-fade-in">
          <div class="bg-gradient-to-r from-[#0369A1] to-[#0284C7] px-5 py-3.5 flex items-center justify-between text-white border-b-2 border-[#BAE6FD]">
            <h2 class="font-black text-lg">🐟 假山瀑布錦鯉池・餵魚祈福</h2>
            <button data-close class="w-8 h-8 rounded-full bg-black/25 hover:bg-black/45 text-white font-bold">✕</button>
          </div>
          <div class="p-5 space-y-4 text-center">
            <div class="text-5xl">🐟💦🌿</div>
            <p class="text-sm text-[#1E3A5F] font-medium leading-relaxed">
              清澈的假山瀑布池裡悠游著 9 尾七彩錦鯉。<br>
              灑一把愛心魚飼料，看錦鯉們歡喜游過來爭食，既療癒又能結善緣（免費餵食並贈 <strong>+3 功德</strong>）！
            </p>
            <button id="btn-feed-koi"
              class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#0284C7] to-[#0369A1] text-white font-black text-base shadow-lg border border-[#BAE6FD] hover:brightness-110 active:scale-95 transition">
              ✨ 灑一把錦鯉魚飼料！
            </button>
          </div>
        </div>
      </div>
    `;
    this.modalRoot.querySelector('[data-close]').addEventListener('click', () => this.closeModal());
    this.modalRoot.querySelector('#btn-feed-koi').addEventListener('click', () => {
      soundEngine.playBlessingChime();
      this.closeModal();
      this.hooks.onFeedKoi?.();
    });
  }

  _esc(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
}
