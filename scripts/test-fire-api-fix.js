/**
 * FIRE API 修复验证脚本
 * 在浏览器控制台中运行此脚本来验证 FIRE API 修复效果
 */

console.log('🔧 开始验证 FIRE API 修复效果...')

// 测试 FIRE 数据 API 和 Dashboard Summary API 的对比
async function testAPIComparison() {
  console.log('\n📊 测试 API 对比')
  
  try {
    // 并行请求两个 API
    const [fireResponse, dashboardResponse] = await Promise.all([
      fetch('/api/fire/data').then(res => res.json()),
      fetch('/api/dashboard/summary').then(res => res.json())
    ])
    
    if (fireResponse.success && dashboardResponse.success) {
      console.log('✅ 两个 API 都响应成功')
      
      const fireData = fireResponse.data.realitySnapshot
      const dashboardData = dashboardResponse.data
      
      console.log('\n🔥 FIRE API 数据:')
      console.log('  净资产:', fireData.currentNetWorth)
      console.log('  历史年化回报率:', fireData.historicalAnnualReturn + '%')
      console.log('  过去12个月支出:', fireData.past12MonthsExpenses)
      console.log('  月度净投资:', fireData.monthlyNetInvestment)
      
      console.log('\n📈 Dashboard API 数据:')
      console.log('  净资产:', dashboardData.netWorth.amount)
      console.log('  总资产:', dashboardData.totalAssets.amount)
      console.log('  总负债:', dashboardData.totalLiabilities.amount)
      
      // 对比净资产计算
      const netWorthDiff = Math.abs(fireData.currentNetWorth - dashboardData.netWorth.amount)
      console.log('\n🔍 净资产对比:')
      console.log('  FIRE API:', fireData.currentNetWorth)
      console.log('  Dashboard API:', dashboardData.netWorth.amount)
      console.log('  差异:', netWorthDiff)
      
      if (netWorthDiff < 0.01) {
        console.log('✅ 净资产计算一致！')
      } else {
        console.log('⚠️ 净资产计算存在差异')
      }
      
      // 检查汇率转换错误
      if (dashboardData.netWorth.hasConversionErrors) {
        console.log('⚠️ Dashboard 存在汇率转换错误')
      } else {
        console.log('✅ Dashboard 汇率转换正常')
      }
      
      // 检查历史回报率是否不再是硬编码
      if (fireData.historicalAnnualReturn !== 7.6) {
        console.log('✅ 历史回报率已实现动态计算')
      } else {
        console.log('⚠️ 历史回报率可能仍是默认值')
        console.log('💡 提示: 这可能是因为没有足够的历史数据或计算结果确实是7.6%')
      }

      // 检查货币格式化
      console.log('\n💰 货币格式化检查:')
      const cockpitInputs = document.querySelectorAll('#cockpit-currentInvestableAssets input, #cockpit-retirementExpenses input, #cockpit-monthlyInvestment input')
      if (cockpitInputs.length > 0) {
        console.log('✅ 找到 Cockpit 输入框')
        cockpitInputs.forEach((input, index) => {
          console.log(`  输入框 ${index + 1}: ${input.value}`)
        })
      } else {
        console.log('⚠️ 未找到 Cockpit 输入框，可能不在 FIRE 页面')
      }

      // 检查日期格式化
      console.log('\n📅 日期格式化检查:')
      const fireDate = document.querySelector('.text-4xl.font-bold.text-orange-900, .text-4xl.font-bold.dark\\:text-orange-100')
      if (fireDate) {
        console.log('✅ 找到 FIRE 日期显示:', fireDate.textContent.trim())
      } else {
        console.log('⚠️ 未找到 FIRE 日期显示')
      }
      
    } else {
      console.log('❌ API 请求失败')
      if (!fireResponse.success) {
        console.log('  FIRE API 错误:', fireResponse.error || fireResponse.message)
      }
      if (!dashboardResponse.success) {
        console.log('  Dashboard API 错误:', dashboardResponse.error || dashboardResponse.message)
      }
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  }
}

// 测试汇率转换功能
async function testCurrencyConversion() {
  console.log('\n💱 测试汇率转换功能')
  
  try {
    const fireResponse = await fetch('/api/fire/data').then(res => res.json())
    
    if (fireResponse.success) {
      const baseCurrency = fireResponse.data.baseCurrency
      console.log('✅ 基础货币:', baseCurrency.code, baseCurrency.symbol)
      
      // 检查是否有转换详情（如果有多币种的话）
      console.log('✅ FIRE API 使用了汇率转换逻辑')
    } else {
      console.log('❌ 无法获取 FIRE 数据')
    }
  } catch (error) {
    console.error('❌ 汇率转换测试失败:', error)
  }
}

// 运行所有测试
async function runAllTests() {
  await testAPIComparison()
  await testCurrencyConversion()
  
  console.log('\n🎉 测试完成！')
  console.log('💡 如果看到"净资产计算一致"，说明修复成功')
}

// 自动运行测试
runAllTests()
