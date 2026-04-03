# 优化的批量更新脚本
# 分批更新，避免一次性占用过多资源

from app.database import SessionLocal
from app.services.data.data_storage import DataStorage
from app.models.database import Stock, StockQuote
from sqlalchemy import func
import time

def batch_update_30min_data(batch_size=5, delay=1.0):
    """
    分批更新30分钟线数据，避免资源占用过高

    Args:
        batch_size: 每批更新的股票数量（默认5只）
        delay: 批次之间的延迟秒数（默认1秒）
    """
    db = SessionLocal()
    storage = DataStorage(db)

    try:
        # 获取所有有30分钟线数据的股票
        subquery = db.query(
            StockQuote.stock_id
        ).filter(
            StockQuote.timeframe == '30'
        ).distinct().subquery()

        stocks = db.query(Stock).join(
            subquery,
            Stock.id == subquery.c.stock_id
        ).all()

        codes = [s.code for s in stocks]
        total = len(codes)

        print(f"准备分批更新 {total} 只股票的30分钟线数据")
        print(f"批次大小: {batch_size} 只/批")
        print(f"批次延迟: {delay} 秒")
        print("=" * 80)

        updated_count = 0
        failed_count = 0

        # 分批更新
        for i in range(0, total, batch_size):
            batch = codes[i:i+batch_size]
            batch_num = i // batch_size + 1
            total_batches = (total + batch_size - 1) // batch_size

            print(f"\n批次 {batch_num}/{total_batches}: ({i+1}-{i+len(batch)}/{total})")
            print("-" * 80)

            for code in batch:
                try:
                    print(f"  [{i+len(batch)+1}/{total}] {code}...", end=" ")
                    success = storage.update_stock_quotes(code, '30')
                    if success:
                        updated_count += 1
                        print("✅")
                    else:
                        failed_count += 1
                        print("❌")
                except Exception as e:
                    failed_count += 1
                    print(f"⚠️ {str(e)[:30]}")

            # 批次之间延迟
            if i + batch_size < total:
                print(f"\n⏳ 等待 {delay} 秒...")
                time.sleep(delay)

        print("\n" + "=" * 80)
        print(f"分批更新完成:")
        print(f"  ✅ 成功: {updated_count} 只")
        print(f"  ❌ 失败: {failed_count} 只")
        print(f"  📊 总计: {total} 只")

    finally:
        db.close()

if __name__ == "__main__":
    import sys

    # 支持命令行参数
    batch_size = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    delay = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0

    print("30分钟线数据批量更新工具")
    print("=" * 80)
    print(f"配置: 批次大小={batch_size}, 延迟={delay}秒")
    print("提示: 可以通过命令行参数调整")
    print("用法: python batch_update_30min.py [batch_size] [delay]")
    print("=" * 80)

    batch_update_30min_data(batch_size, delay)
