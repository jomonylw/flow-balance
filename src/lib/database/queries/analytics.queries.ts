import { prisma } from '../connection-manager'
import { getCategoryTreeIds } from './category.queries'

export async function getMonthlyFlowData(
  userId: string,
  startDate: Date,
  endDate: Date,
  categoryId?: string | null
) {
  let whereClause = `t."userId" = '${userId}' AND t.date >= '${startDate.toISOString()}' AND t.date <= '${endDate.toISOString()}' AND t.type IN ('INCOME', 'EXPENSE')`

  if (categoryId) {
    const categoryIds = await getCategoryTreeIds(categoryId)
    if (categoryIds.length > 0) {
      const categoryIdsStr = categoryIds
        .map((id: string) => `'${id}'`)
        .join(',')
      whereClause += ` AND a."categoryId" IN (${categoryIdsStr})`
    }
  }

  const result = await prisma.$queryRawUnsafe<
    Array<{
      month: string
      account_id: string
      account_name: string
      category_name: string
      currency_code: string
      currency_symbol: string
      currency_name: string
      transaction_type: string
      total_amount: number
      transaction_count: bigint
    }>
  >(`
    SELECT
      to_char(t.date, 'YYYY-MM') as month,
      a.id as account_id,
      a.name as account_name,
      cat.name as category_name,
      c.code as currency_code,
      c.symbol as currency_symbol,
      c.name as currency_name,
      t.type as transaction_type,
      SUM(t.amount) as total_amount,
      COUNT(*) as transaction_count
    FROM transactions t
    JOIN accounts a ON t."accountId" = a.id
    JOIN categories cat ON a."categoryId" = cat.id
    JOIN currencies c ON t."currencyId" = c.id
    WHERE ${whereClause}
    GROUP BY month, a.id, a.name, cat.name, c.code, c.symbol, c.name, t.type
    ORDER BY month DESC, account_name
  `)

  // BigInt to number conversion
  return result.map(row => ({
    ...row,
    transaction_count: Number(row.transaction_count),
  }))
}
