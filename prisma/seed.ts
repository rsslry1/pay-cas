import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...\n')

  // Clean up existing data (in order of dependencies)
  console.log('Cleaning up existing data...')
  await db.auditLog.deleteMany()
  await db.notification.deleteMany()
  await db.payment.deleteMany()
  await db.transaction.deleteMany()
  await db.receipt.deleteMany()
  await db.billingAssignment.deleteMany()
  await db.billing.deleteMany()
  await db.feeCategory.deleteMany()
  await db.studentProfile.deleteMany()
  await db.user.deleteMany()
  await db.systemSetting.deleteMany()
  await db.academicYear.deleteMany()

  // ==================== Academic Year ====================
  console.log('Creating academic year...')
  const academicYear = await db.academicYear.create({
    data: {
      year: '2024-2025',
      isCurrent: true,
      startDate: new Date('2024-08-01'),
      endDate: new Date('2025-05-31'),
    },
  })
  console.log(`  ✅ Academic Year: ${academicYear.year}`)

  // ==================== Users ====================
  console.log('\nCreating users...')

  const admin = await db.user.create({
    data: {
      email: 'admin@school.edu',
      password: 'admin123',
      name: 'Admin User',
      role: 'admin',
      avatar: null,
      isActive: true,
    },
  })
  console.log(`  ✅ Admin: ${admin.email}`)

  const staff = await db.user.create({
    data: {
      email: 'staff@school.edu',
      password: 'staff123',
      name: 'Staff Member',
      role: 'staff',
      avatar: null,
      isActive: true,
    },
  })
  console.log(`  ✅ Staff: ${staff.email}`)

  // Student users
  const studentData = [
    {
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      middleName: 'Santos',
      course: 'BSIT',
      year: 3,
      section: 'A',
      gender: 'Male',
      contactNumber: '0917-123-4567',
      parentName: 'Maria Dela Cruz',
      parentContact: '0918-765-4321',
    },
    {
      firstName: 'Maria',
      lastName: 'Garcia',
      middleName: 'Reyes',
      course: 'BSCS',
      year: 2,
      section: 'B',
      gender: 'Female',
      contactNumber: '0917-234-5678',
      parentName: 'Pedro Garcia',
      parentContact: '0918-876-5432',
    },
    {
      firstName: 'Carlos',
      lastName: 'Santos',
      middleName: null,
      course: 'BSCE',
      year: 1,
      section: 'A',
      gender: 'Male',
      contactNumber: '0917-345-6789',
      parentName: 'Ana Santos',
      parentContact: '0918-987-6543',
    },
    {
      firstName: 'Isabella',
      lastName: 'Reyes',
      middleName: 'Maria',
      course: 'BSIT',
      year: 4,
      section: 'A',
      gender: 'Female',
      contactNumber: '0917-456-7890',
      parentName: 'Jose Reyes',
      parentContact: '0918-098-7654',
    },
    {
      firstName: 'Miguel',
      lastName: 'Torres',
      middleName: 'Antonio',
      course: 'BSCS',
      year: 1,
      section: 'A',
      gender: 'Male',
      contactNumber: '0917-567-8901',
      parentName: 'Luz Torres',
      parentContact: '0918-109-8765',
    },
  ]

  const students: any[] = []
  for (let i = 0; i < studentData.length; i++) {
    const s = studentData[i]
    const studentId = `STU-2024-${String(i + 1).padStart(3, '0')}`

    const user = await db.user.create({
      data: {
        email: `${s.firstName.toLowerCase()}.${s.lastName.toLowerCase().replace(/\s+/g, '_')}@school.edu`,
        password: 'student123',
        name: `${s.firstName} ${s.middleName ? s.middleName + ' ' : ''}${s.lastName}`,
        role: 'student',
        isActive: true,
      },
    })

    const profile = await db.studentProfile.create({
      data: {
        userId: user.id,
        studentId,
        firstName: s.firstName,
        lastName: s.lastName,
        middleName: s.middleName,
        course: s.course,
        year: s.year,
        section: s.section,
        dateOfBirth: new Date(`200${3 + s.year!}-0${(i % 9) + 1}-15`),
        gender: s.gender,
        address: `${i + 100} Rizal Street, Manila`,
        contactNumber: s.contactNumber,
        parentName: s.parentName,
        parentContact: s.parentContact,
      },
      include: { user: true },
    })

    students.push(profile)
    console.log(`  ✅ Student: ${profile.studentId} - ${profile.firstName} ${profile.lastName} (${s.course} Yr ${s.year})`)
  }

  // ==================== Fee Categories ====================
  console.log('\nCreating fee categories...')

  const feeCategories = await Promise.all([
    db.feeCategory.create({
      data: { name: 'Tuition Fee', description: 'Main tuition fee for the semester', isDefault: true },
    }),
    db.feeCategory.create({
      data: { name: 'Laboratory Fee', description: 'Fee for laboratory usage and materials', isDefault: false },
    }),
    db.feeCategory.create({
      data: { name: 'Library Fee', description: 'Fee for library access and resources', isDefault: false },
    }),
  ])

  feeCategories.forEach((fc) => {
    console.log(`  ✅ Fee Category: ${fc.name}`)
  })

  // ==================== Billings ====================
  console.log('\nCreating billings...')

  const billings = await Promise.all([
    db.billing.create({
      data: {
        title: '1st Semester Tuition Fee 2024-2025',
        description: 'Regular tuition fee for the first semester',
        amount: 25000,
        dueDate: new Date('2024-09-30'),
        feeCategoryId: feeCategories[0].id,
        status: 'active',
        academicYear: '2024-2025',
        semester: '1st',
      },
    }),
    db.billing.create({
      data: {
        title: 'Laboratory Fee - 1st Sem 2024-2025',
        description: 'Laboratory fee for computer and science labs',
        amount: 5000,
        dueDate: new Date('2024-09-30'),
        feeCategoryId: feeCategories[1].id,
        status: 'active',
        academicYear: '2024-2025',
        semester: '1st',
      },
    }),
    db.billing.create({
      data: {
        title: 'Library Fee - 1st Sem 2024-2025',
        description: 'Library access and digital resources fee',
        amount: 1500,
        dueDate: new Date('2024-09-30'),
        feeCategoryId: feeCategories[2].id,
        status: 'active',
        academicYear: '2024-2025',
        semester: '1st',
      },
    }),
    db.billing.create({
      data: {
        title: '2nd Semester Tuition Fee 2024-2025',
        description: 'Regular tuition fee for the second semester',
        amount: 25000,
        dueDate: new Date('2025-02-28'),
        feeCategoryId: feeCategories[0].id,
        status: 'active',
        academicYear: '2024-2025',
        semester: '2nd',
      },
    }),
    db.billing.create({
      data: {
        title: 'Summer Class Tuition 2025',
        description: 'Tuition fee for summer classes',
        amount: 12000,
        dueDate: new Date('2025-05-15'),
        feeCategoryId: feeCategories[0].id,
        status: 'inactive',
        academicYear: '2024-2025',
        semester: 'Summer',
      },
    }),
  ])

  billings.forEach((b) => {
    console.log(`  ✅ Billing: ${b.title} - ₱${b.amount.toLocaleString()}`)
  })

  // ==================== Billing Assignments & Transactions ====================
  console.log('\nAssigning billings to students and creating charge transactions...')

  const assignments: any[] = []
  const transactions: any[] = []

  // Assign first 3 billings to all students
  for (let bIdx = 0; bIdx < 3; bIdx++) {
    for (let sIdx = 0; sIdx < students.length; sIdx++) {
      const assignment = await db.billingAssignment.create({
        data: {
          billingId: billings[bIdx].id,
          studentId: students[sIdx].id,
          status: sIdx < 2 && bIdx < 2 ? 'fully_paid' : sIdx < 4 ? 'partially_paid' : 'pending',
        },
      })
      assignments.push(assignment)
    }
  }

  // Create charge transactions for all assignments
  let runningBalances: Record<string, number> = {}
  students.forEach((s) => {
    runningBalances[s.id] = 0
  })

  for (const assignment of assignments) {
    const billing = billings.find((b) => b.id === assignment.billingId)!
    const balanceBefore = runningBalances[assignment.studentId]
    const balanceAfter = balanceBefore + billing.amount

    const tx = await db.transaction.create({
      data: {
        studentId: assignment.studentId,
        billingId: billing.id,
        type: 'charge',
        amount: billing.amount,
        description: `Charge for ${billing.title}`,
        balanceBefore,
        balanceAfter,
        createdById: admin.id,
      },
    })
    transactions.push(tx)
    runningBalances[assignment.studentId] = balanceAfter
  }

  console.log(`  ✅ Created ${assignments.length} billing assignments`)
  console.log(`  ✅ Created ${transactions.length} charge transactions`)

  // ==================== Payments (for fully_paid students) ====================
  console.log('\nCreating payment transactions...')

  // Student 0 (Juan) - fully paid first 2 billings
  for (let bIdx = 0; bIdx < 2; bIdx++) {
    const billing = billings[bIdx]
    const balanceBefore = runningBalances[students[0].id]
    const balanceAfter = balanceBefore - billing.amount

    await db.transaction.create({
      data: {
        studentId: students[0].id,
        billingId: billing.id,
        type: 'payment',
        amount: billing.amount,
        description: `Full payment for ${billing.title}`,
        balanceBefore,
        balanceAfter,
        createdById: staff.id,
      },
    })
    runningBalances[students[0].id] = balanceAfter
  }

  // Student 1 (Maria) - fully paid first 2 billings, partial on 3rd
  for (let bIdx = 0; bIdx < 2; bIdx++) {
    const billing = billings[bIdx]
    const balanceBefore = runningBalances[students[1].id]
    const balanceAfter = balanceBefore - billing.amount

    await db.transaction.create({
      data: {
        studentId: students[1].id,
        billingId: billing.id,
        type: 'payment',
        amount: billing.amount,
        description: `Full payment for ${billing.title}`,
        balanceBefore,
        balanceAfter,
        createdById: staff.id,
      },
    })
    runningBalances[students[1].id] = balanceAfter
  }

  // Partial payment for Maria on 3rd billing
  const partialAmount = 500
  let bb = runningBalances[students[1].id]
  await db.transaction.create({
    data: {
      studentId: students[1].id,
      billingId: billings[2].id,
      type: 'payment',
      amount: partialAmount,
      description: `Partial payment for ${billings[2].title}`,
      balanceBefore: bb,
      balanceAfter: bb - partialAmount,
      createdById: staff.id,
    },
  })
  runningBalances[students[1].id] = bb - partialAmount

  // Student 2 (Carlos) - partial payment on first billing
  const carlosPartial = 10000
  bb = runningBalances[students[2].id]
  await db.transaction.create({
    data: {
      studentId: students[2].id,
      billingId: billings[0].id,
      type: 'payment',
      amount: carlosPartial,
      description: `Partial payment for ${billings[0].title}`,
      balanceBefore: bb,
      balanceAfter: bb - carlosPartial,
      createdById: staff.id,
    },
  })
  runningBalances[students[2].id] = bb - carlosPartial

  // Student 3 (Isabella) - partial payment on first and second billing
  for (let bIdx = 0; bIdx < 2; bIdx++) {
    const billing = billings[bIdx]
    const partial = billing.amount * 0.5
    bb = runningBalances[students[3].id]
    await db.transaction.create({
      data: {
        studentId: students[3].id,
        billingId: billing.id,
        type: 'payment',
        amount: partial,
        description: `Partial payment for ${billing.title}`,
        balanceBefore: bb,
        balanceAfter: bb - partial,
        createdById: staff.id,
      },
    })
    runningBalances[students[3].id] = bb - partial
  }

  console.log('  ✅ Created payment transactions')

  // ==================== Receipts ====================
  console.log('\nCreating receipts...')

  // Pending receipt from student 4 (Miguel)
  const pendingReceipt = await db.receipt.create({
    data: {
      studentId: students[4].id,
      imageUrl: 'https://example.com/receipts/miguel-tuition-1.jpg',
      imageStorageKey: 'receipts/miguel-tuition-1.jpg',
      status: 'pending',
    },
  })
  console.log(`  ✅ Pending receipt: ${pendingReceipt.id} (from ${students[4].firstName})`)

  // Approved receipt from student 2 (Carlos)
  const approvedReceipt = await db.receipt.create({
    data: {
      studentId: students[2].id,
      imageUrl: 'https://example.com/receipts/carlos-tuition-1.jpg',
      imageStorageKey: 'receipts/carlos-tuition-1.jpg',
      status: 'approved',
      adminNotes: 'Verified bank deposit',
      reviewedById: staff.id,
      reviewedAt: new Date('2024-09-15T10:30:00Z'),
    },
  })

  // Create payment for the approved receipt
  await db.payment.create({
    data: {
      studentId: students[2].id,
      receiptId: approvedReceipt.id,
      amount: carlosPartial,
      processedById: staff.id,
      processedAt: new Date('2024-09-15T10:30:00Z'),
    },
  })
  console.log(`  ✅ Approved receipt: ${approvedReceipt.id} (from ${students[2].firstName}, ₱${carlosPartial.toLocaleString()})`)

  // ==================== Notifications ====================
  console.log('\nCreating notifications...')

  await db.notification.create({
    data: {
      userId: admin.id,
      title: 'New Receipt Submitted',
      message: 'Miguel Torres submitted a payment receipt for review.',
      type: 'receipt_submitted',
      link: '/receipts',
      isRead: false,
    },
  })

  await db.notification.create({
    data: {
      userId: students[2].userId,
      title: 'Receipt Approved',
      message: `Your payment receipt has been approved. Amount: ₱${carlosPartial.toLocaleString()}`,
      type: 'receipt_approved',
      link: '/student/payments',
      isRead: true,
    },
  })

  await db.notification.create({
    data: {
      userId: students[0].userId,
      title: 'Payment Confirmed',
      message: 'All your first semester fees have been fully paid.',
      type: 'balance_updated',
      link: '/student/ledger',
      isRead: true,
    },
  })

  await db.notification.create({
    data: {
      userId: staff.id,
      title: 'System Update',
      message: 'The billing system has been updated with new features.',
      type: 'balance_updated',
      isRead: false,
    },
  })

  console.log('  ✅ Created 4 notifications')

  // ==================== Audit Logs ====================
  console.log('\nCreating audit logs...')

  await db.auditLog.create({
    data: {
      userId: admin.id,
      action: 'create',
      entity: 'billing',
      entityId: billings[0].id,
      details: JSON.stringify({ title: billings[0].title, amount: billings[0].amount }),
    },
  })

  await db.auditLog.create({
    data: {
      userId: staff.id,
      action: 'approve',
      entity: 'receipt',
      entityId: approvedReceipt.id,
      details: JSON.stringify({ studentId: students[2].id, amount: carlosPartial }),
    },
  })

  await db.auditLog.create({
    data: {
      userId: admin.id,
      action: 'create',
      entity: 'student',
      entityId: students[0].id,
      details: JSON.stringify({ studentId: students[0].studentId, name: `${students[0].firstName} ${students[0].lastName}` }),
    },
  })

  console.log('  ✅ Created 3 audit logs')

  // ==================== System Settings ====================
  console.log('\nCreating system settings...')

  await db.systemSetting.create({
    data: { key: 'school_name', value: 'Sample University' },
  })
  await db.systemSetting.create({
    data: { key: 'school_address', value: '123 University Ave, Manila' },
  })
  await db.systemSetting.create({
    data: { key: 'currency', value: 'PHP' },
  })
  await db.systemSetting.create({
    data: { key: 'current_semester', value: '1st' },
  })
  await db.systemSetting.create({
    data: { key: 'payment_instructions', value: 'Please deposit to BPI Account #1234-5678-90 under Sample University. Send screenshot of deposit slip.' },
  })

  console.log('  ✅ Created 5 system settings')

  // ==================== Summary ====================
  console.log('\n' + '='.repeat(50))
  console.log('✅ Seed completed successfully!')
  console.log('='.repeat(50))
  console.log('\n📊 Summary:')
  console.log(`  Users: 2 (admin, staff) + ${students.length} students = ${students.length + 2} total`)
  console.log(`  Fee Categories: ${feeCategories.length}`)
  console.log(`  Billings: ${billings.length}`)
  console.log(`  Billing Assignments: ${assignments.length}`)
  console.log(`  Charge Transactions: ${transactions.length}`)
  console.log(`  Receipts: 2 (1 pending, 1 approved)`)
  console.log(`  Notifications: 4`)
  console.log(`  Audit Logs: 3`)
  console.log(`  System Settings: 5`)
  console.log(`  Academic Year: 1`)

  console.log('\n🔑 Test Accounts:')
  console.log('  Admin:  admin@school.edu / admin123')
  console.log('  Staff:  staff@school.edu / staff123')
  console.log('  Student: juan.dela.cruz@school.edu / student123')
  console.log('  Student: maria.garcia@school.edu / student123')
  console.log('  Student: carlos.santos@school.edu / student123')
  console.log('  Student: isabella.reyes@school.edu / student123')
  console.log('  Student: miguel.torres@school.edu / student123')

  console.log('\n💰 Student Balances:')
  for (const student of students) {
    console.log(`  ${student.studentId} ${student.firstName} ${student.lastName}: ₱${runningBalances[student.id].toLocaleString()}`)
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
