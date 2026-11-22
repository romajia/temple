/**
 * V5 迎賓登記卡片
 * - 8 款原創台灣廟會風格角色（老、中、青、小孩 × 男女）即時 3D 旋轉試穿
 * - 自動讀取本機存檔：老朋友回訪可直接顯示累積功德、香火背包與參拜進度並無縫延續遊玩！
 * - RPG 打字機暖心迎賓開場，移除內部開發指令字樣
 */
import * as THREE from 'three';
import { AVATAR_PRESETS } from '../config/templeConfig.js';
import { ChibiAvatar } from '../scene/chibiAvatar.js';
import { soundEngine } from '../audio/soundEngine.js';
import { storageSync } from '../services/storageSync.js';

const PRESET_NAMES = ['平安小明', '文青香客', '誠心小花', '德慈福星', '好運旅人', '順心大德'];

export class WelcomeUI {
  constructor(root, { defaultName = '', defaultPresetId = 'youngMale', onEnter }) {
    this.root = root;
    this.defaultName = defaultName;
    this.selectedPresetId = AVATAR_PRESETS.some(p => p.id === defaultPresetId)
      ? defaultPresetId
      : AVATAR_PRESETS[4].id;
    this.musicEnabled = true;
    this.onEnter = onEnter;

    this.previewRaf = null;
    this.previewRenderer = null;
    this.previewAvatar = null;
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
      <div class="fixed inset-0 z-[70] flex items-center justify-center sm:justify-start bg-gradient-to-r from-[#10222E]/82 via-[#10222E]/45 to-transparent backdrop-blur-[2px] p-3 sm:p-6 overflow-y-auto">
        <div class="bg-[#FBF7E9]/97 border border-[#E5B968]/85 rounded-2xl shadow-[0_14px_45px_rgba(8,29,37,0.58)] w-full max-w-[520px] overflow-hidden text-[#1C2D28] animate-fade-in my-auto">
          <!-- 頂部深松墨綠牌匾條 -->
          <div class="bg-[#183C32] px-5 py-3 flex items-center justify-between text-[#FBF7E9] border-b-2 border-[#E5B968]">
            <div>
              <div class="text-[11px] font-bold tracking-[0.16em] text-[#E5B968]">挑高大殿 36 拜墊・多人即時連線漫步</div>
              <h1 class="font-serif font-black text-xl tracking-[0.14em] mt-0.5">玉勅代天府德慈宮</h1>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-[#E5B968]/20 border border-[#E5B968] text-[11px] font-black text-[#FBE39C]">
              ${isReturning ? `💾 已讀檔・${saved.merit || 0} 功德` : '🎁 新人 30 功德'}
            </span>
          </div>

          <div class="p-4 sm:p-5 space-y-3.5">
            <!-- RPG 逐字浮現阿財伯迎賓 -->
            <div class="flex items-start gap-3 bg-[#F3ECE0] border border-[#E2D4B7] rounded-xl p-2.5 min-h-[66px]">
              <div class="w-10 h-10 shrink-0 rounded-full bg-[#8E2523] border-2 border-[#E5B968] flex items-center justify-center text-xl shadow-sm">
                👴
              </div>
              <div class="text-xs leading-relaxed text-[#2C3A35]">
                <span class="font-black text-[#8E2523]">廟公阿財伯：</span>
                <span id="welcome-rpg-greeting"></span>
              </div>
            </div>

            ${isReturning ? `
              <div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#E4F2EA] border border-[#8AB89E] text-[11px] font-bold text-[#183C32]">
                <span>💾 已自動載入個人存檔：✨ <strong>${saved.merit || 0} 功德</strong>・🎒 背包 ${bagTotal} 件・🏮 參拜 ${doneSteps}/5</span>
                <span class="text-[#0F766E]">離線自動存檔中</span>
              </div>
            ` : ''}

            <form id="welcome-form" class="space-y-3">
              <!-- 1. 輸入暱稱 -->
              <div>
                <label class="block text-xs font-black text-[#183C32] mb-1">1. 輸入參拜暱稱（將顯示於角色頭頂與即時聊天）</label>
                <input id="welcome-name-input" type="text" required maxlength="10"
                  value="${this._esc(this.defaultName)}"
                  placeholder="例如：平安小明、德慈福星..."
                  class="w-full px-3.5 py-2 rounded-xl bg-white border border-[#C9B898] text-sm font-bold text-[#183C32] focus:outline-none focus:ring-2 focus:ring-[#C48446]" />
                <div class="flex flex-wrap gap-1 mt-1.5">
                  ${PRESET_NAMES.map(n => `
                    <button type="button" data-preset-name="${n}"
                      class="px-2.5 py-0.5 rounded-full bg-[#EFE7D4] hover:bg-[#E5B968]/55 border border-[#D4C3A1] text-[11px] font-bold text-[#3B3022] transition">
                      ${n}
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- 2. 8 款全新原創角色即時 3D 預覽選擇 -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-black text-[#183C32]">2. 挑選原創台灣廟會角色（老・中・青・小孩 男女共 8 款）</span>
                  <span id="welcome-preset-badge" class="text-[11px] font-bold text-[#8E2523]">${activePreset.ageGroup}・${activePreset.gender}</span>
                </div>
                <div class="bg-[#F2EAD8] border border-[#DFD1B4] rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
                  <div class="flex flex-col items-center shrink-0">
                    <div id="welcome-avatar-stage" class="w-[116px] h-[142px] rounded-xl bg-gradient-to-b from-[#E5DEC9] to-[#D6CCAF] overflow-hidden shadow-inner"></div>
                    <div id="welcome-preset-title" class="font-black text-xs text-[#183C32] mt-1">${activePreset.name}</div>
                    <div id="welcome-preset-sub" class="text-[10px] text-[#53635A] text-center max-w-[120px]">${activePreset.subtitle}</div>
                  </div>

                  <div class="flex-1 w-full grid grid-cols-2 gap-1.5">
                    ${AVATAR_PRESETS.map(p => {
                      const isSel = p.id === this.selectedPresetId;
                      return `
                        <button type="button" data-outfit-id="${p.id}"
                          class="outfit-btn flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left transition ${
                            isSel
                              ? 'bg-[#DFF0E6] border-[#183C32] text-[#183C32] shadow-xs ring-1 ring-[#183C32]/30'
                              : 'bg-[#FBF7E9] border-[#D6C7AA] text-[#3F4A45] hover:bg-white'
                          }">
                          <span class="w-3.5 h-3.5 rounded-full shrink-0 border border-black/15"
                            style="background: linear-gradient(135deg, ${p.swatchA} 50%, ${p.swatchB} 50%);"></span>
                          <div class="min-w-0">
                            <div class="text-[11px] font-black leading-tight truncate">${p.name}</div>
                            <div class="text-[9px] text-[#617068] leading-tight">${p.ageGroup}・${p.gender}</div>
                          </div>
                        </button>
                      `;
                    }).join('')}
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2 pt-1">
                <button type="submit"
                  class="flex-1 py-3 px-4 rounded-xl bg-[#183C32] hover:bg-[#1E4D40] text-[#FBF7E9] font-black text-sm tracking-wide shadow-lg flex items-center justify-between transition active:scale-[0.99]">
                  <span>${isReturning ? '繼續德慈宮參拜之旅' : '進入德慈宮展開參拜'}</span>
                  <span class="text-[#E5B968]">↗</span>
                </button>
                <button type="button" id="welcome-music-btn"
                  class="px-3.5 py-3 rounded-xl bg-[#E1EFE6] hover:bg-[#D2E7DA] border border-[#9BBAA8] text-[#183C32] font-bold text-xs shrink-0 transition">
                  配樂開
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    this._startGreetingTypewriter(greetingText);
    this._init3DPreview();
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
    }, 28);
  }

  _init3DPreview() {
    const stage = this.root.querySelector('#welcome-avatar-stage');
    if (!stage) return;

    const w = stage.clientWidth || 116;
    const h = stage.clientHeight || 142;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 20);
    camera.position.set(0, 1.32, 3.95);
    camera.lookAt(0, 0.85, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    stage.appendChild(renderer.domElement);
    this.previewRenderer = renderer;

    scene.add(new THREE.HemisphereLight(0xFFF9EA, 0x8BA08D, 1.35));
    const key = new THREE.DirectionalLight(0xFFF3D6, 1.65);
    key.position.set(2.5, 4.5, 3.5);
    scene.add(key);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.70, 0.14, 20),
      new THREE.MeshStandardMaterial({ color: 0xC8A575, roughness: 0.85 })
    );
    pedestal.position.y = -0.07;
    scene.add(pedestal);

    const avatar = new ChibiAvatar({ presetId: this.selectedPresetId });
    scene.add(avatar.root);
    this.previewAvatar = avatar;

    const clock = new THREE.Clock();
    const loop = () => {
      if (!this.previewRenderer) return;
      this.previewRaf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      avatar.root.rotation.y = Math.sin(elapsed * 0.9) * 0.58;
      avatar.update(dt, elapsed);
      renderer.render(scene, camera);
    };
    loop();
  }

  _bindEvents() {
    const input = this.root.querySelector('#welcome-name-input');
    setTimeout(() => input?.focus(), 80);

    this.root.querySelectorAll('[data-preset-name]').forEach(btn => {
      btn.addEventListener('click', () => {
        soundEngine.playSoftClick();
        input.value = btn.getAttribute('data-preset-name');
        input.focus();
      });
    });

    this.root.querySelectorAll('[data-outfit-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        soundEngine.playSoftClick();
        const pid = btn.getAttribute('data-outfit-id');
        this.selectedPresetId = pid;
        this.previewAvatar?.applyPreset(pid);

        const p = AVATAR_PRESETS.find(x => x.id === pid);
        if (p) {
          const tEl = this.root.querySelector('#welcome-preset-title');
          const sEl = this.root.querySelector('#welcome-preset-sub');
          const bEl = this.root.querySelector('#welcome-preset-badge');
          if (tEl) tEl.textContent = p.name;
          if (sEl) sEl.textContent = p.subtitle;
          if (bEl) bEl.textContent = `${p.ageGroup}・${p.gender}`;
        }

        this.root.querySelectorAll('.outfit-btn').forEach(b => {
          const match = b.getAttribute('data-outfit-id') === pid;
          b.className = `outfit-btn flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left transition ${
            match
              ? 'bg-[#DFF0E6] border-[#183C32] text-[#183C32] shadow-xs ring-1 ring-[#183C32]/30'
              : 'bg-[#FBF7E9] border-[#D6C7AA] text-[#3F4A45] hover:bg-white'
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
        ? 'px-3.5 py-3 rounded-xl bg-[#E1EFE6] hover:bg-[#D2E7DA] border border-[#9BBAA8] text-[#183C32] font-bold text-xs shrink-0 transition'
        : 'px-3.5 py-3 rounded-xl bg-[#EFE7D8] hover:bg-[#E5DAC6] border border-[#C8B99D] text-[#6B5B45] font-bold text-xs shrink-0 transition';
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
    if (this.previewRaf) {
      cancelAnimationFrame(this.previewRaf);
      this.previewRaf = null;
    }
    if (this.previewRenderer) {
      this.previewRenderer.dispose();
      this.previewRenderer = null;
    }
    this.previewAvatar = null;
    this.root.innerHTML = '';
  }

  _esc(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
}
