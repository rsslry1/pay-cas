import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth('staff')
    const { id } = await params
    const body = await request.json()

    const existing = await db.feeCategory.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Fee category not found' }, { status: 404 })
    }

    const { name, description, isDefault } = body
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (isDefault !== undefined) updateData.isDefault = isDefault

    const category = await db.feeCategory.update({
      where: { id },
      data: updateData,
    })

    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'update',
        entity: 'fee_category',
        entityId: id,
        details: JSON.stringify(updateData),
      },
    })

    return NextResponse.json({ category })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Update fee category error:', error)
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

    const existing = await db.feeCategory.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Fee category not found' }, { status: 404 })
    }

    // Check if category is used by any billing
    const billingsCount = await db.billing.count({ where: { feeCategoryId: id } })
    if (billingsCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${billingsCount} billings use this category` },
        { status: 400 }
      )
    }

    await db.feeCategory.delete({ where: { id } })

    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'delete',
        entity: 'fee_category',
        entityId: id,
        details: JSON.stringify({ name: existing.name }),
      },
    })

    return NextResponse.json({ message: 'Fee category deleted' })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Delete fee category error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
