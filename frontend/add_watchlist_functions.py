#!/usr/bin/env python3
# 添加"我的关注"相关JavaScript函数

input_file = 'index.html'
output_file = 'index.html'

# 读取文件
with open(input_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 在showTab函数后（第440行后）添加函数
new_lines = []
for i, line in enumerate(lines):
    new_lines.append(line)
    
    # 在showTab函数结束后添加"我的关注"函数
    if i == 439 and line.strip() == '}':
        new_lines.append('\n')
        new_lines.append('        // ========== 我的关注相关函数 ==========\n')
        new_lines.append('\n')
        new_lines.append('        async function refreshWatchlist() {\n')
        new_lines.append('            console.log(\'刷新关注列表\');\n')
        new_lines.append('            addLog(\'操作\', \'刷新关注列表\');\n')
        new_lines.append('\n')
        new_lines.append('            try {\n')
        new_lines.append('                const response = await fetch(`${API_BASE}/api/v1/watchlist`);\n')
        new_lines.append('                const data = await response.json();\n')
        new_lines.append('\n')
        new_lines.append('                const content = document.getElementById(\'watchlistContent\');\n')
        new_lines.append('                if (data.items.length === 0) {\n')
        new_lines.append('                    content.innerHTML = \'<div style="text-align:center; color:#9ca3af; padding:20px;">暂无关注股票</div>\';\n')
        new_lines.append('                    addLog(\'刷新完成\', \'关注列表为空\');\n')
        new_lines.append('                    return;\n')
        new_lines.append('                }\n')
        new_lines.append('\n')
        new_lines.append('                const select = document.getElementById(\'watchlistSelect\');\n')
        new_lines.append('                select.innerHTML = \'<option value="">选择股票</option>\';\n')
        new_lines.append('                data.items.forEach(item => {\n')
        new_lines.append('                    select.innerHTML += `<option value="${item.stock_code}">${item.stock_code}</option>`;\n')
        new_lines.append('                });\n')
        new_lines.append('\n')
        new_lines.append('                content.innerHTML = data.items.map(item => `\n')
        new_lines.append('                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #1f2937; border-radius: 8px; margin-bottom: 8px; border: 1px solid #374151;">\n')
        new_lines.append('                        <div style="font-weight: 600;">${item.stock_code}</div>\n')
        new_lines.append('                        <div style="display: flex; gap: 8px;">\n')
        new_lines.append('                            <button class="btn btn-primary" onclick="analyzeFromWatchlist(\'${item.stock_code}\')" style="padding:6px 12px; font-size:12px;">分析</button>\n')
        new_lines.append('                            <button class="btn btn-secondary" onclick="deleteFromWatchlist(\'${item.stock_code}\')" style="padding:6px 12px; font-size:12px;">删除</button>\n')
        new_lines.append('                        </div>\n')
        new_lines.append('                    </div>\n')
        new_lines.append('                `).join(\'\');\n')
        new_lines.append('\n')
        new_lines.append('                console.log(`关注列表刷新完成，共${data.total}只股票`);\n')
        new_lines.append('                addLog(\'刷新完成\', `共 ${data.total} 只股票`);\n')
        new_lines.append('            } catch (error) {\n')
        new_lines.append('                console.error(\'刷新关注列表失败:\', error);\n')
        new_lines.append('                addLog(\'刷新失败\', `错误: ${error.message}`);\n')
        new_lines.append('            }\n')
        new_lines.append('        }\n')
        new_lines.append('\n')
        new_lines.append('        function analyzeFromWatchlist(code) {\n')
        new_lines.append('            document.getElementById(\'stockCode\').value = code;\n')
        new_lines.append('            showTab(\'analyze\');\n')
        new_lines.append('            addLog(\'从关注列表分析\', `股票代码: ${code}`);\n')
        new_lines.append('            analyzeStock();\n')
        new_lines.append('        }\n')
        new_lines.append('\n')
        new_lines.append('        async function addToWatchlist() {\n')
        new_lines.append('            const code = document.getElementById(\'stockCode\').value;\n')
        new_lines.append('            if (!code) {\n')
        new_lines.append('                alert(\'请输入股票代码\');\n')
        new_lines.append('                addLog(\'错误\', \'股票代码为空\');\n')
        new_lines.append('                return;\n')
        new_lines.append('            }\n')
        new_lines.append('\n')
        new_lines.append('            console.log(`添加到关注列表: ${code}`);\n')
        new_lines.append('            addLog(\'添加关注\', `股票代码: ${code}`);\n')
        new_lines.append('\n')
        new_lines.append('            try {\n')
        new_lines.append('                const response = await fetch(`${API_BASE}/api/v1/watchlist`, {\n')
        new_lines.append('                    method: \'POST\',\n')
        new_lines.append('                    headers: { \'Content-Type\': \'application/json\' },\n')
        new_lines.append('                    body: JSON.stringify({ code })\n')
        new_lines.append('                });\n')
        new_lines.append('                const data = await response.json();\n')
        new_lines.append('                alert(`添加成功: ${data.message}`);\n')
        new_lines.append('                addLog(\'添加成功\', data.message);\n')
        new_lines.append('                refreshWatchlist();\n')
        new_lines.append('            } catch (error) {\n')
        new_lines.append('                console.error(\'添加失败:\', error);\n')
        new_lines.append('                alert(`添加失败: ${error.message}`);\n')
        new_lines.append('                addLog(\'添加失败\', `错误: ${error.message}`);\n')
        new_lines.append('            }\n')
        new_lines.append('        }\n')
        new_lines.append('\n')
        new_lines.append('        async function deleteFromWatchlist(code) {\n')
        new_lines.append('            if (!confirm(\'确定删除 \' + code + \'?\')) return;\n')
        new_lines.append('            console.log(`删除: ${code}`);\n')
        new_lines.append('            addLog(\'删除关注\', `股票代码: ${code}`);\n')
        new_lines.append('\n')
        new_lines.append('            try {\n')
        new_lines.append('                const response = await fetch(`${API_BASE}/api/v1/watchlist/${code}`, { method: \'DELETE\' });\n')
        new_lines.append('                alert(\'删除成功\');\n')
        new_lines.append('                addLog(\'删除成功\', `已删除 ${code}`);\n')
        new_lines.append('                refreshWatchlist();\n')
        new_lines.append('            } catch (error) {\n')
        new_lines.append('                console.error(\'删除失败:\', error);\n')
        new_lines.append('                alert(`删除失败: ${error.message}`);\n')
        new_lines.append('                addLog(\'删除失败\', `错误: ${error.message}`);\n')
        new_lines.append('            }\n')
        new_lines.append('        }\n')
        new_lines.append('\n')

# 写入输出文件
with open(output_file, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"完成：{output_file}")
print(f"原文件行数: {len(lines)}")
print(f"新文件行数: {len(new_lines)}")

# 验证添加的函数
print("")
print("=== 验证添加的函数 ===")
for i, line in enumerate(new_lines):
    if 'async function refreshWatchlist' in line:
        print(f"{i+1}: refreshWatchlist")
    elif 'function analyzeFromWatchlist' in line:
        print(f"{i+1}: analyzeFromWatchlist")
    elif 'async function addToWatchlist' in line:
        print(f"{i+1}: addToWatchlist")
    elif 'async function deleteFromWatchlist' in line:
        print(f"{i+1}: deleteFromWatchlist")
