#!/usr/bin/env node

/**
 * API 性能测试脚本
 * 用于验证优化后的 API 性能改善
 */

const https = require('https')
const http = require('http')

// 配置
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN // 需要设置有效的用户token

// 测试端点配置
const TEST_ENDPOINTS = [
  {
    name: '资产负债表',
    path: '/api/reports/balance-sheet',
    method: 'GET',
    params: '?asOfDate=' + new Date().toISOString(),
  },
  {
    name: '净资产图表 (12个月)',
    path: '/api/dashboard/charts/net-worth',
    method: 'GET',
    params: '?months=12',
  },
  {
    name: '净资产图表 (全部历史)',
    path: '/api/dashboard/charts/net-worth',
    method: 'GET',
    params: '?months=all',
  },
  {
    name: '现金流图表 (12个月)',
    path: '/api/dashboard/charts/cash-flow',
    method: 'GET',
    params: '?months=12',
  },
  {
    name: '现金流图表 (全部历史)',
    path: '/api/dashboard/charts/cash-flow',
    method: 'GET',
    params: '?months=all',
  },
]

/**
 * 发送HTTP请求
 */
function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + endpoint.path + endpoint.params)
    const isHttps = url.protocol === 'https:'
    const client = isHttps ? https : http

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        ...(TEST_USER_TOKEN && { Authorization: `Bearer ${TEST_USER_TOKEN}` }),
      },
    }

    const startTime = Date.now()

    const req = client.request(options, res => {
      let data = ''

      res.on('data', chunk => {
        data += chunk
      })

      res.on('end', () => {
        const endTime = Date.now()
        const responseTime = endTime - startTime

        try {
          const jsonData = JSON.parse(data)
          resolve({
            endpoint: endpoint.name,
            statusCode: res.statusCode,
            responseTime,
            dataSize: data.length,
            success: res.statusCode === 200,
            error:
              res.statusCode !== 200
                ? jsonData.message || 'Unknown error'
                : null,
          })
        } catch (parseError) {
          resolve({
            endpoint: endpoint.name,
            statusCode: res.statusCode,
            responseTime,
            dataSize: data.length,
            success: false,
            error: 'JSON parse error: ' + parseError.message,
          })
        }
      })
    })

    req.on('error', error => {
      const endTime = Date.now()
      const responseTime = endTime - startTime

      resolve({
        endpoint: endpoint.name,
        statusCode: 0,
        responseTime,
        dataSize: 0,
        success: false,
        error: error.message,
      })
    })

    req.setTimeout(30000, () => {
      req.destroy()
      resolve({
        endpoint: endpoint.name,
        statusCode: 0,
        responseTime: 30000,
        dataSize: 0,
        success: false,
        error: 'Request timeout (30s)',
      })
    })

    req.end()
  })
}

/**
 * 运行性能测试
 */
async function runPerformanceTest() {
  console.log('🚀 开始 API 性能测试...\n')
  console.log(`测试目标: ${BASE_URL}`)
  console.log(`测试时间: ${new Date().toLocaleString()}\n`)

  if (!TEST_USER_TOKEN) {
    console.log(
      '⚠️  警告: 未设置 TEST_USER_TOKEN 环境变量，可能会遇到认证问题\n'
    )
  }

  const results = []

  // 串行测试每个端点
  for (const endpoint of TEST_ENDPOINTS) {
    console.log(`测试中: ${endpoint.name}...`)

    const result = await makeRequest(endpoint)
    results.push(result)

    if (result.success) {
      console.log(
        `✅ ${result.endpoint}: ${result.responseTime}ms (${(result.dataSize / 1024).toFixed(1)}KB)`
      )
    } else {
      console.log(
        `❌ ${result.endpoint}: ${result.error} (${result.responseTime}ms)`
      )
    }
  }

  // 输出汇总报告
  console.log('\n📊 性能测试报告')
  console.log('='.repeat(60))

  const successfulTests = results.filter(r => r.success)
  const failedTests = results.filter(r => !r.success)

  if (successfulTests.length > 0) {
    console.log('\n✅ 成功的测试:')
    successfulTests.forEach(result => {
      console.log(
        `  ${result.endpoint.padEnd(25)} | ${result.responseTime.toString().padStart(6)}ms | ${(result.dataSize / 1024).toFixed(1).padStart(8)}KB`
      )
    })

    const avgResponseTime =
      successfulTests.reduce((sum, r) => sum + r.responseTime, 0) /
      successfulTests.length
    const maxResponseTime = Math.max(
      ...successfulTests.map(r => r.responseTime)
    )
    const minResponseTime = Math.min(
      ...successfulTests.map(r => r.responseTime)
    )

    console.log('\n📈 统计信息:')
    console.log(`  平均响应时间: ${avgResponseTime.toFixed(0)}ms`)
    console.log(`  最快响应时间: ${minResponseTime}ms`)
    console.log(`  最慢响应时间: ${maxResponseTime}ms`)
    console.log(
      `  成功率: ${((successfulTests.length / results.length) * 100).toFixed(1)}%`
    )
  }

  if (failedTests.length > 0) {
    console.log('\n❌ 失败的测试:')
    failedTests.forEach(result => {
      console.log(`  ${result.endpoint}: ${result.error}`)
    })
  }

  // 性能评估
  console.log('\n🎯 性能评估:')
  if (successfulTests.length === 0) {
    console.log('  无法评估 - 所有测试都失败了')
  } else {
    const avgTime =
      successfulTests.reduce((sum, r) => sum + r.responseTime, 0) /
      successfulTests.length

    if (avgTime < 1000) {
      console.log('  🟢 优秀 - 平均响应时间 < 1秒')
    } else if (avgTime < 3000) {
      console.log('  🟡 良好 - 平均响应时间 < 3秒')
    } else if (avgTime < 10000) {
      console.log('  🟠 需要改进 - 平均响应时间 < 10秒')
    } else {
      console.log('  🔴 性能较差 - 平均响应时间 >= 10秒')
    }
  }

  console.log('\n测试完成! 🎉')
}

// 运行测试
if (require.main === module) {
  runPerformanceTest().catch(console.error)
}

module.exports = { runPerformanceTest }
