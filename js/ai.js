/* AI 客户端：OpenAI 兼容接口（智谱 GLM / DeepSeek / 通义等均可），自动尝试本地代理绕过跨域 */
'use strict';

const AI = (() => {
  const SYSTEM_SCRIPT =
    '你是证券公司里业绩最好的金牌投资顾问，最擅长维护客户关系、把服务做成回头客。' +
    '你在帮同事写发给客户的沟通话术，要求：' +
    '1. 口语化、像一条真实的微信消息，有温度、不官方、不堆砌套话，可以适量用表情；' +
    '2. 结尾留一个自然的行动钩子（约时间、抛话题、给个由头让客户回复），帮投顾推进关系；' +
    '3. 如果场景是"客户生日/节日问候"或产品为"不涉及产品"，就纯粹做关系维护，绝口不提产品和市场；' +
    '4. 涉及产品时，把卖点讲成人话，突出对客户的具体价值，自然带出，不硬销；' +
    '5. 客户称呼、具体数字等不确定的信息用【】留空（如【王总】【20%】），禁止编造具体收益率和市场数据；' +
    '6. 唯一红线：不写"保本""保证收益""稳赚""零风险"等承诺性表述（违法，且会连累使用者）。' +
    '输出要求：只输出话术正文本身（100-250字，可直接复制发送），不要任何标题、不要【话术正文】字样、不要注意事项、不要解释。';

  const SYSTEM_MORNING =
    '你是证券公司投顾部最受欢迎的晨报主笔，产出会被投顾直接转发到客户群。' +
    '你会收到自动抓取的最新行情数据和财经快讯，据此写一份固定格式的晨报。' +
    '输出格式严格固定如下（标题日期用素材里给的日期）：\n' +
    '【X月X日投顾晨报】\n' +
    '一、隔夜外盘\n（美股三大指数与港股表现，1-3行，数据全部来自素材）\n' +
    '二、昨日市场回顾\n（A股三大指数点位与涨跌幅、两市成交额，2-3句，可加一句盘面特征）\n' +
    '三、要闻速递\n（从快讯中挑4-6条重要的，每条以"· "开头，一行一条，可注明【央行】【行业】等小标签）\n' +
    '四、今日关注\n（结合要闻给1-3条当日值得留意的方向或事件，客观中立，不荐股不给点位）\n' +
    '结尾固定一行：市场有风险，投资需谨慎。\n' +
    '硬性要求：所有数字必须来自素材，禁止编造；某类数据缺失就如实跳过该句；快讯不够就少写几条；' +
    '语言简洁专业、有温度、像行家在说话；总长350-550字。';

  function parseResp(data) {
    const t = data && data.choices && data.choices[0] && data.choices[0].message
      && data.choices[0].message.content;
    if (typeof t !== 'string' || !t.trim()) {
      throw new Error('接口返回格式异常：' + JSON.stringify(data).slice(0, 180));
    }
    return t.trim();
  }

  function httpError(status, text) {
    const friendly = friendlyHttpError(status, text);
    const e = new Error(friendly);
    e.http = true;
    return e;
  }

  function friendlyHttpError(status, text) {
    let detail = '';
    try {
      const d = JSON.parse(text);
      detail = (d.error && d.error.message) || d.message || '';
    } catch (e) { detail = (text || '').replace(/<[^>]+>/g, ' ').trim().slice(0, 120); }
    if (status === 401) return 'API Key 无效或已过期，请到「设置」重新粘贴 Key。' + (detail ? '（' + detail + '）' : '');
    if (status === 405) return '接口地址不对（405）：通常是末尾多了一个 / 或路径不完整，请到「设置」检查接口地址。';
    if (status === 429) return '调用频率或额度超限，稍后再试。' + (detail ? '（' + detail + '）' : '');
    if (status === 400 || status === 404) return '接口地址或模型名称可能有误，请检查设置。' + (detail ? '（' + detail + '）' : '');
    return 'HTTP ' + status + (detail ? '：' + detail : '');
  }

  async function chat(messages) {
    const cfg = Store.db.settings.ai;
    if (!cfg.key) {
      const err = new Error('未配置 API Key');
      err.code = 'NO_KEY';
      throw err;
    }
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + cfg.key
    };
    const body = {
      model: cfg.model || 'glm-4-flash',
      messages,
      temperature: 0.6,
      stream: false
    };
    const t0 = Date.now();
    let networkErr = null;

    // 第一通道：浏览器直连大模型接口（智谱已验证支持跨域）
    try {
      const r = await fetch(cfg.endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
      const txt = await r.text();
      if (r.ok) {
        return { text: parseResp(JSON.parse(txt)), ms: Date.now() - t0, viaProxy: false };
      }
      throw httpError(r.status, txt); // 服务器有明确回应：直接报真实原因，不走降级
    } catch (e) {
      if (e && e.http) throw e;
      networkErr = e; // 网络级失败（断网/被跨域拦截）才尝试代理通道
    }

    // 第二通道：仅当通过「启动.bat」本地打开时才存在 /api/proxy
    try {
      const r = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cfg.endpoint, headers, body })
      });
      if (r.ok) {
        return { text: parseResp(await r.json()), ms: Date.now() - t0, viaProxy: true };
      }
      throw networkErr; // 静态托管上没有代理通道（404/405），回归直连的真实错误
    } catch (e) {
      if (e && e.http) throw e;
      throw new Error('网络请求失败（可能当前网络无法直连大模型，或已被跨域拦截）。' +
        '建议：①检查手机网络后重试 ②到「设置」点「测试连接」看具体原因');
    }
  }

  function genMorning(news) {
    return chat([
      { role: 'system', content: SYSTEM_MORNING },
      { role: 'user', content: '请根据以下今晨素材生成晨报：\n\n' + news }
    ]);
  }

  function genScript(scenario, product, risk) {
    const riskLine = risk ? '客户风险承受能力等级为 ' + risk + '，话术中要贴合该等级的沟通口径。' : '';
    return chat([
      { role: 'system', content: SYSTEM_SCRIPT },
      { role: 'user', content: '场景：' + scenario + '\n涉及产品类型：' + product + '\n' + riskLine + '\n请生成沟通话术。' }
    ]);
  }

  async function test() {
    const r = await chat([{ role: 'user', content: '收到请只回复两个字：正常' }]);
    return r;
  }

  return { chat, genMorning, genScript, test };
})();
