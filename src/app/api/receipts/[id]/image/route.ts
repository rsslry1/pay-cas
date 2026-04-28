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
      select: { id: true, imageUrl: true, studentId: true },
    })

    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }

    // Students can only access their own receipts
    if (user.role === 'student' && user.studentProfile && user.studentProfile.id !== receipt.studentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // For now, return the imageUrl since we don't have actual file storage
    return NextResponse.json({ imageUrl: receipt.imageUrl })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get receipt image error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
