// js/components/pagination.js
import { createElement } from '../utils.js';

export function createPagination({ currentPage = 1, totalPages = 1, onPageChange }) {
  if (totalPages <= 1) return null;

  const container = createElement('nav', { className: 'pagination', 'aria-label': '分頁導覽' });

  // First page button
  if (currentPage > 2) {
    container.appendChild(createElement('button', {
      className: 'page-btn',
      'aria-label': '第一頁',
      text: '第一頁',
      style: 'font-size: 0.6875rem; padding: 0 6px;',
      onclick: () => {
        if (currentPage > 1 && typeof onPageChange === 'function') {
          onPageChange(1);
        }
      }
    }));
  }

  // Prev Button
  const prevBtn = createElement('button', {
    className: 'page-btn',
    disabled: currentPage <= 1 ? 'true' : null,
    'aria-label': '上一頁',
    text: '前一頁',
    style: 'font-size: 0.6875rem; padding: 0 6px;',
    onclick: () => {
      if (currentPage > 1 && typeof onPageChange === 'function') {
        onPageChange(currentPage - 1);
      }
    }
  });
  container.appendChild(prevBtn);

  // Page Numbers
  const pages = [];
  const maxButtons = 7;

  if (totalPages <= maxButtons) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) {
      pages.push('...');
    }
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) {
      pages.push('...');
    }
    pages.push(totalPages);
  }

  pages.forEach(p => {
    if (p === '...') {
      container.appendChild(createElement('span', {
        style: 'padding: 0 4px; color: var(--color-text-muted); align-self: center;',
        text: '…'
      }));
    } else {
      const btn = createElement('button', {
        className: `page-btn ${p === currentPage ? 'active' : ''}`,
        text: String(p),
        onclick: () => {
          if (p !== currentPage && typeof onPageChange === 'function') {
            onPageChange(p);
          }
        }
      });
      container.appendChild(btn);
    }
  });

  // Next Button
  const nextBtn = createElement('button', {
    className: 'page-btn',
    disabled: currentPage >= totalPages ? 'true' : null,
    'aria-label': '下一頁',
    text: '後一頁',
    style: 'font-size: 0.6875rem; padding: 0 6px;',
    onclick: () => {
      if (currentPage < totalPages && typeof onPageChange === 'function') {
        onPageChange(currentPage + 1);
      }
    }
  });
  container.appendChild(nextBtn);

  // Last page button
  if (currentPage < totalPages - 1) {
    container.appendChild(createElement('button', {
      className: 'page-btn',
      'aria-label': '最末頁',
      text: '最末頁',
      style: 'font-size: 0.6875rem; padding: 0 6px;',
      onclick: () => {
        if (currentPage < totalPages && typeof onPageChange === 'function') {
          onPageChange(totalPages);
        }
      }
    }));
  }

  return container;
}
