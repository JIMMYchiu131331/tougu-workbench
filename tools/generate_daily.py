# -*- coding: utf-8 -*-
"""每日晨报云端生成器（GitHub Actions 每天定时运行）

流程: 抓取行情+快讯 -> 大模型产出内容 -> 程序固定模板渲染 -> 写入 Gist(morning-latest.json)
环境变量:
    BIGMODEL_KEY  智谱 API Key（必填）
    GH_TOKEN      GitHub Token（需 gist 权限，必填）
    GIST_ID       用于存放晨报的 Gist ID（必填）
    MODEL         模型名（可选，默认 glm-4-flash）
本脚本只用 Python 标准库。
"""
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone, timedelta

API_GITHUB = "https://api.github.com"
CN_TZ = timezone(timedelta(hours=8))

MARKETS = {
    "cn": [("sh000001", "上证指数"), ("sz399001", "深证成指"), ("sz399006", "创业板指"), ("sh000300", "沪深300")],
    "us": [("usDJI", "道琼斯"), ("usIXIC", "纳斯达克"), ("usINX", "标普500")],
    "hk": [("hkHSI", "恒生指数"), ("hkHSTECH", "恒生科技指数")],
}

SYSTEM_MORNING = (
    "你是证券公司投顾部的晨报主编。你会收到自动抓取的行情与财经快讯。"
    "排版由程序负责，你只负责产出内容：输出一个JSON对象，不要输出任何其他文字。格式：\n"
    '{"news":[{"tag":"央行","text":"一行要闻"}],"focus":[{"theme":"方向名","reason":"支撑理由一句话","targets":"相关ETF或龙头，带代码"}]}\n'
    "要求：\n"
    "1. news：从快讯里挑4-6条对投资者最重要的，每条text控制在40字内讲清楚，tag是分类小标签（如 央行/美股/行业/公司）；\n"
    "2. focus：1-3个当日值得关注的方向。每个方向必须有快讯依据，禁止凭空推荐；reason说清是哪条消息支撑的、为什么值得看；\n"
    "3. targets：格式必须为「名称(代码)」，多个用顿号分隔。ETF优先从下面参考表中选（都是同类里规模最大的）：\n"
    "   大盘：沪深300ETF(510300)、上证50ETF(510050)、中证500ETF(510500)、创业板ETF(159915)、科创50ETF(588000)\n"
    "   科技：半导体ETF(512480)、芯片ETF(159995)、人工智能ETF(515070)、游戏ETF(159869)\n"
    "   金融：券商ETF(512000)、银行ETF(512800)\n"
    "   医药消费：医药ETF(512010)、酒ETF(512690)\n"
    "   新能源：新能源车ETF(515030)、光伏ETF(515790)\n"
    "   周期防御：有色金属ETF(512400)、煤炭ETF(515220)、黄金ETF(518880)、红利ETF(510880)、军工ETF(512660)\n"
    "   跨境：恒生科技ETF(513180)、纳指ETF(513100)\n"
    "   表里没有的方向用公认大盘龙头股：中国石油(601857)、中国平安(601318)、招商银行(600036)、中信证券(600030)、贵州茅台(600519)、长江电力(600900)、紫金矿业(601899)、宁德时代(300750)、比亚迪(002594)、中芯国际(688981)、中远海控(601919)\n"
    "4. 禁止编造参考表以外的代码，禁止编造任何数据和收益率；不出现“保本”“稳赚”“保证收益”等承诺性表述；\n"
    "5. 全部用中文，讲人话，别写官话套话。"
)


def http_get(url, timeout=15, decode="utf-8", headers=None):
    req = urllib.request.Request(url, headers=headers or {"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=timeout).read().decode(decode, "ignore")


def fnum(s):
    try:
        v = float(s)
        return v
    except (TypeError, ValueError):
        return None


def fetch_markets():
    codes = [c for g in MARKETS.values() for c, _ in g] + ["sz399106"]
    raw = http_get("https://qt.gtimg.cn/q=" + ",".join(codes), decode="gbk")
    data = {}
    for m in re.finditer(r'v_(\w+)="([^"]*)"', raw):
        p = m.group(2).split("~")
        if len(p) < 40:
            continue
        data[m.group(1)] = {"name": p[1], "price": fnum(p[3]), "pct": fnum(p[32]), "amount": fnum(p[37]), "time": p[30]}
    def pick(group):
        out = []
        for code, fallback in MARKETS[group]:
            q = data.get(code)
            if q and q["price"] is not None:
                out.append({"name": q["name"] or fallback, "price": q["price"], "pct": q["pct"] or 0.0})
        return out
    turnover = None
    sh, sz = data.get("sh000001"), data.get("sz399106")
    if sh and sz and sh["amount"] is not None and sz["amount"] is not None:
        turnover = (sh["amount"] + sz["amount"]) / 10000.0
    return {"cn": pick("cn"), "us": pick("us"), "hk": pick("hk"), "turnoverYi": turnover}


def fetch_news(count=28):
    raw = http_get("https://zhibo.sina.com.cn/api/zhibo/feed?page=1&page_size=%d&zhibo_id=152&tag=0" % count,
                   headers={"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
                            "Referer": "https://finance.sina.com.cn"})
    data = json.loads(raw)
    items = []
    for it in (data["result"]["data"]["feed"] or {}).get("list", []):
        t = it.get("create_time", "")
        hm = ""
        try:
            dt = datetime.strptime(t, "%a %b %d %H:%M:%S %z")
            hm = dt.strftime("%H:%M")
        except Exception:
            pass
        text = re.sub(r"<[^>]+>", "", it.get("rich_text", "")).strip()
        if len(text) > 8:
            items.append(text)
    return items


def build_material(markets, news, manual=""):
    parts = ["今天是 %s。以下是自动抓取的最新素材：" % datetime.now(CN_TZ).strftime("%Y年%m月%d日 %A").replace("Monday", "星期一").replace("Tuesday", "星期二").replace("Wednesday", "星期三").replace("Thursday", "星期四").replace("Friday", "星期五").replace("Saturday", "星期六").replace("Sunday", "星期日")]
    if markets:
        def fmt(q):
            return "%s %.2f（%s%.2f%%）" % (q["name"], q["price"], "+" if q["pct"] >= 0 else "", q["pct"])
        parts.append("【行情数据】")
        if markets["cn"]:
            parts.append("A股收盘：" + "，".join(fmt(q) for q in markets["cn"]) + "。")
        if markets.get("turnoverYi") is not None:
            parts.append("沪深两市成交额约 %.2f 万亿元。" % (markets["turnoverYi"] / 10000.0))
        if markets["us"]:
            parts.append("美股最新：" + "，".join(fmt(q) for q in markets["us"]) + "。")
        if markets["hk"]:
            parts.append("港股：" + "，".join(fmt(q) for q in markets["hk"]) + "。")
    if news:
        parts.append("【最新财经快讯】")
        for i, t in enumerate(news[:25], 1):
            parts.append("%d. %s" % (i, t))
    if manual:
        parts.append("【投顾补充（重要，优先采用）】\n" + manual)
    return "\n".join(parts)


def disp_width(s):
    return sum(2 if ord(ch) > 255 else 1 for ch in str(s))


def pad_name(s, w):
    s = str(s)
    while disp_width(s) < w:
        s += "　"
    return s


def render_markets_line(q, w):
    return "%s %.2f  %s%.2f%%" % (pad_name(q["name"], w), q["price"], "+" if q["pct"] >= 0 else "", q["pct"])


def render_brief(markets, data):
    now = datetime.now(CN_TZ)
    weeks = "一二三四五六日"
    out = ["📊 投顾晨报｜%d月%d日 周%s" % (now.month, now.day, weeks[now.weekday()]), "━━━━━━━━━━━━━━"]
    if markets and (markets["us"] or markets["hk"]):
        out.append("🌍 隔夜外盘")
        group = markets["us"] + markets["hk"]
        w = max(disp_width(q["name"]) for q in group) + 1
        out += [render_markets_line(q, w) for q in group]
        out.append("")
    if markets and markets["cn"]:
        out.append("📈 昨日A股")
        w = max(disp_width(q["name"]) for q in markets["cn"]) + 1
        out += [render_markets_line(q, w) for q in markets["cn"]]
        if markets.get("turnoverYi") is not None:
            out.append("两市成交额约 %.2f 万亿元" % (markets["turnoverYi"] / 10000.0))
        out.append("")
    if data:
        if data.get("news"):
            out.append("📰 要闻速递")
            for i, n in enumerate(data["news"], 1):
                out.append("%d. %s%s" % (i, ("【%s】" % n["tag"]) if n.get("tag") else "", n.get("text", "")))
            out.append("")
        if data.get("focus"):
            out.append("🎯 今日关注")
            for f in data["focus"]:
                out.append("🔸 %s%s" % (f.get("theme", ""), ("｜" + f["reason"]) if f.get("reason") else ""))
                if f.get("targets"):
                    out.append("　　关注：" + f["targets"])
            out.append("")
    out += ["━━━━━━━━━━━━━━", "个人观点，仅供参考，不构成投资建议"]
    return "\n".join(out)


def ai_json(material, model, key):
    body = json.dumps({
        "model": model,
        "messages": [{"role": "system", "content": SYSTEM_MORNING}, {"role": "user", "content": material}],
        "temperature": 0.6, "stream": False,
    }).encode("utf-8")
    req = urllib.request.Request(os.environ.get("BIGMODEL_ENDPOINT", "https://open.bigmodel.cn/api/paas/v4/chat/completions"),
                                 data=body, method="POST",
                                 headers={"Content-Type": "application/json", "Authorization": "Bearer " + key})
    resp = json.loads(urllib.request.urlopen(req, timeout=120).read().decode("utf-8"))
    text = resp["choices"][0]["message"]["content"].strip()
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        raise ValueError("AI 未返回 JSON")
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return json.loads(re.sub(r",\s*([}\]])", r"\1", m.group(0)))


def update_gist(gist_id, token, payload):
    body = json.dumps({"files": {"morning-latest.json": {"content": json.dumps(payload, ensure_ascii=False, indent=1)}}}).encode("utf-8")
    req = urllib.request.Request("%s/gists/%s" % (API_GITHUB, gist_id), data=body, method="PATCH",
                                 headers={"Authorization": "Bearer " + token, "Accept": "application/vnd.github+json",
                                          "Content-Type": "application/json", "User-Agent": "tougu-deploy"})
    urllib.request.urlopen(req, timeout=30)
    now = datetime.now(CN_TZ)
    return "%d月%d日 周%s" % (now.month, now.day, "一二三四五六日"[now.weekday()])


def main():
    key = os.environ.get("BIGMODEL_KEY", "")
    token = os.environ.get("GH_TOKEN", "")
    gist_id = os.environ.get("GIST_ID", "")
    model = os.environ.get("MODEL", "glm-4-flash")
    dry = os.environ.get("DRY_RUN", "") == "1"

    print("[1/4] 抓取行情...")
    markets = fetch_markets()
    print("      A股%d只 美股%d只 港股%d只" % (len(markets["cn"]), len(markets["us"]), len(markets["hk"])))
    print("[2/4] 抓取快讯...")
    news = fetch_news()
    print("      %d 条" % len(news))
    material = build_material(markets, news)

    data = None
    if key:
        print("[3/4] 大模型撰写内容（%s）..." % model)
        data = ai_json(material, model, key)
        print("      要闻%d条 关注%d个方向" % (len(data.get("news", [])), len(data.get("focus", []))))
    else:
        print("[3/4] 未配置 BIGMODEL_KEY，跳过 AI（仅测试排版）")
        data = {"news": [{"tag": "测试", "text": "DRY_RUN 模式：仅验证模板与通道"}], "focus": []}

    text = render_brief(markets, data)
    print("[4/4] 渲染完成，%d 字" % len(text))
    if dry:
        print("------ DRY_RUN 输出预览 ------")
        print(text[:600])
        return

    if not (token and gist_id):
        print("[x] 缺少 GH_TOKEN / GIST_ID，无法写入云端")
        sys.exit(1)
    title = update_gist(gist_id, token, {
        "date": datetime.now(CN_TZ).strftime("%Y-%m-%d"),
        "text": text,
        "model": model,
        "generatedAt": datetime.now(CN_TZ).strftime("%Y-%m-%dT%H:%M:%S+08:00"),
        "structured": {"markets": markets, "news": data.get("news", []), "focus": data.get("focus", [])},
    })
    print("完成 ✓ 晨报已写入 Gist（%s）" % title)


if __name__ == "__main__":
    main()
