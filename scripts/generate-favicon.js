#!/usr/bin/env node

/**
 * Favicon 生成脚本
 * 
 * 此脚本提供了生成不同格式和尺寸 favicon 的说明和工具
 * 
 * 使用方法:
 * 1. 确保已有 public/favicon.svg 文件
 * 2. 运行此脚本获取生成其他格式的说明
 * 3. 或使用在线工具转换 SVG 到其他格式
 */

const fs = require('fs')
const path = require('path')

console.log('🎨 Flow Balance Favicon 生成工具')
console.log('=' .repeat(50))

// 检查 SVG 文件是否存在
const svgPath = path.join(process.cwd(), 'public', 'favicon.svg')
if (!fs.existsSync(svgPath)) {
  console.log('❌ 未找到 public/favicon.svg 文件')
  console.log('请先确保 SVG favicon 文件存在')
  process.exit(1)
}

console.log('✅ 找到 SVG favicon 文件')
console.log('')

console.log('📋 需要生成的 favicon 文件:')
console.log('')

const faviconSizes = [
  { name: 'favicon.ico', size: '16x16,32x32,48x48', description: '传统 ICO 格式，包含多个尺寸' },
  { name: 'favicon-16x16.png', size: '16x16', description: '小尺寸 PNG favicon' },
  { name: 'favicon-32x32.png', size: '32x32', description: '标准尺寸 PNG favicon' },
  { name: 'apple-touch-icon.png', size: '180x180', description: 'Apple 设备图标' },
  { name: 'android-chrome-192x192.png', size: '192x192', description: 'Android Chrome 图标' },
  { name: 'android-chrome-512x512.png', size: '512x512', description: 'Android Chrome 大图标' },
]

faviconSizes.forEach((favicon, index) => {
  console.log(`${index + 1}. ${favicon.name}`)
  console.log(`   尺寸: ${favicon.size}`)
  console.log(`   说明: ${favicon.description}`)
  console.log('')
})

console.log('🛠️  生成方法:')
console.log('')

console.log('方法 1: 使用在线工具 (推荐)')
console.log('1. 访问 https://realfavicongenerator.net/')
console.log('2. 上传 public/favicon.svg 文件')
console.log('3. 下载生成的文件包')
console.log('4. 将文件复制到 public/ 目录')
console.log('')

console.log('方法 2: 使用 ImageMagick (需要安装)')
console.log('brew install imagemagick  # macOS')
console.log('apt-get install imagemagick  # Ubuntu')
console.log('')
console.log('然后运行以下命令:')
console.log('convert public/favicon.svg -resize 16x16 public/favicon-16x16.png')
console.log('convert public/favicon.svg -resize 32x32 public/favicon-32x32.png')
console.log('convert public/favicon.svg -resize 180x180 public/apple-touch-icon.png')
console.log('convert public/favicon.svg -resize 192x192 public/android-chrome-192x192.png')
console.log('convert public/favicon.svg -resize 512x512 public/android-chrome-512x512.png')
console.log('')

console.log('方法 3: 使用 Node.js 包 (需要安装依赖)')
console.log('npm install sharp --save-dev')
console.log('然后运行 node scripts/convert-favicon.js')
console.log('')

console.log('📝 完成后需要更新的文件:')
console.log('1. src/app/layout.tsx - 更新 metadata.icons 配置')
console.log('2. public/site.webmanifest - 添加 PWA 图标配置 (可选)')
console.log('')

console.log('🔍 当前 layout.tsx 配置:')
const layoutPath = path.join(process.cwd(), 'src', 'app', 'layout.tsx')
if (fs.existsSync(layoutPath)) {
  const layoutContent = fs.readFileSync(layoutPath, 'utf8')
  const iconMatch = layoutContent.match(/icons:\s*{[\s\S]*?}/m)
  if (iconMatch) {
    console.log(iconMatch[0])
  }
} else {
  console.log('❌ 未找到 layout.tsx 文件')
}

console.log('')
console.log('✨ 完成后，网站将使用项目 logo 作为 favicon！')
