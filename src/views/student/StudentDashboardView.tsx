'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store'
import { students, billings, receipts } from '@/lib/api'
import {
  Wallet,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  CalendarDays,
  TrendingUp,
  FileText,
  Camera,
  CreditCard,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

interface BalanceData {
  totalCharges: number
  totalPayments: number
  totalAdjustments: number
  balance: number
}

interface Assignment {
  id: string
  billingId: string
  status: string
  assignedAt: string
  billing: {
    id: string
    title: string
    amount: number
    dueDate?: string
    feeCategory?: { name: string }
  }
}

interface Transaction {
  id: string
  type: string
  amount: number
  description?: string
  balanceAfter: number
  createdAt: string
  billing?: { title: string }
}

export default function StudentDashboardView() {
  const { currentUser, setCurrentView } = useAppStore()
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pendingReceipts, setPendingReceipts] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  const profile = currentUser?.studentProfile
  const studentId = profile?.id

  const studentName = profile
    ? `${profile.firstName} ${profile.lastName}`
    : currentUser?.name || currentUser?.email || 'Student'

  useEffect(() => {
    if (!studentId) return
    loadData()
  }, [studentId])

  const loadData = async () => {
    if (!studentId) return
    setLoading(true)
    try {
      const [balData, assignData, ledgerData, receiptData] = await Promise.all([
        students.balance(studentId),
        students.ledger(studentId),
        billings.list({ studentId }),
        receipts.list(),
      ])

      setBalanceData({
        totalCharges: balData.totalCharges || 0,
        totalPayments: balData.totalPayments || 0,
        totalAdjustments: balData.totalAdjustments || 0,
        balance: balData.balance || 0,
      })

      const assignmentsList = assignData.assignments || assignData.data || []
      setAssignments(assignmentsList)

      const txns = ledgerData.transactions || []
      setTransactions(txns.slice(0, 5))

      const receiptList = receiptData.receipts || []
      setPendingReceipts(receiptList.filter((r: any) => r.status === 'pending').length)
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }

  useAutoRefresh(loadData, { enabled: Boolean(studentId) })

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

  const pendingBillings = assignments.filter((a) => a.status === 'pending')
  const overdueBillings = assignments.filter((a) => {
    if (a.status !== 'pending' || !a.billing?.dueDate) return false
    return new Date(a.billing.dueDate) < new Date()
  })

  const upcomingDueDates = assignments
    .filter((a) => a.status === 'pending' && a.billing?.dueDate)
    .sort((a, b) => new Date(a.billing.dueDate!).getTime() - new Date(b.billing.dueDate!).getTime())
    .slice(0, 3)

  const getDaysUntilDue = (dueDate: string) => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="space-y-5">
      {/* Welcome Section */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Welcome, {profile?.firstName || studentName}! 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {profile?.course && profile?.year
            ? `${profile.course} - Year ${profile.year}${profile.section ? ` ${profile.section}` : ''}`
            : 'Here\'s your billing overview'}
        </p>
      </div>

      {/* Balance Card */}
      {loading ? (
        <Skeleton className="h-44 w-full rounded-2xl" />
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 p-5 text-white shadow-lg">
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-5 h-5 text-emerald-200" />
              <span className="text-sm font-medium text-emerald-100">Total Balance</span>
            </div>
            <p className="text-3xl font-bold tracking-tight">
              {formatCurrency(balanceData?.balance ?? 0)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-emerald-200">Total Charged</p>
                <p className="text-base font-semibold">
                  {formatCurrency(balanceData?.totalCharges ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-emerald-200">Total Paid</p>
                <p className="text-base font-semibold">
                  {formatCurrency(balanceData?.totalPayments ?? 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        {loading ? (
          <>
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </>
        ) : (
          <>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Pending Bills</p>
                    <p className="text-2xl font-bold text-gray-900 mt-0.5">{pendingBillings.length}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Overdue</p>
                    <p className="text-2xl font-bold text-gray-900 mt-0.5">{overdueBillings.length}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Paid</p>
                    <p className="text-2xl font-bold text-gray-900 mt-0.5">
                      {assignments.filter((a) => a.status === 'fully_paid').length}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Pending Receipts</p>
                    <p className="text-2xl font-bold text-gray-900 mt-0.5">{pendingReceipts}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => setCurrentView('student-upload')}
          className="h-auto py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex flex-col items-center gap-2 shadow-sm"
        >
          <Camera className="w-6 h-6" />
          <span className="text-sm font-medium">Upload Receipt</span>
        </Button>
        <Button
          onClick={() => setCurrentView('student-bills')}
          variant="outline"
          className="h-auto py-4 rounded-xl flex flex-col items-center gap-2 border-gray-200 shadow-sm"
        >
          <FileText className="w-6 h-6 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">View Bills</span>
        </Button>
      </div>

      {/* Upcoming Due Dates */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-emerald-600" />
              Upcoming Due Dates
            </CardTitle>
            {upcomingDueDates.length > 0 && (
              <button
                onClick={() => setCurrentView('student-bills')}
                className="text-xs text-emerald-600 font-medium flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : upcomingDueDates.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No upcoming due dates</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingDueDates.map((assignment) => {
                const days = getDaysUntilDue(assignment.billing.dueDate!)
                const isOverdue = days < 0
                const isDueSoon = days >= 0 && days <= 3

                return (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                          isOverdue
                            ? 'bg-red-100'
                            : isDueSoon
                            ? 'bg-amber-100'
                            : 'bg-emerald-100'
                        )}
                      >
                        <CalendarDays
                          className={cn(
                            'w-4 h-4',
                            isOverdue
                              ? 'text-red-600'
                              : isDueSoon
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          )}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {assignment.billing.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(assignment.billing.amount)}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[10px] font-semibold shrink-0 ml-2',
                        isOverdue
                          ? 'bg-red-100 text-red-700'
                          : isDueSoon
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {isOverdue
                        ? `${Math.abs(days)}d overdue`
                        : days === 0
                        ? 'Due today'
                        : `${days}d left`}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Recent Activity
            </CardTitle>
            {transactions.length > 0 && (
              <button
                onClick={() => setCurrentView('student-history')}
                className="text-xs text-emerald-600 font-medium flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-1">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                        tx.type === 'payment'
                          ? 'bg-emerald-50'
                          : tx.type === 'charge'
                          ? 'bg-red-50'
                          : 'bg-blue-50'
                      )}
                    >
                      {tx.type === 'payment' ? (
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                      ) : tx.type === 'charge' ? (
                        <ArrowUpRight className="w-4 h-4 text-red-600" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {tx.description || `${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}`}
                        {tx.billing && (
                          <span className="text-gray-400"> — {tx.billing.title}</span>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {new Date(tx.createdAt).toLocaleDateString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        tx.type === 'payment' ? 'text-emerald-600' : 'text-red-600'
                      )}
                    >
                      {tx.type === 'payment' ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Bal: {formatCurrency(tx.balanceAfter)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
