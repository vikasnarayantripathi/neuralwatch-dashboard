import React, { useEffect, useState } from 'react'
import { Camera, Plus, Trash2, RefreshCw, Wifi, WifiOff, X, Play, Square } from 'lucide-react'
import { getCameras, addCamera, deleteCamera, startStream, stopStream, getActiveStreams } from '../api'

function AddCameraModal({ onClose, onAdded }) {
  const [form, setForm] = useState({
    name: '', stream_url: '', location: '', username: '', password: ''
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#0D1B2A' }}>Add Camera</h2>
            <p className="text-xs mt-0.5" style={{ color: '#8B94A6' }}>
              Connect an IP camera or RTSP stream
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
            <X className="w-4 h-4" style={{ color: '#5A6478' }} />
          </button>
        </div>
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
                className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                style={{ border: '1px solid #E5E9F0', backgroundColor: '#F5F7FA', color: '#0D1B2A' }}
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
        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
            style={{ border: '1px solid #E5E9F0', color: '#5A6478' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2"
            style={{ backgroundColor: loading ? '#6B9FFF' : '#0057FF' }}>
            {loading
              ? <><div className="nw-spinner !w-4 !h-4 !border-white/30 !border-t-white" />Adding...</>
              : 'Add Camera'
            }
          </button>
        </div>
      </div>
    </div>
  )
}

function CameraCard({ camera, activeStreams, onDelete, onStreamChange }) {
  const isOnline = camera.status === 'online'
  const isStreaming = activeStreams.includes(camera.id)
  const [deleting, setDeleting] = useState(false)
  const [streamLoading, setStreamLoading] = useState(false)

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

  const handleStreamToggle = async () => {
    setStreamLoading(true)
    try {
      if (isStreaming) {
        await stopStream(camera.id)
      } else {
        await startStream(camera.id)
      }
      onStreamChange()
    } catch (e) {
      alert(e.response?.data?.detail || 'Stream control failed')
    } finally {
      setStreamLoading(false)
    }
  }

  return (
    <div className="rounded-xl p-5 transition-all group"
      style={{
        backgroundColor: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(13,27,42,0.06)',
        border: `1px solid ${isStreaming ? '#D1FAE5' : '#F0F3F8'}`
      }}>

      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: isStreaming ? '#D1FAE5' : '#F5F7FA' }}>
            <Camera className="w-5 h-5"
              style={{ color: isStreaming ? '#10B981' : '#8B94A6' }} />
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
            backgroundColor: isStreaming ? '#D1FAE5' : isOnline ? '#E6EEFF' : '#FEE2E2',
            color: isStreaming ? '#059669' : isOnline ? '#0057FF' : '#DC2626'
          }}>
          <span className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: isStreaming ? '#10B981' : isOnline ? '#0057FF' : '#EF4444'
            }} />
          {isStreaming ? 'Recording' : isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Stream URL */}
      <div className="px-3 py-2 rounded-lg mb-4 font-mono text-xs truncate"
        style={{ backgroundColor: '#F5F7FA', color: '#5A6478' }}>
        {camera.stream_url || camera.rtsp_url || 'No stream URL'}
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between gap-2">
        {/* Stream toggle button */}
        <button
          onClick={handleStreamToggle}
          disabled={streamLoading}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all"
          style={{
            backgroundColor: isStreaming ? '#FEE2E2' : '#0057FF',
            color: isStreaming ? '#DC2626' : '#FFFFFF'
          }}
        >
          {streamLoading ? (
            <div className="nw-spinner !w-3.5 !h-3.5"
              style={{ borderColor: isStreaming ? '#FCA5A5' : 'rgba(255,255,255,0.3)',
                borderTopColor: isStreaming ? '#DC2626' : '#FFFFFF' }} />
          ) : isStreaming ? (
            <><Square className="w-3.5 h-3.5" />Stop Recording</>
          ) : (
            <><Play className="w-3.5 h-3.5" />Start Recording</>
          )}
        </button>

        {/* Delete button */}
        <button onClick={handleDelete} disabled={deleting}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
          style={{ backgroundColor: '#F5F7FA', color: '#8B94A6' }}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default function Cameras() {
  const [cameras, setCameras] = useState([])
  const [activeStreams, setActiveStreams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [camRes, streamRes] = await Promise.allSettled([
        getCameras(),
        getActiveStreams()
      ])
      if (camRes.status === 'fulfilled')
        setCameras(camRes.value?.data?.cameras || camRes.value?.data || [])
      if (streamRes.status === 'fulfilled')
        setActiveStreams(streamRes.value?.data?.camera_ids || [])
    } catch (e) {
      console.error('Failed to fetch:', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchActiveStreams = async () => {
    try {
      const res = await getActiveStreams()
      setActiveStreams(res?.data?.camera_ids || [])
    } catch (e) {
      console.error('Failed to fetch active streams:', e)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const recordingCount = activeStreams.length

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0D1B2A' }}>
            Cameras
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#8B94A6' }}>
            {cameras.length} camera{cameras.length !== 1 ? 's' : ''} · {recordingCount} recording
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} disabled={loading}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E9F0' }}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              style={{ color: '#5A6478' }} />
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: '#0057FF' }}>
            <Plus className="w-4 h-4" />
            Add Camera
          </button>
        </div>
      </div>

      {/* Recording banner */}
      {recordingCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ backgroundColor: '#D1FAE5', border: '1px solid #A7F3D0' }}>
          <div className="w-2 h-2 rounded-full animate-pulse-dot"
            style={{ backgroundColor: '#10B981' }} />
          <span className="text-sm font-semibold" style={{ color: '#059669' }}>
            {recordingCount} camera{recordingCount !== 1 ? 's' : ''} currently recording
            — footage saving to Cloudflare R2
          </span>
        </div>
      )}

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
            Add your first IP camera or RTSP stream to start recording
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
              activeStreams={activeStreams}
              onDelete={id => setCameras(prev => prev.filter(c => c.id !== id))}
              onStreamChange={fetchActiveStreams}
            />
          ))}
        </div>
      )}

      {showModal && (
        <AddCameraModal
          onClose={() => setShowModal(false)}
          onAdded={fetchAll}
        />
      )}
    </div>
  )
}
