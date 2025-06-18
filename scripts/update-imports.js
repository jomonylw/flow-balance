#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// 定义路径映射规则
const pathMappings = [
  // lib 目录重组
  { from: 'src/lib/prisma', to: 'src/lib/database/prisma' },
  { from: 'src/lib/api-middleware', to: 'src/lib/api/middleware' },
  { from: 'src/lib/api-response', to: 'src/lib/api/response' },
  { from: 'src/lib/auth', to: 'src/lib/services/auth.service' },
  { from: 'src/lib/account-balance', to: 'src/lib/services/account.service' },
  {
    from: 'src/lib/currency-conversion',
    to: 'src/lib/services/currency.service',
  },
  { from: 'src/lib/category-summary', to: 'src/lib/services/category-summary' },
  { from: 'src/lib/utils', to: 'src/lib/utils/format' },
  { from: 'src/lib/data-validation', to: 'src/lib/utils/validation' },
  { from: 'src/lib/serialization', to: 'src/lib/utils/serialization' },
  { from: 'src/lib/responsive', to: 'src/lib/utils/responsive' },
  { from: 'src/lib/colorManager', to: 'src/lib/utils/color' },

  // types 目录重组
  { from: 'src/types/transaction', to: 'src/types/business/transaction' },
  { from: 'src/types/global.d', to: 'src/types/ui/global.d' },

  // hooks 目录重组
  { from: 'src/hooks/useResponsive', to: 'src/hooks/ui/useResponsive' },
  { from: 'src/hooks/useSidebarState', to: 'src/hooks/ui/useSidebarState' },
  { from: 'src/hooks/useSidebarWidth', to: 'src/hooks/ui/useSidebarWidth' },
  {
    from: 'src/hooks/useOptimizedNavigation',
    to: 'src/hooks/ui/useOptimizedNavigation',
  },
  {
    from: 'src/hooks/useRoutePreservation',
    to: 'src/hooks/ui/useRoutePreservation',
  },
  {
    from: 'src/hooks/useAccountTransactions',
    to: 'src/hooks/api/useAccountTransactions',
  },
  {
    from: 'src/hooks/useDataUpdateListener',
    to: 'src/hooks/business/useDataUpdateListener',
  },

  // contexts 目录重组
  {
    from: 'src/contexts/BalanceContext',
    to: 'src/contexts/providers/BalanceContext',
  },
  {
    from: 'src/contexts/LanguageContext',
    to: 'src/contexts/providers/LanguageContext',
  },
  {
    from: 'src/contexts/ThemeContext',
    to: 'src/contexts/providers/ThemeContext',
  },
  {
    from: 'src/contexts/ToastContext',
    to: 'src/contexts/providers/ToastContext',
  },
  {
    from: 'src/contexts/UserDataContext',
    to: 'src/contexts/providers/UserDataContext',
  },

  // utils 目录重组
  {
    from: 'src/utils/DataUpdateManager',
    to: 'src/lib/services/data-update.service',
  },

  // UI 组件重组 - forms
  {
    from: 'src/components/ui/InputField',
    to: 'src/components/ui/forms/InputField',
  },
  {
    from: 'src/components/ui/SelectField',
    to: 'src/components/ui/forms/SelectField',
  },
  {
    from: 'src/components/ui/TextAreaField',
    to: 'src/components/ui/forms/TextAreaField',
  },
  {
    from: 'src/components/ui/ColorPicker',
    to: 'src/components/ui/forms/ColorPicker',
  },
  {
    from: 'src/components/ui/ToggleSwitch',
    to: 'src/components/ui/forms/ToggleSwitch',
  },
  { from: 'src/components/ui/Slider', to: 'src/components/ui/forms/Slider' },
  {
    from: 'src/components/ui/CategorySelector',
    to: 'src/components/ui/forms/CategorySelector',
  },
  {
    from: 'src/components/ui/calendar',
    to: 'src/components/ui/forms/calendar',
  },
  { from: 'src/components/ui/button', to: 'src/components/ui/forms/button' },
  {
    from: 'src/components/ui/AuthButton',
    to: 'src/components/ui/forms/AuthButton',
  },

  // UI 组件重组 - feedback
  { from: 'src/components/ui/Modal', to: 'src/components/ui/feedback/Modal' },
  { from: 'src/components/ui/Toast', to: 'src/components/ui/feedback/Toast' },
  {
    from: 'src/components/ui/ToastContainer',
    to: 'src/components/ui/feedback/ToastContainer',
  },
  {
    from: 'src/components/ui/ConfirmationModal',
    to: 'src/components/ui/feedback/ConfirmationModal',
  },
  {
    from: 'src/components/ui/DeleteConfirmModal',
    to: 'src/components/ui/feedback/DeleteConfirmModal',
  },
  {
    from: 'src/components/ui/InputDialog',
    to: 'src/components/ui/feedback/InputDialog',
  },
  {
    from: 'src/components/ui/AccountSettingsModal',
    to: 'src/components/ui/feedback/AccountSettingsModal',
  },
  {
    from: 'src/components/ui/AddAccountModal',
    to: 'src/components/ui/feedback/AddAccountModal',
  },
  {
    from: 'src/components/ui/CategorySettingsModal',
    to: 'src/components/ui/feedback/CategorySettingsModal',
  },
  {
    from: 'src/components/ui/TagFormModal',
    to: 'src/components/ui/feedback/TagFormModal',
  },
  {
    from: 'src/components/ui/TopCategoryModal',
    to: 'src/components/ui/feedback/TopCategoryModal',
  },

  // UI 组件重组 - navigation
  {
    from: 'src/components/ui/BreadcrumbNavigation',
    to: 'src/components/ui/navigation/BreadcrumbNavigation',
  },

  // UI 组件重组 - data-display
  {
    from: 'src/components/ui/ResponsiveTable',
    to: 'src/components/ui/data-display/ResponsiveTable',
  },
  { from: 'src/components/ui/card', to: 'src/components/ui/data-display/card' },
  {
    from: 'src/components/ui/CurrencyTag',
    to: 'src/components/ui/data-display/CurrencyTag',
  },
  {
    from: 'src/components/ui/skeleton',
    to: 'src/components/ui/data-display/skeleton',
  },
  {
    from: 'src/components/ui/page-skeletons',
    to: 'src/components/ui/data-display/page-skeletons',
  },
  {
    from: 'src/components/ui/TranslationLoader',
    to: 'src/components/ui/data-display/TranslationLoader',
  },
  {
    from: 'src/components/ui/TranslationText',
    to: 'src/components/ui/data-display/TranslationText',
  },
  {
    from: 'src/components/ui/WithTranslation',
    to: 'src/components/ui/data-display/WithTranslation',
  },

  // UI 组件重组 - layout
  {
    from: 'src/components/ui/PageContainer',
    to: 'src/components/ui/layout/PageContainer',
  },
  {
    from: 'src/components/ui/DetailPageLayout',
    to: 'src/components/ui/layout/DetailPageLayout',
  },
  { from: 'src/components/ui/popover', to: 'src/components/ui/layout/popover' },

  // 功能组件重组
  { from: 'src/components/accounts', to: 'src/components/features/accounts' },
  { from: 'src/components/auth', to: 'src/components/features/auth' },
  {
    from: 'src/components/categories',
    to: 'src/components/features/categories',
  },
  { from: 'src/components/dashboard', to: 'src/components/features/dashboard' },
  { from: 'src/components/reports', to: 'src/components/features/reports' },
  { from: 'src/components/settings', to: 'src/components/features/settings' },
  { from: 'src/components/setup', to: 'src/components/features/setup' },
  {
    from: 'src/components/transactions',
    to: 'src/components/features/transactions',
  },
  { from: 'src/components/charts', to: 'src/components/features/charts' },
  { from: 'src/components/layout', to: 'src/components/features/layout' },
  { from: 'src/components/debug', to: 'src/components/features/debug' },
  { from: 'src/components/dev', to: 'src/components/features/dev' },
  { from: 'src/components/fire', to: 'src/components/features/fire' },
  { from: 'src/components/test', to: 'src/components/features/test' },

  // 处理相对路径导入 - UI组件内部引用
  { from: '../ui/PageContainer', to: '@/components/ui/layout/PageContainer' },
  {
    from: '../ui/TranslationLoader',
    to: '@/components/ui/data-display/TranslationLoader',
  },
  {
    from: '../ui/page-skeletons',
    to: '@/components/ui/data-display/page-skeletons',
  },
  { from: './InputField', to: '@/components/ui/forms/InputField' },
  { from: './SelectField', to: '@/components/ui/forms/SelectField' },
  { from: './TextAreaField', to: '@/components/ui/forms/TextAreaField' },
  { from: './AuthButton', to: '@/components/ui/forms/AuthButton' },
  { from: './ColorPicker', to: '@/components/ui/forms/ColorPicker' },
  { from: './Modal', to: '@/components/ui/feedback/Modal' },
  {
    from: './BreadcrumbNavigation',
    to: '@/components/ui/navigation/BreadcrumbNavigation',
  },
  { from: './utils', to: '@/lib/utils/format' },
  { from: './currency-conversion', to: '@/lib/services/currency.service' },
]

// 获取所有需要更新的文件
function getAllFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  let files = []
  const items = fs.readdirSync(dir)

  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      // 跳过 node_modules, .next 等目录
      if (!['node_modules', '.next', 'dist', 'build', '.git'].includes(item)) {
        files = files.concat(getAllFiles(fullPath, extensions))
      }
    } else if (extensions.some(ext => item.endsWith(ext))) {
      files.push(fullPath)
    }
  }

  return files
}

// 更新文件中的导入路径
function updateImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  let hasChanges = false

  for (const mapping of pathMappings) {
    // 处理相对路径导入
    const relativeFromPattern = new RegExp(
      `(['"\`])(\\.{1,2}/)*${mapping.from.replace(/\//g, '\\/')}(['"\`])`,
      'g'
    )
    const relativeToPath = mapping.to

    if (relativeFromPattern.test(content)) {
      content = content.replace(relativeFromPattern, `$1$2${relativeToPath}$3`)
      hasChanges = true
    }

    // 处理绝对路径导入 (@/ 开头)
    const absoluteFromPattern = new RegExp(
      `(['"\`])@/${mapping.from.replace('src/', '').replace(/\//g, '\\/')}(['"\`])`,
      'g'
    )
    const absoluteToPath = `@/${mapping.to.replace('src/', '')}`

    if (absoluteFromPattern.test(content)) {
      content = content.replace(absoluteFromPattern, `$1${absoluteToPath}$2`)
      hasChanges = true
    }
  }

  if (hasChanges) {
    fs.writeFileSync(filePath, content, 'utf8')
    console.log(`Updated imports in: ${filePath}`)
  }
}

// 主函数
function main() {
  console.log('Starting import path updates...')

  const files = getAllFiles('./src')
  console.log(`Found ${files.length} files to process`)

  for (const file of files) {
    try {
      updateImportsInFile(file)
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message)
    }
  }

  console.log('Import path updates completed!')
}

if (require.main === module) {
  main()
}

module.exports = { updateImportsInFile, getAllFiles, pathMappings }
