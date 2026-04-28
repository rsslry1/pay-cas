'use client'

import { useEffect, useState, useCallback } from 'react'
import { payments as paymentsApi } from '@/lib/api'
import {
  Search,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'

interface Payment {
  id: string
  studentName: string
  studentId?: string
  amount: number
  receiptId?: string
  receiptStatus?: string
  processedByName?: string
  createdAt: string
  billingTitle?: string
  description?: string
}

export default function PaymentsView() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 15

  const loadPayments = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page), limit: String(pageSize) }
      if (search) params.search = search
      if (dateFrom) params.dateFrom = dateFrom
      if (dateTo) params.dateTo = dateTo
      const data = await paymentsApi.list(params)
      setPayments(data.payments || data.data || [])
      setTotal(data.total || data.payments?.length || 0)
    } catch {
      toast.error('Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [page, search, dateFrom, dateTo])

  useEffect(() => {
    loadPayments()
  }, [loadPayments])

  useEffect(() => {
    setPage(1)
  }, [search, dateFrom, dateTo])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

  const totalPages = Math.ceil(total / pageSize)
  const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100">
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Payments</p>
              <p className="text-xl font-bold">{payments.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Page Total</p>
              <p className="text-xl font-bold">{formatCurrency(totalAmount)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <CreditCard className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Records Shown</p>
              <p className="text-xl font-bold">{total > 0 ? `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)}` : '0'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search by student..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="sm:w-40" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="sm:w-40" />
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo('') }}>Clear dates</Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Receipt</TableHead>
                  <TableHead className="hidden lg:table-cell">Processed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                      <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{p.studentName || '-'}</p>
                          {p.studentId && <p className="text-xs text-gray-400 font-mono">{p.studentId}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-600 max-w-[200px] truncate">
                        {p.description || p.billingTitle || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm text-emerald-600">
                        +{formatCurrency(p.amount)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {p.receiptStatus ? (
                          <Badge
                            variant={p.receiptStatus === 'approved' ? 'default' : 'secondary'}
                            className={p.receiptStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' : ''}
                          >
                            {p.receiptStatus}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">Manual</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                        {p.processedByName || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">Page {page} of {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
