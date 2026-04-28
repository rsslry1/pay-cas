'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useAppStore } from '@/store'
import { receipts, billings } from '@/lib/api'
import {
  Camera,
  Upload,
  X,
  Image as ImageIcon,
  CheckCircle2,
  FileText,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

interface BillingOption {
  id: string
  billingId: string
  status: string
  billing: {
    id: string
    title: string
    amount: number
    dueDate?: string
    feeCategory?: { name: string }
  }
}

export default function StudentUploadView() {
  const { currentUser } = useAppStore()
  const studentId = currentUser?.studentProfile?.id

  const [assignments, setAssignments] = useState<BillingOption[]>([])
  const [loadingBillings, setLoadingBillings] = useState(true)

  const [selectedBilling, setSelectedBilling] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [base64Image, setBase64Image] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!studentId) return
    loadBillings()
  }, [studentId])

  const loadBillings = async () => {
    if (!studentId) return
    setLoadingBillings(true)
    try {
      const data = await billings.list({ studentId })
      const list: BillingOption[] = data.assignments || data.data || []
      // Only show pending/partially paid billings
      setAssignments(
        list.filter((a) => a.status === 'pending' || a.status === 'partially_paid')
      )
    } catch {
      toast.error('Failed to load billings')
    } finally {
      setLoadingBillings(false)
    }
  }

  useAutoRefresh(loadBillings, { enabled: Boolean(studentId) })

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, JPEG)')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setImagePreview(result)
      setBase64Image(result)
    }
    reader.onerror = () => {
      toast.error('Failed to read image file')
    }
    reader.readAsDataURL(file)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const file = e.dataTransfer.files?.[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const removeImage = () => {
    setImagePreview(null)
    setBase64Image(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!studentId) {
      toast.error('Student profile not found')
      return
    }
    if (!base64Image) {
      toast.error('Please upload a receipt image')
      return
    }
    if (!selectedBilling) {
      toast.error('Please select a billing')
      return
    }

    setSubmitting(true)
    try {
      await receipts.upload({
        studentId,
        imageUrl: base64Image,
        billingAssignmentId: selectedBilling,
      })
      toast.success('Receipt uploaded successfully!')
      setSubmitted(true)
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload receipt')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setImagePreview(null)
    setBase64Image(null)
    setSelectedBilling('')
    setNotes('')
    setSubmitted(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (submitted) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-gray-900">Upload Receipt</h1>

        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Receipt Submitted!</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-xs">
            Your receipt has been uploaded and is pending admin review. You&apos;ll be notified once
            it&apos;s been approved or rejected.
          </p>
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                resetForm()
              }}
              className="min-h-[44px]"
            >
              Upload Another
            </Button>
            <Button
              onClick={() => {
                useAppStore.getState().setCurrentView('student-history')
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
            >
              View History
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Upload Receipt</h1>
        <p className="text-sm text-gray-500">Submit a payment receipt for review</p>
      </div>

      {/* Image Upload Area */}
      <div>
        <Label className="text-sm font-medium text-gray-700 mb-2 block">Receipt Image *</Label>
        {imagePreview ? (
          <div className="relative rounded-xl overflow-hidden border-2 border-emerald-200 bg-gray-50">
            <img
              src={imagePreview}
              alt="Receipt preview"
              className="w-full h-auto max-h-[300px] object-contain"
            />
            <button
              onClick={removeImage}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 left-2">
              <Badge className="bg-emerald-600 text-white text-[10px]">Image Ready</Badge>
            </div>
          </div>
        ) : (
          <div
            ref={dropZoneRef}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all min-h-[200px] flex flex-col items-center justify-center"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
              <Camera className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">Tap to take a photo or upload</p>
            <p className="text-xs text-gray-400 mt-1">
              Drag & drop or click to select &middot; PNG, JPG up to 10MB
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-2 min-h-[44px]"
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
            >
              <Upload className="w-4 h-4" />
              Choose File
            </Button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      {/* Billing Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Select Billing *</Label>
        {loadingBillings ? (
          <Skeleton className="h-11 w-full rounded-lg" />
        ) : assignments.length === 0 ? (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-gray-50 text-sm text-gray-500">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            No pending billings to attach this receipt to.
          </div>
        ) : (
          <Select value={selectedBilling} onValueChange={setSelectedBilling}>
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder="Select a billing..." />
            </SelectTrigger>
            <SelectContent>
              {assignments.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  <div className="flex items-center justify-between gap-4 w-full">
                    <span className="truncate">{a.billing.title}</span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {new Intl.NumberFormat('en-PH', {
                        style: 'currency',
                        currency: 'PHP',
                      }).format(a.billing.amount)}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">
          Notes <span className="text-gray-400 font-normal">(optional)</span>
        </Label>
        <Textarea
          placeholder="Add any notes about this payment..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Submit */}
      <Button
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white min-h-[48px] text-base font-semibold"
        onClick={handleSubmit}
        disabled={submitting || !base64Image || !selectedBilling || !studentId}
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-5 h-5 mr-2" />
            Submit Receipt
          </>
        )}
      </Button>

      {/* Info Card */}
      <Card className="border-0 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <ImageIcon className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700/80 space-y-1">
              <p className="font-medium text-blue-700">How it works</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Upload a clear photo of your payment receipt</li>
                <li>Select which billing this payment is for</li>
                <li>Submit and wait for admin to review</li>
                <li>Once approved, your balance will be updated</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
