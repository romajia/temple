/**
 * V5 線上安太歲紅紙燈牆（需求 #2 & #12）
 * - 移除內部開發指令文字，維持溫暖虔誠的信眾介面
 * - 姓名欄位支援長公司行號（最多 30 字元）
 * - 紅紙名條依字數自動縮小字級並支援直式雙行／三行排版，文字絕不超出紙張！
 */
import { storageSync } from '../services/storageSync.js';
import { soundEngine } from '../audio/soundEngine.js';

const ZODIACS = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬', '公司行號'];

export class TaiSuiWallUI {
  constructor(modalRoot, { onHighlight3D, onLightLamp3D }) {
    this.modalRoot = modalRoot;
    this.onHighlight3D = onHighlight3D;
    this.onLightLamp3D = onLightLamp3D;
    this.isOpen = false;
    this.searchQuery = '';
    this.justAddedId = null;

    storageSync.subscribe('taisui', () => {
      if (this.isOpen) this.render();
    });
  }

  open() {
    this.isOpen = true;
    this.render();
  }

  close() {
    this.isOpen = false;
    this.modalRoot.innerHTML = '';
    if (this.onHighlight3D) this.onHighlight3D('');
  }

  _getStripFontStyle(name) {
    const len = name.length;
    if (len <= 4) return 'font-size: 21px; letter-spacing: 0.14em; line-height: 1.18;';
    if (len <= 7) return 'font-size: 17px; letter-spacing: 0.06em; line-height: 1.14;';
    if (len <= 12) return 'font-size: 14px; letter-spacing: 0.03em; line-height: 1.10;';
    return 'font-size: 12.5px; letter-spacing: 0.01em; line-height: 1.06;';
  }

  render() {
    const list = storageSync.getTaiSuiList();
    const q = this.searchQuery.trim();
    const matches = q ? list.filter(item => item.name.includes(q)) : [];

    this.modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-5">
        <div class="bg-[#FFFBF2] border-4 border-[#8E1515] rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-[#261109]">
          <div class="bg-gradient-to-r from-[#7C1414] via-[#A81C18] to-[#7C1414] px-5 py-3.5 flex items-center justify-between text-[#FFF8E2] border-b-2 border-[#FAD364]">
            <div>
              <h2 class="text-lg sm:text-xl font-black tracking-wider flex items-center gap-2">
                <span>🏮</span> 玉勅代天府德慈宮・紅紙太歲燈牆
              </h2>
              <p class="text-xs text-[#FFE89E] mt-0.5 font-medium">
                目前共安奉 <strong>${list.length}</strong> 盞太歲平安燈｜誠心為自己、親友或公司行號點燈祈福
              </p>
            </div>
            <button id="ts-close" class="w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white text-lg font-bold">✕</button>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
            <!-- 左側：高對比整面紅紙名條牆 -->
            <div class="lg:col-span-8 flex flex-col bg-[#661010] p-4 overflow-hidden">
              <div class="flex flex-wrap items-center gap-2 mb-3">
                <div class="relative flex-1 min-w-[200px]">
                  <input id="ts-search" type="text" value="${this._esc(this.searchQuery)}"
                    placeholder="輸入姓名或公司行號搜尋燈位..."
                    class="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FFFDF8] border-2 border-[#FAD364] text-sm font-bold text-[#261109] focus:outline-none focus:ring-2 focus:ring-[#FBBF24]" />
                  <span class="absolute left-3 top-2.5 text-sm">🔍</span>
                </div>
                ${q ? `<button id="ts-clear-search" class="px-3 py-2 rounded-xl bg-[#991B1B] text-[#FFF3B0] text-xs font-bold border border-[#FAD364]">清除搜尋</button>` : ''}
                <div class="text-xs text-[#FFF0B3] font-semibold px-1">
                  ${q
                    ? (matches.length > 0 ? `✨ 找到 ${matches.length} 盞符合的燈位！已高亮定位` : '⚠️ 尚未查到此燈位，歡迎於右側線上點燈祈福！')
                    : '點擊任一紅紙名條可查看詳細祈福語'}
                </div>
              </div>

              <div id="ts-wall-grid" class="flex-1 overflow-y-auto pr-1 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 content-start">
                ${list.map((item, idx) => {
                  const isHit = Boolean(q && item.name.includes(q));
                  const isNew = item.id === this.justAddedId;
                  const fontStyle = this._getStripFontStyle(item.name);
                  return `
                    <div data-ts-id="${item.id}" class="ts-strip group relative cursor-pointer rounded-xl p-2 flex flex-col items-center justify-between h-[178px] border-2 overflow-hidden transition-all duration-300 ${
                      isHit || isNew
                        ? 'bg-gradient-to-b from-[#FFE66D] to-[#F59E0B] border-white scale-105 shadow-[0_0_20px_rgba(255,224,102,0.95)] z-10'
                        : item.type === 'online'
                          ? 'bg-gradient-to-b from-[#D62424] to-[#A61717] border-[#FCE07C] hover:brightness-110'
                          : 'bg-gradient-to-b from-[#BC1A1A] to-[#8C1313] border-[#E8B84B] hover:brightness-110'
                    }" title="${this._esc(item.name)}（${this._esc(item.zodiac)}）&#10;祈福：${this._esc(item.wish)}">
                      <div class="w-4 h-4 shrink-0 rounded-full ${isHit || isNew ? 'bg-white' : 'bg-[#FFF0A0]'} shadow-[0_0_10px_#FFD046] flex items-center justify-center text-[9px] text-[#7A1111]">
                        ✦
                      </div>
                      <div class="flex-1 w-full flex items-center justify-center overflow-hidden py-1">
                        <div class="font-serif font-black max-h-[122px] max-w-full overflow-hidden text-center break-all ${
                          isHit || isNew ? 'text-[#5A0A0A]' : 'text-[#FFFDF5]'
                        }" style="writing-mode: vertical-rl; text-orientation: upright; ${fontStyle} text-shadow: ${isHit || isNew ? 'none' : '0 1px 2px rgba(0,0,0,0.65)'};">
                          ${this._esc(item.name)}
                        </div>
                      </div>
                      <div class="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full truncate max-w-full ${
                        isHit || isNew ? 'bg-[#7A1111] text-[#FFF3B0]' : 'bg-black/35 text-[#FFF0B3]'
                      }">
                        #${idx + 1} ${this._esc(item.zodiac)}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>

              <div id="ts-detail-bar" class="mt-2.5 px-3 py-2 rounded-xl bg-black/40 text-[#FFF5D6] text-xs font-medium flex items-center justify-between">
                <span>💡 點擊牆上任一紅紙名條，可檢視完整姓名／公司行號與祈福心願。</span>
              </div>
            </div>

            <!-- 右側：線上點燈表單（支援長公司行號至 30 字元） -->
            <div class="lg:col-span-4 bg-[#FFF8EB] p-4 sm:p-5 border-t lg:border-t-0 lg:border-l-2 border-[#D49B35] overflow-y-auto">
              <div class="flex items-center gap-2 mb-2.5">
                <span class="text-2xl">🕯️</span>
                <div>
                  <h3 class="font-black text-base text-[#8E1515]">線上安太歲・祈福點燈</h3>
                  <p class="text-xs text-[#6B3E26] font-medium">歡迎填寫個人姓名、家人或公司行號安奉平安燈</p>
                </div>
              </div>

              <div class="mb-3 px-3 py-2 rounded-xl bg-[#FEF3C7] border border-[#D97706] text-xs font-bold text-[#78350F]">
                ✨ 紅紙名條支援最多 20 字元，個人芳名與公司行號皆以大字清晰呈現！
              </div>

              <form id="ts-add-form" class="space-y-3">
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="text-xs font-bold text-[#4A2210]">安奉姓名／公司行號 *</label>
                    <span id="ts-name-count" class="text-[11px] font-bold text-[#7A543E]">0 / 20</span>
                  </div>
                  <input id="ts-input-name" type="text" required maxlength="20" value=""
                    placeholder="個人姓名或公司行號（最多 20 字）"
                    class="w-full px-3 py-2.5 rounded-xl bg-white border-2 border-[#C98A28] text-sm font-bold text-[#261109] focus:outline-none focus:ring-2 focus:ring-[#D97706]" />
                </div>

                <div>
                  <label class="block text-xs font-bold text-[#4A2210] mb-1">生肖 / 類別</label>
                  <select id="ts-input-zodiac" class="w-full px-3 py-2 rounded-xl bg-white border-2 border-[#C98A28] text-sm font-bold text-[#261109]">
                    ${ZODIACS.map(z => `<option value="${z}">${z}</option>`).join('')}
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-bold text-[#4A2210] mb-1">祈福心願</label>
                  <textarea id="ts-input-wish" rows="3" maxlength="50"
                    placeholder="例：祈求五府千歲保佑闔家身體健康、公司生意興隆、出入平安"
                    class="w-full px-3 py-2 rounded-xl bg-white border-2 border-[#C98A28] text-sm text-[#261109] focus:outline-none focus:ring-2 focus:ring-[#D97706]"></textarea>
                </div>

                <button type="submit" class="w-full py-3 rounded-xl bg-gradient-to-r from-[#C8232C] to-[#991B1B] text-[#FFF9E6] font-black text-sm shadow-md border border-[#FAD364] hover:brightness-110 active:scale-[0.98] transition">
                  ✨ 誠心點燈・貼上紅紙牆
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;

    this.modalRoot.querySelector('#ts-close')?.addEventListener('click', () => this.close());

    const nameInput = this.modalRoot.querySelector('#ts-input-name');
    const countEl = this.modalRoot.querySelector('#ts-name-count');
    nameInput?.addEventListener('input', () => {
      if (countEl) countEl.textContent = `${nameInput.value.length} / 20`;
    });

    const searchInput = this.modalRoot.querySelector('#ts-search');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.justAddedId = null;
      if (this.onHighlight3D) this.onHighlight3D(this.searchQuery);
      this.render();
      const nextInput = this.modalRoot.querySelector('#ts-search');
      if (nextInput) {
        nextInput.focus();
        nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
      }
      if (this.searchQuery.trim()) {
        const hit = this.modalRoot.querySelector('.ts-strip.scale-105');
        hit?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    this.modalRoot.querySelector('#ts-clear-search')?.addEventListener('click', () => {
      this.searchQuery = '';
      if (this.onHighlight3D) this.onHighlight3D('');
      this.render();
    });

    const detailBar = this.modalRoot.querySelector('#ts-detail-bar');
    this.modalRoot.querySelectorAll('.ts-strip').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-ts-id');
        const found = list.find(i => i.id === id);
        if (found && detailBar) {
          soundEngine.playSoftClick();
          detailBar.innerHTML = `
            <span class="break-all">🏮 <strong>${this._esc(found.name)}</strong>（${this._esc(found.zodiac)}）｜ 祈福：「${this._esc(found.wish)}」</span>
            <span class="text-[#FFE899] font-bold shrink-0 ml-2">${found.type === 'online' ? '線上點燈' : '廟務安奉'}</span>
          `;
        }
      });
    });

    this.modalRoot.querySelector('#ts-add-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = this.modalRoot.querySelector('#ts-input-name').value.trim();
      const zodiac = this.modalRoot.querySelector('#ts-input-zodiac').value;
      const wish = this.modalRoot.querySelector('#ts-input-wish').value.trim();
      if (!name) return;

      const added = storageSync.addTaiSuiEntry({ name, zodiac, wish, type: 'online' });
      if (added) {
        this.justAddedId = added.id;
        this.searchQuery = '';
        soundEngine.playBlessingChime();
        if (this.onLightLamp3D) this.onLightLamp3D(added);
        this.render();
        const wallGrid = this.modalRoot.querySelector('#ts-wall-grid');
        wallGrid?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  _esc(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
}
