#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 获取所有组件文件
function getAllComponentFiles(dir) {
  let files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!['node_modules', '.next', 'dist', 'build', '.git'].includes(item)) {
        files = files.concat(getAllComponentFiles(fullPath));
      }
    } else if (item.endsWith('.tsx') || item.endsWith('.jsx')) {
      files.push(fullPath);
    }
  }

  return files;
}

// 获取所有源文件（用于搜索导入）
function getAllSourceFiles(dir) {
  let files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!['node_modules', '.next', 'dist', 'build', '.git'].includes(item)) {
        files = files.concat(getAllSourceFiles(fullPath));
      }
    } else if (item.endsWith('.tsx') || item.endsWith('.jsx') || item.endsWith('.ts') || item.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

// 提取组件名称
function getComponentName(filePath) {
  const fileName = path.basename(filePath, path.extname(filePath));
  return fileName;
}

// 检查文件是否导入了指定组件
function checkImport(filePath, componentName, componentPath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // 更精确的导入检查模式
    const importPatterns = [
      // 默认导入: import ComponentName from 'path'
      new RegExp(`import\\s+${componentName}\\s+from\\s+['"\`]([^'"\`]+)['"\`]`, 'g'),
      // 命名导入: import { ComponentName } from 'path'
      new RegExp(`import\\s+{[^}]*\\b${componentName}\\b[^}]*}\\s+from\\s+['"\`]([^'"\`]+)['"\`]`, 'g'),
      // 重命名导入: import { ComponentName as Alias } from 'path'
      new RegExp(`import\\s+{[^}]*\\b${componentName}\\s+as\\s+\\w+[^}]*}\\s+from\\s+['"\`]([^'"\`]+)['"\`]`, 'g'),
      // 动态导入: import('path')
      new RegExp(`import\\s*\\(\\s*['"\`]([^'"\`]*${componentName}[^'"\`]*)['"\`]\\s*\\)`, 'g'),
      // React.lazy导入
      new RegExp(`React\\.lazy\\s*\\(\\s*\\(\\s*\\)\\s*=>\\s*import\\s*\\(\\s*['"\`]([^'"\`]*${componentName}[^'"\`]*)['"\`]\\s*\\)`, 'g'),
    ];

    const matches = [];
    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches.push({
          type: 'import',
          path: match[1] || match[0],
          line: content.substring(0, match.index).split('\n').length
        });
      }
    }

    // 检查JSX使用 - 更精确的模式
    const jsxPatterns = [
      // 开始标签: <ComponentName
      new RegExp(`<${componentName}(?=\\s|>|/)`, 'g'),
      // 自闭合标签: <ComponentName />
      new RegExp(`<${componentName}\\s*/>`, 'g'),
      // 作为组件引用: {ComponentName}
      new RegExp(`{\\s*${componentName}\\s*}`, 'g'),
    ];

    for (const pattern of jsxPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches.push({
          type: 'jsx',
          line: content.substring(0, match.index).split('\n').length
        });
      }
    }

    return matches.length > 0 ? matches : false;
  } catch (error) {
    return false;
  }
}

// 分析组件使用情况
function analyzeComponentUsage() {
  console.log('🔍 深度分析组件使用情况...\n');

  const componentFiles = getAllComponentFiles('src/components');
  const sourceFiles = getAllSourceFiles('src');

  console.log(`📁 发现 ${componentFiles.length} 个组件文件`);
  console.log(`📄 发现 ${sourceFiles.length} 个源文件\n`);

  const unusedComponents = [];
  const usageStats = [];
  const detailedUsage = new Map();

  for (const componentFile of componentFiles) {
    const componentName = getComponentName(componentFile);
    const relativePath = path.relative(process.cwd(), componentFile);

    let usageCount = 0;
    const usedInFiles = [];
    const usageDetails = [];

    // 检查每个源文件是否使用了这个组件
    for (const sourceFile of sourceFiles) {
      // 跳过组件文件本身
      if (sourceFile === componentFile) continue;

      const matches = checkImport(sourceFile, componentName, componentFile);
      if (matches) {
        usageCount++;
        const relativeSourcePath = path.relative(process.cwd(), sourceFile);
        usedInFiles.push(relativeSourcePath);
        usageDetails.push({
          file: relativeSourcePath,
          matches: matches
        });
      }
    }

    if (usageCount === 0) {
      // 进一步检查是否有其他形式的引用
      const hasOtherReferences = checkForOtherReferences(componentName, sourceFiles, componentFile);
      if (!hasOtherReferences) {
        unusedComponents.push({
          name: componentName,
          path: relativePath,
        });
      }
    }

    usageStats.push({
      name: componentName,
      path: relativePath,
      usageCount,
      usedInFiles,
    });

    detailedUsage.set(componentName, usageDetails);
  }

  // 输出详细结果
  console.log('📊 组件使用统计:\n');

  if (unusedComponents.length > 0) {
    console.log('🚨 确认未使用的组件:');
    console.log('====================');
    unusedComponents.forEach(component => {
      console.log(`❌ ${component.name}`);
      console.log(`   路径: ${component.path}`);

      // 检查组件内容，看是否是有意义的组件
      const componentContent = analyzeComponentContent(path.join(process.cwd(), component.path));
      if (componentContent.isComplete) {
        console.log(`   状态: 完整组件 (${componentContent.linesOfCode} 行代码)`);
      } else {
        console.log(`   状态: 不完整或空组件`);
      }
      console.log('');
    });
  } else {
    console.log('✅ 所有组件都有被使用\n');
  }

  // 显示使用频率较低的组件
  const lowUsageComponents = usageStats.filter(stat => stat.usageCount > 0 && stat.usageCount <= 2);
  if (lowUsageComponents.length > 0) {
    console.log('⚠️  使用频率较低的组件 (使用次数 ≤ 2):');
    console.log('=====================================');
    lowUsageComponents.forEach(component => {
      console.log(`📝 ${component.name} (使用 ${component.usageCount} 次)`);
      console.log(`   路径: ${component.path}`);
      if (component.usedInFiles.length > 0) {
        console.log(`   使用位置:`);
        component.usedInFiles.forEach(file => {
          console.log(`     - ${file}`);
        });
      }
      console.log('');
    });
  }

  // 总结
  console.log('📈 总结:');
  console.log('========');
  console.log(`总组件数: ${componentFiles.length}`);
  console.log(`未使用组件: ${unusedComponents.length}`);
  console.log(`低使用频率组件: ${lowUsageComponents.length}`);
  console.log(`使用率: ${((componentFiles.length - unusedComponents.length) / componentFiles.length * 100).toFixed(1)}%`);

  return {
    unusedComponents,
    lowUsageComponents,
    usageStats,
    detailedUsage,
  };
}

// 检查其他形式的引用（如字符串中的引用、注释等）
function checkForOtherReferences(componentName, sourceFiles, componentFile) {
  for (const sourceFile of sourceFiles) {
    if (sourceFile === componentFile) continue;

    try {
      const content = fs.readFileSync(sourceFile, 'utf8');

      // 检查字符串中的引用（可能是动态导入或配置）
      const stringPatterns = [
        new RegExp(`['"\`][^'"\`]*${componentName}[^'"\`]*['"\`]`, 'g'),
        new RegExp(`${componentName}`, 'g'), // 简单的名称匹配
      ];

      for (const pattern of stringPatterns) {
        if (pattern.test(content)) {
          // 进一步验证这不是误报
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.includes(componentName) &&
                !line.startsWith('//') &&
                !line.startsWith('*') &&
                !line.includes('console.log')) {
              return true;
            }
          }
        }
      }
    } catch (error) {
      // 忽略读取错误
    }
  }
  return false;
}

// 分析组件内容
function analyzeComponentContent(componentPath) {
  try {
    const content = fs.readFileSync(componentPath, 'utf8');
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim() !== '').length;

    // 检查是否是一个完整的React组件
    const hasExport = /export\s+(default\s+)?function|export\s+(default\s+)?const|export\s+default/.test(content);
    const hasJSX = /<[A-Z]/.test(content) || /<[a-z]/.test(content);
    const hasReactImport = /import.*react/i.test(content);

    return {
      linesOfCode: nonEmptyLines,
      isComplete: hasExport && (hasJSX || hasReactImport),
      hasExport,
      hasJSX,
      hasReactImport
    };
  } catch (error) {
    return {
      linesOfCode: 0,
      isComplete: false,
      hasExport: false,
      hasJSX: false,
      hasReactImport: false
    };
  }
}

// 检查组件是否在配置文件中被引用
function checkConfigReferences(componentName) {
  const configFiles = [
    'next.config.js',
    'next.config.ts',
    'tailwind.config.js',
    'tsconfig.json',
    'package.json'
  ];

  for (const configFile of configFiles) {
    try {
      if (fs.existsSync(configFile)) {
        const content = fs.readFileSync(configFile, 'utf8');
        if (content.includes(componentName)) {
          return true;
        }
      }
    } catch (error) {
      // 忽略错误
    }
  }
  return false;
}

if (require.main === module) {
  analyzeComponentUsage();
}

module.exports = { analyzeComponentUsage };
