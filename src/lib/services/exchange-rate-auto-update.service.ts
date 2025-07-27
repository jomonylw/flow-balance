/**
 * 汇率自动更新服务
 * 集成到统一同步服务中，支持24小时限制的自动更新
 */

import { prisma } from '@/lib/database/connection-manager'
import { Decimal } from '@prisma/client/runtime/library'
import { generateAutoExchangeRates } from './exchange-rate-auto-generation.service'
import { cleanupExchangeRateHistory } from './exchange-rate-cleanup.service'
import { API_TIMEOUTS } from '@/lib/constants/app-config'
import {
  fetchJsonWithTimeout,
  categorizeApiError,
} from '@/lib/utils/fetch-with-timeout'

interface FrankfurterResponse {
  amount: number
  base: string
  date: string
  rates: Record<string, number>
}

interface ExchangeRateUpdateResult {
  success: boolean
  message: string
  errorCode?: string
  errorParams?: Record<string, unknown>
  data?: {
    updatedCount: number
    errors: string[]
    skippedCurrencies?: string[]
    lastUpdate: string
    source: string
    baseCurrency: string
    skipped?: boolean
    skipReason?: string
  }
}

export class ExchangeRateAutoUpdateService {
  /**
   * 更新用户汇率
   * @param userId 用户ID
   * @param forceUpdate 是否强制更新（忽略24小时限制）
   * @returns 更新结果
   */
  static async updateExchangeRates(
    userId: string,
    forceUpdate: boolean = false
  ): Promise<ExchangeRateUpdateResult> {
    try {
      // 获取用户设置
      const userSettings = await prisma.userSettings.findUnique({
        where: { userId },
        include: { baseCurrency: true },
      })

      if (!userSettings) {
        return {
          success: false,
          message: '用户设置不存在',
        }
      }

      // 检查是否启用了汇率自动更新
      if (!userSettings.autoUpdateExchangeRates && !forceUpdate) {
        return {
          success: true,
          message: '汇率自动更新未启用',
          data: {
            updatedCount: 0,
            errors: [],
            lastUpdate: new Date().toISOString(),
            source: 'Skipped',
            baseCurrency: userSettings.baseCurrency?.code || '',
            skipped: true,
            skipReason: '汇率自动更新未启用',
          },
        }
      }

      if (!userSettings.baseCurrency) {
        return {
          success: false,
          message: '请先设置本位币',
        }
      }

      // 检查24小时限制（除非强制更新）
      if (!forceUpdate && userSettings.lastExchangeRateUpdate) {
        const lastUpdate = new Date(userSettings.lastExchangeRateUpdate)
        const now = new Date()
        const hoursSinceLastUpdate =
          (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)

        if (hoursSinceLastUpdate < 24) {
          return {
            success: true,
            message: '24小时内已更新过汇率',
            data: {
              updatedCount: 0,
              errors: [],
              lastUpdate: lastUpdate.toISOString(),
              source: 'Skipped',
              baseCurrency: userSettings.baseCurrency.code,
              skipped: true,
              skipReason: `距离上次更新仅 ${Math.round(hoursSinceLastUpdate)} 小时`,
            },
          }
        }
      }

      const baseCurrencyCode = userSettings.baseCurrency.code

      // 获取用户的所有活跃货币
      const userCurrencies = await prisma.userCurrency.findMany({
        where: {
          userId,
          isActive: true,
        },
        include: {
          currency: true,
        },
      })

      if (userCurrencies.length === 0) {
        return {
          success: false,
          message: '没有找到可用的货币',
        }
      }

      // 调用 Frankfurter API 获取汇率
      const frankfurterUrl = `https://api.frankfurter.dev/v1/latest?base=${baseCurrencyCode}`

      let frankfurterData: FrankfurterResponse
      try {
        // 使用带超时的 fetch 工具函数
        frankfurterData = await fetchJsonWithTimeout<FrankfurterResponse>(
          frankfurterUrl,
          {
            timeout: API_TIMEOUTS.EXCHANGE_RATE_API_TIMEOUT,
            method: 'GET',
          }
        )
      } catch (error) {
        console.error('Failed to fetch exchange rates from Frankfurter:', error)

        // 使用统一的错误分类工具
        const errorInfo = categorizeApiError(error)

        // 处理特定的 HTTP 错误（如果是 HTTP 错误）
        if (
          error instanceof Error &&
          error.message.includes('HTTP error! status:')
        ) {
          const statusMatch = error.message.match(/status: (\d+)/)
          if (statusMatch) {
            const status = parseInt(statusMatch[1])

            if (status === 404) {
              return {
                success: false,
                message: `本位币 ${baseCurrencyCode} 不支持自动汇率更新，请检查货币代码是否正确或手动输入汇率`,
                errorCode: 'CURRENCY_NOT_SUPPORTED',
                errorParams: { currencyCode: baseCurrencyCode },
              }
            } else if (status === 429) {
              return {
                success: false,
                message: '汇率API请求过于频繁，请稍后重试',
                errorCode: 'RATE_LIMIT_EXCEEDED',
              }
            } else if (status >= 500) {
              return {
                success: false,
                message: '汇率服务暂时不可用，请稍后重试',
                errorCode: 'SERVICE_UNAVAILABLE',
              }
            }
          }
        }

        // 返回分类后的错误信息
        return {
          success: false,
          message: errorInfo.message,
          errorCode: errorInfo.code,
        }
      }

      // 使用 API 返回的日期作为生效日期
      const effectiveDate = new Date(frankfurterData.date)
      effectiveDate.setHours(0, 0, 0, 0)

      // 生成更新备注
      const updateTime = new Date().toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
      })
      const updateType = forceUpdate ? '手动更新' : '自动更新'
      const notePrefix = `${updateType} - ${updateTime} - API日期: ${frankfurterData.date}`

      let updatedCount = 0
      const errors: string[] = []
      const skippedCurrencies: string[] = []

      // 更新用户已选择的货币汇率
      for (const userCurrency of userCurrencies) {
        const currencyCode = userCurrency.currency.code

        // 跳过本位币（自己对自己的汇率为1）
        if (currencyCode === baseCurrencyCode) {
          continue
        }

        // 检查 Frankfurter 是否返回了这个货币的汇率
        if (!frankfurterData.rates[currencyCode]) {
          // 静默跳过API不支持的货币，不视为错误
          skippedCurrencies.push(currencyCode)
          console.log(`跳过不支持的货币: ${currencyCode} (API中无此汇率数据)`)
          continue
        }

        const rate = frankfurterData.rates[currencyCode]

        try {
          // 查找现有汇率记录（使用API返回的日期）
          const existingRate = await prisma.exchangeRate.findFirst({
            where: {
              userId,
              fromCurrencyId: userSettings.baseCurrency.id,
              toCurrencyId: userCurrency.currency.id,
              effectiveDate: effectiveDate,
            },
          })

          if (existingRate) {
            // 更新现有汇率
            await prisma.exchangeRate.update({
              where: { id: existingRate.id },
              data: {
                rate: new Decimal(rate),
                type: 'API',
                notes: notePrefix,
              },
            })
          } else {
            // 创建新汇率记录
            await prisma.exchangeRate.create({
              data: {
                userId,
                fromCurrencyId: userSettings.baseCurrency.id,
                toCurrencyId: userCurrency.currency.id,
                rate: new Decimal(rate),
                effectiveDate: effectiveDate,
                type: 'API',
                notes: notePrefix,
              },
            })
          }

          updatedCount++
        } catch (error) {
          console.error(`Failed to update rate for ${currencyCode}:`, error)
          errors.push(`更新 ${baseCurrencyCode} 到 ${currencyCode} 汇率失败`)
        }
      }

      // 更新最后更新时间
      await prisma.userSettings.update({
        where: { userId },
        data: {
          lastExchangeRateUpdate: new Date(),
        },
      })

      // 重新生成自动汇率（反向汇率和传递汇率）
      try {
        // 删除所有自动生成的汇率
        await prisma.exchangeRate.deleteMany({
          where: {
            userId,
            type: 'AUTO',
          },
        })

        // 重新生成所有自动汇率
        await generateAutoExchangeRates(userId, effectiveDate)
      } catch (error) {
        console.error('自动重新生成汇率失败:', error)
        // 不影响主要操作，只记录错误
        errors.push('自动生成反向汇率和传递汇率失败')
      }

      // 清理汇率历史记录，只保留最新的 effectiveDate 汇率
      if (updatedCount > 0) {
        try {
          await cleanupExchangeRateHistory(userId, { clearCache: false })
        } catch (error) {
          console.error('清理汇率历史失败:', error)
          // 不影响主要操作，只记录错误
          errors.push('清理汇率历史记录失败')
        }
      }

      // 构建返回消息
      let message = `成功更新 ${updatedCount} 个汇率`
      if (errors.length > 0) {
        message += `，${errors.length} 个失败`
      }
      if (skippedCurrencies.length > 0) {
        message += `，跳过 ${skippedCurrencies.length} 个不支持的货币`
      }

      return {
        success: true,
        message,
        data: {
          updatedCount,
          errors,
          skippedCurrencies,
          lastUpdate: new Date().toISOString(),
          source: 'Frankfurter API',
          baseCurrency: baseCurrencyCode,
        },
      }
    } catch (error) {
      console.error('Exchange rate auto update failed:', error)
      return {
        success: false,
        message: '汇率自动更新失败',
      }
    }
  }

  /**
   * 检查用户是否需要更新汇率
   * @param userId 用户ID
   * @returns 是否需要更新
   */
  static async needsUpdate(userId: string): Promise<boolean> {
    try {
      const userSettings = await prisma.userSettings.findUnique({
        where: { userId },
      })

      if (!userSettings?.autoUpdateExchangeRates) {
        return false
      }

      if (!userSettings.lastExchangeRateUpdate) {
        return true
      }

      const lastUpdate = new Date(userSettings.lastExchangeRateUpdate)
      const now = new Date()
      const hoursSinceLastUpdate =
        (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)

      return hoursSinceLastUpdate >= 24
    } catch (error) {
      console.error('Check exchange rate update need failed:', error)
      return false
    }
  }

  /**
   * 获取汇率更新状态
   * @param userId 用户ID
   * @returns 更新状态信息
   */
  static async getUpdateStatus(userId: string): Promise<{
    enabled: boolean
    lastUpdate: Date | null
    needsUpdate: boolean
    hoursSinceLastUpdate: number | null
  }> {
    try {
      const userSettings = await prisma.userSettings.findUnique({
        where: { userId },
      })

      if (!userSettings) {
        return {
          enabled: false,
          lastUpdate: null,
          needsUpdate: false,
          hoursSinceLastUpdate: null,
        }
      }

      const enabled = userSettings.autoUpdateExchangeRates
      const lastUpdate = userSettings.lastExchangeRateUpdate
      let hoursSinceLastUpdate: number | null = null
      let needsUpdate = false

      if (lastUpdate) {
        const now = new Date()
        hoursSinceLastUpdate =
          (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)
        needsUpdate = enabled && hoursSinceLastUpdate >= 24
      } else {
        needsUpdate = enabled
      }

      return {
        enabled,
        lastUpdate,
        needsUpdate,
        hoursSinceLastUpdate,
      }
    } catch (error) {
      console.error('Get exchange rate update status failed:', error)
      return {
        enabled: false,
        lastUpdate: null,
        needsUpdate: false,
        hoursSinceLastUpdate: null,
      }
    }
  }
}
