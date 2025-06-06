/**
 * API中间件和错误处理工具
 * 提供统一的错误处理、日志记录和性能监控
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { errorResponse, unauthorizedResponse } from '@/lib/api-response'

export interface ApiContext {
  user: any
  startTime: number
  requestId: string
}

export interface ApiHandler {
  (request: NextRequest, context: ApiContext): Promise<NextResponse>
}

/**
 * API路由包装器，提供统一的错误处理和中间件功能
 */
export function withApiHandler(handler: ApiHandler) {
  return async function(request: NextRequest) {
    const startTime = Date.now()
    const requestId = generateRequestId()
    
    try {
      // 用户认证
      const user = await getCurrentUser()
      if (!user) {
        logApiRequest(request, null, 401, Date.now() - startTime, requestId)
        return unauthorizedResponse()
      }

      // 创建上下文
      const context: ApiContext = {
        user,
        startTime,
        requestId
      }

      // 执行处理器
      const response = await handler(request, context)
      
      // 记录成功请求
      logApiRequest(request, user, response.status, Date.now() - startTime, requestId)
      
      return response
    } catch (error) {
      // 错误处理和日志记录
      const duration = Date.now() - startTime
      logApiError(request, error, duration, requestId)
      
      // 返回用户友好的错误响应
      if (error instanceof ValidationError) {
        return errorResponse(error.message, 400)
      } else if (error instanceof NotFoundError) {
        return errorResponse(error.message, 404)
      } else if (error instanceof ForbiddenError) {
        return errorResponse(error.message, 403)
      } else {
        console.error('API处理器未捕获错误:', error)
        return errorResponse('服务器内部错误', 500)
      }
    }
  }
}

/**
 * 数据验证中间件
 */
export function validateRequestData(schema: any) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function(request: NextRequest, context: ApiContext) {
      try {
        const body = await request.json()
        
        // 这里可以集成更复杂的验证库，如 Joi 或 Zod
        const validationResult = validateData(body, schema)
        if (!validationResult.isValid) {
          throw new ValidationError(validationResult.errors.join(', '))
        }
        
        return originalMethod.call(this, request, context)
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new ValidationError('请求数据格式无效')
        }
        throw error
      }
    }
    
    return descriptor
  }
}

/**
 * 速率限制中间件
 */
export function rateLimit(maxRequests: number, windowMs: number) {
  const requests = new Map<string, number[]>()
  
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function(request: NextRequest, context: ApiContext) {
      const clientId = getClientId(request, context.user)
      const now = Date.now()
      const windowStart = now - windowMs
      
      // 清理过期记录
      if (requests.has(clientId)) {
        const userRequests = requests.get(clientId)!
        const validRequests = userRequests.filter(time => time > windowStart)
        requests.set(clientId, validRequests)
      } else {
        requests.set(clientId, [])
      }
      
      const userRequests = requests.get(clientId)!
      
      if (userRequests.length >= maxRequests) {
        throw new TooManyRequestsError('请求过于频繁，请稍后再试')
      }
      
      userRequests.push(now)
      return originalMethod.call(this, request, context)
    }
    
    return descriptor
  }
}

/**
 * 自定义错误类
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string = '资源未找到') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = '访问被拒绝') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class TooManyRequestsError extends Error {
  constructor(message: string = '请求过于频繁') {
    super(message)
    this.name = 'TooManyRequestsError'
  }
}

/**
 * 生成请求ID
 */
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

/**
 * 获取客户端ID（用于速率限制）
 */
function getClientId(request: NextRequest, user: any): string {
  // 优先使用用户ID，其次使用IP地址
  if (user?.id) {
    return `user:${user.id}`
  }
  
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
  return `ip:${ip}`
}

/**
 * 记录API请求日志
 */
function logApiRequest(
  request: NextRequest, 
  user: any, 
  status: number, 
  duration: number, 
  requestId: string
) {
  const logData = {
    requestId,
    method: request.method,
    url: request.url,
    userId: user?.id,
    status,
    duration,
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || 'unknown'
  }
  
  // 在生产环境中，这里应该使用专业的日志服务
  if (process.env.NODE_ENV === 'development') {
    console.log('API请求:', logData)
  }
  
  // 性能监控：记录慢请求
  if (duration > 1000) {
    console.warn('慢请求检测:', logData)
  }
}

/**
 * 记录API错误日志
 */
function logApiError(
  request: NextRequest, 
  error: any, 
  duration: number, 
  requestId: string
) {
  const errorData = {
    requestId,
    method: request.method,
    url: request.url,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    duration,
    timestamp: new Date().toISOString()
  }
  
  console.error('API错误:', errorData)
  
  // 在生产环境中，这里应该发送到错误监控服务
  if (process.env.NODE_ENV === 'production') {
    // 发送到错误监控服务（如 Sentry）
    // sendToErrorMonitoring(errorData)
  }
}

/**
 * 简单的数据验证函数
 */
function validateData(data: any, schema: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // 这里实现基本的验证逻辑
  // 在实际项目中，建议使用 Joi、Zod 等专业验证库
  
  if (schema.required) {
    schema.required.forEach((field: string) => {
      if (!data[field]) {
        errors.push(`字段 ${field} 是必填的`)
      }
    })
  }
  
  if (schema.types) {
    Object.entries(schema.types).forEach(([field, expectedType]) => {
      if (data[field] !== undefined && typeof data[field] !== expectedType) {
        errors.push(`字段 ${field} 类型错误，期望 ${expectedType}`)
      }
    })
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * 数据库操作包装器，提供统一的错误处理
 */
export async function withDatabaseOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    console.error(`数据库操作失败 [${operationName}]:`, error)
    
    // 根据错误类型返回不同的错误
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        throw new ValidationError('数据已存在，请检查重复项')
      } else if (error.message.includes('Foreign key constraint')) {
        throw new ValidationError('关联数据不存在')
      } else if (error.message.includes('Not found')) {
        throw new NotFoundError('请求的数据不存在')
      }
    }
    
    throw new Error('数据库操作失败')
  }
}

/**
 * 缓存包装器
 */
export function withCache<T>(
  key: string,
  ttl: number = 300000 // 5分钟默认TTL
) {
  const cache = new Map<string, { data: T; expires: number }>()
  
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function(...args: any[]) {
      const cacheKey = `${key}:${JSON.stringify(args)}`
      const now = Date.now()
      
      // 检查缓存
      if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey)!
        if (cached.expires > now) {
          return cached.data
        } else {
          cache.delete(cacheKey)
        }
      }
      
      // 执行原方法
      const result = await originalMethod.apply(this, args)
      
      // 存储到缓存
      cache.set(cacheKey, {
        data: result,
        expires: now + ttl
      })
      
      return result
    }
    
    return descriptor
  }
}
