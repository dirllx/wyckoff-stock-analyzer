"""
关注列表相关的Pydantic模型
"""
from pydantic import BaseModel, Field
from typing import Optional


class WatchlistAddRequest(BaseModel):
    """添加股票到关注列表"""
    code: str = Field(..., description="股票代码", example="000001")


class WatchlistItemResponse(BaseModel):
    """关注列表项响应"""
    id: int
    stock_code: str
    stock_name: Optional[str]
    priority: int
    created_at: str
    updated_at: str


class WatchlistResponse(BaseModel):
    """关注列表响应"""
    total: int
    items: list[WatchlistItemResponse]


class MessageResponse(BaseModel):
    """通用消息响应"""
    message: str
    data: Optional[dict] = None
