import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const studentIdFilter = searchParams.get('studentId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}

    // Students can only see their own receipts
    if (user.role === 'student' && user.studentProfile) {
      where.studentId = user.studentProfile.id
    } else if (studentIdFilter) {
      where.studentId = studentIdFilter
    }

    if (status) where.status = status

    const [receipts, total] = await Promise.all([
      db.receipt.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentId: true,
              user: { select: { email: true } },
            },
          },
          reviewedBy: {
            select: { id: true, name: true },
          },
          payments: true,
        },
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.receipt.count({ where }),
    ])

    return NextResponse.json({
      receipts,
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
    console.error('List receipts error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const body = await request.json()
    const { studentId, imageUrl, imageStorageKey } = body

    if (!studentId || !imageUrl) {
      return NextResponse.json({ error: 'studentId and imageUrl are required' }, { status: 400 })
    }

    // Students can only create receipts for themselves
    if (user.role === 'student' && user.studentProfile) {
      if (user.studentProfile.id !== studentId) {
        return NextResponse.json({ error: 'Cannot create receipt for another student' }, { status: 403 })
      }
    }

    const receipt = await db.receipt.create({
      data: {
        studentId,
        imageUrl,
        imageStorageKey: imageStorageKey || null,
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, studentId: true },
        },
      },
    })

    // Notify admins
    const admins = await db.user.findMany({
      where: { role: { in: ['admin', 'staff'] }, isActive: true },
    })

    for (const admin of admins) {
      await db.notification.create({
        data: {
          userId: admin.id,
          title: 'New Receipt Submitted',
          message: `A new payment receipt has been submitted.`,
          type: 'receipt_submitted',
          link: `/receipts/${receipt.id}`,
        },
      })
    }

    return NextResponse.json({ receipt }, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Create receipt error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
