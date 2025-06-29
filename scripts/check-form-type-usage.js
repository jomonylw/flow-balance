#!/usr/bin/env node

/**
 * 检查表单类型的实际使用情况
 * 分析未使用的核心表单类型是否真的需要
 */

const fs = require('fs')
const path = require('path')

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

// 需要检查的未使用表单类型
const UNUSED_FORM_TYPES = [
  'TransactionFormData',
  'AccountFormData', 
  'CategoryFormData',
  'CategoryStats',
  'AccountBalances',
  'PaginatedResponse'
]

// 获取所有 TypeScript 文件
function getAllTSFiles(dir, files = []) {
  const items = fs.readdirSync(dir)

  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      if (!['node_modules', '.next', 'dist', 'build', '.git'].includes(item)) {
        getAllTSFiles(fullPath, files)
      }
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(fullPath)
    }
  }

  return files
}

// 分析文件中的类型使用情况
function analyzeTypeUsage(filePath, typeName) {
  const content = fs.readFileSync(filePath, 'utf8')
  const usage = {
    imports: [],
    localDefinitions: [],
    usages: [],
    potentialUsages: []
  }

  // 检查导入语句
  const importRegex = new RegExp(`import\\s+(?:type\\s+)?{[^}]*\\b${typeName}\\b[^}]*}\\s+from`, 'g')
  let match
  while ((match = importRegex.exec(content)) !== null) {
    const lineNumber = content.substring(0, match.index).split('\n').length
    usage.imports.push({
      line: lineNumber,
      content: match[0]
    })
  }

  // 检查本地定义
  const localDefRegex = new RegExp(`(?:interface|type)\\s+${typeName}\\b`, 'g')
  while ((match = localDefRegex.exec(content)) !== null) {
    const lineNumber = content.substring(0, match.index).split('\n').length
    usage.localDefinitions.push({
      line: lineNumber,
      content: match[0]
    })
  }

  // 检查类型使用（作为类型注解）
  const typeUsageRegex = new RegExp(`:\\s*${typeName}\\b`, 'g')
  while ((match = typeUsageRegex.exec(content)) !== null) {
    const lineNumber = content.substring(0, match.index).split('\n').length
    usage.usages.push({
      line: lineNumber,
      context: getLineContext(content, match.index)
    })
  }

  // 检查潜在使用（在注释或字符串中提到）
  const potentialRegex = new RegExp(`\\b${typeName}\\b`, 'g')
  while ((match = potentialRegex.exec(content)) !== null) {
    const lineNumber = content.substring(0, match.index).split('\n').length
    const context = getLineContext(content, match.index)
    
    // 排除已经找到的导入、定义和使用
    if (!usage.imports.some(i => i.line === lineNumber) &&
        !usage.localDefinitions.some(d => d.line === lineNumber) &&
        !usage.usages.some(u => u.line === lineNumber)) {
      usage.potentialUsages.push({
        line: lineNumber,
        context: context
      })
    }
  }

  return usage
}

// 获取行上下文
function getLineContext(content, index) {
  const lines = content.split('\n')
  const lineNumber = content.substring(0, index).split('\n').length - 1
  const line = lines[lineNumber]
  return line.trim()
}

// 分析表单组件的实际结构
function analyzeFormComponents() {
  console.warn(colorize('🔍 分析表单组件的实际结构...', 'blue'))
  console.warn('================================')

  const formComponents = [
    'src/components/features/accounts/FlowTransactionModal.tsx',
    'src/components/features/dashboard/QuickFlowTransactionModal.tsx',
    'src/components/features/accounts/LoanContractModal.tsx',
    'src/components/ui/feedback/CategorySettingsModal.tsx',
    'src/components/ui/feedback/TopCategoryModal.tsx'
  ]

  formComponents.forEach(componentPath => {
    if (fs.existsSync(componentPath)) {
      console.warn(colorize(`\n📄 ${path.relative(process.cwd(), componentPath)}:`, 'cyan'))
      
      const content = fs.readFileSync(componentPath, 'utf8')
      
      // 查找 useState 中的表单数据结构
      const stateRegex = /useState\s*\(\s*{([^}]+)}\s*\)/g
      let match
      while ((match = stateRegex.exec(content)) !== null) {
        const stateContent = match[1]
        console.warn(`  表单状态结构: {${stateContent.trim()}}`)
      }

      // 查找接口定义
      const interfaceRegex = /interface\s+(\w*Form\w*|\w*Data\w*)\s*{([^}]+)}/g
      while ((match = interfaceRegex.exec(content)) !== null) {
        console.warn(`  本地接口: ${match[1]}`)
      }
    } else {
      console.warn(colorize(`  ❌ 文件不存在: ${componentPath}`, 'red'))
    }
  })
}

// 主分析函数
function analyzeFormTypeUsage() {
  console.warn(colorize('🔍 表单类型使用情况分析', 'blue'))
  console.warn('================================\n')

  const files = getAllTSFiles('src')
  const results = {}

  UNUSED_FORM_TYPES.forEach(typeName => {
    console.warn(colorize(`\n🔸 分析 ${typeName}:`, 'magenta'))
    
    results[typeName] = {
      totalFiles: 0,
      imports: 0,
      localDefinitions: 0,
      usages: 0,
      potentialUsages: 0,
      details: []
    }

    files.forEach(file => {
      const usage = analyzeTypeUsage(file, typeName)
      
      if (usage.imports.length > 0 || usage.localDefinitions.length > 0 || 
          usage.usages.length > 0 || usage.potentialUsages.length > 0) {
        
        results[typeName].totalFiles++
        results[typeName].imports += usage.imports.length
        results[typeName].localDefinitions += usage.localDefinitions.length
        results[typeName].usages += usage.usages.length
        results[typeName].potentialUsages += usage.potentialUsages.length

        const relativePath = path.relative(process.cwd(), file)
        results[typeName].details.push({
          file: relativePath,
          usage
        })
      }
    })

    // 输出结果
    const result = results[typeName]
    console.warn(`  导入次数: ${result.imports}`)
    console.warn(`  本地定义: ${result.localDefinitions}`)
    console.warn(`  类型使用: ${result.usages}`)
    console.warn(`  潜在提及: ${result.potentialUsages}`)
    console.warn(`  涉及文件: ${result.totalFiles}`)

    if (result.totalFiles === 0) {
      console.warn(colorize(`  ✅ 确认未使用，可以考虑移除`, 'green'))
    } else if (result.imports === 0 && result.usages === 0) {
      console.warn(colorize(`  ⚠️  只有定义或提及，无实际使用`, 'yellow'))
    } else {
      console.warn(colorize(`  🔍 有实际使用，需要保留`, 'cyan'))
    }

    // 显示详细信息（仅显示前3个文件）
    if (result.details.length > 0) {
      console.warn(`  详细信息:`)
      result.details.slice(0, 3).forEach(detail => {
        console.warn(`    📄 ${detail.file}`)
        if (detail.usage.imports.length > 0) {
          console.warn(`      导入: ${detail.usage.imports.length} 次`)
        }
        if (detail.usage.usages.length > 0) {
          console.warn(`      使用: ${detail.usage.usages.length} 次`)
        }
      })
      if (result.details.length > 3) {
        console.warn(`    ... 还有 ${result.details.length - 3} 个文件`)
      }
    }
  })

  return results
}

// 生成建议
function generateRecommendations(results) {
  console.warn(colorize('\n💡 修复建议:', 'yellow'))
  console.warn('================================')

  const toRemove = []
  const toKeep = []
  const toInvestigate = []

  Object.entries(results).forEach(([typeName, result]) => {
    if (result.totalFiles === 0) {
      toRemove.push(typeName)
    } else if (result.imports === 0 && result.usages === 0) {
      toInvestigate.push(typeName)
    } else {
      toKeep.push(typeName)
    }
  })

  if (toRemove.length > 0) {
    console.warn(colorize('\n🗑️  建议移除的类型:', 'red'))
    toRemove.forEach(type => {
      console.warn(`  - ${type}: 完全未使用`)
    })
  }

  if (toInvestigate.length > 0) {
    console.warn(colorize('\n🔍 需要进一步调查的类型:', 'yellow'))
    toInvestigate.forEach(type => {
      console.warn(`  - ${type}: 有定义但无实际使用`)
    })
  }

  if (toKeep.length > 0) {
    console.warn(colorize('\n✅ 建议保留的类型:', 'green'))
    toKeep.forEach(type => {
      console.warn(`  - ${type}: 有实际使用`)
    })
  }

  console.warn(colorize('\n📋 下一步行动:', 'blue'))
  console.warn('1. 对于完全未使用的类型，可以安全移除')
  console.warn('2. 对于有定义但无使用的类型，检查是否为预留功能')
  console.warn('3. 对于有实际使用的类型，确保导入路径正确')
  console.warn('4. 考虑将表单组件统一使用核心类型定义')
}

// 主函数
function main() {
  console.warn(colorize('🛠️  表单类型使用情况检查工具', 'blue'))
  console.warn('================================\n')

  try {
    // 分析表单组件结构
    analyzeFormComponents()
    
    // 分析类型使用情况
    const results = analyzeFormTypeUsage()
    
    // 生成建议
    generateRecommendations(results)
    
    console.warn(colorize('\n🎉 分析完成！', 'green'))
    
  } catch (error) {
    console.error(colorize(`❌ 分析过程中出现错误: ${error.message}`, 'red'))
    process.exit(1)
  }
}

// 运行脚本
if (require.main === module) {
  main()
}

module.exports = { analyzeFormTypeUsage, generateRecommendations }
