// js/pages/graph-explorer.js
import { createElement } from '../utils.js';
import { api } from '../api.js';
import { GraphState, ENTITY_TYPES } from '../graph/graph-state.js';
import { GraphData } from '../graph/graph-data.js';
import { GraphLayout } from '../graph/graph-layout.js';
import { GraphRenderer } from '../graph/graph-renderer.js';
import { GraphInteraction } from '../graph/graph-interaction.js';
import { GraphPanel } from '../graph/graph-panel.js';
import { GraphToolbar } from '../graph/graph-toolbar.js';
import { GraphBreadcrumb } from '../graph/graph-breadcrumb.js';
import { GraphLegend } from '../graph/graph-legend.js';

export async function renderGraphExplorer({ term = 11, focusType, focusId } = {}) {
  const currentTerm = parseInt(term) || 11;

  // 1. 建立外層容器
  const root = createElement('div', { class: 'graph-page' });

  // 2. 麵包屑導航 (Breadcrumbs)
  const navBreadcrumbs = createElement('nav', { class: 'breadcrumb', 'aria-label': '路徑導覽' }, [
    createElement('a', { href: '#/' }, '歷屆索引目錄'),
    createElement('span', { class: 'breadcrumb-separator' }, '/'),
    createElement('a', { href: `#/term/${currentTerm}` }, `第 ${currentTerm} 屆名冊`),
    createElement('span', { class: 'breadcrumb-separator' }, '/'),
    createElement('span', { class: 'breadcrumb-current' }, '國會關聯圖譜')
  ]);
  root.appendChild(navBreadcrumbs);

  // 3. 頁面標題與公文提示框
  const pageHeader = createElement('div', { style: 'margin-bottom: var(--space-4);' }, [
    createElement('h1', { style: 'font-size: var(--font-size-xl); font-weight: 700; margin: 0 0 6px 0;' },
      `立法院第 ${currentTerm} 屆問政關聯網絡圖譜`
    ),
    createElement('div', { class: 'notice-box', style: 'margin-bottom: 0;' }, [
      createElement('div', { class: 'notice-box-title' }, '問政探索說明'),
      createElement('div', {},
        '本圖譜以立法院公報開放資料為本，建立人物、提案、連署、審查會議與質詢等多維度拓撲關聯。支援節點雙擊重新聚焦、滾輪縮放、節點拖曳探索，以及右側公文層級展開。'
      )
    ])
  ]);
  root.appendChild(pageHeader);

  // 4. 工具列與探索歷程容器
  const toolbarContainer = createElement('div', { class: 'graph-toolbar-wrapper' });
  const breadcrumbContainer = createElement('div', { class: 'graph-breadcrumb-wrapper' });
  root.appendChild(toolbarContainer);
  root.appendChild(breadcrumbContainer);

  // 5. 圖譜主面板 (畫布 + 側欄詳細面板)
  const graphContainer = createElement('div', { class: 'graph-container' });
  const canvasContainer = createElement('div', { class: 'graph-canvas-container' });
  const panelContainer = createElement('div', { class: 'graph-detail-panel' });

  graphContainer.appendChild(canvasContainer);
  graphContainer.appendChild(panelContainer);
  root.appendChild(graphContainer);

  // 6. 初始化核心模組
  const state = new GraphState();
  state.state.term = currentTerm;
  state.updateFilters({ term: currentTerm });

  const data = new GraphData(state);
  const layout = new GraphLayout(state);
  const renderer = new GraphRenderer(canvasContainer, state);

  // 預設寬高
  let canvasWidth = 850;
  let canvasHeight = 600;
  renderer.init(canvasWidth, canvasHeight);

  const interaction = new GraphInteraction(renderer, state, data);
  interaction.init();

  const panel = new GraphPanel(panelContainer, state, data);
  panel.render();

  const toolbar = new GraphToolbar(toolbarContainer, state, data, {
    onFocusChange: async (type, id) => {
      if (type === 'legislator') {
        await data.loadLegislatorFocus(state.getState().term, id);
      } else if (type === 'bill') {
        await data.loadBillFocus(id, state.getState().term);
      }
      interaction.centerOnFocus();
    },
    onTermChange: async (newTerm) => {
      window.location.hash = `#/term/${newTerm}/graph`;
    },
    onCenter: () => {
      interaction.centerOnFocus();
    },
    onReset: () => {
      // 重新載入初始焦點
      loadInitialFocus();
    }
  });
  toolbar.render();

  const breadcrumb = new GraphBreadcrumb(breadcrumbContainer, state, async (item) => {
    // 點擊歷程跳轉
    interaction.handleRecenter(item.entityId);
  });
  breadcrumb.render();

  const legend = new GraphLegend(canvasContainer);
  legend.render();

  // 7. 監聽狀態變更 (Reactive Pipeline)
  const updateGraphLayoutAndRender = () => {
    const positions = layout.compute(canvasWidth, canvasHeight);
    renderer.render(positions);
    toolbar.updateNodeCount(state.getNodeCount(), state.getState().filters.maxNodes || 50);
  };

  state.subscribe((newState, changedKeys) => {
    if (changedKeys.includes('entities') || changedKeys.includes('relationships') || changedKeys.includes('filters') || changedKeys.includes('focusEntityId')) {
      updateGraphLayoutAndRender();
    }
    if (changedKeys.includes('selectedNodeId')) {
      panel.render();
      renderer.selectNode(newState.selectedNodeId);
    }
    if (changedKeys.includes('hoveredNodeId')) {
      renderer.highlightNode(newState.hoveredNodeId);
    }
    if (changedKeys.includes('explorationPath')) {
      breadcrumb.update();
    }
  });

  // 8. 響應式容器尺寸偵測 (ResizeObserver)
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const cr = entry.contentRect;
      if (cr.width > 100 && cr.height > 100) {
        canvasWidth = cr.width;
        canvasHeight = cr.height;
        renderer.resize(canvasWidth, canvasHeight);
        updateGraphLayoutAndRender();
      }
    }
  });
  resizeObserver.observe(canvasContainer);

  // 9. 載入初始資料
  const loadInitialFocus = async () => {
    try {
      if (focusType === 'legislator' && focusId) {
        await data.loadLegislatorFocus(currentTerm, decodeURIComponent(focusId));
      } else if (focusType === 'bill' && focusId) {
        await data.loadBillFocus(focusId, currentTerm);
      } else {
        // 預設以該屆第一名或代表性立委為起點 (例如韓國瑜或第一位委員)
        const legislators = await api.getTermLegislators(currentTerm);
        if (legislators && legislators.length > 0) {
          const defaultLeg = legislators.find(l => l.name === '韓國瑜') || legislators[0];
          await data.loadLegislatorFocus(currentTerm, defaultLeg.name);
        }
      }
      updateGraphLayoutAndRender();
    } catch (err) {
      console.error('[GraphExplorer] Initial focus load failed:', err);
    }
  };

  // 執行非同步載入
  loadInitialFocus();

  // 10. 註冊組件清理機制 (Teardown)
  root.__cleanup = () => {
    resizeObserver.disconnect();
    interaction.destroy();
  };

  return root;
}
