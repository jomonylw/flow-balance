interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export default function AuthLayout({
  children,
  title,
  subtitle,
}: AuthLayoutProps) {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 py-6 sm:py-12 px-4 sm:px-6 lg:px-8 safe-area-inset-top safe-area-inset-bottom'>
      <div className='max-w-md w-full space-y-6 sm:space-y-8'>
        {/* Logo and Title */}
        <div className='text-center'>
          <div className='mx-auto h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-full bg-blue-100'>
            <svg
              className='h-6 w-6 sm:h-8 sm:w-8 text-blue-600'
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
          <h1 className='mt-4 sm:mt-6 text-2xl sm:text-3xl font-extrabold text-gray-900'>
            Flow Balance
          </h1>
          <h2 className='mt-2 text-lg sm:text-xl font-bold text-gray-900'>
            {title}
          </h2>
          {subtitle && <p className='mt-2 text-sm text-gray-600'>{subtitle}</p>}
        </div>

        {/* Form Content */}
        <div className='bg-white py-6 sm:py-8 px-4 sm:px-6 shadow-lg rounded-lg'>
          {children}
        </div>
      </div>
    </div>
  )
}
