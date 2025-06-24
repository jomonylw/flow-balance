/**
 * 数据更新管理器
 * 统一管理应用中的数据更新事件和联动刷新
 */

export type DataUpdateType =
  | 'balance-update' // 余额更新
  | 'transaction-create' // 交易创建
  | 'transaction-update' // 交易更新
  | 'transaction-delete' // 交易删除
  | 'account-create' // 账户创建
  | 'account-update' // 账户更新
  | 'account-delete' // 账户删除
  | 'category-create' // 分类创建
  | 'category-update' // 分类更新
  | 'category-delete' // 分类删除
  | 'tag-create' // 标签创建
  | 'tag-update' // 标签更新
  | 'tag-delete' // 标签删除
  | 'manual-refresh' // 手动刷新请求
  | 'system-update' // 系统自动更新完成
  | 'loan-payment-reset' // 贷款还款记录重置
  | 'account-clear' // 账户记录清空

export interface DataUpdateEvent {
  type: DataUpdateType
  data?: Record<string, unknown>
  accountId?: string
  categoryId?: string
  tagId?: string
  silent?: boolean // 是否静默更新（不显示加载状态）
}

export interface DataUpdateListener {
  id: string
  types: DataUpdateType[]
  callback: (event: DataUpdateEvent) => void | Promise<void>
}

class DataUpdateManager {
  private listeners: Map<string, DataUpdateListener> = new Map()
  private eventQueue: DataUpdateEvent[] = []
  private isProcessing = false

  /**
   * 注册数据更新监听器
   */
  subscribe(listener: DataUpdateListener): () => void {
    this.listeners.set(listener.id, listener)

    // 返回取消订阅函数
    return () => {
      this.listeners.delete(listener.id)
    }
  }

  /**
   * 取消订阅
   */
  unsubscribe(listenerId: string): void {
    this.listeners.delete(listenerId)
  }

  /**
   * 发布数据更新事件
   */
  async publish(event: DataUpdateEvent): Promise<void> {
    console.log('[DataUpdateManager] Publishing event:', event)
    // 添加到事件队列
    this.eventQueue.push(event)

    // 如果没有在处理中，开始处理队列
    if (!this.isProcessing) {
      await this.processQueue()
    }
  }

  /**
   * 处理事件队列
   */
  private async processQueue(): Promise<void> {
    this.isProcessing = true

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()
      if (event) {
        await this.processEvent(event)
      }
    }

    this.isProcessing = false
  }

  /**
   * 处理单个事件
   */
  private async processEvent(event: DataUpdateEvent): Promise<void> {
    const relevantListeners = Array.from(this.listeners.values()).filter(
      listener => listener.types.includes(event.type)
    )

    console.warn(
      `[DataUpdateManager] Processing event ${event.type} for ${relevantListeners.length} listeners`
    )

    // 并行执行所有相关监听器
    const promises = relevantListeners.map(async listener => {
      try {
        console.warn(
          `[DataUpdateManager] Calling listener ${listener.id} for event ${event.type}`
        )
        await listener.callback(event)
      } catch (error) {
        console.error(`Error in data update listener ${listener.id}:`, error)
      }
    })

    await Promise.all(promises)
  }

  /**
   * 批量发布事件
   */
  async publishBatch(events: DataUpdateEvent[]): Promise<void> {
    this.eventQueue.push(...events)

    if (!this.isProcessing) {
      await this.processQueue()
    }
  }

  /**
   * 清空事件队列
   */
  clearQueue(): void {
    this.eventQueue = []
  }

  /**
   * 获取当前监听器数量
   */
  getListenerCount(): number {
    return this.listeners.size
  }

  /**
   * 获取队列中的事件数量
   */
  getQueueLength(): number {
    return this.eventQueue.length
  }
}

// 创建全局实例
export const dataUpdateManager = new DataUpdateManager()

// 便捷方法
export const publishDataUpdate = (event: DataUpdateEvent) =>
  dataUpdateManager.publish(event)
export const subscribeToDataUpdates = (listener: DataUpdateListener) =>
  dataUpdateManager.subscribe(listener)

// 常用事件发布方法
export const publishBalanceUpdate = (
  accountId: string,
  data?: Record<string, unknown>
) => publishDataUpdate({ type: 'balance-update', accountId, data })

export const publishTransactionCreate = (
  accountId: string,
  categoryId?: string,
  data?: Record<string, unknown>
) =>
  publishDataUpdate({ type: 'transaction-create', accountId, categoryId, data })

export const publishTransactionUpdate = (
  accountId: string,
  categoryId?: string,
  data?: Record<string, unknown>
) =>
  publishDataUpdate({ type: 'transaction-update', accountId, categoryId, data })

export const publishTransactionDelete = (
  accountId: string,
  categoryId?: string,
  data?: Record<string, unknown>
) =>
  publishDataUpdate({ type: 'transaction-delete', accountId, categoryId, data })

export const publishAccountCreate = (
  categoryId: string,
  data?: Record<string, unknown>
) => publishDataUpdate({ type: 'account-create', categoryId, data })

export const publishAccountUpdate = (
  accountId: string,
  categoryId?: string,
  data?: Record<string, unknown>
) => publishDataUpdate({ type: 'account-update', accountId, categoryId, data })

export const publishAccountDelete = (
  accountId: string,
  categoryId?: string,
  data?: Record<string, unknown>
) => publishDataUpdate({ type: 'account-delete', accountId, categoryId, data })

export const publishCategoryCreate = (
  categoryId?: string,
  data?: Record<string, unknown>
) => publishDataUpdate({ type: 'category-create', categoryId, data })

export const publishCategoryUpdate = (
  categoryId: string,
  data?: Record<string, unknown>
) => publishDataUpdate({ type: 'category-update', categoryId, data })

export const publishCategoryDelete = (
  categoryId: string,
  data?: Record<string, unknown>
) => publishDataUpdate({ type: 'category-delete', categoryId, data })

export const publishTagCreate = (
  tagId: string,
  data?: Record<string, unknown>
) => publishDataUpdate({ type: 'tag-create', tagId, data })

export const publishTagUpdate = (
  tagId: string,
  data?: Record<string, unknown>
) => publishDataUpdate({ type: 'tag-update', tagId, data })

export const publishTagDelete = (
  tagId: string,
  data?: Record<string, unknown>
) => publishDataUpdate({ type: 'tag-delete', tagId, data })

export const publishSystemUpdate = (data?: Record<string, unknown>) =>
  publishDataUpdate({ type: 'system-update', data })

export const publishLoanPaymentReset = (
  accountId: string,
  data?: Record<string, unknown>
) => publishDataUpdate({ type: 'loan-payment-reset', accountId, data })

export const publishAccountClear = (
  accountId: string,
  data?: Record<string, unknown>
) => publishDataUpdate({ type: 'account-clear', accountId, data })
