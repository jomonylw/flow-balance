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
      } catch (error) {
        console.error('Language initialization error:', error);
        // 出错时默认使用中文
        document.documentElement.lang = 'zh-CN';
        window.__INITIAL_LANGUAGE__ = 'zh';
      }
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: languageScript,
      }}
    />
  );
}
