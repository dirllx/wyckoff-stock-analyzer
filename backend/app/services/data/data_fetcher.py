"""
数据获取服务 - 使用akshare获取A股和港股数据
支持网络重试机制，提高数据获取成功率
"""
import os
# 绕过系统代理，直连东方财富等数据源API
os.environ["NO_PROXY"] = "*"
os.environ.pop("HTTP_PROXY", None)
os.environ.pop("HTTPS_PROXY", None)
os.environ.pop("http_proxy", None)
os.environ.pop("https_proxy", None)
os.environ.pop("ALL_PROXY", None)
os.environ.pop("all_proxy", None)

import akshare as ak
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional, List
from loguru import logger

from app.utils.retry import retry_on_network_error


class DataFetcher:
    """数据获取器"""

    def __init__(self):
        self.supported_markets = ["A股", "港股"]

    @retry_on_network_error(max_retries=2, initial_delay=1.0)
    def get_stock_list(self, market: str = "A股") -> pd.DataFrame:
        """
        获取股票列表（带网络重试）

        Args:
            market: 市场类型 (A股/港股)

        Returns:
            股票列表DataFrame

        Note:
            使用网络重试机制，最大重试2次
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

        except (ValueError, KeyError, ConnectionError, RuntimeError) as e:
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
            # 判断市场类型
            # 优先判断：港股（4位或5位纯数字）
            if len(code) in [4, 5] and code.isdigit():
                # 港股 (支持 02157 或 2157 格式)
                # 格式化为5位
                hk_code = code.zfill(5) if len(code) == 4 else code

                try:
                    stock_name = ak.stock_hk_spot_em()
                    stock_info = stock_name[stock_name["代码"] == hk_code]
                    if not stock_info.empty:
                        return {
                            "code": code,
                            "name": stock_info.iloc[0]["名称"],
                            "market": "港股",
                            "industry": ""
                        }
                except (ValueError, KeyError, IndexError, ConnectionError) as e:
                    logger.warning(f"获取港股{code}名称失败: {e}")
                return {"code": code, "market": "港股", "name": "", "industry": ""}

            # 科创板A股：688开头（必须在基金判断之前）
            elif code.startswith("688") and len(code) == 6:
                # 科创板A股，使用A股接口
                df = ak.stock_individual_info_em(symbol=code)
                info = {"code": code, "market": "A股", "industry": ""}

                # 先设置默认值
                info["name"] = ""

                # 将 item-value 映射到 info 字典
                for _, row in df.iterrows():
                    info[row["item"]] = row["value"]

                # 标准化字段名
                if "股票简称" in info:
                    info["name"] = info["股票简称"]
                if "行业" in info:
                    info["industry"] = info["行业"]

                logger.info(f"获取股票{code}信息成功: {info.get('name', 'N/A')}")
                return info

            # 基金/ETF：5开头且长度为6（排除688的科创板）
            elif code.startswith("5") and len(code) == 6:
                # 基金/ETF
                try:
                    df = ak.fund_etf_spot_em()
                    fund_info = df[df["代码"] == code]
                    if not fund_info.empty:
                        return {
                            "code": code,
                            "name": fund_info.iloc[0]["名称"],
                            "market": "基金",
                            "industry": "ETF"
                        }
                except Exception as e:
                    logger.warning(f"获取基金{code}信息失败: {e}")

            # 普通A股：0/3开头，或6开头但不是688（科创板已单独处理）
            elif code.startswith("0") or code.startswith("3") or \
                 (code.startswith("6") and not code.startswith("688")):
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

            elif code.startswith("HK"):
                # 港股带HK前缀的格式（如HK2157）
                hk_code = code[2:]  # 去掉HK前缀
                hk_code = hk_code.zfill(5)  # 格式化为5位

                try:
                    stock_name = ak.stock_hk_spot_em()
                    stock_info = stock_name[stock_name["代码"] == hk_code]
                    if not stock_info.empty:
                        return {
                            "code": code,
                            "name": stock_info.iloc[0]["名称"],
                            "market": "港股",
                            "industry": ""
                        }
                except (ValueError, KeyError, IndexError, ConnectionError) as e:
                    logger.warning(f"获取港股{code}名称失败: {e}")
                return {"code": code, "market": "港股", "name": "", "industry": ""}
            else:
                raise ValueError(f"无法识别股票代码: {code}")

            logger.info(f"获取股票{code}信息成功: {info.get('name', 'N/A')}")
            return info

        except (ValueError, KeyError, ConnectionError, RuntimeError) as e:
            logger.error(f"获取股票{code}信息失败: {e}")
            return {"code": code, "market": "未知", "name": "", "industry": ""}

    @retry_on_network_error(max_retries=3, initial_delay=2.0)
    def get_stock_quotes(
        self,
        code: str,
        start_date: str = None,
        end_date: str = None,
        period: str = "daily",
        min_quotes: int = 500
    ) -> pd.DataFrame:
        """
        获取股票K线数据（带网络重试）

        Args:
            code: 股票代码
            start_date: 开始日期 (YYYYMMDD) - 仅用于日线/周线/月线
            end_date: 结束日期 (YYYYMMDD) - 仅用于日线/周线/月线
            period: 周期 (daily=日线, weekly=周线, monthly=月线, 30=30分钟, 60=60分钟)
            min_quotes: 最小K线数量（默认500条，约3年数据）

        Returns:
            K线数据DataFrame

        Note:
            使用网络重试机制，最大重试3次，使用指数退避策略
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
            # 优先判断：港股（4位或5位纯数字）
            if len(code) in [4, 5] and code.isdigit():
                # 港股 (支持 02157 或 2157 格式)
                # 格式化为5位
                hk_code = code.zfill(5) if len(code) == 4 else code

                df = ak.stock_hk_hist(
                    symbol=hk_code,
                    period=period,
                    start_date=start_date,
                    end_date=end_date,
                    adjust=""
                )

            # 科创板A股：688开头（必须在基金判断之前）
            elif code.startswith("688") and len(code) == 6:
                # 科创板A股，使用A股接口
                df = ak.stock_zh_a_hist(
                    symbol=code,
                    period=period,
                    start_date=start_date,
                    end_date=end_date,
                    adjust="qfq"  # 前复权
                )

            # 基金/ETF：5开头且长度为6（排除科创板）
            elif code.startswith("5") and len(code) == 6:
                # 基金/ETF
                df = ak.fund_etf_hist_em(
                    symbol=code,
                    period=period,
                    start_date=start_date,
                    end_date=end_date,
                    adjust=""
                )

            # 普通A股：0/3开头，或6开头但不是688（科创板已单独处理）
            elif code.startswith("0") or code.startswith("3") or \
                 (code.startswith("6") and not code.startswith("688")):
                # A股 - 使用前复权数据
                df = ak.stock_zh_a_hist(
                    symbol=code,
                    period=period,
                    start_date=start_date,
                    end_date=end_date,
                    adjust="qfq"  # 前复权
                )
            elif code.startswith("HK"):
                # 港股带HK前缀的格式（如HK2157）
                hk_code = code[2:]  # 去掉HK前缀
                hk_code = hk_code.zfill(5)  # 格式化为5位

                df = ak.stock_hk_hist(
                    symbol=hk_code,
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

            # 确保日期格式
            if "date" in df.columns:
                df["date"] = pd.to_datetime(df["date"])

            # 过滤未来日期的数据（避免显示尚未完成的交易日数据）
            current_time = datetime.now()
            current_date = current_time.date()

            # A股交易时间：9:30-15:00
            # 如果当前时间在15:00之前，排除当天的数据（当天交易未完成）
            trading_hour_end = current_time.replace(hour=15, minute=0, second=0, microsecond=0)

            before_filter = len(df)

            # 如果当前时间在15:00之前，排除今天的数据
            if current_time < trading_hour_end:
                df = df[df["date"].dt.date < current_date]
                if before_filter > len(df):
                    logger.info(f"当前时间{current_time.strftime('%H:%M')}未到收盘，排除今日数据")

            # 二次确认：过滤掉任何严格大于当前日期的数据
            df = df[df["date"].dt.date <= current_date]

            after_filter = len(df)
            if before_filter > after_filter:
                logger.info(f"过滤掉 {before_filter - after_filter} 条未来/未完成日期的数据")

            logger.info(f"获取股票{code} K线数据成功，共{len(df)}条")
            return df

        except (ValueError, KeyError, ConnectionError, RuntimeError) as e:
            logger.error(f"获取股票{code} K线数据失败: {e}")
            return pd.DataFrame()

    @retry_on_network_error(max_retries=3, initial_delay=1.0)
    def _get_minute_quotes(self, code: str, period: str) -> pd.DataFrame:
        """
        获取分钟线K线数据（带网络重试）

        Args:
            code: 股票代码
            period: 周期 (1, 5, 15, 30, 60)

        Returns:
            分钟线K线DataFrame

        Note:
            使用网络重试机制，最大重试3次
        """
        try:
            # 检查是否支持分钟线数据
            # 港股：4-5位数字或带HK前缀
            is_hk_stock = (len(code) in [4, 5] and code.isdigit()) or code.startswith("HK")
            if is_hk_stock:
                logger.warning(f"港股 {code} 不支持分钟线数据，仅支持日线数据")
                raise ValueError(f"港股不支持分钟线数据，请使用日线周期查询")

            # 基金/ETF：5开头且长度为6（排除科创板688）
            if code.startswith("5") and len(code) == 6:
                logger.warning(f"基金/ETF {code} 不支持分钟线数据，仅支持日线数据")
                raise ValueError(f"基金/ETF不支持分钟线数据，请使用日线周期查询")

            # 转换代码格式（A股需要加上 sh/sz 前缀）
            # 科创板（688）和普通A股（600/601/603等）都支持分钟线
            if code.startswith("6"):
                symbol = f"sh{code}"
            elif code.startswith("0") or code.startswith("3"):
                symbol = f"sz{code}"
            else:
                raise ValueError(f"无法识别的股票代码: {code}")

            # 获取分钟线数据
            df = ak.stock_zh_a_minute(symbol=symbol, period=period, adjust="")

            if df.empty:
                logger.warning(f"获取股票{code} {period}分钟线数据为空，可能原因：")
                logger.warning(f"  1. 股票代码不存在或已退市")
                logger.warning(f"  2. akshare接口不支持该股票的分钟线数据")
                logger.warning(f"  3. 该股票可能停牌")
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

            # 过滤未来时间的数据（避免显示尚未发生的K线）
            current_time = datetime.now()
            before_filter = len(df)
            df = df[df["date"] <= current_time]
            after_filter = len(df)

            if before_filter > after_filter:
                logger.info(f"过滤掉 {before_filter - after_filter} 条未来时间的数据")

            logger.info(f"获取股票{code} {period}分钟线数据成功，共{len(df)}条")
            return df

        except ValueError:
            # 重新抛出ValueError，让上层处理
            raise
        except (KeyError, IndexError, ConnectionError, RuntimeError) as e:
            error_msg = str(e)
            if "不存在" in error_msg or "退市" in error_msg:
                logger.error(f"股票{code}不存在或已退市，无法获取{period}分钟线数据")
            else:
                logger.error(f"获取股票{code} {period}分钟线数据失败: {e}")
            return pd.DataFrame()

    @retry_on_network_error(max_retries=2, initial_delay=1.0)
    def get_realtime_quote(self, code: str) -> dict:
        """
        获取实时行情（带网络重试）

        Args:
            code: 股票代码

        Returns:
            实时行情字典

        Note:
            使用网络重试机制，最大重试2次（实时数据要求快速响应）
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

        except (ValueError, KeyError, ConnectionError, RuntimeError) as e:
            logger.error(f"获取股票{code}实时行情失败: {e}")
            return {}
