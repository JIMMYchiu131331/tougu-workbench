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

  return { fetchNews };
})();
