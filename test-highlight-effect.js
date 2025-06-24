/**
 * 高亮效果验证脚本
 * 在浏览器控制台中运行此脚本来验证新的高亮效果
 */

console.log('✨ 开始验证新的高亮效果...')

function testNewHighlightEffect() {
  console.log('\n🎨 测试新的高亮效果')
  
  // 检查当前页面是否是 FIRE 页面
  if (!window.location.pathname.includes('/fire')) {
    console.log('⚠️ 请先导航到 /fire 页面')
    return
  }
  
  // 查找 Calibrate 按钮
  const calibrateButtons = document.querySelectorAll('button')
  const fireButtons = Array.from(calibrateButtons).filter(btn => 
    btn.textContent.includes('Calibrate') || btn.textContent.includes('校准')
  )
  
  if (fireButtons.length === 0) {
    console.log('❌ 未找到 Calibrate 按钮')
    return
  }
  
  console.log(`找到 ${fireButtons.length} 个 Calibrate 按钮`)
  
  // 测试第一个按钮
  const testButton = fireButtons[0]
  console.log('点击第一个 Calibrate 按钮测试新的高亮效果...')
  
  // 模拟点击
  testButton.click()
  
  // 检查高亮效果
  setTimeout(() => {
    checkHighlightStyles()
  }, 500)
  
  // 检查脉冲效果
  setTimeout(() => {
    checkPulseEffect()
  }, 1500)
}

function checkHighlightStyles() {
  console.log('\n🔍 检查高亮样式')
  
  // 查找可能的高亮元素
  const highlightedElements = document.querySelectorAll('[class*="ring-"], [class*="shadow-"], [class*="bg-gradient"]')
  
  const activeHighlights = Array.from(highlightedElements).filter(element => {
    const classes = element.className
    return classes.includes('ring-orange') || 
           classes.includes('shadow-orange') || 
           classes.includes('bg-gradient-to-r')
  })
  
  console.log(`活跃的高亮元素: ${activeHighlights.length} 个`)
  
  activeHighlights.forEach((element, index) => {
    console.log(`\n高亮元素 ${index + 1}:`)
    console.log(`  ID: ${element.id || '无'}`)
    
    // 检查新的样式特性
    const styles = {
      softRing: element.classList.contains('ring-2'),
      softShadow: element.classList.contains('shadow-xl'),
      gradient: element.classList.contains('bg-gradient-to-r'),
      rounded: element.classList.contains('rounded-lg'),
      scale: element.classList.contains('scale-[1.02]'),
      smoothTransition: element.classList.contains('duration-700'),
      easeOut: element.classList.contains('ease-out')
    }
    
    console.log('  样式特性:')
    Object.entries(styles).forEach(([key, value]) => {
      console.log(`    ${key}: ${value ? '✅' : '❌'}`)
    })
    
    // 检查透明度设置
    const hasOpacity = element.className.includes('/60') || 
                      element.className.includes('/50') || 
                      element.className.includes('/40') ||
                      element.className.includes('/30')
    console.log(`    透明度设置: ${hasOpacity ? '✅' : '❌'}`)
    
    // 检查深色模式支持
    const hasDarkMode = element.className.includes('dark:')
    console.log(`    深色模式: ${hasDarkMode ? '✅' : '❌'}`)
  })
  
  if (activeHighlights.length === 0) {
    console.log('⚠️ 未检测到活跃的高亮效果')
    console.log('💡 可能原因: 目标元素不存在或高亮已结束')
  }
}

function checkPulseEffect() {
  console.log('\n💓 检查脉冲效果')
  
  // 查找具有脉冲效果的元素
  const pulsingElements = document.querySelectorAll('[class*="ring-orange"]')
  
  if (pulsingElements.length > 0) {
    console.log(`找到 ${pulsingElements.length} 个可能的脉冲元素`)
    
    // 监控类名变化
    let changeCount = 0
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          changeCount++
          console.log(`脉冲变化 ${changeCount}: ${mutation.target.className}`)
        }
      })
    })
    
    pulsingElements.forEach(element => {
      observer.observe(element, { attributes: true, attributeFilter: ['class'] })
    })
    
    // 3秒后停止监控
    setTimeout(() => {
      observer.disconnect()
      console.log(`总脉冲变化次数: ${changeCount}`)
      if (changeCount > 0) {
        console.log('✅ 脉冲效果正常工作')
      } else {
        console.log('⚠️ 未检测到脉冲变化')
      }
    }, 3000)
  } else {
    console.log('⚠️ 未找到脉冲元素')
  }
}

function analyzeHighlightHarmony() {
  console.log('\n🎨 分析高亮效果的和谐性')
  
  const harmonyCriteria = {
    softColors: '使用柔和的颜色 (orange-300/60, orange-200/40)',
    gradientBackground: '渐变背景 (from-orange-50/30 to-amber-50/30)',
    roundedCorners: '圆润的边角 (rounded-lg)',
    subtleScale: '轻微的缩放 (scale-[1.02])',
    smoothAnimation: '平滑的动画 (duration-700 ease-out)',
    transparentEffects: '透明效果增强和谐感',
    darkModeSupport: '深色模式适配'
  }
  
  console.log('和谐性设计要素:')
  Object.entries(harmonyCriteria).forEach(([key, description]) => {
    console.log(`  ${key}: ${description}`)
  })
  
  console.log('\n💡 设计理念:')
  console.log('  - 避免棱角分明的硬边框')
  console.log('  - 使用透明度创造柔和效果')
  console.log('  - 渐变背景增加层次感')
  console.log('  - 脉冲动画增加生动性')
  console.log('  - 圆角和轻微缩放保持和谐')
}

function testDifferentButtons() {
  console.log('\n🔄 测试不同的 Calibrate 按钮')
  
  const calibrateButtons = document.querySelectorAll('button')
  const fireButtons = Array.from(calibrateButtons).filter(btn => 
    btn.textContent.includes('Calibrate') || btn.textContent.includes('校准')
  )
  
  if (fireButtons.length > 1) {
    console.log(`将依次测试 ${fireButtons.length} 个按钮...`)
    
    fireButtons.forEach((button, index) => {
      setTimeout(() => {
        console.log(`\n点击按钮 ${index + 1}...`)
        button.click()
      }, index * 4000) // 每4秒点击一个按钮
    })
  } else {
    console.log('只有一个按钮可测试')
  }
}

// 运行测试
async function runAllTests() {
  analyzeHighlightHarmony()
  testNewHighlightEffect()
  
  // 延迟测试其他按钮
  setTimeout(() => {
    testDifferentButtons()
  }, 5000)
  
  console.log('\n🎉 测试启动完成！')
  console.log('💡 观察要点:')
  console.log('  - 高亮效果是否柔和圆润')
  console.log('  - 是否有脉冲动画')
  console.log('  - 颜色是否和谐')
  console.log('  - 动画是否平滑')
}

// 自动运行测试
runAllTests()
