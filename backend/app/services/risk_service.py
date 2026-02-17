"""
风险监控服务
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime
from loguru import logger

from app.services.config_service import ConfigService
from app.models.database import UserPosition, Stock


class RiskMonitorService:
    """风险监控服务"""

    def __init__(self, db: Session):
        self.db = db
        self.config_service = ConfigService(db)

    def check_position_risk(self, position: UserPosition) -> Optional[dict]:
        """
        检查持仓风险

        Args:
            position: 持仓对象

        Returns:
            风险警报信息或None
        """
        config = self.config_service.get_risk_config()

        # 检查是否启用
        if not config.enabled:
            return None

        # 更新持仓信息
        self._update_position_metrics(position)

        # 检查风险等级
        risk_level = self._determine_risk_level(position, config)

        if risk_level == "NONE":
            return None

        # 构建警报信息
        alert = {
            "risk_level": risk_level,
            "loss_ratio": position.profit_rate / 100 if position.profit_rate else 0,
            "position_ratio": position.position_ratio,
            "message": self._get_risk_message(risk_level, position),
            "suggestion": self._get_risk_suggestion(risk_level, config)
        }

        logger.warning(f"持仓风险警报: {position.stock.code} - {alert['message']}")
        return alert

    def check_all_positions(self) -> List[dict]:
        """
        检查所有持仓风险

        Returns:
            风险警报列表
        """
        positions = self.db.query(UserPosition).all()
        alerts = []

        for position in positions:
            alert = self.check_position_risk(position)
            if alert:
                alerts.append({
                    "stock_code": position.stock.code,
                    **alert
                })

        return alerts

    def _update_position_metrics(self, position: UserPosition):
        """
        更新持仓指标

        Args:
            position: 持仓对象
        """
        # 计算盈亏
        if position.current_price and position.cost_price:
            position.profit = (position.current_price - position.cost_price) * position.quantity
            position.profit_rate = (position.current_price - position.cost_price) / position.cost_price * 100

        # 计算市值
        if position.current_price and position.quantity:
            position.market_value = position.current_price * position.quantity

        position.updated_at = datetime.now()
        self.db.commit()

    def _determine_risk_level(self, position: UserPosition, config) -> str:
        """
        确定风险等级

        Args:
            position: 持仓对象
            config: 风险配置

        Returns:
            风险等级: CRITICAL/WARNING/INFO/NONE
        """
        profit_rate = position.profit_rate or 0

        # 检查严重风险（超过最大亏损）
        if profit_rate < -config.max_loss_ratio * 100:
            return "CRITICAL"

        # 检查警告风险（超过预警亏损）
        elif profit_rate < -config.warning_loss_ratio * 100:
            return "WARNING"

        # 检查持仓比例风险
        elif position.position_ratio and position.position_ratio > config.max_position_ratio * 100:
            return "WARNING"

        # 小幅亏损提醒
        elif profit_rate < -config.warning_loss_ratio * 50:
            return "INFO"

        return "NONE"

    def _get_risk_message(self, risk_level: str, position: UserPosition) -> str:
        """
        生成风险消息

        Args:
            risk_level: 风险等级
            position: 持仓对象

        Returns:
            风险消息
        """
        messages = {
            "CRITICAL": f"严重风险！持仓亏损达到{abs(position.profit_rate):.2f}%，超过止损线",
            "WARNING": f"风险预警！持仓亏损{abs(position.profit_rate):.2f}%，请注意风险",
            "INFO": f"提示：持仓小幅亏损{abs(position.profit_rate):.2f}%，请密切关注"
        }
        return messages.get(risk_level, "")

    def _get_risk_suggestion(self, risk_level: str, config) -> str:
        """
        获取风险建议

        Args:
            risk_level: 风险等级
            config: 风险配置

        Returns:
            建议操作
        """
        if risk_level == "CRITICAL":
            return "立即减仓或止损"
        elif risk_level == "WARNING":
            return "考虑减仓，设置止损"
        elif risk_level == "INFO":
            return "密切关注，做好止损准备"
        return ""

    def get_position_summary(self) -> dict:
        """
        获取持仓风险汇总

        Returns:
            持仓汇总信息
        """
        positions = self.db.query(UserPosition).all()

        if not positions:
            return {
                "total_positions": 0,
                "total_market_value": 0,
                "total_profit": 0,
                "total_profit_rate": 0,
                "risk_distribution": {}
            }

        total_value = sum(p.market_value or 0 for p in positions)
        total_profit = sum(p.profit or 0 for p in positions)
        avg_profit_rate = sum(p.profit_rate or 0 for p in positions) / len(positions)

        # 风险分布
        risk_counts = {"CRITICAL": 0, "WARNING": 0, "INFO": 0, "NONE": 0}
        for position in positions:
            risk_level = self._determine_risk_level(position, self.config_service.get_risk_config())
            risk_counts[risk_level] += 1

        return {
            "total_positions": len(positions),
            "total_market_value": total_value,
            "total_profit": total_profit,
            "total_profit_rate": avg_profit_rate,
            "risk_distribution": risk_counts
        }
