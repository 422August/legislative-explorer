// js/graph/graph-state.js

export const ENTITY_TYPES = {
  LEGISLATOR: 'legislator',
  BILL: 'bill',
  COMMITTEE: 'committee',
  MEETING: 'meeting',
  INTERPELLATION: 'interpellation',
  VOTE: 'vote'
};

export const RELATION_TYPES = {
  PROPOSED: 'proposed',
  COSIGNED: 'cosigned',
  SERVED_ON: 'served_on',
  ATTENDED: 'attended',
  SPOKE_AT: 'spoke_at',
  QUESTIONED: 'questioned',
  VOTED_FOR: 'voted_for',
  VOTED_AGAINST: 'voted_against',
  DISCUSSED_IN: 'discussed_in'
};

export const RELATION_LABELS = {
  proposed: '主提案',
  cosigned: '連署',
  served_on: '所屬委員會',
  attended: '出席會議',
  spoke_at: '會議發言',
  questioned: '質詢紀錄',
  voted_for: '表決贊成',
  voted_against: '表決反對',
  discussed_in: '排定會議'
};

export class GraphState {
  constructor() {
    this.state = {
      term: 11,
      focusEntityId: null,
      entities: new Map(),
      relationships: new Map(),
      expandedNodeIds: new Set(),
      selectedNodeId: null,
      hoveredNodeId: null,
      explorationPath: [], // Array<{ entityId, label, relation }>
      filters: {
        relationTypes: new Set(['proposed', 'cosigned', 'served_on', 'attended', 'questioned']),
        maxDepth: 2,
        maxNodes: 50
      },
      viewport: { x: 0, y: 0, scale: 1 },
      loading: new Set()
    };
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(changedKeys = []) {
    for (const listener of this.listeners) {
      try {
        listener(this.state, changedKeys);
      } catch (err) {
        console.error('[GraphState] Listener error:', err);
      }
    }
  }

  getState() {
    return this.state;
  }

  setFocus(entityId) {
    this.state.focusEntityId = entityId;
    this.state.selectedNodeId = entityId;
    this.notify(['focusEntityId', 'selectedNodeId']);
  }

  addEntities(entities = []) {
    let changed = false;
    for (const entity of entities) {
      if (!entity || !entity.id) continue;
      if (this.state.entities.has(entity.id)) {
        // 更新現有 entity metadata
        const existing = this.state.entities.get(entity.id);
        Object.assign(existing, entity, {
          metadata: { ...existing.metadata, ...entity.metadata }
        });
      } else {
        this.state.entities.set(entity.id, {
          expanded: false,
          visible: true,
          ...entity
        });
        changed = true;
      }
    }
    if (changed || entities.length > 0) {
      this.notify(['entities']);
    }
  }

  addRelationships(rels = []) {
    let changed = false;
    for (const rel of rels) {
      if (!rel || !rel.id) continue;
      if (!this.state.relationships.has(rel.id)) {
        this.state.relationships.set(rel.id, rel);
        changed = true;
      }
    }
    if (changed) {
      this.notify(['relationships']);
    }
  }

  removeEntities(ids = []) {
    const toRemove = new Set(ids);
    let changed = false;
    for (const id of toRemove) {
      if (this.state.entities.delete(id)) {
        changed = true;
      }
      this.state.expandedNodeIds.delete(id);
    }
    // 連帶刪除關聯 edge
    for (const [relId, rel] of this.state.relationships.entries()) {
      if (toRemove.has(rel.sourceId) || toRemove.has(rel.targetId)) {
        this.state.relationships.delete(relId);
        changed = true;
      }
    }
    if (changed) {
      this.notify(['entities', 'relationships']);
    }
  }

  selectNode(entityId) {
    if (this.state.selectedNodeId !== entityId) {
      this.state.selectedNodeId = entityId;
      this.notify(['selectedNodeId']);
    }
  }

  hoverNode(entityId) {
    if (this.state.hoveredNodeId !== entityId) {
      this.state.hoveredNodeId = entityId;
      this.notify(['hoveredNodeId']);
    }
  }

  toggleExpand(entityId, expanded) {
    const isExpanded = expanded !== undefined ? expanded : !this.state.expandedNodeIds.has(entityId);
    if (isExpanded) {
      this.state.expandedNodeIds.add(entityId);
    } else {
      this.state.expandedNodeIds.delete(entityId);
    }
    const entity = this.state.entities.get(entityId);
    if (entity) entity.expanded = isExpanded;
    this.notify(['expandedNodeIds']);
  }

  setLoading(entityId, isLoading) {
    if (isLoading) {
      this.state.loading.add(entityId);
    } else {
      this.state.loading.delete(entityId);
    }
    this.notify(['loading']);
  }

  updateFilters(filters = {}) {
    Object.assign(this.state.filters, filters);
    this.notify(['filters']);
  }

  updateViewport(viewport) {
    this.state.viewport = { ...this.state.viewport, ...viewport };
  }

  pushExplorationPath(entry) {
    // 檢查是否已在路徑中最後一位
    const last = this.state.explorationPath[this.state.explorationPath.length - 1];
    if (last && last.entityId === entry.entityId) return;
    this.state.explorationPath.push(entry);
    this.notify(['explorationPath']);
  }

  popExplorationPathTo(index) {
    if (index >= 0 && index < this.state.explorationPath.length) {
      this.state.explorationPath = this.state.explorationPath.slice(0, index + 1);
      const target = this.state.explorationPath[index];
      if (target) {
        this.setFocus(target.entityId);
      }
      this.notify(['explorationPath']);
    }
  }

  reset() {
    this.state.entities.clear();
    this.state.relationships.clear();
    this.state.expandedNodeIds.clear();
    this.state.focusEntityId = null;
    this.state.selectedNodeId = null;
    this.state.hoveredNodeId = null;
    this.state.explorationPath = [];
    this.state.loading.clear();
    this.notify(['entities', 'relationships', 'focusEntityId', 'selectedNodeId', 'explorationPath']);
  }

  getEntity(id) {
    return this.state.entities.get(id);
  }

  getRelationshipsOf(entityId) {
    const rels = [];
    for (const rel of this.state.relationships.values()) {
      if (rel.sourceId === entityId || rel.targetId === entityId) {
        rels.push(rel);
      }
    }
    return rels;
  }

  getNeighborIds(entityId) {
    const neighbors = new Set();
    for (const rel of this.state.relationships.values()) {
      if (rel.sourceId === entityId) neighbors.add(rel.targetId);
      if (rel.targetId === entityId) neighbors.add(rel.sourceId);
    }
    return Array.from(neighbors);
  }

  // BFS 計算每個節點距 focus 的深度 (0, 1, 2...)
  computeEntityDepths() {
    const depths = new Map();
    const focusId = this.state.focusEntityId;
    if (!focusId || !this.state.entities.has(focusId)) {
      // 若無焦點，所有存在節點為 0
      for (const id of this.state.entities.keys()) depths.set(id, 0);
      return depths;
    }

    depths.set(focusId, 0);
    const queue = [focusId];
    const visited = new Set([focusId]);

    // 建立只走允許 filter 關係的鄰接表
    const allowedTypes = this.state.filters.relationTypes;
    const adj = new Map();
    for (const rel of this.state.relationships.values()) {
      if (allowedTypes && !allowedTypes.has(rel.type)) continue;
      if (!adj.has(rel.sourceId)) adj.set(rel.sourceId, []);
      if (!adj.has(rel.targetId)) adj.set(rel.targetId, []);
      adj.get(rel.sourceId).push(rel.targetId);
      adj.get(rel.targetId).push(rel.sourceId);
    }

    while (queue.length > 0) {
      const current = queue.shift();
      const currentDepth = depths.get(current) || 0;
      const neighbors = adj.get(current) || [];
      for (const n of neighbors) {
        if (!visited.has(n)) {
          visited.add(n);
          depths.set(n, currentDepth + 1);
          queue.push(n);
        }
      }
    }

    return depths;
  }

  getEntityDepth(entityId) {
    const depths = this.computeEntityDepths();
    return depths.has(entityId) ? depths.get(entityId) : 999;
  }

  getVisibleEntities() {
    const focusId = this.state.focusEntityId;
    if (!focusId) return Array.from(this.state.entities.values());

    const depths = this.computeEntityDepths();
    const maxDepth = this.state.filters.maxDepth ?? 2;
    const maxNodes = this.state.filters.maxNodes ?? 50;

    // 篩選深度小於等於 maxDepth 且已連通的實體
    const reachable = [];
    for (const [id, entity] of this.state.entities.entries()) {
      const d = depths.get(id);
      if (d !== undefined && d <= maxDepth) {
        reachable.push({ entity, depth: d });
      }
    }

    // 依深度排序（深度的先被保留，或中心先保留）
    reachable.sort((a, b) => a.depth - b.depth);

    // 限制在 maxNodes 內
    const visible = reachable.slice(0, maxNodes).map(r => r.entity);
    return visible;
  }

  getVisibleRelationships() {
    const visibleEntities = this.getVisibleEntities();
    const visibleIds = new Set(visibleEntities.map(e => e.id));
    const allowedTypes = this.state.filters.relationTypes;

    const visibleRels = [];
    for (const rel of this.state.relationships.values()) {
      if (allowedTypes && !allowedTypes.has(rel.type)) continue;
      if (visibleIds.has(rel.sourceId) && visibleIds.has(rel.targetId)) {
        visibleRels.push(rel);
      }
    }
    return visibleRels;
  }

  getNodeCount() {
    return this.getVisibleEntities().length;
  }
}
