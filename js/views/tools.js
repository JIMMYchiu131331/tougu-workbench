/* 实用工具：定投 / 复利 / 持仓盈亏 / 止盈止损 */
'use strict';

const ToolsView = {
  title: '实用工具',

  render(root) {
    root.innerHTML =

      '<div class="sec-title">定投计算器</div>' +
      '<div class="card tool-card">' +
      '<div class="field-row">' +
      '<div class="field"><label>每月定投（元）</label><input id="dpM" type="number" value="2000"></div>' +
      '<div class="field"><label>定投年限</label><input id="dpY" type="number" value="10"></div>' +
      '<div class="field"><label>年化收益（%）</label><input id="dpR" type="number" value="6" step="0.5"></div>' +
      '</div>' +
      '<div class="calc-out" id="dpOut"></div></div>' +

      '<div class="sec-title">复利计算器</div>' +
      '<div class="card tool-card">' +
      '<div class="field-row">' +
      '<div class="field"><label>本金（元）</label><input id="cpP" type="number" value="100000"></div>' +
      '<div class="field"><label>年数</label><input id="cpY" type="number" value="10"></div>' +
      '<div class="field"><label>年化收益（%）</label><input id="cpR" type="number" value="5" step="0.5"></div>' +
      '</div>' +
      '<div class="calc-out" id="cpOut"></div></div>' +

      '<div class="sec-title">持仓盈亏</div>' +
      '<div class="card tool-card">' +
      '<div class="field-row">' +
      '<div class="field"><label>代码（选填）</label><input id="plCode" type="text" placeholder="如 600519"></div>' +
      '<div class="field"><label>成本价</label><input id="plCost" type="number" step="0.01"></div>' +
      '<div class="field"><label>现价</label><input id="plNow" type="number" step="0.01"></div>' +
      '</div>' +
      '<div class="field-row">' +
      '<div class="field"><label>持股数量</label><input id="plQty" type="number" value="1000"></div>' +
      '<div class="field"><button class="btn ghost wide" id="plFetch" style="margin-top:22px">按代码取现价</button></div>' +
      '</div>' +
      '<div class="calc-out" id="plOut"></div></div>' +

      '<div class="sec-title">止盈止损设置</div>' +
      '<div class="card tool-card">' +
      '<div class="field-row">' +
      '<div class="field"><label>成本价</label><input id="slCost" type="number" step="0.01" value="10.00"></div>' +
      '<div class="field"><label>止盈（%）</label><input id="slTp" type="number" value="20"></div>' +
      '<div class="field"><label>止损（%）</label><input id="slSl" type="number" value="-10"></div>' +
      '</div>' +
      '<div class="calc-out" id="slOut"></div></div>' +

      '<div class="page-disc">计算结果基于您输入的假设参数，仅作演示参考，不构成收益承诺或投资建议。</div>';

    const bind = (ids, fn) => ids.forEach(id => $('#' + id).addEventListener('input', fn));
    bind(['dpM', 'dpY', 'dpR'], () => this._dp());
    bind(['cpP', 'cpY', 'cpR'], () => this._cp());
    bind(['plCost', 'plNow', 'plQty'], () => this._pl());
    bind(['slCost', 'slTp', 'slSl'], () => this._sl());
    $('#plFetch').addEventListener('click', () => this._fetchPrice());

    this._dp(); this._cp(); this._pl(); this._sl();
  },

  _num(id) { const v = parseFloat($('#' + id).value); return isNaN(v) ? null : v; },

  /* 定投：每月末投入P，月利率r，n个月 → FV = P*[(1+r)^n - 1]/r */
  _dp() {
    const M = this._num('dpM'), Y = this._num('dpY'), R = this._num('dpR');
    const out = $('#dpOut');
    if (!M || !Y || R == null) { out.innerHTML = '<span class="sub">请填写完整参数</span>'; return; }
    const r = R / 100 / 12, n = Math.round(Y * 12);
    let fv = r === 0 ? M * n : M * (Math.pow(1 + r, n) - 1) / r;
    const cost = M * n;
    out.innerHTML = this._kv('预期期末资产', '¥ ' + this._fmt(fv)) +
      this._kv('累计投入', '¥ ' + this._fmt(cost)) +
      this._kv('预期收益', '¥ ' + this._fmt(fv - cost) + '（' + (cost ? ((fv - cost) / cost * 100).toFixed(1) : '0') + '%）') +
      '<div class="calc-note">假设每月定投、按年化收益匀速复利，实际收益随市场波动。</div>';
  },

  _cp() {
    const P = this._num('cpP'), Y = this._num('cpY'), R = this._num('cpR');
    const out = $('#cpOut');
    if (!P || !Y || R == null) { out.innerHTML = '<span class="sub">请填写完整参数</span>'; return; }
    const fv = P * Math.pow(1 + R / 100, Y);
    out.innerHTML = this._kv('期末本息', '¥ ' + this._fmt(fv)) +
      this._kv('累计收益', '¥ ' + this._fmt(fv - P) + '（共 ' + Y + ' 年）');
  },

  _pl() {
    const cost = this._num('plCost'), now = this._num('plNow'), qty = this._num('plQty');
    const out = $('#plOut');
    if (cost == null || now == null || !qty) { out.innerHTML = '<span class="sub">填写成本价、现价和数量后自动计算</span>'; return; }
    const diff = (now - cost) * qty;
    const pct = (now - cost) / cost * 100;
    out.innerHTML = this._kv('浮动盈亏', '<span class="' + pctClass(diff) + '">' + (diff >= 0 ? '+' : '') + this._fmt(diff) + '</span>') +
      this._kv('收益率', '<span class="' + pctClass(diff) + '">' + fmtPct(pct, true) + '</span>') +
      this._kv('持仓市值', '¥ ' + this._fmt(now * qty));
  },

  _sl() {
    const cost = this._num('slCost'), tp = this._num('slTp'), sl = this._num('slSl');
    const out = $('#slOut');
    if (cost == null || tp == null || sl == null) { out.innerHTML = '<span class="sub">请填写完整参数</span>'; return; }
    const tpP = cost * (1 + tp / 100), slP = cost * (1 + sl / 100);
    out.innerHTML = this._kv('止盈触发价', '¥ ' + tpP.toFixed(2) + '（' + fmtPct(tp, true) + '）') +
      this._kv('止损触发价', '¥ ' + slP.toFixed(2) + '（' + fmtPct(sl, true) + '）') +
      '<div class="calc-note">建议与客户提前约定纪律，避免情绪化操作。</div>';
  },

  async _fetchPrice() {
    const code = Quotes.normalizeCode($('#plCode').value);
    if (!code) { toast('请输入正确的6位代码', 'warn'); return; }
    toast('正在获取 ' + code + ' 行情…');
    try {
      const q = await Quotes.lookup(code);
      if (q && q.price != null) {
        $('#plNow').value = q.price;
        this._pl();
        toast('已填入 ' + (q.name || code) + ' 现价 ' + q.price);
      } else toast('未取到行情', 'warn');
    } catch (e) { toast('行情获取失败', 'warn'); }
  },

  _fmt(n) {
    const sign = n < 0 ? '-' : '';
    n = Math.abs(n);
    if (n >= 1e8) return sign + (n / 1e8).toFixed(2) + ' 亿';
    if (n >= 1e4) return sign + (n / 1e4).toFixed(2) + ' 万';
    return sign + n.toFixed(2);
  },

  _kv(k, v) { return '<div class="kv"><span class="kv-k">' + k + '</span><span class="kv-v">' + v + '</span></div>'; }
};
