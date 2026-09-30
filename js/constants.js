// js/constants.js
export const API_BASE_URL = 'https://v2.ly.govapi.tw/v2';

export const TERM_DATES = [
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
};
