#!/usr/bin/env node

/**
 * 检查重复的 TypeScript interface/type 定义
 * 专门用于代码质量检查清单
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

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
function getAllTSFiles(dir) {
  const files = []
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir)
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        // 跳过 node_modules 和 .next 等目录
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

// 分析文件中的类型定义
function analyzeTypeDefinitions(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const definitions = []

  // 匹配 interface 定义
  const interfaceRegex = /interface\s+(\w+)\s*{/g
  let match
  while ((match = interfaceRegex.exec(content)) !== null) {
    const typeName = match[1]
    const lineNumber = content.substring(0, match.index).split('\n').length
    definitions.push({
      type: 'interface',
      name: typeName,
      line: lineNumber,
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
    })
  }

  return definitions
}

// 主检查函数
function checkDuplicateTypes() {
  console.log(colorize('🔍 检查重复的 TypeScript 类型定义', 'blue'))
  console.log('=' .repeat(50))

  const files = getAllTSFiles('src')
  const typeDefinitions = new Map() // typeName -> [{ file, line, type }]
  
  console.log(colorize(`📁 扫描 ${files.length} 个文件...`, 'cyan'))

  // 分析每个文件
  files.forEach(file => {
    const definitions = analyzeTypeDefinitions(file)
    
    definitions.forEach(def => {
      if (!typeDefinitions.has(def.name)) {
        typeDefinitions.set(def.name, [])
      }
      typeDefinitions.get(def.name).push({
        file,
        line: def.line,
        type: def.type,
      })
    })
  })

  // 查找重复定义
  const duplicates = []
  typeDefinitions.forEach((definitions, typeName) => {
    if (definitions.length > 1) {
      duplicates.push({ typeName, definitions })
    }
  })

  console.log('\n' + colorize('📊 检查结果:', 'yellow'))
  console.log('=' .repeat(30))

  if (duplicates.length === 0) {
    console.log(colorize('✅ 没有发现重复的类型定义！', 'green'))
    return true
  } else {
    console.log(colorize(`❌ 发现 ${duplicates.length} 个重复定义的类型:`, 'red'))
    
    duplicates.forEach(({ typeName, definitions }) => {
      console.log(colorize(`\n🔸 ${typeName} (${definitions.length} 处定义):`, 'magenta'))
      definitions.forEach(def => {
        const relativePath = path.relative(process.cwd(), def.file)
        console.log(`  📄 ${relativePath}:${def.line} (${def.type})`)
      })
    })

    console.log(colorize('\n💡 建议修复方案:', 'yellow'))
    console.log('1. 将核心业务类型统一定义在 src/types/core/index.ts')
    console.log('2. 组件中使用 import type { TypeName } from "@/types/core"')
    console.log('3. 删除重复的本地类型定义')
    console.log('4. 运行 node scripts/analyze-type-usage.js 获取详细分析')
    
    return false
  }
}

// 检查特定的问题类型
function checkSpecificIssues() {
  console.log(colorize('\n🎯 检查特定问题类型:', 'blue'))
  console.log('=' .repeat(30))

  const issues = []

  // 检查组件中的业务类型定义
  try {
    const componentTypes = execSync(
      'find src/components -name "*.tsx" -o -name "*.ts" | xargs grep -l "interface.*Account\\|interface.*Transaction\\|interface.*Category\\|interface.*User" || true',
      { encoding: 'utf8' }
    ).trim()

    if (componentTypes) {
      issues.push({
        type: '组件中定义业务类型',
        files: componentTypes.split('\n').filter(f => f.trim()),
        suggestion: '应该从 @/types/core 导入业务类型，而不是在组件中重新定义'
      })
    }
  } catch (error) {
    // 忽略错误
  }

  // 检查 PrismaTransaction 重复定义
  try {
    const prismaTypes = execSync(
      'find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "type.*PrismaTransaction\\|interface.*PrismaTransaction" || true',
      { encoding: 'utf8' }
    ).trim()

    if (prismaTypes) {
      const files = prismaTypes.split('\n').filter(f => f.trim())
      if (files.length > 1) {
        issues.push({
          type: 'PrismaTransaction 重复定义',
          files,
          suggestion: '应该在一个地方定义 PrismaTransaction 类型，其他地方导入使用'
        })
      }
    }
  } catch (error) {
    // 忽略错误
  }

  if (issues.length === 0) {
    console.log(colorize('✅ 没有发现特定问题！', 'green'))
  } else {
    issues.forEach((issue, index) => {
      console.log(colorize(`\n${index + 1}. ${issue.type}:`, 'red'))
      issue.files.forEach(file => {
        console.log(`   📄 ${file}`)
      })
      console.log(colorize(`   💡 ${issue.suggestion}`, 'yellow'))
    })
  }

  return issues.length === 0
}

// 主函数
function main() {
  const duplicateCheck = checkDuplicateTypes()
  const specificCheck = checkSpecificIssues()
  
  console.log('\n' + '=' .repeat(50))
  
  if (duplicateCheck && specificCheck) {
    console.log(colorize('🎉 所有类型定义检查通过！', 'green'))
    process.exit(0)
  } else {
    console.log(colorize('❌ 发现类型定义问题，请修复后重新检查', 'red'))
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
}

module.exports = {
  checkDuplicateTypes,
  checkSpecificIssues,
}
