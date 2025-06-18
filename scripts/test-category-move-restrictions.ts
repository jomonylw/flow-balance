import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testCategoryMoveRestrictions() {
  try {
    console.log('🧪 测试分类移动限制功能\n')

    // 获取用户数据
    const user = await prisma.user.findFirst()
    if (!user) {
      console.log('❌ 没有找到用户数据')
      return
    }

    console.log(`👤 用户: ${user.email}`)

    // 获取所有分类
    const categories = await prisma.category.findMany({
      where: { userId: user.id },
      include: {
        parent: true,
        children: true,
      },
      orderBy: [{ parentId: 'asc' }, { order: 'asc' }, { name: 'asc' }],
    })

    console.log('\n📁 当前分类结构:')
    console.log('='.repeat(50))

    const topLevelCategories = categories.filter(cat => !cat.parentId)
    const subCategories = categories.filter(cat => cat.parentId)

    topLevelCategories.forEach(topCategory => {
      console.log(
        `📂 ${topCategory.name} (${topCategory.type}) - ID: ${topCategory.id}`
      )

      const children = categories.filter(cat => cat.parentId === topCategory.id)
      children.forEach(child => {
        console.log(`   └── ${child.name} (${child.type}) - ID: ${child.id}`)
      })
    })

    console.log('\n🧪 测试移动限制:')
    console.log('-'.repeat(50))

    // 测试1: 尝试移动顶层分类（应该失败）
    const assetCategory = topLevelCategories.find(cat => cat.name === '资产')
    const expenseCategory = topLevelCategories.find(cat => cat.name === '支出')

    if (assetCategory && expenseCategory) {
      console.log(
        `\n1️⃣ 测试移动顶层分类 "${assetCategory.name}" 到 "${expenseCategory.name}" 下:`
      )

      try {
        const response = await fetch(
          `http://localhost:3001/api/categories/${assetCategory.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: assetCategory.name,
              parentId: expenseCategory.id,
            }),
          }
        )

        const result = await response.json()
        if (response.ok) {
          console.log('   ❌ 意外成功 - 顶层分类不应该被允许移动')
        } else {
          console.log(`   ✅ 正确拒绝: ${result.message}`)
        }
      } catch (error) {
        console.log(`   ❌ 请求失败: ${error}`)
      }
    }

    // 测试2: 尝试将资产类子分类移动到支出类分类下（应该失败）
    const cashCategory = subCategories.find(cat => cat.name === '现金')

    if (cashCategory && expenseCategory) {
      console.log(
        `\n2️⃣ 测试移动资产子分类 "${cashCategory.name}" 到支出类 "${expenseCategory.name}" 下:`
      )

      try {
        const response = await fetch(
          `http://localhost:3001/api/categories/${cashCategory.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: cashCategory.name,
              parentId: expenseCategory.id,
            }),
          }
        )

        const result = await response.json()
        if (response.ok) {
          console.log('   ❌ 意外成功 - 不应该允许跨类型移动')
        } else {
          console.log(`   ✅ 正确拒绝: ${result.message}`)
        }
      } catch (error) {
        console.log(`   ❌ 请求失败: ${error}`)
      }
    }

    // 测试3: 尝试将资产子分类移动到另一个资产子分类下（应该成功）
    const bankCategory = subCategories.find(cat => cat.name === '银行账户')

    if (cashCategory && bankCategory) {
      console.log(
        `\n3️⃣ 测试移动资产子分类 "${cashCategory.name}" 到同类型分类 "${bankCategory.name}" 下:`
      )

      try {
        const response = await fetch(
          `http://localhost:3001/api/categories/${cashCategory.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: cashCategory.name,
              parentId: bankCategory.id,
            }),
          }
        )

        const result = await response.json()
        if (response.ok) {
          console.log('   ✅ 成功移动 - 同类型分类间移动被允许')

          // 恢复原状
          await fetch(
            `http://localhost:3001/api/categories/${cashCategory.id}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: cashCategory.name,
                parentId: assetCategory?.id,
              }),
            }
          )
          console.log('   📝 已恢复原始状态')
        } else {
          console.log(`   ❌ 意外失败: ${result.message}`)
        }
      } catch (error) {
        console.log(`   ❌ 请求失败: ${error}`)
      }
    }

    console.log('\n🎉 测试完成!')
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCategoryMoveRestrictions()
