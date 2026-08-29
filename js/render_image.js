/* 晨报图片渲染：Canvas 绘制精美长图，可保存/下载 PNG */
'use strict';

const MorningImage = (() => {
  const W = 750;
  const M = 42; // 页边距
  const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';

  function pctColor(v) { return v > 0 ? '#E0343C' : (v < 0 ? '#0E9B57' : '#69708A'); }
  function fmtPct(v) { return (v >= 0 ? '+' : '') + v.toFixed(2) + '%'; }

  function wrap(ctx, text, maxW) {
    const lines = [];
    let line = '';
    for (const ch of String(text)) {
      if (ctx.measureText(line + ch).width > maxW) { lines.push(line); line = ch; }
      else line += ch;
    }
    if (line) lines.push(line);
    return lines;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* 计算整图高度（先量后画） */
  function measure(ctx, s) {
    let h = 0;
    const bodyW = W - M * 2;
    h += 190; // 报头
    h += 28;
    const section = title => { ctx.font = 'bold 30px ' + FONT; h += 46; };
    const marketRows = g => { ctx.font = '27px ' + FONT; h += g.length * 46 + 8; };
    if (s.markets && (s.markets.us || []).concat(s.markets.hk || []).length) {
      section('隔夜外盘'); marketRows((s.markets.us || []).concat(s.markets.hk || [])); h += 16;
    }
    if (s.markets && (s.markets.cn || []).length) {
      section('昨日A股'); marketRows(s.markets.cn);
      if (s.markets.turnoverYi != null) { ctx.font = '24px ' + FONT; h += 38; }
      h += 16;
    }
    ctx.font = '26px ' + FONT;
    if (s.news && s.news.length) {
      section('要闻速递');
      s.news.forEach(n => {
        const text = (n.tag ? '【' + n.tag + '】' : '') + (n.text || '');
        h += wrap(ctx, text, bodyW - 16).length * 40;
        h += 14;
      });
      h += 16;
    }
    if (s.focus && s.focus.length) {
      section('今日关注');
      s.focus.forEach(f => {
        ctx.font = 'bold 28px ' + FONT;
        const themeH = 40;
        ctx.font = '24px ' + FONT;
        const reasonLines = f.reason ? wrap(ctx, f.reason, bodyW - 48 - 24).length * 36 : 0;
        ctx.font = 'bold 25px ' + FONT;
        const targetLines = f.targets ? wrap(ctx, '关注：' + f.targets, bodyW - 48 - 24).length * 36 : 0;
        h += themeH + reasonLines + targetLines + 36;
      });
      h += 16;
    }
    h += 90; // 页脚
    return h;
  }

  function render(s, dateStr) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'alphabetic';

    // 预量高度
    let H = 0;
    try { H = measure(ctx, s); } catch (e) { H = 1200; }
    canvas.height = H;
    const bodyW = W - M * 2;

    // 背景
    ctx.fillStyle = '#F0F3F8';
    ctx.fillRect(0, 0, W, H);

    // 报头渐变
    const grad = ctx.createLinearGradient(0, 0, W, 190);
    grad.addColorStop(0, '#1B57B8');
    grad.addColorStop(1, '#0E3A85');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 190);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 46px ' + FONT;
    ctx.fillText('📊 投顾晨报', M, 92);
    ctx.font = '27px ' + FONT;
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillText(dateStr, M, 142);
    ctx.font = '24px ' + FONT;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,.65)';
    ctx.fillText('投顾工作台', W - M, 142);
    ctx.textAlign = 'left';

    let y = 218;
    const section = (emoji, title) => {
      ctx.fillStyle = '#1546A0';
      roundRect(ctx, M, y - 24, 8, 34, 4); ctx.fill();
      ctx.font = 'bold 30px ' + FONT;
      ctx.fillStyle = '#1C2333';
      ctx.fillText(emoji + ' ' + title, M + 22, y + 2);
      y += 46;
    };
    const marketRows = group => {
      const w = Math.max.apply(null, group.map(q => dispW(q.name))) + 2;
      group.forEach(q => {
        ctx.font = '27px ' + FONT;
        ctx.fillStyle = '#333A4D';
        ctx.fillText(padN(q.name, w), M, y);
        ctx.textAlign = 'right';
        ctx.font = 'bold 28px ' + FONT;
        ctx.fillStyle = '#1C2333';
        ctx.fillText(q.price.toFixed(2), W - M - 128, y);
        ctx.font = 'bold 26px ' + FONT;
        ctx.fillStyle = pctColor(q.pct);
        ctx.fillText(fmtPct(q.pct), W - M, y);
        ctx.textAlign = 'left';
        y += 46;
      });
      y += 8;
    };
    if (s.markets && (s.markets.us || []).concat(s.markets.hk || []).length) {
      section('🌍', '隔夜外盘');
      marketRows((s.markets.us || []).concat(s.markets.hk || []));
      y += 8;
    }
    if (s.markets && (s.markets.cn || []).length) {
      section('📈', '昨日A股');
      marketRows(s.markets.cn);
      if (s.markets.turnoverYi != null) {
        ctx.font = '24px ' + FONT;
        ctx.fillStyle = '#8A6A2F';
        ctx.fillText('两市成交额约 ' + (s.markets.turnoverYi / 10000).toFixed(2) + ' 万亿元', M, y);
        y += 38;
      }
      y += 8;
    }

    if (s.news && s.news.length) {
      section('📰', '要闻速递');
      s.news.forEach((n, i) => {
        let x = M;
        if (n.tag) {
          ctx.font = '22px ' + FONT;
          const tw = ctx.measureText(n.tag).width + 20;
          ctx.fillStyle = '#EEF3FC';
          roundRect(ctx, x, y - 24, tw, 32, 8); ctx.fill();
          ctx.fillStyle = '#1546A0';
          ctx.fillText(n.tag, x + 10, y);
          x += tw + 12;
        }
        ctx.font = '26px ' + FONT;
        ctx.fillStyle = '#333A4D';
        const text = (n.text || '');
        const lines = wrap(ctx, text, W - M - x);
        lines.forEach((ln, li) => { ctx.fillText(ln, x, y + li * 40); x = M + 14; });
        y += lines.length * 40 + 14;
      });
      y += 10;
    }

    if (s.focus && s.focus.length) {
      section('🎯', '今日关注');
      s.focus.forEach(f => {
        ctx.font = 'bold 28px ' + FONT;
        const themeH = 42;
        ctx.font = '24px ' + FONT;
        const reasonLines = f.reason ? wrap(ctx, f.reason, bodyW - 72).length : 0;
        ctx.font = 'bold 25px ' + FONT;
        const targetLines = f.targets ? wrap(ctx, '关注：' + f.targets, bodyW - 72).length : 0;
        const boxH = 26 + themeH + reasonLines * 36 + targetLines * 36 + 20;
        ctx.fillStyle = '#F7F9FC';
        roundRect(ctx, M, y, bodyW, boxH, 16); ctx.fill();
        let iy = y + 44;
        ctx.fillStyle = '#1C2333';
        ctx.font = 'bold 28px ' + FONT;
        ctx.fillText('🔸 ' + (f.theme || ''), M + 24, iy);
        iy += 8;
        if (f.reason) {
          ctx.font = '24px ' + FONT;
          ctx.fillStyle = '#69708A';
          wrap(ctx, f.reason, bodyW - 72).forEach(ln => { iy += 36; ctx.fillText(ln, M + 24, iy); });
        }
        if (f.targets) {
          ctx.font = 'bold 25px ' + FONT;
          ctx.fillStyle = '#B3373E';
          wrap(ctx, '关注：' + f.targets, bodyW - 72).forEach(ln => { iy += 36; ctx.fillText(ln, M + 24, iy); });
        }
        y += boxH + 18;
      });
      y += 8;
    }

    // 页脚
    y += 10;
    ctx.strokeStyle = '#D8DEE9';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(M, y); ctx.lineTo(W - M, y); ctx.stroke();
    y += 38;
    ctx.font = '23px ' + FONT;
    ctx.fillStyle = '#A5ABC0';
    ctx.textAlign = 'center';
    ctx.fillText('个人观点，仅供参考，不构成投资建议', W / 2, y);
    y += 32;
    ctx.fillText('由 投顾工作台 自动生成', W / 2, y);
    ctx.textAlign = 'left';

    return canvas.toDataURL('image/png');
  }

  function dispW(s) {
    let w = 0;
    for (const ch of String(s)) w += ch.charCodeAt(0) > 255 ? 2 : 1;
    return w;
  }
  function padN(s, w) {
    s = String(s);
    while (dispW(s) < w) s += '　';
    return s;
  }

  /* 纯文本降级渲染（AI 结构化解析失败时） */
  function renderPlain(text, dateStr) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    const ctx = canvas.getContext('2d');
    ctx.font = '26px ' + FONT;
    const lines = [];
    String(text).split('\n').forEach(l => wrap(ctx, l, W - M * 2).forEach(x => lines.push(x)));
    const H = 218 + lines.length * 40 + 130;
    canvas.height = H;
    const grad = ctx.createLinearGradient(0, 0, W, 190);
    grad.addColorStop(0, '#1B57B8');
    grad.addColorStop(1, '#0E3A85');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, 190);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 46px ' + FONT;
    ctx.fillText('📊 投顾晨报', M, 92);
    ctx.font = '27px ' + FONT;
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillText(dateStr, M, 142);
    let y = 248;
    ctx.font = '26px ' + FONT;
    ctx.fillStyle = '#333A4D';
    lines.forEach(l => { ctx.fillText(l, M, y); y += 40; });
    return canvas.toDataURL('image/png');
  }

  return { render, renderPlain };
})();
