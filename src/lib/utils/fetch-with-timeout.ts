/**
 * 带超时的 fetch 工具函数
 * 提供统一的超时处理和错误分类
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number // 超时时间（毫秒）
}

export interface FetchTimeoutError extends Error {
  name: 'AbortError' | 'TimeoutError'
  code: 'TIMEOUT' | 'NETWORK_ERROR' | 'HTTP_ERROR' | 'PARSE_ERROR'
}

/**
 * 带超时的 fetch 请求
 * @param url 请求 URL
 * @param options 请求选项，包含超时时间
 * @returns Promise<Response>
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options

  // 创建 AbortController 用于超时控制
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeout)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Flow-Balance/1.0',
        Accept: 'application/json',
        ...fetchOptions.headers,
      },
    })

    // 清除超时定时器
    clearTimeout(timeoutId)

    return response
  } catch (error) {
    // 清除超时定时器
    clearTimeout(timeoutId)

    // 重新抛出错误，让调用者处理
    throw error
  }
}

/**
 * 带超时的 JSON fetch 请求
 * @param url 请求 URL
 * @param options 请求选项，包含超时时间
 * @returns Promise<T>
 */
export async function fetchJsonWithTimeout<T = any>(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<T> {
  try {
    const response = await fetchWithTimeout(url, options)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    // 分类错误类型
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        const timeoutSeconds = Math.round((options.timeout || 30000) / 1000)
        const timeoutError = new Error(
          `请求超时（${timeoutSeconds}秒），请稍后重试`
        ) as FetchTimeoutError
        timeoutError.name = 'TimeoutError'
        timeoutError.code = 'TIMEOUT'
        throw timeoutError
      }

      if (error.message.includes('fetch')) {
        const networkError = new Error(
          'Network connection failed'
        ) as FetchTimeoutError
        networkError.name = 'AbortError'
        networkError.code = 'NETWORK_ERROR'
        throw networkError
      }

      if (error.message.includes('HTTP error')) {
        const httpError = new Error(error.message) as FetchTimeoutError
        httpError.name = 'AbortError'
        httpError.code = 'HTTP_ERROR'
        throw httpError
      }
    }

    // 其他错误
    throw error
  }
}

/**
 * 错误分类工具函数
 * @param error 错误对象
 * @returns 错误信息对象
 */
export function categorizeApiError(error: unknown): {
  code: string
  message: string
  isTimeout: boolean
  isNetworkError: boolean
} {
  if (error instanceof Error) {
    // 超时错误
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return {
        code: 'API_TIMEOUT',
        message: '请求超时，请稍后重试',
        isTimeout: true,
        isNetworkError: false,
      }
    }

    // 网络错误
    if (
      error.message.includes('fetch') ||
      error.message.includes('Network connection failed')
    ) {
      return {
        code: 'NETWORK_CONNECTION_FAILED',
        message: '网络连接失败，请检查网络连接后重试',
        isTimeout: false,
        isNetworkError: true,
      }
    }

    // HTTP 错误
    if (error.message.includes('HTTP error')) {
      return {
        code: 'HTTP_ERROR',
        message: '服务器响应错误，请稍后重试',
        isTimeout: false,
        isNetworkError: false,
      }
    }
  }

  // 未知错误
  return {
    code: 'UNKNOWN_ERROR',
    message: '未知错误，请稍后重试',
    isTimeout: false,
    isNetworkError: false,
  }
}
