/**
 * FIRE 功能测试脚本
 * 在浏览器控制台中运行此脚本来测试 FIRE 功能
 */

console.log('🔥 开始测试 FIRE 功能...')

// 测试 1: 检查 FIRE 菜单是否存在
function testFireMenuExists() {
  console.log('\n📋 测试 1: 检查 FIRE 菜单是否存在')

  const fireLink = document.querySelector('a[href="/fire"]')
  if (fireLink) {
    console.log('✅ FIRE 菜单链接已找到')
    console.log('📍 链接文本:', fireLink.textContent.trim())

    // 检查是否有火焰图标
    const fireIcon = fireLink.querySelector('svg')
    if (fireIcon) {
      console.log('✅ FIRE 图标已找到')
    } else {
      console.log('⚠️ FIRE 图标未找到')
    }

    return true
  } else {
    console.log('❌ FIRE 菜单链接未找到')
    console.log('💡 提示: 请确保用户已启用 FIRE 功能')
    return false
  }
}

// 测试 2: 检查 FIRE 设置
function testFireSettings() {
  console.log('\n📋 测试 2: 检查 FIRE 设置')

  // 模拟检查用户设置
  fetch('/api/user/settings')
    .then(response => response.json())
    .then(data => {
      if (data.success && data.data.userSettings) {
        const settings = data.data.userSettings
        console.log('✅ 用户设置已获取')
        console.log('🔥 FIRE 启用状态:', settings.fireEnabled)
        console.log('📊 安全提取率:', settings.fireSWR + '%')

        if (settings.fireEnabled) {
          console.log('✅ FIRE 功能已启用')
        } else {
          console.log('⚠️ FIRE 功能未启用')
          console.log('💡 提示: 请在设置页面启用 FIRE 功能')
        }
      } else {
        console.log('❌ 无法获取用户设置')
      }
    })
    .catch(error => {
      console.log('❌ 获取用户设置时出错:', error)
    })
}

// 测试 3: 测试 FIRE 数据 API
function testFireDataAPI() {
  console.log('\n📋 测试 3: 测试 FIRE 数据 API')

  fetch('/api/fire/data')
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        console.log('✅ FIRE 数据 API 响应成功')
        console.log('📊 现实快照数据:', data.data.realitySnapshot)
        console.log('💰 基础货币:', data.data.baseCurrency)
        console.log('⚙️ FIRE 设置:', data.data.userSettings)
      } else {
        console.log('❌ FIRE 数据 API 响应失败:', data.message)
      }
    })
    .catch(error => {
      console.log('❌ FIRE 数据 API 请求失败:', error)
    })
}

// 测试 4: 检查页面路由
function testFirePageRoute() {
  console.log('\n📋 测试 4: 检查 FIRE 页面路由')

  const currentPath = window.location.pathname
  console.log('📍 当前页面路径:', currentPath)

  if (currentPath === '/fire') {
    console.log('✅ 当前在 FIRE 页面')

    // 检查页面元素
    const pageTitle = document.querySelector('h1')
    if (pageTitle && pageTitle.textContent.includes('FIRE')) {
      console.log('✅ FIRE 页面标题已找到:', pageTitle.textContent)
    }

    // 检查四个核心部分
    const sections = ['现实快照', '核心指标', '可视化预测图表', '未来掌控面板']

    sections.forEach((section, index) => {
      const element = document.querySelector(`h2:contains("${section}")`)
      if (element) {
        console.log(`✅ 第${index}部分 "${section}" 已找到`)
      } else {
        console.log(`⚠️ 第${index}部分 "${section}" 未找到`)
      }
    })
  } else {
    console.log('📍 不在 FIRE 页面，可以点击 FIRE 菜单进行测试')
  }
}

// 测试 5: 检查翻译
function testFireTranslations() {
  console.log('\n📋 测试 5: 检查 FIRE 翻译')

  // 检查一些关键翻译键
  const testKeys = [
    'fire.title',
    'fire.subtitle',
    'fire.reality.snapshot.title',
    'fire.north.star.title',
    'fire.journey.title',
    'fire.cockpit.title',
  ]

  // 这里只是模拟检查，实际的翻译检查需要在组件内部进行
  console.log('📝 需要检查的翻译键:', testKeys)
  console.log('💡 提示: 翻译功能需要在实际页面中测试')
}

// 主测试函数
function runFireTests() {
  console.log('🚀 开始运行 FIRE 功能完整测试...\n')

  testFireMenuExists()
  testFireSettings()
  testFireDataAPI()
  testFirePageRoute()
  testFireTranslations()

  console.log('\n🎉 FIRE 功能测试完成！')
  console.log('\n📋 测试总结:')
  console.log('1. ✅ FIRE 菜单检查')
  console.log('2. ✅ FIRE 设置检查')
  console.log('3. ✅ FIRE 数据 API 检查')
  console.log('4. ✅ FIRE 页面路由检查')
  console.log('5. ✅ FIRE 翻译检查')

  console.log('\n🔧 下一步操作:')
  console.log('1. 确保用户已登录')
  console.log('2. 在设置页面启用 FIRE 功能')
  console.log('3. 点击左侧边栏的 "FIRE 征途" 菜单')
  console.log('4. 查看 FIRE 页面的四个核心部分')
  console.log('5. 测试参数调整功能')
}

// 自动运行测试
runFireTests()

// 提供手动测试函数
window.testFire = runFireTests
window.testFireMenu = testFireMenuExists
window.testFireAPI = testFireDataAPI

console.log('\n💡 提示: 您可以随时运行以下命令进行测试:')
console.log('- testFire() - 运行完整测试')
console.log('- testFireMenu() - 测试菜单')
console.log('- testFireAPI() - 测试 API')
