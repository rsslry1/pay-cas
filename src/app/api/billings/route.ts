import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const academicYear = searchParams.get('academicYear')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}

    if (status) where.status = status
    if (academicYear) where.academicYear = academicYear
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ]
    }

    const [billings, total] = await Promise.all([
      db.billing.findMany({
        where,
        include: {
          feeCategory: true,
          _count: {
            select: { assignments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.billing.count({ where }),
    ])

    return NextResponse.json({
      billings,
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
    console.error('List billings error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth('staff')

    const body = await request.json()
    const { title, description, amount, dueDate, feeCategoryId, academicYear, semester } = body

    if (!title || amount === undefined) {
      return NextResponse.json({ error: 'Title and amount are required' }, { status: 400 })
    }

    const billing = await db.billing.create({
      data: {
        title,
        description: description || null,
        amount: parseFloat(amount),
        dueDate: dueDate ? new Date(dueDate) : null,
        feeCategoryId: feeCategoryId || null,
        academicYear: academicYear || null,
        semester: semester || null,
      },
      include: { feeCategory: true },
    })

    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'create',
        entity: 'billing',
        entityId: billing.id,
        details: JSON.stringify({ title, amount: billing.amount }),
      },
    })

    return NextResponse.json({ billing }, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Create billing error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
