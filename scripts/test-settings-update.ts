#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testSettingsUpdate() {
  try {
    console.log('🧪 Testing settings update functionality...')

    // 查找第一个用户
    const user = await prisma.user.findFirst()
    if (!user) {
      console.log('❌ No users found in database')
      return
    }

    console.log(`📋 Testing with user: ${user.email}`)

    // 获取或创建用户设置
    let userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true },
    })

    if (!userSettings) {
      console.log('📝 Creating new user settings...')

      // 获取USD货币
      const usdCurrency = await prisma.currency.findFirst({
        where: { code: 'USD', createdBy: null },
      })

      if (!usdCurrency) {
        console.log('❌ USD currency not found')
        return
      }

      userSettings = await prisma.userSettings.create({
        data: {
          userId: user.id,
          baseCurrencyId: usdCurrency.id,
          dateFormat: 'YYYY-MM-DD',
          theme: 'system',
          language: 'zh',
        },
        include: { baseCurrency: true },
      })
    }

    console.log('✅ Current settings:')
    console.log(`   - Base Currency: ${userSettings.baseCurrency?.code}`)
    console.log(`   - Date Format: ${userSettings.dateFormat}`)
    console.log(`   - Theme: ${userSettings.theme}`)
    console.log(`   - Language: ${userSettings.language}`)

    // 测试更新设置
    console.log('\n🔄 Testing settings update...')
    const updatedSettings = await prisma.userSettings.update({
      where: { userId: user.id },
      data: {
        theme: 'dark',
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
      },
      include: { baseCurrency: true },
    })

    console.log('✅ Updated settings:')
    console.log(`   - Base Currency: ${updatedSettings.baseCurrency?.code}`)
    console.log(`   - Date Format: ${updatedSettings.dateFormat}`)
    console.log(`   - Theme: ${updatedSettings.theme}`)
    console.log(`   - Language: ${updatedSettings.language}`)

    // 恢复原始设置
    await prisma.userSettings.update({
      where: { userId: user.id },
      data: {
        theme: userSettings.theme,
        language: userSettings.language,
        dateFormat: userSettings.dateFormat,
      },
    })

    console.log('\n✅ Settings test completed successfully!')
  } catch (error) {
    console.error('❌ Settings test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSettingsUpdate()
