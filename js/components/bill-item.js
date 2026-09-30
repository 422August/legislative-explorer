// js/components/bill-item.js
import { createElement, formatDate } from '../utils.js';

export function createBillItem(bill, term) {
  const item = createElement('div', {
    style: 'background-color: var(--color-bg-card); border: 1px solid var(--color-border); padding: 12px 14px; margin-bottom: 8px;'
  });

  const billNo = bill['議案編號'] || bill.billNo || '';
  const billName = bill['議案名稱'] || bill.billName || '未命名議案';
  const rawDate = bill['最新進度日期'] || bill['提案日期'] || bill.date || '';
  const dateStr = formatDate(rawDate);
  const proposer = bill['提案單位/提案人'] || bill['提案人'] || bill.billProposer || '';
  const meetingStr = bill['會議代碼:str'] || bill['會議名稱'] || '';

  // Top Row: Bill Title & Date
  const topRow = createElement('div', {
    style: 'display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 4px;'
  }, [
    createElement('div', { style: 'font-weight: 700; font-size: 0.9375rem;' }, [
      createElement('a', {
        href: `#/term/${term || bill['屆'] || 11}/bill/${billNo}`,
        style: 'color: var(--color-text);',
        text: billName
      })
    ]),
    createElement('span', {
      style: 'font-family: var(--font-family-mono); font-size: 0.75rem; color: var(--color-text-secondary); white-space: nowrap;',
      text: dateStr
    })
  ]);

  // Meta row
  const metaParts = [];
  if (billNo) metaParts.push(`字號：${billNo}`);
  if (proposer) metaParts.push(`提案單位/人：${proposer}`);
  if (meetingStr) metaParts.push(`關聯會議：${meetingStr}`);

  const metaRow = createElement('div', {
    style: 'font-size: 0.75rem; color: var(--color-text-muted); margin-bottom: 8px; line-height: 1.5;',
    text: metaParts.join(' ｜ ')
  });

  // Action links
  const actionsRow = createElement('div', {
    style: 'display: flex; gap: 6px; align-items: center; flex-wrap: wrap;'
  });

  actionsRow.appendChild(createElement('a', {
    href: `#/term/${term || bill['屆'] || 11}/bill/${billNo}`,
    className: 'btn btn-sm btn-primary',
    text: '案由與全文紀錄'
  }));

  const attachments = bill['相關附件'] || [];
  attachments.forEach(att => {
    if (att['網址']) {
      actionsRow.appendChild(createElement('a', {
        href: att['網址'],
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'btn btn-sm',
        text: `下載 ${att['名稱'] || '關係文書'}`
      }));
    }
  });

  item.appendChild(topRow);
  item.appendChild(metaRow);
  item.appendChild(actionsRow);

  return item;
}
