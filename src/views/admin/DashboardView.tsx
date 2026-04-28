'use client'

import { useEffect, useState } from 'react'
import { dashboard as dashboardApi } from '@/lib/api'
import { useAppStore } from '@/store'
import {
  Users,
  FileText,
  DollarSign,
  AlertCircle,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface StatsData {
  totalStudents: number
  activeBillings: number
  totalCollections: number
  outstandingBalance: number
  pendingReceipts: number
  recentTransactions: any[]
  collectionsByCourse: any[]
}

export default function DashboardView() {
  const { setCurrentView } = useAppStore()
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const data = await dashboardApi.stats()
      setStats(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
  }

  const kpiCards = [
    {
      title: 'Total Students',
      value: stats?.totalStudents ?? 0,
      icon: Users,
      format: 'number' as const,
      color: 'bg-blue-50 text-blue-600',
      iconColor: 'bg-blue-100',
    },
    {
      title: 'Active Billings',
      value: stats?.activeBillings ?? 0,
      icon: FileText,
      format: 'number' as const,
      color: 'bg-purple-50 text-purple-600',
      iconColor: 'bg-purple-100',
    },
    {
      title: 'Total Collections',
      value: stats?.totalCollections ?? 0,
      icon: DollarSign,
      format: 'currency' as const,
      color: 'bg-emerald-50 text-emerald-600',
      iconColor: 'bg-emerald-100',
    },
    {
      title: 'Outstanding Balance',
      value: stats?.outstandingBalance ?? 0,
      icon: AlertCircle,
      format: 'currency' as const,
      color: 'bg-amber-50 text-amber-600',
      iconColor: 'bg-amber-100',
    },
    {
      title: 'Pending Receipts',
      value: stats?.pendingReceipts ?? 0,
      icon: Clock,
      format: 'number' as const,
      color: 'bg-orange-50 text-orange-600',
      iconColor: 'bg-orange-100',
    },
  ]

  const quickActions = [
    { label: 'Add Student', view: 'students', color: 'bg-emerald-600 hover:bg-emerald-700' },
    { label: 'Create Billing', view: 'billings', color: 'bg-blue-600 hover:bg-blue-700' },
    { label: 'Review Receipts', view: 'receipts', color: 'bg-amber-600 hover:bg-amber-700' },
    { label: 'View Reports', view: 'reports', color: 'bg-purple-600 hover:bg-purple-700' },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.title} className="relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{kpi.title}</p>
                    {loading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <p className="text-2xl font-bold text-gray-900">
                        {kpi.format === 'currency' ? formatCurrency(kpi.value) : kpi.value.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className={`p-2 rounded-lg ${kpi.iconColor}`}>
                    <Icon className={`w-4 h-4 ${kpi.color.split(' ')[1]}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Collections by Course</CardTitle>
            <CardDescription>Payment collections breakdown per course</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : stats?.collectionsByCourse && stats.collectionsByCourse.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.collectionsByCourse} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="course" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Collections']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="total" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                No collection data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className={`h-auto py-3 flex flex-col gap-1.5 text-white border-0 ${action.color}`}
                onClick={() => setCurrentView(action.view)}
              >
                <span className="text-sm font-medium">{action.label}</span>
                <ArrowUpRight className="w-3 h-3 opacity-70" />
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
          <CardDescription>Latest payment and charge activities</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentTransactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{tx.studentName || tx.student?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={tx.type === 'payment' ? 'default' : 'secondary'}
                          className={
                            tx.type === 'payment'
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-red-100 text-red-700 hover:bg-red-100'
                          }
                        >
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">
                        {tx.description || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        <span className={tx.type === 'payment' ? 'text-emerald-600' : 'text-red-600'}>
                          {tx.type === 'payment' ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-600">
                        {formatCurrency(tx.balanceAfter)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-400">
              No recent transactions
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
