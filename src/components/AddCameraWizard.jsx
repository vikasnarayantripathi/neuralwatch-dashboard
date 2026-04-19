import { useState, useEffect, useRef } from 'react'
import {
  testCameraConnection,
  addRTSPCamera,
  addRTMPCamera,
  addQRCamera,
  getCameraStatus
} from '../api'

const BRANDS = [
  { brand: 'trueview',  label: 'TrueView',  path: '/stream1',                                port: 554, user: 'admin' },
  { brand: 'hikvision', label: 'Hikvision', path: '/Streaming/Channels/101',                 port: 554, user: 'admin' },
  { brand: 'dahua',     label: 'Dahua',     path: '/cam/realmonitor?channel=1&subtype=0',     port: 554, user: 'admin' },
  { brand: 'cpplus',    label: 'CP Plus',   path: '/live',                                    port: 554, user: 'admin' },
  { brand: 'reolink',   label: 'Reolink',   path: '/h264Preview_01_main',                     port: 554, user: 'admin' },
  { brand: 'tapo',      label: 'Tapo',      path: '/stream1',                                 port: 554, user: 'admin' },
  { brand: 'generic',   label: 'Other',     path: '/stream1',                                 port: 554, user: 'admin' },
]

const TABS = [
  {
    id: 'scan',
    label: 'Scan QR',
    icon: '📷',
    sub: 'Scan the QR code printed on your camera',
    badge: 'Easiest',
  },
  {
    id: 'rtsp',
    label: 'RTSP URL',
    icon: '🔗',
    sub: 'Enter camera IP and credentials manually',
    badge: null,
  },
  {
    id: 'rtmp',
    label: 'RTMP Push',
    icon: '📡',
    sub: 'Camera pushes stream to cloud — no port forwarding',
    badge: null,
  },
]

export default function AddCameraWizard({ onClose, onCameraAdded }) {
  const [tab, setTab]         = useState('scan')
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (success) {
    return (
      <Overlay onClose={onClose}>
        <SuccessScreen
          camera={success}
          onDone={() => { onCameraAdded(success); onClose() }}
        />
      </Overlay>
    )
  }

  return (
    <Overlay onClose={onClose}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">Add Camera</h2>
        <p className="text-sm text-gray-500 mt-1">
          Connect any IP camera to NeuralWatch cloud
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-2">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium
              border-b-2 whitespace-nowrap transition-colors flex-1 justify-center
              ${tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'}
            `}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
            {t.badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab subtitle */}
      <div className="px-6 py-2 bg-gray-50 border-b border-gray-100">
        <p className="text-xs text-gray-500">
          {TABS.find(t => t.id === tab)?.sub}
        </p>
      </div>

      {/* Content */}
      <div className="overflow-y-auto" style={{ maxHeight: '65vh' }}>
        {tab === 'scan' && <ScanQRTab onSuccess={setSuccess} />}
        {tab === 'rtsp' && <RTSPTab  onSuccess={setSuccess} />}
        {tab === 'rtmp' && <RTMPTab  onSuccess={setSuccess} />}
      </div>
    </Overlay>
  )
}

// ── Overlay ───────────────────────────────────────────────────────────────────
function Overlay({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden relative"
        style={{ maxHeight: '90vh' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm"
        >✕</button>
        {children}
      </div>
    </div>
  )
}

// ── Tab 1: Scan QR on camera body ─────────────────────────────────────────────
function ScanQRTab({ onSuccess }) {
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const animRef   = useRef(null)
  const fileRef   = useRef(null)

  const [mode, setMode]       = useState('camera') // 'camera' | 'upload'
  const [scanned, setScanned] = useState(null)     // raw QR text
  const [form, setForm]       = useState({
    name: '', cam_password: '', camera_brand: 'trueview'
  })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [hint, setHint]       = useState('Point camera at the QR code on your device')

  // ── Start camera ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode === 'camera' && !scanned) startCamera()
    return () => stopCamera()
  }, [mode, scanned])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setHint('Hold QR code 15–20cm from camera — tap screen to focus')
        setTimeout(() => tick(), 500)
      }
    } catch {
      setError('Camera access denied. Use "Upload Photo" instead.')
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (animRef.current) cancelAnimationFrame(animRef.current)
  }

  const tick = () => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      animRef.current = requestAnimationFrame(tick)
      return
    }
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(video, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    if (window.jsQR) {
      const code = window.jsQR(imageData.data, canvas.width, canvas.height, {
        inversionAttempts: 'attemptBoth'
      })
      if (code) {
        stopCamera()
        handleQRResult(code.data)
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
        const canvas = document.createElement('canvas')
        canvas.width  = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        if (window.jsQR) {
          const code = window.jsQR(imageData.data, canvas.width, canvas.height, {
            inversionAttempts: 'attemptBoth'
          })
          if (code) { handleQRResult(code.data); return }
        }
        setError('No QR code found in image. Try better lighting or a closer photo.')
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  // ── Parse QR result ───────────────────────────────────────────────────────
  const handleQRResult = (text) => {
    setScanned(text)
    // Try to extract IP from common QR formats
    // TrueView format: device serial / P2P ID / sometimes RTSP URL
    let detectedIp = ''
    const ipMatch = text.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/)
    if (ipMatch) detectedIp = ipMatch[1]

    setForm(f => ({
      ...f,
      scanned_text: text,
      local_ip: detectedIp,
    }))
  }

  // ── Save camera after QR scanned ──────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) { setError('Camera name is required'); return }
    if (!form.cam_password.trim()) { setError('Password is required'); return }
    setSaving(true); setError('')

    // Find brand template
    const brand = BRANDS.find(b => b.brand === form.camera_brand)

    try {
      const res = await addRTSPCamera({
        name:          form.name,
        camera_brand:  form.camera_brand,
        local_ip:      form.local_ip || '0.0.0.0',
        rtsp_port:     brand?.port || 554,
        rtsp_path:     brand?.path || '/stream1',
        cam_username:  brand?.user || 'admin',
        cam_password:  form.cam_password,
        has_ptz:       false,
      })
      onSuccess(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to add camera')
    } finally {
      setSaving(false)
    }
  }

  // ── After QR scanned — show form ──────────────────────────────────────────
  if (scanned) {
    return (
      <div className="p-6 space-y-4">
        {/* Scanned result */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="font-bold text-green-800 flex items-center gap-2">
            <span>✅</span> QR Code scanned!
          </p>
          <p className="text-green-700 text-xs mt-1 font-mono break-all">
            {scanned.slice(0, 80)}{scanned.length > 80 ? '...' : ''}
          </p>
        </div>

        {/* Camera name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Camera Name *
          </label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
            placeholder="e.g. Front Door, Living Room"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            autoFocus
          />
        </div>

        {/* Camera IP (auto-filled if found in QR) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Camera IP Address *
          </label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-blue-500"
            placeholder="192.168.1.x"
            value={form.local_ip || ''}
            onChange={e => setForm(f => ({ ...f, local_ip: e.target.value }))}
          />
          <p className="text-xs text-gray-400 mt-1">
            Find this in your router's connected devices list
          </p>
        </div>

        {/* Brand */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Camera Brand
          </label>
          <div className="grid grid-cols-4 gap-2">
            {BRANDS.map(b => (
              <button
                key={b.brand}
                onClick={() => setForm(f => ({ ...f, camera_brand: b.brand }))}
                className={`text-xs px-2 py-2 rounded-lg border transition-colors
                  ${form.camera_brand === b.brand
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Camera Password *
          </label>
          <input
            type="password"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
            placeholder="Default is usually: admin or admin123"
            value={form.cam_password}
            onChange={e => setForm(f => ({ ...f, cam_password: e.target.value }))}
          />
          <p className="text-xs text-gray-400 mt-1">
            TrueView default password: <strong>admin123</strong> or <strong>admin</strong>
          </p>
        </div>

        {error && (
          <p className="text-red-500 text-sm bg-red-50 rounded-lg p-3">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => { setScanned(null); setForm(f => ({ ...f, name: '', cam_password: '' })) }}
            className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50"
          >
            ← Rescan
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-40"
          >
            {saving ? 'Adding Camera...' : 'Add Camera →'}
          </button>
        </div>
      </div>
    )
  }

  // ── Scanner UI ────────────────────────────────────────────────────────────
  return (
    <div className="p-5 space-y-4">

      {/* Mode toggle */}
      <div className="flex gap-2 p-1 rounded-xl bg-gray-100">
        <button
          onClick={() => { setMode('camera'); setError('') }}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors
            ${mode === 'camera' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          📷 Live Scan
        </button>
        <button
          onClick={() => { stopCamera(); setMode('upload'); setError('') }}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors
            ${mode === 'upload' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          🖼️ Upload Photo
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Camera scanner */}
      {mode === 'camera' && (
        <>
          <div
            className="relative rounded-2xl overflow-hidden bg-black"
            style={{ aspectRatio: '4/3' }}
            onClick={async () => {
              const track = streamRef.current?.getVideoTracks()[0]
              if (!track) return
              try {
                await track.applyConstraints({ advanced: [{ focusMode: 'manual' }] })
                setTimeout(() => track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }), 800)
              } catch {}
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover cursor-pointer"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scan frame overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-52 h-52">
                {/* Corners */}
                {['top-0 left-0 border-t-4 border-l-4 rounded-tl-xl',
                  'top-0 right-0 border-t-4 border-r-4 rounded-tr-xl',
                  'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl',
                  'bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl'
                ].map((cls, i) => (
                  <div key={i} className={`absolute w-8 h-8 ${cls} border-blue-500`} />
                ))}
                {/* Scan line */}
                <div
                  className="absolute left-2 right-2 h-0.5 bg-blue-500 opacity-80"
                  style={{ animation: 'scanLine 2s ease-in-out infinite', top: '50%' }}
                />
              </div>
            </div>

            {/* Hint */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
              <span className="text-xs px-3 py-1.5 rounded-full bg-black/60 text-white">
                👆 Tap screen to focus
              </span>
            </div>
          </div>

          <p className="text-xs text-center text-gray-500">{hint}</p>

          <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 space-y-1">
            <p>📏 Hold QR code <strong>15–20cm</strong> from camera</p>
            <p>💡 Make sure QR code is well-lit and not scratched</p>
            <p>🖼️ Blurry? Switch to <strong>Upload Photo</strong> tab</p>
          </div>
        </>
      )}

      {/* Upload mode */}
      {mode === 'upload' && (
        <>
          <div
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl cursor-pointer border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
            style={{ aspectRatio: '4/3' }}
          >
            <div className="text-4xl">🖼️</div>
            <div className="text-center px-4">
              <p className="text-sm font-semibold text-gray-800">
                Choose photo from gallery
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Take a photo of the QR code on your camera
              </p>
            </div>
            <span className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl">
              Choose Photo
            </span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </>
      )}

      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 15%; }
          50% { top: 85%; }
        }
      `}</style>
    </div>
  )
}

// ── Tab 2: RTSP Manual Entry ──────────────────────────────────────────────────
function RTSPTab({ onSuccess }) {
  const [form, setForm] = useState({
    name: '', camera_brand: 'trueview', local_ip: '',
    rtsp_port: 554, rtsp_path: '/stream1',
    cam_username: 'admin', cam_password: '', has_ptz: false
  })
  const [probe, setProbe]       = useState(null)
  const [testing, setTesting]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')

  const set = (f) => (e) => {
    setForm(p => ({ ...p, [f]: e.target.value }))
    setProbe(null)
  }

  const handleBrand = (brand) => {
    const tpl = BRANDS.find(b => b.brand === brand)
    if (tpl) setForm(p => ({
      ...p,
      camera_brand: brand,
      rtsp_port: tpl.port,
      rtsp_path: tpl.path,
      cam_username: tpl.user
    }))
    setProbe(null)
  }

  const handleTest = async () => {
    if (!form.local_ip || !form.cam_password) {
      setError('Enter IP and password first'); return
    }
    setTesting(true); setProbe(null); setError('')
    try {
      const res = await testCameraConnection({
        local_ip: form.local_ip, rtsp_port: +form.rtsp_port,
        rtsp_path: form.rtsp_path, cam_username: form.cam_username,
        cam_password: form.cam_password, camera_brand: form.camera_brand
      })
      setProbe(res.data)
    } catch (e) {
      setProbe({ ok: false, error: e.response?.data?.detail || 'Test failed' })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Camera name is required'); return }
    if (!form.local_ip)    { setError('IP address is required'); return }
    if (!form.cam_password){ setError('Password is required'); return }
    setSaving(true); setError('')
    try {
      const res = await addRTSPCamera({ ...form, rtsp_port: +form.rtsp_port })
      onSuccess(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to add camera')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-4">

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
        ⚠️ Camera must be reachable from cloud. If on home WiFi (192.168.x.x),
        use <strong>RTMP Push</strong> tab or enable port forwarding on your router.
      </div>

      {/* Brand picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
        <div className="grid grid-cols-4 gap-2">
          {BRANDS.map(b => (
            <button key={b.brand} onClick={() => handleBrand(b.brand)}
              className={`text-xs px-2 py-2 rounded-lg border transition-colors
                ${form.camera_brand === b.brand
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 text-gray-600'}`}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Camera Name *</label>
          <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
            placeholder="e.g. Front Door" value={form.name} onChange={set('name')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Camera IP *</label>
          <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-blue-500"
            placeholder="192.168.1.108" value={form.local_ip} onChange={set('local_ip')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
          <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-blue-500"
            value={form.rtsp_port} onChange={set('rtsp_port')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
            value={form.cam_username} onChange={set('cam_username')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pr-12 outline-none focus:border-blue-500"
              value={form.cam_password} onChange={set('cam_password')}
              placeholder="Camera password"
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowPass(s => !s)}
              className="absolute right-3 top-2 text-xs text-gray-400 hover:text-gray-600">
              {showPass ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">RTSP Path</label>
          <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-blue-500"
            value={form.rtsp_path} onChange={set('rtsp_path')} />
        </div>
      </div>

      {/* Probe result */}
      {probe && (
        probe.ok ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="font-semibold text-green-800 text-sm">✅ Camera reachable!</p>
            <div className="flex gap-4 mt-1 text-xs text-green-700">
              {probe.resolution && <span>📐 {probe.resolution}</span>}
              {probe.codec      && <span>🎥 {probe.codec}</span>}
              {probe.fps        && <span>⚡ {probe.fps}fps</span>}
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="font-semibold text-red-800 text-sm">❌ {probe.error}</p>
            {probe.rtmp_recommended && (
              <p className="text-xs text-red-600 mt-1 font-medium">
                💡 Switch to RTMP Push tab — works without port forwarding
              </p>
            )}
          </div>
        )
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button onClick={handleTest} disabled={testing}
          className="flex-1 py-2.5 border-2 border-blue-500 text-blue-600 rounded-xl font-semibold text-sm hover:bg-blue-50 disabled:opacity-40">
          {testing ? '⟳ Testing...' : '🔌 Test Connection'}
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-40">
          {saving ? 'Adding...' : 'Add Camera →'}
        </button>
      </div>
    </div>
  )
}

// ── Tab 3: RTMP Push ──────────────────────────────────────────────────────────
function RTMPTab({ onSuccess }) {
  const [form, setForm]     = useState({ name: '', camera_brand: 'hikvision', has_ptz: false, has_audio: false })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(null)

  const handleCreate = async () => {
    if (!form.name.trim()) { setError('Camera name is required'); return }
    setSaving(true); setError('')
    try {
      const res = await addRTMPCamera(form)
      setResult(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create camera slot')
    } finally {
      setSaving(false)
    }
  }

  const copy = async (text, key) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  if (result) {
    return (
      <div className="p-6 space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="font-bold text-green-800">✅ Camera slot created!</p>
          <p className="text-green-700 text-sm mt-1">
            Enter this URL in your camera's admin panel:
          </p>
        </div>

        <CopyField label="RTMPS URL (Recommended)"
          value={result.rtmps_push_url}
          onCopy={() => copy(result.rtmps_push_url, 'rtmps')}
          copied={copied === 'rtmps'} highlight />

        <CopyField label="RTMP URL (Fallback)"
          value={result.rtmp_push_url}
          onCopy={() => copy(result.rtmp_push_url, 'rtmp')}
          copied={copied === 'rtmp'} />

        <CopyField label="Stream Key"
          value={result.push_key}
          onCopy={() => copy(result.push_key, 'key')}
          copied={copied === 'key'} />

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
          ⏱️ After configuring your camera, wait up to 60 seconds for stream to appear.
        </div>

        <button onClick={() => onSuccess(result)}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
          Done — View in Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
        <p className="font-semibold text-blue-800">📡 Best for Hikvision & Dahua</p>
        <p className="text-blue-700 text-sm mt-1">
          No port forwarding needed. Camera pushes stream directly to NeuralWatch cloud.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Camera Name *</label>
        <input
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
          placeholder="e.g. Warehouse Gate"
          value={form.name}
          onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
        <div className="grid grid-cols-3 gap-2">
          {['hikvision', 'dahua', 'generic'].map(b => (
            <button key={b}
              onClick={() => setForm(p => ({ ...p, camera_brand: b }))}
              className={`text-sm py-2 rounded-lg border transition-colors capitalize
                ${form.camera_brand === b
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 text-gray-600'}`}>
              {b === 'generic' ? 'Other' : b.charAt(0).toUpperCase() + b.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
          <input type="checkbox" checked={form.has_ptz}
            onChange={e => setForm(p => ({ ...p, has_ptz: e.target.checked }))}
            className="accent-blue-600" />
          Has PTZ
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
          <input type="checkbox" checked={form.has_audio}
            onChange={e => setForm(p => ({ ...p, has_audio: e.target.checked }))}
            className="accent-blue-600" />
          Has Audio
        </label>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button onClick={handleCreate} disabled={saving}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-40">
        {saving ? 'Creating...' : 'Create Camera Slot & Get Push URL →'}
      </button>
    </div>
  )
}

// ── Success screen ────────────────────────────────────────────────────────────
function SuccessScreen({ camera, onDone }) {
  return (
    <div className="p-8 text-center space-y-4">
      <div className="text-5xl">🎉</div>
      <h3 className="text-xl font-bold text-gray-900">
        {camera.name || 'Camera'} added!
      </h3>
      <p className="text-gray-500 text-sm">
        {camera.connection_method === 'rtsp_pull'
          ? 'NeuralWatch is connecting to your camera stream...'
          : 'Waiting for camera to start pushing stream...'}
      </p>
      <div className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
        ⏱️ First stream takes 10–30 seconds. Camera shows 🟢 once connected.
      </div>
      <button onClick={onDone}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
        View in Dashboard →
      </button>
    </div>
  )
}

// ── Copy field helper ─────────────────────────────────────────────────────────
function CopyField({ label, value, onCopy, copied, highlight }) {
  return (
    <div className={`rounded-lg border p-3
      ${highlight ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs font-mono text-gray-800 break-all">{value}</code>
        <button onClick={onCopy}
          className={`px-3 py-1 text-xs rounded-lg font-semibold flex-shrink-0 transition-colors
            ${copied
              ? 'bg-green-500 text-white'
              : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-100'}`}>
          {copied ? '✓' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
