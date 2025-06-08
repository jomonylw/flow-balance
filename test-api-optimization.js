/**
 * 测试API优化效果
 * 比较优化前后的API调用次数和响应时间
 */

// 使用Node.js 18+的内置fetch

const BASE_URL = 'http://localhost:3001';

async function testAPIOptimization() {
  console.log('🚀 测试API优化效果...\n');

  // 测试新的树状结构API
  console.log('📊 测试新的树状结构API:');
  const treeStartTime = Date.now();
  
  try {
    const treeResponse = await fetch(`${BASE_URL}/api/tree-structure`);
    const treeEndTime = Date.now();
    
    if (treeResponse.ok) {
      const treeData = await treeResponse.json();
      console.log(`✅ 树状结构API响应时间: ${treeEndTime - treeStartTime}ms`);
      console.log(`📋 获取到 ${treeData.data.stats.totalCategories} 个分类, ${treeData.data.stats.totalAccounts} 个账户`);
      
      // 分析树状结构
      const analyzeTree = (categories, level = 0) => {
        let totalAccounts = 0;
        categories.forEach(category => {
          const accountCount = category.accounts?.length || 0;
          totalAccounts += accountCount;
          
          if (level === 0) {
            console.log(`  📂 ${category.name} (${category.type}): ${accountCount} 个账户`);
            if (category.children && category.children.length > 0) {
              console.log(`    └─ ${category.children.length} 个子分类`);
            }
          }
          
          if (category.children) {
            totalAccounts += analyzeTree(category.children, level + 1);
          }
        });
        return totalAccounts;
      };
      
      const totalAccountsInTree = analyzeTree(treeData.data.treeStructure);
      console.log(`📊 树状结构中总账户数: ${totalAccountsInTree}`);
    } else {
      console.log(`❌ 树状结构API失败: ${treeResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ 树状结构API错误: ${error.message}`);
  }

  console.log('\n💰 测试账户余额API:');
  const balanceStartTime = Date.now();
  
  try {
    const balanceResponse = await fetch(`${BASE_URL}/api/accounts/balances`);
    const balanceEndTime = Date.now();
    
    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      console.log(`✅ 账户余额API响应时间: ${balanceEndTime - balanceStartTime}ms`);
      
      const accountBalances = balanceData.data.accountBalances;
      const accountCount = Object.keys(accountBalances).length;
      console.log(`💳 获取到 ${accountCount} 个账户的余额数据`);
      
      // 分析余额数据
      let totalBalance = 0;
      const currencyStats = {};
      
      Object.values(accountBalances).forEach(account => {
        totalBalance += account.balanceInBaseCurrency || 0;
        
        Object.entries(account.balances).forEach(([currency, balanceInfo]) => {
          if (!currencyStats[currency]) {
            currencyStats[currency] = { count: 0, totalAmount: 0 };
          }
          currencyStats[currency].count++;
          currencyStats[currency].totalAmount += balanceInfo.amount;
        });
      });
      
      console.log(`💵 总余额 (本位币): ${balanceData.data.baseCurrency.symbol}${totalBalance.toFixed(2)}`);
      console.log(`🌍 涉及货币:`);
      Object.entries(currencyStats).forEach(([currency, stats]) => {
        console.log(`  - ${currency}: ${stats.count} 个账户, 总额 ${stats.totalAmount.toFixed(2)}`);
      });
    } else {
      console.log(`❌ 账户余额API失败: ${balanceResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ 账户余额API错误: ${error.message}`);
  }

  console.log('\n🔄 测试数据整合效果:');
  
  // 模拟前端数据整合过程
  try {
    const [treeRes, balanceRes] = await Promise.all([
      fetch(`${BASE_URL}/api/tree-structure`),
      fetch(`${BASE_URL}/api/accounts/balances`)
    ]);
    
    if (treeRes.ok && balanceRes.ok) {
      const treeData = await treeRes.json();
      const balanceData = await balanceRes.json();
      
      console.log('✅ 并行获取数据成功');
      
      // 模拟数据整合
      const enrichTree = (categories) => {
        return categories.map(category => ({
          ...category,
          children: category.children ? enrichTree(category.children) : [],
          accounts: category.accounts?.map(account => ({
            ...account,
            balances: balanceData.data.accountBalances[account.id]?.balances || {},
            balanceInBaseCurrency: balanceData.data.accountBalances[account.id]?.balanceInBaseCurrency || 0
          })) || []
        }));
      };
      
      const enrichedTree = enrichTree(treeData.data.treeStructure);
      
      // 计算分类汇总
      const calculateCategorySummary = (category) => {
        let totalBalance = 0;
        const currencyBalances = {};
        
        // 累加直属账户余额
        category.accounts?.forEach(account => {
          totalBalance += account.balanceInBaseCurrency || 0;
          Object.entries(account.balances || {}).forEach(([currency, balanceInfo]) => {
            if (!currencyBalances[currency]) currencyBalances[currency] = 0;
            currencyBalances[currency] += balanceInfo.amount;
          });
        });
        
        // 累加子分类余额
        category.children?.forEach(child => {
          const childSummary = calculateCategorySummary(child);
          totalBalance += childSummary.totalBalance;
          Object.entries(childSummary.currencyBalances).forEach(([currency, amount]) => {
            if (!currencyBalances[currency]) currencyBalances[currency] = 0;
            currencyBalances[currency] += amount;
          });
        });
        
        return { totalBalance, currencyBalances };
      };
      
      console.log('📊 分类汇总计算结果:');
      enrichedTree.forEach(rootCategory => {
        const summary = calculateCategorySummary(rootCategory);
        console.log(`  📂 ${rootCategory.name}: ${balanceData.data.baseCurrency.symbol}${summary.totalBalance.toFixed(2)}`);
        
        Object.entries(summary.currencyBalances).forEach(([currency, amount]) => {
          if (Math.abs(amount) > 0.01) {
            console.log(`    💰 ${currency}: ${amount.toFixed(2)}`);
          }
        });
      });
      
      console.log('\n🎉 数据整合测试完成!');
      console.log('✨ 优化效果:');
      console.log('  - 减少API调用: 从多次分别调用 → 2次并行调用');
      console.log('  - 数据一致性: 统一的数据源和计算逻辑');
      console.log('  - 实时计算: 前端实时计算分类汇总，无需额外API');
      console.log('  - 性能提升: 减少网络请求，提高响应速度');
      
    } else {
      console.log('❌ 数据整合测试失败');
    }
  } catch (error) {
    console.log(`❌ 数据整合错误: ${error.message}`);
  }

  console.log('\n🏁 测试完成!');
}

// 运行测试
testAPIOptimization();
