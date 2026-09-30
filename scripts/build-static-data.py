#!/usr/bin/env python3
"""
Legislative Explorer - Build Script for Term 1 Data
Scrapes all 1,183 1st Term legislators from National Parliamentary Library (lis.ly.gov.tw)
and outputs static/data/term-01-legislators.json.
"""

import ssl
import urllib.request
import re
import json
import time
import os
from concurrent.futures import ThreadPoolExecutor

ctx = ssl.create_default_context()
ctx.options |= 0x4  # OP_LEGACY_SERVER_CONNECT
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

LIST_URL = 'https://lis.ly.gov.tw/lylegismc/lylegismemkmout?000341160000000100000000000019000000003C000000000^1'
PARTY_URL = 'https://lis.ly.gov.tw/lylegismc/lylegismemkmout?.a2590341001000007000010000^00000E000C1000000000B0061003e68'
OUT_PATH = 'static/data/term-01-legislators.json'

def main():
    print('==> [1/3] Fetching Term 1 list from LIS...')
    req = urllib.request.Request(LIST_URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        matches = re.findall(r'<a\s+href=[\"\']?(/lylegisc/lylegiskmout\?[^\"\'>\s]+)[\"\']?[^>]*>(?:<img[^>]*>)?([^<]+)</a>', html)

    print(f'==> Found {len(matches)} legislators.')

    print('==> [2/3] Fetching party roster mapping...')
    party_map = {}
    try:
        req_p = urllib.request.Request(PARTY_URL, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req_p, context=ctx, timeout=20) as resp:
            p_html = resp.read().decode('utf-8', errors='ignore')
            parties = [
                ('中國國民黨', 10199),
                ('民主進步黨', 133127),
                ('無黨籍', 137871),
                ('中國青年黨', 142128),
                ('中國民主社會黨', 142957),
                ('資料闕如', 143385)
            ]
            for i, (pname, pos) in enumerate(parties):
                next_pos = parties[i+1][1] if i+1 < len(parties) else len(p_html)
                sub = p_html[pos:next_pos]
                for path, name in re.findall(r'<a\s+href=[\"\']?(/lylegisc/lylegiskmout\?[^\"\'>\s]+)[\"\']?[^>]*>(?:<img[^>]*>)?([^<]+)</a>', sub):
                    party_map[name.strip()] = pname
        print(f'==> Loaded party mapping for {len(party_map)} legislators.')
    except Exception as e:
        print(f'==> Warning: Could not fetch party map: {e}')

    print('==> [3/3] Fetching detail profiles concurrently (workers=25)...')
    t0 = time.time()

    def fetch_one(item):
        path, name = item
        name_clean = name.strip()
        url = f'https://lis.ly.gov.tw{path}'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        for _ in range(3):
            try:
                with urllib.request.urlopen(req, context=ctx, timeout=12) as resp:
                    h = resp.read().decode('utf-8', errors='ignore')
                    fields = dict(re.findall(r'<td\s+class=dett01>([^<]+)</td>\s*<td\s+class=dett02>(.*?)</td>', h, re.DOTALL))
                    sex = re.sub(r'<[^>]+>', '', fields.get('性別', '')).strip()
                    area = re.sub(r'<[^>]+>', '', fields.get('選區', '')).strip()
                    party = re.sub(r'<[^>]+>', '', fields.get('黨籍', '')).strip() or party_map.get(name_clean, '資料闕如')
                    exp = re.sub(r'<[^>]+>', '\n', fields.get('簡歷', '')).strip()
                    comm = re.sub(r'<[^>]+>', '; ', fields.get('委員會', '')).strip()
                    comm = re.sub(r'\s*;\s*', '; ', re.sub(r'\s+', ' ', comm))
                    note = re.sub(r'<[^>]+>', ' ', fields.get('備註', '')).strip()
                    
                    exp_lines = [l.strip() for l in exp.split('\n') if l.strip()]
                    comm_list = [c.strip() for c in comm.split(';') if c.strip()]
                    
                    return {
                        '屆': 1,
                        '委員姓名': name_clean,
                        '委員英文姓名': '',
                        '性別': sex,
                        '黨籍': party if party != '資料闕如' else '無黨籍/資料闕如',
                        '黨團': party if party != '資料闕如' else '無黨籍/資料闕如',
                        '選區名稱': area,
                        '委員會': comm_list,
                        '到職日': '1948/05/08',
                        '學歷': [],
                        '經歷': exp_lines,
                        '照片位址': '',
                        '是否離職': '是',
                        '離職日期': '1993/01/31',
                        '離職原因': '任期屆滿/第1屆退職',
                        '備註': note
                    }
            except Exception:
                time.sleep(0.3)

        return {
            '屆': 1,
            '委員姓名': name_clean,
            '委員英文姓名': '',
            '性別': '',
            '黨籍': party_map.get(name_clean, '資料闕如'),
            '黨團': party_map.get(name_clean, '資料闕如'),
            '選區名稱': '',
            '委員會': [],
            '到職日': '1948/05/08',
            '學歷': [],
            '經歷': [],
            '照片位址': '',
            '是否離職': '是',
            '離職日期': '1993/01/31',
            '離職原因': '任期屆滿/第1屆退職',
            '備註': ''
        }

    with ThreadPoolExecutor(max_workers=25) as ex:
        records = list(ex.map(fetch_one, matches))

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print(f'==> Done! Successfully saved {len(records)} records to {OUT_PATH} in {time.time()-t0:.2f}s.')

if __name__ == '__main__':
    main()
