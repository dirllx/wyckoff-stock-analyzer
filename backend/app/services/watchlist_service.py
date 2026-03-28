"""
用户关注列表服务
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from loguru import logger

from app.models.database import Stock
from app.models.watchlist import UserStockWatch
from app.services.data.data_storage import DataStorage


class WatchlistService:
    """关注列表服务"""

    def __init__(self, db: Session):
        self.db = db
        self.storage = DataStorage(db)

    def add_to_watchlist(self, code: str, priority: int = 0) -> UserStockWatch:
        """
        添加股票到关注列表

        Args:
            code: 股票代码
            priority: 优先级（用于排序）

        Returns:
            UserStockWatch对象
        """
        try:
            # 获取或创建股票
            stock = self.storage.get_or_create_stock(code)

            # 检查是否已在关注列表
            existing = self.db.query(UserStockWatch).filter(
                UserStockWatch.stock_id == stock.id
            ).first()

            if existing:
                logger.info(f"股票{code}已在关注列表中")
                existing.updated_at = datetime.now()
                self.db.commit()
                self.db.refresh(existing)
                return existing

            # 添加到关注列表
            watchlist_item = UserStockWatch(
                stock_id=stock.id,
                stock_code=stock.code,
                stock_name=stock.name,
                priority=priority
            )
            self.db.add(watchlist_item)
            self.db.commit()
            self.db.refresh(watchlist_item)

            logger.info(f"股票{code}已添加到关注列表")
            return watchlist_item

        except Exception as e:
            logger.error(f"添加股票{code}到关注列表失败: {e}")
            self.db.rollback()
            raise

    def remove_from_watchlist(self, code: str) -> bool:
        """
        从关注列表移除股票

        Args:
            code: 股票代码

        Returns:
            是否删除成功
        """
        try:
            stock = self.db.query(Stock).filter(Stock.code == code).first()
            if not stock:
                logger.warning(f"股票{code}不存在")
                return False

            # 删除关注记录
            deleted = self.db.query(UserStockWatch).filter(
                UserStockWatch.stock_code == code
            ).delete()

            self.db.commit()
            logger.info(f"股票{code}已从关注列表移除")
            return deleted > 0

        except Exception as e:
            logger.error(f"移除股票{code}失败: {e}")
            self.db.rollback()
            return False

    def get_watchlist(self, limit: int = 100) -> List[UserStockWatch]:
        """
        获取关注列表

        Args:
            limit: 返回数量限制

        Returns:
            关注列表
        """
        try:
            watchlist = self.db.query(UserStockWatch).order_by(
                desc(UserStockWatch.priority),
                desc(UserStockWatch.created_at)
            ).limit(limit).all()

            return list(watchlist)

        except Exception as e:
            logger.error(f"获取关注列表失败: {e}")
            return []

    def is_in_watchlist(self, code: str) -> bool:
        """
        检查股票是否在关注列表

        Args:
            code: 股票代码

        Returns:
            是否在关注列表
        """
        try:
            existing = self.db.query(UserStockWatch).filter(
                UserStockWatch.stock_code == code
            ).first()

            return existing is not None

        except Exception as e:
            logger.error(f"检查关注列表失败: {e}")
            return False

    def update_stock_info(self) -> int:
        """
        批量更新关注列表的股票信息（名称）

        Returns:
            更新的数量
        """
        try:
            # 获取所有关注的股票代码
            watchlist = self.get_watchlist()
            if not watchlist:
                return 0

            codes = [item.stock_code for item in watchlist]

            # 批量获取股票信息并更新
            # 这里可以使用easyquotation的批量接口
            updated_count = 0
            for code in codes:
                try:
                    from app.services.realtime_quote import get_realtime_service
                    service = get_realtime_service()
                    quote = service.get_realtime_quote(code)

                    if quote and 'name' in quote:
                        # 更新股票名称
                        self.db.query(UserStockWatch).filter(
                            UserStockWatch.stock_code == code
                        ).update({'stock_name': quote['name']})
                        updated_count += 1

                except Exception as e:
                    logger.warning(f"更新股票{code}信息失败: {e}")

            self.db.commit()
            logger.info(f"批量更新股票信息完成，更新{updated_count}只")
            return updated_count

        except Exception as e:
            logger.error(f"批量更新股票信息失败: {e}")
            self.db.rollback()
            return 0

    def move_item(self, code: str, direction: int) -> bool:
        """
        调整关注列表中股票的顺序

        Args:
            code: 股票代码
            direction: 移动方向 (-1上移, 1下移)

        Returns:
            是否移动成功
        """
        try:
            # 获取当前关注列表
            watchlist = self.get_watchlist()
            if not watchlist:
                return False

            # 找到要移动的项
            current_index = -1
            for i, item in enumerate(watchlist):
                if item.stock_code == code:
                    current_index = i
                    break

            if current_index == -1:
                logger.warning(f"股票{code}不在关注列表中")
                return False

            # 计算新位置
            new_index = current_index + direction

            # 检查边界
            if new_index < 0 or new_index >= len(watchlist):
                return False

            # 通过调整priority来实现排序
            current_item = watchlist[current_index]
            target_item = watchlist[new_index]

            # 交换priority值
            current_priority = current_item.priority
            target_priority = target_item.priority

            current_item.priority = target_priority
            target_item.priority = current_priority

            # 添加一点偏移量确保排序正确
            if direction == -1:  # 上移
                current_item.priority = target_priority + 1
            else:  # 下移
                current_item.priority = target_priority - 1

            self.db.commit()
            logger.info(f"股票{code}已{'上移' if direction == -1 else '下移'}")
            return True

        except Exception as e:
            logger.error(f"调整顺序失败: {e}")
            self.db.rollback()
            return False
