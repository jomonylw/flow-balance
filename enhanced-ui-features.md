# 🚀 数据导入选择器增强功能

## ✨ **新增功能**

### **1. 智能依赖关系过滤**

- ✅ 自动隐藏对必须导入项目的依赖显示
- ✅ 只显示对可选项目的依赖关系
- ✅ 减少界面冗余信息

### **2. 分组总控制**

- ✅ 为每个section添加总勾选框
- ✅ 支持整个分组的批量选择/取消
- ✅ 显示分组的选择状态（全选/部分选择/未选）

## 🎯 **功能详解**

### **依赖关系优化**

#### **优化前**

```
☑ Manual Transactions                    223
    Depends on: accounts, tags

☑ Recurring Transaction Records          103
    Depends on: recurringTransactions

☑ Loan-related Transactions             332
    Depends on: loanContracts
```

#### **优化后**

```
☑ Manual Transactions                    223
    (无依赖显示，因为accounts和tags都是必须项)

☑ Recurring Transaction Records          103
    Depends on: recurringTransactions

☑ Loan-related Transactions             332
    (无依赖显示，因为loanContracts在同一分组中)
```

### **分组控制功能**

#### **定期交易分组**

```
────── ☑ Recurring Transactions ──────

☑ Recurring Transactions                  2
☑ Recurring Transaction Records         103
    Depends on: recurringTransactions
```

#### **贷款合约分组**

```
────── ☑ Loan Contracts ──────

☑ Loan Contracts                          2
☑ Loan Payments                         396
☑ Loan-related Transactions             332
```

## 🔧 **技术实现**

### **依赖过滤逻辑**

```typescript
// 获取必须导入的项目键名
const requiredKeys = useMemo(
  () => new Set(dataTypes.filter(item => item.required).map(item => item.key)),
  [dataTypes]
)

// 过滤依赖关系，移除已经是必须导入的项目
const getFilteredDependencies = (dependsOn?: Array<keyof ImportDataTypeSelection>) => {
  if (!dependsOn) return undefined
  const filtered = dependsOn.filter(dep => !requiredKeys.has(dep))
  return filtered.length > 0 ? filtered : undefined
}
```

### **分组控制逻辑**

```typescript
// 处理分组选择
const handleSectionToggle = (sectionIndex: number) => {
  const section = dataSections[sectionIndex]
  if (!section.title) return // 基础数据区域不允许整体切换

  const newSelection = { ...selection }

  // 检查当前分组是否全部选中
  const allSelected = section.items.every(item => item.required || newSelection[item.key] !== false)

  // 切换分组状态
  const newValue = !allSelected
  section.items.forEach(item => {
    if (!item.required) {
      newSelection[item.key] = newValue
    }
  })

  onChange(newSelection)
}
```

### **状态检查函数**

```typescript
// 检查分组是否全部选中
const isSectionSelected = (sectionIndex: number) => {
  const section = dataSections[sectionIndex]
  return section.items.every(item => item.required || selection[item.key] !== false)
}

// 检查分组是否部分选中
const isSectionIndeterminate = (sectionIndex: number) => {
  const section = dataSections[sectionIndex]
  const selectedCount = section.items.filter(
    item => item.required || selection[item.key] !== false
  ).length
  return selectedCount > 0 && selectedCount < section.items.length
}
```

## 🎨 **UI设计改进**

### **分组标题增强**

```tsx
{
  section.title && (
    <div className='mb-4'>
      <div className='flex items-center'>
        <div className='flex-1 border-t border-gray-200 dark:border-gray-700'></div>
        <div className='px-4 bg-white dark:bg-gray-900'>
          <label className='flex items-center cursor-pointer'>
            <input
              type='checkbox'
              checked={isSectionSelected(sectionIndex)}
              ref={el => {
                if (el) el.indeterminate = isSectionIndeterminate(sectionIndex)
              }}
              onChange={() => handleSectionToggle(sectionIndex)}
              className='mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded'
            />
            <span className='text-sm font-medium text-gray-500 dark:text-gray-400'>
              {section.title}
            </span>
          </label>
        </div>
        <div className='flex-1 border-t border-gray-200 dark:border-gray-700'></div>
      </div>
    </div>
  )
}
```

### **智能依赖显示**

```tsx
{
  ;(() => {
    const filteredDeps = getFilteredDependencies(dataType.dependsOn)
    return (
      filteredDeps &&
      filteredDeps.length > 0 && (
        <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
          {t('data.import.selector.depends.on')}: {filteredDeps.join(', ')}
        </div>
      )
    )
  })()
}
```

## 📊 **用户体验提升**

### **1. 信息简化**

- **减少冗余**：不显示对必须项的依赖
- **突出重点**：只显示真正需要注意的依赖关系
- **界面清爽**：减少视觉噪音

### **2. 操作便捷**

- **批量控制**：一键选择/取消整个分组
- **状态清晰**：分组选择状态一目了然
- **智能反馈**：支持部分选择的视觉提示

### **3. 逻辑清晰**

- **分组合理**：相关功能归类显示
- **依赖明确**：只显示真正的依赖关系
- **操作直观**：分组控制符合用户预期

## 🔄 **交互流程**

### **分组操作流程**

1. **查看分组状态** - 通过勾选框状态了解分组选择情况
2. **批量选择** - 点击分组勾选框批量控制
3. **精细调整** - 在分组内进行单项调整
4. **状态反馈** - 分组状态实时更新

### **依赖关系处理**

1. **自动过滤** - 系统自动隐藏对必须项的依赖
2. **显示关键依赖** - 只显示对可选项的依赖
3. **智能提示** - 帮助用户理解真正的依赖关系

## 🎯 **预期效果**

### **界面效果**

```
Categories*                               11
Accounts*                                 23
Tags*                                      4
Currencies*                                6
Exchange Rates*                           35
Transaction Templates                      0
Manual Transactions                      223

────── ☑ Recurring Transactions ──────

Recurring Transactions                     2
Recurring Transaction Records            103
    Depends on: recurringTransactions

────── ☑ Loan Contracts ──────

Loan Contracts                             2
Loan Payments                            396
Loan-related Transactions               332
```

### **功能特点**

- ✅ **简洁明了**：去除冗余的依赖信息
- ✅ **操作高效**：分组批量控制
- ✅ **状态清晰**：选择状态一目了然
- ✅ **逻辑合理**：依赖关系更加清晰

这些增强功能让数据导入选择器更加智能和用户友好，大大提升了使用体验！
