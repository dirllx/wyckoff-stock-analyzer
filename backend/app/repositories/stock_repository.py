"""
股票数据访问层（Repository模式）
封装所有数据库操作，提高可测试性和可维护性
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from loguru import logger

from app.models.database import Stock, StockQuote, WyckoffSignal


class StockRepository:
    """股票数据访问仓库"""

    def __init__(self, db: Session):
        """
        初始化Repository

        Args:
            db: 数据库会话
        """
        self.db = db

    # ========== Stock操作 ==========

    def find_by_code(self, code: str) -> Optional[Stock]:
        """
        根据代码查找股票

        Args:
            code: 股票代码

        Returns:
            股票对象，不存在返回None
        """
        return self.db.query(Stock).filter(Stock.code == code).first()

    def find_by_id(self, stock_id: int) -> Optional[Stock]:
        """
        根据ID查找股票

        Args:
            stock_id: 股票ID

        Returns:
            股票对象，不存在返回None
        """
        return self.db.query(Stock).filter(Stock.id == stock_id).first()

    def find_or_create(self, code: str, name: str = None, market: str = None) -> Stock:
        """
        查找或创建股票

        Args:
            code: 股票代码
            name: 股票名称（创建时使用）
            market: 市场类型（创建时使用）

        Returns:
            股票对象
        """
        stock = self.find_by_code(code)
        if not stock:
            stock = Stock(
                code=code,
                name=name or code,
                market=market or "未知"
            )
            self.db.add(stock)
            self.db.commit()
            self.db.refresh(stock)
            logger.info(f"创建新股票: {code}")
        return stock

    def get_all(self) -> List[Stock]:
        """
        获取所有股票

        Returns:
            股票列表
        """
        return self.db.query(Stock).all()

    def get_by_market(self, market: str) -> List[Stock]:
        """
        根据市场获取股票列表

        Args:
            market: 市场类型（A股/港股/基金）

        Returns:
            股票列表
        """
        return self.db.query(Stock).filter(Stock.market == market).all()

    def search(self, keyword: str) -> List[Stock]:
        """
        搜索股票（代码或名称）

        Args:
            keyword: 搜索关键词

        Returns:
            匹配的股票列表
        """
        return self.db.query(Stock).filter(
            (Stock.code.contains(keyword)) | (Stock.name.contains(keyword))
        ).all()

    # ========== StockQuote操作 ==========

    def get_quotes(
        self,
        stock_id: int,
        timeframe: str,
        limit: int = None
    ) -> List[StockQuote]:
        """
        获取K线数据

        Args:
            stock_id: 股票ID
            timeframe: 时间周期
            limit: 限制数量

        Returns:
            K线数据列表
        """
        query = self.db.query(StockQuote).filter(
            StockQuote.stock_id == stock_id,
            StockQuote.timeframe == timeframe
        ).order_by(StockQuote.date.desc())

        if limit:
            query = query.limit(limit)

        return query.all()

    def get_latest_quote(self, stock_id: int, timeframe: str) -> Optional[StockQuote]:
        """
        获取最新K线

        Args:
            stock_id: 股票ID
            timeframe: 时间周期

        Returns:
            最新K线，不存在返回None
        """
        return self.db.query(StockQuote).filter(
            StockQuote.stock_id == stock_id,
            StockQuote.timeframe == timeframe
        ).order_by(StockQuote.date.desc()).first()

    def count_quotes(self, stock_id: int, timeframe: str) -> int:
        """
        统计K线数量

        Args:
            stock_id: 股票ID
            timeframe: 时间周期

        Returns:
            K线数量
        """
        return self.db.query(StockQuote).filter(
            StockQuote.stock_id == stock_id,
            StockQuote.timeframe == timeframe
        ).count()

    def save_quotes(self, quotes: List[StockQuote]) -> bool:
        """
        保存K线数据

        Args:
            quotes: K线数据列表

        Returns:
            是否成功
        """
        try:
            self.db.add_all(quotes)
            self.db.commit()
            logger.info(f"保存{len(quotes)}条K线数据")
            return True
        except Exception as e:
            logger.error(f"保存K线数据失败: {e}")
            self.db.rollback()
            return False

    # ========== WyckoffSignal操作 ==========

    def get_signals(
        self,
        stock_id: int,
        timeframe: str,
        limit: int = 5
    ) -> List[WyckoffSignal]:
        """
        获取威科夫信号

        Args:
            stock_id: 股票ID
            timeframe: 时间周期
            limit: 限制数量

        Returns:
            信号列表
        """
        return self.db.query(WyckoffSignal).filter(
            WyckoffSignal.stock_id == stock_id,
            WyckoffSignal.timeframe == timeframe
        ).order_by(WyckoffSignal.date.desc()).limit(limit).all()

    def save_signal(self, signal: WyckoffSignal) -> bool:
        """
        保存威科夫信号

        Args:
            signal: 信号对象

        Returns:
            是否成功
        """
        try:
            self.db.add(signal)
            self.db.commit()
            return True
        except Exception as e:
            logger.error(f"保存信号失败: {e}")
            self.db.rollback()
            return False

    # ========== 批量操作 ==========

    def delete_quotes(self, stock_id: int, timeframe: str) -> int:
        """
        删除指定股票的所有K线

        Args:
            stock_id: 股票ID
            timeframe: 时间周期

        Returns:
            删除数量
        """
        count = self.db.query(StockQuote).filter(
            StockQuote.stock_id == stock_id,
            StockQuote.timeframe == timeframe
        ).delete()
        self.db.commit()
        return count
