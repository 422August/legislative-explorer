// js/pages/term-list.js
import { api } from '../api.js';
import { getTermMeta, createElement } from '../utils.js';
import { createLegislatorCard } from '../components/legislator-card.js';
import { createFilterBar } from '../components/filter-bar.js';
import { createSkeletonCards } from '../components/skeleton.js';
import { createPagination } from '../components/pagination.js';
import { showToast } from '../components/toast.js';

const PAGE_SIZE = 48; // Paginate for performance

export async function renderTermList({ term }) {
  const t = parseInt(term, 10);
  const meta = getTermMeta(t);

  const container = createElement('div', { className: 'term-list-page' });

  // Breadcrumb
  const breadcrumb = createElement('nav', { className: 'breadcrumb', 'aria-label': '檢索路徑' }, [
    createElement('a', { href: '#/', text: '歷屆索引目錄' }),
    createElement('span', { className: 'breadcrumb-separator', text: '/' }),
    createElement('span', { text: meta.name })
  ]);
  container.appendChild(breadcrumb);

  // Page Header
  const header = createElement('div', { className: 'page-header' }, [
    createElement('div', { style: 'display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;' }, [
      createElement('h1', { className: 'page-title', style: 'margin: 0;', text: `${meta.name} 立法委員名冊` }),
      createElement('span', { className: 'tag tag-primary', text: `任期：${meta.years}` })
    ]),
    createElement('p', {
      className: 'page-desc',
      style: 'margin-top: 6px;',
      text: meta.description
    })
  ]);
  container.appendChild(header);

  // Term Specific Archival Notices
  if (t === 1) {
    const term1Notice = createElement('div', { className: 'notice-box' }, [
      createElement('div', { className: 'notice-box-title', text: '行憲第 1 屆歷史檔案典藏說明' }),
      createElement('div', {
        text: '本名冊包含民國 37 年行憲首屆在中國大陸各省市、職業團體當選之立法委員，以及政府遷台後歷次中央民意代表增額選舉當選人，共計 1,183 席。原始影像於立法院國會圖書館典藏中以男女剪影記錄，本系統提供完整之黨籍、選區代表及生平簡歷存檔。'
      })
    ]);
    container.appendChild(term1Notice);
  } else if (t === 2) {
    const term2Notice = createElement('div', { className: 'notice-box' }, [
      createElement('div', { className: 'notice-box-title', text: '第 2 屆影像典藏說明' }),
      createElement('div', {
        text: '第 2 屆（1993–1996 年）為國會全面改選後首屆三年任期國會。立法院數位開放資料庫中僅收錄部分委員之彩色肖像，其餘委員依館藏性別剪影顯示。'
      })
    ]);
    container.appendChild(term2Notice);
  }

  // Action links
  const subNav = createElement('div', { style: 'margin-bottom: var(--space-4); display: flex; gap: 8px;' }, [
    createElement('a', {
      href: `#/term/${t}/meetings`,
      className: 'btn btn-sm',
      text: '檢視本屆次會議紀錄與議事錄'
    })
  ]);
  container.appendChild(subNav);

  // Content Area
  const contentArea = createElement('div', { id: 'term-content' });
  contentArea.appendChild(createSkeletonCards(12));
  container.appendChild(contentArea);

  // Load Data
  try {
    const legislators = await api.getTermLegislators(t);
    renderContent(legislators, contentArea, t);
  } catch (err) {
    console.error(err);
    showToast(`載入第 ${t} 屆委員名冊失敗：${err.message}`, 'error');
    contentArea.innerHTML = '';
    contentArea.appendChild(createElement('div', { className: 'empty-state' }, [
      createElement('div', { className: 'empty-title', text: '資料載入發生錯誤' }),
      createElement('div', { className: 'empty-desc', text: err.message }),
      createElement('div', { style: 'margin-top: 12px;' }, [
        createElement('button', {
          className: 'btn btn-primary btn-sm',
          text: '重新整理',
          onclick: () => renderTermList({ term })
        })
      ])
    ]));
  }

  return container;
}

function renderContent(allLegislators, contentArea, term) {
  contentArea.innerHTML = '';

  const parties = Array.from(new Set(allLegislators.map(l => l.party).filter(Boolean))).sort();
  const areas = Array.from(new Set(allLegislators.map(l => l.areaName).filter(Boolean))).sort();

  let filteredList = [...allLegislators];
  let currentPage = 1;

  const gridContainer = createElement('div', { className: 'roster-grid' });
  const paginationContainer = createElement('div');

  function applyFilter(filterState) {
    filteredList = allLegislators.filter(leg => {
      if (filterState.party && leg.party !== filterState.party) return false;
      if (filterState.area && leg.areaName !== filterState.area) return false;
      if (filterState.query) {
        const q = filterState.query.toLowerCase();
        const matchName = leg.name.toLowerCase().includes(q) || leg.ename.toLowerCase().includes(q);
        const matchArea = (leg.areaName || '').toLowerCase().includes(q);
        const matchExp = (leg.experience || []).some(exp => exp.toLowerCase().includes(q));
        const matchNote = (leg.note || '').toLowerCase().includes(q);
        if (!matchName && !matchArea && !matchExp && !matchNote) return false;
      }
      return true;
    });

    if (filterState.sort === 'party') {
      filteredList.sort((a, b) => (a.party || '').localeCompare(b.party || '', 'zh-Hant'));
    } else if (filterState.sort === 'area') {
      filteredList.sort((a, b) => (a.areaName || '').localeCompare(b.areaName || '', 'zh-Hant'));
    } else {
      filteredList.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
    }

    currentPage = 1;
    filterBar.updateCount(filteredList.length);
    renderPage();
  }

  function renderPage() {
    gridContainer.innerHTML = '';
    paginationContainer.innerHTML = '';

    if (filteredList.length === 0) {
      gridContainer.appendChild(createElement('div', {
        className: 'empty-state',
        style: 'grid-column: 1 / -1;'
      }, [
        createElement('div', { className: 'empty-title', text: '查無符合條件之立法委員紀錄' }),
        createElement('div', { className: 'empty-desc', text: '請調整或清除檢索詞及政黨、選區篩選條件後重試。' })
      ]));
      return;
    }

    const totalPages = Math.ceil(filteredList.length / PAGE_SIZE);
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const endIdx = startIdx + PAGE_SIZE;
    const pageItems = filteredList.slice(startIdx, endIdx);

    pageItems.forEach(leg => {
      gridContainer.appendChild(createLegislatorCard(leg));
    });

    const pag = createPagination({
      currentPage,
      totalPages,
      onPageChange: (newPage) => {
        currentPage = newPage;
        renderPage();
        window.scrollTo({ top: 120, behavior: 'auto' });
      }
    });

    if (pag) {
      paginationContainer.appendChild(pag);
    }
  }

  const filterBar = createFilterBar({
    parties,
    areas,
    totalCount: allLegislators.length,
    onFilterChange: applyFilter
  });

  contentArea.appendChild(filterBar.element);
  contentArea.appendChild(gridContainer);
  contentArea.appendChild(paginationContainer);

  renderPage();
}
