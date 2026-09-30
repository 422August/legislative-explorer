// js/components/bill-item.js
import { createElement, formatDate, getAttachmentInfo } from '../utils.js';

export function createBillItem(bill, term) {
  const item = createElement('div', {
    style: 'background-color: var(--color-bg-card); border: 1px solid var(--color-border); padding: 12px 14px; margin-bottom: 8px;'
  });

  const billNo = bill['議案編號'] || bill.billNo || '';
  const billName = bill['議案名稱'] || bill.billName || '未命名議案';
  const rawDate = bill['最新進度日期'] || bill['提案日期'] || bill.date || '';
  const dateStr = formatDate(rawDate);
  const rawProposer = bill['提案人'] || bill['提案單位/提案人'] || bill['提案單位/提案委員'] || bill.billProposer || '';
  const proposerStr = Array.isArray(rawProposer) ? rawProposer.join(', ') : String(rawProposer);
  const meetingStr = bill['會議代碼:str'] || bill['會議名稱'] || '';
  const billTerm = bill['屆'] || term || 11;

  // Top Row: Bill Title & Date
  const topRow = createElement('div', {
    style: 'display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 4px;'
  }, [
    createElement('div', { style: 'font-weight: 700; font-size: 0.9375rem;' }, [
      createElement('a', {
        href: `#/term/${billTerm}/bill/${billNo}`,
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
  if (proposerStr) metaParts.push(`提案單位/人：${proposerStr}`);
  if (meetingStr) metaParts.push(`關聯會議：${meetingStr}`);

  const metaRow = createElement('div', {
    style: 'font-size: 0.75rem; color: var(--color-text-muted); margin-bottom: 6px; line-height: 1.5;',
    text: metaParts.join(' ｜ ')
  });

  // Highlight rows (when matched by cosigner or explanation)
  let highlightRow = null;
  const cosignHighlight = bill['連署人:highlight'];
  const reasonHighlight = bill['案由:highlight'];

  if (cosignHighlight && cosignHighlight.length > 0) {
    highlightRow = createElement('div', {
      style: 'font-size: 0.75rem; color: var(--color-primary); margin-bottom: 6px; line-height: 1.4;',
      html: `<strong>連署支持委員命中：</strong> ${cosignHighlight.join('、')}`
    });
  } else if (reasonHighlight && reasonHighlight.length > 0) {
    highlightRow = createElement('div', {
      style: 'font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 6px; background-color: var(--color-bg-subtle); padding: 4px 8px; border-radius: var(--radius-sm); line-height: 1.4;',
      html: `<strong>案由符合：</strong> ${reasonHighlight[0]}`
    });
  }

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
    const info = getAttachmentInfo(att);
    if (info.url) {
      actionsRow.appendChild(createElement('a', {
        href: info.url,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'btn btn-sm',
        text: info.label
      }));
    }
  });

  item.appendChild(topRow);
  item.appendChild(metaRow);
  if (highlightRow) item.appendChild(highlightRow);
  item.appendChild(actionsRow);

  return item;
}
