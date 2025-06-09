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

export interface Transaction {
  id: string
  type: 'INCOME' | 'EXPENSE' | 'BALANCE_ADJUSTMENT'
  amount: number
  description: string
  notes?: string
  date: string
  category: {
    id: string
    name: string
    type?: 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY'
  }
  account: {
    id: string
    name: string
    category: {
      name: string
    }
  }
  currency: Currency
  tags: { tag: Tag }[]
}

export interface Account {
  id: string
  name: string
  description?: string
  category: {
    id: string
    name: string
    type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  }
  transactions: Transaction[]
}

export interface Category {
  id: string
  name: string
  type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  parentId?: string | null
  description?: string
  color?: string
  icon?: string
  parent?: Category
  children?: Category[]
  accounts?: Account[]
  transactions: Transaction[]
}

export interface StockCategory extends Omit<Category, 'type'> {
  type: 'ASSET' | 'LIABILITY'
}

export interface FlowCategory extends Omit<Category, 'type'> {
  type: 'INCOME' | 'EXPENSE'
}

export interface StockAccount extends Omit<Account, 'category'> {
  category: {
    id: string
    name: string
    type: 'ASSET' | 'LIABILITY'
  }
}

export interface FlowAccount extends Omit<Account, 'category'> {
  category: {
    id: string
    name: string
    type: 'INCOME' | 'EXPENSE'
  }
}

export interface CategoryDetailViewProps {
  category: Category
  accounts: Account[]
  categories: Category[]
  currencies: Currency[]
  tags: Tag[]
  user: User
}

export interface StockCategoryDetailViewProps {
  category: StockCategory
  accounts: Account[]
  categories: Category[]
  currencies: Currency[]
  tags: Tag[]
  user: User
}

export interface FlowCategoryDetailViewProps {
  category: FlowCategory
  accounts: Account[]
  categories: Category[]
  currencies: Currency[]
  tags: Tag[]
  user: User
}
