import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    await requireAuth('staff')

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'transactions' // transactions, billings, students
    const course = searchParams.get('course')
    const year = searchParams.get('year')
    const status = searchParams.get('status')

    let csvContent = ''
    let filename = 'export.csv'

    if (type === 'transactions') {
      const where: any = {}
      if (course || year || status) {
        where.student = {}
        if (course) where.student.course = course
        if (year) where.student.year = parseInt(year)
      }
      if (status) where.type = status

      const transactions = await db.transaction.findMany({
        where,
        include: {
          student: { select: { firstName: true, lastName: true, studentId: true } },
          billing: { select: { title: true } },
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      csvContent = [
        'Date,Student ID,Student Name,Billing,Type,Amount,Description,Balance Before,Balance After,Created By',
        ...transactions.map(
          (t) =>
            `${t.createdAt.toISOString()},${t.student.studentId},"${t.student.lastName}, ${t.student.firstName}",${t.billing?.title || ''},${t.type},${t.amount},"${t.description || ''}",${t.balanceBefore},${t.balanceAfter},${t.createdBy?.name || ''}`
        ),
      ].join('\n')

      filename = 'transactions-export.csv'
    } else if (type === 'billings') {
      const billings = await db.billing.findMany({
        include: {
          feeCategory: true,
          assignments: { include: { student: { select: { firstName: true, lastName: true, studentId: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      })

      csvContent = [
        'Title,Description,Amount,Due Date,Category,Academic Year,Semester,Status,Assigned Students',
        ...billings.map(
          (b) =>
            `"${b.title}","${b.description || ''}",${b.amount},${b.dueDate?.toISOString() || ''},${b.feeCategory?.name || ''},${b.academicYear || ''},${b.semester || ''},${b.status},${b.assignments.length}`
        ),
      ].join('\n')

      filename = 'billings-export.csv'
    } else if (type === 'students') {
      const where: any = {}
      if (course) where.course = course
      if (year) where.year = parseInt(year)
      if (status) where.status = status

      const students = await db.studentProfile.findMany({
        where,
        include: {
          user: { select: { email: true, isActive: true } },
        },
        orderBy: { studentId: 'asc' },
      })

      csvContent = [
        'Student ID,First Name,Last Name,Middle Name,Course,Year,Section,Email,Status',
        ...students.map(
          (s) =>
            `${s.studentId},${s.firstName},${s.lastName},${s.middleName || ''},${s.course || ''},${s.year || ''},${s.section || ''},${s.user.email},${s.status}`
        ),
      ].join('\n')

      filename = 'students-export.csv'
    }

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Export report error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
