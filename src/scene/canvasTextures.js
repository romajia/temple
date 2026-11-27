/**
 * 動態 Canvas 2D 高對比清晰紋理產生器 (V2)
 * - 強化牌匾、對聯、公佈欄與太歲紅紙牆的字體清晰度與色彩對比度
 * - 零外部圖片連結，保證開箱即完整不破圖
 */
import * as THREE from 'three';

const IS_MOBILE_TEX = typeof window !== 'undefined' && (window.innerWidth <= 900 || 'ontouchstart' in window);

function makeCanvasTexture(canvas, srgb = true, allowDownscale = true) {
  let source = canvas;
  // 手機裝置自動將較大靜態貼圖（> 384px）等比縮放至 384px 級別，大幅節省手機 GPU 記憶體並防止 WebGL OOM 閃退！
  const maxDim = Math.max(canvas.width, canvas.height);
  if (IS_MOBILE_TEX && allowDownscale && maxDim > 384) {
    const scale = 384 / maxDim;
    const small = document.createElement('canvas');
    small.width = Math.max(64, Math.round(canvas.width * scale));
    small.height = Math.max(64, Math.round(canvas.height * scale));
    small.getContext('2d').drawImage(canvas, 0, 0, small.width, small.height);
    source = small;
  }
  const tex = new THREE.CanvasTexture(source);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = IS_MOBILE_TEX ? 1 : 6;
  tex.needsUpdate = true;
  return tex;
}

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * 1. 實景還原：金雕雙龍框・朱紅漆面「玉勅・代天府・德慈宮」直式宮匾（依實景照 1:1.35 黃金比例精雕細繪！）
 */
export function createPlaqueTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 1040;
  const ctx = canvas.getContext('2d');

  // 外緣紅木底框（搭配 3D 金龍雕花框）
  ctx.fillStyle = '#7A1612';
  ctx.fillRect(0, 0, 768, 1040);

  // 左右與上下寬幅「透雕金龍纏雲外框區」底層深紅木陰影
  ctx.fillStyle = '#4B0C09';
  ctx.fillRect(14, 14, 740, 1012);

  // 中央正朱紅大漆牌面（實景照的亮朱紅色＋溫潤漆器木紋光澤！）
  const innerX = 148;
  const innerY = 66;
  const innerW = 472;
  const innerH = 886;
  const redGrad = ctx.createLinearGradient(innerX, innerY, innerX + innerW, innerY + innerH);
  redGrad.addColorStop(0, '#E43028');
  redGrad.addColorStop(0.45, '#CC211C');
  redGrad.addColorStop(1, '#A61612');
  ctx.fillStyle = redGrad;
  ctx.fillRect(innerX, innerY, innerW, innerH);

  // 細緻朱紅木漆直紋與雙層雕花凹線框
  ctx.strokeStyle = 'rgba(110, 10, 8, 0.16)';
  ctx.lineWidth = 2;
  for (let x = innerX + 16; x < innerX + innerW - 12; x += 14) {
    ctx.beginPath(); ctx.moveTo(x, innerY + 14); ctx.lineTo(x, innerY + innerH - 14); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(70, 5, 5, 0.55)';
  ctx.lineWidth = 9;
  ctx.strokeRect(innerX + 10, innerY + 10, innerW - 20, innerH - 20);
  ctx.strokeStyle = 'rgba(255, 210, 140, 0.42)';
  ctx.lineWidth = 3;
  ctx.strokeRect(innerX + 20, innerY + 20, innerW - 40, innerH - 40);

  // 四角精緻金線回紋角花
  [[innerX + 24, innerY + 24, 1, 1], [innerX + innerW - 24, innerY + 24, -1, 1],
   [innerX + 24, innerY + innerH - 24, 1, -1], [innerX + innerW - 24, innerY + innerH - 24, -1, -1]].forEach(([cx, cy, sx, sy]) => {
    ctx.strokeStyle = 'rgba(248, 212, 112, 0.55)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy + sy * 28);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + sx * 28, cy);
    ctx.stroke();
  });

  // 左右兩側精雕「立體盤龍金框」（縮放對應 1040 高度！）
  ctx.save();
  ctx.scale(1, 1040 / 1280);
  drawOrnateCarvedDragonBorder(ctx, true);
  drawOrnateCarvedDragonBorder(ctx, false);
  ctx.restore();

  // 上方雙龍搶珠與底部金雕底座花飾
  drawCarvedTopBottomRelief(ctx, 384, 34, 694, 52);
  drawCarvedTopBottomRelief(ctx, 384, 992, 712, 74);

  // ---- 實景照精準字體排版：上方拱形「玉勅」「代天府」＋ 中央豪邁「德慈宮」----
  const drawEmbossedGoldChar = (ch, x, y, size, tilt = 0) => {
    ctx.save();
    ctx.translate(x, y);
    if (tilt) ctx.rotate(tilt);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${size}px "DFKai-SB", "BiauKai", "Noto Serif TC", serif`;

    // 立體浮雕右下方深影
    ctx.fillStyle = 'rgba(54, 4, 3, 0.88)';
    ctx.fillText(ch, 5, 7);

    // 暗古銅描邊（凸顯立體厚度）
    ctx.lineWidth = Math.max(5, size * 0.068);
    ctx.strokeStyle = '#6B4208';
    ctx.lineJoin = 'round';
    ctx.strokeText(ch, 0, 0);

    // 貼金箔多段漸層
    const g = ctx.createLinearGradient(-size * 0.4, -size * 0.45, size * 0.4, size * 0.45);
    g.addColorStop(0, '#FFFAD6');
    g.addColorStop(0.28, '#FCE06E');
    g.addColorStop(0.60, '#D99B22');
    g.addColorStop(0.84, '#F9D866');
    g.addColorStop(1, '#A66D0E');
    ctx.fillStyle = g;
    ctx.fillText(ch, 0, 0);

    // 頂緣亮金高光
    ctx.fillStyle = 'rgba(255, 255, 240, 0.38)';
    ctx.fillText(ch, -1.5, -2);
    ctx.restore();
  };

  // 上拱兩字（由右至左：玉、勅）
  drawEmbossedGoldChar('玉', 456, 138, 72, 0.04);
  drawEmbossedGoldChar('勅', 312, 138, 72, -0.04);

  // 次拱三字（由右至左：代、天、府）
  drawEmbossedGoldChar('代', 518, 232, 82, 0.05);
  drawEmbossedGoldChar('天', 384, 224, 88, 0);
  drawEmbossedGoldChar('府', 250, 232, 82, -0.05);

  // 中央超大立體貼金楷書「德 慈 宮」
  drawEmbossedGoldChar('德', 384, 424, 174, 0);
  drawEmbossedGoldChar('慈', 384, 634, 174, 0);
  drawEmbossedGoldChar('宮', 384, 838, 174, 0);

  return makeCanvasTexture(canvas);
}


function drawOrnateCarvedDragonBorder(ctx, isLeft) {
  ctx.save();
  if (!isLeft) {
    ctx.translate(768, 0);
    ctx.scale(-1, 1);
  }

  // 外側紅漆邊柱
  ctx.fillStyle = '#B81F1A';
  ctx.fillRect(10, 40, 26, 1180);

  // 金雕捲雲與波浪襯底
  for (let y = 96; y < 1165; y += 54) {
    const cx = 84 + Math.sin(y * 0.04) * 20;
    const g = ctx.createRadialGradient(cx - 6, y - 6, 4, cx, y, 36);
    g.addColorStop(0, '#FFF2A6');
    g.addColorStop(0.55, '#DFA126');
    g.addColorStop(1, '#7A4C08');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, y, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4A2B04';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 雲捲內紋
    ctx.strokeStyle = '#FFF5C2';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, y, 14, 0.2, Math.PI * 1.65);
    ctx.stroke();
  }

  // 蜿蜒盤繞金龍主身（兩段大 S 曲線：上龍＋下龍呼應實景照！）
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#5E3806';
  ctx.lineWidth = 42;
  ctx.beginPath();
  ctx.moveTo(86, 1140);
  ctx.bezierCurveTo(32, 980, 134, 830, 74, 660);
  ctx.bezierCurveTo(26, 490, 134, 330, 88, 126);
  ctx.stroke();

  ctx.strokeStyle = '#E8AF30';
  ctx.lineWidth = 30;
  ctx.stroke();

  ctx.strokeStyle = '#FFF3B0';
  ctx.lineWidth = 8;
  ctx.stroke();

  // 金龍鱗片細節點綴
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    const y = 140 + t * 980;
    const x = 82 + Math.sin(t * Math.PI * 4.2) * 28;
    ctx.fillStyle = i % 2 === 0 ? '#FFE680' : '#C98A1B';
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6E4208';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 上方威嚴金龍頭（面向中央牌面）
  ctx.fillStyle = '#F5C442';
  ctx.beginPath();
  ctx.ellipse(104, 152, 34, 24, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5E3806';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#4A0806';
  ctx.beginPath();
  ctx.arc(114, 146, 5, 0, Math.PI * 2);
  ctx.fill();

  // 下方盤龍頭
  ctx.fillStyle = '#F5C442';
  ctx.beginPath();
  ctx.ellipse(100, 960, 32, 22, -0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#4A0806';
  ctx.beginPath();
  ctx.arc(110, 954, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCarvedTopBottomRelief(ctx, cx, cy, w, h) {
  ctx.save();
  const x0 = cx - w / 2;
  const g = ctx.createLinearGradient(x0, cy - h / 2, x0, cy + h / 2);
  g.addColorStop(0, '#FFF0A0');
  g.addColorStop(0.5, '#DC9A20');
  g.addColorStop(1, '#784A0A');
  ctx.fillStyle = g;
  drawRoundRect(ctx, x0, cy - h / 2, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = '#522C05';
  ctx.lineWidth = 4;
  ctx.stroke();

  for (let x = x0 + 36; x < x0 + w - 24; x += 48) {
    ctx.strokeStyle = '#FFF5C4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, cy, h * 0.28, 0, Math.PI * 1.6);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * 2. 實景還原：台灣手工刺繡「八仙彩」橫幅（依實景照片精細繪製！）
 *    深寶藍百花飛鳥繡邊 ＋ 橘紅金線捲雲絲綢底 ＋ 中央仙翁乘白鶴與八仙騎瑞獸 ＋ 藍白海水江崖紋 ＋ 密排紅絲流蘇
 */
export function createBaXianCaiTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');

  // 透明底部留給真實密排流蘇
  ctx.clearRect(0, 0, 1536, 420);

  const bannerH = 352;

  // 1. 深寶藍織錦百花外框（還原實景圖上下左右深藍繡花邊！）
  const borderGrad = ctx.createLinearGradient(0, 0, 0, bannerH);
  borderGrad.addColorStop(0, '#1B3A75');
  borderGrad.addColorStop(0.5, '#254C92');
  borderGrad.addColorStop(1, '#183266');
  ctx.fillStyle = borderGrad;
  ctx.fillRect(0, 0, 1536, bannerH);

  // 在藍色繡花外框點綴紅、粉、黃、藍牡丹花、綠葉與金鳥
  const flowerColors = ['#F43F5E', '#FACC15', '#FB923C', '#EC4899', '#38BDF8', '#FDE047'];
  const drawBorderFlower = (fx, fy, idx) => {
    // 綠葉
    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.ellipse(fx - 14, fy + 4, 10, 5, -0.4, 0, Math.PI * 2);
    ctx.ellipse(fx + 14, fy - 3, 10, 5, 0.4, 0, Math.PI * 2);
    ctx.fill();
    // 花瓣
    ctx.fillStyle = flowerColors[idx % flowerColors.length];
    ctx.beginPath();
    ctx.arc(fx, fy, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFF9C4';
    ctx.beginPath();
    ctx.arc(fx, fy, 4, 0, Math.PI * 2);
    ctx.fill();
  };
  for (let i = 0; i < 30; i++) {
    const fx = 28 + i * 51;
    drawBorderFlower(fx, 22, i);
    drawBorderFlower(fx, bannerH - 22, i + 3);
  }
  for (let j = 1; j < 7; j++) {
    drawBorderFlower(26, 22 + j * 48, j + 1);
    drawBorderFlower(1510, 22 + j * 48, j + 4);
  }

  // 銀綠亮片內框線
  ctx.strokeStyle = '#6EE7B7';
  ctx.lineWidth = 7;
  ctx.strokeRect(50, 44, 1436, bannerH - 88);
  ctx.strokeStyle = '#F8FAFC';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(56, 50, 1424, bannerH - 100);

  // 2. 耀眼橘紅金線絲綢中幅（還原實景照的鮮豔橘紅綢緞！）
  const innerX = 58;
  const innerY = 52;
  const innerW = 1420;
  const innerH = bannerH - 104;
  const silkGrad = ctx.createLinearGradient(0, innerY, 0, innerY + innerH);
  silkGrad.addColorStop(0, '#F05A22');
  silkGrad.addColorStop(0.5, '#E44917');
  silkGrad.addColorStop(1, '#C83712');
  ctx.fillStyle = silkGrad;
  ctx.fillRect(innerX, innerY, innerW, innerH);

  // 滿版精細「金線捲雲刺繡底紋」＋ 亮片星點
  ctx.strokeStyle = 'rgba(253, 216, 98, 0.50)';
  ctx.lineWidth = 2.2;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 26; col++) {
      const cx = innerX + 28 + col * 54 + (row % 2) * 26;
      const cy = innerY + 26 + row * 46;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 1.55);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 12, cy + 8, 8, Math.PI, Math.PI * 2.5);
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#FFF3B0';
  for (let s = 0; s < 48; s++) {
    const sx = innerX + 20 + ((s * 97) % (innerW - 40));
    const sy = innerY + 18 + ((s * 53) % (innerH - 95));
    ctx.beginPath();
    ctx.arc(sx, sy, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. 底部「藍白層疊海水江崖波浪紋」（實景照最經典標誌！）
  const waveBaseY = innerY + innerH;
  const waveCount = 12;
  const waveW = innerW / waveCount;
  for (let i = 0; i < waveCount; i++) {
    const wx = innerX + i * waveW + waveW / 2;
    // 白色浪花外緣
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.arc(wx, waveBaseY + 4, waveW * 0.56, Math.PI, 0);
    ctx.fill();
    // 淺青浪層
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(wx, waveBaseY + 6, waveW * 0.45, Math.PI, 0);
    ctx.fill();
    // 寶藍深浪心
    ctx.fillStyle = '#1D4ED8';
    ctx.beginPath();
    ctx.arc(wx, waveBaseY + 8, waveW * 0.33, Math.PI, 0);
    ctx.fill();
    // 滾金線
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(wx, waveBaseY + 6, waveW * 0.48, Math.PI * 1.08, -0.08);
    ctx.stroke();
  }

  // 4. 中央「仙翁乘白鶴展翅」＋ 左右共八位「八仙騎瑞獸」（還原實景照九組繡像！）
  // 中央白鶴雙翅
  const midX = 768;
  const midY = 176;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 3;
  // 左白鶴大翅
  ctx.beginPath();
  ctx.ellipse(midX - 42, midY - 4, 48, 26, -0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 右白鶴大翅
  ctx.beginPath();
  ctx.ellipse(midX + 42, midY - 4, 48, 26, 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 白鶴身與仙人
  ctx.beginPath();
  ctx.ellipse(midX, midY + 18, 24, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  drawEmbroideredImmortal(ctx, midX, midY - 8, '#2563EB', '#EC4899');

  // 左右八仙各騎瑞獸（金虎、青麟、梅花鹿、白馬、綠龍馬等）
  const leftImmortals = [
    { x: 160, beast: '#FACC15', robe: '#16A34A', accent: '#FDE047' },
    { x: 306, beast: '#FB923C', robe: '#9333EA', accent: '#F472B6' },
    { x: 454, beast: '#B45309', robe: '#EC4899', accent: '#38BDF8' },
    { x: 604, beast: '#F59E0B', robe: '#22C55E', accent: '#F43F5E' }
  ];
  const rightImmortals = [
    { x: 932, beast: '#7DD3FC', robe: '#1D4ED8', accent: '#FDE047' },
    { x: 1082, beast: '#4ADE80', robe: '#DC2626', accent: '#F59E0B' },
    { x: 1230, beast: '#93C5FD', robe: '#16A34A', accent: '#F472B6' },
    { x: 1376, beast: '#A16207', robe: '#6366F1', accent: '#FDE047' }
  ];

  [...leftImmortals, ...rightImmortals].forEach((im, idx) => {
    const facingRight = idx < 4;
    drawEmbroideredBeast(ctx, im.x, 198, im.beast, facingRight);
    drawEmbroideredImmortal(ctx, im.x, 152, im.robe, im.accent);
  });

  // 5. 底部密排「正紅絲線流蘇 ＋ 金珠頂結」（實景圖最下方精緻紅流蘇）
  for (let x = 14; x < 1524; x += 26) {
    // 金色流蘇結
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(x + 8, bannerH + 6, 6, 0, Math.PI * 2);
    ctx.fill();
    // 垂墜朱紅絲穗
    ctx.fillStyle = '#B91C1C';
    ctx.fillRect(x + 2, bannerH + 10, 12, 56);
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(x + 5, bannerH + 12, 5, 52);
  }

  return makeCanvasTexture(canvas);
}


function drawEmbroideredBeast(ctx, x, y, color, facingRight) {
  ctx.save();
  ctx.translate(x, y);
  if (!facingRight) ctx.scale(-1, 1);

  // 祥雲座墊
  ctx.fillStyle = '#F472B6';
  ctx.beginPath();
  ctx.ellipse(0, 26, 40, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FFF7ED';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 瑞獸身體與四肢
  ctx.fillStyle = color;
  ctx.strokeStyle = '#3B1E10';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, 4, 34, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 瑞獸頭
  ctx.beginPath();
  ctx.arc(32, -8, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 奔跑四足
  ctx.lineWidth = 6;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(-20, 12); ctx.lineTo(-28, 28);
  ctx.moveTo(16, 12); ctx.lineTo(28, 26);
  ctx.stroke();

  ctx.restore();
}

function drawEmbroideredImmortal(ctx, x, y, robeColor, accentColor) {
  ctx.save();
  ctx.translate(x, y);

  // 仙人寬袖彩袍
  ctx.fillStyle = robeColor;
  ctx.strokeStyle = '#FEF08A';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-18, 22);
  ctx.lineTo(-10, -8);
  ctx.lineTo(10, -8);
  ctx.lineTo(18, 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 飄逸仙帶
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.quadraticCurveTo(-28, -14, -14, -22);
  ctx.moveTo(16, 0);
  ctx.quadraticCurveTo(28, -14, 14, -22);
  ctx.stroke();

  // 頭部與髮髻
  ctx.fillStyle = '#FDE2C4';
  ctx.beginPath();
  ctx.arc(0, -18, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1F2937';
  ctx.beginPath();
  ctx.arc(0, -25, 8, Math.PI, 0);
  ctx.fill();

  ctx.restore();
}

/**
 * 3. 紅底金字直式對聯（支援 11 字莊嚴對聯，高對比立體貼金楷書）
 */
export function createCoupletTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // 飽滿大紅宣紙漸層底色
  const bg = ctx.createLinearGradient(0, 0, 200, 1024);
  bg.addColorStop(0, '#A81715');
  bg.addColorStop(0.5, '#8F1312');
  bg.addColorStop(1, '#750E0E');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 200, 1024);

  // 細緻灑金箔微點
  ctx.fillStyle = 'rgba(255, 224, 130, 0.16)';
  for (let i = 0; i < 60; i++) {
    ctx.fillRect((i * 47) % 184 + 8, (i * 89) % 990 + 16, 4, 4);
  }

  ctx.strokeStyle = '#FAD364';
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 180, 1004);
  ctx.strokeStyle = '#FFF2B2';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(22, 22, 156, 980);

  const chars = [...text];
  const count = Math.max(chars.length, 1);
  const availH = 910;
  const step = availH / count;
  const fontSize = Math.min(72, Math.floor(step * 0.80));

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${fontSize}px "DFKai-SB", "BiauKai", "Noto Serif TC", serif`;

  chars.forEach((ch, idx) => {
    const y = 58 + (idx + 0.5) * step;
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#380605';
    ctx.lineJoin = 'round';
    ctx.strokeText(ch, 100, y);

    const g = ctx.createLinearGradient(60, y - fontSize / 2, 140, y + fontSize / 2);
    g.addColorStop(0, '#FFFBE0');
    g.addColorStop(0.5, '#FDE068');
    g.addColorStop(1, '#D99B22');
    ctx.fillStyle = g;
    ctx.fillText(ch, 100, y);
  });

  return makeCanvasTexture(canvas);
}


/**
 * 4. 橫批匾額（如：慈聖威德）
 */
export function createHorizontalSignTexture(text = '慈聖威德') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#7E1210';
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = '#FAD364';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 496, 144);

  ctx.font = '900 76px "Noto Serif TC", "DFKai-SB", "Microsoft JhengHei", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#330606';
  ctx.strokeText(text.split('').join(' '), 256, 84);
  ctx.fillStyle = '#FFF3B0';
  ctx.fillText(text.split('').join(' '), 256, 84);

  return makeCanvasTexture(canvas);
}


/**
 * 5. 廟內右側「紅紙牆／太歲燈牆」動態紋理（高對比清晰名條）
 */
export function drawTaiSuiWallCanvas(canvas, list = [], highlightName = '') {
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#471E12';
  ctx.fillRect(0, 0, 1024, 640);

  ctx.fillStyle = '#851313';
  ctx.fillRect(22, 22, 980, 596);

  ctx.fillStyle = '#5E0C0C';
  ctx.fillRect(22, 22, 980, 76);
  ctx.strokeStyle = '#F7CF59';
  ctx.lineWidth = 5;
  ctx.strokeRect(24, 24, 976, 592);

  ctx.fillStyle = '#FFF2B2';
  ctx.font = 'bold 38px "Noto Serif TC", "Microsoft JhengHei", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦ 玉勅代天府德慈宮・太歲平安紅紙燈牆 ✦', 512, 60);

  const cols = 12;
  const rows = 3;
  const padX = 38;
  const startY = 114;
  const cellW = (1024 - padX * 2) / cols;
  const cellH = (606 - startY) / rows;
  const query = highlightName.trim();

  for (let i = 0; i < cols * rows; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = padX + col * cellW + 5;
    const y = startY + row * cellH + 6;
    const w = cellW - 10;
    const h = cellH - 12;
    const item = list[i];
    const itemName = String(item?.name || '').trim();
    const isMatch = Boolean(query && itemName && itemName.includes(query));

    ctx.fillStyle = itemName
      ? (isMatch ? '#FFE66D' : (item.type === 'online' ? '#DC2626' : '#C21D1D'))
      : 'rgba(100, 12, 12, 0.55)';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = isMatch ? '#FFFFFF' : '#FCD34D';
    ctx.lineWidth = isMatch ? 5 : 2;
    ctx.strokeRect(x, y, w, h);

    if (itemName) {
      const glow = ctx.createRadialGradient(x + w / 2, y + 18, 2, x + w / 2, y + 18, 16);
      glow.addColorStop(0, '#FFFFFF');
      glow.addColorStop(0.5, '#FFE066');
      glow.addColorStop(1, 'rgba(255, 210, 60, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + 18, 16, 0, Math.PI * 2);
      ctx.fill();

      // 支援最多 20 字元姓名或公司行號：放大清晰粗體字級，超過 5 字自動分雙直欄由右至左排入紅紙！
      const chars = [...itemName.slice(0, 20)];
      ctx.fillStyle = isMatch ? '#5E0A0A' : '#FFFDF2';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (chars.length <= 5) {
        const fSize = chars.length <= 3 ? 28 : chars.length === 4 ? 25 : 22;
        ctx.font = `900 ${fSize}px "Noto Serif TC", "Microsoft JhengHei", serif`;
        const step = Math.min(fSize + 3, (h - 34) / Math.max(chars.length, 1));
        chars.forEach((ch, ci) => ctx.fillText(ch, x + w / 2, y + 38 + ci * step));
      } else {
        const half = Math.ceil(chars.length / 2);
        const fSize = half <= 5 ? 19 : half <= 7 ? 16 : 14;
        ctx.font = `900 ${fSize}px "Noto Serif TC", "Microsoft JhengHei", serif`;
        const step = Math.min(fSize + 2, (h - 32) / Math.max(half, 1));
        chars.forEach((ch, ci) => {
          const isSecondCol = ci >= half;
          const colX = isSecondCol ? x + w * 0.29 : x + w * 0.71;
          const rowIdx = isSecondCol ? ci - half : ci;
          ctx.fillText(ch, colX, y + 34 + rowIdx * step);
        });
      }
    }
  }
}

export function createTaiSuiWallTexture(list, highlightName = '') {
  const canvas = document.createElement('canvas');
  drawTaiSuiWallCanvas(canvas, list, highlightName);
  const tex = makeCanvasTexture(canvas, true, false);
  tex.userData = { canvas };
  return tex;
}

/**
 * 6. 廟右邊「紅底木框公佈欄」動態紋理（高對比清楚易讀）
 */
export function drawBulletinCanvas(canvas, bulletin) {
  canvas.width = 768;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#8C1514';
  ctx.fillRect(0, 0, 768, 512);
  ctx.strokeStyle = '#FAD364';
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, 744, 488);

  ctx.fillStyle = '#FFF5C2';
  ctx.font = '900 40px "Noto Serif TC", "Microsoft JhengHei", serif';
  ctx.textAlign = 'center';
  ctx.fillText('德慈宮・廟務公佈欄', 384, 66);

  // 左側宣紙公告區
  ctx.fillStyle = '#FFFDF7';
  ctx.fillRect(34, 92, 424, 384);
  ctx.strokeStyle = '#C98A28';
  ctx.lineWidth = 3;
  ctx.strokeRect(34, 92, 424, 384);

  ctx.fillStyle = '#8E1515';
  ctx.font = 'bold 25px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('📌 最新消息', 52, 134);

  const anns = (bulletin?.announcements || []).slice(0, 3);
  anns.forEach((ann, i) => {
    const y = 178 + i * 96;
    ctx.fillStyle = '#991B1B';
    ctx.font = 'bold 21px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    const title = ann.title.length > 16 ? ann.title.slice(0, 16) + '…' : ann.title;
    ctx.fillText(`• ${title}`, 52, y);
    ctx.fillStyle = '#3A2114';
    ctx.font = '500 17px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    const snippet = ann.content.length > 22 ? ann.content.slice(0, 22) + '…' : ann.content;
    ctx.fillText(snippet, 66, y + 30);
    ctx.fillStyle = '#7A543E';
    ctx.font = '15px "Noto Sans TC", sans-serif';
    ctx.fillText(ann.date || '', 66, y + 54);
  });

  // 右上建廟進度
  ctx.fillStyle = '#FFF8DC';
  ctx.fillRect(474, 92, 260, 182);
  ctx.strokeStyle = '#C98A28';
  ctx.strokeRect(474, 92, 260, 182);

  const pct = bulletin?.construction?.percent ?? 72;
  ctx.fillStyle = '#7C1414';
  ctx.font = 'bold 22px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.fillText('🏯 新廟建廟進度', 492, 132);

  ctx.fillStyle = '#B91C1C';
  ctx.font = '900 46px "Noto Sans TC", sans-serif';
  ctx.fillText(`${pct}%`, 492, 192);

  ctx.fillStyle = '#E5D3A3';
  ctx.fillRect(492, 210, 224, 18);
  ctx.fillStyle = '#D97706';
  ctx.fillRect(492, 210, Math.round(2.24 * Math.min(100, Math.max(0, pct))), 18);

  ctx.fillStyle = '#3E2010';
  ctx.font = 'bold 15px "Noto Sans TC", sans-serif';
  const stage = (bulletin?.construction?.stage || '').slice(0, 14);
  ctx.fillText(stage, 492, 256);

  // 右下芳名錄
  ctx.fillStyle = '#FFF0E5';
  ctx.fillRect(474, 290, 260, 186);
  ctx.strokeStyle = '#B91C1C';
  ctx.strokeRect(474, 290, 260, 186);

  ctx.fillStyle = '#8E1515';
  ctx.font = 'bold 22px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.fillText('🙏 捐款芳名錄', 492, 326);

  (bulletin?.donors || []).slice(0, 4).forEach((d, idx) => {
    ctx.fillStyle = '#2E160B';
    ctx.font = 'bold 16px "Noto Sans TC", sans-serif';
    ctx.fillText(`${d.name.slice(0, 7)}  ${d.amount}`, 492, 360 + idx * 28);
  });
}

export function createBulletinTexture(bulletin) {
  const canvas = document.createElement('canvas');
  drawBulletinCanvas(canvas, bulletin);
  const tex = makeCanvasTexture(canvas, true, false);
  tex.userData = { canvas };
  return tex;
}

export function createPlazaTileTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#DFCBB4';
  ctx.fillRect(0, 0, 512, 512);
  const step = 64;
  for (let y = 0; y < 512; y += step) {
    for (let x = 0; x < 512; x += step) {
      ctx.fillStyle = ((x + y) / step) % 2 === 0 ? '#E8D6C2' : '#DCC4AC';
      ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
      ctx.strokeStyle = 'rgba(130, 95, 65, 0.22)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, step - 4, step - 4);
    }
  }
  const tex = makeCanvasTexture(canvas, true, false);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 7);
  return tex;
}

export function createHallFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#A8523A';
  ctx.fillRect(0, 0, 512, 512);
  const step = 64;
  for (let y = 0; y < 512; y += step) {
    for (let x = 0; x < 512; x += step) {
      ctx.fillStyle = ((x / step + y / step) % 2 === 0) ? '#BA5E43' : '#AC5339';
      ctx.fillRect(x + 3, y + 3, step - 6, step - 6);
      ctx.fillStyle = '#EFE0C6';
      ctx.beginPath();
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x + 6, y);
      ctx.lineTo(x, y + 6);
      ctx.lineTo(x - 6, y);
      ctx.closePath();
      ctx.fill();
    }
  }
  const tex = makeCanvasTexture(canvas, true, false);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

export function createRoofTileTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#C24D27';
  ctx.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 32) {
    const grad = ctx.createLinearGradient(x, 0, x + 32, 0);
    grad.addColorStop(0, '#9E3818');
    grad.addColorStop(0.45, '#E36F40');
    grad.addColorStop(1, '#8F3114');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, 30, 512);
  }
  ctx.strokeStyle = 'rgba(70, 20, 8, 0.32)';
  ctx.lineWidth = 3;
  for (let y = 0; y < 512; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }
  const tex = makeCanvasTexture(canvas, true, false);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  return tex;
}

/**
 * 場景互動點超高對比懸浮牌（溫潤米白底＋深墨紅粗體字＋金紅雙框＋關閉 toneMapped，日夜皆清晰易讀不刺眼！）
 */
export function createZoneBadgeSprite(label, accentColor = '#B92B27') {
  const canvas = document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');

  // 外層微陰影立體邊
  ctx.fillStyle = 'rgba(20, 12, 8, 0.26)';
  drawRoundRect(ctx, 16, 20, 328, 66, 33);
  ctx.fill();

  // 溫潤不反光宣紙米白底（白底深字，日夜場景都一眼看清！）
  ctx.fillStyle = 'rgba(255, 251, 240, 0.97)';
  drawRoundRect(ctx, 14, 15, 332, 66, 33);
  ctx.fill();

  // 深朱紅外框 ＋ 內層淡金線
  ctx.strokeStyle = '#8E1515';
  ctx.lineWidth = 5;
  drawRoundRect(ctx, 14, 15, 332, 66, 33);
  ctx.stroke();

  ctx.strokeStyle = '#D9A040';
  ctx.lineWidth = 2;
  drawRoundRect(ctx, 20, 21, 320, 54, 27);
  ctx.stroke();

  // 左側區域色標圓點
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(50, 48, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2A120B';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 超高對比深墨褐粗體字（告別白字模糊！）
  ctx.fillStyle = '#240E08';
  ctx.font = '900 30px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 196, 49);

  const tex = makeCanvasTexture(canvas, true, false);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    toneMapped: false
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.35, 0.66, 1);
  sprite.renderOrder = 20;
  return sprite;
}

/**
 * 新廟建築專屬紋理（依 安定區港口里 玉勅代天府德慈宮 實景設計圖程式化繪製）
 * 1. 閩南豔紅琉璃屋瓦紋理
 */
export function createCrimsonRoofTileTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#C91D29';
  ctx.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 28) {
    const grad = ctx.createLinearGradient(x, 0, x + 28, 0);
    grad.addColorStop(0, '#96111B');
    grad.addColorStop(0.45, '#E3343E');
    grad.addColorStop(1, '#850E17');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, 26, 512);
  }
  ctx.strokeStyle = 'rgba(70, 8, 12, 0.30)';
  ctx.lineWidth = 3;
  for (let y = 0; y < 512; y += 44) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }
  const tex = makeCanvasTexture(canvas, true, false);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 2);
  return tex;
}

/**
 * 2. 傳統閩南紅磚牆紋理（新廟左右側殿牆面）
 */
export function createRedBrickWallTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 淺灰白灰縫底色
  ctx.fillStyle = '#C7BCB0';
  ctx.fillRect(0, 0, 512, 512);

  const brickW = 64;
  const brickH = 26;
  const tones = ['#8D3A2B', '#9E4433', '#7D3124', '#A64B38', '#863628'];

  for (let row = 0; row < Math.ceil(512 / brickH); row++) {
    const offset = (row % 2) * (brickW / 2);
    for (let col = -1; col <= Math.ceil(512 / brickW); col++) {
      const bx = col * brickW + offset;
      const by = row * brickH;
      const tone = tones[(row * 7 + col * 13 + 99) % tones.length];
      ctx.fillStyle = tone;
      ctx.fillRect(bx + 2, by + 2, brickW - 4, brickH - 4);
      // 微量窯變光澤
      ctx.fillStyle = 'rgba(255, 220, 190, 0.08)';
      ctx.fillRect(bx + 3, by + 3, brickW - 6, 5);
    }
  }
  const tex = makeCanvasTexture(canvas, true, false);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  return tex;
}

/**
 * 3. 淺灰水泥三川門牆面紋理 ＋ 真正「透空雕刻花窗」（alpha 鏤空可看見殿內！）
 */
export function createBluestoneCarvingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 明亮清爽的建築清水水泥灰底色（不再偏黑！）
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#D4D7DA');
  grad.addColorStop(0.5, '#C5C9CE');
  grad.addColorStop(1, '#B3B8BE');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // 細緻水泥石材微粒質感
  for (let i = 0; i < 420; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(90,96,102,0.08)';
    ctx.fillRect((i * 73) % 508, (i * 131) % 508, 4, 4);
  }

  // 淺石雕外框線與回紋凹槽
  ctx.strokeStyle = '#E6E9EC';
  ctx.lineWidth = 10;
  ctx.strokeRect(18, 18, 476, 476);
  ctx.strokeStyle = '#8F969E';
  ctx.lineWidth = 4;
  ctx.strokeRect(32, 32, 448, 448);

  // 下方水泥石雕腰堵線條
  ctx.fillStyle = '#BDC2C7';
  ctx.fillRect(58, 362, 396, 102);
  ctx.strokeStyle = '#E8EBEE';
  ctx.lineWidth = 5;
  ctx.strokeRect(58, 362, 396, 102);
  ctx.strokeStyle = '#8B929A';
  ctx.lineWidth = 3;
  ctx.strokeRect(72, 376, 368, 74);

  // ★ 中央「真正透空」八角吉祥石雕圓窗（使用 destination-out 挖空窗孔，能直接透視殿內！）
  const cx = 256;
  const cy = 205;
  const outerR = 122;

  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cx, cy, outerR - 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 重新繪製透空窗內的立體淺灰水泥花窗石格（留出大量真正透明窗孔！）
  ctx.strokeStyle = '#8D959D';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#E6EAEE';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR - 2, 0, Math.PI * 2);
  ctx.stroke();

  // 八道透空雕花窗欞與海棠花瓣圈
  ctx.strokeStyle = '#CDD2D7';
  ctx.lineWidth = 10;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26);
    ctx.lineTo(cx + Math.cos(a) * (outerR - 6), cy + Math.sin(a) * (outerR - 6));
    ctx.stroke();
  }
  // 兩圈同心透空圓格
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, 74, 0, Math.PI * 2);
  ctx.stroke();
  // 中央花心圓雕
  ctx.fillStyle = '#D6DBE0';
  ctx.beginPath();
  ctx.arc(cx, cy, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8A929B';
  ctx.lineWidth = 4;
  ctx.stroke();

  return makeCanvasTexture(canvas);
}


/**
 * 4. 寶藍剪黏交趾陶屋脊紋理（新廟藍綠雲龍燕尾屋脊）
 */
export function createBlueRidgeOrnamentTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, '#4CA0DC');
  g.addColorStop(0.45, '#1F5FA6');
  g.addColorStop(1, '#143D6E');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 128);

  // 上下白瓷金邊線
  ctx.fillStyle = '#E8F4FA';
  ctx.fillRect(0, 8, 512, 12);
  ctx.fillRect(0, 108, 512, 12);

  // 交趾陶波浪捲草彩繪
  for (let x = 24; x < 512; x += 64) {
    ctx.strokeStyle = '#8AD4F8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, 64, 22, 0, Math.PI * 1.5);
    ctx.stroke();
    ctx.fillStyle = '#F5C856';
    ctx.beginPath();
    ctx.arc(x + 28, 64, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = makeCanvasTexture(canvas, true, false);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(4, 1);
  return tex;
}

/**
 * 5. 水車堵藍紅金彩繪簷帶紋理（新廟屋簷下方裝飾帶）
 */
export function createFriezeBandTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#F2EBE0';
  ctx.fillRect(0, 0, 512, 96);

  const panels = ['#1F5FA6', '#C92A2A', '#2B7A78', '#D97706'];
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = panels[i % panels.length];
    ctx.fillRect(i * 64 + 4, 14, 56, 68);
    ctx.strokeStyle = '#FAD364';
    ctx.lineWidth = 3;
    ctx.strokeRect(i * 64 + 8, 18, 48, 60);
  }
  const tex = makeCanvasTexture(canvas, true, false);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(4, 1);
  return tex;
}

/**
 * 6. 透明透光傳統木框古格窗紋理（半透明玻璃可透視室內外光影！）
 */
export function createTempleWindowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 256, 192);

  // 半透明清透玻璃（保留柔光折射斜紋，能透見殿內暖光與室外天光！）
  const glassG = ctx.createLinearGradient(0, 0, 256, 192);
  glassG.addColorStop(0, 'rgba(225, 245, 255, 0.34)');
  glassG.addColorStop(0.5, 'rgba(255, 250, 232, 0.16)');
  glassG.addColorStop(1, 'rgba(195, 228, 244, 0.30)');
  ctx.fillStyle = glassG;
  ctx.fillRect(16, 16, 224, 160);

  // 玻璃斜向高光帶
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.beginPath();
  ctx.moveTo(46, 16); ctx.lineTo(84, 16); ctx.lineTo(36, 176); ctx.lineTo(16, 176);
  ctx.closePath();
  ctx.fill();

  // 精緻白漆木雕外窗框
  ctx.strokeStyle = '#F2EFE6';
  ctx.lineWidth = 22;
  ctx.strokeRect(11, 11, 234, 170);
  ctx.strokeStyle = '#B8B0A0';
  ctx.lineWidth = 3;
  ctx.strokeRect(22, 22, 212, 148);

  // 傳統十字與回紋木窗欞
  ctx.strokeStyle = '#ECE7DC';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(128, 18); ctx.lineTo(128, 174);
  ctx.moveTo(18, 96); ctx.lineTo(238, 96);
  ctx.stroke();

  ctx.strokeStyle = '#DDD6C6';
  ctx.lineWidth = 4;
  ctx.strokeRect(38, 36, 74, 46);
  ctx.strokeRect(144, 36, 74, 46);
  ctx.strokeRect(38, 110, 74, 46);
  ctx.strokeRect(144, 110, 74, 46);

  return makeCanvasTexture(canvas);
}


/**
 * 7. 淺灰水泥「透空」圓形雕花窗紋理（側牆圓窗，中間透空透光！）
 */
export function createRoundStoneMedallionTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 256, 256);

  // 半透明柔暖透空底色（呈現真實透氣光感）
  const g = ctx.createRadialGradient(128, 128, 12, 128, 128, 114);
  g.addColorStop(0, 'rgba(255, 245, 220, 0.22)');
  g.addColorStop(1, 'rgba(60, 48, 38, 0.36)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(128, 128, 114, 0, Math.PI * 2);
  ctx.fill();

  // 水泥灰雕花外圈
  ctx.strokeStyle = '#D6DBE0';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(128, 128, 114, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#8B929A';
  ctx.lineWidth = 4;
  ctx.stroke();

  // 透空雕花六瓣與八輻窗格
  ctx.strokeStyle = '#CBD1D7';
  ctx.lineWidth = 8;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(a) * 22, 128 + Math.sin(a) * 22);
    ctx.lineTo(128 + Math.cos(a) * 108, 128 + Math.sin(a) * 108);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(128 + Math.cos(a) * 62, 128 + Math.sin(a) * 62, 24, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#DFE4E8';
  ctx.beginPath();
  ctx.arc(128, 128, 22, 0, Math.PI * 2);
  ctx.fill();

  return makeCanvasTexture(canvas);
}


/**
/**
 * 8. ★ V27 博物館級「宣紙水墨淡彩青綠山水・慈悲白衣觀音聯畫」(1024×1280)
 *    仿宋元水墨意境：溫潤古宣紙留白、層疊潑墨遠山雲霧、水墨松竹飛瀑、淡金圓光、
 *    白描細筆慈悲白衣觀音持楊枝淨瓶、雅致水墨蓮池！
 */
export function createSanctuaryGuanyinMuralTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1280;
  const ctx = canvas.getContext('2d');

  // 1. 溫潤復古懷舊米黃古宣紙底色（備用底圖與實景壁畫同色系！）
  const paper = ctx.createLinearGradient(0, 0, 0, 1280);
  paper.addColorStop(0, '#DFCFAF');
  paper.addColorStop(0.35, '#D7C4A0');
  paper.addColorStop(0.70, '#CDBB97');
  paper.addColorStop(1, '#BFA985');
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, 1024, 1280);

  // 宣紙微細纖維紋理與淡墨暈染氣氛
  ctx.fillStyle = 'rgba(148, 134, 104, 0.045)';
  for (let i = 0; i < 900; i++) {
    const px = (i * 197 + (i % 19) * 31) % 1024;
    const py = (i * 251 + (i % 23) * 29) % 1280;
    ctx.fillRect(px, py, (i % 5) + 2, 1.5);
  }
  const inkAtmosphere = ctx.createRadialGradient(512, 340, 120, 512, 540, 680);
  inkAtmosphere.addColorStop(0, 'rgba(255, 251, 236, 0.55)');
  inkAtmosphere.addColorStop(0.65, 'rgba(176, 194, 188, 0.14)');
  inkAtmosphere.addColorStop(1, 'rgba(62, 82, 84, 0.24)');
  ctx.fillStyle = inkAtmosphere;
  ctx.fillRect(0, 0, 1024, 1280);

  // 2. 層疊水墨潑墨遠山（濕畫法暈染＋淡青黛石綠＋山腰飄渺留白雲海！）
  const drawInkWashRange = (pts, topCol, midCol, mistY, strokeCol) => {
    const g = ctx.createLinearGradient(0, Math.min(...pts.map(p => p[1])), 0, mistY);
    g.addColorStop(0, topCol);
    g.addColorStop(0.55, midCol);
    g.addColorStop(1, 'rgba(235, 234, 222, 0.0)');

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, mistY);
    pts.forEach(([x, y], i) => {
      if (i === 0) ctx.lineTo(x, y);
      else {
        const [px, py] = pts[i - 1];
        const mx = (px + x) / 2;
        const my = (py + y) / 2;
        ctx.quadraticCurveTo(px + (x - px) * 0.35, py - 14, mx, my);
        ctx.quadraticCurveTo(px + (x - px) * 0.7, y - 10, x, y);
      }
    });
    ctx.lineTo(1024, mistY);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();

    // 柔和皴法山脊墨痕（淡墨披麻皴，絕不生硬！）
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else {
        const [px, py] = pts[i - 1];
        ctx.quadraticCurveTo((px + x) / 2, Math.min(py, y) - 10, x, y);
      }
    });
    ctx.stroke();

    // 淡墨皴擦肌理線條
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = 1.2;
    pts.forEach(([x, y], i) => {
      if (i === 0 || i === pts.length - 1) return;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(x - 18 + k * 14, y + 18 + k * 8);
        ctx.quadraticCurveTo(x - 32 + k * 16, y + 65 + k * 12, x - 48 + k * 18, y + 110 + k * 14);
        ctx.stroke();
      }
    });
    ctx.restore();
  };

  // 四層遠近水墨山巒（遠淡近濃，營造深遠空間感）
  drawInkWashRange(
    [[0, 495], [115, 340], [250, 435], [375, 375], [645, 385], [780, 430], [905, 325], [1024, 465]],
    'rgba(128, 152, 154, 0.48)', 'rgba(154, 178, 174, 0.28)', 720, 'rgba(92, 114, 118, 0.25)'
  );
  drawInkWashRange(
    [[0, 595], [130, 445], [275, 565], [405, 535], [620, 540], [770, 560], [895, 435], [1024, 580]],
    'rgba(78, 112, 112, 0.64)', 'rgba(112, 146, 138, 0.34)', 830, 'rgba(54, 80, 82, 0.36)'
  );
  drawInkWashRange(
    [[0, 740], [160, 585], [325, 725], [710, 720], [865, 575], [1024, 725]],
    'rgba(48, 78, 76, 0.78)', 'rgba(74, 108, 98, 0.42)', 980, 'rgba(34, 56, 56, 0.48)'
  );

  // 左右幽谷水墨飛瀑（留白細水絲＋底部雲氣暈染）
  [[158, 595, 225], [862, 588, 232]].forEach(([wx, wy, wh]) => {
    const wf = ctx.createLinearGradient(wx, wy, wx, wy + wh);
    wf.addColorStop(0, 'rgba(250, 248, 240, 0.76)');
    wf.addColorStop(0.65, 'rgba(240, 246, 244, 0.48)');
    wf.addColorStop(1, 'rgba(240, 246, 244, 0)');
    ctx.fillStyle = wf;
    ctx.fillRect(wx - 11, wy, 22, wh);
    ctx.strokeStyle = 'rgba(255, 254, 248, 0.78)';
    ctx.lineWidth = 1.4;
    for (let s = -6; s <= 6; s += 4) {
      ctx.beginPath();
      ctx.moveTo(wx + s, wy);
      ctx.quadraticCurveTo(wx + s + 2, wy + wh * 0.45, wx + s - 1, wy + wh * 0.85);
      ctx.stroke();
    }
    const mist = ctx.createRadialGradient(wx, wy + wh - 15, 8, wx, wy + wh - 15, 76);
    mist.addColorStop(0, 'rgba(248, 246, 238, 0.72)');
    mist.addColorStop(1, 'rgba(248, 246, 238, 0)');
    ctx.fillStyle = mist;
    ctx.beginPath(); ctx.arc(wx, wy + wh - 15, 76, 0, Math.PI * 2); ctx.fill();
  });

  // 遠山孤松與雅致水墨小亭（點景留韻）
  const drawInkPine = (px, py, scale = 1) => {
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(scale, scale);
    ctx.strokeStyle = 'rgba(42, 56, 52, 0.78)';
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 46); ctx.quadraticCurveTo(-8, 20, 4, -4);
    ctx.moveTo(0, 14); ctx.quadraticCurveTo(-24, 6, -42, 12);
    ctx.moveTo(2, 4); ctx.quadraticCurveTo(22, -4, 38, 2);
    ctx.stroke();
    [[-34, 6, 26, 9], [28, -2, 24, 8], [2, -12, 30, 10], [-14, -4, 22, 8]].forEach(([nx, ny, rx, ry]) => {
      ctx.fillStyle = 'rgba(42, 68, 58, 0.62)';
      ctx.beginPath(); ctx.ellipse(nx, ny, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  };
  drawInkPine(96, 610, 1.05);
  drawInkPine(924, 590, 0.95);

  // 山腰飄渺雲霧帶（溫柔水墨留白過渡，凸顯前景觀音！）
  for (let i = 0; i < 8; i++) {
    const mx = 60 + i * 130;
    const my = 560 + (i % 3) * 44;
    const cg = ctx.createRadialGradient(mx, my, 12, mx, my, 145);
    cg.addColorStop(0, 'rgba(248, 245, 235, 0.62)');
    cg.addColorStop(0.55, 'rgba(245, 242, 232, 0.28)');
    cg.addColorStop(1, 'rgba(245, 242, 232, 0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.ellipse(mx, my, 150, 42, 0, 0, Math.PI * 2); ctx.fill();
  }

  // 3. 左右水墨寫意翠竹（濃淡墨分層、提按自然竹葉！）
  const drawInkBamboo = (isLeft) => {
    ctx.save();
    if (!isLeft) { ctx.translate(1024, 0); ctx.scale(-1, 1); }
    ctx.lineCap = 'round';
    // 淡墨遠竹
    ctx.strokeStyle = 'rgba(66, 98, 84, 0.36)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(32, -8); ctx.quadraticCurveTo(155, 65, 285, 165);
    ctx.stroke();
    // 濃墨近竹
    ctx.strokeStyle = 'rgba(34, 62, 50, 0.72)';
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(-8, 42); ctx.quadraticCurveTo(132, 92, 255, 195);
    ctx.moveTo(58, -6); ctx.quadraticCurveTo(175, 42, 315, 92);
    ctx.stroke();

    for (let i = 0; i < 24; i++) {
      const lx = 14 + (i * 23) % 305;
      const ly = 16 + (i * 15) % 185;
      const len = 36 + (i % 4) * 10;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(0.45 + (i % 5) * 0.22);
      ctx.fillStyle = i % 3 === 0
        ? 'rgba(28, 58, 44, 0.74)'
        : i % 3 === 1
          ? 'rgba(54, 92, 72, 0.56)'
          : 'rgba(92, 128, 108, 0.38)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(6.5, len * 0.36, 0, len);
      ctx.quadraticCurveTo(-6.5, len * 0.36, 0, 0);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };
  drawInkBamboo(true);
  drawInkBamboo(false);

  // 4. 淡金水墨聖潔大圓光（柔和暈染金輝，不刺眼、充滿禪韻！）
  const cx = 512;
  const cy = 296;
  const haloGlow = ctx.createRadialGradient(cx, cy, 24, cx, cy, 215);
  haloGlow.addColorStop(0, 'rgba(255, 252, 236, 0.94)');
  haloGlow.addColorStop(0.46, 'rgba(248, 224, 152, 0.54)');
  haloGlow.addColorStop(0.76, 'rgba(218, 178, 92, 0.22)');
  haloGlow.addColorStop(1, 'rgba(218, 178, 92, 0)');
  ctx.fillStyle = haloGlow;
  ctx.beginPath(); ctx.arc(cx, cy, 215, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = 'rgba(182, 138, 56, 0.58)';
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.arc(cx, cy, 152, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(224, 188, 102, 0.42)';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(cx, cy, 140, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    ctx.strokeStyle = 'rgba(205, 166, 84, 0.24)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 114, cy + Math.sin(a) * 114);
    ctx.lineTo(cx + Math.cos(a) * 150, cy + Math.sin(a) * 150);
    ctx.stroke();
  }

  // 5. 白描工筆水墨「慈悲白衣觀音大士」（柔和淡墨線條、流暢素絹披帛與端莊法相！）
  // 素白飄逸頭紗披巾
  const veilG = ctx.createLinearGradient(390, 170, 634, 420);
  veilG.addColorStop(0, '#FDFBF4');
  veilG.addColorStop(0.55, '#F2ECE0');
  veilG.addColorStop(1, '#DCD4C2');
  ctx.fillStyle = veilG;
  ctx.beginPath();
  ctx.moveTo(378, 412);
  ctx.bezierCurveTo(395, 224, 444, 176, 512, 172);
  ctx.bezierCurveTo(580, 176, 629, 224, 646, 412);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(84, 72, 58, 0.58)';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // 雅致墨髮高髻與淡金化佛寶冠
  ctx.fillStyle = '#36322F';
  ctx.beginPath();
  ctx.ellipse(512, 212, 34, 24, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#D9B15A';
  ctx.beginPath();
  ctx.moveTo(494, 206); ctx.quadraticCurveTo(512, 172, 530, 206); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(138, 98, 34, 0.72)'; ctx.lineWidth = 1.6; ctx.stroke();

  // 圓潤慈悲聖容（柔和渲染、無生硬邊框）
  const faceG = ctx.createRadialGradient(504, 256, 6, 512, 268, 56);
  faceG.addColorStop(0, '#FFF7EA');
  faceG.addColorStop(0.74, '#F1DCC2');
  faceG.addColorStop(1, '#DFC19E');
  ctx.fillStyle = faceG;
  ctx.beginPath(); ctx.ellipse(512, 268, 43, 54, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(128, 96, 68, 0.45)'; ctx.lineWidth = 1.5; ctx.stroke();

  // 兩側福耳與細膩工筆五官（慈目低垂、微含笑意）
  [-1, 1].forEach((s) => {
    ctx.fillStyle = '#EBD2B4';
    ctx.beginPath(); ctx.ellipse(512 + s * 44, 278, 7, 18, s * 0.08, 0, Math.PI * 2); ctx.fill();
    // 柳葉細眉
    ctx.strokeStyle = 'rgba(66, 48, 36, 0.76)'; ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(512 + s * 8, 254);
    ctx.quadraticCurveTo(512 + s * 20, 247, 512 + s * 32, 255);
    ctx.stroke();
    // 慈悲微闔鳳目
    ctx.strokeStyle = 'rgba(54, 38, 28, 0.82)'; ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(512 + s * 20, 264, 9.5, 0.12, Math.PI - 0.12);
    ctx.stroke();
  });
  // 眉心朱砂白毫、秀氣鼻線、柔潤櫻唇
  ctx.fillStyle = '#C93832';
  ctx.beginPath(); ctx.arc(512, 244, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(136, 100, 74, 0.48)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(512, 258); ctx.lineTo(510, 279); ctx.quadraticCurveTo(512, 283, 515, 280); ctx.stroke();
  ctx.fillStyle = '#C8524A';
  ctx.beginPath();
  ctx.moveTo(502, 296); ctx.quadraticCurveTo(512, 291, 522, 296);
  ctx.quadraticCurveTo(512, 303, 502, 296); ctx.fill();

  // 盤坐水墨白衣法袍（流雲行水白描衣紋＋淡青金飾瓔珞）
  const robeG = ctx.createLinearGradient(306, 336, 718, 695);
  robeG.addColorStop(0, '#FBF9F2');
  robeG.addColorStop(0.5, '#EDE7D8');
  robeG.addColorStop(1, '#D3CBB8');
  ctx.fillStyle = robeG;
  ctx.beginPath();
  ctx.moveTo(296, 685);
  ctx.bezierCurveTo(334, 510, 396, 378, 466, 334);
  ctx.lineTo(558, 334);
  ctx.bezierCurveTo(628, 378, 690, 510, 728, 685);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(78, 68, 56, 0.56)'; ctx.lineWidth = 2.4; ctx.stroke();

  // 流暢工筆行雲衣褶線條
  ctx.strokeStyle = 'rgba(92, 82, 68, 0.42)'; ctx.lineWidth = 1.8;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(512, 355 + i * 50, 78 + i * 26, 0.34, Math.PI - 0.34);
    ctx.stroke();
  }
  // 淡金頸飾瓔珞
  ctx.strokeStyle = 'rgba(204, 158, 62, 0.78)'; ctx.lineWidth = 3.2;
  ctx.beginPath(); ctx.arc(512, 338, 46, 0.28, Math.PI - 0.28); ctx.stroke();

  // 淡青汝窯玉淨瓶與水墨楊柳枝
  const vaseG = ctx.createRadialGradient(420, 532, 4, 424, 540, 28);
  vaseG.addColorStop(0, '#D4ECE5');
  vaseG.addColorStop(1, '#7DB3A6');
  ctx.fillStyle = vaseG;
  ctx.strokeStyle = 'rgba(54, 96, 88, 0.65)'; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.ellipse(424, 542, 18, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillRect(418, 498, 12, 18);
  ctx.strokeStyle = 'rgba(56, 102, 70, 0.76)'; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(424, 498); ctx.quadraticCurveTo(398, 446, 366, 474); ctx.stroke();
  for (let w = 0; w < 6; w++) {
    ctx.fillStyle = 'rgba(66, 118, 82, 0.65)';
    ctx.beginPath();
    ctx.ellipse(394 - w * 6, 468 + (w % 2) * 14, 10, 3.2, 0.65, 0, Math.PI * 2);
    ctx.fill();
  }

  // 水墨淡彩粉白重瓣蓮花座
  for (let layer = 0; layer < 2; layer++) {
    const count = layer === 0 ? 9 : 7;
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * (layer === 0 ? 46 : 38);
      const pg = ctx.createLinearGradient(512 + offset, 660, 512 + offset, 718);
      pg.addColorStop(0, layer === 0 ? 'rgba(246, 204, 212, 0.92)' : 'rgba(254, 240, 242, 0.96)');
      pg.addColorStop(1, 'rgba(218, 148, 162, 0.85)');
      ctx.fillStyle = pg;
      ctx.strokeStyle = 'rgba(154, 88, 102, 0.48)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(512 + offset, 690 + layer * 13 - Math.abs(offset) * 0.03, 34, 20, offset * 0.0018, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
  }

  // 6. 水墨清池荷葉、淡粉荷花與留白水波紋
  ctx.strokeStyle = 'rgba(116, 144, 138, 0.22)'; ctx.lineWidth = 1.6;
  for (let r = 0; r < 6; r++) {
    ctx.beginPath(); ctx.ellipse(512, 920 + r * 58, 430 - r * 24, 16, 0, 0, Math.PI * 2); ctx.stroke();
  }
  for (let i = 0; i < 7; i++) {
    const lx = 115 + i * 132;
    const ly = 968 + (i % 2) * 56;
    const leafG = ctx.createRadialGradient(lx - 12, ly - 4, 6, lx, ly, 62);
    leafG.addColorStop(0, 'rgba(84, 126, 104, 0.72)');
    leafG.addColorStop(1, 'rgba(42, 76, 62, 0.62)');
    ctx.fillStyle = leafG;
    ctx.strokeStyle = 'rgba(46, 78, 64, 0.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(lx, ly, 58, 19, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (i % 2 === 1) {
      ctx.fillStyle = 'rgba(244, 196, 206, 0.88)';
      ctx.strokeStyle = 'rgba(164, 96, 112, 0.5)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(lx, ly - 15, 16, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }

  // 右上角雅致朱紅古畫落款印章「德慈慈航」
  ctx.fillStyle = 'rgba(176, 44, 38, 0.72)';
  ctx.fillRect(884, 118, 44, 116);
  ctx.strokeStyle = 'rgba(248, 240, 224, 0.75)';
  ctx.lineWidth = 2;
  ctx.strokeRect(888, 122, 36, 108);
  ctx.fillStyle = '#F7EFE0';
  ctx.font = '700 22px "DFKai-SB", "Noto Serif TC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ['德', '慈', '慈', '航'].forEach((ch, idx) => ctx.fillText(ch, 906, 138 + idx * 25));

  return makeCanvasTexture(canvas);
}


/**
 * 9. ★ 需求 #5：上寬下窄五邊形「玉勅・代天・西港慶安宮」明黃龍紋緞面令旗（完美比例、零破圖！）
 */
export function createImperialBannerTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 512, 1024);

  // ★ 上寬下窄五邊形輪廓（頂尖 256 → 上肩寬 26..486 → 往下收窄至 108..404！）
  const traceBannerPath = (inset = 0) => {
    const topY = 18 + inset * 1.3;
    const shY = 166 + inset * 0.65;
    const botY = 935 - inset;
    const topL = 26 + inset;
    const topR = 486 - inset;
    const botL = 108 + inset * 0.85;
    const botR = 404 - inset * 0.85;
    ctx.beginPath();
    ctx.moveTo(256, topY);
    ctx.lineTo(topR, shY);
    ctx.lineTo(botR, botY);
    ctx.lineTo(botL, botY);
    ctx.lineTo(topL, shY);
    ctx.closePath();
  };

  // 明黃緞面絲綢漸層
  traceBannerPath(0);
  const silk = ctx.createLinearGradient(26, 0, 486, 935);
  silk.addColorStop(0, '#FCE67C');
  silk.addColorStop(0.32, '#F5C736');
  silk.addColorStop(0.70, '#E0A416');
  silk.addColorStop(1, '#C4840A');
  ctx.fillStyle = silk;
  ctx.fill();

  ctx.save();
  traceBannerPath(10);
  ctx.clip();

  // 絲綢自然垂墜反光柔褶
  const sheen = ctx.createLinearGradient(0, 0, 512, 0);
  sheen.addColorStop(0, 'rgba(130, 70, 5, 0.18)');
  sheen.addColorStop(0.30, 'rgba(255, 252, 224, 0.28)');
  sheen.addColorStop(0.55, 'rgba(160, 95, 10, 0.08)');
  sheen.addColorStop(0.78, 'rgba(255, 248, 200, 0.22)');
  sheen.addColorStop(1, 'rgba(120, 65, 5, 0.22)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, 512, 950);

  // 暗金捲雲祥龍緞紋
  ctx.strokeStyle = 'rgba(255, 246, 192, 0.36)';
  ctx.lineWidth = 3;
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 5; col++) {
      ctx.beginPath();
      ctx.arc(68 + col * 92 + (row % 2) * 42, 155 + row * 78, 22, 0, Math.PI * 1.5);
      ctx.stroke();
    }
  }
  ctx.restore();

  // 雙層紅金鑲邊
  traceBannerPath(4);
  ctx.strokeStyle = '#991B1B';
  ctx.lineWidth = 9;
  ctx.stroke();

  traceBannerPath(16);
  ctx.strokeStyle = '#FFF0A0';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  const drawCalligraphy = (ch, x, y, size) => {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${size}px "DFKai-SB", "BiauKai", "Noto Serif TC", serif`;
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = 'rgba(255, 245, 190, 0.65)';
    ctx.strokeText(ch, x, y);
    ctx.fillStyle = '#8F1313';
    ctx.fillText(ch, x, y);
  };

  // 上寬區：玉、勅（由右至左）
  drawCalligraphy('玉', 332, 232, 82);
  drawCalligraphy('勅', 180, 236, 82);

  // 中央：代、天、巡、狩（順應下方漸窄微調字級）
  drawCalligraphy('代', 256, 380, 108);
  drawCalligraphy('天', 256, 520, 108);
  drawCalligraphy('巡', 256, 656, 86);
  drawCalligraphy('狩', 256, 778, 86);

  // 右側落款：西港慶安宮（貼著收窄右邊斜排）
  ['西', '港', '慶', '安', '宮'].forEach((ch, idx) => {
    drawCalligraphy(ch, 405 - idx * 8, 365 + idx * 60, 34);
  });

  // 底部收窄處垂墜金絲流蘇（108..404）
  for (let x = 118; x <= 394; x += 22) {
    ctx.fillStyle = '#B91C1C';
    ctx.beginPath(); ctx.arc(x, 942, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F5C442';
    ctx.fillRect(x - 4, 946, 8, 62);
  }

  return makeCanvasTexture(canvas);
}


/**
 * 10. ★ 需求 #1：精雕樟木「開面神像臉部木雕紋理」（1024×1024：明顯木雕鑿面光影、深邃眼窩眉骨、高挺鼻樑與鼻翼、人中法令紋、朱唇與溫潤漆光！）
 */
export function createDeityFaceTexture(variant = 'leftMother') {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  const isMother = variant === 'leftMother';
  const isCenter = variant === 'centerKing';
  const isRightKing = variant === 'rightBeardKing';
  // ★ V55 左尊回歸真實溫潤古樟木雕本色 (#C08B61→#A4714A→#8C5D3B，絕不發白！) 並保留細膩溫潤木紋與柔和不發黑陰影！
  const baseA = isMother ? '#C08B61' : isCenter ? '#785A48' : '#584E54';
  const baseB = isMother ? '#A4714A' : isCenter ? '#46342B' : '#363036';
  const baseEdge = isRightKing ? '#1A171E' : isCenter ? '#201713' : '#8C5D3B';

  const g = ctx.createRadialGradient(512, 468, 70, 512, 512, 512);
  g.addColorStop(0, baseA);
  g.addColorStop(0.64, baseB);
  g.addColorStop(1, baseEdge);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 1024);

  // ★ V55 真實古樟木細膩縱向年輪木紋（讓左尊清晰呈現溫潤手雕木頭質感與古木包漿，不再像白瓷！）
  for (let x = 0; x < 1024; x += 4) {
    ctx.strokeStyle = isRightKing
      ? (x % 8 === 0 ? 'rgba(185, 176, 192, 0.05)' : 'rgba(8, 6, 10, 0.11)')
      : isCenter
        ? (x % 8 === 0 ? 'rgba(155, 126, 106, 0.045)' : 'rgba(8, 5, 4, 0.085)')
        : (x % 8 === 0 ? 'rgba(226, 176, 130, 0.11)' : 'rgba(78, 42, 18, 0.095)');
    ctx.lineWidth = isMother ? 1.6 : 1.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + Math.sin(x * 0.03) * 11, 340, x - Math.cos(x * 0.025) * 11, 680, x, 1024);
    ctx.stroke();
  }

  // ★ V55 溫潤古木包漿受光骨相（以暖琥珀木色柔光補亮，完全不發白、不發黑！）
  const drawCarvedHighlight = (cx, cy, rx, ry, alpha = 0.24) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    const hg = ctx.createRadialGradient(0, 0, 10, 0, 0, rx);
    if (isRightKing) {
      hg.addColorStop(0, `rgba(195, 186, 198, ${alpha * 0.56})`);
      hg.addColorStop(0.55, `rgba(128, 120, 134, ${alpha * 0.30})`);
      hg.addColorStop(1, 'rgba(55, 50, 58, 0)');
    } else if (isCenter) {
      hg.addColorStop(0, `rgba(154, 118, 96, ${alpha * 0.48})`);
      hg.addColorStop(0.55, `rgba(104, 78, 64, ${alpha * 0.24})`);
      hg.addColorStop(1, 'rgba(55, 40, 32, 0)');
    } else {
      // 左尊古樟木自然溫潤包漿反光（暖蜜木色而非死白！）
      hg.addColorStop(0, `rgba(224, 174, 130, ${alpha * 0.52})`);
      hg.addColorStop(0.55, `rgba(196, 144, 102, ${alpha * 0.28})`);
      hg.addColorStop(1, 'rgba(164, 114, 74, 0)');
    }
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  drawCarvedHighlight(512, 384, isMother ? 110 : 94, isMother ? 62 : 52, isMother ? 0.40 : isCenter ? 0.30 : 0.44);
  drawCarvedHighlight(416, 560, isMother ? 86 : isCenter ? 58 : 46, isMother ? 68 : isCenter ? 44 : 32, isMother ? 0.44 : isCenter ? 0.36 : 0.42);
  drawCarvedHighlight(608, 560, isMother ? 86 : isCenter ? 58 : 46, isMother ? 68 : isCenter ? 44 : 32, isMother ? 0.44 : isCenter ? 0.36 : 0.42);
  drawCarvedHighlight(512, 708, isMother ? 82 : isCenter ? 58 : 42, isMother ? 54 : isCenter ? 38 : 26, isMother ? 0.42 : isCenter ? 0.36 : 0.34);

  if (isMother) {
    // ★ V55 左尊左側臉頰微幅暖木色補光（只消除左臉發黑陰影，維持一致古樟木色澤絕不偏白！）
    drawCarvedHighlight(348, 540, 108, 86, 0.36);
    drawCarvedHighlight(372, 622, 84, 62, 0.36);
    drawCarvedHighlight(652, 622, 76, 58, 0.30);
    drawCarvedHighlight(512, 752, 84, 42, 0.32);
  }

  // 深邃木雕眼窩凹槽陰影（精準對齊眉弓下緣與眼瞼！）
  [-1, 1].forEach((s) => {
    const sx = 512 + s * 62;
    const sock = ctx.createRadialGradient(sx, 506, 12, sx, 506, 48);
    sock.addColorStop(0, isRightKing ? 'rgba(12, 9, 14, 0.48)' : isCenter ? 'rgba(16, 10, 8, 0.50)' : 'rgba(58, 28, 16, 0.16)');
    sock.addColorStop(0.65, isRightKing ? 'rgba(18, 14, 20, 0.22)' : isCenter ? 'rgba(22, 14, 10, 0.24)' : 'rgba(72, 38, 22, 0.08)');
    sock.addColorStop(1, 'rgba(32, 16, 10, 0)');
    ctx.fillStyle = sock;
    ctx.beginPath(); ctx.arc(sx, 506, 48, 0, Math.PI * 2); ctx.fill();

    // ★ V48 柔和木雕眉骨受光（中尊配合深木雕原色，不以過亮米白色線突兀框邊！）
    ctx.strokeStyle = isRightKing
      ? 'rgba(176, 166, 182, 0.36)'
      : isCenter
        ? 'rgba(134, 100, 80, 0.22)'
        : 'rgba(255, 236, 208, 0.42)';
    ctx.lineWidth = isCenter ? 5.5 : 6;
    ctx.beginPath();
    if (isCenter) {
      ctx.moveTo(512 + s * 16, 476);
      ctx.quadraticCurveTo(512 + s * 62, 458, 512 + s * 110, 448);
    } else if (isMother) {
      ctx.moveTo(512 + s * 20, 470);
      ctx.quadraticCurveTo(512 + s * 64, 448, 512 + s * 108, 462);
    } else {
      ctx.moveTo(512 + s * 20, 472);
      ctx.quadraticCurveTo(512 + s * 62, 452, 512 + s * 108, 444);
    }
    ctx.stroke();

    // 臉頰紅潤容光煥發神采（左尊明亮紅潤好氣色；中尊自然木雕飽滿雙頰！）
    if (isMother) {
      const blush = ctx.createRadialGradient(512 + s * 84, 570, 12, 512 + s * 84, 570, 78);
      blush.addColorStop(0, 'rgba(246, 142, 114, 0.40)');
      blush.addColorStop(0.55, 'rgba(242, 162, 132, 0.18)');
      blush.addColorStop(1, 'rgba(242, 162, 132, 0)');
      ctx.fillStyle = blush;
      ctx.beginPath(); ctx.arc(512 + s * 84, 570, 78, 0, Math.PI * 2); ctx.fill();
    } else if (isCenter) {
      const fullCheek = ctx.createRadialGradient(512 + s * 98, 594, 8, 512 + s * 98, 594, 52);
      fullCheek.addColorStop(0, 'rgba(138, 106, 88, 0.22)');
      fullCheek.addColorStop(0.60, 'rgba(92, 68, 56, 0.10)');
      fullCheek.addColorStop(1, 'rgba(60, 42, 34, 0)');
      ctx.fillStyle = fullCheek;
      ctx.beginPath(); ctx.arc(512 + s * 98, 594, 52, 0, Math.PI * 2); ctx.fill();
    }

    // 木雕法令紋（右尊威嚴長者；左尊極淡柔和慈紋不顯暗；中尊無法令紋！）
    if (!isCenter) {
      ctx.strokeStyle = isMother ? 'rgba(92, 46, 28, 0.11)' : 'rgba(24, 11, 7, 0.36)';
      ctx.lineWidth = isMother ? 2.4 : 4.5;
      ctx.beginPath();
      ctx.moveTo(512 + s * 30, 586);
      ctx.quadraticCurveTo(512 + s * 48, 616, 512 + s * 52, 650);
      ctx.stroke();
    }
  });

  // 眉心吉祥金箔白毫珠
  ctx.fillStyle = 'rgba(28, 12, 6, 0.34)';
  ctx.beginPath(); ctx.arc(513, 444, 9, 0, Math.PI * 2); ctx.fill();
  const bindu = ctx.createRadialGradient(510, 440, 1.5, 512, 442, 9);
  bindu.addColorStop(0, '#FFFDF2');
  bindu.addColorStop(0.55, '#FAD972');
  bindu.addColorStop(1, '#B47412');
  ctx.fillStyle = bindu;
  ctx.beginPath(); ctx.arc(512, 442, 8.5, 0, Math.PI * 2); ctx.fill();

  // ★ V32 依三尊神聖氣韻精準比例開面（眉毛與眼睛弧度自然貼合，絕不拉伸變形！）
  ctx.lineCap = 'round';
  if (isRightKing) {
    // 右尊眉心「川字威紋」
    ctx.strokeStyle = 'rgba(20, 8, 4, 0.65)';
    ctx.lineWidth = 5;
    [-11, 0, 11].forEach((fx) => {
      ctx.beginPath();
      ctx.moveTo(512 + fx, 434);
      ctx.lineTo(512 + fx * 0.85, 472);
      ctx.stroke();
    });
  }
  // ★ V43 三尊精準貼合 3D 眉弓骨相的工筆毛筆畫眉（絕不懸浮偏移、絕不被覆額冠邊切斷，毛流層次立體自然！）
  const drawNaturalEyebrow = (s, pts, baseW, inkCol, hairHiCol) => {
    // 1) 漸收筆觸毛筆眉形（眉頭厚實柔圓 → 眉峰流暢 → 眉尾俐落收尖！）
    const [x0, y0, cx, cy, x1, y1] = pts;
    const steps = 16;
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps;
      const t1 = (i + 1) / steps;
      const tm = (t0 + t1) * 0.5;
      const px0 = (1 - t0) * (1 - t0) * x0 + 2 * (1 - t0) * t0 * cx + t0 * t0 * x1;
      const py0 = (1 - t0) * (1 - t0) * y0 + 2 * (1 - t0) * t0 * cy + t0 * t0 * y1;
      const px1 = (1 - t1) * (1 - t1) * x0 + 2 * (1 - t1) * t1 * cx + t1 * t1 * x1;
      const py1 = (1 - t1) * (1 - t1) * y0 + 2 * (1 - t1) * t1 * cy + t1 * t1 * y1;
      // 眉頭柔起、中段飽滿、眉尾銳收
      const taper = Math.sin(Math.pow(tm, 0.72) * Math.PI);
      ctx.strokeStyle = inkCol;
      ctx.lineWidth = Math.max(1.8, baseW * (0.25 + 0.85 * taper));
      ctx.beginPath(); ctx.moveTo(px0, py0); ctx.lineTo(px1, py1); ctx.stroke();
    }
    // 2) 細膩工筆眉絲微光勾線（令暗面王爺與元帥的眉毛亦根根分明立體貼服！）
    if (hairHiCol) {
      ctx.strokeStyle = hairHiCol;
      ctx.lineWidth = 1.6;
      for (let k = 0; k < 7; k++) {
        const t = 0.14 + (k / 6) * 0.72;
        const bx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
        const by = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
        ctx.beginPath();
        ctx.moveTo(bx - s * 4, by + 2.5);
        ctx.lineTo(bx + s * 6, by - 2.5);
        ctx.stroke();
      }
    }
  };

  [-1, 1].forEach((s) => {
    if (isMother) {
      // 左尊細長柔彎「古典觀音柳葉慈眉」（清晰深墨勾勒、精準貼合細長單鳳眼上方眉骨！）
      drawNaturalEyebrow(
        s,
        [512 + s * 20, 478, 512 + s * 64, 454, 512 + s * 110, 469],
        8.2,
        '#120704',
        'rgba(145, 96, 68, 0.36)'
      );
    } else if (isRightKing) {
      // 右尊濃重威儀「帝王臥蠶劍眉」（深墨主體＋溫潤灰木眉毫，在清朗炭烏面上立體服貼！）
      drawNaturalEyebrow(
        s,
        [512 + s * 18, 482, 512 + s * 62, 460, 512 + s * 112, 450],
        14.2,
        '#060408',
        'rgba(162, 152, 170, 0.42)'
      );
    } else {
      // ★ V48 中尊「配合古樟深木雕原色」之自然濃墨深木劍眉（移除過白米色眉毫，讓眉毛與深木臉龐渾然一體！）
      drawNaturalEyebrow(
        s,
        [512 + s * 18, 480, 512 + s * 64, 462, 512 + s * 110, 454],
        11.2,
        '#140C08',
        'rgba(88, 62, 48, 0.26)'
      );
    }

    const ex = 512 + s * 62;
    const ey = 512;

    // 左尊為純淨單眼皮，不在上眼瞼疊加暗色眼窩帶，避免誤現雙眼皮摺感！
    if (!isMother) {
      const lidShade = ctx.createRadialGradient(ex, ey - 6, 6, ex, ey - 2, 34);
      lidShade.addColorStop(0, isRightKing ? 'rgba(16, 11, 16, 0.30)' : 'rgba(8, 4, 3, 0.48)');
      lidShade.addColorStop(1, 'rgba(30, 14, 8, 0)');
      ctx.fillStyle = lidShade;
      ctx.beginPath(); ctx.ellipse(ex, ey - 4, 34, 18, 0, 0, Math.PI * 2); ctx.fill();
    }

    if (isMother) {
      // ★ V43.1 左尊（天上聖母）「純淨細長閉目單鳳眼」（零雙眼皮摺線！平滑單眼皮溫潤木光＋極致修長優雅上挑鳳尾！）
      const monoLidGlow = ctx.createRadialGradient(ex + s * 6, ey - 6, 4, ex + s * 4, ey - 5, 34);
      monoLidGlow.addColorStop(0, 'rgba(246, 206, 168, 0.42)');
      monoLidGlow.addColorStop(0.65, 'rgba(218, 174, 136, 0.18)');
      monoLidGlow.addColorStop(1, 'rgba(218, 174, 136, 0)');
      ctx.fillStyle = monoLidGlow;
      ctx.beginPath(); ctx.ellipse(ex + s * 4, ey - 5, 36, 13, s * -0.18, 0, Math.PI * 2); ctx.fill();

      // 漸變細膩單鳳眼閉合睫線（尖細內眥 → 纖長柔和微弧閉目 → 優雅細長上挑鳳尾梢！）
      const p0x = ex - s * 38; const p0y = ey + 6;
      const c1x = ex - s * 10; const c1y = ey + 11;
      const c2x = ex + s * 18; const c2y = ey + 8;
      const p3x = ex + s * 45; const p3y = ey - 12;
      const eyeSegs = 18;
      for (let i = 0; i < eyeSegs; i++) {
        const t0 = i / eyeSegs;
        const t1 = (i + 1) / eyeSegs;
        const tm = (t0 + t1) * 0.5;
        const bPt = (t) => {
          const u = 1 - t;
          return [
            u * u * u * p0x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * p3x,
            u * u * u * p0y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * p3y
          ];
        };
        const [ax, ay] = bPt(t0);
        const [bx, by] = bPt(t1);
        const w = 1.8 + 3.4 * Math.sin(Math.pow(tm, 0.82) * Math.PI);
        ctx.strokeStyle = '#140805';
        ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }

      // 下眼緣極淡溫婉臥蠶微影
      ctx.strokeStyle = 'rgba(42, 20, 12, 0.16)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(ex - s * 22, ey + 12);
      ctx.quadraticCurveTo(ex + s * 4, ey + 15, ex + s * 30, ey + 2);
      ctx.stroke();
    } else if (isRightKing) {
      // ★ V43.1 右尊（鎮殿王爺）「溫潤啞光炭烏木清晰閉眼」（去除過白反光！以溫潤深木雕受光呈現清楚立體之閉合威目！）
      const blackLidGlow = ctx.createRadialGradient(ex, ey - 4, 5, ex, ey - 2, 30);
      blackLidGlow.addColorStop(0, 'rgba(156, 146, 162, 0.34)');
      blackLidGlow.addColorStop(0.58, 'rgba(108, 100, 114, 0.18)');
      blackLidGlow.addColorStop(1, 'rgba(52, 46, 56, 0)');
      ctx.fillStyle = blackLidGlow;
      ctx.beginPath(); ctx.ellipse(ex, ey - 3, 30, 14, 0, 0, Math.PI * 2); ctx.fill();

      // 柔和木雕上眼瞼微摺
      ctx.strokeStyle = 'rgba(154, 144, 160, 0.24)';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(ex - s * 26, ey - 8);
      ctx.quadraticCurveTo(ex, ey - 17, ex + s * 29, ey - 11);
      ctx.stroke();

      // 深墨沉穩威嚴閉合眼裂主線（清楚辨識雙目神韻且自然不泛白！）
      ctx.strokeStyle = '#070509';
      ctx.lineWidth = 7.4;
      ctx.beginPath();
      ctx.moveTo(ex - s * 31, ey + 4);
      ctx.quadraticCurveTo(ex, ey + 12, ex + s * 34, ey - 4);
      ctx.stroke();

      // 眼裂下緣極柔和深木受光輪廓線
      ctx.strokeStyle = 'rgba(146, 136, 152, 0.22)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(ex - s * 24, ey + 9);
      ctx.quadraticCurveTo(ex, ey + 17, ex + s * 28, ey + 2);
      ctx.stroke();
    } else {
      // ★ 中尊（中壇元帥）帥氣型男「深邃冷峻線條感丹鳳英目」
      ctx.strokeStyle = 'rgba(26, 12, 8, 0.52)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ex, ey + 11, 32, Math.PI * 1.18, Math.PI * 1.82);
      ctx.stroke();

      ctx.fillStyle = '#FFFDF8';
      ctx.beginPath();
      ctx.moveTo(ex - s * 30, ey + 4);
      ctx.quadraticCurveTo(ex + s * 2, ey - 14, ex + s * 35, ey - 13);
      ctx.quadraticCurveTo(ex + s * 2, ey + 10, ex - s * 30, ey + 4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#160D09';
      ctx.beginPath(); ctx.arc(ex, ey - 1, 13.0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#070403';
      ctx.beginPath(); ctx.arc(ex, ey - 1, 8.2, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(ex - 3.8, ey - 4.6, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + 3.4, ey + 2.4, 2.2, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = '#070302';
      ctx.lineWidth = 8.4;
      ctx.beginPath();
      ctx.moveTo(ex - s * 31, ey + 4);
      ctx.quadraticCurveTo(ex + s * 2, ey - 16, ex + s * 37, ey - 14);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(18, 8, 6, 0.65)';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(ex - s * 23, ey + 3);
      ctx.quadraticCurveTo(ex, ey + 10, ex + s * 28, ey - 4);
      ctx.stroke();
    }
  });

  // ★ V48 配合古樟木雕原色之溫潤挺秀鼻樑（中尊去除偏白粉彩高光條，以自然原木溫潤微光配合 72×56 真 3D 鼻雕受光！）
  [-1, 1].forEach((s) => {
    ctx.strokeStyle = isCenter ? 'rgba(20, 12, 9, 0.34)' : isRightKing ? 'rgba(10, 8, 12, 0.50)' : 'rgba(66, 36, 20, 0.18)';
    ctx.lineWidth = isCenter ? 7.5 : isRightKing ? 8 : 6.5;
    ctx.beginPath();
    ctx.moveTo(512 + s * 12, 480);
    ctx.quadraticCurveTo(512 + s * 14, 534, 512 + s * 17, 578);
    ctx.stroke();
  });
  const noseGrad = ctx.createLinearGradient(504, 482, 520, 584);
  if (isRightKing) {
    noseGrad.addColorStop(0, 'rgba(202, 192, 210, 0.46)');
    noseGrad.addColorStop(0.55, 'rgba(176, 166, 184, 0.40)');
    noseGrad.addColorStop(1, 'rgba(218, 208, 224, 0.52)');
  } else if (isCenter) {
    // 中尊自然深棕原木光澤（完全協調木雕膚色，零泛白油漆感！）
    noseGrad.addColorStop(0, 'rgba(136, 102, 82, 0.24)');
    noseGrad.addColorStop(0.55, 'rgba(118, 88, 70, 0.20)');
    noseGrad.addColorStop(1, 'rgba(148, 112, 90, 0.28)');
  } else {
    noseGrad.addColorStop(0, 'rgba(255, 240, 214, 0.42)');
    noseGrad.addColorStop(0.55, 'rgba(255, 232, 200, 0.34)');
    noseGrad.addColorStop(1, 'rgba(255, 244, 222, 0.48)');
  }
  ctx.strokeStyle = noseGrad;
  ctx.lineWidth = isCenter ? 9 : isRightKing ? 11 : 8.5;
  ctx.beginPath(); ctx.moveTo(512, 480); ctx.lineTo(512, 580); ctx.stroke();

  // 圓潤鼻頭與細緻人中
  drawCarvedHighlight(512, 578, 18, 13, isCenter ? 0.28 : isRightKing ? 0.58 : 0.44);
  ctx.strokeStyle = isCenter ? 'rgba(24, 14, 10, 0.36)' : 'rgba(52, 26, 14, 0.28)';
  ctx.lineWidth = 3.2;
  ctx.beginPath(); ctx.arc(512, 580, 19, 0.32, Math.PI - 0.32); ctx.stroke();
  [-6, 6].forEach((ox) => {
    ctx.strokeStyle = isCenter ? 'rgba(128, 96, 78, 0.20)' : 'rgba(255, 234, 206, 0.26)';
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(512 + ox, 598); ctx.lineTo(512 + ox * 1.1, 622); ctx.stroke();
  });

  // ★ V47 三尊極致神韻唇形（左尊：清雅秀美古典微含笑意柔唇、絕不嘟嘴、嘴巴下方全面提亮柔順完全消除黑陰影！中尊：年輕帥氣型男俊唇；右尊：威嚴緊抿唇！）
  if (isMother) {
    // 1) 嘴巴下方與下巴交界「溫潤暖膚柔光提亮帶」—— 徹底清除嘴巴下方偏黑陰影！
    const underLipGlow = ctx.createRadialGradient(512, 678, 8, 512, 682, 76);
    underLipGlow.addColorStop(0, 'rgba(248, 212, 178, 0.56)');
    underLipGlow.addColorStop(0.55, 'rgba(232, 188, 152, 0.32)');
    underLipGlow.addColorStop(1, 'rgba(220, 174, 138, 0)');
    ctx.fillStyle = underLipGlow;
    ctx.beginPath(); ctx.ellipse(512, 682, 76, 42, 0, 0, Math.PI * 2); ctx.fill();

    const lipHalo = ctx.createRadialGradient(512, 639, 8, 512, 639, 54);
    lipHalo.addColorStop(0, 'rgba(246, 208, 176, 0.36)');
    lipHalo.addColorStop(1, 'rgba(246, 208, 176, 0)');
    ctx.fillStyle = lipHalo;
    ctx.beginPath(); ctx.ellipse(512, 639, 52, 26, 0, 0, Math.PI * 2); ctx.fill();

    // 2) 古典觀音／媽祖「修雅舒展微笑柔美朱唇」（寬度優雅 470..554、厚薄適中微含笑意，徹底告別短圓嘟嘴！）
    const mUpperGrad = ctx.createLinearGradient(512, 626, 512, 642);
    mUpperGrad.addColorStop(0, '#BF4640');
    mUpperGrad.addColorStop(1, '#D35A52');
    ctx.fillStyle = mUpperGrad;
    ctx.beginPath();
    ctx.moveTo(470, 639);
    ctx.quadraticCurveTo(494, 625, 512, 631);
    ctx.quadraticCurveTo(530, 625, 554, 639);
    ctx.quadraticCurveTo(512, 643, 470, 639);
    ctx.closePath();
    ctx.fill();

    const mLowerGrad = ctx.createLinearGradient(512, 639, 512, 654);
    mLowerGrad.addColorStop(0, '#DA6258');
    mLowerGrad.addColorStop(0.65, '#CE554D');
    mLowerGrad.addColorStop(1, 'rgba(206, 95, 82, 0.72)');
    ctx.fillStyle = mLowerGrad;
    ctx.beginPath();
    ctx.moveTo(474, 640);
    ctx.quadraticCurveTo(512, 656, 550, 640);
    ctx.quadraticCurveTo(512, 644, 474, 640);
    ctx.closePath();
    ctx.fill();

    // 3) 優雅微上揚嘴角與柔和細唇縫（端莊慈祥微含笑意！）
    ctx.strokeStyle = 'rgba(108, 28, 24, 0.46)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(468, 638);
    ctx.quadraticCurveTo(512, 644, 556, 638);
    ctx.stroke();

    // 4) 下唇極柔和淡雅絲光（秀氣自然不油亮！）
    const lowerHi = ctx.createRadialGradient(512, 646, 2, 512, 646, 18);
    lowerHi.addColorStop(0, 'rgba(255, 228, 214, 0.36)');
    lowerHi.addColorStop(1, 'rgba(255, 228, 214, 0)');
    ctx.fillStyle = lowerHi;
    ctx.beginPath(); ctx.ellipse(512, 646, 18, 5.5, 0, 0, Math.PI * 2); ctx.fill();
  } else if (isRightKing) {
    ctx.fillStyle = '#942620';
    ctx.beginPath();
    ctx.moveTo(472, 641);
    ctx.quadraticCurveTo(496, 626, 512, 631);
    ctx.quadraticCurveTo(528, 626, 552, 641);
    ctx.quadraticCurveTo(512, 653, 472, 641);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(42, 8, 8, 0.82)'; ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(472, 641);
    ctx.quadraticCurveTo(512, 634, 552, 641);
    ctx.stroke();
  } else {
    // ★ V47 中尊年輕帥氣型男俊唇（俐落唇峰＋飽滿微光下唇＋英挺沉靜嘴角！）
    const cLipGrad = ctx.createLinearGradient(512, 624, 512, 654);
    cLipGrad.addColorStop(0, '#9E322D');
    cLipGrad.addColorStop(0.55, '#B6443D');
    cLipGrad.addColorStop(1, '#8E2A26');
    ctx.fillStyle = cLipGrad;
    ctx.beginPath();
    ctx.moveTo(477, 638);
    ctx.quadraticCurveTo(497, 625, 512, 631);
    ctx.quadraticCurveTo(527, 625, 547, 638);
    ctx.quadraticCurveTo(512, 655, 477, 638);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(32, 8, 8, 0.72)'; ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(478, 638);
    ctx.quadraticCurveTo(512, 636, 546, 637);
    ctx.stroke();
    const cLipHi = ctx.createRadialGradient(512, 645, 2, 512, 645, 16);
    cLipHi.addColorStop(0, 'rgba(255, 206, 186, 0.34)');
    cLipHi.addColorStop(1, 'rgba(255, 206, 186, 0)');
    ctx.fillStyle = cLipHi;
    ctx.beginPath(); ctx.ellipse(512, 645, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (!isMother) {
    ctx.fillStyle = isCenter ? 'rgba(255, 224, 212, 0.44)' : 'rgba(255, 236, 224, 0.34)';
    ctx.beginPath(); ctx.ellipse(512, 644, 12, 3.0, 0, 0, Math.PI * 2); ctx.fill();
  }

  return makeCanvasTexture(canvas);
}


/**
 * 11. 博物館級刺繡神衣龍袍紋理（1024×1024：盤龍金線、纏枝牡丹、亮片珠繡、五彩海水江崖！）
 */
export function createDeityRobeTexture(variant = 'leftMother') {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 0, 1024);
  if (variant === 'leftMother') {
    // ★ V31 天上聖母富麗明黃杏金繡鳳神袍
    g.addColorStop(0, '#E2AA34'); g.addColorStop(0.5, '#BA801C'); g.addColorStop(1, '#84520E');
  } else if (variant === 'centerKing') {
    // ★ V31 中尊純正鮮明「橘色刺繡神衣」（非金甲，腹部繡威武金獅頭！）
    g.addColorStop(0, '#F57C20'); g.addColorStop(0.48, '#E65C14'); g.addColorStop(1, '#B5380C');
  } else {
    g.addColorStop(0, '#72231E'); g.addColorStop(0.5, '#4A1715'); g.addColorStop(1, '#2A0E0E');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 1024);

  // 細密金線繡紋
  ctx.strokeStyle = variant === 'centerKing' ? 'rgba(255, 236, 168, 0.42)' : 'rgba(255, 224, 128, 0.36)';
  ctx.lineWidth = 3;
  for (let y = 56; y < 780; y += 44) {
    for (let x = 0; x < 1024; x += 50) {
      const ox = (Math.floor(y / 44) % 2) * 25;
      ctx.beginPath(); ctx.arc(x + ox, y, 22, 0, Math.PI); ctx.stroke();
    }
  }

  if (variant === 'centerKing') {
    // ★ V31 中尊橘色神衣腹部正中央（u = 0.5 → x = 512, y = 450..690）精緻金線刺繡「威武金獅頭（吞口獅）」！
    const lx = 512;
    const ly = 530;
    // 外圍金絲祥雲圓光
    const halo = ctx.createRadialGradient(lx, ly, 40, lx, ly, 178);
    halo.addColorStop(0, 'rgba(255, 236, 150, 0.35)');
    halo.addColorStop(1, 'rgba(255, 210, 90, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(lx, ly, 178, 0, Math.PI * 2); ctx.fill();

    // 14 朵捲雲金絲獅鬃環繞外圈
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const mx = lx + Math.cos(a) * 124;
      const my = ly + Math.sin(a) * 114;
      ctx.fillStyle = i % 2 === 0 ? '#F9C74F' : '#E29822';
      ctx.strokeStyle = '#7A2E0A';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(mx, my, 34, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#FFF5B8';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(mx, my, 18, a, a + Math.PI * 1.4); ctx.stroke();
    }
    // 雄獅威武金面輪廓
    const faceG = ctx.createRadialGradient(lx, ly - 18, 18, lx, ly, 118);
    faceG.addColorStop(0, '#FFE787');
    faceG.addColorStop(0.65, '#EAB330');
    faceG.addColorStop(1, '#B36C12');
    ctx.fillStyle = faceG;
    ctx.strokeStyle = '#6B240A';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(lx, ly, 108, 96, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // 獅額「王」字紅金刺繡
    ctx.strokeStyle = '#B91C1C'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lx - 32, ly - 64); ctx.lineTo(lx + 32, ly - 64);
    ctx.moveTo(lx - 24, ly - 46); ctx.lineTo(lx + 24, ly - 46);
    ctx.moveTo(lx - 32, ly - 28); ctx.lineTo(lx + 32, ly - 28);
    ctx.moveTo(lx, ly - 66); ctx.lineTo(lx, ly - 26);
    ctx.stroke();

    // 雙目炯炯威武銅鈴獅眼 ＋ 濃密金綠捲眉
    [-1, 1].forEach((s) => {
      ctx.strokeStyle = '#15803D'; ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(lx + s * 16, ly - 24);
      ctx.quadraticCurveTo(lx + s * 52, ly - 48, lx + s * 78, ly - 24);
      ctx.stroke();
      ctx.fillStyle = '#FFFDF5'; ctx.strokeStyle = '#521A06'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(lx + s * 46, ly - 8, 22, 16, s * -0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#180B06';
      ctx.beginPath(); ctx.arc(lx + s * 46, ly - 8, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(lx + s * 42, ly - 12, 3.5, 0, Math.PI * 2); ctx.fill();
    });

    // 寬大飽滿金獅鼻頭 ＋ 兩側腮吻
    ctx.fillStyle = '#D63228'; ctx.strokeStyle = '#5C1408'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(lx, ly + 22, 32, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFE89E';
    [-1, 1].forEach((s) => {
      ctx.beginPath(); ctx.arc(lx + s * 34, ly + 42, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
    // 張口威震獅嘴 ＋ 白亮獅牙 ＋ 紅舌
    ctx.fillStyle = '#5C0D0D';
    ctx.beginPath(); ctx.ellipse(lx, ly + 62, 42, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#E11D48';
    ctx.beginPath(); ctx.ellipse(lx, ly + 72, 22, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFDF5';
    [-26, -10, 10, 26].forEach((tx, ti) => {
      ctx.beginPath();
      ctx.moveTo(lx + tx - 7, ly + 48);
      ctx.lineTo(lx + tx + 7, ly + 48);
      ctx.lineTo(lx + tx, ly + (ti === 0 || ti === 3 ? 68 : 60));
      ctx.closePath(); ctx.fill();
    });

    // 胸前與左右繡金雲龍小團徽呼應
    ctx.strokeStyle = '#FCE068'; ctx.lineWidth = 6;
    [200, 824].forEach((sx) => {
      ctx.beginPath(); ctx.arc(sx, 500, 62, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(sx, 500, 36, 0.3, Math.PI * 1.7); ctx.stroke();
    });
  } else {
    // 華麗金線盤龍與纏枝寶花團徽
    const drawEmbroideredDragonMedallion = (mx, my, r) => {
      ctx.fillStyle = 'rgba(252, 214, 100, 0.22)';
      ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#FCE068'; ctx.lineWidth = 8; ctx.stroke();
      ctx.strokeStyle = '#991B1B'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(mx, my, r * 0.88, 0, Math.PI * 2); ctx.stroke();

      ctx.strokeStyle = '#FFF5B8'; ctx.lineWidth = 10; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(mx, my, r * 0.56, 0.3, Math.PI * 1.85);
      ctx.stroke();
      ctx.fillStyle = '#EF4444';
      ctx.beginPath(); ctx.arc(mx, my, r * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#FFF7C2'; ctx.lineWidth = 3; ctx.stroke();

      ctx.fillStyle = '#FFF9C4';
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(mx + Math.cos(a) * (r * 0.94), my + Math.sin(a) * (r * 0.94), 4.5, 0, Math.PI * 2); ctx.fill();
      }
    };
    drawEmbroideredDragonMedallion(512, 340, 146);
    drawEmbroideredDragonMedallion(224, 575, 86);
    drawEmbroideredDragonMedallion(800, 575, 86);
  }

  // 五彩祥雲刺繡點綴
  const cloudCols = ['#38BDF8', '#4ADE80', '#F472B6', '#FACC15'];
  for (let i = 0; i < 12; i++) {
    const cx = 80 + (i * 86) % 900;
    const cy = 120 + (i * 157) % 620;
    ctx.strokeStyle = cloudCols[i % cloudCols.length];
    ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.arc(cx, cy, 24, Math.PI, 0); ctx.arc(cx + 22, cy, 18, Math.PI, 0); ctx.stroke();
  }

  // 下擺三層「五彩海水江崖金線繡邊」
  for (let i = 0; i < 10; i++) {
    const wx = 52 + i * 102;
    ctx.fillStyle = '#F8FAFC'; ctx.beginPath(); ctx.arc(wx, 1024, 64, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#38BDF8'; ctx.beginPath(); ctx.arc(wx, 1024, 52, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#1D4ED8'; ctx.beginPath(); ctx.arc(wx, 1024, 38, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#FAD364'; ctx.lineWidth = 5; ctx.stroke();
  }

  // 領口萬字錦金滾邊
  ctx.fillStyle = '#F2C249'; ctx.fillRect(0, 0, 1024, 42);
  ctx.fillStyle = '#991B1B'; ctx.fillRect(0, 42, 1024, 16);

  return makeCanvasTexture(canvas);
}


/**
 * 12. ★ V28 柔順織錦紅綾飄帶紋理（柔和布面絲紋＋柔光摺痕漸層＋金線邊框，呈現真實布料柔軟質感！）
 */
export function createDeitySashTexture(text = '玉勅代天府德慈宮') {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 柔和絲緞布面橫向微摺光澤（告別生硬純色平板！）
  const bg = ctx.createLinearGradient(0, 0, 128, 0);
  bg.addColorStop(0, '#9E171D');
  bg.addColorStop(0.22, '#CF242A');
  bg.addColorStop(0.50, '#DC2C32');
  bg.addColorStop(0.78, '#C42026');
  bg.addColorStop(1, '#92141A');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 128, 512);

  // 細微斜紋布褶明暗波紋
  for (let y = 0; y < 512; y += 6) {
    const wave = Math.sin(y * 0.055) * 0.08;
    ctx.fillStyle = wave > 0
      ? `rgba(255, 224, 210, ${wave.toFixed(3)})`
      : `rgba(60, 8, 10, ${(-wave).toFixed(3)})`;
    ctx.fillRect(0, y, 128, 6);
  }
  // 細密絲織經緯紋
  ctx.strokeStyle = 'rgba(255, 232, 185, 0.08)';
  ctx.lineWidth = 1;
  for (let y = 0; y < 512; y += 4) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke();
  }

  // 細緻金線繡邊與下擺流蘇裝飾線
  ctx.strokeStyle = '#F5CF64';
  ctx.lineWidth = 5;
  ctx.strokeRect(10, 8, 108, 496);
  ctx.strokeStyle = 'rgba(255, 240, 180, 0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(17, 15, 94, 482);

  const chars = [...text];
  const step = 428 / Math.max(chars.length, 1);
  ctx.fillStyle = '#FFE98E';
  ctx.font = '900 36px "DFKai-SB", "Noto Serif TC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  chars.forEach((ch, i) => ctx.fillText(ch, 64, 48 + i * step));

  return makeCanvasTexture(canvas);
}


/**
 * 13. 右尊座下復古神明肖像畫框紋理（還原實景照右下方精緻古畫框！）
 */
export function createVintageDeityPortraitTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#C7D1C6';
  ctx.fillRect(0, 0, 256, 320);
  ctx.strokeStyle = '#4B5550';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 236, 300);

  // 淡墨神像盤坐剪影
  ctx.fillStyle = '#5B6762';
  ctx.beginPath();
  ctx.arc(128, 108, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(64, 260);
  ctx.quadraticCurveTo(86, 150, 128, 146);
  ctx.quadraticCurveTo(170, 150, 192, 260);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#E5EBE4';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(128, 108, 46, 0, Math.PI * 2);
  ctx.stroke();

  return makeCanvasTexture(canvas);
}


/**
 * 14. 精緻布面織紋「五營旗」三角鋸齒令旗紋理（需求 #11）
 */
export function createFiveCampFlagTexture(bgHex, borderHex, charLabel, textHex = '#FFFDF5') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 192);

  // 三角鋸齒布旗底色
  ctx.beginPath();
  ctx.moveTo(8, 12);
  ctx.lineTo(244, 96);
  ctx.lineTo(8, 180);
  ctx.closePath();
  ctx.fillStyle = bgHex;
  ctx.fill();

  // 布面經緯織紋（明顯布料觸感！）
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1.5;
  for (let x = 0; x < 256; x += 7) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 192); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.11)';
  for (let y = 0; y < 192; y += 7) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
  }
  ctx.restore();

  // 傳統鋸齒火焰繡邊
  ctx.strokeStyle = borderHex;
  ctx.lineWidth = 10;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(10, 14);
  ctx.lineTo(240, 96);
  ctx.lineTo(10, 178);
  ctx.closePath();
  ctx.stroke();

  // 中央帥令楷書字
  ctx.fillStyle = textHex;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 4;
  ctx.font = '900 56px "DFKai-SB", "Noto Serif TC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText(charLabel, 82, 98);
  ctx.fillText(charLabel, 82, 98);

  return makeCanvasTexture(canvas);
}


/**
 * 15. 精緻紅綢「德慈宮平安宮燈」絲面紋理（需求 #12）
 */
export function createLanternSilkTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#B91C1C');
  g.addColorStop(0.5, '#E02D28');
  g.addColorStop(1, '#991B1B');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);

  // 竹骨直紋與上下金錦邊
  ctx.strokeStyle = 'rgba(85, 10, 10, 0.42)';
  ctx.lineWidth = 3;
  for (let x = 0; x < 512; x += 32) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
  }
  ctx.fillStyle = '#FAD364';
  ctx.fillRect(0, 0, 512, 18);
  ctx.fillRect(0, 238, 512, 18);

  // 燈面金色「德慈宮・平安」楷書與祥雲
  ctx.fillStyle = '#FFF0A0';
  ctx.strokeStyle = '#5E0C0A';
  ctx.lineWidth = 4;
  ctx.font = '900 48px "DFKai-SB", "Noto Serif TC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  [128, 384].forEach((cx, idx) => {
    const label = idx === 0 ? '德慈宮' : '平安順';
    [...label].forEach((ch, ci) => {
      ctx.strokeText(ch, cx, 66 + ci * 62);
      ctx.fillText(ch, cx, 66 + ci * 62);
    });
  });

  return makeCanvasTexture(canvas);
}


/**
 * 16. ★ V32 工匠天然花崗岩／青斗石精雕紋理（豐富礦物結晶顆粒＋自然石脈微裂＋淺鑿痕，真實石頭質感！）
 */
let _cachedCarvedStoneTex = null;
export function createCarvedStoneTexture() {
  if (_cachedCarvedStoneTex) return _cachedCarvedStoneTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // 溫潤青斗花崗岩底層漸變
  const bg = ctx.createLinearGradient(0, 0, 256, 256);
  bg.addColorStop(0, '#C7CDD2');
  bg.addColorStop(0.5, '#B7BFC6');
  bg.addColorStop(1, '#C2C8CE');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 256);

  // 天然石材深淺雲塊色斑
  for (let i = 0; i < 48; i++) {
    const x = (i * 67) % 256;
    const y = (i * 113) % 256;
    const r = 14 + (i % 4) * 9;
    const rg = ctx.createRadialGradient(x, y, 2, x, y, r);
    rg.addColorStop(0, i % 2 === 0 ? 'rgba(90, 98, 108, 0.16)' : 'rgba(248, 250, 252, 0.16)');
    rg.addColorStop(1, 'rgba(180, 188, 196, 0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  // 高密度花崗岩黑雲母／石英礦物結晶細點
  for (let i = 0; i < 1600; i++) {
    const px = (i * 79 + (i % 13) * 17) % 255;
    const py = (i * 137 + (i % 11) * 19) % 255;
    const m = i % 5;
    ctx.fillStyle = m === 0 ? 'rgba(255,255,255,0.34)'
      : m === 1 ? 'rgba(54,60,68,0.28)'
      : m === 2 ? 'rgba(84,92,102,0.22)'
      : m === 3 ? 'rgba(148,142,134,0.18)'
      : 'rgba(215,220,224,0.24)';
    ctx.fillRect(px, py, m === 1 ? 2.5 : 2, m === 0 ? 2.5 : 2);
  }

  // 天然微細石脈與石匠細鑿痕
  ctx.strokeStyle = 'rgba(72, 78, 86, 0.16)';
  ctx.lineWidth = 1.2;
  for (let v = 0; v < 7; v++) {
    ctx.beginPath();
    ctx.moveTo((v * 43) % 256, 0);
    ctx.bezierCurveTo((v * 71 + 40) % 256, 85, (v * 53 + 120) % 256, 170, (v * 89) % 256, 256);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(235, 240, 244, 0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 248, 248);
  ctx.strokeStyle = 'rgba(98, 106, 114, 0.28)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(8, 8, 240, 240);

  const tex = makeCanvasTexture(canvas, true, false);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  _cachedCarvedStoneTex = tex;
  return tex;
}

/**
 * 16B. ★ V32 假山景石／天然溪石紋理（粗獷灰褐岩層＋自然岩石節理裂紋＋微帶青苔礦斑！）
 */
let _cachedNaturalRockTex = null;
export function createNaturalRockTexture() {
  if (_cachedNaturalRockTex) return _cachedNaturalRockTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#9BA4AA';
  ctx.fillRect(0, 0, 256, 256);

  // 岩石層理色斑與微苔點綴
  for (let i = 0; i < 65; i++) {
    const x = (i * 59) % 256;
    const y = (i * 97) % 256;
    const rx = 18 + (i % 5) * 10;
    const ry = 10 + (i % 4) * 7;
    ctx.fillStyle = i % 7 === 0 ? 'rgba(72, 102, 74, 0.22)'
      : i % 3 === 0 ? 'rgba(42, 48, 52, 0.28)'
      : i % 3 === 1 ? 'rgba(154, 162, 166, 0.24)'
      : 'rgba(104, 98, 88, 0.22)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, (i % 6) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // 粗顆粒岩晶斑點
  for (let i = 0; i < 1400; i++) {
    const px = (i * 83 + (i % 7) * 19) % 254;
    const py = (i * 149 + (i % 11) * 13) % 254;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(22,26,30,0.32)' : i % 3 === 1 ? 'rgba(218,224,226,0.22)' : 'rgba(92,86,78,0.22)';
    ctx.fillRect(px, py, 2.5, 2.5);
  }
  // 岩石自然節理裂縫
  ctx.strokeStyle = 'rgba(28, 33, 38, 0.36)';
  ctx.lineWidth = 1.8;
  for (let c = 0; c < 10; c++) {
    ctx.beginPath();
    const sy = (c * 29) % 256;
    ctx.moveTo(0, sy);
    ctx.bezierCurveTo(80, sy + ((c % 2 ? 1 : -1) * 22), 170, sy - ((c % 2 ? 1 : -1) * 18), 256, (sy + 14) % 256);
    ctx.stroke();
  }

  const tex = makeCanvasTexture(canvas, true, false);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  _cachedNaturalRockTex = tex;
  return tex;
}

/**
 * 16C. ★ V32 瀑布雪白流動水瀑紋理（垂直無縫捲動白練水絲＋柔光泡泡！）
 */
let _cachedWaterfallTex = null;
export function createWaterfallFoamTexture() {
  if (_cachedWaterfallTex) return _cachedWaterfallTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // 左右羽化柔邊的清透水幕底色
  const bg = ctx.createLinearGradient(0, 0, 128, 0);
  bg.addColorStop(0, 'rgba(186, 236, 255, 0)');
  bg.addColorStop(0.18, 'rgba(186, 236, 255, 0.55)');
  bg.addColorStop(0.50, 'rgba(235, 250, 255, 0.84)');
  bg.addColorStop(0.82, 'rgba(186, 236, 255, 0.55)');
  bg.addColorStop(1, 'rgba(186, 236, 255, 0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 128, 256);

  // 多道柔和縱向水流白練（頭尾無縫循環！）
  for (let i = 0; i < 24; i++) {
    const x = 16 + (i / 24) * 96 + Math.sin(i * 2.3) * 4;
    const len = 34 + (i % 5) * 18;
    const y0 = (i * 53) % 256;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.72)' : 'rgba(125, 211, 252, 0.52)';
    ctx.lineWidth = i % 3 === 0 ? 4.5 : 2.5;
    ctx.lineCap = 'round';
    [0, -256, 256].forEach((off) => {
      ctx.beginPath();
      ctx.moveTo(x, y0 + off);
      ctx.lineTo(x + Math.sin(i) * 3, y0 + len + off);
      ctx.stroke();
    });
  }

  const tex = makeCanvasTexture(canvas, true, false);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1.5);
  _cachedWaterfallTex = tex;
  return tex;
}

/**
 * 16D. ★ V32 水池柔和羽化水波漣漪環貼圖（無生硬白圈邊緣，自然清透水波紋！）
 */
let _cachedPondRippleTex = null;
export function createPondRippleRingTexture() {
  if (_cachedPondRippleTex) return _cachedPondRippleTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);

  const g = ctx.createRadialGradient(128, 128, 36, 128, 128, 124);
  g.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
  g.addColorStop(0.45, 'rgba(224, 246, 255, 0)');
  g.addColorStop(0.68, 'rgba(235, 251, 255, 0.55)');
  g.addColorStop(0.76, 'rgba(255, 255, 255, 0.82)');
  g.addColorStop(0.84, 'rgba(196, 240, 255, 0.35)');
  g.addColorStop(1.0, 'rgba(186, 234, 255, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(128, 128, 124, 0, Math.PI * 2);
  ctx.fill();

  _cachedPondRippleTex = makeCanvasTexture(canvas, true, false);
  return _cachedPondRippleTex;
}

/**
 * 16E. ★ V32 水池碧波微紋水面貼圖（淡雅柔和波光，搭配緩慢流動！）
 */
let _cachedPondWaterTex = null;
export function createPondWaterTexture() {
  if (_cachedPondWaterTex) return _cachedPondWaterTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#3897B4';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 36; i++) {
    const x = (i * 71) % 256;
    const y = (i * 53) % 256;
    const r = 18 + (i % 4) * 12;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, i % 2 === 0 ? 'rgba(165, 232, 248, 0.24)' : 'rgba(22, 92, 118, 0.20)');
    g.addColorStop(1, 'rgba(56, 151, 180, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  const tex = makeCanvasTexture(canvas, true, false);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  _cachedPondWaterTex = tex;
  return tex;
}

/**
 * 17. 工匠精雕紅木紋理（深紅檀木直紋 ＋ 金絲雕框，單例快取！）
 */
let _cachedRosewoodTex = null;
export function createCarvedRosewoodTexture() {
  if (_cachedRosewoodTex) return _cachedRosewoodTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#4E261A';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? 'rgba(30, 12, 8, 0.35)' : 'rgba(145, 86, 48, 0.16)';
    ctx.fillRect(0, y, 256, 2);
  }
  ctx.strokeStyle = 'rgba(235, 190, 96, 0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, 240, 240);

  const tex = makeCanvasTexture(canvas, true, false);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  _cachedRosewoodTex = tex;
  return tex;
}

/**
 * 18. 真實「天公爐／香爐香灰層紋理」（單例快取＋高效顆粒演算法，4 倍速生成！）
 */
let _cachedAshTex = null;
export function createIncenseAshTexture() {
  if (_cachedAshTex) return _cachedAshTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  g.addColorStop(0, '#EBE6DC');
  g.addColorStop(0.58, '#D7D0C4');
  g.addColorStop(0.88, '#BFB7A8');
  g.addColorStop(1, '#9E9689');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);

  for (let r = 18; r < 122; r += 14) {
    ctx.strokeStyle = 'rgba(130, 122, 110, 0.14)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(128, 128, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = 0; i < 600; i++) {
    const x = (i * 97 + (i % 13) * 19) % 256;
    const y = (i * 157 + (i % 17) * 13) % 256;
    const dx = x - 128;
    const dy = y - 128;
    if (dx * dx + dy * dy > 124 * 124) continue;
    ctx.fillStyle = i % 3 === 0
      ? 'rgba(255, 253, 248, 0.42)'
      : i % 3 === 1
        ? 'rgba(115, 108, 98, 0.28)'
        : 'rgba(165, 156, 144, 0.30)';
    ctx.fillRect(x, y, 2, 2);
  }

  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.4;
    const r = 20 + (i * 19) % 68;
    ctx.fillStyle = 'rgba(182, 54, 48, 0.55)';
    ctx.beginPath(); ctx.arc(128 + Math.cos(a) * r, 128 + Math.sin(a) * r, 2.2, 0, Math.PI * 2); ctx.fill();
  }

  _cachedAshTex = makeCanvasTexture(canvas);
  return _cachedAshTex;
}

/**
 * 19. ★ V27 神明專用刺繡紅金供桌巾（桌裙：朱紅緞面＋金線回字紋＋八仙祥雲龍鳳團徽＋下擺金流蘇！）
 */
let _cachedTableClothTex = null;
export function createAltarTableClothTexture() {
  if (_cachedTableClothTex) return _cachedTableClothTex;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 朱紅金絲緞面底色
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#B81C22');
  g.addColorStop(0.5, '#9E151B');
  g.addColorStop(0.86, '#7E1015');
  g.addColorStop(1, '#5D0B0E');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);

  // 細緻織錦暗花絲光斜紋
  ctx.strokeStyle = 'rgba(255, 222, 130, 0.08)';
  ctx.lineWidth = 2;
  for (let i = -512; i < 1536; i += 24) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 512, 512); ctx.stroke();
  }

  // 上方金邊與萬字回紋鑲條
  ctx.fillStyle = '#E8B844';
  ctx.fillRect(0, 0, 1024, 24);
  ctx.fillStyle = '#6B0D10';
  ctx.fillRect(0, 24, 1024, 8);
  ctx.strokeStyle = '#FAD868';
  ctx.lineWidth = 5;
  ctx.strokeRect(20, 44, 984, 376);
  ctx.lineWidth = 2.5;
  ctx.strokeRect(32, 56, 960, 352);

  // 中央「福祿壽」金線團徽與左右雙鳳祥雲刺繡
  const drawEmblem = (cx, cy, r, charText) => {
    const eg = ctx.createRadialGradient(cx, cy, 8, cx, cy, r);
    eg.addColorStop(0, 'rgba(255, 226, 118, 0.32)');
    eg.addColorStop(1, 'rgba(218, 162, 42, 0.08)');
    ctx.fillStyle = eg;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FCE06E';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, r - 12, 0, Math.PI * 2); ctx.stroke();

    // 外圈金線祥雲花瓣
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      ctx.fillStyle = '#FFE88A';
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * (r + 10), cy + Math.sin(a) * (r + 10), 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#FFE985';
    ctx.font = `900 ${Math.round(r * 1.05)}px "DFKai-SB", "Noto Serif TC", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(charText, cx, cy + 4);
  };

  drawEmblem(512, 232, 108, '壽');
  drawEmblem(215, 232, 74, '福');
  drawEmblem(809, 232, 74, '祿');

  // ★ V28 福・壽・祿三字之間改以典雅對稱「金線祥雲蓮花如意結」刺繡（徹底取代原先怪異 C 形線條！）
  const drawAuspiciousCloudLotus = (cx, cy) => {
    ctx.save();
    ctx.translate(cx, cy);
    // 中心菱形如意金花結
    ctx.fillStyle = 'rgba(252, 218, 108, 0.28)';
    ctx.strokeStyle = '#FCE06E';
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.quadraticCurveTo(22, -16, 36, 0);
    ctx.quadraticCurveTo(22, 16, 0, 34);
    ctx.quadraticCurveTo(-22, 16, -36, 0);
    ctx.quadraticCurveTo(-22, -16, 0, -34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 內芯四瓣金蓮花心
    ctx.fillStyle = '#FFE88A';
    [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((a) => {
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 11, Math.sin(a) * 11, 8, 4.5, a, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#C81E24';
    ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFE88A'; ctx.lineWidth = 2; ctx.stroke();

    // 上下對稱柔美祥雲雲頭（每段獨立路徑，絕無多餘連線！）
    [-1, 1].forEach((dir) => {
      const y0 = dir * 64;
      ctx.strokeStyle = '#F6CE5B';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      // 雲心圓拱
      ctx.beginPath();
      ctx.arc(0, y0, 18, dir < 0 ? Math.PI : 0, dir < 0 ? 0 : Math.PI);
      ctx.stroke();
      // 左右小雲捲
      [-24, 24].forEach((ox) => {
        ctx.beginPath();
        ctx.arc(ox, y0 + dir * 4, 11, 0, Math.PI * 2);
        ctx.stroke();
      });
      // 中央垂珠小點
      ctx.fillStyle = '#FFE88A';
      ctx.beginPath(); ctx.arc(0, y0 - dir * 20, 4.5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  };
  drawAuspiciousCloudLotus(346, 232);
  drawAuspiciousCloudLotus(678, 232);

  // 底部華麗金黃垂墜流蘇穗帶
  ctx.fillStyle = '#D9A430';
  ctx.fillRect(0, 428, 1024, 18);
  for (let x = 6; x < 1024; x += 14) {
    ctx.fillStyle = x % 28 === 6 ? '#FCE068' : '#E2AF36';
    ctx.fillRect(x, 446, 8, 62);
  }

  _cachedTableClothTex = makeCanvasTexture(canvas);
  return _cachedTableClothTex;
}

/**
 * 20. ★ V28 超柔軟輕薄絲絨布面拜墊紋理（自然布面微皺＋柔和漸層光影＋圓潤細金包邊，零硬塊塑膠感！）
 */
let _cachedSoftCushionTex = null;
export function createSoftCushionTexture() {
  if (_cachedSoftCushionTex) return _cachedSoftCushionTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 溫潤柔霧暗紅絲絨布面（中央柔和受光、四周輕柔收暗呈現蓬軟微鼓感！）
  const g = ctx.createRadialGradient(256, 246, 18, 256, 256, 305);
  g.addColorStop(0, '#DE5950');
  g.addColorStop(0.45, '#CA3F38');
  g.addColorStop(0.80, '#A82A25');
  g.addColorStop(1, '#7D1B18');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);

  // 細緻平織絲絨纖維肌理（純布面柔霧觸感）
  for (let i = 0; i < 3200; i++) {
    const x = (i * 137 + (i % 29) * 17) % 512;
    const y = (i * 223 + (i % 31) * 13) % 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 228, 214, 0.055)' : 'rgba(65, 12, 12, 0.06)';
    ctx.fillRect(x, y, 2, 1.5);
  }

  // 極淡柔美暗花團蓮（取代死板硬格紋，展現廟宇軟布坐墊的優雅柔軟！）
  ctx.strokeStyle = 'rgba(255, 214, 150, 0.16)';
  ctx.lineWidth = 2.5;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(256 + Math.cos(a) * 68, 256 + Math.sin(a) * 68, 42, 22, a, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 圓潤細緻的軟金線滾邊（大圓角曲線，絕不方硬！）
  const drawRoundBorder = (pad, r, lw, col) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.roundRect(pad, pad, 512 - pad * 2, 512 - pad * 2, r);
    ctx.stroke();
  };
  drawRoundBorder(24, 54, 6, 'rgba(244, 206, 114, 0.62)');
  drawRoundBorder(36, 46, 2, 'rgba(255, 232, 165, 0.34)');

  // 中央極輕微軟布拉扣凹陷柔影
  const dimple = ctx.createRadialGradient(256, 256, 4, 256, 256, 42);
  dimple.addColorStop(0, 'rgba(68, 12, 12, 0.34)');
  dimple.addColorStop(0.55, 'rgba(98, 18, 16, 0.12)');
  dimple.addColorStop(1, 'rgba(98, 18, 16, 0)');
  ctx.fillStyle = dimple;
  ctx.beginPath(); ctx.arc(256, 256, 42, 0, Math.PI * 2); ctx.fill();

  _cachedSoftCushionTex = makeCanvasTexture(canvas);
  return _cachedSoftCushionTex;
}

/**
 * 21. ★ V27 籤筒專用紅紙書法標籤（「籤筒」）
 */
export function createFortuneTubeLabelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#C81E1E';
  ctx.fillRect(0, 0, 256, 512);
  ctx.strokeStyle = '#FAD364';
  ctx.lineWidth = 12;
  ctx.strokeRect(14, 14, 228, 484);
  ctx.lineWidth = 4;
  ctx.strokeRect(26, 26, 204, 460);

  ctx.fillStyle = '#1C0D06';
  ctx.font = '900 132px "DFKai-SB", "Noto Serif TC", "Microsoft JhengHei", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('籤', 128, 165);
  ctx.fillText('筒', 128, 355);

  return makeCanvasTexture(canvas);
}


/**
 * 22. ★ V32 平安符陳列桌專用「橫式暖白文創介紹牌貼圖」（典雅溫潤展架設計，絕不像神主牌！左側繪製繡金平安符袋＋「觀音佛祖印／代天巡狩印」朱砂方印！）
 */
export function createMiniTalismanTexture(variant = 'guanyin') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');

  const isGuanyin = variant === 'guanyin';
  const mainCol = isGuanyin ? '#165B4A' : '#9B191E';
  const accentCol = isGuanyin ? '#227C65' : '#C42428';
  // ★ V33 拿掉「之印」，改為大字超粗體「觀音佛祖」／「代天巡狩」，一眼清晰俐落！
  const sealLines = isGuanyin ? ['觀音', '佛祖'] : ['代天', '巡狩'];

  // 典雅米白宣紙橫式展板底色
  const bg = ctx.createLinearGradient(0, 0, 512, 320);
  bg.addColorStop(0, '#FFFDF7');
  bg.addColorStop(1, '#F5E9D0');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 320);

  // 典雅細緻雙線金框＋四角雲紋小飾
  ctx.strokeStyle = '#C9963A';
  ctx.lineWidth = 6;
  drawRoundRect(ctx, 12, 12, 488, 296, 18);
  ctx.stroke();
  ctx.strokeStyle = mainCol;
  ctx.lineWidth = 2.5;
  drawRoundRect(ctx, 22, 22, 468, 276, 12);
  ctx.stroke();

  // 左側：精美台灣傳統刺繡平安符香火袋圖示（含上端紅金掛繩、八角繡袋、下方流蘇與「觀音佛祖印／代天巡狩印」朱印！）
  const px = 114;
  const py = 158;
  // 掛繩弧線
  ctx.strokeStyle = '#C81E1E';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(px - 18, py - 74);
  ctx.quadraticCurveTo(px, py - 120, px + 18, py - 74);
  ctx.stroke();
  // 八角刺繡平安符袋本體
  ctx.fillStyle = mainCol;
  ctx.strokeStyle = '#F2C94C';
  ctx.lineWidth = 5;
  drawRoundRect(ctx, px - 58, py - 74, 116, 148, 22);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 232, 152, 0.72)';
  ctx.lineWidth = 2;
  drawRoundRect(ctx, px - 49, py - 65, 98, 130, 16);
  ctx.stroke();

  // 符袋上方小字「德慈宮」
  ctx.fillStyle = '#FFE994';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 18px "DFKai-SB", "Noto Serif TC", serif';
  ctx.fillText('德 慈 宮', px, py - 46);

  // 符袋中央醒目粗體方印（「觀音佛祖」／「代天巡狩」，取消「之印」，加粗加大更清晰！）
  ctx.fillStyle = '#FFF9E8';
  ctx.strokeStyle = '#B91C1C';
  ctx.lineWidth = 4.5;
  drawRoundRect(ctx, px - 38, py - 24, 76, 72, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#B91C1C';
  ctx.strokeStyle = '#B91C1C';
  ctx.lineWidth = 1.4;
  ctx.font = '900 28px "Microsoft JhengHei", "Noto Sans TC", "DFKai-SB", sans-serif';
  sealLines.forEach((ln, li) => {
    const ty = py - 3 + li * 30;
    ctx.strokeText(ln, px, ty);
    ctx.fillText(ln, px, ty);
  });

  // 符袋下方金珠與紅流蘇
  ctx.fillStyle = '#F2C94C';
  ctx.beginPath(); ctx.arc(px, py + 82, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#C81E1E';
  ctx.fillRect(px - 6, py + 88, 12, 26);

  // 右側：清晰橫排介紹文案
  ctx.textAlign = 'left';
  ctx.fillStyle = mainCol;
  ctx.fillRect(200, 44, 138, 30);
  ctx.fillStyle = '#FFFDF5';
  ctx.font = '900 16px "Microsoft JhengHei", sans-serif';
  ctx.fillText('玉勅代天府德慈宮', 208, 60);

  ctx.fillStyle = '#24120A';
  ctx.font = '900 32px "Microsoft JhengHei", "Noto Serif TC", sans-serif';
  ctx.fillText(isGuanyin ? '觀音佛祖平安符' : '代天巡狩平安符', 200, 114);

  ctx.fillStyle = accentCol;
  ctx.font = '900 22px "Microsoft JhengHei", sans-serif';
  ctx.fillText(isGuanyin ? '觀音佛祖・出入平安' : '代天巡狩・順遂吉慶', 200, 158);

  ctx.fillStyle = '#52341F';
  ctx.font = '700 17px "Microsoft JhengHei", sans-serif';
  ctx.fillText(isGuanyin ? '慈悲護佑・出入平安消災' : '威靈顯赫・順遂闔家吉慶', 200, 200);

  // 底部溫馨指引條
  ctx.fillStyle = '#FEF3C7';
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 2;
  drawRoundRect(ctx, 200, 232, 272, 42, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#92400E';
  ctx.font = '900 16px "Microsoft JhengHei", sans-serif';
  ctx.fillText('求符請至旁功德箱投100功德', 214, 254);

  return makeCanvasTexture(canvas);
}

/**
 * 22B. ★ V32 實體 3D 刺繡平安符袋布面紋理（繡金滾邊＋「觀音佛祖印／代天巡狩印」朱砂方印！）
 */
export function createTalismanPouchTexture(variant = 'guanyin') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const isGuanyin = variant === 'guanyin';

  const bg = ctx.createRadialGradient(128, 128, 18, 128, 128, 140);
  if (isGuanyin) {
    bg.addColorStop(0, '#1D7A63');
    bg.addColorStop(1, '#0F4A3B');
  } else {
    bg.addColorStop(0, '#CC252B');
    bg.addColorStop(1, '#7D1014');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 256);

  // 織錦斜紋
  ctx.strokeStyle = 'rgba(255, 230, 150, 0.14)';
  ctx.lineWidth = 2;
  for (let i = -256; i < 512; i += 16) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 256, 256); ctx.stroke();
  }

  // 金絲雙繡框
  ctx.strokeStyle = '#F7D262';
  ctx.lineWidth = 10;
  drawRoundRect(ctx, 14, 14, 228, 228, 34);
  ctx.stroke();
  ctx.lineWidth = 3;
  drawRoundRect(ctx, 28, 28, 200, 200, 24);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFE994';
  ctx.font = '900 28px "DFKai-SB", "Noto Serif TC", serif';
  ctx.fillText('德 慈 宮', 128, 56);

  // ★ V33 取消「之印」，中央方印改以特粗大字清晰呈現「觀音佛祖」／「代天巡狩」！
  ctx.fillStyle = '#FFF9E8';
  ctx.strokeStyle = '#B91C1C';
  ctx.lineWidth = 7;
  drawRoundRect(ctx, 56, 80, 144, 128, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#B91C1C';
  ctx.strokeStyle = '#B91C1C';
  ctx.lineWidth = 2.6;
  ctx.font = '900 50px "Microsoft JhengHei", "Noto Sans TC", "DFKai-SB", sans-serif';
  const lines = isGuanyin ? ['觀音', '佛祖'] : ['代天', '巡狩'];
  lines.forEach((ln, idx) => {
    const ty = 118 + idx * 54;
    ctx.strokeText(ln, 128, ty);
    ctx.fillText(ln, 128, ty);
  });

  return makeCanvasTexture(canvas);
}

/**
 * 22C. ★ V32 壽桃塔專用「大紅金邊圓形『壽』字貼紙」貼圖
 */
let _cachedShouStickerTex = null;
export function createShouStickerTexture() {
  if (_cachedShouStickerTex) return _cachedShouStickerTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);

  // 喜氣正紅圓底＋金絲雙圈邊框
  const g = ctx.createRadialGradient(128, 112, 16, 128, 128, 122);
  g.addColorStop(0, '#E11D2E');
  g.addColorStop(1, '#99121B');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(128, 128, 120, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = '#FAD364';
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.arc(128, 128, 112, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#FFF3B0';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(128, 128, 98, 0, Math.PI * 2); ctx.stroke();

  // 中央蒼勁燙金「壽」字楷書
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 132px "DFKai-SB", "BiauKai", "Noto Serif TC", serif';
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#5E0B0E';
  ctx.strokeText('壽', 128, 134);
  ctx.fillStyle = '#FFE97F';
  ctx.fillText('壽', 128, 134);

  _cachedShouStickerTex = makeCanvasTexture(canvas);
  return _cachedShouStickerTex;
}


/**
 * 23. ★ V27 廟內東側「服務台」招牌貼圖
 */
export function createServiceDeskSignTexture(compact = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = compact ? 192 : 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#8E1515';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#FAD364';
  ctx.lineWidth = 12;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  ctx.lineWidth = 3;
  ctx.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);

  ctx.fillStyle = '#FFE985';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (compact) {
    ctx.font = '900 92px "DFKai-SB", "Noto Serif TC", "Microsoft JhengHei", serif';
    ctx.fillText('服 務 台', 256, 98);
  } else {
    ctx.font = '900 34px "Noto Serif TC", serif';
    ctx.fillText('玉勅代天府德慈宮', 256, 62);
    ctx.font = '900 84px "DFKai-SB", "Noto Serif TC", "Microsoft JhengHei", serif';
    ctx.fillText('服 務 台', 256, 146);
    ctx.fillStyle = '#FFF7DA';
    ctx.font = '700 24px "Microsoft JhengHei", sans-serif';
    ctx.fillText('參拜指引・點燈諮詢・平安結緣', 256, 212);
  }

  return makeCanvasTexture(canvas);
}


/**
 * 24. ★ V28 淑芬石桌專用「暖白大理石・淡金祥雲蓮紋桌面貼圖」（溫潤雅致配色！）
 */
let _cachedStoneTableTex = null;
export function createStoneTableTopTexture() {
  if (_cachedStoneTableTex) return _cachedStoneTableTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 溫潤象牙暖白天然大理石底色
  const g = ctx.createRadialGradient(256, 256, 20, 256, 256, 260);
  g.addColorStop(0, '#F7F3EA');
  g.addColorStop(0.72, '#EAE2D3');
  g.addColorStop(1, '#D8CEBC');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);

  // 細膩暖灰金大理石天然石脈紋
  ctx.strokeStyle = 'rgba(155, 142, 122, 0.22)';
  ctx.lineWidth = 2.2;
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.moveTo((i * 71) % 512, 0);
    ctx.bezierCurveTo((i * 130) % 512, 160, (i * 95 + 120) % 512, 340, (i * 83 + 200) % 512, 512);
    ctx.stroke();
  }

  // 外環淡雅青玉金線鑲圈與雅致石雕雲紋邊
  ctx.strokeStyle = '#C9A45A';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(256, 256, 224, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#7A968E';
  ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(256, 256, 208, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#D9BC7A';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(256, 256, 194, 0, Math.PI * 2); ctx.stroke();

  // 中央典雅淺雕蓮瓣紋
  ctx.strokeStyle = 'rgba(148, 124, 76, 0.24)';
  ctx.lineWidth = 2;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(256 + Math.cos(a) * 145, 256 + Math.sin(a) * 145, 26, 12, a, 0, Math.PI * 2);
    ctx.stroke();
  }

  _cachedStoneTableTex = makeCanvasTexture(canvas);
  return _cachedStoneTableTex;
}

/**
 * 25. ★ V28 台灣天然紅木杯筊平面「原木年輪木紋貼圖」
 */
let _cachedBeiWoodTex = null;
export function createBeiWoodTexture() {
  if (_cachedBeiWoodTex) return _cachedBeiWoodTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 256, 128);
  g.addColorStop(0, '#EED6A8');
  g.addColorStop(0.5, '#E2BE84');
  g.addColorStop(1, '#D3A868');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 128);

  // 細緻順流竹木纖維年輪線條
  for (let y = 4; y < 128; y += 7) {
    ctx.strokeStyle = y % 14 === 4 ? 'rgba(138, 88, 38, 0.26)' : 'rgba(176, 124, 66, 0.18)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(128, y + Math.sin(y * 0.14) * 9, 256, y);
    ctx.stroke();
  }

  _cachedBeiWoodTex = makeCanvasTexture(canvas);
  return _cachedBeiWoodTex;
}

/**
 * 26. ★ V28 神明長黑髯「真髮絲絨感毛髮紋理」（細密黑髮絲與自然柔光高光，告別整塊黑鐵塊！）
 */
let _cachedBeardHairTex = null;
export function createBeardHairTexture() {
  if (_cachedBeardHairTex) return _cachedBeardHairTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#141212');
  g.addColorStop(0.55, '#1D1A1B');
  g.addColorStop(1, '#262224');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 512);

  // 數百根縱向細絲毛髮光澤紋（營造真髮飄逸分縷層次！）
  for (let i = 0; i < 240; i++) {
    const x = (i / 240) * 256 + Math.sin(i * 1.7) * 1.5;
    const isHighlight = i % 5 === 0;
    const isSilverHint = i % 23 === 0;
    ctx.strokeStyle = isSilverHint
      ? 'rgba(150, 146, 152, 0.36)'
      : isHighlight
        ? 'rgba(92, 86, 90, 0.44)'
        : 'rgba(10, 8, 9, 0.72)';
    ctx.lineWidth = isHighlight ? 1.4 : 1.1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(
      x + Math.sin(i * 0.6) * 5, 170,
      x - Math.sin(i * 0.6) * 5, 340,
      x + Math.sin(i * 0.9) * 3, 512
    );
    ctx.stroke();
  }

  _cachedBeardHairTex = makeCanvasTexture(canvas);
  return _cachedBeardHairTex;
}

/**
 * 27. ★ V29 大榕樹下石桌專用「暖白大理石・精刻中國象棋盤（楚河漢界）桌面貼圖」
 */
let _cachedChessTableTex = null;
export function createChessBoardTableTexture() {
  if (_cachedChessTableTex) return _cachedChessTableTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 溫潤象牙暖白大理石桌面底色
  const g = ctx.createRadialGradient(256, 256, 20, 256, 256, 260);
  g.addColorStop(0, '#F6F1E6');
  g.addColorStop(0.75, '#E9E0CF');
  g.addColorStop(1, '#D5CAB6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);

  // 天然大理石淡暖紋
  ctx.strokeStyle = 'rgba(155, 140, 118, 0.20)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo((i * 73) % 512, 0);
    ctx.bezierCurveTo((i * 120) % 512, 170, (i * 90 + 130) % 512, 350, (i * 80 + 210) % 512, 512);
    ctx.stroke();
  }

  // 外環青玉金線飾環
  ctx.strokeStyle = '#C9A45A';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(256, 256, 236, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#6E8E84';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(256, 256, 224, 0, Math.PI * 2); ctx.stroke();

  // 中央嵌入深檀色線刻「中國象棋棋盤」（左右兩位阿伯分別坐於西側與東側，楚河漢界沿上下方向垂直分隔！）
  const bx = 96;
  const by = 112;
  const bw = 320; // 9 格寬（沿 X：楚河漢界在中央）
  const bh = 288; // 8 格高（沿 Z）
  ctx.fillStyle = '#EBD7B4';
  ctx.fillRect(bx - 16, by - 16, bw + 32, bh + 32);
  ctx.strokeStyle = '#5A321A';
  ctx.lineWidth = 4;
  ctx.strokeRect(bx - 10, by - 10, bw + 20, bh + 20);
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, bw, bh);

  const stepX = bw / 9;
  const stepY = bh / 8;
  // 垂直線（共 10 條：含左右兩側與楚河漢界兩緣）
  for (let c = 1; c < 9; c++) {
    const x = bx + c * stepX;
    ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x, by + bh); ctx.stroke();
  }
  // 水平線（楚河漢界中央留白不貫穿！）
  for (let r = 1; r < 8; r++) {
    const y = by + r * stepY;
    ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx + 4 * stepX, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + 5 * stepX, y); ctx.lineTo(bx + bw, y); ctx.stroke();
  }
  // 左右兩側九宮格斜線
  const drawPalace = (px) => {
    ctx.beginPath();
    ctx.moveTo(px, by + 3 * stepY); ctx.lineTo(px + 2 * stepX, by + 5 * stepY);
    ctx.moveTo(px + 2 * stepX, by + 3 * stepY); ctx.lineTo(px, by + 5 * stepY);
    ctx.stroke();
  };
  drawPalace(bx);
  drawPalace(bx + 7 * stepX);

  // 楚河・漢界書法字樣
  ctx.fillStyle = '#5A321A';
  ctx.font = '900 22px "DFKai-SB", "Noto Serif TC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ['楚', '河', '漢', '界'].forEach((ch, idx) => {
    ctx.fillText(ch, bx + 4.5 * stepX, by + (idx < 2 ? 1.4 + idx * 1.15 : 3.25 + idx * 1.15) * stepY);
  });

  _cachedChessTableTex = makeCanvasTexture(canvas);
  return _cachedChessTableTex;
}

/**
 * 28. ★ V29 古樸精雕香爐浮雕花紋貼圖（雙龍搶珠＋古銅雲雷回紋＋「德慈宮」金雕銘文！）
 */
let _cachedCenserReliefTex = null;
export function createCarvedCenserReliefTexture() {
  if (_cachedCenserReliefTex) return _cachedCenserReliefTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // 古錫青銅深灰底色
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#5B564C');
  g.addColorStop(0.5, '#46433D');
  g.addColorStop(1, '#312F2B');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);

  // 上下古銅萬字雲雷回紋帶
  ctx.strokeStyle = '#C9A252';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 492, 236);
  ctx.lineWidth = 2.5;
  ctx.strokeRect(20, 22, 472, 212);
  ctx.strokeStyle = 'rgba(218, 178, 92, 0.72)';
  ctx.lineWidth = 2.5;
  for (let x = 28; x < 484; x += 28) {
    // 頂底回字雲雷紋
    [32, 206].forEach((y) => {
      ctx.strokeRect(x, y, 18, 14);
      ctx.strokeRect(x + 5, y + 4, 8, 6);
    });
  }

  // 中央「德慈宮」雕金扁額與左右雲龍捲紋
  ctx.fillStyle = 'rgba(218, 174, 78, 0.16)';
  ctx.fillRect(166, 74, 180, 108);
  ctx.strokeStyle = '#E5BE62';
  ctx.lineWidth = 4;
  ctx.strokeRect(166, 74, 180, 108);
  ctx.fillStyle = '#F2D27C';
  ctx.font = '900 44px "DFKai-SB", "Noto Serif TC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('德 慈 宮', 256, 129);

  // 左右雕花雙龍祥雲捲草
  ctx.strokeStyle = '#DFB658';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  [92, 420].forEach((cx, sideIdx) => {
    const dir = sideIdx === 0 ? 1 : -1;
    // 如意龍身捲紋
    ctx.beginPath();
    ctx.moveTo(cx - dir * 48, 152);
    ctx.bezierCurveTo(cx - dir * 32, 92, cx + dir * 24, 92, cx + dir * 44, 128);
    ctx.bezierCurveTo(cx + dir * 24, 162, cx - dir * 16, 164, cx - dir * 6, 128);
    ctx.stroke();
    // 龍眼火珠
    ctx.fillStyle = '#F6D87E';
    ctx.beginPath(); ctx.arc(cx + dir * 36, 118, 6, 0, Math.PI * 2); ctx.fill();
    // 上下點綴祥雲小捲
    ctx.beginPath(); ctx.arc(cx - dir * 18, 92, 10, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + dir * 14, 164, 10, 0, Math.PI); ctx.stroke();
  });

  _cachedCenserReliefTex = makeCanvasTexture(canvas);
  return _cachedCenserReliefTex;
}


/**
 * ★ V32 旺來鳳梨無縫菱格果目紋理（修正 RepeatWrapping，上下果身 100% 均勻菱格果眼，徹底消除上半部西瓜條紋！）
 */
export function createPineappleSkinTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // 均勻溫潤金黃鳳梨果皮底色（無縫平鋪不出現接縫色差）
  ctx.fillStyle = '#E8A512';
  ctx.fillRect(0, 0, 256, 256);

  const step = 32;
  // 每個菱格加上立體微凸暖金漸層與深褐果目
  for (let y = 0; y < 256; y += step) {
    for (let x = 0; x < 256; x += step) {
      const cx = x + step * 0.5;
      const cy = y + step * 0.5;
      const cellG = ctx.createRadialGradient(cx, cy - 3, 2, cx, cy, step * 0.58);
      cellG.addColorStop(0, '#FDE058');
      cellG.addColorStop(0.65, '#E49B0E');
      cellG.addColorStop(1, '#9E5406');
      ctx.fillStyle = cellG;
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(x + step, cy);
      ctx.lineTo(cx, y + step);
      ctx.lineTo(x, cy);
      ctx.closePath();
      ctx.fill();

      // 鱗片中心深琥珀果眼
      ctx.fillStyle = '#6E3505';
      ctx.beginPath(); ctx.arc(cx, cy + 2, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFF2A6';
      ctx.beginPath(); ctx.arc(cx, cy - 4, 2.2, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.strokeStyle = '#7C3E05';
  ctx.lineWidth = 2.6;
  for (let i = -256; i <= 512; i += step) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 256, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i + 256, 0); ctx.lineTo(i, 256); ctx.stroke();
  }

  const tex = makeCanvasTexture(canvas, true);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

/**
 * ★ V32 金色天公爐亭蓋「六面均勻直條筒瓦浮雕紋理」（設定 RepeatWrapping × 6，確保六角屋頂 6 面全數整齊清晰！）
 */
export function createGoldRoofRidgeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#F6CE62');
  g.addColorStop(0.65, '#DA9F2A');
  g.addColorStop(1, '#A67016');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);

  // 每面 8 道清晰立體金色筒瓦（repeat.x = 6 → 六角 6 面完全對稱一致！）
  const cols = 8;
  const cw = 256 / cols;
  for (let i = 0; i < cols; i++) {
    const x = i * cw;
    const rg = ctx.createLinearGradient(x, 0, x + cw, 0);
    rg.addColorStop(0, 'rgba(88, 50, 6, 0.62)');
    rg.addColorStop(0.30, 'rgba(255, 244, 185, 0.52)');
    rg.addColorStop(0.58, 'rgba(235, 184, 66, 0.16)');
    rg.addColorStop(1, 'rgba(72, 42, 6, 0.58)');
    ctx.fillStyle = rg;
    ctx.fillRect(x, 0, cw, 256);
  }
  ctx.strokeStyle = 'rgba(98, 58, 8, 0.34)';
  ctx.lineWidth = 2;
  for (let y = 36; y < 224; y += 34) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
  }
  ctx.fillStyle = '#FFF2AE';
  for (let i = 0; i < cols; i++) {
    ctx.beginPath();
    ctx.arc(i * cw + cw * 0.5, 242, cw * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = makeCanvasTexture(canvas, true);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(6, 1);
  return tex;
}

/**
 * ★ V31 廟埕文創攤位「經典直條紋帆布遮陽棚貼圖」（自然條紋＋柔和布面摺痕陰影！）
 */
export function createStripedAwningTexture(mainHex = '#D97706', stripeHex = '#FFF6DE') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const stripes = 12;
  const sw = 512 / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? mainHex : stripeHex;
    ctx.fillRect(i * sw, 0, sw + 1, 256);
    // 細緻帆布直向凹凸縫線光影
    const sh = ctx.createLinearGradient(i * sw, 0, (i + 1) * sw, 0);
    sh.addColorStop(0, 'rgba(0,0,0,0.12)');
    sh.addColorStop(0.5, 'rgba(255,255,255,0.08)');
    sh.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = sh;
    ctx.fillRect(i * sw, 0, sw, 256);
  }
  // 橫向帆布織紋與底緣荷葉邊陰影
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 2;
  for (let y = 24; y < 256; y += 28) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
  }
  const tex = makeCanvasTexture(canvas, true);
  return tex;
}

/**
 * ★ V35 寫實傳統木雕神像專屬：香火燻黑古樟木神椅木紋貼圖（溫潤包漿深棕黑木質肌理！）
 */
let _cachedAntiqueWoodV35 = null;
export function createAntiqueCarvedWoodTextureV35() {
  if (_cachedAntiqueWoodV35) return _cachedAntiqueWoodV35;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 256, 256);
  g.addColorStop(0, '#5A4032');
  g.addColorStop(0.45, '#463126');
  g.addColorStop(1, '#332219');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);

  // 細膩深棕木纖維年輪紋與溫潤包漿高光
  for (let i = 0; i < 64; i++) {
    const y = i * 4;
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(20, 10, 6, 0.34)' : i % 3 === 1 ? 'rgba(138, 98, 72, 0.20)' : 'rgba(38, 22, 14, 0.24)';
    ctx.lineWidth = 1.2 + (i % 3) * 0.7;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(85, y + Math.sin(i * 0.38) * 6, 170, y - Math.cos(i * 0.31) * 6, 256, y);
    ctx.stroke();
  }
  for (let i = 0; i < 420; i++) {
    const px = (i * 73) % 256;
    const py = (i * 139) % 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 224, 188, 0.045)' : 'rgba(12, 6, 4, 0.09)';
    ctx.fillRect(px, py, 3, 1.5);
  }

  const tex = makeCanvasTexture(canvas, true, false);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  _cachedAntiqueWoodV35 = tex;
  return tex;
}

/**
 * ★ V35 神椅底座正前方「纏枝牡丹浮雕古木板貼圖」
 */
let _cachedPlinthReliefV35 = null;
export function createWoodPlinthReliefTextureV35() {
  if (_cachedPlinthReliefV35) return _cachedPlinthReliefV35;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#38271E';
  ctx.fillRect(0, 0, 512, 128);

  // 凹雕木框線
  ctx.strokeStyle = '#6E4F3D';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 492, 108);
  ctx.strokeStyle = '#20150F';
  ctx.lineWidth = 4;
  ctx.strokeRect(18, 18, 476, 92);

  // 中央浮雕蓮花牡丹 ＋ 左右卷草唐草浮雕
  const drawFlower = (cx, cy, r) => {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.fillStyle = '#6B4E3C';
      ctx.strokeStyle = '#241711';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.56, r * 0.42, r * 0.24, a, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#82614B';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
  };
  drawFlower(256, 64, 34);
  drawFlower(112, 64, 22);
  drawFlower(400, 64, 22);

  // 卷草捲雲藤蔓浮雕
  [-1, 1].forEach((s) => {
    ctx.strokeStyle = '#735340';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(256 + s * 40, 64);
    ctx.bezierCurveTo(256 + s * 78, 30, 256 + s * 102, 98, 256 + s * 140, 64);
    ctx.bezierCurveTo(256 + s * 168, 36, 256 + s * 195, 92, 256 + s * 224, 58);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 224, 188, 0.24)';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  const tex = makeCanvasTexture(canvas, true, false);
  _cachedPlinthReliefV35 = tex;
  return tex;
}

/**
 * ★ V35 寫實傳統香火燻黑木雕開面貼圖（嚴格比照參考圖：左尊慈祥深棕燻黑木面 / 中尊無鬚清秀英氣深棕面 / 右尊威嚴漆黑燻木面！）
 */
export function createDeityFaceTextureV35(variant = 'leftMother') {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  const isMother = variant === 'leftMother';
  const isCenter = variant === 'centerKing';
  const isRight = variant === 'rightBeardKing';

  // 香火燻黑深棕／深烏木漸層底色（溫潤包漿亮澤，讓眉眼五官在神龕暖光下清晰慈祥／威嚴！）
  const baseHi = isMother ? '#8A5E4B' : isCenter ? '#825B4A' : '#5E514C';
  const baseMid = isMother ? '#5C3B2E' : isCenter ? '#56392D' : '#3A312E';
  const baseDark = isMother ? '#2F1C15' : isCenter ? '#2C1B15' : '#1B1615';

  const g = ctx.createRadialGradient(512, 468, 60, 512, 512, 520);
  g.addColorStop(0, baseHi);
  g.addColorStop(0.58, baseMid);
  g.addColorStop(1, baseDark);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 1024);

  // 極細緻古樟木直向木紋與歲月包漿
  for (let x = 0; x < 1024; x += 6) {
    ctx.strokeStyle = x % 12 === 0 ? 'rgba(255, 224, 194, 0.038)' : 'rgba(8, 4, 2, 0.09)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + Math.sin(x * 0.025) * 9, 340, x - Math.cos(x * 0.025) * 9, 680, x, 1024);
    ctx.stroke();
  }

  // 木雕溫潤包漿高光（額頭、眉骨、顴骨、鼻樑、下巴）
  const drawSheen = (cx, cy, rx, ry, alpha) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    const sg = ctx.createRadialGradient(0, 0, 6, 0, 0, rx);
    sg.addColorStop(0, isRight ? `rgba(182, 166, 158, ${alpha})` : `rgba(226, 184, 156, ${alpha})`);
    sg.addColorStop(0.6, isRight ? `rgba(120, 106, 98, ${alpha * 0.4})` : `rgba(165, 118, 92, ${alpha * 0.45})`);
    sg.addColorStop(1, 'rgba(120, 90, 72, 0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  drawSheen(512, 372, 86, 52, isRight ? 0.28 : 0.34);
  drawSheen(432, 558, 46, 36, isRight ? 0.24 : 0.30);
  drawSheen(592, 558, 46, 36, isRight ? 0.24 : 0.30);
  drawSheen(512, 694, 42, 26, isRight ? 0.22 : 0.26);

  // 深邃眼窩與鼻翼陰影
  [-1, 1].forEach((s) => {
    const ex = 512 + s * 60;
    const sock = ctx.createRadialGradient(ex, 508, 10, ex, 508, 44);
    sock.addColorStop(0, 'rgba(8, 4, 2, 0.56)');
    sock.addColorStop(1, 'rgba(8, 4, 2, 0)');
    ctx.fillStyle = sock;
    ctx.beginPath();
    ctx.arc(ex, 508, 44, 0, Math.PI * 2);
    ctx.fill();

    // 法令紋陰影
    ctx.strokeStyle = 'rgba(12, 6, 4, 0.38)';
    ctx.lineWidth = isMother ? 3.5 : 4.5;
    ctx.beginPath();
    ctx.moveTo(512 + s * 28, 586);
    ctx.quadraticCurveTo(512 + s * 46, 616, 512 + s * 50, 648);
    ctx.stroke();
  });

  // 眉毛（寫實木雕漆眉）
  ctx.lineCap = 'round';
  if (isRight) {
    // 右尊眉心莊嚴微蹙紋
    ctx.strokeStyle = 'rgba(6, 4, 4, 0.72)';
    ctx.lineWidth = 4.5;
    [-9, 9].forEach((fx) => {
      ctx.beginPath();
      ctx.moveTo(512 + fx, 442);
      ctx.lineTo(512 + fx * 0.75, 474);
      ctx.stroke();
    });
  }
  [-1, 1].forEach((s) => {
    ctx.strokeStyle = isRight ? '#0B0908' : '#140B08';
    ctx.lineWidth = isMother ? 6.5 : isCenter ? 9.5 : 13;
    ctx.beginPath();
    if (isMother) {
      ctx.moveTo(512 + s * 22, 468);
      ctx.quadraticCurveTo(512 + s * 60, 446, 512 + s * 100, 470);
    } else if (isCenter) {
      ctx.moveTo(512 + s * 22, 466);
      ctx.quadraticCurveTo(512 + s * 60, 448, 512 + s * 102, 456);
    } else {
      ctx.moveTo(512 + s * 18, 472);
      ctx.quadraticCurveTo(512 + s * 60, 452, 512 + s * 106, 442);
    }
    ctx.stroke();

    // 寫實木雕神眼（沉靜微垂／炯炯神采，白眼仁帶柔和古木米灰調不刺眼！）
    const ex = 512 + s * 60;
    const ey = 510;
    ctx.strokeStyle = 'rgba(18, 10, 8, 0.65)';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(ex, ey + 10, 31, Math.PI * 1.18, Math.PI * 1.82);
    ctx.stroke();

    ctx.fillStyle = isRight ? '#C8BEB6' : '#DECFC2';
    ctx.beginPath();
    if (isMother) {
      // 慈祥微垂鳳眼
      ctx.moveTo(ex - s * 25, ey + 2);
      ctx.quadraticCurveTo(ex, ey - 10, ex + s * 26, ey + 1);
      ctx.quadraticCurveTo(ex, ey + 11, ex - s * 25, ey + 2);
    } else if (isCenter) {
      // 少年將軍清朗定目
      ctx.moveTo(ex - s * 24, ey + 1);
      ctx.quadraticCurveTo(ex, ey - 13, ex + s * 26, ey - 2);
      ctx.quadraticCurveTo(ex, ey + 12, ex - s * 24, ey + 1);
    } else {
      // 鎮殿王爺威嚴直視雙目
      ctx.moveTo(ex - s * 26, ey + 3);
      ctx.quadraticCurveTo(ex, ey - 12, ex + s * 28, ey - 5);
      ctx.quadraticCurveTo(ex, ey + 11, ex - s * 26, ey + 3);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#18100C';
    ctx.beginPath();
    ctx.arc(ex, ey, isMother ? 9.5 : 11.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#070504';
    ctx.beginPath();
    ctx.arc(ex, ey, isMother ? 6.0 : 7.5, 0, Math.PI * 2);
    ctx.fill();
    // 細小溫潤眼眸點光
    ctx.fillStyle = 'rgba(255, 248, 236, 0.78)';
    ctx.beginPath();
    ctx.arc(ex - 3.0, ey - 3.0, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // 上下雕刻眼瞼線
    ctx.strokeStyle = '#0A0605';
    ctx.lineWidth = isRight ? 6.5 : 4.8;
    ctx.beginPath();
    ctx.moveTo(ex - s * 26, ey + 2);
    ctx.quadraticCurveTo(ex, ey - (isMother ? 11 : 13), ex + s * 28, ey - (isRight ? 6 : 1));
    ctx.stroke();
  });

  // 鼻樑光影與鼻頭高光
  const noseG = ctx.createLinearGradient(504, 488, 520, 582);
  noseG.addColorStop(0, isRight ? 'rgba(170, 156, 148, 0.30)' : 'rgba(224, 184, 152, 0.36)');
  noseG.addColorStop(1, isRight ? 'rgba(192, 178, 168, 0.42)' : 'rgba(240, 200, 168, 0.48)');
  ctx.strokeStyle = noseG;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(512, 486);
  ctx.lineTo(512, 578);
  ctx.stroke();
  drawSheen(512, 578, 15, 10, isRight ? 0.30 : 0.38);

  // 古木本色微朱雕刻唇（符合香火燻黑木雕質感，不過度紅豔）
  ctx.fillStyle = isRight ? '#382522' : isMother ? '#763B32' : '#6A382E';
  ctx.beginPath();
  ctx.moveTo(478, 636);
  ctx.quadraticCurveTo(498, 624, 512, 630);
  ctx.quadraticCurveTo(526, 624, 546, 636);
  ctx.quadraticCurveTo(512, 654, 478, 636);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(18, 8, 6, 0.78)';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(478, 636);
  ctx.quadraticCurveTo(512, isMother ? 641 : 636, 546, 636);
  ctx.stroke();
  drawSheen(512, 642, 12, 4, 0.24);

  return makeCanvasTexture(canvas);
}

/**
 * ★ V35 寫實古金木雕與刺繡神衣戰甲貼圖
 * - leftMother: 古金絲刺繡帝后神袍（細密金線浮雕＋肩胸祥雲＋膝部微墨綠金紋點綴）
 * - centerKing: 橘金絲緞與魚鱗金甲戰袍（溫潤橘褐綢面＋精緻古金雲龍卷草刺繡）
 * - rightBeardKing: 黑烏底古金盤龍刺繡王爺神袍（炭黑底色＋高對比古金盤龍祥雲浮雕）
 */
export function createDeityRobeTextureV35(variant = 'leftMother') {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 0, 1024);
  if (variant === 'leftMother') {
    g.addColorStop(0, '#C89B42');
    g.addColorStop(0.50, '#9E7428');
    g.addColorStop(1, '#6C4B17');
  } else if (variant === 'centerKing') {
    g.addColorStop(0, '#D46E1E');
    g.addColorStop(0.50, '#B85414');
    g.addColorStop(1, '#84380C');
  } else {
    g.addColorStop(0, '#2A221E');
    g.addColorStop(0.50, '#1D1714');
    g.addColorStop(1, '#120E0C');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 1024);

  // 細密金線魚鱗／回字錦紋底繡
  ctx.strokeStyle = variant === 'rightBeardKing'
    ? 'rgba(218, 174, 84, 0.40)'
    : variant === 'centerKing'
      ? 'rgba(246, 206, 110, 0.44)'
      : 'rgba(255, 228, 146, 0.42)';
  ctx.lineWidth = variant === 'rightBeardKing' ? 3.5 : 3;
  for (let y = 44; y < 860; y += 36) {
    for (let x = 0; x < 1024; x += 42) {
      const ox = (Math.floor(y / 36) % 2) * 21;
      ctx.beginPath();
      ctx.arc(x + ox, y, 18, 0, Math.PI);
      ctx.stroke();
    }
  }

  // 古金盤龍與纏枝牡丹刺繡團紋
  const drawGoldDragonScroll = (cx, cy, r, accent = '#E9BE5B') => {
    ctx.save();
    ctx.strokeStyle = '#52340C';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.62, 0.25, Math.PI * 1.78);
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.fillStyle = '#F7DA84';
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r * 0.84, cy + Math.sin(a) * r * 0.84, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  if (variant === 'leftMother') {
    // 細密金絲直向繡紋 ＋ 膝部微墨綠古金紋飾（呼應參考圖左尊膝上深翠金花！）
    ctx.strokeStyle = 'rgba(72, 46, 10, 0.28)';
    ctx.lineWidth = 2.5;
    for (let x = 16; x < 1024; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, 60);
      ctx.lineTo(x, 760);
      ctx.stroke();
    }
    drawGoldDragonScroll(512, 300, 128, '#F4D072');
    // 左右膝部典雅墨綠金邊團花
    [256, 768].forEach((kx) => {
      ctx.fillStyle = 'rgba(42, 78, 52, 0.45)';
      ctx.beginPath();
      ctx.arc(kx, 620, 88, 0, Math.PI * 2);
      ctx.fill();
      drawGoldDragonScroll(kx, 620, 86, '#F2C964');
    });
  } else if (variant === 'centerKing') {
    // 橘金戰袍細密雲紋與金色捲草滾邊
    drawGoldDragonScroll(250, 560, 82, '#F7D272');
    drawGoldDragonScroll(774, 560, 82, '#F7D272');
    ctx.strokeStyle = '#F2C75C';
    ctx.lineWidth = 8;
    ctx.strokeRect(18, 22, 988, 980);
  } else {
    // 右尊黑底古金重工浮雕盤龍
    drawGoldDragonScroll(512, 340, 146, '#E2B44E');
    drawGoldDragonScroll(235, 620, 104, '#D9A742');
    drawGoldDragonScroll(789, 620, 104, '#D9A742');
    // 金色祥雲滿繡
    ctx.strokeStyle = '#D9A848';
    ctx.lineWidth = 5;
    for (let i = 0; i < 16; i++) {
      const cx = 64 + (i * 117) % 896;
      const cy = 110 + (i * 149) % 720;
      ctx.beginPath();
      ctx.arc(cx, cy, 22, Math.PI, 0);
      ctx.arc(cx + 22, cy, 16, Math.PI, 0);
      ctx.stroke();
    }
  }

  // 下擺古金海水江崖繡邊
  for (let i = 0; i < 10; i++) {
    const wx = 52 + i * 102;
    ctx.fillStyle = variant === 'rightBeardKing' ? '#3B2C1B' : '#8A5C18';
    ctx.beginPath();
    ctx.arc(wx, 1024, 58, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#EBC25E';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(wx, 1024, 38, Math.PI, 0);
    ctx.stroke();
  }

  ctx.fillStyle = '#E6B84C';
  ctx.fillRect(0, 0, 1024, 36);
  ctx.fillStyle = '#5C380C';
  ctx.fillRect(0, 36, 1024, 12);

  return makeCanvasTexture(canvas);
}

/**
 * ★ V35 高清傳統朱紅刺繡紅綾飄帶貼圖（正宗繁體金色楷書＋雙金絲錦邊＋底部祥雲金印圖騰！）
 */
export function createDeitySashTextureV35(text = '五年千歲祖廟') {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');

  // 濃郁正統朱紅絲緞布面橫向立體光澤
  const bg = ctx.createLinearGradient(0, 0, 160, 0);
  bg.addColorStop(0, '#8A1216');
  bg.addColorStop(0.18, '#B81C21');
  bg.addColorStop(0.50, '#CE2328');
  bg.addColorStop(0.82, '#B21B20');
  bg.addColorStop(1, '#7F1014');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 160, 640);

  // 柔軟布料自然明暗摺痕
  for (let y = 0; y < 640; y += 6) {
    const w = Math.sin(y * 0.048) * 0.075;
    ctx.fillStyle = w > 0 ? `rgba(255, 224, 200, ${w.toFixed(3)})` : `rgba(42, 4, 6, ${(-w).toFixed(3)})`;
    ctx.fillRect(0, y, 160, 6);
  }
  // 細密金邊外框與雙線繡紋
  ctx.strokeStyle = '#ECC052';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 8, 140, 624);
  ctx.strokeStyle = 'rgba(255, 232, 148, 0.62)';
  ctx.lineWidth = 2;
  ctx.strokeRect(19, 16, 122, 608);

  // 正宗粗體金線刺繡楷書文字（留出肩部上緣緩衝，確保 9～10 字宮廟全名完整呈現於正胸！）
  const chars = [...text];
  const topY = 66;
  const usableH = 458;
  const step = usableH / Math.max(chars.length, 1);
  const fontSize = chars.length <= 5 ? 50 : chars.length <= 7 ? 42 : chars.length <= 9 ? 38 : 34;
  ctx.font = `900 ${fontSize}px "DFKai-SB", "BiauKai", "Noto Serif TC", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  chars.forEach((ch, idx) => {
    const cy = topY + idx * step + step * 0.48;
    ctx.strokeStyle = 'rgba(72, 22, 4, 0.78)';
    ctx.lineWidth = 5;
    ctx.strokeText(ch, 80, cy);
    ctx.fillStyle = '#FFE07A';
    ctx.fillText(ch, 80, cy);
  });

  // 底部傳統祥雲／如意金印紋飾（收精巧不擠壓文字！）
  ctx.strokeStyle = '#F0C858';
  ctx.lineWidth = 3.5;
  ctx.strokeRect(42, 540, 76, 68);
  ctx.beginPath();
  ctx.arc(80, 574, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(54, 574); ctx.lineTo(106, 574);
  ctx.moveTo(80, 550); ctx.lineTo(80, 598);
  ctx.stroke();

  return makeCanvasTexture(canvas);
}

/**
 * ★ V37 博物館級台灣神明「金蔥盤線手工刺繡神袍貼圖」（1024×1024：細緻絲綢斜紋＋立體金蔥盤龍鳳牡丹＋五彩祥雲＋海水江崖繡邊！）
 * - leftMother: 杏金黃絲緞繡鳳牡丹帝后神袍
 * - centerKing: 橘金絲緞金蔥刺繡戰袍（腹部正中央精細刺繡威武金獅頭吞獸圖騰！）
 * - rightBeardKing: 深烏檀黑底重工金蔥盤龍王爺神袍
 */
const _cachedEmbroideryRobeV37 = {};
export function createDeityEmbroideryTextureV37(variant = 'leftMother') {
  if (_cachedEmbroideryRobeV37[variant]) return _cachedEmbroideryRobeV37[variant];
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // 1. 細膩高雅絲綢底色漸層
  const g = ctx.createLinearGradient(0, 0, 0, 1024);
  if (variant === 'leftMother') {
    g.addColorStop(0, '#D49E34');
    g.addColorStop(0.50, '#B57F20');
    g.addColorStop(1, '#7D5312');
  } else if (variant === 'centerKing') {
    g.addColorStop(0, '#EA761C');
    g.addColorStop(0.48, '#D25812');
    g.addColorStop(1, '#9A380B');
  } else {
    g.addColorStop(0, '#2B1F1B');
    g.addColorStop(0.50, '#1D1512');
    g.addColorStop(1, '#110C0A');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. 細密真絲緞面經緯斜紋織理（呈現真實布料光澤，徹底消除塑膠平滑感！）
  ctx.strokeStyle = variant === 'rightBeardKing' ? 'rgba(245, 205, 118, 0.08)' : 'rgba(255, 240, 195, 0.10)';
  ctx.lineWidth = 1.5;
  for (let i = -1024; i < 2048; i += 10) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 1024, 1024); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(20, 8, 2, 0.09)';
  for (let y = 0; y < 1024; y += 6) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
  }

  // 3. 滿幅精緻「金蔥盤線雲紋與如意菱格暗繡」
  // ★ V46 細緻重工雙層「盤金魚鱗雲錦暗花＋絲線鎖邊針腳」
  ctx.strokeStyle = variant === 'rightBeardKing' ? 'rgba(240, 194, 92, 0.36)' : 'rgba(255, 236, 152, 0.38)';
  ctx.lineWidth = 2.4;
  for (let y = 48; y < 860; y += 38) {
    const ox = (Math.floor(y / 38) % 2) * 24;
    for (let x = -24; x < 1050; x += 48) {
      ctx.beginPath();
      ctx.arc(x + ox, y, 21, 0.14, Math.PI - 0.14);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + ox, y + 5, 13, 0.22, Math.PI - 0.22);
      ctx.stroke();
      // 鱗心細金絲針腳點綴
      ctx.fillStyle = variant === 'rightBeardKing' ? 'rgba(250, 214, 118, 0.45)' : 'rgba(255, 246, 192, 0.48)';
      ctx.beginPath(); ctx.arc(x + ox, y + 2, 2.4, 0, Math.PI * 2); ctx.fill();
    }
  }
  // 細密金線斜紋回字錦織紋（近看布料紋路極度講究！）
  ctx.strokeStyle = variant === 'rightBeardKing' ? 'rgba(226, 175, 70, 0.11)' : 'rgba(255, 242, 195, 0.12)';
  ctx.lineWidth = 1.4;
  for (let i = -860; i < 1880; i += 22) {
    ctx.beginPath(); ctx.moveTo(i, 48); ctx.lineTo(i + 820, 868); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i + 820, 48); ctx.lineTo(i, 868); ctx.stroke();
  }

  // 4. 精工金蔥團龍／團鳳／纏枝牡丹刺繡圖騰函式
  const drawEmbroideredMedallion = (cx, cy, r, ringTint = '#FCE07A', coreTint = '#D92626') => {
    ctx.save();
    // 暗棕立體針腳底影
    ctx.strokeStyle = 'rgba(52, 22, 4, 0.65)';
    ctx.lineWidth = 11;
    ctx.beginPath(); ctx.arc(cx + 2, cy + 3, r, 0, Math.PI * 2); ctx.stroke();

    // 雙層金蔥盤線外框＋串珠繡邊
    ctx.strokeStyle = ringTint;
    ctx.lineWidth = 6.5;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#991B1B';
    ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.87, 0, Math.PI * 2); ctx.stroke();

    // 盤龍捲曲金身刺繡
    ctx.strokeStyle = '#FFF0A8';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.56, 0.2, Math.PI * 1.78); ctx.stroke();
    ctx.strokeStyle = '#D4921E';
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.56, 0.35, Math.PI * 1.65); ctx.stroke();

    // 龍鬚祥雲小枝
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      ctx.fillStyle = k % 2 === 0 ? '#FFF6BE' : '#F2B830';
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r * 0.93, cy + Math.sin(a) * r * 0.93, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // 中心火珠繡飾
    ctx.fillStyle = coreTint;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.19, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFF5B0';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  };

  // 五彩祥雲刺繡點綴
  const drawSilkCloud = (cx, cy, sc = 1, col = '#FCE074') => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    ctx.strokeStyle = 'rgba(54, 24, 6, 0.55)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(-18, 0, 16, Math.PI, 0);
    ctx.arc(2, -5, 20, Math.PI, 0);
    ctx.arc(22, 2, 14, Math.PI, 0);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  };

  if (variant === 'centerKing') {
    // ★ 中尊橘色金蔥刺繡戰袍：左右繡金盤龍團花 ＋ 上胸金線雲紋 ＋ 正腹中央（x=512, y=500）超細緻刺繡威武金獅頭！
    drawEmbroideredMedallion(210, 480, 74, '#FFE27A', '#C81E1E');
    drawEmbroideredMedallion(814, 480, 74, '#FFE27A', '#C81E1E');
    drawEmbroideredMedallion(260, 740, 62, '#F7CE5B', '#15803D');
    drawEmbroideredMedallion(764, 740, 62, '#F7CE5B', '#15803D');

    // 上胸金蔥祥雲如意紋
    [280, 512, 744].forEach((cx) => drawSilkCloud(cx, 190, 1.35, '#FFE88A'));
    [160, 864].forEach((cx) => drawSilkCloud(cx, 330, 1.1, '#7DD3FC'));

    // 正腹部「金線刺繡威武雄獅頭」
    const lx = 512;
    const ly = 510;
    const glow = ctx.createRadialGradient(lx, ly, 36, lx, ly, 195);
    glow.addColorStop(0, 'rgba(255, 240, 162, 0.36)');
    glow.addColorStop(1, 'rgba(255, 200, 80, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(lx, ly, 195, 0, Math.PI * 2); ctx.fill();

    // 16 朵立體金絲捲雲獅鬃
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const mx = lx + Math.cos(a) * 132;
      const my = ly + Math.sin(a) * 120;
      ctx.fillStyle = i % 2 === 0 ? '#FAD25A' : '#E29E26';
      ctx.strokeStyle = '#6B2808';
      ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.arc(mx, my, 36, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#FFF6BF';
      ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.arc(mx, my, 20, a, a + Math.PI * 1.45); ctx.stroke();
    }
    // 雄獅金面
    const fG = ctx.createRadialGradient(lx, ly - 16, 16, lx, ly, 122);
    fG.addColorStop(0, '#FFF0A0');
    fG.addColorStop(0.62, '#EBB432');
    fG.addColorStop(1, '#AD6410');
    ctx.fillStyle = fG;
    ctx.strokeStyle = '#5E2006';
    ctx.lineWidth = 6.5;
    ctx.beginPath(); ctx.ellipse(lx, ly, 114, 102, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // 獅額紅金刺繡「王」字
    ctx.strokeStyle = '#B91C1C'; ctx.lineWidth = 9.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lx - 34, ly - 68); ctx.lineTo(lx + 34, ly - 68);
    ctx.moveTo(lx - 26, ly - 48); ctx.lineTo(lx + 26, ly - 48);
    ctx.moveTo(lx - 34, ly - 28); ctx.lineTo(lx + 34, ly - 28);
    ctx.moveTo(lx, ly - 70); ctx.lineTo(lx, ly - 26);
    ctx.stroke();

    // 翠綠金捲獅眉 ＋ 炯炯雙目
    [-1, 1].forEach((s) => {
      ctx.strokeStyle = '#15803D'; ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(lx + s * 16, ly - 24);
      ctx.quadraticCurveTo(lx + s * 54, ly - 52, lx + s * 84, ly - 24);
      ctx.stroke();
      ctx.fillStyle = '#FFFDF5'; ctx.strokeStyle = '#4A1806'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(lx + s * 48, ly - 8, 24, 17, s * -0.14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1B0B06';
      ctx.beginPath(); ctx.arc(lx + s * 48, ly - 8, 10.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(lx + s * 44, ly - 12, 3.8, 0, Math.PI * 2); ctx.fill();
    });

    // 飽滿朱紅金獅鼻 ＋ 捲雲腮吻 ＋ 威震獠牙張口
    ctx.fillStyle = '#C82822'; ctx.strokeStyle = '#521208'; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.ellipse(lx, ly + 22, 34, 21, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFECAA';
    [-1, 1].forEach((s) => {
      ctx.beginPath(); ctx.arc(lx + s * 36, ly + 44, 23, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
    ctx.fillStyle = '#4F0B0B';
    ctx.beginPath(); ctx.ellipse(lx, ly + 64, 44, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFDF5';
    [-28, -11, 11, 28].forEach((tx, ti) => {
      ctx.beginPath();
      ctx.moveTo(lx + tx - 7, ly + 48);
      ctx.lineTo(lx + tx + 7, ly + 48);
      ctx.lineTo(lx + tx, ly + (ti === 0 || ti === 3 ? 70 : 61));
      ctx.closePath(); ctx.fill();
    });
  } else if (variant === 'leftMother') {
    // 左尊杏金黃鳳牡丹刺繡神袍
    drawEmbroideredMedallion(512, 290, 124, '#FFF0A0', '#C81E1E');
    drawEmbroideredMedallion(240, 560, 88, '#FAD768', '#15803D');
    drawEmbroideredMedallion(784, 560, 88, '#FAD768', '#15803D');
    drawEmbroideredMedallion(512, 740, 84, '#FCE27C', '#B91C1C');
    [[140, 220], [884, 220], [160, 400], [864, 400], [340, 680], [684, 680]].forEach(([cx, cy], idx) => {
      drawSilkCloud(cx, cy, 1.05, idx % 2 === 0 ? '#FFE994' : '#6EE7B7');
    });
  } else {
    // 右尊深黑底重工金蔥盤龍刺繡王爺袍
    drawEmbroideredMedallion(512, 310, 138, '#F6CE64', '#DC2626');
    drawEmbroideredMedallion(225, 580, 102, '#EBBF52', '#B91C1C');
    drawEmbroideredMedallion(799, 580, 102, '#EBBF52', '#B91C1C');
    drawEmbroideredMedallion(512, 760, 92, '#F4CA5E', '#D97706');
    [[140, 210], [884, 210], [170, 410], [854, 410], [330, 710], [694, 710]].forEach(([cx, cy], idx) => {
      drawSilkCloud(cx, cy, 1.15, idx % 2 === 0 ? '#F2C554' : '#38BDF8');
    });
  }

  // 5. ★ V46 精工多層「立水斜浪＋五彩海水江崖金線刺繡花邊」
  // 上層金線萬字回紋鎖邊帶
  ctx.fillStyle = variant === 'rightBeardKing' ? '#6B4812' : '#B91C1C';
  ctx.fillRect(0, 842, 1024, 24);
  ctx.strokeStyle = '#FCE284';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(0, 844); ctx.lineTo(1024, 844);
  ctx.moveTo(0, 864); ctx.lineTo(1024, 864);
  ctx.stroke();
  for (let kx = 8; kx < 1024; kx += 24) {
    ctx.strokeStyle = '#FFF0A8';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(kx, 848, 14, 12);
  }
  // 中層立水五彩金絲斜條
  for (let sx = 0; sx < 1024; sx += 14) {
    ctx.strokeStyle = sx % 28 === 0
      ? (variant === 'rightBeardKing' ? '#D6A438' : '#FACC15')
      : (variant === 'rightBeardKing' ? '#584122' : '#38BDF8');
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(sx, 868);
    ctx.lineTo(sx + 10, 1024);
    ctx.stroke();
  }
  // 下層捲浪金線祥雲波濤
  for (let i = 0; i < 10; i++) {
    const wx = 52 + i * 102;
    ctx.fillStyle = variant === 'rightBeardKing' ? '#362717' : '#FFF8E2';
    ctx.beginPath(); ctx.arc(wx, 1024, 68, Math.PI, 0); ctx.fill();
    ctx.fillStyle = variant === 'rightBeardKing' ? '#8B6224' : '#38BDF8';
    ctx.beginPath(); ctx.arc(wx, 1024, 54, Math.PI, 0); ctx.fill();
    ctx.fillStyle = variant === 'rightBeardKing' ? '#24180F' : '#1D4ED8';
    ctx.beginPath(); ctx.arc(wx, 1024, 38, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#FCE07A';
    ctx.lineWidth = 4.5;
    ctx.stroke();
    ctx.strokeStyle = '#FFF7C4';
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(wx, 1024, 66, Math.PI + 0.1, -0.1); ctx.stroke();
  }

  // 領口萬字錦金蔥滾邊
  ctx.fillStyle = '#F0C24A';
  ctx.fillRect(0, 0, 1024, 34);
  ctx.fillStyle = '#8F1919';
  ctx.fillRect(0, 34, 1024, 14);

  const tex = makeCanvasTexture(canvas, true, false);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  _cachedEmbroideryRobeV37[variant] = tex;
  return tex;
}

/**
 * ★ V37.2 神像長袖與肩披專用「純金蔥祥雲盤龍刺繡絲緞貼圖」（不含下擺海水江崖藍白邊，徹底消除衣袖側緣出現藍白波浪條紋！）
 */
const _cachedSleeveEmbV37 = {};
export function createDeitySleeveEmbroideryTextureV37(variant = 'leftMother') {
  if (_cachedSleeveEmbV37[variant]) return _cachedSleeveEmbV37[variant];
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 512, 512);
  if (variant === 'leftMother') {
    g.addColorStop(0, '#D49E34');
    g.addColorStop(0.5, '#B57F20');
    g.addColorStop(1, '#8C5E14');
  } else if (variant === 'centerKing') {
    g.addColorStop(0, '#EA761C');
    g.addColorStop(0.5, '#D25812');
    g.addColorStop(1, '#A43F0C');
  } else {
    g.addColorStop(0, '#2B1F1B');
    g.addColorStop(0.5, '#1D1512');
    g.addColorStop(1, '#120D0B');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);

  // 細密真絲斜紋底紋
  ctx.strokeStyle = variant === 'rightBeardKing' ? 'rgba(245, 205, 118, 0.09)' : 'rgba(255, 240, 195, 0.11)';
  ctx.lineWidth = 1.5;
  for (let i = -512; i < 1024; i += 8) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 512, 512); ctx.stroke();
  }

  // ★ V46 滿幅精工「金蔥盤線魚鱗繡紋＋祥雲捲草＋連珠盤金團龍繡花」
  ctx.strokeStyle = variant === 'rightBeardKing' ? 'rgba(242, 196, 94, 0.44)' : 'rgba(255, 236, 152, 0.46)';
  ctx.lineWidth = 2.2;
  for (let y = 20; y < 512; y += 30) {
    const ox = (Math.floor(y / 30) % 2) * 18;
    for (let x = -18; x < 540; x += 36) {
      ctx.beginPath(); ctx.arc(x + ox, y, 16, 0.14, Math.PI - 0.14); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + ox, y + 4, 9.5, 0.24, Math.PI - 0.24); ctx.stroke();
      ctx.fillStyle = 'rgba(255, 246, 188, 0.48)';
      ctx.beginPath(); ctx.arc(x + ox, y + 1, 2.0, 0, Math.PI * 2); ctx.fill();
    }
  }

  // 精緻金蔥盤龍團花＋12 顆盤金連珠繡邊＋捲雲枝葉
  [[128, 128], [384, 128], [256, 256], [128, 384], [384, 384]].forEach(([cx, cy]) => {
    ctx.strokeStyle = 'rgba(54, 24, 4, 0.58)';
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(cx, cy, 44, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#FCE07A';
    ctx.lineWidth = 4.2;
    ctx.beginPath(); ctx.arc(cx, cy, 42, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#FFF5B8';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(cx, cy, 33, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#F7C948';
    ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.arc(cx, cy, 22, 0.25, Math.PI * 1.75); ctx.stroke();
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      ctx.fillStyle = k % 2 === 0 ? '#FFF7C4' : '#EAB308';
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 37.5, cy + Math.sin(a) * 37.5, 2.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#D92626';
    ctx.beginPath(); ctx.arc(cx, cy, 7.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFF6BE';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  const tex = makeCanvasTexture(canvas, true, false);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  _cachedSleeveEmbV37[variant] = tex;
  return tex;
}

/**
 * ★ V42 中尊戰袍腹部正中央「壓扁橢圓形手工金線刺繡雄獅＋雙層放射三角旗刺繡」（768×512：滿滿金線針腳紋理＋向外層疊綻放三角旌旗刺繡，立體華麗極具層次！）
 */
let _cachedCenterLionPatchV37 = null;
export function createCenterLionPatchTextureV37() {
  if (_cachedCenterLionPatchV37) return _cachedCenterLionPatchV37;
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 768, 512);

  const lx = 384;
  const ly = 256;

  // 輔助：繪製「手工金線針腳」密集平行繡紋
  const drawStitchFill = (drawPathFn, baseCol, stitchCol, angleRad, step = 5, lineW = 2.1) => {
    ctx.save();
    drawPathFn();
    ctx.fillStyle = baseCol;
    ctx.fill();
    ctx.clip();
    ctx.translate(lx, ly);
    ctx.rotate(angleRad);
    ctx.strokeStyle = stitchCol;
    ctx.lineWidth = lineW;
    for (let x = -420; x <= 420; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, -300);
      ctx.lineTo(x, 300);
      ctx.stroke();
    }
    ctx.restore();
  };

  // 1) ★ 外層向外放射「雙層層疊三角旗刺繡」（後層 16 面深紅金邊大三角旗＋前層 16 面亮金／翠藍點綴中三角旗，極富層次！）
  const drawTriFlagRing = (count, phase, rxIn, ryIn, rxOut, ryOut, halfArc, fillCol, stitchCol, edgeCol) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + phase;
      const aL = a - halfArc;
      const aR = a + halfArc;
      const p1x = lx + Math.cos(aL) * rxIn;
      const p1y = ly + Math.sin(aL) * ryIn;
      const p2x = lx + Math.cos(aR) * rxIn;
      const p2y = ly + Math.sin(aR) * ryIn;
      const tipX = lx + Math.cos(a) * rxOut;
      const tipY = ly + Math.sin(a) * ryOut;

      // 暗棕立體繡邊底影
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(p2x, p2y);
      ctx.closePath();
      ctx.fillStyle = fillCol;
      ctx.fill();
      ctx.clip();
      // 三角旗內部放射狀細金線刺繡紋理
      ctx.strokeStyle = stitchCol;
      ctx.lineWidth = 2.0;
      for (let f = 0.15; f <= 0.85; f += 0.14) {
        ctx.beginPath();
        ctx.moveTo(p1x + (p2x - p1x) * f, p1y + (p2y - p1y) * f);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
      }
      ctx.restore();

      // 粗金蔥盤線滾邊＋旗尖亮金珠點
      ctx.strokeStyle = '#5B1F05';
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.moveTo(p1x, p1y); ctx.lineTo(tipX, tipY); ctx.lineTo(p2x, p2y); ctx.closePath();
      ctx.stroke();
      ctx.strokeStyle = edgeCol;
      ctx.lineWidth = 2.8;
      ctx.stroke();

      ctx.fillStyle = '#FFF5B4';
      ctx.beginPath();
      ctx.arc(tipX, tipY, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // 後層 16 面修長深赤金邊三角旌旗（向外延伸最長！）
  drawTriFlagRing(16, 0, 215, 132, 355, 232, 0.165, '#A6280E', 'rgba(255, 224, 128, 0.52)', '#F7D266');
  // 前層交錯 16 面亮金錦繡三角旗（重疊於後層之上形成強烈層次感！）
  drawTriFlagRing(16, Math.PI / 16, 198, 120, 305, 196, 0.155, '#D48A18', 'rgba(255, 248, 192, 0.72)', '#FFF2A6');

  // 2) 壓扁橢圓形深金繡底盤＋雙圈立體盤金線滾邊
  const bg = ctx.createRadialGradient(lx, ly, 36, lx, ly, 235);
  bg.addColorStop(0, '#B4440C');
  bg.addColorStop(0.84, '#7E2406');
  bg.addColorStop(1, '#4C1203');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(lx, ly, 228, 146, 0, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = '#FFF09E';
  ctx.lineWidth = 9;
  ctx.beginPath(); ctx.ellipse(lx, ly, 222, 140, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#5E1A04';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(lx, ly, 212, 131, 0, 0, Math.PI * 2); ctx.stroke();

  // 3) 18 朵壓扁橢圓環繞「金線盤捲刺繡獅鬃」（每朵具螺旋金線繡針！）
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const mx = lx + Math.cos(a) * 184;
    const my = ly + Math.sin(a) * 112;
    ctx.fillStyle = i % 2 === 0 ? '#E8AE2C' : '#C88416';
    ctx.strokeStyle = '#4E1A04';
    ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.ellipse(mx, my, 34, 26, a, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#FFF4B2';
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(mx, my, 17, a, a + Math.PI * 1.55); ctx.stroke();
    ctx.strokeStyle = '#FFE482';
    ctx.lineWidth = 2.0;
    ctx.beginPath(); ctx.arc(mx, my, 9, a + 0.4, a + Math.PI * 1.7); ctx.stroke();
  }

  // 4) ★ 壓扁橢圓形「手工金線縫製威武獅頭」（滿布細緻金線刺繡紋路，絕非平面色塊！）
  drawStitchFill(
    () => { ctx.beginPath(); ctx.ellipse(lx, ly, 162, 102, 0, 0, Math.PI * 2); },
    '#C47E14',
    'rgba(255, 236, 148, 0.70)',
    0.0,
    4.5,
    2.2
  );
  // 疊加交錯微斜高光金線刺繡針腳
  drawStitchFill(
    () => { ctx.beginPath(); ctx.ellipse(lx, ly - 8, 142, 84, 0, 0, Math.PI * 2); },
    'rgba(235, 178, 48, 0.35)',
    'rgba(255, 248, 195, 0.65)',
    Math.PI * 0.46,
    5.5,
    1.8
  );
  // 獅面外廓粗金蔥盤線＋暗棕釘線輪廓
  ctx.strokeStyle = '#4C1804';
  ctx.lineWidth = 8.5;
  ctx.beginPath(); ctx.ellipse(lx, ly, 162, 102, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#FFE88A';
  ctx.lineWidth = 4.2;
  ctx.beginPath(); ctx.ellipse(lx, ly, 158, 98, 0, 0, Math.PI * 2); ctx.stroke();

  // 獅額純金線盤繡「王」字（暗棕勾邊＋亮金絲雙線！）
  ctx.lineCap = 'round';
  const drawWang = (col, lw) => {
    ctx.strokeStyle = col; ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(lx - 42, ly - 64); ctx.lineTo(lx + 42, ly - 64);
    ctx.moveTo(lx - 32, ly - 46); ctx.lineTo(lx + 32, ly - 46);
    ctx.moveTo(lx - 42, ly - 28); ctx.lineTo(lx + 42, ly - 28);
    ctx.moveTo(lx, ly - 67); ctx.lineTo(lx, ly - 26);
    ctx.stroke();
  };
  drawWang('#5C1604', 12);
  drawWang('#FFF4B0', 5.5);

  // 金線捲雲立體獅眉 ＋ 金蔥鎖邊銅鈴威目
  [-1, 1].forEach((s) => {
    ctx.strokeStyle = '#4E1604'; ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(lx + s * 18, ly - 20);
    ctx.quadraticCurveTo(lx + s * 72, ly - 52, lx + s * 118, ly - 22);
    ctx.stroke();
    ctx.strokeStyle = '#FFE98A'; ctx.lineWidth = 6.5;
    ctx.stroke();
    ctx.strokeStyle = '#FFF9C8'; ctx.lineWidth = 2.5;
    ctx.stroke();

    // 獅眼（橢圓銳利金線鎖邊！）
    ctx.fillStyle = '#3B1104';
    ctx.beginPath(); ctx.ellipse(lx + s * 66, ly - 4, 34, 18, s * -0.10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFF6C8';
    ctx.beginPath(); ctx.ellipse(lx + s * 66, ly - 4, 26, 13, s * -0.10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#F6C642'; ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#1E0904';
    ctx.beginPath(); ctx.arc(lx + s * 66, ly - 4, 10.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(lx + s * 62, ly - 8, 3.8, 0, Math.PI * 2); ctx.fill();
  });

  // 壓扁寬闊金線繡獅鼻 ＋ 雙側螺旋金線腮吻 ＋ 威震獠牙
  ctx.fillStyle = '#8F2108';
  ctx.strokeStyle = '#FFE480';
  ctx.lineWidth = 4.5;
  ctx.beginPath(); ctx.ellipse(lx, ly + 22, 46, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#FFF6BE'; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(lx - 26, ly + 22); ctx.lineTo(lx + 26, ly + 22); ctx.stroke();

  [-1, 1].forEach((s) => {
    ctx.fillStyle = '#DF9E24';
    ctx.strokeStyle = '#541804';
    ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.ellipse(lx + s * 54, ly + 42, 32, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#FFF2A8'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(lx + s * 54, ly + 42, 13, 0, Math.PI * 1.65); ctx.stroke();
  });

  // ★ V43 張口威震「上下四顆鋒利長白獠牙」（明確突出彎弧長牙＋鮮紅虎舌，霸氣一目了然！）
  ctx.fillStyle = '#3B0504';
  ctx.strokeStyle = '#F7C948';
  ctx.lineWidth = 4.5;
  ctx.beginPath(); ctx.ellipse(lx, ly + 66, 68, 29, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // 深紅虎舌
  ctx.fillStyle = '#C81E3A';
  ctx.beginPath(); ctx.ellipse(lx, ly + 80, 34, 11, 0, 0, Math.PI * 2); ctx.fill();

  // 上排中央小門牙
  ctx.fillStyle = '#FFFDF5';
  [-18, -6, 6, 18].forEach((tx) => {
    ctx.beginPath();
    ctx.moveTo(lx + tx - 5, ly + 46);
    ctx.lineTo(lx + tx + 5, ly + 46);
    ctx.lineTo(lx + tx, ly + 59);
    ctx.closePath(); ctx.fill();
  });
  // ★ 左右兩對鋒利彎弧「超醒目上下大獠牙」（上犬齒直刺向下、下犬齒反勾向上！）
  [-1, 1].forEach((s) => {
    // 上大長獠牙
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#4A1205';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(lx + s * 28, ly + 44);
    ctx.lineTo(lx + s * 48, ly + 47);
    ctx.quadraticCurveTo(lx + s * 46, ly + 72, lx + s * 36, ly + 88);
    ctx.quadraticCurveTo(lx + s * 32, ly + 68, lx + s * 28, ly + 44);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // 下反勾尖獠牙（由下顎向上亮白刺出！）
    ctx.beginPath();
    ctx.moveTo(lx + s * 22, ly + 88);
    ctx.lineTo(lx + s * 36, ly + 86);
    ctx.quadraticCurveTo(lx + s * 32, ly + 70, lx + s * 25, ly + 60);
    ctx.quadraticCurveTo(lx + s * 22, ly + 74, lx + s * 22, ly + 88);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  });

  const tex = makeCanvasTexture(canvas, true, false);
  _cachedCenterLionPatchV37 = tex;
  return tex;
}

/**
 * ★ V38 左側神明頭冠上方「黃色刺繡三角披帽頭巾貼圖」（512×512：明黃錦緞斜紋＋金線鳳蓮雲紋刺繡＋前緣華麗紅金萬字錦繡滾邊！）
 */
let _cachedYellowHoodV38 = null;
export function createYellowEmbroideredHoodTextureV38() {
  if (_cachedYellowHoodV38) return _cachedYellowHoodV38;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 明麗尊貴明黃絲緞漸層底色（自然柔軟布光）
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#FFE066');
  g.addColorStop(0.45, '#F3BE36');
  g.addColorStop(1, '#CE8E18');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);

  // 細密絲緞經緯斜紋
  ctx.strokeStyle = 'rgba(255, 250, 215, 0.16)';
  ctx.lineWidth = 1.5;
  for (let i = -512; i < 1024; i += 8) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 512, 512); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(130, 74, 8, 0.10)';
  for (let y = 0; y < 512; y += 6) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
  }

  // 滿幅細緻金橘暗紋如意祥雲刺繡
  ctx.strokeStyle = 'rgba(180, 98, 12, 0.42)';
  ctx.lineWidth = 2.6;
  for (let y = 44; y < 448; y += 44) {
    const ox = (Math.floor(y / 44) % 2) * 26;
    for (let x = -26; x < 540; x += 52) {
      ctx.beginPath(); ctx.arc(x + ox, y, 20, 0.15, Math.PI - 0.15); ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 248, 198, 0.55)';
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(x + ox, y + 6, 11, 0.25, Math.PI - 0.25); ctx.stroke();
      ctx.strokeStyle = 'rgba(180, 98, 12, 0.42)';
      ctx.lineWidth = 2.6;
    }
  }

  // 精繡蓮花牡丹團徽點綴於頭巾兩側與頂部
  const drawLotusEmb = (cx, cy, r) => {
    ctx.save();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.fillStyle = i % 2 === 0 ? '#FFF2A8' : '#E07A20';
      ctx.strokeStyle = '#8F3E0A';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.36, r * 0.19, a, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#C81E1E';
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFF6C2';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  };
  [[256, 128, 36], [116, 224, 34], [396, 224, 34], [150, 356, 30], [362, 356, 30]].forEach(([x, y, r]) => drawLotusEmb(x, y, r));

  // ★ 頭巾前緣（v = 0..0.12，即 y = 0..56）華麗「朱紅金線萬字錦刺繡滾邊」
  ctx.fillStyle = '#A61C1C';
  ctx.fillRect(0, 0, 512, 42);
  ctx.strokeStyle = '#FFE47A';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 6); ctx.lineTo(512, 6);
  ctx.moveTo(0, 36); ctx.lineTo(512, 36);
  ctx.stroke();
  for (let x = 16; x < 512; x += 32) {
    ctx.strokeStyle = '#FFF0A0';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x - 9, 13, 18, 16);
    ctx.fillStyle = '#F5C442';
    ctx.beginPath(); ctx.arc(x, 21, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  // 滾邊下方金絲捲草繡花邊
  ctx.strokeStyle = '#8F3E0A';
  ctx.lineWidth = 3;
  for (let x = 12; x < 512; x += 24) {
    ctx.beginPath(); ctx.arc(x, 46, 10, 0, Math.PI); ctx.stroke();
  }

  const tex = makeCanvasTexture(canvas, true, false);
  _cachedYellowHoodV38 = tex;
  return tex;
}

/**
 * ★ V35.2 古金精雕花紋浮雕貼圖（專用於神冠鏤空龍紋、雲肩魚鱗戰甲、天上聖母古金胸袍，徹底告別塑膠光滑球感！）
 */
const _cachedGoldReliefV35 = {};
export function createGoldEmbroideryReliefTextureV35(style = 'armorScale') {
  if (_cachedGoldReliefV35[style]) return _cachedGoldReliefV35[style];
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 深古金包漿底色（含柔和凹處暗銅陰影，呈現立體金工鑿刻感！）
  const bg = ctx.createLinearGradient(0, 0, 0, 512);
  if (style === 'crownFiligree') {
    bg.addColorStop(0, '#E4B854');
    bg.addColorStop(0.5, '#C49234');
    bg.addColorStop(1, '#8D611B');
  } else if (style === 'mazuChest') {
    bg.addColorStop(0, '#D4A544');
    bg.addColorStop(0.5, '#AF8129');
    bg.addColorStop(1, '#7A5516');
  } else {
    bg.addColorStop(0, '#D9A948');
    bg.addColorStop(0.5, '#B5832B');
    bg.addColorStop(1, '#7E5516');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 512);

  if (style === 'armorScale') {
    // 細密立體魚鱗甲片浮雕（每片含暗銅溝槽＋上緣金亮高光！）
    for (let row = 0; row < 16; row++) {
      const y = row * 34;
      const ox = (row % 2) * 20;
      for (let col = -1; col < 14; col++) {
        const x = col * 40 + ox;
        ctx.fillStyle = '#9C6D20';
        ctx.beginPath();
        ctx.arc(x, y, 21, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = '#DFB252';
        ctx.beginPath();
        ctx.arc(x, y - 3, 18, 0, Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#5B3A0B';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 240, 178, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y - 2, 13, 0.25, Math.PI - 0.25);
        ctx.stroke();
      }
    }
  } else if (style === 'mazuChest') {
    // 細緻古金繡鳳祥雲＋細密垂直金絲錦紋
    for (let x = 0; x < 512; x += 8) {
      ctx.fillStyle = x % 16 === 0 ? 'rgba(68, 42, 8, 0.28)' : 'rgba(255, 236, 168, 0.24)';
      ctx.fillRect(x, 0, 4, 512);
    }
    ctx.strokeStyle = '#5C390A';
    ctx.lineWidth = 6;
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const cx = 42 + c * 86 + (r % 2) * 43;
        const cy = 44 + r * 86;
        ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#F6D778';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, 24, 0.2, Math.PI * 1.75); ctx.stroke();
        ctx.strokeStyle = '#5C390A';
        ctx.lineWidth = 6;
      }
    }
  } else {
    // 皇冠／鳳冠極密鏤空捲草盤龍雕花浮雕紋理
    for (let y = 24; y < 512; y += 46) {
      for (let x = 24; x < 512; x += 46) {
        ctx.fillStyle = 'rgba(54, 30, 5, 0.52)';
        ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#F7DA82';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(x, y, 14, 0.2, Math.PI * 1.85); ctx.stroke();
        ctx.fillStyle = '#FFE9A0';
        ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  const tex = makeCanvasTexture(canvas, true, false);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  _cachedGoldReliefV35[style] = tex;
  return tex;
}

/**
 * ★ V35.2 中尊腹部「高對比深雕古金獅頭吞獸護腹紋理」（立體浮雕明暗＋怒目獅眉＋寬鼻獠牙＋層層捲毛獅鬃！）
 */
let _cachedLionBellyV35 = null;
export function createCarvedLionBellyTextureV35() {
  if (_cachedLionBellyV35) return _cachedLionBellyV35;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 古銅金立體浮雕底色
  const bg = ctx.createRadialGradient(256, 240, 35, 256, 256, 256);
  bg.addColorStop(0, '#ECC25E');
  bg.addColorStop(0.55, '#BF8C2E');
  bg.addColorStop(0.88, '#7A5114');
  bg.addColorStop(1, '#4C2E09');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 512);

  // 外環 16 朵深雕捲毛古金獅鬃
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const mx = 256 + Math.cos(a) * 188;
    const my = 256 + Math.sin(a) * 170;
    ctx.fillStyle = '#6A420C';
    ctx.beginPath(); ctx.arc(mx, my, 46, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#DCAC46';
    ctx.beginPath(); ctx.arc(mx - 3, my - 4, 38, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4B2A06';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(mx, my, 24, a, a + Math.PI * 1.5); ctx.stroke();
    ctx.strokeStyle = '#FCE28A';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(mx - 2, my - 2, 16, a + 0.3, a + Math.PI * 1.4); ctx.stroke();
  }

  // 獅頭高浮雕面頰陰影與眉骨
  ctx.fillStyle = '#C99534';
  ctx.strokeStyle = '#4D2C07';
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.ellipse(256, 256, 154, 138, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // 獅額浮雕「王」字暗金紋
  ctx.strokeStyle = '#5A3408';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(212, 150); ctx.lineTo(300, 150);
  ctx.moveTo(222, 174); ctx.lineTo(290, 174);
  ctx.moveTo(214, 198); ctx.lineTo(298, 198);
  ctx.moveTo(256, 146); ctx.lineTo(256, 202);
  ctx.stroke();

  // 威嚴深雕眉脊與怒視銅鈴獅目
  [-1, 1].forEach((s) => {
    ctx.strokeStyle = '#422305';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(256 + s * 22, 222);
    ctx.quadraticCurveTo(256 + s * 72, 186, 256 + s * 116, 214);
    ctx.stroke();
    ctx.strokeStyle = '#FAE086';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(256 + s * 26, 214);
    ctx.quadraticCurveTo(256 + s * 72, 182, 256 + s * 112, 208);
    ctx.stroke();

    // 深眼窩與圓亮金獅眼
    ctx.fillStyle = '#381C04';
    ctx.beginPath(); ctx.ellipse(256 + s * 66, 240, 34, 24, s * -0.14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#EBC058';
    ctx.beginPath(); ctx.ellipse(256 + s * 66, 240, 24, 16, s * -0.14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2B1404';
    ctx.beginPath(); ctx.arc(256 + s * 66, 240, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFF3C4';
    ctx.beginPath(); ctx.arc(256 + s * 62, 236, 4, 0, Math.PI * 2); ctx.fill();
  });

  // 寬厚立體金獅鼻頭 ＋ 兩側捲雲獅腮
  ctx.fillStyle = '#532F07';
  ctx.beginPath(); ctx.ellipse(256, 286, 52, 32, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#F2C964';
  ctx.beginPath(); ctx.ellipse(256, 280, 44, 25, 0, 0, Math.PI * 2); ctx.fill();
  [-1, 1].forEach((s) => {
    ctx.fillStyle = '#3B1E05';
    ctx.beginPath(); ctx.arc(256 + s * 20, 288, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#DFAD44';
    ctx.strokeStyle = '#522E07';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(256 + s * 62, 316, 36, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  });

  // 威武張口獅嘴 ＋ 深雕獠牙
  ctx.fillStyle = '#2F1604';
  ctx.beginPath(); ctx.ellipse(256, 348, 66, 30, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#F7DC88';
  [-40, -16, 16, 40].forEach((tx, idx) => {
    ctx.beginPath();
    ctx.moveTo(256 + tx - 9, 326);
    ctx.lineTo(256 + tx + 9, 326);
    ctx.lineTo(256 + tx, 326 + (idx === 0 || idx === 3 ? 28 : 18));
    ctx.closePath();
    ctx.fill();
  });

  const tex = makeCanvasTexture(canvas, true, false);
  _cachedLionBellyV35 = tex;
  return tex;
}

/**
 * ★ V35.2 柔軟絲綢披風布摺陰影貼圖（告別純平色紅布！）
 */
let _cachedCrimsonCapeV35 = null;
export function createCrimsonCapeTextureV35() {
  if (_cachedCrimsonCapeV35) return _cachedCrimsonCapeV35;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, '#6C0E12');
  g.addColorStop(0.24, '#A4191F');
  g.addColorStop(0.50, '#7E1217');
  g.addColorStop(0.76, '#B41D24');
  g.addColorStop(1, '#5D0B0E');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 512);

  for (let x = 0; x < 256; x += 6) {
    const f = Math.sin(x * 0.14) * 0.14;
    ctx.fillStyle = f > 0 ? `rgba(255, 200, 185, ${f.toFixed(3)})` : `rgba(30, 2, 4, ${(-f).toFixed(3)})`;
    ctx.fillRect(x, 0, 6, 512);
  }
  const tex = makeCanvasTexture(canvas, true, false);
  _cachedCrimsonCapeV35 = tex;
  return tex;
}

/**
 * ★ V45 博物館級 1024×1024「極致細緻手工鑿花金鉑貼圖＋高精浮雕凹凸貼圖 (BumpMap)」
 *   配合 ExtrudeGeometry 正規化 [0,1] UV，每片帽冠金鉑皆呈現清晰細膩之連珠蕾絲金邊、台灣手工銀帽／紙帽捲雲寶相花細雕、放射細紋與千錘金箔微閃！
 */
let _cachedEmbossedGoldFoilV44 = null;
export function createEmbossedGoldFoilTexturesV44() {
  if (_cachedEmbossedGoldFoilV44) return _cachedEmbossedGoldFoilV44;

  const size = 1024;
  const colCanvas = document.createElement('canvas');
  colCanvas.width = size; colCanvas.height = size;
  const cCtx = colCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size; bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d');

  // 1) 溫潤璀璨手工純金箔漸層底色與浮雕基面
  const bg = cCtx.createRadialGradient(size * 0.5, size * 0.45, size * 0.05, size * 0.5, size * 0.5, size * 0.65);
  bg.addColorStop(0, '#FFF8CA');
  bg.addColorStop(0.32, '#FAD86A');
  bg.addColorStop(0.66, '#EAB938');
  bg.addColorStop(1, '#C48A18');
  cCtx.fillStyle = bg;
  cCtx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#626262';
  bCtx.fillRect(0, 0, size, size);

  // 2) 千錘細密手工金箔微閃敲紋
  let seed = 45019;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 4200; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 1.5 + rand() * 4.5;
    const hi = rand() > 0.46;
    cCtx.fillStyle = hi ? `rgba(255, 254, 232, ${(0.08 + rand() * 0.16).toFixed(3)})` : `rgba(128, 76, 8, ${(0.07 + rand() * 0.12).toFixed(3)})`;
    cCtx.beginPath(); cCtx.arc(x, y, r, 0, Math.PI * 2); cCtx.fill();
    bCtx.fillStyle = hi ? 'rgba(215, 215, 215, 0.24)' : 'rgba(38, 38, 38, 0.22)';
    bCtx.beginPath(); bCtx.arc(x, y, r, 0, Math.PI * 2); bCtx.fill();
  }

  // 3) 細密放射鑿花金絲底紋（如傳統銀帽金鉑內雕魚子紋與放射絲！）
  const cx = size * 0.5;
  const cy = size * 0.5;
  for (let rIdx = 0; rIdx < 48; rIdx++) {
    const a = (rIdx / 48) * Math.PI * 2;
    cCtx.strokeStyle = rIdx % 2 === 0 ? 'rgba(255, 250, 212, 0.34)' : 'rgba(130, 74, 6, 0.26)';
    cCtx.lineWidth = 2.6;
    cCtx.beginPath();
    cCtx.moveTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60);
    cCtx.lineTo(cx + Math.cos(a) * 485, cy + Math.sin(a) * 485);
    cCtx.stroke();

    bCtx.strokeStyle = rIdx % 2 === 0 ? '#D4D4D4' : '#404040';
    bCtx.lineWidth = 3.2;
    bCtx.beginPath();
    bCtx.moveTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60);
    bCtx.lineTo(cx + Math.cos(a) * 485, cy + Math.sin(a) * 485);
    bCtx.stroke();
  }

  // 4) 華麗雙層寶相蓮花浮雕＋捲雲唐草花紋＋三圈極細連珠金粒（每片金鉑皆如實物金雕！）
  const drawFiligreeRing = (rad, beadCount, beadR, lineW) => {
    cCtx.strokeStyle = 'rgba(116, 62, 4, 0.55)';
    cCtx.lineWidth = lineW + 3;
    cCtx.beginPath(); cCtx.arc(cx, cy, rad, 0, Math.PI * 2); cCtx.stroke();
    cCtx.strokeStyle = '#FFF3B4';
    cCtx.lineWidth = lineW;
    cCtx.beginPath(); cCtx.arc(cx, cy, rad, 0, Math.PI * 2); cCtx.stroke();

    bCtx.strokeStyle = '#F2F2F2';
    bCtx.lineWidth = lineW + 2;
    bCtx.beginPath(); bCtx.arc(cx, cy, rad, 0, Math.PI * 2); bCtx.stroke();

    for (let k = 0; k < beadCount; k++) {
      const a = (k / beadCount) * Math.PI * 2;
      const bx = cx + Math.cos(a) * rad;
      const by = cy + Math.sin(a) * rad;
      cCtx.fillStyle = '#7A4205';
      cCtx.beginPath(); cCtx.arc(bx + 1.5, by + 1.5, beadR + 1.2, 0, Math.PI * 2); cCtx.fill();
      cCtx.fillStyle = '#FFFCE0';
      cCtx.beginPath(); cCtx.arc(bx, by, beadR, 0, Math.PI * 2); cCtx.fill();
      bCtx.fillStyle = '#FFFFFF';
      bCtx.beginPath(); bCtx.arc(bx, by, beadR + 1, 0, Math.PI * 2); bCtx.fill();
    }
  };

  // 外層 16 瓣如意捲雲花瓣
  for (let p = 0; p < 16; p++) {
    const a = (p / 16) * Math.PI * 2;
    const px = cx + Math.cos(a) * 320;
    const py = cy + Math.sin(a) * 320;
    cCtx.save();
    cCtx.translate(px, py); cCtx.rotate(a);
    cCtx.fillStyle = 'rgba(255, 244, 178, 0.72)';
    cCtx.strokeStyle = 'rgba(115, 60, 4, 0.62)';
    cCtx.lineWidth = 4.5;
    cCtx.beginPath(); cCtx.ellipse(0, 0, 76, 36, 0, 0, Math.PI * 2); cCtx.fill(); cCtx.stroke();
    cCtx.strokeStyle = '#FFFCE2';
    cCtx.lineWidth = 2.4;
    cCtx.beginPath(); cCtx.ellipse(0, 0, 52, 20, 0, 0, Math.PI * 2); cCtx.stroke();
    cCtx.restore();

    bCtx.save();
    bCtx.translate(px, py); bCtx.rotate(a);
    bCtx.fillStyle = '#E6E6E6';
    bCtx.strokeStyle = '#2B2B2B';
    bCtx.lineWidth = 5;
    bCtx.beginPath(); bCtx.ellipse(0, 0, 76, 36, 0, 0, Math.PI * 2); bCtx.fill(); bCtx.stroke();
    bCtx.restore();
  }

  // 中層 10 瓣浮雕蓮心花瓣
  for (let p = 0; p < 10; p++) {
    const a = (p / 10) * Math.PI * 2 + 0.16;
    const px = cx + Math.cos(a) * 168;
    const py = cy + Math.sin(a) * 168;
    cCtx.save();
    cCtx.translate(px, py); cCtx.rotate(a);
    cCtx.fillStyle = '#FFE994';
    cCtx.strokeStyle = '#7C4206';
    cCtx.lineWidth = 4.2;
    cCtx.beginPath(); cCtx.ellipse(0, 0, 62, 32, 0, 0, Math.PI * 2); cCtx.fill(); cCtx.stroke();
    cCtx.restore();

    bCtx.save();
    bCtx.translate(px, py); bCtx.rotate(a);
    bCtx.fillStyle = '#F0F0F0';
    bCtx.strokeStyle = '#303030';
    bCtx.lineWidth = 4.5;
    bCtx.beginPath(); bCtx.ellipse(0, 0, 62, 32, 0, 0, Math.PI * 2); bCtx.fill(); bCtx.stroke();
    bCtx.restore();
  }

  drawFiligreeRing(452, 64, 7.5, 5.5);
  drawFiligreeRing(248, 40, 6.5, 4.5);
  drawFiligreeRing(92, 20, 5.5, 4.0);

  // ★ V54 台灣百年神帽工藝「24K 鎏金鑿花神冠金鉑三通道 PBR 貼圖（Color + Bump + Roughness）」
  //   強化花絲浮雕對比、鍛打金箔微光顆粒、細密連珠花紋，凸紋呈鏡面亮金、凹槽呈古金啞光，立體貴氣感大幅躍升！
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 1024;
  roughCanvas.height = 1024;
  const rCtx = roughCanvas.getContext('2d');
  rCtx.fillStyle = '#828282'; // 凹底古金微霧質感 (roughness ~0.51)
  rCtx.fillRect(0, 0, 1024, 1024);

  // 在彩圖補上精細鍛打金箔微光光澤層＋高對比花絲亮金勾邊
  const sheenG = cCtx.createRadialGradient(cx - 120, cy - 120, 40, cx, cy, 560);
  sheenG.addColorStop(0, 'rgba(255, 253, 224, 0.34)');
  sheenG.addColorStop(0.50, 'rgba(255, 226, 128, 0.14)');
  sheenG.addColorStop(1, 'rgba(138, 76, 8, 0.24)');
  cCtx.fillStyle = sheenG;
  cCtx.fillRect(0, 0, 1024, 1024);

  // 細密鑿花絲線放射紋＋外圈細珠光環（同步寫入 RoughnessMap：凸紋極低粗糙度 #1C1C1C 閃耀鏡面金光！）
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * 105;
    const y1 = cy + Math.sin(a) * 105;
    const x2 = cx + Math.cos(a) * 442;
    const y2 = cy + Math.sin(a) * 442;
    cCtx.strokeStyle = i % 2 === 0 ? 'rgba(255, 250, 206, 0.56)' : 'rgba(128, 68, 6, 0.36)';
    cCtx.lineWidth = i % 2 === 0 ? 2.6 : 1.8;
    cCtx.beginPath(); cCtx.moveTo(x1, y1); cCtx.lineTo(x2, y2); cCtx.stroke();

    bCtx.strokeStyle = i % 2 === 0 ? '#E8E8E8' : '#3A3A3A';
    bCtx.lineWidth = 2.8;
    bCtx.beginPath(); bCtx.moveTo(x1, y1); bCtx.lineTo(x2, y2); bCtx.stroke();

    if (i % 2 === 0) {
      rCtx.strokeStyle = '#242424';
      rCtx.lineWidth = 3.2;
      rCtx.beginPath(); rCtx.moveTo(x1, y1); rCtx.lineTo(x2, y2); rCtx.stroke();
    }
  }

  // 外圈雙道精雕「連珠花絲」鏡面高光環
  [452, 320, 248, 168, 92].forEach((rad, rIdx) => {
    rCtx.strokeStyle = '#1E1E1E';
    rCtx.lineWidth = rIdx === 0 ? 18 : 14;
    rCtx.beginPath(); rCtx.arc(cx, cy, rad, 0, Math.PI * 2); rCtx.stroke();
  });

  // 中央高浮雕寶相花蕊（雙層亮金鏡面核心）
  cCtx.fillStyle = '#FFFCE6';
  cCtx.strokeStyle = '#854606';
  cCtx.lineWidth = 5;
  cCtx.beginPath(); cCtx.arc(cx, cy, 46, 0, Math.PI * 2); cCtx.fill(); cCtx.stroke();
  cCtx.fillStyle = '#FFFDF5';
  cCtx.beginPath(); cCtx.arc(cx - 10, cy - 10, 18, 0, Math.PI * 2); cCtx.fill();
  bCtx.fillStyle = '#FFFFFF';
  bCtx.beginPath(); bCtx.arc(cx, cy, 46, 0, Math.PI * 2); bCtx.fill();
  rCtx.fillStyle = '#141414';
  rCtx.beginPath(); rCtx.arc(cx, cy, 48, 0, Math.PI * 2); rCtx.fill();

  const map = makeCanvasTexture(colCanvas, true, true);
  map.repeat.set(1, 1);
  const bumpMap = makeCanvasTexture(bumpCanvas, false, true);
  bumpMap.repeat.set(1, 1);
  const roughnessMap = makeCanvasTexture(roughCanvas, false, true);
  roughnessMap.repeat.set(1, 1);

  _cachedEmbossedGoldFoilV44 = { map, bumpMap, roughnessMap };
  return _cachedEmbossedGoldFoilV44;
}

/**
 * ★ V46 神袍與長袖專用「3D 立體盤金刺繡織錦凹凸貼圖 (BumpMap)」
 *   為所有神明衣袍賦予真實織錦布紋與浮雕金線刺繡立體觸感，光線掠過即現絲綢盤金層次！
 */
let _cachedEmbroideryBumpV46 = null;
export function createEmbroideryBumpTextureV46() {
  if (_cachedEmbroideryBumpV46) return _cachedEmbroideryBumpV46;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#585858';
  ctx.fillRect(0, 0, size, size);

  // 細密絲緞織紋底
  ctx.strokeStyle = 'rgba(138, 138, 138, 0.30)';
  ctx.lineWidth = 1.5;
  for (let i = -size; i < size * 2; i += 6) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + size, size); ctx.stroke();
  }
  // 立體魚鱗盤金浮繡弧線
  ctx.strokeStyle = '#DFDFDF';
  ctx.lineWidth = 3.0;
  for (let y = 20; y < size; y += 30) {
    const ox = (Math.floor(y / 30) % 2) * 18;
    for (let x = -18; x < size + 28; x += 36) {
      ctx.beginPath(); ctx.arc(x + ox, y, 16, 0.14, Math.PI - 0.14); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + ox, y + 4, 9.5, 0.24, Math.PI - 0.24); ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(x + ox, y + 1, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  // 浮雕團花輪廓
  [[128, 128], [384, 128], [256, 256], [128, 384], [384, 384]].forEach(([cx, cy]) => {
    ctx.strokeStyle = '#F5F5F5';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(cx, cy, 42, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(cx, cy, 22, 0.25, Math.PI * 1.75); ctx.stroke();
  });

  const tex = makeCanvasTexture(canvas, false, true);
  tex.repeat.set(2, 2);
  _cachedEmbroideryBumpV46 = tex;
  return tex;
}

/**
 * ★ V47 三尊神明「依神衣配色與款式量身訂製」精繡神鞋貼圖＋凹凸貼圖
 *   - 左尊（天上聖母金黃龍鳳袍）：御用明黃赭金絲緞＋鳳蓮金絲刺繡＋珠光蓮蕊秀美鳳履
 *   - 中尊（中壇元帥橘紅金甲袍）：朱橘赤金絲緞＋盤雲火紋甲片刺繡＋翠玉雲頭武將戰靴
 *   - 右尊（鎮殿王爺玄黑盤龍袍）：沉雅墨黑錦緞＋古金盤龍捲雲刺繡＋經典厚白底帝王朝靴
 */
const _cachedDeityShoeV46 = {};
export function createDeityShoeTextureV46(variant = 'leftMother') {
  if (_cachedDeityShoeV46[variant]) return _cachedDeityShoeV46[variant];
  const size = 512;
  const colCanvas = document.createElement('canvas');
  colCanvas.width = size; colCanvas.height = size;
  const ctx = colCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size; bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d');

  // 1) 依各尊神衣主色訂製絲緞鞋面底色
  const g = ctx.createLinearGradient(0, 0, size, size);
  if (variant === 'leftMother') {
    // 搭配左尊金黃刺繡龍鳳神袍：華貴帝王明黃赭金絲緞
    g.addColorStop(0, '#E3B03C');
    g.addColorStop(0.5, '#C58E22');
    g.addColorStop(1, '#9A6812');
  } else if (variant === 'centerKing') {
    // 搭配中尊橘紅金絲戰袍：亮麗朱橘赤金戰甲絲緞
    g.addColorStop(0, '#DC521E');
    g.addColorStop(0.5, '#B63311');
    g.addColorStop(1, '#852009');
  } else {
    // 搭配右尊玄黑盤金龍袍：威嚴沉穩墨黑錦緞
    g.addColorStop(0, '#26212C');
    g.addColorStop(0.5, '#18151D');
    g.addColorStop(1, '#0E0C12');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#555555';
  bCtx.fillRect(0, 0, size, size);

  // 2) 絲緞斜紋織底
  ctx.strokeStyle = variant === 'leftMother' ? 'rgba(255, 250, 215, 0.20)' : 'rgba(255, 232, 155, 0.14)';
  ctx.lineWidth = 1.6;
  for (let i = -size; i < size * 2; i += 7) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + size, size); ctx.stroke();
  }

  // 3) 依各尊款式繪製專屬金線刺繡紋樣
  const drawShoeMotif = (cx, cy, r) => {
    if (variant === 'leftMother') {
      // 媽祖蓮瓣鳳羽細金線刺繡＋朱紅蓮心點綴
      ctx.strokeStyle = '#FFF7C8';
      ctx.lineWidth = 3.2;
      for (let p = -1; p <= 1; p++) {
        ctx.beginPath();
        ctx.ellipse(cx + p * 18, cy, 12, 22, p * 0.42, 0, Math.PI * 2);
        ctx.stroke();
        bCtx.strokeStyle = '#EAEAEA';
        bCtx.lineWidth = 4;
        bCtx.beginPath();
        bCtx.ellipse(cx + p * 18, cy, 12, 22, p * 0.42, 0, Math.PI * 2);
        bCtx.stroke();
      }
      ctx.fillStyle = '#DC2626';
      ctx.strokeStyle = '#FFF8D0';
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(cx, cy + 8, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (variant === 'centerKing') {
      // 中壇元帥武將金甲火焰捲雲刺繡＋翠玉珠飾
      ctx.strokeStyle = '#FFE885';
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.arc(cx - r * 0.45, cy, r * 0.44, Math.PI, 0);
      ctx.arc(cx, cy - r * 0.22, r * 0.56, Math.PI, 0);
      ctx.arc(cx + r * 0.45, cy, r * 0.44, Math.PI, 0);
      ctx.stroke();
      bCtx.strokeStyle = '#F0F0F0';
      bCtx.lineWidth = 5;
      bCtx.stroke();
      ctx.fillStyle = '#15803D';
      ctx.strokeStyle = '#FFF5B8';
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(cx, cy + 20, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else {
      // 鎮殿王爺帝王盤金龍雲刺繡＋金珠點綴
      ctx.strokeStyle = '#E8BE54';
      ctx.lineWidth = 3.8;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.58, 0.2, Math.PI * 1.78);
      ctx.stroke();
      ctx.strokeStyle = '#FFF2AE';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.34, Math.PI * 0.4, Math.PI * 1.9);
      ctx.stroke();
      bCtx.strokeStyle = '#ECECEC';
      bCtx.lineWidth = 4.5;
      bCtx.beginPath();
      bCtx.arc(cx, cy, r * 0.58, 0.2, Math.PI * 1.78);
      bCtx.stroke();
      ctx.fillStyle = '#FACC15';
      ctx.beginPath(); ctx.arc(cx, cy, 6.5, 0, Math.PI * 2); ctx.fill();
    }
  };

  for (let gy = 64; gy < size; gy += 128) {
    for (let gx = 64; gx < size; gx += 128) {
      drawShoeMotif(gx, gy, 34);
    }
  }

  // 鞋緣細緻金絲滾邊
  ctx.strokeStyle = variant === 'leftMother' ? 'rgba(185, 28, 28, 0.72)' : 'rgba(247, 210, 102, 0.72)';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(size, 6); ctx.moveTo(0, size - 6); ctx.lineTo(size, size - 6); ctx.stroke();
  bCtx.strokeStyle = '#E0E0E0';
  bCtx.lineWidth = 5;
  bCtx.beginPath(); bCtx.moveTo(0, 6); bCtx.lineTo(size, 6); bCtx.moveTo(0, size - 6); bCtx.lineTo(size, size - 6); bCtx.stroke();

  const map = makeCanvasTexture(colCanvas, true, true);
  map.repeat.set(1.4, 1.4);
  const bumpMap = makeCanvasTexture(bumpCanvas, false, true);
  bumpMap.repeat.set(1.4, 1.4);
  _cachedDeityShoeV46[variant] = { map, bumpMap };
  return _cachedDeityShoeV46[variant];
}

/**
 * ★ V47 右尊柔順黑亮真髮「1024×1024 高清絲滑直梳髮絲貼圖＋高對比縱向髮流凹凸貼圖」
 *   賦予披覆於紅披肩上之長髮細密真髮絲紋、溫潤層次與柔和絲緞天使光環，徹底告別死黑平塊！
 */
let _cachedSilkyHairV46 = null;
export function createSilkyHairTextureV46() {
  if (_cachedSilkyHairV46) return _cachedSilkyHairV46;
  const size = 1024;
  const colCanvas = document.createElement('canvas');
  colCanvas.width = size; colCanvas.height = size;
  const ctx = colCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size; bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d');

  // 層次豐富的深烏棕黑底色（在紅披肩上清楚呈現絲光立體質感！）
  const bg = ctx.createLinearGradient(0, 0, 0, size);
  bg.addColorStop(0, '#16131A');
  bg.addColorStop(0.24, '#2A2530');
  bg.addColorStop(0.48, '#1E1A23');
  bg.addColorStop(0.72, '#2B2632');
  bg.addColorStop(1, '#121016');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#484848';
  bCtx.fillRect(0, 0, size, size);

  // 1) 柔和縱向大股髮束明暗韻律（營造自然直梳長髮的立體起伏感！）
  for (let s = 0; s < 28; s++) {
    const sx = (s / 28) * size;
    const sw = size / 28;
    const sg = ctx.createLinearGradient(sx, 0, sx + sw, 0);
    sg.addColorStop(0, 'rgba(8, 6, 10, 0.42)');
    sg.addColorStop(0.35, 'rgba(82, 74, 94, 0.26)');
    sg.addColorStop(0.55, 'rgba(116, 106, 132, 0.34)');
    sg.addColorStop(0.80, 'rgba(54, 48, 62, 0.18)');
    sg.addColorStop(1, 'rgba(8, 6, 10, 0.42)');
    ctx.fillStyle = sg;
    ctx.fillRect(sx, 0, sw, size);

    const bg2 = bCtx.createLinearGradient(sx, 0, sx + sw, 0);
    bg2.addColorStop(0, '#222222');
    bg2.addColorStop(0.5, '#C8C8C8');
    bg2.addColorStop(1, '#222222');
    bCtx.fillStyle = bg2;
    bCtx.fillRect(sx, 0, sw, size);
  }

  // 2) 500+ 道超細密高清真髮絲線條（根根柔和順直、亮暗交錯呈現真髮絲質！）
  for (let x = 0; x < size; x += 2) {
    const wave = Math.sin(x * 0.085) * 0.5 + 0.5;
    const fine = Math.sin(x * 0.47 + 1.1) * 0.5 + 0.5;
    const micro = Math.cos(x * 1.13) * 0.5 + 0.5;
    const isBright = fine > 0.68;
    const lum = Math.round(isBright ? (62 + wave * 34 + micro * 24) : (16 + wave * 22));
    ctx.strokeStyle = `rgba(${lum + 8}, ${lum + 3}, ${lum + 14}, ${isBright ? 0.62 : 0.48})`;
    ctx.lineWidth = isBright ? 1.5 : 1.8;
    const drift = Math.sin(x * 0.03) * 5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + drift, size * 0.33, x - drift, size * 0.66, x + drift * 0.4, size);
    ctx.stroke();

    const bVal = Math.round(isBright ? (175 + micro * 75) : (55 + wave * 65));
    bCtx.strokeStyle = `rgb(${bVal}, ${bVal}, ${bVal})`;
    bCtx.lineWidth = 1.6;
    bCtx.beginPath();
    bCtx.moveTo(x, 0);
    bCtx.bezierCurveTo(x + drift, size * 0.33, x - drift, size * 0.66, x + drift * 0.4, size);
    bCtx.stroke();
  }

  // 3) 兩道柔和橫向真髮絲緞反光帶（「天使光環」立體髮質高光！）
  [
    { y0: 0.14, h: 0.16, a: 0.32 },
    { y0: 0.48, h: 0.18, a: 0.24 }
  ].forEach((sh) => {
    const sheen = ctx.createLinearGradient(0, size * sh.y0, 0, size * (sh.y0 + sh.h));
    sheen.addColorStop(0, 'rgba(155, 145, 175, 0)');
    sheen.addColorStop(0.5, `rgba(170, 160, 190, ${sh.a})`);
    sheen.addColorStop(1, 'rgba(155, 145, 175, 0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, size * sh.y0, size, size * sh.h);
  });

  const map = makeCanvasTexture(colCanvas, true, true);
  map.repeat.set(2.2, 1);
  const bumpMap = makeCanvasTexture(bumpCanvas, false, true);
  bumpMap.repeat.set(2.2, 1);
  _cachedSilkyHairV46 = { map, bumpMap };
  return _cachedSilkyHairV46;
}
