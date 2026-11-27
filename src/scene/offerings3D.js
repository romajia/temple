/**
 * 3D 正殿供桌供品管理器
 * 依據資料層供品陣列（上限 12 份、滿 10 分鐘自動移除）動態渲染可愛 3D 供品
 */
import * as THREE from 'three';
import { createPineappleSkinTexture, createShouStickerTexture } from './canvasTextures.js';

let _pineappleTexCache = null;
function getPineappleTex() {
  if (!_pineappleTexCache) _pineappleTexCache = createPineappleSkinTexture();
  return _pineappleTexCache;
}
let _shouStickerTexCache = null;
function getShouStickerTex() {
  if (!_shouStickerTexCache) _shouStickerTexCache = createShouStickerTexture();
  return _shouStickerTexCache;
}

export class Offerings3DManager {
  constructor(tableTopCenter) {
    this.group = new THREE.Group();
    this.group.position.copy(tableTopCenter);
    this.meshes = new Map(); // id -> { mesh, targetScale }

    // ★ V34 配合左右大供桌略外移至 ±4.10，精準對齊左右各 6 格供品槽位！
    this.leftSlots = [];
    this.rightSlots = [];
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        this.leftSlots.push(new THREE.Vector3(-4.10 + (-0.98 + col * 0.98), 0.02, -0.28 + row * 0.56));
        this.rightSlots.push(new THREE.Vector3(4.10 + (-0.98 + col * 0.98), 0.02, -0.28 + row * 0.56));
      }
    }
    this.slots = [...this.leftSlots, ...this.rightSlots];
  }

  _createOfferingMesh(catalogId) {
    const g = new THREE.Group();

    // 底部紅金供盤
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.18, 0.05, 14),
      new THREE.MeshStandardMaterial({ color: 0xB92B27, roughness: 0.4 })
    );
    plate.position.y = 0.025;
    plate.castShadow = true;
    g.add(plate);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.23, 0.015, 6, 16),
      new THREE.MeshStandardMaterial({ color: 0xF2C94C, roughness: 0.35 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.05;
    g.add(rim);

    if (catalogId === 'pineapple') {
      // ★ V37 極致精雕旺來鳳梨（真實弧形多層 26 片細緻鳳梨冠葉＋高置果葉交界處之立體大紅緞帶蝴蝶結，絕不露出一截黃色！）
      const pinePts = [
        new THREE.Vector2(0.0, 0.0),
        new THREE.Vector2(0.088, 0.015),
        new THREE.Vector2(0.128, 0.068),
        new THREE.Vector2(0.144, 0.145),
        new THREE.Vector2(0.140, 0.225),
        new THREE.Vector2(0.118, 0.288),
        new THREE.Vector2(0.078, 0.326),
        new THREE.Vector2(0.0, 0.332)
      ];
      const body = new THREE.Mesh(
        new THREE.LatheGeometry(pinePts, 24),
        new THREE.MeshStandardMaterial({ map: getPineappleTex(), roughness: 0.48, metalness: 0.05 })
      );
      body.position.y = 0.055;
      body.castShadow = true;
      g.add(body);

      // 翠綠葉冠芯托（完全包覆果頂，徹底杜絕上方露出黃色果頂！）
      const crownBaseMat = new THREE.MeshStandardMaterial({ color: 0x1D5C31, roughness: 0.56 });
      const crownCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.082, 0.045, 16), crownBaseMat);
      crownCollar.position.y = 0.388;
      g.add(crownCollar);

      // 細緻弧形鳳梨劍葉幾何（帶自然弧彎、微凹葉槽與細尖葉梢！）
      const buildSwordLeafGeo = (len, w, arch) => {
        const segs = 6;
        const pos = [];
        const idx = [];
        for (let i = 0; i <= segs; i++) {
          const t = i / segs;
          const halfW = w * 0.5 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.5) * (1 - Math.pow(t, 1.35));
          const y = t * len;
          const z = Math.pow(t, 1.85) * arch;
          const cup = halfW * 0.32;
          pos.push(-halfW, y, z + cup, 0, y, z, halfW, y, z + cup);
          if (i < segs) {
            const r0 = i * 3;
            const r1 = r0 + 3;
            idx.push(r0, r0 + 1, r1, r0 + 1, r1 + 1, r1);
            idx.push(r0 + 1, r0 + 2, r1 + 1, r0 + 2, r1 + 2, r1 + 1);
          }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        return geo;
      };

      const leafDarkMat = new THREE.MeshStandardMaterial({ color: 0x1B5E32, roughness: 0.54, side: THREE.DoubleSide });
      const leafMidMat = new THREE.MeshStandardMaterial({ color: 0x2F8542, roughness: 0.50, side: THREE.DoubleSide });
      const leafBrightMat = new THREE.MeshStandardMaterial({ color: 0x4EA952, roughness: 0.48, side: THREE.DoubleSide });

      const outerLeafGeo = buildSwordLeafGeo(0.22, 0.048, 0.085);
      const midLeafGeo = buildSwordLeafGeo(0.24, 0.042, 0.055);
      const innerLeafGeo = buildSwordLeafGeo(0.21, 0.032, 0.025);

      // 3 層共 26 片自然外翻漸層鳳梨劍葉（底部密實銜接、中層舒展、頂心簇生！）
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2;
        const leaf = new THREE.Mesh(outerLeafGeo, leafDarkMat);
        leaf.position.set(Math.cos(ang) * 0.054, 0.376, Math.sin(ang) * 0.054);
        leaf.rotation.order = 'YXZ';
        leaf.rotation.y = -ang + Math.PI / 2;
        leaf.rotation.x = 0.88;
        g.add(leaf);
      }
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2 + Math.PI / 10;
        const leaf = new THREE.Mesh(midLeafGeo, leafMidMat);
        leaf.position.set(Math.cos(ang) * 0.036, 0.392, Math.sin(ang) * 0.036);
        leaf.rotation.order = 'YXZ';
        leaf.rotation.y = -ang + Math.PI / 2;
        leaf.rotation.x = 0.48;
        g.add(leaf);
      }
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + 0.25;
        const leaf = new THREE.Mesh(innerLeafGeo, leafBrightMat);
        leaf.position.set(Math.cos(ang) * 0.016, 0.402, Math.sin(ang) * 0.016);
        leaf.rotation.order = 'YXZ';
        leaf.rotation.y = -ang + Math.PI / 2;
        leaf.rotation.x = 0.16;
        g.add(leaf);
      }

      // ★ V37 喜氣立體大紅緞帶「蝴蝶結」（高置於葉基處 y = 0.394 緊束綠葉根部，完全覆蓋交界零露黃！）
      const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xDC2626, roughness: 0.42, metalness: 0.08, side: THREE.DoubleSide });
      const neckBand = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.078, 0.026, 20), ribbonMat);
      neckBand.position.y = 0.392;
      g.add(neckBand);

      const bowGroup = new THREE.Group();
      bowGroup.position.set(0, 0.396, 0.076);
      // 立體雙蝴蝶結耳環（左右飽滿弧耳＋折褶立體感）
      [-1, 1].forEach((s) => {
        const loop = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.011, 8, 18), ribbonMat);
        loop.scale.set(1.38, 0.76, 0.62);
        loop.position.set(s * 0.036, 0.006, 0.008);
        loop.rotation.set(0.18, s * -0.26, s * 0.24);
        bowGroup.add(loop);

        // 垂墜柔順緞帶尾（微微外展下垂於鳳梨肩緣！）
        const tailCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(s * 0.010, -0.004, 0.008),
          new THREE.Vector3(s * 0.032, -0.044, 0.022),
          new THREE.Vector3(s * 0.046, -0.086, 0.032)
        ]);
        const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 8, 0.0085, 6, false), ribbonMat);
        tail.scale.set(1.2, 1.0, 0.42);
        bowGroup.add(tail);
      });
      // 中央飽滿蝴蝶結心
      const bowKnot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), ribbonMat);
      bowKnot.scale.set(1.12, 0.92, 0.85);
      bowKnot.position.set(0, 0.002, 0.014);
      bowGroup.add(bowKnot);
      g.add(bowGroup);
    } else if (catalogId === 'apple') {
      // 平安紅蘋果（三顆小堆疊）
      const appleMat = new THREE.MeshStandardMaterial({ color: 0xDC2626, roughness: 0.35 });
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x5A3219 });
      [[-0.08, 0.12, 0.04], [0.08, 0.12, 0.04], [0, 0.12, -0.07], [0, 0.24, 0]].forEach(([x, y, z]) => {
        const a = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), appleMat);
        a.position.set(x, y, z);
        a.castShadow = true;
        g.add(a);
      });
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.06, 5), stemMat);
      stem.position.set(0, 0.34, 0);
      g.add(stem);
    } else if (catalogId === 'tangerine') {
      // 大吉橘子
      const orangeMat = new THREE.MeshStandardMaterial({ color: 0xF97316, roughness: 0.45 });
      [[-0.08, 0.12, 0.04], [0.08, 0.12, 0.04], [0, 0.12, -0.07], [0, 0.23, 0]].forEach(([x, y, z]) => {
        const o = new THREE.Mesh(new THREE.SphereGeometry(0.082, 10, 10), orangeMat);
        o.scale.set(1.05, 0.88, 1.05);
        o.position.set(x, y, z);
        o.castShadow = true;
        g.add(o);
      });
      const leaf = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.02, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x228B22 })
      );
      leaf.position.set(0.04, 0.31, 0);
      leaf.rotation.z = 0.25;
      g.add(leaf);
    } else if (catalogId === 'flower') {
      // ★ V31 精雕清香鮮花瓶（曲線青瓷玉壺春花瓶＋金口金底＋翠綠枝葉＋7 朵多層花瓣粉白菊蓮鮮花！）
      const vasePts = [
        new THREE.Vector2(0.0, 0.0),
        new THREE.Vector2(0.088, 0.0),
        new THREE.Vector2(0.082, 0.03),
        new THREE.Vector2(0.115, 0.10),
        new THREE.Vector2(0.105, 0.17),
        new THREE.Vector2(0.056, 0.23),
        new THREE.Vector2(0.072, 0.275),
        new THREE.Vector2(0.062, 0.275),
        new THREE.Vector2(0.048, 0.23)
      ];
      const vaseMat = new THREE.MeshStandardMaterial({ color: 0xE6F4F1, roughness: 0.20, metalness: 0.08 });
      const vaseGold = new THREE.MeshStandardMaterial({ color: 0xE5B958, roughness: 0.28, metalness: 0.65 });
      const vase = new THREE.Mesh(new THREE.LatheGeometry(vasePts, 20), vaseMat);
      vase.position.y = 0.05;
      vase.castShadow = true;
      const vRim = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.007, 6, 18), vaseGold);
      vRim.rotation.x = Math.PI / 2;
      vRim.position.y = 0.325;
      g.add(vase, vRim);

      const stemMat = new THREE.MeshStandardMaterial({ color: 0x2F7D44, roughness: 0.65 });
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x276A39, roughness: 0.56 });
      const stamenMat = new THREE.MeshStandardMaterial({ color: 0xFACC15, roughness: 0.40 });
      const bloomSpecs = [
        { x: 0.0, y: 0.49, z: 0.0, col: 0xF472B6, scale: 1.08 },
        { x: -0.095, y: 0.43, z: 0.055, col: 0xFB7185, scale: 0.96 },
        { x: 0.095, y: 0.44, z: 0.048, col: 0xFFFDF5, scale: 0.98 },
        { x: -0.075, y: 0.42, z: -0.075, col: 0xFBBF24, scale: 0.92 },
        { x: 0.082, y: 0.41, z: -0.068, col: 0xF472B6, scale: 0.90 },
        { x: 0.0, y: 0.39, z: 0.105, col: 0xFFF5F7, scale: 0.88 },
        { x: 0.0, y: 0.40, z: -0.100, col: 0xFB7185, scale: 0.86 }
      ];
      // 4 片舒展瓶口綠葉
      for (let li = 0; li < 4; li++) {
        const la = (li / 4) * Math.PI * 2 + 0.4;
        const lf = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 6), leafMat);
        lf.scale.set(1.75, 0.22, 0.62);
        lf.position.set(Math.cos(la) * 0.11, 0.34, Math.sin(la) * 0.11);
        lf.rotation.y = -la;
        lf.rotation.z = -0.45;
        g.add(lf);
      }
      // 7 朵重瓣立體鮮花（每朵 6 片花瓣＋金黃花蕊＋翠綠花莖！）
      bloomSpecs.forEach((bs) => {
        const stemDir = new THREE.Vector3(bs.x, bs.y - 0.30, bs.z);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.010, stemDir.length(), 6), stemMat);
        stem.position.set(bs.x * 0.5, 0.30 + (bs.y - 0.30) * 0.5, bs.z * 0.5);
        stem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), stemDir.clone().normalize());
        g.add(stem);

        const flGroup = new THREE.Group();
        flGroup.position.set(bs.x, bs.y, bs.z);
        flGroup.scale.setScalar(bs.scale);
        const pMat = new THREE.MeshStandardMaterial({ color: bs.col, roughness: 0.42 });
        for (let p = 0; p < 6; p++) {
          const pa = (p / 6) * Math.PI * 2;
          const petal = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), pMat);
          petal.scale.set(1.25, 0.52, 0.82);
          petal.position.set(Math.cos(pa) * 0.032, 0.004, Math.sin(pa) * 0.032);
          petal.rotation.y = -pa;
          petal.rotation.z = 0.25;
          flGroup.add(petal);
        }
        const center = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), stamenMat);
        center.position.y = 0.012;
        flGroup.add(center);
        flGroup.lookAt(bs.x * 2.2, bs.y + 0.18, bs.z * 2.2);
        g.add(flGroup);
      });
    } else if (catalogId === 'jossPaper') {
      // ★ 需求 #4：精緻「敬神壽金」金紙堆（多層金紙疊疊＋大張閃亮錫箔金紙面＋紅紙腰帶＋「壽」字朱印！）
      const paperMat = new THREE.MeshStandardMaterial({ color: 0xF5D26B, roughness: 0.65 });
      const foilMat = new THREE.MeshStandardMaterial({ color: 0xFFD94A, metalness: 0.72, roughness: 0.22 });
      const bandMat = new THREE.MeshStandardMaterial({ color: 0xC8232C, roughness: 0.50 });
      const stringMat = new THREE.MeshStandardMaterial({ color: 0xDC2626, roughness: 0.6 });

      for (let layer = 0; layer < 3; layer++) {
        const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.052, 0.23), paperMat);
        sheet.position.y = 0.08 + layer * 0.058;
        sheet.rotation.y = (layer - 1) * 0.03;
        sheet.castShadow = true;
        g.add(sheet);
      }
      const foil = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.012, 0.14), foilMat);
      foil.position.y = 0.232;
      const seal = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.014, 0.06), bandMat);
      seal.position.y = 0.236;
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.185, 0.242), bandMat);
      band.position.y = 0.145;
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 10), stringMat);
      bow.position.set(0, 0.245, 0.08);
      g.add(foil, seal, band, bow);
    } else if (catalogId === 'peachTower') {
      // ★ V31 精雕豪華雙層「尖嘴粉嫩壽桃塔」（Lathe 真實壽桃尖嘴造型＋白嫩漸粉雙色＋翠綠桃葉＋雙層紅金托盤＋壽字金飾！）
      const peachPts = [
        new THREE.Vector2(0.0, 0.0),
        new THREE.Vector2(0.044, 0.008),
        new THREE.Vector2(0.064, 0.036),
        new THREE.Vector2(0.062, 0.072),
        new THREE.Vector2(0.042, 0.102),
        new THREE.Vector2(0.016, 0.126),
        new THREE.Vector2(0.0, 0.136)
      ];
      const peachGeo = new THREE.LatheGeometry(peachPts, 14);
      const pCanvas = document.createElement('canvas');
      pCanvas.width = 64; pCanvas.height = 128;
      const pCtx = pCanvas.getContext('2d');
      const pg = pCtx.createLinearGradient(0, 0, 0, 128);
      pg.addColorStop(0.0, '#E11D74');
      pg.addColorStop(0.32, '#F472B6');
      pg.addColorStop(0.68, '#FDE2EC');
      pg.addColorStop(1.0, '#FFF8E7');
      pCtx.fillStyle = pg;
      pCtx.fillRect(0, 0, 64, 128);
      const pTex = new THREE.CanvasTexture(pCanvas);
      pTex.colorSpace = THREE.SRGBColorSpace;
      const peachMat = new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.40 });
      const pLeafMat = new THREE.MeshStandardMaterial({ color: 0x2E8B57, roughness: 0.52 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xF2C94C, metalness: 0.65, roughness: 0.28 });
      const redStandMat = new THREE.MeshStandardMaterial({ color: 0xA81920, roughness: 0.42 });

      const addSinglePeach = (px, py, pz, scale = 1.0) => {
        const pgGrp = new THREE.Group();
        const pm = new THREE.Mesh(peachGeo, peachMat);
        pm.castShadow = true;
        pgGrp.add(pm);
        [-1, 1].forEach((ls) => {
          const lf = new THREE.Mesh(new THREE.SphereGeometry(0.028, 7, 5), pLeafMat);
          lf.scale.set(1.5, 0.25, 0.65);
          lf.position.set(ls * 0.036, 0.014, 0.022);
          lf.rotation.y = ls * 0.45;
          pgGrp.add(lf);
        });
        pgGrp.scale.setScalar(scale);
        pgGrp.position.set(px, py, pz);
        g.add(pgGrp);
      };

      // 下層 5 顆飽滿壽桃圍成圓陣
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        addSinglePeach(Math.cos(a) * 0.11, 0.055, Math.sin(a) * 0.11, 0.96);
      }
      // 中層紅金花盤托起上層壽桃
      const midTray = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.12, 0.026, 16), redStandMat);
      midTray.position.y = 0.205;
      const midRim = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.010, 6, 16), goldMat);
      midRim.rotation.x = Math.PI / 2;
      midRim.position.y = 0.218;
      g.add(midTray, midRim);
      // 中層 3 顆壽桃 ＋ 頂端大王桃 ＋ 金色「壽」字掛牌！
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
        addSinglePeach(Math.cos(a) * 0.068, 0.220, Math.sin(a) * 0.068, 0.88);
      }
      addSinglePeach(0, 0.345, 0, 1.05);
      // ★ V32 壽桃塔正面圓牌貼上喜氣紅底燙金「壽」字圓形貼紙！
      const shouTag = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.010, 18), goldMat);
      shouTag.rotation.x = Math.PI / 2;
      shouTag.position.set(0, 0.205, 0.152);
      const shouSticker = new THREE.Mesh(
        new THREE.CircleGeometry(0.048, 20),
        new THREE.MeshStandardMaterial({ map: getShouStickerTex(), transparent: true, roughness: 0.32 })
      );
      shouSticker.position.set(0, 0.205, 0.159);
      g.add(shouTag, shouSticker);
    } else if (catalogId === 'orchid') {
      // 特級祈福蝴蝶蘭盆栽（金釉花盆 ＋ 翠綠蘭葉 ＋ 雙枝弧形紫粉蝴蝶蘭花串）
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.09, 0.17, 14),
        new THREE.MeshStandardMaterial({ color: 0xE5B968, metalness: 0.35, roughness: 0.3 })
      );
      pot.position.y = 0.135;
      pot.castShadow = true;
      g.add(pot);

      const leafMat = new THREE.MeshStandardMaterial({ color: 0x2E7D32, roughness: 0.55 });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), leafMat);
        leaf.scale.set(1.6, 0.18, 0.55);
        leaf.position.set(Math.cos(a) * 0.10, 0.22, Math.sin(a) * 0.10);
        leaf.rotation.y = -a;
        leaf.rotation.z = -0.35;
        g.add(leaf);
      }

      const stemMat = new THREE.MeshStandardMaterial({ color: 0x388E3C, roughness: 0.65 });
      const petalMat = new THREE.MeshStandardMaterial({ color: 0xC084FC, roughness: 0.4 });
      const lipMat = new THREE.MeshStandardMaterial({ color: 0xFACC15, roughness: 0.45 });

      [-1, 1].forEach((side) => {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.36, 6), stemMat);
        stem.position.set(side * 0.04, 0.34, 0);
        stem.rotation.z = side * 0.22;
        g.add(stem);

        [0.34, 0.43, 0.51].forEach((by, bi) => {
          const bloom = new THREE.Group();
          const leftWing = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), petalMat);
          leftWing.scale.set(1.2, 0.9, 0.35);
          leftWing.position.x = -0.032;
          const rightWing = leftWing.clone();
          rightWing.position.x = 0.032;
          const centerLip = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), lipMat);
          centerLip.position.z = 0.018;
          bloom.add(leftWing, rightWing, centerLip);
          bloom.position.set(side * (0.06 + bi * 0.035), by, (bi % 2 === 0 ? 0.03 : -0.02));
          g.add(bloom);
        });
      });
    } else {
      // ★ 需求 #4：精緻「平安紅龜粿」（翠綠香蕉葉墊底 ＋ 雙顆飽滿亮紅壽字龜甲粿！）
      const leaf = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.19, 0.012, 14),
        new THREE.MeshStandardMaterial({ color: 0x3B8C47, roughness: 0.65 })
      );
      leaf.scale.set(1.15, 1, 0.85);
      leaf.position.y = 0.06;
      g.add(leaf);

      const cakeMat = new THREE.MeshStandardMaterial({ color: 0xDC1F38, roughness: 0.28, metalness: 0.06 });
      const goldStamp = new THREE.MeshStandardMaterial({ color: 0xFDE047, roughness: 0.4 });
      [[-0.06, 0.105, 0.03, 0.18], [0.06, 0.12, -0.04, -0.22]].forEach(([x, y, z, ry]) => {
        const k = new THREE.Group();
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 10), cakeMat);
        body.scale.set(1.25, 0.56, 0.96);
        body.castShadow = true;
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.016, 6, 14), cakeMat);
        rim.rotation.x = Math.PI / 2;
        rim.scale.set(1.2, 0.95, 1);
        const crest = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.045, 0.014, 6), goldStamp);
        crest.position.y = 0.056;
        k.add(body, rim, crest);
        k.position.set(x, y, z);
        k.rotation.y = ry;
        g.add(k);
      });
    }

    return g;
  }

  /**
   * 根據最新供品清單同步 3D 供桌上的模型
   */
  syncOfferings(list = []) {
    const incomingIds = new Set(list.map(i => i.id));

    // 移除已到期或消失的供品
    for (const [id, entry] of this.meshes.entries()) {
      if (!incomingIds.has(id)) {
        this.group.remove(entry.mesh);
        this.meshes.delete(id);
      }
    }

    // 新增或依玩家指定的左／右供桌分配槽位（若指定桌已滿 6 份則自動溢流到另一桌空位）
    let leftIdx = 0;
    let rightIdx = 0;
    list.slice(0, this.slots.length).forEach((item, idx) => {
      const preferRight = item.side ? item.side === 'right' : (idx % 2 === 1);
      let slotPos;
      if (preferRight) {
        if (rightIdx < this.rightSlots.length) slotPos = this.rightSlots[rightIdx++];
        else slotPos = this.leftSlots[leftIdx++];
      } else {
        if (leftIdx < this.leftSlots.length) slotPos = this.leftSlots[leftIdx++];
        else slotPos = this.rightSlots[rightIdx++];
      }
      if (!slotPos) return;
      if (!this.meshes.has(item.id)) {
        const mesh = this._createOfferingMesh(item.catalogId);
        mesh.position.copy(slotPos);
        mesh.scale.setScalar(0.01);
        this.group.add(mesh);
        this.meshes.set(item.id, { mesh, scale: 0.01 });
      } else {
        this.meshes.get(item.id).mesh.position.copy(slotPos);
      }
    });
  }

  update(dt) {
    for (const entry of this.meshes.values()) {
      if (entry.scale < 1) {
        entry.scale = Math.min(1, entry.scale + dt * 4.5);
        entry.mesh.scale.setScalar(entry.scale);
      }
    }
  }
}
