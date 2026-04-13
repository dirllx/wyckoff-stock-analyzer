/**
 * UI工具函数
 * 处理图表切换、弹窗选择器等通用UI功能
 */

import { logger } from './logger.js';
import { Watchlist } from '../components/Watchlist.js';

// 当前视图模式：table=表格模式, chart=图表模式
let currentViewMode = 'table';

// 关注列表选择器回调
let watchlistPickerCallback = null;

/**
 * 切换图表/表格视图模式
 * @param {string} mode - 'table' 或 'chart'
 */
export function toggleViewMode(mode) {
  currentViewMode = mode;
  const chartMode = document.getElementById('chartMode');
  const tableMode = document.getElementById('tableMode');
  const btnTable = document.getElementById('btnTable');
  const btnChart = document.getElementById('btnChart');

  if (!chartMode || !tableMode || !btnTable || !btnChart) {
    logger.warn('Toggle view mode: required elements not found');
    return;
  }

  if (mode === 'table') {
    chartMode.style.display = 'none';
    tableMode.style.display = 'block';
    btnTable.classList.add('active');
    btnChart.classList.remove('active');
    logger.info('Switched to table view');
  } else {
    chartMode.style.display = 'block';
    tableMode.style.display = 'none';
    btnChart.classList.add('active');
    btnTable.classList.remove('active');
    logger.info('Switched to chart view');
  }
}

/**
 * 获取当前视图模式
 * @returns {string} 'table' 或 'chart'
 */
export function getCurrentViewMode() {
  return currentViewMode;
}

/**
 * 显示关注列表选择弹窗
 * @param {string} targetInputId - 目标输入框ID
 * @param {Function} callback - 选择后的回调函数 (code, name) => void
 */
export async function showWatchlistPicker(targetInputId, callback) {
  const modal = document.getElementById('watchlistPickerModal');
  const content = document.getElementById('watchlistPickerContent');

  if (!modal || !content) {
    logger.error('Watchlist picker modal elements not found');
    return;
  }

  // 设置回调
  watchlistPickerCallback = callback;

  try {
    // 加载两种类型的关注列表数据
    const [favoriteData, browseData] = await Promise.all([
      Watchlist.refresh('favorite'),
      Watchlist.refresh('browse')
    ]);

    // 构建HTML内容
    let html = '';

    // 自选股区域
    if (favoriteData.length > 0) {
      html += `
        <div style="width: 100%;">
          <div style="color: #f59e0b; font-size: 13px; font-weight: 600; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #374151;">
            ⭐ 自选股 (${favoriteData.length})
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;">
            ${favoriteData.map(item => `
              <button
                onclick="window.selectStockFromWatchlist('${item.stock_code}', '${item.stock_name || item.stock_code}')"
                style="padding: 6px 12px; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; color: white; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500;"
              >
                ${item.stock_code} ${item.stock_name || ''}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    // 浏览股区域
    if (browseData.length > 0) {
      html += `
        <div style="width: 100%;">
          <div style="color: #6b7280; font-size: 13px; font-weight: 600; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #374151;">
            👁️ 浏览股 (${browseData.length})
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${browseData.map(item => `
              <button
                onclick="window.selectStockFromWatchlist('${item.stock_code}', '${item.stock_name || item.stock_code}')"
                style="padding: 6px 12px; background: linear-gradient(135deg, #6b7280, #4b5563); border: none; color: white; border-radius: 6px; cursor: pointer; font-size: 12px;"
              >
                ${item.stock_code} ${item.stock_name || ''}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    // 空状态
    if (favoriteData.length === 0 && browseData.length === 0) {
      html = '<p style="color: #9ca3af; text-align: center; width: 100%;">暂无关注股票，分析后会自动添加到浏览股</p>';
    }

    content.innerHTML = html;

    // 显示弹窗
    modal.style.display = 'flex';
    logger.info(`Watchlist picker shown: ${favoriteData.length} favorite, ${browseData.length} browse`);
  } catch (error) {
    logger.error('Failed to load watchlist for picker:', error);
    content.innerHTML = '<p style="color: #ef4444; text-align: center; width: 100%;">加载失败</p>';
    modal.style.display = 'flex';
  }
}

/**
 * 从关注列表选择股票
 * @param {string} code - 股票代码
 * @param {string} name - 股票名称
 */
window.selectStockFromWatchlist = function(code, name) {
  if (watchlistPickerCallback) {
    watchlistPickerCallback(code, name);
  }
  closeWatchlistPicker();
};

/**
 * 关闭关注列表选择弹窗
 */
export function closeWatchlistPicker() {
  const modal = document.getElementById('watchlistPickerModal');
  if (modal) {
    modal.style.display = 'none';
  }
  watchlistPickerCallback = null;
  logger.info('Watchlist picker closed');
}

// 暴露到window对象以便HTML onclick调用
window.closeWatchlistPicker = closeWatchlistPicker;

/**
 * 更新图表信息面板
 * @param {Object} analysis - 分析结果
 */
export function updateChartInfoPanel(analysis) {
  const phaseContent = document.getElementById('wyckoff-phase-content');
  const zoneContent = document.getElementById('operation-zone-content');
  const confidenceContent = document.getElementById('prediction-confidence');

  if (!analysis || !analysis.analysis_summary) {
    if (phaseContent) phaseContent.textContent = '等待分析...';
    if (zoneContent) zoneContent.textContent = '等待分析...';
    if (confidenceContent) confidenceContent.textContent = '等待分析...';
    return;
  }

  const summary = analysis.analysis_summary;

  // 更新威科夫阶段
  if (phaseContent) {
    const phase = summary.wyckoff_phase || '未知';
    const phaseClass = getPhaseClass(phase);
    phaseContent.innerHTML = `<span class="phase-badge ${phaseClass}">${phase}</span>`;
  }

  // 更新操作区
  if (zoneContent) {
    const suggestion = summary.suggestion || '观望';
    const direction = summary.direction || 'NEUTRAL';
    const directionIcon = getDirectionIcon(direction);
    zoneContent.textContent = `${directionIcon} ${suggestion}`;
  }

  // 更新预测置信度
  if (confidenceContent) {
    const confidence = summary.confidence ? Math.round(summary.confidence * 100) + '%' : '-';
    const score = summary.score !== undefined ? summary.score + '/5' : '-';
    confidenceContent.textContent = `${confidence} (评分: ${score})`;
  }
}

/**
 * 获取威科夫阶段对应的CSS类
 */
function getPhaseClass(phase) {
  const phaseMap = {
    'A': 'phase-A',
    'U': 'phase-U',
    'D': 'phase-D',
    'DS': 'phase-DS',
    'AR': 'phase-A',
    'SC': 'phase-neutral'
  };
  return phaseMap[phase] || 'phase-neutral';
}

/**
 * 获取方向对应的图标
 */
function getDirectionIcon(direction) {
  const iconMap = {
    'LONG': '📈 做多',
    'SHORT': '📉 做空',
    'NEUTRAL': '➡️ 中性'
  };
  return iconMap[direction] || '➡️';
}

/**
 * 初始化视图切换按钮事件
 */
export function initViewToggleButtons() {
  const btnTable = document.getElementById('btnTable');
  const btnChart = document.getElementById('btnChart');

  if (btnTable) {
    btnTable.addEventListener('click', () => toggleViewMode('table'));
  }

  if (btnChart) {
    btnChart.addEventListener('click', () => toggleViewMode('chart'));
  }

  logger.debug('View toggle buttons initialized');
}
