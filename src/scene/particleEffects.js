/**
 * 3D 溫馨粒子與動畫系統 (V2)
 * 新增：
 * - 金紙「一張一張飛入爐口」逐張動畫 (launchJossPaperSequence)
 * - 供品祈願「金色祈福光束上達神明」特效 (spawnPrayerBeam)
 * - 嫋嫋輕煙、爐火火星與祈福金光
 */
import * as THREE from 'three';

export class TempleParticleEffects {
  constructor(scene) {
    this.scene = scene;
    this.smokeParticles = [];
    this.fireParticles = [];
    this.blessingParticles = [];
    this.flyingPapers = [];
    this.prayerBeams = [];

    this.smokeGeo = new THREE.SphereGeometry(0.11, 8, 8);
    this.fireGeo = new THREE.ConeGeometry(0.16, 0.44, 6);
    this.sparkGeo = new THREE.OctahedronGeometry(0.085, 0);

    this.smokeEmitters = [];
    this.furnaceOrigin = null;
    this.furnaceBoost = 0;
  }

  addSmokeEmitter(getPos, rate = 0.16, scale = 1.0) {
    this.smokeEmitters.push({ getPos, rate, timer: Math.random() * rate, scale });
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

  _spawnSmoke(pos, scale = 1.0) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xF7F3EC,
      transparent: true,
      opacity: 0.48,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(this.smokeGeo, mat);
    mesh.position.copy(pos);
    mesh.scale.setScalar(0.55 * scale);
    mesh.userData = {
      vx: (Math.random() - 0.5) * 0.16,
      vy: 0.58 + Math.random() * 0.25,
      vz: (Math.random() - 0.5) * 0.16,
      life: 0,
      maxLife: 1.7 + Math.random() * 1.0,
      baseScale: scale
    };
    this.scene.add(mesh);
    this.smokeParticles.push(mesh);
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
    // 1. 香煙發射器
    for (const emitter of this.smokeEmitters) {
      const pos = emitter.getPos();
      if (!pos) continue;
      emitter.timer += dt;
      if (emitter.timer >= emitter.rate) {
        emitter.timer = 0;
        this._spawnSmoke(pos, emitter.scale);
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

    // 5. 更新煙霧
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
      p.position.x += (u.vx + Math.sin(elapsed * 2.5 + i) * 0.12) * dt;
      p.position.y += u.vy * dt;
      p.position.z += u.vz * dt;
      p.scale.setScalar((0.55 + ratio * 1.35) * u.baseScale);
      p.material.opacity = 0.46 * (1 - ratio);
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
