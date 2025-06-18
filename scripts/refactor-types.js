#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

/**
 * 自动化类型重构脚本
 * 移除重复的类型定义，统一使用 @/types 中的类型
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

// 核心类型映射 - 从统一类型文件导入
const CORE_TYPE_IMPORTS = {
  User: '@/types/core',
  Account: '@/types/core',
  Transaction: '@/types/core',
  Category: '@/types/core',
  Currency: '@/types/core',
  Tag: '@/types/core',
  UserSettings: '@/types/core',
  ExchangeRate: '@/types/core',
  Balance: '@/types/core',
  TrendDataPoint: '@/types/core',
  TransactionFormData: '@/types/core',
  AccountFormData: '@/types/core',
  CategoryFormData: '@/types/core',
  TagFormData: '@/types/core',
  TransactionTag: '@/types/core',
  CategoryStats: '@/types/core',
  AccountBalances: '@/types/core',
  CategorySummaryBase: '@/types/core',
}

// API 类型映射
const API_TYPE_IMPORTS = {
  ApiResponse: '@/types/api',
  ApiSuccessResponse: '@/types/api',
  ApiErrorResponse: '@/types/api',
  PaginationParams: '@/types/api',
  PaginatedResponse: '@/types/api',
  ApiContext: '@/types/api',
  ApiHandler: '@/types/api',
}

// UI 类型映射
const UI_TYPE_IMPORTS = {
  Theme: '@/types/ui',
  Language: '@/types/ui',
  BreadcrumbItem: '@/types/ui',
  Breakpoint: '@/types/ui',
}

// 合并所有类型映射
const ALL_TYPE_IMPORTS = {
  ...CORE_TYPE_IMPORTS,
  ...API_TYPE_IMPORTS,
  ...UI_TYPE_IMPORTS,
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

// 检查文件是否为类型定义文件（应该跳过）
function isTypeDefinitionFile(filePath) {
  return filePath.includes('/types/') || filePath.endsWith('.d.ts')
}

// 分析文件中的类型定义和使用
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')

  const localDefinitions = []
  const imports = []
  const usages = []

  // 查找本地类型定义
  lines.forEach((line, index) => {
    const interfaceMatch = line.match(/^\s*interface\s+(\w+)/)
    const typeMatch = line.match(/^\s*type\s+(\w+)\s*=/)

    if (interfaceMatch) {
      const typeName = interfaceMatch[1]
      if (ALL_TYPE_IMPORTS[typeName]) {
        localDefinitions.push({
          name: typeName,
          line: index + 1,
          type: 'interface',
        })
      }
    } else if (typeMatch) {
      const typeName = typeMatch[1]
      if (ALL_TYPE_IMPORTS[typeName]) {
        localDefinitions.push({
          name: typeName,
          line: index + 1,
          type: 'type',
        })
      }
    }
  })

  // 查找现有导入
  lines.forEach((line, index) => {
    const importMatch = line.match(
      /import\s+(?:type\s+)?{([^}]+)}\s+from\s+['"]([^'"]+)['"]/
    )
    if (importMatch) {
      const importedTypes = importMatch[1].split(',').map(t => t.trim())
      const source = importMatch[2]
      imports.push({
        types: importedTypes,
        source,
        line: index + 1,
        fullLine: line,
      })
    }
  })

  // 查找类型使用（简单检测）
  Object.keys(ALL_TYPE_IMPORTS).forEach(typeName => {
    const regex = new RegExp(`\\b${typeName}\\b`, 'g')
    const matches = content.match(regex)
    if (matches) {
      usages.push({
        name: typeName,
        count: matches.length,
      })
    }
  })

  return { localDefinitions, imports, usages, content, lines }
}

// 生成新的导入语句
function generateImports(usedTypes) {
  const importGroups = {}

  usedTypes.forEach(typeName => {
    const source = ALL_TYPE_IMPORTS[typeName]
    if (source) {
      if (!importGroups[source]) {
        importGroups[source] = []
      }
      importGroups[source].push(typeName)
    }
  })

  const importStatements = []
  Object.entries(importGroups).forEach(([source, types]) => {
    const sortedTypes = types.sort()
    importStatements.push(
      `import type { ${sortedTypes.join(', ')} } from '${source}'`
    )
  })

  return importStatements
}

// 移除本地类型定义
function removeLocalDefinitions(lines, definitions) {
  const linesToRemove = new Set()

  definitions.forEach(def => {
    const startLine = def.line - 1
    let endLine = startLine

    // 找到类型定义的结束位置
    if (def.type === 'interface') {
      let braceCount = 0
      let foundStart = false

      for (let i = startLine; i < lines.length; i++) {
        const line = lines[i]
        for (const char of line) {
          if (char === '{') {
            braceCount++
            foundStart = true
          } else if (char === '}') {
            braceCount--
            if (foundStart && braceCount === 0) {
              endLine = i
              break
            }
          }
        }
        if (foundStart && braceCount === 0) break
      }
    } else {
      // type 定义通常在一行内，但可能跨行
      for (let i = startLine; i < lines.length; i++) {
        if (lines[i].includes('=') && !lines[i].trim().endsWith(',')) {
          endLine = i
          break
        }
      }
    }

    // 标记要删除的行
    for (let i = startLine; i <= endLine; i++) {
      linesToRemove.add(i)
    }
  })

  return lines.filter((_, index) => !linesToRemove.has(index))
}

// 重构单个文件
function refactorFile(filePath) {
  if (isTypeDefinitionFile(filePath)) {
    return { modified: false, reason: 'Skipped type definition file' }
  }

  const analysis = analyzeFile(filePath)
  const { localDefinitions, imports, usages, lines } = analysis

  if (localDefinitions.length === 0) {
    return { modified: false, reason: 'No local definitions to remove' }
  }

  console.log(
    colorize(`\n📝 重构文件: ${path.relative(process.cwd(), filePath)}`, 'cyan')
  )
  console.log(`  发现 ${localDefinitions.length} 个本地类型定义:`)
  localDefinitions.forEach(def => {
    console.log(`    - ${def.name} (${def.type}, line ${def.line})`)
  })

  // 获取使用的类型
  const usedTypes = usages
    .filter(usage => localDefinitions.some(def => def.name === usage.name))
    .map(usage => usage.name)

  if (usedTypes.length === 0) {
    return { modified: false, reason: 'No used types found' }
  }

  // 移除本地定义
  let newLines = removeLocalDefinitions(lines, localDefinitions)

  // 生成新的导入语句
  const newImports = generateImports(usedTypes)

  // 找到插入导入语句的位置（在现有导入之后）
  let insertIndex = 0
  for (let i = 0; i < newLines.length; i++) {
    if (
      newLines[i].match(/^import\s+/) ||
      newLines[i].match(/^\/\*\*/) ||
      newLines[i].match(/^\/\//)
    ) {
      insertIndex = i + 1
    } else if (newLines[i].trim() === '') {
      continue
    } else {
      break
    }
  }

  // 插入新的导入语句
  newImports.forEach((importStatement, index) => {
    newLines.splice(insertIndex + index, 0, importStatement)
  })

  // 写入文件
  const newContent = newLines.join('\n')
  fs.writeFileSync(filePath, newContent)

  return {
    modified: true,
    removedDefinitions: localDefinitions.length,
    addedImports: newImports.length,
    usedTypes,
  }
}

// 主函数
function main() {
  console.log(colorize('🔧 TypeScript 类型重构工具', 'blue'))
  console.log('================================\n')

  const files = getAllTSFiles('src')
  const results = {
    processed: 0,
    modified: 0,
    skipped: 0,
    totalDefinitionsRemoved: 0,
    totalImportsAdded: 0,
  }

  console.log(colorize(`📁 处理 ${files.length} 个文件...`, 'cyan'))

  files.forEach(file => {
    try {
      const result = refactorFile(file)
      results.processed++

      if (result.modified) {
        results.modified++
        results.totalDefinitionsRemoved += result.removedDefinitions
        results.totalImportsAdded += result.addedImports
        console.log(colorize(`  ✅ 已修改`, 'green'))
      } else {
        results.skipped++
        console.log(colorize(`  ⏭️  跳过: ${result.reason}`, 'yellow'))
      }
    } catch (error) {
      console.log(colorize(`  ❌ 错误: ${error.message}`, 'red'))
    }
  })

  console.log(colorize('\n📊 重构完成统计:', 'blue'))
  console.log('================================')
  console.log(`处理文件: ${results.processed}`)
  console.log(`修改文件: ${results.modified}`)
  console.log(`跳过文件: ${results.skipped}`)
  console.log(`移除定义: ${results.totalDefinitionsRemoved}`)
  console.log(`添加导入: ${results.totalImportsAdded}`)

  console.log(colorize('\n🎉 类型重构完成！', 'green'))
  console.log(colorize('建议运行 pnpm run type-check 验证结果', 'cyan'))
}

if (require.main === module) {
  main()
}

module.exports = { refactorFile, main }
