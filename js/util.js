/* 工具库：DOM、格式化、日期、弹窗、Toast、复制 */
'use strict';

function $(sel, root) { return (root || document).querySelector(sel); }
function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------- 日期 ---------- */
function pad2(n) { return String(n).padStart(2, '0'); }
function dstr(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function todayStr() { return dstr(new Date()); }

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const parts = String(dateStr).split('-').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return null;
  const target = new Date(parts[0], parts[1] - 1, parts[2]);
  return Math.round((target - t) / 86400000);
}

/* 距离生日(MM-DD)最近一次还有多少天 */
function daysUntilBirthday(mmdd) {
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(String(mmdd || '').trim());
  if (!m) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  let t = new Date(now.getFullYear(), Number(m[1]) - 1, Number(m[2]));
  if (t < now) t = new Date(now.getFullYear() + 1, Number(m[1]) - 1, Number(m[2]));
  return Math.round((t - now) / 86400000);
}

/* 私募产品下一个开放日（支持 每周一~日 / 每月N号），返回 YYYY-MM-DD 或 null */
function nextOpenDay(od) {
  if (!od) return null;
  od = String(od).trim();
  let m;
  if ((m = /^每周([一二三四五六日])$/.exec(od))) {
    const target = '一二三四五六日'.indexOf(m[1]);
    if (target < 0) return null;
    const d = new Date();
    const diff = (target - d.getDay() + 7) % 7;
    const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
    return dstr(dt);
  }
  if ((m = /^每月(\d{1,2})[号日]?$/.exec(od))) {
    const day = Number(m[1]);
    const d = new Date();
    let dt = new Date(d.getFullYear(), d.getMonth(), day);
    if (dt.getTime() < new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) {
      dt = new Date(d.getFullYear(), d.getMonth() + 1, day);
    }
    return dstr(dt);
  }
  return null;
}

function weekCN(d) { return '日一二三四五六'[d.getDay()]; }
function longDate() {
  const d = new Date();
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 星期' + weekCN(d);
}

/* ---------- 格式化 ---------- */
function fmtMoney(n) {
  if (n == null || isNaN(n)) return '--';
  const abs = Math.abs(n);
  if (abs >= 1e8) return (n / 1e8).toFixed(2) + '亿';
  if (abs >= 1e4) return (n / 1e4).toFixed(2) + '万';
  return n.toFixed(2);
}
function fmtPct(n, sign) {
  if (n == null || isNaN(n)) return '--';
  const s = sign && n > 0 ? '+' : '';
  return s + n.toFixed(2) + '%';
}
function pctClass(n) { return n > 0 ? 'up' : (n < 0 ? 'down' : 'flat'); }

/* ---------- Toast ---------- */
let _toastTimer = null;
function toast(msg, type) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show ' + (type || '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = 'toast'; }, 2200);
}

/* ---------- 复制（兼容非 HTTPS 局域网环境） ---------- */
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { /* 走降级方案 */ }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:-999px;opacity:0';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  ta.remove();
  return ok;
}

/* ---------- 底部弹窗 ---------- */
function modal(opts) {
  // opts: {title, body(html), actions:[{text, cls, onClick(close)}], dismissable}
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  const dismissable = opts.dismissable !== false;
  overlay.innerHTML =
    '<div class="sheet">' +
    '<div class="sheet-h"><span>' + esc(opts.title || '') + '</span>' +
    (dismissable ? '<button class="sheet-x" aria-label="关闭">✕</button>' : '') + '</div>' +
    '<div class="sheet-b">' + (opts.body || '') + '</div>' +
    '<div class="sheet-f"></div></div>';
  const close = () => overlay.remove();
  if (dismissable) {
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    $('.sheet-x', overlay).addEventListener('click', close);
  }
  const foot = $('.sheet-f', overlay);
  (opts.actions || []).forEach(a => {
    const b = document.createElement('button');
    b.className = 'btn ' + (a.cls || 'primary');
    b.textContent = a.text;
    b.addEventListener('click', () => a.onClick ? a.onClick(close) : close());
    foot.appendChild(b);
  });
  if (!foot.children.length) foot.style.display = 'none';
  document.body.appendChild(overlay);
  return { close, overlay };
}

function confirmModal(title, msg, onOk, okText, danger) {
  modal({
    title, body: '<p class="modal-msg">' + msg + '</p>',
    actions: [
      { text: '取消', cls: 'ghost' },
      { text: okText || '确定', cls: danger ? 'danger' : 'primary', onClick: close => { close(); onOk && onOk(); } }
    ]
  });
}

/* ---------- 表单辅助 ---------- */
function fieldVal(root, name) {
  const el = root.querySelector('[name="' + name + '"]');
  return el ? el.value.trim() : '';
}

/* 时间问候语 */
function greeting() {
  const h = new Date().getHours();
  if (h < 6) return '夜深了，注意休息';
  if (h < 11) return '早上好，新的一天加油';
  if (h < 14) return '中午好，午后盘面留意';
  if (h < 18) return '下午好，收盘后记得复盘';
  return '晚上好，明天晨会见';
}
