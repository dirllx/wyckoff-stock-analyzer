"""
修复周线涨跌幅计算错误的问题

问题：前端显示的周线涨跌幅为+49.1%，明显错误

根本原因分析：
1. storage.get_quotes返回正确的2026年数据
2. 但前端获取的quotes数据是2022年的旧数据
3. 可能是缓存或数据混淆导致

修复方案：
1. 清理所有缓存
2. 确保API返回正确的数据
3. 验证修复效果
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.services.redis_service import RedisService
from app.database import SessionLocal
from app.services.data.data_storage import DataStorage


def fix_weekly_data_issue(code="688234"):
    """修复周线数据问题"""
    print(f"\n{'='*100}")
    print(f"修复 {code} 周线数据问题")
    print(f"{'='*100}")

    redis = RedisService()
    db = SessionLocal()
    storage = DataStorage(db)

    try:
        # 步骤1：清理缓存
        print(f"\n步骤1：清理缓存")
        timeframes = ["daily", "weekly", "monthly"]
        for tf in timeframes:
            key = f'stock_data:{code}:{tf}'
            redis.delete(key)
            print(f"  ✅ 已删除缓存: {key}")

        # 步骤2：验证数据库中的数据
        print(f"\n步骤2：验证数据库数据")
        weekly_quotes = storage.get_quotes(code, "weekly", limit=5)
        print(f"  数据库中周线数据: {len(weekly_quotes)}条")
        for i, q in enumerate(weekly_quotes):
            print(f"    [{i}] {q.date.strftime('%Y-%m-%d')} - 收盘: {q.close:.2f}")

        # 步骤3：验证API返回
        print(f"\n步骤3：测试API返回")
        import requests
        url = f'http://localhost:8000/api/v1/stocks/{code}/quotes?timeframe=weekly&limit=5'
        response = requests.get(url)
        data = response.json()

        quotes = data.get('quotes', [])
        print(f"  API返回数据: {len(quotes)}条")
        for i, quote in enumerate(quotes):
            date_str = quote.get('date', '')
            close = quote.get('close', 0)
            print(f"    [{i}] {date_str} - 收盘: {close:.2f}")

        # 步骤4：对比验证
        print(f"\n步骤4：对比验证")
        db_latest_date = weekly_quotes[-1].date.strftime('%Y-%m-%d')
        api_latest_date = quotes[-1].get('date', '').split(' ')[0] if quotes else ''

        print(f"  数据库最新日期: {db_latest_date}")
        print(f"  API最新日期: {api_latest_date}")

        if db_latest_date == api_latest_date:
            print(f"  ✅ 数据一致，修复成功！")
            return True
        else:
            print(f"  ❌ 数据不一致，需要进一步排查")
            return False

    except Exception as e:
        print(f"  ❌ 修复失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    success = fix_weekly_data_issue("688234")

    if success:
        print(f"\n{'='*100}")
        print(f"✅ 修复完成！请刷新前端页面验证")
        print(f"{'='*100}")
    else:
        print(f"\n{'='*100}")
        print(f"❌ 修复失败，需要进一步排查")
        print(f"{'='*100}")
