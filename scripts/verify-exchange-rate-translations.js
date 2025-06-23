const fs = require('fs')
const path = require('path')

function verifyExchangeRateTranslations() {
  console.log('🌐 验证汇率相关翻译键...\n')

  // 从 ExchangeRateForm.tsx 中提取的翻译键
  const requiredKeys = [
    // 汇率表单相关
    'exchange.rate.form.incomplete',
    'exchange.rate.invalid.rate',
    'exchange.rate.same.currency',
    'exchange.rate.invalid.currency',
    'exchange.rate.from.currency',
    'exchange.rate.from.currency.help',
    'exchange.rate.to.currency',
    'exchange.rate.to.currency.help',
    'exchange.rate.rate',
    'exchange.rate.rate.placeholder',
    'exchange.rate.rate.help',
    'exchange.rate.effective.date',
    'exchange.rate.effective.date.help',
    'exchange.rate.notes',
    'exchange.rate.notes.placeholder',
    'exchange.rate.edit',
    'exchange.rate.add',
    'exchange.rate.update',
    
    // 成功和失败消息
    'exchange.rate.create.success',
    'exchange.rate.update.success',
    'exchange.rate.created',
    'exchange.rate.updated',
    'exchange.rate.create.failed',
    'exchange.rate.update.failed',
    
    // 通用键
    'common.close',
    'common.cancel',
    'common.saving',
    'error.operation.failed',
    'error.network',
  ]

  const languages = ['zh', 'en']
  let allKeysFound = true

  for (const lang of languages) {
    console.log(`📋 检查 ${lang.toUpperCase()} 翻译:`)
    
    // 加载翻译文件
    const translationFiles = {
      'exchange-rate': path.join(process.cwd(), `public/locales/${lang}/exchange-rate.json`),
      'common': path.join(process.cwd(), `public/locales/${lang}/common.json`),
      'error': path.join(process.cwd(), `public/locales/${lang}/error.json`),
    }

    const translations = {}
    
    // 读取所有翻译文件
    for (const [namespace, filePath] of Object.entries(translationFiles)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8')
        const data = JSON.parse(content)
        Object.assign(translations, data)
      } catch (error) {
        console.log(`  ❌ 无法读取 ${namespace} 翻译文件: ${error.message}`)
        allKeysFound = false
        continue
      }
    }

    // 检查每个必需的键
    const missingKeys = []
    for (const key of requiredKeys) {
      if (!translations[key]) {
        missingKeys.push(key)
      }
    }

    if (missingKeys.length === 0) {
      console.log(`  ✅ 所有翻译键都存在 (${requiredKeys.length} 个)`)
    } else {
      console.log(`  ❌ 缺失 ${missingKeys.length} 个翻译键:`)
      missingKeys.forEach(key => {
        console.log(`    - ${key}`)
      })
      allKeysFound = false
    }
    
    console.log('')
  }

  // 总结
  console.log('📊 验证结果:')
  if (allKeysFound) {
    console.log('✅ 所有必需的翻译键都已存在')
    console.log('🎉 汇率功能的国际化配置完整')
  } else {
    console.log('❌ 发现缺失的翻译键')
    console.log('💡 请添加缺失的翻译键到相应的翻译文件中')
  }

  return allKeysFound
}

// 运行验证
verifyExchangeRateTranslations()
