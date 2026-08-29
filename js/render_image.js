/* 晨报图片渲染：深蓝金融风长图（Canvas），可保存/下载 PNG */
'use strict';

const MorningImage = (() => {
  const W = 750;
  const M = 44; // 页边距
  const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
  const GOLD = '#E8C878';
  const GOLD_DIM = '#C9A85C';
  const TXT = '#FFFFFF';
  const SUB = '#A8B3CC';
  const FAINT = '#5F6E8C';

  function pctColor(v) { return v > 0 ? '#FF5C5C' : (v < 0 ? '#34D399' : SUB); }
  function pctBg(v) { return v > 0 ? 'rgba(255,92,92,0.16)' : (v < 0 ? 'rgba(52,211,153,0.16)' : 'rgba(255,255,255,0.08)'); }
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

  /* 布局常量（measure 与 draw 共用，保证一致） */
  const TILE_W = (W - M * 2 - 14) / 2;
  const TILE_H = 118;
  const TILE_GAP = 14;

  function tileRows(n) { return Math.ceil(n / 2); }
  function tilesH(n) { return tileRows(n) * TILE_H + (tileRows(n) - 1) * TILE_GAP; }
  function secH() { return 58; }

  function focusCardH(ctx, f) {
    const inner = W - M * 2 - 48;
    ctx.font = '24px ' + FONT;
    const reasonLines = f.reason ? wrap(ctx, f.reason, inner).length : 0;
    const targets = (f.targets || '').split('、').filter(Boolean);
    let chipRows = targets.length ? 1 : 0, rowW = 0;
    ctx.font = 'bold 24px ' + FONT;
    targets.forEach(t => {
      const cw = ctx.measureText(t).width + 34;
      if (rowW + cw > inner) { chipRows++; rowW = 0; }
      rowW += cw;
    });
    return 30 + 42 + reasonLines * 36 + (chipRows ? 14 + chipRows * 46 : 0) + 16;
  }

  function measure(ctx, s) {
    let h = 226; // 报头
    if (s.markets && (s.markets.us || []).concat(s.markets.hk || []).length) {
      h += secH() + tilesH((s.markets.us || []).length + (s.markets.hk || []).length) + 14;
    }
    if (s.markets && (s.markets.cn || []).length) {
      h += secH() + tilesH(s.markets.cn.length) + 14;
      if (s.markets.turnoverYi != null) h += 62;
    }
    ctx.font = '26px ' + FONT;
    if (s.news && s.news.length) {
      h += secH();
      s.news.forEach(n => {
        const text = (n.text || '');
        h += Math.max(38, wrap(ctx, text, W - M * 2 - 52).length * 38) + 18;
      });
      h += 10;
    }
    if (s.focus && s.focus.length) {
      h += secH();
      s.focus.forEach(f => { h += focusCardH(ctx, f) + 16; });
      h += 6;
    }
    h += 92; // 页脚
    return h;
  }

  /* 报头装饰：低透明度蜡烛图 */
  function drawCandles(ctx, x0, y0, w, h) {
    const n = 9;
    const cw = w / n;
    for (let i = 0; i < n; i++) {
      const cx = x0 + i * cw + cw / 2;
      const seed = (i * 37 + 13) % 100 / 100;
      const up = i % 2 === 0;
      const bh = h * (0.28 + seed * 0.5);
      const yTop = y0 + h * (0.55 - seed * 0.45) + (up ? 0 : h * 0.12);
      ctx.strokeStyle = up ? 'rgba(232,200,120,0.20)' : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, yTop - h * 0.08); ctx.lineTo(cx, yTop + bh + h * 0.08); ctx.stroke();
      ctx.fillStyle = up ? 'rgba(232,200,120,0.16)' : 'rgba(255,255,255,0.10)';
      ctx.fillRect(cx - cw * 0.26, yTop, cw * 0.52, bh);
    }
  }

  function sectionHead(ctx, y, emoji, title) {
    ctx.fillStyle = GOLD;
    roundRect(ctx, M, y + 4, 6, 30, 3); ctx.fill();
    ctx.font = 'bold 30px ' + FONT;
    ctx.fillStyle = TXT;
    ctx.fillText(emoji + ' ' + title, M + 20, y + 30);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(M, y + 44, W - M * 2, 2);
  }

  function tile(ctx, x, y, q) {
    roundRect(ctx, x, y, TILE_W, TILE_H, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.055)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.font = '23px ' + FONT;
    ctx.fillStyle = SUB;
    ctx.fillText(q.name, x + 22, y + 34);
    ctx.font = 'bold 33px ' + FONT;
    ctx.fillStyle = TXT;
    ctx.fillText(q.price.toFixed(2), x + 22, y + 84);
    // 涨跌胶囊
    ctx.font = 'bold 24px ' + FONT;
    const pt = fmtPct(q.pct);
    const pw = ctx.measureText(pt).width + 26;
    roundRect(ctx, x + TILE_W - pw - 18, y + 56, pw, 38, 19);
    ctx.fillStyle = pctBg(q.pct); ctx.fill();
    ctx.fillStyle = pctColor(q.pct);
    ctx.fillText(pt, x + TILE_W - pw - 18 + 13, y + 82);
  }

  function render(s, dateStr) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'alphabetic';
    let H = 1600;
    try { H = measure(ctx, s); } catch (e) { H = 1800; }
    canvas.height = H;
    const bodyW = W - M * 2;

    // 背景：深蓝渐变
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0A1228');
    bg.addColorStop(0.5, '#0D1B38');
    bg.addColorStop(1, '#0A1228');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 报头
    const hg = ctx.createLinearGradient(0, 0, W, 226);
    hg.addColorStop(0, 'rgba(21,70,160,0.55)');
    hg.addColorStop(1, 'rgba(10,18,40,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, W, 226);
    drawCandles(ctx, 380, 96, 320, 108);
    ctx.fillStyle = GOLD;
    ctx.fillRect(M, 52, 64, 5);
    ctx.fillStyle = TXT;
    ctx.font = 'bold 52px ' + FONT;
    ctx.fillText('投顾晨报', M, 132);
    ctx.font = '27px ' + FONT;
    ctx.fillStyle = GOLD;
    ctx.fillText(dateStr, M, 182);

    let y = 226;

    const drawTiles = group => {
      group.forEach((q, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        tile(ctx, M + col * (TILE_W + TILE_GAP), y + row * (TILE_H + TILE_GAP), q);
      });
      y += tilesH(group.length) + 14;
    };

    if (s.markets && (s.markets.us || []).concat(s.markets.hk || []).length) {
      sectionHead(ctx, y, '🌍', '隔夜外盘');
      y += secH();
      drawTiles((s.markets.us || []).concat(s.markets.hk || []));
    }
    if (s.markets && (s.markets.cn || []).length) {
      sectionHead(ctx, y, '📈', '昨日A股');
      y += secH();
      drawTiles(s.markets.cn);
      if (s.markets.turnoverYi != null) {
        // 成交额金色胶囊
        roundRect(ctx, M, y, bodyW, 56, 14);
        ctx.fillStyle = 'rgba(232,200,120,0.10)'; ctx.fill();
        ctx.strokeStyle = 'rgba(232,200,120,0.35)'; ctx.lineWidth = 1; ctx.stroke();
        // 小柱状图标
        const bars = [16, 26, 36];
        bars.forEach((bh, i) => {
          ctx.fillStyle = i === 2 ? GOLD : 'rgba(232,200,120,0.55)';
          ctx.fillRect(M + 22 + i * 10, y + 44 - bh, 6, bh);
        });
        ctx.font = 'bold 26px ' + FONT;
        ctx.fillStyle = GOLD;
        ctx.fillText('两市成交额  ' + (s.markets.turnoverYi / 10000).toFixed(2) + ' 万亿元', M + 60, y + 37);
        y += 62;
      }
      y += 14;
    }

    if (s.news && s.news.length) {
      sectionHead(ctx, y, '📰', '要闻速递');
      y += secH();
      s.news.forEach((n, i) => {
        // 金色序号圆
        ctx.beginPath(); ctx.arc(M + 17, y + 12, 17, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(232,200,120,0.16)'; ctx.fill();
        ctx.fillStyle = GOLD;
        ctx.font = 'bold 22px ' + FONT;
        ctx.textAlign = 'center';
        ctx.fillText(String(i + 1), M + 17, y + 20);
        ctx.textAlign = 'left';
        ctx.font = '26px ' + FONT;
        ctx.fillStyle = '#DCE3F0';
        const lines = wrap(ctx, n.text || '', bodyW - 52);
        lines.forEach((ln, li) => ctx.fillText(ln, M + 46, y + 20 + li * 38));
        y += Math.max(38, lines.length * 38) + 18;
      });
      y += 6;
    }

    if (s.focus && s.focus.length) {
      sectionHead(ctx, y, '🎯', '今日关注');
      y += secH();
      s.focus.forEach(f => {
        const ch = focusCardH(ctx, f);
        roundRect(ctx, M, y, bodyW, ch, 16);
        ctx.fillStyle = 'rgba(232,200,120,0.07)'; ctx.fill();
        ctx.fillStyle = GOLD; ctx.fillRect(M, y + 14, 4, ch - 28);
        let iy = y + 30;
        ctx.font = 'bold 28px ' + FONT;
        ctx.fillStyle = GOLD;
        ctx.fillText(f.theme || '', M + 28, iy + 18);
        iy += 42;
        if (f.reason) {
          ctx.font = '24px ' + FONT;
          ctx.fillStyle = '#B9C4D8';
          wrap(ctx, f.reason, bodyW - 48 - 28).forEach(ln => { ctx.fillText(ln, M + 28, iy + 16); iy += 36; });
        }
        if (f.targets) {
          iy += 14;
          let cx = M + 28;
          ctx.font = 'bold 24px ' + FONT;
          (f.targets || '').split('、').filter(Boolean).forEach(t => {
            const cw = ctx.measureText(t).width + 34;
            if (cx + cw > W - M - 20) { cx = M + 28; iy += 46; }
            roundRect(ctx, cx, iy, cw, 40, 20);
            ctx.fillStyle = 'rgba(255,217,142,0.13)'; ctx.fill();
            ctx.fillStyle = '#FFD98E';
            ctx.fillText(t, cx + 17, iy + 28);
            cx += cw + 10;
          });
          iy += 46;
        }
        y += ch + 16;
      });
      y += 6;
    }

    // 页脚
    y += 8;
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(M, y, bodyW, 1.5);
    y += 34;
    ctx.font = '22px ' + FONT;
    ctx.fillStyle = FAINT;
    ctx.textAlign = 'center';
    ctx.fillText('市场有风险，投资需谨慎 · 内容仅供参考', W / 2, y);
    ctx.textAlign = 'left';

    return canvas.toDataURL('image/png');
  }

  function dispW(s) {
    let w = 0;
    for (const ch of String(s)) w += ch.charCodeAt(0) > 255 ? 2 : 1;
    return w;
  }

  /* 纯文本降级渲染 */
  function renderPlain(text, dateStr) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    const ctx = canvas.getContext('2d');
    ctx.font = '26px ' + FONT;
    const lines = [];
    String(text).split('\n').forEach(l => wrap(ctx, l, W - M * 2).forEach(x => lines.push(x)));
    const H = 226 + lines.length * 40 + 120;
    canvas.height = H;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0A1228'); bg.addColorStop(1, '#0D1B38');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = GOLD;
    ctx.fillRect(M, 52, 64, 5);
    ctx.fillStyle = TXT;
    ctx.font = 'bold 52px ' + FONT;
    ctx.fillText('投顾晨报', M, 132);
    ctx.font = '27px ' + FONT;
    ctx.fillStyle = GOLD;
    ctx.fillText(dateStr, M, 182);
    let y = 258;
    ctx.font = '26px ' + FONT;
    ctx.fillStyle = '#DCE3F0';
    lines.forEach(l => { ctx.fillText(l, M, y); y += 40; });
    y += 16;
    ctx.fillStyle = FAINT;
    ctx.textAlign = 'center';
    ctx.fillText('市场有风险，投资需谨慎 · 内容仅供参考', W / 2, y);
    ctx.textAlign = 'left';
    return canvas.toDataURL('image/png');
  }

  return { render, renderPlain };
})();
