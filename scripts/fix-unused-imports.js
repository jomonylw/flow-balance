#!/usr/bin/env node

const fs = require('fs')
const { execSync } = require('child_process')

// 获取所有未使用导入的错误
function getUnusedImportErrors() {
  try {
    const output = execSync('pnpm run lint 2>&1', { encoding: 'utf8' })
    const lines = output.split('\n')
    const errors = []
    let currentFile = null

    for (const line of lines) {
      if (line.startsWith('./src/')) {
        currentFile = line
      } else if (
        line.includes('Error:') &&
        line.includes('is defined but never used') &&
        currentFile
      ) {
        const match = line.match(
          /(\d+):(\d+)\s+Error:\s+'([^']+)'\s+is defined but never used/
        )
        if (match) {
          const [, lineNum, colNum, varName] = match
          errors.push({
            file: currentFile,
            line: parseInt(lineNum),
            column: parseInt(colNum),
            variable: varName,
          })
        }
      }
    }

    return errors
  } catch (error) {
    return []
  }
}

// 修复单个文件的未使用导入
function fixUnusedImportsInFile(filePath, fileErrors) {
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

      // 处理导入语句
      if (line.includes('import') && line.includes(varName)) {
        // 单个导入: import { VarName } from 'module'
        if (line.match(new RegExp(`import\\s*{\\s*${varName}\\s*}\\s*from`))) {
          lines[lineIndex] = ''
          modified = true
        }
        // 多个导入中的一个: import { VarName, Other } from 'module'
        else if (line.includes(`${varName},`)) {
          lines[lineIndex] = line.replace(new RegExp(`\\s*${varName}\\s*,`), '')
          modified = true
        } else if (line.includes(`, ${varName}`)) {
          lines[lineIndex] = line.replace(new RegExp(`,\\s*${varName}`), '')
          modified = true
        }
        // 处理多行导入的情况
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
    // 清理空行和格式问题
    const cleanedLines = lines
      .map(line => {
        // 修复导入语句中的格式问题
        return line
          .replace(/{\s*,/g, '{') // 修复 { , other
          .replace(/,\s*}/g, '}') // 修复 other, }
          .replace(/,\s*,/g, ',') // 修复 other, , another
          .replace(/{\s*}/g, '{}') // 修复 { }
      })
      .filter((line, index) => {
        // 删除空的导入行和多余的空行
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
    console.log(`✅ 修复文件: ${filePath} (${fileErrors.length}个未使用导入)`)
    return true
  }

  return false
}

// 主函数
function main() {
  console.log('🔍 分析未使用导入错误...')

  const errors = getUnusedImportErrors()

  if (errors.length === 0) {
    console.log('✅ 没有发现未使用导入错误')
    return
  }

  console.log(`📊 发现 ${errors.length} 个未使用导入错误`)

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
    if (fixUnusedImportsInFile(filePath, fileErrors)) {
      fixedFiles++
      totalFixed += fileErrors.length
    }
  }

  console.log(`\n🎉 修复完成:`)
  console.log(`   - 修复文件: ${fixedFiles}`)
  console.log(`   - 修复错误: ${totalFixed}`)

  // 重新检查
  console.log('\n🔍 重新检查lint状态...')
  const newErrors = getUnusedImportErrors()
  console.log(`📊 剩余未使用导入错误: ${newErrors.length}`)

  // 显示总体错误数量
  try {
    const totalOutput = execSync('pnpm run lint 2>&1 | grep "Error:" | wc -l', {
      encoding: 'utf8',
    })
    console.log(`📊 总错误数量: ${totalOutput.trim()}`)
  } catch (error) {
    console.log('无法获取总错误数量')
  }
}

if (require.main === module) {
  main()
}
