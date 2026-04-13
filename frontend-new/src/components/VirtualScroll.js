/**
 * 虚拟滚动组件
 * 只渲染可见区域的行，大幅减少DOM节点数
 */

import { logger } from '../utils/logger.js';
import { throttle } from '../utils/performance.js';

/**
 * 虚拟滚动类
 * 适用于大数据量表格（1000+行）的性能优化
 */
export class VirtualScroll {
  /**
   * @param {HTMLElement} container - 滚动容器
   * @param {Object} options - 配置选项
   * @param {number} options.rowHeight - 每行高度（像素），默认30
   * @param {number} options.bufferRows - 缓冲行数，默认5
   * @param {Function} options.renderRow - 行渲染函数 (item, index) => HTML string
   * @param {Function} options.renderHeader - 表头渲染函数 () => HTML string
   * @param {Function} options.onRowClick - 行点击回调 (index, item) => void
   */
  constructor(container, options = {}) {
    if (!container) {
      logger.error('VirtualScroll: container is null');
      return;
    }

    this.container = container;
    this.rowHeight = options.rowHeight || 30;
    this.bufferRows = options.bufferRows || 5;
    this.renderRow = options.renderRow || (() => '');
    this.renderHeader = options.renderHeader || null;
    this.onRowClick = options.onRowClick || null;

    this.data = [];
    this.visibleStart = 0;
    this.visibleEnd = 0;
    this.headerHeight = 0;
    this.containerHeight = 0;

    // 绑定滚动事件（节流）
    this._onScroll = throttle(() => this._updateVisibleRows(), 16);
    this._onResize = throttle(() => this._handleResize(), 100);

    this.container.addEventListener('scroll', this._onScroll);
    window.addEventListener('resize', this._onResize);

    this._init();
  }

  /**
   * 初始化容器结构
   */
  _init() {
    this.container.style.overflow = 'auto';
    this.container.style.position = 'relative';

    // 查找table（单一table，thead用sticky固定）
    const table = this.container.querySelector('.kline-table');
    if (table) {
      this.contentEl = table;
      this.tbodyEl = table.querySelector('.virtual-tbody') || table.querySelector('tbody');
      if (!this.tbodyEl) {
        this.tbodyEl = document.createElement('tbody');
        this.tbodyEl.className = 'virtual-tbody';
        this.contentEl.appendChild(this.tbodyEl);
      }
    } else {
      // 如果没有table，创建一个
      this.contentEl = document.createElement('table');
      this.contentEl.className = 'kline-table';
      this.contentEl.style.cssText = 'width: 100%; max-width: 100%; border-collapse: collapse; font-size: 12px; table-layout: auto;';
      this.container.appendChild(this.contentEl);

      this.tbodyEl = document.createElement('tbody');
      this.tbodyEl.className = 'virtual-tbody';
      this.contentEl.appendChild(this.tbodyEl);
    }
  }

  /**
   * 设置数据
   * @param {Array} data - 数据数组
   */
  setData(data) {
    this.data = data || [];
    this.containerHeight = this.container.clientHeight || 600; // 默认高度防止为0

    // 重置滚动位置
    this.container.scrollTop = 0;
    this.visibleStart = 0;

    // 设置总高度 - 使用tbody的最小高度来创建滚动空间
    const totalHeight = this.data.length * this.rowHeight;
    this.tbodyEl.style.minHeight = `${totalHeight}px`;
    this.tbodyEl.style.height = 'auto';

    // 延迟渲染，确保DOM完成布局
    requestAnimationFrame(() => {
      // 重新获取容器高度
      this.containerHeight = this.container.clientHeight || 600;
      this._updateVisibleRows();
    });

    logger.debug('VirtualScroll: data set', { count: this.data.length });
  }

  /**
   * 更新表头
   */
  _updateHeader() {
    if (!this.renderHeader) return;

    // 移除旧表头
    const oldHeader = this.container.querySelector('.vs-header');
    if (oldHeader) oldHeader.remove();

    const headerEl = document.createElement('div');
    headerEl.className = 'vs-header';
    headerEl.innerHTML = this.renderHeader();
    headerEl.style.position = 'sticky';
    headerEl.style.top = '0';
    headerEl.style.zIndex = '10';
    headerEl.style.backgroundColor = 'var(--bg-secondary, #111827)';

    this.container.insertBefore(headerEl, this.contentEl);
    this.headerHeight = headerEl.offsetHeight;
  }

  /**
   * 更新可见行
   */
  _updateVisibleRows() {
    if (this.data.length === 0) return;

    const scrollTop = this.container.scrollTop;
    const viewHeight = this.containerHeight;

    // 计算可见范围（含缓冲区）
    const start = Math.max(0, Math.floor(scrollTop / this.rowHeight) - this.bufferRows);
    const end = Math.min(
      this.data.length,
      Math.ceil((scrollTop + viewHeight) / this.rowHeight) + this.bufferRows
    );

    // 如果范围没变，跳过渲染
    if (start === this.visibleStart && end === this.visibleEnd) return;

    this.visibleStart = start;
    this.visibleEnd = end;

    // 构建HTML
    let html = '';
    for (let i = start; i < end; i++) {
      html += this.renderRow(this.data[i], i);
    }

    // 渲染行
    this.tbodyEl.innerHTML = html;

    // 使用padding-top来定位（替代表格总高度）
    this.tbodyEl.style.paddingTop = `${start * this.rowHeight}px`;
    this.tbodyEl.style.boxSizing = 'border-box';

    // 绑定行点击事件
    if (this.onRowClick) {
      const rows = this.tbodyEl.querySelectorAll('[data-index]');
      rows.forEach(row => {
        row.addEventListener('click', () => {
          const index = parseInt(row.dataset.index, 10);
          if (index >= 0 && index < this.data.length) {
            this.onRowClick(index, this.data[index]);
          }
        });
      });
    }
  }

  /**
   * 处理容器大小变化
   */
  _handleResize() {
    this.containerHeight = this.container.clientHeight || 600;
    this._updateVisibleRows();
  }

  /**
   * 滚动到指定行
   * @param {number} index - 行索引
   */
  scrollToRow(index) {
    if (index < 0 || index >= this.data.length) return;
    this.container.scrollTop = index * this.rowHeight;
  }

  /**
   * 滚动到顶部
   */
  scrollToTop() {
    this.container.scrollTop = 0;
  }

  /**
   * 销毁组件，清理事件监听
   */
  destroy() {
    this.container.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('resize', this._onResize);
    this.container.innerHTML = '';
    logger.debug('VirtualScroll: destroyed');
  }
}

export default VirtualScroll;
