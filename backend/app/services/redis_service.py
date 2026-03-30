"""
Redis缓存服务
用于缓存股票数据和分析结果，减少API调用和提高响应速度
"""
import json
from typing import Optional, Any, List
from datetime import timedelta
from app.database import get_redis
import logging

logger = logging.getLogger(__name__)


class RedisService:
    """Redis缓存服务"""

    # 缓存键前缀
    KEY_PREFIX = "wyckoff:"

    # 缓存过期时间（秒）
    TTL = {
        "stock_data": 3600,          # 股票数据（日线/周线/月线）：1小时
        "stock_data_minute": 300,    # 股票数据（分钟线）：5分钟 - 交易时段内实时更新
        "analysis_result": 1800,     # 分析结果（日线/周线/月线）：30分钟
        "analysis_result_minute": 300,  # 分析结果（分钟线）：5分钟
        "realtime_quote": 60,        # 实时行情：1分钟
        "batch_analysis": 7200,      # 批量分析：2小时
        "multi_timeframe": 1800,     # 多周期分析：30分钟
    }

    @classmethod
    def _make_key(cls, *parts: str) -> str:
        """生成缓存键"""
        return f"{cls.KEY_PREFIX}{':'.join(parts)}"

    @classmethod
    def get(cls, key: str) -> Optional[Any]:
        """
        获取缓存
        :param key: 缓存键
        :return: 缓存值，不存在返回None
        """
        try:
            client = get_redis()
            if not client:
                return None
            value = client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.warning(f"Redis读取失败: {e}")
            return None

    @classmethod
    def set(cls, key: str, value: Any, ttl: int = 3600) -> bool:
        """
        设置缓存
        :param key: 缓存键
        :param value: 缓存值
        :param ttl: 过期时间（秒）
        :return: 是否成功
        """
        try:
            client = get_redis()
            if not client:
                return False
            json_value = json.dumps(value, ensure_ascii=False)
            return client.setex(key, ttl, json_value)
        except Exception as e:
            logger.warning(f"Redis写入失败: {e}")
            return False

    @classmethod
    def delete(cls, key: str) -> bool:
        """
        删除缓存
        :param key: 缓存键
        :return: 是否成功
        """
        try:
            client = get_redis()
            if not client:
                return False
            client.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Redis删除失败: {e}")
            return False

    @classmethod
    def exists(cls, key: str) -> bool:
        """
        检查缓存是否存在
        :param key: 缓存键
        :return: 是否存在
        """
        try:
            client = get_redis()
            if not client:
                return False
            return client.exists(key) > 0
        except Exception as e:
            logger.warning(f"Redis检查失败: {e}")
            return False

    # ========== 股票数据缓存 ==========

    @classmethod
    def cache_stock_data(cls, code: str, timeframe: str, data: List[dict]) -> bool:
        """
        缓存股票数据
        :param code: 股票代码
        :param timeframe: 时间周期
        :param data: K线数据
        """
        key = cls._make_key("stock", code, timeframe)
        # 分钟线使用5分钟缓存，日线/周线/月线使用1小时缓存
        ttl = cls.TTL["stock_data_minute"] if timeframe in ["1", "5", "15", "30", "60"] else cls.TTL["stock_data"]
        return cls.set(key, data, ttl)

    @classmethod
    def get_stock_data(cls, code: str, timeframe: str) -> Optional[List[dict]]:
        """
        获取缓存的股票数据
        """
        key = cls._make_key("stock", code, timeframe)
        return cls.get(key)

    # ========== 分析结果缓存 ==========

    @classmethod
    def cache_analysis(cls, code: str, timeframe: str, analysis: dict) -> bool:
        """
        缓存分析结果
        :param code: 股票代码
        :param timeframe: 时间周期
        :param analysis: 分析结果
        """
        key = cls._make_key("analysis", code, timeframe)
        # 分钟线使用5分钟缓存，日线/周线/月线使用30分钟缓存
        ttl = cls.TTL["analysis_result_minute"] if timeframe in ["1", "5", "15", "30", "60"] else cls.TTL["analysis_result"]
        return cls.set(key, analysis, ttl)

    @classmethod
    def get_analysis(cls, code: str, timeframe: str) -> Optional[dict]:
        """
        获取缓存的分析结果
        """
        key = cls._make_key("analysis", code, timeframe)
        return cls.get(key)

    # ========== 多周期分析缓存 ==========

    @classmethod
    def cache_multi_timeframe(cls, code: str, timeframes: List[str], analysis: dict) -> bool:
        """
        缓存多周期分析结果
        :param code: 股票代码
        :param timeframes: 周期列表
        :param analysis: 分析结果
        """
        key = cls._make_key("multi", code, ",".join(sorted(timeframes)))
        return cls.set(key, analysis, cls.TTL["multi_timeframe"])

    @classmethod
    def get_multi_timeframe(cls, code: str, timeframes: List[str]) -> Optional[dict]:
        """
        获取缓存的多周期分析结果
        """
        key = cls._make_key("multi", code, ",".join(sorted(timeframes)))
        return cls.get(key)

    # ========== 实时行情缓存 ==========

    @classmethod
    def cache_realtime_quote(cls, code: str, quote: dict) -> bool:
        """
        缓存实时行情
        :param code: 股票代码
        :param quote: 行情数据
        """
        key = cls._make_key("quote", code)
        return cls.set(key, quote, cls.TTL["realtime_quote"])

    @classmethod
    def get_realtime_quote(cls, code: str) -> Optional[dict]:
        """
        获取缓存的实时行情
        """
        key = cls._make_key("quote", code)
        return cls.get(key)

    # ========== 批量分析缓存 ==========

    @classmethod
    def cache_batch_analysis(cls, codes: List[str], timeframe: str, results: List[dict]) -> bool:
        """
        缓存批量分析结果
        :param codes: 股票代码列表
        :param timeframe: 时间周期
        :param results: 分析结果列表
        """
        key = cls._make_key("batch", timeframe, ",".join(sorted(codes)))
        return cls.set(key, results, cls.TTL["batch_analysis"])

    @classmethod
    def get_batch_analysis(cls, codes: List[str], timeframe: str) -> Optional[List[dict]]:
        """
        获取缓存的批量分析结果
        """
        key = cls._make_key("batch", timeframe, ",".join(sorted(codes)))
        return cls.get(key)

    # ========== 清除缓存 ==========

    @classmethod
    def clear_stock_cache(cls, code: str) -> bool:
        """
        清除某股票的所有缓存
        :param code: 股票代码
        """
        try:
            client = get_redis()
            if not client:
                return False
            # 使用模式匹配删除所有相关键
            pattern = cls._make_key("*", code, "*")
            keys = client.keys(pattern)
            if keys:
                client.delete(*keys)
            return True
        except Exception as e:
            logger.warning(f"清除缓存失败: {e}")
            return False

    @classmethod
    def clear_all_cache(cls) -> bool:
        """
        清除所有缓存
        """
        try:
            client = get_redis()
            if not client:
                return False
            pattern = cls._make_key("*")
            keys = client.keys(pattern)
            if keys:
                client.delete(*keys)
            return True
        except Exception as e:
            logger.warning(f"清除所有缓存失败: {e}")
            return False


# 导出便捷函数
def get_cached_stock_data(code: str, timeframe: str) -> Optional[List[dict]]:
    """获取缓存的股票数据（便捷函数）"""
    return RedisService.get_stock_data(code, timeframe)


def cache_stock_data(code: str, timeframe: str, data: List[dict]) -> bool:
    """缓存股票数据（便捷函数）"""
    return RedisService.cache_stock_data(code, timeframe, data)


def get_cached_analysis(code: str, timeframe: str) -> Optional[dict]:
    """获取缓存的分析结果（便捷函数）"""
    return RedisService.get_analysis(code, timeframe)


def cache_analysis(code: str, timeframe: str, analysis: dict) -> bool:
    """缓存分析结果（便捷函数）"""
    return RedisService.cache_analysis(code, timeframe, analysis)


def get_cached_multi_timeframe(code: str, timeframes: List[str]) -> Optional[dict]:
    """获取缓存的多周期分析结果（便捷函数）"""
    return RedisService.get_multi_timeframe(code, timeframes)


def cache_multi_timeframe(code: str, timeframes: List[str], analysis: dict) -> bool:
    """缓存多周期分析结果（便捷函数）"""
    return RedisService.cache_multi_timeframe(code, timeframes, analysis)
