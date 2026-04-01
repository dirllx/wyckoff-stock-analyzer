"""
修复所有股票的MA和OBV数据

问题：之前的save_quotes方法先计算MA，再删除旧数据，导致MA值不正确。
修复：重新计算所有股票的所有周期的MA和OBV值。
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pandas as pd
from sqlalchemy.orm import Session
from datetime import datetime
from loguru import logger

from app.database import SessionLocal
from app.models.database import Stock, StockQuote
from app.services.data.data_storage import DataStorage


def fix_stock_indicators(db: Session, stock: Stock, timeframe: str) -> bool:
    """
    修复单个股票单个周期的指标

    Args:
        db: 数据库会话
        stock: 股票对象
        timeframe: 时间周期

    Returns:
        是否成功
    """
    try:
        # 获取所有K线数据（按日期升序）
        all_quotes = db.query(StockQuote).filter(
            StockQuote.stock_id == stock.id,
            StockQuote.timeframe == timeframe
        ).order_by(StockQuote.date.asc()).all()

        if not all_quotes:
            return True

        total_count = len(all_quotes)
        logger.info(f"  {stock.code} {timeframe}: 共 {total_count} 条数据")

        # 如果数据超过500条，删除最旧的
        if total_count > 500:
            # 找出需要删除的数据
            delete_count = total_count - 500
            quotes_to_delete = all_quotes[:delete_count]
            delete_ids = [q.id for q in quotes_to_delete]

            # 批量删除
            db.query(StockQuote).filter(
                StockQuote.id.in_(delete_ids)
            ).delete(synchronize_session=False)
            db.commit()

            logger.info(f"  {stock.code} {timeframe}: 删除了 {delete_count} 条旧数据")

            # 重新获取剩余的数据
            all_quotes = db.query(StockQuote).filter(
                StockQuote.stock_id == stock.id,
                StockQuote.timeframe == timeframe
            ).order_by(StockQuote.date.asc()).all()

        # 转换为DataFrame
        data = []
        for q in all_quotes:
            data.append({
                "date": q.date,
                "open": q.open,
                "high": q.high,
                "low": q.low,
                "close": q.close,
                "volume": q.volume,
                "amount": q.amount
            })
        df = pd.DataFrame(data)

        # 使用DataStorage的_calculate_indicators方法计算指标
        storage = DataStorage(db)
        df = storage._calculate_indicators(df)

        # 更新数据库中的MA和OBV值
        for i, q in enumerate(all_quotes):
            q.ma5 = float(df.iloc[i]["ma5"]) if pd.notna(df.iloc[i]["ma5"]) else None
            q.ma10 = float(df.iloc[i]["ma10"]) if pd.notna(df.iloc[i]["ma10"]) else None
            q.ma15 = float(df.iloc[i]["ma15"]) if pd.notna(df.iloc[i]["ma15"]) else None
            q.ma20 = float(df.iloc[i]["ma20"]) if pd.notna(df.iloc[i]["ma20"]) else None
            q.ma30 = float(df.iloc[i]["ma30"]) if pd.notna(df.iloc[i]["ma30"]) else None
            q.ma60 = float(df.iloc[i]["ma60"]) if pd.notna(df.iloc[i]["ma60"]) else None
            q.ma90 = float(df.iloc[i]["ma90"]) if pd.notna(df.iloc[i]["ma90"]) else None
            q.ma120 = float(df.iloc[i]["ma120"]) if pd.notna(df.iloc[i]["ma120"]) else None
            q.ma250 = float(df.iloc[i]["ma250"]) if pd.notna(df.iloc[i]["ma250"]) else None
            q.volume_ma5 = float(df.iloc[i]["volume_ma5"]) if pd.notna(df.iloc[i]["volume_ma5"]) else None
            q.obv = float(df.iloc[i]["obv"]) if pd.notna(df.iloc[i]["obv"]) else None

        db.commit()
        logger.info(f"  ✅ {stock.code} {timeframe}: 修复完成 ({len(all_quotes)} 条)")
        return True

    except Exception as e:
        db.rollback()
        logger.error(f"  ❌ {stock.code} {timeframe}: 修复失败 - {e}")
        return False


def fix_all_stocks():
    """
    修复所有股票的所有周期的指标
    """
    db = SessionLocal()

    try:
        # 获取所有股票
        stocks = db.query(Stock).all()
        logger.info(f"共找到 {len(stocks)} 只股票")

        timeframes = ["daily", "weekly", "monthly"]

        success_count = 0
        fail_count = 0
        total_tasks = len(stocks) * len(timeframes)

        for i, stock in enumerate(stocks, 1):
            logger.info(f"\n[{i}/{len(stocks)}] 处理股票: {stock.code} - {stock.name}")

            for timeframe in timeframes:
                if fix_stock_indicators(db, stock, timeframe):
                    success_count += 1
                else:
                    fail_count += 1

        logger.info(f"\n{'='*80}")
        logger.info(f"修复完成！")
        logger.info(f"成功: {success_count}/{total_tasks}")
        logger.info(f"失败: {fail_count}/{total_tasks}")
        logger.info(f"{'='*80}")

        return fail_count == 0

    except Exception as e:
        logger.error(f"修复过程出错: {e}")
        return False
    finally:
        db.close()


if __name__ == "__main__":
    logger.info("开始修复所有股票的MA和OBV数据...")
    logger.info(f"开始时间: {datetime.now()}")

    success = fix_all_stocks()

    logger.info(f"结束时间: {datetime.now()}")

    if success:
        logger.info("✅ 所有数据修复成功！")
        sys.exit(0)
    else:
        logger.error("❌ 部分数据修复失败，请查看日志")
        sys.exit(1)
