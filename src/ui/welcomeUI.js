/**
 * V13 迎賓登記卡片（全裝置零破圖・高對比實底可讀性全面升級）
 * ------------------------------------------------------------
 * - 改採「超萌 100% 矢量原創 Q版文創角色立繪 SVG」預覽，徹底解決手機瀏覽器同時開啟雙 WebGL Context
 *   導致預覽框崩潰顯示破圖哭臉（[x_x]）的問題，並大幅加速載入速度！
 * - 實底宣紙卡片（bg-[#FBF7E9]）與深墨高對比字體，在手機與桌機上皆清晰無透底！
 * - 8 款原創台灣廟會風格角色（老、中、青、小孩 × 男女）即時切換預覽
 */
import { AVATAR_PRESETS } from '../config/templeConfig.js';
import { soundEngine } from '../audio/soundEngine.js';
import { storageSync } from '../services/storageSync.js';

const PRESET_NAMES = ['平安小明', '文青香客', '誠心小花', '德慈福星', '好運旅人', '順心大德'];

function hexStr(num, fallback = '#325368') {
  if (typeof num !== 'number') return fallback;
  return '#' + (num & 0xFFFFFF).toString(16).padStart(6, '0');
}

/**
 * 繪製 8 位原創台灣廟埕角色專屬 Q版矢量立繪（零外部圖片、零 WebGL 崩潰、任何手機 100% 清晰呈現！）
 */
function renderChibiPortraitSVG(preset) {
  const shirt = hexStr(preset.shirtColor, '#D1912E');
  const pants = hexStr(preset.pantsColor, '#3A4A5E');
  const hair = hexStr(preset.hairColor, '#241E1C');
  const acc = preset.accessory || 'retroCamera';
  const isChild = preset.ageGroup === '小孩';
  const yShift = isChild ? 10 : 0;

  // 角色專屬髮型圖層
  let hairBackSvg = `<rect x="46" y="${38 + yShift}" width="68" height="44" rx="22" fill="${hair}"/>`;
  let hairFrontSvg = `<path d="M46 ${54 + yShift} Q80 ${24 + yShift} 114 ${54 + yShift} Q112 ${40 + yShift} 80 ${38 + yShift} Q48 ${40 + yShift} 46 ${54 + yShift} Z" fill="${hair}"/>`;
  if (preset.hairStyle === 'grandmaBun') {
    hairBackSvg += `<circle cx="80" cy="${28 + yShift}" r="14" fill="${hair}"/><line x1="60" y1="${28 + yShift}" x2="100" y2="${28 + yShift}" stroke="#E5B968" stroke-width="3.5" stroke-linecap="round"/>`;
  } else if (preset.hairStyle === 'lowPonytail') {
    hairBackSvg += `<ellipse cx="110" cy="${86 + yShift}" rx="10" ry="18" transform="rotate(-18 110 ${86 + yShift})" fill="${hair}"/>`;
  } else if (preset.hairStyle === 'braids') {
    hairBackSvg += `
      <circle cx="48" cy="${76 + yShift}" r="8" fill="${hair}"/><circle cx="47" cy="${89 + yShift}" r="7" fill="${hair}"/><rect x="42" y="${94 + yShift}" width="10" height="4" rx="2" fill="#E55A4A"/>
      <circle cx="112" cy="${76 + yShift}" r="8" fill="${hair}"/><circle cx="113" cy="${89 + yShift}" r="7" fill="${hair}"/><rect x="108" y="${94 + yShift}" width="10" height="4" rx="2" fill="#E55A4A"/>`;
  } else if (preset.hairStyle === 'twinBuns') {
    hairBackSvg += `<circle cx="50" cy="${36 + yShift}" r="12" fill="${hair}"/><circle cx="110" cy="${36 + yShift}" r="12" fill="${hair}"/>`;
  } else if (preset.hairStyle === 'elderPart') {
    hairFrontSvg += `<path d="M68 ${76 + yShift} Q80 ${81 + yShift} 92 ${76 + yShift}" stroke="${hair}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
  } else if (preset.hairStyle === 'messyWave') {
    hairFrontSvg += `<path d="M52 ${48 + yShift} Q64 ${36 + yShift} 74 ${48 + yShift} Q84 ${34 + yShift} 94 ${48 + yShift} Q104 ${38 + yShift} 110 ${50 + yShift}" stroke="${hair}" stroke-width="6" stroke-linecap="round" fill="none"/>`;
  }

  // 角色專屬頭飾／身體文創配件
  let headAccSvg = '';
  let bodyAccSvg = '';
  if (acc === 'jadeGlasses') {
    headAccSvg = `
      <circle cx="67" cy="${63 + yShift}" r="8.5" fill="rgba(255,255,255,0.22)" stroke="#2D7A68" stroke-width="2.6"/>
      <circle cx="93" cy="${63 + yShift}" r="8.5" fill="rgba(255,255,255,0.22)" stroke="#2D7A68" stroke-width="2.6"/>
      <line x1="75.5" y1="${63 + yShift}" x2="84.5" y2="${63 + yShift}" stroke="#2D7A68" stroke-width="2.6"/>`;
    bodyAccSvg = `
      <line x1="80" y1="${94 + yShift}" x2="80" y2="${132 + yShift}" stroke="#E8D5A8" stroke-width="2.2"/>
      <line x1="72" y1="${103 + yShift}" x2="88" y2="${103 + yShift}" stroke="#E8D5A8" stroke-width="2.4"/>
      <line x1="72" y1="${114 + yShift}" x2="88" y2="${114 + yShift}" stroke="#E8D5A8" stroke-width="2.4"/>
      <rect x="98" y="${112 + yShift}" width="8" height="22" rx="3" transform="rotate(-16 102 ${123 + yShift})" fill="#E2C38B" stroke="#8F632C" stroke-width="1.5"/>`;
  } else if (acc === 'floralBand') {
    headAccSvg = `
      <path d="M47 ${50 + yShift} Q80 ${28 + yShift} 113 ${50 + yShift}" stroke="#D9453B" stroke-width="6.5" stroke-linecap="round" fill="none"/>
      <circle cx="101" cy="${40 + yShift}" r="7.5" fill="#E65245"/><circle cx="101" cy="${40 + yShift}" r="3.2" fill="#FFE07D"/>`;
    bodyAccSvg = `
      <path d="M68 ${92 + yShift} L95 ${112 + yShift} L95 ${134 + yShift}" stroke="#F5DFB0" stroke-width="2.5" fill="none"/>
      <circle cx="80" cy="${99 + yShift}" r="4.5" fill="#FFFDF5" stroke="#D9A040" stroke-width="1.5"/>
      <circle cx="67" cy="${114 + yShift}" r="4.5" fill="#F0736A"/><circle cx="91" cy="${122 + yShift}" r="4" fill="#F0736A"/>`;
  } else if (acc === 'craftApron') {
    bodyAccSvg = `
      <rect x="61" y="${96 + yShift}" width="38" height="40" rx="6" fill="#26436E" stroke="#E5B968" stroke-width="1.8"/>
      <rect x="69" y="${112 + yShift}" width="22" height="14" rx="4" fill="#3B649E" stroke="#E5B968" stroke-width="1.2"/>
      <rect x="54" y="${106 + yShift}" width="52" height="6" rx="3" fill="#E5B968"/>`;
  } else if (acc === 'bambooConical') {
    headAccSvg = `
      <polygon points="80,${14 + yShift} 32,${46 + yShift} 128,${46 + yShift}" fill="#E2C38B" stroke="#9E7334" stroke-width="2"/>
      <line x1="80" y1="${14 + yShift}" x2="55" y2="${46 + yShift}" stroke="#B88A44" stroke-width="1.2"/>
      <line x1="80" y1="${14 + yShift}" x2="105" y2="${46 + yShift}" stroke="#B88A44" stroke-width="1.2"/>
      <circle cx="80" cy="${14 + yShift}" r="4" fill="#B83B32"/>`;
    bodyAccSvg = `<path d="M52 ${93 + yShift} Q80 ${106 + yShift} 108 ${93 + yShift} L106 ${106 + yShift} Q80 ${116 + yShift} 54 ${106 + yShift} Z" fill="#EFE3CC" stroke="#C8B08A" stroke-width="1.4"/>`;
  } else if (acc === 'retroCamera') {
    bodyAccSvg = `
      <path d="M62 ${92 + yShift} Q80 ${110 + yShift} 98 ${92 + yShift}" stroke="#3A2820" stroke-width="3" fill="none"/>
      <rect x="66" y="${105 + yShift}" width="28" height="18" rx="4" fill="#282C34" stroke="#E5E7EB" stroke-width="1.5"/>
      <rect x="66" y="${105 + yShift}" width="28" height="5" rx="2" fill="#D8D8D8"/>
      <circle cx="80" cy="${115 + yShift}" r="6" fill="#181B20" stroke="#9CA3AF" stroke-width="1.8"/>
      <circle cx="78.5" cy="${113.5 + yShift}" r="1.8" fill="#93C5FD"/>`;
  } else if (acc === 'lionClip') {
    headAccSvg = `
      <rect x="94" y="${32 + yShift}" width="16" height="12" rx="4" transform="rotate(-14 102 ${38 + yShift})" fill="#D6382E" stroke="#F2C14E" stroke-width="1.6"/>
      <circle cx="102" cy="${38 + yShift}" r="3" fill="#FFE07D"/>`;
    bodyAccSvg = `
      <path d="M66 ${92 + yShift} L90 ${116 + yShift} L90 ${136 + yShift}" stroke="#FFF6E2" stroke-width="4" fill="none"/>
      <circle cx="67" cy="${122 + yShift}" r="5.5" fill="none" stroke="#63C5B0" stroke-width="2.8"/>`;
  } else if (acc === 'lionHat') {
    headAccSvg = `
      <rect x="44" y="${26 + yShift}" width="72" height="28" rx="12" fill="#D6382E" stroke="#F2C14E" stroke-width="2.4"/>
      <circle cx="52" cy="${24 + yShift}" r="8" fill="#F2C14E"/><circle cx="108" cy="${24 + yShift}" r="8" fill="#F2C14E"/>
      <circle cx="64" cy="${39 + yShift}" r="6" fill="#FFF"/><circle cx="64" cy="${39 + yShift}" r="2.8" fill="#181818"/>
      <circle cx="96" cy="${39 + yShift}" r="6" fill="#FFF"/><circle cx="96" cy="${39 + yShift}" r="2.8" fill="#181818"/>
      <circle cx="80" cy="${24 + yShift}" r="6.5" fill="#FFE066"/>`;
    bodyAccSvg = `
      <circle cx="80" cy="${114 + yShift}" r="11" fill="#C8232C" stroke="#FFF2B2" stroke-width="1.8"/>
      <text x="80" y="${118 + yShift}" text-anchor="middle" font-size="11" font-weight="900" fill="#FFE885" font-family="serif">福</text>`;
  } else if (acc === 'lanternPins') {
    headAccSvg = `
      <ellipse cx="42" cy="${48 + yShift}" rx="8" ry="10" fill="#E03131" stroke="#F7D275" stroke-width="1.8"/>
      <line x1="42" y1="${58 + yShift}" x2="42" y2="${67 + yShift}" stroke="#F7D275" stroke-width="2.2"/>
      <ellipse cx="118" cy="${48 + yShift}" rx="8" ry="10" fill="#E03131" stroke="#F7D275" stroke-width="1.8"/>
      <line x1="118" y1="${58 + yShift}" x2="118" y2="${67 + yShift}" stroke="#F7D275" stroke-width="2.2"/>`;
    bodyAccSvg = `<path d="M56 ${93 + yShift} Q68 ${103 + yShift} 80 ${98 + yShift} Q92 ${103 + yShift} 104 ${93 + yShift} L101 ${102 + yShift} Q80 ${110 + yShift} 59 ${102 + yShift} Z" fill="#FCE09B" stroke="#D99B22" stroke-width="1.2"/>`;
  }

  return `
    <svg viewBox="0 0 160 176" class="w-full h-full animate-float-soft" aria-label="${preset.name}">
      <defs>
        <radialGradient id="pedGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#FFFDF5" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#E5D5B2" stop-opacity="0.1"/>
        </radialGradient>
      </defs>
      <!-- 溫潤舞台底盤 -->
      <ellipse cx="80" cy="158" rx="46" ry="10" fill="#C8A575" stroke="#9B7744" stroke-width="2"/>
      <ellipse cx="80" cy="155" rx="38" ry="7" fill="url(#pedGlow)"/>

      <!-- 雙腿與雙色休閒布鞋 -->
      <rect x="61" y="${130 + yShift}" width="15" height="${22 - yShift * 0.5}" rx="6" fill="${pants}"/>
      <rect x="84" y="${130 + yShift}" width="15" height="${22 - yShift * 0.5}" rx="6" fill="${pants}"/>
      <rect x="58" y="148" width="19" height="9" rx="4.5" fill="#3B2820"/>
      <rect x="58" y="154" width="19" height="3" rx="1.5" fill="#F2ECE1"/>
      <rect x="83" y="148" width="19" height="9" rx="4.5" fill="#3B2820"/>
      <rect x="83" y="154" width="19" height="3" rx="1.5" fill="#F2ECE1"/>

      <!-- 雙臂與滾邊袖口 -->
      <rect x="42" y="${96 + yShift}" width="13" height="28" rx="6.5" fill="${shirt}"/>
      <rect x="41.5" y="${118 + yShift}" width="14" height="5" rx="2" fill="#F8F0DF"/>
      <circle cx="48.5" cy="${127 + yShift}" r="6" fill="#FAD7B8"/>
      <rect x="105" y="${96 + yShift}" width="13" height="28" rx="6.5" fill="${shirt}"/>
      <rect x="104.5" y="${118 + yShift}" width="14" height="5" rx="2" fill="#F8F0DF"/>
      <circle cx="111.5" cy="${127 + yShift}" r="6" fill="#FAD7B8"/>

      <!-- 上身衣著＋領口＋腰帶 -->
      <rect x="54" y="${90 + yShift}" width="52" height="46" rx="14" fill="${shirt}" stroke="rgba(30,20,12,0.16)" stroke-width="1.5"/>
      <rect x="67" y="${88 + yShift}" width="26" height="9" rx="4" fill="#FBF6EA"/>
      <rect x="54" y="${122 + yShift}" width="52" height="6" rx="2" fill="#4A3528"/>
      <rect x="75" y="${121 + yShift}" width="10" height="8" rx="2" fill="#E5B968"/>
      ${bodyAccSvg}

      <!-- 後層頭髮與圓潤 Q版臉蛋 -->
      ${hairBackSvg}
      <rect x="50" y="${40 + yShift}" width="60" height="52" rx="22" fill="#FAD7B8" stroke="rgba(120,75,45,0.18)" stroke-width="1.4"/>
      ${hairFrontSvg}

      <!-- 靈動雙眼、可愛紅暈與微笑 -->
      <circle cx="67" cy="${63 + yShift}" r="4.2" fill="#231715"/><circle cx="65.7" cy="${61.6 + yShift}" r="1.4" fill="#FFF"/>
      <circle cx="93" cy="${63 + yShift}" r="4.2" fill="#231715"/><circle cx="91.7" cy="${61.6 + yShift}" r="1.4" fill="#FFF"/>
      <ellipse cx="59" cy="${71 + yShift}" rx="5.5" ry="3" fill="#F29992" opacity="0.65"/>
      <ellipse cx="101" cy="${71 + yShift}" rx="5.5" ry="3" fill="#F29992" opacity="0.65"/>
      <path d="M74 ${73 + yShift} Q80 ${78 + yShift} 86 ${73 + yShift}" stroke="#8C4236" stroke-width="2.2" stroke-linecap="round" fill="none"/>

      <!-- 頭飾配件 -->
      ${headAccSvg}
    </svg>
  `;
}

export class WelcomeUI {
  constructor(root, { defaultName = '', defaultPresetId = 'youngMale', onEnter }) {
    this.root = root;
    this.defaultName = defaultName;
    this.selectedPresetId = AVATAR_PRESETS.some(p => p.id === defaultPresetId)
      ? defaultPresetId
      : AVATAR_PRESETS[4].id;
    this.musicEnabled = true;
    this.onEnter = onEnter;
    this.typeTimer = null;
  }

  open() {
    const activePreset = AVATAR_PRESETS.find(p => p.id === this.selectedPresetId) || AVATAR_PRESETS[0];
    const saved = storageSync.getPlayer();
    const isReturning = storageSync.hasExistingRecord;
    const bagTotal = storageSync.getInventoryTotal();
    const doneSteps = Array.isArray(saved.worshipSteps) ? saved.worshipSteps.length : 0;

    const greetingText = isReturning
      ? `歡迎「${saved.name}」回來德慈宮！您的 ${saved.merit || 0} 功德與參拜紀錄（${doneSteps}/5 步）都已自動保存，隨時可以接著逛大殿喔！`
      : '歡迎蒞臨玉勅代天府德慈宮！請挑選一位原創台灣廟會角色並寫下稱呼，致贈您 30 功德結緣禮與香火背包，準備展開沉浸式 3D 參拜之旅！';

    this.root.innerHTML = `
      <div class="fixed inset-0 z-[70] flex items-center justify-center sm:justify-start bg-[#0D2126]/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
        <div class="bg-[#FBF7E9] border-2 border-[#C98A28] rounded-2xl shadow-[0_18px_50px_rgba(8,24,20,0.65)] w-full max-w-[520px] overflow-hidden text-[#1C2D28] animate-fade-in my-auto">
          <!-- 頂部深松墨綠牌匾條 -->
          <div class="bg-[#183C32] px-4 sm:px-5 py-3 flex items-center justify-between gap-2 text-[#FBF7E9] border-b-2 border-[#E5B968]">
            <div class="min-w-0">
              <div class="text-[11px] font-bold tracking-[0.14em] text-[#F5D68E]">觀音佛祖・代天巡狩・36 拜墊多人連線</div>
              <h1 class="font-serif font-black text-lg sm:text-xl tracking-[0.10em] mt-0.5 truncate">玉勅代天府德慈宮</h1>
            </div>
            <span class="shrink-0 px-2.5 py-1 rounded-full bg-[#245446] border border-[#E5B968] text-[11px] font-black text-[#FFF1B8]">
              ${isReturning ? `💾 已讀檔・${saved.merit || 0} 功德` : '🎁 新人 30 功德'}
            </span>
          </div>

          <div class="p-4 sm:p-5 space-y-3.5 bg-[#FBF7E9]">
            <!-- RPG 逐字浮現阿財伯迎賓 -->
            <div class="flex items-start gap-3 bg-[#F3EAD6] border border-[#D9C69F] rounded-xl p-2.5 min-h-[66px]">
              <div class="w-10 h-10 shrink-0 rounded-full bg-[#8E1515] border-2 border-[#E5B968] flex items-center justify-center text-xl shadow-sm">
                👴
              </div>
              <div class="text-xs sm:text-[13px] leading-relaxed text-[#241812] font-medium">
                <span class="font-black text-[#8E1515]">廟公阿財伯：</span>
                <span id="welcome-rpg-greeting"></span>
              </div>
            </div>

            ${isReturning ? `
              <div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#E4F2EA] border border-[#6DA888] text-xs font-extrabold text-[#14332B]">
                <span>💾 已自動載入存檔：✨ <strong>${saved.merit || 0} 功德</strong>・🎒 背包 ${bagTotal} 件・🏮 參拜 ${doneSteps}/5</span>
                <span class="text-[#0F766E]">離線自動存檔中</span>
              </div>
            ` : ''}

            <form id="welcome-form" class="space-y-3">
              <!-- 1. 輸入暱稱 -->
              <div>
                <label class="block text-xs sm:text-[13px] font-black text-[#183C32] mb-1">1. 輸入參拜暱稱（將顯示於角色頭頂與即時聊天）</label>
                <input id="welcome-name-input" type="text" required maxlength="10"
                  value="${this._esc(this.defaultName)}"
                  placeholder="例如：平安小明、德慈福星..."
                  class="w-full px-3.5 py-2 rounded-xl bg-white border-2 border-[#C9A86B] text-sm font-bold text-[#183C32] focus:outline-none focus:ring-2 focus:ring-[#8E1515]" />
                <div class="flex flex-wrap gap-1.5 mt-1.5">
                  ${PRESET_NAMES.map(n => `
                    <button type="button" data-preset-name="${n}"
                      class="px-2.5 py-1 rounded-full bg-[#EFE5CF] hover:bg-[#E5D2AA] border border-[#CBB489] text-xs font-extrabold text-[#3B2616] transition">
                      ${n}
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- 2. 8 款全新原創角色即時清晰立繪預覽（零 WebGL 崩潰、手機 100% 瞬間顯示！） -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs sm:text-[13px] font-black text-[#183C32]">2. 挑選原創台灣廟會角色（男女共 8 款）</span>
                  <span id="welcome-preset-badge" class="text-xs font-black text-[#8E1515]">${activePreset.ageGroup}・${activePreset.gender}</span>
                </div>
                <div class="bg-[#F2E8D2] border-2 border-[#D9C49B] rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
                  <div class="flex flex-col items-center shrink-0">
                    <div id="welcome-avatar-stage" class="w-[126px] h-[142px] rounded-xl bg-gradient-to-b from-[#FFFDF7] to-[#EAE0C8] border border-[#D4C097] overflow-hidden shadow-inner flex items-center justify-center p-1">
                      ${renderChibiPortraitSVG(activePreset)}
                    </div>
                    <div id="welcome-preset-title" class="font-black text-sm text-[#183C32] mt-1.5">${activePreset.name}</div>
                    <div id="welcome-preset-sub" class="text-[11px] font-bold text-[#4F5D55] text-center max-w-[140px]">${activePreset.subtitle}</div>
                  </div>

                  <div class="flex-1 w-full grid grid-cols-2 gap-1.5">
                    ${AVATAR_PRESETS.map(p => {
                      const isSel = p.id === this.selectedPresetId;
                      return `
                        <button type="button" data-outfit-id="${p.id}"
                          class="outfit-btn flex items-center gap-1.5 px-2.5 py-2 rounded-lg border-2 text-left transition ${
                            isSel
                              ? 'bg-[#DCF0E4] border-[#183C32] text-[#14332B] shadow-sm'
                              : 'bg-[#FFFDF8] border-[#D6C5A2] text-[#2B3732] hover:bg-white'
                          }">
                          <span class="w-3.5 h-3.5 rounded-full shrink-0 border border-black/20"
                            style="background: linear-gradient(135deg, ${p.swatchA} 50%, ${p.swatchB} 50%);"></span>
                          <div class="min-w-0">
                            <div class="text-xs font-black leading-tight truncate">${p.name}</div>
                            <div class="text-[10px] font-bold text-[#526058] leading-tight">${p.ageGroup}・${p.gender}</div>
                          </div>
                        </button>
                      `;
                    }).join('')}
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2 pt-1">
                <button type="submit"
                  class="flex-1 py-3 px-4 rounded-xl bg-[#183C32] hover:bg-[#1E4D40] text-[#FFFDF6] font-black text-sm tracking-wide shadow-lg flex items-center justify-between transition active:scale-95">
                  <span>${isReturning ? '繼續德慈宮參拜之旅' : '進入德慈宮展開參拜'}</span>
                  <span class="text-[#F5D68E]">↗</span>
                </button>
                <button type="button" id="welcome-music-btn"
                  class="px-3.5 py-3 rounded-xl bg-[#E1EFE6] hover:bg-[#D2E7DA] border-2 border-[#7FA892] text-[#14332B] font-extrabold text-xs shrink-0 transition">
                  配樂開
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    this._startGreetingTypewriter(greetingText);
    this._bindEvents();
  }

  _startGreetingTypewriter(fullText) {
    if (this.typeTimer) clearInterval(this.typeTimer);
    const el = this.root.querySelector('#welcome-rpg-greeting');
    if (!el) return;
    let idx = 0;
    this.typeTimer = setInterval(() => {
      idx += 2;
      el.textContent = fullText.slice(0, idx);
      if (idx >= fullText.length) {
        clearInterval(this.typeTimer);
        this.typeTimer = null;
      }
    }, 24);
  }

  _bindEvents() {
    const input = this.root.querySelector('#welcome-name-input');
    const stage = this.root.querySelector('#welcome-avatar-stage');

    this.root.querySelectorAll('[data-preset-name]').forEach(btn => {
      btn.addEventListener('click', () => {
        soundEngine.playSoftClick();
        input.value = btn.getAttribute('data-preset-name');
      });
    });

    this.root.querySelectorAll('[data-outfit-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        soundEngine.playSoftClick();
        const pid = btn.getAttribute('data-outfit-id');
        this.selectedPresetId = pid;

        const p = AVATAR_PRESETS.find(x => x.id === pid);
        if (p) {
          if (stage) stage.innerHTML = renderChibiPortraitSVG(p);
          const tEl = this.root.querySelector('#welcome-preset-title');
          const sEl = this.root.querySelector('#welcome-preset-sub');
          const bEl = this.root.querySelector('#welcome-preset-badge');
          if (tEl) tEl.textContent = p.name;
          if (sEl) sEl.textContent = p.subtitle;
          if (bEl) bEl.textContent = `${p.ageGroup}・${p.gender}`;
        }

        this.root.querySelectorAll('.outfit-btn').forEach(b => {
          const match = b.getAttribute('data-outfit-id') === pid;
          b.className = `outfit-btn flex items-center gap-1.5 px-2.5 py-2 rounded-lg border-2 text-left transition ${
            match
              ? 'bg-[#DCF0E4] border-[#183C32] text-[#14332B] shadow-sm'
              : 'bg-[#FFFDF8] border-[#D6C5A2] text-[#2B3732] hover:bg-white'
          }`;
        });
      });
    });

    const musicBtn = this.root.querySelector('#welcome-music-btn');
    musicBtn?.addEventListener('click', () => {
      this.musicEnabled = !this.musicEnabled;
      soundEngine.setMuted(!this.musicEnabled);
      musicBtn.textContent = this.musicEnabled ? '配樂開' : '配樂關';
      musicBtn.className = this.musicEnabled
        ? 'px-3.5 py-3 rounded-xl bg-[#E1EFE6] hover:bg-[#D2E7DA] border-2 border-[#7FA892] text-[#14332B] font-extrabold text-xs shrink-0 transition'
        : 'px-3.5 py-3 rounded-xl bg-[#EFE7D8] hover:bg-[#E5DAC6] border-2 border-[#C8B99D] text-[#6B5B45] font-extrabold text-xs shrink-0 transition';
    });

    this.root.querySelector('#welcome-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const chosen = input.value.trim() || '平安小明';
      soundEngine.setMuted(!this.musicEnabled);
      if (this.musicEnabled) {
        soundEngine.startAmbient();
        soundEngine.playBlessingChime();
      }
      this.close();
      this.onEnter?.({
        name: chosen,
        presetId: this.selectedPresetId,
        musicEnabled: this.musicEnabled
      });
    });
  }

  close() {
    if (this.typeTimer) {
      clearInterval(this.typeTimer);
      this.typeTimer = null;
    }
    this.root.innerHTML = '';
  }

  _esc(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
}
