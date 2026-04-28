import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getSession()

    if (user) {
      // Delete the session from the database
      const cookieStore = await request.cookies
      const token = cookieStore.get('session_token')?.value
      if (token) {
        await db.systemSetting.deleteMany({
          where: { key: `session:${token}` },
        })

        // Audit log
        await db.auditLog.create({
          data: {
            userId: user.id,
            action: 'logout',
            entity: 'user',
            entityId: user.id,
          },
        })
      }
    }

    const response = NextResponse.json({ message: 'Logged out successfully' })
    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
