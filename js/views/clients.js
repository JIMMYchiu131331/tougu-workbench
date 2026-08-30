/* 客户档案：KYC 视角管理（业务类型/偏好/资产/跟进），列表/搜索/类型筛选 */
'use strict';

const ClientsView = {
  title: '客户档案',
  pendingOpen: null,
  pendingAdd: false,
  keyword: '',
  typeFilter: '',

  TYPES: ['两融', 'ETF', '私募', '公募', '期权', '新客'],
  PREFS: ['短线', '波段', '长线定投', '稳健理财', '打新'],
  TYPE_COLORS: {
    '两融': ['#FDECEC', '#D2373F'],
    'ETF': ['#EAF3FB', '#2274C4'],
    '私募': ['#F3EEFB', '#6B4FB6'],
    '公募': ['#E9F7F0', '#0E9B57'],
    '期权': ['#FBF1E3', '#B96A00'],
    '新客': ['#E6F7F6', '#0E8F8C']
  },

  render(root) {
    root.innerHTML =
      '<div class="search-bar"><input id="clientSearch" type="search" placeholder="搜索姓名 / 标签 / 备注" value="' + esc(this.keyword) + '">' +
      '<button class="btn small" id="addClientBtn">＋ 新增</button></div>' +
      '<div class="chip-row" id="typeChips">' +
      [''].concat(this.TYPES).map(t =>
        '<button class="chip' + (this.typeFilter === t ? ' active' : '') + '" data-t="' + esc(t) + '">' + (t || '全部') + '</button>'
      ).join('') + '</div>' +
      '<div id="clientList"></div>' +
      '<button class="fab" id="fabAdd">＋</button>';

    $('#clientSearch').addEventListener('input', e => {
      this.keyword = e.target.value.trim();
      this._renderList();
    });
    $$('#typeChips .chip').forEach(c => c.addEventListener('click', () => {
      this.typeFilter = c.dataset.t;
      $$('#typeChips .chip').forEach(x => x.classList.toggle('active', x === c));
      this._renderList();
    }));
    $('#addClientBtn').addEventListener('click', () => this._edit(null));
    $('#fabAdd').addEventListener('click', () => this._edit(null));
    this._renderList();

    if (this.pendingOpen) {
      const id = this.pendingOpen;
      this.pendingOpen = null;
      const c = Store.db.clients.find(x => x.id === id);
      if (c) this._detail(c.id);
    } else if (this.pendingAdd) {
      this.pendingAdd = false;
      this._edit(null);
    }
  },

  _typesOf(c) { return c.types || []; },
  _matchType(c) { return !this.typeFilter || this._typesOf(c).indexOf(this.typeFilter) > -1; },

  _typeBadge(t) {
    const col = this.TYPE_COLORS[t] || ['#EEF3FC', '#1546A0'];
    return '<span class="type-badge" style="background:' + col[0] + ';color:' + col[1] + '">' + esc(t) + '</span>';
  },

  _renderList() {
    const box = $('#clientList');
    const kw = this.keyword;
    let list = Store.db.clients.slice();
    list = list.filter(c => this._matchType(c));
    if (kw) {
      list = list.filter(c =>
        (c.name || '').includes(kw) || (c.tags || []).some(t => t.includes(kw)) ||
        (c.note || '').includes(kw) || (c.holdings || '').includes(kw) ||
        (c.types || []).some(t => t.includes(kw)));
    }
    const rank = c => (c.nextFollow ? daysUntil(c.nextFollow) : 9999);
    list.sort((a, b) => rank(a) - rank(b));

    if (!list.length) {
      box.innerHTML = '<div class="card empty-card">没有找到客户，点"＋ 新增"建立第一份档案</div>';
      return;
    }
    box.innerHTML = list.map(c => {
      const types = this._typesOf(c);
      const d = daysUntil(c.nextFollow);
      let followTxt = '未设置跟进';
      let followCls = '';
      if (d !== null) {
        if (d < 0) { followTxt = '跟进已逾期'; followCls = 'urgent'; }
        else if (d === 0) { followTxt = '今天跟进'; followCls = 'urgent'; }
        else if (d <= 3) { followTxt = d + '天后跟进'; followCls = 'soon'; }
        else { followTxt = c.nextFollow + ' 跟进'; }
      }
      return '<div class="card client-card" data-id="' + c.id + '">' +
        '<div class="cc-top"><span class="cc-name">' + esc(c.name) + '</span>' +
        (c.assets ? '<span class="cc-assets">' + esc(c.assets) + ' 万</span>' : '') + '</div>' +
        (types.length ? '<div class="cc-tags">' + types.map(t => this._typeBadge(t)).join('') +
          (c.prefs || []).map(p => '<span class="tag">' + esc(p) + '</span>').join('') + '</div>' : '') +
        '<div class="cc-hold">' + esc(c.holdings || '暂无持仓记录') + '</div>' +
        '<div class="cc-foot"><span class="' + followCls + '">' + followTxt + '</span>' +
        (c.lastContact ? '<span class="cc-last">最近联系 ' + esc(c.lastContact) + '</span>' : '') + '</div></div>';
    }).join('');
    $$('.client-card', box).forEach(el =>
      el.addEventListener('click', () => this._detail(el.dataset.id)));
  },

  /* ---------- KYC 表单 ---------- */
  _chipRow(name, options, selected) {
    return '<div class="chip-sel-row" data-name="' + name + '">' +
      options.map(o => '<button type="button" class="fchip' +
        ((selected || []).indexOf(o) > -1 ? ' active' : '') + '" data-v="' + esc(o) + '">' + esc(o) + '</button>').join('') +
      '</div>';
  },

  _formBody(c) {
    const sec = t => '<div class="form-sec">' + t + '</div>';
    const f = (name, label, type, val, ph) =>
      '<div class="field"><label>' + label + '</label><input name="' + name + '" type="' + type + '" value="' + esc(val || '') + '" placeholder="' + esc(ph || '') + '"></div>';
    return sec('基本信息') +
      '<div class="field-row">' + f('name', '姓名 *', 'text', c ? c.name : '', '客户称呼') +
      f('phone', '手机号', 'tel', c ? c.phone : '') + '</div>' +
      '<div class="field-row">' + f('birthday', '生日（MM-DD）', 'text', c ? c.birthday : '', '09-05，到期自动提醒') +
      f('nextFollow', '下次跟进', 'date', c ? c.nextFollow : '') + '</div>' +
      sec('业务类型（多选，用于分类筛选和精准营销）') +
      this._chipRow('types', this.TYPES, c ? c.types : []) +
      sec('私募合格投资者状态') +
      '<div class="chip-sel-row" data-name="privateStatus" data-single="1">' +
      ['已认证', '待核验', '未达标'].map(o => '<button type="button" class="fchip' + ((c ? c.privateStatus : '') === o ? ' active' : '') + '" data-v="' + o + '">' + o + '</button>').join('') + '</div>' +
      sec('投资偏好（多选，决定沟通风格）') +
      this._chipRow('prefs', this.PREFS, c ? c.prefs : []) +
      sec('资产与持仓') +
      '<div class="field-row">' + f('assets', '资产规模（万元）', 'number', c && c.assets != null ? c.assets : '', '如 86') +
      f('tags', '自定义标签', 'text', c ? (c.tags || []).join(',') : '', '逗号分隔') + '</div>' +
      f('holdings', '持仓概况', 'text', c ? c.holdings : '', '如 两融仓位6成、ETF 30万') +
      '<div class="field"><label>备注</label><textarea name="note" rows="2" placeholder="偏好、家庭、沟通习惯等">' + esc(c ? c.note : '') + '</textarea></div>';
  },

  _collectChips(name) {
    return $$('.chip-sel-row[data-name="' + name + '"] .fchip.active').map(el => el.dataset.v);
  },

  _saveFromForm(close, id) {
    const name = fieldVal(document, 'name');
    if (!name) { toast('姓名必填', 'warn'); return; }
    const data = {
      name,
      phone: fieldVal(document, 'phone'),
      types: this._collectChips('types'),
      prefs: this._collectChips('prefs'),
      privateStatus: this._collectChips('privateStatus')[0] || '',
      assets: fieldVal(document, 'assets') ? Number(fieldVal(document, 'assets')) : null,
      birthday: fieldVal(document, 'birthday'),
      nextFollow: fieldVal(document, 'nextFollow'),
      tags: fieldVal(document, 'tags') ? fieldVal(document, 'tags').split(/[,，、]/).map(s => s.trim()).filter(Boolean) : [],
      holdings: fieldVal(document, 'holdings'),
      note: fieldVal(document, 'note')
    };
    if (id) {
      const c = Store.db.clients.find(x => x.id === id);
      Object.assign(c, data);
      toast('已保存');
    } else {
      Store.db.clients.unshift(Object.assign({ id: uid(), lastContact: '', log: [] }, data));
      toast('已新增客户「' + name + '」');
    }
    Store.save();
    close();
    this._renderList();
  },

  _edit(id) {
    const c = id ? Store.db.clients.find(x => x.id === id) : null;
    const m = modal({
      title: c ? '客户 KYC · ' + c.name : '新增客户 KYC',
      body: this._formBody(c),
      actions: [
        { text: '取消', cls: 'ghost' },
        { text: '保存', cls: 'primary', onClick: close => this._saveFromForm(close, id) }
      ]
    });
    $$('.fchip', m.overlay).forEach(b => b.addEventListener('click', () => {
      const row = b.closest('.chip-sel-row');
      if (row && row.dataset.single) {
        $$('.fchip.active', row).forEach(x => { if (x !== b) x.classList.remove('active'); });
        b.classList.toggle('active');
      } else b.classList.toggle('active');
    }));
  },

  _detail(id) {
    const c = Store.db.clients.find(x => x.id === id);
    if (!c) return;
    const types = this._typesOf(c);
    const body =
      '<div class="cc-tags" style="margin-bottom:10px">' +
      types.map(t => this._typeBadge(t)).join('') +
      (c.prefs || []).map(p => '<span class="tag">' + esc(p) + '</span>').join('') + '</div>' +
      '<div class="detail-grid">' +
      '<div><span class="dg-k">资产规模</span>' + (c.assets ? esc(c.assets) + ' 万' : '--') + '</div>' +
      '<div><span class="dg-k">手机号</span>' + (c.phone ? '<a href="tel:' + esc(c.phone) + '">' + esc(c.phone) + '</a>' : '--') + '</div>' +
      '<div><span class="dg-k">生日</span>' + (c.birthday ? esc(c.birthday) : '--') + '</div>' +
      '<div><span class="dg-k">下次跟进</span>' + (c.nextFollow ? esc(c.nextFollow) : '--') + '</div>' +
      '<div><span class="dg-k">最近联系</span>' + (c.lastContact ? esc(c.lastContact) : '--') + '</div></div>' +
      '<div class="dg-block"><b>持仓概况</b>' + esc(c.holdings || '暂无') + '</div>' +
      '<div class="dg-block"><b>备注</b>' + esc(c.note || '暂无') + '</div>' +
      '<div class="dg-block"><b>跟进记录</b>' +
      ((c.log || []).length ? (c.log || []).map(l =>
        '<div class="log-row"><span class="log-date">' + esc(l.date) + '</span>' + esc(l.text) + '</div>').join('')
        : '<div class="log-row">暂无记录</div>') +
      '</div>';

    modal({
      title: c.name,
      body,
      actions: [
        { text: '删除', cls: 'ghost danger-text', onClick: close => {
            confirmModal('删除客户', '确定删除「' + esc(c.name) + '」的档案？此操作不可恢复。', () => {
              Store.db.clients = Store.db.clients.filter(x => x.id !== c.id);
              Store.save(); close(); this._renderList(); toast('已删除');
            }, '删除', true);
          } },
        { text: '记跟进', cls: 'ghost', onClick: () => this._addLog(c) },
        { text: '编辑', cls: 'primary', onClick: close => { close(); this._edit(c.id); } }
      ]
    });
  },

  _addLog(c) {
    modal({
      title: '记录跟进 - ' + c.name,
      body: '<div class="field"><label>本次沟通内容</label>' +
        '<textarea name="logText" rows="3" placeholder="沟通了什么、客户反馈、下一步动作"></textarea></div>',
      actions: [
        { text: '取消', cls: 'ghost' },
        {
          text: '保存', cls: 'primary', onClick: close => {
            const t = fieldVal(document, 'logText');
            if (!t) { toast('请填写内容', 'warn'); return; }
            c.log = c.log || [];
            c.log.unshift({ date: todayStr(), text: t });
            c.lastContact = todayStr();
            Store.save(); close(); toast('已记录');
          }
        }
      ]
    });
  }
};
