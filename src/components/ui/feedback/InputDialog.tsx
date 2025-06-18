'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/feedback/Modal'
import InputField from '@/components/ui/forms/InputField'
import { useLanguage } from '@/contexts/providers/LanguageContext'

interface InputDialogProps {
  isOpen: boolean
  title: string
  message?: string
  placeholder?: string
  initialValue?: string
  submitLabel?: string
  cancelLabel?: string
  onSubmit: (value: string) => void
  onCancel: () => void
  validation?: (value: string) => string | null
}

export default function InputDialog({
  isOpen,
  title,
  message,
  placeholder = '',
  initialValue = '',
  submitLabel,
  cancelLabel,
  onSubmit,
  onCancel,
  validation,
}: InputDialogProps) {
  const { t } = useLanguage()
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue)
      setError('')
    }
  }, [isOpen, initialValue])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // 验证输入
    if (validation) {
      const validationError = validation(value)
      if (validationError) {
        setError(validationError)
        return
      }
    }

    if (!value.trim()) {
      setError(t('input.dialog.required'))
      return
    }

    onSubmit(value.trim())
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
    if (error) {
      setError('')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <form onSubmit={handleSubmit} className='space-y-4'>
        {message && (
          <p className='text-gray-700 dark:text-gray-300'>{message}</p>
        )}

        <InputField
          type='text'
          name='input'
          label=''
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          error={error}
          autoFocus
        />

        <div className='flex justify-end space-x-3'>
          <button
            type='button'
            onClick={onCancel}
            className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-gray-400'
          >
            {cancelLabel || t('common.cancel')}
          </button>
          <button
            type='submit'
            className='px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 border border-transparent rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400'
          >
            {submitLabel || t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
