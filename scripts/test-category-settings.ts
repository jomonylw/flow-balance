import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testCategorySettings() {
  try {
    console.log('测试分类设置功能...\n')

    // 获取用户数据
    const user = await prisma.user.findFirst()
    if (!user) {
      console.log('没有找到用户数据')
      return
    }

    console.log(`用户: ${user.email}`)

    // 获取所有分类
    const categories = await prisma.category.findMany({
      where: { userId: user.id },
      include: {
        parent: true,
        children: true,
      },
      orderBy: [{ parentId: 'asc' }, { order: 'asc' }, { name: 'asc' }],
    })

    console.log(`\n分类总数: ${categories.length}`)

    // 按层级显示分类
    const topLevelCategories = categories.filter(cat => !cat.parentId)

    console.log('\n分类层级结构:')
    console.log('='.repeat(80))

    topLevelCategories.forEach(topCategory => {
      console.log(
        `📁 ${topCategory.name} (${topCategory.type || '未设置类型'})`
      )

      const children = categories.filter(cat => cat.parentId === topCategory.id)
      children.forEach(child => {
        console.log(
          `  └── ${child.name} (${child.type || '继承: ' + (topCategory.type || '未设置')})`
        )

        const grandChildren = categories.filter(
          cat => cat.parentId === child.id
        )
        grandChildren.forEach(grandChild => {
          console.log(
            `      └── ${grandChild.name} (${grandChild.type || '继承: ' + (child.type || topCategory.type || '未设置')})`
          )
        })
      })
      console.log()
    })

    // 检查账户类型设置情况
    console.log('账户类型设置检查:')
    console.log('-'.repeat(40))

    const typeStats = {
      ASSET: 0,
      LIABILITY: 0,
      INCOME: 0,
      EXPENSE: 0,
      未设置: 0,
    }

    categories.forEach(category => {
      const type = category.type || '未设置'
      typeStats[type as keyof typeof typeStats]++
    })

    Object.entries(typeStats).forEach(([type, count]) => {
      console.log(`${type}: ${count} 个分类`)
    })

    // 检查继承逻辑
    console.log('\n继承逻辑检查:')
    console.log('-'.repeat(40))

    let inheritanceIssues = 0

    categories.forEach(category => {
      if (category.parentId) {
        const parent = categories.find(c => c.id === category.parentId)
        if (parent) {
          if (parent.type && category.type !== parent.type) {
            console.log(
              `⚠️  ${category.name} 的类型 (${category.type}) 与父分类 ${parent.name} 的类型 (${parent.type}) 不一致`
            )
            inheritanceIssues++
          } else if (!parent.type && category.type) {
            console.log(
              `ℹ️  ${category.name} 有类型 (${category.type}) 但父分类 ${parent.name} 没有类型`
            )
          }
        }
      }
    })

    if (inheritanceIssues === 0) {
      console.log('✅ 所有子分类都正确继承了父分类的账户类型')
    } else {
      console.log(`❌ 发现 ${inheritanceIssues} 个继承问题`)
    }

    // 测试API功能
    console.log('\n测试分类设置API:')
    console.log('-'.repeat(40))

    // 找一个顶级分类进行测试
    const testCategory = topLevelCategories[0]
    if (testCategory) {
      console.log(`测试分类: ${testCategory.name}`)
      console.log(`当前类型: ${testCategory.type || '未设置'}`)

      // 模拟API调用（这里只是显示会发送的数据）
      const updateData = {
        name: testCategory.name,
        parentId: testCategory.parentId,
        type: testCategory.type || 'ASSET',
        order: testCategory.order,
      }

      console.log('模拟API更新数据:', JSON.stringify(updateData, null, 2))
    }

    console.log('\n测试完成!')
  } catch (error) {
    console.error('测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCategorySettings()
