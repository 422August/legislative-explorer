// js/components/skeleton.js
import { createElement } from '../utils.js';

export function createSkeletonCards(count = 12) {
  const container = createElement('div', { className: 'roster-grid' });
  for (let i = 0; i < count; i++) {
    const card = createElement('div', { className: 'skeleton-card' }, [
      createElement('div', { className: 'skeleton', style: 'height: 180px; width: 100%; border-bottom: 1px solid var(--color-border);' }),
      createElement('div', { style: 'padding: 8px 10px;' }, [
        createElement('div', { className: 'skeleton skeleton-text', style: 'width: 55%; height: 16px; margin-bottom: 6px;' }),
        createElement('div', { className: 'skeleton skeleton-text', style: 'width: 75%; height: 11px;' })
      ])
    ]);
    container.appendChild(card);
  }
  return container;
}

export function createSkeletonList(count = 4) {
  const container = createElement('div', {});
  for (let i = 0; i < count; i++) {
    const item = createElement('div', {
      style: 'background-color: var(--color-bg-card); border: 1px solid var(--color-border); padding: 12px 14px; margin-bottom: 8px;'
    }, [
      createElement('div', { className: 'skeleton skeleton-text', style: 'height: 16px; width: 65%; margin-bottom: 8px;' }),
      createElement('div', { className: 'skeleton skeleton-text', style: 'height: 11px; width: 35%; margin-bottom: 6px;' }),
      createElement('div', { className: 'skeleton skeleton-text', style: 'height: 11px; width: 45%;' })
    ]);
    container.appendChild(item);
  }
  return container;
}
