// js/components/legislator-card.js
import { createElement } from '../utils.js';

export function createLegislatorCard(leg) {
  const fallbackImg = leg.sex === '女'
    ? 'static/images/placeholder-female.svg'
    : 'static/images/placeholder-male.svg';

  const card = createElement('a', {
    href: `#/term/${leg.term}/legislator/${encodeURIComponent(leg.name)}`,
    className: 'roster-card'
  });

  // Photo Box
  const imgEl = createElement('img', {
    src: leg.picUrl || fallbackImg,
    alt: `${leg.name} 委員肖像`,
    loading: 'lazy',
    onerror: function () {
      if (this.src !== fallbackImg) {
        this.src = fallbackImg;
      }
    }
  });

  const photoBox = createElement('div', { className: 'roster-card-photo' }, [imgEl]);

  // Card Body
  const nameRow = createElement('div', { className: 'roster-card-name-row' }, [
    createElement('span', { className: 'roster-card-name', text: leg.name }),
    leg.hasLeft ? createElement('span', { className: 'tag tag-warning', text: '離職' }) : null
  ]);

  const partyText = leg.party || '無黨籍';
  const areaText = leg.areaName || (leg.term === 1 ? '第一屆代表' : '全國不分區');

  const metaRow = createElement('div', { className: 'roster-card-meta' }, [
    createElement('span', { className: 'roster-card-party', text: partyText }),
    document.createTextNode(' ｜ '),
    createElement('span', { className: 'roster-card-area', text: areaText })
  ]);

  const bodyEl = createElement('div', { className: 'roster-card-body' }, [nameRow, metaRow]);

  card.appendChild(photoBox);
  card.appendChild(bodyEl);

  return card;
}
