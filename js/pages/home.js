import { TERM_DATES, getCurrentTerm } from '../constants.js';
import { createElement } from '../utils.js';

export function renderHome() {
  const currentTerm = getCurrentTerm();
  const container = createElement('div', { className: 'home-page' });

  // System Header
  const header = createElement('div', { className: 'page-header' }, [
    createElement('h1', { className: 'page-title', text: '立法院歷屆任期索引目錄' }),
    createElement('p', {
      className: 'page-desc',
      text: `收錄民國 37 年（1948 年）行憲第 1 屆至現任第 ${currentTerm} 屆之全體立法委員名錄、法律提案、議事會議與出席紀錄。請選擇欲檢索之屆別。`
    })
  ]);
  container.appendChild(header);

  // Institutional Notice
  const notice = createElement('div', { className: 'notice-box' }, [
    createElement('div', { className: 'notice-box-title', text: '資料收錄範圍與檢索指引' }),
    createElement('div', {
      text: `本系統採雙軌資料檢索：第 2 至 ${currentTerm} 屆提供開放資料即時 API 連線，包含個人詳細經歷、各會期主提案、連署案及出缺席歷程；第 1 屆（1948–1993）整合立法院國會圖書館歷史問政檔案，收錄行憲代表與歷次增額立委共 1,183 席結構化名錄。`
    })
  ]);
  container.appendChild(notice);

  // Direct Bill Search Box on Home Page
  const homeSearchBox = createElement('div', {
    style: 'background-color: var(--color-bg-card); border: 1px solid var(--color-border); padding: var(--space-4); margin-bottom: var(--space-5);'
  });

  const searchBoxTitle = createElement('div', {
    style: 'font-weight: 700; font-size: 0.9375rem; margin-bottom: 6px; color: var(--color-text);',
    text: '法律議案直接搜尋 (Direct Bill Search)'
  });

  const searchForm = createElement('div', {
    style: 'display: flex; gap: 8px; flex-wrap: wrap; align-items: center;'
  });

  const searchInput = createElement('input', {
    type: 'search',
    className: 'query-input',
    placeholder: '輸入法律草案名稱（如：詐欺、刑法、洗錢防制）、議案編號或提案委員姓名...',
    style: 'flex: 1 1 320px; font-size: 0.875rem; padding: 6px 10px;',
    onkeydown: (e) => {
      if (e.key === 'Enter') {
        const val = e.target.value.trim();
        window.location.hash = val ? `#/bills?q=${encodeURIComponent(val)}` : '#/bills';
      }
    }
  });

  const searchBtn = createElement('button', {
    className: 'btn btn-primary',
    text: '直接搜尋議案',
    onclick: () => {
      const val = searchInput.value.trim();
      window.location.hash = val ? `#/bills?q=${encodeURIComponent(val)}` : '#/bills';
    }
  });

  const browseAllBillsBtn = createElement('a', {
    href: '#/bills',
    className: 'btn',
    text: '進入全宗檢索庫'
  });

  searchForm.appendChild(searchInput);
  searchForm.appendChild(searchBtn);
  searchForm.appendChild(browseAllBillsBtn);

  homeSearchBox.appendChild(searchBoxTitle);
  homeSearchBox.appendChild(searchForm);
  container.appendChild(homeSearchBox);

  // Quick Entry / Function Shortcuts
  const quickActions = createElement('div', { style: 'margin-bottom: var(--space-5); display: flex; gap: 8px; flex-wrap: wrap;' }, [
    createElement('a', {
      href: `#/term/${currentTerm}`,
      className: 'btn btn-primary',
      text: `第 ${currentTerm} 屆現任委員名冊`
    }),
    createElement('a', {
      href: `#/term/${currentTerm}/committees`,
      className: 'btn',
      text: `第 ${currentTerm} 屆委員會分類`
    }),
    createElement('a', {
      href: `#/term/${currentTerm}/meetings`,
      className: 'btn',
      text: `第 ${currentTerm} 屆會議議事錄`
    }),
    createElement('a', {
      href: `#/bills?term=${currentTerm}`,
      className: 'btn',
      text: `第 ${currentTerm} 屆法律議案`
    })
  ]);
  container.appendChild(quickActions);

  // Structured Terms Directory Table
  const tableContainer = createElement('div', { className: 'terms-table-container' });
  const table = createElement('table', { className: 'terms-table' });

  // Thead
  const thead = createElement('thead', {}, [
    createElement('tr', {}, [
      createElement('th', { style: 'width: 90px;', text: '屆次' }),
      createElement('th', { style: 'width: 130px;', text: '任期年代' }),
      createElement('th', { style: 'width: 110px;', text: '代表人數' }),
      createElement('th', { text: '國會體制與法制背景說明' }),
      createElement('th', { style: 'width: 190px; text-align: right;', text: '檢索操作' })
    ])
  ]);
  table.appendChild(thead);

  // Tbody
  const tbody = createElement('tbody');
  const sortedTerms = [...TERM_DATES].sort((a, b) => b.term - a.term);

  sortedTerms.forEach(t => {
    const tr = createElement('tr', { className: t.current ? 'is-current' : '' });

    // Term Cell
    const termCell = createElement('td', { className: 'term-name-cell' }, [
      createElement('span', { text: t.name }),
      t.current ? createElement('span', { className: 'tag tag-primary', style: 'margin-left: 6px;', text: '現任' }) : null,
      t.historical ? createElement('span', { className: 'tag tag-neutral', style: 'margin-left: 6px;', text: '歷史檔案' }) : null
    ]);

    // Years Cell
    const yearsCell = createElement('td', { className: 'term-years-cell', text: t.years });

    // Seats Cell
    const seatsCell = createElement('td', { className: 'term-seats-cell', text: `${t.seats.toLocaleString()} 席` });

    // Desc Cell
    const descCell = createElement('td', { className: 'term-desc-cell', text: t.description });

    // Action Cell
    const actionButtons = [
      createElement('a', {
        href: `#/term/${t.term}`,
        className: t.current ? 'btn btn-primary btn-sm' : 'btn btn-sm',
        text: '名冊'
      })
    ];

    if (t.term >= 2) {
      actionButtons.push(
        createElement('a', {
          href: `#/bills?term=${t.term}`,
          className: 'btn btn-sm',
          text: '議案'
        }),
        createElement('a', {
          href: `#/term/${t.term}/meetings`,
          className: 'btn btn-sm',
          text: '會議'
        })
      );
    }

    const actionCell = createElement('td', { style: 'text-align: right; white-space: nowrap;' }, [
      createElement('div', { style: 'display: inline-flex; gap: 4px; justify-content: flex-end;' }, actionButtons)
    ]);

    tr.appendChild(termCell);
    tr.appendChild(yearsCell);
    tr.appendChild(seatsCell);
    tr.appendChild(descCell);
    tr.appendChild(actionCell);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  tableContainer.appendChild(table);
  container.appendChild(tableContainer);

  return container;
}
