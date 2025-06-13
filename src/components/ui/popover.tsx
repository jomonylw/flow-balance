'use client'

import React, { useState, useRef, useEffect } from 'react'

interface PopoverProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function Popover({ open, onOpenChange, children }: PopoverProps) {
  const [isOpen, setIsOpen] = useState(open || false)
  const popoverRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open)
    }
  }, [open])
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        const newOpen = false
        setIsOpen(newOpen)
        if (onOpenChange) {
          onOpenChange(newOpen)
        }
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onOpenChange])
  
  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen)
    if (onOpenChange) {
      onOpenChange(newOpen)
    }
  }
  
  return (
    <div ref={popoverRef} className="relative">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === PopoverTrigger) {
            return React.cloneElement(child, { 
              onClick: () => handleOpenChange(!isOpen),
              isOpen 
            } as any)
          }
          if (child.type === PopoverContent) {
            return isOpen ? React.cloneElement(child, { isOpen } as any) : null
          }
        }
        return child
      })}
    </div>
  )
}

interface PopoverTriggerProps {
  asChild?: boolean
  children: React.ReactNode
  onClick?: () => void
  isOpen?: boolean
}

export function PopoverTrigger({ asChild, children, onClick }: PopoverTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e: React.MouseEvent) => {
        e.preventDefault()
        if (onClick) onClick()
        if (children.props && typeof children.props === 'object' && 'onClick' in children.props && typeof children.props.onClick === 'function') {
          children.props.onClick(e)
        }
      }
    } as any)
  }
  
  return (
    <button onClick={onClick}>
      {children}
    </button>
  )
}

interface PopoverContentProps {
  className?: string
  align?: 'start' | 'center' | 'end'
  children: React.ReactNode
  isOpen?: boolean
}

export function PopoverContent({ 
  className = '', 
  align = 'center', 
  children 
}: PopoverContentProps) {
  const alignClasses = {
    start: 'left-0',
    center: 'left-1/2 transform -translate-x-1/2',
    end: 'right-0'
  }
  
  return (
    <div
      className={`absolute top-full mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg ${alignClasses[align]} ${className}`}
    >
      {children}
    </div>
  )
}
