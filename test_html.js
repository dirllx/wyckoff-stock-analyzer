const http = require('http');
const fs = require('fs');

console.log('=== 测试前端页面加载 ===\n');

// 读取前端文件
const html = fs.readFileSync('./frontend/index.html', 'utf8');

console.log('1. 检查关键元素...');

// 检查script标签
const scriptCount = (html.match(/<script/g) || []).length;
console.log(`   ✓ script标签数量: ${scriptCount}`);

// 检查图表库引用
if (html.includes('lightweight-charts.standalone.production.js')) {
    console.log('   ✓ 图表库已引用');
} else {
    console.log('   ✗ 图表库未引用！');
    process.exit(1);
}

// 检查容器定义
if (html.includes('id="mainChart"')) {
    console.log('   ✓ mainChart容器已定义');
} else {
    console.log('   ✗ mainChart容器未定义！');
}

if (html.includes('id="volumeChart"')) {
    console.log('   ✓ volumeChart容器已定义');
} else {
    console.log('   ✗ volumeChart容器未定义！');
}

// 检查renderCharts函数
if (html.includes('function renderCharts()')) {
    console.log('   ✓ renderCharts函数已定义');
} else {
    console.log('   ✗ renderCharts函数未定义！');
}

// 检查函数调用
console.log('\n2. 检查函数调用...');
if (html.includes('renderCharts()')) {
    const calls = (html.match(/renderCharts\(\)/g) || []).length;
    console.log(`   ✓ renderCharts()被调用 ${calls} 次`);
} else {
    console.log('   ✗ renderCharts()没有被调用！');
}

// 检查useTableMode
console.log('\n3. 检查useTableMode设置...');
if (html.includes('let useTableMode = false')) {
    console.log('   ✓ 默认使用图表模式');
} else {
    console.log('   ✗ 默认不是图表模式！');
}

// 检查CSS样式
console.log('\n4. 检查容器样式...');
const chartModeMatch = html.match(/id="chartMode"[^>]*style="[^"]*"/);
if (chartModeMatch) {
    console.log(`   chartMode样式: ${chartModeMatch[0]}`);
}

const mainChartMatch = html.match(/id="mainChart"[^>]*style="[^"]*"/);
if (mainChartMatch) {
    console.log(`   mainChart样式: ${mainChartMatch[0]}`);
} else {
    console.log('   mainChart没有内联样式');
}

console.log('\n=== 检查完成 ===');
console.log('\n建议：使用浏览器的开发者工具查看：');
console.log('1. Network面板 - 检查API请求');
console.log('2. Console面板 - 查看错误和调试信息');
console.log('3. Elements面板 - 检查DOM元素');
