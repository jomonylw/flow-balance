#!/usr/bin/env node

/**
 * 修复类型定义问题脚本
 * 基于 analyze-types 的分析结果修复重复定义和未使用的类型
 */

const fs = require('fs')
const path = require('path')

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

// 需要修复的重复类型定义
const DUPLICATE_FIXES = {
  'TimeRange': {
    keepFile: 'src/types/core/index.ts',
    removeFromFiles: [
      'src/components/features/dashboard/CashFlowChart.tsx',
      'src/components/features/dashboard/DashboardContent.tsx',
      'src/components/features/dashboard/NetWorthChart.tsx'
    ],
    addImport: "import type { TimeRange } from '@/types/core'"
  },
  'AccountWithTransactions': {
    keepFile: 'src/types/core/index.ts',
    removeFromFiles: [
      'src/components/features/categories/types.ts',
      'src/lib/services/category-summary/types.ts'
    ],
    addImport: "import type { AccountWithTransactions } from '@/types/core'"
  },
  'UserWithSettings': {
    keepFile: 'src/types/database/index.ts',
    removeFromFiles: [
      'src/components/features/layout/AppLayoutClient.tsx',
      'src/components/features/layout/TopUserStatusBar.tsx'
    ],
    addImport: "import type { UserWithSettings } from '@/types/database'"
  },
  'CAGRDetails': {
    keepFile: 'src/components/features/fire/RealitySnapshot.tsx',
    removeFromFiles: [
      'src/components/features/fire/FireJourneyContent.tsx'
    ],
    addImport: "import type { CAGRDetails } from './RealitySnapshot'"
  },
  'ModalProps': {
    keepFile: 'src/types/ui/index.ts',
    removeFromFiles: [
      'src/components/ui/feedback/Modal.tsx'
    ],
    addImport: "import type { ModalProps } from '@/types/ui'"
  },
  'PageContainerProps': {
    keepFile: 'src/types/ui/index.ts',
    removeFromFiles: [
      'src/components/ui/layout/PageContainer.tsx'
    ],
    addImport: "import type { PageContainerProps } from '@/types/ui'"
  },
  'ApiResponse': {
    keepFile: 'src/types/api/index.ts',
    removeFromFiles: [
      'src/lib/api/response.ts'
    ],
    addImport: "import type { ApiResponse } from '@/types/api'"
  },
  'ValidationResult': {
    keepFile: 'src/types/core/index.ts',
    removeFromFiles: [
      'src/lib/utils/validation.ts'
    ],
    addImport: "import type { ValidationResult } from '@/types/core'"
  },
  'AsyncState': {
    keepFile: 'src/types/ui/index.ts',
    removeFromFiles: [
      'src/types/components/index.ts'
    ],
    addImport: "import type { AsyncState } from '@/types/ui'"
  }
}

// 需要移除重复枚举定义的文件
const ENUM_FIXES = [
  {
    file: 'src/types/core/index.ts',
    enumsToRemove: ['TransactionType'],
    typeDefsToRemove: ['TransactionType'],
    reason: '这些枚举已在 constants.ts 中定义并重新导出'
  },
  {
    file: 'src/types/ui/index.ts',
    enumsToRemove: [],
    typeDefsToRemove: ['Theme', 'Language', 'LoadingState', 'Size', 'ColorVariant'],
    addImports: [
      "import type { Theme, Language, LoadingState, Size, ColorVariant } from '@/types/core/constants'"
    ],
    reason: '这些类型已在 @/types/core/constants 中定义为枚举'
  }
]

// 修复重复类型定义
function fixDuplicateTypes() {
  console.warn(colorize('🔧 修复重复类型定义...', 'blue'))
  console.warn('================================')

  let fixedCount = 0

  Object.entries(DUPLICATE_FIXES).forEach(([typeName, config]) => {
    console.warn(colorize(`\n🔸 修复 ${typeName}:`, 'cyan'))
    
    config.removeFromFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8')
        const originalContent = content
        
        // 移除类型定义
        const interfaceRegex = new RegExp(
          `(?:export\\s+)?interface\\s+${typeName}\\s*(?:<[^>]*>)?\\s*(?:extends\\s+[^{]+)?\\s*{[\\s\\S]*?^}`,
          'gm'
        )
        const typeRegex = new RegExp(
          `(?:export\\s+)?type\\s+${typeName}\\s*(?:<[^>]*>)?\\s*=[\\s\\S]*?(?=\\n\\n|\\nexport|\\ninterface|\\ntype|$)`,
          'gm'
        )
        
        content = content.replace(interfaceRegex, '')
        content = content.replace(typeRegex, '')
        
        // 添加导入语句（如果还没有）
        if (!content.includes(config.addImport)) {
          // 找到其他导入语句的位置
          const importMatch = content.match(/^import.*from.*$/m)
          if (importMatch) {
            const importIndex = content.indexOf(importMatch[0])
            content = content.slice(0, importIndex) + 
                     config.addImport + '\n' + 
                     content.slice(importIndex)
          } else {
            // 如果没有其他导入，添加到文件开头
            content = config.addImport + '\n\n' + content
          }
        }
        
        // 清理多余的空行
        content = content.replace(/\n{3,}/g, '\n\n')
        
        if (content !== originalContent) {
          fs.writeFileSync(filePath, content)
          console.warn(`  ✅ 已修复: ${path.relative(process.cwd(), filePath)}`)
          fixedCount++
        } else {
          console.warn(`  ⚠️  未找到定义: ${path.relative(process.cwd(), filePath)}`)
        }
      } else {
        console.warn(`  ❌ 文件不存在: ${path.relative(process.cwd(), filePath)}`)
      }
    })
  })

  console.warn(colorize(`\n✅ 共修复 ${fixedCount} 个重复类型定义`, 'green'))
}

// 修复重复枚举定义
function fixDuplicateEnums() {
  console.warn(colorize('\n🔧 修复重复枚举定义...', 'blue'))
  console.warn('================================')

  let fixedCount = 0

  ENUM_FIXES.forEach(({ file, enumsToRemove = [], typeDefsToRemove = [], addImports = [], reason }) => {
    if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, 'utf8')
      const originalContent = content

      console.warn(colorize(`\n🔸 处理文件: ${path.relative(process.cwd(), file)}`, 'cyan'))
      console.warn(`  原因: ${reason}`)

      // 移除枚举定义
      enumsToRemove.forEach(enumName => {
        const enumRegex = new RegExp(
          `(?:export\\s+)?enum\\s+${enumName}\\s*{[\\s\\S]*?^}`,
          'gm'
        )

        if (enumRegex.test(content)) {
          content = content.replace(enumRegex, '')
          console.warn(`  ✅ 已移除枚举: ${enumName}`)
          fixedCount++
        }
      })

      // 移除类型定义
      typeDefsToRemove.forEach(typeName => {
        const typeRegex = new RegExp(
          `(?:export\\s+)?type\\s+${typeName}\\s*=[\\s\\S]*?(?=\\n\\n|\\nexport|\\ninterface|\\ntype|$)`,
          'gm'
        )

        if (typeRegex.test(content)) {
          content = content.replace(typeRegex, '')
          console.warn(`  ✅ 已移除类型定义: ${typeName}`)
          fixedCount++
        }
      })

      // 添加导入语句
      addImports.forEach(importStatement => {
        if (!content.includes(importStatement)) {
          // 找到其他导入语句的位置
          const importMatch = content.match(/^import.*from.*$/m)
          if (importMatch) {
            const importIndex = content.indexOf(importMatch[0])
            content = content.slice(0, importIndex) +
                     importStatement + '\n' +
                     content.slice(importIndex)
          } else {
            // 如果没有其他导入，添加到文件开头
            content = importStatement + '\n\n' + content
          }
          console.warn(`  ✅ 已添加导入: ${importStatement}`)
        }
      })

      // 清理多余的空行
      content = content.replace(/\n{3,}/g, '\n\n')

      if (content !== originalContent) {
        fs.writeFileSync(file, content)
        console.warn(`  💾 已保存文件`)
      }
    } else {
      console.warn(`  ❌ 文件不存在: ${path.relative(process.cwd(), file)}`)
    }
  })

  console.warn(colorize(`\n✅ 共修复 ${fixedCount} 个重复枚举/类型定义`, 'green'))
}

// 主函数
function main() {
  console.warn(colorize('🛠️  类型定义问题修复工具', 'blue'))
  console.warn('================================\n')

  try {
    fixDuplicateTypes()
    fixDuplicateEnums()
    
    console.warn(colorize('\n🎉 修复完成！', 'green'))
    console.warn('建议运行以下命令验证修复结果:')
    console.warn('  pnpm run analyze-types')
    console.warn('  pnpm run type-check')
    
  } catch (error) {
    console.error(colorize(`❌ 修复过程中出现错误: ${error.message}`, 'red'))
    process.exit(1)
  }
}

// 运行脚本
if (require.main === module) {
  main()
}

module.exports = { fixDuplicateTypes, fixDuplicateEnums }
