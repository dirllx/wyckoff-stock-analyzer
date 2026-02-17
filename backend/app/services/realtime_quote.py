"""
实时行情服务 - 基于easyquotation获取实时行情
"""
import easyquotation
import time
from typing import Dict, Optional
from loguru import logger


class RealTimeQuoteService:
    """实时行情服务"""

    def __init__(self):
        # 默认使用新浪行情
        self.quotation = easyquotation.use('sina')

    def get_realtime_quote(self, code: str) -> Optional[Dict]:
        """
        获取单只股票的实时行情

        Args:
            code: 股票代码（如：000001, sh000001）

        Returns:
            实时行情数据
        """
        try:
            start = time.time()
            data = self.quotation.real(code)
            elapsed = (time.time() - start) * 1000

            if code in data and data[code]:
                quote = data[code]
                logger.info(f"获取{code}实时行情成功，耗时{elapsed:.0f}ms")
                return quote
            else:
                logger.warning(f"获取{code}实时行情失败，数据为空")
                return None

        except Exception as e:
            logger.error(f"获取{code}实时行情异常: {e}")
            return None

    def get_realtime_quotes(self, codes: list) -> Dict[str, Dict]:
        """
        获取多只股票的实时行情

        Args:
            codes: 股票代码列表

        Returns:
            股票代码到行情数据的映射
        """
        try:
            start = time.time()
            data = self.quotation.real(codes)
            elapsed = (time.time() - start) * 1000

            logger.info(f"获取{len(codes)}只股票实时行情成功，耗时{elapsed:.0f}ms")
            return data

        except Exception as e:
            logger.error(f"获取实时行情异常: {e}")
            return {}

    def switch_source(self, source: str = 'sina'):
        """
        切换行情源

        Args:
            source: 行情源 (sina/tencent)
        """
        if source in ['sina', 'tencent', 'qq']:
            self.quotation = easyquotation.use(source)
            logger.info(f"已切换到{source}行情源")
        else:
            logger.warning(f"不支持的行情源: {source}")

    def get_market_snapshot(self, prefix: bool = False) -> Dict:
        """
        获取全市场行情快照

        Args:
            prefix: 是否包含市场前缀（sz/sh）

        Returns:
            全市场行情数据
        """
        try:
            data = self.quotation.market_snapshot(prefix=prefix)
            logger.info(f"获取全市场行情快照成功，共{len(data)}只股票")
            return data
        except Exception as e:
            logger.error(f"获取全市场行情快照失败: {e}")
            return {}

    def format_quote(self, quote: Dict) -> Dict:
        """
        格式化实时行情数据为统一格式

        Args:
            quote: 原始行情数据

        Returns:
            格式化后的数据
        """
        if not quote:
            return None

        return {
            'name': quote.get('name', ''),
            'price': quote.get('now', quote.get('price', 0)),
            'open': quote.get('open', 0),
            'high': quote.get('high', 0),
            'low': quote.get('low', 0),
            'close': quote.get('close', quote.get('lastPrice', 0)),
            'volume': quote.get('volume', 0),
            'amount': quote.get('turnover', quote.get('amount', 0)),
            'bid1': quote.get('bid1', 0),
            'ask1': quote.get('ask1', 0),
            'date': quote.get('date', ''),
            'time': quote.get('time', '')
        }


# 单例实例
_realtime_service = None


def get_realtime_service() -> RealTimeQuoteService:
    """获取实时行情服务单例"""
    global _realtime_service
    if _realtime_service is None:
        _realtime_service = RealTimeQuoteService()
    return _realtime_service
