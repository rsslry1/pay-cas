import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

async function recomputeStudentBalances(tx: any, studentId: string) {
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

async function syncBillingAssignment(tx: any, billingId: string, studentId: string) {
  const assignment = await tx.billingAssignment.findUnique({
    where: {
      billingId_studentId: { billingId, studentId },
    },
  })

  if (!assignment) return

  const billing = await tx.billing.findUnique({
    where: { id: billingId },
    select: { amount: true },
  })

  if (!billing) return

  const [charges, payments] = await Promise.all([
    tx.transaction.findMany({
      where: { studentId, billingId, type: 'charge' },
      select: { amount: true },
    }),
    tx.transaction.findMany({
      where: { studentId, billingId, type: 'payment' },
      select: { amount: true },
    }),
  ])

  const totalCharges = charges.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0)
  const totalPayments = payments.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0)

  if (totalCharges <= 0 && totalPayments <= 0) {
    await tx.billingAssignment.delete({
      where: {
        billingId_studentId: { billingId, studentId },
      },
    })
    return
  }

  let status = 'pending'
  if (totalPayments >= billing.amount) {
    status = 'fully_paid'
  } else if (totalPayments > 0) {
    status = 'partially_paid'
  }

  await tx.billingAssignment.update({
    where: {
      billingId_studentId: { billingId, studentId },
    },
    data: { status },
  })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth('staff')
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const adminPassword = body?.adminPassword

    if (!adminPassword) {
      return NextResponse.json(
        { error: 'Admin password is required to delete a transaction' },
        { status: 400 }
      )
    }

    const adminUser = await db.user.findFirst({
      where: {
        role: 'admin',
        isActive: true,
        password: adminPassword,
      },
    })

    if (!adminUser) {
      return NextResponse.json({ error: 'Invalid admin password' }, { status: 403 })
    }

    const transaction = await db.transaction.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, studentId: true },
        },
        billing: {
          select: { id: true, title: true },
        },
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    await db.$transaction(async (tx) => {
      await tx.transaction.delete({
        where: { id },
      })

      await recomputeStudentBalances(tx, transaction.studentId)

      if (transaction.billingId) {
        await syncBillingAssignment(tx, transaction.billingId, transaction.studentId)
      }
    })

    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'delete',
        entity: 'transaction',
        entityId: id,
        details: JSON.stringify({
          permanentlyDeleted: true,
          overrideUsed: true,
          studentId: transaction.studentId,
          billingId: transaction.billingId,
          type: transaction.type,
          amount: transaction.amount,
        }),
      },
    })

    return NextResponse.json({ message: 'Transaction deleted permanently' })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Hard delete transaction error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
