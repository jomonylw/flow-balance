#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

/**
 * 分析项目中的类型使用情况
 * 检测重复定义和未使用的类型
 */

// 需要分析的核心类型
const CORE_TYPES = [
  // 基础业务类型
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

  // 扩展业务类型
  'RecurringTransaction',
  'LoanContract',
  'LoanPayment',
  'TransactionTemplate',

  // FIRE 相关类型
  'FireParams',
  'FireCalculationResult',
  'FireProjection',

  // 智能粘贴相关类型
  'SmartPasteRowData',
  'SmartPasteColumn',
  'SmartPasteGridConfig',
  'CellData',
  'CellPosition',
  'CellSelection',

  // 表单数据类型
  'TransactionFormData',
  'AccountFormData',
  'CategoryFormData',
  'TagFormData',
  'RecurringTransactionFormData',
  'LoanContractFormData',

  // 统计和汇总类型
  'CategoryStats',
  'AccountBalances',
  'CategorySummaryBase',
  'MonthlySummaryData',
  'AssetLiabilityData',

  // API 相关类型
  'ApiResponse',
  'ApiContext',
  'ApiHandler',
  'PaginatedResponse',

  // 导入导出类型
  'ExportedData',
  'ImportResult',
  'TransactionBatchResult',
]

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

// 分析文件中的类型定义
function analyzeTypeDefinitions(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const definitions = []

  // 匹配 interface 定义 - 改进的正则表达式，支持嵌套大括号
  const interfaceRegex = /(?:export\s+)?interface\s+(\w+)(?:\s*<[^>]*>)?\s*(?:extends\s+[^{]+)?\s*{/g
  let match
  while ((match = interfaceRegex.exec(content)) !== null) {
    const typeName = match[1]
    const lineNumber = content.substring(0, match.index).split('\n').length

    // 找到完整的接口定义（处理嵌套大括号）
    let braceCount = 1
    let endIndex = match.index + match[0].length
    while (braceCount > 0 && endIndex < content.length) {
      if (content[endIndex] === '{') braceCount++
      else if (content[endIndex] === '}') braceCount--
      endIndex++
    }

    const fullContent = content.substring(match.index, endIndex)
    definitions.push({
      type: 'interface',
      name: typeName,
      line: lineNumber,
      content: fullContent.length > 100 ? fullContent.substring(0, 100) + '...' : fullContent,
    })
  }

  // 匹配 type 定义 - 改进的正则表达式
  const typeRegex = /(?:export\s+)?type\s+(\w+)(?:\s*<[^>]*>)?\s*=/g
  while ((match = typeRegex.exec(content)) !== null) {
    const typeName = match[1]
    const lineNumber = content.substring(0, match.index).split('\n').length

    // 找到类型定义的结束位置
    let endIndex = match.index + match[0].length
    let depth = 0
    let inString = false
    let stringChar = ''

    while (endIndex < content.length) {
      const char = content[endIndex]

      if (!inString) {
        if (char === '"' || char === "'" || char === '`') {
          inString = true
          stringChar = char
        } else if (char === '{' || char === '[' || char === '(') {
          depth++
        } else if (char === '}' || char === ']' || char === ')') {
          depth--
        } else if (depth === 0 && (char === '\n' || char === ';')) {
          break
        }
      } else if (char === stringChar && content[endIndex - 1] !== '\\') {
        inString = false
      }

      endIndex++
    }

    const fullContent = content.substring(match.index, endIndex)
    definitions.push({
      type: 'type',
      name: typeName,
      line: lineNumber,
      content: fullContent.length > 100 ? fullContent.substring(0, 100) + '...' : fullContent,
    })
  }

  // 匹配 enum 定义
  const enumRegex = /(?:export\s+)?enum\s+(\w+)\s*{/g
  while ((match = enumRegex.exec(content)) !== null) {
    const typeName = match[1]
    const lineNumber = content.substring(0, match.index).split('\n').length

    // 找到完整的枚举定义
    let braceCount = 1
    let endIndex = match.index + match[0].length
    while (braceCount > 0 && endIndex < content.length) {
      if (content[endIndex] === '{') braceCount++
      else if (content[endIndex] === '}') braceCount--
      endIndex++
    }

    const fullContent = content.substring(match.index, endIndex)
    definitions.push({
      type: 'enum',
      name: typeName,
      line: lineNumber,
      content: fullContent.length > 100 ? fullContent.substring(0, 100) + '...' : fullContent,
    })
  }

  return definitions
}

// 分析类型导入
function analyzeTypeImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const imports = []

  // 匹配 import type 语句 - 支持多行和复杂格式
  const importTypeRegex = /import\s+type\s*{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g
  let match
  while ((match = importTypeRegex.exec(content)) !== null) {
    const typesText = match[1]
    const source = match[2]

    // 解析类型名称，处理别名和换行
    const types = typesText
      .split(',')
      .map(t => t.trim())
      .map(t => {
        // 处理 "Type as Alias" 格式
        const asMatch = t.match(/^(.+?)\s+as\s+(.+)$/)
        return asMatch ? asMatch[2].trim() : t.trim()
      })
      .filter(t => t.length > 0)

    imports.push({ types, source, isTypeOnly: true })
  }

  // 匹配普通 import 中的类型
  const importRegex = /import\s*{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g
  while ((match = importRegex.exec(content)) !== null) {
    const itemsText = match[1]
    const source = match[2]

    // 解析导入项
    const items = itemsText
      .split(',')
      .map(t => t.trim())
      .map(t => {
        // 处理 "Item as Alias" 格式
        const asMatch = t.match(/^(.+?)\s+as\s+(.+)$/)
        return asMatch ? asMatch[2].trim() : t.trim()
      })
      .filter(t => t.length > 0)

    // 改进的类型检测：大写开头或在核心类型列表中
    const types = items.filter(item => {
      return /^[A-Z]/.test(item) || CORE_TYPES.includes(item)
    })

    if (types.length > 0) {
      imports.push({ types, source, isTypeOnly: false })
    }
  }

  // 匹配默认导入中的类型（如果是大写开头）
  const defaultImportRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g
  while ((match = defaultImportRegex.exec(content)) !== null) {
    const typeName = match[1]
    const source = match[2]

    if (/^[A-Z]/.test(typeName) || CORE_TYPES.includes(typeName)) {
      imports.push({ types: [typeName], source, isTypeOnly: false, isDefault: true })
    }
  }

  return imports
}

// 主分析函数
function analyzeProject() {
  console.warn(colorize('🔍 TypeScript 类型使用分析工具', 'blue'))
  console.warn('================================\n')

  const files = getAllTSFiles('src')
  const typeDefinitions = new Map() // typeName -> [{ file, line, content }]
  const typeImports = new Map() // typeName -> [{ file, source }]
  const fileAnalysis = []

  console.warn(colorize(`📁 分析 ${files.length} 个文件...`, 'cyan'))

  // 分析每个文件
  files.forEach(file => {
    const definitions = analyzeTypeDefinitions(file)
    const imports = analyzeTypeImports(file)

    fileAnalysis.push({
      file,
      definitions,
      imports,
    })

    // 收集类型定义
    definitions.forEach(def => {
      if (!typeDefinitions.has(def.name)) {
        typeDefinitions.set(def.name, [])
      }
      typeDefinitions.get(def.name).push({
        file,
        line: def.line,
        content: def.content,
        type: def.type,
      })
    })

    // 收集类型导入
    imports.forEach(imp => {
      imp.types.forEach(typeName => {
        if (!typeImports.has(typeName)) {
          typeImports.set(typeName, [])
        }
        typeImports.get(typeName).push({
          file,
          source: imp.source,
          isTypeOnly: imp.isTypeOnly,
        })
      })
    })
  })

  return { typeDefinitions, typeImports, fileAnalysis }
}

// 分析类型依赖关系
function analyzeTypeDependencies(typeDefinitions, typeImports) {
  const dependencies = new Map() // typeName -> Set<dependentType>
  const reverseDependencies = new Map() // typeName -> Set<dependsOnType>

  // 分析每个类型定义中引用的其他类型
  typeDefinitions.forEach((definitions, typeName) => {
    definitions.forEach(def => {
      const referencedTypes = new Set()

      // 在类型定义内容中查找其他类型的引用
      CORE_TYPES.forEach(coreType => {
        if (coreType !== typeName && def.content.includes(coreType)) {
          referencedTypes.add(coreType)
        }
      })

      dependencies.set(typeName, referencedTypes)

      // 建立反向依赖关系
      referencedTypes.forEach(refType => {
        if (!reverseDependencies.has(refType)) {
          reverseDependencies.set(refType, new Set())
        }
        reverseDependencies.get(refType).add(typeName)
      })
    })
  })

  return { dependencies, reverseDependencies }
}

// 分析未使用的类型
function analyzeUnusedTypes(typeDefinitions, typeImports) {
  const unusedTypes = []

  typeDefinitions.forEach((definitions, typeName) => {
    const imports = typeImports.get(typeName) || []

    // 如果类型有定义但没有导入使用，可能是未使用的
    if (definitions.length > 0 && imports.length === 0) {
      // 检查是否是导出的类型（可能被外部使用）
      const isExported = definitions.some(def =>
        def.content.includes('export interface') ||
        def.content.includes('export type') ||
        def.content.includes('export enum')
      )

      if (!isExported) {
        unusedTypes.push({
          typeName,
          definitions: definitions.map(def => ({
            file: def.file,
            line: def.line,
            type: def.type
          }))
        })
      }
    }
  })

  return unusedTypes
}

// 生成报告
function generateReport() {
  const { typeDefinitions, typeImports } = analyzeProject()
  const dependencies = analyzeTypeDependencies(typeDefinitions, typeImports)
  const unusedTypes = analyzeUnusedTypes(typeDefinitions, typeImports)

  // 使用 console.warn 替代 console.log 以符合 lint 规则
  console.warn(colorize('\n📊 重复类型定义分析:', 'yellow'))
  console.warn('================================')

  // 查找重复定义
  const duplicates = []
  typeDefinitions.forEach((definitions, typeName) => {
    if (definitions.length > 1) {
      duplicates.push({ typeName, definitions })
    }
  })

  if (duplicates.length === 0) {
    console.warn(colorize('✅ 没有发现重复的类型定义！', 'green'))
  } else {
    console.warn(
      colorize(`❌ 发现 ${duplicates.length} 个重复定义的类型:`, 'red')
    )

    duplicates.forEach(({ typeName, definitions }) => {
      console.warn(
        colorize(`\n🔸 ${typeName} (${definitions.length} 处定义):`, 'magenta')
      )
      definitions.forEach(def => {
        const relativePath = path.relative(process.cwd(), def.file)
        console.warn(`  📄 ${relativePath}:${def.line} (${def.type})`)
      })
    })
  }

  console.warn(colorize('\n📈 核心类型使用统计:', 'yellow'))
  console.warn('================================')

  CORE_TYPES.forEach(coreType => {
    const definitions = typeDefinitions.get(coreType) || []
    const imports = typeImports.get(coreType) || []

    console.warn(colorize(`\n🔹 ${coreType}:`, 'cyan'))
    console.warn(`  定义次数: ${definitions.length}`)
    console.warn(`  导入次数: ${imports.length}`)

    if (definitions.length > 1) {
      console.warn(colorize(`  ⚠️  存在重复定义`, 'yellow'))
    }

    if (imports.length === 0 && definitions.length > 0) {
      console.warn(colorize(`  ⚠️  有定义但无导入使用`, 'yellow'))
    }
  })

  // 显示未使用类型分析
  if (unusedTypes.length > 0) {
    console.warn(colorize('\n🗑️  未使用的类型定义:', 'yellow'))
    console.warn('================================')
    unusedTypes.forEach(({ typeName, definitions }) => {
      console.warn(colorize(`\n🔸 ${typeName}:`, 'magenta'))
      definitions.forEach(def => {
        const relativePath = path.relative(process.cwd(), def.file)
        console.warn(`  📄 ${relativePath}:${def.line} (${def.type})`)
      })
    })
  }

  // 显示类型依赖关系分析
  console.warn(colorize('\n🔗 类型依赖关系分析:', 'yellow'))
  console.warn('================================')

  const { reverseDependencies } = dependencies
  const highlyDependedTypes = []

  reverseDependencies.forEach((dependents, typeName) => {
    if (dependents.size >= 3) {
      highlyDependedTypes.push({
        typeName,
        dependentCount: dependents.size,
        dependents: Array.from(dependents)
      })
    }
  })

  if (highlyDependedTypes.length > 0) {
    console.warn(colorize('\n📊 高依赖度类型 (被3个以上类型依赖):', 'cyan'))
    highlyDependedTypes
      .sort((a, b) => b.dependentCount - a.dependentCount)
      .forEach(({ typeName, dependentCount, dependents }) => {
        console.warn(`  🔸 ${typeName}: ${dependentCount} 个依赖`)
        console.warn(`    依赖者: ${dependents.join(', ')}`)
      })
  } else {
    console.warn(colorize('✅ 没有发现高依赖度的类型', 'green'))
  }

  // 保存详细报告
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: typeDefinitions.size,
      totalTypes: typeDefinitions.size,
      duplicateTypes: duplicates.length,
      unusedTypes: unusedTypes.length,
      coreTypeStats: CORE_TYPES.map(type => ({
        name: type,
        definitions: (typeDefinitions.get(type) || []).length,
        imports: (typeImports.get(type) || []).length,
        hasIssues: (typeDefinitions.get(type) || []).length > 1 ||
                   ((typeDefinitions.get(type) || []).length > 0 &&
                    (typeImports.get(type) || []).length === 0)
      })),
    },
    duplicates: duplicates.map(({ typeName, definitions }) => ({
      typeName,
      count: definitions.length,
      locations: definitions.map(def => ({
        file: path.relative(process.cwd(), def.file),
        line: def.line,
        type: def.type,
      })),
    })),
    unusedTypes: unusedTypes.map(({ typeName, definitions }) => ({
      typeName,
      locations: definitions.map(def => ({
        file: path.relative(process.cwd(), def.file),
        line: def.line,
        type: def.type,
      })),
    })),
    dependencies: {
      highlyDepended: highlyDependedTypes.map(({ typeName, dependentCount, dependents }) => ({
        typeName,
        dependentCount,
        dependents
      }))
    }
  }

  fs.writeFileSync('type-usage-report.json', JSON.stringify(report, null, 2))
  console.warn(
    colorize('\n📄 详细报告已保存到: type-usage-report.json', 'green')
  )
}

// 运行分析
if (require.main === module) {
  generateReport()
}

module.exports = { analyzeProject, generateReport }
