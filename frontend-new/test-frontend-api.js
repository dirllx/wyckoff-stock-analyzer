/**
 * 前端 API 测试脚本
 * 用于验证前端能否正确调用后端 API
 */

// 测试配置
const API_BASE = 'http://localhost:8080';
const PROXY_API_BASE = 'http://localhost:3001/api/v1';

async function testAPI(baseUrl, name) {
  console.log(`\n========== 测试 ${name} ==========`);
  console.log(`Base URL: ${baseUrl}`);

  try {
    // 测试 1: 健康检查
    console.log('\n1. 测试健康检查...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log(`✅ 健康检查: ${healthData.status}`);

    // 测试 2: API 健康检查
    console.log('\n2. 测试 API 健康检查...');
    const apiHealthResponse = await fetch(`${baseUrl}/api/v1/health`);
    const apiHealthData = await apiHealthResponse.json();
    console.log(`✅ API 健康检查: ${apiHealthData.status}`);

    // 测试 3: 分析股票
    console.log('\n3. 测试分析股票...');
    const analyzeResponse = await fetch(`${baseUrl}/api/v1/stocks/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '000001', timeframe: 'daily' })
    });
    const analyzeData = await analyzeResponse.json();
    console.log(`✅ 分析股票: ${analyzeData.stock?.code}, 收盘价: ${analyzeData.current_quote?.close}`);

    // 测试 4: 获取 K线数据
    console.log('\n4. 测试获取 K线数据...');
    const quotesResponse = await fetch(`${baseUrl}/api/v1/stocks/000001/quotes?timeframe=daily&limit=5`);
    const quotesData = await quotesResponse.json();
    console.log(`✅ K线数据: ${quotesData.code}, 总数: ${quotesData.total}`);

    console.log(`\n✅ 所有测试通过 (${name})`);
    return true;
  } catch (error) {
    console.error(`\n❌ 测试失败 (${name}):`, error.message);
    return false;
  }
}

// 运行测试
(async () => {
  console.log('========================================');
  console.log('前端 API 测试');
  console.log('========================================');

  const result1 = await testAPI(API_BASE, '直接连接后端');
  const result2 = await testAPI(PROXY_API_BASE, '通过 Vite 代理');

  console.log('\n========================================');
  console.log('测试总结');
  console.log('========================================');
  console.log(`直接连接后端: ${result1 ? '✅ 通过' : '❌ 失败'}`);
  console.log(`通过 Vite 代理: ${result2 ? '✅ 通过' : '❌ 失败'}`);

  if (result1 && result2) {
    console.log('\n🎉 所有测试通过！');
  } else {
    console.log('\n⚠️ 部分测试失败，请检查配置');
  }
})();
