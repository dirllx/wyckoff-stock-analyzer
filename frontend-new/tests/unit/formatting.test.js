/**
 * formatting.test.js
 * 格式化工具函数测试
 */

import { describe, it, expect } from 'vitest';
import {
  getChangeColorClass,
  getChangeColor,
  formatNumber,
  formatVolume,
  formatPercent,
  getScoreColorClass,
  getScoreColor,
  getSignalStyle,
  getWyckoffPhaseStyle,
  createSignalBadge,
  createPhaseBadge,
  createScoreBadge,
  formatDateString,
  formatQuote
} from '../../src/utils/formatting.js';

describe('formatting - 涨跌颜色', () => {
  describe('getChangeColorClass', () => {
    it('应该返回绿色当价格上涨', () => {
      expect(getChangeColorClass(105, 100)).toBe('kline-green');
    });

    it('应该返回红色当价格下跌', () => {
      expect(getChangeColorClass(95, 100)).toBe('kline-red');
    });

    it('应该返回中性当价格不变', () => {
      expect(getChangeColorClass(100, 100)).toBe('kline-neutral');
    });

    it('应该处理空值', () => {
      expect(getChangeColorClass(null, 100)).toBe('');
      expect(getChangeColorClass(100, null)).toBe('');
      expect(getChangeColorClass(undefined, 100)).toBe('');
    });
  });

  describe('getChangeColor', () => {
    it('应该返回绿色值当价格上涨', () => {
      expect(getChangeColor(105, 100)).toBe('#10b981');
    });

    it('应该返回红色值当价格下跌', () => {
      expect(getChangeColor(95, 100)).toBe('#ef4444');
    });

    it('应该返回中性颜色当价格不变', () => {
      expect(getChangeColor(100, 100)).toBe('#94a3b8');
    });
  });
});

describe('formatting - 数字格式化', () => {
  describe('formatNumber', () => {
    it('应该格式化大数字为千分位', () => {
      expect(formatNumber(1234567.89)).toBe('1,234,567.89');
    });

    it('应该处理小数位数', () => {
      expect(formatNumber(1234.567, 2)).toBe('1,234.57');
      expect(formatNumber(1234.567, 0)).toBe('1,235');
    });

    it('应该处理空值', () => {
      expect(formatNumber(null)).toBe('-');
      expect(formatNumber(undefined)).toBe('-');
    });

    it('应该处理非数字', () => {
      expect(formatNumber(NaN)).toBe('-');
    });

    it('应该处理零', () => {
      expect(formatNumber(0)).toBe('0.00');
    });
  });

  describe('formatVolume', () => {
    it('应该格式化亿级成交量', () => {
      expect(formatVolume(123456789)).toBe('1.23亿');
    });

    it('应该格式化万级成交量', () => {
      expect(formatVolume(123456)).toBe('12.35万');
    });

    it('应该格式化小成交量', () => {
      expect(formatVolume(1234)).toBe('1,234');
    });

    it('应该处理空值和零', () => {
      expect(formatVolume(0)).toBe('-');
      expect(formatVolume(null)).toBe('-');
      expect(formatVolume(undefined)).toBe('-');
    });
  });

  describe('formatPercent', () => {
    it('应该格式化正百分比', () => {
      expect(formatPercent(5.67)).toBe('+5.67%');
    });

    it('应该格式化负百分比', () => {
      expect(formatPercent(-3.45)).toBe('-3.45%');
    });

    it('应该格式化零百分比', () => {
      expect(formatPercent(0)).toBe('+0.00%');
    });

    it('应该处理空值', () => {
      expect(formatPercent(null)).toBe('-');
      expect(formatPercent(undefined)).toBe('-');
    });

    it('应该处理非数字', () => {
      expect(formatPercent(NaN)).toBe('-');
    });
  });
});

describe('formatting - 评分样式', () => {
  describe('getScoreColorClass', () => {
    it('应该返回高分类当评分>=4', () => {
      expect(getScoreColorClass(4)).toBe('score-high');
      expect(getScoreColorClass(5)).toBe('score-high');
    });

    it('应该返回中分类当评分>=3', () => {
      expect(getScoreColorClass(3)).toBe('score-medium');
      expect(getScoreColorClass(3.5)).toBe('score-medium');
    });

    it('应该返回低分类当评分<3', () => {
      expect(getScoreColorClass(2)).toBe('score-low');
      expect(getScoreColorClass(1)).toBe('score-low');
    });

    it('应该处理空值', () => {
      expect(getScoreColorClass(null)).toBe('');
      expect(getScoreColorClass(undefined)).toBe('');
    });
  });

  describe('getScoreColor', () => {
    it('应该返回绿色当评分>=4', () => {
      expect(getScoreColor(4)).toBe('#22c55e');
      expect(getScoreColor(5)).toBe('#22c55e');
    });

    it('应该返回橙色当评分>=3', () => {
      expect(getScoreColor(3)).toBe('#f59e0b');
      expect(getScoreColor(3.5)).toBe('#f59e0b');
    });

    it('应该返回灰色当评分<3', () => {
      expect(getScoreColor(2)).toBe('#6b7280');
    });

    it('应该返回灰色当空值', () => {
      expect(getScoreColor(null)).toBe('#94a3b8');
    });
  });

  describe('createScoreBadge', () => {
    it('应该创建高分徽章', () => {
      const badge = createScoreBadge(4.5);
      expect(badge).toContain('score-high');
      expect(badge).toContain('⭐⭐⭐⭐⭐');
      expect(badge).toContain('4.5分');
    });

    it('应该创建整数评分徽章', () => {
      const badge = createScoreBadge(3);
      expect(badge).toContain('3分');
      expect(badge).not.toContain('.0');
    });

    it('应该创建低分徽章', () => {
      const badge = createScoreBadge(2);
      expect(badge).toContain('score-low');
      expect(badge).toContain('⭐⭐');
    });
  });
});

describe('formatting - 信号样式', () => {
  describe('getSignalStyle', () => {
    it('应该返回做多样式', () => {
      const style = getSignalStyle('LONG');
      expect(style.class).toBe('signal-bullish');
      expect(style.text).toBe('做多');
      expect(style.color).toBe('#22c55e');
      expect(style.icon).toBe('📈');
    });

    it('应该返回做空样式', () => {
      const style = getSignalStyle('SHORT');
      expect(style.class).toBe('signal-bearish');
      expect(style.text).toBe('做空');
      expect(style.color).toBe('#ef4444');
      expect(style.icon).toBe('📉');
    });

    it('应该返回中性样式', () => {
      const style = getSignalStyle('NEUTRAL');
      expect(style.class).toBe('signal-neutral');
      expect(style.text).toBe('中性');
      expect(style.icon).toBe('➡️');
    });

    it('应该返回中性样式当未知方向', () => {
      const style = getSignalStyle('UNKNOWN');
      expect(style.class).toBe('signal-neutral');
    });
  });

  describe('createSignalBadge', () => {
    it('应该创建做多徽章', () => {
      const badge = createSignalBadge('LONG');
      expect(badge).toContain('signal-bullish');
      expect(badge).toContain('📈');
      expect(badge).toContain('做多');
    });

    it('应该创建带评分的徽章', () => {
      const badge = createSignalBadge('LONG', 4.5);
      expect(badge).toContain('4.5');
    });

    it('应该创建做空徽章', () => {
      const badge = createSignalBadge('SHORT');
      expect(badge).toContain('signal-bearish');
      expect(badge).toContain('📉');
    });
  });
});

describe('formatting - 威科夫阶段样式', () => {
  describe('getWyckoffPhaseStyle', () => {
    it('应该返回上升阶段样式', () => {
      const style = getWyckoffPhaseStyle('U');
      expect(style.class).toBe('phase-U');
      expect(style.text).toBe('上升');
      expect(style.color).toBe('#22c55e');
    });

    it('应该返回下降阶段样式', () => {
      const style = getWyckoffPhaseStyle('D');
      expect(style.class).toBe('phase-D');
      expect(style.text).toBe('下降');
      expect(style.color).toBe('#ef4444');
    });

    it('应该返回吸筹阶段样式', () => {
      const style = getWyckoffPhaseStyle('A');
      expect(style.class).toBe('phase-A');
      expect(style.text).toBe('吸筹');
      expect(style.color).toBe('#8b5cf6');
    });

    it('应该返回派发阶段样式', () => {
      const style = getWyckoffPhaseStyle('DS');
      expect(style.class).toBe('phase-DS');
      expect(style.text).toBe('派发');
      expect(style.color).toBe('#f59e0b');
    });

    it('应该返回震荡阶段样式', () => {
      const style = getWyckoffPhaseStyle('震荡');
      expect(style.class).toBe('phase-neutral');
      expect(style.text).toBe('震荡');
    });

    it('应该处理带括号的阶段', () => {
      const style = getWyckoffPhaseStyle('U(放量上涨)');
      expect(style.text).toBe('上升');
      expect(style.class).toBe('phase-U');
    });

    it('应该返回震荡当未知阶段', () => {
      const style = getWyckoffPhaseStyle('UNKNOWN');
      expect(style.class).toBe('phase-neutral');
    });
  });

  describe('createPhaseBadge', () => {
    it('应该创建上升阶段徽章', () => {
      const badge = createPhaseBadge('U');
      expect(badge).toContain('phase-U');
      expect(badge).toContain('上升');
    });

    it('应该创建下降阶段徽章', () => {
      const badge = createPhaseBadge('D');
      expect(badge).toContain('phase-D');
      expect(badge).toContain('下降');
    });
  });
});

describe('formatting - 日期格式化', () => {
  describe('formatDateString', () => {
    it('应该格式化分钟线日期为 MM-DD HH:MM', () => {
      const dateStr = '2024-01-15T14:30:00';
      expect(formatDateString(dateStr, '30')).toBe('01-15 14:30');
    });

    it('应该格式化日线日期为 MM-DD', () => {
      const dateStr = '2024-01-15T00:00:00';
      expect(formatDateString(dateStr, 'daily')).toBe('01-15');
    });

    it('应该格式化周线日期为 MM-DD', () => {
      const dateStr = '2024-01-15T00:00:00';
      expect(formatDateString(dateStr, 'weekly')).toBe('01-15');
    });

    it('应该处理空值', () => {
      expect(formatDateString(null)).toBe('-');
      expect(formatDateString('')).toBe('-');
    });
  });
});

describe('formatting - K线数据格式化', () => {
  describe('formatQuote', () => {
    it('应该格式化K线数据', () => {
      const quote = {
        open: 100,
        high: 105,
        low: 98,
        close: 103,
        volume: 123456789,
        prev_close: 100
      };

      const formatted = formatQuote(quote);

      expect(formatted.openFormatted).toBe('100.00');
      expect(formatted.highFormatted).toBe('105.00');
      expect(formatted.lowFormatted).toBe('98.00');
      expect(formatted.closeFormatted).toBe('103.00');
      expect(formatted.volumeFormatted).toBe('1.23亿');
      expect(formatted.change).toBe(3);
      expect(formatted.changePercent).toBe(3);
      expect(formatted.changeColor).toBe('kline-green');
    });

    it('应该使用open作为prev_close当不存在', () => {
      const quote = {
        open: 100,
        high: 105,
        low: 98,
        close: 103,
        volume: 10000
      };

      const formatted = formatQuote(quote);

      expect(formatted.change).toBe(3);
    });

    it('应该计算下跌变化', () => {
      const quote = {
        open: 100,
        high: 100,
        low: 95,
        close: 97,
        volume: 10000,
        prev_close: 100
      };

      const formatted = formatQuote(quote);

      expect(formatted.change).toBe(-3);
      expect(formatted.changePercent).toBe(-3);
      expect(formatted.changeColor).toBe('kline-red');
    });
  });
});
