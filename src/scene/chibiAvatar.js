/**
 * 3D 原創台灣廟埕文創 Q版公仔模型 (V5)
 * 全新 8 款原創老中青小孩（男女）服裝、髮型與文創配件：
 * - 茶香阿公：青玉圓框眼鏡＋竹扇腰飾＋靛藍苧麻衫
 * - 花布阿嬤：台灣紅花布頭巾髮帶＋珍珠胸針＋銀灰盤髮
 * - 廟藝匠師：手染藍工裝圍裙＋傳統金繡腰帶
 * - 奉茶姊姊：精緻竹編小斗笠＋亞麻小披肩＋低馬尾
 * - 廟埕攝影師：胸前復古底片相機＋薑黃機能背心
 * - 手作少女：紅金小獅頭髮夾＋雙邊編髮＋湖青漢短襖
 * - 小舞獅弟：超萌紅金舞獅頭帽＋明黃背心（迷你童身）
 * - 小燈籠妹：迷你雙紅燈籠髮飾＋雙丸子頭（迷你童身）
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { AVATAR_PRESETS } from '../config/templeConfig.js';

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const _garmentTexCache = new Map();

/**
 * ★ 需求 #2：為 8 位原創文創角色生成專屬「精緻織紋與刺繡衣著貼圖」（盤扣、台灣花布牡丹、漢服交領、機能口袋與福字雲紋！）
 */
function getGarmentTexture(accessoryType, baseHex) {
  const key = `${accessoryType || 'default'}_${baseHex}`;
  if (_garmentTexCache.has(key)) return _garmentTexCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const baseColor = '#' + (baseHex & 0xFFFFFF).toString(16).padStart(6, '0');
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 256);

  // 細緻平紋織布經緯肌理
  for (let i = 0; i < 256; i += 6) {
    ctx.fillStyle = i % 12 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, i, 256, 2);
    ctx.fillRect(i, 0, 2, 256);
  }

  // 下襬織邊線
  ctx.fillStyle = 'rgba(245, 224, 175, 0.45)';
  ctx.fillRect(0, 232, 256, 8);
  ctx.fillStyle = 'rgba(20, 14, 10, 0.22)';
  ctx.fillRect(0, 228, 256, 4);

  if (accessoryType === 'jadeGlasses') {
    // 茶香阿公：唐裝立領正襟 ＋ 四組米金手工盤扣
    ctx.fillStyle = 'rgba(242, 226, 194, 0.32)';
    ctx.fillRect(118, 0, 20, 240);
    [54, 96, 138, 180].forEach((y) => {
      ctx.strokeStyle = '#E8D5A8';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(100, y); ctx.lineTo(156, y); ctx.stroke();
      ctx.fillStyle = '#F6E6BD';
      ctx.beginPath(); ctx.arc(128, y, 5, 0, Math.PI * 2); ctx.fill();
    });
  } else if (accessoryType === 'floralBand') {
    // 花布阿嬤：溫雅台灣牡丹花布刺繡 ＋ 斜襟米金滾邊
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const fx = 34 + col * 62 + (row % 2) * 28;
        const fy = 40 + row * 56;
        ctx.fillStyle = 'rgba(245, 110, 105, 0.52)';
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2;
          ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 9, fy + Math.sin(a) * 9, 7, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#FCE181';
        ctx.beginPath(); ctx.arc(fx, fy, 5, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.strokeStyle = '#F5DFB0';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(96, 0); ctx.lineTo(176, 86); ctx.lineTo(176, 256); ctx.stroke();
  } else if (accessoryType === 'craftApron') {
    // 廟藝匠師：傳統回紋金線邊 ＋ 藍染布縫線
    ctx.strokeStyle = '#E6B856';
    ctx.lineWidth = 4;
    ctx.strokeRect(18, 18, 220, 212);
    ctx.fillStyle = 'rgba(255, 224, 145, 0.25)';
    for (let x = 24; x < 232; x += 24) {
      ctx.strokeRect(x, 214, 14, 12);
    }
  } else if (accessoryType === 'bambooConical') {
    // 奉茶姊姊：手織民俗幾何腰紋 ＋ 溫潤木鈕扣
    for (let x = 0; x < 256; x += 24) {
      ctx.fillStyle = '#F3DFB8';
      ctx.beginPath();
      ctx.moveTo(x + 12, 184); ctx.lineTo(x + 22, 198); ctx.lineTo(x + 12, 212); ctx.lineTo(x + 2, 198);
      ctx.closePath(); ctx.fill();
    }
    [68, 112, 156].forEach((y) => {
      ctx.fillStyle = '#6B4226';
      ctx.beginPath(); ctx.arc(128, y, 6, 0, Math.PI * 2); ctx.fill();
    });
  } else if (accessoryType === 'retroCamera') {
    // 廟埕攝影師：機能背心車線、中線拉鍊與立體雙口袋
    ctx.strokeStyle = 'rgba(40, 32, 24, 0.55)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(128, 0); ctx.lineTo(128, 256); ctx.stroke();
    [36, 152].forEach((px) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
      drawRoundRect(ctx, px, 134, 68, 66, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 245, 215, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    });
  } else if (accessoryType === 'lionClip') {
    // 手作少女：湖青改良漢服交領右衽 ＋ 胸前細緻金蓮刺繡
    ctx.strokeStyle = '#FFF6E2';
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(82, 0); ctx.lineTo(166, 118); ctx.lineTo(166, 256); ctx.stroke();
    ctx.strokeStyle = '#E55A4A';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(90, 0); ctx.lineTo(172, 116); ctx.stroke();
    // 細緻蓮花刺繡
    ctx.fillStyle = 'rgba(255, 224, 178, 0.65)';
    for (let p = 0; p < 6; p++) {
      const a = (p / 6) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(82 + Math.cos(a) * 12, 158 + Math.sin(a) * 12, 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath(); ctx.arc(82, 158, 6, 0, Math.PI * 2); ctx.fill();
  } else if (accessoryType === 'lionHat') {
    // 小舞獅弟：喜氣功夫背心紅滾邊 ＋ 胸前大紅金「福」團花！
    ctx.strokeStyle = '#C8232C';
    ctx.lineWidth = 12;
    ctx.strokeRect(10, 10, 236, 236);
    ctx.fillStyle = '#C8232C';
    ctx.beginPath(); ctx.arc(128, 126, 46, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFF2B2';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#FFE885';
    ctx.font = 'bold 46px "Noto Serif TC", "Microsoft JhengHei", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('福', 128, 128);
  } else if (accessoryType === 'lanternPins') {
    // 小燈籠妹：桃粉雲紋錦緞 ＋ 金絲小花點綴
    ctx.strokeStyle = 'rgba(255, 240, 190, 0.55)';
    ctx.lineWidth = 3;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const cx = 36 + c * 62 + (r % 2) * 26;
        const cy = 46 + r * 54;
        ctx.beginPath(); ctx.arc(cx, cy, 12, Math.PI, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#FFF0B8';
        ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  _garmentTexCache.set(key, tex);
  return tex;
}

export class ChibiAvatar {
  constructor(options = {}) {
    const preset = options.presetId
      ? (AVATAR_PRESETS.find(p => p.id === options.presetId) || AVATAR_PRESETS[4])
      : null;

    this.options = {
      shirtColor: preset?.shirtColor ?? 0xD1912E,
      pantsColor: preset?.pantsColor ?? 0x3A4A5E,
      hairColor: preset?.hairColor ?? 0x241E1C,
      skinColor: 0xFAD7B8,
      scale: (preset?.scale ?? 1.0) * (options.scaleMultiplier ?? 1.0),
      scaleMultiplier: options.scaleMultiplier ?? 1.0,
      hairStyle: preset?.hairStyle ?? 'messyWave',
      accessory: preset?.accessory ?? 'retroCamera',
      label: '',
      ...options
    };
    this.options.scale = (preset?.scale ?? 1.0) * (this.options.scaleMultiplier ?? 1.0);

    this.root = new THREE.Group();
    this.scaleGroup = new THREE.Group();
    this.scaleGroup.scale.setScalar(this.options.scale);
    this.root.add(this.scaleGroup);

    this.bodyPivot = new THREE.Group();
    this.scaleGroup.add(this.bodyPivot);

    this.state = 'idle';
    this.actionTimer = 0;
    this.actionDuration = 0;
    this.actionCallback = null;
    this.holdingIncense = false;
    this.holdingTeapot = false;
    this.chanting = false;
    this.fishTapAnim = 0;
    this.nameTagSprite = null;
    this.bubbleSprite = null;
    this.bubbleTimer = 0;
    this.questMarkerSprite = null;
    this.questMarkerState = '';
    this.clickHitbox = null;

    this._buildCharacterMesh();

    if (this.options.label) {
      this.setName(this.options.label);
    }
  }

  _matteMat(color, extra = {}) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.86,
      metalness: 0.03,
      ...extra
    });
  }

  _buildCharacterMesh() {
    const o = this.options;
    this.skinMat = this._matteMat(o.skinColor);
    const garmentTex = getGarmentTexture(o.accessory, o.shirtColor);
    this.shirtMat = new THREE.MeshStandardMaterial({
      map: garmentTex,
      color: 0xFFFFFF,
      roughness: 0.78,
      metalness: 0.04
    });
    this.sleeveMat = this._matteMat(o.shirtColor, { roughness: 0.80 });
    this.trimMat = this._matteMat(0xE5B968, { roughness: 0.44, metalness: 0.28 });
    this.cuffMat = this._matteMat(0xF8F0DF, { roughness: 0.78 });
    this.pantsMat = this._matteMat(o.pantsColor);
    this.shoeMat = this._matteMat(0x3B2820, { roughness: 0.65 });
    this.soleMat = this._matteMat(0xF2ECE1, { roughness: 0.85 });
    this.hairMat = this._matteMat(o.hairColor);
    const eyeMat = this._matteMat(0x231715, { roughness: 0.32 });
    const blushMat = this._matteMat(0xF29992, { roughness: 0.9 });

    const makeLeg = (xOff) => {
      const g = new THREE.Group();
      g.position.set(xOff, 0.36, 0);
      const leg = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.29, 0.20, 4, 0.06), this.pantsMat);
      leg.position.y = -0.135;
      leg.castShadow = true;
      // 精緻褲腳折邊
      const hem = new THREE.Mesh(new RoundedBoxGeometry(0.195, 0.045, 0.215, 2, 0.015), this.cuffMat);
      hem.position.y = -0.255;
      // 雙色精雕休閒布鞋（鞋面＋米白鞋底＋鞋舌扣飾）
      const shoe = new THREE.Mesh(new RoundedBoxGeometry(0.19, 0.085, 0.24, 3, 0.035), this.shoeMat);
      shoe.position.set(0, -0.295, 0.02);
      shoe.castShadow = true;
      const sole = new THREE.Mesh(new RoundedBoxGeometry(0.20, 0.032, 0.25, 2, 0.012), this.soleMat);
      sole.position.set(0, -0.335, 0.02);
      const tongue = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.026, 0.06, 2, 0.01), this.trimMat);
      tongue.position.set(0, -0.255, 0.11);
      g.add(leg, hem, shoe, sole, tongue);
      return g;
    };
    this.leftLeg = makeLeg(-0.13);
    this.rightLeg = makeLeg(0.13);
    this.bodyPivot.add(this.leftLeg, this.rightLeg);

    this.torso = new THREE.Group();
    this.torso.position.set(0, 0.68, 0);
    this.bodyPivot.add(this.torso);

    const torsoMesh = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.54, 0.34, 5, 0.10), this.shirtMat);
    torsoMesh.castShadow = true;
    this.torso.add(torsoMesh);

    // 精緻中式立領／翻領 ＋ 微擺下緣衣襬 ＋ 縫線腰帶
    const collar = new THREE.Mesh(new RoundedBoxGeometry(0.25, 0.075, 0.25, 3, 0.025), this.cuffMat);
    collar.position.set(0, 0.255, 0.05);
    const hemSkirt = new THREE.Mesh(new RoundedBoxGeometry(0.51, 0.09, 0.37, 3, 0.03), this.sleeveMat);
    hemSkirt.position.set(0, -0.23, 0);
    const waistBelt = new THREE.Mesh(new RoundedBoxGeometry(0.505, 0.062, 0.365, 2, 0.02), this._matteMat(0x4A3528, { roughness: 0.65 }));
    waistBelt.position.set(0, -0.14, 0);
    const beltBuckle = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.072, 0.04, 2, 0.01), this.trimMat);
    beltBuckle.position.set(0, -0.14, 0.18);
    this.torso.add(collar, hemSkirt, waistBelt, beltBuckle);

    const makeArm = (xOff) => {
      const g = new THREE.Group();
      g.position.set(xOff, 0.18, 0);
      const arm = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.33, 0.16, 4, 0.06), this.sleeveMat);
      arm.position.y = -0.145;
      arm.castShadow = true;
      // 滾邊精緻袖口
      const cuff = new THREE.Mesh(new RoundedBoxGeometry(0.165, 0.052, 0.175, 2, 0.02), this.cuffMat);
      cuff.position.y = -0.285;
      const hand = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.125, 0.13, 3, 0.05), this.skinMat);
      hand.position.y = -0.35;
      g.add(arm, cuff, hand);
      return g;
    };
    this.leftArm = makeArm(-0.31);
    this.rightArm = makeArm(0.31);
    this.torso.add(this.leftArm, this.rightArm);

    this.head = new THREE.Group();
    this.head.position.set(0, 0.60, 0);
    this.torso.add(this.head);

    const headMesh = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.58, 0.56, 5, 0.18), this.skinMat);
    headMesh.castShadow = true;
    this.head.add(headMesh);

    const lEye = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 10), eyeMat);
    lEye.position.set(-0.12, -0.02, 0.28);
    const rEye = lEye.clone();
    rEye.position.x = 0.12;
    this.head.add(lEye, rEye);

    const lBlush = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 8), blushMat);
    lBlush.scale.set(1.25, 0.6, 0.35);
    lBlush.position.set(-0.20, -0.09, 0.26);
    const rBlush = lBlush.clone();
    rBlush.position.x = 0.20;
    this.head.add(lBlush, rBlush);

    this.hairGroup = new THREE.Group();
    this.head.add(this.hairGroup);

    this.accessoryGroup = new THREE.Group();
    this.head.add(this.accessoryGroup);
    this.bodyAccessoryGroup = new THREE.Group();
    this.torso.add(this.bodyAccessoryGroup);

    this._applyHairStyle(o.hairStyle);
    this._applyAccessory(o.accessory);

    // 手持三柱清香
    this.incenseGroup = new THREE.Group();
    this.incenseGroup.position.set(0, 0.12, 0.36);
    this.incenseGroup.rotation.x = 0.22;
    this.incenseGroup.visible = false;

    const stickGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.56, 6);
    const stickMat = this._matteMat(0xB8894B);
    const redBaseMat = this._matteMat(0xC82E2A);
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xFF7722, toneMapped: false });

    this.incenseTipAnchor = new THREE.Object3D();
    this.incenseTipAnchor.position.set(0, 0.32, 0);
    this.incenseGroup.add(this.incenseTipAnchor);

    [-0.045, 0, 0.045].forEach((offset) => {
      const stick = new THREE.Mesh(stickGeo, stickMat);
      stick.position.set(offset, 0.04, 0);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.15, 6), redBaseMat);
      base.position.set(offset, -0.19, 0);
      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), emberMat);
      ember.position.set(offset, 0.33, 0);
      this.incenseGroup.add(stick, base, ember);
    });

    // ★ 移除每位角色獨立的 PointLight（避免 11 位 NPC 堆疊超過 20 盞點光源導致手機 WebGL Shader 崩潰白屏！）
    this.torso.add(this.incenseGroup);

    // ★ V31 手持台灣常見「白鐵大水壺」（寬底弧身不鏽鋼壺＋S 型彎嘴＋拱形上提把手配黑電木握把！）
    this.teapotGroup = new THREE.Group();
    this.teapotGroup.position.set(0.24, -0.06, 0.36);
    this.teapotGroup.visible = false;
    const steelPotMat = new THREE.MeshStandardMaterial({ color: 0xDDE4EA, roughness: 0.22, metalness: 0.86 });
    const bakeliteMat = new THREE.MeshStandardMaterial({ color: 0x1E2024, roughness: 0.52, metalness: 0.12 });
    const potProfile = [
      new THREE.Vector2(0.0, -0.10),
      new THREE.Vector2(0.135, -0.10),
      new THREE.Vector2(0.145, -0.04),
      new THREE.Vector2(0.135, 0.04),
      new THREE.Vector2(0.100, 0.095),
      new THREE.Vector2(0.080, 0.115),
      new THREE.Vector2(0.086, 0.126),
      new THREE.Vector2(0.072, 0.126)
    ];
    const potBody = new THREE.Mesh(new THREE.LatheGeometry(potProfile, 18), steelPotMat);
    const potLid = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.076, 0.022, 16), steelPotMat);
    potLid.position.y = 0.128;
    const potKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.018, 0.032, 10), bakeliteMat);
    potKnob.position.y = 0.152;
    const spoutCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.03, 0.12),
      new THREE.Vector3(0, 0.01, 0.185),
      new THREE.Vector3(0, 0.08, 0.215),
      new THREE.Vector3(0, 0.12, 0.235)
    ]);
    const potSpout = new THREE.Mesh(new THREE.TubeGeometry(spoutCurve, 12, 0.018, 8, false), steelPotMat);
    // 經典台灣白鐵水壺上方拱形大提把（兩側白鐵耳＋拱形鐵絲＋黑色防燙電木握把）
    const potBail = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.010, 6, 18, Math.PI), steelPotMat);
    potBail.position.set(0, 0.09, 0);
    const potGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.11, 10), bakeliteMat);
    potGrip.rotation.z = Math.PI / 2;
    potGrip.position.set(0, 0.215, 0);
    this.teapotGroup.add(potBody, potLid, potKnob, potSpout, potBail, potGrip);
    this.torso.add(this.teapotGroup);

    // ★ V34 拜墊念經專屬：左手捧精雕樟木木魚 ＋ 右手執白布頭木魚槌（跪坐念經時清楚手持敲打！）
    const fishWoodMat = new THREE.MeshStandardMaterial({ color: 0xB86228, roughness: 0.36, metalness: 0.08 });
    const fishDarkMat = new THREE.MeshStandardMaterial({ color: 0x6E3212, roughness: 0.48 });
    const fishSlitMat = new THREE.MeshBasicMaterial({ color: 0x1A0904 });
    const malletClothMat = new THREE.MeshStandardMaterial({ color: 0xF7EFE0, roughness: 0.80 });
    const fishGoldMat = new THREE.MeshStandardMaterial({ color: 0xE8BD4C, roughness: 0.34, metalness: 0.45 });

    this.chantFishGroup = new THREE.Group();
    this.chantFishGroup.position.set(0.05, -0.36, 0.06);
    this.chantFishGroup.visible = false;
    const cfBody = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 12), fishWoodMat);
    cfBody.scale.set(1.16, 0.88, 1.04);
    const cfTail = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.017, 6, 12), fishDarkMat);
    cfTail.rotation.x = Math.PI / 2;
    cfTail.position.set(0, -0.004, -0.098);
    const cfSlit = new THREE.Mesh(new THREE.TorusGeometry(0.108, 0.011, 6, 14, Math.PI * 0.78), fishSlitMat);
    cfSlit.rotation.x = Math.PI / 2;
    cfSlit.rotation.z = Math.PI * 0.11;
    cfSlit.position.set(0, -0.010, 0.006);
    const cfRidge = new THREE.Mesh(new THREE.TorusGeometry(0.096, 0.010, 6, 14, Math.PI * 0.72), fishGoldMat);
    cfRidge.rotation.y = Math.PI / 2;
    cfRidge.rotation.z = Math.PI * 0.14;
    cfRidge.position.set(0, 0.008, 0);
    [-1, 1].forEach((s) => {
      const cfHole = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.030, 8), fishSlitMat);
      cfHole.rotation.z = Math.PI / 2;
      cfHole.position.set(s * 0.112, -0.010, 0.032);
      this.chantFishGroup.add(cfHole);
    });
    this.chantFishGroup.add(cfBody, cfTail, cfSlit, cfRidge);
    this.leftArm.add(this.chantFishGroup);

    this.chantMalletGroup = new THREE.Group();
    this.chantMalletGroup.position.set(-0.02, -0.36, 0.03);
    this.chantMalletGroup.visible = false;
    const cmHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.28, 8), fishDarkMat);
    cmHandle.rotation.z = Math.PI / 2;
    cmHandle.position.set(-0.09, 0, 0.02);
    const cmHead = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 10), malletClothMat);
    cmHead.scale.set(1.22, 0.94, 0.94);
    cmHead.position.set(-0.23, 0, 0.02);
    const cmCollar = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.005, 6, 10), fishGoldMat);
    cmCollar.rotation.y = Math.PI / 2;
    cmCollar.position.set(-0.19, 0, 0.02);
    this.chantMalletGroup.add(cmHandle, cmHead, cmCollar);
    this.rightArm.add(this.chantMalletGroup);
  }

  _applyHairStyle(style) {
    this.hairGroup.clear();
    const hairTop = new THREE.Mesh(new RoundedBoxGeometry(0.65, 0.26, 0.59, 4, 0.12), this.hairMat);
    hairTop.position.set(0, 0.19, -0.02);
    const hairBack = new THREE.Mesh(new RoundedBoxGeometry(0.64, 0.42, 0.24, 4, 0.08), this.hairMat);
    hairBack.position.set(0, 0.02, -0.20);
    this.hairGroup.add(hairTop, hairBack);

    if (style === 'elderPart') {
      // 慈祥銀髮旁分＋修剪整齊小短鬚
      const bang = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.10, 0.12, 3, 0.04), this.hairMat);
      bang.position.set(-0.14, 0.18, 0.24);
      const mustache = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.06, 0.06, 2, 0.02), this.hairMat);
      mustache.position.set(0, -0.13, 0.28);
      this.hairGroup.add(bang, mustache);
    } else if (style === 'grandmaBun') {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), this.hairMat);
      bun.position.set(0, 0.14, -0.34);
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.44, 6), this.trimMat);
      pin.rotation.z = Math.PI / 2;
      pin.position.set(0, 0.16, -0.34);
      this.hairGroup.add(bun, pin);
    } else if (style === 'lowPonytail') {
      const tail = new THREE.Mesh(new RoundedBoxGeometry(0.20, 0.38, 0.16, 3, 0.07), this.hairMat);
      tail.position.set(0, -0.18, -0.30);
      tail.rotation.x = 0.22;
      this.hairGroup.add(tail);
    } else if (style === 'messyWave') {
      // 文青微捲瀏海層次
      [-0.18, 0.02, 0.19].forEach((bx, idx) => {
        const tuft = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.12, 0.12, 3, 0.04), this.hairMat);
        tuft.position.set(bx, 0.17 + (idx % 2) * 0.03, 0.25);
        tuft.rotation.z = (idx - 1) * 0.18;
        this.hairGroup.add(tuft);
      });
    } else if (style === 'braids') {
      // 雙邊可愛麻花辮
      [-0.29, 0.29].forEach(sx => {
        for (let k = 0; k < 3; k++) {
          const bead = new THREE.Mesh(new THREE.SphereGeometry(0.082 - k * 0.008, 8, 8), this.hairMat);
          bead.position.set(sx, -0.06 - k * 0.12, 0.06);
          this.hairGroup.add(bead);
        }
        const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.04, 0.04), this._matteMat(0xE55A4A));
        ribbon.position.set(sx, -0.36, 0.06);
        this.hairGroup.add(ribbon);
      });
    } else if (style === 'twinBuns') {
      [-0.28, 0.28].forEach(sx => {
        const bun = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), this.hairMat);
        bun.position.set(sx, 0.32, -0.04);
        this.hairGroup.add(bun);
      });
    }
  }

  _applyAccessory(type) {
    this.accessoryGroup.clear();
    this.bodyAccessoryGroup.clear();

    if (type === 'jadeGlasses') {
      // 1. 茶香阿公：青玉圓框眼鏡 ＋ 腰間竹摺扇
      const frameMat = this._matteMat(0x2D7A68, { roughness: 0.35, metalness: 0.3 });
      [-0.12, 0.12].forEach(gx => {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.014, 8, 16), frameMat);
        rim.position.set(gx, -0.02, 0.30);
        this.accessoryGroup.add(rim);
      });
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.016, 0.016), frameMat);
      bridge.position.set(0, -0.01, 0.30);
      this.accessoryGroup.add(bridge);

      const fan = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.22, 0.04, 2, 0.01), this._matteMat(0xDFC48C));
      fan.position.set(0.22, -0.14, 0.15);
      fan.rotation.z = -0.3;
      this.bodyAccessoryGroup.add(fan);
    } else if (type === 'floralBand') {
      // 2. 花布阿嬤：台灣牡丹紅花布髮帶 ＋ 溫潤珍珠胸針
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.042, 8, 22, Math.PI), this._matteMat(0xD9453B));
      band.position.set(0, 0.16, 0.04);
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), this._matteMat(0xFFE07D));
      flower.position.set(0.22, 0.32, 0.12);
      this.accessoryGroup.add(band, flower);

      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), this._matteMat(0xFFFDF5, { roughness: 0.25 }));
      pearl.position.set(0, 0.16, 0.19);
      this.bodyAccessoryGroup.add(pearl);
    } else if (type === 'craftApron') {
      // 3. 廟藝匠師：藍染工藝工作圍裙 ＋ 金繡腰帶
      const apron = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.44, 0.05, 3, 0.02), this._matteMat(0x26436E));
      apron.position.set(0, -0.06, 0.175);
      const pocket = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.14, 0.04, 2, 0.01), this._matteMat(0x3B649E));
      pocket.position.set(0, -0.12, 0.195);
      const sash = new THREE.Mesh(new RoundedBoxGeometry(0.51, 0.07, 0.37, 2, 0.02), this.trimMat);
      sash.position.set(0, -0.02, 0);
      this.bodyAccessoryGroup.add(apron, pocket, sash);
    } else if (type === 'bambooConical') {
      // 4. 奉茶姊姊：精緻手工台灣小竹笠 ＋ 溫潤亞麻披肩
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.56, 0.24, 18), this._matteMat(0xDEC080));
      cone.position.y = 0.38;
      cone.castShadow = true;
      const topTip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), this._matteMat(0xB83B32));
      topTip.position.y = 0.50;
      this.accessoryGroup.add(cone, topTip);

      const shawl = new THREE.Mesh(new RoundedBoxGeometry(0.54, 0.16, 0.40, 3, 0.05), this._matteMat(0xEFE3CC));
      shawl.position.set(0, 0.20, 0);
      this.bodyAccessoryGroup.add(shawl);
    } else if (type === 'retroCamera') {
      // 5. 廟埕攝影師：胸前復古底片相機（黑銀機身＋立體鏡頭＋背帶）
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.018, 6, 16), this._matteMat(0x3A2820));
      strap.rotation.x = Math.PI / 2.6;
      strap.position.set(0, 0.14, 0.06);
      const camBody = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.14, 0.10, 3, 0.02), this._matteMat(0x282C34, { roughness: 0.45 }));
      camBody.position.set(0, -0.02, 0.21);
      const camTop = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.04, 0.10, 2, 0.01), this._matteMat(0xD8D8D8, { metalness: 0.5, roughness: 0.3 }));
      camTop.position.set(0, 0.06, 0.21);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.056, 0.08, 12), this._matteMat(0x181B20, { metalness: 0.6, roughness: 0.25 }));
      lens.rotation.x = Math.PI / 2;
      lens.position.set(0, -0.02, 0.27);
      this.bodyAccessoryGroup.add(strap, camBody, camTop, lens);
    } else if (type === 'lionClip') {
      // 6. 手作少女：頭頂紅金小獅頭髮夾 ＋ 溫潤雲紋玉腰佩
      const clipBase = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.12, 0.12, 3, 0.04), this._matteMat(0xD6382E));
      clipBase.position.set(0.22, 0.31, 0.10);
      clipBase.rotation.z = -0.25;
      const clipGold = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), this.trimMat);
      clipGold.position.set(0.23, 0.33, 0.16);
      this.accessoryGroup.add(clipBase, clipGold);

      const jadePendant = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.02, 6, 12), this._matteMat(0x63C5B0, { roughness: 0.35 }));
      jadePendant.position.set(-0.16, -0.14, 0.18);
      this.bodyAccessoryGroup.add(jadePendant);
    } else if (type === 'lionHat') {
      // 7. 小舞獅弟：超萌紅金Q版小獅頭帽（毛絨金邊＋立體圓眼＋小耳朵！）
      const hatMain = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.34, 0.62, 4, 0.12), this._matteMat(0xD6382E));
      hatMain.position.set(0, 0.24, -0.02);
      const trim = new THREE.Mesh(new RoundedBoxGeometry(0.71, 0.09, 0.65, 3, 0.04), this.trimMat);
      trim.position.set(0, 0.10, -0.01);
      [-0.24, 0.24].forEach(ex => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), this.trimMat);
        ear.position.set(ex, 0.42, 0.02);
        const lionEye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), this._matteMat(0xFFFFFF));
        lionEye.position.set(ex * 0.62, 0.26, 0.29);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 6), this._matteMat(0x181818));
        pupil.position.set(ex * 0.62, 0.26, 0.34);
        this.accessoryGroup.add(ear, lionEye, pupil);
      });
      const pom = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), this._matteMat(0xFFE066));
      pom.position.set(0, 0.44, 0.16);
      this.accessoryGroup.add(hatMain, trim, pom);
    } else if (type === 'lanternPins') {
      // 8. 小燈籠妹：雙側迷你發光小紅燈籠髮飾 ＋ 金色雲領
      const lanternMat = new THREE.MeshStandardMaterial({ color: 0xE03131, emissive: 0xFF6B2A, emissiveIntensity: 0.45, roughness: 0.5 });
      [-0.36, 0.36].forEach(lx => {
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 10), lanternMat);
        orb.scale.set(1, 1.15, 1);
        orb.position.set(lx, 0.20, 0.04);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 8), this.trimMat);
        cap.position.set(lx, 0.30, 0.04);
        const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.10, 6), this.trimMat);
        tassel.position.set(lx, 0.06, 0.04);
        this.accessoryGroup.add(orb, cap, tassel);
      });
      const cloudCollar = new THREE.Mesh(new RoundedBoxGeometry(0.50, 0.09, 0.38, 3, 0.04), this._matteMat(0xFCE09B));
      cloudCollar.position.set(0, 0.24, 0.01);
      this.bodyAccessoryGroup.add(cloudCollar);
    }
  }

  applyPreset(presetId) {
    const preset = AVATAR_PRESETS.find(p => p.id === presetId) || AVATAR_PRESETS[4];
    const finalScale = (preset.scale || 1.0) * (this.options.scaleMultiplier || 1.0);
    this.scaleGroup.scale.setScalar(finalScale);
    this.shirtMat.map = getGarmentTexture(preset.accessory || 'none', preset.shirtColor);
    this.shirtMat.color.setHex(0xFFFFFF);
    this.shirtMat.needsUpdate = true;
    if (this.sleeveMat) this.sleeveMat.color.setHex(preset.shirtColor);
    this.pantsMat.color.setHex(preset.pantsColor);
    this.hairMat.color.setHex(preset.hairColor);
    this._applyHairStyle(preset.hairStyle || 'short');
    this._applyAccessory(preset.accessory || 'none');
    if (this.nameTagSprite) {
      this.nameTagSprite.position.y = 1.98 * finalScale + 0.18;
    }
    if (this.questMarkerSprite) {
      this.questMarkerSprite.position.y = 2.45 * finalScale + 0.32;
    }
  }

  /**
   * ★ V1.1 手機端加大透明點擊熱區（讓手機拇指輕鬆點擊 NPC 與真人玩家！）
   */
  attachClickHitbox(meta = {}, radius = 0.72, height = 2.45) {
    if (this.clickHitbox) {
      this.root.remove(this.clickHitbox);
      this.clickHitbox.geometry?.dispose();
      this.clickHitbox.material?.dispose();
    }
    const geo = new THREE.CylinderGeometry(radius, radius, height, 10);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = height * 0.5;
    mesh.userData = { ...meta };
    this.root.add(mesh);
    this.clickHitbox = mesh;
    return mesh;
  }

  /**
   * ★ V1.1 任務 NPC 頭頂醒目驚嘆號／問號標記（'!' 可接任務 / '?' 可回報 / '' 隱藏）
   */
  setQuestMarker(symbol = '') {
    if (symbol === this.questMarkerState) return;
    this.questMarkerState = symbol;
    if (this.questMarkerSprite) {
      this.root.remove(this.questMarkerSprite);
      this.questMarkerSprite.material.map?.dispose();
      this.questMarkerSprite.material.dispose();
      this.questMarkerSprite = null;
    }
    if (!symbol) return;

    const canvas = document.createElement('canvas');
    canvas.width = 144;
    canvas.height = 144;
    const ctx = canvas.getContext('2d');
    const isReady = symbol === '?';

    ctx.beginPath();
    ctx.arc(72, 72, 56, 0, Math.PI * 2);
    ctx.fillStyle = isReady ? '#16A34A' : '#EAB308';
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#FFFDF5';
    ctx.stroke();

    ctx.fillStyle = isReady ? '#FFFFFF' : '#7C1414';
    ctx.font = '900 78px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isReady ? '？' : '！', 72, 75);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.questMarkerSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      toneMapped: false
    }));
    this.questMarkerSprite.scale.set(0.88, 0.88, 1);
    const sc = this.scaleGroup.scale.y || 1;
    this.questMarkerSprite.position.set(0, 2.48 * sc + 0.34, 0);
    this.questMarkerSprite.renderOrder = 32;
    if (this.options.proximityOnlyLabels) this.questMarkerSprite.visible = false;
    this.root.add(this.questMarkerSprite);
  }

  setName(text) {
    if (this.nameTagSprite) {
      this.root.remove(this.nameTagSprite);
      this.nameTagSprite.material.map?.dispose();
      this.nameTagSprite.material.dispose();
      this.nameTagSprite = null;
    }
    const clean = String(text || '').trim();
    if (!clean) return;

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 72;
    const ctx = canvas.getContext('2d');

    // 溫潤宣紙米白底 ＋ 深松綠框 ＋ 高對比深墨粗體字（日夜皆極清晰易讀！）
    ctx.fillStyle = 'rgba(255, 251, 240, 0.96)';
    drawRoundRect(ctx, 14, 10, 292, 52, 26);
    ctx.fill();
    ctx.strokeStyle = '#183C32';
    ctx.lineWidth = 4.5;
    drawRoundRect(ctx, 14, 10, 292, 52, 26);
    ctx.stroke();

    ctx.fillStyle = '#142E26';
    ctx.font = '900 28px "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(clean.slice(0, 10), 160, 37);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.nameTagSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      toneMapped: false
    }));
    this.nameTagSprite.scale.set(1.75, 0.40, 1);
    const sc = this.scaleGroup.scale.y || 1;
    this.nameTagSprite.position.set(0, 1.98 * sc + 0.18, 0);
    this.nameTagSprite.renderOrder = 25;
    if (this.options.proximityOnlyLabels) this.nameTagSprite.visible = false;
    this.root.add(this.nameTagSprite);
  }

  showSpeechBubble(text, duration = 4.2) {
    if (this.bubbleSprite) {
      this.root.remove(this.bubbleSprite);
      this.bubbleSprite.material.map?.dispose();
      this.bubbleSprite.material.dispose();
      this.bubbleSprite = null;
    }
    const clean = String(text || '').trim();
    if (!clean) return;

    const canvas = document.createElement('canvas');
    canvas.width = 520;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(251, 247, 233, 0.97)';
    drawRoundRect(ctx, 12, 10, 496, 68, 26);
    ctx.fill();
    ctx.strokeStyle = '#183C32';
    ctx.lineWidth = 4;
    drawRoundRect(ctx, 12, 10, 496, 68, 26);
    ctx.stroke();

    // 對話框小尖角
    ctx.fillStyle = 'rgba(251, 247, 233, 0.97)';
    ctx.beginPath();
    ctx.moveTo(248, 76);
    ctx.lineTo(260, 92);
    ctx.lineTo(272, 76);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#183C32';
    ctx.font = 'bold 25px "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const display = clean.length > 18 ? clean.slice(0, 17) + '…' : clean;
    ctx.fillText(display, 260, 45);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.bubbleSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      toneMapped: false
    }));
    this.bubbleSprite.scale.set(3.0, 0.58, 1);
    const sc = this.scaleGroup.scale.y || 1;
    this.bubbleSprite.position.set(0, 2.55 * sc + 0.24, 0);
    this.bubbleSprite.renderOrder = 30;
    this.root.add(this.bubbleSprite);
    this.bubbleTimer = duration;
  }

  setHoldingIncense(hasIncense) {
    this.holdingIncense = Boolean(hasIncense);
    if (this.incenseGroup) this.incenseGroup.visible = this.holdingIncense && !this.holdingTeapot && !this.chanting;
  }

  setHoldingTeapot(hasTeapot) {
    this.holdingTeapot = Boolean(hasTeapot);
    if (this.teapotGroup) this.teapotGroup.visible = this.holdingTeapot && !this.chanting;
    if (this.incenseGroup) this.incenseGroup.visible = this.holdingIncense && !this.holdingTeapot && !this.chanting;
  }

  setChanting(isChanting) {
    this.chanting = Boolean(isChanting);
    if (this.chantFishGroup) this.chantFishGroup.visible = this.chanting;
    if (this.chantMalletGroup) this.chantMalletGroup.visible = this.chanting;
    if (this.incenseGroup) this.incenseGroup.visible = this.holdingIncense && !this.holdingTeapot && !this.chanting;
    if (this.teapotGroup) this.teapotGroup.visible = this.holdingTeapot && !this.chanting;
    if (!this.chanting) this.fishTapAnim = 0;
  }

  triggerWoodenFishTap() {
    if (!this.chanting) this.setChanting(true);
    this.fishTapAnim = 1.0;
  }

  getWoodenFishWorldPos() {
    const pos = new THREE.Vector3();
    if (this.chantFishGroup && this.chantFishGroup.visible) {
      this.chantFishGroup.getWorldPosition(pos);
      return pos;
    }
    return this.getHandWorldPos();
  }

  getIncenseSmokeWorldPos() {
    if (!this.holdingIncense || this.holdingTeapot) return null;
    const pos = new THREE.Vector3();
    this.incenseTipAnchor.getWorldPosition(pos);
    return pos;
  }

  getHandWorldPos() {
    const pos = new THREE.Vector3(0, 1.05 * (this.scaleGroup.scale.y || 1), 0.45);
    return this.root.localToWorld(pos);
  }

  isLockedInAction() {
    return ['bow', 'kneelBow', 'insert', 'burn', 'pourTea'].includes(this.state);
  }

  setState(nextState) {
    const ACTION_DURATIONS = {
      bow: 1.35,
      kneelBow: 1.95,
      insert: 0.62,
      burn: 2.6,
      pourTea: 1.85,
      wave: 1.9,
      salute: 1.65,
      handshake: 1.8
    };
    const prevState = this.state;
    this.state = nextState || 'idle';
    if (ACTION_DURATIONS[this.state]) {
      // ★ 遠端真人玩家同步到動作狀態時，必須給予有效 actionDuration，
      //   否則 actionTimer / 0 會產生 Infinity -> Math.sin(Infinity) = NaN，導致 torso 與整個上半身消失只剩雙腳！
      if (prevState !== this.state || !(this.actionDuration > 0)) {
        this.actionTimer = 0;
        this.actionDuration = ACTION_DURATIONS[this.state];
        this.actionCallback = null;
      }
    } else {
      this.actionTimer = 0;
      this.actionCallback = null;
    }
  }

  playEmote(action = 'wave', onComplete = null) {
    const durations = { wave: 1.9, salute: 1.65, handshake: 1.8 };
    this.state = durations[action] ? action : 'wave';
    this.actionTimer = 0;
    this.actionDuration = durations[this.state];
    this.actionCallback = onComplete || null;
  }

  playPourTea(onComplete = null) {
    this.state = 'pourTea';
    this.actionTimer = 0;
    this.actionDuration = 1.85;
    this.actionCallback = onComplete || null;
  }

  playThreeBows(onComplete) {
    this.state = 'bow';
    this.actionTimer = 0;
    this.actionDuration = 1.35; // 需求 #2：三拜節奏流暢明快不拖沓！
    this.actionCallback = onComplete || null;
  }

  playKneelThreeBows(onComplete) {
    this.state = 'kneelBow';
    this.actionTimer = 0;
    this.actionDuration = 1.95;
    this.actionCallback = onComplete || null;
  }

  playInsertIncense(onComplete) {
    this.state = 'insert';
    this.actionTimer = 0;
    this.actionDuration = 0.62;
    this.actionCallback = onComplete || null;
  }

  playBurnPaperMotion(duration = 2.6, onComplete) {
    this.state = 'burn';
    this.actionTimer = 0;
    this.actionDuration = duration;
    this.actionCallback = onComplete || null;
  }

  update(dt, elapsed) {
    if (this.bubbleSprite) {
      this.bubbleTimer -= dt;
      if (this.bubbleTimer <= 0) {
        this.root.remove(this.bubbleSprite);
        this.bubbleSprite.material.map?.dispose();
        this.bubbleSprite.material.dispose();
        this.bubbleSprite = null;
      }
    }

    let targetBodyY = 0;
    let targetBodyZ = 0;
    let targetTorsoPitch = 0;
    let lLegRot = 0;
    let rLegRot = 0;
    let lArmX = this.holdingIncense ? -0.98 : 0;
    let rArmX = this.holdingIncense ? -0.98 : 0;
    let lArmZ = this.holdingIncense ? 0.34 : 0.10;
    let rArmZ = this.holdingIncense ? -0.34 : -0.10;

    if (this.state === 'walk') {
      const stride = Math.sin(elapsed * 11.5);
      targetBodyY = Math.abs(Math.cos(elapsed * 11.5)) * 0.075;
      lLegRot = stride * 0.62;
      rLegRot = -stride * 0.62;
      if (!this.holdingIncense) {
        lArmX = -stride * 0.52;
        rArmX = stride * 0.52;
      }
    } else if (this.state === 'bow') {
      const dur = Math.max(0.25, Number.isFinite(this.actionDuration) && this.actionDuration > 0 ? this.actionDuration : 1.35);
      this.actionTimer += dt;
      const wave = Math.sin((this.actionTimer / dur) * Math.PI * 3);
      const bend = Math.max(0, wave);
      targetTorsoPitch = bend * 0.58;
      lArmX = -1.25 - bend * 0.28;
      rArmX = -1.25 - bend * 0.28;
      lArmZ = 0.38;
      rArmZ = -0.38;
      if (this.actionTimer >= dur) {
        const cb = this.actionCallback;
        this.state = 'idle';
        this.actionTimer = 0;
        this.actionCallback = null;
        if (cb) cb();
      }
    } else if (this.state === 'insert') {
      const dur = Math.max(0.25, Number.isFinite(this.actionDuration) && this.actionDuration > 0 ? this.actionDuration : 0.62);
      this.actionTimer += dt;
      const p = Math.sin((this.actionTimer / dur) * Math.PI);
      targetTorsoPitch = p * 0.34;
      lArmX = -1.55 * p - 0.5 * (1 - p);
      rArmX = -1.55 * p - 0.5 * (1 - p);
      lArmZ = 0.30;
      rArmZ = -0.30;
      if (this.actionTimer >= dur) {
        const cb = this.actionCallback;
        this.state = 'idle';
        this.actionTimer = 0;
        this.actionCallback = null;
        if (cb) cb();
      }
    } else if (this.state === 'burn') {
      const dur = Math.max(0.25, Number.isFinite(this.actionDuration) && this.actionDuration > 0 ? this.actionDuration : 2.6);
      this.actionTimer += dt;
      const toss = Math.sin(this.actionTimer * 18.5);
      targetTorsoPitch = 0.14;
      rArmX = -0.95 - Math.max(0, toss) * 0.65;
      lArmX = -0.65;
      if (this.actionTimer >= dur) {
        const cb = this.actionCallback;
        this.state = 'idle';
        this.actionTimer = 0;
        this.actionCallback = null;
        if (cb) cb();
      }
    } else if (this.state === 'wave') {
      // ★ V1.1 放大版揮手打招呼（手機小螢幕一眼看得超清楚！）
      const dur = Math.max(0.25, Number.isFinite(this.actionDuration) && this.actionDuration > 0 ? this.actionDuration : 1.9);
      this.actionTimer += dt;
      targetBodyY = Math.abs(Math.sin(this.actionTimer * 6.5)) * 0.10;
      rArmX = -2.65;
      rArmZ = -0.55 + Math.sin(this.actionTimer * 15.0) * 0.55;
      lArmX = -0.25;
      lArmZ = 0.22;
      if (this.actionTimer >= dur) {
        const cb = this.actionCallback;
        this.state = 'idle';
        this.actionTimer = 0;
        this.actionCallback = null;
        if (cb) cb();
      }
    } else if (this.state === 'salute') {
      // ★ V1.1 雙手合十作揖（大幅躬身與合掌！）
      const dur = Math.max(0.25, Number.isFinite(this.actionDuration) && this.actionDuration > 0 ? this.actionDuration : 1.65);
      this.actionTimer += dt;
      const p = Math.sin((this.actionTimer / dur) * Math.PI * 2);
      const bend = Math.max(0, p);
      targetTorsoPitch = 0.20 + bend * 0.45;
      lArmX = -1.45 - bend * 0.25;
      rArmX = -1.45 - bend * 0.25;
      lArmZ = 0.52;
      rArmZ = -0.52;
      if (this.actionTimer >= dur) {
        const cb = this.actionCallback;
        this.state = 'idle';
        this.actionTimer = 0;
        this.actionCallback = null;
        if (cb) cb();
      }
    } else if (this.state === 'handshake') {
      // ★ V1.1 熱情握手結緣（雙手前伸上下晃動！）
      const dur = Math.max(0.25, Number.isFinite(this.actionDuration) && this.actionDuration > 0 ? this.actionDuration : 1.8);
      this.actionTimer += dt;
      const shake = Math.sin(this.actionTimer * 14.0) * 0.34;
      targetTorsoPitch = 0.16;
      rArmX = -1.35 + shake;
      rArmZ = -0.18;
      lArmX = -0.95 + shake * 0.5;
      lArmZ = 0.24;
      if (this.actionTimer >= dur) {
        const cb = this.actionCallback;
        this.state = 'idle';
        this.actionTimer = 0;
        this.actionCallback = null;
        if (cb) cb();
      }
    } else if (this.state === 'pourTea') {
      // ★ V1.1 提茶壺傾倒敬奉清茶三杯
      const dur = Math.max(0.25, Number.isFinite(this.actionDuration) && this.actionDuration > 0 ? this.actionDuration : 1.85);
      this.actionTimer += dt;
      const pour = Math.sin((this.actionTimer / dur) * Math.PI);
      targetTorsoPitch = 0.24 * pour;
      rArmX = -1.45 - pour * 0.35;
      rArmZ = -0.22;
      lArmX = -0.85;
      lArmZ = 0.30;
      if (this.teapotGroup) {
        this.teapotGroup.rotation.x = 0.65 * pour;
      }
      if (this.actionTimer >= dur) {
        if (this.teapotGroup) this.teapotGroup.rotation.x = 0;
        const cb = this.actionCallback;
        this.state = 'idle';
        this.actionTimer = 0;
        this.actionCallback = null;
        if (cb) cb();
      }
    } else if (this.state === 'kneelBow') {
      // ★ V36 拜主神下跪虔誠三拜：明確手持清香（絕不顯示木魚！只有念經模式才持木魚），雙小腿平摺於跪墊上緣！
      if (this.chanting) this.setChanting(false);
      const dur = Math.max(0.25, Number.isFinite(this.actionDuration) && this.actionDuration > 0 ? this.actionDuration : 1.95);
      this.actionTimer += dt;
      const wave = Math.sin((this.actionTimer / dur) * Math.PI * 3);
      const bend = Math.max(0, wave);
      targetBodyY = -0.14;
      targetTorsoPitch = 0.12 + bend * 0.50;
      lLegRot = 1.56;
      rLegRot = 1.56;
      lArmX = -1.25 - bend * 0.28;
      rArmX = -1.25 - bend * 0.28;
      lArmZ = 0.38;
      rArmZ = -0.38;
      if (this.actionTimer >= dur) {
        const cb = this.actionCallback;
        this.state = 'kneel';
        this.actionTimer = 0;
        this.actionCallback = null;
        if (cb) cb();
      }
    } else if (this.state === 'kneel') {
      // ★ V36 絲滑流暢敲木魚動作：三段式自然韻律（蓄力微揚 → 流暢下擊 → 彈性回彈）＋ 柔順呼吸擺動與微幅點頭、木魚彈性共鳴！
      targetBodyY = -0.14;
      lLegRot = 1.56;
      rLegRot = 1.56;
      if (this.chanting) {
        // 緩慢柔順的連續念經節奏波（無生硬停頓死區！）
        const ambientWave = 0.5 - 0.5 * Math.cos(elapsed * 2.9);
        const ambientSwing = Math.sin(elapsed * 2.9) * 0.08;

        // 點擊／自動敲木魚時的三段式平滑擊槌包絡（p: 0 -> 1，總長約 0.52 秒）
        let strikeLift = 0;    // 蓄力抬手（負值代表抬高）
        let strikeHit = 0;     // 下擊深度（0..1）
        let fishRecoil = 0;    // 木魚受擊微震回彈
        if (this.fishTapAnim > 0) {
          this.fishTapAnim = Math.max(0, this.fishTapAnim - dt / 0.52);
          const p = 1.0 - this.fishTapAnim; // 0 → 1 進度
          if (p < 0.26) {
            // 階段 1：柔順蓄力微舉手腕
            const u = p / 0.26;
            const ease = u * u * (3 - 2 * u);
            strikeLift = ease * 0.28;
          } else if (p < 0.48) {
            // 階段 2：流暢加速下揮精準擊中木魚冠頂
            const u = (p - 0.26) / 0.22;
            const easeIn = u * u;
            strikeLift = (1 - easeIn) * 0.28;
            strikeHit = easeIn;
          } else {
            // 階段 3：自然彈性微彈回位（阻尼餘弦平順收尾）
            const u = (p - 0.48) / 0.52;
            const smoothOut = 1 - (u * u * (3 - 2 * u));
            const bounce = Math.exp(-u * 4.5) * Math.cos(u * Math.PI * 2.2);
            strikeHit = Math.max(0, smoothOut * 0.72 + bounce * 0.28);
            fishRecoil = Math.exp(-u * 6.5) * Math.cos(u * Math.PI * 2.5);
          }
        }

        const totalHit = Math.min(1.08, ambientWave * 0.34 + strikeHit * 0.92);
        const totalLift = strikeLift + Math.max(0, -ambientSwing) * 0.4;

        targetTorsoPitch = 0.085 + ambientWave * 0.025 + strikeHit * 0.045;
        // 左手平穩端托木魚，受擊時極細微下沉呼應！
        lArmX = -1.16 + Math.max(0, fishRecoil) * 0.06 + ambientWave * 0.02;
        lArmZ = 0.44;
        // 右手肩肘自然連動：蓄力上揚 → 流暢下敲 → 柔彈歸位！
        rArmX = -1.42 - totalLift * 0.45 + totalHit * 0.44;
        rArmZ = -0.30 - totalHit * 0.14 + totalLift * 0.06;

        if (this.chantMalletGroup) {
          const malletTargetZ = 0.24 + totalLift * 0.46 - totalHit * 0.62;
          const malletTargetY = 0.14 + totalHit * 0.08;
          const mLerp = Math.min(1, dt * 22);
          this.chantMalletGroup.rotation.z += (malletTargetZ - this.chantMalletGroup.rotation.z) * mLerp;
          this.chantMalletGroup.rotation.y += (malletTargetY - this.chantMalletGroup.rotation.y) * mLerp;
        }
        if (this.chantFishGroup) {
          const squash = Math.max(0, fishRecoil) * 0.075;
          this.chantFishGroup.scale.set(1 + squash * 0.8, 1 - squash, 1 + squash * 0.8);
          this.chantFishGroup.rotation.set(0.32 + Math.max(0, fishRecoil) * 0.06, 0.26, 0);
        }
      } else {
        targetTorsoPitch = 0.08 + Math.sin(elapsed * 2.2) * 0.04;
        lArmX = this.holdingIncense ? -1.18 : -1.05;
        rArmX = this.holdingIncense ? -1.18 : -1.05;
        lArmZ = this.holdingIncense ? 0.38 : 0.44;
        rArmZ = this.holdingIncense ? -0.38 : -0.44;
      }
    } else if (this.state === 'sit') {
      // 依角色身高比例精準抬升臀部高於椅面（0.42m），雙腿平伸於椅緣前方，徹底消除腳穿過椅板！
      const sc = this.scaleGroup.scale.y || 1;
      targetBodyY = Math.max(0.15, (0.50 / sc) - 0.34);
      targetBodyZ = 0.11;
      lLegRot = -1.52 + Math.sin(elapsed * 2.2) * 0.04;
      rLegRot = -1.52 - Math.sin(elapsed * 2.2) * 0.04;
      lArmX = -0.24;
      rArmX = -0.24;
    } else {
      targetBodyY = Math.sin(elapsed * 2.4) * 0.022;
    }

    const lerp = Math.min(1, dt * (this.chanting ? 18 : 11));
    const lerpSafe = (cur, target) => {
      const t = Number.isFinite(target) ? target : 0;
      return Number.isFinite(cur) ? cur + (t - cur) * lerp : t;
    };
    this.bodyPivot.position.y = lerpSafe(this.bodyPivot.position.y, targetBodyY);
    this.bodyPivot.position.z = lerpSafe(this.bodyPivot.position.z, targetBodyZ);
    this.torso.rotation.x = lerpSafe(this.torso.rotation.x, targetTorsoPitch);
    this.leftLeg.rotation.x = lerpSafe(this.leftLeg.rotation.x, lLegRot);
    this.rightLeg.rotation.x = lerpSafe(this.rightLeg.rotation.x, rLegRot);
    this.leftArm.rotation.x = lerpSafe(this.leftArm.rotation.x, lArmX);
    this.rightArm.rotation.x = lerpSafe(this.rightArm.rotation.x, rArmX);
    this.leftArm.rotation.z = lerpSafe(this.leftArm.rotation.z, lArmZ);
    this.rightArm.rotation.z = lerpSafe(this.rightArm.rotation.z, rArmZ);

    if (this.holdingIncense && this.incenseLight) {
      this.incenseLight.intensity = 0.72 + Math.sin(elapsed * 9.5) * 0.22;
    }
    if (this.holdingTeapot && this.state !== 'pourTea') {
      this.rightArm.rotation.x = lerpSafe(this.rightArm.rotation.x, -0.78);
      if (this.teapotGroup) this.teapotGroup.rotation.x = lerpSafe(this.teapotGroup.rotation.x, 0);
    }
    if (this.questMarkerSprite) {
      const sc = this.scaleGroup.scale.y || 1;
      this.questMarkerSprite.position.y = 2.48 * sc + 0.34 + Math.sin(elapsed * 5.2) * 0.14;
    }
  }
}
