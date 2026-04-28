import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

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
        { error: 'Admin password is required to delete a payment' },
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

    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        receipt: true,
      },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    await db.$transaction(async (tx) => {
      await tx.transaction.deleteMany({
        where: { referenceId: payment.receiptId },
      })

      await tx.payment.delete({
        where: { id },
      })

      await tx.receipt.deleteMany({
        where: { id: payment.receiptId },
      })

      const remainingTransactions = await tx.transaction.findMany({
        where: { studentId: payment.studentId },
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
    })

    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'delete',
        entity: 'payment',
        entityId: id,
        details: JSON.stringify({
          permanentlyDeleted: true,
          overrideUsed: true,
          receiptId: payment.receiptId,
          amount: payment.amount,
        }),
      },
    })

    return NextResponse.json({ message: 'Payment and linked receipt deleted permanently' })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Hard delete payment error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
