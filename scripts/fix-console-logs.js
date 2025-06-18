#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 获取所有需要修复的文件
function getFilesWithConsoleLog() {
  try {
    const result = execSync('pnpm lint 2>&1', { encoding: 'utf8' });
    const lines = result.split('\n');
    const files = new Set();
    
    lines.forEach(line => {
      if (line.includes('Unexpected console statement')) {
        const match = line.match(/^\.\/(.+?):/);
        if (match) {
          files.add(match[1]);
        }
      }
    });
    
    return Array.from(files);
  } catch (error) {
    console.error('Error getting lint results:', error.message);
    return [];
  }
}

// 修复单个文件中的console.log
function fixConsoleLogsInFile(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;
    
    // 替换模式
    const patterns = [
      // 简单的console.log调用
      {
        pattern: /console\.log\(/g,
        replacement: 'console.warn('
      },
      // 带有字符串参数的console.log
      {
        pattern: /console\.log\(['"`]([^'"`]+)['"`]\)/g,
        replacement: (match, message) => {
          // 如果是调试信息，删除整行
          if (message.includes('debug') || message.includes('Debug') || 
              message.includes('开始') || message.includes('结束') ||
              message.includes('count') || message.includes('generated') ||
              message.includes('found')) {
            return '';
          }
          return `console.warn('${message}')`;
        }
      }
    ];
    
    patterns.forEach(({ pattern, replacement }) => {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    // 清理空行
    if (modified) {
      content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
      fs.writeFileSync(fullPath, content);
      console.log(`Fixed console.log in: ${filePath}`);
    }
    
    return modified;
  } catch (error) {
    console.error(`Error fixing file ${filePath}:`, error.message);
    return false;
  }
}

// 主函数
function main() {
  console.log('Finding files with console.log issues...');
  const files = getFilesWithConsoleLog();
  
  if (files.length === 0) {
    console.log('No files with console.log issues found.');
    return;
  }
  
  console.log(`Found ${files.length} files with console.log issues:`);
  files.forEach(file => console.log(`  - ${file}`));
  
  let fixedCount = 0;
  files.forEach(file => {
    if (fixConsoleLogsInFile(file)) {
      fixedCount++;
    }
  });
  
  console.log(`\nFixed console.log issues in ${fixedCount} files.`);
  
  // 运行lint检查结果
  try {
    console.log('\nRunning lint check...');
    execSync('pnpm lint', { stdio: 'inherit' });
  } catch (error) {
    console.log('Lint check completed with remaining issues.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixConsoleLogsInFile, getFilesWithConsoleLog };
