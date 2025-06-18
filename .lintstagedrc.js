module.exports = {
  // TypeScript 和 JavaScript 文件
  '*.{ts,tsx,js,jsx}': ['eslint --fix --max-warnings=1000', 'prettier --write'],

  // JSON 文件
  '*.json': ['prettier --write'],

  // CSS 和样式文件
  '*.{css,scss,sass,less}': ['prettier --write'],

  // Markdown 文件
  '*.md': ['prettier --write'],

  // 配置文件
  '*.{yml,yaml}': ['prettier --write'],
}
