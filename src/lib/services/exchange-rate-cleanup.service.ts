/**
 * 汇率历史清理服务
 * 用于在汇率更新后清理历史汇率记录，只保留最新的 effectiveDate 汇率
 */

import { prisma } from '@/lib/database/connection-manager'
import { revalidateExchangeRateCache } from '@/lib/services/cache-revalidation'

interface CleanupResult {
  success: boolean
  message: string
  data?: {
    cleanedCount: number
    currencyPairs: string[]
    errors: string[]
  }
}

interface CleanupOptions {
  /**
   * 要清理的特定货币对
   * 如果不指定，则清理用户的所有货币对
   */
  specificCurrencyPairs?: Array<{
    fromCurrencyId: string
    toCurrencyId: string
  }>

  /**
   * 是否在清理后清除缓存
   * 默认为 true
   */
  clearCache?: boolean
}

/**
 * 清理用户的汇率历史记录，只保留最新的 effectiveDate 汇率
 * @param userId 用户ID
 * @param options 清理选项
 * @returns 清理结果
 */
export async function cleanupExchangeRateHistory(
  userId: string,
  options: CleanupOptions = {}
): Promise<CleanupResult> {
  const { specificCurrencyPairs, clearCache = true } = options

  const result: CleanupResult = {
    success: true,
    message: '',
    data: {
      cleanedCount: 0,
      currencyPairs: [],
      errors: [],
    },
  }

  try {
    // 构建查询条件
    const whereClause: any = {
      userId,
    }

    // 如果指定了特定货币对，则只清理这些货币对
    if (specificCurrencyPairs && specificCurrencyPairs.length > 0) {
      whereClause.OR = specificCurrencyPairs.map(pair => ({
        fromCurrencyId: pair.fromCurrencyId,
        toCurrencyId: pair.toCurrencyId,
      }))
    }

    // 获取所有汇率记录，按货币对和日期分组
    const allRates = await prisma.exchangeRate.findMany({
      where: whereClause,
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
      orderBy: [
        { fromCurrencyId: 'asc' },
        { toCurrencyId: 'asc' },
        { effectiveDate: 'desc' },
      ],
    })

    if (allRates.length === 0) {
      result.message = '没有找到需要清理的汇率记录'
      return result
    }

    // 按货币对分组
    const ratesByPair = new Map<string, typeof allRates>()

    for (const rate of allRates) {
      const pairKey = `${rate.fromCurrencyId}-${rate.toCurrencyId}`
      if (!ratesByPair.has(pairKey)) {
        ratesByPair.set(pairKey, [])
      }
      ratesByPair.get(pairKey)!.push(rate)
    }

    // 对每个货币对，删除除最新记录外的所有历史记录
    for (const [pairKey, rates] of ratesByPair) {
      if (rates.length <= 1) {
        // 如果只有一条记录或没有记录，跳过
        continue
      }

      try {
        // 按 effectiveDate 降序排序，第一条是最新的
        const sortedRates = rates.sort(
          (a, b) =>
            new Date(b.effectiveDate).getTime() -
            new Date(a.effectiveDate).getTime()
        )

        const latestRate = sortedRates[0]
        const oldRates = sortedRates.slice(1)

        if (oldRates.length > 0) {
          // 删除历史记录
          const oldRateIds = oldRates.map(rate => rate.id)

          await prisma.exchangeRate.deleteMany({
            where: {
              id: { in: oldRateIds },
              userId, // 额外的安全检查
            },
          })

          result.data!.cleanedCount += oldRates.length

          const fromCurrency = latestRate.fromCurrencyRef?.code || 'Unknown'
          const toCurrency = latestRate.toCurrencyRef?.code || 'Unknown'
          result.data!.currencyPairs.push(`${fromCurrency}/${toCurrency}`)
        }
      } catch (error) {
        console.error(`清理货币对 ${pairKey} 的汇率历史失败:`, error)
        result.data!.errors.push(
          `清理货币对 ${pairKey} 失败: ${error instanceof Error ? error.message : '未知错误'}`
        )
        result.success = false
      }
    }

    // 清除汇率缓存
    if (clearCache) {
      try {
        revalidateExchangeRateCache(userId)
      } catch (error) {
        console.error('清除汇率缓存失败:', error)
        result.data!.errors.push('清除汇率缓存失败')
      }
    }

    // 构建结果消息
    if (result.data!.cleanedCount > 0) {
      result.message = `成功清理 ${result.data!.cleanedCount} 条历史汇率记录，涉及 ${result.data!.currencyPairs.length} 个货币对`
    } else {
      result.message = '没有需要清理的历史汇率记录'
    }

    if (result.data!.errors.length > 0) {
      result.message += `，${result.data!.errors.length} 个操作失败`
      result.success = false
    }

    return result
  } catch (error) {
    console.error('汇率历史清理失败:', error)
    return {
      success: false,
      message: `汇率历史清理失败: ${error instanceof Error ? error.message : '未知错误'}`,
      data: {
        cleanedCount: 0,
        currencyPairs: [],
        errors: [error instanceof Error ? error.message : '未知错误'],
      },
    }
  }
}

/**
 * 清理特定货币对的汇率历史记录
 * @param userId 用户ID
 * @param fromCurrencyId 源货币ID
 * @param toCurrencyId 目标货币ID
 * @param options 清理选项
 * @returns 清理结果
 */
export async function cleanupSpecificCurrencyPairHistory(
  userId: string,
  fromCurrencyId: string,
  toCurrencyId: string,
  options: Omit<CleanupOptions, 'specificCurrencyPairs'> = {}
): Promise<CleanupResult> {
  return cleanupExchangeRateHistory(userId, {
    ...options,
    specificCurrencyPairs: [{ fromCurrencyId, toCurrencyId }],
  })
}
