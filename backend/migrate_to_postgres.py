#!/usr/bin/env python3
"""
SQLite到PostgreSQL数据迁移脚本

使用方法:
1. 确保PostgreSQL数据库已创建
2. 配置环境变量
3. 运行: python migrate_to_postgres.py
"""
import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import pandas as pd
from loguru import logger

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models.database import Base
from app.models.watchlist import UserStockWatch

# 加载环境变量
load_dotenv()


class SQLiteToPostgresMigrator:
    """SQLite到PostgreSQL迁移器"""

    def __init__(self):
        # SQLite连接
        self.sqlite_db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../wyckoff.db"))
        self.sqlite_url = f"sqlite:///{self.sqlite_db_path}"

        # PostgreSQL连接
        POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
        POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
        POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
        POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
        POSTGRES_DB = os.getenv("POSTGRES_DB", "wyckoff_db")

        if not POSTGRES_PASSWORD:
            raise ValueError("请设置POSTGRES_PASSWORD环境变量")

        self.postgres_url = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

        # 创建引擎
        self.sqlite_engine = create_engine(self.sqlite_url)
        self.postgres_engine = create_engine(self.postgres_url)

        logger.info(f"SQLite数据库: {self.sqlite_db_path}")
        logger.info(f"PostgreSQL数据库: {self.postgres_url}")

    def export_sqlite_data(self):
        """从SQLite导出数据"""
        logger.info("开始从SQLite导出数据...")

        data = {}

        # 导出关注列表
        try:
            df_watchlist = pd.read_sql_table('user_stock_watch', self.sqlite_engine)
            data['watchlist'] = df_watchlist
            logger.info(f"导出关注列表: {len(df_watchlist)} 条记录")
        except Exception as e:
            logger.warning(f"导出关注列表失败: {e}")

        # 导出股票数据
        try:
            df_stocks = pd.read_sql_table('stocks', self.sqlite_engine)
            data['stocks'] = df_stocks
            logger.info(f"导出股票数据: {len(df_stocks)} 条记录")
        except Exception as e:
            logger.warning(f"导出股票数据失败: {e}")

        # 导出K线数据
        try:
            df_quotes = pd.read_sql_table('stock_quotes', self.sqlite_engine)
            data['quotes'] = df_quotes
            logger.info(f"导出K线数据: {len(df_quotes)} 条记录")
        except Exception as e:
            logger.warning(f"导出K线数据失败: {e}")

        # 导出配置数据
        try:
            df_configs = pd.read_sql_table('system_config', self.sqlite_engine)
            data['configs'] = df_configs
            logger.info(f"导出配置数据: {len(df_configs)} 条记录")
        except Exception as e:
            logger.warning(f"导出配置数据失败: {e}")

        return data

    def import_to_postgres(self, data):
        """导入数据到PostgreSQL"""
        logger.info("开始导入数据到PostgreSQL...")

        # 创建表结构
        logger.info("创建PostgreSQL表结构...")
        Base.metadata.create_all(bind=self.postgres_engine)

        # 导入关注列表
        if 'watchlist' in data and not data['watchlist'].empty:
            try:
                data['watchlist'].to_sql(
                    'user_stock_watch',
                    self.postgres_engine,
                    if_exists='append',
                    index=False
                )
                logger.info(f"导入关注列表: {len(data['watchlist'])} 条记录")
            except Exception as e:
                logger.error(f"导入关注列表失败: {e}")

        # 导入股票数据
        if 'stocks' in data and not data['stocks'].empty:
            try:
                data['stocks'].to_sql(
                    'stocks',
                    self.postgres_engine,
                    if_exists='append',
                    index=False
                )
                logger.info(f"导入股票数据: {len(data['stocks'])} 条记录")
            except Exception as e:
                logger.error(f"导入股票数据失败: {e}")

        # 导入K线数据
        if 'quotes' in data and not data['quotes'].empty:
            try:
                data['quotes'].to_sql(
                    'stock_quotes',
                    self.postgres_engine,
                    if_exists='append',
                    index=False,
                    chunksize=1000  # 分块导入
                )
                logger.info(f"导入K线数据: {len(data['quotes'])} 条记录")
            except Exception as e:
                logger.error(f"导入K线数据失败: {e}")

        # 导入配置数据
        if 'configs' in data and not data['configs'].empty:
            try:
                data['configs'].to_sql(
                    'system_config',
                    self.postgres_engine,
                    if_exists='append',
                    index=False
                )
                logger.info(f"导入配置数据: {len(data['configs'])} 条记录")
            except Exception as e:
                logger.error(f"导入配置数据失败: {e}")

    def verify_migration(self):
        """验证迁移结果"""
        logger.info("验证迁移结果...")

        # 检查SQLite记录数
        with self.sqlite_engine.connect() as conn:
            sqlite_counts = {}
            for table in ['user_stock_watch', 'stocks', 'stock_quotes', 'system_config']:
                try:
                    result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = result.scalar()
                    sqlite_counts[table] = count
                    logger.info(f"SQLite {table}: {count} 条记录")
                except Exception as e:
                    logger.warning(f"SQLite表 {table} 不存在或查询失败: {e}")

        # 检查PostgreSQL记录数
        with self.postgres_engine.connect() as conn:
            postgres_counts = {}
            for table in ['user_stock_watch', 'stocks', 'stock_quotes', 'system_config']:
                try:
                    result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = result.scalar()
                    postgres_counts[table] = count
                    logger.info(f"PostgreSQL {table}: {count} 条记录")
                except Exception as e:
                    logger.warning(f"PostgreSQL表 {table} 不存在或查询失败: {e}")

        # 对比记录数
        logger.info("\n迁移结果对比:")
        for table in sqlite_counts:
            sqlite_count = sqlite_counts.get(table, 0)
            postgres_count = postgres_counts.get(table, 0)
            match = "✅" if sqlite_count == postgres_count else "❌"
            logger.info(f"{match} {table}: SQLite={sqlite_count}, PostgreSQL={postgres_count}")

    def migrate(self):
        """执行完整迁移"""
        try:
            logger.info("=" * 50)
            logger.info("开始SQLite到PostgreSQL数据迁移")
            logger.info("=" * 50)

            # 1. 导出数据
            data = self.export_sqlite_data()

            # 2. 导入数据
            self.import_to_postgres(data)

            # 3. 验证结果
            self.verify_migration()

            logger.info("=" * 50)
            logger.info("✅ 数据迁移完成！")
            logger.info("=" * 50)

        except Exception as e:
            logger.error(f"迁移失败: {e}")
            raise


def main():
    """主函数"""
    print("""
╔════════════════════════════════════════════════════════╗
║     SQLite → PostgreSQL 数据迁移工具                 ║
╚════════════════════════════════════════════════════════╝
    """)

    # 检查环境变量
    if not os.getenv("POSTGRES_PASSWORD"):
        print("❌ 请设置POSTGRES_PASSWORD环境变量")
        print("\n在.env文件中添加:")
        print("POSTGRES_HOST=localhost")
        print("POSTGRES_PORT=5432")
        print("POSTGRES_USER=postgres")
        print("POSTGRES_PASSWORD=your_password")
        print("POSTGRES_DB=wyckoff_db")
        sys.exit(1)

    # 执行迁移
    migrator = SQLiteToPostgresMigrator()

    response = input("\n是否开始迁移? (yes/no): ")
    if response.lower() in ['yes', 'y']:
        migrator.migrate()
    else:
        print("已取消迁移")


if __name__ == "__main__":
    main()
