import React, { useEffect, useState } from 'react'
import { AlertTriangle, Bell, CheckCircle, RefreshCw, X } from 'lucide-react'
import { getAlerts, dismissAlert, confirmAlert } from '../api'

// ── Alert Card ─────────────────────────────────────────────
function AlertCard({ alert, onDismiss, onConfirm }) {
  const [acting, setActing] = useState(false)
  const isHigh = alert.severity === 'high' || alert.type === 'offline'
  const isDismissed = !!alert.dismissed_at
  const isConfirmed = !!alert.confirmed_at

  const handleDismiss = async () => {
    setActing(true)
    try { await dismissAlert(alert.id); onDismiss(alert.id) }
    catch { alert('Failed to dismiss') }
    finally { setActing(false) }
  }

  const handleConfirm = async () => {
    setActing(true)
    try { await confirmAlert(alert.id); onConfirm(alert.id) }
    catch { alert('Failed to confirm') }
    finally { setActing(false) }
  }

  const severityColor = isHigh
    ? { bg: '#FEE2E2', text: '#DC2626', icon: '#EF4444', lightBg: '#FFF5F5' }
    : { bg: '#FEF3C7', text: '#D97706', icon: '#F59E0B', lightBg: '#FFFBEB' }

  return (
    <div
      className="rounded-xl p-5 transition-all"
      style={{
        backgroundColor: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(13,27,42,0.06)',
        border: `1px solid ${isDismissed ? '#F0F3F8' : severityColor.bg}`,
        opacity: isDismissed ? 0.6 : 1
      }}
    >
      <div className="flex items-start gap-4">

        {/* Icon */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: severityColor.bg }}>
          <AlertTriangle className="w-5 h-5" style={{ color: severityColor.icon }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold" style={{ color: '#0D1B2A' }}>
              {alert.type?.replace(/_/g, ' ')?.replace(/\b\w/g, c => c.toUpperCase()) || 'Alert'}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: severityColor.bg, color: severityColor.text }}>
              {alert.severity || 'medium'}
            </span>
            {isConfirmed && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#D1FAE5', color: '#059669' }}>
                Confirmed
              </span>
            )}
            {isDismissed && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#F0F3F8', color: '#8B94A6' }}>
                Dismissed
              </span>
            )}
          </div>

          <p className="text-sm mt-1" style={{ color: '#5A6478' }}>
            {alert.message || 'No additional details'}
          </p>

          <p className="text-xs mt-1" style={{ color: '#8B94A6' }}>
            Camera ID: {alert.camera_id || 'Unknown'} ·{' '}
            {alert.created_at
              ? new Date(alert.created_at).toLocaleString()
              : 'Just now'}
          </p>
        </div>

        {/* Actions */}
        {!isDismissed && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isConfirmed && (
              <button
                onClick={handleConfirm}
                disabled={acting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ backgroundColor: '#D1FAE5', color: '#059669' }}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Confirm
              </button>
            )}
            <button
              onClick={handleDismiss}
              disabled={acting}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-gray-100"
            >
              <X className="w-3.5 h-3.5" style={{ color: '#8B94A6' }} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Alerts Page ───────────────────────────────────────
export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | unread | high

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const res = await getAlerts()
      setAlerts(res?.data?.alerts || res?.data || [])
    } catch (e) {
      console.error('Failed to fetch alerts:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAlerts() }, [])

  const onDismiss = (id) =>
    setAlerts(prev => prev.map(a =>
      a.id === id ? { ...a, dismissed_at: new Date().toISOString() } : a
    ))

  const onConfirm = (id) =>
    setAlerts(prev => prev.map(a =>
      a.id === id ? { ...a, confirmed_at: new Date().toISOString() } : a
    ))

  const filtered = alerts.filter(a => {
    if (filter === 'unread') return !a.dismissed_at
    if (filter === 'high') return a.severity === 'high' || a.type === 'offline'
    return true
  })

  const unreadCount = alerts.filter(a => !a.dismissed_at).length

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: `Unread (${unreadCount})` },
    { key: 'high', label: 'High Priority' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0D1B2A' }}>
            Alerts
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#8B94A6' }}>
            {unreadCount} unread · {alerts.length} total
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          disabled={loading}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E9F0' }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            style={{ color: '#5A6478' }} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              backgroundColor: filter === key ? '#0057FF' : '#FFFFFF',
              color: filter === key ? '#FFFFFF' : '#5A6478',
              boxShadow: '0 1px 3px rgba(13,27,42,0.06)',
              border: filter === key ? 'none' : '1px solid #E5E9F0'
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Alert list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="nw-spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-12 text-center"
          style={{ backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(13,27,42,0.06)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: '#E6EEFF' }}>
            <Bell className="w-7 h-7" style={{ color: '#0057FF' }} />
          </div>
          <h3 className="font-bold text-base mb-1" style={{ color: '#0D1B2A' }}>
            No alerts
          </h3>
          <p className="text-sm" style={{ color: '#8B94A6' }}>
            {filter === 'all'
              ? 'Your cameras are running smoothly'
              : 'No alerts in this category'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert, i) => (
            <AlertCard
              key={alert.id || i}
              alert={alert}
              onDismiss={onDismiss}
              onConfirm={onConfirm}
            />
          ))}
        </div>
      )}
    </div>
  )
}
