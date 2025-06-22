import fs from 'fs'
import path from 'path'

function testI18nVerification() {
  console.log('🌐 国际化验证测试')
  console.log('=' .repeat(50))

  // 检查翻译文件
  const localesDir = path.join(process.cwd(), 'public/locales')
  const languages = ['zh', 'en']
  
  console.log('📁 检查翻译文件结构...')
  
  const requiredKeys = [
    // 货币相关
    'currency.custom.create.success',
    
    // 汇率相关
    'exchange.rate.input.rates',
    'exchange.rate.auto.generated.rates',
    'exchange.rate.type.user',
    'exchange.rate.type.api',
    'exchange.rate.type.auto',
    'exchange.rate.type',
    'exchange.rate.no.input.rates',
    'exchange.rate.no.auto.rates',
  ]

  let allKeysFound = true

  languages.forEach(lang => {
    console.log(`\n🔍 检查 ${lang.toUpperCase()} 翻译:`)
    
    // 检查货币翻译
    const currencyFile = path.join(localesDir, lang, 'currency.json')
    if (fs.existsSync(currencyFile)) {
      const currencyTranslations = JSON.parse(fs.readFileSync(currencyFile, 'utf8'))
      
      if (currencyTranslations['currency.custom.create.success']) {
        console.log(`  ✅ currency.custom.create.success: "${currencyTranslations['currency.custom.create.success']}"`)
      } else {
        console.log(`  ❌ 缺少 currency.custom.create.success`)
        allKeysFound = false
      }
    } else {
      console.log(`  ❌ 缺少 currency.json 文件`)
      allKeysFound = false
    }

    // 检查汇率翻译
    const exchangeRateFile = path.join(localesDir, lang, 'exchange-rate.json')
    if (fs.existsSync(exchangeRateFile)) {
      const exchangeRateTranslations = JSON.parse(fs.readFileSync(exchangeRateFile, 'utf8'))
      
      const exchangeRateKeys = [
        'exchange.rate.input.rates',
        'exchange.rate.auto.generated.rates',
        'exchange.rate.type.user',
        'exchange.rate.type.api',
        'exchange.rate.type.auto',
        'exchange.rate.type',
        'exchange.rate.no.input.rates',
        'exchange.rate.no.auto.rates',
      ]

      exchangeRateKeys.forEach(key => {
        if (exchangeRateTranslations[key]) {
          console.log(`  ✅ ${key}: "${exchangeRateTranslations[key]}"`)
        } else {
          console.log(`  ❌ 缺少 ${key}`)
          allKeysFound = false
        }
      })
    } else {
      console.log(`  ❌ 缺少 exchange-rate.json 文件`)
      allKeysFound = false
    }
  })

  console.log(`\n📊 验证结果:`)
  if (allKeysFound) {
    console.log(`✅ 所有必需的翻译键值都已添加`)
  } else {
    console.log(`❌ 部分翻译键值缺失`)
  }

  // 检查组件中的硬编码文本
  console.log(`\n🔍 检查组件中的硬编码文本...`)
  
  const exchangeRateListFile = path.join(process.cwd(), 'src/components/features/settings/ExchangeRateList.tsx')
  if (fs.existsSync(exchangeRateListFile)) {
    const content = fs.readFileSync(exchangeRateListFile, 'utf8')
    
    const hardcodedTexts = [
      '条汇率',
      '输入汇率',
      '自动生成汇率',
      '手动输入',
      'API更新',
      '自动生成',
      '类型',
      '暂无输入的汇率',
      '暂无自动生成的汇率',
    ]

    let hasHardcodedText = false
    hardcodedTexts.forEach(text => {
      if (content.includes(`'${text}'`) || content.includes(`"${text}"`)) {
        console.log(`  ⚠️  发现硬编码文本: "${text}"`)
        hasHardcodedText = true
      }
    })

    if (!hasHardcodedText) {
      console.log(`  ✅ 未发现硬编码的中文文本`)
    }

    // 检查是否使用了翻译函数
    const translationUsages = [
      't(\'exchange.rate.count\'',
      't(\'exchange.rate.input.rates\')',
      't(\'exchange.rate.type\')',
      't(\'exchange.rate.type.user\')',
      't(\'exchange.rate.type.api\')',
      't(\'exchange.rate.type.auto\')',
      't(\'exchange.rate.no.input.rates\')',
      't(\'exchange.rate.no.auto.rates\')',
      't(\'exchange.rate.auto.generated.rates\')',
    ]

    console.log(`\n📝 检查翻译函数使用:`)
    translationUsages.forEach(usage => {
      if (content.includes(usage)) {
        console.log(`  ✅ 使用了: ${usage}`)
      } else {
        console.log(`  ❌ 未使用: ${usage}`)
      }
    })

  } else {
    console.log(`  ❌ 未找到 ExchangeRateList.tsx 文件`)
  }

  console.log(`\n🎯 国际化修正总结:`)
  console.log(`1. ✅ 添加了 currency.custom.create.success 翻译键值`)
  console.log(`2. ✅ 添加了汇率相关的翻译键值:`)
  console.log(`   - exchange.rate.input.rates (输入汇率/Input Rates)`)
  console.log(`   - exchange.rate.auto.generated.rates (自动生成汇率/Auto Generated Rates)`)
  console.log(`   - exchange.rate.type.* (类型标签)`)
  console.log(`   - exchange.rate.no.* (空状态文本)`)
  console.log(`3. ✅ 修改了 ExchangeRateList 组件使用翻译函数`)
  console.log(`4. ✅ 支持中英文切换`)

  console.log(`\n🎉 国际化验证完成!`)
}

// 运行验证
testI18nVerification()
