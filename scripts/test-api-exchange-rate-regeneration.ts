/**
 * 测试真实API调用的汇率自动重新生成功能
 * 通过实际的HTTP请求验证API是否正确触发AUTO类型汇率的重新生成
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 模拟API调用的基础URL
const BASE_URL = 'http://localhost:3000'

async function makeApiCall(
  method: string,
  endpoint: string,
  body?: any,
  headers: Record<string, string> = {}
) {
  const url = `${BASE_URL}${endpoint}`
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  try {
    const response = await fetch(url, options)
    const data = await response.json()
    return { success: response.ok, status: response.status, data }
  } catch (error) {
    console.error(`API调用失败 ${method} ${endpoint}:`, error)
    return { success: false, status: 0, data: null, error }
  }
}

async function getAuthHeaders() {
  // 这里需要实际的认证逻辑，暂时返回空对象
  // 在真实环境中，你需要获取有效的认证token
  return {}
}

async function main() {
  console.log('🧪 开始测试真实API的汇率自动重新生成功能...\n')

  // 查找测试用户
  const user = await prisma.user.findFirst({
    where: { email: { contains: 'test' } },
  })

  if (!user) {
    console.log('❌ 未找到测试用户')
    return
  }

  console.log(`👤 使用测试用户: ${user.email} (${user.id})`)

  // 清理现有汇率数据
  console.log('\n🧹 清理现有汇率数据...')
  await prisma.exchangeRate.deleteMany({
    where: { userId: user.id },
  })

  const authHeaders = await getAuthHeaders()

  // 检查初始状态
  console.log('\n📊 检查初始汇率状态...')
  let currentRates = await prisma.exchangeRate.findMany({
    where: { userId: user.id },
  })
  console.log(`初始汇率数量: ${currentRates.length}`)

  // 测试1: 通过API创建汇率
  console.log('\n📝 测试1: 通过API创建汇率...')
  
  const createResult = await makeApiCall(
    'POST',
    '/api/exchange-rates',
    {
      fromCurrency: 'CNY',
      toCurrency: 'USD',
      rate: 0.14,
      effectiveDate: new Date().toISOString(),
      notes: 'API测试汇率',
    },
    authHeaders
  )

  console.log(`API创建汇率结果: ${createResult.success ? '成功' : '失败'}`)
  if (!createResult.success) {
    console.log(`错误: ${createResult.status} - ${JSON.stringify(createResult.data)}`)
  }

  // 检查创建后的汇率状态
  currentRates = await prisma.exchangeRate.findMany({
    where: { userId: user.id },
    include: {
      fromCurrencyRef: true,
      toCurrencyRef: true,
    },
    orderBy: { type: 'asc' },
  })

  console.log(`创建后汇率数量: ${currentRates.length}`)
  const userRates = currentRates.filter(r => r.type === 'USER')
  const autoRates = currentRates.filter(r => r.type === 'AUTO')
  console.log(`  - USER类型: ${userRates.length} 条`)
  console.log(`  - AUTO类型: ${autoRates.length} 条`)

  if (autoRates.length > 0) {
    console.log('  🎉 API创建汇率后成功生成了AUTO汇率!')
    autoRates.forEach(rate => {
      console.log(`    ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`)
    })
  } else {
    console.log('  ❌ API创建汇率后没有生成AUTO汇率')
  }

  // 测试2: 通过API批量创建汇率
  console.log('\n📝 测试2: 通过API批量创建汇率...')
  
  const batchResult = await makeApiCall(
    'PUT',
    '/api/exchange-rates',
    {
      rates: [
        {
          fromCurrency: 'EUR',
          toCurrency: 'USD',
          rate: 1.08,
          effectiveDate: new Date().toISOString(),
          notes: 'API批量测试汇率1',
        },
        {
          fromCurrency: 'GBP',
          toCurrency: 'USD',
          rate: 1.25,
          effectiveDate: new Date().toISOString(),
          notes: 'API批量测试汇率2',
        },
      ],
    },
    authHeaders
  )

  console.log(`API批量创建汇率结果: ${batchResult.success ? '成功' : '失败'}`)
  if (!batchResult.success) {
    console.log(`错误: ${batchResult.status} - ${JSON.stringify(batchResult.data)}`)
  }

  // 检查批量创建后的汇率状态
  currentRates = await prisma.exchangeRate.findMany({
    where: { userId: user.id },
    include: {
      fromCurrencyRef: true,
      toCurrencyRef: true,
    },
    orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
  })

  console.log(`批量创建后汇率数量: ${currentRates.length}`)
  const userRates2 = currentRates.filter(r => r.type === 'USER')
  const autoRates2 = currentRates.filter(r => r.type === 'AUTO')
  console.log(`  - USER类型: ${userRates2.length} 条`)
  console.log(`  - AUTO类型: ${autoRates2.length} 条`)

  if (autoRates2.length > autoRates.length) {
    console.log('  🎉 API批量创建汇率后成功重新生成了AUTO汇率!')
  } else {
    console.log('  ❌ API批量创建汇率后没有重新生成AUTO汇率')
  }

  // 测试3: 通过API更新汇率
  if (userRates2.length > 0) {
    console.log('\n📝 测试3: 通过API更新汇率...')
    
    const rateToUpdate = userRates2[0]
    const updateResult = await makeApiCall(
      'PUT',
      `/api/exchange-rates/${rateToUpdate.id}`,
      {
        rate: 0.16,
        notes: 'API更新测试',
      },
      authHeaders
    )

    console.log(`API更新汇率结果: ${updateResult.success ? '成功' : '失败'}`)
    if (!updateResult.success) {
      console.log(`错误: ${updateResult.status} - ${JSON.stringify(updateResult.data)}`)
    }

    // 检查更新后的汇率状态
    const ratesAfterUpdate = await prisma.exchangeRate.findMany({
      where: { userId: user.id, type: 'AUTO' },
    })

    console.log(`更新后AUTO汇率数量: ${ratesAfterUpdate.length}`)
    if (ratesAfterUpdate.length > 0) {
      console.log('  🎉 API更新汇率后成功重新生成了AUTO汇率!')
    } else {
      console.log('  ❌ API更新汇率后没有重新生成AUTO汇率')
    }
  }

  // 测试4: 通过API删除汇率
  if (userRates2.length > 1) {
    console.log('\n📝 测试4: 通过API删除汇率...')
    
    const rateToDelete = userRates2[1]
    const deleteResult = await makeApiCall(
      'DELETE',
      `/api/exchange-rates/${rateToDelete.id}`,
      null,
      authHeaders
    )

    console.log(`API删除汇率结果: ${deleteResult.success ? '成功' : '失败'}`)
    if (!deleteResult.success) {
      console.log(`错误: ${deleteResult.status} - ${JSON.stringify(deleteResult.data)}`)
    }

    // 检查删除后的汇率状态
    const ratesAfterDelete = await prisma.exchangeRate.findMany({
      where: { userId: user.id },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    })

    console.log(`删除后汇率数量: ${ratesAfterDelete.length}`)
    const finalUserRates = ratesAfterDelete.filter(r => r.type === 'USER')
    const finalAutoRates = ratesAfterDelete.filter(r => r.type === 'AUTO')
    console.log(`  - USER类型: ${finalUserRates.length} 条`)
    console.log(`  - AUTO类型: ${finalAutoRates.length} 条`)

    if (finalAutoRates.length > 0) {
      console.log('  🎉 API删除汇率后成功重新生成了AUTO汇率!')
    } else {
      console.log('  ❌ API删除汇率后没有重新生成AUTO汇率')
    }
  }

  console.log('\n✅ API测试完成!')
  
  // 显示最终状态
  console.log('\n📊 最终汇率状态:')
  const finalRates = await prisma.exchangeRate.findMany({
    where: { userId: user.id },
    include: {
      fromCurrencyRef: true,
      toCurrencyRef: true,
    },
    orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
  })

  console.log(`总计: ${finalRates.length} 条汇率`)
  finalRates.forEach(rate => {
    console.log(`  [${rate.type}] ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`)
  })
}

main()
  .catch(e => {
    console.error('❌ API测试失败:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
