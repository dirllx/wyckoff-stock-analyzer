#!/usr/bin/env python3
"""重新计算所有股票的多空线数据"""
import sys
sys.path.append('/Users/dirllx/Claude Code/wyckoff-stock-analyzer/backend')

from app.database import SessionLocal
from app.services.data.data_storage import DataStorage
from app.repositories.stock_repository import StockRepository
from loguru import logger
import pandas as pd

def recalculate_all():
    """重新计算所有股票的多空线"""
    db = SessionLocal()
    storage = DataStorage(db)
    repo = StockRepository(db)

    try:
        # 获取所有股票
        stocks = repo.get_all()
        logger.info(f"找到 {len(stocks)} 只股票")

        success_count = 0
        for i, stock in enumerate(stocks, 1):
            try:
                logger.info(f"[{i}/{len(stocks)}] 处理 {stock.code}...")

                # 获取日线数据
                quotes = storage.get_quotes(stock.code, 'daily', 500)

                if not quotes:
                    logger.warning(f"  {stock.code} 没有K线数据，跳过")
                    continue

                # 转换为DataFrame并重新计算指标
                data = []
                for q in quotes:
                    data.append({
                        'date': q.date,
                        'open': q.open,
                        'high': q.high,
                        'low': q.low,
                        'close': q.close,
                        'volume': q.volume,
                        'amount': q.amount
                    })

                df = pd.DataFrame(data)
                df = storage._calculate_indicators(df)

                # 更新数据库
                for j, q in enumerate(quotes):
                    q.duokong_line = df.iloc[j]['duokong_line']

                db.commit()
                success_count += 1
                logger.success(f"  {stock.code} 多空线计算完成")

            except Exception as e:
                logger.error(f"  {stock.code} 失败: {e}")
                db.rollback()

        logger.success(f"✅ 完成！成功计算 {success_count}/{len(stocks)} 只股票的多空线")

    except Exception as e:
        logger.error(f"❌ 失败: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    recalculate_all()
