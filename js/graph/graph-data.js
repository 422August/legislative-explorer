// js/graph/graph-data.js
import { api } from '../api.js';
import { normalizeLegislator, getPartyInfo, formatDate } from '../utils.js';
import { ENTITY_TYPES, RELATION_TYPES, RELATION_LABELS } from './graph-state.js';

export class GraphData {
  constructor(graphState) {
    this.state = graphState;
  }

  // 工具：生成唯一 Entity ID
  createEntityId(type, ...parts) {
    return [type, ...parts].map(p => String(p || '').trim()).join('::');
  }

  // 工具：截斷標籤
  truncateLabel(text = '', maxLen = 30) {
    if (!text) return '';
    const clean = String(text).replace(/\s+/g, ' ').trim();
    if (clean.length <= maxLen) return clean;
    return clean.slice(0, maxLen) + '…';
  }

  // 工具：解析委員會字串
  parseCommitteeString(raw = '') {
    // 例如："第11屆第1會期：教育及文化委員會" 或 "教育及文化委員會"
    const match = raw.match(/(?:第(\d+)屆)?(?:第(\d+)會期)?(?::|：)?(.*)/);
    if (match) {
      return {
        term: match[1] ? parseInt(match[1]) : null,
        session: match[2] ? parseInt(match[2]) : null,
        name: (match[3] || raw).trim()
      };
    }
    return { term: null, session: null, name: raw.trim() };
  }

  // === 焦點載入 ===

  // 1. 以委員為起點載入
  async loadLegislatorFocus(term, name) {
    const termNum = parseInt(term) || 11;
    this.state.setLoading(`legislator::${termNum}::${name}`, true);

    try {
      const leg = await api.getLegislatorDetail(termNum, name);
      const entityId = this.createEntityId(ENTITY_TYPES.LEGISLATOR, termNum, leg.name);

      const legislatorEntity = {
        id: entityId,
        type: ENTITY_TYPES.LEGISLATOR,
        label: leg.name,
        sublabel: `${leg.party || '無黨籍'} ｜ ${leg.areaName || ''}`,
        metadata: leg,
        expanded: false,
        visible: true
      };

      const entities = [legislatorEntity];
      const relationships = [];

      // 自動解析所屬委員會並建立關聯
      if (Array.isArray(leg.committee) && leg.committee.length > 0) {
        const seenCommittees = new Set();
        for (const commStr of leg.committee) {
          const parsed = this.parseCommitteeString(commStr);
          if (!parsed.name || seenCommittees.has(parsed.name)) continue;
          seenCommittees.add(parsed.name);

          const commId = this.createEntityId(ENTITY_TYPES.COMMITTEE, termNum, parsed.name);
          entities.push({
            id: commId,
            type: ENTITY_TYPES.COMMITTEE,
            label: parsed.name,
            sublabel: `第 ${termNum} 屆常設/特種委員會`,
            metadata: { term: termNum, fullName: commStr, name: parsed.name },
            expanded: false,
            visible: true
          });

          relationships.push({
            id: `served_on::${entityId}::${commId}`,
            type: RELATION_TYPES.SERVED_ON,
            sourceId: entityId,
            targetId: commId,
            label: RELATION_LABELS.served_on
          });
        }
      }

      this.state.addEntities(entities);
      this.state.addRelationships(relationships);
      this.state.setFocus(entityId);
      this.state.pushExplorationPath({
        entityId,
        label: leg.name,
        type: ENTITY_TYPES.LEGISLATOR
      });

      return legislatorEntity;
    } finally {
      this.state.setLoading(`legislator::${termNum}::${name}`, false);
    }
  }

  // 2. 以法案為起點載入
  async loadBillFocus(billNo, term = 11) {
    const termNum = parseInt(term) || 11;
    this.state.setLoading(`bill::${billNo}`, true);

    try {
      const resp = await api.getBillDetail(billNo);
      const billData = resp.data || resp;
      const billId = this.createEntityId(ENTITY_TYPES.BILL, billNo);

      const billTitle = billData['議案名稱'] || billData.billName || '未命名法律案';
      const billEntity = {
        id: billId,
        type: ENTITY_TYPES.BILL,
        label: this.truncateLabel(billTitle, 28),
        sublabel: `${billData['議案狀態'] || '審查中'} ｜ ${formatDate(billData['提案日期'] || billData['最新進度日期'])}`,
        metadata: {
          billNo,
          fullTitle: billTitle,
          status: billData['議案狀態'] || '',
          date: billData['最新進度日期'] || billData['提案日期'] || '',
          proposers: Array.isArray(billData['提案人']) ? billData['提案人'] : [],
          cosigners: Array.isArray(billData['連署人']) ? billData['連署人'] : [],
          term: billData['屆'] || termNum,
          meetingCode: billData['會議代碼'] || '',
          attachments: billData['相關附件'] || []
        },
        expanded: false,
        visible: true
      };

      const entities = [billEntity];
      const relationships = [];

      // 展開提案人
      const proposers = billEntity.metadata.proposers;
      for (const p of proposers) {
        const pId = this.createEntityId(ENTITY_TYPES.LEGISLATOR, billEntity.metadata.term, p);
        entities.push({
          id: pId,
          type: ENTITY_TYPES.LEGISLATOR,
          label: p,
          sublabel: `第 ${billEntity.metadata.term} 屆提案委員`,
          metadata: { term: billEntity.metadata.term, name: p },
          expanded: false,
          visible: true
        });

        relationships.push({
          id: `proposed::${pId}::${billId}`,
          type: RELATION_TYPES.PROPOSED,
          sourceId: pId,
          targetId: billId,
          label: RELATION_LABELS.proposed
        });
      }

      // 關聯會議（若有）
      if (billData['會議代碼']) {
        const meetCode = billData['會議代碼'];
        const meetId = this.createEntityId(ENTITY_TYPES.MEETING, meetCode);
        entities.push({
          id: meetId,
          type: ENTITY_TYPES.MEETING,
          label: this.truncateLabel(billData['會議代碼:str'] || meetCode, 24),
          sublabel: `第 ${billEntity.metadata.term} 屆審議會議`,
          metadata: { meetingCode: meetCode, name: billData['會議代碼:str'] || meetCode },
          expanded: false,
          visible: true
        });

        relationships.push({
          id: `discussed_in::${billId}::${meetId}`,
          type: RELATION_TYPES.DISCUSSED_IN,
          sourceId: billId,
          targetId: meetId,
          label: RELATION_LABELS.discussed_in
        });
      }

      this.state.addEntities(entities);
      this.state.addRelationships(relationships);
      this.state.setFocus(billId);
      this.state.pushExplorationPath({
        entityId: billId,
        label: this.truncateLabel(billTitle, 16),
        type: ENTITY_TYPES.BILL
      });

      return billEntity;
    } finally {
      this.state.setLoading(`bill::${billNo}`, false);
    }
  }

  // === 展開操作 ===

  // 展開委員主提案
  async expandLegislatorProposedBills(term, name, page = 1, limit = 20) {
    const termNum = parseInt(term) || 11;
    const legId = this.createEntityId(ENTITY_TYPES.LEGISLATOR, termNum, name);
    this.state.setLoading(`expand::proposed::${legId}`, true);

    try {
      const res = await api.getLegislatorProposeBills(termNum, name, page, limit);
      const bills = res.bills || [];
      const total = res.total || 0;

      const entities = [];
      const relationships = [];

      for (const b of bills) {
        const bNo = b['議案編號'];
        if (!bNo) continue;
        const billId = this.createEntityId(ENTITY_TYPES.BILL, bNo);
        const title = b['議案名稱'] || '法律案';

        entities.push({
          id: billId,
          type: ENTITY_TYPES.BILL,
          label: this.truncateLabel(title, 26),
          sublabel: `${b['議案狀態'] || '審查中'} ｜ ${formatDate(b['提案日期'] || b['最新進度日期'])}`,
          metadata: {
            billNo: bNo,
            fullTitle: title,
            status: b['議案狀態'] || '',
            date: b['最新進度日期'] || b['提案日期'] || '',
            term: termNum,
            proposers: b['提案人'] || [name],
            cosigners: b['連署人'] || []
          },
          expanded: false,
          visible: true
        });

        relationships.push({
          id: `proposed::${legId}::${billId}`,
          type: RELATION_TYPES.PROPOSED,
          sourceId: legId,
          targetId: billId,
          label: RELATION_LABELS.proposed
        });
      }

      // 聚合節點：若還有更多筆數未展示
      const loadedCount = page * limit;
      if (total > loadedCount) {
        const remaining = total - loadedCount;
        const aggId = `aggregate::proposed::${legId}::p${page + 1}`;
        entities.push({
          id: aggId,
          type: ENTITY_TYPES.BILL,
          isAggregate: true,
          label: `+${remaining} 筆提案`,
          sublabel: `點擊載入下一頁 (共 ${total} 筆)`,
          metadata: { parentId: legId, relationType: 'proposed', term: termNum, name, nextPage: page + 1 },
          expanded: false,
          visible: true
        });

        relationships.push({
          id: `proposed::${legId}::${aggId}`,
          type: RELATION_TYPES.PROPOSED,
          sourceId: legId,
          targetId: aggId,
          label: '更多提案'
        });
      }

      this.state.addEntities(entities);
      this.state.addRelationships(relationships);
      this.state.toggleExpand(legId, true);

      return { total, count: bills.length, hasMore: total > loadedCount };
    } finally {
      this.state.setLoading(`expand::proposed::${legId}`, false);
    }
  }

  // 展開委員連署提案
  async expandLegislatorCosignedBills(term, name, page = 1, limit = 20) {
    const termNum = parseInt(term) || 11;
    const legId = this.createEntityId(ENTITY_TYPES.LEGISLATOR, termNum, name);
    this.state.setLoading(`expand::cosigned::${legId}`, true);

    try {
      const res = await api.getLegislatorCosignBills(termNum, name, page, limit);
      const bills = res.bills || [];
      const total = res.total || 0;

      const entities = [];
      const relationships = [];

      for (const b of bills) {
        const bNo = b['議案編號'];
        if (!bNo) continue;
        const billId = this.createEntityId(ENTITY_TYPES.BILL, bNo);
        const title = b['議案名稱'] || '法律案';

        entities.push({
          id: billId,
          type: ENTITY_TYPES.BILL,
          label: this.truncateLabel(title, 26),
          sublabel: `${b['議案狀態'] || '審查中'} ｜ ${formatDate(b['最新進度日期'] || b['提案日期'])}`,
          metadata: {
            billNo: bNo,
            fullTitle: title,
            status: b['議案狀態'] || '',
            date: b['最新進度日期'] || b['提案日期'] || '',
            term: termNum,
            proposers: b['提案人'] || [],
            cosigners: b['連署人'] || [name]
          },
          expanded: false,
          visible: true
        });

        relationships.push({
          id: `cosigned::${legId}::${billId}`,
          type: RELATION_TYPES.COSIGNED,
          sourceId: legId,
          targetId: billId,
          label: RELATION_LABELS.cosigned
        });
      }

      // 聚合節點
      const loadedCount = page * limit;
      if (total > loadedCount) {
        const remaining = total - loadedCount;
        const aggId = `aggregate::cosigned::${legId}::p${page + 1}`;
        entities.push({
          id: aggId,
          type: ENTITY_TYPES.BILL,
          isAggregate: true,
          label: `+${remaining} 筆連署`,
          sublabel: `點擊載入下一頁 (共 ${total} 筆)`,
          metadata: { parentId: legId, relationType: 'cosigned', term: termNum, name, nextPage: page + 1 },
          expanded: false,
          visible: true
        });

        relationships.push({
          id: `cosigned::${legId}::${aggId}`,
          type: RELATION_TYPES.COSIGNED,
          sourceId: legId,
          targetId: aggId,
          label: '更多連署'
        });
      }

      this.state.addEntities(entities);
      this.state.addRelationships(relationships);
      this.state.toggleExpand(legId, true);

      return { total, count: bills.length, hasMore: total > loadedCount };
    } finally {
      this.state.setLoading(`expand::cosigned::${legId}`, false);
    }
  }

  // 展開委員出席會議
  async expandLegislatorMeetings(term, name, page = 1, limit = 20) {
    const termNum = parseInt(term) || 11;
    const legId = this.createEntityId(ENTITY_TYPES.LEGISLATOR, termNum, name);
    this.state.setLoading(`expand::meetings::${legId}`, true);

    try {
      const res = await api.getLegislatorMeets(termNum, name, page, limit);
      const meets = res.meets || [];
      const total = res.total || 0;

      const entities = [];
      const relationships = [];

      for (const m of meets) {
        const code = m['會議代碼'];
        if (!code) continue;
        const meetId = this.createEntityId(ENTITY_TYPES.MEETING, code);
        const title = m['會議標題'] || m.name || '會議紀錄';
        const dateStr = (m['日期'] && m['日期'][0]) ? formatDate(m['日期'][0]) : '';

        entities.push({
          id: meetId,
          type: ENTITY_TYPES.MEETING,
          label: this.truncateLabel(title, 24),
          sublabel: `${dateStr} ｜ ${m['會議種類'] || '會議'}`,
          metadata: {
            meetingCode: code,
            title,
            dates: m['日期'] || [],
            type: m['會議種類'] || '',
            session: m['會期'] || null
          },
          expanded: false,
          visible: true
        });

        relationships.push({
          id: `attended::${legId}::${meetId}`,
          type: RELATION_TYPES.ATTENDED,
          sourceId: legId,
          targetId: meetId,
          label: RELATION_LABELS.attended
        });
      }

      this.state.addEntities(entities);
      this.state.addRelationships(relationships);
      this.state.toggleExpand(legId, true);

      return { total, count: meets.length };
    } finally {
      this.state.setLoading(`expand::meetings::${legId}`, false);
    }
  }

  // 展開委員質詢案件
  async expandLegislatorInterpellations(term, name, page = 1, limit = 15) {
    const termNum = parseInt(term) || 11;
    const legId = this.createEntityId(ENTITY_TYPES.LEGISLATOR, termNum, name);
    this.state.setLoading(`expand::interpellations::${legId}`, true);

    try {
      const res = await api.getLegislatorInterpellations(termNum, name, page, limit);
      const list = res.interpellations || [];
      const total = res.total || 0;

      const entities = [];
      const relationships = [];

      for (const item of list) {
        const queryNo = item['質詢編號'] || `${termNum}-${item['會期'] || 1}-${item['質詢起始頁'] || Math.random()}`;
        const itemId = this.createEntityId(ENTITY_TYPES.INTERPELLATION, queryNo);
        const subject = item['事由'] || item['標題'] || '委員質詢案';

        entities.push({
          id: itemId,
          type: ENTITY_TYPES.INTERPELLATION,
          label: this.truncateLabel(subject, 24),
          sublabel: `${formatDate(item['刊登日期'] || item['日期'])} ｜ 第 ${item['會期'] || 1} 會期`,
          metadata: {
            queryNo,
            subject,
            date: item['刊登日期'] || item['日期'] || '',
            description: item['說明'] || '',
            response: item['答復內容'] || ''
          },
          expanded: false,
          visible: true
        });

        relationships.push({
          id: `questioned::${legId}::${itemId}`,
          type: RELATION_TYPES.QUESTIONED,
          sourceId: legId,
          targetId: itemId,
          label: RELATION_LABELS.questioned
        });
      }

      this.state.addEntities(entities);
      this.state.addRelationships(relationships);
      this.state.toggleExpand(legId, true);

      return { total, count: list.length };
    } finally {
      this.state.setLoading(`expand::interpellations::${legId}`, false);
    }
  }

  // 展開法案連署人
  expandBillCosigners(billEntity, limit = 25) {
    const billId = billEntity.id;
    const cosigners = billEntity.metadata.cosigners || [];
    const term = billEntity.metadata.term || 11;

    const entities = [];
    const relationships = [];

    const displayCosigners = cosigners.slice(0, limit);
    for (const c of displayCosigners) {
      const cId = this.createEntityId(ENTITY_TYPES.LEGISLATOR, term, c);
      entities.push({
        id: cId,
        type: ENTITY_TYPES.LEGISLATOR,
        label: c,
        sublabel: `第 ${term} 屆連署委員`,
        metadata: { term, name: c },
        expanded: false,
        visible: true
      });

      relationships.push({
        id: `cosigned::${cId}::${billId}`,
        type: RELATION_TYPES.COSIGNED,
        sourceId: cId,
        targetId: billId,
        label: RELATION_LABELS.cosigned
      });
    }

    // 若還有更多連署人，產生聚合節點
    if (cosigners.length > limit) {
      const remaining = cosigners.length - limit;
      const aggId = `aggregate::cosigners::${billId}`;
      entities.push({
        id: aggId,
        type: ENTITY_TYPES.LEGISLATOR,
        isAggregate: true,
        label: `+${remaining} 名連署人`,
        sublabel: `共 ${cosigners.length} 名委員連署`,
        metadata: { parentId: billId, term, allCosigners: cosigners },
        expanded: false,
        visible: true
      });

      relationships.push({
        id: `cosigned::${aggId}::${billId}`,
        type: RELATION_TYPES.COSIGNED,
        sourceId: aggId,
        targetId: billId,
        label: '更多連署'
      });
    }

    this.state.addEntities(entities);
    this.state.addRelationships(relationships);
    this.state.toggleExpand(billId, true);

    return { total: cosigners.length, count: displayCosigners.length };
  }
}
