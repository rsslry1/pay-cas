import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params

    const assignments = await db.billingAssignment.findMany({
      where: { billingId: id },
      include: {
        student: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    })

    return NextResponse.json({ assignments })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get assignments error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
