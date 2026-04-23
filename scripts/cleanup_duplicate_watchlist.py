#!/usr/bin/env python3
"""
清理自选股和浏览股中重复的股票
如果一只股票同时存在于自选股和浏览股，从自选股中删除
"""

import requests
import sys

API_BASE = "http://localhost:8000/api/v1"


def get_watchlist(watch_type=None):
    """获取关注列表"""
    params = {}
    if watch_type:
        params['watch_type'] = watch_type

    response = requests.get(f"{API_BASE}/watchlist", params=params)
    response.raise_for_status()
    return response.json()


def remove_from_watchlist(code):
    """从关注列表中删除股票"""
    response = requests.delete(f"{API_BASE}/watchlist/{code}")
    response.raise_for_status()
    return response.json()


def main():
    print("=" * 50)
    print("清理自选股和浏览股中重复的股票")
    print("=" * 50)

    # 获取自选股和浏览股
    print("\n1. 获取关注列表...")
    try:
        favorite_data = get_watchlist('favorite')
        browse_data = get_watchlist('browse')
    except requests.RequestException as e:
        print(f"❌ 获取关注列表失败: {e}")
        sys.exit(1)

    favorite_items = favorite_data.get('items', favorite_data) if isinstance(favorite_data, dict) else favorite_data
    browse_items = browse_data.get('items', browse_data) if isinstance(browse_data, dict) else browse_data

    favorite_codes = {item['stock_code'] for item in favorite_items}
    browse_codes = {item['stock_code'] for item in browse_items}

    print(f"   自选股数量: {len(favorite_codes)}")
    print(f"   浏览股数量: {len(browse_codes)}")

    # 找出重复的股票
    duplicates = favorite_codes & browse_codes

    if not duplicates:
        print("\n✅ 没有重复的股票")
        return

    print(f"\n2. 发现 {len(duplicates)} 只重复的股票:")
    for code in sorted(duplicates):
        print(f"   - {code}")

    # 确认删除
    print("\n3. 将从自选股中删除这些重复的股票（保留浏览股中的）")
    confirm = input("   确认删除? (yes/no): ").strip().lower()

    if confirm not in ('yes', 'y'):
        print("   ❌ 操作已取消")
        return

    # 执行删除
    print("\n4. 正在删除...")
    deleted = []
    failed = []

    for code in duplicates:
        try:
            result = remove_from_watchlist(code)
            deleted.append(code)
            print(f"   ✅ {code} 已删除")
        except Exception as e:
            failed.append((code, str(e)))
            print(f"   ❌ {code} 删除失败: {e}")

    # 总结
    print("\n" + "=" * 50)
    print("清理完成!")
    print("=" * 50)
    print(f"✅ 成功删除: {len(deleted)} 只")
    print(f"❌ 删除失败: {len(failed)} 只")

    if failed:
        print("\n失败的股票:")
        for code, error in failed:
            print(f"   - {code}: {error}")


if __name__ == "__main__":
    main()
