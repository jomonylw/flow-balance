# Calendar组件提取与复用

## 🎯 目标实现

成功将DateInput中的日历功能提取为独立的Calendar组件，实现了代码复用和功能增强：

1. ✅ **独立Calendar组件** - 从DateInput中提取完整的日历功能
2. ✅ **功能增强** - 支持年/月/日三级选择，日期范围限制
3. ✅ **代码复用** - DateInput和SmartPasteCell共用同一个Calendar组件
4. ✅ **接口统一** - 提供一致的API接口，便于集成

## 🔧 技术实现

### 1. Calendar组件设计

#### 组件接口定义

```typescript
interface CalendarProps {
  value?: string // 当前选中的日期值 (yyyy-MM-dd格式)
  onChange: (value: string) => void // 日期变化回调
  className?: string // 自定义样式类
  minDate?: Date // 最小可选日期
  maxDate?: Date // 最大可选日期
  showYearMonthSelector?: boolean // 是否显示年月选择器
}
```

#### 核心功能特性

##### 1. 三级视图切换

```typescript
const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days')

// 日期视图 → 月份视图 → 年份视图
// 点击月年标题可以切换到上级视图
// 选择后自动返回到下级视图
```

##### 2. 智能日期解析

```typescript
// 安全的日期解析逻辑
let selectedDate: Date | null = null
try {
  if (value) {
    selectedDate = parse(value, 'yyyy-MM-dd', new Date())
    if (isNaN(selectedDate.getTime())) {
      selectedDate = null
    }
  }
} catch {
  selectedDate = null
}
```

##### 3. 日期范围限制

```typescript
const handleDateSelect = (day: Date) => {
  // 检查日期限制
  if (minDate && day < minDate) return
  if (maxDate && day > maxDate) return

  const formattedDate = format(day, 'yyyy-MM-dd')
  onChange(formattedDate)
}
```

##### 4. 国际化支持

```typescript
const weekDays =
  t('common.language') === 'zh'
    ? ['一', '二', '三', '四', '五', '六', '日']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const formatMonthYear = (date: Date) => {
  return t('common.language') === 'zh' ? format(date, 'yyyy年M月') : format(date, 'MMM yyyy')
}
```

### 2. DateInput组件重构

#### 简化日历渲染

```typescript
// 修改前：复杂的自定义日历实现
const renderCalendar = () => {
  return (
    <div className="...">
      {calendarView === 'year' && renderYearSelector()}
      {calendarView === 'month' && renderMonthSelector()}
      {calendarView === 'date' && renderDateSelector()}
    </div>
  )
}

// 修改后：使用Calendar组件
const renderCalendar = () => {
  if (!isCalendarOpen) return null

  const handleCalendarChange = (newValue: string) => {
    // 创建一个模拟的ChangeEvent
    const event = {
      target: { name, value: newValue }
    } as React.ChangeEvent<HTMLInputElement>

    onChange(event)
    setIsCalendarOpen(false)
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg w-[280px] max-h-[320px] overflow-hidden" style={positionStyle}>
      <Calendar
        value={value}
        onChange={handleCalendarChange}
        showYearMonthSelector={true}
      />
    </div>
  )
}
```

#### 接口适配处理

```typescript
// DateInput使用React.ChangeEvent接口
onChange: (e: React.ChangeEvent<HTMLInputElement>) => void

// Calendar使用简单的字符串接口
onChange: (value: string) => void

// 适配层：将Calendar的回调转换为DateInput期望的格式
const handleCalendarChange = (newValue: string) => {
  const event = {
    target: { name, value: newValue }
  } as React.ChangeEvent<HTMLInputElement>

  onChange(event)
  setIsCalendarOpen(false)
}
```

### 3. SmartPasteCell组件集成

#### 简化实现

```typescript
// 修改前：复杂的内联日历实现（95行代码）
{(() => {
  // 解析当前值
  const currentValue = value ? String(value) : ''
  let selectedDate: Date | null = null
  // ... 大量日历逻辑代码
  return (
    <div className="p-3">
      {/* 月份导航 */}
      {/* 星期标题 */}
      {/* 日期网格 */}
    </div>
  )
})()}

// 修改后：使用Calendar组件（8行代码）
<Calendar
  value={value ? String(value) : ''}
  onChange={(newValue) => {
    onChange(newValue)
    setShowDatePicker(false)
    setDropdownPosition(null)
  }}
  showYearMonthSelector={true}
/>
```

#### 代码减少对比

- **修改前**: 95行复杂的日历实现代码
- **修改后**: 8行简洁的组件调用
- **代码减少**: 87行，减少91.6%的代码量

## 📊 功能对比

### Calendar组件功能特性

| 功能特性     | DateInput原版 | 新Calendar组件 | SmartPasteCell |
| ------------ | ------------- | -------------- | -------------- |
| 日期选择     | ✅            | ✅             | ✅             |
| 月份导航     | ✅            | ✅             | ✅             |
| 年份选择     | ✅            | ✅             | ✅             |
| 月份选择     | ✅            | ✅             | ✅             |
| 快速年份跳转 | ❌            | ✅             | ✅             |
| 日期范围限制 | ❌            | ✅             | ✅             |
| 今日高亮     | ✅            | ✅             | ✅             |
| 选中日期高亮 | ✅            | ✅             | ✅             |
| 国际化支持   | ✅            | ✅             | ✅             |
| 主题适配     | ✅            | ✅             | ✅             |
| 键盘导航     | ❌            | 可扩展         | 可扩展         |

### 新增功能

#### 1. 快速年份跳转

```typescript
// 年份视图：显示10年范围，可快速跳转
const renderYearsView = () => {
  const currentYear = getYear(currentMonth)
  const startYear = Math.floor(currentYear / 10) * 10
  const years = Array.from({ length: 12 }, (_, i) => startYear + i - 1)

  return (
    <div className="grid grid-cols-3 gap-2">
      {years.map(year => (
        <button key={year} onClick={() => selectYear(year)}>
          {year}
        </button>
      ))}
    </div>
  )
}
```

#### 2. 日期范围限制

```typescript
// 支持最小/最大日期限制
<Calendar
  value="2024-01-15"
  onChange={handleChange}
  minDate={new Date('2024-01-01')}
  maxDate={new Date('2024-12-31')}
/>
```

#### 3. 可配置的年月选择器

```typescript
// 可以禁用年月选择器，只显示基本的月份导航
<Calendar
  value="2024-01-15"
  onChange={handleChange}
  showYearMonthSelector={false}  // 禁用年月选择器
/>
```

## 🎯 使用场景

### 1. DateInput组件中的日历弹出

```typescript
// 完整的表单日期输入
<DateInput
  name="date"
  label="选择日期"
  value={formData.date}
  onChange={handleDateChange}
  showCalendar={true}
/>
```

### 2. SmartPasteCell中的日期选择

```typescript
// 表格单元格中的日期选择
{showDatePicker && (
  <Portal>
    <Calendar
      value={cellValue}
      onChange={handleCellDateChange}
      showYearMonthSelector={true}
    />
  </Portal>
)}
```

### 3. 独立的日期选择器

```typescript
// 可以在任何地方使用的独立日期选择器
<Calendar
  value={selectedDate}
  onChange={setSelectedDate}
  minDate={new Date()}  // 只能选择今天及以后的日期
  className="border rounded-lg"
/>
```

### 4. 日期范围选择器（可扩展）

```typescript
// 未来可以扩展为日期范围选择器
<Calendar
  value={startDate}
  onChange={setStartDate}
  maxDate={endDate}  // 开始日期不能超过结束日期
/>
<Calendar
  value={endDate}
  onChange={setEndDate}
  minDate={startDate}  // 结束日期不能早于开始日期
/>
```

## 🛡️ 技术优势

### 1. 代码复用

- **单一职责**: Calendar组件专注于日期选择功能
- **接口统一**: 提供一致的API，便于在不同场景中使用
- **维护简单**: 日历相关的bug修复和功能增强只需要在一个地方进行

### 2. 功能增强

- **更丰富的功能**: 支持年份快速跳转、日期范围限制等高级功能
- **更好的用户体验**: 三级视图切换，操作更加直观
- **更强的扩展性**: 可以轻松添加新功能，如日期范围选择、自定义日期格式等

### 3. 性能优化

- **按需渲染**: 只渲染当前视图模式的内容
- **事件优化**: 使用useCallback缓存事件处理函数
- **状态管理**: 最小化状态，避免不必要的重新渲染

### 4. 类型安全

- **TypeScript支持**: 完整的类型定义，编译时错误检查
- **接口约束**: 明确的props接口，防止误用
- **默认值处理**: 合理的默认值，减少配置复杂度

## 🔄 迁移指南

### 对于现有DateInput用户

```typescript
// 无需任何修改，DateInput的API保持不变
<DateInput
  name="date"
  label="日期"
  value={value}
  onChange={onChange}
  showCalendar={true}  // 现在使用新的Calendar组件
/>
```

### 对于新的Calendar组件用户

```typescript
// 简单的日期选择
<Calendar
  value={date}
  onChange={setDate}
/>

// 带限制的日期选择
<Calendar
  value={date}
  onChange={setDate}
  minDate={new Date()}
  maxDate={new Date('2025-12-31')}
  showYearMonthSelector={true}
/>
```

### 对于SmartPasteCell用户

```typescript
// 自动获得增强的日历功能，无需任何修改
// 点击日期cell即可享受完整的日历选择体验
```

## 🎉 最终效果

### 技术成果

1. **组件复用**: 成功提取独立的Calendar组件，实现代码复用
2. **功能增强**: 新增年份快速跳转、日期范围限制等功能
3. **代码简化**: SmartPasteCell的日历代码减少91.6%
4. **接口统一**: 提供一致的API接口，便于集成和维护

### 用户体验成果

1. **功能完整**: 支持日/月/年三级选择，操作更加灵活
2. **交互直观**: 点击月年标题可以快速切换视图
3. **范围限制**: 支持最小/最大日期限制，避免无效选择
4. **视觉一致**: 在所有使用场景中保持一致的视觉设计

### 业务价值

1. **开发效率**: 新的日期选择需求可以直接使用Calendar组件
2. **维护成本**: 日历相关的维护工作集中在一个组件中
3. **用户满意**: 更丰富的功能和更好的用户体验
4. **技术债务**: 消除了重复的日历实现代码

这个Calendar组件的提取和复用完美解决了代码重复问题，同时提供了更强大的功能和更好的用户体验。现在整个应用中的日期选择功能都基于这个统一的、功能丰富的Calendar组件。
