/**
 * 模态框/弹窗工具
 * 用于显示详细行情数据
 */

/**
 * 创建元素的辅助函数
 * @param {string} tag - HTML标签名
 * @param {object} options - 选项 {className, style, text, innerHTML}
 * @returns {HTMLElement} 创建的元素
 */
function createElement(tag, options = {}) {
  const el = document.createElement(tag);
  if (options.className) el.className = options.className;
  if (options.style) el.style.cssText = options.style;
  if (options.text) el.textContent = options.text;
  if (options.innerHTML) el.innerHTML = options.innerHTML;
  return el;
}

/**
 * 模态框管理器
 */
class ModalManager {
  constructor() {
    this.currentModal = null;
    this.modalContainer = null;
    this.init();
  }

  init() {
    // 创建模态框容器
    this.modalContainer = document.createElement('div');
    this.modalContainer.id = 'modal-container';
    this.modalContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 9999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    `;

    // 添加到页面
    document.body.appendChild(this.modalContainer);

    // 绑定关闭事件
    this.modalContainer.addEventListener('click', (e) => {
      if (e.target === this.modalContainer) {
        this.close();
      }
    });

    // ESC 键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentModal) {
        this.close();
      }
    });
  }

  /**
   * 显示模态框
   * @param {object} options - 模态框选项
   */
  show(options) {
    const {
      title = '详情',
      content = '',
      width = '600px',
      maxWidth = '90vw',
      className = ''
    } = options;

    // 创建遮罩层
    const overlay = createElement('div', {
      className: 'modal-overlay',
      style: `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 23, 42, 0.9);
        backdrop-filter: blur(4px);
      `
    });

    // 创建模态框内容
    const modal = createElement('div', {
      className: `modal-content ${className}`,
      style: `
        position: relative;
        width: ${width};
        max-width: ${maxWidth};
        max-height: 90vh;
        overflow-y: auto;
        background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
        border: 1px solid #334155;
        border-radius: 16px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        animation: modalIn 0.3s ease-out;
      `
    });

    // 创建头部
    const header = createElement('div', {
      className: 'modal-header',
      style: `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid #334155;
      `
    });

    const titleEl = createElement('h3', {
      className: 'modal-title',
      style: `
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: #f1f5f9;
      `,
      text: title
    });

    const closeBtn = createElement('button', {
      className: 'modal-close',
      style: `
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        border-radius: 8px;
        transition: all 0.2s;
      `,
      innerHTML: '✕'
    });

    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    // 创建内容区域
    const bodyEl = createElement('div', {
      className: 'modal-body',
      style: `
        padding: 24px;
        color: #f1f5f9;
      `,
      innerHTML: content
    });

    // 组装模态框
    modal.appendChild(header);
    modal.appendChild(bodyEl);
    overlay.appendChild(modal);
    this.modalContainer.appendChild(overlay);

    // 显示
    this.modalContainer.style.display = 'flex';
    this.currentModal = { overlay, modal, closeBtn };

    // 防止页面滚动
    document.body.style.overflow = 'hidden';
  }

  /**
   * 关闭模态框
   */
  close() {
    if (this.currentModal) {
      const { overlay } = this.currentModal;
      overlay.style.animation = 'fadeOut 0.2s ease-out forwards';

      setTimeout(() => {
        this.modalContainer.innerHTML = '';
        this.modalContainer.style.display = 'none';
        this.currentModal = null;
        document.body.style.overflow = '';
      }, 200);
    }
  }
}

// 全局实例
const modalManager = new ModalManager();

/**
 * 显示行情详情弹窗
 * @param {object} quote - K线数据
 * @param {object} analysis - 分析数据
 */
export function showQuoteDetailModal(quote, analysis = null) {
  if (!quote) return;

  const { formatNumber, formatVolume, formatPercent, getChangeColor, createSignalBadge, createPhaseBadge } =
    window.Formatting || require('./formatting.js');

  const prevClose = quote.prev_close || quote.open;
  const change = quote.close - prevClose;
  const changePercent = (change / prevClose * 100);
  const changeColor = getChangeColor(quote.close, prevClose);

  let content = `
    <div class="quote-detail">
      <!-- 基本信息 -->
      <div class="detail-section">
        <h4 class="detail-section-title">基本信息</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">股票代码</span>
            <span class="detail-value">${quote.code || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">日期</span>
            <span class="detail-value">${quote.date || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">时间</span>
            <span class="detail-value">${quote.time || '-'}</span>
          </div>
        </div>
      </div>

      <!-- OHLC 价格 -->
      <div class="detail-section">
        <h4 class="detail-section-title">价格信息</h4>
        <div class="price-grid">
          <div class="price-item">
            <span class="price-label">开盘</span>
            <span class="price-value">${formatNumber(quote.open, 2)}</span>
          </div>
          <div class="price-item">
            <span class="price-label">最高</span>
            <span class="price-value price-high">${formatNumber(quote.high, 2)}</span>
          </div>
          <div class="price-item">
            <span class="price-label">最低</span>
            <span class="price-value price-low">${formatNumber(quote.low, 2)}</span>
          </div>
          <div class="price-item">
            <span class="price-label">收盘</span>
            <span class="price-value" style="color: ${changeColor}">${formatNumber(quote.close, 2)}</span>
          </div>
        </div>
        <div class="price-change">
          <span class="change-value" style="color: ${changeColor}">
            ${change >= 0 ? '+' : ''}${formatNumber(change, 2)}
          </span>
          <span class="change-percent" style="color: ${changeColor}">
            (${formatPercent(changePercent)})
          </span>
        </div>
      </div>

      <!-- 成交量 -->
      <div class="detail-section">
        <h4 class="detail-section-title">成交量</h4>
        <div class="volume-info">
          <div class="volume-item">
            <span class="volume-label">成交量</span>
            <span class="volume-value">${formatVolume(quote.volume)}</span>
          </div>
          <div class="volume-item">
            <span class="volume-label">成交额</span>
            <span class="volume-value">${formatVolume(quote.amount || 0)}</span>
          </div>
        </div>
      </div>

      <!-- MA 均线 -->
      <div class="detail-section">
        <h4 class="detail-section-title">均线指标</h4>
        <div class="ma-grid">
          <div class="ma-item">
            <span class="ma-label">MA5</span>
            <span class="ma-value">${formatNumber(quote.ma5, 2)}</span>
          </div>
          <div class="ma-item">
            <span class="ma-label">MA10</span>
            <span class="ma-value">${formatNumber(quote.ma10, 2)}</span>
          </div>
          <div class="ma-item">
            <span class="ma-label">MA20</span>
            <span class="ma-value">${formatNumber(quote.ma20, 2)}</span>
          </div>
          <div class="ma-item">
            <span class="ma-label">MA60</span>
            <span class="ma-value">${formatNumber(quote.ma60, 2)}</span>
          </div>
        </div>
      </div>

      <!-- 其他指标 -->
      <div class="detail-section">
        <h4 class="detail-section-title">技术指标</h4>
        <div class="indicator-grid">
          <div class="indicator-item">
            <span class="indicator-label">OBV</span>
            <span class="indicator-value">${formatVolume(quote.obv || 0)}</span>
          </div>
          <div class="indicator-item">
            <span class="indicator-label">量比</span>
            <span class="indicator-value">${quote.volume_ratio ? quote.volume_ratio.toFixed(2) : '-'}</span>
          </div>
        </div>
      </div>
  `;

  // 如果有分析数据，添加分析信息
  if (analysis) {
    content += `
      <!-- 分析结果 -->
      <div class="detail-section">
        <h4 class="detail-section-title">威科夫分析</h4>
        <div class="analysis-info">
          <div class="analysis-item">
            <span class="analysis-label">方向</span>
            ${createSignalBadge(analysis.direction || 'NEUTRAL', analysis.score)}
          </div>
          <div class="analysis-item">
            <span class="analysis-label">阶段</span>
            ${createPhaseBadge(analysis.wyckoff_phase || '震荡')}
          </div>
          <div class="analysis-item">
            <span class="analysis-label">评分</span>
            ${createScoreBadge(analysis.score || 0)}
          </div>
          <div class="analysis-item">
            <span class="analysis-label">建议</span>
            <span class="analysis-suggestion">${analysis.suggestion || '-'}</span>
          </div>
        </div>
      </div>
    `;
  }

  content += `
      <style>
        .quote-detail {
          font-size: 14px;
        }
        .detail-section {
          margin-bottom: 20px;
        }
        .detail-section:last-child {
          margin-bottom: 0;
        }
        .detail-section-title {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding-bottom: 8px;
          border-bottom: 1px solid #334155;
        }
        .detail-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .detail-label {
          font-size: 12px;
          color: #64748b;
        }
        .detail-value {
          font-size: 14px;
          font-weight: 600;
          color: #f1f5f9;
          font-family: 'SF Mono', monospace;
        }
        .price-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }
        .price-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px;
          background: rgba(30, 41, 59, 0.5);
          border-radius: 8px;
        }
        .price-label {
          font-size: 12px;
          color: #64748b;
        }
        .price-value {
          font-size: 14px;
          font-weight: 600;
          color: #f1f5f9;
          font-family: 'SF Mono', monospace;
        }
        .price-high {
          color: #22c55e;
        }
        .price-low {
          color: #ef4444;
        }
        .price-change {
          display: flex;
          justify-content: center;
          gap: 12px;
          padding: 8px;
          background: rgba(30, 41, 59, 0.5);
          border-radius: 8px;
        }
        .change-value {
          font-size: 16px;
          font-weight: 700;
        }
        .change-percent {
          font-size: 14px;
        }
        .volume-info {
          display: flex;
          gap: 24px;
        }
        .volume-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .volume-label {
          font-size: 12px;
          color: #64748b;
        }
        .volume-value {
          font-size: 14px;
          font-weight: 600;
          color: #f1f5f9;
          font-family: 'SF Mono', monospace;
        }
        .ma-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        .ma-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px;
          background: rgba(30, 41, 59, 0.5);
          border-radius: 8px;
        }
        .ma-label {
          font-size: 12px;
          color: #64748b;
        }
        .ma-value {
          font-size: 13px;
          font-weight: 600;
          color: #f1f5f9;
          font-family: 'SF Mono', monospace;
        }
        .indicator-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        .indicator-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 8px;
          background: rgba(30, 41, 59, 0.5);
          border-radius: 8px;
        }
        .indicator-label {
          font-size: 12px;
          color: #64748b;
        }
        .indicator-value {
          font-size: 14px;
          font-weight: 600;
          color: #f1f5f9;
          font-family: 'SF Mono', monospace;
        }
        .analysis-info {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .analysis-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .analysis-label {
          font-size: 12px;
          color: #64748b;
        }
        .analysis-suggestion {
          font-size: 14px;
          font-weight: 500;
          color: #f1f5f9;
          line-height: 1.5;
        }
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes fadeOut {
          to {
            opacity: 0;
          }
        }
      </style>
    </div>
  `;

  modalManager.show({
    title: `${quote.code || ''} - 行情详情`,
    content: content
  });
}

export default modalManager;
