'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

interface UserMenuDropdownProps {
  isOpen: boolean
  onClose: () => void
  onLogout: () => void
}

export default function UserMenuDropdown({ isOpen, onClose, onLogout }: UserMenuDropdownProps) {
  const { t } = useLanguage()
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])



  if (!isOpen) return null

  return (
    <div
      ref={menuRef}
      className={`
        absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl ring-1 ring-gray-200
        focus:outline-none z-50 transform transition-all duration-200 ease-out
        ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'}
      `}
      style={{
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}
    >
      <div className="py-2">
        {/* 主要功能区 */}
        <div className="px-2 space-y-1">
          {/* 财务报表 */}
          <Link
            href="/reports"
            onClick={onClose}
            className="group flex items-center px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 transition-all duration-200"
          >
            <div className="flex items-center justify-center w-8 h-8 mr-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors duration-200">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2V7a2 2 0 012-2h2a2 2 0 002 2v2a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 00-2 2h-2a2 2 0 00-2 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span>{t('nav.reports')}</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200">
                  {t('common.new')}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{t('menu.reports.description')}</div>
            </div>
          </Link>

          {/* 账户设置 */}
          <Link
            href="/settings"
            onClick={onClose}
            className="group flex items-center px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50 hover:text-gray-900 transition-all duration-200"
          >
            <div className="flex items-center justify-center w-8 h-8 mr-3 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors duration-200">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div>{t('nav.settings')}</div>
              <div className="text-xs text-gray-500 mt-0.5">{t('menu.settings.description')}</div>
            </div>
          </Link>
        </div>

        {/* 分隔线 */}
        <div className="border-t border-gray-100 my-2 mx-2"></div>

        {/* 辅助功能区 */}
        <div className="px-2 space-y-1">
          {/* 帮助 */}
          <button
            onClick={(e) => {
              e.preventDefault()
              onClose()
              // 这里可以打开帮助模态框或跳转到帮助页面
            }}
            className="group flex items-center w-full px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gradient-to-r hover:from-amber-50 hover:to-yellow-50 hover:text-amber-700 transition-all duration-200"
          >
            <div className="flex items-center justify-center w-8 h-8 mr-3 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors duration-200">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div>
                <span>{t('nav.help')}</span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{t('menu.help.description')}</div>
            </div>
          </button>
        </div>

        {/* 分隔线 */}
        <div className="border-t border-gray-100 my-2 mx-2"></div>

        {/* 危险操作区 */}
        <div className="px-2">
          <button
            onClick={() => {
              onClose()
              onLogout()
            }}
            className="group flex items-center w-full px-3 py-2.5 text-sm font-medium text-red-700 rounded-lg hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 hover:text-red-800 transition-all duration-200"
          >
            <div className="flex items-center justify-center w-8 h-8 mr-3 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors duration-200">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <div className="flex-1">
              <div>
                <span>{t('nav.logout')}</span>
              </div>
              <div className="text-xs text-red-500 mt-0.5">{t('menu.logout.description')}</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
