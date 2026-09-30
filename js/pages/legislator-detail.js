// js/pages/legislator-detail.js
import { api } from '../api.js';
import { getTermMeta, createElement, formatDate } from '../utils.js';
import { createTabs } from '../components/tabs.js';
import { createBillItem } from '../components/bill-item.js';
import { createMeetingItem } from '../components/meeting-item.js';
import { createSkeletonList } from '../components/skeleton.js';
import { createPagination } from '../components/pagination.js';
import { showToast } from '../components/toast.js';

export async function renderLegislatorDetail({ term, name }) {
  const t = parseInt(term, 10);
  const meta = getTermMeta(t);
  const legName = decodeURIComponent(name);

  const container = createElement('div', { className: 'legislator-detail-page' });

  // Breadcrumb
  const breadcrumb = createElement('nav', { className: 'breadcrumb', 'aria-label': '檢索路徑' }, [
    createElement('a', { href: '#/', text: '歷屆索引目錄' }),
    createElement('span', { className: 'breadcrumb-separator', text: '/' }),
    createElement('a', { href: `#/term/${t}`, text: `${meta.name}名冊` }),
    createElement('span', { className: 'breadcrumb-separator', text: '/' }),
    createElement('span', { text: `${legName} 委員檔案` })
  ]);
  container.appendChild(breadcrumb);

  // Loading skeleton
  const placeholder = createElement('div', { className: 'skeleton-card', style: 'height: 240px; margin-bottom: 20px;' });
  container.appendChild(placeholder);

  try {
    const legislator = await api.getLegislatorDetail(t, legName);
    placeholder.remove();
    renderProfile(container, legislator, t);
  } catch (err) {
    console.error(err);
    placeholder.remove();
    showToast(`載入委員檔案失敗：${err.message}`, 'error');
    container.appendChild(createElement('div', { className: 'empty-state' }, [
      createElement('div', { className: 'empty-title', text: '查無該委員之基本資料檔案' }),
      createElement('div', { className: 'empty-desc', text: err.message }),
      createElement('div', { style: 'margin-top: 12px;' }, [
        createElement('a', { href: `#/term/${t}`, className: 'btn btn-primary btn-sm', text: `返回 ${meta.name} 名冊` })
      ])
    ]));
  }

  return container;
}

function renderProfile(container, leg, term) {
  const fallbackImg = leg.sex === '女'
    ? 'static/images/placeholder-female.svg'
    : 'static/images/placeholder-male.svg';

  // Official Member Dossier Sheet
  const dossier = createElement('div', { className: 'dossier-sheet' });

  // Header Bar
  const headerBar = createElement('div', { className: 'dossier-header-bar' }, [
    createElement('span', { text: `立法院第 ${term} 屆立法委員檔案 ｜ 檔案登記名冊` }),
    createElement('span', { style: 'font-family: var(--font-family-mono);', text: `屆次號：TERM-${term} / 狀態：${leg.hasLeft ? '已離職' : '現任'}` })
  ]);
  dossier.appendChild(headerBar);

  // Main Content (Photo + Structured Data Table)
  const mainContent = createElement('div', { className: 'dossier-main-content' });

  // Photo Frame
  const photoFrame = createElement('div', { className: 'dossier-photo-frame' }, [
    createElement('img', {
      src: leg.picUrl || fallbackImg,
      alt: `${leg.name} 委員存檔照片`,
      onerror: function () {
        if (this.src !== fallbackImg) this.src = fallbackImg;
      }
    })
  ]);
  mainContent.appendChild(photoFrame);

  // Key-Value Table
  const table = createElement('table', { className: 'dossier-data-table' });
  const tbody = createElement('tbody');

  // Row 1: 姓名 & 英文姓名
  const row1 = createElement('tr', {}, [
    createElement('th', { text: '中文姓名' }),
    createElement('td', { style: 'font-weight: 700; font-size: 1.125rem;', text: leg.name }),
    createElement('th', { text: '外文姓名' }),
    createElement('td', { style: 'font-family: var(--font-family-mono);', text: leg.ename || '-' })
  ]);
  tbody.appendChild(row1);

  // Row 2: 屆別 & 性別
  const row2 = createElement('tr', {}, [
    createElement('th', { text: '所屬屆次' }),
    createElement('td', { text: `中華民國立法院第 ${term} 屆` }),
    createElement('th', { text: '性別' }),
    createElement('td', { text: leg.sex || '-' })
  ]);
  tbody.appendChild(row2);

  // Row 3: 黨籍 & 選區
  const row3 = createElement('tr', {}, [
    createElement('th', { text: '政黨別' }),
    createElement('td', { text: leg.party || '無黨籍' }),
    createElement('th', { text: '選區代表' }),
    createElement('td', { text: leg.areaName || (term === 1 ? '第一屆代表' : '全國不分區及僑居國外國民') })
  ]);
  tbody.appendChild(row3);

  // Row 4: 到職日 & 離職狀況
  const statusText = leg.hasLeft
    ? `已離職（生效日期：${formatDate(leg.leaveDate)} / 原因：${leg.leaveReason || '退職/遞補'}）`
    : '現任在職';

  const row4 = createElement('tr', {}, [
    createElement('th', { text: '到職日期' }),
    createElement('td', { style: 'font-family: var(--font-family-mono);', text: formatDate(leg.onboardDate) || (term === 1 ? '1948-05-08' : '-') }),
    createElement('th', { text: '在任狀態' }),
    createElement('td', { text: statusText })
  ]);
  tbody.appendChild(row4);

  // Row 5: 聯絡電話與服務處 (若有)
  if (leg.tel || leg.addr) {
    const row5 = createElement('tr', {}, [
      createElement('th', { text: '通訊處所' }),
      createElement('td', { colSpan: '3', text: `${leg.addr || ''}${leg.tel ? ` ｜ 電話：${leg.tel}` : ''}` })
    ]);
    tbody.appendChild(row5);
  }

  table.appendChild(tbody);
  mainContent.appendChild(table);
  dossier.appendChild(mainContent);

  // Education & Experience & Committee subpanels
  const subpanelsGrid = createElement('div', { className: 'dossier-sections-grid' });

  if (leg.degree && leg.degree.length > 0) {
    subpanelsGrid.appendChild(createElement('div', { className: 'dossier-subpanel' }, [
      createElement('div', { className: 'dossier-subpanel-title', text: '學歷背景 (Education)' }),
      createElement('ul', { className: 'dossier-list' }, leg.degree.map(d => createElement('li', { text: d })))
    ]));
  }

  if (leg.experience && leg.experience.length > 0) {
    subpanelsGrid.appendChild(createElement('div', { className: 'dossier-subpanel' }, [
      createElement('div', { className: 'dossier-subpanel-title', text: '經歷要目 (Experience)' }),
      createElement('ul', { className: 'dossier-list' }, leg.experience.map(e => createElement('li', { text: e })))
    ]));
  }

  if (leg.committee && leg.committee.length > 0) {
    subpanelsGrid.appendChild(createElement('div', { className: 'dossier-subpanel', style: 'grid-column: 1 / -1;' }, [
      createElement('div', { className: 'dossier-subpanel-title', text: '常設與特種委員會參與紀錄 (Committee Assignments)' }),
      createElement('ul', { className: 'dossier-list' }, leg.committee.map(c => createElement('li', { text: c })))
    ]));
  }

  if (subpanelsGrid.children.length > 0) {
    dossier.appendChild(subpanelsGrid);
  }

  container.appendChild(dossier);

  // If Term 1: Show historical archive notice
  if (term === 1) {
    const term1Notice = createElement('div', { className: 'notice-box' }, [
      createElement('div', { className: 'notice-box-title', text: '第 1 屆議事與發言紀錄存檔檢索指引' }),
      createElement('div', {
        text: '第 1 屆委員（行憲首屆至民國 80 年底退職）之議案、審議發言與質詢全宗收錄於立法院國會圖書館歷史問政檔案暨立法院公報典藏系統。現行立法院開放資料 API 主要提供國會全面改選後（特別是第 8 屆起）之結構化數位議事資料。'
      })
    ]);
    container.appendChild(term1Notice);
    return;
  }

  // Register Tabs Section
  const tabsSection = createElement('div', { style: 'margin-top: var(--space-6);' });
  const tabsContent = createElement('div', { id: 'tab-content-area', style: 'min-height: 240px;' });

  const tabDefs = [
    { id: 'propose', label: '主提案紀錄', count: null },
    { id: 'cosign', label: '連署提案紀錄', count: null },
    { id: 'meets', label: '會議出席紀錄', count: null },
    { id: 'interpellations', label: '質詢與答復紀錄', count: null }
  ];

  let currentTab = 'propose';

  const tabs = createTabs({
    tabs: tabDefs,
    initialActive: currentTab,
    onTabChange: (newTab) => {
      currentTab = newTab;
      loadTabData(currentTab, 1);
    }
  });

  tabsSection.appendChild(tabs.element);
  tabsSection.appendChild(tabsContent);
  container.appendChild(tabsSection);

  async function loadTabData(tabId, page = 1) {
    tabsContent.innerHTML = '';
    tabsContent.appendChild(createSkeletonList(4));

    try {
      if (tabId === 'propose') {
        const data = await api.getLegislatorProposeBills(term, leg.name, page);
        tabs.setCount('propose', data.total);
        renderBillsTab(data, page, 'propose');
      } else if (tabId === 'cosign') {
        const data = await api.getLegislatorCosignBills(term, leg.name, page);
        tabs.setCount('cosign', data.total);
        renderBillsTab(data, page, 'cosign');
      } else if (tabId === 'meets') {
        const data = await api.getLegislatorMeets(term, leg.name, page);
        tabs.setCount('meets', data.total);
        renderMeetsTab(data, page);
      } else if (tabId === 'interpellations') {
        const data = await api.getLegislatorInterpellations(term, leg.name, page);
        tabs.setCount('interpellations', data.total);
        renderInterpellationsTab(data, page);
      }
    } catch (err) {
      console.error(err);
      tabsContent.innerHTML = '';
      tabsContent.appendChild(createElement('div', { className: 'empty-state' }, [
        createElement('div', { className: 'empty-title', text: '檢索問政紀錄時發生錯誤' }),
        createElement('div', { className: 'empty-desc', text: err.message })
      ]));
    }
  }

  function renderBillsTab(data, page, type) {
    tabsContent.innerHTML = '';
    const bills = data.bills || [];

    if (bills.length === 0) {
      tabsContent.appendChild(createElement('div', { className: 'empty-state' }, [
        createElement('div', { className: 'empty-title', text: type === 'propose' ? '無主提案紀錄' : '無連署提案紀錄' }),
        createElement('div', { className: 'empty-desc', text: '立法院開放資料庫中未查得該委員於本屆次之提案登記紀錄。' })
      ]));
      return;
    }

    const list = createElement('div', {});
    bills.forEach(b => list.appendChild(createBillItem(b, term)));
    tabsContent.appendChild(list);

    const totalPages = data.total_page || Math.ceil((data.total || 0) / (data.limit || 15));
    const pag = createPagination({
      currentPage: page,
      totalPages,
      onPageChange: (newPage) => loadTabData(type, newPage)
    });
    if (pag) tabsContent.appendChild(pag);
  }

  function renderMeetsTab(data, page) {
    tabsContent.innerHTML = '';
    const meets = data.meets || [];

    if (meets.length === 0) {
      tabsContent.appendChild(createElement('div', { className: 'empty-state' }, [
        createElement('div', { className: 'empty-title', text: '無會議出席紀錄' }),
        createElement('div', { className: 'empty-desc', text: '未查得該委員於本屆次之會議簽到出席資料。' })
      ]));
      return;
    }

    const list = createElement('div', {});
    meets.forEach(m => list.appendChild(createMeetingItem(m)));
    tabsContent.appendChild(list);

    const totalPages = data.total_page || Math.ceil((data.total || 0) / (data.limit || 15));
    const pag = createPagination({
      currentPage: page,
      totalPages,
      onPageChange: (newPage) => loadTabData('meets', newPage)
    });
    if (pag) tabsContent.appendChild(pag);
  }

  function renderInterpellationsTab(data, page) {
    tabsContent.innerHTML = '';
    const items = data.interpellations || [];

    if (items.length === 0) {
      tabsContent.appendChild(createElement('div', { className: 'empty-state' }, [
        createElement('div', { className: 'empty-title', text: '無質詢與行政院答復紀錄' }),
        createElement('div', { className: 'empty-desc', text: '未查得該委員於本屆次提出之口頭或書面質詢案件。' })
      ]));
      return;
    }

    const list = createElement('div', {});
    items.forEach(item => {
      const card = createElement('div', {
        style: 'background-color: var(--color-bg-card); border: 1px solid var(--color-border); padding: 12px 14px; margin-bottom: 8px;'
      }, [
        createElement('div', {
          style: 'display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;'
        }, [
          createElement('div', { style: 'font-weight: 700; font-size: 0.9375rem;', text: item['事由'] || item['標題'] || '委員質詢案' }),
          createElement('span', {
            style: 'font-family: var(--font-family-mono); font-size: 0.75rem; color: var(--color-text-secondary); white-space: nowrap;',
            text: formatDate(item['質詢日期'] || item['日期'])
          })
        ]),
        createElement('div', {
          style: 'font-size: 0.75rem; color: var(--color-text-muted); margin-bottom: 6px;',
          text: `屆次：第 ${item['屆'] || term} 屆 ｜ 會期：第 ${item['會期'] || '-'} 會期 ｜ 質詢類別：${item['質詢種類'] || '一般質詢'}`
        }),
        item['答復內容'] ? createElement('div', {
          style: 'font-size: 0.8125rem; color: var(--color-text-secondary); line-height: 1.5; background-color: var(--color-bg-subtle); padding: 6px 10px; border-left: 2px solid var(--color-border-dark);',
          text: item['答復內容'].slice(0, 300) + '...'
        }) : null
      ]);
      list.appendChild(card);
    });
    tabsContent.appendChild(list);

    const totalPages = data.total_page || Math.ceil((data.total || 0) / (data.limit || 15));
    const pag = createPagination({
      currentPage: page,
      totalPages,
      onPageChange: (newPage) => loadTabData('interpellations', newPage)
    });
    if (pag) tabsContent.appendChild(pag);
  }

  // Initial load
  loadTabData('propose', 1);
}
