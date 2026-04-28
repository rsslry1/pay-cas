import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth('staff')
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const adminPassword = body?.adminPassword

    if (!adminPassword) {
      return NextResponse.json(
        { error: 'Admin password is required to permanently delete a student' },
        { status: 400 }
      )
    }

    const adminUser = await db.user.findFirst({
      where: {
        role: 'admin',
        isActive: true,
        password: adminPassword,
      },
    })

    if (!adminUser) {
      return NextResponse.json({ error: 'Invalid admin password' }, { status: 403 })
    }

    const existing = await db.studentProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    await db.$transaction(async (tx) => {
      await tx.payment.deleteMany({
        where: { studentId: id },
      })

      await tx.receipt.deleteMany({
        where: { studentId: id },
      })

      await tx.transaction.deleteMany({
        where: { studentId: id },
      })

      await tx.billingAssignment.deleteMany({
        where: { studentId: id },
      })

      await tx.notification.deleteMany({
        where: { userId: existing.userId },
      })

      await tx.auditLog.deleteMany({
        where: { userId: existing.userId },
      })

      await tx.studentProfile.delete({
        where: { id },
      })

      await tx.user.delete({
        where: { id: existing.userId },
      })
    })

    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'delete',
        entity: 'student',
        entityId: id,
        details: JSON.stringify({
          studentId: existing.studentId,
          permanentlyDeleted: true,
          overrideUsed: true,
          email: existing.user?.email || null,
        }),
      },
    })

    return NextResponse.json({ message: 'Student deleted permanently' })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Hard delete student error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
