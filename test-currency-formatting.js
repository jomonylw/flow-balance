/**
 * 货币格式化验证脚本
 * 在浏览器控制台中运行此脚本来验证 CockpitControls 的货币格式化效果
 */

console.log('💰 开始验证 CockpitControls 货币格式化效果...')

function testCurrencyFormatting() {
  console.log('\n📋 测试货币格式化')
  
  // 检查当前页面是否是 FIRE 页面
  if (!window.location.pathname.includes('/fire')) {
    console.log('⚠️ 请先导航到 /fire 页面')
    return
  }
  
  // 查找所有 Cockpit 相关的输入框
  const cockpitSections = [
    'cockpit-retirementExpenses',
    'cockpit-currentInvestableAssets',
    'cockpit-monthlyInvestment'
  ]
  
  console.log('\n🔍 检查货币相关的输入框:')
  
  cockpitSections.forEach(sectionId => {
    const section = document.getElementById(sectionId)
    if (section) {
      const inputs = section.querySelectorAll('input[type="number"], input[type="text"]')
      
      console.log(`\n📊 ${sectionId}:`)
      
      inputs.forEach((input, index) => {
        const value = input.value
        const type = input.type
        const isEditing = input.classList.contains('text-blue-600') || input.classList.contains('dark:text-blue-400')
        
        console.log(`  输入框 ${index + 1}:`)
        console.log(`    类型: ${type}`)
        console.log(`    值: "${value}"`)
        console.log(`    编辑状态: ${isEditing ? '是' : '否'}`)
        
        // 检查是否有格式化（包含千位分隔符或货币符号）
        const hasFormatting = value.includes(',') || value.includes('¥') || value.includes('$') || value.includes('€')
        console.log(`    格式化: ${hasFormatting ? '是' : '否'}`)
        
        // 检查小数位数
        const decimalMatch = value.match(/\.(\d+)/)
        const decimalPlaces = decimalMatch ? decimalMatch[1].length : 0
        console.log(`    小数位数: ${decimalPlaces}`)
      })
    } else {
      console.log(`\n❌ 未找到 ${sectionId} 部分`)
    }
  })
}

function testEditingBehavior() {
  console.log('\n🧪 测试编辑行为')
  
  const testSection = document.getElementById('cockpit-monthlyInvestment')
  if (testSection) {
    const input = testSection.querySelector('input[type="number"], input[type="text"]')
    
    if (input) {
      const originalValue = input.value
      const originalType = input.type
      
      console.log(`原始状态: 类型=${originalType}, 值="${originalValue}"`)
      
      // 模拟聚焦
      input.focus()
      
      setTimeout(() => {
        const focusedType = input.type
        const focusedValue = input.value
        console.log(`聚焦后: 类型=${focusedType}, 值="${focusedValue}"`)
        
        // 模拟失焦
        input.blur()
        
        setTimeout(() => {
          const blurredType = input.type
          const blurredValue = input.value
          console.log(`失焦后: 类型=${blurredType}, 值="${blurredValue}"`)
          
          console.log('✅ 编辑行为测试完成')
        }, 100)
      }, 100)
    } else {
      console.log('❌ 未找到测试输入框')
    }
  } else {
    console.log('❌ 未找到测试部分')
  }
}

function testCurrencySettings() {
  console.log('\n⚙️ 检查货币设置')
  
  // 尝试从页面中获取货币信息
  const currencyElements = document.querySelectorAll('[data-currency], .currency-symbol')
  
  if (currencyElements.length > 0) {
    console.log('✅ 找到货币相关元素:')
    currencyElements.forEach((element, index) => {
      console.log(`  元素 ${index + 1}: ${element.textContent || element.getAttribute('data-currency')}`)
    })
  } else {
    console.log('⚠️ 未找到明确的货币设置信息')
  }
  
  // 检查是否有货币符号显示
  const symbolElements = document.querySelectorAll('*')
  const currencySymbols = ['¥', '$', '€', '£', '₹', '₽']
  let foundSymbols = []
  
  symbolElements.forEach(element => {
    const text = element.textContent || ''
    currencySymbols.forEach(symbol => {
      if (text.includes(symbol) && !foundSymbols.includes(symbol)) {
        foundSymbols.push(symbol)
      }
    })
  })
  
  if (foundSymbols.length > 0) {
    console.log(`✅ 发现货币符号: ${foundSymbols.join(', ')}`)
  } else {
    console.log('⚠️ 未发现货币符号')
  }
}

function checkDecimalPlaces() {
  console.log('\n🔢 检查小数位数处理')
  
  // 查找所有显示金额的元素
  const amountElements = document.querySelectorAll('input, .text-4xl, .font-bold')
  
  let decimalCounts = {}
  
  amountElements.forEach(element => {
    const text = element.value || element.textContent || ''
    const numberMatch = text.match(/[\d,]+\.(\d+)/)
    
    if (numberMatch) {
      const decimalPlaces = numberMatch[1].length
      decimalCounts[decimalPlaces] = (decimalCounts[decimalPlaces] || 0) + 1
    }
  })
  
  console.log('小数位数统计:')
  Object.entries(decimalCounts).forEach(([places, count]) => {
    console.log(`  ${places} 位小数: ${count} 个元素`)
  })
  
  if (Object.keys(decimalCounts).length === 0) {
    console.log('⚠️ 未找到带小数的金额显示')
  }
}

// 运行所有测试
async function runAllTests() {
  testCurrencyFormatting()
  testCurrencySettings()
  checkDecimalPlaces()
  
  // 延迟运行编辑行为测试
  setTimeout(() => {
    testEditingBehavior()
  }, 1000)
  
  console.log('\n🎉 测试完成！')
  console.log('💡 预期效果:')
  console.log('  - 输入框显示格式化的金额（带千位分隔符）')
  console.log('  - 聚焦时切换为数值输入模式')
  console.log('  - 失焦时恢复格式化显示')
  console.log('  - 小数位数符合货币设置')
}

// 自动运行测试
runAllTests()
