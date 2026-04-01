"""
Easyquotation数据获取器
专注于实时行情数据获取
"""
import easyquotation as eq
from typing import Dict, List, Optional
from loguru import logger


class EasyquotationFetcher:
    """Easyquotation数据获取器"""

    def __init__(self, source: str = "sina"):
        """
        初始化

        Args:
            source: 数据源 (sina/tencent/sina)
        """
        self.source = source
        self.quotation = None
        self._initialized = False
        self._init_quotation()

    def _init_quotation(self):
        """初始化行情实例"""
        try:
            self.quotation = eq.use(self.source)
            self._initialized = True
            logger.info(f"Easyquotation初始化成功 (source: {self.source})")
        except Exception as e:
            logger.error(f"Easyquotation初始化失败: {e}")
            raise

    def get_realtime_quotes(self, codes: List[str]) -> Dict[str, Dict]:
        """
        获取实时行情数据

        Args:
            codes: 股票代码列表

        Returns:
            实时行情字典
        """
        if not self._initialized:
            self._init_quotation()

        try:
            logger.info(f"获取实时行情: {len(codes)}只股票 (source: {self.source})")

            # 获取实时数据
            data = self.quotation.real(codes)

            # 转换为统一格式
            result = {}
            for code, quote in data.items():
                result[code] = {
                    "date": quote.get("date", ""),
                    "time": quote.get("time", ""),
                    "open": float(quote.get("open", 0)),
                    "close": float(quote.get("now", quote.get("close", 0))),
                    "high": float(quote.get("high", 0)),
                    "low": float(quote.get("low", 0)),
                    "volume": float(quote.get("volume", quote.get("turnover", 0))),
                    "amount": float(quote.get("amount", 0)),
                    "buy": float(quote.get("buy", 0)),
                    "sell": float(quote.get("sell", 0)),
                }

            logger.info(f"✅ 获取实时行情成功: {len(result)}只股票")
            return result

        except Exception as e:
            logger.error(f"获取实时行情失败: {e}")
            raise

    def get_market_snapshot(self, prefix: bool = False) -> Dict[str, Dict]:
        """
        获取全市场快照

        Args:
            prefix: 是否带市场前缀

        Returns:
            全市场行情字典
        """
        if not self._initialized:
            self._init_quotation()

        try:
            logger.info("获取全市场快照...")

            # 获取全市场数据
            data = self.quotation.market_snapshot(prefix=prefix)

            logger.info(f"✅ 获取全市场快照成功: {len(data)}只股票")
            return data

        except Exception as e:
            logger.error(f"获取全市场快照失败: {e}")
            raise

    def get_stock_quotes(
        self,
        code: str,
        timeframe: str,
        start_date: str,
        end_date: str
    ) -> List[Dict]:
        """
        获取K线数据（不支持的接口）

        注意: Easyquotation不支持历史K线数据
        此接口仅用于兼容调度器接口，实际不支持

        Raises:
            NotImplementedError: Easyquotation不支持历史K线
        """
        raise NotImplementedError(
            "Easyquotation不支持历史K线数据获取。"
            "它只支持实时行情快照。"
            "请使用akshare或baostock获取历史K线数据。"
        )

    def get_stock_info(self, code: str) -> Dict:
        """
        获取股票实时信息

        Args:
            code: 股票代码

        Returns:
            股票信息字典
        """
        if not self._initialized:
            self._init_quotation()

        try:
            data = self.quotation.real(code)

            if code in data:
                quote = data[code]
                return {
                    "code": code,
                    "name": quote.get("name", ""),
                    "price": float(quote.get("now", 0)),
                    "open": float(quote.get("open", 0)),
                    "high": float(quote.get("high", 0)),
                    "low": float(quote.get("low", 0)),
                    "volume": float(quote.get("volume", 0)),
                    "time": f"{quote.get('date', '')} {quote.get('time', '')}"
                }
            else:
                return {
                    "code": code,
                    "name": "",
                    "price": 0,
                    "error": "股票代码不存在"
                }

        except Exception as e:
            logger.error(f"获取股票信息失败: {e}")
            raise
