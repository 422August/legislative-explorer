// js/constants.js
export const API_BASE_URL = 'https://v2.ly.govapi.tw/v2';

// 基礎已驗證歷史屆次定義 (1–11 屆)
const BASE_TERM_DATES = [
  { term: 1,  start: '1948-05-08', end: '1993-01-31', seats: 1183, years: '1948–1993', name: '第 1 屆',  description: '行憲首屆「萬年國會」，含歷次增額選舉（至民國80年退職生效）。', historical: true },
  { term: 2,  start: '1993-02-01', end: '1996-01-31', seats: 165,  years: '1993–1996', name: '第 2 屆',  description: '台灣全面改選後首屆國會，三年任期制，確立民主代議機制。' },
  { term: 3,  start: '1996-02-01', end: '1999-01-31', seats: 171,  years: '1996–1999', name: '第 3 屆',  description: '第三屆立法委員，朝野三黨不過半政治生態初現。' },
  { term: 4,  start: '1999-02-01', end: '2002-01-31', seats: 228,  years: '1999–2002', name: '第 4 屆',  description: '第四屆立法委員，精省後立院席次擴編至225席加上僑選增額。' },
  { term: 5,  start: '2002-02-01', end: '2005-01-31', seats: 231,  years: '2002–2005', name: '第 5 屆',  description: '第五屆立法委員，首次政黨輪替後的國會議事運作。' },
  { term: 6,  start: '2005-02-01', end: '2008-01-31', seats: 238,  years: '2005–2008', name: '第 6 屆',  description: '最後一屆三年任期及225席制，任內通過國會改革憲法修正案。' },
  { term: 7,  start: '2008-02-01', end: '2012-01-31', seats: 128,  years: '2008–2012', name: '第 7 屆',  description: '國會減半新制首屆：單一選區兩票制、任期延長為四年、113席基準。' },
  { term: 8,  start: '2012-02-01', end: '2016-01-31', seats: 124,  years: '2012–2016', name: '第 8 屆',  description: '第八屆立法委員，立法院開放資料與數位化議事系統初期。' },
  { term: 9,  start: '2016-02-01', end: '2020-01-31', seats: 128,  years: '2016–2020', name: '第 9 屆',  description: '第九屆立法委員，民進黨首次取得國會過半席次與院長職務。' },
  { term: 10, start: '2020-02-01', end: '2024-01-31', seats: 120,  years: '2020–2024', name: '第 10 屆', description: '第十屆立法委員，推動數位國會及議事直播（IVOD全面整合）。' },
  { term: 11, start: '2024-02-01', end: '2028-01-31', seats: 123,  years: '2024–2028', name: '第 11 屆', description: '現任國會屆次，三黨不過半多元競爭格局，持續運作中。', current: true }
];

/**
 * 滾動推算未來屆次 (憲政四年間隔演算法)
 * 國會減半後每 4 年於 2 月 1 日改選就職
 */
function buildRollingTerms() {
  const terms = [...BASE_TERM_DATES];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  // 計算目前理論年份應達到的最新屆次
  let calculatedMaxTerm = 11;
  const yearOffset = currentYear - 2024;
  if (yearOffset > 0 || (yearOffset === 0 && currentMonth >= 2)) {
    calculatedMaxTerm = 11 + Math.floor((yearOffset + (currentMonth >= 2 ? 0 : -1)) / 4);
  }

  // 檢查 localStorage 是否有 API 動態探測到的更新屆次
  try {
    const cachedMax = parseInt(localStorage.getItem('ly_discovered_max_term'), 10);
    if (cachedMax && cachedMax > calculatedMaxTerm) {
      calculatedMaxTerm = cachedMax;
    }
  } catch {}

  // 若推算屆次大於基準第 11 屆，動態滾動生成新屆次項目
  if (calculatedMaxTerm > 11) {
    // 將第 11 屆的 current 設為 false
    terms.find(t => t.term === 11).current = false;

    for (let t = 12; t <= calculatedMaxTerm; t++) {
      const startYear = 2024 + (t - 11) * 4;
      const endYear = startYear + 4;
      terms.push({
        term: t,
        start: `${startYear}-02-01`,
        end: `${endYear}-01-31`,
        seats: 113,
        years: `${startYear}–${endYear}`,
        name: `第 ${t} 屆`,
        description: `第 ${t} 屆立法委員（單一選區兩票制四年任期，持續運作中）。`,
        current: t === calculatedMaxTerm
      });
    }
  }

  return terms;
}

export let TERM_DATES = buildRollingTerms();

/**
 * 動態新增/確認新屆次 (提供 API 自動探測回調調用)
 */
export function registerNewTerm(termNumber) {
  const t = parseInt(termNumber, 10);
  if (!t || t <= 0) return;

  const existing = TERM_DATES.find(item => item.term === t);
  if (!existing) {
    // 移除舊的 current
    TERM_DATES.forEach(item => { item.current = false; });

    const startYear = 2008 + (t - 7) * 4;
    const endYear = startYear + 4;
    const newTermObj = {
      term: t,
      start: `${startYear}-02-01`,
      end: `${endYear}-01-31`,
      seats: 113,
      years: `${startYear}–${endYear}`,
      name: `第 ${t} 屆`,
      description: `立法院第 ${t} 屆立法委員名錄與議事公報記錄。`,
      current: true
    };

    TERM_DATES.push(newTermObj);
    TERM_DATES.sort((a, b) => a.term - b.term);

    try {
      localStorage.setItem('ly_discovered_max_term', String(t));
    } catch {}
  }
}

/**
 * 取得當前最新在任屆次 (動態計算)
 */
export function getCurrentTerm() {
  const currentObj = TERM_DATES.find(t => t.current);
  if (currentObj) return currentObj.term;
  return TERM_DATES[TERM_DATES.length - 1].term;
}

/**
 * 取得全部屆次清單
 */
export function getTerms() {
  return TERM_DATES;
}

export const PARTY_COLORS = {
  '中國國民黨': { color: '#000095', badgeBg: '#e8eaf6', text: '#000095', abbr: '國民黨' },
  '國民黨': { color: '#000095', badgeBg: '#e8eaf6', text: '#000095', abbr: '國民黨' },
  '民主進步黨': { color: '#1B9431', badgeBg: '#e8f5e9', text: '#1B9431', abbr: '民進黨' },
  '民進黨': { color: '#1B9431', badgeBg: '#e8f5e9', text: '#1B9431', abbr: '民進黨' },
  '台灣民眾黨': { color: '#28C8C8', badgeBg: '#e0f7f7', text: '#0e8787', abbr: '民眾黨' },
  '民眾黨': { color: '#28C8C8', badgeBg: '#e0f7f7', text: '#0e8787', abbr: '民眾黨' },
  '時代力量': { color: '#F39C12', badgeBg: '#fef9e7', text: '#b7791f', abbr: '時代力量' },
  '親民黨': { color: '#FF6310', badgeBg: '#fff3e0', text: '#e65100', abbr: '親民黨' },
  '台灣團結聯盟': { color: '#A0522D', badgeBg: '#efebe9', text: '#5d4037', abbr: '台聯' },
  '新黨': { color: '#FFD700', badgeBg: '#fffde7', text: '#f57f17', abbr: '新黨' },
  '無黨團結聯盟': { color: '#800000', badgeBg: '#fbe9e7', text: '#bf360c', abbr: '無盟' },
  '無黨籍': { color: '#78909c', badgeBg: '#eceff1', text: '#455a64', abbr: '無黨籍' },
  '無黨籍/資料闕如': { color: '#78909c', badgeBg: '#eceff1', text: '#455a64', abbr: '無黨籍' },
  '中國青年黨': { color: '#00838f', badgeBg: '#e0f7fa', text: '#006064', abbr: '青年黨' },
  '中國民主社會黨': { color: '#6a1b9a', badgeBg: '#f3e5f5', text: '#4a148c', abbr: '民社黨' },
};

export const DEFAULT_TTL = {
  LEGISLATORS: 24 * 60 * 60 * 1000,      // 24 hours
  LEGISLATOR_DETAIL: 24 * 60 * 60 * 1000, // 24 hours
  BILLS: 2 * 60 * 60 * 1000,              // 2 hours
  MEETS: 2 * 60 * 60 * 1000,              // 2 hours
  VOTES: 2 * 60 * 60 * 1000,              // 2 hours
  COMMITTEES: 7 * 24 * 60 * 60 * 1000,    // 7 days
};

// 現行 8 大常設委員會 (國會改革第 7 屆迄今)
export const COMMITTEES_CURRENT = [
  { id: 15, name: '內政委員會', category: 'standing', abbr: '內政', desc: '審查內政部、中央選舉委員會、大陸委員會、原住民族委員會、客家委員會等主管法案與預算。' },
  { id: 35, name: '外交及國防委員會', category: 'standing', abbr: '外國', desc: '審查外交部、國防部、僑務委員會、退輔會、國家安全局等主管法案與預算。' },
  { id: 19, name: '經濟委員會', category: 'standing', abbr: '經濟', desc: '審查經濟部、農業部、國家發展委員會、公平交易委員會等主管法案與預算。' },
  { id: 20, name: '財政委員會', category: 'standing', abbr: '財政', desc: '審查財政部、中央銀行、金融監督管理委員會、審計部、行政院主計總處等主管法案與預算。' },
  { id: 22, name: '教育及文化委員會', category: 'standing', abbr: '教文', desc: '審查教育部、文化部、國家科學及技術委員會、中央研究院、國立故宮博物院等主管法案與預算。' },
  { id: 23, name: '交通委員會', category: 'standing', abbr: '交通', desc: '審查交通部、數位發展部、國家通訊傳播委員會等主管法案與預算。' },
  { id: 36, name: '司法及法制委員會', category: 'standing', abbr: '司法', desc: '審查司法院、法務部、考選部、銓敘部、公務人員保障暨培訓委員會、立法院組織規程等主管法案。' },
  { id: 26, name: '社會福利及衛生環境委員會', category: 'standing', abbr: '社福', desc: '審查衛生福利部、勞動部、環境部等主管法案與預算。' }
];

// 現行 4 大特種委員會
export const COMMITTEES_SPECIAL = [
  { id: 27, name: '程序委員會', category: 'special', abbr: '程序', desc: '核定院會議事日程、排列法案審議順序及議程分配。' },
  { id: 28, name: '紀律委員會', category: 'special', abbr: '紀律', desc: '審議院會移送之立法委員懲戒案件與議會自律事項。' },
  { id: 29, name: '修憲委員會', category: 'special', abbr: '修憲', desc: '研擬與審查憲法修正案、領土變更案等憲政改革事宜。' },
  { id: 30, name: '經費稽核委員會', category: 'special', abbr: '經稽', desc: '每月份按期稽核本院經費收支、各項採購與單據憑證。' }
];

// 歷史舊制委員會 (第 1–6 屆)
export const COMMITTEES_HISTORICAL = [
  { id: 16, name: '外交及僑務委員會', category: 'historical', abbr: '外僑', desc: '國會改革前外交及僑務政策審查委員會。' },
  { id: 17, name: '科技及資訊委員會', category: 'historical', abbr: '科資', desc: '國會改革前科技、資訊及公共工程審查委員會。' },
  { id: 18, name: '國防委員會', category: 'historical', abbr: '國防', desc: '國會改革前國防部及退輔會專責審查委員會。' },
  { id: 21, name: '預算及決算委員會', category: 'historical', abbr: '預決', desc: '國會改革前中央政府總預算案與決算報告專責委員會。' },
  { id: 24, name: '司法委員會', category: 'historical', abbr: '司法', desc: '國會改革前司法院與法務部專責審查委員會。' },
  { id: 25, name: '法制委員會', category: 'historical', abbr: '法制', desc: '國會改革前考試院法制與行政院各部會組織法審查委員會。' }
];

