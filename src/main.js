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
import { TEMPLE_CONFIG, DAILY_QUESTS, PEER_EMOTES } from './config/templeConfig.js';
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

// ★ V32 上方浮字提示自動多停留 2 秒方便閱讀！
function showToast(message, duration = 3600) {
  const host = document.getElementById('toast-host');
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'px-4 py-2.5 rounded-2xl bg-[#FFFBF2] text-[#240E08] border-2 border-[#8E1515] shadow-[0_8px_24px_rgba(16,24,20,0.28)] text-xs sm:text-sm font-black transition-all duration-300';
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-8px)';
    setTimeout(() => el.remove(), 320);
  }, duration + 2000);
}

async function initApp() {
  window.__setTempleLoader?.(28, '正在讀取香火存檔與宮廟設定…');
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
    const real = storageSync.getRealPlayerCount();
    const el = document.getElementById('online-count-text');
    if (el) el.textContent = `多人連線：${real} 位真人`;
    const mEl = document.getElementById('online-count-text-mobile');
    if (mEl) mEl.textContent = `${real} 位真人`;

    // ★ V46 同步更新頂部「今日參拜人數」膠囊（桌機＋手機）
    const stats = storageSync.getVisitAnalytics();
    const dEl = document.getElementById('daily-visit-count-text');
    if (dEl) dEl.textContent = `今日參拜：${stats.today.toLocaleString('zh-TW')} 人`;
    const dmEl = document.getElementById('daily-visit-count-text-mobile');
    if (dmEl) dmEl.textContent = `今日 ${stats.today.toLocaleString('zh-TW')} 人`;
  };

  const refreshQuestsState = () => {
    const states = storageSync.getAllQuestStates();
    sceneCtrl?.updateNpcQuestMarkers?.(states);

    // 同步廟前廣場「撿香腳」任務掉落香腳
    const stubQ = states.find(q => q.id === 'q_incense_stubs');
    if (stubQ) {
      const remaining = stubQ.status === 'active' ? Math.max(0, stubQ.target - stubQ.progress) : 0;
      sceneCtrl?.syncIncenseStubs?.(stubQ.status === 'active' && remaining > 0, remaining);
    }

    // 更新頂部「📜 任務」紅點提示（有可回報或可接取時顯示）
    const badge = document.getElementById('hud-quest-badge');
    if (badge) {
      const readyCount = states.filter(q => q.status === 'ready').length;
      const availCount = states.filter(q => q.status === 'none').length;
      if (readyCount > 0) {
        badge.textContent = '?';
        badge.className = '-top-1.5 -right-1.5 absolute min-w-[17px] h-[17px] px-1 rounded-full bg-[#16A34A] text-white text-[10px] font-black flex items-center justify-center shadow animate-bounce';
      } else if (availCount > 0) {
        badge.textContent = String(availCount);
        badge.className = '-top-1.5 -right-1.5 absolute min-w-[17px] h-[17px] px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-black flex items-center justify-center shadow';
      } else {
        badge.classList.add('hidden');
      }
    }
  };

  const openNpcDialogueOrQuest = (npcId) => {
    const cfg = TEMPLE_CONFIG.npcs[npcId];
    if (!cfg) return;
    sceneCtrl.faceNPC(npcId);

    // 若為 V1.1 任務 NPC，優先以輕快 30 秒內可完成的互動式任務對話呈現！
    if (cfg.questId) {
      const qState = storageSync.getQuestState(cfg.questId);
      const qDef = qState.def;
      if (qDef) {
        if (qState.status === 'none') {
          rpgNarrator.showDialogueSequence({
            speaker: cfg.name,
            title: `${qDef.icon} ${qDef.title}`,
            avatar: cfg.avatar,
            lines: [qDef.introLine],
            actions: [
              {
                label: `✅ 接取任務（+${qDef.reward} 功德）`,
                primary: true,
                onClick: () => {
                  storageSync.acceptQuest(qDef.id);
                  soundEngine.playBlessingChime();
                  refreshQuestsState();
                  showToast(`📜 已接取任務【${qDef.title}】！`);
                  if (qDef.id === 'q_pour_tea') sceneCtrl.walkToZone('teaStation');
                  if (qDef.id === 'q_tiger_egg') sceneCtrl.walkToBackyard();
                }
              },
              {
                label: '先聽聽介紹',
                primary: false,
                onClick: () => {
                  rpgNarrator.showDialogueSequence({
                    speaker: cfg.name,
                    title: cfg.title,
                    avatar: cfg.avatar,
                    lines: cfg.dialogues || ['祝您平安順心！']
                  });
                }
              }
            ]
          });
          return;
        }
        if (qState.status === 'ready') {
          rpgNarrator.showDialogueSequence({
            speaker: cfg.name,
            title: `${qDef.icon} 任務完成回報`,
            avatar: cfg.avatar,
            lines: [qDef.completeLine],
            actions: [
              {
                label: `🎁 領取 +${qDef.reward} 功德獎勵`,
                primary: true,
                onClick: () => {
                  const res = storageSync.completeQuest(qDef.id);
                  if (res.ok) {
                    soundEngine.playBlessingChime();
                    updatePlayerHud();
                    refreshQuestsState();
                    sceneCtrl.playPlayerEmote('salute', `任務完成！+${res.reward} 功德 ✨`);
                    showToast(`🎉 完成【${qDef.title}】，獲得 +${res.reward} 功德！`, 4200);
                  }
                }
              }
            ]
          });
          return;
        }
        if (qState.status === 'active') {
          const actions = [];
          if (qDef.id === 'q_pour_tea') {
            actions.push({ label: '🚶 帶我去奉茶區', primary: true, onClick: () => sceneCtrl.walkToZone('teaStation') });
          } else if (qDef.id === 'q_tiger_egg') {
            actions.push({
              label: storageSync.getEggCount() > 0 ? '🐯 已有蛋，去拜虎爺' : '🐔 帶我去後埕撿蛋',
              primary: true,
              onClick: () => {
                if (storageSync.getEggCount() > 0) sceneCtrl.walkToZone('tigerDeity');
                else sceneCtrl.walkToBackyard();
              }
            });
          } else if (qDef.id === 'q_night_patrol') {
            actions.push({
              label: '🌙 立即切換夜景巡視',
              primary: true,
              onClick: () => document.getElementById('btn-toggle-daynight')?.click()
            });
          }
          rpgNarrator.showDialogueSequence({
            speaker: cfg.name,
            title: `${qDef.icon} 進行中 (${qState.progress}/${qState.target})`,
            avatar: cfg.avatar,
            lines: [qDef.progressLine],
            actions
          });
          return;
        }
        if (qState.status === 'done') {
          rpgNarrator.showDialogueSequence({
            speaker: cfg.name,
            title: cfg.title,
            avatar: cfg.avatar,
            lines: [qDef.doneLine, ...(cfg.dialogues || []).slice(0, 1)]
          });
          return;
        }
      }
    }

    rpgNarrator.showDialogueSequence({
      speaker: cfg.name,
      title: cfg.title,
      avatar: cfg.avatar,
      lines: cfg.dialogues || ['祝您平安順心！'],
      onDone: () => {
        if (npcId === 'quizMaster') modalsUI.openQuizBoothModal();
        if (npcId === 'shopkeeper') modalsUI.openOfferingShopModal();
      }
    });
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

    // 1.5 ★ V32 坐上長板凳不自動彈開聊天視窗，有人發言時下方「💬 紀錄」跳紅色數字，想聊再點開！
    if (target.type === 'sideBench') {
      sceneCtrl.setPlayerSitOnBench(target.bench);
      worldChatBar.enterBenchMode(target.title || '樹蔭板凳聊天');
      rpgNarrator.showFloatingBanner(`已坐上【${target.title}】乘涼～有人發言時下方「紀錄」會亮出紅色未讀數字，想聊隨時點開喔！`, '🪑', 3600);
      return;
    }

    // 2. 靠近常駐、攤商或巡遊 NPC → 進入 V1.1 輕快任務對話或劇情介紹！
    if (target.type === 'npc') {
      openNpcDialogueOrQuest(target.id);
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
        modalsUI.openOfferingsModal(target.offeringSide);
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
      case 'teaStation':
        modalsUI.openTeaStationModal(sceneCtrl.holdingTeapot);
        break;
      case 'teaOffer':
        modalsUI.openTeaOfferModal(sceneCtrl.holdingTeapot);
        break;
      case 'tigerDeity':
        modalsUI.openTigerDeityModal();
        break;
      case 'fiveCamps':
        modalsUI.openFiveCampsModal();
        break;
      case 'talismanTable':
        modalsUI.openTalismanIntroModal({
          onWalkToMeritBox: () => {
            sceneCtrl.walkToZone('meritBox', () => {
              showToast('🧧 已抵達功德箱，投入 100 功德即可求取數位平安符！');
            });
          }
        });
        break;
      case 'meritBox':
        modalsUI.openMeritBoxModal();
        break;
      case 'serviceDesk':
        modalsUI.openServiceDeskModal({
          onOpenTaiSui: () => taiSuiUI.open(),
          onLampRegistered: (entry) => {
            sceneCtrl.updateTaiSuiWall(storageSync.getTaiSuiList(), entry.name);
            sceneCtrl.triggerBlessingAtZone('taisui');
            showToast(`🛎️ 服務台已為【${entry.name}】完成登記並同步點亮 3D 太歲牆！`);
          }
        });
        break;
      case 'bench':
        sceneCtrl.setPlayerSitOnBench(null, null, target.benchSide || null);
        worldChatBar.enterBenchMode('大榕樹板凳聊天');
        rpgNarrator.showFloatingBanner('已坐上廟前大榕樹木頭板凳乘涼～有人發言時下方「紀錄」會跳出紅色數字，想聊隨時點開喔！', '🪑', 3600);
        break;
    }
  };

  // 1. 初始化 RPG 劇情引導（★ 手機端開啟對話時自動微調鏡頭防遮擋！）與底部統一即時聊天紀錄
  updatePlayerHud();
  rpgNarrator = new RPGNarratorUI(rpgRoot, {
    onActiveChange: (isActive) => sceneCtrl?.setDialogueCameraShift?.(isActive)
  });
  worldChatBar = new WorldChatBarUI(worldChatRoot, {
    onSpeak: (text) => sceneCtrl.showPlayerBubble(text),
    onStandUp: () => sceneCtrl.standUpPlayer()
  });

  // 2. 分階段非同步初始化 3D 新廟場景（即時回報載入進度條，不卡頓、手機更流暢！）
  const initialSceneState = {
    bulletin: storageSync.getBulletin(),
    taisui: storageSync.getTaiSuiList(),
    offerings: storageSync.getOfferings(),
    playerPresetId: savedPlayer.presetId || 'youngMale'
  };
  sceneCtrl = new TempleSceneController(canvasHost, {
    deferInit: true,
    initialState: initialSceneState,
    onProximityChange: (target) => joyUI?.setProximityTarget(target),
    onActionHotkey: () => {
      if (welcomeRoot.innerHTML.trim() || modalRoot.innerHTML.trim() || rpgNarrator?.active) return;
      joyUI?.triggerCurrent();
    },
    onForcedStandUp: () => {
      if (benchChatUI?.isOpen) benchChatUI.close();
      worldChatBar?.exitBenchMode?.();
      if (modalsUI?.chantActive) modalsUI.stopChantingMode(false);
      soundEngine.setMusicDucking(1.0);
    },
    onBenchSeated: (benchTitle) => {
      worldChatBar?.enterBenchMode?.(benchTitle || '大榕樹板凳聊天');
      rpgNarrator?.showFloatingBanner?.(`已坐上【${benchTitle || '象棋板凳'}】乘涼觀棋～有人發言時下方「紀錄」會亮出紅色未讀數字，想聊隨時點開喔！`, '🪑', 3600);
    },
    onBroadcastPresence: (pose) => storageSync.broadcastPresence(pose),
    onIndoorStateChange: (isIndoor) => {
      const exitBtn = document.getElementById('btn-exit-hall');
      if (exitBtn) exitBtn.classList.toggle('hidden', !isIndoor);
    },
    // ★ V1.1 拾取後埕土雞蛋、廟埕香腳、點擊任務 NPC 與點擊在線真人玩家！
    onCollectEgg: () => {
      const total = storageSync.addEgg(1);
      soundEngine.playBlessingChime();
      updatePlayerHud();
      sceneCtrl.showPlayerBubble('撿到新鮮土雞蛋啦！🥚✨', 2.4);
      showToast(`🥚 撿起 1 顆新鮮土雞蛋存入背包（持有 ×${total}），可進大殿獻給桌下虎爺喔！`, 4000);
    },
    onCatchChicken: () => {
      storageSync.addMerit(-5);
      soundEngine.playSoftClick();
      updatePlayerHud();
      sceneCtrl.showPlayerBubble('啊！不可以抓雞喔… (-5 功德) 🐔', 2.8);
      showToast('🐔 咕咕咕！後埕放山雞是神明愛護的生靈，不可以抓雞喔！（扣除 5 功德，請撿地上雞蛋就好～）', 4400);
    },
    onCollectIncenseStub: () => {
      soundEngine.playSoftClick();
      const prog = storageSync.progressQuest('q_incense_stubs', 1);
      refreshQuestsState();
      if (prog.updated) {
        if (prog.justReady) {
          soundEngine.playBlessingChime();
          sceneCtrl.showPlayerBubble('香腳撿齊了！回去找阿財伯 🧹✨', 2.8);
          showToast('✨ 已撿齊 4 根香腳！快回去找廟公阿財伯領 +10 功德！', 4200);
        } else {
          showToast(`🧹 已回收掉落香腳（${prog.progress} / ${prog.target}）`, 2200);
        }
      }
    },
    onNpcClick: (npcId) => {
      soundEngine.playSoftClick();
      openNpcDialogueOrQuest(npcId);
    },
    onPeerClick: (peer) => {
      soundEngine.playSoftClick();
      modalsUI.openPeerInteractionModal(peer);
    },
    onWebGLContextLost: () => {
      window.__showTempleLoaderError?.(
        '手機 3D 畫面記憶體暫時重置',
        '您的手機系統剛才回收了 3D 繪圖資源。點擊下方按鈕即可立即重新載入德慈宮（您的功德與進度已自動存檔）！'
      );
    }
  });

  await sceneCtrl.initAsync(initialSceneState, (pct, msg) => {
    window.__setTempleLoader?.(pct, msg);
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
      if (modalsUI?.chantActive) modalsUI.stopChantingMode(false);
      sceneCtrl.player?.setChanting?.(false);
      sceneCtrl.setPlayerHoldingIncense(true);
      showToast('🙏 跪於中央長跪墊手持清香虔誠三拜觀音佛祖、代天巡狩及殿內十一尊神聖並上前插香…', 3400);
      sceneCtrl.playMainDeityRitual(() => {
        playerStatus.hasIncense = false;
        storageSync.updatePlayer({ hasIncense: false });
        soundEngine.playBlessingChime();
        completeStep('mainDeity', '🏮 拜主神並插香圓滿！可到兩側拜墊靜心敲木魚，或至右側外部金爐燒金紙！');
      });
    },
    onEnterChantMode: () => {
      soundEngine.setMusicDucking(0.22);
      rpgNarrator.showFloatingBanner('已跪坐於拜墊上並端起木魚，配樂自動轉柔，敲木魚每 5 下自動累積 +5 功德並存檔！', '📿', 4200);
    },
    onChantTap: () => {
      sceneCtrl.playPlayerWoodenFishTap();
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
    },
    // ★ V1.1 奉茶拿壺、神桌倒茶、桌下虎爺獻蛋、功德箱平安符、任務尋路與真人結緣互動
    onTakeTeapot: () => {
      sceneCtrl.setPlayerHoldingTeapot(true);
      sceneCtrl.showPlayerBubble('提起茶壺，準備幫神明奉茶 🍵', 2.6);
      showToast('🍵 已提起茶壺！正帶您前往主神桌「清茶三杯」敬茶…', 2800);
      sceneCtrl.walkToZone('teaOffer');
    },
    onWalkToTeaStation: () => {
      sceneCtrl.walkToZone('teaStation');
    },
    onPourTea: () => {
      soundEngine.playBell(0.24, 528);
      sceneCtrl.playPourTeaSequence(() => {
        const teaRec = storageSync.recordTeaOffer(storageSync.getPlayer().name || '虔誠香客');
        sceneCtrl.syncTeaOffer(teaRec);
        storageSync.addMerit(10);
        const qRes = storageSync.progressQuest('q_pour_tea', 1);
        soundEngine.playBlessingChime();
        updatePlayerHud();
        refreshQuestsState();
        showToast(
          qRes.justReady
            ? '🍵 敬奉清茶三杯圓滿（+10 功德，10 分鐘後自動撤換）！快回去向奉茶姊姊淑芬回報領獎喔！'
            : '🍵 誠心為神明添滿清茶三杯，茶香繚繞（+10 功德，10 分鐘後自動撤換）！',
          4200
        );
      });
    },
    onTigerFocus: (active) => {
      sceneCtrl.focusTigerDeityCloseup(active);
    },
    onWorshipTigerIncenseOnly: () => {
      sceneCtrl.playTigerWorshipWithIncense(false);
      const meritRes = storageSync.claimTigerWorshipMerit();
      updatePlayerHud();
      showToast(
        meritRes.granted
          ? `🔥 已誠心向黑虎將軍上香祈福（+1 功德，今日 ${meritRes.used}/3）！`
          : '🔥 已誠心向黑虎將軍上香祈福！（今日拜虎爺功德已達 3 次上限）',
        3400
      );
      return meritRes;
    },
    onOfferEggToTiger: () => {
      if (!storageSync.consumeEgg(1)) {
        showToast('⚠️ 背包內沒有新鮮土雞蛋喔！請至廟後草地找母雞撿蛋～');
        return { granted: false };
      }
      const nextEggs = storageSync.addTigerEggOffering(storageSync.getPlayer().name || '虔誠香客');
      sceneCtrl.syncTigerEggs(nextEggs);
      sceneCtrl.playTigerEggOfferOnly();
      const meritRes = storageSync.claimTigerWorshipMerit();
      const qRes = storageSync.progressQuest('q_tiger_egg', 1);
      updatePlayerHud();
      refreshQuestsState();
      const meritText = meritRes.granted ? `+1 功德，今日 ${meritRes.used}/3` : '今日功德已達 3 次上限';
      showToast(
        qRes.justReady
          ? `🐯 虎爺公歡喜享用新鮮土雞蛋（供盤 ${nextEggs.length}/3 顆，${meritText}）！快回去向花布阿嬤回報領獎喔！`
          : `🐯 已誠心向虎爺獻上新鮮土雞蛋（供盤 ${nextEggs.length}/3 顆，10 分鐘後自動收起，${meritText}）！`,
        4400
      );
      return meritRes;
    },
    onWorshipFiveCamps: () => {
      showToast('🚩 正誠心三拜五營將軍並於五營香爐插上三柱清香…', 3000);
      sceneCtrl.playFiveCampsRitual(() => {
        storageSync.addMerit(8);
        soundEngine.playBlessingChime();
        updatePlayerHud();
        showToast('🚩 五營將軍參拜插香圓滿！護境安民、平安順遂（+8 功德）！', 4000);
      });
    },
    onWalkToBackyard: () => {
      sceneCtrl.walkToBackyard();
      showToast('🐔 正前往廟後埕草坪尋找放山母雞與發光土雞蛋…', 3000);
    },
    onTalismanObtained: (talisman) => {
      sceneCtrl.triggerBlessingAtZone('meritBox');
      sceneCtrl.showPlayerBubble(`求得 ${talisman.shortName}！${talisman.emoji}`, 3.0);
      updatePlayerHud();
    },
    onWalkToNpc: (npcId) => {
      const npc = sceneCtrl.npcManager?.getNpcById?.(npcId);
      if (!npc) return;
      const np = npc.avatar.root.position;
      const gx = npcId === 'keeper'
        ? TEMPLE_CONFIG.zones.serviceDesk.standPos[0]
        : npcId === 'shufen'
          ? -6.85
          : np.x;
      const gz = npcId === 'keeper'
        ? TEMPLE_CONFIG.zones.serviceDesk.standPos[2]
        : npcId === 'shufen'
          ? 5.45
          : np.z + 1.4;
      sceneCtrl.walkToWorldPoint(gx, gz, () => {
        openNpcDialogueOrQuest(npcId);
      });
      showToast(`🚶 正在帶路前往尋找 ${npc.config.name}…`, 2400);
    },
    onSendPeerEmote: async (peer, actionId) => {
      const em = PEER_EMOTES.find(e => e.id === actionId) || PEER_EMOTES[0];
      sceneCtrl.playPlayerEmote(actionId, `向 ${peer.name} ${em.bubble}`);
      await storageSync.sendPeerEmote(peer, actionId);
      showToast(`${em.emoji} 已向「${peer.name}」送出${em.label}，等待對方回禮即可各得 +1 功德！`, 3800);
    },
    onGiftSent: (peer, giftLabel) => {
      sceneCtrl.playPlayerEmote('salute', `贈送 ${giftLabel} 給 ${peer.name} 🎁`);
      updatePlayerHud();
      showToast(`🎁 已將【${giftLabel}】結緣贈送給「${peer.name}」！`, 3800);
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
  storageSync.subscribe('tigerEggs', (list) => sceneCtrl.syncTigerEggs(list));
  storageSync.subscribe('teaOffer', (tea) => sceneCtrl.syncTeaOffer(tea));
  storageSync.subscribe('taisui', (list) => sceneCtrl.updateTaiSuiWall(list));
  storageSync.subscribe('bulletin', (b) => sceneCtrl.updateBulletinBoard(b));
  storageSync.subscribe('player', () => updatePlayerHud());
  storageSync.subscribe('presence', (peers) => {
    sceneCtrl.syncRemotePeers(peers);
    updateOnlineCount();
  });
  storageSync.subscribe('quests', () => refreshQuestsState());
  storageSync.subscribe('interaction', (ev) => {
    if (!ev) return;
    if (ev.kind === 'emote') {
      const em = PEER_EMOTES.find(e => e.id === ev.action) || PEER_EMOTES[0];
      soundEngine.playSoftClick();
      sceneCtrl.playRemotePeerEmote(ev.fromUid || ev.fromClientId, ev.action, em.bubble);
      modalsUI.showIncomingInteractionBanner(ev, async (incoming) => {
        const res = await storageSync.replyPeerEmote(incoming);
        sceneCtrl.playPlayerEmote('salute', `回禮給 ${incoming.fromName} 🙏`);
        updatePlayerHud();
        if (res.granted) {
          showToast(`🙏 已回禮給「${incoming.fromName}」！雙方結緣各獲得 +1 功德（今日 ${res.used}/3）！`, 4000);
        } else {
          showToast(`🙏 已回禮給「${incoming.fromName}」！（今日與對方已達 3 次結緣功德上限，持續互動一樣歡喜喔）`, 4200);
        }
      });
    } else if (ev.kind === 'reply') {
      soundEngine.playBlessingChime();
      sceneCtrl.playRemotePeerEmote(ev.fromUid || ev.fromClientId, 'salute', '歡喜回禮 🙏✨');
      updatePlayerHud();
      if (ev.rewardGranted) {
        showToast(`🤝 「${ev.fromName}」已向你回禮！雙方結緣各獲得 +1 功德！`, 4200);
      } else {
        showToast(`🤝 「${ev.fromName}」已向你熱情回禮！（今日已達 3 次功德上限）`, 3600);
      }
    } else if (ev.kind === 'gift') {
      soundEngine.playBlessingChime();
      sceneCtrl.playRemotePeerEmote(ev.fromUid || ev.fromClientId, 'salute', `贈送結緣禮 🎁`);
      updatePlayerHud();
      showToast(`🎁 收到「${ev.fromName}」結緣贈送的【${ev.giftLabel || '結緣禮'}】，已存入您的隨身背包！`, 4800);
    }
  });

  // ★ 關鍵修正：3D 場景非同步初始化期間若雲端共享資料已先拉取完成，訂閱前漏接事件會導致 3D 太歲牆／公佈欄停留在舊預設名單！
  //   註冊訂閱後立即把最新資料同步到 3D 牆面，並強制向雲端再拉一次最新清單確保信徒進場就看到最新內容！
  sceneCtrl.syncOfferings(storageSync.getOfferings());
  sceneCtrl.syncTigerEggs(storageSync.getTigerEggs());
  sceneCtrl.syncTeaOffer(storageSync.getTeaOffer());
  sceneCtrl.updateTaiSuiWall(storageSync.getTaiSuiList());
  sceneCtrl.updateBulletinBoard(storageSync.getBulletin());
  storageSync.refreshCloudShared(true);

  storageSync.subscribe('visitStats', () => {
    updateOnlineCount();
    if (adminUI?.isOpen && adminUI.authenticated && adminUI.activeTab === 'stats') {
      adminUI.renderDashboard();
    }
  });

  updateOnlineCount();
  updatePlayerHud();
  refreshQuestsState();

  const showDailyVisitSummaryToast = () => {
    soundEngine.playSoftClick();
    const s = storageSync.getVisitAnalytics();
    showToast(`🙏 今日參拜 ${s.today.toLocaleString('zh-TW')} 人・本週 ${s.week.toLocaleString('zh-TW')} 人・本月 ${s.month.toLocaleString('zh-TW')} 人・累積上線共計 ${s.cumulative.toLocaleString('zh-TW')} 人次！`, 4800);
  };
  document.getElementById('daily-visit-pill')?.addEventListener('click', showDailyVisitSummaryToast);
  document.getElementById('daily-visit-pill-mobile')?.addEventListener('click', showDailyVisitSummaryToast);

  document.getElementById('online-status-pill')?.addEventListener('click', () => {
    soundEngine.playSoftClick();
    modalsUI.openOnlinePeersModal();
  });
  document.getElementById('online-status-pill-mobile')?.addEventListener('click', () => {
    soundEngine.playSoftClick();
    modalsUI.openOnlinePeersModal();
  });

  document.getElementById('btn-open-quests')?.addEventListener('click', () => {
    soundEngine.playSoftClick();
    modalsUI.openQuestBoardModal();
  });

  document.getElementById('btn-open-backpack')?.addEventListener('click', () => {
    soundEngine.playSoftClick();
    modalsUI.openBackpackModal();
  });

  // ---- 右上角晝夜切換（★ V33 預設依真實世界當地時間自動切換白天 06:00–17:59 ／夜晚 18:00–05:59，並完整保留手動切換按鈕！） ----
  const dnBtn = document.getElementById('btn-toggle-daynight');
  const dnIcon = document.getElementById('daynight-icon');
  const dnLabel = document.getElementById('daynight-label');
  const getRealWorldDayNightMode = () => {
    const h = new Date().getHours();
    return (h >= 6 && h < 18) ? 'day' : 'night';
  };
  const syncDayNightBtnUI = (mode) => {
    if (mode === 'night') {
      if (dnIcon) dnIcon.textContent = '☀️';
      if (dnLabel) dnLabel.textContent = '切換白天';
    } else {
      if (dnIcon) dnIcon.textContent = '🌙';
      if (dnLabel) dnLabel.textContent = '切換夜景';
    }
  };
  let userManualDayNight = false;
  const initialRealMode = getRealWorldDayNightMode();
  sceneCtrl.setDayNightMode(initialRealMode, true);
  syncDayNightBtnUI(initialRealMode);

  // 每分鐘檢查一次真實世界時間：若跨越日出 (06:00) 或日落 (18:00) 且玩家未手動鎖定，即自動平滑變換日夜！
  setInterval(() => {
    if (userManualDayNight) return;
    const desired = getRealWorldDayNightMode();
    if (sceneCtrl.atmosphere?.mode !== desired) {
      sceneCtrl.setDayNightMode(desired, false);
      syncDayNightBtnUI(desired);
    }
  }, 60000);

  dnBtn?.addEventListener('click', () => {
    soundEngine.playSoftClick();
    userManualDayNight = true;
    const mode = sceneCtrl.toggleDayNightMode();
    syncDayNightBtnUI(mode);
    if (mode === 'night') {
      const qRes = storageSync.progressQuest('q_night_patrol', 1);
      refreshQuestsState();
      if (qRes.justReady) {
        soundEngine.playBlessingChime();
        showToast('🌙 夜巡夜景巡視完成！快回去找總幹事阿國領取 +15 功德！', 4400);
      } else {
        rpgNarrator.showFloatingBanner('夜幕降臨！廟埕暖黃串燈、石燈籠光池與祈福天燈已經點亮～', '🌙', 4200);
      }
    } else {
      rpgNarrator.showFloatingBanner('已切換回暖陽白天模式，欣賞德慈宮挑高燕尾飛簷與彩繪細節！', '☀️', 3600);
    }
  });

  // ---- 右上角配樂開關與音量 ----
  const muteBtn = document.getElementById('btn-toggle-audio');
  const volSlider = document.getElementById('audio-volume');
  const setAudioBtnUI = (isMuted) => {
    if (!muteBtn) return;
    muteBtn.innerHTML = isMuted
      ? '🔇<span class="hidden sm:inline ml-1">配樂關</span>'
      : '🔊<span class="hidden sm:inline ml-1">配樂開</span>';
  };
  muteBtn?.addEventListener('click', () => {
    const isMuted = soundEngine.toggleMute();
    if (!isMuted) soundEngine.startAmbient();
    setAudioBtnUI(isMuted);
  });
  volSlider?.addEventListener('input', (e) => {
    const val = Number(e.target.value) / 100;
    soundEngine.setVolume(val);
    if (val > 0 && soundEngine.muted) {
      soundEngine.setMuted(false);
      soundEngine.startAmbient();
      setAudioBtnUI(false);
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
        ? 'cam-preset-btn px-2.5 h-8 rounded-lg bg-[#8E1515] text-[#FFFDF6] text-xs font-black transition shadow-sm'
        : `cam-preset-btn px-2.5 h-8 rounded-lg hover:bg-[#F3E6CA] ${id === 'god' ? 'text-[#8E1515] font-black' : 'text-[#183C32] font-extrabold'} text-xs transition`;
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
  document.getElementById('btn-exit-hall')?.addEventListener('click', () => {
    soundEngine.playSoftClick();
    sceneCtrl.walkOutsideHall();
    showToast('🚶 正走出正殿回到廟埕廣場…');
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
      setAudioBtnUI(!musicEnabled);

      // ★ V46 玩家上線登記今日參拜與累積上線人次，並即時更新頂部今日參拜數！
      storageSync.recordOnlineVisit(name);

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
            '用 WASD、方向鍵或直接點擊地面走到發光光圈、拜墊或 NPC 旁，按下 [E] 鍵（或點右側按鈕）即可展開互動！',
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
  window.__finishTempleLoader?.();
}

const bootTempleApp = () => {
  initApp().catch((err) => {
    console.error('[DeciTemple] initApp error:', err);
    const isWebGL = err?.code === 'WEBGL_UNAVAILABLE' || /webgl/i.test(String(err?.message || ''));
    if (isWebGL) {
      window.__showTempleLoaderError?.(
        '手機瀏覽器暫時停用 3D 繪圖（WebGL）',
        '若您剛才遇過畫面閃退，Chrome 可能會暫時鎖定該分頁的 3D 加速。<br/>請<b>關閉此分頁（或重開 Chrome 瀏覽器）</b>後再重新進入，即可恢復流暢的 3D 德慈宮！',
        err?.message || 'WebGL context creation failed'
      );
    } else {
      window.__showTempleLoaderError?.(
        '3D 廟宇場景初始化發生異常',
        '請先嘗試重新整理頁面；若持續發生，建議清除此頁快取或改用最新版本的 Chrome／Safari 開啟。',
        err?.message || String(err)
      );
    }
  });
};

// ★ 修復 ES Module 載入完時 DOMContentLoaded 早已觸發導致卡在 30% 的關鍵問題！
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootTempleApp, { once: true });
} else {
  bootTempleApp();
}
