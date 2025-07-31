/**
 * 汇率自动生成服务 - 优化版本
 * 采用批量预加载->内存计算->批量写入模式，消除O(N³)复杂度和N+1查询问题
 */

import { prisma } from '@/lib/database/connection-manager'
import { Decimal } from '@prisma/client/runtime/library'
import { createServerTranslator } from '@/lib/utils/server-i18n'

// 创建服务端翻译函数
const t = createServerTranslator()

export interface AutoGenerationResult {
  success: boolean
  generatedCount: number
  errors: string[]
  details: {
    reverseRates: number
    transitiveRates: number
  }
}

interface ExchangeRateData {
  id: string
  fromCurrencyId: string
  toCurrencyId: string
  rate: Decimal
  effectiveDate: Date
  type: string
  sourceRateId?: string | null
  fromCurrencyCode?: string
  toCurrencyCode?: string
}

interface NewRateToCreate {
  userId: string
  fromCurrencyId: string
  toCurrencyId: string
  rate: Decimal
  effectiveDate: Date
  type: 'AUTO'
  sourceRateId?: string
  notes: string
}

/**
 * 优化的汇率自动生成函数
 * @param userId 用户ID
 * @param effectiveDate 生效日期（可选，默认为当前日期）
 * @returns 生成结果
 */
export async function generateAutoExchangeRatesOptimized(
  userId: string,
  effectiveDate?: Date
): Promise<AutoGenerationResult> {
  const targetDate = effectiveDate ? new Date(effectiveDate) : new Date()
  targetDate.setUTCHours(0, 0, 0, 0)

  const result: AutoGenerationResult = {
    success: true,
    generatedCount: 0,
    errors: [],
    details: {
      reverseRates: 0,
      transitiveRates: 0,
    },
  }

  try {
    // 1. 批量预加载所有需要的数据
    const [sourceRates, existingRates, userCurrencies] = await Promise.all([
      // 获取用户的所有用户输入汇率和API汇率
      prisma.exchangeRate.findMany({
        where: {
          userId,
          type: { in: ['USER', 'API'] },
        },
        include: {
          fromCurrencyRef: { select: { code: true } },
          toCurrencyRef: { select: { code: true } },
        },
        orderBy: { effectiveDate: 'desc' },
      }),
      // 获取所有现有汇率（用于检查重复）
      prisma.exchangeRate.findMany({
        where: { userId },
        select: {
          fromCurrencyId: true,
          toCurrencyId: true,
          effectiveDate: true,
          rate: true,
          type: true,
        },
      }),
      // 获取用户的所有活跃货币
      prisma.userCurrency.findMany({
        where: { userId, isActive: true },
        select: { currencyId: true },
      }),
    ])

    // 2. 在内存中构建数据结构
    const existingRateKeys = new Set<string>()
    const rateMap = new Map<string, ExchangeRateData>()

    // 构建现有汇率的键集合（用于快速查重）
    existingRates.forEach(rate => {
      const key = `${rate.fromCurrencyId}-${rate.toCurrencyId}-${rate.effectiveDate.toISOString()}`
      existingRateKeys.add(key)

      // 同时构建汇率映射（只保留最新的）
      const mapKey = `${rate.fromCurrencyId}-${rate.toCurrencyId}`
      if (!rateMap.has(mapKey)) {
        rateMap.set(mapKey, {
          id: '',
          fromCurrencyId: rate.fromCurrencyId,
          toCurrencyId: rate.toCurrencyId,
          rate: rate.rate,
          effectiveDate: rate.effectiveDate,
          type: rate.type,
        })
      }
    })

    const currencies = userCurrencies.map(uc => uc.currencyId)
    const newRatesToCreate: NewRateToCreate[] = []

    // 3. 内存计算 - 生成反向汇率
    const reverseRatesResult = generateReverseRatesInMemory(
      sourceRates,
      targetDate,
      existingRateKeys,
      newRatesToCreate
    )
    result.details.reverseRates = reverseRatesResult.count
    result.errors.push(...reverseRatesResult.errors)

    // 4. 内存计算 - 生成传递汇率
    const transitiveRatesResult = generateTransitiveRatesInMemory(
      userId,
      currencies,
      rateMap,
      targetDate,
      existingRateKeys,
      newRatesToCreate
    )
    result.details.transitiveRates = transitiveRatesResult.count
    result.errors.push(...transitiveRatesResult.errors)

    // 5. 批量写入数据库
    if (newRatesToCreate.length > 0) {
      await prisma.exchangeRate.createMany({
        data: newRatesToCreate,
        skipDuplicates: true, // 防止并发创建时的重复
      })
    }

    result.generatedCount = newRatesToCreate.length
    result.success = result.errors.length === 0

    return result
  } catch (error) {
    console.error(t('exchange.rate.auto.generate.failed'), error)
    return {
      success: false,
      generatedCount: 0,
      errors: [error instanceof Error ? error.message : '未知错误'],
      details: {
        reverseRates: 0,
        transitiveRates: 0,
      },
    }
  }
}

/**
 * 在内存中生成反向汇率
 */
function generateReverseRatesInMemory(
  sourceRates: any[],
  effectiveDate: Date,
  existingRateKeys: Set<string>,
  newRatesToCreate: NewRateToCreate[]
): { count: number; errors: string[] } {
  const result = { count: 0, errors: [] as string[] }

  for (const rate of sourceRates) {
    try {
      const reverseKey = `${rate.toCurrencyId}-${rate.fromCurrencyId}-${effectiveDate.toISOString()}`

      // 检查是否已存在
      if (existingRateKeys.has(reverseKey)) {
        continue
      }

      // 计算反向汇率
      const reverseRate = new Decimal(1).div(rate.rate)

      // 添加到待创建列表
      newRatesToCreate.push({
        userId: rate.userId,
        fromCurrencyId: rate.toCurrencyId,
        toCurrencyId: rate.fromCurrencyId,
        rate: reverseRate,
        effectiveDate,
        type: 'AUTO',
        sourceRateId: rate.id,
        notes: t('exchange.rate.auto.generated.reverse', {
          fromCurrency: rate.toCurrencyRef?.code || '',
          toCurrency: rate.fromCurrencyRef?.code || '',
        }),
      })

      // 添加到已存在集合，防止重复生成
      existingRateKeys.add(reverseKey)
      result.count++
    } catch (error) {
      result.errors.push(
        `生成反向汇率失败 ${rate.toCurrencyRef?.code}→${rate.fromCurrencyRef?.code}: ${
          error instanceof Error ? error.message : '未知错误'
        }`
      )
    }
  }

  return result
}

/**
 * 在内存中生成传递汇率
 */
function generateTransitiveRatesInMemory(
  userId: string,
  currencies: string[],
  rateMap: Map<string, ExchangeRateData>,
  effectiveDate: Date,
  existingRateKeys: Set<string>,
  newRatesToCreate: NewRateToCreate[]
): { count: number; errors: string[] } {
  const result = { count: 0, errors: [] as string[] }

  try {
    // 多轮生成，直到无法生成更多汇率
    let generatedInThisRound = 0
    const maxRounds = 5

    for (let round = 0; round < maxRounds; round++) {
      generatedInThisRound = 0

      for (const fromCurrency of currencies) {
        for (const toCurrency of currencies) {
          if (fromCurrency === toCurrency) continue

          const directKey = `${fromCurrency}-${toCurrency}`
          const existingKey = `${fromCurrency}-${toCurrency}-${effectiveDate.toISOString()}`

          // 检查是否已存在
          if (rateMap.has(directKey) || existingRateKeys.has(existingKey)) {
            continue
          }

          let transitiveRate: Decimal | null = null
          let calculationPath = ''

          // 方法1：通过中间货币传递
          for (const intermediateCurrency of currencies) {
            if (
              intermediateCurrency === fromCurrency ||
              intermediateCurrency === toCurrency
            ) {
              continue
            }

            const fromToIntermediate = `${fromCurrency}-${intermediateCurrency}`
            const intermediateToTarget = `${intermediateCurrency}-${toCurrency}`

            if (
              rateMap.has(fromToIntermediate) &&
              rateMap.has(intermediateToTarget)
            ) {
              const rate1 = rateMap.get(fromToIntermediate)?.rate
              const rate2 = rateMap.get(intermediateToTarget)?.rate
              if (rate1 && rate2) {
                transitiveRate = rate1.mul(rate2)
                calculationPath = '传递计算'
                break
              }
            }
          }

          // 方法2：通过反向汇率计算
          if (!transitiveRate) {
            const reverseKey = `${toCurrency}-${fromCurrency}`
            if (rateMap.has(reverseKey)) {
              const reverseRate = rateMap.get(reverseKey)?.rate
              if (reverseRate) {
                transitiveRate = new Decimal(1).div(reverseRate)
                calculationPath = '反向计算'
              }
            }
          }

          // 方法3：通过共同基准货币计算
          if (!transitiveRate) {
            for (const baseCurrency of currencies) {
              const fromToBase = `${fromCurrency}-${baseCurrency}`
              const toToBase = `${toCurrency}-${baseCurrency}`

              if (rateMap.has(fromToBase) && rateMap.has(toToBase)) {
                const rate1 = rateMap.get(fromToBase)?.rate
                const rate2 = rateMap.get(toToBase)?.rate
                if (rate1 && rate2) {
                  transitiveRate = rate1.div(rate2)
                  calculationPath = '基准货币计算'
                  break
                }
              }
            }
          }

          // 如果找到了计算方法，添加到待创建列表
          if (transitiveRate) {
            newRatesToCreate.push({
              userId,
              fromCurrencyId: fromCurrency,
              toCurrencyId: toCurrency,
              rate: transitiveRate,
              effectiveDate,
              type: 'AUTO',
              notes: t('exchange.rate.auto.generated.transitive', {
                calculationPath,
              }),
            })

            // 添加到映射表和已存在集合
            rateMap.set(directKey, {
              id: '',
              fromCurrencyId: fromCurrency,
              toCurrencyId: toCurrency,
              rate: transitiveRate,
              effectiveDate,
              type: 'AUTO',
            })
            existingRateKeys.add(existingKey)

            result.count++
            generatedInThisRound++
          }
        }
      }

      // 如果这一轮没有生成任何新汇率，退出循环
      if (generatedInThisRound === 0) {
        break
      }
    }

    return result
  } catch (error) {
    result.errors.push(
      t('exchange.rate.transitive.process.failed', {
        error: error instanceof Error ? error.message : '未知错误',
      })
    )
    return result
  }
}
