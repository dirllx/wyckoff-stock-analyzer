"""
数据源配置管理API
提供数据源测速、优先级配置、统计查询等功能
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from loguru import logger

from app.services.data.source_scheduler import get_scheduler

# 创建路由器，供main.py导入
data_sources_router = APIRouter()


class SpeedTestRequest(BaseModel):
    """测速请求"""
    code: str = "000001"  # 测试用股票代码
    timeframes: List[str] = ["daily", "weekly", "monthly"]  # 测试周期


class PriorityUpdateRequest(BaseModel):
    """优先级更新请求"""
    timeframe: str  # 周期
    priority_list: List[str]  # 数据源优先级列表


class ConfigUpdateRequest(BaseModel):
    """配置更新请求"""
    source_name: str  # 数据源名称
    enabled: Optional[bool] = None  # 是否启用
    priority: Optional[int] = None  # 优先级
    timeout: Optional[int] = None  # 超时时间


@data_sources_router.post(
    "/data-sources/speed-test",
    summary="数据源测速",
    description="""
    测试所有数据源的响应速度

    ## 测试内容

    - 对所有启用的数据源进行速度测试
    - 每个数据源测试指定周期的响应时间
    - 自动记录测速结果

    ## 测试周期

    - daily: 日线数据
    - weekly: 周线数据
    - monthly: 月线数据

    ## 返回结果

    ```json
    {
      "daily": {
        "akshare": 850,
        "baostock": 420
      },
      "weekly": {
        "akshare": 1200,
        "baostock": 450
      }
    }
    ```

    ## 说明

    - 响应时间单位：毫秒
    - -1 表示测试失败
    - 测试会真实调用数据源API
    """
)
async def run_speed_test(request: SpeedTestRequest):
    """运行数据源测速"""
    try:
        scheduler = get_scheduler()

        logger.info(f"开始测速: {request.code}, 周期: {request.timeframes}")

        results = await scheduler.speed_test(
            code=request.code,
            timeframes=request.timeframes
        )

        return {
            "success": True,
            "message": "测速完成",
            "results": results,
            "test_time": scheduler.speed_test_cache
        }

    except Exception as e:
        logger.error(f"测速失败: {e}")
        raise HTTPException(status_code=500, detail=f"测速失败: {str(e)}")


@data_sources_router.get(
    "/data-sources/stats",
    response_model=Dict[str, dict],
    summary="获取数据源统计",
    description="""
    获取所有数据源的统计信息

    ## 统计指标

    - **total_requests**: 总请求数
    - **successful_requests**: 成功请求数
    - **failed_requests**: 失败请求数
    - **success_rate**: 成功率
    - **avg_response_time_ms**: 平均响应时间
    - **last_success_time**: 最后成功时间
    - **last_failure_time**: 最后失败时间
    - **is_available**: 是否可用（成功率>50%）

    ## 示例响应

    ```json
    {
      "akshare": {
        "total_requests": 150,
        "successful_requests": 120,
        "failed_requests": 30,
        "success_rate": "80.00%",
        "avg_response_time_ms": 850.5,
        "is_available": true
      }
    }
    ```
    """
)
async def get_data_source_stats():
    """获取数据源统计信息"""
    try:
        scheduler = get_scheduler()
        return scheduler.get_stats()
    except Exception as e:
        logger.error(f"获取统计信息失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取失败: {str(e)}")


@data_sources_router.get(
    "/data-sources/config",
    summary="获取数据源配置",
    description="""
    获取当前数据源配置

    ## 配置内容

    - 全局配置
    - 数据源启用状态
    - 优先级配置
    - 超时设置
    - 支持的周期
    """
)
async def get_data_source_config():
    """获取数据源配置"""
    try:
        scheduler = get_scheduler()
        return scheduler.get_config()
    except Exception as e:
        logger.error(f"获取配置失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取失败: {str(e)}")


@data_sources_router.post(
    "/data-sources/priority",
    summary="更新数据源优先级",
    description="""
    手动更新指定周期的数据源优先级

    ## 参数说明

    - **timeframe**: 时间周期 (daily/weekly/monthly/30/60等)
    - **priority_list**: 数据源名称列表，按优先级排序

    ## 示例

    ```json
    {
      "timeframe": "weekly",
      "priority_list": ["baostock", "akshare"]
    }
    ```

    ## 说明

    - 列表中前面的数据源优先级更高
    - 禁用的数据源会被自动过滤
    - 不支持该周期的数据源会被忽略
    """
)
async def update_priority(request: PriorityUpdateRequest):
    """更新数据源优先级"""
    try:
        scheduler = get_scheduler()

        # 验证数据源名称
        valid_sources = {"akshare", "baostock", "easyquotation"}
        for source in request.priority_list:
            if source not in valid_sources:
                raise HTTPException(
                    status_code=400,
                    detail=f"无效的数据源名称: {source}，支持: {valid_sources}"
                )

        scheduler.update_priority(request.timeframe, request.priority_list)

        return {
            "success": True,
            "message": f"已更新 {request.timeframe} 的优先级",
            "timeframe": request.timeframe,
            "priority_list": request.priority_list
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新优先级失败: {e}")
        raise HTTPException(status_code=500, detail=f"更新失败: {str(e)}")


@data_sources_router.post(
    "/data-sources/config",
    summary="更新数据源配置",
    description="""
    更新数据源配置（启用/禁用、优先级、超时等）

    ## 参数说明

    - **source_name**: 数据源名称 (akshare/baostock/easyquotation)
    - **enabled**: 是否启用
    - **priority**: 优先级（数字越小优先级越高）
    - **timeout**: 超时时间（秒）

    ## 示例

    ```json
    {
      "source_name": "baostock",
      "enabled": true,
      "priority": 1,
      "timeout": 20
    }
    ```
    """
)
async def update_source_config(request: ConfigUpdateRequest):
    """更新数据源配置"""
    try:
        scheduler = get_scheduler()
        config = scheduler.get_config()

        source_config = config["sources"].get(request.source_name)
        if not source_config:
            raise HTTPException(
                status_code=404,
                detail=f"数据源不存在: {request.source_name}"
            )

        # 更新配置
        if request.enabled is not None:
            source_config["enabled"] = request.enabled
        if request.priority is not None:
            source_config["priority"] = request.priority
        if request.timeout is not None:
            source_config["timeout"] = request.timeout

        # 保存配置
        scheduler.save_config()

        return {
            "success": True,
            "message": f"已更新 {request.source_name} 的配置",
            "source": request.source_name,
            "config": source_config
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新配置失败: {e}")
        raise HTTPException(status_code=500, detail=f"更新失败: {str(e)}")


@data_sources_router.post(
    "/data-sources/reload",
    summary="重新加载配置",
    description="""
    从配置文件重新加载数据源配置

    ## 使用场景

    - 修改了配置文件后需要立即生效
    - 不需要重启服务
    """
)
async def reload_config():
    """重新加载配置"""
    try:
        scheduler = get_scheduler()
        scheduler.reload_config()

        return {
            "success": True,
            "message": "配置已重新加载"
        }

    except Exception as e:
        logger.error(f"重新加载配置失败: {e}")
        raise HTTPException(status_code=500, detail=f"重新加载失败: {str(e)}")


@data_sources_router.get(
    "/data-sources/priority/{timeframe}",
    summary="获取周期优先级",
    description="""
    获取指定周期的数据源优先级列表

    ## 参数

    - **timeframe**: 时间周期

    ## 返回

    数据源名称列表，按优先级排序
    """
)
async def get_priority(timeframe: str):
    """获取周期优先级"""
    try:
        scheduler = get_scheduler()
        priority_list = scheduler.get_priority_list(timeframe)

        return {
            "timeframe": timeframe,
            "priority_list": priority_list
        }

    except Exception as e:
        logger.error(f"获取优先级失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取失败: {str(e)}")


@data_sources_router.get(
    "/data-sources/health",
    summary="数据源健康检查",
    description="""
    检查所有数据源的健康状态

    ## 检查内容

    - 是否可用
    - 成功率
    - 最后成功时间
    - 平均响应时间

    ## 返回

    ```json
    {
      "healthy": true,
      "sources": {
        "akshare": {
          "available": true,
          "success_rate": "85.5%",
          "last_success": "2026-03-31T10:30:00"
        }
      }
    }
    ```
    """
)
async def health_check():
    """健康检查"""
    try:
        scheduler = get_scheduler()
        stats = scheduler.get_stats()

        # 检查是否至少有一个数据源可用
        has_healthy = any(
            stat.get("is_available", False)
            for stat in stats.values()
        )

        return {
            "healthy": has_healthy,
            "sources": stats
        }

    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        return {
            "healthy": False,
            "error": str(e)
        }
