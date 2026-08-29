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
    if (this.tab === 'morning') this._renderMorning(box);
    else if (this.tab === 'script') this._renderScript(box);
    else this._renderSaved(box);
  },

  /* ---------- 晨报 ---------- */
  _renderMorning(box) {
    box.innerHTML = this._keyBanner() +
      '<div class="card">' +
      '<div class="field"><label>今晨素材（把新闻标题、隔夜行情、公司资讯粘进来）</label>' +
      '<textarea id="morningNews" rows="6" placeholder="例：\n· 美股三大指数收涨，纳指涨1.2%\n· 央行开展3000亿逆回购\n· 两部门发布XX产业支持政策\n· 国际油价涨2%"></textarea></div>' +
      '<div class="row-btns"><button class="btn wide" id="genMorning">生成晨报</button></div>' +
      '<div class="field" id="morningOutWrap" style="display:none"><label>生成结果（可编辑）</label>' +
      '<textarea id="morningOut" rows="10"></textarea></div>' +
      '<div class="row-btns" id="morningActs" style="display:none">' +
      '<button class="btn ghost wide" id="copyMorning">复制</button>' +
      '<button class="btn ghost wide" id="saveMorning">存入收藏</button></div>' +
      '</div>';
    $('#genMorning').addEventListener('click', () => this._genMorning());
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

  async _genMorning() {
    if (this.busy) return;
    const news = $('#morningNews').value.trim();
    if (!news) { toast('请先粘贴今晨素材', 'warn'); return; }
    if (!Store.db.settings.ai.key) { toast('请先在设置中配置 AI Key', 'warn'); location.hash = '#/settings'; return; }
    this._setBusy($('#genMorning'), true);
    try {
      const r = await AI.genMorning(news);
      $('#morningOut').value = r.text;
      $('#morningOutWrap').style.display = '';
      $('#morningActs').style.display = '';
      toast('生成完成，用时 ' + Math.round(r.ms / 1000) + ' 秒');
    } catch (e) { this._aiError(e); }
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
    if (!Store.db.settings.ai.key) { toast('请先在设置中配置 AI Key', 'warn'); location.hash = '#/settings'; return; }
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
    if (e.code === 'NO_KEY') { toast('请先配置 AI Key', 'warn'); location.hash = '#/settings'; return; }
    modal({
      title: '生成失败',
      body: '<p class="modal-msg">' + esc(e.message || String(e)) + '</p>' +
        '<p class="modal-msg sub">提示：若提示跨域/网络错误，请通过电脑上的"启动.bat"打开本工具（自带代理通道）。</p>',
      actions: [{ text: '知道了', cls: 'primary' }]
    });
  }
};
