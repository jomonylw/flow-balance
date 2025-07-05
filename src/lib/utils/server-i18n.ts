/**
 * 服务端国际化工具
 * 用于在服务端代码中生成国际化的文本
 */

import fs from 'fs'
import path from 'path'

// 缓存翻译数据
const translationCache: Record<string, Record<string, string>> = {}

/**
 * 加载翻译文件
 */
function loadTranslations(locale: string): Record<string, string> {
  if (translationCache[locale]) {
    return translationCache[locale]
  }

  const translations: Record<string, string> = {}

  // 需要加载的翻译文件列表
  const translationFiles = ['common', 'loan', 'auth', 'dashboard']

  for (const fileName of translationFiles) {
    try {
      const filePath = path.join(
        process.cwd(),
        `public/locales/${locale}/${fileName}.json`
      )

      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8')
        const fileTranslations = JSON.parse(content)
        Object.assign(translations, fileTranslations)
      }
    } catch (error) {
      console.warn(
        `Failed to load ${fileName}.json for locale ${locale}:`,
        error
      )
    }
  }

  translationCache[locale] = translations
  return translations
}

/**
 * 服务端翻译函数
 * @param key 翻译键
 * @param params 参数对象
 * @param locale 语言代码，默认为 'zh'
 * @returns 翻译后的文本
 */
export function serverT(
  key: string,
  params?: Record<string, string | number>,
  locale: string = 'zh'
): string {
  const translations = loadTranslations(locale)
  let text = translations[key] || key

  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(`{${paramKey}}`, String(value))
    })
  }

  return text
}

/**
 * 创建带有默认语言的翻译函数
 * @param defaultLocale 默认语言
 * @returns 翻译函数
 */
export function createServerTranslator(defaultLocale: string = 'zh') {
  return (key: string, params?: Record<string, string | number>) => {
    return serverT(key, params, defaultLocale)
  }
}

/**
 * 清除翻译缓存
 */
export function clearTranslationCache() {
  Object.keys(translationCache).forEach(key => {
    delete translationCache[key]
  })
}

/**
 * 预加载翻译文件
 */
export function preloadTranslations(locales: string[] = ['zh', 'en']) {
  locales.forEach(locale => {
    loadTranslations(locale)
  })
}
