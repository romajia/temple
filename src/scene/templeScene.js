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
    this.inIndoorView = false;
    this.activeCamPreset = 'front';
    this._outdoorSavedOffset = new THREE.Vector3(...TEMPLE_CONFIG.camera.followOffset);
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
    this.occlusionTimer = 0;
    this.cachedHitGroups = new Set();
    this.isMobileDevice = window.innerWidth <= 900 || 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;
    // ★ V51 手機／桌機 3D 同屏遠端香客渲染上限保護（手機 15 位、桌機 30 位；上方真人總數仍如實顯示全場人數！）
    this.maxRenderedRemotePeers = this.isMobileDevice ? 15 : 30;
    // ★ V1.1 狀態：後埕雞蛋、廟埕掉落香腳、奉茶壺與手機對話鏡頭避讓
    this.eggItems = [];
    this.stubItems = [];
    this.eggSpawnTimer = 0;
    this.dialogueShiftActive = false;
    this.holdingTeapot = false;
    window.__deciScene = this;

    if (!callbacks.deferInit) {
      this._initSync(callbacks.initialState || {});
    }
  }

  _initSync(initialState = {}) {
    this._initRenderer();
    this._initSceneAndLights();
    this.collision = new TempleCollisionSystem();
    this._initTemple(initialState);
    this.atmosphere = new DayNightAtmosphere(this.scene, this.lights, this.refs);
    this._initPlayerAvatar(initialState?.playerPresetId || 'youngMale');
    this.npcManager = new TempleNPCManager(this.scene, this.collision, {
      maxRenderedPeers: this.maxRenderedRemotePeers
    });
    this._initParticles();
    this._initGroundRipple();
    this._initCollectibles();
    this._initControlsAndEvents();
    this._seedInitialCenserIncense();

    this.animate = this.animate.bind(this);
    this.animate();
  }

  /**
   * ★ 分階段非同步初始化：每步交還瀏覽器繪製權，讓載入進度條絲滑跑動、手機絕不卡死！
   */
  async initAsync(initialState = {}, onProgress = null) {
    const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 16)));
    onProgress?.(34, '正在啟動 3D 渲染引擎與晨光照明…');
    await nextFrame();
    this._initRenderer();
    this._initSceneAndLights();
    this.collision = new TempleCollisionSystem();

    onProgress?.(54, '正在精雕紅瓦藍脊、燕尾屋頂與正殿神龕…');
    await nextFrame();
    this._initTemple(initialState);

    onProgress?.(74, '正在點亮天公爐香火、嫋嫋香煙與錦鯉池…');
    await nextFrame();
    this.atmosphere = new DayNightAtmosphere(this.scene, this.lights, this.refs);
    this._seedInitialCenserIncense();
    this._initParticles();
    this._initGroundRipple();

    onProgress?.(88, '正在迎接廟公阿財伯與同場線上香客…');
    await nextFrame();
    this._initPlayerAvatar(initialState?.playerPresetId || 'youngMale');
    this.npcManager = new TempleNPCManager(this.scene, this.collision, {
      maxRenderedPeers: this.maxRenderedRemotePeers
    });
    this._initCollectibles();
    this._initControlsAndEvents();

    onProgress?.(96, '正在渲染第一幀大廟全景…');
    await nextFrame();
    this.renderer.render(this.scene, this.camera);
    this.animate = this.animate.bind(this);
    this.animate();
  }

  /**
   * 開場於天公爐與正殿主爐預插 6 柱燃燒中清香（香火鼎盛，立即見紅點火光與嫋嫋輕煙！）
   */
  _seedInitialCenserIncense() {
    this.insertThreeIncenseSticks('tiangong');
    this.insertThreeIncenseSticks('tiangong');
    this.insertThreeIncenseSticks('main');
    this.insertThreeIncenseSticks('main');
  }

  _initRenderer() {
    const maxDpr = this.isMobileDevice ? 1.0 : 1.5;
    const attempts = [
      {
        antialias: !this.isMobileDevice,
        powerPreference: this.isMobileDevice ? 'default' : 'high-performance',
        alpha: false,
        stencil: false,
        failIfMajorPerformanceCaveat: false
      },
      {
        antialias: false,
        powerPreference: 'low-power',
        alpha: false,
        stencil: false,
        depth: true,
        failIfMajorPerformanceCaveat: false
      }
    ];

    let created = null;
    let lastErr = null;
    for (const opts of attempts) {
      try {
        created = new THREE.WebGLRenderer(opts);
        break;
      } catch (e) {
        lastErr = e;
      }
    }

    if (!created) {
      const err = new Error(lastErr?.message || 'Error creating WebGL context');
      err.code = 'WEBGL_UNAVAILABLE';
      throw err;
    }

    this.renderer = created;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    this.renderer.setSize(
      Math.max(1, this.container.clientWidth || window.innerWidth),
      Math.max(1, this.container.clientHeight || window.innerHeight)
    );
    // ★ 手機關閉即時陰影雙倍渲染（GPU 負擔立降 50% 以上、徹底告別中階機過熱與 WebGL 閃退），桌機維持柔和陰影！
    this.renderer.shadowMap.enabled = !this.isMobileDevice;
    if (!this.isMobileDevice) {
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.94;
    this.container.appendChild(this.renderer.domElement);

    // 防止手機休眠或記憶體回收造成 WebGL Context 遺失白屏
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('[DeciTemple] WebGL context lost, awaiting restore...');
      this.callbacks.onWebGLContextLost?.();
    }, false);
    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      this.callbacks.onWebGLContextRestored?.();
      this.renderer.render(this.scene, this.camera);
    }, false);
  }

  _initSceneAndLights() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#9AC0B2');
    this.scene.fog = new THREE.Fog('#A6C8BC', 64, 160);

    // 桌機啟用 PBR 溫潤環境反射；手機略過重度 PMREM 貼圖大幅加速啟動並防止 WebGL 崩潰！
    if (!this.isMobileDevice) {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      this.scene.environmentIntensity = 0.30;
      pmrem.dispose();
    }

    const w = Math.max(1, this.container.clientWidth || window.innerWidth);
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(
      TEMPLE_CONFIG.camera.fov || 35,
      w / h,
      0.3,
      220
    );

    const hemi = new THREE.HemisphereLight(0xF5EAD0, 0x6B8C6A, this.isMobileDevice ? 1.02 : 0.76);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xFFF0D4, this.isMobileDevice ? 1.38 : 1.48);
    sun.position.set(22, 36, 24);
    sun.castShadow = !this.isMobileDevice;
    if (!this.isMobileDevice) {
      sun.shadow.mapSize.set(1536, 1536);
      sun.shadow.radius = 2.6;
      sun.shadow.camera.near = 2;
      sun.shadow.camera.far = 105;
      sun.shadow.camera.left = -36;
      sun.shadow.camera.right = 36;
      sun.shadow.camera.top = 36;
      sun.shadow.camera.bottom = -36;
      sun.shadow.bias = -0.0003;
      sun.shadow.normalBias = 0.035;
    }
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xC4E0E8, 0.32);
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

    // 預先彙整各遮擋群組的去重材質集合（大幅加速每幀透明化計算並避免重複步進！）
    this.occludeGroupMaterials = new Map();
    for (const mesh of this.occludableMeshes) {
      const gid = mesh.userData?.occludeGroupId;
      if (!gid || !mesh.material) continue;
      let set = this.occludeGroupMaterials.get(gid);
      if (!set) {
        set = new Set();
        this.occludeGroupMaterials.set(gid, set);
      }
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => { if (m) set.add(m); });
    }

    // ★ 桌機套用高階非等向性過濾提升斜視銳利度；手機維持輕量（anisotropy <= 2）避免頻寬與 VRAM 暴增！
    const maxAniso = this.isMobileDevice
      ? Math.min(2, this.renderer.capabilities.getMaxAnisotropy?.() || 1)
      : Math.min(8, this.renderer.capabilities.getMaxAnisotropy?.() || 4);
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
    // ★ V1.1 手機端比例微縮 (0.86x)，讓大殿與廟埕空間更開闊舒適！
    this.player = new ChibiAvatar({ presetId, label: '', scaleMultiplier: 0.86 });
    this.player.root.position.set(0, 0.03, 19.5);
    this.player.root.rotation.y = Math.PI;
    this.prevPlayerPos.copy(this.player.root.position);
    this.scene.add(this.player.root);
  }

  _makeCollectibleSprite(label, bgColor = '#FEF3C7', borderColor = '#D97706') {
    const canvas = document.createElement('canvas');
    canvas.width = 180;
    canvas.height = 68;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(8, 8, 164, 52, 26);
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = '#5A1A0C';
    ctx.font = '900 28px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 90, 35);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      toneMapped: false
    }));
    sp.scale.set(1.38, 0.52, 1);
    sp.renderOrder = 28;
    return sp;
  }

  _initCollectibles() {
    if (!this.refs?.collectiblesGroup) return;
    // 開場於廟後埕母雞附近預先生出 2 顆新鮮發光土雞蛋（上限 3 顆，每 22 秒自動再生！）
    this._spawnEggNearHen(0);
    this._spawnEggNearHen(1);
  }

  _spawnEggNearHen(forcedIdx = null) {
    if (!this.refs?.collectiblesGroup || this.eggItems.length >= 3) return;
    const hens = this.refs.chickens || [];
    const hen = hens.length > 0 ? hens[forcedIdx !== null ? (forcedIdx % hens.length) : Math.floor(Math.random() * hens.length)] : null;
    const box = hen?.userData?.lawnBox || { minX: -12.4, maxX: -7.4, minZ: -21.8, maxZ: -19.9 };
    const rawX = hen ? hen.position.x + (Math.random() - 0.5) * 1.8 : (box.minX + box.maxX) * 0.5;
    const rawZ = hen ? hen.position.z + (Math.random() - 0.5) * 1.2 : (box.minZ + box.maxZ) * 0.5;
    // ★ V1.2 雞蛋嚴格限定於純草地範圍內（絕不生成於石板人行道上！）
    const safe = {
      x: THREE.MathUtils.clamp(rawX, box.minX + 0.35, box.maxX - 0.35),
      z: THREE.MathUtils.clamp(rawZ, box.minZ + 0.35, box.maxZ - 0.35)
    };
    // 避免與現有雞蛋重疊
    if (this.eggItems.some(e => Math.hypot(e.group.position.x - safe.x, e.group.position.z - safe.z) < 1.15)) {
      return;
    }

    const id = `egg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const group = new THREE.Group();
    group.position.set(safe.x, 0.04, safe.z);

    // 適度放大的可愛發光土雞蛋（手機端清晰好辨識）
    const eggMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0xFFF2D0,
        emissive: 0xFBBF24,
        emissiveIntensity: 0.42,
        roughness: 0.32
      })
    );
    eggMesh.scale.set(0.88, 1.24, 0.88);
    eggMesh.position.y = 0.22;
    eggMesh.castShadow = true;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.44, 24),
      new THREE.MeshBasicMaterial({ color: 0xFDE047, transparent: true, opacity: 0.82, side: THREE.DoubleSide, toneMapped: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;

    const badge = this._makeCollectibleSprite('🥚 撿雞蛋', '#FFFBEB', '#D97706');
    badge.position.y = 0.92;

    // 加大透明觸控球熱區（直徑 1.45m，手機拇指一碰就中！）
    const hitbox = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 10, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hitbox.position.y = 0.45;
    hitbox.userData = { collectibleType: 'egg', itemId: id };

    group.add(eggMesh, ring, badge, hitbox);
    this.refs.collectiblesGroup.add(group);
    this.eggItems.push({ id, group, eggMesh, ring, badge, hitbox, phase: Math.random() * Math.PI * 2 });
  }

  /**
   * ★ V1.1 廟公「撿香腳」任務：於廟前廣場生成發光掉落香腳（各玩家獨立可見與拾取！）
   */
  syncIncenseStubs(active, remainingCount = 4) {
    if (!this.refs?.collectiblesGroup) return;
    // 清除既有香腳
    this.stubItems.forEach((st) => this.refs.collectiblesGroup.remove(st.group));
    this.stubItems = [];
    if (!active || remainingCount <= 0) return;

    // ★ V1.2 掉落香腳改為掉在「廟外天公爐 (0, 15.0)」正周圍（半徑 2.1–2.8m，最寫實自然！）
    const spotPool = [
      [-2.15, 14.35],
      [2.25, 14.40],
      [-1.85, 16.85],
      [2.05, 16.80],
      [0.25, 17.45],
      [-2.55, 15.75]
    ];
    for (let i = 0; i < Math.min(remainingCount, spotPool.length); i++) {
      const [sx, sz] = spotPool[i];
      const id = `stub-${i}-${Date.now()}`;
      const group = new THREE.Group();
      group.position.set(sx, 0.04, sz);

      // 加大顯眼的紅腳香枝（方便手機一眼看清）
      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.032, 0.62, 8),
        new THREE.MeshStandardMaterial({ color: 0xDC2626, emissive: 0xEF4444, emissiveIntensity: 0.35, roughness: 0.5 })
      );
      stick.rotation.z = Math.PI / 2 - 0.14;
      stick.rotation.y = i * 1.1;
      stick.position.y = 0.09;

      const ashTip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.028, 0.24, 6),
        new THREE.MeshStandardMaterial({ color: 0xD6C7A9, roughness: 0.9 })
      );
      ashTip.rotation.z = Math.PI / 2 - 0.14;
      ashTip.rotation.y = i * 1.1;
      ashTip.position.set(Math.cos(i * 1.1) * 0.28, 0.11, -Math.sin(i * 1.1) * 0.28);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.32, 0.48, 24),
        new THREE.MeshBasicMaterial({ color: 0xFB923C, transparent: true, opacity: 0.85, side: THREE.DoubleSide, toneMapped: false })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.04;

      const badge = this._makeCollectibleSprite('🧹 撿香腳', '#FFF7ED', '#EA580C');
      badge.position.y = 0.86;

      const hitbox = new THREE.Mesh(
        new THREE.SphereGeometry(0.80, 10, 8),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      );
      hitbox.position.y = 0.42;
      hitbox.userData = { collectibleType: 'stub', itemId: id };

      group.add(stick, ashTip, ring, badge, hitbox);
      this.refs.collectiblesGroup.add(group);
      this.stubItems.push({ id, group, ring, badge, hitbox, phase: i * 1.3 });
    }
  }

  _pickupCollectible(type, itemId) {
    if (type === 'egg') {
      const idx = this.eggItems.findIndex(e => e.id === itemId);
      if (idx === -1) return;
      const item = this.eggItems[idx];
      const worldPos = item.group.position.clone().add(new THREE.Vector3(0, 0.5, 0));
      this.refs.collectiblesGroup.remove(item.group);
      this.eggItems.splice(idx, 1);
      this.particles.spawnBlessingBurst(worldPos, 18, 0xFDE047);
      this.callbacks.onCollectEgg?.();
    } else if (type === 'stub') {
      const idx = this.stubItems.findIndex(s => s.id === itemId);
      if (idx === -1) return;
      const item = this.stubItems[idx];
      const worldPos = item.group.position.clone().add(new THREE.Vector3(0, 0.5, 0));
      this.refs.collectiblesGroup.remove(item.group);
      this.stubItems.splice(idx, 1);
      this.particles.spawnBlessingBurst(worldPos, 16, 0xFB923C);
      this.callbacks.onCollectIncenseStub?.();
    }
  }

  _initParticles() {
    this.particles = new TempleParticleEffects(this.scene);
    // 手持清香輕煙
    this.particles.addSmokeEmitter(() => this.player?.getIncenseSmokeWorldPos?.() || null, 0.19, 0.72, 0.06);
    // ★ 天公爐燒香：兩股緩緩搖曳上升的嫋嫋輕煙！
    this.particles.addSmokeEmitter(() => this.refs.tiangongSmokePos, 0.22, 1.12, 0.26);
    this.particles.addSmokeEmitter(
      () => this.refs.tiangongSmokePos.clone().add(new THREE.Vector3(0.08, 0.06, -0.06)),
      0.31,
      0.92,
      0.20
    );
    // ★ 正殿主神香爐燒香：緩緩搖曳上升的莊嚴香煙！
    this.particles.addSmokeEmitter(() => this.refs.mainCenserSmokePos, 0.24, 1.05, 0.24);
    // ★ V1.2 桌下虎爺香爐與五營旗香爐（插香後即見嫋嫋輕煙！）
    this.particles.addSmokeEmitter(
      () => (this.refs.tigerIncenseGroup?.children.length > 0 ? this.refs.tigerSmokePos : null),
      0.34,
      0.62,
      0.12
    );
    this.particles.addSmokeEmitter(
      () => (this.refs.fiveCampIncenseGroup?.children.length > 0 ? this.refs.fiveCampSmokePos : null),
      0.32,
      0.72,
      0.14
    );
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

  _isObjectVisibleInHierarchy(obj) {
    let cur = obj;
    while (cur) {
      if (cur.visible === false) return false;
      cur = cur.parent;
    }
    return true;
  }

  _handleCanvasClick(event) {
    if (this.player.isLockedInAction()) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    // ★ V1.1 優先層 1：點擊後埕發光土雞蛋或廟埕掉落香腳（擴大熱區，不誤觸移動！）
    const collectibleMeshes = [
      ...this.eggItems.map(e => e.hitbox),
      ...this.stubItems.map(s => s.hitbox)
    ].filter(m => m && this._isObjectVisibleInHierarchy(m));
    if (collectibleMeshes.length > 0) {
      const cHits = this.raycaster.intersectObjects(collectibleMeshes, false);
      if (cHits.length > 0) {
        const { collectibleType, itemId } = cHits[0].object.userData || {};
        const targetGroup = cHits[0].object.parent;
        if (collectibleType && itemId && targetGroup) {
          const p = this.player.root.position;
          const dist = Math.hypot(p.x - targetGroup.position.x, p.z - targetGroup.position.z);
          if (dist <= 3.8) {
            this._pickupCollectible(collectibleType, itemId);
          } else {
            this.walkToWorldPoint(targetGroup.position.x, targetGroup.position.z, () => {
              this._pickupCollectible(collectibleType, itemId);
            });
          }
          return;
        }
      }
    }

    // ★ V1.3 優先層 1.5：點擊草坪上的放山母雞（抓雞會驚動母雞逃跑並扣除功德！）
    const chickenHitboxes = (this.refs?.chickens || [])
      .map(h => h.userData?.hitbox)
      .filter(m => m && this._isObjectVisibleInHierarchy(m));
    if (chickenHitboxes.length > 0) {
      const chHits = this.raycaster.intersectObjects(chickenHitboxes, false);
      if (chHits.length > 0) {
        const hen = chHits[0].object.parent;
        if (hen?.userData) {
          const box = hen.userData.lawnBox || { minX: -12.4, maxX: -7.4, minZ: -21.8, maxZ: -19.9 };
          hen.userData.scaredTimer = 2.0;
          hen.userData.waitTimer = 0;
          hen.userData.targetX = box.minX + 0.3 + Math.random() * Math.max(0.5, box.maxX - box.minX - 0.6);
          hen.userData.targetZ = box.minZ + 0.3 + Math.random() * Math.max(0.5, box.maxZ - box.minZ - 0.6);
          this.particles.spawnBlessingBurst(hen.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 10, 0xFCA5A5);
          this.callbacks.onCatchChicken?.();
          return;
        }
      }
    }

    // ★ V1.1 優先層 2：直接點擊在線真人玩家或任務／互動 NPC（手機拇指輕鬆點擊！）
    const actorMeshes = this.npcManager?.getClickableActorMeshes?.() || [];
    if (actorMeshes.length > 0) {
      const aHits = this.raycaster.intersectObjects(actorMeshes, false);
      if (aHits.length > 0) {
        const meta = aHits[0].object.userData || {};
        if (meta.actorType === 'peer') {
          const peerEntry = this.npcManager.getRemotePeerByUid(meta.peerUid || meta.peerId);
          if (peerEntry) {
            this.callbacks.onPeerClick?.({
              id: peerEntry.id,
              uid: peerEntry.uid,
              name: peerEntry.name,
              presetId: peerEntry.presetId
            });
            return;
          }
        } else if (meta.actorType === 'npc' && meta.npcId) {
          const npc = this.npcManager.getNpcById(meta.npcId);
          if (npc) {
            const np = npc.avatar.root.position;
            const pp = this.player.root.position;
            const dist = Math.hypot(pp.x - np.x, pp.z - np.z);
            if (dist <= 3.8) {
              this.faceNPC(meta.npcId);
              this.callbacks.onNpcClick?.(meta.npcId);
            } else {
              // ★ V36 阿財伯站於服務台後方、淑芬移至左側開闊走道 (-6.85, 6.75)，點擊淑芬直接走到其前方 (-5.65, 6.75) 絕不誤觸奉茶框！
              const targetX = meta.npcId === 'keeper'
                ? TEMPLE_CONFIG.zones.serviceDesk.standPos[0]
                : meta.npcId === 'shufen'
                  ? -5.65
                  : np.x;
              const targetZ = meta.npcId === 'keeper'
                ? TEMPLE_CONFIG.zones.serviceDesk.standPos[2]
                : meta.npcId === 'shufen'
                  ? 6.75
                  : np.z + 1.2;
              this.walkToWorldPoint(targetX, targetZ, () => {
                this.faceNPC(meta.npcId);
                this.callbacks.onNpcClick?.(meta.npcId);
              });
            }
            return;
          }
        }
      }
    }

    const objHits = this.raycaster.intersectObjects(this.interactiveObjects, true);
    for (const hit of objHits) {
      if (!this._isObjectVisibleInHierarchy(hit.object)) continue;
      let cur = hit.object;
      while (cur) {
        if (cur.userData && cur.userData.zoneId) {
          if (cur.userData.zoneId === 'exitDoor') {
            this.walkOutsideHall();
          } else if (cur.userData.zoneId === 'kneelMat') {
            this.walkToWorldPoint(hit.point.x, hit.point.z);
          } else if (cur.userData.zoneId === 'bench') {
            // ★ V38 四張象棋板凳全開放：優先鎖定「所點擊的那張板凳 (benchSide)」上離點擊點最近的空位，走過去自動入座！
            const clickPt = { x: hit.point.x, z: hit.point.z };
            const clickedSide = cur.userData.benchSide || null;
            const picked = this._findNearestEmptyChessSeat(clickPt, clickedSide);
            if (!picked) {
              this.player.showSpeechBubble('大榕樹象棋板凳都坐滿囉，旁邊樹蔭長椅還有空位喔😊', 2.6);
              return;
            }
            const [ax, az] = picked.approach || TEMPLE_CONFIG.zones.bench.standPos;
            this.walkToWorldPoint(ax, az, () => {
              const sat = this.setPlayerSitOnBench(null, { x: picked.pos[0], z: picked.pos[2] }, picked.side);
              if (sat) this.callbacks.onBenchSeated?.('大榕樹板凳聊天');
            });
          } else if (cur.userData.zoneId === 'sideBench') {
            const sb = SIDE_BENCHES.find(b => b.id === cur.userData.benchId);
            if (sb) {
              const clickPt = { x: hit.point.x, z: hit.point.z };
              this.walkToWorldPoint(sb.standPos[0], sb.standPos[2], () => {
                const sat = this.setPlayerSitOnBench(sb, clickPt);
                if (sat) this.callbacks.onBenchSeated?.(sb.name || '樹蔭板凳聊天');
              });
            }
          } else if (cur.userData.zoneId === 'offeringTable') {
            const goRight = cur.userData.offeringSide === 'right' || hit.point.x > 0;
            const ringPos = goRight
              ? (TEMPLE_CONFIG.zones.offeringTable.extraStandPositions?.[0]?.pos || [3.85, 0, -4.12])
              : TEMPLE_CONFIG.zones.offeringTable.standPos;
            this.walkToWorldPoint(ringPos[0], ringPos[2]);
          } else {
            this.walkToZone(cur.userData.zoneId);
          }
          return;
        }
        cur = cur.parent;
      }
    }

    const groundHits = this.raycaster.intersectObjects(this.walkableMeshes, true);
    for (const hit of groundHits) {
      if (!this._isObjectVisibleInHierarchy(hit.object)) continue;
      const pt = hit.point;
      // ★ 在屋內正面／左右視角點擊大門口紅毯或階梯區域，直接順暢走出正門回到廟埕！
      if (this.inIndoorView && pt.z >= 6.8 && Math.abs(pt.x) <= 4.2) {
        this.walkOutsideHall();
        return;
      }
      this.walkToWorldPoint(pt.x, pt.z);
      return;
    }
  }

  _isPlayerInsideHall() {
    if (!this.player) return false;
    const p = this.player.root.position;
    const hb = TEMPLE_CONFIG.hallBounds;
    // 加入平順遲滯區間：走到大門台階外緣 (z > 8.7) 立即切回廟外全景，避免卡門檻！
    const zMax = this.inIndoorView ? 8.70 : 8.35;
    const xPad = this.inIndoorView ? 0.35 : -0.05;
    return p.x >= hb.minX - xPad && p.x <= hb.maxX + xPad && p.z >= hb.minZ - 0.3 && p.z <= zMax;
  }

  _getIndoorTargetForPlayer(p) {
    return new THREE.Vector3(
      THREE.MathUtils.clamp(p.x * 0.42, -4.2, 4.2),
      1.85,
      THREE.MathUtils.clamp(p.z - 3.6, -8.8, 0.4)
    );
  }

  _getIndoorOffset(presetName = 'front') {
    if (presetName === 'left') return new THREE.Vector3(-9.8, 8.0, 7.6);
    if (presetName === 'right') return new THREE.Vector3(9.8, 8.0, 7.6);
    return this.isMobileDevice
      ? new THREE.Vector3(0, 10.6, 13.4)
      : new THREE.Vector3(0, 8.6, 12.2);
  }

  /**
   * ★ 核心視角與屋頂控制（需求 #2 & #3）：
   *   1. 上帝視角或進入屋內時，直接以 roofGroups.visible = false 徹底隱藏屋頂（手機／桌機 100% 不殘留！）
   *   2. 進入大殿屋內（非上帝視角）時，自動切換為「純屋內視角」：隱藏廟外景觀、外牆門面與廟外 NPC，鏡頭專注呈現殿內全景！
   */
  _syncIndoorAndRoofVisibility() {
    if (!this.refs || !this.player) return;
    const insideHall = this._isPlayerInsideHall();
    const hideRoof = this.godViewEnabled || insideHall;

    (this.refs.roofGroups || []).forEach((g) => {
      if (g) g.visible = !hideRoof;
    });

    const wantIndoor = insideHall && !this.godViewEnabled;
    if (wantIndoor !== this.inIndoorView) {
      this.inIndoorView = wantIndoor;

      if (this.refs.exteriorGroup) this.refs.exteriorGroup.visible = !wantIndoor;
      // ★ 保留大門正面牆（frontFacadeGroup 永遠保持可見，絕不讓「點此走出大門」那片牆消失！）
      if (this.refs.frontFacadeGroup) this.refs.frontFacadeGroup.visible = true;
      if (this.refs.indoorExitGroup) this.refs.indoorExitGroup.visible = wantIndoor;
      this.atmosphere?.setIndoorMode?.(wantIndoor);

      if (wantIndoor) {
        if (this.cameraMode === 'follow' && !this.godViewEnabled) {
          this._outdoorSavedOffset.copy(this.camera.position).sub(this.controls.target);
          if (this._outdoorSavedOffset.length() < 10) {
            this._outdoorSavedOffset.set(...TEMPLE_CONFIG.camera.followOffset);
          }
        }
        this.controls.minDistance = 5.5;
        this.controls.maxDistance = 18.5;
        const p = this.player.root.position;
        const indoorTarget = this._getIndoorTargetForPlayer(p);
        const indoorOffset = this._getIndoorOffset(this.activeCamPreset === 'god' ? 'front' : this.activeCamPreset);
        this.savedFollowOffset.copy(indoorOffset);
        if (this.cameraMode === 'follow') {
          this.closeupGoal = {
            pos: indoorTarget.clone().add(indoorOffset),
            target: indoorTarget,
            releaseOnDone: true
          };
        }
      } else {
        this.controls.minDistance = TEMPLE_CONFIG.camera.minDistance;
        this.controls.maxDistance = TEMPLE_CONFIG.camera.maxDistance;
        // 恢復所有 NPC 與線上玩家可見度
        this._syncNPCIndoorVisibility(false);
        if (!this.godViewEnabled && this.cameraMode === 'follow') {
          const p = this.player.root.position;
          const outTarget = new THREE.Vector3(p.x, p.y + 1.35, p.z);
          this.savedFollowOffset.copy(this._outdoorSavedOffset);
          this.closeupGoal = {
            pos: outTarget.clone().add(this._outdoorSavedOffset),
            target: outTarget,
            releaseOnDone: true
          };
        }
      }
      this.callbacks.onIndoorStateChange?.(wantIndoor);
    }

    if (this.inIndoorView) {
      this._syncNPCIndoorVisibility(true);
    }
  }

  _syncNPCIndoorVisibility(indoorOnly) {
    if (!this.npcManager) return;
    const hb = TEMPLE_CONFIG.hallBounds;
    const isIn = (pos) => pos.x >= hb.minX - 0.5 && pos.x <= hb.maxX + 0.5 && pos.z >= hb.minZ - 0.5 && pos.z <= hb.maxZ + 0.5;
    (this.npcManager.npcs || []).forEach((n) => {
      if (n.avatar?.root) {
        n.avatar.root.visible = indoorOnly ? isIn(n.avatar.root.position) : true;
      }
    });
    if (this.npcManager.remotePeers) {
      for (const entry of this.npcManager.remotePeers.values()) {
        if (entry.avatar?.root) {
          entry.avatar.root.visible = indoorOnly ? isIn(entry.avatar.root.position) : true;
        }
      }
    }
  }

  walkOutsideHall() {
    this.godViewEnabled = false;
    this.walkToWorldPoint(0, 12.2);
  }

  setDayNightMode(mode, immediate = false) { this.atmosphere.setMode(mode, immediate); }
  toggleDayNightMode() { return this.atmosphere.toggleMode(); }

  /**
   * 視角方案 B：休閒文創風「固定 4 方向一鍵切換」（正面 / 左側 / 右側 / 上帝俯瞰）
   */
  setCameraPreset(presetName = 'front') {
    const presets = TEMPLE_CONFIG.camera.presets || {};
    this.activeCamPreset = presetName;
    this.godViewEnabled = presetName === 'god';
    this._syncIndoorAndRoofVisibility();

    const p = this.player.root.position;
    this.cameraMode = 'follow';

    if (this.godViewEnabled) {
      const godOffset = this.isMobileDevice
        ? new THREE.Vector3(0, 48.0, 16.0)
        : new THREE.Vector3(...(presets.god || TEMPLE_CONFIG.camera.godViewOffset));
      const godTarget = new THREE.Vector3(0, 1.0, 1.5);
      this.savedFollowOffset.copy(godOffset);
      this.closeupGoal = {
        pos: godTarget.clone().add(godOffset),
        target: godTarget,
        releaseOnDone: true
      };
      return presetName;
    }

    if (this.inIndoorView) {
      const indoorOffset = this._getIndoorOffset(presetName);
      const indoorTarget = this._getIndoorTargetForPlayer(p);
      this.savedFollowOffset.copy(indoorOffset);
      this.closeupGoal = {
        pos: indoorTarget.clone().add(indoorOffset),
        target: indoorTarget,
        releaseOnDone: true
      };
      return presetName;
    }

    const arr = presets[presetName] || TEMPLE_CONFIG.camera.followOffset;
    const offset = new THREE.Vector3(...arr);
    this.savedFollowOffset.copy(offset);
    this._outdoorSavedOffset.copy(offset);
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

    // 產生 4 道柔焦羽化水波擴散漣漪
    const feedRipTex = this.refs.pondRipples?.[0]?.material?.map || null;
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(
        new THREE.PlaneGeometry(0.32, 0.32),
        new THREE.MeshBasicMaterial({
          map: feedRipTex || undefined,
          color: 0xE0F2FE,
          transparent: true,
          opacity: 0.75,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(tx + (Math.random() - 0.5) * 0.5, 0.238, tz + (Math.random() - 0.5) * 0.5);
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
  setPlayerName(name) {
    this.player.setName(name);
    // ★ V31 平時隱藏主角頭頂常駐名稱框，保持畫面清爽（說話時仍會顯示頭頂氣泡！）
    if (this.player.nameTagSprite) this.player.nameTagSprite.visible = false;
  }

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

  /**
   * ★ V37 確保角色自棋盤椅／樹蔭板凳起身時，100% 移出椅面與碰撞框之外至安全開闊通行點（徹底杜絕坐下後卡死！）
   */
  _stepOutOfCurrentSeat() {
    const p = this.player.root.position;
    let outX = p.x;
    let outZ = p.z;
    if (this.activeBench) {
      outX = this.activeBench.standPos[0];
      outZ = this.activeBench.standPos[2];
      this.activeBench = null;
    } else if (this.activeSeatApproach) {
      outX = this.activeSeatApproach[0];
      outZ = this.activeSeatApproach[1];
      this.activeSeatApproach = null;
    } else if (Math.abs(p.x - (-11.40)) < 2.3 && Math.abs(p.z - 15.10) < 2.6) {
      // 若在象棋桌四張板凳範圍內，依目前所在方位向外推至寬敞外圍空地
      const dx = p.x - (-11.40);
      const dz = p.z - 15.10;
      if (Math.abs(dx) > Math.abs(dz)) {
        outX = dx >= 0 ? -8.95 : -13.85;
        outZ = p.z;
      } else {
        outX = p.x;
        outZ = dz >= 0 ? 17.85 : 12.35;
      }
    } else {
      outX = TEMPLE_CONFIG.zones.bench.standPos[0];
      outZ = TEMPLE_CONFIG.zones.bench.standPos[2];
    }
    // 雙重驗證安全點絕不在碰撞體內，若被擋則回退至開闊安全站位 (-11.40, 18.05)
    if (this.collision.isBlocked(outX, outZ, 0.45)) {
      const safe = this.collision.resolveStatic(outX, outZ, 0.46);
      outX = safe.x;
      outZ = safe.z;
      if (Math.abs(outX - (-11.40)) < 1.9 && Math.abs(outZ - 15.10) < 2.1) {
        outX = TEMPLE_CONFIG.zones.bench.standPos[0];
        outZ = TEMPLE_CONFIG.zones.bench.standPos[2];
      }
    }
    p.set(outX, this._getFloorY(outX, outZ), outZ);
  }

  walkToWorldPoint(goalX, goalZ, endAction = null) {
    if (this.player.isLockedInAction() || this.movementLocked) return;
    if (this.player.state === 'sit' || this.player.state === 'kneel') {
      if (this.player.state === 'sit') {
        this._stepOutOfCurrentSeat();
      }
      this.player.setChanting(false);
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

  // ---- 儀式動畫（★ V32 所有儀式事件鏡頭全面轉向角色正面／前側面，比照化金清楚看到角色動作與表情！）----
  playIncensePickupSequence(onComplete) {
    this.setMovementLocked(true);
    const z = TEMPLE_CONFIG.zones.incense;
    const pos = this.player.root.position;
    pos.set(z.standPos[0], 0.37, z.standPos[2]);
    this.player.root.rotation.y = -Math.PI * 0.42;

    // 鏡頭轉至角色前側面，清楚看到主角正面點香與手持三柱清香！
    this.enterCloseupCamera(
      [pos.x - 1.35, pos.y + 1.95, pos.z + 2.85],
      [pos.x - 0.30, pos.y + 1.15, pos.z]
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
   * ★ 修正後的天公爐禮儀：站在靠廟那側 (z = 12.85) 面向外 (+Z) 三拜，鏡頭自前側清楚呈現主角正面三拜與插香！
   */
  playTianGongRitual(onComplete) {
    this.setMovementLocked(true);
    const pos = this.player.root.position;
    pos.set(0, 0.03, 12.85);
    this.player.root.rotation.y = 0; // 正面朝向廟外天際與眼前的天公爐 (+Z)
    this.player.showSpeechBubble('靠廟面向天際，誠心三拜玉皇大帝🙏', 2.4);
    this.enterCloseupCamera([3.2, 3.0, 17.9], [0, 1.25, 13.7]);

    this.player.playThreeBows(() => {
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
   * ★ V36 拜主神：明確收起木魚、手持三柱清香下跪三拜主神（只有 36 拜墊念經才持木魚！），長跪墊支援 3 人並肩下跪！
   */
  playMainDeityRitual(onComplete) {
    this.setMovementLocked(true);
    this.player.setChanting(false);
    this.player.setHoldingTeapot(false);
    this.player.setHoldingIncense(true);
    const pos = this.player.root.position;
    const slots = TEMPLE_CONFIG.zones.mainWorship.kneelSlots || [
      [-0.80, 0.455, -5.08],
      [0, 0.455, -5.08],
      [0.80, 0.455, -5.08]
    ];
    const occupiedActors = this.npcManager.getAllSeatedAndActiveActors();
    // 優先選中央，若中央或該格已有其他香客下跪則自動選旁邊空位（最多同時 3 人並肩下跪！）
    const order = [slots[1] || slots[0], slots[0], slots[2]].filter(Boolean);
    let pickedSlot = order[0];
    for (const sl of order) {
      const taken = occupiedActors.some(a => Math.hypot(a.x - sl[0], a.z - sl[2]) < 0.62);
      if (!taken) {
        pickedSlot = sl;
        break;
      }
    }
    const [sx, sy, sz] = pickedSlot;
    pos.set(sx, sy, sz);
    this.player.root.rotation.y = Math.PI; // 面向正殿神龕
    this.player.showSpeechBubble('跪於主神長跪墊上，虔誠三拜主神🙏', 2.4);
    // 鏡頭置於主角前側面（-Z 前方往回看角色正面！），清楚看見角色正面下跪拜拜！
    this.enterCloseupCamera([sx + 2.35, 2.05, sz - 2.55], [sx, 1.05, sz]);

    this.player.playKneelThreeBows(() => {
      // 起身踏回大殿地板向前插香
      pos.set(sx * 0.6, 0.37, -6.15);
      this.player.setState('idle');
      this.player.showSpeechBubble('起身向前插上三柱清香✨', 1.6);
      this.enterCloseupCamera([sx * 0.6 + 2.25, 2.25, -7.75], [sx * 0.6, 1.32, -6.45]);

      this.player.playInsertIncense(() => {
        this.insertThreeIncenseSticks('main');
        this.player.setHoldingIncense(false);
        this.particles.spawnBlessingBurst(this.refs.mainCenserSmokePos, 30, 0xFFE066);
        // 儀式圓滿後退回跪墊正前方可步行走道 (z = -4.15)，絕不踩在跪墊上！
        pos.set(sx, 0.37, -4.15);

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
    let group = this.refs.mainIncenseGroup;
    let isMini = false;
    if (censerType === 'tiangong') group = this.refs.tiangongIncenseGroup;
    else if (censerType === 'tiger') { group = this.refs.tigerIncenseGroup; isMini = true; }
    else if (censerType === 'fiveCamps') { group = this.refs.fiveCampIncenseGroup; isMini = true; }
    if (!group) return;

    while (group.children.length > 18) group.remove(group.children[0]);
    const baseAngle = Math.random() * Math.PI * 2;
    const baseR = Math.random() * (isMini ? 0.045 : 0.18);
    const cx = Math.cos(baseAngle) * baseR;
    const cz = Math.sin(baseAngle) * baseR;
    const stickH = isMini ? 0.28 : 0.50;
    const stickR = isMini ? 0.010 : 0.015;
    const spread = isMini ? 0.025 : 0.045;

    [-spread, 0, spread].forEach((offset) => {
      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(stickR, stickR, stickH, 6),
        new THREE.MeshStandardMaterial({ color: 0xB88746 })
      );
      const ember = new THREE.Mesh(
        new THREE.SphereGeometry(isMini ? 0.018 : 0.026, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xFF6A1A, toneMapped: false })
      );
      ember.position.y = stickH * 0.5;
      stick.add(ember);
      stick.position.set(cx + offset, stickH * 0.36, cz);
      group.add(stick);
    });
  }

  _findNearestEmptyChessSeat(targetPt = null, preferredSide = null) {
    const occupiedActors = this.npcManager.getAllSeatedAndActiveActors();
    const mainSeats = TEMPLE_CONFIG.zones.bench.seats || [{ pos: TEMPLE_CONFIG.zones.bench.sitPos, yaw: 0 }];
    const refX = targetPt ? targetPt.x : this.player.root.position.x;
    const refZ = targetPt ? targetPt.z : this.player.root.position.z;
    const freeSeats = mainSeats.filter(
      (s) => !occupiedActors.some(a => Math.hypot(a.x - s.pos[0], a.z - s.pos[2]) < 0.62)
    );
    if (!freeSeats.length) return null;
    // 若明確指定點擊了某張板凳（北／南／西／東），優先選擇該張板凳上離點擊點最近的空位！
    const sidePool = preferredSide ? freeSeats.filter(s => s.side === preferredSide) : [];
    const pool = sidePool.length ? sidePool : freeSeats;
    pool.sort((a, b) => Math.hypot(a.pos[0] - refX, a.pos[2] - refZ) - Math.hypot(b.pos[0] - refX, b.pos[2] - refZ));
    return pool[0];
  }

  setPlayerSitOnBench(benchData = null, preferredPoint = null, preferredSide = null) {
    this.activeBench = benchData;
    this.activeSeatApproach = null;
    this.autoPath = [];
    this.player.setChanting(false);
    // ★ V38 支援點擊指定板凳／空位優先入座該張板凳最近空位，且避開所有已入座 NPC 與線上玩家！
    const occupiedActors = this.npcManager.getAllSeatedAndActiveActors();
    const refX = preferredPoint ? preferredPoint.x : this.player.root.position.x;
    const refZ = preferredPoint ? preferredPoint.z : this.player.root.position.z;

    if (benchData) {
      const rawSeats = benchData.seats || [benchData.sitPos];
      const seats = rawSeats.map(s => Array.isArray(s) ? { pos: s, yaw: benchData.faceYaw } : s);
      const free = seats.filter(s => !occupiedActors.some(a => Math.hypot(a.x - s.pos[0], a.z - s.pos[2]) < 0.62));
      if (!free.length) {
        this.player.showSpeechBubble('這張椅子坐滿囉，去旁邊的板凳坐吧😊', 2.4);
        return false;
      }
      free.sort((a, b) => Math.hypot(a.pos[0] - refX, a.pos[2] - refZ) - Math.hypot(b.pos[0] - refX, b.pos[2] - refZ));
      const chosen = free[0];
      this.player.root.position.set(chosen.pos[0], 0.03, chosen.pos[2]);
      this.player.root.rotation.y = chosen.yaw;
      this.player.setState('sit');
      const camDx = Math.sin(chosen.yaw) * 6.5;
      const camDz = Math.cos(chosen.yaw) * 6.5;
      this.enterCloseupCamera(
        [chosen.pos[0] + camDx + 1.4, 4.6, chosen.pos[2] + camDz + 1.4],
        [chosen.pos[0], 1.1, chosen.pos[2]]
      );
      return true;
    }

    // ★ V38 廟前大榕樹象棋四張板凳：優先坐上所點擊／靠近的那張板凳最近空位！
    const chosenMain = this._findNearestEmptyChessSeat(preferredPoint, preferredSide);
    if (!chosenMain) {
      this.player.showSpeechBubble('大榕樹板凳坐滿囉，廟旁樹下還有雙人長椅喔😊', 2.6);
      return false;
    }
    this.activeSeatApproach = chosenMain.approach || null;
    this.player.root.position.set(chosenMain.pos[0], 0.03, chosenMain.pos[2]);
    this.player.root.rotation.y = chosenMain.yaw;
    this.player.setState('sit');
    const camX = -11.40 + (chosenMain.pos[0] - (-11.40)) * 0.55 + 1.2;
    const camZ = 15.10 + (chosenMain.pos[2] - 15.10) * 1.4 + 4.8;
    this.enterCloseupCamera([camX, 4.8, camZ], [-11.40, 1.05, 15.10]);
    return true;
  }

  setPlayerKneelOnMat(mat = null) {
    const targetMat = mat || this.activeKneelMat || KNEEL_MATS_36[0];
    this.activeKneelMat = targetMat;
    this.autoPath = [];
    this.player.root.position.set(targetMat.x, 0.37, targetMat.z);
    this.player.root.rotation.y = Math.PI;
    this.player.setState('kneel');
    // ★ V34 拜墊念經時左手端捧木魚、右手執槌敲打！
    this.player.setChanting(true);
    // ★ V32 轉至前側面視角，清楚看見角色虔誠跪坐敲木魚念經的正面模樣！
    const sideSign = targetMat.x >= 0 ? -1 : 1;
    this.enterCloseupCamera([targetMat.x + sideSign * 2.15, 2.15, targetMat.z - 2.65], [targetMat.x, 0.95, targetMat.z]);
  }

  playPlayerWoodenFishTap() {
    if (!this.player) return;
    this.player.triggerWoodenFishTap();
    const pos = this.player.getWoodenFishWorldPos();
    this.particles?.spawnBlessingBurst(pos, 10, 0xFDE047);
  }

  standUpPlayer() {
    const p = this.player.root.position;
    if (this.player.state === 'sit') {
      this._stepOutOfCurrentSeat();
    }
    this.player.setChanting(false);
    this.player.setState('idle');
    this.cameraMode = 'follow';
    this.closeupGoal = {
      pos: new THREE.Vector3(p.x, p.y + 1.35, p.z).add(this.savedFollowOffset),
      target: new THREE.Vector3(p.x, p.y + 1.35, p.z),
      releaseOnDone: true
    };
  }

  faceNPC(npcId) { this.npcManager.facePlayer(npcId, this.player.root.position); }
  syncRemotePeers(list) { this.npcManager.syncRemotePeers(list, this.player?.root?.position || null); }
  getRemotePeerRenderStats() {
    return this.npcManager?.getRemotePeerRenderStats?.() || {
      rendered: 0,
      totalRemote: 0,
      cap: this.maxRenderedRemotePeers,
      capped: false
    };
  }
  updateNpcQuestMarkers(states) { this.npcManager?.updateQuestMarkers?.(states); }

  // ★ V1.1 奉茶拿壺／神桌倒清茶三杯儀式
  setPlayerHoldingTeapot(hasPot) {
    this.holdingTeapot = Boolean(hasPot);
    this.player?.setHoldingTeapot(this.holdingTeapot);
    if (this.refs?.stationTeapot) {
      this.refs.stationTeapot.visible = !this.holdingTeapot;
    }
  }

  playPourTeaSequence(onComplete) {
    this._teaPourInProgress = true;
    this.setMovementLocked(true);
    const pos = this.player.root.position;
    // ★ V32 角色站於左側清爽空地 (x = -1.32, z = -7.28，與桌下虎爺神龕保持充裕間距絕不穿模！)，鏡頭從前側框進角色正面、傾斜白鐵水壺與金色茶水柱！
    const stayX = pos.x < -0.5 ? THREE.MathUtils.clamp(pos.x, -1.55, -1.22) : -1.32;
    const stayZ = THREE.MathUtils.clamp(pos.z, -7.35, -7.05);
    pos.set(stayX, 0.37, stayZ);
    this.player.root.rotation.y = Math.atan2(0 - pos.x, -8.36 - pos.z);
    this.setPlayerHoldingTeapot(true);
    if (this.player.teapotGroup) this.player.teapotGroup.visible = false;
    this.player.showSpeechBubble('誠心為神明添滿清茶三杯 🍵✨', 3.2);
    this.enterCloseupCamera([1.65, 2.24, -6.95], [-0.45, 1.50, -8.02]);

    // 建立精緻可視化「台灣白鐵大水壺（含彎曲壺嘴與黑電木提把）」於三杯上方緩緩傾斜倒茶！
    const pouringKettle = new THREE.Group();
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xE6EEF5, metalness: 0.78, roughness: 0.18 });
    const steelLidMat = new THREE.MeshStandardMaterial({ color: 0xF5F8FC, metalness: 0.82, roughness: 0.14 });
    const bakeliteMat = new THREE.MeshStandardMaterial({ color: 0x1F2428, roughness: 0.45 });
    const kBody = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.145, 0.19, 18), steelMat);
    const kShoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.115, 0.045, 18), steelMat);
    kShoulder.position.y = 0.115;
    const kLid = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.086, 0.024, 16), steelLidMat);
    kLid.position.y = 0.146;
    const kKnob = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), bakeliteMat);
    kKnob.position.y = 0.172;
    const kBand = new THREE.Mesh(new THREE.TorusGeometry(0.128, 0.008, 6, 20), steelLidMat);
    kBand.rotation.x = Math.PI / 2;
    kBand.position.y = 0.04;
    // 朝向 +X（右方三杯方向）彎曲白鐵壺嘴
    const spCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.11, -0.02, 0),
      new THREE.Vector3(0.19, 0.03, 0),
      new THREE.Vector3(0.24, 0.11, 0)
    ]);
    const kSpout = new THREE.Mesh(new THREE.TubeGeometry(spCurve, 12, 0.017, 8, false), steelMat);
    // 上方黑電木提把
    const kBail = new THREE.Mesh(new THREE.TorusGeometry(0.132, 0.013, 6, 16, Math.PI), bakeliteMat);
    kBail.position.y = 0.12;
    pouringKettle.add(kBody, kShoulder, kLid, kKnob, kBand, kSpout, kBail);
    pouringKettle.scale.setScalar(1.25);
    pouringKettle.position.set(-0.74, 1.94, -8.36);
    pouringKettle.rotation.y = -0.22; // 微轉壺身讓彎曲壺嘴與金色茶水柱在正面鏡頭下完全清楚展開！
    pouringKettle.rotation.z = -0.58;
    this.scene.add(pouringKettle);

    // 建立可視化「金黃熱茶水流」精準由壺嘴直落注入第 1 → 第 2 → 第 3 杯清茶！
    const streamMat = new THREE.MeshBasicMaterial({
      color: 0xF5B942,
      transparent: true,
      opacity: 0.90,
      toneMapped: false
    });
    const teaStream = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.022, 0.34, 8), streamMat);
    teaStream.visible = false;
    this.scene.add(teaStream);

    const cupWorldX = [-0.42, 0, 0.42];
    const cupZ = -8.36;
    const liqs = this.refs.teaLiquids || [];
    liqs.forEach(l => {
      l.visible = false;
      l.position.y = 0.068;
    });

    this.player.playPourTea();
    const pourDurationMs = 3200;
    const startedAt = performance.now();

    const stepPour = () => {
      const elapsedMs = performance.now() - startedAt;
      const t = Math.min(1, elapsedMs / pourDurationMs);
      const cupIdx = Math.min(2, Math.floor(t * 3));
      const cupFrac = (t * 3) - cupIdx;
      const cx = cupWorldX[cupIdx];

      // 白鐵水壺平滑滑移至當前茶杯左側上方並傾斜注茶（壺嘴精準銜接茶水柱！）
      const targetKX = cx - 0.32;
      pouringKettle.position.x += (targetKX - pouringKettle.position.x) * 0.24;
      pouringKettle.position.y = 1.92 + Math.sin(cupFrac * Math.PI) * 0.03;
      pouringKettle.rotation.z = -0.46 - Math.sin(cupFrac * Math.PI) * 0.22;

      teaStream.visible = t > 0.06 && t < 0.96;
      teaStream.position.set(cx - 0.02, 1.71, cupZ);
      teaStream.rotation.z = -0.14;
      for (let prev = 0; prev < cupIdx; prev++) {
        if (liqs[prev]) {
          liqs[prev].visible = true;
          liqs[prev].position.y = 0.178;
        }
      }
      if (liqs[cupIdx]) {
        liqs[cupIdx].visible = true;
        liqs[cupIdx].position.y = 0.068 + 0.110 * Math.min(1, cupFrac);
      }
      if (Math.random() < 0.35) {
        this.particles.spawnBlessingBurst(new THREE.Vector3(cx, 1.58, cupZ), 3, 0xFDE68A);
      }

      if (t < 1) {
        requestAnimationFrame(stepPour);
      } else {
        this.scene.remove(teaStream);
        teaStream.geometry.dispose();
        streamMat.dispose();
        this.scene.remove(pouringKettle);
        pouringKettle.traverse((ch) => {
          if (ch.isMesh) ch.geometry?.dispose();
        });
        steelMat.dispose();
        steelLidMat.dispose();
        bakeliteMat.dispose();
        liqs.forEach(l => {
          l.visible = true;
          l.position.y = 0.178;
        });
        this.particles.spawnBlessingBurst(this.refs.teaCupsWorldPos, 24, 0xFDE68A);
        this.setPlayerHoldingTeapot(false);
        this.cameraMode = 'follow';
        this.closeupGoal = {
          pos: new THREE.Vector3(pos.x, pos.y + 1.35, pos.z).add(this.savedFollowOffset),
          target: new THREE.Vector3(pos.x, pos.y + 1.35, pos.z),
          releaseOnDone: true
        };
        this.setMovementLocked(false);
        this._teaPourInProgress = false;
        onComplete?.();
      }
    };
    requestAnimationFrame(stepPour);
  }

  // ★ V34 同步主神桌「清茶三杯」10 分鐘自動消失狀態（過期自動撤去杯中茶水！）
  syncTeaOffer(teaState = null) {
    if (this._teaPourInProgress) return;
    const hasTea = Boolean(teaState && Number(teaState.pouredAt) > 0);
    (this.refs?.teaLiquids || []).forEach((l) => {
      l.visible = hasTea;
      l.position.y = hasTea ? 0.178 : 0.068;
    });
  }

  // ★ V33 桌下虎爺（黑虎將軍）無遮擋正面特寫鏡頭：全程鎖定神桌與虎爺不透明，絕不因站位或視線射線變透明！
  focusTigerDeityCloseup(active) {
    this.tigerFocusActive = Boolean(active);
    if (this.refs?.offeringTableGroup) {
      this.refs.offeringTableGroup.visible = !active;
    }
    if (this.offeringsManager?.group) {
      this.offeringsManager.group.visible = !active;
    }
    if (active) {
      // 鏡頭置於神桌正前方無遮擋處，焦點略低讓精雕黑虎將軍、三顆雞蛋與虎爺香爐完整呈現在畫面中上半部！
      this.enterCloseupCamera([0, 1.06, -5.85], [0, 0.56, -8.10]);
    } else {
      const pos = this.player.root.position;
      this.cameraMode = 'follow';
      const target = this.inIndoorView
        ? this._getIndoorTargetForPlayer(pos)
        : new THREE.Vector3(pos.x, pos.y + 1.35, pos.z);
      this.closeupGoal = {
        pos: target.clone().add(this.savedFollowOffset),
        target,
        releaseOnDone: true
      };
    }
  }

  syncTigerEggs(eggList = []) {
    const count = Array.isArray(eggList) ? eggList.length : 0;
    (this.refs?.tigerEggMeshes || []).forEach((mesh, idx) => {
      mesh.visible = idx < count;
    });
  }

  // ★ V36 拜虎爺純插香 與 純獻蛋完全分開（獻蛋不再自動插香！）
  playTigerWorshipWithIncense(withEgg = false) {
    this.insertThreeIncenseSticks('tiger');
    this.particles.spawnBlessingBurst(this.refs.tigerSmokePos, 24, 0xFFD966);
    if (withEgg) {
      this.particles.spawnBlessingBurst(new THREE.Vector3(0.56, 0.64, -7.64), 24, 0xFDE047);
      this.player?.showSpeechBubble('誠心拜虎爺、插香並獻上新鮮土雞蛋 🐯🥚', 2.8);
    } else {
      this.player?.showSpeechBubble('誠心向黑虎將軍上香祈福 🐯🙏', 2.6);
    }
  }

  playTigerEggOfferOnly() {
    this.particles.spawnBlessingBurst(new THREE.Vector3(0.56, 0.64, -7.64), 26, 0xFDE047);
    this.player?.showSpeechBubble('誠心向黑虎將軍獻上新鮮土雞蛋 🐯🥚', 2.8);
  }

  // ★ V32 參拜五營旗：鏡頭轉至角色前側面，清楚呈現主角正面三拜五營將軍並插香！
  playFiveCampsRitual(onComplete) {
    this.setMovementLocked(true);
    const pos = this.player.root.position;
    pos.set(-4.15, 0.37, -7.2);
    this.player.root.rotation.y = Math.PI;
    this.player.setHoldingIncense(true);
    this.player.showSpeechBubble('誠心參拜五營將軍，護境安民 🚩🙏', 2.4);
    this.enterCloseupCamera([-2.15, 2.25, -8.02], [-4.15, 1.28, -7.45]);

    this.player.playThreeBows(() => {
      this.player.playInsertIncense(() => {
        this.insertThreeIncenseSticks('fiveCamps');
        this.player.setHoldingIncense(false);
        this.particles.spawnBlessingBurst(this.refs.fiveCampSmokePos, 26, 0x86EFAC);
        this.cameraMode = 'follow';
        this.closeupGoal = {
          pos: new THREE.Vector3(pos.x, pos.y + 1.35, pos.z).add(this.savedFollowOffset),
          target: new THREE.Vector3(pos.x, pos.y + 1.35, pos.z),
          releaseOnDone: true
        };
        this.setMovementLocked(false);
        onComplete?.();
      });
    });
  }

  // ★ V1.1 手機端開啟 NPC 對話框時微幅調整鏡頭焦點，確保人物位於螢幕中上方可視區絕不被遮擋！
  setDialogueCameraShift(active) {
    this.dialogueShiftActive = Boolean(active);
  }

  // ★ V1.1 玩家＆遠端玩家結緣動作回饋（揮手／作揖／握手）
  playPlayerEmote(action = 'wave', bubbleText = '') {
    if (!this.player) return;
    this.player.playEmote(action);
    if (bubbleText) this.player.showSpeechBubble(bubbleText, 3.4);
    const p = this.player.root.position;
    this.particles.spawnBlessingBurst(new THREE.Vector3(p.x, p.y + 1.5, p.z), 16, 0xFDE047);
  }

  playRemotePeerEmote(uidOrId, action = 'wave', bubbleText = '') {
    const entry = this.npcManager?.getRemotePeerByUid?.(uidOrId);
    if (!entry) return;
    entry.avatar.playEmote(action);
    if (bubbleText) entry.avatar.showSpeechBubble(bubbleText, 3.6);
    const p = entry.avatar.root.position;
    this.particles.spawnBlessingBurst(new THREE.Vector3(p.x, p.y + 1.5, p.z), 16, 0xFDE047);
  }

  walkToBackyard() {
    this.godViewEnabled = false;
    // 走到後院左側步道邊，一眼就能看見草坪上的放山母雞與發光土雞蛋！
    this.walkToWorldPoint(-9.2, -18.5);
  }

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

    // 節流射線偵測至約 15Hz（大幅降低 75% CPU 負載，同時保留 60fps 絲滑透明度漸變！）
    this.occlusionTimer -= dt;
    if (this.occlusionTimer <= 0) {
      this.occlusionTimer = 0.065;
      const p = this.player.root.position;
      const camPos = this.camera.position;
      const hitGroups = new Set();

      const hb = TEMPLE_CONFIG.hallBounds;
      const insideHall = p.x >= hb.minX - 0.4 && p.x <= hb.maxX + 0.4 && p.z >= hb.minZ - 0.4 && p.z <= hb.maxZ + 0.8;
      if (insideHall || this.godViewEnabled) {
        hitGroups.add('roof-front');
        hitGroups.add('roof-main');
      }

      const samples = this.isMobileDevice
        ? [[0, 0.95, 0], [0, 1.55, 0], [0, 0.45, 0]]
        : [[0, 0.55, 0], [0, 1.15, 0], [0, 1.72, 0], [-0.45, 1.15, 0], [0.45, 1.15, 0]];
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
      // ★ V33 站於拜黑虎爺位置或虎爺特寫中時，神桌與虎爺神龕永不透明化！
      if (this.tigerFocusActive || this.activeZoneKey === 'zone:tigerDeity') {
        hitGroups.delete('shrine-table');
      }
      this.cachedHitGroups = hitGroups;
    }

    const hitGroups = this.cachedHitGroups;
    const speed = Math.min(1, dt * 9);
    if (!this.occludeGroupMaterials) return;
    for (const [gid, matSet] of this.occludeGroupMaterials.entries()) {
      const isRoof = gid === 'roof-front' || gid === 'roof-main';
      const isFrontDoorWall = gid === 'facade-front';
      const fadeLevel = isRoof ? 0.13 : (isFrontDoorWall && this.inIndoorView ? 0.34 : 0.18);
      const isHit = hitGroups.has(gid) || (isFrontDoorWall && this.inIndoorView && this.camera.position.z > 8.1);
      for (const mat of matSet) {
        const baseOp = mat.userData?.baseOpacity ?? 1.0;
        const baseTransparent = Boolean(mat.userData?.baseTransparent);
        const targetOp = isHit ? Math.min(fadeLevel, baseOp) : baseOp;
        const curOp = mat.opacity;
        const diff = targetOp - curOp;
        if (Math.abs(diff) > 0.012) {
          mat.opacity = curOp + diff * speed;
        } else if (curOp !== targetOp) {
          mat.opacity = targetOp;
        }
        // ★ 未遮擋時自動切回不透明（transparent = false）以恢復 GPU Early-Z 深度剔除；遮擋時無縫切為半透明！
        const needTransparent = baseTransparent || mat.opacity < 0.985;
        if (mat.transparent !== needTransparent) {
          mat.transparent = needTransparent;
          mat.needsUpdate = true;
        }
        mat.depthWrite = !needTransparent || mat.opacity > 0.85;
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

    // 1. 偵測各大設施光圈（支援左右供桌雙光圈自動判定左／右桌，以及攤位周圍穩定觸發！）
    for (const z of Object.values(TEMPLE_CONFIG.zones)) {
      const standCandidates = [
        { pos: z.standPos, side: z.id === 'offeringTable' ? 'left' : null },
        ...(z.extraStandPositions || [])
      ];
      let dStand = Infinity;
      let matchedSide = null;
      for (const cand of standCandidates) {
        const d = Math.hypot(pos.x - cand.pos[0], pos.z - cand.pos[2]);
        if (d < dStand) {
          dStand = d;
          matchedSide = cand.side || null;
        }
      }
      const dCenter = Math.hypot(pos.x - z.position[0], pos.z - z.position[2]);
      const effectiveDist = (z.id === 'quizBooth' || z.id === 'offeringShop')
        ? Math.min(dStand, Math.max(0, dCenter - 0.85))
        : dStand;
      if (effectiveDist <= z.triggerRadius && effectiveDist < bestDist) {
        bestDist = effectiveDist;
        const sideLabel = z.id === 'offeringTable'
          ? (matchedSide === 'right' ? '右供桌' : '左供桌')
          : z.id === 'bench'
            ? ({ north: '北側', south: '南側', west: '西側', east: '東側' }[matchedSide || 'south'] || '')
            : null;
        found = {
          type: 'zone',
          id: z.id,
          offeringSide: z.id === 'offeringTable' ? matchedSide : null,
          benchSide: z.id === 'bench' ? (matchedSide || 'south') : null,
          title: z.name,
          icon: z.icon,
          actionText: z.id === 'offeringTable'
            ? `進入【${sideLabel}擺放供品】`
            : z.id === 'bench'
              ? `坐上【象棋板凳（${sideLabel}）】`
              : `進入【${z.shortLabel}】`
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

    const nextKey = found ? `${found.type}:${found.id}:${found.benchSide || found.offeringSide || ''}` : '';
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

      const desiredTarget = this.inIndoorView
        ? this._getIndoorTargetForPlayer(pos)
        : new THREE.Vector3(pos.x, pos.y + 1.35, pos.z);
      // ★ V1.1 手機端對話框展開時，目標點略微下移使主角與對話 NPC 完整上移至畫面中上方不被遮擋！
      if (this.dialogueShiftActive && this.isMobileDevice) {
        desiredTarget.y -= 0.72;
      }
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
    // ★ V51 分頁隱藏／手機鎖屏時暫停 3D 重繪與輪詢，大幅節省手機電量與防止過熱！
    if (typeof document !== 'undefined' && document.hidden) {
      this.clock.getDelta();
      return;
    }
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    this._updatePlayerMovement(dt);
    this._syncIndoorAndRoofVisibility();
    this._updateProximityCheck();
    this._updateCamera(dt);
    this._updateWallOcclusion(dt);
    this.atmosphere.update(dt, elapsed);

    this.player.update(dt, elapsed);
    const totalRealOnline = 1 + Math.max(this.npcManager.remotePeers.size, this.npcManager.totalOnlineRemotePeers || 0);
    this.npcManager.update(dt, elapsed, this.player.root.position, totalRealOnline);

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
        holdingTeapot: this.holdingTeapot,
        bubble: this.pendingBubble
      });
      this.pendingBubble = '';
    }

    // ★ V1.2 後埕放山母雞嚴格限定在草坪區塊內散步啄食（絕不踏上石板人行道！）
    (this.refs.chickens || []).forEach((hen) => {
      const u = hen.userData;
      const box = u.lawnBox || { minX: -12.4, maxX: -7.4, minZ: -21.8, maxZ: -19.9 };
      if (u.scaredTimer > 0) u.scaredTimer = Math.max(0, u.scaredTimer - dt);
      const isScared = u.scaredTimer > 0;
      const dx = u.targetX - hen.position.x;
      const dz = u.targetZ - hen.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.14) {
        const step = Math.min(dist, (isScared ? 2.6 : 0.85) * dt);
        hen.position.x = THREE.MathUtils.clamp(hen.position.x + (dx / dist) * step, box.minX, box.maxX);
        hen.position.z = THREE.MathUtils.clamp(hen.position.z + (dz / dist) * step, box.minZ, box.maxZ);
        hen.position.y = 0.04 + Math.abs(Math.sin(elapsed * (isScared ? 20.0 : 9.5) + u.phase)) * (isScared ? 0.16 : 0.04);
        const yaw = Math.atan2(dx, dz);
        let diff = yaw - hen.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        hen.rotation.y += diff * Math.min(1, dt * 6);
        hen.rotation.x = 0;
      } else {
        hen.position.y = 0.04;
        hen.rotation.x = Math.max(0, Math.sin(elapsed * 5.2 + u.phase)) * 0.28;
        u.waitTimer -= dt;
        if (u.waitTimer <= 0) {
          u.waitTimer = 2.2 + Math.random() * 3.0;
          u.targetX = box.minX + 0.3 + Math.random() * Math.max(0.5, box.maxX - box.minX - 0.6);
          u.targetZ = box.minZ + 0.3 + Math.random() * Math.max(0.5, box.maxZ - box.minZ - 0.6);
        }
      }
    });

    this.eggSpawnTimer += dt;
    if (this.eggSpawnTimer >= 22) {
      this.eggSpawnTimer = 0;
      if (this.eggItems.length < 3) {
        this._spawnEggNearHen();
      }
    }

    const pPos = this.player.root.position;
    this.eggItems.forEach((e) => {
      e.eggMesh.position.y = 0.22 + Math.sin(elapsed * 3.8 + e.phase) * 0.045;
      e.ring.scale.setScalar(1 + Math.sin(elapsed * 4.5 + e.phase) * 0.14);
      e.badge.position.y = 0.92 + Math.sin(elapsed * 3.2 + e.phase) * 0.08;
      // ★ V31 走近後埕才顯示撿雞蛋標籤，避免隔牆穿過廟門懸浮！
      e.badge.visible = Math.hypot(pPos.x - e.group.position.x, pPos.z - e.group.position.z) <= 7.5;
    });
    this.stubItems.forEach((s) => {
      s.ring.scale.setScalar(1 + Math.sin(elapsed * 4.8 + s.phase) * 0.15);
      s.badge.position.y = 0.86 + Math.sin(elapsed * 3.4 + s.phase) * 0.08;
      s.badge.visible = Math.hypot(pPos.x - s.group.position.x, pPos.z - s.group.position.z) <= 7.5;
    });

    this.refs.lanterns.forEach((l, i) => { l.rotation.z = Math.sin(elapsed * 1.9 + i) * 0.055; });
    this.refs.clouds.forEach((c, i) => { c.position.x = c.userData.baseX + Math.sin(elapsed * 0.14 + i * 2) * 2.2; });
    // 五營旗布面自然微風輕揚
    (this.refs.fiveCampFlags || []).forEach((flag, i) => {
      flag.rotation.y = Math.sin(elapsed * 2.6 + i * 0.9) * 0.12;
    });
    // 金爐窗口與點香器缺口內 3D 火焰躍動燃燒動畫！
    (this.refs.furnaceFlames || []).forEach((fl, i) => {
      const f = 0.86 + Math.sin(elapsed * 11.5 + i * 2.1) * 0.22 + Math.cos(elapsed * 17.0 + i) * 0.10;
      fl.scale.set(0.92 + Math.sin(elapsed * 9 + i) * 0.10, f, 0.92 + Math.cos(elapsed * 8 + i) * 0.10);
      fl.rotation.z = Math.sin(elapsed * 7.5 + i * 1.6) * 0.14;
    });
    (this.refs.igniterFlames || []).forEach((fl, i) => {
      const phase = fl.userData?.phase ?? i * 1.7;
      const f = 0.84 + Math.sin(elapsed * 13.0 + phase) * 0.24 + Math.cos(elapsed * 19.5 + phase) * 0.12;
      fl.scale.set(0.92 + Math.sin(elapsed * 10 + phase) * 0.12, f, 0.92 + Math.cos(elapsed * 9.5 + phase) * 0.12);
      fl.rotation.z = Math.sin(elapsed * 8.5 + phase) * 0.18;
      fl.rotation.x = Math.cos(elapsed * 7.2 + phase) * 0.12;
    });
    // ★ V32 平順自然流動瀑布 UV 捲動 ＋ 柔焦羽化同心擴散水波漣漪 ＋ 池面微光緩流！
    (this.refs.waterfallStreams || []).forEach((w) => {
      if (w.userData.isWaterfallUV && w.material?.map) {
        w.material.map.offset.y = (elapsed * (w.userData.speed || 1.0) + w.userData.phase) % 1;
        w.material.opacity = 0.78 + Math.sin(elapsed * 3.8 + w.userData.phase) * 0.10;
      }
    });
    (this.refs.pondRipples || []).forEach((rip) => {
      const cycle = (elapsed * 0.42 + (rip.userData.phase || 0)) % 1;
      const scale = 0.38 + cycle * 1.45;
      rip.scale.setScalar(scale);
      rip.material.opacity = Math.sin(cycle * Math.PI) * 0.56;
    });
    if (this.refs.pondWaterTex) {
      this.refs.pondWaterTex.offset.x = (elapsed * 0.022) % 1;
      this.refs.pondWaterTex.offset.y = (elapsed * 0.016) % 1;
    }

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
    (this.refs.extraZoneRings || []).forEach(({ zoneId, ring }) => {
      const isInside = this.activeZoneKey === `zone:${zoneId}`;
      const isGuided = this.guidedZoneId === zoneId;
      const pulse = isInside ? 1.12 + Math.sin(elapsed * 7) * 0.08 : isGuided ? 1 + Math.sin(elapsed * 4.5) * 0.14 : 1 + Math.sin(elapsed * 2.2) * 0.04;
      ring.scale.setScalar(pulse);
      ring.material.opacity = isInside ? 0.96 : isGuided ? 0.8 : 0.44;
      ring.material.color.set(isInside ? 0xFFE680 : ring.userData.baseColor);
    });

    // ★ V31 嚴格單一聚焦頭頂框：只有「真正走進該設施互動觸發區」時才顯示對應那 1 個標籤，絕不一次跳出一堆重疊框框！
    this.refs.zoneBadges.forEach((badge, zoneId) => {
      const isFocused = this.activeZoneKey === `zone:${zoneId}` && (zoneId !== 'offeringTable' || pPos.x <= 0);
      badge.visible = isFocused;
      if (isFocused) {
        const amp = this.guidedZoneId === zoneId ? 0.13 : 0.05;
        badge.position.y = badge.userData.baseY + Math.sin(elapsed * 2.5 + badge.position.x) * amp;
      }
    });
    (this.refs.extraZoneBadges || []).forEach(({ zoneId, badge }) => {
      const isFocused = this.activeZoneKey === `zone:${zoneId}` && pPos.x > 0;
      badge.visible = isFocused;
      if (isFocused) {
        badge.position.y = badge.userData.baseY + Math.sin(elapsed * 2.5 + badge.position.x) * 0.05;
      }
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
