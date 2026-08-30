/* 财经快讯：新浪财经7×24直播（JSONP script 方式，免跨域、无需密钥） */
'use strict';

const News = (() => {
  /* 返回 [{time:'HH:MM', text}]，按时间倒序 */
  function fetchNews(count) {
    return new Promise((resolve, reject) => {
      /* 注意：回调名不能以 _ 开头，新浪接口对这类名字会挂起不响应 */
      const cb = 'sinaNewsCb' + Date.now();
      const s = document.createElement('script');
      s.src = 'https://zhibo.sina.com.cn/api/zhibo/feed?callback=' + cb +
        '&page=1&page_size=' + (count || 30) + '&zhibo_id=152&tag=0&r=' + Math.random();
      const timer = setTimeout(() => { cleanup(); reject(new Error('快讯请求超时')); }, 9000);
      function cleanup() { clearTimeout(timer); try { delete window[cb]; } catch (e) { window[cb] = undefined; } s.remove(); }
      window[cb] = function (data) {
        cleanup();
        try {
          const list = (data.result.data.feed || {}).list || [];
          const items = list.map(it => {
            const t = new Date(it.create_time);
            const hm = isNaN(t.getTime()) ? '' : pad2(t.getHours()) + ':' + pad2(t.getMinutes());
            const text = String(it.rich_text || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            return { time: hm, text };
          }).filter(x => x.text && x.text.length > 8);
          if (!items.length) { reject(new Error('快讯为空')); return; }
          resolve(items);
        } catch (e) { reject(new Error('快讯解析失败')); }
      };
      s.onerror = () => { cleanup(); reject(new Error('快讯服务不可用')); };
      document.head.appendChild(s);
    });
  }

  /* 全市场券商研报风向（东方财富研报接口，CORS 全开放，浏览器可直连）
     返回 {total, stocks:[{name,code,count,orgs,title}], industries:[{name,count,title}]} */
  function fetchReports() {
    const end = todayStr();
    const t = new Date(); t.setDate(t.getDate() - 1);
    const start = dstr(t);
    const H = { "Referer": "https://data.eastmoney.com/" };
    const aggStocks = list => {
      const agg = {};
      (list || []).forEach(it => {
        if (!it.stockCode || !it.stockName) return;
        const e = agg[it.stockCode] = agg[it.stockCode] || { name: it.stockName, code: it.stockCode, count: 0, orgs: [], title: '' };
        e.count++;
        if (it.orgSName && e.orgs.indexOf(it.orgSName) < 0) e.orgs.push(it.orgSName);
        if (!e.title && it.title) e.title = it.title;
      });
      return Object.keys(agg).map(k => agg[k]).sort((a, b) => b.count - a.count).slice(0, 6);
    };
    return Promise.all([
      fetch('https://reportapi.eastmoney.com/report/list?pageNo=1&pageSize=100&code=*&industryCode=*&industry=*&rating=*&ratingChange=*&beginTime=' + start + '&endTime=' + end + '&qType=0', { headers: H }).then(r => r.json()).catch(() => ({})),
      fetch('https://reportapi.eastmoney.com/report/list?pageNo=1&pageSize=60&code=*&industryCode=*&industry=*&rating=*&ratingChange=*&beginTime=' + start + '&endTime=' + end + '&qType=1', { headers: H }).then(r => r.json()).catch(() => ({}))
    ]).then(rs => {
      const stocks = aggStocks((rs[0].data || []));
      const indAgg = {};
      ((rs[1].data || [])).forEach(it => {
        if (!it.industryName) return;
        const e = indAgg[it.industryName] = indAgg[it.industryName] || { name: it.industryName, count: 0, title: '' };
        e.count++;
        if (!e.title && it.title) e.title = it.title;
      });
      const industries = Object.keys(indAgg).map(k => indAgg[k]).sort((a, b) => b.count - a.count).slice(0, 4);
      return { total: rs[0].hits || 0, stocks: stocks, industries: industries };
    });
  }

  return { fetchNews, fetchReports };
})();
