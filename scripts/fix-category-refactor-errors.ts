/**
 * 批量修复分类重构后的错误
 */

import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'

// 需要修复的文件模式
const patterns = [
  'src/app/api/**/*.ts',
  'src/components/**/*.tsx',
  'src/lib/**/*.ts',
]

// 需要替换的模式
const replacements = [
  // 移除 category include
  {
    pattern: /category:\s*true,?\s*\n/g,
    replacement: '',
    description: '移除 category: true include',
  },
  {
    pattern: /category:\s*\{\s*select:\s*\{[^}]*\}\s*\},?\s*\n/g,
    replacement: '',
    description: '移除 category select include',
  },

  // 修复 transaction.category 引用
  {
    pattern: /transaction\.category\./g,
    replacement: 'transaction.account.category.',
    description: '修复 transaction.category 引用',
  },

  // 修复 categoryId 字段使用
  {
    pattern: /categoryId:\s*transactionData\.categoryId,?\s*\n/g,
    replacement: '',
    description: '移除 categoryId 字段使用',
  },

  // 修复查询条件中的 category
  {
    pattern: /category:\s*\{\s*type:\s*AccountType\./g,
    replacement: 'account: { category: { type: AccountType.',
    description: '修复查询条件中的 category',
  },
]

async function fixFiles() {
  console.log('🔧 开始批量修复分类重构错误...\n')

  let totalFiles = 0
  let fixedFiles = 0

  for (const pattern of patterns) {
    const files = await glob(pattern)

    for (const file of files) {
      totalFiles++
      let content = readFileSync(file, 'utf-8')
      let hasChanges = false

      for (const replacement of replacements) {
        const originalContent = content
        content = content.replace(replacement.pattern, replacement.replacement)

        if (content !== originalContent) {
          hasChanges = true
          console.log(`✅ ${file}: ${replacement.description}`)
        }
      }

      if (hasChanges) {
        writeFileSync(file, content)
        fixedFiles++
      }
    }
  }

  console.log('\n📊 修复完成:')
  console.log(`- 检查文件: ${totalFiles}`)
  console.log(`- 修复文件: ${fixedFiles}`)
}

fixFiles().catch(console.error)
