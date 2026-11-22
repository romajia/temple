/**
 * 3D 溫馨粒子與動畫系統 (V2)
 * 新增：
 * - 金紙「一張一張飛入爐口」逐張動畫 (launchJossPaperSequence)
 * - 供品祈願「金色祈福光束上達神明」特效 (spawnPrayerBeam)
 * - 嫋嫋輕煙、爐火火星與祈福金光
 */
import * as THREE from 'three';

/**
 * 繪製柔和羽化「嫋嫋輕煙雲紋」貼圖（邊緣完全柔化，呈現象真香火微霧質感！）
 */
function createSoftSmokeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);

  // 三團錯落柔光霧核，營造細膩煙絲層次
  [
    [64, 64, 58, 0.72],
    [52, 56, 36, 0.45],
    [76, 70, 34, 0.42]
  ].forEach(([cx, cy, r, a]) => {
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
    g.addColorStop(0, `rgba(255, 253, 248, ${a})`);
    g.addColorStop(0.42, `rgba(242, 238, 230, ${a * 0.55})`);
    g.addColorStop(0.76, `rgba(224, 222, 218, ${a * 0.18})`);
    g.addColorStop(1, 'rgba(220, 220, 220, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class TempleParticleEffects {
  constructor(scene) {
    this.scene = scene;
    this.smokeParticles = [];
    this.fireParticles = [];
    this.blessingParticles = [];
    this.flyingPapers = [];
    this.prayerBeams = [];

    this.smokeTexture = createSoftSmokeTexture();
    this.fireGeo = new THREE.ConeGeometry(0.16, 0.44, 6);
    this.sparkGeo = new THREE.OctahedronGeometry(0.085, 0);

    this.smokeEmitters = [];
    this.furnaceOrigin = null;
    this.furnaceBoost = 0;
  }

  addSmokeEmitter(getPos, rate = 0.22, scale = 1.0, spread = 0.14) {
    this.smokeEmitters.push({ getPos, rate, timer: Math.random() * rate, scale, spread });
  }

  setFurnaceOrigin(vec3) {
    this.furnaceOrigin = vec3.clone();
  }

  /**
   * 燒金紙：一張一張從角色手邊拋物線飛入金爐爐口，每張入爐即刻燃起火焰與煙霧！
   */
  launchJossPaperSequence(startPos, targetOpeningPos, options = {}) {
    const {
      count = 7,
      intervalMs = 340,
      onEachSheet = null,
      onComplete = null
    } = options;

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this._spawnSingleJossSheet(startPos, targetOpeningPos, () => {
          this.furnaceBoost = Math.max(this.furnaceBoost, 1.8);
          for (let k = 0; k < 6; k++) this._spawnFireParticle(true);
          if (this.furnaceOrigin) {
            this._spawnSmoke(
              new THREE.Vector3(this.furnaceOrigin.x, this.furnaceOrigin.y + 2.55, this.furnaceOrigin.z),
              1.65
            );
          }
          if (onEachSheet) onEachSheet(i + 1, count);
          if (i === count - 1) {
            this.furnaceBoost = 3.2;
            this.spawnBlessingBurst(
              new THREE.Vector3(targetOpeningPos.x, targetOpeningPos.y + 1.4, targetOpeningPos.z),
              22,
              0xFFD966
            );
            if (onComplete) onComplete();
          }
        });
      }, i * intervalMs);
    }
  }

  _spawnSingleJossSheet(startPos, targetPos, onArrive) {
    const group = new THREE.Group();

    // 單張黃色金紙＋中央閃亮金箔
    const paper = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.015, 0.24),
      new THREE.MeshStandardMaterial({ color: 0xF7D154, roughness: 0.65 })
    );
    const foil = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.02, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.6, roughness: 0.25, emissive: 0x664400 })
    );
    group.add(paper, foil);
    group.position.copy(startPos);
    group.userData = {
      start: startPos.clone(),
      end: targetPos.clone(),
      progress: 0,
      duration: 0.56,
      spinX: (Math.random() - 0.5) * 9,
      spinZ: (Math.random() - 0.5) * 8,
      onArrive
    };

    this.scene.add(group);
    this.flyingPapers.push(group);
  }

  /**
   * 供品祈願上達神明：從供桌升起柔和金色光球流向主神神龕
   */
  spawnPrayerBeam(fromPos, toPos) {
    for (let i = 0; i < 16; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xFFE066 : 0xFFF7CC,
        transparent: true,
        opacity: 0.95
      });
      const orb = new THREE.Mesh(this.sparkGeo, mat);
      orb.position.copy(fromPos);
      orb.scale.setScalar(1.2);
      orb.userData = {
        start: fromPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.4, 0, (Math.random() - 0.5) * 0.5)),
        end: toPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, Math.random() * 0.8, 0)),
        progress: -i * 0.06,
        duration: 1.15
      };
      this.scene.add(orb);
      this.prayerBeams.push(orb);
    }
  }

  triggerFurnaceBurn() {
    this.furnaceBoost = 3.5;
    if (!this.furnaceOrigin) return;
    for (let i = 0; i < 20; i++) this._spawnFireParticle(true);
  }

  spawnBlessingBurst(position, count = 20, color = 0xFFD966) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.95
      });
      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      mesh.position.copy(position);
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.6 + Math.random() * 1.4;
      mesh.userData = {
        vx: Math.cos(angle) * speed,
        vy: 1.2 + Math.random() * 1.8,
        vz: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.9 + Math.random() * 0.7
      };
      this.scene.add(mesh);
      this.blessingParticles.push(mesh);
    }
  }

  _spawnSmoke(pos, scale = 1.0, spread = 0.14) {
    // 柔霧輕煙 Sprite：隨風緩緩搖曳上升，由纖細煙絲舒展淡散！
    if (this.smokeParticles.length > 90) return;
    const mat = new THREE.SpriteMaterial({
      map: this.smokeTexture,
      color: 0xFAF7F0,
      transparent: true,
      opacity: 0.01,
      depthWrite: false,
      toneMapped: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(
      pos.x + (Math.random() - 0.5) * spread,
      pos.y + Math.random() * 0.06,
      pos.z + (Math.random() - 0.5) * spread
    );
    sprite.scale.setScalar(0.24 * scale);
    sprite.material.rotation = Math.random() * Math.PI * 2;
    sprite.userData = {
      originX: sprite.position.x,
      originZ: sprite.position.z,
      vy: 0.28 + Math.random() * 0.14,          // 緩緩優雅上升速度
      driftX: (Math.random() - 0.5) * 0.08,
      driftZ: (Math.random() - 0.5) * 0.08,
      swayAmp: (0.14 + Math.random() * 0.16) * Math.min(1.3, scale), // 明顯柔和左右搖曳幅寬
      swayFreq: 1.15 + Math.random() * 0.65,
      phase: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.45,
      life: 0,
      maxLife: 3.6 + Math.random() * 1.3,       // 緩緩飄升 3.6～4.9 秒！
      baseScale: scale,
      maxOpacity: 0.54
    };
    this.scene.add(sprite);
    this.smokeParticles.push(sprite);
  }

  _spawnFireParticle(isBurst = false) {
    if (!this.furnaceOrigin) return;
    const isFlame = Math.random() < 0.6;
    const colors = isFlame ? [0xFF5A1F, 0xFF8C1A, 0xFFD03B] : [0xFFE066, 0xFFA500];
    const mat = new THREE.MeshBasicMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      transparent: true,
      opacity: 0.92
    });
    const mesh = new THREE.Mesh(isFlame ? this.fireGeo : this.sparkGeo, mat);
    mesh.position.set(
      this.furnaceOrigin.x + (Math.random() - 0.5) * 0.62,
      this.furnaceOrigin.y + (isFlame ? 0.12 : 1.75),
      this.furnaceOrigin.z + (Math.random() - 0.5) * 0.62
    );
    const boostMul = isBurst ? 1.6 : 1.0;
    mesh.scale.setScalar((isFlame ? 0.85 : 0.7) * boostMul);
    mesh.userData = {
      vx: (Math.random() - 0.5) * 0.6,
      vy: (isFlame ? 1.35 : 2.1) * boostMul + Math.random() * 0.75,
      vz: (Math.random() - 0.5) * 0.6,
      life: 0,
      maxLife: isFlame ? 0.55 + Math.random() * 0.32 : 1.15 + Math.random() * 0.65
    };
    this.scene.add(mesh);
    this.fireParticles.push(mesh);
  }

  update(dt, elapsed) {
    // 1. 香煙發射器（嫋嫋搖曳輕煙）
    for (const emitter of this.smokeEmitters) {
      const pos = emitter.getPos();
      if (!pos) continue;
      emitter.timer += dt;
      if (emitter.timer >= emitter.rate) {
        emitter.timer = 0;
        this._spawnSmoke(pos, emitter.scale, emitter.spread || 0.14);
      }
    }

    // 2. 金爐火焰
    if (this.furnaceOrigin) {
      if (this.furnaceBoost > 0) {
        this.furnaceBoost = Math.max(0, this.furnaceBoost - dt);
        if (Math.random() < 0.7) this._spawnFireParticle(true);
        if (Math.random() < 0.45) {
          this._spawnSmoke(
            new THREE.Vector3(this.furnaceOrigin.x, this.furnaceOrigin.y + 2.55, this.furnaceOrigin.z),
            1.7
          );
        }
      } else {
        if (Math.random() < 0.16) this._spawnFireParticle(false);
        if (Math.random() < 0.08) {
          this._spawnSmoke(
            new THREE.Vector3(this.furnaceOrigin.x, this.furnaceOrigin.y + 2.5, this.furnaceOrigin.z),
            1.0
          );
        }
      }
    }

    // 3. 更新一張一張飛入金爐的金紙
    for (let i = this.flyingPapers.length - 1; i >= 0; i--) {
      const sheet = this.flyingPapers[i];
      const u = sheet.userData;
      u.progress += dt / u.duration;
      if (u.progress >= 1) {
        const cb = u.onArrive;
        this.scene.remove(sheet);
        this.flyingPapers.splice(i, 1);
        if (cb) cb();
        continue;
      }
      const t = u.progress;
      sheet.position.lerpVectors(u.start, u.end, t);
      sheet.position.y += Math.sin(t * Math.PI) * 0.85; // 拋物線弧度
      sheet.rotation.x += u.spinX * dt;
      sheet.rotation.z += u.spinZ * dt;
      sheet.scale.setScalar(1 - t * 0.35);
    }

    // 4. 更新供品祈願金光光束
    for (let i = this.prayerBeams.length - 1; i >= 0; i--) {
      const orb = this.prayerBeams[i];
      const u = orb.userData;
      u.progress += dt / u.duration;
      if (u.progress < 0) {
        orb.visible = false;
        continue;
      }
      orb.visible = true;
      if (u.progress >= 1) {
        this.scene.remove(orb);
        orb.material.dispose();
        this.prayerBeams.splice(i, 1);
        continue;
      }
      const t = u.progress;
      orb.position.lerpVectors(u.start, u.end, t);
      orb.position.y += Math.sin(t * Math.PI) * 1.4;
      orb.rotation.y += dt * 6;
      orb.material.opacity = Math.sin(t * Math.PI);
    }

    // 5. 更新嫋嫋香煙（雙重正弦 S 形柔風搖曳、緩緩升起、漸顯漸散！）
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const p = this.smokeParticles[i];
      const u = p.userData;
      u.life += dt;
      if (u.life >= u.maxLife) {
        this.scene.remove(p);
        p.material.dispose();
        this.smokeParticles.splice(i, 1);
        continue;
      }
      const ratio = u.life / u.maxLife;
      const swayScale = Math.min(1, ratio * 2.2); // 剛離開香頭先筆直細升，越高越隨微風搖曳舒展！
      const waveX =
        Math.sin(elapsed * u.swayFreq + u.phase) * u.swayAmp * swayScale +
        Math.sin(elapsed * 0.65 + u.life * 1.4 + u.phase) * (u.swayAmp * 0.45) * swayScale;
      const waveZ =
        Math.cos(elapsed * (u.swayFreq * 0.82) + u.phase) * (u.swayAmp * 0.72) * swayScale;

      p.position.y += u.vy * (1.0 - ratio * 0.25) * dt;
      p.position.x = u.originX + u.driftX * u.life + waveX;
      p.position.z = u.originZ + u.driftZ * u.life + waveZ;
      p.material.rotation += u.spin * dt;

      const s = (0.24 + Math.pow(ratio, 0.82) * 1.05) * u.baseScale;
      p.scale.set(s * 0.92, s * 1.12, 1);
      // 平滑淡入（前 18%）→ 優雅淡出（後 82%）
      const fadeIn = Math.min(1, ratio / 0.18);
      const fadeOut = Math.pow(1 - ratio, 1.35);
      p.material.opacity = u.maxOpacity * fadeIn * fadeOut;
    }

    // 6. 更新火焰
    for (let i = this.fireParticles.length - 1; i >= 0; i--) {
      const p = this.fireParticles[i];
      const u = p.userData;
      u.life += dt;
      if (u.life >= u.maxLife) {
        this.scene.remove(p);
        p.material.dispose();
        this.fireParticles.splice(i, 1);
        continue;
      }
      const ratio = u.life / u.maxLife;
      p.position.x += u.vx * dt;
      p.position.y += u.vy * dt;
      p.position.z += u.vz * dt;
      p.rotation.y += dt * 4;
      p.material.opacity = 0.9 * (1 - ratio);
      p.scale.multiplyScalar(0.985);
    }

    // 7. 更新祈福金光
    for (let i = this.blessingParticles.length - 1; i >= 0; i--) {
      const p = this.blessingParticles[i];
      const u = p.userData;
      u.life += dt;
      if (u.life >= u.maxLife) {
        this.scene.remove(p);
        p.material.dispose();
        this.blessingParticles.splice(i, 1);
        continue;
      }
      const ratio = u.life / u.maxLife;
      p.position.x += u.vx * dt;
      p.position.y += u.vy * dt;
      p.position.z += u.vz * dt;
      u.vy -= 1.6 * dt;
      p.rotation.x += dt * 5;
      p.rotation.y += dt * 6;
      p.material.opacity = 1 - ratio;
    }
  }
}
