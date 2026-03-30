// ===================== 用户配置管理函数 =====================

// 加载所有配置
async function loadAllSettings() {
    try {
        const response = await fetch(`${API_BASE}/api/v1/settings/`);
        if (!response.ok) throw new Error('加载配置失败');

        const settings = await response.json();

        // 分析配置
        if (settings.analysis) {
            document.getElementById('setting_default_timeframe').value = settings.analysis.default_timeframe || 'daily';
            document.getElementById('setting_signal_threshold').value = settings.analysis.signal_threshold || 3;
            document.getElementById('setting_enable_cache').checked = settings.analysis.enable_cache !== false;

            // 多周期复选框
            const timeframes = settings.analysis.multi_timeframes || ['daily', 'weekly', '30', '60'];
            document.getElementById('setting_tf_30').checked = timeframes.includes('30');
            document.getElementById('setting_tf_60').checked = timeframes.includes('60');
            document.getElementById('setting_tf_daily').checked = timeframes.includes('daily');
            document.getElementById('setting_tf_weekly').checked = timeframes.includes('weekly');
            document.getElementById('setting_tf_monthly').checked = timeframes.includes('monthly');
        }

        // 数据配置
        if (settings.data) {
            document.getElementById('setting_kline_count').value = settings.data.kline_count || 500;
            document.getElementById('setting_cache_ttl').value = settings.data.cache_ttl_hours || 1;
            document.getElementById('setting_enable_redis').checked = settings.data.enable_redis !== false;
        }

        // 显示配置
        if (settings.display) {
            document.getElementById('setting_watchlist_columns').value = settings.display.watchlist_columns || 5;
            document.getElementById('setting_default_sort').value = settings.display.default_sort || 'score_desc';
            document.getElementById('setting_show_advice').checked = settings.display.show_investment_advice !== false;
        }

        // 通知配置
        if (settings.notification) {
            document.getElementById('setting_feishu_webhook').value = settings.notification.feishu_webhook || '';
            document.getElementById('setting_min_notify_score').value = settings.notification.min_notify_score || 4;
            document.getElementById('setting_rate_limit').value = settings.notification.rate_limit_minutes || 30;
            document.getElementById('setting_enable_notification').checked = settings.notification.enable_notification || false;
        }

        // 交易建议配置
        if (settings.trading) {
            document.getElementById('setting_stop_loss').value = settings.trading.stop_loss_percent || 5;
            document.getElementById('setting_take_profit').value = settings.trading.take_profit_percent || 8;
            document.getElementById('setting_position').value = settings.trading.position_percent || 20;
        }

        addLog('配置加载', '✅ 配置已加载');

    } catch (error) {
        console.error('加载配置失败:', error);
        addLog('配置加载失败', error.message);
        alert(`❌ 加载配置失败: ${error.message}`);
    }
}

// 保存所有配置
async function saveAllSettings() {
    try {
        // 收集表单数据
        const settings = {
            analysis: {
                default_timeframe: document.getElementById('setting_default_timeframe').value,
                signal_threshold: parseInt(document.getElementById('setting_signal_threshold').value),
                enable_cache: document.getElementById('setting_enable_cache').checked,
                multi_timeframes: []
            },
            data: {
                kline_count: parseInt(document.getElementById('setting_kline_count').value),
                cache_ttl_hours: parseFloat(document.getElementById('setting_cache_ttl').value),
                enable_redis: document.getElementById('setting_enable_redis').checked
            },
            display: {
                watchlist_columns: parseInt(document.getElementById('setting_watchlist_columns').value),
                default_sort: document.getElementById('setting_default_sort').value,
                show_investment_advice: document.getElementById('setting_show_advice').checked
            },
            notification: {
                feishu_webhook: document.getElementById('setting_feishu_webhook').value || null,
                min_notify_score: parseInt(document.getElementById('setting_min_notify_score').value),
                rate_limit_minutes: parseInt(document.getElementById('setting_rate_limit').value),
                enable_notification: document.getElementById('setting_enable_notification').checked
            },
            trading: {
                stop_loss_percent: parseFloat(document.getElementById('setting_stop_loss').value),
                take_profit_percent: parseFloat(document.getElementById('setting_take_profit').value),
                position_percent: parseFloat(document.getElementById('setting_position').value)
            }
        };

        // 收集多周期复选框
        if (document.getElementById('setting_tf_30').checked) settings.analysis.multi_timeframes.push('30');
        if (document.getElementById('setting_tf_60').checked) settings.analysis.multi_timeframes.push('60');
        if (document.getElementById('setting_tf_daily').checked) settings.analysis.multi_timeframes.push('daily');
        if (document.getElementById('setting_tf_weekly').checked) settings.analysis.multi_timeframes.push('weekly');
        if (document.getElementById('setting_tf_monthly').checked) settings.analysis.multi_timeframes.push('monthly');

        const response = await fetch(`${API_BASE}/api/v1/settings/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });

        if (!response.ok) throw new Error('保存配置失败');

        addLog('配置保存', '✅ 配置已保存');
        alert('✅ 配置保存成功！部分配置需要刷新页面后生效。');

    } catch (error) {
        console.error('保存配置失败:', error);
        addLog('配置保存失败', error.message);
        alert(`❌ 保存配置失败: ${error.message}`);
    }
}

// 重置所有配置
async function resetAllSettings() {
    if (!confirm('确定要重置所有配置为默认值吗？')) return;

    try {
        const response = await fetch(`${API_BASE}/api/v1/settings/reset`, {
            method: 'POST'
        });

        if (!response.ok) throw new Error('重置配置失败');

        await loadAllSettings();
        addLog('配置重置', '✅ 配置已重置为默认值');

    } catch (error) {
        console.error('重置配置失败:', error);
        addLog('配置重置失败', error.message);
        alert(`❌ 重置配置失败: ${error.message}`);
    }
}

// 应用配置到前端功能
function applySettings() {
    // 从localStorage或其他存储获取配置并应用
    const watchlistColumns = localStorage.getItem('setting_watchlist_columns');
    if (watchlistColumns) {
        // 可以动态调整关注列表布局
        console.log('应用显示配置:', watchlistColumns);
    }
}
