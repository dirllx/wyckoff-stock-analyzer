"""
清除关注列表中的重复股票

确保同一只股票不会同时存在于自选股和浏览股中。
策略：保留自选股，删除浏览股中的重复项。

用法：
    python3 cleanup_duplicate_watchlist.py         # 交互式确认
    python3 cleanup_duplicate_watchlist.py --yes   # 自动清理（无需确认）
"""
import sys
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine, text
from app.config import settings


def cleanup_duplicate_watchlist():
    """清除关注列表中的重复股票"""
    engine = create_engine(settings.DATABASE_URL)

    with engine.connect() as conn:
        print("=" * 60)
        print("开始检查关注列表中的重复股票...")
        print("=" * 60)

        # 查询同时存在于自选股和浏览股的股票
        query = text("""
            SELECT
                f.stock_code,
                f.stock_name,
                f.id as favorite_id,
                b.id as browse_id
            FROM user_stock_watch f
            INNER JOIN user_stock_watch b
                ON f.stock_code = b.stock_code
                AND f.stock_id = b.stock_id
            WHERE f.watch_type = 'favorite'
            AND b.watch_type = 'browse'
            ORDER BY f.stock_code
        """)

        result = conn.execute(query)
        duplicates = result.fetchall()

        if not duplicates:
            print("\n✅ 没有发现重复股票！")
            return

        print(f"\n⚠️  发现 {len(duplicates)} 只重复股票：")
        print("-" * 60)

        for i, (stock_code, stock_name, favorite_id, browse_id) in enumerate(duplicates, 1):
            print(f"{i}. {stock_code} - {stock_name or '(无名称)'}")
            print(f"   自选股ID: {favorite_id}, 浏览股ID: {browse_id}")

        print("\n" + "=" * 60)

        # 检查命令行参数
        auto_confirm = "--yes" in sys.argv or "-y" in sys.argv

        if not auto_confirm:
            try:
                confirm = input("\n是否删除浏览股中的重复项？(yes/no): ").strip().lower()
            except EOFError:
                # 非交互模式，默认自动清理
                confirm = "yes"
        else:
            confirm = "yes"
            print("\n自动清理模式：开始删除浏览股中的重复项...")

        if confirm not in ['yes', 'y']:
            print("❌ 已取消清理")
            return

        # 删除浏览股中的重复项
        print("\n开始清理...")
        deleted_count = 0

        for stock_code, stock_name, favorite_id, browse_id in duplicates:
            delete_query = text("""
                DELETE FROM user_stock_watch
                WHERE id = :browse_id
                AND watch_type = 'browse'
            """)

            result = conn.execute(delete_query, {"browse_id": browse_id})

            if result.rowcount > 0:
                deleted_count += 1
                print(f"✅ 已删除浏览股中的 {stock_code}")

        # 提交事务
        conn.commit()

        print("\n" + "=" * 60)
        print(f"✅ 清理完成！共删除 {deleted_count} 条重复记录")
        print("=" * 60)

        # 验证清理结果
        verify_query = text("""
            SELECT COUNT(*) as count
            FROM user_stock_watch f
            INNER JOIN user_stock_watch b
                ON f.stock_code = b.stock_code
                AND f.stock_id = b.stock_id
            WHERE f.watch_type = 'favorite'
            AND b.watch_type = 'browse'
        """)

        verify_result = conn.execute(verify_query).fetchone()
        remaining_duplicates = verify_result.count if verify_result else 0

        if remaining_duplicates == 0:
            print("✅ 验证通过：没有剩余的重复股票")
        else:
            print(f"⚠️  警告：仍有 {remaining_duplicates} 条重复记录")


if __name__ == "__main__":
    try:
        cleanup_duplicate_watchlist()
    except Exception as e:
        print(f"\n❌ 清理失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
