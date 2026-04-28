import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth('admin')
    const { id } = await params
    const body = await request.json()

    const existing = await db.academicYear.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Academic year not found' }, { status: 404 })
    }

    const { isCurrent } = body

    if (isCurrent) {
      await db.academicYear.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      })
    }

    const updateData: any = {}
    if (isCurrent !== undefined) updateData.isCurrent = isCurrent

    const academicYear = await db.academicYear.update({
      where: { id },
      data: updateData,
    })

    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'update',
        entity: 'academic_year',
        entityId: id,
        details: JSON.stringify(updateData),
      },
    })

    return NextResponse.json({ academicYear })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Update academic year error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth('admin')
    const { id } = await params

    const existing = await db.academicYear.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Academic year not found' }, { status: 404 })
    }

    await db.academicYear.delete({ where: { id } })

    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'delete',
        entity: 'academic_year',
        entityId: id,
        details: JSON.stringify({ year: existing.year }),
      },
    })

    return NextResponse.json({ message: 'Academic year deleted' })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Delete academic year error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
