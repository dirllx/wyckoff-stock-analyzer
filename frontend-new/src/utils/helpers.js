/**
 * Helper utility functions for the Wyckoff Stock Analyzer
 * @module helpers
 */

/**
 * Formats a date string based on the timeframe
 * @param {string} dateStr - The date string to format (e.g., "2024-01-15" or "2024-01-15 10:30:00")
 * @param {string} timeframe - The timeframe ('daily', 'weekly', 'monthly', '60m', '30m', etc.)
 * @returns {string} The formatted date string
 */
export function formatDateString(dateStr, timeframe) {
  if (!dateStr) return '';

  try {
    // 使用 Date 对象解析各种格式（ISO、标准格式等）
    const date = new Date(dateStr);

    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return dateStr;
    }

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // 分钟线（1、5、15、30、60分钟）显示日期和时间
    if (['1', '5', '15', '30', '60', '1m', '5m', '15m', '30m', '60m'].includes(timeframe)) {
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      return `${month}-${day} ${hour}:${minute}`;
    }

    // 日线、周线、月线只显示 MM-DD
    return `${month}-${day}`;
  } catch (error) {
    return dateStr;
  }
}

/**
 * Gets the ISO week number for a date
 * @param {Date} date - The date to get the week number for
 * @returns {number} The ISO week number (1-53)
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Deduplicates quotes based on the timeframe
 * Keeps only the last quote for each unique date period
 * @param {Array} quotes - Array of quote objects
 * @param {string} timeframe - The timeframe ('day', 'week', 'month')
 * @returns {Array} Deduplicated quotes array with formatted dates
 */
export function deduplicateQuotes(quotes, timeframe) {
  if (!quotes || quotes.length === 0) {
    return [];
  }

  const seen = new Map();

  // Process quotes in reverse order to keep the last occurrence
  const reversed = [...quotes].reverse();
  const unique = [];

  for (const quote of reversed) {
    const key = formatDateString(quote.date, timeframe);

    if (!seen.has(key)) {
      seen.set(key, true);
      // Return a new object with formatted date
      unique.unshift({
        ...quote,
        date: key
      });
    }
  }

  return unique;
}

/**
 * Formats a number with thousand separators and decimal places
 * @param {number} num - The number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} The formatted number string
 */
export function formatNumber(num, decimals = 2) {
  if (typeof num !== 'number' || isNaN(num)) {
    return '0.00';
  }

  const rounded = num.toFixed(decimals);
  const parts = rounded.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return parts.join('.');
}

/**
 * Formats a decimal value as a percentage with sign
 * @param {number} value - The decimal value to format (e.g., 0.1234 for 12.34%)
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} The formatted percentage string
 */
export function formatPercent(value, decimals = 2) {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0.00%';
  }

  const percentage = value * 100;
  const sign = percentage > 0 ? '+' : '';
  return `${sign}${percentage.toFixed(decimals)}%`;
}

/**
 * Determines the stock type based on the stock code
 * @param {string} code - The stock code
 * @returns {string} The stock type ('A股', '港股', '美股', '创业板', '指数', '未知')
 */
export function getStockType(code) {
  if (!code || typeof code !== 'string') {
    return '未知';
  }

  const trimmedCode = code.trim().toUpperCase();

  // Indices (specific codes) - check first before other patterns
  if (['000001', '399001', '000300', '000016', '000905'].includes(trimmedCode)) {
    return '指数';
  }

  // US stocks (letters only)
  if (/^[A-Z]+$/.test(trimmedCode)) {
    return '美股';
  }

  // Hong Kong stocks (5 digits starting with 0)
  if (/^\d{5}$/.test(trimmedCode) && trimmedCode.startsWith('0')) {
    return '港股';
  }

  // Shanghai A-shares (6 digits starting with 6)
  if (/^6\d{5}$/.test(trimmedCode)) {
    return 'A股';
  }

  // Shenzhen A-shares (6 digits starting with 0, excluding indices)
  if (/^0\d{5}$/.test(trimmedCode)) {
    return 'A股';
  }

  // ChiNext (6 digits starting with 3)
  if (/^3\d{5}$/.test(trimmedCode)) {
    return '创业板';
  }

  return '未知';
}

/**
 * Gets a color based on the value and type
 * Uses China market convention: red for up, green for down
 * @param {number} value - The value to check
 * @param {string} type - The type of value ('change', 'volume', 'ma', etc.)
 * @returns {string} The hex color code
 */
export function getColorByValue(value, type = 'change') {
  if (typeof value !== 'number' || isNaN(value)) {
    return '#78909c'; // Neutral gray
  }

  switch (type) {
    case 'change':
      if (value > 0) {
        return '#ef5350'; // Red (up in China market)
      } else if (value < 0) {
        return '#26a69a'; // Green (down in China market)
      } else {
        return '#78909c'; // Neutral gray
      }

    case 'volume':
      return '#42a5f5'; // Blue for volume

    case 'ma':
      return '#ffa726'; // Orange for moving averages

    default:
      return '#78909c'; // Default neutral gray
  }
}

/**
 * Truncates a string to a maximum length and adds ellipsis
 * @param {string} str - The string to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} The truncated string
 */
export function truncate(str, maxLength = 50) {
  if (!str || typeof str !== 'string') {
    return '';
  }

  if (str.length <= maxLength) {
    return str;
  }

  return str.substring(0, maxLength) + '...';
}

/**
 * Safely parses JSON string
 * @param {string} jsonStr - The JSON string to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} The parsed object or default value
 */
export function safeJsonParse(jsonStr, defaultValue = null) {
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Formats a large number with K, M, B suffixes
 * @param {number} num - The number to format
 * @returns {string} The formatted number with suffix
 */
export function formatLargeNumber(num) {
  if (typeof num !== 'number' || isNaN(num)) {
    return '0';
  }

  const abs = Math.abs(num);

  if (abs >= 1e9) {
    return (num / 1e9).toFixed(2) + 'B';
  } else if (abs >= 1e6) {
    return (num / 1e6).toFixed(2) + 'M';
  } else if (abs >= 1e3) {
    return (num / 1e3).toFixed(2) + 'K';
  }

  return num.toFixed(2);
}

/**
 * Clamps a number between min and max values
 * @param {number} value - The value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} The clamped value
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * 防抖函数 - 延迟执行
 * @param {Function} func - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, delay = 300) {
  let timeoutId = null;

  return function(...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * 节流函数 - 限制执行频率
 * @param {Function} func - 要节流的函数
 * @param {number} delay - 节流时间（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(func, delay = 100) {
  let lastCall = 0;

  return function(...args) {
    const now = Date.now();

    if (now - lastCall >= delay) {
      lastCall = now;
      return func.apply(this, args);
    }

    return undefined;
  };
}
