export interface Category {
  id: string
  name: string
  type?: 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY'
  icon?: string
  color?: string
  description?: string
  transactions?: Transaction[]
}

export interface Currency {
  code: string
  name: string
  symbol: string
}

export interface Tag {
  id: string
  name: string
  color?: string
}

// 交易中的标签类型（不包含颜色信息）
export interface TransactionTag {
  id: string
  name: string
}

export interface Account {
  id: string
  name: string
  description?: string
  color?: string
  category: {
    id: string
    name: string
    type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  }
  transactions?: Transaction[]
  currencyCode?: string
  currency?: Currency
}

export interface Transaction {
  id: string
  type: 'INCOME' | 'EXPENSE' | 'BALANCE'
  amount: number
  description: string
  notes?: string
  date: string
  category: Category
  currency: Currency
  tags: { tag: TransactionTag }[]
  account?: Account
}

export interface TransactionFormData {
  id?: string
  accountId: string
  categoryId: string
  currencyCode: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
  notes?: string
  date: string
  tagIds?: string[]
}
export interface User {
  id: string
  email: string
  settings?: {
    baseCurrency?: {
      code: string
      name: string
      symbol: string
    }
  }
}
export interface TrendDataPoint {
  date: string
  originalAmount: number
  originalCurrency: string
  convertedAmount: number
  hasConversionError: boolean
  transactionCount: number
}