"""
数据库迁移：添加watch_type字段到user_stock_watch表
"""
import sqlite3

def migrate():
    db_path = "stocks.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # 检查字段是否已存在
        cursor.execute("PRAGMA table_info(user_stock_watch)")
        columns = [col[1] for col in cursor.fetchall()]

        if 'watch_type' in columns:
            print("✅ watch_type字段已存在，无需迁移")
            return

        # 添加字段
        print("正在添加watch_type字段...")
        cursor.execute("""
            ALTER TABLE user_stock_watch
            ADD COLUMN watch_type VARCHAR(20) DEFAULT 'browse' NOT NULL
        """)

        # 更新现有记录为浏览股
        cursor.execute("""
            UPDATE user_stock_watch
            SET watch_type = 'browse'
            WHERE watch_type IS NULL
        """)

        conn.commit()
        print("✅ 迁移完成！已添加watch_type字段")

        # 验证
        cursor.execute("SELECT COUNT(*) FROM user_stock_watch")
        total = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM user_stock_watch WHERE watch_type = 'browse'")
        browse = cursor.fetchone()[0]
        print(f"📊 统计: 总计{total}条记录，{browse}条浏览股")

    except Exception as e:
        conn.rollback()
        print(f"❌ 迁移失败: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
