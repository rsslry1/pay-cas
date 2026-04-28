'use client'

import { useEffect, useState, useCallback } from 'react'
import { students as studentsApi } from '@/lib/api'
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Users,
  X,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

interface Student {
  id: string
  studentId: string
  firstName: string
  middleName?: string
  lastName: string
  email?: string
  course: string
  year: number
  section: string
  status: 'active' | 'inactive'
  enrollDate: string
  balance?: number
}

const courseOptions = ['BSIT', 'BSCS', 'BSIS', 'BSECE', 'BSME', 'BSCE', 'BSCpE']
const yearOptions = ['1', '2', '3', '4']
const sectionOptions = ['A', 'B', 'C', 'D']
const studentCsvHeaders = ['firstName', 'middleName', 'lastName', 'email', 'password', 'course', 'year', 'section']
const studentCsvExample = 'firstName,middleName,lastName,email,password,course,year,section\nJuan,Santos,Cruz,juan.cruz@school.edu,student123,BSIT,1,A'

export default function StudentsView() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showHardDeleteDialog, setShowHardDeleteDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showCsvDialog, setShowCsvDialog] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [hardDeletePassword, setHardDeletePassword] = useState('')
  const [detailData, setDetailData] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const pageSize = 10

  const loadStudents = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page), limit: String(pageSize) }
      if (search) params.search = search
      if (filterCourse) params.course = filterCourse
      if (filterYear) params.year = filterYear
      if (filterStatus) params.status = filterStatus
      const data = await studentsApi.list(params)
      setStudents(data.students || data.data || [])
      setTotal(data.total || data.students?.length || 0)
    } catch {
      toast.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }, [page, search, filterCourse, filterYear, filterStatus])

  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  useAutoRefresh(loadStudents)

  useEffect(() => {
    setPage(1)
  }, [search, filterCourse, filterYear, filterStatus])

  const totalPages = Math.ceil(total / pageSize)

  const openDetail = async (student: Student) => {
    setSelectedStudent(student)
    setShowDetailDialog(true)
    try {
      const [balance, ledger] = await Promise.all([
        studentsApi.balance(student.id),
        studentsApi.ledger(student.id),
      ])
      setDetailData({ balance, ledger })
    } catch {
      setDetailData(null)
    }
  }

  const handleDelete = async () => {
    if (!selectedStudent) return
    try {
      await studentsApi.delete(selectedStudent.id)
      toast.success('Student deactivated successfully')
      setShowDeleteDialog(false)
      setSelectedStudent(null)
      loadStudents()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete student')
    }
  }

  const handleHardDelete = async () => {
    if (!selectedStudent) return
    try {
      await studentsApi.hardDelete(selectedStudent.id, { adminPassword: hardDeletePassword })
      toast.success('Student deleted permanently')
      setShowHardDeleteDialog(false)
      setSelectedStudent(null)
      setHardDeletePassword('')
      loadStudents()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete student permanently')
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterCourse} onValueChange={setFilterCourse}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courseOptions.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterYear} onValueChange={(v) => setFilterYear(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[90px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Student
        </Button>
        <Button variant="outline" onClick={() => setShowCsvDialog(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload CSV
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Course</TableHead>
                  <TableHead className="hidden sm:table-cell">Year</TableHead>
                  <TableHead className="hidden lg:table-cell">Section</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.studentId}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{s.lastName}, {s.firstName}{s.middleName ? ` ${s.middleName.charAt(0)}.` : ''}</p>
                          {s.email && <p className="text-xs text-gray-400 truncate max-w-[180px]">{s.email}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{s.course}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{s.year}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{s.section}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === 'active' ? 'default' : 'secondary'} className={s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : ''}>
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        {formatCurrency(s.balance || 0)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetail(s)}>
                              <Eye className="w-4 h-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedStudent(s); setShowEditDialog(true) }}>
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setSelectedStudent(s)
                                setShowDeleteDialog(true)
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Deactivate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-700"
                              onClick={() => {
                                setSelectedStudent(s)
                                setHardDeletePassword('')
                                setShowHardDeleteDialog(true)
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete Permanently
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

      {/* Add Student Dialog */}
      <StudentFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSave={loadStudents}
        student={null}
      />

      {showCsvDialog && (
        <StudentCsvUploadDialog
          open={showCsvDialog}
          onOpenChange={setShowCsvDialog}
          onSave={loadStudents}
        />
      )}

      {/* Edit Student Dialog */}
      <StudentFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSave={loadStudents}
        student={selectedStudent}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {selectedStudent?.firstName} {selectedStudent?.lastName}? This action can be undone later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showHardDeleteDialog} onOpenChange={(open) => {
        setShowHardDeleteDialog(open)
        if (!open) {
          setHardDeletePassword('')
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student Permanently</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete {selectedStudent?.firstName} {selectedStudent?.lastName} and related student records. Admin password override is required.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Admin Password</Label>
            <Input
              type="password"
              value={hardDeletePassword}
              onChange={(e) => setHardDeletePassword(e.target.value)}
              placeholder="Enter admin password"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleHardDelete} className="bg-red-700 hover:bg-red-800">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Student Detail Dialog */}
      <StudentDetailDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        student={selectedStudent}
        detailData={detailData}
        formatCurrency={formatCurrency}
      />
    </div>
  )
}

function StudentCsvUploadDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [csvText, setCsvText] = useState(studentCsvExample)
  const [fileName, setFileName] = useState('')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    try {
      const text = await file.text()
      setCsvText(text)
    } catch {
      toast.error('Failed to read CSV file')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = csvText.trim()
    if (!trimmed) {
      toast.error('Please upload or paste CSV content')
      return
    }

    let rows: Record<string, string>[]
    try {
      rows = parseStudentCsv(trimmed)
    } catch (error: any) {
      toast.error(error.message || 'Invalid CSV format')
      return
    }

    if (rows.length === 0) {
      toast.error('No student rows found in CSV')
      return
    }

    const invalidRow = rows.findIndex((row) => !row.firstName || !row.lastName || !row.course || !row.year || !row.section)
    if (invalidRow !== -1) {
      toast.error(`Row ${invalidRow + 2} is missing required fields`)
      return
    }

    setSaving(true)
    let successCount = 0
    const failures: string[] = []

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index]
      try {
        await studentsApi.create({
          firstName: row.firstName,
          middleName: row.middleName || '',
          lastName: row.lastName,
          email: row.email || '',
          password: row.password || '',
          course: row.course,
          year: parseInt(row.year, 10),
          section: row.section,
        })
        successCount += 1
      } catch (error: any) {
        failures.push(`Row ${index + 2}: ${error.message || 'Failed to create student'}`)
      }
    }

    if (successCount > 0) {
      toast.success(`Imported ${successCount} student${successCount !== 1 ? 's' : ''}`)
      onSave()
    }

    if (failures.length > 0) {
      toast.error(failures[0])
    }

    if (successCount > 0 && failures.length === 0) {
      onOpenChange(false)
    }

    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Students CSV</DialogTitle>
          <DialogDescription>
            Import multiple students using the same fields as the add student form.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border bg-gray-50 p-4 text-sm text-gray-700 space-y-2">
            <p className="font-medium text-gray-900">CSV format</p>
            <p>Required columns: `firstName`, `lastName`, `course`, `year`, `section`</p>
            <p>Optional columns: `middleName`, `email`, `password`</p>
            <p>Header order to use:</p>
            <code className="block rounded bg-white px-3 py-2 text-xs text-gray-700">
              {studentCsvHeaders.join(',')}
            </code>
          </div>

          <div className="space-y-2">
            <Label>Upload CSV File</Label>
            <Input type="file" accept=".csv,text/csv" onChange={handleFileChange} />
            {fileName && <p className="text-xs text-gray-500">{fileName}</p>}
          </div>

          <div className="space-y-2">
            <Label>CSV Content</Label>
            <Textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={12}
              className="font-mono text-xs"
            />
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-medium">Example row</p>
            <code className="mt-2 block whitespace-pre-wrap break-all text-xs">{studentCsvExample}</code>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? 'Importing...' : 'Import Students'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function parseStudentCsv(csv: string) {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    throw new Error('CSV must include a header row and at least one student row')
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim())
  const missingHeaders = ['firstName', 'lastName', 'course', 'year', 'section'].filter(
    (requiredHeader) => !headers.includes(requiredHeader)
  )

  if (missingHeaders.length > 0) {
    throw new Error(`Missing required header(s): ${missingHeaders.join(', ')}`)
  }

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    const row: Record<string, string> = {}

    headers.forEach((header, index) => {
      row[header] = (values[index] || '').trim()
    })

    return row
  })
}

function parseCsvLine(line: string) {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const nextChar = line[index + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }

  values.push(current)
  return values
}

function StudentFormDialog({
  open,
  onOpenChange,
  onSave,
  student,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: () => void
  student: Student | null
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    password: '',
    course: '',
    year: '1',
    section: 'A',
    status: 'active' as 'active' | 'inactive',
  })

  useEffect(() => {
    if (student) {
      setForm({
        firstName: student.firstName,
        middleName: student.middleName || '',
        lastName: student.lastName,
        email: student.email || '',
        password: '',
        course: student.course,
        year: String(student.year),
        section: student.section,
        status: student.status,
      })
    } else {
      setForm({
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        password: '',
        course: '',
        year: '1',
        section: 'A',
        status: 'active',
      })
    }
  }, [student, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.firstName || !form.lastName || !form.course) {
      toast.error('Please fill in all required fields')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        year: parseInt(form.year),
      }
      if (student) {
        await studentsApi.update(student.id, payload)
        toast.success('Student updated successfully')
      } else {
        await studentsApi.create(payload)
        toast.success('Student added successfully')
      }
      onOpenChange(false)
      onSave()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save student')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{student ? 'Edit Student' : 'Add New Student'}</DialogTitle>
          <DialogDescription>
            {student ? 'Update student information' : 'Fill in the details to register a new student'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name *</Label>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Middle Name</Label>
              <Input value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Last Name *</Label>
            <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          {!student && (
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Leave blank to use student123"
              />
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Course *</Label>
              <Select value={form.course} onValueChange={(v) => setForm({ ...form, course: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {courseOptions.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year *</Label>
              <Select value={form.year} onValueChange={(v) => setForm({ ...form, year: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Section *</Label>
              <Select value={form.section} onValueChange={(v) => setForm({ ...form, section: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sectionOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {student && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as 'active' | 'inactive' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? 'Saving...' : student ? 'Update Student' : 'Add Student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StudentDetailDialog({
  open,
  onOpenChange,
  student,
  detailData,
  formatCurrency,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  student: Student | null
  detailData: any
  formatCurrency: (v: number) => string
}) {
  if (!student) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student Details</DialogTitle>
          <DialogDescription>Complete profile and billing information</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="billing">Billings</TabsTrigger>
            <TabsTrigger value="ledger">Ledger</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Student ID</p>
                <p className="font-mono text-sm font-medium">{student.studentId}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <Badge variant={student.status === 'active' ? 'default' : 'secondary'} className={student.status === 'active' ? 'bg-emerald-100 text-emerald-700' : ''}>
                  {student.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">Full Name</p>
                <p className="text-sm font-medium">{student.firstName} {student.middleName ? `${student.middleName} ` : ''}{student.lastName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm">{student.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Course</p>
                <p className="text-sm font-medium">{student.course}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Year / Section</p>
                <p className="text-sm font-medium">{student.year}-{student.section}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Enrollment Date</p>
                <p className="text-sm">{student.enrollDate ? new Date(student.enrollDate).toLocaleDateString() : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Current Balance</p>
                <p className={`text-sm font-bold ${detailData?.balance?.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatCurrency(detailData?.balance?.balance || 0)}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="billing" className="mt-4">
            {detailData?.ledger?.summary ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-3">
                    <p className="text-xs text-gray-500">Total Charges</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(detailData.ledger.summary.totalCharges)}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-gray-500">Total Payments</p>
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(detailData.ledger.summary.totalPayments)}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-gray-500">Outstanding</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(detailData.ledger.summary.outstanding)}</p>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">No billing data available</div>
            )}
          </TabsContent>

          <TabsContent value="ledger" className="mt-4">
            {detailData?.ledger?.transactions && detailData.ledger.transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailData.ledger.transactions.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={tx.type === 'payment' ? 'default' : 'secondary'} className={tx.type === 'payment' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{tx.description || '-'}</TableCell>
                        <TableCell className={`text-right font-medium text-sm ${tx.type === 'payment' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {tx.type === 'payment' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(tx.balanceAfter)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">No transactions found</div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
