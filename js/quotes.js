/* 行情：腾讯行情接口（script 方式加载，免跨域、无需密钥），GBK 解码 */
'use strict';

const Quotes = (() => {
  const REFRESH_MS = 15000;
  let cache = {};        // code -> {name, price, prev, change, pct, time, high, low, pe, mv}
  let lastFetch = 0;
  let inflight = null;

  function normalizeCode(s) {
    s = String(s || '').trim().toLowerCase().replace(/\s/g, '');
    if (!s) return null;
    if (/^(sh|sz|bj)\d{5,6}$/.test(s)) return s;
    if (/^\d{6}$/.test(s)) {
      const c = s[0];
      if (c === '5' || c === '6' || c === '9') return 'sh' + s;   // 沪：股票/ETF/B股
      if (c === '0' || c === '1' || c === '2' || c === '3') return 'sz' + s; // 深：主板/ETF/创业板
      if (c === '4' || c === '8') return 'bj' + s;                // 北交所
    }
    return null;
  }

  function parseOne(v) {
    if (!v || typeof v !== 'string') return null;
    const p = v.split('~');
    if (p.length < 32) return null;
    const num = x => { const n = parseFloat(p[x]); return isNaN(n) ? null : n; };
    return {
      name: p[1] || '',
      code: p[2] || '',
      price: num(3),
      prev: num(4),
      change: num(31),
      pct: num(32),
      high: num(33),
      low: num(34),
      time: p[30] || '',
      pe: num(39),
      mv: num(45)
    };
  }

  /* 通过 <script> 拉取，响应形如 v_sh600519="1~贵州茅台~..." */
  function fetchRaw(codes) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.charset = 'gbk';
      s.src = 'https://qt.gtimg.cn/q=' + codes.join(',') + '&r=' + Math.random();
      const timer = setTimeout(() => { cleanup(); reject(new Error('行情请求超时')); }, 8000);
      function cleanup() { clearTimeout(timer); s.remove(); }
      s.onload = () => { cleanup(); resolve(); };
      s.onerror = () => { cleanup(); reject(new Error('行情服务不可用')); };
      document.head.appendChild(s);
    });
  }

  async function fetchQuotes(codes) {
    codes = Array.from(new Set(codes.filter(Boolean)));
    if (!codes.length) return {};
    await fetchRaw(codes);
    const out = {};
    codes.forEach(c => {
      const data = parseOne(window['v_' + c]);
      if (data) { out[c] = data; cache[c] = data; }
    });
    lastFetch = Date.now();
    return out;
  }

  /* 带缓存的批量获取：首页同时请求指数 + 自选，一次搞定 */
  async function getAll(codes, force) {
    const fresh = Date.now() - lastFetch < REFRESH_MS;
    if (inflight) return inflight;
    if (!force && fresh && codes.every(c => cache[c])) return pick(codes);
    inflight = fetchQuotes(codes).finally(() => { inflight = null; });
    return inflight.then(() => pick(codes));
  }

  function pick(codes) {
    const out = {};
    codes.forEach(c => { if (cache[c]) out[c] = cache[c]; });
    return out;
  }

  /* 拉一只票，用于添加自选时取名称 */
  async function lookup(code) {
    const r = await fetchQuotes([code]);
    return r[code] || null;
  }

  return { normalizeCode, getAll, lookup, REFRESH_MS };
})();
