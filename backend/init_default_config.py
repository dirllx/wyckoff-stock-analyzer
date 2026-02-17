"""
初始化默认配置
"""
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models.config import (
    SystemConfig, PatternConfig, TimeframeConfig,
    FeishuConfig, RiskMonitorConfig
)


def init_default_configs():
    """初始化默认配置"""
    db = SessionLocal()

    try:
        # 1. 系统配置
        default_system_configs = [
            {
                "config_type": "analysis",
                "config_name": "分析配置",
                "config_value": {
                    "default_timeframe": "daily",
                    "max_history_days": 90
                }
            },
            {
                "config_type": "data_retention",
                "config_name": "数据保留配置",
                "config_value": {
                    "hot_data_days": 90,
                    "archive_after_days": 90
                }
            }
        ]

        for config in default_system_configs:
            existing = db.query(SystemConfig).filter(
                SystemConfig.config_type == config["config_type"]
            ).first()
            if not existing:
                db_config = SystemConfig(**config)
                db.add(db_config)

        # 2. 形态配置
        default_patterns = [
            {
                "pattern_type": "spring",
                "pattern_name": "弹簧",
                "enabled": True,
                "accuracy_mode": "strict",
                "parameters": {
                    "support_deviation": 0.02,
                    "volume_increase": 1.5,
                    "recovery_days": 3
                },
                "min_confidence": 0.6,
                "description": "价格短暂跌破支撑位后快速反弹"
            },
            {
                "pattern_type": "breakout",
                "pattern_name": "突破",
                "enabled": True,
                "accuracy_mode": "strict",
                "parameters": {
                    "resistance_deviation": 0.02,
                    "volume_increase": 2.0,
                    "consolidation_days": 5
                },
                "min_confidence": 0.7,
                "description": "价格突破关键阻力位并放量"
            },
            {
                "pattern_type": "shakeout",
                "pattern_name": "洗盘",
                "enabled": False,
                "accuracy_mode": "strict",
                "parameters": {
                    "volume_ratio": 2.0,
                    "price_drop": 0.03
                },
                "min_confidence": 0.6,
                "description": "大量卖出后价格回升，制造恐慌"
            },
            {
                "pattern_type": "test",
                "pattern_name": "测试",
                "enabled": False,
                "accuracy_mode": "loose",
                "parameters": {
                    "revisit_days": 5
                },
                "min_confidence": 0.5,
                "description": "价格重新测试支撑/阻力位"
            }
        ]

        for pattern in default_patterns:
            existing = db.query(PatternConfig).filter(
                PatternConfig.pattern_type == pattern["pattern_type"]
            ).first()
            if not existing:
                db_pattern = PatternConfig(**pattern)
                db.add(db_pattern)

        # 3. 时间周期配置
        default_timeframes = [
            {
                "timeframe": "daily",
                "timeframe_name": "日线",
                "enabled": True,
                "data_retention_days": 90,
                "update_frequency": "daily",
                "priority": 1
            },
            {
                "timeframe": "weekly",
                "timeframe_name": "周线",
                "enabled": True,
                "data_retention_days": 180,
                "update_frequency": "weekly",
                "priority": 2
            },
            {
                "timeframe": "60min",
                "timeframe_name": "60分钟",
                "enabled": False,
                "data_retention_days": 30,
                "update_frequency": "hourly",
                "priority": 3
            },
            {
                "timeframe": "monthly",
                "timeframe_name": "月线",
                "enabled": False,
                "data_retention_days": 365,
                "update_frequency": "monthly",
                "priority": 4
            }
        ]

        for tf in default_timeframes:
            existing = db.query(TimeframeConfig).filter(
                TimeframeConfig.timeframe == tf["timeframe"]
            ).first()
            if not existing:
                db_tf = TimeframeConfig(**tf)
                db.add(db_tf)

        # 4. 飞书配置
        feishu_config = db.query(FeishuConfig).first()
        if not feishu_config:
            feishu_config = FeishuConfig(
                enabled=False,
                trigger_on_signal=True,
                trigger_on_risk=True,
                min_signal_score=5,
                template_type="simple",
                rate_limit_minutes=30
            )
            db.add(feishu_config)

        # 5. 风险监控配置
        risk_config = db.query(RiskMonitorConfig).first()
        if not risk_config:
            risk_config = RiskMonitorConfig(
                config_name="默认风险配置",
                max_loss_ratio=0.10,
                max_position_ratio=0.30,
                warning_loss_ratio=0.05,
                stop_loss_enabled=False,
                enabled=True,
                alert_levels={
                    "CRITICAL": {"loss_ratio": 0.10, "color": "red"},
                    "WARNING": {"loss_ratio": 0.05, "color": "yellow"},
                    "INFO": {"loss_ratio": 0.02, "color": "blue"}
                },
                description="默认风险管理配置"
            )
            db.add(risk_config)

        db.commit()
        print("✅ 默认配置初始化成功！")

        # 打印配置摘要
        print("\n配置摘要：")
        print(f"  - 系统配置: {db.query(SystemConfig).count()} 个")
        print(f"  - 形态配置: {db.query(PatternConfig).count()} 个 (启用: {db.query(PatternConfig).filter(PatternConfig.enabled==True).count()})")
        print(f"  - 周期配置: {db.query(TimeframeConfig).count()} 个 (启用: {db.query(TimeframeConfig).filter(TimeframeConfig.enabled==True).count()})")
        print(f"  - 飞书配置: {'已启用' if feishu_config.enabled else '未启用'}")
        print(f"  - 风险配置: {'已启用' if risk_config.enabled else '未启用'}")

    except Exception as e:
        print(f"❌ 初始化配置失败: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    # 先创建表
    from app.database import init_db
    init_db()

    # 初始化默认配置
    init_default_configs()
