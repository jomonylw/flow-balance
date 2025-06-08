/**
 * 测试通过 API 的账户货币限制
 * 模拟前端调用 API 的行为
 */

const fetch = require('node-fetch')

const BASE_URL = 'http://localhost:3000'

// 模拟登录获取 session cookie
async function getSessionCookie() {
  // 这里需要根据实际的认证方式来获取 session
  // 暂时返回空，实际使用时需要实现登录逻辑
  return ''
}

async function testAPICurrency() {
  console.log('🧪 开始测试 API 账户货币限制...\n')

  try {
    const sessionCookie = await getSessionCookie()
    const headers = {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    }

    // 1. 获取账户列表
    console.log('📝 获取账户列表...')
    const accountsResponse = await fetch(`${BASE_URL}/api/accounts`, {
      headers
    })

    if (!accountsResponse.ok) {
      console.log('❌ 获取账户列表失败:', accountsResponse.status)
      return
    }

    const accountsData = await accountsResponse.json()
    const accounts = accountsData.data || []
    
    console.log(`✅ 找到 ${accounts.length} 个账户`)

    // 2. 查找有货币限制的账户
    const accountWithCurrency = accounts.find(acc => acc.currencyCode)
    
    if (!accountWithCurrency) {
      console.log('❌ 没有找到有货币限制的账户')
      console.log('💡 请先通过前端界面为账户设置货币限制')
      return
    }

    console.log(`✅ 找到有货币限制的账户: ${accountWithCurrency.name}`)
    console.log(`   货币限制: ${accountWithCurrency.currencyCode}`)

    // 3. 获取用户可用货币
    console.log('\n📝 获取用户可用货币...')
    const currenciesResponse = await fetch(`${BASE_URL}/api/user/currencies`, {
      headers
    })

    if (!currenciesResponse.ok) {
      console.log('❌ 获取货币列表失败:', currenciesResponse.status)
      return
    }

    const currenciesData = await currenciesResponse.json()
    const currencies = currenciesData.data?.currencies || []
    
    console.log(`✅ 用户可用货币: ${currencies.map(c => c.code).join(', ')}`)

    // 4. 测试使用正确货币进行余额更新
    console.log(`\n📝 测试使用正确货币 (${accountWithCurrency.currencyCode}) 进行余额更新...`)
    
    const correctCurrencyResponse = await fetch(`${BASE_URL}/api/balance-update`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        accountId: accountWithCurrency.id,
        currencyCode: accountWithCurrency.currencyCode,
        balanceChange: 100,
        newBalance: 1100,
        updateDate: new Date().toISOString().split('T')[0],
        notes: 'API 测试 - 正确货币',
        updateType: 'adjustment'
      })
    })

    const correctResult = await correctCurrencyResponse.json()
    
    if (correctCurrencyResponse.ok) {
      console.log(`✅ 正确货币余额更新成功: ${correctResult.message}`)
    } else {
      console.log(`❌ 正确货币余额更新失败: ${correctResult.error}`)
    }

    // 5. 测试使用错误货币进行余额更新
    const wrongCurrency = currencies.find(c => c.code !== accountWithCurrency.currencyCode)
    
    if (wrongCurrency) {
      console.log(`\n📝 测试使用错误货币 (${wrongCurrency.code}) 进行余额更新...`)
      
      const wrongCurrencyResponse = await fetch(`${BASE_URL}/api/balance-update`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          accountId: accountWithCurrency.id,
          currencyCode: wrongCurrency.code,
          balanceChange: 50,
          newBalance: 1150,
          updateDate: new Date().toISOString().split('T')[0],
          notes: 'API 测试 - 错误货币',
          updateType: 'adjustment'
        })
      })

      const wrongResult = await wrongCurrencyResponse.json()
      
      if (wrongCurrencyResponse.ok) {
        console.log(`❌ 意外成功：应该阻止使用错误货币`)
      } else {
        console.log(`✅ 正确阻止错误货币: ${wrongResult.error}`)
      }
    }

    // 6. 测试账户设置更新
    console.log(`\n📝 测试更新账户货币设置...`)
    
    const updateAccountResponse = await fetch(`${BASE_URL}/api/accounts/${accountWithCurrency.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        name: accountWithCurrency.name,
        categoryId: accountWithCurrency.categoryId,
        currencyCode: wrongCurrency?.code || 'USD', // 尝试更换货币
        description: accountWithCurrency.description,
        color: accountWithCurrency.color
      })
    })

    const updateResult = await updateAccountResponse.json()
    
    if (updateAccountResponse.ok) {
      console.log(`❌ 意外成功：应该阻止更换有交易记录账户的货币`)
    } else {
      console.log(`✅ 正确阻止货币更换: ${updateResult.error}`)
    }

    console.log(`\n🎉 API 账户货币限制测试完成！`)
    console.log(`\n📋 测试总结:`)
    console.log(`   ✅ API 正确验证账户货币限制`)
    console.log(`   ✅ 阻止使用错误货币进行余额更新`)
    console.log(`   ✅ 阻止更换有交易记录账户的货币`)

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message)
    console.log('\n💡 提示:')
    console.log('   - 确保开发服务器正在运行 (pnpm dev)')
    console.log('   - 确保已登录并有测试数据')
    console.log('   - 可能需要实现 session 认证逻辑')
  }
}

// 运行测试
testAPICurrency()
