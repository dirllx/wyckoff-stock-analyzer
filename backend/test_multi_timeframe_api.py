"""
测试多周期分析API返回的数据

检查：
1. analyze API返回的current_quote是否是当前周期的数据
2. quotes API返回的数据顺序是否正确
3. 前端获取prevQuote的逻辑是否正确
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import requests
import json


def test_analyze_api(code="688234", timeframe="weekly"):
    """测试analyze API"""
    url = "http://localhost:8000/api/v1/stocks/analyze"
    payload = {"code": code, "timeframe": timeframe}

    print(f"\n{'='*100}")
    print(f"测试 Analyze API: {code} - {timeframe}")
    print(f"{'='*100}")

    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        data = response.json()

        # 检查current_quote
        current_quote = data.get("current_quote")
        if current_quote:
            print(f"\n✅ current_quote 存在")
            print(f"  日期: {current_quote.get('date')}")
            print(f"  收盘: {current_quote.get('close')}")
            print(f"  MA5: {current_quote.get('ma5')}")
            print(f"  MA10: {current_quote.get('ma10')}")
            print(f"  MA20: {current_quote.get('ma20')}")
        else:
            print(f"\n❌ current_quote 不存在")

        # 检查analysis_summary
        summary = data.get("analysis_summary", {})
        print(f"\n分析摘要:")
        print(f"  方向: {summary.get('direction')}")
        print(f"  评分: {summary.get('score')}")
        print(f"  置信度: {summary.get('confidence')}")

        return current_quote

    except Exception as e:
        print(f"❌ 请求失败: {e}")
        return None


def test_quotes_api(code="688234", timeframe="weekly", limit=5):
    """测试quotes API"""
    url = f"http://localhost:8000/api/v1/stocks/{code}/quotes"
    params = {"timeframe": timeframe, "limit": limit}

    print(f"\n{'='*100}")
    print(f"测试 Quotes API: {code} - {timeframe} (limit={limit})")
    print(f"{'='*100}")

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        quotes = data.get("quotes", [])
        print(f"\n✅ 获取到 {len(quotes)} 条数据")

        print(f"\n数据顺序检查:")
        for i, quote in enumerate(quotes):
            print(f"  [{i}] {quote.get('date')} - 收盘: {quote.get('close')}")

        # 检查数据顺序
        if len(quotes) >= 2:
            first_date = quotes[0].get('date')
            last_date = quotes[-1].get('date')
            print(f"\n顺序分析:")
            print(f"  第一条: {first_date}")
            print(f"  最后一条: {last_date}")

            if first_date < last_date:
                print(f"  ✅ 数据是升序（旧→新）")
                print(f"  倒数第二条是前一周期的数据")
            else:
                print(f"  ❌ 数据是降序（新→旧）")
                print(f"  第二条是前一周期的数据")

        return quotes

    except Exception as e:
        print(f"❌ 请求失败: {e}")
        return None


def compare_quotes(code="688234"):
    """对比不同周期的数据"""
    print(f"\n{'='*100}")
    print(f"对比不同周期的current_quote")
    print(f"{'='*100}")

    timeframes = ["daily", "weekly", "monthly"]

    for tf in timeframes:
        quote = test_analyze_api(code, tf)
        if quote:
            print(f"\n[{tf}] 最新收盘: {quote.get('close')} ({quote.get('date')})")


if __name__ == "__main__":
    # 测试周线数据
    print("步骤1：测试周线analyze API")
    weekly_current = test_analyze_api("688234", "weekly")

    print("\n步骤2：测试周线quotes API")
    weekly_quotes = test_quotes_api("688234", "weekly", 5)

    print("\n步骤3：对比所有周期")
    compare_quotes("688234")

    # 分析问题
    print(f"\n{'='*100}")
    print("问题分析")
    print(f"{'='*100}")

    if weekly_current and weekly_quotes:
        current_close = weekly_current.get('close')
        latest_quote_close = weekly_quotes[-1].get('close') if weekly_quotes else None

        print(f"\nanalyze API返回的current_quote收盘: {current_close}")
        print(f"quotes API返回的最新一条收盘: {latest_quote_close}")

        if current_close == latest_quote_close:
            print(f"✅ 两者一致，数据正确")
        else:
            print(f"❌ 两者不一致，数据有误！")
            print(f"   这就是涨跌幅计算错误的根源！")
