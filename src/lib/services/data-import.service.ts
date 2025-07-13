/**
 * 数据导入服务
 * 处理用户数据的完整导入，确保数据完整性和一致性
 */

import { executeImportTransaction } from '@/lib/database/connection-manager'
import { Decimal } from '@prisma/client/runtime/library'
import type {
  ExportedData,
  ImportOptions,
  ImportResult,
  ImportValidationResult,
  IdMapping,
} from '@/types/data-import'

export class DataImportService {
  /**
   * 性能监控辅助方法
   */
  private static logPerformance(
    operation: string,
    startTime: number,
    count: number
  ): void {
    const duration = Date.now() - startTime
    const rate = count > 0 ? Math.round(count / (duration / 1000)) : 0
    console.log(
      `📊 ${operation}: ${count} 条记录，耗时 ${duration}ms，速率 ${rate} 条/秒`
    )
  }

  /**
   * 移除重复的标签关联
   */
  private static removeDuplicateTagAssociations(
    tagAssociations: Array<{ transactionId: string; tagId: string }>
  ): Array<{ transactionId: string; tagId: string }> {
    const seen = new Set<string>()
    const unique: Array<{ transactionId: string; tagId: string }> = []

    for (const association of tagAssociations) {
      const key = `${association.transactionId}-${association.tagId}`
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(association)
      }
    }

    return unique
  }

  /**
   * 逐条创建标签关联（处理重复数据）
   */
  private static async createTagAssociationsIndividually(
    tx: any,
    tagAssociations: Array<{ transactionId: string; tagId: string }>,
    result: ImportResult
  ): Promise<void> {
    let successCount = 0
    let skipCount = 0

    for (const association of tagAssociations) {
      try {
        await tx.transactionTag.create({
          data: association,
        })
        successCount++
      } catch (error) {
        // 检查是否是唯一约束错误
        if (
          error instanceof Error &&
          (error.message.includes('Unique constraint') ||
            error.message.includes('unique constraint') ||
            error.message.includes('UNIQUE constraint'))
        ) {
          // 跳过重复的标签关联
          skipCount++
        } else {
          // 其他错误记录到结果中
          result.errors.push(
            `创建标签关联失败 (${association.transactionId}-${association.tagId}): ${error instanceof Error ? error.message : '未知错误'}`
          )
          result.statistics.failed++
        }
      }
    }

    if (skipCount > 0) {
      result.warnings.push(`跳过了 ${skipCount} 个重复的标签关联`)
    }

    console.log(
      `📊 标签关联逐条创建: 成功 ${successCount} 个，跳过重复 ${skipCount} 个`
    )
  }
  /**
   * 验证导入数据的完整性和格式（轻量级版本，不进行数据库查询）
   * 用于前端验证和独立验证场景，避免在 Vercel 环境中的连接冲突
   */
  static async validateImportData(
    data: ExportedData
  ): Promise<ImportValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const missingCurrencies: string[] = []
    const duplicateNames: string[] = []

    try {
      // 验证基本结构
      if (!data.exportInfo || !data.user) {
        errors.push('data.import.format.invalid.missing.basic.info')
        return {
          isValid: false,
          errors,
          warnings,
          missingCurrencies,
          duplicateNames,
        }
      }

      // 验证版本兼容性
      const version = data.exportInfo.version
      if (!version || !['1.0', '2.0'].includes(version)) {
        warnings.push(
          `数据版本 ${version} 可能不完全兼容，建议使用最新版本导出的数据`
        )
      }

      // 检查必需的货币（不进行数据库查询，只检查数据完整性）
      const requiredCurrencies = new Set<string>()

      // 从账户中收集货币
      data.accounts?.forEach(account => {
        if (account.currencyCode) {
          requiredCurrencies.add(account.currencyCode)
        }
      })

      // 从交易中收集货币
      data.transactions?.forEach(transaction => {
        if (transaction.currencyCode) {
          requiredCurrencies.add(transaction.currencyCode)
        }
      })

      // 检查是否在自定义货币中定义了所需的货币
      for (const currencyCode of requiredCurrencies) {
        const customCurrency = data.customCurrencies?.find(
          c => c.code === currencyCode
        )

        // 如果不在自定义货币中，假设是系统货币，添加到警告中
        if (!customCurrency) {
          // 常见的系统货币代码
          const commonCurrencies = [
            'USD',
            'EUR',
            'GBP',
            'JPY',
            'CNY',
            'HKD',
            'SGD',
            'AUD',
            'CAD',
          ]
          if (!commonCurrencies.includes(currencyCode)) {
            missingCurrencies.push(currencyCode)
          }
        }
      }

      // 检查重复的分类名称
      const categoryNames = new Set<string>()
      data.categories?.forEach(category => {
        if (categoryNames.has(category.name)) {
          duplicateNames.push(`分类: ${category.name}`)
        }
        categoryNames.add(category.name)
      })

      // 检查重复的账户名称
      const accountNames = new Set<string>()
      data.accounts?.forEach(account => {
        if (accountNames.has(account.name)) {
          duplicateNames.push(`账户: ${account.name}`)
        }
        accountNames.add(account.name)
      })

      // 检查重复的标签名称
      const tagNames = new Set<string>()
      data.tags?.forEach(tag => {
        if (tagNames.has(tag.name)) {
          duplicateNames.push(`标签: ${tag.name}`)
        }
        tagNames.add(tag.name)
      })

      if (missingCurrencies.length > 0) {
        warnings.push(
          `以下货币在系统中不存在，将尝试创建: ${missingCurrencies.join(', ')}`
        )
      }

      if (duplicateNames.length > 0) {
        warnings.push(
          `发现重复名称，导入时将自动重命名: ${duplicateNames.join(', ')}`
        )
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        missingCurrencies,
        duplicateNames,
      }
    } catch (error) {
      errors.push(
        `验证过程中发生错误: ${error instanceof Error ? error.message : '未知错误'}`
      )
      return {
        isValid: false,
        errors,
        warnings,
        missingCurrencies,
        duplicateNames,
      }
    }
  }

  /**
   * 在事务内验证导入数据的完整性和格式
   * 避免在 Vercel 环境中的连接冲突
   */
  static async validateImportDataInTransaction(
    tx: any,
    data: ExportedData
  ): Promise<ImportValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const missingCurrencies: string[] = []
    const duplicateNames: string[] = []

    try {
      // 验证基本结构
      if (!data.exportInfo || !data.user) {
        errors.push('data.import.format.invalid.missing.basic.info')
        return {
          isValid: false,
          errors,
          warnings,
          missingCurrencies,
          duplicateNames,
        }
      }

      // 验证版本兼容性
      const version = data.exportInfo.version
      if (!version || !['1.0', '2.0'].includes(version)) {
        warnings.push(
          `数据版本 ${version} 可能不完全兼容，建议使用最新版本导出的数据`
        )
      }

      // 检查必需的货币是否存在
      const requiredCurrencies = new Set<string>()

      // 从账户中收集货币
      data.accounts?.forEach(account => {
        if (account.currencyCode) {
          requiredCurrencies.add(account.currencyCode)
        }
      })

      // 从交易中收集货币
      data.transactions?.forEach(transaction => {
        if (transaction.currencyCode) {
          requiredCurrencies.add(transaction.currencyCode)
        }
      })

      // 检查系统中是否存在这些货币（使用事务连接）
      for (const currencyCode of requiredCurrencies) {
        const existingCurrency = await tx.currency.findFirst({
          where: {
            code: currencyCode,
            createdBy: null, // 全局货币
          },
        })

        if (!existingCurrency) {
          // 检查是否在自定义货币中
          const customCurrency = data.customCurrencies?.find(
            c => c.code === currencyCode
          )
          if (!customCurrency) {
            missingCurrencies.push(currencyCode)
          }
        }
      }

      // 检查重复的分类名称
      const categoryNames = new Set<string>()
      data.categories?.forEach(category => {
        if (categoryNames.has(category.name)) {
          duplicateNames.push(`分类: ${category.name}`)
        }
        categoryNames.add(category.name)
      })

      // 检查重复的账户名称
      const accountNames = new Set<string>()
      data.accounts?.forEach(account => {
        if (accountNames.has(account.name)) {
          duplicateNames.push(`账户: ${account.name}`)
        }
        accountNames.add(account.name)
      })

      // 检查重复的标签名称
      const tagNames = new Set<string>()
      data.tags?.forEach(tag => {
        if (tagNames.has(tag.name)) {
          duplicateNames.push(`标签: ${tag.name}`)
        }
        tagNames.add(tag.name)
      })

      if (missingCurrencies.length > 0) {
        warnings.push(
          `以下货币在系统中不存在，将尝试创建: ${missingCurrencies.join(', ')}`
        )
      }

      if (duplicateNames.length > 0) {
        warnings.push(
          `发现重复名称，导入时将自动重命名: ${duplicateNames.join(', ')}`
        )
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        missingCurrencies,
        duplicateNames,
      }
    } catch (error) {
      errors.push(
        `验证过程中发生错误: ${error instanceof Error ? error.message : '未知错误'}`
      )
      return {
        isValid: false,
        errors,
        warnings,
        missingCurrencies,
        duplicateNames,
      }
    }
  }

  /**
   * 执行完整的数据导入
   */
  static async importUserData(
    userId: string,
    data: ExportedData,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      message: '',
      statistics: {
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
      },
      errors: [],
      warnings: [],
    }

    try {
      // 使用专用的导入事务确保数据一致性，针对大量数据导入进行优化
      // 移除 withRetry 避免与全局 prisma 客户端的连接冲突
      await executeImportTransaction(async tx => {
        // 在事务内部进行数据验证，避免连接冲突
        if (options.validateData !== false) {
          const validation = await this.validateImportDataInTransaction(
            tx,
            data
          )
          if (!validation.isValid) {
            result.errors = validation.errors
            result.message = '数据验证失败'
            // 抛出错误以回滚事务
            throw new Error('数据验证失败: ' + validation.errors.join(', '))
          }
          result.warnings = validation.warnings
        }
        // 创建ID映射表
        const idMappings: {
          categories: IdMapping
          accounts: IdMapping
          tags: IdMapping
          currencies: IdMapping
          transactionTemplates: IdMapping
          recurringTransactions: IdMapping
          loanContracts: IdMapping
          loanPayments: IdMapping
          transactions: IdMapping
          exchangeRates: IdMapping
        } = {
          categories: {},
          accounts: {},
          tags: {},
          currencies: {},
          transactionTemplates: {},
          recurringTransactions: {},
          loanContracts: {},
          loanPayments: {},
          transactions: {},
          exchangeRates: {},
        }

        const loanPaymentsToUpdate: any[] = []

        // 1. 导入用户设置
        if (data.userSettings) {
          await this.importUserSettings(tx, userId, data.userSettings, result)
        }

        // 2. 导入自定义货币
        if (
          data.customCurrencies?.length > 0 &&
          options.selectedDataTypes?.currencies !== false
        ) {
          await this.importCustomCurrencies(
            tx,
            userId,
            data.customCurrencies,
            idMappings.currencies,
            result
          )
        }

        // 3. 导入用户货币关联
        if (
          data.userCurrencies?.length > 0 &&
          options.selectedDataTypes?.currencies !== false
        ) {
          await this.importUserCurrencies(
            tx,
            userId,
            data.userCurrencies,
            idMappings.currencies,
            result
          )
        }

        // 4. 导入汇率数据
        if (
          data.exchangeRates?.length > 0 &&
          options.selectedDataTypes?.exchangeRates !== false
        ) {
          await this.importExchangeRates(
            tx,
            userId,
            data.exchangeRates,
            idMappings.currencies,
            idMappings.exchangeRates,
            result
          )
        }

        // 5. 导入分类
        if (
          data.categories?.length > 0 &&
          options.selectedDataTypes?.categories !== false
        ) {
          await this.importCategories(
            tx,
            userId,
            data.categories,
            idMappings.categories,
            result,
            options
          )
        }

        // 6. 导入标签
        if (
          data.tags?.length > 0 &&
          options.selectedDataTypes?.tags !== false
        ) {
          await this.importTags(
            tx,
            userId,
            data.tags,
            idMappings.tags,
            result,
            options
          )
        }

        // 7. 导入账户
        if (
          data.accounts?.length > 0 &&
          options.selectedDataTypes?.accounts !== false
        ) {
          await this.importAccounts(
            tx,
            userId,
            data.accounts,
            idMappings.categories,
            idMappings.currencies,
            idMappings.accounts,
            result,
            options
          )
        }

        // 8. 导入交易模板
        if (
          data.transactionTemplates?.length > 0 &&
          options.selectedDataTypes?.transactionTemplates !== false
        ) {
          await this.importTransactionTemplates(
            tx,
            userId,
            data.transactionTemplates,
            idMappings.accounts,
            idMappings.categories,
            idMappings.currencies,
            idMappings.tags,
            idMappings.transactionTemplates,
            result,
            options
          )
        }

        // 9. 导入定期交易
        if (
          data.recurringTransactions?.length > 0 &&
          options.selectedDataTypes?.recurringTransactions !== false
        ) {
          await this.importRecurringTransactions(
            tx,
            userId,
            data.recurringTransactions,
            idMappings.accounts,
            idMappings.currencies,
            idMappings.tags,
            idMappings.recurringTransactions,
            result,
            options
          )
        }

        // 10. 导入贷款合约
        if (
          data.loanContracts?.length > 0 &&
          options.selectedDataTypes?.loanContracts !== false
        ) {
          await this.importLoanContracts(
            tx,
            userId,
            data.loanContracts,
            idMappings.accounts,
            idMappings.currencies,
            idMappings.tags,
            idMappings.loanContracts,
            result,
            options
          )
        }

        // 11. 导入贷款还款记录
        if (
          data.loanPayments?.length > 0 &&
          options.selectedDataTypes?.loanPayments !== false
        ) {
          await this.importLoanPayments(
            tx,
            userId,
            data.loanPayments,
            idMappings.loanContracts,
            idMappings.loanPayments,
            loanPaymentsToUpdate,
            result,
            options
          )
        }

        // 12. 导入交易（最后导入，因为可能依赖其他数据）
        if (data.transactions?.length > 0) {
          // 检查是否有任何交易类型被选择
          const hasAnyTransactionTypeSelected =
            options.selectedDataTypes?.manualTransactions !== false ||
            options.selectedDataTypes?.recurringTransactionRecords !== false ||
            options.selectedDataTypes?.loanTransactionRecords !== false

          let filteredTransactions: typeof data.transactions

          if (!hasAnyTransactionTypeSelected) {
            // 如果没有选择任何交易类型，则不导入任何交易
            filteredTransactions = []
          } else {
            // 使用新版本逻辑：根据选择过滤交易类型
            filteredTransactions = data.transactions.filter(transaction => {
              // 手动交易
              if (
                !transaction.recurringTransactionId &&
                !transaction.loanContractId &&
                !transaction.loanPaymentId
              ) {
                return options.selectedDataTypes?.manualTransactions !== false
              }
              // 定期交易记录
              if (transaction.recurringTransactionId) {
                return (
                  options.selectedDataTypes?.recurringTransactionRecords !==
                  false
                )
              }
              // 贷款相关交易
              if (transaction.loanContractId || transaction.loanPaymentId) {
                return (
                  options.selectedDataTypes?.loanTransactionRecords !== false
                )
              }
              return false
            })
          }

          if (filteredTransactions.length > 0) {
            await this.importTransactions(
              tx,
              userId,
              filteredTransactions,
              idMappings.accounts,
              idMappings.categories,
              idMappings.currencies,
              idMappings.tags,
              idMappings.recurringTransactions,
              idMappings.loanContracts,
              idMappings.loanPayments,
              idMappings.transactions,
              result,
              options
            )
          }
        }

        // 13. 后处理：更新贷款还款记录中的交易ID
        if (loanPaymentsToUpdate.length > 0) {
          for (const paymentToUpdate of loanPaymentsToUpdate) {
            const newPrincipalTxId =
              paymentToUpdate.oldPrincipalTxId &&
              idMappings.transactions[paymentToUpdate.oldPrincipalTxId]
            const newInterestTxId =
              paymentToUpdate.oldInterestTxId &&
              idMappings.transactions[paymentToUpdate.oldInterestTxId]
            const newBalanceTxId =
              paymentToUpdate.oldBalanceTxId &&
              idMappings.transactions[paymentToUpdate.oldBalanceTxId]

            if (newPrincipalTxId || newInterestTxId || newBalanceTxId) {
              await tx.loanPayment.update({
                where: { id: paymentToUpdate.newPaymentId },
                data: {
                  principalTransactionId: newPrincipalTxId,
                  interestTransactionId: newInterestTxId,
                  balanceTransactionId: newBalanceTxId,
                },
              })
            }
          }
        }

        // 如果导入了汇率数据，在事务内删除自动生成的汇率
        // 避免在 Vercel 环境中的连接冲突
        if (data.exchangeRates?.length > 0) {
          try {
            await tx.exchangeRate.deleteMany({
              where: {
                userId,
                type: 'AUTO',
              },
            })
            console.log('已在事务内删除自动生成的汇率，准备重新生成')
          } catch (error) {
            console.warn('删除自动汇率失败:', error)
            result.warnings.push('删除自动汇率失败，可能影响汇率重新生成')
          }
        }
      })

      // 如果导入了汇率数据，需要重新生成自动汇率
      if (data.exchangeRates?.length > 0) {
        try {
          // 重新生成所有自动汇率
          const { generateAutoExchangeRates } = await import(
            './exchange-rate-auto-generation.service'
          )
          await generateAutoExchangeRates(userId)

          result.warnings.push('已重新生成自动汇率（反向汇率和传递汇率）')
        } catch (error) {
          console.error('导入后自动重新生成汇率失败:', error)
          result.warnings.push(
            '自动生成反向汇率和传递汇率失败，请手动触发重新生成'
          )
        }
      }

      result.success = result.statistics.failed === 0
      // 返回结构化的结果，让调用层处理国际化
      result.message = result.success
        ? 'import.success'
        : 'import.partial.success'

      return result
    } catch {
      result.errors.push('data.import.process.error')
      result.message = 'import.failed'
      return result
    }
  }

  /**
   * 导入用户设置
   */
  private static async importUserSettings(
    tx: any,
    userId: string,
    settings: any,
    result: ImportResult
  ): Promise<void> {
    try {
      // 查找基础货币
      let baseCurrencyId: string | undefined
      if (settings.baseCurrencyCode) {
        const baseCurrency = await tx.currency.findFirst({
          where: {
            code: settings.baseCurrencyCode,
            OR: [{ createdBy: null }, { createdBy: userId }],
          },
        })
        baseCurrencyId = baseCurrency?.id
      }

      await tx.userSettings.upsert({
        where: { userId },
        update: {
          baseCurrencyId,
          dateFormat: settings.dateFormat || 'YYYY-MM-DD',
          theme: settings.theme || 'system',
          language: settings.language || 'zh',
          fireEnabled: settings.fireEnabled || false,
          fireSWR: settings.fireSWR
            ? new Decimal(settings.fireSWR)
            : new Decimal(4.0),
          futureDataDays: settings.futureDataDays || 7,
          autoUpdateExchangeRates: settings.autoUpdateExchangeRates || false,
        },
        create: {
          userId,
          baseCurrencyId,
          dateFormat: settings.dateFormat || 'YYYY-MM-DD',
          theme: settings.theme || 'system',
          language: settings.language || 'zh',
          fireEnabled: settings.fireEnabled || false,
          fireSWR: settings.fireSWR
            ? new Decimal(settings.fireSWR)
            : new Decimal(4.0),
          futureDataDays: settings.futureDataDays || 7,
          autoUpdateExchangeRates: settings.autoUpdateExchangeRates || false,
        },
      })

      result.statistics.processed++
      result.statistics.created++
    } catch (error) {
      result.errors.push(
        `导入用户设置失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
      result.statistics.failed++
    }
  }

  /**
   * 导入自定义货币
   */
  private static async importCustomCurrencies(
    tx: any,
    userId: string,
    currencies: any[],
    idMapping: IdMapping,
    result: ImportResult
  ): Promise<void> {
    for (const currency of currencies) {
      try {
        // 检查是否已存在相同代码的货币
        const existing = await tx.currency.findFirst({
          where: {
            code: currency.code,
            createdBy: userId,
          },
        })

        let newCurrency
        if (existing) {
          // 更新现有货币
          newCurrency = await tx.currency.update({
            where: { id: existing.id },
            data: {
              name: currency.name,
              symbol: currency.symbol,
              decimalPlaces: currency.decimalPlaces || 2,
              isCustom: true,
            },
          })
          result.statistics.updated++
        } else {
          // 创建新货币
          newCurrency = await tx.currency.create({
            data: {
              createdBy: userId,
              code: currency.code,
              name: currency.name,
              symbol: currency.symbol,
              decimalPlaces: currency.decimalPlaces || 2,
              isCustom: true,
            },
          })
          result.statistics.created++
        }

        idMapping[currency.id] = newCurrency.id
        result.statistics.processed++
      } catch (error) {
        result.errors.push(
          `导入自定义货币 ${currency.code} 失败: ${error instanceof Error ? error.message : '未知错误'}`
        )
        result.statistics.failed++
      }
    }
  }

  /**
   * 导入用户货币关联
   */
  private static async importUserCurrencies(
    tx: any,
    userId: string,
    userCurrencies: any[],
    currencyIdMapping: IdMapping,
    result: ImportResult
  ): Promise<void> {
    for (const uc of userCurrencies) {
      try {
        // 查找货币ID
        let currencyId = currencyIdMapping[uc.currencyId]
        if (!currencyId) {
          // 尝试通过代码查找
          const currency = await tx.currency.findFirst({
            where: {
              code: uc.currencyCode,
              OR: [{ createdBy: null }, { createdBy: userId }],
            },
          })
          currencyId = currency?.id
        }

        if (!currencyId) {
          result.warnings.push(
            `货币 ${uc.currencyCode} 不存在，跳过用户货币关联`
          )
          result.statistics.skipped++
          continue
        }

        // 检查是否已存在
        const existing = await tx.userCurrency.findUnique({
          where: {
            userId_currencyId: {
              userId,
              currencyId,
            },
          },
        })

        if (existing) {
          // 更新现有关联
          await tx.userCurrency.update({
            where: { id: existing.id },
            data: {
              isActive: uc.isActive,
              order: uc.order,
            },
          })
          result.statistics.updated++
        } else {
          // 创建新关联
          await tx.userCurrency.create({
            data: {
              userId,
              currencyId,
              isActive: uc.isActive,
              order: uc.order,
            },
          })
          result.statistics.created++
        }

        result.statistics.processed++
      } catch (error) {
        result.errors.push(
          `导入用户货币关联 ${uc.currencyCode} 失败: ${error instanceof Error ? error.message : '未知错误'}`
        )
        result.statistics.failed++
      }
    }
  }

  /**
   * 导入汇率数据
   */
  private static async importExchangeRates(
    tx: any,
    userId: string,
    exchangeRates: any[],
    _currencyIdMapping: IdMapping,
    exchangeRateIdMapping: IdMapping,
    result: ImportResult
  ): Promise<void> {
    const ratesToUpdate: { newRateId: string; oldSourceRateId: string }[] = []

    for (const rate of exchangeRates) {
      try {
        // 查找货币ID
        const fromCurrency = await tx.currency.findFirst({
          where: {
            code: rate.fromCurrencyCode,
            OR: [{ createdBy: null }, { createdBy: userId }],
          },
        })
        const toCurrency = await tx.currency.findFirst({
          where: {
            code: rate.toCurrencyCode,
            OR: [{ createdBy: null }, { createdBy: userId }],
          },
        })

        if (!fromCurrency || !toCurrency) {
          result.warnings.push(
            `汇率 ${rate.fromCurrencyCode}/${rate.toCurrencyCode} 的货币不存在，跳过`
          )
          result.statistics.skipped++
          continue
        }

        const effectiveDate = new Date(rate.effectiveDate)

        // 检查是否已存在相同的汇率
        const existing = await tx.exchangeRate.findUnique({
          where: {
            userId_fromCurrencyId_toCurrencyId_effectiveDate: {
              userId,
              fromCurrencyId: fromCurrency.id,
              toCurrencyId: toCurrency.id,
              effectiveDate,
            },
          },
        })

        let newRate
        if (existing) {
          // 更新现有汇率
          newRate = await tx.exchangeRate.update({
            where: { id: existing.id },
            data: {
              rate: new Decimal(rate.rate),
              type: rate.type || 'USER',
              notes: rate.notes,
            },
          })
          result.statistics.updated++
        } else {
          // 创建新汇率
          newRate = await tx.exchangeRate.create({
            data: {
              userId,
              fromCurrencyId: fromCurrency.id,
              toCurrencyId: toCurrency.id,
              rate: new Decimal(rate.rate),
              effectiveDate,
              type: rate.type || 'USER',
              notes: rate.notes,
              // sourceRateId 将在后续步骤中更新
            },
          })
          result.statistics.created++
        }

        exchangeRateIdMapping[rate.id] = newRate.id
        if (rate.sourceRateId) {
          ratesToUpdate.push({
            newRateId: newRate.id,
            oldSourceRateId: rate.sourceRateId,
          })
        }

        result.statistics.processed++
      } catch (error) {
        result.errors.push(
          `导入汇率 ${rate.fromCurrencyCode}/${rate.toCurrencyCode} 失败: ${error instanceof Error ? error.message : '未知错误'}`
        )
        result.statistics.failed++
      }
    }

    // 后处理：更新源汇率ID
    for (const rateToUpdate of ratesToUpdate) {
      const newSourceRateId =
        exchangeRateIdMapping[rateToUpdate.oldSourceRateId]
      if (newSourceRateId) {
        await tx.exchangeRate.update({
          where: { id: rateToUpdate.newRateId },
          data: { sourceRateId: newSourceRateId },
        })
      }
    }
  }

  /**
   * 导入分类
   */
  private static async importCategories(
    tx: any,
    userId: string,
    categories: any[],
    idMapping: IdMapping,
    result: ImportResult,
    options: ImportOptions
  ): Promise<void> {
    // 按层级排序，先导入父级分类
    const sortedCategories = categories.sort((a, b) => {
      if (!a.parentId && b.parentId) return -1
      if (a.parentId && !b.parentId) return 1
      return 0
    })

    for (const category of sortedCategories) {
      try {
        let categoryName = category.name

        // 处理父级分类ID
        let parentId: string | undefined
        if (category.parentId && idMapping[category.parentId]) {
          parentId = idMapping[category.parentId]
        }

        // 检查是否存在同名分类（考虑父分类）
        const existing = await tx.category.findFirst({
          where: {
            userId,
            name: categoryName,
            parentId: parentId || null,
          },
        })

        if (existing) {
          if (options.overwriteExisting) {
            // 覆盖现有分类
            const updatedCategory = await tx.category.update({
              where: { id: existing.id },
              data: {
                type: category.type,
                order: category.order,
              },
            })
            idMapping[category.id] = updatedCategory.id
            result.statistics.processed++
            result.statistics.updated++
            result.warnings.push(`分类 "${category.name}" 已存在，已覆盖更新`)
            continue
          } else if (options.skipDuplicates) {
            // 跳过重复分类
            idMapping[category.id] = existing.id
            result.statistics.skipped++
            continue
          } else {
            // 自动重命名
            let counter = 1
            let newName = `${categoryName} (${counter})`
            while (
              await tx.category.findFirst({
                where: {
                  userId,
                  name: newName,
                  parentId: parentId || null,
                },
              })
            ) {
              counter++
              newName = `${categoryName} (${counter})`
            }
            categoryName = newName
            result.warnings.push(
              `分类 "${category.name}" 已存在，重命名为 "${categoryName}"`
            )
          }
        }

        // 创建新分类
        const newCategory = await tx.category.create({
          data: {
            userId,
            name: categoryName,
            type: category.type,
            parentId,
            order: category.order,
          },
        })

        idMapping[category.id] = newCategory.id
        result.statistics.processed++
        result.statistics.created++
      } catch (error) {
        // 处理数据库约束错误
        const errorMessage = this.handleDatabaseError(
          error,
          '分类',
          category.name
        )
        result.errors.push(errorMessage)
        result.statistics.failed++
      }
    }
  }

  /**
   * 导入标签
   */
  private static async importTags(
    tx: any,
    userId: string,
    tags: any[],
    idMapping: IdMapping,
    result: ImportResult,
    options: ImportOptions
  ): Promise<void> {
    for (const tag of tags) {
      try {
        let tagName = tag.name

        // 检查是否存在同名标签
        const existing = await tx.tag.findFirst({
          where: { userId, name: tagName },
        })

        if (existing) {
          if (options.overwriteExisting) {
            // 覆盖现有标签
            const updatedTag = await tx.tag.update({
              where: { id: existing.id },
              data: {
                color: tag.color,
              },
            })
            idMapping[tag.id] = updatedTag.id
            result.statistics.processed++
            result.statistics.updated++
            result.warnings.push(`标签 "${tag.name}" 已存在，已覆盖更新`)
            continue
          } else if (options.skipDuplicates) {
            // 跳过重复标签
            idMapping[tag.id] = existing.id
            result.statistics.skipped++
            continue
          } else {
            // 自动重命名
            let counter = 1
            let newName = `${tagName} (${counter})`
            while (
              await tx.tag.findFirst({ where: { userId, name: newName } })
            ) {
              counter++
              newName = `${tagName} (${counter})`
            }
            tagName = newName
            result.warnings.push(
              `标签 "${tag.name}" 已存在，重命名为 "${tagName}"`
            )
          }
        }

        // 创建新标签
        const newTag = await tx.tag.create({
          data: {
            userId,
            name: tagName,
            color: tag.color,
          },
        })

        idMapping[tag.id] = newTag.id
        result.statistics.processed++
        result.statistics.created++
      } catch (error) {
        // 处理数据库约束错误
        const errorMessage = this.handleDatabaseError(error, '标签', tag.name)
        result.errors.push(errorMessage)
        result.statistics.failed++
      }
    }
  }

  /**
   * 导入账户
   */
  private static async importAccounts(
    tx: any,
    userId: string,
    accounts: any[],
    categoryIdMapping: IdMapping,
    currencyIdMapping: IdMapping,
    accountIdMapping: IdMapping,
    result: ImportResult,
    options: ImportOptions
  ): Promise<void> {
    for (const account of accounts) {
      try {
        // 查找分类ID
        const categoryId = categoryIdMapping[account.categoryId]
        if (!categoryId) {
          result.errors.push(`账户 ${account.name} 的分类不存在，跳过`)
          result.statistics.failed++
          continue
        }

        // 查找货币ID
        let currencyId = currencyIdMapping[account.currencyId]
        if (!currencyId) {
          const currency = await tx.currency.findFirst({
            where: {
              code: account.currencyCode,
              OR: [{ createdBy: null }, { createdBy: userId }],
            },
          })
          currencyId = currency?.id
        }

        if (!currencyId) {
          result.errors.push(
            `账户 ${account.name} 的货币 ${account.currencyCode} 不存在，跳过`
          )
          result.statistics.failed++
          continue
        }

        let accountName = account.name

        // 检查是否存在同名账户
        const existing = await tx.account.findFirst({
          where: { userId, name: accountName },
        })

        if (existing) {
          if (options.overwriteExisting) {
            // 覆盖现有账户
            const updatedAccount = await tx.account.update({
              where: { id: existing.id },
              data: {
                description: account.description,
                color: account.color,
                categoryId,
                currencyId,
              },
            })
            accountIdMapping[account.id] = updatedAccount.id
            result.statistics.processed++
            result.statistics.updated++
            result.warnings.push(`账户 "${account.name}" 已存在，已覆盖更新`)
            continue
          } else if (options.skipDuplicates) {
            // 跳过重复账户
            accountIdMapping[account.id] = existing.id
            result.statistics.skipped++
            continue
          } else {
            // 自动重命名
            let counter = 1
            let newName = `${accountName} (${counter})`
            while (
              await tx.account.findFirst({ where: { userId, name: newName } })
            ) {
              counter++
              newName = `${accountName} (${counter})`
            }
            accountName = newName
            result.warnings.push(
              `账户 "${account.name}" 已存在，重命名为 "${accountName}"`
            )
          }
        }

        // 创建新账户
        const newAccount = await tx.account.create({
          data: {
            userId,
            name: accountName,
            description: account.description,
            color: account.color,
            categoryId,
            currencyId,
          },
        })

        accountIdMapping[account.id] = newAccount.id
        result.statistics.processed++
        result.statistics.created++
      } catch (error) {
        // 处理数据库约束错误
        const errorMessage = this.handleDatabaseError(
          error,
          '账户',
          account.name
        )
        result.errors.push(errorMessage)
        result.statistics.failed++
      }
    }
  }

  /**
   * 导入交易模板
   */
  private static async importTransactionTemplates(
    tx: any,
    userId: string,
    templates: any[],
    accountIdMapping: IdMapping,
    categoryIdMapping: IdMapping,
    currencyIdMapping: IdMapping,
    tagIdMapping: IdMapping,
    templateIdMapping: IdMapping,
    result: ImportResult,
    options: ImportOptions
  ): Promise<void> {
    for (const template of templates) {
      try {
        // 查找账户ID
        const accountId = accountIdMapping[template.accountId]
        if (!accountId) {
          result.warnings.push(`交易模板 ${template.name} 的账户不存在，跳过`)
          result.statistics.skipped++
          continue
        }

        // 查找分类ID
        const categoryId = categoryIdMapping[template.categoryId]
        if (!categoryId) {
          result.warnings.push(`交易模板 ${template.name} 的分类不存在，跳过`)
          result.statistics.skipped++
          continue
        }

        // 查找货币ID
        let currencyId = currencyIdMapping[template.currencyId]
        if (!currencyId) {
          const currency = await tx.currency.findFirst({
            where: {
              code: template.currencyCode,
              OR: [{ createdBy: null }, { createdBy: userId }],
            },
          })
          currencyId = currency?.id
        }

        if (!currencyId) {
          result.warnings.push(`交易模板 ${template.name} 的货币不存在，跳过`)
          result.statistics.skipped++
          continue
        }

        let templateName = template.name

        // 检查是否存在同名交易模板
        const existing = await tx.transactionTemplate.findFirst({
          where: { userId, name: templateName },
        })

        if (existing) {
          if (options.overwriteExisting) {
            // 映射标签ID
            const newTagIds =
              template.tagIds
                ?.map((oldId: string) => tagIdMapping[oldId])
                .filter(Boolean) || []

            // 覆盖现有交易模板
            const updatedTemplate = await tx.transactionTemplate.update({
              where: { id: existing.id },
              data: {
                type: template.type,
                description: template.description,
                notes: template.notes,
                accountId,
                currencyId,
                tagIds: newTagIds,
              },
            })
            templateIdMapping[template.id] = updatedTemplate.id
            result.statistics.processed++
            result.statistics.updated++
            result.warnings.push(
              `交易模板 "${template.name}" 已存在，已覆盖更新`
            )
            continue
          } else if (options.skipDuplicates) {
            // 跳过重复交易模板
            templateIdMapping[template.id] = existing.id
            result.statistics.skipped++
            continue
          } else {
            // 自动重命名
            let counter = 1
            let newName = `${templateName} (${counter})`
            while (
              await tx.transactionTemplate.findFirst({
                where: { userId, name: newName },
              })
            ) {
              counter++
              newName = `${templateName} (${counter})`
            }
            templateName = newName
            result.warnings.push(
              `交易模板 "${template.name}" 已存在，重命名为 "${templateName}"`
            )
          }
        }

        // 映射标签ID
        const newTagIds =
          template.tagIds
            ?.map((oldId: string) => tagIdMapping[oldId])
            .filter(Boolean) || []

        // 创建新交易模板
        const newTemplate = await tx.transactionTemplate.create({
          data: {
            userId,
            name: templateName,
            type: template.type,
            description: template.description,
            notes: template.notes,
            accountId,
            currencyId,
            tagIds: newTagIds,
          },
        })

        templateIdMapping[template.id] = newTemplate.id
        result.statistics.processed++
        result.statistics.created++
      } catch (error) {
        // 处理数据库约束错误
        const errorMessage = this.handleDatabaseError(
          error,
          '交易模板',
          template.name
        )
        result.errors.push(errorMessage)
        result.statistics.failed++
      }
    }
  }

  /**
   * 导入定期交易
   * 使用批量插入优化性能
   */
  private static async importRecurringTransactions(
    tx: any,
    userId: string,
    recurringTransactions: any[],
    accountIdMapping: IdMapping,
    currencyIdMapping: IdMapping,
    tagIdMapping: IdMapping,
    recurringIdMapping: IdMapping,
    result: ImportResult,
    options: ImportOptions
  ): Promise<void> {
    if (recurringTransactions.length === 0) return

    const startTime = Date.now()
    console.log(`🚀 开始批量导入 ${recurringTransactions.length} 条定期交易...`)

    // 进度回调
    if (options.onProgress) {
      options.onProgress({
        stage: 'importing',
        current: 0,
        total: recurringTransactions.length,
        percentage: 0,
        message: `开始导入 ${recurringTransactions.length} 条定期交易...`,
        dataType: 'recurringTransactions',
      })
    }

    // 预处理货币映射
    const missingCurrencyIds = new Set<string>()
    for (const rt of recurringTransactions) {
      if (!currencyIdMapping[rt.currencyId] && rt.currencyCode) {
        missingCurrencyIds.add(rt.currencyCode)
      }
    }

    if (missingCurrencyIds.size > 0) {
      const additionalCurrencies = await tx.currency.findMany({
        where: {
          code: { in: Array.from(missingCurrencyIds) },
          OR: [{ createdBy: null }, { createdBy: userId }],
        },
      })

      for (const currency of additionalCurrencies) {
        const originalCurrency = recurringTransactions.find(
          rt => rt.currencyCode === currency.code
        )
        if (originalCurrency && originalCurrency.currencyId) {
          currencyIdMapping[originalCurrency.currencyId] = currency.id
        }
      }
    }

    // 预处理和验证数据
    const validRecurringTransactions: any[] = []

    for (const rt of recurringTransactions) {
      // 验证账户ID
      const accountId = accountIdMapping[rt.accountId]
      if (!accountId) {
        result.warnings.push(`定期交易 ${rt.description} 的账户不存在，跳过`)
        result.statistics.skipped++
        continue
      }

      // 验证货币ID
      const currencyId = currencyIdMapping[rt.currencyId]
      if (!currencyId) {
        result.warnings.push(`定期交易 ${rt.description} 的货币不存在，跳过`)
        result.statistics.skipped++
        continue
      }

      // 映射标签ID
      const newTagIds =
        rt.tagIds
          ?.map((oldId: string) => tagIdMapping[oldId])
          .filter(Boolean) || []

      validRecurringTransactions.push({
        originalId: rt.id,
        data: {
          userId,
          accountId,
          currencyId,
          type: rt.type,
          amount: new Decimal(rt.amount),
          description: rt.description,
          notes: rt.notes,
          tagIds: newTagIds,
          frequency: rt.frequency,
          interval: rt.interval,
          dayOfMonth: rt.dayOfMonth,
          dayOfWeek: rt.dayOfWeek,
          monthOfYear: rt.monthOfYear,
          startDate: new Date(rt.startDate),
          endDate: rt.endDate ? new Date(rt.endDate) : null,
          nextDate: new Date(rt.nextDate),
          maxOccurrences: rt.maxOccurrences,
          currentCount: rt.currentCount || 0,
          isActive: rt.isActive,
        },
      })
    }

    if (validRecurringTransactions.length === 0) {
      this.logPerformance('定期交易批量导入', startTime, 0)
      return
    }

    try {
      // 批量创建定期交易
      const createdRecurringTransactions =
        await tx.recurringTransaction.createManyAndReturn({
          data: validRecurringTransactions.map(rt => rt.data),
        })

      // 更新ID映射
      for (let i = 0; i < createdRecurringTransactions.length; i++) {
        const originalId = validRecurringTransactions[i].originalId
        recurringIdMapping[originalId] = createdRecurringTransactions[i].id
      }

      result.statistics.processed += createdRecurringTransactions.length
      result.statistics.created += createdRecurringTransactions.length

      // 更新完成进度
      if (options.onProgress) {
        options.onProgress({
          stage: 'importing',
          current: createdRecurringTransactions.length,
          total: recurringTransactions.length,
          percentage: 100,
          message: `已完成 ${createdRecurringTransactions.length} 条定期交易导入`,
          dataType: 'recurringTransactions',
        })
      }

      this.logPerformance(
        '定期交易批量导入',
        startTime,
        createdRecurringTransactions.length
      )
    } catch (error) {
      // 如果批量插入失败，回退到逐条插入
      console.warn('定期交易批量插入失败，回退到逐条插入:', error)

      for (const rt of validRecurringTransactions) {
        try {
          const newRecurring = await tx.recurringTransaction.create({
            data: rt.data,
          })

          recurringIdMapping[rt.originalId] = newRecurring.id
          result.statistics.processed++
          result.statistics.created++
        } catch (individualError) {
          result.errors.push(
            `导入定期交易 ${rt.data.description} 失败: ${individualError instanceof Error ? individualError.message : '未知错误'}`
          )
          result.statistics.failed++
        }
      }

      this.logPerformance(
        '定期交易逐条导入（回退）',
        startTime,
        result.statistics.created
      )
    }
  }

  /**
   * 导入贷款合约
   * 使用批量插入优化性能
   */
  private static async importLoanContracts(
    tx: any,
    userId: string,
    loanContracts: any[],
    accountIdMapping: IdMapping,
    currencyIdMapping: IdMapping,
    tagIdMapping: IdMapping,
    loanIdMapping: IdMapping,
    result: ImportResult,
    options: ImportOptions
  ): Promise<void> {
    if (loanContracts.length === 0) return

    const startTime = Date.now()
    console.log(`🚀 开始批量导入 ${loanContracts.length} 条贷款合约...`)

    // 进度回调
    if (options.onProgress) {
      options.onProgress({
        stage: 'importing',
        current: 0,
        total: loanContracts.length,
        percentage: 0,
        message: `开始导入 ${loanContracts.length} 条贷款合约...`,
        dataType: 'loanContracts',
      })
    }

    // 预处理货币映射
    const missingCurrencyIds = new Set<string>()
    for (const loan of loanContracts) {
      if (!currencyIdMapping[loan.currencyId] && loan.currencyCode) {
        missingCurrencyIds.add(loan.currencyCode)
      }
    }

    if (missingCurrencyIds.size > 0) {
      const additionalCurrencies = await tx.currency.findMany({
        where: {
          code: { in: Array.from(missingCurrencyIds) },
          OR: [{ createdBy: null }, { createdBy: userId }],
        },
      })

      for (const currency of additionalCurrencies) {
        const originalLoan = loanContracts.find(
          loan => loan.currencyCode === currency.code
        )
        if (originalLoan && originalLoan.currencyId) {
          currencyIdMapping[originalLoan.currencyId] = currency.id
        }
      }
    }

    // 预处理和验证数据
    const validLoanContracts: Array<{
      originalId: string
      data: any
    }> = []

    for (const loan of loanContracts) {
      // 验证账户ID
      const accountId = accountIdMapping[loan.accountId]
      if (!accountId) {
        result.warnings.push(`贷款合约 ${loan.contractName} 的账户不存在，跳过`)
        result.statistics.skipped++
        continue
      }

      // 验证货币ID
      const currencyId = currencyIdMapping[loan.currencyId]
      if (!currencyId) {
        result.warnings.push(`贷款合约 ${loan.contractName} 的货币不存在，跳过`)
        result.statistics.skipped++
        continue
      }

      // 查找还款账户ID（可选）
      let paymentAccountId: string | undefined
      if (loan.paymentAccountId) {
        paymentAccountId = accountIdMapping[loan.paymentAccountId]
        if (!paymentAccountId) {
          result.warnings.push(
            `贷款合约 ${loan.contractName} 的还款账户不存在，将设为空`
          )
        }
      }

      // 映射标签ID
      const newTagIds =
        loan.transactionTagIds
          ?.map((oldId: string) => tagIdMapping[oldId])
          .filter(Boolean) || []

      validLoanContracts.push({
        originalId: loan.id,
        data: {
          userId,
          accountId,
          currencyId,
          contractName: loan.contractName,
          loanAmount: new Decimal(loan.loanAmount),
          interestRate: new Decimal(loan.interestRate),
          totalPeriods: loan.totalPeriods,
          repaymentType: loan.repaymentType,
          startDate: new Date(loan.startDate),
          paymentDay: loan.paymentDay,
          paymentAccountId,
          transactionDescription: loan.transactionDescription,
          transactionNotes: loan.transactionNotes,
          transactionTagIds: newTagIds,
          isActive: loan.isActive,
        },
      })
    }

    if (validLoanContracts.length === 0) {
      this.logPerformance('贷款合约批量导入', startTime, 0)
      return
    }

    try {
      // 批量创建贷款合约
      const createdLoanContracts = await tx.loanContract.createManyAndReturn({
        data: validLoanContracts.map(loan => loan.data),
      })

      // 更新ID映射
      for (let i = 0; i < createdLoanContracts.length; i++) {
        const originalId = validLoanContracts[i].originalId
        loanIdMapping[originalId] = createdLoanContracts[i].id
      }

      result.statistics.processed += createdLoanContracts.length
      result.statistics.created += createdLoanContracts.length

      // 更新完成进度
      if (options.onProgress) {
        options.onProgress({
          stage: 'importing',
          current: createdLoanContracts.length,
          total: loanContracts.length,
          percentage: 100,
          message: `已完成 ${createdLoanContracts.length} 条贷款合约导入`,
          dataType: 'loanContracts',
        })
      }

      this.logPerformance(
        '贷款合约批量导入',
        startTime,
        createdLoanContracts.length
      )
    } catch (error) {
      // 如果批量插入失败，回退到逐条插入
      console.warn('贷款合约批量插入失败，回退到逐条插入:', error)

      for (const validLoan of validLoanContracts) {
        try {
          const newLoan = await tx.loanContract.create({
            data: validLoan.data,
          })

          loanIdMapping[validLoan.originalId] = newLoan.id
          result.statistics.processed++
          result.statistics.created++
        } catch (individualError) {
          result.errors.push(
            `导入贷款合约 ${validLoan.data.contractName} 失败: ${individualError instanceof Error ? individualError.message : '未知错误'}`
          )
          result.statistics.failed++
        }
      }

      this.logPerformance(
        '贷款合约逐条导入（回退）',
        startTime,
        result.statistics.created
      )
    }
  }

  /**
   * 导入贷款还款记录
   * 使用批量插入优化性能
   */
  private static async importLoanPayments(
    tx: any,
    userId: string,
    loanPayments: any[],
    loanIdMapping: IdMapping,
    paymentIdMapping: IdMapping,
    paymentsToUpdate: any[],
    result: ImportResult,
    options: ImportOptions
  ): Promise<void> {
    if (loanPayments.length === 0) return

    const startTime = Date.now()
    console.log(`🚀 开始批量导入 ${loanPayments.length} 条贷款还款记录...`)

    // 进度回调
    if (options.onProgress) {
      options.onProgress({
        stage: 'importing',
        current: 0,
        total: loanPayments.length,
        percentage: 0,
        message: `开始导入 ${loanPayments.length} 条贷款还款记录...`,
        dataType: 'loanPayments',
      })
    }

    // 预处理和验证数据
    const validLoanPayments: Array<{
      originalId: string
      data: any
      transactionIds?: {
        oldPrincipalTxId?: string
        oldInterestTxId?: string
        oldBalanceTxId?: string
      }
    }> = []

    for (const payment of loanPayments) {
      // 验证贷款合约ID
      const loanContractId = loanIdMapping[payment.loanContractId]
      if (!loanContractId) {
        result.warnings.push(
          `贷款还款记录 期数${payment.period} 的贷款合约不存在，跳过`
        )
        result.statistics.skipped++
        continue
      }

      const paymentData = {
        userId,
        loanContractId,
        period: payment.period,
        paymentDate: new Date(payment.paymentDate),
        principalAmount: new Decimal(payment.principalAmount),
        interestAmount: new Decimal(payment.interestAmount),
        totalAmount: new Decimal(payment.totalAmount),
        remainingBalance: new Decimal(payment.remainingBalance),
        status: payment.status,
        processedAt: payment.processedAt ? new Date(payment.processedAt) : null,
        // 交易ID将在后续步骤中更新
      }

      const validPayment: any = {
        originalId: payment.id,
        data: paymentData,
      }

      // 收集需要后续更新的交易ID信息
      if (
        payment.principalTransactionId ||
        payment.interestTransactionId ||
        payment.balanceTransactionId
      ) {
        validPayment.transactionIds = {
          oldPrincipalTxId: payment.principalTransactionId,
          oldInterestTxId: payment.interestTransactionId,
          oldBalanceTxId: payment.balanceTransactionId,
        }
      }

      validLoanPayments.push(validPayment)
    }

    if (validLoanPayments.length === 0) {
      this.logPerformance('贷款还款记录批量导入', startTime, 0)
      return
    }

    try {
      // 批量创建贷款还款记录
      const createdLoanPayments = await tx.loanPayment.createManyAndReturn({
        data: validLoanPayments.map(payment => payment.data),
      })

      // 更新ID映射和收集需要后续更新的交易ID
      for (let i = 0; i < createdLoanPayments.length; i++) {
        const originalPayment = validLoanPayments[i]
        const createdPayment = createdLoanPayments[i]

        paymentIdMapping[originalPayment.originalId] = createdPayment.id

        // 暂存需要后续更新的交易ID
        if (originalPayment.transactionIds) {
          paymentsToUpdate.push({
            newPaymentId: createdPayment.id,
            oldPrincipalTxId: originalPayment.transactionIds.oldPrincipalTxId,
            oldInterestTxId: originalPayment.transactionIds.oldInterestTxId,
            oldBalanceTxId: originalPayment.transactionIds.oldBalanceTxId,
          })
        }
      }

      result.statistics.processed += createdLoanPayments.length
      result.statistics.created += createdLoanPayments.length

      // 更新完成进度
      if (options.onProgress) {
        options.onProgress({
          stage: 'importing',
          current: createdLoanPayments.length,
          total: loanPayments.length,
          percentage: 100,
          message: `已完成 ${createdLoanPayments.length} 条贷款还款记录导入`,
          dataType: 'loanPayments',
        })
      }

      this.logPerformance(
        '贷款还款记录批量导入',
        startTime,
        createdLoanPayments.length
      )
    } catch (error) {
      // 如果批量插入失败，回退到逐条插入
      console.warn('贷款还款记录批量插入失败，回退到逐条插入:', error)

      for (const validPayment of validLoanPayments) {
        try {
          const newPayment = await tx.loanPayment.create({
            data: validPayment.data,
          })

          paymentIdMapping[validPayment.originalId] = newPayment.id

          // 暂存需要后续更新的交易ID
          if (validPayment.transactionIds) {
            paymentsToUpdate.push({
              newPaymentId: newPayment.id,
              oldPrincipalTxId: validPayment.transactionIds.oldPrincipalTxId,
              oldInterestTxId: validPayment.transactionIds.oldInterestTxId,
              oldBalanceTxId: validPayment.transactionIds.oldBalanceTxId,
            })
          }

          result.statistics.processed++
          result.statistics.created++
        } catch (individualError) {
          result.errors.push(
            `导入贷款还款记录 期数${validPayment.data.period} 失败: ${individualError instanceof Error ? individualError.message : '未知错误'}`
          )
          result.statistics.failed++
        }
      }

      this.logPerformance(
        '贷款还款记录逐条导入（回退）',
        startTime,
        result.statistics.created
      )
    }
  }

  /**
   * 导入交易（最后导入，因为可能依赖其他数据）
   * 使用批量插入优化性能
   */
  private static async importTransactions(
    tx: any,
    userId: string,
    transactions: any[],
    accountIdMapping: IdMapping,
    _categoryIdMapping: IdMapping, // 分类信息通过账户获取，此参数不再需要
    currencyIdMapping: IdMapping,
    tagIdMapping: IdMapping,
    recurringIdMapping: IdMapping,
    loanIdMapping: IdMapping,
    paymentIdMapping: IdMapping,
    transactionIdMapping: IdMapping,
    result: ImportResult,
    options: ImportOptions
  ): Promise<void> {
    const startTime = Date.now()
    console.log(`🚀 开始批量导入 ${transactions.length} 条交易记录...`)

    // 使用固定的批次大小，优化性能和内存使用
    const BATCH_SIZE = 100
    const totalBatches = Math.ceil(transactions.length / BATCH_SIZE)

    console.log(`📦 批次配置: ${BATCH_SIZE} 条/批次，共 ${totalBatches} 个批次`)

    // 进度回调
    if (options.onProgress) {
      options.onProgress({
        stage: 'importing',
        current: 0,
        total: transactions.length,
        percentage: 0,
        message: `开始导入 ${transactions.length} 条交易记录 (${BATCH_SIZE} 条/批次)...`,
        batchInfo: {
          currentBatch: 0,
          totalBatches,
        },
      })
    }

    // 预处理：批量查找缺失的货币ID，避免在循环中重复查询
    const missingCurrencyIds = new Set<string>()
    for (const transaction of transactions) {
      if (
        !currencyIdMapping[transaction.currencyId] &&
        transaction.currencyCode
      ) {
        missingCurrencyIds.add(transaction.currencyCode)
      }
    }

    // 批量查找货币
    const additionalCurrencies = await tx.currency.findMany({
      where: {
        code: { in: Array.from(missingCurrencyIds) },
        OR: [{ createdBy: null }, { createdBy: userId }],
      },
    })

    // 更新货币ID映射
    for (const currency of additionalCurrencies) {
      // 找到对应的原始货币ID
      const originalCurrency = transactions.find(
        t => t.currencyCode === currency.code
      )
      if (originalCurrency && originalCurrency.currencyId) {
        currencyIdMapping[originalCurrency.currencyId] = currency.id
      }
    }

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE)
      const currentBatch = Math.floor(i / BATCH_SIZE) + 1
      const batchStartTime = Date.now()

      console.log(
        `📦 处理第 ${currentBatch}/${totalBatches} 批次 (${batch.length} 条记录)`
      )

      // 更新批次开始进度
      if (options.onProgress) {
        options.onProgress({
          stage: 'importing',
          current: i,
          total: transactions.length,
          percentage: Math.round((i / transactions.length) * 100),
          message: `正在处理第 ${currentBatch}/${totalBatches} 批次交易记录...`,
          dataType: 'transactions',
          batchInfo: {
            currentBatch,
            totalBatches,
            batchProgress: 0,
          },
        })
      }

      // 预处理批次数据，过滤无效交易
      const validTransactions: any[] = []
      const transactionTagsToCreate: Array<{
        transactionIndex: number
        tagIds: string[]
      }> = []

      for (let j = 0; j < batch.length; j++) {
        const transaction = batch[j]

        // 验证账户ID
        const accountId = accountIdMapping[transaction.accountId]
        if (!accountId) {
          result.warnings.push(
            `交易 ${transaction.description} 的账户不存在，跳过`
          )
          result.statistics.skipped++
          continue
        }

        // 验证货币ID
        const currencyId = currencyIdMapping[transaction.currencyId]
        if (!currencyId) {
          result.warnings.push(
            `交易 ${transaction.description} 的货币不存在，跳过`
          )
          result.statistics.skipped++
          continue
        }

        // 处理关联ID（可选）
        const recurringTransactionId = transaction.recurringTransactionId
          ? recurringIdMapping[transaction.recurringTransactionId]
          : null
        const loanContractId = transaction.loanContractId
          ? loanIdMapping[transaction.loanContractId]
          : null
        const loanPaymentId = transaction.loanPaymentId
          ? paymentIdMapping[transaction.loanPaymentId]
          : null

        // 准备交易数据
        const transactionData = {
          userId,
          accountId,
          currencyId,
          type: transaction.type,
          amount: new Decimal(transaction.amount),
          description: transaction.description,
          notes: transaction.notes,
          date: new Date(transaction.date),
          recurringTransactionId,
          loanContractId,
          loanPaymentId,
        }

        validTransactions.push(transactionData)

        // 收集标签信息
        if (transaction.tags && transaction.tags.length > 0) {
          const validTagIds = transaction.tags
            .map((tag: any) => tagIdMapping[tag.id])
            .filter(Boolean)

          if (validTagIds.length > 0) {
            transactionTagsToCreate.push({
              transactionIndex: validTransactions.length - 1,
              tagIds: validTagIds,
            })
          }
        }
      }

      if (validTransactions.length === 0) {
        continue
      }

      try {
        // 批量创建交易记录
        const createdTransactions = await tx.transaction.createManyAndReturn({
          data: validTransactions,
        })

        // 更新ID映射
        for (let k = 0; k < createdTransactions.length; k++) {
          const originalTransaction = batch.find(
            t =>
              accountIdMapping[t.accountId] ===
                validTransactions[k].accountId &&
              t.description === validTransactions[k].description &&
              new Date(t.date).getTime() ===
                validTransactions[k].date.getTime() &&
              new Decimal(t.amount).equals(validTransactions[k].amount)
          )

          if (originalTransaction) {
            transactionIdMapping[originalTransaction.id] =
              createdTransactions[k].id
          }
        }

        // 批量创建标签关联
        if (transactionTagsToCreate.length > 0) {
          const tagAssociations: Array<{
            transactionId: string
            tagId: string
          }> = []

          for (const tagInfo of transactionTagsToCreate) {
            const createdTransaction =
              createdTransactions[tagInfo.transactionIndex]
            if (createdTransaction) {
              for (const tagId of tagInfo.tagIds) {
                tagAssociations.push({
                  transactionId: createdTransaction.id,
                  tagId,
                })
              }
            }
          }

          if (tagAssociations.length > 0) {
            // 去重处理：移除重复的标签关联
            const uniqueTagAssociations =
              this.removeDuplicateTagAssociations(tagAssociations)

            try {
              await tx.transactionTag.createMany({
                data: uniqueTagAssociations,
              })
            } catch (error) {
              // 如果批量插入失败，尝试逐条插入以处理可能的重复数据
              console.warn('标签关联批量插入失败，尝试逐条插入:', error)
              await this.createTagAssociationsIndividually(
                tx,
                uniqueTagAssociations,
                result
              )
            }
          }
        }

        result.statistics.processed += createdTransactions.length
        result.statistics.created += createdTransactions.length

        // 计算批次处理时间和预估剩余时间
        const batchEndTime = Date.now()
        const batchDuration = batchEndTime - batchStartTime
        const avgTimePerBatch = (batchEndTime - startTime) / currentBatch
        const remainingBatches = totalBatches - currentBatch
        const estimatedTimeRemaining = remainingBatches * avgTimePerBatch

        // 更新批次完成进度
        if (options.onProgress) {
          const currentProgress = Math.min(
            i + validTransactions.length,
            transactions.length
          )
          const percentage = Math.round(
            (currentProgress / transactions.length) * 100
          )

          console.log(
            `✅ 第 ${currentBatch} 批次完成，耗时 ${batchDuration}ms，预估剩余 ${Math.round(estimatedTimeRemaining / 1000)}s`
          )

          options.onProgress({
            stage: 'importing',
            current: currentProgress,
            total: transactions.length,
            percentage,
            message: `已完成第 ${currentBatch}/${totalBatches} 批次 (${currentProgress}/${transactions.length} 条记录)`,
            dataType: 'transactions',
            batchInfo: {
              currentBatch,
              totalBatches,
              batchProgress: 100,
            },
            estimatedTimeRemaining: Math.round(estimatedTimeRemaining),
          })
        }
      } catch (error) {
        // 如果批量插入失败，回退到逐条插入以获得更详细的错误信息
        console.warn('批量插入失败，回退到逐条插入:', error)
        await this.importTransactionsFallback(
          tx,
          userId,
          batch,
          accountIdMapping,
          currencyIdMapping,
          tagIdMapping,
          recurringIdMapping,
          loanIdMapping,
          paymentIdMapping,
          transactionIdMapping,
          result
        )
      }
    }

    // 记录性能统计
    this.logPerformance('交易批量导入', startTime, result.statistics.created)
  }

  /**
   * 回退方法：逐条插入交易（当批量插入失败时使用）
   */
  private static async importTransactionsFallback(
    tx: any,
    userId: string,
    transactions: any[],
    accountIdMapping: IdMapping,
    currencyIdMapping: IdMapping,
    tagIdMapping: IdMapping,
    recurringIdMapping: IdMapping,
    loanIdMapping: IdMapping,
    paymentIdMapping: IdMapping,
    transactionIdMapping: IdMapping,
    result: ImportResult
  ): Promise<void> {
    for (const transaction of transactions) {
      try {
        // 查找账户ID
        const accountId = accountIdMapping[transaction.accountId]
        if (!accountId) {
          result.warnings.push(
            `交易 ${transaction.description} 的账户不存在，跳过`
          )
          result.statistics.skipped++
          continue
        }

        // 查找货币ID
        const currencyId = currencyIdMapping[transaction.currencyId]
        if (!currencyId) {
          result.warnings.push(
            `交易 ${transaction.description} 的货币不存在，跳过`
          )
          result.statistics.skipped++
          continue
        }

        // 处理关联ID（可选）
        const recurringTransactionId = transaction.recurringTransactionId
          ? recurringIdMapping[transaction.recurringTransactionId]
          : null
        const loanContractId = transaction.loanContractId
          ? loanIdMapping[transaction.loanContractId]
          : null
        const loanPaymentId = transaction.loanPaymentId
          ? paymentIdMapping[transaction.loanPaymentId]
          : null

        // 创建交易
        const newTransaction = await tx.transaction.create({
          data: {
            userId,
            accountId,
            currencyId,
            type: transaction.type,
            amount: new Decimal(transaction.amount),
            description: transaction.description,
            notes: transaction.notes,
            date: new Date(transaction.date),
            recurringTransactionId,
            loanContractId,
            loanPaymentId,
          },
        })

        // 处理标签关联
        if (transaction.tags && transaction.tags.length > 0) {
          const tagAssociations = transaction.tags
            .map((tag: any) => tagIdMapping[tag.id])
            .filter(Boolean)
            .map((tagId: string) => ({
              transactionId: newTransaction.id,
              tagId,
            }))

          if (tagAssociations.length > 0) {
            // 去重处理
            const uniqueTagAssociations =
              this.removeDuplicateTagAssociations(tagAssociations)

            try {
              await tx.transactionTag.createMany({
                data: uniqueTagAssociations,
              })
            } catch {
              // 逐条创建以处理重复数据
              await this.createTagAssociationsIndividually(
                tx,
                uniqueTagAssociations,
                result
              )
            }
          }
        }

        transactionIdMapping[transaction.id] = newTransaction.id
        result.statistics.processed++
        result.statistics.created++
      } catch (error) {
        result.errors.push(
          `导入交易 ${transaction.description} 失败: ${error instanceof Error ? error.message : '未知错误'}`
        )
        result.statistics.failed++
      }
    }
  }

  /**
   * 处理数据库错误，转换为用户友好的错误信息
   */
  private static handleDatabaseError(
    error: any,
    entityType: string,
    entityName: string
  ): string {
    if (error instanceof Error) {
      // 处理唯一约束冲突
      if (
        error.message.includes('UNIQUE constraint failed') ||
        error.message.includes('unique constraint') ||
        error.message.includes('duplicate key')
      ) {
        return `${entityType} "${entityName}" 已存在，无法创建重复记录`
      }

      // 处理外键约束
      if (
        error.message.includes('FOREIGN KEY constraint failed') ||
        error.message.includes('foreign key constraint')
      ) {
        return `${entityType} "${entityName}" 引用的关联数据不存在`
      }

      // 处理其他数据库错误
      if (error.message.includes('NOT NULL constraint failed')) {
        return `${entityType} "${entityName}" 缺少必需的字段`
      }

      return `导入${entityType} "${entityName}" 失败: ${error.message}`
    }

    return `导入${entityType} "${entityName}" 失败: 未知错误`
  }
}
