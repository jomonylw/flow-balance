#!/usr/bin/env node

/**
 * 硬编码修复助手工具
 * 提供交互式的硬编码问题修复建议和自动修复功能
 */

const fs = require('fs')
const path = require('path')
const readline = require('readline')

// 颜色输出函数
const colorize = (text, color) => {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m',
  }
  return `${colors[color] || colors.reset}${text}${colors.reset}`
}

// 修复建议配置
const FIX_SUGGESTIONS = {
  // API错误消息修复
  apiErrors: {
    patterns: [
      { from: "'未授权访问'", to: "getCommonError('UNAUTHORIZED')" },
      { from: '"未授权访问"', to: "getCommonError('UNAUTHORIZED')" },
      { from: "'服务器内部错误'", to: "getCommonError('INTERNAL_ERROR')" },
      { from: '"服务器内部错误"', to: "getCommonError('INTERNAL_ERROR')" },
      { from: "'请求数据格式错误'", to: "getCommonError('INVALID_REQUEST')" },
      { from: '"请求数据格式错误"', to: "getCommonError('INVALID_REQUEST')" },
      { from: "'数据验证失败'", to: "getCommonError('VALIDATION_FAILED')" },
      { from: '"数据验证失败"', to: "getCommonError('VALIDATION_FAILED')" },
      { from: "'资源不存在'", to: "getCommonError('NOT_FOUND')" },
      { from: '"资源不存在"', to: "getCommonError('NOT_FOUND')" },
    ],
    import: "import { getCommonError } from '@/lib/constants/api-messages'",
  },

  // UI文本修复
  uiTexts: {
    patterns: [
      { from: "'加载中...'", to: "getCommonUi('LOADING')" },
      { from: '"加载中..."', to: "getCommonUi('LOADING')" },
      { from: "'保存中...'", to: "getCommonUi('SAVING')" },
      { from: '"保存中..."', to: "getCommonUi('SAVING')" },
      { from: "'删除中...'", to: "getCommonUi('DELETING')" },
      { from: '"删除中..."', to: "getCommonUi('DELETING')" },
      { from: "'确认'", to: "getCommonUi('CONFIRM')" },
      { from: '"确认"', to: "getCommonUi('CONFIRM')" },
      { from: "'取消'", to: "getCommonUi('CANCEL')" },
      { from: '"取消"', to: "getCommonUi('CANCEL')" },
      { from: "'保存'", to: "getCommonUi('SAVE')" },
      { from: '"保存"', to: "getCommonUi('SAVE')" },
      { from: "'删除'", to: "getCommonUi('DELETE')" },
      { from: '"删除"', to: "getCommonUi('DELETE')" },
    ],
    import: "import { getCommonUi } from '@/lib/constants/ui-messages'",
  },

  // 魔法数字修复
  magicNumbers: {
    patterns: [
      { from: /\.max\(100\)/, to: '.max(BUSINESS_LIMITS.BATCH_MAX_SIZE)' },
      {
        from: /\* 100 \/ 100/,
        to: '* BUSINESS_LIMITS.PERCENTAGE_MULTIPLIER / BUSINESS_LIMITS.PERCENTAGE_MULTIPLIER',
      },
      {
        from: /Math\.round\([^)]*\s*\*\s*100\)\s*\/\s*100/,
        to: 'Math.round($1 * BUSINESS_LIMITS.PERCENTAGE_MULTIPLIER) / BUSINESS_LIMITS.PERCENTAGE_MULTIPLIER',
      },
    ],
    import: "import { BUSINESS_LIMITS } from '@/lib/constants/app-config'",
  },

  // 颜色值修复
  colors: {
    patterns: [
      { from: /#3b82f6/g, to: "ColorManager.getSemanticColor('primary')" },
      {
        from: /#10b981/g,
        to: 'ColorManager.getAccountColor(AccountType.ASSET)',
      },
      {
        from: /#ef4444/g,
        to: 'ColorManager.getAccountColor(AccountType.LIABILITY)',
      },
      { from: /#6B7280/g, to: "ColorManager.getSemanticColor('secondary')" },
    ],
    import: "import { ColorManager } from '@/lib/utils/color'",
  },
}

// 获取文件列表
function getFileList(dir, extensions = ['.ts', '.tsx']) {
  const files = []

  function scanDir(currentDir) {
    const items = fs.readdirSync(currentDir)

    for (const item of items) {
      const fullPath = path.join(currentDir, item)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        // 跳过特定目录
        if (
          !['node_modules', '.git', '.next', 'dist', 'build'].includes(item)
        ) {
          scanDir(fullPath)
        }
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath)
      }
    }
  }

  scanDir(dir)
  return files
}

// 分析文件中的硬编码问题
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const issues = []

  // 检查API错误消息
  FIX_SUGGESTIONS.apiErrors.patterns.forEach(pattern => {
    if (content.includes(pattern.from)) {
      issues.push({
        type: 'apiError',
        pattern: pattern.from,
        suggestion: pattern.to,
        import: FIX_SUGGESTIONS.apiErrors.import,
      })
    }
  })

  // 检查UI文本
  FIX_SUGGESTIONS.uiTexts.patterns.forEach(pattern => {
    if (content.includes(pattern.from)) {
      issues.push({
        type: 'uiText',
        pattern: pattern.from,
        suggestion: pattern.to,
        import: FIX_SUGGESTIONS.uiTexts.import,
      })
    }
  })

  // 检查魔法数字
  FIX_SUGGESTIONS.magicNumbers.patterns.forEach(pattern => {
    if (pattern.from instanceof RegExp) {
      if (pattern.from.test(content)) {
        issues.push({
          type: 'magicNumber',
          pattern: pattern.from.toString(),
          suggestion: pattern.to,
          import: FIX_SUGGESTIONS.magicNumbers.import,
        })
      }
    } else if (content.includes(pattern.from)) {
      issues.push({
        type: 'magicNumber',
        pattern: pattern.from,
        suggestion: pattern.to,
        import: FIX_SUGGESTIONS.magicNumbers.import,
      })
    }
  })

  // 检查颜色值
  FIX_SUGGESTIONS.colors.patterns.forEach(pattern => {
    if (pattern.from instanceof RegExp) {
      if (pattern.from.test(content)) {
        issues.push({
          type: 'color',
          pattern: pattern.from.toString(),
          suggestion: pattern.to,
          import: FIX_SUGGESTIONS.colors.import,
        })
      }
    } else if (content.includes(pattern.from)) {
      issues.push({
        type: 'color',
        pattern: pattern.from,
        suggestion: pattern.to,
        import: FIX_SUGGESTIONS.colors.import,
      })
    }
  })

  return issues
}

// 自动修复文件
function autoFixFile(filePath, issues) {
  let content = fs.readFileSync(filePath, 'utf8')
  const imports = new Set()
  let hasChanges = false

  issues.forEach(issue => {
    const oldContent = content

    if (issue.pattern instanceof RegExp || issue.pattern.startsWith('/')) {
      // 正则表达式替换
      const regex =
        issue.pattern instanceof RegExp
          ? issue.pattern
          : new RegExp(issue.pattern.slice(1, -1))
      content = content.replace(regex, issue.suggestion)
    } else {
      // 字符串替换
      content = content.replace(
        new RegExp(escapeRegExp(issue.pattern), 'g'),
        issue.suggestion
      )
    }

    if (content !== oldContent) {
      hasChanges = true
      imports.add(issue.import)
    }
  })

  // 添加必要的导入
  if (hasChanges && imports.size > 0) {
    const importLines = Array.from(imports)
    const existingImports = content.match(/^import.*$/gm) || []
    const lastImportIndex =
      existingImports.length > 0
        ? content.lastIndexOf(existingImports[existingImports.length - 1]) +
          existingImports[existingImports.length - 1].length
        : 0

    const newImports = importLines
      .filter(imp => !content.includes(imp))
      .join('\n')
    if (newImports) {
      content =
        content.slice(0, lastImportIndex) +
        '\n' +
        newImports +
        content.slice(lastImportIndex)
    }
  }

  if (hasChanges) {
    fs.writeFileSync(filePath, content, 'utf8')
  }

  return hasChanges
}

// 转义正则表达式特殊字符
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 主函数
async function main() {
  console.log(colorize('🔧 硬编码修复助手', 'cyan'))
  console.log(
    colorize(
      '============================================================',
      'cyan'
    )
  )

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const question = prompt =>
    new Promise(resolve => rl.question(prompt, resolve))

  try {
    // 获取要扫描的目录
    const scanDir =
      (await question('请输入要扫描的目录 (默认: src/): ')) || 'src/'

    if (!fs.existsSync(scanDir)) {
      console.log(colorize('❌ 目录不存在', 'red'))
      return
    }

    console.log(colorize(`\n📁 扫描目录: ${scanDir}`, 'blue'))

    const files = getFileList(scanDir)
    console.log(colorize(`📄 找到 ${files.length} 个文件`, 'blue'))

    let totalIssues = 0
    let fixableFiles = []

    // 分析所有文件
    for (const file of files) {
      const issues = analyzeFile(file)
      if (issues.length > 0) {
        totalIssues += issues.length
        fixableFiles.push({ file, issues })
      }
    }

    if (totalIssues === 0) {
      console.log(colorize('\n✅ 没有发现可自动修复的硬编码问题', 'green'))
      return
    }

    console.log(
      colorize(`\n🔍 发现 ${totalIssues} 个可修复的硬编码问题`, 'yellow')
    )
    console.log(colorize(`📁 涉及 ${fixableFiles.length} 个文件`, 'yellow'))

    // 显示问题统计
    const typeStats = {}
    fixableFiles.forEach(({ issues }) => {
      issues.forEach(issue => {
        typeStats[issue.type] = (typeStats[issue.type] || 0) + 1
      })
    })

    console.log(colorize('\n📊 问题类型统计:', 'cyan'))
    Object.entries(typeStats).forEach(([type, count]) => {
      const typeNames = {
        apiError: 'API错误消息',
        uiText: 'UI文本',
        magicNumber: '魔法数字',
        color: '硬编码颜色',
      }
      console.log(`  ${typeNames[type] || type}: ${count} 处`)
    })

    // 询问是否自动修复
    const shouldFix = await question('\n是否自动修复这些问题？(y/N): ')

    if (shouldFix.toLowerCase() === 'y' || shouldFix.toLowerCase() === 'yes') {
      console.log(colorize('\n🔧 开始自动修复...', 'blue'))

      let fixedFiles = 0
      for (const { file, issues } of fixableFiles) {
        const hasChanges = autoFixFile(file, issues)
        if (hasChanges) {
          fixedFiles++
          console.log(colorize(`✅ 修复: ${file}`, 'green'))
        }
      }

      console.log(colorize(`\n🎉 修复完成！`, 'green'))
      console.log(colorize(`📁 修复了 ${fixedFiles} 个文件`, 'green'))
      console.log(colorize(`🔧 修复了 ${totalIssues} 个问题`, 'green'))

      console.log(colorize('\n📋 后续建议:', 'cyan'))
      console.log('1. 运行测试确保功能正常')
      console.log('2. 检查导入语句是否正确')
      console.log('3. 运行 check-hardcode-issues.js 验证修复效果')
    } else {
      console.log(colorize('\n❌ 取消自动修复', 'yellow'))
    }
  } catch (error) {
    console.error(colorize(`❌ 错误: ${error.message}`, 'red'))
  } finally {
    rl.close()
  }
}

// 运行主函数
if (require.main === module) {
  main()
}

module.exports = {
  analyzeFile,
  autoFixFile,
  getFileList,
  FIX_SUGGESTIONS,
}
