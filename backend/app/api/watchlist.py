"""
用户关注列表API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from loguru import logger

from app.database import get_db
from app.models.schemas import MessageResponse
from app.models.watchlist_schemas import (
    WatchlistAddRequest,
    WatchlistResponse,
    WatchlistItemResponse,
    MessageResponse as WatchlistMessageResponse
)
from app.services.watchlist_service import WatchlistService

router = APIRouter(prefix="/api/v1/watchlist", tags=["关注列表"])


@router.get("", response_model=WatchlistResponse)
def get_watchlist(db: Session = Depends(get_db), limit: int = 100):
    """
    获取关注列表

    Args:
        db: 数据库会话
        limit: 返回数量限制（默认100）

    Returns:
        关注列表
    """
    try:
        service = WatchlistService(db)
        watchlist = service.get_watchlist(limit)

        return WatchlistResponse(
            total=len(watchlist),
            items=[
                WatchlistItemResponse(
                    id=item.id,
                    stock_code=item.stock_code,
                    stock_name=item.stock_name,
                    priority=item.priority,
                    created_at=item.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    updated_at=item.updated_at.strftime("%Y-%m-%d %H:%M:%S")
                )
                for item in watchlist
            ]
        )
    except Exception as e:
        logger.error(f"获取关注列表失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取失败: {str(e)}")


@router.post("", response_model=MessageResponse)
def add_to_watchlist(
    request: WatchlistAddRequest,
    db: Session = Depends(get_db)
):
    """
    添加股票到关注列表

    Args:
        request: 添加请求（股票代码）

    Returns:
        消息响应
    """
    try:
        service = WatchlistService(db)
        service.add_to_watchlist(request.code)

        return MessageResponse(
            message=f"股票{request.code}已添加到关注列表",
            data={"code": request.code}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"添加股票失败: {e}")
        raise HTTPException(status_code=500, detail=f"添加失败: {str(e)}")


@router.delete("/{code}", response_model=MessageResponse)
def remove_from_watchlist(code: str, db: Session = Depends(get_db)):
    """
    从关注列表删除股票

    Args:
        code: 股票代码
        db: 数据库会话

    Returns:
        消息响应
    """
    try:
        service = WatchlistService(db)
        success = service.remove_from_watchlist(code)

        if success:
            return MessageResponse(
                message=f"股票{code}已从关注列表删除"
            )
        else:
            raise HTTPException(status_code=404, detail=f"股票{code}未找到")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除股票失败: {e}")
        raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")


@router.get("/update")
def update_watchlist_info(db: Session = Depends(get_db)):
    """
    批量更新关注列表的股票信息（名称）

    Args:
        db: 数据库会话

    Returns:
        更新结果
    """
    try:
        service = WatchlistService(db)
        updated_count = service.update_stock_info()

        return MessageResponse(
            message=f"批量更新股票信息完成，更新{updated_count}只"
        )
    except Exception as e:
        logger.error(f"批量更新股票信息失败: {e}")
        raise HTTPException(status_code=500, detail=f"更新失败: {str(e)}")


@router.get("/check/{code}")
def check_in_watchlist(code: str, db: Session = Depends(get_db)):
    """
    检查股票是否在关注列表

    Args:
        code: 股票代码
        db: 数据库会话

    Returns:
        是否在关注列表
    """
    try:
        service = WatchlistService(db)
        in_watchlist = service.is_in_watchlist(code)

        return {
            "code": code,
            "in_watchlist": in_watchlist
        }
    except Exception as e:
        logger.error(f"检查关注列表失败: {e}")
        raise HTTPException(status_code=500, detail=f"检查失败: {str(e)}")


@router.post("/move")
def move_watchlist_item(
    request: WatchlistAddRequest,
    direction: int = -1,
    db: Session = Depends(get_db)
):
    """
    调整关注列表中股票的顺序

    Args:
        request: 包含股票代码的请求
        direction: 移动方向 (-1上移, 1下移)
        db: 数据库会话

    Returns:
        消息响应
    """
    try:
        service = WatchlistService(db)
        success = service.move_item(request.code, direction)

        if success:
            action = "上移" if direction == -1 else "下移"
            return MessageResponse(
                message=f"股票{request.code}已{action}"
            )
        else:
            raise HTTPException(status_code=400, detail="无法调整顺序")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"调整顺序失败: {e}")
        raise HTTPException(status_code=500, detail=f"调整失败: {str(e)}")
