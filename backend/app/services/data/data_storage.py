"""
数据存储服务 - 将获取的数据存储到数据库
"""
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from typing import Optional, List
from loguru import logger

from app.models.database import Stock, StockQuote
from app.services.data.data_fetcher import DataFetcher


class DataStorage:
    """数据存储器"""

    def __init__(self, db: Session):
        self.db = db
        self.fetcher = DataFetcher()

    def get_or_create_stock(self, code: str) -> Stock:
        """
        获取或创建股票

        Args:
            code: 股票代码

        Returns:
            Stock对象
        """
        stock = self.db.query(Stock).filter(Stock.code == code).first()

        if not stock:
            # 获取股票信息
            stock_info = self.fetcher.get_stock_info(code)

            # 创建股票
            stock = Stock(
                code=code,
                name=stock_info.get("name", ""),
                market=stock_info.get("market", "未知"),
                industry=stock_info.get("industry", "")
            )
            self.db.add(stock)
            self.db.commit()
            self.db.refresh(stock)
            logger.info(f"创建新股票记录: {code}")

        return stock

    def save_quotes(
        self,
        code: str,
        quotes_df: pd.DataFrame,
        timeframe: str = "daily"
    ) -> int:
        """
        保存K线数据并重新计算所有均线

        Args:
            code: 股票代码
            quotes_df: K线数据DataFrame
            timeframe: 时间周期

        Returns:
            保存的记录数
        """
        try:
            # 获取股票
            stock = self.get_or_create_stock(code)

            # 保存每条K线（先保存价格、成交量等基础数据）
            saved_count = 0
            for _, row in quotes_df.iterrows():
                # 检查是否已存在
                existing = self.db.query(StockQuote).filter(
                    StockQuote.stock_id == stock.id,
                    StockQuote.date == row["date"],
                    StockQuote.timeframe == timeframe
                ).first()

                if existing:
                    # 更新现有记录
                    existing.open = row.get("open")
                    existing.high = row.get("high")
                    existing.low = row.get("low")
                    existing.close = row.get("close")
                    existing.volume = row.get("volume")
                    existing.amount = row.get("amount")
                else:
                    # 创建新记录
                    quote = StockQuote(
                        stock_id=stock.id,
                        date=row["date"],
                        timeframe=timeframe,
                        open=row.get("open"),
                        high=row.get("high"),
                        low=row.get("low"),
                        close=row.get("close"),
                        volume=row.get("volume"),
                        amount=row.get("amount")
                    )
                    self.db.add(quote)
                    saved_count += 1

            self.db.commit()

            # 保存完成后，获取所有K线数据并重新计算均线
            all_quotes = self.db.query(StockQuote).filter(
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

            # 按时间顺序计算所有技术指标
            df = self._calculate_indicators(df)

            # 更新所有记录的均线值
            for i, q in enumerate(all_quotes):
                q.ma5 = df.iloc[i]["ma5"]
                q.ma10 = df.iloc[i]["ma10"]
                q.ma20 = df.iloc[i]["ma20"]
                q.volume_ma5 = df.iloc[i]["volume_ma5"]
                q.obv = df.iloc[i]["obv"]

            self.db.commit()

            logger.info(f"保存股票{code} K线数据成功，新增{saved_count}条，已重新计算均线")
            return saved_count

        except Exception as e:
            self.db.rollback()
            logger.error(f"保存股票{code} K线数据失败: {e}")
            return 0

    def _calculate_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        计算技术指标

        Args:
            df: K线数据

        Returns:
            带技术指标的DataFrame
        """
        # 确保日期是datetime类型
        if not pd.api.types.is_datetime64_any_dtype(df["date"]):
            df["date"] = pd.to_datetime(df["date"])

        # 按日期排序
        df = df.sort_values("date")

        # 计算移动平均线
        df["ma5"] = df["close"].rolling(window=5, min_periods=1).mean()
        df["ma10"] = df["close"].rolling(window=10, min_periods=1).mean()
        df["ma20"] = df["close"].rolling(window=20, min_periods=1).mean()

        # 计算成交量均线
        df["volume_ma5"] = df["volume"].rolling(window=5, min_periods=1).mean()

        # 计算OBV (能量潮)
        obv = [0]
        for i in range(1, len(df)):
            if df.iloc[i]["close"] > df.iloc[i-1]["close"]:
                obv.append(obv[-1] + df.iloc[i]["volume"])
            elif df.iloc[i]["close"] < df.iloc[i-1]["close"]:
                obv.append(obv[-1] - df.iloc[i]["volume"])
            else:
                obv.append(obv[-1])
        df["obv"] = obv

        return df

    def get_quotes(
        self,
        code: str,
        timeframe: str = "daily",
        limit: int = 300
    ) -> List[StockQuote]:
        """
        获取K线数据

        Args:
            code: 股票代码
            timeframe: 时间周期
            limit: 返回数量限制

        Returns:
            StockQuote列表
        """
        stock = self.db.query(Stock).filter(Stock.code == code).first()

        if not stock:
            return []

        quotes = self.db.query(StockQuote).filter(
            StockQuote.stock_id == stock.id,
            StockQuote.timeframe == timeframe
        ).order_by(StockQuote.date.desc()).limit(limit).all()

        return list(reversed(quotes))

    def get_quotes_by_timeframe(
        self,
        stock_id: int,
        timeframe: str = "daily",
        limit: int = 300
    ) -> List[StockQuote]:
        """
        根据股票ID和周期获取K线数据

        Args:
            stock_id: 股票ID
            timeframe: 时间周期
            limit: 返回数量限制

        Returns:
            StockQuote列表
        """
        quotes = self.db.query(StockQuote).filter(
            StockQuote.stock_id == stock_id,
            StockQuote.timeframe == timeframe
        ).order_by(StockQuote.date.desc()).limit(limit).all()

        return list(reversed(quotes))

    def update_stock_quotes(self, code: str, timeframe: str = "daily") -> bool:
        """
        更新股票K线数据

        Args:
            code: 股票代码
            timeframe: 时间周期

        Returns:
            是否成功
        """
        try:
            # 获取最后一条数据日期
            stock = self.get_or_create_stock(code)
            last_quote = self.db.query(StockQuote).filter(
                StockQuote.stock_id == stock.id,
                StockQuote.timeframe == timeframe
            ).order_by(StockQuote.date.desc()).first()

            # 确定起始日期
            start_date = None
            if last_quote:
                start_date = (last_quote.date + timedelta(days=1)).strftime("%Y%m%d")

            # 获取新数据
            quotes_df = self.fetcher.get_stock_quotes(
                code=code,
                start_date=start_date,
                period=timeframe
            )

            if quotes_df.empty:
                logger.info(f"股票{code}没有新数据")
                return True

            # 保存数据
            self.save_quotes(code, quotes_df, timeframe)
            return True

        except Exception as e:
            logger.error(f"更新股票{code}数据失败: {e}")
            return False
