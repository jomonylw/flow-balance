/**
 * 内部 API 客户端工具
 * 提供统一的内部 API 调用接口，包含超时处理和错误分类
 */

import { fetchWithTimeout, categorizeApiError } from './fetch-with-timeout'
import { API_TIMEOUTS } from '@/lib/constants/app-config'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ApiClientOptions {
  timeout?: number
  headers?: Record<string, string>
}

/**
 * 内部 API 客户端类
 */
export class ApiClient {
  private defaultTimeout: number
  private defaultHeaders: Record<string, string>

  constructor(options: ApiClientOptions = {}) {
    this.defaultTimeout = options.timeout || API_TIMEOUTS.INTERNAL_API_TIMEOUT
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    }
  }

  /**
   * GET 请求
   */
  async get<T = any>(
    url: string,
    options: ApiClientOptions = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        timeout: options.timeout || this.defaultTimeout,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('UNAUTHORIZED')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * POST 请求
   */
  async post<T = any>(
    url: string,
    data?: any,
    options: ApiClientOptions = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        timeout: options.timeout || this.defaultTimeout,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
        body: data ? JSON.stringify(data) : undefined,
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('UNAUTHORIZED')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * PUT 请求
   */
  async put<T = any>(
    url: string,
    data?: any,
    options: ApiClientOptions = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetchWithTimeout(url, {
        method: 'PUT',
        timeout: options.timeout || this.defaultTimeout,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
        body: data ? JSON.stringify(data) : undefined,
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('UNAUTHORIZED')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * DELETE 请求
   */
  async delete<T = any>(
    url: string,
    options: ApiClientOptions = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetchWithTimeout(url, {
        method: 'DELETE',
        timeout: options.timeout || this.defaultTimeout,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('UNAUTHORIZED')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * 错误处理
   */
  private handleError(error: unknown): ApiResponse {
    const errorInfo = categorizeApiError(error)

    // 特殊处理认证错误
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return {
        success: false,
        error: 'UNAUTHORIZED',
        message: '未授权访问',
      }
    }

    return {
      success: false,
      error: errorInfo.code,
      message: errorInfo.message,
    }
  }
}

/**
 * 默认的 API 客户端实例
 */
export const apiClient = new ApiClient()

/**
 * 便捷的 API 调用函数
 */
export const api = {
  get: <T = any>(url: string, options?: ApiClientOptions) =>
    apiClient.get<T>(url, options),
  post: <T = any>(url: string, data?: any, options?: ApiClientOptions) =>
    apiClient.post<T>(url, data, options),
  put: <T = any>(url: string, data?: any, options?: ApiClientOptions) =>
    apiClient.put<T>(url, data, options),
  delete: <T = any>(url: string, options?: ApiClientOptions) =>
    apiClient.delete<T>(url, options),
}

/**
 * 专门用于同步相关的 API 调用
 */
export const syncApi = {
  /**
   * 获取同步状态
   */
  getStatus: () => api.get('/api/sync/status'),

  /**
   * 触发同步
   */
  trigger: (force: boolean = false) => api.post('/api/sync/trigger', { force }),

  /**
   * 检查同步需求
   */
  check: () => api.get('/api/sync/check'),
}

/**
 * 专门用于汇率相关的 API 调用
 */
export const exchangeRateApi = {
  /**
   * 手动更新汇率
   */
  update: (force: boolean = false) =>
    api.post('/api/exchange-rates/auto-update', { force }),

  /**
   * 获取汇率状态
   */
  getStatus: () => api.get('/api/exchange-rates/status'),
}
