'use client'

import { useEffect, useState, useCallback } from 'react'
import { receipts as receiptsApi } from '@/lib/api'
import {
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

interface Receipt {
  id: string
  studentId: string
  studentName: string
  studentCode?: string
  imageUrl: string
  status: 'pending' | 'approved' | 'rejected'
  amount?: number
  notes?: string
  adminNotes?: string
  reviewedBy?: string
  reviewedAt?: string
  createdAt: string
  billingTitle?: string
}

export default function ReceiptsView() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  const [search, setSearch] = useState('')
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [reviewForm, setReviewForm] = useState({ amount: '', notes: '' })
  const [reviewing, setReviewing] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')

  const loadReceipts = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (activeTab !== 'all') params.status = activeTab
      if (search) params.search = search
      const data = await receiptsApi.list(params)
      const rows = data.receipts || data.data || []
      setReceipts(
        rows.map((receipt: any) => ({
          id: receipt.id,
          studentId: receipt.studentId,
          studentName:
            receipt.studentName ||
            [receipt.student?.firstName, receipt.student?.lastName].filter(Boolean).join(' ') ||
            '-',
          studentCode: receipt.student?.studentId,
          imageUrl: receipt.imageUrl,
          status: receipt.status,
          amount: receipt.amount ?? receipt.payments?.[0]?.amount,
          notes: receipt.notes,
          adminNotes: receipt.adminNotes,
          reviewedBy:
            typeof receipt.reviewedBy === 'string'
              ? receipt.reviewedBy
              : receipt.reviewedBy?.name,
          reviewedAt: receipt.reviewedAt,
          createdAt: receipt.createdAt || receipt.submittedAt,
          billingTitle: receipt.billingTitle || receipt.billing?.title,
        }))
      )
    } catch {
      toast.error('Failed to load receipts')
    } finally {
      setLoading(false)
    }
  }, [activeTab, search])

  useEffect(() => {
    loadReceipts()
  }, [loadReceipts])

  useAutoRefresh(loadReceipts)

  const openReview = (receipt: Receipt) => {
    setSelectedReceipt(receipt)
    setReviewForm({
      amount: receipt.amount ? String(receipt.amount) : '',
      notes: '',
    })
    setShowReviewDialog(true)
  }

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!selectedReceipt) return
    if (action === 'approve' && !reviewForm.amount) {
      toast.error('Please enter the payment amount')
      return
    }
    setReviewing(true)
    try {
      await receiptsApi.review(selectedReceipt.id, {
        status: action === 'approve' ? 'approved' : 'rejected',
        paymentAmount: reviewForm.amount ? parseFloat(reviewForm.amount) : undefined,
        adminNotes: reviewForm.notes,
      })
      toast.success(`Receipt ${action}d`)
      setShowReviewDialog(false)
      setSelectedReceipt(null)
      loadReceipts()
    } catch (err: any) {
      toast.error(err.message || 'Failed to review receipt')
    } finally {
      setReviewing(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedReceipt) return
    try {
      await receiptsApi.hardDelete(
        selectedReceipt.id,
        deletePassword ? { adminPassword: deletePassword } : undefined
      )
      toast.success('Receipt deleted permanently')
      setShowDeleteDialog(false)
      setSelectedReceipt(null)
      setDeletePassword('')
      loadReceipts()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete receipt')
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-amber-500" />
    }
  }

  const statusCounts = {
    pending: receipts.filter((r) => r.status === 'pending').length,
    approved: receipts.filter((r) => r.status === 'approved').length,
    rejected: receipts.filter((r) => r.status === 'rejected').length,
    all: receipts.length,
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">
              Pending {statusCounts.pending > 0 && (
                <Badge variant="default" className="ml-1.5 bg-amber-500 text-white h-5 text-[10px] px-1.5">{statusCounts.pending}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search by student name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-40 w-full mb-3 rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : receipts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No receipts found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {receipts.map((receipt) => (
            <Card key={receipt.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative aspect-[4/3] bg-gray-100">
                {receipt.imageUrl ? (
                  <img
                    src={receipt.imageUrl}
                    alt="Receipt"
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => { setSelectedReceipt(receipt); setShowImageDialog(true) }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <ImageIcon className="w-12 h-12 opacity-30" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Badge
                    variant={receipt.status === 'approved' ? 'default' : receipt.status === 'rejected' ? 'destructive' : 'secondary'}
                    className={receipt.status === 'approved' ? 'bg-emerald-500 text-white' : receipt.status === 'pending' ? 'bg-amber-100 text-amber-700' : ''}
                  >
                    {receipt.status}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{receipt.studentName}</p>
                    {receipt.studentCode && (
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">{receipt.studentCode}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(receipt.createdAt).toLocaleDateString()} at {new Date(receipt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {receipt.billingTitle && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{receipt.billingTitle}</p>
                    )}
                  </div>
                  {getStatusIcon(receipt.status)}
                </div>
                {receipt.amount && (
                  <p className="text-sm font-bold text-emerald-600 mt-2">{formatCurrency(receipt.amount)}</p>
                )}
                {receipt.adminNotes && (
                  <p className="text-xs text-gray-500 mt-1 italic">&quot;{receipt.adminNotes}&quot;</p>
                )}
                {receipt.status === 'pending' && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => openReview(receipt)}
                    >
                      <Eye className="w-4 h-4 mr-1.5" />
                      Review
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => {
                        setSelectedReceipt(receipt)
                        setDeletePassword('')
                        setShowDeleteDialog(true)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {receipt.status !== 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-3 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => {
                      setSelectedReceipt(receipt)
                      setDeletePassword('')
                      setShowDeleteDialog(true)
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Delete Receipt
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Image Preview Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="sm:max-w-3xl p-2">
          <div className="rounded-lg overflow-hidden">
            {selectedReceipt?.imageUrl && (
              <img src={selectedReceipt.imageUrl} alt="Receipt full" className="w-full h-auto max-h-[80vh] object-contain" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Receipt</DialogTitle>
            <DialogDescription>
              From {selectedReceipt?.studentName} &middot; {selectedReceipt?.createdAt && new Date(selectedReceipt.createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg overflow-hidden bg-gray-100">
              {selectedReceipt?.imageUrl ? (
                <img src={selectedReceipt.imageUrl} alt="Receipt" className="w-full h-auto max-h-[400px] object-contain" />
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-400">
                  <ImageIcon className="w-12 h-12 opacity-30" />
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Payment Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Enter confirmed payment amount"
                  value={reviewForm.amount}
                  onChange={(e) => setReviewForm({ ...reviewForm, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  placeholder="Add any notes about this review..."
                  value={reviewForm.notes}
                  onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="text-xs text-gray-400 space-y-1">
                {selectedReceipt?.billingTitle && <p>Billing: {selectedReceipt.billingTitle}</p>}
                {selectedReceipt?.notes && <p>Student notes: {selectedReceipt.notes}</p>}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => handleReview('reject')}
              disabled={reviewing}
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Reject
            </Button>
            <Button
              onClick={() => handleReview('approve')}
              disabled={reviewing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {reviewing ? 'Processing...' : 'Approve & Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open)
        if (!open) setDeletePassword('')
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Receipt Permanently</DialogTitle>
            <DialogDescription>
              Delete this receipt from {selectedReceipt?.studentName}? If it has already been approved and recorded as a payment, enter the admin password to override.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Admin Password Override</Label>
            <Input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Required only for processed receipts"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
