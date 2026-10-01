// js/utils.js
import { PARTY_COLORS, TERM_DATES } from './constants.js';

export function getTermMeta(term) {
  const t = parseInt(term, 10);
  return TERM_DATES.find(item => item.term === t) || {
    term: t,
    name: `第 ${t} 屆`,
    years: '',
    seats: 0,
    description: ''
  };
}

export function normalizeName(name) {
  if (!name) return '';
  return String(name)
    .trim()
    .replace(/\s+/g, '')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/\n/g, '');
}

export function extractChineseName(fullName) {
  if (!fullName) return '';
  const match = String(fullName).trim().match(/^[\u4e00-\u9fff]+/);
  return match ? match[0] : fullName;
}

export function matchLegislatorName(a, b) {
  if (!a || !b) return false;
  const normA = normalizeName(a);
  const normB = normalizeName(b);
  if (normA === normB) return true;
  return extractChineseName(normA) === extractChineseName(normB);
}

export function getPartyInfo(partyName) {
  if (!partyName) {
    return { color: '#78909c', badgeBg: '#eceff1', text: '#455a64', abbr: '無黨籍' };
  }
  const clean = partyName.trim();
  return PARTY_COLORS[clean] || {
    color: '#5c6bc0',
    badgeBg: '#e8eaf6',
    text: '#283593',
    abbr: clean.slice(0, 4)
  };
}

export function normalizeLegislator(raw, termNum) {
  const term = parseInt(raw['屆'] || raw.term || termNum, 10);
  const name = String(raw['委員姓名'] || raw.name || '').trim();
  const ename = String(raw['委員英文姓名'] || raw.ename || '').trim();
  const sex = String(raw['性別'] || raw.sex || '').trim();
  const party = String(raw['黨籍'] || raw.party || '無黨籍').trim();
  const partyGroup = String(raw['黨團'] || raw.partyGroup || party).trim();
  const areaName = String(raw['選區名稱'] || raw.areaName || '').trim();
  const onboardDate = String(raw['到職日'] || raw.onboardDate || '').trim();

  // Education: array or string
  let degree = [];
  if (Array.isArray(raw['學歷'])) {
    degree = raw['學歷'].filter(Boolean).map(s => s.trim());
  } else if (raw['學歷'] || raw.degree) {
    degree = String(raw['學歷'] || raw.degree).split(/[\n;；]/).map(s => s.trim()).filter(Boolean);
  }

  // Experience: array or string
  let experience = [];
  if (Array.isArray(raw['經歷'])) {
    experience = raw['經歷'].filter(Boolean).map(s => s.trim());
  } else if (raw['經歷'] || raw.experience) {
    experience = String(raw['經歷'] || raw.experience).split(/[\n;；]/).map(s => s.trim()).filter(Boolean);
  }

  // Committees: array or string
  let committee = [];
  if (Array.isArray(raw['委員會'])) {
    committee = raw['委員會'].filter(Boolean).map(s => s.trim());
  } else if (raw['委員會'] || raw.committee) {
    committee = String(raw['委員會'] || raw.committee).split(/[\n;；]/).map(s => s.trim()).filter(Boolean);
  }

  // Photo URL
  let picUrl = String(raw['照片位址'] || raw.picUrl || raw.picPath || '').trim();
  if (picUrl && picUrl.startsWith('http://')) {
    picUrl = picUrl.replace(/^http:\/\//, 'https://');
  }
  if (!picUrl) {
    picUrl = sex === '女' ? 'static/images/placeholder-female.svg' : 'static/images/placeholder-male.svg';
  }

  const hasLeft = raw['是否離職'] === '是' || raw.leaveFlag === '是' || raw.hasLeft === true;
  const leaveDate = raw['離職日期'] || raw.leaveDate || null;
  const leaveReason = raw['離職原因'] || raw.leaveReason || null;

  return {
    term,
    name,
    ename,
    sex,
    party,
    partyGroup,
    areaName,
    onboardDate,
    degree,
    experience,
    committee,
    picUrl,
    hasLeft,
    leaveDate,
    leaveReason,
    tel: raw['電話'] || raw.tel || '',
    fax: raw['傳真'] || raw.fax || '',
    addr: raw['通訊處'] || raw.addr || '',
    note: raw['備註'] || raw.note || ''
  };
}

export function debounce(fn, delay = 250) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function formatDate(val) {
  if (!val) return '';
  const str = String(val).trim();
  // ROC calendar e.g. 1130409 or 113/04/09
  if (/^\d{3}\/?\d{2}\/?\d{2}$/.test(str)) {
    const clean = str.replace(/\//g, '');
    const roc = parseInt(clean.slice(0, 3), 10);
    const adYear = roc + 1911;
    return `${adYear}-${clean.slice(3, 5)}-${clean.slice(5, 7)}`;
  }
  return str.slice(0, 10);
}

export function normalizeAttachmentUrl(url) {
  if (!url) return '';
  let u = String(url).trim();
  if (u.startsWith('//')) {
    return 'https:' + u;
  }
  if (u.startsWith('http://')) {
    return u.replace(/^http:\/\//, 'https://');
  }
  if (u.startsWith('https://')) {
    return u;
  }
  // Relative paths from ppg.ly.gov.tw (e.g. /ppg/bills/... or ppg/bills/...)
  if (u.startsWith('/ppg/') || u.startsWith('ppg/')) {
    return 'https://ppg.ly.gov.tw/' + u.replace(/^\/+/, '');
  }
  if (u.startsWith('/')) {
    return 'https://ppg.ly.gov.tw' + u;
  }
  return 'https://ppg.ly.gov.tw/' + u;
}

export function getAttachmentInfo(att) {
  const rawUrl = att['網址'] || att.url || '';
  const url = normalizeAttachmentUrl(rawUrl);
  const name = String(att['名稱'] || att.name || '關係文書').trim();

  const lowerUrl = url.toLowerCase();
  const lowerName = name.toLowerCase();
  const isDoc = lowerUrl.endsWith('.pdf') || lowerUrl.endsWith('.doc') || lowerUrl.endsWith('.docx') ||
                lowerUrl.endsWith('.odt') || lowerName.includes('pdf') || lowerName.includes('doc');

  let label = '';
  if (isDoc) {
    label = name.startsWith('下載') ? name : `下載 ${name}`;
  } else {
    label = (name.startsWith('檢視') || name.startsWith('查看')) ? name : `檢視 ${name}`;
  }

  return { url, label, isDoc };
}

export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') {
      el.className = v;
    } else if (k === 'dataset') {
      for (const [dk, dv] of Object.entries(v)) {
        el.dataset[dk] = dv;
      }
    } else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.substring(2).toLowerCase(), v);
    } else if (k === 'html') {
      el.innerHTML = v;
    } else if (k === 'text') {
      el.textContent = v;
    } else {
      el.setAttribute(k, v);
    }
  }

  if (Array.isArray(children)) {
    for (const child of children) {
      if (!child) continue;
      if (typeof child === 'string' || typeof child === 'number') {
        el.appendChild(document.createTextNode(String(child)));
      } else if (child instanceof Node) {
        el.appendChild(child);
      }
    }
  } else if (children instanceof Node) {
    el.appendChild(children);
  } else if (typeof children === 'string' || typeof children === 'number') {
    el.appendChild(document.createTextNode(String(children)));
  }

  return el;
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 從整屆立法委員名單中，反向萃取特定委員會的成員與會期任期資訊
 * @param {Array} legislators 該屆全體委員名單
 * @param {string} committeeName 目標委員會名稱 (例如 "教育及文化委員會")
 * @param {number|null} sessionFilter 可選的會期篩選 (例如 1, 2)
 */
export function extractCommitteeMembers(legislators = [], committeeName = '', sessionFilter = null) {
  if (!committeeName) return [];
  const cleanTarget = committeeName.trim();
  const members = [];

  for (const leg of legislators) {
    if (!Array.isArray(leg.committee) || leg.committee.length === 0) continue;

    const matchedSessions = [];
    let isConvenor = false;

    for (const commStr of leg.committee) {
      if (!commStr || typeof commStr !== 'string') continue;

      // 檢查是否命中目標委員會
      if (commStr.includes(cleanTarget)) {
        // 解析會期數字：例如 "第11屆第2會期" 或 "第01屆第85會期"
        const sMatch = commStr.match(/第0?(\d+)會期/);
        const sessionNum = sMatch ? parseInt(sMatch[1], 10) : null;

        if (sessionNum !== null) {
          if (sessionFilter === null || sessionFilter === sessionNum) {
            matchedSessions.push(sessionNum);
          }
        } else {
          // 若無明確會期字樣，默認納入
          matchedSessions.push(1);
        }

        if (commStr.includes('召集委員') || commStr.includes('召委') || commStr.includes('召集人')) {
          isConvenor = true;
        }
      }
    }

    if (matchedSessions.length > 0) {
      const uniqueSessions = Array.from(new Set(matchedSessions)).sort((a, b) => a - b);
      members.push({
        legislator: leg,
        sessions: uniqueSessions,
        isConvenor
      });
    }
  }

  // 排序：召集委員優先置頂，其次按委員姓名排序
  return members.sort((a, b) => {
    if (a.isConvenor !== b.isConvenor) return a.isConvenor ? -1 : 1;
    return a.legislator.name.localeCompare(b.legislator.name, 'zh-Hant');
  });
}

