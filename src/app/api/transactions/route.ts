import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}
    if (studentId) where.studentId = studentId
    if (type) where.type = type
    if (search) {
      where.OR = [
        { description: { contains: search } },
        { student: { firstName: { contains: search } } },
        { student: { lastName: { contains: search } } },
        { student: { studentId: { contains: search } } },
        { billing: { title: { contains: search } } },
      ]
    }

    if (user.role === 'student' && user.studentProfile) {
      where.studentId = user.studentProfile.id
    }

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, studentId: true },
          },
          billing: { select: { id: true, title: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.transaction.count({ where }),
    ])

    return NextResponse.json({
      transactions,
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
    console.error('List transactions error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth('staff')

    const body = await request.json()
    const { studentId, billingId, type, amount, description } = body

    if (!studentId || !type || amount === undefined) {
      return NextResponse.json({ error: 'studentId, type, and amount are required' }, { status: 400 })
    }

    if (!['charge', 'payment', 'adjustment'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type. Must be charge, payment, or adjustment' }, { status: 400 })
    }

    const student = await db.studentProfile.findUnique({ where: { id: studentId } })
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const normalizedAmount =
      type === 'adjustment' ? Number(amount) : Math.abs(Number(amount))

    if (Number.isNaN(normalizedAmount) || normalizedAmount === 0) {
      return NextResponse.json({ error: 'Amount must be a valid non-zero number' }, { status: 400 })
    }

    const lastTransaction = await db.transaction.findFirst({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    })

    const balanceBefore = lastTransaction ? lastTransaction.balanceAfter : 0
    let balanceAfter: number

    if (type === 'charge') {
      balanceAfter = balanceBefore + normalizedAmount
    } else if (type === 'payment') {
      balanceAfter = balanceBefore - normalizedAmount
    } else {
      balanceAfter = balanceBefore + normalizedAmount
    }

    const transaction = await db.transaction.create({
      data: {
        studentId,
        billingId: billingId || null,
        type,
        amount: normalizedAmount,
        description: description || null,
        balanceBefore,
        balanceAfter,
        createdById: authUser.id,
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, studentId: true },
        },
        billing: { select: { id: true, title: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    if (billingId && type === 'charge') {
      const assignment = await db.billingAssignment.findUnique({
        where: {
          billingId_studentId: { billingId, studentId },
        },
      })

      if (!assignment) {
        await db.billingAssignment.create({
          data: { billingId, studentId },
        })
      }
    }

    if (billingId && type === 'payment') {
      const assignment = await db.billingAssignment.findUnique({
        where: {
          billingId_studentId: { billingId, studentId },
        },
      })

      if (assignment) {
        const payments = await db.transaction.findMany({
          where: { studentId, billingId, type: 'payment' },
        })
        const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0)

        const billing = await db.billing.findUnique({ where: { id: billingId } })
        if (billing && totalPaid >= billing.amount) {
          await db.billingAssignment.update({
            where: {
              billingId_studentId: { billingId, studentId },
            },
            data: { status: 'fully_paid' },
          })
        } else if (totalPaid > 0) {
          await db.billingAssignment.update({
            where: {
              billingId_studentId: { billingId, studentId },
            },
            data: { status: 'partially_paid' },
          })
        }
      }
    }

    await db.notification.create({
      data: {
        userId: student.userId,
        title: type === 'charge' ? 'New Charge' : type === 'payment' ? 'Payment Recorded' : 'Balance Adjustment',
        message: `${type === 'charge' ? 'Charge' : type === 'payment' ? 'Payment' : 'Adjustment'} of PHP ${Math.abs(normalizedAmount).toLocaleString()} has been recorded.`,
        type: 'balance_updated',
      },
    })

    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'create',
        entity: 'transaction',
        entityId: transaction.id,
        details: JSON.stringify({ studentId, type, amount: normalizedAmount, balanceBefore, balanceAfter }),
      },
    })

    return NextResponse.json({ transaction }, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Create transaction error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
