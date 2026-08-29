/* 内容工坊：AI晨报生成 / 客户话术生成 / 收藏库 */
'use strict';

const ContentView = {
  title: '内容工坊',
  tab: 'morning', // morning | script | saved
  busy: false,

  render(root) {
    root.innerHTML =
      '<div class="segment" id="segTabs">' +
      '<button data-t="morning" class="' + (this.tab === 'morning' ? 'active' : '') + '">📰 晨报生成</button>' +
      '<button data-t="script" class="' + (this.tab === 'script' ? 'active' : '') + '">💬 客户话术</button>' +
      '<button data-t="saved" class="' + (this.tab === 'saved' ? 'active' : '') + '">📁 收藏库</button>' +
      '</div>' +
      '<div id="contentBody"></div>';
    $$('#segTabs button').forEach(b => b.addEventListener('click', () => {
      this.tab = b.dataset.t;
      $$('#segTabs button').forEach(x => x.classList.toggle('active', x === b));
      this._renderTab();
    }));
    this._renderTab();
  },

  _keyBanner() {
    if (Store.db.settings.ai.key) return '';
    return '<div class="banner">还没有配置 AI Key，生成功能不可用。<button class="link-btn" onclick="location.hash=\'#/settings\'">去设置 →</button></div>';
  },

  _renderTab() {
    const box = $('#contentBody');
    if (this.tab === 'morning') this._renderMorningTab(box);
    else if (this.tab === 'script') this._renderScript(box);
    else this._renderSaved(box);
  },

  /* ---------- 晨报：一键生成（自动抓行情+快讯，固定模板） ---------- */
  _renderMorningTab(box) {
    box.innerHTML = this._keyBanner() +
      '<div class="card">' +
      '<div class="auto-line">📡 一键生成，无需输入：自动抓取 A股收盘 · 美股 · 港股 · 财经快讯，按券商标准模板（隔夜外盘→市场回顾→要闻速递→今日关注）出稿</div>' +
      '<div class="field"><label>补充素材（选填：今天特别想提的事，自动抓取失败时也可把新闻粘这里手动生成）</label>' +
      '<textarea id="morningNews" rows="3" placeholder="选填"></textarea></div>' +
      '<div class="calc-note" id="morningStatus"></div>' +
      '<div class="row-btns"><button class="btn wide" id="genMorning">⚡ 一键生成今日晨报</button></div>' +
      '<div class="field" id="morningOutWrap" style="display:none"><label>生成结果（可编辑）</label>' +
      '<textarea id="morningOut" rows="12"></textarea></div>' +
      '<div class="row-btns" id="morningActs" style="display:none">' +
      '<button class="btn ghost wide" id="copyMorning">复制</button>' +
      '<button class="btn ghost wide" id="regenMorning">重新生成</button>' +
      '<button class="btn ghost wide" id="saveMorning">存入收藏</button></div>' +
      '</div>';
    $('#genMorning').addEventListener('click', () => this._genMorning());
    $('#regenMorning').addEventListener('click', () => this._genMorning());
    $('#copyMorning').addEventListener('click', async () => {
      (await copyText($('#morningOut').value)) ? toast('已复制') : toast('复制失败，请长按文本手动复制', 'warn');
    });
    $('#saveMorning').addEventListener('click', () => {
      Store.db.saved.unshift({
        id: uid(), type: '晨报', title: '晨报 ' + todayStr(),
        content: $('#morningOut').value, createdAt: todayStr()
      });
      Store.save(); toast('已存入收藏库');
    });
  },

  _status(t) { const el = $('#morningStatus'); if (el) el.textContent = t; },

  /* 组装素材：行情 + 快讯 + 用户补充；返回 {text, markets} */
  async _gatherMaterial() {
    const manual = $('#morningNews').value.trim();
    let markets = null, news = null, errors = [];
    this._status('正在抓取最新行情…');
    const pMarket = Quotes.fetchMarkets()
      .then(d => { markets = d; this._status('行情已抓到，正在抓取财经快讯…'); })
      .catch(() => { errors.push('行情'); this._status('行情抓取失败，正在抓取快讯…'); });
    const pNews = News.fetchNews(28).then(d => { news = d; }).catch(() => { errors.push('快讯'); });
    await Promise.all([pMarket.catch(() => {}), pNews.catch(() => {})]);

    const parts = [];
    parts.push('今天是 ' + longDate() + '。以下是自动抓取的最新素材：');
    if (markets) {
      const fmt = q => q.name + ' ' + q.price.toFixed(2) + '（' + (q.pct >= 0 ? '+' : '') + q.pct.toFixed(2) + '%）';
      parts.push('【行情数据】');
      if (markets.cn.length) parts.push('A股收盘：' + markets.cn.map(fmt).join('，') + '。');
      if (markets.turnoverYi != null) parts.push('沪深两市成交额约 ' + (markets.turnoverYi / 10000).toFixed(2) + ' 万亿元。');
      if (markets.us.length) parts.push('美股最新：' + markets.us.map(fmt).join('，') + '。');
      if (markets.hk.length) parts.push('港股：' + markets.hk.map(fmt).join('，') + '。');
    }
    if (news && news.length) {
      parts.push('【最新财经快讯】');
      news.slice(0, 25).forEach((n, i) => parts.push((i + 1) + '. ' + n.text));
    }
    if (manual) parts.push('【投顾补充（重要，优先采用）】\n' + manual);
    if (!markets && !news && !manual) {
      throw new Error('行情和快讯都抓取失败，且没有手动素材。请检查网络后重试，或把新闻粘贴到补充素材里再生成。');
    }
    if (errors.length) parts.push('（注意：' + errors.join('和') + '自动抓取失败，相关部分请勿凭空编写）');
    return { text: parts.join('\n'), markets, news };
  },

  /* ---------- 晨报排版（程序负责，数字对齐固定） ---------- */
  _dispWidth(s) {
    let w = 0;
    for (const ch of String(s)) w += ch.charCodeAt(0) > 255 ? 2 : 1;
    return w;
  },
  _padName(s, w) {
    s = String(s);
    while (this._dispWidth(s) < w) s += '　'; // 全角空格补位
    return s;
  },
  _marketLine(q, nameWidth) {
    return this._padName(q.name, nameWidth) + ' ' + q.price.toFixed(2) + '  ' +
      (q.pct >= 0 ? '+' : '') + q.pct.toFixed(2) + '%';
  },
  _renderMorning(markets, data, raw) {
    const d = new Date();
    const head = '📊 投顾晨报｜' + (d.getMonth() + 1) + '月' + d.getDate() + '日 周' + weekCN(d);
    const SEP = '━━━━━━━━━━━━━━';
    const out = [head, SEP];

    if (markets && (markets.us.length || markets.hk.length)) {
      out.push('🌍 隔夜外盘');
      const usHk = markets.us.concat(markets.hk);
      const w = Math.max(...usHk.map(q => this._dispWidth(q.name))) + 1;
      usHk.forEach(q => out.push(this._marketLine(q, w)));
      out.push('');
    }
    if (markets && markets.cn.length) {
      out.push('🇨🇳 昨日A股');
      const w = Math.max(...markets.cn.map(q => this._dispWidth(q.name))) + 1;
      markets.cn.forEach(q => out.push(this._marketLine(q, w)));
      if (markets.turnoverYi != null) out.push('两市成交额约 ' + (markets.turnoverYi / 10000).toFixed(2) + ' 万亿元');
      out.push('');
    }

    if (data) {
      if (data.news && data.news.length) {
        out.push('📰 要闻速递');
        data.news.forEach((n, i) => out.push((i + 1) + '. ' + (n.tag ? '【' + n.tag + '】' : '') + (n.text || '')));
        out.push('');
      }
      if (data.focus && data.focus.length) {
        out.push('🎯 今日关注');
        data.focus.forEach(f => {
          out.push('🔸 ' + (f.theme || '') + (f.reason ? '｜' + f.reason : ''));
          if (f.targets) out.push('　　关注：' + f.targets);
        });
        out.push('');
      }
    } else {
      // AI 未返回结构化内容时的降级：原样呈现
      out.push('📝 今日内容');
      out.push(raw || '');
      out.push('');
    }

    out.push(SEP);
    out.push('个人观点，仅供参考，不构成投资建议');
    return out.join('\n');
  },

  async _genMorning() {
    if (this.busy) return;
    if (!Store.db.settings.ai.key) { this._aiError({ code: 'NO_KEY' }); return; }
    this._setBusy($('#genMorning'), true);
    let markets = null;
    try {
      const gathered = await this._gatherMaterial();
      markets = gathered.markets;
      this._status('素材就绪（行情✓' + (gathered.news ? ' 快讯' + gathered.news.length + '条✓' : '') + '），AI 撰写中…');
      const r = await AI.genMorning(gathered.text);
      $('#morningOut').value = this._renderMorning(markets, r.data, r.raw);
      $('#morningOutWrap').style.display = '';
      $('#morningActs').style.display = '';
      this._status('生成完成 ✓ 用时 ' + Math.round(r.ms / 1000) + ' 秒（行情与排版由程序固定生成）');
      toast('晨报已生成');
    } catch (e) {
      this._status('');
      this._aiError(e);
    }
    this._setBusy($('#genMorning'), false);
  },

  /* ---------- 话术 ---------- */
  _renderScript(box) {
    const scenarios = ['客户生日/节日问候', '失联客户唤醒', '市场大跌安抚', '市场大涨提醒止盈/理性', '新产品介绍', '账户年度回顾', '催办业务提醒', '定投坚持提醒'];
    const products = ['不涉及产品（纯维护/问候）', '股票', '偏股型基金', '债券/固收类产品', '混合型基金', 'ETF/指数基金', '投顾签约服务', '两融业务', '新客理财'];
    box.innerHTML = this._keyBanner() +
      '<div class="card">' +
      '<div class="field"><label>沟通场景</label><select id="scScenario">' +
      scenarios.map(s => '<option>' + s + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>涉及产品类型（选"不涉及"则纯做关系维护）</label><select id="scProduct">' +
      products.map(s => '<option>' + s + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>客户风险等级（选填）</label><select id="scRisk"><option value="">不指定</option>' +
      ['C1', 'C2', 'C3', 'C4', 'C5'].map(r => '<option>' + r + '</option>').join('') + '</select></div>' +
      '<div class="row-btns"><button class="btn wide" id="genScript">生成话术</button></div>' +
      '<div class="field" id="scriptOutWrap" style="display:none"><label>生成结果（可编辑）</label>' +
      '<textarea id="scriptOut" rows="10"></textarea></div>' +
      '<div class="row-btns" id="scriptActs" style="display:none">' +
      '<button class="btn ghost wide" id="copyScript">复制</button>' +
      '<button class="btn ghost wide" id="saveScript">存入收藏</button></div>' +
      '</div>';
    $('#genScript').addEventListener('click', () => this._genScript());
    $('#copyScript').addEventListener('click', async () => {
      (await copyText($('#scriptOut').value)) ? toast('已复制') : toast('复制失败', 'warn');
    });
    $('#saveScript').addEventListener('click', () => {
      const sc = $('#scScenario').value;
      Store.db.saved.unshift({
        id: uid(), type: '话术', title: sc + '（' + todayStr() + '）',
        content: $('#scriptOut').value, createdAt: todayStr()
      });
      Store.save(); toast('已存入收藏库');
    });
  },

  async _genScript() {
    if (this.busy) return;
    if (!Store.db.settings.ai.key) { this._aiError({ code: 'NO_KEY' }); return; }
    this._setBusy($('#genScript'), true);
    try {
      const r = await AI.genScript($('#scScenario').value, $('#scProduct').value, $('#scRisk').value);
      $('#scriptOut').value = r.text;
      $('#scriptOutWrap').style.display = '';
      $('#scriptActs').style.display = '';
      toast('生成完成，用时 ' + Math.round(r.ms / 1000) + ' 秒');
    } catch (e) { this._aiError(e); }
    this._setBusy($('#genScript'), false);
  },

  /* ---------- 收藏库 ---------- */
  _renderSaved(box) {
    const list = Store.db.saved;
    if (!list.length) {
      box.innerHTML = '<div class="card empty-card">收藏库是空的<br><span class="sub">生成的晨报和话术点"存入收藏"就会出现在这里</span></div>';
      return;
    }
    box.innerHTML = '<div class="card">' + list.map(s =>
      '<div class="saved-row" data-id="' + s.id + '">' +
      '<div class="sv-main"><div class="sv-title">' + esc(s.title) + '</div>' +
      '<div class="sv-sub">' + esc(s.type) + ' · ' + esc(s.createdAt || '') + '</div></div>' +
      '<span class="sv-arrow">›</span></div>').join('') + '</div>';
    $$('.saved-row', box).forEach(el => el.addEventListener('click', () => {
      const s = Store.db.saved.find(x => x.id === el.dataset.id);
      modal({
        title: s.title,
        body: '<pre class="saved-pre">' + esc(s.content) + '</pre>',
        actions: [
          { text: '删除', cls: 'ghost danger-text', onClick: close => {
              confirmModal('删除', '确定删除这条收藏？', () => {
                Store.db.saved = Store.db.saved.filter(x => x.id !== s.id);
                Store.save(); close(); this._renderTab(); toast('已删除');
              }, '删除', true);
            } },
          { text: '复制', cls: 'primary', onClick: async close => {
              (await copyText(s.content)) ? toast('已复制') : toast('复制失败', 'warn');
            } }
        ]
      });
    }));
  },

  /* ---------- 公共 ---------- */
  _setBusy(btn, on) {
    this.busy = on;
    if (on) { btn.disabled = true; btn.dataset.old = btn.textContent; btn.innerHTML = '<span class="spin"></span> 生成中…'; }
    else { btn.disabled = false; btn.textContent = btn.dataset.old || '生成'; }
  },

  _aiError(e) {
    if (e.code === 'NO_KEY') {
      modal({
        title: '还没有保存 API Key',
        body: '<p class="modal-msg">粘贴 Key 后必须点「<b>保存</b>」或「<b>测试连接</b>」才会生效（测试会自动保存）。</p>' +
          '<p class="modal-msg sub">当前状态：设置里的 Key 是空的，所以无法生成。</p>',
        actions: [
          { text: '取消', cls: 'ghost' },
          { text: '去设置', cls: 'primary', onClick: close => { close(); location.hash = '#/settings'; } }
        ]
      });
      return;
    }
    modal({
      title: '生成失败',
      body: '<p class="modal-msg">' + esc(e.message || String(e)) + '</p>' +
        '<p class="modal-msg sub">提示：若提示跨域/网络错误，请通过电脑上的"启动.bat"打开本工具（自带代理通道）。</p>',
      actions: [{ text: '知道了', cls: 'primary' }]
    });
  }
};
