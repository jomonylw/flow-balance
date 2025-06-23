/**
 * 测试汇率更新的国际化错误处理
 * 验证错误代码和参数是否正确传递
 */

async function testExchangeRateI18nErrors() {
  console.log('🌐 测试汇率更新国际化错误处理...\n')

  const baseUrl = 'http://localhost:3000'

  try {
    // 测试1: 直接测试Frankfurter API的404响应
    console.log('📋 测试1: 直接测试Frankfurter API')
    
    try {
      const response = await fetch('https://api.frankfurter.dev/v1/latest?base=AAA')
      console.log(`HTTP状态码: ${response.status}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.log(`响应内容:`, errorData)
        console.log(`是否包含"not found":`, errorData.message?.includes('not found'))
      }
    } catch (error) {
      console.log(`网络错误:`, error)
    }

    // 测试2: 测试前端API调用（需要先登录）
    console.log('\n📋 测试2: 测试前端API调用')
    console.log('注意：此测试需要用户已登录并设置了不支持的本位币')
    
    try {
      const response = await fetch(`${baseUrl}/api/exchange-rates/auto-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      console.log(`API响应状态码: ${response.status}`)
      
      const data = await response.json()
      console.log(`API响应数据:`, data)
      
      if (data.errorCode) {
        console.log(`✅ 错误代码: ${data.errorCode}`)
        if (data.errorParams) {
          console.log(`✅ 错误参数:`, data.errorParams)
        }
      } else {
        console.log(`❌ 未找到错误代码`)
      }
      
    } catch (error) {
      console.log(`API调用错误:`, error)
    }

    // 测试3: 验证翻译键是否存在
    console.log('\n📋 测试3: 验证翻译键')
    
    const fs = require('fs')
    const path = require('path')
    
    const zhTranslationPath = path.join(process.cwd(), 'public/locales/zh/exchange-rate.json')
    const enTranslationPath = path.join(process.cwd(), 'public/locales/en/exchange-rate.json')
    
    const requiredKeys = [
      'exchange.rate.api.currency.not.supported',
      'exchange.rate.api.service.unavailable',
      'exchange.rate.api.error.with.code',
      'exchange.rate.network.connection.failed',
      'exchange.rate.api.fetch.failed'
    ]
    
    // 检查中文翻译
    if (fs.existsSync(zhTranslationPath)) {
      const zhTranslations = JSON.parse(fs.readFileSync(zhTranslationPath, 'utf8'))
      console.log('中文翻译检查:')
      requiredKeys.forEach(key => {
        if (zhTranslations[key]) {
          console.log(`  ✅ ${key}: ${zhTranslations[key]}`)
        } else {
          console.log(`  ❌ ${key}: 缺失`)
        }
      })
    }
    
    // 检查英文翻译
    if (fs.existsSync(enTranslationPath)) {
      const enTranslations = JSON.parse(fs.readFileSync(enTranslationPath, 'utf8'))
      console.log('\n英文翻译检查:')
      requiredKeys.forEach(key => {
        if (enTranslations[key]) {
          console.log(`  ✅ ${key}: ${enTranslations[key]}`)
        } else {
          console.log(`  ❌ ${key}: 缺失`)
        }
      })
    }

    console.log('\n✅ 国际化错误处理测试完成！')
    console.log('\n📝 使用说明:')
    console.log('1. 确保翻译文件包含所有必需的错误信息键')
    console.log('2. 在前端组件中根据errorCode显示相应的国际化错误信息')
    console.log('3. 错误参数通过errorParams传递，支持动态内容替换')

  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

// 运行测试
testExchangeRateI18nErrors()
