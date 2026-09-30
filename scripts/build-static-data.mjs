// scripts/build-static-data.mjs
/**
 * Legislative Explorer - Node.js Build Script for Term 1 Data
 * Fetches Term 1 historical legislators from lis.ly.gov.tw with SSL_OP_LEGACY_SERVER_CONNECT
 * and saves to static/data/term-01-legislators.json
 */

import https from 'node:https';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const OUT_PATH = path.resolve('static/data/term-01-legislators.json');

// Graceful check: if file already exists, don't break CI/CD if LIS is unreachable
if (fs.existsSync(OUT_PATH) && fs.statSync(OUT_PATH).size > 1000) {
  console.log(`[Build] ${OUT_PATH} already exists (${(fs.statSync(OUT_PATH).size / 1024).toFixed(1)} KB). Run with --force to re-fetch.`);
  if (!process.argv.includes('--force')) {
    process.exit(0);
  }
}

const agent = new https.Agent({
  secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT || 0x4,
  rejectUnauthorized: false
});

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { agent, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  console.log('[Build] Fetching Term 1 list from lis.ly.gov.tw...');
  const listUrl = 'https://lis.ly.gov.tw/lylegismc/lylegismemkmout?000341160000000100000000000019000000003C000000000^1';
  try {
    const html = await fetchUrl(listUrl);
    const regex = /<a\s+href=['"]?(\/lylegisc\/lylegiskmout\?[^'"><\s]+)['"]?[^>]*>(?:<img[^>]*>)?([^<]+)<\/a>/g;
    const matches = [];
    let m;
    while ((m = regex.exec(html)) !== null) {
      matches.push({ path: m[1], name: m[2].trim() });
    }

    console.log(`[Build] Found ${matches.length} legislators. Parsing details...`);
    const results = [];
    for (let i = 0; i < matches.length; i += 20) {
      const batch = matches.slice(i, i + 20);
      const batchResults = await Promise.all(batch.map(async (item) => {
        try {
          const detailHtml = await fetchUrl(`https://lis.ly.gov.tw${item.path}`);
          const fieldMatches = [...detailHtml.matchAll(/<td\s+class=dett01>([^<]+)<\/td>\s*<td\s+class=dett02>(.*?)<\/td>/gs)];
          const fields = Object.fromEntries(fieldMatches.map(f => [f[1].trim(), f[2].replace(/<[^>]+>/g, '\n').trim()]));

          return {
            屆: 1,
            委員姓名: item.name,
            委員英文姓名: '',
            性別: fields['性別'] || '',
            黨籍: fields['黨籍'] || '中國國民黨',
            黨團: fields['黨籍'] || '中國國民黨',
            選區名稱: fields['選區'] || '',
            委員會: (fields['委員會'] || '').split(/[\n;]/).map(s => s.trim()).filter(Boolean),
            到職日: '1948/05/08',
            學歷: [],
            經歷: (fields['簡歷'] || '').split('\n').map(s => s.trim()).filter(Boolean),
            照片位址: '',
            是否離職: '是',
            離職日期: '1993/01/31',
            離職原因: '任期屆滿/第1屆退職',
            備註: fields['備註'] || ''
          };
        } catch {
          return {
            屆: 1,
            委員姓名: item.name,
            委員英文姓名: '',
            性別: '',
            黨籍: '中國國民黨',
            黨團: '中國國民黨',
            選區名稱: '',
            委員會: [],
            到職日: '1948/05/08',
            學歷: [],
            經歷: [],
            照片位址: '',
            是否離職: '是',
            離職日期: '1993/01/31',
            離職原因: '任期屆滿/第1屆退職',
            備註: ''
          };
        }
      }));
      results.push(...batchResults);
    }

    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`[Build] Successfully saved ${results.length} records to ${OUT_PATH}`);
  } catch (err) {
    console.error('[Build] Error fetching from LIS:', err);
    process.exit(1);
  }
}

main();
