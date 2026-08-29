/* 首页：市场速览 + 自选 + 今日待办 + 快捷入口 */
'use strict';

const HomeView = {
  title: '投顾工作台',
  timer: null,

  render(root) {
    const db = Store.db;
    const due = db.clients
      .filter(c => c.nextFollow && daysUntil(c.nextFollow) !== null && daysUntil(c.nextFollow) <= 0)
      .sort((a, b) => a.nextFollow.localeCompare(b.nextFollow));
    const birthdays = db.clients
      .filter(c => { const d = daysUntilBirthday(c.birthday); return d !== null && d <= 7; });

    root.innerHTML =
      '<div class="greet-card"><div class="greet-t">' + esc(greeting()) + '</div>' +
      '<div class="greet-d">' + longDate() + ' · 今天也要照顾好每一位客户</div></div>' +

      '<div class="sec-title">市场速览<span class="sec-tip" id="quoteTime"></span></div>' +
      '<div class="idx-row" id="idxRow">' + this._idxSkeleton() + '</div>' +

      '<div class="sec-title">我的自选<button class="link-btn" id="addStockBtn">＋ 添加</button></div>' +
      '<div class="card" id="watchCard"></div>' +

      '<div class="sec-title">今日待办</div>' +
      (due.length || birthdays.length
        ? '<div class="card todo-card">' +
          (due.length ? due.map(c =>
            '<div class="todo-row" data-cid="' + c.id + '"><span class="todo-dot' +
            (daysUntil(c.nextFollow) < 0 ? ' overdue' : '') + '"></span>' +
            '<span class="todo-name">' + esc(c.name) + '</span>' +
            '<span class="todo-sub">' + (daysUntil(c.nextFollow) < 0 ? '已逾期 ' : '今天跟进') +
            ' · ' + esc(c.riskLevel) + '</span></div>').join('') : '') +
          birthdays.map(c => {
            const d = daysUntilBirthday(c.birthday);
            return '<div class="todo-row" data-cid="' + c.id + '"><span class="todo-dot bday"></span>' +
              '<span class="todo-name">' + esc(c.name) + '</span>' +
              '<span class="todo-sub">' + (d === 0 ? '今天生日 🎂' : d + '天后生日 🎂') + '</span></div>';
          }).join('') +
          '</div>'
        : '<div class="card empty-card">今日没有待跟进客户，保持节奏 ☕</div>') +

      '<div class="quick-grid">' +
      '<button class="quick-btn" data-nav="clients">👥<span>客户档案</span></button>' +
      '<button class="quick-btn" data-nav="suit">✅<span>适当性检查</span></button>' +
      '<button class="quick-btn" data-nav="content">📰<span>AI 晨报</span></button>' +
      '<button class="quick-btn" data-nav="tools">🧰<span>实用工具</span></button>' +
      '</div>' +

      '<div class="page-disc">本工具仅供投顾个人工作辅助，所有内容须经人工审核后使用，不构成投资建议。</div>';

    $('#addStockBtn').addEventListener('click', () => this._addStock());
    $$('.todo-row', root).forEach(r => r.addEventListener('click', () => {
      ClientsView.pendingOpen = r.dataset.cid;
      location.hash = '#/clients';
    }));
    $$('.quick-btn', root).forEach(b => b.addEventListener('click', () => {
      location.hash = '#/' + b.dataset.nav;
    }));

    this._refresh(true);
    this.timer = setInterval(() => { if (!document.hidden) this._refresh(false); }, Quotes.REFRESH_MS);
  },

  destroy() { clearInterval(this.timer); },

  _idxSkeleton() {
    return ['sh000001', 'sz399001', 'sz399006', 'sh000300'].map(() =>
      '<div class="idx-card skel"><div class="idx-name">--</div><div class="idx-price">--</div><div class="idx-pct">--</div></div>'
    ).join('');
  },

  async _refresh(force) {
    const codes = ['sh000001', 'sz399001', 'sz399006', 'sh000300']
      .concat(Store.db.watchlist.map(w => w.code));
    try {
      const data = await Quotes.getAll(codes, force);
      this._renderIdx(data);
      this._renderWatch(data);
      const first = data['sh000001'];
      const timeEl = $('#quoteTime');
      if (!timeEl) return;
      const digits = (((first || {}).time) || '').replace(/\D/g, '');
      const m = /(\d{2})(\d{2})(\d{2})$/.exec(digits);
      timeEl.textContent = m ? '更新 ' + m[1] + ':' + m[2] : '';
    } catch (e) {
      const timeEl = $('#quoteTime');
      if (timeEl) timeEl.textContent = '行情获取失败';
    }
  },

  _renderIdx(data) {
    const conf = [['sh000001', '上证指数'], ['sz399001', '深证成指'], ['sz399006', '创业板指'], ['sh000300', '沪深300']];
    $('#idxRow').innerHTML = conf.map(([code, fallback]) => {
      const q = data[code];
      const name = (q && q.name) || fallback;
      if (!q) return '<div class="idx-card"><div class="idx-name">' + name + '</div><div class="idx-price">--</div><div class="idx-pct">--</div></div>';
      return '<div class="idx-card"><div class="idx-name">' + esc(name) + '</div>' +
        '<div class="idx-price">' + (q.price != null ? q.price.toFixed(2) : '--') + '</div>' +
        '<div class="idx-pct ' + pctClass(q.change) + '">' + fmtPct(q.pct, true) + '</div></div>';
    }).join('');
  },

  _renderWatch(data) {
    const list = Store.db.watchlist;
    const card = $('#watchCard');
    if (!list.length) {
      card.innerHTML = '<div class="empty-card">还没有自选，点右上"＋ 添加"</div>';
      return;
    }
    card.innerHTML = list.map(w => {
      const q = data[w.code];
      const pct = q ? q.pct : null;
      return '<div class="stock-row" data-code="' + w.code + '">' +
        '<div class="s-main"><span class="s-name">' + esc(q ? q.name : w.name) + '</span>' +
        '<span class="s-code">' + w.code + '</span></div>' +
        '<div class="s-price">' + (q && q.price != null ? q.price.toFixed(2) : '--') + '</div>' +
        '<div class="s-pct ' + (q ? pctClass(q.change) : '') + '">' + (q ? fmtPct(pct, true) : '--') + '</div>' +
        '<button class="row-x" data-del="' + w.code + '" aria-label="删除">✕</button></div>';
    }).join('');
    $$('.row-x', card).forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const code = b.dataset.del;
      const item = list.find(w => w.code === code);
      confirmModal('删除自选', '确定删除「' + esc(item ? item.name : code) + '」吗？', () => {
        Store.db.watchlist = list.filter(w => w.code !== code);
        Store.save();
        this._refresh(true);
        toast('已删除');
      }, '删除', true);
    }));
  },

  _addStock() {
    modal({
      title: '添加自选',
      body: '<div class="field"><label>股票/基金代码</label>' +
        '<input name="code" type="text" placeholder="如 600519、510300、300750 或 sh600519" autocomplete="off"></div>',
      actions: [
        { text: '取消', cls: 'ghost' },
        {
          text: '添加', cls: 'primary', onClick: async (close) => {
            const input = $('[name="code"]');
            const code = Quotes.normalizeCode(input.value);
            if (!code) { toast('代码格式不对，请输入6位代码', 'warn'); return; }
            if (Store.db.watchlist.some(w => w.code === code)) { toast('已在自选中', 'warn'); return; }
            toast('正在获取名称…');
            try {
              const q = await Quotes.lookup(code);
              Store.db.watchlist.push({ code, name: q ? q.name : code });
              Store.save();
              close();
              this._refresh(true);
              toast('已添加 ' + (q ? q.name : code));
            } catch (e) {
              toast('获取行情失败，请检查网络', 'warn');
            }
          }
        }
      ]
    });
    setTimeout(() => { const i = $('[name="code"]'); i && i.focus(); }, 100);
  }
};
