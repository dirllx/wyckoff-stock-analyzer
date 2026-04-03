#!/usr/bin/env python3
"""
重新计算所有股票所有周期的多空线数据

这个脚本会：
1. 获取数据库中所有股票
2. 对每个股票的所有周期（30分钟、60分钟、日线、周线、月线）重新计算多空线
3. 更新数据库中的duokong_line字段

使用方法：
    python recalculate_all_duokong.py
"""

import sys
import os
from pathlib import Path

# 添加backend目录到Python路径
backend_root = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_root))

from app.database import SessionLocal
from app.models.database import Stock, StockQuote
from app.services.data.data_storage import DataStorageService
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def recalculate_all_duokong():
    """重新计算所有股票的多空线"""

    db = SessionLocal()
    storage_service = DataStorageService(db)

    try:
        # 获取所有股票
        stocks = db.query(Stock).all()
        logger.info(f"找到 {len(stocks)} 只股票")

        # 定义所有需要处理的周期
        timeframes = ['30', '60', 'daily', 'weekly', 'monthly']
        timeframe_names = {
            '30': '30分钟',
            '60': '60分钟',
            'daily': '日线',
            'weekly': '周线',
            'monthly': '月线'
        }

        success_count = 0
        skip_count = 0
        error_count = 0

        for stock in stocks:
            logger.info(f"\n{'='*60}")
            logger.info(f"处理股票: {stock.code} - {stock.name}")

            for timeframe in timeframes:
                try:
                    # 检查该周期是否有数据
                    quotes_count = db.query(StockQuote).filter(
                        StockQuote.stock_id == stock.id,
                        StockQuote.timeframe == timeframe
                    ).count()

                    if quotes_count == 0:
                        logger.info(f"  ⏭️  {timeframe_names[timeframe]}: 无数据，跳过")
                        skip_count += 1
                        continue

                    logger.info(f"  🔄 {timeframe_names[timeframe]}: 开始计算多空线 ({quotes_count}条数据)")

                    # 重新计算该周期的多空线
                    all_quotes = db.query(StockQuote).filter(
                        StockQuote.stock_id == stock.id,
                        StockQuote.timeframe == timeframe
                    ).order_by(StockQuote.date.asc()).all()

                    # 转换为DataFrame计算指标
                    data = []
                    for q in all_quotes:
                        data.append({
                            "date": q.date,
                            "open": q.open,
                            "high": q.high,
                            "low": q.low,
                            "close": q.close,
                            "volume": q.volume,
                            "amount": q.amount if hasattr(q, 'amount') else 0
                        })

                    import pandas as pd
                    df = pd.DataFrame(data)

                    # 计算技术指标（包括多空线）
                    df = storage_service._calculate_indicators(df)

                    # 更新多空线值
                    updated_count = 0
                    for i, q in enumerate(all_quotes):
                        old_duokong = q.duokong_line
                        new_duokong = df.iloc[i]["duokong_line"]

                        # 只更新值不同的记录
                        if old_duokong != new_duokong:
                            q.duokong_line = new_duokong
                            updated_count += 1

                    db.commit()
                    logger.info(f"  ✅ {timeframe_names[timeframe]}: 完成！更新了 {updated_count} 条记录")
                    success_count += 1

                except Exception as e:
                    logger.error(f"  ❌ {timeframe_names[timeframe]}: 失败 - {str(e)}")
                    error_count += 1
                    db.rollback()

        # 打印汇总
        logger.info(f"\n{'='*60}")
        logger.info("计算完成！")
        logger.info(f"成功: {success_count} 个周期")
        logger.info(f"跳过: {skip_count} 个周期（无数据）")
        logger.info(f"失败: {error_count} 个周期")
        logger.info(f"{'='*60}\n")

    except Exception as e:
        logger.error(f"脚本执行失败: {str(e)}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    logger.info("开始重新计算所有股票的多空线...")
    recalculate_all_duokong()
    logger.info("脚本执行完成")
