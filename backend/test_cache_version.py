"""
测试缓存版本控制功能
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.services.redis_service import RedisService
from app.config import settings
from loguru import logger


def test_cache_version_control():
    """测试缓存版本控制"""

    print("\n" + "="*80)
    print("缓存版本控制测试")
    print("="*80)

    # 1. 显示当前缓存版本
    current_version = getattr(settings, 'CACHE_VERSION', 'v1')
    print(f"\n📌 当前缓存版本: {current_version}")

    # 2. 清除旧版本缓存
    print(f"\n🧹 清除旧版本缓存...")
    result = RedisService.clear_old_version_cache()
    print(f"{'✅' if result else '❌'} 清除结果: {'成功' if result else '失败'}")

    # 3. 测试写入新版本缓存
    print(f"\n📝 测试写入新版本缓存...")
    test_data = {
        "code": "688234",
        "timeframe": "daily",
        "close": 81.90,
        "ma5": 79.1,
        "ma10": 78.16,
        "ma250": 73.30,
        "cache_version": current_version
    }

    # 缓存股票数据
    result1 = RedisService.cache_stock_data("688234", "daily", [test_data])
    print(f"  缓存股票数据: {'✅' if result1 else '❌'}")

    # 缓存分析结果
    test_analysis = {
        "direction": "LONG",
        "score": 2,
        "wyckoff_phase": "A(吸筹)",
        "cache_version": current_version
    }
    result2 = RedisService.cache_analysis("688234", "daily", test_analysis)
    print(f"  缓存分析结果: {'✅' if result2 else '❌'}")

    # 4. 验证缓存key格式
    print(f"\n🔍 验证缓存key格式...")
    from app.database import get_redis
    client = get_redis()

    if client:
        keys = client.keys(f"{RedisService.KEY_PREFIX}*")
        print(f"  当前Redis缓存键数量: {len(keys)}")

        # 检查新版本缓存键
        new_version_keys = [k for k in keys if k.startswith(f"{RedisService.KEY_PREFIX}{current_version}:")]
        print(f"  新版本缓存键数量: {len(new_version_keys)}")

        if new_version_keys:
            print(f"\n  示例缓存键:")
            for key in new_version_keys[:3]:
                print(f"    - {key}")

    # 5. 测试读取缓存
    print(f"\n📖 测试读取缓存...")
    cached_data = RedisService.get_stock_data("688234", "daily")
    if cached_data:
        print(f"  ✅ 成功读取缓存数据")
        print(f"    数据版本: {cached_data[0].get('cache_version', 'unknown')}")
        print(f"    MA5: {cached_data[0].get('ma5')}")
    else:
        print(f"  ❌ 读取缓存失败")

    cached_analysis = RedisService.get_analysis("688234", "daily")
    if cached_analysis:
        print(f"  ✅ 成功读取分析缓存")
        print(f"    数据版本: {cached_analysis.get('cache_version', 'unknown')}")
        print(f"    威科夫阶段: {cached_analysis.get('wyckoff_phase')}")
    else:
        print(f"  ❌ 读取分析缓存失败")

    print(f"\n{'='*80}")
    print(f"✅ 缓存版本控制测试完成")
    print(f"{'='*80}\n")


if __name__ == "__main__":
    test_cache_version_control()
