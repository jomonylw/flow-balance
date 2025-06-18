/**
 * 全局类型声明
 * @deprecated 此文件已被弃用，全局类型定义已移至 @/types/ui/index.ts
 * 为了向后兼容，重新导出类型定义
 */

// 重新导出全局类型定义
export type { Language, Theme } from '@/types/ui'

declare global {
  interface Window {
    __INITIAL_LANGUAGE__?: 'zh' | 'en'
    __LANGUAGE_INITIALIZING__?: boolean
    __THEME__?: 'light' | 'dark' | 'system'
  }
}

export {}
