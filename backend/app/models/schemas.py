"""
Pydantic模型 - API请求和响应
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ============== 请求模型 ==============

class StockAnalysisRequest(BaseModel):
    """股票分析请求"""
    code: str = Field(..., description="股票代码", example="688234")
    timeframe: Optional[str] = Field("daily", description="时间周期", example="daily")


class SignalVerifyRequest(BaseModel):
    """信号验证请求"""
    signal_id: int = Field(..., description="信号ID")
    current_price: float = Field(..., description="当前价格")
    verified: str = Field(..., description="验证状态", example="CONFIRMED")


# ============== 响应模型 ==============

class StockQuoteResponse(BaseModel):
    """股票行情响应"""
    date: datetime
    timeframe: str
    open: Optional[float]
    high: Optional[float]
    low: Optional[float]
    close: Optional[float]
    volume: Optional[float]
    amount: Optional[float]
    ma5: Optional[float]
    ma10: Optional[float]
    ma15: Optional[float]
    ma20: Optional[float]
    ma30: Optional[float]
    ma60: Optional[float]
    ma90: Optional[float]
    ma120: Optional[float]
    ma250: Optional[float]
    volume_ma5: Optional[float]
    obv: Optional[float]

    class Config:
        from_attributes = True


class StockResponse(BaseModel):
    """股票信息响应"""
    id: int
    code: str
    name: Optional[str]
    market: Optional[str]
    industry: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WyckoffSignalResponse(BaseModel):
    """威科夫信号响应"""
    id: int
    stock_id: int
    date: datetime
    timeframe: Optional[str]
    signal_type: Optional[str]
    direction: Optional[str]
    score: Optional[int]
    confidence: Optional[float]
    strength: Optional[str]
    trigger_price: Optional[float]
    suggestion: Optional[str]
    reason: Optional[str]
    stop_loss: Optional[float]
    take_profit: Optional[float]
    verified: Optional[str]
    verify_date: Optional[datetime]
    profit: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


class StockAnalysisResponse(BaseModel):
    """股票分析完整响应"""
    stock: StockResponse
    current_quote: Optional[StockQuoteResponse]
    signals: List[WyckoffSignalResponse]
    analysis_summary: dict


class HealthResponse(BaseModel):
    """健康检查响应"""
    status: str
    timestamp: datetime
    database: str
    redis: str
    services: Optional[dict] = None  # 各服务状态详情
    version: Optional[str] = None  # 系统版本


# ============== 通用响应 ==============

class MessageResponse(BaseModel):
    """通用消息响应"""
    message: str
    data: Optional[dict] = None
