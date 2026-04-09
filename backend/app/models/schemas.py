"""
Pydantic模型 - API请求和响应
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, validator
import re


# ============== 请求模型 ==============

class StockAnalysisRequest(BaseModel):
    """股票分析请求"""
    code: str = Field(..., description="股票代码", example="688234")
    timeframe: Optional[str] = Field("daily", description="时间周期", example="daily")
    end_date: Optional[str] = Field(None, description="分析截止日期 (YYYYMMDD格式)，不填则使用最新数据")

    @validator('code')
    def validate_code(cls, v):
        """验证股票代码格式（支持5位B股或6位A股代码）"""
        if not re.match(r'^\d{5,6}$', v):
            raise ValueError(f'股票代码格式错误: {v}, 应为5-6位数字')
        return v

    @validator('timeframe')
    def validate_timeframe(cls, v):
        """验证时间周期"""
        valid_timeframes = ['daily', 'weekly', 'monthly', '1', '5', '15', '30', '60']
        if v and v not in valid_timeframes:
            raise ValueError(f'无效的时间周期: {v}, 支持的周期: {", ".join(valid_timeframes)}')
        return v

    @validator('end_date')
    def validate_end_date(cls, v):
        """验证日期格式"""
        if v:
            try:
                # 支持YYYY-MM-DD或YYYYMMDD格式
                if '-' in v:
                    datetime.strptime(v, "%Y-%m-%d")
                else:
                    datetime.strptime(v, "%Y%m%d")
            except ValueError:
                raise ValueError(f'日期格式错误: {v}, 应为 YYYY-MM-DD 或 YYYYMMDD')
        return v


class BulkQuotesRequest(BaseModel):
    """批量获取行情请求"""
    codes: List[str] = Field(..., min_items=1, max_items=50, description="股票代码列表")
    timeframe: str = Field("daily", description="时间周期")
    limit: int = Field(5, ge=1, le=100, description="返回数量限制")

    @validator('codes')
    def validate_codes(cls, v):
        """验证股票代码列表"""
        if not v:
            raise ValueError('股票代码列表不能为空')
        if len(v) > 50:
            raise ValueError('最多支持50只股票')
        # 验证每个代码格式（支持5位B股或6位A股代码）
        pattern = re.compile(r'^\d{5,6}$')
        invalid_codes = [c for c in v if not pattern.match(c)]
        if invalid_codes:
            raise ValueError(f'无效的股票代码: {", ".join(invalid_codes)}')
        return v

    @validator('timeframe')
    def validate_timeframe(cls, v):
        """验证时间周期"""
        valid_timeframes = ['daily', 'weekly', 'monthly', '1', '5', '15', '30', '60']
        if v not in valid_timeframes:
            raise ValueError(f'无效的时间周期: {v}, 支持的周期: {", ".join(valid_timeframes)}')
        return v


class SignalVerifyRequest(BaseModel):
    """信号验证请求"""
    signal_id: int = Field(..., description="信号ID")
    current_price: float = Field(..., description="当前价格", gt=0)
    verified: str = Field(..., description="验证状态", example="CONFIRMED")

    @validator('verified')
    def validate_verified(cls, v):
        """验证状态"""
        valid_statuses = ['CONFIRMED', 'FAILED', 'PENDING']
        if v not in valid_statuses:
            raise ValueError(f'无效的验证状态: {v}, 支持的状态: {", ".join(valid_statuses)}')
        return v


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
    duokong_line: Optional[float] = None  # 多空线
    volume_ma5: Optional[float]
    obv: Optional[float]
    prev_close: Optional[float] = None  # 前收盘价
    change_percent: Optional[float] = None  # 涨跌幅(%)

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
    from_cache: Optional[bool] = False  # 是否来自缓存


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
