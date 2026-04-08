"""
配置管理API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.config_service import ConfigService
from app.models.config import PatternConfig, TimeframeConfig, FeishuConfig, RiskMonitorConfig

router = APIRouter(prefix="/config", tags=["配置管理"])


@router.get("")
def get_all_configs(db: Session = Depends(get_db)):
    """获取所有配置"""
    config_service = ConfigService(db)
    return config_service.get_all_configs()


@router.get("/patterns")
def get_patterns(db: Session = Depends(get_db)):
    """获取所有形态配置"""
    config_service = ConfigService(db)
    patterns = config_service.get_all_patterns()
    return {
        "total": len(patterns),
        "items": patterns
    }


@router.put("/patterns/{pattern_type}")
def update_pattern(
    pattern_type: str,
    enabled: bool = None,
    accuracy_mode: str = None,
    min_confidence: float = None,
    parameters: dict = None,
    db: Session = Depends(get_db)
):
    """更新形态配置"""
    config_service = ConfigService(db)
    try:
        pattern = config_service.update_pattern_config(
            pattern_type=pattern_type,
            enabled=enabled,
            accuracy_mode=accuracy_mode,
            min_confidence=min_confidence,
            parameters=parameters
        )
        return {"message": f"形态 {pattern_type} 配置已更新", "pattern": pattern}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/timeframes")
def get_timeframes(db: Session = Depends(get_db)):
    """获取所有周期配置"""
    config_service = ConfigService(db)
    timeframes = config_service.get_all_timeframes()
    return {
        "total": len(timeframes),
        "items": timeframes
    }


@router.put("/timeframes/{timeframe}")
def update_timeframe(
    timeframe: str,
    enabled: bool = None,
    data_retention_days: int = None,
    db: Session = Depends(get_db)
):
    """更新周期配置"""
    config_service = ConfigService(db)
    try:
        tf = config_service.update_timeframe_config(
            timeframe=timeframe,
            enabled=enabled,
            data_retention_days=data_retention_days
        )
        return {"message": f"周期 {timeframe} 配置已更新", "timeframe": tf}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/feishu")
def get_feishu_config(db: Session = Depends(get_db)):
    """获取飞书配置"""
    config_service = ConfigService(db)
    return config_service.get_feishu_config()


@router.put("/feishu")
def update_feishu_config(
    webhook_url: str = None,
    enabled: bool = None,
    trigger_on_signal: bool = None,
    trigger_on_risk: bool = None,
    min_signal_score: int = None,
    template_type: str = None,
    custom_template: str = None,
    rate_limit_minutes: int = None,
    db: Session = Depends(get_db)
):
    """更新飞书配置"""
    config_service = ConfigService(db)
    config = config_service.update_feishu_config(
        webhook_url=webhook_url,
        enabled=enabled,
        trigger_on_signal=trigger_on_signal,
        trigger_on_risk=trigger_on_risk,
        min_signal_score=min_signal_score,
        template_type=template_type,
        custom_template=custom_template,
        rate_limit_minutes=rate_limit_minutes
    )
    return {"message": "飞书配置已更新", "config": config}


@router.get("/risk")
def get_risk_config(db: Session = Depends(get_db)):
    """获取风险监控配置"""
    config_service = ConfigService(db)
    return config_service.get_risk_config()


@router.put("/risk")
def update_risk_config(
    max_loss_ratio: float = None,
    max_position_ratio: float = None,
    warning_loss_ratio: float = None,
    stop_loss_enabled: bool = None,
    enabled: bool = None,
    db: Session = Depends(get_db)
):
    """更新风险监控配置"""
    config_service = ConfigService(db)
    config = config_service.update_risk_config(
        max_loss_ratio=max_loss_ratio,
        max_position_ratio=max_position_ratio,
        warning_loss_ratio=warning_loss_ratio,
        stop_loss_enabled=stop_loss_enabled,
        enabled=enabled
    )
    return {"message": "风险监控配置已更新", "config": config}
