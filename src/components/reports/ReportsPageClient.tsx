'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'
import BalanceSheetCard from './BalanceSheetCard'
import CashFlowCard from './CashFlowCard'
import PageContainer from '@/components/ui/PageContainer'
import TranslationLoader from '@/components/ui/TranslationLoader'
import { useLanguage } from '@/contexts/LanguageContext'

export default function ReportsPageClient() {
  const { t } = useLanguage()

  return (
    <TranslationLoader
      fallback={
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      }
    >
      <PageContainer
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
      >

      {/* 重要说明 */}
      {/* <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Info className="h-5 w-5" />
            {t('reports.explanation.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <div className="space-y-2 text-xs sm:text-sm">
            <p><strong>{t('reports.balance.sheet')}</strong>：{t('reports.balance.sheet.description')}</p>
            <ul className="list-disc list-inside ml-2 sm:ml-4 space-y-1">
              <li><strong>{t('reports.assets')}</strong>：{t('reports.assets.description')}</li>
              <li><strong>{t('reports.liabilities')}</strong>：{t('reports.liabilities.description')}</li>
              <li><strong>{t('reports.net.worth')}</strong>：{t('reports.net.worth.description')}</li>
            </ul>
            <p><strong>{t('reports.cash.flow.statement')}</strong>：{t('reports.cash.flow.statement.description')}</p>
            <ul className="list-disc list-inside ml-2 sm:ml-4 space-y-1">
              <li><strong>{t('reports.operating.activities')}</strong>：{t('reports.operating.activities.description')}</li>
              <li><strong>{t('reports.investing.activities')}</strong>：{t('reports.investing.activities.description')}</li>
              <li><strong>{t('reports.financing.activities')}</strong>：{t('reports.financing.activities.description')}</li>
            </ul>
          </div>
        </CardContent>
      </Card> */}



        {/* 资产负债表 */}
        <BalanceSheetCard />

        {/* 现金流量表 */}
        <CashFlowCard/>

        {/* 账户类型设置提醒 */}
        <Card className="border-amber-200 bg-amber-50 mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              {t('reports.important.reminder')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-amber-700">
            <div className="space-y-2 text-sm">
              <p>{t('reports.account.type.setup.message')}</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>{t('reports.asset.type')}</strong>：{t('reports.asset.type.examples')}</li>
                <li><strong>{t('reports.liability.type')}</strong>：{t('reports.liability.type.examples')}</li>
                <li><strong>{t('reports.income.type')}</strong>：{t('reports.income.type.examples')}</li>
                <li><strong>{t('reports.expense.type')}</strong>：{t('reports.expense.type.examples')}</li>
              </ul>
              <p className="mt-2">
                {t('reports.category.type.reminder')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 使用说明 */}
        <Card className='mt-4'>
          <CardHeader>
            <CardTitle>{t('reports.usage.instructions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 text-xs sm:text-sm">
              <div>
                <h4 className="font-semibold mb-2">{t('reports.balance.sheet.tips')}</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• {t('reports.balance.sheet.tip.1')}</li>
                  <li>• {t('reports.balance.sheet.tip.2')}</li>
                  <li>• {t('reports.balance.sheet.tip.3')}</li>
                  <li>• {t('reports.balance.sheet.tip.4')}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">{t('reports.cash.flow.tips')}</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• {t('reports.cash.flow.tip.1')}</li>
                  <li>• {t('reports.cash.flow.tip.2')}</li>
                  <li>• {t('reports.cash.flow.tip.3')}</li>
                  <li>• {t('reports.cash.flow.tip.4')}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    </TranslationLoader>
  )
}
