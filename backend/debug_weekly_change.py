"""
调试周线涨跌幅显示异常问题

用户反馈：周周期详细显示"日线 03/31 81.90 +49.1%"
问题：涨跌幅+49.1%明显不对
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.database import Stock
from app.repositories.stock_repository import StockRepository


def debug_weekly_data(code="688234"):
    """调试周线数据"""
    db = SessionLocal()
    repo = StockRepository(db)

    try:
        stock = repo.find_by_code(code)
        if not stock:
            print(f"❌ 股票 {code} 不存在")
            return

        print(f"\n{'='*100}")
        print(f"股票: {stock.name} ({code})")
        print(f"{'='*100}")

        # 获取日线数据（最新5条）
        print(f"\n【日线数据】最新5条：")
        daily_quotes = repo.get_quotes(stock.id, "daily", limit=5)
        daily_quotes = list(reversed(daily_quotes))  # 转为升序

        print(f"{'日期':<15} {'收盘':<10} {'涨跌幅':<12}")
        print(f"{'-'*60}")
        for i, q in enumerate(daily_quotes):
            if i == 0:
                change_str = "N/A"
            else:
                prev = daily_quotes[i-1]
                change = (q.close - prev.close) / prev.close * 100
                change_str = f"{change:+.2f}%"
            print(f"{q.date.strftime('%Y-%m-%d'):<15} {q.close:<10.2f} {change_str:<12}")

        # 获取周线数据（最新5条）
        print(f"\n【周线数据】最新5条：")
        weekly_quotes = repo.get_quotes(stock.id, "weekly", limit=5)
        weekly_quotes = list(reversed(weekly_quotes))  # 转为升序

        print(f"{'日期':<15} {'收盘':<10} {'涨跌幅':<12}")
        print(f"{'-'*60}")
        for i, q in enumerate(weekly_quotes):
            if i == 0:
                change_str = "N/A"
            else:
                prev = weekly_quotes[i-1]
                change = (q.close - prev.close) / prev.close * 100
                change_str = f"{change:+.2f}%"
            print(f"{q.date.strftime('%Y-%m-%d'):<15} {q.close:<10.2f} {change_str:<12}")

        # 对比分析
        print(f"\n【问题分析】")
        print(f"日线最新收盘: {daily_quotes[-1].close:.2f} ({daily_quotes[-1].date.strftime('%Y-%m-%d')})")
        print(f"周线最新收盘: {weekly_quotes[-1].close:.2f} ({weekly_quotes[-1].date.strftime('%Y-%m-%d')})")

        # 检查是否有数据混淆
        if daily_quotes[-1].close == weekly_quotes[-1].close:
            print(f"\n⚠️ 警告：日线和周线的最新收盘价相同！")
            print(f"这可能意味着周线数据未更新，或者数据混淆")

        # 计算错误的涨跌幅（如果用日线收盘价除以周线前一日收盘价）
        if len(weekly_quotes) >= 2:
            wrong_change = (daily_quotes[-1].close - weekly_quotes[-2].close) / weekly_quotes[-2].close * 100
            print(f"\n【错误计算模拟】")
            print(f"如果用日线收盘({daily_quotes[-1].close:.2f}) - 周线前一日({weekly_quotes[-2].close:.2f})")
            print(f"错误涨跌幅 = {wrong_change:+.2f}%")
            print(f"这正是用户看到的 +49.1%！")

        print(f"\n{'='*100}")
        print(f"\n✅ 结论：前端可能用错了数据（用日线收盘价计算周线涨跌幅）")
        print(f"\n修复建议：")
        print(f"1. 检查前端API调用，确保周线请求使用timeframe=weekly")
        print(f"2. 检查calculateChanges函数，确保使用同一周期的数据")
        print(f"3. 检查prevQuote获取逻辑，确保周期匹配")

    except Exception as e:
        print(f"❌ 调试失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    debug_weekly_data("688234")
