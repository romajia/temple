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
import { TEMPLE_CONFIG, KNEEL_MATS_36, SIDE_BENCHES } from '../config/templeConfig.js';
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
  createIncenseAshTexture
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
      cloned.transparent = true;
      cloned.opacity = baseOp;
      matMap.set(mat, cloned);
      return cloned;
    };

    const processMesh = (m) => {
      if (!m.isMesh || !m.material) return;
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

  const animatedRefs = {
    lanterns: [],
    lanternMaterials: [],
    waterfallStreams: [],
    koiFishes: [],
    fiveCampFlags: [],
    furnaceFlames: [],
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
    offeringTableTop: new THREE.Vector3(0, 1.40, -6.2),
    shrineCenter: new THREE.Vector3(0, 3.1, -10.4),
    tiangongSmokePos: new THREE.Vector3(0, 1.72, 15.0),
    mainCenserSmokePos: new THREE.Vector3(0, 2.76, -8.92),
    furnaceOrigin: new THREE.Vector3(16.2, 0.9, 4.4),
    furnaceOpeningPos: new THREE.Vector3(15.30, 1.16, 5.30)
  };

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
  root.add(organicLawn);
  walkableMeshes.push(organicLawn);

  const soilSlab = new THREE.Mesh(
    new THREE.BoxGeometry(dioramaWidth, 1.15, dioramaDepth),
    new THREE.MeshStandardMaterial({ color: 0x7E5B42, roughness: 0.92 })
  );
  soilSlab.position.set(0, -0.60, dioramaCenterZ);
  root.add(soilSlab);

  const stoneBaseSlab = new THREE.Mesh(
    new THREE.BoxGeometry(dioramaWidth + 0.8, 0.98, dioramaDepth + 0.8),
    new THREE.MeshStandardMaterial({ color: 0x3D4C4E, roughness: 0.9 })
  );
  stoneBaseSlab.position.set(0, -1.65, dioramaCenterZ);
  root.add(stoneBaseSlab);

  const plazaTex = createPlazaTileTexture();
  plazaTex.repeat.set(10, 8);
  const plazaMat = new THREE.MeshStandardMaterial({ map: plazaTex, roughness: 0.86 });

  const frontPlaza = new THREE.Mesh(new THREE.BoxGeometry(36, 0.14, 18.2), plazaMat);
  frontPlaza.position.set(-0.8, -0.02, 16.8);
  frontPlaza.receiveShadow = true;
  frontPlaza.userData.walkable = true;
  root.add(frontPlaza);
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
    root.add(curb);
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
    root.add(bush);
  });

  const pathMat = new THREE.MeshStandardMaterial({ color: 0xDDD0BE, roughness: 0.88 });
  [
    [-15.6, -3.5, 4.8, 30],
    [15.6, -3.5, 4.8, 30],
    [0, -16.8, 36.0, 4.8]
  ].forEach(([px, pz, pw, pd]) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.10, pd), pathMat);
    p.position.set(px, -0.01, pz);
    p.receiveShadow = true;
    p.userData.walkable = true;
    root.add(p);
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
    root.add(t);
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
    root.add(c);
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

  // 左右兩側紅磚牆（含青斗石結構方柱、真正透明透光白框古窗、前段立體精雕圓形花窗與頂部水車堵彩繪）
  [-1, 1].forEach((side) => {
    const sideX = side * 10.0;
    const sideGroup = new THREE.Group();

    // 前進（三川拜亭側牆 z = 1.6..8.4，高 5.8m）
    const frontSideWall = new THREE.Mesh(new THREE.BoxGeometry(0.46, 5.8, 6.8), matRedBrick);
    frontSideWall.position.set(sideX, 3.26, 5.0);
    frontSideWall.castShadow = true;
    frontSideWall.receiveShadow = true;
    sideGroup.add(frontSideWall);

    // 前進側牆中央「立體工匠精雕青斗石圓形花窗」（★ 需求 #2：位置微幅抬高至 3.88m 更顯大氣！）
    const sideMedallion = create3DOpenworkWindowGrille(1.12, matStonePillar, matGold, true);
    sideMedallion.position.set(sideX + side * 0.25, 3.88, 5.0);
    sideMedallion.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    sideGroup.add(sideMedallion);

    // 前進側牆頂部藍紅彩繪水車堵
    const frontSideFrieze = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.58, 7.0), matFrieze);
    frontSideFrieze.position.set(sideX, 6.08, 5.0);
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

    // 側牆外立面 5 根青斗花崗岩結構方柱（含精雕柱礎與柱頭）
    [8.3, 1.6, -2.6, -7.4, -12.3].forEach((pz, idx) => {
      const colH = idx === 0 ? 6.4 : 7.6;
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

  // ---- B. 三川門正面立面（中央朱紅大圓柱 ＋ 真正 3D 鏤空洞口之淺灰水泥牆與精雕立體石花窗）----
  const frontFacadeGroup = new THREE.Group();

  // 中央兩根亮眼朱紅圓柱（完全對應設計圖大門兩側紅柱！）
  [-3.8, 3.8].forEach((px) => {
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.52, 0.48, 12), matStonePillar);
    plinth.position.set(px, 0.60, 8.45);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.33, 6.2, 16), matRedPillar);
    col.position.set(px, 3.88, 8.45);
    col.castShadow = true;
    const collarGold = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 8, 18), matGold);
    collarGold.rotation.x = Math.PI / 2;
    collarGold.position.set(px, 6.84, 8.45);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.33, 0.32, 16), matGold);
    cap.position.set(px, 7.05, 8.45);
    frontFacadeGroup.add(plinth, col, collarGold, cap);
  });

  // ★ 需求 #13：真正 3D ExtrudeGeometry 圓孔水泥牆 ＋ 立體石雕鏤空花窗（實心 3D 雕刻窗欞，真正透空且 100% 零破圖！）
  const wallHoleShape = new THREE.Shape();
  wallHoleShape.moveTo(-2.75, -2.90);
  wallHoleShape.lineTo(2.75, -2.90);
  wallHoleShape.lineTo(2.75, 2.90);
  wallHoleShape.lineTo(-2.75, 2.90);
  wallHoleShape.closePath();
  const roundHole = new THREE.Path();
  roundHole.absarc(0, 0.82, 1.18, 0, Math.PI * 2, true); // ★ 需求 #2：正面圓窗同步抬高至 4.08m 與兩側高窗呼應！
  wallHoleShape.holes.push(roundHole);

  const cementWallGeo = new THREE.ExtrudeGeometry(wallHoleShape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
    curveSegments: 28
  });

  [-6.8, 6.8].forEach((bx) => {
    const wallMesh = new THREE.Mesh(cementWallGeo, matCementLight);
    wallMesh.position.set(bx, 3.26, 8.16);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;

    // 精雕石材上楣與腰腳線
    const topCap = new THREE.Mesh(new THREE.BoxGeometry(5.54, 0.18, 0.44), matStonePillar);
    topCap.position.set(bx, 6.14, 8.33);
    const botCap = new THREE.Mesh(new THREE.BoxGeometry(5.54, 0.42, 0.44), matStonePillar);
    botCap.position.set(bx, 0.56, 8.33);
    // 下堵立體石雕線腳框
    const dadoPanel = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.48, 0.42), matStone);
    dadoPanel.position.set(bx, 1.62, 8.33);

    // 嵌入真實 3D 圓形鏤空石雕花窗（抬高至 y = 4.08，從內外看都完全透空零破圖！）
    const flowerWindow = create3DOpenworkWindowGrille(1.18, matStonePillar, matGold, false);
    flowerWindow.position.set(bx, 4.08, 8.33);

    frontFacadeGroup.add(wallMesh, topCap, botCap, dadoPanel, flowerWindow);
  });

  // 前簷水車堵藍紅彩繪橫樑 ＋ ★ 需求 #4：精雕傳統「木作金飾斗拱群」與中門低花崗岩門檻
  const frontBeam = new THREE.Mesh(new THREE.BoxGeometry(20.6, 0.68, 0.72), matFrieze);
  frontBeam.position.set(0, 6.72, 8.42);
  frontBeam.castShadow = true;
  const frontBeamGold = new THREE.Mesh(new THREE.BoxGeometry(20.68, 0.14, 0.76), matGold);
  frontBeamGold.position.set(0, 6.36, 8.42);
  frontFacadeGroup.add(frontBeam, frontBeamGold);
  // 樑下精雕 11 組斗拱（Dou-Gong）
  for (let i = -5; i <= 5; i++) {
    const dgX = i * 1.85;
    const dou = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.46), matDeepRed);
    dou.position.set(dgX, 6.22, 8.58);
    const gong = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.34), matGold);
    gong.position.set(dgX, 6.32, 8.64);
    frontFacadeGroup.add(dou, gong);
  }
  // 三川門中央低石門檻（不擋行走，增添古廟進殿儀式感！）
  const doorThreshold = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.08, 0.32), matStonePillar);
  doorThreshold.position.set(0, 0.40, 8.45);
  frontFacadeGroup.add(doorThreshold);

  // 殿內結構大柱
  [[-9.3, -11.9], [-4.8, -11.9], [4.8, -11.9], [9.3, -11.9]].forEach(([px, pz]) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.31, 7.6, 14), matRedPillar);
    col.position.set(px, 4.16, pz);
    frontFacadeGroup.add(col);
  });

  // 正門上方實景手工刺繡八仙彩（1536×420 精緻比例，含深藍百花邊、橘紅金雲、八仙騎瑞獸、海水江崖與正紅流蘇）
  const baXianTex = createBaXianCaiTexture();
  const baXianBanner = new THREE.Mesh(
    new THREE.PlaneGeometry(7.6, 2.08),
    new THREE.MeshStandardMaterial({ map: baXianTex, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide, roughness: 0.62 })
  );
  baXianBanner.position.set(0, 5.42, 8.84);
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
  root.add(frontFacadeGroup);

  // =========================================================================
  // 3. 新廟「前後兩進」豔紅琉璃瓦 × 寶藍剪黏燕尾大屋頂 ＋ 屋頂「福祿壽三仙」
  //    ★ 需求 #3：屋頂左右三角山牆精準對齊側牆 x = ±10.0、厚度 0.46m 並向下無縫銜接水車堵，絕無懸空破圖！
  // =========================================================================
  // --- 第一進：三川拜亭紅瓦藍脊屋頂 (z = 5.0，完全對齊前段紅磚側牆 z = 1.6..8.4！) ---
  const frontRoofGroup = buildMinnanSwallowtailRoof({
    width: 22.8,
    depth: 7.4,
    baseY: 6.86,
    peakHeight: 2.45,
    gableWallX: 10.0,
    gableDepth: 6.8,
    gableDropY: -0.68,
    matCrimsonRoof,
    matBlueRidge,
    matCobaltTip,
    matGold,
    matGableBrick: matRedBrick,
    withSanXian: false,
    withTassels: true
  });
  frontRoofGroup.position.set(0, 0, 5.0);
  markOccludable(frontRoofGroup, 'roof-front');
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
  root.add(mainHallRoofGroup);

  // ★ 需求 #12：六盞精細宮廷絲綢大紅燈籠，往八仙彩兩側對稱移動（絕不遮擋八仙彩！）
  const lanternSilkTex = createLanternSilkTexture();
  [[-8.4, 5.82, 8.85], [-6.4, 5.82, 8.85], [-4.45, 5.82, 8.85], [4.45, 5.82, 8.85], [6.4, 5.82, 8.85], [8.4, 5.82, 8.85]].forEach(([lx, ly, lz]) => {
    const { group: lantern, bodyMat } = createRedLantern(lanternSilkTex);
    lantern.position.set(lx, ly, lz);
    root.add(lantern);
    animatedRefs.lanterns.push(lantern);
    animatedRefs.lanternMaterials.push(bodyMat);
  });

  // ---- 左右門前「守門石獅子」一對（完全對齊新廟設計圖石階兩側！）----
  [-10.1, 10.1].forEach((lx) => {
    const lion = createStoneLionGuardian(lx < 0 ? 1 : -1);
    lion.position.set(lx, 0.03, 10.1);
    markOccludable(lion);
    root.add(lion);
  });

  // =========================================================================
  // 4. 正殿宏偉挑高神龕（★ 加大精雕紅木神明桌 ＋ 工筆山水觀音背壁 ＋ 上寬下窄五邊形錦旗 ＋ 三尊精緻金身！）
  // =========================================================================
  const shrineGroup = new THREE.Group();
  shrineGroup.position.set(0, 0.36, -10.4);
  root.add(shrineGroup);

  const matEbony = new THREE.MeshStandardMaterial({ color: 0x2A1F1B, roughness: 0.68 });
  // ★ 需求 #6：加大加寬神明案桌（10.6 × 1.55 × 3.6，涵蓋 z = -1.35..+2.25），讓香爐 100% 穩固安放於桌面上絕不懸空！
  const shrineBase = new THREE.Mesh(new THREE.BoxGeometry(10.6, 1.55, 3.6), matWoodDark);
  shrineBase.position.set(0, 0.775, 0.45);
  shrineBase.castShadow = true;
  shrineBase.receiveShadow = true;
  shrineGroup.add(shrineBase);

  // 工匠精雕紅木神桌桌面線腳、金邊桌緣與四角雕花護腳
  const shrineTopRim = new THREE.Mesh(new THREE.BoxGeometry(10.82, 0.14, 3.76), matWoodDark);
  shrineTopRim.position.set(0, 1.52, 0.45);
  const shrineGoldTrim = new THREE.Mesh(new THREE.BoxGeometry(10.86, 0.06, 3.80), matGold);
  shrineGoldTrim.position.set(0, 1.44, 0.45);
  [[-5.22, 2.20], [5.22, 2.20], [-5.22, -1.28], [5.22, -1.28]].forEach(([cx, cz]) => {
    const cornerLeg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.52, 0.26), matEbony);
    cornerLeg.position.set(cx, 0.76, cz);
    const goldFoot = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.18, 0.30), matGold);
    goldFoot.position.set(cx, 0.10, cz);
    shrineGroup.add(cornerLeg, goldFoot);
  });
  shrineGroup.add(shrineTopRim, shrineGoldTrim);

  const altarCloth = new THREE.Mesh(
    new THREE.BoxGeometry(9.4, 1.22, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xC4312C, roughness: 0.68 })
  );
  altarCloth.position.set(0, 0.74, 2.26);
  shrineGroup.add(altarCloth);

  const clothBorder = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.16, 0.14), matGold);
  clothBorder.position.set(0, 1.42, 2.26);
  shrineGroup.add(clothBorder);

  // 黑檀雕花神龕外框 ＋ 實景「工筆山水彩繪・金箔背光觀音佛祖聯畫」
  const shrineBackdrop = new THREE.Mesh(new THREE.BoxGeometry(9.0, 5.2, 0.30), matEbony);
  shrineBackdrop.position.set(0, 4.10, -1.16);
  shrineGroup.add(shrineBackdrop);

  const guanyinMural = new THREE.Mesh(
    new THREE.PlaneGeometry(7.8, 4.7),
    new THREE.MeshStandardMaterial({ map: createSanctuaryGuanyinMuralTexture(), roughness: 0.50 })
  );
  guanyinMural.position.set(0, 4.12, -0.99);
  shrineGroup.add(guanyinMural);

  // ★ 需求 #5：上寬下窄五邊形精美「玉勅・代天巡狩・西港慶安宮」黃緞面錦旗，比例精緻收斂並精準插立於中尊神像與太師椅背之間！
  const bannerGroup = new THREE.Group();
  bannerGroup.position.set(0, 3.52, -0.24);
  const bannerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 2.45, 8), matGold);
  bannerPole.position.set(0, 0.04, -0.03);
  const bannerFinial = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.22, 8), matGold);
  bannerFinial.position.set(0, 1.32, -0.03);
  const bannerFace = new THREE.Mesh(
    new THREE.PlaneGeometry(1.12, 2.16),
    new THREE.MeshStandardMaterial({
      map: createImperialBannerTexture(),
      transparent: true,
      alphaTest: 0.08,
      roughness: 0.38,
      metalness: 0.14,
      side: THREE.DoubleSide
    })
  );
  bannerGroup.add(bannerPole, bannerFinial, bannerFace);
  shrineGroup.add(bannerGroup);

  const topSign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 1.05),
    new THREE.MeshStandardMaterial({ map: createHorizontalSignTexture(TEMPLE_CONFIG.couplets.top), roughness: 0.45 })
  );
  topSign.position.set(0, 6.28, -0.92);
  shrineGroup.add(topSign);

  const coupletRight = new THREE.Mesh(
    new THREE.PlaneGeometry(0.88, 4.72),
    new THREE.MeshStandardMaterial({ map: createCoupletTexture(TEMPLE_CONFIG.couplets.right), roughness: 0.48 })
  );
  coupletRight.position.set(4.85, 3.92, -0.80);
  const coupletLeft = new THREE.Mesh(
    new THREE.PlaneGeometry(0.88, 4.72),
    new THREE.MeshStandardMaterial({ map: createCoupletTexture(TEMPLE_CONFIG.couplets.left), roughness: 0.48 })
  );
  coupletLeft.position.set(-4.85, 3.92, -0.80);
  shrineGroup.add(coupletRight, coupletLeft);

  // 三尊依實景照精雕之神聖金身（左：珠簾鳳冠珍珠串聖母 / 中：金冠戰甲王爺公 / 右：黑髯大念珠王爺公）
  const leftDeity = createAuthenticPhotoDeity('leftMother');
  leftDeity.position.set(-2.35, 1.56, -0.18);
  const centerDeity = createAuthenticPhotoDeity('centerKing');
  centerDeity.position.set(0, 1.56, 0.14);
  const rightDeity = createAuthenticPhotoDeity('rightBeardKing');
  rightDeity.position.set(2.35, 1.56, -0.18);
  shrineGroup.add(leftDeity, centerDeity, rightDeity);

  // 實景左下角「金黃錦布包覆・紅綾聖印香盒」於雕花木座上
  const sealStand = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.24, 0.72), matWoodDark);
  sealStand.position.set(-2.85, 1.68, 0.92);
  const goldCloth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.48, 0.42, 12),
    new THREE.MeshStandardMaterial({ color: 0xCFA03A, roughness: 0.48, metalness: 0.25 })
  );
  goldCloth.position.set(-2.85, 1.98, 0.92);
  const redRibbonBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.22, 0.34),
    new THREE.MeshStandardMaterial({ color: 0xC8232C, roughness: 0.55 })
  );
  redRibbonBox.position.set(-2.85, 2.24, 0.92);
  shrineGroup.add(sealStand, goldCloth, redRibbonBox);

  [-4.15, 4.15].forEach((lx) => {
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.56, 10), matGold);
    lampBase.position.set(lx, 1.84, 0.32);
    const lampBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.20, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xFF3B30, toneMapped: false })
    );
    lampBulb.position.set(lx, 2.24, 0.32);
    shrineGroup.add(lampBase, lampBulb);
  });

  const shrineLight = new THREE.PointLight(0xFFD27D, 2.4, 22, 1.25);
  shrineLight.position.set(0, 5.4, 1.9);
  shrineGroup.add(shrineLight);
  animatedRefs.shrineLight = shrineLight;

  // ★ 需求 #11：精緻布面紋理五營旗安奉於神明案桌左側（-X）
  const fiveCampStand = createFiveCampsFlags(animatedRefs);
  fiveCampStand.position.set(-4.15, 1.58, 1.25);
  shrineGroup.add(fiveCampStand);

  // ★ 需求 #6：實景還原古樸四足灰黑錫鐵方鼎香爐（100% 穩坐於加大神明桌面 z = 1.48，絕無懸空！）
  const mainCenser = createAntiqueSquareCenser();
  mainCenser.position.set(0, 1.58, 1.48);
  shrineGroup.add(mainCenser);
  animatedRefs.mainIncenseGroup.position.set(0, 2.28, 1.48);
  shrineGroup.add(animatedRefs.mainIncenseGroup);

  // 神明桌與神龕擋住主角時自動半透明化
  markOccludable(shrineGroup, 'shrine-table');

  // =========================================================================
  // 5. 正殿大供桌（★ 需求 #3 自動透明化） & 36 個左右對稱繡花拜墊
  // =========================================================================
  const offeringTableGroup = new THREE.Group();
  offeringTableGroup.position.set(0, 0.36, -6.2);

  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.15, 1.55), matWoodDark);
  tableTop.position.set(0, 0.97, 0);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  offeringTableGroup.add(tableTop);

  [[-2.40, -0.60], [2.40, -0.60], [-2.40, 0.60], [2.40, 0.60]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.95, 0.18), matWoodDark);
    leg.position.set(lx, 0.475, lz);
    leg.castShadow = true;
    offeringTableGroup.add(leg);
  });
  const tableApron = new THREE.Mesh(new THREE.BoxGeometry(4.95, 0.25, 1.32), matDeepRed);
  tableApron.position.set(0, 0.80, 0);
  offeringTableGroup.add(tableApron);

  tagInteractive(offeringTableGroup, 'offeringTable');
  markOccludable(offeringTableGroup, 'offering-table');
  root.add(offeringTableGroup);
  interactiveObjects.push(offeringTableGroup);

  // 36 個獨立繡花拜墊
  const kneelMatsGroup = new THREE.Group();
  const matGeo = new THREE.BoxGeometry(0.96, 0.13, 0.76);
  const rimGeo = new THREE.BoxGeometry(1.04, 0.055, 0.84);
  const cushionMat = new THREE.MeshStandardMaterial({ color: 0xC4312C, roughness: 0.82 });
  const fishGeo = new THREE.SphereGeometry(0.10, 8, 8);
  const fishMat = new THREE.MeshStandardMaterial({ color: 0xA85E32, roughness: 0.7 });

  KNEEL_MATS_36.forEach((m) => {
    const single = new THREE.Group();
    single.position.set(m.x, 0.365, m.z);
    const cushion = new THREE.Mesh(matGeo, cushionMat);
    cushion.position.y = 0.065;
    cushion.castShadow = true;
    cushion.receiveShadow = true;
    const rim = new THREE.Mesh(rimGeo, matGold);
    rim.position.y = 0.028;
    single.add(cushion, rim);

    if (m.z === -3.2 && Math.abs(m.x) === 2.4) {
      const fish = new THREE.Mesh(fishGeo, fishMat);
      fish.scale.set(1.2, 0.85, 1.0);
      fish.position.set(m.x < 0 ? 0.62 : -0.62, 0.10, -0.12);
      single.add(fish);
    }
    kneelMatsGroup.add(single);
  });

  tagInteractive(kneelMatsGroup, 'kneelMat');
  root.add(kneelMatsGroup);
  interactiveObjects.push(kneelMatsGroup);

  // =========================================================================
  // 6. 廟內左側香燭區、右側求籤案、右側巨幅紅紙太歲牆（★ 需求 #3 安太歲板子自動透明！）
  // =========================================================================
  const incenseArea = new THREE.Group();
  incenseArea.position.set(-8.2, 0.36, 1.2);
  const iTable = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.90, 3.0), matWoodWarm);
  iTable.position.y = 0.45;
  iTable.castShadow = true;
  incenseArea.add(iTable);
  const iBucket = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.19, 0.48, 12), matDeepRed);
  iBucket.position.set(0, 1.12, -0.85);
  const sticksCluster = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.38, 10), new THREE.MeshStandardMaterial({ color: 0xC79B5B, roughness: 0.85 }));
  sticksCluster.position.set(0, 1.44, -0.85);
  incenseArea.add(iBucket, sticksCluster);
  [0.15, 0.85].forEach((zOff) => {
    const stack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.36, 0.44), new THREE.MeshStandardMaterial({ color: 0xF2CE62, roughness: 0.82 }));
    stack.position.set(0, 1.08, zOff);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.37, 0.45), matRedPillar);
    band.position.set(0, 1.08, zOff);
    incenseArea.add(stack, band);
  });
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.34, 10), matRedPillar);
  candle.position.set(0.36, 1.07, -0.3);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.15, 6), new THREE.MeshBasicMaterial({ color: 0xFFAE22, toneMapped: false }));
  flame.position.set(0.36, 1.31, -0.3);
  const flameHalo = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshBasicMaterial({ color: 0xFFCC55, transparent: true, opacity: 0.35, toneMapped: false }));
  flameHalo.position.set(0.36, 1.31, -0.3);
  incenseArea.add(candle, flame, flameHalo);
  tagInteractive(incenseArea, 'incense');
  markOccludable(incenseArea, 'incense-table');
  root.add(incenseArea);
  interactiveObjects.push(incenseArea);

  // ★ 需求 #4：求籤擲筊案移入正殿深處「神明右側」（6.6, -8.8）！
  const fortuneDesk = new THREE.Group();
  fortuneDesk.position.set(6.6, 0.36, -8.8);
  const fTable = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.88, 1.22), matWoodDark);
  fTable.position.y = 0.44;
  fTable.castShadow = true;
  fortuneDesk.add(fTable);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.19, 0.58, 12), new THREE.MeshStandardMaterial({ color: 0xC89D58, roughness: 0.78 }));
  tube.position.set(-0.22, 1.16, 0);
  fortuneDesk.add(tube);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.34, 0.015), new THREE.MeshStandardMaterial({ color: 0xEED39B, roughness: 0.85 }));
    stick.position.set(-0.22 + Math.cos(a) * 0.09, 1.50, Math.sin(a) * 0.09);
    stick.rotation.z = Math.cos(a) * 0.14;
    fortuneDesk.add(stick);
  }
  [-0.1, 0.16].forEach((zOff, idx) => {
    const bei = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.045, 8, 12, Math.PI), new THREE.MeshStandardMaterial({ color: 0xC8322E, roughness: 0.55 }));
    bei.rotation.x = Math.PI / 2;
    bei.rotation.z = idx === 0 ? 0.4 : -2.4;
    bei.position.set(0.25, 0.92, zOff);
    fortuneDesk.add(bei);
  });
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
  root.add(tiangongGroup);
  interactiveObjects.push(tiangongGroup);

  const benchArea = new THREE.Group();
  benchArea.position.set(-11.0, 0.03, 13.8);
  const bench1 = createWoodenBench();
  const bench2 = createWoodenBench();
  bench2.position.set(-1.95, 0, 1.45);
  bench2.rotation.y = Math.PI / 2;
  const teaTable = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.56, 10), matStone);
  teaTable.position.set(-0.4, 0.28, 1.3);
  const teapot = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), new THREE.MeshStandardMaterial({ color: 0x8D442C, roughness: 0.65 }));
  teapot.position.set(-0.4, 0.68, 1.3);
  // ★ 大榕樹單獨標記為可透明樹，擋住主角時樹冠自動淡化！
  const banyan = createStylizedTree('banyan');
  banyan.position.set(-2.8, 0, -1.4);
  banyan.scale.setScalar(1.18);
  markOccludable(banyan, 'banyan-tree');
  benchArea.add(bench1, bench2, teaTable, teapot, banyan);
  tagInteractive(benchArea, 'bench');
  root.add(benchArea);
  interactiveObjects.push(benchArea);

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
  const boardRoof = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.18, 0.88), matCrimsonRoof);
  boardRoof.position.set(0, 2.98, 0.05);
  boardRoof.rotation.x = 0.22;
  bulletinGroup.add(boardBox, boardFace, boardRoof);
  tagInteractive(bulletinGroup, 'bulletin');
  markOccludable(bulletinGroup, 'bulletin-board');
  root.add(bulletinGroup);
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
  root.add(furnaceGroup);
  interactiveObjects.push(furnaceGroup);

  const shopStall = createCulturalStall(0xD97706, 0xFFF3D6, true);
  shopStall.position.set(-12.2, 0.03, 20.0);
  shopStall.rotation.y = Math.PI / 2;
  tagInteractive(shopStall, 'offeringShop');
  markOccludable(shopStall, 'shop-stall');
  root.add(shopStall);
  interactiveObjects.push(shopStall);

  const quizStall = createCulturalStall(0x0D9488, 0xFFF3D6, false);
  quizStall.position.set(12.2, 0.03, 20.0);
  quizStall.rotation.y = -Math.PI / 2;
  tagInteractive(quizStall, 'quizBooth');
  markOccludable(quizStall, 'quiz-stall');
  root.add(quizStall);
  interactiveObjects.push(quizStall);

  // =========================================================================
  // 8. 新廟特色景觀：右側「假山瀑布錦鯉池」＋ 廟旁樹下多組長板凳聊天區
  // =========================================================================
  const waterfallScenic = buildRockeryWaterfallPond(animatedRefs, markOccludable);
  waterfallScenic.position.set(20.8, 0.03, 15.2);
  tagInteractive(waterfallScenic, 'fishPond');
  root.add(waterfallScenic);
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
    root.add(benchMesh);
    interactiveObjects.push(benchMesh);
  });

  // 後院兩張長板凳中間擺一座小圓石茶桌與茶壺，超有台灣廟埕人情味！
  const rearTeaTable = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.44, 0.62, 12), matStone);
  rearTeaTable.position.set(0, 0.34, -19.5);
  rearTeaTable.castShadow = true;
  const rearTeapot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), new THREE.MeshStandardMaterial({ color: 0x8D442C, roughness: 0.62 }));
  rearTeapot.position.set(0, 0.78, -19.5);
  root.add(rearTeaTable, rearTeapot);

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
    fishPond: 2.35
  };

  Object.values(TEMPLE_CONFIG.zones).forEach((z) => {
    const [zx, , zz] = z.position;
    const isInside = ['incense', 'offeringTable', 'mainWorship', 'fortune', 'taisui'].includes(z.id);
    const groundY = isInside ? 0.39 : 0.06;

    const ringOuter = Math.min(1.12, (z.triggerRadius || 1.5) * 0.65);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(ringOuter - 0.16, ringOuter, 32),
      new THREE.MeshBasicMaterial({ color: z.color, transparent: true, opacity: 0.54, side: THREE.DoubleSide, toneMapped: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(z.standPos[0], groundY, z.standPos[2]);
    ring.userData.baseColor = new THREE.Color(z.color);
    tagInteractive(ring, z.id);
    root.add(ring);
    interactiveObjects.push(ring);
    animatedRefs.zoneRings.set(z.id, ring);

    const badge = createZoneBadgeSprite(z.shortLabel, z.color);
    badge.position.set(zx, badgeHeights[z.id] || 2.6, zz);
    badge.userData.baseY = badge.position.y;
    tagInteractive(badge, z.id);
    root.add(badge);
    interactiveObjects.push(badge);
    animatedRefs.zoneBadges.set(z.id, badge);
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
  const stoneMain = new THREE.MeshStandardMaterial({ color: 0xD8DCE0, roughness: 0.72, metalness: 0.04 });
  const stoneCarved = new THREE.MeshStandardMaterial({ color: 0xA8B3BC, roughness: 0.78 });
  const stoneDeep = new THREE.MeshStandardMaterial({ color: 0x7A8792, roughness: 0.85 });
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
  const cap1 = new THREE.Mesh(new THREE.BoxGeometry(1.50, 0.14, 1.68), stoneCarved);
  cap1.position.y = 1.19;
  const cap2 = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.10, 1.54), stoneMain);
  cap2.position.y = 1.31;
  g.add(plinth1, plinth2, bodyPed, panelFront, panelSide, cap1, cap2);

  // 2. 威武又討喜的精緻石獅本體
  const lion = new THREE.Group();
  lion.position.y = 1.36;

  // 挺胸軀幹與蹲坐後臀
  const haunch = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), stoneMain);
  haunch.scale.set(1.02, 0.92, 1.12);
  haunch.position.set(0, 0.36, -0.24);
  haunch.castShadow = true;

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.44, 14, 12), stoneMain);
  chest.scale.set(1.05, 1.15, 0.98);
  chest.position.set(0, 0.62, 0.10);
  chest.castShadow = true;

  // 雄壯前肢＋爪墊
  [-0.26, 0.26].forEach((px) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.64, 10), stoneMain);
    leg.position.set(px, 0.34, 0.32);
    leg.castShadow = true;
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), stoneCarved);
    paw.scale.set(1.0, 0.62, 1.28);
    paw.position.set(px, 0.08, 0.38);
    lion.add(leg, paw);
  });

  // 蹲坐後腿
  [-0.32, 0.32].forEach((px) => {
    const thigh = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), stoneMain);
    thigh.scale.set(0.85, 1.05, 1.25);
    thigh.position.set(px, 0.24, -0.22);
    const backPaw = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), stoneCarved);
    backPaw.scale.set(1, 0.6, 1.3);
    backPaw.position.set(px, 0.08, -0.02);
    lion.add(thigh, backPaw);
  });

  // 上翹捲曲蓬鬆獅尾
  for (let i = 0; i < 4; i++) {
    const curl = new THREE.Mesh(new THREE.SphereGeometry(0.14 - i * 0.015, 8, 8), stoneCarved);
    curl.position.set(0, 0.28 + i * 0.16, -0.62 - Math.sin(i * 0.6) * 0.08);
    lion.add(curl);
  }

  // 紅緞頸圈 ＋ 胸前祈福金鈴
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.055, 8, 18), redSilk);
  collar.rotation.x = Math.PI / 2 + 0.22;
  collar.position.set(0, 0.86, 0.16);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 10), goldBell);
  bell.position.set(0, 0.72, 0.49);

  // 獅頭、立體眉骨、寬鼻吻、雙耳、亮眼與口含吉祥石珠
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.06, 0.22);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 14), stoneMain);
  cranium.scale.set(1.06, 0.98, 1.04);
  cranium.castShadow = true;
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.26), stoneMain);
  snout.position.set(0, -0.06, 0.28);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 8), stoneCarved);
  nose.scale.set(1.3, 0.85, 0.9);
  nose.position.set(0, 0.02, 0.40);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.11, 0.22), stoneCarved);
  jaw.position.set(0, -0.22, 0.25);
  // 口含石珠
  const mouthPearl = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), goldBell);
  mouthPearl.position.set(0, -0.14, 0.34);

  // 雙眼（白眼球＋琥珀金瞳＋烏黑眼珠）與威嚴眉脊、捲耳、口含金珠與虎牙
  const scleraMat = new THREE.MeshStandardMaterial({ color: 0xF8FAFC, roughness: 0.35 });
  const irisMat = new THREE.MeshStandardMaterial({ color: 0xD97706, roughness: 0.25 });
  [-0.145, 0.145].forEach((ex) => {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.078, 10, 10), scleraMat);
    sclera.position.set(ex, 0.085, 0.30);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 10), irisMat);
    iris.position.set(ex, 0.085, 0.355);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.030, 8, 8), eyeMat);
    pupil.position.set(ex, 0.085, 0.392);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.06, 0.12), stoneCarved);
    brow.position.set(ex, 0.18, 0.31);
    brow.rotation.z = ex < 0 ? -0.26 : 0.26;
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.115, 8, 8), stoneCarved);
    ear.scale.set(0.85, 1.0, 0.65);
    ear.position.set(ex * 2.35, 0.23, 0.02);
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 6), scleraMat);
    fang.rotation.x = Math.PI;
    fang.position.set(ex * 0.85, -0.15, 0.38);
    headGroup.add(sclera, iris, pupil, brow, ear, fang);
  });

  // 螺髻螺旋獅鬃（圍繞頭部 14 顆立體雕刻髮捲！）
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2;
    const r = 0.36;
    const curl = new THREE.Mesh(new THREE.SphereGeometry(0.115, 8, 8), stoneCarved);
    curl.position.set(Math.cos(ang) * r, Math.sin(ang) * r * 0.92 + 0.02, -0.06 + Math.cos(ang * 2) * 0.04);
    headGroup.add(curl);
  }
  // 頭頂額髻螺捲
  for (let i = -1; i <= 1; i++) {
    const topCurl = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 8), stoneCarved);
    topCurl.position.set(i * 0.14, 0.33, 0.10);
    headGroup.add(topCurl);
  }

  headGroup.add(cranium, snout, nose, jaw, mouthPearl);
  lion.add(haunch, chest, collar, bell, headGroup);

  // ★ 需求 #6：公獅踩雕花紅緞繡球 ／ 母獅戲「超明顯可愛玉白小幼獅」
  if (isMale) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 14), stoneCarved);
    ball.position.set(0, 0.24, 0.58);
    const ribbon1 = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.036, 6, 18), redSilk);
    ribbon1.position.copy(ball.position);
    const ribbon2 = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.032, 6, 18), goldBell);
    ribbon2.position.copy(ball.position);
    ribbon2.rotation.y = Math.PI / 2;
    lion.add(ball, ribbon1, ribbon2);
  } else {
    // ★ 需求 #3：精雕版「玉白小幼獅」（10 顆小螺髻獅鬃、白眼球琥珀金眼、立體鼻吻、四爪俏皮舉起、三段捲翹小獅尾、紅領結金鈴！）
    const cubStone = new THREE.MeshStandardMaterial({ color: 0xF4EFE5, roughness: 0.60 });
    const cubMane = new THREE.MeshStandardMaterial({ color: 0xD7CEC0, roughness: 0.68 });
    const cub = new THREE.Group();

    const cubBody = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 12), cubStone);
    cubBody.scale.set(0.95, 0.92, 1.28);
    cubBody.position.set(0, 0.25, 0);
    cubBody.castShadow = true;

    const cubHead = new THREE.Mesh(new THREE.SphereGeometry(0.23, 14, 14), cubStone);
    cubHead.position.set(0, 0.50, 0.15);
    cubHead.castShadow = true;

    // 小獅 10 顆精緻小螺髻獅鬃
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const cCurl = new THREE.Mesh(new THREE.SphereGeometry(0.072, 8, 8), cubMane);
      cCurl.position.set(Math.cos(a) * 0.22, 0.50 + Math.sin(a) * 0.21, 0.04);
      cub.add(cCurl);
    }

    // 小獅立體口鼻與笑臉
    const cSnout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.11, 0.15), cubStone);
    cSnout.position.set(0, 0.45, 0.34);
    const cNose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), cubMane);
    cNose.scale.set(1.25, 0.85, 0.85);
    cNose.position.set(0, 0.49, 0.41);

    // 雙眼（白眼球＋琥珀金瞳＋黑眼珠）與圓耳、前後四足
    [-0.10, 0.10].forEach((cx) => {
      const cEar = new THREE.Mesh(new THREE.SphereGeometry(0.078, 8, 8), cubMane);
      cEar.position.set(cx * 1.65, 0.68, 0.14);
      const cSclera = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 8), scleraMat);
      cSclera.position.set(cx, 0.54, 0.34);
      const cIris = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), irisMat);
      cIris.position.set(cx, 0.54, 0.375);
      const cPupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), eyeMat);
      cPupil.position.set(cx, 0.54, 0.398);

      // 俏皮前爪（右爪向上揮舞撒嬌）
      const cFrontLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.26, 8), cubStone);
      cFrontLeg.position.set(cx * 1.35, 0.30, 0.22);
      cFrontLeg.rotation.x = cx > 0 ? -0.95 : -0.35;
      const cBackLeg = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), cubStone);
      cBackLeg.position.set(cx * 1.6, 0.14, -0.14);
      cub.add(cEar, cSclera, cIris, cPupil, cFrontLeg, cBackLeg);
    });

    // 紅緞小頸圈與胸前小金鈴
    const cubCollar = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.036, 8, 16), redSilk);
    cubCollar.rotation.x = Math.PI / 2;
    cubCollar.position.set(0, 0.35, 0.12);
    const cubBell = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 10), goldBell);
    cubBell.position.set(0, 0.31, 0.30);

    // 三段翹起蓬鬆捲尾巴
    for (let t = 0; t < 3; t++) {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.082 - t * 0.01, 8, 8), cubMane);
      seg.position.set(0, 0.24 + t * 0.11, -0.32 - t * 0.03);
      cub.add(seg);
    }

    cub.add(cubBody, cubHead, cSnout, cNose, cubCollar, cubBell);
    cub.position.set(-0.08, 0.0, 0.65);
    cub.rotation.y = 0.40;
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
  const rockDark = new THREE.MeshStandardMaterial({ color: 0x4E5960, roughness: 0.92 });
  const rockLight = new THREE.MeshStandardMaterial({ color: 0x6D7A82, roughness: 0.88 });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x3D9CB8,
    emissive: 0x164E63,
    emissiveIntensity: 0.22,
    roughness: 0.16,
    metalness: 0.22,
    transparent: true,
    opacity: 0.72
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

  // 動態雪白瀑布水瀑光帶（3 股流動水柱＋底部水花）
  [-0.35, 0.15, 0.55].forEach((offset, idx) => {
    const streamMat = new THREE.MeshBasicMaterial({
      color: 0xE6F8FF,
      transparent: true,
      opacity: 0.82
    });
    const stream = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 2.35), streamMat);
    stream.position.set(0.65 + offset * 0.55, 1.25, -0.35 + offset * 0.4);
    stream.rotation.y = -0.65;
    stream.rotation.x = 0.22;
    stream.userData.phase = idx * 2.1;
    stream.userData.baseY = 1.25;
    animatedRefs.waterfallStreams.push(stream);
    g.add(stream);
  });

  // 瀑布落水白色水花環
  const splash = new THREE.Mesh(
    new THREE.RingGeometry(0.32, 0.72, 16),
    new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
  );
  splash.rotation.x = -Math.PI / 2;
  splash.position.set(0.42, 0.24, -0.05);
  animatedRefs.waterfallStreams.push(splash);
  g.add(splash);

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
 * ★ 需求 #5：博物館級精緻神像雕塑（細膩開面妝容 ＋ 金線刺繡龍袍神衣 ＋ 金字紅綾肩帶 ＋ 逐顆珍珠串 ＋ 繁複金冠 ＋ 層次長黑髯 ＋ 巨型檀木念珠）
 */
function createAuthenticPhotoDeity(variant) {
  const g = new THREE.Group();
  const ebonyMat = new THREE.MeshStandardMaterial({ color: 0x261E1B, roughness: 0.68 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xF5C542, metalness: 0.72, roughness: 0.24 });
  const redSilk = new THREE.MeshStandardMaterial({ color: 0xC81E24, roughness: 0.48 });
  const pearlMat = new THREE.MeshStandardMaterial({ color: 0xFFFDF8, roughness: 0.18, metalness: 0.22 });
  const jadeMat = new THREE.MeshStandardMaterial({ color: 0x34A87C, roughness: 0.28, metalness: 0.18 });
  const beadWood = new THREE.MeshStandardMaterial({ color: 0x3D2218, roughness: 0.36, metalness: 0.08 });

  const faceMat = new THREE.MeshStandardMaterial({
    map: createDeityFaceTexture(variant),
    roughness: 0.32,
    metalness: 0.12
  });
  const woodReliefMat = new THREE.MeshStandardMaterial({
    color: variant === 'leftMother' ? 0x7E5743 : variant === 'centerKing' ? 0x8F5E3F : 0x6B4A3A,
    roughness: 0.34,
    metalness: 0.10
  });
  const rubyMat = new THREE.MeshStandardMaterial({ color: 0xD91E2A, metalness: 0.35, roughness: 0.18 });
  const robeMat = new THREE.MeshStandardMaterial({
    map: createDeityRobeTexture(variant),
    roughness: 0.40,
    metalness: 0.28
  });
  const sashMatLeft = new THREE.MeshStandardMaterial({
    map: createDeitySashTexture('鎮安宮五府千歲祖廟'),
    roughness: 0.46
  });
  const sashMatRight = new THREE.MeshStandardMaterial({
    map: createDeitySashTexture('雲林馬鳴山五年千歲'),
    roughness: 0.46
  });

  // 1. 黑檀金飾雕花太師椅（中尊椅背後移 0.08m，留出精準空間讓黃緞錦旗優雅插立於神像與椅背正中央！）
  const chairW = variant === 'centerKing' ? 1.24 : 1.42;
  const chairH = variant === 'centerKing' ? 1.62 : 2.18;
  const backZ = variant === 'centerKing' ? -0.52 : -0.46;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(chairW, 0.62, 1.12), ebonyMat);
  seat.position.y = 0.31;
  seat.castShadow = true;
  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(chairW, chairH, 0.14), ebonyMat);
  backPanel.position.set(0, chairH / 2 + 0.25, backZ);
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(chairW + 0.30, 0.20, 0.22), ebonyMat);
  topRail.position.set(0, chairH + 0.26, backZ + 0.02);
  const goldRailTrim = new THREE.Mesh(new THREE.BoxGeometry(chairW + 0.16, 0.05, 0.24), goldMat);
  goldRailTrim.position.set(0, chairH + 0.26, backZ + 0.02);
  g.add(seat, backPanel, topRail, goldRailTrim);

  [-chairW / 2 + 0.08, chairW / 2 - 0.08].forEach((ax) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.08, 0.11), ebonyMat);
    post.position.set(ax, 0.94, 0.44);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 1.02), ebonyMat);
    arm.position.set(ax, 1.40, 0.0);
    const dragonKnob = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), goldMat);
    dragonKnob.position.set(ax, 1.42, 0.52);
    g.add(post, arm, dragonKnob);
  });

  // 共用：精緻寬袖雙臂＋端持奏板
  const addSleevesAndHands = (yBase, spreadX, hasTablet = true) => {
    [-1, 1].forEach((s) => {
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.20, 0.62, 10), robeMat);
      sleeve.position.set(s * spreadX, yBase, 0.18);
      sleeve.rotation.z = s * 0.32;
      sleeve.rotation.x = -0.58;
      const cuffGold = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 6, 14), goldMat);
      cuffGold.position.set(s * (spreadX * 0.72), yBase - 0.16, 0.38);
      g.add(sleeve, cuffGold);
    });
    if (hasTablet) {
      const tablet = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.04), jadeMat);
      tablet.position.set(0, yBase - 0.06, 0.48);
      tablet.rotation.x = -0.18;
      g.add(tablet);
    }
  };

  // ★ 需求 #1：3D 立體樟木雕刻神像五官（高挺木雕鼻樑＋鼻翼＋眉骨拱脊＋飽滿顴骨下巴＋垂珠福耳，讓臉部木雕立體度極為明顯！）
  const addCarvedWoodFaceRelief = (hy, hz, r, isMother = false) => {
    // 高挺立體木雕鼻樑與圓潤鼻頭
    const noseBridge = new THREE.Mesh(new THREE.BoxGeometry(r * 0.18, r * 0.44, r * 0.24), woodReliefMat);
    noseBridge.position.set(0, hy - r * 0.04, hz + r * 0.96);
    noseBridge.rotation.x = -0.18;
    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(r * 0.145, 10, 8), woodReliefMat);
    noseTip.scale.set(1.18, 0.88, 1.05);
    noseTip.position.set(0, hy - r * 0.22, hz + r * 1.06);
    g.add(noseBridge, noseTip);

    // 雕刻眉骨弧脊、顴骨立體隆起與飽滿福耳
    [-1, 1].forEach((s) => {
      const browRidge = new THREE.Mesh(new THREE.BoxGeometry(r * 0.44, r * 0.085, r * 0.14), woodReliefMat);
      browRidge.position.set(s * r * 0.34, hy + r * 0.26, hz + r * 0.86);
      browRidge.rotation.z = s * (isMother ? -0.14 : 0.10);
      browRidge.rotation.y = s * -0.32;
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(r * 0.19, 10, 8), woodReliefMat);
      cheek.scale.set(1.0, 0.85, 0.65);
      cheek.position.set(s * r * 0.46, hy - r * 0.16, hz + r * 0.78);
      const ear = new THREE.Mesh(new THREE.SphereGeometry(r * 0.21, 8, 8), woodReliefMat);
      ear.scale.set(0.55, 1.48, 0.72);
      ear.position.set(s * (r * 0.96), hy - r * 0.06, hz);
      g.add(browRidge, cheek, ear);
      if (isMother) {
        const earDrop = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), pearlMat);
        earDrop.position.set(s * (r * 0.96), hy - r * 0.40, hz + 0.02);
        g.add(earDrop);
      }
    });
    // 立體下巴木雕圓弧
    const chin = new THREE.Mesh(new THREE.SphereGeometry(r * 0.19, 10, 8), woodReliefMat);
    chin.scale.set(1.1, 0.82, 0.75);
    chin.position.set(0, hy - r * 0.62, hz + r * 0.72);
    g.add(chin);
  };

  if (variant === 'leftMother') {
    // ---- 左尊（天上聖母 媽祖娘娘：立體木雕開面、極繁金鳳銜珠珠簾鳳冠、3 層立體白珍珠、刺繡金鳳神衣、金字紅綾、座前檀木珠）----
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.56, 1.22, 20), robeMat);
    robe.position.set(0, 1.20, 0.04);
    robe.rotation.y = Math.PI;
    const cape = new THREE.Mesh(new THREE.BoxGeometry(1.22, 1.54, 0.16), redSilk);
    cape.position.set(0, 1.14, -0.26);
    const waistBelt = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.055, 8, 20), goldMat);
    waistBelt.rotation.x = Math.PI / 2;
    waistBelt.position.set(0, 1.06, 0.06);
    addSleevesAndHands(1.30, 0.42, true);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 20), faceMat);
    head.position.set(0, 1.98, 0.08);
    head.rotation.y = -Math.PI / 2;
    addCarvedWoodFaceRelief(1.98, 0.08, 0.28, true);

    // ★ 需求 #1：極致精雕「金鳳銜珠・九龍十一珠簾媽祖鳳冠」（多層鏤空金冠、紅綠寶石鑲環、展翅金鳳首、步搖金釵與 11 串垂墜珠簾！）
    const crownBaseRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 8, 24), goldMat);
    crownBaseRing.rotation.x = Math.PI / 2;
    crownBaseRing.position.set(0, 2.16, 0.06);
    const crownRim = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.31, 0.44, 18), goldMat);
    crownRim.position.set(0, 2.38, 0.06);
    const crownTier2 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.24, 14), goldMat);
    crownTier2.position.set(0, 2.68, 0.04);
    const crownTop = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.44, 10), new THREE.MeshStandardMaterial({ color: 0x993524, roughness: 0.42 }));
    crownTop.position.set(0, 2.94, 0.02);
    const topPearl = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), goldMat);
    topPearl.position.set(0, 3.18, 0.02);

    // 冠額正中央「立體金鳳首＋紅寶石冠心」
    const phoenixArch = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.036, 8, 18, Math.PI), goldMat);
    phoenixArch.position.set(0, 2.48, 0.36);
    const crownJewel = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), rubyMat);
    crownJewel.position.set(0, 2.46, 0.39);
    const phoenixHead = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.16, 6), goldMat);
    phoenixHead.rotation.x = Math.PI / 2.2;
    phoenixHead.position.set(0, 2.74, 0.36);

    // 冠沿 9 顆紅寶石／翡翠／珍珠鑲嵌環
    for (let i = -4; i <= 4; i++) {
      const ang = i * 0.26;
      const gem = new THREE.Mesh(
        new THREE.SphereGeometry(0.032, 8, 8),
        i === 0 ? rubyMat : Math.abs(i) % 2 === 1 ? pearlMat : jadeMat
      );
      gem.position.set(Math.sin(ang) * 0.36, 2.24, 0.06 + Math.cos(ang) * 0.36);
      g.add(gem);
    }

    // 左右雙層展開「鳳羽翼飾」＋ 兩側金步搖垂珠
    [-1, 1].forEach((s) => {
      const wing1 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.06), goldMat);
      wing1.position.set(s * 0.38, 2.38, 0.10);
      wing1.rotation.z = s * -0.26;
      const wing2 = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.30, 0.05), goldMat);
      wing2.position.set(s * 0.48, 2.52, 0.04);
      wing2.rotation.z = s * -0.45;
      const hairpin = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.44, 6), goldMat);
      hairpin.position.set(s * 0.46, 2.20, 0.16);
      hairpin.rotation.z = s * -0.35;
      const pinPearl = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), pearlMat);
      pinPearl.position.set(s * 0.56, 2.38, 0.18);
      g.add(wing1, wing2, hairpin, pinPearl);
    });
    // 11 條細密垂墜金珠簾（每條 4 顆精細金珠＋最底白珍珠！）
    for (let i = -5; i <= 5; i++) {
      for (let b = 0; b < 5; b++) {
        const drop = new THREE.Mesh(new THREE.SphereGeometry(b === 4 ? 0.026 : 0.020, 6, 6), b === 4 ? pearlMat : goldMat);
        drop.position.set(i * 0.062, 2.35 - b * 0.072, 0.38);
        g.add(drop);
      }
    }

    // 胸前 3 層「逐顆立體白珍珠項鍊」
    [0.34, 0.42, 0.50].forEach((r, idx) => {
      const count = 13 + idx * 2;
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const ang = Math.PI * (0.12 + t * 0.76);
        const px = Math.cos(ang) * r;
        const py = 1.76 - idx * 0.04 - Math.sin(ang) * (0.28 + idx * 0.07);
        const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), pearlMat);
        pearl.position.set(px, py, 0.36 + idx * 0.035);
        g.add(pearl);
      }
    });

    // 交叉金字紅綾神明肩帶
    [-1, 1].forEach((s) => {
      const sash = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.32, 0.04), sashMatLeft);
      sash.position.set(s * 0.14, 1.18, 0.48);
      sash.rotation.z = s * 0.48;
      g.add(sash);
    });

    // 座前懸垂一串 15 顆立體深木佛珠
    for (let i = 0; i < 15; i++) {
      const t = i / 14;
      const bx = -0.52 + t * 1.04;
      const sag = Math.sin(t * Math.PI) * 0.30;
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), beadWood);
      bead.position.set(bx, 0.82 - sag, 0.54);
      g.add(bead);
    }
    g.add(robe, cape, waistBelt, head, crownBaseRing, crownRim, crownTier2, crownTop, topPearl, phoenixArch, crownJewel, phoenixHead);
  } else if (variant === 'centerKing') {
    // ---- 中尊（代天巡狩五府千歲：立體木雕神容、橘金刺繡龍袍戰甲、金龍吞口甲、極繁 10 紅絨球帝王通天戰冠！）----
    const armor = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.49, 1.00, 18), robeMat);
    armor.position.set(0, 1.08, 0.08);
    armor.rotation.y = Math.PI;
    const chestPlate = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), goldMat);
    chestPlate.scale.set(1.20, 0.96, 0.58);
    chestPlate.position.set(0, 1.12, 0.38);
    const chestRuby = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), rubyMat);
    chestRuby.position.set(0, 1.14, 0.52);
    const jadeBelt = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.055, 8, 18), jadeMat);
    jadeBelt.rotation.x = Math.PI / 2;
    jadeBelt.position.set(0, 0.88, 0.10);
    [-0.38, 0.38].forEach((sx) => {
      const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), goldMat);
      pauldron.scale.set(1.1, 0.72, 0.95);
      pauldron.position.set(sx, 1.44, 0.10);
      g.add(pauldron);
    });
    addSleevesAndHands(1.16, 0.38, false);

    // 明顯木雕立體五官開面神容 ＋ 短威嚴鬍鬚
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.24, 22, 18), faceMat);
    face.position.set(0, 1.72, 0.12);
    face.rotation.y = -Math.PI / 2;
    addCarvedWoodFaceRelief(1.72, 0.12, 0.24, false);
    const goatee = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 8), new THREE.MeshStandardMaterial({ color: 0x161414, roughness: 0.85 }));
    goatee.rotation.x = Math.PI;
    goatee.position.set(0, 1.46, 0.32);

    // ★ 需求 #1：極繁精雕「代天巡狩・十全紅絨球帝王通天戰冠」（多層金絲雕冠、金龍額牌、寶石珠帶、雙展金翅、寶塔火焰頂珠與 10 支紅金絨球！）
    const crownBand = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.036, 8, 22), goldMat);
    crownBand.rotation.x = Math.PI / 2;
    crownBand.position.set(0, 1.88, 0.10);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.25, 0.36, 16), goldMat);
    crown.position.set(0, 2.04, 0.10);
    const crownFrontPlaque = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.08), goldMat);
    crownFrontPlaque.position.set(0, 2.08, 0.34);
    const plaqueRuby = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 8), rubyMat);
    plaqueRuby.position.set(0, 2.10, 0.39);
    const crownTier2 = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.25, 0.20, 12), goldMat);
    crownTier2.position.set(0, 2.30, 0.08);
    const crownCrest = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.30, 8), goldMat);
    crownCrest.position.set(0, 2.52, 0.08);
    const crownFlameGem = new THREE.Mesh(new THREE.SphereGeometry(0.062, 8, 8), rubyMat);
    crownFlameGem.position.set(0, 2.70, 0.08);
    // 雙側雕花戰冠金翅
    [-1, 1].forEach((s) => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.055), goldMat);
      wing.position.set(s * 0.36, 2.08, 0.08);
      wing.rotation.z = s * -0.32;
      const wingGem = new THREE.Mesh(new THREE.SphereGeometry(0.036, 6, 6), jadeMat);
      wingGem.position.set(s * 0.42, 2.12, 0.12);
      g.add(wing, wingGem);
    });
    // 10 支細金絲朝天翹飾紅絨球＋頂端白珠！
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), goldMat);
      stem.position.set(Math.cos(a) * 0.23, 2.30, 0.10 + Math.sin(a) * 0.19);
      stem.rotation.z = -Math.cos(a) * 0.48;
      stem.rotation.x = Math.sin(a) * 0.22;
      const pom = new THREE.Mesh(new THREE.SphereGeometry(0.062, 8, 8), redSilk);
      pom.position.set(Math.cos(a) * 0.35, 2.50, 0.10 + Math.sin(a) * 0.24);
      const tipPearl = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), pearlMat);
      tipPearl.position.set(Math.cos(a) * 0.37, 2.56, 0.10 + Math.sin(a) * 0.25);
      g.add(stem, pom, tipPearl);
    }
    g.add(armor, chestPlate, chestRuby, jadeBelt, face, goatee, crownBand, crown, crownFrontPlaque, plaqueRuby, crownTier2, crownCrest, crownFlameGem);
  } else {
    // ---- 右尊（五府千歲黑髯王爺公：明顯立體木雕開面、極繁五龍寶石王爺相帽、層次長黑髯、兩大串巨型檀木念珠＋座下復古肖像畫框！）----
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.58, 1.24, 20), robeMat);
    robe.position.set(0, 1.20, 0.04);
    robe.rotation.y = Math.PI;
    const cape = new THREE.Mesh(new THREE.BoxGeometry(1.26, 1.56, 0.16), redSilk);
    cape.position.set(0, 1.14, -0.26);
    addSleevesAndHands(1.30, 0.44, false);

    // 威嚴立體木雕開面聖容
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 20), faceMat);
    head.position.set(0, 1.98, 0.08);
    head.rotation.y = -Math.PI / 2;
    addCarvedWoodFaceRelief(1.98, 0.08, 0.28, false);

    // 層次飄逸五綹長黑髯 ＋ 兩側八字鬍
    const beardMat = new THREE.MeshStandardMaterial({ color: 0x151313, roughness: 0.80 });
    const mainBeard = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.96, 12), beardMat);
    mainBeard.rotation.x = Math.PI;
    mainBeard.position.set(0, 1.46, 0.31);
    [-0.14, 0.14].forEach((bx) => {
      const sideBeard = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.72, 8), beardMat);
      sideBeard.rotation.x = Math.PI;
      sideBeard.position.set(bx, 1.56, 0.28);
      const must = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.055, 0.06), beardMat);
      must.position.set(bx * 0.85, 1.84, 0.35);
      must.rotation.z = bx < 0 ? 0.28 : -0.28;
      g.add(sideBeard, must);
    });

    // ★ 需求 #1：極繁精雕「五龍寶石王爺相帽」（三層鏤空金冠、五龍金飾冠脊、紅翡翠寶石環、雕雲雙展翅與兩側垂珠流蘇！）
    const crownBase = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 8, 22), goldMat);
    crownBase.rotation.x = Math.PI / 2;
    crownBase.position.set(0, 2.16, 0.06);
    const crown1 = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.32, 0.44, 18), goldMat);
    crown1.position.set(0, 2.38, 0.06);
    const crownMidRing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.036, 8, 20), goldMat);
    crownMidRing.rotation.x = Math.PI / 2;
    crownMidRing.position.set(0, 2.60, 0.06);
    const crown2 = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.48, 12), goldMat);
    crown2.position.set(0, 2.84, 0.06);
    const crownSpire = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), rubyMat);
    crownSpire.position.set(0, 3.12, 0.06);
    // 額前五龍金牌與雙層雲翅
    for (let i = -2; i <= 2; i++) {
      const crest = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.20, 6), goldMat);
      const ang = i * 0.34;
      crest.position.set(Math.sin(ang) * 0.34, 2.66 - Math.abs(i) * 0.03, 0.06 + Math.cos(ang) * 0.34);
      g.add(crest);
    }
    [-1, 1].forEach((s) => {
      const wing1 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.06), goldMat);
      wing1.position.set(s * 0.40, 2.38, 0.08);
      wing1.rotation.z = s * -0.22;
      const wingScroll = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.028, 6, 12), goldMat);
      wingScroll.position.set(s * 0.56, 2.48, 0.08);
      // 兩側垂墜紅金珠穗
      for (let b = 0; b < 4; b++) {
        const beadDrop = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 6), b === 3 ? rubyMat : pearlMat);
        beadDrop.position.set(s * 0.38, 2.12 - b * 0.075, 0.22);
        g.add(beadDrop);
      }
      g.add(wing1, wingScroll);
    });
    // 冠額 7 顆紅寶石／翡翠／珍珠鑲飾
    for (let i = -3; i <= 3; i++) {
      const ang = i * 0.32;
      const gem = new THREE.Mesh(
        new THREE.SphereGeometry(i === 0 ? 0.062 : 0.040, 8, 8),
        i === 0 ? rubyMat : Math.abs(i) % 2 === 1 ? jadeMat : pearlMat
      );
      gem.position.set(Math.sin(ang) * 0.37, 2.38 + (i === 0 ? 0.06 : 0), 0.06 + Math.cos(ang) * 0.37);
      g.add(gem);
    }

    // 交叉金字紅綾肩帶
    [-1, 1].forEach((s) => {
      const sash = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.36, 0.04), sashMatRight);
      sash.position.set(s * 0.14, 1.24, 0.44);
      sash.rotation.z = s * 0.44;
      g.add(sash);
    });

    // 兩大串厚重深檀木佛珠橫掛於扶手正前方
    [0.0, -0.18].forEach((yOff, loopIdx) => {
      const beadCount = 20;
      for (let i = 0; i < beadCount; i++) {
        const t = i / (beadCount - 1);
        const bx = -0.68 + t * 1.36;
        const sag = Math.sin(t * Math.PI) * (0.36 + loopIdx * 0.14);
        const bead = new THREE.Mesh(new THREE.SphereGeometry(0.066, 10, 10), beadWood);
        bead.position.set(bx, 1.38 + yOff - sag, 0.56 + loopIdx * 0.05);
        g.add(bead);
      }
    });

    // 椅座下方精緻復古神明肖像畫框
    const miniFrame = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.74, 0.08), ebonyMat);
    miniFrame.position.set(0, 0.38, 0.54);
    const miniPic = new THREE.Mesh(
      new THREE.PlaneGeometry(0.46, 0.62),
      new THREE.MeshStandardMaterial({ map: createVintageDeityPortraitTexture(), roughness: 0.65 })
    );
    miniPic.position.set(0, 0.38, 0.585);
    g.add(robe, cape, head, mainBeard, crownBase, crown1, crownMidRing, crown2, crownSpire, miniFrame, miniPic);
  }

  return g;
}

/**
 * 實景還原：古樸灰黑四足方鼎香爐
 */
function createAntiqueSquareCenser() {
  const g = new THREE.Group();
  const pewter = new THREE.MeshStandardMaterial({ color: 0x52575C, metalness: 0.55, roughness: 0.46 });
  const darkIron = new THREE.MeshStandardMaterial({ color: 0x34383C, metalness: 0.5, roughness: 0.55 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.16, 0.92), darkIron);
  base.position.y = 0.08;
  const waist = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.46, 0.74), pewter);
  waist.position.y = 0.39;
  waist.castShadow = true;
  const rim = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.14, 0.96), pewter);
  rim.position.y = 0.68;
  const ash = new THREE.Mesh(
    new THREE.PlaneGeometry(1.18, 0.80),
    new THREE.MeshStandardMaterial({ map: createIncenseAshTexture(), roughness: 0.96 })
  );
  ash.rotation.x = -Math.PI / 2;
  ash.position.y = 0.76;

  // 兩側雙耳圓環
  [-0.74, 0.74].forEach((ex) => {
    const ear = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.032, 8, 12), pewter);
    ear.position.set(ex, 0.62, 0);
    g.add(ear);
  });

  g.add(base, waist, rim, ash);
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

  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.16, 1.75), new THREE.MeshStandardMaterial({ color: awningColor, roughness: 0.72 }));
  roof.position.set(0, 2.42, 0.06);
  roof.rotation.x = 0.14;
  const trim = new THREE.Mesh(new THREE.BoxGeometry(2.68, 0.14, 0.12), new THREE.MeshStandardMaterial({ color: stripeColor, roughness: 0.75 }));
  trim.position.set(0, 2.28, 0.90);
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

  // ★ 需求 #1：精準六角頂點對齊「雙層金色飛簷亭頂天公爐蓋」（6 根金柱、六角亭蓋、金邊框、6 處起翹飛簷與小風鈴全數對齊 sin/cos 頂點，100% 零錯位零破圖！）
  if (hasPavilionLid) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const sx = Math.sin(a);
      const cz = Math.cos(a);
      const px = sx * radius * 0.88;
      const pz = cz * radius * 0.88;
      // 柱礎與金柱精準立於六角頂點上，柱頭緊密托住六角亭蓋！
      const postBase = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.056, 0.07, 8), deepGoldMat);
      postBase.position.set(px, height / 2 + 0.04, pz);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.90, 8), bronzeMat);
      post.position.set(px, height / 2 + 0.48, pz);
      const postCap = new THREE.Mesh(new THREE.SphereGeometry(0.046, 8, 8), deepGoldMat);
      postCap.position.set(px, height / 2 + 0.91, pz);
      g.add(postBase, post, postCap);

      // 一層飛簷起翹角＋懸掛小風鈴（以 order = 'YXZ' 精準朝向各六角頂點徑向起翹！）
      const eaveTip = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.24, 5), bronzeMat);
      eaveTip.position.set(sx * radius * 1.22, height / 2 + 0.95, cz * radius * 1.22);
      eaveTip.rotation.order = 'YXZ';
      eaveTip.rotation.y = a;
      eaveTip.rotation.x = 0.80;
      const bell = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.10, 6), deepGoldMat);
      bell.position.set(sx * radius * 1.15, height / 2 + 0.80, cz * radius * 1.15);
      g.add(eaveTip, bell);
    }
    const lid1 = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.22, 0.50, 6), bronzeMat);
    lid1.position.y = height / 2 + 1.14;
    const lid1Rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.16, 0.038, 6, 6), deepGoldMat);
    lid1Rim.rotation.x = Math.PI / 2;
    lid1Rim.rotation.z = Math.PI / 6; // 精準對齊六角亭蓋 6 個頂點！
    lid1Rim.position.y = height / 2 + 0.90;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.52, radius * 0.56, 0.22, 6), crimsonMat);
    neck.position.y = height / 2 + 1.40;
    const lid2 = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.76, 0.42, 6), bronzeMat);
    lid2.position.y = height / 2 + 1.64;
    const lid2Rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.72, 0.028, 6, 6), deepGoldMat);
    lid2Rim.rotation.x = Math.PI / 2;
    lid2Rim.rotation.z = Math.PI / 6;
    lid2Rim.position.y = height / 2 + 1.45;
    const gourd1 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), bronzeMat);
    gourd1.position.y = height / 2 + 1.90;
    const gourd2 = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), bronzeMat);
    gourd2.position.y = height / 2 + 2.06;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 6), bronzeMat);
    tip.position.y = height / 2 + 2.20;
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
