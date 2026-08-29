/* 适当性检查：客户等级 × 产品等级 匹配判定 + 参考表 + 双录要点 */
'use strict';

const SuitView = {
  title: '适当性检查',

  render(root) {
    root.innerHTML =
      '<div class="card suit-card">' +
      '<div class="field"><label>客户风险承受能力等级</label><select id="suitC">' +
      ['C1', 'C2', 'C3', 'C4', 'C5'].map(r =>
        '<option value="' + r + '"' + (r === 'C3' ? ' selected' : '') + '>' + r + ' ' + this._riskName(r) + '</option>').join('') +
      '</select></div>' +
      '<div class="field"><label>产品/服务风险等级</label><select id="suitR">' +
      ['R1', 'R2', 'R3', 'R4', 'R5'].map(r =>
        '<option value="' + r + '"' + (r === 'R3' ? ' selected' : '') + '>' + r + ' ' + this._riskName(r) + '</option>').join('') +
      '</select></div>' +
      '<div class="field"><label>产品名称（选填）</label><input id="suitName" type="text" placeholder="如 XX混合型基金"></div>' +
      '<button class="btn wide" id="suitGo">开始检查</button>' +
      '</div>' +
      '<div id="suitResult"></div>' +
      '<div class="sec-title">常见产品风险等级参考</div>' +
      '<div class="card ref-table">' + this._refTable() + '</div>' +
      '<div class="sec-title">双录（录音录像）要点清单</div>' +
      '<div class="card check-list">' +
      ['告知客户产品风险等级及不匹配情形，客户确认知悉',
        '销售人员如实讲解产品结构、费率、最大损失情形',
        '客户书面签署《风险不匹配警示函》/投资者确认书',
        '全过程录音录像，画面含销售人员与客户本人',
        '资料按公司要求归档保存（一般不少于20年）'
      ].map(s => '<label class="check-row"><input type="checkbox"><span>' + s + '</span></label>').join('') +
      '</div>' +
      '<div class="page-disc">依据《证券期货投资者适当性管理办法》（证监会令第130号）及公司适当性制度。具体越级销售口径以公司合规部门规定为准。</div>';

    $('#suitGo').addEventListener('click', () => this._run());
    this._run(); // 默认给一次结果，页面不空
  },

  _riskName(r) {
    return { C1: '保守型', C2: '谨慎型', C3: '稳健型', C4: '积极型', C5: '激进型',
             R1: '低风险', R2: '中低风险', R3: '中风险', R4: '中高风险', R5: '高风险' }[r] || '';
  },

  _refTable() {
    const rows = [
      ['R1', '货币基金、国债、存款、现金管理类理财'],
      ['R2', '纯债基金、一级债基、同业存单指数基金、固定收益类集合理财'],
      ['R3', '二级债基、偏债混合、平衡混合、"固收+"类产品'],
      ['R4', '偏股混合、普通股票型、行业主题基金、指数增强'],
      ['R5', '股票、融资融券、股票期权、期货、高杠杆结构化产品']
    ];
    return '<table><thead><tr><th>等级</th><th>常见产品举例</th></tr></thead><tbody>' +
      rows.map(r => '<tr><td><b>' + r[0] + '</b></td><td>' + r[1] + '</td></tr>').join('') +
      '</tbody></table>';
  },

  _run() {
    const c = $('#suitC').value, r = $('#suitR').value;
    const name = $('#suitName').value.trim();
    const cn = Number(c[1]), rn = Number(r[1]);
    const box = $('#suitResult');
    const productName = name ? '「' + esc(name) + '」' : '';
    let verdict, cls, detail;

    if (cn >= rn) {
      verdict = '✔ 匹配，可以推荐';
      cls = 'ok';
      detail = '<p>客户风险承受能力<b>' + c + '（' + this._riskName(c) + '）</b>不低于产品风险等级<b>' + r + '（' + this._riskName(r) + '）</b>，符合适当性匹配要求。</p>' +
        '<p class="suit-note">推荐时仍应完整揭示产品风险、费率与最不利情形，做好留痕。</p>';
    } else if (cn === rn - 1) {
      verdict = '⚠ 超出风险承受能力（越一级）';
      cls = 'warn';
      detail = '<p>客户等级 <b>' + c + '</b> 低于产品等级 <b>' + r + '</b>，属于风险不匹配。普通客户原则上<b>不得主动推介</b>。</p>' +
        '<p>如客户<b>主动要求</b>购买并坚持，按监管要求需完成：</p>' +
        '<ol><li>风险不匹配警示（告知超出其风险承受能力的事实）</li><li>客户书面确认（签署确认书/承诺函）</li><li>销售过程<b>录音录像（双录）</b></li><li>部分公司对越级设有上限，须先确认公司制度允许</li></ol>';
    } else {
      verdict = '✘ 不匹配，不得推荐（越两级及以上）';
      cls = 'bad';
      detail = '<p>客户等级 <b>' + c + '</b> 低于产品等级 <b>' + r + '</b> 两个及以上级别，风险差距过大。</p>' +
        '<p>多数机构制度对此类情形<b>直接禁止销售</b>，请先咨询公司合规部门，不要自行操作。</p>';
    }

    box.innerHTML =
      '<div class="suit-result ' + cls + '">' +
      '<div class="sr-verdict">' + verdict + '</div>' +
      (productName ? '<div class="sr-product">产品 ' + productName + ' · 客户 ' + c + ' vs 产品 ' + r + '</div>'
        : '<div class="sr-product">客户 ' + c + ' vs 产品 ' + r + '</div>') +
      '<div class="sr-detail">' + detail + '</div></div>';
  }
};
