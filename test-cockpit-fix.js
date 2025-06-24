/**
 * CockpitControls 修复验证脚本
 * 在浏览器控制台中运行此脚本来验证修复效果
 */

console.log('🔧 开始验证 CockpitControls 修复效果...')

function testCockpitInputs() {
  console.log('\n📋 测试 Cockpit 输入框')
  
  // 检查当前页面是否是 FIRE 页面
  if (!window.location.pathname.includes('/fire')) {
    console.log('⚠️ 请先导航到 /fire 页面')
    return
  }
  
  // 查找所有 Cockpit 相关的输入框
  const cockpitSections = [
    'cockpit-retirementExpenses',
    'cockpit-safeWithdrawalRate', 
    'cockpit-currentInvestableAssets',
    'cockpit-expectedAnnualReturn',
    'cockpit-monthlyInvestment'
  ]
  
  let totalInputs = 0
  let duplicateInputs = 0
  
  cockpitSections.forEach(sectionId => {
    const section = document.getElementById(sectionId)
    if (section) {
      const inputs = section.querySelectorAll('input[type="number"]')
      const ranges = section.querySelectorAll('input[type="range"]')
      
      console.log(`\n📊 ${sectionId}:`)
      console.log(`  数值输入框: ${inputs.length}`)
      console.log(`  滑块: ${ranges.length}`)
      
      totalInputs += inputs.length
      
      if (inputs.length > 1) {
        duplicateInputs += inputs.length - 1
        console.log(`  ⚠️ 发现多余的输入框: ${inputs.length - 1} 个`)
        
        // 显示每个输入框的值
        inputs.forEach((input, index) => {
          console.log(`    输入框 ${index + 1}: ${input.value} (${input.className.includes('w-32') ? '滑块旁' : '独立'})`)
        })
      } else if (inputs.length === 1) {
        console.log(`  ✅ 输入框数量正确: 1 个`)
        console.log(`    值: ${inputs[0].value}`)
      } else {
        console.log(`  ❌ 未找到输入框`)
      }
    } else {
      console.log(`\n❌ 未找到 ${sectionId} 部分`)
    }
  })
  
  console.log(`\n📈 总结:`)
  console.log(`  总输入框数: ${totalInputs}`)
  console.log(`  多余输入框: ${duplicateInputs}`)
  
  if (duplicateInputs === 0) {
    console.log('✅ 修复成功！每个控件只有一个输入框')
  } else {
    console.log('❌ 仍有重复输入框需要修复')
  }
}

function testInputFunctionality() {
  console.log('\n🧪 测试输入功能')
  
  const testSection = document.getElementById('cockpit-monthlyInvestment')
  if (testSection) {
    const numberInput = testSection.querySelector('input[type="number"]')
    const rangeInput = testSection.querySelector('input[type="range"]')
    
    if (numberInput && rangeInput) {
      const originalValue = numberInput.value
      
      // 测试数值输入
      console.log(`原始值: ${originalValue}`)
      
      // 模拟输入变化
      numberInput.value = '25000'
      numberInput.dispatchEvent(new Event('change', { bubbles: true }))
      
      setTimeout(() => {
        console.log(`数值输入测试: ${numberInput.value}`)
        console.log(`滑块同步: ${rangeInput.value}`)
        
        // 恢复原值
        numberInput.value = originalValue
        numberInput.dispatchEvent(new Event('change', { bubbles: true }))
        
        console.log('✅ 输入功能测试完成')
      }, 100)
    } else {
      console.log('❌ 未找到测试所需的输入元素')
    }
  } else {
    console.log('❌ 未找到测试部分')
  }
}

function testUILayout() {
  console.log('\n🎨 测试 UI 布局')
  
  const cockpitContainer = document.querySelector('.bg-white.dark\\:bg-gray-900.rounded-lg.shadow-lg')
  if (cockpitContainer) {
    console.log('✅ 找到 Cockpit 容器')
    
    // 检查是否有多余的显示元素
    const readOnlyDisplays = cockpitContainer.querySelectorAll('.bg-gray-50, .dark\\:bg-gray-700')
    console.log(`只读显示元素: ${readOnlyDisplays.length}`)
    
    if (readOnlyDisplays.length === 0) {
      console.log('✅ 没有多余的只读显示元素')
    } else {
      console.log('⚠️ 仍有只读显示元素，可能需要进一步清理')
      readOnlyDisplays.forEach((element, index) => {
        console.log(`  元素 ${index + 1}: ${element.textContent.trim()}`)
      })
    }
  } else {
    console.log('❌ 未找到 Cockpit 容器')
  }
}

// 运行所有测试
async function runAllTests() {
  testCockpitInputs()
  testUILayout()
  
  // 延迟运行功能测试
  setTimeout(() => {
    testInputFunctionality()
  }, 500)
  
  console.log('\n🎉 测试完成！')
  console.log('💡 如果看到"修复成功！每个控件只有一个输入框"，说明修复成功')
}

// 自动运行测试
runAllTests()
