/* 云同步：用 GitHub 私有 Gist 作为存储，多设备共享同一份数据
   数据在浏览器与 GitHub 之间直传（GitHub API 支持跨域），本工具不设任何中间服务器 */
'use strict';

const Sync = (() => {
  const FILE = 'tougu-data.json';
  let pushTimer = null;
  let suppressNextPush = false;

  function cfg() { return Store.db.settings.sync || {}; }
  function enabled() { const c = cfg(); return !!(c.token && c.gistId); }
  function apiBase() { return (cfg().endpoint || 'https://api.github.com').replace(/\/+$/, ''); }

  function headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + cfg().token,
      'Accept': 'application/vnd.github+json'
    };
  }

  function errMsg(status, d) {
    const map = { 401: 'Token 无效或已过期', 403: '没有权限（检查 Token 的 gist 授权）', 404: 'Gist 不存在（检查 Gist ID）' };
    return (map[status] || 'HTTP ' + status) + (d && d.message ? '：' + d.message : '');
  }

  /* 同步的数据：剔除本机密钥（Token / AI Key 不上云） */
  function payload() {
    Store.db.meta = Store.db.meta || {};
    Store.db.meta.savedAt = new Date().toISOString();
    const db = JSON.parse(JSON.stringify(Store.db));
    if (db.settings) {
      delete db.settings.sync;
      if (db.settings.ai) delete db.settings.ai.key;
    }
    return db;
  }

  async function createGist() {
    const r = await fetch(apiBase() + '/gists', {
      method: 'POST', headers: headers(),
      body: JSON.stringify({
        description: '投顾工作台数据备份（请勿公开）',
        public: false,
        files: { [FILE]: { content: JSON.stringify(payload(), null, 1) } }
      })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(errMsg(r.status, d));
    return d.id;
  }

  async function push() {
    if (!enabled()) { const e = new Error('未配置云同步'); e.code = 'NO_SYNC'; throw e; }
    const r = await fetch(apiBase() + '/gists/' + cfg().gistId, {
      method: 'PATCH', headers: headers(),
      body: JSON.stringify({ files: { [FILE]: { content: JSON.stringify(payload(), null, 1) } } })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(errMsg(r.status, d));
    markSynced();
    return { savedAt: (Store.db.meta || {}).savedAt };
  }

  async function pull() {
    if (!enabled()) { const e = new Error('未配置云同步'); e.code = 'NO_SYNC'; throw e; }
    const r = await fetch(apiBase() + '/gists/' + cfg().gistId, { headers: headers() });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(errMsg(r.status, d));
    const raw = d.files && d.files[FILE] && d.files[FILE].content;
    if (!raw) throw new Error('云端还没有数据文件，请先在其他设备上传');
    return { data: JSON.parse(raw), updatedAt: d.updated_at };
  }

  /* 应用云端数据：保留本机的同步/AI 配置与密钥 */
  function applyRemote(data) {
    const keep = { sync: Store.db.settings.sync, ai: Store.db.settings.ai };
    if (!data.settings) data.settings = {};
    data.settings.sync = keep.sync;
    data.settings.ai = keep.ai;
    if (!data.meta) data.meta = {};
    suppressNextPush = true;
    Store.importJSON(JSON.stringify(data));
    markSynced();
  }

  function markSynced() {
    try { localStorage.setItem('tougu_last_sync', new Date().toISOString()); } catch (e) { /* 忽略 */ }
  }
  function lastSynced() { try { return localStorage.getItem('tougu_last_sync'); } catch (e) { return null; } }

  /* 数据变化后自动上传（防抖 2.5 秒） */
  function autoPush() {
    if (suppressNextPush) { suppressNextPush = false; return; }
    if (!enabled() || !cfg().auto) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { push().catch(() => {}); }, 2500);
  }

  /* 打开 App 时：云端比本机新则自动拉取（两端同时改动时以最后上传为准） */
  async function pullIfNewer() {
    if (!enabled() || !cfg().auto) return;
    try {
      const r = await pull();
      const remote = r.data && r.data.meta && r.data.meta.savedAt;
      const local = (Store.db.meta || {}).savedAt;
      if (remote && (!local || remote > local)) {
        applyRemote(r.data);
        if (window.App && App.render) App.render();
        toast('已从云端同步最新数据');
      }
    } catch (e) { /* 后台静默，不打扰使用 */ }
  }

  function init() {
    document.addEventListener('store:saved', autoPush);
    setTimeout(pullIfNewer, 1500);
  }

  return { cfg, enabled, createGist, push, pull, applyRemote, init, lastSynced };
})();
