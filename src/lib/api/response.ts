import type { ApiResponse } from '@/types/api'
import { NextResponse } from 'next/server'
import { getCommonError } from '@/lib/constants/api-messages'

export function successResponse<T>(
  data: T,
  message?: string
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message,
  })
}

export function errorResponse(
  error: string,
  status: number = 400
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  )
}

export function unauthorizedResponse(): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: getCommonError('UNAUTHORIZED'),
    },
    { status: 401 }
  )
}

export function notFoundResponse(
  message: string = getCommonError('NOT_FOUND')
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status: 404 }
  )
}

export function validationErrorResponse(
  message: string
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status: 422 }
  )
}
