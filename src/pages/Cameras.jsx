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
  getPlaylist, getRecordingDates
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
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true })
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
      videoRef.current.src = src
      videoRef.current.addEventListener('loadedmetadata', () => {
        setLoading(false)
        if (autoPlay) videoRef.current?.play().catch(() => {})
      })
    } else {
      setError('HLS not supported on this browser.')
      setLoading(false)
    }
    return () => { hlsRef.current?.destroy() }
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
      <video ref={videoRef} className="w-full h-full object-cover" controls playsInline muted />
    </div>
  )
}

// ── Camera Viewer ──────────────────────────────────────────
function CameraViewer({ camera }) {
  const [tab, setTab] = useState('live')
  const [dates, setDates] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [loadingDates, setLoadingDates] = useState(false)

  const liveUrl = `https://neuralwatch-api.onrender.com/api/playback/${camera.id}/playlist`

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
      console.error(e)
    } finally {
      setLoadingDates(false)
    }
  }

  const fetchPlaylist = async (date) => {
    try {
      const res = await getPlaylist(camera.id, date)
      const blob = new Blob([res.data], { type: 'application/vnd.apple.mpegurl' })
      setPlaylistUrl(URL.createObjectURL(blob))
    } catch {
      setPlaylistUrl('')
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex gap-2 p-1 rounded-lg" style={{ backgroundColor: '#F5F7FA' }}>
        {[
          { key: 'live', icon: Radio, label: 'Live', color: '#EF4444' },
          { key: 'playback', icon: Calendar, label: 'Playback', color: '#0057FF' }
        ].map(({ key, icon: Icon, label, color }) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all"
            style={{
              backgroundColor: tab === key ? '#FFFFFF' : 'transparent',
              color: tab === key ? '#0D1B2A' : '#8B94A6',
              boxShadow: tab === key ? '0 1px 3px rgba(13,27,42,0.08)' : 'none'
            }}>
            <Icon className="w-3 h-3" style={{ color: tab === key ? color : '#8B94A6' }} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'live' && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-2 h-2 rounded-full"
              style={{ backgroundColor: '#EF4444', animation: 'pulseDot 1.5s ease-in-out infinite' }} />
            <span className="text-xs font-bold" style={{ color: '#EF4444' }}>LIVE</span>
          </div>
          <VideoPlayer src={liveUrl} autoPlay={true} />
        </div>
      )}

      {tab === 'playback' && (
        <div className="space-y-3">
          {loadingDates ? (
            <div className="flex items-center justify-center py-8">
              <div className="nw-spinner" />
            </div>
          ) : dates.length === 0 ? (
            <div className="text-center py-8 rounded-xl" style={{ backgroundColor: '#F5F7FA' }}>
              <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: '#D1D8E2' }} />
              <p className="text-xs" style={{ color: '#8B94A6' }}>
                No recordings yet. Start recording to build your archive.
              </p>
            </div>
          ) : (
            <>
              <select value={selectedDate}
                onChange={e => { setSelectedDate(e.target.value); fetchPlaylist(e.target.value) }}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: '1px solid #E5E9F0', backgroundColor: '#F5F7FA', color: '#0D1B2A' }}>
                {dates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {playlistUrl
                ? <VideoPlayer src={playlistUrl} autoPlay={false} />
                : <div className="text-center py-6 text-xs" style={{ color: '#8B94A6' }}>
                    No recordings for {selectedDate}
                  </div>
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
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const animRef = useRef(null)
  const fileRef = useRef(null)
  const [error, setError] = useState('')
  const [torch, setTorch] = useState(false)
  const [hint, setHint] = useState('Initializing camera...')
  const [mode, setMode] = useState('camera')
  const [jsqrReady, setJsqrReady] = useState(false)

  // Wait for jsQR to load
  useEffect(() => {
    const check = setInterval(() => {
      if (window.jsQR) {
        setJsqrReady(true)
        clearInterval(check)
      }
    }, 200)
    return () => clearInterval(check)
  }, [])

  useEffect(() => {
    if (mode === 'camera') startCamera()
    return () => {
      stopCamera()
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [mode])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          advanced: [{ focusMode: 'continuous' }]
        }
      })
      streamRef.current = stream
      const track = stream.getVideoTracks()[0]
      const capabilities = track.getCapabilities?.() || {}
      if (capabilities.zoom) {
        const min = capabilities.zoom.min
        const max = capabilities.zoom.max
        const target = Math.min(min + (max - min) * 0.3, max)
        await track.applyConstraints({ advanced: [{ zoom: target }] })
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', true)
        await videoRef.current.play()
        videoRef.current.onloadedmetadata = () => {
          setHint('Hold QR code 15-20cm away — tap to focus')
          tick()
        }
        // Also start tick after short delay as fallback
        setTimeout(() => tick(), 1000)
      }
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setHint('Hold QR code 15-20cm away — tap to focus')
          setTimeout(() => tick(), 1000)
        }
      } catch {
        setError('Camera access denied. Use Upload Image mode instead.')
      }
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (animRef.current) cancelAnimationFrame(animRef.current)
  }

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch }] })
      setTorch(t => !t)
    } catch {}
  }

  const tapToFocus = async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ focusMode: 'manual', focusDistance: 0.3 }] })
      setTimeout(async () => {
        try {
          await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] })
        } catch {}
      }, 1000)
    } catch {}
  }

  const tick = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) {
      animRef.current = requestAnimationFrame(tick)
      return
    }
    if (video.readyState < 2) {
      animRef.current = requestAnimationFrame(tick)
      return
    }
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) {
      animRef.current = requestAnimationFrame(tick)
      return
    }
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(video, 0, 0, w, h)
    const imageData = ctx.getImageData(0, 0, w, h)

    if (window.jsQR) {
      // Try normal scan
      let code = window.jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' })

      // If not found, try with contrast enhancement
      if (!code) {
        const enhanced = ctx.getImageData(0, 0, w, h)
        const d = enhanced.data
        for (let i = 0; i < d.length; i += 4) {
          const avg = (d[i] + d[i+1] + d[i+2]) / 3
          const val = avg > 128 ? 255 : 0
          d[i] = val; d[i+1] = val; d[i+2] = val
        }
        ctx.putImageData(enhanced, 0, 0)
        const enhanced2 = ctx.getImageData(0, 0, w, h)
        code = window.jsQR(enhanced2.data, w, h, { inversionAttempts: 'attemptBoth' })
      }

      if (code) {
        stopCamera()
        onResult(code.data)
        return
      }
    }
    animRef.current = requestAnimationFrame(tick)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        // Try multiple sizes for better detection
        const sizes = [
          { w: img.width, h: img.height },
          { w: img.width * 2, h: img.height * 2 },
          { w: 1200, h: Math.round(1200 * img.height / img.width) }
        ]
        let found = false
        for (const size of sizes) {
          if (found) break
          const canvas = document.createElement('canvas')
          canvas.width = size.w
          canvas.height = size.h
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, size.w, size.h)

          // Try raw image first
          let imageData = ctx.getImageData(0, 0, size.w, size.h)
          if (window.jsQR) {
            let code = window.jsQR(imageData.data, size.w, size.h, {
              inversionAttempts: 'attemptBoth'
            })
            if (code) { onResult(code.data); found = true; break }

            // Try with contrast enhancement
            const d = imageData.data
            for (let i = 0; i < d.length; i += 4) {
              const avg = (d[i] + d[i+1] + d[i+2]) / 3
              const val = avg > 128 ? 255 : 0
              d[i] = val; d[i+1] = val; d[i+2] = val
            }
            ctx.putImageData(imageData, 0, 0)
            imageData = ctx.getImageData(0, 0, size.w, size.h)
            code = window.jsQR(imageData.data, size.w, size.h, {
              inversionAttempts: 'attemptBoth'
            })
            if (code) { onResult(code.data); found = true; break }
          }
        }
        if (!found) {
          setError('No QR code found. Try better lighting or a clearer photo.')
        }
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-3">
      {/* Mode switcher */}
      <div className="flex gap-2 p-1 rounded-lg" style={{ backgroundColor: '#F5F7FA' }}>
        {[
          { key: 'camera', label: '📷 Live Scan' },
          { key: 'upload', label: '🖼️ Upload Image' }
        ].map(({ key, label }) => (
          <button key={key}
            onClick={() => { stopCamera(); setMode(key); setError('') }}
            className="flex-1 py-1.5 rounded-md text-xs font-semibold transition-all"
            style={{
              backgroundColor: mode === key ? '#FFFFFF' : 'transparent',
              color: mode === key ? '#0D1B2A' : '#8B94A6',
              boxShadow: mode === key ? '0 1px 3px rgba(13,27,42,0.08)' : 'none'
            }}>
            {label}
          </button>
        ))}
      </div>

      {!jsqrReady && (
        <div className="px-3 py-2 rounded-lg text-xs text-center"
          style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
          Loading QR scanner library...
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm text-center"
          style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
          {error}
        </div>
      )}

      {/* Camera mode */}
      {mode === 'camera' && !error && (
        <>
          <div className="relative rounded-xl overflow-hidden"
            style={{ backgroundColor: '#0D1B2A', aspectRatio: '4/3' }}>
            <video ref={videoRef} autoPlay playsInline muted
              onClick={tapToFocus}
              className="w-full h-full object-cover cursor-pointer" />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scan overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-52 h-52">
                <div className="absolute left-2 right-2 h-0.5 opacity-80"
                  style={{
                    backgroundColor: '#0057FF',
                    top: '50%',
                    animation: 'scanLine 2s ease-in-out infinite'
                  }} />
                {[
                  'top-0 left-0 border-t-4 border-l-4 rounded-tl-lg',
                  'top-0 right-0 border-t-4 border-r-4 rounded-tr-lg',
                  'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg',
                  'bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg'
                ].map((cls, i) => (
                  <div key={i} className={`absolute w-7 h-7 ${cls}`}
                    style={{ borderColor: '#0057FF' }} />
                ))}
              </div>
            </div>

            {/* Tap to focus hint */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
              <span className="text-xs px-3 py-1 rounded-full"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#FFFFFF' }}>
                👆 Tap to focus
              </span>
            </div>

            {/* Torch */}
            <button onClick={toggleTorch}
              className="absolute top-3 right-3 w-9 h-9 rounded-lg flex items-center justify-center text-base pointer-events-auto"
              style={{ backgroundColor: torch ? '#0057FF' : 'rgba(0,0,0,0.5)' }}>
              💡
            </button>
          </div>

          <p className="text-xs text-center font-medium" style={{ color: '#8B94A6' }}>
            {hint}
          </p>

          <div className="px-3 py-2.5 rounded-lg text-xs space-y-1"
            style={{ backgroundColor: '#F5F7FA', color: '#5A6478' }}>
            <div>📏 Best distance: <strong>15–20cm</strong> from QR code</div>
            <div>💡 Dark room? Tap the flashlight button</div>
            <div>👆 Tap screen to trigger focus</div>
            <div>🖼️ Still blurry? Switch to <strong>Upload Image</strong> tab</div>
          </div>
        </>
      )}

      {/* Upload mode */}
      {mode === 'upload' && (
        <div className="space-y-3">
          <div onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 rounded-xl cursor-pointer"
            style={{
              backgroundColor: '#F5F7FA',
              border: '2px dashed #E5E9F0',
              aspectRatio: '4/3'
            }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: '#E6EEFF' }}>
              <span className="text-2xl">🖼️</span>
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>
                Choose from Gallery
              </p>
              <p className="text-xs mt-1" style={{ color: '#8B94A6' }}>
                Select a photo of the QR code from your phone gallery
              </p>
            </div>
          </div>

          {/* No capture attribute — opens gallery directly */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="px-3 py-2.5 rounded-lg text-xs"
            style={{ backgroundColor: '#F5F7FA', color: '#5A6478' }}>
            📸 Select any photo from your gallery. Works even when live scan is blurry.
          </div>
        </div>
      )}

      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 10%; opacity: 0.3; }
          50% { top: 90%; opacity: 1; }
        }
      `}</style>
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
            {form.stream_url && (
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
    } catch {
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

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: isStreaming ? '#D1FAE5' : '#F5F7FA' }}>
            <Camera className="w-5 h-5"
              style={{ color: isStreaming ? '#10B981' : '#8B94A6' }} />
          </div>
          <div>
            <div className="font-bold text-sm" style={{ color: '#0D1B2A' }}>{camera.name}</div>
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

      <div className="px-3 py-2 rounded-lg mb-3 font-mono text-xs truncate"
        style={{ backgroundColor: '#F5F7FA', color: '#5A6478' }}>
        {camera.stream_url || camera.rtsp_url || 'No stream URL'}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <button onClick={handleStreamToggle} disabled={streamLoading}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all"
          style={{
            backgroundColor: isStreaming ? '#FEE2E2' : '#0057FF',
            color: isStreaming ? '#DC2626' : '#FFFFFF'
          }}>
          {streamLoading ? (
            <div className="nw-spinner !w-3.5 !h-3.5" />
          ) : isStreaming ? (
            <><Square className="w-3.5 h-3.5" />Stop Recording</>
          ) : (
            <><Play className="w-3.5 h-3.5" />Start Recording</>
          )}
        </button>

        <button onClick={() => setShowViewer(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
          style={{
            backgroundColor: showViewer ? '#E6EEFF' : '#F5F7FA',
            color: showViewer ? '#0057FF' : '#5A6478'
          }}>
          <Video className="w-3.5 h-3.5" />
          {showViewer
            ? <ChevronUp className="w-3 h-3" />
            : <ChevronDown className="w-3 h-3" />
          }
        </button>

        <button onClick={handleDelete} disabled={deleting}
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: '#F5F7FA', color: '#8B94A6' }}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

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
      console.error(e)
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
          <h3 className="font-bold text-base mb-1" style={{ color: '#0D1B2A' }}>No cameras yet</h3>
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
