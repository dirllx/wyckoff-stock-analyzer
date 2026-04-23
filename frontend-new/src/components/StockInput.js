/**
 * 股票代码输入组件
 * 包含输入框、搜索建议和历史记录
 */

import { eventBus, Events } from '../config.js';
import { logger } from '../utils/logger.js';

export class StockInput {
  static HISTORY_KEY = 'stock_code_history';
  static MAX_HISTORY = 10;

  /**
   * 初始化组件
   */
  static init() {
    // 填充datalist
    this.updateDataList();

    // 监听历史记录变化
    eventBus.on(Events.STOCK_ANALYZED, (data) => {
      if (data?.code) {
        this.addToHistory(data.code);
        this.updateDataList();
      }
    });

    logger.debug('StockInput initialized');
  }

  /**
   * 更新datalist
   */
  static updateDataList() {
    const datalist = document.getElementById('stockHistory');
    if (!datalist) return;

    const history = this.getHistory();
    datalist.innerHTML = history.map(code =>
      `<option value="${code}">`
    ).join('');

    logger.debug('StockInput datalist updated:', history.length, 'items');
  }

  /**
   * 获取历史记录
   */
  static getHistory() {
    try {
      return JSON.parse(localStorage.getItem(this.HISTORY_KEY) || '[]');
    } catch {
      return [];
    }
  }

  /**
   * 添加到历史记录
   */
  static addToHistory(code) {
    if (!code || code.trim() === '') return;

    const cleanCode = code.trim().toUpperCase();
    let history = this.getHistory();

    // 移除已存在的，去重
    history = history.filter(c => c !== cleanCode);

    // 添加到最前面
    history.unshift(cleanCode);

    // 限制数量
    if (history.length > this.MAX_HISTORY) {
      history = history.slice(0, this.MAX_HISTORY);
    }

    try {
      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
      // 更新datalist
      this.updateDataList();
    } catch (error) {
      logger.warn('Failed to save stock history:', error);
    }
  }

  /**
   * 清空历史记录
   */
  static clearHistory() {
    try {
      localStorage.removeItem(this.HISTORY_KEY);
    } catch (error) {
      logger.warn('Failed to clear stock history:', error);
    }
  }

  /**
   * 渲染快速选择器HTML
   */
  static renderQuickSelect() {
    const history = this.getHistory();

    if (history.length === 0) {
      return '';
    }

    const buttons = history.map(code =>
      `<button class="quick-select-btn" data-code="${code}" title="快速选择">${code}</button>`
    ).join('');

    return `
      <div class="stock-quick-select">
        <span class="quick-select-label">最近:</span>
        <div class="quick-select-buttons">${buttons}</div>
      </div>
    `;
  }

  /**
   * 绑定快速选择事件
   */
  static bindQuickSelectEvents(onSelect) {
    const container = document.querySelector('.stock-quick-select');
    if (!container) return;

    const buttons = container.querySelectorAll('.quick-select-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const code = e.target.dataset.code;
        if (code && onSelect) {
          onSelect(code);
        }
      });
    });
  }

  /**
   * 更新快速选择器显示
   */
  static updateQuickSelect() {
    const container = document.querySelector('.stock-quick-select');
    if (!container) return;

    const inputContainer = container.closest('.input-wrapper')?.parentElement;
    if (!inputContainer) return;

    // 移除旧的快速选择器
    const oldQuickSelect = inputContainer.querySelector('.stock-quick-select');
    if (oldQuickSelect) {
      oldQuickSelect.remove();
    }

    // 添加新的快速选择器
    const quickSelectHTML = this.renderQuickSelect();
    if (quickSelectHTML) {
      inputContainer.insertAdjacentHTML('beforeend', quickSelectHTML);
    }

    // 重新绑定事件
    const inputElement = inputContainer.querySelector('#stockCode');
    if (inputElement) {
      this.bindQuickSelectEvents((code) => {
        inputElement.value = code;
        // 触发分析
        const event = new Event('change');
        inputElement.dispatchEvent(event);
      });
    }
  }
}

export default StockInput;
