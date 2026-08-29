/* AI 客户端：OpenAI 兼容接口（智谱 GLM / DeepSeek / 通义等均可），自动尝试本地代理绕过跨域 */
'use strict';

const AI = (() => {
  const SYSTEM_MORNING =
    '你是持牌证券公司投顾部的资深晨报编辑。你的产出会被投顾审核后转发给客户，必须严格遵守合规要求：' +
    '不荐股、不给具体买卖点位、不承诺或暗示收益、不夸大宣传、不使用情绪化煽动性语言。' +
    '信息不足时如实注明，禁止编造数据。输出为纯文本，格式如下：\n' +
    '【一句话看市】一句话概括市场主基调（30字内）\n' +
    '【隔夜与盘前】外盘/期货/重要数据要点，1-3行\n' +
    '【要闻点评】3-5条，每条格式为"· 要闻：…… 点评：……"，点评客观中性\n' +
    '【今日关注】当日需要留意的事件或数据，1-3条\n' +
    '【风险提示】一行固定风险提示\n' +
    '总长度300-500字，语言简洁专业，方便直接转发客户群。';

  const SYSTEM_SCRIPT =
    '你是持牌证券公司的资深投资顾问，擅长把复杂的市场和产品讲得客户听得懂、愿意听。' +
    '你写的客户沟通话术必须符合监管要求（《证券期货投资者适当性管理办法》）：不承诺收益、不夸大、不贬低同业、' +
    '提及产品必须带风险提示、语气真诚专业不油腻。输出两段：\n' +
    '【话术正文】150-250字，口语化，可直接发微信或电话参考\n' +
    '【注意事项】2-3条，提醒投顾使用该话术时的合规要点（如需确认客户风险等级、不得代客操作等）';

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
