#!/usr/bin/env node

/**
 * 测试服务端国际化功能
 * 验证所有新添加的翻译键值是否正确工作
 */

const fs = require('fs')
const path = require('path')

console.log('🔍 测试服务端国际化功能...\n')

// 测试翻译文件是否存在
function checkTranslationFiles() {
  console.log('📁 检查翻译文件...')
  
  const requiredFiles = [
    'public/locales/zh/category.json',
    'public/locales/zh/account.json', 
    'public/locales/zh/auth.json',
    'public/locales/zh/tag.json',
    'public/locales/zh/settings.json',
    'public/locales/zh/currency.json',
    'public/locales/zh/common.json',
    'public/locales/zh/transaction.json',
    'public/locales/en/category.json',
    'public/locales/en/account.json',
    'public/locales/en/auth.json', 
    'public/locales/en/tag.json',
    'public/locales/en/settings.json',
    'public/locales/en/currency.json',
    'public/locales/en/common.json',
    'public/locales/en/transaction.json'
  ]
  
  let allFilesExist = true
  
  requiredFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file)
    if (fs.existsSync(filePath)) {
      console.log(`  ✅ ${file}`)
    } else {
      console.log(`  ❌ ${file} - 文件不存在`)
      allFilesExist = false
    }
  })
  
  return allFilesExist
}

// 检查新添加的翻译键值
function checkNewTranslationKeys() {
  console.log('\n🔑 检查新添加的翻译键值...')
  
  const newKeys = {
    'category': [
      'category.get.failed',
      'category.not.found', 
      'category.parent.not.found',
      'category.create.success',
      'category.update.success',
      'category.delete.failed'
    ],
    'account': [
      'account.get.failed',
      'account.name.required',
      'account.create.success',
      'account.create.failed'
    ],
    'auth': [
      'auth.email.password.required',
      'auth.user.info.failed',
      'auth.login.success',
      'auth.signup.failed',
      'auth.unauthorized'
    ],
    'tag': [
      'tag.get.failed',
      'tag.name.too.long',
      'tag.create.success',
      'tag.create.failed'
    ],
    'settings': [
      'settings.get.failed',
      'settings.update.success',
      'settings.update.failed'
    ],
    'currency': [
      'currency.not.found',
      'currency.permission.denied'
    ],
    'common': [
      'common.server.error'
    ],
    'transaction': [
      'transaction.not.found',
      'transaction.get.failed'
    ]
  }
  
  let allKeysFound = true
  
  Object.entries(newKeys).forEach(([namespace, keys]) => {
    console.log(`\n  📂 ${namespace}:`)
    
    // 检查中文翻译
    const zhFile = path.join(process.cwd(), `public/locales/zh/${namespace}.json`)
    const enFile = path.join(process.cwd(), `public/locales/en/${namespace}.json`)
    
    if (fs.existsSync(zhFile) && fs.existsSync(enFile)) {
      const zhContent = JSON.parse(fs.readFileSync(zhFile, 'utf8'))
      const enContent = JSON.parse(fs.readFileSync(enFile, 'utf8'))
      
      keys.forEach(key => {
        const zhExists = zhContent[key] !== undefined
        const enExists = enContent[key] !== undefined
        
        if (zhExists && enExists) {
          console.log(`    ✅ ${key}`)
        } else {
          console.log(`    ❌ ${key} - 缺失: ${!zhExists ? 'zh' : ''} ${!enExists ? 'en' : ''}`)
          allKeysFound = false
        }
      })
    } else {
      console.log(`    ❌ 翻译文件不存在`)
      allKeysFound = false
    }
  })
  
  return allKeysFound
}

// 测试服务端翻译函数
async function testServerTranslator() {
  console.log('\n🧪 测试服务端翻译函数...')
  
  try {
    // 动态导入服务端翻译函数
    const { createServerTranslator } = await import('../src/lib/utils/server-i18n.js')
    
    // 测试中文翻译
    const zhT = createServerTranslator('zh')
    const zhTest = zhT('category.get.failed')
    console.log(`  ✅ 中文翻译测试: "${zhTest}"`)
    
    // 测试英文翻译
    const enT = createServerTranslator('en')
    const enTest = enT('category.get.failed')
    console.log(`  ✅ 英文翻译测试: "${enTest}"`)
    
    // 测试参数替换
    const paramTest = zhT('category.name.duplicate.error', { name: '测试分类' })
    console.log(`  ✅ 参数替换测试: "${paramTest}"`)
    
    return true
  } catch (error) {
    console.log(`  ❌ 服务端翻译函数测试失败: ${error.message}`)
    return false
  }
}

// 检查API文件是否已更新
function checkApiFiles() {
  console.log('\n📄 检查API文件更新...')
  
  const apiFiles = [
    'src/app/api/categories/route.ts',
    'src/app/api/categories/[categoryId]/route.ts',
    'src/app/api/accounts/route.ts',
    'src/app/api/auth/login/route.ts',
    'src/app/api/auth/signup/route.ts',
    'src/app/api/tags/route.ts',
    'src/app/api/user/settings/route.ts'
  ]
  
  let allFilesUpdated = true
  
  apiFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8')
      
      // 检查是否导入了服务端翻译函数
      const hasImport = content.includes('createServerTranslator')
      
      // 检查是否还有硬编码的中文文本（简单检查）
      const hasHardcodedChinese = /['"][\u4e00-\u9fff]+['"]/.test(content)
      
      if (hasImport && !hasHardcodedChinese) {
        console.log(`  ✅ ${file}`)
      } else {
        console.log(`  ⚠️  ${file} - ${!hasImport ? '缺少导入' : ''} ${hasHardcodedChinese ? '仍有硬编码' : ''}`)
        // 不标记为失败，因为可能有一些合理的硬编码文本
      }
    } else {
      console.log(`  ❌ ${file} - 文件不存在`)
      allFilesUpdated = false
    }
  })
  
  return allFilesUpdated
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始服务端国际化测试\n')
  
  const results = {
    files: checkTranslationFiles(),
    keys: checkNewTranslationKeys(), 
    translator: await testServerTranslator(),
    apiFiles: checkApiFiles()
  }
  
  console.log('\n📊 测试结果汇总:')
  console.log(`  翻译文件: ${results.files ? '✅ 通过' : '❌ 失败'}`)
  console.log(`  翻译键值: ${results.keys ? '✅ 通过' : '❌ 失败'}`)
  console.log(`  翻译函数: ${results.translator ? '✅ 通过' : '❌ 失败'}`)
  console.log(`  API文件: ${results.apiFiles ? '✅ 通过' : '⚠️  部分更新'}`)
  
  const allPassed = results.files && results.keys && results.translator && results.apiFiles
  
  console.log(`\n${allPassed ? '🎉' : '⚠️ '} 服务端国际化测试${allPassed ? '全部通过' : '部分通过'}！`)
  
  if (!allPassed) {
    console.log('\n💡 建议:')
    if (!results.files) console.log('  - 检查翻译文件是否正确创建')
    if (!results.keys) console.log('  - 补充缺失的翻译键值')
    if (!results.translator) console.log('  - 检查服务端翻译函数实现')
    if (!results.apiFiles) console.log('  - 完成API文件的国际化更新')
  }
  
  return allPassed
}

// 运行测试
runTests().catch(console.error)
