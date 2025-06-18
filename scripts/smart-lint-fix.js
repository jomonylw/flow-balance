#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 安全的修复规则
const SAFE_FIXES = {
  // 1. 简单的console.log删除（调试语句）
  removeDebugConsole: {
    patterns: [
      // 单行调试console.log
      /^\s*console\.log\(['"`][^'"`]*debug[^'"`]*['"`]\)\s*$/gim,
      /^\s*console\.log\(['"`][^'"`]*Debug[^'"`]*['"`]\)\s*$/gim,
      /^\s*console\.log\(['"`][^'"`]*开始[^'"`]*['"`]\)\s*$/gim,
      /^\s*console\.log\(['"`][^'"`]*结束[^'"`]*['"`]\)\s*$/gim,
      /^\s*console\.log\(['"`][^'"`]*generated[^'"`]*['"`]\)\s*$/gim,
      /^\s*console\.log\(['"`][^'"`]*count[^'"`]*['"`]\)\s*$/gim,
      /^\s*console\.log\(['"`][^'"`]*found[^'"`]*['"`]\)\s*$/gim,
    ]
  },
  
  // 2. 将console.log改为console.warn（重要信息）
  convertToWarn: {
    patterns: [
      // 错误相关的console.log
      /console\.log\((['"`][^'"`]*error[^'"`]*['"`][^)]*)\)/gi,
      /console\.log\((['"`][^'"`]*failed[^'"`]*['"`][^)]*)\)/gi,
      /console\.log\((['"`][^'"`]*warning[^'"`]*['"`][^)]*)\)/gi,
    ],
    replacement: 'console.warn($1)'
  },
  
  // 3. 修复简单的行长度问题
  fixLineLength: {
    patterns: [
      // 简单的字符串拆分
      /^(\s*)(.*)(className=['"`][^'"`]{80,}['"`])(.*)/gm,
    ]
  },
  
  // 4. 修复简单的非空断言
  fixSimpleNonNull: {
    patterns: [
      // 简单的属性访问
      /(\w+)\.(\w+)!/g,
    ],
    replacement: '$1?.$2'
  }
};

// 获取lint错误统计
function getLintStats() {
  try {
    const result = execSync('pnpm lint 2>&1', { encoding: 'utf8' });
    const lines = result.split('\n');
    
    const stats = {
      console: 0,
      nonNull: 0,
      any: 0,
      maxLen: 0,
      reactHooks: 0,
      total: 0
    };
    
    lines.forEach(line => {
      if (line.includes('no-console')) stats.console++;
      if (line.includes('no-non-null-assertion')) stats.nonNull++;
      if (line.includes('no-explicit-any')) stats.any++;
      if (line.includes('max-len')) stats.maxLen++;
      if (line.includes('react-hooks/exhaustive-deps')) stats.reactHooks++;
      if (line.includes('Warning:') || line.includes('Error:')) stats.total++;
    });
    
    return stats;
  } catch (error) {
    console.error('Error getting lint stats:', error.message);
    return null;
  }
}

// 安全地修复单个文件
function safeFixFile(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;
    let modified = false;
    
    // 1. 删除简单的调试console.log
    SAFE_FIXES.removeDebugConsole.patterns.forEach(pattern => {
      const newContent = content.replace(pattern, '');
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    // 2. 将错误相关的console.log改为console.warn
    SAFE_FIXES.convertToWarn.patterns.forEach(pattern => {
      const newContent = content.replace(pattern, SAFE_FIXES.convertToWarn.replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    // 3. 清理多余的空行
    if (modified) {
      content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
      content = content.replace(/\n{3,}/g, '\n\n');
    }
    
    // 4. 验证修改是否安全（基本语法检查）
    if (modified) {
      // 检查是否破坏了基本的语法结构
      const braceCount = (content.match(/\{/g) || []).length - (content.match(/\}/g) || []).length;
      const parenCount = (content.match(/\(/g) || []).length - (content.match(/\)/g) || []).length;
      
      if (braceCount !== 0 || parenCount !== 0) {
        console.warn(`Skipping ${filePath}: potential syntax issues detected`);
        return false;
      }
      
      fs.writeFileSync(fullPath, content);
      console.log(`✓ Fixed: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error fixing file ${filePath}:`, error.message);
    return false;
  }
}

// 获取需要修复的文件列表
function getFilesToFix() {
  try {
    const result = execSync('pnpm lint 2>&1', { encoding: 'utf8' });
    const lines = result.split('\n');
    const files = new Set();
    
    lines.forEach(line => {
      // 只处理console.log错误的文件
      if (line.includes('no-console')) {
        const match = line.match(/^\.\/(.+?):/);
        if (match) {
          files.add(match[1]);
        }
      }
    });
    
    return Array.from(files);
  } catch (error) {
    console.error('Error getting files to fix:', error.message);
    return [];
  }
}

// 主函数
function main() {
  console.log('🔍 Analyzing lint issues...');
  
  const beforeStats = getLintStats();
  if (!beforeStats) {
    console.error('Failed to get lint statistics');
    return;
  }
  
  console.log('📊 Current lint issues:');
  console.log(`  Console statements: ${beforeStats.console}`);
  console.log(`  Non-null assertions: ${beforeStats.nonNull}`);
  console.log(`  Any types: ${beforeStats.any}`);
  console.log(`  Line length: ${beforeStats.maxLen}`);
  console.log(`  React hooks: ${beforeStats.reactHooks}`);
  console.log(`  Total: ${beforeStats.total}`);
  
  const filesToFix = getFilesToFix();
  console.log(`\n🎯 Found ${filesToFix.length} files with console.log issues`);
  
  if (filesToFix.length === 0) {
    console.log('No files to fix');
    return;
  }
  
  let fixedCount = 0;
  console.log('\n🔧 Applying safe fixes...');
  
  filesToFix.forEach(file => {
    if (safeFixFile(file)) {
      fixedCount++;
    }
  });
  
  console.log(`\n✅ Fixed ${fixedCount} files`);
  
  // 检查修复后的状态
  console.log('\n📊 Checking results...');
  const afterStats = getLintStats();
  
  if (afterStats) {
    console.log('After fixes:');
    console.log(`  Console statements: ${afterStats.console} (${beforeStats.console - afterStats.console} fixed)`);
    console.log(`  Total: ${afterStats.total} (${beforeStats.total - afterStats.total} fixed)`);
    
    if (afterStats.total < beforeStats.total) {
      console.log(`\n🎉 Successfully reduced lint issues by ${beforeStats.total - afterStats.total}!`);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { safeFixFile, getLintStats };
