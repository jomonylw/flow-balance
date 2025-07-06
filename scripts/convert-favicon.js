#!/usr/bin/env node

/**
 * 使用 Sharp 库转换 SVG favicon 到其他格式
 * 
 * 使用前需要安装 Sharp:
 * npm install sharp --save-dev
 * 
 * 然后运行:
 * node scripts/convert-favicon.js
 */

const fs = require('fs')
const path = require('path')

// 检查是否安装了 Sharp
let sharp
try {
  sharp = require('sharp')
} catch (error) {
  console.log('❌ 未找到 Sharp 库')
  console.log('请先安装: npm install sharp --save-dev')
  console.log('或使用在线工具: https://realfavicongenerator.net/')
  process.exit(1)
}

console.log('🎨 使用 Sharp 转换 favicon')
console.log('=' .repeat(40))

const svgPath = path.join(process.cwd(), 'public', 'favicon.svg')
const publicDir = path.join(process.cwd(), 'public')

// 检查 SVG 文件
if (!fs.existsSync(svgPath)) {
  console.log('❌ 未找到 public/favicon.svg 文件')
  process.exit(1)
}

// 要生成的图标配置
const iconConfigs = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
]

async function convertIcons() {
  console.log('📁 读取 SVG 文件...')
  
  try {
    for (const config of iconConfigs) {
      const outputPath = path.join(publicDir, config.name)
      
      console.log(`🔄 生成 ${config.name} (${config.size}x${config.size})...`)
      
      await sharp(svgPath)
        .resize(config.size, config.size)
        .png()
        .toFile(outputPath)
      
      console.log(`✅ 已生成: ${config.name}`)
    }
    
    console.log('')
    console.log('🎉 所有图标已生成完成！')
    console.log('')
    console.log('📝 下一步:')
    console.log('1. 更新 src/app/layout.tsx 中的 icons 配置')
    console.log('2. 可选: 创建 site.webmanifest 文件用于 PWA')
    console.log('')
    console.log('💡 建议的 layout.tsx icons 配置:')
    console.log(`
export const metadata: Metadata = {
  // ... 其他配置
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
}`)
    
  } catch (error) {
    console.error('❌ 转换过程中出错:', error.message)
    process.exit(1)
  }
}

// 执行转换
convertIcons()
