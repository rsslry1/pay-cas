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

    const where: any = {}

    if (billingId) {
      where.billingId = billingId
    }

    where.status = { in: ['pending', 'partially_paid'] }

    const unpaidAssignments = await db.billingAssignment.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { email: true } },
          },
        },
        billing: {
          include: { feeCategory: true },
        },
      },
      orderBy: [{ student: { lastName: 'asc' } }],
    })

    // Filter by course/year if provided
    let filtered = unpaidAssignments
    if (course) {
      filtered = filtered.filter((a) => a.student.course === course)
    }
    if (year) {
      filtered = filtered.filter((a) => a.student.year === parseInt(year))
    }

    return NextResponse.json({
      unpaidStudents: filtered,
      total: filtered.length,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Unpaid students report error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
