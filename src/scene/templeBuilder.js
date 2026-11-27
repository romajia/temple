/**
 * 安定區港口里・玉勅代天府德慈宮 - V6 新廟實景 3D 模型
 * ------------------------------------------------------------
 * 依新廟建築設計圖程式化重現：
 * - 前後兩進閩南宮殿建築：三川拜亭 ＋ 挑高正殿（豔紅琉璃瓦、寶藍剪黏燕尾脊、水車堵彩繪、垂掛紅流蘇）
 * - 正殿屋脊頂端恭立「福祿壽三仙」立像
 * - 紅磚側牆 × 青斗石方柱 × 白框古格方窗 × 青斗石浮雕三川門與圓形石雕花窗
 * - 寬闊花崗岩石階 × 左右守門石獅子 × 金色雙層頂蓋天公爐
 * - 右側「假山瀑布景觀池」（動態水流光帶 ＋ 碧綠水池）
 * - 五營旗安奉於神龕「左側」（需求 #4）
 * - 全面透明化遮擋防線：牆體、屋簷、安太歲板子、神明桌、大供桌與所有樹木擋住主角時自動半透明！（需求 #3）
 * - 已完全移除後方洗手間（需求 #6）
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TEMPLE_CONFIG, KNEEL_MATS_36, SIDE_BENCHES } from '../config/templeConfig.js';
import { createAuthenticPhotoDeityV35 } from './deitiesV35.js';
import {
  createPlaqueTexture,
  createBaXianCaiTexture,
  createCoupletTexture,
  createHorizontalSignTexture,
  createTaiSuiWallTexture,
  createBulletinTexture,
  createPlazaTileTexture,
  createHallFloorTexture,
  createZoneBadgeSprite,
  createCrimsonRoofTileTexture,
  createRedBrickWallTexture,
  createBluestoneCarvingTexture,
  createBlueRidgeOrnamentTexture,
  createFriezeBandTexture,
  createTempleWindowTexture,
  createRoundStoneMedallionTexture,
  createSanctuaryGuanyinMuralTexture,
  createImperialBannerTexture,
  createDeityFaceTexture,
  createDeityRobeTexture,
  createDeitySashTexture,
  createVintageDeityPortraitTexture,
  createFiveCampFlagTexture,
  createLanternSilkTexture,
  createCarvedStoneTexture,
  createCarvedRosewoodTexture,
  createIncenseAshTexture,
  createAltarTableClothTexture,
  createSoftCushionTexture,
  createFortuneTubeLabelTexture,
  createMiniTalismanTexture,
  createServiceDeskSignTexture,
  createStoneTableTopTexture,
  createBeiWoodTexture,
  createBeardHairTexture,
  createChessBoardTableTexture,
  createCarvedCenserReliefTexture,
  createGoldRoofRidgeTexture,
  createStripedAwningTexture,
  createNaturalRockTexture,
  createWaterfallFoamTexture,
  createPondRippleRingTexture,
  createPondWaterTexture,
  createTalismanPouchTexture
} from './canvasTextures.js';

function tagInteractive(object, zoneId) {
  object.userData.zoneId = zoneId;
  object.traverse(child => { child.userData.zoneId = zoneId; });
}

function createOrganicDioramaLawn(width, depth) {
  const geo = new THREE.PlaneGeometry(width, depth, 64, 64);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = [];
  const cBase = new THREE.Color('#7FA86A');
  const cLight = new THREE.Color('#97BF7D');
  const cShade = new THREE.Color('#668F57');
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const n =
      Math.sin(x * 0.28 + z * 0.18) * 0.45 +
      Math.cos(x * 0.16 - z * 0.29) * 0.35 +
      Math.sin((x + z) * 0.55) * 0.20;
    if (n > 0.15) tmp.copy(cBase).lerp(cLight, Math.min(1, (n - 0.15) * 1.1));
    else if (n < -0.15) tmp.copy(cBase).lerp(cShade, Math.min(1, (-n - 0.15) * 1.1));
    else tmp.copy(cBase);
    colors.push(tmp.r, tmp.g, tmp.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 })
  );
  mesh.receiveShadow = true;
  mesh.userData.walkable = true;
  return mesh;
}

export function buildDeciTemple(scene, initialState = {}) {
  const root = new THREE.Group();
  scene.add(root);

  const P = TEMPLE_CONFIG.palette;
  const interactiveObjects = [];
  const walkableMeshes = [];
  const occludableMeshes = []; // 牆面、屋簷、安太歲板子、神明桌、供桌與所有樹木（擋住主角視線時自動半透明）

  let occludeGroupSeq = 0;
  /**
   * 遞迴標記單一 Mesh 或整個 Group 為「視線遮擋自動透明化」對象
   * 同一組件（例如一棵樹、一整面安太歲板子、神明桌）共用 occludeGroupId，被射線打到時整組同步柔順淡化！
   */
  const markOccludable = (obj, sharedGroupId = null) => {
    const gid = sharedGroupId || `occ-${++occludeGroupSeq}`;
    // ★ 同組件共用複製材質（從 700+ 個重複材質縮減為 ~60 個，大幅降低手機 GPU 記憶體與載入時間！）
    const matMap = new Map();
    const cloneOnce = (mat) => {
      if (matMap.has(mat)) return matMap.get(mat);
      const cloned = mat.clone();
      const baseOp = cloned.opacity ?? 1.0;
      const baseTransparent = Boolean(cloned.transparent || baseOp < 0.99);
      cloned.userData = { ...(cloned.userData || {}), baseOpacity: baseOp, baseTransparent };
      // ★ 關鍵 GPU 效能優化：未遮擋時維持不透明（transparent = false）啟用硬體 Early-Z 深度剔除，消除手機過度繪製崩潰！
      cloned.transparent = baseTransparent;
      cloned.opacity = baseOp;
      cloned.depthWrite = !baseTransparent || baseOp > 0.85;
      matMap.set(mat, cloned);
      return cloned;
    };

    const processMesh = (m) => {
      if (!m.isMesh || !m.material) return;
      // ★ V33 跳過隱形互動熱區 hitbox（opacity === 0），避免透明碰撞盒誤觸射線導致神桌或虎爺變半透明！
      if (!Array.isArray(m.material) && m.material.transparent && m.material.opacity === 0) return;
      if (Array.isArray(m.material)) {
        m.material = m.material.map(cloneOnce);
        m.userData.baseOpacity = m.material[0]?.opacity ?? 1.0;
      } else {
        m.material = cloneOnce(m.material);
        m.userData.baseOpacity = m.material.opacity ?? 1.0;
      }
      m.userData.occludeGroupId = gid;
      occludableMeshes.push(m);
    };

    if (obj.isMesh) {
      processMesh(obj);
    } else {
      obj.traverse(child => {
        if (child.isMesh) processMesh(child);
      });
    }
    return obj;
  };

  const exteriorGroup = new THREE.Group();
  root.add(exteriorGroup);

  const animatedRefs = {
    exteriorGroup,
    roofGroups: [],
    frontFacadeGroup: null,
    indoorExitGroup: null,
    lanterns: [],
    lanternMaterials: [],
    waterfallStreams: [],
    pondRipples: [],
    pondWaterTex: null,
    koiFishes: [],
    fiveCampFlags: [],
    furnaceFlames: [],
    igniterFlames: [],
    extraZoneRings: [],
    extraZoneBadges: [],
    serviceDeskLamp: null,
    pondFeedGroup: new THREE.Group(),
    pondSurface: null,
    shrineLight: null,
    hearthLight: null,
    zoneRings: new Map(),
    zoneBadges: new Map(),
    clouds: [],
    tiangongIncenseGroup: new THREE.Group(),
    mainIncenseGroup: new THREE.Group(),
    taiSuiTexture: null,
    bulletinTexture: null,
    offeringTableTop: new THREE.Vector3(0, 1.33, -5.4),
    offeringTableGroup: null,
    shrineCenter: new THREE.Vector3(0, 2.58, -10.4),
    tiangongSmokePos: new THREE.Vector3(0, 1.72, 15.0),
    mainCenserSmokePos: new THREE.Vector3(0, 2.24, -8.92),
    furnaceOrigin: new THREE.Vector3(16.2, 0.9, 4.4),
    furnaceOpeningPos: new THREE.Vector3(15.30, 1.16, 5.30),
    // ★ V1.1 新增互動物件參照（含桌下虎爺三顆蛋、虎爺香爐、五營旗香爐）
    teaLiquids: [],
    teaCupsWorldPos: new THREE.Vector3(0, 1.56, -8.36),
    stationTeapot: null,
    tigerEggMeshes: [],
    tigerIncenseGroup: new THREE.Group(),
    tigerSmokePos: new THREE.Vector3(-0.56, 0.84, -7.64),
    fiveCampIncenseGroup: new THREE.Group(),
    fiveCampSmokePos: new THREE.Vector3(-4.15, 1.88, -8.62),
    chickens: [],
    collectiblesGroup: new THREE.Group()
  };
  exteriorGroup.add(animatedRefs.collectiblesGroup);

  // ---- 新廟專屬材質群（★ V9 工匠精雕石材與紅木紋理升級！）----
  const carvedStoneTex = createCarvedStoneTexture();
  carvedStoneTex.repeat.set(2, 2);
  const carvedWoodTex = createCarvedRosewoodTexture();
  carvedWoodTex.repeat.set(2, 2);

  const matRedPillar = new THREE.MeshStandardMaterial({ color: 0xC42029, roughness: 0.46, metalness: 0.08 });
  const matDeepRed = new THREE.MeshStandardMaterial({ color: 0x8C171E, roughness: 0.58, metalness: 0.06 });
  const matGold = new THREE.MeshStandardMaterial({ color: P.imperialGold, metalness: 0.56, roughness: 0.26 });
  const matStonePillar = new THREE.MeshStandardMaterial({ map: carvedStoneTex, color: 0xC8D1D8, roughness: 0.72, metalness: 0.04 }); // 精雕青斗花崗石方柱
  const matStone = new THREE.MeshStandardMaterial({ map: carvedStoneTex, color: 0xDCE0E4, roughness: 0.78 });                         // 精雕花崗岩石階與基座
  const matWoodDark = new THREE.MeshStandardMaterial({ map: carvedWoodTex, color: 0xD8B4A2, roughness: 0.56, metalness: 0.08 });       // 精雕深紫檀紅木
  const matWoodWarm = new THREE.MeshStandardMaterial({ map: carvedWoodTex, color: 0xE5C4A0, roughness: 0.64 });

  const crimsonRoofTex = createCrimsonRoofTileTexture();
  const matCrimsonRoof = new THREE.MeshStandardMaterial({ map: crimsonRoofTex, roughness: 0.54, metalness: 0.08 });

  const redBrickTex = createRedBrickWallTexture();
  const matRedBrick = new THREE.MeshStandardMaterial({ map: redBrickTex, roughness: 0.84 });

  const bluestoneTex = createBluestoneCarvingTexture();
  const matBluestoneWall = new THREE.MeshStandardMaterial({
    map: bluestoneTex,
    transparent: true,
    alphaTest: 0.35,
    side: THREE.DoubleSide,
    roughness: 0.84
  });
  const matCementLight = new THREE.MeshStandardMaterial({ map: carvedStoneTex, color: 0xCFD4D9, roughness: 0.82 });

  const blueRidgeTex = createBlueRidgeOrnamentTexture();
  const matBlueRidge = new THREE.MeshStandardMaterial({ map: blueRidgeTex, roughness: 0.46, metalness: 0.10 });
  const matCobaltTip = new THREE.MeshStandardMaterial({ color: 0x2467B0, roughness: 0.42, metalness: 0.16 });

  const friezeTex = createFriezeBandTexture();
  const matFrieze = new THREE.MeshStandardMaterial({ map: friezeTex, roughness: 0.62 });

  const windowTex = createTempleWindowTexture();
  const matWindow = new THREE.MeshStandardMaterial({
    map: windowTex,
    transparent: true,
    opacity: 0.96,
    side: THREE.DoubleSide,
    roughness: 0.20,
    metalness: 0.12
  });
  const matWindowWood = new THREE.MeshStandardMaterial({ color: 0xF3EFE8, roughness: 0.58 });

  const medallionTex = createRoundStoneMedallionTexture();
  const matMedallion = new THREE.MeshStandardMaterial({ map: medallionTex, transparent: true, roughness: 0.72 });

  // =========================================================================
  // 1. 56m × 55m 浮空微縮模型島 ＋ 360° 環廟散步石板道（無廁所，還原開闊後花園）
  // =========================================================================
  const dioramaWidth = 56;
  const dioramaDepth = 55;
  const dioramaCenterZ = 1.5;

  const organicLawn = createOrganicDioramaLawn(dioramaWidth, dioramaDepth);
  organicLawn.position.set(0, -0.02, dioramaCenterZ);
  exteriorGroup.add(organicLawn);
  walkableMeshes.push(organicLawn);

  const soilSlab = new THREE.Mesh(
    new THREE.BoxGeometry(dioramaWidth, 1.15, dioramaDepth),
    new THREE.MeshStandardMaterial({ color: 0x7E5B42, roughness: 0.92 })
  );
  soilSlab.position.set(0, -0.60, dioramaCenterZ);
  exteriorGroup.add(soilSlab);

  const naturalRockTex = createNaturalRockTexture();
  const baseRockTex = naturalRockTex.clone();
  baseRockTex.needsUpdate = true;
  baseRockTex.repeat.set(12, 1);
  const stoneBaseSlab = new THREE.Mesh(
    new THREE.BoxGeometry(dioramaWidth + 0.8, 0.98, dioramaDepth + 0.8),
    new THREE.MeshStandardMaterial({ map: baseRockTex, color: 0x627074, roughness: 0.90 })
  );
  stoneBaseSlab.position.set(0, -1.65, dioramaCenterZ);
  exteriorGroup.add(stoneBaseSlab);

  const plazaTex = createPlazaTileTexture();
  plazaTex.repeat.set(10, 8);
  const plazaMat = new THREE.MeshStandardMaterial({ map: plazaTex, roughness: 0.86 });

  const frontPlaza = new THREE.Mesh(new THREE.BoxGeometry(36, 0.14, 18.2), plazaMat);
  frontPlaza.position.set(-0.8, -0.02, 16.8);
  frontPlaza.receiveShadow = true;
  frontPlaza.userData.walkable = true;
  exteriorGroup.add(frontPlaza);
  walkableMeshes.push(frontPlaza);

  // ★ 需求 #4：精雕花崗岩廣場緣石（讓磁磚廣場與綠草坪收邊更細緻整齊！）
  [
    [-0.8, 25.92, 36.4, 0.26],
    [-18.88, 16.8, 0.26, 18.36],
    [17.28, 16.8, 0.26, 18.36]
  ].forEach(([cx, cz, cw, cd]) => {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.19, cd), matStone);
    curb.position.set(cx, 0.01, cz);
    curb.receiveShadow = true;
    exteriorGroup.add(curb);
  });

  // 園區周邊點綴細緻「台灣廟埕花叢（杜鵑紅／粉白花灌木）」
  const bushLeafMat = new THREE.MeshStandardMaterial({ color: 0x3E7B48, roughness: 0.88 });
  const bushRedFlower = new THREE.MeshStandardMaterial({ color: 0xE84B5A, roughness: 0.65 });
  const bushYellowFlower = new THREE.MeshStandardMaterial({ color: 0xF5C242, roughness: 0.65 });
  [
    [-19.8, 11.2, true], [-19.8, 17.5, false], [-19.8, 23.0, true],
    [18.8, 7.2, false], [-18.5, -18.5, true], [18.5, -18.5, false],
    [-11.5, -20.5, false], [11.5, -20.5, true]
  ].forEach(([bx, bz, isRed], idx) => {
    const bush = new THREE.Group();
    const b1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 1), bushLeafMat);
    b1.scale.set(1.25, 0.72, 1.05);
    b1.position.y = 0.36;
    const b2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46, 1), bushLeafMat);
    b2.position.set(0.45, 0.28, 0.18);
    bush.add(b1, b2);
    for (let f = 0; f < 6; f++) {
      const fa = (f / 6) * Math.PI * 2 + idx;
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.085, 6, 6), isRed ? bushRedFlower : bushYellowFlower);
      fl.position.set(Math.cos(fa) * 0.48, 0.56 + (f % 2) * 0.12, Math.sin(fa) * 0.38);
      bush.add(fl);
    }
    bush.position.set(bx, -0.02, bz);
    exteriorGroup.add(bush);
  });

  const pathStoneTex = carvedStoneTex.clone();
  pathStoneTex.needsUpdate = true;
  pathStoneTex.repeat.set(6, 12);
  const pathMat = new THREE.MeshStandardMaterial({ map: pathStoneTex, color: 0xE2D8CA, roughness: 0.86 });
  [
    [-15.6, -3.5, 4.8, 30],
    [15.6, -3.5, 4.8, 30],
    [0, -16.8, 36.0, 4.8]
  ].forEach(([px, pz, pw, pd]) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.10, pd), pathMat);
    p.position.set(px, -0.01, pz);
    p.receiveShadow = true;
    p.userData.walkable = true;
    exteriorGroup.add(p);
    walkableMeshes.push(p);
  });

  // 園區周邊林蔭樹木（全部加入 markOccludable：擋住主角時整棵樹平滑半透明！）
  [
    [-23.2, -19.5, 'luan', 1.3], [-14.2, -21.8, 'green', 1.25], [-5.2, -21.8, 'luan', 1.2],
    [5.2, -21.8, 'green', 1.2], [14.5, -21.8, 'luan', 1.3], [23.2, -19.5, 'green', 1.25],
    [-23.2, -8.0, 'green', 1.25], [-23.2, 3.0, 'luan', 1.25], [-23.2, 13.5, 'green', 1.2], [-22.6, 23.2, 'luan', 1.15],
    [23.2, -8.0, 'luan', 1.25], [23.2, 3.0, 'green', 1.25], [22.8, 22.8, 'green', 1.15]
  ].forEach(([tx, tz, kind, sc]) => {
    const t = createStylizedTree(kind);
    t.position.set(tx, -0.02, tz);
    t.scale.setScalar(sc);
    markOccludable(t);
    exteriorGroup.add(t);
  });

  // 柔雲
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.95 });
  [
    [-22, 19.5, -24, 1.5], [18, 21.0, -26, 1.65], [-3, 22.0, -30, 1.4], [26, 18.5, -12, 1.2]
  ].forEach(([x, y, z, s]) => {
    const c = new THREE.Group();
    const p1 = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 10), cloudMat);
    const p2 = new THREE.Mesh(new THREE.SphereGeometry(1.05, 10, 10), cloudMat);
    p2.position.set(1.2, -0.15, 0.1);
    const p3 = new THREE.Mesh(new THREE.SphereGeometry(1.0, 10, 10), cloudMat);
    p3.position.set(-1.15, -0.2, -0.1);
    c.add(p1, p2, p3);
    c.position.set(x, y, z);
    c.scale.setScalar(s);
    c.userData.baseX = x;
    exteriorGroup.add(c);
    animatedRefs.clouds.push(c);
  });

  // =========================================================================
  // 2. 新廟主體結構（安定區港口里・玉勅代天府德慈宮 紅磚×青斗石×紅瓦藍脊兩進宮殿）
  // =========================================================================
  const basePlatform = new THREE.Mesh(new THREE.BoxGeometry(20.8, 0.36, 21.6), matStone);
  basePlatform.position.set(0, 0.18, -1.9);
  basePlatform.receiveShadow = true;
  basePlatform.castShadow = true;
  root.add(basePlatform);

  const hallFloorTex = createHallFloorTexture();
  hallFloorTex.repeat.set(6, 6);
  const hallFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(19.8, 20.8),
    new THREE.MeshStandardMaterial({ map: hallFloorTex, roughness: 0.80 })
  );
  hallFloor.rotation.x = -Math.PI / 2;
  hallFloor.position.set(0, 0.365, -1.9);
  hallFloor.receiveShadow = true;
  hallFloor.userData.walkable = true;
  root.add(hallFloor);
  walkableMeshes.push(hallFloor);

  // 正殿中央紅金大道地毯
  const centerAisleCarpet = new THREE.Mesh(
    new THREE.PlaneGeometry(3.1, 13.0),
    new THREE.MeshStandardMaterial({ color: 0xA8201E, roughness: 0.85 })
  );
  centerAisleCarpet.rotation.x = -Math.PI / 2;
  centerAisleCarpet.position.set(0, 0.372, 1.55);
  centerAisleCarpet.receiveShadow = true;
  centerAisleCarpet.userData.walkable = true;
  root.add(centerAisleCarpet);
  walkableMeshes.push(centerAisleCarpet);

  [-1.58, 1.58].forEach(gx => {
    const trim = new THREE.Mesh(
      new THREE.PlaneGeometry(0.11, 13.0),
      new THREE.MeshStandardMaterial({ color: 0xE5B968, roughness: 0.6 })
    );
    trim.rotation.x = -Math.PI / 2;
    trim.position.set(gx, 0.374, 1.55);
    root.add(trim);
  });

  // 全寬花崗岩三層宏偉石階（對齊新廟設計圖！）
  for (let i = 0; i < 3; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(19.4 + i * 0.6, 0.12, 0.50), matStone);
    step.position.set(0, 0.30 - i * 0.11, 9.12 + i * 0.46);
    step.receiveShadow = true;
    step.userData.walkable = true;
    root.add(step);
    walkableMeshes.push(step);
  }

  // ★ 屋內視角專屬「大門出口引導光圈＋標牌」（僅在屋內視角顯示，正面/左右視角點大門即可順暢走出廟外！）
  const indoorExitGroup = new THREE.Group();
  indoorExitGroup.visible = false;
  const exitPad = new THREE.Mesh(
    new THREE.RingGeometry(0.44, 0.56, 32),
    new THREE.MeshBasicMaterial({ color: 0x34D399, transparent: true, opacity: 0.85, side: THREE.DoubleSide, toneMapped: false })
  );
  exitPad.rotation.x = -Math.PI / 2;
  exitPad.position.set(0, 0.39, 7.35);
  const exitHitFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 3.2),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, side: THREE.DoubleSide })
  );
  exitHitFloor.rotation.x = -Math.PI / 2;
  exitHitFloor.position.set(0, 0.395, 7.6);
  const exitBadge = createZoneBadgeSprite('🚪 點此走出大門', '#10B981');
  exitBadge.position.set(0, 1.55, 7.35);
  indoorExitGroup.add(exitPad, exitHitFloor, exitBadge);
  tagInteractive(indoorExitGroup, 'exitDoor');
  root.add(indoorExitGroup);
  interactiveObjects.push(indoorExitGroup);
  animatedRefs.indoorExitGroup = indoorExitGroup;

  // ---- A. 紅磚三面牆體 ＋ 青斗石結構方柱 ＋ 水車堵藍紅彩繪帶 ＋ 白框方窗 ＋ 圓形青斗石窗 ----
  const backWallGroup = new THREE.Group();
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(20.4, 7.6, 0.48), matRedBrick);
  backWall.position.set(0, 4.16, -12.6);
  backWall.receiveShadow = true;
  backWall.castShadow = true;
  const backFrieze = new THREE.Mesh(new THREE.BoxGeometry(20.5, 0.68, 0.54), matFrieze);
  backFrieze.position.set(0, 7.62, -12.6);
  const backBaseTrim = new THREE.Mesh(new THREE.BoxGeometry(20.55, 0.75, 0.54), matStonePillar);
  backBaseTrim.position.set(0, 0.74, -12.6);
  backWallGroup.add(backWall, backFrieze, backBaseTrim);
  markOccludable(backWallGroup, 'wall-back');
  root.add(backWallGroup);

  // 左右兩側紅磚牆（★ V34 前進側牆全面升級為真實 ExtrudeGeometry 圓孔紅磚牆，讓左右兩側圓形花窗內外 100% 透空！）
  const sideFrontShape = new THREE.Shape();
  sideFrontShape.moveTo(-3.35, -2.96);
  sideFrontShape.lineTo(3.35, -2.96);
  sideFrontShape.lineTo(3.35, 2.96);
  sideFrontShape.lineTo(-3.35, 2.96);
  sideFrontShape.closePath();
  const sideRoundHole = new THREE.Path();
  sideRoundHole.absarc(0, 0.56, 1.12, 0, Math.PI * 2, true); // 對應世界中心 z = 4.95, y = 3.32 + 0.56 = 3.88！
  sideFrontShape.holes.push(sideRoundHole);
  const sideFrontWallGeo = new THREE.ExtrudeGeometry(sideFrontShape, {
    depth: 0.44,
    bevelEnabled: false,
    curveSegments: 28
  });
  sideFrontWallGeo.translate(0, 0, -0.22);
  // 正規化 ExtrudeGeometry UV 至 [0..1]，讓紅磚縫尺寸與後進側牆完全一致！
  const sfUv = sideFrontWallGeo.attributes.uv;
  for (let i = 0; i < sfUv.count; i++) {
    sfUv.setXY(i, (sfUv.getX(i) + 3.35) / 6.70, (sfUv.getY(i) + 2.96) / 5.92);
  }
  sfUv.needsUpdate = true;

  [-1, 1].forEach((side) => {
    const sideX = side * 10.0;
    const sideGroup = new THREE.Group();

    // 前進（三川拜亭側牆 z = 1.60..8.30，高 5.92m，中央真實圓孔貫穿透空！）
    const frontSideWall = new THREE.Mesh(sideFrontWallGeo, matRedBrick);
    frontSideWall.rotation.y = Math.PI / 2;
    frontSideWall.position.set(sideX, 3.32, 4.95);
    frontSideWall.castShadow = true;
    frontSideWall.receiveShadow = true;
    sideGroup.add(frontSideWall);

    // 前進側牆中央「真正透空・立體工匠精雕青斗石圓形花窗」（內嵌於圓洞中央 x = sideX，內外兩側皆透光零封板！）
    const sideMedallion = create3DOpenworkWindowGrille(1.12, matStonePillar, matGold, false);
    sideMedallion.position.set(sideX, 3.88, 4.95);
    sideMedallion.rotation.y = Math.PI / 2;
    sideGroup.add(sideMedallion);

    // 前進側牆頂部藍紅彩繪水車堵（收齊於 z = 1.92..7.98，不與前後青斗石方柱重疊穿幫！）
    const frontSideFrieze = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.54, 6.06), matFrieze);
    frontSideFrieze.position.set(sideX, 6.02, 4.95);
    sideGroup.add(frontSideFrieze);

    // ★ 需求 #2 & #9：後進挑高正殿側牆（z = -12.4..1.6，高 7.2m）將透明透光窗戶位子抬高至 y = 4.35（窗洞 y: 3.59..5.11）更典雅透亮！
    // 下段磚牆（y: 0.36..3.59，高 3.23m）
    const rearWallBot = new THREE.Mesh(new THREE.BoxGeometry(0.46, 3.23, 14.0), matRedBrick);
    rearWallBot.position.set(sideX, 1.975, -5.4);
    rearWallBot.castShadow = true;
    rearWallBot.receiveShadow = true;
    // 上段磚牆（y: 5.11..7.56，高 2.45m）
    const rearWallTop = new THREE.Mesh(new THREE.BoxGeometry(0.46, 2.45, 14.0), matRedBrick);
    rearWallTop.position.set(sideX, 6.335, -5.4);
    rearWallTop.castShadow = true;
    rearWallTop.receiveShadow = true;
    // 中段三塊垂直磚牆墩（留出 z = -5.0 與 z = -9.85 兩處寬 2.08m × 高 1.52m 的高窗洞！）
    [
      { z: -1.18, len: 5.56 },   // 1.60 .. -3.96
      { z: -7.425, len: 2.77 },  // -6.04 .. -8.81
      { z: -11.645, len: 1.51 }  // -10.89 .. -12.40
    ].forEach((pier) => {
      const pMesh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.52, pier.len), matRedBrick);
      pMesh.position.set(sideX, 4.35, pier.z);
      pMesh.castShadow = true;
      pMesh.receiveShadow = true;
      sideGroup.add(pMesh);
    });
    sideGroup.add(rearWallBot, rearWallTop);

    // 後進側牆頂部藍紅彩繪水車堵
    const rearSideFrieze = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.66, 14.2), matFrieze);
    rearSideFrieze.position.set(sideX, 7.36, -5.4);
    sideGroup.add(rearSideFrieze);

    // 側牆石砌腰腳線
    const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.72, 21.0), matStonePillar);
    basePlinth.position.set(sideX, 0.72, -2.0);
    sideGroup.add(basePlinth);

    // 側牆 2 扇「透明透光」傳統白框古格高窗（y = 4.35，精準置於兩根青斗石柱正中央：-5.0 與 -9.85！）
    [-5.0, -9.85].forEach((wz) => {
      const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.04, 1.48), matWindow);
      winGlass.position.set(sideX, 4.35, wz);
      winGlass.rotation.y = Math.PI / 2;
      // 立體白木外框與精雕窗台
      const sillBot = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.10, 2.24), matWindowWood);
      sillBot.position.set(sideX, 3.58, wz);
      const sillTop = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.09, 2.22), matWindowWood);
      sillTop.position.set(sideX, 5.12, wz);
      [-1.06, 1.06].forEach((dz) => {
        const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.56, 1.56, 0.10), matWindowWood);
        jamb.position.set(sideX, 4.35, wz + dz);
        sideGroup.add(jamb);
      });
      sideGroup.add(winGlass, sillBot, sillTop);
    });

    // 側牆外立面 5 根青斗花崗岩結構方柱（★ V34 前角柱高收齊於 y = 6.29 緊頂正面橫樑下緣，絕不穿入彩繪樑！）
    [8.3, 1.6, -2.6, -7.4, -12.3].forEach((pz, idx) => {
      const colH = idx === 0 ? 5.93 : 7.6;
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.62, colH, 0.62), matStonePillar);
      col.position.set(sideX, 0.36 + colH / 2, pz);
      col.castShadow = true;
      const colBase = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.36, 0.76), matStone);
      colBase.position.set(sideX, 0.54, pz);
      sideGroup.add(col, colBase);
    });

    markOccludable(sideGroup, side < 0 ? 'wall-left' : 'wall-right');
    root.add(sideGroup);
  });

  // ---- B. ★ V34 三川門正面立面（徹底修正所有穿幫與角縫：牆體密合紅柱與角柱、柱頭收齊於橫樑下方、斗拱避開紅柱、前屋簷平順坐落樑頂！）----
  const frontFacadeGroup = new THREE.Group();

  // 中央兩根亮眼朱紅圓柱（收齊於橫樑下緣 y = 6.29，柱礎與柱身均不穿入左右石牆或頂部彩繪橫樑！）
  [-3.74, 3.74].forEach((px) => {
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.44, 14), matStonePillar);
    plinth.position.set(px, 0.58, 8.42);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.30, 5.24, 16), matRedPillar);
    col.position.set(px, 3.42, 8.42);
    col.castShadow = true;
    const collarGold = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.036, 8, 18), matGold);
    collarGold.rotation.x = Math.PI / 2;
    collarGold.position.set(px, 6.06, 8.42);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.30, 0.20, 16), matGold);
    cap.position.set(px, 6.19, 8.42);
    frontFacadeGroup.add(plinth, col, collarGold, cap);
  });

  // ★ V34 正面 3D 圓孔石牆（精準密合紅柱外側 x = ±4.06 至角柱內緣 x = ±9.72，高度 0.36..6.29 緊接橫樑零空隙零穿幫！）
  const wallHoleShape = new THREE.Shape();
  wallHoleShape.moveTo(-2.83, -2.965);
  wallHoleShape.lineTo(2.83, -2.965);
  wallHoleShape.lineTo(2.83, 2.965);
  wallHoleShape.lineTo(-2.83, 2.965);
  wallHoleShape.closePath();
  const roundHole = new THREE.Path();
  roundHole.absarc(0, 0.755, 1.18, 0, Math.PI * 2, true); // 對應世界高度 y = 3.325 + 0.755 = 4.08m！
  wallHoleShape.holes.push(roundHole);

  const cementWallGeo = new THREE.ExtrudeGeometry(wallHoleShape, {
    depth: 0.34,
    bevelEnabled: false,
    curveSegments: 28
  });
  const cwUv = cementWallGeo.attributes.uv;
  for (let i = 0; i < cwUv.count; i++) {
    cwUv.setXY(i, (cwUv.getX(i) + 2.83) / 5.66, (cwUv.getY(i) + 2.965) / 5.93);
  }
  cwUv.needsUpdate = true;

  [-6.89, 6.89].forEach((bx) => {
    const wallMesh = new THREE.Mesh(cementWallGeo, matCementLight);
    wallMesh.position.set(bx, 3.325, 8.16);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;

    // 精雕石材上楣與腰腳線（收齊於紅柱與角柱之間，絕不互相插穿！）
    const topCap = new THREE.Mesh(new THREE.BoxGeometry(5.60, 0.16, 0.42), matStonePillar);
    topCap.position.set(bx, 6.21, 8.33);
    const botCap = new THREE.Mesh(new THREE.BoxGeometry(5.60, 0.38, 0.42), matStonePillar);
    botCap.position.set(bx, 0.55, 8.33);
    // 下堵立體石雕線腳框（前後微凸 3cm，絕無共面閃爍穿幫！）
    const dadoPanel = new THREE.Mesh(new THREE.BoxGeometry(4.40, 1.44, 0.40), matStone);
    dadoPanel.position.set(bx, 1.62, 8.33);

    // 嵌入真實 3D 圓形鏤空石雕花窗（從內外看皆 100% 透空零破圖！）
    const flowerWindow = create3DOpenworkWindowGrille(1.18, matStonePillar, matGold, false);
    flowerWindow.position.set(bx, 4.08, 8.33);

    frontFacadeGroup.add(wallMesh, topCap, botCap, dadoPanel, flowerWindow);
  });

  // 前簷水車堵藍紅彩繪橫樑 ＋ 精雕木作金飾斗拱群（均勻避開兩根紅柱柱頭，絕無交疊穿幫！）
  const frontBeam = new THREE.Mesh(new THREE.BoxGeometry(20.6, 0.64, 0.72), matFrieze);
  frontBeam.position.set(0, 6.74, 8.42);
  frontBeam.castShadow = true;
  const frontBeamGold = new THREE.Mesh(new THREE.BoxGeometry(20.68, 0.14, 0.76), matGold);
  frontBeamGold.position.set(0, 6.36, 8.42);
  frontFacadeGroup.add(frontBeam, frontBeamGold);
  [-8.45, -6.89, -5.30, -2.35, -0.95, 0.95, 2.35, 5.30, 6.89, 8.45].forEach((dgX) => {
    const dou = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.42), matDeepRed);
    dou.position.set(dgX, 6.21, 8.58);
    const gong = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.32), matGold);
    gong.position.set(dgX, 6.31, 8.64);
    frontFacadeGroup.add(dou, gong);
  });
  // 三川門中央低石門檻（精準銜接左右紅柱內緣）
  const doorThreshold = new THREE.Mesh(new THREE.BoxGeometry(6.88, 0.08, 0.32), matStonePillar);
  doorThreshold.position.set(0, 0.40, 8.42);
  frontFacadeGroup.add(doorThreshold);

  // 殿內結構大柱
  [[-9.3, -11.9], [-4.8, -11.9], [4.8, -11.9], [9.3, -11.9]].forEach(([px, pz]) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.31, 7.6, 14), matRedPillar);
    col.position.set(px, 4.16, pz);
    frontFacadeGroup.add(col);
  });

  // 正門上方實景手工刺繡八仙彩（精準懸於兩根紅柱之間 y = 5.26，不重疊柱頭與斗拱！）
  const baXianTex = createBaXianCaiTexture();
  const baXianBanner = new THREE.Mesh(
    new THREE.PlaneGeometry(6.88, 1.92),
    new THREE.MeshStandardMaterial({ map: baXianTex, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide, roughness: 0.62 })
  );
  baXianBanner.position.set(0, 5.28, 8.86);
  frontFacadeGroup.add(baXianBanner);

  // ★ 需求 #11：精調 1:1.34 典雅比例的「金雕雙龍框・玉勅代天府德慈宮」精雕立體宮匾（不再偏長！加上 3D 雙側盤龍、頂端雙龍搶珠與雕花底座托架！）
  [-0.74, 0.74].forEach((bx) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.16, 1.16), matGold);
    arm.position.set(bx, 7.05, 9.05);
    frontFacadeGroup.add(arm);
  });
  const plaqueGroup = new THREE.Group();
  plaqueGroup.position.set(0, 8.38, 9.65);
  plaqueGroup.rotation.x = 0.06;
  const plaqueTex = createPlaqueTexture();
  const plaqueBack = new THREE.Mesh(new THREE.BoxGeometry(2.14, 2.86, 0.24), matDeepRed);
  plaqueBack.castShadow = true;
  // 3D 立體金箔雕邊雙層外框四條
  const pTop = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.15, 0.32), matGold);
  pTop.position.y = 1.44;
  const pBot = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.19, 0.36), matGold);
  pBot.position.y = -1.46;
  const pBotApron = new THREE.Mesh(new THREE.BoxGeometry(2.10, 0.14, 0.30), matDeepRed);
  pBotApron.position.y = -1.60;
  const pLeft = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.88, 0.32), matGold);
  pLeft.position.x = -1.07;
  const pRight = pLeft.clone();
  pRight.position.x = 1.07;
  // 左右兩側立體 3D 盤龍金浮雕珠雲飾（呼應實景照左右立體金龍雕邊！）
  [-1, 1].forEach((side) => {
    const dCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 1.12, -1.24, 0.15),
      new THREE.Vector3(side * 1.18, -0.62, 0.19),
      new THREE.Vector3(side * 1.08, 0.02, 0.17),
      new THREE.Vector3(side * 1.18, 0.66, 0.20),
      new THREE.Vector3(side * 1.08, 1.24, 0.17)
    ]);
    const dragonBody = new THREE.Mesh(new THREE.TubeGeometry(dCurve, 18, 0.055, 7, false), matGold);
    const dragonHead = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), matGold);
    dragonHead.scale.set(1.2, 0.85, 0.9);
    dragonHead.position.set(side * 1.04, 1.26, 0.20);
    // 底部雲捲雕飾
    const botScroll = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.032, 6, 12), matGold);
    botScroll.position.set(side * 0.96, -1.58, 0.14);
    plaqueGroup.add(dragonBody, dragonHead, botScroll);
  });
  // 牌面（2.02 × 2.74，精準對齊 768×1040 紋理不拉長！）
  const plaqueFace = new THREE.Mesh(
    new THREE.PlaneGeometry(2.02, 2.74),
    new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.34, metalness: 0.16, emissive: 0x3A1006, emissiveIntensity: 0.28 })
  );
  plaqueFace.position.z = 0.13;
  // 頂部雙龍搶珠立體金雕牌首
  const pearlCrest = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), matGold);
  pearlCrest.position.set(0, 1.66, 0.14);
  const crestArch = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.055, 8, 20, Math.PI), matGold);
  crestArch.position.set(0, 1.44, 0.14);
  plaqueGroup.add(plaqueBack, pTop, pBot, pBotApron, pLeft, pRight, plaqueFace, pearlCrest, crestArch);
  frontFacadeGroup.add(plaqueGroup);

  markOccludable(frontFacadeGroup, 'facade-front');
  animatedRefs.frontFacadeGroup = frontFacadeGroup;
  root.add(frontFacadeGroup);

  // =========================================================================
  // 3. 新廟「前後兩進」豔紅琉璃瓦 × 寶藍剪黏燕尾大屋頂 ＋ 屋頂「福祿壽三仙」
  //    ★ 需求 #3：屋頂左右三角山牆精準對齊側牆 x = ±10.0、厚度 0.46m 並向下無縫銜接水車堵，絕無懸空破圖！
  // =========================================================================
  // --- 第一進：三川拜亭紅瓦藍脊屋頂（★ V34 屋簷底緣抬升至 7.14m 穩坐於正面橫樑頂 7.06m 上方，徹底消除屋頂穿插橫樑！） ---
  const frontRoofGroup = buildMinnanSwallowtailRoof({
    width: 22.8,
    depth: 7.4,
    baseY: 7.14,
    peakHeight: 2.38,
    gableWallX: 10.0,
    gableDepth: 6.7,
    gableDropY: -1.12,
    matCrimsonRoof,
    matBlueRidge,
    matCobaltTip,
    matGold,
    matGableBrick: matRedBrick,
    withSanXian: false,
    withTassels: true
  });
  frontRoofGroup.position.set(0, 0, 4.95);
  markOccludable(frontRoofGroup, 'roof-front');
  animatedRefs.roofGroups.push(frontRoofGroup);
  root.add(frontRoofGroup);

  // --- 第二進：後方挑高正殿大屋頂 (z = -5.4，完全對齊後段紅磚側牆 z = -12.4..1.6！) ---
  const mainHallRoofGroup = buildMinnanSwallowtailRoof({
    width: 23.2,
    depth: 15.2,
    baseY: 7.86,
    peakHeight: 3.55,
    gableWallX: 10.0,
    gableDepth: 14.0,
    gableDropY: -0.45,
    matCrimsonRoof,
    matBlueRidge,
    matCobaltTip,
    matGold,
    matGableBrick: matRedBrick,
    withSanXian: true, // ★ 依設計圖正脊中央恭立精雕福祿壽三仙！
    withTassels: true
  });
  mainHallRoofGroup.position.set(0, 0, -5.4);
  markOccludable(mainHallRoofGroup, 'roof-main');
  animatedRefs.roofGroups.push(mainHallRoofGroup);
  root.add(mainHallRoofGroup);

  // ★ 需求 #12：六盞精細宮廷絲綢大紅燈籠，往八仙彩兩側對稱移動（絕不遮擋八仙彩！）
  const lanternSilkTex = createLanternSilkTexture();
  [[-8.4, 5.82, 8.85], [-6.4, 5.82, 8.85], [-4.45, 5.82, 8.85], [4.45, 5.82, 8.85], [6.4, 5.82, 8.85], [8.4, 5.82, 8.85]].forEach(([lx, ly, lz]) => {
    const { group: lantern, bodyMat } = createRedLantern(lanternSilkTex);
    lantern.position.set(lx, ly, lz);
    exteriorGroup.add(lantern);
    animatedRefs.lanterns.push(lantern);
    animatedRefs.lanternMaterials.push(bodyMat);
  });

  // ---- 左右門前「守門石獅子」一對（完全對齊新廟設計圖石階兩側！）----
  [-10.1, 10.1].forEach((lx) => {
    const lion = createStoneLionGuardian(lx < 0 ? 1 : -1);
    lion.position.set(lx, 0.03, 10.1);
    markOccludable(lion);
    exteriorGroup.add(lion);
  });

  // =========================================================================
  // 4. 正殿宏偉挑高神龕（★ 加大精雕紅木神明桌 ＋ 工筆山水觀音背壁 ＋ 上寬下窄五邊形錦旗 ＋ 三尊精緻金身！）
  // =========================================================================
  const shrineGroup = new THREE.Group();
  shrineGroup.position.set(0, 0.36, -10.4);
  root.add(shrineGroup);

  const matEbony = new THREE.MeshStandardMaterial({ color: 0x2A1F1B, roughness: 0.68 });
  // ★ V1.2 修正神明桌高度：降為 1.00m（桌面高 1.06m，讓角色身高 1.58m 明顯高於神明桌，比例更自然！）
  const shrineBase = new THREE.Mesh(new THREE.BoxGeometry(10.6, 1.00, 3.6), matWoodDark);
  shrineBase.position.set(0, 0.50, 0.45);
  shrineBase.castShadow = true;
  shrineBase.receiveShadow = true;
  shrineGroup.add(shrineBase);

  // 工匠精雕紅木神桌桌面線腳、金邊桌緣與四角雕花護腳
  const shrineTopRim = new THREE.Mesh(new THREE.BoxGeometry(10.82, 0.12, 3.76), matWoodDark);
  shrineTopRim.position.set(0, 1.00, 0.45);
  const shrineGoldTrim = new THREE.Mesh(new THREE.BoxGeometry(10.86, 0.05, 3.80), matGold);
  shrineGoldTrim.position.set(0, 0.93, 0.45);
  [[-5.22, 2.20], [5.22, 2.20], [-5.22, -1.28], [5.22, -1.28]].forEach(([cx, cz]) => {
    const cornerLeg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.98, 0.26), matEbony);
    cornerLeg.position.set(cx, 0.49, cz);
    const goldFoot = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.14, 0.30), matGold);
    goldFoot.position.set(cx, 0.08, cz);
    shrineGroup.add(cornerLeg, goldFoot);
  });
  shrineGroup.add(shrineTopRim, shrineGoldTrim);

  const altarCloth = new THREE.Mesh(
    new THREE.BoxGeometry(9.4, 0.80, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xC4312C, roughness: 0.68 })
  );
  altarCloth.position.set(0, 0.48, 2.26);
  shrineGroup.add(altarCloth);

  const clothBorder = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.12, 0.14), matGold);
  clothBorder.position.set(0, 0.92, 2.26);
  shrineGroup.add(clothBorder);

  // 黑檀雕花神龕外框 ＋ ★ V30 高級極簡米白「觀世音菩薩・龍女・善財童子・仙鶴蓮座」實景壁畫（1:1 精準對齊 8.16×4.92 畫幅，零拉伸、臉部背光與仙鶴全數無遮擋！）
  const shrineBackdrop = new THREE.Mesh(new THREE.BoxGeometry(9.0, 5.55, 0.30), matEbony);
  shrineBackdrop.position.set(0, 3.84, -1.16);
  shrineGroup.add(shrineBackdrop);

  const guanyinFallbackTex = createSanctuaryGuanyinMuralTexture();
  const guanyinMuralMat = new THREE.MeshStandardMaterial({
    map: guanyinFallbackTex,
    color: 0xF7ECD8,
    roughness: 0.68,
    metalness: 0.02
  });
  const guanyinMural = new THREE.Mesh(
    new THREE.PlaneGeometry(8.16, 4.92),
    guanyinMuralMat
  );
  guanyinMural.position.set(0, 3.92, -0.99);
  shrineGroup.add(guanyinMural);

  const muralLoader = new THREE.TextureLoader();
  muralLoader.load('./assets/guanyin-mural.jpg?v=20261125v31', (loadedTex) => {
    loadedTex.colorSpace = THREE.SRGBColorSpace;
    loadedTex.anisotropy = 8;
    loadedTex.needsUpdate = true;
    // 更新原始與 markOccludable 可能複製之材質（確保無論半透明群組如何處理皆即時套用新壁畫！）
    guanyinMuralMat.map = loadedTex;
    guanyinMuralMat.needsUpdate = true;
    if (guanyinMural.material && guanyinMural.material !== guanyinMuralMat) {
      guanyinMural.material.map = loadedTex;
      guanyinMural.material.needsUpdate = true;
    }
  });

  // ★ V37：五邊形黃旗整體比例縮精巧（0.78×1.50），高度調整至 y = 3.30（頂端約 4.05，僅高出左側神像鳳冠頂端 3.90 一點點！）
  const bannerGroup = new THREE.Group();
  bannerGroup.position.set(0, 3.30, -0.24);
  const bannerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 1.66, 10), matGold);
  bannerPole.position.set(0, -0.02, -0.03);
  const bannerFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.78, 1.50),
    new THREE.MeshStandardMaterial({
      map: createImperialBannerTexture(),
      transparent: true,
      alphaTest: 0.08,
      roughness: 0.38,
      metalness: 0.14,
      side: THREE.DoubleSide
    })
  );
  bannerGroup.add(bannerPole, bannerFace);
  shrineGroup.add(bannerGroup);

  const topSign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 0.96),
    new THREE.MeshStandardMaterial({ map: createHorizontalSignTexture(TEMPLE_CONFIG.couplets.top), roughness: 0.45 })
  );
  topSign.position.set(0, 6.72, -0.92);
  shrineGroup.add(topSign);

  const coupletRight = new THREE.Mesh(
    new THREE.PlaneGeometry(0.88, 4.72),
    new THREE.MeshStandardMaterial({ map: createCoupletTexture(TEMPLE_CONFIG.couplets.right), roughness: 0.48 })
  );
  coupletRight.position.set(4.85, 3.40, -0.80);
  const coupletLeft = new THREE.Mesh(
    new THREE.PlaneGeometry(0.88, 4.72),
    new THREE.MeshStandardMaterial({ map: createCoupletTexture(TEMPLE_CONFIG.couplets.left), roughness: 0.48 })
  );
  coupletLeft.position.set(-4.85, 3.40, -0.80);
  shrineGroup.add(coupletRight, coupletLeft);

  // ★ V35：全新寫實傳統木雕三尊主神（完整保留 V34 舊版神像備份！網址加上 ?deityStyle=v34 即可即時切回檢視 V34 原版神像！）
  const useV34Deities = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('deityStyle') === 'v34';
  const buildMainDeity = useV34Deities ? createAuthenticPhotoDeityV34 : createAuthenticPhotoDeityV35;
  const leftDeity = buildMainDeity('leftMother');
  leftDeity.position.set(-2.35, 1.06, -0.18);
  const centerDeity = buildMainDeity('centerKing');
  centerDeity.position.set(0, 1.06, 0.14);
  const rightDeity = buildMainDeity('rightBeardKing');
  rightDeity.position.set(2.35, 1.06, -0.18);
  shrineGroup.add(leftDeity, centerDeity, rightDeity);

  // ★ V1.3 精雕神明桌左右光明蓮花宮燈（多層蓮瓣金座 ＋ 圓柱花節桿 ＋ 金肋透光紅蓮燈罩 ＋ 暖金燈芯 ＋ 金蓮寶頂！）
  const matLampGlass = new THREE.MeshStandardMaterial({
    color: 0xE52521,
    emissive: 0xFF3820,
    emissiveIntensity: 0.72,
    roughness: 0.22,
    metalness: 0.08,
    transparent: true,
    opacity: 0.88
  });
  [-4.15, 4.15].forEach((lx) => {
    const lampG = new THREE.Group();
    lampG.position.set(lx, 1.06, 0.32);
    // 八角雙層蓮花雕花銅金底座
    const foot1 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.10, 8), matGold);
    foot1.position.y = 0.05;
    const foot2 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.10, 8), matDeepRed);
    foot2.position.y = 0.14;
    const lotusPetals = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.12, 0.10, 8), matGold);
    lotusPetals.position.y = 0.23;
    // 細緻花節燈桿
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.068, 0.36, 10), matGold);
    stem.position.y = 0.44;
    const stemRing = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.02, 6, 12), matGold);
    stemRing.rotation.x = Math.PI / 2;
    stemRing.position.y = 0.44;
    // ★ V31 修正燈罩穿幫：八角透光玻璃燈罩與上下金箍、8 根斜傾金肋嚴格同角度貼合於玻璃外側，100% 零穿幫！
    const cupHolder = new THREE.Mesh(new THREE.CylinderGeometry(0.232, 0.125, 0.09, 8), matGold);
    cupHolder.position.y = 0.655;
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.196, 0.218, 0.42, 8), matLampGlass);
    shade.position.y = 0.91;
    // 內部暖金發光燈芯
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xFFDD66, toneMapped: false })
    );
    core.scale.set(0.85, 1.32, 0.85);
    core.position.y = 0.90;
    // 上下八角金箍（嚴格大於燈罩半徑，完整包覆絕不陷入燈罩！）
    const botRing = new THREE.Mesh(new THREE.TorusGeometry(0.226, 0.014, 6, 16), matGold);
    botRing.rotation.x = Math.PI / 2;
    botRing.position.y = 0.705;
    const topRing = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.014, 6, 16), matGold);
    topRing.rotation.x = Math.PI / 2;
    topRing.position.y = 1.118;
    lampG.add(botRing, topRing);
    // 8 根順著燈罩斜度精準傾斜貼合的金肋（每根對準八角稜線！）
    const ribTilt = Math.atan2(0.022, 0.42);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.425, 6), matGold);
      rib.position.set(Math.sin(a) * 0.214, 0.91, Math.cos(a) * 0.214);
      rib.rotation.order = 'YXZ';
      rib.rotation.y = a;
      rib.rotation.x = -ribTilt;
      lampG.add(rib);
    }
    // 金蓮燈蓋穩坐於上金箍頂端（零穿插）
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.252, 0.165, 8), matGold);
    cap.position.y = 1.212;
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), matGold);
    finial.position.y = 1.315;
    lampG.add(foot1, foot2, lotusPetals, stem, stemRing, cupHolder, shade, core, cap, finial);
    shrineGroup.add(lampG);
  });

  const shrineLight = new THREE.PointLight(0xFFD27D, 2.4, 22, 1.25);
  shrineLight.position.set(0, 4.9, 1.9);
  shrineGroup.add(shrineLight);
  animatedRefs.shrineLight = shrineLight;

  // ★ 需求 #11 ＋ V1.2 五營旗專屬青銅香爐與插香互動點！
  const fiveCampGroup = new THREE.Group();
  const fiveCampStand = createFiveCampsFlags(animatedRefs);
  fiveCampStand.position.set(-4.15, 1.06, 1.12);
  fiveCampGroup.add(fiveCampStand);

  const fcCenser = new THREE.Group();
  fcCenser.position.set(-4.15, 1.06, 1.78);
  const fcBronze = new THREE.MeshStandardMaterial({ color: 0x5A4123, roughness: 0.34, metalness: 0.70 });
  const fcReliefMat = new THREE.MeshStandardMaterial({ map: createCarvedCenserReliefTexture(), roughness: 0.36, metalness: 0.64 });
  const fcBody = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.28, 16), fcReliefMat);
  fcBody.position.y = 0.16;
  const fcBaseBand = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.018, 6, 16), matGold);
  fcBaseBand.rotation.x = Math.PI / 2;
  fcBaseBand.position.y = 0.04;
  const fcWaistBand = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.014, 6, 16), matGold);
  fcWaistBand.rotation.x = Math.PI / 2;
  fcWaistBand.position.y = 0.21;
  const fcRim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.026, 8, 16), matGold);
  fcRim.rotation.x = Math.PI / 2;
  fcRim.position.y = 0.30;
  const fcAsh = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 14), new THREE.MeshStandardMaterial({ color: 0xD8CFC0, roughness: 0.92 }));
  fcAsh.position.y = 0.29;
  [-0.24, 0.24].forEach((ex) => {
    const ear = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.016, 6, 10), matGold);
    ear.position.set(ex, 0.22, 0);
    fcCenser.add(ear);
  });
  fcCenser.add(fcBody, fcBaseBand, fcWaistBand, fcRim, fcAsh);
  fiveCampGroup.add(fcCenser);

  animatedRefs.fiveCampIncenseGroup.position.set(-4.15, 1.36, 1.78);
  fiveCampGroup.add(animatedRefs.fiveCampIncenseGroup);

  const fcHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.8, 1.5),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  fcHitbox.position.set(-4.15, 1.75, 1.48);
  fiveCampGroup.add(fcHitbox);
  tagInteractive(fiveCampGroup, 'fiveCamps');
  shrineGroup.add(fiveCampGroup);
  interactiveObjects.push(fiveCampGroup);

  // ★ 需求 #6：實景還原古樸四足灰黑錫鐵方鼎香爐（穩坐於新桌面 y = 1.06）
  const mainCenser = createAntiqueSquareCenser();
  mainCenser.position.set(0, 1.06, 1.48);
  shrineGroup.add(mainCenser);
  animatedRefs.mainIncenseGroup.position.set(0, 1.76, 1.48);
  shrineGroup.add(animatedRefs.mainIncenseGroup);

  // ★ V29 主神桌「清茶三杯」：真正中空開口白瓷杯（openEnded = true）＋ 敬茶後清晰可見的琥珀金黃茶湯與水光高光環！
  const teaCupsGroup = new THREE.Group();
  teaCupsGroup.position.set(0, 1.06, 2.04);
  const teaTray = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.05, 0.40), matWoodDark);
  teaTray.position.y = 0.025;
  const teaTrayRim = new THREE.Mesh(new THREE.BoxGeometry(1.40, 0.03, 0.44), matGold);
  teaTrayRim.position.y = 0.015;
  teaCupsGroup.add(teaTray, teaTrayRim);
  const matPorcelain = new THREE.MeshStandardMaterial({ color: 0xFFFDF6, roughness: 0.22, metalness: 0.05, side: THREE.DoubleSide });
  const matTeaLiquid = new THREE.MeshStandardMaterial({
    color: 0xD98A16,
    emissive: 0x8A5208,
    emissiveIntensity: 0.38,
    roughness: 0.08,
    metalness: 0.16,
    transparent: true,
    opacity: 0.94
  });
  const matTeaShine = new THREE.MeshBasicMaterial({
    color: 0xFFE99A,
    transparent: true,
    opacity: 0.65,
    toneMapped: false
  });
  [-0.42, 0, 0.42].forEach((cx) => {
    // 真正中空開口茶杯杯壁 ＋ 底部白瓷杯底，絕不再遮蓋杯內茶水！
    const cupWall = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.076, 0.145, 18, 1, true), matPorcelain);
    cupWall.position.set(cx, 0.122, 0);
    const cupBottom = new THREE.Mesh(new THREE.CircleGeometry(0.076, 18), matPorcelain);
    cupBottom.rotation.x = -Math.PI / 2;
    cupBottom.position.set(cx, 0.052, 0);
    const cupRim = new THREE.Mesh(new THREE.TorusGeometry(0.118, 0.011, 8, 20), matGold);
    cupRim.rotation.x = Math.PI / 2;
    cupRim.position.set(cx, 0.193, 0);
    // 盛滿茶水群組（未奉茶前隱藏於杯底，敬奉清茶後逐杯注滿停於 y = 0.178 清晰透亮！）
    const liquidGroup = new THREE.Group();
    liquidGroup.position.set(cx, 0.068, 0);
    liquidGroup.visible = false;
    const liquidDisk = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.102, 0.018, 18), matTeaLiquid);
    const liquidMeniscus = new THREE.Mesh(new THREE.TorusGeometry(0.096, 0.0045, 6, 18), matTeaShine);
    liquidMeniscus.rotation.x = Math.PI / 2;
    liquidMeniscus.position.y = 0.010;
    liquidGroup.add(liquidDisk, liquidMeniscus);
    teaCupsGroup.add(cupWall, cupBottom, cupRim, liquidGroup);
    animatedRefs.teaLiquids.push(liquidGroup);
  });
  const teaOfferHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.85, 1.1),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  teaOfferHitbox.position.y = 0.35;
  teaCupsGroup.add(teaOfferHitbox);
  tagInteractive(teaCupsGroup, 'teaOffer');
  shrineGroup.add(teaCupsGroup);
  interactiveObjects.push(teaCupsGroup);

  // ★ V32 沉穩雅致雕木「黑虎將軍（黑虎爺）」神龕（改為與神明桌一致的沉穩深紅木雕花頂棚與深木柱，取消刺眼紅條紋與亮黃柱；取消虎爺胸口紅環、強化威猛雪白虎牙與門牙！）
  const tigerShrineGroup = new THREE.Group();
  tigerShrineGroup.position.set(0, 0.02, 2.34);
  const matDarkBronze = new THREE.MeshStandardMaterial({ color: 0x8F6B36, metalness: 0.52, roughness: 0.38 });
  const nicheBack = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.90, 0.56), matEbony);
  nicheBack.position.set(0, 0.45, -0.18);
  const nicheBackGold = new THREE.Mesh(new THREE.PlaneGeometry(1.88, 0.72), new THREE.MeshStandardMaterial({ color: 0x4A2218, roughness: 0.72 }));
  nicheBackGold.position.set(0, 0.48, 0.11);
  const nicheFloor = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.08, 0.90), matWoodDark);
  nicheFloor.position.set(0, 0.04, 0.16);
  // 沉穩深紫檀木神龕檐蓋（低調古樸，與上方主神桌渾然一體，絕不搶眼！）
  const nicheRoof = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.085, 0.88), matWoodDark);
  nicheRoof.position.set(0, 0.90, 0.14);
  const nicheRoofCap = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.045, 0.82), matEbony);
  nicheRoofCap.position.set(0, 0.955, 0.14);
  const nicheRoofTrim = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.022, 0.90), matDarkBronze);
  nicheRoofTrim.position.set(0, 0.865, 0.14);
  [-1.00, 1.00].forEach((px) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.84, 10), matWoodDark);
    post.position.set(px, 0.44, 0.52);
    const postCap = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.046, 0.045, 10), matDarkBronze);
    postCap.position.set(px, 0.85, 0.52);
    const postBase = new THREE.Mesh(new THREE.CylinderGeometry(0.050, 0.056, 0.045, 10), matDarkBronze);
    postBase.position.set(px, 0.09, 0.52);
    tigerShrineGroup.add(post, postCap, postBase);
  });
  // 左右成對迷你紅燭台（外移至 ±0.84, z = 0.20，與香爐和雞蛋盤完全分離零碰觸！）
  [-0.84, 0.84].forEach((cx) => {
    const candleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.048, 0.10, 8), matDarkBronze);
    candleBase.position.set(cx, 0.13, 0.20);
    const candleStick = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.14, 8), matDeepRed);
    candleStick.position.set(cx, 0.24, 0.20);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), new THREE.MeshBasicMaterial({ color: 0xFFCC44, toneMapped: false }));
    flame.scale.set(0.8, 1.4, 0.8);
    flame.position.set(cx, 0.34, 0.20);
    tigerShrineGroup.add(candleBase, candleStick, flame);
  });
  const tigerGlowOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.060, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xFFD966, toneMapped: false })
  );
  tigerGlowOrb.position.set(0, 0.80, 0.14);
  tigerShrineGroup.add(nicheBack, nicheBackGold, nicheFloor, nicheRoof, nicheRoofCap, nicheRoofTrim, tigerGlowOrb);

  // 八角金邊朱紅神座（略收底座半徑至 0.315 並置於 z = 0.12，左右預留充足餘裕給雞蛋金盤與小香爐！）
  const tigerPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.315, 0.11, 8), matDeepRed);
  tigerPedestal.position.set(0, 0.13, 0.12);
  const tigerPedRim = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.028, 8), matGold);
  tigerPedRim.position.set(0, 0.185, 0.12);
  tigerShrineGroup.add(tigerPedestal, tigerPedRim);

  // ★ V29 精雕威武猛虎「黑虎將軍」：圓潤雙頰虎吻肉墊＋立體牙齦門牙四虎牙＋弧形紅舌＋深金色彎曲虎鬚＋船形 24K 招財金元寶！
  const tigerStat = new THREE.Group();
  tigerStat.position.set(0, 0.195, 0.12);
  const matLacquerBlack = new THREE.MeshStandardMaterial({ color: 0x16161B, roughness: 0.34, metalness: 0.24 });
  const matGoldStripe = new THREE.MeshStandardMaterial({ color: 0xF2B830, roughness: 0.28, metalness: 0.68 });
  const matDeepGoldWhisker = new THREE.MeshStandardMaterial({ color: 0xB88218, roughness: 0.26, metalness: 0.80 });
  const matYuanbaoGold = new THREE.MeshStandardMaterial({
    color: 0xFFCE3A,
    emissive: 0x5E3A04,
    emissiveIntensity: 0.24,
    roughness: 0.16,
    metalness: 0.90
  });
  const matCreamMane = new THREE.MeshStandardMaterial({ color: 0xEAD49C, roughness: 0.54, metalness: 0.12 });
  const matWhiteTooth = new THREE.MeshStandardMaterial({ color: 0xFFFDF5, roughness: 0.22 });
  const matTigerGum = new THREE.MeshStandardMaterial({ color: 0xA42C36, roughness: 0.42 });
  const matTigerTongue = new THREE.MeshStandardMaterial({ color: 0xCC2936, roughness: 0.35 });

  // 寬厚精壯虎軀與寬肩肌肉
  const tBody = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.34, 0.34, 4, 0.11), matLacquerBlack);
  tBody.position.set(0, 0.19, -0.02);
  const tChest = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.26, 0.14, 3, 0.06), matCreamMane);
  tChest.position.set(0, 0.20, 0.12);
  [-0.175, 0.175].forEach((sx) => {
    [0.12, 0.19, 0.26, 0.32].forEach((sy, si) => {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.026, 0.16 - si * 0.015), matGoldStripe);
      stripe.position.set(sx * (1 - si * 0.04), sy, -0.01);
      stripe.rotation.z = sx > 0 ? -0.32 : 0.32;
      tigerStat.add(stripe);
    });
    const haunch = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.18, 0.20, 3, 0.06), matLacquerBlack);
    haunch.position.set(sx * 0.92, 0.10, -0.06);
    tigerStat.add(haunch);
  });

  // ★ V32 移除胸口紅色頸環（保留清爽威武乳金虎胸與小巧招財金牌！）
  const tMedallion = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.018, 12), matGoldStripe);
  tMedallion.rotation.x = Math.PI / 2;
  tMedallion.position.set(0, 0.255, 0.192);

  // ★ 霸氣方闊猛虎頭顱與精雕虎口構造（圓潤雙頰虎吻肉墊＋鬍根黑點＋上顎紅牙齦＋四尖銳虎牙與小門牙＋弧形溝槽紅舌＋飽滿下顎！）
  const tSkull = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.29, 0.32, 4, 0.085), matLacquerBlack);
  tSkull.position.set(0, 0.455, 0.05);
  const tBridge = new THREE.Mesh(new RoundedBoxGeometry(0.125, 0.105, 0.15, 3, 0.034), matLacquerBlack);
  tBridge.position.set(0, 0.458, 0.212);
  // 圓潤立體左右雙頰虎吻肉墊（取代方塊上唇，虎口更生動霸氣！）
  [-1, 1].forEach((ms) => {
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.064, 12, 10), matCreamMane);
    pad.scale.set(1.16, 0.80, 1.05);
    pad.position.set(ms * 0.055, 0.405, 0.252);
    tigerStat.add(pad);
    // 肉墊上 3 顆立體深色鬍根點
    for (let d = 0; d < 3; d++) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 6, 6), matLacquerBlack);
      dot.position.set(ms * (0.045 + d * 0.024), 0.408 - (d % 2) * 0.012, 0.308 - d * 0.012);
      tigerStat.add(dot);
    }
  });
  // 人中深溝與圓潤威嚴虎鼻頭
  const tPhiltrum = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.046, 0.03), matLacquerBlack);
  tPhiltrum.position.set(0, 0.415, 0.298);
  const tNose = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), new THREE.MeshStandardMaterial({ color: 0xAD2222, roughness: 0.28 }));
  tNose.scale.set(1.25, 0.72, 0.85);
  tNose.position.set(0, 0.445, 0.304);
  [-0.022, 0.022].forEach((nx) => {
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.010, 6, 6), matLacquerBlack);
    nostril.position.set(nx, 0.438, 0.332);
    tigerStat.add(nostril);
  });
  // 深邃口腔、上下紅牙齦、微捲紅舌與精緻下顎毛簇（★ V32 拉開咆哮口部層次並突出 4 顆雪白尖銳虎牙＋上下門牙，正面一看清楚威武！）
  const tMouthDark = new THREE.Mesh(new THREE.SphereGeometry(0.082, 12, 10), new THREE.MeshBasicMaterial({ color: 0x1E0406 }));
  tMouthDark.scale.set(1.18, 0.78, 0.90);
  tMouthDark.position.set(0, 0.354, 0.218);
  const tUpperGum = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.011, 6, 14, Math.PI), matTigerGum);
  tUpperGum.rotation.x = Math.PI / 2;
  tUpperGum.position.set(0, 0.388, 0.244);
  const tLowerGum = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.010, 6, 14, Math.PI), matTigerGum);
  tLowerGum.rotation.x = Math.PI / 2;
  tLowerGum.position.set(0, 0.320, 0.240);
  // ★ V32 修正微捲虎舌座標（以 y = 0 為基準建構再平移至口內 y = 0.336，徹底解決先前 scale.y 導致紅舌掉到胸口的破圖！）
  const tongueCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.008, 0.214),
    new THREE.Vector3(0, 0.0, 0.252),
    new THREE.Vector3(0, -0.012, 0.276)
  ]);
  const tTongue = new THREE.Mesh(new THREE.TubeGeometry(tongueCurve, 10, 0.020, 8, false), matTigerTongue);
  tTongue.scale.set(1.35, 0.55, 1.0);
  tTongue.position.y = 0.338;
  const tLowerJaw = new THREE.Mesh(new THREE.SphereGeometry(0.070, 12, 10), matCreamMane);
  tLowerJaw.scale.set(1.14, 0.54, 1.16);
  tLowerJaw.position.set(0, 0.298, 0.232);
  const tChinTuft = new THREE.Mesh(new THREE.ConeGeometry(0.040, 0.044, 8), matCreamMane);
  tChinTuft.rotation.x = Math.PI;
  tChinTuft.position.set(0, 0.266, 0.246);
  // ★ V32 醒目雪白四顆弧形大虎牙 ＋ 上下整齊精巧門牙（前移至 z = 0.295..0.302 清楚展露不被虎吻遮擋！）
  const matBrightTooth = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, emissive: 0x3A3528, emissiveIntensity: 0.22, roughness: 0.16 });
  [-0.052, 0.052].forEach((fx) => {
    const upperFang = new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.056, 8), matBrightTooth);
    upperFang.rotation.x = Math.PI + 0.10;
    upperFang.position.set(fx, 0.366, 0.296);
    const lowerFang = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.042, 8), matBrightTooth);
    lowerFang.rotation.x = -0.10;
    lowerFang.position.set(fx * 0.84, 0.334, 0.290);
    tigerStat.add(upperFang, lowerFang);
  });
  [-0.026, -0.009, 0.009, 0.026].forEach((ix) => {
    const upInc = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.020, 0.012), matBrightTooth);
    upInc.position.set(ix, 0.378, 0.302 - Math.abs(ix) * 0.16);
    const loInc = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.016, 0.011), matBrightTooth);
    loInc.position.set(ix * 0.9, 0.326, 0.294 - Math.abs(ix) * 0.16);
    tigerStat.add(upInc, loInc);
  });

  // 額頭醒目 3D 粗體鎏金「王」字（三橫一豎）
  const wangV = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.105, 0.022), matGoldStripe);
  wangV.position.set(0, 0.555, 0.205);
  [0.595, 0.555, 0.515].forEach((wy, wi) => {
    const wangH = new THREE.Mesh(new THREE.BoxGeometry(wi === 1 ? 0.078 : 0.115, 0.018, 0.022), matGoldStripe);
    wangH.position.set(0, wy, 0.208 + (1 - wi) * 0.004);
    tigerStat.add(wangH);
  });
  tigerStat.add(wangV);

  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.072, 0.055, 2, 0.025), matLacquerBlack);
    ear.position.set(side * 0.155, 0.60, 0.01);
    const innerEar = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.038, 0.02), matGoldStripe);
    innerEar.position.set(side * 0.155, 0.60, 0.038);

    for (let r = 0; r < 3; r++) {
      const ruff = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.125, 6), r === 1 ? matGoldStripe : matLacquerBlack);
      ruff.rotation.z = -side * (Math.PI / 2 - 0.18 + r * 0.18);
      ruff.position.set(side * 0.215, 0.43 - r * 0.048, 0.07 + r * 0.02);
      tigerStat.add(ruff);
    }

    const browRidge = new THREE.Mesh(new RoundedBoxGeometry(0.115, 0.036, 0.048, 2, 0.012), matLacquerBlack);
    browRidge.position.set(side * 0.088, 0.506, 0.214);
    browRidge.rotation.z = side * 0.34;
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.024, 0.036), matGoldStripe);
    brow.position.set(side * 0.090, 0.522, 0.218);
    brow.rotation.z = side * 0.38;

    const eyeSocket = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.042, 0.026), matLacquerBlack);
    eyeSocket.position.set(side * 0.088, 0.476, 0.208);
    eyeSocket.rotation.z = side * 0.24;
    const eyeAmber = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.026, 0.022), new THREE.MeshBasicMaterial({ color: 0xFF9E00, toneMapped: false }));
    eyeAmber.position.set(side * 0.088, 0.474, 0.217);
    eyeAmber.rotation.z = side * 0.24;
    const eyeUpperLid = new THREE.Mesh(new THREE.BoxGeometry(0.084, 0.015, 0.024), matLacquerBlack);
    eyeUpperLid.position.set(side * 0.086, 0.487, 0.222);
    eyeUpperLid.rotation.z = side * 0.30;
    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.027, 0.018), new THREE.MeshBasicMaterial({ color: 0x060606 }));
    pupil.position.set(side * 0.086, 0.473, 0.225);
    const eyeGlint = new THREE.Mesh(new THREE.SphereGeometry(0.005, 5, 5), new THREE.MeshBasicMaterial({ color: 0xFFFDF0, toneMapped: false }));
    eyeGlint.position.set(side * 0.086 + 0.012, 0.478, 0.231);
    tigerStat.add(browRidge, eyeUpperLid, eyeGlint);

    // ★ V29 深金色流暢彎曲虎鬚（每側 3 根鎏金弧形猛虎鬚，威武高雅！）
    [-0.014, 0.002, 0.018].forEach((wy, wi) => {
      const wCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.085, 0.405 + wy, 0.285),
        new THREE.Vector3(side * 0.155, 0.408 + wy * 1.1 + (wi - 1) * 0.006, 0.275),
        new THREE.Vector3(side * 0.225, 0.392 + wy * 1.2 + (wi - 1) * 0.012, 0.248)
      ]);
      const whisk = new THREE.Mesh(new THREE.TubeGeometry(wCurve, 8, 0.0046, 6, false), matDeepGoldWhisker);
      tigerStat.add(whisk);
    });

    const leg = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.24, 0.11, 3, 0.035), matLacquerBlack);
    leg.position.set(side * 0.13, 0.12, 0.135);
    const legStripe = new THREE.Mesh(new THREE.BoxGeometry(0.116, 0.022, 0.075), matGoldStripe);
    legStripe.position.set(side * 0.13, 0.14, 0.14);
    const paw = new THREE.Mesh(new RoundedBoxGeometry(0.125, 0.072, 0.145, 3, 0.028), matLacquerBlack);
    paw.position.set(side * 0.13, 0.036, 0.185);
    [-0.032, 0, 0.032].forEach((cx) => {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.038, 5), matGoldStripe);
      claw.rotation.x = Math.PI / 2;
      claw.position.set(side * 0.13 + cx, 0.026, 0.268);
      tigerStat.add(claw);
    });
    tigerStat.add(ear, innerEar, brow, eyeSocket, eyeAmber, pupil, leg, legStripe, paw);
  });

  // ★ V29 雙爪間精雕「船形翹角 24K 招財金元寶」（兩端優雅翹起船耳＋束腰凹槽＋飽滿閃耀元寶心！）
  const yuanbaoGroup = new THREE.Group();
  yuanbaoGroup.position.set(0, 0.005, 0.225);
  {
    const segU = 28;
    const segV = 12;
    const pos = [];
    const idx = [];
    for (let iu = 0; iu <= segU; iu++) {
      const a = (iu / segU) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      for (let iv = 0; iv <= segV; iv++) {
        const v = iv / segV; // 0 = 穩固底座, 0.45 = 束腰內縮, 1.0 = 船形翹角外翻口沿
        const flareX = 0.072 * (0.76 - 0.14 * Math.sin(v * Math.PI) + 0.62 * Math.pow(v, 1.55));
        const flareZ = 0.052 * (0.78 - 0.10 * Math.sin(v * Math.PI) + 0.34 * Math.pow(v, 1.4));
        const wingLift = Math.pow(Math.abs(ca), 2.1) * 0.044 * Math.pow(v, 1.45);
        const y = 0.004 + v * 0.054 + wingLift;
        pos.push(ca * flareX, y, sa * flareZ);
      }
    }
    const row = segV + 1;
    for (let iu = 0; iu < segU; iu++) {
      for (let iv = 0; iv < segV; iv++) {
        const p0 = iu * row + iv;
        const p1 = (iu + 1) * row + iv;
        const p2 = (iu + 1) * row + (iv + 1);
        const p3 = iu * row + (iv + 1);
        idx.push(p0, p1, p3);
        idx.push(p1, p2, p3);
      }
    }
    const ybGeo = new THREE.BufferGeometry();
    ybGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    ybGeo.setIndex(idx);
    ybGeo.computeVertexNormals();
    const ybMatDouble = matYuanbaoGold.clone();
    ybMatDouble.side = THREE.DoubleSide;
    const ybHull = new THREE.Mesh(ybGeo, ybMatDouble);
    // 凹陷內托盤與飽滿光澤「元寶心」
    const ybInnerCradle = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.054, 0.022, 18), matYuanbaoGold);
    ybInnerCradle.scale.set(1.25, 1.0, 0.85);
    ybInnerCradle.position.y = 0.044;
    const ybPearl = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 12), matYuanbaoGold);
    ybPearl.scale.set(1.22, 0.84, 0.88);
    ybPearl.position.y = 0.072;
    const ybBase = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.060, 0.010, 16), matDeepGoldWhisker);
    ybBase.scale.set(1.20, 1.0, 0.82);
    ybBase.position.y = 0.005;
    yuanbaoGroup.add(ybBase, ybHull, ybInnerCradle, ybPearl);
  }

  // 粗壯高揚黑金環紋虎尾
  const tailGroup = new THREE.Group();
  for (let ti = 0; ti < 7; ti++) {
    const seg = new THREE.Mesh(
      new THREE.SphereGeometry(0.036 - ti * 0.002, 8, 8),
      ti % 2 === 1 ? matGoldStripe : matLacquerBlack
    );
    const a = ti * 0.36;
    seg.position.set(0.18 + Math.sin(a) * 0.085, 0.09 + ti * 0.056, -0.15 + Math.cos(a) * 0.07);
    tailGroup.add(seg);
  }
  tigerStat.add(tBody, tChest, tMedallion, tSkull, tBridge, tPhiltrum, tNose, tMouthDark, tUpperGum, tLowerGum, tTongue, tLowerJaw, tChinTuft, yuanbaoGroup, tailGroup);
  tigerShrineGroup.add(tigerStat);

  // ★ V29 精調雞蛋金盤位置 (+0.56, 0.42) 與精巧尺寸 (r = 0.185)，與神座、紅燭台、金柱完全保持 12cm+ 清爽間距零碰觸！
  const eggDish = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.135, 0.052, 18), matGold);
  eggDish.position.set(0.56, 0.106, 0.42);
  const eggDishInner = new THREE.Mesh(new THREE.CylinderGeometry(0.162, 0.142, 0.018, 18), matDeepRed);
  eggDishInner.position.set(0.56, 0.128, 0.42);
  tigerShrineGroup.add(eggDish, eggDishInner);

  const eggOffsets = [
    [-0.062, 0.042],
    [0.062, 0.042],
    [0.0, -0.055]
  ];
  eggOffsets.forEach(([ox, oz]) => {
    const eMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.056, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xFFF2D0, emissive: 0xFBBF24, emissiveIntensity: 0.26, roughness: 0.32 })
    );
    eMesh.scale.set(0.88, 1.24, 0.88);
    eMesh.position.set(0.56 + ox, 0.198, 0.42 + oz);
    eMesh.visible = false;
    tigerShrineGroup.add(eMesh);
    animatedRefs.tigerEggMeshes.push(eMesh);
  });

  // ★ V29 虎爺專屬雕花古銅小香爐對稱設於 (-0.56, 0.42)，與神座及紅燭零碰撞！
  const tigerCenser = new THREE.Group();
  tigerCenser.position.set(-0.56, 0.08, 0.42);
  const tcBody = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.098, 0.18, 16), fcReliefMat);
  tcBody.position.y = 0.10;
  const tcWaist = new THREE.Mesh(new THREE.TorusGeometry(0.116, 0.010, 6, 16), matGold);
  tcWaist.rotation.x = Math.PI / 2;
  tcWaist.position.y = 0.13;
  const tcRim = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.016, 6, 16), matGold);
  tcRim.rotation.x = Math.PI / 2;
  tcRim.position.y = 0.19;
  const tcAsh = new THREE.Mesh(new THREE.CylinderGeometry(0.106, 0.106, 0.03, 14), new THREE.MeshStandardMaterial({ color: 0xD8CFC0, roughness: 0.9 }));
  tcAsh.position.y = 0.185;
  [-0.135, 0.135].forEach((ex) => {
    const tEar = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.010, 5, 10), matGold);
    tEar.position.set(ex, 0.145, 0);
    tigerCenser.add(tEar);
  });
  tigerCenser.add(tcBody, tcWaist, tcRim, tcAsh);
  tigerShrineGroup.add(tigerCenser);

  animatedRefs.tigerIncenseGroup.position.set(-0.56, 0.28, 0.42);
  tigerShrineGroup.add(animatedRefs.tigerIncenseGroup);

  // 加大透明點擊熱區（方便手機直接點擊桌下虎爺）
  const tigerHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(2.35, 1.25, 1.45),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  tigerHitbox.position.set(0, 0.56, 0.38);
  tigerShrineGroup.add(tigerHitbox);
  // ★ V33 先標記主神桌可半透明遮擋，再掛載桌下虎爺神龕：確保站在拜虎爺位置時黑虎將軍與虎爺神龕永不變透明！
  markOccludable(shrineGroup, 'shrine-table');
  tagInteractive(tigerShrineGroup, 'tigerDeity');
  shrineGroup.add(tigerShrineGroup);
  interactiveObjects.push(tigerShrineGroup);

  // =========================================================================
  // 5. ★ V27 正殿左右兩張「鋪設神明專用紅金刺繡桌巾」大供桌 & 柔軟絎縫絲絨 36 拜墊 + 主神前方專屬跪墊！
  // =========================================================================
  const offeringTableGroup = new THREE.Group();
  offeringTableGroup.position.set(0, 0.36, -5.4);
  const altarClothTex = createAltarTableClothTexture();
  const altarClothFrontMat = new THREE.MeshStandardMaterial({ map: altarClothTex, roughness: 0.72, metalness: 0.12 });
  const altarClothTopMat = new THREE.MeshStandardMaterial({ color: 0xA8181D, roughness: 0.78, metalness: 0.08 });

  [-4.10, 4.10].forEach((tx) => {
    const singleTable = new THREE.Group();
    singleTable.position.x = tx;
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(3.48, 0.14, 1.42), matWoodDark);
    tableTop.position.set(0, 0.90, 0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    // 神明專用紅緞桌巾鋪於桌面（略微垂出桌沿＋四邊金線滾邊！）
    const clothTop = new THREE.Mesh(new THREE.BoxGeometry(3.54, 0.024, 1.48), altarClothTopMat);
    clothTop.position.set(0, 0.972, 0);
    clothTop.receiveShadow = true;
    const tableGoldRim = new THREE.Mesh(new THREE.BoxGeometry(3.58, 0.042, 1.52), matGold);
    tableGoldRim.position.set(0, 0.945, 0);
    // 前後與左右垂掛刺繡紅金桌裙（「福祿壽」團徽＋金色垂墜流蘇！）
    const frontSkirt = new THREE.Mesh(new THREE.PlaneGeometry(3.50, 0.72), altarClothFrontMat);
    frontSkirt.position.set(0, 0.58, 0.745);
    const backSkirt = new THREE.Mesh(new THREE.PlaneGeometry(3.50, 0.72), altarClothFrontMat);
    backSkirt.rotation.y = Math.PI;
    backSkirt.position.set(0, 0.58, -0.745);
    [-1, 1].forEach((sx) => {
      const sideSkirt = new THREE.Mesh(new THREE.PlaneGeometry(1.46, 0.72), altarClothFrontMat);
      sideSkirt.rotation.y = sx * (Math.PI / 2);
      sideSkirt.position.set(sx * 1.77, 0.58, 0);
      singleTable.add(sideSkirt);
    });
    [[-1.54, -0.54], [1.54, -0.54], [-1.54, 0.54], [1.54, 0.54]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.88, 0.16), matWoodDark);
      leg.position.set(lx, 0.44, lz);
      leg.castShadow = true;
      singleTable.add(leg);
    });
    const tableApron = new THREE.Mesh(new THREE.BoxGeometry(3.20, 0.24, 1.20), matDeepRed);
    tableApron.position.set(0, 0.72, 0);
    singleTable.add(tableTop, clothTop, tableGoldRim, frontSkirt, backSkirt, tableApron);
    offeringTableGroup.add(singleTable);
  });

  tagInteractive(offeringTableGroup, 'offeringTable');
  markOccludable(offeringTableGroup, 'offering-table');
  animatedRefs.offeringTableGroup = offeringTableGroup;
  root.add(offeringTableGroup);
  interactiveObjects.push(offeringTableGroup);

  // ★ V28 輕薄柔軟絲絨布面拜墊（參數化真實軟枕薄墊：高度縮減至 7.2cm、自然布面微弧收邊＋中央柔軟微陷，徹底去除厚重硬塊感！）
  const kneelMatsGroup = new THREE.Group();
  const softCushionTex = createSoftCushionTexture();
  const cushionMat = new THREE.MeshStandardMaterial({
    map: softCushionTex,
    color: 0xFFFFFF,
    roughness: 0.99,
    metalness: 0.0
  });
  const cushionPipingMat = new THREE.MeshStandardMaterial({ color: 0xE2B54A, roughness: 0.72, metalness: 0.14 });
  // ★ V29 前排拜墊旁精雕「傳統樟木木魚 ＋ 紅金錦緞座墊 ＋ 木魚槌」（取代原本兩顆圓球！）
  const createSculptedWoodenFish = (mirrorDir = 1) => {
    const wg = new THREE.Group();
    const matCamphor = new THREE.MeshStandardMaterial({ color: 0xB86228, roughness: 0.34, metalness: 0.08 });
    const matCamphorDark = new THREE.MeshStandardMaterial({ color: 0x6E3212, roughness: 0.46 });
    const matAcousticDark = new THREE.MeshBasicMaterial({ color: 0x1A0904 });
    const matBrocade = new THREE.MeshStandardMaterial({ color: 0xA61922, roughness: 0.72 });
    const matGoldThread = new THREE.MeshStandardMaterial({ color: 0xE8BD4C, roughness: 0.38, metalness: 0.45 });
    const matMalletCloth = new THREE.MeshStandardMaterial({ color: 0xF5EBD4, roughness: 0.82 });

    // 1. 紅金錦緞環形木魚墊
    const pad = new THREE.Mesh(new THREE.TorusGeometry(0.118, 0.032, 10, 22), matBrocade);
    pad.rotation.x = Math.PI / 2;
    pad.position.y = 0.032;
    pad.castShadow = true;
    const padGold = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.008, 6, 22), matGoldThread);
    padGold.rotation.x = Math.PI / 2;
    padGold.position.y = 0.032;
    wg.add(pad, padGold);

    // 2. 渾圓精雕樟木木魚本體（微長魚身＋背脊雕紋＋深凹長音縫＋左右圓音孔！）
    const fishBody = new THREE.Group();
    fishBody.position.set(0, 0.125, 0);
    const bodyCore = new THREE.Mesh(new THREE.SphereGeometry(0.128, 18, 14), matCamphor);
    bodyCore.scale.set(1.18, 0.88, 1.04);
    bodyCore.castShadow = true;
    // 後端微翹雙魚尾雕把（木魚經典握尾造型）
    const tailKnot = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.022, 8, 14), matCamphorDark);
    tailKnot.rotation.x = Math.PI / 2;
    tailKnot.scale.set(1.0, 0.65, 1.0);
    tailKnot.position.set(0, -0.004, -0.118);
    // 頂背魚鱗脊線浮雕
    const dorsalRidge = new THREE.Mesh(new THREE.TorusGeometry(0.118, 0.013, 6, 16, Math.PI * 0.72), matCamphorDark);
    dorsalRidge.rotation.y = Math.PI / 2;
    dorsalRidge.rotation.z = Math.PI * 0.14;
    dorsalRidge.position.set(0, 0.006, 0);
    // 正面深凹長條共鳴音縫（橫貫前腹，一眼認出是木魚！）
    const slitArc = new THREE.Mesh(
      new THREE.TorusGeometry(0.132, 0.013, 6, 16, Math.PI * 0.78),
      matAcousticDark
    );
    slitArc.rotation.x = Math.PI / 2;
    slitArc.rotation.z = Math.PI * 0.11;
    slitArc.position.set(0, -0.012, 0.008);
    // 音縫兩端圓形共鳴孔 ＋ 兩側魚鱗耳雕
    [-1, 1].forEach((s) => {
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.036, 10), matAcousticDark);
      hole.rotation.z = Math.PI / 2;
      hole.position.set(s * 0.138, -0.012, 0.042);
      const scaleRing = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.007, 6, 12), matCamphorDark);
      scaleRing.rotation.y = Math.PI / 2;
      scaleRing.position.set(s * 0.146, 0.012, -0.025);
      fishBody.add(hole, scaleRing);
    });
    fishBody.add(bodyCore, tailKnot, dorsalRidge, slitArc);
    wg.add(fishBody);

    // 3. ★ V32 左右完全鏡像對稱的木魚槌（細長木柄＋白布圓槌頭精準隨 mirrorDir 鏡像朝內！）
    const mallet = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.013, 0.25, 8), matCamphorDark);
    handle.rotation.z = Math.PI / 2;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), matMalletCloth);
    head.scale.set(1.25, 0.92, 0.92);
    head.position.set(mirrorDir * -0.125, 0, 0);
    mallet.add(handle, head);
    mallet.position.set(mirrorDir * 0.05, 0.026, 0.175);
    mallet.rotation.y = mirrorDir * 0.34;
    wg.add(mallet);

    wg.rotation.y = mirrorDir * -0.24;
    return wg;
  };

  // 參數化柔和軟枕幾何（貼地輕薄、四邊自然圓柔收縫、頂面柔軟膨起並微帶中央壓扣！）
  const buildSoftPillowGeo = (w, d, h = 0.068, dimpleDepth = 0.010, segX = 20, segZ = 16) => {
    const positions = [];
    const uvs = [];
    const indices = [];

    // 頂面軟枕曲面
    for (let iz = 0; iz <= segZ; iz++) {
      const v = iz / segZ;
      const nz = v * 2 - 1;
      for (let ix = 0; ix <= segX; ix++) {
        const u = ix / segX;
        const nx = u * 2 - 1;
        const edgeX = Math.max(0, 1 - Math.pow(Math.abs(nx), 2.6));
        const edgeZ = Math.max(0, 1 - Math.pow(Math.abs(nz), 2.6));
        const dome = Math.pow(edgeX * edgeZ, 0.42);
        const r2 = nx * nx + nz * nz;
        const dimple = Math.exp(-r2 * 10.0) * dimpleDepth;
        const y = 0.008 + Math.max(0, h * dome - dimple);
        positions.push(nx * (w * 0.5), y, nz * (d * 0.5));
        uvs.push(u, v);
      }
    }
    const row = segX + 1;
    for (let iz = 0; iz < segZ; iz++) {
      for (let ix = 0; ix < segX; ix++) {
        const a = iz * row + ix;
        const b = a + 1;
        const c = (iz + 1) * row + ix;
        const dd = c + 1;
        indices.push(a, c, b);
        indices.push(b, c, dd);
      }
    }

    // 四周柔順貼地裙邊（讓墊底無懸空黑縫且薄軟自然）
    const baseOffset = positions.length / 3;
    const addRimRing = (pts) => {
      const start = positions.length / 3;
      pts.forEach(([x, yTop, z, u, v]) => {
        positions.push(x, yTop, z); uvs.push(u, v);
        positions.push(x * 0.97, 0.001, z * 0.97); uvs.push(u, v);
      });
      for (let i = 0; i < pts.length - 1; i++) {
        const t0 = start + i * 2;
        const b0 = t0 + 1;
        const t1 = t0 + 2;
        const b1 = t0 + 3;
        indices.push(t0, b0, t1);
        indices.push(t1, b0, b1);
      }
    };
    const perim = [];
    for (let ix = 0; ix <= segX; ix++) { const u = ix / segX; perim.push([(u * 2 - 1) * w * 0.5, 0.008, d * 0.5, u, 1]); }
    for (let iz = segZ; iz >= 0; iz--) { const v = iz / segZ; perim.push([w * 0.5, 0.008, (v * 2 - 1) * d * 0.5, 1, v]); }
    for (let ix = segX; ix >= 0; ix--) { const u = ix / segX; perim.push([(u * 2 - 1) * w * 0.5, 0.008, -d * 0.5, u, 0]); }
    for (let iz = 0; iz <= segZ; iz++) { const v = iz / segZ; perim.push([-w * 0.5, 0.008, (v * 2 - 1) * d * 0.5, 0, v]); }
    addRimRing(perim);
    void baseOffset;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  };

  const singlePillowGeo = buildSoftPillowGeo(0.96, 0.78, 0.068, 0.011, 18, 14);
  const matTuftGeo = new THREE.SphereGeometry(0.026, 8, 6);

  KNEEL_MATS_36.forEach((m) => {
    const single = new THREE.Group();
    single.position.set(m.x, 0.365, m.z);
    const pillow = new THREE.Mesh(singlePillowGeo, cushionMat);
    pillow.castShadow = true;
    pillow.receiveShadow = true;
    const tuft = new THREE.Mesh(matTuftGeo, cushionPipingMat);
    tuft.scale.set(1.1, 0.32, 1.1);
    tuft.position.y = 0.066;
    single.add(pillow, tuft);

    if (m.z === -3.2 && Math.abs(m.x) === 2.4) {
      const woodenFish = createSculptedWoodenFish(m.x < 0 ? 1 : -1);
      woodenFish.position.set(m.x < 0 ? 0.66 : -0.66, 0.0, -0.14);
      single.add(woodenFish);
    }
    kneelMatsGroup.add(single);
  });

  tagInteractive(kneelMatsGroup, 'kneelMat');
  root.add(kneelMatsGroup);
  interactiveObjects.push(kneelMatsGroup);

  // ★ V34 拜主神前方橫式長跪墊（寬 2.12m × 深 0.58m，可容納 3 人並肩下跪，且左右與大供桌留出 1.32m 寬敞直行通道不繞大圈！）
  const mainWorshipMat = new THREE.Group();
  mainWorshipMat.position.set(0, 0.365, -5.0);
  const benchFrame = new THREE.Mesh(new RoundedBoxGeometry(2.12, 0.075, 0.58, 3, 0.018), matWoodDark);
  benchFrame.position.y = 0.062;
  benchFrame.castShadow = true;
  benchFrame.receiveShadow = true;
  const benchGoldStrip = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.018, 0.595), matGold);
  benchGoldStrip.position.y = 0.062;
  [[-0.94, -0.22], [0.94, -0.22], [-0.94, 0.22], [0.94, 0.22], [0, -0.22], [0, 0.22]].forEach(([lx, lz]) => {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.045, 0.10), matWoodDark);
    foot.position.set(lx, 0.022, lz);
    mainWorshipMat.add(foot);
  });
  const longPillowGeo = buildSoftPillowGeo(2.04, 0.52, 0.064, 0.005, 28, 12);
  const longPillow = new THREE.Mesh(longPillowGeo, cushionMat);
  longPillow.position.y = 0.095;
  longPillow.castShadow = true;
  longPillow.receiveShadow = true;
  // 橫式長跪墊上點綴 3 顆金色布面壓扣，更顯柔軟真實
  [-0.66, 0, 0.66].forEach((tx) => {
    const btn = new THREE.Mesh(matTuftGeo, cushionPipingMat);
    btn.scale.set(1.1, 0.32, 1.1);
    btn.position.set(tx, 0.156, 0);
    mainWorshipMat.add(btn);
  });
  const mwHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(2.26, 0.9, 1.15),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  mwHitbox.position.y = 0.45;
  mainWorshipMat.add(benchFrame, benchGoldStrip, longPillow, mwHitbox);
  tagInteractive(mainWorshipMat, 'mainWorship');
  root.add(mainWorshipMat);
  interactiveObjects.push(mainWorshipMat);

  // =========================================================================
  // 6. ★ V28 左側點香金紙桌（右側：缺口火光晃動點香器＋置中貼紙／中央：大小疊疊金箔金紙／左側：香桶與 48 支香！）
  //    ＆ 求籤擲筊案（移至右邊供桌旁併排 x = 6.95, z = -5.4 ＋ 原木紋精準貼合彎月杯筊！）
  // =========================================================================
  const incenseArea = new THREE.Group();
  incenseArea.position.set(-8.2, 0.36, 1.2);
  const iTable = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.90, 3.0), matWoodWarm);
  iTable.position.y = 0.45;
  iTable.castShadow = true;
  incenseArea.add(iTable);

  // ★ V29 香桶與點香器位置交換：香桶移至右側 (z = -1.02)，點香器移至左側 (z = +1.00)，金紙維持置中！
  const bucketGroup = new THREE.Group();
  bucketGroup.position.set(-0.02, 0.90, -1.02);
  const iBucketBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.06, 14), matGold);
  iBucketBase.position.y = 0.03;
  const iBucket = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.20, 0.46, 16), matDeepRed);
  iBucket.position.y = 0.27;
  const iBucketInner = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.18, 0.04, 14), new THREE.MeshBasicMaterial({ color: 0x261109 }));
  iBucketInner.position.y = 0.49;
  [0.14, 0.42].forEach((hy, hi) => {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(hi === 0 ? 0.214 : 0.236, 0.016, 6, 16), matGold);
    hoop.rotation.x = Math.PI / 2;
    hoop.position.y = hy;
    bucketGroup.add(hoop);
  });
  bucketGroup.add(iBucketBase, iBucket, iBucketInner);

  const stickFootGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.14, 5);
  const stickBodyGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.36, 5);
  const stickFootMat = new THREE.MeshStandardMaterial({ color: 0xD62828, roughness: 0.55 });
  const stickBodyMat = new THREE.MeshStandardMaterial({ color: 0xC69A58, roughness: 0.82 });
  const ringsSpec = [
    { count: 1, r: 0.0, tilt: 0.0 },
    { count: 9, r: 0.048, tilt: 0.05 },
    { count: 16, r: 0.098, tilt: 0.11 },
    { count: 22, r: 0.148, tilt: 0.17 }
  ];
  ringsSpec.forEach((ring) => {
    for (let s = 0; s < ring.count; s++) {
      const ang = (s / ring.count) * Math.PI * 2 + ring.r * 5;
      const singleStick = new THREE.Group();
      const foot = new THREE.Mesh(stickFootGeo, stickFootMat);
      foot.position.y = 0.07;
      const shaft = new THREE.Mesh(stickBodyGeo, stickBodyMat);
      shaft.position.y = 0.31;
      singleStick.add(foot, shaft);
      singleStick.position.set(
        Math.cos(ang) * ring.r,
        0.41 + ((s % 3) - 1) * 0.016,
        Math.sin(ang) * ring.r
      );
      singleStick.rotation.z = -Math.cos(ang) * ring.tilt;
      singleStick.rotation.x = Math.sin(ang) * ring.tilt;
      bucketGroup.add(singleStick);
    }
  });
  incenseArea.add(bucketGroup);

  // ★ V29 點香器與香桶交換至左側 (z = +1.00)，正面開大缺口清楚透見躍動火光 ＋ 「點香器」貼紙正中對齊！
  const igniterGroup = new THREE.Group();
  igniterGroup.position.set(0.08, 0.90, 1.00);
  const matSteel = new THREE.MeshStandardMaterial({ color: 0xC4CBD2, roughness: 0.30, metalness: 0.74, side: THREE.DoubleSide });
  const matDarkMetal = new THREE.MeshStandardMaterial({ color: 0x26282C, roughness: 0.55, metalness: 0.55 });
  const igBase = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.22, 0.46, 3, 0.025), matDeepRed);
  igBase.position.y = 0.11;
  const igTopPlate = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.03, 0.44), matSteel);
  igTopPlate.position.y = 0.23;
  // 不鏽鋼防風護罩：刻意於面向走道 (+X, theta = π/2) 留出 90° 寬敞前缺口，讓信眾清楚看到火光搖曳！
  const igHood = new THREE.Mesh(
    new THREE.CylinderGeometry(0.125, 0.145, 0.22, 20, 1, true, Math.PI * 0.76, Math.PI * 1.48),
    matSteel
  );
  igHood.position.set(0.02, 0.35, 0);
  const igBurnerSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.04, 14), matDarkMetal);
  igBurnerSeat.position.set(0.02, 0.26, 0);
  const igRimArc = new THREE.Mesh(new THREE.TorusGeometry(0.126, 0.012, 6, 18, Math.PI * 1.48), matGold);
  igRimArc.rotation.x = Math.PI / 2;
  igRimArc.rotation.z = Math.PI * 0.26;
  igRimArc.position.set(0.02, 0.46, 0);
  // 缺口內 3 朵動態搖曳火苗（紅橘外焰＋金黃中焰＋熾白焰心，隨動畫持續閃爍晃動！）
  const igFlamesSpec = [
    { x: 0.02, y: 0.34, z: 0.00, r: 0.048, h: 0.145, col: 0xFF5511 },
    { x: 0.03, y: 0.33, z: -0.022, r: 0.036, h: 0.115, col: 0xFF9E18 },
    { x: 0.03, y: 0.32, z: 0.020, r: 0.032, h: 0.105, col: 0xFFEE55 }
  ];
  igFlamesSpec.forEach((f, fi) => {
    const fm = new THREE.Mesh(
      new THREE.ConeGeometry(f.r, f.h, 8),
      new THREE.MeshBasicMaterial({ color: f.col, transparent: true, opacity: 0.94, toneMapped: false })
    );
    fm.position.set(f.x, f.y, f.z);
    fm.userData = { baseY: f.y, phase: fi * 1.9 };
    igniterGroup.add(fm);
    animatedRefs.igniterFlames.push(fm);
  });
  const igGlowHalo = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xFFAA28, transparent: true, opacity: 0.34, toneMapped: false })
  );
  igGlowHalo.position.set(0.04, 0.34, 0);
  animatedRefs.igniterFlames.push(igGlowHalo);
  // 開關移至機身右側，讓正面「點香器」貼紙完全正中對齊！
  const igSwitch = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.055, 0.03), matDarkMetal);
  igSwitch.position.set(0.08, 0.12, -0.235);
  const igCanvas = document.createElement('canvas');
  igCanvas.width = 256; igCanvas.height = 96;
  const igCtx = igCanvas.getContext('2d');
  igCtx.fillStyle = '#991B1B'; igCtx.fillRect(0, 0, 256, 96);
  igCtx.strokeStyle = '#FAD364'; igCtx.lineWidth = 6; igCtx.strokeRect(5, 5, 246, 86);
  igCtx.fillStyle = '#FFE985'; igCtx.font = '900 44px "Noto Serif TC", "Microsoft JhengHei", serif';
  igCtx.textAlign = 'center'; igCtx.textBaseline = 'middle';
  igCtx.fillText('點 香 器', 128, 49);
  const igTex = new THREE.CanvasTexture(igCanvas);
  igTex.colorSpace = THREE.SRGBColorSpace;
  const igSign = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.105), new THREE.MeshStandardMaterial({ map: igTex, roughness: 0.4 }));
  igSign.rotation.y = Math.PI / 2;
  igSign.position.set(0.215, 0.11, 0); // 嚴格置中於正面 (+X) 中央！
  igniterGroup.add(igBase, igTopPlate, igHood, igBurnerSeat, igRimArc, igGlowHalo, igSwitch, igSign);
  incenseArea.add(igniterGroup);

  // ★ V28 金紙與香桶交換：大小疊疊金箔金紙移至桌子中央區 (z = -0.06 & z = 0.38)！
  const matJossPaperBase = new THREE.MeshStandardMaterial({ color: 0xF3D474, roughness: 0.82 });
  const matJossPaperLight = new THREE.MeshStandardMaterial({ color: 0xF7DF92, roughness: 0.80 });
  const matGoldFoil = new THREE.MeshStandardMaterial({
    color: 0xFFD84D,
    emissive: 0x8A5A08,
    emissiveIntensity: 0.22,
    roughness: 0.18,
    metalness: 0.88
  });
  const addJossBundle = (x, y, z, w, h, d, rotY = 0, lighter = false) => {
    const bg = new THREE.Group();
    const paper = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lighter ? matJossPaperLight : matJossPaperBase);
    paper.position.y = h / 2;
    paper.castShadow = true;
    const foil = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.56, d * 0.56), matGoldFoil);
    foil.rotation.x = -Math.PI / 2;
    foil.position.y = h + 0.003;
    const band = new THREE.Mesh(new THREE.BoxGeometry(w * 0.16, h + 0.008, d + 0.008), matRedPillar);
    band.position.y = h / 2;
    bg.add(paper, foil, band);
    bg.position.set(x, y, z);
    bg.rotation.y = rotY;
    incenseArea.add(bg);
  };
  // 中央主疊（大張天金墊底＋中張壽金＋小張刈金交錯疊上）
  addJossBundle(0.02, 0.90, 0.08, 0.54, 0.16, 0.44, 0.04, false);
  addJossBundle(0.00, 1.06, 0.07, 0.42, 0.13, 0.34, -0.10, true);
  addJossBundle(0.03, 1.19, 0.09, 0.30, 0.10, 0.25, 0.14, false);
  // 旁側次疊（中張＋小張金箔金紙）
  addJossBundle(-0.18, 0.90, -0.40, 0.36, 0.14, 0.30, -0.06, true);
  addJossBundle(-0.16, 1.04, -0.41, 0.25, 0.09, 0.22, 0.18, false);

  tagInteractive(incenseArea, 'incense');
  markOccludable(incenseArea, 'incense-table');
  root.add(incenseArea);
  interactiveObjects.push(incenseArea);

  // ★ V34 求籤擲筊案對齊右邊供桌旁併排 (7.15, 0.36, -5.4)，並大幅強化 3D 聖筊飽滿厚實立體曲面與紅漆包邊！
  const fortuneDesk = new THREE.Group();
  fortuneDesk.position.set(7.15, 0.36, -5.4);
  const fTable = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.88, 1.28), matWoodDark);
  fTable.position.y = 0.44;
  fTable.castShadow = true;
  fortuneDesk.add(fTable);

  // ★ V29 籤筒與杯筊位置交換：瘦長紅字「籤筒」改置右側 (x = +0.28)！
  const tubeGroup = new THREE.Group();
  tubeGroup.position.set(0.28, 0.88, -0.04);
  const tubeMat = new THREE.MeshStandardMaterial({ color: 0xBA8E4A, roughness: 0.68 });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.142, 0.122, 0.72, 18), tubeMat);
  tube.position.y = 0.36;
  tube.castShadow = true;
  const tubeTopRim = new THREE.Mesh(new THREE.TorusGeometry(0.142, 0.014, 6, 18), matWoodDark);
  tubeTopRim.rotation.x = Math.PI / 2;
  tubeTopRim.position.y = 0.72;
  const tubeBotRim = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.016, 6, 18), matWoodDark);
  tubeBotRim.rotation.x = Math.PI / 2;
  tubeBotRim.position.y = 0.04;
  const tubeInnerDark = new THREE.Mesh(new THREE.CylinderGeometry(0.126, 0.115, 0.04, 16), new THREE.MeshBasicMaterial({ color: 0x24130A }));
  tubeInnerDark.position.y = 0.70;
  const tubeLabelTex = createFortuneTubeLabelTexture();
  const tubeLabel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.140, 0.130, 0.44, 14, 1, true, -Math.PI * 0.28, Math.PI * 0.56),
    new THREE.MeshStandardMaterial({ map: tubeLabelTex, roughness: 0.52 })
  );
  tubeLabel.position.y = 0.38;
  tubeGroup.add(tube, tubeTopRim, tubeBotRim, tubeInnerDark, tubeLabel);

  // 18 支加長修長竹籤（尾端染紅漆、自然扇開方便抽取）
  const fStickMat = new THREE.MeshStandardMaterial({ color: 0xF0D79E, roughness: 0.78 });
  const fStickTipMat = new THREE.MeshStandardMaterial({ color: 0xC82020, roughness: 0.55 });
  for (let i = 0; i < 18; i++) {
    const ringR = i < 6 ? 0.032 : 0.072;
    const a = (i / (i < 6 ? 6 : 12)) * Math.PI * 2 + (i < 6 ? 0.2 : 0.0);
    const stickGrp = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.56, 0.009), fStickMat);
    shaft.position.y = 0.28;
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.023, 0.07, 0.010), fStickTipMat);
    tip.position.y = 0.54;
    stickGrp.add(shaft, tip);
    stickGrp.position.set(Math.cos(a) * ringR, 0.56 + (i % 3) * 0.026, Math.sin(a) * ringR);
    stickGrp.rotation.z = -Math.cos(a) * (i < 6 ? 0.07 : 0.16);
    stickGrp.rotation.x = Math.sin(a) * (i < 6 ? 0.07 : 0.16);
    tubeGroup.add(stickGrp);
  }
  fortuneDesk.add(tubeGroup);

  // ★ V34 大幅強化 3D 月牙杯筊立體渾厚感：
  //   - 飽滿隆起高拱紅漆穹背（maxH 0.068 → 0.114，飽滿半圓拱弧 pow=0.55！）
  //   - 四周立體紅漆收邊側壁（bevelRim）包覆微凹自然原木年輪平面，無論正面或仰面皆立體感十足、零破圖！
  const buildCrescentBeiGeos = () => {
    const segU = 40;
    const segV = 18;
    const domePos = [];
    const domeIdx = [];
    const flatPos = [];
    const flatUvs = [];
    const flatIdx = [];

    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const t = u * 2 - 1;
      const arch = Math.pow(Math.max(0, 1 - t * t), 0.72);
      const x = t * 0.235;
      const yInner = 0.050 * arch;
      const yOuter = 0.182 * arch;
      // 飽滿渾厚穹背高度（比舊版厚 68%，側面與俯視立體度大幅提升！）
      const maxH = 0.114 * Math.pow(arch, 0.78);
      const lipH = 0.014 * Math.pow(arch, 0.72);

      for (let iv = 0; iv <= segV; iv++) {
        const v = iv / segV;
        const y = yInner + (yOuter - yInner) * v;
        const profile = Math.sin(v * Math.PI);
        // 圓潤飽滿拱背（底部先豎起紅漆厚邊再圓滑拱起，就像真實手工削製竹根聖筊！）
        const zDome = lipH * Math.pow(Math.max(0, profile), 0.28) + maxH * Math.pow(Math.max(0, profile), 0.56);
        domePos.push(x, y, zDome);
        // 原木年輪平面略帶 0.004m 微弧立體面，與外緣頂點完全密合！
        const zFlat = -0.004 * Math.pow(Math.max(0, profile), 0.75) * arch;
        flatPos.push(x, y, zFlat);
        flatUvs.push(u, v);
      }
    }

    const row = segV + 1;
    for (let iu = 0; iu < segU; iu++) {
      for (let iv = 0; iv < segV; iv++) {
        const a = iu * row + iv;
        const b = (iu + 1) * row + iv;
        const c = (iu + 1) * row + (iv + 1);
        const d = iu * row + (iv + 1);
        domeIdx.push(a, b, d);
        domeIdx.push(b, c, d);
        flatIdx.push(a, d, b);
        flatIdx.push(b, d, c);
      }
    }

    const domeGeo = new THREE.BufferGeometry();
    domeGeo.setAttribute('position', new THREE.Float32BufferAttribute(domePos, 3));
    domeGeo.setIndex(domeIdx);
    domeGeo.computeVertexNormals();

    const flatGeo = new THREE.BufferGeometry();
    flatGeo.setAttribute('position', new THREE.Float32BufferAttribute(flatPos, 3));
    flatGeo.setAttribute('uv', new THREE.Float32BufferAttribute(flatUvs, 2));
    flatGeo.setIndex(flatIdx);
    flatGeo.computeVertexNormals();

    return { domeGeo, flatGeo };
  };

  const { domeGeo: beiDomeGeo, flatGeo: beiFlatGeo } = buildCrescentBeiGeos();
  const beiRedMat = new THREE.MeshStandardMaterial({ color: 0xC61C24, roughness: 0.20, metalness: 0.12, side: THREE.FrontSide });
  const beiWoodMat = new THREE.MeshStandardMaterial({ map: createBeiWoodTexture(), roughness: 0.56, metalness: 0.03, side: THREE.FrontSide });
  const makeCrescentBei = (flatFaceUp = false) => {
    const g = new THREE.Group();
    const dome = new THREE.Mesh(beiDomeGeo, beiRedMat);
    dome.castShadow = true;
    dome.receiveShadow = true;
    const flatFace = new THREE.Mesh(beiFlatGeo, beiWoodMat);
    flatFace.castShadow = true;
    flatFace.receiveShadow = true;
    g.add(dome, flatFace);
    g.rotation.x = flatFaceUp ? Math.PI / 2 : -Math.PI / 2;
    return g;
  };
  // ★ V34 立體厚實一陰一陽「聖筊」（放大至 0.78 倍、仰面筊微斜倚於圓潤穹背上，立體感一眼可見！）
  const bei1 = makeCrescentBei(false); // 紅漆光滑飽滿凸背朝上（陰）
  bei1.scale.setScalar(0.78);
  bei1.position.set(-0.27, 0.884, -0.17);
  bei1.rotation.z = 0.42;
  const bei2 = makeCrescentBei(true);  // 原木年輪平面朝上、底部厚實紅漆圓弧支撐於桌面（陽）
  bei2.scale.setScalar(0.78);
  bei2.position.set(-0.25, 0.968, 0.19);
  bei2.rotation.z = -2.42;
  bei2.rotation.y = 0.10;
  fortuneDesk.add(bei1, bei2);
  tagInteractive(fortuneDesk, 'fortune');
  markOccludable(fortuneDesk, 'fortune-desk');
  root.add(fortuneDesk);
  interactiveObjects.push(fortuneDesk);

  // ★ 需求 #10：紅紙太歲燈牆板子抬高掛設（下緣離地約 1.45m 不貼近地板，並配精雕紅木護腰線板！）
  const taiSuiGroup = new THREE.Group();
  taiSuiGroup.position.set(9.62, 0.36, -2.8);
  const taiSuiTex = createTaiSuiWallTexture(initialState.taisui || []);
  animatedRefs.taiSuiTexture = taiSuiTex;
  const wallBoard = new THREE.Mesh(new THREE.BoxGeometry(0.26, 3.46, 7.6), matWoodDark);
  wallBoard.position.y = 3.18;
  const wallTopGold = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.10, 7.72), matGold);
  wallTopGold.position.y = 4.94;
  const wallBotGold = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.10, 7.72), matGold);
  wallBotGold.position.y = 1.42;
  const wainscotRail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.32, 7.5), matWoodDark);
  wainscotRail.position.y = 0.66;
  const wallFace = new THREE.Mesh(
    new THREE.PlaneGeometry(7.35, 3.26),
    new THREE.MeshStandardMaterial({ map: taiSuiTex, emissive: 0x6A2208, emissiveIntensity: 0.45, roughness: 0.56 })
  );
  wallFace.rotation.y = -Math.PI / 2;
  wallFace.position.set(-0.14, 3.18, 0);
  taiSuiGroup.add(wallBoard, wallTopGold, wallBotGold, wainscotRail, wallFace);
  tagInteractive(taiSuiGroup, 'taisui');
  markOccludable(taiSuiGroup, 'taisui-board');
  root.add(taiSuiGroup);
  interactiveObjects.push(taiSuiGroup);

  // =========================================================================
  // 7. 廟外大廣場：精雕金色雙層亭頂天公爐、左板凳大榕樹、右公佈欄、寶塔金爐、供品鋪、挑戰攤
  // =========================================================================
  const tiangongGroup = new THREE.Group();
  tiangongGroup.position.set(0, 0.03, 15.0);
  const tgPedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.40, 0.36, 8), matStone);
  tgPedestal.position.y = 0.18;
  tgPedestal.receiveShadow = true;
  const tgPedRim = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.28, 0.07, 8), matGold);
  tgPedRim.position.y = 0.36;
  // ★ 需求 #1：工匠精雕「金色雙層飛簷亭頂天公爐」，並校正香腳插入深度（y = 1.20 穩插香灰，絕不再飄浮空中！）
  const tgCenser = createCenser(0.84, 0.80, true, true);
  tgCenser.position.y = 0.88;
  animatedRefs.tiangongIncenseGroup.position.set(0, 1.20, 0);
  tiangongGroup.add(tgPedestal, tgPedRim, tgCenser, animatedRefs.tiangongIncenseGroup);
  tagInteractive(tiangongGroup, 'tiangong');
  markOccludable(tiangongGroup, 'tiangong-censer');
  exteriorGroup.add(tiangongGroup);
  interactiveObjects.push(tiangongGroup);

  // ★ V29 廟前大榕樹旁改為「大理石象棋下棋桌 ＋ 18 顆立體紅黑象棋對弈殘局 ＋ 4 張古樸長板凳」（兩位阿伯對弈閒聊，淑芬姊站一旁觀棋奉茶！）
  const createMarbleChessTable = () => {
    const tg = new THREE.Group();
    const matMarbleCream = new THREE.MeshStandardMaterial({ color: 0xF0ECE2, roughness: 0.42, metalness: 0.06 });
    const matMarbleRim = new THREE.MeshStandardMaterial({ color: 0xD5CEBE, roughness: 0.50, metalness: 0.08 });
    const matChessBoardTop = new THREE.MeshStandardMaterial({ map: createChessBoardTableTexture(), roughness: 0.34, metalness: 0.06 });
    const matBrassAccent = new THREE.MeshStandardMaterial({ color: 0xD4AF5A, roughness: 0.30, metalness: 0.68 });
    const matPieceWood = new THREE.MeshStandardMaterial({ color: 0xEAD4A2, roughness: 0.46 });
    const matPieceRed = new THREE.MeshStandardMaterial({ color: 0xB91C1C, roughness: 0.36 });
    const matPieceBlack = new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.36 });
    const matBowlWood = new THREE.MeshStandardMaterial({ color: 0x6F3C1E, roughness: 0.55 });
    const matCeladon = new THREE.MeshStandardMaterial({ color: 0xE6F2EC, roughness: 0.18, metalness: 0.08 });
    const matOolong = new THREE.MeshStandardMaterial({ color: 0xD49A2A, roughness: 0.16 });

    // 古典曲線蓮座大理石鼓座（配三道細黃銅金環）
    const pedPts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.39, 0.0),
      new THREE.Vector2(0.38, 0.06),
      new THREE.Vector2(0.29, 0.12),
      new THREE.Vector2(0.21, 0.24),
      new THREE.Vector2(0.25, 0.37),
      new THREE.Vector2(0.23, 0.45),
      new THREE.Vector2(0.33, 0.52),
      new THREE.Vector2(0.0, 0.52)
    ];
    const pedestal = new THREE.Mesh(new THREE.LatheGeometry(pedPts, 24), matMarbleCream);
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    [[0.33, 0.09], [0.225, 0.24], [0.24, 0.45]].forEach(([rr, ry]) => {
      const band = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.011, 6, 24), matBrassAccent);
      band.rotation.x = Math.PI / 2;
      band.position.y = ry;
      tg.add(band);
    });

    // 寬敞厚實方型切角大理石象棋桌面 (1.06m × 1.06m, 高 0.62m，恰好貼合雙人對坐手肘高度！)
    const topLower = new THREE.Mesh(new RoundedBoxGeometry(0.98, 0.055, 0.98, 3, 0.025), matMarbleRim);
    topLower.position.y = 0.545;
    topLower.castShadow = true;
    const topSlab = new THREE.Mesh(new RoundedBoxGeometry(1.06, 0.065, 1.06, 3, 0.028), matMarbleCream);
    topSlab.position.y = 0.595;
    topSlab.castShadow = true;
    topSlab.receiveShadow = true;
    const topBrassRim = new THREE.Mesh(new THREE.BoxGeometry(1.075, 0.016, 1.075), matBrassAccent);
    topBrassRim.position.y = 0.595;
    // 精細刻畫「楚河漢界」大理石象棋盤面（轉 90° 讓東西兩位棋友面對楚河漢界對弈！）
    const boardPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.92), matChessBoardTop);
    boardPlane.rotation.x = -Math.PI / 2;
    boardPlane.rotation.z = Math.PI / 2;
    boardPlane.position.y = 0.630;
    tg.add(pedestal, topLower, topSlab, topBrassRim, boardPlane);

    // 18 顆立體 3D 紅黑象棋子（精彩中盤對弈局面！）
    const pieceBaseGeo = new THREE.CylinderGeometry(0.032, 0.034, 0.018, 14);
    const pieceCapGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.005, 14);
    const pieceSpecs = [
      // 紅方（西側文雄伯 -X）
      [-0.31, 0.00, true], [-0.31, -0.14, true], [-0.31, 0.14, true],
      [-0.22, -0.07, true], [-0.22, 0.21, true], [-0.14, -0.21, true],
      [-0.14, 0.00, true], [-0.07, 0.14, true], [0.07, -0.14, true],
      // 黑方（東側阿忠哥 +X）
      [0.31, 0.00, false], [0.31, -0.14, false], [0.31, 0.14, false],
      [0.22, 0.07, false], [0.22, -0.21, false], [0.14, 0.21, false],
      [0.14, 0.00, false], [0.07, -0.07, false], [-0.07, 0.21, false]
    ];
    pieceSpecs.forEach(([px, pz, isRed]) => {
      const pBody = new THREE.Mesh(pieceBaseGeo, isRed ? matPieceRed : matPieceBlack);
      pBody.position.set(px, 0.639, pz);
      const pTop = new THREE.Mesh(pieceCapGeo, matPieceWood);
      pTop.position.set(px, 0.649, pz);
      const pDot = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.003, 10), isRed ? matPieceRed : matPieceBlack);
      pDot.position.set(px, 0.652, pz);
      tg.add(pBody, pTop, pDot);
    });

    // 桌緣兩側迷你實木棋盒與兩只青瓷熱茶杯（邊喝茶邊下棋最寫意！）
    [[-0.38, -0.42], [0.38, 0.42]].forEach(([bx, bz]) => {
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.044, 0.052, 14), matBowlWood);
      bowl.position.set(bx, 0.654, bz);
      tg.add(bowl);
    });
    [[-0.36, 0.41], [0.36, -0.41]].forEach(([cx, cz]) => {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.024, 0.052, 12), matCeladon);
      cup.position.set(cx, 0.654, cz);
      const tea = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.028, 0.008, 10), matOolong);
      tea.position.set(cx, 0.676, cz);
      tg.add(cup, tea);
    });
    return tg;
  };

  const benchArea = new THREE.Group();
  benchArea.position.set(-11.0, 0.03, 13.8);
  // ★ V38 4 張象棋長板凳各自配置精準易點透明觸控盒並標記 benchSide（北／西／東／南），大榕樹分離不搶點擊！
  const addChessBenchHitbox = (benchObj, side) => {
    const hb = new THREE.Mesh(
      new THREE.BoxGeometry(2.55, 0.95, 0.85),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hb.position.y = 0.48;
    benchObj.add(hb);
    tagInteractive(benchObj, 'bench');
    benchObj.traverse((c) => { c.userData.benchSide = side; });
  };
  const bench1 = createWoodenBench();
  bench1.position.set(-0.4, 0, -0.40); // 北側板凳 (-11.40, 13.40)
  addChessBenchHitbox(bench1, 'north');
  const bench2 = createWoodenBench();
  bench2.position.set(-1.82, 0, 1.30); // 西側板凳 (-12.82, 15.10) — 文雄伯對弈座（兩側空位皆可坐！）
  bench2.rotation.y = Math.PI / 2;
  addChessBenchHitbox(bench2, 'west');
  const bench3 = createWoodenBench();
  bench3.position.set(1.02, 0, 1.30);  // 東側板凳 (-9.98, 15.10) — 阿忠哥對弈座（兩側空位皆可坐！）
  bench3.rotation.y = -Math.PI / 2;
  addChessBenchHitbox(bench3, 'east');
  const bench4 = createWoodenBench();
  bench4.position.set(-0.4, 0, 3.00);  // 南側板凳 (-11.40, 16.80) — 觀棋納涼座
  bench4.rotation.y = Math.PI;
  addChessBenchHitbox(bench4, 'south');
  const chessTable = createMarbleChessTable();
  chessTable.position.set(-0.4, 0, 1.30); // 象棋桌正中 (-11.40, 15.10)
  tagInteractive(chessTable, 'bench');
  // ★ 大榕樹單獨放進 exteriorGroup（不再誤搶北側板凳點擊！擋住主角時樹冠一樣自動淡化）
  const banyan = createStylizedTree('banyan');
  banyan.position.set(-13.8, 0.03, 12.4);
  banyan.scale.setScalar(1.18);
  markOccludable(banyan, 'banyan-tree');
  exteriorGroup.add(banyan);
  benchArea.add(bench1, bench2, bench3, bench4, chessTable);
  exteriorGroup.add(benchArea);
  interactiveObjects.push(bench1, bench2, bench3, bench4, chessTable);

  // ★ 需求 #5：公佈欄移至母獅（10.1, 10.1）左側（6.7, 11.55），燒金紙動線與鏡頭完全無遮擋！
  const bulletinGroup = new THREE.Group();
  bulletinGroup.position.set(6.7, 0.03, 11.55);
  bulletinGroup.rotation.y = 0;
  [-1.25, 1.25].forEach((px) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.75, 0.18), matWoodDark);
    post.position.set(px, 1.375, 0);
    bulletinGroup.add(post);
  });
  const boardBox = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.95, 0.18), matWoodDark);
  boardBox.position.set(0, 1.88, 0);
  const bulletinTex = createBulletinTexture(initialState.bulletin);
  animatedRefs.bulletinTexture = bulletinTex;
  const boardFace = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.76), new THREE.MeshStandardMaterial({ map: bulletinTex, roughness: 0.62 }));
  boardFace.position.set(0, 1.88, 0.095);
  // ★ V31 公佈欄上方加上明顯「紅瓦筒瓦條紋」斜瓦頂＋屋脊＋寶藍小翹角！
  const boardRoofTex = createCrimsonRoofTileTexture();
  boardRoofTex.repeat.set(3.5, 1.4);
  const boardRoofMat = new THREE.MeshStandardMaterial({ map: boardRoofTex, roughness: 0.50, metalness: 0.08 });
  const boardRoof = new THREE.Mesh(new THREE.BoxGeometry(3.34, 0.14, 0.94), boardRoofMat);
  boardRoof.position.set(0, 2.98, 0.05);
  boardRoof.rotation.x = 0.22;
  const boardRidge = new THREE.Mesh(new THREE.BoxGeometry(3.42, 0.09, 0.12), matGold);
  boardRidge.position.set(0, 3.12, -0.34);
  for (let ri = -7; ri <= 7; ri++) {
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.96, 6), boardRoofMat);
    rib.rotation.x = Math.PI / 2 + 0.22;
    rib.position.set(ri * 0.22, 3.04, 0.05);
    bulletinGroup.add(rib);
  }
  bulletinGroup.add(boardBox, boardFace, boardRoof, boardRidge);
  tagInteractive(bulletinGroup, 'bulletin');
  markOccludable(bulletinGroup, 'bulletin-board');
  exteriorGroup.add(bulletinGroup);
  interactiveObjects.push(bulletinGroup);

  // ★ 需求 #3：精確八角對齊「三層燕尾寶塔金爐」—— 八根朱紅金柱精準立於八角邊角、較小勻稱的石雕爐口窗正置於前左平牆面正中央！
  const furnaceGroup = new THREE.Group();
  furnaceGroup.position.set(16.2, 0.03, 4.4);
  const OCT_ROT = Math.PI / 8; // 旋轉 22.5°：讓 8 面平牆正對 0°, ±45°, ±90°...，而 8 個稜角精準落在 (i + 0.5)*π/4！

  const fBase1 = new THREE.Mesh(new THREE.CylinderGeometry(1.70, 1.84, 0.24, 8), matStone);
  fBase1.position.y = 0.12;
  fBase1.rotation.y = OCT_ROT;
  const fBase2 = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.60, 0.28, 8), matCementLight);
  fBase2.position.y = 0.38;
  fBase2.rotation.y = OCT_ROT;
  // 八角石雕短護欄柱（精準對齊八角頂點！）
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) * (Math.PI / 4);
    const bx = Math.sin(a) * 1.56;
    const bz = Math.cos(a) * 1.56;
    const bal = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.068, 0.48, 6), matStone);
    bal.position.set(bx, 0.56, bz);
    const ballTop = new THREE.Mesh(new THREE.SphereGeometry(0.078, 8, 8), matGold);
    ballTop.position.set(bx, 0.82, bz);
    furnaceGroup.add(bal, ballTop);
  }

  // 紅磚八角主爐身 ＋ 八根朱紅角柱（★ 精準立於八個邊角稜線，絕不在牆面中間！）
  const fBody = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.28, 2.28, 8), matRedBrick);
  fBody.position.y = 1.66;
  fBody.rotation.y = OCT_ROT;
  fBody.castShadow = true;
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) * (Math.PI / 4);
    const rx = Math.sin(a) * 1.23;
    const rz = Math.cos(a) * 1.23;
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.072, 2.34, 8), matRedPillar);
    rib.position.set(rx, 1.66, rz);
    const ribCap = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.068, 0.12, 8), matGold);
    ribCap.position.set(rx, 2.78, rz);
    furnaceGroup.add(rib, ribCap);
  }
  // 爐身上緣彩繪水車堵環帶（與八角邊完全對齊，零重疊破圖！）
  const fFrieze = new THREE.Mesh(new THREE.CylinderGeometry(1.24, 1.24, 0.24, 8), matFrieze);
  fFrieze.position.y = 2.90;
  fFrieze.rotation.y = OCT_ROT;

  // ★ 需求 #3 & #15：勻稱精巧的凹陷石雕爐口窗（0.62 × 0.58，縮小更精緻！），精準正置於前左平牆面正中央（-45°），透見爐內熊熊火焰！
  const hearthGroup = new THREE.Group();
  const faceAngle = -Math.PI / 4; // 精準垂直於前左平牆面！
  const apothem = 1.14; // 略凸出於平牆面 apothem = r * cos(π/8) ≈ 1.13
  hearthGroup.position.set(Math.sin(faceAngle) * apothem, 1.14, Math.cos(faceAngle) * apothem);
  hearthGroup.rotation.y = faceAngle;

  // 爐膛深暗火室背板與紅熱炭床
  const chamberMat = new THREE.MeshStandardMaterial({ color: 0x1A0B06, roughness: 0.95 });
  const chamberBack = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.58, 0.12), chamberMat);
  chamberBack.position.set(0, 0, -0.06);
  const emberBed = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.10, 0.24),
    new THREE.MeshBasicMaterial({ color: 0xFF4500, toneMapped: false })
  );
  emberBed.position.set(0, -0.24, 0.04);

  // 四條獨立精雕石窗框（左右石柱＋頂拱石楣＋底石台，精巧比例 0.78 × 0.74！）
  const jLeft = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.74, 0.30), matStone);
  jLeft.position.set(-0.33, 0, 0.06);
  const jRight = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.74, 0.30), matStone);
  jRight.position.set(0.33, 0, 0.06);
  const jTop = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.12, 0.34), matStone);
  jTop.position.set(0, 0.33, 0.07);
  const jBot = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.12, 0.36), matStone);
  jBot.position.set(0, -0.33, 0.08);

  // 爐口細鍛鐵柵欄
  const ironBarMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.75, roughness: 0.38 });
  [-0.15, 0, 0.15].forEach((bx) => {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.56, 6), ironBarMat);
    bar.position.set(bx, 0, 0.19);
    hearthGroup.add(bar);
  });

  // 5 朵立體動態火焰（配合縮小窗框比例精調大小，外焰赤橘＋內焰金黃即時跳動燃燒！）
  const flameOuterMat = new THREE.MeshBasicMaterial({ color: 0xFF5511, transparent: true, opacity: 0.90, toneMapped: false });
  const flameMidMat = new THREE.MeshBasicMaterial({ color: 0xFF9918, transparent: true, opacity: 0.92, toneMapped: false });
  const flameCoreMat = new THREE.MeshBasicMaterial({ color: 0xFFF066, transparent: true, opacity: 0.96, toneMapped: false });
  [
    { x: -0.15, z: 0.02, r: 0.095, h: 0.34, mat: flameOuterMat },
    { x: 0.0, z: 0.00, r: 0.12, h: 0.44, mat: flameOuterMat },
    { x: 0.15, z: 0.02, r: 0.09, h: 0.32, mat: flameOuterMat },
    { x: -0.07, z: 0.06, r: 0.08, h: 0.30, mat: flameMidMat },
    { x: 0.05, z: 0.07, r: 0.075, h: 0.28, mat: flameCoreMat }
  ].forEach((fl, idx) => {
    const flameMesh = new THREE.Mesh(new THREE.ConeGeometry(fl.r, fl.h, 7), fl.mat);
    flameMesh.position.set(fl.x, -0.22 + fl.h * 0.5, fl.z);
    flameMesh.userData.baseY = flameMesh.position.y;
    flameMesh.userData.phase = idx * 1.15;
    hearthGroup.add(flameMesh);
    animatedRefs.furnaceFlames.push(flameMesh);
  });

  hearthGroup.add(chamberBack, emberBed, jLeft, jRight, jTop, jBot);
  const hearthLight = new THREE.PointLight(0xFF7B24, 2.3, 12.5, 1.4);
  hearthLight.position.set(-1.35, 1.45, 1.15);
  animatedRefs.hearthLight = hearthLight;

  // 三層豔紅琉璃瓦 × 寶藍飛簷寶塔屋頂 ＋ 精準八角對齊的起翹簷角與金鈴
  const buildPagodaTier = (y, rBottom, h, ridgeR, withBells) => {
    const tier = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(rBottom, h, 8), matCrimsonRoof);
    cone.position.y = y;
    cone.rotation.y = OCT_ROT;
    cone.castShadow = true;
    const blueRim = new THREE.Mesh(new THREE.TorusGeometry(ridgeR, 0.072, 6, 8), matCobaltTip);
    blueRim.rotation.x = Math.PI / 2;
    blueRim.rotation.z = OCT_ROT;
    blueRim.position.y = y - h * 0.46;
    tier.add(cone, blueRim);
    for (let i = 0; i < 8; i++) {
      const a = (i + 0.5) * (Math.PI / 4);
      const tx = Math.sin(a) * (rBottom * 1.02);
      const tz = Math.cos(a) * (rBottom * 1.02);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.062, 0.38, 5), matCobaltTip);
      tip.position.set(tx, y - h * 0.36, tz);
      tip.rotation.z = -Math.sin(a) * 0.72;
      tip.rotation.x = Math.cos(a) * 0.72;
      tier.add(tip);
      if (withBells) {
        const bell = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.13, 6), matGold);
        bell.position.set(Math.sin(a) * (rBottom * 0.96), y - h * 0.54, Math.cos(a) * (rBottom * 0.96));
        tier.add(bell);
      }
    }
    return tier;
  };

  const tier1 = buildPagodaTier(3.26, 1.82, 0.86, 1.72, true);
  const neck1 = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.90, 0.56, 8), matRedPillar);
  neck1.position.y = 3.74;
  neck1.rotation.y = OCT_ROT;
  const tier2 = buildPagodaTier(4.28, 1.38, 0.74, 1.30, true);
  const neck2 = new THREE.Mesh(new THREE.CylinderGeometry(0.50, 0.56, 0.42, 8), matGold);
  neck2.position.y = 4.68;
  neck2.rotation.y = OCT_ROT;
  const tier3 = buildPagodaTier(5.12, 0.94, 0.62, 0.88, false);

  // 金葫蘆寶頂
  const gourdBot = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), matGold);
  gourdBot.position.y = 5.56;
  const gourdTop = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), matGold);
  gourdTop.position.y = 5.84;
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.32, 8), matGold);
  spire.position.y = 6.10;

  furnaceGroup.add(fBase1, fBase2, fBody, fFrieze, hearthGroup, hearthLight, tier1, neck1, tier2, neck2, tier3, gourdBot, gourdTop, spire);
  tagInteractive(furnaceGroup, 'furnace');
  markOccludable(furnaceGroup, 'pagoda-furnace');
  exteriorGroup.add(furnaceGroup);
  interactiveObjects.push(furnaceGroup);

  // ★ V29 供品鋪往左移至 (-16.8, 0.03, 20.0)，徹底讓出廟前板凳象棋聊天區視線與走道！
  const shopStall = createCulturalStall(0xD97706, 0xFFF3D6, true);
  shopStall.position.set(-16.8, 0.03, 20.0);
  shopStall.rotation.y = Math.PI / 2;
  tagInteractive(shopStall, 'offeringShop');
  markOccludable(shopStall, 'shop-stall');
  exteriorGroup.add(shopStall);
  interactiveObjects.push(shopStall);

  const quizStall = createCulturalStall(0x0D9488, 0xFFF3D6, false);
  quizStall.position.set(12.2, 0.03, 20.0);
  quizStall.rotation.y = -Math.PI / 2;
  tagInteractive(quizStall, 'quizBooth');
  markOccludable(quizStall, 'quiz-stall');
  exteriorGroup.add(quizStall);
  interactiveObjects.push(quizStall);

  // =========================================================================
  // 8. 新廟特色景觀：右側「假山瀑布錦鯉池」＋ 廟旁樹下多組長板凳聊天區
  // =========================================================================
  const waterfallScenic = buildRockeryWaterfallPond(animatedRefs, markOccludable);
  waterfallScenic.position.set(20.8, 0.03, 15.2);
  tagInteractive(waterfallScenic, 'fishPond');
  exteriorGroup.add(waterfallScenic);
  interactiveObjects.push(waterfallScenic);

  // ★ 需求 #2：於廟宇左右與後方樹蔭下增設 5 座古色古香有靠背長板凳，信徒四處可坐下聊天！
  SIDE_BENCHES.forEach((b) => {
    const benchMesh = createGardenLongBench();
    benchMesh.position.set(b.x, 0.03, b.z);
    benchMesh.rotation.y = b.rotY;
    benchMesh.userData.zoneId = 'sideBench';
    benchMesh.userData.benchId = b.id;
    benchMesh.traverse(ch => {
      ch.userData.zoneId = 'sideBench';
      ch.userData.benchId = b.id;
    });
    markOccludable(benchMesh);
    exteriorGroup.add(benchMesh);
    interactiveObjects.push(benchMesh);
  });

  // ★ V28 已依意見移除廟後面石桌與泡茶組！

  // ★ V28 奉茶區轉 90° 移至原「求平安符」左側牆邊 (-8.55, 0.36, 4.45)，正面「奉茶」朝向殿內 (+X)！
  const teaStationGroup = new THREE.Group();
  teaStationGroup.position.set(-8.55, 0.36, 4.45);
  teaStationGroup.rotation.y = 0;
  const tsTable = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.86, 1.75), matWoodDark);
  tsTable.position.y = 0.43;
  tsTable.castShadow = true;
  const tsRim = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.08, 1.82), matGold);
  tsRim.position.y = 0.86;
  // 黃銅保溫奉茶桶（正面貼上鮮明紅字「奉茶」紅紙條！）
  const teaBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.30, 0.32, 0.68, 16),
    new THREE.MeshStandardMaterial({ color: 0xC99738, roughness: 0.34, metalness: 0.55 })
  );
  teaBarrel.position.set(-0.08, 1.22, -0.35);
  const teaLabelCanvas = document.createElement('canvas');
  teaLabelCanvas.width = 256;
  teaLabelCanvas.height = 256;
  const tlCtx = teaLabelCanvas.getContext('2d');
  tlCtx.fillStyle = '#FFF8E7';
  tlCtx.fillRect(0, 0, 256, 256);
  tlCtx.strokeStyle = '#C81E1E';
  tlCtx.lineWidth = 14;
  tlCtx.strokeRect(12, 12, 232, 232);
  tlCtx.fillStyle = '#B91C1C';
  tlCtx.font = '900 92px "Noto Serif TC", "Microsoft JhengHei", serif';
  tlCtx.textAlign = 'center';
  tlCtx.textBaseline = 'middle';
  tlCtx.fillText('奉', 128, 84);
  tlCtx.fillText('茶', 128, 178);
  const teaLabelTex = new THREE.CanvasTexture(teaLabelCanvas);
  teaLabelTex.colorSpace = THREE.SRGBColorSpace;
  // 弧形貼紙緊貼奉茶桶正面朝向走道 (+X)
  const teaBarrelLabel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.312, 0.326, 0.44, 14, 1, true, Math.PI * 0.22, Math.PI * 0.56),
    new THREE.MeshStandardMaterial({ map: teaLabelTex, roughness: 0.55 })
  );
  teaBarrelLabel.position.set(-0.08, 1.22, -0.35);
  const barrelLid = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 14), matDeepRed);
  barrelLid.position.set(-0.08, 1.56, -0.35);
  const barrelKnob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), matGold);
  barrelKnob.position.set(-0.08, 1.63, -0.35);

  // ★ V31 台灣傳統常見「白鐵（不鏽鋼）大茶壺／水壺」（拉絲白鐵壺身＋弧形鐵壺嘴＋平蓋黑防燙鈕＋上方拱形黑膠握把提把！）
  const stationTeapot = new THREE.Group();
  stationTeapot.position.set(0.14, 0.90, 0.36);
  const matSteelKettle = new THREE.MeshStandardMaterial({ color: 0xD8E0E8, roughness: 0.22, metalness: 0.88 });
  const matBakelite = new THREE.MeshStandardMaterial({ color: 0x1E2228, roughness: 0.58, metalness: 0.10 });
  const kettlePts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.168, 0.0),
    new THREE.Vector2(0.182, 0.035),
    new THREE.Vector2(0.178, 0.125),
    new THREE.Vector2(0.165, 0.205),
    new THREE.Vector2(0.122, 0.245),
    new THREE.Vector2(0.098, 0.255),
    new THREE.Vector2(0.0, 0.255)
  ];
  const spBody = new THREE.Mesh(new THREE.LatheGeometry(kettlePts, 22), matSteelKettle);
  spBody.castShadow = true;
  const spRib = new THREE.Mesh(new THREE.TorusGeometry(0.180, 0.006, 6, 22), matSteelKettle);
  spRib.rotation.x = Math.PI / 2;
  spRib.position.y = 0.125;
  const spLid = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.098, 0.022, 18), matSteelKettle);
  spLid.position.y = 0.262;
  const spKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.022, 0.034, 12), matBakelite);
  spKnob.position.y = 0.285;
  // 經典白鐵 S 弧長壺嘴
  const spoutCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.145, 0.085, 0),
    new THREE.Vector3(0.225, 0.145, 0),
    new THREE.Vector3(0.255, 0.235, 0),
    new THREE.Vector3(0.285, 0.268, 0)
  ]);
  const spSpout = new THREE.Mesh(new THREE.TubeGeometry(spoutCurve, 14, 0.020, 8, false), matSteelKettle);
  // 經典台灣白鐵茶壺上方拱形提把 ＋ 黑色防燙圓握把！
  const bailArch = new THREE.Mesh(new THREE.TorusGeometry(0.168, 0.011, 6, 20, Math.PI), matSteelKettle);
  bailArch.position.set(0, 0.235, 0);
  const bailGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.135, 10), matBakelite);
  bailGrip.rotation.z = Math.PI / 2;
  bailGrip.position.set(0, 0.402, 0);
  stationTeapot.add(spBody, spRib, spLid, spKnob, spSpout, bailArch, bailGrip);
  animatedRefs.stationTeapot = stationTeapot;
  // ★ V36 緊貼奉茶桌尺寸之精準觸控區（不再超出桌緣干擾一旁的淑芬點擊！）
  const teaStationHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(1.38, 1.72, 1.88),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  teaStationHitbox.position.y = 0.86;
  teaStationGroup.add(tsTable, tsRim, teaBarrel, teaBarrelLabel, barrelLid, barrelKnob, stationTeapot, teaStationHitbox);
  tagInteractive(teaStationGroup, 'teaStation');
  markOccludable(teaStationGroup, 'tea-station');
  root.add(teaStationGroup);
  interactiveObjects.push(teaStationGroup);

  // ★ V31 功德箱與平安符桌互換位置：功德箱移至南側 (8.42, 0.36, 3.45)，專責投 100 功德求取平安符！
  const meritBoxGroup = new THREE.Group();
  meritBoxGroup.position.set(8.42, 0.36, 3.45);
  meritBoxGroup.rotation.y = Math.PI;
  const mbBase = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.14, 0.92), matWoodDark);
  mbBase.position.y = 0.07;
  const mbBody = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.08, 0.78), matDeepRed);
  mbBody.position.y = 0.68;
  mbBody.castShadow = true;
  const mbTop = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.10, 0.88), matWoodDark);
  mbTop.position.y = 1.25;
  const mbSlot = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.09), matGold);
  mbSlot.rotation.y = Math.PI / 2;
  mbSlot.position.set(0, 1.31, 0);
  const mbSlotHole = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.045, 0.04), new THREE.MeshBasicMaterial({ color: 0x160A06 }));
  mbSlotHole.rotation.y = Math.PI / 2;
  mbSlotHole.position.set(0, 1.32, 0);
  const mbCanvas = document.createElement('canvas');
  mbCanvas.width = 256;
  mbCanvas.height = 256;
  const mctx = mbCanvas.getContext('2d');
  mctx.fillStyle = '#8E1515';
  mctx.fillRect(0, 0, 256, 256);
  mctx.strokeStyle = '#FAD364';
  mctx.lineWidth = 12;
  mctx.strokeRect(14, 14, 228, 228);
  mctx.fillStyle = '#FFE885';
  mctx.font = '900 56px "Noto Serif TC", "Microsoft JhengHei", serif';
  mctx.textAlign = 'center';
  mctx.textBaseline = 'middle';
  ['功', '德', '箱'].forEach((ch, idx) => mctx.fillText(ch, 128, 66 + idx * 62));
  const mbTex = new THREE.CanvasTexture(mbCanvas);
  mbTex.colorSpace = THREE.SRGBColorSpace;
  const mbFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.86),
    new THREE.MeshStandardMaterial({ map: mbTex, roughness: 0.42 })
  );
  mbFace.rotation.y = Math.PI / 2;
  mbFace.position.set(0.52, 0.68, 0);
  const mbHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 1.9, 1.8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  mbHitbox.position.y = 0.95;
  meritBoxGroup.add(mbBase, mbBody, mbTop, mbSlot, mbSlotHole, mbFace, mbHitbox);
  tagInteractive(meritBoxGroup, 'meritBox');
  markOccludable(meritBoxGroup, 'merit-box');
  root.add(meritBoxGroup);
  interactiveObjects.push(meritBoxGroup);

  // ★ V32 平安符介紹桌（改為溫潤橫式文創展架介紹牌，告別神主牌感 ＋ 精緻八角刺繡平安符袋＋紅金掛繩與流蘇，印上「觀音佛祖印／代天巡狩印」！）
  const talismanTableGroup = new THREE.Group();
  talismanTableGroup.position.set(8.42, 0.36, 2.05);
  talismanTableGroup.rotation.y = Math.PI;
  const ttTop = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.10, 1.32), matWoodDark);
  ttTop.position.y = 0.84;
  ttTop.castShadow = true;
  const ttCloth = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.03, 1.36), matDeepRed);
  ttCloth.position.y = 0.90;
  const ttGoldTrim = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.028, 1.38), matGold);
  ttGoldTrim.position.y = 0.875;
  [[-0.48, -0.56], [0.48, -0.56], [-0.48, 0.56], [0.48, 0.56]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.82, 0.11), matWoodDark);
    leg.position.set(lx, 0.41, lz);
    talismanTableGroup.add(leg);
  });
  const talTexGuanyin = createMiniTalismanTexture('guanyin');
  const talTexKing = createMiniTalismanTexture('king');
  const pouchTexGuanyin = createTalismanPouchTexture('guanyin');
  const pouchTexKing = createTalismanPouchTexture('king');
  [
    { z: -0.34, tex: talTexGuanyin, pouchTex: pouchTexGuanyin, clothColor: 0x166552 },
    { z: 0.34, tex: talTexKing, pouchTex: pouchTexKing, clothColor: 0xA8181D }
  ].forEach(({ z, tex, pouchTex, clothColor }) => {
    const stand = new THREE.Group();
    stand.position.set(0.02, 0.92, z);
    // 溫潤原木長方托盤
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.036, 0.56), matWoodWarm);
    tray.position.y = 0.018;
    const trayBorder = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.022, 0.58), matGold);
    trayBorder.position.y = 0.011;
    // 典雅橫式木質小展架（寬 0.48 × 高 0.30、輕盈後傾 28°，宛如博物館文創展板，徹底告別直立神主牌感！）
    const easel = new THREE.Group();
    easel.position.set(-0.14, 0.175, 0);
    easel.rotation.z = 0.42;
    const boardBack = new THREE.Mesh(new RoundedBoxGeometry(0.024, 0.31, 0.50, 2, 0.008), matWoodWarm);
    const boardFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.47, 0.285),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.34 })
    );
    boardFace.rotation.y = Math.PI / 2;
    boardFace.position.set(0.014, 0, 0);
    const easelProp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.022, 0.16), matWoodDark);
    easelProp.position.set(-0.07, -0.09, 0);
    easelProp.rotation.z = -0.58;
    easel.add(boardBack, boardFace, easelProp);

    // 托盤前方精緻擺放兩只「台灣傳統八角刺繡平安符香火袋」（帶朱印布面＋弧形紅絲掛繩＋金珠流蘇，完全不像鎖門！）
    const pouchSideMat = new THREE.MeshStandardMaterial({ color: clothColor, roughness: 0.68 });
    const pouchTopMat = new THREE.MeshStandardMaterial({ map: pouchTex, roughness: 0.48 });
    const redCordMat = new THREE.MeshStandardMaterial({ color: 0xC81E1E, roughness: 0.55 });
    [-0.13, 0.13].forEach((pz) => {
      const pGrp = new THREE.Group();
      pGrp.position.set(0.18, 0.052, pz);
      // 飽滿八角繡金符袋身
      const bagBody = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.076, 0.026, 6), pouchSideMat);
      bagBody.scale.set(1.18, 1.0, 0.96);
      const bagFace = new THREE.Mesh(new THREE.CircleGeometry(0.068, 6), pouchTopMat);
      bagFace.rotation.x = -Math.PI / 2;
      bagFace.rotation.z = -Math.PI / 2;
      bagFace.scale.set(1.14, 0.94, 1.0);
      bagFace.position.y = 0.0145;
      const bagGoldEdge = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.006, 6, 6), matGold);
      bagGoldEdge.rotation.x = Math.PI / 2;
      bagGoldEdge.scale.set(1.18, 0.96, 1.0);
      bagGoldEdge.position.y = 0.012;
      // 柔順弧形紅絲掛頸繩圈（向後垂放於托盤上）
      const cordCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.078, 0.004, -0.015),
        new THREE.Vector3(-0.145, 0.008, -0.042),
        new THREE.Vector3(-0.175, 0.006, 0.0),
        new THREE.Vector3(-0.145, 0.008, 0.042),
        new THREE.Vector3(-0.078, 0.004, 0.015)
      ]);
      const cord = new THREE.Mesh(new THREE.TubeGeometry(cordCurve, 14, 0.0055, 6, false), redCordMat);
      // 符袋底端金珠中國結＋迷你紅絲流蘇
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), matGold);
      bead.position.set(0.092, 0.002, 0);
      const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.048, 8), redCordMat);
      tassel.rotation.z = Math.PI / 2;
      tassel.position.set(0.120, 0.002, 0);
      pGrp.add(bagBody, bagFace, bagGoldEdge, cord, bead, tassel);
      stand.add(pGrp);
    });
    stand.add(tray, trayBorder, easel);
    talismanTableGroup.add(stand);
  });
  const ttHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(1.75, 1.65, 1.75),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  ttHitbox.position.y = 0.85;
  talismanTableGroup.add(ttTop, ttCloth, ttGoldTrim, ttHitbox);
  tagInteractive(talismanTableGroup, 'talismanTable');
  markOccludable(talismanTableGroup, 'talisman-table');
  root.add(talismanTableGroup);
  interactiveObjects.push(talismanTableGroup);

  // ★ V32 德慈宮「服務台」(7.90, 0.36, 5.75)：
  //   - 取消桌面多餘立牌，桌面清爽開闊
  //   - 登記書本置中 (z = 0) 並靠近伯公 (+X = +0.26)
  //   - 筆筒放於伯公右側順手處 (x = +0.26, z = -0.46)
  //   - 辦公檯燈放於桌面外側 (-X = -0.44, z = +0.44)，燈臂與燈罩向內朝伯公與書本照射，夜晚點亮暖光照書！
  const serviceDeskGroup = new THREE.Group();
  serviceDeskGroup.position.set(7.90, 0.36, 5.75);
  const sdBody = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.96, 2.38), matWoodDark);
  sdBody.position.y = 0.48;
  sdBody.castShadow = true;
  sdBody.receiveShadow = true;
  const sdTop = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.10, 2.52), matWoodWarm);
  sdTop.position.y = 1.00;
  sdTop.castShadow = true;
  const sdGoldTrim = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.045, 2.48), matGold);
  sdGoldTrim.position.y = 0.93;
  // 櫃檯正面大型紅金招牌「玉勅代天府德慈宮 服務台」（面向 -X 中央大殿！）
  const sdFrontSign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.14, 0.78),
    new THREE.MeshStandardMaterial({ map: createServiceDeskSignTexture(false), roughness: 0.42 })
  );
  sdFrontSign.rotation.y = -Math.PI / 2;
  sdFrontSign.position.set(-0.60, 0.49, 0);
  // 桌上翻開的太歲點燈登記冊：置中 (z = 0) 且靠近阿財伯 (x = +0.26)，方便伯公低頭翻閱！
  const ledgerLeft = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.032, 0.25), new THREE.MeshStandardMaterial({ color: 0xFFF9EC, roughness: 0.85 }));
  ledgerLeft.position.set(0.26, 1.066, -0.13);
  const ledgerRight = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.032, 0.25), new THREE.MeshStandardMaterial({ color: 0xFFF4DC, roughness: 0.85 }));
  ledgerRight.position.set(0.26, 1.066, 0.13);
  const ledgerSpine = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.038, 0.032), matDeepRed);
  ledgerSpine.position.set(0.26, 1.066, 0.0);
  // 筆筒置於阿財伯右側順手好拿處 (x = +0.26, z = -0.48)
  const penCup = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 0.14, 10), matWoodDark);
  penCup.position.set(0.26, 1.12, -0.48);
  [-0.015, 0.015].forEach((px, pi) => {
    const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 6), pi === 0 ? matRedPillar : matGold);
    pen.position.set(0.26 + px, 1.19, -0.48);
    pen.rotation.z = pi === 0 ? 0.18 : -0.15;
    serviceDeskGroup.add(pen);
  });
  // ★ V32 辦公用摺疊小檯燈：擺放於靠外側 (-X = -0.44, z = +0.44)，燈臂與金屬圓燈頭斜向內 (+X, -Z) 照向阿財伯與置中登記冊！
  const lampGroup = new THREE.Group();
  lampGroup.position.set(-0.44, 1.05, 0.44);
  const matOfficeMetal = new THREE.MeshStandardMaterial({ color: 0x2B3038, metalness: 0.72, roughness: 0.30 });
  const matChrome = new THREE.MeshStandardMaterial({ color: 0xD2DAE2, metalness: 0.86, roughness: 0.20 });
  const deskLampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.132, 0.042, 16), matOfficeMetal);
  deskLampBase.position.y = 0.021;
  const lampSwitch = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.020, 0.022), matRedPillar);
  lampSwitch.position.set(0.055, 0.046, -0.025);
  // 下臂向外略傾 ＋ 關節轉軸 ＋ 上臂朝內側伯公與置中書本 (+X, -Z) 優雅延伸！
  const lowerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.36, 8), matChrome);
  lowerArm.position.set(-0.04, 0.20, 0.03);
  lowerArm.rotation.z = 0.20;
  lowerArm.rotation.x = 0.14;
  const joint = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), matOfficeMetal);
  joint.position.set(-0.075, 0.37, 0.055);
  const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.014, 0.38, 8), matChrome);
  upperArm.position.set(0.06, 0.46, -0.05);
  upperArm.rotation.z = -0.74;
  upperArm.rotation.x = -0.52;
  // 斜傾辦公金屬圓筒燈頭（精準對準阿財伯面前的置中書本方向 +X, -Z 照射！）
  const lampHead = new THREE.Group();
  lampHead.position.set(0.20, 0.51, -0.15);
  lampHead.rotation.z = 0.54;
  lampHead.rotation.x = -0.26;
  const headCap = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.072, 0.085, 16), matOfficeMetal);
  headCap.position.y = 0.052;
  const headBell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.072, 0.125, 0.115, 18, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x2B3038, metalness: 0.68, roughness: 0.28, side: THREE.FrontSide })
  );
  headBell.position.y = -0.04;
  const innerShadeMat = new THREE.MeshBasicMaterial({ color: 0x6A6458, side: THREE.BackSide, toneMapped: false });
  const headBellInner = new THREE.Mesh(new THREE.CylinderGeometry(0.070, 0.122, 0.112, 18, 1, true), innerShadeMat);
  headBellInner.position.y = -0.04;
  const lampFaceMat = new THREE.MeshBasicMaterial({ color: 0xCFCBC0, side: THREE.DoubleSide, toneMapped: false });
  const lampFaceDisc = new THREE.Mesh(new THREE.CircleGeometry(0.118, 18), lampFaceMat);
  lampFaceDisc.rotation.x = Math.PI / 2;
  lampFaceDisc.position.y = -0.094;
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xDCD8CE, toneMapped: false });
  const deskLampBulb = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), bulbMat);
  deskLampBulb.position.y = -0.056;
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xFFE68A,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });
  const lightCone = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.62, 18, 1, true), coneMat);
  lightCone.position.y = -0.36;
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xFFF3A6,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });
  const bulbHalo = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 10), haloMat);
  bulbHalo.position.y = -0.082;
  lampHead.add(headCap, headBell, headBellInner, lampFaceDisc, deskLampBulb, bulbHalo, lightCone);

  const poolMat = new THREE.MeshBasicMaterial({
    color: 0xFFE484,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });
  const deskLightPool = new THREE.Mesh(new THREE.CircleGeometry(0.56, 24), poolMat);
  deskLightPool.rotation.x = -Math.PI / 2;
  // 精準灑落在阿財伯身前的置中登記書本上 (local +0.68, -0.44 → desk local x = +0.24, z = 0.0!)
  deskLightPool.position.set(0.68, 0.042, -0.44);
  lampGroup.add(deskLampBase, lampSwitch, lowerArm, joint, upperArm, lampHead, deskLightPool);
  animatedRefs.serviceDeskLamp = { bulbMat, innerShadeMat, lampFaceMat, haloMat, coneMat, poolMat };

  const sdHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 1.9, 2.8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  sdHitbox.position.y = 0.95;
  serviceDeskGroup.add(
    sdBody, sdTop, sdGoldTrim, sdFrontSign,
    ledgerLeft, ledgerRight, ledgerSpine, penCup,
    sdHitbox
  );
  tagInteractive(serviceDeskGroup, 'serviceDesk');
  markOccludable(serviceDeskGroup, 'service-desk');
  // ★ 重要：辦公小檯燈於 markOccludable 之後掛載，確保夜晚自動亮燈動態材質完整運作！
  tagInteractive(lampGroup, 'serviceDesk');
  serviceDeskGroup.add(lampGroup);
  root.add(serviceDeskGroup);
  interactiveObjects.push(serviceDeskGroup);

  // ★ V1.2 放山母雞（3 隻）：嚴格限定於純綠草坪區域內散步啄食，絕對不踏上石板人行道！
  const henConfigs = [
    {
      x: -9.8, z: -20.8, color: 0xF5E6CC, combColor: 0xD6382E,
      lawnBox: { minX: -12.6, maxX: -7.2, minZ: -21.9, maxZ: -19.85 }
    },
    {
      x: 9.8, z: -20.8, color: 0xC87A42, combColor: 0xC8232C,
      lawnBox: { minX: 7.2, maxX: 12.6, minZ: -21.9, maxZ: -19.85 }
    },
    {
      x: -20.5, z: -15.4, color: 0xFFFDF6, combColor: 0xE03131,
      lawnBox: { minX: -22.2, maxX: -18.9, minZ: -18.2, maxZ: -12.4 }
    }
  ];
  henConfigs.forEach((hc, idx) => {
    const hen = new THREE.Group();
    hen.position.set(hc.x, 0.04, hc.z);
    const bodyMat = new THREE.MeshStandardMaterial({ color: hc.color, roughness: 0.82 });
    const combMat = new THREE.MeshStandardMaterial({ color: hc.combColor, roughness: 0.55 });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xF59E0B, roughness: 0.5 });
    const hBody = new THREE.Mesh(new THREE.SphereGeometry(0.30, 12, 10), bodyMat);
    hBody.scale.set(0.95, 0.92, 1.24);
    hBody.position.set(0, 0.34, 0);
    hBody.castShadow = true;
    const hHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), bodyMat);
    hHead.position.set(0, 0.58, 0.25);
    const hComb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), combMat);
    hComb.scale.set(0.55, 1.2, 1.35);
    hComb.position.set(0, 0.74, 0.24);
    const hBeak = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 6), beakMat);
    hBeak.rotation.x = Math.PI / 2;
    hBeak.position.set(0, 0.55, 0.43);
    const hTail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 7), bodyMat);
    hTail.rotation.x = -0.85;
    hTail.position.set(0, 0.48, -0.34);
    [-0.10, 0.10].forEach((fx) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 6), beakMat);
      leg.position.set(fx, 0.10, 0);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), new THREE.MeshBasicMaterial({ color: 0x1A1412 }));
      eye.position.set(fx * 1.15, 0.61, 0.37);
      hen.add(leg, eye);
    });
    const henHitbox = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 8, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    henHitbox.position.y = 0.42;
    henHitbox.userData = { actorType: 'chicken', chickenIdx: idx };
    hen.add(hBody, hHead, hComb, hBeak, hTail, henHitbox);
    hen.userData = {
      lawnBox: hc.lawnBox,
      targetX: hc.x,
      targetZ: hc.z,
      waitTimer: 1.5 + idx * 1.2,
      scaredTimer: 0,
      hitbox: henHitbox,
      phase: idx * 2.1
    };
    exteriorGroup.add(hen);
    animatedRefs.chickens.push(hen);
  });

  // =========================================================================
  // 9. 互動標記光圈與高對比懸浮牌
  // =========================================================================
  const badgeHeights = {
    tiangong: 3.35,
    bench: 2.35,
    bulletin: 3.55,
    incense: 2.55,
    offeringTable: 2.4,
    mainWorship: 2.3,
    fortune: 2.5,
    taisui: 5.35,
    furnace: 5.15,
    offeringShop: 3.35,
    quizBooth: 3.35,
    fishPond: 2.35,
    teaStation: 2.55,
    teaOffer: 2.35,
    tigerDeity: 1.65,
    fiveCamps: 2.45,
    meritBox: 2.45,
    talismanTable: 2.45,
    serviceDesk: 2.95
  };

  Object.values(TEMPLE_CONFIG.zones).forEach((z) => {
    const [zx, , zz] = z.position;
    const isInside = ['incense', 'offeringTable', 'mainWorship', 'fortune', 'taisui', 'teaStation', 'teaOffer', 'tigerDeity', 'fiveCamps', 'meritBox', 'talismanTable', 'serviceDesk'].includes(z.id);
    const groundY = isInside ? 0.39 : 0.06;

    // ★ V36 全場所有互動光圈統一縮小並與供桌光圈大小完全一致（外徑 0.56、環厚 0.12！）
    const ringOuter = 0.56;
    const ringThick = 0.12;
    const makeZoneRing = (rx, rz, extraSide = null) => {
      const rMesh = new THREE.Mesh(
        new THREE.RingGeometry(ringOuter - ringThick, ringOuter, 32),
        new THREE.MeshBasicMaterial({ color: z.color, transparent: true, opacity: 0.58, side: THREE.DoubleSide, toneMapped: false })
      );
      rMesh.rotation.x = -Math.PI / 2;
      rMesh.position.set(rx, groundY, rz);
      rMesh.userData.baseColor = new THREE.Color(z.color);
      rMesh.userData.zoneId = z.id;
      if (extraSide) rMesh.userData.offeringSide = extraSide;
      (isInside ? root : exteriorGroup).add(rMesh);
      interactiveObjects.push(rMesh);
      return rMesh;
    };

    // ★ V38 象棋板凳區不鋪設地上綠光圈（保留 4 張板凳全向點擊與走近按 E 坐下，與其他樹蔭板凳視覺一致！）
    if (z.id !== 'bench') {
      const ring = makeZoneRing(z.standPos[0], z.standPos[2], z.id === 'offeringTable' ? 'left' : null);
      animatedRefs.zoneRings.set(z.id, ring);
      if (Array.isArray(z.extraStandPositions)) {
        z.extraStandPositions.forEach((sp) => {
          const extraRing = makeZoneRing(sp.pos[0], sp.pos[2], sp.side || null);
          animatedRefs.extraZoneRings.push({ zoneId: z.id, ring: extraRing });
        });
      }
    }

    // ★ V31 精簡頭上懸浮框：所有設施頭頂標籤平常預設隱藏，只有玩家走近該設施時才顯示！
    const badge = createZoneBadgeSprite(z.shortLabel, z.color);
    badge.position.set(zx, badgeHeights[z.id] || 2.6, zz);
    badge.userData.baseY = badge.position.y;
    badge.visible = false;
    tagInteractive(badge, z.id);
    (isInside ? root : exteriorGroup).add(badge);
    interactiveObjects.push(badge);
    animatedRefs.zoneBadges.set(z.id, badge);
    if (z.id === 'offeringTable') {
      const rightBadge = createZoneBadgeSprite(z.shortLabel, z.color);
      rightBadge.position.set(4.10, badgeHeights.offeringTable || 2.4, -5.4);
      rightBadge.userData.baseY = rightBadge.position.y;
      rightBadge.visible = false;
      tagInteractive(rightBadge, z.id);
      rightBadge.userData.offeringSide = 'right';
      root.add(rightBadge);
      interactiveObjects.push(rightBadge);
      animatedRefs.extraZoneBadges.push({ zoneId: 'offeringTable', side: 'right', x: 4.10, z: -4.12, badge: rightBadge });
    }
  });

  return {
    root,
    interactiveObjects,
    walkableMeshes,
    occludableMeshes,
    animatedRefs
  };
}

/**
 * 建造新廟專屬「豔紅琉璃瓦 × 寶藍剪黏燕尾大屋頂」（可選附帶福祿壽三仙與垂掛流蘇）
 */
function buildMinnanSwallowtailRoof({
  width,
  depth,
  baseY,
  peakHeight,
  gableWallX = 10.0,
  gableDepth = null,
  gableDropY = -0.55,
  matCrimsonRoof,
  matBlueRidge,
  matCobaltTip,
  matGold,
  matGableBrick = null,
  withSanXian = false,
  withTassels = true
}) {
  const g = new THREE.Group();
  const halfD = depth / 2;
  const gHalfD = (gableDepth ?? depth) / 2;
  const slopeLen = Math.hypot(halfD + 0.55, peakHeight);
  const slopeAngle = Math.atan2(peakHeight, halfD + 0.35);

  // 前後雙坡豔紅瓦頂
  const slopeFront = new THREE.Mesh(new THREE.BoxGeometry(width, 0.34, slopeLen), matCrimsonRoof);
  slopeFront.position.set(0, baseY + peakHeight * 0.5, halfD * 0.52);
  slopeFront.rotation.x = slopeAngle;
  slopeFront.castShadow = true;

  const slopeBack = new THREE.Mesh(new THREE.BoxGeometry(width, 0.34, slopeLen), matCrimsonRoof);
  slopeBack.position.set(0, baseY + peakHeight * 0.5, -halfD * 0.52);
  slopeBack.rotation.x = -slopeAngle;
  slopeBack.castShadow = true;

  g.add(slopeFront, slopeBack);

  // ★ 需求 #3：左右兩側「無縫銜接側牆的紅磚三角山牆」（底部延伸 gableDropY 緊密插入下方水車堵，厚度 0.46m 居中對齊側牆 x = ±10.0，100% 零隙縫零破圖！）
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-gHalfD, gableDropY);
  gableShape.lineTo(gHalfD, gableDropY);
  gableShape.lineTo(gHalfD, 0.08);
  gableShape.lineTo(0, peakHeight + 0.10);
  gableShape.lineTo(-gHalfD, 0.08);
  gableShape.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: 0.46, bevelEnabled: false });
  gableGeo.translate(0, 0, -0.23); // 讓山牆中心精準落在 x = ±gableWallX，與下方 0.46m 紅磚牆完全切齊！
  const gableMat = matGableBrick || new THREE.MeshStandardMaterial({ color: 0x9C3D2E, roughness: 0.85 });
  const gableTrimMat = new THREE.MeshStandardMaterial({ color: 0xE6EEF2, roughness: 0.65 });

  [-1, 1].forEach((side) => {
    const gable = new THREE.Mesh(gableGeo, gableMat);
    gable.rotation.y = Math.PI / 2;
    gable.position.set(side * gableWallX, baseY, 0);
    gable.castShadow = true;
    gable.receiveShadow = true;
    g.add(gable);

    // 傳統閩南山牆飾件：頂尖「彩繪懸魚／鵝頭墜」與三角形白藍泥塑收邊線
    const outerX = side * (gableWallX + 0.25);
    const pendant = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), matCobaltTip);
    pendant.scale.set(0.35, 1.35, 0.95);
    pendant.position.set(outerX, baseY + peakHeight * 0.64, 0);
    const pendantGold = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), matGold);
    pendantGold.position.set(outerX + side * 0.05, baseY + peakHeight * 0.64, 0);
    const baseMold = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.14, gHalfD * 2 + 0.08), gableTrimMat);
    baseMold.position.set(side * gableWallX, baseY + 0.06, 0);
    g.add(pendant, pendantGold, baseMold);

    // 側山斜脊寶藍鑲邊 ＋ ★ 需求 #6：流暢漸細「閩南工藝燕尾角」（一體成形自然起翹、不突兀！）
    [-1, 1].forEach((zDir) => {
      const verge = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, slopeLen + 0.2), matBlueRidge);
      verge.position.set(side * (width / 2 - 0.15), baseY + peakHeight * 0.52, zDir * halfD * 0.52);
      verge.rotation.x = zDir * slopeAngle;
      g.add(verge);

      // 屋角流暢漸細起翹燕尾（無接縫平滑漸收、優雅燕尾分叉尖！）
      const cornerBlade = createSculptedSwallowtailBlade(1.22, 0.86, 0.26, 0.18, matCobaltTip, matGold);
      cornerBlade.position.set(side * (width / 2 - 0.18), baseY + 0.04, zDir * (halfD + 0.14));
      cornerBlade.rotation.y = side > 0 ? (zDir > 0 ? -0.62 : 0.62) : (zDir > 0 ? Math.PI + 0.62 : Math.PI - 0.62);
      g.add(cornerBlade);
    });
  });

  // 寶藍剪黏交趾陶主正脊（加精雕金邊線條與脊肚祥雲金珠）
  const mainRidge = new THREE.Mesh(new THREE.BoxGeometry(width + 0.2, 0.66, 0.52), matBlueRidge);
  mainRidge.position.set(0, baseY + peakHeight + 0.24, 0);
  const ridgeCapGold = new THREE.Mesh(new THREE.BoxGeometry(width + 0.24, 0.12, 0.56), matGold);
  ridgeCapGold.position.set(0, baseY + peakHeight + 0.59, 0);
  const ridgeBotGold = new THREE.Mesh(new THREE.BoxGeometry(width + 0.22, 0.09, 0.56), matGold);
  ridgeBotGold.position.set(0, baseY + peakHeight - 0.09, 0);
  g.add(mainRidge, ridgeCapGold, ridgeBotGold);

  // ★ 需求 #6：主脊左右「一體流線漸收閩南大燕尾」（從屋脊根部 0.62m 寬自然向上收細成修長 V 型燕尾，細緻典雅絕不突兀！）
  [-1, 1].forEach((side) => {
    const mainBlade = createSculptedSwallowtailBlade(2.55, 1.98, 0.62, 0.34, matCobaltTip, matGold);
    mainBlade.position.set(side * (width / 2 - 0.08), baseY + peakHeight - 0.06, 0);
    if (side < 0) mainBlade.scale.x = -1;
    g.add(mainBlade);
  });

  // ★ 需求 #7：屋脊中央恭立「剪黏工藝級・福祿壽三仙」（彩繪蓮花祥雲座、繡花補子仙袍、飄逸飛天仙帶、精緻開面五官、玉如意／展開金軸／龍頭仙杖金葫蘆與粉紅壽桃！）
  if (withSanXian) {
    const sanXianGroup = new THREE.Group();
    sanXianGroup.position.set(0, baseY + peakHeight + 0.65, 0);
    sanXianGroup.scale.setScalar(1.22);

    const crimsonLacquer = new THREE.MeshStandardMaterial({ color: 0xB81D24, roughness: 0.42, metalness: 0.08 });
    const jadeMat = new THREE.MeshStandardMaterial({ color: 0x2EA67A, roughness: 0.32, metalness: 0.14 });
    const turquoiseMat = new THREE.MeshStandardMaterial({ color: 0x268A9E, roughness: 0.38, metalness: 0.12 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xFCE0C2, roughness: 0.58 });
    const whiteBeardMat = new THREE.MeshStandardMaterial({ color: 0xF8F6F0, roughness: 0.72 });
    const blackBeardMat = new THREE.MeshStandardMaterial({ color: 0x1E1A1A, roughness: 0.78 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x16100E, roughness: 0.3 });

    // 多層剪黏「祥雲蓮瓣彩繪底座」＋ 兩端捲雲寶珠
    const pedBot = new THREE.Mesh(new THREE.BoxGeometry(3.85, 0.14, 0.72), matGold);
    pedBot.position.y = 0.07;
    const pedMid = new THREE.Mesh(new THREE.BoxGeometry(3.56, 0.18, 0.64), crimsonLacquer);
    pedMid.position.y = 0.22;
    const pedTop = new THREE.Mesh(new THREE.BoxGeometry(3.42, 0.08, 0.60), matGold);
    pedTop.position.y = 0.34;
    sanXianGroup.add(pedBot, pedMid, pedTop);

    // 底座祥雲彩瓷珠飾
    for (let i = -3; i <= 3; i++) {
      const lotus = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), i % 2 === 0 ? turquoiseMat : matGold);
      lotus.scale.set(1.2, 0.65, 0.85);
      lotus.position.set(i * 0.48, 0.22, 0.33);
      sanXianGroup.add(lotus);
    }
    [-2.02, 2.02].forEach((dx) => {
      const cloudCurl = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.065, 7, 14), turquoiseMat);
      cloudCurl.position.set(dx, 0.28, 0);
      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 8), matGold);
      pearl.position.set(dx + (dx > 0 ? 0.12 : -0.12), 0.44, 0);
      sanXianGroup.add(cloudCurl, pearl);
    });

    [
      { key: 'fu', x: -1.08, h: 1.06, robe: 0x1D5E96, trim: 0xF2C94C, ribbon: 0x38BDF8 },
      { key: 'lu', x: 0.0, h: 1.22, robe: 0xC8232C, trim: 0xF8D358, ribbon: 0xF59E0B },
      { key: 'shou', x: 1.08, h: 1.04, robe: 0x267A4B, trim: 0xF2C94C, ribbon: 0xF472B6 }
    ].forEach((s) => {
      const fig = new THREE.Group();
      const robeMat = new THREE.MeshStandardMaterial({ color: s.robe, roughness: 0.42, metalness: 0.10 });
      const ribbonMat = new THREE.MeshStandardMaterial({ color: s.ribbon, roughness: 0.48 });

      // 蓮花圓座腳台
      const footBase = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.34, 0.10, 12), matGold);
      footBase.position.y = 0.42;
      // 多層仙袍（下襬寬袍＋金邊雲肩＋胸前方形「官服補子」繡牌＋垂玉腰帶）
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.33, s.h, 14), robeMat);
      body.position.y = 0.46 + s.h / 2;
      const robeHem = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.036, 6, 16), matGold);
      robeHem.rotation.x = Math.PI / 2;
      robeHem.position.y = 0.49;
      const cloudCollar = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.048, 7, 14), matGold);
      cloudCollar.rotation.x = Math.PI / 2;
      cloudCollar.position.y = 0.46 + s.h - 0.04;
      const mandarinBadge = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.05), matGold);
      mandarinBadge.position.set(0, 0.46 + s.h * 0.64, 0.21);
      const belt = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.042, 6, 16), matGold);
      belt.rotation.x = Math.PI / 2;
      belt.position.y = 0.46 + s.h * 0.44;
      const jadeDrop = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), jadeMat);
      jadeDrop.position.set(0.14, 0.46 + s.h * 0.34, 0.24);

      // 背後飄逸「彩繪仙帶」拱弧
      const ribbonArch = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.032, 6, 18, Math.PI), ribbonMat);
      ribbonArch.position.set(0, 0.46 + s.h * 0.85, -0.14);

      // 雙層寬袍袖＋雙手
      [-1, 1].forEach((side) => {
        const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 0.44, 10), robeMat);
        sleeve.position.set(side * 0.25, 0.46 + s.h * 0.62, 0.08);
        sleeve.rotation.z = side * -0.34;
        const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.024, 6, 12), matGold);
        cuff.position.set(side * 0.29, 0.46 + s.h * 0.45, 0.13);
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.062, 8, 8), skinMat);
        hand.position.set(side * 0.18, 0.46 + s.h * 0.52, 0.24);
        fig.add(sleeve, cuff, hand);
      });

      // 精緻開面頭部（雙耳、眉眼、笑頰）
      const headY = 0.46 + s.h + 0.18;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.20, 14, 14), skinMat);
      head.position.y = headY;
      [-0.19, 0.19].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), skinMat);
        ear.scale.set(0.6, 1.4, 0.7);
        ear.position.set(ex, headY - 0.02, 0.0);
        fig.add(ear);
      });
      [-0.068, 0.068].forEach((ex) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), eyeMat);
        eye.position.set(ex, headY + 0.02, 0.185);
        fig.add(eye);
      });
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 6), skinMat);
      nose.position.set(0, headY - 0.02, 0.20);
      fig.add(footBase, body, robeHem, cloudCollar, mandarinBadge, belt, jadeDrop, ribbonArch, head, nose);

      if (s.key === 'fu') {
        // 福星（天官賜福）：雙翼金飾烏紗官帽＋三綹長黑髯＋精雕弧形「金玉如意」！
        const hatBase = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.18, 10), blackBeardMat);
        hatBase.position.y = headY + 0.20;
        const hatTop = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.20), matGold);
        hatTop.position.set(0, headY + 0.32, -0.02);
        [-0.24, 0.24].forEach((wx) => {
          const fin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.035), matGold);
          fin.position.set(wx, headY + 0.20, -0.04);
          fin.rotation.z = wx > 0 ? 0.16 : -0.16;
          fig.add(fin);
        });
        const beard = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.36, 8), blackBeardMat);
        beard.rotation.x = Math.PI;
        beard.position.set(0, headY - 0.24, 0.17);
        // 弧形玉如意（柄＋祥雲如意首）
        const ruyiShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.022, 0.44, 8), jadeMat);
        ruyiShaft.position.set(0.04, 0.46 + s.h * 0.58, 0.29);
        ruyiShaft.rotation.z = 0.68;
        const ruyiHead = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), matGold);
        ruyiHead.scale.set(1.2, 0.85, 0.6);
        ruyiHead.position.set(-0.14, 0.46 + s.h * 0.72, 0.30);
        fig.add(hatBase, hatTop, beard, ruyiShaft, ruyiHead);
      } else if (s.key === 'lu') {
        // 祿星（加官進祿，居中最高）：雙層帝王金相帽＋長展翅金翎＋五綹鬚＋雙手展開「金字天官賜福長軸」！
        const crown1 = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.22, 0.26, 12), matGold);
        crown1.position.y = headY + 0.24;
        const crown2 = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.22, 8), matGold);
        crown2.position.y = headY + 0.46;
        const crownGem = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), crimsonLacquer);
        crownGem.position.set(0, headY + 0.28, 0.21);
        [-0.32, 0.32].forEach((wx) => {
          const wing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.085, 0.04), matGold);
          wing.position.set(wx, headY + 0.22, -0.02);
          wing.rotation.z = wx > 0 ? 0.18 : -0.18;
          fig.add(wing);
        });
        const beard = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 10), blackBeardMat);
        beard.rotation.x = Math.PI;
        beard.position.set(0, headY - 0.26, 0.18);
        // 雙手展開祝福卷軸
        const scrollPaper = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.20, 0.03), new THREE.MeshStandardMaterial({ color: 0xFFF3C4, roughness: 0.5 }));
        scrollPaper.position.set(0, 0.46 + s.h * 0.54, 0.30);
        [-0.22, 0.22].forEach((sx) => {
          const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.28, 8), matGold);
          roller.position.set(sx, 0.46 + s.h * 0.54, 0.30);
          fig.add(roller);
        });
        fig.add(crown1, crown2, crownGem, beard, scrollPaper);
      } else {
        // 壽星（南極仙翁）：圓潤高聳壽額＋濃密雪白長眉與三層白鬚＋龍頭仙杖懸掛金葫蘆＋掌中粉紅蟠桃！
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.20, 14, 12), skinMat);
        dome.scale.set(0.96, 1.38, 0.96);
        dome.position.y = headY + 0.18;
        [-0.075, 0.075].forEach((bx) => {
          const brow = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.032, 0.04), whiteBeardMat);
          brow.position.set(bx, headY + 0.07, 0.19);
          brow.rotation.z = bx > 0 ? -0.25 : 0.25;
          fig.add(brow);
        });
        const beard = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.52, 10), whiteBeardMat);
        beard.rotation.x = Math.PI;
        beard.position.set(0, headY - 0.30, 0.18);
        // 龍頭木仙杖 ＋ 懸掛雙球金葫蘆！
        const staffMat = new THREE.MeshStandardMaterial({ color: 0x7A4B2A, roughness: 0.72 });
        const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 1.56, 8), staffMat);
        staff.position.set(0.34, 1.14, 0.14);
        const staffHead = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.026, 6, 12, Math.PI * 1.3), staffMat);
        staffHead.position.set(0.38, 1.92, 0.14);
        const gourdBot = new THREE.Mesh(new THREE.SphereGeometry(0.072, 8, 8), matGold);
        gourdBot.position.set(0.44, 1.66, 0.14);
        const gourdTop = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), matGold);
        gourdTop.position.set(0.44, 1.76, 0.14);
        // 粉紅帶葉大蟠桃
        const peach = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), new THREE.MeshStandardMaterial({ color: 0xFF7B89, emissive: 0xD94B4B, emissiveIntensity: 0.22, roughness: 0.38 }));
        peach.scale.set(1.0, 1.12, 1.0);
        peach.position.set(-0.20, 0.46 + s.h * 0.55, 0.28);
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), jadeMat);
        leaf.scale.set(1.4, 0.4, 0.6);
        leaf.position.set(-0.26, 0.46 + s.h * 0.48, 0.28);
        fig.add(dome, beard, staff, staffHead, gourdBot, gourdTop, peach, leaf);
      }
      fig.position.x = s.x;
      sanXianGroup.add(fig);
    });
    g.add(sanXianGroup);
  }

  // 屋簷下緣可愛紅金小垂飾流蘇（還原設計圖屋簷下排紅流蘇）
  if (withTassels) {
    const tasselMat = new THREE.MeshStandardMaterial({ color: 0xD62828, roughness: 0.65 });
    const count = Math.floor(width / 2.2);
    for (let i = 0; i <= count; i++) {
      const tx = -width / 2 + 0.8 + (i / count) * (width - 1.6);
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 6), tasselMat);
      t.position.set(tx, baseY - 0.16, halfD + 0.36);
      g.add(t);
    }
  }

  return g;
}

/**
 * ★ 需求 #6：一體成形「閩南工藝流線漸收燕尾脊」（從屋脊根部自然延伸向上彎弧，漸細為典雅雙叉燕尾與細金邊，毫無突兀接縫！）
 */
function createSculptedSwallowtailBlade(length, rise, rootH, thickness, matBlue, matGold) {
  const g = new THREE.Group();

  // 優雅漸細彎弧燕尾剪影 Shape（底邊柔弧上揚，頂邊優雅下收，末端形成真實閩南 V 型燕尾雙叉！）
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(length * 0.52, rise * 0.14, length, rise * 0.88); // 下弧線平順起翹
  shape.lineTo(length * 0.88, rise * 0.87);                                 // 燕尾 V 型內凹點
  shape.lineTo(length * 0.96, rise * 1.02);                                 // 上叉細長尾尖
  shape.quadraticCurveTo(length * 0.44, rootH * 0.88 + rise * 0.18, 0, rootH); // 上弧線流暢銜接屋脊頂
  shape.closePath();

  const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.02,
    bevelSegments: 2,
    curveSegments: 16
  });
  extrudeGeo.translate(0, 0, -thickness / 2);

  const blade = new THREE.Mesh(extrudeGeo, matBlue);
  blade.castShadow = true;

  // 貼合上脊弧線的纖細金絲邊線
  const goldCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, rootH + 0.02, 0),
    new THREE.Vector3(length * 0.44, rootH * 0.88 + rise * 0.20, 0),
    new THREE.Vector3(length * 0.96, rise * 1.03, 0)
  );
  const goldEdge = new THREE.Mesh(new THREE.TubeGeometry(goldCurve, 14, Math.max(0.024, thickness * 0.12), 6, false), matGold);

  g.add(blade, goldEdge);
  return g;
}

/**
 * ★ 需求 #13：真正立體 3D 雕刻「圓形鏤空石花窗」（實心 3D 窗欞＋蓮花八輻＋內環金珠，100% 透空零破圖！）
 */
function create3DOpenworkWindowGrille(radius = 1.18, stoneMat, goldMat, isReliefOnly = false) {
  const g = new THREE.Group();
  const depth = isReliefOnly ? 0.12 : 0.36;

  // 外圈精雕石框環
  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.12, 10, 32), stoneMat);
  const innerRim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.86, 0.045, 8, 28), stoneMat);
  const midRing = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.46, 0.045, 8, 24), stoneMat);
  g.add(outerRing, innerRim, midRing);

  // 八輻精雕鏤空石花格條（十字主欞＋四斜花欞＋菱形轉角花瓣）
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const isMain = i % 2 === 0;
    const spokeLen = radius * 0.86;
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(isMain ? 0.075 : 0.052, spokeLen, depth * 0.56),
      stoneMat
    );
    spoke.position.set(Math.cos(a) * (spokeLen * 0.5), Math.sin(a) * (spokeLen * 0.5), 0);
    spoke.rotation.z = a - Math.PI / 2;
    g.add(spoke);

    // 外環蓮瓣石雕雲拱
    const petalRing = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.21, 0.032, 6, 14), stoneMat);
    petalRing.position.set(Math.cos(a + Math.PI / 8) * (radius * 0.66), Math.sin(a + Math.PI / 8) * (radius * 0.66), 0);
    g.add(petalRing);
  }

  // 中央精雕「金邊古銅錢／太極吉珠」花心
  const centerRing = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.18, 0.042, 8, 16), goldMat);
  const centerGem = new THREE.Mesh(new THREE.OctahedronGeometry(radius * 0.11, 0), goldMat);
  centerGem.scale.set(1, 1, 0.55);
  g.add(centerRing, centerGem);

  return g;
}

/**
 * 精緻版守門台灣廟宇石獅子（左公獅踩繡球・右母獅戲幼獅・螺髻獅鬃・口含石珠・紅緞金鈴）
 */
function createStoneLionGuardian(facingX = 1) {
  const isMale = facingX > 0; // 左側為公獅（踩繡球）、右側為母獅（戲幼獅）
  const g = new THREE.Group();
  const lionStoneTex = createCarvedStoneTexture();
  const stoneMain = new THREE.MeshStandardMaterial({ map: lionStoneTex, color: 0xDCE0E4, roughness: 0.74, metalness: 0.04 });
  const stoneCarved = new THREE.MeshStandardMaterial({ map: lionStoneTex, color: 0xB8C1C9, roughness: 0.80 });
  const stoneDeep = new THREE.MeshStandardMaterial({ map: lionStoneTex, color: 0x8C969F, roughness: 0.86 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1E252B, roughness: 0.25, metalness: 0.3 });
  const redSilk = new THREE.MeshStandardMaterial({ color: 0xC8232C, roughness: 0.55 });
  const goldBell = new THREE.MeshStandardMaterial({ color: 0xF0C04A, metalness: 0.65, roughness: 0.28 });

  // 1. 多層精雕石座台（蓮花階座 ＋ 浮雕腰堵 ＋ 須彌上盤）
  const plinth1 = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.24, 1.86), stoneDeep);
  plinth1.position.y = 0.12;
  const plinth2 = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.16, 1.66), stoneCarved);
  plinth2.position.y = 0.32;
  const bodyPed = new THREE.Mesh(new THREE.BoxGeometry(1.30, 0.72, 1.46), stoneMain);
  bodyPed.position.y = 0.76;
  bodyPed.castShadow = true;
  // 四面凹雕鑲框
  const panelFront = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.44, 1.50), stoneCarved);
  panelFront.position.y = 0.76;
  const panelSide = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.44, 1.04), stoneCarved);
  panelSide.position.y = 0.76;
  const cap1 = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.14, 1.78), stoneCarved);
  cap1.position.y = 1.19;
  const cap2 = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.10, 1.68), stoneMain);
  cap2.position.y = 1.31;
  g.add(plinth1, plinth2, bodyPed, panelFront, panelSide, cap1, cap2);

  // 2. ★ V28 高面數平滑石雕守門石獅本體（溫潤圓弧雕刻、流暢肩腿過渡、母獅與幼獅完全零穿邦零破圖！）
  const lion = new THREE.Group();
  lion.position.y = 1.36;

  // 圓潤流暢挺胸軀幹與蹲坐後臀（高段數光滑石雕）
  const haunch = new THREE.Mesh(new THREE.SphereGeometry(0.42, 22, 18), stoneMain);
  haunch.scale.set(1.02, 0.92, 1.12);
  haunch.position.set(0, 0.36, -0.24);
  haunch.castShadow = true;

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.44, 22, 18), stoneMain);
  chest.scale.set(1.06, 1.14, 0.98);
  chest.position.set(0, 0.61, 0.08);
  chest.castShadow = true;

  // 平滑膠囊前肢與圓肩過渡（母獅雙腿略寬開 ±0.34，讓懷前幼獅完全不與前腿穿模！）
  const frontLegX = isMale ? 0.27 : 0.34;
  [-frontLegX, frontLegX].forEach((px) => {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.155, 16, 14), stoneMain);
    shoulder.position.set(px * 0.92, 0.56, 0.24);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.122, 0.38, 10, 16), stoneMain);
    leg.position.set(px, 0.33, 0.29);
    leg.rotation.x = 0.08;
    leg.castShadow = true;
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.145, 16, 12), stoneCarved);
    paw.scale.set(1.0, 0.60, 1.24);
    paw.position.set(px, 0.075, 0.36);
    lion.add(shoulder, leg, paw);
  });

  // 平滑蹲坐後腿
  [-0.33, 0.33].forEach((px) => {
    const thigh = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), stoneMain);
    thigh.scale.set(0.86, 1.04, 1.24);
    thigh.position.set(px, 0.24, -0.22);
    const backPaw = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 10), stoneCarved);
    backPaw.scale.set(1, 0.58, 1.26);
    backPaw.position.set(px, 0.075, -0.02);
    lion.add(thigh, backPaw);
  });

  // 上翹捲曲平滑獅尾
  for (let i = 0; i < 4; i++) {
    const curl = new THREE.Mesh(new THREE.SphereGeometry(0.14 - i * 0.015, 14, 12), stoneCarved);
    curl.position.set(0, 0.28 + i * 0.155, -0.60 - Math.sin(i * 0.6) * 0.08);
    lion.add(curl);
  }

  // 紅緞頸圈 ＋ 胸前祈福金鈴
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.355, 0.052, 12, 24), redSilk);
  collar.rotation.x = Math.PI / 2 + 0.22;
  collar.position.set(0, 0.85, 0.14);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 14), goldBell);
  bell.position.set(0, 0.72, 0.47);

  // 圓潤平滑獅頭、圓角寬鼻吻、雙耳、亮眼與口含吉祥金珠
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.06, 0.20);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.36, 22, 18), stoneMain);
  cranium.scale.set(1.06, 0.98, 1.04);
  cranium.castShadow = true;
  const snout = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.22, 0.26, 4, 0.075), stoneMain);
  snout.position.set(0, -0.06, 0.27);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.098, 16, 12), stoneCarved);
  nose.scale.set(1.32, 0.84, 0.88);
  nose.position.set(0, 0.02, 0.395);
  const jaw = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.11, 0.22, 4, 0.042), stoneCarved);
  jaw.position.set(0, -0.215, 0.24);
  const mouthPearl = new THREE.Mesh(new THREE.SphereGeometry(0.082, 14, 14), goldBell);
  mouthPearl.position.set(0, -0.14, 0.33);

  const scleraMat = new THREE.MeshStandardMaterial({ color: 0xF8FAFC, roughness: 0.35 });
  const irisMat = new THREE.MeshStandardMaterial({ color: 0xD97706, roughness: 0.25 });
  [-0.145, 0.145].forEach((ex) => {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.076, 14, 12), scleraMat);
    sclera.position.set(ex, 0.085, 0.295);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.050, 12, 12), irisMat);
    iris.position.set(ex, 0.085, 0.348);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 10), eyeMat);
    pupil.position.set(ex, 0.085, 0.382);
    const brow = new THREE.Mesh(new RoundedBoxGeometry(0.17, 0.056, 0.11, 3, 0.022), stoneCarved);
    brow.position.set(ex, 0.175, 0.30);
    brow.rotation.z = ex < 0 ? -0.24 : 0.24;
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.112, 14, 12), stoneCarved);
    ear.scale.set(0.85, 1.0, 0.65);
    ear.position.set(ex * 2.32, 0.225, 0.02);
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.075, 10), scleraMat);
    fang.rotation.x = Math.PI;
    fang.position.set(ex * 0.85, -0.15, 0.365);
    headGroup.add(sclera, iris, pupil, brow, ear, fang);
  });

  // 圓滑螺髻獅鬃
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2;
    const r = 0.355;
    const curl = new THREE.Mesh(new THREE.SphereGeometry(0.112, 14, 12), stoneCarved);
    curl.position.set(Math.cos(ang) * r, Math.sin(ang) * r * 0.92 + 0.02, -0.05 + Math.cos(ang * 2) * 0.035);
    headGroup.add(curl);
  }
  for (let i = -1; i <= 1; i++) {
    const topCurl = new THREE.Mesh(new THREE.SphereGeometry(0.092, 12, 10), stoneCarved);
    topCurl.position.set(i * 0.14, 0.325, 0.10);
    headGroup.add(topCurl);
  }

  headGroup.add(cranium, snout, nose, jaw, mouthPearl);
  lion.add(haunch, chest, collar, bell, headGroup);

  if (isMale) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 18), stoneCarved);
    ball.position.set(0, 0.24, 0.56);
    const ribbon1 = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.034, 10, 24), redSilk);
    ribbon1.position.copy(ball.position);
    const ribbon2 = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.030, 10, 24), goldBell);
    ribbon2.position.copy(ball.position);
    ribbon2.rotation.y = Math.PI / 2;
    lion.add(ball, ribbon1, ribbon2);
  } else {
    // ★ V32 高面數平滑石雕小幼獅（鋪上青斗石細顆粒石雕紋理！）
    const cubStone = new THREE.MeshStandardMaterial({ map: lionStoneTex, color: 0xE2DCD0, roughness: 0.68 });
    const cubMane = new THREE.MeshStandardMaterial({ map: lionStoneTex, color: 0xC6BFB2, roughness: 0.74 });
    const cub = new THREE.Group();

    const cubHaunch = new THREE.Mesh(new THREE.SphereGeometry(0.195, 20, 16), cubStone);
    cubHaunch.scale.set(1.06, 0.88, 1.02);
    cubHaunch.position.set(0, 0.175, -0.04);
    cubHaunch.castShadow = true;
    const cubChest = new THREE.Mesh(new THREE.SphereGeometry(0.172, 20, 16), cubStone);
    cubChest.scale.set(0.96, 1.06, 0.94);
    cubChest.position.set(0, 0.29, 0.06);
    cubChest.castShadow = true;

    const cubHead = new THREE.Mesh(new THREE.SphereGeometry(0.195, 22, 18), cubStone);
    cubHead.scale.set(1.04, 0.96, 0.98);
    cubHead.position.set(0, 0.48, 0.11);
    cubHead.castShadow = true;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const cCurl = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), cubMane);
      cCurl.position.set(Math.cos(a) * 0.178, 0.48 + Math.sin(a) * 0.168, 0.05);
      cub.add(cCurl);
    }

    const cCheekL = new THREE.Mesh(new THREE.SphereGeometry(0.064, 14, 12), cubStone);
    cCheekL.position.set(-0.052, 0.435, 0.245);
    const cCheekR = new THREE.Mesh(new THREE.SphereGeometry(0.064, 14, 12), cubStone);
    cCheekR.position.set(0.052, 0.435, 0.245);
    const cNose = new THREE.Mesh(new THREE.SphereGeometry(0.042, 14, 10), cubMane);
    cNose.scale.set(1.3, 0.82, 0.85);
    cNose.position.set(0, 0.47, 0.285);
    const cSmile = new THREE.Mesh(new THREE.TorusGeometry(0.044, 0.009, 8, 16, Math.PI), redSilk);
    cSmile.rotation.z = Math.PI;
    cSmile.position.set(0, 0.428, 0.275);

    [-1, 1].forEach((side) => {
      const cEar = new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 12), cubMane);
      cEar.scale.set(1.0, 0.9, 0.62);
      cEar.position.set(side * 0.142, 0.635, 0.09);
      const cSclera = new THREE.Mesh(new THREE.SphereGeometry(0.040, 14, 12), scleraMat);
      cSclera.position.set(side * 0.078, 0.515, 0.248);
      const cIris = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), irisMat);
      cIris.position.set(side * 0.078, 0.515, 0.274);
      const cPupil = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 10), eyeMat);
      cPupil.position.set(side * 0.078, 0.515, 0.289);
      // 平滑圓肩＋自然融合胸側的端坐前肢與圓爪（絕無外露圓柱硬斷面！）
      const cLegF = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.13, 8, 14), cubStone);
      cLegF.position.set(side * 0.105, 0.155, 0.14);
      cLegF.rotation.x = 0.20;
      const cPawF = new THREE.Mesh(new THREE.SphereGeometry(0.060, 14, 12), cubStone);
      cPawF.scale.set(1.05, 0.60, 1.24);
      cPawF.position.set(side * 0.105, 0.042, 0.195);
      const cHaunchLeg = new THREE.Mesh(new THREE.SphereGeometry(0.088, 14, 12), cubStone);
      cHaunchLeg.scale.set(0.85, 0.82, 1.18);
      cHaunchLeg.position.set(side * 0.16, 0.082, -0.02);
      cub.add(cEar, cSclera, cIris, cPupil, cLegF, cPawF, cHaunchLeg);
    });

    const cubCollar = new THREE.Mesh(new THREE.TorusGeometry(0.142, 0.024, 10, 20), redSilk);
    cubCollar.rotation.x = Math.PI / 2;
    cubCollar.position.set(0, 0.35, 0.08);
    const cubBell = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 12), goldBell);
    cubBell.position.set(0, 0.315, 0.215);
    for (let t = 0; t < 3; t++) {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.056 - t * 0.007, 12, 10), cubMane);
      seg.position.set(0, 0.19 + t * 0.08, -0.21 - t * 0.015);
      cub.add(seg);
    }

    cub.add(cubHaunch, cubChest, cubHead, cCheekL, cCheekR, cNose, cSmile, cubCollar, cubBell);
    cub.position.set(0.0, 0.0, 0.66); // 正坐於寬敞母獅雙爪之間，完全零穿插！
    cub.rotation.y = 0.22;
    lion.add(cub);
  }

  lion.rotation.y = facingX * 0.25;
  g.add(lion);
  return g;
}

/**
 * 右側「假山瀑布錦鯉池」（流動錦鯉魚群 ＋ 層疊假山 ＋ 動態瀑布水花！）
 */
function buildRockeryWaterfallPond(animatedRefs, markOccludable) {
  const g = new THREE.Group();
  const rockTex = createNaturalRockTexture();
  const rockDark = new THREE.MeshStandardMaterial({ map: rockTex, color: 0xAAB4BA, roughness: 0.88 });
  const rockLight = new THREE.MeshStandardMaterial({ map: rockTex, color: 0xD2D9DE, roughness: 0.84 });
  const pondWaterTex = createPondWaterTexture();
  animatedRefs.pondWaterTex = pondWaterTex;
  const waterMat = new THREE.MeshStandardMaterial({
    map: pondWaterTex,
    color: 0x56B6D2,
    emissive: 0x164E63,
    emissiveIntensity: 0.22,
    roughness: 0.16,
    metalness: 0.20,
    transparent: true,
    opacity: 0.76
  });

  // 池底深青岩面（透出清楚的錦鯉優游姿態！）
  const pondBed = new THREE.Mesh(
    new THREE.CircleGeometry(3.0, 24),
    new THREE.MeshStandardMaterial({ color: 0x1D4E5F, roughness: 0.95 })
  );
  pondBed.rotation.x = -Math.PI / 2;
  pondBed.scale.set(1.0, 1.15, 1.0);
  pondBed.position.y = 0.04;
  g.add(pondBed);

  // 橢圓形青石護岸與清澈半透明碧藍水面
  const rim = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.34, 8, 24), rockLight);
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1.0, 1.15, 0.65);
  rim.position.y = 0.14;
  g.add(rim);

  const pond = new THREE.Mesh(new THREE.CircleGeometry(3.0, 24), waterMat);
  pond.rotation.x = -Math.PI / 2;
  pond.scale.set(1.0, 1.15, 1.0);
  pond.position.y = 0.22;
  animatedRefs.pondSurface = pond;
  g.add(pond);

  // 兩片漂浮翠綠荷葉與粉紅小荷花
  [[-1.6, 1.2, 0.34, true], [-1.95, 0.7, 0.24, false], [-0.9, 2.05, 0.28, false]].forEach(([lx, lz, lr, hasFlower]) => {
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(lr, 14, 0.2, Math.PI * 1.85),
      new THREE.MeshStandardMaterial({ color: 0x3F8F4F, roughness: 0.8 })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(lx, 0.235, lz);
    g.add(pad);
    if (hasFlower) {
      const lotus = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.16, 6), new THREE.MeshStandardMaterial({ color: 0xF472B6, roughness: 0.5 }));
      lotus.rotation.x = Math.PI;
      lotus.position.set(lx, 0.31, lz);
      g.add(lotus);
    }
  });

  // ★ 需求 #1：9 尾靈動七彩錦鯉魚群（紅白昭和、金黃黃金鯉、紅橘丹頂，帶擺動尾鰭！）
  const koiStyles = [
    { body: 0xF97316, spot: 0xFFFFFF, fin: 0xFDBA74, rx: 1.55, rz: 1.85, speed: 0.58, phase: 0.0, dir: 1, scale: 1.05 },
    { body: 0xFFFFFF, spot: 0xDC2626, fin: 0xFEF2F2, rx: 1.85, rz: 1.45, speed: 0.50, phase: 1.2, dir: -1, scale: 1.12 },
    { body: 0xFACC15, spot: 0xF59E0B, fin: 0xFEF08A, rx: 1.15, rz: 1.50, speed: 0.68, phase: 2.4, dir: 1, scale: 0.92 },
    { body: 0xEF4444, spot: 0xFFFFFF, fin: 0xFCA5A5, rx: 1.95, rz: 2.10, speed: 0.44, phase: 3.5, dir: 1, scale: 1.08 },
    { body: 0xFB923C, spot: 0x1F2937, fin: 0xFED7AA, rx: 0.95, rz: 1.20, speed: 0.74, phase: 4.4, dir: -1, scale: 0.88 },
    { body: 0xFFFFFF, spot: 0xEA580C, fin: 0xFFEDD5, rx: 1.45, rz: 2.25, speed: 0.52, phase: 5.2, dir: 1, scale: 1.0 },
    { body: 0xF59E0B, spot: 0xFFFFFF, fin: 0xFDE68A, rx: 1.30, rz: 1.05, speed: 0.62, phase: 0.8, dir: -1, scale: 0.95 },
    { body: 0xDC2626, spot: 0xFDE047, fin: 0xFCA5A5, rx: 1.75, rz: 1.75, speed: 0.48, phase: 2.9, dir: 1, scale: 1.02 },
    { body: 0xF8FAFC, spot: 0xEF4444, fin: 0xE2E8F0, rx: 0.78, rz: 0.95, speed: 0.80, phase: 4.9, dir: 1, scale: 0.82 }
  ];

  koiStyles.forEach((k, idx) => {
    const fish = createKoiFishMesh(k.body, k.spot, k.fin);
    fish.scale.setScalar(k.scale);
    fish.userData = {
      rx: k.rx,
      rz: k.rz,
      cx: -0.45,
      cz: 0.35,
      speed: k.speed,
      phase: k.phase,
      dir: k.dir,
      depthY: 0.14 + (idx % 3) * 0.022
    };
    g.add(fish);
    animatedRefs.koiFishes.push(fish);
  });

  // 層疊假山巨岩（設於水池右後方，標記可透明防遮擋）
  const rockGroup = new THREE.Group();
  [
    [1.4, 1.6, -1.0, 1.75, 1.9, 1.4],
    [2.1, 2.5, -1.3, 1.25, 1.6, 1.1],
    [0.5, 1.1, -1.6, 1.35, 1.2, 1.1],
    [1.9, 0.9, 0.4, 1.05, 0.9, 1.0]
  ].forEach(([rx, ry, rz, sx, sy, sz], i) => {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 1), i % 2 === 0 ? rockDark : rockLight);
    r.position.set(rx, ry, rz);
    r.scale.set(sx, sy, sz);
    r.castShadow = true;
    r.receiveShadow = true;
    rockGroup.add(r);
  });

  // 假山旁翠綠灌木叢
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x4E8A52, roughness: 0.9 });
  [[2.4, 1.4, -2.4, 0.95], [0.2, 1.6, -2.5, 0.85], [2.6, 1.0, 1.4, 0.78]].forEach(([bx, by, bz, br]) => {
    const b = new THREE.Mesh(new THREE.DodecahedronGeometry(br, 1), bushMat);
    b.position.set(bx, by, bz);
    rockGroup.add(b);
  });
  markOccludable(rockGroup, 'waterfall-rockery');
  g.add(rockGroup);

  // ★ V32 平順自然流動瀑布水幕（採用垂直無縫捲動白練水紋貼圖，告別跳動平板！）
  const baseWfTex = createWaterfallFoamTexture();
  [-0.32, 0.14, 0.52].forEach((offset, idx) => {
    const wfTex = baseWfTex.clone();
    wfTex.needsUpdate = true;
    wfTex.offset.y = idx * 0.33;
    const streamMat = new THREE.MeshBasicMaterial({
      map: wfTex,
      color: 0xF2FBFF,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const stream = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 2.38), streamMat);
    stream.position.set(0.65 + offset * 0.52, 1.24, -0.35 + offset * 0.38);
    stream.rotation.y = -0.65;
    stream.rotation.x = 0.22;
    stream.userData = { isWaterfallUV: true, phase: idx * 2.1, speed: 0.95 + idx * 0.12 };
    animatedRefs.waterfallStreams.push(stream);
    g.add(stream);
  });

  // ★ V32 瀑布落水 3 圈柔焦羽化同心擴散水波漣漪（絲滑由內向外柔順擴散消散，完全取代生硬跳動白圈！）
  const rippleTex = createPondRippleRingTexture();
  for (let ri = 0; ri < 3; ri++) {
    const rMat = new THREE.MeshBasicMaterial({
      map: rippleTex,
      color: 0xE6F8FF,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const rMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 1.55), rMat);
    rMesh.rotation.x = -Math.PI / 2;
    rMesh.position.set(0.42, 0.236 + ri * 0.002, -0.05);
    rMesh.userData = { phase: ri / 3 };
    animatedRefs.pondRipples.push(rMesh);
    g.add(rMesh);
  }

  // 動態魚飼料與擴散漣漪容器
  g.add(animatedRefs.pondFeedGroup);

  return g;
}

function createKoiFishMesh(bodyColor, spotColor, finColor) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.35, metalness: 0.08 });
  const spotMat = new THREE.MeshStandardMaterial({ color: spotColor, roughness: 0.4 });
  const finMat = new THREE.MeshStandardMaterial({ color: finColor, roughness: 0.45, side: THREE.DoubleSide });

  // 流線魚身（沿 +Z 朝向前進方向）
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), bodyMat);
  body.scale.set(0.78, 0.72, 2.25);
  const spot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), spotMat);
  spot.scale.set(0.85, 0.65, 1.15);
  spot.position.set(0, 0.032, 0.05);
  g.add(body, spot);

  // 左右胸鰭
  [-1, 1].forEach((side) => {
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 3), finMat);
    fin.rotation.z = side * Math.PI * 0.48;
    fin.rotation.y = side * 0.4;
    fin.position.set(side * 0.10, -0.01, 0.06);
    g.add(fin);
  });

  // 可擺動尾鰭關節
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0, -0.22);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 3), finMat);
  tail.rotation.x = Math.PI / 2;
  tail.scale.set(0.35, 1.0, 1.15);
  tail.position.z = -0.10;
  tailPivot.add(tail);
  g.add(tailPivot);
  g.userData.tailPivot = tailPivot;

  return g;
}

/**
 * 廟旁樹蔭下加設之古風「雙人木頭長板凳」（座面高度 0.42m 完美貼合坐姿不穿腳！）
 */
function createGardenLongBench() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x8F5A32, roughness: 0.80 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x5A3022, roughness: 0.85 });
  const cushionMat = new THREE.MeshStandardMaterial({ color: 0xC89F6C, roughness: 0.88 });

  // 寬敞雙人座板（高度調整為 0.37，上緣 0.42 完美承托角色雙腿！）
  const seat = new THREE.Mesh(new THREE.BoxGeometry(3.10, 0.10, 0.62), wood);
  seat.position.y = 0.37;
  seat.castShadow = true;
  seat.receiveShadow = true;
  g.add(seat);

  // 左右兩個清楚的雙人編織座墊
  [-0.64, 0.64].forEach((sx) => {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.04, 0.50), cushionMat);
    pad.position.set(sx, 0.435, 0.02);
    g.add(pad);
  });

  // 雙條式舒壓靠背板
  [0.72, 0.94].forEach((by) => {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(3.06, 0.14, 0.08), wood);
    slat.position.set(0, by, -0.28);
    slat.castShadow = true;
    g.add(slat);
  });

  // 三對實木凳腳與靠背立柱
  [-1.30, 0, 1.30].forEach((lx) => {
    const legF = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.36, 0.11), darkWood);
    legF.position.set(lx, 0.18, 0.22);
    const legB = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.04, 0.11), darkWood);
    legB.position.set(lx, 0.52, -0.25);
    g.add(legF, legB);
  });

  // 左右扶手
  [-1.48, 1.48].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.62), darkWood);
    arm.position.set(ax, 0.60, 0.0);
    g.add(arm);
  });

  return g;
}

/**
 * ★ V31 博物館級神尊雕塑全面精修：
 * - 木頭神轎（溫潤樟木紋雕花太師神轎＋翹起木頭轎角，取消金球）
 * - 三尊全面精雕頸部與雙層繡金立領＋精緻頭冠
 * - 左尊【天上聖母】：如意雲肩披肩、柔順披帽巾、展翅金鳳冠與垂珠冕旒
 * - 中尊【代天巡狩五年千歲】：橘色神衣（腹部精繡金獅頭）、較小頭部望向右方、手持細長金戟寶矛
 * - 右尊【五年千歲黑髯王爺公】：威嚴嚴肅面容、交叉紅綾飄帶、深檀木佛珠懸掛於木頭神轎上、重點極致精工雙龍搶珠大相帽神冠！
 */
/**
 * ★ V34 原版三尊主神備份函式（完整保留以供比對或 ?deityStyle=v34 即時切回！）
 */
function createAuthenticPhotoDeityV34(variant) {
  const g = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xF5C84C, metalness: 0.84, roughness: 0.20 });
  const brightGoldMat = new THREE.MeshStandardMaterial({ color: 0xFFE378, metalness: 0.90, roughness: 0.14 });
  const redSilk = new THREE.MeshStandardMaterial({ color: 0xBA1A22, roughness: 0.42, metalness: 0.14 });
  const whiteSilk = new THREE.MeshStandardMaterial({ color: 0xFFF7E8, roughness: 0.56, metalness: 0.04 });
  const pearlMat = new THREE.MeshStandardMaterial({ color: 0xFFFDF8, roughness: 0.14, metalness: 0.28 });
  const jadeMat = new THREE.MeshStandardMaterial({ color: 0x2E9E74, roughness: 0.22, metalness: 0.22 });
  const beadWood = new THREE.MeshStandardMaterial({ color: 0x3D2218, roughness: 0.28, metalness: 0.10 });

  // ★ V31 實木雕花神轎木紋材質（天然樟木紅褐原木質感，告別黑檀與金球！）
  const chairWoodCanvas = document.createElement('canvas');
  chairWoodCanvas.width = 128;
  chairWoodCanvas.height = 128;
  const cwCtx = chairWoodCanvas.getContext('2d');
  cwCtx.fillStyle = '#8B542E';
  cwCtx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 42; i++) {
    cwCtx.strokeStyle = i % 2 === 0 ? 'rgba(62,32,12,0.28)' : 'rgba(182,122,72,0.22)';
    cwCtx.lineWidth = 1.5 + (i % 3);
    cwCtx.beginPath();
    cwCtx.moveTo(0, i * 3.2);
    cwCtx.bezierCurveTo(42, i * 3.2 + Math.sin(i) * 4, 86, i * 3.2 - Math.cos(i) * 4, 128, i * 3.2);
    cwCtx.stroke();
  }
  const chairWoodTex = new THREE.CanvasTexture(chairWoodCanvas);
  chairWoodTex.colorSpace = THREE.SRGBColorSpace;
  chairWoodTex.wrapS = chairWoodTex.wrapT = THREE.RepeatWrapping;
  const woodChairMat = new THREE.MeshStandardMaterial({ map: chairWoodTex, color: 0x7A4826, roughness: 0.52, metalness: 0.06 });
  const woodChairDarkMat = new THREE.MeshStandardMaterial({ map: chairWoodTex, color: 0x4A2914, roughness: 0.60, metalness: 0.05 });

  const faceMat = new THREE.MeshStandardMaterial({
    map: createDeityFaceTexture(variant),
    roughness: 0.34,
    metalness: 0.08
  });
  const woodReliefMat = new THREE.MeshStandardMaterial({
    color: variant === 'leftMother' ? 0x7E5743 : variant === 'centerKing' ? 0x8F5E3F : 0x6B4A3A,
    roughness: 0.36,
    metalness: 0.08
  });
  const rubyMat = new THREE.MeshStandardMaterial({ color: 0xDF1B28, metalness: 0.42, roughness: 0.14 });
  const robeMat = new THREE.MeshStandardMaterial({
    map: createDeityRobeTexture(variant),
    roughness: 0.36,
    metalness: 0.20
  });
  const sashMatLeft = new THREE.MeshStandardMaterial({
    map: createDeitySashTexture('鎮安宮五年千歲祖廟'),
    roughness: 0.46
  });
  const sashMatRight = new THREE.MeshStandardMaterial({
    map: createDeitySashTexture('雲林馬鳴山五年千歲'),
    roughness: 0.46
  });

  // 1. ★ V33.2 經典端莊深紫檀實木太師神轎（座面深度收齊至 z=+0.41，讓三尊神明多褶垂墜龍袍下裳完整流暢披覆於座面正前方並直達雲頭朝靴，徹底消除座面切割裙擺與球狀膝蓋！）
  const chairW = variant === 'centerKing' ? 1.32 : 1.48;
  const chairH = variant === 'centerKing' ? 1.48 : 1.86;
  const backZ = variant === 'centerKing' ? -0.48 : -0.44;
  const seat = new THREE.Mesh(new RoundedBoxGeometry(chairW, 0.50, 0.92, 3, 0.025), woodChairMat);
  seat.position.set(0, 0.25, -0.05);
  seat.castShadow = true;
  const seatApron = new THREE.Mesh(new THREE.BoxGeometry(chairW + 0.06, 0.10, 0.96), woodChairDarkMat);
  seatApron.position.set(0, 0.48, -0.05);
  // 實木腳踏板（神明朝靴穩踏其上，端坐姿態一目了然！）
  const footRest = new THREE.Mesh(new RoundedBoxGeometry(chairW * 0.72, 0.12, 0.36, 2, 0.015), woodChairDarkMat);
  footRest.position.set(0, 0.06, 0.62);
  const backPanel = new THREE.Mesh(new RoundedBoxGeometry(chairW, chairH, 0.14, 2, 0.02), woodChairMat);
  backPanel.position.set(0, chairH / 2 + 0.22, backZ);
  const backInset = new THREE.Mesh(new THREE.BoxGeometry(chairW - 0.24, chairH - 0.28, 0.16), woodChairDarkMat);
  backInset.position.set(0, chairH / 2 + 0.22, backZ + 0.005);
  const topRail = new THREE.Mesh(new RoundedBoxGeometry(chairW + 0.28, 0.20, 0.22, 3, 0.025), woodChairDarkMat);
  topRail.position.set(0, chairH + 0.22, backZ + 0.02);
  const topWoodTrim = new THREE.Mesh(new THREE.BoxGeometry(chairW + 0.14, 0.06, 0.24), woodChairMat);
  topWoodTrim.position.set(0, chairH + 0.22, backZ + 0.02);
  g.add(seat, seatApron, footRest, backPanel, backInset, topRail, topWoodTrim);

  // 實木神轎頂橫樑左右兩端翹起「木頭轎角」
  [-1, 1].forEach((sx) => {
    const topHornCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx * (chairW / 2 + 0.12), chairH + 0.22, backZ + 0.02),
      new THREE.Vector3(sx * (chairW / 2 + 0.25), chairH + 0.28, backZ + 0.05),
      new THREE.Vector3(sx * (chairW / 2 + 0.31), chairH + 0.40, backZ + 0.07)
    ]);
    const topHorn = new THREE.Mesh(new THREE.TubeGeometry(topHornCurve, 10, 0.052, 8, false), woodChairDarkMat);
    const topHornTip = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.11, 8), woodChairMat);
    topHornTip.position.set(sx * (chairW / 2 + 0.32), chairH + 0.44, backZ + 0.07);
    topHornTip.rotation.z = sx * -0.32;
    g.add(topHorn, topHornTip);
  });

  // 左右經典太師椅低扶手立柱 ＋ 弧形實木扶手 ＋ 前端翹起「木頭轎角」
  [-1, 1].forEach((s) => {
    const ax = s * (chairW / 2 - 0.08);
    const post = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.72, 0.11, 2, 0.016), woodChairDarkMat);
    post.position.set(ax, 0.78, 0.36);
    const arm = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.11, 0.94, 2, 0.02), woodChairMat);
    arm.position.set(ax, 1.10, -0.04);
    const hornCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.070, 0.055, 10), woodChairDarkMat);
    hornCollar.rotation.x = Math.PI / 2;
    hornCollar.position.set(ax, 1.10, 0.44);
    const armHornCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(ax, 1.10, 0.44),
      new THREE.Vector3(ax + s * 0.03, 1.14, 0.54),
      new THREE.Vector3(ax + s * 0.06, 1.23, 0.60)
    ]);
    const armHorn = new THREE.Mesh(new THREE.TubeGeometry(armHornCurve, 10, 0.045, 8, false), woodChairMat);
    const armHornTip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.10, 8), woodChairDarkMat);
    armHornTip.position.set(ax + s * 0.07, 1.27, 0.62);
    armHornTip.rotation.x = 0.48;
    armHornTip.rotation.z = s * -0.26;
    g.add(post, arm, hornCollar, armHorn, armHornTip);
  });

  // ★ V34 博物館級精雕神尊全面升級：
  //   - 自帶暖金／明銀光澤的台灣鹿港手工「雙色金銀柳絲材質」（徹底解決無環境貼圖時高金屬度偏暗發黑問題！）
  //   - 溫潤自然端坐神手與無接縫削肩寬袖（徹底移除突出肩球與扭曲手腕：媽祖雙手平撫雙膝無綠板／中尊右手緊握精雕方天畫戟、左手安撫左膝／右尊雙手端撫雙膝！）
  //   - 交叉紅綾飄帶嚴格覆於腰帶「外側」（與腰帶、右尊五綹黑髯三層立體隔離 100% 零穿幫！）
  //   - 中尊升級精雕「雙月牙金龍方天畫戟」（龍首吞口＋四稜金槍尖＋雙側鏤空月牙戟刃＋雙層紅絲穗！）
  //   - 三頂台灣正統手工柳絲神冠全面極致精雕：媽祖九鳳鏤空柳絲珠冠／中尊九龍束冠雙鳳尾斑紋雉翎元帥盔／右尊五年千歲飛簷風鈴雙龍拜塔鳥翅仔王爺相帽！
  const crownGoldMat = new THREE.MeshStandardMaterial({
    color: 0xF6C94E,
    emissive: 0x523206,
    emissiveIntensity: 0.42,
    metalness: 0.44,
    roughness: 0.24
  });
  const crownBrightGoldMat = new THREE.MeshStandardMaterial({
    color: 0xFFE580,
    emissive: 0x6B4408,
    emissiveIntensity: 0.46,
    metalness: 0.42,
    roughness: 0.18
  });
  const silverFiligreeMat = new THREE.MeshStandardMaterial({
    color: 0xF2F6FC,
    emissive: 0x3A4558,
    emissiveIntensity: 0.44,
    metalness: 0.44,
    roughness: 0.18
  });
  const handWoodMat = new THREE.MeshStandardMaterial({
    color: variant === 'leftMother' ? 0x9B6D52 : variant === 'centerKing' ? 0xAC7752 : 0x8F634B,
    roughness: 0.36,
    metalness: 0.06
  });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x1A1514, roughness: 0.34, metalness: 0.14 });

  // 精準分段人體端坐軀幹半徑公式（供 Lathe 身軀、腰帶、交叉飄帶、長黑髯共用，確保 100% 零穿幫！）
  const torsoProfile = [
    [0.54, 0.44], // 下臀座面展開
    [0.72, 0.40], // 下腹
    [0.92, 0.34], // 優雅收腰
    [1.16, 0.38], // 端正挺胸
    [1.36, 0.40], // 寬厚肩胸
    [1.48, 0.31], // 自然斜肩斜方肌
    [1.56, 0.17]  // 收進穩重頸根領口
  ];
  const getTorsoRadiusAtY = (y, scaleW = 1.0, yShift = 0.0) => {
    const ly = y - yShift;
    if (ly <= torsoProfile[0][0]) return torsoProfile[0][1] * scaleW;
    const last = torsoProfile[torsoProfile.length - 1];
    if (ly >= last[0]) return last[1] * scaleW;
    for (let i = 0; i < torsoProfile.length - 1; i++) {
      const [y0, r0] = torsoProfile[i];
      const [y1, r1] = torsoProfile[i + 1];
      if (ly >= y0 && ly <= y1) {
        const t = (ly - y0) / (y1 - y0);
        return (r0 + (r1 - r0) * t) * scaleW;
      }
    }
    return 0.36 * scaleW;
  };

  const buildTailoredTorso = (scaleW = 1.0, yShift = 0.0, zOff = 0.03) => {
    const pts = torsoProfile.map(([py, pr]) => new THREE.Vector2(pr * scaleW, py + yShift));
    const mesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), robeMat);
    mesh.position.set(0, 0, zOff);
    mesh.rotation.y = Math.PI; // u = 0.5 精準朝向正前方 +Z！
    mesh.castShadow = true;
    return mesh;
  };

  // 共用精準身軀前表面 Z 座標（★ V34 加入 beltProfile 參數：讓交叉飄帶與長黑髯自然跨過並完整位於腰帶「外側」！）
  const torsoSurfaceZ = (x, y, scaleW = 1.0, yShift = 0.0, zOff = 0.03, beltSpec = null) => {
    const rAtY = getTorsoRadiusAtY(y, scaleW, yShift);
    const xClamped = Math.min(Math.abs(x), rAtY * 0.94);
    let bodyZ = zOff + Math.sqrt(Math.max(0.012, rAtY * rAtY - xClamped * xClamped));
    if (y < 0.78) {
      const lapBlend = THREE.MathUtils.clamp((0.78 - y) / 0.24, 0, 1);
      bodyZ = Math.max(bodyZ, zOff + 0.42 * lapBlend);
    }
    if (beltSpec) {
      const { beltY = 0.94, beltOuterR = 0.415, beltZOff = 0.04 } = beltSpec;
      const distY = Math.abs(y - beltY);
      if (distY < 0.16) {
        const bx = Math.min(Math.abs(x), beltOuterR * 0.95);
        const beltFrontZ = beltZOff + Math.sqrt(Math.max(0.01, beltOuterR * beltOuterR - bx * bx));
        const beltArch = Math.exp(-Math.pow(distY / 0.075, 2));
        bodyZ = Math.max(bodyZ, THREE.MathUtils.lerp(bodyZ, beltFrontZ + 0.018, beltArch));
      }
    }
    return bodyZ;
  };

  // ★ V33.2 一體成型流暢「端坐膝腿＋垂墜多褶繡金龍袍下裳＋穩踏腳踏板雲頭朝靴」
  //   完全在椅子前緣 (z=+0.43) 之外自然披覆垂落至腳背 (y=0.175)，零圓球膝蓋、零座面切穿、零懸空腳！
  const addTailoredSeatedLegsAndBoots = (robeColorHex, trimColorHex = 0xE8BD4C, scaleX = 1.0) => {
    const skirtMat = robeMat.clone();
    skirtMat.side = THREE.DoubleSide;
    skirtMat.roughness = 0.40;
    const solidClothMat = new THREE.MeshStandardMaterial({ color: robeColorHex, roughness: 0.42, metalness: 0.16, side: THREE.DoubleSide });
    const trimMat = new THREE.MeshStandardMaterial({ color: trimColorHex, roughness: 0.26, metalness: 0.72 });
    const legG = new THREE.Group();

    // 1. 一體成型「坐姿大腿面 → 柔和圓弧雙膝 → 垂墜多褶長龍袍前裳（直達腳背 y=0.175）」
    const segU = 28;
    const segV = 22;
    const pos = [];
    const uvs = [];
    const idx = [];
    for (let iv = 0; iv <= segV; iv++) {
      const v = iv / segV; // 0..0.38 = 坐姿大腿頂面自腰前伸至膝；0.38..1.0 = 自膝前弧流暢垂直披覆至靴口下擺！
      let y;
      let zBase;
      let kneeShape;
      let pleatAmp;
      let halfW;
      if (v <= 0.36) {
        const t = v / 0.36; // 0 = 腰下 (y=0.80, z=0.22), 1 = 膝前頂弧 (y=0.68, z=0.51)
        const ease = Math.sin(t * Math.PI * 0.5);
        y = THREE.MathUtils.lerp(0.80, 0.67, t * t);
        zBase = THREE.MathUtils.lerp(0.20, 0.52, ease);
        kneeShape = Math.sin(t * Math.PI * 0.85) * 0.055; // 柔和呈現雙大腿與雙膝立體輪廓，絕非圓球！
        pleatAmp = 0.004;
        halfW = THREE.MathUtils.lerp(0.41, 0.47, ease) * scaleX;
      } else {
        const t = (v - 0.36) / 0.64; // 0 = 膝前弧 (y=0.67, z=0.52), 1 = 靴口下擺 (y=0.175, z=0.55)
        y = THREE.MathUtils.lerp(0.67, 0.175, t);
        zBase = 0.52 + Math.sin(Math.min(1, t * 2.4) * Math.PI * 0.5) * 0.035 + t * 0.015;
        kneeShape = Math.max(0, 1 - t * 2.1) * 0.048;
        pleatAmp = 0.016 * (0.25 + t * 0.75);
        halfW = (0.47 + t * 0.05) * scaleX;
      }

      for (let iu = 0; iu <= segU; iu++) {
        const u = iu / segU;
        const nx = (u - 0.5) * 2; // -1..1
        const x = nx * halfW;
        // 雙膝雙大腿柔順雙丘輪廓（平滑高斯弧，毫無硬球接縫！）
        const twinThigh = Math.exp(-Math.pow((Math.abs(nx) - 0.52) / 0.36, 2)) * kneeShape;
        // 中央垂褶下凹＋五道自然龍袍直褶
        const centerDip = Math.exp(-Math.pow(nx / 0.24, 2)) * (-0.020 * (v <= 0.45 ? 1 : 0.45));
        const pleat = Math.cos(nx * Math.PI * 4.0) * pleatAmp;
        // 兩側自然包覆轉入椅子內側（確保從側面斜視絕無破片漏空！）
        const sideWrap = Math.pow(Math.abs(nx), 2.5) * -0.24;
        const yKneeLift = (v <= 0.42) ? twinThigh * 0.65 : 0;
        pos.push(x, y + yKneeLift, zBase + twinThigh + centerDip + pleat + sideWrap);
        // 讓繡花龍袍紋理平順延續至下擺（UV 下半截對映海水江崖邊緣！）
        uvs.push(0.28 + u * 0.44, THREE.MathUtils.lerp(0.45, 0.03, v));
      }
    }
    const row = segU + 1;
    for (let iv = 0; iv < segV; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = iv * row + iu;
        const b = a + 1;
        const c = (iv + 1) * row + iu;
        const d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const skirtGeo = new THREE.BufferGeometry();
    skirtGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    skirtGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    skirtGeo.setIndex(idx);
    skirtGeo.computeVertexNormals();
    const skirtMesh = new THREE.Mesh(skirtGeo, skirtMat);
    skirtMesh.castShadow = true;
    legG.add(skirtMesh);

    // 內層實心座下深襯（內縮收齊於裙弧後方，避免斜視透空亦絕不穿出裙側！）
    const innerLining = new THREE.Mesh(new RoundedBoxGeometry(0.54 * scaleX, 0.44, 0.24, 2, 0.03), solidClothMat);
    innerLining.position.set(0, 0.41, 0.24);
    legG.add(innerLining);

    // 龍袍下擺柔和波浪金線滾邊（精準沿著 y=0.178 褶擺走勢！）
    const hemPts = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      const nx = (u - 0.5) * 2;
      const hx = nx * 0.52 * scaleX;
      const hz = 0.57 + Math.cos(nx * Math.PI * 4.0) * 0.016 - Math.pow(Math.abs(nx), 2.5) * 0.24;
      hemPts.push(new THREE.Vector3(hx, 0.178, hz));
    }
    const hemTrim = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hemPts), 24, 0.015, 6, false), trimMat);
    legG.add(hemTrim);

    // 2. 端莊自然微外八「雲頭千層底朝靴」（自垂墜龍袍下擺優雅探出，穩穩踏實於實木腳踏板 y=0.12 上！）
    [-1, 1].forEach((side) => {
      const bootG = new THREE.Group();
      bootG.position.set(side * 0.20 * scaleX, 0.122, 0.58);
      bootG.rotation.y = side * 0.16;
      const ankle = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.068, 0.12, 12), bootMat);
      ankle.position.set(0, 0.09, -0.05);
      const vamp = new THREE.Mesh(new RoundedBoxGeometry(0.132, 0.090, 0.23, 3, 0.038), bootMat);
      vamp.position.set(0, 0.048, 0.02);
      const sole = new THREE.Mesh(new RoundedBoxGeometry(0.140, 0.026, 0.24, 2, 0.012), whiteSilk);
      sole.position.set(0, 0.012, 0.02);
      const toeCurl = new THREE.Mesh(new THREE.SphereGeometry(0.050, 10, 8), bootMat);
      toeCurl.scale.set(1.12, 0.78, 1.18);
      toeCurl.position.set(0, 0.052, 0.125);
      const cloudTip = new THREE.Mesh(new THREE.TorusGeometry(0.030, 0.008, 6, 12, Math.PI), brightGoldMat);
      cloudTip.position.set(0, 0.062, 0.156);
      bootG.add(ankle, vamp, sole, toeCurl, cloudTip);
      legG.add(bootG);
    });

    g.add(legG);
  };

  // ★ V34 全面修正三尊神像雙臂與神手：
  //   - 移除突出肩節圓球，袖根無縫嵌入斜肩軀幹；袖口收斂自然不翻白邊
  //   - 改採世界水平對齊精雕溫潤樟木神手（'knee' 端莊掌心向下平撫膝面、'grip' 掌指精準環握兵器長柄！），手型立體清晰零扭曲！
  const addNaturalArticulatedArm = (side, { shoulder, elbow, wrist, handPose = 'knee', handPos = null }) => {
    const armMat = robeMat;
    const sPt = new THREE.Vector3(...shoulder);
    const ePt = new THREE.Vector3(...elbow);
    const wPt = new THREE.Vector3(...wrist);

    const armCurve = new THREE.CatmullRomCurve3([sPt, ePt, wPt]);
    const steps = 18;
    const radialSegs = 14;
    const frames = armCurve.computeFrenetFrames(steps, false);
    const sPos = [];
    const sUvs = [];
    const sIdx = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pt = armCurve.getPointAt(t);
      const tan = frames.tangents[i];
      const upRef = Math.abs(tan.y) > 0.92 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(tan, upRef).normalize();
      const up = new THREE.Vector3().crossVectors(right, tan).normalize();

      // 肩根略內收融入軀幹斜肩 (0.095) → 肘部寬袖微膨 → 腕口優雅收齊 (0.074)
      const rX = THREE.MathUtils.lerp(0.096, 0.072, Math.pow(t, 1.25)) + Math.sin(t * Math.PI) * 0.022;
      const rUp = THREE.MathUtils.lerp(0.094, 0.068, t) + Math.sin(t * Math.PI) * 0.014;
      const drapeDown = Math.sin(Math.pow(t, 0.82) * Math.PI) * 0.074 + t * 0.018;

      for (let j = 0; j <= radialSegs; j++) {
        const ang = (j / radialSegs) * Math.PI * 2;
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        const yOffset = sa >= 0 ? sa * rUp : sa * (rUp + drapeDown);
        const vx = pt.x + right.x * (ca * rX) + up.x * yOffset;
        const vy = pt.y + right.y * (ca * rX) + up.y * yOffset;
        const vz = pt.z + right.z * (ca * rX) + up.z * yOffset;
        sPos.push(vx, vy, vz);
        sUvs.push(0.06 + (j / radialSegs) * 0.24, THREE.MathUtils.lerp(0.86, 0.56, t));
      }
    }
    const rRow = radialSegs + 1;
    for (let i = 0; i < steps; i++) {
      for (let j = 0; j < radialSegs; j++) {
        const a = i * rRow + j;
        const b = a + 1;
        const c = (i + 1) * rRow + j;
        const d = c + 1;
        sIdx.push(a, b, c, b, d, c);
      }
    }
    const sleeveGeo = new THREE.BufferGeometry();
    sleeveGeo.setAttribute('position', new THREE.Float32BufferAttribute(sPos, 3));
    sleeveGeo.setAttribute('uv', new THREE.Float32BufferAttribute(sUvs, 2));
    sleeveGeo.setIndex(sIdx);
    sleeveGeo.computeVertexNormals();
    const sleeveMesh = new THREE.Mesh(sleeveGeo, armMat);
    sleeveMesh.castShadow = true;

    // 貼合精緻金線袖緣（緊貼腕口，深色袖腔收口不外凸白塊！）
    const drapeDir = wPt.clone().sub(ePt).normalize();
    const cuffCap = new THREE.Mesh(new THREE.CircleGeometry(0.066, 14), new THREE.MeshBasicMaterial({ color: 0x1D0E0A, side: THREE.DoubleSide }));
    cuffCap.position.copy(wPt).addScaledVector(drapeDir, -0.004);
    cuffCap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), drapeDir);

    const cuffTrim = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.011, 8, 16), crownBrightGoldMat);
    cuffTrim.position.copy(wPt);
    cuffTrim.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), drapeDir);

    // 精雕溫潤樟木神手（依姿勢精準建立自然解剖方位，絕不亂轉軸向！）
    const handG = new THREE.Group();
    if (handPos) {
      handG.position.set(...handPos);
    } else {
      handG.position.copy(wPt).addScaledVector(drapeDir, 0.042);
    }

    if (handPose === 'grip') {
      // 右手握持直立兵器長柄：手腕向內前伸、掌心朝內 (+X)、四指橫向圓弧緊握於長柄前方、大拇指上扣！
      handG.rotation.set(0.06, side < 0 ? 0.12 : -0.12, 0);
      const wristC = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 0.07, 10), handWoodMat);
      wristC.rotation.x = Math.PI / 2;
      wristC.position.set(0, 0, -0.045);
      const backPalm = new THREE.Mesh(new RoundedBoxGeometry(0.048, 0.095, 0.088, 3, 0.020), handWoodMat);
      backPalm.position.set(side * 0.024, 0, 0.002);
      handG.add(wristC, backPalm);
      // 四指橫向環抱長柄正面（清楚看見一節節圓潤手指！）
      for (let f = 0; f < 4; f++) {
        const fy = 0.034 - f * 0.023;
        const fingerCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(side * 0.026, fy, 0.032),
          new THREE.Vector3(side * 0.004, fy, 0.056),
          new THREE.Vector3(-side * 0.028, fy, 0.046),
          new THREE.Vector3(-side * 0.034, fy, 0.018)
        ]);
        handG.add(new THREE.Mesh(new THREE.TubeGeometry(fingerCurve, 10, 0.0105, 6, false), handWoodMat));
      }
      // 拇指自然扣於食指上方
      const thumbCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.018, 0.040, 0.014),
        new THREE.Vector3(-side * 0.010, 0.052, 0.038),
        new THREE.Vector3(-side * 0.030, 0.040, 0.042)
      ]);
      handG.add(new THREE.Mesh(new THREE.TubeGeometry(thumbCurve, 8, 0.0115, 6, false), handWoodMat));
    } else {
      // 端莊坐姿「平撫雙膝」神手：掌心朝下溫厚貼合膝頂弧面、四指柔順微彎向前垂撫、拇指自然內收！
      handG.rotation.set(0.24, side * -0.14, side * 0.08);
      const wristC = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.044, 0.075, 10), handWoodMat);
      wristC.rotation.x = Math.PI / 2;
      wristC.position.set(0, 0.008, -0.048);
      const palm = new THREE.Mesh(new RoundedBoxGeometry(0.104, 0.044, 0.105, 3, 0.020), handWoodMat);
      palm.position.set(0, 0.002, 0.015);
      handG.add(wristC, palm);
      for (let f = 0; f < 4; f++) {
        const fx = (f - 1.5) * 0.0235;
        const fLen = 0.068 - Math.abs(f - 1.5) * 0.008;
        const fCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(fx, 0.006, 0.056),
          new THREE.Vector3(fx, -0.002, 0.056 + fLen * 0.55),
          new THREE.Vector3(fx, -0.024, 0.056 + fLen)
        ]);
        handG.add(new THREE.Mesh(new THREE.TubeGeometry(fCurve, 8, 0.0105, 6, false), handWoodMat));
      }
      const thumbCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-side * 0.046, 0.002, 0.012),
        new THREE.Vector3(-side * 0.066, -0.006, 0.044),
        new THREE.Vector3(-side * 0.058, -0.016, 0.072)
      ]);
      handG.add(new THREE.Mesh(new THREE.TubeGeometry(thumbCurve, 8, 0.0115, 6, false), handWoodMat));
    }

    g.add(sleeveMesh, cuffCap, cuffTrim, handG);
  };

  // ★ V34 端正穩重雕木神頸與貼合漢服交領（左尊改配溫潤珍珠領扣，徹底移除多餘綠色物件！）
  const addSculptedNeckAndCollar = (collarY, rNeck, rCollar, zOff, outerColorHex = 0xB81D24, claspMat = jadeMat) => {
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(rNeck * 0.94, rNeck * 1.16, 0.22, 18), woodReliefMat);
    neck.position.set(0, collarY + 0.08, zOff);
    const innerCollar = new THREE.Mesh(new THREE.TorusGeometry(rNeck * 1.12, 0.022, 8, 22), whiteSilk);
    innerCollar.rotation.x = Math.PI / 2;
    innerCollar.position.set(0, collarY + 0.01, zOff);
    const outerCollarMat = new THREE.MeshStandardMaterial({ color: outerColorHex, roughness: 0.38, metalness: 0.16 });
    const collarBaseRing = new THREE.Mesh(new THREE.TorusGeometry(rCollar * 0.72, 0.030, 8, 22), outerCollarMat);
    collarBaseRing.rotation.x = Math.PI / 2;
    collarBaseRing.position.set(0, collarY - 0.032, zOff);
    const goldCollarPiping = new THREE.Mesh(new THREE.TorusGeometry(rCollar * 0.76, 0.012, 6, 22), crownBrightGoldMat);
    goldCollarPiping.rotation.x = Math.PI / 2;
    goldCollarPiping.position.set(0, collarY - 0.015, zOff);
    [-1, 1].forEach((s) => {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.20, 0.020), whiteSilk);
      lapel.position.set(s * 0.064, collarY - 0.105, zOff + rCollar * 0.70);
      lapel.rotation.z = s * 0.46;
      const lapelGold = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.21, 0.024), crownBrightGoldMat);
      lapelGold.position.set(s * 0.080, collarY - 0.110, zOff + rCollar * 0.71);
      lapelGold.rotation.z = s * 0.46;
      g.add(lapel, lapelGold);
    });
    const clasp = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 10), claspMat);
    clasp.position.set(0, collarY - 0.16, zOff + rCollar * 0.80);
    const claspRing = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.007, 6, 12), crownBrightGoldMat);
    claspRing.position.set(0, collarY - 0.16, zOff + rCollar * 0.80);
    g.add(neck, innerCollar, collarBaseRing, goldCollarPiping, clasp, claspRing);
  };

  // ★ V29/V33 精雕神尊立體五官與仿真垂珠福耳
  const woodEarHollowMat = new THREE.MeshStandardMaterial({
    color: variant === 'leftMother' ? 0x623B1F : variant === 'centerKing' ? 0x6B4323 : 0x52311A,
    roughness: 0.72,
    metalness: 0.04
  });
  const addCarvedWoodFaceRelief = (hy, hz, r, isMother = false, parent = g) => {
    const noseBridge = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.046, r * 0.082, r * 0.34, 12), woodReliefMat);
    noseBridge.scale.set(0.95, 1.0, 0.85);
    noseBridge.position.set(0, hy - r * 0.06, hz + r * 0.96);
    noseBridge.rotation.x = -0.18;
    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(r * 0.092, 12, 10), woodReliefMat);
    noseTip.scale.set(1.12, 0.86, 0.96);
    noseTip.position.set(0, hy - r * 0.21, hz + r * 1.02);
    [-1, 1].forEach((ns) => {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(r * 0.056, 10, 8), woodReliefMat);
      nostril.scale.set(1.05, 0.78, 0.85);
      nostril.position.set(ns * r * 0.082, hy - r * 0.23, hz + r * 0.97);
      parent.add(nostril);
    });
    parent.add(noseBridge, noseTip);

    [-1, 1].forEach((s) => {
      const earG = new THREE.Group();
      earG.position.set(s * (r * 0.93), hy - r * 0.04, hz + r * 0.04);
      earG.rotation.y = s * -0.34;
      earG.rotation.z = s * -0.06;

      const pinnaBack = new THREE.Mesh(new THREE.SphereGeometry(r * 0.22, 14, 12), woodReliefMat);
      pinnaBack.scale.set(0.36, 1.44, 0.74);
      pinnaBack.position.set(s * r * 0.05, -r * 0.02, -r * 0.02);

      const helixCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * r * 0.01, r * 0.22, r * 0.06),
        new THREE.Vector3(s * r * 0.14, r * 0.30, r * 0.02),
        new THREE.Vector3(s * r * 0.22, r * 0.12, -r * 0.01),
        new THREE.Vector3(s * r * 0.20, -r * 0.12, r * 0.01),
        new THREE.Vector3(s * r * 0.12, -r * 0.30, r * 0.04),
        new THREE.Vector3(s * r * 0.02, -r * 0.33, r * 0.07)
      ]);
      const helix = new THREE.Mesh(new THREE.TubeGeometry(helixCurve, 18, r * 0.046, 8, false), woodReliefMat);

      const concha = new THREE.Mesh(new THREE.SphereGeometry(r * 0.135, 12, 10), woodEarHollowMat);
      concha.scale.set(0.46, 1.28, 0.56);
      concha.position.set(s * r * 0.09, -r * 0.01, r * 0.045);

      const antiCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * r * 0.08, r * 0.16, r * 0.07),
        new THREE.Vector3(s * r * 0.14, r * 0.02, r * 0.065),
        new THREE.Vector3(s * r * 0.09, -r * 0.15, r * 0.08)
      ]);
      const antiHelix = new THREE.Mesh(new THREE.TubeGeometry(antiCurve, 10, r * 0.028, 6, false), woodReliefMat);
      const tragus = new THREE.Mesh(new THREE.SphereGeometry(r * 0.048, 8, 8), woodReliefMat);
      tragus.scale.set(0.65, 1.25, 0.72);
      tragus.position.set(s * r * 0.02, -r * 0.08, r * 0.105);

      const earLobe = new THREE.Mesh(new THREE.SphereGeometry(r * 0.115, 12, 10), woodReliefMat);
      earLobe.scale.set(0.64, 1.22, 0.76);
      earLobe.position.set(s * r * 0.095, -r * 0.31, r * 0.055);

      earG.add(pinnaBack, helix, concha, antiHelix, tragus, earLobe);
      if (isMother) {
        const earDrop = new THREE.Mesh(new THREE.SphereGeometry(0.030, 10, 10), pearlMat);
        earDrop.position.set(s * r * 0.095, -r * 0.46, r * 0.065);
        earG.add(earDrop);
      }
      parent.add(earG);
    });
  };

  // ★ V34 柔順絲緞交叉飄帶（完整跨覆於金色腰帶「外側」，與腰帶及右尊黑髯三層分明 100% 零穿幫！）
  const buildFlowingSashMesh = (sashMat, sideDir, opts = {}) => {
    const {
      topY = 1.46,
      botY = 0.70,
      scaleW = 1.0,
      yShift = 0.0,
      zOff = 0.03,
      layerOffset = 0.022,
      width = 0.155,
      beltSpec = null
    } = opts;
    const segW = 6;
    const segH = 24;
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let ih = 0; ih <= segH; ih++) {
      const v = ih / segH;
      const y = topY - (topY - botY) * v;
      const centerX = sideDir * (0.23 - v * 0.44) + Math.sin(v * Math.PI * 1.4) * 0.012 * sideDir;
      const clothWave = Math.sin(v * Math.PI * 2.4) * 0.004;
      for (let iw = 0; iw <= segW; iw++) {
        const u = iw / segW;
        const x = centerX + (u - 0.5) * width;
        const baseZ = torsoSurfaceZ(x, y, scaleW, yShift, zOff, beltSpec);
        const edgeCurl = Math.cos((u - 0.5) * Math.PI) * 0.006;
        positions.push(x, y, baseZ + layerOffset + clothWave + edgeCurl);
        uvs.push(u, 1 - v);
      }
    }
    const row = segW + 1;
    for (let ih = 0; ih < segH; ih++) {
      for (let iw = 0; iw < segW; iw++) {
        const a = ih * row + iw;
        const b = a + 1;
        const c = (ih + 1) * row + iw;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const softMat = sashMat.clone();
    softMat.roughness = 0.76;
    softMat.metalness = 0.06;
    softMat.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(geo, softMat);
    mesh.castShadow = true;
    return mesh;
  };

  if (variant === 'leftMother') {
    // =========================================================================
    // ★ V34 左尊【天上聖母（媽祖娘娘）】：
    //   - 移除胸前綠色玉圭與綠色玉帶扣（改以端莊平撫雙膝坐姿＋金雕祥雲腰帶扣＋珍珠領扣！）
    //   - 交叉「鎮安宮五年千歲祖廟」紅綾飄帶完整披覆於腰帶「外側」＋ 繞頸深檀木佛珠
    //   - 台灣鹿港手工工藝「九鳳鏤空柳絲金銀天后珠冠」（亮金明銀雙色鏤空柱欄＋展翅金鳳曲線羽翼＋三層珠花扇形背光＋9 串珠簾冕旒！）
    // =========================================================================
    const robe = buildTailoredTorso(0.98, 0.02, 0.03);
    const cape = new THREE.Mesh(new THREE.BoxGeometry(1.06, 1.32, 0.12), redSilk);
    cape.position.set(0, 1.04, -0.24);
    const waistBelt = new THREE.Mesh(new THREE.TorusGeometry(0.355, 0.036, 10, 24), crownBrightGoldMat);
    waistBelt.rotation.x = Math.PI / 2;
    waistBelt.position.set(0, 0.94, 0.04);
    const beltClasp = new THREE.Mesh(new RoundedBoxGeometry(0.10, 0.075, 0.032, 2, 0.012), crownGoldMat);
    beltClasp.position.set(0, 0.94, 0.39);
    g.add(robe, cape, waistBelt, beltClasp);

    // 穩重雕木神頸 ＋ 溫潤珍珠領扣 V 字交領（無綠色零件！）
    addSculptedNeckAndCollar(1.58, 0.108, 0.25, 0.05, 0xB81D24, pearlMat);
    // 一體成型柔順多褶垂墜龍袍下裳與雲頭朝靴
    addTailoredSeatedLegsAndBoots(0xBD831E, 0xF5C84C, 0.96);

    // ★ 端莊自然聖母坐姿雙手：寬大繡鳳龍袍垂袖順肩垂落，雙手自然平放安撫雙膝（移除綠色玉圭，姿態慈祥大氣！）
    [-1, 1].forEach((s) => {
      addNaturalArticulatedArm(s, {
        shoulder: [s * 0.28, 1.40, 0.04],
        elbow: [s * 0.42, 1.07, 0.14],
        wrist: [s * 0.24, 0.74, 0.44],
        handPose: 'knee',
        handPos: [s * 0.23, 0.73, 0.50]
      });
    });

    // 貼肩優雅「如意雲肩披肩」（紅緞金邊配珍珠紅寶，移除綠珠！）
    const shawlMat = new THREE.MeshStandardMaterial({ color: 0xC41D25, roughness: 0.40, metalness: 0.16, side: THREE.DoubleSide });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const sx = Math.sin(a);
      const cz = Math.cos(a);
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.114, 12, 10), shawlMat);
      petal.scale.set(1.10, 0.74, 0.22);
      petal.position.set(sx * 0.36, 1.43, 0.04 + cz * 0.36);
      petal.rotation.y = a;
      petal.rotation.x = -0.45;
      const petalRim = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.011, 6, 14), crownBrightGoldMat);
      petalRim.scale.set(1.10, 0.74, 1.0);
      petalRim.position.set(sx * 0.37, 1.43, 0.04 + cz * 0.37);
      petalRim.rotation.y = a;
      petalRim.rotation.x = -0.45;
      const petalGem = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), i % 2 === 0 ? pearlMat : rubyMat);
      petalGem.position.set(sx * 0.40, 1.43, 0.04 + cz * 0.40);
      g.add(petal, petalRim, petalGem);
    }

    // ★ 交叉紅金「鎮安宮五年千歲祖廟」飄帶：傳入 beltSpec 確保完整跨越並浮於金色腰帶「外側」＋ 繞頸深檀木佛珠！
    const mazuBeltSpec = { beltY: 0.94, beltOuterR: 0.398, beltZOff: 0.04 };
    g.add(buildFlowingSashMesh(sashMatLeft, -1, { topY: 1.45, botY: 0.71, scaleW: 0.98, yShift: 0.02, zOff: 0.03, layerOffset: 0.026, width: 0.145, beltSpec: mazuBeltSpec }));
    g.add(buildFlowingSashMesh(sashMatLeft, 1, { topY: 1.45, botY: 0.71, scaleW: 0.98, yShift: 0.02, zOff: 0.03, layerOffset: 0.042, width: 0.145, beltSpec: mazuBeltSpec }));
    const mazuBeadCount = 22;
    for (let i = 0; i < mazuBeadCount; i++) {
      const a = (i / mazuBeadCount) * Math.PI * 2;
      const bx = Math.sin(a) * 0.25;
      const frontWeight = Math.max(0, Math.cos(a));
      const by = 1.54 - Math.pow(frontWeight, 1.25) * 0.44;
      const bz = 0.05 + Math.cos(a) * (0.24 + frontWeight * 0.29);
      const isMotherBead = i === 0;
      const bead = new THREE.Mesh(
        new THREE.SphereGeometry(isMotherBead ? 0.036 : 0.026, 10, 8),
        isMotherBead ? crownBrightGoldMat : beadWood
      );
      bead.position.set(bx, by, bz);
      g.add(bead);
    }

    // 慈祥開面聖母頭像
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.242, 24, 20), faceMat);
    head.position.set(0, 1.87, 0.06);
    head.rotation.y = -Math.PI / 2;
    addCarvedWoodFaceRelief(1.87, 0.06, 0.242, true);
    g.add(head);

    // 優雅後垂聖母「霞帔金邊素錦披帽巾」（貼於耳後與雙肩後方自然散落）
    const veilMat = new THREE.MeshStandardMaterial({ color: 0xFCEEC8, roughness: 0.68, metalness: 0.06, side: THREE.DoubleSide });
    const veilTrimMat = new THREE.MeshStandardMaterial({ color: 0xC42026, roughness: 0.48, metalness: 0.10, side: THREE.DoubleSide });
    const backVeil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.265, 0.35, 0.56, 20, 1, true, Math.PI * 0.66, Math.PI * 0.68),
      veilMat
    );
    backVeil.position.set(0, 1.76, 0.01);
    const backVeilHem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.346, 0.356, 0.032, 20, 1, true, Math.PI * 0.66, Math.PI * 0.68),
      veilTrimMat
    );
    backVeilHem.position.set(0, 1.49, 0.01);
    g.add(backVeil, backVeilHem);

    // ★ V34 極致精雕台灣鹿港手工「天上聖母・九鳳鏤空柳絲金銀珠冠（天后鳳冠）」：
    //   珠寶雙層金銀柳絲額箍 ＋ 12 柱鏤空牌樓冠筒（透出朱紅絨胎！）＋ 三層花邊扇形金銀背光與珍珠紅梅花飾 ＋ 展翅流線曲羽金鳳 ＋ 9 串不遮眼珠簾 ＋ 金蓮火焰寶頂！
    const mazuCrown = new THREE.Group();
    mazuCrown.position.set(0, 2.02, 0.05);
    const mcHeadband = new THREE.Mesh(new THREE.TorusGeometry(0.262, 0.028, 10, 28), crownBrightGoldMat);
    mcHeadband.rotation.x = Math.PI / 2;
    const mcSilverTrim = new THREE.Mesh(new THREE.TorusGeometry(0.276, 0.013, 8, 28), silverFiligreeMat);
    mcSilverTrim.rotation.x = Math.PI / 2;
    mcSilverTrim.position.y = 0.036;
    const mcUpperRim = new THREE.Mesh(new THREE.TorusGeometry(0.268, 0.016, 8, 28), crownBrightGoldMat);
    mcUpperRim.rotation.x = Math.PI / 2;
    mcUpperRim.position.y = 0.24;
    // 內縮朱紅絲絨帽胎 ＋ 12 道鏤空金銀柳絲立柱與精雕雙層花拱（徹底告別單調實心桶！）
    const mcVelvetCore = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.235, 0.34, 20), redSilk);
    mcVelvetCore.position.y = 0.19;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const px = Math.sin(a) * 0.260;
      const pz = Math.cos(a) * 0.260;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.22, 6), i % 2 === 0 ? crownBrightGoldMat : silverFiligreeMat);
      pillar.position.set(px, 0.13, pz);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.010, 6, 14, Math.PI), i % 2 === 0 ? silverFiligreeMat : crownBrightGoldMat);
      arch.position.set(Math.sin(a + Math.PI / 12) * 0.264, 0.22, Math.cos(a + Math.PI / 12) * 0.264);
      arch.rotation.y = a + Math.PI / 12;
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), i % 3 === 0 ? pearlMat : crownBrightGoldMat);
      bead.position.set(Math.sin(a + Math.PI / 12) * 0.272, 0.14, Math.cos(a + Math.PI / 12) * 0.272);
      mazuCrown.add(pillar, arch, bead);
    }
    // 三層鏤空扇形金銀柳絲鳳尾背光（華貴對稱牌樓＋珠寶梅花瓣邊框＋透空金絲細輻！）
    [
      { r: 0.365, t: 0.018, mat: crownBrightGoldMat, z: 0.02 },
      { r: 0.305, t: 0.015, mat: silverFiligreeMat, z: 0.035 },
      { r: 0.245, t: 0.013, mat: crownGoldMat, z: 0.048 }
    ].forEach(({ r, t, mat, z }) => {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 28, Math.PI * 1.08), mat);
      arc.position.set(0, 0.24, z);
      arc.rotation.z = -0.04 * Math.PI;
      mazuCrown.add(arc);
    });
    for (let p = -5; p <= 5; p++) {
      const pa = Math.PI * 0.5 + p * 0.26;
      const ca = Math.cos(pa);
      const sa = Math.sin(pa);
      // 扇面鏤空金絲花輻
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.010, 0.17, 6), p % 2 === 0 ? crownBrightGoldMat : silverFiligreeMat);
      spoke.position.set(ca * 0.285, 0.24 + sa * 0.285, 0.032);
      spoke.rotation.z = pa - Math.PI * 0.5;
      // 扇緣雕花金瓣與珍珠紅寶（花蕊朵朵分明！）
      const petalArc = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.009, 6, 12, Math.PI), p % 2 === 0 ? crownBrightGoldMat : silverFiligreeMat);
      petalArc.position.set(ca * 0.375, 0.24 + sa * 0.375, 0.025);
      petalArc.rotation.z = pa - Math.PI * 0.5;
      const gem = new THREE.Mesh(new THREE.SphereGeometry(p === 0 ? 0.026 : 0.019, 8, 8), p === 0 ? rubyMat : Math.abs(p) % 2 === 1 ? pearlMat : rubyMat);
      gem.position.set(ca * 0.390, 0.24 + sa * 0.390, 0.042);
      mazuCrown.add(spoke, petalArc, gem);
    }
    // 冠頂「層疊金蓮火焰寶珠頂」
    const mcLotus1 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.10, 0.075, 12), crownGoldMat);
    mcLotus1.position.set(0, 0.57, 0.03);
    const mcLotus2 = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.015, 6, 16), silverFiligreeMat);
    mcLotus2.rotation.x = Math.PI / 2;
    mcLotus2.position.set(0, 0.61, 0.03);
    const mcFlameHalo = new THREE.Mesh(new THREE.TorusGeometry(0.076, 0.014, 8, 18), crownBrightGoldMat);
    mcFlameHalo.position.set(0, 0.72, 0.03);
    const mcTopRuby = new THREE.Mesh(new THREE.SphereGeometry(0.046, 12, 12), rubyMat);
    mcTopRuby.position.set(0, 0.72, 0.03);
    const mcTopTip = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.105, 8), crownBrightGoldMat);
    mcTopTip.position.set(0, 0.84, 0.03);
    mazuCrown.add(mcHeadband, mcSilverTrim, mcUpperRim, mcVelvetCore, mcLotus1, mcLotus2, mcFlameHalo, mcTopRuby, mcTopTip);

    // 冠前立體「展翅金鳳」（流線多層曲線柳絲鳳羽，完全取代扁平灰方塊！）
    const phBody = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 10), crownBrightGoldMat);
    phBody.scale.set(0.88, 1.24, 0.68);
    phBody.position.set(0, 0.24, 0.285);
    const phNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.028, 0.12, 8), crownBrightGoldMat);
    phNeck.position.set(0, 0.35, 0.295);
    phNeck.rotation.x = -0.22;
    const phHead = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.095, 8), crownBrightGoldMat);
    phHead.rotation.x = Math.PI * 0.45;
    phHead.position.set(0, 0.42, 0.325);
    const phCrest = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), pearlMat);
    phCrest.position.set(0, 0.46, 0.295);
    const phRuby = new THREE.Mesh(new THREE.SphereGeometry(0.040, 10, 10), rubyMat);
    phRuby.position.set(0, 0.24, 0.335);
    mazuCrown.add(phBody, phNeck, phHead, phCrest, phRuby);

    [-1, 1].forEach((s) => {
      // 優雅雙層流線鳳羽捲翅（細緻柳絲弧線＋羽尖珍珠，溫婉華貴！）
      [
        { pts: [[0.05, 0.26, 0.28], [0.16, 0.35, 0.25], [0.28, 0.42, 0.16], [0.33, 0.35, 0.09]], r: 0.015, mat: crownBrightGoldMat },
        { pts: [[0.06, 0.22, 0.27], [0.18, 0.27, 0.23], [0.30, 0.28, 0.14], [0.34, 0.21, 0.08]], r: 0.012, mat: silverFiligreeMat },
        { pts: [[0.05, 0.18, 0.26], [0.17, 0.19, 0.22], [0.27, 0.16, 0.15]], r: 0.011, mat: crownGoldMat }
      ].forEach(({ pts, r, mat }) => {
        const c = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(s * x, y, z)));
        mazuCrown.add(new THREE.Mesh(new THREE.TubeGeometry(c, 14, r, 7, false), mat));
      });
      // 冠側精緻小梅花珠花
      const rosette = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.010, 6, 12), crownBrightGoldMat);
      rosette.position.set(s * 0.24, 0.28, 0.22);
      rosette.rotation.y = s * 0.55;
      const rosetteCore = new THREE.Mesh(new THREE.SphereGeometry(0.020, 8, 8), rubyMat);
      rosetteCore.position.set(s * 0.245, 0.28, 0.23);
      // 雙側耳畔珍珠紅寶步搖流蘇
      for (let b = 0; b < 4; b++) {
        const drop = new THREE.Mesh(new THREE.SphereGeometry(b === 3 ? 0.020 : 0.014, 6, 6), b === 3 ? rubyMat : pearlMat);
        drop.position.set(s * 0.31, 0.04 - b * 0.050, 0.14);
        mazuCrown.add(drop);
      }
      const earTassel = new THREE.Mesh(new THREE.ConeGeometry(0.020, 0.085, 8), redSilk);
      earTassel.position.set(s * 0.31, -0.18, 0.14);
      mazuCrown.add(rosette, rosetteCore, earTassel);
    });
    // 額箍九顆紅白金寶石 ＋ 高懸精緻「9 串天后垂珠簾」（不遮慈祥雙眼！）
    for (let i = -4; i <= 4; i++) {
      const ang = i * 0.24;
      const gem = new THREE.Mesh(
        new THREE.SphereGeometry(i === 0 ? 0.032 : 0.022, 8, 8),
        i === 0 ? rubyMat : Math.abs(i) % 2 === 1 ? pearlMat : crownBrightGoldMat
      );
      gem.position.set(Math.sin(ang) * 0.280, 0.026, Math.cos(ang) * 0.280);
      mazuCrown.add(gem);
      for (let b = 0; b < 3; b++) {
        const drop = new THREE.Mesh(
          new THREE.SphereGeometry(b === 2 ? 0.017 : 0.011, 6, 6),
          b === 2 ? pearlMat : crownBrightGoldMat
        );
        drop.position.set(i * 0.056, 0.015 - b * 0.032, 0.310);
        mazuCrown.add(drop);
      }
    }
    g.add(mazuCrown);
  } else if (variant === 'centerKing') {
    // =========================================================================
    // ★ V34 中尊【代天巡狩（橘衣武神千歲爺）】：
    //   - 合身挺拔橘色繡金神衣（腹部清晰繡威武金獅頭）
    //   - 修正雙手自然姿態：右手掌指精準橫向緊握「精雕雙月牙金龍方天畫戟」、左手平放安撫左膝（絕不遮獅頭！）
    //   - 台灣正統極致精雕「九龍束冠雙鳳尾斑紋雉翎元帥戰盔」（亮銀鎏金八角高束冠＋雙龍攀柱＋鏤空雕金護耳＋斑紋雙雉雞長翎！）
    // =========================================================================
    const robe = buildTailoredTorso(0.92, -0.02, 0.04);
    const orangeCapeMat = new THREE.MeshStandardMaterial({ color: 0xD85A18, roughness: 0.44, metalness: 0.14 });
    const backCape = new THREE.Mesh(new THREE.BoxGeometry(1.00, 1.22, 0.12), orangeCapeMat);
    backCape.position.set(0, 1.02, -0.24);

    // 穩重自然比例雕木神頸 ＋ 橘紅 V 字交領白綢護領
    addSculptedNeckAndCollar(1.53, 0.096, 0.22, 0.06, 0xC94712, rubyMat);
    // 一體成型柔順多褶橘色坐姿龍袍下裳與雲頭朝靴
    addTailoredSeatedLegsAndBoots(0xDC5514, 0xF5C84C, 0.90);

    // 貼身收腰錦緞紅金玉帶
    const sashBelt = new THREE.Mesh(new THREE.TorusGeometry(0.330, 0.032, 8, 24), redSilk);
    sashBelt.rotation.x = Math.PI / 2;
    sashBelt.position.set(0, 0.88, 0.05);
    const sashGoldLine = new THREE.Mesh(new THREE.TorusGeometry(0.346, 0.011, 6, 24), crownBrightGoldMat);
    sashGoldLine.rotation.x = Math.PI / 2;
    sashGoldLine.position.set(0, 0.88, 0.05);

    // ★ 修正自然雙手：右手 (-X) 掌指環握精雕金龍方天畫戟長柄；左手 (+X) 端正平撫左膝（完全不遮腹部獅頭！）
    addNaturalArticulatedArm(-1, {
      shoulder: [-0.27, 1.36, 0.05],
      elbow: [-0.40, 1.09, 0.15],
      wrist: [-0.34, 1.08, 0.36],
      handPose: 'grip',
      handPos: [-0.33, 1.08, 0.415]
    });
    addNaturalArticulatedArm(1, {
      shoulder: [0.27, 1.36, 0.05],
      elbow: [0.39, 1.04, 0.16],
      wrist: [0.24, 0.74, 0.43],
      handPose: 'knee',
      handPos: [0.23, 0.73, 0.49]
    });

    // ★ V34 極致精雕細長武器「雙月牙金龍方天畫戟」（龍首吞口＋四稜金槍尖＋對稱雙月牙鏤空銀金戟刃＋竹節金環＋雙層紅絲穗！）
    const weaponGroup = new THREE.Group();
    weaponGroup.position.set(-0.33, 1.08, 0.43);
    weaponGroup.rotation.z = 0.09;
    weaponGroup.rotation.x = -0.04;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.016, 1.94, 12), crownGoldMat);
    shaft.position.y = 0.22;
    // 5 道立體竹節雕金環
    [-0.50, -0.20, 0.25, 0.62, 0.94].forEach((ry) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.006, 6, 12), crownBrightGoldMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = ry;
      weaponGroup.add(ring);
    });
    // 紅金纏柄握把（正好被右手四指與大拇指緊握！）
    const shaftGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.24, 12), redSilk);
    shaftGrip.position.y = 0.0;
    for (let gIdx = -3; gIdx <= 3; gIdx++) {
      const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.021, 0.0035, 5, 12), crownBrightGoldMat);
      wrap.rotation.x = Math.PI / 2 + 0.22;
      wrap.position.y = gIdx * 0.032;
      weaponGroup.add(wrap);
    }
    // 底部蓮花金戟鐏
    const buttLotus = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.016, 0.07, 8), crownBrightGoldMat);
    buttLotus.position.y = -0.73;
    const shaftButt = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.13, 8), silverFiligreeMat);
    shaftButt.rotation.x = Math.PI;
    shaftButt.position.y = -0.82;

    // 頂部精雕「金龍吞口戟座」（立體龍首＋紅寶龍睛＋捲角＋四稜銀金長槍尖！）
    const dragonSocket = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.022, 0.11, 10), crownBrightGoldMat);
    dragonSocket.position.y = 1.15;
    const dragonHead = new THREE.Mesh(new THREE.SphereGeometry(0.040, 12, 10), crownBrightGoldMat);
    dragonHead.scale.set(0.88, 1.15, 0.92);
    dragonHead.position.y = 1.22;
    [-1, 1].forEach((ds) => {
      const dEye = new THREE.Mesh(new THREE.SphereGeometry(0.010, 6, 6), rubyMat);
      dEye.position.set(ds * 0.028, 1.24, 0.024);
      const dHorn = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.048, 6), crownGoldMat);
      dHorn.position.set(ds * 0.032, 1.26, -0.012);
      dHorn.rotation.z = ds * -0.52;
      weaponGroup.add(dEye, dHorn);
    });
    const spearBlade = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.34, 4), silverFiligreeMat);
    spearBlade.scale.set(1.15, 1.0, 0.36);
    spearBlade.position.y = 1.43;
    const spearSpine = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.32, 4), crownBrightGoldMat);
    spearSpine.position.y = 1.41;

    // 左右對稱「雙月牙鏤空方天畫戟刃」（真正弧形月牙刀刃＋雕金祥雲連接橋＋紅寶釘飾！）
    const crescentShape = new THREE.Shape();
    crescentShape.moveTo(0.0, 0.14);
    crescentShape.quadraticCurveTo(0.14, 0.05, 0.14, -0.03);
    crescentShape.quadraticCurveTo(0.11, -0.14, 0.0, -0.18);
    crescentShape.quadraticCurveTo(0.075, -0.09, 0.078, -0.01);
    crescentShape.quadraticCurveTo(0.075, 0.07, 0.0, 0.14);
    const crescentGeo = new THREE.ExtrudeGeometry(crescentShape, { depth: 0.010, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 2 });
    crescentGeo.translate(0, 0, -0.005);
    [-1, 1].forEach((bs) => {
      const blade = new THREE.Mesh(crescentGeo, silverFiligreeMat);
      blade.position.set(bs * 0.046, 1.28, 0);
      if (bs < 0) blade.scale.x = -1;
      const bridgeTop = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.016, 0.016), crownBrightGoldMat);
      bridgeTop.position.set(bs * 0.056, 1.33, 0);
      bridgeTop.rotation.z = bs * 0.25;
      const bridgeBot = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.016, 0.016), crownBrightGoldMat);
      bridgeBot.position.set(bs * 0.056, 1.21, 0);
      bridgeBot.rotation.z = bs * -0.25;
      const bladeGem = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), rubyMat);
      bladeGem.position.set(bs * 0.074, 1.27, 0.008);
      weaponGroup.add(blade, bridgeTop, bridgeBot, bladeGem);
    });

    // 雙層流暢紅絲穗金珠流蘇
    const tasselBead = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), crownBrightGoldMat);
    tasselBead.position.set(0, 1.08, 0.01);
    const tasselUpper = new THREE.Mesh(new THREE.ConeGeometry(0.040, 0.14, 12), redSilk);
    tasselUpper.position.set(0, 0.99, 0.01);
    const tasselLower = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.18, 12), redSilk);
    tasselLower.position.set(0, 0.90, 0.01);
    weaponGroup.add(shaft, shaftGrip, buttLotus, shaftButt, dragonSocket, dragonHead, spearBlade, spearSpine, tasselBead, tasselUpper, tasselLower);
    g.add(weaponGroup);

    // ★ 較小神尊頭部＋台灣正統「九龍束冠雙鳳尾斑紋雉翎元帥戰盔」
    const centerHeadGroup = new THREE.Group();
    centerHeadGroup.position.set(0, 1.79, 0.07);
    centerHeadGroup.rotation.y = 0.48;

    const smallR = 0.194;
    const face = new THREE.Mesh(new THREE.SphereGeometry(smallR, 22, 18), faceMat);
    face.rotation.y = -Math.PI / 2;
    addCarvedWoodFaceRelief(0, 0, smallR, false, centerHeadGroup);

    const hairBeardMat = new THREE.MeshStandardMaterial({
      map: createBeardHairTexture(),
      color: 0x222028,
      roughness: 0.38,
      metalness: 0.16,
      side: THREE.DoubleSide
    });
    const buildCenterBeardLock = (xOff, len, topW, zArch) => {
      const segY = 12;
      const segX = 4;
      const pos = [];
      const uvs = [];
      const idx = [];
      for (let iy = 0; iy <= segY; iy++) {
        const v = iy / segY;
        const y = -0.105 - len * v;
        const w = topW * Math.pow(1 - v, 0.78);
        const z = 0.186 + Math.sin(v * Math.PI) * zArch - v * 0.015;
        for (let ix = 0; ix <= segX; ix++) {
          const u = ix / segX;
          pos.push(xOff + (u - 0.5) * w, y, z + Math.cos((u - 0.5) * Math.PI) * 0.012 * (1 - v * 0.6));
          uvs.push(u, 1 - v);
        }
      }
      const row = segX + 1;
      for (let iy = 0; iy < segY; iy++) {
        for (let ix = 0; ix < segX; ix++) {
          const a = iy * row + ix;
          idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
        }
      }
      const bGeo = new THREE.BufferGeometry();
      bGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      bGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      bGeo.setIndex(idx);
      bGeo.computeVertexNormals();
      return new THREE.Mesh(bGeo, hairBeardMat);
    };
    centerHeadGroup.add(
      buildCenterBeardLock(0, 0.25, 0.095, 0.020),
      buildCenterBeardLock(-0.050, 0.19, 0.052, 0.012),
      buildCenterBeardLock(0.050, 0.19, 0.052, 0.012)
    );
    [-1, 1].forEach((ms) => {
      const mCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(ms * 0.008, -0.076, 0.196),
        new THREE.Vector3(ms * 0.054, -0.084, 0.200),
        new THREE.Vector3(ms * 0.104, -0.114, 0.186),
        new THREE.Vector3(ms * 0.128, -0.155, 0.168)
      ]);
      centerHeadGroup.add(new THREE.Mesh(new THREE.TubeGeometry(mCurve, 10, 0.010, 6, false), hairBeardMat));
    });

    // ★ V34 極致精雕台灣「九龍束冠雙鳳尾斑紋雉翎元帥戰盔」（高亮度金銀雙色柳絲＋8 道金脊束冠＋紅寶額牌＋斑紋雙雉雞長翎！）
    const ckBand = new THREE.Mesh(new THREE.TorusGeometry(0.206, 0.026, 10, 24), crownBrightGoldMat);
    ckBand.rotation.x = Math.PI / 2;
    ckBand.position.set(0, 0.13, -0.01);
    const ckSilverBand = new THREE.Mesh(new THREE.TorusGeometry(0.218, 0.012, 8, 24), silverFiligreeMat);
    ckSilverBand.rotation.x = Math.PI / 2;
    ckSilverBand.position.set(0, 0.162, -0.01);
    // 額箍九顆寶珠
    for (let i = -3; i <= 3; i++) {
      const ang = i * 0.30;
      const gOrb = new THREE.Mesh(new THREE.SphereGeometry(i === 0 ? 0.026 : 0.018, 8, 8), i === 0 ? rubyMat : Math.abs(i) % 2 === 1 ? pearlMat : jadeMat);
      gOrb.position.set(Math.sin(ang) * 0.222, 0.145, -0.01 + Math.cos(ang) * 0.222);
      centerHeadGroup.add(gOrb);
    }
    const ckDome = new THREE.Mesh(new THREE.SphereGeometry(0.196, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), crownGoldMat);
    ckDome.position.set(0, 0.14, -0.01);
    // 亮銀鎏金八角高束冠 ＋ 8 道立體起脊金條與冠底蓮瓣
    const ckTower = new THREE.Mesh(new THREE.CylinderGeometry(0.096, 0.140, 0.34, 8), silverFiligreeMat);
    ckTower.position.set(0, 0.41, -0.02);
    const ckTowerCore = new THREE.Mesh(new THREE.CylinderGeometry(0.106, 0.150, 0.08, 8), redSilk);
    ckTowerCore.position.set(0, 0.25, -0.02);
    for (let rIdx = 0; rIdx < 8; rIdx++) {
      const ra = (rIdx / 8) * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.35, 6), crownBrightGoldMat);
      rib.position.set(Math.sin(ra) * 0.122, 0.41, -0.02 + Math.cos(ra) * 0.122);
      rib.rotation.order = 'YXZ';
      rib.rotation.y = ra;
      rib.rotation.x = -0.12;
      const lotusPetal = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 6), rIdx % 2 === 0 ? crownBrightGoldMat : silverFiligreeMat);
      lotusPetal.scale.set(0.95, 1.35, 0.42);
      lotusPetal.position.set(Math.sin(ra) * 0.158, 0.24, -0.02 + Math.cos(ra) * 0.158);
      lotusPetal.rotation.y = ra;
      centerHeadGroup.add(rib, lotusPetal);
    }
    const ckTowerGoldRim1 = new THREE.Mesh(new THREE.TorusGeometry(0.138, 0.016, 8, 18), crownBrightGoldMat);
    ckTowerGoldRim1.rotation.x = Math.PI / 2;
    ckTowerGoldRim1.position.set(0, 0.30, -0.02);
    const ckTowerGoldRim2 = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.016, 8, 18), crownBrightGoldMat);
    ckTowerGoldRim2.rotation.x = Math.PI / 2;
    ckTowerGoldRim2.position.set(0, 0.54, -0.02);
    // 冠前精雕「金龍火焰額牌＋紅寶珠」
    const ckFrontShield = new THREE.Mesh(new THREE.ConeGeometry(0.098, 0.25, 4), crownBrightGoldMat);
    ckFrontShield.scale.set(1.0, 1.0, 0.34);
    ckFrontShield.position.set(0, 0.30, 0.185);
    const ckFrontRing = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.011, 6, 16), silverFiligreeMat);
    ckFrontRing.position.set(0, 0.26, 0.205);
    const ckRuby = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), rubyMat);
    ckRuby.position.set(0, 0.26, 0.215);
    // 盔頂通天火焰寶槍尖
    const ckSpireBase = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.095, 0.11, 8), crownBrightGoldMat);
    ckSpireBase.position.set(0, 0.62, -0.02);
    const ckSpireHalo = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.012, 6, 16), crownBrightGoldMat);
    ckSpireHalo.position.set(0, 0.72, -0.02);
    const ckSpirePearl = new THREE.Mesh(new THREE.SphereGeometry(0.044, 10, 10), rubyMat);
    ckSpirePearl.position.set(0, 0.72, -0.02);
    const ckSpireTip = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.17, 6), crownBrightGoldMat);
    ckSpireTip.position.set(0, 0.84, -0.02);

    // 斑紋金紅「雙鳳尾雉雞長翎」貼圖（傳統京劇／台灣武將帥盔斑節羽紋！）
    const plCanvas = document.createElement('canvas');
    plCanvas.width = 64; plCanvas.height = 256;
    const pCtx = plCanvas.getContext('2d');
    const pGrad = pCtx.createLinearGradient(0, 0, 0, 256);
    pGrad.addColorStop(0, '#FFE484');
    pGrad.addColorStop(0.55, '#F5B83B');
    pGrad.addColorStop(1, '#D97706');
    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 64, 256);
    for (let by = 14; by < 245; by += 24) {
      pCtx.fillStyle = '#7C1D16';
      pCtx.fillRect(0, by, 64, 8);
      pCtx.fillStyle = '#FFF7D6';
      pCtx.fillRect(0, by + 8, 64, 3);
    }
    const plTex = new THREE.CanvasTexture(plCanvas);
    plTex.colorSpace = THREE.SRGBColorSpace;
    const plumeMat = new THREE.MeshStandardMaterial({ map: plTex, emissive: 0x382004, emissiveIntensity: 0.35, metalness: 0.25, roughness: 0.32, side: THREE.DoubleSide });

    [-1, 1].forEach((s) => {
      // 精雕金銀武將護耳（外金框＋內銀紋＋翠玉）
      const earGuard = new THREE.Mesh(new RoundedBoxGeometry(0.040, 0.165, 0.125, 2, 0.014), crownGoldMat);
      earGuard.position.set(s * 0.21, 0.05, -0.02);
      earGuard.rotation.z = s * -0.14;
      const earInner = new THREE.Mesh(new RoundedBoxGeometry(0.046, 0.115, 0.085, 2, 0.010), silverFiligreeMat);
      earInner.position.set(s * 0.212, 0.05, -0.02);
      earInner.rotation.z = s * -0.14;
      const earGem = new THREE.Mesh(new THREE.SphereGeometry(0.020, 8, 8), jadeMat);
      earGem.position.set(s * 0.236, 0.055, 0.01);

      const dCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.18, 0.18, 0.10),
        new THREE.Vector3(s * 0.15, 0.34, 0.14),
        new THREE.Vector3(s * 0.09, 0.49, 0.10),
        new THREE.Vector3(s * 0.04, 0.62, 0.03)
      ]);
      const dMesh = new THREE.Mesh(new THREE.TubeGeometry(dCurve, 14, 0.017, 6, false), crownBrightGoldMat);

      // 飄逸修長「斑紋雉雞尾長翎」
      const plumeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.09, 0.48, -0.04),
        new THREE.Vector3(s * 0.21, 0.74, -0.08),
        new THREE.Vector3(s * 0.36, 0.90, -0.11),
        new THREE.Vector3(s * 0.48, 0.78, -0.13)
      ]);
      const pSeg = 20;
      const pPos = [];
      const pUvs = [];
      const pIdx = [];
      for (let ip = 0; ip <= pSeg; ip++) {
        const ptT = ip / pSeg;
        const cPt = plumeCurve.getPointAt(ptT);
        const wFeather = Math.sin(Math.pow(ptT, 0.72) * Math.PI) * 0.038 + 0.007;
        pPos.push(cPt.x - s * wFeather * 0.35, cPt.y + wFeather, cPt.z);
        pPos.push(cPt.x + s * wFeather * 0.35, cPt.y - wFeather, cPt.z + 0.012);
        pUvs.push(0, ptT, 1, ptT);
      }
      for (let ip = 0; ip < pSeg; ip++) {
        const a = ip * 2;
        pIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      const plumeGeo = new THREE.BufferGeometry();
      plumeGeo.setAttribute('position', new THREE.Float32BufferAttribute(pPos, 3));
      plumeGeo.setAttribute('uv', new THREE.Float32BufferAttribute(pUvs, 2));
      plumeGeo.setIndex(pIdx);
      plumeGeo.computeVertexNormals();
      const plumeMesh = new THREE.Mesh(plumeGeo, plumeMat);
      const plumeSpine = new THREE.Mesh(new THREE.TubeGeometry(plumeCurve, 18, 0.007, 6, false), crownBrightGoldMat);
      const plumeTipRuby = new THREE.Mesh(new THREE.SphereGeometry(0.020, 8, 8), rubyMat);
      plumeTipRuby.position.set(s * 0.38, 0.87, -0.11);

      // 流線曲線柳絲帽翅（取代小方塊！）
      const cheekCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.16, 0.21, 0.04),
        new THREE.Vector3(s * 0.26, 0.28, 0.02),
        new THREE.Vector3(s * 0.31, 0.22, -0.02)
      ]);
      const cheekWing = new THREE.Mesh(new THREE.TubeGeometry(cheekCurve, 12, 0.015, 6, false), crownBrightGoldMat);
      const cheekPearl = new THREE.Mesh(new THREE.SphereGeometry(0.019, 8, 8), pearlMat);
      cheekPearl.position.set(s * 0.31, 0.22, -0.02);
      centerHeadGroup.add(earGuard, earInner, earGem, dMesh, plumeMesh, plumeSpine, plumeTipRuby, cheekWing, cheekPearl);
    });
    centerHeadGroup.add(face, ckBand, ckSilverBand, ckDome, ckTower, ckTowerCore, ckTowerGoldRim1, ckTowerGoldRim2, ckFrontShield, ckFrontRing, ckRuby, ckSpireBase, ckSpireHalo, ckSpirePearl, ckSpireTip);

    g.add(robe, backCape, sashBelt, sashGoldLine, centerHeadGroup);
  } else {
    // =========================================================================
    // ★ V34 右尊【五年千歲黑髯王爺公（盧千歲）】：
    //   - 修正自然威嚴雙手：寬袖順扶手內側流暢前伸，溫潤雕木雙掌平放安撫雙膝頂弧（立體清楚零埋沒！）
    //   - 交叉「雲林馬鳴山五年千歲」紅綾飄帶嚴格跨覆於金色腰帶「外側」，五綹修形真髮長黑髯再嚴格位於飄帶「外側」（三層立體 100% 零穿幫！）
    //   - 台灣鹿港極致工藝「五年千歲飛簷風鈴・雙龍拜塔鳥翅仔王爺相帽」（鏤空金銀柳絲柱欄透紅絨＋四角翹簷金風鈴四方平台＋三層金銀寶塔＋雙龍搶珠＋鏤空雕龍雙層鳥翅仔！）
    // =========================================================================
    const robe = buildTailoredTorso(1.02, 0.02, 0.03);
    const cape = new THREE.Mesh(new THREE.BoxGeometry(1.14, 1.38, 0.14), redSilk);
    cape.position.set(0, 1.06, -0.24);
    const waistBelt = new THREE.Mesh(new THREE.TorusGeometry(0.365, 0.038, 10, 24), crownBrightGoldMat);
    waistBelt.rotation.x = Math.PI / 2;
    waistBelt.position.set(0, 0.94, 0.04);
    g.add(robe, cape, waistBelt);

    // 穩重自然比例雕木神頸 ＋ 深紅金邊 V 字交領白綢護領
    addSculptedNeckAndCollar(1.58, 0.114, 0.27, 0.05, 0x8F181C, jadeMat);
    // 一體成型柔順多褶暗紅龍袍下裳與雲頭朝靴
    addTailoredSeatedLegsAndBoots(0x521B18, 0xE8BD4C, 1.0);

    // ★ 修正威儀王爺坐姿自然雙手：寬大龍袍垂袖無縫銜接斜肩，溫潤樟木雙掌自然平放安撫雙膝頂弧！
    [-1, 1].forEach((s) => {
      addNaturalArticulatedArm(s, {
        shoulder: [s * 0.29, 1.40, 0.04],
        elbow: [s * 0.44, 1.07, 0.15],
        wrist: [s * 0.25, 0.74, 0.45],
        handPose: 'knee',
        handPos: [s * 0.24, 0.73, 0.51]
      });
    });

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.248, 24, 20), faceMat);
    head.position.set(0, 1.87, 0.06);
    head.rotation.y = -Math.PI / 2;
    addCarvedWoodFaceRelief(1.87, 0.06, 0.248, false);
    g.add(head);

    // ★ 交叉「雲林馬鳴山五年千歲」紅綾飄帶：傳入 beltSpec 確保 100% 跨覆於金色腰帶「外側」絕不穿入腰帶！
    const kingBeltSpec = { beltY: 0.94, beltOuterR: 0.410, beltZOff: 0.04 };
    g.add(buildFlowingSashMesh(sashMatRight, -1, { topY: 1.46, botY: 0.70, scaleW: 1.02, yShift: 0.02, zOff: 0.03, layerOffset: 0.022, width: 0.152, beltSpec: kingBeltSpec }));
    g.add(buildFlowingSashMesh(sashMatRight, 1, { topY: 1.46, botY: 0.70, scaleW: 1.02, yShift: 0.02, zOff: 0.03, layerOffset: 0.038, width: 0.152, beltSpec: kingBeltSpec }));

    // ★ V34 三層物理隔離零穿幫「威儀五綹修形真髮長黑髯」（同樣傳入 kingBeltSpec ＋ 10.5cm 偏移，確保同時凌駕於腰帶與交叉紅綾飄帶外側 ≥ 6.5cm，任何角度 100% 零穿幫！）
    const beardHairMat = new THREE.MeshStandardMaterial({
      map: createBeardHairTexture(),
      color: 0x222028,
      roughness: 0.38,
      metalness: 0.16,
      side: THREE.DoubleSide
    });
    const buildShapedBeardLock = (xTop, xBot, topY, len, topW, botW, layerOff, zWave) => {
      const segY = 22;
      const segX = 8;
      const pos = [];
      const uvs = [];
      const idx = [];
      for (let iy = 0; iy <= segY; iy++) {
        const v = iy / segY;
        const y = topY - len * v;
        const cx = THREE.MathUtils.lerp(xTop, xBot, Math.pow(v, 0.85));
        const w = topW * Math.pow(1 - v, 0.72) + botW * (1 - Math.pow(v, 2.2));
        const chinBlend = Math.min(1, v / 0.18);
        for (let ix = 0; ix <= segX; ix++) {
          const u = ix / segX;
          const x = cx + (u - 0.5) * w;
          const safeFrontZ = torsoSurfaceZ(x, y, 1.02, 0.02, 0.03, kingBeltSpec) + layerOff;
          const chinZ = 0.320 - Math.abs(x) * 0.22;
          const zBase = Math.max(chinZ * (1 - chinBlend * 0.14), THREE.MathUtils.lerp(chinZ, safeFrontZ, chinBlend));
          const zArch = zBase + Math.sin(v * Math.PI * 1.8) * zWave + Math.cos((u - 0.5) * Math.PI) * (0.020 * (1 - v * 0.55));
          pos.push(x, y, zArch);
          uvs.push(u, 1 - v);
        }
      }
      const row = segX + 1;
      for (let iy = 0; iy < segY; iy++) {
        for (let ix = 0; ix < segX; ix++) {
          const a = iy * row + ix;
          const b = a + 1;
          const c = (iy + 1) * row + ix;
          const d = c + 1;
          idx.push(a, c, b, b, c, d);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const lock = new THREE.Mesh(geo, beardHairMat);
      lock.castShadow = true;
      return lock;
    };
    g.add(
      buildShapedBeardLock(0, 0, 1.69, 0.78, 0.175, 0.016, 0.116, 0.010),
      buildShapedBeardLock(-0.090, -0.068, 1.70, 0.62, 0.105, 0.012, 0.106, -0.008),
      buildShapedBeardLock(0.090, 0.068, 1.70, 0.62, 0.105, 0.012, 0.106, 0.008),
      buildShapedBeardLock(-0.158, -0.136, 1.72, 0.44, 0.068, 0.008, 0.098, 0.006),
      buildShapedBeardLock(0.158, 0.136, 1.72, 0.44, 0.068, 0.008, 0.098, -0.006)
    );
    // 威儀雙撇八字長鬍
    [-1, 1].forEach((s) => {
      const mPts = [
        new THREE.Vector3(s * 0.012, 1.722, 0.330),
        new THREE.Vector3(s * 0.076, 1.714, 0.352),
        new THREE.Vector3(s * 0.148, 1.672, 0.355),
        new THREE.Vector3(s * 0.208, 1.602, 0.352),
        new THREE.Vector3(s * 0.236, 1.540, 0.346)
      ];
      for (let seg = 0; seg < mPts.length - 1; seg++) {
        const p0 = mPts[seg];
        const p1 = mPts[seg + 1];
        const dir = p1.clone().sub(p0);
        const len = dir.length();
        const r0 = 0.020 * (1 - seg * 0.20);
        const r1 = 0.020 * (1 - (seg + 1) * 0.20);
        const segMesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len + 0.008, 8), beardHairMat);
        segMesh.position.copy(p0).addScaledVector(dir, 0.5);
        segMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        g.add(segMesh);
      }
    });

    // 右尊佛珠「一圈一圈的」3 圈層疊掛於左右實木神轎扶手轎角！
    const armX = chairW / 2 - 0.08;
    [-1, 1].forEach((side) => {
      const coilHost = new THREE.Group();
      coilHost.position.set(side * armX, 1.10, 0.48);
      [
        { rx: 0.125, ry: 0.205, zOff: -0.025, tiltY: side * 0.22, tiltZ: side * -0.08, count: 16 },
        { rx: 0.142, ry: 0.235, zOff: 0.015, tiltY: side * 0.34, tiltZ: side * -0.04, count: 18 },
        { rx: 0.158, ry: 0.265, zOff: 0.055, tiltY: side * 0.44, tiltZ: side * 0.02, count: 20 }
      ].forEach((loop, li) => {
        const ringG = new THREE.Group();
        ringG.position.set(0, -loop.ry + 0.03, loop.zOff);
        ringG.rotation.y = loop.tiltY;
        ringG.rotation.z = loop.tiltZ;
        for (let b = 0; b < loop.count; b++) {
          const ang = (b / loop.count) * Math.PI * 2;
          const isBotGold = b === Math.floor(loop.count * 0.75) && li === 1;
          const bead = new THREE.Mesh(
            new THREE.SphereGeometry(isBotGold ? 0.036 : 0.028, 8, 8),
            isBotGold ? crownBrightGoldMat : beadWood
          );
          bead.position.set(Math.cos(ang) * loop.rx, Math.sin(ang) * loop.ry, 0);
          ringG.add(bead);
        }
        coilHost.add(ringG);
      });
      const bindCord = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.013, 6, 12), redSilk);
      bindCord.rotation.x = Math.PI / 2;
      bindCord.position.set(0, 0.02, 0.0);
      const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.16, 8), redSilk);
      tassel.position.set(side * 0.02, -0.56, 0.02);
      coilHost.add(bindCord, tassel);
      g.add(coilHost);
    });

    // ★ V34 極致精雕台灣鹿港「五年千歲王爺相帽（飛簷風鈴・雙龍拜塔・鏤空鳥翅仔帝王冠）」：
    //   亮金明銀雙色鏤空柱欄透紅絨胎 ＋ 四角微翹飛簷與金風鈴四方平台 ＋ 精雕三層金銀雙龍拜塔 ＋ 冠前雙龍搶珠 ＋ 鏤空曲線雕龍雙層鳥翅仔！
    const wyCrown = new THREE.Group();
    wyCrown.position.set(0, 2.02, 0.05);
    const wyBaseRing = new THREE.Mesh(new THREE.TorusGeometry(0.275, 0.032, 10, 28), crownBrightGoldMat);
    wyBaseRing.rotation.x = Math.PI / 2;
    const wySilverFiligree = new THREE.Mesh(new THREE.TorusGeometry(0.292, 0.014, 8, 28), silverFiligreeMat);
    wySilverFiligree.rotation.x = Math.PI / 2;
    wySilverFiligree.position.y = 0.048;
    // 內縮朱紅絨胎 ＋ 四角雕金龍柱與 12 道鏤空金銀柳絲拱門（徹底取代厚實方塊盒！）
    const wyCore = new THREE.Mesh(new RoundedBoxGeometry(0.41, 0.36, 0.39, 3, 0.07), redSilk);
    wyCore.position.y = 0.23;
    [[-0.225, -0.215], [0.225, -0.215], [-0.225, 0.215], [0.225, 0.215]].forEach(([cx, cz]) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.022, 0.36, 8), crownBrightGoldMat);
      col.position.set(cx, 0.23, cz);
      // 平台四角微翹飛簷與垂掛迷你金風鈴！
      const eaveHorn = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.11, 6), crownBrightGoldMat);
      eaveHorn.position.set(cx * 1.32, 0.47, cz * 1.32);
      eaveHorn.rotation.z = cx > 0 ? -0.62 : 0.62;
      eaveHorn.rotation.x = cz > 0 ? 0.62 : -0.62;
      const eaveBell = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.055, 6), crownGoldMat);
      eaveBell.position.set(cx * 1.24, 0.39, cz * 1.24);
      wyCrown.add(col, eaveHorn, eaveBell);
    });
    // 四面鏤空柳絲拱欄
    for (let k = -1; k <= 1; k++) {
      const fArch = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.011, 6, 14, Math.PI), k === 0 ? crownBrightGoldMat : silverFiligreeMat);
      fArch.position.set(k * 0.135, 0.24, 0.225);
      const sArchL = fArch.clone();
      sArchL.rotation.y = Math.PI / 2;
      sArchL.position.set(-0.235, 0.24, k * 0.125);
      const sArchR = sArchL.clone();
      sArchR.position.x = 0.235;
      wyCrown.add(fArch, sArchL, sArchR);
    }
    // 雙層精雕四方平台（金底＋明銀花邊＋頂部三層金銀寶塔！）
    const wySquarePlat = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.052, 0.51, 2, 0.016), crownGoldMat);
    wySquarePlat.position.y = 0.42;
    const wyPlatSilver = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.020, 0.54), silverFiligreeMat);
    wyPlatSilver.position.y = 0.445;
    // 三層精雕「雙龍拜塔」小金塔（六角鎏金塔身＋明銀翹簷＋寶珠尖！）
    const pTier1 = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.145, 0.125, 6), crownGoldMat);
    pTier1.position.y = 0.52;
    const pEave1 = new THREE.Mesh(new THREE.ConeGeometry(0.182, 0.065, 6), silverFiligreeMat);
    pEave1.position.y = 0.595;
    const pTier2 = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.100, 0.105, 6), crownBrightGoldMat);
    pTier2.position.y = 0.67;
    const pEave2 = new THREE.Mesh(new THREE.ConeGeometry(0.132, 0.055, 6), silverFiligreeMat);
    pEave2.position.y = 0.735;
    const pTier3 = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.068, 0.080, 6), crownGoldMat);
    pTier3.position.y = 0.79;
    const pEave3 = new THREE.Mesh(new THREE.ConeGeometry(0.092, 0.045, 6), crownBrightGoldMat);
    pEave3.position.y = 0.84;
    const pSpireHalo = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.010, 6, 14), crownBrightGoldMat);
    pSpireHalo.position.y = 0.90;
    const pSpire = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), rubyMat);
    pSpire.position.y = 0.90;
    const pSpireTip = new THREE.Mesh(new THREE.ConeGeometry(0.020, 0.095, 6), crownBrightGoldMat);
    pSpireTip.position.y = 0.99;
    wyCrown.add(wyBaseRing, wySilverFiligree, wyCore, wySquarePlat, wyPlatSilver, pTier1, pEave1, pTier2, pEave2, pTier3, pEave3, pSpireHalo, pSpire, pSpireTip);

    // 冠前「雙龍搶珠」（立體紅寶火珠＋銀絲火焰輪＋雙金龍戲珠！）
    const wyFrontPearl = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 12), rubyMat);
    wyFrontPearl.position.set(0, 0.27, 0.285);
    const wyPearlHalo = new THREE.Mesh(new THREE.TorusGeometry(0.076, 0.013, 8, 18), silverFiligreeMat);
    wyPearlHalo.position.set(0, 0.27, 0.275);
    wyCrown.add(wyFrontPearl, wyPearlHalo);

    // 台灣王爺相帽招牌左右「鏤空曲線雕龍雙層『鳥翅仔』」（細緻流線柳絲鏤空花翅，徹底取代呆板實心方板！）
    [-1, 1].forEach((s) => {
      const frontDragon = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.25, 0.09, 0.21),
        new THREE.Vector3(s * 0.21, 0.21, 0.28),
        new THREE.Vector3(s * 0.095, 0.28, 0.295)
      ]);
      wyCrown.add(new THREE.Mesh(new THREE.TubeGeometry(frontDragon, 14, 0.020, 8, false), crownBrightGoldMat));

      const topDragon = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.22, 0.46, 0.06),
        new THREE.Vector3(s * 0.19, 0.64, 0.08),
        new THREE.Vector3(s * 0.10, 0.80, 0.04)
      ]);
      wyCrown.add(new THREE.Mesh(new THREE.TubeGeometry(topDragon, 14, 0.017, 6, false), crownBrightGoldMat));

      // 上層流線鏤空「金銀燕尾翹翅」（上下兩道金銀弧骨＋內嵌鏤空捲雲與翠玉紅珠！）
      const upTopArc = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.24, 0.34, -0.03),
        new THREE.Vector3(s * 0.44, 0.47, -0.05),
        new THREE.Vector3(s * 0.64, 0.58, -0.08)
      ]);
      const upBotArc = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.24, 0.25, -0.03),
        new THREE.Vector3(s * 0.45, 0.34, -0.05),
        new THREE.Vector3(s * 0.64, 0.58, -0.08)
      ]);
      const upMidScroll = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.28, 0.30, -0.03),
        new THREE.Vector3(s * 0.43, 0.41, -0.04),
        new THREE.Vector3(s * 0.55, 0.48, -0.06)
      ]);
      const upFrame1 = new THREE.Mesh(new THREE.TubeGeometry(upTopArc, 16, 0.020, 8, false), crownBrightGoldMat);
      const upFrame2 = new THREE.Mesh(new THREE.TubeGeometry(upBotArc, 16, 0.016, 8, false), silverFiligreeMat);
      const upScroll = new THREE.Mesh(new THREE.TubeGeometry(upMidScroll, 12, 0.011, 6, false), crownGoldMat);
      const upWingGem = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), jadeMat);
      upWingGem.position.set(s * 0.44, 0.41, -0.03);
      const upTipPearl = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), pearlMat);
      upTipPearl.position.set(s * 0.64, 0.58, -0.08);

      // 下層 45° 斜展「鏤空盤龍鳥翅仔」
      const lowTopArc = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.25, 0.22, 0.04),
        new THREE.Vector3(s * 0.44, 0.14, 0.02),
        new THREE.Vector3(s * 0.57, -0.02, 0.00)
      ]);
      const lowBotArc = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.25, 0.13, 0.04),
        new THREE.Vector3(s * 0.41, 0.04, 0.02),
        new THREE.Vector3(s * 0.57, -0.02, 0.00)
      ]);
      const lowFrame1 = new THREE.Mesh(new THREE.TubeGeometry(lowTopArc, 14, 0.018, 8, false), crownBrightGoldMat);
      const lowFrame2 = new THREE.Mesh(new THREE.TubeGeometry(lowBotArc, 14, 0.014, 6, false), silverFiligreeMat);
      const lowWingDragon = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.012, 6, 14), crownBrightGoldMat);
      lowWingDragon.position.set(s * 0.42, 0.10, 0.03);
      const lowWingRuby = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), rubyMat);
      lowWingRuby.position.set(s * 0.42, 0.10, 0.04);

      for (let b = 0; b < 5; b++) {
        const drop = new THREE.Mesh(
          new THREE.SphereGeometry(b === 4 ? 0.022 : 0.016, 8, 8),
          b === 4 ? rubyMat : b % 2 === 0 ? pearlMat : crownBrightGoldMat
        );
        drop.position.set(s * 0.33, 0.04 - b * 0.058, 0.15);
        wyCrown.add(drop);
      }
      const sideTassel = new THREE.Mesh(new THREE.ConeGeometry(0.020, 0.095, 8), redSilk);
      sideTassel.position.set(s * 0.33, -0.28, 0.15);
      wyCrown.add(upFrame1, upFrame2, upScroll, upWingGem, upTipPearl, lowFrame1, lowFrame2, lowWingDragon, lowWingRuby, sideTassel);
    });

    for (let i = -4; i <= 4; i++) {
      const ang = i * 0.25;
      const gem = new THREE.Mesh(
        new THREE.SphereGeometry(i === 0 ? 0.040 : 0.026, 8, 8),
        i === 0 ? rubyMat : Math.abs(i) % 2 === 1 ? jadeMat : pearlMat
      );
      gem.position.set(Math.sin(ang) * 0.295, 0.048, Math.cos(ang) * 0.295);
      wyCrown.add(gem);
    }
    g.add(wyCrown);
  }

  return g;
}

/**
 * ★ V29 工匠精雕古銅鎏金「雙龍雲雷紋四足方鼎香爐」（四足獸首鼎腳＋四面雙龍搶珠德慈宮浮雕＋四角金扉稜＋S形騰龍雙耳！）
 */
function createAntiqueSquareCenser() {
  const g = new THREE.Group();
  const bronzeDark = new THREE.MeshStandardMaterial({ color: 0x3D3126, metalness: 0.68, roughness: 0.36 });
  const bronzeMid = new THREE.MeshStandardMaterial({ color: 0x524231, metalness: 0.64, roughness: 0.34 });
  const goldTrim = new THREE.MeshStandardMaterial({ color: 0xE8BD52, metalness: 0.80, roughness: 0.24 });
  const reliefTex = createCarvedCenserReliefTexture();
  const reliefMat = new THREE.MeshStandardMaterial({ map: reliefTex, metalness: 0.52, roughness: 0.34 });

  // 1. 四足彎曲獸首鼎腳（穩立於主神桌面，告別方塊底座！）
  [[-0.50, -0.34], [0.50, -0.34], [-0.50, 0.34], [0.50, 0.34]].forEach(([lx, lz]) => {
    const footPad = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.098, 0.045, 10), goldTrim);
    footPad.position.set(lx, 0.022, lz);
    const legCol = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.058, 0.16, 10), bronzeDark);
    legCol.position.set(lx, 0.115, lz);
    const beastKnee = new THREE.Mesh(new THREE.SphereGeometry(0.076, 10, 8), goldTrim);
    beastKnee.scale.set(1.05, 0.85, 1.05);
    beastKnee.position.set(lx * 1.02, 0.185, lz * 1.02);
    g.add(footPad, legCol, beastKnee);
  });

  // 2. 階梯雕花下托盤 ＋ 鎏金珠飾線腳
  const basePlate = new THREE.Mesh(new RoundedBoxGeometry(1.18, 0.075, 0.84, 2, 0.018), bronzeDark);
  basePlate.position.y = 0.205;
  const baseGoldRim = new THREE.Mesh(new THREE.BoxGeometry(1.21, 0.022, 0.87), goldTrim);
  baseGoldRim.position.y = 0.246;

  // 3. 方鼎主爐腹（四面貼覆「雙龍搶珠・德慈宮・雲雷回紋」古銅浮雕花紋＋四角金扉稜！）
  const waist = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.40, 0.74), bronzeMid);
  waist.position.y = 0.455;
  waist.castShadow = true;
  const frontPanel = new THREE.Mesh(new THREE.PlaneGeometry(1.00, 0.34), reliefMat);
  frontPanel.position.set(0, 0.455, 0.373);
  const backPanel = new THREE.Mesh(new THREE.PlaneGeometry(1.00, 0.34), reliefMat);
  backPanel.rotation.y = Math.PI;
  backPanel.position.set(0, 0.455, -0.373);
  [-1, 1].forEach((sx) => {
    const sidePanel = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.34), reliefMat);
    sidePanel.rotation.y = sx * (Math.PI / 2);
    sidePanel.position.set(sx * 0.543, 0.455, 0);
    g.add(sidePanel);
  });
  // 四角青銅禮器立體金「扉稜」（方鼎經典雕飾！）
  [[-0.55, -0.38], [0.55, -0.38], [-0.55, 0.38], [0.55, 0.38]].forEach(([fx, fz]) => {
    const flange = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.40, 0.042), goldTrim);
    flange.position.set(fx, 0.455, fz);
    g.add(flange);
  });

  // 4. 階梯收口金線爐沿 ＋ 飽滿實景香灰
  const rimLower = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.048, 0.88), goldTrim);
  rimLower.position.y = 0.665;
  const rim = new THREE.Mesh(new RoundedBoxGeometry(1.34, 0.095, 0.96, 2, 0.02), bronzeDark);
  rim.position.y = 0.715;
  const rimTopGold = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.022, 0.98), goldTrim);
  rimTopGold.position.y = 0.754;
  const ash = new THREE.Mesh(
    new THREE.PlaneGeometry(1.16, 0.78),
    new THREE.MeshStandardMaterial({ map: createIncenseAshTexture(), roughness: 0.96 })
  );
  ash.rotation.x = -Math.PI / 2;
  ash.position.y = 0.768;

  // 5. 兩側精雕 S 形騰龍雙耳（平滑弧形鑄銅耳＋鎏金龍首飾！）
  [-1, 1].forEach((side) => {
    const earCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.54, 0.34, 0),
      new THREE.Vector3(side * 0.74, 0.40, 0),
      new THREE.Vector3(side * 0.80, 0.56, 0),
      new THREE.Vector3(side * 0.75, 0.74, 0),
      new THREE.Vector3(side * 0.62, 0.72, 0)
    ]);
    const earTube = new THREE.Mesh(new THREE.TubeGeometry(earCurve, 16, 0.036, 8, false), bronzeMid);
    const dragonCrest = new THREE.Mesh(new THREE.SphereGeometry(0.056, 10, 8), goldTrim);
    dragonCrest.position.set(side * 0.76, 0.76, 0);
    const earStud = new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 8), goldTrim);
    earStud.position.set(side * 0.78, 0.46, 0);
    g.add(earTube, dragonCrest, earStud);
  });

  g.add(basePlate, baseGoldRim, waist, frontPanel, backPanel, rimLower, rim, rimTopGold, ash);
  return g;
}

function createCulturalStall(awningColor, stripeColor, isFruitShop) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x8F5A32, roughness: 0.82 });
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.95, 1.3), wood);
  counter.position.y = 0.475;
  counter.castShadow = true;
  g.add(counter);

  [[-1.05, -0.55], [1.05, -0.55], [-1.05, 0.55], [1.05, 0.55]].forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.35, 8), wood);
    post.position.set(px, 1.18, pz);
    g.add(post);
  });

  // ★ V31 廟埕文創攤位上方帆布棚改為鮮明「雙色直條紋帆布遮陽棚」＋ 立體條紋骨架！
  const mainHex = '#' + awningColor.toString(16).padStart(6, '0');
  const stripeHex = '#' + stripeColor.toString(16).padStart(6, '0');
  const awningMat = new THREE.MeshStandardMaterial({
    map: createStripedAwningTexture(mainHex, stripeHex),
    roughness: 0.72
  });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.68, 0.14, 1.78), awningMat);
  roof.position.set(0, 2.42, 0.06);
  roof.rotation.x = 0.14;
  // 條紋帆布前緣波浪壓條與立體直向支架條紋
  const trim = new THREE.Mesh(new THREE.BoxGeometry(2.70, 0.14, 0.10), awningMat);
  trim.position.set(0, 2.27, 0.91);
  for (let s = -5; s <= 5; s++) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.03, 1.76), new THREE.MeshStandardMaterial({ color: s % 2 === 0 ? awningColor : stripeColor, roughness: 0.75 }));
    seam.position.set(s * 0.24, 2.50, 0.06);
    seam.rotation.x = 0.14;
    g.add(seam);
  }
  g.add(roof, trim);

  if (isFruitShop) {
    [[-0.65, 0xEAB308], [0, 0xDC2626], [0.65, 0xEC4899]].forEach(([x, col]) => {
      const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.16, 10), new THREE.MeshStandardMaterial({ color: 0xC89D58, roughness: 0.85 }));
      basket.position.set(x, 1.03, 0.15);
      const item = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 }));
      item.position.set(x, 1.18, 0.15);
      g.add(basket, item);
    });
  } else {
    [-0.7, 0, 0.7].forEach((x) => {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), new THREE.MeshStandardMaterial({ color: 0xDC2626, emissive: 0xFF6B2A, emissiveIntensity: 0.6 }));
      l.position.set(x, 2.02, 0.78);
      g.add(l);
    });
  }
  return g;
}

function createChibiDeityStatue({ robeColor, trimColor, crownType, scale = 1 }) {
  const g = new THREE.Group();
  g.scale.setScalar(scale);
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xFCE0C2, roughness: 0.75 });
  const robeMat = new THREE.MeshStandardMaterial({ color: robeColor, roughness: 0.62 });
  const goldMat = new THREE.MeshStandardMaterial({ color: trimColor, metalness: 0.45, roughness: 0.32 });

  const throne = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.52, 0.24, 12), goldMat);
  throne.position.y = 0.12;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 0.78, 14), robeMat);
  body.position.y = 0.62;
  body.castShadow = true;
  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 8, 16), goldMat);
  sash.rotation.x = Math.PI / 2;
  sash.position.y = 0.58;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.29, 16, 16), skinMat);
  head.position.y = 1.24;
  g.add(throne, body, sash, head);

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x261612 });
  [-0.09, 0.09].forEach(ex => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), eyeMat);
    eye.position.set(ex, 1.26, 0.26);
    g.add(eye);
  });

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.032, 8, 24), new THREE.MeshBasicMaterial({ color: 0xFFE074, toneMapped: false }));
  halo.position.set(0, 1.28, -0.22);
  g.add(halo);

  if (crownType === 'king') {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.26, 8), goldMat);
    crown.position.y = 1.56;
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.05), goldMat);
    wingL.position.set(-0.34, 1.52, 0);
    const wingR = wingL.clone();
    wingR.position.x = 0.34;
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 8), new THREE.MeshStandardMaterial({ color: 0x1E1716, roughness: 0.85 }));
    beard.rotation.x = Math.PI;
    beard.position.set(0, 1.02, 0.25);
    g.add(crown, wingL, wingR, beard);
  } else if (crownType === 'lotus') {
    const veil = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), robeMat);
    veil.position.y = 1.27;
    veil.rotation.x = -0.2;
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), goldMat);
    bun.position.y = 1.62;
    g.add(veil, bun);
  } else {
    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.32), goldMat);
    crown.position.y = 1.56;
    const topGem = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshStandardMaterial({ color: 0xDC2626 }));
    topGem.position.set(0, 1.66, 0.08);
    g.add(crown, topGem);
  }
  return g;
}

/**
 * ★ 需求 #11：精緻布面織紋五營令旗（東青・南紅・西白・北黑・中黃：雕花雙層旗座＋鍍金矛頭長旗桿＋明顯織布紋路大三角旗面微風飄動！）
 */
function createFiveCampsFlags(animatedRefs = null) {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x522619, roughness: 0.62 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xF0C24A, metalness: 0.62, roughness: 0.28 });

  // 雙層紅木金邊精雕五營旗座
  const base1 = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.14, 0.38), woodMat);
  base1.position.y = 0.07;
  const base2 = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.14, 0.28), woodMat);
  base2.position.y = 0.20;
  const goldTrim = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.035, 0.40), goldMat);
  goldTrim.position.y = 0.14;
  g.add(base1, base2, goldTrim);

  const specs = [
    { bg: '#1F7A4D', border: '#F5D061', char: '東', txt: '#FFF8DC' },
    { bg: '#C62828', border: '#F5D061', char: '南', txt: '#FFF8DC' },
    { bg: '#F4F1EA', border: '#B91C1C', char: '西', txt: '#1E293B' },
    { bg: '#1B222C', border: '#F5D061', char: '北', txt: '#FCE38A' },
    { bg: '#EAB308', border: '#B91C1C', char: '中', txt: '#7F1D1D' }
  ];

  specs.forEach((sp, i) => {
    const x = -0.46 + i * 0.23;
    const tilt = (i - 2) * 0.11;

    // 銅金旗插座
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 0.09, 8), goldMat);
    socket.position.set(x, 0.30, 0);
    g.add(socket);

    const poleGroup = new THREE.Group();
    poleGroup.position.set(x, 0.26, 0);
    poleGroup.rotation.z = tilt;

    // 鍍金細木旗桿 ＋ 頂端金槍頭 ＋ 紅絲穗
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.020, 1.48, 8), goldMat);
    pole.position.y = 0.74;
    const spear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 6), goldMat);
    spear.position.y = 1.56;
    const tassel = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, 0.14, 6),
      new THREE.MeshStandardMaterial({ color: 0xDC2626, roughness: 0.65 })
    );
    tassel.position.y = 1.42;

    // 明顯織布紋理大三角布面令旗（PlaneGeometry + Canvas 織布紋理，雙面顯色且隨微風輕拂！）
    const flagTex = createFiveCampFlagTexture(sp.bg, sp.border, sp.char, sp.txt);
    const flagPivot = new THREE.Group();
    flagPivot.position.set(0.01, 1.24, 0);
    const flagCloth = new THREE.Mesh(
      new THREE.PlaneGeometry(0.64, 0.46),
      new THREE.MeshStandardMaterial({
        map: flagTex,
        transparent: true,
        alphaTest: 0.12,
        side: THREE.DoubleSide,
        roughness: 0.88
      })
    );
    flagCloth.position.set(0.32, 0, 0);
    flagPivot.add(flagCloth);
    flagPivot.userData.baseRotY = (i - 2) * 0.08;
    flagPivot.userData.phase = i * 1.1;
    if (animatedRefs && animatedRefs.fiveCampFlags) {
      animatedRefs.fiveCampFlags.push(flagPivot);
    }

    poleGroup.add(pole, spear, tassel, flagPivot);
    g.add(poleGroup);
  });
  return g;
}

/**
 * ★ 需求 #1：工匠精雕「金色雙層飛簷亭頂天公爐」（蓮瓣鼓座＋獅首三足＋雙龍環耳＋龍紋浮雕腹帶＋六柱飛簷寶頂與簷角風鈴！）
 */
function createCenser(radius = 0.6, height = 0.55, hasLegs = false, hasPavilionLid = false) {
  const g = new THREE.Group();
  const bronzeMat = new THREE.MeshStandardMaterial({ color: 0xE2AD3E, metalness: 0.64, roughness: 0.26 });
  const deepGoldMat = new THREE.MeshStandardMaterial({ color: 0xB88222, metalness: 0.58, roughness: 0.36 });
  const crimsonMat = new THREE.MeshStandardMaterial({ color: 0xB81D24, roughness: 0.48 });

  // ★ 需求 #9：中空開口爐身 ＋ 清晰飽滿的一層「細膩灰白粉質香灰」（微隆起 3D 香灰堆＋真實香灰紋理，絕不被金蓋遮住！）
  const bowlOuter = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.78, height, 24, 1, true), bronzeMat);
  bowlOuter.castShadow = true;
  const bowlInner = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.93, radius * 0.72, height * 0.95, 24, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x6E4C14, roughness: 0.65, side: THREE.BackSide })
  );
  const bowlBottom = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.78, 24), deepGoldMat);
  bowlBottom.rotation.x = Math.PI / 2;
  bowlBottom.position.y = -height / 2;

  const bellyBand = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.94, 0.055, 8, 24), deepGoldMat);
  bellyBand.rotation.x = Math.PI / 2;
  bellyBand.position.y = 0.02;
  const bellyBand2 = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.86, 0.042, 8, 24), deepGoldMat);
  bellyBand2.rotation.x = Math.PI / 2;
  bellyBand2.position.y = -height * 0.28;
  // 浮雕雲龍珠釘 12 顆環繞爐腹
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const stud = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), bronzeMat);
    stud.position.set(Math.cos(a) * radius * 0.96, 0.02, Math.sin(a) * radius * 0.96);
    g.add(stud);
  }

  const lip = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.072, 10, 24), bronzeMat);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = height / 2 + 0.02;

  // 明顯飽滿的「香灰層」（底盤＋微隆起柔粉香灰堆，俯視與平視皆清清楚楚看到一層厚實香灰！）
  const ashMat = new THREE.MeshStandardMaterial({
    map: createIncenseAshTexture(),
    color: 0xF5F1E8,
    roughness: 0.96,
    metalness: 0.0
  });
  const ashBed = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.94, radius * 0.90, 0.09, 24), ashMat);
  ashBed.position.y = height / 2 - 0.03;
  const ashMound = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.88, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), ashMat);
  ashMound.scale.set(1.0, 0.14, 1.0);
  ashMound.position.y = height / 2 + 0.008;
  g.add(bowlOuter, bowlInner, bowlBottom, bellyBand, bellyBand2, lip, ashBed, ashMound);

  // 兩側精雕「騰龍雙耳」
  [-1, 1].forEach((s) => {
    const ear = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.052, 8, 16), bronzeMat);
    ear.position.set(s * (radius + 0.10), 0.08, 0);
    const dragonCrest = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), deepGoldMat);
    dragonCrest.position.set(s * (radius + 0.14), 0.26, 0);
    const earRing = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 6, 12), deepGoldMat);
    earRing.position.set(s * (radius + 0.16), -0.10, 0);
    g.add(ear, dragonCrest, earRing);
  });

  if (hasLegs) {
    // 爐底蓮瓣托座 ＋ 三尊獅首虎爪金足
    const lotusUnder = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.72, radius * 0.45, 0.18, 12), deepGoldMat);
    lotusUnder.position.y = -height / 2 - 0.08;
    g.add(lotusUnder);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
      const lx = Math.cos(a) * radius * 0.62;
      const lz = Math.sin(a) * radius * 0.62;
      const lionKnee = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), deepGoldMat);
      lionKnee.position.set(lx, -height / 2 - 0.06, lz);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.072, 0.56, 10), bronzeMat);
      leg.position.set(lx, -height / 2 - 0.28, lz);
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.105, 8, 8), deepGoldMat);
      paw.scale.set(1.1, 0.6, 1.1);
      paw.position.set(lx, -height / 2 - 0.54, lz);
      g.add(lionKnee, leg, paw);
    }
  }

  // ★ V32 精準六角對稱「雙層金色亭頂天公爐蓋」（徹底移除外凸尖刺 eaveTip 與過長外突脊條；6 面筒瓦條紋 100% 均勻對稱＋貼合齊緣金脊＋小巧風鈴！）
  if (hasPavilionLid) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const sx = Math.sin(a);
      const cz = Math.cos(a);
      const px = sx * radius * 0.88;
      const pz = cz * radius * 0.88;
      const postBase = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.056, 0.07, 8), deepGoldMat);
      postBase.position.set(px, height / 2 + 0.04, pz);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.90, 8), bronzeMat);
      post.position.set(px, height / 2 + 0.48, pz);
      const postCap = new THREE.Mesh(new THREE.SphereGeometry(0.046, 8, 8), deepGoldMat);
      postCap.position.set(px, height / 2 + 0.91, pz);
      const bell = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.095, 6), deepGoldMat);
      bell.position.set(sx * radius * 1.10, height / 2 + 0.81, cz * radius * 1.10);
      g.add(postBase, post, postCap, bell);
    }
    const goldRoofMat = new THREE.MeshStandardMaterial({
      map: createGoldRoofRidgeTexture(),
      color: 0xF5CA5C,
      metalness: 0.60,
      roughness: 0.28
    });
    const r1 = radius * 1.18;
    const h1 = 0.50;
    const lid1 = new THREE.Mesh(new THREE.ConeGeometry(r1, h1, 6), goldRoofMat);
    lid1.position.y = height / 2 + 1.14;
    const r2 = radius * 0.74;
    const h2 = 0.42;
    const lid2 = new THREE.Mesh(new THREE.ConeGeometry(r2, h2, 6), goldRoofMat);
    lid2.position.y = height / 2 + 1.64;

    // 精準貼合六角斜脊（★ V32 修正 rotation.x 負號使 6 根金脊完全貼合屋頂六角稜線自頂點收齊至屋簷，100% 消除外凸尖刺！）
    const slant1 = Math.hypot(r1, h1) * 0.98;
    const slant2 = Math.hypot(r2, h2) * 0.96;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const sx = Math.sin(a);
      const cz = Math.cos(a);
      const ridge1 = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.022, slant1, 6), deepGoldMat);
      ridge1.position.set(sx * r1 * 0.50, height / 2 + 1.14, cz * r1 * 0.50);
      ridge1.rotation.order = 'YXZ';
      ridge1.rotation.y = a;
      ridge1.rotation.x = -Math.atan2(r1, h1);
      const ridge2 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, slant2, 6), deepGoldMat);
      ridge2.position.set(sx * r2 * 0.50, height / 2 + 1.64, cz * r2 * 0.50);
      ridge2.rotation.order = 'YXZ';
      ridge2.rotation.y = a;
      ridge2.rotation.x = -Math.atan2(r2, h2);
      g.add(ridge1, ridge2);
    }
    const lid1Rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.15, 0.036, 6, 6), deepGoldMat);
    lid1Rim.rotation.x = Math.PI / 2;
    lid1Rim.rotation.z = Math.PI / 6;
    lid1Rim.position.y = height / 2 + 0.90;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.50, radius * 0.54, 0.22, 6), crimsonMat);
    neck.position.y = height / 2 + 1.40;
    const lid2Rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.72, 0.028, 6, 6), deepGoldMat);
    lid2Rim.rotation.x = Math.PI / 2;
    lid2Rim.rotation.z = Math.PI / 6;
    lid2Rim.position.y = height / 2 + 1.45;
    const gourd1 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), bronzeMat);
    gourd1.position.y = height / 2 + 1.90;
    const gourd2 = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), bronzeMat);
    gourd2.position.y = height / 2 + 2.06;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.15, 6), bronzeMat);
    tip.position.y = height / 2 + 2.19;
    g.add(lid1, lid1Rim, neck, lid2, lid2Rim, gourd1, gourd2, tip);
  }
  return g;
}

/**
 * ★ 需求 #12：精緻絲綢宮廷大紅燈籠（絲綢金紋「德慈宮・平安順」＋六稜金線骨架＋雕花金蓋＋三股紅金絲穗！）
 */
function createRedLantern(silkTex = null) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    map: silkTex || undefined,
    color: 0xEA3A30,
    emissive: 0xFF6B2A,
    emissiveIntensity: 0.55,
    roughness: 0.50
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.40, 16, 14), bodyMat);
  body.scale.set(1.0, 1.18, 1.0);

  const goldMat = new THREE.MeshStandardMaterial({ color: 0xF0C24A, metalness: 0.58, roughness: 0.28 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x5A2416, roughness: 0.65 });
  const redSilk = new THREE.MeshStandardMaterial({ color: 0xD62828, roughness: 0.58 });

  // 懸掛金環與提樑
  const hangRing = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 6, 12), goldMat);
  hangRing.position.y = 0.62;
  const topCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.12, 8), darkWood);
  topCrown.position.y = 0.48;
  const topGoldRim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.028, 6, 8), goldMat);
  topGoldRim.rotation.x = Math.PI / 2;
  topGoldRim.position.y = 0.44;

  const botCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.20, 0.12, 8), darkWood);
  botCrown.position.y = -0.48;
  const botGoldRim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.028, 6, 8), goldMat);
  botGoldRim.rotation.x = Math.PI / 2;
  botGoldRim.position.y = -0.44;

  // 6 條立體金絲燈骨
  for (let i = 0; i < 6; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.405, 0.012, 5, 18), goldMat);
    rib.scale.set(1.0, 1.18, 1.0);
    rib.rotation.y = (i / 6) * Math.PI;
    group.add(rib);
  }

  // 下方中國結珠 ＋ 三股垂墜紅金流蘇
  const knot = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), redSilk);
  knot.position.y = -0.60;
  const goldBead = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), goldMat);
  goldBead.position.y = -0.70;
  [[-0.04, 0], [0, 0.03], [0.04, 0]].forEach(([tx, tz], idx) => {
    const strand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.034, idx === 1 ? 0.36 : 0.30, 6),
      idx === 1 ? goldMat : redSilk
    );
    strand.position.set(tx, -0.88, tz);
    group.add(strand);
  });

  group.add(hangRing, body, topCrown, topGoldRim, botCrown, botGoldRim, knot, goldBead);
  return { group, bodyMat };
}

function createWoodenBench() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x9E683B, roughness: 0.84 });
  // 座板高度調整為 0.37（上緣 0.42m），讓信徒坐下時雙腿平放於椅緣前方不穿模！
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.10, 0.54), wood);
  seat.position.y = 0.37;
  seat.castShadow = true;
  seat.receiveShadow = true;
  g.add(seat);
  [-0.85, 0.85].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.35, 0.42), wood);
    leg.position.set(lx, 0.175, 0);
    g.add(leg);
  });
  return g;
}

function createStylizedTree(kind = 'green') {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.46, 2.4, 9), new THREE.MeshStandardMaterial({ color: 0x6B482C, roughness: 0.92 }));
  trunk.position.y = 1.2;
  trunk.castShadow = true;
  g.add(trunk);
  const palettes = {
    banyan: [0x4B7F4A, 0x5D9657, 0x3D6C40, 0x73AD67],
    luan: [0x588A4C, 0xD9A23B, 0xC86B3C, 0x76A45B],
    green: [0x4D8054, 0x669B66, 0x3C6B47, 0x7CB075]
  };
  const cols = palettes[kind] || palettes.green;
  const blobs = kind === 'banyan'
    ? [[0, 3.1, 0, 1.55], [-1.15, 2.65, 0.45, 1.1], [1.15, 2.75, 0.35, 1.15], [0.15, 2.85, -0.9, 1.05]]
    : [[0, 3.0, 0, 1.35], [-0.85, 2.55, 0.35, 0.95], [0.85, 2.65, -0.25, 1.0], [0.1, 3.65, 0.1, 0.85]];
  blobs.forEach(([x, y, z, r], i) => {
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), new THREE.MeshStandardMaterial({ color: cols[i % cols.length], roughness: 0.9 }));
    crown.position.set(x, y, z);
    crown.castShadow = true;
    g.add(crown);
  });
  return g;
}
