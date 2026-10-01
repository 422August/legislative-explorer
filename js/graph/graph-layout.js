// js/graph/graph-layout.js
import { ENTITY_TYPES, RELATION_TYPES } from './graph-state.js';

export class GraphLayout {
  constructor(graphState) {
    this.state = graphState;
  }

  // 取得扇區配置
  getSectorConfigs(focusEntity) {
    const type = focusEntity ? focusEntity.type : ENTITY_TYPES.LEGISLATOR;

    if (type === ENTITY_TYPES.LEGISLATOR) {
      return [
        {
          key: 'proposed',
          match: (e, r) => e.type === ENTITY_TYPES.BILL && r && r.type === RELATION_TYPES.PROPOSED,
          startAngle: -55,
          endAngle: 55,
          label: '主提案'
        },
        {
          key: 'cosigned',
          match: (e, r) => e.type === ENTITY_TYPES.BILL && r && r.type === RELATION_TYPES.COSIGNED,
          startAngle: 65,
          endAngle: 155,
          label: '連署提案'
        },
        {
          key: 'committee',
          match: (e, r) => e.type === ENTITY_TYPES.COMMITTEE,
          startAngle: 165,
          endAngle: 215,
          label: '委員會'
        },
        {
          key: 'meeting',
          match: (e, r) => e.type === ENTITY_TYPES.MEETING,
          startAngle: 225,
          endAngle: 285,
          label: '出席會議'
        },
        {
          key: 'interpellation',
          match: (e, r) => e.type === ENTITY_TYPES.INTERPELLATION,
          startAngle: 295,
          endAngle: 335,
          label: '質詢案'
        }
      ];
    } else if (type === ENTITY_TYPES.BILL) {
      return [
        {
          key: 'proposers',
          match: (e, r) => e.type === ENTITY_TYPES.LEGISLATOR && r && r.type === RELATION_TYPES.PROPOSED,
          startAngle: -70,
          endAngle: 70,
          label: '主提案委員'
        },
        {
          key: 'cosigners',
          match: (e, r) => e.type === ENTITY_TYPES.LEGISLATOR && r && r.type === RELATION_TYPES.COSIGNED,
          startAngle: 80,
          endAngle: 210,
          label: '連署委員'
        },
        {
          key: 'meeting',
          match: (e, r) => e.type === ENTITY_TYPES.MEETING,
          startAngle: 220,
          endAngle: 280,
          label: '審查會議'
        }
      ];
    }

    // 預設平均分配 360 度
    return [
      { key: 'default', match: () => true, startAngle: 0, endAngle: 360, label: '關聯' }
    ];
  }

  compute(width = 800, height = 600) {
    const positions = new Map();
    const visibleEntities = this.state.getVisibleEntities();
    const visibleRels = this.state.getVisibleRelationships();
    const focusId = this.state.state.focusEntityId;

    if (visibleEntities.length === 0) return positions;

    const cx = width / 2;
    const cy = height / 2;

    const focusEntity = focusId ? this.state.getEntity(focusId) : visibleEntities[0];
    const actualFocusId = focusEntity ? focusEntity.id : visibleEntities[0].id;

    // 焦點實體置於中心
    positions.set(actualFocusId, { x: cx, y: cy });

    // 建立 entity -> relationship to focus
    const relToFocus = new Map();
    for (const rel of visibleRels) {
      if (rel.sourceId === actualFocusId) {
        relToFocus.set(rel.targetId, rel);
      } else if (rel.targetId === actualFocusId) {
        relToFocus.set(rel.sourceId, rel);
      }
    }

    const depths = this.state.computeEntityDepths();
    const depth1 = [];
    const depth2 = [];

    for (const entity of visibleEntities) {
      if (entity.id === actualFocusId) continue;
      const d = depths.get(entity.id) || 1;
      if (d === 1) depth1.push(entity);
      else depth2.push(entity);
    }

    // 第 1 環基礎半徑 (取決於畫布大小)
    const baseRadius = Math.max(160, Math.min(width, height) * 0.32);
    const sectors = this.getSectorConfigs(focusEntity);

    // 分配 depth=1 節點至扇區
    const sectorBuckets = new Map();
    for (const s of sectors) sectorBuckets.set(s.key, []);

    const unassigned = [];
    for (const entity of depth1) {
      const rel = relToFocus.get(entity.id);
      let assigned = false;
      for (const s of sectors) {
        if (s.match(entity, rel)) {
          sectorBuckets.get(s.key).push(entity);
          assigned = true;
          break;
        }
      }
      if (!assigned) unassigned.push(entity);
    }

    // 未配對的平均放入非空扇區或最後扇區
    if (unassigned.length > 0) {
      const lastKey = sectors[sectors.length - 1].key;
      sectorBuckets.get(lastKey).push(...unassigned);
    }

    // 計算 depth=1 座標
    const nodeAngles = new Map(); // 記錄角度以備 depth=2 沿襲
    for (const s of sectors) {
      const list = sectorBuckets.get(s.key) || [];
      const count = list.length;
      if (count === 0) continue;

      const angleSpan = s.endAngle - s.startAngle;
      for (let i = 0; i < count; i++) {
        const entity = list[i];
        // 均勻分佈在扇區中間
        const angleDeg = s.startAngle + ((i + 0.5) / count) * angleSpan;
        nodeAngles.set(entity.id, angleDeg);

        // 若數量過多，採用雙層微幅半徑交錯 (避免視覺重疊)
        const radiusJitter = (count > 8) ? (i % 2 === 0 ? -18 : 18) : 0;
        const r = baseRadius + radiusJitter;

        // 轉換為標準弧度 (0度為上方)
        const rad = ((angleDeg - 90) * Math.PI) / 180;
        const x = cx + r * Math.cos(rad);
        const y = cy + r * Math.sin(rad);

        positions.set(entity.id, { x, y });
      }
    }

    // 計算 depth=2 座標 (第 2 環)
    const r2Base = baseRadius * 1.55;
    for (let i = 0; i < depth2.length; i++) {
      const entity = depth2[i];
      // 尋找其連接的 depth=1 節點
      const neighbors = this.state.getNeighborIds(entity.id);
      const parentId = neighbors.find(nId => nodeAngles.has(nId));
      let parentAngle = 0;
      if (parentId) {
        parentAngle = nodeAngles.get(parentId);
      } else {
        parentAngle = (i / depth2.length) * 360;
      }

      // 微幅擴散角度
      const jitterAngle = ((i % 3) - 1) * 12;
      const angleDeg = parentAngle + jitterAngle;
      const rad = ((angleDeg - 90) * Math.PI) / 180;

      const r2 = r2Base + ((i % 2 === 0) ? -15 : 15);
      const x = cx + r2 * Math.cos(rad);
      const y = cy + r2 * Math.sin(rad);

      positions.set(entity.id, { x, y });
    }

    return positions;
  }
}
