import React, { useEffect, useState, useRef } from 'react'
import Hls from 'hls.js'
import {
  Camera, Plus, Trash2, RefreshCw, X,
  Play, Square, QrCode, Keyboard,
  Video, VideoOff, ChevronDown, ChevronUp,
  Calendar, Radio
} from 'lucide-react'
import {
  getCameras, addCamera, deleteCamera,
  startStream, stopStream, getActiveStreams,
  getPlaylist, getRecordingDates, getSegments
} from '../api'

// ── HLS Video Player ───────────────────────────────────────
function VideoPlayer({ src, autoPlay = true }) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!src || !videoRef.current) return
    setError('')
    setLoading(true)

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      })
      hlsRef.current = hls
      hls.loadSource(src)
      hls.attachMedia(videoRef.current)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false)
        if (autoPlay) videoRef.current?.play().catch(() => {})
      })
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setError('Stream unavailable. Camera may be offline.')
          setLoading(false)
        }
      })
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      videoRef.current.src = src
      videoRef.current.addEventListener('loadedmetadata', () => {
        setLoading(false)
        if (autoPlay) videoRef.current?.play().catch(() => {})
      })
    } else {
      setError('HLS not supported on this browser.')
      setLoading(false)
    }

    return () => {
      hlsRef.current?.destroy()
    }
  }, [src])

  if (error) return (
    <div className="flex items-center justify-center h-40 rounded-xl"
      style={{ backgroundColor: '#0D1B2A' }}>
      <div className="text-center">
        <VideoOff className="w-8 h-8 mx-auto mb-2" style={{ color: '#EF4444' }} />
        <p className="text-xs" style={{ color: '#8B94A6' }}>{error}</p>
      </div>
    </div>
  )

  return (
    <div className="relative rounded-xl overflow-hidden"
      style={{ backgroundColor: '#0D1B2A', aspectRatio: '16/9' }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="nw-spinner !border-white/20 !border-t-white" />
        </div>
      )}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        controls
        playsInline
        muted
      />
    </div>
  )
}

// ── Camera Viewer (Live + Playback) ────────────────────────
function CameraViewer({ camera }) {
  const [tab, setTab] = useState('live')
  const [dates, setDates] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [loadingDates, setLoadingDates] = useState(false)

  const livePlaylistUrl =
    `https://neuralwatch-api.onrender.com/api/playback/${camera.id}/playlist`

  useEffect(() => {
    if (tab === 'playback') fetchDates()
  }, [tab])

  const fetchDates = async () => {
    setLoadingDates(true)
    try {
      const res = await getRecordingDates(camera.id)
      const d = res?.data?.dates || []
      setDates(d)
      if (d.length > 0) {
        setSelectedDate(d[0])
        fetchPlaylist(d[0])
      }
    } catch (e) {
      console.error('Failed to fetch dates:', e)
    } finally {
      setLoadingDates(false)
    }
  }

  const fetchPlaylist = async (date) => {
    try {
      const res = await getPlaylist(camera.id, date)
      const blob = new Blob([res.data], { type: 'application/vnd.apple.mpegurl' })
      const url = URL.createObjectURL(blob)
      setPlaylistUrl(url)
    } catch (e) {
      setPlaylistUrl('')
    }
  }

  const handleDateChange = (date) => {
    setSelectedDate(date)
    fetchPlaylist(date)
  }

  return (
    <div className="mt-3 space-y-3">
      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-lg" style={{ backgroundColor: '#F5F7FA' }}>
        <button
          onClick={() => setTab('live')}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all"
          style={{
            backgroundColor: tab === 'live' ? '#FFFFFF' : 'transparent',
            color: tab === 'live' ? '#0D1B2A' : '#8B94A6',
            boxShadow: tab === 'live' ? '0 1px 3px rgba(13,27,42,0.08)' : 'none'
          }}
        >
          <Radio className="w-3 h-3" style={{ color: tab === 'live' ? '#EF4444' : '#8B94A6' }} />
          Live
        </button>
        <button
          onClick={() => setTab('playback')}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all"
          style={{
            backgroundColor: tab === 'playback' ? '#FFFFFF' : 'transparent',
            color: tab === 'playback' ? '#0D1B2A' : '#8B94A6',
            boxShadow: tab === 'playback' ? '0 1px 3px rgba(13,27,42,0.08)' : 'none'
          }}
        >
          <Calendar className="w-3 h-3" />
          Playback
        </button>
      </div>

      {/* Live tab */}
      {tab === 'live' && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-2 h-2 rounded-full animate-pulse-dot"
              style={{ backgroundColor: '#EF4444' }} />
            <span className="text-xs font-semibold" style={{ color: '#EF4444' }}>
              LIVE
            </span>
          </div>
          <VideoPlayer src={livePlaylistUrl} autoPlay={true} />
        </div>
      )}

      {/* Playback tab */}
      {tab === 'playback' && (
        <div className="space-y-3">
          {loadingDates ? (
            <div className="flex items-center justify-center py-8">
              <div className="nw-spinner" />
            </div>
          ) : dates.length === 0 ? (
            <div className="text-center py-8 rounded-xl"
              style={{ backgroundColor: '#F5F7FA' }}>
              <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: '#D1D8E2' }} />
              <p className="text-xs" style={{ color: '#8B94A6' }}>
                No recordings yet. Start recording to build your archive.
              </p>
            </div>
          ) : (
            <>
              {/* Date picker */}
              <div>
                <label className="block text-xs font-semibold mb-1.5"
                  style={{ color: '#5A6478' }}>
                  Select date
                </label>
                <select
                  value={selectedDate}
                  onChange={e => handleDateChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    border: '1px solid #E5E9F0',
                    backgroundColor: '#F5F7FA',
                    color: '#0D1B2A'
                  }}
                >
                  {dates.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Video player */}
              {playlistUrl
                ? <VideoPlayer src={playlistUrl} autoPlay={false} />
                : (
                  <div className="text-center py-8 rounded-xl"
                    style={{ backgroundColor: '#F5F7FA' }}>
                    <p className="text-xs" style={{ color: '#8B94A6' }}>
                      No recordings found for {selectedDate}
                    </p>
                  </div>
                )
              }
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── QR Scanner ─────────────────────────────────────────────
function QRScanner({ onResult }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      scanLoop()
    } catch (e) {
      setError('Camera access denied. Please allow camera permission.')
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  const scanLoop = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        detector.detect(canvas).then(codes => {
          if (codes.length > 0) {
            stopCamera()
            onResult(codes[0].rawValue)
          } else setTimeout(scanLoop, 500)
        }).catch(() => setTimeout(scanLoop, 500))
      } else {
        setError('QR scanning not supported. Use Chrome or Edge.')
      }
    } else setTimeout(scanLoop, 300)
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="px-4 py-3 rounded-lg text-sm text-center"
          style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
          {error}
        </div>
      ) : (
        <>
          <div className="relative rounded-xl overflow-hidden"
            style={{ backgroundColor: '#0D1B2A', aspectRatio: '4/3' }}>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-white/30 rounded-xl relative">
                {[['top-0 left-0', 'border-t-4 border-l-4 rounded-tl-lg'],
                  ['top-0 right-0', 'border-t-4 border-r-4 rounded-tr-lg'],
                  ['bottom-0 left-0', 'border-b-4 border-l-4 rounded-bl-lg'],
                  ['bottom-0 right-0', 'border-b-4 border-r-4 rounded-br-lg']
                ].map(([pos, cls], i) => (
                  <div key={i} className={`absolute ${pos} w-6 h-6 ${cls}`}
                    style={{ borderColor: '#0057FF' }} />
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-center" style={{ color: '#8B94A6' }}>
            Point camera at the QR code on your IP camera
          </p>
        </>
      )}
    </div>
  )
}

// ── Add Camera Modal ───────────────────────────────────────
function AddCameraModal({ onClose, onAdded }) {
  const [tab, setTab] = useState('manual')
  const [form, setForm] = useState({
    name: '', stream_url: '', location: '', username: '', password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleQRResult = (result) => {
    setForm(f => ({ ...f, stream_url: result }))
    setTab('manual')
  }

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
      <div className="w-full max-w-md rounded-2xl p-6 animate-slide-up max-h-screen overflow-y-auto"
        style={{ backgroundColor: '#FFFFFF', boxShadow: '0 25px 50px rgba(13,27,42,0.15)' }}>
        <div className="flex items-center justify-between mb-5">
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

        <div className="flex gap-2 mb-5 p-1 rounded-lg" style={{ backgroundColor: '#F5F7FA' }}>
          {[
            { key: 'manual', icon: Keyboard, label: 'Enter Details' },
            { key: 'qr', icon: QrCode, label: 'Scan QR Code' }
          ].map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold transition-all"
              style={{
                backgroundColor: tab === key ? '#FFFFFF' : 'transparent',
                color: tab === key ? '#0D1B2A' : '#8B94A6',
                boxShadow: tab === key ? '0 1px 3px rgba(13,27,42,0.08)' : 'none'
              }}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'qr' && <QRScanner onResult={handleQRResult} />}

        {tab === 'manual' && (
          <div className="space-y-3">
            {form.stream_url && form.stream_url.length > 0 && (
              <div className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2"
                style={{ backgroundColor: '#D1FAE5', color: '#059669' }}>
                <QrCode className="w-3.5 h-3.5 flex-shrink-0" />
                QR scanned — stream URL auto-filled
              </div>
            )}
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
            {error && (
              <div className="px-3.5 py-2.5 rounded-lg text-xs font-medium"
                style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                {error}
              </div>
            )}
            <div className="flex gap-3 mt-2">
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
        )}
      </div>
    </div>
  )
}

// ── Camera Card ────────────────────────────────────────────
function CameraCard({ camera, activeStreams, onDelete, onStreamChange }) {
  const isStreaming = activeStreams.includes(camera.id)
  const [deleting, setDeleting] = useState(false)
  const [streamLoading, setStreamLoading] = useState(false)
  const [showViewer, setShowViewer] = useState(false)

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
      if (isStreaming) await stopStream(camera.id)
      else await startStream(camera.id)
      onStreamChange()
    } catch (e) {
      alert(e.response?.data?.detail || 'Stream control failed')
    } finally {
      setStreamLoading(false)
    }
  }

  return (
    <div className="rounded-xl p-5 transition-all"
      style={{
        backgroundColor: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(13,27,42,0.06)',
        border: `1px solid ${isStreaming ? '#D1FAE5' : '#F0F3F8'}`
      }}>

      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
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
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5"
          style={{
            backgroundColor: isStreaming ? '#D1FAE5' : '#FEE2E2',
            color: isStreaming ? '#059669' : '#DC2626'
          }}>
          <span className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: isStreaming ? '#10B981' : '#EF4444' }} />
          {isStreaming ? 'Recording' : 'Offline'}
        </span>
      </div>

      {/* Stream URL */}
      <div className="px-3 py-2 rounded-lg mb-3 font-mono text-xs truncate"
        style={{ backgroundColor: '#F5F7FA', color: '#5A6478' }}>
        {camera.stream_url || camera.rtsp_url || 'No stream URL'}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mb-2">
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
            <div className="nw-spinner !w-3.5 !h-3.5" />
          ) : isStreaming ? (
            <><Square className="w-3.5 h-3.5" />Stop Recording</>
          ) : (
            <><Play className="w-3.5 h-3.5" />Start Recording</>
          )}
        </button>

        {/* View button */}
        <button
          onClick={() => setShowViewer(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
          style={{
            backgroundColor: showViewer ? '#E6EEFF' : '#F5F7FA',
            color: showViewer ? '#0057FF' : '#5A6478'
          }}
        >
          <Video className="w-3.5 h-3.5" />
          {showViewer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {/* Delete */}
        <button onClick={handleDelete} disabled={deleting}
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: '#F5F7FA', color: '#8B94A6' }}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Inline viewer */}
      {showViewer && <CameraViewer camera={camera} />}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────
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
      console.error(e)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const recordingCount = activeStreams.length

  return (
    <div className="space-y-6 animate-fade-in">
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
            className="w-9 h-9 rounded-lg flex items-center justify-center"
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

      {recordingCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ backgroundColor: '#D1FAE5', border: '1px solid #A7F3D0' }}>
          <div className="w-2 h-2 rounded-full animate-pulse-dot"
            style={{ backgroundColor: '#10B981' }} />
          <span className="text-sm font-semibold" style={{ color: '#059669' }}>
            {recordingCount} camera{recordingCount !== 1 ? 's' : ''} currently recording
            — footage saving to Database
          </span>
        </div>
      )}

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
