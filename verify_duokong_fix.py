#!/usr/bin/env python3
"""
快速验证多空线修复效果

检查各个周期的数据是否包含多空线
"""

import sys
from pathlib import Path

# 添加backend目录到Python路径
backend_root = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_root))

from app.database import SessionLocal
from app.models.database import Stock, StockQuote
from app.services.data.data_storage import DataStorage


def verify_duokong_data():
    """验证多空线数据"""

    db = SessionLocal()

    try:
        # 获取第一只股票作为示例
        stock = db.query(Stock).first()

        if not stock:
            print("❌ 数据库中没有股票数据")
            return

        print(f"✅ 找到股票: {stock.code} - {stock.name}\n")

        # 检查所有周期
        timeframes = ['30', '60', 'daily', 'weekly', 'monthly']
        timeframe_names = {
            '30': '30分钟',
            '60': '60分钟',
            'daily': '日线',
            'weekly': '周线',
            'monthly': '月线'
        }

        print("检查各周期的多空线数据：")
        print("=" * 60)

        for timeframe in timeframes:
            # 获取该周期的最新数据
            quote = db.query(StockQuote).filter(
                StockQuote.stock_id == stock.id,
                StockQuote.timeframe == timeframe
            ).order_by(StockQuote.date.desc()).first()

            if quote:
                has_duokong = quote.duokong_line is not None
                status = "✅" if has_duokong else "❌"
                duokong_value = f"{quote.duokong_line:.2f}" if has_duokong else "NULL"

                print(f"{status} {timeframe_names[timeframe]:8s} | 最新日期: {quote.date} | 多空线: {duokong_value}")
            else:
                print(f"⚠️  {timeframe_names[timeframe]:8s} | 无数据")

        print("=" * 60)

        # 检查需要重新计算的数据
        print("\n检查需要更新的数据：")
        print("=" * 60)

        needs_update = False
        for timeframe in timeframes:
            # 统计该周期没有多空线的数据数量
            null_count = db.query(StockQuote).filter(
                StockQuote.stock_id == stock.id,
                StockQuote.timeframe == timeframe,
                StockQuote.duokong_line.is_(None)
            ).count()

            total_count = db.query(StockQuote).filter(
                StockQuote.stock_id == stock.id,
                StockQuote.timeframe == timeframe
            ).count()

            if total_count > 0:
                percentage = (null_count / total_count) * 100
                if null_count > 0:
                    print(f"⚠️  {timeframe_names[timeframe]:8s} | {null_count}/{total_count} 条数据缺少多空线 ({percentage:.1f}%)")
                    needs_update = True
                else:
                    print(f"✅ {timeframe_names[timeframe]:8s} | 所有数据都有多空线")

        print("=" * 60)

        if needs_update:
            print("\n💡 建议：运行以下命令重新计算多空线：")
            print("   python recalculate_all_duokong.py")
        else:
            print("\n✅ 所有数据的多空线都正常！")

    except Exception as e:
        print(f"❌ 验证失败: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    verify_duokong_data()
