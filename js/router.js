// js/router.js
import { renderHome } from './pages/home.js';
import { renderTermList } from './pages/term-list.js';
import { renderLegislatorDetail } from './pages/legislator-detail.js';
import { renderBillDetail } from './pages/bill-detail.js';
import { renderMeetingList } from './pages/meeting-list.js';
import { renderAbout } from './pages/about.js';

const routes = [
  {
    pattern: /^#\/term\/(\d+)\/legislator\/(.+)$/,
    handler: (matches) => renderLegislatorDetail({ term: matches[1], name: matches[2] })
  },
  {
    pattern: /^#\/term\/(\d+)\/bill\/(.+)$/,
    handler: (matches) => renderBillDetail({ term: matches[1], billNo: matches[2] })
  },
  {
    pattern: /^#\/term\/(\d+)\/meetings$/,
    handler: (matches) => renderMeetingList({ term: matches[1] })
  },
  {
    pattern: /^#\/term\/(\d+)$/,
    handler: (matches) => renderTermList({ term: matches[1] })
  },
  {
    pattern: /^#\/about$/,
    handler: () => renderAbout()
  },
  {
    pattern: /^#\/?$/,
    handler: () => renderHome()
  }
];

export class Router {
  constructor(rootElement) {
    this.root = rootElement;
    this.currentCleanUp = null;
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  async handleRoute() {
    const hash = window.location.hash || '#/';

    let matched = false;
    for (const route of routes) {
      const match = hash.match(route.pattern);
      if (match) {
        matched = true;
        this.renderView(route.handler(match));
        break;
      }
    }

    if (!matched) {
      // Fallback to home
      window.location.hash = '#/';
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  async renderView(viewPromise) {
    this.root.innerHTML = '';
    const spinner = document.createElement('div');
    spinner.className = 'empty-state';
    spinner.innerHTML = '<div class="skeleton skeleton-text" style="width: 120px; margin: 0 auto 10px; height: 14px;"></div><p style="font-size: 0.8125rem; color: var(--color-text-secondary);">正在檢索國會資料庫...</p>';
    this.root.appendChild(spinner);

    try {
      const view = await viewPromise;
      this.root.innerHTML = '';
      if (view instanceof Node) {
        this.root.appendChild(view);
      }
    } catch (err) {
      console.error('[Router] Route rendering error:', err);
      this.root.innerHTML = `
        <div class="empty-state">
          <div class="empty-title">檢索頁面載入失敗</div>
          <div class="empty-desc">${err.message || '連線逾時或查無資料'}</div>
          <div style="margin-top: 12px;">
            <a href="#/" class="btn btn-primary btn-sm">返回索引目錄</a>
          </div>
        </div>
      `;
    }
  }

  init() {
    this.handleRoute();
  }
}
