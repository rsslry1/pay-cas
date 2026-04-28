import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth('staff')

    const body = await request.json()
    const { billingId, studentIds } = body

    if (!billingId || !studentIds || !Array.isArray(studentIds)) {
      return NextResponse.json({ error: 'billingId and studentIds array are required' }, { status: 400 })
    }

    const billing = await db.billing.findUnique({ where: { id: billingId } })
    if (!billing) {
      return NextResponse.json({ error: 'Billing not found' }, { status: 404 })
    }

    const results = []
    for (const studentId of studentIds) {
      // Check if already assigned
      const existing = await db.billingAssignment.findUnique({
        where: {
          billingId_studentId: { billingId, studentId },
        },
      })

      if (existing) {
        results.push({ studentId, status: 'already_assigned', assignmentId: existing.id })
        continue
      }

      // Create assignment
      const assignment = await db.billingAssignment.create({
        data: { billingId, studentId },
      })

      // Create charge transaction
      // Calculate current balance
      const lastTransaction = await db.transaction.findFirst({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
      })

      const balanceBefore = lastTransaction ? lastTransaction.balanceAfter : 0
      const balanceAfter = balanceBefore + billing.amount

      await db.transaction.create({
        data: {
          studentId,
          billingId,
          type: 'charge',
          amount: billing.amount,
          description: `Charge for ${billing.title}`,
          balanceBefore,
          balanceAfter,
          createdById: authUser.id,
        },
      })

      // Create notification for student
      const student = await db.studentProfile.findUnique({
        where: { id: studentId },
        include: { user: true },
      })

      if (student) {
        await db.notification.create({
          data: {
            userId: student.userId,
            title: 'New Billing Assigned',
            message: `You have been assigned: ${billing.title} - ₱${billing.amount.toLocaleString()}`,
            type: 'balance_updated',
            link: `/student/billing/${billingId}`,
          },
        })
      }

      results.push({ studentId, status: 'assigned', assignmentId: assignment.id })
    }

    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'create',
        entity: 'billing_assignment',
        entityId: billingId,
        details: JSON.stringify({ billingId, studentIds, count: studentIds.length }),
      },
    })

    return NextResponse.json({ results })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Assign billing error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
