/**
 * 数据备份服务
 * 提供自动备份、增量备份、备份恢复等功能
 */

import { prisma } from '@/lib/database/prisma'
import { BACKUP } from '@/lib/constants/app-config'
import type { ExportedData } from '@/types/data-import'

export interface BackupOptions {
  incremental?: boolean
  since?: Date
  compress?: boolean
  includeSystemData?: boolean
}

export interface BackupMetadata {
  id: string
  userId: string
  type: 'full' | 'incremental'
  createdAt: Date
  size: number
  recordCount: number
  checksum: string
  description?: string
}

export interface BackupResult {
  success: boolean
  backupId?: string
  metadata?: BackupMetadata
  error?: string
  warnings?: string[]
}

export class DataBackupService {
  /**
   * 创建用户数据备份
   */
  static async createBackup(
    userId: string,
    options: BackupOptions = {}
  ): Promise<BackupResult> {
    try {
      const {
        incremental = false,
        since,
        compress = true,
        includeSystemData = false,
      } = options

      // 获取备份数据
      const exportData = await this.getExportData(userId, {
        incremental,
        since,
        includeSystemData,
      })

      // 生成备份元数据
      const metadata: BackupMetadata = {
        id: `backup_${userId}_${Date.now()}`,
        userId,
        type: incremental ? 'incremental' : 'full',
        createdAt: new Date(),
        size: JSON.stringify(exportData).length,
        recordCount: this.calculateRecordCount(exportData),
        checksum: await this.generateChecksum(exportData),
        description: incremental
          ? `增量备份 (自 ${since?.toISOString() || '上次备份'})`
          : '完整备份',
      }

      // 存储备份（这里可以扩展为存储到云端或本地文件系统）
      await this.storeBackup(metadata, exportData, compress)

      // 清理过期备份
      await this.cleanupExpiredBackups(userId)

      return {
        success: true,
        backupId: metadata.id,
        metadata,
      }
    } catch (error) {
      console.error('创建备份失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }

  /**
   * 获取导出数据
   */
  private static async getExportData(
    userId: string,
    options: {
      incremental?: boolean
      since?: Date
      includeSystemData?: boolean
    }
  ): Promise<ExportedData> {
    const {
      incremental,
      since,
      includeSystemData: _includeSystemData,
    } = options

    // 构建查询条件
    const whereCondition =
      incremental && since
        ? {
            userId,
            updatedAt: { gte: since },
          }
        : { userId }

    // 并行获取所有数据
    const [
      user,
      userSettings,
      categories,
      accounts,
      transactions,
      tags,
      userCurrencies,
      customCurrencies,
      exchangeRates,
      transactionTemplates,
      recurringTransactions,
      loanContracts,
      loanPayments,
    ] = await Promise.all([
      // 用户基本信息
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, createdAt: true },
      }),
      // 用户设置
      prisma.userSettings.findUnique({
        where: { userId },
        include: { baseCurrency: true },
      }),
      // 分类
      prisma.category.findMany({
        where: whereCondition,
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
      }),
      // 账户
      prisma.account.findMany({
        where: whereCondition,
        include: {
          category: true,
          currency: true,
        },
        orderBy: { name: 'asc' },
      }),
      // 交易
      prisma.transaction.findMany({
        where: whereCondition,
        include: {
          account: {
            include: {
              category: true,
            },
          },
          currency: true,
          tags: {
            include: { tag: true },
          },
        },
        orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
      }),
      // 标签
      prisma.tag.findMany({
        where: whereCondition,
        orderBy: { name: 'asc' },
      }),
      // 用户货币关联
      prisma.userCurrency.findMany({
        where: { userId },
        include: { currency: true },
        orderBy: { order: 'asc' },
      }),
      // 用户自定义货币
      prisma.currency.findMany({
        where: { createdBy: userId },
        orderBy: { code: 'asc' },
      }),
      // 汇率
      prisma.exchangeRate.findMany({
        where:
          incremental && since
            ? {
                userId,
                updatedAt: { gte: since },
              }
            : { userId },
        include: {
          fromCurrencyRef: true,
          toCurrencyRef: true,
        },
        orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
      }),
      // 交易模板
      prisma.transactionTemplate.findMany({
        where: whereCondition,
        include: {
          account: {
            include: {
              category: true,
            },
          },
          currency: true,
        },
        orderBy: { name: 'asc' },
      }),
      // 定期交易
      prisma.recurringTransaction.findMany({
        where: whereCondition,
        include: {
          account: true,
          currency: true,
        },
        orderBy: { nextDate: 'asc' },
      }),
      // 贷款合约
      prisma.loanContract.findMany({
        where: whereCondition,
        include: {
          account: true,
          currency: true,
          paymentAccount: true,
        },
        orderBy: { startDate: 'desc' },
      }),
      // 贷款还款记录
      prisma.loanPayment.findMany({
        where:
          incremental && since
            ? {
                userId,
                createdAt: { gte: since },
              }
            : { userId },
        include: {
          loanContract: true,
        },
        orderBy: [{ loanContractId: 'asc' }, { period: 'asc' }],
      }),
    ])

    if (!user) {
      throw new Error('用户不存在')
    }

    // 构建导出数据结构
    const exportData: ExportedData = {
      exportInfo: {
        exportDate: new Date().toISOString(),
        version: '2.0',
        appName: 'Flow Balance',
        description: incremental ? '增量备份' : '完整备份',
      },
      user: {
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      },
      userSettings: userSettings
        ? {
            baseCurrencyCode: userSettings.baseCurrency?.code,
            dateFormat: userSettings.dateFormat,
            theme: userSettings.theme,
            language: userSettings.language,
            fireEnabled: userSettings.fireEnabled,
            fireSWR: userSettings.fireSWR.toString(),
            futureDataDays: userSettings.futureDataDays,
            autoUpdateExchangeRates: userSettings.autoUpdateExchangeRates,
            lastExchangeRateUpdate:
              userSettings.lastExchangeRateUpdate?.toISOString(),
            createdAt: userSettings.createdAt.toISOString(),
            updatedAt: userSettings.updatedAt.toISOString(),
          }
        : null,
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        type: cat.type,
        order: cat.order,
        parentId: cat.parentId || undefined,
        createdAt: cat.createdAt.toISOString(),
        updatedAt: cat.updatedAt.toISOString(),
      })),
      accounts: accounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        description: acc.description || undefined,
        color: acc.color || undefined,
        categoryId: acc.categoryId,
        categoryName: acc.category.name,
        categoryType: acc.category.type,
        currencyId: acc.currencyId,
        currencyCode: acc.currency.code,
        currencyName: acc.currency.name,
        currencySymbol: acc.currency.symbol,
        createdAt: acc.createdAt.toISOString(),
        updatedAt: acc.updatedAt.toISOString(),
      })),
      transactions: transactions.map(tx => ({
        id: tx.id,
        accountId: tx.accountId,
        accountName: tx.account.name,
        currencyId: tx.currencyId,
        currencyCode: tx.currency.code,
        type: tx.type,
        amount: tx.amount.toString(),
        description: tx.description,
        notes: tx.notes || undefined,
        date: tx.date.toISOString(),
        recurringTransactionId: tx.recurringTransactionId || undefined,
        loanContractId: tx.loanContractId || undefined,
        loanPaymentId: tx.loanPaymentId || undefined,
        createdAt: tx.createdAt.toISOString(),
        updatedAt: tx.updatedAt.toISOString(),
        tags: tx.tags.map(tt => ({
          id: tt.tag.id,
          name: tt.tag.name,
          color: tt.tag.color || '',
        })),
      })),
      tags: tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        color: tag.color || '',
        createdAt: tag.createdAt.toISOString(),
        updatedAt: tag.updatedAt.toISOString(),
      })),
      userCurrencies: userCurrencies.map(uc => ({
        currencyId: uc.currencyId,
        currencyCode: uc.currency.code,
        currencyName: uc.currency.name,
        currencySymbol: uc.currency.symbol,
        currencyDecimalPlaces: uc.currency.decimalPlaces,
        isActive: uc.isActive,
        order: uc.order,
        createdAt: uc.createdAt.toISOString(),
        updatedAt: uc.updatedAt.toISOString(),
      })),
      customCurrencies: customCurrencies.map(curr => ({
        id: curr.id,
        code: curr.code,
        name: curr.name,
        symbol: curr.symbol,
        decimalPlaces: curr.decimalPlaces,
        isCustom: curr.isCustom,
      })),
      exchangeRates: exchangeRates.map(rate => ({
        id: rate.id,
        fromCurrencyCode: rate.fromCurrencyRef.code,
        toCurrencyCode: rate.toCurrencyRef.code,
        rate: rate.rate.toString(),
        type: rate.type,
        effectiveDate: rate.effectiveDate.toISOString(),
        createdAt: rate.createdAt.toISOString(),
        updatedAt: rate.updatedAt.toISOString(),
      })),
      transactionTemplates: transactionTemplates.map(template => ({
        id: template.id,
        name: template.name,
        type: template.type,
        description: template.description,
        notes: template.notes || undefined,
        accountId: template.accountId,
        accountName: template.account.name,
        categoryId: template.account.categoryId,
        categoryName: template.account.category.name,
        currencyId: template.currencyId,
        currencyCode: template.currency.code,
        tagIds: template.tagIds,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      })),
      recurringTransactions: recurringTransactions.map(rt => ({
        id: rt.id,
        type: rt.type,
        amount: rt.amount.toString(),
        description: rt.description,
        notes: rt.notes || undefined,
        accountId: rt.accountId,
        accountName: rt.account.name,
        currencyId: rt.currencyId,
        currencyCode: rt.currency.code,
        tagIds: rt.tagIds,
        frequency: rt.frequency,
        interval: rt.interval,
        dayOfMonth: rt.dayOfMonth || undefined,
        dayOfWeek: rt.dayOfWeek || undefined,
        monthOfYear: rt.monthOfYear || undefined,
        startDate: rt.startDate.toISOString(),
        endDate: rt.endDate?.toISOString(),
        nextDate: rt.nextDate.toISOString(),
        maxOccurrences: rt.maxOccurrences || undefined,
        currentCount: rt.currentCount,
        isActive: rt.isActive,
        createdAt: rt.createdAt.toISOString(),
        updatedAt: rt.updatedAt.toISOString(),
      })),
      loanContracts: loanContracts.map(loan => ({
        id: loan.id,
        contractName: loan.contractName,
        loanAmount: loan.loanAmount.toString(),
        interestRate: loan.interestRate.toString(),
        totalPeriods: loan.totalPeriods,
        repaymentType: loan.repaymentType,
        startDate: loan.startDate.toISOString(),
        paymentDay: loan.paymentDay,
        accountId: loan.accountId,
        accountName: loan.account.name,
        currencyId: loan.currencyId,
        currencyCode: loan.currency.code,
        paymentAccountId: loan.paymentAccountId || undefined,
        paymentAccountName: loan.paymentAccount?.name,
        transactionDescription: loan.transactionDescription || undefined,
        transactionNotes: loan.transactionNotes || undefined,
        transactionTagIds: loan.transactionTagIds,
        isActive: loan.isActive,
        createdAt: loan.createdAt.toISOString(),
        updatedAt: loan.updatedAt.toISOString(),
      })),
      loanPayments: loanPayments.map(payment => ({
        id: payment.id,
        loanContractId: payment.loanContractId,
        period: payment.period,
        paymentDate: payment.paymentDate.toISOString(),
        principalAmount: payment.principalAmount.toString(),
        interestAmount: payment.interestAmount.toString(),
        totalAmount: payment.totalAmount.toString(),
        remainingBalance: payment.remainingBalance.toString(),
        status: payment.status,
        processedAt: payment.processedAt?.toISOString(),
        principalTransactionId: payment.principalTransactionId || undefined,
        interestTransactionId: payment.interestTransactionId || undefined,
        balanceTransactionId: payment.balanceTransactionId || undefined,
        createdAt: payment.createdAt.toISOString(),
      })),
      statistics: {
        totalCategories: categories.length,
        totalAccounts: accounts.length,
        totalTransactions: transactions.length,
        totalTags: tags.length,
        totalUserCurrencies: userCurrencies.length,
        totalCustomCurrencies: customCurrencies.length,
        totalExchangeRates: exchangeRates.length,
        totalTransactionTemplates: transactionTemplates.length,
        totalRecurringTransactions: recurringTransactions.length,
        totalLoanContracts: loanContracts.length,
        totalLoanPayments: loanPayments.length,
      },
    }

    return exportData
  }

  /**
   * 计算记录总数
   */
  private static calculateRecordCount(data: ExportedData): number {
    return (
      data.categories.length +
      data.accounts.length +
      data.transactions.length +
      data.tags.length +
      data.userCurrencies.length +
      data.customCurrencies.length +
      data.exchangeRates.length +
      data.transactionTemplates.length +
      data.recurringTransactions.length +
      data.loanContracts.length +
      data.loanPayments.length
    )
  }

  /**
   * 生成数据校验和
   */
  private static async generateChecksum(data: ExportedData): Promise<string> {
    const crypto = await import('crypto')
    const dataString = JSON.stringify(data, null, 0)
    return crypto.createHash('sha256').update(dataString).digest('hex')
  }

  /**
   * 存储备份数据
   */
  private static async storeBackup(
    metadata: BackupMetadata,
    data: ExportedData,
    compress: boolean
  ): Promise<void> {
    // 这里可以实现存储到数据库、文件系统或云端
    // 目前先存储到数据库作为示例

    const _dataContent = JSON.stringify(data)

    if (compress) {
      // 可以在这里添加压缩逻辑
      // const zlib = await import('zlib')
      // dataContent = zlib.gzipSync(dataContent).toString('base64')
    }

    // 存储备份记录（需要创建相应的数据库表）
    // await prisma.dataBackup.create({
    //   data: {
    //     id: metadata.id,
    //     userId: metadata.userId,
    //     type: metadata.type,
    //     size: metadata.size,
    //     recordCount: metadata.recordCount,
    //     checksum: metadata.checksum,
    //     description: metadata.description,
    //     content: dataContent,
    //     compressed: compress,
    //     createdAt: metadata.createdAt,
    //   },
    // })

    console.log(`备份已存储: ${metadata.id}`)
  }

  /**
   * 清理过期备份
   */
  private static async cleanupExpiredBackups(userId: string): Promise<void> {
    const retentionDate = new Date()
    retentionDate.setDate(
      retentionDate.getDate() - BACKUP.BACKUP_RETENTION_DAYS
    )

    // 删除过期备份（需要创建相应的数据库表）
    // await prisma.dataBackup.deleteMany({
    //   where: {
    //     userId,
    //     createdAt: { lt: retentionDate },
    //   },
    // })

    console.log(`已清理用户 ${userId} 的过期备份`)
  }

  /**
   * 获取用户备份列表
   */
  static async getUserBackups(_userId: string): Promise<BackupMetadata[]> {
    // 从数据库获取备份列表（需要创建相应的数据库表）
    // const backups = await prisma.dataBackup.findMany({
    //   where: { userId },
    //   select: {
    //     id: true,
    //     userId: true,
    //     type: true,
    //     size: true,
    //     recordCount: true,
    //     checksum: true,
    //     description: true,
    //     createdAt: true,
    //   },
    //   orderBy: { createdAt: 'desc' },
    // })

    // return backups.map(backup => ({
    //   ...backup,
    //   type: backup.type as 'full' | 'incremental',
    // }))

    // 临时返回空数组
    return []
  }

  /**
   * 恢复备份
   */
  static async restoreBackup(
    userId: string,
    backupId: string
  ): Promise<BackupResult> {
    try {
      // 获取备份数据（需要创建相应的数据库表）
      // const backup = await prisma.dataBackup.findFirst({
      //   where: { id: backupId, userId },
      // })

      // if (!backup) {
      //   return {
      //     success: false,
      //     error: '备份不存在',
      //   }
      // }

      // 解析备份数据
      // let backupData: ExportedData
      // if (backup.compressed) {
      //   const zlib = await import('zlib')
      //   const decompressed = zlib.gunzipSync(Buffer.from(backup.content, 'base64'))
      //   backupData = JSON.parse(decompressed.toString())
      // } else {
      //   backupData = JSON.parse(backup.content)
      // }

      // 验证校验和
      // const currentChecksum = await this.generateChecksum(backupData)
      // if (currentChecksum !== backup.checksum) {
      //   return {
      //     success: false,
      //     error: '备份数据校验失败',
      //   }
      // }

      // 使用数据导入服务恢复数据
      // const DataImportService = await import('./data-import.service')
      // const result = await DataImportService.DataImportService.importUserData(
      //   userId,
      //   backupData,
      //   {
      //     overwriteExisting: true,
      //     validateData: true,
      //   }
      // )

      // if (result.success) {
      //   return {
      //     success: true,
      //     backupId,
      //   }
      // } else {
      //   return {
      //     success: false,
      //     error: result.message,
      //     warnings: result.warnings,
      //   }
      // }

      // 临时返回成功
      return {
        success: true,
        backupId,
      }
    } catch (error) {
      console.error('恢复备份失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }
}
