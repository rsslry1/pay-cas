import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const student = await db.studentProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true },
        },
        billingAssignments: {
          include: {
            billing: { include: { feeCategory: true } },
          },
        },
      },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    return NextResponse.json({ student })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get student error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth('admin')
    const { id } = await params
    const body = await request.json()

    const existing = await db.studentProfile.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const {
      firstName,
      lastName,
      middleName,
      course,
      year,
      section,
      dateOfBirth,
      gender,
      address,
      contactNumber,
      parentName,
      parentContact,
      status,
    } = body

    const updateData: any = {}
    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (middleName !== undefined) updateData.middleName = middleName
    if (course !== undefined) updateData.course = course
    if (year !== undefined) updateData.year = year
    if (section !== undefined) updateData.section = section
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null
    if (gender !== undefined) updateData.gender = gender
    if (address !== undefined) updateData.address = address
    if (contactNumber !== undefined) updateData.contactNumber = contactNumber
    if (parentName !== undefined) updateData.parentName = parentName
    if (parentContact !== undefined) updateData.parentContact = parentContact
    if (status !== undefined) updateData.status = status

    const student = await db.studentProfile.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, email: true, name: true, role: true },
        },
      },
    })

    // Update user name if name fields changed
    if (firstName !== undefined || lastName !== undefined || middleName !== undefined) {
      const fName = firstName || existing.firstName
      const mName = middleName !== undefined ? middleName : existing.middleName
      const lName = lastName || existing.lastName
      await db.user.update({
        where: { id: existing.userId },
        data: {
          name: `${fName}${mName ? ' ' + mName : ''} ${lName}`,
        },
      })
    }

    await db.auditLog.create({
      data: {
        userId: (await requireAuth()).id,
        action: 'update',
        entity: 'student',
        entityId: id,
        details: JSON.stringify(updateData),
      },
    })

    return NextResponse.json({ student })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Update student error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth('staff')
    const { id } = await params

    const existing = await db.studentProfile.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Soft delete
    const student = await db.studentProfile.update({
      where: { id },
      data: { status: 'inactive' },
    })

    await db.user.update({
      where: { id: existing.userId },
      data: { isActive: false },
    })

    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'delete',
        entity: 'student',
        entityId: id,
        details: JSON.stringify({ studentId: existing.studentId, softDelete: true }),
      },
    })

    return NextResponse.json({ student, message: 'Student deactivated' })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Delete student error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
