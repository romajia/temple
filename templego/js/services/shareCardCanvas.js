/**
 * HTML5 <canvas> 一鍵生成「旅行祝賀分享卡」(1080 × 1920 直式高畫質圖)
 * - 和紙底紋 ＋ 夜間墨黑屋簷與發光台灣燈籠 ＋ 直書毛筆祝福語 ＋ 朱紅御朱印 ＋ 玩家累計公里數
 * - 支援下載 PNG 與 Web Share API 直接分享至 LINE / Instagram 限時動態
 */

import { SITE_CONFIG } from '../config/siteConfig.js';

export const BLESSING_PRESETS = [
  { id: 'temple', label: '採用本廟祝福語', text: '' },
  { id: 'morning', label: '早安平安（長輩親友推薦）', text: '早安平安・步步生蓮' },
  { id: 'family', label: '闔家安康', text: '闔家安康・萬事順遂' },
  { id: 'wealth', label: '財源廣進', text: '財源廣進・福祿滿堂' }
];

function drawWashiBackground(ctx, W, H) {
  // 主底色和紙米白 #F7F3E8
  const baseGrad = ctx.createLinearGradient(0, 0, 0, H);
  baseGrad.addColorStop(0, '#F9F5EB');
  baseGrad.addColorStop(0.55, '#F7F3E8');
  baseGrad.addColorStop(1, '#EFE7D4');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, W, H);

  // 細微和紙纖維紋理
  ctx.save();
  for (let i = 0; i < 2400; i++) {
    const x = (i * 197.3) % W;
    const y = (i * 353.7) % H;
    const len = 4 + (i % 14);
    const angle = (i % 180) * (Math.PI / 180);
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(180, 158, 124, 0.14)' : 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLanternHeader(ctx, W) {
  // 頂部墨黑宣紙慶典襯底 #1C1917
  const topH = 385;
  const headerGrad = ctx.createLinearGradient(0, 0, 0, topH);
  headerGrad.addColorStop(0, '#14110F');
  headerGrad.addColorStop(0.8, '#1C1917');
  headerGrad.addColorStop(1, '#29231F');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, W, topH);

  // 底部弧形波浪收邊與燙金線
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(0, topH - 6, W, 6);

  // 三盞台灣暖光紅燈籠
  const lanterns = [
    { x: 220, y: 180, rx: 74, ry: 96, text: '風調雨順', cordH: 85 },
    { x: 540, y: 205, rx: 84, ry: 108, text: '宮廟漫遊', cordH: 96 },
    { x: 860, y: 180, rx: 74, ry: 96, text: '國泰民安', cordH: 85 }
  ];

  lanterns.forEach((l) => {
    // 暖橘光暈 #F59E0B
    const halo = ctx.createRadialGradient(l.x, l.y, 18, l.x, l.y, l.ry * 2.1);
    halo.addColorStop(0, 'rgba(245, 158, 11, 0.52)');
    halo.addColorStop(0.45, 'rgba(245, 158, 11, 0.16)');
    halo.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.ry * 2.1, 0, Math.PI * 2);
    ctx.fill();

    // 吊繩
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(l.x, 0);
    ctx.lineTo(l.x, l.y - l.ry - 8);
    ctx.stroke();

    // 燈籠本體
    const bodyGrad = ctx.createRadialGradient(l.x, l.y - 10, 10, l.x, l.y, l.ry);
    bodyGrad.addColorStop(0, '#FFF0B8');
    bodyGrad.addColorStop(0.45, '#F59E0B');
    bodyGrad.addColorStop(0.85, '#C83C2B');
    bodyGrad.addColorStop(1, '#7D1910');

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(l.x, l.y, l.rx, l.ry, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 240, 195, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(l.x, l.y, l.rx * 0.56, l.ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 上下金蓋
    ctx.fillStyle = '#292524';
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 3;
    ctx.fillRect(l.x - 30, l.y - l.ry - 8, 60, 16);
    ctx.strokeRect(l.x - 30, l.y - l.ry - 8, 60, 16);
    ctx.fillRect(l.x - 26, l.y + l.ry - 6, 52, 14);
    ctx.strokeRect(l.x - 26, l.y + l.ry - 6, 52, 14);

    // 流蘇
    ctx.strokeStyle = '#C83C2B';
    ctx.lineWidth = 4;
    [-10, 0, 10].forEach((dx) => {
      ctx.beginPath();
      ctx.moveTo(l.x + dx * 0.6, l.y + l.ry + 8);
      ctx.lineTo(l.x + dx, l.y + l.ry + 44);
      ctx.stroke();
    });

    // 燈籠直書毛筆字
    ctx.fillStyle = '#292524';
    ctx.font = '700 34px "Yuji Syuku", "Noto Serif TC", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const chars = l.text.split('');
    const startY = l.y - ((chars.length - 1) * 38) / 2;
    chars.forEach((ch, idx) => {
      ctx.fillText(ch, l.x, startY + idx * 38);
    });
  });
}

function drawVermilionSeal(ctx, cx, cy, temple) {
  const isRare = temple.seedType === 'purple_gold';
  const sealChars = (temple.sealText || '台灣御印').split('');

  ctx.save();
  // 外圈和紙朱印卡底
  ctx.fillStyle = '#FCF9F0';
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = isRare ? 6 : 4;
  ctx.beginPath();
  ctx.roundRect(cx - 280, cy - 295, 560, 590, 24);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cx - 262, cy - 277, 524, 554, 16);
  ctx.stroke();

  // 朱紅雙圓印章
  ctx.strokeStyle = '#C83C2B';
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.arc(cx, cy - 45, 175, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 3.5;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.arc(cx, cy - 45, 155, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 中央方篆印
  ctx.fillStyle = 'rgba(200, 60, 43, 0.08)';
  ctx.strokeStyle = '#C83C2B';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(cx - 105, cy - 150, 210, 210, 14);
  ctx.fill();
  ctx.stroke();

  // 十字分隔細線
  ctx.strokeStyle = 'rgba(200, 60, 43, 0.42)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 140);
  ctx.lineTo(cx, cy + 50);
  ctx.moveTo(cx - 95, cy - 45);
  ctx.lineTo(cx + 95, cy - 45);
  ctx.stroke();

  // 四字朱印（右至左直讀）
  ctx.fillStyle = '#C83C2B';
  ctx.font = '700 76px "Yuji Syuku", "Noto Serif TC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sealChars[0] || '御', cx + 48, cy - 95);
  ctx.fillText(sealChars[1] || '朱', cx + 48, cy + 5);
  ctx.fillText(sealChars[2] || '平', cx - 48, cy - 95);
  ctx.fillText(sealChars[3] || '安', cx - 48, cy + 5);

  // 右上「奉拜」
  ctx.fillStyle = '#57534E';
  ctx.font = '700 32px "Yuji Syuku", "Noto Serif TC", serif';
  ctx.fillText('奉', cx + 220, cy - 220);
  ctx.fillText('拜', cx + 220, cy - 180);

  // 宮廟名稱（濃墨毛筆，長廟名自動微調字級）
  const nameFontSize = temple.name.length >= 7 ? 46 : 54;
  ctx.fillStyle = '#292524';
  ctx.font = `700 ${nameFontSize}px "Yuji Syuku", "Noto Serif TC", serif`;
  ctx.fillText(temple.name, cx, cy + 195);

  // 地區與工藝徽章名稱
  ctx.fillStyle = '#78716C';
  ctx.font = '600 28px "Noto Sans TC", sans-serif';
  ctx.fillText(`${temple.city}${temple.district} ・ ${temple.craftName}`, cx, cy + 248);

  // 模擬印泥細微飛白顆粒
  ctx.fillStyle = 'rgba(247, 243, 232, 0.42)';
  for (let i = 0; i < 240; i++) {
    const px = cx - 180 + ((i * 73) % 360);
    const py = cy - 225 + ((i * 119) % 360);
    ctx.fillRect(px, py, 2.5, 2.5);
  }
  ctx.restore();
}

/**
 * 合成 1080×1920 高畫質旅行祝賀分享卡，回傳 { dataUrl, blob }
 */
export async function generateShareCard({
  temple,
  totalDistanceKm,
  collectedCount,
  stampedAt,
  blessingText
}) {
  if (document.fonts && document.fonts.ready) {
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 800))
      ]);
    } catch {
      // ignore font loading timeout
    }
  }

  const W = 1080;
  const H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 1. 和紙底紋
  drawWashiBackground(ctx, W, H);

  // 2. 頂部墨黑屋簷＋發光燈籠
  drawLanternHeader(ctx, W);

  // 3. 外框燙金雙線
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 5;
  ctx.strokeRect(42, 422, W - 84, H - 464);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(56, 436, W - 112, H - 492);

  // 4. 祝福毛筆標題（長輩圖高級質感版）
  const activeBlessing = blessingText || temple.blessing || '風調雨順・步步平安';
  ctx.fillStyle = '#C83C2B';
  ctx.font = '700 62px "Yuji Syuku", "Noto Serif TC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(activeBlessing, W / 2, 515);

  // 裝飾分隔金線
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(270, 568);
  ctx.lineTo(810, 568);
  ctx.stroke();

  // 5. 中央朱紅御朱印卡
  drawVermilionSeal(ctx, W / 2, 915, temple);

  // 6. 旅人里程與成就銘牌
  const plaqueY = 1280;
  ctx.fillStyle = '#292524';
  ctx.beginPath();
  ctx.roundRect(110, plaqueY, W - 220, 236, 24);
  ctx.fill();
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = '#F5DF98';
  ctx.font = '700 30px "Noto Sans TC", sans-serif';
  ctx.fillText('臺灣宮廟行旅足跡紀錄', W / 2, plaqueY + 54);

  // 兩欄數據
  const kmText = `${Number(totalDistanceKm || 0).toFixed(2)} km`;
  const countText = `${collectedCount} 枚`;

  ctx.fillStyle = '#F59E0B';
  ctx.font = '900 58px "Noto Sans TC", sans-serif';
  ctx.fillText(kmText, W / 2 - 200, plaqueY + 132);
  ctx.fillText(countText, W / 2 + 200, plaqueY + 132);

  ctx.fillStyle = '#E7E0D2';
  ctx.font = '500 26px "Noto Sans TC", sans-serif';
  ctx.fillText('累計旅行總距離', W / 2 - 200, plaqueY + 188);
  ctx.fillText('已顯化御朱印', W / 2 + 200, plaqueY + 188);

  // 中間分隔線
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2, plaqueY + 95);
  ctx.lineTo(W / 2, plaqueY + 202);
  ctx.stroke();

  // 7. 參拜日期與香火苗種類
  const seedDef = SITE_CONFIG.seedTypes[temple.seedType] || SITE_CONFIG.seedTypes.vermilion;
  const dateObj = stampedAt ? new Date(stampedAt) : new Date();
  const dateLabel = `${dateObj.getFullYear()} 年 ${dateObj.getMonth() + 1} 月 ${dateObj.getDate()} 日 顯化收錄`;

  ctx.fillStyle = '#57534E';
  ctx.font = '600 30px "Noto Sans TC", sans-serif';
  ctx.fillText(`${seedDef.name['zh-TW']} ・ ${dateLabel}`, W / 2, 1595);

  // 8. 底部品牌印記
  ctx.fillStyle = '#292524';
  ctx.font = '700 44px "Yuji Syuku", "Noto Serif TC", serif';
  ctx.fillText('《御朱燈影：跟著宮廟去旅行》', W / 2, 1705);

  ctx.fillStyle = '#78716C';
  ctx.font = '500 26px "Noto Sans TC", sans-serif';
  ctx.fillText('免下載網頁版・與臺灣百年宮廟香火同行', W / 2, 1765);

  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  return { dataUrl, blob };
}

export function downloadShareCard(dataUrl, templeName) {
  const link = document.createElement('a');
  const safeName = (templeName || 'temple').replace(/\s+/g, '');
  link.download = `御朱燈影_${safeName}_祝賀分享卡.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function shareCardViaWebShare({ blob, dataUrl, temple, totalDistanceKm, blessingText }) {
  const title = `《御朱燈影》${temple.name} 御朱印顯化祝福`;
  const text = `${blessingText || temple.blessing}！我已跟著宮廟旅行累積 ${Number(totalDistanceKm || 0).toFixed(2)} 公里，剛收錄了「${temple.name}」的朱紅御朱印！🏮`;

  try {
    if (navigator.share && blob) {
      const file = new File([blob], `goshuin_${temple.id}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title, text, files: [file] });
        return { ok: true, mode: 'file' };
      }
      await navigator.share({ title, text, url: window.location.href });
      return { ok: true, mode: 'text' };
    }
  } catch (err) {
    if (err && err.name === 'AbortError') {
      return { ok: false, aborted: true };
    }
  }

  // 不支援 Web Share API 的桌機瀏覽器自動降級為下載圖片 + 複製祝福語
  downloadShareCard(dataUrl, temple.name);
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  } catch {
    // ignore clipboard restrictions
  }
  return { ok: true, mode: 'fallback_download' };
}
