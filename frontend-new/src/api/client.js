import Logger from '../utils/logger.js';

/**
 * API错误类
 */
export class ApiError extends Error {
  constructor(status, message, data = null) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

/**
 * HTTP客户端类
 * 提供统一的API调用接口，支持重试、超时、错误处理
 */
export class ApiClient {
  /**
   * @param {Object} config - 客户端配置
   * @param {string} config.baseURL - API基础URL
   * @param {number} config.timeout - 超时时间（毫秒），默认30000
   * @param {number} config.maxRetries - 最大重试次数，默认3
   * @param {Object} config.headers - 默认请求头
   */
  constructor(config = {}) {
    this.baseURL = config.baseURL || '';
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers
    };

    Logger.info('ApiClient initialized', {
      baseURL: this.baseURL,
      timeout: this.timeout,
      maxRetries: this.maxRetries
    });
  }

  /**
   * 构建完整URL
   * @param {string} endpoint - API端点
   * @param {Object} params - 查询参数
   * @returns {string} 完整URL
   */
  buildURL(endpoint, params = {}) {
    let url = `${this.baseURL}${endpoint}`;

    if (Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      url += `?${searchParams.toString()}`;
    }

    return url;
  }

  /**
   * 判断是否应该重试
   * @param {Error} error - 错误对象
   * @param {Response} response - 响应对象
   * @returns {boolean} 是否应该重试
   */
  shouldRetry(error, response = null) {
    // 网络错误可以重试
    if (error) {
      return true;
    }

    // 5xx服务器错误可以重试
    if (response && response.status >= 500) {
      return true;
    }

    // 4xx客户端错误不重试
    return false;
  }

  /**
   * 发送HTTP请求
   * @param {string} method - HTTP方法
   * @param {string} endpoint - API端点
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  async request(method, endpoint, options = {}) {
    const {
      data = null,
      params = {},
      headers = {},
      signal = null
    } = options;

    const url = this.buildURL(endpoint, params);
    const requestHeaders = {
      ...this.defaultHeaders,
      ...headers
    };

    const requestConfig = {
      method,
      headers: requestHeaders,
      signal
    };

    if (data) {
      requestConfig.body = JSON.stringify(data);
    }

    Logger.debug(`HTTP ${method}`, { url, data });

    let lastError;
    let lastResponse;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // 创建超时控制器
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => {
          timeoutController.abort();
        }, this.timeout);

        // 组合signal（如果用户提供了AbortController）
        let combinedSignal = timeoutController.signal;
        if (signal) {
          combinedSignal = this.combineSignals([signal, timeoutController.signal]);
        }

        requestConfig.signal = combinedSignal;

        const response = await fetch(url, requestConfig);
        clearTimeout(timeoutId);

        lastResponse = response;

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          const error = new ApiError(
            response.status,
            errorData.error || `HTTP ${response.status}`,
            errorData
          );

          // 检查是否应该重试（只重试5xx服务器错误）
          if (this.shouldRetry(null, response) && attempt < this.maxRetries) {
            Logger.warn(`Request failed, retrying (${attempt + 1}/${this.maxRetries})`, {
              url,
              status: response.status
            });
            await this.delay(1000 * (attempt + 1)); // 指数退避
            continue; // 继续下一次重试
          }

          // 不重试，直接抛出错误
          throw error;
        }

        const result = await response.json();
        Logger.debug(`HTTP ${method} success`, { url });
        return result;

      } catch (error) {
        lastError = error;

        // 如果是ApiError（HTTP错误），直接抛出不重试
        if (error instanceof ApiError) {
          throw error;
        }

        // 检查是否是超时错误
        if (error.name === 'AbortError') {
          // 检查是否是用户主动取消
          if (signal && signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }
          // 否则是超时
          Logger.error('Request timeout', { url, timeout: this.timeout });
          throw new Error(`Request timeout after ${this.timeout}ms`);
        }

        // 检查是否应该重试
        if (this.shouldRetry(error) && attempt < this.maxRetries) {
          Logger.warn(`Request failed, retrying (${attempt + 1}/${this.maxRetries})`, {
            url,
            error: error.message
          });
          await this.delay(1000 * (attempt + 1)); // 指数退避
          continue;
        }

        // 不重试，抛出错误
        Logger.error('Request failed', { url, error });
        throw error;
      }
    }

    // 所有重试都失败
    throw lastError;
  }

  /**
   * 组合多个AbortController的signals
   * @param {Array<AbortSignal>} signals - signals数组
   * @returns {AbortSignal} 组合后的signal
   */
  combineSignals(signals) {
    const controller = new AbortController();

    signals.forEach(signal => {
      if (signal.aborted) {
        controller.abort();
      } else {
        signal.addEventListener('abort', () => controller.abort(), { once: true });
      }
    });

    return controller.signal;
  }

  /**
   * 延迟函数
   * @param {number} ms - 延迟毫秒数
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * GET请求
   * @param {string} endpoint - API端点
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  async get(endpoint, options = {}) {
    return this.request('GET', endpoint, options);
  }

  /**
   * POST请求
   * @param {string} endpoint - API端点
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  async post(endpoint, data, options = {}) {
    return this.request('POST', endpoint, { ...options, data });
  }

  /**
   * PUT请求
   * @param {string} endpoint - API端点
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  async put(endpoint, data, options = {}) {
    return this.request('PUT', endpoint, { ...options, data });
  }

  /**
   * DELETE请求
   * @param {string} endpoint - API端点
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  async delete(endpoint, options = {}) {
    return this.request('DELETE', endpoint, options);
  }
}

// 导出默认实例（向后兼容）
const defaultClient = new ApiClient({
  baseURL: 'http://localhost:8080'
});

export default defaultClient;
