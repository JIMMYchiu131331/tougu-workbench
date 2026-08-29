/* 路由与启动 */
'use strict';

const App = (() => {
  const routes = {
    home: HomeView,
    clients: ClientsView,
    suit: SuitView,
    content: ContentView,
    tools: ToolsView,
    settings: SettingsView
  };
  let current = null;
  let currentName = '';

  function tabName() {
    const h = location.hash.replace('#/', '');
    return routes[h] ? h : 'home';
  }

  function renderTopbar(name) {
    const bar = $('#topbar');
    const v = routes[name];
    if (name === 'settings') {
      bar.innerHTML = '<button class="icon-btn" id="backBtn">‹ 返回</button><span class="tb-title">' + esc(v.title) + '</span><span class="tb-spacer"></span>';
      $('#backBtn').addEventListener('click', () => { history.back(); setTimeout(() => { if (tabName() === 'settings') location.hash = '#/home'; }, 60); });
    } else {
      bar.innerHTML = '<span class="tb-logo">📈</span><span class="tb-title">' + esc(v.title) + '</span><button class="icon-btn" id="gearBtn" aria-label="设置">⚙️</button>';
      $('#gearBtn').addEventListener('click', () => { location.hash = '#/settings'; });
    }
  }

  function render() {
    const name = tabName();
    const v = routes[name];
    if (current && current.destroy) current.destroy();
    if (currentName && current) $('#tabbar').querySelector('[data-tab="' + currentName + '"]')?.classList.remove('active');
    currentName = name;
    current = v;
    renderTopbar(name);
    $$('#tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    window.scrollTo(0, 0);
    v.render($('#view'));
  }

  function init() {
    Store.load();
    Sync.init();
    $('#tabbar').innerHTML =
      '<button data-tab="home" class="active"><span class="tab-ico">🏠</span>首页</button>' +
      '<button data-tab="clients"><span class="tab-ico">👥</span>客户</button>' +
      '<button data-tab="suit"><span class="tab-ico">✅</span>适当性</button>' +
      '<button data-tab="content"><span class="tab-ico">💬</span>话术</button>' +
      '<button data-tab="tools"><span class="tab-ico">🧰</span>工具</button>';
    $$('#tabbar button').forEach(b => b.addEventListener('click', () => {
      location.hash = '#/' + b.dataset.tab;
    }));
    window.addEventListener('hashchange', render);
    if (!location.hash) location.hash = '#/home';
    render();

    // Service Worker：有网时注册（localhost/HTTPS 下生效，局域网 HTTP 下静默跳过）
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  return { init, render };
})();

document.addEventListener('DOMContentLoaded', App.init);
