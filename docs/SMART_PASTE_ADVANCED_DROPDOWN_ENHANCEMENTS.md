# SmartPaste弹出菜单高级增强

## 🎯 优化概述

基于用户反馈，对SmartPasteCell的弹出菜单进行了两项重要的高级优化：

1. ✅ **账户弹出菜单分组显示** - 按账户类型分成收入/支出/资产/负债四个section
2. ✅ **日期输入日历样式提取** - 提取DateInput的日历样式，保持cell输入方式

## 🔧 详细实现

### 1. 账户弹出菜单分组显示

#### 问题分析

原来的账户选择器将所有账户混合显示，用户难以快速找到目标账户类型，特别是当账户数量较多时。

#### 解决方案：按类型分组

```typescript
// 按账户类型分组逻辑
const groupedAccounts = column.options.reduce(
  (groups, option) => {
    try {
      const accountData = option.data as { category?: { type?: string } }
      const accountType = accountData?.category?.type || 'OTHER'

      if (!groups[accountType]) {
        groups[accountType] = []
      }
      groups[accountType].push(option)
    } catch {
      if (!groups['OTHER']) {
        groups['OTHER'] = []
      }
      groups['OTHER'].push(option)
    }
    return groups
  },
  {} as Record<string, typeof column.options>
)
```

#### 分组显示顺序和样式

```typescript
// 定义显示顺序和标题
const sectionOrder = [
  {
    key: 'INCOME',
    title: t('account.type.income.category'),
    color: 'text-green-600 dark:text-green-400',
  },
  {
    key: 'EXPENSE',
    title: t('account.type.expense.category'),
    color: 'text-orange-600 dark:text-orange-400',
  },
  {
    key: 'ASSET',
    title: t('account.type.asset.category'),
    color: 'text-blue-600 dark:text-blue-400',
  },
  {
    key: 'LIABILITY',
    title: t('account.type.liability.category'),
    color: 'text-red-600 dark:text-red-400',
  },
  { key: 'OTHER', title: t('common.other'), color: 'text-gray-600 dark:text-gray-400' },
]
```

#### 分组渲染结构

```typescript
return sectionOrder.map(section => {
  const accounts = groupedAccounts[section.key]
  if (!accounts || accounts.length === 0) return null

  return (
    <div key={section.key} className="mb-3 last:mb-0">
      {/* 分组标题 */}
      <div className={`text-xs font-medium px-2 py-1 ${section.color} border-b border-gray-200 dark:border-gray-600`}>
        {section.title}
      </div>
      {/* 账户列表 */}
      <div className="mt-1">
        {accounts.map(option => (
          <button key={String(option.value)} /* ... 账户按钮 */>
            <span className="truncate">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
})
```

**效果展示**:

```
┌─────────────────────────────────┐
│ 收入类                          │
├─────────────────────────────────┤
│ 工资收入                        │
│ 投资收益                        │
│ 其他收入                        │
├─────────────────────────────────┤
│ 支出类                          │
├─────────────────────────────────┤
│ 日常开支                        │
│ 交通费用                        │
│ 娱乐消费                        │
├─────────────────────────────────┤
│ 资产类                          │
├─────────────────────────────────┤
│ 银行存款                        │
│ 投资账户                        │
└─────────────────────────────────┘
```

### 2. 日期输入日历样式提取

#### 问题理解

用户希望保持原有的cell输入方式，但点击时弹出的日历要使用DateInput组件的样式，而不是整个DateInput组件。

#### 解决方案：提取日历核心代码

##### 导入必要的date-fns函数

```typescript
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  format,
  parse,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
```

##### 添加日历状态

```typescript
const [currentMonth, setCurrentMonth] = useState(new Date())
```

##### 提取DateInput的日历渲染逻辑

```typescript
{(() => {
  // 解析当前值
  const currentValue = value ? String(value) : ''
  let selectedDate: Date | null = null
  try {
    if (currentValue) {
      selectedDate = parse(currentValue, 'yyyy-MM-dd', new Date())
      if (isNaN(selectedDate.getTime())) {
        selectedDate = null
      }
    }
  } catch {
    selectedDate = null
  }

  // 如果有选中日期，设置当前月份
  if (selectedDate && currentMonth.getMonth() !== selectedDate.getMonth()) {
    setCurrentMonth(selectedDate)
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // 获取月份第一天是星期几，调整为周一开始
  const firstDayOfWeek = (monthStart.getDay() + 6) % 7
  const emptyDays = Array(firstDayOfWeek).fill(null)

  const weekDays = t('common.language') === 'zh'
    ? ['一', '二', '三', '四', '五', '六', '日']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const formatMonthYear = (date: Date) => {
    return t('common.language') === 'zh'
      ? format(date, 'yyyy年M月')
      : format(date, 'MMM yyyy')
  }

  const handleDateSelect = (day: Date) => {
    const formattedDate = format(day, 'yyyy-MM-dd')
    onChange(formattedDate)
    setShowDatePicker(false)
    setDropdownPosition(null)
  }

  return (
    <div className="p-3">
      {/* 月份导航 */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
        </button>

        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {formatMonthYear(currentMonth)}
        </div>

        <button
          type="button"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-xs text-center text-gray-500 dark:text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1">
        {/* 空白天数 */}
        {emptyDays.map((_, index) => (
          <div key={`empty-${index}`} className="h-7" />
        ))}

        {/* 日期按钮 */}
        {calendarDays.map(day => {
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          const isToday = isSameDay(day, new Date())
          const isCurrentMonth = isSameMonth(day, currentMonth)

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleDateSelect(day)}
              disabled={!isCurrentMonth}
              className={`
                h-7 text-xs rounded transition-colors flex items-center justify-center
                ${isSelected
                  ? 'bg-blue-500 text-white'
                  : isToday
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : isCurrentMonth
                      ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                      : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                }
              `}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
})()}
```

#### 关键特性

1. **完全一致的样式**: 与DateInput组件的日历部分完全相同
2. **智能月份同步**: 根据当前值自动设置显示月份
3. **国际化支持**: 支持中英文星期显示和月份格式
4. **交互体验**: 选择日期后自动关闭并更新值
5. **主题适配**: 完美支持明暗主题切换

## 📊 用户体验提升

### 修复前的体验

```
账户选择：
❌ 所有账户混合显示
❌ 难以快速找到目标类型
❌ 账户多时查找困难

日期输入：
❌ 使用完整DateInput组件
❌ 与cell输入方式不一致
❌ 界面元素冗余
```

### 修复后的体验

```
账户选择：
✅ 按类型清晰分组显示
✅ 收入/支出/资产/负债分类明确
✅ 快速定位目标账户

日期输入：
✅ 保持cell输入方式
✅ 弹出纯净的日历界面
✅ 与DateInput样式完全一致
```

## 🎯 技术特性

### 1. 账户分组算法

#### 动态分组逻辑

```typescript
// 容错性强的分组算法
const groupedAccounts = column.options.reduce(
  (groups, option) => {
    try {
      const accountData = option.data as { category?: { type?: string } }
      const accountType = accountData?.category?.type || 'OTHER'

      if (!groups[accountType]) {
        groups[accountType] = []
      }
      groups[accountType].push(option)
    } catch {
      // 异常情况归入OTHER组
      if (!groups['OTHER']) {
        groups['OTHER'] = []
      }
      groups['OTHER'].push(option)
    }
    return groups
  },
  {} as Record<string, typeof column.options>
)
```

#### 有序渲染

```typescript
// 按业务逻辑定义显示顺序
const sectionOrder = [
  { key: 'INCOME', title: '收入类', color: 'text-green-600' },
  { key: 'EXPENSE', title: '支出类', color: 'text-orange-600' },
  { key: 'ASSET', title: '资产类', color: 'text-blue-600' },
  { key: 'LIABILITY', title: '负债类', color: 'text-red-600' },
  { key: 'OTHER', title: '其他', color: 'text-gray-600' },
]
```

### 2. 日历组件提取

#### 状态管理

```typescript
// 最小化状态管理
const [currentMonth, setCurrentMonth] = useState(new Date())

// 智能月份同步
if (selectedDate && currentMonth.getMonth() !== selectedDate.getMonth()) {
  setCurrentMonth(selectedDate)
}
```

#### 日期处理

```typescript
// 安全的日期解析
let selectedDate: Date | null = null
try {
  if (currentValue) {
    selectedDate = parse(currentValue, 'yyyy-MM-dd', new Date())
    if (isNaN(selectedDate.getTime())) {
      selectedDate = null
    }
  }
} catch {
  selectedDate = null
}
```

#### 国际化处理

```typescript
// 动态语言支持
const weekDays =
  t('common.language') === 'zh'
    ? ['一', '二', '三', '四', '五', '六', '日']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const formatMonthYear = (date: Date) => {
  return t('common.language') === 'zh' ? format(date, 'yyyy年M月') : format(date, 'MMM yyyy')
}
```

## 🔄 适用场景

### 1. 多账户环境下的快速选择

```
场景：用户有20+个账户
体验：
- 收入类：工资、奖金、投资收益等
- 支出类：生活费、交通费、娱乐等
- 资产类：银行存款、投资账户等
- 负债类：信用卡、贷款等

优势：
- 按类型快速定位 ✅
- 减少查找时间 ✅
- 提高录入效率 ✅
```

### 2. 日期密集录入场景

```
场景：批量录入历史交易数据
体验：
- 点击日期cell → 打开日历
- 可视化选择日期 → 避免格式错误
- 月份导航 → 快速跳转到目标月份
- 选择后自动关闭 → 继续下一个cell

优势：
- 保持cell输入一致性 ✅
- 提供可视化日期选择 ✅
- 减少日期格式错误 ✅
```

## 🛡️ 技术细节

### 1. 性能优化

#### 分组计算缓存

```typescript
// 使用reduce一次性完成分组，避免多次遍历
const groupedAccounts = column.options.reduce(
  (groups, option) => {
    // 分组逻辑
  },
  {} as Record<string, typeof column.options>
)
```

#### 条件渲染优化

```typescript
// 只渲染有账户的分组
return sectionOrder.map(section => {
  const accounts = groupedAccounts[section.key]
  if (!accounts || accounts.length === 0) return null
  // 渲染分组
})
```

### 2. 错误处理

#### 数据容错

```typescript
try {
  const accountData = option.data as { category?: { type?: string } }
  const accountType = accountData?.category?.type || 'OTHER'
  // 正常处理
} catch {
  // 异常数据归入OTHER组
  if (!groups['OTHER']) {
    groups['OTHER'] = []
  }
  groups['OTHER'].push(option)
}
```

#### 日期解析容错

```typescript
try {
  if (currentValue) {
    selectedDate = parse(currentValue, 'yyyy-MM-dd', new Date())
    if (isNaN(selectedDate.getTime())) {
      selectedDate = null
    }
  }
} catch {
  selectedDate = null
}
```

### 3. 样式一致性

#### 颜色系统

```typescript
// 与账户类型配置保持一致的颜色
const typeColors = {
  INCOME: 'text-green-600 dark:text-green-400',
  EXPENSE: 'text-orange-600 dark:text-orange-400',
  ASSET: 'text-blue-600 dark:text-blue-400',
  LIABILITY: 'text-red-600 dark:text-red-400',
}
```

#### 布局统一

```typescript
// 与DateInput完全一致的布局和样式
className = 'grid grid-cols-7 gap-1'
className = 'h-7 text-xs rounded transition-colors flex items-center justify-center'
```

## 🎉 最终效果

### 技术成果

1. **分组显示**: 账户按类型清晰分组，提高选择效率
2. **样式提取**: 成功提取DateInput日历样式，保持一致性
3. **性能优化**: 高效的分组算法和条件渲染
4. **错误处理**: 完善的容错机制，确保稳定性

### 用户体验成果

1. **快速定位**: 按类型分组让用户快速找到目标账户
2. **视觉清晰**: 不同类型用不同颜色区分，一目了然
3. **操作一致**: 日期输入保持cell方式，但提供可视化选择
4. **界面简洁**: 纯净的日历界面，无冗余元素

### 业务价值

1. **效率提升**: 分组显示显著提高账户选择效率
2. **错误减少**: 可视化日期选择减少格式错误
3. **用户满意**: 更加直观和高效的操作体验
4. **可维护性**: 清晰的代码结构，易于扩展

这些高级优化让SmartPaste的弹出菜单功能更加专业和用户友好，真正实现了"简便快速录入"的设计目标，为用户提供了企业级的数据录入体验。
