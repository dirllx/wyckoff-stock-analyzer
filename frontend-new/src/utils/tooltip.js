/**
 * Tooltip 提示系统
 * 从旧版本移植的悬停提示功能
 */

/**
 * Tooltip 状态
 */
const tooltipState = {
  element: null,
  timeoutId: null,
  showDelay: 300, // 延迟显示时间(ms)
  hideDelay: 100  // 延迟隐藏时间(ms)
};

/**
 * 创建或获取tooltip元素
 * @returns {HTMLElement} tooltip元素
 */
function getTooltipElement() {
  let tooltip = document.getElementById('wyckoff-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'wyckoff-tooltip';
    tooltip.className = 'wyckoff-tooltip';
    document.body.appendChild(tooltip);
  }
  return tooltip;
}

/**
 * 显示tooltip
 * @param {HTMLElement|Event} target - 目标元素或事件对象
 * @param {string} text - 提示文本
 * @param {Object} options - 选项
 */
export function showTooltip(target, text, options = {}) {
  if (!text) return;

  const tooltip = getTooltipElement();

  // 清除之前的定时器
  if (tooltipState.timeoutId) {
    clearTimeout(tooltipState.timeoutId);
  }

  // 延迟显示
  tooltipState.timeoutId = setTimeout(() => {
    // 获取目标元素
    let targetElement;
    let x, y;

    if (target instanceof Event) {
      targetElement = target.target;
      x = target.clientX;
      y = target.clientY;
    } else if (target instanceof HTMLElement) {
      targetElement = target;
      const rect = targetElement.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top;
    } else {
      return;
    }

    // 设置内容（支持多行，用|分隔）
    const lines = text.split('|').map(line => line.trim());
    tooltip.innerHTML = lines.map((line, i) => {
      if (i === 0) {
        return `<div class="tooltip-title">${line}</div>`;
      }
      return `<div class="tooltip-line">${line}</div>`;
    }).join('');

    // 显示
    tooltip.classList.add('tooltip-visible');

    // 计算位置
    const tooltipRect = tooltip.getBoundingClientRect();
    const padding = 8;

    // 默认显示在目标上方
    let top = y - tooltipRect.height - padding;
    let left = x - tooltipRect.width / 2;

    // 如果上方空间不足，显示在下方
    if (top < padding) {
      top = y + padding + 10;
    }

    // 如果左侧空间不足，向右调整
    if (left < padding) {
      left = padding;
    }

    // 如果右侧空间不足，向左调整
    if (left + tooltipRect.width > window.innerWidth - padding) {
      left = window.innerWidth - tooltipRect.width - padding;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;

    tooltipState.element = targetElement;
  }, tooltipState.showDelay);
}

/**
 * 隐藏tooltip
 */
export function hideTooltip() {
  if (tooltipState.timeoutId) {
    clearTimeout(tooltipState.timeoutId);
  }

  tooltipState.timeoutId = setTimeout(() => {
    const tooltip = document.getElementById('wyckoff-tooltip');
    if (tooltip) {
      tooltip.classList.remove('tooltip-visible');
    }
    tooltipState.element = null;
  }, tooltipState.hideDelay);
}

/**
 * 为元素添加tooltip
 * @param {HTMLElement} element - 目标元素
 * @param {string} text - 提示文本
 */
export function addTooltip(element, text) {
  if (!element || !text) return;

  element.setAttribute('data-tooltip', text);
  element.classList.add('tooltip-target');

  // 移除旧的事件监听器
  element.removeEventListener('mouseenter', tooltipMouseEnter);
  element.removeEventListener('mouseleave', tooltipMouseLeave);

  // 添加新的事件监听器
  element.addEventListener('mouseenter', tooltipMouseEnter);
  element.addEventListener('mouseleave', tooltipMouseLeave);
}

/**
 * 鼠标进入事件处理
 */
function tooltipMouseEnter(event) {
  const text = event.target.getAttribute('data-tooltip');
  if (text) {
    showTooltip(event, text);
  }
}

/**
 * 鼠标离开事件处理
 */
function tooltipMouseLeave() {
  hideTooltip();
}

/**
 * 初始化页面中的所有tooltip
 */
export function initTooltips() {
  const tooltipTargets = document.querySelectorAll('[data-tooltip]');
  tooltipTargets.forEach(element => {
    element.addEventListener('mouseenter', tooltipMouseEnter);
    element.addEventListener('mouseleave', tooltipMouseLeave);
  });
}

/**
 * 清理tooltip
 */
export function destroyTooltip() {
  const tooltip = document.getElementById('wyckoff-tooltip');
  if (tooltip) {
    tooltip.remove();
  }
}

/**
 * 设置tooltip延迟时间
 * @param {number} showDelay - 显示延迟
 * @param {number} hideDelay - 隐藏延迟
 */
export function setTooltipDelay(showDelay, hideDelay) {
  if (showDelay !== undefined) tooltipState.showDelay = showDelay;
  if (hideDelay !== undefined) tooltipState.hideDelay = hideDelay;
}

/**
 * 获取tooltip状态
 * @returns {Object} tooltip状态
 */
export function getTooltipState() {
  return { ...tooltipState };
}

// 默认导出
export default {
  showTooltip,
  hideTooltip,
  addTooltip,
  initTooltips,
  destroyTooltip,
  setTooltipDelay,
  getTooltipState
};
