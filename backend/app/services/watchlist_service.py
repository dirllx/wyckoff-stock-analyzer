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
from app.repositories.stock_repository import StockRepository


class WatchlistService:
    """关注列表服务"""

    def __init__(self, db: Session):
        self.db = db
        self.storage = DataStorage(db)
        self.repo = StockRepository(db)  # 使用Repository

    def add_to_watchlist(self, code: str, priority: int = 0, watch_type: str = "browse") -> UserStockWatch:
        """
        添加股票到关注列表

        优化逻辑：
        - 如果股票已在任何列表中（自选股或浏览股），保持原状态，不修改
        - 只有当股票不在任何列表中时，才添加到指定类型
        - 这样可以避免用户查询股票时改变已有的关注状态

        Args:
            code: 股票代码
            priority: 优先级（用于排序）
            watch_type: 关注类型 (favorite=自选股, browse=浏览股)

        Returns:
            UserStockWatch对象
        """
        try:
            # 获取或创建股票
            stock = self.storage.get_or_create_stock(code)

            # 检查股票是否已在任何列表中（自选股或浏览股）
            existing_any = self.db.query(UserStockWatch).filter(
                UserStockWatch.stock_id == stock.id
            ).first()

            if existing_any:
                # 股票已在列表中，保持原状态，只更新时间戳
                logger.info(f"股票{code}已在{existing_any.watch_type}列表中，保持原状态")
                existing_any.updated_at = datetime.now()
                self.db.commit()
                self.db.refresh(existing_any)
                return existing_any

            # 股票不在任何列表中，添加到指定类型
            watchlist_item = UserStockWatch(
                stock_id=stock.id,
                stock_code=stock.code,
                stock_name=stock.name,
                watch_type=watch_type,
                priority=priority
            )
            self.db.add(watchlist_item)
            self.db.commit()
            self.db.refresh(watchlist_item)

            logger.info(f"股票{code}已添加到{watch_type}列表")
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
            stock = self.repo.find_by_code(code)
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

    def get_watchlist(self, limit: int = 100, watch_type: Optional[str] = None) -> List[UserStockWatch]:
        """
        获取关注列表

        Args:
            limit: 返回数量限制
            watch_type: 关注类型过滤 (favorite=自选股, browse=浏览股, None=全部)

        Returns:
            关注列表
        """
        try:
            query = self.db.query(UserStockWatch)

            # 按类型过滤
            if watch_type:
                query = query.filter(UserStockWatch.watch_type == watch_type)

            watchlist = query.order_by(
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

    def favorite_stock(self, code: str) -> dict:
        """
        将浏览股收藏为自选股

        优化逻辑：
        - 如果股票已在自选股中，删除浏览股记录，返回"already_exists"
        - 如果股票在浏览股中，转换为自选股，返回"converted"
        - 如果股票不在浏览股中，返回"not_found"

        Args:
            code: 股票代码

        Returns:
            dict: {"success": bool, "action": str, "message": str}
        """
        try:
            # 查找浏览股记录
            browse_item = self.db.query(UserStockWatch).filter(
                UserStockWatch.stock_code == code,
                UserStockWatch.watch_type == "browse"
            ).first()

            if not browse_item:
                logger.warning(f"股票{code}不在浏览股列表中")
                return {"success": False, "action": "not_found", "message": "股票不在浏览股中"}

            # 检查是否已在自选股中
            existing_favorite = self.db.query(UserStockWatch).filter(
                UserStockWatch.stock_code == code,
                UserStockWatch.watch_type == "favorite"
            ).first()

            if existing_favorite:
                logger.info(f"股票{code}已在自选股列表中，删除浏览股记录")
                # 删除浏览股记录
                self.db.delete(browse_item)
                self.db.commit()
                return {
                    "success": True,
                    "action": "already_exists",
                    "message": f"股票{code}已在自选股中，已清除浏览股中的重复项"
                }

            # 转换为自选股
            browse_item.watch_type = "favorite"
            browse_item.priority = 0  # 自选股默认优先级
            browse_item.updated_at = datetime.now()

            self.db.commit()
            logger.info(f"股票{code}已收藏到自选股")
            return {
                "success": True,
                "action": "converted",
                "message": f"股票{code}已从浏览股转为自选股"
            }

        except Exception as e:
            logger.error(f"收藏股票失败: {e}")
            self.db.rollback()
            return {"success": False, "action": "error", "message": str(e)}

    def unfavorite_stock(self, code: str) -> bool:
        """
        将自选股取消收藏（删除）

        Args:
            code: 股票代码

        Returns:
            是否取消成功
        """
        # 取消收藏就是删除自选股记录
        return self.remove_from_watchlist(code)

