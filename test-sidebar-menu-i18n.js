// 测试左侧侧边栏弹出菜单国际化的脚本
// 在浏览器控制台中运行此脚本

function testSidebarMenuInternationalization() {
  console.log('🔍 开始测试左侧侧边栏弹出菜单国际化...');
  
  // 检查当前语言设置
  const currentLang = localStorage.getItem('language') || 'zh';
  console.log(`📍 当前语言设置: ${currentLang}`);
  
  // 查找语言切换按钮
  const languageToggle = document.querySelector('[data-testid="language-toggle"]') || 
                        document.querySelector('button[title*="Switch"]') ||
                        document.querySelector('button[title*="切换"]');
  
  if (!languageToggle) {
    console.log('❌ 未找到语言切换按钮');
    return;
  }
  
  console.log('✅ 找到语言切换按钮');
  
  // 查找侧边栏中的分类或账户项
  const categoryItems = document.querySelectorAll('[data-category-id]');
  const accountItems = document.querySelectorAll('[data-account-id]');
  
  console.log(`📊 找到 ${categoryItems.length} 个分类项和 ${accountItems.length} 个账户项`);
  
  if (categoryItems.length === 0 && accountItems.length === 0) {
    console.log('❌ 未找到可测试的分类或账户项');
    return;
  }
  
  // 测试函数：检查弹出菜单的国际化
  function testContextMenu(element, type) {
    return new Promise((resolve) => {
      console.log(`🎯 测试 ${type} 弹出菜单...`);
      
      // 右键点击触发上下文菜单
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: element.getBoundingClientRect().left + 10,
        clientY: element.getBoundingClientRect().top + 10
      });
      
      element.dispatchEvent(event);
      
      // 等待菜单出现
      setTimeout(() => {
        const contextMenu = document.querySelector('[role="menu"]') || 
                           document.querySelector('.context-menu') ||
                           document.querySelector('[data-testid="context-menu"]');
        
        if (contextMenu) {
          console.log('✅ 弹出菜单已显示');
          
          // 检查菜单项文本
          const menuItems = contextMenu.querySelectorAll('button, [role="menuitem"]');
          const menuTexts = Array.from(menuItems).map(item => item.textContent?.trim()).filter(Boolean);
          
          console.log('📋 菜单项文本:', menuTexts);
          
          // 检查是否有硬编码的中文（当语言为英文时）
          if (currentLang === 'en') {
            const chineseRegex = /[\u4e00-\u9fff]/;
            const hardcodedChinese = menuTexts.filter(text => chineseRegex.test(text));
            
            if (hardcodedChinese.length > 0) {
              console.log('⚠️ 发现硬编码中文文本:', hardcodedChinese);
            } else {
              console.log('✅ 未发现硬编码中文文本');
            }
          }
          
          // 关闭菜单
          document.addEventListener('click', () => {}, { once: true });
          document.body.click();
          
        } else {
          console.log('❌ 弹出菜单未显示');
        }
        
        resolve();
      }, 500);
    });
  }
  
  // 测试分类菜单
  async function testCategoryMenus() {
    if (categoryItems.length > 0) {
      console.log('🔄 开始测试分类弹出菜单...');
      for (let i = 0; i < Math.min(3, categoryItems.length); i++) {
        await testContextMenu(categoryItems[i], '分类');
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
      }
    }
  }
  
  // 测试账户菜单
  async function testAccountMenus() {
    if (accountItems.length > 0) {
      console.log('🔄 开始测试账户弹出菜单...');
      for (let i = 0; i < Math.min(3, accountItems.length); i++) {
        await testContextMenu(accountItems[i], '账户');
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
      }
    }
  }
  
  // 语言切换测试
  async function testLanguageSwitch() {
    console.log('🔄 测试语言切换...');
    
    const originalLang = currentLang;
    const targetLang = currentLang === 'zh' ? 'en' : 'zh';
    
    console.log(`🔄 切换语言从 ${originalLang} 到 ${targetLang}`);
    
    // 点击语言切换按钮
    languageToggle.click();
    
    // 等待语言切换完成
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 检查语言是否已切换
    const newLang = localStorage.getItem('language');
    if (newLang === targetLang) {
      console.log(`✅ 语言已成功切换到 ${targetLang}`);
      
      // 再次测试菜单
      if (categoryItems.length > 0) {
        await testContextMenu(categoryItems[0], '分类');
      }
      if (accountItems.length > 0) {
        await testContextMenu(accountItems[0], '账户');
      }
      
      // 切换回原语言
      languageToggle.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`🔄 已切换回原语言 ${originalLang}`);
      
    } else {
      console.log('❌ 语言切换失败');
    }
  }
  
  // 执行测试
  async function runTests() {
    await testCategoryMenus();
    await testAccountMenus();
    await testLanguageSwitch();
    console.log('🎉 测试完成！');
  }
  
  runTests().catch(console.error);
}

// 运行测试
testSidebarMenuInternationalization();
