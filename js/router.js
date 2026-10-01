import { renderHome } from './pages/home.js';
import { renderTermList } from './pages/term-list.js';
import { renderLegislatorDetail } from './pages/legislator-detail.js';
import { renderBillDetail } from './pages/bill-detail.js';
import { renderBillSearch } from './pages/bill-search.js';
import { renderMeetingList } from './pages/meeting-list.js';
import { renderAbout } from './pages/about.js';
import { renderCommitteeList } from './pages/committee-list.js';
import { renderCommitteeDetail } from './pages/committee-detail.js';
import { getCurrentTerm } from './constants.js';

const routes = [
  {
    pattern: /^#\/term\/(\d+)\/committee\/(.+)$/,
    handler: (matches) => renderCommitteeDetail({ term: matches[1], committeeKey: matches[2] })
  },
  {
    pattern: /^#\/term\/(\d+)\/committees$/,
    handler: (matches) => renderCommitteeList({ term: matches[1] })
  },
  {
    pattern: /^#\/committees$/,
    handler: () => renderCommitteeList({ term: getCurrentTerm() })
  },
  {
    pattern: /^#\/current$/,
    handler: () => renderTermList({ term: getCurrentTerm() })
  },
  {
    pattern: /^#\/term\/(\d+)\/legislator\/(.+)$/,
    handler: (matches) => renderLegislatorDetail({ term: matches[1], name: matches[2] })
  },
  {
    pattern: /^#\/term\/(\d+)\/bill\/(.+)$/,
    handler: (matches) => renderBillDetail({ term: matches[1], billNo: matches[2] })
  },
  {
    pattern: /^#\/bill\/(.+)$/,
    handler: (matches) => renderBillDetail({ term: 11, billNo: matches[1] })
  },
  {
    pattern: /^#\/bills(?:\?(.*))?$/,
    handler: (matches) => renderBillSearch({ searchParams: matches[1] || '' })
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

    this.updateActiveNav(hash);

    if (!matched) {
      // Fallback to home
      window.location.hash = '#/';
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  updateActiveNav(hash) {
    const navLinks = document.querySelectorAll('.header-nav .nav-link');
    const curTerm = getCurrentTerm();

    // 動態同步導航列「現任國會」文字與連結
    const curNav = document.getElementById('nav-current-term');
    if (curNav) {
      curNav.textContent = `第 ${curTerm} 屆現任`;
      curNav.setAttribute('href', `#/term/${curTerm}`);
    }

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === '#/' && (hash === '#/' || hash === '')) {
        link.classList.add('active');
      } else if (href === '#/bills' && hash.startsWith('#/bills')) {
        link.classList.add('active');
      } else if (href === `#/term/${curTerm}` && (hash === `#/term/${curTerm}` || hash === `#/term/${curTerm}/` || hash === '#/current')) {
        link.classList.add('active');
      } else if (href && href.includes('/committees') && hash.includes('/committees')) {
        link.classList.add('active');
      } else if (href === '#/about' && hash === '#/about') {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  async renderView(viewPromise) {
    if (this.currentCleanUp && typeof this.currentCleanUp === 'function') {
      try {
        this.currentCleanUp();
      } catch (err) {
        console.error('[Router] Cleanup error:', err);
      }
      this.currentCleanUp = null;
    }

    this.root.innerHTML = '';
    const spinner = document.createElement('div');
    spinner.className = 'empty-state';
    spinner.innerHTML = '<div class="skeleton skeleton-text" style="width: 120px; margin: 0 auto 10px; height: 14px;"></div><p style="font-size: 0.8125rem; color: var(--color-text-secondary);">正在檢索國會資料庫...</p>';
    this.root.appendChild(spinner);

    try {
      const view = await viewPromise;
      this.root.innerHTML = '';
      if (view instanceof Node) {
        if (typeof view.__cleanup === 'function') {
          this.currentCleanUp = view.__cleanup;
        }
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
