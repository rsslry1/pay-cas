import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const studentIdFilter = searchParams.get('studentId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}

    // Students can only see their own payments
    if (user.role === 'student' && user.studentProfile) {
      where.studentId = user.studentProfile.id
    } else if (studentIdFilter) {
      where.studentId = studentIdFilter
    }

    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentId: true,
            },
          },
          receipt: {
            select: {
              id: true,
              imageUrl: true,
              submittedAt: true,
              status: true,
            },
          },
          processedBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { processedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.payment.count({ where }),
    ])

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('List payments error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
