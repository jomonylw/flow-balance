import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/contexts/providers/ToastContext'
import { LanguageProvider } from '@/contexts/providers/LanguageContext'
import { UserDataProvider } from '@/contexts/providers/UserDataContext'
import { ThemeProvider } from '@/contexts/providers/ThemeContext'
import { AuthProvider } from '@/contexts/providers/AuthContext'
import ThemeScript from '@/components/ThemeScript'
import LanguageScript from '@/components/LanguageScript'
import EChartsInitializer from '@/components/EChartsInitializer'
import { initializeServer } from '@/lib/utils/server-init'

export const metadata: Metadata = {
  title: 'Flow Balance - 个人财务管理',
  description: '专业的个人财务管理应用，支持多币种、智能分类和实时统计',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        url: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  },
  manifest: '/site.webmanifest',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // 初始化服务器组件（包括缓存监控）
  await initializeServer()

  return (
    <html suppressHydrationWarning>
      <head>
        <ThemeScript />
        <LanguageScript />
      </head>
      <body className='antialiased'>
        <EChartsInitializer />
        <ThemeProvider>
          <LanguageProvider>
            <ToastProvider>
              <AuthProvider>
                <UserDataProvider>{children}</UserDataProvider>
              </AuthProvider>
            </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
