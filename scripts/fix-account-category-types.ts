/**
 * 数据修正脚本：更新数据库中的账户分类类型
 * 
 * 这个脚本会：
 * 1. 检查所有分类的类型设置
 * 2. 根据分类名称推断正确的类型
 * 3. 更新数据库中的分类类型
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 分类类型推断规则
const categoryTypeRules = {
  ASSET: [
    '资产', '现金', '银行', '储蓄', '定期', '活期', '投资', '股票', '基金', '债券',
    '房产', '车辆', '设备', '固定资产', '流动资产', '钱包', '余额宝', '理财',
    'cash', 'bank', 'saving', 'investment', 'stock', 'fund', 'asset'
  ],
  LIABILITY: [
    '负债', '贷款', '借款', '信用卡', '欠款', '债务', '房贷', '车贷', '消费贷',
    '信贷', '透支', '应付', '预收',
    'loan', 'debt', 'credit', 'liability', 'mortgage', 'borrow'
  ],
  INCOME: [
    '收入', '工资', '薪水', '奖金', '津贴', '补贴', '分红', '利息', '租金',
    '营业收入', '主营业务收入', '其他收入', '投资收益',
    'income', 'salary', 'wage', 'bonus', 'dividend', 'interest', 'rent', 'revenue'
  ],
  EXPENSE: [
    '支出', '费用', '开支', '消费', '成本', '餐饮', '交通', '住房', '娱乐',
    '购物', '医疗', '教育', '旅游', '通讯', '水电', '燃气', '物业',
    'expense', 'cost', 'food', 'transport', 'housing', 'entertainment',
    'shopping', 'medical', 'education', 'travel', 'utility'
  ]
}

/**
 * 根据分类名称推断类型
 */
function inferCategoryType(categoryName: string): string | null {
  const name = categoryName.toLowerCase()
  
  for (const [type, keywords] of Object.entries(categoryTypeRules)) {
    for (const keyword of keywords) {
      if (name.includes(keyword.toLowerCase())) {
        return type
      }
    }
  }
  
  return null
}

/**
 * 主修正函数
 */
async function fixCategoryTypes() {
  console.log('🔧 开始修正分类类型...\n')
  
  try {
    // 获取所有分类
    const categories = await prisma.category.findMany({
      include: {
        accounts: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
    
    console.log(`📊 找到 ${categories.length} 个分类\n`)
    
    let updatedCount = 0
    const updates: Array<{
      id: string
      name: string
      oldType: string | null
      newType: string
      accountCount: number
    }> = []
    
    for (const category of categories) {
      const inferredType = inferCategoryType(category.name)
      
      if (inferredType && category.type !== inferredType) {
        // 更新分类类型
        await prisma.category.update({
          where: { id: category.id },
          data: { type: inferredType as any }
        })
        
        updates.push({
          id: category.id,
          name: category.name,
          oldType: category.type,
          newType: inferredType,
          accountCount: category.accounts.length
        })
        
        updatedCount++
      }
    }
    
    // 显示更新结果
    console.log(`✅ 成功更新 ${updatedCount} 个分类的类型：\n`)
    
    updates.forEach(update => {
      console.log(`📝 ${update.name}`)
      console.log(`   类型: ${update.oldType || '未设置'} → ${update.newType}`)
      console.log(`   账户数: ${update.accountCount}`)
      console.log('')
    })
    
    // 显示未能推断类型的分类
    const unidentifiedCategories = categories.filter(cat => 
      !inferCategoryType(cat.name) && !cat.type
    )
    
    if (unidentifiedCategories.length > 0) {
      console.log(`⚠️  以下 ${unidentifiedCategories.length} 个分类无法自动推断类型，需要手动设置：\n`)
      unidentifiedCategories.forEach(cat => {
        console.log(`❓ ${cat.name} (${cat.accounts.length} 个账户)`)
      })
      console.log('')
    }
    
    // 验证修正结果
    const updatedCategories = await prisma.category.findMany({
      where: {
        type: {
          not: undefined
        }
      }
    })
    
    console.log(`🎉 修正完成！现在有 ${updatedCategories.length} 个分类已设置类型`)
    
  } catch (error) {
    console.error('❌ 修正过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * 显示当前分类状态
 */
async function showCurrentStatus() {
  console.log('📋 当前分类状态：\n')
  
  const categories = await prisma.category.findMany({
    include: {
      accounts: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  })
  
  const typeGroups = {
    ASSET: [] as any[],
    LIABILITY: [] as any[],
    INCOME: [] as any[],
    EXPENSE: [] as any[],
    UNSET: [] as any[]
  }
  
  categories.forEach(cat => {
    const group = cat.type || 'UNSET'
    typeGroups[group as keyof typeof typeGroups].push(cat)
  })
  
  Object.entries(typeGroups).forEach(([type, cats]) => {
    if (cats.length > 0) {
      const typeNames = {
        ASSET: '资产类',
        LIABILITY: '负债类', 
        INCOME: '收入类',
        EXPENSE: '支出类',
        UNSET: '未设置类型'
      }
      
      console.log(`${typeNames[type as keyof typeof typeNames]} (${cats.length} 个):`)
      cats.forEach((cat: any) => {
        console.log(`  - ${cat.name} (${cat.accounts.length} 个账户)`)
      })
      console.log('')
    }
  })
}

// 执行脚本
async function main() {
  console.log('🚀 分类类型修正脚本\n')
  
  // 显示当前状态
  await showCurrentStatus()
  
  // 执行修正
  await fixCategoryTypes()
}

if (require.main === module) {
  main().catch(console.error)
}

export { fixCategoryTypes, showCurrentStatus }
