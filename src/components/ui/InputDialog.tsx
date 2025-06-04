'use client'

import { useState, useEffect } from 'react'
import Modal from './Modal'
import InputField from './InputField'

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
  submitLabel = '保存',
  cancelLabel = '取消',
  onSubmit,
  onCancel,
  validation
}: InputDialogProps) {
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
      setError('请输入内容')
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
      <form onSubmit={handleSubmit} className="space-y-4">
        {message && (
          <p className="text-gray-700">{message}</p>
        )}
        
        <InputField
          type="text"
          name="input"
          label=""
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          error={error}
          autoFocus
        />
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  )
}
