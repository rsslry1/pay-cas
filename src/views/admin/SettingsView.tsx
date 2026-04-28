'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  feeCategories as fcApi,
  academicYears as ayApi,
  auditLogs as alApi,
  settings as settingsApi,
} from '@/lib/api'
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  Tag,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface FeeCategory {
  id: string
  name: string
  description?: string
  billings?: any[]
}

interface AcademicYearItem {
  id: string
  label: string
  startDate: string
  endDate: string
  isCurrent: boolean
}

interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId?: string
  userId: string
  userName: string
  details?: string
  createdAt: string
}

interface Setting {
  key: string
  value: string
}

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState('general')

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general">
            <SettingsIcon className="w-4 h-4 mr-1.5" />
            General
          </TabsTrigger>
          <TabsTrigger value="fee-categories">
            <Tag className="w-4 h-4 mr-1.5" />
            Fee Categories
          </TabsTrigger>
          <TabsTrigger value="academic-year">
            <Calendar className="w-4 h-4 mr-1.5" />
            Academic Year
          </TabsTrigger>
          <TabsTrigger value="audit-logs">
            <FileText className="w-4 h-4 mr-1.5" />
            Audit Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="fee-categories" className="mt-4">
          <FeeCategoriesSettings />
        </TabsContent>

        <TabsContent value="academic-year" className="mt-4">
          <AcademicYearSettings />
        </TabsContent>

        <TabsContent value="audit-logs" className="mt-4">
          <AuditLogsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function GeneralSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [original, setOriginal] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await settingsApi.get()
      const s: Record<string, string> = {}
      const items = Array.isArray(data) ? data : data.settings || []
      items.forEach((item: any) => {
        if (!item.key.startsWith('session:')) {
          s[item.key] = item.value
        }
      })
      setSettings(s)
      setOriginal(JSON.parse(JSON.stringify(s)))
    } catch {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await settingsApi.update(settings)
      setOriginal(JSON.parse(JSON.stringify(settings)))
      toast.success('Settings saved successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(original)

  const settingFields = [
    { key: 'schoolName', label: 'School Name', type: 'text', placeholder: 'Enter school name' },
    { key: 'schoolAddress', label: 'School Address', type: 'text', placeholder: 'Enter school address' },
    { key: 'schoolEmail', label: 'Contact Email', type: 'email', placeholder: 'admin@school.edu' },
    { key: 'schoolPhone', label: 'Contact Phone', type: 'text', placeholder: '+63 xxx xxx xxxx' },
    { key: 'currency', label: 'Currency', type: 'text', placeholder: 'PHP' },
    { key: 'receiptPrefix', label: 'Receipt Prefix', type: 'text', placeholder: 'RCP-' },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">General Settings</CardTitle>
            <CardDescription>Configure your school billing system</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadSettings} disabled={saving}>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Refresh
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Save className="w-4 h-4 mr-1.5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {settingFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <Input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={settings[field.key] || ''}
                  onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function FeeCategoriesSettings() {
  const [categories, setCategories] = useState<FeeCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selected, setSelected] = useState<FeeCategory | null>(null)

  const loadCategories = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fcApi.list()
      setCategories(data || [])
    } catch {
      toast.error('Failed to load fee categories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const handleDelete = async () => {
    if (!selected) return
    try {
      await fcApi.delete(selected.id)
      toast.success('Fee category deleted')
      setShowDeleteDialog(false)
      setSelected(null)
      loadCategories()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Fee Categories</h3>
          <p className="text-sm text-gray-500">Manage fee categories for billing</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead className="hidden sm:table-cell">Billings</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-400">No fee categories</TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium text-sm">{cat.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-gray-500">{cat.description || '-'}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {cat.billings?.length ?? 0}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelected(cat); setShowEditDialog(true) }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => { setSelected(cat); setShowDeleteDialog(true) }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FeeCategoryFormDialog open={showAddDialog} onOpenChange={setShowAddDialog} onSave={loadCategories} category={null} />
      <FeeCategoryFormDialog open={showEditDialog} onOpenChange={setShowEditDialog} onSave={loadCategories} category={selected} />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fee Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will fail if the category is in use by any billing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function FeeCategoryFormDialog({
  open,
  onOpenChange,
  onSave,
  category,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: () => void
  category: FeeCategory | null
}) {
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (category) {
      setName(category.name)
      setDescription(category.description || '')
    } else {
      setName('')
      setDescription('')
    }
  }, [category, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      if (category) {
        await fcApi.update(category.id, { name, description })
        toast.success('Category updated')
      } else {
        await fcApi.create({ name, description })
        toast.success('Category created')
      }
      onOpenChange(false)
      onSave()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? 'Edit' : 'Add'} Fee Category</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g., Tuition Fee" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AcademicYearSettings() {
  const [years, setYears] = useState<AcademicYearItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selected, setSelected] = useState<AcademicYearItem | null>(null)

  const loadYears = useCallback(async () => {
    setLoading(true)
    try {
      const data = await ayApi.list()
      setYears(data || [])
    } catch {
      toast.error('Failed to load academic years')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadYears()
  }, [loadYears])

  const setCurrent = async (ay: AcademicYearItem) => {
    try {
      await ayApi.update(ay.id, { isCurrent: true })
      toast.success(`Set ${ay.label} as current academic year`)
      loadYears()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update')
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    try {
      await ayApi.delete(selected.id)
      toast.success('Academic year deleted')
      setShowDeleteDialog(false)
      setSelected(null)
      loadYears()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Academic Years</h3>
          <p className="text-sm text-gray-500">Manage academic year periods</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Year
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead className="hidden sm:table-cell">Start Date</TableHead>
                <TableHead className="hidden sm:table-cell">End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : years.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-400">No academic years</TableCell>
                </TableRow>
              ) : (
                years.map((ay) => (
                  <TableRow key={ay.id}>
                    <TableCell className="font-medium text-sm">{ay.label}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-gray-500">
                      {ay.startDate ? new Date(ay.startDate).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-gray-500">
                      {ay.endDate ? new Date(ay.endDate).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      {ay.isCurrent ? (
                        <Badge className="bg-emerald-100 text-emerald-700">Current</Badge>
                      ) : (
                        <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setCurrent(ay)}>
                          Set Current
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      {!ay.isCurrent && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => { setSelected(ay); setShowDeleteDialog(true) }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AcademicYearFormDialog open={showAddDialog} onOpenChange={setShowAddDialog} onSave={loadYears} />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Academic Year</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selected?.label}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function AcademicYearFormDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [label, setLabel] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    if (open) {
      setLabel('')
      setStartDate('')
      setEndDate('')
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!label) { toast.error('Label is required'); return }
    setSaving(true)
    try {
      await ayApi.create({ label, startDate, endDate, isCurrent: false })
      toast.success('Academic year created')
      onOpenChange(false)
      onSave()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Academic Year</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Label *</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} required placeholder="e.g., 2025-2026" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? 'Saving...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AuditLogsTab() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page), limit: String(pageSize) }
      if (search) params.search = search
      const data = await alApi.list(params)
      setLogs(data.logs || data.data || [])
      setTotal(data.total || data.logs?.length || 0)
    } catch {
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  useEffect(() => {
    setPage(1)
  }, [search])

  const totalPages = Math.ceil(total / pageSize)

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'bg-emerald-100 text-emerald-700'
    if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-700'
    if (action.includes('DELETE')) return 'bg-red-100 text-red-700'
    if (action.includes('LOGIN')) return 'bg-purple-100 text-purple-700'
    return 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Audit Logs</h3>
          <p className="text-sm text-gray-500">Track all system activities</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Date</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="hidden md:table-cell">Entity</TableHead>
                  <TableHead className="hidden lg:table-cell">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-400">No logs found</TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-[10px] h-5 ${getActionColor(log.action)}`}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{log.userName}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-500">
                        {log.entityType}{log.entityId ? ` #${log.entityId.slice(0, 8)}` : ''}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-gray-400 max-w-[200px] truncate">
                        {log.details || '-'}
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
