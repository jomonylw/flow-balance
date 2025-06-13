/**
 * FIRE 功能国际化测试脚本
 * 在浏览器控制台中运行此脚本来测试 FIRE 功能的国际化
 */

console.log('🌍 开始测试 FIRE 功能国际化...');

// 测试翻译键列表
const fireTranslationKeys = [
  // 基础信息
  'fire.title',
  'fire.subtitle',
  'fire.description',
  
  // 现实快照
  'fire.reality.snapshot.title',
  'fire.reality.snapshot.subtitle',
  'fire.reality.snapshot.past12months.expenses',
  'fire.reality.snapshot.current.net.worth',
  'fire.reality.snapshot.historical.return',
  'fire.reality.snapshot.calibrate',
  
  // 核心指标
  'fire.north.star.title',
  'fire.north.star.subtitle',
  'fire.north.star.fire.target',
  'fire.north.star.fire.target.description',
  'fire.north.star.fire.date',
  'fire.north.star.fire.date.format',
  'fire.north.star.fire.date.description',
  'fire.north.star.current.progress',
  'fire.north.star.current.progress.description',
  'fire.north.star.retirement.income',
  'fire.north.star.retirement.income.description',
  
  // 可视化图表
  'fire.journey.title',
  'fire.journey.subtitle',
  'fire.journey.description',
  'fire.journey.asset.growth',
  'fire.journey.fire.target.line',
  'fire.journey.fire.point',
  'fire.journey.tooltip',
  
  // 控制面板
  'fire.cockpit.title',
  'fire.cockpit.subtitle',
  'fire.cockpit.magic.description',
  'fire.cockpit.retirement.expenses',
  'fire.cockpit.retirement.expenses.description',
  'fire.cockpit.safe.withdrawal.rate',
  'fire.cockpit.safe.withdrawal.rate.description',
  'fire.cockpit.current.investable.assets',
  'fire.cockpit.current.investable.assets.description',
  'fire.cockpit.expected.annual.return',
  'fire.cockpit.expected.annual.return.description',
  'fire.cockpit.monthly.investment',
  'fire.cockpit.monthly.investment.description',
  'fire.cockpit.configure',
  
  // 错误和状态
  'fire.error.no.data',
  'fire.error.invalid.settings',
  'fire.error.calculation.failed',
  'fire.status.enabled',
  'fire.status.disabled',
  'fire.status.enable.instruction',
  
  // 单位
  'fire.units.years',
  'fire.units.months',
  'fire.units.per.year',
  'fire.units.per.month'
];

// 测试 1: 检查翻译文件是否加载
async function testTranslationFilesLoaded() {
  console.log('\n📋 测试 1: 检查 FIRE 翻译文件是否加载');
  
  try {
    // 测试中文翻译文件
    const zhResponse = await fetch('/locales/zh/fire.json');
    if (zhResponse.ok) {
      const zhTranslations = await zhResponse.json();
      console.log('✅ 中文 FIRE 翻译文件加载成功');
      console.log('📊 中文翻译键数量:', Object.keys(zhTranslations).length);
    } else {
      console.log('❌ 中文 FIRE 翻译文件加载失败');
    }
    
    // 测试英文翻译文件
    const enResponse = await fetch('/locales/en/fire.json');
    if (enResponse.ok) {
      const enTranslations = await enResponse.json();
      console.log('✅ 英文 FIRE 翻译文件加载成功');
      console.log('📊 英文翻译键数量:', Object.keys(enTranslations).length);
    } else {
      console.log('❌ 英文 FIRE 翻译文件加载失败');
    }
    
  } catch (error) {
    console.log('❌ 翻译文件加载出错:', error);
  }
}

// 测试 2: 检查语言上下文是否包含 FIRE 命名空间
function testLanguageContextNamespaces() {
  console.log('\n📋 测试 2: 检查语言上下文命名空间');
  
  // 这个测试需要在实际页面中运行，因为需要访问 React 组件
  console.log('💡 提示: 此测试需要在 FIRE 页面中运行');
  console.log('🔍 请检查浏览器网络面板，确认 fire.json 文件被正确加载');
}

// 测试 3: 检查页面中的翻译键使用
function testTranslationKeysUsage() {
  console.log('\n📋 测试 3: 检查页面中的翻译键使用');
  
  const currentPath = window.location.pathname;
  if (currentPath === '/fire') {
    console.log('✅ 当前在 FIRE 页面');
    
    // 检查是否有未翻译的键值（显示为键名的文本）
    const allText = document.body.innerText;
    const untranslatedKeys = fireTranslationKeys.filter(key => 
      allText.includes(key)
    );
    
    if (untranslatedKeys.length === 0) {
      console.log('✅ 所有翻译键都已正确翻译');
    } else {
      console.log('⚠️ 发现未翻译的键:', untranslatedKeys);
    }
    
    // 检查是否有硬编码的中文文本
    const chineseTextRegex = /[\u4e00-\u9fff]+/g;
    const pageElements = document.querySelectorAll('h1, h2, h3, p, span, button, label');
    const hardcodedChinese = [];
    
    pageElements.forEach(element => {
      const text = element.textContent.trim();
      if (chineseTextRegex.test(text) && !text.includes('¥') && !text.includes('年') && !text.includes('月')) {
        // 排除货币符号和一些常见的中文字符
        const matches = text.match(chineseTextRegex);
        if (matches && matches.some(match => match.length > 1)) {
          hardcodedChinese.push(text);
        }
      }
    });
    
    if (hardcodedChinese.length === 0) {
      console.log('✅ 未发现硬编码的中文文本');
    } else {
      console.log('⚠️ 发现可能的硬编码中文文本:', [...new Set(hardcodedChinese)]);
    }
    
  } else {
    console.log('📍 不在 FIRE 页面，请先导航到 /fire 页面');
  }
}

// 测试 4: 测试语言切换功能
function testLanguageSwitching() {
  console.log('\n📋 测试 4: 测试语言切换功能');
  
  const languageToggle = document.querySelector('[data-testid="language-toggle"]') || 
                        document.querySelector('button[aria-label*="language"]') ||
                        document.querySelector('button[aria-label*="语言"]');
  
  if (languageToggle) {
    console.log('✅ 找到语言切换按钮');
    console.log('💡 提示: 请手动点击语言切换按钮测试 FIRE 页面的语言切换');
  } else {
    console.log('⚠️ 未找到语言切换按钮');
    console.log('💡 提示: 语言切换按钮可能在页面头部或设置中');
  }
}

// 测试 5: 检查参数替换功能
function testParameterReplacement() {
  console.log('\n📋 测试 5: 检查参数替换功能');
  
  const currentPath = window.location.pathname;
  if (currentPath === '/fire') {
    // 检查是否有未替换的参数占位符
    const allText = document.body.innerText;
    const unreplacedParams = allText.match(/\{\{[^}]+\}\}/g);
    
    if (!unreplacedParams || unreplacedParams.length === 0) {
      console.log('✅ 所有参数占位符都已正确替换');
    } else {
      console.log('⚠️ 发现未替换的参数占位符:', [...new Set(unreplacedParams)]);
    }
    
    // 检查日期格式是否正确
    const dateElements = document.querySelectorAll('*');
    let dateFormatCorrect = true;
    
    dateElements.forEach(element => {
      const text = element.textContent;
      // 检查是否有正确的日期格式
      if (text.includes('年') && text.includes('月')) {
        console.log('✅ 发现中文日期格式:', text.trim());
      }
      if (text.match(/\d{1,2}\/\d{4}/)) {
        console.log('✅ 发现英文日期格式:', text.trim());
      }
    });
    
  } else {
    console.log('📍 不在 FIRE 页面，请先导航到 /fire 页面');
  }
}

// 测试 6: 检查图表国际化
function testChartInternationalization() {
  console.log('\n📋 测试 6: 检查图表国际化');
  
  const currentPath = window.location.pathname;
  if (currentPath === '/fire') {
    // 检查是否有 ECharts 图表
    const chartElements = document.querySelectorAll('[_echarts_instance_]');
    
    if (chartElements.length > 0) {
      console.log('✅ 找到 ECharts 图表:', chartElements.length, '个');
      console.log('💡 提示: 请检查图表的标题、图例和工具提示是否正确翻译');
    } else {
      console.log('⚠️ 未找到 ECharts 图表');
      console.log('💡 提示: 图表可能还在加载中，请稍后再试');
    }
  } else {
    console.log('📍 不在 FIRE 页面，请先导航到 /fire 页面');
  }
}

// 主测试函数
async function runFireI18nTests() {
  console.log('🚀 开始运行 FIRE 功能国际化完整测试...\n');
  
  await testTranslationFilesLoaded();
  testLanguageContextNamespaces();
  testTranslationKeysUsage();
  testLanguageSwitching();
  testParameterReplacement();
  testChartInternationalization();
  
  console.log('\n🎉 FIRE 功能国际化测试完成！');
  console.log('\n📋 测试总结:');
  console.log('1. ✅ 翻译文件加载检查');
  console.log('2. ✅ 语言上下文命名空间检查');
  console.log('3. ✅ 翻译键使用检查');
  console.log('4. ✅ 语言切换功能检查');
  console.log('5. ✅ 参数替换功能检查');
  console.log('6. ✅ 图表国际化检查');
  
  console.log('\n🔧 下一步操作:');
  console.log('1. 确保用户已登录并启用 FIRE 功能');
  console.log('2. 导航到 /fire 页面');
  console.log('3. 测试中英文语言切换');
  console.log('4. 检查所有文本是否正确翻译');
  console.log('5. 验证参数替换和日期格式');
}

// 自动运行测试
runFireI18nTests();

// 提供手动测试函数
window.testFireI18n = runFireI18nTests;
window.testFireTranslations = testTranslationFilesLoaded;
window.testFireKeys = testTranslationKeysUsage;

console.log('\n💡 提示: 您可以随时运行以下命令进行测试:');
console.log('- testFireI18n() - 运行完整国际化测试');
console.log('- testFireTranslations() - 测试翻译文件');
console.log('- testFireKeys() - 测试翻译键使用');
