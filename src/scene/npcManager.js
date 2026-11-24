/**
 * V5 環廟 NPC 巡遊、實際「坐上 36 個拜墊靜坐念經」與多人同屏同步管理器
 * - 支援多位 NPC（小美、添財阿公、秀英阿嬤、小晴）定期走進大殿挑一張空拜墊跪坐念經，念完再起身散步！
 * - 追蹤每張拜墊占用狀態，不與玩家或其他 NPC 重疊坐同一張拜墊
 */
import * as THREE from 'three';
import { TEMPLE_CONFIG, KNEEL_MATS_36 } from '../config/templeConfig.js';
import { ChibiAvatar } from './chibiAvatar.js';

const NPC_CHANT_BUBBLES = [
  '南無觀世音菩薩🙏',
  '心無罣礙，平安自在✨',
  '五年千歲保佑闔家安康🙏',
  '敲敲木魚靜心真舒服～'
];

export class TempleNPCManager {
  constructor(scene, collisionSystem) {
    this.scene = scene;
    this.collision = collisionSystem;
    this.npcs = [];
    this.remotePeers = new Map();
    this.occupiedMats = new Map(); // matId -> npcId

    this._spawnNPCs();
  }

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

  _spawnNPCs() {
    Object.values(TEMPLE_CONFIG.npcs).forEach((cfg) => {
      const avatar = new ChibiAvatar({
        presetId: cfg.presetId || 'youngMale',
        label: cfg.name
      });

      let startMat = null;
      // 讓小美與花布阿嬤一開場就有 1 位先坐在大殿拜墊上念經，畫面一進場超有生活感！
      if (cfg.id === 'xiaomei' && cfg.canSitOnMats) {
        startMat = KNEEL_MATS_36[0];
        this.occupiedMats.set(startMat.id, cfg.id);
        avatar.root.position.set(startMat.x, 0.37, startMat.z);
        avatar.root.rotation.y = Math.PI;
        avatar.setState('kneel');
      } else if (cfg.mode === 'patrol' && Array.isArray(cfg.waypoints) && cfg.waypoints.length > 0) {
        const [sx, sz] = cfg.waypoints[0];
        const safe = this.collision.resolveStatic(sx, sz, 0.44);
        avatar.root.position.set(safe.x, this._getFloorY(safe.x, safe.z), safe.z);
        avatar.setState('idle');
      } else {
        const [px, py, pz] = cfg.position;
        avatar.root.position.set(px, py, pz);
        avatar.root.rotation.y = cfg.facing || 0;
        avatar.setState(cfg.mode === 'sit' ? 'sit' : 'idle');
      }

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.45, 0.56, 20),
        new THREE.MeshBasicMaterial({ color: 0x34D399, transparent: true, opacity: 0.38, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.03;
      avatar.root.add(ring);

      this.scene.add(avatar.root);
      this.npcs.push({
        id: cfg.id,
        config: cfg,
        avatar,
        path: [],
        wpIdx: 0,
        waitTimer: startMat ? 11.0 : (1.0 + Math.random() * 2.5),
        kneelMatTarget: startMat,
        isKneelingOnMat: Boolean(startMat),
        stuckTimer: 0,
        lastPos: avatar.root.position.clone(),
        bubbleCooldown: 3 + Math.random() * 7
      });
    });
  }

  isMatOccupiedByNPC(matId) {
    return this.occupiedMats.has(matId);
  }

  _pickFreeMatForNPC(npc, playerPos) {
    const prefs = npc.config.preferredMats || [];
    const candidates = [
      ...prefs.map(idx => KNEEL_MATS_36[idx - 1]).filter(Boolean),
      ...KNEEL_MATS_36
    ];
    for (const m of candidates) {
      if (this.occupiedMats.has(m.id)) continue;
      if (playerPos && Math.hypot(playerPos.x - m.x, playerPos.z - m.z) < 1.2) continue;
      return m;
    }
    return null;
  }

  syncRemotePeers(peerList = []) {
    const activeIds = new Set(peerList.map(p => p.id));

    for (const [id, entry] of this.remotePeers.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(entry.avatar.root);
        this.remotePeers.delete(id);
      }
    }

    peerList.forEach((peer) => {
      let entry = this.remotePeers.get(peer.id);
      const px = Number.isFinite(Number(peer.x)) ? Number(peer.x) : 0;
      const py = Number.isFinite(Number(peer.y)) ? Number(peer.y) : 0.03;
      const pz = Number.isFinite(Number(peer.z)) ? Number(peer.z) : 18.0;
      const pRotY = Number.isFinite(Number(peer.rotY)) ? Number(peer.rotY) : 0;

      if (!entry) {
        const avatar = new ChibiAvatar({
          presetId: peer.presetId || 'youngFemale',
          label: peer.name || '線上香客'
        });
        avatar.root.position.set(px, py, pz);
        avatar.root.rotation.y = pRotY;
        this.scene.add(avatar.root);
        entry = {
          avatar,
          targetPos: new THREE.Vector3(px, py, pz),
          targetRotY: pRotY,
          name: peer.name || '線上香客',
          presetId: peer.presetId || 'youngFemale',
          lastBubbleAt: 0
        };
        this.remotePeers.set(peer.id, entry);
      }

      if (peer.name && peer.name !== entry.name) {
        entry.name = peer.name;
        entry.avatar.setName(peer.name);
      }
      if (peer.presetId && peer.presetId !== entry.presetId) {
        entry.presetId = peer.presetId;
        entry.avatar.applyPreset(peer.presetId);
      }
      entry.targetPos.set(px, py, pz);
      entry.targetRotY = pRotY;
      const nextState = peer.state || 'idle';
      if (nextState !== entry.avatar.state) {
        entry.avatar.setState(nextState);
      }
      entry.avatar.setHoldingIncense(Boolean(peer.holdingIncense));

      if (peer.bubble && peer.bubbleAt && peer.bubbleAt !== entry.lastBubbleAt) {
        entry.lastBubbleAt = peer.bubbleAt;
        entry.avatar.showSpeechBubble(peer.bubble, 4.5);
      }
    });
  }

  getActorColliders(excludeId = null) {
    const out = [];
    for (const npc of this.npcs) {
      if (npc.id === excludeId || npc.config.mode === 'sit') continue;
      out.push({ id: npc.id, x: npc.avatar.root.position.x, z: npc.avatar.root.position.z, r: 0.40 });
    }
    for (const [id, peer] of this.remotePeers.entries()) {
      if (id === excludeId) continue;
      out.push({ id, x: peer.avatar.root.position.x, z: peer.avatar.root.position.z, r: 0.40 });
    }
    return out;
  }

  /**
   * ★ 需求 #12：回傳所有 NPC（包含已入座板凳的 NPC！）與線上玩家位置，供椅子入座時避開已有人坐的位置！
   */
  getAllSeatedAndActiveActors(excludeId = null) {
    const out = [];
    for (const npc of this.npcs) {
      if (npc.id === excludeId) continue;
      out.push({ id: npc.id, x: npc.avatar.root.position.x, z: npc.avatar.root.position.z });
    }
    for (const [id, peer] of this.remotePeers.entries()) {
      if (id === excludeId) continue;
      out.push({ id, x: peer.avatar.root.position.x, z: peer.avatar.root.position.z });
    }
    return out;
  }

  findNearestInteractiveNPC(playerPos, maxDist = 2.15) {
    let best = null;
    let bestDist = maxDist;
    for (const npc of this.npcs) {
      const p = npc.avatar.root.position;
      const d = Math.hypot(playerPos.x - p.x, playerPos.z - p.z);
      if (d < bestDist) {
        bestDist = d;
        best = npc;
      }
    }
    return best;
  }

  facePlayer(npcId, playerPos) {
    const npc = this.npcs.find(n => n.id === npcId);
    if (!npc || npc.config.mode === 'sit' || npc.isKneelingOnMat) return;
    const p = npc.avatar.root.position;
    npc.avatar.root.rotation.y = Math.atan2(playerPos.x - p.x, playerPos.z - p.z);
    npc.waitTimer = Math.max(npc.waitTimer, 4.2);
    npc.avatar.setState('idle');
  }

  update(dt, elapsed, playerPos, realPlayerCount = 1) {
    const allowNpcChatter = realPlayerCount <= 1;
    for (const npc of this.npcs) {
      const pos = npc.avatar.root.position;

      // ★ 需求 #3：多人上線（> 1 位真人）時不主動觸發 NPC 對話氣泡，讓真人互動更清爽；單人時由 NPC 親切互動！
      if (allowNpcChatter) {
        npc.bubbleCooldown -= dt;
        if (npc.bubbleCooldown <= 0) {
          npc.bubbleCooldown = 10 + Math.random() * 11;
          if (!npc.avatar.bubbleSprite) {
            const pool = npc.isKneelingOnMat ? NPC_CHANT_BUBBLES : (npc.config.bubbleLines || []);
            if (pool.length > 0) {
              npc.avatar.showSpeechBubble(pool[Math.floor(Math.random() * pool.length)], 3.8);
            }
          }
        }
      }

      if (npc.config.mode === 'patrol') {
        if (npc.waitTimer > 0) {
          npc.waitTimer -= dt;
          if (npc.isKneelingOnMat) {
            npc.avatar.setState('kneel');
            npc.avatar.root.rotation.y = Math.PI;
          } else {
            npc.avatar.setState('idle');
          }

          if (npc.waitTimer <= 0) {
            // 若原本跪坐在拜墊上，起身釋放該拜墊並繼續逛廟
            if (npc.isKneelingOnMat && npc.kneelMatTarget) {
              this.occupiedMats.delete(npc.kneelMatTarget.id);
              npc.isKneelingOnMat = false;
              npc.kneelMatTarget = null;
            }

            // 具備坐拜墊習慣的 NPC 有 45% 機率挑一張空拜墊走去坐下念經！
            if (npc.config.canSitOnMats && Math.random() < 0.45) {
              const mat = this._pickFreeMatForNPC(npc, playerPos);
              if (mat) {
                this.occupiedMats.set(mat.id, npc.id);
                npc.kneelMatTarget = mat;
                npc.path = this.collision.findPath(pos.x, pos.z, mat.x, mat.z);
                npc.stuckTimer = 0;
                continue;
              }
            }

            const wps = npc.config.waypoints;
            npc.wpIdx = (npc.wpIdx + 1) % wps.length;
            const [gx, gz] = wps[npc.wpIdx];
            npc.path = this.collision.findPath(pos.x, pos.z, gx, gz);
            npc.stuckTimer = 0;
          }
        } else if (npc.path.length > 0) {
          const next = npc.path[0];
          const dx = next.x - pos.x;
          const dz = next.z - pos.z;
          const dist = Math.hypot(dx, dz);

          if (dist < 0.28) {
            npc.path.shift();
            if (npc.path.length === 0) {
              if (npc.kneelMatTarget) {
                // 抵達目標拜墊：面向主神跪坐靜修 9–15 秒！
                pos.set(npc.kneelMatTarget.x, 0.37, npc.kneelMatTarget.z);
                npc.avatar.root.rotation.y = Math.PI;
                npc.isKneelingOnMat = true;
                npc.avatar.setState('kneel');
                npc.waitTimer = 9 + Math.random() * 6;
                npc.avatar.showSpeechBubble(
                  NPC_CHANT_BUBBLES[Math.floor(Math.random() * NPC_CHANT_BUBBLES.length)],
                  4.0
                );
              } else {
                npc.waitTimer = 2.0 + Math.random() * 2.8;
                npc.avatar.setState('idle');
              }
            }
          } else {
            npc.avatar.setState('walk');
            const speed = npc.config.presetId?.startsWith('child') ? 2.75 : 2.2;
            const step = Math.min(dist, speed * dt);
            const rawX = pos.x + (dx / dist) * step;
            const rawZ = pos.z + (dz / dist) * step;

            const others = this.getActorColliders(npc.id);
            if (playerPos) others.push({ x: playerPos.x, z: playerPos.z, r: 0.45 });
            const resolved = this.collision.resolveDynamic(rawX, rawZ, others, 0.42);
            pos.x = resolved.x;
            pos.z = resolved.z;

            const desiredY = this._getFloorY(pos.x, pos.z);
            pos.y += (desiredY - pos.y) * Math.min(1, dt * 10);

            const targetYaw = Math.atan2(dx, dz);
            let diff = targetYaw - npc.avatar.root.rotation.y;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            npc.avatar.root.rotation.y += diff * Math.min(1, dt * 9);

            if (pos.distanceTo(npc.lastPos) < 0.004) {
              npc.stuckTimer += dt;
              if (npc.stuckTimer > 1.6) {
                if (npc.kneelMatTarget) {
                  this.occupiedMats.delete(npc.kneelMatTarget.id);
                  npc.kneelMatTarget = null;
                }
                npc.path = [];
                npc.waitTimer = 0.8;
                npc.stuckTimer = 0;
              }
            } else {
              npc.stuckTimer = 0;
            }
            npc.lastPos.copy(pos);
          }
        } else {
          npc.waitTimer = 1.0;
        }
      }

      npc.avatar.update(dt, elapsed);
    }

    for (const entry of this.remotePeers.values()) {
      const pos = entry.avatar.root.position;
      if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y) || !Number.isFinite(pos.z)) {
        pos.copy(entry.targetPos);
      } else {
        pos.lerp(entry.targetPos, Math.min(1, dt * 10));
      }
      if (!Number.isFinite(entry.avatar.root.rotation.y)) {
        entry.avatar.root.rotation.y = entry.targetRotY || 0;
      }
      let diff = (entry.targetRotY || 0) - entry.avatar.root.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      entry.avatar.root.rotation.y += diff * Math.min(1, dt * 10);
      entry.avatar.update(dt, elapsed);
    }
  }
}
