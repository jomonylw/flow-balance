/**
 * 语言初始化脚本组件
 * 在页面加载时立即执行，防止语言闪烁
 */
export default function LanguageScript() {
  const languageScript = `
    (function() {
      try {
        // 获取保存的语言设置
        const savedLanguage = localStorage.getItem('language') || 'zh';
        const root = document.documentElement;

        // 立即设置HTML lang属性
        if (savedLanguage === 'zh') {
          root.lang = 'zh-CN';
        } else if (savedLanguage === 'en') {
          root.lang = 'en';
        } else {
          // 默认中文
          root.lang = 'zh-CN';
        }

        // 设置一个全局变量供LanguageContext使用
        window.__INITIAL_LANGUAGE__ = savedLanguage === 'en' ? 'en' : 'zh';

        // 设置一个标志表示语言正在初始化
        window.__LANGUAGE_INITIALIZING__ = true;

        // 添加样式隐藏加载占位符
        const style = document.createElement('style');
        style.id = 'translation-loading-style';
        style.textContent = \`
          /* 隐藏包含加载占位符的元素 */
          *:has-text("__LOADING_") {
            opacity: 0 !important;
            pointer-events: none !important;
          }

          /* 使用更通用的方法隐藏加载状态 */
          .translation-loading {
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
          }

          .translation-ready {
            opacity: 1;
          }

          /* 隐藏包含特定文本的元素 */
          [data-translation-loading="true"] {
            opacity: 0;
          }
        \`;
        document.head.appendChild(style);

      } catch (error) {
        console.error('Language initialization error:', error);
        // 出错时默认使用中文
        document.documentElement.lang = 'zh-CN';
        window.__INITIAL_LANGUAGE__ = 'zh';
        window.__LANGUAGE_INITIALIZING__ = false;
      }
    })();
  `

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: languageScript,
      }}
    />
  )
}
