#!/usr/bin/env python3
"""
详细诊断多空线数据问题
"""

import sys
from pathlib import Path

# 添加backend目录到Python路径
backend_root = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_root))

from app.database import SessionLocal
from app.models.database import Stock, StockQuote
import pandas as pd


def diagnose_duokong():
    """详细诊断多空线数据"""

    db = SessionLocal()

    try:
        # 获取第一只股票
        stock = db.query(Stock).first()

        if not stock:
            print("❌ 数据库中没有股票数据")
            return

        print(f"检查股票: {stock.code} - {stock.name}\n")

        # 检查各个周期的数据
        timeframes = ['30', '60', 'daily', 'weekly', 'monthly']
        timeframe_names = {
            '30': '30分钟',
            '60': '60分钟',
            'daily': '日线',
            'weekly': '周线',
            'monthly': '月线'
        }

        for timeframe in timeframes:
            print(f"\n{'='*60}")
            print(f"{timeframe_names[timeframe]}分析")
            print(f"{'='*60}")

            # 获取最近5条数据
            quotes = db.query(StockQuote).filter(
                StockQuote.stock_id == stock.id,
                StockQuote.timeframe == timeframe
            ).order_by(StockQuote.date.desc()).limit(5).all()

            if not quotes:
                print("⚠️  无数据")
                continue

            # 反转顺序，从旧到新
            quotes = list(reversed(quotes))

            print(f"{'日期':<20} {'收盘':<10} {'MA10':<10} {'多空线':<10} {'状态'}")
            print("-" * 60)

            for q in quotes:
                date_str = q.date.strftime('%Y-%m-%d %H:%M') if q.date else 'N/A'
                close = f"{q.close:.2f}" if q.close else 'N/A'
                ma10 = f"{q.ma10:.2f}" if q.ma10 else 'N/A'
                duokong = f"{q.duokong_line:.2f}" if q.duokong_line else 'NULL'
                status = "✅" if q.duokong_line else "❌"

                print(f"{date_str:<20} {close:<10} {ma10:<10} {duokong:<10} {status}")

            # 统计
            total_count = db.query(StockQuote).filter(
                StockQuote.stock_id == stock.id,
                StockQuote.timeframe == timeframe
            ).count()

            null_count = db.query(StockQuote).filter(
                StockQuote.stock_id == stock.id,
                StockQuote.timeframe == timeframe,
                StockQuote.duokong_line.is_(None)
            ).count()

            print(f"\n总计: {total_count} 条，缺少多空线: {null_count} 条")

            # 手动计算多空线验证
            if quotes and quotes[-1].ma10:
                print(f"\n验证多空线计算:")

                # 获取最近11条数据用于计算（需要10条MA10来求和）
                calc_quotes = db.query(StockQuote).filter(
                    StockQuote.stock_id == stock.id,
                    StockQuote.timeframe == timeframe
                ).order_by(StockQuote.date.desc()).limit(11).all()

                if len(calc_quotes) >= 10:
                    calc_quotes = list(reversed(calc_quotes))

                    # 提取MA10值
                    ma10_values = [q.ma10 for q in calc_quotes if q.ma10 is not None]

                    if len(ma10_values) >= 10:
                        # 使用最近10个MA10值
                        recent_10_ma10 = ma10_values[-10:]

                        # 计算多空线
                        xyz = sum(recent_10_ma10) / 10.110
                        duokong_calculated = xyz * 1.011

                        # 获取数据库中的值
                        db_duokong = quotes[-1].duokong_line

                        print(f"  最近10个MA10值: {[f'{x:.2f}' for x in recent_10_ma10]}")
                        print(f"  MA10求和: {sum(recent_10_ma10):.4f}")
                        print(f"  除以10.110: {xyz:.4f}")
                        print(f"  乘以1.011: {duokong_calculated:.4f}")
                        print(f"  数据库值: {f'{db_duokong:.4f}' if db_duokong else 'NULL'}")
                        print(f"  差异: {abs(duokong_calculated - (db_duokong or 0)):.4f}")

                        if db_duokong and abs(duokong_calculated - db_duokong) < 0.01:
                            print(f"  ✅ 计算正确")
                        else:
                            print(f"  ❌ 计算有差异")

    except Exception as e:
        print(f"❌ 诊断失败: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    diagnose_duokong()
