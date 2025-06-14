'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import InputField from '@/components/ui/InputField'
import AuthButton from '@/components/ui/AuthButton'
import { useToast } from '@/contexts/ToastContext'

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
          editingTag ? '更新成功' : '创建成功',
          editingTag ? '标签已更新' : '标签已创建'
        )
        onSuccess(result.data)
        onClose()
      } else {
        showError(
          editingTag ? '更新失败' : '创建失败',
          result.error || '操作失败'
        )
      }
    } catch (error) {
      console.error('Error saving tag:', error)
      showError(
        editingTag ? '更新失败' : '创建失败',
        '网络错误，请稍后重试'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
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
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  formData.color === color ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-1' : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color }}
                title={color}
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
            onClick={onClose}
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
  )
}
