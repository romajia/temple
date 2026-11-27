/**
 * Firebase Realtime Database 跨裝置多人即時同步與廟務管理驗證設定（V50）
 * ------------------------------------------------------------
 * - databaseURL：跨手機／跨電腦即時同步多人漫步、聊天、供桌、太歲牆與參拜統計
 * - apiKey：Firebase Web API Key（僅用於廟務後臺 Firebase Authentication Email/密碼登入，
 *   屬官方允許放前端之公開專案識別碼；請依根目錄 FIREBASE_SECURITY_SETUP.md 填入後並發佈 database.rules.json）
 */
export const FIREBASE_CONFIG = {
  enabled: true,
  apiKey: '',
  authDomain: 'temple-9b8fb.firebaseapp.com',
  databaseURL: 'https://temple-9b8fb-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'temple-9b8fb',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
  // 選填：於廟務後臺登入畫面自動預填管理員 Email（切勿填寫密碼！）
  adminEmailHint: ''
};
