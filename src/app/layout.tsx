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

export const metadata: Metadata = {
  title: 'Flow Balance - 个人财务管理',
  description: '专业的个人财务管理应用，支持多币种、智能分类和实时统计',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
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
