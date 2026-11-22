/**
 * V4 環廟大園區晝夜燈火氛圍系統
 * 適配 54m × 52m 擴大後的大殿與 360° 環廟步道：暖黃串燈、石燈籠暖光池、祈福天燈與金色天幕極光
 */
import * as THREE from 'three';
import { LIGHTING_THEMES } from '../config/templeConfig.js';

function createRadialGlowTexture(innerHex, midHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 6, 128, 128, 124);
  g.addColorStop(0, innerHex);
  g.addColorStop(0.42, midHex);
  g.addColorStop(1, 'rgba(255, 190, 90, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class DayNightAtmosphere {
  constructor(scene, lights, templeRefs) {
    this.scene = scene;
    this.lights = lights;
    this.refs = templeRefs;

    this.mode = 'day';
    this.nightFactor = 0;
    this.targetNight = 0;

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.nightOnlyGlowMaterials = [];
    this.stringBulbMaterials = [];
    this.pointLights = [];
    this.skyLanterns = [];
    this.auroraMaterial = null;

    this._buildCourtyardStringLights();
    this._buildStoneLampsAndLightPools();
    this._buildNightSkyLanterns();
    this._buildGoldenAuroraRibbon();

    this._applyThemeImmediate(0);
  }

  _buildCourtyardStringLights() {
    const cableMat = new THREE.MeshBasicMaterial({ color: 0x2B211E });
    const bulbGeo = new THREE.SphereGeometry(0.115, 8, 8);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xFFD98A, toneMapped: false });
    this.stringBulbMaterials.push(bulbMat);

    // ★ 需求 #10：移除天公爐正前方立柱，改將串燈優雅拉掛於左右攤位與廟簷兩側，天公爐前方開闊無遮擋！
    const strands = [
      [new THREE.Vector3(-8.8, 6.8, 8.8), new THREE.Vector3(-12.5, 3.8, 13.0)],
      [new THREE.Vector3(-4.6, 6.8, 8.8), new THREE.Vector3(-11.2, 3.6, 19.8)],
      [new THREE.Vector3(4.6, 6.8, 8.8), new THREE.Vector3(11.2, 3.6, 19.8)],
      [new THREE.Vector3(8.8, 6.8, 8.8), new THREE.Vector3(14.0, 3.8, 6.2)],
      [new THREE.Vector3(-11.2, 3.9, 19.8), new THREE.Vector3(11.2, 3.9, 19.8)]
    ];

    strands.forEach(([a, b]) => {
      const mid = a.clone().lerp(b, 0.5);
      mid.y -= 0.75;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.02, 5, false), cableMat);
      this.root.add(tube);

      for (let i = 1; i < 8; i++) {
        const pt = curve.getPoint(i / 8);
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.copy(pt);
        this.root.add(bulb);
      }
    });
  }

  _buildStoneLampsAndLightPools() {
    const glowTex = createRadialGlowTexture('rgba(255, 214, 130, 0.92)', 'rgba(255, 174, 72, 0.42)');
    const poolGeo = new THREE.PlaneGeometry(4.6, 4.6);

    const poolCoords = [
      // 前門燈籠群與大殿中央大道暖光池
      [-6.8, 0.07, 9.2, 4.5],
      [-2.2, 0.39, 7.6, 4.2],
      [2.2, 0.39, 7.6, 4.2],
      [6.8, 0.07, 9.2, 4.5],
      [0, 0.39, 1.5, 7.2],
      [0, 0.39, -5.5, 6.8],
      // 天公爐、板凳、公佈欄（移至母獅左側）、金爐、供品鋪、挑戰攤
      [0, 0.07, 14.5, 6.2],
      [-10.6, 0.07, 14.0, 6.0],
      [6.7, 0.07, 12.2, 5.2],
      [14.8, 0.07, 4.8, 6.0],
      [-11.4, 0.07, 19.6, 5.4],
      [11.4, 0.07, 19.6, 5.4]
    ];

    poolCoords.forEach(([x, y, z, size]) => {
      const mat = new THREE.MeshBasicMaterial({
        map: glowTex,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      });
      const pool = new THREE.Mesh(poolGeo, mat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(x, y, z);
      pool.scale.setScalar(size / 4.6);
      this.root.add(pool);
      this.nightOnlyGlowMaterials.push({ mat, maxOpacity: 0.54 });
    });

    const warmSpots = [
      // 廟外廣場暖燈
      [-10.6, 3.6, 14.2, 14, 2.8],
      [0, 4.2, 14.8, 16, 3.0],
      [6.7, 3.6, 12.4, 14, 2.8],
      // ★ 需求 #18：夜間正殿室內充足暖金照明（5 盞均勻殿內燈火，神像、對聯、拜墊與太歲牆清楚明亮！）
      [0, 6.2, 4.5, 22, 4.2],
      [-5.5, 5.8, 1.5, 20, 3.8],
      [5.5, 5.8, 1.5, 20, 3.8],
      [-5.5, 5.8, -5.8, 22, 4.2],
      [5.5, 5.8, -5.8, 22, 4.2],
      [0, 6.4, -7.8, 24, 5.0]
    ];
    warmSpots.forEach(([x, y, z, dist, maxInt]) => {
      const pl = new THREE.PointLight(0xFFD07A, 0, dist, 1.35);
      pl.position.set(x, y, z);
      this.root.add(pl);
      this.pointLights.push({ light: pl, maxIntensity: maxInt });
    });

    // ★ 需求 #18：精美古風「雕花宮燈路燈」（階梯石座＋深銅雕花燈柱＋祥雲金臂＋六角琉璃宮燈＋朱紅翹角小亭蓋！）
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xCACFD4, roughness: 0.84 });
    const bronzePostMat = new THREE.MeshStandardMaterial({ color: 0x3D2E26, metalness: 0.45, roughness: 0.48 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xE8BA56, metalness: 0.62, roughness: 0.30 });
    const roofCapMat = new THREE.MeshStandardMaterial({ color: 0xB91C1C, roughness: 0.55 });
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xFFE394, toneMapped: false });
    // ★ 需求 #8：廟前兩盞路燈移至前廣場磁磚的左右最前兩角（-17.4, 24.6 與 15.8, 24.6），讓天公爐與廟埕視野全然開闊！
    const stoneLampCoords = [
      [-17.4, 24.6], [15.8, 24.6],
      [-17.8, 8.0], [-17.8, -4.0], [-17.8, -15.5],
      [17.8, 9.8], [17.8, -4.0], [17.8, -15.5],
      [-9.0, -19.2], [0, -19.2], [9.0, -19.2]
    ];

    stoneLampCoords.forEach(([sx, sz]) => {
      const g = new THREE.Group();
      // 雙層雕花石座
      const base1 = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.24, 8), stoneMat);
      base1.position.y = 0.12;
      const base2 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.22, 8), stoneMat);
      base2.position.y = 0.34;
      // 纖細深銅路燈柱 ＋ 金色節環
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.115, 2.05, 10), bronzePostMat);
      shaft.position.y = 1.44;
      shaft.castShadow = true;
      const midRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 12), goldMat);
      midRing.rotation.x = Math.PI / 2;
      midRing.position.y = 1.55;
      // 托盤花座（六角頂點統一對齊 sin/cos！）
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.14, 0.14, 6), goldMat);
      dish.position.y = 2.50;
      // 六角暖光宮燈玻璃核心 ＋ 6 根精準貼合六角頂點的金框立稜（絕不錯位破圖！）
      const box = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.215, 0.52, 6), coreMat);
      box.position.y = 2.83;
      const topSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.255, 0.06, 6), goldMat);
      topSeat.position.y = 3.09;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const sx = Math.sin(a);
        const cz = Math.cos(a);
        const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.54, 6), goldMat);
        rib.position.set(sx * 0.245, 2.83, cz * 0.245);
        g.add(rib);
        // 六角朱紅飛簷起翹角（精準對齊蓋子六角頂點！）
        const eave = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.18, 5), goldMat);
        eave.position.set(sx * 0.49, 3.16, cz * 0.49);
        eave.rotation.order = 'YXZ';
        eave.rotation.y = a;
        eave.rotation.x = 0.78;
        g.add(eave);
      }
      // 朱紅翹角六角小亭蓋 ＋ 精準對齊六角金邊框 ＋ 金葫蘆頂珠
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.50, 0.34, 6), roofCapMat);
      cap.position.y = 3.27;
      const capRim = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.026, 6, 6), goldMat);
      capRim.rotation.x = Math.PI / 2;
      capRim.rotation.z = Math.PI / 6; // 精準對齊 ConeGeometry 6 角頂點！
      capRim.position.y = 3.11;
      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), goldMat);
      finial.position.y = 3.49;

      g.add(base1, base2, shaft, midRing, dish, box, topSeat, cap, capRim, finial);
      g.position.set(sx, 0.03, sz);
      this.root.add(g);

      const mat = new THREE.MeshBasicMaterial({
        map: glowTex,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      });
      const lp = new THREE.Mesh(poolGeo, mat);
      lp.rotation.x = -Math.PI / 2;
      lp.position.set(sx, 0.07, sz);
      lp.scale.setScalar(1.18);
      this.root.add(lp);
      this.nightOnlyGlowMaterials.push({ mat, maxOpacity: 0.62 });
    });
  }

  _buildNightSkyLanterns() {
    const lanternGeo = new THREE.CylinderGeometry(0.38, 0.24, 0.68, 4);
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0xFFAE42, transparent: true, opacity: 0, toneMapped: false });
    const innerGlowMat = new THREE.MeshBasicMaterial({ color: 0xFFF3B0, transparent: true, opacity: 0, toneMapped: false });
    this.nightOnlyGlowMaterials.push({ mat: lanternMat, maxOpacity: 0.92 });
    this.nightOnlyGlowMaterials.push({ mat: innerGlowMat, maxOpacity: 0.98 });

    for (let i = 0; i < 22; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(lanternGeo, lanternMat);
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 6), innerGlowMat);
      core.position.y = -0.16;
      g.add(body, core);

      const angle = (i / 22) * Math.PI * 2;
      const radius = 25 + (i % 4) * 4.5;
      g.position.set(
        Math.cos(angle) * radius,
        3.0 + (i * 1.5) % 18,
        -4 + Math.sin(angle) * (radius * 0.72)
      );
      g.userData = { speedY: 0.44 + (i % 5) * 0.12, phase: i * 1.3, baseX: g.position.x };
      this.root.add(g);
      this.skyLanterns.push(g);
    }
  }

  _buildGoldenAuroraRibbon() {
    this.auroraMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        uniform float uTime;
        void main() {
          vUv = uv;
          vec3 pos = position;
          pos.z += sin(pos.x * 0.14 + uTime * 0.7) * 1.6;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uOpacity;
        void main() {
          float wave = 0.5 + 0.5 * sin(vUv.x * 18.0 - uTime * 0.85 + sin(vUv.x * 6.0 + uTime * 0.4));
          float verticalFade = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.35, 1.0, vUv.y));
          float edgeFade = smoothstep(0.0, 0.12, vUv.x) * (1.0 - smoothstep(0.88, 1.0, vUv.x));
          vec3 colGold = vec3(1.0, 0.78, 0.32);
          vec3 colAmber = vec3(0.95, 0.46, 0.18);
          vec3 col = mix(colAmber, colGold, wave);
          gl_FragColor = vec4(col, verticalFade * edgeFade * (0.35 + 0.65 * wave) * uOpacity);
        }
      `
    });

    const curtain = new THREE.Mesh(new THREE.PlaneGeometry(78, 12.0, 56, 8), this.auroraMaterial);
    curtain.position.set(0, 12.5, -26.5);
    this.root.add(curtain);
  }

  setMode(mode) {
    this.mode = mode === 'night' ? 'night' : 'day';
    this.targetNight = this.mode === 'night' ? 1 : 0;
  }

  toggleMode() {
    this.setMode(this.mode === 'day' ? 'night' : 'day');
    return this.mode;
  }

  _applyThemeImmediate(nf) {
    const D = LIGHTING_THEMES.day;
    const N = LIGHTING_THEMES.night;

    this.scene.background.copy(new THREE.Color(D.skyColor).lerp(new THREE.Color(N.skyColor), nf));
    if (this.scene.fog) this.scene.fog.color.copy(new THREE.Color(D.fogColor).lerp(new THREE.Color(N.fogColor), nf));
    this.scene.environmentIntensity = THREE.MathUtils.lerp(0.54, 0.20, nf);

    this.lights.sun.color.copy(new THREE.Color(D.sunColor).lerp(new THREE.Color(N.sunColor), nf));
    this.lights.sun.intensity = THREE.MathUtils.lerp(D.sunIntensity, N.sunIntensity, nf);

    this.lights.hemi.color.copy(new THREE.Color(D.hemiSky).lerp(new THREE.Color(N.hemiSky), nf));
    this.lights.hemi.groundColor.copy(new THREE.Color(D.hemiGround).lerp(new THREE.Color(N.hemiGround), nf));
    this.lights.hemi.intensity = THREE.MathUtils.lerp(D.hemiIntensity, N.hemiIntensity, nf);

    this.lights.fill.color.copy(new THREE.Color(D.fillColor).lerp(new THREE.Color(N.fillColor), nf));
    this.lights.fill.intensity = THREE.MathUtils.lerp(D.fillIntensity, N.fillIntensity, nf);

    if (this.refs.shrineLight) this.refs.shrineLight.intensity = THREE.MathUtils.lerp(D.shrineLightIntensity, N.shrineLightIntensity, nf);
    if (this.refs.hearthLight) this.refs.hearthLight.intensity = THREE.MathUtils.lerp(D.furnaceLightIntensity, N.furnaceLightIntensity, nf);

    const lanternEm = THREE.MathUtils.lerp(D.lanternEmissive, N.lanternEmissive, nf);
    (this.refs.lanternMaterials || []).forEach(m => { m.emissiveIntensity = lanternEm; });

    const bulbColor = new THREE.Color(0xEDE6D6).lerp(new THREE.Color(0xFFE08C), nf);
    this.stringBulbMaterials.forEach(m => m.color.copy(bulbColor));

    this.nightOnlyGlowMaterials.forEach(({ mat, maxOpacity }) => { mat.opacity = maxOpacity * nf; });
    this.pointLights.forEach(({ light, maxIntensity }) => { light.intensity = maxIntensity * nf; });
    if (this.auroraMaterial) this.auroraMaterial.uniforms.uOpacity.value = 0.42 * nf;
  }

  update(dt, elapsed) {
    if (Math.abs(this.targetNight - this.nightFactor) > 0.002) {
      this.nightFactor += (this.targetNight - this.nightFactor) * Math.min(1, dt * 3.5);
      this._applyThemeImmediate(this.nightFactor);
    }

    if (this.auroraMaterial && this.nightFactor > 0.02) {
      this.auroraMaterial.uniforms.uTime.value = elapsed;
    }

    if (this.nightFactor > 0.02) {
      for (const l of this.skyLanterns) {
        l.visible = true;
        l.position.y += l.userData.speedY * dt;
        l.position.x = l.userData.baseX + Math.sin(elapsed * 0.6 + l.userData.phase) * 0.65;
        l.rotation.y += dt * 0.35;
        if (l.position.y > 22) l.position.y = 2.5;
      }
    } else {
      for (const l of this.skyLanterns) l.visible = false;
    }
  }
}
