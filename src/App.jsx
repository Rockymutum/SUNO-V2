import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/layout/Layout'
import SwipeContainer, { SwiperSlide } from './components/layout/SwipeContainer'
import { AuthProvider } from './context/AuthContext.jsx'
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

// Wrapper component for swipeable pages
function SwipeablePages() {
  return (
    <SwipeContainer>
      <SwiperSlide>
        <HomeRoute>
          <Discovery />
        </HomeRoute>
      </SwiperSlide>
      <SwiperSlide>
        <Workers />
      </SwiperSlide>
      <SwiperSlide>
        <Messages />
      </SwiperSlide>
      <SwiperSlide>
        <Profile />
      </SwiperSlide>
    </SwipeContainer>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<Layout />}>
              {/* Swipeable main pages */}
              <Route path="/" element={<SwipeablePages />} />
              <Route path="/workers" element={<SwipeablePages />} />
              <Route path="/workers/:category" element={<SwipeablePages />} />
              <Route path="/messages" element={<SwipeablePages />} />
              <Route path="/profile/me" element={<SwipeablePages />} />

              {/* Non-swipeable pages */}
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/worker/:id" element={<WorkerProfile />} />
              <Route path="/messages/:id" element={<Chat />} />
              <Route path="/profile/:id" element={<Profile />} />
              <Route path="/profile/edit" element={<EditProfile />} />
              <Route path="/worker/edit" element={<EditWorkerProfile />} />
              <Route path="/profile/public/:id" element={<PublicProfile />} />
              <Route path="/privacy" element={<PrivacySecurity />} />
              <Route path="/task/:id" element={<TaskDetails />} />
              <Route path="/auth" element={<Auth />} />
            </Route>

            {/* Modals or routes outside main layout if needed, currently inside for simpler transitions */}
            <Route path="/task/create" element={<TaskCreate />} />
            <Route path="/task/edit/:id" element={<EditTask />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
