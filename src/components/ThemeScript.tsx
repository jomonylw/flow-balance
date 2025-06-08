/**
 * 主题初始化脚本组件
 * 在页面加载时立即执行，防止主题闪烁
 */
export default function ThemeScript() {
  const themeScript = `
    (function() {
      try {
        // 获取保存的主题设置
        const savedTheme = localStorage.getItem('theme') || 'system';
        const root = document.documentElement;
        
        function applyTheme(theme) {
          // 先清除所有主题类
          root.classList.remove('dark', 'light');

          if (theme === 'system') {
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (systemPrefersDark) {
              root.classList.add('dark');
            } else {
              root.classList.add('light');
            }
          } else if (theme === 'dark') {
            root.classList.add('dark');
          } else {
            root.classList.add('light');
          }
        }
        
        // 立即应用主题
        applyTheme(savedTheme);
        
        // 监听系统主题变化（仅当使用system主题时）
        if (savedTheme === 'system') {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          const handleSystemChange = function() {
            // 只有当前主题仍然是system时才应用变化
            const currentTheme = localStorage.getItem('theme');
            if (currentTheme === 'system') {
              applyTheme('system');
            }
          };
          mediaQuery.addEventListener('change', handleSystemChange);
        }
      } catch (error) {
        console.error('Theme initialization error:', error);
        // 出错时默认使用明亮主题
        document.documentElement.classList.add('light');
      }
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: themeScript,
      }}
    />
  );
}
