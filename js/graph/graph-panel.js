// js/graph/graph-panel.js
import { createElement, getPartyInfo, formatDate } from '../utils.js';
import { ENTITY_TYPES, RELATION_TYPES } from './graph-state.js';

export class GraphPanel {
  constructor(containerElement, graphState, graphData) {
    this.container = containerElement;
    this.state = graphState;
    this.data = graphData;
  }

  render() {
    this.container.innerHTML = '';
    const selectedId = this.state.state.selectedNodeId;

    if (!selectedId) {
      this.container.appendChild(this.renderEmptyState());
      return;
    }

    const entity = this.state.getEntity(selectedId);
    if (!entity) {
      this.container.appendChild(this.renderEmptyState());
      return;
    }

    let panelEl;
    switch (entity.type) {
      case ENTITY_TYPES.LEGISLATOR:
        panelEl = this.renderLegislatorPanel(entity);
        break;
      case ENTITY_TYPES.BILL:
        panelEl = this.renderBillPanel(entity);
        break;
      case ENTITY_TYPES.COMMITTEE:
        panelEl = this.renderCommitteePanel(entity);
        break;
      case ENTITY_TYPES.MEETING:
        panelEl = this.renderMeetingPanel(entity);
        break;
      case ENTITY_TYPES.INTERPELLATION:
        panelEl = this.renderInterpellationPanel(entity);
        break;
      default:
        panelEl = this.renderDefaultPanel(entity);
        break;
    }

    this.container.appendChild(panelEl);
  }

  renderEmptyState() {
    return createElement('div', { class: 'graph-panel-empty' }, [
      createElement('div', { class: 'graph-panel-header' }, '關聯檔案 ｜ EXPLORER'),
      createElement('div', { class: 'graph-panel-body', style: 'text-align: center; padding: 30px 15px;' }, [
        createElement('div', { style: 'font-size: 13px; color: var(--color-text-secondary); margin-bottom: 8px;' }, '點擊圖上任一節點'),
        createElement('div', { style: 'font-size: 12px; color: var(--color-text-muted); line-height: 1.6;' },
          '即可檢視實體公報檔案，並可依序展開主提案、連署、審查會議與質詢等多層次關聯。'
        )
      ])
    ]);
  }

  renderLegislatorPanel(entity) {
    const meta = entity.metadata || {};
    const term = meta.term || this.state.getState().term || 11;
    const name = meta.name || entity.label;
    const party = meta.party || '無黨籍';
    const pInfo = getPartyInfo(party);
    const isFocus = entity.id === this.state.state.focusEntityId;

    const panel = createElement('div', { class: 'graph-panel-content' });

    // Header
    panel.appendChild(
      createElement('div', { class: 'graph-panel-header' }, [
        createElement('span', {}, '委員檔案 ｜ MEMBER RECORD'),
        meta.hasLeft ? createElement('span', { class: 'tag tag-warning' }, '已離職') : null
      ].filter(Boolean))
    );

    // Body
    const body = createElement('div', { class: 'graph-panel-body' });

    // Profile card
    const profile = createElement('div', { class: 'graph-panel-profile' }, [
      createElement('div', { class: 'graph-panel-avatar' }, [
        createElement('img', {
          src: meta.picUrl || 'static/images/placeholder-male.svg',
          alt: name,
          onerror: (e) => { e.target.src = 'static/images/placeholder-male.svg'; }
        })
      ]),
      createElement('div', { class: 'graph-panel-meta' }, [
        createElement('div', { class: 'graph-panel-name' }, name),
        createElement('div', { style: 'display: flex; gap: 4px; margin-top: 2px;' }, [
          createElement('span', {
            class: 'tag',
            style: `color: ${pInfo.textColor}; background-color: ${pInfo.badgeBg}; border-color: ${pInfo.color}33;`
          }, party)
        ]),
        createElement('div', { style: 'font-size: 11px; color: var(--color-text-muted); margin-top: 4px;' },
          `第 ${term} 屆 ｜ ${meta.areaName || '選區'}`
        )
      ])
    ]);
    body.appendChild(profile);

    // 展開按鈕區塊
    const expandSection = createElement('div', { style: 'margin-top: 14px;' }, [
      createElement('div', { class: 'graph-section-title' }, '關聯維度展開'),

      // 1. 主提案
      this.createExpandButton({
        label: '主提案紀錄',
        count: Array.isArray(meta.proposeBills) ? meta.proposeBills.length : null,
        onExpand: () => this.data.expandLegislatorProposedBills(term, name)
      }),

      // 2. 連署提案
      this.createExpandButton({
        label: '連署提案紀錄',
        count: Array.isArray(meta.cosignBills) ? meta.cosignBills.length : null,
        onExpand: () => this.data.expandLegislatorCosignedBills(term, name)
      }),

      // 3. 會議出席
      this.createExpandButton({
        label: '出席審查會議',
        count: Array.isArray(meta.meets) ? meta.meets.length : null,
        onExpand: () => this.data.expandLegislatorMeetings(term, name)
      }),

      // 4. 質詢案件
      this.createExpandButton({
        label: '質詢案與答復',
        count: Array.isArray(meta.interpellations) ? meta.interpellations.length : null,
        onExpand: () => this.data.expandLegislatorInterpellations(term, name)
      })
    ]);
    body.appendChild(expandSection);

    // 操作動作區
    const actions = createElement('div', { class: 'graph-panel-actions' }, [
      !isFocus ? createElement('button', {
        class: 'btn btn-sm btn-primary',
        style: 'width: 100%; margin-bottom: 6px;',
        onclick: () => {
          this.data.loadLegislatorFocus(term, name);
        }
      }, '以此委員為焦點重新佈局') : null,
      createElement('a', {
        href: `#/term/${term}/legislator/${encodeURIComponent(name)}`,
        class: 'btn btn-sm',
        style: 'width: 100%; text-align: center;'
      }, '前往委員個人詳細公報 →')
    ].filter(Boolean));
    body.appendChild(actions);

    panel.appendChild(body);
    return panel;
  }

  renderBillPanel(entity) {
    const meta = entity.metadata || {};
    const billNo = meta.billNo || entity.id.split('::')[1];
    const isFocus = entity.id === this.state.state.focusEntityId;
    const term = meta.term || 11;

    const panel = createElement('div', { class: 'graph-panel-content' });

    // Header
    panel.appendChild(
      createElement('div', { class: 'graph-panel-header' }, [
        createElement('span', {}, '議案檔案 ｜ BILL RECORD'),
        meta.status ? createElement('span', { class: 'tag tag-primary' }, meta.status) : null
      ].filter(Boolean))
    );

    const body = createElement('div', { class: 'graph-panel-body' });

    // Bill Title
    body.appendChild(
      createElement('div', { style: 'font-size: 13px; font-weight: 700; color: var(--color-text); line-height: 1.5; margin-bottom: 8px;' },
        meta.fullTitle || entity.label
      )
    );

    // Metadata Key-Values
    const metaTable = createElement('table', { class: 'graph-mini-table' }, [
      createElement('tr', {}, [
        createElement('td', { class: 'td-label' }, '議案編號'),
        createElement('td', { class: 'td-value', style: 'font-family: var(--font-family-mono);' }, billNo)
      ]),
      createElement('tr', {}, [
        createElement('td', { class: 'td-label' }, '進度日期'),
        createElement('td', { class: 'td-value' }, formatDate(meta.date) || '—')
      ]),
      createElement('tr', {}, [
        createElement('td', { class: 'td-label' }, '提案人數'),
        createElement('td', { class: 'td-value' }, `${(meta.proposers && meta.proposers.length) || 0} 人`)
      ]),
      createElement('tr', {}, [
        createElement('td', { class: 'td-label' }, '連署人數'),
        createElement('td', { class: 'td-value' }, `${(meta.cosigners && meta.cosigners.length) || 0} 人`)
      ])
    ]);
    body.appendChild(metaTable);

    // 展開按鈕區塊
    const expandSection = createElement('div', { style: 'margin-top: 14px;' }, [
      createElement('div', { class: 'graph-section-title' }, '關聯人員展開'),

      // 展開連署人
      (meta.cosigners && meta.cosigners.length > 0) ? this.createExpandButton({
        label: `展開連署委員 (${meta.cosigners.length}人)`,
        onExpand: () => this.data.expandBillCosigners(entity)
      }) : null
    ].filter(Boolean));
    body.appendChild(expandSection);

    // Actions
    const actions = createElement('div', { class: 'graph-panel-actions' }, [
      !isFocus ? createElement('button', {
        class: 'btn btn-sm btn-primary',
        style: 'width: 100%; margin-bottom: 6px;',
        onclick: () => {
          this.data.loadBillFocus(billNo, term);
        }
      }, '以此議案為焦點重新佈局') : null,
      createElement('a', {
        href: `#/term/${term}/bill/${billNo}`,
        class: 'btn btn-sm',
        style: 'width: 100%; text-align: center;'
      }, '檢視議案審議全文與對照表 →')
    ].filter(Boolean));
    body.appendChild(actions);

    panel.appendChild(body);
    return panel;
  }

  renderCommitteePanel(entity) {
    const meta = entity.metadata || {};
    const panel = createElement('div', { class: 'graph-panel-content' }, [
      createElement('div', { class: 'graph-panel-header' }, '委員會 ｜ COMMITTEE'),
      createElement('div', { class: 'graph-panel-body' }, [
        createElement('div', { style: 'font-size: 14px; font-weight: 700; margin-bottom: 6px;' }, entity.label),
        createElement('div', { style: 'font-size: 12px; color: var(--color-text-secondary); line-height: 1.6;' },
          meta.fullName || `第 ${meta.term || 11} 屆委員會參與紀錄`
        )
      ])
    ]);
    return panel;
  }

  renderMeetingPanel(entity) {
    const meta = entity.metadata || {};
    const panel = createElement('div', { class: 'graph-panel-content' }, [
      createElement('div', { class: 'graph-panel-header' }, '審查會議 ｜ PROCEEDING'),
      createElement('div', { class: 'graph-panel-body' }, [
        createElement('div', { style: 'font-size: 13px; font-weight: 700; margin-bottom: 6px;' }, meta.title || entity.label),
        createElement('div', { style: 'font-size: 12px; color: var(--color-text-secondary); line-height: 1.6;' }, [
          createElement('div', {}, `會議代碼：${meta.meetingCode || '—'}`),
          createElement('div', {}, `會議種類：${meta.type || '常態會議'}`),
          createElement('div', {}, `開會日期：${(meta.dates && meta.dates.join('、')) || '—'}`)
        ])
      ])
    ]);
    return panel;
  }

  renderInterpellationPanel(entity) {
    const meta = entity.metadata || {};
    const panel = createElement('div', { class: 'graph-panel-content' }, [
      createElement('div', { class: 'graph-panel-header' }, '質詢檔案 ｜ INTERPELLATION'),
      createElement('div', { class: 'graph-panel-body' }, [
        createElement('div', { style: 'font-size: 13px; font-weight: 700; margin-bottom: 6px;' }, meta.subject || entity.label),
        createElement('div', { style: 'font-size: 12px; color: var(--color-text-muted); margin-bottom: 10px;' },
          `刊登日期：${formatDate(meta.date)} ｜ 字號：${meta.queryNo || '—'}`
        ),
        meta.response ? createElement('div', {
          style: 'padding: 8px 10px; background-color: var(--color-bg-subtle); border-left: 3px solid var(--color-warning); font-size: 12px; line-height: 1.6; max-height: 180px; overflow-y: auto;'
        }, [
          createElement('strong', {}, '行政院答復要旨：'),
          createElement('p', { style: 'margin-top: 4px;' }, meta.response.slice(0, 200) + '…')
        ]) : null
      ].filter(Boolean))
    ]);
    return panel;
  }

  renderDefaultPanel(entity) {
    const panel = createElement('div', { class: 'graph-panel-content' }, [
      createElement('div', { class: 'graph-panel-header' }, '實體詳細資料'),
      createElement('div', { class: 'graph-panel-body' }, [
        createElement('div', { style: 'font-weight: 700;' }, entity.label),
        createElement('div', { style: 'font-size: 12px; color: var(--color-text-secondary); margin-top: 4px;' }, entity.sublabel)
      ])
    ]);
    return panel;
  }

  createExpandButton({ label, count, onExpand }) {
    let isLoading = false;
    const countText = (count !== null && count !== undefined) ? ` (${count})` : '';

    const btn = createElement('button', {
      class: 'graph-expand-btn',
      onclick: async () => {
        if (isLoading) return;
        isLoading = true;
        btn.classList.add('loading');
        btn.textContent = '檢索中…';
        try {
          await onExpand();
        } catch (err) {
          console.error('[GraphPanel] Expand error:', err);
        } finally {
          isLoading = false;
          btn.classList.remove('loading');
          btn.innerHTML = `<span>${label}</span><span class="count">${countText || '✓'}</span>`;
        }
      }
    }, [
      createElement('span', {}, label),
      countText ? createElement('span', { class: 'count' }, countText) : null
    ].filter(Boolean));

    return btn;
  }
}
