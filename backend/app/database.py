"""
数据库连接配置
支持SQLite和PostgreSQL
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from redis import Redis
from typing import Generator
import os
import sys
from dotenv import load_dotenv

from app.config import settings

# 设置Python编码为UTF-8
if sys.platform == 'win32':
    import locale
    try:
        locale.setlocale(locale.LC_ALL, 'en_US.UTF-8')
    except:
        try:
            locale.setlocale(locale.LC_ALL, 'C.UTF-8')
        except:
            pass

# 加载环境变量
load_dotenv()

# 数据库配置 - 支持PostgreSQL和SQLite
DATABASE_URL = None
DB_TYPE = "unknown"

# 优先使用环境变量中的DATABASE_URL
env_db_url = os.getenv("DATABASE_URL", "")
if env_db_url:
    # 转换为pg8000驱动（避免psycopg2编码问题）
    if env_db_url.startswith("postgresql://"):
        DATABASE_URL = env_db_url.replace("postgresql://", "postgresql+pg8000://", 1)
        DB_TYPE = "postgresql"
    elif env_db_url.startswith("sqlite"):
        DATABASE_URL = env_db_url
        DB_TYPE = "sqlite"
    else:
        DATABASE_URL = env_db_url
        DB_TYPE = "unknown"

# 如果没有环境变量，使用默认PostgreSQL配置
if not DATABASE_URL:
    POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB = os.getenv("POSTGRES_DB", "wyckoff_db")

    if POSTGRES_PASSWORD:
        DATABASE_URL = f"postgresql+pg8000://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
        DB_TYPE = "postgresql"
    else:
        # 回退到SQLite
        DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../wyckoff.db"))
        DATABASE_URL = f"sqlite:///{DB_PATH}"
        DB_TYPE = "sqlite"
        print(f"⚠️ 未配置PostgreSQL密码，使用SQLite: {DB_PATH}")

print(f"Database Type: {DB_TYPE}")
connection_info = DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL
print(f"Connection: {connection_info}")

REDIS_URL = settings.REDIS_URL

# 创建数据库引擎 - 支持PostgreSQL失败时自动回退到SQLite
engine = None
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
        echo=False,
    )
else:
    # 尝试PostgreSQL连接，失败则回退到SQLite
    try:
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            echo=False,
            connect_args={"timeout": 10}
        )
        # 测试连接
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"PostgreSQL connection successful")
    except Exception as e:
        print(f"PostgreSQL connection failed: {type(e).__name__}")
        print(f"Falling back to SQLite...")
        DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../wyckoff.db"))
        DATABASE_URL = f"sqlite:///{DB_PATH}"
        engine = create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
            echo=False,
        )
        DB_TYPE = "sqlite"
        print(f"Using SQLite: {DB_PATH}")

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
        result = db.execute(text("SELECT 1"))
        db.close()
        return True
    except Exception as e:
        # 安全地输出错误信息，避免编码问题
        try:
            error_msg = str(e)
        except:
            error_msg = "Unknown error"
        print(f"数据库连接失败: {error_msg}")
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
