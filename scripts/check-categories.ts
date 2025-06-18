import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkCategories() {
  try {
    console.log('检查分类数据和账户类型设置...\n')

    const categories = await prisma.category.findMany({
      include: {
        accounts: {
          include: {
            transactions: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    console.log('分类列表:')
    console.log('='.repeat(80))

    categories.forEach(category => {
      console.log(`ID: ${category.id}`)
      console.log(`名称: ${category.name}`)
      console.log(`类型: ${category.type || '未设置'}`)
      console.log(`父分类ID: ${category.parentId || '无'}`)
      console.log(`账户数量: ${category.accounts.length}`)
      console.log(`创建时间: ${category.createdAt}`)
      console.log('-'.repeat(40))
    })

    console.log('\n账户类型统计:')
    const typeStats = categories.reduce(
      (acc, cat) => {
        const type = cat.type || '未设置'
        acc[type] = (acc[type] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    Object.entries(typeStats).forEach(([type, count]) => {
      console.log(`${type}: ${count} 个分类`)
    })

    console.log('\n检查完成!')
  } catch (error) {
    console.error('检查失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCategories()
