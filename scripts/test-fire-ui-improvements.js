/**
 * FIRE UI 改进验证脚本
 * 在浏览器控制台中运行此脚本来验证修复效果
 */

console.log('🎨 开始验证 FIRE UI 改进效果...')

function testCalibrateButtons() {
  console.log('\n🔘 测试 Calibrate 按钮样式')
  
  // 检查当前页面是否是 FIRE 页面
  if (!window.location.pathname.includes('/fire')) {
    console.log('⚠️ 请先导航到 /fire 页面')
    return
  }
  
  // 查找所有 Calibrate 按钮
  const calibrateButtons = document.querySelectorAll('button:has(span)')
  const fireButtons = Array.from(calibrateButtons).filter(btn => 
    btn.textContent.includes('Calibrate') || btn.textContent.includes('校准')
  )
  
  console.log(`找到 ${fireButtons.length} 个 Calibrate 按钮`)
  
  fireButtons.forEach((button, index) => {
    console.log(`\n按钮 ${index + 1}:`)
    
    // 检查样式类
    const hasNewStyles = button.classList.contains('inline-flex') && 
                        button.classList.contains('items-center') &&
                        button.classList.contains('gap-1')
    
    console.log(`  新样式: ${hasNewStyles ? '✅' : '❌'}`)
    
    // 检查是否有图标
    const hasIcon = button.querySelector('svg') !== null
    console.log(`  图标: ${hasIcon ? '✅' : '❌'}`)
    
    // 检查背景色
    const hasBackground = button.classList.contains('bg-blue-50') || 
                         button.classList.contains('dark:bg-blue-900/20')
    console.log(`  背景色: ${hasBackground ? '✅' : '❌'}`)
    
    // 检查边框
    const hasBorder = button.classList.contains('border')
    console.log(`  边框: ${hasBorder ? '✅' : '❌'}`)
  })
  
  if (fireButtons.length === 0) {
    console.log('❌ 未找到 Calibrate 按钮')
  }
}

function testHighlightEffect() {
  console.log('\n✨ 测试高亮效果')
  
  const calibrateButtons = document.querySelectorAll('button:has(span)')
  const fireButtons = Array.from(calibrateButtons).filter(btn => 
    btn.textContent.includes('Calibrate') || btn.textContent.includes('校准')
  )
  
  if (fireButtons.length > 0) {
    const testButton = fireButtons[0]
    console.log('点击第一个 Calibrate 按钮测试高亮效果...')
    
    // 模拟点击
    testButton.click()
    
    setTimeout(() => {
      // 检查是否有高亮元素
      const highlightedElements = document.querySelectorAll('.ring-4, .ring-orange-400')
      console.log(`高亮元素数量: ${highlightedElements.length}`)
      
      if (highlightedElements.length > 0) {
        console.log('✅ 高亮效果正常工作')
        highlightedElements.forEach((element, index) => {
          console.log(`  高亮元素 ${index + 1}: ${element.id || element.className}`)
        })
      } else {
        console.log('⚠️ 未检测到高亮效果，可能目标元素不存在')
      }
    }, 500)
  } else {
    console.log('❌ 无法测试高亮效果，未找到按钮')
  }
}

function testInputHeights() {
  console.log('\n📏 测试输入框高度一致性')
  
  // 查找所有 Cockpit 输入框
  const cockpitInputs = document.querySelectorAll('#cockpit-retirementExpenses input, #cockpit-currentInvestableAssets input, #cockpit-monthlyInvestment input, #cockpit-safeWithdrawalRate input, #cockpit-expectedAnnualReturn input')
  
  console.log(`找到 ${cockpitInputs.length} 个输入框`)
  
  const heights = new Set()
  const computedHeights = new Set()
  
  cockpitInputs.forEach((input, index) => {
    const style = window.getComputedStyle(input)
    const height = style.height
    const hasHeightClass = input.classList.contains('h-9')
    
    heights.add(height)
    computedHeights.add(height)
    
    console.log(`  输入框 ${index + 1}: 高度=${height}, h-9类=${hasHeightClass ? '✅' : '❌'}`)
  })
  
  console.log(`\n高度统计:`)
  console.log(`  不同高度数量: ${heights.size}`)
  console.log(`  高度值: ${Array.from(heights).join(', ')}`)
  
  if (heights.size === 1) {
    console.log('✅ 所有输入框高度一致')
  } else {
    console.log('❌ 输入框高度不一致')
  }
}

function testSliderComponent() {
  console.log('\n🎚️ 测试 Slider 组件')
  
  // 查找滑块元素
  const sliders = document.querySelectorAll('input[type="range"]')
  console.log(`找到 ${sliders.length} 个滑块`)
  
  sliders.forEach((slider, index) => {
    const container = slider.closest('div')
    const hasSliderClass = slider.classList.contains('slider')
    const hasCustomStyles = container && container.querySelector('style')
    
    console.log(`  滑块 ${index + 1}:`)
    console.log(`    slider类: ${hasSliderClass ? '✅' : '❌'}`)
    console.log(`    自定义样式: ${hasCustomStyles ? '✅' : '❌'}`)
    
    // 检查是否有格式化显示
    const valueDisplay = container && container.querySelector('.text-blue-600, .dark\\:text-blue-400')
    console.log(`    值显示: ${valueDisplay ? '✅' : '❌'}`)
    
    if (valueDisplay) {
      console.log(`    显示值: "${valueDisplay.textContent}"`)
    }
  })
  
  // 检查精确输入框
  const preciseInputs = document.querySelectorAll('label:contains("精确输入")')
  console.log(`\n精确输入框: ${preciseInputs.length} 个`)
}

function testCurrencyFormatting() {
  console.log('\n💰 测试货币格式化')
  
  // 查找所有显示值
  const valueDisplays = document.querySelectorAll('.text-blue-600, .dark\\:text-blue-400')
  
  console.log(`找到 ${valueDisplays.length} 个值显示元素`)
  
  valueDisplays.forEach((display, index) => {
    const text = display.textContent || ''
    const hasFormatting = text.includes(',') || text.includes('¥') || text.includes('$')
    const hasDecimal = text.includes('.')
    
    console.log(`  显示 ${index + 1}: "${text}"`)
    console.log(`    格式化: ${hasFormatting ? '✅' : '❌'}`)
    console.log(`    小数: ${hasDecimal ? '✅' : '❌'}`)
  })
}

// 运行所有测试
async function runAllTests() {
  testCalibrateButtons()
  testInputHeights()
  testSliderComponent()
  testCurrencyFormatting()
  
  // 延迟运行高亮效果测试
  setTimeout(() => {
    testHighlightEffect()
  }, 1000)
  
  console.log('\n🎉 测试完成！')
  console.log('💡 预期效果:')
  console.log('  - Calibrate 按钮有新的美化样式')
  console.log('  - 点击按钮会有美化的高亮效果')
  console.log('  - 所有输入框高度一致 (h-9)')
  console.log('  - 使用统一的 Slider 组件')
  console.log('  - 货币格式化正常工作')
}

// 自动运行测试
runAllTests()
