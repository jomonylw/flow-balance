import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  unauthorizedResponse,
  errorResponse,
  validationErrorResponse,
} from '@/lib/api/response'
import { getUserTranslator } from '@/lib/utils/server-i18n'

export async function GET(request: NextRequest) {
  let user: any = null
  try {
    user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url)
    const incremental = searchParams.get('incremental') === 'true'
    const since = searchParams.get('since')

    let sinceDate: Date | undefined
    if (incremental && since) {
      sinceDate = new Date(since)
      if (isNaN(sinceDate.getTime())) {
        const t = await getUserTranslator(user.id)
        return validationErrorResponse(t('data.export.invalid.since.date'))
      }
    }

    // 获取用户的所有数据 - 分批获取以提高性能
    const [
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
      // 用户设置
      prisma.userSettings.findUnique({
        where: { userId: user.id },
        include: { baseCurrency: true },
      }),
      // 分类
      prisma.category.findMany({
        where: { userId: user.id },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
      }),
      // 账户
      prisma.account.findMany({
        where: { userId: user.id },
        include: {
          category: true,
          currency: true,
        },
        orderBy: { name: 'asc' },
      }),
      // 交易
      prisma.transaction.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          userId: true,
          accountId: true,
          currencyId: true,
          type: true,
          amount: true,
          description: true,
          notes: true,
          date: true,
          recurringTransactionId: true,
          loanContractId: true,
          loanPaymentId: true,
          createdAt: true,
          updatedAt: true,
          account: {
            select: {
              id: true,
              name: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
          currency: {
            select: {
              id: true,
              code: true,
              name: true,
              symbol: true,
              decimalPlaces: true,
            },
          },
          tags: {
            select: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
        orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
      }),
      // 标签
      prisma.tag.findMany({
        where: { userId: user.id },
        orderBy: { name: 'asc' },
      }),
      // 用户货币关联
      prisma.userCurrency.findMany({
        where: { userId: user.id },
        include: { currency: true },
        orderBy: { order: 'asc' },
      }),
      // 用户自定义货币
      prisma.currency.findMany({
        where: { createdBy: user.id },
        orderBy: { code: 'asc' },
      }),
      // 汇率
      prisma.exchangeRate.findMany({
        where: { userId: user.id },
        include: {
          fromCurrencyRef: true,
          toCurrencyRef: true,
        },
        orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
      }),
      // 交易模板
      prisma.transactionTemplate.findMany({
        where: { userId: user.id },
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
        where: { userId: user.id },
        include: {
          account: true,
          currency: true,
        },
        orderBy: { nextDate: 'asc' },
      }),
      // 贷款合约
      prisma.loanContract.findMany({
        where: { userId: user.id },
        include: {
          account: true,
          currency: true,
          paymentAccount: true,
        },
        orderBy: { startDate: 'desc' },
      }),
      // 贷款还款记录
      prisma.loanPayment.findMany({
        where: { userId: user.id },
        include: {
          loanContract: true,
        },
        orderBy: [{ loanContractId: 'asc' }, { period: 'asc' }],
      }),
    ])

    // 构建完整的导出数据
    const exportData = {
      exportInfo: {
        exportDate: new Date().toISOString(),
        version: '2.0', // 升级版本号
        appName: 'Flow Balance',
        description:
          'Complete user data export including all financial records',
      },
      // 用户基本信息（不包含敏感数据）
      user: {
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      // 用户设置
      userSettings: userSettings
        ? {
            baseCurrencyCode: userSettings.baseCurrency?.code,
            dateFormat: userSettings.dateFormat,
            theme: userSettings.theme,
            language: userSettings.language,
            fireEnabled: userSettings.fireEnabled,
            fireSWR: userSettings.fireSWR?.toString(),
            futureDataDays: userSettings.futureDataDays,
            autoUpdateExchangeRates: userSettings.autoUpdateExchangeRates,
            lastExchangeRateUpdate:
              userSettings.lastExchangeRateUpdate?.toISOString(),
            createdAt: userSettings.createdAt,
            updatedAt: userSettings.updatedAt,
          }
        : null,
      // 分类数据
      categories: categories.map(category => ({
        id: category.id,
        name: category.name,
        type: category.type,
        parentId: category.parentId,
        order: category.order,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      })),
      // 账户数据
      accounts: accounts.map(account => ({
        id: account.id,
        name: account.name,
        description: account.description,
        color: account.color,
        categoryId: account.categoryId,
        categoryName: account.category.name,
        categoryType: account.category.type,
        currencyId: account.currencyId,
        currencyCode: account.currency.code,
        currencyName: account.currency.name,
        currencySymbol: account.currency.symbol,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      })),
      // 交易数据
      transactions: transactions.map(transaction => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount.toString(),
        description: transaction.description,
        notes: transaction.notes,
        date: transaction.date.toISOString(),
        accountId: transaction.accountId,
        accountName: transaction.account.name,
        categoryId: transaction.account.category.id,
        categoryName: transaction.account.category.name,
        currencyId: transaction.currencyId,
        currencyCode: transaction.currency.code,
        recurringTransactionId: transaction.recurringTransactionId,
        loanContractId: transaction.loanContractId,
        loanPaymentId: transaction.loanPaymentId,
        tags: transaction.tags.map(tt => ({
          id: tt.tag.id,
          name: tt.tag.name,
          color: tt.tag.color,
        })),
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      })),
      // 标签数据
      tags: tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      })),
      // 用户货币关联数据
      userCurrencies: userCurrencies.map(uc => ({
        currencyId: uc.currencyId,
        currencyCode: uc.currency.code,
        currencyName: uc.currency.name,
        currencySymbol: uc.currency.symbol,
        currencyDecimalPlaces: uc.currency.decimalPlaces,
        isActive: uc.isActive,
        order: uc.order,
        createdAt: uc.createdAt,
        updatedAt: uc.updatedAt,
      })),
      // 用户自定义货币数据
      customCurrencies: customCurrencies.map(currency => ({
        id: currency.id,
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        decimalPlaces: currency.decimalPlaces,
        isCustom: currency.isCustom,
      })),
      // 汇率数据
      exchangeRates: exchangeRates.map(rate => ({
        id: rate.id,
        fromCurrencyCode: rate.fromCurrencyRef.code,
        toCurrencyCode: rate.toCurrencyRef.code,
        rate: rate.rate.toString(),
        effectiveDate: rate.effectiveDate.toISOString(),
        type: rate.type,
        sourceRateId: rate.sourceRateId,
        notes: rate.notes,
        createdAt: rate.createdAt,
        updatedAt: rate.updatedAt,
      })),
      // 交易模板数据
      transactionTemplates: transactionTemplates.map(template => ({
        id: template.id,
        name: template.name,
        type: template.type,
        description: template.description,
        notes: template.notes,
        accountId: template.accountId,
        accountName: template.account.name,
        categoryId: template.account.categoryId,
        categoryName: template.account.category.name,
        currencyId: template.currencyId,
        currencyCode: template.currency.code,
        tagIds: template.tagIds,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      })),
      // 定期交易数据
      recurringTransactions: recurringTransactions.map(rt => ({
        id: rt.id,
        type: rt.type,
        amount: rt.amount.toString(),
        description: rt.description,
        notes: rt.notes,
        accountId: rt.accountId,
        accountName: rt.account.name,
        currencyId: rt.currencyId,
        currencyCode: rt.currency.code,
        tagIds: rt.tagIds,
        frequency: rt.frequency,
        interval: rt.interval,
        dayOfMonth: rt.dayOfMonth,
        dayOfWeek: rt.dayOfWeek,
        monthOfYear: rt.monthOfYear,
        startDate: rt.startDate.toISOString(),
        endDate: rt.endDate?.toISOString(),
        nextDate: rt.nextDate.toISOString(),
        maxOccurrences: rt.maxOccurrences,
        currentCount: rt.currentCount,
        isActive: rt.isActive,
        createdAt: rt.createdAt,
        updatedAt: rt.updatedAt,
      })),
      // 贷款合约数据
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
        paymentAccountId: loan.paymentAccountId,
        paymentAccountName: loan.paymentAccount?.name,
        transactionDescription: loan.transactionDescription,
        transactionNotes: loan.transactionNotes,
        transactionTagIds: loan.transactionTagIds,
        isActive: loan.isActive,
        createdAt: loan.createdAt,
        updatedAt: loan.updatedAt,
      })),
      // 贷款还款记录数据
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
        principalTransactionId: payment.principalTransactionId,
        interestTransactionId: payment.interestTransactionId,
        balanceTransactionId: payment.balanceTransactionId,
        createdAt: payment.createdAt,
      })),
      // 统计信息
      statistics: {
        totalCategories: categories.length,
        totalAccounts: accounts.length,
        totalTransactions: transactions.length,
        totalManualTransactions: transactions.filter(
          t =>
            !t.recurringTransactionId && !t.loanContractId && !t.loanPaymentId
        ).length,
        totalRecurringTransactionRecords: transactions.filter(
          t => t.recurringTransactionId
        ).length,
        totalLoanTransactionRecords: transactions.filter(
          t => t.loanContractId || t.loanPaymentId
        ).length,
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

    // 返回JSON文件
    const jsonData = JSON.stringify(exportData, null, 2)

    return new Response(jsonData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="flow-balance-data-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error('Export data error:', error)
    const t = await getUserTranslator(user?.id || '')
    return errorResponse(t('data.export.failed'), 500)
  }
}
