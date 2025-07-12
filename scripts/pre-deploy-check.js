#!/usr/bin/env node

/**
 * 部署前检查脚本
 * 确保所有关键组件都已正确配置
 */

const fs = require('fs')
const path = require('path')

// 检查项目配置
function checkProjectConfig() {
  console.log('📋 检查项目配置...')

  const checks = [
    {
      name: 'vercel.json 配置',
      check: () => {
        const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'))
        return (
          vercelConfig.functions &&
          vercelConfig.functions['src/app/api/**/*.ts'] &&
          vercelConfig.functions['src/app/api/**/*.ts'].memory === 1024
        )
      },
    },
    {
      name: '连接管理器文件',
      check: () => fs.existsSync('src/lib/database/connection-manager.ts'),
    },
    {
      name: '健康检查API',
      check: () => fs.existsSync('src/app/api/health/database/route.ts'),
    },
    {
      name: 'Prisma客户端配置',
      check: () => {
        const prismaFile = fs.readFileSync('src/lib/database/prisma.ts', 'utf8')
        return prismaFile.includes('getPrismaClient')
      },
    },
    {
      name: '优化文档',
      check: () => fs.existsSync('docs/VERCEL_DATABASE_OPTIMIZATION.md'),
    },
  ]

  let allPassed = true
  checks.forEach(({ name, check }) => {
    try {
      if (check()) {
        console.log(`✅ ${name}`)
      } else {
        console.log(`❌ ${name}`)
        allPassed = false
      }
    } catch (error) {
      console.log(`❌ ${name} - 错误: ${error.message}`)
      allPassed = false
    }
  })

  return allPassed
}

// 检查关键API文件是否已更新
function checkAPIFiles() {
  console.log('\n📁 检查关键API文件...')

  const criticalFiles = [
    'src/app/api/dashboard/summary/route.ts',
    'src/app/api/transactions/route.ts',
    'src/app/api/accounts/route.ts',
    'src/app/api/currencies/route.ts',
  ]

  let allUpdated = true
  criticalFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8')
      if (content.includes('getPrismaClient')) {
        console.log(`✅ ${file} - 已更新`)
      } else {
        console.log(`❌ ${file} - 未更新`)
        allUpdated = false
      }
    } catch (error) {
      console.log(`❌ ${file} - 文件不存在`)
      allUpdated = false
    }
  })

  return allUpdated
}

// 检查环境变量配置
function checkEnvironmentConfig() {
  console.log('\n🌍 检查环境变量配置...')

  const requiredEnvVars = ['DATABASE_URL']

  const optionalEnvVars = ['JWT_SECRET', 'NEXT_PUBLIC_APP_URL']

  let hasRequired = true

  console.log('必需的环境变量:')
  requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar}`)
    } else {
      console.log(`❌ ${envVar} - 未设置`)
      hasRequired = false
    }
  })

  console.log('\n可选的环境变量:')
  optionalEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar}`)
    } else {
      console.log(`⚠️  ${envVar} - 未设置（可选）`)
    }
  })

  return hasRequired
}

// 生成部署建议
function generateDeploymentAdvice() {
  console.log('\n📝 部署建议:')
  console.log('1. 确保数据库连接字符串已优化（包含连接池参数）')
  console.log('2. 在Vercel项目设置中配置环境变量')
  console.log('3. 部署后监控健康检查端点:')
  console.log('   - https://your-app.vercel.app/api/health')
  console.log('   - https://your-app.vercel.app/api/health/database')
  console.log('4. 观察Vercel函数日志中的连接状态信息')
  console.log('5. 如果仍有连接问题，考虑:')
  console.log('   - 降低连接池限制')
  console.log('   - 升级数据库计划')
  console.log('   - 检查其他应用的连接使用情况')
}

// 主函数
function main() {
  console.log('🚀 Flow Balance - 部署前检查\n')

  const configOk = checkProjectConfig()
  const apiOk = checkAPIFiles()
  const envOk = checkEnvironmentConfig()

  console.log('\n📊 检查结果:')
  console.log(`项目配置: ${configOk ? '✅ 通过' : '❌ 失败'}`)
  console.log(`API文件: ${apiOk ? '✅ 通过' : '❌ 失败'}`)
  console.log(`环境变量: ${envOk ? '✅ 通过' : '❌ 失败'}`)

  const allPassed = configOk && apiOk && envOk

  if (allPassed) {
    console.log('\n🎉 所有检查通过！可以安全部署。')
  } else {
    console.log('\n⚠️  存在问题，请修复后再部署。')
  }

  generateDeploymentAdvice()

  return allPassed
}

// 运行检查
if (require.main === module) {
  const success = main()
  process.exit(success ? 0 : 1)
}

module.exports = { main }
