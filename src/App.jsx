import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Analytics } from '@vercel/analytics/react'
import Layout from './components/layout/Layout'
import { AuthProvider } from './context/AuthContext.jsx'
import { PWAProvider } from './context/PWAContext.jsx'
import HomeRoute from './components/HomeRoute'


import WorkerProfile from './pages/WorkerProfile'
import Messages from './pages/Messages'
import Chat from './pages/Chat'
import Profile from './pages/Profile'
import EditProfile from './pages/EditProfile'
import PublicProfile from './pages/PublicProfile'
import EditWorkerProfile from './pages/EditWorkerProfile'

import TaskCreate from './pages/TaskCreate'
import TaskDetails from './pages/TaskDetails'
import EditTask from './pages/EditTask'
import PrivacySecurity from './pages/PrivacySecurity'
import Wallet from './pages/Wallet'
import Notifications from './pages/Notifications'
import Auth from './pages/Auth'
import Welcome from './pages/Welcome'

import Discovery from './pages/Discovery'
import Workers from './pages/Workers'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <PWAProvider>
          <AuthProvider>

            <Routes>
              <Route element={<Layout />}>
                {/* Main Tab Pages */}
                <Route path="/" element={
                  <HomeRoute>
                    <Discovery />
                  </HomeRoute>
                } />
                <Route path="/workers" element={<Workers />} />
                <Route path="/workers/:category" element={<Workers />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/profile/me" element={<Profile />} />

                {/* Non-tab pages */}
                <Route path="/welcome" element={<Welcome />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/worker/:id" element={<WorkerProfile />} />
                <Route path="/messages/:id" element={<Chat />} />
                <Route path="/profile/:id" element={<Profile />} />
                <Route path="/profile/edit" element={<EditProfile />} />
                <Route path="/worker/edit" element={<EditWorkerProfile />} />
                <Route path="/profile/public/:id" element={<PublicProfile />} />
                <Route path="/privacy" element={<PrivacySecurity />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/task/:id" element={<TaskDetails />} />
                <Route path="/auth" element={<Auth />} />
              </Route>

              {/* Modals or routes outside main layout if needed, currently inside for simpler transitions */}
              <Route path="/task/create" element={<TaskCreate />} />
              <Route path="/task/edit/:id" element={<EditTask />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </PWAProvider>
      </BrowserRouter>
      <Analytics />
    </QueryClientProvider>
  )
}

export default App
