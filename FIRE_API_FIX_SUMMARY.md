# FIRE API 修复总结

## 问题分析

通过检查 `/api/fire/data` 和 `/api/dashboard/summary` 的代码，发现了以下关键问题：

### 1. currentNetWorth: -440072.84 的问题

**原始问题：**

- 错误的条件逻辑：`AccountType.ASSET || AccountType.LIABILITY ? 'BALANCE' : undefined` 总是返回
  `AccountType.ASSET`
- 只有资产账户筛选 `BALANCE` 类型交易，负债账户获取所有交易类型
- 没有汇率转换，直接累加不同币种金额
- 没有日期限制，可能包含未来交易

**修复方案：**

- 使用与 Dashboard 相同的 `calculateTotalBalanceWithConversion` 函数
- 正确分离资产和负债账户
- 添加汇率转换支持
- 添加 `asOfDate` 参数确保不包含未来交易

### 2. historicalAnnualReturn: 7.6 的问题

**原始问题：**

- 硬编码的默认值，没有实际计算

**修复方案：**

- 基于一年前和当前的净资产变化计算
- 考虑期间的净投入（收入 - 支出）
- 计算调整后的投资回报率
- 限制在合理范围内（-50% 到 100%）

### 3. past12MonthsExpenses: 1998 的问题

**原始问题：**

- 汇率转换逻辑不完善（注释显示"暂时使用1:1"）

**修复方案：**

- 使用 `convertMultipleCurrencies` 函数进行汇率转换
- 添加错误处理，转换失败时使用相同币种的金额

## 修复内容

### 1. 导入必要的服务函数

```typescript
import { calculateTotalBalanceWithConversion } from '@/lib/services/account.service'
import { convertMultipleCurrencies } from '@/lib/services/currency.service'
```

### 2. 修复净资产计算

- 使用与 Dashboard 相同的账户数据格式转换
- 分别计算资产和负债的本位币总额
- 使用 `calculateTotalBalanceWithConversion` 确保汇率转换正确

### 3. 实现真实的历史回报率计算

- 计算一年前的净资产
- 计算期间的净投入（收入 - 支出）
- 使用公式：`(当前净资产 - 过去净资产 - 净投入) / 过去净资产 * 100`
- 添加合理性检查和错误处理

### 4. 改进支出和收入计算

- 所有金额计算都使用汇率转换
- 添加完善的错误处理
- 确保日期范围正确

### 5. 统一月度净投资计算

- 分别获取收入和支出交易
- 使用汇率转换确保币种一致
- 计算6个月平均值

## 预期效果

修复后，`/api/fire/data` 应该：

1. **净资产计算与 Dashboard 一致**：使用相同的计算逻辑和汇率转换
2. **历史回报率动态计算**：基于实际净资产变化，不再是硬编码值
3. **支出计算准确**：正确处理多币种汇率转换
4. **月度投资计算准确**：基于实际收支数据计算

## 验证方法

1. 在浏览器控制台运行 `test-fire-api-fix.js` 脚本
2. 对比 `/api/fire/data` 和 `/api/dashboard/summary` 的净资产值
3. 检查历史回报率是否不再是固定的 7.6%
4. 验证多币种环境下的汇率转换是否正确

## 注意事项

- 历史回报率计算需要至少一年的历史数据才能准确
- 如果没有足够的历史数据，会保持默认值 7.6%
- 汇率转换失败时会使用原始金额作为近似值（仅限相同币种）
- 所有计算都添加了错误处理，确保 API 稳定性
