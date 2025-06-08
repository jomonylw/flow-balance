/**
 * 全局类型声明
 */

declare global {
  interface Window {
    __INITIAL_LANGUAGE__?: 'zh' | 'en'
    __LANGUAGE_INITIALIZING__?: boolean
  }
}

export {}
