// 在浏览器控制台运行此脚本来调试图表问题

console.log('=== 图表调试脚本 ===');

// 1. 检查DOM元素
console.log('1. 检查DOM元素:');
const mainChartDiv = document.getElementById('mainChart');
const volumeChartDiv = document.getElementById('volumeChart');
const chartModeDiv = document.getElementById('chartMode');

console.log('mainChart元素:', mainChartDiv);
console.log('volumeChart元素:', volumeChartDiv);
console.log('chartMode元素:', chartModeDiv);

if (mainChartDiv) {
    console.log('mainChart尺寸:', mainChartDiv.clientWidth, 'x', mainChartDiv.clientHeight);
    console.log('mainChart可见性:', window.getComputedStyle(mainChartDiv).display);
    console.log('mainChart父元素:', mainChartDiv.parentElement);
}

if (volumeChartDiv) {
    console.log('volumeChart尺寸:', volumeChartDiv.clientWidth, 'x', volumeChartDiv.clientHeight);
}

// 2. 检查图表库
console.log('\n2. 检查图表库:');
console.log('LightweightCharts是否存在:', typeof window.LightweightCharts);

// 3. 检查数据
console.log('\n3. 检查数据:');
console.log('currentQuotesData:', typeof currentQuotesData !== 'undefined' ? currentQuotesData : '未定义');

// 4. 手动调用renderCharts
console.log('\n4. 尝试手动渲染:');
if (typeof renderCharts === 'function') {
    console.log('renderCharts函数存在，尝试调用...');
    try {
        renderCharts();
    } catch (e) {
        console.error('renderCharts调用失败:', e);
    }
} else {
    console.log('renderCharts函数不存在！');
}

// 5. 检查CSS
console.log('\n5. 检查容器CSS:');
if (mainChartDiv) {
    const styles = window.getComputedStyle(mainChartDiv);
    console.log('width:', styles.width);
    console.log('height:', styles.height);
    console.log('display:', styles.display);
    console.log('visibility:', styles.visibility);
    console.log('opacity:', styles.opacity);
}

console.log('\n=== 调试完成 ===');
