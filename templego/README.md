# 《御朱燈影：跟著宮廟去旅行》網頁版 (`templego/`)

純響應式網頁應用（RWD Web / PWA-ready），免下載 App、零建置步驟，直接部署於 GitHub Pages（子路徑 `/templego/`）或 Vercel 即可手機開啟遊玩。

## 核心模組

- **模組 A｜首頁大廳 (`js/components/homeView.js`, `js/components/lanternHeader.js`)**
  - 頂部台灣傳統發光燈籠（`風調雨順`、`國泰民安`、`宮廟漫遊`、`香火綿延`）微光呼吸與擺盪動畫。
  - 受天宮留白美學朱紅御朱印主視覺與個人旅行儀表板（累計公里數、已收錄御朱印、結緣憑證）。
  - 底部雙向導流區：「☕ 請設計師喝杯咖啡」贊助彈窗與「🏮 宮廟申請加入計畫」B2B 合作表單。
  - 無障礙支援：繁中／EN／日本語三語切換、大字體模式 (`A+`)、和紙日間／慶典夜燈切換、儀式音效開關。
- **模組 B｜探索打卡與請香火苗 (`js/components/exploreView.js`, `js/services/geoTracker.js`)**
  - 透過 `Geolocation API` 與 Haversine 公式即時計算並由近到遠排序全臺宮廟。
  - 雙軌防呆打卡：距離 `<= 100 公尺` 自動解鎖（附「模擬抵達測試」驗收按鈕），以及 QR Code 掃碼備案（支援 `?temple_id=xxx` 網址參數直達、鏡頭掃描與手動輸入）。
  - 四種靈韻香火苗：金色 (`2.0 km`)、朱紅 (`3.0 km`)、青玉 (`5.0 km`)、紫金限定 (`10.0 km`)。
- **模組 C｜GPS 位移累加與開花顯化 (`js/services/storage.js`, `js/services/soundFX.js`)**
  - 採 GPS 座標有效位移累加（附精度與漂移過濾），兼顧日常散步與跨縣市進香旅行。
  - 進度達標觸發朱紅御朱印蓋章動畫與 Web Audio 銅磬音效，收錄至圖鑑。
- **模組 D｜台灣宮廟御朱印圖鑑與祝賀分享卡 (`js/components/albumView.js`, `js/services/shareCardCanvas.js`)**
  - 支援「日式折疊帳」與「典雅網格」雙模式；未解鎖顯示淡灰線稿剪影，已解鎖顯示全彩朱紅御朱印與 12 款專屬建築工藝徽章。
  - 點擊翻面閱讀三語建築工藝看點與神明故事，並內建合作宮廟「結緣品兌換憑證」核銷流程。
  - 內建 HTML5 `<canvas>` 合成 `1080×1920` 直式「旅行祝賀分享卡」，提供下載 PNG 與 Web Share API 一鍵分享至 LINE / IG。

## 客製化與擴充指南

1. **新增或匯入全臺宮廟資料**：編輯 [`data/temples.json`](./data/temples.json)。
2. **替換贊助 QR Code、外部連結與宮廟合作 LINE**：編輯 [`js/config/siteConfig.js`](./js/config/siteConfig.js)。
   - 上傳您的街口 / LINE Pay 收款圖至 `assets/pay-qr.png`，並將 `sponsor.qrImageUrl` 改為 `'./assets/pay-qr.png'`。
   - 填入 `cloud.provider`（`'firebase'` 或 `'supabase'`）與對應憑證即可啟用 B2B 各宮廟打卡人次統計回傳。
3. **宮廟實體立牌 QR Code 網址格式**：
   - `https://romajia.github.io/temple/templego/?temple_id=shoutian`
   - `https://romajia.github.io/temple/templego/?temple_id=deci`
