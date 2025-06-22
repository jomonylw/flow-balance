/**
 * 测试日期比较逻辑，确保只比较日期部分而不包含时间
 */

import { describe, it, expect } from '@jest/globals'
import {
  DuplicateCheckService,
  CheckType as _CheckType,
} from '../duplicate-check.service'

// 模拟 LoanContractService 的 normalizeDate 方法
function normalizeDate(date: Date): string {
  // 使用本地时间的年月日，避免UTC转换导致的日期偏移
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  return (
    year +
    '-' +
    String(month).padStart(2, '0') +
    '-' +
    String(day).padStart(2, '0')
  )
}

// 模拟 FutureDataGenerationService 的 normalizeDate 方法
function normalizeDate2(date: Date): string {
  // 使用本地时间的年月日，避免UTC转换导致的日期偏移
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  return (
    year +
    '-' +
    String(month).padStart(2, '0') +
    '-' +
    String(day).padStart(2, '0')
  )
}

describe('日期比较逻辑测试', () => {
  it('应该正确标准化不同时间的同一天日期', () => {
    // 使用本地时间创建日期，避免时区问题
    const date1 = new Date(2024, 0, 15, 8, 30, 0) // 2024-01-15 08:30:00
    const date2 = new Date(2024, 0, 15, 15, 45, 30) // 2024-01-15 15:45:30
    const date3 = new Date(2024, 0, 15, 23, 59, 59) // 2024-01-15 23:59:59
    const date4 = new Date(2024, 0, 15, 0, 0, 0) // 2024-01-15 00:00:00

    const normalized1 = normalizeDate(date1)
    const normalized2 = normalizeDate(date2)
    const normalized3 = normalizeDate(date3)
    const normalized4 = normalizeDate(date4)

    // 所有同一天的不同时间应该标准化为相同的日期字符串
    expect(normalized1).toBe('2024-01-15')
    expect(normalized2).toBe('2024-01-15')
    expect(normalized3).toBe('2024-01-15')
    expect(normalized4).toBe('2024-01-15')

    // 所有标准化结果应该相等
    expect(normalized1).toBe(normalized2)
    expect(normalized2).toBe(normalized3)
    expect(normalized3).toBe(normalized4)
  })

  it('应该正确区分不同日期', () => {
    // 使用本地时间创建日期
    const date1 = new Date(2024, 0, 15, 23, 59, 59) // 2024-01-15 23:59:59
    const date2 = new Date(2024, 0, 16, 0, 0, 0) // 2024-01-16 00:00:00
    const date3 = new Date(2024, 0, 14, 12, 0, 0) // 2024-01-14 12:00:00

    const normalized1 = normalizeDate(date1)
    const normalized2 = normalizeDate(date2)
    const normalized3 = normalizeDate(date3)

    expect(normalized1).toBe('2024-01-15')
    expect(normalized2).toBe('2024-01-16')
    expect(normalized3).toBe('2024-01-14')

    // 不同日期应该产生不同的标准化结果
    expect(normalized1).not.toBe(normalized2)
    expect(normalized2).not.toBe(normalized3)
    expect(normalized1).not.toBe(normalized3)
  })

  it('应该处理时区边界情况', () => {
    // 测试同一本地日期的不同时间
    const morning = new Date(2024, 0, 15, 8, 0, 0) // 2024-01-15 08:00:00
    const evening = new Date(2024, 0, 15, 20, 0, 0) // 2024-01-15 20:00:00

    const normalizedMorning = normalizeDate(morning)
    const normalizedEvening = normalizeDate(evening)

    // 应该都标准化为同一天
    expect(normalizedMorning).toBe('2024-01-15')
    expect(normalizedEvening).toBe('2024-01-15')
    expect(normalizedMorning).toBe(normalizedEvening)
  })

  it('两个服务的日期标准化方法应该一致', () => {
    const testDates = [
      new Date(2024, 0, 15, 8, 30, 0), // 2024-01-15 08:30:00
      new Date(2024, 0, 15, 15, 45, 30), // 2024-01-15 15:45:30
      new Date(2024, 0, 15, 23, 59, 59), // 2024-01-15 23:59:59
      new Date(2024, 0, 15, 0, 0, 0), // 2024-01-15 00:00:00
      new Date(2024, 1, 29, 12, 0, 0), // 2024-02-29 12:00:00 (闰年)
      new Date(2024, 11, 31, 23, 59, 59), // 2024-12-31 23:59:59 (年末)
    ]

    testDates.forEach(date => {
      const result1 = normalizeDate(date)
      const result2 = normalizeDate2(date)
      expect(result1).toBe(result2)
    })
  })

  it('应该正确处理月份和日期的零填充', () => {
    const date1 = new Date('2024-01-05T12:00:00.000Z') // 单位数月份和日期
    const date2 = new Date('2024-10-15T12:00:00.000Z') // 双位数月份和日期

    const normalized1 = normalizeDate(date1)
    const normalized2 = normalizeDate(date2)

    expect(normalized1).toBe('2024-01-05')
    expect(normalized2).toBe('2024-10-15')

    // 确保格式一致（零填充）
    expect(normalized1.length).toBe(10)
    expect(normalized2.length).toBe(10)
  })

  it('应该正确处理Set查找逻辑', () => {
    // 模拟实际使用场景：检查日期是否已存在
    const existingDates = [
      new Date(2024, 0, 15, 8, 30, 0), // 2024-01-15 08:30:00
      new Date(2024, 0, 16, 15, 45, 30), // 2024-01-16 15:45:30
      new Date(2024, 0, 17, 23, 59, 59), // 2024-01-17 23:59:59
    ]

    const existingDatesSet = new Set(
      existingDates.map(date => normalizeDate(date))
    )

    // 测试不同时间的同一天应该被识别为已存在
    const checkDate1 = new Date(2024, 0, 15, 12, 0, 0) // 同一天，不同时间
    const checkDate2 = new Date(2024, 0, 18, 12, 0, 0) // 不同天
    const checkDate3 = new Date(2024, 0, 16, 0, 0, 0) // 同一天，不同时间

    expect(existingDatesSet.has(normalizeDate(checkDate1))).toBe(true)
    expect(existingDatesSet.has(normalizeDate(checkDate2))).toBe(false)
    expect(existingDatesSet.has(normalizeDate(checkDate3))).toBe(true)
  })

  it('统一检查服务的日期标准化应该与本地方法一致', () => {
    const testDates = [
      new Date(2024, 0, 15, 8, 30, 0),
      new Date(2024, 0, 15, 15, 45, 30),
      new Date(2024, 0, 15, 23, 59, 59),
      new Date(2024, 1, 29, 12, 0, 0),
      new Date(2024, 11, 31, 23, 59, 59),
    ]

    testDates.forEach(date => {
      const localResult = normalizeDate(date)
      const serviceResult = DuplicateCheckService.normalizeDate(date)
      expect(localResult).toBe(serviceResult)
    })
  })

  it('统一检查服务的日期范围标准化应该正确', () => {
    const startDate = new Date(2024, 0, 15, 8, 30, 0)
    const endDate = new Date(2024, 0, 15, 20, 45, 30)

    const { normalizedStartDate, normalizedEndDate } =
      DuplicateCheckService.normalizeDateRange(startDate, endDate)

    // 开始日期应该设置为当天的开始时间
    expect(normalizedStartDate.getHours()).toBe(0)
    expect(normalizedStartDate.getMinutes()).toBe(0)
    expect(normalizedStartDate.getSeconds()).toBe(0)
    expect(normalizedStartDate.getMilliseconds()).toBe(0)

    // 结束日期应该设置为当天的结束时间
    expect(normalizedEndDate.getHours()).toBe(23)
    expect(normalizedEndDate.getMinutes()).toBe(59)
    expect(normalizedEndDate.getSeconds()).toBe(59)
    expect(normalizedEndDate.getMilliseconds()).toBe(999)

    // 日期部分应该保持不变
    expect(normalizedStartDate.getFullYear()).toBe(2024)
    expect(normalizedStartDate.getMonth()).toBe(0)
    expect(normalizedStartDate.getDate()).toBe(15)

    expect(normalizedEndDate.getFullYear()).toBe(2024)
    expect(normalizedEndDate.getMonth()).toBe(0)
    expect(normalizedEndDate.getDate()).toBe(15)
  })

  it('统一检查服务的日期存在检查应该正确', () => {
    const existingDates = new Set(['2024-01-15', '2024-01-16', '2024-01-17'])

    const testDate1 = new Date(2024, 0, 15, 12, 0, 0) // 存在
    const testDate2 = new Date(2024, 0, 18, 12, 0, 0) // 不存在
    const testDate3 = new Date(2024, 0, 16, 0, 0, 0) // 存在

    expect(DuplicateCheckService.isDateExists(testDate1, existingDates)).toBe(
      true
    )
    expect(DuplicateCheckService.isDateExists(testDate2, existingDates)).toBe(
      false
    )
    expect(DuplicateCheckService.isDateExists(testDate3, existingDates)).toBe(
      true
    )
  })

  it('统一检查服务的过滤功能应该正确', () => {
    const existingDates = new Set(['2024-01-15', '2024-01-17'])

    const items = [
      { id: '1', date: new Date(2024, 0, 15, 8, 0, 0) }, // 应该被过滤
      { id: '2', date: new Date(2024, 0, 16, 12, 0, 0) }, // 应该保留
      { id: '3', date: new Date(2024, 0, 17, 20, 0, 0) }, // 应该被过滤
      { id: '4', date: new Date(2024, 0, 18, 10, 0, 0) }, // 应该保留
    ]

    const filtered = DuplicateCheckService.filterExistingDates(
      items,
      existingDates
    )

    expect(filtered).toHaveLength(2)
    expect(filtered.map(item => item.id)).toEqual(['2', '4'])
  })
})
