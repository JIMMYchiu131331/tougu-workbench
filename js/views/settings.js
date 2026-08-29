/* 设置：AI配置 / 数据管理 / 手机使用说明 / 关于 */
'use strict';

const SettingsView = {
  title: '设置',

  render(root) {
    const ai = Store.db.settings.ai;
    const sync = Sync.cfg();
    root.innerHTML =
      '<div class="sec-title">AI 大模型配置</div>' +
      '<div class="card">' +
      '<div class="field"><label>接口地址（OpenAI 兼容）</label>' +
      '<input id="aiEndpoint" type="text" value="' + esc(ai.endpoint) + '"></div>' +
      '<div class="field"><label>模型名称（点输入框可选常用模型）</label>' +
      '<input id="aiModel" type="text" value="' + esc(ai.model) + '" list="modelList" placeholder="glm-4-flash / glm-5.3-flash / deepseek-chat 等">' +
      '<datalist id="modelList">' +
      ['glm-5.3-flash', 'glm-4.5-flash', 'glm-4-flash', 'deepseek-chat', 'deepseek-reasoner']
        .map(m => '<option value="' + m + '"></option>').join('') +
      '</datalist></div>' +
      '<div class="field"><label>API Key</label>' +
      '<input id="aiKey" type="password" value="' + esc(ai.key) + '" placeholder="粘贴你的 Key，仅保存在本机"></div>' +
      '<div class="calc-note">当前状态：' + (ai.key ? '✓ 已配置 Key（' + esc(ai.key.slice(0, 6)) + '…）' : '✗ 还没有保存 Key —— 粘贴后必须点「保存」或「测试连接」才算数') + '</div>' +
      '<div class="row-btns">' +
      '<button class="btn ghost wide" id="aiTest">测试连接</button>' +
      '<button class="btn wide" id="aiSave">保存</button></div>' +
      '<div class="calc-note">智谱 BigModel 用户：到 open.bigmodel.cn 控制台 → API Keys 创建即可。模型名可在其"模型广场"查最新（如 glm-5.3-flash 效果更好，glm-4-flash 免费）。DeepSeek/通义等 OpenAI 兼容接口改地址即可用。改完点"测试连接"验证。Key 只存在本机浏览器中。</div>' +
      '</div>' +

      '<div class="sec-title">数据管理</div>' +
      '<div class="card">' +
      '<div class="row-btns">' +
      '<button class="btn ghost wide" id="btnExport">导出数据</button>' +
      '<button class="btn ghost wide" id="btnImport">导入数据</button></div>' +
      '<div class="row-btns">' +
      '<button class="btn ghost wide" id="btnClearDemo">清除示例客户</button>' +
      '<button class="btn ghost wide danger-text" id="btnReset">恢复出厂</button></div>' +
      '<input type="file" id="importFile" accept=".json" style="display:none">' +
      '<div class="calc-note">数据全部保存在本设备浏览器里，换手机/重装前请先导出备份。</div>' +
      '</div>' +

      '<div class="sec-title">云同步（多设备共享数据）</div>' +
      '<div class="card">' +
      '<div class="field"><label>GitHub Token（需要 gist 权限）</label>' +
      '<input id="syncToken" type="password" value="' + esc(sync.token || '') + '" placeholder="ghp_ 开头的个人访问令牌"></div>' +
      '<div class="field"><label>Gist ID（点"初始化云端"后自动填入）</label>' +
      '<input id="syncGist" type="text" value="' + esc(sync.gistId || '') + '" placeholder="其他设备同步用的同一串 ID"></div>' +
      '<div class="field"><label>接口地址（一般不用改）</label>' +
      '<input id="syncEndpoint" type="text" value="' + esc(sync.endpoint || 'https://api.github.com') + '"></div>' +
      '<label class="check-row" style="border:none;padding:4px 0"><input type="checkbox" id="syncAuto"' + (sync.auto ? ' checked' : '') + '><span>自动同步：打开时拉取最新 + 修改后自动上传</span></label>' +
      '<div class="row-btns">' +
      '<button class="btn ghost wide" id="syncSaveCfg">保存配置</button>' +
      '<button class="btn ghost wide" id="syncCreate">初始化云端</button></div>' +
      '<div class="row-btns">' +
      '<button class="btn wide" id="syncUp">⬆ 立即上传</button>' +
      '<button class="btn ghost wide" id="syncDown">⬇ 立即拉取</button></div>' +
      (Sync.lastSynced() ? '<div class="calc-note">上次同步：' + esc(Sync.lastSynced().replace('T', ' ').slice(0, 19)) + '</div>' : '') +
      '<div class="calc-note">数据存在你自己的 GitHub 私有 Gist 里，本工具不经过任何第三方服务器。手机和电脑填同一套 Token + Gist ID 即可互通；两端同时改动时，以最后上传的为准。</div>' +
      '</div>' +

      '<div class="sec-title">手机上使用</div>' +
      '<div class="card help-card">' +
      '<p><b>方式一：电脑启动（推荐）</b><br>' +
      '1. 电脑双击「启动.bat」<br>' +
      '2. 手机与电脑连同一个 WiFi<br>' +
      '3. 手机浏览器打开程序窗口显示的地址，如 <b>http://192.168.1.5:8000</b><br>' +
      '4. 浏览器菜单 → 添加到主屏幕，即可像App一样使用</p>' +
      '<p><b>方式二：公网部署</b><br>' +
      '把整个文件夹上传到任意静态托管（公司内网服务器、GitHub Pages、Vercel 等），手机直接访问，全办公室共用。</p>' +
      '<p class="sub">注意：数据按设备存储，手机和电脑各自独立；重要数据用「导出数据」互传。</p>' +
      '</div>' +

      '<div class="sec-title">关于</div>' +
      '<div class="card help-card">' +
      '<p><b>投顾工作台 v1.2.0</b></p>' +
      '<p class="sub">客户档案 · AI晨报/话术 · 实用工具 · 云同步</p>' +
      '<p class="disc">免责声明：本工具为个人辅助工作软件，与任何证券公司官方无关。行情数据来自公开接口，可能有延迟，不作为交易依据。AI 生成内容必须经人工审核并遵守公司合规要求后才能使用。本工具不构成任何投资建议。</p>' +
      '</div>';

    $('#aiSave').addEventListener('click', () => {
      const ep = ($('#aiEndpoint').value.trim() || '').replace(/\/+$/, ''); // 结尾多一个/会导致405
      const model = $('#aiModel').value.trim();
      const key = $('#aiKey').value.trim();
      if (!ep.startsWith('http')) { toast('接口地址要以 http 开头', 'warn'); return; }
      Store.db.settings.ai = { endpoint: ep, model: model || 'glm-4-flash', key };
      Store.save();
      $('#aiEndpoint').value = ep;
      toast('已保存 AI 配置');
    });

    $('#aiTest').addEventListener('click', async () => {
      const ep = ($('#aiEndpoint').value.trim() || '').replace(/\/+$/, '');
      if (!ep.startsWith('http')) { toast('接口地址要以 http 开头', 'warn'); return; }
      const cfg = { endpoint: ep, model: $('#aiModel').value.trim() || 'glm-4-flash', key: $('#aiKey').value.trim() };
      if (!cfg.key) { toast('请先粘贴 API Key', 'warn'); return; }
      Store.db.settings.ai = cfg; // 测试即保存，避免“粘了没存”的坑
      Store.save();
      const btn = $('#aiTest');
      btn.disabled = true; btn.textContent = '测试中…';
      try {
        const r = await AI.test();
        toast('已保存 ✓ 连接正常（' + Math.round(r.ms / 1000) + 's）');
      } catch (e) {
        toast('已保存，但连接失败：' + (e.message || '').slice(0, 60), 'warn');
      }
      btn.disabled = false; btn.textContent = '测试连接';
      this.render(root); // 刷新 Key 状态显示
    });

    /* ---------- 云同步 ---------- */
    const saveSyncCfg = () => {
      const ep = $('#syncEndpoint').value.trim() || 'https://api.github.com';
      if (!ep.startsWith('http')) { toast('接口地址要以 http 开头', 'warn'); return false; }
      Store.db.settings.sync = {
        endpoint: ep,
        token: $('#syncToken').value.trim(),
        gistId: $('#syncGist').value.trim(),
        auto: $('#syncAuto').checked
      };
      Store.save();
      return true;
    };

    $('#syncSaveCfg').addEventListener('click', () => {
      if (saveSyncCfg()) toast('同步配置已保存');
    });

    $('#syncCreate').addEventListener('click', async () => {
      const btn = $('#syncCreate');
      const token = $('#syncToken').value.trim();
      if (!token) { toast('请先填写 GitHub Token', 'warn'); return; }
      if (!saveSyncCfg()) return;
      btn.disabled = true; btn.textContent = '创建中…';
      try {
        const id = await Sync.createGist();
        Store.db.settings.sync.gistId = id;
        Store.save();
        $('#syncGist').value = id;
        toast('云端初始化成功 ✓ Gist ID：' + id.slice(0, 8) + '…');
      } catch (e) {
        toast('创建失败：' + (e.message || '').slice(0, 60), 'warn');
      }
      btn.disabled = false; btn.textContent = '初始化云端';
    });

    $('#syncUp').addEventListener('click', async () => {
      const btn = $('#syncUp');
      if (!saveSyncCfg()) return;
      if (!Sync.enabled()) { toast('请先填写 Token 并初始化云端', 'warn'); return; }
      btn.disabled = true; btn.textContent = '上传中…';
      try {
        await Sync.push();
        toast('已上传到云端 ✓');
        this.render(root);
      } catch (e) {
        toast('上传失败：' + (e.message || '').slice(0, 60), 'warn');
      }
      btn.disabled = false; btn.textContent = '⬆ 立即上传';
    });

    $('#syncDown').addEventListener('click', async () => {
      const btn = $('#syncDown');
      if (!saveSyncCfg()) return;
      if (!Sync.enabled()) { toast('请先填写 Token 并初始化云端', 'warn'); return; }
      btn.disabled = true; btn.textContent = '拉取中…';
      try {
        const r = await Sync.pull();
        confirmModal('从云端拉取', '将用云端数据（' + esc(((r.data.meta || {}).savedAt || '').replace('T', ' ').slice(0, 19)) +
          ' 的版本）<b>覆盖</b>本机数据，确定吗？', () => {
          Sync.applyRemote(r.data);
          this.render(root);
          if (window.App && App.render) App.render();
          toast('已从云端拉取 ✓');
        }, '覆盖本机', true);
      } catch (e) {
        toast('拉取失败：' + (e.message || '').slice(0, 60), 'warn');
      }
      btn.disabled = false; btn.textContent = '⬇ 立即拉取';
    });

    $('#btnExport').addEventListener('click', () => {
      const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '投顾工作台备份_' + todayStr() + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
      toast('已导出备份文件');
    });

    $('#btnImport').addEventListener('click', () => $('#importFile').click());
    $('#importFile').addEventListener('change', e => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        confirmModal('导入数据', '导入将<b>覆盖</b>当前设备上的全部数据，确定继续？', () => {
          try {
            Store.importJSON(reader.result);
            toast('导入成功');
            App.render();
          } catch (err) {
            toast('导入失败：' + err.message, 'warn');
          }
        }, '导入覆盖', true);
      };
      reader.readAsText(f, 'utf-8');
      e.target.value = '';
    });

    $('#btnClearDemo').addEventListener('click', () => {
      confirmModal('清除示例客户', '将删除王建国、陈志远、刘婷、赵秀兰四个示例档案，自己建的客户不受影响。', () => {
        Store.clearSampleClients();
        toast('示例客户已清除');
      });
    });

    $('#btnReset').addEventListener('click', () => {
      confirmModal('恢复出厂设置', '将清空全部数据并恢复示例内容，确定吗？', () => {
        Store.resetAll();
        toast('已恢复出厂');
        App.render();
      }, '全部清空', true);
    });
  }
};
