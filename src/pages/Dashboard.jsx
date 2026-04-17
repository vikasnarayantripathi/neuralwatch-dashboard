import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Camera,
  Bell,
  Wifi,
  AlertTriangle,
  ChevronRight,
  Circle,
  RefreshCw
} from 'lucide-react'
import { getCameras, getAlerts, getRelays } from '../api'

// ── Stat Card ──────────────────────────────────────────────
function StatCard({ icon: Icon, iconColor, iconBg, label, value, sub }) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{
        backgroundColor: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(13,27,42,0.06), 0 1px 2px rgba(13,27,42,0.04)'
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-sm font-semibold"
          style={{ color: '#5A6478' }}
        >
          {label}
        </span>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="w-4.5 h-4.5" style={{ color: iconColor }} />
        </div>
      </div>
      <div>
        <div
          className="text-3xl font-bold tracking-tight"
          style={{ color: '#0D1B2A' }}
        >
          {value ?? '—'}
        </div>
        <div className="text-xs mt-1" style={{ color: '#8B94A6' }}>
          {sub}
        </div>
      </div>
    </div>
  )
}

// ── Camera Row ─────────────────────────────────────────────
function CameraRow({ camera }) {
  const isOnline = camera.status === 'online'
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0" style={{ borderColor: '#F0F3F8' }}>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: isOnline ? '#D1FAE5' : '#FEE2E2' }}
      >
        <Camera className="w-4 h-4" style={{ color: isOnline ? '#10B981' : '#EF4444' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: '#0D1B2A' }}>
          {camera.name}
        </div>
        <div className="text-xs truncate" style={{ color: '#8B94A6' }}>
          {camera.location || camera.stream_url || 'No location set'}
        </div>
      </div>
      <span
        className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
        style={{
          backgroundColor: isOnline ? '#D1FAE5' : '#FEE2E2',
          color: isOnline ? '#059669' : '#DC2626'
        }}
      >
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  )
}

// ── Alert Row ──────────────────────────────────────────────
function AlertRow({ alert }) {
  const isHigh = alert.severity === 'high' || alert.type === 'offline'
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: '#F0F3F8' }}>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ backgroundColor: isHigh ? '#FEE2E2' : '#FEF3C7' }}
      >
        <AlertTriangle className="w-4 h-4" style={{ color: isHigh ? '#EF4444' : '#F59E0B' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>
          {alert.type?.replace(/_/g, ' ')?.replace(/\b\w/g, c => c.toUpperCase()) || 'Alert'}
        </div>
        <div className="text-xs truncate" style={{ color: '#8B94A6' }}>
          {alert.message || alert.camera_id || 'No details'}
        </div>
      </div>
      <span
        className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
        style={{
          backgroundColor: isHigh ? '#FEE2E2' : '#FEF3C7',
          color: isHigh ? '#DC2626' : '#D97706'
        }}
      >
        {alert.severity || 'medium'}
      </span>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────
export default function Dashboard() {
  const [cameras, setCameras] = useState([])
  const [alerts, setAlerts] = useState([])
  const [relays, setRelays] = useState([])
  const [loading, setLoading] = useState(true)

  const tenant = (() => {
    try { return JSON.parse(localStorage.getItem('nw_tenant') || '{}') }
    catch { return {} }
  })()

  const fetchData = async () => {
    setLoading(true)
    try {
      const [camRes, alertRes, relayRes] = await Promise.allSettled([
        getCameras(),
        getAlerts(),
        getRelays()
      ])
      if (camRes.status === 'fulfilled') setCameras(camRes.value?.data?.cameras || camRes.value?.data || [])
      if (alertRes.status === 'fulfilled') setAlerts(alertRes.value?.data?.alerts || alertRes.value?.data || [])
      if (relayRes.status === 'fulfilled') setRelays(relayRes.value?.data?.relays || relayRes.value?.data || [])
    } catch (e) {
      console.error('Dashboard fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const onlineCameras = cameras.filter(c => c.status === 'online')
  const offlineCameras = cameras.filter(c => c.status !== 'online')
  const unreadAlerts = alerts.filter(a => !a.dismissed_at)
  const onlineRelays = relays.filter(r => r.status === 'online')

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0D1B2A' }}>
            Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#8B94A6' }}>
            Welcome back{tenant?.name ? `, ${tenant.name}` : ''} 👋
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            backgroundColor: '#FFFFFF',
            color: '#5A6478',
            boxShadow: '0 1px 3px rgba(13,27,42,0.06)',
            border: '1px solid #E5E9F0'
          }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Camera}
          iconColor="#0057FF"
          iconBg="#E6EEFF"
          label="Total Cameras"
          value={cameras.length}
          sub={`${onlineCameras.length} online`}
        />
        <StatCard
          icon={Bell}
          iconColor="#F59E0B"
          iconBg="#FEF3C7"
          label="Unread Alerts"
          value={unreadAlerts.length}
          sub={`${alerts.length} total`}
        />
        <StatCard
          icon={Wifi}
          iconColor="#10B981"
          iconBg="#D1FAE5"
          label="Relay Agents"
          value={relays.length}
          sub={`${onlineRelays.length} online`}
        />
        <StatCard
          icon={AlertTriangle}
          iconColor="#EF4444"
          iconBg="#FEE2E2"
          label="Offline Cameras"
          value={offlineCameras.length}
          sub="need attention"
        />
      </div>

      {/* ── Bottom panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recent Alerts */}
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(13,27,42,0.06)'
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold" style={{ color: '#0D1B2A' }}>
              Recent Alerts
            </h2>
            <Link
              to="/alerts"
              className="flex items-center gap-1 text-xs font-semibold"
              style={{ color: '#0057FF' }}
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="nw-spinner" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: '#D1D8E2' }} />
              <p className="text-sm" style={{ color: '#8B94A6' }}>No alerts yet</p>
            </div>
          ) : (
            <div>
              {alerts.slice(0, 5).map((alert, i) => (
                <AlertRow key={alert.id || i} alert={alert} />
              ))}
            </div>
          )}
        </div>

        {/* Camera List */}
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(13,27,42,0.06)'
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold" style={{ color: '#0D1B2A' }}>
              Cameras
            </h2>
            <Link
              to="/cameras"
              className="flex items-center gap-1 text-xs font-semibold"
              style={{ color: '#0057FF' }}
            >
              Manage <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="nw-spinner" />
            </div>
          ) : cameras.length === 0 ? (
            <div className="text-center py-8">
              <Camera className="w-8 h-8 mx-auto mb-2" style={{ color: '#D1D8E2' }} />
              <p className="text-sm mb-3" style={{ color: '#8B94A6' }}>No cameras added yet</p>
              <Link
                to="/cameras"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white"
                style={{ backgroundColor: '#0057FF' }}
              >
                <Camera className="w-3.5 h-3.5" />
                Add Camera
              </Link>
            </div>
          ) : (
            <div>
              {cameras.slice(0, 5).map((cam, i) => (
                <CameraRow key={cam.id || i} camera={cam} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
