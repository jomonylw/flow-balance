/**
 * 汇率自动生成服务
 * 提供反向汇率和传递汇率的自动生成功能
 */

import { prisma } from '@/lib/database/prisma'
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

/**
 * 为用户自动生成缺失的汇率
 * @param userId 用户ID
 * @param effectiveDate 生效日期（可选，默认为当前日期）
 * @returns 生成结果
 */
export async function generateAutoExchangeRates(
  userId: string,
  _effectiveDate?: Date
): Promise<AutoGenerationResult> {
  // 统一使用当前日期，避免日期匹配问题
  const targetDate = new Date()
  // 设置为当天的开始时间，避免时间精度问题
  targetDate.setHours(0, 0, 0, 0)

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
    // 获取用户的所有用户输入汇率（不限制日期，获取最新的）
    const userRates = await prisma.exchangeRate.findMany({
      where: {
        userId,
        type: 'USER',
      },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    })

    // 1. 生成反向汇率
    const reverseResult = await generateReverseRates(
      userId,
      userRates,
      targetDate
    )
    result.details.reverseRates = reverseResult.count
    result.generatedCount += reverseResult.count
    result.errors.push(...reverseResult.errors)

    // 2. 生成传递汇率
    const transitiveResult = await generateTransitiveRates(userId, targetDate)
    result.details.transitiveRates = transitiveResult.count
    result.generatedCount += transitiveResult.count
    result.errors.push(...transitiveResult.errors)

    if (result.errors.length > 0) {
      result.success = false
    }

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
 * 生成反向汇率
 * 例如：CNY → USD = 0.14，自动生成 USD → CNY = 7.14
 */
async function generateReverseRates(
  userId: string,
  userRates: Array<{
    id: string
    fromCurrencyId: string
    toCurrencyId: string
    rate: any
    effectiveDate: Date
    fromCurrencyRef: { id: string; code: string } | null
    toCurrencyRef: { id: string; code: string } | null
  }>,
  effectiveDate: Date
) {
  const result = { count: 0, errors: [] as string[] }

  for (const rate of userRates) {
    try {
      // 检查反向汇率是否已存在
      const existingReverse = await prisma.exchangeRate.findFirst({
        where: {
          userId,
          fromCurrencyId: rate.toCurrencyId,
          toCurrencyId: rate.fromCurrencyId,
          effectiveDate,
        },
      })

      if (existingReverse) {
        continue // 已存在，跳过
      }

      // 计算反向汇率
      const reverseRate = new Decimal(1).div(rate.rate)

      // 创建反向汇率记录
      await prisma.exchangeRate.create({
        data: {
          userId,
          fromCurrencyId: rate.toCurrencyId,
          toCurrencyId: rate.fromCurrencyId,
          rate: reverseRate,
          effectiveDate,
          type: 'AUTO',
          sourceRateId: rate.id,
          notes: t('exchange.rate.auto.generated.reverse', {
            fromCurrency: rate.fromCurrencyRef?.code || '',
            toCurrency: rate.toCurrencyRef?.code || '',
          }),
        },
      })

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
 * 生成传递汇率
 * 支持多种传递路径：直接传递、反向计算、组合计算
 */
async function generateTransitiveRates(userId: string, effectiveDate: Date) {
  const result = { count: 0, errors: [] as string[] }

  try {
    // 获取所有汇率（包括用户输入和自动生成的）
    const allRates = await prisma.exchangeRate.findMany({
      where: {
        userId,
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    })

    // 创建汇率映射表
    const rateMap = new Map<
      string,
      { rate: Decimal; id: string; type: string }
    >()

    // 只保留每个货币对的最新汇率
    for (const rate of allRates) {
      const key = `${rate.fromCurrencyId}-${rate.toCurrencyId}`
      if (!rateMap.has(key)) {
        rateMap.set(key, {
          rate: rate.rate,
          id: rate.id,
          type: rate.type,
        })
      }
    }

    // 获取用户使用的所有货币
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        currency: true,
      },
    })

    const currencies = userCurrencies.map(uc => uc.currencyId)

    // 多轮生成，直到无法生成更多汇率
    let generatedInThisRound = 0
    const maxRounds = 5 // 防止无限循环

    for (let round = 0; round < maxRounds; round++) {
      generatedInThisRound = 0

      for (const fromCurrency of currencies) {
        for (const toCurrency of currencies) {
          if (fromCurrency === toCurrency) continue

          // 检查直接汇率是否已存在
          const directKey = `${fromCurrency}-${toCurrency}`
          if (rateMap.has(directKey)) continue

          let transitiveRate: Decimal | null = null
          let calculationPath = ''

          // 方法1：通过中间货币传递 (A→B→C)
          for (const intermediateCurrency of currencies) {
            if (
              intermediateCurrency === fromCurrency ||
              intermediateCurrency === toCurrency
            )
              continue

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

          // 方法2：通过反向汇率计算 (A→B = 1/(B→A))
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

          // 方法3：通过共同基准货币计算 (A→USD, B→USD => A→B = A→USD / B→USD)
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

          // 如果找到了计算方法，创建汇率
          if (transitiveRate) {
            try {
              // 检查是否已存在该汇率
              const existing = await prisma.exchangeRate.findFirst({
                where: {
                  userId,
                  fromCurrencyId: fromCurrency,
                  toCurrencyId: toCurrency,
                  effectiveDate,
                },
              })

              if (!existing) {
                // 创建传递汇率记录
                await prisma.exchangeRate.create({
                  data: {
                    userId,
                    fromCurrencyId: fromCurrency,
                    toCurrencyId: toCurrency,
                    rate: transitiveRate,
                    effectiveDate,
                    type: 'AUTO',
                    notes: t('exchange.rate.auto.generated.transitive', {
                      calculationPath,
                    }),
                  },
                })

                result.count++
                generatedInThisRound++

                // 添加到映射表，用于下一轮计算
                rateMap.set(directKey, {
                  rate: transitiveRate,
                  id: '',
                  type: 'AUTO',
                })
              }
            } catch (error) {
              result.errors.push(
                t('exchange.rate.transitive.generate.failed', {
                  error: error instanceof Error ? error.message : '未知错误',
                })
              )
            }
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

/**
 * 删除自动生成的汇率
 * 当用户删除或修改源汇率时，需要清理相关的自动生成汇率
 */
export async function cleanupAutoGeneratedRates(
  userId: string,
  sourceRateId: string
): Promise<{ deletedCount: number; errors: string[] }> {
  const result = { deletedCount: 0, errors: [] as string[] }

  try {
    // 删除直接关联的自动生成汇率
    const deleteResult = await prisma.exchangeRate.deleteMany({
      where: {
        userId,
        sourceRateId,
        type: 'AUTO',
      },
    })

    result.deletedCount = deleteResult.count

    // 重新生成汇率以确保一致性
    await generateAutoExchangeRates(userId)

    return result
  } catch (error) {
    result.errors.push(
      t('exchange.rate.cleanup.failed', {
        error: error instanceof Error ? error.message : '未知错误',
      })
    )
    return result
  }
}
