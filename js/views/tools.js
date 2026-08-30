/* 私募销售工具箱：合格投资者核验 / 业绩报酬 / 回撤修复 / 净值模拟 / 量化策略速查 */
'use strict';

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const ToolsView = {
  title: '私募工具箱',
  tab: 'he',

  render(root) {
    root.innerHTML =
      '<div class="segment" id="toolTabs">' +
      '<button data-t="he" class="' + (this.tab === 'he' ? 'active' : '') + '">✅ 合格投资者</button>' +
      '<button data-t="fee" class="' + (this.tab === 'fee' ? 'active' : '') + '">💰 业绩报酬</button>' +
      '<button data-t="dd" class="' + (this.tab === 'dd' ? 'active' : '') + '">🛡 回撤修复</button>' +
      '<button data-t="nav" class="' + (this.tab === 'nav' ? 'active' : '') + '">📈 净值模拟</button>' +
      '<button data-t="kb" class="' + (this.tab === 'kb' ? 'active' : '') + '">📚 策略速查</button>' +
      '</div>' +
      '<div id="toolBody"></div>';
    $$('#toolTabs button').forEach(b => b.addEventListener('click', () => {
      this.tab = b.dataset.t;
      $$('#toolTabs button').forEach(x => x.classList.toggle('active', x === b));
      this._renderTab();
    }));
    this._renderTab();
  },

  _renderTab() {
    const box = $('#toolBody');
    const fn = { he: '_renderHE', fee: '_renderFee', dd: '_renderDD', nav: '_renderNAV', kb: '_renderKB' }[this.tab];
    this[fn](box);
  },

  _num(id) { const v = parseFloat(($('#' + id) || {}).value); return isNaN(v) ? null : v; },
  _kv(k, v) { return '<div class="kv"><span class="kv-k">' + k + '</span><span class="kv-v">' + v + '</span></div>'; },
  _fmt(n) {
    const sign = n < 0 ? '-' : '';
    n = Math.abs(n);
    if (n >= 1e8) return sign + (n / 1e8).toFixed(2) + ' 亿';
    if (n >= 1e4) return sign + (n / 1e4).toFixed(2) + ' 万';
    return sign + n.toFixed(2);
  },

  /* ---------- 1. 私募合格投资者核验 ---------- */
  _renderHE(box) {
    box.innerHTML =
      '<div class="card tool-card">' +
      '<div class="auto-line">依据《私募投资基金监督管理暂行办法》：金融资产≥300万，或近三年年均收入≥50万，即为私募合格投资者。单只私募基金起投 100 万元。</div>' +
      '<div class="field"><label>客户金融资产（万元）</label><input id="heAsset" type="number" placeholder="银行存款/理财/股票/基金等合计"></div>' +
      '<div class="field"><label>近三年年均收入（万元）</label><input id="heIncome" type="number" placeholder="工资/经营/投资收入等"></div>' +
      '<div class="row-btns"><button class="btn wide" id="heGo">核验</button></div>' +
      '<div id="heOut" style="margin-top:6px"></div></div>' +
      '<div class="card"><b style="font-size:13px">认证材料清单（开单前备齐）</b>' +
      '<div class="check-list" style="padding:6px 0 0">' +
      ['金融资产证明（银行/券商资产对账单、理财凭证）', '收入证明（近三年纳税记录、工资流水）', '风险测评问卷（多数管理人要求 C4 及以上）', '身份证明 + 银行卡（赎回卡一致）', '冷静期回访确认（认购后 24 小时）', '双录（录音录像，部分机构要求）'].map(s => '<label class="check-row"><input type="checkbox"><span>' + s + '</span></label>').join('') +
      '</div><div class="calc-note">最终认定以私募管理人/托管方审核为准。本工具仅作销售前快速预判。</div></div>';
    $('#heGo').addEventListener('click', () => {
      const a = this._num('heAsset'), inc = this._num('heIncome');
      if (a == null && inc == null) { toast('请至少填写一项', 'warn'); return; }
      const okA = a != null && a >= 300;
      const okI = inc != null && inc >= 50;
      const pass = okA || okI;
      let html;
      if (pass) {
        html = '<div class="suit-result ok" style="margin:10px 0 4px"><div class="sr-verdict">✔ 符合私募合格投资者标准</div><div class="sr-detail">' +
          (okA ? '<p>· 金融资产 ' + this._fmt(a * 10000) + ' 元 ≥ 300 万</p>' : '') +
          (okI ? '<p>· 年均收入 ' + this._fmt(inc * 10000) + ' 元 ≥ 50 万</p>' : '') +
          '<p class="suit-note">下一步：备齐左侧材料 → 风险测评 → 推荐 matching 的量化产品（单只 ≥100 万）。</p></div></div>';
      } else {
        const gapA = a != null && a < 300 ? '还差 ' + this._fmt((300 - a) * 10000) + ' 元金融资产' : '';
        const gapI = inc != null && inc < 50 ? '还差 ' + this._fmt((50 - inc) * 10000) + ' 元年均收入' : '';
        html = '<div class="suit-result warn" style="margin:10px 0 4px"><div class="sr-verdict">✗ 暂不符合合格投资者标准</div><div class="sr-detail">' +
          '<p>' + [gapA, gapI].filter(Boolean).join('；') || '填写数值未达门槛' + '</p>' +
          '<p class="suit-note">可先维护关系，资产达标后第一时间推进认证。</p></div></div>';
      }
      $('#heOut').innerHTML = html;
    });
  },

  /* ---------- 2. 业绩报酬计算器（高水位法） ---------- */
  _renderFee(box) {
    box.innerHTML =
      '<div class="card tool-card">' +
      '<div class="auto-line">高水位法计提：只对「超过历史最高净值」的部分计提业绩报酬。客户问“我赚的钱分走多少”，当场算清。</div>' +
      '<div class="field-row">' +
      '<div class="field"><label>买入净值</label><input id="feeBuy" type="number" step="0.001" value="1.000"></div>' +
      '<div class="field"><label>当前净值</label><input id="feeNow" type="number" step="0.001" value="1.180"></div>' +
      '<div class="field"><label>历史高水位</label><input id="feeHW" type="number" step="0.001" value="1.000"></div>' +
      '</div>' +
      '<div class="field-row">' +
      '<div class="field"><label>投入金额（元）</label><input id="feeAmt" type="number" value="1000000"></div>' +
      '<div class="field"><label>计提比例（%）</label><input id="feeRate" type="number" value="20"></div>' +
      '</div>' +
      '<div class="row-btns"><button class="btn wide" id="feeGo">计算客户实拿</button></div>' +
      '<div class="calc-out" id="feeOut" style="margin-top:12px"></div>' +
      '<div class="calc-note">不同产品计提方式不同（高水位/逐笔/缩份额法），以基金合同为准。</div>' +
      '</div>';
    $('#feeGo').addEventListener('click', () => {
      const buy = this._num('feeBuy'), now = this._num('feeNow'), hw = this._num('feeHW');
      const amt = this._num('feeAmt'), rate = (this._num('feeRate') || 0) / 100;
      if (!buy || !now || !hw || !amt) { toast('请填写完整', 'warn'); return; }
      const shares = amt / buy;
      const excess = Math.max(0, now - hw);
      const feePerShare = excess * rate;
      const netNav = now - feePerShare;
      const total = shares * netNav;
      const feeTotal = shares * feePerShare;
      const grossTotal = shares * now;
      const profit = total - amt;
      const profitPct = (total / amt - 1) * 100;
      const grossPct = (now / buy - 1) * 100;
      $('#feeOut').innerHTML =
        this._kv('客户市值（计提后）', '<b>¥ ' + this._fmt(total) + '</b>') +
        this._kv('客户实际收益', '<span class="' + pctClass(profit) + '">' + this._fmt(profit) + '（' + fmtPct(profitPct) + '）</span>') +
        this._kv('若不计提的账面收益', this._fmt(grossTotal - amt) + '（' + fmtPct(grossPct) + '）') +
        this._kv('业绩报酬计提', this._fmt(feeTotal) + '（每份 ' + feePerShare.toFixed(4) + ' 元）') +
        (excess <= 0 ? '<div class="calc-note">当前净值未超过高水位 ' + hw.toFixed(3) + '，不计提业绩报酬，客户实拿全部收益。</div>' : '') +
        '<div class="calc-note">话术参考：赚的部分才分两成，亏了管理人一分管理报酬的业绩提成都不拿，这是利益绑定。</div>';
    });
  },

  /* ---------- 3. 回撤修复计算器 ---------- */
  _renderDD(box) {
    box.innerHTML =
      '<div class="card tool-card">' +
      '<div class="auto-line">中性/量化产品回撤沟通神器：让客户直观看到“回撤修复并不难”，避免恐慌赎回。</div>' +
      '<div class="field"><label>产品回撤幅度（%）</label><input id="ddX" type="number" value="5" placeholder="如 5 代表回撤 5%"></div>' +
      '<div class="row-btns"><button class="btn wide" id="ddGo">计算修复需求</button></div>' +
      '<div class="calc-out" id="ddOut" style="margin-top:12px"></div>' +
      '<div class="calc-note">参考：回撤 5%→涨5.3%回本｜10%→11.1%｜20%→25%｜30%→42.9%。回撤越深，修复难度呈指数上升——这就是量化策略严控回撤的价值。</div></div>';
    $('#ddGo').addEventListener('click', () => {
      const x = this._num('ddX');
      if (x == null || x <= 0 || x >= 100) { toast('请输入 0-100 之间的回撤幅度', 'warn'); return; }
      const need = x / (100 - x) * 100;
      $('#ddOut').innerHTML =
        this._kv('净值从高点回撤', fmtPct(-x)) +
        this._kv('修复需上涨', '<b>+' + need.toFixed(1) + '%</b>') +
        this._kv('10 万本金示例', '回撤后剩 ' + this._fmt(100000 * (1 - x / 100)) + '，涨回 ' + this._fmt(100000) + ' 需盈利 ' + this._fmt(100000 * x / (100 - x))) +
        '<div class="calc-note">话术参考：量化中性策略目标就是把回撤锁在这个量级，用时间换修复，而不是像股票那样深套。</div>';
    });
  },

  /* ---------- 4. 净值预期模拟器 ---------- */
  _renderNAV(box) {
    box.innerHTML =
      '<div class="card tool-card">' +
      '<div class="auto-line">客户预期管理：假设年化收益 + 一次最大回撤，画出两条净值路径，让客户明白“曲线不是直线”，提前心里有数。</div>' +
      '<div class="field-row">' +
      '<div class="field"><label>本金（万元）</label><input id="nvAmt" type="number" value="100"></div>' +
      '<div class="field"><label>期限（年）</label><input id="nvY" type="number" value="3"></div>' +
      '</div>' +
      '<div class="field-row">' +
      '<div class="field"><label>预期年化（%）</label><input id="nvR" type="number" value="8" step="0.5"></div>' +
      '<div class="field"><label>假设最大回撤（%）</label><input id="nvDD" type="number" value="5"></div>' +
      '</div>' +
      '<div class="row-btns"><button class="btn wide" id="nvGo">生成模拟曲线</button></div>' +
      '<div id="nvChart" style="margin-top:12px"></div>' +
      '<div class="calc-out" id="nvOut" style="margin-top:6px"></div>' +
      '<div class="calc-note">模拟假设仅为演示，不构成收益承诺；历史业绩不代表未来表现。</div></div>';
    $('#nvGo').addEventListener('click', () => {
      const amt = this._num('nvAmt'), y = this._num('nvY') || 1, r = (this._num('nvR') || 0) / 100, dd = (this._num('nvDD') || 0) / 100;
      if (!amt) { toast('请填写本金', 'warn'); return; }
      const n = Math.round(y * 12);
      const rm = Math.pow(1 + r, 1 / 12) - 1;
      const ideal = [amt], stress = [amt];
      const troughIdx = Math.min(Math.max(Math.floor(n * 0.4), 3), n - 3);
      for (let i = 1; i <= n; i++) {
        ideal.push(amt * Math.pow(1 + rm, i));
        stress.push(amt * Math.pow(1 + rm, i));
      }
      // 压力情景：第 troughIdx 月一次性回撤，随后按原速度逐步修复（期末留一点差距更真实）
      stress[troughIdx] = ideal[troughIdx] * (1 - dd);
      for (let i = troughIdx + 1; i <= n; i++) {
        const base = stress[troughIdx] * Math.pow(1 + rm, i - troughIdx);
        const k = Math.min(1, (i - troughIdx) / (n - troughIdx) * 1.15);
        stress[i] = base + (ideal[i] - base) * k;
      }
      const minV = Math.min.apply(null, stress);
      this._drawNav(stress, ideal, amt, minV, troughIdx, n, dd);
      $('#nvOut').innerHTML =
        this._kv('理想路径期末（匀速）', '¥ ' + this._fmt(ideal[n] * 10000)) +
        this._kv('压力路径期末（中途回撤' + (dd * 100).toFixed(1) + '%）', '¥ ' + this._fmt(stress[n] * 10000)) +
        this._kv('回撤低谷市值', '¥ ' + this._fmt(minV * 10000) + '（第 ' + troughIdx + ' 个月）') +
        '<div class="calc-note">话术参考：产品和您约定的是长期年化，中间某个月回撤 X% 是策略正常现象，历史上 X 个月即修复——最怕的是回撤时割在最低点。</div>';
    });
  },

  _drawNav(stress, ideal, amt, minV, troughIdx, n, dd) {
    const FONT2 = '"PingFang SC","Microsoft YaHei",sans-serif';
    const cw = 620, chh = 300;
    const pad = { l: 20, r: 20, t: 30, b: 34 };
    const all = ideal.concat(stress);
    const lo = Math.min.apply(null, all) * 0.98, hi = Math.max.apply(null, all) * 1.02;
    const canvas = document.createElement('canvas');
    const scale = 2; // 清晰度
    canvas.width = cw * scale; canvas.height = chh * scale;
    canvas.style.width = '100%';
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.fillStyle = '#0A1228';
    roundRectPath(ctx, 0, 0, cw, chh, 14); ctx.fill();
    const X = i => pad.l + (cw - pad.l - pad.r) * i / n;
    const Y = v => pad.t + (chh - pad.t - pad.b) * (1 - (v - lo) / (hi - lo));
    // 网格
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    for (let g = 0; g <= 4; g++) {
      const gy = pad.t + (chh - pad.t - pad.b) * g / 4;
      ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(cw - pad.r, gy); ctx.stroke();
    }
    // 回撤区间底色
    ctx.fillStyle = 'rgba(255,92,92,0.08)';
    ctx.fillRect(X(troughIdx), pad.t, Math.max(2, X(n) - X(troughIdx)), chh - pad.t - pad.b);
    const line = (arr, color, wd) => {
      ctx.strokeStyle = color; ctx.lineWidth = wd; ctx.beginPath();
      arr.forEach((v, i) => { const x = X(i), yy = Y(v); i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); });
      ctx.stroke();
    };
    line(ideal, '#E8C878', 2.5);
    line(stress, '#FFFFFF', 2.5);
    // 回撤点标注
    ctx.fillStyle = '#FF5C5C';
    ctx.beginPath(); ctx.arc(X(troughIdx), Y(minV), 5, 0, Math.PI * 2); ctx.fill();
    ctx.font = 'bold 20px ' + FONT2;
    ctx.fillText('-' + (dd * 100).toFixed(1) + '%', X(troughIdx) - 20, Y(minV) + 30);
    // 标签
    ctx.font = '18px ' + FONT2;
    ctx.fillStyle = '#E8C878'; ctx.fillText('— 匀速理想', cw - 150, 24);
    ctx.fillStyle = '#FFFFFF'; ctx.fillText('— 含回撤压力', cw - 150, 46);
    ctx.fillStyle = '#A8B3CC';
    ctx.fillText(amt.toFixed(0) + '万', pad.l - 6, chh - pad.b + 24);
    ctx.fillText((ideal[n]).toFixed(0) + '万', cw - pad.r - 30, chh - pad.b + 24);
    const holder = $('#nvChart');
    holder.innerHTML = '';
    holder.appendChild(canvas);
  },

  /* ---------- 5. 量化策略速查卡 ---------- */
  _renderKB(box) {
    const cards = [
      ['📈 指数增强', '对标沪深300/中证500等指数，用量化模型在指数收益上叠加超额。', '客户理解：指数涨它涨更多，指数跌它跌更少；震荡市超额最明显。'],
      ['⚖️ 市场中性', '做多股票+做空股指期货对冲，剥离涨跌只赚超额，波动小。', '客户理解：不赌涨跌，赚“选股能力”的钱；注意股市大涨时会跑输满仓持股，超额长期会衰减。'],
      ['🌊 CTA/管理期货', '在商品/国债期货上做趋势与套利，与股市相关性低。', '客户理解：股债之外的第二引擎，分散配置用；单边震荡期可能回撤。'],
      ['🧩 套利类', 'ETF套利、期现套利、打新等低风险策略，收益弹性小但稳。', '客户理解：类固收增强，容量有限需要抢额度。']
    ];
    const faqs = [
      ['“量化就是高频割韭菜吗？”', '应答：量化赚的是数学模型在全市场几千只股票里捕捉的微小定价误差，交易频率只是手段。监管对高频有严格报备，头部私募以中低频为主。'],
      ['“回撤了怎么办？要不要赎回？”', '应答：先看回撤是否在合同/历史范围内（用回撤修复计算器演示），策略逻辑未变时回撤常是加仓窗口；恐慌赎回反而锁死亏损。'],
      ['“规模大了会不会失效？”', '应答：会——超额随规模衰减是行业规律，所以头部管理人会封盘控规模。封盘恰恰是负责的表现，也是额度紧张的原因。'],
      ['“和公募指数增强什么区别？”', '应答：私募策略更灵活（可对冲、可用衍生品、杠杆工具），费率更高但也更看超额能力；公募适合门槛低的定投配置。'],
      ['“保本吗？”', '应答：不保本，任何声称保本的私募都是违规的。但我们选策略先看最大回撤，用风控把亏损空间管住。']
    ];
    box.innerHTML =
      cards.map(c =>
        '<div class="card"><b style="font-size:15px">' + c[0] + '</b>' +
        '<div class="dg-block" style="margin-top:6px"><b>是什么</b>' + c[1] + '</div>' +
        '<div class="dg-block"><b>怎么讲给客户</b>' + c[2] + '</div></div>').join('') +
      '<div class="sec-title">客户常见问题应答</div>' +
      '<div class="card check-list">' +
      faqs.map(f => '<details style="padding:10px 0;border-bottom:1px solid #F0F2F8"><summary style="font-weight:600;font-size:14px;cursor:pointer">' + f[0] + '</summary><div style="font-size:13px;color:var(--sub);margin-top:8px;line-height:1.7">' + f[1] + '</div></details>').join('') +
      '</div>' +
      '<div class="page-disc">私募基金仅面向合格投资者非公开推介。策略说明用于投顾学习与客户沟通参考，具体以基金合同与官方材料为准。</div>';
  }
};
