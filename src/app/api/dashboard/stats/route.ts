import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const user = await requireAuth('staff')

    const [
      totalStudents,
      activeStudents,
      totalBillings,
      activeBillings,
      pendingReceipts,
      totalPayments,
      recentTransactions,
    ] = await Promise.all([
      db.studentProfile.count(),
      db.studentProfile.count({ where: { status: 'active' } }),
      db.billing.count(),
      db.billing.count({ where: { status: 'active' } }),
      db.receipt.count({ where: { status: 'pending' } }),
      db.payment.count(),
      db.transaction.findMany({
        take: 5,
        include: {
          student: { select: { firstName: true, lastName: true, studentId: true } },
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    // Financial summary
    const charges = await db.transaction.findMany({ where: { type: 'charge' } })
    const payments = await db.transaction.findMany({ where: { type: 'payment' } })
    const totalCharges = charges.reduce((sum, t) => sum + t.amount, 0)
    const totalCollected = payments.reduce((sum, t) => sum + t.amount, 0)
    const outstandingBalance = totalCharges - totalCollected

    // Billing assignment stats
    const pendingAssignments = await db.billingAssignment.count({ where: { status: 'pending' } })
    const paidAssignments = await db.billingAssignment.count({ where: { status: 'fully_paid' } })

    // Students by course
    const courseStats = await db.studentProfile.groupBy({
      by: ['course'],
      where: { status: 'active', course: { not: null } },
      _count: true,
    })

    // Students by year
    const yearStats = await db.studentProfile.groupBy({
      by: ['year'],
      where: { status: 'active', year: { not: null } },
      _count: true,
    })

    return NextResponse.json({
      stats: {
        totalStudents,
        activeStudents,
        totalBillings,
        activeBillings,
        pendingReceipts,
        totalPayments,
        totalCharges,
        totalCollected,
        outstandingBalance,
        pendingAssignments,
        paidAssignments,
      },
      recentTransactions,
      courseStats,
      yearStats,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
