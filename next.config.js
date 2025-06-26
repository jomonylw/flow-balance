/** @type {import('next').NextConfig} */
const fs = require('fs')
const path = require('path')

// 读取 package.json 获取版本号
const packageJsonPath = path.join(__dirname, 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  env: {
    // 将 package.json 中的版本号传递给客户端
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().split('T')[0],
  },
}

module.exports = nextConfig
