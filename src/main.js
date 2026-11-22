/**
 * 玉勅代天府德慈宮 3D Q版多人線上參拜 - V5 主應用程式入口
 * ------------------------------------------------------------
 * 完整串接 16 項升級：
 * - 8 款原創台灣廟會角色、個人功德與進度全自動存檔
 * - RPG 浮現打字機引導與 NPC 對話
 * - 走進觸發光圈／36 拜墊直接觸發互動（免按 E）
 * - 牆面自動透明化 ＋ 一鍵「上帝視角」俯瞰大廟
 * - 天公爐靠廟面外三拜直插香、拜主神與拜墊念經獨立分離、NPC 同席拜墊念經
 * - 廟後方男女廁所、每日 6 題（50 題庫）民俗挑戰、海報式公佈欄、30 字元公司太歲燈牆
 * - 隱藏預設密碼之廟務後台、多人即時同步與登入後底部頭頂氣泡聊天條
 */
import { TEMPLE_CONFIG } from './config/templeConfig.js';
import { storageSync } from './services/storageSync.js';
import { soundEngine } from './audio/soundEngine.js';
import { TempleSceneController } from './scene/templeScene.js';
import { WelcomeUI } from './ui/welcomeUI.js';
import { VirtualJoystickUI } from './ui/virtualJoystickUI.js';
import { WorshipGuideUI } from './ui/worshipGuideUI.js';
import { TaiSuiWallUI } from './ui/taiSuiWallUI.js';
import { BenchChatUI } from './ui/benchChatUI.js';
import { TempleModalsUI } from './ui/modalsUI.js';
import { AdminPanelUI } from './ui/adminPanelUI.js';
import { RPGNarratorUI } from './ui/rpgNarratorUI.js';
import { WorldChatBarUI } from './ui/worldChatBarUI.js';

function showToast(message, duration = 3600) {
  const host = document.getElementById('toast-host');
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'px-4 py-2.5 rounded-2xl bg-[#15352D]/94 text-[#FBF7E9] border border-[#E5B968] shadow-xl text-xs sm:text-sm font-bold backdrop-blur-md transition-all duration-300';
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-8px)';
    setTimeout(() => el.remove(), 320);
  }, duration);
}

function initApp() {
  const canvasHost = document.getElementById('scene-container');
  const guideHost = document.getElementById('worship-guide-host');
  const welcomeRoot = document.getElementById('welcome-root');
  const joyRoot = document.getElementById('joystick-root');
  const actionRoot = document.getElementById('proximity-action-root');
  const modalRoot = document.getElementById('modal-root');
  const chantRoot = document.getElementById('chant-root');
  const chatRoot = document.getElementById('bench-chat-root');
  const rpgRoot = document.getElementById('rpg-narrator-root');
  const worldChatRoot = document.getElementById('world-chat-root');

  const savedPlayer = storageSync.getPlayer();
  const playerStatus = {
    hasIncense: Boolean(savedPlayer.hasIncense),
    hasJossPaper: Boolean(savedPlayer.hasJossPaper)
  };

  let sceneCtrl;
  let guideUI;
  let joyUI;
  let modalsUI;
  let taiSuiUI;
  let benchChatUI;
  let adminUI;
  let rpgNarrator;
  let worldChatBar;

  const updateOnlineCount = () => {
    const el = document.getElementById('online-count-text');
    if (el) {
      el.textContent = `多人連線：${storageSync.getRealPlayerCount()} 位真人｜在場 ${storageSync.getOnlineCount()} 位`;
    }
  };

  const updatePlayerHud = () => {
    const p = storageSync.getPlayer();
    const mEl = document.getElementById('hud-merit-text');
    const bEl = document.getElementById('hud-bag-count');
    if (mEl) mEl.textContent = `${p.merit || 0} 功德`;
    if (bEl) bEl.textContent = `${storageSync.getInventoryTotal()}`;
  };

  const updateGuidedHighlight = () => {
    if (!sceneCtrl || !guideUI) return;
    const next = guideUI.mode === 'guided' ? guideUI.getNextStep() : null;
    sceneCtrl.setGuidedZone(next ? next.zoneId : null);
  };

  const completeStep = (stepKey, toastMsg) => {
    const rec = storageSync.recordWorshipStep(stepKey);
    const finishedAll = guideUI.markComplete(stepKey);
    if (rec.added) {
      storageSync.addMerit(10);
    }
    updateGuidedHighlight();
    if (toastMsg) showToast(rec.added ? `${toastMsg}（+10 功德・已自動存檔）` : toastMsg);
    if (finishedAll && rec.added) {
      storageSync.addMerit(30);
      soundEngine.playBlessingChime();
      setTimeout(() => {
        rpgNarrator.showFloatingBanner('🎉 恭喜圓滿完成德慈宮五步驟參拜！額外獲贈 +30 圓滿功德，願眾神庇佑平安順遂！', '🏆', 5400);
      }, 650);
    }
  };

  /**
   * 需求 #2：走進互動光圈、拜墊或靠近 NPC 後，按 [E] 鍵或點右側互動按鈕進入動作！
   */
  const triggerProximityInteraction = (target) => {
    if (!target) return;
    if (welcomeRoot.innerHTML.trim() || modalRoot.innerHTML.trim() || rpgNarrator?.active) return;

    soundEngine.playSoftClick();

    // 1. 踏上 36 個拜墊任一個 → 跪坐進入木魚念經模式
    if (target.type === 'kneelMat') {
      sceneCtrl.setPlayerKneelOnMat(target.mat);
      modalsUI.startChantingMode(target.title);
      return;
    }

    // 1.5 廟旁樹蔭下加設長板凳 → 坐下乘涼聊天！
    if (target.type === 'sideBench') {
      sceneCtrl.setPlayerSitOnBench(target.bench);
      benchChatUI.open();
      rpgNarrator.showFloatingBanner(`已坐上【${target.title}】，在樹蔭下跟同場香客輕鬆聊聊吧！`, '🪑', 3600);
      return;
    }

    // 2. 靠近常駐、攤商或巡遊 NPC → 浮現 RPG 逐字對話引導（與攤商對話完自動開啟挑戰或供品鋪！）
    if (target.type === 'npc') {
      const cfg = TEMPLE_CONFIG.npcs[target.id];
      if (!cfg) return;
      sceneCtrl.faceNPC(target.id);
      rpgNarrator.showDialogueSequence({
        speaker: cfg.name,
        title: cfg.title,
        avatar: cfg.avatar,
        lines: cfg.dialogues || ['祝您平安順心！'],
        onDone: () => {
          if (target.id === 'quizMaster') modalsUI.openQuizBoothModal();
          if (target.id === 'shopkeeper') modalsUI.openOfferingShopModal();
        }
      });
      return;
    }

    // 3. 各大設施光圈互動
    switch (target.id) {
      case 'incense':
        modalsUI.openIncenseModal(playerStatus);
        break;
      case 'tiangong':
        modalsUI.openTianGongModal(playerStatus);
        break;
      case 'offeringTable':
        modalsUI.openOfferingsModal();
        break;
      case 'mainWorship':
        modalsUI.openMainWorshipModal();
        break;
      case 'fortune':
        modalsUI.openFortuneModal();
        break;
      case 'taisui':
        taiSuiUI.open();
        break;
      case 'bulletin':
        modalsUI.openBulletinModal();
        break;
      case 'furnace':
        modalsUI.openFurnaceModal();
        break;
      case 'offeringShop':
        modalsUI.openOfferingShopModal();
        break;
      case 'quizBooth':
        modalsUI.openQuizBoothModal();
        break;
      case 'fishPond':
        modalsUI.openFishPondModal();
        break;
      case 'bench':
        sceneCtrl.setPlayerSitOnBench();
        benchChatUI.open();
        rpgNarrator.showFloatingBanner('已坐上廟前大榕樹木頭板凳，歡迎喝杯奉茶跟大家聊天！', '🪑', 3600);
        break;
    }
  };

  // 1. 初始化 RPG 劇情引導與底部即時聊天條
  rpgNarrator = new RPGNarratorUI(rpgRoot);
  worldChatBar = new WorldChatBarUI(worldChatRoot, {
    onSpeak: (text) => sceneCtrl.showPlayerBubble(text)
  });

  // 2. 初始化 V6 新廟 3D 場景（安定區港口里新廟 × 全面透明化遮擋防線 × 上帝視角 × 按 [E] 互動）
  sceneCtrl = new TempleSceneController(canvasHost, {
    initialState: {
      bulletin: storageSync.getBulletin(),
      taisui: storageSync.getTaiSuiList(),
      offerings: storageSync.getOfferings(),
      playerPresetId: savedPlayer.presetId || 'youngMale'
    },
    onProximityChange: (target) => joyUI?.setProximityTarget(target),
    onActionHotkey: () => {
      if (welcomeRoot.innerHTML.trim() || modalRoot.innerHTML.trim() || rpgNarrator?.active) return;
      joyUI?.triggerCurrent();
    },
    onForcedStandUp: () => {
      if (benchChatUI?.isOpen) benchChatUI.close();
      if (modalsUI?.chantActive) modalsUI.stopChantingMode(false);
      soundEngine.setMusicDucking(1.0);
    },
    onBroadcastPresence: (pose) => storageSync.broadcastPresence(pose)
  });

  if (playerStatus.hasIncense) {
    sceneCtrl.setPlayerHoldingIncense(true);
  }

  // 3. 初始化左下角半透明虛擬搖桿 ＋ 右側按 [E] 互動鈕
  joyUI = new VirtualJoystickUI(joyRoot, actionRoot, {
    onMoveVector: (vx, vy) => sceneCtrl.setJoystickVector(vx, vy),
    onTriggerProximity: (target) => triggerProximityInteraction(target)
  });

  // 4. 初始化左上角參拜進度條（還原自動存檔進度）
  guideUI = new WorshipGuideUI(guideHost, {
    initialCompleted: savedPlayer.worshipSteps || [],
    onGoZone: (zoneId) => {
      soundEngine.playSoftClick();
      const z = TEMPLE_CONFIG.zones[zoneId];
      sceneCtrl.walkToZone(zoneId, () => {
        if (z) showToast(`✨ 已抵達【${z.name}】，請按 [E] 鍵或點右側按鈕互動！`);
      });
    },
    onModeChange: (mode, nextZoneId) => {
      soundEngine.playSoftClick();
      sceneCtrl.setGuidedZone(mode === 'guided' ? nextZoneId : null);
      rpgNarrator.showFloatingBanner(
        mode === 'guided' ? '已切換為【引導模式】，跟著光柱一步步完成參拜！' : '已切換為【自由探索】，走進光圈或拜墊後按 [E] 互動！',
        mode === 'guided' ? '🏮' : '🌿'
      );
    },
    onResetRound: () => {
      playerStatus.hasIncense = false;
      playerStatus.hasJossPaper = false;
      storageSync.resetWorshipRound();
      sceneCtrl.setPlayerHoldingIncense(false);
      updateGuidedHighlight();
      showToast('✨ 已開啟新一輪線上參拜，請前往廟內左側香燭區點香！');
    }
  });

  // 5. 初始化紅紙太歲牆
  taiSuiUI = new TaiSuiWallUI(modalRoot, {
    onHighlight3D: (query) => sceneCtrl.updateTaiSuiWall(storageSync.getTaiSuiList(), query),
    onLightLamp3D: (entry) => {
      sceneCtrl.updateTaiSuiWall(storageSync.getTaiSuiList(), entry.name);
      sceneCtrl.triggerBlessingAtZone('taisui');
      showToast(`🏮 已在紅紙牆為【${entry.name}】點亮太歲平安燈！`);
    }
  });

  // 6. 初始化板凳聊天室
  benchChatUI = new BenchChatUI(chatRoot, {
    onStandUp: () => sceneCtrl.standUpPlayer(),
    onPlayerSpeak: (text) => sceneCtrl.showPlayerBubble(text)
  });

  // 7. 初始化互動彈窗與拜墊木魚念經模式
  modalsUI = new TempleModalsUI(modalRoot, chantRoot, {
    onTakeIncense: () => {
      playerStatus.hasIncense = true;
      playerStatus.hasJossPaper = true;
      storageSync.updatePlayer({ hasIncense: true, hasJossPaper: true });
      showToast('🕯️ 正在特寫點燃三柱清香，請稍候…', 2600);
      sceneCtrl.playIncensePickupSequence(() => {
        completeStep('incense', '🔥 清香已點燃並領取金紙！接著走到廟外天公爐靠廟一側拜天公吧～');
      });
    },
    onWorshipTianGong: () => {
      playerStatus.hasIncense = true;
      storageSync.updatePlayer({ hasIncense: true });
      sceneCtrl.setPlayerHoldingIncense(true);
      showToast('☀️ 站定靠廟一側面向天際三拜玉皇大帝，拜畢直接上前插三柱香…', 3400);
      sceneCtrl.playTianGongRitual(() => {
        soundEngine.playBlessingChime();
        completeStep('tiangong', '☀️ 拜天公並插香完成！接著走進挑高大殿供桌獻供品與許願喔～');
      });
    },
    onOfferingPlaced: (record, trimmedOldest) => {
      sceneCtrl.syncOfferings(storageSync.getOfferings());
      sceneCtrl.triggerOfferingPrayerBeam();
      sceneCtrl.showPlayerBubble(`祈願：${record.blessing}`);
      const note = trimmedOldest ? '（供桌已滿12份，已禮讓收起最早一份）' : '';
      completeStep('offering', `✨ 祈願已上達神明！已敬獻【${record.name}】${note}`);
    },
    onWorshipMainDeity: () => {
      sceneCtrl.setPlayerHoldingIncense(true);
      showToast('🙏 立於中央大道虔誠三拜五府千歲、觀音佛祖、天上聖母並上前插香…', 3400);
      sceneCtrl.playMainDeityRitual(() => {
        playerStatus.hasIncense = false;
        storageSync.updatePlayer({ hasIncense: false });
        soundEngine.playBlessingChime();
        completeStep('mainDeity', '🏮 拜主神並插香圓滿！可到兩側拜墊靜心敲木魚，或至右側外部金爐燒金紙！');
      });
    },
    onEnterChantMode: () => {
      soundEngine.setMusicDucking(0.22);
      rpgNarrator.showFloatingBanner('已跪坐於拜墊上，配樂自動轉柔，敲木魚每 5 下自動累積 +5 功德並存檔！', '🪵', 4200);
    },
    onExitChantMode: () => {
      sceneCtrl.standUpPlayer();
      soundEngine.setMusicDucking(1.0);
    },
    onFortuneShengBei: () => sceneCtrl.triggerBlessingAtZone('fortune'),
    onQuizAlreadyDone: (score) => {
      const msg = `🏅 您今日已完成 6 題民俗智慧挑戰（答對 ${score} / 6 題），明天凌晨 00:00 重置後歡迎再來挑戰！`;
      showToast(msg, 4600);
      rpgNarrator.showFloatingBanner(msg, '🎯', 4600);
    },
    onFeedKoi: () => {
      sceneCtrl.triggerFeedKoi();
      storageSync.addMerit(3);
      updatePlayerHud();
      sceneCtrl.showPlayerBubble('灑飼料餵七彩錦鯉，魚群都游過來了！🐟✨');
      rpgNarrator.showFloatingBanner('🐟 已灑下愛心魚飼料！9 尾七彩錦鯉正歡喜聚過來爭食（+3 結緣功德）', '💦', 4200);
    },
    onMeritEarned: (_amt, msg) => {
      updatePlayerHud();
      if (msg) showToast(msg);
    },
    onBurnJossPaper: () => {
      playerStatus.hasJossPaper = false;
      storageSync.updatePlayer({ hasJossPaper: false });
      soundEngine.playFireBurn();
      showToast('🔥 正將金紙一張一張投入寶塔金爐化金中…', 3200);
      sceneCtrl.playBurnJossSequence(
        () => soundEngine.playPaperToss(),
        () => {
          soundEngine.playBlessingChime();
          completeStep('furnace', '🔥 金紙已逐張順利化金圓滿！願德慈宮眾神庇佑您平安順遂！');
        }
      );
    }
  });

  // 8. 隱藏版廟務後臺（不顯示預設密碼）
  adminUI = new AdminPanelUI(modalRoot, {
    onDataChanged: () => {
      sceneCtrl.updateBulletinBoard(storageSync.getBulletin());
      sceneCtrl.updateTaiSuiWall(storageSync.getTaiSuiList());
      sceneCtrl.syncOfferings(storageSync.getOfferings());
      showToast('✓ 廟務資料已即時同步至 3D 德慈宮場景！');
    }
  });

  storageSync.subscribe('offerings', (list) => sceneCtrl.syncOfferings(list));
  storageSync.subscribe('taisui', (list) => sceneCtrl.updateTaiSuiWall(list));
  storageSync.subscribe('bulletin', (b) => sceneCtrl.updateBulletinBoard(b));
  storageSync.subscribe('player', () => updatePlayerHud());
  storageSync.subscribe('presence', (peers) => {
    sceneCtrl.syncRemotePeers(peers);
    updateOnlineCount();
  });
  updateOnlineCount();
  updatePlayerHud();

  document.getElementById('btn-open-backpack')?.addEventListener('click', () => {
    soundEngine.playSoftClick();
    modalsUI.openBackpackModal();
  });

  // ---- 右上角晝夜切換 ----
  const dnBtn = document.getElementById('btn-toggle-daynight');
  const dnIcon = document.getElementById('daynight-icon');
  const dnLabel = document.getElementById('daynight-label');
  dnBtn?.addEventListener('click', () => {
    soundEngine.playSoftClick();
    const mode = sceneCtrl.toggleDayNightMode();
    if (mode === 'night') {
      if (dnIcon) dnIcon.textContent = '☀️';
      if (dnLabel) dnLabel.textContent = '切換白天';
      rpgNarrator.showFloatingBanner('夜幕降臨！廟埕暖黃串燈、石燈籠光池與祈福天燈已經點亮～', '🌙', 4200);
    } else {
      if (dnIcon) dnIcon.textContent = '🌙';
      if (dnLabel) dnLabel.textContent = '切換夜景';
      rpgNarrator.showFloatingBanner('已切換回暖陽白天模式，欣賞德慈宮挑高燕尾飛簷與彩繪細節！', '☀️', 3600);
    }
  });

  // ---- 右上角配樂開關與音量 ----
  const muteBtn = document.getElementById('btn-toggle-audio');
  const volSlider = document.getElementById('audio-volume');
  muteBtn?.addEventListener('click', () => {
    const isMuted = soundEngine.toggleMute();
    if (!isMuted) soundEngine.startAmbient();
    muteBtn.textContent = isMuted ? '🔇 配樂關' : '🔊 配樂開';
  });
  volSlider?.addEventListener('input', (e) => {
    const val = Number(e.target.value) / 100;
    soundEngine.setVolume(val);
    if (val > 0 && soundEngine.muted) {
      soundEngine.setMuted(false);
      soundEngine.startAmbient();
      if (muteBtn) muteBtn.textContent = '🔊 配樂開';
    }
  });

  // ---- 右下角視角方案 B：固定 4 方向一鍵切換（正面 / 左側 / 右側 / 上帝俯瞰） ----
  const presetLabels = {
    front: '🏛️ 已切換為【正面視角】！',
    left: '🌿 已切換為【左側視角】！（查看板凳、供品鋪與西側樹蔭長板凳）',
    right: '🐟 已切換為【右側視角】！（查看假山錦鯉池、挑戰攤與寶塔金爐）',
    god: '👁️ 已切換為【上帝俯瞰視角】！屋頂已自動透視，大殿與園區一覽無遺～'
  };
  const camPresetBtns = document.querySelectorAll('[data-cam-preset]');
  const highlightCamPreset = (activeId) => {
    camPresetBtns.forEach(btn => {
      const id = btn.getAttribute('data-cam-preset');
      btn.className = id === activeId
        ? 'cam-preset-btn px-2 h-8 rounded-lg bg-[#E5B968] text-[#15352D] text-[11px] font-black transition shadow'
        : `cam-preset-btn px-2 h-8 rounded-lg hover:bg-white/15 ${id === 'god' ? 'text-[#F5D68E] font-black' : 'text-[#FBF7E9] font-bold'} text-[11px] transition`;
    });
  };
  camPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      soundEngine.playSoftClick();
      const preset = btn.getAttribute('data-cam-preset');
      sceneCtrl.setCameraPreset(preset);
      highlightCamPreset(preset);
      rpgNarrator.showFloatingBanner(presetLabels[preset] || '視角已切換', '🎥', 3200);
    });
  });

  document.getElementById('cam-zoom-in')?.addEventListener('click', () => {
    soundEngine.playSoftClick();
    sceneCtrl.zoomCameraStep(0.84);
  });
  document.getElementById('cam-zoom-out')?.addEventListener('click', () => {
    soundEngine.playSoftClick();
    sceneCtrl.zoomCameraStep(1.18);
  });
  document.getElementById('btn-toggle-joy')?.addEventListener('click', () => {
    soundEngine.playSoftClick();
    const shown = joyUI.toggleJoystick();
    showToast(shown ? '🕹️ 已顯示左下角半透明虛擬搖桿' : '🕹️ 已隱藏虛擬搖桿');
  });
  document.getElementById('btn-admin-entry')?.addEventListener('click', () => {
    soundEngine.playSoftClick();
    adminUI.open();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      modalsUI.closeModal();
      if (taiSuiUI.isOpen) taiSuiUI.close();
      if (adminUI.isOpen) adminUI.close();
      if (rpgNarrator.active) rpgNarrator.close();
    }
  });

  updateGuidedHighlight();

  // 9. 開場迎賓登記卡 → 登入後啟動 RPG 浮現開場引導 ＋ 底部即時聊天條！
  sceneCtrl.setMovementLocked(true);
  const welcomeUI = new WelcomeUI(welcomeRoot, {
    defaultName: savedPlayer.name || '',
    defaultPresetId: savedPlayer.presetId || 'youngMale',
    onEnter: ({ name, presetId, musicEnabled }) => {
      const returning = storageSync.hasExistingRecord;
      storageSync.updatePlayer({ name, presetId });
      sceneCtrl.applyPlayerPreset(presetId);
      sceneCtrl.setPlayerName(name);
      sceneCtrl.setMovementLocked(false);
      sceneCtrl.showPlayerBubble(`大家好，我是${name}！🙏`);
      if (muteBtn) muteBtn.textContent = musicEnabled ? '🔊 配樂開' : '🔇 配樂關';

      // 掛載玩家登入後專屬底部即時聊天對話框（送出立即浮在頭頂＋多人同步）
      worldChatBar.mount();
      updateOnlineCount();

      // RPG 浮現式新廟入廟引導
      const introLines = returning
        ? [
            `歡迎「${name}」回到全新落成的安定區港口里「玉勅代天府德慈宮」！您的功德值、香火背包與參拜進度都已自動載入。`,
            '走進光圈、36 個拜墊或靠近攤商 NPC 後，按 [E] 鍵（或點右側按鈕）即可互動；牆面、安太歲板子、神明桌與樹木擋住視線時都會自動變半透明喔！'
          ]
        : [
            `「${name}」，歡迎來到安定區港口里全新落成的「玉勅代天府德慈宮」！紅磚青斗石壁、豔紅琉璃瓦配寶藍燕尾脊、門前石獅子與右側假山瀑布池都已完工！`,
            '用 WASD、方向鍵、搖桿或點擊地面走到發光光圈、拜墊或 NPC 旁，按下 [E] 鍵（或點右側按鈕）即可展開互動！',
            '廟埕左右有供品鋪老闆娘阿芬姊與挑戰攤關主阿哲熱情招呼，底部聊天框打字也會直接浮在您頭頂跟同場香客即時互動喔！'
          ];

      rpgNarrator.showDialogueSequence({
        speaker: '廟公阿財伯',
        title: '玉勅代天府德慈宮・入廟引導',
        avatar: '👴',
        lines: introLines,
        onDone: () => {
          storageSync.updatePlayer({ seenStoryIntro: true });
          rpgNarrator.showFloatingBanner('✨ 您的功德與紀錄都會自動存檔！可跟著左上引導或自由探索全廟喔～', '🏮', 4200);
        }
      });
    }
  });
  welcomeUI.open();
}

window.addEventListener('DOMContentLoaded', initApp);
