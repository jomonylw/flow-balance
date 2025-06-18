#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// 获取特定类型的错误文件
function getErrorFiles(errorType) {
  try {
    const result = execSync('pnpm lint 2>&1', { encoding: 'utf8' })
    const lines = result.split('\n')
    const files = new Map()

    lines.forEach(line => {
      if (line.includes(errorType)) {
        const match = line.match(/^\.\/(.+?):(\d+):(\d+)/)
        if (match) {
          const [, filePath, lineNum, colNum] = match
          if (!files.has(filePath)) {
            files.set(filePath, [])
          }
          files.get(filePath).push({
            line: parseInt(lineNum),
            col: parseInt(colNum),
            content: line,
          })
        }
      }
    })

    return files
  } catch (error) {
    console.error('Error getting error files:', error.message)
    return new Map()
  }
}

// 修复Slider组件的jsx属性问题
function fixSliderJsx() {
  const filePath = 'src/components/ui/forms/Slider.tsx'
  try {
    let content = fs.readFileSync(filePath, 'utf8')

    // 修复jsx属性
    content = content.replace(/<style jsx>/g, '<style jsx={true}>')

    fs.writeFileSync(filePath, content)
    console.log('✓ Fixed jsx property in Slider.tsx')
    return true
  } catch (error) {
    console.error('Error fixing Slider.tsx:', error.message)
    return false
  }
}

// 批量删除简单的调试console.log
function removeDebugConsole() {
  const consoleFiles = getErrorFiles('no-console')
  let fixedCount = 0

  consoleFiles.forEach((errors, filePath) => {
    try {
      let content = fs.readFileSync(filePath, 'utf8')
      const lines = content.split('\n')
      let modified = false

      // 从后往前处理，避免行号变化
      errors
        .sort((a, b) => b.line - a.line)
        .forEach(error => {
          const lineIndex = error.line - 1
          const line = lines[lineIndex]

          // 只删除简单的调试console.log
          if (
            line &&
            line.includes('console.log(') &&
            (line.includes('debug') ||
              line.includes('Debug') ||
              line.includes('开始') ||
              line.includes('结束') ||
              line.includes('generated') ||
              line.includes('count') ||
              line.includes('found') ||
              line.includes('Chart') ||
              line.includes('data:') ||
              line.includes('dates:') ||
              line.includes('amounts:') ||
              line.includes('balances:'))
          ) {
            lines[lineIndex] = ''
            modified = true
          }
        })

      if (modified) {
        // 清理多余的空行
        content = lines.join('\n').replace(/\n\s*\n\s*\n/g, '\n\n')
        fs.writeFileSync(filePath, content)
        console.log(`✓ Removed debug console.log from: ${filePath}`)
        fixedCount++
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message)
    }
  })

  return fixedCount
}

// 修复简单的行长度问题
function fixLineLength() {
  const maxLenFiles = getErrorFiles('max-len')
  let fixedCount = 0

  maxLenFiles.forEach((errors, filePath) => {
    try {
      let content = fs.readFileSync(filePath, 'utf8')
      const lines = content.split('\n')
      let modified = false

      errors.forEach(error => {
        const lineIndex = error.line - 1
        const line = lines[lineIndex]

        if (line && line.length > 100) {
          // 简单的className拆分
          if (line.includes('className=') && line.length < 150) {
            const newLine = line.replace(
              /(\s+)(className=['"`][^'"`]{50,}['"`])/,
              '\n$1$2'
            )
            if (newLine !== line) {
              lines[lineIndex] = newLine
              modified = true
            }
          }
        }
      })

      if (modified) {
        content = lines.join('\n')
        fs.writeFileSync(filePath, content)
        console.log(`✓ Fixed line length in: ${filePath}`)
        fixedCount++
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message)
    }
  })

  return fixedCount
}

// 主函数
function main() {
  console.log('🎯 Starting targeted lint fixes...\n')

  // 获取初始统计
  const beforeCount = parseInt(
    execSync('pnpm lint 2>&1 | grep -E "(Warning|Error):" | wc -l', {
      encoding: 'utf8',
    }).trim()
  )
  console.log(`📊 Initial issues: ${beforeCount}\n`)

  let totalFixed = 0

  // 1. 修复Slider组件的jsx属性
  console.log('🔧 Fixing jsx property...')
  if (fixSliderJsx()) {
    totalFixed++
  }

  // 2. 删除调试console.log
  console.log('\n🔧 Removing debug console.log statements...')
  const consoleFixed = removeDebugConsole()
  totalFixed += consoleFixed

  // 3. 修复简单的行长度问题
  console.log('\n🔧 Fixing line length issues...')
  const lineLengthFixed = fixLineLength()
  totalFixed += lineLengthFixed

  // 检查结果
  console.log('\n📊 Checking results...')
  const afterCount = parseInt(
    execSync('pnpm lint 2>&1 | grep -E "(Warning|Error):" | wc -l', {
      encoding: 'utf8',
    }).trim()
  )

  console.log(`\n✅ Results:`)
  console.log(`  Files processed: ${totalFixed}`)
  console.log(`  Issues before: ${beforeCount}`)
  console.log(`  Issues after: ${afterCount}`)
  console.log(`  Issues fixed: ${beforeCount - afterCount}`)

  if (afterCount < beforeCount) {
    console.log(
      `\n🎉 Successfully reduced lint issues by ${beforeCount - afterCount}!`
    )
  }
}

if (require.main === module) {
  main()
}

module.exports = { fixSliderJsx, removeDebugConsole, fixLineLength }
