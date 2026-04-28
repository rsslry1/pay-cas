import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const course = searchParams.get('course')
    const year = searchParams.get('year')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { middleName: { contains: search } },
        { studentId: { contains: search } },
        { user: { email: { contains: search } } },
      ]
    }

    if (course) where.course = course
    if (year) where.year = parseInt(year)
    if (status) where.status = status

    const [students, total] = await Promise.all([
      db.studentProfile.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, name: true, role: true, isActive: true },
          },
        },
        orderBy: { enrollDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.studentProfile.count({ where }),
    ])

    const studentsWithBalances = await Promise.all(
      students.map(async (student) => {
        const transactions = await db.transaction.findMany({
          where: { studentId: student.id },
          select: { type: true, amount: true },
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

        return {
          ...student,
          balance: charges - payments + adjustments,
        }
      })
    )

    return NextResponse.json({
      students: studentsWithBalances,
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('List students error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth('admin')

    const body = await request.json()
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
      email,
      password,
    } = body

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 })
    }

    // Generate student ID
    const count = await db.studentProfile.count()
    const studentId = `STU-2024-${String(count + 1).padStart(3, '0')}`

    // Create user first
    const userEmail = email || `${studentId.toLowerCase()}@school.edu`
    const userPassword = password || 'student123'

    const user = await db.user.create({
      data: {
        email: userEmail,
        password: userPassword,
        name: `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`,
        role: 'student',
      },
    })

    const student = await db.studentProfile.create({
      data: {
        userId: user.id,
        studentId,
        firstName,
        lastName,
        middleName: middleName || null,
        course: course || null,
        year: year || null,
        section: section || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        address: address || null,
        contactNumber: contactNumber || null,
        parentName: parentName || null,
        parentContact: parentContact || null,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, role: true },
        },
      },
    })

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'create',
        entity: 'student',
        entityId: student.id,
        details: JSON.stringify({ studentId, firstName, lastName }),
      },
    })

    return NextResponse.json({ student }, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Create student error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
