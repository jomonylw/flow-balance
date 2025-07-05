/**
 * 贷款合约API
 * GET /api/loan-contracts - 获取用户的贷款合约列表
 * POST /api/loan-contracts - 创建新的贷款合约
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { LoanContractService } from '@/lib/services/loan-contract.service'
import { LoanContractFormData } from '@/types/core'
import { getUserTranslator } from '@/lib/utils/server-i18n'

export async function GET() {
  let user: any = null
  try {
    user = await getCurrentUser()
    if (!user) {
      const t = await getUserTranslator('')
      return NextResponse.json(
        { success: false, error: t('loan.contract.unauthorized') },
        { status: 401 }
      )
    }

    const loanContracts = await LoanContractService.getUserLoanContracts(
      user.id
    )

    return NextResponse.json({
      success: true,
      data: { loanContracts },
    })
  } catch (error) {
    console.error('获取贷款合约列表失败:', error)
    const t = await getUserTranslator(user?.id || '')
    return NextResponse.json(
      {
        success: false,
        error: t('loan.contract.fetch.failed'),
        details: error instanceof Error ? error.message : t('error.unknown'),
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  let user: any = null
  try {
    user = await getCurrentUser()
    if (!user) {
      const t = await getUserTranslator('')
      return NextResponse.json(
        { success: false, error: t('loan.contract.unauthorized') },
        { status: 401 }
      )
    }

    const data: LoanContractFormData = await request.json()
    const t = await getUserTranslator(user.id)

    // 基础验证
    if (
      !data.accountId ||
      !data.currencyCode ||
      !data.contractName ||
      !data.loanAmount ||
      data.interestRate === undefined ||
      !data.totalPeriods ||
      !data.repaymentType ||
      !data.startDate ||
      !data.paymentDay
    ) {
      return NextResponse.json(
        { success: false, error: t('loan.contract.missing.fields') },
        { status: 400 }
      )
    }

    if (data.loanAmount <= 0) {
      return NextResponse.json(
        { success: false, error: t('loan.contract.amount.invalid') },
        { status: 400 }
      )
    }

    if (data.interestRate < 0 || data.interestRate > 1) {
      return NextResponse.json(
        { success: false, error: t('loan.contract.rate.invalid') },
        { status: 400 }
      )
    }

    if (data.totalPeriods <= 0 || !Number.isInteger(data.totalPeriods)) {
      return NextResponse.json(
        { success: false, error: t('loan.contract.periods.invalid') },
        { status: 400 }
      )
    }

    if (data.paymentDay < 1 || data.paymentDay > 31) {
      return NextResponse.json(
        { success: false, error: t('loan.contract.payment.day.range.invalid') },
        { status: 400 }
      )
    }

    // 检查账户是否已有贷款合约（一个账户最多只能有一个贷款合约）
    const existingContracts = await LoanContractService.getAccountLoanContracts(
      user.id,
      data.accountId
    )
    if (existingContracts.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: t('loan.contract.account.has.existing'),
        },
        { status: 400 }
      )
    }

    const loanContract = await LoanContractService.createLoanContract(
      user.id,
      data
    )

    return NextResponse.json({
      success: true,
      data: { loanContract },
    })
  } catch (error) {
    console.error('创建贷款合约失败:', error)
    const t = await getUserTranslator(user?.id || '')
    return NextResponse.json(
      {
        success: false,
        error: t('loan.contract.create.failed'),
        details: error instanceof Error ? error.message : t('error.unknown'),
      },
      { status: 500 }
    )
  }
}
