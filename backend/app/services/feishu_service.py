"""
飞书通知服务
"""
import httpx
from typing import Optional, Dict, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from loguru import logger

from app.services.config_service import ConfigService


class FeishuNotificationService:
    """飞书通知服务"""

    def __init__(self, db: Session):
        self.db = db
        self.config_service = ConfigService(db)

    async def send_signal_notification(
        self,
        stock_code: str,
        signal_type: str,
        direction: str,
        score: int,
        reason: str
    ) -> bool:
        """
        发送信号通知

        Args:
            stock_code: 股票代码
            signal_type: 信号类型
            direction: 方向
            score: 评分
            reason: 原因

        Returns:
            是否发送成功
        """
        config = self.config_service.get_feishu_config()

        # 检查是否启用
        if not config.enabled or not config.trigger_on_signal:
            return False

        # 检查信号评分
        if score < config.min_signal_score:
            logger.info(f"信号评分{score}低于最小值{config.min_signal_score}，不发送通知")
            return False

        # 检查频率限制
        if not self._check_rate_limit(config):
            return False

        # 构建消息
        message = self._render_signal_message(
            stock_code=stock_code,
            signal_type=signal_type,
            direction=direction,
            score=score,
            reason=reason
        )

        # 发送通知
        return await self._send_webhook(config.webhook_url, message)

    async def send_risk_notification(
        self,
        stock_code: str,
        risk_level: str,
        loss_ratio: float,
        message: str
    ) -> bool:
        """
        发送风险预警通知

        Args:
            stock_code: 股票代码
            risk_level: 风险等级
            loss_ratio: 亏损比例
            message: 预警消息

        Returns:
            是否发送成功
        """
        config = self.config_service.get_feishu_config()

        # 检查是否启用
        if not config.enabled or not config.trigger_on_risk:
            return False

        # 构建消息
        notification_message = self._render_risk_message(
            stock_code=stock_code,
            risk_level=risk_level,
            loss_ratio=loss_ratio,
            message=message
        )

        # 发送通知
        return await self._send_webhook(config.webhook_url, notification_message)

    async def send_test_message(self, message: str) -> bool:
        """
        发送测试消息

        Args:
            message: 测试消息

        Returns:
            是否发送成功
        """
        config = self.config_service.get_feishu_config()

        if not config.webhook_url:
            return False

        notification_message = {
            "msg_type": "text",
            "content": {
                "text": f"【测试消息】\n{message}"
            }
        }

        return await self._send_webhook(config.webhook_url, notification_message)

    def _check_rate_limit(self, config) -> bool:
        """
        检查频率限制

        Args:
            config: 飞书配置

        Returns:
            是否允许发送
        """
        if config.last_sent_at:
            elapsed = datetime.now() - config.last_sent_at
            if elapsed < timedelta(minutes=config.rate_limit_minutes):
                logger.info(f"距离上次发送仅{elapsed.seconds}秒，未达到限制{config.rate_limit_minutes * 60}秒")
                return False

        # 更新最后发送时间
        config.last_sent_at = datetime.now()
        self.db.commit()
        return True

    def _render_signal_message(
        self,
        stock_code: str,
        signal_type: str,
        direction: str,
        score: int,
        reason: str
    ) -> Dict:
        """渲染信号通知消息"""
        # 方向图标
        direction_icon = {
            "LONG": "📈",
            "SHORT": "📉",
            "NEUTRAL": "➡️"
        }.get(direction, "")

        # 消息内容
        content = f"""{direction_icon} 威科夫信号提醒

股票代码：{stock_code}
信号类型：{signal_type}
方向：{direction}
评分：{score}/10
原因：{reason}

时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"""

        return {
            "msg_type": "text",
            "content": {
                "text": content
            }
        }

    def _render_risk_message(
        self,
        stock_code: str,
        risk_level: str,
        loss_ratio: float,
        message: str
    ) -> Dict:
        """渲染风险预警消息"""
        # 风险等级图标
        level_icons = {
            "CRITICAL": "🚨",
            "WARNING": "⚠️",
            "INFO": "ℹ️"
        }
        icon = level_icons.get(risk_level, "")

        content = f"""{icon} 风险预警

股票代码：{stock_code}
风险等级：{risk_level}
亏损比例：{loss_ratio:.2%}
预警信息：{message}

时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"""

        return {
            "msg_type": "text",
            "content": {
                "text": content
            }
        }

    async def _send_webhook(self, webhook_url: str, message: Dict) -> bool:
        """
        发送Webhook请求

        Args:
            webhook_url: Webhook URL
            message: 消息内容

        Returns:
            是否发送成功
        """
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(webhook_url, json=message)

                if response.status_code == 200:
                    logger.info("飞书通知发送成功")
                    return True
                else:
                    logger.error(f"飞书通知发送失败: {response.status_code} - {response.text}")
                    return False

        except Exception as e:
            logger.error(f"飞书通知发送异常: {e}")
            return False
