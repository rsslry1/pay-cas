'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/store'
import { receipts, students } from '@/lib/api'
import {
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  CalendarDays,
  Eye,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

interface Receipt {
  id: string
  studentId: string
  studentName?: string
  imageUrl: string
  imageStorageKey?: string
  submittedAt: string
  status: 'pending' | 'approved' | 'rejected'
  adminNotes?: string
  reviewedById?: string
  reviewedAt?: string
  reviewedBy?: { id: string; name: string }
  createdAt: string
  updatedAt: string
  payments?: any[]
}

interface Transaction {
  id: string
  type: string
  amount: number
  description?: string
  balanceBefore: number
  balanceAfter: number
  referenceId?: string
  createdAt: string
  billing?: { id: string; title: string }
  createdBy?: { id: string; name: string }
}

interface LedgerSummary {
  balance: number
}

export default function StudentHistoryView() {
  const { currentUser } = useAppStore()
  const studentId = currentUser?.studentProfile?.id

  const [receiptList, setReceiptList] = useState<Receipt[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [ledgerSummary, setLedgerSummary] = useState<LedgerSummary | null>(null)
  const [loadingReceipts, setLoadingReceipts] = useState(true)
  const [loadingTransactions, setLoadingTransactions] = useState(true)
  const [activeTab, setActiveTab] = useState('receipts')

  // Receipt detail dialog
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [showImageDialog, setShowImageDialog] = useState(false)

  const loadReceipts = useCallback(async () => {
    if (!studentId) return
    setLoadingReceipts(true)
    try {
      const data = await receipts.list()
      const list = data.receipts || data.data || []
      setReceiptList(list)
    } catch {
      toast.error('Failed to load receipts')
    } finally {
      setLoadingReceipts(false)
    }
  }, [studentId])

  const loadTransactions = useCallback(async () => {
    if (!studentId) return
    setLoadingTransactions(true)
    try {
      const data = await students.ledger(studentId)
      const list = data.transactions || []
      setTransactions(list)
      setLedgerSummary({
        balance: data.summary?.balance || 0,
      })
    } catch {
      toast.error('Failed to load transactions')
    } finally {
      setLoadingTransactions(false)
    }
  }, [studentId])

  useEffect(() => {
    loadReceipts()
    loadTransactions()
  }, [loadReceipts, loadTransactions])

  useAutoRefresh(loadReceipts, { enabled: Boolean(studentId) })
  useAutoRefresh(loadTransactions, { enabled: Boolean(studentId) })

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          label: 'Approved',
          icon: CheckCircle2,
          color: 'bg-emerald-100 text-emerald-700',
          dot: 'bg-emerald-500',
        }
      case 'rejected':
        return {
          label: 'Rejected',
          icon: XCircle,
          color: 'bg-red-100 text-red-700',
          dot: 'bg-red-500',
        }
      default:
        return {
          label: 'Pending',
          icon: Clock,
          color: 'bg-amber-100 text-amber-700',
          dot: 'bg-amber-500',
        }
    }
  }

  const getTxnTypeIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <CreditCard className="w-4 h-4 text-emerald-600" />
      case 'charge':
        return <ArrowUpRight className="w-4 h-4 text-red-600" />
      default:
        return <TrendingUp className="w-4 h-4 text-blue-600" />
    }
  }

  const pendingCount = receiptList.filter((r) => r.status === 'pending').length
  const approvedCount = receiptList.filter((r) => r.status === 'approved').length
  const rejectedCount = receiptList.filter((r) => r.status === 'rejected').length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">History</h1>
        <p className="text-sm text-gray-500">Track your receipts and transactions</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="receipts" className="flex-1 min-h-[44px] gap-1.5">
            <FileText className="w-4 h-4" />
            My Receipts
            {pendingCount > 0 && (
              <Badge className="bg-amber-500 text-white text-[9px] px-1.5 h-4 ml-0.5">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex-1 min-h-[44px] gap-1.5">
            <CreditCard className="w-4 h-4" />
            Transactions
          </TabsTrigger>
        </TabsList>

        {/* Receipts Tab */}
        <TabsContent value="receipts" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700">
                {approvedCount} approved
              </Badge>
              <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700">
                {pendingCount} pending
              </Badge>
              {rejectedCount > 0 && (
                <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700">
                  {rejectedCount} rejected
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadReceipts}
              disabled={loadingReceipts}
              className="h-8 gap-1 text-gray-500"
            >
              <RefreshCw className={cn('w-3 h-3', loadingReceipts && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {loadingReceipts ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : receiptList.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No receipts yet</p>
              <p className="text-xs mt-1">Upload a receipt to get started</p>
              <Button
                className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
                onClick={() => useAppStore.getState().setCurrentView('student-upload')}
              >
                Upload Receipt
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {receiptList.map((receipt) => {
                const config = getStatusConfig(receipt.status)
                const StatusIcon = config.icon

                return (
                  <Card
                    key={receipt.id}
                    className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedReceipt(receipt)
                      setShowImageDialog(true)
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Thumbnail */}
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                          {receipt.imageUrl ? (
                            <img
                              src={receipt.imageUrl}
                              alt="Receipt"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-gray-300" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">Payment Receipt</p>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Submitted{' '}
                            {new Date(receipt.submittedAt).toLocaleDateString('en-PH', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          {receipt.payments && receipt.payments.length > 0 && (
                            <p className="text-xs font-semibold text-emerald-600 mt-0.5">
                              {formatCurrency(receipt.payments[0].amount)}
                            </p>
                          )}
                          {receipt.adminNotes && (
                            <p className="text-[11px] text-gray-500 mt-1 italic truncate">
                              &quot;{receipt.adminNotes}&quot;
                            </p>
                          )}
                        </div>

                        {/* Status */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <Badge variant="secondary" className={cn('text-[10px] font-semibold', config.color)}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                          <Eye className="w-4 h-4 text-gray-300" />
                        </div>
                      </div>

                      {/* Review Info */}
                      {receipt.reviewedAt && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-[11px] text-gray-400">
                            Reviewed on{' '}
                            {new Date(receipt.reviewedAt).toLocaleDateString('en-PH', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                            {receipt.reviewedBy?.name && ` by ${receipt.reviewedBy.name}`}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{transactions.length} transactions</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadTransactions}
              disabled={loadingTransactions}
              className="h-8 gap-1 text-gray-500"
            >
              <RefreshCw className={cn('w-3 h-3', loadingTransactions && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {loadingTransactions ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No transactions yet</p>
              <p className="text-xs mt-1">Transactions will appear here once billing is assigned.</p>
            </div>
          ) : (
            <>
              {/* Running balance summary */}
              <Card className="border-0 shadow-sm bg-gradient-to-r from-emerald-600 to-emerald-700">
                <CardContent className="p-4">
                  <p className="text-xs text-emerald-200 font-medium">Current Balance</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(ledgerSummary?.balance || 0)}
                  </p>
                  <p className="text-xs text-emerald-200 mt-1">
                    {transactions.length} total transactions
                  </p>
                </CardContent>
              </Card>

              {/* Transaction List */}
              <div className="space-y-1">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-white shadow-sm border border-gray-100"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                          tx.type === 'payment'
                            ? 'bg-emerald-50'
                            : tx.type === 'charge'
                            ? 'bg-red-50'
                            : 'bg-blue-50'
                        )}
                      >
                        {getTxnTypeIcon(tx.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {tx.description || tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-gray-400">
                            {new Date(tx.createdAt).toLocaleDateString('en-PH', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          {tx.billing && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 border-gray-200 text-gray-400">
                              {tx.billing.title}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p
                        className={cn(
                          'text-sm font-semibold',
                          tx.type === 'payment'
                            ? 'text-emerald-600'
                            : tx.type === 'charge'
                            ? 'text-red-600'
                            : 'text-blue-600'
                        )}
                      >
                        {tx.type === 'payment' ? '+' : tx.type === 'charge' ? '-' : ''}
                        {formatCurrency(tx.amount)}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Bal: {formatCurrency(tx.balanceAfter)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Receipt Image Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-md p-2">
          {selectedReceipt && (
            <div className="space-y-3">
              <div className="rounded-lg overflow-hidden bg-gray-100">
                {selectedReceipt.imageUrl ? (
                  <img
                    src={selectedReceipt.imageUrl}
                    alt="Receipt"
                    className="w-full h-auto max-h-[70vh] object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-400">
                    <ImageIcon className="w-12 h-12 opacity-30" />
                  </div>
                )}
              </div>
              <div className="px-2 pb-2 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">Receipt Details</h4>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-[10px] font-semibold',
                      getStatusConfig(selectedReceipt.status).color
                    )}
                  >
                    {getStatusConfig(selectedReceipt.status).label}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-400">Submitted</p>
                    <p className="text-gray-700 font-medium">
                      {new Date(selectedReceipt.submittedAt).toLocaleDateString('en-PH', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {selectedReceipt.reviewedAt && (
                    <div>
                      <p className="text-gray-400">Reviewed</p>
                      <p className="text-gray-700 font-medium">
                        {new Date(selectedReceipt.reviewedAt).toLocaleDateString('en-PH', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                </div>
                {selectedReceipt.payments && selectedReceipt.payments.length > 0 && (
                  <div className="text-xs">
                    <p className="text-gray-400">Payment Amount</p>
                    <p className="text-emerald-600 font-bold text-base">
                      {formatCurrency(selectedReceipt.payments[0].amount)}
                    </p>
                  </div>
                )}
                {selectedReceipt.adminNotes && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-0.5">Admin Notes</p>
                    <p className="text-sm text-gray-700">{selectedReceipt.adminNotes}</p>
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
