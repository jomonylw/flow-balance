import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import BalanceSheetCard from '@/components/reports/BalanceSheetCard'
import CashFlowCard from '@/components/reports/CashFlowCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Info } from 'lucide-react'

export default async function ReportsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">财务报表</h1>
          <p className="text-gray-600 mt-2">
            查看您的资产负债表和现金流量表，了解财务状况和现金流动情况
          </p>
        </div>
      </div>

      {/* 重要说明 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Info className="h-5 w-5" />
            财务报表说明
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <div className="space-y-2 text-sm">
            <p><strong>资产负债表</strong>：反映特定时间点的财务状况（存量概念）</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>资产</strong>：您拥有的现金、银行存款、投资、房产等</li>
              <li><strong>负债</strong>：您欠的信用卡、贷款、应付款等</li>
              <li><strong>净资产</strong>：资产减去负债，反映您的真实财富</li>
            </ul>
            <p><strong>现金流量表</strong>：反映特定时期内的现金流动情况（流量概念）</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>经营活动</strong>：日常收入支出产生的现金流</li>
              <li><strong>投资活动</strong>：投资理财相关的现金流</li>
              <li><strong>筹资活动</strong>：借贷还款相关的现金流</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 账户类型设置提醒 */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            重要提醒
          </CardTitle>
        </CardHeader>
        <CardContent className="text-amber-700">
          <div className="space-y-2 text-sm">
            <p>为了正确生成财务报表，请确保您的账户分类设置了正确的账户类型：</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>资产类</strong>：现金、银行存款、投资账户、房产等</li>
              <li><strong>负债类</strong>：信用卡、贷款、应付款等</li>
              <li><strong>收入类</strong>：工资、投资收益、其他收入等</li>
              <li><strong>支出类</strong>：生活费、娱乐、交通等日常支出</li>
            </ul>
            <p className="mt-2">
              如果您的账户分类尚未设置类型，系统会在Dashboard中显示验证提醒。
              请前往分类管理页面进行设置。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 资产负债表 */}
      <BalanceSheetCard />

      {/* 现金流量表 */}
      <CashFlowCard />

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold mb-2">资产负债表使用技巧</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• 定期查看净资产变化，了解财富增长情况</li>
                <li>• 关注资产负债比例，保持健康的财务结构</li>
                <li>• 流动资产应足够覆盖短期支出需求</li>
                <li>• 可以选择不同日期查看历史财务状况</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">现金流量表使用技巧</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• 经营现金流应为正数，确保日常收支平衡</li>
                <li>• 投资现金流反映您的投资活动情况</li>
                <li>• 筹资现金流显示借贷和还款情况</li>
                <li>• 可以按月、季度或年度查看现金流趋势</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
