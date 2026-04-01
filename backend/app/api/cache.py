"""
缓存管理API
"""
from fastapi import APIRouter, HTTPException
from loguru import logger

from app.services.redis_service import RedisService
from app.config import settings
from app.database import get_redis

router = APIRouter(tags=["缓存管理"])


@router.get(
    "/cache/stats",
    summary="获取缓存统计信息",
    description="""
    获取Redis缓存的统计信息，包括：
    - 当前缓存版本
    - 缓存键总数
    - 各版本缓存数量
    - 缓存类型分布

    ## 返回内容

    - **cache_version**: 当前缓存版本号
    - **total_keys**: 缓存键总数
    - **version_stats**: 各版本缓存统计
    - **type_stats**: 缓存类型统计
    """
)
def get_cache_stats():
    try:
        client = get_redis()
        if not client:
            raise HTTPException(status_code=503, detail="Redis服务不可用")

        # 获取所有威科夫相关的缓存键
        pattern = f"{RedisService.KEY_PREFIX}*"
        all_keys = client.keys(pattern)

        # 统计各版本缓存数量
        version_stats = {}
        current_version = getattr(settings, 'CACHE_VERSION', 'v1')

        for key in all_keys:
            # 提取版本号（格式：wyckoff:version:...）
            parts = key.split(':')
            if len(parts) >= 2:
                version = parts[1]
                version_stats[version] = version_stats.get(version, 0) + 1

        # 统计缓存类型
        type_stats = {
            "stock": 0,
            "analysis": 0,
            "multi": 0,
            "quote": 0,
            "batch": 0,
            "other": 0
        }

        for key in all_keys:
            if ':stock:' in key:
                type_stats["stock"] += 1
            elif ':analysis:' in key:
                type_stats["analysis"] += 1
            elif ':multi:' in key:
                type_stats["multi"] += 1
            elif ':quote:' in key:
                type_stats["quote"] += 1
            elif ':batch:' in key:
                type_stats["batch"] += 1
            else:
                type_stats["other"] += 1

        # 计算旧版本缓存数量
        old_version_keys = sum(count for version, count in version_stats.items() if version != current_version)

        return {
            "cache_version": current_version,
            "total_keys": len(all_keys),
            "current_version_keys": len(all_keys) - old_version_keys,
            "old_version_keys": old_version_keys,
            "version_stats": version_stats,
            "type_stats": type_stats,
            "redis_available": True
        }

    except Exception as e:
        logger.error(f"获取缓存统计失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取缓存统计失败: {str(e)}")


@router.post(
    "/cache/clear-old",
    summary="清除旧版本缓存",
    description="""
    清除所有非当前版本的缓存数据。

    ## 功能说明

    - 保留当前版本的缓存
    - 删除所有旧版本的缓存键
    - 自动清理，无需手动筛选

    ## 返回内容

    - **success**: 是否成功
    - **message**: 结果消息
    - **cleared_count**: 清除的缓存键数量
    - **current_version**: 当前缓存版本

    ## 示例

    ```bash
    POST /api/v1/cache/clear-old
    ```

    ## 响应示例

    ```json
    {
      "success": true,
      "message": "已清除5个旧版本缓存键",
      "cleared_count": 5,
      "current_version": "v2"
    }
    ```
    """
)
def clear_old_cache():
    try:
        result = RedisService.clear_old_version_cache()

        if result:
            # 获取清除的详细统计
            client = get_redis()
            if client:
                pattern = f"{RedisService.KEY_PREFIX}*"
                all_keys = client.keys(pattern)
                current_version = getattr(settings, 'CACHE_VERSION', 'v1')

                # 统计当前版本之外的键
                old_keys = [k for k in all_keys if not k.startswith(f"{RedisService.KEY_PREFIX}{current_version}:")]

                return {
                    "success": True,
                    "message": f"已清除{len(old_keys)}个旧版本缓存键",
                    "cleared_count": len(old_keys),
                    "current_version": current_version,
                    "redis_available": True
                }

        return {
            "success": result,
            "message": "清除操作完成" if result else "清除操作失败",
            "cleared_count": 0,
            "current_version": getattr(settings, 'CACHE_VERSION', 'v1'),
            "redis_available": True
        }

    except Exception as e:
        logger.error(f"清除旧版本缓存失败: {e}")
        raise HTTPException(status_code=500, detail=f"清除失败: {str(e)}")


@router.post(
    "/cache/clear-all",
    summary="清除所有缓存",
    description="""
    清除所有威科夫系统的缓存数据。

    ## 警告

    ⚠️ 此操作会清除所有缓存，包括当前版本的缓存。
    清除后首次访问会重新计算，响应时间会变长。

    ## 建议使用场景

    - 数据结构重大变更后
    - 发现缓存数据异常
    - 需要强制刷新所有数据

    ## 返回内容

    - **success**: 是否成功
    - **message**: 结果消息
    - **cleared_count**: 清除的缓存键数量
    """
)
def clear_all_cache():
    try:
        # 先获取清除前的数量
        client = get_redis()
        before_count = 0
        if client:
            pattern = f"{RedisService.KEY_PREFIX}*"
            before_count = len(client.keys(pattern))

        result = RedisService.clear_all_cache()

        return {
            "success": result,
            "message": f"已清除所有{before_count}个缓存键",
            "cleared_count": before_count,
            "redis_available": True
        }

    except Exception as e:
        logger.error(f"清除所有缓存失败: {e}")
        raise HTTPException(status_code=500, detail=f"清除失败: {str(e)}")
