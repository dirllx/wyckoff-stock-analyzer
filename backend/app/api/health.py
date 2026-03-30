"""
健康检查API
"""
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import os
import psutil

from app.database import get_db, test_db_connection, test_redis_connection
from app.models.schemas import HealthResponse

router = APIRouter()


def get_service_status():
    """获取各服务的详细状态"""
    services = {
        "backend": {
            "status": "running",
            "pid": os.getpid(),
            "memory_mb": round(psutil.Process().memory_info().rss / 1024 / 1024, 2),
            "cpu_percent": round(psutil.Process().cpu_percent(), 2)
        },
        "database": {
            "status": "connected" if test_db_connection() else "disconnected",
            "type": "sqlite"
        },
        "redis": {
            "status": "connected" if test_redis_connection() else "disconnected",
            "url": "redis://localhost:6379/0",
            "cache_enabled": test_redis_connection()
        }
    }

    # 检查前端服务（通过检查端口）
    try:
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        frontend_status = "running" if sock.connect_ex(('0.0.0.0', 3000)) == 0 else "stopped"
        sock.close()
        services["frontend"] = {
            "status": frontend_status,
            "port": 3000
        }
    except Exception:
        services["frontend"] = {
            "status": "unknown",
            "port": 3000
        }

    return services


@router.get("/health", response_model=HealthResponse)
async def health_check(db: Session = Depends(get_db)):
    """
    健康检查接口
    检查数据库和Redis连接状态，并提供详细的服务状态信息
    """
    # 测试数据库连接
    db_status = "connected" if test_db_connection() else "disconnected"

    # 测试Redis连接
    redis_status = "connected" if test_redis_connection() else "disconnected"

    # 获取详细服务状态
    services = get_service_status()

    # 计算总体健康状态（Redis是可选的，只要数据库连接就健康）
    overall_status = "healthy" if db_status == "connected" else "unhealthy"

    return HealthResponse(
        status=overall_status,
        timestamp=datetime.now(),
        database=db_status,
        redis=redis_status,
        services=services,
        version="1.0.0"
    )
