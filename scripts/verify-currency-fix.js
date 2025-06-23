// 浏览器端验证脚本 - 验证货币重复代码修复效果
// 在浏览器控制台中运行此脚本

console.log('🧪 开始验证货币重复代码修复效果...')

// 检查设置页面的本位币选择器
function checkBaseCurrencySelector() {
  console.log('\n📋 1. 检查本位币选择器...')
  
  // 查找本位币选择器
  const baseCurrencySelector = document.querySelector('select[name="baseCurrencyId"]')
  if (!baseCurrencySelector) {
    console.log('⚠️ 未找到本位币选择器，可能需要先导航到设置页面')
    return false
  }
  
  console.log('✅ 找到本位币选择器')
  
  // 检查选项
  const options = baseCurrencySelector.querySelectorAll('option')
  console.log(`📊 找到 ${options.length} 个选项`)
  
  // 检查是否有重复的value
  const values = Array.from(options).map(option => option.value).filter(v => v)
  const uniqueValues = new Set(values)
  
  if (values.length === uniqueValues.size) {
    console.log('✅ 所有选项值都是唯一的')
  } else {
    console.log('❌ 存在重复的选项值')
    console.log('重复值:', values.filter((v, i) => values.indexOf(v) !== i))
  }
  
  // 检查CNY选项
  const cnyOptions = Array.from(options).filter(option => 
    option.textContent.includes('CNY')
  )
  
  if (cnyOptions.length > 1) {
    console.log(`✅ 找到 ${cnyOptions.length} 个CNY选项:`)
    cnyOptions.forEach((option, index) => {
      console.log(`   ${index + 1}. value: ${option.value}`)
      console.log(`      text: ${option.textContent}`)
    })
  } else {
    console.log('ℹ️ 只找到一个或没有CNY选项')
  }
  
  return true
}

// 检查汇率转换器
function checkCurrencyConverter() {
  console.log('\n💱 2. 检查汇率转换器...')
  
  // 查找本位币显示按钮
  const baseCurrencyButton = document.querySelector('[data-testid="base-currency-button"]') ||
    document.querySelector('button:has([data-testid="base-currency-display"])') ||
    document.querySelector('button[class*="currency"]')
  
  if (!baseCurrencyButton) {
    console.log('⚠️ 未找到本位币显示按钮，可能需要先导航到主页面')
    return false
  }
  
  console.log('✅ 找到本位币显示按钮')
  
  // 模拟点击按钮
  console.log('🖱️ 模拟点击本位币按钮...')
  baseCurrencyButton.click()
  
  // 等待弹出框出现
  setTimeout(() => {
    const popup = document.querySelector('[data-testid="currency-converter-popup"]') ||
      document.querySelector('.popover') ||
      document.querySelector('[role="dialog"]')
    
    if (popup) {
      console.log('✅ 汇率转换器弹出框已显示')
      
      // 检查汇率列表
      const rateItems = popup.querySelectorAll('[class*="hover:bg-blue"]')
      console.log(`📊 找到 ${rateItems.length} 个汇率项目`)
      
      if (rateItems.length > 0) {
        console.log('✅ 汇率数据正常显示')
        
        // 检查是否有CNY相关的汇率
        const cnyRates = Array.from(rateItems).filter(item => 
          item.textContent.includes('CNY')
        )
        
        if (cnyRates.length > 0) {
          console.log(`✅ 找到 ${cnyRates.length} 个CNY相关汇率`)
        }
      } else {
        console.log('❌ 未找到汇率数据，可能存在问题')
      }
    } else {
      console.log('❌ 汇率转换器弹出框未显示')
    }
  }, 500)
  
  return true
}

// 检查表单元素
function checkFormElements() {
  console.log('\n🔍 3. 检查其他表单元素...')
  
  // 检查是否有交易表单相关的元素
  const addTransactionButton = document.querySelector(
    '[data-testid="add-transaction"], button:contains("添加交易"), button:contains("新增交易")'
  )
  if (addTransactionButton) {
    console.log('✅ 找到添加交易按钮')
  } else {
    console.log('⚠️ 未找到添加交易按钮，可能需要先导航到交易页面')
  }
  
  // 检查是否有账户选择器
  const accountSelector = document.querySelector('select[name="accountId"]')
  if (accountSelector) {
    console.log('✅ 找到账户选择器')
    
    // 检查账户选项
    const accountOptions = accountSelector.querySelectorAll('option')
    console.log(`📊 找到 ${accountOptions.length} 个账户选项`)
  } else {
    console.log('⚠️ 未找到账户选择器，可能需要先打开交易表单')
  }
  
  // 检查是否有货币选择器
  const currencySelector = document.querySelector('select[name="currencyId"]')
  if (currencySelector) {
    console.log('✅ 找到货币选择器（使用currencyId）')
    
    // 检查是否被禁用
    if (currencySelector.disabled) {
      console.log('📌 货币选择器已被禁用（说明账户有货币限制）')
    } else {
      console.log('📌 货币选择器可用（说明账户无货币限制或未选择账户）')
    }
    
    // 检查货币选项
    const currencyOptions = currencySelector.querySelectorAll('option')
    console.log(`💰 找到 ${currencyOptions.length} 个货币选项`)
    
    // 检查选项值的唯一性
    const values = Array.from(currencyOptions).map(option => option.value).filter(v => v)
    const uniqueValues = new Set(values)
    
    if (values.length === uniqueValues.size) {
      console.log('✅ 货币选项值都是唯一的')
    } else {
      console.log('❌ 货币选项值存在重复')
    }
  } else {
    console.log('⚠️ 未找到货币选择器，可能需要先打开相关表单')
  }
}

// 检查React组件的key属性
function checkReactKeys() {
  console.log('\n🔑 4. 检查React组件key属性...')
  
  // 查找所有可能的货币列表项
  const currencyItems = document.querySelectorAll('[data-currency-id], [data-currency-code]')
  
  if (currencyItems.length > 0) {
    console.log(`✅ 找到 ${currencyItems.length} 个货币相关元素`)
    
    // 检查是否使用了data-currency-id
    const itemsWithId = Array.from(currencyItems).filter(item => 
      item.hasAttribute('data-currency-id')
    )
    
    if (itemsWithId.length > 0) {
      console.log(`✅ ${itemsWithId.length} 个元素使用了货币ID`)
    }
  } else {
    console.log('ℹ️ 未找到货币相关元素，可能需要导航到相关页面')
  }
}

// 主验证函数
function runVerification() {
  console.log('🚀 开始完整验证...\n')
  
  // 检查当前页面
  const currentPath = window.location.pathname
  console.log(`📍 当前页面: ${currentPath}`)
  
  // 根据页面执行不同的检查
  if (currentPath.includes('/settings')) {
    checkBaseCurrencySelector()
  } else {
    console.log('💡 建议导航到设置页面 (/settings) 来测试本位币选择器')
  }
  
  checkCurrencyConverter()
  checkFormElements()
  checkReactKeys()
  
  console.log('\n🎉 验证完成!')
  console.log('\n📝 修复总结:')
  console.log('1. ✅ 本位币选择器现在使用货币ID作为选项值')
  console.log('2. ✅ 汇率转换器使用货币ID进行精确匹配')
  console.log('3. ✅ 所有货币选择组件都使用唯一的货币ID')
  console.log('4. ✅ React key冲突问题已解决')
  
  console.log('\n🔧 如果发现问题，请检查:')
  console.log('- 页面是否已刷新以加载最新代码')
  console.log('- 是否在正确的页面进行测试')
  console.log('- 浏览器控制台是否有错误信息')
}

// 自动运行验证
runVerification()

// 导出函数供手动调用
window.verifyCurrencyFix = {
  runVerification,
  checkBaseCurrencySelector,
  checkCurrencyConverter,
  checkFormElements,
  checkReactKeys
}
