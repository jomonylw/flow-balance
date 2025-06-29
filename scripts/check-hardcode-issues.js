#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

/**
 * 硬编码问题检查脚本
 * 自动检测项目中的硬编码模式并提供修复建议
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

// 硬编码模式定义
const HARDCODE_PATTERNS = {
  stringLiteralUnions: {
    name: '字符串字面量联合类型',
    patterns: [
      /'ASSET'\s*\|\s*'LIABILITY'\s*\|\s*'INCOME'\s*\|\s*'EXPENSE'/g,
      /'INCOME'\s*\|\s*'EXPENSE'\s*\|\s*'BALANCE'/g,
      /'light'\s*\|\s*'dark'\s*\|\s*'system'/g,
      /'zh'\s*\|\s*'en'/g,
    ],
    severity: 'warning',
    suggestion: '使用枚举替代字符串字面量联合类型',
  },
  hardcodedArrays: {
    name: '硬编码常量数组',
    patterns: [
      /const\s+\w*ACCOUNT_TYPES?\w*\s*=\s*\[/g,
      /const\s+\w*CURRENCY\w*\s*=\s*\[/g,
      /const\s+\w*COLORS?\w*\s*=\s*\[/g,
    ],
    severity: 'error',
    suggestion: '使用配置对象和常量管理器',
  },
  hardcodedColors: {
    name: '硬编码颜色值',
    patterns: [
      /#[0-9a-fA-F]{6}/g,
      /#[0-9a-fA-F]{3}/g,
    ],
    severity: 'info',
    suggestion: '使用统一的颜色管理系统',
  },
  currencySymbols: {
    name: '硬编码货币符号',
    patterns: [
      /CNY.*['"]¥['"]|['"]¥['"].*CNY/g,
      /USD.*['"]\\$['"]|['"]\\$['"].*USD/g,
      /EUR.*['"]€['"]|['"]€['"].*EUR/g,
    ],
    severity: 'warning',
    suggestion: '使用 CURRENCY_SYMBOLS 常量',
  },
  zodEnums: {
    name: 'Zod 枚举硬编码',
    patterns: [
      /z\.enum\(\s*\[\s*['"][^'"]*['"]\s*,/g,
    ],
    severity: 'warning',
    suggestion: '使用 ConstantsManager.getZodXxxEnum() 方法',
  },
  balanceAdjustmentType: {
    name: 'BALANCE_ADJUSTMENT 类型使用',
    patterns: [
      /'BALANCE_ADJUSTMENT'/g,
      /"BALANCE_ADJUSTMENT"/g,
      /BALANCE_ADJUSTMENT/g,
    ],
    severity: 'error',
    suggestion: '使用 BALANCE 替代 BALANCE_ADJUSTMENT',
  },
  hardcodedChineseText: {
    name: '硬编码中文文本',
    patterns: [
      /['"][^'"]*[\u4e00-\u9fff]{2,}[^'"]*['"]/g, // 至少2个中文字符
    ],
    severity: 'warning',
    suggestion: '使用国际化 (i18n) 替代硬编码中文文本',
  },
  magicNumbers: {
    name: '魔法数字',
    patterns: [
      /\b(?:100|1000|10000)\b(?!\s*[,\]])/g, // 常见的魔法数字，但排除数组中的情况
    ],
    severity: 'info',
    suggestion: '使用命名常量替代魔法数字',
  },
}

// 获取所有 TypeScript 文件
function getAllTSFiles(dir) {
  const files = []
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir)
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        // 跳过 node_modules 和 .next 目录
        if (!['node_modules', '.next', '.git', 'dist', 'build'].includes(item)) {
          traverse(fullPath)
        }
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath)
      }
    }
  }
  
  traverse(dir)
  return files
}

// 检查单个文件的硬编码问题
function checkFileForHardcode(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const issues = []

  // 排除特殊文件
  const isConstantsFile = filePath.includes('constants.ts') || filePath.includes('constants-manager.ts')
  const isI18nFile = filePath.includes('/i18n/') || filePath.includes('/locales/')
  const isTestFile = filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__')
  const isConfigFile = filePath.includes('tailwind.config') || filePath.includes('next.config') || filePath.includes('package.json')

  Object.entries(HARDCODE_PATTERNS).forEach(([patternKey, config]) => {
    config.patterns.forEach((pattern, index) => {
      let match
      while ((match = pattern.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length
        const matchText = match[0]

        // 跳过常量文件中的合理数组定义
        if (isConstantsFile && patternKey === 'hardcodedArrays') {
          const lowerMatchText = matchText.toLowerCase()
          if (lowerMatchText.includes('stock_account_types') ||
              lowerMatchText.includes('flow_account_types') ||
              lowerMatchText.includes('chart_color_sequence') ||
              lowerMatchText.includes('currency_symbols') ||
              lowerMatchText.includes('account_type_colors')) {
            continue
          }
        }

        // 跳过国际化文件中的中文文本
        if (isI18nFile && patternKey === 'hardcodedChineseText') {
          continue
        }

        // 跳过测试文件中的一些硬编码
        if (isTestFile && (patternKey === 'hardcodedChineseText' || patternKey === 'magicNumbers')) {
          continue
        }

        // 跳过配置文件中的硬编码
        if (isConfigFile) {
          continue
        }

        // 跳过常量定义文件中的枚举值
        if (isConstantsFile && patternKey === 'stringLiteralUnions') {
          continue
        }

        // 跳过注释中的中文文本
        if (patternKey === 'hardcodedChineseText') {
          const lineContent = content.split('\n')[lineNumber - 1]
          if (lineContent && (lineContent.trim().startsWith('//') || lineContent.trim().startsWith('*'))) {
            continue
          }
        }

        // 跳过 console.log 中的中文文本（开发调试用）
        if (patternKey === 'hardcodedChineseText') {
          const surroundingText = content.substring(Math.max(0, match.index - 50), match.index + match[0].length + 50)
          if (surroundingText.includes('console.log') || surroundingText.includes('console.error')) {
            continue
          }
        }

        // 跳过只包含空白字符和少量中文的字符串
        if (patternKey === 'hardcodedChineseText') {
          const cleanText = matchText.replace(/['"]/g, '').trim()
          if (cleanText.length < 2 || /^[\s\n\r\t]*[\u4e00-\u9fff]?[\s\n\r\t]*$/.test(cleanText)) {
            continue
          }
        }

        // 跳过导入路径和文件路径中的内容
        if (patternKey === 'hardcodedChineseText') {
          const surroundingText = content.substring(Math.max(0, match.index - 30), match.index + match[0].length + 30)
          if (surroundingText.includes('import') || surroundingText.includes('from') ||
              surroundingText.includes('require') || matchText.includes('/') || matchText.includes('.')) {
            continue
          }
        }

        issues.push({
          file: filePath,
          line: lineNumber,
          type: patternKey,
          severity: config.severity,
          name: config.name,
          suggestion: config.suggestion,
          match: matchText.substring(0, 100), // 限制匹配文本长度
        })
      }
    })
  })

  return issues
}

// 生成修复建议
function generateFixSuggestions(issues) {
  const suggestions = new Map()
  
  issues.forEach(issue => {
    const key = issue.type
    if (!suggestions.has(key)) {
      suggestions.set(key, {
        name: issue.name,
        count: 0,
        files: new Set(),
        suggestion: issue.suggestion,
        severity: issue.severity,
      })
    }
    
    const suggestion = suggestions.get(key)
    suggestion.count++
    suggestion.files.add(issue.file)
  })
  
  return Array.from(suggestions.values())
}

// 主检查函数
function checkHardcodeIssues() {
  console.log(colorize('🔍 检查项目中的硬编码问题', 'blue'))
  console.log('=' .repeat(60))
  
  const files = getAllTSFiles('src')
  console.log(colorize(`📁 扫描 ${files.length} 个文件...`, 'cyan'))
  
  const allIssues = []
  
  files.forEach(file => {
    const issues = checkFileForHardcode(file)
    allIssues.push(...issues)
  })
  
  if (allIssues.length === 0) {
    console.log(colorize('✅ 没有发现硬编码问题！', 'green'))
    return true
  }
  
  // 按严重程度分组
  const errorIssues = allIssues.filter(issue => issue.severity === 'error')
  const warningIssues = allIssues.filter(issue => issue.severity === 'warning')
  const infoIssues = allIssues.filter(issue => issue.severity === 'info')
  
  console.log(colorize(`\n❌ 发现 ${allIssues.length} 个硬编码问题:`, 'red'))
  console.log(colorize(`   🚨 错误: ${errorIssues.length}`, 'red'))
  console.log(colorize(`   ⚠️  警告: ${warningIssues.length}`, 'yellow'))
  console.log(colorize(`   ℹ️  信息: ${infoIssues.length}`, 'blue'))
  
  // 显示详细问题
  if (errorIssues.length > 0) {
    console.log(colorize('\n🚨 错误级别问题:', 'red'))
    errorIssues.slice(0, 10).forEach(issue => {
      const relativePath = path.relative(process.cwd(), issue.file)
      console.log(`  📄 ${relativePath}:${issue.line}`)
      console.log(`     ${colorize(issue.name, 'red')}: ${issue.match.substring(0, 50)}...`)
    })
    if (errorIssues.length > 10) {
      console.log(colorize(`     ... 还有 ${errorIssues.length - 10} 个错误`, 'red'))
    }
  }
  
  if (warningIssues.length > 0) {
    console.log(colorize('\n⚠️ 警告级别问题:', 'yellow'))
    warningIssues.slice(0, 5).forEach(issue => {
      const relativePath = path.relative(process.cwd(), issue.file)
      console.log(`  📄 ${relativePath}:${issue.line}`)
      console.log(`     ${colorize(issue.name, 'yellow')}: ${issue.match.substring(0, 50)}...`)
    })
    if (warningIssues.length > 5) {
      console.log(colorize(`     ... 还有 ${warningIssues.length - 5} 个警告`, 'yellow'))
    }
  }
  
  // 生成修复建议
  const suggestions = generateFixSuggestions(allIssues)
  
  console.log(colorize('\n💡 修复建议:', 'yellow'))
  suggestions.forEach((suggestion, index) => {
    const severityColor = suggestion.severity === 'error' ? 'red' : 
                         suggestion.severity === 'warning' ? 'yellow' : 'blue'
    
    console.log(colorize(`\n${index + 1}. ${suggestion.name} (${suggestion.count} 处)`, severityColor))
    console.log(`   📝 建议: ${suggestion.suggestion}`)
    console.log(`   📁 影响文件: ${suggestion.files.size} 个`)
    
    if (suggestion.files.size <= 3) {
      Array.from(suggestion.files).forEach(file => {
        const relativePath = path.relative(process.cwd(), file)
        console.log(`      - ${relativePath}`)
      })
    } else {
      const fileArray = Array.from(suggestion.files)
      fileArray.slice(0, 2).forEach(file => {
        const relativePath = path.relative(process.cwd(), file)
        console.log(`      - ${relativePath}`)
      })
      console.log(`      - ... 还有 ${suggestion.files.size - 2} 个文件`)
    }
  })
  
  console.log(colorize('\n🔧 推荐的重构步骤:', 'cyan'))
  console.log('1. 修复 BALANCE_ADJUSTMENT → BALANCE 类型重命名')
  console.log('2. 使用 src/types/core/constants.ts 中的枚举替代字符串字面量')
  console.log('3. 使用 ConstantsManager 替代硬编码常量数组')
  console.log('4. 统一使用颜色管理系统')
  console.log('5. 使用国际化 (i18n) 替代硬编码中文文本')
  console.log('6. 更新 Zod Schema 使用枚举配置')
  console.log('7. 使用命名常量替代魔法数字')
  console.log('8. 运行测试确保功能正常')

  console.log(colorize('\n📚 参考文档:', 'cyan'))
  console.log('- docs/HARDCODE_REFACTOR_GUIDE.md')
  console.log('- src/types/core/constants.ts')
  console.log('- src/lib/utils/constants-manager.ts')
  console.log('- src/lib/constants/index.ts')
  console.log('- src/i18n/ (国际化配置)')

  console.log(colorize('\n🚨 优先修复项目:', 'red'))
  console.log('1. BALANCE_ADJUSTMENT 类型问题 (影响 API 兼容性)')
  console.log('2. 硬编码常量数组 (影响代码维护性)')
  console.log('3. 字符串字面量联合类型 (影响类型安全)')
  
  return errorIssues.length === 0
}

// 运行检查
if (require.main === module) {
  const success = checkHardcodeIssues()
  process.exit(success ? 0 : 1)
}

module.exports = { checkHardcodeIssues }
