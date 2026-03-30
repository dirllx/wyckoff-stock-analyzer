"""
模拟Redis服务（内存版本）
当Redis未安装时，使用Python字典模拟缓存功能
"""
import time
import json
from typing import Optional, Any, List
from loguru import logger

# 内存缓存存储
_cache_store = {}
_cache_expiry = {}


class MockRedis:
    """模拟Redis客户端，使用内存存储"""

    @staticmethod
    def get(key: str) -> Optional[str]:
        """获取缓存"""
        if key in _cache_store:
            # 检查是否过期
            if key in _cache_expiry:
                if time.time() > _cache_expiry[key]:
                    # 已过期，删除
                    del _cache_store[key]
                    del _cache_expiry[key]
                    return None
            return _cache_store[key]
        return None

    @staticmethod
    def setex(key: str, ttl: int, value: str) -> bool:
        """设置缓存（带过期时间）- Redis标准方法"""
        try:
            _cache_store[key] = value
            _cache_expiry[key] = time.time() + ttl
            return True
        except Exception as e:
            logger.error(f"MockRedis setex失败: {e}")
            return False

    @staticmethod
    def set(key: str, value: str, ex: Optional[int] = None) -> bool:
        """设置缓存"""
        try:
            _cache_store[key] = value
            if ex:
                _cache_expiry[key] = time.time() + ex
            return True
        except Exception as e:
            logger.error(f"MockRedis set失败: {e}")
            return False

    @staticmethod
    def delete(*keys: str) -> int:
        """删除缓存（支持多个key）"""
        count = 0
        for key in keys:
            if key in _cache_store:
                del _cache_store[key]
                count += 1
            if key in _cache_expiry:
                del _cache_expiry[key]
        return count

    @staticmethod
    def delete_pattern(pattern: str) -> int:
        """根据模式删除缓存"""
        import fnmatch
        count = 0
        keys_to_delete = []

        for key in _cache_store.keys():
            if fnmatch.fnmatch(key, pattern):
                keys_to_delete.append(key)

        for key in keys_to_delete:
            del _cache_store[key]
            if key in _cache_expiry:
                del _cache_expiry[key]
            count += 1

        return count

    @staticmethod
    def ping() -> bool:
        """检查连接"""
        return True

    @staticmethod
    def dbsize() -> int:
        """获取key数量"""
        return len(_cache_store)

    @staticmethod
    def flushdb() -> bool:
        """清空数据库"""
        _cache_store.clear()
        _cache_expiry.clear()
        return True

    @staticmethod
    def exists(key: str) -> int:
        """检查key是否存在"""
        return 1 if key in _cache_store else 0

    @staticmethod
    def keys(pattern: str = "*") -> List[str]:
        """获取所有匹配的key"""
        import fnmatch
        if pattern == "*":
            return list(_cache_store.keys())
        return [key for key in _cache_store.keys() if fnmatch.fnmatch(key, pattern)]


def get_mock_redis_client():
    """获取模拟Redis客户端"""
    logger.info("✅ 使用模拟Redis（内存缓存）")
    return MockRedis()
