"""
数据获取服务 - 使用akshare获取A股和港股数据
"""
import akshare as ak
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional, List
from loguru import logger


class DataFetcher:
    """数据获取器"""

    def __init__(self):
        self.supported_markets = ["A股", "港股"]

    def get_stock_list(self, market: str = "A股") -> pd.DataFrame:
        """
        获取股票列表

        Args:
            market: 市场类型 (A股/港股)

        Returns:
            股票列表DataFrame
        """
        try:
            if market == "A股":
                # A股股票列表
                df = ak.stock_info_a_code_name()
                df.columns = ["code", "name"]
                df["market"] = "A股"
            elif market == "港股":
                # 港股股票列表
                df = ak.stock_hk_spot_em()
                df = df[["代码", "名称"]]
                df.columns = ["code", "name"]
                df["market"] = "港股"
            else:
                raise ValueError(f"不支持的市场: {market}")

            logger.info(f"获取{market}股票列表成功，共{len(df)}只股票")
            return df

        except Exception as e:
            logger.error(f"获取股票列表失败: {e}")
            return pd.DataFrame()

    def get_stock_info(self, code: str) -> dict:
        """
        获取单只股票基本信息

        Args:
            code: 股票代码

        Returns:
            股票信息字典，包含标准化的 name 和 industry 字段
        """
        try:
            # 判断市场
            if code.startswith("0") or code.startswith("3") or code.startswith("6"):
                # A股
                df = ak.stock_individual_info_em(symbol=code)
                info = {"code": code, "market": "A股"}

                # 先设置默认值
                info["name"] = ""
                info["industry"] = ""

                # 将 item-value 映射到 info 字典
                for _, row in df.iterrows():
                    info[row["item"]] = row["value"]

                # 标准化字段名
                if "股票简称" in info:
                    info["name"] = info["股票简称"]
                if "行业" in info:
                    info["industry"] = info["行业"]

            elif "." in code or code.startswith("0") and len(code) == 5:
                # 港股
                stock_name = ak.stock_hk_spot_em()
                stock_info = stock_name[stock_name["代码"] == code]
                if not stock_info.empty:
                    info = {
                        "code": code,
                        "name": stock_info.iloc[0]["名称"],
                        "market": "港股",
                        "industry": ""
                    }
                else:
                    info = {"code": code, "market": "港股", "name": "", "industry": ""}
            else:
                raise ValueError(f"无法识别股票代码: {code}")

            logger.info(f"获取股票{code}信息成功: {info.get('name', 'N/A')}")
            return info

        except Exception as e:
            logger.error(f"获取股票{code}信息失败: {e}")
            return {"code": code, "market": "未知", "name": "", "industry": ""}

    def get_stock_quotes(
        self,
        code: str,
        start_date: str = None,
        end_date: str = None,
        period: str = "daily",
        min_quotes: int = 500
    ) -> pd.DataFrame:
        """
        获取股票K线数据

        Args:
            code: 股票代码
            start_date: 开始日期 (YYYYMMDD) - 仅用于日线/周线/月线
            end_date: 结束日期 (YYYYMMDD) - 仅用于日线/周线/月线
            period: 周期 (daily=日线, weekly=周线, monthly=月线, 30=30分钟, 60=60分钟)
            min_quotes: 最小K线数量（默认500条，约3年数据）

        Returns:
            K线数据DataFrame
        """
        try:
            # 处理分钟线数据
            if period in ["1", "5", "15", "30", "60"]:
                return self._get_minute_quotes(code, period)

            # 默认日期范围 - 确保获取至少500根K线（约3年）
            if not end_date:
                end_date = datetime.now().strftime("%Y%m%d")
            if not start_date:
                # 获取至少3年的数据，确保有500+根K线用于计算MA250
                start_date = (datetime.now() - timedelta(days=365*3)).strftime("%Y%m%d")

            # 判断市场和获取数据
            if code.startswith("0") or code.startswith("3") or code.startswith("6"):
                # A股
                df = ak.stock_zh_a_hist(
                    symbol=code,
                    period=period,
                    start_date=start_date,
                    end_date=end_date,
                    adjust=""
                )
            elif "." in code or len(code) == 5:
                # 港股
                df = ak.stock_hk_hist(
                    symbol=code,
                    period=period,
                    start_date=start_date,
                    end_date=end_date,
                    adjust=""
                )
            else:
                raise ValueError(f"无法识别股票代码: {code}")

            # 重命名列
            df = df.rename(columns={
                "日期": "date",
                "开盘": "open",
                "收盘": "close",
                "最高": "high",
                "最低": "low",
                "成交量": "volume",
                "成交额": "amount",
                "振幅": "amplitude",
                "涨跌幅": "change_rate",
                "涨跌额": "change",
                "换手率": "turnover"
            })

            logger.info(f"获取股票{code} K线数据成功，共{len(df)}条")
            return df

        except Exception as e:
            logger.error(f"获取股票{code} K线数据失败: {e}")
            return pd.DataFrame()

    def _get_minute_quotes(self, code: str, period: str) -> pd.DataFrame:
        """
        获取分钟线K线数据

        Args:
            code: 股票代码
            period: 周期 (1, 5, 15, 30, 60)

        Returns:
            K线数据DataFrame
        """
        try:
            # 转换代码格式（A股需要加上 sh/sz 前缀）
            if code.startswith("6"):
                symbol = f"sh{code}"
            elif code.startswith("0") or code.startswith("3"):
                symbol = f"sz{code}"
            else:
                raise ValueError(f"无法识别的股票代码: {code}")

            # 获取分钟线数据
            df = ak.stock_zh_a_minute(symbol=symbol, period=period, adjust="")

            if df.empty:
                logger.warning(f"获取股票{code} {period}分钟线数据为空")
                return pd.DataFrame()

            # 重命名列（分钟线数据的列名与日线不同）
            # 分钟线返回的列名可能是 "时间" 或 "day"
            df = df.rename(columns={
                "时间": "date",
                "day": "date",
                "开盘": "open",
                "收盘": "close",
                "最高": "high",
                "最低": "low",
                "成交量": "volume",
                "成交额": "amount",
            })

            # 确保日期格式
            if "date" in df.columns:
                df["date"] = pd.to_datetime(df["date"])

            logger.info(f"获取股票{code} {period}分钟线数据成功，共{len(df)}条")
            return df

        except Exception as e:
            logger.error(f"获取股票{code} {period}分钟线数据失败: {e}")
            return pd.DataFrame()

    def get_realtime_quote(self, code: str) -> dict:
        """
        获取实时行情

        Args:
            code: 股票代码

        Returns:
            实时行情字典
        """
        try:
            if code.startswith("0") or code.startswith("3") or code.startswith("6"):
                # A股
                df = ak.stock_zh_a_spot_em()
                stock_data = df[df["代码"] == code]
                if not stock_data.empty:
                    return stock_data.iloc[0].to_dict()
            elif "." in code or len(code) == 5:
                # 港股
                df = ak.stock_hk_spot_em()
                stock_data = df[df["代码"] == code]
                if not stock_data.empty:
                    return stock_data.iloc[0].to_dict()

            return {}

        except Exception as e:
            logger.error(f"获取股票{code}实时行情失败: {e}")
            return {}
