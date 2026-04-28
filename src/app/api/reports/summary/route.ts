import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    await requireAuth('staff')

    const [
      totalStudents,
      totalBillings,
      totalTransactions,
      totalReceipts,
      totalPayments,
      pendingReceipts,
    ] = await Promise.all([
      db.studentProfile.count({ where: { status: 'active' } }),
      db.billing.count({ where: { status: 'active' } }),
      db.transaction.count(),
      db.receipt.count(),
      db.payment.count(),
      db.receipt.count({ where: { status: 'pending' } }),
    ])

    // Calculate financial totals
    const chargeTransactions = await db.transaction.findMany({ where: { type: 'charge' } })
    const paymentTransactions = await db.transaction.findMany({ where: { type: 'payment' } })
    const adjustmentTransactions = await db.transaction.findMany({ where: { type: 'adjustment' } })

    const totalCharges = chargeTransactions.reduce((sum, t) => sum + t.amount, 0)
    const totalCollected = paymentTransactions.reduce((sum, t) => sum + t.amount, 0)
    const totalAdjustments = adjustmentTransactions.reduce((sum, t) => sum + t.amount, 0)
    const outstandingBalance = totalCharges - totalCollected + totalAdjustments

    // Assignment stats
    const assignmentStats = await db.billingAssignment.groupBy({
      by: ['status'],
      _count: true,
    })

    const assignmentCounts: Record<string, number> = {
      pending: 0,
      partially_paid: 0,
      fully_paid: 0,
      waived: 0,
    }
    assignmentStats.forEach((s) => {
      assignmentCounts[s.status] = s._count
    })

    // Recent transactions (last 10)
    const recentTransactions = await db.transaction.findMany({
      take: 10,
      include: {
        student: { select: { firstName: true, lastName: true, studentId: true } },
        billing: { select: { title: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      summary: {
        totalStudents,
        totalBillings,
        totalTransactions,
        totalReceipts,
        totalPayments,
        pendingReceipts,
        totalCharges,
        totalCollected,
        totalAdjustments,
        outstandingBalance,
      },
      assignmentCounts,
      recentTransactions,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Report summary error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
