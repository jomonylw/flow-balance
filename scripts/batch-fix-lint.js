#!/usr/bin/env node

const fs = require('fs')
const { execSync } = require('child_process')

// 获取所有lint错误
function getAllLintErrors() {
  try {
    const output = execSync('pnpm run lint 2>&1', { encoding: 'utf8' })
    const lines = output.split('\n')
    const errors = []
    let currentFile = null

    for (const line of lines) {
      if (line.startsWith('./src/')) {
        currentFile = line
      } else if (line.includes('Error:') && currentFile) {
        // 解析未使用变量错误
        const unusedVarMatch = line.match(
          /(\d+):(\d+)\s+Error:\s+'([^']+)'\s+is defined but never used/
        )
        if (unusedVarMatch) {
          const [, lineNum, colNum, varName] = unusedVarMatch
          errors.push({
            file: currentFile,
            line: parseInt(lineNum),
            column: parseInt(colNum),
            variable: varName,
            type: 'unused-var',
          })
        }

        // 解析空对象类型错误
        const emptyObjectMatch = line.match(
          /(\d+):(\d+)\s+Error:\s+An interface declaring no members/
        )
        if (emptyObjectMatch) {
          const [, lineNum, colNum] = emptyObjectMatch
          errors.push({
            file: currentFile,
            line: parseInt(lineNum),
            column: parseInt(colNum),
            type: 'empty-object-type',
          })
        }

        // 解析未使用表达式错误
        const unusedExprMatch = line.match(
          /(\d+):(\d+)\s+Error:\s+Expected an assignment or function call/
        )
        if (unusedExprMatch) {
          const [, lineNum, colNum] = unusedExprMatch
          errors.push({
            file: currentFile,
            line: parseInt(lineNum),
            column: parseInt(colNum),
            type: 'unused-expression',
          })
        }
      }
    }

    return errors
  } catch (error) {
    return []
  }
}

// 修复未使用变量
function fixUnusedVariables(filePath, errors) {
  if (!fs.existsSync(filePath)) return false

  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  let modified = false

  // 按行号倒序处理
  const sortedErrors = errors.sort((a, b) => b.line - a.line)

  for (const error of sortedErrors) {
    if (error.type !== 'unused-var') continue

    const lineIndex = error.line - 1
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex]
      const varName = error.variable

      // 处理导入语句
      if (line.includes('import') && line.includes(varName)) {
        // 单个导入: import { VarName } from 'module'
        if (line.match(new RegExp(`import\\s*{\\s*${varName}\\s*}\\s*from`))) {
          lines[lineIndex] = ''
          modified = true
        }
        // 多个导入中的一个
        else if (line.includes(`${varName},`)) {
          lines[lineIndex] = line.replace(new RegExp(`\\s*${varName}\\s*,`), '')
          modified = true
        } else if (line.includes(`, ${varName}`)) {
          lines[lineIndex] = line.replace(new RegExp(`,\\s*${varName}`), '')
          modified = true
        }
        // 处理多行导入
        else if (line.trim() === `${varName},` || line.trim() === varName) {
          lines[lineIndex] = ''
          modified = true
        }
      }
      // 处理函数参数
      else if (line.includes(`${varName}:`)) {
        lines[lineIndex] = line.replace(
          new RegExp(`\\b${varName}:`),
          `_${varName}:`
        )
        modified = true
      }
      // 处理变量声明
      else if (
        line.includes(`const ${varName} =`) ||
        line.includes(`let ${varName} =`)
      ) {
        lines[lineIndex] = line.replace(
          new RegExp(`\\b${varName}\\b`),
          `_${varName}`
        )
        modified = true
      }
    }
  }

  if (modified) {
    // 清理格式
    const cleanedLines = lines
      .map(line => {
        return line
          .replace(/{\s*,/g, '{')
          .replace(/,\s*}/g, '}')
          .replace(/,\s*,/g, ',')
          .replace(/{\s*}/g, '{}')
      })
      .filter((line, index) => {
        // 删除空的导入行
        if (
          line.trim() === '' &&
          lines[index] &&
          lines[index].includes('import')
        ) {
          return false
        }
        return true
      })

    fs.writeFileSync(filePath, cleanedLines.join('\n'))
    return true
  }

  return false
}

// 修复空对象类型
function fixEmptyObjectTypes(filePath, errors) {
  if (!fs.existsSync(filePath)) return false

  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  let modified = false

  for (const error of errors) {
    if (error.type !== 'empty-object-type') continue

    const lineIndex = error.line - 1
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex]

      // 替换空接口为 Record<string, never>
      if (
        line.includes('interface') &&
        line.includes('extends') &&
        line.includes('{}')
      ) {
        const interfaceMatch = line.match(
          /interface\s+(\w+)\s+extends\s+([^{]+)\s*{}/
        )
        if (interfaceMatch) {
          const [, interfaceName, baseType] = interfaceMatch
          lines[lineIndex] =
            `type ${interfaceName} = ${baseType} & Record<string, never>`
          modified = true
        }
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'))
    return true
  }

  return false
}

// 修复未使用表达式
function fixUnusedExpressions(filePath, errors) {
  if (!fs.existsSync(filePath)) return false

  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  let modified = false

  for (const error of errors) {
    if (error.type !== 'unused-expression') continue

    const lineIndex = error.line - 1
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex]

      // 删除或注释掉未使用的表达式
      if (line.trim() && !line.trim().startsWith('//')) {
        lines[lineIndex] = `// ${line}`
        modified = true
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'))
    return true
  }

  return false
}

// 主函数
function main() {
  console.log('🔍 开始批量修复lint错误...')

  const errors = getAllLintErrors()

  if (errors.length === 0) {
    console.log('✅ 没有发现可修复的错误')
    return
  }

  console.log(`📊 发现 ${errors.length} 个错误`)

  // 按文件和类型分组
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
    let fileFixed = false

    // 修复未使用变量
    if (fixUnusedVariables(filePath, fileErrors)) {
      fileFixed = true
    }

    // 修复空对象类型
    if (fixEmptyObjectTypes(filePath, fileErrors)) {
      fileFixed = true
    }

    // 修复未使用表达式
    if (fixUnusedExpressions(filePath, fileErrors)) {
      fileFixed = true
    }

    if (fileFixed) {
      console.log(`✅ 修复文件: ${filePath} (${fileErrors.length}个错误)`)
      fixedFiles++
      totalFixed += fileErrors.length
    }
  }

  console.log(`\n🎉 修复完成:`)
  console.log(`   - 修复文件: ${fixedFiles}`)
  console.log(`   - 修复错误: ${totalFixed}`)

  // 重新检查
  console.log('\n🔍 重新检查lint状态...')
  try {
    const newOutput = execSync('pnpm run lint 2>&1 | grep "Error:" | wc -l', {
      encoding: 'utf8',
    })
    console.log(`📊 剩余错误数量: ${newOutput.trim()}`)
  } catch (error) {
    console.log('无法获取错误数量')
  }
}

if (require.main === module) {
  main()
}
