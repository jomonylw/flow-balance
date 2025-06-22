'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/feedback/Modal'
import InputField from '@/components/ui/forms/InputField'
import SelectField from '@/components/ui/forms/SelectField'
import AuthButton from '@/components/ui/forms/AuthButton'
import { useToast } from '@/contexts/providers/ToastContext'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import { useTheme } from '@/contexts/providers/ThemeContext'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { publishBalanceUpdate } from '@/lib/services/data-update.service'

interface QuickBalanceUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  accountType?: 'ASSET' | 'LIABILITY' // 可选的账户类型筛选
}

export default function QuickBalanceUpdateModal({
  isOpen,
  onClose,
  onSuccess,
  accountType,
}: QuickBalanceUpdateModalProps) {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
  const {
    accounts,
    currencies,
    getBaseCurrency,
    accountBalances,
    fetchBalances,
  } = useUserData()
  const { formatCurrency, formatNumber: _formatNumber } =
    useUserCurrencyFormatter()
  const { resolvedTheme } = useTheme()

  // Hooks MUST be called at the top level
  const baseCurrency = getBaseCurrency()

  const [formData, setFormData] = useState({
    accountId: '',
    newBalance: '',
    currencyCode: baseCurrency?.code || '',
    updateDate: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const stockAccounts = accounts.filter(account => {
    const isStockAccount =
      account.category.type === 'ASSET' || account.category.type === 'LIABILITY'
    if (!isStockAccount) return false
    if (accountType) {
      return account.category.type === accountType
    }
    return true
  })

  const selectedAccount = stockAccounts.find(
    account => account.id === formData.accountId
  )

  useEffect(() => {
    if (isOpen && !accountBalances) {
      fetchBalances()
    }
  }, [isOpen, accountBalances, fetchBalances])

  useEffect(() => {
    if (isOpen && baseCurrency) {
      setFormData({
        accountId: '',
        newBalance: '',
        currencyCode: baseCurrency.code,
        updateDate: new Date().toISOString().split('T')[0],
        notes: '',
      })
      setErrors({})
    }
  }, [isOpen, baseCurrency])

  useEffect(() => {
    if (selectedAccount) {
      const accountCurrency = selectedAccount.currencyCode
      setFormData(prev => ({
        ...prev,
        currencyCode: accountCurrency,
        newBalance: '0',
      }))
    }
  }, [formData.accountId, selectedAccount])

  // Conditional return after all hooks have been called
  if (!baseCurrency) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t('balance.update.quick.title')}
        size='lg'
      >
        <div className='text-center py-8'>
          <p className='text-gray-500 dark:text-gray-400 mb-4'>
            {t('currency.setup.required')}
          </p>
          <p className='text-sm text-gray-400'>
            {t('currency.setup.description')}
          </p>
        </div>
      </Modal>
    )
  }

  const accountBalance = accountBalances?.[formData.accountId]
  const currentBalance =
    accountBalance?.balances[formData.currencyCode]?.amount || 0
  const _currencySymbol =
    currencies.find(c => c.code === formData.currencyCode)?.symbol || ''

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.accountId) {
      newErrors.accountId = t('balance.update.select.account')
    }
    if (!formData.newBalance.trim()) {
      newErrors.newBalance = t('balance.update.enter.amount')
    } else if (isNaN(parseFloat(formData.newBalance))) {
      newErrors.newBalance = t('balance.update.valid.number')
    }
    if (!formData.currencyCode) {
      newErrors.currencyCode = t('balance.update.select.currency')
    }
    if (!formData.updateDate) {
      newErrors.updateDate = t('balance.update.select.date')
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      return
    }
    setIsLoading(true)
    try {
      const newBalance = parseFloat(formData.newBalance)
      const balanceChange = newBalance - currentBalance
      const response = await fetch('/api/balance-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: formData.accountId,
          currencyCode: formData.currencyCode,
          balanceChange,
          newBalance: newBalance,
          updateDate: formData.updateDate,
          notes: formData.notes || t('balance.update.default.notes'),
        }),
      })
      const result = await response.json()
      if (result.success) {
        showSuccess(
          t('balance.update.success'),
          t('balance.update.success.message', {
            accountName: selectedAccount?.name || '',
          })
        )
        await publishBalanceUpdate(formData.accountId, {
          newBalance: parseFloat(formData.newBalance),
          currencyCode: formData.currencyCode,
          transaction: result.transaction,
        })
        onSuccess()
        onClose()
      } else {
        const errorMessage = result.error || t('balance.update.failed')
        setErrors({ general: errorMessage })
        showError(t('balance.update.failed'), errorMessage)
      }
    } catch (error) {
      console.error('Balance update error:', error)
      const errorMessage = t('error.network')
      setErrors({ general: errorMessage })
      showError(t('balance.update.failed'), errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const accountOptions = stockAccounts.map(account => ({
    value: account.id,
    label: `${account.name} (${account.category.name})`,
  }))

  const currencyOptions = currencies.map(currency => ({
    value: currency.code,
    label: `${currency.code} - ${currency.name}`,
  }))

  const getModalTitle = () => {
    if (accountType === 'ASSET') return t('balance.update.asset.title')
    if (accountType === 'LIABILITY') return t('balance.update.liability.title')
    return t('balance.update.quick.title')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getModalTitle()} size='lg'>
      <form onSubmit={handleSubmit} className='space-y-6'>
        {errors.general && (
          <div
            className={`border border-red-200 rounded-md p-4 ${
              resolvedTheme === 'dark' ? 'bg-red-900/20' : 'bg-red-50'
            }`}
          >
            <div className='text-sm text-red-600'>{errors.general}</div>
          </div>
        )}
        <SelectField
          name='accountId'
          label={
            accountType === 'ASSET'
              ? t('balance.update.select.asset.account')
              : accountType === 'LIABILITY'
                ? t('balance.update.select.liability.account')
                : t('balance.update.select.stock.account')
          }
          value={formData.accountId}
          onChange={handleChange}
          options={[
            {
              value: '',
              label:
                accountType === 'ASSET'
                  ? t('balance.update.select.asset.placeholder')
                  : accountType === 'LIABILITY'
                    ? t('balance.update.select.liability.placeholder')
                    : t('balance.update.select.account.placeholder'),
            },
            ...accountOptions,
          ]}
          error={errors.accountId}
          required
        />
        {selectedAccount && (
          <div
            className={`p-4 rounded-lg border ${
              selectedAccount.category.type === 'ASSET'
                ? resolvedTheme === 'dark'
                  ? 'bg-blue-900/20 border-blue-700'
                  : 'bg-blue-50 border-blue-200'
                : resolvedTheme === 'dark'
                  ? 'bg-orange-900/20 border-orange-700'
                  : 'bg-orange-50 border-orange-200'
            }`}
          >
            <div className='flex items-center'>
              <div
                className={`w-3 h-3 rounded-full mr-3 ${
                  selectedAccount.category.type === 'ASSET'
                    ? 'bg-blue-500'
                    : 'bg-orange-500'
                }`}
              ></div>
              <div>
                <p
                  className={`font-medium ${resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}
                >
                  {selectedAccount.category.type === 'ASSET'
                    ? t('balance.update.asset.account')
                    : t('balance.update.liability.account')}{' '}
                  • {t('balance.update.stock.data')}
                </p>
                <p
                  className={`text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  {t('balance.update.current.balance')}:{' '}
                  {formatCurrency(currentBalance, formData.currencyCode)}
                </p>
              </div>
            </div>
          </div>
        )}
        <div>
          <SelectField
            name='currencyCode'
            label={t('balance.update.currency')}
            value={formData.currencyCode}
            onChange={handleChange}
            options={currencyOptions}
            error={errors.currencyCode}
            required
            disabled={!!selectedAccount}
          />
          {selectedAccount && (
            <p
              className={`mt-1 text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
            >
              {t('balance.update.currency.locked', {
                currencyName:
                  currencies.find(c => c.code === selectedAccount.currencyCode)
                    ?.name || '',
                currencyCode: selectedAccount.currencyCode,
              })}
            </p>
          )}
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <InputField
            name='newBalance'
            label={t('balance.update.new.balance')}
            type='number'
            step='0.01'
            value={formData.newBalance}
            onChange={handleChange}
            error={errors.newBalance}
            required
            placeholder={t('balance.update.new.balance.placeholder')}
          />
          <InputField
            name='updateDate'
            label={t('balance.update.date')}
            type='date'
            value={formData.updateDate}
            onChange={handleChange}
            error={errors.updateDate}
            required
          />
        </div>
        <InputField
          name='notes'
          label={t('balance.update.notes.optional')}
          value={formData.notes}
          onChange={handleChange}
          placeholder={t('balance.update.notes.placeholder')}
        />
        <div className='flex justify-end space-x-3 pt-4'>
          <button
            type='button'
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              resolvedTheme === 'dark'
                ? 'text-gray-300 bg-gray-800 hover:bg-gray-700'
                : 'text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            {t('common.cancel')}
          </button>
          <AuthButton
            type='submit'
            label={t('balance.update.button')}
            isLoading={isLoading}
            disabled={!formData.accountId || !formData.newBalance}
          />
        </div>
      </form>
    </Modal>
  )
}
