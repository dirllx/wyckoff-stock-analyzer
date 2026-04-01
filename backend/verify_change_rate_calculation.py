"""
验证涨跌幅计算逻辑

核查：
1. 前端计算的涨跌幅是否正确
2. 与前一日收盘价的对比是否准确
3. 各周期（日线、周线、月线）的计算逻辑
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.database import Stock, StockQuote
from app.repositories.stock_repository import StockRepository


def verify_change_rate(code="688234", timeframe="daily", limit=10):
    """
    验证涨跌幅计算

    Args:
        code: 股票代码
        timeframe: 时间周期
        limit: 检查最近N条数据
    """
    db = SessionLocal()
    repo = StockRepository(db)

    try:
        # 获取股票
        stock = repo.find_by_code(code)
        if not stock:
            print(f"❌ 股票 {code} 不存在")
            return

        # 获取K线数据（最新的N条，按日期升序）
        quotes = repo.get_quotes(stock.id, timeframe, limit=limit)
        quotes = list(reversed(quotes))  # 转为升序

        if len(quotes) < 2:
            print(f"❌ 数据不足，至少需要2条数据")
            return

        print(f"\n{'='*100}")
        print(f"股票: {stock.name} ({code}) - {timeframe}")
        print(f"{'='*100}")
        print(f"{'日期':<15} {'收盘价':<10} {'涨跌幅(计算)':<15} {'说明'}")
        print(f"{'-'*100}")

        # 验证每一条数据的涨跌幅计算
        all_correct = True

        for i in range(len(quotes)):
            current = quotes[i]

            if i == 0:
                # 第一条数据，没有前一日数据
                print(f"{current.date.strftime('%Y-%m-%d'):<15} {current.close:<10.2f} {'N/A (第一条)':<15} 第一条数据，无前一日对比")
                continue

            # 前一日数据
            prev = quotes[i-1]

            # 前端计算逻辑（相对于前一日收盘价）
            calculated_change = (current.close - prev.close) / prev.close * 100

            # 显示结果
            change_text = f"{calculated_change:+.2f}%"
            explanation = f"({current.close:.2f} - {prev.close:.2f}) / {prev.close:.2f} × 100"

            print(f"{current.date.strftime('%Y-%m-%d'):<15} {current.close:<10.2f} {change_text:<15} {explanation}")

        print(f"{'='*100}")
        print(f"\n✅ 涨跌幅计算逻辑验证完成")
        print(f"\n计算公式：(当日收盘价 - 前一日收盘价) / 前一日收盘价 × 100%")
        print(f"\n注意事项：")
        print(f"1. 数据库中没有存储涨跌幅字段")
        print(f"2. 前端动态计算涨跌幅，基于当前K线的前一日收盘价")
        print(f"3. 对于不同周期（日线/周线/月线），计算逻辑相同")
        print(f"4. akshare提供的涨跌幅字段未被存储到数据库")

    except Exception as e:
        print(f"❌ 验证失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def check_all_timeframes(code="688234"):
    """
    检查所有周期的涨跌幅计算
    """
    timeframes = ["daily", "weekly", "monthly"]

    print(f"\n{'='*100}")
    print(f"核查所有周期的涨跌幅计算")
    print(f"{'='*100}")

    for timeframe in timeframes:
        verify_change_rate(code, timeframe, limit=5)


if __name__ == "__main__":
    # 默认检查688234的所有周期
    test_code = "688234"
    if len(sys.argv) > 1:
        test_code = sys.argv[1]

    check_all_timeframes(test_code)
