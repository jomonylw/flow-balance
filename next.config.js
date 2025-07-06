/** @type {import('next').NextConfig} */
const fs = require('fs')
const path = require('path')

// 读取 package.json 获取版本号
const packageJsonPath = path.join(__dirname, 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

const nextConfig = {
  // Docker 部署配置
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  // 服务器外部包配置
  serverExternalPackages: ['@prisma/client'],

  // 图片优化配置
  images: {
    domains: [],
    unoptimized: process.env.NODE_ENV === 'production',
  },

  // 环境变量
  env: {
    // 将 package.json 中的版本号传递给客户端
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().split('T')[0],
  },

  // 安全头配置
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
