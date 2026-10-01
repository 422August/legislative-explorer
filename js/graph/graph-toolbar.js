// js/graph/graph-toolbar.js
import { createElement, debounce } from '../utils.js';
import { api } from '../api.js';
import { TERM_DATES } from '../constants.js';
import { RELATION_TYPES } from './graph-state.js';

export class GraphToolbar {
  constructor(containerElement, graphState, graphData, options = {}) {
    this.container = containerElement;
    this.state = graphState;
    this.data = graphData;
    this.options = options;
    this.statCountEl = null;
    this.searchResultsEl = null;
  }

  render() {
    this.container.innerHTML = '';
    const filters = this.state.getState().filters;
    const currentTerm = this.state.getState().term || 11;

    const toolbar = createElement('div', { class: 'query-toolbar graph-toolbar' });

    // 1. 搜尋群組
    const searchWrapper = createElement('div', { class: 'query-group graph-search-group', style: 'position: relative;' });
    const searchInput = createElement('input', {
      type: 'text',
      class: 'query-input',
      placeholder: '搜尋委員姓名、法案名稱…',
      style: 'min-width: 200px;'
    });

    this.searchResultsEl = createElement('div', { class: 'graph-search-results', style: 'display: none;' });

    const debouncedSearch = debounce(async (query) => {
      await this.handleSearch(query);
    }, 250);

    searchInput.addEventListener('input', (e) => {
      debouncedSearch(e.target.value.trim());
    });

    // 點擊外部關閉搜尋結果
    document.addEventListener('click', (e) => {
      if (!searchWrapper.contains(e.target)) {
        this.hideSearchResults();
      }
    });

    searchWrapper.appendChild(searchInput);
    searchWrapper.appendChild(this.searchResultsEl);
    toolbar.appendChild(searchWrapper);

    // 2. 屆次選擇
    const termGroup = createElement('div', { class: 'query-group' }, [
      createElement('label', { class: 'query-label' }, '屆別'),
      createElement('select', {
        class: 'query-select',
        onchange: (e) => {
          const val = parseInt(e.target.value);
          this.state.state.term = val;
          this.state.updateFilters({ term: val });
          if (this.options.onTermChange) this.options.onTermChange(val);
        }
      }, TERM_DATES.map(t => {
        const opt = createElement('option', { value: t.term }, `第 ${t.term} 屆 (${t.years})`);
        if (t.term === currentTerm) opt.selected = true;
        return opt;
      }))
    ]);
    toolbar.appendChild(termGroup);

    // 3. 關係篩選核取方塊
    const filterGroup = createElement('div', { class: 'query-group graph-filter-types' }, [
      createElement('span', { class: 'query-label' }, '維度'),
      this.createCheckbox('提案', RELATION_TYPES.PROPOSED, filters.relationTypes),
      this.createCheckbox('連署', RELATION_TYPES.COSIGNED, filters.relationTypes),
      this.createCheckbox('委員會', RELATION_TYPES.SERVED_ON, filters.relationTypes),
      this.createCheckbox('會議', RELATION_TYPES.ATTENDED, filters.relationTypes),
      this.createCheckbox('質詢', RELATION_TYPES.QUESTIONED, filters.relationTypes)
    ]);
    toolbar.appendChild(filterGroup);

    // 4. 深度控制 (1 / 2 / 3)
    const depthGroup = createElement('div', { class: 'query-group' }, [
      createElement('span', { class: 'query-label' }, '層數'),
      createElement('div', { class: 'graph-depth-btns' }, [1, 2, 3].map(d => {
        return createElement('button', {
          type: 'button',
          class: `btn btn-sm ${filters.maxDepth === d ? 'btn-primary' : ''}`,
          onclick: (e) => {
            toolbar.querySelectorAll('.graph-depth-btns .btn').forEach(b => b.classList.remove('btn-primary'));
            e.target.classList.add('btn-primary');
            this.state.updateFilters({ maxDepth: d });
          }
        }, `${d}階`);
      }))
    ]);
    toolbar.appendChild(depthGroup);

    // 5. 節點上限輸入
    const limitGroup = createElement('div', { class: 'query-group' }, [
      createElement('span', { class: 'query-label' }, '上限'),
      createElement('input', {
        type: 'number',
        class: 'query-input',
        min: '15',
        max: '150',
        step: '5',
        value: String(filters.maxNodes || 50),
        style: 'width: 60px; padding: 4px 6px;',
        onchange: (e) => {
          const val = Math.max(10, Math.min(200, parseInt(e.target.value) || 50));
          e.target.value = val;
          this.state.updateFilters({ maxNodes: val });
        }
      })
    ]);
    toolbar.appendChild(limitGroup);

    // 6. 右側統計與快捷鍵
    this.statCountEl = createElement('div', { class: 'query-count-stat' }, `節點：${this.state.getNodeCount()} / ${filters.maxNodes}`);
    toolbar.appendChild(this.statCountEl);

    // 7. 置中與重置按鈕
    const actionGroup = createElement('div', { class: 'query-group', style: 'margin-left: 8px;' }, [
      createElement('button', {
        type: 'button',
        class: 'btn btn-sm',
        title: '置中畫布 (快速鍵: 0)',
        onclick: () => {
          if (this.options.onCenter) this.options.onCenter();
        }
      }, '置中'),
      createElement('button', {
        type: 'button',
        class: 'btn btn-sm',
        title: '重置所有展開',
        onclick: () => {
          if (this.options.onReset) this.options.onReset();
        }
      }, '重置')
    ]);
    toolbar.appendChild(actionGroup);

    this.container.appendChild(toolbar);
  }

  createCheckbox(label, relType, activeSet) {
    const isChecked = activeSet.has(relType);
    const cb = createElement('input', {
      type: 'checkbox',
      checked: isChecked,
      onchange: (e) => {
        if (e.target.checked) activeSet.add(relType);
        else activeSet.delete(relType);
        this.state.updateFilters({ relationTypes: new Set(activeSet) });
      }
    });

    return createElement('label', { class: 'graph-checkbox-label' }, [
      cb,
      createElement('span', {}, label)
    ]);
  }

  async handleSearch(query) {
    if (!query || query.length < 1) {
      this.hideSearchResults();
      return;
    }

    const term = this.state.getState().term || 11;
    this.searchResultsEl.innerHTML = '<div class="graph-search-loading">搜尋中…</div>';
    this.searchResultsEl.style.display = 'block';

    try {
      const results = [];

      // 1. 本地委員快速比對
      const legislators = await api.getTermLegislators(term);
      const matchedLegs = legislators.filter(l => l.name.includes(query) || (l.party && l.party.includes(query))).slice(0, 5);
      for (const l of matchedLegs) {
        results.push({
          type: 'legislator',
          title: l.name,
          desc: `${l.party || '無黨籍'} ｜ ${l.areaName || ''}`,
          action: () => {
            this.hideSearchResults();
            if (this.options.onFocusChange) {
              this.options.onFocusChange('legislator', l.name);
            }
          }
        });
      }

      // 2. 議案搜尋 (若為數字或字數足夠)
      if (query.length >= 2 || /^\d+$/.test(query)) {
        const billRes = await api.searchBills({ query, term, limit: 5 });
        const bills = billRes.bills || [];
        for (const b of bills) {
          results.push({
            type: 'bill',
            title: b['議案名稱'] || '法律案',
            desc: `議案編號：${b['議案編號']} ｜ ${b['議案狀態'] || ''}`,
            action: () => {
              this.hideSearchResults();
              if (this.options.onFocusChange) {
                this.options.onFocusChange('bill', b['議案編號']);
              }
            }
          });
        }
      }

      if (results.length === 0) {
        this.searchResultsEl.innerHTML = '<div class="graph-search-empty">查無符合的人物或議案</div>';
        return;
      }

      this.searchResultsEl.innerHTML = '';
      for (const r of results) {
        const item = createElement('div', { class: 'graph-search-item' }, [
          createElement('div', { class: 'search-item-badge' }, r.type === 'legislator' ? '委員' : '法案'),
          createElement('div', { class: 'search-item-info' }, [
            createElement('div', { class: 'search-item-title' }, r.title),
            createElement('div', { class: 'search-item-desc' }, r.desc)
          ])
        ]);
        item.addEventListener('click', r.action);
        this.searchResultsEl.appendChild(item);
      }
    } catch (err) {
      console.error('[GraphToolbar] Search error:', err);
      this.searchResultsEl.innerHTML = '<div class="graph-search-empty">搜尋逾時或發生錯誤</div>';
    }
  }

  hideSearchResults() {
    if (this.searchResultsEl) {
      this.searchResultsEl.style.display = 'none';
      this.searchResultsEl.innerHTML = '';
    }
  }

  updateNodeCount(count, max) {
    if (this.statCountEl) {
      this.statCountEl.textContent = `節點：${count} / ${max}`;
    }
  }
}
