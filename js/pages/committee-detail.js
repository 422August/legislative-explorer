import { createElement, extractCommitteeMembers, getPartyInfo, formatDate } from '../utils.js';
import { api } from '../api.js';
import { createTabs } from '../components/tabs.js';
import { COMMITTEES_CURRENT, COMMITTEES_SPECIAL, COMMITTEES_HISTORICAL, getCurrentTerm } from '../constants.js';

export async function renderCommitteeDetail({ term, committeeKey = '' } = {}) {
  const currentTerm = parseInt(term, 10) || getCurrentTerm();
  const decodedKey = decodeURIComponent(committeeKey).trim();

  // 1. 查找委員會 Metadata
  const allKnown = [...COMMITTEES_CURRENT, ...COMMITTEES_SPECIAL, ...COMMITTEES_HISTORICAL];
  let committeeMeta = allKnown.find(c => String(c.id) === decodedKey || c.name === decodedKey);

  if (!committeeMeta) {
    committeeMeta = {
      id: null,
      name: decodedKey,
      category: 'standing',
      desc: `立法院第 ${currentTerm} 屆 ${decodedKey}。`
    };
  }

  const committeeName = committeeMeta.name;

  const root = createElement('div', { class: 'committee-page' });

  // 2. 麵包屑導覽
  const breadcrumb = createElement('nav', { class: 'breadcrumb', 'aria-label': '路徑導覽' }, [
    createElement('a', { href: '#/' }, '歷屆索引目錄'),
    createElement('span', { class: 'breadcrumb-separator' }, '/'),
    createElement('a', { href: `#/term/${currentTerm}` }, `第 ${currentTerm} 屆名冊`),
    createElement('span', { class: 'breadcrumb-separator' }, '/'),
    createElement('a', { href: `#/term/${currentTerm}/committees` }, '委員會索引'),
    createElement('span', { class: 'breadcrumb-separator' }, '/'),
    createElement('span', { class: 'breadcrumb-current' }, committeeName)
  ]);
  root.appendChild(breadcrumb);

  // 3. 官方委員會公報檔案表頭 (Dossier Sheet)
  const dossier = createElement('div', { class: 'committee-detail-dossier' }, [
    createElement('div', { class: 'committee-dossier-header' }, [
      createElement('div', { class: 'committee-title-group' }, [
        createElement('h1', { class: 'committee-main-title' }, committeeName),
        createElement('span', { class: 'tag tag-primary' }, committeeMeta.category === 'special' ? '特種委員會' : '常設委員會'),
        committeeMeta.id ? createElement('span', { class: 'tag', style: 'font-family: var(--font-family-mono);' }, `代號: ${committeeMeta.id}`) : null
      ].filter(Boolean))
    ]),
    createElement('div', { class: 'committee-dossier-body' }, [
      createElement('div', { style: 'font-size: var(--font-size-xs); color: var(--color-text-secondary); line-height: 1.6;' }, [
        createElement('strong', {}, '主管業務與職掌範圍：'),
        createElement('span', {}, committeeMeta.desc)
      ])
    ])
  ]);
  root.appendChild(dossier);

  // 載入全體立委以備成員反向萃取
  let legislators = [];
  try {
    legislators = await api.getTermLegislators(currentTerm);
  } catch (err) {
    console.error('[CommitteeDetail] Failed to load legislators:', err);
  }

  const allMembers = extractCommitteeMembers(legislators, committeeName);

  // 4. 定義與建立 Tab 分頁
  let activeTab = 'members'; // 'members' | 'bills' | 'meets'
  const tabDefs = [
    { id: 'members', label: '委員會成員', count: allMembers.length },
    currentTerm > 1 ? { id: 'bills', label: '審查法律提案', count: null } : null,
    (currentTerm > 1 && committeeMeta.id) ? { id: 'meets', label: '審查會議與議程', count: null } : null
  ].filter(Boolean);

  const tabContent = createElement('div', { class: 'committee-tab-content' });

  const tabsObj = createTabs({
    tabs: tabDefs,
    initialActive: activeTab,
    onTabChange: (newTab) => {
      activeTab = newTab;
      renderTabContent();
    }
  });

  root.appendChild(tabsObj.element);
  root.appendChild(tabContent);

  async function renderTabContent() {
    tabContent.innerHTML = '';

    if (activeTab === 'members') {
      renderMembersTab(tabContent, allMembers, currentTerm);
    } else if (activeTab === 'bills') {
      await renderBillsTab(tabContent, committeeName, currentTerm);
    } else if (activeTab === 'meets') {
      await renderMeetsTab(tabContent, committeeMeta.id, currentTerm);
    }
  }

  renderTabContent();

  return root;
}

// === Tab 1: 委員會成員分頁 ===
function renderMembersTab(container, allMembers, term) {
  if (allMembers.length === 0) {
    container.appendChild(createElement('div', { class: 'empty-state' }, [
      createElement('div', { class: 'empty-title' }, '查無該屆之委員會成員登記檔案'),
      createElement('div', { class: 'empty-desc' }, '若為第 2、3 屆，立法院開放資料庫未填載委員常設委員會名冊。')
    ]));
    return;
  }

  // 取得該委員會所有出現過的會期數字
  const allSessions = new Set();
  for (const m of allMembers) {
    for (const s of m.sessions) allSessions.add(s);
  }
  const sessionList = Array.from(allSessions).sort((a, b) => a - b);

  let selectedSession = null; // null 表示全部

  const filterContainer = createElement('div', { class: 'session-filter-bar' });
  const listContainer = createElement('div');

  function updateFilterButtons() {
    filterContainer.innerHTML = '<span style="font-weight: 600; color: var(--color-text-secondary); margin-right: 6px;">會期篩選：</span>';

    const allBtn = createElement('button', {
      class: `session-filter-item ${selectedSession === null ? 'active' : ''}`,
      onclick: () => {
        selectedSession = null;
        updateFilterButtons();
        updateList();
      }
    }, '全部會期');
    filterContainer.appendChild(allBtn);

    for (const s of sessionList) {
      const sBtn = createElement('button', {
        class: `session-filter-item ${selectedSession === s ? 'active' : ''}`,
        onclick: () => {
          selectedSession = s;
          updateFilterButtons();
          updateList();
        }
      }, `第 ${s} 會期`);
      filterContainer.appendChild(sBtn);
    }
  }

  function updateList() {
    listContainer.innerHTML = '';

    const filtered = selectedSession === null
      ? allMembers
      : allMembers.filter(m => m.sessions.includes(selectedSession));

    const convenors = filtered.filter(m => m.isConvenor);
    const regulars = filtered.filter(m => !m.isConvenor);

    // 1. 召集委員區塊 (置頂)
    if (convenors.length > 0) {
      const convGroup = createElement('div', { class: 'committee-members-group' }, [
        createElement('div', { class: 'committee-members-group-title' }, [
          createElement('span', {}, '召集委員 (Convenors)'),
          createElement('span', { class: 'convenor-badge' }, `${convenors.length} 名`)
        ]),
        createElement('div', { class: 'committee-member-grid' }, convenors.map(m => renderMemberCard(m, term)))
      ]);
      listContainer.appendChild(convGroup);
    }

    // 2. 全體委員區塊
    const regGroup = createElement('div', { class: 'committee-members-group' }, [
      createElement('div', { class: 'committee-members-group-title' }, [
        createElement('span', {}, '委員會委員 (Members)'),
        createElement('span', { class: 'committee-section-count' }, `${regulars.length} 名`)
      ]),
      createElement('div', { class: 'committee-member-grid' }, regulars.map(m => renderMemberCard(m, term)))
    ]);
    listContainer.appendChild(regGroup);
  }

  updateFilterButtons();
  updateList();

  container.appendChild(filterContainer);
  container.appendChild(listContainer);
}

function renderMemberCard(memberData, term) {
  const leg = memberData.legislator;
  const pInfo = getPartyInfo(leg.party);

  const card = createElement('a', {
    href: `#/term/${term}/legislator/${encodeURIComponent(leg.name)}`,
    class: `committee-member-card ${memberData.isConvenor ? 'is-convenor' : ''}`
  });

  const photo = createElement('img', {
    src: leg.picUrl || 'static/images/placeholder-male.svg',
    alt: leg.name,
    class: 'committee-member-photo',
    onerror: (e) => { e.target.src = 'static/images/placeholder-male.svg'; }
  });
  card.appendChild(photo);

  const info = createElement('div', { class: 'committee-member-info' }, [
    createElement('div', { style: 'display: flex; align-items: center; gap: 4px;' }, [
      createElement('span', { class: 'committee-member-name' }, leg.name),
      memberData.isConvenor ? createElement('span', { class: 'convenor-badge' }, '召委') : null
    ].filter(Boolean)),
    createElement('div', { class: 'committee-member-party' }, [
      createElement('span', {
        class: 'tag',
        style: `font-size: 10px; color: ${pInfo.textColor}; background-color: ${pInfo.badgeBg}; border-color: ${pInfo.color}33;`
      }, leg.party || '無黨籍'),
      createElement('span', { style: 'color: var(--color-text-muted); font-size: 11px;' }, leg.areaName || '')
    ]),
    createElement('div', { class: 'committee-member-sessions' },
      `參與會期：${memberData.sessions.map(s => `S${s}`).join(', ')}`
    )
  ]);
  card.appendChild(info);

  return card;
}

// === Tab 2: 審查法律提案分頁 ===
async function renderBillsTab(container, committeeName, term) {
  let currentPage = 1;
  const limit = 15;

  const headerNotice = createElement('div', { class: 'notice-box', style: 'margin-bottom: var(--space-3);' }, [
    createElement('div', { class: 'notice-box-title' }, '審查法案定義說明'),
    createElement('div', {},
      `此處列出由立法院院會正式決議「交付 ${committeeName} 審查」（含主審與聯席審查）之法律提案，為本委員會法定審查權責，與委員個人之提案倡議有別。`
    )
  ]);
  container.appendChild(headerNotice);

  const contentBox = createElement('div');
  container.appendChild(contentBox);

  async function loadBills(page) {
    contentBox.innerHTML = '<div class="empty-state"><p>正在檢索交付本委員會審查之法律提案...</p></div>';

    try {
      const res = await api.getCommitteeBills(term, committeeName, page, limit);
      const bills = res.bills || [];
      const total = res.total || 0;
      const totalPages = Math.ceil(total / limit) || 1;

      contentBox.innerHTML = '';

      if (bills.length === 0) {
        contentBox.appendChild(createElement('div', { class: 'empty-state' }, [
          createElement('div', { class: 'empty-title' }, '查無交付審查之法律案紀錄')
        ]));
        return;
      }

      // Stats
      contentBox.appendChild(createElement('div', {
        style: 'font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-bottom: 8px; display: flex; justify-content: space-between;'
      }, [
        createElement('span', {}, `交付審查法案總計：${total} 筆`),
        createElement('span', {}, `第 ${page} 頁 ｜ 共 ${totalPages} 頁`)
      ]));

      // Bills Table
      const table = createElement('table', { class: 'data-table', style: 'width: 100%;' }, [
        createElement('thead', {}, [
          createElement('tr', {}, [
            createElement('th', { style: 'width: 130px;' }, '議案編號'),
            createElement('th', {}, '法律案名稱'),
            createElement('th', { style: 'width: 90px;' }, '審查狀態'),
            createElement('th', { style: 'width: 100px;' }, '進度日期')
          ])
        ]),
        createElement('tbody', {}, bills.map(b => {
          const bNo = b['議案編號'] || '';
          return createElement('tr', {}, [
            createElement('td', { style: 'font-family: var(--font-family-mono); font-size: 11px;' }, bNo),
            createElement('td', {}, [
              createElement('a', {
                href: `#/term/${term}/bill/${bNo}`,
                style: 'font-weight: 600; color: var(--color-primary); text-decoration: none; display: block; line-height: 1.4;'
              }, b['議案名稱'] || '法律案'),
              createElement('div', { style: 'font-size: 11px; color: var(--color-text-muted); margin-top: 2px;' },
                `提案人：${(b['提案人'] && b['提案人'].join('、')) || b['提案單位/提案委員'] || '—'}`
              )
            ]),
            createElement('td', {}, [
              createElement('span', { class: 'tag' }, b['議案狀態'] || '審查中')
            ]),
            createElement('td', { style: 'font-family: var(--font-family-mono); font-size: 11px;' },
              formatDate(b['最新進度日期'] || b['提案日期']) || '—'
            )
          ]);
        }))
      ]);
      contentBox.appendChild(table);

      // Pagination
      if (totalPages > 1) {
        const pag = createElement('div', { class: 'pagination', style: 'margin-top: 14px; display: flex; gap: 8px; justify-content: center;' }, [
          createElement('button', {
            class: 'btn btn-sm',
            disabled: page <= 1,
            onclick: () => { currentPage--; loadBills(currentPage); }
          }, '← 上一頁'),
          createElement('span', { style: 'display: flex; align-items: center; font-size: var(--font-size-xs);' }, `${page} / ${totalPages}`),
          createElement('button', {
            class: 'btn btn-sm',
            disabled: page >= totalPages,
            onclick: () => { currentPage++; loadBills(currentPage); }
          }, '下一頁 →')
        ]);
        contentBox.appendChild(pag);
      }
    } catch (err) {
      console.error('[CommitteeDetail] Failed to load bills:', err);
      contentBox.innerHTML = `<div class="empty-state"><div class="empty-title">檢索法案失敗</div><div class="empty-desc">${err.message}</div></div>`;
    }
  }

  loadBills(currentPage);
}

// === Tab 3: 審查會議與議程分頁 ===
async function renderMeetsTab(container, committeeId, term) {
  let currentPage = 1;
  const limit = 15;

  const contentBox = createElement('div');
  container.appendChild(contentBox);

  async function loadMeets(page) {
    contentBox.innerHTML = '<div class="empty-state"><p>正在檢索委員會全體審查會議...</p></div>';

    try {
      const res = await api.getCommitteeMeets(term, committeeId, page, limit);
      const meets = res.meets || [];
      const total = res.total || 0;
      const totalPages = Math.ceil(total / limit) || 1;

      contentBox.innerHTML = '';

      if (meets.length === 0) {
        contentBox.appendChild(createElement('div', { class: 'empty-state' }, [
          createElement('div', { class: 'empty-title' }, '查無本屆委員會會議紀錄')
        ]));
        return;
      }

      // Stats
      contentBox.appendChild(createElement('div', {
        style: 'font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-bottom: 8px; display: flex; justify-content: space-between;'
      }, [
        createElement('span', {}, `審查會議總計：${total} 場次`),
        createElement('span', {}, `第 ${page} 頁 ｜ 共 ${totalPages} 頁`)
      ]));

      // Meets List
      const listEl = createElement('div', { style: 'display: flex; flex-direction: column; gap: 8px;' });

      for (const m of meets) {
        const ynet = (m['議事網資料'] && m['議事網資料'][0]) || {};
        const convenor = ynet['召集人'] || '';
        const agenda = ynet['內容'] || '';
        const location = ynet['地點'] || '立法院會議室';
        const dateStr = (m['日期'] && m['日期'][0]) ? formatDate(m['日期'][0]) : '—';

        const item = createElement('div', {
          style: 'background-color: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 10px 14px;'
        }, [
          createElement('div', { style: 'display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 4px;' }, [
            createElement('div', { style: 'font-size: var(--font-size-sm); font-weight: 700; color: var(--color-text); line-height: 1.4;' },
              m['會議標題'] || m.name || '委員會會議'
            ),
            createElement('span', { class: 'tag' }, dateStr)
          ]),
          createElement('div', { style: 'font-size: 11px; color: var(--color-text-secondary); display: flex; gap: 12px; margin-bottom: 6px;' }, [
            createElement('span', {}, `開會地點：${location}`),
            convenor ? createElement('span', { style: 'color: var(--color-primary); font-weight: 600;' }, `當日召集人：${convenor}`) : null
          ].filter(Boolean)),
          agenda ? createElement('div', {
            style: 'font-size: 11px; color: var(--color-text-muted); line-height: 1.5; background-color: var(--color-bg-subtle); padding: 6px 8px; border-radius: var(--radius-sm); border-left: 2px solid var(--color-border-dark); white-space: pre-line;'
          }, agenda.length > 250 ? agenda.slice(0, 250) + '…' : agenda) : null
        ]);

        listEl.appendChild(item);
      }

      contentBox.appendChild(listEl);

      // Pagination
      if (totalPages > 1) {
        const pag = createElement('div', { class: 'pagination', style: 'margin-top: 14px; display: flex; gap: 8px; justify-content: center;' }, [
          createElement('button', {
            class: 'btn btn-sm',
            disabled: page <= 1,
            onclick: () => { currentPage--; loadMeets(currentPage); }
          }, '← 上一頁'),
          createElement('span', { style: 'display: flex; align-items: center; font-size: var(--font-size-xs);' }, `${page} / ${totalPages}`),
          createElement('button', {
            class: 'btn btn-sm',
            disabled: page >= totalPages,
            onclick: () => { currentPage++; loadMeets(currentPage); }
          }, '下一頁 →')
        ]);
        contentBox.appendChild(pag);
      }
    } catch (err) {
      console.error('[CommitteeDetail] Failed to load meets:', err);
      contentBox.innerHTML = `<div class="empty-state"><div class="empty-title">檢索會議失敗</div><div class="empty-desc">${err.message}</div></div>`;
    }
  }

  loadMeets(currentPage);
}
