import React, { useEffect, useState } from 'react'
import { Camera, Plus, Trash2, RefreshCw, Wifi, WifiOff, X } from 'lucide-react'
import { getCameras, addCamera, deleteCamera } from '../api'

// ── Add Camera Modal ───────────────────────────────────────
function AddCameraModal({ onClose, onAdded }) {
  const [form, setForm] = useState({
    name: '',
    stream_url: '',
    location: '',
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.name || !form.stream_url) {
      setError('Camera name and stream URL are required')
      return
    }
    setLoading(true)
    setError('')
    try {
      await addCamera(form)
      onAdded()
      onClose()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to add camera')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(13,27,42,0.5)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 animate-slide-up"
        style={{ backgroundColor: '#FFFFFF', boxShadow: '0 25px 50px rgba(13,27,42,0.15)' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#0D1B2A' }}>Add Camera</h2>
            <p className="text-xs mt-0.5" style={{ color: '#8B94A6' }}>
              Connect an IP camera or RTSP stream
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" style={{ color: '#5A6478' }} />
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-3">
          {[
            { key: 'name', label: 'Camera Name *', placeholder: 'e.g. Front Door Camera' },
            { key: 'stream_url', label: 'Stream URL *', placeholder: 'rtsp://192.168.1.x:554/stream' },
            { key: 'location', label: 'Location', placeholder: 'e.g. Main Entrance' },
            { key: 'username', label: 'Username', placeholder: 'admin' },
            { key: 'password', label: 'Password', placeholder: '••••••••', type: 'password' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#5A6478' }}>
                {label}
              </label>
              <input
                type={type || 'text'}
                placeholder={placeholder}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-lg text-sm transition-all"
                style={{
                  border: '1px solid #E5E9F0',
                  backgroundColor: '#F5F7FA',
                  color: '#0D1B2A',
                }}
              />
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-3 px-3.5 py-2.5 rounded-lg text-xs font-medium"
            style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{ border: '1px solid #E5E9F0', color: '#5A6478' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
            style={{ backgroundColor: loading ? '#6B9FFF' : '#0057FF' }}>
            {loading ? <><div className="nw-spinner !w-4 !h-4 !border-white/30 !border-t-white" />Adding...</> : 'Add Camera'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Camera Card ────────────────────────────────────────────
function CameraCard({ camera, onDelete }) {
  const isOnline = camera.status === 'online'
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${camera.name}"?`)) return
    setDeleting(true)
    try {
      await deleteCamera(camera.id)
      onDelete(camera.id)
    } catch (e) {
      alert('Failed to delete camera')
      setDeleting(false)
    }
  }

  return (
    <div className="rounded-xl p-5 transition-all group"
      style={{
        backgroundColor: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(13,27,42,0.06)',
        border: '1px solid #F0F3F8'
      }}>

      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: isOnline ? '#D1FAE5' : '#F5F7FA' }}>
            <Camera className="w-5 h-5" style={{ color: isOnline ? '#10B981' : '#8B94A6' }} />
          </div>
          <div>
            <div className="font-bold text-sm" style={{ color: '#0D1B2A' }}>
              {camera.name}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#8B94A6' }}>
              {camera.location || 'No location set'}
            </div>
          </div>
        </div>

        {/* Status badge */}
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5"
          style={{
            backgroundColor: isOnline ? '#D1FAE5' : '#FEE2E2',
            color: isOnline ? '#059669' : '#DC2626'
          }}>
          <span className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: isOnline ? '#10B981' : '#EF4444' }} />
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Stream URL */}
      <div className="px-3 py-2 rounded-lg mb-4 font-mono text-xs truncate"
        style={{ backgroundColor: '#F5F7FA', color: '#5A6478' }}>
        {camera.stream_url || 'No stream URL'}
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isOnline
            ? <Wifi className="w-3.5 h-3.5" style={{ color: '#10B981' }} />
            : <WifiOff className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />
          }
          <span className="text-xs" style={{ color: '#8B94A6' }}>
            {isOnline ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <button onClick={handleDelete} disabled={deleting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all opacity-0 group-hover:opacity-100"
          style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
          <Trash2 className="w-3 h-3" />
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  )
}

// ── Main Cameras Page ──────────────────────────────────────
export default function Cameras() {
  const [cameras, setCameras] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const fetchCameras = async () => {
    setLoading(true)
    try {
      const res = await getCameras()
      setCameras(res?.data?.cameras || res?.data || [])
    } catch (e) {
      console.error('Failed to fetch cameras:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCameras() }, [])

  const onlineCameras = cameras.filter(c => c.status === 'online')

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0D1B2A' }}>
            Cameras
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#8B94A6' }}>
            {cameras.length} camera{cameras.length !== 1 ? 's' : ''} · {onlineCameras.length} online
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchCameras} disabled={loading}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E9F0' }}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              style={{ color: '#5A6478' }} />
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
            style={{ backgroundColor: '#0057FF' }}>
            <Plus className="w-4 h-4" />
            Add Camera
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="nw-spinner" />
        </div>
      ) : cameras.length === 0 ? (
        <div className="rounded-2xl p-12 text-center"
          style={{ backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(13,27,42,0.06)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: '#E6EEFF' }}>
            <Camera className="w-7 h-7" style={{ color: '#0057FF' }} />
          </div>
          <h3 className="font-bold text-base mb-1" style={{ color: '#0D1B2A' }}>
            No cameras yet
          </h3>
          <p className="text-sm mb-5" style={{ color: '#8B94A6' }}>
            Add your first IP camera or RTSP stream to get started
          </p>
          <button onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: '#0057FF' }}>
            <Plus className="w-4 h-4" />
            Add Your First Camera
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cameras.map((cam, i) => (
            <CameraCard
              key={cam.id || i}
              camera={cam}
              onDelete={id => setCameras(prev => prev.filter(c => c.id !== id))}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <AddCameraModal
          onClose={() => setShowModal(false)}
          onAdded={fetchCameras}
        />
      )}
    </div>
  )
}
