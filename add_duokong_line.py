#!/usr/bin/env python3
"""
数据库迁移脚本：添加多空线字段
"""
import sqlite3
import sys
from pathlib import Path

# 数据库路径
DB_PATH = Path(__file__).parent / "wyckoff.db"

def migrate():
    """执行数据库迁移"""
    print(f"📦 开始迁移数据库: {DB_PATH}")

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # 1. 检查字段是否已存在
        cursor.execute("PRAGMA table_info(stock_quotes)")
        columns = [col[1] for col in cursor.fetchall()]

        if 'duokong_line' in columns:
            print("✅ duokong_line 字段已存在，无需迁移")
            return True

        # 2. 添加 duokong_line 字段
        print("➕ 添加 duokong_line 字段...")
        cursor.execute("""
            ALTER TABLE stock_quotes
            ADD COLUMN duokong_line FLOAT
        """)

        conn.commit()
        print("✅ duokong_line 字段添加成功")

        # 3. 验证字段是否添加成功
        cursor.execute("PRAGMA table_info(stock_quotes)")
        columns = [col[1] for col in cursor.fetchall()]

        if 'duokong_line' in columns:
            print("✅ 验证成功：duokong_line 字段已存在")
            print("\n📋 当前表结构:")
            for col in cursor.fetchall():
                print(f"  - {col[1]}: {col[2]}")
            return True
        else:
            print("❌ 验证失败：字段未成功添加")
            return False

    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    success = migrate()
    sys.exit(0 if success else 1)
