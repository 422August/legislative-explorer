// js/pages/meeting-list.js
import { api } from '../api.js';
import { getTermMeta, createElement } from '../utils.js';
import { createMeetingItem } from '../components/meeting-item.js';
import { createSkeletonList } from '../components/skeleton.js';
import { createPagination } from '../components/pagination.js';
import { showToast } from '../components/toast.js';

export async function renderMeetingList({ term }) {
  const t = parseInt(term, 10);
  const meta = getTermMeta(t);

  const container = createElement('div', { className: 'meeting-list-page' });

  // Breadcrumb
  const breadcrumb = createElement('nav', { className: 'breadcrumb', 'aria-label': '檢索路徑' }, [
    createElement('a', { href: '#/', text: '歷屆索引目錄' }),
    createElement('span', { className: 'breadcrumb-separator', text: '/' }),
    createElement('a', { href: `#/term/${t}`, text: `${meta.name}名冊` }),
    createElement('span', { className: 'breadcrumb-separator', text: '/' }),
    createElement('span', { text: '會議議程與事由' })
  ]);
  container.appendChild(breadcrumb);

  const header = createElement('div', { className: 'page-header' }, [
    createElement('h1', { className: 'page-title', text: `${meta.name} 會議議事錄檢索` }),
    createElement('p', {
      className: 'page-desc',
      text: `收錄立法院${meta.name}之全院院會、各常設委員會及聯席審查會議議程、事由與紀錄。`
    })
  ]);
  container.appendChild(header);

  const contentArea = createElement('div', { id: 'meetings-content' });
  contentArea.appendChild(createSkeletonList(6));
  container.appendChild(contentArea);

  async function loadPage(page = 1) {
    contentArea.innerHTML = '';
    contentArea.appendChild(createSkeletonList(6));

    try {
      const data = await api.getTermMeets(t, page, 20);
      contentArea.innerHTML = '';

      const meets = data.meets || [];
      if (meets.length === 0) {
        contentArea.appendChild(createElement('div', { className: 'empty-state' }, [
          createElement('div', { className: 'empty-title', text: '查無會議紀錄' }),
          createElement('div', { className: 'empty-desc', text: `在第 ${t} 屆資料庫中未檢索到會議記錄。` })
        ]));
        return;
      }

      const list = createElement('div', {});
      meets.forEach(m => list.appendChild(createMeetingItem(m)));
      contentArea.appendChild(list);

      const totalPages = data.total_page || Math.ceil((data.total || 0) / (data.limit || 20));
      const pag = createPagination({
        currentPage: page,
        totalPages,
        onPageChange: (newPage) => {
          loadPage(newPage);
          window.scrollTo({ top: 120, behavior: 'auto' });
        }
      });
      if (pag) contentArea.appendChild(pag);
    } catch (err) {
      console.error(err);
      showToast(`載入會議列表失敗：${err.message}`, 'error');
      contentArea.innerHTML = '';
      contentArea.appendChild(createElement('div', { className: 'empty-state' }, [
        createElement('div', { className: 'empty-title', text: '會議資料讀取錯誤' }),
        createElement('div', { className: 'empty-desc', text: err.message })
      ]));
    }
  }

  loadPage(1);

  return container;
}
