'use client'

import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useTheme } from '@/contexts/providers/ThemeContext'
import LandingHeader from './LandingHeader'
import HeroSection from './HeroSection'
import FeaturesSection from './FeaturesSection'
import ProductShowcaseSection from './ProductShowcaseSection'
import ThemeShowcaseSection from './ThemeShowcaseSection'
import TechStackSection from './TechStackSection'
import LandingFooter from './LandingFooter'

export default function LandingPage() {
  const router = useRouter()
  const { isLoading: languageLoading } = useLanguage()
  const { theme, setTheme, resolvedTheme } = useTheme()

  const handleLogin = () => {
    router.push('/login')
  }

  const handleSignup = () => {
    router.push('/signup')
  }

  // 如果翻译还在加载中，显示简化版本
  if (languageLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <div className='w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 mx-auto'>
            <svg
              className='w-8 h-8 text-white'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
          </div>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2'>
            Flow Balance
          </h1>
          <p className='text-gray-600 dark:text-gray-400'>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900'>
      {/* Header */}
      <LandingHeader
        onLogin={handleLogin}
        onSignup={handleSignup}
        theme={theme}
        setTheme={setTheme}
        resolvedTheme={resolvedTheme}
      />

      {/* Main Content */}
      <main className='relative'>
        {/* Hero Section */}
        <HeroSection onLogin={handleLogin} onSignup={handleSignup} />

        {/* Features Section */}
        <FeaturesSection />

        {/* Product Showcase Section */}
        <ProductShowcaseSection />

        {/* Theme & I18n Showcase Section */}
        <ThemeShowcaseSection />

        {/* Tech Stack Section */}
        <TechStackSection />
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  )
}
