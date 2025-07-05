#!/usr/bin/env node

/**
 * 测试贷款合约国际化修复
 * 验证贷款自动生成的交易记录描述和备注是否正确国际化
 */

const fs = require('fs')
const path = require('path')

console.log('🧪 测试贷款合约国际化修复...\n')

// 检查翻译文件是否包含必需的键值
function checkTranslationKeys() {
  console.log('📋 检查翻译文件...')
  
  const requiredKeys = [
    'loan.type.principal',
    'loan.type.interest', 
    'loan.type.balance.update'
  ]
  
  const results = []
  
  // 检查中文翻译
  const zhCommonPath = path.join(process.cwd(), 'public/locales/zh/common.json')
  if (fs.existsSync(zhCommonPath)) {
    const zhCommon = JSON.parse(fs.readFileSync(zhCommonPath, 'utf8'))
    
    for (const key of requiredKeys) {
      if (zhCommon[key]) {
        results.push({
          key,
          lang: 'zh',
          value: zhCommon[key],
          status: '✅'
        })
      } else {
        results.push({
          key,
          lang: 'zh', 
          value: 'MISSING',
          status: '❌'
        })
      }
    }
  }
  
  // 检查英文翻译
  const enCommonPath = path.join(process.cwd(), 'public/locales/en/common.json')
  if (fs.existsSync(enCommonPath)) {
    const enCommon = JSON.parse(fs.readFileSync(enCommonPath, 'utf8'))
    
    for (const key of requiredKeys) {
      if (enCommon[key]) {
        results.push({
          key,
          lang: 'en',
          value: enCommon[key],
          status: '✅'
        })
      } else {
        results.push({
          key,
          lang: 'en',
          value: 'MISSING', 
          status: '❌'
        })
      }
    }
  }
  
  // 显示结果
  console.log('\n📊 翻译键值检查结果:')
  console.log('=' .repeat(60))
  
  for (const result of results) {
    console.log(`${result.status} ${result.key} (${result.lang}): ${result.value}`)
  }
  
  const missingCount = results.filter(r => r.status === '❌').length
  if (missingCount === 0) {
    console.log('\n✅ 所有必需的翻译键值都已添加')
  } else {
    console.log(`\n❌ 缺少 ${missingCount} 个翻译键值`)
  }
  
  return missingCount === 0
}

// 检查源代码是否已移除硬编码文本
function checkSourceCode() {
  console.log('\n📋 检查源代码硬编码文本...')
  
  const servicePath = path.join(process.cwd(), 'src/lib/services/loan-contract.service.ts')
  
  if (!fs.existsSync(servicePath)) {
    console.log('❌ 找不到 loan-contract.service.ts 文件')
    return false
  }
  
  const content = fs.readFileSync(servicePath, 'utf8')
  
  // 检查是否还有硬编码的中文文本
  const hardcodedPatterns = [
    /type:\s*['"]本金['"]/g,
    /type:\s*['"]利息['"]/g, 
    /type:\s*['"]余额更新['"]/g
  ]
  
  let hasHardcoded = false
  
  for (const pattern of hardcodedPatterns) {
    const matches = content.match(pattern)
    if (matches) {
      console.log(`❌ 发现硬编码文本: ${matches.join(', ')}`)
      hasHardcoded = true
    }
  }
  
  // 检查是否正确使用了国际化调用
  const i18nPatterns = [
    /t\(['"]loan\.type\.principal['"]\)/g,
    /t\(['"]loan\.type\.interest['"]\)/g,
    /t\(['"]loan\.type\.balance\.update['"]\)/g
  ]
  
  let hasI18n = true
  
  for (const pattern of i18nPatterns) {
    const matches = content.match(pattern)
    if (!matches || matches.length === 0) {
      console.log(`❌ 缺少国际化调用: ${pattern.source}`)
      hasI18n = false
    } else {
      console.log(`✅ 找到国际化调用: ${matches.length} 处`)
    }
  }
  
  if (!hasHardcoded && hasI18n) {
    console.log('\n✅ 源代码检查通过：已移除硬编码文本并添加国际化调用')
    return true
  } else {
    console.log('\n❌ 源代码检查失败')
    return false
  }
}

// 主测试函数
async function runTests() {
  const results = []
  
  // 测试1: 翻译文件检查
  results.push({
    name: '翻译键值检查',
    passed: checkTranslationKeys()
  })
  
  // 测试2: 源代码检查
  results.push({
    name: '源代码硬编码检查',
    passed: checkSourceCode()
  })
  
  // 显示总结
  console.log('\n📊 测试结果汇总:')
  console.log('=' .repeat(50))
  
  let passedCount = 0
  for (const result of results) {
    const status = result.passed ? '✅ 通过' : '❌ 失败'
    console.log(`${result.name}: ${status}`)
    if (result.passed) passedCount++
  }
  
  console.log('=' .repeat(50))
  console.log(`总计: ${results.length} 个测试`)
  console.log(`通过: ${passedCount} 个`)
  console.log(`失败: ${results.length - passedCount} 个`)
  
  if (passedCount === results.length) {
    console.log('\n🎉 所有测试通过！贷款合约国际化修复成功。')
  } else {
    console.log('\n⚠️  部分测试失败，请检查上述错误信息。')
  }
}

// 运行测试
runTests().catch(console.error)
