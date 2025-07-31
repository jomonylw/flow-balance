/**
 * 对比 FIRE API 和 Dashboard API 的净资产计算结果
 */

const API_BASE_URL = 'http://localhost:3001'

async function compareNetWorth() {
  console.log('🔍 对比 FIRE API 和 Dashboard API 的净资产计算结果...')

  try {
    // 模拟已登录状态（使用浏览器的 cookie）
    const cookieHeader =
      'next-auth.session-token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJjbWRtOXg0aXkwMDAwMm14Mmx4N2loaTMzIiwiaWF0IjoxNzIyMTU5NTYwLCJleHAiOjE3MjQ3NTE1NjB9.example'

    console.log('📊 获取 Dashboard 净资产数据...')
    const dashboardResponse = await fetch(
      `${API_BASE_URL}/api/dashboard/summary`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader,
        },
      }
    )

    console.log('🔥 获取 FIRE 净资产数据...')
    const fireResponse = await fetch(`${API_BASE_URL}/api/fire/data`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
    })

    if (dashboardResponse.ok && fireResponse.ok) {
      const dashboardData = await dashboardResponse.json()
      const fireData = await fireResponse.json()

      const dashboardNetWorth = dashboardData.data?.netWorth?.amount || 0
      const fireNetWorth = fireData.data?.realitySnapshot?.currentNetWorth || 0

      console.log('\n📈 净资产对比结果:')
      console.log(
        `  Dashboard API: ¥${dashboardNetWorth.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
      )
      console.log(
        `  FIRE API:      ¥${fireNetWorth.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
      )

      const difference = Math.abs(dashboardNetWorth - fireNetWorth)
      const tolerance = 0.01 // 1分钱的容差

      if (difference <= tolerance) {
        console.log('✅ 净资产计算结果一致！')
        console.log(`   差异: ¥${difference.toFixed(2)} (在容差范围内)`)
      } else {
        console.log('❌ 净资产计算结果不一致！')
        console.log(
          `   差异: ¥${difference.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
        )
      }

      // 显示其他对比信息
      console.log('\n📋 详细对比:')
      console.log('Dashboard API:')
      console.log(
        `  - 总资产: ¥${(dashboardData.data?.totalAssets?.amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
      )
      console.log(
        `  - 总负债: ¥${(dashboardData.data?.totalLiabilities?.amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
      )

      console.log('FIRE API:')
      console.log(
        `  - 总资产: ¥${(fireData.data?.realitySnapshot?.totalAssets || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
      )
      console.log(
        `  - 总负债: ¥${(fireData.data?.realitySnapshot?.totalLiabilities || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
      )
      console.log(
        `  - CAGR: ${fireData.data?.realitySnapshot?.historicalAnnualReturn || 0}%`
      )
    } else {
      console.error('❌ API 调用失败')
      if (!dashboardResponse.ok) {
        console.error(
          `Dashboard API: ${dashboardResponse.status} ${dashboardResponse.statusText}`
        )
      }
      if (!fireResponse.ok) {
        console.error(
          `FIRE API: ${fireResponse.status} ${fireResponse.statusText}`
        )
      }
    }
  } catch (error) {
    console.error('❌ 对比过程中发生错误:', error.message)
  }
}

// 运行对比
compareNetWorth()
