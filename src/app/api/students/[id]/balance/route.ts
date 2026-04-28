import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params

    const transactions = await db.transaction.findMany({
      where: { studentId: id },
    })

    const charges = transactions
      .filter((t) => t.type === 'charge')
      .reduce((sum, t) => sum + t.amount, 0)
    const payments = transactions
      .filter((t) => t.type === 'payment')
      .reduce((sum, t) => sum + t.amount, 0)
    const adjustments = transactions
      .filter((t) => t.type === 'adjustment')
      .reduce((sum, t) => sum + t.amount, 0)
    const balance = charges - payments + adjustments

    return NextResponse.json({
      totalCharges: charges,
      totalPayments: payments,
      totalAdjustments: adjustments,
      balance,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get balance error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
