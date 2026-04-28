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

    const receipt = await db.receipt.findUnique({
      where: { id },
      include: {
        payments: true,
      },
    })

    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }

    const hasDependencies = receipt.payments.length > 0

    if (hasDependencies) {
      if (!adminPassword) {
        return NextResponse.json(
          { error: 'Admin password is required to override and delete a processed receipt' },
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
    }

    await db.$transaction(async (tx) => {
      await tx.payment.deleteMany({
        where: { receiptId: id },
      })

      await tx.transaction.deleteMany({
        where: { referenceId: id },
      })

      await tx.receipt.delete({
        where: { id },
      })

      const remainingTransactions = await tx.transaction.findMany({
        where: { studentId: receipt.studentId },
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
        entity: 'receipt',
        entityId: id,
        details: JSON.stringify({
          permanentlyDeleted: true,
          overrideUsed: hasDependencies,
          receiptStatus: receipt.status,
        }),
      },
    })

    return NextResponse.json({ message: 'Receipt deleted permanently' })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Hard delete receipt error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
