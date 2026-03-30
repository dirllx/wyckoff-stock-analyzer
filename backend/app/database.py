"""
数据库连接配置
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from redis import Redis
from typing import Generator
import os
from dotenv import load_dotenv

from app.config import settings

# 加载环境变量
load_dotenv()

# 数据库配置 - 优先使用SQLite
if not os.getenv("DATABASE_URL"):
    # 使用项目根目录下的数据库（绝对路径）
    DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../wyckoff.db"))
    DATABASE_URL = f"sqlite:///{DB_PATH}"
else:
    # 直接使用环境变量（避免Settings缓存问题）
    DATABASE_URL = os.getenv("DATABASE_URL")

REDIS_URL = settings.REDIS_URL

# 创建数据库引擎
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # 检查连接有效性
    pool_size=5,        # 连接池大小
    max_overflow=10,    # 最大溢出连接
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Redis连接（延迟初始化，支持可选）
redis_client = None

def get_redis():
    """
    获取Redis客户端（延迟初始化）
    如果Redis不可用，使用模拟Redis（内存缓存）
    """
    global redis_client
    if redis_client is None:
        try:
            redis_client = Redis.from_url(
                REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=2,  # 连接超时2秒
                socket_timeout=2,           # 读写超时2秒
                retry_on_timeout=True      # 超时自动重试
            )
            # 测试连接
            redis_client.ping()
            print("✅ Redis连接成功")
        except Exception as e:
            print(f"⚠️ Redis连接失败，使用模拟Redis（内存缓存）: {e}")
            # 使用模拟Redis
            from app.services.mock_redis import get_mock_redis_client
            redis_client = get_mock_redis_client()
    return redis_client


def get_db() -> Generator[Session, None, None]:
    """
    获取数据库会话
    用于FastAPI依赖注入
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    初始化数据库表
    """
    from app.models.database import Base
    from app.models.config import (
        SystemConfig, PatternConfig, TimeframeConfig,
        FeishuConfig, RiskMonitorConfig, PatternHistory
    )
    Base.metadata.create_all(bind=engine)


def test_db_connection() -> bool:
    """
    测试数据库连接
    """
    try:
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return True
    except Exception as e:
        print(f"数据库连接失败: {e}")
        return False


def test_redis_connection() -> bool:
    """
    测试Redis连接
    """
    try:
        client = get_redis()
        if client:
            client.ping()
            return True
        return False
    except Exception as e:
        print(f"Redis连接失败: {e}")
        return False
