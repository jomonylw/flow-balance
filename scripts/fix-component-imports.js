#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// 组件导入修复规则
const componentImportFixes = [
  // 修复 @/components/ 开头的导入到 @/components/features/
  {
    from: '@/components/transactions/',
    to: '@/components/features/transactions/',
  },
  { from: '@/components/dashboard/', to: '@/components/features/dashboard/' },
  { from: '@/components/charts/', to: '@/components/features/charts/' },
  { from: '@/components/accounts/', to: '@/components/features/accounts/' },
  { from: '@/components/categories/', to: '@/components/features/categories/' },
  { from: '@/components/layout/', to: '@/components/features/layout/' },
  { from: '@/components/auth/', to: '@/components/features/auth/' },
  { from: '@/components/settings/', to: '@/components/features/settings/' },
  { from: '@/components/reports/', to: '@/components/features/reports/' },
  { from: '@/components/fire/', to: '@/components/features/fire/' },
  { from: '@/components/setup/', to: '@/components/features/setup/' },
  { from: '@/components/dev/', to: '@/components/features/dev/' },
  { from: '@/components/debug/', to: '@/components/features/debug/' },
]

// 获取所有需要更新的文件
function getAllFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  let files = []
  const items = fs.readdirSync(dir)

  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      // 跳过 node_modules, .next 等目录
      if (
        !['node_modules', '.next', 'dist', 'build', '.git', 'scripts'].includes(
          item
        )
      ) {
        files = files.concat(getAllFiles(fullPath, extensions))
      }
    } else if (extensions.some(ext => item.endsWith(ext))) {
      files.push(fullPath)
    }
  }

  return files
}

// 更新文件中的导入路径
function updateComponentImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  let hasChanges = false

  for (const fix of componentImportFixes) {
    // 处理 import 语句
    const importPattern = new RegExp(
      `(['"\`])${fix.from.replace(/\//g, '\\/')}([^'"\`]*?)(['"\`])`,
      'g'
    )

    if (importPattern.test(content)) {
      content = content.replace(importPattern, `$1${fix.to}$2$3`)
      hasChanges = true
    }
  }

  if (hasChanges) {
    fs.writeFileSync(filePath, content, 'utf8')
    console.log(`Updated component imports in: ${filePath}`)
  }
}

// 主函数
function main() {
  console.log('Starting component import fixes...')

  const files = getAllFiles('./src')
  console.log(`Found ${files.length} files to process`)

  for (const file of files) {
    try {
      updateComponentImportsInFile(file)
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message)
    }
  }

  console.log('Component import fixes completed!')
}

if (require.main === module) {
  main()
}

module.exports = {
  updateComponentImportsInFile,
  getAllFiles,
  componentImportFixes,
}
