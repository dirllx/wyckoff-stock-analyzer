import akshare as ak

# 获取688234最近的数据
df = ak.stock_zh_a_hist(
    symbol='688234',
    period='daily',
    start_date='20260320',
    end_date='20260328',
    adjust='qfq'
)

# 显示最近几天的关键数据
print("\n688234 天岳先进 最近5个交易日（前复权）:")
print("=" * 100)
print(f"{'日期':<15} {'收盘':<10} {'涨跌幅%':<12} {'计算涨跌幅%':<15} {'差异':<10}")
print("-" * 100)

for i in range(len(df)-5, len(df)):
    row = df.iloc[i]
    date = row['日期']
    close = row['收盘']
    change_rate = row['涨跌幅']  # akshare提供的涨跌幅
    
    # 计算涨跌幅
    if i > 0:
        prev_close = df.iloc[i-1]['收盘']
        calc_rate = (close - prev_close) / prev_close * 100
    else:
        calc_rate = 0
    
    diff = change_rate - calc_rate if i > 0 else 0
    
    print(f"{str(date):<15} {close:<10.2f} {change_rate:<12.2f} {calc_rate:<15.2f} {diff:<10.2f}")

print("\n说明:")
print("- 涨跌幅%: akshare直接提供的涨跌幅数据")
print("- 计算涨跌幅%: 用(今收盘-昨收盘)/昨收盘×100%计算")
print("- 差异: akshare提供值 - 计算值")
