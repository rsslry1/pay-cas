import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth('staff')
    const { id } = await params

    const billing = await db.billing.findUnique({ where: { id } })
    if (!billing) {
      return NextResponse.json({ error: 'Billing not found' }, { status: 404 })
    }

    const newStatus = billing.status === 'active' ? 'inactive' : 'active'

    const updated = await db.billing.update({
      where: { id },
      data: { status: newStatus },
      include: { feeCategory: true },
    })

    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'update',
        entity: 'billing',
        entityId: id,
        details: JSON.stringify({ status: newStatus, previousStatus: billing.status }),
      },
    })

    return NextResponse.json({ billing: updated })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Toggle billing error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
