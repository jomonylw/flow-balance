#!/usr/bin/env node

/**
 * 重新组织截图文件脚本
 * 将现有的 {name}-{lang}.png 格式转换为 {name}-{theme}-{lang}.png 格式
 *
 * 使用方法：
 * 1. 确保您已经为每个现有图片准备了明亮和暗色主题版本
 * 2. 运行: node scripts/reorganize-screenshots.js
 * 3. 按照提示操作
 */

const fs = require('fs')
const path = require('path')

const screenshotsDir = path.join(__dirname, '../public/images/screenshots')

// 当前文件映射
const currentFiles = [
  'dashboard-overview-en.png',
  'dashboard-overview-zh.png',
  'financial-reports-en.png',
  'financial-reports-zh.png',
  'fire-calculator-en.png',
  'fire-calculator-zh.png',
  'smart-paste-en.png',
  'smart-paste-zh.png',
  'theme-dark-en.png',
  'theme-dark-zh.png',
  'theme-light-en.png',
  'theme-light-zh.png',
]

// 新的文件结构
const newFileStructure = [
  // 产品展示部分 - 需要明亮和暗色主题版本
  'dashboard-overview-light-zh.png',
  'dashboard-overview-light-en.png',
  'dashboard-overview-dark-zh.png',
  'dashboard-overview-dark-en.png',
  'financial-reports-light-zh.png',
  'financial-reports-light-en.png',
  'financial-reports-dark-zh.png',
  'financial-reports-dark-en.png',
  'fire-calculator-light-zh.png',
  'fire-calculator-light-en.png',
  'fire-calculator-dark-zh.png',
  'fire-calculator-dark-en.png',
  'smart-paste-light-zh.png',
  'smart-paste-light-en.png',
  'smart-paste-dark-zh.png',
  'smart-paste-dark-en.png',

  // 主题对比部分 - 需要明亮和暗色主题版本
  'theme-light-light-zh.png',
  'theme-light-light-en.png',
  'theme-light-dark-zh.png',
  'theme-light-dark-en.png',
  'theme-dark-light-zh.png',
  'theme-dark-light-en.png',
  'theme-dark-dark-zh.png',
  'theme-dark-dark-en.png',

  // 国际化对比部分 - 主题感知
  'interface-zh-light.png',
  'interface-zh-dark.png',
  'interface-en-light.png',
  'interface-en-dark.png',
]

console.log('🖼️  截图文件重新组织脚本')
console.log('=====================================\n')

console.log('📁 当前文件结构:')
currentFiles.forEach(file => {
  const exists = fs.existsSync(path.join(screenshotsDir, file))
  console.log(`  ${exists ? '✅' : '❌'} ${file}`)
})

console.log('\n📁 需要的新文件结构:')
newFileStructure.forEach(file => {
  console.log(`  📄 ${file}`)
})

console.log('\n🔄 建议的重新组织步骤:')
console.log('=====================================')

console.log('\n1️⃣ 产品展示部分 (需要为每个功能准备明亮和暗色主题版本):')
console.log('   如果您的现有图片是明亮主题，请复制并重命名:')
console.log('   dashboard-overview-zh.png → dashboard-overview-light-zh.png')
console.log('   dashboard-overview-en.png → dashboard-overview-light-en.png')
console.log('   然后创建暗色主题版本:')
console.log('   dashboard-overview-dark-zh.png')
console.log('   dashboard-overview-dark-en.png')
console.log(
  '   (对 financial-reports, fire-calculator, smart-paste 重复此过程)'
)

console.log('\n2️⃣ 主题对比部分:')
console.log(
  '   theme-light-zh.png → theme-light-light-zh.png (当前页面是明亮主题时显示的明亮主题截图)'
)
console.log('   theme-light-en.png → theme-light-light-en.png')
console.log(
  '   创建新文件: theme-light-dark-zh.png (当前页面是暗色主题时显示的明亮主题截图)'
)
console.log('   创建新文件: theme-light-dark-en.png')
console.log(
  '   theme-dark-zh.png → theme-dark-light-zh.png (当前页面是明亮主题时显示的暗色主题截图)'
)
console.log('   theme-dark-en.png → theme-dark-light-en.png')
console.log(
  '   创建新文件: theme-dark-dark-zh.png (当前页面是暗色主题时显示的暗色主题截图)'
)
console.log('   创建新文件: theme-dark-dark-en.png')

console.log('\n3️⃣ 国际化对比部分 (主题感知):')
console.log('   interface-zh.png → interface-zh-light.png')
console.log('   interface-en.png → interface-en-light.png')
console.log('   创建新文件: interface-zh-dark.png')
console.log('   创建新文件: interface-en-dark.png')

console.log('\n💡 提示:')
console.log('   - 明亮主题图片应该有白色/浅色背景')
console.log('   - 暗色主题图片应该有深色背景')
console.log('   - 确保图片内容与当前页面主题保持一致，避免视觉突兀')
console.log('   - 建议图片尺寸保持一致，推荐至少 1200px 宽度')

console.log('\n🚀 完成重新组织后，重启开发服务器查看效果!')
