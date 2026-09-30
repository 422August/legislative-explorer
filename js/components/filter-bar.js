// js/components/filter-bar.js
import { createElement, debounce } from '../utils.js';

export function createFilterBar({ parties = [], areas = [], totalCount = 0, onFilterChange }) {
  const state = {
    query: '',
    party: '',
    area: '',
    sort: 'name'
  };

  const container = createElement('div', { className: 'query-toolbar' });

  // Query Search Group
  const searchInput = createElement('input', {
    type: 'search',
    className: 'query-input',
    placeholder: '輸入委員姓名、選區或簡歷文字...',
    'aria-label': '關鍵字檢索',
    oninput: debounce((e) => {
      state.query = e.target.value.trim();
      notify();
    }, 200)
  });

  const searchGroup = createElement('div', { className: 'query-group', style: 'flex: 1 1 240px;' }, [
    createElement('span', { className: 'query-label', text: '檢索詞：' }),
    searchInput
  ]);

  // Party Filter Group
  const partySelect = createElement('select', {
    className: 'query-select',
    'aria-label': '政黨篩選',
    onchange: (e) => {
      state.party = e.target.value;
      notify();
    }
  }, [
    createElement('option', { value: '', text: '全部政黨' }),
    ...parties.map(p => createElement('option', { value: p, text: p }))
  ]);

  const partyGroup = createElement('div', { className: 'query-group' }, [
    createElement('span', { className: 'query-label', text: '政黨：' }),
    partySelect
  ]);

  // Area Filter Group
  const areaSelect = createElement('select', {
    className: 'query-select',
    'aria-label': '選區篩選',
    onchange: (e) => {
      state.area = e.target.value;
      notify();
    }
  }, [
    createElement('option', { value: '', text: '全部選區' }),
    ...areas.map(a => createElement('option', { value: a, text: a }))
  ]);

  const areaGroup = createElement('div', { className: 'query-group' }, [
    createElement('span', { className: 'query-label', text: '選區：' }),
    areaSelect
  ]);

  // Sort Filter Group
  const sortSelect = createElement('select', {
    className: 'query-select',
    'aria-label': '排序依據',
    onchange: (e) => {
      state.sort = e.target.value;
      notify();
    }
  }, [
    createElement('option', { value: 'name', text: '姓名筆劃' }),
    createElement('option', { value: 'party', text: '政黨別' }),
    createElement('option', { value: 'area', text: '選區別' })
  ]);

  const sortGroup = createElement('div', { className: 'query-group' }, [
    createElement('span', { className: 'query-label', text: '排序：' }),
    sortSelect
  ]);

  // Record Count
  const statEl = createElement('div', {
    className: 'query-count-stat',
    text: `共計 ${totalCount} 筆`
  });

  function notify() {
    if (typeof onFilterChange === 'function') {
      onFilterChange({ ...state });
    }
  }

  container.appendChild(searchGroup);
  if (parties.length > 1) container.appendChild(partyGroup);
  if (areas.length > 1) container.appendChild(areaGroup);
  container.appendChild(sortGroup);
  container.appendChild(statEl);

  return {
    element: container,
    updateCount: (count) => {
      statEl.textContent = `共計 ${count} 筆`;
    },
    reset: () => {
      searchInput.value = '';
      partySelect.value = '';
      areaSelect.value = '';
      sortSelect.value = 'name';
      state.query = '';
      state.party = '';
      state.area = '';
      state.sort = 'name';
    }
  };
}
