import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    await requireAuth('staff')

    const { searchParams } = new URL(request.url)
    const course = searchParams.get('course')
    const year = searchParams.get('year')
    const billingId = searchParams.get('billingId')

    const studentWhere: any = {
      status: 'active',
      billingAssignments: {
        some: {
          status: { in: ['pending', 'partially_paid'] },
          ...(billingId ? { billingId } : {}),
        },
      },
    }

    if (course) studentWhere.course = course
    if (year) studentWhere.year = parseInt(year)

    const matchingStudents = await db.studentProfile.findMany({
      where: studentWhere,
      include: {
        billingAssignments: {
          where: {
            status: { in: ['pending', 'partially_paid'] },
            ...(billingId ? { billingId } : {}),
          },
          include: {
            billing: true,
          },
        },
      },
      orderBy: [{ lastName: 'asc' }],
    })

    const unpaidStudents = await Promise.all(
      matchingStudents.map(async (student) => {
        const transactions = await db.transaction.findMany({
          where: {
            studentId: student.id,
            ...(billingId ? { billingId } : {}),
          },
          select: { type: true, amount: true },
        })

        const charges = transactions
          .filter((t) => t.type === 'charge')
          .reduce((sum, t) => sum + t.amount, 0)
        const payments = transactions
          .filter((t) => t.type === 'payment')
          .reduce((sum, t) => sum + t.amount, 0)
        const adjustments = transactions
          .filter((t) => t.type === 'adjustment')
          .reduce((sum, t) => sum + t.amount, 0)

        return {
          id: student.id,
          studentId: student.studentId,
          name: `${student.firstName} ${student.lastName}`,
          course: student.course || '-',
          year: student.year || 0,
          outstandingBalance: charges - payments + adjustments,
          billingTitle:
            billingId && student.billingAssignments.length > 0
              ? student.billingAssignments[0].billing.title
              : undefined,
        }
      })
    )

    return NextResponse.json({
      unpaidStudents: unpaidStudents.filter((student) => student.outstandingBalance > 0),
      total: unpaidStudents.filter((student) => student.outstandingBalance > 0).length,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Unpaid students report error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
