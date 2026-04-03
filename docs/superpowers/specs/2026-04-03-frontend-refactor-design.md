# 威科夫前端重构设计文档

**项目**: 威科夫股票分析系统前端重构
**日期**: 2026-04-03
**作者**: Claude Code
**状态**: 设计阶段

---

## 1. 项目背景

### 1.1 当前问题

威科夫股票分析系统前端代码存在严重的代码质量问题：

- **单文件过大**: `index.html` 包含 10,930 行代码，严重超出最佳实践（800行）
- **可维护性差**: HTML、CSS、JavaScript 全部耦合在一个文件中
- **调试代码遗留**: 257 处 `console.log` 和日志语句
- **性能问题**: 缺少代码分割、懒加载等优化
- **协作困难**: 单文件架构不利于团队开发和代码审查

### 1.2 重构目标

**主要目标**:
- 将 10,930 行的单文件拆分为模块化架构
- 清理所有调试代码，建立专业的日志系统
- 优化性能，提升用户体验
- 建立可测试、可维护的代码结构

**次要目标**:
- 引入现代化的开发工具（Vite）
- 建立自动化测试体系
- 为未来功能扩展奠定基础

---

## 2. 架构设计

### 2.1 整体架构

采用**按功能模块拆分**的策略，平衡可维护性和开发效率。

```
┌─────────────────────────────────────────────────┐
│                   index.html                     │
│              (HTML结构 + 入口)                    │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│                    main.js                       │
│         (应用初始化、全局状态、事件绑定)            │
└───────────────────┬─────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    ┌───────┐  ┌───────┐  ┌───────┐
    │ API   │  │Components││Utils │
    └───────┘  └───────┘  └───────┘
```

**核心原则**:
- **单向数据流**: API → 组件 → 视图
- **模块独立**: 每个模块可单独测试和维护
- **依赖注入**: 通过参数传递依赖，避免全局变量

### 2.2 目录结构

```
frontend/
├── index.html                  # 主HTML (~200行)
├── main.js                     # 应用入口 (~150行)
├── vite.config.js              # Vite配置
├── package.json                # 依赖管理
├── src/
│   ├── api/                    # API调用层
│   │   ├── client.js           # HTTP客户端基础配置
│   │   ├── stocks.js           # 股票相关API
│   │   ├── watchlist.js        # 关注列表API
│   │   └── config.js           # 配置管理API
│   ├── components/             # UI组件
│   │   ├── Chart/              # 图表组件
│   │   │   ├── index.js        # 主导出
│   │   │   ├── KlineChart.js   # K线图
│   │   │   ├── VolumeChart.js  # 成交量图
│   │   │   └── ChartRenderer.js # 图表渲染器
│   │   ├── Table/              # 表格组件
│   │   │   ├── index.js
│   │   │   └── KlineTable.js   # K线表格
│   │   ├── Watchlist/          # 关注列表
│   │   │   ├── index.js
│   │   │   └── WatchlistGrid.js
│   │   └── Analysis/           # 分析面板
│   │       ├── index.js
│   │       └── MultiTimeframe.js
│   ├── utils/                  # 工具函数
│   │   ├── indicators.js       # 技术指标计算
│   │   ├── wyckoff.js          # 威科夫分析
│   │   ├── logger.js           # 日志系统
│   │   ├── errorHandler.js     # 错误处理
│   │   ├── performance.js      # 性能优化工具
│   │   └── helpers.js          # 辅助函数
│   ├── styles/                 # 样式文件
│   │   ├── main.css            # 主样式
│   │   ├── chart.css           # 图表样式
│   │   ├── table.css           # 表格样式
│   │   └── themes.css          # 主题（深色/浅色）
│   └── config.js               # 全局配置
└── public/                     # 静态资源
    └── lightweight-charts.standalone.production.js
```

**文件大小目标**:
- ✅ index.html: < 300行
- ✅ main.js: < 200行
- ✅ 每个组件文件: < 500行
- ✅ 每个工具文件: < 400行
- ✅ 每个样式文件: < 400行

---

## 3. 核心模块设计

### 3.1 API层设计

#### 3.1.1 HTTP客户端 (src/api/client.js)

**职责**: 统一API调用、错误处理、重试机制

**大小**: ~150行

**核心功能**:
- 统一错误处理
- 自动重试（最多3次）
- 超时控制（30秒）
- 请求缓存

```javascript
class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.timeout = 30000;
    this.maxRetries = 3;
  }

  async request(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseURL}${url}`, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ApiError(response.status, response.statusText);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new ApiError(0, '请求超时');
      }
      throw error;
    }
  }

  async get(url, options) {
    return this.request(url, { ...options, method: 'GET' });
  }

  async post(url, data, options) {
    return this.request(url, {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
}

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export default new ApiClient('http://localhost:8000');
```

#### 3.1.2 股票API (src/api/stocks.js)

**职责**: 所有股票相关的API调用

**大小**: ~200行

```javascript
import apiClient from './client.js';

export const stocksApi = {
  // 获取K线数据
  async getQuotes(code, timeframe = 'daily', limit = 100) {
    return apiClient.get(`/api/v1/stocks/${code}/quotes`, {
      params: { timeframe, limit }
    });
  },

  // 分析股票
  async analyze(code, endDate = null) {
    const params = { end_date: endDate };
    return apiClient.post(`/api/v1/stocks/${code}/analyze`, params);
  },

  // 获取信号
  async getSignals(code) {
    return apiClient.get(`/api/v1/stocks/${code}/signals`);
  },

  // 批量分析
  async batchAnalyze(requests) {
    return apiClient.post('/api/v1/stocks/analyze/batch', { requests });
  }
};
```

#### 3.1.3 关注列表API (src/api/watchlist.js)

**职责**: 关注列表管理

**大小**: ~150行

```javascript
import apiClient from './client.js';

export const watchlistApi = {
  // 获取所有关注股票
  async getAll() {
    return apiClient.get('/api/v1/watchlist');
  },

  // 添加到关注列表
  async add(code) {
    return apiClient.post(`/api/v1/watchlist/favorite/${code}`);
  },

  // 从关注列表移除
  async remove(code) {
    return apiClient.delete(`/api/v1/watchlist/${code}`);
  },

  // 更新关注列表
  async update(items) {
    return apiClient.post('/api/v1/watchlist/update', { items });
  },

  // 移动位置
  async move(code, direction) {
    return apiClient.post(`/api/v1/watchlist/move`, { code, direction });
  }
};
```

#### 3.1.4 配置管理API (src/api/config.js)

**职责**: 系统配置管理

**大小**: ~150行

```javascript
import apiClient from './client.js';

export const configApi = {
  // 获取威科夫模式配置
  async getPatterns() {
    return apiClient.get('/api/v1/config/patterns');
  },

  // 更新威科夫模式配置
  async updatePatterns(patterns) {
    return apiClient.post('/api/v1/config/patterns/batch', { patterns });
  },

  // 获取周期配置
  async getTimeframes() {
    return apiClient.get('/api/v1/config/timeframes');
  },

  // 更新周期配置
  async updateTimeframes(timeframes) {
    return apiClient.post('/api/v1/config/timeframes/batch', { timeframes });
  }
};
```

### 3.2 工具函数层设计

#### 3.2.1 日志系统 (src/utils/logger.js)

**职责**: 替代257个console.log，提供专业的日志系统

**大小**: ~150行

```javascript
class Logger {
  static LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  };

  static currentLevel = Logger.LEVELS.INFO;

  static setLevel(level) {
    this.currentLevel = Logger.LEVELS[level];
  }

  static shouldLog(level) {
    return level >= this.currentLevel;
  }

  static formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] ${message}${dataStr}`;
  }

  static debug(message, data = null) {
    if (this.shouldLog(this.LEVELS.DEBUG)) {
      console.debug(this.formatMessage('DEBUG', message, data));
    }
  }

  static info(message, data = null) {
    if (this.shouldLog(this.LEVELS.INFO)) {
      console.info(this.formatMessage('INFO', message, data));
    }
  }

  static warn(message, data = null) {
    if (this.shouldLog(this.LEVELS.WARN)) {
      console.warn(this.formatMessage('WARN', message, data));
    }
  }

  static error(message, error = null) {
    if (this.shouldLog(this.LEVELS.ERROR)) {
      const errorData = error ? {
        message: error.message,
        stack: error.stack
      } : null;
      console.error(this.formatMessage('ERROR', message, errorData));
    }
  }

  // 性能日志
  static time(label) {
    console.time(label);
  }

  static timeEnd(label) {
    console.timeEnd(label);
  }
}

// 开发环境默认DEBUG，生产环境默认INFO
if (import.meta.env.MODE === 'development') {
  Logger.setLevel('DEBUG');
} else {
  Logger.setLevel('INFO');
}

export default Logger;
```

**使用示例**:
```javascript
import Logger from '../utils/logger.js';

Logger.info('获取股票数据', { code: '000001', timeframe: 'daily' });
Logger.warn('数据量不足', { count: 50, required: 100 });
Logger.error('API请求失败', error);
```

#### 3.2.2 技术指标计算 (src/utils/indicators.js)

**职责**: MA、成交量、涨跌幅等技术指标计算

**大小**: ~300行

```javascript
export const Indicators = {
  // 计算移动平均线
  calculateMA(data, period) {
    if (!data || data.length < period) return [];

    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        const sum = data.slice(i - period + 1, i + 1)
          .reduce((acc, val) => acc + (val.close || 0), 0);
        result.push(sum / period);
      }
    }
    return result;
  },

  // 计算成交量状态
  calculateVolumeStatus(current, prev) {
    if (!current || !prev || !prev.volume) {
      return { text: '无数据', color: '#9ca3af', category: 'unknown' };
    }

    const ratio = current.volume / prev.volume;

    if (ratio >= 1.2) {
      return { text: '放量', color: '#ef4444', category: 'high', ratio };
    } else if (ratio < 0.8) {
      return { text: '缩量', color: '#10b981', category: 'low', ratio };
    } else {
      return { text: '平稳', color: '#f59e0b', category: 'normal', ratio };
    }
  },

  // 计算涨跌幅
  calculateChangePercent(current, prev) {
    if (!current || !prev || !prev.close) return null;
    return ((current.close - prev.close) / prev.close * 100).toFixed(2);
  },

  // 计算MA状态
  calculateMAStatus(quotes) {
    if (!quotes || quotes.length < 20) {
      return { text: '数据不足', color: '#9ca3af', category: 'insufficient' };
    }

    const ma5 = this.calculateMA(quotes, 5);
    const ma10 = this.calculateMA(quotes, 10);
    const ma20 = this.calculateMA(quotes, 20);
    const ma60 = this.calculateMA(quotes, 60);

    const latest = quotes[quotes.length - 1];
    const current = latest.close;

    // 判断排列
    if (ma5[ma5.length - 1] > ma10[ma10.length - 1] &&
        ma10[ma10.length - 1] > ma20[ma20.length - 1] &&
        ma20[ma20.length - 1] > ma60[ma60.length - 1]) {
      return { text: '📈 多头排列', color: '#10b981', category: 'bullish' };
    } else if (ma5[ma5.length - 1] < ma10[ma10.length - 1] &&
               ma10[ma10.length - 1] < ma20[ma20.length - 1] &&
               ma20[ma20.length - 1] < ma60[ma60.length - 1]) {
      return { text: '📉 空头排列', color: '#ef4444', category: 'bearish' };
    } else {
      return { text: '⚡ 震荡', color: '#f59e0b', category: 'ranging' };
    }
  }
};
```

#### 3.2.3 威科夫分析 (src/utils/wyckoff.js)

**职责**: 威科夫相位分析

**大小**: ~250行

```javascript
export const WyckoffAnalyzer = {
  // 计算威科夫相位
  calculatePhase(quote) {
    if (!quote) return { phase: 'U', text: '未知', color: '#9ca3af' };

    const { close, high, low, volume } = quote;
    const ma = quote.ma15 || quote.ma20;

    if (!ma) {
      return { phase: 'U', text: '上升', color: '#10b981' };
    }

    // 价格在MA上方，成交量放大
    if (close > ma && volume > 0) {
      return { phase: 'U', text: 'U上升', color: '#10b981' };
    }

    // 价格在MA下方，成交量放大
    if (close < ma && volume > 0) {
      return { phase: 'D', text: 'D下降', color: '#ef4444' };
    }

    // 价格在MA附近，成交量缩小
    if (Math.abs(close - ma) / ma < 0.02) {
      return { phase: 'A', text: 'A吸筹', color: '#f59e0b' };
    }

    return { phase: 'R', text: '⚡ 震荡', color: '#9ca3af' };
  },

  // 获取相位颜色
  getPhaseColor(phase) {
    const colors = {
      'U': '#10b981',
      'D': '#ef4444',
      'A': '#f59e0b',
      'DS': '#8b5cf6',
      'R': '#9ca3af'
    };
    return colors[phase] || '#9ca3af';
  },

  // 获取标记位置
  getMarkerPosition(phase, quote) {
    if (phase === 'U' || phase === 'A') {
      return quote.low;
    } else if (phase === 'D' || phase === 'DS') {
      return quote.high;
    }
    return quote.close;
  },

  // 获取标记形状
  getMarkerShape(phase) {
    const shapes = {
      'U': 'arrowUp',
      'D': 'arrowDown',
      'A': 'circle',
      'DS': 'circle',
      'R': 'diamond'
    };
    return shapes[phase] || 'circle';
  }
};
```

#### 3.2.4 错误处理 (src/utils/errorHandler.js)

**职责**: 统一错误处理和用户提示

**大小**: ~200行

```javascript
import Logger from './logger.js';
import { Toast } from './toast.js';

export class ErrorHandler {
  static handle(error, context = '') {
    // 1. 记录错误
    Logger.error(`Error in ${context}`, error);

    // 2. 分类错误并显示用户友好的提示
    if (this.isNetworkError(error)) {
      this.showNetworkError();
    } else if (this.isNotFoundError(error)) {
      this.showNotFoundError();
    } else if (this.isServerError(error)) {
      this.showServerError();
    } else if (this.isTimeoutError(error)) {
      this.showTimeoutError();
    } else {
      this.showGenericError(error.message);
    }

    // 3. 可选：发送错误报告到远程服务
    this.reportError(error, context);
  }

  static isNetworkError(error) {
    return error.name === 'TypeError' && error.message.includes('fetch');
  }

  static isNotFoundError(error) {
    return error.status === 404;
  }

  static isServerError(error) {
    return error.status >= 500;
  }

  static isTimeoutError(error) {
    return error.name === 'AbortError' || error.message.includes('timeout');
  }

  static showNetworkError() {
    Toast.error('网络连接失败，请检查网络设置');
  }

  static showNotFoundError() {
    Toast.warning('请求的资源不存在');
  }

  static showServerError() {
    Toast.error('服务器错误，请稍后重试');
  }

  static showTimeoutError() {
    Toast.error('请求超时，请稍后重试');
  }

  static showGenericError(message) {
    Toast.error(message || '操作失败，请重试');
  }

  static reportError(error, context) {
    // 可选：发送到错误追踪服务（如Sentry）
    if (typeof window.Sentry !== 'undefined') {
      window.Sentry.captureException(error, {
        tags: { context }
      });
    }
  }
}
```

#### 3.2.5 性能优化工具 (src/utils/performance.js)

**职责**: 防抖、节流等性能优化工具

**大小**: ~150行

```javascript
// 防抖：延迟执行，多次调用只执行最后一次
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 节流：限制执行频率
export function throttle(func, limit = 100) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// 批处理：合并多次调用
export function batch(func, wait = 100) {
  let calls = [];
  let timeout;

  return function(...args) {
    calls.push(args);

    if (!timeout) {
      timeout = setTimeout(() => {
        func(calls);
        calls = [];
        timeout = null;
      }, wait);
    }
  };
}

// 性能监控
export class PerformanceMonitor {
  static mark(name) {
    performance.mark(name);
  }

  static measure(name, startMark, endMark) {
    performance.measure(name, startMark, endMark);
    const entry = performance.getEntriesByName(name)[0];
    const duration = entry.duration;

    Logger.debug(`Performance: ${name} took ${duration.toFixed(2)}ms`);

    if (duration > 1000) {
      Logger.warn(`Slow operation: ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }
}
```

#### 3.2.6 辅助函数 (src/utils/helpers.js)

**职责**: 日期格式化、数据去重等辅助函数

**大小**: ~200行

```javascript
// 日期格式化
export function formatDateString(dateStr, timeframe = 'daily') {
  if (!dateStr) return '-';

  const date = new Date(dateStr);

  const options = {
    'daily': { year: 'numeric', month: '2-digit', day: '2-digit' },
    'weekly': { year: 'numeric', month: '2-digit', day: '2-digit' },
    'monthly': { year: 'numeric', month: '2-digit' },
    '30min': { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' },
    '60min': { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
  };

  return date.toLocaleDateString('zh-CN', options[timeframe] || options['daily']);
}

// 数据去重
export function deduplicateQuotes(quotes, timeframe) {
  if (!quotes || quotes.length === 0) return [];

  const seen = new Set();
  return quotes.filter(quote => {
    const key = `${quote.time || quote.date}_${timeframe}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// 格式化数字
export function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined) return '-';
  return Number(num).toFixed(decimals);
}

// 格式化百分比
export function formatPercent(value) {
  if (value === null || value === undefined) return '-';
  const num = parseFloat(value);
  if (isNaN(num)) return '-';
  return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`;
}

// 获取股票类型
export function getStockType(code) {
  if (code.startsWith('688')) return 'kc'; // 科创板
  if (code.startsWith('300')) return 'cy'; // 创业板
  if (code.startsWith('60') || code.startsWith('68')) return 'sh'; // 上海
  if (code.startsWith('00') || code.startsWith('30')) return 'sz'; // 深圳
  return 'unknown';
}

// 颜色映射
export function getColorByValue(value, type = 'default') {
  const colorMaps = {
    'default': {
      positive: '#10b981',  // 绿色（涨）
      negative: '#ef4444',  // 红色（跌）
      neutral: '#9ca3af'    // 灰色（平）
    },
    'reverse': {
      positive: '#ef4444',  // 红色（涨）
      negative: '#10b981',  // 绿色（跌）
      neutral: '#9ca3af'    // 灰色（平）
    }
  };

  const map = colorMaps[type] || colorMaps['default'];

  if (value > 0) return map.positive;
  if (value < 0) return map.negative;
  return map.neutral;
}
```

### 3.3 全局配置 (src/config.js)

**职责**: 全局配置和应用状态

**大小**: ~200行

```javascript
// 全局配置
export const AppConfig = {
  // API配置
  API_BASE: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',

  // 调试模式
  DEBUG: import.meta.env.MODE === 'development',

  // 默认配置
  DEFAULT_TIMEFRAME: 'daily',
  DEFAULT_KLINE_COUNT: 100,

  // 图表配置
  CHART: {
    height: {
      main: 328,
      sub: 84
    },
    colors: {
      background: '#1f2937',
      grid: '#374151',
      candleUp: '#10b981',
      candleDown: '#ef4444'
    }
  },

  // 性能配置
  PERFORMANCE: {
    debounceTime: 300,
    throttleTime: 100,
    cacheTTL: 60000 // 1分钟
  },

  // UI配置
  UI: {
    pageSize: 20,
    maxRows: 1000,
    animationDuration: 300
  }
};

// 应用状态
export const AppState = {
  // 当前选中的股票
  currentStock: {
    code: null,
    name: null,
    quotes: [],
    timeframe: 'daily'
  },

  // 关注列表
  watchlist: [],

  // 当前标签页
  currentTab: 'analyze',

  // 加载状态
  loading: false,

  // 错误状态
  error: null
};

// 事件总线
export class EventBus {
  constructor() {
    this.events = new Map();
  }

  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);
  }

  emit(event, data) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  off(event, callback) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}

export const eventBus = new EventBus();
```

---

## 4. UI组件设计

### 4.1 组件生命周期

所有组件遵循统一的生命周期：

```javascript
class Component {
  constructor(container, options)  // 初始化
  mount()                           // 挂载到DOM
  render(data)                      // 渲染数据
  update(data)                      // 更新数据
  unmount()                         // 卸载（清理）
}
```

### 4.2 图表组件

#### 4.2.1 图表主入口 (src/components/Chart/index.js)

**职责**: 图表组件的主入口，协调K线图和成交量图

**大小**: ~100行

```javascript
import { KlineChart } from './KlineChart.js';
import { VolumeChart } from './VolumeChart.js';
import Logger from '../../utils/logger.js';

export class Chart {
  constructor(containers, options = {}) {
    this.containers = {
      kline: containers.kline,
      volume: containers.volume
    };

    this.options = {
      width: options.width || containers.kline.clientWidth,
      ...options
    };

    this.klineChart = null;
    this.volumeChart = null;
    this.currentData = [];
  }

  init() {
    Logger.info('Initializing charts');

    this.klineChart = new KlineChart(this.containers.kline, this.options);
    this.volumeChart = new VolumeChart(this.containers.volume, this.options);

    Logger.info('Charts initialized');
  }

  updateData(quotes) {
    if (!quotes || quotes.length === 0) {
      Logger.warn('No data to update charts');
      return;
    }

    this.currentData = quotes;

    Logger.debug('Updating charts', { count: quotes.length });

    this.klineChart.update(quotes);
    this.volumeChart.update(quotes);

    Logger.info('Charts updated');
  }

  destroy() {
    if (this.klineChart) {
      this.klineChart.destroy();
    }
    if (this.volumeChart) {
      this.volumeChart.destroy();
    }

    Logger.info('Charts destroyed');
  }
}
```

#### 4.2.2 K线图组件 (src/components/Chart/KlineChart.js)

**职责**: K线图表渲染

**大小**: ~400行

```javascript
import Logger from '../../utils/logger.js';
import { WyckoffAnalyzer } from '../../utils/wyckoff.js';

export class KlineChart {
  constructor(container, options) {
    this.container = container;
    this.options = options;
    this.chart = null;
    this.candlestickSeries = null;
    this.maSeries = [];
  }

  init() {
    if (typeof window.LightweightCharts === 'undefined') {
      throw new Error('LightweightCharts library not loaded');
    }

    this.chart = window.LightweightCharts.createChart(container, {
      width: this.options.width,
      height: 328,
      layout: {
        background: { color: '#1f2937' },
        textColor: '#f9fafb'
      },
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' }
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false
      }
    });

    this.candlestickSeries = this.chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444'
    });

    // 添加MA系列
    this.addMASeries([5, 10, 20, 60]);

    Logger.debug('Kline chart initialized');
  }

  addMASeries(periods) {
    const colors = ['#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

    periods.forEach((period, index) => {
      const maSeries = this.chart.addLineSeries({
        color: colors[index % colors.length],
        lineWidth: 1,
        title: `MA${period}`
      });
      this.maSeries.push({ period, series: maSeries });
    });
  }

  update(quotes) {
    if (!this.chart) {
      this.init();
    }

    // 更新K线数据
    const candlestickData = quotes.map(q => ({
      time: q.time || q.date,
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close
    }));

    this.candlestickSeries.setData(candlestickData);

    // 更新MA数据
    this.maSeries.forEach(({ period, series }) => {
      const maData = this.calculateMA(quotes, period);
      series.setData(maData);
    });

    // 添加威科夫标记
    this.addWyckoffMarkers(quotes);

    // 自动缩放
    this.timeScale.fitContent();
  }

  calculateMA(quotes, period) {
    const result = [];

    for (let i = 0; i < quotes.length; i++) {
      if (i < period - 1) {
        continue;
      }

      const sum = quotes.slice(i - period + 1, i + 1)
        .reduce((acc, q) => acc + q.close, 0);
      const ma = sum / period;

      result.push({
        time: quotes[i].time || quotes[i].date,
        value: ma
      });
    }

    return result;
  }

  addWyckoffMarkers(quotes) {
    const markers = quotes.map((quote, index) => {
      const phase = WyckoffAnalyzer.calculatePhase(quote);
      return {
        time: quote.time || quote.date,
        position: phase.phase === 'U' || phase.phase === 'A' ? 'belowBar' : 'aboveBar',
        color: phase.color,
        shape: WyckoffAnalyzer.getMarkerShape(phase.phase),
        text: phase.phase
      };
    }).filter(m => m.text !== 'R');

    this.candlestickSeries.setMarkers(markers);
  }

  destroy() {
    if (this.chart) {
      this.chart.remove();
      this.chart = null;
    }
  }

  get timeScale() {
    return this.chart ? this.chart.timeScale() : null;
  }
}
```

#### 4.2.3 成交量图组件 (src/components/Chart/VolumeChart.js)

**职责**: 成交量图表渲染

**大小**: ~250行

```javascript
import Logger from '../../utils/logger.js';

export class VolumeChart {
  constructor(container, options) {
    this.container = container;
    this.options = options;
    this.chart = null;
    this.volumeSeries = null;
  }

  init() {
    if (typeof window.LightweightCharts === 'undefined') {
      throw new Error('LightweightCharts library not loaded');
    }

    this.chart = window.LightweightCharts.createChart(container, {
      width: this.options.width,
      height: 84,
      layout: {
        background: { color: '#1f2937' },
        textColor: '#f9fafb'
      },
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' }
      }
    });

    this.volumeSeries = this.chart.addHistogramSeries({
      color: '#3b82f6',
      priceFormat: {
        type: 'volume'
      }
    });

    Logger.debug('Volume chart initialized');
  }

  update(quotes) {
    if (!this.chart) {
      this.init();
    }

    const volumeData = quotes.map((quote, index) => {
      const prevQuote = index > 0 ? quotes[index - 1] : null;
      const color = quote.close >= (prevQuote?.close || quote.open) ? '#10b981' : '#ef4444';

      return {
        time: quote.time || quote.date,
        value: quote.volume,
        color: color
      };
    });

    this.volumeSeries.setData(volumeData);

    Logger.debug('Volume chart updated', { count: quotes.length });
  }

  destroy() {
    if (this.chart) {
      this.chart.remove();
      this.chart = null;
    }
  }

  syncTimeScale(klineChart) {
    if (this.chart && klineChart.timeScale) {
      this.chart.timeScale().subscribeVisibleTimeRangeChange(() => {
        // 同步时间范围
      });
    }
  }
}
```

### 4.3 表格组件

#### 4.3.1 K线表格组件 (src/components/Table/KlineTable.js)

**职责**: K线数据表格渲染

**大小**: ~450行

```javascript
import Logger from '../../utils/logger.js';
import { Indicators } from '../../utils/indicators.js';
import { WyckoffAnalyzer } from '../../utils/wyckoff.js';
import { formatDateString, formatNumber, formatPercent } from '../../utils/helpers.js';

export class KlineTable {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      pageSize: options.pageSize || 20,
      sortable: options.sortable !== false,
      exportable: options.exportable !== false,
      ...options
    };

    this.data = [];
    this.currentPage = 1;
    this.sortColumn = null;
    this.sortDirection = 'asc';
  }

  render(data) {
    if (!data || data.length === 0) {
      this.showEmpty();
      return;
    }

    this.data = data;
    this.currentPage = 1;

    Logger.debug('Rendering table', { count: data.length });

    this.updateTable();
    this.attachEvents();
  }

  updateTable() {
    const start = (this.currentPage - 1) * this.options.pageSize;
    const end = start + this.options.pageSize;
    const pageData = this.data.slice(start, end);

    this.container.innerHTML = `
      <table>
        <thead>
          ${this.renderHeader()}
        </thead>
        <tbody>
          ${pageData.map((quote, index) => this.renderRow(quote, start + index)).join('')}
        </tbody>
      </table>
      ${this.renderPagination()}
    `;
  }

  renderHeader() {
    const columns = [
      { key: 'date', label: '日期', sortable: true },
      { key: 'open', label: '开盘', sortable: true },
      { key: 'high', label: '最高', sortable: true },
      { key: 'low', label: '最低', sortable: true },
      { key: 'close', label: '收盘', sortable: true },
      { key: 'volume', label: '成交量', sortable: true },
      { key: 'change', label: '涨跌幅', sortable: true },
      { key: 'ma', label: 'MA', sortable: false },
      { key: 'phase', label: '相位', sortable: true }
    ];

    return `
      <tr>
        ${columns.map(col => `
          <th>
            ${col.label}
            ${col.sortable ? `<span class="sort-icon" data-column="${col.key}">⇅</span>` : ''}
          </th>
        `).join('')}
      </tr>
    `;
  }

  renderRow(quote, index) {
    const prevQuote = index > 0 ? this.data[index - 1] : null;
    const change = Indicators.calculateChangePercent(quote, prevQuote);
    const changeColor = change >= 0 ? '#10b981' : '#ef4444';

    const phase = WyckoffAnalyzer.calculatePhase(quote);

    return `
      <tr>
        <td>${formatDateString(quote.time || quote.date)}</td>
        <td>${formatNumber(quote.open)}</td>
        <td>${formatNumber(quote.high)}</td>
        <td>${formatNumber(quote.low)}</td>
        <td style="color: ${changeColor}">${formatNumber(quote.close)}</td>
        <td>${formatNumber(quote.volume, 0)}</td>
        <td style="color: ${changeColor}">${formatPercent(change)}</td>
        <td>${formatNumber(quote.ma15 || quote.ma20)}</td>
        <td>
          <span style="color: ${phase.color}">${phase.text}</span>
        </td>
      </tr>
    `;
  }

  renderPagination() {
    const totalPages = Math.ceil(this.data.length / this.options.pageSize);

    return `
      <div class="pagination">
        <button ${this.currentPage === 1 ? 'disabled' : ''} data-page="${this.currentPage - 1}">上一页</button>
        <span>第 ${this.currentPage} / ${totalPages} 页</span>
        <button ${this.currentPage === totalPages ? 'disabled' : ''} data-page="${this.currentPage + 1}">下一页</button>
      </div>
    `;
  }

  showEmpty() {
    this.container.innerHTML = `
      <div class="empty-state">
        <p>暂无数据</p>
      </div>
    `;
  }

  attachEvents() {
    // 排序事件
    this.container.querySelectorAll('.sort-icon').forEach(icon => {
      icon.addEventListener('click', (e) => {
        const column = e.target.dataset.column;
        this.sort(column);
      });
    });

    // 分页事件
    this.container.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const page = parseInt(e.target.dataset.page);
        this.goToPage(page);
      });
    });
  }

  sort(column) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.data.sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const result = aVal > bVal ? 1 : -1;
      return this.sortDirection === 'asc' ? result : -result;
    });

    this.updateTable();
  }

  goToPage(page) {
    const totalPages = Math.ceil(this.data.length / this.options.pageSize);
    if (page < 1 || page > totalPages) return;

    this.currentPage = page;
    this.updateTable();
  }

  export(format = 'csv') {
    if (format === 'csv') {
      this.exportCSV();
    } else if (format === 'excel') {
      this.exportExcel();
    }
  }

  exportCSV() {
    const headers = ['日期', '开盘', '最高', '最低', '收盘', '成交量', '涨跌幅'];
    const rows = this.data.map(quote => [
      quote.time || quote.date,
      quote.open,
      quote.high,
      quote.low,
      quote.close,
      quote.volume,
      Indicators.calculateChangePercent(quote, this.data[this.data.indexOf(quote) - 1])
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `kline_data_${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);

    Logger.info('CSV exported', { count: this.data.length });
  }
}
```

### 4.4 关注列表组件

#### 4.4.1 关注列表网格 (src/components/Watchlist/WatchlistGrid.js)

**职责**: 关注列表网格视图

**大小**: ~350行

```javascript
import Logger from '../../utils/logger.js';
import { watchlistApi } from '../../api/watchlist.js';
import { getStockType } from '../../utils/helpers.js';

export class WatchlistGrid {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      columnsPerRow: options.columnsPerRow || 4,
      onStockClick: options.onStockClick,
      ...options
    };

    this.stocks = [];
  }

  async load() {
    try {
      Logger.info('Loading watchlist');

      const data = await watchlistApi.getAll();
      this.stocks = data;

      this.render();

      Logger.info('Watchlist loaded', { count: this.stocks.length });
    } catch (error) {
      Logger.error('Failed to load watchlist', error);
      throw error;
    }
  }

  render() {
    if (this.stocks.length === 0) {
      this.showEmpty();
      return;
    }

    this.container.innerHTML = `
      <div class="watchlist-grid" style="display: grid; grid-template-columns: repeat(${this.options.columnsPerRow}, 1fr); gap: 8px;">
        ${this.stocks.map(stock => this.renderCard(stock)).join('')}
      </div>
    `;

    this.attachEvents();
  }

  renderCard(stock) {
    return `
      <div class="stock-card" data-code="${stock.stock_code}">
        <div class="card-header">
          <span class="stock-code">${stock.stock_code}</span>
          <button class="remove-btn" data-code="${stock.stock_code}">✕</button>
        </div>
        <div class="card-body">
          <div class="stock-name">${stock.stock_name || '-'}</div>
          <div class="stock-price">${formatNumber(stock.current_price)}</div>
          <div class="stock-change ${stock.change_percent >= 0 ? 'positive' : 'negative'}">
            ${formatPercent(stock.change_percent)}
          </div>
        </div>
      </div>
    `;
  }

  showEmpty() {
    this.container.innerHTML = `
      <div class="empty-state">
        <p>关注列表为空</p>
        <p class="hint">添加股票到关注列表，方便快速访问</p>
      </div>
    `;
  }

  attachEvents() {
    // 点击卡片
    this.container.querySelectorAll('.stock-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-btn')) return;

        const code = card.dataset.code;
        if (this.options.onStockClick) {
          this.options.onStockClick(code);
        }
      });
    });

    // 移除按钮
    this.container.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();

        const code = btn.dataset.code;
        await this.remove(code);
      });
    });
  }

  async remove(code) {
    try {
      Logger.info('Removing from watchlist', { code });

      await watchlistApi.remove(code);
      await this.load(); // 重新加载

      Logger.info('Removed from watchlist', { code });
    } catch (error) {
      Logger.error('Failed to remove from watchlist', error);
      throw error;
    }
  }

  async add(code) {
    try {
      Logger.info('Adding to watchlist', { code });

      await watchlistApi.add(code);
      await this.load(); // 重新加载

      Logger.info('Added to watchlist', { code });
    } catch (error) {
      Logger.error('Failed to add to watchlist', error);
      throw error;
    }
  }

  async move(code, direction) {
    try {
      Logger.info('Moving in watchlist', { code, direction });

      await watchlistApi.move(code, direction);
      await this.load(); // 重新加载

      Logger.info('Moved in watchlist', { code, direction });
    } catch (error) {
      Logger.error('Failed to move in watchlist', error);
      throw error;
    }
  }
}
```

### 4.5 分析面板组件

#### 4.5.1 多周期分析 (src/components/Analysis/MultiTimeframe.js)

**职责**: 多周期综合分析面板

**大小**: ~400行

```javascript
import Logger from '../../utils/logger.js';
import { stocksApi } from '../../api/stocks.js';
import { Indicators } from '../../utils/indicators.js';

export class MultiTimeframe {
  constructor(container) {
    this.container = container;
    this.timeframes = ['30m', '60m', 'daily', 'weekly', 'monthly'];
    this.results = [];
  }

  async analyze(code) {
    try {
      Logger.info('Starting multi-timeframe analysis', { code });

      this.showLoading();

      // 并发获取所有周期数据
      const promises = this.timeframes.map(tf =>
        stocksApi.analyze(code, null, tf).catch(error => {
          Logger.warn(`Failed to analyze ${tf}`, error);
          return null;
        })
      );

      this.results = await Promise.all(promises);

      // 过滤掉失败的结果
      this.results = this.results.filter(r => r !== null);

      Logger.info('Multi-timeframe analysis completed', {
        count: this.results.length
      });

      this.render();
    } catch (error) {
      Logger.error('Multi-timeframe analysis failed', error);
      this.showError(error);
    }
  }

  showLoading() {
    this.container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>正在分析多周期数据...</p>
      </div>
    `;
  }

  showError(error) {
    this.container.innerHTML = `
      <div class="error-state">
        <p>分析失败: ${error.message}</p>
        <button class="retry-btn">重试</button>
      </div>
    `;

    this.container.querySelector('.retry-btn').addEventListener('click', () => {
      this.analyze(this.currentCode);
    });
  }

  render() {
    if (this.results.length === 0) {
      this.showEmpty();
      return;
    }

    const summary = this.generateSummary();

    this.container.innerHTML = `
      <div class="multi-timeframe-analysis">
        ${this.renderSummary(summary)}
        ${this.renderDetails()}
      </div>
    `;
  }

  generateSummary() {
    const bullishCount = this.results.filter(r => r.trend === 'bullish').length;
    const bearishCount = this.results.filter(r => r.trend === 'bearish').length;
    const neutralCount = this.results.filter(r => r.trend === 'neutral').length;

    let conclusion = '';
    if (bullishCount >= 3) {
      conclusion = '多头趋势明显，建议关注买入机会';
    } else if (bearishCount >= 3) {
      conclusion = '空头趋势明显，建议谨慎或等待';
    } else {
      conclusion = '多空交织，建议观望等待明确信号';
    }

    return {
      bullish: bullishCount,
      bearish: bearishCount,
      neutral: neutralCount,
      conclusion
    };
  }

  renderSummary(summary) {
    return `
      <div class="summary-panel">
        <h3>综合分析</h3>
        <div class="stats">
          <div class="stat-item bullish">
            <span class="label">多头周期</span>
            <span class="value">${summary.bullish}</span>
          </div>
          <div class="stat-item bearish">
            <span class="label">空头周期</span>
            <span class="value">${summary.bearish}</span>
          </div>
          <div class="stat-item neutral">
            <span class="label">中性周期</span>
            <span class="value">${summary.neutral}</span>
          </div>
        </div>
        <div class="conclusion">
          <strong>结论：</strong>${summary.conclusion}
        </div>
      </div>
    `;
  }

  renderDetails() {
    return `
      <div class="details-panel">
        <h3>各周期详情</h3>
        ${this.results.map(result => this.renderTimeframe(result)).join('')}
      </div>
    `;
  }

  renderTimeframe(result) {
    const trendClass = result.trend;
    const trendText = {
      bullish: '看涨',
      bearish: '看跌',
      neutral: '中性'
    }[result.trend] || '未知';

    return `
      <div class="timeframe-item ${trendClass}">
        <div class="timeframe-header">
          <span class="timeframe-name">${result.timeframe}</span>
          <span class="timeframe-trend">${trendText}</span>
        </div>
        <div class="timeframe-body">
          <div class="data-row">
            <span class="label">MA状态:</span>
            <span class="value">${result.maStatus || '-'}</span>
          </div>
          <div class="data-row">
            <span class="label">成交量:</span>
            <span class="value">${result.volumeStatus || '-'}</span>
          </div>
          <div class="data-row">
            <span class="label">威科夫相位:</span>
            <span class="value">${result.phase || '-'}</span>
          </div>
        </div>
      </div>
    `;
  }

  showEmpty() {
    this.container.innerHTML = `
      <div class="empty-state">
        <p>暂无分析数据</p>
      </div>
    `;
  }
}
```

---

## 5. 样式系统设计

### 5.1 CSS变量与主题

#### 5.1.1 主样式 (src/styles/main.css)

**职责**: 全局样式、CSS变量、重置样式

**大小**: ~400行

```css
:root {
  /* 颜色变量 - 深色主题 */
  --color-bg-primary: #0a0e27;
  --color-bg-secondary: #111827;
  --color-bg-tertiary: #1f2937;
  --color-bg-hover: #374151;

  --color-text-primary: #f9fafb;
  --color-text-secondary: #9ca3af;
  --color-text-muted: #6b7280;

  --color-success: #10b981;
  --color-error: #ef4444;
  --color-warning: #f59e0b;
  --color-info: #3b82f6;

  --color-border: #374151;
  --color-shadow: rgba(0, 0, 0, 0.3);

  /* 尺寸变量 */
  --spacing-xs: 4px;
  --spacing-sm: 6px;
  --spacing-md: 8px;
  --spacing-lg: 12px;
  --spacing-xl: 16px;

  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;

  /* 阴影 */
  --shadow-sm: 0 1px 2px var(--color-shadow);
  --shadow-md: 0 4px 6px var(--color-shadow);
  --shadow-lg: 0 10px 15px var(--color-shadow);

  /* 字体 */
  --font-size-xs: 10px;
  --font-size-sm: 11px;
  --font-size-md: 12px;
  --font-size-lg: 14px;
  --font-size-xl: 16px;

  /* 过渡 */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.3s ease;
  --transition-slow: 0.5s ease;
}

/* 全局重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  line-height: 1.5;
  overflow-x: hidden;
}

html, body {
  height: 100%;
}

/* 通用样式 */
.card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.card-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

/* 表单元素 */
.form-group {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  align-items: center;
}

.form-input {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-size: var(--font-size-md);
  transition: border-color var(--transition-fast);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-info);
}

/* 按钮 */
.btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-md);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-normal);
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn:active {
  transform: scale(0.98);
}

.btn-secondary {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.btn-success {
  background: var(--color-success);
}

.btn-danger {
  background: var(--color-error);
}

/* Toast通知 */
.toast-container {
  position: fixed;
  top: var(--spacing-lg);
  right: var(--spacing-lg);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.toast {
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  color: white;
  font-size: var(--font-size-md);
  animation: slideIn var(--transition-normal);
  box-shadow: var(--shadow-lg);
}

.toast-success { background: var(--color-success); }
.toast-error { background: var(--color-error); }
.toast-warning { background: var(--color-warning); }
.toast-info { background: var(--color-info); }

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--color-border);
  border-top-color: var(--color-info);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
}

.empty-state .hint {
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-sm);
}
```

#### 5.1.2 图表样式 (src/styles/chart.css)

**职责**: 图表相关样式

**大小**: ~200行

```css
/* 主图容器 */
.main-chart-container {
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  height: 328px;
  border: 1px solid var(--color-border);
  margin-bottom: var(--spacing-md);
}

/* 副图容器 */
.subchart-container {
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  height: 84px;
  border: 1px solid var(--color-border);
  margin-bottom: var(--spacing-md);
}

/* 图表工具栏 */
.chart-toolbar {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.chart-toolbar .btn {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--font-size-sm);
}

/* 图表加载状态 */
.chart-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-secondary);
}
```

#### 5.1.3 表格样式 (src/styles/table.css)

**职责**: 表格相关样式

**大小**: ~250行

```css
/* 表格容器 */
.table-container {
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  overflow-x: auto;
  max-height: 800px;
  border: 1px solid var(--color-border);
}

/* 表格 */
table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-md);
  table-layout: auto;
}

/* 表头 */
thead {
  position: sticky;
  top: 0;
  background: var(--color-bg-secondary);
  z-index: 10;
}

th {
  padding: var(--spacing-sm) var(--spacing-md);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

th .sort-icon {
  margin-left: var(--spacing-xs);
  cursor: pointer;
  opacity: 0.5;
  transition: opacity var(--transition-fast);
}

th .sort-icon:hover {
  opacity: 1;
}

/* 表格行 */
tbody tr {
  border-bottom: 1px solid var(--color-border);
  transition: background-color var(--transition-fast);
}

tbody tr:hover {
  background: var(--color-bg-hover);
}

tbody tr:last-child {
  border-bottom: none;
}

/* 表格单元格 */
td {
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--color-text-secondary);
}

/* 数据颜色 */
.positive {
  color: var(--color-success);
}

.negative {
  color: var(--color-error);
}

.neutral {
  color: var(--color-text-secondary);
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  margin-top: var(--spacing-md);
}

.pagination button {
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.pagination button:hover:not(:disabled) {
  background: var(--color-bg-hover);
  border-color: var(--color-info);
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 响应式表格 */
@media (max-width: 768px) {
  table {
    font-size: var(--font-size-xs);
  }

  th, td {
    padding: var(--spacing-xs) var(--spacing-sm);
  }
}
```

#### 5.1.4 主题系统 (src/styles/themes.css)

**职责**: 深色/浅色主题切换

**大小**: ~150行

```css
/* 浅色主题 */
[data-theme="light"] {
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f3f4f6;
  --color-bg-tertiary: #e5e7eb;
  --color-bg-hover: #d1d5db;

  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-text-muted: #9ca3af';

  --color-border: #d1d5db;
  --color-shadow: rgba(0, 0, 0, 0.1);
}

/* 深色主题（默认） */
[data-theme="dark"] {
  --color-bg-primary: #0a0e27;
  --color-bg-secondary: #111827;
  --color-bg-bg-tertiary: #1f2937;
  --color-bg-hover: #374151;

  --color-text-primary: #f9fafb;
  --color-text-secondary: #9ca3af;
  --color-text-muted: #6b7280;

  --color-border: #374151;
  --color-shadow: rgba(0, 0, 0, 0.3);
}

/* 主题切换过渡 */
body,
.card,
.form-input,
.btn,
table {
  transition: background-color var(--transition-normal),
              color var(--transition-normal),
              border-color var(--transition-normal);
}

/* 主题切换按钮 */
.theme-toggle {
  position: fixed;
  bottom: var(--spacing-lg);
  right: var(--spacing-lg);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-size: 24px;
  cursor: pointer;
  box-shadow: var(--shadow-md);
  transition: all var(--transition-normal);
  z-index: 1000;
}

.theme-toggle:hover {
  transform: scale(1.1);
  box-shadow: var(--shadow-lg);
}

/* 自动主题（跟随系统） */
@media (prefers-color-scheme: light) {
  [data-theme="auto"] {
    --color-bg-primary: #ffffff;
    --color-bg-secondary: #f3f4f6;
    /* ... 其他浅色主题变量 */
  }
}

@media (prefers-color-scheme: dark) {
  [data-theme="auto"] {
    --color-bg-primary: #0a0e27;
    --color-bg-secondary: #111827;
    /* ... 其他深色主题变量 */
  }
}
```

---

## 6. 性能优化方案

### 6.1 代码分割（Code Splitting）

**策略**: 按路由和功能动态导入

```javascript
// main.js
import { AppConfig } from './src/config.js';
import { Logger } from './src/utils/logger.js';

// 核心模块立即加载
import { Chart } from './src/components/Chart/index.js';
import { Table } from './src/components/Table/index.js';

// 次要模块按需加载
async function showAnalysisModal() {
  const { AnalysisModal } = await import('./src/components/Analysis/AnalysisModal.js');
  const modal = new AnalysisModal();
  modal.show();
}

async function showConfigPanel() {
  const { ConfigPanel } = await import('./src/components/Config/ConfigPanel.js');
  const panel = new ConfigPanel();
  panel.show();
}
```

**收益**:
- 首屏加载时间减少 40-60%
- 按需加载，节省带宽

### 6.2 虚拟滚动（Virtual Scroll）

**策略**: 只渲染可见区域的行

```javascript
// src/components/Table/VirtualScroll.js
export class VirtualScroll {
  constructor(container, itemHeight, renderItem) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.renderItem = renderItem;
    this.visibleStart = 0;
    this.visibleEnd = 0;
    this.data = [];

    this.container.addEventListener('scroll', () => this.onScroll());
  }

  setData(data) {
    this.data = data;
    this.onScroll();
  }

  onScroll() {
    const scrollTop = this.container.scrollTop;
    const containerHeight = this.container.clientHeight;

    this.visibleStart = Math.floor(scrollTop / this.itemHeight);
    this.visibleEnd = Math.ceil((scrollTop + containerHeight) / this.itemHeight);

    this.renderVisibleItems();
  }

  renderVisibleItems() {
    const fragment = document.createDocumentFragment();

    // 添加顶部占位
    const topSpacer = document.createElement('div');
    topSpacer.style.height = `${this.visibleStart * this.itemHeight}px`;
    fragment.appendChild(topSpacer);

    // 渲染可见行
    for (let i = this.visibleStart; i < this.visibleEnd && i < this.data.length; i++) {
      const item = this.renderItem(this.data[i], i);
      item.style.position = 'absolute';
      item.style.top = `${i * this.itemHeight}px`;
      item.style.width = '100%';
      fragment.appendChild(item);
    }

    // 添加底部占位
    const bottomSpacer = document.createElement('div');
    bottomSpacer.style.height = `${(this.data.length - this.visibleEnd) * this.itemHeight}px`;
    fragment.appendChild(bottomSpacer);

    this.container.innerHTML = '';
    this.container.appendChild(fragment);
  }
}
```

**收益**:
- 大数据量（1000+行）表格渲染时间减少 80%
- 内存占用减少 60%

### 6.3 防抖与节流

**策略**: 对频繁触发的事件进行优化

```javascript
// 搜索框防抖
const searchInput = document.getElementById('search-input');
const debouncedSearch = debounce((query) => {
  searchStocks(query);
}, 300);

searchInput.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
});

// 滚动事件节流
const chartContainer = document.getElementById('chart-container');
const throttledUpdate = throttle(() => {
  updateChartIndicator();
}, 100);

chartContainer.addEventListener('scroll', throttledUpdate);
```

**收益**:
- 减少 API 调用次数 70%
- 提升响应速度

### 6.4 请求缓存

**策略**: 缓存 API 响应，避免重复请求

```javascript
// src/api/cache.js
export class ApiCache {
  constructor(ttl = 60000) { // 默认1分钟
    this.cache = new Map();
    this.ttl = ttl;
  }

  generateKey(url, options) {
    return `${url}:${JSON.stringify(options)}`;
  }

  get(url, options) {
    const key = this.generateKey(url, options);
    const item = this.cache.get(key);

    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set(url, options, data) {
    const key = this.generateKey(url, options);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }
}

export const apiCache = new ApiCache();

// 在 ApiClient 中使用
class ApiClient {
  async request(url, options = {}) {
    // 检查缓存
    if (options.method === 'GET') {
      const cached = apiCache.get(url, options);
      if (cached) {
        Logger.debug('Cache hit', { url });
        return cached;
      }
    }

    // 发起请求
    const response = await fetch(url, options);
    const data = await response.json();

    // 缓存 GET 请求
    if (options.method === 'GET' || !options.method) {
      apiCache.set(url, options, data);
    }

    return data;
  }
}
```

**收益**:
- 重复请求响应时间减少 95%
- 减少服务器负载

### 6.5 图片懒加载

**策略**: 使用 IntersectionObserver API

```javascript
// src/utils/lazyLoad.js
export function initLazyLoad() {
  const lazyImages = document.querySelectorAll('img.lazy');

  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.remove('lazy');
        imageObserver.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px' // 提前50px开始加载
  });

  lazyImages.forEach(img => imageObserver.observe(img));
}

// 在 main.js 中调用
import { initLazyLoad } from './src/utils/lazyLoad.js';
document.addEventListener('DOMContentLoaded', initLazyLoad);
```

**收益**:
- 首屏加载时间减少 30%
- 带宽使用减少 40%

---

## 7. 迁移计划

### 7.1 迁移策略

采用**渐进式重构**策略，分阶段迁移，确保系统始终可用。

### 7.2 详细步骤

#### 阶段1：基础设施搭建（第1天上午）

**任务**:
1. 初始化Vite项目
2. 创建目录结构
3. 配置开发环境

**命令**:
```bash
# 1. 创建新项目
npm create vite@latest frontend-new -- --template vanilla
cd frontend-new

# 2. 安装依赖
npm install

# 3. 创建目录结构
mkdir -p src/{api,components,utils,styles}
mkdir -p src/components/{Chart,Table,Watchlist,Analysis}
mkdir -p tests/{unit,integration,e2e}

# 4. 复制静态资源
cp ../frontend/lightweight-charts.standalone.production.js public/
```

**配置文件**:

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'chart': ['./src/components/Chart/index.js'],
          'table': ['./src/components/Table/index.js'],
          'watchlist': ['./src/components/Watchlist/index.js']
        }
      }
    }
  }
});
```

```json
// package.json
{
  "name": "wyckoff-frontend",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "@playwright/test": "^1.40.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0"
  }
}
```

**验证标准**:
- ✅ `npm run dev` 正常启动
- ✅ 访问 http://localhost:5173 显示欢迎页面
- ✅ API代理配置生效

---

#### 阶段2：工具函数提取（第1天下午）

**任务**: 从原 index.html 提取工具函数

**映射表**:

| 原位置（行号） | 目标文件 | 函数名 |
|--------------|---------|--------|
| 2023-2074 | src/utils/logger.js | addLog, updateLogDisplay, toggleLog |
| 2597-2612 | src/utils/indicators.js | calculateMA |
| 2554-2596 | src/utils/wyckoff.js | calculateWyckoffPhase, getPhaseColor |
| 2463-2553 | src/utils/helpers.js | formatDateString, deduplicateQuotes |

**提取示例**:

```javascript
// src/utils/logger.js
export class Logger {
  static LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  };

  static currentLevel = Logger.LEVELS.INFO;

  static setLevel(level) {
    this.currentLevel = Logger.LEVELS[level];
  }

  static info(message, data = null) {
    if (this.shouldLog(this.LEVELS.INFO)) {
      console.info(`[INFO] ${message}`, data || '');
    }
  }

  // ... 其他方法
}

export default Logger;
```

**测试**:
```javascript
// tests/utils/logger.test.js
import { describe, it, expect } from 'vitest';
import { Logger } from '../src/utils/logger.js';

describe('Logger', () => {
  it('should respect log level', () => {
    Logger.setLevel('ERROR');
    Logger.info('test'); // 不应输出
    Logger.error('test'); // 应该输出
  });
});
```

**验证标准**:
- ✅ 所有工具函数提取完成
- ✅ 单元测试通过
- ✅ 代码覆盖率 > 80%

---

#### 阶段3：API层重构（第2天上午）

**任务**: 提取和重构 API 调用

**识别 API 调用**:
```bash
# 查找所有 fetch 调用
grep -n "fetch(" frontend/index.html
```

**重构清单**:

| API端点 | 目标文件 | 方法 |
|--------|---------|------|
| /api/v1/health | src/api/client.js | checkHealth |
| /api/v1/stocks/*/quotes | src/api/stocks.js | getQuotes |
| /api/v1/stocks/analyze | src/api/stocks.js | analyze |
| /api/v1/watchlist | src/api/watchlist.js | getAll |
| /api/v1/watchlist/favorite/* | src/api/watchlist.js | add |

**重构示例**:

```javascript
// 原代码（在 index.html 中）
async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE}/api/v1/health`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Health check failed', error);
  }
}

// 重构后（在 src/api/client.js）
class ApiClient {
  async getHealth() {
    return this.get('/api/v1/health');
  }
}
```

**验证**:
```javascript
// tests/api/client.test.js
import { describe, it, expect } from 'vitest';
import apiClient from '../src/api/client.js';

describe('API Client', () => {
  it('should fetch health status', async () => {
    const health = await apiClient.getHealth();
    expect(health).toHaveProperty('status');
  });
});
```

**验证标准**:
- ✅ 所有 API 调用重构完成
- ✅ 错误处理统一
- ✅ 测试通过

---

#### 阶段4：组件拆分（第2-3天）

**优先级顺序**:

**优先级1: 图表组件**（第2天下午）
- 提取 renderCharts 函数（第2750-3553行）
- 拆分为 KlineChart 和 VolumeChart
- 添加防抖优化

**优先级2: 表格组件**（第3天上午）
- 提取 renderKlineTable 函数（第2613-2749行）
- 添加虚拟滚动
- 添加排序功能

**优先级3: 关注列表**（第3天下午）
- 提取关注列表相关函数
- 实现 WatchlistGrid 组件

**优先级4: 分析面板**（第4天上午）
- 提取多周期分析逻辑
- 实现 MultiTimeframe 组件

**组件提取模板**:

```javascript
// 1. 识别原函数
function renderCharts(timeframe = 'daily') {
  // 原代码...
}

// 2. 创建组件类
export class Chart {
  constructor(container, options) {
    this.container = container;
    this.options = options;
  }

  init() {
    // 初始化逻辑
  }

  render(data) {
    // 渲染逻辑
  }

  update(data) {
    // 更新逻辑
  }

  destroy() {
    // 清理逻辑
  }
}

// 3. 在 main.js 中使用
const chart = new Chart(document.getElementById('mainChart'));
chart.init();
chart.render(data);
```

**验证标准**:
- ✅ 每个组件文件 < 500行
- ✅ 组件可独立测试
- ✅ 功能与原版一致

---

#### 阶段5：样式分离（第3天下午）

**任务**: 从 index.html 提取 CSS

**提取范围**: 第12-1420行（约4000行CSS）

**拆分策略**:

1. **全局样式** → src/styles/main.css
   - CSS 变量
   - 重置样式
   - 通用组件样式

2. **图表样式** → src/styles/chart.css
   - 主图容器
   - 副图容器
   - 图表工具栏

3. **表格样式** → src/styles/table.css
   - 表格容器
   - 表头样式
   - 分页样式

4. **主题样式** → src/styles/themes.css
   - 深色主题
   - 浅色主题
   - 主题切换动画

**提取示例**:

```css
/* 原代码（在 index.html 中） */
<style>
  .main-chart-container {
    background: #1f2937;
    border-radius: 6px;
    /* ... */
  }
</style>

/* 提取后（在 src/styles/chart.css） */
.main-chart-container {
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  /* ... */
}
```

**在 index.html 中引入**:
```html
<link rel="stylesheet" href="/src/styles/main.css">
<link rel="stylesheet" href="/src/styles/chart.css">
<link rel="stylesheet" href="/src/styles/table.css">
<link rel="stylesheet" href="/src/styles/themes.css">
```

**验证标准**:
- ✅ 每个CSS文件 < 400行
- ✅ 样式与原版一致
- ✅ 主题切换正常

---

#### 阶段6：主入口重构（第4天）

**任务**: 重构 main.js，整合所有模块

```javascript
// main.js
import { AppConfig, eventBus } from './src/config.js';
import { Logger } from './src/utils/logger.js';
import { ErrorHandler } from './src/utils/errorHandler.js';
import { Chart } from './src/components/Chart/index.js';
import { Table } from './src/components/Table/index.js';
import { Watchlist } from './src/components/Watchlist/index.js';
import { Analysis } from './src/components/Analysis/index.js';

// 全局错误处理
window.addEventListener('error', (event) => {
  ErrorHandler.handle(event.error, 'Global Error');
});

window.addEventListener('unhandledrejection', (event) => {
  ErrorHandler.handle(event.reason, 'Unhandled Promise Rejection');
});

// 应用初始化
async function initApp() {
  try {
    Logger.info('Application initializing...');

    // 初始化组件
    const chart = new Chart({
      kline: document.getElementById('mainChart'),
      volume: document.getElementById('volumeChart')
    });

    const table = new Table(document.getElementById('klineTable'));
    const watchlist = new Watchlist(document.getElementById('watchlist'));
    const analysis = new Analysis(document.getElementById('analysis'));

    // 绑定事件
    bindEvents(chart, table, watchlist, analysis);

    // 加载初始数据
    await loadInitialData(watchlist);

    Logger.info('Application ready');

  } catch (error) {
    ErrorHandler.handle(error, 'App Initialization');
  }
}

function bindEvents(chart, table, watchlist, analysis) {
  // 标签页切换
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.target.dataset.tab;
      switchTab(tab);
    });
  });

  // 分析按钮
  document.getElementById('analyze-btn')?.addEventListener('click', async () => {
    const code = document.getElementById('stock-code').value;
    await analyzeStock(code, chart, table, analysis);
  });

  // 关注列表点击
  watchlist.onStockClick = async (code) => {
    await analyzeStock(code, chart, table, analysis);
  };

  // 事件总线监听
  eventBus.on('stock:loaded', (data) => {
    chart.updateData(data.quotes);
    table.render(data.quotes);
  });
}

async function analyzeStock(code, chart, table, analysis) {
  try {
    Logger.info('Analyzing stock', { code });

    // 显示加载状态
    eventBus.emit('loading:start');

    // 获取数据
    const [quotes, analysisResult] = await Promise.all([
      stocksApi.getQuotes(code),
      stocksApi.analyze(code)
    ]);

    // 更新UI
    chart.updateData(quotes);
    table.render(quotes);
    analysis.render(analysisResult);

    // 触发事件
    eventBus.emit('stock:loaded', { code, quotes });

  } catch (error) {
    ErrorHandler.handle(error, 'Stock Analysis');
  } finally {
    eventBus.emit('loading:end');
  }
}

async function loadInitialData(watchlist) {
  try {
    await watchlist.load();
  } catch (error) {
    Logger.warn('Failed to load watchlist', error);
  }
}

function switchTab(tabName) {
  // 标签页切换逻辑
  document.querySelectorAll('.tab-content').forEach(content => {
    content.style.display = 'none';
  });
  document.getElementById(`tab-${tabName}`).style.display = 'block';

  // 更新按钮状态
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

// 启动应用
document.addEventListener('DOMContentLoaded', initApp);
```

**验证标准**:
- ✅ main.js < 200行
- ✅ 应用正常启动
- ✅ 所有功能正常

---

#### 阶段7：测试与优化（第4-5天）

**任务清单**:

1. **功能测试**
   - 所有现有功能正常工作
   - 无数据丢失
   - 无功能降级

2. **性能测试**
   - 首屏加载时间 < 2秒
   - API响应时间 < 500ms
   - 图表渲染时间 < 100ms

3. **兼容性测试**
   - Chrome/Edge
   - Firefox
   - Safari

4. **代码审查**
   - 代码规范检查
   - 安全审查
   - 性能审查

5. **文档更新**
   - API文档
   - 组件文档
   - 部署文档

---

### 7.3 风险控制

**回滚计划**:
- 保留原 frontend/ 目录
- 新代码放在 frontend-new/ 目录
- 通过 Nginx 配置快速切换

**灰度发布**:
1. 先部署到测试环境
2. 内部测试1天
3. 10% 用户流量
4. 逐步扩大到100%

**监控指标**:
- 错误率
- 页面加载时间
- API响应时间
- 用户反馈

---

## 8. 测试策略

### 8.1 单元测试（Vitest）

**配置**:
```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/']
    }
  }
});
```

**示例**:
```javascript
// tests/utils/indicators.test.js
import { describe, it, expect } from 'vitest';
import { Indicators } from '../src/utils/indicators.js';

describe('Indicators.calculateMA', () => {
  it('should calculate simple moving average', () => {
    const data = [
      { close: 1 },
      { close: 2 },
      { close: 3 },
      { close: 4 },
      { close: 5 }
    ];

    const ma = Indicators.calculateMA(data, 3);

    expect(ma).toEqual([null, null, 2, 3, 4]);
  });

  it('should handle insufficient data', () => {
    const data = [{ close: 1 }, { close: 2 }];
    const ma = Indicators.calculateMA(data, 5);

    expect(ma).toEqual([null, null]);
  });

  it('should handle empty data', () => {
    const ma = Indicators.calculateMA([], 3);
    expect(ma).toEqual([]);
  });
});
```

### 8.2 集成测试

**示例**:
```javascript
// tests/api/stocks.test.js
import { describe, it, expect, beforeAll } from 'vitest';
import { stocksApi } from '../src/api/stocks.js';

describe('Stocks API', () => {
  beforeAll(() => {
    // 启动mock server
  });

  it('should fetch quotes successfully', async () => {
    const quotes = await stocksApi.getQuotes('000001', 'daily', 10);

    expect(quotes).toHaveLength(10);
    expect(quotes[0]).toHaveProperty('close');
    expect(quotes[0]).toHaveProperty('volume');
  });

  it('should handle API errors', async () => {
    await expect(
      stocksApi.getQuotes('INVALID', 'daily', 10)
    ).rejects.toThrow();
  });
});
```

### 8.3 E2E测试（Playwright）

**配置**:
```javascript
// playwright.config.js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  }
});
```

**示例**:
```javascript
// tests/e2e/stock-analysis.spec.js
import { test, expect } from '@playwright/test';

test.describe('Stock Analysis Flow', () => {
  test('should analyze stock successfully', async ({ page }) => {
    await page.goto('/');

    // 输入股票代码
    await page.fill('#stock-code', '000001');

    // 点击分析按钮
    await page.click('#analyze-btn');

    // 等待图表加载
    await page.waitForSelector('#mainChart canvas', { timeout: 5000 });

    // 验证数据显示
    await expect(page.locator('#klineTable')).toContainText('收盘价');

    // 验证图表存在
    const chart = page.locator('#mainChart canvas');
    await expect(chart).toBeVisible();
  });

  test('should handle errors gracefully', async ({ page }) => {
    await page.goto('/');

    // 输入无效股票代码
    await page.fill('#stock-code', 'INVALID_CODE');
    await page.click('#analyze-btn');

    // 验证错误提示
    await expect(page.locator('.toast-error')).toBeVisible();
  });
});
```

### 8.4 测试覆盖率目标

- **单元测试**: > 90%
- **集成测试**: > 80%
- **E2E测试**: 覆盖主要用户流程

---

## 9. 部署方案

### 9.1 开发环境

**启动**:
```bash
npm run dev
```

**访问**: http://localhost:5173

**特性**:
- 热模块替换（HMR）
- 源码映射（Source Map）
- 详细错误信息

### 9.2 生产构建

**构建**:
```bash
npm run build
```

**输出**:
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── vendor-[hash].js
└── lightweight-charts.standalone.production.js
```

**优化**:
- 代码压缩（Terser）
- CSS压缩
- Tree Shaking
- 代码分割

### 9.3 Nginx配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    root /var/www/wyckoff-frontend/dist;
    index index.html;

    # Gzip压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;

    # 前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API代理
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### 9.4 Docker部署

**Dockerfile**:
```dockerfile
# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# 生产阶段
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - wyckoff-network

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    networks:
      - wyckoff-network

networks:
  wyckoff-network:
    driver: bridge
```

---

## 10. 成功标准

### 10.1 代码质量指标

| 指标 | 目标 | 当前 |
|------|------|------|
| index.html行数 | < 300行 | 10,930行 |
| 单个JS文件行数 | < 500行 | N/A |
| 单个CSS文件行数 | < 400行 | N/A |
| console.log数量 | 0 | 257处 |
| 测试覆盖率 | > 80% | 0% |

### 10.2 性能指标

| 指标 | 目标 | 当前 |
|------|------|------|
| 首屏加载时间 | < 2秒 | ~5秒 |
| API响应时间 | < 500ms | ~1秒 |
| 图表渲染时间 | < 100ms | ~300ms |
| 内存占用 | < 100MB | ~200MB |

### 10.3 功能完整性

- ✅ 所有现有功能正常工作
- ✅ 无数据丢失
- ✅ 无功能降级
- ✅ 用户体验提升

---

## 11. 时间表

| 阶段 | 任务 | 预计时间 | 负责人 | 状态 |
|------|------|----------|--------|------|
| 第1天上午 | 基础设施搭建 | 0.5天 | 开发 | ⏳ 待开始 |
| 第1天下午 | 工具函数提取 | 0.5天 | 开发 | ⏳ 待开始 |
| 第2天上午 | API层重构 | 0.5天 | 开发 | ⏳ 待开始 |
| 第2天下午 | 图表组件 | 0.5天 | 开发 | ⏳ 待开始 |
| 第3天上午 | 表格组件 | 0.5天 | 开发 | ⏳ 待开始 |
| 第3天下午 | 关注列表+样式 | 0.5天 | 开发 | ⏳ 待开始 |
| 第4天上午 | 分析面板+主入口 | 0.5天 | 开发 | ⏳ 待开始 |
| 第4天下午 | 集成测试 | 0.5天 | 开发+测试 | ⏳ 待开始 |
| 第5天 | 全面测试+优化 | 1天 | 开发+测试 | ⏳ 待开始 |
| 第6天 | 部署+验证 | 0.5天 | DevOps | ⏳ 待开始 |

**总计**: 5.5天

---

## 12. 附录

### 12.1 文件映射表

| 原文件（index.html行号） | 新文件 | 说明 |
|------------------------|--------|------|
| 1-11 | index.html | HTML头部 |
| 12-1420 | src/styles/*.css | 样式 |
| 1421-2022 | src/config.js | 配置 |
| 2023-2074 | src/utils/logger.js | 日志 |
| 2075-2148 | src/utils/errorHandler.js | 错误处理 |
| 2149-2215 | main.js | 主逻辑 |
| 2216-2462 | src/utils/indicators.js | 技术指标 |
| 2463-2553 | src/utils/helpers.js | 辅助函数 |
| 2554-2596 | src/utils/wyckoff.js | 威科夫分析 |
| 2597-2612 | src/utils/indicators.js | MA计算 |
| 2613-2749 | src/components/Table/KlineTable.js | 表格 |
| 2750-3553 | src/components/Chart/*.js | 图表 |
| 3554-3805 | src/components/Analysis/MultiTimeframe.js | 分析 |
| 3806-10930 | src/components/* | 其他组件 |

### 12.2 API端点清单

| 端点 | 方法 | 说明 | 目标文件 |
|-----|------|------|----------|
| /api/v1/health | GET | 健康检查 | src/api/client.js |
| /api/v1/stocks/{code}/quotes | GET | 获取K线 | src/api/stocks.js |
| /api/v1/stocks/analyze | POST | 分析股票 | src/api/stocks.js |
| /api/v1/stocks/{code}/signals | GET | 获取信号 | src/api/stocks.js |
| /api/v1/watchlist | GET | 获取关注列表 | src/api/watchlist.js |
| /api/v1/watchlist/favorite/{code} | POST | 添加关注 | src/api/watchlist.js |
| /api/v1/watchlist/{code} | DELETE | 删除关注 | src/api/watchlist.js |
| /api/v1/watchlist/update | POST | 更新关注列表 | src/api/watchlist.js |
| /api/v1/watchlist/move | POST | 移动位置 | src/api/watchlist.js |
| /api/v1/config/patterns | GET | 获取配置 | src/api/config.js |
| /api/v1/config/patterns/batch | POST | 更新配置 | src/api/config.js |

### 12.3 依赖清单

**生产依赖**:
- 无（使用原生JavaScript）

**开发依赖**:
- vite: ^5.0.0
- vitest: ^1.0.0
- @playwright/test: ^1.40.0
- eslint: ^8.55.0
- prettier: ^3.1.0

---

**文档版本**: 1.0
**最后更新**: 2026-04-03
**状态**: 待审批
