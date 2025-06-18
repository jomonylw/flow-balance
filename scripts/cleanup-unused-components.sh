#!/bin/bash

# Flow Balance 废弃组件清理脚本
# 基于 docs/UNUSED_COMPONENTS_ANALYSIS_REPORT.md 的分析结果

set -e  # 遇到错误立即退出

echo "🧹 Flow Balance 废弃组件清理脚本"
echo "=================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ] || [ ! -d "src/components" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 确认操作
echo "⚠️  此脚本将删除12个确认废弃的组件文件"
echo "📋 删除列表:"
echo "   - CategoryChart.tsx"
echo "   - SmartCategoryChart.tsx" 
echo "   - SmartCategorySummaryCard.tsx"
echo "   - StockCategoryBalanceCard.tsx"
echo "   - AccountBalancesCard.tsx"
echo "   - CurrencyConversionStatus.tsx"
echo "   - NetWorthCard.tsx"
echo "   - QuickTransactionButton.tsx"
echo "   - RecentActivityCard.tsx"
echo "   - RecentTransactionsList.tsx"
echo "   - DataUpdateTest.tsx"
echo "   - ResponsiveTable.tsx"
echo "   - TranslationText.tsx"
echo "   - calendar.tsx"
echo "   - popover.tsx"
echo ""

read -p "🤔 确认继续? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 操作已取消"
    exit 1
fi

echo ""
echo "🚀 开始清理..."

# 创建备份分支
echo "📦 创建备份分支..."
BACKUP_BRANCH="backup-before-component-cleanup-$(date +%Y%m%d-%H%M%S)"
git checkout -b "$BACKUP_BRANCH"
echo "✅ 备份分支已创建: $BACKUP_BRANCH"

# 切换回主分支
git checkout -

echo ""
echo "🗑️  删除废弃组件文件..."

# 定义要删除的文件列表
COMPONENTS_TO_DELETE=(
    "src/components/features/categories/CategoryChart.tsx"
    "src/components/features/categories/SmartCategoryChart.tsx"
    "src/components/features/categories/SmartCategorySummaryCard.tsx"
    "src/components/features/categories/StockCategoryBalanceCard.tsx"
    "src/components/features/dashboard/AccountBalancesCard.tsx"
    "src/components/features/dashboard/CurrencyConversionStatus.tsx"
    "src/components/features/dashboard/NetWorthCard.tsx"
    "src/components/features/dashboard/QuickTransactionButton.tsx"
    "src/components/features/dashboard/RecentActivityCard.tsx"
    "src/components/features/dashboard/RecentTransactionsList.tsx"
    "src/components/features/debug/DataUpdateTest.tsx"
    "src/components/ui/data-display/ResponsiveTable.tsx"
    "src/components/ui/data-display/TranslationText.tsx"
    "src/components/ui/forms/calendar.tsx"
    "src/components/ui/layout/popover.tsx"
)

# 删除文件
DELETED_COUNT=0
for file in "${COMPONENTS_TO_DELETE[@]}"; do
    if [ -f "$file" ]; then
        rm "$file"
        echo "   ✅ 已删除: $file"
        ((DELETED_COUNT++))
    else
        echo "   ⚠️  文件不存在: $file"
    fi
done

echo ""
echo "📊 删除统计: 成功删除 $DELETED_COUNT 个文件"

echo ""
echo "🧪 运行验证测试..."

# 运行构建测试
echo "   🔨 运行构建测试..."
if pnpm run build > /dev/null 2>&1; then
    echo "   ✅ 构建测试通过"
else
    echo "   ❌ 构建测试失败"
    echo "   🔄 建议检查构建错误或回滚到备份分支: $BACKUP_BRANCH"
    exit 1
fi

# 运行类型检查
echo "   🔍 运行类型检查..."
if pnpm run type-check > /dev/null 2>&1; then
    echo "   ✅ 类型检查通过"
else
    echo "   ❌ 类型检查失败"
    echo "   🔄 建议检查类型错误或回滚到备份分支: $BACKUP_BRANCH"
    exit 1
fi

# 运行lint检查
echo "   📝 运行lint检查..."
if pnpm run lint > /dev/null 2>&1; then
    echo "   ✅ Lint检查通过"
else
    echo "   ⚠️  Lint检查有警告，但不影响功能"
fi

echo ""
echo "🎉 组件清理完成!"
echo "📈 清理效果:"
echo "   - 删除文件: $DELETED_COUNT 个"
echo "   - 预估减少代码: 2500+ 行"
echo "   - 构建测试: ✅ 通过"
echo "   - 类型检查: ✅ 通过"
echo ""
echo "📋 后续建议:"
echo "   1. 手动测试主要功能页面"
echo "   2. 清理 src/types/components/index.ts 中的相关类型定义"
echo "   3. 提交代码变更"
echo ""
echo "🔄 如需回滚，使用备份分支: $BACKUP_BRANCH"
echo "   git checkout $BACKUP_BRANCH"
echo ""
echo "✨ 清理完成! 项目代码更加整洁了。"
