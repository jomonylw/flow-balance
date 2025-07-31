/**
 * 定期交易历史记录生成API
 * POST /api/recurring-transactions/generate-historical - 检查并生成历史遗漏的定期交易记录
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { FutureDataGenerationService } from '@/lib/services/future-data-generation.service'

// import { getUserTranslator } from '@/lib/utils/server-i18n'
export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    // 生成历史遗漏的定期交易记录（包含历史检查和未来生成）
    const recurringResult =
      await FutureDataGenerationService.generateFutureRecurringTransactions(
        user.id
      )

    // 生成历史遗漏的贷款还款记录（使用批量处理方法）
    const { LoanContractService } = await import(
      '@/lib/services/loan-contract.service'
    )
    const loanResult = await LoanContractService.processBatchLoanPayments(
      user.id
    )

    const totalGenerated = recurringResult.generated + loanResult.processed
    const allErrors = [...recurringResult.errors, ...loanResult.errors]

    return NextResponse.json({
      success: true,
      data: {
        totalGenerated,
        recurringGenerated: recurringResult.generated,
        loanGenerated: loanResult.processed,
        errors: allErrors,
        message:
          totalGenerated > 0
            ? `成功生成 ${totalGenerated} 条记录（定期交易: ${recurringResult.generated}，贷款还款: ${loanResult.processed}）`
            : '没有发现遗漏的记录，所有数据都是最新的',
      },
    })
  } catch (error) {
    console.error('生成历史记录失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '生成历史记录失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}
