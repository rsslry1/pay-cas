import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    await requireAuth('staff')

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

    const activeStudentsWithCourse = await db.studentProfile.findMany({
      where: { status: 'active', course: { not: null } },
      select: { id: true, course: true },
    })

    const collectionsByCourseMap = new Map<string, number>()
    for (const student of activeStudentsWithCourse) {
      const studentPayments = payments
        .filter((payment) => payment.studentId === student.id)
        .reduce((sum, payment) => sum + payment.amount, 0)

      const courseKey = student.course || 'Unassigned'
      collectionsByCourseMap.set(
        courseKey,
        (collectionsByCourseMap.get(courseKey) || 0) + studentPayments
      )
    }

    const collectionsByCourse = Array.from(collectionsByCourseMap.entries()).map(
      ([course, total]) => ({
        course,
        total,
      })
    )

    return NextResponse.json({
      totalStudents,
      activeStudents,
      totalBillings,
      activeBillings,
      pendingReceipts,
      totalPayments,
      totalCharges,
      totalCollections: totalCollected,
      totalCollected,
      outstandingBalance,
      pendingAssignments,
      paidAssignments,
      recentTransactions,
      collectionsByCourse,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
