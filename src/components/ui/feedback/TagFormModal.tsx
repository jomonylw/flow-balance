'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/feedback/Modal'
import InputField from '@/components/ui/forms/InputField'
import AuthButton from '@/components/ui/forms/AuthButton'
import ColorPicker from '@/components/ui/forms/ColorPicker'
import { useToast } from '@/contexts/providers/ToastContext'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import type { TagFormModalProps } from '@/types/components'
import type { TagFormData } from '@/types/core'

export default function TagFormModal({
  isOpen,
  onClose,
  onSuccess,
  editingTag,
  zIndex = 'z-50',
}: TagFormModalProps) {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
  const [formData, setFormData] = useState<TagFormData>({ name: '', color: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 移除预定义颜色选项，使用统一的ColorPicker组件

  // 初始化表单数据
  useEffect(() => {
    if (isOpen) {
      if (editingTag) {
        setFormData({
          name: editingTag.name,
          color: editingTag.color || '#6B7280',
        })
      } else {
        setFormData({
          name: '',
          color: '#6B7280',
        })
      }
    }
  }, [isOpen, editingTag])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      showError(t('validation.failed'), t('tag.name.required'))
      return
    }

    try {
      setIsSubmitting(true)

      const url = editingTag ? `/api/tags/${editingTag.id}` : '/api/tags'
      const method = editingTag ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          color: formData.color || null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        showSuccess(
          editingTag ? t('tag.update.success') : t('tag.create.success'),
          editingTag ? t('tag.updated') : t('tag.created')
        )
        onSuccess(result.data)
        onClose()
      } else {
        showError(
          editingTag ? t('tag.update.failed') : t('tag.create.failed'),
          result.error || t('tag.operation.failed')
        )
      }
    } catch (error) {
      console.error('Error saving tag:', error)
      showError(
        editingTag ? t('tag.update.failed') : t('tag.create.failed'),
        t('error.network')
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTag ? t('tag.edit') : t('tag.add')}
      zIndex={zIndex}
    >
      <form onSubmit={handleSubmit} className='space-y-4'>
        <InputField
          name='name'
          label={t('tag.name')}
          value={formData.name}
          onChange={e =>
            setFormData(prev => ({ ...prev, name: e.target.value }))
          }
          placeholder={t('tag.name.placeholder')}
          required
        />

        {/* 颜色选择 */}
        <ColorPicker
          selectedColor={formData.color || '#6B7280'}
          onColorChange={color => setFormData(prev => ({ ...prev, color }))}
        />

        <div className='flex justify-end space-x-3 pt-4'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400'
          >
            {t('common.cancel')}
          </button>
          <AuthButton
            type='submit'
            label={editingTag ? t('tag.update') : t('tag.create')}
            isLoading={isSubmitting}
          />
        </div>
      </form>
    </Modal>
  )
}
