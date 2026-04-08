/**
 * K线预测组件 - HTML模板
 * 负责生成预测卡片的HTML渲染和显示辅助方法
 */

export class PredictionTemplate {
  /**
   * 获取方向显示名称
   * @param {string} direction - 方向代码
   * @returns {string} 显示名称
   */
  static getDirectionDisplayName(direction) {
    const names = {
      'UP': '上涨',
      'DOWN': '下跌',
      'SIDEWAYS': '横盘'
    };
    return names[direction] || '未知';
  }

  /**
   * 获取方向图标
   * @param {string} direction - 方向代码
   * @returns {string} 图标
   */
  static getDirectionIcon(direction) {
    const icons = {
      'UP': '📈',
      'DOWN': '📉',
      'SIDEWAYS': '➡️'
    };
    return icons[direction] || '❓';
  }

  /**
   * 获取方向颜色
   * @param {string} direction - 方向代码
   * @returns {string} 颜色变量
   */
  static getDirectionColor(direction) {
    const colors = {
      'UP': 'var(--color-success)',
      'DOWN': 'var(--color-error)',
      'SIDEWAYS': 'var(--color-tertiary)'
    };
    return colors[direction] || 'var(--color-text-secondary)';
  }

  /**
   * 获取置信度等级
   * @param {number} confidence - 置信度（0-1）
   * @returns {string} 等级
   */
  static getConfidenceLevel(confidence) {
    if (confidence >= 0.7) return '强烈';
    if (confidence >= 0.5) return '中等';
    if (confidence >= 0.3) return '较弱';
    return '低';
  }

  /**
   * 获取置信度等级颜色
   * @param {string} level - 等级
   * @returns {string} 颜色变量
   */
  static getConfidenceLevelColor(level) {
    const colors = {
      '强烈': 'var(--color-success)',
      '中等': 'var(--color-primary)',
      '较弱': 'var(--color-warning)',
      '低': 'var(--color-error)'
    };
    return colors[level] || 'var(--color-text-secondary)';
  }

  /**
   * 生成预测卡片HTML
   * @param {Array} predictions - 预测数据数组
   * @returns {string} HTML字符串
   */
  static generatePredictionCardHTML(predictions) {
    if (!predictions || predictions.length === 0) {
      return this.generateEmptyStateHTML();
    }

    const firstPrediction = predictions[0];
    const direction = firstPrediction.direction;
    const icon = this.getDirectionIcon(direction);
    const directionName = this.getDirectionDisplayName(direction);
    const directionColor = this.getDirectionColor(direction);
    const confidence = firstPrediction.confidence;
    const confidenceLevel = this.getConfidenceLevel(confidence);
    const confidenceColor = this.getConfidenceLevelColor(confidenceLevel);

    return `
      <div class="prediction-card">
        <div class="prediction-header">
          <h3 class="prediction-title">K线预测</h3>
          <div class="prediction-direction" style="color: ${directionColor}">
            <span class="prediction-icon">${icon}</span>
            <span class="prediction-text">${directionName}</span>
          </div>
        </div>

        <div class="prediction-body">
          <div class="prediction-summary">
            <div class="prediction-summary-item">
              <span class="prediction-label">预测方向</span>
              <span class="prediction-value" style="color: ${directionColor}">
                ${icon} ${directionName}
              </span>
            </div>
            <div class="prediction-summary-item">
              <span class="prediction-label">置信度</span>
              <span class="prediction-value" style="color: ${confidenceColor}">
                ${Math.round(confidence * 100)}% (${confidenceLevel})
              </span>
            </div>
          </div>

          <div class="prediction-table-container">
            <table class="prediction-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>开盘</th>
                  <th>最高</th>
                  <th>最低</th>
                  <th>收盘</th>
                  <th>成交量</th>
                  <th>置信度</th>
                </tr>
              </thead>
              <tbody>
                ${predictions.map((p, index) => {
                  const date = new Date(p.time * 1000);
                  const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
                  const confLevel = this.getConfidenceLevel(p.confidence);
                  const confColor = this.getConfidenceLevelColor(confLevel);

                  return `
                    <tr class="prediction-row ${index === 0 ? 'prediction-row-first' : ''}">
                      <td>${dateStr}</td>
                      <td>${p.open.toFixed(2)}</td>
                      <td>${p.high.toFixed(2)}</td>
                      <td>${p.low.toFixed(2)}</td>
                      <td>${p.close.toFixed(2)}</td>
                      <td>${(p.volume / 10000).toFixed(0)}万</td>
                      <td>
                        <span class="prediction-confidence" style="color: ${confColor}">
                          ${Math.round(p.confidence * 100)}%
                        </span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div class="prediction-footer">
            <p class="prediction-note">
              ⚠️ 预测仅供参考，不构成投资建议。实际走势可能受多种因素影响。
            </p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 生成空状态HTML
   * @returns {string} HTML字符串
   */
  static generateEmptyStateHTML() {
    return `
      <div class="prediction-empty">
        <div class="prediction-empty-icon">📊</div>
        <h3 class="prediction-empty-title">暂无预测</h3>
        <p class="prediction-empty-text">请先分析股票以生成K线预测</p>
      </div>
    `;
  }
}
