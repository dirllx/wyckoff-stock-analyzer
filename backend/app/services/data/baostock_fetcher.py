"""
Baostock数据获取器
作为akshare的备选数据源，专注于稳定的K线数据获取
"""
import baostock as bs
from datetime import datetime
from typing import List, Dict, Optional
from loguru import logger


class BaostockFetcher:
    """Baostock数据获取器"""

    # 周期映射
    FREQUENCY_MAP = {
        "daily": "d",
        "weekly": "w",
        "monthly": "m",
        "5": "5",
        "15": "15",
        "30": "30",
        "60": "60"
    }

    def __init__(self):
        """初始化"""
        self.bs = bs
        self._logged_in = False
        self._login()

    def _login(self):
        """登录Baostock"""
        try:
            lg = self.bs.login()
            if lg.error_code != '0':
                raise ConnectionError(f"Baostock登录失败: {lg.error_msg}")
            self._logged_in = True
            logger.info("Baostock登录成功")
        except Exception as e:
            logger.error(f"Baostock登录失败: {e}")
            raise

    def _ensure_login(self):
        """确保已登录"""
        if not self._logged_in:
            self._login()

    def _format_code(self, code: str) -> str:
        """
        格式化股票代码为Baostock格式

        Args:
            code: 股票代码 (如 "688234")

        Returns:
            Baostock格式代码 (如 "sh.688234")
        """
        # 判断市场
        if code.startswith("6") or code.startswith("5"):  # 上海证券交易所
            return f"sh.{code}"
        elif code.startswith("0") or code.startswith("3"):  # 深圳证券交易所
            return f"sz.{code}"
        else:
            # 默认上海
            return f"sh.{code}"

    def get_stock_quotes(
        self,
        code: str,
        timeframe: str,
        start_date: str,
        end_date: str = None
    ) -> List[Dict]:
        """
        获取K线数据

        Args:
            code: 股票代码
            timeframe: 时间周期 (daily/weekly/monthly/5/15/30/60)
            start_date: 开始日期 (YYYY-MM-DD)
            end_date: 结束日期 (YYYY-MM-DD)，默认为今天

        Returns:
            K线数据列表

        Raises:
            ValueError: 不支持的周期
            ConnectionError: 连接失败
        """
        self._ensure_login()

        # 转换周期
        frequency = self.FREQUENCY_MAP.get(timeframe)
        if not frequency:
            raise ValueError(f"不支持的周期: {timeframe}，支持: {list(self.FREQUENCY_MAP.keys())}")

        # 格式化代码
        bs_code = self._format_code(code)

        # 默认结束日期为今天
        if end_date is None:
            end_date = datetime.now().strftime("%Y-%m-%d")

        logger.info(f"Baostock获取: {code} ({timeframe}), {start_date} ~ {end_date}")

        # 查询数据
        rs = self.bs.query_history_k_data_plus(
            bs_code,
            "date,open,high,low,close,volume,amount",
            start_date=start_date,
            end_date=end_date,
            frequency=frequency,
            adjustflag="2"  # 2=前复权
        )

        # 检查错误
        if rs.error_code != '0':
            raise ConnectionError(f"Baostock查询失败: {rs.error_msg}")

        # 转换为字典列表
        data_list = []
        while (rs.error_code == '0') & rs.next():
            row = rs.get_row_data()

            # 跳过空数据
            if not row or row[0] == '':
                continue

            try:
                data_list.append({
                    "date": row[0],
                    "open": float(row[1]) if row[1] else 0,
                    "high": float(row[2]) if row[2] else 0,
                    "low": float(row[3]) if row[3] else 0,
                    "close": float(row[4]) if row[4] else 0,
                    "volume": float(row[5]) if row[5] else 0,
                    "amount": float(row[6]) if row[6] else 0
                })
            except (ValueError, IndexError) as e:
                logger.warning(f"跳过无效数据: {row}, 错误: {e}")
                continue

        logger.info(f"Baostock返回 {len(data_list)} 条数据")
        return data_list

    def get_stock_info(self, code: str) -> Dict:
        """
        获取股票基本信息

        Args:
            code: 股票代码

        Returns:
            股票信息字典
        """
        self._ensure_login()

        bs_code = self._format_code(code)

        # 查询股票信息
        rs = self.bs.query_stock_basic(code=bs_code)

        if rs.error_code != '0':
            return {
                "code": code,
                "name": "",
                "market": "A股",
                "industry": ""
            }

        # 获取第一行结果
        info = {}
        if rs.next():
            row = rs.get_row_data()
            info = {
                "code": code,
                "name": row[1] if len(row) > 1 else "",
                "market": "A股",
                "industry": row[2] if len(row) > 2 else ""
            }

        return info

    def __del__(self):
        """析构函数，登出系统"""
        try:
            if self._logged_in:
                self.bs.logout()
                logger.info("Baostock已登出")
        except:
            pass
