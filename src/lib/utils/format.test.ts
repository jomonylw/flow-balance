import { formatCurrency, formatNumber } from '@/lib/utils/format'

describe('Utils', () => {
  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(1234.56, 'CNY')).toBe('¥1,234.56')
      expect(formatCurrency(1000, 'USD')).toBe('$1,000.00')
    })

    it('should handle zero values', () => {
      expect(formatCurrency(0, 'CNY')).toBe('¥0.00')
    })

    it('should handle negative values', () => {
      expect(formatCurrency(-1234.56, 'CNY')).toBe('-¥1,234.56')
    })
  })

  describe('formatNumber', () => {
    it('should format numbers with thousand separators', () => {
      expect(formatNumber(1234.56)).toBe('1,234.56')
      expect(formatNumber(1000)).toBe('1,000')
    })

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0')
    })
  })
})
