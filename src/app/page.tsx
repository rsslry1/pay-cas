'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store'
import LoginView from '@/views/LoginView'
import AdminLayout from '@/components/layout/AdminLayout'
import StudentLayout from '@/components/layout/StudentLayout'
import DashboardView from '@/views/admin/DashboardView'
import StudentsView from '@/views/admin/StudentsView'
import BillingsView from '@/views/admin/BillingsView'
import ReceiptsView from '@/views/admin/ReceiptsView'
import PaymentsView from '@/views/admin/PaymentsView'
import ReportsView from '@/views/admin/ReportsView'
import SettingsView from '@/views/admin/SettingsView'
import StudentDashboardView from '@/views/student/StudentDashboardView'
import StudentBillsView from '@/views/student/StudentBillsView'
import StudentUploadView from '@/views/student/StudentUploadView'
import StudentHistoryView from '@/views/student/StudentHistoryView'
import { Loader2 } from 'lucide-react'

function AdminViewRouter({ view }: { view: string }) {
  switch (view) {
    case 'dashboard':
      return <DashboardView />
    case 'students':
      return <StudentsView />
    case 'billings':
      return <BillingsView />
    case 'receipts':
      return <ReceiptsView />
    case 'payments':
      return <PaymentsView />
    case 'reports':
      return <ReportsView />
    case 'settings':
      return <SettingsView />
    default:
      return <DashboardView />
  }
}

function StudentViewRouter({ view }: { view: string }) {
  switch (view) {
    case 'student-dashboard':
      return <StudentDashboardView />
    case 'student-bills':
      return <StudentBillsView />
    case 'student-upload':
      return <StudentUploadView />
    case 'student-history':
      return <StudentHistoryView />
    default:
      return <StudentDashboardView />
  }
}

export default function Home() {
  const { isLoading, isAuthenticated, currentUser, currentView, checkAuth } = useAppStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginView />
  }

  if (currentUser?.role === 'student') {
    return (
      <StudentLayout>
        <StudentViewRouter view={currentView} />
      </StudentLayout>
    )
  }

  return (
    <AdminLayout>
      <AdminViewRouter view={currentView} />
    </AdminLayout>
  )
}
