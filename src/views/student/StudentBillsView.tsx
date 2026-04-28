'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/store'
import { billings, students } from '@/lib/api'
import {
  FileText,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  CalendarDays,
  CreditCard,
  DollarSign,
  X,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Assignment {
  id: string
  billingId: string
  studentId: string
  status: string
  assignedAt: string
  billing: {
    id: string
    title: string
    description?: string
    amount: number
    dueDate?: string
    status?: string
    feeCategory?: { id: string; name: string }
    academicYear?: { id: string; year: string }
  }
}

interface LedgerTransaction {
  id: string
  type: string
  amount: number
  description?: string
  balanceBefore: number
  balanceAfter: number
  createdAt: string
  billing?: { title: string }
}

export default function StudentBillsView() {
  const { currentUser } = useAppStore()
  const studentId = currentUser?.studentProfile?.id

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [assignmentPayments, setAssignmentPayments] = useState<LedgerTransaction[]>([])
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [loadingPayments, setLoadingPayments] = useState(false)

  const loadData = useCallback(async () => {
    if (!studentId) return
    setLoading(true)
    try {
      const data = await billings.list({ studentId })
      const list = data.assignments || data.data || []
      setAssignments(list)
    } catch {
      toast.error('Failed to load billings')
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openDetail = async (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    setShowDetailDialog(true)
    setLoadingPayments(true)

    try {
      const ledgerData = await students.ledger(studentId!)
      const txns: LedgerTransaction[] = ledgerData.transactions || []
      const related = txns.filter(
        (t) =>
          t.billing?.title === assignment.billing.title ||
          t.type === 'charge' // charges related to this billing
      )
      // Also filter by checking if description contains billing title
      const billingRelated = txns.filter(
        (t) =>
          t.description?.toLowerCase().includes(assignment.billing.title.toLowerCase()) ||
          t.description?.includes(assignment.billingId)
      )
      const combined = [...new Map([...related, ...billingRelated].map((t) => [t.id, t])).values()]
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setAssignmentPayments(combined)
    } catch {
      setAssignmentPayments([])
    } finally {
      setLoadingPayments(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'fully_paid':
        return {
          label: 'Paid',
          icon: CheckCircle2,
          color: 'bg-emerald-100 text-emerald-700',
          border: 'border-l-emerald-500',
        }
      case 'partially_paid':
        return {
          label: 'Partial',
          icon: Clock,
          color: 'bg-blue-100 text-blue-700',
          border: 'border-l-blue-500',
        }
      case 'pending':
        return {
          label: 'Pending',
          icon: AlertCircle,
          color: 'bg-amber-100 text-amber-700',
          border: 'border-l-amber-500',
        }
      case 'waived':
        return {
          label: 'Waived',
          icon: CheckCircle2,
          color: 'bg-gray-100 text-gray-600',
          border: 'border-l-gray-400',
        }
      default:
        return {
          label: status,
          icon: Clock,
          color: 'bg-gray-100 text-gray-600',
          border: 'border-l-gray-400',
        }
    }
  }

  const isOverdue = (dueDate?: string, status?: string) => {
    if (!dueDate || status === 'fully_paid' || status === 'waived') return false
    return new Date(dueDate) < new Date()
  }

  // Group assignments
  const overdue = assignments.filter(
    (a) => a.status === 'pending' && isOverdue(a.billing.dueDate, a.status)
  )
  const pending = assignments.filter(
    (a) => a.status === 'pending' && !isOverdue(a.billing.dueDate, a.status)
  )
  const partiallyPaid = assignments.filter((a) => a.status === 'partially_paid')
  const paid = assignments.filter((a) => a.status === 'fully_paid')

  const renderGroup = (title: string, items: Assignment[], icon: React.ReactNode) => {
    if (items.length === 0) return null

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          {icon}
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {title} ({items.length})
          </h3>
        </div>
        {items.map((assignment) => {
          const config = getStatusConfig(assignment.status)
          const overdueFlag = isOverdue(assignment.billing.dueDate, assignment.status)
          const StatusIcon = config.icon
          const daysUntilDue = assignment.billing.dueDate
            ? Math.ceil(
                (new Date(assignment.billing.dueDate).getTime() - new Date().getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : null

          return (
            <Card
              key={assignment.id}
              className={cn(
                'border-0 shadow-sm border-l-4 cursor-pointer hover:shadow-md transition-shadow',
                config.border,
                overdueFlag && 'border-l-red-500'
              )}
              onClick={() => openDetail(assignment)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {assignment.billing.title}
                      </p>
                      {overdueFlag && (
                        <Badge className="bg-red-100 text-red-700 text-[9px] px-1.5 py-0 h-4 font-bold">
                          OVERDUE
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-base font-bold text-gray-900">
                        {formatCurrency(assignment.billing.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      {assignment.billing.feeCategory && (
                        <span>{assignment.billing.feeCategory.name}</span>
                      )}
                      {assignment.billing.dueDate && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {new Date(assignment.billing.dueDate).toLocaleDateString('en-PH', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                          {daysUntilDue !== null && daysUntilDue < 0 && (
                            <span className="text-red-500 font-medium">
                              ({Math.abs(daysUntilDue)}d overdue)
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge variant="secondary" className={cn('text-[10px] font-semibold', config.color)}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Bills</h1>
          <p className="text-sm text-gray-500">
            {assignments.length} total billing{assignments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
          className="h-9 gap-1.5 text-gray-600"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {!loading && (
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-3 bg-red-50 rounded-xl">
            <p className="text-lg font-bold text-red-700">{overdue.length}</p>
            <p className="text-[10px] text-red-600 font-medium">Overdue</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-xl">
            <p className="text-lg font-bold text-amber-700">{pending.length + partiallyPaid.length}</p>
            <p className="text-[10px] text-amber-600 font-medium">Pending</p>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-xl">
            <p className="text-lg font-bold text-emerald-700">{paid.length}</p>
            <p className="text-[10px] text-emerald-600 font-medium">Paid</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">No billings assigned</p>
          <p className="text-xs mt-1">Your billings will appear here once assigned.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {renderGroup(
            'Overdue',
            overdue,
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          )}
          {renderGroup(
            'Pending',
            pending,
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          )}
          {renderGroup(
            'Partially Paid',
            partiallyPaid,
            <Clock className="w-3.5 h-3.5 text-blue-500" />
          )}
          {renderGroup(
            'Paid',
            paid,
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          )}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedAssignment?.billing.title}</DialogTitle>
            <DialogDescription>Billing details and payment history</DialogDescription>
          </DialogHeader>

          {selectedAssignment && (
            <div className="space-y-4">
              {/* Billing Info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Amount</span>
                  <span className="text-sm font-bold text-gray-900">
                    {formatCurrency(selectedAssignment.billing.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Status</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-[10px] font-semibold',
                      getStatusConfig(selectedAssignment.status).color
                    )}
                  >
                    {getStatusConfig(selectedAssignment.status).label}
                  </Badge>
                </div>
                {selectedAssignment.billing.feeCategory && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Category</span>
                    <span className="text-sm text-gray-900">
                      {selectedAssignment.billing.feeCategory.name}
                    </span>
                  </div>
                )}
                {selectedAssignment.billing.dueDate && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Due Date</span>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isOverdue(selectedAssignment.billing.dueDate, selectedAssignment.status)
                          ? 'text-red-600'
                          : 'text-gray-900'
                      )}
                    >
                      {new Date(selectedAssignment.billing.dueDate).toLocaleDateString('en-PH', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Assigned</span>
                  <span className="text-sm text-gray-900">
                    {new Date(selectedAssignment.assignedAt).toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {selectedAssignment.billing.academicYear && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Academic Year</span>
                    <span className="text-sm text-gray-900">
                      {selectedAssignment.billing.academicYear.year}
                    </span>
                  </div>
                )}
              </div>

              {selectedAssignment.billing.description && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="text-sm text-gray-700">{selectedAssignment.billing.description}</p>
                </div>
              )}

              {/* Payment History */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Related Transactions
                </h4>
                {loadingPayments ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : assignmentPayments.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No transactions found</p>
                ) : (
                  <div className="space-y-2">
                    {assignmentPayments.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                              tx.type === 'payment'
                                ? 'bg-emerald-100'
                                : tx.type === 'charge'
                                ? 'bg-red-100'
                                : 'bg-blue-100'
                            )}
                          >
                            {tx.type === 'payment' ? (
                              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                            ) : tx.type === 'charge' ? (
                              <DollarSign className="w-3.5 h-3.5 text-red-600" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-blue-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {tx.description || tx.type}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {new Date(tx.createdAt).toLocaleDateString('en-PH', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                        <span
                          className={cn(
                            'text-sm font-semibold shrink-0',
                            tx.type === 'payment' ? 'text-emerald-600' : 'text-red-600'
                          )}
                        >
                          {tx.type === 'payment' ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
