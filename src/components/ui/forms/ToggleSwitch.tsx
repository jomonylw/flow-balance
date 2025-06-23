'use client'

import { COMPONENT_SIZE, SHADOW } from '@/lib/constants/dimensions'
import { COLORS } from '@/types/core/constants'

interface ToggleSwitchProps {
  name: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  help?: string
}

export default function ToggleSwitch({
  name,
  label,
  checked,
  onChange,
  disabled = false,
  className = '',
  help,
}: ToggleSwitchProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className='flex items-center justify-between'>
        <label
          htmlFor={name}
          className='block text-sm font-medium text-gray-700 dark:text-gray-300'
        >
          {label}
        </label>

        <button
          type='button'
          id={name}
          role='switch'
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`toggle-switch ${checked ? 'toggle-switch--checked' : ''} ${disabled ? 'toggle-switch--disabled' : ''}`}
        >
          <span className='sr-only'>{label}</span>
          <span className='toggle-switch__thumb' />
        </button>

        {/* 自定义样式 */}
        {/* eslint-disable-next-line react/no-unknown-property */}
        <style jsx={true}>{`
          .toggle-switch {
            position: relative;
            display: inline-flex;
            align-items: center;
            flex-shrink: 0;
            cursor: pointer;
            border-radius: 9999px;
            border: 2px solid transparent;
            transition: all 0.3s ease-in-out;
            outline: none;
            box-shadow: ${SHADOW.SM};

            /* 统一尺寸 - PC端和移动端一致 */
            height: ${COMPONENT_SIZE.TOGGLE.HEIGHT}px !important;
            width: ${COMPONENT_SIZE.TOGGLE.WIDTH}px;
            padding: ${COMPONENT_SIZE.TOGGLE.PADDING}px;

            /* 移动端高度覆盖全局样式 */
            min-height: ${COMPONENT_SIZE.TOGGLE.HEIGHT}px !important;
            max-height: ${COMPONENT_SIZE.TOGGLE.HEIGHT}px !important;

            /* 默认状态 */
            background: ${COLORS.GRAY_200};
          }

          .dark .toggle-switch {
            background: ${COLORS.GRAY_600};
          }

          .toggle-switch:hover:not(.toggle-switch--disabled) {
            background: ${COLORS.GRAY_300};
          }

          .dark .toggle-switch:hover:not(.toggle-switch--disabled) {
            background: ${COLORS.GRAY_500};
          }

          .toggle-switch:focus {
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2), 0 0 0 4px rgba(59, 130, 246, 0.1);
          }

          /* 选中状态 */
          .toggle-switch--checked {
            background: ${COLORS.PRIMARY};
            box-shadow: ${SHADOW.SM};
          }

          .toggle-switch--checked:hover:not(.toggle-switch--disabled) {
            background: ${COLORS.PRIMARY};
            box-shadow: ${SHADOW.MD};
          }

          /* 禁用状态 */
          .toggle-switch--disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          /* 小球样式 - 与Slider保持一致 */
          .toggle-switch__thumb {
            display: inline-block;
            border-radius: 50%;
            background: white;
            border: 2px solid ${COLORS.BACKGROUND};
            box-shadow: ${SHADOW.SM};
            transition: all 0.3s ease-in-out;
            pointer-events: none;

            /* 统一小球尺寸 */
            height: ${COMPONENT_SIZE.TOGGLE.THUMB_SIZE}px;
            width: ${COMPONENT_SIZE.TOGGLE.THUMB_SIZE}px;

            /* 默认位置 */
            transform: translateX(0);
          }

          /* 选中状态的小球 */
          .toggle-switch--checked .toggle-switch__thumb {
            background: white;
            border: 2px solid ${COLORS.BACKGROUND};
            box-shadow: ${SHADOW.MD};
            transform: translateX(${COMPONENT_SIZE.TOGGLE.WIDTH - COMPONENT_SIZE.TOGGLE.THUMB_SIZE - (COMPONENT_SIZE.TOGGLE.PADDING * 2)}px);
          }

          /* 暗色主题下的小球 */
          .dark .toggle-switch__thumb {
            border: 2px solid ${COLORS.BACKGROUND_DARK};
          }

          .dark .toggle-switch--checked .toggle-switch__thumb {
            border: 2px solid ${COLORS.BACKGROUND_DARK};
          }

          /* 小球hover效果 - 与Slider一致 */
          .toggle-switch:hover:not(.toggle-switch--disabled) .toggle-switch__thumb {
            box-shadow: ${SHADOW.MD};
          }

          .toggle-switch--checked:hover:not(.toggle-switch--disabled) .toggle-switch__thumb {
            box-shadow: ${SHADOW.LG};
          }
        `}</style>
      </div>

      {help && (
        <p className='text-sm text-gray-500 dark:text-gray-400'>{help}</p>
      )}
    </div>
  )
}
