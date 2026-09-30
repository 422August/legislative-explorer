// js/components/meeting-item.js
import { createElement, formatDate } from '../utils.js';

export function createMeetingItem(meet) {
  const item = createElement('div', {
    style: 'background-color: var(--color-bg-card); border: 1px solid var(--color-border); padding: 12px 14px; margin-bottom: 8px;'
  });

  const title = meet['會議標題'] || meet['會議名稱'] || meet['會議代碼'] || '立法院會議';
  const dates = Array.isArray(meet['日期']) ? meet['日期'] : [meet['日期'] || meet['會議時間'] || ''];
  const dateStr = dates.filter(Boolean).map(formatDate).join(', ');
  const unit = meet['會議種類'] || meet['會議單位'] || '';

  const header = createElement('div', {
    style: 'display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 4px;'
  }, [
    createElement('div', { style: 'font-weight: 700; font-size: 0.9375rem; color: var(--color-text);', text: title }),
    createElement('span', {
      style: 'font-family: var(--font-family-mono); font-size: 0.75rem; color: var(--color-text-secondary); white-space: nowrap;',
      text: dateStr
    })
  ]);

  const detailList = meet['會議資料'] || [];
  const primaryDetail = detailList[0] || {};
  const reason = primaryDetail['會議事由'] || meet['會議事由'] || meet['會議內容'] || '';
  const place = primaryDetail['會議地點'] || meet['會議地點'] || '';

  const metaItems = [];
  if (unit) metaItems.push(`會別：${unit}`);
  if (place) metaItems.push(`地點：${place}`);

  const meta = createElement('div', {
    style: 'font-size: 0.75rem; color: var(--color-text-muted); margin-bottom: 6px;',
    text: metaItems.join(' ｜ ')
  });

  item.appendChild(header);
  if (metaItems.length > 0) item.appendChild(meta);

  if (reason) {
    const reasonEl = createElement('div', {
      style: 'font-size: 0.8125rem; color: var(--color-text-secondary); line-height: 1.5; background-color: var(--color-bg-subtle); padding: 6px 10px; border-left: 2px solid var(--color-border-dark);',
      text: reason.length > 250 ? reason.slice(0, 250) + '...' : reason
    });
    item.appendChild(reasonEl);
  }

  return item;
}
