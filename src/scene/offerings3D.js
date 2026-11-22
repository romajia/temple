/**
 * 3D 正殿供桌供品管理器
 * 依據資料層供品陣列（上限 12 份、滿 10 分鐘自動移除）動態渲染可愛 3D 供品
 */
import * as THREE from 'three';

export class Offerings3DManager {
  constructor(tableTopCenter) {
    this.group = new THREE.Group();
    this.group.position.copy(tableTopCenter);
    this.meshes = new Map(); // id -> { mesh, targetScale }

    // 12 個供品槽位（兩排各 6 格，整齊排於供桌上）
    this.slots = [];
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 6; col++) {
        this.slots.push(new THREE.Vector3(
          -1.65 + col * 0.66,
          0,
          -0.28 + row * 0.54
        ));
      }
    }
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
      // 旺來鳳梨
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0xEAB308, roughness: 0.55 })
      );
      body.scale.set(0.95, 1.35, 0.95);
      body.position.y = 0.21;
      body.castShadow = true;
      g.add(body);

      const leafMat = new THREE.MeshStandardMaterial({ color: 0x2E8B57, roughness: 0.6 });
      for (let i = 0; i < 5; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 5), leafMat);
        const ang = (i / 5) * Math.PI * 2;
        leaf.position.set(Math.cos(ang) * 0.04, 0.42, Math.sin(ang) * 0.04);
        leaf.rotation.z = Math.cos(ang) * 0.35;
        leaf.rotation.x = Math.sin(ang) * 0.35;
        g.add(leaf);
      }
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
      // 清香鮮花花瓶
      const vase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.11, 0.24, 12),
        new THREE.MeshStandardMaterial({ color: 0xE6F2F2, roughness: 0.25 })
      );
      vase.position.y = 0.16;
      vase.castShadow = true;
      g.add(vase);

      const petalColors = [0xF472B6, 0xFB7185, 0xFBBF24, 0xFFFFFF];
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const fl = new THREE.Mesh(
          new THREE.SphereGeometry(0.065, 8, 8),
          new THREE.MeshStandardMaterial({ color: petalColors[i % petalColors.length], roughness: 0.5 })
        );
        fl.position.set(Math.cos(ang) * 0.09, 0.34 + (i % 2) * 0.06, Math.sin(ang) * 0.09);
        g.add(fl);
      }
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
      // 限定豪華壽桃塔（雙層粉紅壽桃＋金頂）
      const peachMat = new THREE.MeshStandardMaterial({ color: 0xF9A8D4, roughness: 0.45 });
      const tipMat = new THREE.MeshStandardMaterial({ color: 0xEC4899, roughness: 0.45 });
      [[-0.08, 0.12, 0.05], [0.08, 0.12, 0.05], [0, 0.12, -0.07], [0, 0.25, 0], [0, 0.37, 0]].forEach(([x, y, z], i) => {
        const p = new THREE.Mesh(new THREE.SphereGeometry(i < 3 ? 0.08 : 0.07, 10, 10), i === 4 ? tipMat : peachMat);
        p.position.set(x, y, z);
        p.castShadow = true;
        g.add(p);
      });
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

    // 新增或重新排列槽位
    list.slice(0, this.slots.length).forEach((item, idx) => {
      const slotPos = this.slots[idx];
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
