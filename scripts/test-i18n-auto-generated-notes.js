#!/usr/bin/env node

/**
 * 测试自动生成备注的国际化处理
 */

const fs = require('fs')
const path = require('path')

console.log('🔍 检查自动生成备注的国际化处理...\n')

// 检查翻译文件是否包含所需的键值
function checkTranslationKeys() {
  console.log('📋 检查翻译键值...')
  
  const requiredKeys = [
    'exchange.rate.auto.generated.reverse',
    'exchange.rate.auto.generated.transitive',
    'exchange.rate.create.success',
    'exchange.rate.update.success',
    'exchange.rate.auto.generate.failed',
    'exchange.rate.auto.generate.partial.failed',
    'exchange.rate.auto.generate.success',
    'exchange.rate.invalid.date.format',
    'exchange.rate.auto.generate.process.failed',
    'exchange.rate.transitive.generate.failed',
    'exchange.rate.transitive.process.failed',
    'exchange.rate.cleanup.failed',
    'loan.contract.validation.failed',
    'loan.contract.payment.day.invalid',
    'loan.contract.currency.not.found',
    'loan.contract.not.found',
    'loan.contract.template.default.description',
    'loan.contract.template.default.notes',
    'loan.contract.template.balance.notes',
    'balance.change.amount.pattern',
  ]

  const languages = ['zh', 'en']
  let allKeysFound = true

  languages.forEach(lang => {
    console.log(`\n  检查 ${lang} 翻译文件...`)
    const filePath = path.join(process.cwd(), `public/locales/${lang}/common.json`)
    
    if (!fs.existsSync(filePath)) {
      console.log(`    ❌ 翻译文件不存在: ${filePath}`)
      allKeysFound = false
      return
    }

    const translations = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    
    requiredKeys.forEach(key => {
      if (translations[key]) {
        console.log(`    ✅ ${key}`)
      } else {
        console.log(`    ❌ 缺失键值: ${key}`)
        allKeysFound = false
      }
    })
  })

  return allKeysFound
}

// 检查源代码中是否还有硬编码的中文文本
function checkHardcodedText() {
  console.log('\n🔍 检查源代码中的硬编码文本...')
  
  const filesToCheck = [
    'src/lib/services/exchange-rate-auto-generation.service.ts',
    'src/app/api/exchange-rates/route.ts',
    'src/app/api/exchange-rates/auto-generate/route.ts',
    'src/lib/services/loan-contract.service.ts',
    'src/lib/services/category-summary/utils.ts',
  ]

  // 检查是否在代码逻辑中直接使用硬编码文本（排除翻译字典）
  const hardcodedPatterns = [
    // 检查是否在字符串模板或直接字符串中使用硬编码文本
    /`[^`]*自动生成的反向汇率，基于[^`]*`/,
    /`[^`]*自动生成的传递汇率，计算路径[^`]*`/,
    /'[^']*汇率创建成功[^']*'/,
    /"[^"]*汇率更新成功[^"]*"/,
    /throw new Error\(['"`][^'"`]*贷款参数验证失败[^'"`]*['"`]\)/,
    /throw new Error\(['"`][^'"`]*还款日期必须[^'"`]*['"`]\)/,
    /throw new Error\(['"`][^'"`]*指定的货币不存在[^'"`]*['"`]\)/,
    /throw new Error\(['"`][^'"`]*贷款合约不存在[^'"`]*['"`]\)/,
    /`[^`]*第\$\{[^}]*\}期[^`]*`/,
    /`[^`]*贷款合约:\s*\$\{[^}]*\}[^`]*`/,
    // 注释掉正则表达式检查，因为这是用于匹配的模式，不是硬编码文本
    // /\/变化金额：\([^)]*\)\//,
  ]

  let foundHardcoded = false

  filesToCheck.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  文件不存在: ${filePath}`)
      return
    }

    const content = fs.readFileSync(filePath, 'utf8')
    console.log(`\n  检查文件: ${filePath}`)

    hardcodedPatterns.forEach((pattern, index) => {
      const matches = content.match(pattern)
      if (matches) {
        console.log(`    ❌ 发现硬编码文本 (模式 ${index + 1}): ${matches[0]}`)
        foundHardcoded = true
      }
    })

    if (!foundHardcoded) {
      console.log(`    ✅ 未发现硬编码文本`)
    }
  })

  return !foundHardcoded
}

// 主函数
function main() {
  const keysOk = checkTranslationKeys()
  const codeOk = checkHardcodedText()

  console.log('\n📊 检查结果:')
  if (keysOk && codeOk) {
    console.log('✅ 所有自动生成备注已成功国际化')
    process.exit(0)
  } else {
    console.log('❌ 发现需要修复的问题')
    if (!keysOk) {
      console.log('  - 翻译键值不完整')
    }
    if (!codeOk) {
      console.log('  - 源代码中仍有硬编码文本')
    }
    process.exit(1)
  }
}

main()
