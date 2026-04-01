"""
数据源调度器测试脚本
测试多数据源、测速、优先级配置等功能
"""
import asyncio
import sys
from pathlib import Path

# 添加项目路径
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.services.data.source_scheduler import get_scheduler
from loguru import logger


async def test_basic_fetch():
    """测试基本数据获取"""
    print("\n" + "="*60)
    print("测试1: 基本数据获取")
    print("="*60)

    scheduler = get_scheduler()

    # 测试日线数据（优先akshare）
    print("\n📊 测试日线数据获取...")
    try:
        daily_data = await scheduler.fetch_with_fallback(
            code="000001",
            timeframe="daily",
            start_date="2024-01-01",
            end_date="2024-01-31"
        )
        print(f"✅ 日线数据获取成功: {len(daily_data)} 条")
        if daily_data:
            print(f"   最新数据: {daily_data[-1]}")
    except Exception as e:
        print(f"❌ 日线数据获取失败: {e}")

    # 测试周线数据（优先baostock）
    print("\n📊 测试周线数据获取...")
    try:
        weekly_data = await scheduler.fetch_with_fallback(
            code="000001",
            timeframe="weekly",
            start_date="2024-01-01",
            end_date="2024-03-31"
        )
        print(f"✅ 周线数据获取成功: {len(weekly_data)} 条")
        if weekly_data:
            print(f"   最新数据: {weekly_data[-1]}")
    except Exception as e:
        print(f"❌ 周线数据获取失败: {e}")

    # 测试月线数据（优先baostock）
    print("\n📊 测试月线数据获取...")
    try:
        monthly_data = await scheduler.fetch_with_fallback(
            code="000001",
            timeframe="monthly",
            start_date="2023-01-01",
            end_date="2024-03-31"
        )
        print(f"✅ 月线数据获取成功: {len(monthly_data)} 条")
        if monthly_data:
            print(f"   最新数据: {monthly_data[-1]}")
    except Exception as e:
        print(f"❌ 月线数据获取失败: {e}")


async def test_priority_config():
    """测试优先级配置"""
    print("\n" + "="*60)
    print("测试2: 优先级配置")
    print("="*60)

    scheduler = get_scheduler()

    # 查看各周期的优先级
    for timeframe in ["daily", "weekly", "monthly"]:
        priority_list = scheduler.get_priority_list(timeframe)
        print(f"\n{timeframe} 数据源优先级: {priority_list}")


async def test_speed_test():
    """测试测速功能"""
    print("\n" + "="*60)
    print("测试3: 数据源测速")
    print("="*60)

    scheduler = get_scheduler()

    print("\n⏱️  开始测速...")
    results = await scheduler.speed_test(
        code="000001",
        timeframes=["daily", "weekly", "monthly"]
    )

    print("\n📊 测速结果:")
    for timeframe, source_times in results.items():
        print(f"\n{timeframe}:")
        for source, time_ms in source_times.items():
            status = "✅" if time_ms > 0 else "❌"
            time_str = f"{time_ms:.0f}ms" if time_ms > 0 else "失败"
            print(f"  {status} {source}: {time_str}")


async def test_stats():
    """测试统计信息"""
    print("\n" + "="*60)
    print("测试4: 统计信息")
    print("="*60)

    scheduler = get_scheduler()

    stats = scheduler.get_stats()

    print("\n📈 数据源统计:")
    for source_name, stat in stats.items():
        print(f"\n{source_name}:")
        print(f"  总请求: {stat['total_requests']}")
        print(f"  成功: {stat['successful_requests']}")
        print(f"  失败: {stat['failed_requests']}")
        print(f"  成功率: {stat['success_rate']}")
        print(f"  平均响应: {stat['avg_response_time_ms']}ms")
        print(f"  可用: {'✅' if stat['is_available'] else '❌'}")


async def test_fallback():
    """测试自动降级"""
    print("\n" + "="*60)
    print("测试5: 自动降级机制")
    print("="*60)

    scheduler = get_scheduler()

    # 手动设置周线优先级：先尝试akshare（会失败），然后baostock
    scheduler.update_priority("weekly", ["akshare", "baostock"])

    print("\n🔄 测试周线数据（akshare可能失败，自动降级到baostock）...")
    try:
        weekly_data = await scheduler.fetch_with_fallback(
            code="000001",
            timeframe="weekly",
            start_date="2024-01-01",
            end_date="2024-03-31"
        )
        print(f"✅ 周线数据获取成功: {len(weekly_data)} 条")
        print(f"   (自动降级生效)")
    except Exception as e:
        print(f"❌ 所有数据源都失败: {e}")


async def main():
    """主测试函数"""
    print("\n" + "🚀"*30)
    print("数据源调度器测试")
    print("🚀"*30)

    try:
        # 测试1: 基本数据获取
        await test_basic_fetch()

        # 测试2: 优先级配置
        await test_priority_config()

        # 测试3: 测速
        await test_speed_test()

        # 测试4: 统计信息
        await test_stats()

        # 测试5: 自动降级
        await test_fallback()

        print("\n" + "="*60)
        print("✅ 所有测试完成")
        print("="*60)

    except Exception as e:
        logger.error(f"测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
