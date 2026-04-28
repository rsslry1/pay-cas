import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const receipt = await db.receipt.findUnique({
      where: { id },
      include: {
        billing: {
          select: { id: true, title: true },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentId: true,
            user: { select: { email: true } },
          },
        },
        reviewedBy: { select: { id: true, name: true } },
        payments: {
          include: {
            processedBy: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }

    // Students can only see their own receipts
    if (user.role === 'student' && user.studentProfile && user.studentProfile.id !== receipt.studentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ receipt })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get receipt error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
