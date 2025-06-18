#!/usr/bin/env node

/**
 * TypeScript 类型检查脚本
 * 提供详细的类型检查报告和错误统计
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// 颜色输出工具
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`
}

// 检查 TypeScript 配置
function checkTSConfig() {
  console.log(colorize('\n📋 检查 TypeScript 配置...', 'blue'))

  const configs = ['tsconfig.json', 'tsconfig.strict.json']

  configs.forEach(config => {
    if (fs.existsSync(config)) {
      console.log(colorize(`✅ ${config} 存在`, 'green'))

      try {
        const content = JSON.parse(fs.readFileSync(config, 'utf8'))
        const compilerOptions = content.compilerOptions || {}

        // 检查严格模式选项
        const strictOptions = [
          'strict',
          'noImplicitAny',
          'noImplicitReturns',
          'noImplicitThis',
          'noUnusedLocals',
          'noUnusedParameters',
          'exactOptionalPropertyTypes',
          'noUncheckedIndexedAccess',
          'noImplicitOverride',
        ]

        console.log(`   严格模式选项:`)
        strictOptions.forEach(option => {
          const value = compilerOptions[option]
          const status = value === true ? '✅' : value === false ? '❌' : '⚠️ '
          const color =
            value === true ? 'green' : value === false ? 'red' : 'yellow'
          console.log(`     ${status} ${colorize(option, color)}: ${value}`)
        })
      } catch (error) {
        console.log(colorize(`❌ ${config} 格式错误: ${error.message}`, 'red'))
      }
    } else {
      console.log(colorize(`❌ ${config} 不存在`, 'red'))
    }
  })
}

// 运行类型检查
function runTypeCheck() {
  console.log(colorize('\n🔍 运行 TypeScript 类型检查...', 'blue'))

  try {
    // 使用 tsc --noEmit 进行类型检查
    const output = execSync('npx tsc --noEmit --pretty', {
      encoding: 'utf8',
      stdio: 'pipe',
    })

    console.log(colorize('✅ 类型检查通过！', 'green'))
    return { success: true, errors: [] }
  } catch (error) {
    console.log(colorize('❌ 发现类型错误:', 'red'))
    console.log(error.stdout)

    // 解析错误信息
    const errors = parseTypeScriptErrors(error.stdout)
    return { success: false, errors }
  }
}

// 解析 TypeScript 错误信息
function parseTypeScriptErrors(output) {
  const lines = output.split('\n')
  const errors = []

  lines.forEach(line => {
    // 匹配错误格式: file(line,col): error TS####: message
    const match = line.match(/^(.+)\((\d+),(\d+)\): error (TS\d+): (.+)$/)
    if (match) {
      errors.push({
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        code: match[4],
        message: match[5],
      })
    }
  })

  return errors
}

// 统计错误类型
function analyzeErrors(errors) {
  console.log(colorize('\n📊 错误分析:', 'blue'))

  if (errors.length === 0) {
    console.log(colorize('🎉 没有发现类型错误！', 'green'))
    return
  }

  // 按错误代码分组
  const errorsByCode = {}
  const errorsByFile = {}

  errors.forEach(error => {
    // 按错误代码统计
    if (!errorsByCode[error.code]) {
      errorsByCode[error.code] = []
    }
    errorsByCode[error.code].push(error)

    // 按文件统计
    if (!errorsByFile[error.file]) {
      errorsByFile[error.file] = []
    }
    errorsByFile[error.file].push(error)
  })

  console.log(`\n总计: ${colorize(errors.length, 'red')} 个错误`)

  // 显示最常见的错误类型
  console.log(colorize('\n🔥 最常见的错误类型:', 'yellow'))
  const sortedCodes = Object.entries(errorsByCode)
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 5)

  sortedCodes.forEach(([code, codeErrors]) => {
    console.log(`  ${colorize(code, 'red')}: ${codeErrors.length} 次`)
    console.log(`    示例: ${codeErrors[0].message}`)
  })

  // 显示错误最多的文件
  console.log(colorize('\n📁 错误最多的文件:', 'yellow'))
  const sortedFiles = Object.entries(errorsByFile)
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 5)

  sortedFiles.forEach(([file, fileErrors]) => {
    const relativePath = path.relative(process.cwd(), file)
    console.log(
      `  ${colorize(relativePath, 'red')}: ${fileErrors.length} 个错误`
    )
  })
}

// 检查 any 类型使用
function checkAnyUsage() {
  console.log(colorize('\n🔍 检查 any 类型使用...', 'blue'))

  try {
    // 搜索 any 类型使用
    const output = execSync(
      'find src -name "*.ts" -o -name "*.tsx" | xargs grep -n ": any\\|<any>\\|any\\[\\]" || true',
      {
        encoding: 'utf8',
      }
    )

    if (output.trim()) {
      const lines = output.trim().split('\n')
      console.log(colorize(`❌ 发现 ${lines.length} 处 any 类型使用:`, 'red'))

      lines.slice(0, 10).forEach(line => {
        console.log(`  ${line}`)
      })

      if (lines.length > 10) {
        console.log(colorize(`  ... 还有 ${lines.length - 10} 处`, 'yellow'))
      }
    } else {
      console.log(colorize('✅ 没有发现 any 类型使用！', 'green'))
    }
  } catch (error) {
    console.log(colorize('⚠️  检查 any 类型使用时出错', 'yellow'))
  }
}

// 生成报告
function generateReport(typeCheckResult) {
  const report = {
    timestamp: new Date().toISOString(),
    success: typeCheckResult.success,
    errorCount: typeCheckResult.errors.length,
    errors: typeCheckResult.errors,
  }

  const reportPath = 'type-check-report.json'
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  console.log(colorize(`\n📄 报告已保存到: ${reportPath}`, 'cyan'))
}

// 主函数
function main() {
  console.log(colorize('🚀 TypeScript 类型检查工具', 'bright'))
  console.log(colorize('================================', 'bright'))

  // 检查配置
  checkTSConfig()

  // 运行类型检查
  const typeCheckResult = runTypeCheck()

  // 分析错误
  analyzeErrors(typeCheckResult.errors)

  // 检查 any 类型使用
  checkAnyUsage()

  // 生成报告
  generateReport(typeCheckResult)

  // 退出码
  if (typeCheckResult.success) {
    console.log(colorize('\n🎉 类型检查完成，没有错误！', 'green'))
    process.exit(0)
  } else {
    console.log(colorize('\n❌ 类型检查失败，请修复错误后重试', 'red'))
    process.exit(1)
  }
}

// 运行脚本
if (require.main === module) {
  main()
}

module.exports = {
  checkTSConfig,
  runTypeCheck,
  analyzeErrors,
  checkAnyUsage,
  generateReport,
}
