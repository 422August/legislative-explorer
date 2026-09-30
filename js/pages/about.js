// js/pages/about.js
import { createElement } from '../utils.js';

export function renderAbout() {
  const container = createElement('div', { className: 'about-page' });

  // Breadcrumb
  const breadcrumb = createElement('nav', { className: 'breadcrumb', 'aria-label': '檢索路徑' }, [
    createElement('a', { href: '#/', text: '歷屆索引目錄' }),
    createElement('span', { className: 'breadcrumb-separator', text: '/' }),
    createElement('span', { text: '系統架構與資料庫說明' })
  ]);
  container.appendChild(breadcrumb);

  const card = createElement('div', {
    style: 'background-color: var(--color-bg-card); border: 1px solid var(--color-border); padding: var(--space-6); line-height: 1.8;'
  }, [
    createElement('h1', { className: 'page-title', text: '系統架構與資料來源說明' }),
    createElement('p', {
      style: 'font-size: 0.9375rem; color: var(--color-text-secondary); margin-bottom: 20px;',
      text: '立法院歷屆問政檢索系統 (Legislative Explorer) 是一項以公共資料研究與學術分析為核心的純靜態國會資料庫工具，提供自民國 37 年（1948 年）行憲第 1 屆至現任第 11 屆立法委員資料、法律提案、議程會議與質詢紀錄。'
    }),

    createElement('h2', { style: 'font-size: 1.0625rem; font-weight: 700; margin: 20px 0 8px; border-bottom: 1px solid var(--color-border); padding-bottom: 4px; color: var(--color-primary);', text: '一、技術架構與設計原則' }),
    createElement('p', {
      text: '為確保系統的高可靠度、免除伺服器維護負擔並利於學術社群開源審查，本系統堅持採用「零自建後端、零自建資料庫」之純前端靜態架構：'
    }),
    createElement('ul', { style: 'list-style: square; padding-left: 20px; font-size: 0.875rem;' }, [
      createElement('li', { text: '全原生 Web 標準：僅使用語意化 HTML5、模組化 CSS3 與原生 JavaScript (ES2020+)，無任何重量級前端框架依賴。' }),
      createElement('li', { text: 'Hash 路由相容性：採用 #/ 雜湊路由機制，完全相容於 GitHub Pages 與各類靜態主機，直連各屆委員深層檔案均不發生 404 錯誤。' }),
      createElement('li', { text: '無伺服器中介：所有資料均直接由使用者之瀏覽器連線至官方開放平台與公眾 API 端點，不經由第三方伺服器暫存個人瀏覽足跡。' })
    ]),

    createElement('h2', { style: 'font-size: 1.0625rem; font-weight: 700; margin: 20px 0 8px; border-bottom: 1px solid var(--color-border); padding-bottom: 4px; color: var(--color-primary);', text: '二、資料來源與雙軌擷取策略' }),
    createElement('p', {
      text: '立法院官方開放資料集因資安政策與伺服器歷史架構，存在跨來源資源共用（CORS）與舊版 TLS 連線協議限制。本專案採嚴謹之雙軌架構整合歷屆完整紀錄：'
    }),
    createElement('ul', { style: 'list-style: square; padding-left: 20px; font-size: 0.875rem;' }, [
      createElement('li', {
        html: '<strong>第 2 至 11 屆全面改選國會</strong>：透過台灣公民科技社群維護之 <a href="https://v2.ly.govapi.tw/" target="_blank" rel="noopener">OpenFun v2 API</a> 取得即時資料。該 API 每日定時與立法院開放資料平台（data.ly.gov.tw 之 Dataset 9、16、20、42）進行資料同步，具備原生 CORS 支援與標準 OpenAPI 3.0 規範。'
      }),
      createElement('li', {
        html: '<strong>第 1 屆行憲國會（1948–1993）</strong>：國會全面改選前之「萬年國會」共 1,183 位立法代表檔案未納入現行開放資料 REST API。本專案透過建置程式自 <a href="https://lis.ly.gov.tw/" target="_blank" rel="noopener">立法院國會圖書館「立法菁英」典藏庫</a> 爬取結構化名錄、選區省籍與生平經歷，輸出為預編譯離線 JSON 檔案供瀏覽器檢索。'
      }),
      createElement('li', {
        html: '<strong>照片肖像與原始文書</strong>：委員公務肖像與法律提案之關係文書（PDF/DOC）皆直接引用立法院全球資訊網 CDN 網址，確保影像與官方公告一致。'
      })
    ]),

    createElement('h2', { style: 'font-size: 1.0625rem; font-weight: 700; margin: 20px 0 8px; border-bottom: 1px solid var(--color-border); padding-bottom: 4px; color: var(--color-primary);', text: '三、本機快取與效能控制' }),
    createElement('p', {
      text: '本系統於瀏覽器端整合 IndexedDB 交易式快取機制。立法委員基本名冊快取期限為 24 小時，問政提案與會議紀錄快取 2 小時。在網路短暫離線或重複檢索時，可即時由快取呈現歷史資訊，有效減少公眾 API 之頻寬負擔。'
    }),

    createElement('h2', { style: 'font-size: 1.0625rem; font-weight: 700; margin: 20px 0 8px; border-bottom: 1px solid var(--color-border); padding-bottom: 4px; color: var(--color-primary);', text: '四、授權條款與免責聲明' }),
    createElement('p', {
      text: '本系統展示之國會公開資訊均遵循中華民國「政府資料開放授權條款」及知識共享（Creative Commons）署名 4.0 國際授權（CC-BY-4.0）規範。本平台為獨立學術與技術研究專案，非立法院官方網站，亦無任何政黨偏向；所有法律草案之最新審議進度與議事錄，均應以立法院公報正本及立法院官方網站正式公告為準。'
    })
  ]);

  container.appendChild(card);
  return container;
}
