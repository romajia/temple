/**
 * V5 挑高宏偉大殿、360° 環廟步道與廟後男女洗手間物理碰撞＋A* 避障尋路系統
 */
import { TEMPLE_CONFIG, SIDE_BENCHES } from '../config/templeConfig.js';

export class TempleCollisionSystem {
  constructor() {
    this.boxes = [];
    this.circles = [];
    this.bounds = TEMPLE_CONFIG.worldBounds;

    this._registerTempleColliders();
    this._buildNavGrid();
  }

  _addBox(cx, cz, width, depth, label = '') {
    this.boxes.push({
      minX: cx - width / 2,
      maxX: cx + width / 2,
      minZ: cz - depth / 2,
      maxZ: cz + depth / 2,
      label
    });
  }

  _addCircle(x, z, r, label = '') {
    this.circles.push({ x, z, r, label });
  }

  _registerTempleColliders() {
    // 1. 新廟四面牆體（後牆、左右紅磚側牆，以及正面三川門左右青斗石浮雕牆堵，中央留出 7m 寬大門通行！）
    this._addBox(0, -12.6, 20.4, 0.78, 'backWall');
    this._addBox(-10.0, -2.0, 0.78, 21.4, 'leftWall');
    this._addBox(10.0, -2.0, 0.78, 21.4, 'rightWall');
    this._addBox(-6.9, 8.32, 5.5, 0.72, 'frontStoneWallLeft');
    this._addBox(6.9, 8.32, 5.5, 0.72, 'frontStoneWallRight');

    // 2. 新廟朱紅大門圓柱與殿內大柱
    const pillars = [
      [-9.3, 8.4], [-3.8, 8.45], [3.8, 8.45], [9.3, 8.4],
      [-9.3, -11.9], [-4.8, -11.9], [4.8, -11.9], [9.3, -11.9]
    ];
    pillars.forEach(([px, pz], idx) => this._addCircle(px, pz, 0.50, `pillar-${idx}`));

    // 3. 正殿神龕與加寬加深的雕花主神桌（完整承托方鼎香爐絕不懸空！）
    this._addBox(0, -9.95, 10.8, 3.8, 'mainShrine');

    // 4. 正殿大供桌
    this._addBox(0, -6.2, 5.6, 1.75, 'offeringTable');

    // 5. 廟內左側香燭金紙區
    this._addBox(-8.2, 1.2, 1.6, 3.3, 'incenseTable');

    // 6. 正殿神明右側求籤擲筊案（移入殿內神明右側！）
    this._addBox(6.6, -8.8, 1.38, 1.38, 'fortuneDesk');

    // 7. 廟內右側紅紙太歲燈牆
    this._addBox(9.65, -2.8, 0.58, 7.8, 'taiSuiWall');

    // 8. 廟外大廣場三足天公爐
    this._addCircle(0, 15.0, 1.56, 'tiangongCenser');

    // 9. 廟門左側木頭板凳區與大榕樹
    this._addBox(-11.0, 13.8, 2.55, 0.72, 'bench1');
    this._addBox(-12.95, 15.25, 0.72, 2.55, 'bench2');
    this._addCircle(-11.4, 15.1, 0.56, 'teaTable');
    this._addCircle(-13.8, 12.4, 0.85, 'banyanTree');

    // 10. ★ 需求 #5：紅底木框公佈欄移至母獅左側（6.7, 11.55），完全不擋燒金紙動線與視線！
    this._addBox(6.7, 11.55, 3.1, 0.78, 'bulletinBoard');

    // 11. 廟宇右側外部六角寶塔金爐
    this._addCircle(16.2, 4.4, 1.74, 'pagodaFurnace');

    // 12. 前廣場供品鋪與民俗挑戰攤（配合 90° 旋轉櫃檯，讓老闆娘與關主安心站在後方）
    this._addBox(-12.2, 20.0, 1.55, 2.55, 'offeringShopStall');
    this._addBox(12.2, 20.0, 1.55, 2.55, 'quizBoothStall');

    // 13. 新廟前方左右守門石獅子座台
    this._addBox(-10.1, 10.1, 1.65, 1.85, 'stoneLionLeft');
    this._addBox(10.1, 10.1, 1.65, 1.85, 'stoneLionRight');

    // 14. 新廟右側假山瀑布景觀池（依新廟建築實景圖配置）
    this._addCircle(20.8, 15.2, 3.6, 'waterfallPond');

    // 15. 廟旁樹下加設雙人長板凳碰撞體
    SIDE_BENCHES.forEach((b) => {
      const isRotated = Math.abs(Math.sin(b.rotY)) > 0.5;
      this._addBox(b.x, b.z, isRotated ? 0.86 : 3.2, isRotated ? 3.2 : 0.86, b.id);
    });
  }

  isBlocked(x, z, radius = 0.44) {
    if (
      x < this.bounds.minX + radius ||
      x > this.bounds.maxX - radius ||
      z < this.bounds.minZ + radius ||
      z > this.bounds.maxZ - radius
    ) {
      return true;
    }
    for (const b of this.boxes) {
      const cx = Math.max(b.minX, Math.min(x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
      if ((x - cx) ** 2 + (z - cz) ** 2 < radius * radius) return true;
    }
    for (const c of this.circles) {
      const minD = c.r + radius;
      if ((x - c.x) ** 2 + (z - c.z) ** 2 < minD * minD) return true;
    }
    return false;
  }

  resolveStatic(x, z, radius = 0.44) {
    let rx = Math.max(this.bounds.minX + radius, Math.min(this.bounds.maxX - radius, x));
    let rz = Math.max(this.bounds.minZ + radius, Math.min(this.bounds.maxZ - radius, z));

    for (let iter = 0; iter < 3; iter++) {
      for (const b of this.boxes) {
        const cx = Math.max(b.minX, Math.min(rx, b.maxX));
        const cz = Math.max(b.minZ, Math.min(rz, b.maxZ));
        const dx = rx - cx;
        const dz = rz - cz;
        const distSq = dx * dx + dz * dz;
        if (distSq < radius * radius) {
          if (distSq > 1e-6) {
            const dist = Math.sqrt(distSq);
            const push = radius - dist + 0.005;
            rx += (dx / dist) * push;
            rz += (dz / dist) * push;
          } else {
            const dLeft = Math.abs(rx - b.minX);
            const dRight = Math.abs(b.maxX - rx);
            const dTop = Math.abs(rz - b.minZ);
            const dBot = Math.abs(b.maxZ - rz);
            const m = Math.min(dLeft, dRight, dTop, dBot);
            if (m === dLeft) rx = b.minX - radius - 0.01;
            else if (m === dRight) rx = b.maxX + radius + 0.01;
            else if (m === dTop) rz = b.minZ - radius - 0.01;
            else rz = b.maxZ + radius + 0.01;
          }
        }
      }

      for (const c of this.circles) {
        const dx = rx - c.x;
        const dz = rz - c.z;
        const distSq = dx * dx + dz * dz;
        const minD = c.r + radius;
        if (distSq < minD * minD) {
          const dist = Math.sqrt(distSq) || 0.001;
          const push = minD - dist + 0.005;
          rx += (dx / dist) * push;
          rz += (dz / dist) * push;
        }
      }

      rx = Math.max(this.bounds.minX + radius, Math.min(this.bounds.maxX - radius, rx));
      rz = Math.max(this.bounds.minZ + radius, Math.min(this.bounds.maxZ - radius, rz));
    }

    return { x: rx, z: rz };
  }

  resolveDynamic(x, z, otherActors = [], selfRadius = 0.44) {
    let rx = x;
    let rz = z;
    for (const actor of otherActors) {
      if (!actor) continue;
      const dx = rx - actor.x;
      const dz = rz - actor.z;
      const minD = selfRadius + (actor.r || 0.42);
      const distSq = dx * dx + dz * dz;
      if (distSq < minD * minD && distSq > 1e-6) {
        const dist = Math.sqrt(distSq);
        const push = (minD - dist) * 0.65;
        rx += (dx / dist) * push;
        rz += (dz / dist) * push;
      }
    }
    return this.resolveStatic(rx, rz, selfRadius);
  }

  _buildNavGrid() {
    this.cellSize = 0.75;
    this.gridCols = Math.ceil((this.bounds.maxX - this.bounds.minX) / this.cellSize) + 1;
    this.gridRows = Math.ceil((this.bounds.maxZ - this.bounds.minZ) / this.cellSize) + 1;
    this.walkable = new Uint8Array(this.gridCols * this.gridRows);

    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const { x, z } = this._cellToWorld(c, r);
        this.walkable[r * this.gridCols + c] = this.isBlocked(x, z, 0.48) ? 0 : 1;
      }
    }
  }

  _worldToCell(x, z) {
    const c = Math.max(0, Math.min(this.gridCols - 1, Math.round((x - this.bounds.minX) / this.cellSize)));
    const r = Math.max(0, Math.min(this.gridRows - 1, Math.round((z - this.bounds.minZ) / this.cellSize)));
    return { c, r };
  }

  _cellToWorld(c, r) {
    return { x: this.bounds.minX + c * this.cellSize, z: this.bounds.minZ + r * this.cellSize };
  }

  _findNearestWalkable(c, r) {
    if (this.walkable[r * this.gridCols + c]) return { c, r };
    for (let rad = 1; rad <= 6; rad++) {
      for (let dr = -rad; dr <= rad; dr++) {
        for (let dc = -rad; dc <= rad; dc++) {
          const nc = c + dc;
          const nr = r + dr;
          if (nc >= 0 && nc < this.gridCols && nr >= 0 && nr < this.gridRows) {
            if (this.walkable[nr * this.gridCols + nc]) return { c: nc, r: nr };
          }
        }
      }
    }
    return { c, r };
  }

  hasLineOfSight(ax, az, bx, bz) {
    const dist = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(2, Math.ceil(dist / 0.3));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.isBlocked(ax + (bx - ax) * t, az + (bz - az) * t, 0.46)) return false;
    }
    return true;
  }

  findPath(startX, startZ, goalX, goalZ) {
    const safeGoal = this.resolveStatic(goalX, goalZ, 0.45);
    if (this.hasLineOfSight(startX, startZ, safeGoal.x, safeGoal.z)) return [safeGoal];

    const start = this._findNearestWalkable(this._worldToCell(startX, startZ).c, this._worldToCell(startX, startZ).r);
    const goal = this._findNearestWalkable(this._worldToCell(safeGoal.x, safeGoal.z).c, this._worldToCell(safeGoal.x, safeGoal.z).r);

    const cols = this.gridCols;
    const total = cols * this.gridRows;
    const gScore = new Float32Array(total).fill(Infinity);
    const fScore = new Float32Array(total).fill(Infinity);
    const cameFrom = new Int32Array(total).fill(-1);
    const closed = new Uint8Array(total);
    const open = [];

    const startIdx = start.r * cols + start.c;
    const goalIdx = goal.r * cols + goal.c;
    gScore[startIdx] = 0;
    fScore[startIdx] = Math.hypot(goal.c - start.c, goal.r - start.r);
    open.push(startIdx);

    const dirs = [
      [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
      [1, 1, 1.414], [-1, 1, 1.414], [1, -1, 1.414], [-1, -1, 1.414]
    ];

    let found = false;
    let guard = 0;
    while (open.length > 0 && guard++ < 4400) {
      let bestPos = 0;
      for (let i = 1; i < open.length; i++) {
        if (fScore[open[i]] < fScore[open[bestPos]]) bestPos = i;
      }
      const cur = open.splice(bestPos, 1)[0];
      if (cur === goalIdx) { found = true; break; }
      closed[cur] = 1;

      const cr = Math.floor(cur / cols);
      const cc = cur % cols;

      for (const [dc, dr, cost] of dirs) {
        const nc = cc + dc;
        const nr = cr + dr;
        if (nc < 0 || nc >= cols || nr < 0 || nr >= this.gridRows) continue;
        const nIdx = nr * cols + nc;
        if (closed[nIdx] || !this.walkable[nIdx]) continue;
        if (dc !== 0 && dr !== 0) {
          if (!this.walkable[cr * cols + nc] || !this.walkable[nr * cols + cc]) continue;
        }
        const tentative = gScore[cur] + cost;
        if (tentative < gScore[nIdx]) {
          cameFrom[nIdx] = cur;
          gScore[nIdx] = tentative;
          fScore[nIdx] = tentative + Math.hypot(goal.c - nc, goal.r - nr);
          if (!open.includes(nIdx)) open.push(nIdx);
        }
      }
    }

    if (!found) return [safeGoal];

    const rawPoints = [];
    let trace = goalIdx;
    while (trace !== -1 && trace !== startIdx) {
      rawPoints.push(this._cellToWorld(trace % cols, Math.floor(trace / cols)));
      trace = cameFrom[trace];
    }
    rawPoints.reverse();
    rawPoints.push(safeGoal);

    const smooth = [];
    let anchorX = startX;
    let anchorZ = startZ;
    let i = 0;
    while (i < rawPoints.length) {
      let furthest = i;
      for (let j = rawPoints.length - 1; j > i; j--) {
        if (this.hasLineOfSight(anchorX, anchorZ, rawPoints[j].x, rawPoints[j].z)) {
          furthest = j;
          break;
        }
      }
      smooth.push(rawPoints[furthest]);
      anchorX = rawPoints[furthest].x;
      anchorZ = rawPoints[furthest].z;
      i = furthest + 1;
    }
    return smooth;
  }
}
