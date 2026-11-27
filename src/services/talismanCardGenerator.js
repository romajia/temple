/**
 * 玉勅代天府德慈宮・數位平安符圖卡生成器（Canvas PNG 可下載保存）
 * - 支援「觀音佛祖出入平安符」與「代天巡狩順遂符」
 */
export function generateTalismanCardDataUrl({ talisman, holderName = '虔誠香客' }) {
  const canvas = document.createElement('canvas');
  const w = 640;
  const h = 1040;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  const isGuanyin = talisman?.id === 'guanyin_safe';
  const bgTop = isGuanyin ? '#143D33' : '#7A1111';
  const bgMid = isGuanyin ? '#1D5647' : '#A81C18';
  const bgBot = isGuanyin ? '#0E2B24' : '#580B0B';
  const accent = '#FAD364';
  const paper = '#FFF9E8';

  // 1. 錦緞底紋漸層
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, bgTop);
  grad.addColorStop(0.5, bgMid);
  grad.addColorStop(1, bgBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 細緻雲紋格線
  ctx.strokeStyle = 'rgba(250, 211, 100, 0.12)';
  ctx.lineWidth = 2;
  for (let y = 40; y < h; y += 64) {
    for (let x = 40; x < w; x += 64) {
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 2. 雙層金邊宮廷框
  ctx.strokeStyle = accent;
  ctx.lineWidth = 10;
  ctx.strokeRect(24, 24, w - 48, h - 48);
  ctx.lineWidth = 3;
  ctx.strokeRect(42, 42, w - 84, h - 84);

  // 四角雲紋金點
  [[42, 42], [w - 42, 42], [42, h - 42], [w - 42, h - 42]].forEach(([cx, cy]) => {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3. 頂部宮名與匾額字
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFE89E';
  ctx.font = '900 32px "Noto Serif TC", "Microsoft JhengHei", serif';
  ctx.fillText('玉勅代天府德慈宮', w / 2, 104);

  ctx.fillStyle = accent;
  ctx.font = 'bold 20px "Noto Serif TC", "Microsoft JhengHei", serif';
  ctx.fillText('✦ 慈聖威德・數位結緣平安符 ✦', w / 2, 146);

  // 4. 中央宣紙護符核心（上圓下尖傳統香火袋造型）
  ctx.save();
  ctx.fillStyle = paper;
  ctx.strokeStyle = '#C98A28';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(96, 190, w - 192, 600, 36);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = isGuanyin ? '#1E6B58' : '#A61C1C';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(114, 208, w - 228, 564, 24);
  ctx.stroke();
  ctx.restore();

  // 符頭神尊聖號徽章
  ctx.fillStyle = isGuanyin ? '#184E40' : '#991B1B';
  ctx.beginPath();
  ctx.arc(w / 2, 292, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.font = '50px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  ctx.fillText(isGuanyin ? '🌸' : '🏮', w / 2, 294);

  // 直書大字符題
  const titleText = talisman?.name || '出入平安符';
  const chars = [...titleText];
  ctx.fillStyle = isGuanyin ? '#134034' : '#8E1515';
  const fontSize = chars.length > 7 ? 42 : 48;
  ctx.font = `900 ${fontSize}px "Noto Serif TC", "Microsoft JhengHei", serif`;
  const startY = 392;
  const stepY = Math.min(54, 340 / Math.max(chars.length, 1));
  chars.forEach((ch, idx) => {
    ctx.fillText(ch, w / 2, startY + idx * stepY);
  });

  // 左右對聯小楷祈福句
  const leftVerse = isGuanyin ? '慈悲護佑常相隨' : '代天巡狩鎮四方';
  const rightVerse = isGuanyin ? '出入平安萬事吉' : '五福臨門百事順';
  ctx.fillStyle = '#6B4226';
  ctx.font = 'bold 22px "Noto Serif TC", "Microsoft JhengHei", serif';
  [...leftVerse].forEach((ch, i) => ctx.fillText(ch, 166, 404 + i * 38));
  [...rightVerse].forEach((ch, i) => ctx.fillText(ch, w - 166, 404 + i * 38));

  // ★ V33 朱紅粗體聖號方印（移除「之印」，改為加粗清晰「觀音佛祖」／「代天巡狩」！）
  ctx.save();
  ctx.translate(w / 2 + 112, 708);
  ctx.rotate(-0.08);
  ctx.strokeStyle = '#C8232C';
  ctx.lineWidth = 5;
  ctx.strokeRect(-46, -46, 92, 92);
  ctx.fillStyle = '#C8232C';
  ctx.font = '900 32px "Microsoft JhengHei", "Noto Sans TC", sans-serif';
  ctx.fillText(isGuanyin ? '觀音' : '代天', 0, -16);
  ctx.fillText(isGuanyin ? '佛祖' : '巡狩', 0, 20);
  ctx.restore();

  // 5. 底部持有人與求取日期
  ctx.fillStyle = '#FFF3C4';
  ctx.font = 'bold 26px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.fillText(`善信大德：${String(holderName || '虔誠香客').slice(0, 12)}`, w / 2, 854);

  const today = new Date().toLocaleDateString('zh-TW');
  ctx.fillStyle = 'rgba(255, 240, 195, 0.88)';
  ctx.font = '600 20px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.fillText(`求取日期：${today} ｜ 誠心佩帶・平安順遂`, w / 2, 902);

  ctx.fillStyle = 'rgba(250, 211, 100, 0.72)';
  ctx.font = '500 16px "Noto Sans TC", sans-serif';
  ctx.fillText('台南安定區港口里・玉勅代天府德慈宮 3D 線上參拜', w / 2, 954);

  return canvas.toDataURL('image/png');
}
