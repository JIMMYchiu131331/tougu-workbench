/* 客户档案：列表/搜索/筛选 + 详情 + 增改 + 跟进记录 */
'use strict';

const ClientsView = {
  title: '客户档案',
  pendingOpen: null,
  pendingAdd: false,
  keyword: '',
  riskFilter: '',

  render(root) {
    root.innerHTML =
      '<div class="search-bar"><input id="clientSearch" type="search" placeholder="搜索姓名 / 标签 / 备注" value="' + esc(this.keyword) + '">' +
      '<button class="btn small" id="addClientBtn">＋ 新增</button></div>' +
      '<div class="chip-row" id="riskChips">' +
      ['', 'C1', 'C2', 'C3', 'C4', 'C5'].map(r =>
        '<button class="chip' + (this.riskFilter === r ? ' active' : '') + '" data-r="' + r + '">' + (r || '全部') + '</button>'
      ).join('') + '</div>' +
      '<div id="clientList"></div>' +
      '<button class="fab" id="fabAdd">＋</button>';

    $('#clientSearch').addEventListener('input', e => {
      this.keyword = e.target.value.trim();
      this._renderList();
    });
    $$('#riskChips .chip').forEach(c => c.addEventListener('click', () => {
      this.riskFilter = c.dataset.r;
      $$('#riskChips .chip').forEach(x => x.classList.toggle('active', x === c));
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

  _renderList() {
    const box = $('#clientList');
    const kw = this.keyword;
    let list = Store.db.clients.slice();
    if (this.riskFilter) list = list.filter(c => c.riskLevel === this.riskFilter);
    if (kw) {
      list = list.filter(c =>
        (c.name || '').includes(kw) || (c.tags || []).some(t => t.includes(kw)) ||
        (c.note || '').includes(kw) || (c.holdings || '').includes(kw));
    }
    const rank = c => {
      const d = c.nextFollow ? daysUntil(c.nextFollow) : 9999;
      return d;
    };
    list.sort((a, b) => rank(a) - rank(b));

    if (!list.length) {
      box.innerHTML = '<div class="card empty-card">没有找到客户，点"＋ 新增"建立第一份档案</div>';
      return;
    }
    box.innerHTML = list.map(c => {
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
        '<span class="risk-badge r' + c.riskLevel + '">' + esc(c.riskLevel || 'C3') + '</span></div>' +
        '<div class="cc-tags">' + (c.tags || []).map(t => '<span class="tag">' + esc(t) + '</span>').join('') +
        (c.assets ? '<span class="tag gold">资产 ' + esc(c.assets) + '万</span>' : '') + '</div>' +
        '<div class="cc-hold">' + esc(c.holdings || '暂无持仓记录') + '</div>' +
        '<div class="cc-foot"><span class="' + followCls + '">' + followTxt + '</span>' +
        (c.lastContact ? '<span class="cc-last">最近联系 ' + esc(c.lastContact) + '</span>' : '') + '</div></div>';
    }).join('');
    $$('.client-card', box).forEach(el =>
      el.addEventListener('click', () => this._detail(el.dataset.id)));
  },

  _riskSelect(val) {
    return '<select name="riskLevel">' +
      ['C1', 'C2', 'C3', 'C4', 'C5'].map(r =>
        '<option value="' + r + '"' + (val === r ? ' selected' : '') + '>' + r + ' ' +
        ({ C1: '保守型', C2: '谨慎型', C3: '稳健型', C4: '积极型', C5: '激进型' }[r]) + '</option>').join('') +
      '</select>';
  },

  _formBody(c) {
    return [
      ['name', '姓名 *', 'text', c ? c.name : '', '客户称呼'],
      ['phone', '手机号', 'tel', c ? c.phone : '', '选填'],
      ['riskLevel', '风险承受能力', null, c ? c.riskLevel : 'C3', null, this._riskSelect(c ? c.riskLevel : 'C3')],
      ['assets', '资产规模（万元）', 'number', c && c.assets != null ? c.assets : '', '如 86'],
      ['birthday', '生日（MM-DD）', 'text', c ? c.birthday : '', '如 09-05，首页会提醒'],
      ['nextFollow', '下次跟进日期', 'date', c ? c.nextFollow : '', null],
      ['tags', '标签（逗号分隔）', 'text', c ? (c.tags || []).join(',') : '', '如 稳健增值,基金'],
      ['holdings', '持仓概况', 'text', c ? c.holdings : '', '如 偏股混合60%、债券30%'],
      ['note', '备注', 'textarea', c ? c.note : '', '偏好、家庭、沟通习惯等']
    ].map(f => {
      const [name, label, type, val, ph, custom] = f;
      if (custom) return '<div class="field"><label>' + label + '</label>' + custom + '</div>';
      if (type === 'textarea') return '<div class="field"><label>' + label + '</label><textarea name="' + name + '" rows="2" placeholder="' + esc(ph || '') + '">' + esc(val || '') + '</textarea></div>';
      return '<div class="field"><label>' + label + '</label><input name="' + name + '" type="' + type + '" value="' + esc(val || '') + '" placeholder="' + esc(ph || '') + '"></div>';
    }).join('');
  },

  _saveFromForm(close, id) {
    const name = fieldVal(document, 'name');
    if (!name) { toast('姓名必填', 'warn'); return; }
    const data = {
      name,
      phone: fieldVal(document, 'phone'),
      riskLevel: fieldVal(document, 'riskLevel') || 'C3',
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
      Store.db.clients.unshift(Object.assign({
        id: uid(), lastContact: '', log: []
      }, data));
      toast('已新增客户「' + name + '」');
    }
    Store.save();
    close();
    this._renderList();
  },

  _edit(id) {
    const c = id ? Store.db.clients.find(x => x.id === id) : null;
    modal({
      title: c ? '编辑客户' : '新增客户',
      body: this._formBody(c),
      actions: [
        { text: '取消', cls: 'ghost' },
        { text: '保存', cls: 'primary', onClick: close => this._saveFromForm(close, id) }
      ]
    });
  },

  _detail(id) {
    const c = Store.db.clients.find(x => x.id === id);
    if (!c) return;
    const body =
      '<div class="detail-grid">' +
      '<div><span class="dg-k">风险等级</span><span class="risk-badge r' + c.riskLevel + '">' + esc(c.riskLevel) + '</span></div>' +
      '<div><span class="dg-k">资产</span>' + (c.assets ? esc(c.assets) + ' 万' : '--') + '</div>' +
      '<div><span class="dg-k">电话</span>' + (c.phone ? '<a href="tel:' + esc(c.phone) + '">' + esc(c.phone) + '</a>' : '--') + '</div>' +
      '<div><span class="dg-k">生日</span>' + (c.birthday ? esc(c.birthday) : '--') + '</div>' +
      '<div><span class="dg-k">下次跟进</span>' + (c.nextFollow ? esc(c.nextFollow) : '--') + '</div>' +
      '<div><span class="dg-k">最近联系</span>' + (c.lastContact ? esc(c.lastContact) : '--') + '</div></div>' +
      (c.tags && c.tags.length ? '<div class="cc-tags" style="margin-top:10px">' + c.tags.map(t => '<span class="tag">' + esc(t) + '</span>').join('') + '</div>' : '') +
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
