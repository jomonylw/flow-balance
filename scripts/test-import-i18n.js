#!/usr/bin/env node

/**
 * 测试数据导入国际化修复
 * 验证导入消息是否正确国际化
 */

const fs = require('fs')
const path = require('path')

function checkImportI18n() {
  console.log('🔍 检查数据导入国际化修复...\n')

  const filesToCheck = [
    'src/app/api/user/data/import/progress/route.ts',
    'src/app/api/user/data/import/route.ts',
    'src/lib/services/data-import.service.ts'
  ]

  let totalIssues = 0
  let fixedIssues = 0

  filesToCheck.forEach(filePath => {
    console.log(`📁 检查文件: ${filePath}`)
    
    if (!fs.existsSync(filePath)) {
      console.log(`   ❌ 文件不存在`)
      return
    }

    const content = fs.readFileSync(filePath, 'utf8')
    
    // 检查是否还有硬编码的导入相关中文消息
    const hardcodedPatterns = [
      /导入完成：创建.*条记录，更新.*条记录/,
      /导入成功：创建.*条记录，更新.*条记录/,
      /导入失败：/,
      /导入部分成功：/,
      /缺少导入数据/,
      /导入数据格式不正确/,
      /不支持的数据版本/,
      /导入已开始/,
      /正在验证数据完整性/,
      /开始导入数据/,
      /数据完整性检查失败/,
      /导入过程中发生错误/,
      /启动导入失败/,
      /获取导入进度失败/,
      /未找到导入会话/,
      /缺少会话ID/
    ]

    let fileIssues = 0
    let fileFixed = 0

    hardcodedPatterns.forEach(pattern => {
      const matches = content.match(pattern)
      if (matches) {
        fileIssues++
        totalIssues++
        console.log(`   ❌ 发现硬编码: ${matches[0]}`)
      }
    })

    // 检查是否使用了国际化函数
    const i18nPatterns = [
      /t\('data\.import\./,
      /getUserTranslator/,
      /data\.import\.completed/,
      /data\.import\.success/,
      /data\.import\.failed/,
      /data\.import\.validating/,
      /data\.import\.starting/
    ]

    i18nPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        fileFixed++
        fixedIssues++
      }
    })

    if (fileIssues === 0) {
      console.log(`   ✅ 没有发现硬编码消息`)
    }

    if (fileFixed > 0) {
      console.log(`   ✅ 发现 ${fileFixed} 处国际化修复`)
    }

    console.log('')
  })

  // 检查是否需要添加翻译键值
  console.log('📝 需要添加的翻译键值:')
  const requiredKeys = [
    'data.import.completed',
    'data.import.success', 
    'data.import.failed',
    'data.import.partial.success',
    'data.import.validating',
    'data.import.starting',
    'data.import.started',
    'data.import.error',
    'data.import.integrity.check.failed',
    'data.import.data.required',
    'data.import.format.invalid',
    'data.import.version.unsupported',
    'data.import.session.id.required',
    'data.import.session.not.found',
    'data.import.progress.get.failed',
    'data.import.start.failed',
    'data.import.json.format.error',
    'data.import.validation.failed',
    'data.import.cancelled.by.user',
    'data.import.cancelled',
    'data.import.cannot.cancel.completed',
    'data.import.cancel.failed'
  ]

  requiredKeys.forEach(key => {
    console.log(`   - ${key}`)
  })

  console.log('\n📊 修复统计:')
  console.log(`   发现问题: ${totalIssues}`)
  console.log(`   已修复: ${fixedIssues}`)
  console.log(`   修复率: ${totalIssues > 0 ? ((fixedIssues / totalIssues) * 100).toFixed(1) : 100}%`)

  if (totalIssues === 0 && fixedIssues > 0) {
    console.log('\n🎉 数据导入国际化修复完成！')
    return true
  } else if (totalIssues > 0) {
    console.log('\n⚠️  仍有硬编码消息需要修复')
    return false
  } else {
    console.log('\n❓ 未检测到相关修复')
    return false
  }
}

function generateTranslationKeys() {
  console.log('\n📋 生成翻译键值建议:')
  
  const translations = {
    zh: {
      'data.import.completed': '导入完成：创建 {{created}} 条记录，更新 {{updated}} 条记录',
      'data.import.success': '导入成功：创建 {{created}} 条记录，更新 {{updated}} 条记录',
      'data.import.failed': '导入失败：{{message}}',
      'data.import.partial.success': '导入部分成功：{{failed}} 条记录失败',
      'data.import.validating': '正在验证数据完整性...',
      'data.import.starting': '开始导入数据...',
      'data.import.started': '导入已开始，请使用会话ID查询进度',
      'data.import.error': '导入过程中发生错误: {{error}}',
      'data.import.integrity.check.failed': '数据完整性检查失败: {{error}}',
      'data.import.data.required': '缺少导入数据',
      'data.import.format.invalid': '导入数据格式不正确',
      'data.import.version.unsupported': '不支持的数据版本: {{version}}，支持的版本: {{supported}}',
      'data.import.session.id.required': '缺少会话ID',
      'data.import.session.not.found': '未找到导入会话',
      'data.import.progress.get.failed': '获取导入进度失败',
      'data.import.start.failed': '启动导入失败',
      'data.import.json.format.error': '导入数据格式错误，请确保是有效的JSON格式',
      'data.import.validation.failed': '验证导入数据失败'
    },
    en: {
      'data.import.completed': 'Import completed: {{created}} records created, {{updated}} records updated',
      'data.import.success': 'Import successful: {{created}} records created, {{updated}} records updated',
      'data.import.failed': 'Import failed: {{message}}',
      'data.import.partial.success': 'Import partially successful: {{failed}} records failed',
      'data.import.validating': 'Validating data integrity...',
      'data.import.starting': 'Starting data import...',
      'data.import.started': 'Import started, use session ID to query progress',
      'data.import.error': 'Error occurred during import: {{error}}',
      'data.import.integrity.check.failed': 'Data integrity check failed: {{error}}',
      'data.import.data.required': 'Import data is required',
      'data.import.format.invalid': 'Invalid import data format',
      'data.import.version.unsupported': 'Unsupported data version: {{version}}, supported versions: {{supported}}',
      'data.import.session.id.required': 'Session ID is required',
      'data.import.session.not.found': 'Import session not found',
      'data.import.progress.get.failed': 'Failed to get import progress',
      'data.import.start.failed': 'Failed to start import',
      'data.import.json.format.error': 'Invalid import data format, please ensure it is valid JSON',
      'data.import.validation.failed': 'Failed to validate import data'
    }
  }

  console.log('\n中文翻译键值:')
  Object.entries(translations.zh).forEach(([key, value]) => {
    console.log(`"${key}": "${value}",`)
  })

  console.log('\n英文翻译键值:')
  Object.entries(translations.en).forEach(([key, value]) => {
    console.log(`"${key}": "${value}",`)
  })
}

function main() {
  console.log('🧪 数据导入国际化修复验证\n')
  
  const success = checkImportI18n()
  generateTranslationKeys()
  
  console.log('\n' + '='.repeat(50))
  if (success) {
    console.log('🎉 数据导入国际化修复验证通过！')
  } else {
    console.log('⚠️  请完成剩余的修复工作')
  }
  console.log('='.repeat(50))
}

main()
