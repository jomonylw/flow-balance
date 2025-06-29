/**
 * 数据导入服务
 * 处理用户数据的完整导入，确保数据完整性和一致性
 */

import { prisma } from '@/lib/database/prisma'
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
   * 验证导入数据的完整性和格式
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
        errors.push('导入数据格式不正确：缺少基本信息')
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

      // 检查系统中是否存在这些货币
      for (const currencyCode of requiredCurrencies) {
        const existingCurrency = await prisma.currency.findFirst({
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
      // 首先验证数据
      if (options.validateData !== false) {
        const validation = await this.validateImportData(data)
        if (!validation.isValid) {
          result.errors = validation.errors
          result.message = '数据验证失败'
          return result
        }
        result.warnings = validation.warnings
      }

      // 使用事务确保数据一致性
      await prisma.$transaction(async tx => {
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
        }

        // 1. 导入用户设置
        if (data.userSettings) {
          await this.importUserSettings(tx, userId, data.userSettings, result)
        }

        // 2. 导入自定义货币
        if (data.customCurrencies?.length > 0) {
          await this.importCustomCurrencies(
            tx,
            userId,
            data.customCurrencies,
            idMappings.currencies,
            result
          )
        }

        // 3. 导入用户货币关联
        if (data.userCurrencies?.length > 0) {
          await this.importUserCurrencies(
            tx,
            userId,
            data.userCurrencies,
            idMappings.currencies,
            result
          )
        }

        // 4. 导入汇率数据
        if (data.exchangeRates?.length > 0) {
          await this.importExchangeRates(
            tx,
            userId,
            data.exchangeRates,
            idMappings.currencies,
            result
          )
        }

        // 5. 导入分类
        if (data.categories?.length > 0) {
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
        if (data.tags?.length > 0) {
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
        if (data.accounts?.length > 0) {
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
        if (data.transactionTemplates?.length > 0) {
          await this.importTransactionTemplates(
            tx,
            userId,
            data.transactionTemplates,
            idMappings.accounts,
            idMappings.categories,
            idMappings.currencies,
            idMappings.transactionTemplates,
            result,
            options
          )
        }

        // 9. 导入定期交易
        if (data.recurringTransactions?.length > 0) {
          await this.importRecurringTransactions(
            tx,
            userId,
            data.recurringTransactions,
            idMappings.accounts,
            idMappings.currencies,
            idMappings.recurringTransactions,
            result,
            options
          )
        }

        // 10. 导入贷款合约
        if (data.loanContracts?.length > 0) {
          await this.importLoanContracts(
            tx,
            userId,
            data.loanContracts,
            idMappings.accounts,
            idMappings.currencies,
            idMappings.loanContracts,
            result,
            options
          )
        }

        // 11. 导入贷款还款记录
        if (data.loanPayments?.length > 0) {
          await this.importLoanPayments(
            tx,
            userId,
            data.loanPayments,
            idMappings.loanContracts,
            idMappings.loanPayments,
            result,
            options
          )
        }

        // 12. 导入交易（最后导入，因为可能依赖其他数据）
        if (data.transactions?.length > 0) {
          await this.importTransactions(
            tx,
            userId,
            data.transactions,
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
      })

      result.success = result.statistics.failed === 0
      result.message = result.success
        ? `导入成功：创建 ${result.statistics.created} 条记录，更新 ${result.statistics.updated} 条记录`
        : `导入部分成功：${result.statistics.failed} 条记录失败`

      return result
    } catch (error) {
      result.errors.push(
        `导入过程中发生错误: ${error instanceof Error ? error.message : '未知错误'}`
      )
      result.message = '导入失败'
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
    currencyIdMapping: IdMapping,
    result: ImportResult
  ): Promise<void> {
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

        if (existing) {
          // 更新现有汇率
          await tx.exchangeRate.update({
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
          await tx.exchangeRate.create({
            data: {
              userId,
              fromCurrencyId: fromCurrency.id,
              toCurrencyId: toCurrency.id,
              rate: new Decimal(rate.rate),
              effectiveDate,
              type: rate.type || 'USER',
              notes: rate.notes,
            },
          })
          result.statistics.created++
        }

        result.statistics.processed++
      } catch (error) {
        result.errors.push(
          `导入汇率 ${rate.fromCurrencyCode}/${rate.toCurrencyCode} 失败: ${error instanceof Error ? error.message : '未知错误'}`
        )
        result.statistics.failed++
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

        // 检查重复名称
        if (!options.overwriteExisting) {
          const existing = await tx.category.findFirst({
            where: { userId, name: categoryName },
          })

          if (existing) {
            if (options.skipDuplicates) {
              idMapping[category.id] = existing.id
              result.statistics.skipped++
              continue
            } else {
              // 自动重命名
              let counter = 1
              let newName = `${categoryName} (${counter})`
              while (
                await tx.category.findFirst({
                  where: { userId, name: newName },
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
        }

        // 处理父级分类ID
        let parentId: string | undefined
        if (category.parentId && idMapping[category.parentId]) {
          parentId = idMapping[category.parentId]
        }

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
        result.errors.push(
          `导入分类 ${category.name} 失败: ${error instanceof Error ? error.message : '未知错误'}`
        )
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

        // 检查重复名称
        if (!options.overwriteExisting) {
          const existing = await tx.tag.findFirst({
            where: { userId, name: tagName },
          })

          if (existing) {
            if (options.skipDuplicates) {
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
        }

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
        result.errors.push(
          `导入标签 ${tag.name} 失败: ${error instanceof Error ? error.message : '未知错误'}`
        )
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

        // 检查重复名称
        if (!options.overwriteExisting) {
          const existing = await tx.account.findFirst({
            where: { userId, name: accountName },
          })

          if (existing) {
            if (options.skipDuplicates) {
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
        }

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
        result.errors.push(
          `导入账户 ${account.name} 失败: ${error instanceof Error ? error.message : '未知错误'}`
        )
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

        // 检查重复名称
        if (!options.overwriteExisting) {
          const existing = await tx.transactionTemplate.findFirst({
            where: { userId, name: templateName },
          })

          if (existing) {
            if (options.skipDuplicates) {
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
        }

        const newTemplate = await tx.transactionTemplate.create({
          data: {
            userId,
            name: templateName,
            type: template.type,
            description: template.description,
            notes: template.notes,
            accountId,
            categoryId,
            currencyId,
            tagIds: template.tagIds,
          },
        })

        templateIdMapping[template.id] = newTemplate.id
        result.statistics.processed++
        result.statistics.created++
      } catch (error) {
        result.errors.push(
          `导入交易模板 ${template.name} 失败: ${error instanceof Error ? error.message : '未知错误'}`
        )
        result.statistics.failed++
      }
    }
  }

  /**
   * 导入定期交易
   */
  private static async importRecurringTransactions(
    tx: any,
    userId: string,
    recurringTransactions: any[],
    accountIdMapping: IdMapping,
    currencyIdMapping: IdMapping,
    recurringIdMapping: IdMapping,
    result: ImportResult,
    _options: ImportOptions
  ): Promise<void> {
    for (const rt of recurringTransactions) {
      try {
        // 查找账户ID
        const accountId = accountIdMapping[rt.accountId]
        if (!accountId) {
          result.warnings.push(`定期交易 ${rt.description} 的账户不存在，跳过`)
          result.statistics.skipped++
          continue
        }

        // 查找货币ID
        let currencyId = currencyIdMapping[rt.currencyId]
        if (!currencyId) {
          const currency = await tx.currency.findFirst({
            where: {
              code: rt.currencyCode,
              OR: [{ createdBy: null }, { createdBy: userId }],
            },
          })
          currencyId = currency?.id
        }

        if (!currencyId) {
          result.warnings.push(`定期交易 ${rt.description} 的货币不存在，跳过`)
          result.statistics.skipped++
          continue
        }

        const newRecurring = await tx.recurringTransaction.create({
          data: {
            userId,
            accountId,
            currencyId,
            type: rt.type,
            amount: new Decimal(rt.amount),
            description: rt.description,
            notes: rt.notes,
            tagIds: rt.tagIds,
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

        recurringIdMapping[rt.id] = newRecurring.id
        result.statistics.processed++
        result.statistics.created++
      } catch (error) {
        result.errors.push(
          `导入定期交易 ${rt.description} 失败: ${error instanceof Error ? error.message : '未知错误'}`
        )
        result.statistics.failed++
      }
    }
  }

  /**
   * 导入贷款合约
   */
  private static async importLoanContracts(
    tx: any,
    userId: string,
    loanContracts: any[],
    accountIdMapping: IdMapping,
    currencyIdMapping: IdMapping,
    loanIdMapping: IdMapping,
    result: ImportResult,
    _options: ImportOptions
  ): Promise<void> {
    for (const loan of loanContracts) {
      try {
        // 查找账户ID
        const accountId = accountIdMapping[loan.accountId]
        if (!accountId) {
          result.warnings.push(
            `贷款合约 ${loan.contractName} 的账户不存在，跳过`
          )
          result.statistics.skipped++
          continue
        }

        // 查找货币ID
        let currencyId = currencyIdMapping[loan.currencyId]
        if (!currencyId) {
          const currency = await tx.currency.findFirst({
            where: {
              code: loan.currencyCode,
              OR: [{ createdBy: null }, { createdBy: userId }],
            },
          })
          currencyId = currency?.id
        }

        if (!currencyId) {
          result.warnings.push(
            `贷款合约 ${loan.contractName} 的货币不存在，跳过`
          )
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

        const newLoan = await tx.loanContract.create({
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
            transactionTagIds: loan.transactionTagIds,
            isActive: loan.isActive,
          },
        })

        loanIdMapping[loan.id] = newLoan.id
        result.statistics.processed++
        result.statistics.created++
      } catch (error) {
        result.errors.push(
          `导入贷款合约 ${loan.contractName} 失败: ${error instanceof Error ? error.message : '未知错误'}`
        )
        result.statistics.failed++
      }
    }
  }

  /**
   * 导入贷款还款记录
   */
  private static async importLoanPayments(
    tx: any,
    userId: string,
    loanPayments: any[],
    loanIdMapping: IdMapping,
    paymentIdMapping: IdMapping,
    result: ImportResult,
    _options: ImportOptions
  ): Promise<void> {
    for (const payment of loanPayments) {
      try {
        // 查找贷款合约ID
        const loanContractId = loanIdMapping[payment.loanContractId]
        if (!loanContractId) {
          result.warnings.push(
            `贷款还款记录 期数${payment.period} 的贷款合约不存在，跳过`
          )
          result.statistics.skipped++
          continue
        }

        const newPayment = await tx.loanPayment.create({
          data: {
            userId,
            loanContractId,
            period: payment.period,
            paymentDate: new Date(payment.paymentDate),
            principalAmount: new Decimal(payment.principalAmount),
            interestAmount: new Decimal(payment.interestAmount),
            totalAmount: new Decimal(payment.totalAmount),
            remainingBalance: new Decimal(payment.remainingBalance),
            status: payment.status,
            processedAt: payment.processedAt
              ? new Date(payment.processedAt)
              : null,
            // 交易ID将在导入交易时重新关联
          },
        })

        paymentIdMapping[payment.id] = newPayment.id
        result.statistics.processed++
        result.statistics.created++
      } catch (error) {
        result.errors.push(
          `导入贷款还款记录 期数${payment.period} 失败: ${error instanceof Error ? error.message : '未知错误'}`
        )
        result.statistics.failed++
      }
    }
  }

  /**
   * 导入交易（最后导入，因为可能依赖其他数据）
   */
  private static async importTransactions(
    tx: any,
    userId: string,
    transactions: any[],
    accountIdMapping: IdMapping,
    categoryIdMapping: IdMapping,
    currencyIdMapping: IdMapping,
    tagIdMapping: IdMapping,
    recurringIdMapping: IdMapping,
    loanIdMapping: IdMapping,
    paymentIdMapping: IdMapping,
    transactionIdMapping: IdMapping,
    result: ImportResult,
    _options: ImportOptions
  ): Promise<void> {
    // 分批处理大量交易数据，避免内存问题
    const BATCH_SIZE = 100

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE)

      for (const transaction of batch) {
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

          // 分类信息现在通过账户获取，不需要单独验证分类ID

          // 查找货币ID
          let currencyId = currencyIdMapping[transaction.currencyId]
          if (!currencyId) {
            const currency = await tx.currency.findFirst({
              where: {
                code: transaction.currencyCode,
                OR: [{ createdBy: null }, { createdBy: userId }],
              },
            })
            currencyId = currency?.id
          }

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
            for (const tag of transaction.tags) {
              const tagId = tagIdMapping[tag.id]
              if (tagId) {
                await tx.transactionTag.create({
                  data: {
                    transactionId: newTransaction.id,
                    tagId,
                  },
                })
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
  }
}
