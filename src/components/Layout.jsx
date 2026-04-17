import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Camera,
  Bell,
  LogOut,
  Menu,
  X,
  Wifi,
  ChevronRight
} from 'lucide-react'

const NAV_ITEMS = [
  {
    to: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard'
  },
  {
    to: '/cameras',
    icon: Camera,
    label: 'Cameras'
  },
  {
    to: '/alerts',
    icon: Bell,
    label: 'Alerts'
  },
]

export default function Layout({ children }) {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const tenant = (() => {
    try {
      return JSON.parse(localStorage.getItem('nw_tenant') || '{}')
    } catch {
      return {}
    }
  })()

  const handleLogout = () => {
    localStorage.removeItem('nw_token')
    localStorage.removeItem('nw_tenant')
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Wifi className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-white font-bold text-base leading-none">
            NeuralWatch
          </div>
          <div className="text-white/40 text-xs mt-1">
            Camera Intelligence
          </div>
        </div>
      </div>

      {/* Nav label */}
      <div className="px-5 pt-6 pb-2">
        <span className="text-white/30 text-xs font-semibold uppercase tracking-widest">
          Main Menu
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-white/60 hover:bg-white/8 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-white/50 group-hover:text-white'}`} />
                <span className="flex-1">{label}</span>
                {isActive && (
                  <ChevronRight className="w-3.5 h-3.5 text-white/60" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: user + logout */}
      <div className="px-3 pb-5 pt-3 border-t border-white/10 mt-3">

        {/* User card */}
        {tenant?.name && (
          <div className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-lg bg-white/5">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {tenant.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">
                {tenant.name}
              </div>
              <div className="text-white/40 text-xs truncate">
                {tenant.plan || 'Starter'} plan
              </div>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:text-white hover:bg-white/8 transition-all duration-150"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F5F7FA' }}>

      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        className="hidden lg:flex flex-col w-64 flex-shrink-0"
        style={{ backgroundColor: '#0D1B2A' }}
      >
        <SidebarContent />
      </aside>

      {/* ── MOBILE: hamburger button ── */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 rounded-lg flex items-center justify-center shadow-md"
        style={{ backgroundColor: '#0D1B2A' }}
      >
        <Menu className="w-5 h-5 text-white" />
      </button>

      {/* ── MOBILE: sidebar overlay ── */}
      {sidebarOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className="lg:hidden fixed left-0 top-0 h-full w-64 z-50 flex flex-col"
            style={{ backgroundColor: '#0D1B2A' }}
          >
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-md flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E9F0' }}
        >
          {/* Page title — injected by each page via window.document.title fallback */}
          <div className="lg:hidden w-8" /> {/* spacer for hamburger on mobile */}

          <div className="flex items-center gap-2 ml-auto">
            {/* Notification bell */}
            <NavLink
              to="/alerts"
              className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <Bell className="w-4.5 h-4.5 text-gray-500" />
            </NavLink>

            {/* User avatar */}
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center ml-1">
              <span className="text-white text-xs font-bold">
                {tenant?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
