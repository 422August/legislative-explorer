// js/graph/graph-renderer.js
import { select } from './d3-loader.js';
import { getPartyInfo } from '../utils.js';
import { ENTITY_TYPES, RELATION_TYPES } from './graph-state.js';

export class GraphRenderer {
  constructor(containerElement, graphState) {
    this.container = containerElement;
    this.state = graphState;
    this.svg = null;
    this.viewportGroup = null;
    this.edgesGroup = null;
    this.nodesGroup = null;
    this.prevPositions = new Map();
  }

  init(width = 800, height = 600) {
    this.container.innerHTML = '';

    this.svg = select(this.container)
      .append('svg')
      .attr('class', 'graph-svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`);

    // 定義濾鏡或遮罩（如需要）
    this.defs = this.svg.append('defs');

    // Viewport Group (zoom/pan 作用在此 group)
    this.viewportGroup = this.svg.append('g').attr('class', 'graph-viewport');

    // 底層邊，頂層節點
    this.edgesGroup = this.viewportGroup.append('g').attr('class', 'graph-edges');
    this.nodesGroup = this.viewportGroup.append('g').attr('class', 'graph-nodes');
  }

  getSvgElement() {
    return this.svg ? this.svg.node() : null;
  }

  getViewportGroup() {
    return this.viewportGroup;
  }

  // 繪製節點幾何外觀
  createNodeShape(d3NodeGroup, entity, isFocus) {
    const type = entity.type;
    const isAgg = !!entity.isAggregate;

    if (type === ENTITY_TYPES.LEGISLATOR) {
      const r = isFocus ? 22 : 16;
      const party = (entity.metadata && entity.metadata.party) || '無黨籍';
      const pInfo = getPartyInfo(party);

      d3NodeGroup.append('circle')
        .attr('class', `graph-node graph-node-legislator ${isAgg ? 'graph-node--aggregate' : ''}`)
        .attr('r', r)
        .attr('fill', isAgg ? 'var(--color-bg-card)' : pInfo.color)
        .attr('stroke', isAgg ? pInfo.color : 'var(--color-bg-card)')
        .attr('stroke-width', isFocus ? 3 : 1.5);

      // 若是聚合節點，中央加上 + 號
      if (isAgg) {
        d3NodeGroup.append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('fill', pInfo.color)
          .attr('font-size', '14px')
          .attr('font-weight', '700')
          .text('+');
      }
    } else if (type === ENTITY_TYPES.BILL) {
      const w = isFocus ? 36 : 28;
      const h = isFocus ? 22 : 18;

      d3NodeGroup.append('rect')
        .attr('class', `graph-node graph-node-bill ${isAgg ? 'graph-node--aggregate' : ''}`)
        .attr('x', -w / 2)
        .attr('y', -h / 2)
        .attr('width', w)
        .attr('height', h)
        .attr('rx', 2)
        .attr('fill', isAgg ? 'var(--color-bg-subtle)' : 'var(--color-bg-card)')
        .attr('stroke', 'var(--color-primary)')
        .attr('stroke-width', isFocus ? 2.5 : 1.2);

      if (isAgg) {
        d3NodeGroup.append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('fill', 'var(--color-primary)')
          .attr('font-size', '12px')
          .attr('font-weight', '700')
          .text('⋯');
      }
    } else if (type === ENTITY_TYPES.COMMITTEE) {
      // 六角形
      const r = isFocus ? 18 : 14;
      const points = [0, 1, 2, 3, 4, 5].map(i => {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        return `${(r * Math.cos(angle)).toFixed(1)},${(r * Math.sin(angle)).toFixed(1)}`;
      }).join(' ');

      d3NodeGroup.append('polygon')
        .attr('class', 'graph-node graph-node-committee')
        .attr('points', points)
        .attr('fill', 'var(--color-info-bg)')
        .attr('stroke', 'var(--color-info)')
        .attr('stroke-width', isFocus ? 2.5 : 1.2);
    } else if (type === ENTITY_TYPES.MEETING) {
      // 菱形
      const d = isFocus ? 24 : 18;
      const points = `0,${-d / 2} ${d / 2},0 0,${d / 2} ${-d / 2},0`;

      d3NodeGroup.append('polygon')
        .attr('class', 'graph-node graph-node-meeting')
        .attr('points', points)
        .attr('fill', 'var(--color-bg-subtle)')
        .attr('stroke', 'var(--color-border-dark)')
        .attr('stroke-width', isFocus ? 2.5 : 1.2);
    } else if (type === ENTITY_TYPES.INTERPELLATION) {
      // 倒三角
      const s = isFocus ? 22 : 17;
      const points = `${-s / 2},${-s * 0.28} ${s / 2},${-s * 0.28} 0,${s * 0.58}`;

      d3NodeGroup.append('polygon')
        .attr('class', 'graph-node graph-node-interpellation')
        .attr('points', points)
        .attr('fill', 'var(--color-warning-bg)')
        .attr('stroke', 'var(--color-warning)')
        .attr('stroke-width', isFocus ? 2.5 : 1.2);
    } else {
      // 預設正方形
      d3NodeGroup.append('rect')
        .attr('class', 'graph-node')
        .attr('x', -8)
        .attr('y', -8)
        .attr('width', 16)
        .attr('height', 16)
        .attr('fill', 'var(--color-bg-card)')
        .attr('stroke', 'var(--color-border)');
    }
  }

  render(positions) {
    if (!this.viewportGroup) return;

    const visibleEntities = this.state.getVisibleEntities();
    const visibleRels = this.state.getVisibleRelationships();
    const focusId = this.state.state.focusEntityId;
    const selectedId = this.state.state.selectedNodeId;

    // === 1. 繪製邊 (Edges) ===
    const edgeData = visibleRels.filter(rel => {
      return positions.has(rel.sourceId) && positions.has(rel.targetId);
    });

    const edges = this.edgesGroup
      .selectAll('.graph-edge')
      .data(edgeData, d => d.id);

    // Exit
    edges.exit().remove();

    // Enter
    const edgesEnter = edges.enter()
      .append('line')
      .attr('class', d => `graph-edge graph-edge--${d.type || 'default'}`)
      .attr('data-rel-id', d => d.id)
      .attr('x1', d => {
        const p = positions.get(d.sourceId);
        return p ? p.x : 0;
      })
      .attr('y1', d => {
        const p = positions.get(d.sourceId);
        return p ? p.y : 0;
      })
      .attr('x2', d => {
        const p = positions.get(d.targetId);
        return p ? p.x : 0;
      })
      .attr('y2', d => {
        const p = positions.get(d.targetId);
        return p ? p.y : 0;
      });

    // Update
    edges.merge(edgesEnter)
      .attr('x1', d => positions.get(d.sourceId).x)
      .attr('y1', d => positions.get(d.sourceId).y)
      .attr('x2', d => positions.get(d.targetId).x)
      .attr('y2', d => positions.get(d.targetId).y);

    // === 2. 繪製節點 (Nodes) ===
    const nodeData = visibleEntities.filter(e => positions.has(e.id));

    const nodes = this.nodesGroup
      .selectAll('.graph-node-group')
      .data(nodeData, d => d.id);

    // Exit
    nodes.exit().remove();

    // Enter
    const nodesEnter = nodes.enter()
      .append('g')
      .attr('class', 'graph-node-group')
      .attr('data-entity-id', d => d.id)
      .attr('transform', d => {
        const p = positions.get(d.id);
        return `translate(${p.x}, ${p.y})`;
      });

    // 建立節點形狀
    nodesEnter.each((d, i, nodes) => {
      const g = select(nodes[i]);
      const isFocus = d.id === focusId;
      this.createNodeShape(g, d, isFocus);

      // 標籤文字
      const labelY = d.type === ENTITY_TYPES.LEGISLATOR ? (isFocus ? 30 : 25) : 22;
      g.append('text')
        .attr('class', `graph-label ${isFocus ? 'graph-label--focus' : ''}`)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .text(d.label);

      // 次標籤或聚合摘要
      if (d.sublabel && isFocus) {
        g.append('text')
          .attr('class', 'graph-label-sub')
          .attr('y', labelY + 14)
          .attr('text-anchor', 'middle')
          .text(d.sublabel);
      }
    });

    // Update 位置與選中狀態
    const nodesMerged = nodes.merge(nodesEnter);
    nodesMerged
      .attr('transform', d => {
        const p = positions.get(d.id);
        return `translate(${p.x}, ${p.y})`;
      })
      .classed('graph-node--selected', d => d.id === selectedId)
      .classed('graph-node--focus', d => d.id === focusId);

    // 保存當前位置供下次過渡或參照
    this.prevPositions = new Map(positions);
  }

  highlightNode(entityId) {
    if (!this.viewportGroup) return;

    if (!entityId) {
      // 取消所有高亮與淡化
      this.nodesGroup.selectAll('.graph-node-group')
        .classed('graph-node--dimmed', false)
        .classed('graph-node--hovered', false);
      this.edgesGroup.selectAll('.graph-edge')
        .classed('graph-edge--dimmed', false)
        .classed('graph-edge--highlighted', false);
      return;
    }

    const neighborIds = new Set(this.state.getNeighborIds(entityId));
    neighborIds.add(entityId);

    // 節點高亮與淡化
    this.nodesGroup.selectAll('.graph-node-group')
      .classed('graph-node--hovered', d => d.id === entityId)
      .classed('graph-node--dimmed', d => !neighborIds.has(d.id));

    // 邊高亮與淡化
    this.edgesGroup.selectAll('.graph-edge')
      .classed('graph-edge--highlighted', d => d.sourceId === entityId || d.targetId === entityId)
      .classed('graph-edge--dimmed', d => d.sourceId !== entityId && d.targetId !== entityId);
  }

  selectNode(entityId) {
    if (!this.nodesGroup) return;
    this.nodesGroup.selectAll('.graph-node-group')
      .classed('graph-node--selected', d => d.id === entityId);
  }

  resize(width, height) {
    if (this.svg) {
      this.svg.attr('viewBox', `0 0 ${width} ${height}`);
    }
  }
}
