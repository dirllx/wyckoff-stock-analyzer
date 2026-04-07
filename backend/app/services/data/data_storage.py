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
from app.repositories.stock_repository import StockRepository


class DataStorage:
    """数据存储器"""

    def __init__(self, db: Session):
        self.db = db
        self.fetcher = DataFetcher()
        self.repo = StockRepository(db)  # 使用Repository

    def get_or_create_stock(self, code: str) -> Stock:
        """
        获取或创建股票

        Args:
            code: 股票代码

        Returns:
            Stock对象
        """
        # 使用Repository的find_or_create方法
        stock = self.repo.find_or_create(code)

        # 如果是新创建的股票，获取详细信息
        if not stock.name or stock.name == code:
            try:
                stock_info = self.fetcher.get_stock_info(code)
                stock.name = stock_info.get("name", "")
                stock.market = stock_info.get("market", "未知")
                stock.industry = stock_info.get("industry", "")
                self.db.commit()
                logger.info(f"更新股票信息: {code} - {stock.name}")
            except Exception as e:
                logger.warning(f"获取股票信息失败: {e}")

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

            # ✅ 优化：批量查询已存在的记录，避免N+1查询问题
            existing_dates = {
                q.date: q
                for q in self.db.query(StockQuote).filter(
                    StockQuote.stock_id == stock.id,
                    StockQuote.timeframe == timeframe,
                    StockQuote.date.in_(quotes_df["date"].tolist())
                ).all()
            }

            # 批量创建/更新
            quotes_to_add = []
            saved_count = 0

            for _, row in quotes_df.iterrows():
                # 确保date是datetime对象
                date_val = row["date"]
                if isinstance(date_val, str):
                    date_val = datetime.strptime(date_val, "%Y-%m-%d")
                elif hasattr(date_val, 'to_pydatetime'):
                    date_val = date_val.to_pydatetime()

                if date_val in existing_dates:
                    # 更新现有记录（收集对象，稍后批量提交）
                    existing = existing_dates[date_val]
                    existing.open = row.get("open")
                    existing.high = row.get("high")
                    existing.low = row.get("low")
                    existing.close = row.get("close")
                    existing.volume = row.get("volume")
                    existing.amount = row.get("amount")
                else:
                    # 收集需要添加的新记录
                    quote = StockQuote(
                        stock_id=stock.id,
                        date=date_val,
                        timeframe=timeframe,
                        open=row.get("open"),
                        high=row.get("high"),
                        low=row.get("low"),
                        close=row.get("close"),
                        volume=row.get("volume"),
                        amount=row.get("amount")
                    )
                    quotes_to_add.append(quote)
                    saved_count += 1

            # 批量添加新记录
            if quotes_to_add:
                self.db.bulk_save_objects(quotes_to_add)

            self.db.commit()

            # 【重要】先删除旧数据，再计算MA，确保MA值基于最终保留的数据计算
            # 确保只保留最新500条数据（删除超过500条的旧数据）
            total_count = self.db.query(StockQuote).filter(
                StockQuote.stock_id == stock.id,
                StockQuote.timeframe == timeframe
            ).count()

            if total_count > 500:
                # 查询需要删除的旧数据（按日期升序，删除最旧的）
                quotes_to_delete = self.db.query(StockQuote).filter(
                    StockQuote.stock_id == stock.id,
                    StockQuote.timeframe == timeframe
                ).order_by(StockQuote.date.asc()).limit(total_count - 500).all()

                # 记录要删除的ID
                delete_ids = [q.id for q in quotes_to_delete]

                # 批量删除
                if delete_ids:
                    self.db.query(StockQuote).filter(
                        StockQuote.id.in_(delete_ids)
                    ).delete()
                    self.db.commit()
                    logger.info(f"✅ {code} {timeframe}: 删除了{len(delete_ids)}条旧数据，保留最新500条")

            # 删除完成后，获取剩余的所有K线数据并重新计算均线
            all_quotes = self.db.query(StockQuote).filter(
                StockQuote.stock_id == stock.id,
                StockQuote.timeframe == timeframe
            ).order_by(StockQuote.date.asc()).all()

            # 转换为DataFrame
            # ✅ 优化：直接从ORM对象创建DataFrame
            df = pd.DataFrame([
                {
                    "date": q.date,
                    "open": q.open,
                    "high": q.high,
                    "low": q.low,
                    "close": q.close,
                    "volume": q.volume,
                    "amount": q.amount
                }
                for q in all_quotes
            ])

            # 按时间顺序计算所有技术指标（基于最终保留的500条数据）
            df = self._calculate_indicators(df)

            # ✅ 优化：使用提取的方法批量更新指标
            self._update_quote_indicators(all_quotes, df)

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
        df["ma15"] = df["close"].rolling(window=15, min_periods=1).mean()
        df["ma20"] = df["close"].rolling(window=20, min_periods=1).mean()
        df["ma30"] = df["close"].rolling(window=30, min_periods=1).mean()
        df["ma60"] = df["close"].rolling(window=60, min_periods=1).mean()
        df["ma90"] = df["close"].rolling(window=90, min_periods=1).mean()
        df["ma120"] = df["close"].rolling(window=120, min_periods=1).mean()
        df["ma250"] = df["close"].rolling(window=250, min_periods=1).mean()

        # 计算多空线：SUM(MA(CLOSE,10),10)/10.110 × 1.011
        # 对最近10天的MA10求和，然后除以10.110，再乘以1.011
        df["duokong_line"] = (df["ma10"].rolling(window=10, min_periods=1).sum() / 10.110) * 1.011

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

    def _update_quote_indicators(self, quotes: List[StockQuote], df: pd.DataFrame) -> None:
        """
        批量更新K线的技术指标（提取的公共方法，避免重复代码）

        Args:
            quotes: StockQuote对象列表
            df: 包含技术指标的DataFrame
        """
        for i, q in enumerate(quotes):
            q.ma5 = df.iloc[i]["ma5"]
            q.ma10 = df.iloc[i]["ma10"]
            q.ma15 = df.iloc[i]["ma15"]
            q.ma20 = df.iloc[i]["ma20"]
            q.ma30 = df.iloc[i]["ma30"]
            q.ma60 = df.iloc[i]["ma60"]
            q.ma90 = df.iloc[i]["ma90"]
            q.ma120 = df.iloc[i]["ma120"]
            q.ma250 = df.iloc[i]["ma250"]
            q.duokong_line = df.iloc[i]["duokong_line"]
            q.volume_ma5 = df.iloc[i]["volume_ma5"]
            q.obv = df.iloc[i]["obv"]

    def get_quotes(
        self,
        code: str,
        timeframe: str = "daily",
        limit: int = None
    ) -> List[StockQuote]:
        """
        获取K线数据

        Args:
            code: 股票代码
            timeframe: 时间周期
            limit: 返回数量限制（默认：日线300，其他500）

        Returns:
            StockQuote列表
        """
        # 根据时间周期设置默认limit
        if limit is None:
            limit = 300 if timeframe == "daily" else 500

        # 使用Repository查找股票
        stock = self.repo.find_by_code(code)

        if not stock:
            return []

        # 使用Repository获取K线
        quotes = self.repo.get_quotes(stock.id, timeframe, limit)

        # Repository返回的是desc顺序，需要反转
        return list(reversed(quotes))

    def get_quotes_by_timeframe(
        self,
        stock_id: int,
        timeframe: str = "daily",
        limit: int = None
    ) -> List[StockQuote]:
        """
        根据股票ID和周期获取K线数据

        Args:
            stock_id: 股票ID
            timeframe: 时间周期
            limit: 返回数量限制（默认：日线300，其他500）

        Returns:
            StockQuote列表
        """
        # 根据时间周期设置默认limit
        if limit is None:
            limit = 300 if timeframe == "daily" else 500

        # 使用Repository获取K线
        quotes = self.repo.get_quotes(stock_id, timeframe, limit)

        # Repository返回的是desc顺序，需要反转
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
            # 获取股票
            stock = self.get_or_create_stock(code)

            # 使用调度器获取数据
            from app.services.data.source_scheduler import get_scheduler
            from app.utils.converters import dict_to_stock_quotes
            from datetime import datetime, timedelta

            scheduler = get_scheduler()

            # 分钟线数据特殊处理：实时获取，每次都更新最近的数据
            if timeframe in ["1", "5", "15", "30", "60"]:
                logger.info(f"分钟线数据实时更新: {code} {timeframe}分钟")

                # 获取最新的分钟线数据（获取足够的数据用于计算均线）
                end_date = datetime.now().strftime("%Y-%m-%d")
                start_date = (datetime.now() - timedelta(days=60)).strftime("%Y-%m-%d")  # 最近60天

                # 先获取新数据，成功后再删除旧数据（避免获取失败导致数据丢失）
                quotes_dict = scheduler.fetch_with_fallback(
                    code=code,
                    timeframe=timeframe,
                    start_date=start_date,
                    end_date=end_date
                )

                if not quotes_dict:
                    logger.warning(f"股票{code} {timeframe}分钟线获取失败，保留旧数据")
                    return False

                # 只保留最新500条
                quotes_dict = quotes_dict[-500:] if len(quotes_dict) > 500 else quotes_dict

                # 新数据获取成功后，删除该股票该周期的旧数据
                self.db.query(StockQuote).filter(
                    StockQuote.stock_id == stock.id,
                    StockQuote.timeframe == timeframe
                ).delete()
                logger.info(f"已删除 {code} {timeframe} 的旧数据，准备保存新数据")

                # 只保留最新500条
                quotes_dict = quotes_dict[-500:] if len(quotes_dict) > 500 else quotes_dict

                # 转换并保存
                quotes = dict_to_stock_quotes(quotes_dict, stock.id, timeframe)
                for quote in quotes:
                    self.db.add(quote)
                self.db.commit()

                # 计算均线（分钟线也需要计算均线）
                all_quotes = self.db.query(StockQuote).filter(
                    StockQuote.stock_id == stock.id,
                    StockQuote.timeframe == timeframe
                ).order_by(StockQuote.date.asc()).all()

                if all_quotes:
                    # ✅ 优化：直接从ORM对象创建DataFrame，避免中间列表
                    df = pd.DataFrame([
                        {
                            "date": q.date,
                            "open": q.open,
                            "high": q.high,
                            "low": q.low,
                            "close": q.close,
                            "volume": q.volume
                        }
                        for q in all_quotes
                    ])
                    df = self._calculate_indicators(df)

                    # ✅ 优化：使用提取的方法批量更新指标
                    self._update_quote_indicators(all_quotes, df)

                    self.db.commit()
                    logger.info(f"✅ {code} {timeframe}分钟线均线计算完成")

                logger.info(f"✅ {code} {timeframe}分钟线实时更新成功，共{len(quotes)}条")
                return True

            # 日线/周线/月线数据的增量更新逻辑
            # 检查现有数据量
            existing_count = self.db.query(StockQuote).filter(
                StockQuote.stock_id == stock.id,
                StockQuote.timeframe == timeframe
            ).count()

            # 如果现有数据少于500条，重新获取全部数据
            if existing_count < 500:
                logger.info(f"股票{code}现有数据{existing_count}条不足500条，重新获取全部数据")
                start_date = (datetime.now() - timedelta(days=365*3)).strftime("%Y-%m-%d")  # 获取3年数据
            else:
                # 获取最后一条数据日期
                last_quote = self.db.query(StockQuote).filter(
                    StockQuote.stock_id == stock.id,
                    StockQuote.timeframe == timeframe
                ).order_by(StockQuote.date.desc()).first()

                # 确定起始日期 - 只获取新数据
                start_date = None
                if last_quote:
                    next_date = last_quote.date + timedelta(days=1)
                    start_date = next_date.strftime("%Y-%m-%d")

                    # 如果start_date已经大于今天，说明数据已经是最新的
                    if next_date.date() > datetime.now().date():
                        logger.info(f"股票{code}数据已是最新的（最新日期: {last_quote.date.date()}）")
                        return True

            end_date = datetime.now().strftime("%Y-%m-%d")

            # 使用调度器获取数据
            quotes_dict = scheduler.fetch_with_fallback(
                code=code,
                timeframe=timeframe,
                start_date=start_date,
                end_date=end_date
            )

            if not quotes_dict:
                logger.info(f"股票{code}没有新数据")
                return True

            # 转换为DataFrame（不需要在这里计算MA，save_quotes会重新计算）
            df = pd.DataFrame(quotes_dict)

            # 保存数据（save_quotes方法会重新计算所有MA，确保数据正确）
            saved_count = self.save_quotes(code, df, timeframe)

            logger.info(f"✅ 股票{code} {timeframe}数据更新成功，新增{saved_count}条")
            return saved_count > 0

        except Exception as e:
            logger.error(f"更新股票{code}数据失败: {e}")
            return False
