import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const categories = await db.feeCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { billings: true },
        },
      },
    })
    return NextResponse.json({ categories })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('List fee categories error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth('staff')

    const body = await request.json()
    const { name, description, isDefault } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const category = await db.feeCategory.create({
      data: {
        name,
        description: description || null,
        isDefault: isDefault || false,
      },
    })

    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'create',
        entity: 'fee_category',
        entityId: category.id,
        details: JSON.stringify({ name }),
      },
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Create fee category error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
