#!/usr/bin/env node

/**
 * Flow Balance 废弃类型定义清理脚本
 * 清理与已删除组件相关的类型定义
 */

import fs from 'fs'

console.warn('🧹 Flow Balance 废弃类型定义清理脚本')
console.warn('=====================================')
console.warn('')

// 要清理的类型定义
const TYPES_TO_REMOVE = [
  'NetWorthCardProps',
  'AccountBalancesCardProps',
  'QuickTransactionButtonProps',
]

// 类型定义文件路径
const TYPES_FILE = 'src/types/components/index.ts'

// 检查文件是否存在
if (!fs.existsSync(TYPES_FILE)) {
  console.error(`❌ 错误: 类型文件不存在 ${TYPES_FILE}`)
  process.exit(1)
}

console.warn(`📄 分析类型文件: ${TYPES_FILE}`)

// 读取文件内容
let content = fs.readFileSync(TYPES_FILE, 'utf8')
const originalContent = content

console.warn('')
console.warn('🔍 查找要删除的类型定义...')

let removedCount = 0
const removedTypes = []

// 为每个类型创建删除模式
TYPES_TO_REMOVE.forEach(typeName => {
  // 匹配接口定义的正则表达式
  // 匹配从 /** 注释开始到接口结束的整个块
  const interfacePattern = new RegExp(
    `\\/\\*\\*[\\s\\S]*?\\*\\/\\s*export\\s+interface\\s+${typeName}\\s*{[\\s\\S]*?^}`,
    'gm'
  )

  // 简单的接口定义模式（没有注释的情况）
  const simpleInterfacePattern = new RegExp(
    `export\\s+interface\\s+${typeName}\\s*{[\\s\\S]*?^}`,
    'gm'
  )

  let found = false

  // 尝试匹配带注释的接口
  if (interfacePattern.test(content)) {
    content = content.replace(interfacePattern, '')
    found = true
  }
  // 尝试匹配简单接口
  else if (simpleInterfacePattern.test(content)) {
    content = content.replace(simpleInterfacePattern, '')
    found = true
  }

  if (found) {
    console.warn(`   ✅ 找到并标记删除: ${typeName}`)
    removedTypes.push(typeName)
    removedCount++
  } else {
    console.warn(`   ⚠️  未找到: ${typeName}`)
  }
})

console.warn('')

if (removedCount === 0) {
  console.warn('ℹ️  没有找到需要删除的类型定义')
  process.exit(0)
}

console.warn(`📊 找到 ${removedCount} 个类型定义需要删除`)
console.warn('')

// 清理多余的空行
content = content.replace(/\n\n\n+/g, '\n\n')

// 显示变更预览
console.warn('📋 变更预览:')
console.warn('删除的类型定义:')
removedTypes.forEach(type => {
  console.warn(`   - ${type}`)
})

console.warn('')

// 确认操作
import readline from 'readline'
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

rl.question('🤔 确认删除这些类型定义? (y/N): ', answer => {
  if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    console.warn('❌ 操作已取消')
    rl.close()
    process.exit(0)
  }

  console.warn('')
  console.warn('💾 写入文件...')

  try {
    // 创建备份
    const backupFile = `${TYPES_FILE}.backup.${Date.now()}`
    fs.writeFileSync(backupFile, originalContent)
    console.warn(`📦 已创建备份: ${backupFile}`)

    // 写入修改后的内容
    fs.writeFileSync(TYPES_FILE, content)
    console.warn(`✅ 已更新: ${TYPES_FILE}`)

    console.warn('')
    console.warn('🎉 类型定义清理完成!')
    console.warn('📈 清理效果:')
    console.warn(`   - 删除类型定义: ${removedCount} 个`)
    console.warn(`   - 备份文件: ${backupFile}`)

    console.warn('')
    console.warn('📋 建议后续操作:')
    console.warn('   1. 运行类型检查: pnpm run type-check')
    console.warn('   2. 运行构建测试: pnpm run build')
    console.warn('   3. 如有问题，可从备份文件恢复')
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`)
    process.exit(1)
  }

  rl.close()
})
