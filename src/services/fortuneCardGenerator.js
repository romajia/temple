/**
 * 動態 Canvas 生成「玉勅代天府德慈宮 祈福籤詩圖卡」PNG 供下載分享
 */
export function generateFortuneCardDataURL({ userName, poem, interpretation }) {
  const w = 720;
  const h = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // 1. 宣紙米金漸層背景
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#FFF8E7');
  bg.addColorStop(0.5, '#FCEFD4');
  bg.addColorStop(1, '#F6DEC0');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // 細緻雲紋底紋
  ctx.strokeStyle = 'rgba(185, 43, 39, 0.06)';
  ctx.lineWidth = 2;
  for (let y = 60; y < h; y += 110) {
    for (let x = 60; x < w; x += 120) {
      ctx.beginPath();
      ctx.arc(x, y, 28, 0, Math.PI, true);
      ctx.stroke();
    }
  }

  // 2. 傳統紅金雙層外框
  ctx.strokeStyle = '#9E1F1B';
  ctx.lineWidth = 10;
  ctx.strokeRect(24, 24, w - 48, h - 48);

  ctx.strokeStyle = '#D49B35';
  ctx.lineWidth = 3;
  ctx.strokeRect(38, 38, w - 76, h - 76);

  // 四角回紋裝飾
  const corners = [
    [48, 48],
    [w - 76, 48],
    [48, h - 76],
    [w - 76, h - 76]
  ];
  ctx.strokeStyle = '#B92B27';
  ctx.lineWidth = 3;
  corners.forEach(([cx, cy]) => {
    ctx.strokeRect(cx, cy, 28, 28);
    ctx.strokeRect(cx + 6, cy + 6, 16, 16);
  });

  // 3. 頂部紅金牌匾橫幅
  ctx.fillStyle = '#9E1F1B';
  roundRect(ctx, 130, 72, w - 260, 76, 12);
  ctx.fill();
  ctx.strokeStyle = '#F2C94C';
  ctx.lineWidth = 3;
  roundRect(ctx, 136, 78, w - 272, 64, 8);
  ctx.stroke();

  ctx.fillStyle = '#FFE28A';
  ctx.font = 'bold 34px "Noto Serif TC", "Microsoft JhengHei", serif';
  ctx.textAlign = 'center';
  ctx.fillText('玉勅代天府德慈宮', w / 2, 122);

  // 副標
  ctx.fillStyle = '#7A2E1D';
  ctx.font = '600 18px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.fillText('代天巡狩・五府千歲・觀音佛祖・天上聖母 靈籤', w / 2, 182);

  // 4. 籤號與吉凶大印章
  ctx.fillStyle = '#B92B27';
  roundRect(ctx, 170, 212, w - 340, 72, 36);
  ctx.fill();

  ctx.fillStyle = '#FFF7DF';
  ctx.font = 'bold 30px "Noto Serif TC", "Microsoft JhengHei", serif';
  ctx.fillText(`第 ${poem.id} 籤  ・  ${poem.stem}  ・  ${poem.level}`, w / 2, 259);

  // 5. 籤詩紅框宣紙區
  ctx.fillStyle = 'rgba(255, 252, 245, 0.88)';
  roundRect(ctx, 84, 316, w - 168, 288, 16);
  ctx.fill();
  ctx.strokeStyle = '#D49B35';
  ctx.lineWidth = 2.5;
  roundRect(ctx, 84, 316, w - 168, 288, 16);
  ctx.stroke();

  ctx.fillStyle = '#3B1B12';
  ctx.font = 'bold 36px "Noto Serif TC", "Microsoft JhengHei", serif';
  poem.poem.forEach((line, idx) => {
    ctx.fillText(line, w / 2, 384 + idx * 62);
  });

  // 典故標籤
  ctx.fillStyle = '#9E1F1B';
  ctx.font = '600 18px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.fillText(`【聖意典故】${poem.story}`, w / 2, 646);

  // 6. AI 廟公祝福金句區
  ctx.fillStyle = 'rgba(185, 43, 39, 0.08)';
  roundRect(ctx, 84, 676, w - 168, 200, 14);
  ctx.fill();

  ctx.fillStyle = '#8E1B1B';
  ctx.font = 'bold 22px "Noto Serif TC", "Microsoft JhengHei", serif';
  ctx.fillText(`✦ 廟公給 ${userName || '善信大德'} 的暖心叮嚀 ✦`, w / 2, 720);

  ctx.fillStyle = '#4A2618';
  ctx.font = '500 23px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  wrapText(ctx, interpretation.cardQuote, w / 2, 766, w - 220, 36);

  // 7. 底部印章與日期
  const today = new Date().toLocaleDateString('zh-TW');
  ctx.fillStyle = '#7D5A44';
  ctx.font = '500 18px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.fillText(`求籤日期：${today}　｜　線上誠心祈福・平安順遂`, w / 2, 956);

  // 朱紅方印
  ctx.strokeStyle = '#C8232C';
  ctx.lineWidth = 4;
  ctx.strokeRect(w - 148, 902, 74, 74);
  ctx.fillStyle = '#C8232C';
  ctx.font = 'bold 24px "Noto Serif TC", serif';
  ctx.fillText('德慈', w - 111, 932);
  ctx.fillText('保佑', w - 111, 962);

  ctx.fillStyle = '#9A6D4E';
  ctx.font = '500 15px "Noto Sans TC", sans-serif';
  ctx.fillText('玉勅代天府德慈宮 3D 線上參拜紀念籤卡', w / 2, 1002);

  return canvas.toDataURL('image/png');
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(ctx, text, cx, startY, maxWidth, lineHeight) {
  const chars = [...text];
  let line = '';
  let y = startY;
  for (let i = 0; i < chars.length; i++) {
    const testLine = line + chars[i];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, cx, y);
      line = chars[i];
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, cx, y);
}
