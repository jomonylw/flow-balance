'use client'

interface PlaceholderImageProps {
  width: number
  height: number
  text: string
  className?: string
}

export default function PlaceholderImage({
  width,
  height,
  text,
  className = '',
}: PlaceholderImageProps) {
  return (
    <div
      className={`bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center border border-gray-300 dark:border-gray-600 ${className}`}
      style={{ width, height }}
    >
      <div className='text-center p-4'>
        <div className='w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4'>
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
              d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
            />
          </svg>
        </div>
        <p className='text-gray-600 dark:text-gray-400 font-medium text-sm'>
          {text}
        </p>
        <p className='text-gray-500 dark:text-gray-500 text-xs mt-2'>
          {width} × {height}
        </p>
      </div>
    </div>
  )
}
