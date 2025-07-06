/**
 * Next.js 中间件
 * 处理请求级别的逻辑
 * 注意：中间件在 Edge Runtime 中运行，不能使用 Node.js 模块
 */

import { NextRequest, NextResponse } from 'next/server'

export async function middleware(_request: NextRequest) {
  // 中间件主要用于路由保护、重定向等
  // 服务器初始化逻辑移到各个 API 路由中处理
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了：
     * - _next/static (静态文件)
     * - _next/image (图像优化文件)
     * - favicon.ico (favicon 文件)
     * - 公共文件夹中的文件
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
