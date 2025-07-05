/**
 * 恢复密钥工具函数
 * 用于生成、验证和格式化恢复密钥
 */

import crypto from 'crypto'

/**
 * 恢复密钥配置
 */
const RECOVERY_KEY_CONFIG = {
  PREFIX: 'FB', // Flow Balance 前缀
  SEGMENT_LENGTH: 4, // 每段长度
  SEGMENT_COUNT: 4, // 段数
  // 排除易混淆字符：0, O, 1, I, L
  CHARSET: '23456789ABCDEFGHJKMNPQRSTUVWXYZ',
} as const

/**
 * 生成恢复密钥
 * 格式：FB-XXXX-XXXX-XXXX-XXXX
 * @returns 生成的恢复密钥
 */
export function generateRecoveryKey(): string {
  const segments: string[] = []

  for (let i = 0; i < RECOVERY_KEY_CONFIG.SEGMENT_COUNT; i++) {
    let segment = ''
    for (let j = 0; j < RECOVERY_KEY_CONFIG.SEGMENT_LENGTH; j++) {
      // 使用加密安全的随机数生成器
      const randomBytes = crypto.randomBytes(1)
      const randomIndex = randomBytes[0] % RECOVERY_KEY_CONFIG.CHARSET.length
      segment += RECOVERY_KEY_CONFIG.CHARSET[randomIndex]
    }
    segments.push(segment)
  }

  return `${RECOVERY_KEY_CONFIG.PREFIX}-${segments.join('-')}`
}

/**
 * 验证恢复密钥格式
 * @param key 要验证的恢复密钥
 * @returns 是否为有效格式
 */
export function isValidRecoveryKeyFormat(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false
  }

  // 检查基本格式：FB-XXXX-XXXX-XXXX-XXXX
  const pattern = new RegExp(
    `^${RECOVERY_KEY_CONFIG.PREFIX}-` +
      `([${RECOVERY_KEY_CONFIG.CHARSET}]{${RECOVERY_KEY_CONFIG.SEGMENT_LENGTH}}-){${RECOVERY_KEY_CONFIG.SEGMENT_COUNT - 1}}` +
      `[${RECOVERY_KEY_CONFIG.CHARSET}]{${RECOVERY_KEY_CONFIG.SEGMENT_LENGTH}}$`
  )

  return pattern.test(key)
}

/**
 * 格式化恢复密钥（标准化输入）
 * @param key 输入的恢复密钥
 * @returns 格式化后的恢复密钥，如果格式无效则返回 null
 */
export function formatRecoveryKey(key: string): string | null {
  if (!key || typeof key !== 'string') {
    return null
  }

  // 移除空格并转换为大写
  const cleanKey = key.replace(/\s/g, '').toUpperCase()

  // 如果没有连字符，尝试自动添加
  if (!cleanKey.includes('-')) {
    // 检查是否为纯字符串格式：FBXXXXXXXXXXXXXXXX
    if (
      cleanKey.length ===
      RECOVERY_KEY_CONFIG.PREFIX.length +
        RECOVERY_KEY_CONFIG.SEGMENT_COUNT * RECOVERY_KEY_CONFIG.SEGMENT_LENGTH
    ) {
      const prefix = cleanKey.substring(0, RECOVERY_KEY_CONFIG.PREFIX.length)
      const content = cleanKey.substring(RECOVERY_KEY_CONFIG.PREFIX.length)

      if (prefix === RECOVERY_KEY_CONFIG.PREFIX) {
        const segments: string[] = []
        for (let i = 0; i < RECOVERY_KEY_CONFIG.SEGMENT_COUNT; i++) {
          const start = i * RECOVERY_KEY_CONFIG.SEGMENT_LENGTH
          const end = start + RECOVERY_KEY_CONFIG.SEGMENT_LENGTH
          segments.push(content.substring(start, end))
        }
        const formattedKey = `${prefix}-${segments.join('-')}`

        // 验证格式化后的密钥
        if (isValidRecoveryKeyFormat(formattedKey)) {
          return formattedKey
        }
      }
    }
  }

  // 验证现有格式
  if (isValidRecoveryKeyFormat(cleanKey)) {
    return cleanKey
  }

  return null
}

/**
 * 掩码显示恢复密钥（用于UI显示）
 * @param key 恢复密钥
 * @param visibleSegments 显示的段数（从开头计算）
 * @returns 掩码后的恢复密钥
 */
export function maskRecoveryKey(
  key: string,
  visibleSegments: number = 1
): string {
  if (!isValidRecoveryKeyFormat(key)) {
    return '****-****-****-****'
  }

  const parts = key.split('-')
  const prefix = parts[0] // FB
  const segments = parts.slice(1) // 4个段

  const maskedSegments = segments.map((segment, index) => {
    return index < visibleSegments ? segment : '****'
  })

  return `${prefix}-${maskedSegments.join('-')}`
}

/**
 * 生成恢复密钥的下载文件内容
 * @param key 恢复密钥
 * @param email 用户邮箱
 * @param createdAt 创建时间
 * @param t 翻译函数
 * @param language 当前语言
 * @returns 文件内容
 */
export function generateRecoveryKeyFileContent(
  key: string,
  email: string,
  createdAt: Date,
  t: (key: string) => string,
  language: string = 'zh'
): string {
  const locale = language === 'en' ? 'en-US' : 'zh-CN'
  const currentYear = new Date().getFullYear()

  return `${t('recovery.key.file.title')}
========================

${t('recovery.key.file.user.email')}: ${email}
${t('recovery.key.file.recovery.key')}: ${key}
${t('recovery.key.file.created.time')}: ${createdAt.toLocaleString(locale)}

${t('recovery.key.file.reminder.title')}:
- ${t('recovery.key.file.reminder.purpose')}
- ${t('recovery.key.file.reminder.safe')}
- ${t('recovery.key.file.reminder.lost')}
- ${t('recovery.key.file.reminder.share')}

${t('recovery.key.file.footer')}
${currentYear}
`
}

/**
 * 恢复密钥相关的常量
 */
export const RECOVERY_KEY_CONSTANTS = {
  MAX_VERIFICATION_ATTEMPTS: 5, // 最大验证尝试次数
  VERIFICATION_WINDOW_HOURS: 1, // 验证窗口时间（小时）
  RESET_WINDOW_MINUTES: 30, // 重置密码窗口时间（分钟）
} as const
