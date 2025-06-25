/**
 * 国际化修复验证脚本
 * 在浏览器控制台中运行此脚本来验证 P1/P3/P4 来源的国际化修复效果
 */

console.log('🌍 开始验证国际化修复效果...')

function testSourceLabels() {
  console.log('\n📋 测试来源标签国际化')
  
  // 检查当前页面是否是 FIRE 页面
  if (!window.location.pathname.includes('/fire')) {
    console.log('⚠️ 请先导航到 /fire 页面')
    return
  }
  
  // 查找所有可能的来源标签
  const sourceLabels = document.querySelectorAll('p.text-xs.text-gray-500, p.text-xs.text-gray-400')
  
  console.log(`找到 ${sourceLabels.length} 个可能的来源标签`)
  
  let foundSources = []
  let hardcodedSources = []
  
  sourceLabels.forEach((label, index) => {
    const text = label.textContent.trim()
    
    console.log(`标签 ${index + 1}: "${text}"`)
    
    // 检查是否是硬编码的中文
    if (text.includes('P1来源') || text.includes('P3来源') || text.includes('P4来源')) {
      hardcodedSources.push({
        index: index + 1,
        text: text,
        element: label
      })
      console.log(`  ❌ 发现硬编码中文: ${text}`)
    }
    
    // 检查是否是正确的国际化文本
    if (text.includes('P1 Source') || text.includes('P3 Source') || text.includes('P4 Source') ||
        text.includes('P1来源') || text.includes('P3来源') || text.includes('P4来源')) {
      foundSources.push({
        index: index + 1,
        text: text,
        element: label
      })
    }
  })
  
  console.log(`\n📊 统计结果:`)
  console.log(`  找到的来源标签: ${foundSources.length} 个`)
  console.log(`  硬编码的标签: ${hardcodedSources.length} 个`)
  
  if (hardcodedSources.length === 0) {
    console.log('✅ 所有来源标签都已正确国际化')
  } else {
    console.log('❌ 仍有硬编码的来源标签需要修复')
    hardcodedSources.forEach(source => {
      console.log(`    ${source.index}: ${source.text}`)
    })
  }
  
  return { foundSources, hardcodedSources }
}

function testLanguageSwitching() {
  console.log('\n🔄 测试语言切换效果')
  
  // 查找语言切换按钮
  const languageToggle = document.querySelector('[data-testid="language-toggle"], button:has(svg)')
  
  if (!languageToggle) {
    console.log('❌ 未找到语言切换按钮')
    return
  }
  
  console.log('✅ 找到语言切换按钮')
  
  // 记录当前语言状态
  const currentLang = document.documentElement.lang
  console.log(`当前语言: ${currentLang}`)
  
  // 获取切换前的来源标签文本
  const beforeSources = Array.from(document.querySelectorAll('p.text-xs')).map(el => el.textContent.trim())
  
  console.log('切换前的来源标签:')
  beforeSources.forEach((text, index) => {
    if (text.includes('来源') || text.includes('Source')) {
      console.log(`  ${index + 1}: ${text}`)
    }
  })
  
  // 模拟点击语言切换
  console.log('点击语言切换按钮...')
  languageToggle.click()
  
  // 等待语言切换完成
  setTimeout(() => {
    const newLang = document.documentElement.lang
    console.log(`切换后语言: ${newLang}`)
    
    // 获取切换后的来源标签文本
    const afterSources = Array.from(document.querySelectorAll('p.text-xs')).map(el => el.textContent.trim())
    
    console.log('切换后的来源标签:')
    afterSources.forEach((text, index) => {
      if (text.includes('来源') || text.includes('Source')) {
        console.log(`  ${index + 1}: ${text}`)
      }
    })
    
    // 检查是否有变化
    const hasChanged = beforeSources.some((before, index) => before !== afterSources[index])
    
    if (hasChanged) {
      console.log('✅ 语言切换成功，文本已更新')
    } else {
      console.log('⚠️ 语言切换后文本未发生变化')
    }
  }, 1000)
}

function testTranslationKeys() {
  console.log('\n🔑 测试翻译键')
  
  const expectedKeys = [
    'fire.reality.snapshot.p1.source',
    'fire.reality.snapshot.p3.source', 
    'fire.reality.snapshot.p4.source'
  ]
  
  console.log('预期的翻译键:')
  expectedKeys.forEach(key => {
    console.log(`  - ${key}`)
  })
  
  // 检查页面中是否有显示翻译键而不是翻译值的情况
  const pageText = document.body.innerText
  const untranslatedKeys = expectedKeys.filter(key => pageText.includes(key))
  
  if (untranslatedKeys.length === 0) {
    console.log('✅ 所有翻译键都已正确翻译')
  } else {
    console.log('❌ 发现未翻译的键:')
    untranslatedKeys.forEach(key => {
      console.log(`    ${key}`)
    })
  }
}

function checkTranslationFiles() {
  console.log('\n📁 检查翻译文件')
  
  // 尝试获取翻译文件
  Promise.all([
    fetch('/locales/zh/fire.json').then(res => res.json()),
    fetch('/locales/en/fire.json').then(res => res.json())
  ]).then(([zhTranslations, enTranslations]) => {
    console.log('✅ 翻译文件加载成功')
    
    const requiredKeys = [
      'fire.reality.snapshot.p1.source',
      'fire.reality.snapshot.p3.source',
      'fire.reality.snapshot.p4.source'
    ]
    
    console.log('\n中文翻译:')
    requiredKeys.forEach(key => {
      const value = zhTranslations[key]
      console.log(`  ${key}: ${value || '❌ 缺失'}`)
    })
    
    console.log('\n英文翻译:')
    requiredKeys.forEach(key => {
      const value = enTranslations[key]
      console.log(`  ${key}: ${value || '❌ 缺失'}`)
    })
    
    // 检查是否所有键都存在
    const zhMissing = requiredKeys.filter(key => !zhTranslations[key])
    const enMissing = requiredKeys.filter(key => !enTranslations[key])
    
    if (zhMissing.length === 0 && enMissing.length === 0) {
      console.log('✅ 所有必需的翻译键都已添加')
    } else {
      console.log('❌ 缺失的翻译键:')
      if (zhMissing.length > 0) {
        console.log(`  中文: ${zhMissing.join(', ')}`)
      }
      if (enMissing.length > 0) {
        console.log(`  英文: ${enMissing.join(', ')}`)
      }
    }
  }).catch(error => {
    console.log('❌ 翻译文件加载失败:', error)
  })
}

function highlightSourceLabels() {
  console.log('\n🎨 高亮显示来源标签')
  
  const sourceLabels = document.querySelectorAll('p.text-xs')
  let highlightedCount = 0
  
  sourceLabels.forEach(label => {
    const text = label.textContent.trim()
    if (text.includes('来源') || text.includes('Source') || text.includes('P1') || text.includes('P3') || text.includes('P4')) {
      label.style.backgroundColor = 'yellow'
      label.style.padding = '2px 4px'
      label.style.borderRadius = '3px'
      label.style.border = '1px solid orange'
      highlightedCount++
    }
  })
  
  console.log(`✅ 已高亮 ${highlightedCount} 个来源标签`)
  
  // 3秒后移除高亮
  setTimeout(() => {
    sourceLabels.forEach(label => {
      label.style.backgroundColor = ''
      label.style.padding = ''
      label.style.borderRadius = ''
      label.style.border = ''
    })
    console.log('🔄 已移除高亮效果')
  }, 3000)
}

// 运行所有测试
async function runAllTests() {
  const results = testSourceLabels()
  testTranslationKeys()
  highlightSourceLabels()
  
  // 延迟运行其他测试
  setTimeout(() => {
    checkTranslationFiles()
  }, 1000)
  
  setTimeout(() => {
    testLanguageSwitching()
  }, 2000)
  
  console.log('\n🎉 测试完成！')
  console.log('💡 预期效果:')
  console.log('  - 所有 P1/P3/P4 来源标签都使用国际化')
  console.log('  - 语言切换时标签文本会相应变化')
  console.log('  - 不再有硬编码的中文文本')
  
  return results
}

// 自动运行测试
runAllTests()
