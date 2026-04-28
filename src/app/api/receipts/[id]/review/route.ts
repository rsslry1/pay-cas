import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth('staff')
    const { id } = await params
    const body = await request.json()

    const { status, adminNotes, paymentAmount } = body

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Status must be approved or rejected' }, { status: 400 })
    }

    const receipt = await db.receipt.findUnique({ where: { id } })
    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }

    // Update receipt
    const updatedReceipt = await db.receipt.update({
      where: { id },
      data: {
        status,
        adminNotes: adminNotes || null,
        reviewedById: authUser.id,
        reviewedAt: new Date(),
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, userId: true },
        },
      },
    })

    // If approved and payment amount provided, create payment and transaction
    if (status === 'approved' && paymentAmount) {
      // Create payment
      await db.payment.create({
        data: {
          studentId: receipt.studentId,
          receiptId: receipt.id,
          amount: parseFloat(paymentAmount),
          processedById: authUser.id,
        },
      })

      // Create payment transaction
      const lastTransaction = await db.transaction.findFirst({
        where: { studentId: receipt.studentId },
        orderBy: { createdAt: 'desc' },
      })

      const balanceBefore = lastTransaction ? lastTransaction.balanceAfter : 0
      const balanceAfter = balanceBefore - parseFloat(paymentAmount)

      await db.transaction.create({
        data: {
          studentId: receipt.studentId,
          referenceId: receipt.id,
          type: 'payment',
          amount: parseFloat(paymentAmount),
          description: `Payment via receipt ${receipt.id.substring(0, 8)}`,
          balanceBefore,
          balanceAfter,
          createdById: authUser.id,
        },
      })

      // Update billing assignment statuses
      const assignments = await db.billingAssignment.findMany({
        where: { studentId: receipt.studentId, status: { in: ['pending', 'partially_paid'] } },
        include: { billing: true },
      })

      for (const assignment of assignments) {
        const payments = await db.transaction.findMany({
          where: { studentId: assignment.studentId, billingId: assignment.billingId, type: 'payment' },
        })
        const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0)
        if (totalPaid >= assignment.billing.amount) {
          await db.billingAssignment.update({
            where: {
              billingId_studentId: { billingId: assignment.billingId, studentId: assignment.studentId },
            },
            data: { status: 'fully_paid' },
          })
        } else {
          await db.billingAssignment.update({
            where: {
              billingId_studentId: { billingId: assignment.billingId, studentId: assignment.studentId },
            },
            data: { status: 'partially_paid' },
          })
        }
      }

      // Notify student
      await db.notification.create({
        data: {
          userId: updatedReceipt.student.userId,
          title: 'Receipt Approved',
          message: `Your payment receipt has been approved. Amount: ₱${parseFloat(paymentAmount).toLocaleString()}`,
          type: 'receipt_approved',
        },
      })
    } else if (status === 'rejected') {
      // Notify student
      await db.notification.create({
        data: {
          userId: updatedReceipt.student.userId,
          title: 'Receipt Rejected',
          message: `Your payment receipt has been rejected.${adminNotes ? ` Reason: ${adminNotes}` : ''}`,
          type: 'receipt_rejected',
        },
      })
    }

    // Audit log
    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: status === 'approved' ? 'approve' : 'reject',
        entity: 'receipt',
        entityId: id,
        details: JSON.stringify({ status, adminNotes, paymentAmount }),
      },
    })

    return NextResponse.json({ receipt: updatedReceipt })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Review receipt error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
