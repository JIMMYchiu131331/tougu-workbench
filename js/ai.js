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
    '你是证券公司投顾部最受欢迎的晨报主笔，产出会被投顾转发到客户群。' +
    '风格要求：简洁、有观点但客观、像专业又亲切的行家在说话，不堆砌术语，不夸大不煽动。' +
    '信息不足时如实注明，禁止编造数据。输出为纯文本，格式如下：\n' +
    '【一句话看市】一句话概括市场主基调（30字内）\n' +
    '【隔夜与盘前】外盘/期货/重要数据要点，1-3行\n' +
    '【要闻点评】3-5条，每条格式为"· 要闻：…… 点评：……"，点评讲对普通投资者意味着什么\n' +
    '【今日关注】当日需要留意的事件或数据，1-3条\n' +
    '总长度300-500字，方便直接转发客户群。';

  function parseResp(data) {
    const t = data && data.choices && data.choices[0] && data.choices[0].message
      && data.choices[0].message.content;
    if (typeof t !== 'string' || !t.trim()) {
      throw new Error('接口返回格式异常：' + JSON.stringify(data).slice(0, 180));
    }
    return t.trim();
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
    try {
      const r = await fetch(cfg.endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error('HTTP ' + r.status + '：' + txt.slice(0, 200));
      }
      return { text: parseResp(await r.json()), ms: Date.now() - t0, viaProxy: false };
    } catch (e1) {
      if (e1.code === 'NO_KEY') throw e1;
      // 直连失败（多为浏览器跨域限制），尝试走本地服务器的代理通道
      try {
        const r = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: cfg.endpoint, headers, body })
        });
        if (!r.ok) throw new Error((await r.text()).slice(0, 300));
        return { text: parseResp(await r.json()), ms: Date.now() - t0, viaProxy: true };
      } catch (e2) {
        throw new Error('AI 接口调用失败：' + (e2.message || e1.message));
      }
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
