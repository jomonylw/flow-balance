import { useEffect, useCallback, useRef, DependencyList } from 'react'
import {
  DataUpdateType,
  DataUpdateEvent,
  subscribeToDataUpdates,
} from '@/lib/services/data-update.service'

/**
 * 数据更新监听Hook
 * 简化组件中对数据更新事件的监听
 */
export function useDataUpdateListener(
  types: DataUpdateType[],
  callback: (event: DataUpdateEvent) => void | Promise<void>,
  deps: DependencyList = []
) {
  const callbackRef = useRef(callback)
  const listenerIdRef = useRef<string | undefined>(undefined)

  // 更新回调引用
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // 注册监听器
  useEffect(() => {
    const listenerId = `listener-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    listenerIdRef.current = listenerId

    const unsubscribe = subscribeToDataUpdates({
      id: listenerId,
      types,
      callback: event => callbackRef.current(event),
    })

    return unsubscribe
  }, [types.join(','), ...deps]) // eslint-disable-line react-hooks/exhaustive-deps

  return listenerIdRef.current
}

/**
 * 监听余额更新事件
 */
export function useBalanceUpdateListener(
  callback: (event: DataUpdateEvent) => void | Promise<void>,
  accountIds?: string[]
) {
  return useDataUpdateListener(
    ['balance-update'],
    useCallback(
      event => {
        // 如果指定了账户ID，只监听相关账户的更新
        if (
          accountIds &&
          event.accountId &&
          !accountIds.includes(event.accountId)
        ) {
          return
        }
        callback(event)
      },
      [callback, accountIds?.join(',')]
    ),
    [accountIds?.join(',')]
  )
}

/**
 * 监听交易相关事件
 */
export function useTransactionListener(
  callback: (event: DataUpdateEvent) => void | Promise<void>,
  accountIds?: string[],
  categoryIds?: string[]
) {
  return useDataUpdateListener(
    ['transaction-create', 'transaction-update', 'transaction-delete'],
    useCallback(
      event => {
        // 过滤相关账户和分类
        if (
          accountIds &&
          event.accountId &&
          !accountIds.includes(event.accountId)
        ) {
          return
        }
        if (
          categoryIds &&
          event.categoryId &&
          !categoryIds.includes(event.categoryId)
        ) {
          return
        }
        callback(event)
      },
      [callback, accountIds?.join(','), categoryIds?.join(',')]
    ),
    [accountIds?.join(','), categoryIds?.join(',')]
  )
}

/**
 * 监听账户相关事件
 */
export function useAccountListener(
  callback: (event: DataUpdateEvent) => void | Promise<void>,
  categoryIds?: string[]
) {
  return useDataUpdateListener(
    ['account-create', 'account-update', 'account-delete'],
    useCallback(
      event => {
        // 过滤相关分类
        if (
          categoryIds &&
          event.categoryId &&
          !categoryIds.includes(event.categoryId)
        ) {
          return
        }
        callback(event)
      },
      [callback, categoryIds?.join(',')]
    ),
    [categoryIds?.join(',')]
  )
}

/**
 * 监听分类相关事件
 */
export function useCategoryListener(
  callback: (event: DataUpdateEvent) => void | Promise<void>,
  categoryIds?: string[]
) {
  return useDataUpdateListener(
    ['category-create', 'category-update', 'category-delete'],
    useCallback(
      event => {
        // 过滤相关分类
        if (
          categoryIds &&
          event.categoryId &&
          !categoryIds.includes(event.categoryId)
        ) {
          return
        }
        callback(event)
      },
      [callback, categoryIds?.join(',')]
    ),
    [categoryIds?.join(',')]
  )
}

/**
 * 监听标签相关事件
 */
export function useTagListener(
  callback: (event: DataUpdateEvent) => void | Promise<void>,
  tagIds?: string[]
) {
  return useDataUpdateListener(
    ['tag-create', 'tag-update', 'tag-delete'],
    useCallback(
      event => {
        // 过滤相关标签
        if (tagIds && event.tagId && !tagIds.includes(event.tagId)) {
          return
        }
        callback(event)
      },
      [callback, tagIds?.join(',')]
    ),
    [tagIds?.join(',')]
  )
}

/**
 * 监听所有数据更新事件
 */
export function useAllDataListener(
  callback: (event: DataUpdateEvent) => void | Promise<void>
) {
  return useDataUpdateListener(
    [
      'balance-update',
      'transaction-create',
      'transaction-update',
      'transaction-delete',
      'account-create',
      'account-update',
      'account-delete',
      'category-create',
      'category-update',
      'category-delete',
      'tag-create',
      'tag-update',
      'tag-delete',
      'manual-refresh',
      'system-update',
      'loan-payment-reset',
      'account-clear',
    ],
    callback
  )
}
