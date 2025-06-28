/**
 * 简化测试：验证贷款还款日期计算函数的格式
 */

import { calculateLoanPaymentDateForPeriod } from '../src/lib/utils/format'

function testLoanDateFormat() {
  console.log('🔍 测试贷款还款日期格式...\n')

  // 测试日期计算函数
  const contractStartDate = new Date('2024-01-15')
  const paymentDay = 15

  console.log(`📅 合约开始日期: ${contractStartDate.toISOString()}`)
  
  // 测试第一期
  const period1Date = calculateLoanPaymentDateForPeriod(contractStartDate, paymentDay, 1)
  console.log(`✅ 第1期还款日期: ${period1Date.toISOString()}`)
  
  // 测试第二期
  const period2Date = calculateLoanPaymentDateForPeriod(contractStartDate, paymentDay, 2)
  console.log(`✅ 第2期还款日期: ${period2Date.toISOString()}`)
  
  // 测试第三期
  const period3Date = calculateLoanPaymentDateForPeriod(contractStartDate, paymentDay, 3)
  console.log(`✅ 第3期还款日期: ${period3Date.toISOString()}`)

  // 检查时间格式一致性
  const dates = [period1Date, period2Date, period3Date]
  const timeFormats = new Set<string>()
  
  dates.forEach((date, index) => {
    const timePattern = date.toISOString().split('T')[1]
    timeFormats.add(timePattern)
    console.log(`  期数 ${index + 1}: ${timePattern}`)
  })

  console.log(`\n🎯 发现的时间格式: ${Array.from(timeFormats).join(', ')}`)
  
  if (timeFormats.size === 1 && Array.from(timeFormats)[0] === '00:00:00.000Z') {
    console.log('✅ 所有贷款还款日期的时间格式一致，且与单笔创建交易格式相同！')
  } else {
    console.log('❌ 发现时间格式不一致的问题')
  }
}

// 运行测试
testLoanDateFormat()
console.log('\n✅ 贷款日期格式测试完成')
