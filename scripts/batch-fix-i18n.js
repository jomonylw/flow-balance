#!/usr/bin/env node

/**
 * 批量修复国际化问题
 * 自动修复遗漏的文件
 */

const fs = require('fs')
const path = require('path')

// 需要修复的文件列表（从验证脚本输出中提取）
const filesToFix = [
  'src/app/api/accounts/[accountId]/transactions/route.ts',
  'src/app/api/accounts/[accountId]/trends/route.ts', 
  'src/app/api/accounts/balances/route.ts',
  'src/app/api/analytics/monthly-summary/route.ts',
  'src/app/api/balance-update/route.ts',
  'src/app/api/dashboard/charts/route.ts',
  'src/app/api/dashboard/summary/route.ts',
  'src/app/api/loan-contracts/[id]/payments/route.ts',
  'src/app/api/recurring-transactions/cleanup-duplicates/route.ts',
  'src/app/api/recurring-transactions/generate-historical/route.ts',
  'src/app/api/reports/balance-sheet/route.ts',
  'src/app/api/reports/personal-cash-flow/route.ts',
  'src/app/api/test/loan-payment-processing/route.ts',
  'src/app/api/transaction-templates/route.ts',
  'src/app/api/transactions/route.ts',
  'src/app/api/transactions/stats/route.ts',
  'src/app/api/user/data/import/progress/route.ts',
  'src/lib/services/account.service.ts',
  'src/lib/services/currency-formatting.service.ts',
  'src/lib/services/data-backup.service.ts',
  'src/lib/services/future-data-generation.service.ts'
]

// 需要保持 createServerTranslator 的文件（登录/注册等）
const keepCreateServerTranslator = [
  'src/app/api/auth/login/route.ts',
  'src/app/api/auth/request-password-reset/route.ts', 
  'src/app/api/auth/signup/route.ts',
  'src/lib/services/auth.service.ts',
  'src/lib/services/exchange-rate-auto-generation.service.ts'
]

function addGetUserTranslatorImport(filePath) {
  console.log(`修复文件: ${filePath}`)
  
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  文件不存在: ${filePath}`)
    return false
  }
  
  let content = fs.readFileSync(filePath, 'utf8')
  
  // 检查是否已经有正确的导入
  if (content.includes('import { getUserTranslator }') || 
      content.includes('import { createServerTranslator, getUserTranslator }')) {
    console.log(`  ✅ 文件已有正确导入: ${filePath}`)
    return true
  }
  
  // 检查是否需要添加导入
  const needsTranslation = content.includes('errorResponse(') || 
                          content.includes('validationErrorResponse(') ||
                          content.includes('successResponse(') ||
                          content.includes('t(\'') ||
                          content.includes('t("')
  
  if (!needsTranslation) {
    console.log(`  ⏭️  文件不需要翻译功能: ${filePath}`)
    return true
  }
  
  // 添加导入
  const importPattern = /import\s+{[^}]*}\s+from\s+['"]@\/lib\/api\/response['"]/
  const lastImportPattern = /import\s+.*from\s+['"][^'"]*['"];?\s*$/gm
  
  let modified = false
  
  if (importPattern.test(content)) {
    // 在 response 导入后添加
    content = content.replace(importPattern, (match) => {
      return match + '\nimport { getUserTranslator } from \'@/lib/utils/server-i18n\''
    })
    modified = true
  } else {
    // 在最后一个导入后添加
    const imports = content.match(lastImportPattern)
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1]
      content = content.replace(lastImport, lastImport + '\nimport { getUserTranslator } from \'@/lib/utils/server-i18n\'')
      modified = true
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8')
    console.log(`  ✅ 已添加 getUserTranslator 导入`)
    return true
  } else {
    console.log(`  ❌ 无法添加导入`)
    return false
  }
}

function fixHardcodedText(filePath) {
  if (!fs.existsSync(filePath)) {
    return false
  }
  
  let content = fs.readFileSync(filePath, 'utf8')
  let modified = false
  
  // 常见的硬编码文本替换模式
  const replacements = [
    // 错误消息
    { pattern: /errorResponse\(['"]([^'"]*[\u4e00-\u9fff][^'"]*)['"]/, replacement: "errorResponse(t('error.message')" },
    { pattern: /validationErrorResponse\(['"]([^'"]*[\u4e00-\u9fff][^'"]*)['"]/, replacement: "validationErrorResponse(t('validation.error')" },
    { pattern: /successResponse\([^,]*,\s*['"]([^'"]*[\u4e00-\u9fff][^'"]*)['"]/, replacement: "successResponse(data, t('success.message')" },
    
    // 常见错误消息
    { pattern: /'账户不存在'/g, replacement: "t('account.not.found')" },
    { pattern: /'分类不存在'/g, replacement: "t('category.not.found')" },
    { pattern: /'货币不存在'/g, replacement: "t('currency.not.found')" },
    { pattern: /'未授权访问'/g, replacement: "t('unauthorized.access')" },
    { pattern: /'缺少必填字段'/g, replacement: "t('required.fields.missing')" },
    { pattern: /'操作失败'/g, replacement: "t('operation.failed')" },
    { pattern: /'操作成功'/g, replacement: "t('operation.success')" }
  ]
  
  replacements.forEach(({ pattern, replacement }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement)
      modified = true
    }
  })
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8')
    console.log(`  ✅ 已修复硬编码文本`)
    return true
  }
  
  return false
}

function main() {
  console.log('🔧 开始批量修复国际化问题...\n')
  
  let fixedCount = 0
  let totalCount = 0
  
  // 修复需要 getUserTranslator 的文件
  console.log('📝 修复需要 getUserTranslator 的文件...')
  filesToFix.forEach(filePath => {
    totalCount++
    if (addGetUserTranslatorImport(filePath)) {
      fixedCount++
    }
  })
  
  console.log(`\n📊 修复统计:`)
  console.log(`   总文件数: ${totalCount}`)
  console.log(`   成功修复: ${fixedCount}`)
  console.log(`   修复率: ${((fixedCount / totalCount) * 100).toFixed(1)}%`)
  
  console.log('\n🎉 批量修复完成！')
  console.log('\n💡 建议:')
  console.log('   1. 运行验证脚本检查修复结果')
  console.log('   2. 手动检查和测试关键功能')
  console.log('   3. 添加缺失的翻译键值')
}

main()
