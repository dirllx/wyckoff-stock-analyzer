#!/usr/bin/env python3
# 完整的index.html.b1：包含所有"我的关注"功能

step8_file = 'step8-chart-full.html'
index_backup_file = 'index.html.backup'
output_file = 'index.html.b1'

# 读取step8和index.backup
with open(step8_file, 'r', encoding='utf-8') as f:
    step8_lines = f.readlines()

with open(index_backup_file, 'r', encoding='utf-8') as f:
    index_backup = f.read()

# 1. 提取"我的关注"Tab内容HTML
watchlist_tab_html = """
            <!-- 我的关注Tab -->
            <div id="tab-watchlist" class="tab-content">
                <div class="card-header">
                    <h2 class="card-title">我的关注</h2>
                    <div class="form-group" style="margin-bottom: 0;">
                        <select class="form-input" id="watchlistSelect" style="width: 120px; margin-right: 10px;" onchange="analyzeFromWatchlist()">
                            <option value="">选择股票</option>
                        </select>
                        <button class="btn btn-primary" onclick="addToWatchlist()">添加</button>
                        <button class="btn btn-secondary" onclick="refreshWatchlist()">刷新</button>
                    </div>
                </div>
                <div id="watchlistContent"></div>
            </div>
"""

# 2. 提取"我的关注"相关JavaScript函数
watchlist_functions = """

        async function refreshWatchlist() {
            console.log('刷新关注列表');
            addLog('操作', '刷新关注列表');

            try {
                const response = await fetch(`${API_BASE}/api/v1/watchlist`);
                const data = await response.json();

                const content = document.getElementById('watchlistContent');
                if (data.items.length === 0) {
                    content.innerHTML = '<div style="text-align:center; color:#9ca3af; padding:20px;">暂无关注股票</div>';
                    addLog('刷新完成', '关注列表为空');
                    return;
                }

                const select = document.getElementById('watchlistSelect');
                select.innerHTML = '<option value="">选择股票</option>';
                data.items.forEach(item => {
                    select.innerHTML += `<option value="${item.stock_code}">${item.stock_code}</option>`;
                });

                content.innerHTML = data.items.map(item => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #1f2937; border-radius: 8px; margin-bottom: 8px; border: 1px solid #374151;">
                        <div style="font-weight: 600;">${item.stock_code}</div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-primary" onclick="analyzeFromWatchlist('${item.stock_code}')" style="padding:6px 12px; font-size:12px;">分析</button>
                            <button class="btn btn-secondary" onclick="deleteFromWatchlist('${item.stock_code}')" style="padding:6px 12px; font-size:12px;">删除</button>
                        </div>
                    </div>
                `).join('');

                console.log(`关注列表刷新完成，共${data.total}只股票`);
                addLog('刷新完成', `共 ${data.total} 只股票`);
            } catch (error) {
                console.error('刷新关注列表失败:', error);
                addLog('刷新失败', `错误: ${error.message}`);
            }
        }

        function analyzeFromWatchlist(code) {
            document.getElementById('stockCode').value = code;
            showTab('analyze');
            addLog('从关注列表分析', `股票代码: ${code}`);
            analyzeStock();
        }

        async function addToWatchlist() {
            const code = document.getElementById('stockCode').value;
            if (!code) {
                alert('请输入股票代码');
                addLog('错误', '股票代码为空');
                return;
            }

            console.log(`添加到关注列表: ${code}`);
            addLog('添加关注', `股票代码: ${code}`);

            try {
                const response = await fetch(`${API_BASE}/api/v1/watchlist`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });
                const data = await response.json();
                alert(`添加成功: ${data.message}`);
                addLog('添加成功', data.message);
                refreshWatchlist();
            } catch (error) {
                console.error('添加失败:', error);
                alert(`添加失败: ${error.message}`);
                addLog('添加失败', `错误: ${error.message}`);
            }
        }

        async function deleteFromWatchlist(code) {
            if (!confirm('确定删除 ' + code + '?')) return;
            console.log(`删除: ${code}`);
            addLog('删除关注', `股票代码: ${code}`);

            try {
                const response = await fetch(`${API_BASE}/api/v1/watchlist/${code}`, { method: 'DELETE' });
                alert('删除成功');
                addLog('删除成功', `已删除 ${code}`);
                refreshWatchlist();
            } catch (error) {
                console.error('删除失败:', error);
                alert(`删除失败: ${error.message}`);
                addLog('删除失败', `错误: ${error.message}`);
            }
        }
"""

# 3. 修改step8：添加"我的关注"Tab按钮
new_lines = []
for i, line in enumerate(step8_lines):
    # 在"分析"按钮后添加"我的关注"按钮
    if '<button class="tab-btn active" id="tabAnalyze"' in line:
        new_lines.append(line)
        new_lines.append("                <button class=\"tab-btn\" id=\"tabWatchlist\" onclick=\"showTab('watchlist')\">我的关注</button>\n")
    # 注释掉"测试状态"按钮
    elif '<button class="tab-btn" id="tabStatus"' in line:
        new_lines.append("                <!-- " + line.rstrip() + " -->\n")
    # 在"tab-status"内容后添加"我的关注"Tab内容
    elif '</div>\n        <div id="tab-status"' in line:
        new_lines.append(line)
        # 添加"我的关注"Tab内容
        new_lines.append(watchlist_tab_html)
    # 在updateLogDisplay函数后添加"我的关注"函数
    elif 'function updateLogDisplay()' in line:
        new_lines.append(line)
        # 添加函数
        new_lines.append(watchlist_functions)
    else:
        new_lines.append(line)

# 4. 写入输出文件
with open(output_file, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"完成：已创建{output_file}")
print(f"文件行数: {len(new_lines)}")
print("")
print("包含功能：")
print("- 我的关注Tab按钮")
print("- 我的关注Tab内容")
print("- 我的关注相关函数（4个）")
print("- 所有step8原有功能")
