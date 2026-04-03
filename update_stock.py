#!/usr/bin/env python3
"""更新指定股票的数据，触发多空线计算"""
import sys
import os
sys.path.append('/Users/dirllx/Claude Code/wyckoff-stock-analyzer/backend')
os.chdir('/Users/dirllx/Claude Code/wyckoff-stock-analyzer/backend')

from app.database import SessionLocal
from app.services.data.data_storage import DataStorage

def update_stock(code: str):
    """更新股票数据，触发多空线计算"""
    db = SessionLocal()
    storage = DataStorage(db)

    try:
        print(f"📊 正在更新股票 {code}...")

        # 更新股票数据（会触发重新计算所有指标，包括多空线）
        success = storage.update_stock_quotes(code, 'daily')

        if success:
            print(f"✅ {code} 更新成功！多空线已计算")

            # 验证多空线数据
            quotes = storage.get_quotes(code, 'daily', 5)
            latest = quotes[-1] if quotes else None

            if latest and latest.duokong_line:
                print(f"\n📈 最新数据:")
                print(f"  日期: {latest.date}")
                print(f"  收盘价: {latest.close}")
                print(f"  MA10: {latest.ma10}")
                print(f"  多空线: {latest.duokong_line}")
                print(f"  状态: 价格在多空线{'上方' if latest.close > latest.duokong_line else '下方'}")
            else:
                print(f"⚠️  多空线数据尚未计算")
        else:
            print(f"❌ {code} 更新失败")

    except Exception as e:
        print(f"❌ 错误: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # 更新你关注的股票
    stock_code = sys.argv[1] if len(sys.argv) > 1 else "688234"
    update_stock(stock_code)
