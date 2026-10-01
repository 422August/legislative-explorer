// js/graph/graph-breadcrumb.js
import { createElement } from '../utils.js';

export class GraphBreadcrumb {
  constructor(containerElement, graphState, onNavigate) {
    this.container = containerElement;
    this.state = graphState;
    this.onNavigate = onNavigate;
  }

  render() {
    this.container.innerHTML = '';
    const path = this.state.getState().explorationPath || [];

    if (path.length === 0) {
      this.container.style.display = 'none';
      return;
    }
    this.container.style.display = 'flex';

    const bc = createElement('div', { class: 'graph-breadcrumb' });

    // 前綴說明標籤
    bc.appendChild(
      createElement('span', { style: 'font-weight: 600; color: var(--color-text-secondary); margin-right: 4px;' }, '探索歷程：')
    );

    // 最多顯示最後 5 筆
    const maxVisible = 5;
    const startIndex = Math.max(0, path.length - maxVisible);

    if (startIndex > 0) {
      bc.appendChild(createElement('span', { class: 'graph-breadcrumb-separator' }, '…'));
      bc.appendChild(createElement('span', { class: 'graph-breadcrumb-separator' }, '→'));
    }

    for (let i = startIndex; i < path.length; i++) {
      const item = path[i];
      const isCurrent = i === path.length - 1;

      if (isCurrent) {
        bc.appendChild(
          createElement('span', { class: 'graph-breadcrumb-current' }, item.label)
        );
      } else {
        const link = createElement('a', {
          href: 'javascript:void(0)',
          class: 'graph-breadcrumb-item',
          onclick: (e) => {
            e.preventDefault();
            this.state.popExplorationPathTo(i);
            if (this.onNavigate) this.onNavigate(item);
          }
        }, item.label);
        bc.appendChild(link);

        bc.appendChild(
          createElement('span', { class: 'graph-breadcrumb-separator' }, '→')
        );
      }
    }

    this.container.appendChild(bc);
  }

  update() {
    this.render();
  }
}
