'use client'

import { useCallback, useEffect, useState } from 'react'
import { billings as billingsApi, students as studentsApi, transactions as transactionsApi } from '@/lib/api'
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowDownCircle,
  ArrowUpCircle,
  SlidersHorizontal,
  Check,
  ChevronsUpDown,
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'
import { cn } from '@/lib/utils'

interface TransactionRow {
  id: string
  type: 'charge' | 'payment' | 'adjustment'
  amount: number
  description?: string
  balanceAfter: number
  createdAt: string
  student?: {
    id: string
    firstName: string
    lastName: string
    studentId: string
  }
  billing?: {
    id: string
    title: string
  } | null
}

interface StudentOption {
  id: string
  studentId: string
  firstName: string
  lastName: string
}

interface BillingOption {
  id: string
  title: string
  amount: number
}

export default function TransactionsView() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRow | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const pageSize = 15

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page), limit: String(pageSize) }
      if (search) params.search = search
      if (typeFilter) params.type = typeFilter
      const data = await transactionsApi.list(params)
      const rows = data.transactions || []
      setTransactions(rows)
      setTotal(data.total || data.pagination?.total || rows.length || 0)
    } catch {
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [page, search, typeFilter])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTransactions()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadTransactions])

  useAutoRefresh(loadTransactions)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

  const totalPages = Math.ceil(total / pageSize)

  const handleDelete = async () => {
    if (!selectedTransaction) return
    setDeleting(true)
    try {
      await transactionsApi.hardDelete(selectedTransaction.id, {
        adminPassword: deletePassword,
      })
      toast.success('Transaction deleted permanently')
      setShowDeleteDialog(false)
      setSelectedTransaction(null)
      setDeletePassword('')
      void loadTransactions()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete transaction')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <ArrowDownCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Charges on Page</p>
              <p className="text-xl font-bold">{transactions.filter((tx) => tx.type === 'charge').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100">
              <ArrowUpCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Payments on Page</p>
              <p className="text-xl font-bold">{transactions.filter((tx) => tx.type === 'payment').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <SlidersHorizontal className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Adjustments on Page</p>
              <p className="text-xl font-bold">{transactions.filter((tx) => tx.type === 'adjustment').length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search student, billing, or note..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter(value === 'all' ? '' : value)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Transaction type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="charge">Charge</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="adjustment">Adjustment</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Manual Transaction
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden md:table-cell">Reference</TableHead>
                  <TableHead className="hidden lg:table-cell">Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance After</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => {
                    const signedAmount =
                      tx.type === 'payment'
                        ? tx.amount
                        : tx.type === 'adjustment'
                        ? tx.amount
                        : -Math.abs(tx.amount)

                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {tx.student ? `${tx.student.lastName}, ${tx.student.firstName}` : '-'}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">{tx.student?.studentId || ''}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              tx.type === 'payment'
                                ? 'bg-emerald-100 text-emerald-700'
                                : tx.type === 'charge'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                            }
                          >
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-gray-600">
                          {tx.billing?.title || 'Manual entry'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-gray-500 max-w-[260px] truncate">
                          {tx.description || '-'}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium text-sm ${
                            signedAmount >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {signedAmount >= 0 ? '+' : '-'}
                          {formatCurrency(Math.abs(signedAmount))}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatCurrency(tx.balanceAfter)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setSelectedTransaction(tx)
                              setDeletePassword('')
                              setShowDeleteDialog(true)
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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

      {showCreateDialog && (
        <CreateTransactionDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSaved={loadTransactions}
        />
      )}

      <Dialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open)
        if (!open) {
          setDeletePassword('')
          setSelectedTransaction(null)
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Transaction Permanently</DialogTitle>
            <DialogDescription>
              Delete this ledger transaction and recompute the student balance. Admin password override is required.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
            <p className="font-medium text-gray-900">
              {selectedTransaction?.student
                ? `${selectedTransaction.student.lastName}, ${selectedTransaction.student.firstName}`
                : 'Selected transaction'}
            </p>
            <p>{selectedTransaction?.description || selectedTransaction?.billing?.title || selectedTransaction?.type}</p>
          </div>
          <div className="space-y-2">
            <Label>Admin Password</Label>
            <Input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter admin password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CreateTransactionDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [students, setStudents] = useState<StudentOption[]>([])
  const [billings, setBillings] = useState<BillingOption[]>([])
  const [studentPickerOpen, setStudentPickerOpen] = useState(false)
  const [form, setForm] = useState({
    studentId: '',
    billingId: '',
    type: 'charge',
    amount: '',
    description: '',
  })

  const loadDialogData = useCallback(async () => {
    try {
      const [studentData, billingData] = await Promise.all([
        studentsApi.list({ status: 'active', limit: '200' }),
        billingsApi.list({ status: 'active', limit: '200' }),
      ])
      setStudents(studentData.students || studentData.data || [])
      setBillings(billingData.billings || billingData.data || [])
    } catch {
      toast.error('Failed to load transaction form data')
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      void loadDialogData()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [open, loadDialogData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsedAmount = Number(form.amount)
    if (!form.studentId || !form.type || Number.isNaN(parsedAmount) || parsedAmount === 0) {
      toast.error('Select a student, transaction type, and valid amount')
      return
    }

    if ((form.type === 'charge' || form.type === 'payment') && parsedAmount < 0) {
      toast.error('Charge and payment amounts must be positive')
      return
    }

    setSaving(true)
    try {
      await transactionsApi.create({
        studentId: form.studentId,
        billingId: form.billingId || undefined,
        type: form.type,
        amount: parsedAmount,
        description: form.description || undefined,
      })
      toast.success('Manual transaction added')
      onOpenChange(false)
      onSaved()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create transaction')
    } finally {
      setSaving(false)
    }
  }

  const helperText =
    form.type === 'charge'
      ? 'Adds a manual charge and increases the student outstanding balance.'
      : form.type === 'payment'
      ? 'Records a payment and reduces the student outstanding balance.'
      : 'Use a positive amount to increase balance or a negative amount to reduce it.'

  const selectedBilling = billings.find((billing) => billing.id === form.billingId)
  const selectedStudent = students.find((student) => student.id === form.studentId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Manual Transaction</DialogTitle>
          <DialogDescription>
            Create a ledger entry for a student. It will appear on the student side automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Student *</Label>
            <Popover open={studentPickerOpen} onOpenChange={setStudentPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={studentPickerOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedStudent
                    ? `${selectedStudent.lastName}, ${selectedStudent.firstName} (${selectedStudent.studentId})`
                    : 'Search and select a student'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search student name or ID..." />
                  <CommandList>
                    <CommandEmpty>No student found.</CommandEmpty>
                    <CommandGroup>
                      {students.map((student) => (
                        <CommandItem
                          key={student.id}
                          value={`${student.studentId} ${student.firstName} ${student.lastName}`}
                          onSelect={() => {
                            setForm((prev) => ({ ...prev, studentId: student.id }))
                            setStudentPickerOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              form.studentId === student.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {student.lastName}, {student.firstName}
                            </p>
                            <p className="text-xs text-gray-400">{student.studentId}</p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(value) => setForm((prev) => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="charge">Charge</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder={form.type === 'adjustment' ? 'Use negative to reduce' : '0.00'}
              />
            </div>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {helperText}
          </div>

          <div className="space-y-2">
            <Label>Related Billing</Label>
            <Select value={form.billingId || 'none'} onValueChange={(value) => setForm((prev) => ({ ...prev, billingId: value === 'none' ? '' : value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Optional billing reference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No linked billing</SelectItem>
                {billings.map((billing) => (
                  <SelectItem key={billing.id} value={billing.id}>
                    {billing.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBilling && (
              <p className="text-xs text-gray-500">
                Billing amount: {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(selectedBilling.amount)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Optional note visible in the student ledger"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? 'Saving...' : 'Create Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
