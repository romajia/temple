/**
 * Firebase Realtime Database / Firestore 多人即時同步預留設定
 * ------------------------------------------------------------
 * 預設 enabled: false，系統會自動降級為「本機狀態 + 同瀏覽器分頁即時同步 + AI 廟公陪聊」，
 * 確保免設定金鑰即可 100% 完整運作。
 *
 * 若未來要啟用跨裝置多人即時連線：
 * 1. 於 Firebase Console 建立專案並啟用 Realtime Database
 * 2. 將下方 enabled 改為 true 並填入您的 Firebase 設定值
 */
export const FIREBASE_CONFIG = {
  enabled: false,
  apiKey: '',
  authDomain: '',
  databaseURL: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: ''
};
