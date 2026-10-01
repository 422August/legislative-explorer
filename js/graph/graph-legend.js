// js/graph/graph-legend.js
import { createElement } from '../utils.js';

export class GraphLegend {
  constructor(containerElement) {
    this.container = containerElement;
  }

  render() {
    const legend = createElement('div', { class: 'graph-legend' }, [
      createElement('div', { class: 'graph-legend-title' }, '圖例索引'),

      // 節點種類
      createElement('div', { class: 'graph-legend-row' }, [
        this.createSvgIcon('circle', '#0b2e59'),
        createElement('span', {}, '立法委員')
      ]),
      createElement('div', { class: 'graph-legend-row' }, [
        this.createSvgIcon('rect', 'var(--color-bg-card)', 'var(--color-primary)'),
        createElement('span', {}, '法律議案')
      ]),
      createElement('div', { class: 'graph-legend-row' }, [
        this.createSvgIcon('hex', 'var(--color-info-bg)', 'var(--color-info)'),
        createElement('span', {}, '委員會')
      ]),
      createElement('div', { class: 'graph-legend-row' }, [
        this.createSvgIcon('diamond', 'var(--color-bg-subtle)', 'var(--color-border-dark)'),
        createElement('span', {}, '審查會議')
      ]),
      createElement('div', { class: 'graph-legend-row' }, [
        this.createSvgIcon('triangle', 'var(--color-warning-bg)', 'var(--color-warning)'),
        createElement('span', {}, '質詢案件')
      ]),

      createElement('div', { style: 'height: 1px; background-color: var(--color-border-subtle); margin: 3px 0;' }),

      // 連線樣式
      createElement('div', { class: 'graph-legend-row' }, [
        this.createSvgLine('solid'),
        createElement('span', {}, '主提案')
      ]),
      createElement('div', { class: 'graph-legend-row' }, [
        this.createSvgLine('dashed'),
        createElement('span', {}, '連署提案')
      ])
    ]);

    this.container.appendChild(legend);
  }

  createSvgIcon(type, fill, stroke) {
    const s = 14;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', s);
    svg.setAttribute('height', s);
    svg.style.flexShrink = '0';

    if (type === 'circle') {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', 7);
      circle.setAttribute('cy', 7);
      circle.setAttribute('r', 5);
      circle.setAttribute('fill', fill);
      svg.appendChild(circle);
    } else if (type === 'rect') {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', 2);
      rect.setAttribute('y', 3);
      rect.setAttribute('width', 10);
      rect.setAttribute('height', 8);
      rect.setAttribute('rx', 1);
      rect.setAttribute('fill', fill);
      rect.setAttribute('stroke', stroke || 'var(--color-primary)');
      rect.setAttribute('stroke-width', 1);
      svg.appendChild(rect);
    } else if (type === 'hex') {
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', '7,2 12,4 12,10 7,12 2,10 2,4');
      poly.setAttribute('fill', fill);
      poly.setAttribute('stroke', stroke);
      poly.setAttribute('stroke-width', 1);
      svg.appendChild(poly);
    } else if (type === 'diamond') {
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', '7,2 12,7 7,12 2,7');
      poly.setAttribute('fill', fill);
      poly.setAttribute('stroke', stroke);
      poly.setAttribute('stroke-width', 1);
      svg.appendChild(poly);
    } else if (type === 'triangle') {
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', '2,3 12,3 7,12');
      poly.setAttribute('fill', fill);
      poly.setAttribute('stroke', stroke);
      poly.setAttribute('stroke-width', 1);
      svg.appendChild(poly);
    }

    return svg;
  }

  createSvgLine(style) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', 18);
    svg.setAttribute('height', 10);
    svg.style.flexShrink = '0';

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', 0);
    line.setAttribute('y1', 5);
    line.setAttribute('x2', 18);
    line.setAttribute('y2', 5);
    line.setAttribute('stroke', 'var(--color-border-dark)');
    line.setAttribute('stroke-width', 1.5);
    if (style === 'dashed') {
      line.setAttribute('stroke-dasharray', '3,2');
    }
    svg.appendChild(line);
    return svg;
  }
}
