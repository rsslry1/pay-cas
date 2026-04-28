import { create } from 'zustand'
import { auth as authApi, notifications as notifApi } from '@/lib/api'

export interface StudentProfile {
  id: string
  userId: string
  studentId: string
  firstName: string
  lastName: string
  middleName?: string
  course?: string
  year?: number
  section?: string
  dateOfBirth?: string
  gender?: string
  address?: string
  contactNumber?: string
  parentName?: string
  parentContact?: string
  enrollDate: string
  status: string
}

export interface User {
  id: string
  email: string
  role: 'admin' | 'staff' | 'student'
  name?: string
  avatar?: string
  studentProfile?: StudentProfile | null
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
  data?: any
}

interface AppState {
  currentUser: User | null
  currentView: string
  isAuthenticated: boolean
  isLoading: boolean
  sidebarOpen: boolean
  notifications: Notification[]
  unreadCount: number

  setCurrentView: (view: string) => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  fetchNotifications: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  currentView: 'dashboard',
  isAuthenticated: false,
  isLoading: true,
  sidebarOpen: false,
  notifications: [],
  unreadCount: 0,

  setCurrentView: (view) => set({ currentView: view, sidebarOpen: false }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  login: async (email, password) => {
    const data = await authApi.login(email, password)
    set({
      currentUser: data.user,
      isAuthenticated: true,
      isLoading: false,
      currentView: data.user.role === 'student' ? 'student-dashboard' : 'dashboard',
    })
  },

  logout: async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore
    }
    set({
      currentUser: null,
      isAuthenticated: false,
      isLoading: false,
      currentView: 'login',
      notifications: [],
      unreadCount: 0,
    })
  },

  checkAuth: async () => {
    try {
      const data = await authApi.me()
      set({
        currentUser: data.user,
        isAuthenticated: true,
        isLoading: false,
        currentView: data.user.role === 'student' ? 'student-dashboard' : 'dashboard',
      })
    } catch {
      set({
        currentUser: null,
        isAuthenticated: false,
        isLoading: false,
        currentView: 'login',
      })
    }
  },

  fetchNotifications: async () => {
    try {
      const data = await notifApi.list()
      set({
        notifications: data.notifications || [],
        unreadCount: data.unreadCount || 0,
      })
    } catch {
      // ignore
    }
  },
}))
