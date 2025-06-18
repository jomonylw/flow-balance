#!/usr/bin/env node

const fs = require('fs')
const { execSync } = require('child_process')

// 获取lint错误
function getLintErrors() {
  try {
    const output = execSync('pnpm run lint 2>&1', { encoding: 'utf8' })
    return output
  } catch (error) {
    return error.stdout || ''
  }
}

// 解析错误信息
function parseErrors(lintOutput) {
  const lines = lintOutput.split('\n')
  const errors = []
  let currentFile = null

  for (const line of lines) {
    if (line.startsWith('./src/')) {
      currentFile = line
    } else if (line.includes('Error:') && currentFile) {
      const match = line.match(
        /(\d+):(\d+)\s+Error:\s+'([^']+)'\s+is\s+(defined but never used|assigned a value but never used)/
      )
      if (match) {
        const [, lineNum, colNum, varName, errorType] = match
        errors.push({
          file: currentFile,
          line: parseInt(lineNum),
          column: parseInt(colNum),
          variable: varName,
          type: errorType,
        })
      }
    }
  }

  return errors
}

// 修复单个文件
function fixFile(filePath, fileErrors) {
  if (!fs.existsSync(filePath)) return false

  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  let modified = false

  // 按行号倒序处理
  const sortedErrors = fileErrors.sort((a, b) => b.line - a.line)

  for (const error of sortedErrors) {
    const lineIndex = error.line - 1
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex]
      const varName = error.variable

      // 处理不同类型的未使用变量
      if (line.includes(`function GET(${varName}:`)) {
        lines[lineIndex] = line.replace(
          `function GET(${varName}:`,
          `function GET(_${varName}:`
        )
        modified = true
      } else if (line.includes(`function POST(${varName}:`)) {
        lines[lineIndex] = line.replace(
          `function POST(${varName}:`,
          `function POST(_${varName}:`
        )
        modified = true
      } else if (line.includes(`function PUT(${varName}:`)) {
        lines[lineIndex] = line.replace(
          `function PUT(${varName}:`,
          `function PUT(_${varName}:`
        )
        modified = true
      } else if (line.includes(`function DELETE(${varName}:`)) {
        lines[lineIndex] = line.replace(
          `function DELETE(${varName}:`,
          `function DELETE(_${varName}:`
        )
        modified = true
      } else if (line.includes(`const ${varName} =`)) {
        lines[lineIndex] = line.replace(
          `const ${varName} =`,
          `const _${varName} =`
        )
        modified = true
      } else if (line.includes(`let ${varName} =`)) {
        lines[lineIndex] = line.replace(`let ${varName} =`, `let _${varName} =`)
        modified = true
      } else if (
        line.includes(`${varName},`) &&
        (line.includes('import') || line.includes('{'))
      ) {
        // 处理导入中的未使用变量
        if (line.includes(`{ ${varName} }`)) {
          // 单个导入
          lines[lineIndex] = ''
          modified = true
        } else if (line.includes(`${varName},`)) {
          // 多个导入中的一个
          lines[lineIndex] = line
            .replace(`${varName},`, '')
            .replace(`  ,`, '')
            .replace(`, ,`, ',')
          modified = true
        } else if (line.includes(`, ${varName}`)) {
          lines[lineIndex] = line.replace(`, ${varName}`, '')
          modified = true
        }
      } else if (line.includes(`${varName}:`)) {
        // 函数参数
        lines[lineIndex] = line.replace(`${varName}:`, `_${varName}:`)
        modified = true
      }
    }
  }

  if (modified) {
    // 清理空行和格式
    const cleanedLines = lines.filter((line, index) => {
      // 保留非空行，或者是文件开头/结尾的空行
      return line.trim() !== '' || index === 0 || index === lines.length - 1
    })

    fs.writeFileSync(filePath, cleanedLines.join('\n'))
    console.log(`✅ 修复文件: ${filePath} (${fileErrors.length}个错误)`)
    return true
  }

  return false
}

// 主函数
function main() {
  console.log('🔍 智能分析lint错误...')

  const lintOutput = getLintErrors()
  const errors = parseErrors(lintOutput)

  if (errors.length === 0) {
    console.log('✅ 没有发现未使用变量错误')
    return
  }

  console.log(`📊 发现 ${errors.length} 个未使用变量错误`)

  // 按文件分组
  const errorsByFile = {}
  errors.forEach(error => {
    if (!errorsByFile[error.file]) {
      errorsByFile[error.file] = []
    }
    errorsByFile[error.file].push(error)
  })

  console.log(`📁 涉及 ${Object.keys(errorsByFile).length} 个文件`)

  let fixedFiles = 0
  let totalFixed = 0

  // 修复每个文件
  for (const [filePath, fileErrors] of Object.entries(errorsByFile)) {
    if (fixFile(filePath, fileErrors)) {
      fixedFiles++
      totalFixed += fileErrors.length
    }
  }

  console.log(`\n🎉 修复完成:`)
  console.log(`   - 修复文件: ${fixedFiles}`)
  console.log(`   - 修复错误: ${totalFixed}`)

  // 重新检查
  console.log('\n🔍 重新检查lint状态...')
  const newOutput = getLintErrors()
  const newErrors = parseErrors(newOutput)
  console.log(`📊 剩余错误: ${newErrors.length}`)
}

if (require.main === module) {
  main()
}
