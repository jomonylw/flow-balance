#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { analyzeProject } = require('./analyze-type-usage')

/**
 * 重构进度跟踪脚本
 * 生成重构进度报告和建议
 */

// 颜色输出函数
function colorize(text, color) {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
  }
  return `${colors[color] || ''}${text}${colors.reset}`
}

// 核心类型列表
const CORE_TYPES = [
  'User',
  'Account',
  'Transaction',
  'Category',
  'Currency',
  'Tag',
  'UserSettings',
  'ExchangeRate',
  'Balance',
  'TrendDataPoint',
]

// 重构优先级配置
const REFACTOR_PRIORITY = {
  high: [
    'src/components/features/dashboard/',
    'src/components/features/layout/',
    'src/components/ui/feedback/',
  ],
  medium: [
    'src/components/features/charts/',
    'src/components/features/transactions/',
    'src/components/features/accounts/',
  ],
  low: [
    'src/components/features/settings/',
    'src/components/features/reports/',
    'src/app/api/',
  ],
}

// 分析重构进度
function analyzeRefactorProgress() {
  console.log(colorize('📊 TypeScript 重构进度分析', 'blue'))
  console.log('================================\n')

  const { typeDefinitions } = analyzeProject()

  // 统计重复定义
  const duplicates = []
  typeDefinitions.forEach((definitions, typeName) => {
    if (definitions.length > 1 && CORE_TYPES.includes(typeName)) {
      duplicates.push({
        typeName,
        count: definitions.length,
        files: definitions.map(def => ({
          file: path.relative(process.cwd(), def.file),
          line: def.line,
        })),
      })
    }
  })

  // 按优先级分组文件
  const filesByPriority = {
    high: new Set(),
    medium: new Set(),
    low: new Set(),
    other: new Set(),
  }

  duplicates.forEach(duplicate => {
    duplicate.files.forEach(fileInfo => {
      const filePath = fileInfo.file
      let priority = 'other'

      for (const [level, patterns] of Object.entries(REFACTOR_PRIORITY)) {
        if (patterns.some(pattern => filePath.startsWith(pattern))) {
          priority = level
          break
        }
      }

      filesByPriority[priority].add(filePath)
    })
  })

  // 生成进度报告
  console.log(colorize('🎯 重构进度概览:', 'yellow'))
  console.log('================================')

  const totalDuplicates = duplicates.reduce((sum, d) => sum + d.count - 1, 0)
  console.log(`总重复定义数: ${colorize(totalDuplicates, 'red')}`)
  console.log(`涉及核心类型: ${colorize(duplicates.length, 'yellow')}`)

  console.log(colorize('\n📋 按优先级分类的待重构文件:', 'yellow'))
  console.log('================================')

  Object.entries(filesByPriority).forEach(([priority, files]) => {
    if (files.size > 0) {
      const color =
        priority === 'high' ? 'red' : priority === 'medium' ? 'yellow' : 'cyan'
      console.log(
        colorize(
          `\n🔸 ${priority.toUpperCase()} 优先级 (${files.size} 个文件):`,
          color
        )
      )
      Array.from(files)
        .slice(0, 10)
        .forEach(file => {
          console.log(`  📄 ${file}`)
        })
      if (files.size > 10) {
        console.log(colorize(`  ... 还有 ${files.size - 10} 个文件`, 'gray'))
      }
    }
  })

  // 生成重构建议
  console.log(colorize('\n💡 重构建议:', 'yellow'))
  console.log('================================')

  if (filesByPriority.high.size > 0) {
    console.log(colorize('1. 立即处理高优先级文件:', 'red'))
    Array.from(filesByPriority.high)
      .slice(0, 5)
      .forEach(file => {
        console.log(`   📄 ${file}`)
      })
  }

  if (filesByPriority.medium.size > 0) {
    console.log(colorize('\n2. 接下来处理中优先级文件:', 'yellow'))
    Array.from(filesByPriority.medium)
      .slice(0, 3)
      .forEach(file => {
        console.log(`   📄 ${file}`)
      })
  }

  // 最严重的重复类型
  const worstTypes = duplicates.sort((a, b) => b.count - a.count).slice(0, 5)

  if (worstTypes.length > 0) {
    console.log(colorize('\n🚨 最严重的重复类型:', 'red'))
    worstTypes.forEach(type => {
      console.log(`   ${type.typeName}: ${type.count} 处定义`)
    })
  }

  // 计算完成度
  const totalCoreTypeInstances = CORE_TYPES.reduce((sum, type) => {
    const definitions = typeDefinitions.get(type) || []
    return sum + Math.max(0, definitions.length - 1) // 减去1因为应该保留一个定义
  }, 0)

  const completionRate =
    totalCoreTypeInstances > 0
      ? Math.max(0, 100 - (totalDuplicates / totalCoreTypeInstances) * 100)
      : 100

  console.log(
    colorize(`\n📈 重构完成度: ${completionRate.toFixed(1)}%`, 'cyan')
  )

  // 生成下一步行动计划
  console.log(colorize('\n🎯 下一步行动计划:', 'blue'))
  console.log('================================')

  if (filesByPriority.high.size > 0) {
    const nextFile = Array.from(filesByPriority.high)[0]
    console.log(`1. 重构文件: ${colorize(nextFile, 'cyan')}`)
    console.log(`   命令: code ${nextFile}`)
  }

  console.log(`2. 运行类型检查: ${colorize('pnpm run type-check', 'cyan')}`)
  console.log(`3. 检查进度: ${colorize('pnpm run track-progress', 'cyan')}`)

  // 保存进度报告
  const progressReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalDuplicates,
      coreTypesAffected: duplicates.length,
      completionRate: parseFloat(completionRate.toFixed(1)),
      filesByPriority: {
        high: Array.from(filesByPriority.high),
        medium: Array.from(filesByPriority.medium),
        low: Array.from(filesByPriority.low),
        other: Array.from(filesByPriority.other),
      },
    },
    duplicates,
    recommendations: {
      nextFile:
        filesByPriority.high.size > 0
          ? Array.from(filesByPriority.high)[0]
          : null,
      worstTypes: worstTypes.map(t => t.typeName),
    },
  }

  fs.writeFileSync(
    'refactor-progress.json',
    JSON.stringify(progressReport, null, 2)
  )
  console.log(
    colorize('\n📄 进度报告已保存到: refactor-progress.json', 'green')
  )

  return progressReport
}

// 生成重构脚本
function generateRefactorScript(targetFile) {
  console.log(colorize(`\n🔧 为 ${targetFile} 生成重构脚本`, 'blue'))

  const script = `#!/bin/bash
# 重构脚本: ${targetFile}

echo "开始重构 ${targetFile}..."

# 1. 备份原文件
cp "${targetFile}" "${targetFile}.backup"

# 2. 运行类型检查（重构前）
echo "重构前类型检查..."
pnpm run type-check

# 3. 手动重构提示
echo "请手动重构以下内容:"
echo "1. 移除本地类型定义"
echo "2. 添加统一类型导入"
echo "3. 更新类型引用"

# 4. 重构后验证
echo "重构完成后，运行以下命令验证:"
echo "pnpm run type-check"
echo "pnpm run test"

echo "重构脚本生成完成！"
`

  const scriptPath = `refactor-${path.basename(targetFile, path.extname(targetFile))}.sh`
  fs.writeFileSync(scriptPath, script)
  fs.chmodSync(scriptPath, '755')

  console.log(colorize(`重构脚本已生成: ${scriptPath}`, 'green'))
}

// 主函数
function main() {
  const args = process.argv.slice(2)

  if (args.includes('--generate-script') && args[1]) {
    generateRefactorScript(args[1])
  } else {
    analyzeRefactorProgress()
  }
}

if (require.main === module) {
  main()
}

module.exports = { analyzeRefactorProgress, generateRefactorScript }
