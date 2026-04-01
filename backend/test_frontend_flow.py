"""
完整测试前端涨跌幅计算流程

模拟前端获取数据和计算涨跌幅的完整过程
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import requests


def test_frontend_calculation_flow(code="688234"):
    """测试前端的完整计算流程"""

    print(f"\n{'='*100}")
    print(f"测试前端涨跌幅计算流程: {code}")
    print(f"{'='*100}")

    timeframes = ['daily', 'weekly']

    for timeframe in timeframes:
        print(f"\n【{timeframe}周期】")
        print(f"{'-'*100}")

        # 步骤1：调用analyze API获取current_quote
        analyze_url = "http://localhost:8000/api/v1/stocks/analyze"
        analyze_payload = {"code": code, "timeframe": timeframe}

        analyze_response = requests.post(analyze_url, json=analyze_payload)
        analyze_data = analyze_response.json()

        current_quote = analyze_data.get('current_quote')
        print(f"\n步骤1：analyze API返回的current_quote")
        if current_quote:
            print(f"  日期: {current_quote.get('date')}")
            print(f"  收盘: {current_quote.get('close')}")
        else:
            print(f"  ❌ current_quote为空")
            continue

        # 步骤2：调用quotes API获取前一日数据
        quotes_url = f"http://localhost:8000/api/v1/stocks/{code}/quotes?timeframe={timeframe}&limit=5"
        quotes_response = requests.get(quotes_url)
        quotes_data = quotes_response.json()

        quotes = quotes_data.get('quotes', [])
        print(f"\n步骤2：quotes API返回的数据（共{len(quotes)}条）")
        print(f"  from_cache: {quotes_data.get('from_cache')}")

        # 显示所有quotes数据
        print(f"\n  所有数据:")
        for i, quote in enumerate(quotes):
            date_str = quote.get('date', '').split(' ')[0]
            close = quote.get('close', 0)
            print(f"    [{i}] {date_str} - 收盘: {close:.2f}")

        # 步骤3：前端获取prevQuote的逻辑（倒数第二条）
        if len(quotes) >= 2:
            prev_quote = quotes[-2]  # 倒数第二条
            print(f"\n步骤3：前端获取的prevQuote（倒数第二条）")
            print(f"  日期: {prev_quote.get('date')}")
            print(f"  收盘: {prev_quote.get('close')}")

            # 步骤4：计算涨跌幅
            current_close = current_quote.get('close')
            prev_close = prev_quote.get('close')

            if prev_close and prev_close > 0:
                change = (current_close - prev_close) / prev_close * 100
                change_text = f"{change:+.2f}%"

                print(f"\n步骤4：前端计算的涨跌幅")
                print(f"  当前收盘: {current_close:.2f}")
                print(f"  前收盘: {prev_close:.2f}")
                print(f"  涨跌幅: {change_text}")

                # 验证是否正确
                print(f"\n验证:")
                if timeframe == 'daily':
                    # 日线：应该和前一日对比
                    expected_date = '2026-03-30'
                    expected_close = 79.42
                    if abs(current_close - 81.90) < 0.1 and abs(prev_close - expected_close) < 0.1:
                        print(f"  ✅ 数据正确")
                    else:
                        print(f"  ❌ 数据不正确")
                        print(f"     期望: current={81.90}, prev={expected_close}")
                        print(f"     实际: current={current_close:.2f}, prev={prev_close:.2f}")
                elif timeframe == 'weekly':
                    # 周线：应该和前一周对比
                    expected_date = '2026-03-20'
                    expected_close = 78.13
                    if abs(current_close - 78.24) < 0.1 and abs(prev_close - expected_close) < 0.1:
                        print(f"  ✅ 数据正确")
                    else:
                        print(f"  ❌ 数据不正确")
                        print(f"     期望: current=78.24, prev={expected_close}")
                        print(f"     实际: current={current_close:.2f}, prev={prev_close:.2f}")
            else:
                print(f"  ❌ 前收盘价无效")
        else:
            print(f"\n步骤3：数据不足，无法获取prevQuote")


if __name__ == "__main__":
    test_frontend_calculation_flow("688234")
