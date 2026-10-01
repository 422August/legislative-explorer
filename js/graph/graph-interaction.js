// js/graph/graph-interaction.js
import { zoom, zoomIdentity, drag, select } from './d3-loader.js';
import { ENTITY_TYPES } from './graph-state.js';

export class GraphInteraction {
  constructor(graphRenderer, graphState, graphData, options = {}) {
    this.renderer = graphRenderer;
    this.state = graphState;
    this.data = graphData;
    this.options = options;
    this.zoomBehavior = null;
    this.keyboardHandler = null;
  }

  init() {
    this.setupZoom();
    this.setupNodeEvents();
    this.setupKeyboard();
  }

  setupZoom() {
    const svgEl = this.renderer.getSvgElement();
    if (!svgEl) return;

    this.zoomBehavior = zoom()
      .scaleExtent([0.3, 3.5])
      .on('zoom', (event) => {
        const vp = this.renderer.getViewportGroup();
        if (vp) {
          vp.attr('transform', event.transform);
          this.state.updateViewport({
            x: event.transform.x,
            y: event.transform.y,
            scale: event.transform.k
          });
        }
      });

    select(svgEl)
      .call(this.zoomBehavior)
      .on('dblclick.zoom', null); // 停用預設雙擊放大，保留給節點 re-center
  }

  setupNodeEvents() {
    const svgEl = this.renderer.getSvgElement();
    if (!svgEl) return;

    // 使用 event delegation 監聽節點點擊與滑過
    svgEl.addEventListener('mouseover', (e) => {
      const nodeGroup = e.target.closest('.graph-node-group');
      if (nodeGroup) {
        const entityId = nodeGroup.getAttribute('data-entity-id');
        if (entityId) this.state.hoverNode(entityId);
      }
    });

    svgEl.addEventListener('mouseout', (e) => {
      const nodeGroup = e.target.closest('.graph-node-group');
      if (nodeGroup) {
        this.state.hoverNode(null);
      }
    });

    let clickTimer = null;
    svgEl.addEventListener('click', (e) => {
      const nodeGroup = e.target.closest('.graph-node-group');
      if (!nodeGroup) {
        // 點擊空白處，取消選中
        this.state.selectNode(null);
        return;
      }

      const entityId = nodeGroup.getAttribute('data-entity-id');
      if (!entityId) return;

      const entity = this.state.getEntity(entityId);
      if (entity && entity.isAggregate) {
        // 點擊聚合節點直接觸發載入更多
        this.handleAggregateClick(entity);
        return;
      }

      // 單擊處理 (加微小延遲以防與 dblclick 衝突)
      if (clickTimer) clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        this.state.selectNode(entityId);
      }, 200);
    });

    svgEl.addEventListener('dblclick', (e) => {
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
      }
      const nodeGroup = e.target.closest('.graph-node-group');
      if (nodeGroup) {
        const entityId = nodeGroup.getAttribute('data-entity-id');
        if (entityId) {
          this.handleRecenter(entityId);
        }
      }
    });
  }

  async handleAggregateClick(entity) {
    if (!entity || !entity.metadata) return;
    const meta = entity.metadata;

    if (meta.relationType === 'proposed' && meta.name) {
      await this.data.expandLegislatorProposedBills(meta.term, meta.name, meta.nextPage);
    } else if (meta.relationType === 'cosigned' && meta.name) {
      await this.data.expandLegislatorCosignedBills(meta.term, meta.name, meta.nextPage);
    } else if (meta.allCosigners && meta.parentId) {
      // 展開更多連署人
      const parent = this.state.getEntity(meta.parentId);
      if (parent) {
        this.data.expandBillCosigners(parent, 100);
      }
    }
  }

  async handleRecenter(entityId) {
    const entity = this.state.getEntity(entityId);
    if (!entity) return;

    if (entity.type === ENTITY_TYPES.LEGISLATOR) {
      const name = entity.metadata?.name || entity.label;
      const term = entity.metadata?.term || this.state.getState().term || 11;
      await this.data.loadLegislatorFocus(term, name);
    } else if (entity.type === ENTITY_TYPES.BILL) {
      const billNo = entity.metadata?.billNo || entity.id.split('::')[1];
      const term = entity.metadata?.term || 11;
      await this.data.loadBillFocus(billNo, term);
    } else if (entity.type === ENTITY_TYPES.COMMITTEE) {
      const commName = entity.label;
      const term = entity.metadata?.term || this.state.getState().term || 11;
      await this.data.loadCommitteeFocus(term, commName);
    } else {
      // 其他類型設為焦點
      this.state.setFocus(entityId);
      this.state.pushExplorationPath({
        entityId,
        label: entity.label,
        type: entity.type
      });
    }

    this.centerOnFocus();
  }

  setupKeyboard() {
    this.keyboardHandler = (e) => {
      // 若當前在 input 內輸入則忽略
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.key === 'Escape') {
        this.state.selectNode(null);
      } else if (e.key === '0' || e.key === 'Home') {
        this.centerOnFocus();
      } else if (e.key === 'Backspace') {
        const path = this.state.getState().explorationPath;
        if (path.length > 1) {
          e.preventDefault();
          this.state.popExplorationPathTo(path.length - 2);
        }
      }
    };

    window.addEventListener('keydown', this.keyboardHandler);
  }

  centerOnFocus() {
    const svgEl = this.renderer.getSvgElement();
    if (!svgEl || !this.zoomBehavior) return;

    select(svgEl)
      .transition()
      .duration(350)
      .call(this.zoomBehavior.transform, zoomIdentity);
  }

  destroy() {
    if (this.keyboardHandler) {
      window.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
    const svgEl = this.renderer.getSvgElement();
    if (svgEl && this.zoomBehavior) {
      select(svgEl).on('.zoom', null);
    }
  }
}
