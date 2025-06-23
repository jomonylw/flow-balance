import { renderHook } from '@testing-library/react'
import { useUserDateFormatter } from '../useUserDateFormatter'
import { Language, Theme } from '@/types/core/constants'
import {
  useUserData,
  type UserDataContextType,
} from '@/contexts/providers/UserDataContext'
import { useLanguage } from '@/contexts/providers/LanguageContext'

// Mock the dependencies
jest.mock('@/contexts/providers/UserDataContext', () => ({
  useUserData: jest.fn(),
}))

jest.mock('@/contexts/providers/LanguageContext', () => ({
  useLanguage: jest.fn(),
}))

const mockUseUserData = useUserData as jest.MockedFunction<typeof useUserData>
const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>

// Helper function to create mock UserData context
const createMockUserData = (
  userSettingsOverrides: Partial<{
    id: string
    userId: string
    baseCurrencyId: string
    baseCurrencyCode: string
    dateFormat: string
    language: Language
    theme: Theme
    fireEnabled: boolean
    fireSWR: number
    futureDataDays: number
    autoUpdateExchangeRates: boolean
    lastExchangeRateUpdate: Date | null
    baseCurrency: {
      id: string
      code: string
      name: string
      symbol: string
      decimalPlaces: number
    }
  }> | null = null
): UserDataContextType => {
  const defaultUserSettings = userSettingsOverrides
    ? {
        id: '1',
        userId: '1',
        baseCurrencyId: '1',
        baseCurrencyCode: 'CNY',
        dateFormat: 'YYYY-MM-DD',
        language: Language.ZH,
        theme: Theme.SYSTEM,
        fireEnabled: false,
        fireSWR: 4.0,
        futureDataDays: 7,
        autoUpdateExchangeRates: false,
        lastExchangeRateUpdate: null,
        baseCurrency: {
          id: '1',
          code: 'CNY',
          name: '人民币',
          symbol: '¥',
          decimalPlaces: 2,
        },
        ...userSettingsOverrides,
      }
    : null

  return {
    userSettings: defaultUserSettings,
    currencies: [],
    tags: [],
    accounts: [],
    categories: [],
    templates: [],
    accountBalances: null,
    exchangeRates: [],
    isLoading: false,
    isLoadingBalances: false,
    isLoadingTemplates: false,
    error: null,
    balancesError: null,
    templatesError: null,
    lastUpdated: null,
    syncStatus: { status: 'idle' as const },
    isInitialSyncComplete: false,
    refreshAll: jest.fn(),
    refreshCurrencies: jest.fn(),
    refreshTags: jest.fn(),
    refreshAccounts: jest.fn(),
    refreshCategories: jest.fn(),
    refreshUserSettings: jest.fn(),
    refreshTemplates: jest.fn(),
    refreshExchangeRates: jest.fn(),
    fetchBalances: jest.fn(),
    refreshBalances: jest.fn(),
    updateTag: jest.fn(),
    addTag: jest.fn(),
    removeTag: jest.fn(),
    updateAccount: jest.fn(),
    addAccount: jest.fn(),
    removeAccount: jest.fn(),
    updateCategory: jest.fn(),
    addCategory: jest.fn(),
    removeCategory: jest.fn(),
    updateUserSettings: jest.fn(),
    updateTemplate: jest.fn(),
    addTemplate: jest.fn(),
    removeTemplate: jest.fn(),
    getBaseCurrency: jest.fn(),
    getTemplates: jest.fn(),
    accountTransactionCache: {},
    setAccountHasTransactions: jest.fn(),
    updateAccountBalance: jest.fn(),
    triggerSync: jest.fn(),
    refreshSyncStatus: jest.fn(),
  }
}

describe('useUserDateFormatter', () => {
  const mockDate = new Date('2024-01-15T10:30:00Z')

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Default mock implementations
    mockUseLanguage.mockReturnValue({
      language: Language.ZH,
      t: jest.fn((key: string, params?: Record<string, string | number>) => {
        const translations: Record<string, string> = {
          'common.date.today': '今天',
          'common.date.yesterday': '昨天',
          'common.date.tomorrow': '明天',
          'common.date.days.later': `${params?.days}天后`,
          'common.date.days.ago': `${params?.days}天前`,
        }
        return translations[key] || key
      }),
      setLanguage: jest.fn(),
      isLoading: false,
    })
  })

  describe('基础日期格式化', () => {
    test('应该使用默认格式 YYYY-MM-DD', () => {
      mockUseUserData.mockReturnValue(createMockUserData(null))

      const { result } = renderHook(() => useUserDateFormatter())
      const formatted = result.current.formatDate(mockDate)

      expect(formatted).toBe('2024-01-15')
    })

    test('应该使用用户设置的日期格式 DD/MM/YYYY', () => {
      mockUseUserData.mockReturnValue(
        createMockUserData({
          dateFormat: 'DD/MM/YYYY',
        })
      )

      const { result } = renderHook(() => useUserDateFormatter())
      const formatted = result.current.formatDate(mockDate)

      expect(formatted).toBe('15/01/2024')
    })

    test('应该支持包含时间的格式化', () => {
      mockUseUserData.mockReturnValue(
        createMockUserData({
          dateFormat: 'YYYY-MM-DD',
        })
      )

      const { result } = renderHook(() => useUserDateFormatter())
      const formatted = result.current.formatDate(mockDate, {
        includeTime: true,
      })

      expect(formatted).toMatch(/2024-01-15 \d{2}:\d{2}/)
    })
  })

  describe('智能日期显示', () => {
    beforeEach(() => {
      // Mock current date to 2024-01-15
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    test('应该显示"今天"', () => {
      mockUseUserData.mockReturnValue(createMockUserData(null))

      const { result } = renderHook(() => useUserDateFormatter())
      const today = new Date('2024-01-15T15:30:00Z')
      const formatted = result.current.formatSmartDate(today)

      expect(formatted).toBe('今天')
    })

    test('应该显示"昨天"', () => {
      mockUseUserData.mockReturnValue(createMockUserData(null))

      const { result } = renderHook(() => useUserDateFormatter())
      const yesterday = new Date('2024-01-14T10:00:00Z')
      const formatted = result.current.formatSmartDate(yesterday)

      expect(formatted).toBe('昨天')
    })

    test('应该显示"明天"', () => {
      mockUseUserData.mockReturnValue(createMockUserData(null))

      const { result } = renderHook(() => useUserDateFormatter())
      const tomorrow = new Date('2024-01-16T08:00:00Z')
      const formatted = result.current.formatSmartDate(tomorrow)

      expect(formatted).toBe('明天')
    })

    test('应该显示相对天数', () => {
      mockUseUserData.mockReturnValue(createMockUserData(null))

      const { result } = renderHook(() => useUserDateFormatter())
      const futureDate = new Date('2024-01-18T10:00:00Z') // 3天后
      const formatted = result.current.formatSmartDate(futureDate)

      expect(formatted).toBe('3天后')
    })

    test('超出范围应该使用用户格式', () => {
      mockUseUserData.mockReturnValue(
        createMockUserData({
          dateFormat: 'DD/MM/YYYY',
        })
      )

      const { result } = renderHook(() => useUserDateFormatter())
      const distantDate = new Date('2024-01-25T10:00:00Z') // 10天后
      const formatted = result.current.formatSmartDate(distantDate)

      expect(formatted).toBe('25/01/2024')
    })
  })

  describe('图表日期格式化', () => {
    test('应该格式化月份显示', () => {
      mockUseUserData.mockReturnValue(
        createMockUserData({
          dateFormat: 'YYYY-MM-DD',
        })
      )

      const { result } = renderHook(() => useUserDateFormatter())
      const formatted = result.current.formatChartDate(mockDate, 'month')

      expect(formatted).toBe('2024-01')
    })

    test('应该根据用户格式调整分隔符', () => {
      mockUseUserData.mockReturnValue(
        createMockUserData({
          dateFormat: 'DD/MM/YYYY',
        })
      )

      const { result } = renderHook(() => useUserDateFormatter())
      const formatted = result.current.formatChartDate(mockDate, 'month')

      expect(formatted).toBe('2024/01')
    })

    test('应该格式化年份显示', () => {
      mockUseUserData.mockReturnValue(createMockUserData(null))

      const { result } = renderHook(() => useUserDateFormatter())
      const formatted = result.current.formatChartDate(mockDate, 'year')

      expect(formatted).toBe('2024')
    })
  })

  describe('表单输入格式化', () => {
    test('应该始终返回 YYYY-MM-DD 格式', () => {
      mockUseUserData.mockReturnValue(
        createMockUserData({
          dateFormat: 'DD/MM/YYYY',
        })
      )

      const { result } = renderHook(() => useUserDateFormatter())
      const formatted = result.current.formatInputDate(mockDate)

      expect(formatted).toBe('2024-01-15')
    })
  })

  describe('日期解析', () => {
    test('应该解析 ISO 格式日期', () => {
      mockUseUserData.mockReturnValue(createMockUserData(null))

      const { result } = renderHook(() => useUserDateFormatter())
      const parsed = result.current.parseUserDate('2024-01-15')

      expect(parsed).toBeInstanceOf(Date)
      expect(parsed?.getFullYear()).toBe(2024)
      expect(parsed?.getMonth()).toBe(0) // 0-based month
      expect(parsed?.getDate()).toBe(15)
    })

    test('应该处理无效日期', () => {
      mockUseUserData.mockReturnValue(createMockUserData(null))

      const { result } = renderHook(() => useUserDateFormatter())
      const parsed = result.current.parseUserDate('invalid-date')

      expect(parsed).toBeNull()
    })
  })

  describe('用户设置属性', () => {
    test('应该返回正确的用户日期格式', () => {
      mockUseUserData.mockReturnValue(
        createMockUserData({
          dateFormat: 'MM/DD/YYYY',
        })
      )

      const { result } = renderHook(() => useUserDateFormatter())

      expect(result.current.userDateFormat).toBe('MM/DD/YYYY')
    })

    test('应该返回正确的分隔符', () => {
      mockUseUserData.mockReturnValue(
        createMockUserData({
          dateFormat: 'DD/MM/YYYY',
        })
      )

      const { result } = renderHook(() => useUserDateFormatter())

      expect(result.current.getDateSeparator).toBe('/')
    })
  })
})
