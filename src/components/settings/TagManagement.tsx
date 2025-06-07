'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/contexts/ToastContext'
import Modal from '@/components/ui/Modal'
import InputField from '@/components/ui/InputField'
import AuthButton from '@/components/ui/AuthButton'
import ConfirmationModal from '@/components/ui/ConfirmationModal'

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
  const { showSuccess, showError } = useToast()
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [formData, setFormData] = useState<TagFormData>({ name: '', color: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null)

  // 预定义颜色选项
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

  useEffect(() => {
    loadTags()
  }, [])

  const loadTags = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/tags')
      const result = await response.json()

      if (result.success) {
        setTags(result.data)
      } else {
        showError('加载失败', result.error || '获取标签列表失败')
      }
    } catch (error) {
      console.error('Error loading tags:', error)
      showError('加载失败', '网络错误，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

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
          editingTag ? '更新成功' : '创建成功',
          editingTag ? '标签已更新' : '标签已创建'
        )
        setIsModalOpen(false)
        loadTags()
      } else {
        showError(
          editingTag ? '更新失败' : '创建失败',
          result.error || '操作失败'
        )
      }
    } catch (error) {
      console.error('Error saving tag:', error)
      showError('操作失败', '网络错误，请稍后重试')
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
        showSuccess('删除成功', '标签已删除')
        loadTags()
      } else {
        showError('删除失败', result.error || '删除标签失败')
      }
    } catch (error) {
      console.error('Error deleting tag:', error)
      showError('删除失败', '网络错误，请稍后重试')
    } finally {
      setShowDeleteConfirm(false)
      setDeletingTag(null)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-500">加载中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">标签管理</h3>
          <p className="mt-1 text-sm text-gray-500">
            管理您的交易标签，用于更好地分类和筛选交易记录
          </p>
        </div>
        <button
          onClick={handleAddTag}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          添加标签
        </button>
      </div>

      {/* 标签列表 */}
      {tags.length > 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {tags.map((tag) => (
              <li key={tag.id}>
                <div className="px-4 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    {/* 标签颜色指示器 */}
                    <div
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: tag.color || '#6B7280' }}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tag.name}</p>
                      <p className="text-sm text-gray-500">
                        {tag._count?.transactions || 0} 笔交易使用
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditTag(tag)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeleteTag(tag)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                      disabled={Boolean(tag._count?.transactions && tag._count.transactions > 0)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-12 border border-gray-200 rounded-lg bg-gray-50">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">还没有标签</h3>
          <p className="mt-1 text-sm text-gray-500">开始创建您的第一个标签来分类交易记录</p>
          <div className="mt-6">
            <button
              onClick={handleAddTag}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              添加标签
            </button>
          </div>
        </div>
      )}

      {/* 标签表单模态框 */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTag ? '编辑标签' : '添加标签'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            name="name"
            label="标签名称"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="请输入标签名称"
            required
          />

          {/* 颜色选择 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              标签颜色
            </label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color ? 'border-gray-900' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            {formData.color && (
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-sm text-gray-500">已选择:</span>
                <div
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: formData.color }}
                />
                <span className="text-sm text-gray-700">{formData.color}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              取消
            </button>
            <AuthButton
              type="submit"
              label={editingTag ? '更新标签' : '创建标签'}
              isLoading={isSubmitting}
            />
          </div>
        </form>
      </Modal>

      {/* 删除确认模态框 */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="删除标签"
        message={
          deletingTag?._count?.transactions && deletingTag._count.transactions > 0
            ? `标签"${deletingTag?.name}"正在被 ${deletingTag._count.transactions} 笔交易使用，无法删除。请先移除相关交易中的此标签。`
            : `确定要删除标签"${deletingTag?.name}"吗？此操作不可撤销。`
        }
        confirmLabel={
          deletingTag?._count?.transactions && deletingTag._count.transactions > 0
            ? '知道了'
            : '确认删除'
        }
        cancelLabel="取消"
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
