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
 * 8. 工筆重彩級「金碧青綠山水・觀音佛祖聯畫」(1024×1280)
 *    仿宋元工筆鐵線描：石青石綠泥金山巒、雲亭飛瀑、細節竹枝、金箔蓮瓣大背光、
 *    工筆白衣觀音持楊枝淨瓶、善財龍女與盛開重瓣蓮池！
 */
export function createSanctuaryGuanyinMuralTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1280;
  const ctx = canvas.getContext('2d');

  // 1. 溫潤古絹工筆泥金底色
  const sky = ctx.createLinearGradient(0, 0, 0, 1280);
  sky.addColorStop(0, '#F4E3B2');
  sky.addColorStop(0.24, '#EADCB0');
  sky.addColorStop(0.50, '#C7D6B2');
  sky.addColorStop(0.75, '#7FA98B');
  sky.addColorStop(1, '#315C52');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1024, 1280);

  // 古絹微細織紋
  ctx.strokeStyle = 'rgba(130, 105, 60, 0.05)';
  ctx.lineWidth = 1;
  for (let y = 0; y < 1280; y += 8) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
  }

  // 2. 工筆青綠金碧山巒（鐵線描墨線 ＋ 石青石綠層染 ＋ 泥金山脊！）
  const drawGongbiMountain = (pts, topCol, botCol, hasGoldLine) => {
    const g = ctx.createLinearGradient(0, 380, 0, 1050);
    g.addColorStop(0, topCol);
    g.addColorStop(1, botCol);
    ctx.beginPath();
    ctx.moveTo(0, 1280);
    pts.forEach(([x, y], i) => {
      if (i === 0) ctx.lineTo(x, y);
      else {
        const [px, py] = pts[i - 1];
        ctx.quadraticCurveTo((px + x) / 2, Math.min(py, y) - 18, x, y);
      }
    });
    ctx.lineTo(1024, 1280);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();

    // 鐵線描山峰墨線與泥金勾勒
    ctx.strokeStyle = '#334E44';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();

    if (hasGoldLine) {
      ctx.strokeStyle = 'rgba(248, 218, 124, 0.72)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y + 4) : ctx.lineTo(x, y + 4)));
      ctx.stroke();
    }
  };

  drawGongbiMountain([[0, 580], [120, 420], [260, 520], [420, 460], [600, 470], [780, 520], [910, 410], [1024, 540]], '#8BB3A1', '#4E7D70', true);
  drawGongbiMountain([[0, 700], [140, 520], [300, 650], [490, 620], [700, 660], [870, 510], [1024, 650]], '#5C917D', '#2D5A4E', true);
  drawGongbiMountain([[0, 860], [190, 710], [380, 830], [640, 835], [845, 700], [1024, 850]], '#3E7563', '#1E453B', false);

  // 工筆飛瀑細絲（左右雙瀑＋水霧暈染）
  [[158, 530, 265], [858, 525, 270]].forEach(([wx, wy, wh]) => {
    const wf = ctx.createLinearGradient(wx, wy, wx, wy + wh);
    wf.addColorStop(0, 'rgba(255,255,250,0.85)');
    wf.addColorStop(0.7, 'rgba(220,246,252,0.55)');
    wf.addColorStop(1, 'rgba(210,242,248,0)');
    ctx.fillStyle = wf;
    ctx.fillRect(wx - 16, wy, 32, wh);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.6;
    for (let s = -10; s <= 10; s += 5) {
      ctx.beginPath(); ctx.moveTo(wx + s, wy); ctx.lineTo(wx + s, wy + wh * 0.85); ctx.stroke();
    }
  });

  // 遠山古亭與松樹（工筆山水點睛！）
  ctx.fillStyle = '#8F3124';
  ctx.beginPath();
  ctx.moveTo(862, 502); ctx.lineTo(892, 480); ctx.lineTo(922, 502); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#523422';
  ctx.fillRect(874, 502, 5, 18); ctx.fillRect(905, 502, 5, 18);

  // 層疊飄渺金邊工筆祥雲
  for (let i = 0; i < 10; i++) {
    const cx = 80 + i * 102;
    const cy = 585 + (i % 3) * 52;
    ctx.fillStyle = 'rgba(255, 250, 232, 0.34)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 118, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(248, 222, 145, 0.42)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx - 32, cy - 6, 26, Math.PI, 0);
    ctx.arc(cx + 18, cy - 10, 32, Math.PI, 0);
    ctx.stroke();
  }

  // 3. 工筆分節翠竹與雙鉤竹葉
  const drawGongbiBamboo = (isLeft) => {
    ctx.save();
    if (!isLeft) { ctx.translate(1024, 0); ctx.scale(-1, 1); }
    ctx.strokeStyle = '#254C2E';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-10, 35); ctx.quadraticCurveTo(155, 92, 310, 195);
    ctx.moveTo(45, -10); ctx.quadraticCurveTo(190, 56, 365, 118);
    ctx.stroke();

    for (let i = 0; i < 28; i++) {
      const lx = 18 + (i * 25) % 355;
      const ly = 14 + (i * 17) % 192;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(0.42 + (i % 6) * 0.20);
      ctx.fillStyle = i % 3 === 0 ? '#1E4627' : i % 3 === 1 ? '#2F653B' : '#4C8951';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(10, 22, 0, 58);
      ctx.quadraticCurveTo(-10, 22, 0, 0);
      ctx.fill();
      ctx.strokeStyle = '#A8D49E';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, 46); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  };
  drawGongbiBamboo(true);
  drawGongbiBamboo(false);

  // 4. 左上工筆白金祥瑞鸚鵡（細緻羽紋與銜珠）
  ctx.save();
  ctx.translate(152, 176);
  ctx.fillStyle = '#FFF5CC';
  ctx.strokeStyle = '#7A5218';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(0, 0, 34, 16, -0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-8, -6); ctx.quadraticCurveTo(-60, -68, -78, -22); ctx.quadraticCurveTo(-42, 4, -8, 6);
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(12, -10); ctx.quadraticCurveTo(50, -56, 66, -24); ctx.quadraticCurveTo(34, -2, 12, 0);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#D97706';
  ctx.beginPath(); ctx.arc(28, -12, 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // 5. 工筆重金箔蓮瓣大背光
  const cx = 512;
  const cy = 276;
  const haloGlow = ctx.createRadialGradient(cx, cy, 32, cx, cy, 218);
  haloGlow.addColorStop(0, '#FFFDF0');
  haloGlow.addColorStop(0.42, '#FBE06E');
  haloGlow.addColorStop(0.75, '#D49A22');
  haloGlow.addColorStop(1, 'rgba(212, 154, 34, 0)');
  ctx.fillStyle = haloGlow;
  ctx.beginPath(); ctx.arc(cx, cy, 214, 0, Math.PI * 2); ctx.fill();

  // 精細金絲花瓣光輪（32 瓣工筆蓮光）
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 250, 210, 0.78)' : 'rgba(166, 108, 18, 0.45)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 112, cy + Math.sin(a) * 112);
    ctx.lineTo(cx + Math.cos(a) * 168, cy + Math.sin(a) * 168);
    ctx.stroke();
  }
  ctx.strokeStyle = '#8A5A10'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(cx, cy, 154, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#FFF5C2'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy, 142, 0, Math.PI * 2); ctx.stroke();

  // 6. 工筆白衣觀音大士（細緻法相、衣褶鐵線描、持楊枝與青瓷淨瓶）
  ctx.fillStyle = '#FBF6E6';
  ctx.strokeStyle = '#6E512B';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(386, 376);
  ctx.quadraticCurveTo(416, 166, 512, 154);
  ctx.quadraticCurveTo(608, 166, 638, 376);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // 朱紅化佛天冠＋金絲寶珠
  ctx.fillStyle = '#C82824';
  ctx.beginPath(); ctx.moveTo(474, 178); ctx.lineTo(512, 106); ctx.lineTo(550, 178); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#FAD364'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#FCE068'; ctx.beginPath(); ctx.arc(512, 152, 14, 0, Math.PI * 2); ctx.fill();

  // 溫潤工筆聖容
  const faceG = ctx.createRadialGradient(502, 244, 8, 512, 256, 66);
  faceG.addColorStop(0, '#FFF1DA');
  faceG.addColorStop(0.75, '#E9CAA0');
  faceG.addColorStop(1, '#CFA676');
  ctx.fillStyle = faceG;
  ctx.beginPath(); ctx.ellipse(512, 256, 54, 66, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7E5A32'; ctx.lineWidth = 2.2; ctx.stroke();

  ctx.fillStyle = '#DC2626'; ctx.beginPath(); ctx.arc(512, 222, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3F2815'; ctx.lineWidth = 2.8;
  [-1, 1].forEach((s) => {
    ctx.beginPath(); ctx.arc(512 + s * 22, 246, 14, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
    ctx.beginPath(); ctx.arc(512 + s * 22, 254, 10, 0.14, Math.PI - 0.14); ctx.stroke();
  });
  ctx.fillStyle = '#C8322E';
  ctx.beginPath(); ctx.ellipse(512, 292, 11, 4.5, 0, 0, Math.PI * 2); ctx.fill();

  // 盤坐工筆白衣金邊法袍 ＋ 細膩飄逸衣褶線條
  const robeG = ctx.createLinearGradient(310, 340, 714, 680);
  robeG.addColorStop(0, '#FDF8EA');
  robeG.addColorStop(0.55, '#E8DFC0');
  robeG.addColorStop(1, '#C5B084');
  ctx.fillStyle = robeG;
  ctx.beginPath();
  ctx.moveTo(292, 675);
  ctx.quadraticCurveTo(354, 386, 462, 336);
  ctx.lineTo(562, 336);
  ctx.quadraticCurveTo(670, 386, 732, 675);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#6B502A'; ctx.lineWidth = 3.5; ctx.stroke();

  // 工筆衣紋線條與金鑲瓔珞
  ctx.strokeStyle = 'rgba(110, 82, 42, 0.55)'; ctx.lineWidth = 2.2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(512, 360 + i * 52, 85 + i * 24, 0.28, Math.PI - 0.28);
    ctx.stroke();
  }
  ctx.strokeStyle = '#E5B94C'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(512, 346, 56, 0.24, Math.PI - 0.24); ctx.stroke();

  // 青瓷玉淨瓶與翠綠楊柳枝
  ctx.fillStyle = '#99D5C9';
  ctx.strokeStyle = '#2F685E'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(422, 540, 22, 32, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillRect(415, 494, 14, 20);
  ctx.strokeStyle = '#2E7D32'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(422, 494); ctx.quadraticCurveTo(400, 445, 376, 466); ctx.stroke();

  // 重瓣工筆粉紅大蓮花寶座（內外兩層細緻花瓣）
  for (let layer = 0; layer < 2; layer++) {
    const count = layer === 0 ? 7 : 5;
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * (layer === 0 ? 54 : 46);
      ctx.fillStyle = layer === 0 ? '#F29BB0' : '#FAD2DC';
      ctx.strokeStyle = '#9E465C'; ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(512 + offset, 684 + layer * 14 - Math.abs(offset) * 0.04, 42, 24, offset * 0.002, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
  }

  // 7. 工筆善財童子（左）與龍女（右）
  [
    { x: 215, y: 478, robe: '#DC7A48', trim: '#F5C442' },
    { x: 809, y: 478, robe: '#4A9C92', trim: '#F472B6' }
  ].forEach(({ x, y, robe, trim }) => {
    ctx.fillStyle = '#FFEBD0'; ctx.strokeStyle = '#6E4C28'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y - 62, 26, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = robe;
    ctx.beginPath();
    ctx.moveTo(x - 44, y + 92);
    ctx.quadraticCurveTo(x - 32, y - 24, x, y - 28);
    ctx.quadraticCurveTo(x + 32, y - 24, x + 44, y + 92);
    ctx.closePath();
    ctx.fill(); ctx.strokeStyle = trim; ctx.lineWidth = 4; ctx.stroke();
  });

  // 8. 底部荷花清池與工筆水波紋
  ctx.strokeStyle = 'rgba(215, 240, 232, 0.25)'; ctx.lineWidth = 2;
  for (let r = 0; r < 5; r++) {
    ctx.beginPath(); ctx.ellipse(512, 960 + r * 62, 420 - r * 30, 18, 0, 0, Math.PI * 2); ctx.stroke();
  }
  for (let i = 0; i < 7; i++) {
    const lx = 110 + i * 134;
    const ly = 960 + (i % 2) * 58;
    ctx.fillStyle = '#2B6246'; ctx.strokeStyle = '#6FA682'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(lx, ly, 62, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (i % 2 === 0) {
      ctx.fillStyle = '#F9A8D4'; ctx.strokeStyle = '#9E465C'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(lx, ly - 16, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }

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
  const baseA = isMother ? '#8C624C' : variant === 'centerKing' ? '#A06C4A' : '#785442';
  const baseB = isMother ? '#4E3125' : variant === 'centerKing' ? '#5A3724' : '#3E271E';

  const g = ctx.createRadialGradient(512, 468, 70, 512, 512, 512);
  g.addColorStop(0, baseA);
  g.addColorStop(0.64, baseB);
  g.addColorStop(1, '#261711');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 1024);

  // 細緻樟木雕刻直向木紋肌理
  for (let x = 0; x < 1024; x += 6) {
    ctx.strokeStyle = x % 12 === 0 ? 'rgba(255, 220, 175, 0.05)' : 'rgba(22, 10, 6, 0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + Math.sin(x * 0.03) * 10, 340, x - Math.cos(x * 0.025) * 10, 680, x, 1024);
    ctx.stroke();
  }

  // 明顯木雕額骨、顴骨與下巴圓潤受光面（凸顯 3D 木雕立體感！）
  const drawCarvedHighlight = (cx, cy, rx, ry, alpha = 0.34) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    const hg = ctx.createRadialGradient(0, 0, 8, 0, 0, rx);
    hg.addColorStop(0, `rgba(255, 232, 196, ${alpha})`);
    hg.addColorStop(0.55, `rgba(232, 186, 138, ${alpha * 0.45})`);
    hg.addColorStop(1, 'rgba(232, 186, 138, 0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  drawCarvedHighlight(512, 355, 140, 82, 0.34); // 飽滿天庭額頭
  drawCarvedHighlight(372, 568, 76, 56, 0.30);  // 左顴骨木雕高光
  drawCarvedHighlight(652, 568, 76, 56, 0.30);  // 右顴骨木雕高光
  drawCarvedHighlight(512, 742, 68, 42, 0.28);  // 飽滿下頷木雕高光

  // 深邃木雕眼窩凹槽陰影（眉骨下方、鼻樑兩側）
  [-1, 1].forEach((s) => {
    const sx = 512 + s * 108;
    const sock = ctx.createRadialGradient(sx, 504, 18, sx, 504, 82);
    sock.addColorStop(0, 'rgba(20, 9, 5, 0.56)');
    sock.addColorStop(0.65, 'rgba(32, 16, 10, 0.28)');
    sock.addColorStop(1, 'rgba(32, 16, 10, 0)');
    ctx.fillStyle = sock;
    ctx.beginPath(); ctx.arc(sx, 504, 82, 0, Math.PI * 2); ctx.fill();

    // 雕刻眉骨上方亮脊
    ctx.strokeStyle = 'rgba(255, 224, 180, 0.36)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(512 + s * 36, 428);
    ctx.quadraticCurveTo(512 + s * 112, 392, 512 + s * 184, 434);
    ctx.stroke();

    // 臉頰微紅神采
    const blush = ctx.createRadialGradient(512 + s * 150, 586, 10, 512 + s * 150, 586, 78);
    blush.addColorStop(0, 'rgba(226, 118, 86, 0.34)');
    blush.addColorStop(1, 'rgba(226, 118, 86, 0)');
    ctx.fillStyle = blush;
    ctx.beginPath(); ctx.arc(512 + s * 150, 586, 78, 0, Math.PI * 2); ctx.fill();

    // 木雕法令紋（鼻翼延伸至嘴角，立體雕塑感十足！）
    ctx.strokeStyle = 'rgba(24, 11, 7, 0.42)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(512 + s * 46, 594);
    ctx.quadraticCurveTo(512 + s * 78, 636, 512 + s * 84, 686);
    ctx.stroke();
  });

  // 眉心吉祥金箔白毫珠（凸面金漆立體陰影）
  ctx.fillStyle = 'rgba(24, 10, 6, 0.55)';
  ctx.beginPath(); ctx.arc(514, 424, 16, 0, Math.PI * 2); ctx.fill();
  const bindu = ctx.createRadialGradient(508, 416, 2, 512, 420, 16);
  bindu.addColorStop(0, '#FFFDF0');
  bindu.addColorStop(0.55, '#FAD364');
  bindu.addColorStop(1, '#B47412');
  ctx.fillStyle = bindu;
  ctx.beginPath(); ctx.arc(512, 420, 14, 0, Math.PI * 2); ctx.fill();

  // 精緻柳葉慈眉 / 威嚴劍眉 ＋ 明顯雙眼皮木雕折痕 ＋ 傳神鳳眼
  ctx.lineCap = 'round';
  [-1, 1].forEach((s) => {
    ctx.strokeStyle = '#120A08';
    ctx.lineWidth = isMother ? 13 : 20;
    ctx.beginPath();
    if (isMother) {
      ctx.moveTo(512 + s * 40, 448);
      ctx.quadraticCurveTo(512 + s * 112, 404, 512 + s * 180, 450);
    } else {
      ctx.moveTo(512 + s * 36, 452);
      ctx.quadraticCurveTo(512 + s * 108, 410, 512 + s * 190, 418);
    }
    ctx.stroke();

    const ex = 512 + s * 106;
    const ey = 510;

    // 深雕雙眼皮與臥蠶下緣
    ctx.strokeStyle = 'rgba(18, 8, 5, 0.80)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(ex, ey + 14, 56, Math.PI * 1.16, Math.PI * 1.84);
    ctx.stroke();

    // 眼白與漸層虹膜
    ctx.fillStyle = '#F8F1E4';
    ctx.beginPath(); ctx.ellipse(ex, ey, 44, isMother ? 18 : 24, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#331D14';
    ctx.beginPath(); ctx.arc(ex, ey, isMother ? 18 : 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#100807';
    ctx.beginPath(); ctx.arc(ex, ey, isMother ? 11 : 13, 0, Math.PI * 2); ctx.fill();

    // 眼神雙高光
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(ex - 6, ey - 6, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + 5, ey + 4, 2.5, 0, Math.PI * 2); ctx.fill();

    // 鳳眼上眼線與微揚眼尾
    ctx.strokeStyle = '#100806';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(ex, ey + 8, 46, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    // 下眼瞼木雕亮邊
    ctx.strokeStyle = 'rgba(255, 224, 184, 0.30)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(ex, ey - 4, 42, 0.25, Math.PI - 0.25);
    ctx.stroke();
  });

  // 高挺木雕鼻樑（深雕兩側鼻影 ＋ 亮金漆鼻脊 ＋ 精雕鼻頭鼻翼與人中凹槽！）
  [-1, 1].forEach((s) => {
    ctx.strokeStyle = 'rgba(20, 9, 5, 0.62)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(512 + s * 22, 468);
    ctx.lineTo(512 + s * 28, 588);
    ctx.stroke();
  });
  const noseGrad = ctx.createLinearGradient(492, 470, 532, 600);
  noseGrad.addColorStop(0, 'rgba(255, 232, 194, 0.56)');
  noseGrad.addColorStop(0.5, 'rgba(255, 224, 180, 0.45)');
  noseGrad.addColorStop(1, 'rgba(255, 238, 206, 0.62)');
  ctx.strokeStyle = noseGrad;
  ctx.lineWidth = 16;
  ctx.beginPath(); ctx.moveTo(512, 468); ctx.lineTo(512, 594); ctx.stroke();

  // 鼻頭圓潤高光與鼻翼陰影
  drawCarvedHighlight(512, 590, 26, 18, 0.45);
  ctx.strokeStyle = 'rgba(22, 10, 6, 0.72)';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(512, 594, 30, 0.22, Math.PI - 0.22); ctx.stroke();
  // 人中兩側雕刻線
  [-10, 10].forEach((ox) => {
    ctx.strokeStyle = 'rgba(255, 224, 184, 0.32)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(512 + ox, 616); ctx.lineTo(512 + ox * 1.15, 650); ctx.stroke();
  });

  // 端莊朱紅神唇（含上唇弓線、深雕唇線與下唇凹陰影）
  ctx.fillStyle = '#C9322C';
  ctx.beginPath();
  ctx.moveTo(458, 668);
  ctx.quadraticCurveTo(490, 644, 512, 658);
  ctx.quadraticCurveTo(534, 644, 566, 668);
  ctx.quadraticCurveTo(512, 702, 458, 668);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#4B0E0C'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(462, 668); ctx.lineTo(562, 668); ctx.stroke();
  ctx.fillStyle = 'rgba(255, 226, 214, 0.45)';
  ctx.beginPath(); ctx.ellipse(512, 678, 20, 5, 0, 0, Math.PI * 2); ctx.fill();
  // 下唇底端深木雕陰影
  ctx.strokeStyle = 'rgba(22, 10, 6, 0.55)';
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(512, 686, 36, 0.35, Math.PI - 0.35); ctx.stroke();

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
    g.addColorStop(0, '#D49E32'); g.addColorStop(0.5, '#AC761A'); g.addColorStop(1, '#784A0D');
  } else if (variant === 'centerKing') {
    g.addColorStop(0, '#EE6024'); g.addColorStop(0.5, '#C83618'); g.addColorStop(1, '#841912');
  } else {
    g.addColorStop(0, '#72231E'); g.addColorStop(0.5, '#4A1715'); g.addColorStop(1, '#2A0E0E');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 1024);

  // 細密金線龍鱗／魚鱗戰甲繡紋
  ctx.strokeStyle = 'rgba(255, 224, 128, 0.36)';
  ctx.lineWidth = 3;
  for (let y = 56; y < 780; y += 44) {
    for (let x = 0; x < 1024; x += 50) {
      const ox = (Math.floor(y / 44) % 2) * 25;
      ctx.beginPath(); ctx.arc(x + ox, y, 22, 0, Math.PI); ctx.stroke();
    }
  }

  // 華麗金線盤龍與纏枝寶花團徽
  const drawEmbroideredDragonMedallion = (mx, my, r) => {
    ctx.fillStyle = 'rgba(252, 214, 100, 0.22)';
    ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FCE068'; ctx.lineWidth = 8; ctx.stroke();
    ctx.strokeStyle = '#991B1B'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(mx, my, r * 0.88, 0, Math.PI * 2); ctx.stroke();

    // 團花內蜿蜒盤金龍
    ctx.strokeStyle = '#FFF5B8'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(mx, my, r * 0.56, 0.3, Math.PI * 1.85);
    ctx.stroke();
    ctx.fillStyle = '#EF4444';
    ctx.beginPath(); ctx.arc(mx, my, r * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFF7C2'; ctx.lineWidth = 3; ctx.stroke();

    // 外環 16 顆繡金亮片珠
    ctx.fillStyle = '#FFF9C4';
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(mx + Math.cos(a) * (r * 0.94), my + Math.sin(a) * (r * 0.94), 4.5, 0, Math.PI * 2); ctx.fill();
    }
  };
  drawEmbroideredDragonMedallion(512, 340, 146);
  drawEmbroideredDragonMedallion(224, 575, 86);
  drawEmbroideredDragonMedallion(800, 575, 86);

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
 * 12. 紅綾金字神明肩帶紋理（還原實景照「鎮安宮五年千歲祖廟」紅綾背帶！）
 */
export function createDeitySashTexture(text = '玉勅代天府德慈宮') {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#C81E24';
  ctx.fillRect(0, 0, 128, 512);
  ctx.strokeStyle = '#FAD364';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 6, 112, 500);

  const chars = [...text];
  const step = 440 / Math.max(chars.length, 1);
  ctx.fillStyle = '#FFE88A';
  ctx.font = '900 38px "DFKai-SB", "Noto Serif TC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  chars.forEach((ch, i) => ctx.fillText(ch, 64, 42 + i * step));

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
 * 16. 工匠精雕石材紋理（花崗岩鑿痕 ＋ 淺浮雕回紋凹框，單例快取加速載入！）
 */
let _cachedCarvedStoneTex = null;
export function createCarvedStoneTexture() {
  if (_cachedCarvedStoneTex) return _cachedCarvedStoneTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#CACFD4';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 420; i++) {
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.22)' : i % 3 === 1 ? 'rgba(80,88,96,0.14)' : 'rgba(130,138,146,0.12)';
    ctx.fillRect((i * 79) % 254, (i * 137) % 254, 2, 2);
  }
  ctx.strokeStyle = '#E6EAEE';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 244, 244);
  ctx.strokeStyle = '#8F97A0';
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, 232, 232);

  const tex = makeCanvasTexture(canvas, true, false);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  _cachedCarvedStoneTex = tex;
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
