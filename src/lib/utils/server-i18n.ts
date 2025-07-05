/**
 * 服务端国际化工具
 * 用于在服务端代码中生成国际化的文本
 */

import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/database/prisma'
import { CACHE } from '@/lib/constants/app-config'

// 缓存翻译数据
const translationCache: Record<string, Record<string, string>> = {}

// 用户语言设置缓存
interface UserLanguageCache {
  language: string
  timestamp: number
}

const userLanguageCache = new Map<string, UserLanguageCache>()

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

/**
 * 获取用户语言设置（带缓存）
 * @param userId 用户ID
 * @returns 用户语言设置
 */
async function getUserLanguage(userId: string): Promise<string> {
  try {
    // 检查缓存
    const cached = userLanguageCache.get(userId)
    const now = Date.now()

    if (cached && now - cached.timestamp < CACHE.USER_DATA_TTL) {
      return cached.language
    }

    // 从数据库获取
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { language: true },
    })

    const language = userSettings?.language || 'zh'

    // 更新缓存
    userLanguageCache.set(userId, {
      language,
      timestamp: now,
    })

    return language
  } catch (error) {
    console.warn(
      'Failed to get user language preference, using default:',
      error
    )
    return 'zh' // 默认使用中文
  }
}

/**
 * 获取用户语言偏好并创建翻译函数
 * @param userId 用户ID
 * @returns 翻译函数
 */
export async function getUserTranslator(userId: string) {
  const userLanguage = await getUserLanguage(userId)
  return createServerTranslator(userLanguage)
}

/**
 * 清除用户语言缓存
 * @param userId 可选，指定用户ID则只清除该用户的缓存，否则清除所有
 */
export function clearUserLanguageCache(userId?: string) {
  if (userId) {
    userLanguageCache.delete(userId)
  } else {
    userLanguageCache.clear()
  }
}
