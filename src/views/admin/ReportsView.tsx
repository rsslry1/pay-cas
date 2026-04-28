'use client'

import { useEffect, useState, useCallback } from 'react'
import { reportsApi, dashboard } from '@/lib/api'
import {
  Download,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { toast } from 'sonner'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

interface SummaryData {
  totalCollections: number
  outstandingBalance: number
  paidStudents: number
  unpaidStudents: number
  totalStudents: number
  collectionsOverTime?: any[]
  outstandingByCourse?: any[]
  paymentStatusDistribution?: any[]
}

interface UnpaidStudent {
  id: string
  studentId: string
  name: string
  course: string
  year: number
  outstandingBalance: number
  billingTitle?: string
}

const PIE_COLORS = ['#059669', '#ef4444', '#f59e0b', '#6366f1']

export default function ReportsView() {
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [unpaid, setUnpaid] = useState<UnpaidStudent[]>([])
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingUnpaid, setLoadingUnpaid] = useState(false)
  const [filterCourse, setFilterCourse] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterBilling, setFilterBilling] = useState('')

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true)
    try {
      const data = await reportsApi.summary()
      const normalized = data?.summary || data || {}
      setSummary({
        totalCollections: normalized.totalCollections ?? normalized.totalCollected ?? 0,
        outstandingBalance: normalized.outstandingBalance ?? 0,
        paidStudents: normalized.paidStudents ?? 0,
        unpaidStudents: normalized.unpaidStudents ?? 0,
        totalStudents: normalized.totalStudents ?? 0,
        collectionsOverTime: normalized.collectionsOverTime || [],
        outstandingByCourse: normalized.outstandingByCourse || [],
        paymentStatusDistribution: normalized.paymentStatusDistribution || [],
      })
    } catch {
      toast.error('Failed to load report summary')
    } finally {
      setLoadingSummary(false)
    }
  }, [])

  const loadUnpaid = useCallback(async () => {
    setLoadingUnpaid(true)
    try {
      const params: Record<string, string> = {}
      if (filterCourse) params.course = filterCourse
      if (filterYear) params.year = filterYear
      if (filterBilling) params.billingId = filterBilling
      const data = await reportsApi.unpaid(params)
      const rows = Array.isArray(data) ? data : data?.unpaidStudents || data?.students || []
      setUnpaid(rows.map((row: any) => ({
        id: row.id,
        studentId: row.studentId || row.student?.studentId || '',
        name:
          row.name ||
          [row.student?.firstName, row.student?.lastName].filter(Boolean).join(' ') ||
          '-',
        course: row.course || row.student?.course || '-',
        year: row.year || row.student?.year || 0,
        outstandingBalance: row.outstandingBalance ?? row.billing?.amount ?? 0,
        billingTitle: row.billingTitle || row.billing?.title,
      })))
    } catch {
      toast.error('Failed to load unpaid students')
    } finally {
      setLoadingUnpaid(false)
    }
  }, [filterCourse, filterYear, filterBilling])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    loadUnpaid()
  }, [loadUnpaid])

  useAutoRefresh(loadSummary)
  useAutoRefresh(loadUnpaid)

  const handleExport = async (type: string) => {
    try {
      const res = await reportsApi.export({ type })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-report-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export downloaded')
    } catch {
      toast.error('Failed to export')
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

  const summaryCards = [
    { title: 'Total Collections', value: summary?.totalCollections, icon: DollarSign, color: 'bg-emerald-50 text-emerald-600', iconBg: 'bg-emerald-100' },
    { title: 'Outstanding Balances', value: summary?.outstandingBalance, icon: AlertCircle, color: 'bg-red-50 text-red-600', iconBg: 'bg-red-100' },
    { title: 'Paid Students', value: summary?.paidStudents, icon: CheckCircle2, color: 'bg-blue-50 text-blue-600', iconBg: 'bg-blue-100', format: 'number' as const },
    { title: 'Unpaid Students', value: summary?.unpaidStudents, icon: XCircle, color: 'bg-amber-50 text-amber-600', iconBg: 'bg-amber-100', format: 'number' as const },
  ]

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardContent className="p-5 flex items-start gap-3">
                <div className={`p-2 rounded-lg ${card.iconBg}`}>
                  <Icon className={`w-5 h-5 ${card.color.split(' ')[1]}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{card.title}</p>
                  {loadingSummary ? (
                    <Skeleton className="h-7 w-28 mt-1" />
                  ) : (
                    <p className="text-xl font-bold text-gray-900">
                      {card.format === 'number'
                        ? (card.value || 0).toLocaleString()
                        : formatCurrency(card.value || 0)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Collections Over Time */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Collections Over Time</CardTitle>
                <CardDescription>Monthly collection trends</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleExport('transactions')}>
                <Download className="w-4 h-4 mr-1.5" />
                CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-[280px] w-full" />
            ) : summary?.collectionsOverTime && summary.collectionsOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={summary.collectionsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Collections']} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <Line type="monotone" dataKey="total" stroke="#059669" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-gray-400">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Outstanding by Course */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Outstanding by Course</CardTitle>
                <CardDescription>Balance breakdown per course</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleExport('billings')}>
                <Download className="w-4 h-4 mr-1.5" />
                CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-[280px] w-full" />
            ) : summary?.outstandingByCourse && summary.outstandingByCourse.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={summary.outstandingByCourse}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="course" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Outstanding']} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <Bar dataKey="total" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-gray-400">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pie Chart + Unpaid Students */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Status</CardTitle>
            <CardDescription>Distribution of payment states</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-[250px] w-full" />
            ) : summary?.paymentStatusDistribution && summary.paymentStatusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={summary.paymentStatusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="status"
                  >
                    {summary.paymentStatusDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-gray-400">No data</div>
            )}
          </CardContent>
        </Card>

        {/* Unpaid Students Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Unpaid Students</CardTitle>
                <CardDescription>{unpaid.length} students with outstanding balances</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleExport('students')}>
                <Download className="w-4 h-4 mr-1.5" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Input placeholder="Course" value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className="w-28 h-8 text-sm" />
              <Input placeholder="Year" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="w-20 h-8 text-sm" />
              <Input placeholder="Billing ID" value={filterBilling} onChange={(e) => setFilterBilling(e.target.value)} className="w-32 h-8 text-sm" />
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="hidden sm:table-cell">Course</TableHead>
                    <TableHead className="hidden md:table-cell">Year</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingUnpaid ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 4 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : unpaid.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                        All students are up to date!
                      </TableCell>
                    </TableRow>
                  ) : (
                    unpaid.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{s.name}</p>
                            <p className="text-xs text-gray-400 font-mono">{s.studentId}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{s.course}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{s.year}</TableCell>
                        <TableCell className="text-right font-medium text-sm text-red-600">
                          {formatCurrency(s.outstandingBalance)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
