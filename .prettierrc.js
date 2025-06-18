module.exports = {
  // 基础配置
  semi: false,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'es5',

  // 缩进配置
  tabWidth: 2,
  useTabs: false,

  // 换行配置
  printWidth: 80,
  endOfLine: 'lf',

  // JSX 配置
  jsxSingleQuote: true,
  jsxBracketSameLine: false,

  // 对象和数组
  bracketSpacing: true,
  bracketSameLine: false,

  // 箭头函数
  arrowParens: 'avoid',

  // HTML 配置
  htmlWhitespaceSensitivity: 'css',

  // 文件覆盖配置
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 120,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 100,
        proseWrap: 'always',
      },
    },
    {
      files: '*.{yml,yaml}',
      options: {
        tabWidth: 2,
      },
    },
  ],
}
