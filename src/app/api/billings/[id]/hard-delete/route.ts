import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth('admin')
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const adminPassword = body?.adminPassword

    const existing = await db.billing.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assignments: true,
            transactions: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Billing not found' }, { status: 404 })
    }

    const hasDependencies =
      existing._count.assignments > 0 || existing._count.transactions > 0

    if (hasDependencies && authUser.password !== adminPassword) {
      return NextResponse.json(
        { error: 'Admin password is required to override and delete a billing with assignments or transactions' },
        { status: 400 }
      )
    }

    const affectedStudents = await db.transaction.findMany({
      where: { billingId: id },
      select: { studentId: true },
      distinct: ['studentId'],
    })

    const assignedStudents = await db.billingAssignment.findMany({
      where: { billingId: id },
      select: { studentId: true },
      distinct: ['studentId'],
    })

    const affectedStudentIds = Array.from(
      new Set([
        ...affectedStudents.map((item) => item.studentId),
        ...assignedStudents.map((item) => item.studentId),
      ])
    )

    await db.$transaction(async (tx) => {
      await tx.transaction.deleteMany({
        where: { billingId: id },
      })

      await tx.billingAssignment.deleteMany({
        where: { billingId: id },
      })

      await tx.billing.delete({
        where: { id },
      })

      for (const studentId of affectedStudentIds) {
        const remainingTransactions = await tx.transaction.findMany({
          where: { studentId },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        })

        let runningBalance = 0
        for (const transaction of remainingTransactions) {
          const balanceBefore = runningBalance
          let balanceAfter = balanceBefore

          if (transaction.type === 'charge') {
            balanceAfter = balanceBefore + Math.abs(transaction.amount)
          } else if (transaction.type === 'payment') {
            balanceAfter = balanceBefore - Math.abs(transaction.amount)
          } else {
            balanceAfter = balanceBefore + transaction.amount
          }

          await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              balanceBefore,
              balanceAfter,
            },
          })

          runningBalance = balanceAfter
        }
      }
    })

    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'delete',
        entity: 'billing',
        entityId: id,
        details: JSON.stringify({
          title: existing.title,
          permanentlyDeleted: true,
          overrideUsed: hasDependencies,
        }),
      },
    })

    return NextResponse.json({ message: 'Billing deleted permanently' })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Hard delete billing error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
