import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/contexts/providers/ToastContext'
import { LanguageProvider } from '@/contexts/providers/LanguageContext'
import { UserDataProvider } from '@/contexts/providers/UserDataContext'
import { ThemeProvider } from '@/contexts/providers/ThemeContext'
import ThemeScript from '@/components/ThemeScript'
import LanguageScript from '@/components/LanguageScript'

export const metadata: Metadata = {
  title: 'Flow Balance - 个人财务管理',
  description: '专业的个人财务管理应用，支持多币种、智能分类和实时统计',
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
        <ThemeProvider>
          <LanguageProvider>
            <ToastProvider>
              <UserDataProvider>{children}</UserDataProvider>
            </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
