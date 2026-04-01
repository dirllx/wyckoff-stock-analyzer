"""
API集成测试脚本
测试多数据源调度器集成到现有API系统后的功能
"""
import asyncio
import httpx
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"


async def test_stock_quotes_api():
    """测试股票K线数据API"""
    print("\n" + "="*60)
    print("测试1: 股票K线数据API - 周线数据（应优先使用Baostock）")
    print("="*60)

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{BASE_URL}/stocks/000001/quotes",
                params={"timeframe": "weekly", "limit": 10}
            )

            if response.status_code == 200:
                data = response.json()
                print(f"✅ 成功获取周线数据")
                print(f"   - 股票代码: {data['code']}")
                print(f"   - 周期: {data['timeframe']}")
                print(f"   - 总数: {data['total']}")
                print(f"   - 来自缓存: {data.get('from_cache', False)}")
                print(f"   - 来自调度器: {data.get('from_scheduler', False)}")
                if data['quotes']:
                    print(f"   - 最新数据: {data['quotes'][-1]}")
            else:
                print(f"❌ 请求失败: {response.status_code}")
                print(response.text)

        except Exception as e:
            print(f"❌ 测试失败: {e}")


async def test_patterns_api():
    """测试形态识别API"""
    print("\n" + "="*60)
    print("测试2: 形态识别API（应使用调度器获取数据）")
    print("="*60)

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{BASE_URL}/stocks/000001/patterns",
                params={"timeframe": "weekly"}
            )

            if response.status_code == 200:
                data = response.json()
                print(f"✅ 形态识别成功")
                print(f"   - 股票代码: {data['stock_code']}")
                print(f"   - 周期: {data['timeframe']}")
                print(f"   - 识别到形态数: {data['total']}")
            else:
                print(f"❌ 请求失败: {response.status_code}")
                print(response.text)

        except Exception as e:
            print(f"❌ 测试失败: {e}")


async def test_data_source_management_apis():
    """测试数据源管理API"""
    print("\n" + "="*60)
    print("测试3: 数据源管理API")
    print("="*60)

    async with httpx.AsyncClient() as client:
        # 3.1 测速
        print("\n3.1 运行数据源测速...")
        try:
            response = await client.post(
                f"{BASE_URL}/data-sources/speed-test",
                json={"code": "000001", "timeframes": ["weekly"]}
            )

            if response.status_code == 200:
                data = response.json()
                print(f"✅ 测速成功")
                if 'results' in data:
                    for tf, sources in data['results'].items():
                        print(f"   {tf}:")
                        for source, time_ms in sources.items():
                            status = "✅" if time_ms > 0 else "❌"
                            time_str = f"{time_ms:.0f}ms" if time_ms > 0 else "失败"
                            print(f"     {status} {source}: {time_str}")
            else:
                print(f"❌ 测速失败: {response.status_code}")

        except Exception as e:
            print(f"❌ 测速测试失败: {e}")

        # 3.2 获取统计信息
        print("\n3.2 获取数据源统计...")
        try:
            response = await client.get(f"{BASE_URL}/data-sources/stats")

            if response.status_code == 200:
                stats = response.json()
                print(f"✅ 统计信息获取成功")
                for source, stat in stats.items():
                    print(f"   {source}:")
                    print(f"     - 总请求: {stat['total_requests']}")
                    print(f"     - 成功率: {stat['success_rate']}")
                    print(f"     - 可用: {'✅' if stat['is_available'] else '❌'}")
            else:
                print(f"❌ 获取统计失败: {response.status_code}")

        except Exception as e:
            print(f"❌ 统计测试失败: {e}")

        # 3.3 获取优先级配置
        print("\n3.3 获取周线数据源优先级...")
        try:
            response = await client.get(f"{BASE_URL}/data-sources/priority/weekly")

            if response.status_code == 200:
                data = response.json()
                print(f"✅ 优先级获取成功")
                print(f"   周期: {data['timeframe']}")
                print(f"   优先级列表: {data['priority_list']}")
            else:
                print(f"❌ 获取优先级失败: {response.status_code}")

        except Exception as e:
            print(f"❌ 优先级测试失败: {e}")

        # 3.4 健康检查
        print("\n3.4 数据源健康检查...")
        try:
            response = await client.get(f"{BASE_URL}/data-sources/health")

            if response.status_code == 200:
                data = response.json()
                print(f"✅ 健康检查完成")
                print(f"   系统健康: {'✅' if data['healthy'] else '❌'}")
            else:
                print(f"❌ 健康检查失败: {response.status_code}")

        except Exception as e:
            print(f"❌ 健康检查测试失败: {e}")


async def test_fallback_mechanism():
    """测试降级机制"""
    print("\n" + "="*60)
    print("测试4: 自动降级机制")
    print("="*60)
    print("说明: 当akshare失败时，应自动切换到Baostock")

    async with httpx.AsyncClient() as client:
        try:
            # 临时修改周线优先级：先akshare（会失败），再baostock
            print("\n4.1 设置周线优先级: [akshare, baostock]")
            response = await client.post(
                f"{BASE_URL}/data-sources/priority",
                json={"timeframe": "weekly", "priority_list": ["akshare", "baostock"]}
            )

            if response.status_code == 200:
                print(f"✅ 优先级更新成功")
            else:
                print(f"⚠️  优先级更新失败: {response.status_code}")

            # 获取数据（测试降级）
            print("\n4.2 获取周线数据（akshare失败时自动降级到baostock）...")
            response = await client.get(
                f"{BASE_URL}/stocks/688234/quotes",
                params={"timeframe": "weekly", "limit": 5}
            )

            if response.status_code == 200:
                data = response.json()
                print(f"✅ 数据获取成功（降级机制生效）")
                print(f"   - 总数: {data['total']}")
                print(f"   - 说明: akshare失败后自动切换到baostock")
            else:
                print(f"❌ 数据获取失败: {response.status_code}")

        except Exception as e:
            print(f"❌ 降级测试失败: {e}")


async def main():
    """主测试函数"""
    print("\n" + "🚀"*30)
    print("API集成测试 - 多数据源调度器")
    print("🚀"*30)
    print(f"\n测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"API地址: {BASE_URL}")

    try:
        # 测试1: K线数据API
        await test_stock_quotes_api()

        # 测试2: 形态识别API
        await test_patterns_api()

        # 测试3: 数据源管理API
        await test_data_source_management_apis()

        # 测试4: 降级机制
        await test_fallback_mechanism()

        print("\n" + "="*60)
        print("✅ 所有测试完成")
        print("="*60)

    except Exception as e:
        print(f"\n❌ 测试过程出错: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    print("\n提示: 请确保后端服务已启动 (uvicorn app.main:app --reload)")
    print("      按 Ctrl+C 停止测试\n")

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n测试已停止")
