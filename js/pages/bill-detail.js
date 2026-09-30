// js/pages/bill-detail.js
import { api } from '../api.js';
import { getTermMeta, createElement, formatDate, getAttachmentInfo, normalizeAttachmentUrl } from '../utils.js';
import { showToast } from '../components/toast.js';

export async function renderBillDetail({ term, billNo }) {
  const t = parseInt(term, 10);
  const meta = getTermMeta(t);

  const container = createElement('div', { className: 'bill-detail-page' });

  // Breadcrumb
  const breadcrumb = createElement('nav', { className: 'breadcrumb', 'aria-label': '檢索路徑' }, [
    createElement('a', { href: '#/', text: '歷屆索引目錄' }),
    createElement('span', { className: 'breadcrumb-separator', text: '/' }),
    createElement('a', { href: `#/term/${t}`, text: `${meta.name}名冊` }),
    createElement('span', { className: 'breadcrumb-separator', text: '/' }),
    createElement('span', { text: `議案編號：${billNo}` })
  ]);
  container.appendChild(breadcrumb);

  // Loading skeleton
  const placeholder = createElement('div', { className: 'skeleton-card', style: 'height: 300px; margin-bottom: 20px;' });
  container.appendChild(placeholder);

  try {
    const res = await api.getBillDetail(billNo);
    const bill = res.data || res;
    placeholder.remove();
    renderBillContent(container, bill, t, billNo);
  } catch (err) {
    console.error(err);
    placeholder.remove();
    showToast(`載入議案詳情失敗：${err.message}`, 'error');
    container.appendChild(createElement('div', { className: 'empty-state' }, [
      createElement('div', { className: 'empty-title', text: '查無該議案審議資料' }),
      createElement('div', { className: 'empty-desc', text: err.message }),
      createElement('div', { style: 'margin-top: 12px;' }, [
        createElement('a', { href: `#/term/${t}`, className: 'btn btn-primary btn-sm', text: `返回 ${meta.name} 名冊` })
      ])
    ]));
  }

  return container;
}

async function renderBillContent(container, bill, term, billNo) {
  const billName = bill['議案名稱'] || bill.billName || '立法院審議議案';
  const rawDate = bill['最新進度日期'] || bill['提案日期'] || '';
  const dateStr = formatDate(rawDate);
  const proposers = bill['提案人'] || [];
  const cosigners = bill['連署人'] || [];
  const billStatus = bill['議案狀態'] || bill['最新進度'] || '排入院會審查';
  const sessionInfo = bill['會議代碼:str'] || bill['會議名稱'] || (bill['會期'] ? `第 ${bill['會期']} 會期` : '-');

  // Official Bill Metadata Sheet
  const sheet = createElement('div', { className: 'dossier-sheet' });

  // Header Bar
  const headerBar = createElement('div', { className: 'dossier-header-bar' }, [
    createElement('span', { text: `立法院議案審議資料表 ｜ 議案字號：${billNo}` }),
    createElement('span', { style: 'font-family: var(--font-family-mono);', text: `審查狀態：${billStatus}` })
  ]);
  sheet.appendChild(headerBar);

  // Metadata Table
  const table = createElement('table', { className: 'dossier-data-table', style: 'padding: var(--space-4);' });
  const tbody = createElement('tbody');

  // Row 1: 議案名稱
  tbody.appendChild(createElement('tr', {}, [
    createElement('th', { text: '議案名稱' }),
    createElement('td', { colSpan: '3', style: 'font-weight: 700; font-size: 1.0625rem; line-height: 1.4;', text: billName })
  ]));

  // Row 2: 議案編號 & 日期
  tbody.appendChild(createElement('tr', {}, [
    createElement('th', { text: '議案編號' }),
    createElement('td', { style: 'font-family: var(--font-family-mono);', text: billNo }),
    createElement('th', { text: '最新進度日期' }),
    createElement('td', { style: 'font-family: var(--font-family-mono);', text: dateStr || '-' })
  ]));

  // Row 3: 會期/會議次別 & 目前狀態
  tbody.appendChild(createElement('tr', {}, [
    createElement('th', { text: '關聯會期/會議' }),
    createElement('td', { text: sessionInfo }),
    createElement('th', { text: '審議程序狀態' }),
    createElement('td', { text: billStatus })
  ]));

  // Row 4: 提案人
  const propTd = createElement('td', { colSpan: '3' });
  if (Array.isArray(proposers) && proposers.length > 0) {
    const list = createElement('div', { style: 'display: flex; flex-wrap: wrap; gap: 8px;' });
    proposers.forEach(p => {
      list.appendChild(createElement('a', {
        href: `#/term/${term}/legislator/${encodeURIComponent(p)}`,
        style: 'color: var(--color-primary); font-weight: 600;',
        text: p
      }));
    });
    propTd.appendChild(list);
  } else {
    propTd.textContent = bill['提案單位/提案人'] || '本院委員提案';
  }
  tbody.appendChild(createElement('tr', {}, [
    createElement('th', { text: '主提案人' }),
    propTd
  ]));

  // Row 5: 連署人
  const cosignTd = createElement('td', { colSpan: '3' });
  if (Array.isArray(cosigners) && cosigners.length > 0) {
    const list = createElement('div', { style: 'display: flex; flex-wrap: wrap; gap: 6px; line-height: 1.6;' });
    cosigners.forEach((c, idx) => {
      list.appendChild(createElement('a', {
        href: `#/term/${term}/legislator/${encodeURIComponent(c)}`,
        style: 'color: var(--color-text-secondary);',
        text: c
      }));
      if (idx < cosigners.length - 1) {
        list.appendChild(document.createTextNode('、'));
      }
    });
    cosignTd.appendChild(list);
  } else {
    cosignTd.textContent = '無單獨連署人名冊記載或為黨團直接提案';
  }
  tbody.appendChild(createElement('tr', {}, [
    createElement('th', { text: '連署提案人' }),
    cosignTd
  ]));

  // Row 6: 附件與審查歷程下載
  const attachments = bill['相關附件'] || [];
  if (attachments.length > 0 || bill['url']) {
    const attTd = createElement('td', { colSpan: '3' });
    const attRow = createElement('div', { style: 'display: flex; gap: 8px; flex-wrap: wrap;' });
    
    attachments.forEach(att => {
      const info = getAttachmentInfo(att);
      if (info.url) {
        attRow.appendChild(createElement('a', {
          href: info.url,
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'btn btn-sm',
          text: info.label
        }));
      }
    });

    if (bill['url']) {
      const officialUrl = normalizeAttachmentUrl(bill['url']);
      attRow.appendChild(createElement('a', {
        href: officialUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'btn btn-sm',
        text: '立法院議政網審議流程'
      }));
    }

    attTd.appendChild(attRow);
    tbody.appendChild(createElement('tr', {}, [
      createElement('th', { text: '關係文書與審查' }),
      attTd
    ]));
  }

  table.appendChild(tbody);
  sheet.appendChild(table);
  container.appendChild(sheet);

  // Full Text Viewer
  const docContainer = createElement('div', {
    style: 'background-color: var(--color-bg-card); border: 1px solid var(--color-border); padding: var(--space-5);'
  });

  docContainer.appendChild(createElement('div', {
    style: 'font-weight: 700; font-size: 0.9375rem; color: var(--color-text); border-bottom: 1px solid var(--color-border); padding-bottom: 6px; margin-bottom: 14px;',
    text: '立法院議案關係文書全文'
  }));

  const docBody = createElement('div', {
    id: 'bill-doc-content',
    style: 'overflow-x: auto; line-height: 1.8; color: var(--color-text); font-size: 0.875rem;'
  });
  docBody.textContent = '正在檢索文書轉譯資料...';
  docContainer.appendChild(docBody);
  container.appendChild(docContainer);

  try {
    const html = await api.getBillDocHtml(billNo);
    if (html && html.trim()) {
      docBody.innerHTML = html;
    } else {
      docBody.innerHTML = '<p style="color: var(--color-text-secondary); font-size: 0.8125rem;">此議案未提供 HTML 格式文書轉譯。請點選上方按鈕下載 PDF 或 DOC 關係文書原件。</p>';
    }
  } catch {
    docBody.innerHTML = '<p style="color: var(--color-text-secondary); font-size: 0.8125rem;">文書轉譯暫不可用，請查閱立法院議政系統關係文書原件。</p>';
  }
}
