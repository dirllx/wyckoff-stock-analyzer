"""
清理浏览股中的重复项

对于同时存在于自选股(favorite)和浏览股(browse)的股票：
- 保留自选股记录
- 删除浏览股记录

运行方式：
    python cleanup_duplicate_browse.py
"""

import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import engine, SessionLocal
from app.models.watchlist import UserStockWatch
from loguru import logger


def cleanup_duplicate_browse():
    """清理浏览股中的重复项"""
    db = SessionLocal()

    try:
        logger.info("开始清理浏览股重复项...")

        # 获取所有自选股
        favorite_stocks = db.query(UserStockWatch.stock_code).filter(
            UserStockWatch.watch_type == 'favorite'
        ).all()

        favorite_codes = {s[0] for s in favorite_stocks}
        logger.info(f"找到 {len(favorite_codes)} 只自选股: {favorite_codes}")

        # 查找同时存在于浏览股的记录
        duplicate_browse = db.query(UserStockWatch).filter(
            UserStockWatch.watch_type == 'browse',
            UserStockWatch.stock_code.in_(favorite_codes)
        ).all()

        logger.info(f"找到 {len(duplicate_browse)} 条重复的浏览股记录需要删除")

        # 删除重复的浏览股记录
        for item in duplicate_browse:
            logger.info(f"删除重复浏览股: {item.stock_code} - {item.stock_name}")
            db.delete(item)

        db.commit()

        logger.success(f"清理完成！删除了 {len(duplicate_browse)} 条重复记录")

        # 验证清理结果
        remaining_duplicates = db.query(UserStockWatch).filter(
            UserStockWatch.watch_type == 'browse',
            UserStockWatch.stock_code.in_(favorite_codes)
        ).count()

        if remaining_duplicates > 0:
            logger.warning(f"仍有 {remaining_duplicates} 条重复记录未清理")
        else:
            logger.success("验证通过：无重复记录")

        return len(duplicate_browse)

    except Exception as e:
        logger.error(f"清理失败: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == '__main__':
    count = cleanup_duplicate_browse()
    print(f"\n✅ 清理完成，删除了 {count} 条重复记录")
