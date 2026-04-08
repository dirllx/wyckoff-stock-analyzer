"""
风险监控API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.risk_service import RiskMonitorService
from app.models.database import UserPosition

router = APIRouter(tags=["风险监控"])


@router.post("/positions/{position_id}/risk-check")
def check_position_risk(
    position_id: int,
    db: Session = Depends(get_db)
):
    """
    检查持仓风险

    Args:
        position_id: 持仓ID
    """
    position = db.query(UserPosition).filter(UserPosition.id == position_id).first()

    if not position:
        raise HTTPException(status_code=404, detail="持仓不存在")

    risk_service = RiskMonitorService(db)
    alert = risk_service.check_position_risk(position)

    return {
        "position_id": position_id,
        "stock_code": position.stock.code if position.stock else None,
        "risk_level": alert["risk_level"] if alert else "NONE",
        "loss_ratio": alert["loss_ratio"] if alert else 0,
        "position_ratio": position.position_ratio,
        "profit": position.profit,
        "profit_rate": position.profit_rate,
        "alert": alert
    }


@router.get("/positions/risk-check-all")
def check_all_positions_risk(db: Session = Depends(get_db)):
    """
    检查所有持仓风险
    """
    risk_service = RiskMonitorService(db)
    alerts = risk_service.check_all_positions()

    return {
        "total_alerts": len(alerts),
        "alerts": alerts
    }


@router.get("/positions/summary")
def get_positions_summary(db: Session = Depends(get_db)):
    """
    获取持仓风险汇总
    """
    risk_service = RiskMonitorService(db)
    summary = risk_service.get_position_summary()

    return summary


@router.get("/positions")
def list_positions(db: Session = Depends(get_db)):
    """
    列出所有持仓
    """
    positions = db.query(UserPosition).all()

    return {
        "total": len(positions),
        "items": [
            {
                "id": p.id,
                "stock_code": p.stock.code if p.stock else None,
                "quantity": p.quantity,
                "cost_price": p.cost_price,
                "current_price": p.current_price,
                "market_value": p.market_value,
                "profit": p.profit,
                "profit_rate": p.profit_rate,
                "position_ratio": p.position_ratio,
                "risk_level": p.risk_level
            }
            for p in positions
        ]
    }
