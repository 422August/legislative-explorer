// js/components/tabs.js
import { createElement } from '../utils.js';

export function createTabs({ tabs = [], initialActive = '', onTabChange }) {
  const container = createElement('div', { style: 'margin-bottom: var(--space-4);' });
  const nav = createElement('div', { className: 'register-tabs-nav', role: 'tablist' });

  let activeId = initialActive || (tabs[0] && tabs[0].id) || '';
  const buttonMap = new Map();
  const countMap = new Map();

  tabs.forEach(tab => {
    const countSpan = createElement('span', {
      className: 'register-tab-count',
      text: typeof tab.count === 'number' ? `(${tab.count})` : ''
    });
    countMap.set(tab.id, countSpan);

    const btn = createElement('button', {
      className: `register-tab-btn ${tab.id === activeId ? 'active' : ''}`,
      role: 'tab',
      'aria-selected': tab.id === activeId ? 'true' : 'false',
      onclick: () => {
        if (activeId === tab.id) return;
        setActive(tab.id);
        if (typeof onTabChange === 'function') {
          onTabChange(tab.id);
        }
      }
    }, [
      createElement('span', { text: tab.label }),
      countSpan
    ]);

    buttonMap.set(tab.id, btn);
    nav.appendChild(btn);
  });

  function setActive(id) {
    activeId = id;
    buttonMap.forEach((btn, tid) => {
      if (tid === id) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      }
    });
  }

  function setCount(id, count) {
    const span = countMap.get(id);
    if (span) {
      span.textContent = count !== null && count !== undefined ? `(${count})` : '';
    }
  }

  container.appendChild(nav);

  return {
    element: container,
    setActive,
    setCount,
    getActive: () => activeId
  };
}
