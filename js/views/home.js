/* 首页：今日待办 + 快捷入口 */
'use strict';

const HomeView = {
  title: '投顾工作台',

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

      '<div class="sec-title">今日待办</div>' +
      (due.length || birthdays.length
        ? '<div class="card todo-card">' +
          (due.length ? due.map(c =>
            '<div class="todo-row" data-cid="' + c.id + '"><span class="todo-dot' +
            (daysUntil(c.nextFollow) < 0 ? ' overdue' : '') + '"></span>' +
            '<span class="todo-name">' + esc(c.name) + '</span>' +
            '<span class="todo-sub">' + (daysUntil(c.nextFollow) < 0 ? '已逾期 ' : '今天跟进') +
            ' · ' + esc((c.types || [])[0] || '客户') + '</span></div>').join('') : '') +
          birthdays.map(c => {
            const d = daysUntilBirthday(c.birthday);
            return '<div class="todo-row" data-cid="' + c.id + '"><span class="todo-dot bday"></span>' +
              '<span class="todo-name">' + esc(c.name) + '</span>' +
              '<span class="todo-sub">' + (d === 0 ? '今天生日 🎂' : d + '天后生日 🎂') + '</span></div>';
          }).join('') +
          '</div>'
        : '<div class="card empty-card">今日没有待跟进客户，保持节奏 ☕</div>') +

      '<div class="sec-title">快捷入口</div>' +
      '<div class="quick-grid">' +
      '<button class="quick-btn" data-nav="clients" data-act="add">➕<span>新增客户</span></button>' +
      '<button class="quick-btn" data-nav="content" data-tab="morning">📰<span>AI 晨报</span></button>' +
      '<button class="quick-btn" data-nav="content" data-tab="script">💬<span>生成话术</span></button>' +
      '<button class="quick-btn" data-nav="content" data-tab="saved">📁<span>收藏库</span></button>' +
      '</div>' +

      '<div class="page-disc">本工具仅供投顾个人工作辅助，内容请自行确认后再发送客户。</div>';

    $$('.todo-row', root).forEach(r => r.addEventListener('click', () => {
      ClientsView.pendingOpen = r.dataset.cid;
      location.hash = '#/clients';
    }));
    $$('.quick-btn', root).forEach(b => b.addEventListener('click', () => {
      if (b.dataset.act === 'add') ClientsView.pendingAdd = true;
      if (b.dataset.tab) ContentView.tab = b.dataset.tab;
      location.hash = '#/' + b.dataset.nav;
    }));
  },

  destroy() { /* 无定时器 */ }
};
