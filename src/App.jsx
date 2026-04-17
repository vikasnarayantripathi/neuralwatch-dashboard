import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Cameras from './pages/Cameras'
import Alerts from './pages/Alerts'
import Layout from './components/Layout'

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('nw_token')
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/cameras"
          element={
            <PrivateRoute>
              <Layout>
                <Cameras />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/alerts"
          element={
            <PrivateRoute>
              <Layout>
                <Alerts />
              </Layout>
            </PrivateRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />}  />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
