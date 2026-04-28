import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session_token')?.value
  if (!token) return null

  const setting = await db.systemSetting.findUnique({
    where: { key: `session:${token}` },
  })
  if (!setting) return null

  const user = await db.user.findUnique({
    where: { id: setting.value },
    include: { studentProfile: true },
  })
  return user
}

export async function requireAuth(requiredRole?: string) {
  const user = await getSession()
  if (!user) throw new Error('Unauthorized')
  if (!user.isActive) throw new Error('Account disabled')
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    throw new Error('Insufficient permissions')
  }
  return user
}
