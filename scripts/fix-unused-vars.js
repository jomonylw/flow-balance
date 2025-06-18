#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 获取所有未使用变量的错误
function getUnusedVarsErrors() {
  try {
    const lintOutput = execSync('pnpm run lint 2>&1', { encoding: 'utf8' });
    const lines = lintOutput.split('\n');
    const errors = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('is defined but never used') || line.includes('is assigned a value but never used')) {
        const match = line.match(/^(.+):(\d+):(\d+)\s+Error:\s+'([^']+)'/);
        if (match) {
          const [, filePath, lineNum, colNum, varName] = match;
          errors.push({
            file: filePath.replace('./', ''),
            line: parseInt(lineNum),
            column: parseInt(colNum),
            variable: varName,
            fullLine: line
          });
        }
      }
    }
    
    return errors;
  } catch (error) {
    console.error('获取lint错误失败:', error.message);
    return [];
  }
}

// 修复单个文件中的未使用变量
function fixUnusedVarsInFile(filePath, errors) {
  if (!fs.existsSync(filePath)) {
    console.log(`文件不存在: ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let modified = false;
  
  // 按行号倒序处理，避免行号偏移
  const sortedErrors = errors.sort((a, b) => b.line - a.line);
  
  for (const error of sortedErrors) {
    const lineIndex = error.line - 1;
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex];
      const varName = error.variable;
      
      // 处理不同类型的未使用变量
      if (line.includes(`${varName}:`)) {
        // 函数参数: function(request: NextRequest) -> function(_request: NextRequest)
        lines[lineIndex] = line.replace(new RegExp(`\\b${varName}\\b`), `_${varName}`);
        modified = true;
      } else if (line.includes(`const ${varName}`)) {
        // 变量声明: const varName = -> const _varName =
        lines[lineIndex] = line.replace(`const ${varName}`, `const _${varName}`);
        modified = true;
      } else if (line.includes(`let ${varName}`)) {
        // 变量声明: let varName = -> let _varName =
        lines[lineIndex] = line.replace(`let ${varName}`, `let _${varName}`);
        modified = true;
      } else if (line.includes(`import`) && line.includes(varName)) {
        // 导入语句: 删除未使用的导入
        if (line.includes(`{ ${varName} }`)) {
          // 单个导入: import { UnusedVar } from 'module'
          lines[lineIndex] = line.replace(new RegExp(`,?\\s*${varName}\\s*,?`), '').replace(/{\s*,/, '{').replace(/,\s*}/, '}');
          if (lines[lineIndex].includes('{ }') || lines[lineIndex].includes('{}')) {
            lines[lineIndex] = ''; // 删除空的导入行
          }
          modified = true;
        } else if (line.includes(`${varName},`) || line.includes(`, ${varName}`)) {
          // 多个导入中的一个
          lines[lineIndex] = line.replace(new RegExp(`,?\\s*${varName}\\s*,?`), '').replace(/,\s*,/, ',');
          modified = true;
        }
      } else if (line.includes(`[${varName},`) || line.includes(`, ${varName}`)) {
        // 解构赋值: [varName, other] -> [_varName, other]
        lines[lineIndex] = line.replace(new RegExp(`\\b${varName}\\b`), `_${varName}`);
        modified = true;
      }
    }
  }
  
  if (modified) {
    // 清理空行和多余的逗号
    const cleanedLines = lines.map(line => {
      return line
        .replace(/,\s*,/g, ',') // 删除多余的逗号
        .replace(/{\s*,/g, '{') // 修复开头逗号
        .replace(/,\s*}/g, '}') // 修复结尾逗号
        .replace(/\(\s*,/g, '(') // 修复参数开头逗号
        .replace(/,\s*\)/g, ')'); // 修复参数结尾逗号
    }).filter(line => line.trim() !== '' || lines.indexOf(line) === 0); // 保留第一行即使为空
    
    fs.writeFileSync(filePath, cleanedLines.join('\n'));
    console.log(`✅ 修复文件: ${filePath} (${errors.length}个变量)`);
    return true;
  }
  
  return false;
}

// 主函数
function main() {
  console.log('🔍 分析未使用变量错误...');
  const errors = getUnusedVarsErrors();
  
  if (errors.length === 0) {
    console.log('✅ 没有发现未使用变量错误');
    return;
  }
  
  console.log(`📊 发现 ${errors.length} 个未使用变量错误`);
  
  // 按文件分组
  const errorsByFile = {};
  errors.forEach(error => {
    if (!errorsByFile[error.file]) {
      errorsByFile[error.file] = [];
    }
    errorsByFile[error.file].push(error);
  });
  
  console.log(`📁 涉及 ${Object.keys(errorsByFile).length} 个文件`);
  
  let fixedFiles = 0;
  let totalFixed = 0;
  
  // 修复每个文件
  for (const [filePath, fileErrors] of Object.entries(errorsByFile)) {
    if (fixUnusedVarsInFile(filePath, fileErrors)) {
      fixedFiles++;
      totalFixed += fileErrors.length;
    }
  }
  
  console.log(`\n🎉 修复完成:`);
  console.log(`   - 修复文件: ${fixedFiles}`);
  console.log(`   - 修复变量: ${totalFixed}`);
  
  // 重新检查
  console.log('\n🔍 重新检查lint状态...');
  try {
    execSync('pnpm run lint --quiet', { stdio: 'inherit' });
  } catch (error) {
    console.log('还有其他lint错误需要手动修复');
  }
}

if (require.main === module) {
  main();
}
