import { prisma } from '../connection-manager'

/**
 * 获取用于调试的原始收入/支出数据
 * @param userId
 * @param startDate
 * @param endDate
 */
export async function getRawIncomeExpenseDataForDebug(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  return prisma.$queryRaw<
    Array<{
      transaction_type: string
      currency_code: string
      currency_symbol: string
      currency_name: string
      total_amount: number
      transaction_count: number
    }>
  >`
    SELECT 
      t.type as transaction_type,
      cur.code as currency_code,
      cur.symbol as currency_symbol,
      cur.name as currency_name,
      SUM(t.amount) as total_amount,
      COUNT(t.id) as transaction_count
    FROM transactions t
    INNER JOIN currencies cur ON t."currencyId" = cur.id
    WHERE t."userId" = ${userId}
      AND t.date >= ${startDate}
      AND t.date <= ${endDate}
      AND t.type IN ('INCOME', 'EXPENSE')
    GROUP BY t.type, cur.code, cur.symbol, cur.name
    ORDER BY t.type, total_amount DESC
  `
}
