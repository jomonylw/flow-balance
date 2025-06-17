'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { useUserData } from '@/contexts/UserDataContext'
import { useLanguage } from '@/contexts/LanguageContext'
import Modal from '@/components/ui/Modal'
import InputField from '@/components/ui/InputField'
import AuthButton from '@/components/ui/AuthButton'
import ConfirmationModal from '@/components/ui/ConfirmationModal'
import ColorPicker from '@/components/ui/ColorPicker'
import { TagManagementSkeleton } from '@/components/ui/page-skeletons'

interface Tag {
  id: string
  name: string
  color?: string
  _count?: {
    transactions: number
  }
}

interface TagFormData {
  name: string
  color: string
}

export default function TagManagement() {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
  const { tags, isLoading, refreshTags, updateTag, addTag, removeTag } = useUserData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [formData, setFormData] = useState<TagFormData>({ name: '', color: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null)

  // 移除预定义颜色选项，使用统一的ColorPicker组件

  // 移除 loadTags 函数，直接使用 UserDataContext 中的数据

  const handleAddTag = () => {
    setEditingTag(null)
    setFormData({ name: '', color: '' })
    setIsModalOpen(true)
  }

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag)
    setFormData({ name: tag.name, color: tag.color || '' })
    setIsModalOpen(true)
  }

  const handleDeleteTag = (tag: Tag) => {
    setDeletingTag(tag)
    setShowDeleteConfirm(true)
  }

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
          editingTag ? t('success.updated') : t('success.created'),
          editingTag ? t('tag.updated') : t('tag.created')
        )
        setIsModalOpen(false)

        // 更新 UserDataContext 中的数据
        if (editingTag) {
          updateTag(result.data)
        } else {
          addTag(result.data)
        }
      } else {
        showError(
          editingTag ? t('error.update.failed') : t('error.create.failed'),
          result.error || t('error.operation.failed')
        )
      }
    } catch (error) {
      console.error('Error saving tag:', error)
      showError(t('error.operation.failed'), t('error.network'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingTag) return

    try {
      const response = await fetch(`/api/tags/${deletingTag.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        showSuccess(t('success.deleted'), t('tag.deleted'))
        // 更新 UserDataContext 中的数据
        removeTag(deletingTag.id)
      } else {
        showError(t('error.delete.failed'), result.error || t('tag.delete.failed'))
      }
    } catch (error) {
      console.error('Error deleting tag:', error)
      showError(t('error.delete.failed'), t('error.network'))
    } finally {
      setShowDeleteConfirm(false)
      setDeletingTag(null)
    }
  }

  if (isLoading) {
    return <TagManagementSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{t('tag.management')}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('tag.management.description')}
          </p>
        </div>
        <button
          onClick={handleAddTag}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {t('tag.add')}
        </button>
      </div>

      {/* 标签列表 */}
      {tags.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md border border-gray-200 dark:border-gray-700">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {tags.map((tag) => (
              <li key={tag.id}>
                <div className="px-4 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center space-x-3">
                    {/* 标签颜色指示器 */}
                    <div
                      className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600"
                      style={{ backgroundColor: tag.color || '#6B7280' }}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{tag.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('tag.usage.count', { count: tag._count?.transactions || 0 })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditTag(tag)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => handleDeleteTag(tag)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={Boolean(tag._count?.transactions && tag._count.transactions > 0)}
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-12 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">{t('tag.empty.title')}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('tag.empty.description')}</p>
          <div className="mt-6">
            <button
              onClick={handleAddTag}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {t('tag.add')}
            </button>
          </div>
        </div>
      )}

      {/* 标签表单模态框 */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
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
          <ColorPicker
            selectedColor={formData.color || '#6B7280'}
            onColorChange={(color) => setFormData(prev => ({ ...prev, color }))}
          />

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
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

      {/* 删除确认模态框 */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title={t('tag.delete.title')}
        message={
          deletingTag?._count?.transactions && deletingTag._count.transactions > 0
            ? t('tag.delete.in.use.message', {
                name: deletingTag?.name,
                count: deletingTag._count.transactions
              })
            : t('tag.delete.confirm.message', { name: deletingTag?.name || '' })
        }
        confirmLabel={
          deletingTag?._count?.transactions && deletingTag._count.transactions > 0
            ? t('common.ok')
            : t('tag.delete.confirm')
        }
        cancelLabel={t('common.cancel')}
        onConfirm={
          deletingTag?._count?.transactions && deletingTag._count.transactions > 0
            ? () => {
                setShowDeleteConfirm(false)
                setDeletingTag(null)
              }
            : handleConfirmDelete
        }
        onCancel={() => {
          setShowDeleteConfirm(false)
          setDeletingTag(null)
        }}
        variant={
          deletingTag?._count?.transactions && deletingTag._count.transactions > 0
            ? 'warning'
            : 'danger'
        }
      />
    </div>
  )
}
