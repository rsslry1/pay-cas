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
      students,
    ] = await Promise.all([
      db.studentProfile.count({ where: { status: 'active' } }),
      db.billing.count({ where: { status: 'active' } }),
      db.transaction.count(),
      db.receipt.count(),
      db.payment.count(),
      db.receipt.count({ where: { status: 'pending' } }),
      db.studentProfile.findMany({
        where: { status: 'active' },
        select: { id: true, course: true },
      }),
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

    const paidStudents = await db.studentProfile.count({
      where: {
        status: 'active',
        billingAssignments: {
          some: { status: 'fully_paid' },
        },
      },
    })

    const unpaidStudents = await db.studentProfile.count({
      where: {
        status: 'active',
        billingAssignments: {
          some: { status: { in: ['pending', 'partially_paid'] } },
        },
      },
    })

    const collectionsByCourseMap = new Map<string, number>()
    const outstandingByCourseMap = new Map<string, number>()

    for (const student of students) {
      const courseKey = student.course || 'Unassigned'
      const studentCharges = chargeTransactions
        .filter((t) => t.studentId === student.id)
        .reduce((sum, t) => sum + t.amount, 0)
      const studentPayments = paymentTransactions
        .filter((t) => t.studentId === student.id)
        .reduce((sum, t) => sum + t.amount, 0)
      const studentAdjustments = adjustmentTransactions
        .filter((t) => t.studentId === student.id)
        .reduce((sum, t) => sum + t.amount, 0)
      const studentOutstanding = studentCharges - studentPayments + studentAdjustments

      collectionsByCourseMap.set(
        courseKey,
        (collectionsByCourseMap.get(courseKey) || 0) + studentPayments
      )
      outstandingByCourseMap.set(
        courseKey,
        (outstandingByCourseMap.get(courseKey) || 0) + studentOutstanding
      )
    }

    const collectionsByCourse = Array.from(collectionsByCourseMap.entries()).map(([course, total]) => ({
      course,
      total,
    }))

    const outstandingByCourse = Array.from(outstandingByCourseMap.entries()).map(([course, total]) => ({
      course,
      total,
    }))

    const collectionsByMonthMap = new Map<string, number>()
    for (const payment of paymentTransactions) {
      const date = new Date(payment.createdAt)
      const month = date.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })
      collectionsByMonthMap.set(month, (collectionsByMonthMap.get(month) || 0) + payment.amount)
    }

    const collectionsOverTime = Array.from(collectionsByMonthMap.entries()).map(([month, total]) => ({
      month,
      total,
    }))

    const paymentStatusDistribution = [
      { status: 'Pending', count: assignmentCounts.pending || 0 },
      { status: 'Partially Paid', count: assignmentCounts.partially_paid || 0 },
      { status: 'Fully Paid', count: assignmentCounts.fully_paid || 0 },
      { status: 'Waived', count: assignmentCounts.waived || 0 },
    ].filter((item) => item.count > 0)

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
        totalCollections: totalCollected,
        paidStudents,
        unpaidStudents,
        collectionsOverTime,
        outstandingByCourse,
        paymentStatusDistribution,
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
