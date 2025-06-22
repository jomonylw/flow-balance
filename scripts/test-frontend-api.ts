/**
 * 测试前端API调用
 */

async function testFrontendAPI() {
  try {
    console.log('🧪 测试前端API调用...\n')

    // 模拟登录获取cookie（这里简化处理）
    const baseUrl = 'http://localhost:3002'

    // 1. 获取当前汇率列表
    console.log('📊 获取当前汇率列表...')
    const getRatesResponse = await fetch(`${baseUrl}/api/exchange-rates`)

    if (getRatesResponse.ok) {
      const ratesData = await getRatesResponse.json()
      const rates = ratesData.data || []

      console.log(`  总计: ${rates.length} 条汇率`)

      const userRates = rates.filter((rate: any) => rate.type !== 'AUTO')
      const autoRates = rates.filter((rate: any) => rate.type === 'AUTO')

      console.log(`  👤 用户输入: ${userRates.length} 条`)
      userRates.forEach((rate: any) => {
        console.log(
          `    ${rate.fromCurrency} → ${rate.toCurrency}: ${rate.rate}`
        )
      })

      console.log(`  🤖 自动生成: ${autoRates.length} 条`)
      autoRates.forEach((rate: any) => {
        console.log(
          `    ${rate.fromCurrency} → ${rate.toCurrency}: ${rate.rate}`
        )
      })

      // 2. 测试更新汇率
      const targetRate = userRates.find(
        (rate: any) => rate.fromCurrency === 'CNY' && rate.toCurrency === 'USD'
      )

      if (targetRate) {
        console.log(
          `\n🔧 测试更新汇率: ${targetRate.fromCurrency} → ${targetRate.toCurrency}`
        )
        console.log(`  当前汇率: ${targetRate.rate}`)

        const newRate = 0.16 // 更新到新值
        console.log(`  新汇率: ${newRate}`)

        const updateResponse = await fetch(
          `${baseUrl}/api/exchange-rates/${targetRate.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              rate: newRate,
              effectiveDate: targetRate.effectiveDate,
              notes: targetRate.notes,
            }),
          }
        )

        if (updateResponse.ok) {
          console.log('  ✅ 汇率更新成功')

          // 3. 重新获取汇率列表验证
          console.log('\n📊 重新获取汇率列表验证...')
          const verifyResponse = await fetch(`${baseUrl}/api/exchange-rates`)

          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json()
            const verifyRates = verifyData.data || []

            const verifyUserRates = verifyRates.filter(
              (rate: any) => rate.type !== 'AUTO'
            )
            const verifyAutoRates = verifyRates.filter(
              (rate: any) => rate.type === 'AUTO'
            )

            console.log(`  总计: ${verifyRates.length} 条汇率`)
            console.log(`  👤 用户输入: ${verifyUserRates.length} 条`)
            console.log(`  🤖 自动生成: ${verifyAutoRates.length} 条`)

            // 验证更新的汇率
            const updatedRate = verifyUserRates.find(
              (rate: any) => rate.id === targetRate.id
            )
            if (updatedRate && Math.abs(updatedRate.rate - newRate) < 0.0001) {
              console.log('  ✅ 汇率更新验证成功')
            } else {
              console.log('  ❌ 汇率更新验证失败')
            }

            // 验证反向汇率
            const reverseRate = verifyAutoRates.find(
              (rate: any) =>
                rate.fromCurrency === 'USD' && rate.toCurrency === 'CNY'
            )
            if (reverseRate) {
              const expectedReverse = 1 / newRate
              const actualReverse = reverseRate.rate
              console.log('  🔍 反向汇率验证:')
              console.log(`    期望: ${expectedReverse.toFixed(6)}`)
              console.log(`    实际: ${actualReverse.toFixed(6)}`)
              console.log(
                `    匹配: ${Math.abs(expectedReverse - actualReverse) < 0.000001 ? '✅' : '❌'}`
              )
            }

            console.log('\n✅ 前端API测试完成！')
          } else {
            console.log('  ❌ 重新获取汇率失败')
          }
        } else {
          const errorData = await updateResponse.json()
          console.log(`  ❌ 汇率更新失败: ${errorData.error}`)
        }
      } else {
        console.log('  ❌ 未找到CNY→USD汇率')
      }
    } else {
      console.log('❌ 获取汇率列表失败')
    }
  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

// 运行测试
testFrontendAPI()
