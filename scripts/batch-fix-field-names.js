#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// 需要修复的文件列表
const filesToFix = [
  'scripts/test-auto-regeneration.ts',
  'scripts/test-fixed-generation.ts',
  'scripts/test-edit-rate-api.ts',
  'scripts/test-exchange-rate-update.ts',
  'scripts/validate-dashboard-values.ts',
]

// 字段名映射
const fieldMappings = [
  // ExchangeRate 字段
  { old: 'fromCurrency:', new: 'fromCurrencyId:' },
  { old: 'toCurrency:', new: 'toCurrencyId:' },
  { old: 'rate.fromCurrency', new: 'rate.fromCurrencyRef.code' },
  { old: 'rate.toCurrency', new: 'rate.toCurrencyRef.code' },
  
  // UserCurrency 字段
  { old: 'currencyCode:', new: 'currencyId:' },
  { old: 'uc.currencyCode', new: 'uc.currency.code' },
  
  // UserSettings 字段
  { old: 'baseCurrencyCode:', new: 'baseCurrencyId:' },
  
  // Account 字段
  { old: 'currencyCode:', new: 'currencyId:' },
  { old: 'account.currencyCode', new: 'account.currency?.code' },
  
  // Transaction 字段
  { old: 'currencyCode:', new: 'currencyId:' },
  { old: 't.currencyCode', new: 't.currency.code' },
  { old: 'transaction.currencyCode', new: 'transaction.currency.code' },
  
  // OrderBy 字段
  { old: '{ fromCurrency: \'asc\' }', new: '{ createdAt: \'desc\' }' },
  { old: '{ toCurrency: \'asc\' }', new: '' },
  
  // Select 字段
  { old: 'currencyCode: true', new: 'currency: true' },
]

// 需要添加 include 的查询
const includePatterns = [
  {
    pattern: /await prisma\.exchangeRate\.findMany\(\s*{\s*where:/g,
    include: `      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },`
  },
  {
    pattern: /await prisma\.userCurrency\.findMany\(\s*{\s*where:/g,
    include: `      include: {
        currency: true,
      },`
  },
  {
    pattern: /await prisma\.account\.findMany\(\s*{\s*where:/g,
    include: `      include: {
        currency: true,
        category: true,
      },`
  },
]

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  文件不存在: ${filePath}`)
    return false
  }

  let content = fs.readFileSync(filePath, 'utf8')
  let modified = false

  console.log(`🔧 修复文件: ${filePath}`)

  // 应用字段名映射
  fieldMappings.forEach(mapping => {
    if (mapping.new === '') {
      // 删除字段
      const regex = new RegExp(mapping.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      if (content.includes(mapping.old)) {
        content = content.replace(regex, '')
        modified = true
        console.log(`  ✅ 删除: ${mapping.old}`)
      }
    } else {
      // 替换字段
      if (content.includes(mapping.old)) {
        content = content.replace(new RegExp(mapping.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), mapping.new)
        modified = true
        console.log(`  ✅ 替换: ${mapping.old} → ${mapping.new}`)
      }
    }
  })

  // 添加必要的 include
  includePatterns.forEach(pattern => {
    const matches = content.match(pattern.pattern)
    if (matches) {
      matches.forEach(match => {
        const includeAlreadyExists = content.includes('include:')
        if (!includeAlreadyExists) {
          content = content.replace(match, match + '\n' + pattern.include)
          modified = true
          console.log(`  ✅ 添加 include`)
        }
      })
    }
  })

  // 修复汇率创建逻辑
  if (content.includes('fromCurrency: \'') || content.includes('toCurrency: \'')) {
    // 需要手动处理汇率创建逻辑
    console.log(`  ⚠️  需要手动修复汇率创建逻辑`)
  }

  // 清理多余的逗号和空行
  content = content
    .replace(/,\s*}/g, '\n      }')
    .replace(/{\s*,/g, '{')
    .replace(/,\s*,/g, ',')
    .replace(/\n\s*\n\s*\n/g, '\n\n')

  if (modified) {
    fs.writeFileSync(filePath, content)
    console.log(`  💾 保存修改`)
    return true
  } else {
    console.log(`  ℹ️  无需修改`)
    return false
  }
}

function main() {
  console.log('🚀 开始批量修复字段名...\n')

  let fixedCount = 0
  let totalCount = 0

  filesToFix.forEach(filePath => {
    totalCount++
    if (fixFile(filePath)) {
      fixedCount++
    }
    console.log('')
  })

  console.log(`📊 修复完成: ${fixedCount}/${totalCount} 个文件`)
  
  if (fixedCount > 0) {
    console.log('\n⚠️  注意: 某些汇率创建逻辑可能需要手动修复')
    console.log('需要将 fromCurrency/toCurrency 字符串改为 fromCurrencyId/toCurrencyId')
  }
}

main()
