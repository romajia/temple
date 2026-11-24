/**
 * 台日宗教工藝視覺元件庫（純向量 SVG，支援 Retina 高解析與未解鎖線稿剪影）
 * - 12 款台灣宮廟建築工藝飾品徽章（剪黏飛簷、紅燈籠、石獅子、發財泡麵、發財金、鳳冠、王船等）
 * - 專屬宮廟朱紅御朱印章（含印泥微暈質感與四種靈韻外框）
 * - 4 款靈韻香火苗萌芽圖騰
 */

import { SITE_CONFIG } from '../config/siteConfig.js';

/**
 * 全域 SVG 印泥微粗糙濾鏡定義（注入至 DOM 一次即可共用）
 */
export function getSharedSvgDefs() {
  return `
    <svg width="0" height="0" style="position:absolute;pointer-events:none;" aria-hidden="true">
      <defs>
        <filter id="ink-roughen" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.065" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <linearGradient id="gold-foil-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F5DF98" />
          <stop offset="45%" stop-color="#D4AF37" />
          <stop offset="100%" stop-color="#9A7615" />
        </linearGradient>
        <radialGradient id="lantern-glow-grad" cx="50%" cy="48%" r="54%">
          <stop offset="0%" stop-color="#FFF2B2" />
          <stop offset="45%" stop-color="#F59E0B" />
          <stop offset="85%" stop-color="#C83C2B" />
          <stop offset="100%" stop-color="#8B1E14" />
        </radialGradient>
      </defs>
    </svg>
  `;
}

/**
 * 12 款建築與民俗工藝飾品徽章 SVG
 */
export function renderCraftBadgeSVG(craftId, locked = false) {
  const stroke = locked ? '#9E978E' : '#292524';
  const red = locked ? '#B8B1A8' : '#C83C2B';
  const gold = locked ? '#C9C3BA' : '#D4AF37';
  const amber = locked ? '#D5CFC6' : '#F59E0B';
  const jade = locked ? '#B0AAA2' : '#2E6F5E';
  const cream = locked ? 'none' : '#FFFBF0';

  const icons = {
    // 1. 七星古劍（受天宮）
    sevenStarSword: `
      <circle cx="48" cy="48" r="38" fill="${locked ? 'none' : '#FDF6E7'}" stroke="${gold}" stroke-width="2" stroke-dasharray="${locked ? '4 4' : 'none'}"/>
      <path d="M48 16 L54 54 L48 60 L42 54 Z" fill="${locked ? 'none' : '#EAE4D7'}" stroke="${stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <line x1="48" y1="20" x2="48" y2="56" stroke="${gold}" stroke-width="1.6"/>
      <path d="M34 55 Q48 63 62 55" fill="none" stroke="${gold}" stroke-width="3.2" stroke-linecap="round"/>
      <rect x="45" y="59" width="6" height="14" rx="2" fill="${red}" stroke="${stroke}" stroke-width="1.8"/>
      <circle cx="48" cy="76" r="4" fill="${gold}" stroke="${stroke}" stroke-width="1.5"/>
      <g fill="${red}">
        <circle cx="30" cy="30" r="2.2"/><circle cx="35" cy="24" r="2"/><circle cx="64" cy="28" r="2.2"/>
        <circle cx="68" cy="38" r="2"/><circle cx="28" cy="42" r="2"/><circle cx="63" cy="46" r="2.2"/><circle cx="33" cy="48" r="2"/>
      </g>
    `,
    // 2. 廟埕暖光紅燈籠（德慈宮）
    redLantern: `
      <circle cx="48" cy="48" r="38" fill="${locked ? 'none' : '#241F1C'}" stroke="${gold}" stroke-width="2" stroke-dasharray="${locked ? '4 4' : 'none'}"/>
      <line x1="48" y1="12" x2="48" y2="22" stroke="${gold}" stroke-width="2.2"/>
      <rect x="39" y="21" width="18" height="5" rx="2" fill="${gold}" stroke="${stroke}" stroke-width="1.4"/>
      <ellipse cx="48" cy="45" rx="21" ry="20" fill="${locked ? 'none' : 'url(#lantern-glow-grad)'}" stroke="${locked ? stroke : '#8B1E14'}" stroke-width="2.2"/>
      <ellipse cx="48" cy="45" rx="11" ry="19.5" fill="none" stroke="${locked ? stroke : 'rgba(255,240,190,0.65)'}" stroke-width="1.4"/>
      <text x="48" y="50" text-anchor="middle" font-family="'Yuji Syuku','Noto Serif TC',serif" font-size="14" font-weight="700" fill="${locked ? stroke : '#292524'}">平安</text>
      <rect x="40" y="64" width="16" height="4.5" rx="2" fill="${gold}" stroke="${stroke}" stroke-width="1.4"/>
      <path d="M45 69 L43 80 M48 69 L48 82 M51 69 L53 80" stroke="${red}" stroke-width="2" stroke-linecap="round"/>
    `,
    // 3. 開運招財發財金（紫南宮）
    fortuneGold: `
      <circle cx="48" cy="48" r="38" fill="${locked ? 'none' : '#FEF7E4'}" stroke="${gold}" stroke-width="2" stroke-dasharray="${locked ? '4 4' : 'none'}"/>
      <path d="M22 46 Q48 36 74 46 L67 64 Q48 70 29 64 Z" fill="${locked ? 'none' : 'url(#gold-foil-grad)'}" stroke="${stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <ellipse cx="48" cy="44" rx="14" ry="10" fill="${locked ? 'none' : '#F8E39A'}" stroke="${stroke}" stroke-width="2"/>
      <path d="M26 48 Q48 56 70 48" fill="none" stroke="${stroke}" stroke-width="1.6"/>
      <text x="48" y="61" text-anchor="middle" font-family="'Noto Serif TC',serif" font-size="11" font-weight="900" fill="${locked ? stroke : '#7A3E0A'}">發財金</text>
      <circle cx="48" cy="24" r="7" fill="${locked ? 'none' : red}" stroke="${gold}" stroke-width="1.8"/>
      <rect x="45.5" y="21.5" width="5" height="5" fill="${locked ? 'none' : '#FEF7E4'}" stroke="${gold}" stroke-width="1"/>
    `,
    // 4. 結緣發財泡麵（石龍宮）
    fortuneNoodle: `
      <circle cx="48" cy="48" r="38" fill="${locked ? 'none' : '#FFF8EC'}" stroke="${gold}" stroke-width="2" stroke-dasharray="${locked ? '4 4' : 'none'}"/>
      <path d="M36 27 Q33 21 37 16 M48 25 Q45 19 49 14 M60 27 Q57 21 61 16" fill="none" stroke="${amber}" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="52" y1="36" x2="73" y2="23" stroke="${stroke}" stroke-width="2.4" stroke-linecap="round"/>
      <line x1="55" y1="40" x2="75" y2="30" stroke="${stroke}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M24 44 C24 63 34 71 48 71 C62 71 72 63 72 44 Z" fill="${locked ? 'none' : red}" stroke="${stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <ellipse cx="48" cy="44" rx="24" ry="6.5" fill="${locked ? 'none' : '#FDE68A'}" stroke="${stroke}" stroke-width="2"/>
      <path d="M31 44 Q38 40 44 44 T58 44 T66 44" fill="none" stroke="${amber}" stroke-width="2"/>
      <rect x="37" y="70" width="22" height="5" rx="2" fill="${gold}" stroke="${stroke}" stroke-width="1.8"/>
      <text x="48" y="61" text-anchor="middle" font-family="'Noto Serif TC',serif" font-size="11" font-weight="900" fill="${locked ? stroke : '#FFF8EC'}">福麵</text>
    `,
    // 5. 月老紅線（霞海城隍廟）
    redThread: `
      <circle cx="48" cy="48" r="38" fill="${locked ? 'none' : '#FFF4F2'}" stroke="${gold}" stroke-width="2" stroke-dasharray="${locked ? '4 4' : 'none'}"/>
      <path d="M24 58 C24 38 42 30 48 44 C54 30 72 38 72 58" fill="none" stroke="${red}" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M30 46 C36 62 60 62 66 46" fill="none" stroke="${red}" stroke-width="3.2" stroke-linecap="round"/>
      <rect x="40" y="39" width="16" height="16" rx="3" transform="rotate(45 48 47)" fill="${locked ? 'none' : red}" stroke="${gold}" stroke-width="2"/>
      <path d="M44 58 L41 74 M52 58 L55 74" stroke="${red}" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="48" cy="24" r="6" fill="${locked ? 'none' : amber}" stroke="${gold}" stroke-width="1.8"/>
    `,
    // 6. 廟埕石獅子（北港朝天宮）
    stoneLion: `
      <circle cx="48" cy="48" r="38" fill="${locked ? 'none' : '#F4F1EA'}" stroke="${gold}" stroke-width="2" stroke-dasharray="${locked ? '4 4' : 'none'}"/>
      <circle cx="48" cy="44" r="19" fill="${locked ? 'none' : '#D6CFC4'}" stroke="${stroke}" stroke-width="2.2"/>
      <circle cx="32" cy="34" r="5.5" fill="${locked ? 'none' : '#C4BCB0'}" stroke="${stroke}" stroke-width="1.8"/>
      <circle cx="64" cy="34" r="5.5" fill="${locked ? 'none' : '#C4BCB0'}" stroke="${stroke}" stroke-width="1.8"/>
      <circle cx="30" cy="46" r="4.5" fill="${locked ? 'none' : '#C4BCB0'}" stroke="${stroke}" stroke-width="1.6"/>
      <circle cx="66" cy="46" r="4.5" fill="${locked ? 'none' : '#C4BCB0'}" stroke="${stroke}" stroke-width="1.6"/>
      <circle cx="41" cy="41" r="2.8" fill="${stroke}"/><circle cx="55" cy="41" r="2.8" fill="${stroke}"/>
      <path d="M43 49 Q48 53 53 49" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round"/>
      <ellipse cx="48" cy="46" rx="4" ry="2.8" fill="${red}"/>
      <rect x="31" y="64" width="34" height="9" rx="3" fill="${locked ? 'none' : red}" stroke="${gold}" stroke-width="1.8"/>
      <circle cx="48" cy="68.5" r="3" fill="${gold}"/>
    `,
    // 7. 銅鑄盤龍柱（艋舺龍山寺）
    dragonPillar: `
      <circle cx="48" cy="48" r="38" fill="${locked ? 'none' : '#EFF5F2'}" stroke="${gold}" stroke-width="2" stroke-dasharray="${locked ? '4 4' : 'none'}"/>
      <rect x="37" y="18" width="22" height="60" rx="3" fill="${locked ? 'none' : '#3E5E53'}" stroke="${stroke}" stroke-width="2"/>
      <rect x="32" y="16" width="32" height="6" rx="2" fill="${gold}" stroke="${stroke}" stroke-width="1.6"/>
      <rect x="32" y="74" width="32" height="6" rx="2" fill="${gold}" stroke="${stroke}" stroke-width="1.6"/>
      <path d="M35 68 C58 62 32 50 58 43 C64 41 62 31 44 29 C38 28 36 24 44 23" fill="none" stroke="${gold}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="46" cy="24" r="3" fill="${red}"/>
    `,
    // 8. 剪黏飛簷屋頂（鹿港天后宮）
    jiannianRoof: `
      <circle cx="48" cy="48" r="38" fill="${locked ? 'none' : '#FFF7EA'}" stroke="${gold}" stroke-width="2" stroke-dasharray="${locked ? '4 4' : 'none'}"/>
      <path d="M16 48 Q26 42 36 33 L48 26 L60 33 Q70 42 80 48 Q64 44 48 44 Q32 44 16 48 Z" fill="${locked ? 'none' : red}" stroke="${stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M15 48 Q20 39 24 35 M81 48 Q76 39 72 35" fill="none" stroke="${gold}" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="48" cy="24" r="4.5" fill="${amber}" stroke="${red}" stroke-width="1.8"/>
      <path d="M24 54 L72 54 L68 62 L28 62 Z" fill="${locked ? 'none' : jade}" stroke="${stroke}" stroke-width="2"/>
      <line x1="33" y1="62" x2="33" y2="75" stroke="${red}" stroke-width="3.5"/>
      <line x1="63" y1="62" x2="63" y2="75" stroke="${red}" stroke-width="3.5"/>
      <line x1="25" y1="75" x2="71" y2="75" stroke="${stroke}" stroke-width="2.2"/>
    `,
    // 9. 朱紅山牆與青龍刀（祀典武廟）
    guandaoWall: `
      <circle cx="48" cy="48" r="38" fill="${locked ? 'none' : '#FDF2EE'}" stroke="${gold}" stroke-width="2" stroke-dasharray="${locked ? '4 4' : 'none'}"/>
      <path d="M20 72 L20 48 Q30 34 40 48 L40 42 Q50 26 60 42 L60 50 Q68 38 76 50 L76 72 Z" fill="${locked ? 'none' : red}" stroke="${stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <line x1="26" y1="74" x2="66" y2="24" stroke="${gold}" stroke-width="3" stroke-linecap="round"/>
      <path d="M58 21 C68 18 75 26 69 36 L60 31 Z" fill="${locked ? 'none' : '#E5E7EB'}" stroke="${stroke}" stroke-width="1.8"/>
    `,
    // 10. 文昌御筆（日月潭文武廟）
    wenchangBrush: `
      <circle cx="48" cy="48" r="38" fill="${locked ? 'none' : '#EDF6F2'}" stroke="${gold}" stroke-width="2" stroke-dasharray="${locked ? '4 4' : 'none'}"/>
      <line x1="28" y1="68" x2="60" y2="30" stroke="${jade}" stroke-width="6.5" stroke-linecap="round"/>
      <line x1="28" y1="68" x2="60" y2="30" stroke="${gold}" stroke-width="1.8" stroke-dasharray="3 6"/>
      <path d="M58 28 L69 19 C71 27 67 34 61 34 Z" fill="${locked ? 'none' : '#292524'}" stroke="${stroke}" stroke-width="1.6"/>
      <path d="M24 72 Q42 66 56 72 T74 68" fill="none" stroke="${gold}" stroke-width="2.2" stroke-linecap="round"/>
    `,
    // 11. 大甲媽九龍鳳冠（大甲鎮瀾宮）
    mazuCrown: `
      <circle cx="48" cy="48" r="38" fill="${locked ? 'none' : '#FBF2F6'}" stroke="${gold}" stroke-width="2.4" stroke-dasharray="${locked ? '4 4' : 'none'}"/>
      <path d="M24 54 L28 32 L38 40 L48 24 L58 40 L68 32 L72 54 Z" fill="${locked ? 'none' : 'url(#gold-foil-grad)'}" stroke="${stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="48" cy="22" r="4" fill="${red}" stroke="${gold}" stroke-width="1.5"/>
      <circle cx="38" cy="44" r="3" fill="${red}"/><circle cx="48" cy="44" r="3.5" fill="${jade}"/><circle cx="58" cy="44" r="3" fill="${red}"/>
      <path d="M30 56 L30 69 M39 56 L39 71 M48 56 L48 73 M57 56 L57 71 M66 56 L66 69" stroke="${gold}" stroke-width="2" stroke-dasharray="2 3"/>
    `,
    // 12. 黃金王船（東港東隆宮）
    royalBoat: `
      <circle cx="48" cy="48" r="38" fill="${locked ? 'none' : '#FAF1F4'}" stroke="${gold}" stroke-width="2.4" stroke-dasharray="${locked ? '4 4' : 'none'}"/>
      <path d="M20 55 Q48 70 76 55 L69 65 Q48 73 27 65 Z" fill="${locked ? 'none' : 'url(#gold-foil-grad)'}" stroke="${stroke}" stroke-width="2"/>
      <line x1="48" y1="22" x2="48" y2="57" stroke="${stroke}" stroke-width="2.6"/>
      <path d="M48 25 C64 30 66 44 48 50 Z" fill="${locked ? 'none' : red}" stroke="${gold}" stroke-width="1.8"/>
      <path d="M46 30 C35 34 34 45 46 49 Z" fill="${locked ? 'none' : cream}" stroke="${stroke}" stroke-width="1.6"/>
      <path d="M18 71 Q28 66 38 71 T58 71 T78 71" fill="none" stroke="${jade}" stroke-width="2.2" stroke-linecap="round"/>
    `
  };

  const body = icons[craftId] || icons.redLantern;
  return `<svg viewBox="0 0 96 96" class="craft-badge-svg ${locked ? 'is-locked' : ''}" role="img" aria-hidden="true">${body}</svg>`;
}

/**
 * 專屬宮廟朱紅御朱印章 SVG（受天宮留白印泥質感）
 */
export function renderTempleGoshuinSVG(temple, unlocked = true) {
  const isRare = temple.seedType === 'purple_gold';
  const sealChars = (temple.sealText || '台灣御印').split('');
  const c0 = sealChars[0] || '御';
  const c1 = sealChars[1] || '朱';
  const c2 = sealChars[2] || '平';
  const c3 = sealChars[3] || '安';

  if (!unlocked) {
    return `
      <svg viewBox="0 0 220 260" class="goshuin-svg is-locked" role="img" aria-label="${temple.name}">
        <rect x="10" y="10" width="200" height="240" rx="8" fill="none" stroke="#C7BFB3" stroke-width="1.6" stroke-dasharray="6 5"/>
        <circle cx="110" cy="116" r="58" fill="none" stroke="#C7BFB3" stroke-width="2.5" stroke-dasharray="7 5"/>
        <rect x="74" y="80" width="72" height="72" rx="6" fill="none" stroke="#D1C9BE" stroke-width="1.8" stroke-dasharray="4 4"/>
        <text x="110" y="124" text-anchor="middle" font-family="'Yuji Syuku','Noto Serif TC',serif" font-size="22" fill="#BDB5A9" letter-spacing="4">未顯化</text>
        <text x="110" y="212" text-anchor="middle" font-family="'Noto Serif TC',serif" font-size="14" fill="#9E9589">${temple.name}</text>
      </svg>
    `;
  }

  const frameColor = isRare ? 'url(#gold-foil-grad)' : '#D4AF37';
  const sealRed = '#C83C2B';

  return `
    <svg viewBox="0 0 220 260" class="goshuin-svg is-unlocked ${isRare ? 'is-rare' : ''}" role="img" aria-label="${temple.name} 御朱印">
      <!-- 細緻金箔雙框 -->
      <rect x="8" y="8" width="204" height="244" rx="6" fill="#FAF6EC" stroke="${frameColor}" stroke-width="${isRare ? 3.2 : 2}"/>
      <rect x="15" y="15" width="190" height="230" rx="4" fill="none" stroke="${frameColor}" stroke-width="1" opacity="0.72"/>
      <!-- 角落祥雲回紋 -->
      <path d="M18 30 L18 18 L30 18 M190 18 L202 18 L202 30 M18 230 L18 242 L30 242 M190 242 L202 242 L202 230" fill="none" stroke="${frameColor}" stroke-width="2.2"/>

      <!-- 右上角奉拜字樣 -->
      <text x="184" y="54" text-anchor="middle" font-family="'Yuji Syuku','Noto Serif TC',serif" font-size="16" fill="#57534E" writing-mode="tb" letter-spacing="4">奉拜</text>

      <!-- 中央受天宮風朱紅圓印（帶微暈印泥質感） -->
      <g filter="url(#ink-roughen)" opacity="0.93">
        <circle cx="108" cy="118" r="64" fill="none" stroke="${sealRed}" stroke-width="4.5"/>
        <circle cx="108" cy="118" r="56" fill="none" stroke="${sealRed}" stroke-width="1.5" stroke-dasharray="3 2"/>
        <!-- 內方篆印框 -->
        <rect x="68" y="78" width="80" height="80" rx="6" fill="rgba(200,60,43,0.08)" stroke="${sealRed}" stroke-width="3.2"/>
        <line x1="108" y1="82" x2="108" y2="154" stroke="${sealRed}" stroke-width="1.2" opacity="0.5"/>
        <line x1="72" y1="118" x2="144" y2="118" stroke="${sealRed}" stroke-width="1.2" opacity="0.5"/>
        <!-- 四字朱文篆意（右至左直讀） -->
        <text x="126" y="111" text-anchor="middle" font-family="'Yuji Syuku','Noto Serif TC',serif" font-size="28" font-weight="700" fill="${sealRed}">${c0}</text>
        <text x="126" y="147" text-anchor="middle" font-family="'Yuji Syuku','Noto Serif TC',serif" font-size="28" font-weight="700" fill="${sealRed}">${c1}</text>
        <text x="90" y="111" text-anchor="middle" font-family="'Yuji Syuku','Noto Serif TC',serif" font-size="28" font-weight="700" fill="${sealRed}">${c2}</text>
        <text x="90" y="147" text-anchor="middle" font-family="'Yuji Syuku','Noto Serif TC',serif" font-size="28" font-weight="700" fill="${sealRed}">${c3}</text>
      </g>

      <!-- 左上角小朱印（與右上奉拜對稱，不遮擋下方宮廟書法名） -->
      <rect x="24" y="28" width="22" height="44" rx="2.5" fill="${sealRed}" opacity="0.9"/>
      <text x="35" y="45" text-anchor="middle" font-family="'Noto Serif TC',serif" font-size="11.5" font-weight="700" fill="#FAF6EC">御</text>
      <text x="35" y="61" text-anchor="middle" font-family="'Noto Serif TC',serif" font-size="11.5" font-weight="700" fill="#FAF6EC">印</text>

      <!-- 重疊蒼勁毛筆宮廟名（濃墨留白排版，自動適配長廟名） -->
      <text x="110" y="212" text-anchor="middle" font-family="'Yuji Syuku','Noto Serif TC',serif" font-size="${temple.name.length >= 7 ? 17.5 : 21}" font-weight="700" fill="#292524" letter-spacing="${temple.name.length >= 7 ? 1 : 2}">${temple.name}</text>
      <text x="110" y="233" text-anchor="middle" font-family="'Noto Sans TC',sans-serif" font-size="11.5" fill="#78716C" letter-spacing="1.5">${temple.city}・${temple.district}</text>
    </svg>
  `;
}

/**
 * 首頁中央：受天宮美學風格「御朱燈影」主朱印章
 */
export function renderHeroMainSealSVG() {
  return `
    <svg viewBox="0 0 240 240" class="hero-main-seal-svg" role="img" aria-label="御朱燈影朱紅御朱印">
      <!-- 外環燙金光輪 -->
      <circle cx="120" cy="120" r="112" fill="none" stroke="url(#gold-foil-grad)" stroke-width="1.8" stroke-dasharray="4 4" opacity="0.85"/>
      <circle cx="120" cy="120" r="102" fill="#FBF7EE" stroke="url(#gold-foil-grad)" stroke-width="2.4"/>

      <!-- 受天宮風朱紅主印 -->
      <g filter="url(#ink-roughen)">
        <circle cx="120" cy="120" r="90" fill="none" stroke="#C83C2B" stroke-width="5.5"/>
        <circle cx="120" cy="120" r="80" fill="none" stroke="#C83C2B" stroke-width="1.8"/>

        <!-- 祥雲裝飾 -->
        <path d="M96 46 Q108 38 120 44 Q132 38 144 46" fill="none" stroke="#C83C2B" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M96 194 Q108 202 120 196 Q132 202 144 194" fill="none" stroke="#C83C2B" stroke-width="2.4" stroke-linecap="round"/>

        <!-- 內方印 -->
        <rect x="64" y="64" width="112" height="112" rx="8" fill="rgba(200,60,43,0.07)" stroke="#C83C2B" stroke-width="3.6"/>
        <line x1="120" y1="68" x2="120" y2="172" stroke="#C83C2B" stroke-width="1.4" opacity="0.45"/>
        <line x1="68" y1="120" x2="172" y2="120" stroke="#C83C2B" stroke-width="1.4" opacity="0.45"/>

        <!-- 右至左直書「御朱燈影」 -->
        <text x="146" y="109" text-anchor="middle" font-family="'Yuji Syuku','Noto Serif TC',serif" font-size="38" font-weight="700" fill="#C83C2B">御</text>
        <text x="146" y="160" text-anchor="middle" font-family="'Yuji Syuku','Noto Serif TC',serif" font-size="38" font-weight="700" fill="#C83C2B">朱</text>
        <text x="94" y="109" text-anchor="middle" font-family="'Yuji Syuku','Noto Serif TC',serif" font-size="38" font-weight="700" fill="#C83C2B">燈</text>
        <text x="94" y="160" text-anchor="middle" font-family="'Yuji Syuku','Noto Serif TC',serif" font-size="38" font-weight="700" fill="#C83C2B">影</text>
      </g>
    </svg>
  `;
}

/**
 * 四種靈韻香火苗 SVG（對應皮克敏播種養成靈魂視覺）
 */
export function renderIncenseSeedSVG(seedType, progressRatio = 0) {
  const def = SITE_CONFIG.seedTypes[seedType] || SITE_CONFIG.seedTypes.vermilion;
  const pct = Math.max(0, Math.min(1, progressRatio));
  const ready = pct >= 1;
  const stemHeight = 14 + pct * 22;
  const leafScale = 0.55 + pct * 0.65;

  const palette = {
    gold: { body: '#E5B940', rim: '#A37610', glow: '#FDE68A', leaf: '#D97706' },
    vermilion: { body: '#C83C2B', rim: '#8C2318', glow: '#FDBA74', leaf: '#EA580C' },
    jade: { body: '#2E6F5E', rim: '#1B493D', glow: '#A7F3D0', leaf: '#059669' },
    purple_gold: { body: '#6D2E46', rim: '#D4AF37', glow: '#FDE68A', leaf: '#D4AF37' }
  }[seedType] || { body: def.color, rim: '#8C2318', glow: '#FDE68A', leaf: '#D97706' };

  return `
    <svg viewBox="0 0 110 110" class="incense-seed-svg ${ready ? 'is-ready' : ''}" role="img" aria-hidden="true">
      <!-- 暖光暈 -->
      <circle cx="55" cy="64" r="${ready ? 44 : 36}" fill="${palette.glow}" opacity="${ready ? 0.45 : 0.22}"/>
      <!-- 嫋嫋香煙線 -->
      <path d="M44 36 Q38 24 46 14 M66 36 Q72 24 64 14" fill="none" stroke="${palette.glow}" stroke-width="2" stroke-linecap="round" opacity="${ready ? 0.9 : 0.55}"/>
      <!-- 靈芽莖幹與花苞 -->
      <path d="M55 56 Q55 ${56 - stemHeight * 0.6} 55 ${56 - stemHeight}" fill="none" stroke="${palette.leaf}" stroke-width="3.6" stroke-linecap="round"/>
      <g transform="translate(55, ${56 - stemHeight}) scale(${leafScale.toFixed(2)})">
        <path d="M0 0 C-14 -4 -18 -16 -4 -18 C2 -18 4 -8 0 0 Z" fill="${palette.leaf}" stroke="${palette.rim}" stroke-width="1.4"/>
        <path d="M0 0 C14 -4 18 -16 4 -18 C-2 -18 -4 -8 0 0 Z" fill="${palette.leaf}" stroke="${palette.rim}" stroke-width="1.4"/>
        ${ready ? `<circle cx="0" cy="-14" r="7" fill="#FFFBEB" stroke="#F59E0B" stroke-width="2.2"/>` : ''}
      </g>
      <!-- 香火苗寶珠（蓮花香爐壺意象） -->
      <path d="M32 68 C32 54 42 47 55 47 C68 47 78 54 78 68 C78 83 68 92 55 92 C42 92 32 83 32 68 Z"
            fill="${palette.body}" stroke="${palette.rim}" stroke-width="2.6"/>
      <ellipse cx="47" cy="60" rx="6" ry="9" fill="#FFFFFF" opacity="0.24" transform="rotate(-18 47 60)"/>
      <!-- 符紋金環 -->
      <path d="M35 72 Q55 80 75 72" fill="none" stroke="#F5DF98" stroke-width="2.2"/>
      <circle cx="55" cy="75" r="4.5" fill="#F5DF98" stroke="${palette.rim}" stroke-width="1.3"/>
      <!-- 底座 -->
      <ellipse cx="55" cy="94" rx="22" ry="4.5" fill="rgba(41,37,36,0.16)"/>
    </svg>
  `;
}

/**
 * 裝飾性傳統印章風 QR 視覺圖（供未上傳自訂收款圖前顯示美觀範例，不出現破圖）
 */
export function renderStyledQrSVG(seedText = 'TEMPLEGO') {
  // 產生穩定偽隨機點陣
  let hash = 0;
  for (let i = 0; i < seedText.length; i++) {
    hash = (hash * 31 + seedText.charCodeAt(i)) % 100000;
  }
  const cells = [];
  const size = 15;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inFinder =
        (r < 5 && c < 5) ||
        (r < 5 && c >= size - 5) ||
        (r >= size - 5 && c < 5);
      const inCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;
      if (inFinder || inCenter) continue;
      const v = ((r * 17 + c * 31 + hash) % 11);
      if (v % 2 === 0 || v === 3) {
        cells.push(`<rect x="${12 + c * 8}" y="${12 + r * 8}" width="6.5" height="6.5" rx="1.2" fill="#292524"/>`);
      }
    }
  }
  return `
    <svg viewBox="0 0 144 144" class="styled-qr-svg" role="img" aria-label="QR Code">
      <rect width="144" height="144" rx="10" fill="#FFFDF8" stroke="#D4AF37" stroke-width="2.5"/>
      <!-- 三角定位框 -->
      <g fill="none" stroke="#292524" stroke-width="4.5">
        <rect x="14" y="14" width="30" height="30" rx="3"/>
        <rect x="100" y="14" width="30" height="30" rx="3"/>
        <rect x="14" y="100" width="30" height="30" rx="3"/>
      </g>
      <rect x="23" y="23" width="12" height="12" rx="1.5" fill="#C83C2B"/>
      <rect x="109" y="23" width="12" height="12" rx="1.5" fill="#C83C2B"/>
      <rect x="23" y="109" width="12" height="12" rx="1.5" fill="#C83C2B"/>
      ${cells.join('')}
      <!-- 中央朱紅小印 -->
      <rect x="59" y="59" width="26" height="26" rx="4" fill="#C83C2B"/>
      <text x="72" y="77" text-anchor="middle" font-family="'Yuji Syuku','Noto Serif TC',serif" font-size="15" font-weight="700" fill="#FFFDF8">印</text>
    </svg>
  `;
}
