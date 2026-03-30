#!/usr/bin/env python3
"""
初始化时间周期配置
"""
import sys
import os

# 添加后端路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.models.config import TimeframeConfig

# 创建数据库连接
DATABASE_URL = "sqlite:////Users/dirllx/Claude Code/wyckoff-stock-analyzer/wyckoff.db"
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def init_timeframe_configs():
    """初始化时间周期配置"""
    print("=== 初始化时间周期配置 ===")

    # 定义时间周期配置
    timeframes = [
        {
            "timeframe": "daily",
            "timeframe_name": "日线",
            "enabled": True,
            "data_retention_days": 365,
            "update_frequency": "daily",
            "priority": 1
        },
        {
            "timeframe": "weekly",
            "timeframe_name": "周线",
            "enabled": True,
            "data_retention_days": 365,
            "update_frequency": "weekly",
            "priority": 2
        },
        {
            "timeframe": "monthly",
            "timeframe_name": "月线",
            "enabled": True,
            "data_retention_days": 365,
            "update_frequency": "monthly",
            "priority": 3
        },
        {
            "timeframe": "30",
            "timeframe_name": "30分钟",
            "enabled": True,
            "data_retention_days": 30,
            "update_frequency": "hourly",
            "priority": 4
        },
        {
            "timeframe": "60",
            "timeframe_name": "60分钟",
            "enabled": True,
            "data_retention_days": 30,
            "update_frequency": "hourly",
            "priority": 5
        }
    ]

    # 清空现有配置
    db.query(TimeframeConfig).delete()
    db.commit()
    print("已清空现有配置")

    # 插入新配置
    for tf_data in timeframes:
        config = TimeframeConfig(**tf_data)
        db.add(config)
        print(f"添加配置: {tf_data['timeframe_name']} ({tf_data['timeframe']})")

    db.commit()
    print("\n✓ 时间周期配置初始化完成")

    # 验证
    all_configs = db.query(TimeframeConfig).all()
    print(f"\n当前配置数量: {len(all_configs)}")
    for config in all_configs:
        status = "启用" if config.enabled else "禁用"
        print(f"  - {config.timeframe_name} ({config.timeframe}): {status}")

    db.close()

if __name__ == "__main__":
    init_timeframe_configs()
