import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params

    const billing = await db.billing.findUnique({
      where: { id },
      include: {
        feeCategory: true,
        assignments: {
          include: {
            student: {
              include: {
                user: { select: { id: true, email: true, name: true } },
              },
            },
          },
        },
        transactions: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, studentId: true } },
          },
        },
      },
    })

    if (!billing) {
      return NextResponse.json({ error: 'Billing not found' }, { status: 404 })
    }

    return NextResponse.json({ billing })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get billing error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth('staff')
    const { id } = await params
    const body = await request.json()

    const existing = await db.billing.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Billing not found' }, { status: 404 })
    }

    const { title, description, amount, dueDate, feeCategoryId, academicYear, semester, status } = body

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (feeCategoryId !== undefined) updateData.feeCategoryId = feeCategoryId
    if (academicYear !== undefined) updateData.academicYear = academicYear
    if (semester !== undefined) updateData.semester = semester
    if (status !== undefined) updateData.status = status

    const billing = await db.billing.update({
      where: { id },
      data: updateData,
      include: { feeCategory: true },
    })

    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'update',
        entity: 'billing',
        entityId: id,
        details: JSON.stringify(updateData),
      },
    })

    return NextResponse.json({ billing })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Update billing error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth('admin')
    const { id } = await params

    const existing = await db.billing.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Billing not found' }, { status: 404 })
    }

    await db.billing.update({
      where: { id },
      data: { status: 'archived' },
    })

    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'delete',
        entity: 'billing',
        entityId: id,
        details: JSON.stringify({ title: existing.title, archived: true }),
      },
    })

    return NextResponse.json({ message: 'Billing archived' })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Delete billing error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
