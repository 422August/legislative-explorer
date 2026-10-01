// js/pages/committee-list.js
import { createElement, extractCommitteeMembers, getPartyInfo } from '../utils.js';
import { api } from '../api.js';
import { TERM_DATES, COMMITTEES_CURRENT, COMMITTEES_SPECIAL, COMMITTEES_HISTORICAL } from '../constants.js';

export async function renderCommitteeList({ term = 11 } = {}) {
  const currentTerm = parseInt(term, 10) || 11;
  const root = createElement('div', { class: 'committee-page' });

  // 1. 麵包屑導覽
  const breadcrumb = createElement('nav', { class: 'breadcrumb', 'aria-label': '路徑導覽' }, [
    createElement('a', { href: '#/' }, '歷屆索引目錄'),
    createElement('span', { class: 'breadcrumb-separator' }, '/'),
    createElement('a', { href: `#/term/${currentTerm}` }, `第 ${currentTerm} 屆名冊`),
    createElement('span', { class: 'breadcrumb-separator' }, '/'),
    createElement('span', { class: 'breadcrumb-current' }, '委員會組織索引')
  ]);
  root.appendChild(breadcrumb);

  // 2. 標題與說明
  const header = createElement('div', { class: 'committee-overview-header' }, [
    createElement('div', {}, [
      createElement('h1', { style: 'font-size: var(--font-size-xl); font-weight: 700; margin: 0 0 4px 0;' },
        `中華民國立法院 第 ${currentTerm} 屆委員會索引名冊`
      ),
      createElement('div', { style: 'font-size: var(--font-size-xs); color: var(--color-text-secondary);' },
        '依據《立法院各委員會組織法》，委員會負責審查院會交付之法律議案、預算決算及部會業務報告，為國會實質審查樞紐。'
      )
    ]),
    createElement('div', { style: 'display: flex; gap: 8px; align-items: center;' }, [
      createElement('select', {
        class: 'query-select',
        onchange: (e) => {
          window.location.hash = `#/term/${e.target.value}/committees`;
        }
      }, TERM_DATES.map(t => {
        const opt = createElement('option', { value: t.term }, `第 ${t.term} 屆 (${t.years})`);
        if (t.term === currentTerm) opt.selected = true;
        return opt;
      })),
      createElement('a', {
        href: `#/term/${currentTerm}/graph`,
        class: 'btn btn-sm btn-primary',
        style: 'text-decoration: none;'
      }, '在關聯圖中檢視組織網絡 ↗')
    ])
  ]);
  root.appendChild(header);

  // 3. 處理第 2、3 屆無委員會資料的提示
  if (currentTerm === 2 || currentTerm === 3) {
    root.appendChild(createElement('div', { class: 'committee-history-warning' }, [
      createElement('strong', {}, `【官方資料庫限制提示】`),
      createElement('div', { style: 'margin-top: 4px;' },
        `立法院開放資料庫未收錄第 ${currentTerm} 屆（${currentTerm === 2 ? '1993–1996' : '1996–1999'}）立法委員之常設委員會分配名冊。本系統目前完整支援第 1 屆歷史名冊，以及第 4 屆至第 11 屆現行國會委員會公報。`
      ),
      createElement('div', { style: 'margin-top: 8px;' }, [
        createElement('a', { href: `#/term/${currentTerm}`, class: 'btn btn-sm' }, `返回第 ${currentTerm} 屆立委全體名冊`)
      ])
    ]));
    return root;
  }

  // 4. 取得該屆全體立委名單以反向統計成員
  let legislators = [];
  try {
    legislators = await api.getTermLegislators(currentTerm);
  } catch (err) {
    console.warn('[CommitteeList] Failed to load term legislators:', err);
  }

  // 決定使用現行制 (第 7–11 屆) 或舊制 (第 1–6 屆)
  const isPostReform = currentTerm >= 7;
  const standingCommittees = isPostReform
    ? COMMITTEES_CURRENT
    : (currentTerm === 1 ? getTerm1Committees(legislators) : COMMITTEES_HISTORICAL.concat(COMMITTEES_CURRENT.filter(c => [15, 19, 20, 22, 23].includes(c.id))));

  // 5. 渲染常設委員會
  root.appendChild(createElement('div', { class: 'committee-section-title' }, [
    createElement('span', {}, isPostReform ? '常設委員會 (Standing Committees)' : '常設／歷史審查委員會'),
    createElement('span', { class: 'committee-section-count' }, `共 ${standingCommittees.length} 個委員會`)
  ]));

  const standingGrid = createElement('div', { class: 'committee-grid' });
  for (const comm of standingCommittees) {
    const card = renderCommitteeCard(comm, currentTerm, legislators);
    standingGrid.appendChild(card);
  }
  root.appendChild(standingGrid);

  // 6. 渲染特種委員會 (若非第1屆)
  if (currentTerm > 1) {
    root.appendChild(createElement('div', { class: 'committee-section-title', style: 'margin-top: var(--space-6);' }, [
      createElement('span', {}, '特種委員會 (Special Committees)'),
      createElement('span', { class: 'committee-section-count' }, `共 ${COMMITTEES_SPECIAL.length} 個委員會`)
    ]));

    const specialGrid = createElement('div', { class: 'committee-grid' });
    for (const comm of COMMITTEES_SPECIAL) {
      const card = renderCommitteeCard(comm, currentTerm, legislators);
      specialGrid.appendChild(card);
    }
    root.appendChild(specialGrid);
  }

  return root;
}

// 產生單一委員會卡片
function renderCommitteeCard(comm, term, legislators) {
  // 從立委名單中萃取本會成員
  const members = extractCommitteeMembers(legislators, comm.name);
  const memberCount = members.length;
  const convenors = members.filter(m => m.isConvenor).map(m => m.legislator.name);

  const card = createElement('a', {
    href: `#/term/${term}/committee/${encodeURIComponent(comm.name)}`,
    class: 'committee-card'
  });

  // Card Header
  card.appendChild(createElement('div', { class: 'committee-card-header' }, [
    createElement('span', { class: 'tag', style: 'font-size: 10px;' }, comm.category === 'special' ? '特種委員會' : '常設委員會'),
    createElement('span', { class: 'committee-card-code' }, `CODE: ${comm.id || '—'}`)
  ]));

  // Card Body
  const body = createElement('div', { class: 'committee-card-body' }, [
    createElement('div', { class: 'committee-card-name' }, comm.name),
    createElement('div', { class: 'committee-card-meta' }, [
      createElement('span', {}, `參與委員：${memberCount > 0 ? `${memberCount} 人` : '無登載紀錄'}`)
    ])
  ]);

  if (convenors.length > 0) {
    body.appendChild(createElement('div', { class: 'committee-card-convenors' },
      `本屆曾任召委：${convenors.slice(0, 3).join('、')}${convenors.length > 3 ? '等' : ''}`
    ));
  }

  body.appendChild(createElement('div', { class: 'committee-card-desc' },
    comm.desc || '審查立法院各項公報提案與行政部會業務報告。'
  ));

  card.appendChild(body);

  // Card Footer
  card.appendChild(createElement('div', { class: 'committee-card-footer' }, '檢視成員與審查法案公報 →'));

  return card;
}

// 動態自第 1 屆名冊中提取不重複的歷史委員會
function getTerm1Committees(legislators) {
  const commMap = new Map();
  for (const leg of legislators) {
    if (Array.isArray(leg.committee)) {
      for (const cStr of leg.committee) {
        const clean = cStr.replace(/^第\d+屆第\d+會期/, '').replace(/\(.*?\)/, '').trim();
        if (clean && clean.includes('委員會') && !commMap.has(clean)) {
          commMap.set(clean, {
            id: 'T1',
            name: clean,
            category: 'standing',
            desc: `第 1 屆萬年國會歷史委員會（${clean}）。`
          });
        }
      }
    }
  }
  return Array.from(commMap.values());
}
