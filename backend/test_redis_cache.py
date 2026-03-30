#!/usr/bin/env python3
"""
Redis缓存功能测试脚本
测试Redis缓存服务的各项功能
"""
import sys
import os
from datetime import datetime

# 添加backend目录到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.redis_service import RedisService


def print_section(title: str):
    """打印测试区块标题"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)


def test_basic_operations():
    """测试基础读写操作"""
    print_section("1. 基础读写操作测试")

    # 测试SET
    test_key = "wyckoff:test:basic"
    test_value = {"test": "data", "timestamp": datetime.now().isoformat()}

    print(f"📝 写入测试数据...")
    success = RedisService.set(test_key, test_value, ttl=60)
    print(f"   结果: {'✅ 成功' if success else '❌ 失败'}")

    # 测试GET
    print(f"\n📖 读取测试数据...")
    cached = RedisService.get(test_key)
    print(f"   结果: {'✅ 成功' if cached else '❌ 失败'}")
    if cached:
        print(f"   数据: {cached}")

    # 测试EXISTS
    print(f"\n🔍 检查键是否存在...")
    exists = RedisService.exists(test_key)
    print(f"   结果: {'✅ 存在' if exists else '❌ 不存在'}")

    # 测试DELETE
    print(f"\n🗑️  删除测试键...")
    deleted = RedisService.delete(test_key)
    print(f"   结果: {'✅ 成功' if deleted else '❌ 失败'}")

    # 验证删除
    exists_after = RedisService.exists(test_key)
    print(f"   删除后检查: {'❌ 仍存在' if exists_after else '✅ 已删除'}")


def test_stock_data_cache():
    """测试股票数据缓存"""
    print_section("2. 股票数据缓存测试")

    code = "688234"
    timeframe = "daily"
    test_data = [
        {"date": "2026-03-29", "open": 78.5, "close": 79.2, "high": 79.5, "low": 78.0},
        {"date": "2026-03-28", "open": 77.8, "close": 78.5, "high": 78.8, "low": 77.5},
    ]

    # 缓存股票数据
    print(f"📝 缓存股票数据: {code} ({timeframe})")
    success = RedisService.cache_stock_data(code, timeframe, test_data)
    print(f"   结果: {'✅ 成功' if success else '❌ 失败'}")

    # 读取股票数据
    print(f"\n📖 读取缓存的股票数据...")
    cached_data = RedisService.get_stock_data(code, timeframe)
    print(f"   结果: {'✅ 成功' if cached_data else '❌ 失败'}")
    if cached_data:
        print(f"   数据条数: {len(cached_data)}")
        print(f"   第一条: {cached_data[0]}")

    # 清理
    RedisService.clear_stock_cache(code)
    print(f"\n🧹 清理测试数据")


def test_analysis_cache():
    """测试分析结果缓存"""
    print_section("3. 分析结果缓存测试")

    code = "688234"
    timeframe = "daily"
    test_analysis = {
        "phase": "A",
        "direction": "LONG",
        "score": 3,
        "confidence": 0.65,
        "suggestion": "建议买入"
    }

    # 缓存分析结果
    print(f"📝 缓存分析结果: {code} ({timeframe})")
    success = RedisService.cache_analysis(code, timeframe, test_analysis)
    print(f"   结果: {'✅ 成功' if success else '❌ 失败'}")

    # 读取分析结果
    print(f"\n📖 读取缓存的分析结果...")
    cached_analysis = RedisService.get_analysis(code, timeframe)
    print(f"   结果: {'✅ 成功' if cached_analysis else '❌ 失败'}")
    if cached_analysis:
        print(f"   威科夫阶段: {cached_analysis.get('phase')}")
        print(f"   方向: {cached_analysis.get('direction')}")
        print(f"   评分: {cached_analysis.get('score')}")

    # 清理
    RedisService.clear_stock_cache(code)
    print(f"\n🧹 清理测试数据")


def test_multi_timeframe_cache():
    """测试多周期分析缓存"""
    print_section("4. 多周期分析缓存测试")

    code = "688234"
    timeframes = ["daily", "weekly", "monthly"]
    test_result = {
        "overall_trend": "看涨",
        "short_term": {"direction": "LONG", "score": 3},
        "mid_term": {"direction": "LONG", "score": 2},
        "long_term": {"direction": "LONG", "score": 1}
    }

    # 缓存多周期结果
    print(f"📝 缓存多周期分析: {code} ({', '.join(timeframes)})")
    success = RedisService.cache_multi_timeframe(code, timeframes, test_result)
    print(f"   结果: {'✅ 成功' if success else '❌ 失败'}")

    # 读取多周期结果
    print(f"\n📖 读取缓存的多周期结果...")
    cached_result = RedisService.get_multi_timeframe(code, timeframes)
    print(f"   结果: {'✅ 成功' if cached_result else '❌ 失败'}")
    if cached_result:
        print(f"   总体趋势: {cached_result.get('overall_trend')}")

    # 清理
    RedisService.clear_stock_cache(code)
    print(f"\n🧹 清理测试数据")


def test_realtime_quote_cache():
    """测试实时行情缓存"""
    print_section("5. 实时行情缓存测试")

    code = "688234"
    test_quote = {
        "code": code,
        "name": "天岳先进",
        "price": 78.68,
        "change": 1.2,
        "change_percent": 1.55,
        "volume": 23141,
        "timestamp": datetime.now().isoformat()
    }

    # 缓存实时行情
    print(f"📝 缓存实时行情: {code}")
    success = RedisService.cache_realtime_quote(code, test_quote)
    print(f"   结果: {'✅ 成功' if success else '❌ 失败'}")

    # 读取实时行情
    print(f"\n📖 读取缓存的实时行情...")
    cached_quote = RedisService.get_realtime_quote(code)
    print(f"   结果: {'✅ 成功' if cached_quote else '❌ 失败'}")
    if cached_quote:
        print(f"   价格: {cached_quote.get('price')}")
        print(f"   涨跌幅: {cached_quote.get('change_percent')}%")

    # 清理
    RedisService.clear_stock_cache(code)
    print(f"\n🧹 清理测试数据")


def test_batch_operations():
    """测试批量操作"""
    print_section("6. 批量操作测试")

    codes = ["688234", "600519", "000001"]
    timeframe = "daily"
    test_results = [
        {"code": "688234", "phase": "A", "score": 3},
        {"code": "600519", "phase": "U", "score": 2},
        {"code": "000001", "phase": "震荡", "score": 0}
    ]

    # 缓存批量结果
    print(f"📝 缓存批量分析: {len(codes)}只股票")
    success = RedisService.cache_batch_analysis(codes, timeframe, test_results)
    print(f"   结果: {'✅ 成功' if success else '❌ 失败'}")

    # 读取批量结果
    print(f"\n📖 读取缓存的批量结果...")
    cached_results = RedisService.get_batch_analysis(codes, timeframe)
    print(f"   结果: {'✅ 成功' if cached_results else '❌ 失败'}")
    if cached_results:
        print(f"   结果数量: {len(cached_results)}")

    # 清理
    for code in codes:
        RedisService.clear_stock_cache(code)
    print(f"\n🧹 清理测试数据")


def test_clear_cache():
    """测试清除缓存功能"""
    print_section("7. 清除缓存测试")

    # 先写入一些测试数据
    test_keys = [
        "wyckoff:stock:688234:daily",
        "wyckoff:analysis:688234:daily",
        "wyckoff:quote:688234"
    ]

    print(f"📝 写入测试数据...")
    for key in test_keys:
        RedisService.set(key, {"test": "data"}, ttl=300)
    print(f"   写入 {len(test_keys)} 个测试键")

    # 清除单个股票缓存
    print(f"\n🗑️ 清除单股票缓存 (688234)...")
    success = RedisService.clear_stock_cache("688234")
    print(f"   结果: {'✅ 成功' if success else '❌ 失败'}")

    # 清除所有缓存
    print(f"\n🗑️ 清除所有缓存...")
    success = RedisService.clear_all_cache()
    print(f"   结果: {'✅ 成功' if success else '❌ 失败'}")


def main():
    """主测试函数"""
    print("\n" + "="*60)
    print("  🔧 Redis缓存服务功能测试")
    print("="*60)
    print(f"  测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    try:
        # 检查Redis连接
        print_section("Redis连接检查")
        from app.database import test_redis_connection
        redis_ok = test_redis_connection()
        print(f"Redis状态: {'✅ 连接正常' if redis_ok else '❌ 连接失败'}")

        if not redis_ok:
            print("\n⚠️ Redis未连接，请检查：")
            print("   1. Redis服务是否启动")
            print("   2. REDIS_URL配置是否正确")
            print("   3. 运行: docker-compose up -d redis")
            return

        # 运行各项测试
        test_basic_operations()
        test_stock_data_cache()
        test_analysis_cache()
        test_multi_timeframe_cache()
        test_realtime_quote_cache()
        test_batch_operations()
        test_clear_cache()

        # 总结
        print_section("测试总结")
        print("✅ 所有测试完成！")
        print("\n💡 下一步:")
        print("   1. 在API中使用缓存服务")
        print("   2. 参考 REDIS_CACHE_GUIDE.md")
        print("   3. 根据实际需求调整TTL")

    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
