#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// 需要修复的脚本文件和对应的导入替换规则
const scriptFixes = [
  {
    file: 'scripts/test-api-response.ts',
    replacements: [
      {
        from: "} from '../src/lib/account-balance'",
        to: "} from '../src/lib/services/account.service'",
      },
    ],
  },
  {
    file: 'scripts/test-api-structure.ts',
    replacements: [
      {
        from: "} from '../src/lib/account-balance'",
        to: "} from '../src/lib/services/account.service'",
      },
    ],
  },
  {
    file: 'scripts/test-dashboard-api.ts',
    replacements: [
      {
        from: "} from '../src/lib/account-balance'",
        to: "} from '../src/lib/services/account.service'",
      },
    ],
  },
  {
    file: 'scripts/test-dashboard-calculations.ts',
    replacements: [
      {
        from: "} from '../src/lib/account-balance'",
        to: "} from '../src/lib/services/account.service'",
      },
      {
        from: "import { getStockCategorySummary } from '../src/lib/category-summary/stock-category-service'",
        to: "import { getStockCategorySummary } from '../src/lib/services/category-summary/stock-category-service'",
      },
      {
        from: "import { getFlowCategorySummary } from '../src/lib/category-summary/flow-category-service'",
        to: "import { getFlowCategorySummary } from '../src/lib/services/category-summary/flow-category-service'",
      },
    ],
  },
  {
    file: 'scripts/test-dashboard-summary-api.ts',
    replacements: [
      {
        from: "} from '../src/lib/account-balance'",
        to: "} from '../src/lib/services/account.service'",
      },
    ],
  },
  {
    file: 'scripts/test-reports.ts',
    replacements: [
      {
        from: "} from '../src/lib/account-balance'",
        to: "} from '../src/lib/services/account.service'",
      },
    ],
  },
  {
    file: 'scripts/validate-dashboard-values.ts',
    replacements: [
      {
        from: "} from '../src/lib/account-balance'",
        to: "} from '../src/lib/services/account.service'",
      },
    ],
  },
]

function fixScriptImports() {
  console.log('Fixing script imports...')

  for (const scriptFix of scriptFixes) {
    try {
      if (!fs.existsSync(scriptFix.file)) {
        console.log(`Skipping ${scriptFix.file} - file not found`)
        continue
      }

      let content = fs.readFileSync(scriptFix.file, 'utf8')
      let hasChanges = false

      for (const replacement of scriptFix.replacements) {
        if (content.includes(replacement.from)) {
          content = content.replace(replacement.from, replacement.to)
          hasChanges = true
        }
      }

      if (hasChanges) {
        fs.writeFileSync(scriptFix.file, content, 'utf8')
        console.log(`Fixed imports in: ${scriptFix.file}`)
      }
    } catch (error) {
      console.error(`Error fixing ${scriptFix.file}:`, error.message)
    }
  }

  console.log('Script import fixes completed!')
}

if (require.main === module) {
  fixScriptImports()
}

module.exports = { fixScriptImports }
