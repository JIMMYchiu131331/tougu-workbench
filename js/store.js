/* 数据层：localStorage 单例存储 + 示例数据 + 导入导出 */
'use strict';

const Store = (() => {
  const KEY = 'tougu_workbench_v1';

  function seed() {
    const t = new Date();
    const d = n => { const x = new Date(t); x.setDate(x.getDate() + n); return dstr(x); };
    const p1 = uid(), p2 = uid(), p3 = uid();
    return {
      meta: { v: 1, created: t.toISOString() },
      products: [
        { id: p1, name: 'XX中性一号', strategy: '市场中性', aum: 30, annReturn: 8.5, maxDD: 2.5, openDay: '每周一', lockup: '6个月', fee: '1%+20%', quota: '额度紧张', minBuy: 100, highlight: '严控回撤，类固收增强替代', note: '' },
        { id: p2, name: 'XX指增500', strategy: '指数增强', aum: 50, annReturn: 15, maxDD: 8, openDay: '每月10号', lockup: '1年', fee: '1%+20%', quota: '有额度', minBuy: 100, highlight: '中证500增强，超额稳定', note: '' },
        { id: p3, name: 'XX CTA二号', strategy: 'CTA', aum: 20, annReturn: 12, maxDD: 6, openDay: '每周三', lockup: '6个月', fee: '1.5%+20%', quota: '有额度', minBuy: 100, highlight: '与股市低相关，分散利器', note: '' }
      ],
      settings: {
        ai: {
          endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
          model: 'glm-4-flash',
          key: ''
        }
      },
      clients: [
        {
          id: uid(), name: '王建国', phone: '', types: ['两融', 'ETF'], prefs: ['短线'],
          privateStatus: '已认证', products: [p1],
          assets: 152, tags: ['老股民'],
          holdings: '两融仓位约7成，科技股为主',
          birthday: '', nextFollow: d(-1), lastContact: d(-3),
          note: '喜欢自己研究，关心题材和热点。',
          log: [{ date: d(-3), text: '电话沟通仓位，提示控制回撤。' }]
        },
        {
          id: uid(), name: '陈志远', phone: '', types: ['公募', 'ETF'], prefs: ['波段', '稳健理财'],
          assets: 86, tags: ['稳健增值'],
          holdings: '偏股混合60%、债券基金30%、现金10%',
          birthday: '', nextFollow: d(2), lastContact: d(-6),
          note: '目标年化8%左右，接受中等波动。',
          log: [{ date: d(-6), text: '建议定投持续，勿追高。' }]
        },
        {
          id: uid(), name: '刘婷', phone: '', types: ['公募', '新客'], prefs: ['长线定投'],
          assets: 23, tags: ['上班族'],
          holdings: '指数基金定投每月2000元',
          birthday: '', nextFollow: d(0), lastContact: d(-10),
          note: '平时忙，微信沟通为主。',
          log: [{ date: d(-10), text: '确认定投扣款正常。' }]
        },
        {
          id: uid(), name: '赵秀兰', phone: '', types: ['公募'], prefs: ['稳健理财'],
          assets: 45, tags: ['保守', '养老'],
          holdings: '货币基金+国债为主',
          birthday: '09-05', nextFollow: d(9), lastContact: d(-2),
          note: '重视本金安全，几乎不碰权益。',
          log: [{ date: d(-2), text: '介绍国债逆回购操作。' }]
        },
        {
          id: uid(), name: '孙浩', phone: '', types: ['私募', '两融', '期权'], prefs: ['短线'],
          privateStatus: '已认证', products: [p2, p3],
          assets: 480, tags: ['专业投资者'],
          holdings: '私募产品200万，自有资金打板',
          birthday: '', nextFollow: d(4), lastContact: d(-1),
          note: '高净值老客户，关注私募额度和新品。',
          log: [{ date: d(-1), text: '预约下周看私募新产品。' }]
        }
      ],
      scripts: [
        {
          id: uid(), title: '市场回调安抚', tag: '通用',
          content: '【市场回调安抚】\nX总您好，今天市场波动比较大，我先跟您同步一下情况。近期调整主要受……（宏观/行业因素简述）影响，属于市场正常波动范围。\n您的组合目前……（回顾持仓结构与仓位），整体仍在您可承受的波动范围内。短期涨跌难以预测，我们更建议把注意力放在仓位结构和长期目标上。\n如果您对当前持仓有疑虑，随时联系我，我们约个时间逐项过一遍。市场有波动，服务不掉线。\n（注：沟通时避免预测点位、承诺收益）'
        },
        {
          id: uid(), title: '定投客户坚持提醒', tag: '基金',
          content: '【定投客户】\nX姐您好，最近市场调整，不少客户问要不要停定投。定投的意义恰恰是在低位积累更多便宜份额，摊薄整体成本。如果您这笔资金是3年以上的闲钱，建议按计划继续；如果现金流有压力，可以适当调低金额，但尽量不要中断。\n有任何担心随时跟我说，我们Together把纪律执行下去。\n（注：结合客户风险等级说明产品波动特征）'
        },
        {
          id: uid(), title: '新客户破冰', tag: '通用',
          content: '【新客户破冰】\nX先生您好，我是XX证券您的专属服务经理小X。以后您的账户业务、产品咨询、市场资讯都由我来服务，有问题随时找我。\n为了后续建议更适合您，我先了解一下您的情况：您平时主要做股票还是基金？可投资金大概多久不用？风险偏好偏稳健还是积极？\n您放心，信息仅用于为您匹配合适的服务，不会对外提供。'
        }
      ],
      saved: [],
      watchlist: [
        { code: 'sh600519', name: '贵州茅台' },
        { code: 'sz000858', name: '五粮液' },
        { code: 'sh601318', name: '中国平安' },
        { code: 'sz300750', name: '宁德时代' },
        { code: 'sh510300', name: '沪深300ETF' }
      ]
    };
  }

  let db = null;

  /* 补齐缺失字段（兼容旧版本数据升级） */
  function fixup() {
    if (!db.saved) db.saved = [];
    if (!db.products) db.products = [];
    if (!db.scripts) db.scripts = [];
    if (!db.scripts) db.scripts = [];
    if (!db.watchlist) db.watchlist = [];
    if (!db.clients) db.clients = [];
    if (!db.settings) db.settings = seed().settings;
    if (!db.settings.ai) db.settings.ai = seed().settings.ai;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      db = raw ? JSON.parse(raw) : null;
    } catch (e) { db = null; }
    if (!db || !db.meta) { db = seed(); save(); }
    fixup();
    return db;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch (e) { toast('数据保存失败：存储空间不足', 'warn'); }
    try { document.dispatchEvent(new Event('store:saved')); } catch (e) { /* 忽略 */ }
  }

  function exportJSON() {
    return JSON.stringify(db, null, 2);
  }

  function importJSON(text) {
    const data = JSON.parse(text); // 可能抛异常，由调用方捕获
    if (!data || typeof data !== 'object' || !Array.isArray(data.clients)) {
      throw new Error('文件格式不正确：缺少 clients 字段');
    }
    db = data;
    fixup();
    save();
  }

  function resetAll() {
    db = seed();
    save();
  }

  function clearSampleClients() {
    // 只删名字命中的示例客户，不碰用户自己建的
    const names = ['王建国', '陈志远', '刘婷', '赵秀兰'];
    db.clients = db.clients.filter(c => !names.includes(c.name));
    save();
  }

  return {
    load, save, exportJSON, importJSON, resetAll, clearSampleClients,
    get db() { return db; }
  };
})();
