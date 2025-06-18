#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

/**
 * 分析项目中的类型使用情况
 * 检测重复定义和未使用的类型
 */

// 需要分析的核心类型
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

  // 匹配 interface 定义
  const interfaceRegex = /interface\s+(\w+)\s*{[^}]*}/g
  let match
  while ((match = interfaceRegex.exec(content)) !== null) {
    const typeName = match[1]
    const lineNumber = content.substring(0, match.index).split('\n').length
    definitions.push({
      type: 'interface',
      name: typeName,
      line: lineNumber,
      content: match[0],
    })
  }

  // 匹配 type 定义
  const typeRegex = /type\s+(\w+)\s*=/g
  while ((match = typeRegex.exec(content)) !== null) {
    const typeName = match[1]
    const lineNumber = content.substring(0, match.index).split('\n').length
    definitions.push({
      type: 'type',
      name: typeName,
      line: lineNumber,
      content: match[0].split('=')[0] + '= ...',
    })
  }

  return definitions
}

// 分析类型导入
function analyzeTypeImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const imports = []

  // 匹配 import type 语句
  const importTypeRegex = /import\s+type\s*{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g
  let match
  while ((match = importTypeRegex.exec(content)) !== null) {
    const types = match[1].split(',').map(t => t.trim())
    const source = match[2]
    imports.push({ types, source, isTypeOnly: true })
  }

  // 匹配普通 import 中的类型
  const importRegex = /import\s*{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g
  while ((match = importRegex.exec(content)) !== null) {
    const items = match[1].split(',').map(t => t.trim())
    const source = match[2]
    // 简单启发式：大写开头的可能是类型
    const types = items.filter(item => /^[A-Z]/.test(item))
    if (types.length > 0) {
      imports.push({ types, source, isTypeOnly: false })
    }
  }

  return imports
}

// 主分析函数
function analyzeProject() {
  console.log(colorize('🔍 TypeScript 类型使用分析工具', 'blue'))
  console.log('================================\n')

  const files = getAllTSFiles('src')
  const typeDefinitions = new Map() // typeName -> [{ file, line, content }]
  const typeImports = new Map() // typeName -> [{ file, source }]
  const fileAnalysis = []

  console.log(colorize(`📁 分析 ${files.length} 个文件...`, 'cyan'))

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

// 生成报告
function generateReport() {
  const { typeDefinitions, typeImports } = analyzeProject()

  console.log(colorize('\n📊 重复类型定义分析:', 'yellow'))
  console.log('================================')

  // 查找重复定义
  const duplicates = []
  typeDefinitions.forEach((definitions, typeName) => {
    if (definitions.length > 1) {
      duplicates.push({ typeName, definitions })
    }
  })

  if (duplicates.length === 0) {
    console.log(colorize('✅ 没有发现重复的类型定义！', 'green'))
  } else {
    console.log(
      colorize(`❌ 发现 ${duplicates.length} 个重复定义的类型:`, 'red')
    )

    duplicates.forEach(({ typeName, definitions }) => {
      console.log(
        colorize(`\n🔸 ${typeName} (${definitions.length} 处定义):`, 'magenta')
      )
      definitions.forEach(def => {
        const relativePath = path.relative(process.cwd(), def.file)
        console.log(`  📄 ${relativePath}:${def.line} (${def.type})`)
      })
    })
  }

  console.log(colorize('\n📈 核心类型使用统计:', 'yellow'))
  console.log('================================')

  CORE_TYPES.forEach(coreType => {
    const definitions = typeDefinitions.get(coreType) || []
    const imports = typeImports.get(coreType) || []

    console.log(colorize(`\n🔹 ${coreType}:`, 'cyan'))
    console.log(`  定义次数: ${definitions.length}`)
    console.log(`  导入次数: ${imports.length}`)

    if (definitions.length > 1) {
      console.log(colorize(`  ⚠️  存在重复定义`, 'yellow'))
    }

    if (imports.length === 0 && definitions.length > 0) {
      console.log(colorize(`  ⚠️  有定义但无导入使用`, 'yellow'))
    }
  })

  // 保存详细报告
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: typeDefinitions.size,
      duplicateTypes: duplicates.length,
      coreTypeStats: CORE_TYPES.map(type => ({
        name: type,
        definitions: (typeDefinitions.get(type) || []).length,
        imports: (typeImports.get(type) || []).length,
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
  }

  fs.writeFileSync('type-usage-report.json', JSON.stringify(report, null, 2))
  console.log(
    colorize('\n📄 详细报告已保存到: type-usage-report.json', 'green')
  )
}

// 运行分析
if (require.main === module) {
  generateReport()
}

module.exports = { analyzeProject, generateReport }
