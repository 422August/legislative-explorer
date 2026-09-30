// js/pages/bill-search.js
import { api } from '../api.js';
import { TERM_DATES } from '../constants.js';
import { createElement, debounce } from '../utils.js';
import { createBillItem } from '../components/bill-item.js';
import { createSkeletonList } from '../components/skeleton.js';
import { createPagination } from '../components/pagination.js';
import { showToast } from '../components/toast.js';

export async function renderBillSearch({ searchParams = '' }) {
  const container = createElement('div', { className: 'bill-search-page' });

  // Parse initial query parameters from hash URL
  const params = new URLSearchParams(searchParams);
  const initialQuery = params.get('q') || '';
  const initialTerm = params.get('term') || params.get('屆') || '';
  const initialScope = params.get('scope') || 'title_or_proposer';

  const state = {
    query: initialQuery,
    term: initialTerm,
    scope: initialScope,
    page: 1,
    limit: 20
  };

  // Breadcrumb
  const breadcrumb = createElement('nav', { className: 'breadcrumb', 'aria-label': '檢索路徑' }, [
    createElement('a', { href: '#/', text: '歷屆索引目錄' }),
    createElement('span', { className: 'breadcrumb-separator', text: '/' }),
    createElement('span', { text: '法律議案全宗檢索' })
  ]);
  container.appendChild(breadcrumb);

  // Page Header
  const header = createElement('div', { className: 'page-header' }, [
    createElement('h1', { className: 'page-title', text: '立法院法律議案全宗檢索' }),
    createElement('p', {
      className: 'page-desc',
      text: '支援跨會期檢索立法院審議之法律草案、修正條文、議案編號、提案單位與提案委員。'
    })
  ]);
  container.appendChild(header);

  // Query Toolbar
  const toolbar = createElement('div', { className: 'query-toolbar' });

  // Search Keyword input
  const queryInput = createElement('input', {
    type: 'search',
    className: 'query-input',
    value: state.query,
    placeholder: '輸入法案名稱、關鍵字、議案字號或提案委員姓名...',
    'aria-label': '議案檢索關鍵字',
    onkeydown: (e) => {
      if (e.key === 'Enter') {
        state.query = e.target.value.trim();
        state.page = 1;
        executeSearch();
      }
    }
  });

  const queryGroup = createElement('div', { className: 'query-group', style: 'flex: 1 1 240px;' }, [
    createElement('span', { className: 'query-label', text: '檢索詞：' }),
    queryInput
  ]);

  // Scope Select Filter
  const scopeOptions = [
    createElement('option', { value: 'title_or_proposer', text: '法案名稱與提案人 (最精準)' }),
    createElement('option', { value: 'title', text: '僅限法案名稱 (法條名稱)' }),
    createElement('option', { value: 'proposer', text: '僅限主要提案人 (提案委員)' }),
    createElement('option', { value: 'all', text: '全文檢索 (含案由說明與連署人)' })
  ];

  const scopeSelect = createElement('select', {
    className: 'query-select',
    'aria-label': '檢索範圍',
    onchange: (e) => {
      state.scope = e.target.value;
      state.page = 1;
      executeSearch();
    }
  }, scopeOptions);

  Array.from(scopeSelect.options).forEach(opt => {
    if (opt.value === state.scope) opt.selected = true;
  });

  const scopeGroup = createElement('div', { className: 'query-group' }, [
    createElement('span', { className: 'query-label', text: '檢索範圍：' }),
    scopeSelect
  ]);

  // Term Select Filter (Digital archives cover Term 5 to 11; Terms 1-4 are paper/microfilm)
  const termOptions = [
    createElement('option', { value: '', text: '全部屆次 (第5～11屆數位全宗)' }),
    ...TERM_DATES.filter(t => t.term >= 2).sort((a, b) => b.term - a.term).map(t => {
      const isHistoricalOnly = t.term < 5;
      const opt = createElement('option', {
        value: String(t.term),
        text: `${t.name} (${t.years})${t.current ? ' - 現任' : ''}${isHistoricalOnly ? ' [紙本微縮典藏]' : ''}`
      });
      if (String(t.term) === state.term) opt.selected = true;
      return opt;
    })
  ];

  const termSelect = createElement('select', {
    className: 'query-select',
    'aria-label': '屆次篩選',
    onchange: (e) => {
      state.term = e.target.value;
      state.page = 1;
      executeSearch();
    }
  }, termOptions);

  const termGroup = createElement('div', { className: 'query-group' }, [
    createElement('span', { className: 'query-label', text: '所屬屆次：' }),
    termSelect
  ]);

  // Submit button
  const submitBtn = createElement('button', {
    className: 'btn btn-primary btn-sm',
    text: '執行檢索',
    onclick: () => {
      state.query = queryInput.value.trim();
      state.page = 1;
      executeSearch();
    }
  });

  // Count stat
  const countStat = createElement('div', {
    className: 'query-count-stat',
    text: '準備檢索中...'
  });

  toolbar.appendChild(queryGroup);
  toolbar.appendChild(scopeGroup);
  toolbar.appendChild(termGroup);
  toolbar.appendChild(submitBtn);
  toolbar.appendChild(countStat);
  container.appendChild(toolbar);

  // Content Area
  const contentArea = createElement('div', { id: 'bills-search-content', style: 'min-height: 280px;' });
  container.appendChild(contentArea);

  async function executeSearch() {
    contentArea.innerHTML = '';
    contentArea.appendChild(createSkeletonList(5));
    countStat.textContent = '檢索中...';

    // Update URL hash without full reload
    const newParams = new URLSearchParams();
    if (state.query) newParams.set('q', state.query);
    if (state.term) newParams.set('term', state.term);
    if (state.scope && state.scope !== 'title_or_proposer') newParams.set('scope', state.scope);
    const hashSuffix = newParams.toString() ? `?${newParams.toString()}` : '';
    if (window.location.hash !== `#/bills${hashSuffix}`) {
      history.replaceState(null, '', `#/bills${hashSuffix}`);
    }

    try {
      const data = await api.searchBills({
        query: state.query,
        term: state.term,
        scope: state.scope,
        page: state.page,
        limit: state.limit
      });

      renderResults(data);
    } catch (err) {
      console.error(err);
      countStat.textContent = '檢索失敗';
      showToast(`檢索議案失敗：${err.message}`, 'error');
      contentArea.innerHTML = '';
      contentArea.appendChild(createElement('div', { className: 'empty-state' }, [
        createElement('div', { className: 'empty-title', text: '議案檢索發生錯誤' }),
        createElement('div', { className: 'empty-desc', text: err.message }),
        createElement('div', { style: 'margin-top: 12px;' }, [
          createElement('button', {
            className: 'btn btn-primary btn-sm',
            text: '重新檢索',
            onclick: executeSearch
          })
        ])
      ]));
    }
  }

  function renderResults(data) {
    contentArea.innerHTML = '';
    const bills = data.bills || [];
    const total = data.total || 0;

    countStat.textContent = `共計 ${total.toLocaleString()} 筆審議案件`;

    if (bills.length === 0) {
      let emptyTitle = '查無符合條件之法律議案';
      let emptyDesc = '請嘗試減少關鍵字字元、檢查議案字號，或切換至「全部屆次」擴大檢索範圍。';

      if (state.term && parseInt(state.term, 10) < 5) {
        emptyTitle = `第 ${state.term} 屆紙本典藏檔案說明`;
        emptyDesc = `立法院第 ${state.term} 屆之法律提案與關係文書收錄於立法院公報典藏系統與國會圖書館歷史問政檔案，開放資料 API 自第 5 屆起提供數位結構化資料。請切換至第 5～11 屆檢索數位法律案。`;
      } else if (state.query) {
        emptyTitle = `查無包含「${state.query}」之法律議案`;
        emptyDesc = '建議檢查關鍵字是否有錯別字，或嘗試以更簡短的法條簡稱、提案人姓名進行搜尋。';
      }

      contentArea.appendChild(createElement('div', { className: 'empty-state' }, [
        createElement('div', { className: 'empty-title', text: emptyTitle }),
        createElement('div', { className: 'empty-desc', text: emptyDesc })
      ]));
      return;
    }

    const list = createElement('div', {});
    bills.forEach(b => {
      list.appendChild(createBillItem(b, b['屆'] || state.term));
    });
    contentArea.appendChild(list);

    // Pagination
    const totalPages = data.total_page || Math.ceil(total / state.limit);
    const pag = createPagination({
      currentPage: state.page,
      totalPages,
      onPageChange: (newPage) => {
        state.page = newPage;
        executeSearch();
        window.scrollTo({ top: 100, behavior: 'auto' });
      }
    });

    if (pag) {
      contentArea.appendChild(pag);
    }
  }

  // Initial search execution
  executeSearch();

  return container;
}
