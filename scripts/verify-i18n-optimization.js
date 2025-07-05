#!/usr/bin/env node

/**
 * 验证国际化优化是否完成
 * 检查是否还有遗漏的 getUserTranslator 函数定义或硬编码文本
 */

const fs = require('fs')
const path = require('path')

function getAllTSFiles(dir) {
  const files = []
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir)
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        if (!['node_modules', '.next', '.git', 'dist', 'build'].includes(item)) {
          traverse(fullPath)
        }
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath)
      }
    }
  }
  
  traverse(dir)
  return files
}

function checkDuplicateGetUserTranslator() {
  console.log('🔍 检查重复的 getUserTranslator 函数定义...')
  
  const files = getAllTSFiles('src')
  const duplicates = []
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8')
    
    // 检查是否有本地定义的 getUserTranslator 函数
    const localDefinitionPattern = /async function getUserTranslator\s*\(/
    if (localDefinitionPattern.test(content)) {
      // 排除统一的服务文件
      if (!file.includes('src/lib/utils/server-i18n.ts')) {
        duplicates.push(file)
      }
    }
  })
  
  if (duplicates.length === 0) {
    console.log('   ✅ 没有发现重复的 getUserTranslator 函数定义')
    return true
  } else {
    console.log('   ❌ 发现重复的 getUserTranslator 函数定义:')
    duplicates.forEach(file => {
      console.log(`      - ${path.relative(process.cwd(), file)}`)
    })
    return false
  }
}

function checkImportUsage() {
  console.log('\n🔍 检查 getUserTranslator 导入使用情况...')
  
  const apiFiles = getAllTSFiles('src/app/api').filter(file => 
    !file.includes('route.ts') || file.includes('route.ts')
  )
  
  const serviceFiles = getAllTSFiles('src/lib/services')
  const allFiles = apiFiles.concat(serviceFiles)
  
  let correctImports = 0
  let incorrectFiles = []
  
  allFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8')
    
    // 检查是否使用了翻译相关功能
    const usesTranslation = content.includes('getUserTranslator(') || 
                           content.includes('createServerTranslator(') ||
                           content.includes('t(\'') ||
                           content.includes('t("')
    
    if (usesTranslation) {
      // 检查是否正确导入
      const hasCorrectImport = content.includes('import { getUserTranslator }') ||
                              content.includes('import { createServerTranslator, getUserTranslator }') ||
                              content.includes('import { getUserTranslator, clearUserLanguageCache }')
      
      const hasOldImport = content.includes('import { createServerTranslator }') && 
                          !content.includes('getUserTranslator')
      
      if (hasCorrectImport) {
        correctImports++
      } else if (hasOldImport || !hasCorrectImport) {
        incorrectFiles.push({
          file: path.relative(process.cwd(), file),
          issue: hasOldImport ? '使用旧的导入方式' : '缺少正确的导入'
        })
      }
    }
  })
  
  console.log(`   ✅ 正确导入的文件: ${correctImports}`)
  
  if (incorrectFiles.length === 0) {
    console.log('   ✅ 所有文件都使用了正确的导入方式')
    return true
  } else {
    console.log('   ❌ 发现问题文件:')
    incorrectFiles.forEach(({ file, issue }) => {
      console.log(`      - ${file}: ${issue}`)
    })
    return false
  }
}

function checkHardcodedText() {
  console.log('\n🔍 检查硬编码的中文文本...')
  
  const apiFiles = getAllTSFiles('src/app/api')
  const serviceFiles = getAllTSFiles('src/lib/services')
  const allFiles = apiFiles.concat(serviceFiles)
  
  const hardcodedPatterns = [
    /['"][\u4e00-\u9fff]+['"]/, // 中文字符
    /errorResponse\s*\(\s*['"][^'"\u4e00-\u9fff]*[\u4e00-\u9fff]/, // errorResponse 中的中文
    /validationErrorResponse\s*\(\s*['"][^'"\u4e00-\u9fff]*[\u4e00-\u9fff]/, // validationErrorResponse 中的中文
  ]
  
  let foundHardcoded = []
  
  allFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8')
    const lines = content.split('\n')
    
    lines.forEach((line, index) => {
      hardcodedPatterns.forEach(pattern => {
        if (pattern.test(line)) {
          // 排除一些合理的硬编码（如日志、注释等）
          if (!line.includes('console.') && 
              !line.includes('//') && 
              !line.includes('/*') &&
              !line.includes('* ')) {
            foundHardcoded.push({
              file: path.relative(process.cwd(), file),
              line: index + 1,
              content: line.trim()
            })
          }
        }
      })
    })
  })
  
  if (foundHardcoded.length === 0) {
    console.log('   ✅ 没有发现硬编码的中文文本')
    return true
  } else {
    console.log('   ❌ 发现硬编码的中文文本:')
    foundHardcoded.forEach(({ file, line, content }) => {
      console.log(`      - ${file}:${line} - ${content}`)
    })
    return false
  }
}

function checkCacheImplementation() {
  console.log('\n🔍 检查缓存实现...')
  
  const serverI18nFile = 'src/lib/utils/server-i18n.ts'
  
  if (!fs.existsSync(serverI18nFile)) {
    console.log('   ❌ 服务端国际化文件不存在')
    return false
  }
  
  const content = fs.readFileSync(serverI18nFile, 'utf8')
  
  const requiredFeatures = [
    'userLanguageCache',
    'getUserLanguage',
    'export async function getUserTranslator',
    'clearUserLanguageCache',
    'CACHE.USER_DATA_TTL'
  ]
  
  let missingFeatures = []
  
  requiredFeatures.forEach(feature => {
    if (!content.includes(feature)) {
      missingFeatures.push(feature)
    }
  })
  
  if (missingFeatures.length === 0) {
    console.log('   ✅ 缓存实现完整')
    return true
  } else {
    console.log('   ❌ 缺少缓存功能:')
    missingFeatures.forEach(feature => {
      console.log(`      - ${feature}`)
    })
    return false
  }
}

function generateSummary() {
  console.log('\n📊 生成优化总结...')
  
  const apiFiles = getAllTSFiles('src/app/api')
  const serviceFiles = getAllTSFiles('src/lib/services')
  
  let filesUsingGetUserTranslator = 0
  let filesUsingCreateServerTranslator = 0
  
  const allFilesForSummary = apiFiles.concat(serviceFiles)
  allFilesForSummary.forEach(file => {
    const content = fs.readFileSync(file, 'utf8')
    
    if (content.includes('getUserTranslator(')) {
      filesUsingGetUserTranslator++
    }
    if (content.includes('createServerTranslator(')) {
      filesUsingCreateServerTranslator++
    }
  })
  
  console.log(`   📈 使用 getUserTranslator 的文件: ${filesUsingGetUserTranslator}`)
  console.log(`   📈 使用 createServerTranslator 的文件: ${filesUsingCreateServerTranslator}`)
  console.log(`   📈 总计 API 文件: ${apiFiles.length}`)
  console.log(`   📈 总计服务文件: ${serviceFiles.length}`)
}

async function main() {
  console.log('🧪 开始验证国际化优化...\n')
  
  const checks = [
    checkDuplicateGetUserTranslator(),
    checkImportUsage(),
    checkHardcodedText(),
    checkCacheImplementation()
  ]
  
  const allPassed = checks.every(result => result === true)
  
  generateSummary()
  
  console.log('\n' + '='.repeat(50))
  if (allPassed) {
    console.log('🎉 所有检查通过！国际化优化已完成。')
  } else {
    console.log('❌ 部分检查未通过，请修复上述问题。')
  }
  console.log('='.repeat(50))
  
  process.exit(allPassed ? 0 : 1)
}

main().catch(console.error)
