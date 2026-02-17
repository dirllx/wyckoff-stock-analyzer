"""
健康检查API
"""
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db, test_db_connection, test_redis_connection
from app.models.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check(db: Session = Depends(get_db)):
    """
    健康检查接口
    检查数据库和Redis连接状态
    """
    # 测试数据库连接
    db_status = "connected" if test_db_connection() else "disconnected"

    # 测试Redis连接
    redis_status = "connected" if test_redis_connection() else "disconnected"

    return HealthResponse(
        status="healthy" if db_status == "connected" and redis_status == "connected" else "degraded",
        timestamp=datetime.now(),
        database=db_status,
        redis=redis_status
    )
