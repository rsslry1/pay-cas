'use client'

import { useEffect, useState, useCallback } from 'react'
import { billings as billingsApi, feeCategories as fcApi, academicYears as ayApi } from '@/lib/api'
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Power,
  ChevronLeft,
  ChevronRight,
  FileText,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

interface Billing {
  id: string
  title: string
  description?: string
  amount: number
  dueDate?: string
  feeCategoryId?: string
  feeCategory?: { name: string }
  academicYearId?: string
  academicYear?: { label: string }
  status: 'active' | 'inactive'
  assignedCount?: number
  createdAt: string
}

interface FeeCategory {
  id: string
  name: string
}

interface AcademicYear {
  id: string
  label: string
  isCurrent: boolean
}

export default function BillingsView() {
  const [billings, setBillings] = useState<Billing[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showHardDeleteDialog, setShowHardDeleteDialog] = useState(false)
  const [showAssignmentsDialog, setShowAssignmentsDialog] = useState(false)
  const [selectedBilling, setSelectedBilling] = useState<Billing | null>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [hardDeletePassword, setHardDeletePassword] = useState('')
  const pageSize = 10

  const loadBillings = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page), limit: String(pageSize) }
      if (search) params.search = search
      if (filterStatus) params.status = filterStatus
      const data = await billingsApi.list(params)
      setBillings(data.billings || data.data || [])
      setTotal(data.total || data.billings?.length || 0)
    } catch {
      toast.error('Failed to load billings')
    } finally {
      setLoading(false)
    }
  }, [page, search, filterStatus])

  useEffect(() => {
    loadBillings()
  }, [loadBillings])

  useAutoRefresh(loadBillings)

  useEffect(() => {
    setPage(1)
  }, [search, filterStatus])

  const handleToggle = async (billing: Billing) => {
    try {
      await billingsApi.toggle(billing.id)
      toast.success(`Billing ${billing.status === 'active' ? 'deactivated' : 'activated'}`)
      loadBillings()
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle billing')
    }
  }

  const handleDelete = async () => {
    if (!selectedBilling) return
    try {
      await billingsApi.delete(selectedBilling.id)
      toast.success('Billing archived successfully')
      setShowDeleteDialog(false)
      setSelectedBilling(null)
      loadBillings()
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive billing')
    }
  }

  const handleHardDelete = async () => {
    if (!selectedBilling) return
    try {
      await billingsApi.hardDelete(selectedBilling.id, hardDeletePassword ? { adminPassword: hardDeletePassword } : undefined)
      toast.success('Billing deleted permanently')
      setShowHardDeleteDialog(false)
      setSelectedBilling(null)
      setHardDeletePassword('')
      loadBillings()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete billing')
    }
  }

  const viewAssignments = async (billing: Billing) => {
    setSelectedBilling(billing)
    setShowAssignmentsDialog(true)
    try {
      const data = await billingsApi.assignments(billing.id)
      setAssignments(data.assignments || data || [])
    } catch {
      setAssignments([])
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search billings..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Billing
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Assigned</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : billings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      No billings found
                    </TableCell>
                  </TableRow>
                ) : (
                  billings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{b.title}</p>
                          {b.academicYear?.label && (
                            <p className="text-xs text-gray-400">{b.academicYear.label}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {b.feeCategory?.name || '-'}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{formatCurrency(b.amount)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-gray-500">
                        {b.dueDate ? new Date(b.dueDate).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={b.status === 'active' ? 'default' : 'secondary'} className={b.status === 'active' ? 'bg-emerald-100 text-emerald-700' : ''}>
                          {b.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {b.assignedCount ?? '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => viewAssignments(b)}>
                              <Eye className="w-4 h-4 mr-2" /> View Assignments
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggle(b)}>
                              <Power className="w-4 h-4 mr-2" /> {b.status === 'active' ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedBilling(b); setShowEditDialog(true) }}>
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-amber-600" onClick={() => { setSelectedBilling(b); setShowDeleteDialog(true) }}>
                              <Trash2 className="w-4 h-4 mr-2" /> Archive
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedBilling(b); setShowHardDeleteDialog(true) }}>
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}</p>
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

      {/* Add/Edit Dialog */}
      <BillingFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSave={loadBillings}
        billing={null}
      />
      <BillingFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSave={loadBillings}
        billing={selectedBilling}
      />

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Billing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive &quot;{selectedBilling?.title}&quot;? This will not affect existing student assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showHardDeleteDialog} onOpenChange={(open) => {
        setShowHardDeleteDialog(open)
        if (!open) setHardDeletePassword('')
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Billing Permanently</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete &quot;{selectedBilling?.title}&quot;? If this billing already has assigned students or transactions, enter the admin password to override the protection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Admin Password Override</Label>
            <Input
              type="password"
              value={hardDeletePassword}
              onChange={(e) => setHardDeletePassword(e.target.value)}
              placeholder="Required only for billings with dependencies"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleHardDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Assignments Dialog */}
      <Dialog open={showAssignmentsDialog} onOpenChange={setShowAssignmentsDialog}>
        <DialogContent className="sm:max-w-lg max-h-[70vh]">
          <DialogHeader>
            <DialogTitle>Assignments - {selectedBilling?.title}</DialogTitle>
            <DialogDescription>
              {assignments.length} student{assignments.length !== 1 ? 's' : ''} assigned
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {assignments.length === 0 ? (
              <p className="text-center py-8 text-gray-400">No students assigned</p>
            ) : (
              <div className="space-y-2">
                {assignments.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-2 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{a.studentName || a.student?.name || '-'}</p>
                      <p className="text-xs text-gray-400">{a.studentId || a.student?.studentId || ''}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{a.status || 'pending'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BillingFormDialog({
  open,
  onOpenChange,
  onSave,
  billing,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: () => void
  billing: Billing | null
}) {
  const [saving, setSaving] = useState(false)
  const [feeCategories, setFeeCategories] = useState<FeeCategory[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    amount: '',
    dueDate: '',
    feeCategoryId: '',
    academicYearId: '',
  })

  useEffect(() => {
    Promise.all([fcApi.list(), ayApi.list()]).then(([fc, ay]) => {
      setFeeCategories(Array.isArray(fc) ? fc : fc?.categories || [])
      setAcademicYears(
        (Array.isArray(ay) ? ay : ay?.academicYears || []).map((year: any) => ({
          id: year.id,
          label: year.label || year.year,
          isCurrent: Boolean(year.isCurrent),
        }))
      )
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (billing) {
      setForm({
        title: billing.title,
        description: billing.description || '',
        amount: String(billing.amount),
        dueDate: billing.dueDate ? billing.dueDate.split('T')[0] : '',
        feeCategoryId: billing.feeCategoryId || '',
        academicYearId: billing.academicYearId || '',
      })
    } else {
      setForm({ title: '', description: '', amount: '', dueDate: '', feeCategoryId: '', academicYearId: '' })
    }
  }, [billing, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.amount) {
      toast.error('Please fill in title and amount')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        ...(billing ? {} : { assignToAll: true }),
      }
      if (billing) {
        await billingsApi.update(billing.id, payload)
        toast.success('Billing updated')
      } else {
        await billingsApi.create(payload)
        toast.success('Billing created')
      }
      onOpenChange(false)
      onSave()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save billing')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{billing ? 'Edit Billing' : 'Create New Billing'}</DialogTitle>
          <DialogDescription>
            {billing ? 'Update billing details' : 'Define a new billing item for students'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g., Tuition Fee - 2nd Semester" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          {!billing && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              This billing will be assigned automatically to all active students. Each student will be charged the full billing amount.
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fee Category</Label>
              <Select value={form.feeCategoryId} onValueChange={(v) => setForm({ ...form, feeCategoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {feeCategories.map((fc) => (
                    <SelectItem key={fc.id} value={fc.id}>{fc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Select value={form.academicYearId} onValueChange={(v) => setForm({ ...form, academicYearId: v })}>
                <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>
                  {academicYears.map((ay) => (
                    <SelectItem key={ay.id} value={ay.id}>{ay.label} {ay.isCurrent ? '(Current)' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? 'Saving...' : billing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
