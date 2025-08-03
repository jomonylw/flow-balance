import { prisma } from '../connection-manager'

/**
 * 获取过去12个月的支出总额（按货币分组）
 * @param userId
 * @param startDate
 * @param endDate
 */
export async function getPast12MonthsExpense(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  return prisma.$queryRaw<
    Array<{
      currency_code: string
      currency_symbol: string
      currency_name: string
      total_amount: number
    }>
  >`
    SELECT
      cur.code as currency_code,
      cur.symbol as currency_symbol,
      cur.name as currency_name,
      SUM(t.amount) as total_amount
    FROM transactions t
    INNER JOIN currencies cur ON t."currencyId" = cur.id
    WHERE t."userId" = ${userId}
      AND t.date >= ${startDate}
      AND t.date <= ${endDate}
      AND t.type = 'EXPENSE'
    GROUP BY cur.code, cur.symbol, cur.name
    ORDER BY total_amount DESC
  `
}

/**
 * 获取过去6个月的收入和支出总额（按货币和类型分组）
 * @param userId
 * @param startDate
 * @param endDate
 */
export async function getPast6MonthsIncomeExpense(
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
    }>
  >`
    SELECT
      t.type as transaction_type,
      cur.code as currency_code,
      cur.symbol as currency_symbol,
      cur.name as currency_name,
      SUM(t.amount) as total_amount
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
