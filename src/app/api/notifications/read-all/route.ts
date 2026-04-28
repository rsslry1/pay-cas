import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function PATCH() {
  try {
    const user = await requireAuth()

    const result = await db.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    })

    return NextResponse.json({
      message: 'All notifications marked as read',
      count: result.count,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Mark all notifications read error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
