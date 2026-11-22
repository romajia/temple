/**
 * Three.js 場景總控引擎 (V5)
 * ------------------------------------------------------------
 * - 遇到牆面/屋簷遮擋主角時自動平滑透明化（Occlusion Fade）
 * - 一鍵切換「上帝視角（高空全景俯瞰）」與「第三人稱跟隨視角」
 * - 走入互動光圈／拜墊直接觸發（免按 E！離開後再進入可重新觸發）
 * - 修正天公爐禮儀：站在靠廟那側 (z = 12.85) 向外三拜 → 直接往前插香
 * - 拜主神（中央大道）與 36 拜墊（任意坐下念經）功能完全獨立
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { TEMPLE_CONFIG, KNEEL_MATS_36, SIDE_BENCHES } from '../config/templeConfig.js';
import { buildDeciTemple } from './templeBuilder.js';
import { ChibiAvatar } from './chibiAvatar.js';
import { TempleParticleEffects } from './particleEffects.js';
import { Offerings3DManager } from './offerings3D.js';
import { TempleCollisionSystem } from './collisionSystem.js';
import { TempleNPCManager } from './npcManager.js';
import { DayNightAtmosphere } from './dayNightAtmosphere.js';
import { drawTaiSuiWallCanvas, drawBulletinCanvas } from './canvasTextures.js';

export class TempleSceneController {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.clock = new THREE.Clock();

    this.keys = new Set();
    this.joystick = { x: 0, y: 0 };
    this.autoPath = [];
    this.pathEndAction = null;
    this.movementLocked = false;

    this.cameraMode = 'follow'; // 'follow' | 'closeup'
    this.godViewEnabled = false;
    this.activeCamPreset = 'front';
    this.koiFeedTimer = 0;
    this.koiFeedTarget = { x: -1.1, z: 0.2 };
    this.feedPellets = [];
    this.feedRipples = [];
    this.closeupGoal = null;
    this.savedFollowOffset = new THREE.Vector3(...TEMPLE_CONFIG.camera.followOffset);
    this.prevPlayerPos = new THREE.Vector3();

    this.activeZoneKey = '';
    this.lastTriggeredKey = '';
    this.activeKneelMat = KNEEL_MATS_36[0];
    this.activeBench = null;
    this.guidedZoneId = 'incense';
    this.pointerDownPos = { x: 0, y: 0 };
    this.presenceTimer = 0;
    this.pendingBubble = '';

    this._initRenderer();
    this._initSceneAndLights();
    this.collision = new TempleCollisionSystem();
    this._initTemple(callbacks.initialState || {});
    this.atmosphere = new DayNightAtmosphere(this.scene, this.lights, this.refs);
    this._initPlayerAvatar(callbacks.initialState?.playerPresetId || 'youngMale');
    this.npcManager = new TempleNPCManager(this.scene, this.collision);
    this._initParticles();
    this._initGroundRipple();
    this._initControlsAndEvents();

    this.animate = this.animate.bind(this);
    this.animate();
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.16;
    this.container.appendChild(this.renderer.domElement);
  }

  _initSceneAndLights() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#B8D4C8');
    this.scene.fog = new THREE.Fog('#C2DBD0', 62, 155);

    // ★ 需求 #4：建立真實 PBR 環境反射貼圖，讓金箔神帽、天公爐、朱漆、琉璃瓦與水池波光呈現劇院級細緻光澤！
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.52;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(
      TEMPLE_CONFIG.camera.fov || 35,
      this.container.clientWidth / this.container.clientHeight,
      0.3,
      220
    );

    const hemi = new THREE.HemisphereLight(0xFFF6E0, 0x7C9D7B, 1.12);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xFFF3DC, 2.15);
    sun.position.set(22, 36, 24);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.radius = 2.8;
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 105;
    sun.shadow.camera.left = -36;
    sun.shadow.camera.right = 36;
    sun.shadow.camera.top = 36;
    sun.shadow.camera.bottom = -36;
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.035;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xD1EEF4, 0.55);
    fill.position.set(-20, 16, -14);
    this.scene.add(fill);

    this.lights = { hemi, sun, fill };
  }

  _initTemple(initialState) {
    const built = buildDeciTemple(this.scene, initialState);
    this.templeRoot = built.root;
    this.interactiveObjects = built.interactiveObjects;
    this.walkableMeshes = built.walkableMeshes;
    this.occludableMeshes = built.occludableMeshes || [];
    this.refs = built.animatedRefs;

    // ★ 需求 #4：為全場景所有貼圖套用最高階非等向性過濾（Anisotropy），大幅提升磁磚、紅磚、壁畫與匾額的斜視清晰銳利度！
    const maxAniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy?.() || 4);
    this.templeRoot.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        if (m.map && m.map.anisotropy < maxAniso) {
          m.map.anisotropy = maxAniso;
          m.map.needsUpdate = true;
        }
      });
    });

    this.offeringsManager = new Offerings3DManager(this.refs.offeringTableTop);
    this.scene.add(this.offeringsManager.group);
    if (initialState.offerings) {
      this.offeringsManager.syncOfferings(initialState.offerings);
    }
  }

  _initPlayerAvatar(presetId) {
    this.player = new ChibiAvatar({ presetId, label: '' });
    this.player.root.position.set(0, 0.03, 19.5);
    this.player.root.rotation.y = Math.PI;
    this.prevPlayerPos.copy(this.player.root.position);
    this.scene.add(this.player.root);
  }

  _initParticles() {
    this.particles = new TempleParticleEffects(this.scene);
    this.particles.addSmokeEmitter(() => this.player.getIncenseSmokeWorldPos(), 0.13, 0.78);
    this.particles.addSmokeEmitter(() => this.refs.tiangongSmokePos, 0.24, 1.05);
    this.particles.addSmokeEmitter(() => this.refs.mainCenserSmokePos, 0.26, 1.0);
    this.particles.setFurnaceOrigin(this.refs.furnaceOrigin);
  }

  _initGroundRipple() {
    this.clickMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.20, 0.38, 24),
      new THREE.MeshBasicMaterial({ color: 0xE5B968, transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false })
    );
    this.clickMarker.rotation.x = -Math.PI / 2;
    this.clickMarker.position.y = 0.07;
    this.clickMarkerLife = 0;
    this.scene.add(this.clickMarker);
  }

  _initControlsAndEvents() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(
      this.player.root.position.x,
      this.player.root.position.y + 1.35,
      this.player.root.position.z
    );
    this.camera.position.copy(this.controls.target).add(this.savedFollowOffset);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.085;
    this.controls.rotateSpeed = 0.62;
    this.controls.zoomSpeed = 0.80;
    this.controls.minDistance = TEMPLE_CONFIG.camera.minDistance;
    this.controls.maxDistance = TEMPLE_CONFIG.camera.maxDistance;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.10;
    this.controls.enablePan = false;
    // 右鍵拖曳專屬旋轉（不誤觸走動），左鍵仍支援拖曳旋轉與短按點擊走動
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE
    };
    this.controls.update();

    this.raycaster = new THREE.Raycaster();
    this.occlusionRay = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    const dom = this.renderer.domElement;
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    dom.addEventListener('pointerdown', (e) => {
      this.pointerDownPos = { x: e.clientX, y: e.clientY, button: e.button };
    });

    dom.addEventListener('pointerup', (e) => {
      if (this.movementLocked) return;
      // 僅滑鼠左鍵短點（或觸控點按）觸發點擊走動；右鍵拖曳專注旋轉鏡頭絕不誤觸！
      if (e.button !== 0) return;
      const dx = e.clientX - this.pointerDownPos.x;
      const dy = e.clientY - this.pointerDownPos.y;
      if (Math.hypot(dx, dy) > 8) return;
      this._handleCanvasClick(e);
    });

    window.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const code = e.code;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyR'].includes(code)) {
        e.preventDefault();
        this.keys.add(code);
      } else if (code === 'KeyE') {
        e.preventDefault();
        this.callbacks.onActionHotkey?.();
      }
    });

    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('resize', () => this.onResize());
  }

  /**
   * ★ 需求 #3：精準階梯高度內插！經過正門三層花崗岩樓梯 (z = 8.95..10.45) 時平滑升降，人絕不沉進樓梯！
   */
  _getFloorY(x, z) {
    const hb = TEMPLE_CONFIG.hallBounds;
    if (x >= hb.minX && x <= hb.maxX && z >= hb.minZ && z <= 8.95) {
      return 0.37;
    }
    if (x >= -10.4 && x <= 10.4 && z > 8.95 && z <= 10.45) {
      const t = (z - 8.95) / 1.50;
      return 0.37 * (1 - t) + 0.03 * t;
    }
    return 0.03;
  }

  _handleCanvasClick(event) {
    if (this.player.isLockedInAction()) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const objHits = this.raycaster.intersectObjects(this.interactiveObjects, true);
    for (const hit of objHits) {
      let cur = hit.object;
      while (cur) {
        if (cur.userData && cur.userData.zoneId) {
          if (cur.userData.zoneId === 'kneelMat') {
            this.walkToWorldPoint(hit.point.x, hit.point.z);
          } else if (cur.userData.zoneId === 'sideBench') {
            const sb = SIDE_BENCHES.find(b => b.id === cur.userData.benchId);
            if (sb) this.walkToWorldPoint(sb.standPos[0], sb.standPos[2]);
          } else {
            this.walkToZone(cur.userData.zoneId);
          }
          return;
        }
        cur = cur.parent;
      }
    }

    const groundHits = this.raycaster.intersectObjects(this.walkableMeshes, true);
    if (groundHits.length > 0) {
      const pt = groundHits[0].point;
      this.walkToWorldPoint(pt.x, pt.z);
    }
  }

  setDayNightMode(mode) { this.atmosphere.setMode(mode); }
  toggleDayNightMode() { return this.atmosphere.toggleMode(); }

  /**
   * 視角方案 B：休閒文創風「固定 4 方向一鍵切換」（正面 / 左側 / 右側 / 上帝俯瞰）
   */
  setCameraPreset(presetName = 'front') {
    const presets = TEMPLE_CONFIG.camera.presets || {};
    const arr = presets[presetName] || TEMPLE_CONFIG.camera.followOffset;
    this.activeCamPreset = presetName;
    this.godViewEnabled = presetName === 'god';

    const p = this.player.root.position;
    const offset = new THREE.Vector3(...arr);
    this.savedFollowOffset.copy(offset);
    this.cameraMode = 'follow';
    this.closeupGoal = {
      pos: new THREE.Vector3(p.x, p.y + 1.35, p.z).add(offset),
      target: new THREE.Vector3(p.x, p.y + 1.35, p.z),
      releaseOnDone: true
    };
    return presetName;
  }

  /**
   * 切換「上帝視角（高空俯瞰）」⇄「正面人物跟隨視角」
   */
  toggleGodView() {
    const next = this.godViewEnabled ? 'front' : 'god';
    this.setCameraPreset(next);
    return this.godViewEnabled;
  }

  /**
   * ★ 需求 #1：水池餵魚互動——灑出浮水魚飼料與水波漣漪，吸引 9 尾七彩錦鯉蜂擁游來爭食！
   */
  triggerFeedKoi() {
    const feedGroup = this.refs.pondFeedGroup;
    if (!feedGroup) return;

    // 清除前一次殘留飼料
    while (feedGroup.children.length > 0) feedGroup.remove(feedGroup.children[0]);
    this.feedPellets = [];
    this.feedRipples = [];

    const tx = -1.15 + (Math.random() - 0.5) * 0.5;
    const tz = 0.25 + (Math.random() - 0.5) * 0.6;
    this.koiFeedTarget = { x: tx, z: tz };
    this.koiFeedTimer = 6.5;

    // 讓主角朝向錦鯉池點頭微笑
    const p = this.player.root.position;
    this.player.root.rotation.y = Math.atan2(20.0 - p.x, 15.2 - p.z);

    // 產生 12 顆浮水金黃魚飼料粒
    const pelletGeo = new THREE.SphereGeometry(0.048, 6, 6);
    const pelletMat = new THREE.MeshStandardMaterial({ color: 0xD9822B, roughness: 0.7 });
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(pelletGeo, pelletMat);
      m.position.set(
        tx + (Math.random() - 0.5) * 0.9,
        0.24,
        tz + (Math.random() - 0.5) * 0.9
      );
      m.userData = { eatAt: 1.5 + Math.random() * 4.5, phase: Math.random() * 6 };
      feedGroup.add(m);
      this.feedPellets.push(m);
    }

    // 產生 4 道水波擴散漣漪
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.08, 0.14, 18),
        new THREE.MeshBasicMaterial({ color: 0xE0F2FE, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(tx + (Math.random() - 0.5) * 0.5, 0.235, tz + (Math.random() - 0.5) * 0.5);
      ring.userData = { age: -i * 0.45 };
      feedGroup.add(ring);
      this.feedRipples.push(ring);
    }

    // 灑落微光祝福粒子
    this.particles.spawnBlessingBurst(new THREE.Vector3(20.8 + tx, 0.55, 15.2 + tz), 18, 0x7DD3FC);
  }

  rotateCameraStep(deg = 30) {
    if (this.cameraMode !== 'follow') return;
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(deg));
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }

  zoomCameraStep(factor = 0.85) {
    if (this.cameraMode !== 'follow') return;
    const offset = this.camera.position.clone().sub(this.controls.target);
    const nextLen = THREE.MathUtils.clamp(
      offset.length() * factor,
      TEMPLE_CONFIG.camera.minDistance,
      TEMPLE_CONFIG.camera.maxDistance
    );
    offset.setLength(nextLen);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }

  applyPlayerPreset(presetId) { this.player.applyPreset(presetId); }
  setPlayerName(name) { this.player.setName(name); }

  showPlayerBubble(text) {
    this.player.showSpeechBubble(text, 4.5);
    this.pendingBubble = text;
  }

  setMovementLocked(locked) {
    this.movementLocked = locked;
    if (locked) {
      this.keys.clear();
      this.joystick.x = 0;
      this.joystick.y = 0;
      this.autoPath = [];
    }
  }

  setJoystickVector(vx, vy) {
    this.joystick.x = vx;
    this.joystick.y = vy;
  }

  setGuidedZone(zoneId) { this.guidedZoneId = zoneId; }
  setPlayerHoldingIncense(flag) { this.player.setHoldingIncense(flag); }

  walkToWorldPoint(goalX, goalZ, endAction = null) {
    if (this.player.isLockedInAction() || this.movementLocked) return;
    if (this.player.state === 'sit' || this.player.state === 'kneel') {
      this.player.setState('idle');
      this.callbacks.onForcedStandUp?.();
    }
    this.cameraMode = 'follow';
    this.closeupGoal = null;

    const pos = this.player.root.position;
    this.autoPath = this.collision.findPath(pos.x, pos.z, goalX, goalZ);
    this.pathEndAction = endAction;

    const safe = this.collision.resolveStatic(goalX, goalZ, 0.44);
    this.clickMarker.position.set(safe.x, this._getFloorY(safe.x, safe.z) + 0.04, safe.z);
    this.clickMarkerLife = 0.7;
  }

  walkToZone(zoneId, onArrive = null) {
    const zone = TEMPLE_CONFIG.zones[zoneId];
    if (!zone) return;
    // 若使用者主動點擊正在站立的同區域，先清除防重複鎖讓它可重新觸發
    this.lastTriggeredKey = '';
    const [sx, , sz] = zone.standPos;
    this.walkToWorldPoint(sx, sz, {
      lookAt: new THREE.Vector3(...zone.lookAt),
      zoneId,
      onArrive
    });
  }

  returnToPlayerCamera() {
    this.cameraMode = 'follow';
    this.closeupGoal = null;
    const target = new THREE.Vector3(
      this.player.root.position.x,
      this.player.root.position.y + 1.35,
      this.player.root.position.z
    );
    this.controls.target.copy(target);
    this.camera.position.copy(target).add(this.savedFollowOffset);
  }

  resetCameraView() {
    this.godViewEnabled = false;
    this.savedFollowOffset.set(...TEMPLE_CONFIG.camera.followOffset);
    this.returnToPlayerCamera();
  }

  enterCloseupCamera(camPosArr, targetArr) {
    if (this.cameraMode === 'follow') {
      this.savedFollowOffset.copy(this.camera.position).sub(this.controls.target);
    }
    this.cameraMode = 'closeup';
    this.closeupGoal = {
      pos: new THREE.Vector3(...camPosArr),
      target: new THREE.Vector3(...targetArr)
    };
  }

  // ---- 儀式動畫 ----
  playIncensePickupSequence(onComplete) {
    this.setMovementLocked(true);
    const z = TEMPLE_CONFIG.zones.incense;
    const pos = this.player.root.position;
    pos.set(z.standPos[0], 0.37, z.standPos[2]);
    this.player.root.rotation.y = -Math.PI * 0.42;

    this.enterCloseupCamera(
      [pos.x + 3.1, pos.y + 2.2, pos.z + 2.6],
      [pos.x - 0.15, pos.y + 1.12, pos.z]
    );

    setTimeout(() => {
      this.player.setHoldingIncense(true);
      this.player.showSpeechBubble('清香點燃了，香氣好舒服～', 2.4);
      this.particles.spawnBlessingBurst(new THREE.Vector3(pos.x - 0.35, pos.y + 1.25, pos.z), 22, 0xFFCC44);
    }, 550);

    setTimeout(() => {
      this.cameraMode = 'follow';
      this.closeupGoal = {
        pos: new THREE.Vector3(pos.x, pos.y + 1.35, pos.z).add(this.savedFollowOffset),
        target: new THREE.Vector3(pos.x, pos.y + 1.35, pos.z),
        releaseOnDone: true
      };
      this.setMovementLocked(false);
      if (onComplete) onComplete();
    }, 2650);
  }

  /**
   * ★ 修正後的天公爐禮儀：站在靠廟那側 (z = 12.85) 面向外 (+Z) 三拜，拜畢直接往前插三柱香！
   */
  playTianGongRitual(onComplete) {
    this.setMovementLocked(true);
    const pos = this.player.root.position;
    pos.set(0, 0.03, 12.85);
    this.player.root.rotation.y = 0; // 正面朝向廟外天際與眼前的天公爐 (+Z)
    this.player.showSpeechBubble('靠廟面向天際，誠心三拜玉皇大帝🙏', 2.4);
    this.enterCloseupCamera([4.8, 4.8, 19.6], [0, 1.4, 14.2]);

    this.player.playThreeBows(() => {
      // 拜完不必轉身，直接稍微上前一步把三柱清香插入眼前的天公爐！
      pos.set(0, 0.03, 13.32);
      this.player.showSpeechBubble('直接向前插上三柱清香✨', 1.8);

      this.player.playInsertIncense(() => {
        this.insertThreeIncenseSticks('tiangong');
        this.particles.spawnBlessingBurst(this.refs.tiangongSmokePos, 28, 0xFFD966);
        pos.set(0, 0.03, 12.85);

        this.cameraMode = 'follow';
        this.closeupGoal = {
          pos: new THREE.Vector3(pos.x, pos.y + 1.35, pos.z).add(this.savedFollowOffset),
          target: new THREE.Vector3(pos.x, pos.y + 1.35, pos.z),
          releaseOnDone: true
        };
        this.setMovementLocked(false);
        if (onComplete) onComplete();
      });
    });
  }

  /**
   * ★ 拜主神與念經分開：立於中央大道 (0, -2.0) 正面神明三拜並插香（無需上拜墊！）
   */
  playMainDeityRitual(onComplete) {
    this.setMovementLocked(true);
    const pos = this.player.root.position;
    pos.set(0, 0.37, -2.0);
    this.player.root.rotation.y = Math.PI; // 面向正殿神龕
    this.player.showSpeechBubble('立於中央大道，虔誠三拜主神🙏', 2.4);
    this.enterCloseupCamera([3.5, 5.2, 3.6], [0, 2.5, -9.2]);

    this.player.playThreeBows(() => {
      this.player.showSpeechBubble('上前插上三柱清香✨', 1.6);
      this.player.playInsertIncense(() => {
        this.insertThreeIncenseSticks('main');
        this.player.setHoldingIncense(false);
        this.particles.spawnBlessingBurst(this.refs.mainCenserSmokePos, 30, 0xFFE066);

        this.cameraMode = 'follow';
        this.closeupGoal = {
          pos: new THREE.Vector3(pos.x, pos.y + 1.35, pos.z).add(this.savedFollowOffset),
          target: new THREE.Vector3(pos.x, pos.y + 1.35, pos.z),
          releaseOnDone: true
        };
        this.setMovementLocked(false);
        if (onComplete) onComplete();
      });
    });
  }

  playBurnJossSequence(onEachSheet, onComplete) {
    this.setMovementLocked(true);
    const z = TEMPLE_CONFIG.zones.furnace;
    const pos = this.player.root.position;
    pos.set(z.standPos[0], 0.03, z.standPos[2]);
    this.player.root.rotation.y = Math.atan2(
      this.refs.furnaceOpeningPos.x - pos.x,
      this.refs.furnaceOpeningPos.z - pos.z
    );
    this.player.showSpeechBubble('金紙一張一張投入化金🔥', 2.8);
    this.enterCloseupCamera([11.2, 4.8, 11.2], [15.3, 1.5, 4.7]);

    const handStart = this.player.getHandWorldPos();
    this.player.playBurnPaperMotion(2.7);
    this.particles.launchJossPaperSequence(handStart, this.refs.furnaceOpeningPos, {
      count: 7,
      intervalMs: 330,
      onEachSheet,
      onComplete: () => {
        setTimeout(() => {
          this.cameraMode = 'follow';
          this.closeupGoal = {
            pos: new THREE.Vector3(pos.x, pos.y + 1.35, pos.z).add(this.savedFollowOffset),
            target: new THREE.Vector3(pos.x, pos.y + 1.35, pos.z),
            releaseOnDone: true
          };
          this.setMovementLocked(false);
          if (onComplete) onComplete();
        }, 650);
      }
    });
  }

  triggerOfferingPrayerBeam() {
    this.particles.spawnPrayerBeam(
      this.refs.offeringTableTop.clone().add(new THREE.Vector3(0, 0.4, 0)),
      this.refs.shrineCenter
    );
    this.particles.spawnBlessingBurst(this.refs.shrineCenter, 26, 0xFFE680);
  }

  insertThreeIncenseSticks(censerType) {
    const group = censerType === 'tiangong' ? this.refs.tiangongIncenseGroup : this.refs.mainIncenseGroup;
    while (group.children.length > 18) group.remove(group.children[0]);
    const baseAngle = Math.random() * Math.PI * 2;
    const baseR = Math.random() * 0.18;
    const cx = Math.cos(baseAngle) * baseR;
    const cz = Math.sin(baseAngle) * baseR;

    [-0.045, 0, 0.045].forEach((offset) => {
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.50, 6), new THREE.MeshStandardMaterial({ color: 0xB88746 }));
      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 6), new THREE.MeshBasicMaterial({ color: 0xFF6A1A, toneMapped: false }));
      ember.position.y = 0.25;
      stick.add(ember);
      stick.position.set(cx + offset, 0.19, cz);
      group.add(stick);
    });
  }

  setPlayerSitOnBench(benchData = null) {
    this.activeBench = benchData;
    this.autoPath = [];
    // ★ 需求 #12：檢查所有 NPC（包含已坐下的 NPC！）與線上玩家，自動坐到旁邊的空位，絕對不坐在別人身上！
    const occupiedActors = this.npcManager.getAllSeatedAndActiveActors();

    if (benchData) {
      const rawSeats = benchData.seats || [benchData.sitPos];
      const seats = rawSeats.map(s => Array.isArray(s) ? { pos: s, yaw: benchData.faceYaw } : s);
      let chosen = null;
      for (const s of seats) {
        const isTaken = occupiedActors.some(a => Math.hypot(a.x - s.pos[0], a.z - s.pos[2]) < 0.78);
        if (!isTaken) {
          chosen = s;
          break;
        }
      }
      if (!chosen) {
        this.player.showSpeechBubble('這張椅子坐滿囉，去旁邊的板凳坐吧😊', 2.4);
        return;
      }
      this.player.root.position.set(chosen.pos[0], 0.03, chosen.pos[2]);
      this.player.root.rotation.y = chosen.yaw;
      this.player.setState('sit');
      const camDx = Math.sin(chosen.yaw) * 6.5;
      const camDz = Math.cos(chosen.yaw) * 6.5;
      this.enterCloseupCamera(
        [chosen.pos[0] + camDx + 1.4, 4.6, chosen.pos[2] + camDz + 1.4],
        [chosen.pos[0], 1.1, chosen.pos[2]]
      );
      return;
    }

    // 廟前大榕樹板凳區同樣自動尋找未被佔用的旁邊空位！
    const mainSeats = TEMPLE_CONFIG.zones.bench.seats || [{ pos: TEMPLE_CONFIG.zones.bench.sitPos, yaw: 0 }];
    let chosenMain = null;
    for (const s of mainSeats) {
      const isTaken = occupiedActors.some(a => Math.hypot(a.x - s.pos[0], a.z - s.pos[2]) < 0.78);
      if (!isTaken) {
        chosenMain = s;
        break;
      }
    }
    if (!chosenMain) {
      this.player.showSpeechBubble('大榕樹板凳坐滿囉，廟旁樹下還有雙人長椅喔😊', 2.6);
      return;
    }
    this.player.root.position.set(chosenMain.pos[0], 0.03, chosenMain.pos[2]);
    this.player.root.rotation.y = chosenMain.yaw;
    this.player.setState('sit');
    this.enterCloseupCamera([-10.2, 4.8, 20.8], [chosenMain.pos[0], 1.1, chosenMain.pos[2]]);
  }

  setPlayerKneelOnMat(mat = null) {
    const targetMat = mat || this.activeKneelMat || KNEEL_MATS_36[0];
    this.activeKneelMat = targetMat;
    this.autoPath = [];
    this.player.root.position.set(targetMat.x, 0.37, targetMat.z);
    this.player.root.rotation.y = Math.PI;
    this.player.setState('kneel');
    this.enterCloseupCamera([targetMat.x + 0.6, 4.2, targetMat.z + 5.6], [0, 2.8, -10.4]);
  }

  standUpPlayer() {
    const p = this.player.root.position;
    if (this.player.state === 'sit') {
      if (this.activeBench) {
        p.set(this.activeBench.standPos[0], 0.03, this.activeBench.standPos[2]);
        this.activeBench = null;
      } else {
        p.set(TEMPLE_CONFIG.zones.bench.standPos[0], 0.03, TEMPLE_CONFIG.zones.bench.standPos[2]);
      }
    }
    this.player.setState('idle');
    this.cameraMode = 'follow';
    this.closeupGoal = {
      pos: new THREE.Vector3(p.x, p.y + 1.35, p.z).add(this.savedFollowOffset),
      target: new THREE.Vector3(p.x, p.y + 1.35, p.z),
      releaseOnDone: true
    };
  }

  faceNPC(npcId) { this.npcManager.facePlayer(npcId, this.player.root.position); }
  syncRemotePeers(list) { this.npcManager.syncRemotePeers(list); }

  triggerBlessingAtZone(zoneId) {
    const z = TEMPLE_CONFIG.zones[zoneId];
    if (!z) return;
    this.particles.spawnBlessingBurst(new THREE.Vector3(z.position[0], 1.8, z.position[2]), 24, 0xFFE066);
  }

  syncOfferings(list) { this.offeringsManager.syncOfferings(list); }

  updateTaiSuiWall(list, highlightName = '') {
    if (!this.refs.taiSuiTexture) return;
    drawTaiSuiWallCanvas(this.refs.taiSuiTexture.userData.canvas, list, highlightName);
    this.refs.taiSuiTexture.needsUpdate = true;
  }

  updateBulletinBoard(bulletin) {
    if (!this.refs.bulletinTexture) return;
    drawBulletinCanvas(this.refs.bulletinTexture.userData.canvas, bulletin);
    this.refs.bulletinTexture.needsUpdate = true;
  }

  onResize() {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  /**
   * ★ 全面視線遮擋自動透明化（需求 #3 & #5）：
   *   1. 主角走進大殿內或開啟上帝視角時，前後兩進「屋頂」自動半透明化，殿內一覽無遺！
   *   2. 從相機向主角 5 個取樣點發射射線，凡擋住視線的牆體、屋頂、安太歲紅紙板子、
   *      神明桌、大供桌、大榕樹與所有綠樹，整組同步平滑降至半透明！
   */
  _updateWallOcclusion(dt) {
    if (this.occludableMeshes.length === 0) return;

    const p = this.player.root.position;
    const camPos = this.camera.position;
    const hitGroups = new Set();

    // 只要主角進入大殿範圍內（或開啟上帝視角看大殿），自動將前後兩進大屋頂半透明化！
    const hb = TEMPLE_CONFIG.hallBounds;
    const insideHall = p.x >= hb.minX - 0.4 && p.x <= hb.maxX + 0.4 && p.z >= hb.minZ - 0.4 && p.z <= hb.maxZ + 0.8;
    if (insideHall || this.godViewEnabled) {
      hitGroups.add('roof-front');
      hitGroups.add('roof-main');
    }

    const samples = [
      [0, 0.55, 0],
      [0, 1.15, 0],
      [0, 1.72, 0],
      [-0.45, 1.15, 0],
      [0.45, 1.15, 0]
    ];
    for (const [ox, oy, oz] of samples) {
      const targetPt = new THREE.Vector3(p.x + ox, p.y + oy, p.z + oz);
      const dir = targetPt.sub(camPos);
      const dist = dir.length();
      if (dist < 0.6) continue;

      this.occlusionRay.set(camPos, dir.normalize());
      this.occlusionRay.far = dist - 0.45;
      const hits = this.occlusionRay.intersectObjects(this.occludableMeshes, false);
      for (const hit of hits) {
        const gid = hit.object.userData?.occludeGroupId;
        if (gid) hitGroups.add(gid);
      }
    }

    const speed = Math.min(1, dt * 9);
    for (const mesh of this.occludableMeshes) {
      const gid = mesh.userData?.occludeGroupId;
      const baseOp = mesh.userData?.baseOpacity ?? 1.0;
      const isRoof = gid === 'roof-front' || gid === 'roof-main';
      const fadeLevel = isRoof ? 0.13 : 0.16;
      const targetOp = hitGroups.has(gid) ? Math.min(fadeLevel, baseOp) : baseOp;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        const curOp = mat.opacity;
        if (Math.abs(targetOp - curOp) > 0.01) {
          mat.opacity = curOp + (targetOp - curOp) * speed;
          mat.depthWrite = mat.opacity > 0.85;
        }
      }
    }
  }

  _updatePlayerMovement(dt) {
    const pos = this.player.root.position;
    this.prevPlayerPos.copy(pos);

    if (this.movementLocked || this.player.isLockedInAction()) return;

    let inX = this.joystick.x;
    let inY = this.joystick.y;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) inX -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) inX += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) inY -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) inY += 1;

    const inputMag = Math.hypot(inX, inY);

    if (inputMag > 0.08) {
      if (this.player.state === 'sit' || this.player.state === 'kneel') {
        this.standUpPlayer();
        this.callbacks.onForcedStandUp?.();
      }
      this.autoPath = [];
      this.pathEndAction = null;
      if (this.closeupGoal?.releaseOnDone) this.closeupGoal = null;

      const camForward = new THREE.Vector3();
      this.camera.getWorldDirection(camForward);
      camForward.y = 0;
      if (camForward.lengthSq() < 1e-4) camForward.set(0, 0, -1);
      camForward.normalize();

      const camRight = new THREE.Vector3(-camForward.z, 0, camForward.x);
      const normX = inX / Math.max(1, inputMag);
      const normY = inY / Math.max(1, inputMag);

      const moveDir = new THREE.Vector3()
        .addScaledVector(camRight, normX)
        .addScaledVector(camForward, -normY);

      const speed = 5.9 * Math.min(1, inputMag);
      const rawX = pos.x + moveDir.x * speed * dt;
      const rawZ = pos.z + moveDir.z * speed * dt;

      const others = this.npcManager.getActorColliders();
      const resolved = this.collision.resolveDynamic(rawX, rawZ, others, 0.44);
      pos.x = resolved.x;
      pos.z = resolved.z;

      const desiredY = this._getFloorY(pos.x, pos.z);
      pos.y += (desiredY - pos.y) * Math.min(1, dt * 20);

      const targetYaw = Math.atan2(moveDir.x, moveDir.z);
      let diff = targetYaw - this.player.root.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.player.root.rotation.y += diff * Math.min(1, dt * 14);
      this.player.setState('walk');
      return;
    }

    if (this.autoPath.length > 0) {
      const next = this.autoPath[0];
      const dx = next.x - pos.x;
      const dz = next.z - pos.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.24) {
        this.autoPath.shift();
        if (this.autoPath.length === 0) {
          this.player.setState('idle');
          const endAct = this.pathEndAction;
          this.pathEndAction = null;
          if (endAct?.lookAt) {
            this.player.root.rotation.y = Math.atan2(endAct.lookAt.x - pos.x, endAct.lookAt.z - pos.z);
          }
          if (endAct?.onArrive) endAct.onArrive(endAct.zoneId);
        }
      } else {
        const speed = 6.2;
        const step = Math.min(dist, speed * dt);
        const rawX = pos.x + (dx / dist) * step;
        const rawZ = pos.z + (dz / dist) * step;

        const others = this.npcManager.getActorColliders();
        const resolved = this.collision.resolveDynamic(rawX, rawZ, others, 0.44);
        pos.x = resolved.x;
        pos.z = resolved.z;

        const desiredY = this._getFloorY(pos.x, pos.z);
        pos.y += (desiredY - pos.y) * Math.min(1, dt * 12);

        const targetYaw = Math.atan2(dx, dz);
        let diff = targetYaw - this.player.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.player.root.rotation.y += diff * Math.min(1, dt * 12);
        this.player.setState('walk');
      }
      return;
    }

    if (this.player.state === 'walk') {
      this.player.setState('idle');
    }
  }

  /**
   * ★ 需求 #2：走進互動光圈、拜墊或靠近 NPC 時亮起提示，改由玩家按 [E] 鍵或點右側按鈕才進入動作！
   */
  _updateProximityCheck() {
    if (this.movementLocked || this.player.isLockedInAction()) {
      if (this.activeZoneKey) {
        this.activeZoneKey = '';
        this.callbacks.onProximityChange?.(null);
      }
      return;
    }

    const pos = this.player.root.position;
    let found = null;
    let bestDist = Infinity;

    // 1. 偵測各大設施光圈（同時涵蓋 standPos 與攤位周圍，確保從任一角度靠近每日挑戰與供品鋪皆穩定觸發！）
    for (const z of Object.values(TEMPLE_CONFIG.zones)) {
      const dStand = Math.hypot(pos.x - z.standPos[0], pos.z - z.standPos[2]);
      const dCenter = Math.hypot(pos.x - z.position[0], pos.z - z.position[2]);
      const effectiveDist = (z.id === 'quizBooth' || z.id === 'offeringShop')
        ? Math.min(dStand, Math.max(0, dCenter - 0.85))
        : dStand;
      if (effectiveDist <= z.triggerRadius && effectiveDist < bestDist) {
        bestDist = effectiveDist;
        found = {
          type: 'zone',
          id: z.id,
          title: z.name,
          icon: z.icon,
          actionText: `進入【${z.shortLabel}】`
        };
      }
    }

    // 1.5 偵測廟旁樹蔭下 5 組休憩長板凳（走近按 [E] 即可坐下聊天！）
    if (!found) {
      for (const b of SIDE_BENCHES) {
        const dStand = Math.hypot(pos.x - b.standPos[0], pos.z - b.standPos[2]);
        const dSeat = Math.hypot(pos.x - b.x, pos.z - b.z);
        if (Math.min(dStand, dSeat) <= 1.9) {
          found = {
            type: 'sideBench',
            id: b.id,
            bench: b,
            title: b.name,
            icon: '🪑',
            actionText: `坐上【${b.name}】聊天`
          };
          break;
        }
      }
    }

    // 2. 偵測是否站到 36 個拜墊任一個（按 E 跪坐念經！）
    if (!found) {
      let nearestMat = null;
      let matDist = 0.68;
      for (const m of KNEEL_MATS_36) {
        const d = Math.hypot(pos.x - m.x, pos.z - m.z);
        if (d < matDist && !this.npcManager.isMatOccupiedByNPC(m.id)) {
          matDist = d;
          nearestMat = m;
        }
      }
      if (nearestMat) {
        this.activeKneelMat = nearestMat;
        found = {
          type: 'kneelMat',
          id: nearestMat.id,
          mat: nearestMat,
          title: `正殿拜墊 #${nearestMat.index}`,
          icon: '🙏',
          actionText: `坐上拜墊 #${nearestMat.index} 念經`
        };
      }
    }

    // 3. 偵測靠近可對話 NPC（含新登場的供品鋪老闆娘與挑戰攤關主！）
    if (!found) {
      const npc = this.npcManager.findNearestInteractiveNPC(pos, 2.0);
      if (npc) {
        found = {
          type: 'npc',
          id: npc.id,
          title: npc.config.name,
          icon: npc.config.avatar,
          actionText: `與 ${npc.config.name} 對話`
        };
      }
    }

    const nextKey = found ? `${found.type}:${found.id}` : '';
    if (nextKey !== this.activeZoneKey) {
      this.activeZoneKey = nextKey;
      this.callbacks.onProximityChange?.(found);
    }
  }

  _updateCamera(dt) {
    const pos = this.player.root.position;

    if (this.closeupGoal) {
      const k = Math.min(1, dt * 4.8);
      this.camera.position.lerp(this.closeupGoal.pos, k);
      this.controls.target.lerp(this.closeupGoal.target, k);
      if (
        this.closeupGoal.releaseOnDone &&
        this.camera.position.distanceTo(this.closeupGoal.pos) < 0.14 &&
        this.controls.target.distanceTo(this.closeupGoal.target) < 0.14
      ) {
        this.closeupGoal = null;
      }
    } else if (this.cameraMode === 'follow') {
      const dx = pos.x - this.prevPlayerPos.x;
      const dy = pos.y - this.prevPlayerPos.y;
      const dz = pos.z - this.prevPlayerPos.z;
      this.camera.position.x += dx;
      this.camera.position.y += dy;
      this.camera.position.z += dz;

      const desiredTarget = new THREE.Vector3(pos.x, pos.y + 1.35, pos.z);
      const tDiff = desiredTarget.clone().sub(this.controls.target);
      const followK = Math.min(1, dt * 8);
      this.controls.target.addScaledVector(tDiff, followK);
      this.camera.position.addScaledVector(tDiff, followK);

      // Q / R 鍵盤流暢旋轉視角（不需猛拉滑鼠也能輕鬆轉向！）
      if (this.keys.has('KeyQ') || this.keys.has('KeyR')) {
        const rotDir = this.keys.has('KeyQ') ? 1 : -1;
        const offset = this.camera.position.clone().sub(this.controls.target);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotDir * 1.45 * dt);
        this.camera.position.copy(this.controls.target).add(offset);
      }
    }

    this.controls.update();
  }

  animate() {
    requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    this._updatePlayerMovement(dt);
    this._updateProximityCheck();
    this._updateCamera(dt);
    this._updateWallOcclusion(dt);
    this.atmosphere.update(dt, elapsed);

    this.player.update(dt, elapsed);
    this.npcManager.update(dt, elapsed, this.player.root.position);

    this.presenceTimer += dt;
    if (this.presenceTimer >= 0.15) {
      this.presenceTimer = 0;
      const p = this.player.root.position;
      this.callbacks.onBroadcastPresence?.({
        x: Number(p.x.toFixed(2)),
        y: Number(p.y.toFixed(2)),
        z: Number(p.z.toFixed(2)),
        rotY: Number(this.player.root.rotation.y.toFixed(2)),
        state: this.player.state,
        holdingIncense: this.player.holdingIncense,
        bubble: this.pendingBubble
      });
      this.pendingBubble = '';
    }

    this.refs.lanterns.forEach((l, i) => { l.rotation.z = Math.sin(elapsed * 1.9 + i) * 0.055; });
    this.refs.clouds.forEach((c, i) => { c.position.x = c.userData.baseX + Math.sin(elapsed * 0.14 + i * 2) * 2.2; });
    // 五營旗布面自然微風輕揚
    (this.refs.fiveCampFlags || []).forEach((flag, i) => {
      flag.rotation.y = Math.sin(elapsed * 2.6 + i * 0.9) * 0.12;
    });
    // 金爐窗口內 3D 火焰躍動燃燒動畫！
    (this.refs.furnaceFlames || []).forEach((fl, i) => {
      const f = 0.86 + Math.sin(elapsed * 11.5 + i * 2.1) * 0.22 + Math.cos(elapsed * 17.0 + i) * 0.10;
      fl.scale.set(0.92 + Math.sin(elapsed * 9 + i) * 0.10, f, 0.92 + Math.cos(elapsed * 8 + i) * 0.10);
      fl.rotation.z = Math.sin(elapsed * 7.5 + i * 1.6) * 0.14;
    });
    (this.refs.waterfallStreams || []).forEach((w, idx) => {
      if (w.userData.baseY !== undefined) {
        w.material.opacity = 0.65 + Math.sin(elapsed * 5.2 + w.userData.phase) * 0.22;
        w.position.y = w.userData.baseY - ((elapsed * 0.45 + idx * 0.3) % 0.25);
      } else {
        const s = 0.92 + Math.sin(elapsed * 4.5) * 0.14;
        w.scale.setScalar(s);
      }
    });

    // ★ 需求 #1：右側水池七彩錦鯉魚群自然流動優游 ＋ 灑飼料時蜂擁游來爭食動畫！
    if (this.koiFeedTimer > 0) {
      this.koiFeedTimer = Math.max(0, this.koiFeedTimer - dt);
      const feedAge = 6.5 - this.koiFeedTimer;
      for (const pel of this.feedPellets) {
        if (feedAge > pel.userData.eatAt) {
          pel.scale.multiplyScalar(Math.max(0, 1 - dt * 5));
        } else {
          pel.position.y = 0.235 + Math.sin(elapsed * 4 + pel.userData.phase) * 0.01;
        }
      }
      for (const rip of this.feedRipples) {
        rip.userData.age += dt;
        const a = ((rip.userData.age % 1.8) + 1.8) % 1.8;
        rip.scale.setScalar(1 + a * 3.8);
        rip.material.opacity = Math.max(0, (1 - a / 1.8) * 0.72);
      }
      if (this.koiFeedTimer === 0 && this.refs.pondFeedGroup) {
        while (this.refs.pondFeedGroup.children.length > 0) {
          this.refs.pondFeedGroup.remove(this.refs.pondFeedGroup.children[0]);
        }
      }
    }

    (this.refs.koiFishes || []).forEach((fish, idx) => {
      const u = fish.userData;
      if (this.koiFeedTimer > 0) {
        // 餵魚狀態：錦鯉快速朝飼料點游去並繞著飼料歡喜轉圈搶食！
        const ang = elapsed * (1.8 + (idx % 3) * 0.35) + u.phase;
        const orbitR = 0.32 + (idx % 4) * 0.16;
        const goalX = this.koiFeedTarget.x + Math.cos(ang) * orbitR;
        const goalZ = this.koiFeedTarget.z + Math.sin(ang) * orbitR;
        const dx = goalX - fish.position.x;
        const dz = goalZ - fish.position.z;
        const k = Math.min(1, dt * 2.8);
        fish.position.x += dx * k;
        fish.position.z += dz * k;
        fish.position.y = 0.195 + Math.sin(elapsed * 6 + u.phase) * 0.018;
        if (Math.hypot(dx, dz) > 0.02) {
          fish.rotation.y = Math.atan2(dx, dz);
        }
        if (u.tailPivot) {
          u.tailPivot.rotation.y = Math.sin(elapsed * 16 + u.phase * 3) * 0.56;
        }
      } else {
        const t = elapsed * u.speed * u.dir + u.phase;
        const x = u.cx + Math.cos(t) * u.rx;
        const z = u.cz + Math.sin(t) * u.rz;
        const vx = -Math.sin(t) * u.rx * u.speed * u.dir;
        const vz = Math.cos(t) * u.rz * u.speed * u.dir;
        fish.position.x += (x - fish.position.x) * Math.min(1, dt * 3.5);
        fish.position.z += (z - fish.position.z) * Math.min(1, dt * 3.5);
        fish.position.y = u.depthY + Math.sin(elapsed * 2.2 + u.phase) * 0.014;
        fish.rotation.y = Math.atan2(vx, vz);
        if (u.tailPivot) {
          u.tailPivot.rotation.y = Math.sin(elapsed * 8.5 + u.phase * 3) * 0.42;
        }
      }
    });

    this.refs.zoneRings.forEach((ring, zoneId) => {
      const isInside = this.activeZoneKey === `zone:${zoneId}`;
      const isGuided = this.guidedZoneId === zoneId;
      const pulse = isInside ? 1.12 + Math.sin(elapsed * 7) * 0.08 : isGuided ? 1 + Math.sin(elapsed * 4.5) * 0.14 : 1 + Math.sin(elapsed * 2.2) * 0.04;
      ring.scale.setScalar(pulse);
      ring.material.opacity = isInside ? 0.96 : isGuided ? 0.8 : 0.44;
      ring.material.color.set(isInside ? 0xFFE680 : ring.userData.baseColor);
    });

    this.refs.zoneBadges.forEach((badge, zoneId) => {
      const amp = this.guidedZoneId === zoneId ? 0.13 : 0.05;
      badge.position.y = badge.userData.baseY + Math.sin(elapsed * 2.5 + badge.position.x) * amp;
    });

    if (this.clickMarkerLife > 0) {
      this.clickMarkerLife = Math.max(0, this.clickMarkerLife - dt);
      const t = 1 - this.clickMarkerLife / 0.7;
      this.clickMarker.scale.setScalar(0.6 + t * 1.4);
      this.clickMarker.material.opacity = (1 - t) * 0.75;
    } else {
      this.clickMarker.material.opacity = 0;
    }

    this.offeringsManager.update(dt);
    this.particles.update(dt, elapsed);

    this.renderer.render(this.scene, this.camera);
  }
}
