'use client'

import { useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import ConfirmationModal from '@/components/ui/ConfirmationModal'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'

export default function TestModalsPage() {
  const { showSuccess, showError, showWarning, showInfo } = useToast()
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const handleToastTests = () => {
    showSuccess('操作成功', '数据已成功保存到数据库')
    setTimeout(() => showError('操作失败', '网络连接超时，请检查您的网络连接后重试'), 1000)
    setTimeout(() => showWarning('注意', '您有未保存的更改，离开页面前请先保存'), 2000)
    setTimeout(() => showInfo('提示', '系统将在5分钟后进行维护，请及时保存您的工作'), 3000)
  }

  const handleLongToastTest = () => {
    showError('数据验证失败', '输入的数据格式不正确，请检查以下字段：用户名必须为3-20个字符，密码必须包含大小写字母和数字，邮箱格式必须正确')
  }

  const handleConfirmAction = () => {
    setShowConfirmModal(false)
    showSuccess('确认成功', '您点击了确认按钮')
  }

  const handleDeleteAction = () => {
    setShowDeleteModal(false)
    showSuccess('删除成功', '项目已删除')
  }

  const handleClearAndDelete = () => {
    setShowDeleteModal(false)
    showSuccess('清空并删除成功', '相关数据已清空，项目已删除')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">弹窗系统测试</h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Toast 通知测试</h2>
            <div className="space-x-4">
              <button
                onClick={handleToastTests}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                测试 Toast 通知
              </button>
              <button
                onClick={handleLongToastTest}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                测试长文本通知
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              第一个按钮将依次显示四种类型的通知，第二个按钮测试长文本截断效果
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">确认模态框测试</h2>
            <div className="space-x-4">
              <button
                onClick={() => setShowConfirmModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                普通确认对话框
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              测试带图标和样式的确认对话框
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">删除确认模态框测试</h2>
            <div className="space-x-4">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                复杂删除对话框
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              测试带相关数据清理选项的删除确认对话框
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-800 mb-2">优化说明</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 替换了所有 confirm() 和 alert() 弹窗</li>
              <li>• Toast 通知从顶部中央弹出，横向显示</li>
              <li>• 支持长文本自动截断和响应式布局</li>
              <li>• 提供了美观的确认模态框</li>
              <li>• 支持复杂的删除场景处理</li>
              <li>• 改善了整体用户体验和视觉美感</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 确认模态框 */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        title="确认操作"
        message="您确定要执行此操作吗？此操作可能会影响相关数据。"
        confirmLabel="确认执行"
        cancelLabel="取消"
        onConfirm={handleConfirmAction}
        onCancel={() => setShowConfirmModal(false)}
        variant="warning"
      />

      {/* 删除确认模态框 */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        title="删除项目"
        itemName="测试项目"
        itemType="项目"
        onConfirm={handleDeleteAction}
        onCancel={() => setShowDeleteModal(false)}
        hasRelatedData={true}
        relatedDataMessage="该项目存在相关的数据记录，需要先清空相关数据才能删除。"
        onClearRelatedData={handleClearAndDelete}
        clearDataLabel="清空相关数据并删除"
      />
    </div>
  )
}
