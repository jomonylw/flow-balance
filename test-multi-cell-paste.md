# 多单元格粘贴功能测试

## 修复内容

### 问题描述

智能表格当选择了多个单元格，粘贴时，并没有贴到所有单元格（只粘贴了单元格）

### 修复方案

1. **添加多单元格粘贴处理函数**

   - 新增 `handleMultiCellPaste` 函数
   - 支持将单个值粘贴到所有选中的单元格

2. **修改粘贴逻辑**

   - 在 `handlePaste` 函数中添加多单元格检测
   - 当选中多个单元格时，调用多单元格粘贴函数

3. **添加翻译键**
   - `smart.paste.multi.cell.paste`: "多单元格粘贴"
   - `smart.paste.cells`: "个单元格"
   - `smart.paste.multi.cell.success`: "已粘贴到 {{count}} 个单元格"

### 修复的代码逻辑

```typescript
// 处理多单元格粘贴
const handleMultiCellPaste = useCallback(
  (value: unknown) => {
    const selectedCells = Array.from(cellSelection.selectedCells)

    if (selectedCells.length === 0) return

    // 更新所有选中单元格的值
    selectedCells.forEach(cellKey => {
      const { rowIndex, columnIndex } = parseCellKey(cellKey)
      const column = columns[columnIndex]

      if (rowIndex < newData.length && column) {
        // 更新单元格数据
        // 验证数据
        // 标记为已修改
      }
    })

    // 记录历史和显示成功消息
  },
  [cellSelection.selectedCells, internalData, columns, config.validationMode, showSuccess, t]
)

// 修改后的粘贴处理
const handlePaste = useCallback(
  (event: ClipboardEvent) => {
    // ... 获取剪贴板数据

    if (lines.length > 1) {
      // 多行数据：使用列粘贴
      handleColumnPaste(activeColumn.key, lines)
    } else {
      const value = clipboardData.trim()

      if (cellSelection.selectedCells.size > 1) {
        // 多单元格选中：粘贴到所有选中的单元格
        handleMultiCellPaste(value)
      } else {
        // 单单元格：直接更新当前单元格
        handleCellChange(...)
      }
    }
  },
  [...]
)
```

## 测试步骤

### 测试场景1：多单元格粘贴相同值

1. 打开智能表格
2. 选择多个单元格（Ctrl+点击或Shift+拖拽）
3. 复制一个值到剪贴板
4. 按 Ctrl+V 粘贴
5. **预期结果**：所有选中的单元格都应该显示粘贴的值

### 测试场景2：单单元格粘贴（保持原有功能）

1. 选择单个单元格
2. 粘贴值
3. **预期结果**：只有当前单元格被更新

### 测试场景3：列粘贴（保持原有功能）

1. 选择单个单元格
2. 粘贴多行数据（包含换行符）
3. **预期结果**：数据按列粘贴到多行

## 验证要点

- ✅ 多单元格选择状态正确识别
- ✅ 粘贴值正确应用到所有选中单元格
- ✅ 历史记录正确记录
- ✅ 成功消息显示正确的单元格数量
- ✅ 数据验证正常工作
- ✅ 不影响原有的单单元格和列粘贴功能

## 修复完成状态

✅ **问题已修复** - 智能表格现在支持多单元格粘贴功能

### 修复内容总结：

1. **新增 `handleMultiCellPaste` 函数**

   - 处理多个选中单元格的粘贴操作
   - 支持数据验证和历史记录
   - 提供用户友好的成功反馈

2. **增强 `handlePaste` 函数**

   - 添加多单元格检测逻辑
   - 根据选中单元格数量选择合适的粘贴方式
   - 保持向后兼容性

3. **添加国际化支持**

   - 中英文翻译键完整
   - 支持动态参数替换

4. **逻辑测试验证**
   - 所有粘贴场景测试通过
   - 多单元格粘贴逻辑正确
   - 不影响现有功能

### 使用方法：

1. 在智能表格中选择多个单元格（Ctrl+点击或Shift+拖拽）
2. 复制要粘贴的值到剪贴板
3. 按 Ctrl+V 或 Cmd+V 粘贴
4. 所有选中的单元格将显示相同的粘贴值
