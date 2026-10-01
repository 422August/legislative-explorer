// js/api.js
import { API_BASE_URL, DEFAULT_TTL } from './constants.js';
import { cache } from './cache.js';
import { normalizeLegislator } from './utils.js';

class ApiClient {
  async fetchWithRetry(url, options = {}, maxRetries = 2) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const resp = await fetch(url, options);
        if (resp.status === 429) {
          // Rate limited
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
          continue;
        }
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
        }
        return await resp.json();
      } catch (err) {
        if (attempt === maxRetries) {
          console.error(`[API] Failed to fetch ${url}:`, err);
          throw err;
        }
        await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
      }
    }
  }

  async getTermLegislators(term) {
    const t = parseInt(term, 10);
    const cacheKey = `term-${t}`;
    const cached = await cache.get('legislators', cacheKey);
    if (cached) return cached;

    let rawList = [];
    if (t === 1) {
      // Load static JSON for Term 1
      try {
        const resp = await fetch('static/data/term-01-legislators.json');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        rawList = await resp.json();
      } catch (err) {
        console.error('[API] Error loading Term 1 static file:', err);
        throw new Error('無法載入第 1 屆立法委員靜態資料');
      }
    } else {
      // Load from v2.ly.govapi.tw (limit=300 covers all legislators in any term)
      const url = `${API_BASE_URL}/legislators?%E5%B1%86=${t}&limit=300`;
      const data = await this.fetchWithRetry(url);
      rawList = data.legislators || [];
    }

    const normalized = rawList.map(item => normalizeLegislator(item, t));
    await cache.set('legislators', cacheKey, normalized, DEFAULT_TTL.LEGISLATORS);
    return normalized;
  }

  async getLegislatorDetail(term, name) {
    const t = parseInt(term, 10);
    const cacheKey = `${t}-${name}`;
    const cached = await cache.get('legislator-detail', cacheKey);
    if (cached) return cached;

    // For Term 1, get from term legislators list
    if (t === 1) {
      const all = await this.getTermLegislators(1);
      const found = all.find(l => l.name === name);
      if (found) {
        await cache.set('legislator-detail', cacheKey, found, DEFAULT_TTL.LEGISLATOR_DETAIL);
        return found;
      }
      throw new Error(`找不到第 1 屆委員：${name}`);
    }

    // For Terms 2~11
    try {
      const url = `${API_BASE_URL}/legislators/${t}/${encodeURIComponent(name)}`;
      const data = await this.fetchWithRetry(url);
      const raw = data.data || data;
      const normalized = normalizeLegislator(raw, t);
      await cache.set('legislator-detail', cacheKey, normalized, DEFAULT_TTL.LEGISLATOR_DETAIL);
      return normalized;
    } catch {
      // Fallback: search within the term legislators list
      const all = await this.getTermLegislators(t);
      const found = all.find(l => l.name === name);
      if (found) {
        await cache.set('legislator-detail', cacheKey, found, DEFAULT_TTL.LEGISLATOR_DETAIL);
        return found;
      }
      throw new Error(`找不到第 ${t} 屆委員：${name}`);
    }
  }

  async getLegislatorProposeBills(term, name, page = 1, limit = 15) {
    const t = parseInt(term, 10);
    if (t === 1) return { total: 0, bills: [], page, total_page: 0 };

    const cacheKey = `propose:${t}:${name}:p${page}:l${limit}`;
    const cached = await cache.get('bills', cacheKey);
    if (cached) return cached;

    const url = `${API_BASE_URL}/legislators/${t}/${encodeURIComponent(name)}/propose_bills?page=${page}&limit=${limit}`;
    const data = await this.fetchWithRetry(url);
    await cache.set('bills', cacheKey, data, DEFAULT_TTL.BILLS);
    return data;
  }

  async getLegislatorCosignBills(term, name, page = 1, limit = 15) {
    const t = parseInt(term, 10);
    if (t === 1) return { total: 0, bills: [], page, total_page: 0 };

    const cacheKey = `cosign:${t}:${name}:p${page}:l${limit}`;
    const cached = await cache.get('bills', cacheKey);
    if (cached) return cached;

    const url = `${API_BASE_URL}/legislators/${t}/${encodeURIComponent(name)}/cosign_bills?page=${page}&limit=${limit}`;
    const data = await this.fetchWithRetry(url);
    await cache.set('bills', cacheKey, data, DEFAULT_TTL.BILLS);
    return data;
  }

  async getLegislatorMeets(term, name, page = 1, limit = 15) {
    const t = parseInt(term, 10);
    if (t === 1) return { total: 0, meets: [], page, total_page: 0 };

    const cacheKey = `meets:${t}:${name}:p${page}:l${limit}`;
    const cached = await cache.get('meets', cacheKey);
    if (cached) return cached;

    const url = `${API_BASE_URL}/legislators/${t}/${encodeURIComponent(name)}/meets?page=${page}&limit=${limit}`;
    const data = await this.fetchWithRetry(url);
    await cache.set('meets', cacheKey, data, DEFAULT_TTL.MEETS);
    return data;
  }

  async getLegislatorInterpellations(term, name, page = 1, limit = 15) {
    const t = parseInt(term, 10);
    if (t === 1) return { total: 0, interpellations: [], page, total_page: 0 };

    const cacheKey = `interpellations:${t}:${name}:p${page}:l${limit}`;
    const cached = await cache.get('meets', cacheKey);
    if (cached) return cached;

    const url = `${API_BASE_URL}/legislators/${t}/${encodeURIComponent(name)}/interpellations?page=${page}&limit=${limit}`;
    const data = await this.fetchWithRetry(url);
    await cache.set('meets', cacheKey, data, DEFAULT_TTL.MEETS);
    return data;
  }

  formatSearchQuery(rawQuery, scope = 'title_or_proposer') {
    if (!rawQuery) return '';
    const trimmed = rawQuery.trim();
    if (!trimmed) return '';

    // If user already typed quotes or explicit field search (e.g. 議案名稱:...), preserve it
    if (trimmed.includes('"') || trimmed.includes(':')) {
      return trimmed;
    }

    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';

    if (scope === 'title') {
      return words.map(w => `議案名稱:"${w}"`).join(' AND ');
    } else if (scope === 'proposer') {
      return words.map(w => `提案人:"${w}"`).join(' AND ');
    } else if (scope === 'cosigner') {
      return words.map(w => `連署人:"${w}"`).join(' AND ');
    } else if (scope === 'all') {
      return words.map(w => `"${w}"`).join(' AND ');
    } else {
      // Default: 'title_or_proposer' (High precision for both laws and legislators)
      return words.map(w => `(議案名稱:"${w}" OR 提案人:"${w}")`).join(' AND ');
    }
  }

  async searchBills({ query = '', term = '', scope = 'title_or_proposer', page = 1, limit = 20 }) {
    const rawTrimmed = (query || '').trim();
    const params = new URLSearchParams();

    // Check if query is an exact bill number (10 to 16 digits)
    if (/^\d{10,16}$/.test(rawTrimmed)) {
      params.append('議案編號', rawTrimmed);
    } else if (rawTrimmed) {
      params.append('q', this.formatSearchQuery(rawTrimmed, scope));
    }

    if (term) {
      params.append('屆', term);
    }
    params.append('page', page);
    params.append('limit', limit);

    const cacheKey = `search-bills:${params.toString()}`;
    const cached = await cache.get('bills', cacheKey);
    if (cached) return cached;

    const url = `${API_BASE_URL}/bills?${params.toString()}`;
    const data = await this.fetchWithRetry(url);
    await cache.set('bills', cacheKey, data, DEFAULT_TTL.BILLS);
    return data;
  }

  async getBillDetail(billNo) {
    const cacheKey = `bill:${billNo}`;
    const cached = await cache.get('bills', cacheKey);
    if (cached) return cached;

    const url = `${API_BASE_URL}/bills/${billNo}`;
    const data = await this.fetchWithRetry(url);
    await cache.set('bills', cacheKey, data, DEFAULT_TTL.BILLS);
    return data;
  }

  async getBillDocHtml(billNo) {
    const cacheKey = `bill-doc:${billNo}`;
    const cached = await cache.get('bills', cacheKey);
    if (cached) return cached;

    const url = `${API_BASE_URL}/bills/${billNo}/doc_html`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const html = await resp.text();
      await cache.set('bills', cacheKey, html, DEFAULT_TTL.BILLS);
      return html;
    } catch {
      return null;
    }
  }

  async getTermMeets(term, page = 1, limit = 20) {
    const t = parseInt(term, 10);
    const cacheKey = `term-meets:${t}:p${page}:l${limit}`;
    const cached = await cache.get('meets', cacheKey);
    if (cached) return cached;

    const url = `${API_BASE_URL}/meets?%E5%B1%86=${t}&page=${page}&limit=${limit}`;
    const data = await this.fetchWithRetry(url);
    await cache.set('meets', cacheKey, data, DEFAULT_TTL.MEETS);
    return data;
  }

  async getTermVotes(term, page = 1, limit = 20) {
    const t = parseInt(term, 10);
    const cacheKey = `term-votes:${t}:p${page}:l${limit}`;
    const cached = await cache.get('votes', cacheKey);
    if (cached) return cached;

    const url = `${API_BASE_URL}/votes?%E5%B1%86=${t}&page=${page}&limit=${limit}`;
    const data = await this.fetchWithRetry(url);
    await cache.set('votes', cacheKey, data, DEFAULT_TTL.VOTES);
    return data;
  }

  async getCommittees() {
    const cacheKey = 'committees:all';
    const cached = await cache.get('committees', cacheKey);
    if (cached) return cached;

    try {
      const url = `${API_BASE_URL}/committees?limit=50`;
      const data = await this.fetchWithRetry(url);
      const list = data.committees || [];
      await cache.set('committees', cacheKey, list, DEFAULT_TTL.COMMITTEES);
      return list;
    } catch (err) {
      console.warn('[API] Failed to fetch committees, fallback to constants:', err);
      return [];
    }
  }

  async getCommitteeBills(term, committeeName, page = 1, limit = 20) {
    const t = parseInt(term, 10);
    const cacheKey = `comm-bills:${t}:${committeeName}:p${page}:l${limit}`;
    const cached = await cache.get('bills', cacheKey);
    if (cached) return cached;

    // 精確檢索在議案流程中交付該委員會審查的法律案
    const query = `議案流程.狀態:"${committeeName}"`;
    const data = await this.searchBills({ query, term: t, page, limit });
    await cache.set('bills', cacheKey, data, DEFAULT_TTL.BILLS);
    return data;
  }

  async getCommitteeMeets(term, committeeId, page = 1, limit = 20) {
    const t = parseInt(term, 10);
    const cacheKey = `comm-meets:${t}:${committeeId}:p${page}:l${limit}`;
    const cached = await cache.get('meets', cacheKey);
    if (cached) return cached;

    const url = `${API_BASE_URL}/meets?%E5%B1%86=${t}&%E5%A7%94%E5%93%A1%E6%9C%83%E4%BB%A3%E8%99%9F=${committeeId}&page=${page}&limit=${limit}`;
    const data = await this.fetchWithRetry(url);
    await cache.set('meets', cacheKey, data, DEFAULT_TTL.MEETS);
    return data;
  }
}

export const api = new ApiClient();
