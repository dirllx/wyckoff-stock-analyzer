"""
将backend/wyckoff.db的配置数据迁移到主数据库
"""
import sqlite3
from datetime import datetime

# 数据库路径
source_db = "/root/.openclaw/workspace/wyckoff-stock-analyzer/backend/wyckoff.db"
target_db = "/root/.openclaw/workspace/wyckoff-stock-analyzer/wyckoff.db"

# 配置表
config_tables = [
    "system_config",
    "pattern_config",
    "timeframe_config",
    "feishu_config",
    "risk_monitor_config",
    "pattern_history"
]

def migrate_table(conn_source, conn_target, table_name):
    """迁移单个表的数据"""
    try:
        # 读取源数据
        cursor_source = conn_source.cursor()
        cursor_source.execute(f"SELECT * FROM {table_name}")
        rows = cursor_source.fetchall()

        if not rows:
            print(f"  表 {table_name}: 无数据")
            return

        # 获取列名
        columns = [desc[0] for desc in cursor_source.description]
        placeholders = ",".join(["?"] * len(columns))
        columns_str = ",".join(columns)

        # 清空目标表（如果存在）
        cursor_target = conn_target.cursor()
        try:
            cursor_target.execute(f"DELETE FROM {table_name}")
            print(f"  表 {table_name}: 清空 {cursor_target.rowcount} 行")
        except:
            pass

        # 插入数据
        cursor_target.executemany(
            f"INSERT INTO {table_name} ({columns_str}) VALUES ({placeholders})",
            rows
        )
        print(f"  表 {table_name}: 插入 {len(rows)} 行")

        conn_target.commit()

    except Exception as e:
        print(f"  表 {table_name}: 迁移失败 - {e}")

# 主迁移流程
print("开始迁移配置数据...\n")

conn_source = sqlite3.connect(source_db)
conn_target = sqlite3.connect(target_db)

for table in config_tables:
    print(f"迁移表: {table}")
    migrate_table(conn_source, conn_target, table)
    print()

conn_source.close()
conn_target.close()

print("迁移完成！")
