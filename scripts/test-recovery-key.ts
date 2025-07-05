/**
 * 恢复密钥功能测试脚本
 * 验证恢复密钥的生成、验证和重置功能
 */

import { generateRecoveryKey, formatRecoveryKey, isValidRecoveryKeyFormat, maskRecoveryKey } from '../src/lib/utils/recovery-key'

function testRecoveryKeyGeneration() {
  console.log('🔑 测试恢复密钥生成...')
  
  // 生成多个密钥测试唯一性
  const keys = new Set()
  for (let i = 0; i < 100; i++) {
    const key = generateRecoveryKey()
    keys.add(key)
    
    // 验证格式
    if (!isValidRecoveryKeyFormat(key)) {
      console.error(`❌ 生成的密钥格式无效: ${key}`)
      return false
    }
  }
  
  if (keys.size === 100) {
    console.log('✅ 恢复密钥生成测试通过 - 100个密钥全部唯一且格式正确')
  } else {
    console.error(`❌ 恢复密钥唯一性测试失败 - 期望100个唯一密钥，实际${keys.size}个`)
    return false
  }
  
  return true
}

function testRecoveryKeyValidation() {
  console.log('🔍 测试恢复密钥验证...')
  
  const validKeys = [
    'FB-A7K9-M3P2-Q8R5-W6T4',
    'FB-2345-6789-ABCD-EFGH',
    'FB-ZXCV-BNMQ-WERT-YUAP'  // 修复：P替换I，避免使用排除字符
  ]
  
  const invalidKeys = [
    'FB-A7K9-M3P2-Q8R5',        // 缺少一段
    'FB-A7K9-M3P2-Q8R5-W6T45',  // 最后一段太长
    'AB-A7K9-M3P2-Q8R5-W6T4',   // 错误的前缀
    'FB-A7K9-M3P2-Q8R5-W6T',    // 最后一段太短
    'FB-A7K9-M3P2-Q8R5-W6TO',   // 包含无效字符O
    'FB-A7K9-M3P2-Q8R5-W6T1',   // 包含无效字符1
    '',                          // 空字符串
    'invalid-key'                // 完全无效的格式
  ]
  
  // 测试有效密钥
  for (const key of validKeys) {
    if (!isValidRecoveryKeyFormat(key)) {
      console.error(`❌ 有效密钥被误判为无效: ${key}`)
      return false
    }
  }
  
  // 测试无效密钥
  for (const key of invalidKeys) {
    if (isValidRecoveryKeyFormat(key)) {
      console.error(`❌ 无效密钥被误判为有效: ${key}`)
      return false
    }
  }
  
  console.log('✅ 恢复密钥验证测试通过')
  return true
}

function testRecoveryKeyFormatting() {
  console.log('🔧 测试恢复密钥格式化...')
  
  const testCases = [
    {
      input: 'FB-A7K9-M3P2-Q8R5-W6T4',
      expected: 'FB-A7K9-M3P2-Q8R5-W6T4'
    },
    {
      input: 'fb-a7k9-m3p2-q8r5-w6t4',  // 小写
      expected: 'FB-A7K9-M3P2-Q8R5-W6T4'
    },
    {
      input: 'FBA7K9M3P2Q8R5W6T4',      // 无连字符
      expected: 'FB-A7K9-M3P2-Q8R5-W6T4'
    },
    {
      input: ' FB-A7K9-M3P2-Q8R5-W6T4 ', // 有空格
      expected: 'FB-A7K9-M3P2-Q8R5-W6T4'
    },
    {
      input: 'invalid-key',              // 无效格式
      expected: null
    }
  ]
  
  for (const testCase of testCases) {
    const result = formatRecoveryKey(testCase.input)
    if (result !== testCase.expected) {
      console.error(`❌ 格式化测试失败:`)
      console.error(`   输入: ${testCase.input}`)
      console.error(`   期望: ${testCase.expected}`)
      console.error(`   实际: ${result}`)
      return false
    }
  }
  
  console.log('✅ 恢复密钥格式化测试通过')
  return true
}

function testRecoveryKeyMasking() {
  console.log('🎭 测试恢复密钥掩码...')
  
  const key = 'FB-A7K9-M3P2-Q8R5-W6T4'
  
  const testCases = [
    {
      visibleSegments: 0,
      expected: 'FB-****-****-****-****'
    },
    {
      visibleSegments: 1,
      expected: 'FB-A7K9-****-****-****'
    },
    {
      visibleSegments: 2,
      expected: 'FB-A7K9-M3P2-****-****'
    },
    {
      visibleSegments: 4,
      expected: 'FB-A7K9-M3P2-Q8R5-W6T4'
    }
  ]
  
  for (const testCase of testCases) {
    const result = maskRecoveryKey(key, testCase.visibleSegments)
    if (result !== testCase.expected) {
      console.error(`❌ 掩码测试失败:`)
      console.error(`   可见段数: ${testCase.visibleSegments}`)
      console.error(`   期望: ${testCase.expected}`)
      console.error(`   实际: ${result}`)
      return false
    }
  }
  
  console.log('✅ 恢复密钥掩码测试通过')
  return true
}

function runAllTests() {
  console.log('🚀 开始恢复密钥功能测试...')
  console.log('=' .repeat(50))
  
  const tests = [
    testRecoveryKeyGeneration,
    testRecoveryKeyValidation,
    testRecoveryKeyFormatting,
    testRecoveryKeyMasking
  ]
  
  let passedTests = 0
  
  for (const test of tests) {
    try {
      if (test()) {
        passedTests++
      }
    } catch (error) {
      console.error(`❌ 测试执行出错: ${error}`)
    }
    console.log('')
  }
  
  console.log('=' .repeat(50))
  console.log(`📊 测试结果: ${passedTests}/${tests.length} 通过`)
  
  if (passedTests === tests.length) {
    console.log('🎉 所有测试通过！恢复密钥功能正常工作')
    return true
  } else {
    console.log('❌ 部分测试失败，请检查实现')
    return false
  }
}

// 运行测试
if (require.main === module) {
  runAllTests()
}

export { runAllTests }
