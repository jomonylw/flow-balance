'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import InputField from '@/components/ui/InputField'
import AuthButton from '@/components/ui/AuthButton'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'

interface Tag {
  id: string
  name: string
  color?: string
}

interface TagFormData {
  name: string
  color: string
}

interface TagFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (tag: Tag) => void
  editingTag?: Tag | null
}

export default function TagFormModal({
  isOpen,
  onClose,
  onSuccess,
  editingTag
}: TagFormModalProps) {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
  const [formData, setFormData] = useState<TagFormData>({ name: '', color: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 预定义颜色选项（与settings中保持一致）
  const colorOptions = [
    '#3B82F6', // 蓝色
    '#10B981', // 绿色
    '#F59E0B', // 黄色
    '#EF4444', // 红色
    '#8B5CF6', // 紫色
    '#F97316', // 橙色
    '#06B6D4', // 青色
    '#84CC16', // 柠檬绿
    '#EC4899', // 粉色
    '#6B7280'  // 灰色
  ]

  // 初始化表单数据
  useEffect(() => {
    if (isOpen) {
      if (editingTag) {
        setFormData({ 
          name: editingTag.name, 
          color: editingTag.color || colorOptions[0] 
        })
      } else {
        setFormData({ 
          name: '', 
          color: colorOptions[0] 
        })
      }
    }
  }, [isOpen, editingTag])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      showError('验证失败', '标签名称不能为空')
      return
    }

    try {
      setIsSubmitting(true)
      
      const url = editingTag ? `/api/tags/${editingTag.id}` : '/api/tags'
      const method = editingTag ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          color: formData.color || null
        })
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
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          name="name"
          label={t('tag.name')}
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder={t('tag.name.placeholder')}
          required
        />

        {/* 颜色选择 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('tag.color')}
          </label>
          <div className="flex flex-wrap gap-2">
            {colorOptions.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, color }))}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  formData.color === color ? 'border-gray-900 dark:border-gray-100 ring-2 ring-gray-900 dark:ring-gray-100 ring-offset-1' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          {formData.color && (
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('tag.color.selected')}:</span>
              <div
                className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: formData.color }}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{formData.color}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            {t('common.cancel')}
          </button>
          <AuthButton
            type="submit"
            label={editingTag ? t('tag.update') : t('tag.create')}
            isLoading={isSubmitting}
          />
        </div>
      </form>
    </Modal>
  )
}
