import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    await requireAuth()

    const academicYears = await db.academicYear.findMany({
      orderBy: { year: 'desc' },
    })

    return NextResponse.json({ academicYears })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('List academic years error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth('admin')

    const body = await request.json()
    const { year, startDate, endDate, isCurrent } = body

    if (!year || !startDate || !endDate) {
      return NextResponse.json({ error: 'Year, startDate, and endDate are required' }, { status: 400 })
    }

    // If this is set as current, unset all others
    if (isCurrent) {
      await db.academicYear.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      })
    }

    const academicYear = await db.academicYear.create({
      data: {
        year,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isCurrent: isCurrent || false,
      },
    })

    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'create',
        entity: 'academic_year',
        entityId: academicYear.id,
        details: JSON.stringify({ year }),
      },
    })

    return NextResponse.json({ academicYear }, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Create academic year error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
