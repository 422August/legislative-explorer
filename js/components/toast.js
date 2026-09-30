// js/components/toast.js
import { createElement } from '../utils.js';

let container = null;

function getContainer() {
  if (!container) {
    container = document.getElementById('toast-container');
    if (!container) {
      container = createElement('div', { id: 'toast-container', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(container);
    }
  }
  return container;
}

export function showToast(message, type = 'info', duration = 4000) {
  const c = getContainer();
  const label = type === 'error' ? '[錯誤]' : type === 'success' ? '[完成]' : '[提示]';

  const toast = createElement('div', { className: `toast toast-${type}` }, [
    createElement('div', { style: 'display: flex; align-items: baseline; gap: 8px;' }, [
      createElement('strong', { style: 'font-size: 0.75rem; letter-spacing: 0.05em;', text: label }),
      createElement('span', { text: message })
    ]),
    createElement('button', {
      style: 'background: transparent; border: none; color: inherit; cursor: pointer; padding: 0 4px; font-size: 14px; opacity: 0.6;',
      'aria-label': '關閉通知',
      text: '×',
      onclick: () => remove()
    })
  ]);

  function remove() {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 150);
  }

  c.appendChild(toast);

  if (duration > 0) {
    setTimeout(remove, duration);
  }

  return remove;
}
