#!/usr/bin/env python3
# 添加完整的 K 线表格到 analyzeStock 函数

import re

# 读取文件
with open('index.html', 'r', encoding='utf-8') as f:
    index_html = f.read()

# 查找 analyzeStock 函数中的表格渲染部分
old_table_pattern = r'(                currentQuotesData = quotesData\.quotes;.*?)                resultDiv\.innerHTML = tableHtml \+ analysisHtml;'
new_table = '''                currentQuotesData = quotesData.quotes;

                // 渲染界面
                const tableHtml = `
                    <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                        <button class="btn" onclick="showMode('table')" id="btnTable">表格</button>
                        <button class="btn btn-secondary" onclick="showMode('chart')" id="btnChart">图表</button>
                    </div>
                    
                    <div class="kline-table-container" id="tableMode" style="display: ${useTableMode ? 'block' : 'none'};">
                        <table class="kline-table">
                            <thead>
                                <tr>
                                    <th>日期</th>
                                    <th>开</th>
                                    <th>高</th>
                                    <th>低</th>
                                    <th>收</th>
                                    <th>成交量</th>
                                    <th>MA5</th>
                                    <th>MA10</th>
                                    <th>MA15</th>
                                    <th>MA20</th>
                                    <th>MA30</th>
                                    <th>MA60</th>
                                    <th>MA90</th>
                                    <th>MA120</th>
                                    <th>MA250</th>
                                    <th>OBV</th>
                                    <th>阶段</th>
                                </tr>
                            </thead>
                            <tbody id="klineBody"></tbody>
                        </table>
                    </div>
                    <div style="height: 500px;" id="chartMode" style="display: ${!useTableMode ? 'block' : 'none'};">
                        <div style="height: 500px;" id="mainChart">图表将在这里显示</div>
                        <div style="height: 200px; margin-top: 12px;" id="volumeChart">成交量图</div>
                    </div>
                `;

                resultDiv.innerHTML = tableHtml + analysisHtml;
                addLog('分析成功', `K线: ${quotesData.total}条, 方向: ${summary.direction}`);
                updateTestStatus('分析完成', true, '分析成功完成');

                // 渲染 K 线表格
                if (useTableMode) {
                    renderKlineTable(quotesData.quotes);
                }'''

# 替换
if re.search(old_table_pattern, index_html, re.DOTALL):
    index_html = re.sub(old_table_pattern, new_table, index_html, flags=re.DOTALL)
    print("✓ 已更新 analyzeStock 函数中的表格渲染部分")
else:
    print("⚠ 未找到旧的表格渲染部分，跳过替换")

# 保存
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(index_html)

print("✓ 已保存修改后的 index.html")
print("\n✅ K 线表格功能已完整集成！")
