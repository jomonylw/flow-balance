/**
 * 添加示例汇率数据的脚本
 * 用于测试多货币功能
 */

const sampleRates = [
  {
    fromCurrency: 'EUR',
    toCurrency: 'USD',
    rate: 1.08,
    effectiveDate: '2024-01-01',
    notes: '欧元兑美元汇率',
  },
  {
    fromCurrency: 'CNY',
    toCurrency: 'USD',
    rate: 0.14,
    effectiveDate: '2024-01-01',
    notes: '人民币兑美元汇率',
  },
  {
    fromCurrency: 'JPY',
    toCurrency: 'USD',
    rate: 0.0067,
    effectiveDate: '2024-01-01',
    notes: '日元兑美元汇率',
  },
]

async function addSampleRates() {
  try {
    console.log('🔄 开始添加示例汇率数据...')

    for (const rate of sampleRates) {
      const response = await fetch('http://localhost:3000/api/exchange-rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 这里需要添加认证头，实际使用时需要登录获取token
        },
        body: JSON.stringify(rate),
      })

      if (response.ok) {
        const data = await response.json()
        console.log(
          `✅ 成功添加汇率: ${rate.fromCurrency} → ${rate.toCurrency} = ${rate.rate}`
        )
      } else {
        const error = await response.json()
        console.error(
          `❌ 添加汇率失败: ${rate.fromCurrency} → ${rate.toCurrency}`,
          error
        )
      }
    }

    console.log('✅ 示例汇率数据添加完成!')
  } catch (error) {
    console.error('❌ 添加示例汇率数据失败:', error)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  addSampleRates()
}

module.exports = { sampleRates, addSampleRates }
