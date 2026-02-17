// 检查index.html中的指标代码
const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf-8');

const checks = {
    'K线图': /candleSeries.addCandlestickSeries/.test(content),
    '成交量柱状图': /addHistogramSeries.*volume/.test(content),
    'MA5线': /addLineSeries.*ma5Data/.test(content),
    'MA10线': /addLineSeries.*ma10Data/.test(content),
    'MA20线': /addLineSeries.*ma20Data/.test(content),
    '威科夫指标函数': /function addWyckoffIndicators/.test(content),
    '支撑位': /createPriceLine.*support/.test(content),
    '阻力位': /createPriceLine.*resistance/.test(content),
    '信号点标记': /setMarkers/.test(content),
    '阶段标签': /updatePhaseTag/.test(content),
    'MA数据设置': /ma5Series\.setData|ma10Series\.setData|ma20Series\.setData/.test(content),
    '时间周期选择': /select.*timeframe/.test(content),
    '固定表头': /position: sticky.*top: 0/.test(content)
};

console.log('代码检查结果:');
Object.entries(checks).forEach(([key, value]) => {
    console.log(`${value ? '✅' : '❌'} ${key}`);
});

const missing = Object.entries(checks).filter(([k, v]) => !v);
if (missing.length > 0) {
    console.log('\n缺失的功能:');
    missing.forEach(([key]) => console.log('- ' + key));
} else {
    console.log('\n✅ 所有功能都已实现！');
}
