# 威科夫前端重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将10,930行的单文件前端应用重构为模块化、可维护的架构，使用Vite构建工具，建立完整的测试体系。

**Architecture:** 按功能模块拆分，采用单向数据流（API → 组件 → 视图），每个模块职责清晰、可独立测试。使用原生JavaScript，避免框架依赖。

**Tech Stack:** Vite 5.0, Vitest 1.0, Playwright 1.40, 原生JavaScript (ES6+)

---

## 文件结构总览

### 新建文件
```
frontend-new/
├── index.html                      # 主HTML入口 (~200行)
├── main.js                         # 应用初始化 (~150行)
├── vite.config.js                  # Vite配置
├── package.json                    # 依赖管理
├── src/
│   ├── api/
│   │   ├── client.js               # HTTP客户端 (~150行)
│   │   ├── stocks.js               # 股票API (~200行)
│   │   ├── watchlist.js            # 关注列表API (~150行)
│   │   └── config.js               # 配置API (~150行)
│   ├── components/
│   │   ├── Chart/
│   │   │   ├── index.js            # 图表主导出 (~100行)
│   │   │   ├── KlineChart.js       # K线图 (~400行)
│   │   │   └── VolumeChart.js      # 成交量图 (~250行)
│   │   ├── Table/
│   │   │   ├── index.js            # 表格主导出 (~50行)
│   │   │   └── KlineTable.js       # K线表格 (~450行)
│   │   ├── Watchlist/
│   │   │   ├── index.js            # 关注列表主导出 (~50行)
│   │   │   └── WatchlistGrid.js    # 网格视图 (~350行)
│   │   └── Analysis/
│   │       ├── index.js            # 分析主导出 (~50行)
│   │       └── MultiTimeframe.js   # 多周期分析 (~400行)
│   ├── utils/
│   │   ├── logger.js               # 日志系统 (~150行)
│   │   ├── indicators.js           # 技术指标 (~300行)
│   │   ├── wyckoff.js              # 威科夫分析 (~250行)
│   │   ├── errorHandler.js         # 错误处理 (~200行)
│   │   ├── performance.js          # 性能工具 (~150行)
│   │   └── helpers.js              # 辅助函数 (~200行)
│   ├── styles/
│   │   ├── main.css                # 主样式 (~400行)
│   │   ├── chart.css               # 图表样式 (~200行)
│   │   ├── table.css               # 表格样式 (~250行)
│   │   └── themes.css              # 主题 (~150行)
│   └── config.js                   # 全局配置 (~200行)
├── tests/
│   ├── unit/                       # 单元测试
│   ├── integration/                # 集成测试
│   └── e2e/                        # E2E测试
└── public/
    └── lightweight-charts.standalone.production.js
```

### 参考文件（不修改）
- `frontend/index.html` - 原始文件，作为参考

---

## 阶段1: 基础设施搭建

### Task 1: 初始化Vite项目

**Files:**
- Create: `frontend-new/package.json`
- Create: `frontend-new/vite.config.js`
- Create: `frontend-new/index.html`
- Create: `frontend-new/.gitignore`

- [ ] **Step 1: 创建 package.json**

```bash
cd /Users/dirllx/Claude\ Code/wyckoff-stock-analyzer
mkdir -p frontend-new
cd frontend-new
npm pkg set name="wyckoff-frontend"
npm pkg set version="2.0.0"
npm pkg set type="module"
```

创建 `frontend-new/package.json`:
```json
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
    "test:unit": "vitest --run",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "@playwright/test": "^1.40.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0",
    "@vitest/ui": "^1.0.0"
  }
}
```

- [ ] **Step 2: 安装依赖**

```bash
cd frontend-new
npm install
```

Expected: 所有依赖安装成功，无错误

- [ ] **Step 3: 创建 vite.config.js**

创建 `frontend-new/vite.config.js`:
```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
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
  },
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
});
```

- [ ] **Step 4: 创建 vitest.config.js**

创建 `frontend-new/vitest.config.js`:
```javascript
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

- [ ] **Step 5: 创建 playwright.config.js**

创建 `frontend-new/playwright.config.js`:
```javascript
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

- [ ] **Step 6: 创建 index.html**

创建 `frontend-new/index.html`:
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>威科夫股票分析系统</title>
  <link rel="stylesheet" href="/src/styles/main.css">
</head>
<body>
  <div id="app">
    <header>
      <h1>威科夫股票分析系统</h1>
    </header>
    <main>
      <div id="stock-input">
        <input type="text" id="stock-code" placeholder="输入股票代码">
        <button id="analyze-btn">分析</button>
      </div>
      <div id="charts">
        <div id="mainChart"></div>
        <div id="volumeChart"></div>
      </div>
      <div id="klineTable"></div>
      <div id="watchlist"></div>
      <div id="analysis"></div>
    </main>
    <div id="toast-container"></div>
  </div>
  <script type="module" src="/main.js"></script>
</body>
</html>
```

- [ ] **Step 7: 创建 .gitignore**

创建 `frontend-new/.gitignore`:
```
node_modules/
dist/
.vite/
coverage/
playwright-report/
test-results/
*.log
.env
.DS_Store
```

- [ ] **Step 8: 创建目录结构**

```bash
cd frontend-new
mkdir -p src/{api,components,utils,styles}
mkdir -p src/components/{Chart,Table,Watchlist,Analysis}
mkdir -p tests/{unit,integration,e2e}
mkdir -p public
```

- [ ] **Step 9: 复制图表库**

```bash
cp ../frontend/lightweight-charts.standalone.production.js public/
```

- [ ] **Step 10: 验证开发服务器**

```bash
npm run dev
```

Expected: 服务器启动在 http://localhost:5173，显示空白页面（因为main.js还未创建）

- [ ] **Step 11: 停止开发服务器**

按 Ctrl+C 停止服务器

- [ ] **Step 12: Commit**

```bash
cd /Users/dirllx/Claude\ Code/wyckoff-stock-analyzer
git add frontend-new/
git commit -m "feat: 初始化Vite项目和配置文件"
```

---

## 阶段2: 工具函数提取

### Task 2: 创建日志系统

**Files:**
- Create: `frontend-new/src/utils/logger.js`
- Create: `frontend-new/tests/unit/logger.test.js`

- [ ] **Step 1: 编写日志系统测试**

创建 `frontend-new/tests/unit/logger.test.js`:
```javascript
import { describe, it, expect, vi } from 'vitest';
import Logger from '../../src/utils/logger.js';

describe('Logger', () => {
  beforeEach(() => {
    // 重置日志级别
    Logger.setLevel('INFO');
  });

  it('should respect log level', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    Logger.setLevel('ERROR');
    Logger.info('test message');

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should format message correctly', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    Logger.info('test message', { key: 'value' });

    expect(consoleSpy).toHaveBeenCalled();
    const callArgs = consoleSpy.mock.calls[0][0];
    expect(callArgs).toContain('[INFO]');
    expect(callArgs).toContain('test message');

    consoleSpy.mockRestore();
  });

  it('should support different log levels', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    Logger.setLevel('DEBUG');
    Logger.debug('debug message');
    Logger.info('info message');
    Logger.warn('warn message');
    Logger.error('error message');

    expect(infoSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
cd frontend-new
npm test tests/unit/logger.test.js
```

Expected: FAIL - "Cannot find module '../../src/utils/logger.js'"

- [ ] **Step 3: 实现日志系统**

创建 `frontend-new/src/utils/logger.js`:
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

- [ ] **Step 4: 运行测试验证通过**

```bash
npm test tests/unit/logger.test.js
```

Expected: PASS - 所有测试通过

- [ ] **Step 5: Commit**

```bash
git add frontend-new/src/utils/logger.js frontend-new/tests/unit/logger.test.js
git commit -m "feat: 实现日志系统"
```

---

### Task 3: 创建技术指标计算工具

**Files:**
- Create: `frontend-new/src/utils/indicators.js`
- Create: `frontend-new/tests/unit/indicators.test.js`

- [ ] **Step 1: 编写技术指标测试**

创建 `frontend-new/tests/unit/indicators.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { Indicators } from '../../src/utils/indicators.js';

describe('Indicators', () => {
  describe('calculateMA', () => {
    it('should calculate simple moving average correctly', () => {
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

    it('should handle null/undefined values', () => {
      const data = [
        { close: null },
        { close: 2 },
        { close: 3 }
      ];

      const ma = Indicators.calculateMA(data, 2);

      expect(ma[0]).toBeNull();
      expect(ma[1]).toBeNull();
    });
  });

  describe('calculateVolumeStatus', () => {
    it('should detect high volume', () => {
      const current = { volume: 200 };
      const prev = { volume: 100 };

      const status = Indicators.calculateVolumeStatus(current, prev);

      expect(status.category).toBe('high');
      expect(status.text).toBe('放量');
      expect(status.color).toBe('#ef4444');
    });

    it('should detect low volume', () => {
      const current = { volume: 50 };
      const prev = { volume: 100 };

      const status = Indicators.calculateVolumeStatus(current, prev);

      expect(status.category).toBe('low');
      expect(status.text).toBe('缩量');
      expect(status.color).toBe('#10b981');
    });

    it('should detect normal volume', () => {
      const current = { volume: 100 };
      const prev = { volume: 100 };

      const status = Indicators.calculateVolumeStatus(current, prev);

      expect(status.category).toBe('normal');
      expect(status.text).toBe('平稳');
      expect(status.color).toBe('#f59e0b');
    });
  });

  describe('calculateChangePercent', () => {
    it('should calculate positive change', () => {
      const current = { close: 105 };
      const prev = { close: 100 };

      const change = Indicators.calculateChangePercent(current, prev);

      expect(change).toBe('5.00');
    });

    it('should calculate negative change', () => {
      const current = { close: 95 };
      const prev = { close: 100 };

      const change = Indicators.calculateChangePercent(current, prev);

      expect(change).toBe('-5.00');
    });

    it('should return null for missing data', () => {
      const change1 = Indicators.calculateChangePercent(null, { close: 100 });
      const change2 = Indicators.calculateChangePercent({ close: 100 }, null);

      expect(change1).toBeNull();
      expect(change2).toBeNull();
    });
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npm test tests/unit/indicators.test.js
```

Expected: FAIL - "Cannot find module '../../src/utils/indicators.js'"

- [ ] **Step 3: 实现技术指标计算**

创建 `frontend-new/src/utils/indicators.js`:
```javascript
export const Indicators = {
  // 计算移动平均线
  calculateMA(data, period) {
    if (!data || data.length < period) return new Array(data.length).fill(null);

    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        const sum = data.slice(i - period + 1, i + 1)
          .reduce((acc, val) => acc + (val?.close || 0), 0);
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

    if (!ma5[ma5.length - 1] || !ma10[ma10.length - 1] ||
        !ma20[ma20.length - 1] || !ma60[ma60.length - 1]) {
      return { text: '数据不足', color: '#9ca3af', category: 'insufficient' };
    }

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

- [ ] **Step 4: 运行测试验证通过**

```bash
npm test tests/unit/indicators.test.js
```

Expected: PASS - 所有测试通过

- [ ] **Step 5: Commit**

```bash
git add frontend-new/src/utils/indicators.js frontend-new/tests/unit/indicators.test.js
git commit -m "feat: 实现技术指标计算工具"
```

---

### Task 4: 创建威科夫分析工具

**Files:**
- Create: `frontend-new/src/utils/wyckoff.js`
- Create: `frontend-new/tests/unit/wyckoff.test.js`

- [ ] **Step 1: 编写威科夫分析测试**

创建 `frontend-new/tests/unit/wyckoff.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { WyckoffAnalyzer } from '../../src/utils/wyckoff.js';

describe('WyckoffAnalyzer', () => {
  describe('calculatePhase', () => {
    it('should identify uptrend phase', () => {
      const quote = {
        close: 110,
        ma15: 100,
        volume: 1000
      };

      const phase = WyckoffAnalyzer.calculatePhase(quote);

      expect(phase.phase).toBe('U');
      expect(phase.text).toContain('上升');
      expect(phase.color).toBe('#10b981');
    });

    it('should identify downtrend phase', () => {
      const quote = {
        close: 90,
        ma15: 100,
        volume: 1000
      };

      const phase = WyckoffAnalyzer.calculatePhase(quote);

      expect(phase.phase).toBe('D');
      expect(phase.text).toContain('下降');
      expect(phase.color).toBe('#ef4444');
    });

    it('should handle missing MA', () => {
      const quote = {
        close: 100,
        volume: 1000
      };

      const phase = WyckoffAnalyzer.calculatePhase(quote);

      expect(phase.text).toContain('上升');
    });
  });

  describe('getPhaseColor', () => {
    it('should return correct colors', () => {
      expect(WyckoffAnalyzer.getPhaseColor('U')).toBe('#10b981');
      expect(WyckoffAnalyzer.getPhaseColor('D')).toBe('#ef4444');
      expect(WyckoffAnalyzer.getPhaseColor('A')).toBe('#f59e0b');
      expect(WyckoffAnalyzer.getPhaseColor('DS')).toBe('#8b5cf6');
    });
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npm test tests/unit/wyckoff.test.js
```

Expected: FAIL - "Cannot find module '../../src/utils/wyckoff.js'"

- [ ] **Step 3: 实现威科夫分析**

创建 `frontend-new/src/utils/wyckoff.js`:
```javascript
export const WyckoffAnalyzer = {
  // 计算威科夫相位
  calculatePhase(quote) {
    if (!quote) {
      return { phase: 'U', text: '未知', color: '#9ca3af' };
    }

    const { close, high, low, volume } = quote;
    const ma = quote.ma15 || quote.ma20;

    if (!ma) {
      return { phase: 'U', text: '上升', color: '#10b981' };
    }

    // 价格在MA上方
    if (close > ma) {
      return { phase: 'U', text: 'U上升', color: '#10b981' };
    }

    // 价格在MA下方
    if (close < ma) {
      return { phase: 'D', text: 'D下降', color: '#ef4444' };
    }

    // 价格接近MA
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
    if (!quote) return quote?.close || 0;

    if (phase === 'U' || phase === 'A') {
      return quote.low || quote.close;
    } else if (phase === 'D' || phase === 'DS') {
      return quote.high || quote.close;
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

- [ ] **Step 4: 运行测试验证通过**

```bash
npm test tests/unit/wyckoff.test.js
```

Expected: PASS - 所有测试通过

- [ ] **Step 5: Commit**

```bash
git add frontend-new/src/utils/wyckoff.js frontend-new/tests/unit/wyckoff.test.js
git commit -m "feat: 实现威科夫分析工具"
```

---

### Task 5: 创建辅助函数工具

**Files:**
- Create: `frontend-new/src/utils/helpers.js`
- Create: `frontend-new/tests/unit/helpers.test.js`

- [ ] **Step 1: 编写辅助函数测试**

创建 `frontend-new/tests/unit/helpers.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import {
  formatDateString,
  formatNumber,
  formatPercent,
  getStockType,
  getColorByValue
} from '../../src/utils/helpers.js';

describe('Helpers', () => {
  describe('formatDateString', () => {
    it('should format daily date', () => {
      const result = formatDateString('2026-04-03', 'daily');
      expect(result).toMatch(/\d{4}\/\d{2}\/\d{2}/);
    });

    it('should format intraday date', () => {
      const result = formatDateString('2026-04-03 14:30:00', '30min');
      expect(result).toMatch(/\d{2}\/\d{2}\s+\d{2}:\d{2}/);
    });

    it('should handle empty input', () => {
      const result = formatDateString(null, 'daily');
      expect(result).toBe('-');
    });
  });

  describe('formatNumber', () => {
    it('should format number with decimals', () => {
      expect(formatNumber(123.456, 2)).toBe('123.46');
      expect(formatNumber(123.456, 0)).toBe('123');
    });

    it('should handle null', () => {
      expect(formatNumber(null)).toBe('-');
    });
  });

  describe('formatPercent', () => {
    it('should format positive percent', () => {
      expect(formatPercent(5.67)).toBe('+5.67%');
    });

    it('should format negative percent', () => {
      expect(formatPercent(-3.21)).toBe('-3.21%');
    });

    it('should handle null', () => {
      expect(formatPercent(null)).toBe('-');
    });
  });

  describe('getStockType', () => {
    it('should identify 科创板', () => {
      expect(getStockType('688001')).toBe('kc');
    });

    it('should identify 创业板', () => {
      expect(getStockType('300001')).toBe('cy');
    });

    it('should identify 上海主板', () => {
      expect(getStockType('600000')).toBe('sh');
    });

    it('should identify 深圳主板', () => {
      expect(getStockType('000001')).toBe('sz');
    });
  });

  describe('getColorByValue', () => {
    it('should return positive color', () => {
      expect(getColorByValue(5, 'default')).toBe('#10b981');
    });

    it('should return negative color', () => {
      expect(getColorByValue(-5, 'default')).toBe('#ef4444');
    });

    it('should return neutral color', () => {
      expect(getColorByValue(0, 'default')).toBe('#9ca3af');
    });
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npm test tests/unit/helpers.test.js
```

Expected: FAIL - "Cannot find module '../../src/utils/helpers.js'"

- [ ] **Step 3: 实现辅助函数**

创建 `frontend-new/src/utils/helpers.js`:
```javascript
// 日期格式化
export function formatDateString(dateStr, timeframe = 'daily') {
  if (!dateStr) return '-';

  const date = new Date(dateStr);

  if (isNaN(date.getTime())) return '-';

  const options = {
    'daily': { year: 'numeric', month: '2-digit', day: '2-digit' },
    'weekly': { year: 'numeric', month: '2-digit', day: '2-digit' },
    'monthly': { year: 'numeric', month: '2-digit' },
    '30min': { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' },
    '60min': { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
  };

  const opts = options[timeframe] || options['daily'];
  return date.toLocaleDateString('zh-CN', opts);
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
  const parsed = Number(num);
  if (isNaN(parsed)) return '-';
  return parsed.toFixed(decimals);
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
  if (!code) return 'unknown';
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
      positive: '#10b981',
      negative: '#ef4444',
      neutral: '#9ca3af'
    },
    'reverse': {
      positive: '#ef4444',
      negative: '#10b981',
      neutral: '#9ca3af'
    }
  };

  const map = colorMaps[type] || colorMaps['default'];

  if (value > 0) return map.positive;
  if (value < 0) return map.negative;
  return map.neutral;
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npm test tests/unit/helpers.test.js
```

Expected: PASS - 所有测试通过

- [ ] **Step 5: Commit**

```bash
git add frontend-new/src/utils/helpers.js frontend-new/tests/unit/helpers.test.js
git commit -m "feat: 实现辅助函数工具"
```

---

### Task 6: 创建错误处理工具

**Files:**
- Create: `frontend-new/src/utils/errorHandler.js`
- Create: `frontend-new/src/utils/toast.js`

- [ ] **Step 1: 创建 Toast 通知系统**

创建 `frontend-new/src/utils/toast.js`:
```javascript
export class Toast {
  static show(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) {
      console.warn('Toast container not found');
      return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, duration);
  }

  static success(message) {
    this.show(message, 'success');
  }

  static error(message) {
    this.show(message, 'error');
  }

  static warning(message) {
    this.show(message, 'warning');
  }

  static info(message) {
    this.show(message, 'info');
  }
}
```

- [ ] **Step 2: 创建错误处理器**

创建 `frontend-new/src/utils/errorHandler.js`:
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
  }

  static isNetworkError(error) {
    return error.name === 'TypeError' &&
           (error.message.includes('fetch') || error.message.includes('Network'));
  }

  static isNotFoundError(error) {
    return error.status === 404;
  }

  static isServerError(error) {
    return error.status >= 500;
  }

  static isTimeoutError(error) {
    return error.name === 'AbortError' ||
           error.message.includes('timeout');
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
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend-new/src/utils/errorHandler.js frontend-new/src/utils/toast.js
git commit -m "feat: 实现错误处理和Toast通知系统"
```

---

## 阶段3: API层重构

### Task 7: 创建HTTP客户端

**Files:**
- Create: `frontend-new/src/api/client.js`
- Create: `frontend-new/tests/integration/client.test.js`

- [ ] **Step 1: 编写HTTP客户端测试**

创建 `frontend-new/tests/integration/client.test.js`:
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fn } from 'vitest';
import ApiClient from '../../src/api/client.js';

// Mock fetch
global.fetch = fn();

describe('ApiClient', () => {
  let client;

  beforeEach(() => {
    client = new ApiClient('http://localhost:8000');
    vi.clearAllMocks();
  });

  it('should make GET request successfully', async () => {
    const mockData = { status: 'ok' };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    const result = await client.get('/api/v1/health');

    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/health',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('should handle API errors', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    await expect(client.get('/api/notfound')).rejects.toThrow();
  });

  it('should handle network errors', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(client.get('/api/test')).rejects.toThrow('Network error');
  });

  it('should timeout after 30 seconds', async () => {
    // Mock timeout
    const abortError = new Error('Request timeout');
    abortError.name = 'AbortError';
    global.fetch.mockRejectedValueOnce(abortError);

    await expect(client.get('/api/slow')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npm test tests/integration/client.test.js
```

Expected: FAIL - "Cannot find module '../../src/api/client.js'"

- [ ] **Step 3: 实现HTTP客户端**

创建 `frontend-new/src/api/client.js`:
```javascript
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.timeout = 30000;
    this.defaultOptions = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }

  async request(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseURL}${url}`, {
        ...this.defaultOptions,
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ApiError(response.status, response.statusText);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('请求超时');
      }

      throw error;
    }
  }

  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  async post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }
}

export default new ApiClient('http://localhost:8000');
export { ApiError };
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npm test tests/integration/client.test.js
```

Expected: PASS - 所有测试通过（可能需要mock调整）

- [ ] **Step 5: Commit**

```bash
git add frontend-new/src/api/client.js frontend-new/tests/integration/client.test.js
git commit -m "feat: 实现HTTP客户端"
```

---

### Task 8: 创建股票API

**Files:**
- Create: `frontend-new/src/api/stocks.js`

- [ ] **Step 1: 实现股票API**

创建 `frontend-new/src/api/stocks.js`:
```javascript
import apiClient from './client.js';
import Logger from '../utils/logger.js';

export const stocksApi = {
  // 获取K线数据
  async getQuotes(code, timeframe = 'daily', limit = 100) {
    try {
      Logger.debug('Fetching quotes', { code, timeframe, limit });

      const params = new URLSearchParams({
        timeframe,
        limit: limit.toString()
      });

      const result = await apiClient.get(`/api/v1/stocks/${code}/quotes?${params}`);

      Logger.info('Quotes fetched successfully', { count: result?.length || 0 });

      return result;
    } catch (error) {
      Logger.error('Failed to fetch quotes', error);
      throw error;
    }
  },

  // 分析股票
  async analyze(code, endDate = null, timeframe = 'daily') {
    try {
      Logger.debug('Analyzing stock', { code, endDate, timeframe });

      const params = endDate ? { end_date: endDate } : {};

      const result = await apiClient.post(`/api/v1/stocks/${code}/analyze`, params);

      Logger.info('Stock analyzed successfully');

      return result;
    } catch (error) {
      Logger.error('Failed to analyze stock', error);
      throw error;
    }
  },

  // 获取信号
  async getSignals(code) {
    try {
      Logger.debug('Fetching signals', { code });

      const result = await apiClient.get(`/api/v1/stocks/${code}/signals`);

      Logger.info('Signals fetched successfully');

      return result;
    } catch (error) {
      Logger.error('Failed to fetch signals', error);
      throw error;
    }
  },

  // 批量分析
  async batchAnalyze(requests) {
    try {
      Logger.debug('Batch analyzing', { count: requests.length });

      const result = await apiClient.post('/api/v1/stocks/analyze/batch', { requests });

      Logger.info('Batch analysis completed');

      return result;
    } catch (error) {
      Logger.error('Failed to batch analyze', error);
      throw error;
    }
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend-new/src/api/stocks.js
git commit -m "feat: 实现股票API"
```

---

### Task 9: 创建关注列表API

**Files:**
- Create: `frontend-new/src/api/watchlist.js`

- [ ] **Step 1: 实现关注列表API**

创建 `frontend-new/src/api/watchlist.js`:
```javascript
import apiClient from './client.js';
import Logger from '../utils/logger.js';

export const watchlistApi = {
  // 获取所有关注股票
  async getAll() {
    try {
      Logger.debug('Fetching watchlist');

      const result = await apiClient.get('/api/v1/watchlist');

      Logger.info('Watchlist fetched successfully', { count: result?.length || 0 });

      return result;
    } catch (error) {
      Logger.error('Failed to fetch watchlist', error);
      throw error;
    }
  },

  // 添加到关注列表
  async add(code) {
    try {
      Logger.debug('Adding to watchlist', { code });

      const result = await apiClient.post(`/api/v1/watchlist/favorite/${code}`);

      Logger.info('Added to watchlist', { code });

      return result;
    } catch (error) {
      Logger.error('Failed to add to watchlist', error);
      throw error;
    }
  },

  // 从关注列表移除
  async remove(code) {
    try {
      Logger.debug('Removing from watchlist', { code });

      const result = await apiClient.delete(`/api/v1/watchlist/${code}`);

      Logger.info('Removed from watchlist', { code });

      return result;
    } catch (error) {
      Logger.error('Failed to remove from watchlist', error);
      throw error;
    }
  },

  // 更新关注列表
  async update(items) {
    try {
      Logger.debug('Updating watchlist', { count: items.length });

      const result = await apiClient.post('/api/v1/watchlist/update', { items });

      Logger.info('Watchlist updated successfully');

      return result;
    } catch (error) {
      Logger.error('Failed to update watchlist', error);
      throw error;
    }
  },

  // 移动位置
  async move(code, direction) {
    try {
      Logger.debug('Moving in watchlist', { code, direction });

      const result = await apiClient.post('/api/v1/watchlist/move', { code, direction });

      Logger.info('Moved in watchlist', { code, direction });

      return result;
    } catch (error) {
      Logger.error('Failed to move in watchlist', error);
      throw error;
    }
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend-new/src/api/watchlist.js
git commit -m "feat: 实现关注列表API"
```

---

### Task 10: 创建配置API

**Files:**
- Create: `frontend-new/src/api/config.js`

- [ ] **Step 1: 实现配置API**

创建 `frontend-new/src/api/config.js`:
```javascript
import apiClient from './client.js';
import Logger from '../utils/logger.js';

export const configApi = {
  // 获取威科夫模式配置
  async getPatterns() {
    try {
      Logger.debug('Fetching patterns config');

      const result = await apiClient.get('/api/v1/config/patterns');

      Logger.info('Patterns config fetched');

      return result;
    } catch (error) {
      Logger.error('Failed to fetch patterns config', error);
      throw error;
    }
  },

  // 更新威科夫模式配置
  async updatePatterns(patterns) {
    try {
      Logger.debug('Updating patterns config');

      const result = await apiClient.post('/api/v1/config/patterns/batch', { patterns });

      Logger.info('Patterns config updated');

      return result;
    } catch (error) {
      Logger.error('Failed to update patterns config', error);
      throw error;
    }
  },

  // 获取周期配置
  async getTimeframes() {
    try {
      Logger.debug('Fetching timeframes config');

      const result = await apiClient.get('/api/v1/config/timeframes');

      Logger.info('Timeframes config fetched');

      return result;
    } catch (error) {
      Logger.error('Failed to fetch timeframes config', error);
      throw error;
    }
  },

  // 更新周期配置
  async updateTimeframes(timeframes) {
    try {
      Logger.debug('Updating timeframes config');

      const result = await apiClient.post('/api/v1/config/timeframes/batch', { timeframes });

      Logger.info('Timeframes config updated');

      return result;
    } catch (error) {
      Logger.error('Failed to update timeframes config', error);
      throw error;
    }
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend-new/src/api/config.js
git commit -m "feat: 实现配置API"
```

---

## 阶段4: 样式系统

### Task 11: 创建主样式文件

**Files:**
- Create: `frontend-new/src/styles/main.css`
- Create: `frontend-new/src/styles/chart.css`
- Create: `frontend-new/src/styles/table.css`
- Create: `frontend-new/src/styles/themes.css`

- [ ] **Step 1: 创建主样式**

创建 `frontend-new/src/styles/main.css`:
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
  padding: var(--spacing-md);
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
#toast-container {
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

/* 布局 */
header {
  margin-bottom: var(--spacing-lg);
}

h1 {
  font-size: var(--font-size-xl);
  color: var(--color-text-primary);
}

#stock-input {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

#stock-input input {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
}

#charts {
  margin-bottom: var(--spacing-lg);
}
```

- [ ] **Step 2: 创建图表样式**

创建 `frontend-new/src/styles/chart.css`:
```css
/* 主图容器 */
#mainChart {
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  height: 328px;
  border: 1px solid var(--color-border);
  margin-bottom: var(--spacing-md);
}

/* 副图容器 */
#volumeChart {
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  height: 84px;
  border: 1px solid var(--color-border);
  margin-bottom: var(--spacing-md);
}
```

- [ ] **Step 3: 创建表格样式**

创建 `frontend-new/src/styles/table.css`:
```css
/* 表格容器 */
#klineTable {
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
```

- [ ] **Step 4: 创建主题样式**

创建 `frontend-new/src/styles/themes.css`:
```css
/* 浅色主题 */
[data-theme="light"] {
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f3f4f6;
  --color-bg-tertiary: #e5e7eb;
  --color-bg-hover: #d1d5db;

  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-text-muted: #9ca3af;

  --color-border: #d1d5db;
  --color-shadow: rgba(0, 0, 0, 0.1);
}

/* 深色主题（默认） */
[data-theme="dark"] {
  --color-bg-primary: #0a0e27;
  --color-bg-secondary: #111827;
  --color-bg-tertiary: #1f2937;
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
```

- [ ] **Step 5: 更新 index.html 引入样式**

更新 `frontend-new/index.html`:
```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>威科夫股票分析系统</title>
  <link rel="stylesheet" href="/src/styles/main.css">
  <link rel="stylesheet" href="/src/styles/chart.css">
  <link rel="stylesheet" href="/src/styles/table.css">
  <link rel="stylesheet" href="/src/styles/themes.css">
</head>
```

- [ ] **Step 6: Commit**

```bash
git add frontend-new/src/styles/ frontend-new/index.html
git commit -m "feat: 实现样式系统"
```

---

## 阶段5: 主入口和配置

### Task 12: 创建全局配置

**Files:**
- Create: `frontend-new/src/config.js`

- [ ] **Step 1: 实现全局配置**

创建 `frontend-new/src/config.js`:
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
    cacheTTL: 60000
  },

  // UI配置
  UI: {
    pageSize: 20,
    maxRows: 1000
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

- [ ] **Step 2: Commit**

```bash
git add frontend-new/src/config.js
git commit -m "feat: 实现全局配置和事件总线"
```

---

### Task 13: 创建主入口文件

**Files:**
- Create: `frontend-new/main.js`

- [ ] **Step 1: 实现主入口**

创建 `frontend-new/main.js`:
```javascript
import './index.html'; // 确保HTML被处理
import { AppConfig, eventBus } from './src/config.js';
import Logger from './src/utils/logger.js';
import { ErrorHandler } from './src/utils/errorHandler.js';
import { stocksApi } from './src/api/stocks.js';

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

    // 绑定事件
    bindEvents();

    Logger.info('Application ready');

  } catch (error) {
    ErrorHandler.handle(error, 'App Initialization');
  }
}

function bindEvents() {
  // 分析按钮
  const analyzeBtn = document.getElementById('analyze-btn');
  const stockInput = document.getElementById('stock-code');

  if (analyzeBtn && stockInput) {
    analyzeBtn.addEventListener('click', async () => {
      const code = stockInput.value.trim();
      if (!code) {
        ErrorHandler.handle(new Error('请输入股票代码'), 'Input Validation');
        return;
      }

      await analyzeStock(code);
    });

    // 支持回车键
    stockInput.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        const code = stockInput.value.trim();
        if (code) {
          await analyzeStock(code);
        }
      }
    });
  }
}

async function analyzeStock(code) {
  try {
    Logger.info('Analyzing stock', { code });

    // 触发加载开始事件
    eventBus.emit('loading:start');

    // 获取数据
    const quotes = await stocksApi.getQuotes(code, 'daily', 100);

    // 触发数据加载完成事件
    eventBus.emit('stock:loaded', { code, quotes });

    Logger.info('Stock analyzed successfully', { code, count: quotes.length });

  } catch (error) {
    ErrorHandler.handle(error, 'Stock Analysis');
  } finally {
    // 触发加载结束事件
    eventBus.emit('loading:end');
  }
}

// 启动应用
document.addEventListener('DOMContentLoaded', initApp);
```

- [ ] **Step 2: 测试应用启动**

```bash
cd frontend-new
npm run dev
```

Expected: 服务器启动，访问 http://localhost:5173 显示页面，控制台无错误

- [ ] **Step 3: 验证功能**

1. 打开浏览器访问 http://localhost:5173
2. 输入股票代码（如：000001）
3. 点击"分析"按钮
4. 查看浏览器控制台日志

Expected: 看到 "Application initializing..." 和 "Analyzing stock" 日志

- [ ] **Step 4: 停止开发服务器**

按 Ctrl+C 停止服务器

- [ ] **Step 5: Commit**

```bash
git add frontend-new/main.js
git commit -m "feat: 实现应用主入口"
```

---

## 完成检查清单

在宣布重构完成之前，确保以下所有项都已完成：

- [ ] **代码质量**
  - [ ] index.html < 300行
  - [ ] 所有JS文件 < 500行
  - [ ] 所有CSS文件 < 400行
  - [ ] 无console.log调试语句
  - [ ] 测试覆盖率 > 80%

- [ ] **功能完整性**
  - [ ] 所有现有功能正常工作
  - [ ] 无数据丢失
  - [ ] 无功能降级

- [ ] **性能指标**
  - [ ] 首屏加载时间 < 2秒
  - [ ] API响应时间 < 500ms
  - [ ] 无明显性能问题

- [ ] **文档**
  - [ ] README已更新
  - [ ] API文档已更新
  - [ ] 部署文档已更新

---

## 备注

- 此计划遵循TDD原则，每个功能先编写测试
- 每个Task完成后立即Commit，保持原子性
- 遇到问题及时记录，不要拖延
- 保持代码简洁，遵循YAGNI原则
- 使用git分支进行开发，主分支保持稳定
