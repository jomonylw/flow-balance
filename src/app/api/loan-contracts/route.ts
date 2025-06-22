/**
 * 贷款合约API
 * GET /api/loan-contracts - 获取用户的贷款合约列表
 * POST /api/loan-contracts - 创建新的贷款合约
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { LoanContractService } from '@/lib/services/loan-contract.service'
import { LoanContractFormData } from '@/types/core'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
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
    return NextResponse.json(
      {
        success: false,
        error: '获取贷款合约列表失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    const data: LoanContractFormData = await request.json()

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
        { success: false, error: '缺少必要字段' },
        { status: 400 }
      )
    }

    if (data.loanAmount <= 0) {
      return NextResponse.json(
        { success: false, error: '贷款金额必须大于0' },
        { status: 400 }
      )
    }

    if (data.interestRate < 0 || data.interestRate > 1) {
      return NextResponse.json(
        { success: false, error: '利率必须在0-100%之间' },
        { status: 400 }
      )
    }

    if (data.totalPeriods <= 0 || !Number.isInteger(data.totalPeriods)) {
      return NextResponse.json(
        { success: false, error: '总期数必须是正整数' },
        { status: 400 }
      )
    }

    if (data.paymentDay < 1 || data.paymentDay > 31) {
      return NextResponse.json(
        { success: false, error: '还款日期必须在1-31号之间' },
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
          error: '该账户已有贷款合约，一个账户最多只能绑定一个贷款合约',
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
    return NextResponse.json(
      {
        success: false,
        error: '创建贷款合约失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}
