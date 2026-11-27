/**
 * ★ V38 博物館級寫實傳統台灣木雕神像（左尊黃色刺繡三角帽巾、中尊武器換手、三尊表情／脖子／手部／坐姿全面精雕、右尊三層立體長髯！）
 * -------------------------------------------------------------------------------------------------------------
 * 1. 左側神尊 (leftMother)：珠簾鳳冠女神尊（天上聖母）
 *    - 頭冠上方披覆「小紅帽造型」黃色絲緞刺繡三角帽巾（紅金萬字錦繡前滾邊＋祥雲蓮花刺繡），優雅拱覆鳳冠並垂落雙肩
 *    - 精雕 3D 面部輪廓＋V38 慈祥微笑開面、擬真車旋曲線玉頸與交領、關節五指神手、端坐垂褶刺繡神袍與翹頭繡金鳳靴
 * 2. 中間神尊 (centerKing)：戰甲將軍神尊（中壇元帥）
 *    - 武器換手：神像右手（觀者左側 -X）高舉緊握筆直細長「火尖槍」，神像左手（觀者右側 +X）自然放鬆下垂輕撫右膝
 *    - 橘金絲緞金蔥刺繡戰袍＋腹部正中央圓形金獅刺繡主徽（毫無遮擋）、英武微右轉精雕神臉、擬真頸部與五指戰手
 * 3. 右側神尊 (rightBeardKing)：黑面長鬚鎮殿神尊（鎮殿王爺）
 *    - 全新三層立體流瀑長髯（雙飛八字長髭＋絡腮鬢鬚＋19 股漸細 3D 絲滑垂鬚，嚴格浮覆於紅綾外側零穿幫！）
 *    - 威嚴 3D 精雕黑面開面、擬真頸部、五指穩按龍頭扶手、8 顆鮮紅絨球古金皇冠與 5 層深棕木製大佛珠
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  createAntiqueCarvedWoodTextureV35,
  createWoodPlinthReliefTextureV35,
  createDeityFaceTexture,
  createDeityEmbroideryTextureV37,
  createDeitySleeveEmbroideryTextureV37,
  createCenterLionPatchTextureV37,
  createYellowEmbroideredHoodTextureV38,
  createDeitySashTextureV35,
  createGoldEmbroideryReliefTextureV35,
  createEmbossedGoldFoilTexturesV44,
  createEmbroideryBumpTextureV46,
  createDeityShoeTextureV46,
  createSilkyHairTextureV46,
  createCrimsonCapeTextureV35,
  createBeardHairTexture
} from './canvasTextures.js';

/** ★ V45 將 ExtrudeGeometry 原始世界尺度 UV 正規化至 [0,1]×[0,1]，使每片帽冠金鉑 100% 清晰展現細膩鑿花寶相蓮與連珠浮雕！ */
function normalizeExtrudeUVs(geo) {
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const dx = Math.max(1e-5, bb.max.x - bb.min.x);
  const dy = Math.max(1e-5, bb.max.y - bb.min.y);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  if (pos && uv) {
    for (let i = 0; i < pos.count; i++) {
      const u = (pos.getX(i) - bb.min.x) / dx;
      const v = (pos.getY(i) - bb.min.y) / dy;
      uv.setXY(i, u, v);
    }
    uv.needsUpdate = true;
  }
  return geo;
}

/** 沿著 3D 曲線均勻排列的精緻圓珠串 */
function buildBeadStrand(curve, count, radius, mat) {
  const grp = new THREE.Group();
  const geo = new THREE.SphereGeometry(radius, 9, 8);
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const bead = new THREE.Mesh(geo, mat);
    bead.position.copy(curve.getPointAt(t));
    grp.add(bead);
  }
  return grp;
}

/** 平滑貼合身體曲面、絕不翻轉破圖的雙面刺繡紅綾飄帶 */
function buildRibbonMesh(curve, width, mat, segments = 44, taperBottom = false, taperTop = false) {
  const pts = curve.getSpacedPoints(segments);
  const positions = [];
  const uvs = [];
  const indices = [];
  const upHint = new THREE.Vector3(0, 0, 1);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = pts[i];
    const pPrev = pts[Math.max(0, i - 1)];
    const pNext = pts[Math.min(segments, i + 1)];
    const tangent = new THREE.Vector3().subVectors(pNext, pPrev).normalize();

    const right = new THREE.Vector3().crossVectors(upHint, tangent);
    if (right.lengthSq() < 1e-4) right.set(1, 0, 0);
    right.normalize();

    let wScale = 1.0;
    if (taperBottom && t > 0.86) wScale *= 1.0 - ((t - 0.86) / 0.14) * 0.40;
    if (taperTop && t < 0.12) wScale *= 0.68 + (t / 0.12) * 0.32;

    const halfW = width * 0.5 * wScale;
    const leftPt = p.clone().addScaledVector(right, -halfW);
    const rightPt = p.clone().addScaledVector(right, halfW);

    positions.push(leftPt.x, leftPt.y, leftPt.z, rightPt.x, rightPt.y, rightPt.z);
    uvs.push(0, 1 - t, 1, 1 - t);

    if (i < segments) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

/** 兩點間精準圓柱管段 */
function createLimbSegment(pA, pB, rTop, rBot, mat, radialSegs = 12) {
  const dir = new THREE.Vector3().subVectors(pB, pA);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, radialSegs), mat);
  mesh.position.copy(pA).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  mesh.castShadow = true;
  return mesh;
}

/** ★ V44 博物館級「寬肩關節重力下垂自然折橫衣袖」（徹底非水管！平展寬肩→上臂→肘彎關節斜向壓縮折橫→深垂重力寬袖袋→水滴貼合袖口，手部端莊貼合大腿！） */
function createSeamlessEmbroideredArm(points, radiusFn, robeMat, trimMat, wristSkinMat, handMesh, handPos, handQuat = null, handScaleX = 1, armOpts = {}) {
  const {
    drapeDepth = 0.125,
    elbowT = 0.54,
    foldAmp = 0.019,
    cuffDrape = 0.42,
    handInwardX = 0
  } = armOpts;

  const grp = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(points);
  const tubularSegs = 44;
  const radialSegs = 26;
  const geo = new THREE.TubeGeometry(curve, tubularSegs, 1.0, radialSegs, false);
  const pos = geo.attributes.position;
  const ringVerts = radialSegs + 1;
  const center = new THREE.Vector3();
  const v = new THREE.Vector3();
  const radDir = new THREE.Vector3();
  const cuffRingPts = [];
  const cuffInnerPts = [];

  for (let i = 0; i <= tubularSegs; i++) {
    const t = i / tubularSegs;
    const baseR = radiusFn(t);
    curve.getPointAt(t, center);

    // 1) 重力下垂包絡線（自上臂漸展，於肘下與前臂中段最深垂墜，袖口仍保留自然重力水滴廓形！）
    const startRamp = Math.min(1, Math.pow(t / 0.20, 1.12));
    const endKeep = 1.0 - (1.0 - cuffDrape) * Math.pow(Math.max(0, (t - 0.66) / 0.34), 1.40);
    const elbowBag = 0.56 + 0.68 * Math.exp(-Math.pow((t - elbowT) / 0.25, 2));
    const drapeEnv = startRamp * endKeep * elbowBag;

    // 2) 人體關節肘彎處清晰立體「斜向自然壓縮折橫」（配合手肘彎曲雕出層次分明布料皺褶！）
    const elbowCreaseMask = Math.exp(-Math.pow((t - elbowT) / 0.18, 2));
    const upperFoldMask = Math.exp(-Math.pow((t - 0.30) / 0.14, 2));
    // 3) 寬闊平展肩頭三角肌支撐輪廓
    const deltoidLift = Math.exp(-Math.pow((t - 0.10) / 0.14, 2)) * 0.020;

    for (let j = 0; j < ringVerts; j++) {
      const idx = i * ringVerts + j;
      const theta = (j / radialSegs) * Math.PI * 2;
      v.fromBufferAttribute(pos, idx).sub(center);
      radDir.copy(v).normalize();

      const downW = Math.max(0, -radDir.y); // 下側布料重力權重
      const upW = Math.max(0, radDir.y);    // 上側貼合肩臂骨相權重

      // 斜向肘窩折橫＋上臂關節壓紋＋重力下垂絲綢波褶
      const elbowCrease = Math.sin((t - elbowT) * Math.PI * 12.5 + Math.cos(theta) * 1.45) * foldAmp * elbowCreaseMask;
      const upperCrease = Math.sin(t * Math.PI * 10.0 + Math.sin(theta) * 1.1) * (foldAmp * 0.45) * upperFoldMask;
      const silkPleat = Math.sin(theta * 5.0 + t * 5.2) * (foldAmp * 0.56) * drapeEnv * (0.25 + 0.75 * downW);
      const rLocal = baseR + deltoidLift * upW + (elbowCrease + upperCrease) * (0.45 + 0.55 * (1 - downW * 0.20)) + silkPleat;

      v.copy(radDir).multiplyScalar(rLocal);
      // 上側貼骨微壓扁、下側袖布受重力明顯自然垂墜成古典寬袖垂袋！
      if (upW > 0.01) {
        v.y *= (1.0 - 0.13 * upW * startRamp);
      }
      if (downW > 0.01 && drapeDepth > 0) {
        const hang = drapeDepth * drapeEnv * Math.pow(downW, 1.14);
        v.y -= hang;
        const sidePinch = 1.0 - 0.27 * Math.pow(downW, 1.60) * drapeEnv;
        v.x *= sidePinch;
        v.z *= sidePinch;
      }

      v.add(center);
      pos.setXYZ(idx, v.x, v.y, v.z);
      if (i === tubularSegs && j < radialSegs) cuffRingPts.push(v.clone());
      if (i === tubularSegs - 2 && j < radialSegs) cuffInnerPts.push(v.clone());
    }
  }
  geo.computeVertexNormals();
  const sleeveMesh = new THREE.Mesh(geo, robeMat);
  sleeveMesh.castShadow = true;
  grp.add(sleeveMesh);

  // ★ V44.1 寬闊大氣平展肩頭護肩（自然橫展銜接軀幹與上臂三角肌，支援低 profile 避免頂穿武將雲肩！）
  const p0 = points[0];
  const p1 = points[1];
  const r0 = radiusFn(0);
  const shScaleY = armOpts.shScaleY ?? 0.80;
  const shCap = new THREE.Mesh(new THREE.SphereGeometry(r0 * 1.12, 18, 14), robeMat);
  shCap.scale.set(1.30, shScaleY, 0.94);
  shCap.position.copy(p0).add(new THREE.Vector3(0, 0.010, 0));
  const shMid = p0.clone().lerp(p1, 0.34);
  const deltoidPad = new THREE.Mesh(new THREE.SphereGeometry(r0 * 1.02, 16, 12), robeMat);
  deltoidPad.scale.set(1.14, Math.min(0.86, shScaleY + 0.08), 0.94);
  deltoidPad.position.copy(shMid).add(new THREE.Vector3(0, 0.004, 0));
  grp.add(shCap, deltoidPad);

  // ★ V45 華美寬大「雙層刺繡金錦袖口＋細金連珠飾邊＋漢服玉白絲綢中衣內袖襯邊」（徹底消除袖口過小單調感！）
  const pEnd = points[points.length - 1];
  const endTan = curve.getTangentAt(1.0).normalize();
  const rEnd = radiusFn(1.0);
  const cuffCurve = new THREE.CatmullRomCurve3(cuffRingPts, true);
  const cuffRing = new THREE.Mesh(new THREE.TubeGeometry(cuffCurve, 36, 0.0130, 8, true), trimMat);
  const cuffInnerCurve = new THREE.CatmullRomCurve3(cuffInnerPts, true);
  const cuffInnerTrim = new THREE.Mesh(new THREE.TubeGeometry(cuffInnerCurve, 30, 0.0082, 7, true), trimMat);
  grp.add(cuffRing, cuffInnerTrim);

  // 精緻連珠金粒點綴於寬大水滴袖口外緣
  if (armOpts.ornateCuff) {
    const cBeadGeo = new THREE.SphereGeometry(0.0068, 6, 5);
    for (let cb = 0; cb < 14; cb++) {
      const pt = cuffCurve.getPointAt(cb / 14);
      const bMesh = new THREE.Mesh(cBeadGeo, trimMat);
      bMesh.position.copy(pt).addScaledVector(endTan, 0.008);
      grp.add(bMesh);
    }
  }

  // 漢服內層玉白絲綢中衣袖緣（微微自寬袖口探出環抱手腕，層次華美！）
  const innerSilkR = Math.min(rEnd * 0.72, 0.064);
  const innerSilkCuff = new THREE.Mesh(
    new THREE.TorusGeometry(innerSilkR, 0.0095, 8, 20),
    new THREE.MeshStandardMaterial({ color: 0xFFF4DC, roughness: 0.58, metalness: 0.06 })
  );
  innerSilkCuff.position.copy(pEnd).addScaledVector(endTan, 0.006);
  innerSilkCuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), endTan);

  const cuffLiner = new THREE.Mesh(
    new THREE.CylinderGeometry(rEnd * 0.92, rEnd * 0.88, 0.040, 18),
    new THREE.MeshStandardMaterial({ color: 0x160A07, roughness: 0.92, metalness: 0.04 })
  );
  cuffLiner.position.copy(pEnd).addScaledVector(endTan, -0.020);
  cuffLiner.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), endTan);
  grp.add(innerSilkCuff, cuffLiner);

  // ★ V50b 隱藏式袖內接腕段（僅於袖口深處銜接至 .glb 一體雕塑手腕根部，絕不凸出或穿破精雕手背！）
  const wristStart = pEnd.clone().addScaledVector(endTan, -0.088);
  const wristEnd = handQuat
    ? handPos.clone().addScaledVector(endTan, -0.038)
    : handPos.clone().addScaledVector(endTan, -0.024);
  const wristSeg = createLimbSegment(wristStart, wristEnd, 0.025, 0.034, wristSkinMat, 14);
  grp.add(wristSeg);

  handMesh.position.copy(handPos);
  if (handQuat) {
    handMesh.quaternion.copy(handQuat);
  } else {
    // 端莊平穩貼放大腿面之神明手勢（指尖柔和向前略微內收貼合大腿中段，絕不懸空插向膝蓋！）
    const gentleDir = new THREE.Vector3(
      handInwardX !== 0 ? handInwardX : endTan.x * 0.42,
      Math.max(-0.20, Math.min(0.02, endTan.y * 0.24 - 0.08)),
      Math.max(0.84, endTan.z)
    ).normalize();
    handMesh.lookAt(handPos.clone().add(gentleDir));
  }
  if (handScaleX !== 1) handMesh.scale.x *= handScaleX;
  grp.add(handMesh);

  return grp;
}

/**
 * ★ V39 一體成型「優雅端坐垂墜刺繡神袍下裳」（平順 S 形腰際過渡 → 飽滿微開坐姿雙膝 → 柔美 U 型膝間垂褶 → 精細垂直絲綢褶皺，絕無穿幫！）
 */
function buildSeatedRobeDrapeV37(robeMat, opts = {}) {
  const {
    waistY = 0.92,
    bottomY = 0.345,
    halfWTop = 0.44,
    halfWBot = 0.50,
    zWaist = 0.23,
    zKnee = 0.460,
    zHem = 0.390,
    thighSpread = 0.28,
    thighBulge = 0.072,
    pleatAmp = 0.021,
    uvTop = 0.54
  } = opts;

  const segU = 40;
  const segV = 30;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV; // 0 = 腰際, 0.29 = 大腿前緣, 0.45 = 雙膝頂彎, 1 = 袍底（海水江崖繡邊）
    const halfW = halfWTop + (halfWBot - halfWTop) * Math.pow(v, 0.68);

    // ★ V40.2 連續平滑優雅大氣坐姿輪廓（採三次貝茲平滑大腿→飽滿圓潤雙膝→流暢垂褶下擺，徹底消除盒狀折角！）
    let yBase;
    let zProfile;
    const totalH = waistY - bottomY;
    const u1 = 1 - v;
    // 4 點三次貝茲控制點：腰際 → 柔和微斜大腿面 → 圓潤大氣膝頂前弧 → 優雅垂墜袍擺
    const y0 = waistY;
    const y1 = waistY - totalH * 0.14;
    const y2 = waistY - totalH * 0.42;
    const y3 = bottomY;
    yBase = u1 * u1 * u1 * y0 + 3 * u1 * u1 * v * y1 + 3 * u1 * v * v * y2 + v * v * v * y3;

    const z0 = zWaist;
    const z1 = zWaist + (zKnee - zWaist) * 0.90;
    const z2 = zKnee + 0.032;
    const z3 = zHem + 0.014;
    zProfile = u1 * u1 * u1 * z0 + 3 * u1 * u1 * v * z1 + 3 * u1 * v * v * z2 + v * v * v * z3;

    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU; // 0..1 由左至右
      const nx = u * 2 - 1; // -1..+1
      // 左右兩側自然向後方包覆椅座兩側（側視角度亦無破洞！）
      const angle = nx * Math.PI * 0.58;
      const x = Math.sin(angle) * halfW;
      const sideWrapZ = (Math.cos(angle) - 1.0) * 0.36;

      // ★ V46 更順滑柔美的雙大腿→圓膝→膝下絲綢衣擺（消除生硬折紋與波浪板感，衣擺如真絲柔和垂墜圍繞神鞋！）
      const kneeWidth = opts.kneeWidth || 0.225;
      const leftKnee = Math.exp(-Math.pow((x + thighSpread) / kneeWidth, 2));
      const rightKnee = Math.exp(-Math.pow((x - thighSpread) / kneeWidth, 2));
      const thighWeight = Math.exp(-Math.pow((v - 0.35) / 0.28, 2));
      const kneeBump = (leftKnee + rightKnee) * thighBulge * thighWeight;
      const centerValley = -Math.exp(-Math.pow(x / 0.175, 2)) * 0.038 * Math.sin(Math.min(1, v * 1.06) * Math.PI);

      // 雙膝上緣柔順圓潤承托
      const yThighLift = (leftKnee + rightKnee) * 0.030 * Math.exp(-Math.pow((v - 0.27) / 0.23, 2));

      // ★ V48 膝下流暢真絲垂墜折痕＋雙鞋上方自然柔和微張（衣擺優雅覆蓋鞋口上方絕不穿幫！）
      const shinMask = Math.max(0, (v - 0.34) / 0.66);
      const hemFlare = Math.pow(Math.max(0, (v - 0.68) / 0.32), 1.45) * 0.026 * (1 - Math.abs(nx) * 0.30);
      const pleat = (
        Math.sin(nx * Math.PI * 3.0) * (pleatAmp * 0.72) +
        Math.cos(nx * Math.PI * 6.0) * (pleatAmp * 0.22)
      ) * Math.pow(shinMask, 1.05) * (1 - Math.abs(nx) * 0.45);

      const px = x;
      const py = yBase + yThighLift;
      const pz = zProfile + sideWrapZ + kneeBump + centerValley + pleat + hemFlare;

      positions.push(px, py, pz);
      // 貼圖 UV 對應刺繡袍下半身（可依神尊設定 uvTop，中尊避開腹部金獅徽僅展露祥雲海水江崖！）
      uvs.push(u, uvTop - v * uvTop);
    }
  }

  const row = segU + 1;
  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * row + iu;
      const b = a + 1;
      const c = (iv + 1) * row + iu;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, robeMat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** ★ V54 博物館級流線精雕「翹頭如意雲頭繡花鳳履／武將金甲戰靴／厚白底帝王朝靴」（優雅修長船形輪廓＋雙層千層底＋雙捲如意金雲頭＋寶石鑲嵌！） */
function buildCloudToeBootV38(bodyMat, soleMat, trimMat, scale = 1.0, jewelMat = null) {
  const boot = new THREE.Group();

  // 1) 低收後藏踝部（完全隱於神袍下擺之內後方，100% 絕不穿出衣擺！）
  const ankle = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.052, 0.056, 14), bodyMat);
  ankle.position.set(0, 0.054, -0.062);

  // 2) 流線型修長船形千層厚底（外張弧度＋前收微翹，徹底擺脫厚重方磚感！）
  const soleShape = new THREE.Shape();
  soleShape.moveTo(0, 0.135);
  soleShape.bezierCurveTo(0.046, 0.130, 0.068, 0.072, 0.064, -0.015);
  soleShape.bezierCurveTo(0.060, -0.088, 0.046, -0.118, 0, -0.120);
  soleShape.bezierCurveTo(-0.046, -0.118, -0.060, -0.088, -0.064, -0.015);
  soleShape.bezierCurveTo(-0.068, 0.072, -0.046, 0.130, 0, 0.135);
  const soleGeo = new THREE.ExtrudeGeometry(soleShape, {
    depth: 0.024,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.004,
    bevelSegments: 2
  });
  soleGeo.rotateX(Math.PI / 2);
  const sole = new THREE.Mesh(soleGeo, soleMat);
  sole.position.set(0, 0.030, 0.018);

  // 雙層精工細金線滾底邊條（上下包覆千層白底，貴氣立現！）
  const weltGeo = new THREE.ExtrudeGeometry(soleShape, { depth: 0.005, bevelEnabled: false });
  weltGeo.rotateX(Math.PI / 2);
  const soleWeltTop = new THREE.Mesh(weltGeo, trimMat);
  soleWeltTop.scale.set(1.03, 1, 1.02);
  soleWeltTop.position.set(0, 0.035, 0.018);
  const soleWeltBot = new THREE.Mesh(weltGeo, trimMat);
  soleWeltBot.scale.set(1.01, 1, 1.01);
  soleWeltBot.position.set(0, 0.007, 0.018);

  // 3) 修長柔美拱弧絲緞繡花鞋身（比圓球更修長貼合腳型！）
  const vamp = new THREE.Mesh(new THREE.SphereGeometry(0.060, 20, 14), bodyMat);
  vamp.scale.set(0.96, 0.64, 1.88);
  vamp.position.set(0, 0.048, 0.018);

  // 4) 優雅上揚「翹頭船尖＋雙捲金絲如意雲頭＋鑲嵌寶珠」
  const toeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.032, 0.086),
    new THREE.Vector3(0, 0.044, 0.138),
    new THREE.Vector3(0, 0.078, 0.168)
  ]);
  const toeTip = new THREE.Mesh(new THREE.TubeGeometry(toeCurve, 14, 0.024, 12, false), bodyMat);
  toeTip.scale.set(1.18, 0.72, 1.0);

  // 立體雙側金絲捲雲翼（呈現台灣古法繡履的雙捲如意頭神韻！）
  [-1, 1].forEach((s) => {
    const swirlCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.048, 0.044, 0.082),
      new THREE.Vector3(s * 0.034, 0.056, 0.130),
      new THREE.Vector3(s * 0.018, 0.080, 0.158),
      new THREE.Vector3(s * 0.030, 0.086, 0.148)
    ]);
    boot.add(new THREE.Mesh(new THREE.TubeGeometry(swirlCurve, 14, 0.0042, 7, false), trimMat));
  });

  // 鞋尖如意金托＋閃亮珍珠／翠玉寶石
  const toeBezel = new THREE.Mesh(new THREE.TorusGeometry(0.021, 0.0052, 8, 18), trimMat);
  toeBezel.rotation.x = 0.56;
  toeBezel.position.set(0, 0.078, 0.164);
  const toeJewel = new THREE.Mesh(new THREE.SphereGeometry(0.0145, 12, 10), jewelMat || trimMat);
  toeJewel.scale.set(1.0, 0.92, 0.72);
  toeJewel.position.set(0, 0.080, 0.171);

  // 5) 鞋背精工金線如意拱門＋中軸繡金飾帶（起點收於鞋背前段，絕不碰衣擺！）
  const vampArch = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.0040, 8, 20, Math.PI), trimMat);
  vampArch.rotation.set(0.46, 0, 0);
  vampArch.position.set(0, 0.052, 0.074);
  const centerStripCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.080, 0.032),
    new THREE.Vector3(0, 0.076, 0.094),
    new THREE.Vector3(0, 0.078, 0.158)
  ]);
  const centerStrip = new THREE.Mesh(new THREE.TubeGeometry(centerStripCurve, 12, 0.0036, 7, false), trimMat);
  // 中軸三顆迷你金粒繡飾
  [0.056, 0.094, 0.128].forEach((cz) => {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0052, 7, 6), trimMat);
    dot.position.set(0, 0.079 - (cz - 0.056) * 0.04, cz);
    boot.add(dot);
  });

  boot.add(ankle, sole, soleWeltTop, soleWeltBot, vamp, toeTip, toeBezel, toeJewel, vampArch, centerStrip);
  if (scale !== 1.0) boot.scale.setScalar(scale);
  return boot;
}

/** ★ V38 漸細流線 3D 髮絲／長鬚管股建立工具（截面積橢圓微扁＋尾端漸收柔滑尖梢！） */
function createTaperedHairLockV38(points, rStart, rMid, rEnd, mat, tubularSegs = 20, radialSegs = 10, flatX = 1.25, flatZ = 0.78) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, tubularSegs, 1.0, radialSegs, false);
  const pos = geo.attributes.position;
  const ringVerts = radialSegs + 1;
  const center = new THREE.Vector3();
  const v = new THREE.Vector3();

  for (let i = 0; i <= tubularSegs; i++) {
    const t = i / tubularSegs;
    let r;
    if (t < 0.35) {
      const k = t / 0.35;
      r = rStart + (rMid - rStart) * Math.sin(k * Math.PI * 0.5);
    } else {
      const k = (t - 0.35) / 0.65;
      r = rMid + (rEnd - rMid) * Math.pow(k, 1.35);
    }
    curve.getPointAt(t, center);
    for (let j = 0; j < ringVerts; j++) {
      const idx = i * ringVerts + j;
      v.fromBufferAttribute(pos, idx).sub(center);
      v.x *= r * flatX;
      v.y *= r;
      v.z *= r * flatZ;
      v.add(center);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

/** 溫潤古樟木精雕太師木椅（深胡桃古木色澤，雕花紋路與龍頭扶手清晰立體！） */
function buildCarvedThroneV35(variant, mats) {
  const throne = new THREE.Group();
  const isCenter = variant === 'centerKing';
  const baseW = isCenter ? 1.44 : 1.50;
  const seatW = isCenter ? 1.24 : 1.32;

  const plinthBot = new THREE.Mesh(new RoundedBoxGeometry(baseW, 0.14, 1.06, 3, 0.018), mats.woodDark);
  plinthBot.position.set(0, 0.07, 0.04);
  plinthBot.castShadow = true;
  plinthBot.receiveShadow = true;

  const plinthRelief = new THREE.Mesh(new THREE.PlaneGeometry(baseW - 0.10, 0.115), mats.woodRelief);
  plinthRelief.position.set(0, 0.07, 0.576);
  // ★ V40 古樟木座描金線細飾邊（讓三座太師神椅更顯精工貴氣！）
  const plinthGoldTop = new THREE.Mesh(new THREE.BoxGeometry(baseW - 0.08, 0.010, 0.012), mats.antiqueGold);
  plinthGoldTop.position.set(0, 0.132, 0.574);
  const plinthGoldBot = new THREE.Mesh(new THREE.BoxGeometry(baseW - 0.08, 0.010, 0.012), mats.antiqueGold);
  plinthGoldBot.position.set(0, 0.010, 0.574);
  throne.add(plinthGoldTop, plinthGoldBot);

  const plinthStep = new THREE.Mesh(new RoundedBoxGeometry(baseW - 0.12, 0.11, 0.94, 3, 0.016), mats.woodMid);
  plinthStep.position.set(0, 0.195, 0.02);
  plinthStep.castShadow = true;

  const footRest = new THREE.Mesh(new RoundedBoxGeometry(seatW * 0.78, 0.085, 0.34, 2, 0.014), mats.woodDark);
  footRest.position.set(0, 0.285, 0.33);

  // 椅座收齊於垂袍後方 (zMax = +0.20)，100% 絕不穿過垂墜神袍！
  const seatBox = new THREE.Mesh(new RoundedBoxGeometry(seatW, 0.32, 0.64, 3, 0.02), mats.woodMid);
  seatBox.position.set(0, 0.40, -0.14);
  seatBox.castShadow = true;

  const seatLip = new THREE.Mesh(new RoundedBoxGeometry(seatW + 0.08, 0.07, 0.68, 2, 0.015), mats.woodDark);
  seatLip.position.set(0, 0.54, -0.14);

  throne.add(plinthBot, plinthRelief, plinthStep, footRest, seatBox, seatLip);

  const backZ = -0.44;
  if (isCenter) {
    const backH = 1.18;
    const backBoard = new THREE.Mesh(new RoundedBoxGeometry(1.06, backH, 0.10, 3, 0.018), mats.woodMid);
    backBoard.position.set(0, 0.24 + backH * 0.5, backZ);
    throne.add(backBoard);

    const wingShape = new THREE.Shape();
    wingShape.moveTo(-0.88, 0.02);
    wingShape.bezierCurveTo(-0.92, 0.14, -0.76, 0.17, -0.58, 0.12);
    wingShape.quadraticCurveTo(0, 0.02, 0.58, 0.12);
    wingShape.bezierCurveTo(0.76, 0.17, 0.92, 0.14, 0.88, 0.02);
    wingShape.bezierCurveTo(0.84, -0.09, 0.64, -0.09, 0.46, -0.06);
    wingShape.quadraticCurveTo(0, -0.11, -0.46, -0.06);
    wingShape.bezierCurveTo(-0.64, -0.09, -0.84, -0.09, -0.88, 0.02);
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.11,
      bevelEnabled: true,
      bevelThickness: 0.022,
      bevelSize: 0.018,
      bevelSegments: 3
    });
    wingGeo.translate(0, 0, -0.055);
    const wingRail = new THREE.Mesh(wingGeo, mats.woodMid);
    wingRail.position.set(0, 1.41, backZ + 0.02);
    wingRail.castShadow = true;
    throne.add(wingRail);
  } else {
    const backH = 1.28;
    const backPanel = new THREE.Mesh(new RoundedBoxGeometry(seatW - 0.08, backH, 0.11, 3, 0.018), mats.woodMid);
    backPanel.position.set(0, 0.24 + backH * 0.5, backZ);
    const backFrame = new THREE.Mesh(new RoundedBoxGeometry(seatW + 0.08, 0.15, 0.15, 3, 0.02), mats.woodDark);
    backFrame.position.set(0, 1.48, backZ + 0.01);
    throne.add(backPanel, backFrame);

    [-1, 1].forEach((s) => {
      const earCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * (seatW * 0.50), 1.46, backZ + 0.01),
        new THREE.Vector3(s * (seatW * 0.50 + 0.12), 1.50, backZ + 0.03),
        new THREE.Vector3(s * (seatW * 0.50 + 0.18), 1.57, backZ + 0.04)
      ]);
      const ear = new THREE.Mesh(new THREE.TubeGeometry(earCurve, 10, 0.046, 8, false), mats.woodMid);
      const earScroll = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 8), mats.woodMid);
      earScroll.position.set(s * (seatW * 0.50 + 0.18), 1.56, backZ + 0.04);
      throne.add(ear, earScroll);
    });
  }

  const armX = seatW * 0.50 - 0.02;
  const armY = isCenter ? 0.96 : 1.00;
  const armFrontZ = isCenter ? 0.34 : 0.38;
  [-1, 1].forEach((s) => {
    const ax = s * armX;
    const rearPost = new THREE.Mesh(new RoundedBoxGeometry(0.09, armY - 0.24, 0.09, 2, 0.012), mats.woodDark);
    rearPost.position.set(ax, 0.24 + (armY - 0.24) * 0.5, -0.34);
    const frontPost = new THREE.Mesh(new RoundedBoxGeometry(0.095, armY - 0.24, 0.095, 2, 0.014), mats.woodMid);
    frontPost.position.set(ax, 0.24 + (armY - 0.24) * 0.5, armFrontZ - 0.06);
    const sideApron = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.12, armFrontZ + 0.30, 2, 0.01), mats.woodMid);
    sideApron.position.set(ax, 0.72, (armFrontZ - 0.36) * 0.5);
    const armBar = new THREE.Mesh(new RoundedBoxGeometry(0.115, 0.085, armFrontZ + 0.44, 3, 0.018), mats.woodMid);
    armBar.position.set(ax, armY, (armFrontZ - 0.42) * 0.5);
    armBar.castShadow = true;
    throne.add(rearPost, frontPost, sideApron, armBar);

    const finial = new THREE.Group();
    finial.position.set(ax, armY - 0.01, armFrontZ + 0.03);
    const headBase = new THREE.Mesh(new THREE.SphereGeometry(isCenter ? 0.056 : 0.068, 10, 10), mats.woodMid);
    headBase.scale.set(0.95, 1.0, 1.15);
    finial.add(headBase);
    if (!isCenter) {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.028, 0.055), mats.woodLight);
      brow.position.set(0, 0.034, 0.035);
      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), mats.woodLight);
      snout.scale.set(1.05, 0.75, 0.95);
      snout.position.set(0, -0.018, 0.052);
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.026, 0.044), mats.woodDark);
      jaw.position.set(0, -0.054, 0.038);
      finial.add(brow, snout, jaw);
    }
    throne.add(finial);
  });

  return throne;
}

/** ★ V47 博物館級「72×56 超高解析一體成型古樟木開面神臉」
 *   - 眉弓、眼窩、挺拔鼻樑、鼻頭、鼻翼、人中、朱唇與下頷 100% 依球面 UV 精準座標一體雕刻於同一塊原木網格！
 *   - 徹底移除外掛分件鼻樑／鼻球，達成「臉、鼻子、眉毛」100% 像素級零穿幫貼合，正面／側面皆呈現細膩手雕木韻！
 *   - 左尊徹底取消嘟嘴凸起與唇下凹陰影，雕出古典溫婉舒展微含笑意之柔美神顏！
 */
function buildSculptedHeadV35(variant, mats) {
  const isCenter = variant === 'centerKing';
  const isLeft = variant === 'leftMother';
  const isRight = variant === 'rightBeardKing';
  const headR = isLeft ? 0.178 : isCenter ? 0.176 : 0.206;
  const headGroup = new THREE.Group();

  // ★ V47 升級 72×56 超高解析度球面（rotation.y = -PI/2：局部 +X 為正面、+Y 為上、±Z 為左右！）
  // 精確 UV 對應公式：ny = cos(canvasY / 1024 * PI)，nz = sin((canvasX - 512) / 1024 * 2*PI)
  const skullGeo = new THREE.SphereGeometry(headR, 72, 56);
  const posAttr = skullGeo.attributes.position;
  const tmpV = new THREE.Vector3();

  for (let i = 0; i < posAttr.count; i++) {
    tmpV.fromBufferAttribute(posAttr, i);
    const len = tmpV.length() || 1;
    const nx = tmpV.x / len; // front (+1 = 正面)
    const ny = tmpV.y / len; // up (+1 = 頭頂)
    const nz = tmpV.z / len; // side (±1 = 左右)
    const absSide = Math.abs(nz);

    let rScale = 1.0;
    if (nx > 0.20) {
      const fMask = Math.min(1, (nx - 0.20) / 0.42);

      // 1) 眉弓立體骨相（精準對齊彩繪眉毛 y=458..480 → ny=+0.155，左右跨距 nz=0.10..0.60！）
      const browArchY = isCenter ? (0.145 + absSide * 0.045) : (0.150 + Math.sin(Math.min(1, absSide / 0.55) * Math.PI) * 0.025);
      const brow = Math.exp(-Math.pow((ny - browArchY) / 0.068, 2)) * Math.exp(-Math.pow((absSide - 0.34) / 0.28, 2));
      rScale += brow * (isCenter ? 0.056 : isRight ? 0.046 : 0.024) * fMask;

      // 2) 深邃精緻眼窩凹槽（精準對齊彩繪雙眼 y=512, ex=512±62 → ny=0.000, nz=±0.370！）
      const eyeL = Math.exp(-Math.pow((nz - 0.365) / 0.165, 2));
      const eyeR = Math.exp(-Math.pow((nz + 0.365) / 0.165, 2));
      const eyeY = Math.exp(-Math.pow((ny - 0.005) / 0.088, 2));
      rScale -= (eyeL + eyeR) * eyeY * (isCenter ? 0.052 : isLeft ? 0.018 : 0.032) * fMask;

      // 2a) 柔和立體微凸眼瞼（令閉目與丹鳳眼皆具古木精雕玉潤弧度！）
      const lidY = Math.exp(-Math.pow((ny + 0.006) / 0.048, 2));
      const lidSide = Math.exp(-Math.pow((absSide - 0.365) / 0.125, 2));
      rScale += lidSide * lidY * (isLeft ? 0.016 : isRight ? 0.020 : 0.018) * fMask;

      // 3) ★ V47 一體精雕 3D 鼻樑、鼻尖與鼻翼（直接由臉面長出，100% 貼合零縫隙零穿幫零色差！）
      // 彩繪鼻樑位置：y=480 (ny=+0.098) → 鼻尖 y=578 (ny=-0.200) → 鼻底 y=596 (ny=-0.255)
      if (ny < 0.17 && ny > -0.30 && absSide < 0.28) {
        // 鼻樑由山根平順隆起至鼻尖（t=0 山根, t=1 鼻尖）
        const bridgeT = Math.max(0, Math.min(1, (0.115 - ny) / 0.315));
        const bridgeMask = Math.exp(-Math.pow((ny + 0.045) / 0.165, 2)) * (ny > -0.24 ? 1.0 : Math.exp(-Math.pow((ny + 0.24) / 0.032, 2)));
        const bridgeW = 0.074 + bridgeT * 0.028;
        const dorsal = Math.exp(-Math.pow(absSide / bridgeW, 2)) * bridgeMask * (0.28 + 0.72 * Math.pow(bridgeT, 0.85));
        rScale += dorsal * (isCenter ? 0.155 : isLeft ? 0.118 : 0.145) * fMask;

        // 精雕圓潤挺拔鼻頭 (ny=-0.202)
        const tipG = Math.exp(-Math.pow((ny + 0.202) / 0.058, 2)) * Math.exp(-Math.pow(absSide / 0.098, 2));
        rScale += tipG * (isCenter ? 0.112 : isLeft ? 0.088 : 0.110) * fMask;

        // 雙側精巧立體鼻翼 (ny=-0.218, nz=±0.105)
        const alaL = Math.exp(-Math.pow((nz - 0.105) / 0.052, 2));
        const alaR = Math.exp(-Math.pow((nz + 0.105) / 0.052, 2));
        const alaY = Math.exp(-Math.pow((ny + 0.218) / 0.044, 2));
        rScale += (alaL + alaR) * alaY * (isCenter ? 0.072 : isLeft ? 0.054 : 0.076) * fMask;

        // 鼻底與人中溫柔過渡凹微紋
        const subNasal = Math.exp(-Math.pow((ny + 0.278) / 0.030, 2)) * Math.exp(-Math.pow(absSide / 0.115, 2));
        rScale -= subNasal * (isLeft ? 0.012 : 0.022) * fMask;
      }

      // 4) 溫潤飽滿顴頰雕塑（★ V54 左尊臉頰微收瘦約 6%，清秀柔婉鵝蛋福相、不顯嬰兒肥！）
      const cheekL = Math.exp(-Math.pow((nz - 0.48) / 0.22, 2));
      const cheekR = Math.exp(-Math.pow((nz + 0.48) / 0.22, 2));
      const cheekY = Math.exp(-Math.pow((ny + (isLeft ? 0.17 : 0.14)) / 0.18, 2));
      rScale += (cheekL + cheekR) * cheekY * (isCenter ? 0.048 : isLeft ? 0.028 : 0.032) * fMask;

      // 5) ★ V47 精準對齊彩繪朱唇座標 (ny=-0.356..-0.408)：
      //    左尊改為清雅平緩微浮之古典櫻桃笑唇（徹底去除嘟嘴凸丘與下唇陡峭陰影！）
      const upperLip = Math.exp(-Math.pow((ny + 0.356) / 0.036, 2)) * Math.exp(-Math.pow(absSide / (isLeft ? 0.24 : 0.21), 2));
      const lipPart = Math.exp(-Math.pow((ny + 0.384) / 0.018, 2)) * Math.exp(-Math.pow(absSide / (isLeft ? 0.23 : 0.20), 2));
      const lowerLip = Math.exp(-Math.pow((ny + 0.412) / 0.038, 2)) * Math.exp(-Math.pow(absSide / (isLeft ? 0.22 : 0.19), 2));

      if (isLeft) {
        // 左尊：超柔和微浮古典美唇（絕不前凸嘟嘴！唇下完全平坦順滑過渡至下巴，零陰影發黑！）
        rScale += upperLip * 0.016 * fMask;
        rScale -= lipPart * 0.003 * fMask;
        rScale += lowerLip * 0.014 * fMask;
      } else if (isCenter) {
        // 中尊：俐落年輕型男俊唇
        rScale += upperLip * 0.034 * fMask;
        rScale -= lipPart * 0.012 * fMask;
        rScale += lowerLip * 0.030 * fMask;
        const chinDip = Math.exp(-Math.pow((ny + 0.485) / 0.052, 2)) * Math.exp(-Math.pow(absSide / 0.22, 2));
        rScale -= chinDip * 0.014 * fMask;
      } else {
        // 右尊：威嚴沉穩帝王唇
        rScale += upperLip * 0.026 * fMask;
        rScale -= lipPart * 0.010 * fMask;
        rScale += lowerLip * 0.022 * fMask;
        const chinDip = Math.exp(-Math.pow((ny + 0.485) / 0.052, 2)) * Math.exp(-Math.pow(absSide / 0.22, 2));
        rScale -= chinDip * 0.010 * fMask;
      }

      // 6) ★ V54 左尊「溫婉鵝蛋圓潤有福下巴＋雙頰微收瘦一點點」（保有福相圓潤下巴，同時讓臉頰更清秀優雅！）
      const chinY = isLeft ? 0.562 : 0.585;
      const chinW = isLeft ? 0.332 : isCenter ? 0.26 : 0.28;
      const chin = Math.exp(-Math.pow((ny + chinY) / 0.21, 2)) * Math.exp(-Math.pow(absSide / chinW, 2));
      rScale += chin * (isCenter ? 0.056 : isLeft ? 0.042 : 0.040) * fMask;
      if (isLeft) {
        const smoothUnderLip = Math.exp(-Math.pow((ny + 0.48) / 0.14, 2)) * Math.exp(-Math.pow(absSide / 0.30, 2));
        rScale += smoothUnderLip * 0.016 * fMask;
        const fortuneJawL = Math.exp(-Math.pow((nz - 0.32) / 0.22, 2));
        const fortuneJawR = Math.exp(-Math.pow((nz + 0.32) / 0.22, 2));
        const fortuneJawY = Math.exp(-Math.pow((ny + 0.45) / 0.21, 2));
        rScale += (fortuneJawL + fortuneJawR) * fortuneJawY * 0.014 * fMask;
      }
    }

    // 太陽穴與下顎兩側修型（V54 左尊臉頰微收柔美鵝蛋線條、中尊清俊俐落型男下顎！）
    if (ny < -0.14 && absSide > (isLeft ? 0.40 : 0.35)) {
      const sideStart = isLeft ? 0.40 : 0.35;
      const jawTaper = Math.min(1, (absSide - sideStart) / 0.45) * Math.min(1, (-ny - 0.14) / 0.46);
      rScale -= jawTaper * (isCenter ? 0.050 : isLeft ? 0.032 : 0.034);
    }

    tmpV.multiplyScalar(rScale);
    posAttr.setXYZ(i, tmpV.x, tmpV.y, tmpV.z);
  }
  skullGeo.computeVertexNormals();

  const skull = new THREE.Mesh(skullGeo, mats.face);
  const depthScale = isCenter ? 1.00 : isLeft ? 0.98 : 0.96;
  const heightScale = isCenter ? 1.13 : isLeft ? 1.09 : 1.08;
  const widthScale = isCenter ? 0.86 : isLeft ? 0.880 : 0.95;
  skull.scale.set(depthScale, heightScale, widthScale);
  skull.rotation.y = -Math.PI / 2;
  skull.castShadow = !isLeft;
  // ★ V54 左尊臉部不接收頭巾／珠簾投射陰影，徹底消除左臉發暗，全臉均勻溫潤明亮！
  skull.receiveShadow = !isLeft;
  headGroup.add(skull);

  // ★ V54 博物館級 9 分件解剖木雕垂珠福耳（細緻外耳輪＋耳輪腳＋Y 型對耳輪＋耳甲腔＋耳屏／對耳屏切跡＋飽滿福耳垂！）
  const earXRatio = widthScale - 0.025;
  [-1, 1].forEach((s) => {
    const earG = new THREE.Group();
    earG.position.set(s * (headR * earXRatio), -headR * 0.025, headR * 0.018);
    earG.rotation.y = s * (isCenter ? -0.34 : -0.28);
    earG.rotation.z = s * -0.04;

    // 1) 薄而修長的耳殼底片（平貼顳側絕不厚重突出）
    const pinnaBack = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.215, 16, 14), mats.woodSkin);
    pinnaBack.scale.set(0.28, 1.42, 0.72);
    pinnaBack.position.set(s * headR * 0.048, -headR * 0.02, -headR * 0.022);

    // 2) 精雕流線外耳輪（由耳輪腳自然繞頂、順後緣滑入飽滿福耳垂！）
    const helixCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * headR * 0.055, headR * 0.055, headR * 0.092),
      new THREE.Vector3(s * headR * 0.030, headR * 0.205, headR * 0.078),
      new THREE.Vector3(s * headR * 0.130, headR * 0.300, headR * 0.032),
      new THREE.Vector3(s * headR * 0.208, headR * 0.165, -headR * 0.012),
      new THREE.Vector3(s * headR * 0.198, -headR * 0.090, 0.002),
      new THREE.Vector3(s * headR * 0.132, -headR * 0.295, headR * 0.038),
      new THREE.Vector3(s * headR * 0.032, -headR * 0.345, headR * 0.070)
    ]);
    const helix = new THREE.Mesh(new THREE.TubeGeometry(helixCurve, 26, headR * 0.038, 9, false), mats.woodSkin);

    // 3) 柔和凹陷耳甲腔與舟狀窩（立體受光不顯黑洞！）
    const concha = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.128, 14, 12), mats.woodEarHollow);
    concha.scale.set(0.36, 1.24, 0.56);
    concha.position.set(s * headR * 0.072, -headR * 0.025, headR * 0.048);

    // 4) Y 型雙叉對耳輪（主稜＋上腳分叉，展現精細人耳雕刻層次！）
    const antiMain = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * headR * 0.095, headR * 0.185, headR * 0.068),
      new THREE.Vector3(s * headR * 0.145, headR * 0.035, headR * 0.058),
      new THREE.Vector3(s * headR * 0.115, -headR * 0.135, headR * 0.076),
      new THREE.Vector3(s * headR * 0.078, -headR * 0.195, headR * 0.088)
    ]);
    const antiHelix = new THREE.Mesh(new THREE.TubeGeometry(antiMain, 16, headR * 0.024, 7, false), mats.woodSkin);

    const antiCrus = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * headR * 0.132, headR * 0.085, headR * 0.064),
      new THREE.Vector3(s * headR * 0.072, headR * 0.145, headR * 0.082)
    ]);
    const antiUpper = new THREE.Mesh(new THREE.TubeGeometry(antiCrus, 8, headR * 0.019, 6, false), mats.woodSkin);

    // 5) 精緻耳屏與對耳屏（精準勾勒人耳前側切跡！）
    const tragus = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.044, 10, 8), mats.woodSkin);
    tragus.scale.set(0.58, 1.24, 0.72);
    tragus.position.set(s * headR * 0.024, -headR * 0.082, headR * 0.106);

    const antiTragus = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.036, 9, 8), mats.woodSkin);
    antiTragus.scale.set(0.60, 0.92, 0.68);
    antiTragus.position.set(s * headR * 0.078, -headR * 0.192, headR * 0.090);

    // 6) 溫潤飽滿古典福耳垂
    const earLobe = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.108, 14, 12), mats.woodSkin);
    earLobe.scale.set(0.56, 1.26, 0.74);
    earLobe.position.set(s * headR * 0.088, -headR * 0.305, headR * 0.056);

    earG.add(pinnaBack, helix, concha, antiHelix, antiUpper, tragus, antiTragus, earLobe);
    headGroup.add(earG);
  });

  return { headGroup, headR };
}

/** ★ V38 擬真解剖曲線車旋玉頸（鎖骨斜方肌基座 → 修長收束頸中段 → 柔和銜接下頷咽喉，徹底告別生硬直圓柱！） */
function buildSculptedNeckV38(mats, opts = {}) {
  const {
    baseY = 1.56,
    height = 0.32,
    rBase = 0.128,
    rMid = 0.078,
    rTop = 0.094,
    zPos = 0.028
  } = opts;
  const pts = [
    new THREE.Vector2(rBase * 1.12, 0.00),
    new THREE.Vector2(rBase, height * 0.16),
    new THREE.Vector2(rMid * 1.08, height * 0.34),
    new THREE.Vector2(rMid, height * 0.56),
    new THREE.Vector2(rMid * 1.04, height * 0.78),
    new THREE.Vector2(rTop, height * 0.94),
    new THREE.Vector2(rTop * 0.96, height)
  ];
  const neckMesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), mats.woodSkin);
  neckMesh.scale.set(1.03, 1.0, 0.93);
  neckMesh.position.set(0, baseY, zPos);
  neckMesh.castShadow = true;
  return neckMesh;
}

/** ★ V50 一體成型精雕神手 GLB 模型載入器與單例快取（方案 A：以真實單塊無縫雕塑 3D 網格徹底取代程式管球拼裝手！） */
const _deityHandGlbLoaderV50 = new GLTFLoader();
const _deityHandGeomCacheV50 = { rest: null, grip: null };
const _deityHandLoadPromisesV50 = { rest: null, grip: null };

function loadDeityHandGlbGeomV50(pose) {
  const key = pose === 'grip' ? 'grip' : 'rest';
  if (_deityHandGeomCacheV50[key]) return Promise.resolve(_deityHandGeomCacheV50[key]);
  if (!_deityHandLoadPromisesV50[key]) {
    const url = `./assets/models/deity_hand_${key}.glb?v=20261127v54`;
    _deityHandLoadPromisesV50[key] = new Promise((resolve) => {
      _deityHandGlbLoaderV50.load(
        url,
        (gltf) => {
          let geom = null;
          gltf.scene.traverse((obj) => {
            if (!geom && obj.isMesh && obj.geometry) geom = obj.geometry;
          });
          _deityHandGeomCacheV50[key] = geom;
          resolve(geom);
        },
        undefined,
        (err) => {
          console.warn(`[DeitiesV50] GLB hand load fallback (${key}):`, err?.message || err);
          resolve(null);
        }
      );
    });
  }
  return _deityHandLoadPromisesV50[key];
}

// 模組載入即同步預載雙手精雕 GLB，並掛載全域就緒旗標供渲染確認
const _allDeityHandsReadyV50 = Promise.all([
  loadDeityHandGlbGeomV50('rest'),
  loadDeityHandGlbGeomV50('grip')
]).then((res) => {
  if (typeof window !== 'undefined') window.__deciHandsGlbReady = Boolean(res[0] && res[1]);
  return res;
});
export function waitForDeityHandModelsV50() {
  return _allDeityHandsReadyV50;
}

/** ★ V50 方案 A：以「一體成型無縫雕塑木雕手 .glb」掛載神像雙手（自動套用各尊古樟木 skin 材質、零接縫指蹼與自然關節！） */
function buildSculptedHandV35(mats, pose = 'rest', handScale = 1.0) {
  const key = pose === 'grip' ? 'grip' : 'rest';
  const hand = new THREE.Group();
  hand.name = `deity_hand_glb_${key}`;

  const mountGlbMesh = (geom) => {
    while (hand.children.length > 0) hand.remove(hand.children[0]);
    const mesh = new THREE.Mesh(geom, mats.woodSkin);
    mesh.userData.glbHandPose = key;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    hand.add(mesh);
  };

  if (_deityHandGeomCacheV50[key]) {
    mountGlbMesh(_deityHandGeomCacheV50[key]);
  } else {
    // 預載完成前僅佔位，數十毫秒載完 GLB 立即無縫替換為一體雕塑手模型
    const placeholder = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), mats.woodSkin);
    hand.add(placeholder);
    loadDeityHandGlbGeomV50(key).then((geom) => {
      if (geom) mountGlbMesh(geom);
    });
  }

  if (handScale !== 1.0) hand.scale.setScalar(handScale);
  return hand;
}

/** 精雕雙層漢服 V 型交領與服貼柔和連肩雲肩（支援 skipYoke 讓左尊以專屬五瓣金色披肩流蘇取代素色胸罩！） */
function addEmbroideredCollarAndShawl(g, yCollar, scaleW, sleeveMat, trimMat, innerSilkMat, skipYoke = false) {
  if (!skipYoke) {
    // 柔和貼胸收邊之刺繡雲肩
    const yokePts = [
      new THREE.Vector2(0.32 * scaleW, 0.00),
      new THREE.Vector2(0.37 * scaleW, 0.05),
      new THREE.Vector2(0.35 * scaleW, 0.14),
      new THREE.Vector2(0.24 * scaleW, 0.22),
      new THREE.Vector2(0.115 * scaleW, 0.25)
    ];
    const yoke = new THREE.Mesh(new THREE.LatheGeometry(yokePts, 28), sleeveMat);
    yoke.scale.set(1.12, 1.0, 0.80);
    yoke.position.set(0, yCollar - 0.23, -0.015);
    yoke.castShadow = true;
    g.add(yoke);
  }

  // 圓領後頸立領基座
  const innerCollar = new THREE.Mesh(new THREE.TorusGeometry(0.114 * scaleW, 0.017, 8, 22), innerSilkMat);
  innerCollar.rotation.x = Math.PI / 2;
  innerCollar.position.set(0, yCollar + 0.020, 0.025);
  const outerCollar = new THREE.Mesh(new THREE.TorusGeometry(0.132 * scaleW, 0.022, 10, 24), trimMat);
  outerCollar.rotation.x = Math.PI / 2;
  outerCollar.position.set(0, yCollar - 0.004, 0.025);
  g.add(innerCollar, outerCollar);

  // ★ V38 傳統漢服 V 型交領右衽斜襟（內層白綢中衣領＋外層金線刺繡領緣，細緻包裹頸根！）
  [-1, 1].forEach((s) => {
    const innerV = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.105 * scaleW, yCollar + 0.022, 0.055),
      new THREE.Vector3(s * 0.072 * scaleW, yCollar - 0.038, 0.165),
      new THREE.Vector3(s * -0.012, yCollar - 0.115, 0.222)
    ]);
    const outerV = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.128 * scaleW, yCollar + 0.006, 0.058),
      new THREE.Vector3(s * 0.095 * scaleW, yCollar - 0.056, 0.174),
      new THREE.Vector3(s * -0.016, yCollar - 0.145, 0.236)
    ]);
    g.add(
      new THREE.Mesh(new THREE.TubeGeometry(innerV, 12, 0.015, 8, false), innerSilkMat),
      new THREE.Mesh(new THREE.TubeGeometry(outerV, 12, 0.020, 8, false), trimMat)
    );
  });
}

/**
 * ★ V38 左側神明頭冠上方「小紅帽造型 3 角型黃色刺繡頭巾／帽巾」（優雅拱覆於雙鳳珠簾冠上方，頂部呈鮮明柔角三角尖頂、前緣飾紅金萬字錦繡滾邊並自然垂披雙肩！）
 */
function buildMazuEmbroideredHoodV38(mats) {
  const hoodGrp = new THREE.Group();

  // 以 4 道從前緣 (v=0) 至後方垂披下擺 (v=1) 的對稱 3D 骨架曲線放樣，確保完美三角小紅帽剪影且 100% 避開鳳冠與椅背！
  const buildFullRow = (rightHalfPts) => {
    const pts = [];
    for (let i = rightHalfPts.length - 1; i >= 1; i--) {
      const p = rightHalfPts[i];
      pts.push(new THREE.Vector3(-p[0], p[1], p[2]));
    }
    for (let i = 0; i < rightHalfPts.length; i++) {
      const p = rightHalfPts[i];
      pts.push(new THREE.Vector3(p[0], p[1], p[2]));
    }
    return new THREE.CatmullRomCurve3(pts);
  };

  // ★ V45 前緣面框與肩披全面寬展外覆（配合拉長身形與寬肩，下緣流暢外張至 x=±0.60 完整披覆於寬肩衣服之外，100% 零破圖！）
  const row0 = buildFullRow([
    [0.00, 2.625, 0.258],
    [0.136, 2.495, 0.264],
    [0.264, 2.335, 0.260],
    [0.305, 2.040, 0.216],
    [0.395, 1.760, 0.175],
    [0.575, 1.505, 0.145]
  ]);

  // Row 1 (v = 0.36 頭冠頂部與寬肩外側平滑覆蓋於衣服之外)
  const row1 = buildFullRow([
    [0.00, 2.598, -0.015],
    [0.152, 2.458, -0.025],
    [0.292, 2.285, -0.035],
    [0.352, 1.975, -0.050],
    [0.455, 1.725, -0.035],
    [0.610, 1.485, -0.020]
  ]);

  // Row 2 (v = 0.72 頭冠後方與寬肩後緣外覆，嚴格位於衣服與雙臂外側！)
  const row2 = buildFullRow([
    [0.00, 2.330, -0.245],
    [0.146, 2.245, -0.238],
    [0.278, 2.115, -0.220],
    [0.355, 1.880, -0.205],
    [0.475, 1.675, -0.180],
    [0.595, 1.470, -0.155]
  ]);

  // Row 3 (v = 1.00 背後披肩下擺，嚴格位於寬背衣外 z=-0.315、椅背 z=-0.385 之前，零穿幫！)
  const row3 = buildFullRow([
    [0.00, 1.625, -0.315],
    [0.135, 1.595, -0.310],
    [0.268, 1.560, -0.298],
    [0.385, 1.525, -0.280],
    [0.490, 1.490, -0.258],
    [0.575, 1.455, -0.228]
  ]);

  const segU = 42;
  const segV = 22;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let iu = 0; iu <= segU; iu++) {
    const u = iu / segU;
    const nx = u * 2 - 1;
    const p0 = row0.getPointAt(u);
    const p1 = row1.getPointAt(u);
    const p2 = row2.getPointAt(u);
    const p3 = row3.getPointAt(u);
    const colCurve = new THREE.CatmullRomCurve3([p0, p1, p2, p3]);

    for (let iv = 0; iv <= segV; iv++) {
      const v = iv / segV;
      const pt = colCurve.getPointAt(v);
      // 細緻絲緞垂墜波褶（自前緣向後方漸次展開）
      const drapeFold = Math.sin(nx * Math.PI * 6.0) * 0.011 * Math.sin(v * Math.PI) * (0.35 + Math.abs(nx) * 0.65);
      positions.push(pt.x, pt.y, pt.z + drapeFold);
      // ★ 注意 CanvasTexture flipY = true：v=0 前緣必須對應 UV v=1.0 才會呈現頂部紅金萬字錦繡滾邊！
      uvs.push(u, 1.0 - v);
    }
  }

  const colStride = segV + 1;
  for (let iu = 0; iu < segU; iu++) {
    for (let iv = 0; iv < segV; iv++) {
      const a = iu * colStride + iv;
      const b = a + 1;
      const c = (iu + 1) * colStride + iv;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const hoodMesh = new THREE.Mesh(geo, mats.yellowHood);
  // ★ V54 關閉頭巾投射陰影，徹底消除左側神明左臉陰影過暗問題！
  hoodMesh.castShadow = false;
  hoodMesh.receiveShadow = true;
  hoodGrp.add(hoodMesh);

  // 前緣立體金絲細滾邊條（強化小紅帽三角帽簷立體廓形！）
  const frontPiping = new THREE.Mesh(new THREE.TubeGeometry(row0, 44, 0.011, 8, false), mats.brightGold);
  frontPiping.castShadow = false;
  hoodGrp.add(frontPiping);

  return hoodGrp;
}

/**
 * ★ V40.2 左側神明（天上聖母）「內層富麗金色如意繡花披肩＋璀璨密織金珠流蘇」
 *   完整披覆於胸肩外側 (z = 0.27..0.322)，並嚴格位於白珍珠長項鍊 (z = 0.34..0.38) 與朱紅交叉飄帶之【裡面】，華貴耀眼且零遮埋！
 */
function buildMazuGoldShawlV40(mats) {
  const shawlGrp = new THREE.Group();

  // 1) ★ V44 自然人體肩胸曲線「五瓣如意金色雲肩披肩」（平滑貼合柔美斜肩與鎖骨弧度，徹底消除僵硬圓錐燈罩與頸下黑縫！）
  const segU = 52;
  const segV = 20;
  const positions = [];
  const uvs = [];
  const indices = [];
  const hemPts = [];

  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV; // 0 = 下巴下方柔貼頸根圓形領口, 1 = 胸肩五瓣金波浪下緣
    // S 曲線柔順貼合人體頸根 → 圓潤自然斜肩鎖骨 → 垂貼胸前
    const radEase = Math.sin(v * Math.PI * 0.5);
    const dropEase = Math.pow(v, 1.18);
    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const ang = (u - 0.5) * Math.PI * 1.66; // 圓融圍繞整圈頸部直下雙肩與胸前（無任何三角 V 領！）
      const sinA = Math.sin(ang);
      const cosA = Math.cos(ang);
      const sideW = Math.abs(sinA);
      const lobe = 0.5 + 0.5 * Math.cos(ang * 4.5);
      const dropLobe = (0.048 * lobe) * Math.pow(v, 1.35);

      const rX = 0.105 + radEase * 0.326;
      const rZ = 0.100 + Math.pow(v, 0.72) * 0.180 + Math.max(0, cosA) * 0.015 * v;
      const zCenter = 0.038 * (1 - v) - 0.004 * v;
      const x = sinA * rX;
      const z = zCenter + cosA * rZ;
      // ★ V45 配合拉長端莊身形，將圓領柔升至下巴下方 y=1.662，令身體比例修長貼近臉龐、徹底告別長脖子！
      const shoulderRound = Math.sin(v * Math.PI) * (0.014 + sideW * 0.018);
      const y = 1.662 + shoulderRound - dropEase * (0.258 - sideW * 0.022) - dropLobe;

      positions.push(x, y, z);
      uvs.push(u * 2.2, 1.0 - v);
      if (iv === segV) {
        hemPts.push(new THREE.Vector3(x, y, z));
      }
    }
  }
  const stride = segU + 1;
  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * stride + iu;
      const b = a + 1;
      const c = (iv + 1) * stride + iu;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const capeMesh = new THREE.Mesh(geo, mats.goldShawlMat);
  capeMesh.castShadow = true;
  shawlGrp.add(capeMesh);

  // ★ V45 柔貼軟綢圓形無領貼頸滾邊（緊貼飽滿鵝蛋下巴下方 y=1.662！）
  const roundNeckRim = new THREE.Mesh(new THREE.TorusGeometry(0.106, 0.0082, 10, 28), mats.goldFoil);
  roundNeckRim.rotation.x = Math.PI / 2;
  roundNeckRim.scale.set(1.0, 0.96, 1.0);
  roundNeckRim.position.set(0, 1.662, 0.038);
  shawlGrp.add(roundNeckRim);
  for (let b = 0; b < 22; b++) {
    const ba = (b / 22) * Math.PI * 2;
    const nBead = new THREE.Mesh(new THREE.SphereGeometry(0.0068, 6, 5), mats.shinyGoldFoil);
    nBead.position.set(Math.sin(ba) * 0.115, 1.654, 0.038 + Math.cos(ba) * 0.111);
    shawlGrp.add(nBead);
  }

  // 2) 五瓣如意波浪邊緣粗亮金絲滾邊＋中層金線祥雲飾帶＋璀璨金箔蓮花胸徽！
  const hemCurve = new THREE.CatmullRomCurve3(hemPts);
  const hemPipe = new THREE.Mesh(new THREE.TubeGeometry(hemCurve, 60, 0.0135, 8, false), mats.goldFoil);
  shawlGrp.add(hemPipe);

  // 披肩上層環胸金線雕飾弧線（令金色披肩於珍珠項鍊上方一眼辨識！）
  const midTrimPts = [];
  for (let k = 0; k <= 24; k++) {
    const a = ((k / 24) - 0.5) * Math.PI * 1.10;
    midTrimPts.push(new THREE.Vector3(Math.sin(a) * 0.295, 1.522 - Math.cos(a) * 0.024, 0.005 + Math.cos(a) * 0.232));
  }
  shawlGrp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(midTrimPts), 32, 0.0082, 6, false), mats.goldFoil));

  // 五瓣花心各鑲嵌璀璨金箔圓徽＋翠玉／金珠
  [-0.78, -0.38, 0, 0.38, 0.78].forEach((ang, idx) => {
    const mx = Math.sin(ang) * 0.305;
    const mz = 0.006 + Math.cos(ang) * 0.264;
    const my = 1.468 - (idx === 2 ? 0.018 : 0);
    const medal = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.027, 0.010, 14), mats.goldFoil);
    medal.rotation.set(Math.PI / 2 - 0.18, 0, -ang * 0.55);
    medal.position.set(mx, my, mz);
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), idx === 2 ? mats.emeraldJade : mats.brightGold);
    gem.position.set(mx, my, mz + 0.008);
    shawlGrp.add(medal, gem);
  });

  // 3) 披肩下緣垂墜「華麗密織金色流蘇＋金珠頭尾墜鈴」（37 道飽滿閃亮金流蘇，清楚透現於白珍珠項鍊與朱紅飄帶之內側！）
  const tasselTopGeo = new THREE.SphereGeometry(0.0105, 7, 6);
  const tasselBotGeo = new THREE.ConeGeometry(0.010, 0.026, 6);
  for (let i = 0; i < 37; i++) {
    const t = 0.14 + (i / 36) * 0.72;
    const p = hemCurve.getPointAt(t);
    const centerBias = 1.0 - Math.abs(t - 0.5) * 1.60;
    const len = 0.275 + Math.max(0, centerBias) * 0.105;
    const zPush = 0.006 + Math.max(0, centerBias) * 0.010;

    const topCap = new THREE.Mesh(tasselTopGeo, mats.goldFoil);
    topCap.position.set(p.x, p.y - 0.004, p.z + 0.005);

    const cordCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(p.x, p.y - 0.006, p.z + 0.004),
      new THREE.Vector3(p.x * 1.01, p.y - len * 0.50, p.z + zPush),
      new THREE.Vector3(p.x * 1.015, p.y - len, p.z + zPush * 0.85)
    ]);
    const cord = new THREE.Mesh(
      new THREE.TubeGeometry(cordCurve, 6, 0.0062, 5, false),
      i % 2 === 0 ? mats.goldFoil : mats.brightGold
    );

    const endBead = new THREE.Mesh(tasselBotGeo, mats.goldFoil);
    endBead.rotation.x = Math.PI;
    endBead.position.set(p.x * 1.015, p.y - len - 0.010, p.z + zPush * 0.85);

    shawlGrp.add(topCap, cord, endBead);
  }

  return shawlGrp;
}

/**
 * ★ V44 中間神明（中壇元帥）「威武寬肩立體五瓣如意雲肩披肩＋披於衣外之垂墜戰袍披風」
 *   雲肩與披風皆嚴格浮披於衣服、寬肩與雙臂之外側（+0.035 外擴間隙零破圖！），披風垂落背後並嚴格位於太師椅背 z=-0.385 前方！
 */
function buildMarshalCloudShawlV43(mats) {
  const grp = new THREE.Group();
  const segU = 56;
  const segV = 16;
  const positions = [];
  const uvs = [];
  const indices = [];
  const hemPts = [];

  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV; // 0 = 領根, 1 = 寬肩雲肩花瓣下緣
    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const ang = (u - 0.5) * Math.PI * 1.84; // 完整包覆寬肩、前胸與上背
      const sinA = Math.sin(ang);
      const cosA = Math.cos(ang);
      const sideBias = Math.abs(sinA);
      const frontSuppress = 1.0 - 0.45 * Math.exp(-Math.pow(ang / 0.42, 2));
      const petalWave = (0.5 + 0.5 * Math.cos(ang * 5.0)) * frontSuppress;
      const dropLobe = (0.038 + sideBias * 0.024) * petalWave * Math.pow(v, 1.15);

      // ★ V46 順滑優雅覆肩武將雲肩披肩（自然圓順貼覆雙肩與上臂上方，收柔外緣曲線消除折角，100% 零破圖！）
      const rX = 0.122 + Math.sin(v * Math.PI * 0.5) * 0.435 + sideBias * 0.016 * Math.sin(v * Math.PI);
      const rZ = 0.118 + Math.sin(v * Math.PI * 0.5) * 0.178 + sideBias * 0.032 * Math.sin(v * Math.PI);
      const zCenter = 0.024 * (1 - v) - 0.002 * v;
      const x = sinA * rX;
      const z = zCenter + cosA * rZ;
      const shoulderArch = Math.sin(v * Math.PI) * (0.028 + sideBias * 0.062);
      const y = 1.592 + shoulderArch - Math.pow(v, 1.30) * (0.142 + sideBias * 0.056) - dropLobe * 0.85;

      positions.push(x, y, z);
      uvs.push(u * 2.2, 1.0 - v);
      if (iv === segV) hemPts.push(new THREE.Vector3(x, y, z));
    }
  }
  const stride = segU + 1;
  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * stride + iu;
      const b = a + 1;
      const c = (iv + 1) * stride + iu;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const shawlMesh = new THREE.Mesh(geo, mats.marshalShawlMat);
  shawlMesh.castShadow = true;
  grp.add(shawlMesh);

  const hemCurve = new THREE.CatmullRomCurve3(hemPts);
  grp.add(new THREE.Mesh(new THREE.TubeGeometry(hemCurve, 64, 0.0120, 8, false), mats.shinyGoldFoil));
  const beadGeo = new THREE.SphereGeometry(0.0082, 7, 6);
  const dropGeo = new THREE.ConeGeometry(0.0065, 0.017, 6);
  for (let i = 4; i <= segU - 4; i += 3) {
    const p = hemPts[i];
    if (p.z < -0.02) continue;
    const isFrontCenter = Math.abs(p.x) < 0.11;
    const dropLen = isFrontCenter ? 0.013 : 0.024;
    const bead = new THREE.Mesh(beadGeo, mats.shinyGoldFoil);
    bead.position.set(p.x, p.y - 0.007, p.z + 0.006);
    const tip = new THREE.Mesh(dropGeo, mats.goldFoil);
    tip.rotation.x = Math.PI;
    tip.position.set(p.x, p.y - dropLen - 0.005, p.z + 0.007);
    grp.add(bead, tip);
  }
  return grp;
}

/**
 * ★ V44 中間神明（中壇元帥）「威武朱紅金邊垂肩戰袍披風」
 *   由雲肩後方與雙肩外側流暢披掛於戰袍衣服之外側並垂落身後，嚴格留白避開軀幹 (zBack=-0.26)、雙臂與椅背 (z=-0.385)，任何視角皆 100% 零破圖！
 */
function buildMarshalBackCapeV44(mats) {
  const capeGrp = new THREE.Group();
  const segU = 36;
  const segV = 20;
  const positions = [];
  const uvs = [];
  const indices = [];
  const leftEdge = [];
  const rightEdge = [];

  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV; // 0 = 雙肩雲肩頂下垂起點, 1 = 椅座上方披風下擺
    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU; // 0 = 觀者左側 (-X), 1 = 觀者右側 (+X)
      const nx = u * 2 - 1; // -1..+1
      // ★ V46 柔順收於太師椅扶手內側 (halfW <= 0.475) 之絲綢武將披風，絕不穿過椅子或扶手！
      const halfW = 0.340 + Math.sin(v * Math.PI * 0.5) * 0.132;
      const x = nx * halfW;
      const wingWrap = Math.pow(Math.abs(nx), 2.1) * (0.105 - v * 0.030);
      const backDepth = -0.282 - (1 - Math.pow(Math.abs(nx), 1.6)) * (0.036 + v * 0.034);
      const pleat = Math.sin(nx * Math.PI * 4.0) * 0.012 * Math.pow(v, 0.90);
      const z = backDepth + wingWrap + pleat;
      const y = 1.505 - Math.abs(nx) * 0.024 - v * 0.895;

      positions.push(x, y, z);
      uvs.push(u, 1.0 - v);
      if (iu === 0) leftEdge.push(new THREE.Vector3(x, y, z));
      if (iu === segU) rightEdge.push(new THREE.Vector3(x, y, z));
    }
  }
  const stride = segU + 1;
  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * stride + iu;
      const b = a + 1;
      const c = (iv + 1) * stride + iu;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const capeMesh = new THREE.Mesh(geo, mats.crimsonCape);
  capeMesh.castShadow = true;
  capeGrp.add(capeMesh);

  // 披風兩側垂緣精細閃亮金鉑滾邊
  capeGrp.add(
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(leftEdge), 24, 0.0085, 6, false), mats.shinyGoldFoil),
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rightEdge), 24, 0.0085, 6, false), mats.shinyGoldFoil)
  );
  return capeGrp;
}

/**
 * ★ V48 右側神明（鎮殿王爺）「貼肩垂背柔順真髮長髮幕」（已依意見移除披肩，保留 1024px 高清直梳真髮絲貼圖＋羽化柔美髮尾，自然貼披於黑金龍袍雙肩與深紅披風之間！）
 */
function buildWangYeLongBackHairV43(mats) {
  const hairGrp = new THREE.Group();
  const segU = 56;
  const segV = 30;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV; // 0 = 冠下雙耳後髮根 (y=2.045), 1 = 垂落上背羽化髮尾 (y=1.20)
    const neckPhase = Math.min(1, v / 0.38);
    const shoulderPhase = Math.max(0, (v - 0.30) / 0.70);
    const shoulderEase = shoulderPhase * shoulderPhase * (3 - 2 * shoulderPhase);

    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU; // 0..1 由左耳後繞後腦至右耳後
      const ang = (u - 0.5) * Math.PI * 1.14; // -102°..+102° 服貼雙耳後與後腦自然披落肩背
      const sinA = Math.sin(ang);
      const cosA = Math.cos(ang); // 1 = 正後方, <0 = 雙耳側前緣
      const sideBias = Math.abs(sinA);

      // 耳頸貼順 (0.196..0.242) → 遇自然寬肩後柔順外展至 0.468（貼合黑金龍袍肩背，絕不浮空亦不穿椅背！）
      const rX = 0.196 + neckPhase * 0.046 + shoulderEase * 0.226;
      const rZBack = 0.160 + neckPhase * 0.048 + shoulderEase * 0.148;
      const x = sinA * rX;
      const frontDrapeZ = Math.max(0, -cosA) * (0.032 + shoulderEase * 0.082);
      const zBase = 0.024 * (1 - v) - 0.018 * v;
      let z = zBase - Math.max(0, cosA) * rZBack + frontDrapeZ;
      z = Math.max(-0.360, z);

      // 細緻立體直梳髮絲波紋（讓 1024px 高清絲光與凹凸貼圖隨光影呈現真實髮質感！）
      const strandRipple = (
        Math.sin(u * Math.PI * 20.0) * 0.0062 +
        Math.cos(u * Math.PI * 38.0) * 0.0026
      ) * Math.sin(v * Math.PI) * (0.45 + 0.55 * sideBias);
      const zFinal = z + strandRipple;

      // 羽化自然層次髮尾（柔美參差波浪收尾！）
      const featherEdge = (
        0.13 * Math.pow(sideBias, 1.35) +
        Math.sin(u * Math.PI * 16.0) * 0.024 * Math.pow(v, 1.45) +
        Math.cos(u * Math.PI * 26.0) * 0.012 * Math.pow(v, 1.75)
      );
      const y = 2.045 - Math.pow(v, 1.03) * (0.84 - featherEdge);

      positions.push(x, y, zFinal);
      uvs.push(u * 2.5, 1.0 - v);
    }
  }

  const stride = segU + 1;
  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * stride + iu;
      const b = a + 1;
      const c = (iv + 1) * stride + iu;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const hairCurtain = new THREE.Mesh(geo, mats.silkyHair);
  hairCurtain.castShadow = true;
  hairGrp.add(hairCurtain);

  const innerCurtain = hairCurtain.clone();
  innerCurtain.scale.set(0.984, 0.992, 0.984);
  innerCurtain.position.set(0, -0.004, 0.006);
  hairGrp.add(innerCurtain);

  return hairGrp;
}

/**
 * ★ V40 右側神明「完全貼合臉龐之耳旁滿面長落腮鬍＋三層立體流瀑帝王長髯」
 *   新增貼面連腮鬚根內襯殼，且全數 56 股 3D 漸細絲滑垂鬚精準沿臉頰／下顎曲面貼合生長，任何正／側／3/4 視角皆零懸空、零穿幫！
 */
function buildVolumetricRoyalBeardV38(mats) {
  const beardGroup = new THREE.Group();

  // 0) 緊貼黑面下臉頰、耳前鬢角與下顎線之 3D 雕塑鬚根包覆殼（100% 消除側視臉與鬍鬚間空隙！）
  const headR = 0.206;
  const jawShellGeo = new THREE.SphereGeometry(headR * 1.016, 28, 22, -Math.PI * 0.54, Math.PI * 1.08, Math.PI * 0.44, Math.PI * 0.54);
  const jawPos = jawShellGeo.attributes.position;
  const jv = new THREE.Vector3();
  for (let i = 0; i < jawPos.count; i++) {
    jv.fromBufferAttribute(jawPos, i);
    // 僅覆蓋雙耳前方至下巴與唇下（避開上眼、鼻樑與兩耳後方！）
    const nLen = jv.length() || 1;
    const nx = jv.x / nLen; // +1 = 正面
    const ny = jv.y / nLen; // -1 = 下巴
    const nz = Math.abs(jv.z / nLen);
    // 在臉正中上顎處向下避開鼻翼與眼睛，兩側耳前順上延伸至鬢角
    if (nx > 0.65 && ny > -0.20 && nz < 0.58) {
      jv.y -= (ny + 0.20) * headR * 0.85;
    }
    jawPos.setXYZ(i, jv.x, jv.y, jv.z);
  }
  jawShellGeo.computeVertexNormals();
  const jawBeardShell = new THREE.Mesh(jawShellGeo, mats.beardMat);
  jawBeardShell.scale.set(0.955, 1.085, 0.995);
  jawBeardShell.rotation.y = -Math.PI / 2;
  jawBeardShell.position.set(0, 1.936, 0.040);
  beardGroup.add(jawBeardShell);

  // 輔助：計算精準貼合王爺頭顱橢球表面 (center=(0,1.94,0.04), rx=0.194, ry=0.222, rz=0.202) 之 Z 座標
  const faceZ = (x, y, pad = 0.005) => {
    const u = (x / 0.194) * (x / 0.194) + ((y - 1.94) / 0.222) * ((y - 1.94) / 0.222);
    const rem = Math.max(0.02, 1.0 - u);
    return 0.04 + 0.202 * Math.sqrt(rem) + pad;
  };

  // 1) 貼唇「雙飛八字長髭」（由人中緊貼上唇、嘴角與下頰面順流垂下！）
  [-1, 1].forEach((s) => {
    const mainStache = createTaperedHairLockV38([
      new THREE.Vector3(s * 0.010, 1.856, faceZ(0.010, 1.856, 0.008)),
      new THREE.Vector3(s * 0.068, 1.844, faceZ(0.068, 1.844, 0.010)),
      new THREE.Vector3(s * 0.122, 1.802, faceZ(0.122, 1.802, 0.012)),
      new THREE.Vector3(s * 0.152, 1.650, 0.295),
      new THREE.Vector3(s * 0.164, 1.410, 0.382)
    ], 0.015, 0.019, 0.0045, mats.beardSheenMat, 22, 9, 1.16, 0.84);
    const upperStache = createTaperedHairLockV38([
      new THREE.Vector3(s * 0.016, 1.864, faceZ(0.016, 1.864, 0.007)),
      new THREE.Vector3(s * 0.078, 1.850, faceZ(0.078, 1.850, 0.009)),
      new THREE.Vector3(s * 0.138, 1.816, faceZ(0.138, 1.816, 0.010)),
      new THREE.Vector3(s * 0.172, 1.675, 0.268),
      new THREE.Vector3(s * 0.184, 1.430, 0.358)
    ], 0.0115, 0.015, 0.004, mats.beardMat, 20, 8, 1.14, 0.84);
    beardGroup.add(mainStache, upperStache);

    // 2) ★ V42 自然收束漸短「修長耳旁貼面落腮鬍」（大幅減輕下方兩側寬厚三角體積！由耳旁貼頰生長、向下自然往內收窄並錯落羽化漸短，絕不呈硬三角形與齊平底線！）
    const earSideSpecs = [
      // 最外側耳旁羽化短鬚（貼耳自然收束於胸肩上方 y=1.50..1.42，不再向兩側下垂外擴！）
      { x0: 0.190, y0: 1.995, xJ: 0.178, yJ: 1.835, xM: 0.168, yM: 1.67, zM: 0.238, x1: 0.152, y1: 1.50, z1: 0.305, rM: 0.0135 },
      { x0: 0.186, y0: 1.968, xJ: 0.172, yJ: 1.820, xM: 0.162, yM: 1.64, zM: 0.268, x1: 0.148, y1: 1.43, z1: 0.335, rM: 0.0155 },
      // 耳前臉頰順收長落腮鬍（向內輕收，長短錯落有致！）
      { x0: 0.178, y0: 1.942, xJ: 0.162, yJ: 1.805, xM: 0.156, yM: 1.60, zM: 0.296, x1: 0.142, y1: 1.36, z1: 0.365, rM: 0.0170 },
      { x0: 0.168, y0: 1.915, xJ: 0.150, yJ: 1.792, xM: 0.146, yM: 1.56, zM: 0.322, x1: 0.132, y1: 1.30, z1: 0.388, rM: 0.0185 },
      { x0: 0.154, y0: 1.888, xJ: 0.136, yJ: 1.780, xM: 0.132, yM: 1.52, zM: 0.346, x1: 0.120, y1: 1.24, z1: 0.408, rM: 0.0190 },
      // 下顎連腮內聚長鬚
      { x0: 0.138, y0: 1.860, xJ: 0.120, yJ: 1.768, xM: 0.118, yM: 1.49, zM: 0.368, x1: 0.106, y1: 1.19, z1: 0.422, rM: 0.0195 },
      { x0: 0.118, y0: 1.836, xJ: 0.104, yJ: 1.755, xM: 0.102, yM: 1.46, zM: 0.386, x1: 0.092, y1: 1.15, z1: 0.435, rM: 0.0190 }
    ];
    earSideSpecs.forEach((es, idx) => {
      const z0 = faceZ(es.x0, es.y0, 0.002);
      const zJ = faceZ(es.xJ, es.yJ, 0.008);
      // 左右微不對稱錯落（±0.018m）打破機械齊平感！
      const asymY = (s > 0 ? 1 : -1) * ((idx % 2 === 0 ? 1 : -1) * 0.016);
      const sideLock = createTaperedHairLockV38([
        new THREE.Vector3(s * es.x0, es.y0, z0),
        new THREE.Vector3(s * es.xJ, es.yJ, zJ),
        new THREE.Vector3(s * (es.xJ * 0.45 + es.xM * 0.55), (es.yJ + es.yM) * 0.50, (zJ + es.zM) * 0.52),
        new THREE.Vector3(s * es.xM, es.yM, es.zM),
        new THREE.Vector3(s * es.x1, es.y1 + asymY, es.z1)
      ], 0.0135, es.rM, 0.0032, idx % 2 === 0 ? mats.beardSheenMat : mats.beardMat, 22, 9, 1.12, 0.82);
      beardGroup.add(sideLock);
    });

    // 3) 臉頰表層貼面纖細羽化鬚絲（每側 3 股自然向內收細，不外擴！）
    for (let k = 0; k < 3; k++) {
      const hx0 = 0.172 - k * 0.022;
      const hy0 = 1.945 - k * 0.036;
      const hxJ = 0.156 - k * 0.022;
      const hyJ = 1.800 - k * 0.018;
      const highlightSide = createTaperedHairLockV38([
        new THREE.Vector3(s * hx0, hy0, faceZ(hx0, hy0, 0.006)),
        new THREE.Vector3(s * hxJ, hyJ, faceZ(hxJ, hyJ, 0.013)),
        new THREE.Vector3(s * (0.145 - k * 0.020), 1.56 - k * 0.032, 0.320 + k * 0.026),
        new THREE.Vector3(s * (0.125 - k * 0.022), 1.33 - k * 0.052 + s * 0.012, 0.388 + k * 0.016)
      ], 0.0095, 0.012, 0.0028, mats.beardSheenMat, 22, 8, 1.10, 0.82);
      beardGroup.add(highlightSide);
    }
  });

  // 4) 承漿下唇貼面小鬚
  const soulPatch = createTaperedHairLockV38([
    new THREE.Vector3(0, 1.822, faceZ(0, 1.822, 0.006)),
    new THREE.Vector3(0, 1.765, faceZ(0, 1.765, 0.014)),
    new THREE.Vector3(0, 1.665, 0.295)
  ], 0.017, 0.021, 0.007, mats.beardMat, 10, 8, 1.32, 0.72);
  beardGroup.add(soulPatch);

  // 5) 內層貼頷垂鬚（7 股自然內聚收尖＋大幅高低錯落尾端，徹底消除硬直齊平下緣！）
  [
    { x0: 0.000, xM: 0.000, x1: 0.004, yEnd: 1.05, zM: 0.398, z1: 0.448, rM: 0.032 },
    { x0: -0.038, xM: -0.036, x1: -0.030, yEnd: 1.13, zM: 0.394, z1: 0.442, rM: 0.028 },
    { x0: 0.038, xM: 0.036, x1: 0.032, yEnd: 1.09, zM: 0.394, z1: 0.442, rM: 0.028 },
    { x0: -0.074, xM: -0.072, x1: -0.064, yEnd: 1.19, zM: 0.384, z1: 0.428, rM: 0.025 },
    { x0: 0.074, xM: 0.072, x1: 0.066, yEnd: 1.23, zM: 0.384, z1: 0.428, rM: 0.025 },
    { x0: -0.106, xM: -0.102, x1: -0.092, yEnd: 1.31, zM: 0.368, z1: 0.408, rM: 0.021 },
    { x0: 0.106, xM: 0.102, x1: 0.094, yEnd: 1.28, zM: 0.368, z1: 0.408, rM: 0.021 }
  ].forEach((b) => {
    const zStart = faceZ(b.x0, 1.805, 0.005);
    const zChin = faceZ(b.x0 * 0.92, 1.735, 0.016);
    const lock = createTaperedHairLockV38([
      new THREE.Vector3(b.x0, 1.805, zStart),
      new THREE.Vector3(b.x0 * 0.96, 1.735, zChin),
      new THREE.Vector3(b.xM * 0.95, 1.58, (zChin + b.zM) * 0.54),
      new THREE.Vector3(b.xM, 1.39, b.zM),
      new THREE.Vector3(b.x1, b.yEnd, b.z1)
    ], 0.022, b.rM, 0.0045, mats.beardMat, 22, 10, 1.24, 0.78);
    beardGroup.add(lock);
  });

  // 6) 中層自然波浪錯落長鬚（9 股自然長短起伏＋中央最長、兩側優雅收短成自然柳葉瀑形！）
  [
    { x0: 0.000, xM: 0.005, x1: -0.004, yEnd: 1.03, zM: 0.422, z1: 0.472, rM: 0.023 },
    { x0: -0.030, xM: -0.030, x1: -0.024, yEnd: 1.11, zM: 0.418, z1: 0.466, rM: 0.021 },
    { x0: 0.030, xM: 0.032, x1: 0.026, yEnd: 1.07, zM: 0.418, z1: 0.466, rM: 0.021 },
    { x0: -0.060, xM: -0.058, x1: -0.052, yEnd: 1.18, zM: 0.410, z1: 0.454, rM: 0.019 },
    { x0: 0.060, xM: 0.060, x1: 0.054, yEnd: 1.15, zM: 0.410, z1: 0.454, rM: 0.019 },
    { x0: -0.088, xM: -0.086, x1: -0.078, yEnd: 1.27, zM: 0.396, z1: 0.436, rM: 0.017 },
    { x0: 0.088, xM: 0.086, x1: 0.078, yEnd: 1.23, zM: 0.396, z1: 0.436, rM: 0.017 },
    { x0: -0.114, xM: -0.110, x1: -0.100, yEnd: 1.36, zM: 0.378, z1: 0.414, rM: 0.015 },
    { x0: 0.114, xM: 0.110, x1: 0.100, yEnd: 1.33, zM: 0.378, z1: 0.414, rM: 0.015 }
  ].forEach((b, idx) => {
    const zStart = faceZ(b.x0, 1.815, 0.010);
    const zChin = faceZ(b.x0 * 0.94, 1.740, 0.024);
    const lock = createTaperedHairLockV38([
      new THREE.Vector3(b.x0, 1.815, zStart),
      new THREE.Vector3(b.x0 * 0.98, 1.740, zChin),
      new THREE.Vector3(b.xM * 0.96, 1.57, (zChin + b.zM) * 0.56),
      new THREE.Vector3(b.xM, 1.38, b.zM),
      new THREE.Vector3(b.x1, b.yEnd, b.z1)
    ], 0.0165, b.rM, 0.0035, idx % 2 === 0 ? mats.beardSheenMat : mats.beardMat, 22, 10, 1.18, 0.82);
    beardGroup.add(lock);
  });

  // 7) 最前層飄逸錯落纖細鬚絲（9 股高低參差、纖尖靈動收尾！）
  [
    { x0: 0.000, wv: 0.008, x1: 0.006, yEnd: 1.01, zM: 0.440, z1: 0.486 },
    { x0: -0.022, wv: -0.007, x1: -0.018, yEnd: 1.10, zM: 0.436, z1: 0.480 },
    { x0: 0.022, wv: 0.007, x1: 0.020, yEnd: 1.06, zM: 0.436, z1: 0.480 },
    { x0: -0.048, wv: -0.008, x1: -0.042, yEnd: 1.17, zM: 0.428, z1: 0.470 },
    { x0: 0.048, wv: 0.008, x1: 0.044, yEnd: 1.21, zM: 0.428, z1: 0.470 },
    { x0: -0.076, wv: -0.009, x1: -0.068, yEnd: 1.29, zM: 0.414, z1: 0.452 },
    { x0: 0.076, wv: 0.009, x1: 0.068, yEnd: 1.25, zM: 0.414, z1: 0.452 },
    { x0: -0.104, wv: -0.009, x1: -0.094, yEnd: 1.38, zM: 0.398, z1: 0.432 },
    { x0: 0.104, wv: 0.009, x1: 0.094, yEnd: 1.35, zM: 0.398, z1: 0.432 }
  ].forEach((b) => {
    const zStart = faceZ(b.x0, 1.820, 0.015);
    const zChin = faceZ(b.x0 * 0.96, 1.745, 0.032);
    const lock = createTaperedHairLockV38([
      new THREE.Vector3(b.x0, 1.820, zStart),
      new THREE.Vector3(b.x0 + b.wv * 0.5, 1.745, zChin),
      new THREE.Vector3(b.x0 + b.wv, 1.56, (zChin + b.zM) * 0.56),
      new THREE.Vector3(b.x1 - b.wv * 0.5, 1.38, b.zM),
      new THREE.Vector3(b.x1, b.yEnd, b.z1)
    ], 0.0115, 0.0135, 0.0028, mats.beardSheenMat, 22, 9, 1.15, 0.84);
    beardGroup.add(lock);
  });

  return beardGroup;
}

/**
 * 1. 左尊：珠簾鳳冠女神尊（天上聖母）
 */
function buildLeftMotherV35(g, mats) {
  // ★ V45 左尊拉長修長端莊上身軀幹（高度由 0.90 延展至 0.98，令身形更修長大氣並自然貼近臉龐！）
  const torsoPts = [
    new THREE.Vector2(0.358, 0.00),
    new THREE.Vector2(0.350, 0.28),
    new THREE.Vector2(0.335, 0.58),
    new THREE.Vector2(0.312, 0.80),
    new THREE.Vector2(0.228, 0.92),
    new THREE.Vector2(0.104, 0.98)
  ];
  const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoPts, 28), mats.robe);
  torso.scale.set(1.06, 1.0, 0.75);
  torso.position.set(0, 0.76, -0.02);
  torso.castShadow = true;
  g.add(torso);

  // ★ V45 左尊自然短秀溫潤玉頸（大幅縮短脖子外露長度，身體拉長緊貼飽滿鵝蛋下巴下方！）
  g.add(buildSculptedNeckV38(mats, { baseY: 1.60, height: 0.225, rBase: 0.148, rMid: 0.090, rTop: 0.100, zPos: 0.038 }));

  // ★ V45 內層富麗金色圓口無領披肩＋密織金珠流蘇（配合拉長上身升高至 y=1.662，嚴格置於白珍珠項鍊與朱紅飄帶裡面！）
  g.add(buildMazuGoldShawlV40(mats));

  // ★ V48 端莊修長女性端坐垂墜刺繡神袍下裳（底擺微提至 y=0.362 優雅覆於繡花金履上緣，100% 零穿幫！）
  const seatedDrape = buildSeatedRobeDrapeV37(mats.robe, {
    waistY: 0.97,
    bottomY: 0.362,
    halfWTop: 0.40,
    halfWBot: 0.46,
    zWaist: 0.225,
    zKnee: 0.440,
    zHem: 0.382,
    thighSpread: 0.245,
    thighBulge: 0.068,
    kneeWidth: 0.205
  });
  g.add(seatedDrape);

  // ★ V48 雙腳金黃刺繡鳳蓮雲頭錦履（優雅自海水江崖袍擺正下方探出，完全避開紅綾下擺與袍邊零穿幫！）
  [-1, 1].forEach((s) => {
    const shoe = buildCloudToeBootV38(mats.shoeMat, mats.whiteSilk, mats.shinyGoldFoil, 0.95, mats.pearl);
    shoe.rotation.y = s * 0.20;
    shoe.position.set(s * 0.275, 0.315, 0.376);
    g.add(shoe);
  });

  // ★ V46 左尊拉長高挺寬肩＋絲滑垂墜自然折痕寬袖＋華美寬袖口＋溫婉玉手端莊平放大腿中段！
  [-1, 1].forEach((s) => {
    const sleevePts = [
      new THREE.Vector3(s * 0.310, 1.575, -0.02),
      new THREE.Vector3(s * 0.480, 1.405, 0.01),
      new THREE.Vector3(s * 0.478, 1.135, 0.12),
      new THREE.Vector3(s * 0.342, 0.985, 0.305)
    ];
    const hand = buildSculptedHandV35(mats, 'rest', 0.98);
    const handPos = new THREE.Vector3(s * 0.288, 0.946, 0.348);
    const arm = createSeamlessEmbroideredArm(
      sleevePts,
      (t) => 0.106 - t * 0.020 + Math.sin(t * Math.PI) * 0.024 + Math.pow(Math.max(0, t - 0.72) / 0.28, 2) * 0.018,
      mats.sleeveRobe,
      mats.brightGold,
      mats.woodSkin,
      hand,
      handPos,
      null,
      -s,
      { drapeDepth: 0.132, elbowT: 0.55, foldAmp: 0.014, cuffDrape: 0.46, handInwardX: -s * 0.24, ornateCuff: true }
    );
    g.add(arm);
  });

  // ★ V49 飽滿圓潤有福氣慈顏（天庭飽滿、地閣圓融、容光煥發！）
  const { headGroup, headR } = buildSculptedHeadV35('leftMother', mats);
  headGroup.position.set(0, 1.852, 0.04);
  const mazuHairCap = new THREE.Mesh(
    new THREE.SphereGeometry(headR * 0.99, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.44),
    mats.woodDark
  );
  mazuHairCap.scale.set(0.880, 1.09, 0.98);
  mazuHairCap.position.set(0, 0.032, -0.008);
  headGroup.add(mazuHairCap);
  g.add(headGroup);

  // 秀氣白色珍珠耳墜（緊貼微收瘦之清秀鵝蛋臉耳垂！）
  [-1, 1].forEach((s) => {
    const dropStem = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.052, 6), mats.brightGold);
    dropStem.position.set(s * (headR * 0.880 + 0.016), 1.762, 0.05);
    const dropPearl = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), mats.pearl);
    dropPearl.position.set(s * (headR * 0.880 + 0.016), 1.727, 0.05);
    g.add(dropStem, dropPearl);
  });

  // ★ V46.1 4 層白色珍珠長項鍊「高繞於金色披肩領口上方之脖子正後方 (y=1.716..1.728, zBack=-0.068..-0.092) 清晰環頸垂落胸前，絕不被披肩截斷！」
  [
    { dropY: 1.37, zOff: 0.316, w: 0.200, n: 64, r: 0.0132, yNeck: 1.726, zBack: -0.068, neckX: 0.106, clavX: 0.150, clavZ: 0.188 },
    { dropY: 1.27, zOff: 0.330, w: 0.238, n: 72, r: 0.0138, yNeck: 1.722, zBack: -0.076, neckX: 0.116, clavX: 0.165, clavZ: 0.198 },
    { dropY: 1.17, zOff: 0.344, w: 0.275, n: 80, r: 0.0144, yNeck: 1.718, zBack: -0.084, neckX: 0.126, clavX: 0.180, clavZ: 0.208 },
    { dropY: 1.07, zOff: 0.358, w: 0.312, n: 88, r: 0.0148, yNeck: 1.714, zBack: -0.092, neckX: 0.136, clavX: 0.195, clavZ: 0.218 }
  ].forEach((spec, idx) => {
    const midY = (1.622 + spec.dropY) * 0.52;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, spec.yNeck, spec.zBack),
      new THREE.Vector3(-spec.neckX * 0.80, spec.yNeck - 0.002, spec.zBack * 0.42),
      new THREE.Vector3(-spec.neckX, spec.yNeck - 0.014, 0.048 + idx * 0.005),
      new THREE.Vector3(-spec.clavX, 1.648 - idx * 0.005, spec.clavZ),
      new THREE.Vector3(-spec.w, midY, spec.zOff - 0.020),
      new THREE.Vector3(0, spec.dropY, spec.zOff),
      new THREE.Vector3(spec.w, midY, spec.zOff - 0.020),
      new THREE.Vector3(spec.clavX, 1.648 - idx * 0.005, spec.clavZ),
      new THREE.Vector3(spec.neckX, spec.yNeck - 0.014, 0.048 + idx * 0.005),
      new THREE.Vector3(spec.neckX * 0.80, spec.yNeck - 0.002, spec.zBack * 0.42),
      new THREE.Vector3(0, spec.yNeck, spec.zBack)
    ]);
    g.add(buildBeadStrand(curve, spec.n, spec.r, mats.pearl));
  });

  // ★ V46.1 溫潤大顆深棕木製佛珠串「完整掛繞於脖子後方 (y=1.734, z=-0.108) 清晰跨過雙肩鎖骨外側優雅垂落至小腿處 y=0.460」！
  const longWoodBeadCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.734, -0.108),
    new THREE.Vector3(-0.106, 1.728, -0.048),
    new THREE.Vector3(-0.152, 1.706, 0.062),
    new THREE.Vector3(-0.228, 1.642, 0.215),
    new THREE.Vector3(-0.424, 1.40, 0.348),
    new THREE.Vector3(-0.458, 0.97, 0.495),
    new THREE.Vector3(-0.365, 0.62, 0.568),
    new THREE.Vector3(-0.195, 0.490, 0.592),
    new THREE.Vector3(0.00, 0.460, 0.600),
    new THREE.Vector3(0.195, 0.490, 0.592),
    new THREE.Vector3(0.365, 0.62, 0.568),
    new THREE.Vector3(0.458, 0.97, 0.495),
    new THREE.Vector3(0.424, 1.40, 0.348),
    new THREE.Vector3(0.228, 1.642, 0.215),
    new THREE.Vector3(0.152, 1.706, 0.062),
    new THREE.Vector3(0.106, 1.728, -0.048),
    new THREE.Vector3(0, 1.734, -0.108)
  ]);
  g.add(buildBeadStrand(longWoodBeadCurve, 64, 0.030, mats.darkBead));

  // ★ V47.1 X 型交叉朱紅金繡紅綾（底擺略微內收至 ±0.195 並前讓至 z=0.585，100% 避開雙腳金繡鳳履零穿插！）
  const sashLtoR = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.34, 1.615, 0.175),
    new THREE.Vector3(-0.40, 1.38, 0.345),
    new THREE.Vector3(-0.25, 1.09, 0.468),
    new THREE.Vector3(-0.03, 0.81, 0.518),
    new THREE.Vector3(0.14, 0.50, 0.556),
    new THREE.Vector3(0.195, 0.20, 0.578)
  ]);
  const sashRtoL = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.34, 1.615, 0.175),
    new THREE.Vector3(0.40, 1.38, 0.355),
    new THREE.Vector3(0.25, 1.09, 0.488),
    new THREE.Vector3(0.02, 0.81, 0.548),
    new THREE.Vector3(-0.14, 0.50, 0.584),
    new THREE.Vector3(-0.195, 0.16, 0.602)
  ]);
  g.add(buildRibbonMesh(sashLtoR, 0.195, mats.sashTempleA, 44, false, true));
  g.add(buildRibbonMesh(sashRtoL, 0.195, mats.sashTempleB, 44, false, true));

  [-1, 1].forEach((s) => {
    const sideDrape = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.42, 1.54, 0.00),
      new THREE.Vector3(s * 0.51, 1.14, 0.08),
      new THREE.Vector3(s * 0.52, 0.65, 0.20),
      new THREE.Vector3(s * 0.49, 0.25, 0.26)
    ]);
    g.add(buildRibbonMesh(sideDrape, 0.115, mats.crimsonCape, 20, true, false));
  });

  // ★ V45 雙鳳朝陽極致細緻金鉑珠簾鳳冠（與拉長身形頭像同步 y=1.978 完美貼額！）
  const crown = new THREE.Group();
  crown.position.set(0, 1.978, 0.04);

  const headband = new THREE.Mesh(new THREE.CylinderGeometry(0.192, 0.186, 0.076, 24), mats.crownFiligree);
  headband.position.y = 0.024;
  const bandRimTop = new THREE.Mesh(new THREE.TorusGeometry(0.194, 0.013, 8, 26), mats.brightGold);
  bandRimTop.rotation.x = Math.PI / 2;
  bandRimTop.position.y = 0.062;
  const bandRimBot = new THREE.Mesh(new THREE.TorusGeometry(0.188, 0.012, 8, 26), mats.brightGold);
  bandRimBot.rotation.x = Math.PI / 2;
  bandRimBot.position.y = -0.014;
  crown.add(headband, bandRimTop, bandRimBot);

  [
    { a: 0, sx: 0.038, sy: 0.027, sz: 0.020 },
    { a: -0.44, sx: 0.024, sy: 0.019, sz: 0.016 },
    { a: 0.44, sx: 0.024, sy: 0.019, sz: 0.016 }
  ].forEach((j) => {
    const jade = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 10), mats.emeraldJade);
    jade.scale.set(j.sx, j.sy, j.sz);
    jade.position.set(Math.sin(j.a) * 0.194, 0.026, Math.cos(j.a) * 0.194);
    jade.rotation.y = j.a;
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(j.sx * 0.96, 0.007, 6, 14), mats.brightGold);
    bezel.scale.set(1, j.sy / j.sx, 1);
    bezel.position.set(Math.sin(j.a) * 0.192, 0.026, Math.cos(j.a) * 0.192);
    bezel.rotation.y = j.a;
    crown.add(jade, bezel);
  });

  // 縮短 20% 之鳳冠本體（總高度較前版減少 20%，優雅比例不頭重腳輕！）
  const innerDome = new THREE.Mesh(new THREE.SphereGeometry(0.184, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), mats.crownFiligree);
  innerDome.position.y = 0.11;
  const innerFiligree = new THREE.Mesh(new THREE.CylinderGeometry(0.172, 0.188, 0.255, 16), mats.crownFiligree);
  innerFiligree.position.y = 0.195;
  crown.add(innerDome, innerFiligree);

  const curtainW = 0.365;
  const curtainH = 0.310;
  const curtainZ = 0.208;
  const headerBeam = new THREE.Mesh(new RoundedBoxGeometry(curtainW + 0.044, 0.046, 0.052, 2, 0.010), mats.brightGold);
  headerBeam.position.set(0, 0.398, curtainZ - 0.01);
  const sideBarL = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, curtainH, 8), mats.brightGold);
  sideBarL.position.set(-curtainW * 0.5, 0.398 - curtainH * 0.5, curtainZ);
  const sideBarR = sideBarL.clone();
  sideBarR.position.x = curtainW * 0.5;
  crown.add(headerBeam, sideBarL, sideBarR);

  // ★ 100% 純金色細緻珠簾（配合縮短 20% 帽冠改為 13 道 × 9 顆渾圓金珠＋細金絲垂線＋水滴金墜！）
  const goldBeadGeo = new THREE.SphereGeometry(0.0124, 8, 7);
  const goldThreadGeo = new THREE.CylinderGeometry(0.0022, 0.0022, 0.295, 5);
  const goldDropGeo = new THREE.ConeGeometry(0.0096, 0.024, 6);
  for (let col = 0; col < 13; col++) {
    const cx = -curtainW * 0.46 + (col / 12) * (curtainW * 0.92);
    const thread = new THREE.Mesh(goldThreadGeo, mats.antiqueGold);
    thread.position.set(cx, 0.225, curtainZ + 0.006);
    crown.add(thread);
    for (let row = 0; row < 9; row++) {
      const cy = 0.365 - row * 0.0345;
      const b = new THREE.Mesh(goldBeadGeo, (row + col) % 2 === 0 ? mats.brightGold : mats.antiqueGold);
      b.position.set(cx, cy, curtainZ + 0.009);
      crown.add(b);
    }
    const drop = new THREE.Mesh(goldDropGeo, mats.brightGold);
    drop.rotation.x = Math.PI;
    drop.position.set(cx, 0.062, curtainZ + 0.009);
    crown.add(drop);
  }

  const sunPearl = new THREE.Mesh(new THREE.SphereGeometry(0.030, 10, 10), mats.goldFoil);
  sunPearl.position.set(0, 0.478, curtainZ - 0.035);
  const sunSpire = new THREE.Mesh(new THREE.ConeGeometry(0.020, 0.088, 8), mats.goldFoil);
  sunSpire.position.set(0, 0.538, curtainZ - 0.035);
  crown.add(sunPearl, sunSpire);

  // ★ V44 精雕細工「祥瑞雲朵形」金鉑片（浮雕捲雲＋雙層細絲金線邊框＋連珠金粒＋中心翠玉！）
  const createCloudFoilPlaqueV41 = (sSign) => {
    const cloudGrp = new THREE.Group();
    const cs = new THREE.Shape();
    cs.moveTo(0, -0.042);
    cs.bezierCurveTo(sSign * 0.035, -0.056, sSign * 0.072, -0.048, sSign * 0.082, -0.022);
    cs.bezierCurveTo(sSign * 0.114, -0.024, sSign * 0.128, 0.012, sSign * 0.104, 0.036);
    cs.bezierCurveTo(sSign * 0.112, 0.068, sSign * 0.078, 0.086, sSign * 0.048, 0.070);
    cs.bezierCurveTo(sSign * 0.034, 0.092, sSign * -0.006, 0.088, sSign * -0.016, 0.062);
    cs.bezierCurveTo(sSign * -0.036, 0.042, sSign * -0.032, -0.022, 0, -0.042);
    cs.closePath();
    const plate = new THREE.Mesh(
      normalizeExtrudeUVs(new THREE.ExtrudeGeometry(cs, { depth: 0.0065, bevelEnabled: true, bevelThickness: 0.0024, bevelSize: 0.0020, bevelSegments: 2 })),
      mats.shinyGoldFoil
    );
    plate.position.z = -0.0032;
    const innerSwirl = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0042, 6, 16, Math.PI * 1.55), mats.brightGold);
    innerSwirl.position.set(sSign * 0.042, 0.016, 0.006);
    const outerSwirl = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.0030, 6, 18, Math.PI * 1.35), mats.shinyGoldFoil);
    outerSwirl.position.set(sSign * 0.045, 0.018, 0.0055);
    const centerBead = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), mats.emeraldJade);
    centerBead.position.set(sSign * 0.042, 0.016, 0.008);
    // 雲朵瓣緣細連珠金粒裝飾
    const microBeadGeo = new THREE.SphereGeometry(0.0046, 6, 5);
    [
      [sSign * 0.022, -0.036], [sSign * 0.068, -0.030], [sSign * 0.098, 0.004],
      [sSign * 0.088, 0.048], [sSign * 0.048, 0.066], [sSign * 0.006, 0.062]
    ].forEach(([bx, by]) => {
      const mb = new THREE.Mesh(microBeadGeo, mats.shinyGoldFoil);
      mb.position.set(bx, by, 0.006);
      cloudGrp.add(mb);
    });
    cloudGrp.add(plate, innerSwirl, outerSwirl, centerBead);
    return cloudGrp;
  };

  // ★ V45 神冠兩側精細浮雕蓮瓣金鉑片（UV 正規化展現 1024px 鑿花寶相蓮與連珠細紋！）
  const createMazuSideFoilV41 = (w, h) => {
    const fGrp = new THREE.Group();
    const sh = new THREE.Shape();
    sh.moveTo(0, -h * 0.48);
    sh.bezierCurveTo(-w * 0.62, -h * 0.20, -w * 0.54, h * 0.28, 0, h * 0.56);
    sh.bezierCurveTo(w * 0.54, h * 0.28, w * 0.62, -h * 0.20, 0, -h * 0.48);
    sh.closePath();
    const plate = new THREE.Mesh(
      normalizeExtrudeUVs(new THREE.ExtrudeGeometry(sh, { depth: 0.005, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.0018, bevelSegments: 2 })),
      mats.shinyGoldFoil
    );
    const midRib = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0032, h * 0.72, 6), mats.brightGold);
    midRib.position.set(0, h * 0.02, 0.0065);
    const centerDot = new THREE.Mesh(new THREE.SphereGeometry(w * 0.14, 7, 6), mats.shinyGoldFoil);
    centerDot.scale.set(1, 1.3, 0.5);
    centerDot.position.set(0, 0, 0.007);
    fGrp.add(plate, midRib, centerDot);
    return fGrp;
  };

  [-1, 1].forEach((s) => {
    const phx = new THREE.Group();
    phx.position.set(s * 0.114, 0.442, curtainZ - 0.028);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.039, 10, 8), mats.brightGold);
    body.scale.set(1.4, 0.72, 0.68);
    const neckC = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-s * 0.026, 0.018, 0),
      new THREE.Vector3(-s * 0.062, 0.070, 0.01),
      new THREE.Vector3(-s * 0.044, 0.094, 0.01)
    ]);
    const phxNeck = new THREE.Mesh(new THREE.TubeGeometry(neckC, 8, 0.012, 6, false), mats.brightGold);
    const wing = new THREE.Mesh(new THREE.ConeGeometry(0.037, 0.125, 6), mats.antiqueGold);
    wing.position.set(s * 0.048, 0.052, -0.01);
    wing.rotation.z = s * -0.82;
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.108, 6), mats.brightGold);
    tail.position.set(s * 0.080, -0.008, -0.01);
    tail.rotation.z = s * -1.35;
    phx.add(body, phxNeck, wing, tail);
    crown.add(phx);

    // 冠翼內收服貼（縮高 20%）
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0.02);
    wingShape.bezierCurveTo(s * 0.085, 0.05, s * 0.125, 0.18, s * 0.115, 0.33);
    wingShape.bezierCurveTo(s * 0.075, 0.27, s * 0.04, 0.21, 0, 0.24);
    wingShape.closePath();
    const wingPlate = new THREE.Mesh(
      new THREE.ExtrudeGeometry(wingShape, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.004, bevelSegments: 2 }),
      mats.crownFiligree
    );
    wingPlate.position.set(s * 0.158, 0.032, 0.055);
    crown.add(wingPlate);

    // ★ V41 神冠兩側璀璨金色鉑片（每側 4 片層疊閃耀於珠簾左右與三角帽巾之間！）
    [
      { x: s * 0.212, y: 0.125, z: 0.165, w: 0.050, h: 0.068, rz: s * -0.34 },
      { x: s * 0.222, y: 0.210, z: 0.155, w: 0.052, h: 0.072, rz: s * -0.26 },
      { x: s * 0.215, y: 0.295, z: 0.145, w: 0.048, h: 0.066, rz: s * -0.20 },
      { x: s * 0.195, y: 0.370, z: 0.140, w: 0.042, h: 0.058, rz: s * -0.14 }
    ].forEach((sf) => {
      const foil = createMazuSideFoilV41(sf.w, sf.h);
      foil.position.set(sf.x, sf.y, sf.z);
      foil.rotation.set(-0.08, s * 0.22, sf.rz);
      crown.add(foil);
    });

    // ★ V41.2 耳朵兩邊「祥瑞雲朵形」金色鉑片（精準對齊雙耳側緣，優雅襯托小巧閉眼慈顏！）
    const earCloud = createCloudFoilPlaqueV41(s);
    earCloud.position.set(s * 0.170, -0.055, 0.116);
    earCloud.rotation.set(0, s * 0.18, s * -0.06);
    crown.add(earCloud);
  });

  g.add(crown);

  // ★ V44.1 同步貼合之黃色刺繡三角帽巾
  const mazuHood = buildMazuEmbroideredHoodV38(mats);
  g.add(mazuHood);
}

/**
 * 2. ★ V37 中尊：戰甲將軍神尊（中壇元帥）
 *    - 橘金絲緞滿幅金蔥刺繡戰袍（腹部正中央清晰展現立體浮雕金獅圖案，完全不被武器或雙臂遮擋！）
 *    - 拿武器之手（觀者右側 +X）高舉至頭肩高度威武執握筆直細長火尖槍；另一手（觀者左側 -X）自然下垂輕撫膝側！
 *    - 身體與四肢、肩袖、手腕與五指 100% 實體相連、一體垂墜刺繡戰袍下裳零穿幫！
 */
function buildCenterMarshalV35(g, mats) {
  // ★ V41 精壯修長武將身型（身體較瘦、挺拔倒三角肩胸線條、收腰俐落！）
  const bodyPts = [
    new THREE.Vector2(0.295, 0.00),
    new THREE.Vector2(0.300, 0.25),
    new THREE.Vector2(0.305, 0.50),
    new THREE.Vector2(0.285, 0.69),
    new THREE.Vector2(0.200, 0.80),
    new THREE.Vector2(0.095, 0.85)
  ];
  const bodyMesh = new THREE.Mesh(new THREE.LatheGeometry(bodyPts, 30), mats.sleeveRobe);
  bodyMesh.scale.set(1.04, 1.0, 0.76);
  bodyMesh.position.set(0, 0.76, -0.02);
  bodyMesh.castShadow = true;
  g.add(bodyMesh);

  // ★ V38 雙層精細圓領＋V 型漢服交領右衽（緊貼修長肩胸與短頸！）
  const innerCollar = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.015, 8, 22), mats.whiteSilk);
  innerCollar.rotation.x = Math.PI / 2;
  innerCollar.position.set(0, 1.576, 0.022);
  const outerCollar = new THREE.Mesh(new THREE.TorusGeometry(0.118, 0.020, 10, 24), mats.brightGold);
  outerCollar.rotation.x = Math.PI / 2;
  outerCollar.position.set(0, 1.552, 0.022);
  g.add(innerCollar, outerCollar);
  [-1, 1].forEach((s) => {
    const innerV = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.090, 1.578, 0.052),
      new THREE.Vector3(s * 0.058, 1.532, 0.150),
      new THREE.Vector3(s * -0.010, 1.494, 0.195)
    ]);
    const outerV = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.112, 1.560, 0.054),
      new THREE.Vector3(s * 0.076, 1.512, 0.160),
      new THREE.Vector3(s * -0.014, 1.470, 0.208)
    ]);
    g.add(
      new THREE.Mesh(new THREE.TubeGeometry(innerV, 10, 0.012, 8, false), mats.whiteSilk),
      new THREE.Mesh(new THREE.TubeGeometry(outerV, 10, 0.017, 8, false), mats.brightGold)
    );
  });

  // 胸口金邊護心圓玉（精準鑲於雲肩披肩領口正前表面，絕不穿模！）
  const chestPearl = new THREE.Mesh(new THREE.SphereGeometry(0.023, 10, 8), mats.pearl);
  chestPearl.position.set(0, 1.478, 0.252);
  const chestPearlBezel = new THREE.Mesh(new THREE.TorusGeometry(0.030, 0.0082, 6, 14), mats.shinyGoldFoil);
  chestPearlBezel.position.set(0, 1.478, 0.248);
  g.add(chestPearl, chestPearlBezel);

  // ★ V44 中尊「威武寬肩如意雲肩披肩＋披於衣服外側零破圖之朱紅金邊戰袍披風」！
  g.add(buildMarshalCloudShawlV43(mats));
  g.add(buildMarshalBackCapeV44(mats));

  // ★ V43.1 腹部正中央放大 45% 之「壓扁橢圓形手工金線刺繡獠牙雄獅／猛虎＋雙層放射三角旗刺繡」（氣勢磅礴、緊鄰如意雲肩下方零穿幫！）
  const lionArcGeo = new THREE.CylinderGeometry(0.316, 0.330, 0.512, 36, 1, true, -1.08, 2.16);
  const lionPatch = new THREE.Mesh(lionArcGeo, mats.lionBellyMat);
  lionPatch.scale.set(1.06, 1.0, 0.78);
  lionPatch.position.set(0, 1.182, -0.016);
  g.add(lionPatch);

  // 金線繡邊朱紅束腰戰帶（收腰俐落更顯帥氣武將體態！）
  const waistBelt = new THREE.Mesh(new THREE.TorusGeometry(0.278, 0.034, 10, 28), mats.crimsonSilk);
  waistBelt.rotation.x = Math.PI / 2;
  waistBelt.scale.set(1.04, 0.78, 1.0);
  waistBelt.position.set(0, 0.91, 0.032);
  const beltTopTrim = new THREE.Mesh(new THREE.TorusGeometry(0.281, 0.011, 8, 28), mats.brightGold);
  beltTopTrim.rotation.x = Math.PI / 2;
  beltTopTrim.scale.set(1.04, 0.79, 1.0);
  beltTopTrim.position.set(0, 0.940, 0.032);
  const beltBotTrim = beltTopTrim.clone();
  beltBotTrim.position.y = 0.880;
  // 精雕金邊翠玉腰扣
  const beltClasp = new THREE.Mesh(new RoundedBoxGeometry(0.088, 0.068, 0.026, 2, 0.010), mats.brightGold);
  beltClasp.position.set(0, 0.91, 0.258);
  const beltJade = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), mats.emeraldJade);
  beltJade.scale.set(1.25, 0.95, 0.55);
  beltJade.position.set(0, 0.91, 0.270);
  g.add(waistBelt, beltTopTrim, beltBotTrim, beltClasp, beltJade);

  // ★ V48 一體無縫端坐橘金刺繡戰袍下裳（底擺優雅覆於朱橘戰靴鞋口上方 y=0.362，袍擺與靴口 100% 零穿幫！）
  const seatedDrape = buildSeatedRobeDrapeV37(mats.robe, {
    waistY: 0.91,
    bottomY: 0.362,
    halfWTop: 0.38,
    halfWBot: 0.49,
    zWaist: 0.225,
    zKnee: 0.478,
    zHem: 0.420,
    thighSpread: 0.272,
    thighBulge: 0.080,
    kneeWidth: 0.232,
    pleatAmp: 0.015,
    uvTop: 0.36
  });
  g.add(seatedDrape);

  // ★ V48 雙腳朱橘描金祥雲紋武將戰靴（靴筒藏於袍擺之下，僅展露精緻橘金戰靴鞋面與翠玉如意雲頭，零穿幫！）
  [-1, 1].forEach((s) => {
    const boot = buildCloudToeBootV38(mats.shoeMat, mats.antiqueGold, mats.shinyGoldFoil, 1.00, mats.emeraldJade);
    boot.rotation.y = s * 0.20;
    boot.position.set(s * 0.272, 0.315, 0.402);
    g.add(boot);
  });

  // ★ V54.1 徹底杜絕武器穿袖與穿袖口：槍尾金箍緊收於握槍小指下方 (-0.052m，完全高於袖口之上 100% 零穿幫！) 並順修右臂舉槍袖形！
  const ang26 = Math.PI * (26 / 180);
  const spearUnit = new THREE.Vector3(Math.sin(ang26), Math.cos(ang26), -0.085).normalize();
  const spearQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), spearUnit);
  const pGrip = new THREE.Vector3(-0.380, 1.786, 0.392);
  const pSpearBot = pGrip.clone().addScaledVector(spearUnit, -0.052);
  const pSpearTop = pGrip.clone().addScaledVector(spearUnit, 0.675);

  const spearGroup = new THREE.Group();
  spearGroup.add(createLimbSegment(pSpearBot, pSpearTop, 0.0072, 0.0072, mats.darkSpearShaft, 10));

  const buttSocket = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.0085, 0.020, 8), mats.darkSpearTrim);
  buttSocket.position.copy(pSpearBot);
  buttSocket.quaternion.copy(spearQuat);
  const buttCap = new THREE.Mesh(new THREE.SphereGeometry(0.0092, 8, 8), mats.darkSpearTrim);
  buttCap.position.copy(pSpearBot).addScaledVector(spearUnit, -0.012);
  spearGroup.add(buttSocket, buttCap);

  const redCollar = new THREE.Mesh(new THREE.OctahedronGeometry(0.019, 1), mats.crimsonSilk);
  redCollar.scale.set(0.76, 1.60, 0.76);
  redCollar.position.copy(pSpearTop).addScaledVector(spearUnit, -0.028);
  redCollar.quaternion.copy(spearQuat);
  const goldCollarRing = new THREE.Mesh(new THREE.TorusGeometry(0.0135, 0.0046, 6, 12), mats.darkSpearTrim);
  goldCollarRing.position.copy(pSpearTop).addScaledVector(spearUnit, -0.004);
  goldCollarRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), spearUnit);
  spearGroup.add(redCollar, goldCollarRing);

  const bladeBase = new THREE.Mesh(new THREE.ConeGeometry(0.0165, 0.052, 4), mats.darkSteelBlade);
  bladeBase.scale.set(1.12, 1.0, 0.34);
  bladeBase.position.copy(pSpearTop).addScaledVector(spearUnit, 0.022);
  bladeBase.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), spearUnit);
  const bladeTip = new THREE.Mesh(new THREE.ConeGeometry(0.0165, 0.295, 4), mats.darkSteelBlade);
  bladeTip.scale.set(1.12, 1.0, 0.34);
  bladeTip.position.copy(pSpearTop).addScaledVector(spearUnit, 0.194);
  bladeTip.quaternion.copy(spearQuat);
  spearGroup.add(bladeBase, bladeTip);
  g.add(spearGroup);

  // 1) ★ V54.1 俐落英武舉槍右袖（收束袖口低於握槍拳下方，與火尖槍 100% 零穿幫！）
  const highArmPts = [
    new THREE.Vector3(-0.285, 1.438, -0.015),
    new THREE.Vector3(-0.420, 1.398, 0.062),
    new THREE.Vector3(-0.442, 1.495, 0.200),
    new THREE.Vector3(-0.392, 1.696, 0.352)
  ];
  const highGripHand = buildSculptedHandV35(mats, 'grip', 1.04);
  const highArm = createSeamlessEmbroideredArm(
    highArmPts,
    (t) => 0.090 - t * 0.022 + Math.sin(t * Math.PI) * 0.016 + Math.pow(Math.max(0, t - 0.72) / 0.28, 2) * 0.014,
    mats.sleeveRobe,
    mats.shinyGoldFoil,
    mats.woodSkin,
    highGripHand,
    pGrip,
    spearQuat,
    1,
    { drapeDepth: 0.096, elbowT: 0.56, foldAmp: 0.013, cuffDrape: 0.26, shScaleY: 0.54, ornateCuff: true }
  );
  g.add(highArm);

  // 2) ★ V50b 絲滑柔順自然垂肘左手袖擺＋一體雕塑 .glb 五指玉手緊貼袖口穩放大腿中段！
  const lowHandPos = new THREE.Vector3(0.278, 0.908, 0.352);
  const lowArmPts = [
    new THREE.Vector3(0.285, 1.445, -0.01),
    new THREE.Vector3(0.455, 1.290, 0.04),
    new THREE.Vector3(0.460, 1.055, 0.14),
    new THREE.Vector3(0.326, 0.948, 0.316)
  ];
  const lowRestHand = buildSculptedHandV35(mats, 'rest', 1.04);
  const lowArm = createSeamlessEmbroideredArm(
    lowArmPts,
    (t) => 0.098 - t * 0.018 + Math.sin(t * Math.PI) * 0.022 + Math.pow(Math.max(0, t - 0.68) / 0.32, 2) * 0.024,
    mats.sleeveRobe,
    mats.shinyGoldFoil,
    mats.woodSkin,
    lowRestHand,
    lowHandPos,
    null,
    -1,
    { drapeDepth: 0.128, elbowT: 0.55, foldAmp: 0.014, cuffDrape: 0.48, handInwardX: -0.22, shScaleY: 0.56, ornateCuff: true }
  );
  g.add(lowArm);

  // ★ 精悍短頸令年輕英俊臉龐自然貼近漢服金領！
  g.add(buildSculptedNeckV38(mats, { baseY: 1.50, height: 0.245, rBase: 0.116, rMid: 0.086, rTop: 0.094, zPos: 0.028 }));

  // 頭部微轉向右側 (+0.44 rad)，展現年輕男子型男俊美立體側顏五官！
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.750, 0.032);
  headPivot.rotation.y = 0.44;
  headPivot.rotation.x = 0.02;

  const { headGroup } = buildSculptedHeadV35('centerKing', mats);
  headPivot.add(headGroup);

  // 髮帽藏於覆額細碎閃亮金鉑神冠內側零穿幫（x=臉寬 0.86、z=前後深度 0.98）！
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.160, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.40), mats.woodDark);
  hairCap.scale.set(0.86, 1.04, 0.98);
  hairCap.position.set(0, 0.086, -0.018);
  const hairBun = new THREE.Mesh(new THREE.SphereGeometry(0.082, 12, 10), mats.woodDark);
  hairBun.position.set(0, 0.22, -0.03);
  headPivot.add(hairCap, hairBun);

  // ★ V46 中間神明神冠「全金屬面密貼細小細碎閃亮金屬光澤金鉑片（似右尊神冠鑿花金鉑工藝但更精緻細碎！）」
  //   保留原 5 顆主要大紅球＋純粹樹枝狀短金枝（無小紅球）！
  const crown = new THREE.Group();
  crown.scale.set(0.92, 1.00, 0.99);
  crown.position.set(0, 0.114, 0.010);
  crown.rotation.x = -0.05;

  // 共用：細小細碎精工蓮瓣金屬金鉑片工廠（UV 正規化 1024px 鑿花浮雕＋立體導角＋中心微光金珠！）
  const createMicroFoilScaleV46 = (w, h, bright = true) => {
    const sGrp = new THREE.Group();
    const sh = new THREE.Shape();
    sh.moveTo(0, -h * 0.48);
    sh.bezierCurveTo(-w * 0.66, -h * 0.20, -w * 0.56, h * 0.30, 0, h * 0.56);
    sh.bezierCurveTo(w * 0.56, h * 0.30, w * 0.66, -h * 0.20, 0, -h * 0.48);
    sh.closePath();
    const plate = new THREE.Mesh(
      normalizeExtrudeUVs(new THREE.ExtrudeGeometry(sh, { depth: 0.0036, bevelEnabled: true, bevelThickness: 0.0014, bevelSize: 0.0012, bevelSegments: 1 })),
      bright ? mats.microGoldFoil : mats.microGoldFoilAlt
    );
    plate.position.z = -0.0018;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(w * 0.145, 5, 4), mats.microGoldFoil);
    dot.scale.set(1.0, 1.25, 0.45);
    dot.position.set(0, 0, 0.0038);
    sGrp.add(plate, dot);
    return sGrp;
  };

  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.188, 0.184, 0.092, 24), mats.microGoldFoilAlt);
  const bandTop = new THREE.Mesh(new THREE.TorusGeometry(0.190, 0.012, 8, 28), mats.microGoldFoil);
  bandTop.rotation.x = Math.PI / 2;
  bandTop.position.y = 0.044;
  const bandBot = new THREE.Mesh(new THREE.TorusGeometry(0.186, 0.012, 8, 28), mats.microGoldFoil);
  bandBot.rotation.x = Math.PI / 2;
  bandBot.position.y = -0.044;
  crown.add(band, bandTop, bandBot);

  // 額帶上下細密連珠金粒＋雙排交錯密疊細碎金屬金鉑鱗片＋正中翠玉金框
  const rimBeadGeo = new THREE.SphereGeometry(0.0062, 6, 5);
  for (let b = 0; b < 32; b++) {
    const ba = (b / 32) * Math.PI * 2;
    const tb = new THREE.Mesh(rimBeadGeo, mats.microGoldFoil);
    tb.position.set(Math.sin(ba) * 0.194, 0.039, Math.cos(ba) * 0.194);
    const bb = new THREE.Mesh(rimBeadGeo, mats.microGoldFoil);
    bb.position.set(Math.sin(ba) * 0.190, -0.039, Math.cos(ba) * 0.190);
    crown.add(tb, bb);
  }
  const frontJade = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), mats.emeraldJade);
  frontJade.scale.set(1.25, 0.95, 0.72);
  frontJade.position.set(0, 0.002, 0.198);
  const frontJadeBezel = new THREE.Mesh(new THREE.TorusGeometry(0.029, 0.0062, 6, 16), mats.microGoldFoil);
  frontJadeBezel.position.set(0, 0.002, 0.194);
  crown.add(frontJade, frontJadeBezel);

  // 額帶全弧密貼 2 排細小細碎交錯閃亮金鉑片（避開正中翠玉，零間隙呈現碎金閃耀質感！）
  [
    { yOff: -0.014, count: 19, span: Math.PI * 1.18, r: 0.191, w: 0.034, h: 0.044 },
    { yOff: 0.016, count: 18, span: Math.PI * 1.12, r: 0.193, w: 0.032, h: 0.042 }
  ].forEach((row, rIdx) => {
    for (let i = 0; i < row.count; i++) {
      const a = ((i / (row.count - 1)) - 0.5) * row.span;
      if (Math.abs(a) < 0.15) continue;
      const sc = createMicroFoilScaleV46(row.w, row.h, (i + rIdx) % 2 === 0);
      sc.position.set(Math.sin(a) * row.r, row.yOff, Math.cos(a) * row.r);
      sc.rotation.set(-0.04 + ((i % 3) - 1) * 0.04, a, ((i % 2 === 0 ? 1 : -1) * 0.06));
      crown.add(sc);
    }
  });

  // 五瓣冠葉基底＋每片冠葉表面層層密疊「細小細碎金屬金鉑鱗片」（絕無大塊素面金屬！）
  [
    { ang: 0.00, h: 0.30, w: 0.122, tilt: -0.08, rows: 5 },
    { ang: -0.50, h: 0.24, w: 0.104, tilt: -0.14, rows: 4 },
    { ang: 0.50, h: 0.24, w: 0.104, tilt: -0.14, rows: 4 },
    { ang: -1.02, h: 0.19, w: 0.090, tilt: -0.18, rows: 3 },
    { ang: 1.02, h: 0.19, w: 0.090, tilt: -0.18, rows: 3 }
  ].forEach((pd) => {
    const pGrp = new THREE.Group();
    pGrp.rotation.y = pd.ang;
    const leafShape = new THREE.Shape();
    leafShape.moveTo(-pd.w * 0.5, 0);
    leafShape.bezierCurveTo(-pd.w * 0.75, pd.h * 0.45, -pd.w * 0.32, pd.h * 0.78, 0, pd.h);
    leafShape.bezierCurveTo(pd.w * 0.32, pd.h * 0.78, pd.w * 0.75, pd.h * 0.45, pd.w * 0.5, 0);
    leafShape.closePath();
    const leaf = new THREE.Mesh(
      normalizeExtrudeUVs(new THREE.ExtrudeGeometry(leafShape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.0045, bevelSize: 0.0038, bevelSegments: 2 })),
      mats.microGoldFoilAlt
    );
    leaf.position.set(0, 0.036, 0.170);
    leaf.rotation.x = pd.tilt;
    pGrp.add(leaf);

    // 冠葉前表面依形狀逐層密貼細小細碎金鉑片（每列由下而上微縮、磚疊交錯折射金屬光澤！）
    for (let r = 0; r < pd.rows; r++) {
      const vf = (r + 0.45) / (pd.rows + 0.25);
      const yLocal = 0.044 + vf * pd.h * 0.88;
      const zLocal = 0.184 + (yLocal - 0.036) * Math.sin(pd.tilt) + (r % 2 === 0 ? 0.0025 : 0.0005);
      const cols = Math.max(1, Math.round((1.05 - vf * 0.75) * 3.4));
      const rowSpan = pd.w * Math.sin(Math.min(1, vf * 0.82 + 0.16) * Math.PI) * 0.68;
      for (let c = 0; c < cols; c++) {
        const cf = cols === 1 ? 0 : (c / (cols - 1) - 0.5);
        const sc = createMicroFoilScaleV46(0.032 - vf * 0.006, 0.044 - vf * 0.008, (r + c) % 2 === 0);
        sc.position.set(cf * rowSpan, yLocal, zLocal);
        sc.rotation.set(pd.tilt - 0.04, cf * 0.16, -cf * 0.22);
        pGrp.add(sc);
      }
    }
    const tipBall = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), mats.microGoldFoil);
    tipBall.position.set(0, 0.040 + pd.h, 0.173 - Math.sin(-pd.tilt) * pd.h);
    pGrp.add(tipBall);
    crown.add(pGrp);
  });

  // 冠身核心＋3 層全環細碎金屬金鉑鱗片包覆（連冠身縫隙處都密布閃亮細碎金鉑！）
  const crownCore = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.175, 0.17, 16), mats.microGoldFoilAlt);
  crownCore.position.y = 0.115;
  crown.add(crownCore);
  [
    { y: 0.095, r: 0.177, count: 20, span: Math.PI * 1.45, w: 0.038, h: 0.050, tilt: -0.10 },
    { y: 0.148, r: 0.168, count: 17, span: Math.PI * 1.38, w: 0.036, h: 0.048, tilt: -0.14 },
    { y: 0.198, r: 0.156, count: 14, span: Math.PI * 1.24, w: 0.033, h: 0.044, tilt: -0.18 }
  ].forEach((tr, tIdx) => {
    for (let i = 0; i < tr.count; i++) {
      const a = ((i / (tr.count - 1)) - 0.5) * tr.span;
      const sc = createMicroFoilScaleV46(tr.w, tr.h, (i + tIdx) % 2 === 1);
      const rOff = tr.r + (i % 2 === 0 ? 0.0025 : -0.0015);
      sc.position.set(Math.sin(a) * rOff, tr.y, Math.cos(a) * rOff);
      sc.rotation.set(tr.tilt, a, -a * 0.12);
      crown.add(sc);
    }
  });

  // ★ V46 帽冠兩側「細碎花瓣疊層閃亮圓型金屬金鉑片」（14 瓣外圈＋8 瓣內圈細碎金鉑片組成繁花光澤！）
  [-1, 1].forEach((s) => {
    const discGrp = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.008, 24), mats.microGoldFoilAlt);
    disc.rotation.x = Math.PI / 2;
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.0052, 7, 24), mats.microGoldFoil);
    // 外圈 14 片細小放射金鉑花瓣
    for (let k = 0; k < 14; k++) {
      const ka = (k / 14) * Math.PI * 2;
      const petal = createMicroFoilScaleV46(0.022, 0.030, k % 2 === 0);
      petal.position.set(Math.cos(ka) * 0.050, Math.sin(ka) * 0.050, 0.0055 + (k % 2 === 0 ? 0.0012 : 0));
      petal.rotation.set(0.06, 0, ka - Math.PI / 2);
      discGrp.add(petal);
    }
    // 內圈 8 片更小細碎金鉑花瓣
    for (let k = 0; k < 8; k++) {
      const ka = (k / 8) * Math.PI * 2 + 0.2;
      const innerPetal = createMicroFoilScaleV46(0.017, 0.022, k % 2 === 1);
      innerPetal.position.set(Math.cos(ka) * 0.026, Math.sin(ka) * 0.026, 0.0082);
      innerPetal.rotation.set(0.08, 0, ka - Math.PI / 2);
      discGrp.add(innerPetal);
    }
    const centerBoss = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), mats.microGoldFoil);
    centerBoss.scale.set(1, 1, 0.55);
    centerBoss.position.z = 0.010;
    discGrp.add(disc, outerRing, centerBoss);
    discGrp.position.set(s * 0.218, 0.045, 0.055);
    discGrp.rotation.set(-0.06, s * 0.30, s * -0.08);
    crown.add(discGrp);
  });

  // ★ V45 中間神明帽冠「分叉樹枝狀金枝＋5 顆主要大紅球（保留正確樹枝狀結構，全面移除細枝尖部小紅球改為純雅金芽收尖！）」
  const addBranchTipPomV44 = (pts, pomR, rStart = 0.0095, rMid = 0.0068, rEnd = 0.0040) => {
    const branch = createTaperedHairLockV38(pts, rStart, rMid, rEnd, mats.shinyGoldFoil, 12, 6, 1.0, 1.0);
    const tip = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    const dir = tip.clone().sub(prev).normalize();
    const calyx = new THREE.Mesh(new THREE.ConeGeometry(pomR * 0.52, pomR * 0.58, 7), mats.shinyGoldFoil);
    calyx.position.copy(tip).addScaledVector(dir, -pomR * 0.46);
    calyx.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    const pom = new THREE.Mesh(new THREE.SphereGeometry(pomR, 14, 12), mats.crimsonPom);
    pom.position.copy(tip);
    crown.add(branch, calyx, pom);
  };
  const addShortGoldTwigV45 = (startPt, midOffset, tipOffset) => {
    const p1 = startPt.clone().add(midOffset);
    const p2 = startPt.clone().add(tipOffset);
    const twig = createTaperedHairLockV38([startPt, p1, p2], 0.0052, 0.0036, 0.0014, mats.shinyGoldFoil, 10, 6, 1.0, 1.0);
    const bud = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 6, 5), mats.shinyGoldFoil);
    bud.position.copy(p2);
    crown.add(twig, bud);
  };

  // 1) 右側主大紅球（位置不變！）＋ 2 根短巧純金分枝
  const b1 = [
    new THREE.Vector3(0.140, 0.180, 0.015),
    new THREE.Vector3(0.225, 0.255, 0.000),
    new THREE.Vector3(0.275, 0.325, -0.018)
  ];
  addBranchTipPomV44(b1, 0.054);
  addShortGoldTwigV45(new THREE.Vector3(0.200, 0.232, 0.005), new THREE.Vector3(0.048, 0.008, 0.015), new THREE.Vector3(0.088, 0.002, 0.024));
  addShortGoldTwigV45(new THREE.Vector3(0.228, 0.258, 0.000), new THREE.Vector3(-0.012, 0.044, 0.014), new THREE.Vector3(-0.028, 0.078, 0.022));

  // 2) 冠頂正中主大紅球（位置不變！）＋ 2 根對稱短巧純金分枝
  const b2 = [
    new THREE.Vector3(-0.005, 0.245, 0.022),
    new THREE.Vector3(-0.015, 0.375, 0.036),
    new THREE.Vector3(-0.022, 0.485, 0.045)
  ];
  addBranchTipPomV44(b2, 0.056);
  addShortGoldTwigV45(new THREE.Vector3(-0.012, 0.335, 0.032), new THREE.Vector3(0.050, 0.032, 0.006), new THREE.Vector3(0.092, 0.056, 0.008));
  addShortGoldTwigV45(new THREE.Vector3(-0.015, 0.368, 0.036), new THREE.Vector3(-0.048, 0.028, 0.012), new THREE.Vector3(-0.085, 0.048, 0.018));

  // 3) 左下主大紅球（位置不變！）＋ 2 根短巧純金分枝
  const b3 = [
    new THREE.Vector3(-0.145, 0.125, 0.045),
    new THREE.Vector3(-0.235, 0.165, 0.072),
    new THREE.Vector3(-0.305, 0.205, 0.088)
  ];
  addBranchTipPomV44(b3, 0.053);
  addShortGoldTwigV45(new THREE.Vector3(-0.212, 0.155, 0.065), new THREE.Vector3(-0.032, -0.028, 0.020), new THREE.Vector3(-0.062, -0.046, 0.032));
  addShortGoldTwigV45(new THREE.Vector3(-0.232, 0.165, 0.072), new THREE.Vector3(-0.018, 0.040, 0.018), new THREE.Vector3(-0.032, 0.072, 0.028));

  // 4) 左上交錯主大紅球 A（位置不變！）＋ 2 根短巧純金分枝
  const b4 = [
    new THREE.Vector3(-0.095, 0.215, 0.038),
    new THREE.Vector3(-0.148, 0.320, 0.055),
    new THREE.Vector3(-0.182, 0.415, 0.068)
  ];
  addBranchTipPomV44(b4, 0.052);
  addShortGoldTwigV45(new THREE.Vector3(-0.132, 0.288, 0.050), new THREE.Vector3(0.034, 0.038, 0.014), new THREE.Vector3(0.062, 0.068, 0.022));
  addShortGoldTwigV45(new THREE.Vector3(-0.148, 0.322, 0.055), new THREE.Vector3(-0.042, 0.022, 0.014), new THREE.Vector3(-0.076, 0.036, 0.022));

  // 5) 左上交錯主大紅球 B（位置不變！）＋ 1 根短巧純金分枝
  const b5 = [
    new THREE.Vector3(-0.135, 0.195, 0.018),
    new THREE.Vector3(-0.245, 0.275, 0.015),
    new THREE.Vector3(-0.322, 0.345, 0.010)
  ];
  addBranchTipPomV44(b5, 0.050);
  addShortGoldTwigV45(new THREE.Vector3(-0.228, 0.262, 0.016), new THREE.Vector3(-0.036, -0.020, 0.008), new THREE.Vector3(-0.068, -0.034, 0.012));

  // 6) 右冠緣補綴 1 根短巧純金分枝平衡枝狀氣勢（無小紅球！）
  addShortGoldTwigV45(new THREE.Vector3(0.148, 0.135, 0.030), new THREE.Vector3(0.048, 0.022, 0.014), new THREE.Vector3(0.088, 0.040, 0.022));

  headPivot.add(crown);
  g.add(headPivot);
}

/**
 * 3. 右尊：黑面長鬚鎮殿神尊（鎮殿王爺）
 */
function buildRightWangYeV35(g, mats) {
  // 魁梧重工黑金盤龍刺繡王爺軀幹
  const torsoPts = [
    new THREE.Vector2(0.43, 0.00),
    new THREE.Vector2(0.42, 0.25),
    new THREE.Vector2(0.40, 0.52),
    new THREE.Vector2(0.37, 0.74),
    new THREE.Vector2(0.28, 0.86),
    new THREE.Vector2(0.14, 0.91)
  ];
  const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoPts, 28), mats.robe);
  torso.scale.set(1.15, 1.0, 0.80);
  torso.position.set(0, 0.76, -0.02);
  torso.castShadow = true;
  g.add(torso);

  // ★ V48 右尊拿掉披肩，保留俐落雙層白綢＋古金漢服立領「領子」(skipYoke=true) 搭配身後深紅金邊大「披風」！
  addEmbroideredCollarAndShawl(g, 1.66, 1.06, mats.sleeveRobe, mats.antiqueGold, mats.whiteSilk, true);

  // ★ V38.2 擬真曲線車旋頸部（魁梧穩重無縫銜接下頷）
  g.add(buildSculptedNeckV38(mats, { baseY: 1.56, height: 0.35, rBase: 0.138, rMid: 0.096, rTop: 0.110, zPos: 0.030 }));

  // ★ V46 威嚴深紅金邊絲綢後披風（嚴格披掛於肩背後方、收於太師椅扶手內側 |x|<=0.515、椅座上方 y>=0.59、椅背前方 z>=-0.374，100% 絕不穿過椅子！）
  {
    const segU = 36;
    const segV = 20;
    const cPos = [];
    const cUv = [];
    const cIdx = [];
    const lEdge = [];
    const rEdge = [];
    for (let iv = 0; iv <= segV; iv++) {
      const v = iv / segV;
      for (let iu = 0; iu <= segU; iu++) {
        const u = iu / segU;
        const nx = u * 2 - 1;
        const halfW = 0.375 + Math.sin(v * Math.PI * 0.52) * 0.140; // 最大 0.515，嚴格位於扶手內側 (0.58) 零穿椅！
        const x = nx * halfW;
        const wingWrap = Math.pow(Math.abs(nx), 2.1) * (0.145 - v * 0.055);
        const backDepth = -0.354 - (1 - Math.pow(Math.abs(nx), 1.5)) * (0.012 + v * 0.008);
        const pleat = Math.sin(nx * Math.PI * 4.0) * 0.0075 * Math.pow(v, 0.85);
        const z = Math.max(-0.374, backDepth + wingWrap + pleat);
        const y = 1.625 - Math.abs(nx) * 0.025 - v * 1.035; // 止於 y=0.59 椅座上方！
        cPos.push(x, y, z);
        cUv.push(u, 1.0 - v);
        if (iu === 0) lEdge.push(new THREE.Vector3(x, y, z));
        if (iu === segU) rEdge.push(new THREE.Vector3(x, y, z));
      }
    }
    const st = segU + 1;
    for (let iv = 0; iv < segV; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = iv * st + iu;
        const b = a + 1;
        const c = (iv + 1) * st + iu;
        const d = c + 1;
        cIdx.push(a, b, c, b, d, c);
      }
    }
    const cGeo = new THREE.BufferGeometry();
    cGeo.setAttribute('position', new THREE.Float32BufferAttribute(cPos, 3));
    cGeo.setAttribute('uv', new THREE.Float32BufferAttribute(cUv, 2));
    cGeo.setIndex(cIdx);
    cGeo.computeVertexNormals();
    const backCapeMesh = new THREE.Mesh(cGeo, mats.crimsonCape);
    backCapeMesh.castShadow = true;
    g.add(
      backCapeMesh,
      new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lEdge), 22, 0.0082, 6, false), mats.shinyGoldFoil),
      new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rEdge), 22, 0.0082, 6, false), mats.shinyGoldFoil)
    );
  }

  // ★ V48 一體端坐黑金盤龍刺繡長袍下裳（底擺微提至 y=0.362 優雅覆於厚白底黑金朝靴上緣，零穿幫！）
  const seatedDrape = buildSeatedRobeDrapeV37(mats.robe, {
    waistY: 0.94,
    bottomY: 0.362,
    halfWTop: 0.46,
    halfWBot: 0.52,
    zWaist: 0.24,
    zKnee: 0.455,
    zHem: 0.394,
    thighSpread: 0.29,
    thighBulge: 0.072,
    pleatAmp: 0.015
  });
  g.add(seatedDrape);

  // ★ V48 雙腳黑金盤龍雲紋白厚底刺繡朝靴（靴筒藏於袍擺下方，僅展露精緻朝靴鞋面與金雲翹頭！）
  [-1, 1].forEach((s) => {
    const shoe = buildCloudToeBootV38(mats.shoeMat, mats.whiteSilk, mats.shinyGoldFoil, 1.03, mats.shinyGoldFoil);
    shoe.rotation.y = s * 0.17;
    shoe.position.set(s * 0.28, 0.315, 0.388);
    g.add(shoe);
  });

  // ★ V46 右尊更寬平展魁梧雙肩＋絲滑垂墜自然折痕長袖＋華美寬大袖口＋威嚴雙手穩放大腿中段！
  [-1, 1].forEach((s) => {
    const sleevePts = [
      new THREE.Vector3(s * 0.345, 1.540, -0.02),
      new THREE.Vector3(s * 0.525, 1.370, 0.02),
      new THREE.Vector3(s * 0.525, 1.125, 0.13),
      new THREE.Vector3(s * 0.365, 0.972, 0.318)
    ];
    const hand = buildSculptedHandV35(mats, 'rest', 1.05);
    const handPos = new THREE.Vector3(s * 0.308, 0.934, 0.356);
    const arm = createSeamlessEmbroideredArm(
      sleevePts,
      (t) => 0.124 - t * 0.024 + Math.sin(t * Math.PI) * 0.027 + Math.pow(Math.max(0, t - 0.72) / 0.28, 2) * 0.018,
      mats.sleeveRobe,
      mats.shinyGoldFoil,
      mats.woodSkin,
      hand,
      handPos,
      null,
      -s,
      { drapeDepth: 0.142, elbowT: 0.55, foldAmp: 0.014, cuffDrape: 0.46, handInwardX: -s * 0.24, ornateCuff: true }
    );
    g.add(arm);
  });

  // ★ V46 右尊一體成型柔順絲滑垂肩長髮幕（完全擺脫一條一條感、零破圖且不穿過椅背！）
  g.add(buildWangYeLongBackHairV43(mats));

  // ★ V48 順服貼合黑金龍袍肩線之雙肩 X 型交叉朱紅金繡紅綾（移除披肩後重新服貼降回原肩弧，零浮空零翹角！）
  const sashLtoR = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.165, 1.612, -0.095),
    new THREE.Vector3(-0.242, 1.652, 0.068),
    new THREE.Vector3(-0.282, 1.568, 0.236),
    new THREE.Vector3(-0.278, 1.405, 0.352),
    new THREE.Vector3(-0.198, 1.180, 0.420),
    new THREE.Vector3(-0.030, 0.885, 0.492),
    new THREE.Vector3(0.135, 0.580, 0.515),
    new THREE.Vector3(0.215, 0.250, 0.485)
  ]);
  const sashRtoL = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.165, 1.612, -0.095),
    new THREE.Vector3(0.242, 1.652, 0.072),
    new THREE.Vector3(0.282, 1.568, 0.246),
    new THREE.Vector3(0.278, 1.405, 0.366),
    new THREE.Vector3(0.198, 1.180, 0.435),
    new THREE.Vector3(0.030, 0.885, 0.510),
    new THREE.Vector3(-0.135, 0.580, 0.533),
    new THREE.Vector3(-0.215, 0.250, 0.504)
  ]);
  g.add(buildRibbonMesh(sashLtoR, 0.172, mats.sashTempleA, 50, false, false));
  g.add(buildRibbonMesh(sashRtoL, 0.172, mats.sashTempleB, 50, false, false));

  // V41 3D 精雕威嚴啞光古樟烏木黑面頭像
  const { headGroup } = buildSculptedHeadV35('rightBeardKing', mats);
  headGroup.position.set(0, 1.94, 0.04);
  g.add(headGroup);

  // ★ 貼面耳旁濃密啞光真髮長落腮鬍
  g.add(buildVolumetricRoyalBeardV38(mats));

  // ★ V46 整理後自然掛於龍頭扶手之 4 層大佛珠串（每串起訖點確實套掛於左右扶手龍頭 (x=±0.635, y=1.015, z=0.405)，重力自然垂弧＋母珠嚴密串接在珠串上零懸空！）
  const beadSpecsV46 = [
    { yMid: 0.785, zMid: 0.562, xShift: -0.012, n: 48, r: 0.0235 },
    { yMid: 0.645, zMid: 0.584, xShift: 0.015, n: 54, r: 0.0245 },
    { yMid: 0.495, zMid: 0.604, xShift: -0.010, n: 60, r: 0.0255 },
    { yMid: 0.355, zMid: 0.620, xShift: 0.008, n: 66, r: 0.0260 }
  ];
  let motherStrandCurve = null;
  beadSpecsV46.forEach((bg, idx) => {
    const dropSideY = 0.925 - idx * 0.022;
    const dropSideZ = 0.465 + idx * 0.012;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.632, 1.015, 0.402),
      new THREE.Vector3(-0.652, dropSideY, dropSideZ),
      new THREE.Vector3(-0.410, bg.yMid + (1.01 - bg.yMid) * 0.34, (dropSideZ + bg.zMid) * 0.53),
      new THREE.Vector3(bg.xShift, bg.yMid, bg.zMid),
      new THREE.Vector3(0.410, bg.yMid + (1.01 - bg.yMid) * 0.34, (dropSideZ + bg.zMid) * 0.53),
      new THREE.Vector3(0.652, dropSideY, dropSideZ),
      new THREE.Vector3(0.632, 1.015, 0.402)
    ]);
    if (idx === 1) motherStrandCurve = curve;
    g.add(buildBeadStrand(curve, bg.n, bg.r, mats.darkBead));
  });

  // 左右扶手龍頭處整齊套圈收束（緊密貼合龍頭木柱不雜亂！）
  [-1, 1].forEach((s) => {
    const coilCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.585, 1.022, 0.365),
      new THREE.Vector3(s * 0.642, 1.032, 0.418),
      new THREE.Vector3(s * 0.682, 0.992, 0.432),
      new THREE.Vector3(s * 0.652, 0.942, 0.412),
      new THREE.Vector3(s * 0.592, 0.955, 0.370)
    ]);
    g.add(buildBeadStrand(coilCurve, 11, 0.022, mats.darkBead));
  });

  // 母珠＋金扣環＋雙股重力垂墜小珠尾穗（直接串接於第 2 層珠串實體曲線上，100% 絕不懸空！）
  if (motherStrandCurve) {
    const mPt = motherStrandCurve.getPointAt(0.56);
    const motherBead = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 10), mats.darkBead);
    motherBead.position.copy(mPt);
    const motherCollar = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0058, 7, 16), mats.shinyGoldFoil);
    motherCollar.rotation.x = Math.PI / 2;
    motherCollar.position.set(mPt.x, mPt.y - 0.032, mPt.z + 0.002);
    g.add(motherBead, motherCollar);
    [-0.020, 0.020].forEach((dx) => {
      const dropCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(mPt.x + dx * 0.35, mPt.y - 0.042, mPt.z + 0.004),
        new THREE.Vector3(mPt.x + dx * 0.85, mPt.y - 0.145, mPt.z + 0.012),
        new THREE.Vector3(mPt.x + dx * 1.05, mPt.y - 0.255, mPt.z + 0.016)
      ]);
      g.add(buildBeadStrand(dropCurve, 7, 0.0165, mats.darkBead));
      const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.068, 8), mats.crimsonSilk);
      tassel.position.set(mPt.x + dx * 1.06, mPt.y - 0.296, mPt.z + 0.017);
      g.add(tassel);
    });
  }

  // ★ V41 精比例古金色「金鉑片雕花皇冠」（正中橫向黑色長方形寶石＋四顆亮金珠＋兩側垂掛輪型帶刺金鉑片！）
  const crown = new THREE.Group();
  crown.position.set(0, 2.085, 0.04);

  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.228, 0.220, 0.080, 24), mats.crownFiligree);
  band.position.y = 0.024;
  const bandTop = new THREE.Mesh(new THREE.TorusGeometry(0.230, 0.014, 8, 26), mats.brightGold);
  bandTop.rotation.x = Math.PI / 2;
  bandTop.position.y = 0.064;
  const bandBot = new THREE.Mesh(new THREE.TorusGeometry(0.222, 0.013, 8, 26), mats.brightGold);
  bandBot.rotation.x = Math.PI / 2;
  bandBot.position.y = -0.016;
  crown.add(band, bandTop, bandBot);

  // ★ V41 額帶中央改為「橫向黑色長方形寶石＋金框」，其餘四顆全面改為金色寶珠！
  const blackGemBezel = new THREE.Mesh(new RoundedBoxGeometry(0.098, 0.052, 0.018, 2, 0.005), mats.goldFoil);
  blackGemBezel.position.set(0, 0.025, 0.228);
  const blackRectGem = new THREE.Mesh(new RoundedBoxGeometry(0.084, 0.038, 0.024, 2, 0.005), mats.blackOnyx);
  blackRectGem.position.set(0, 0.025, 0.232);
  crown.add(blackGemBezel, blackRectGem);

  [-0.58, -0.32, 0.32, 0.58].forEach((a) => {
    const goldStud = new THREE.Mesh(new THREE.SphereGeometry(0.021, 10, 8), mats.goldFoil);
    goldStud.position.set(Math.sin(a) * 0.229, 0.025, Math.cos(a) * 0.229);
    const studBezel = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0055, 6, 12), mats.brightGold);
    studBezel.position.set(Math.sin(a) * 0.226, 0.025, Math.cos(a) * 0.226);
    studBezel.rotation.y = a;
    crown.add(goldStud, studBezel);
  });

  // 三層冠身全數縮高 30%（總頂高由 0.775 降為 0.545！）
  const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.234, 0.155, 18), mats.crownFiligree);
  tier1.position.y = 0.130;
  const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.205, 0.155, 16), mats.crownFiligree);
  tier2.position.y = 0.255;
  const tier3 = new THREE.Mesh(new THREE.ConeGeometry(0.145, 0.165, 14), mats.crownFiligree);
  tier3.position.y = 0.378;
  crown.add(tier1, tier2, tier3);

  [
    { y: 0.138, r: 0.136, z: 0.156 },
    { y: 0.264, r: 0.106, z: 0.125 },
    { y: 0.362, r: 0.068, z: 0.085 }
  ].forEach((ar) => {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(ar.r, 0.019, 8, 18, Math.PI), mats.brightGold);
    arch.position.set(0, ar.y, ar.z);
    crown.add(arch);
  });

  // ★ V45 額帶上下細密手工連珠金粒飾邊，華麗拱衛橫向黑寶石與四顆亮金珠！
  const wBandBeadGeo = new THREE.SphereGeometry(0.0066, 6, 5);
  for (let b = 0; b < 32; b++) {
    const ba = (b / 32) * Math.PI * 2;
    const tb = new THREE.Mesh(wBandBeadGeo, mats.shinyGoldFoil);
    tb.position.set(Math.sin(ba) * 0.234, 0.056, Math.cos(ba) * 0.234);
    const bb = new THREE.Mesh(wBandBeadGeo, mats.shinyGoldFoil);
    bb.position.set(Math.sin(ba) * 0.226, -0.008, Math.cos(ba) * 0.226);
    crown.add(tb, bb);
  }

  const topJewel = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 10), mats.shinyGoldFoil);
  topJewel.position.set(0, 0.456, 0.02);
  const topHalo = new THREE.Mesh(new THREE.TorusGeometry(0.054, 0.0055, 7, 22), mats.shinyGoldFoil);
  topHalo.position.set(0, 0.462, 0.014);
  const topSpire = new THREE.Mesh(new THREE.ConeGeometry(0.020, 0.088, 10), mats.shinyGoldFoil);
  topSpire.position.set(0, 0.512, 0.02);
  crown.add(topJewel, topHalo, topSpire);

  // ★ V45 右尊皇冠「極致精緻美化三層無縫密疊鑿花金鉑片」（1024px 鑿花正規化 UV＋鏤雕內蓮心＋細連珠金絲＋鑲玉金珠蕊，皇室金銀帽工藝！）
  const createGoldFoilPlaque = (w, h, useShiny = false, addEmeraldDot = false) => {
    const foilGrp = new THREE.Group();
    const sh = new THREE.Shape();
    sh.moveTo(0, -h * 0.50);
    sh.bezierCurveTo(-w * 0.68, -h * 0.24, -w * 0.60, h * 0.28, 0, h * 0.58);
    sh.bezierCurveTo(w * 0.60, h * 0.28, w * 0.68, -h * 0.24, 0, -h * 0.50);
    sh.closePath();
    const plate = new THREE.Mesh(
      normalizeExtrudeUVs(new THREE.ExtrudeGeometry(sh, { depth: 0.0055, bevelEnabled: true, bevelThickness: 0.0022, bevelSize: 0.0020, bevelSegments: 2 })),
      useShiny ? mats.shinyGoldFoil : mats.goldFoil
    );
    plate.position.z = -0.0028;
    // 雙層精雕蓮瓣浮雕心片＋細雕金脈＋連珠小金粒＋花芯寶珠（主片點綴雅致小翠玉／亮金珠！）
    const innerLeaf = new THREE.Mesh(
      normalizeExtrudeUVs(new THREE.ExtrudeGeometry(sh, { depth: 0.0028, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 1 })),
      useShiny ? mats.goldFoil : mats.shinyGoldFoil
    );
    innerLeaf.scale.set(0.66, 0.68, 1.0);
    innerLeaf.position.set(0, -h * 0.02, 0.0044);
    const midRib = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0030, h * 0.74, 6), mats.shinyGoldFoil);
    midRib.position.set(0, h * 0.03, 0.0072);
    const heartRing = new THREE.Mesh(new THREE.TorusGeometry(w * 0.16, 0.0026, 6, 14), mats.shinyGoldFoil);
    heartRing.position.set(0, -h * 0.04, 0.0078);
    const boss = new THREE.Mesh(new THREE.SphereGeometry(w * 0.125, 8, 7), addEmeraldDot ? mats.emeraldJade : mats.shinyGoldFoil);
    boss.scale.set(1.0, 1.25, 0.55);
    boss.position.set(0, -h * 0.04, 0.0085);
    const tipDot = new THREE.Mesh(new THREE.SphereGeometry(w * 0.072, 6, 5), mats.shinyGoldFoil);
    tipDot.position.set(0, h * 0.46, 0.0068);
    // 兩側弧緣連珠微金粒
    const sideDotGeo = new THREE.SphereGeometry(w * 0.048, 5, 4);
    [-1, 1].forEach((sd) => {
      const d1 = new THREE.Mesh(sideDotGeo, mats.shinyGoldFoil);
      d1.position.set(sd * w * 0.34, h * 0.08, 0.0062);
      const d2 = new THREE.Mesh(sideDotGeo, mats.shinyGoldFoil);
      d2.position.set(sd * w * 0.24, h * 0.28, 0.0062);
      foilGrp.add(d1, d2);
    });
    foilGrp.add(plate, innerLeaf, midRib, heartRing, boss, tipDot);
    return foilGrp;
  };

  // 3 層緊密交錯疊壓金鉑片（每層與鄰片重疊約 35%、上下層相互覆蓋，徹底消除片間縫隙且細工璀璨！）
  const foilTiers = [
    { count: 11, angSpan: Math.PI * 1.06, r: 0.238, y: 0.138, w: 0.104, h: 0.138, tiltX: -0.14, shiny: false, gemRow: false },
    { count: 9, angSpan: Math.PI * 0.94, r: 0.205, y: 0.245, w: 0.094, h: 0.130, tiltX: -0.18, shiny: true, gemRow: true },
    { count: 7, angSpan: Math.PI * 0.80, r: 0.150, y: 0.358, w: 0.080, h: 0.118, tiltX: -0.22, shiny: false, gemRow: false }
  ];
  foilTiers.forEach((tr) => {
    for (let i = 0; i < tr.count; i++) {
      const frac = tr.count === 1 ? 0.5 : i / (tr.count - 1);
      const a = (frac - 0.5) * tr.angSpan;
      const rLayer = tr.r + (i % 2 === 0 ? 0.005 : -0.003);
      const isCenterHero = tr.gemRow && (i === 4 || i === 2 || i === 6);
      const plaque = createGoldFoilPlaque(tr.w, tr.h, tr.shiny || i % 2 === 1, isCenterHero);
      plaque.position.set(Math.sin(a) * rLayer, tr.y + (i % 2 === 0 ? 0.008 : 0), Math.cos(a) * rLayer);
      plaque.rotation.set(tr.tiltX, a, -a * 0.22);
      crown.add(plaque);
    }
  });
  // 冠頂正前 3 片疊壓火焰金鉑頂冠飾
  [-0.30, 0, 0.30].forEach((a, idx) => {
    const topFoil = createGoldFoilPlaque(0.064, 0.098, idx === 1, idx === 1);
    topFoil.position.set(Math.sin(a) * 0.092, 0.445 + (idx === 1 ? 0.015 : 0), Math.cos(a) * 0.092);
    topFoil.rotation.set(-0.16, a, -a * 0.20);
    crown.add(topFoil);
  });

  // ★ V45 右尊神冠兩側極致美化「精工鏤雕輪型帶刺金鉑片」（1024px 鑿花正規化＋雙層連珠細環＋8 道精雕輻條＋翠玉金花心！）
  const createSpikedWheelFoilV41 = (outerR, spikes = 14) => {
    const wGrp = new THREE.Group();
    const sh = new THREE.Shape();
    const innerR = outerR * 0.66;
    for (let i = 0; i < spikes * 2; i++) {
      const ang = (i / (spikes * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? outerR : innerR;
      const px = Math.cos(ang) * r;
      const py = Math.sin(ang) * r;
      if (i === 0) sh.moveTo(px, py);
      else sh.lineTo(px, py);
    }
    sh.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, 0, outerR * 0.36, 0, Math.PI * 2, true);
    sh.holes.push(hole);

    const wheelPlate = new THREE.Mesh(
      normalizeExtrudeUVs(new THREE.ExtrudeGeometry(sh, { depth: 0.0065, bevelEnabled: true, bevelThickness: 0.0024, bevelSize: 0.0020, bevelSegments: 2 })),
      mats.shinyGoldFoil
    );
    wheelPlate.position.z = -0.0032;
    wGrp.add(wheelPlate);

    const outerBeadRing = new THREE.Mesh(new THREE.TorusGeometry(outerR * 0.60, 0.0042, 6, 26), mats.shinyGoldFoil);
    outerBeadRing.position.z = 0.004;
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(outerR * 0.42, 0.0055, 6, 22), mats.brightGold);
    innerRing.position.z = 0.0045;
    wGrp.add(outerBeadRing, innerRing);
    // 14 顆細密輪緣連珠金粒
    const wbGeo = new THREE.SphereGeometry(0.0045, 6, 5);
    for (let k = 0; k < spikes; k++) {
      const ka = (k / spikes) * Math.PI * 2;
      const wb = new THREE.Mesh(wbGeo, mats.shinyGoldFoil);
      wb.position.set(Math.cos(ka) * outerR * 0.60, Math.sin(ka) * outerR * 0.60, 0.007);
      wGrp.add(wb);
    }
    for (let sp = 0; sp < 8; sp++) {
      const sa = (sp / 8) * Math.PI;
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.0032, 0.0032, outerR * 0.86, 6), mats.shinyGoldFoil);
      spoke.rotation.z = sa;
      wGrp.add(spoke);
    }
    const hubBezel = new THREE.Mesh(new THREE.TorusGeometry(outerR * 0.21, 0.005, 6, 16), mats.shinyGoldFoil);
    hubBezel.position.z = 0.005;
    const hub = new THREE.Mesh(new THREE.SphereGeometry(outerR * 0.18, 9, 8), mats.emeraldJade);
    hub.scale.set(1, 1, 0.55);
    hub.position.z = 0.006;
    wGrp.add(hubBezel, hub);
    return wGrp;
  };

  [-1, 1].forEach((s) => {
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0.02);
    wingShape.bezierCurveTo(s * 0.11, 0.035, s * 0.18, 0.11, s * 0.16, 0.20);
    wingShape.bezierCurveTo(s * 0.09, 0.17, s * 0.04, 0.12, 0, 0.14);
    wingShape.closePath();
    const wingPlate = new THREE.Mesh(
      new THREE.ExtrudeGeometry(wingShape, { depth: 0.020, bevelEnabled: true, bevelThickness: 0.007, bevelSize: 0.005, bevelSegments: 2 }),
      mats.crownFiligree
    );
    wingPlate.position.set(s * 0.20, 0.03, 0.05);
    crown.add(wingPlate);

    // 單對放大版「輪型帶刺金鉑片」（outerR=0.106、14 刺，直接緊密貼接冠翼，無下方小輪與支撐細線！）
    const wheelTop = createSpikedWheelFoilV41(0.106, 14);
    wheelTop.position.set(s * 0.278, -0.048, 0.072);
    wheelTop.rotation.set(0, s * 0.24, s * -0.06);
    crown.add(wheelTop);
  });

  g.add(crown);
}

/**
 * 對外匯出主建構函式：建立 V37 極致刺繡四肢連貫三尊主神
 */
export function createAuthenticPhotoDeityV35(variant) {
  const g = new THREE.Group();
  g.name = `deity_v35_${variant}`;

  const woodTex = createAntiqueCarvedWoodTextureV35();
  const reliefTex = createWoodPlinthReliefTextureV35();

  // ★ V37 左右兩尊紅綾文字統一為「雲林馬鳴山鎮安宮祖廟」＆「鎮安宮五年千歲祖廟」
  const sashTexA = createDeitySashTextureV35('雲林馬鳴山鎮安宮祖廟');
  const sashTexB = createDeitySashTextureV35('鎮安宮五年千歲祖廟');

  const goldFoilTex = createEmbossedGoldFoilTexturesV44();
  const embroideryBump = createEmbroideryBumpTextureV46();
  const shoeTex = createDeityShoeTextureV46(variant);
  const silkyHairTex = createSilkyHairTextureV46();
  const faceTex = createDeityFaceTexture(variant);

  const mats = {
    woodDark: new THREE.MeshStandardMaterial({
      map: woodTex, color: 0x5B4133, emissive: 0x160C07, emissiveIntensity: 0.22, roughness: 0.56, metalness: 0.06
    }),
    woodMid: new THREE.MeshStandardMaterial({
      map: woodTex, color: 0x7A5946, emissive: 0x1C110A, emissiveIntensity: 0.24, roughness: 0.50, metalness: 0.07
    }),
    woodLight: new THREE.MeshStandardMaterial({
      map: woodTex, color: 0x946D57, emissive: 0x20130C, emissiveIntensity: 0.24, roughness: 0.48, metalness: 0.08
    }),
    woodRelief: new THREE.MeshStandardMaterial({
      map: reliefTex, color: 0xA88068, emissive: 0x1E120B, emissiveIntensity: 0.26, roughness: 0.50, metalness: 0.06
    }),
    // ★ V55 古樟木溫潤實木質感（左尊回歸溫潤蜜琥珀古樟木膚色 0xA87650，自然木光不偏白，與開面木雕臉龐渾然一體！）
    woodSkin: new THREE.MeshStandardMaterial({
      color: variant === 'leftMother' ? 0xA87650 : variant === 'centerKing' ? 0x624A3B : 0x4A4248,
      emissive: variant === 'rightBeardKing' ? 0x201C22 : variant === 'centerKing' ? 0x20150F : 0x3A2110,
      emissiveIntensity: variant === 'rightBeardKing' ? 0.32 : variant === 'centerKing' ? 0.30 : 0.28,
      roughness: variant === 'centerKing' ? 0.46 : variant === 'rightBeardKing' ? 0.58 : 0.46,
      metalness: variant === 'centerKing' ? 0.05 : variant === 'leftMother' ? 0.06 : 0.02,
      side: THREE.DoubleSide
    }),
    woodEarHollow: new THREE.MeshStandardMaterial({
      color: variant === 'leftMother' ? 0x6E472D : variant === 'centerKing' ? 0x35251D : 0x28222B,
      roughness: 0.78,
      metalness: 0.01
    }),
    face: new THREE.MeshStandardMaterial({
      map: faceTex,
      // ★ V55 左尊保留真實樟木雕紋理與柔和立體漆光（emissiveIntensity 收斂至 0.24：陰影柔和不發黑、絕不發白！）
      bumpMap: variant === 'leftMother' ? woodTex : null,
      bumpScale: variant === 'leftMother' ? 0.0045 : 0,
      emissiveMap: variant === 'leftMother' ? faceTex : null,
      emissive: variant === 'leftMother' ? 0xEED4BC : variant === 'rightBeardKing' ? 0x201C22 : 0x1C120C,
      emissiveIntensity: variant === 'leftMother' ? 0.24 : variant === 'rightBeardKing' ? 0.30 : 0.25,
      roughness: variant === 'centerKing' ? 0.46 : variant === 'rightBeardKing' ? 0.58 : 0.45,
      metalness: variant === 'centerKing' ? 0.05 : variant === 'leftMother' ? 0.06 : 0.02
    }),
    // ★ V49 極致精緻立體盤金刺繡錦緞神衣（強化 3D 織錦與盤金浮雕立體深度！）
    robe: new THREE.MeshStandardMaterial({
      map: createDeityEmbroideryTextureV37(variant),
      bumpMap: embroideryBump,
      bumpScale: 0.019,
      roughness: 0.62,
      metalness: 0.12,
      side: THREE.DoubleSide
    }),
    sleeveRobe: new THREE.MeshStandardMaterial({
      map: createDeitySleeveEmbroideryTextureV37(variant),
      bumpMap: embroideryBump,
      bumpScale: 0.018,
      roughness: 0.60,
      metalness: 0.13,
      side: THREE.DoubleSide
    }),
    // ★ V46 三尊神明專屬精緻手工刺繡錦緞鞋履材質（含立體刺繡凹凸貼圖！）
    shoeMat: new THREE.MeshStandardMaterial({
      map: shoeTex.map,
      bumpMap: shoeTex.bumpMap,
      bumpScale: 0.015,
      roughness: 0.52,
      metalness: 0.16
    }),
    // ★ V48 右尊柔順直梳真長髮專屬絲滑材質（高解析直梳髮絲＋溫潤絲緞光澤！）
    silkyHair: new THREE.MeshStandardMaterial({
      map: silkyHairTex.map,
      bumpMap: silkyHairTex.bumpMap,
      bumpScale: 0.036,
      color: 0xFFFFFF,
      emissive: 0x262230,
      emissiveIntensity: 0.42,
      roughness: 0.32,
      metalness: 0.18,
      side: THREE.DoubleSide
    }),
    // ★ V38 左側神明頭冠上方「黃色刺繡三角帽巾」材質（自然絲緞啞光）
    yellowHood: new THREE.MeshStandardMaterial({
      map: createYellowEmbroideredHoodTextureV38(),
      emissive: 0x352004,
      emissiveIntensity: 0.18,
      roughness: 0.64,
      metalness: 0.06,
      side: THREE.DoubleSide
    }),
    whiteSilk: new THREE.MeshStandardMaterial({
      color: 0xFFF7E8,
      roughness: 0.62,
      metalness: 0.04
    }),
    centerFrontApron: new THREE.MeshStandardMaterial({
      map: createGoldEmbroideryReliefTextureV35('mazuChest'),
      color: 0xDC621E,
      emissive: 0x381504,
      emissiveIntensity: 0.22,
      roughness: 0.48,
      metalness: 0.22,
      side: THREE.DoubleSide
    }),
    crownFiligree: new THREE.MeshStandardMaterial({
      map: createGoldEmbroideryReliefTextureV35('crownFiligree'),
      bumpMap: goldFoilTex.bumpMap,
      bumpScale: 0.022,
      roughnessMap: goldFoilTex.roughnessMap,
      emissive: 0x5C3A08,
      emissiveIntensity: 0.42,
      roughness: 0.44,
      metalness: 0.64
    }),
    lionBellyMat: new THREE.MeshStandardMaterial({
      map: createCenterLionPatchTextureV37(),
      transparent: true,
      alphaTest: 0.15,
      roughness: 0.44,
      metalness: 0.22,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2
    }),
    antiqueGold: new THREE.MeshStandardMaterial({
      color: 0xE6B954,
      emissive: 0x523206,
      emissiveIntensity: 0.38,
      metalness: 0.58,
      roughness: 0.28
    }),
    brightGold: new THREE.MeshStandardMaterial({
      color: 0xFAD774,
      emissive: 0x6C460A,
      emissiveIntensity: 0.46,
      metalness: 0.68,
      roughness: 0.18
    }),
    // ★ V54 24K 台灣神帽安金工藝「三通道 PBR 鑿花金鉑材質」（凸花鏡面閃金、凹紋古金立體層次！）
    goldFoil: new THREE.MeshStandardMaterial({
      map: goldFoilTex.map,
      bumpMap: goldFoilTex.bumpMap,
      bumpScale: 0.034,
      roughnessMap: goldFoilTex.roughnessMap,
      color: 0xFFF2AE,
      emissive: 0x8F620D,
      emissiveIntensity: 0.50,
      metalness: 0.84,
      roughness: 0.34,
      side: THREE.DoubleSide
    }),
    // ★ V54 超閃亮鎏金細工浮雕鏡面金鉑貼片材質
    shinyGoldFoil: new THREE.MeshStandardMaterial({
      map: goldFoilTex.map,
      bumpMap: goldFoilTex.bumpMap,
      bumpScale: 0.038,
      roughnessMap: goldFoilTex.roughnessMap,
      color: 0xFFFAD2,
      emissive: 0xBA8818,
      emissiveIntensity: 0.62,
      metalness: 0.92,
      roughness: 0.26,
      side: THREE.DoubleSide
    }),
    // ★ V54 中間神明神冠專屬「細小細碎 24K 鏡面浮雕金鉑」
    microGoldFoil: new THREE.MeshStandardMaterial({
      map: goldFoilTex.map,
      bumpMap: goldFoilTex.bumpMap,
      bumpScale: 0.032,
      roughnessMap: goldFoilTex.roughnessMap,
      color: 0xFFFBE0,
      emissive: 0xC6931C,
      emissiveIntensity: 0.66,
      metalness: 0.95,
      roughness: 0.22,
      side: THREE.DoubleSide
    }),
    microGoldFoilAlt: new THREE.MeshStandardMaterial({
      map: goldFoilTex.map,
      bumpMap: goldFoilTex.bumpMap,
      bumpScale: 0.032,
      roughnessMap: goldFoilTex.roughnessMap,
      color: 0xFFEC96,
      emissive: 0xA87612,
      emissiveIntensity: 0.56,
      metalness: 0.90,
      roughness: 0.28,
      side: THREE.DoubleSide
    }),
    // ★ V46 中尊橘金如意雲肩披肩刺繡材質（附立體盤金凹凸貼圖！）
    marshalShawlMat: new THREE.MeshStandardMaterial({
      map: createDeitySleeveEmbroideryTextureV37('centerKing'),
      bumpMap: embroideryBump,
      bumpScale: 0.014,
      color: 0xF79A3E,
      emissive: 0x3D1805,
      emissiveIntensity: 0.22,
      roughness: 0.58,
      metalness: 0.14,
      side: THREE.DoubleSide
    }),
    goldShawlMat: new THREE.MeshStandardMaterial({
      map: createGoldEmbroideryReliefTextureV35('mazuChest'),
      color: 0xEBC262,
      emissive: 0x4E3208,
      emissiveIntensity: 0.28,
      metalness: 0.26,
      roughness: 0.52,
      side: THREE.DoubleSide
    }),
    bronzeGold: new THREE.MeshStandardMaterial({
      color: 0xB88838,
      emissive: 0x2E1B05,
      emissiveIntensity: 0.26,
      metalness: 0.40,
      roughness: 0.38
    }),
    // ★ V40 中尊偏黑亮澤玄鐵武器材質（玄黑槍桿／暗烏金束飾／亮澤玄鋼鋒刃！）
    darkSpearShaft: new THREE.MeshStandardMaterial({
      color: 0x221E1D,
      emissive: 0x0B0908,
      emissiveIntensity: 0.22,
      metalness: 0.56,
      roughness: 0.24
    }),
    darkSpearTrim: new THREE.MeshStandardMaterial({
      color: 0x6A542A,
      emissive: 0x1E1407,
      emissiveIntensity: 0.24,
      metalness: 0.62,
      roughness: 0.26
    }),
    darkSteelBlade: new THREE.MeshStandardMaterial({
      color: 0x3D4552,
      emissive: 0x161B26,
      emissiveIntensity: 0.30,
      metalness: 0.88,
      roughness: 0.14
    }),
    emeraldJade: new THREE.MeshStandardMaterial({
      color: 0x1F9356,
      emissive: 0x0A3D22,
      emissiveIntensity: 0.34,
      metalness: 0.16,
      roughness: 0.18
    }),
    pearl: new THREE.MeshStandardMaterial({
      color: 0xFAF5EC,
      emissive: 0x3E372E,
      emissiveIntensity: 0.24,
      metalness: 0.14,
      roughness: 0.18
    }),
    darkBead: new THREE.MeshStandardMaterial({
      color: 0x5D3D2D,
      emissive: 0x1A0E07,
      emissiveIntensity: 0.18,
      metalness: 0.10,
      roughness: 0.26
    }),
    crimsonSilk: new THREE.MeshStandardMaterial({
      color: 0xB61D22,
      emissive: 0x2A0507,
      emissiveIntensity: 0.14,
      roughness: 0.56,
      metalness: 0.05,
      side: THREE.DoubleSide
    }),
    crimsonCape: new THREE.MeshStandardMaterial({
      map: createCrimsonCapeTextureV35(),
      emissive: 0x200406,
      emissiveIntensity: 0.14,
      roughness: 0.60,
      metalness: 0.04,
      side: THREE.DoubleSide
    }),
    crimsonPom: new THREE.MeshStandardMaterial({
      color: 0xDC2620,
      emissive: 0x4E0907,
      emissiveIntensity: 0.26,
      roughness: 0.88,
      metalness: 0.02
    }),
    darkRedCord: new THREE.MeshStandardMaterial({
      color: 0x5E2220,
      roughness: 0.68,
      metalness: 0.04
    }),
    steelBlade: new THREE.MeshStandardMaterial({
      color: 0xA6B0BA,
      emissive: 0x282E35,
      emissiveIntensity: 0.28,
      metalness: 0.54,
      roughness: 0.22
    }),
    // ★ V41 右尊額帶正中央「黑色橫長方形寶石」（精雕黑曜瑪瑙寶石）
    blackOnyx: new THREE.MeshStandardMaterial({
      color: 0x0B0B0E,
      emissive: 0x030305,
      emissiveIntensity: 0.18,
      metalness: 0.28,
      roughness: 0.18
    }),
    // ★ V41 天然馬尾毛／真髮柔霧啞光神鬚材質（徹底消除玻璃與塑膠反光！）
    beardMat: new THREE.MeshStandardMaterial({
      map: createBeardHairTexture(false),
      color: 0x161418,
      emissive: 0x050406,
      emissiveIntensity: 0.14,
      roughness: 0.86,
      metalness: 0.02,
      side: THREE.DoubleSide
    }),
    beardSheenMat: new THREE.MeshStandardMaterial({
      map: createBeardHairTexture(false),
      color: 0x26242A,
      emissive: 0x09080B,
      emissiveIntensity: 0.16,
      roughness: 0.74,
      metalness: 0.04,
      side: THREE.DoubleSide
    }),
    sashTempleA: new THREE.MeshStandardMaterial({
      map: sashTexA,
      roughness: 0.54,
      metalness: 0.05,
      side: THREE.DoubleSide
    }),
    sashTempleB: new THREE.MeshStandardMaterial({
      map: sashTexB,
      roughness: 0.54,
      metalness: 0.05,
      side: THREE.DoubleSide
    })
  };

  g.add(buildCarvedThroneV35(variant, mats));

  if (variant === 'leftMother') {
    buildLeftMotherV35(g, mats);
  } else if (variant === 'centerKing') {
    buildCenterMarshalV35(g, mats);
  } else {
    buildRightWangYeV35(g, mats);
  }

  return g;
}
