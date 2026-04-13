/**
 * 区域编号标识工具
 * 用于前端布局优化时的临时区域编号
 */

import { logger } from './logger.js';

/**
 * 区域定义
 */
const ZONES = [
  { id: 1, name: '头部区域', selector: '.app-header' },
  { id: 2, name: '输入栏', selector: '.stock-input-bar' },
  { id: 3, name: '快捷操作', selector: '.quick-actions' },
  { id: 4, name: '分析结果', selector: '#analyzeResult' },
  { id: 5, name: 'K线图表', selector: '#chartMode' },
  { id: 6, name: 'K线表格', selector: '#tableMode' },
  { id: 7, name: '多周期分析', selector: '#tab-multi' },
  { id: 8, name: '我的关注', selector: '#tab-watchlist' },
  { id: 9, name: '系统配置', selector: '#tab-config' },
  { id: 10, name: '操作日志', selector: '#operationLogContainer' }
];

/**
 * 是否已显示编号
 */
let labelsVisible = false;

/**
 * 创建编号标签元素
 */
function createLabel(zone) {
  const label = document.createElement('div');
  label.className = 'zone-label';
  label.dataset.zoneId = zone.id;
  label.innerHTML = `
    <span class="zone-label-number">${zone.id}</span>
    <span class="zone-label-name">${zone.name}</span>
  `;
  return label;
}

/**
 * 显示区域编号
 */
export function showZoneLabels() {
  if (labelsVisible) {
    logger.info('Zone labels already visible');
    return;
  }

  logger.info('Showing zone labels');

  // 添加样式
  if (!document.getElementById('zone-labels-style')) {
    const style = document.createElement('style');
    style.id = 'zone-labels-style';
    style.textContent = `
      .zone-label {
        position: absolute;
        top: -8px;
        left: -8px;
        z-index: 99999;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: white;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 700;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        display: flex;
        align-items: center;
        gap: 6px;
        pointer-events: none;
        animation: zoneLabelPulse 2s ease-in-out infinite;
      }
      .zone-label-number {
        background: rgba(255, 255, 255, 0.3);
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
      }
      .zone-label-name {
        font-size: 11px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }
      @keyframes zoneLabelPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
    `;
    document.head.appendChild(style);
  }

  // 为每个区域添加标签
  ZONES.forEach(zone => {
    const element = document.querySelector(zone.selector);
    if (element) {
      // 确保元素有相对定位
      const position = window.getComputedStyle(element).position;
      if (position === 'static') {
        element.style.position = 'relative';
      }

      // 检查是否已有标签
      if (!element.querySelector('.zone-label')) {
        const label = createLabel(zone);
        element.appendChild(label);
        logger.debug(`Added label for zone ${zone.id}: ${zone.name}`);
      }
    } else {
      logger.warn(`Zone not found: ${zone.name} (${zone.selector})`);
    }
  });

  labelsVisible = true;

  // 打印区域列表到控制台
}

/**
 * 隐藏区域编号
 */
export function hideZoneLabels() {
  if (!labelsVisible) {
    return;
  }

  logger.info('Hiding zone labels');

  // 移除所有标签
  document.querySelectorAll('.zone-label').forEach(label => {
    label.remove();
  });

  labelsVisible = false;
}

/**
 * 切换编号显示
 */
export function toggleZoneLabels() {
  if (labelsVisible) {
    hideZoneLabels();
    return false;
  } else {
    showZoneLabels();
    return true;
  }
}

/**
 * 根据编号获取区域信息
 */
export function getZoneInfo(zoneId) {
  return ZONES.find(z => z.id === zoneId);
}

/**
 * 获取所有区域列表
 */
export function getAllZones() {
  return [...ZONES];
}

/**
 * 按名称查找区域
 */
export function findZoneByName(name) {
  return ZONES.find(z => z.name.includes(name));
}

// 添加到 window 对象以便控制台调用
if (typeof window !== 'undefined') {
  window.zoneLabels = {
    show: showZoneLabels,
    hide: hideZoneLabels,
    toggle: toggleZoneLabels,
    list: getAllZones,
    info: getZoneInfo
  };
  logger.info('💡 区域编号工具已加载。使用 zoneLabels.show() 显示编号，zoneLabels.hide() 隐藏编号');
}

export default {
  showZoneLabels,
  hideZoneLabels,
  getZoneInfo,
  getAllZones,
  findZoneByName
};
