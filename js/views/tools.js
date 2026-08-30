/* 私募销售工具箱：在售产品档案库 + AI 产品讲解 */
'use strict';

const ToolsView = {
  title: '私募工具箱',
  tab: 'list',
  STRATEGIES: ['市场中性', '指数增强', 'CTA', '套利', '多策略', '其他'],
  QUOTAS: ['有额度', '额度紧张', '已封盘'],
  QUOTA_COLORS: {
    '有额度': ['#E9F7F0', '#0E9B57'],
    '额度紧张': ['#FBF1E3', '#B96A00'],
    '已封盘': ['#EEEEF3', '#69708A']
  },
  PERSONAS: ['稳健保守型，最怕亏钱', '追求高收益，能承受波动', '对比过别家产品，还在犹豫', '初次接触量化，完全不懂', '老客户，考虑追加复购'],

  render(root) {
    root.innerHTML =
      '<div class="segment" id="toolTabs">' +
      '<button data-t="list" class="' + (this.tab === 'list' ? 'active' : '') + '">📦 产品档案</button>' +
      '<button data-t="ai" class="' + (this.tab === 'ai' ? 'active' : '') + '">🤖 AI 产品讲解</button>' +
      '</div><div id="toolBody"></div>';
    $$('#toolTabs button').forEach(b => b.addEventListener('click', () => {
      this.tab = b.dataset.t;
      $$('#toolTabs button').forEach(x => x.classList.toggle('active', x === b));
      this._renderTab();
    }));
    this._renderTab();
  },

  _renderTab() {
    const box = $('#toolBody');
    if (this.tab === 'list') this._renderList(box);
    else this._renderAI(box);
  },

  /* ---------- 产品档案库 ---------- */
  _quotaBadge(q) {
    const col = this.QUOTA_COLORS[q] || ['#EEEEF3', '#69708A'];
    return '<span class="type-badge" style="background:' + col[0] + ';color:' + col[1] + '">' + esc(q || '—') + '</span>';
  },

  _renderList(box) {
    const list = Store.db.products || [];
    box.innerHTML =
      (list.length ? list.map(p => this._productCard(p)).join('')
        : '<div class="card empty-card">还没有产品档案<br><span class="sub">把在售的量化私募录进来，开放日会自动提醒、AI 讲解随取随用</span></div>') +
      '<div class="row-btns"><button class="btn wide" id="addProduct">＋ 新增在售产品</button></div>';

    $('#addProduct').addEventListener('click', () => this._edit(null));
    $$('.prod-card', box).forEach(el => el.addEventListener('click', () => this._edit(el.dataset.id)));
  },

  _productCard(p) {
    const nd = nextOpenDay(p.openDay);
    const holders = (Store.db.clients || []).filter(c => (c.products || []).indexOf(p.id) > -1).length;
    return '<div class="card prod-card" data-id="' + p.id + '">' +
      '<div class="cc-top"><span class="cc-name">' + esc(p.name) + '</span>' + this._quotaBadge(p.quota) + '</div>' +
      '<div class="cc-tags"><span class="tag">' + esc(p.strategy || '量化') + '</span>' +
      (p.lockup ? '<span class="tag">锁定期 ' + esc(p.lockup) + '</span>' : '') +
      (p.fee ? '<span class="tag">费率 ' + esc(p.fee) + '</span>' : '') + '</div>' +
      '<div class="prod-stats">' +
      '<div class="ps"><div class="ps-k">年化收益</div><div class="ps-v">' + (p.annReturn != null ? p.annReturn + '%' : '—') + '</div></div>' +
      '<div class="ps"><div class="ps-k">最大回撤</div><div class="ps-v">' + (p.maxDD != null ? p.maxDD + '%' : '—') + '</div></div>' +
      '<div class="ps"><div class="ps-k">规模</div><div class="ps-v">' + (p.aum ? p.aum + '亿' : '—') + '</div></div>' +
      '</div>' +
      (nd ? '<div class="cc-foot"><span>开放日 ' + p.openDay + '（最近 ' + nd.slice(5).replace('-', '/') + '）</span>' +
        '<span class="cc-last">' + (holders ? holders + ' 位客户持有' : '暂无持有客户') + '</span></div>' : '') +
      (p.highlight ? '<div class="cc-hold">💡 ' + esc(p.highlight) + '</div>' : '') +
      '</div>';
  },

  _edit(id) {
    const p = id ? (Store.db.products || []).find(x => x.id === id) : null;
    const f = (name, label, val, ph, type) =>
      '<div class="field"><label>' + label + '</label><input name="' + name + '" type="' + (type || 'text') + '" value="' + esc(val == null ? '' : val) + '" placeholder="' + esc(ph || '') + '"></div>';
    const body =
      f('name', '产品名称 *', p ? p.name : '', '如 XX中性一号') +
      '<div class="field"><label>策略类型</label><select name="strategy">' +
      this.STRATEGIES.map(s => '<option' + ((p ? p.strategy : '') === s ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></div>' +
      '<div class="field-row">' +
      f('annReturn', '年化收益（%）', p ? p.annReturn : '', '如 8.5', 'number') +
      f('maxDD', '最大回撤（%）', p ? p.maxDD : '', '如 2.5', 'number') +
      '</div>' +
      '<div class="field-row">' +
      f('aum', '管理规模（亿）', p ? p.aum : '', '如 30', 'number') +
      f('minBuy', '起投（万）', p ? p.minBuy : 100, '默认100', 'number') +
      '</div>' +
      f('openDay', '开放日', p ? p.openDay : '', '每周五 / 每月10号 / 每日') +
      '<div class="field-row">' +
      f('lockup', '锁定期', p ? p.lockup : '', '如 6个月') +
      f('fee', '费率结构', p ? p.fee : '', '如 1%+20%') +
      '</div>' +
      '<div class="field"><label>额度状态</label><select name="quota">' +
      this.QUOTAS.map(q => '<option' + ((p ? p.quota : '有额度') === q ? ' selected' : '') + '>' + q + '</option>').join('') + '</select></div>' +
      f('highlight', '核心卖点（一句话）', p ? p.highlight : '', '如 严控回撤，类固收增强替代') +
      '<div class="field"><label>备注</label><textarea name="note" rows="2">' + esc(p ? p.note : '') + '</textarea></div>';

    const m = modal({
      title: p ? '产品档案 · ' + p.name : '新增在售产品',
      body,
      actions: [
        { text: '取消', cls: 'ghost' },
        (p ? { text: '删除', cls: 'ghost danger-text', onClick: close => {
            confirmModal('删除产品', '确定删除「' + esc(p.name) + '」档案？客户关联会一并解除。', () => {
              Store.db.products = Store.db.products.filter(x => x.id !== p.id);
              Store.save(); close(); this._renderTab(); toast('已删除');
            }, '删除', true);
          } } : null),
        { text: '保存', cls: 'primary', onClick: close => this._saveFromForm(close, id) }
      ].filter(Boolean)
    });
  },

  _saveFromForm(close, id) {
    const name = fieldVal(document, 'name');
    if (!name) { toast('产品名称必填', 'warn'); return; }
    const data = {
      name,
      strategy: fieldVal(document, 'strategy') || '市场中性',
      annReturn: fieldVal(document, 'annReturn') ? Number(fieldVal(document, 'annReturn')) : null,
      maxDD: fieldVal(document, 'maxDD') ? Number(fieldVal(document, 'maxDD')) : null,
      aum: fieldVal(document, 'aum') ? Number(fieldVal(document, 'aum')) : null,
      minBuy: fieldVal(document, 'minBuy') ? Number(fieldVal(document, 'minBuy')) : 100,
      openDay: fieldVal(document, 'openDay'),
      lockup: fieldVal(document, 'lockup'),
      fee: fieldVal(document, 'fee'),
      quota: fieldVal(document, 'quota') || '有额度',
      highlight: fieldVal(document, 'highlight'),
      note: fieldVal(document, 'note')
    };
    if (!Store.db.products) Store.db.products = [];
    if (id) {
      Object.assign(Store.db.products.find(x => x.id === id), data);
      toast('已保存');
    } else {
      Store.db.products.push(Object.assign({ id: uid() }, data));
      toast('产品已入库「' + name + '」');
    }
    Store.save();
    close();
    this.tab = 'list';
    this._renderTab();
  },

  /* ---------- AI 产品讲解 ---------- */
  _renderAI(box) {
    const list = Store.db.products || [];
    if (!list.length) {
      box.innerHTML = '<div class="card empty-card">先到「产品档案」把在售产品录进来<br><span class="sub">录好后 AI 就能按客户画像生成产品讲解话术</span></div>';
      return;
    }
    box.innerHTML =
      '<div class="card">' +
      '<div class="auto-line">选产品 + 选客户画像 → 生成一条可直接发给客户的微信介绍。数据只来自产品档案，不会编造。</div>' +
      '<div class="field"><label>产品</label><select id="piProduct">' +
      list.map(p => '<option value="' + p.id + '">' + esc(p.name) + '（' + esc(p.strategy) + '）</option>').join('') + '</select></div>' +
      '<div class="field"><label>客户画像</label><select id="piPersona">' +
      this.PERSONAS.map(s => '<option>' + s + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>补充说明（选填：客户情况、想突出什么）</label>' +
      '<textarea id="piExtra" rows="2" placeholder="如：客户之前在别家亏损过，特别在意回撤"></textarea></div>' +
      '<div class="row-btns"><button class="btn wide" id="piGo">生成产品讲解</button></div>' +
      '<div class="field" id="piOutWrap" style="display:none"><label>讲解话术（可编辑）</label>' +
      '<textarea id="piOut" rows="9"></textarea></div>' +
      '<div class="row-btns" id="piActs" style="display:none">' +
      '<button class="btn ghost wide" id="piCopy">复制</button>' +
      '<button class="btn ghost wide" id="piSave">存入收藏</button></div>' +
      '</div>';
    $('#piGo').addEventListener('click', () => this._genPitch());
    $('#piCopy').addEventListener('click', async () => {
      (await copyText($('#piOut').value)) ? toast('已复制') : toast('复制失败', 'warn');
    });
    $('#piSave').addEventListener('click', () => {
      Store.db.saved.unshift({
        id: uid(), type: '产品讲解', title: $('#piProduct').selectedOptions[0].text.split('（')[0] + ' · ' + todayStr(),
        content: $('#piOut').value, createdAt: todayStr()
      });
      Store.save(); toast('已存入收藏库');
    });
  },

  async _genPitch() {
    if (this.busy) return;
    if (!Store.db.settings.ai.key) { this._aiError({ code: 'NO_KEY' }); return; }
    const p = (Store.db.products || []).find(x => x.id === $('#piProduct').value);
    if (!p) return;
    this.busy = true;
    const btn = $('#piGo');
    btn.disabled = true; btn.textContent = '生成中…';
    try {
      const persona = $('#piPersona').value;
      const extra = $('#piExtra').value.trim();
      const material = '【产品档案】\n' + JSON.stringify({
        名称: p.name, 策略类型: p.strategy, 年化收益: p.annReturn != null ? p.annReturn + '%' : undefined,
        最大回撤: p.maxDD != null ? p.maxDD + '%' : undefined, 管理规模: p.aum ? p.aum + '亿' : undefined,
        开放日: p.openDay, 锁定期: p.lockup, 费率: p.fee, 起投: (p.minBuy || 100) + '万', 额度: p.quota,
        核心卖点: p.highlight
      }, null, 1) + '\n【客户画像】' + persona + (extra ? '\n【补充】' + extra : '');
      const r = await AI.chat([
        { role: 'system', content:
          '你是顶级量化私募的销售合伙人，最擅长把产品讲到客户心里。根据产品档案与客户画像，写一条发给客户的微信消息（150-280字）。' +
          '要求：1.只使用产品档案里的数据，禁止编造任何数字；2.紧扣客户画像的关切点做匹配（担心回撤就讲回撤控制，追求收益就讲超额能力，犹豫就给决策理由）；' +
          '3.口语化、像资深销售顾问发的微信，不写官方套话；4.结尾留自然的行动钩子（约见面/发材料/开放日前决策）；' +
          '5.不出现“保本”“稳赚”“保证收益”等表述；6.只输出消息正文，不要标题和解释。' },
        { role: 'user', content: material }
      ]);
      $('#piOut').value = r.text;
      $('#piOutWrap').style.display = '';
      $('#piActs').style.display = '';
      toast('讲解已生成');
    } catch (e) {
      this._aiError(e);
    }
    btn.disabled = false; btn.textContent = '生成产品讲解';
    this.busy = false;
  },

  _aiError(e) {
    if (e && e.code === 'NO_KEY') {
      modal({
        title: '还没有保存 API Key',
        body: '<p class="modal-msg">到「设置 → AI 大模型配置」粘贴 Key，点「保存」或「测试连接」。</p>',
        actions: [
          { text: '取消', cls: 'ghost' },
          { text: '去设置', cls: 'primary', onClick: close => { close(); location.hash = '#/settings'; } }
        ]
      });
      return;
    }
    modal({
      title: '生成失败',
      body: '<p class="modal-msg">' + esc((e && e.message) || String(e)) + '</p>',
      actions: [{ text: '知道了', cls: 'primary' }]
    });
  }
};
