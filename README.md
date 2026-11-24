# 玉勅代天府德慈宮｜3D Q版線上參拜遊戲網頁

為臺灣真實宮廟「玉勅代天府德慈宮」量身打造的 3D Q版線上參拜互動網頁。採用純程式化 3D 幾何模型與動態 Canvas 2D 紋理打造，無需外部 `.glb` 模型或圖片連結，開箱即能完整顯示、不破圖。

## 快速啟動（免安裝 Node.js / Python）

- **Windows 使用者**：直接雙擊資料夾內的 `啟動德慈宮3D參拜.bat`，即可自動啟動本地伺服器並開啟 `http://localhost:8080/`。
- **靜態網站部署**：可直接將整個資料夾上傳至 GitHub Pages、Netlify、Vercel 或 Cloudflare Pages，即可產生專屬分享連結給親友與十方善信線上參拜。

## 系統模組架構

- `src/config/templeConfig.js`：廟宇色票、牌匾對聯文字、神尊配置、互動熱區與鏡頭視角（**未來新廟落成後，提供新照片給 AI 微調此檔與 `templeBuilder.js` 即可快速升級外觀**）。
- `src/config/firebaseConfig.js`：Firebase Realtime Database 多人連線預留設定介面（未設定金鑰時自動降級為本機持久化 + 同瀏覽器分頁同步 + AI 陪聊）。
- `src/data/`：抽離的獨立資料層（`initialData.js` 公佈欄/安太歲示範名單/供品目錄、`sixtyFortunePoems.js` 完整六十甲子靈籤、`sutraData.js` 心經與聖號）。
- `src/scene/`：Three.js 3D 廟宇與動態紋理引擎（`canvasTextures.js`、`templeBuilder.js`、`chibiAvatar.js`、`offerings3D.js`、`particleEffects.js`、`templeScene.js`）。
- `src/services/`：`storageSync.js`（供品 10 分鐘自動清理與同步）、`aiTempleKeeper.js`（免金鑰 AI 廟公白話解籤與板凳聊天）、`fortuneCardGenerator.js`（PNG 祈福籤詩圖卡生成）。
- `src/audio/soundEngine.js`：Web Audio API 傳統國樂、鐘磬、擲筊、木魚與燒金紙音效合成器。
- `src/ui/`：參拜引導條、太歲紅紙牆、板凳聊天室、互動彈窗與「廟務管理」隱藏後臺。
