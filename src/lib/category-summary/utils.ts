/**
 * 分类汇总工具函数
 */

/**
 * 从交易备注中提取余额变化金额
 * @param notes 交易备注
 * @returns 变化金额，如果无法提取则返回null
 */
export function extractBalanceChangeFromNotes(notes: string): number | null {
  if (!notes) return null

  // 匹配模式：变化金额：+123.45 或 变化金额：-123.45
  const match = notes.match(/变化金额：([+-]?\d+\.?\d*)/)
  if (match && match[1]) {
    return parseFloat(match[1])
  }

  return null
}

/**
 * 递归获取所有子分类ID
 * @param prisma Prisma客户端
 * @param categoryId 分类ID
 * @returns 包含自身和所有子分类的ID数组
 */
export async function getAllCategoryIds(
  prisma: any,
  categoryId: string
): Promise<string[]> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { children: true }
  })

  if (!category) return [categoryId]

  let ids = [categoryId]
  for (const child of category.children) {
    const childIds = await getAllCategoryIds(prisma, child.id)
    ids = ids.concat(childIds)
  }
  return ids
}

/**
 * 序列化账户数据，将 Decimal 转换为 number
 * @param account 原始账户数据
 * @returns 序列化后的账户数据
 */
export function serializeAccountData(account: any) {
  return {
    ...account,
    transactions: account.transactions.map((transaction: any) => ({
      ...transaction,
      amount: parseFloat(transaction.amount.toString()),
      date: transaction.date.toISOString()
    }))
  }
}

/**
 * 计算子分类的汇总余额
 * @param allAccountSummaries 所有账户汇总数据
 * @param childAccountIds 子分类的账户ID列表
 * @returns 子分类的汇总余额
 */
export function calculateChildCategoryBalances(
  allAccountSummaries: Array<{
    categoryId: string
    balances: Record<string, number>
  }>,
  childAccountIds: string[]
): Record<string, number> {
  const childBalances: Record<string, number> = {}
  
  const childAccounts = allAccountSummaries.filter(account =>
    childAccountIds.includes(account.categoryId)
  )

  childAccounts.forEach(account => {
    Object.entries(account.balances).forEach(([currencyCode, balance]) => {
      if (!childBalances[currencyCode]) {
        childBalances[currencyCode] = 0
      }
      childBalances[currencyCode] += balance
    })
  })

  return childBalances
}

/**
 * 计算分类总余额
 * @param allAccountSummaries 所有账户汇总数据
 * @returns 分类总余额
 */
export function calculateCategoryTotalBalances(
  allAccountSummaries: Array<{
    balances: Record<string, number>
  }>
): Record<string, number> {
  const categoryBalanceSummary: Record<string, number> = {}

  allAccountSummaries.forEach(account => {
    Object.entries(account.balances).forEach(([currencyCode, balance]) => {
      if (!categoryBalanceSummary[currencyCode]) {
        categoryBalanceSummary[currencyCode] = 0
      }
      categoryBalanceSummary[currencyCode] += balance
    })
  })

  return categoryBalanceSummary
}

/**
 * 获取用户可用的货币列表
 * @param prisma Prisma客户端
 * @param userId 用户ID
 * @returns 货币列表
 */
export async function getUserCurrencies(prisma: any, userId: string) {
  const currencies = await prisma.currency.findMany({
    where: {
      OR: [
        { isCustom: false }, // 全局货币
        { isCustom: true, createdBy: userId } // 用户的自定义货币
      ]
    }
  })

  return currencies.map((currency: any) => ({
    code: currency.code,
    symbol: currency.symbol,
    name: currency.name
  }))
}
