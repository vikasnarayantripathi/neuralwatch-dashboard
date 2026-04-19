import { useState, useEffect, useRef } from 'react'
import {
  testCameraConnection,
  addRTSPCamera,
  addRTMPCamera,
} from '../api'

const BRANDS = [
  { brand: 'trueview',  label: 'TrueView',  path: '/stream1',                             port: 554, user: 'admin' },
  { brand: 'hikvision', label: 'Hikvision', path: '/Streaming/Channels/101',              port: 554, user: 'admin' },
  { brand: 'dahua',     label: 'Dahua',     path: '/cam/realmonitor?channel=1&subtype=0', port: 554, user: 'admin' },
  { brand: 'cpplus',    label: 'CP Plus',   path: '/live',                                port: 554, user: 'admin' },
  { brand: 'reolink',   label: 'Reolink',   path: '/h264Preview_01_main',                 port: 554, user: 'admin' },
  { brand: 'tapo',      label: 'Tapo',      path: '/stream1',                             port: 554, user: 'admin' },
  { brand: 'generic',   label: 'Other',     path: '/stream1',                             port: 554, user: 'admin' },
]

const TABS = [
  { id: 'scan', label: 'Scan QR',   icon: '📷', sub: 'Scan the QR code printed on your camera', badge: 'Easiest' },
  { id: 'rtsp', label: 'RTSP URL',  icon: '🔗', sub: 'Enter camera IP and credentials manually', badge: null },
  { id: 'rtmp', label: 'RTMP Push', icon: '📡', sub: 'Camera pushes stream to cloud — no port forwarding', badge: null },
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
        <SuccessScreen camera={success} onDone={() => { onCameraAdded(success); onClose() }} />
      </Overlay>
    )
  }

  return (
    <Overlay onClose={onClose}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">Add Camera</h2>
        <p className="text-sm text-gray-500 mt-1">Connect any IP camera to NeuralWatch cloud</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-2">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium
              border-b-2 whitespace-nowrap transition-colors flex-1 justify-center
              ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}
            `}>
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

      {/* Subtitle */}
      <div className="px-6 py-2 bg-gray-50 border-b border-gray-100">
        <p className="text-xs text-gray-500">{TABS.find(t => t.id === tab)?.sub}</p>
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

// ── Overlay ───────────────────────────────────────────────
function Overlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden relative"
        style={{ maxHeight: '90vh' }}>
        <button onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm">
          ✕
        </button>
        {children}
      </div>
    </div>
  )
}

// ── Tab 1: Scan QR ────────────────────────────────────────
// ✅ FIX: After QR scan, create RTMP slot instead of RTSP form
// Customer never needs to go to TrueCloud or any other app
function ScanQRTab({ onSuccess }) {
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const animRef   = useRef(null)
  const fileRef   = useRef(null)

  const [mode, setMode]       = useState('camera')
  const [scanned, setScanned] = useState(null)
  const [cloudId, setCloudId] = useState('')
  const [form, setForm]       = useState({ name: '', camera_brand: 'generic' })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [hint, setHint]       = useState('Point camera at the QR code on your device')

  useEffect(() => {
    if (mode === 'camera' && !scanned) startCamera()
    return () => stopCamera()
  }, [mode, scanned])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setHint('Align the QR code inside the box — tap screen to focus')
        videoRef.current.onloadeddata = () => startScanning()
        setTimeout(() => startScanning(), 1000)
      }
    } catch {
      setError('Camera access denied. Use "Upload Photo" instead.')
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (animRef.current) { clearInterval(animRef.current); animRef.current = null }
  }

  const startScanning = () => {
    if (animRef.current) return
    animRef.current = setInterval(() => tick(), 200)
  }

  const tick = () => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    if (video.readyState < 2) return
    if (video.videoWidth === 0) return
    if (!window.jsQR) return

    const vw = video.videoWidth
    const vh = video.videoHeight
    const cropSize = Math.min(vw, vh) * 0.40
    const cropX    = (vw - cropSize) / 2
    const cropY    = (vh - cropSize) / 2

    canvas.width  = cropSize
    canvas.height = cropSize

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(video, cropX, cropY, cropSize, cropSize, 0, 0, cropSize, cropSize)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    let code = window.jsQR(imageData.data, canvas.width, canvas.height, {
      inversionAttempts: 'attemptBoth'
    })

    if (!code) {
      const d = imageData.data
      for (let i = 0; i < d.length; i += 4) {
        const avg = (d[i] + d[i + 1] + d[i + 2]) / 3
        const val = avg > 128 ? 255 : 0
        d[i] = val; d[i + 1] = val; d[i + 2] = val
      }
      ctx.putImageData(imageData, 0, 0)
      const enhanced = ctx.getImageData(0, 0, canvas.width, canvas.height)
      code = window.jsQR(enhanced.data, canvas.width, canvas.height, {
        inversionAttempts: 'attemptBoth'
      })
    }

    if (code && code.data) {
      stopCamera()
      handleQRResult(code.data)
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width; canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        if (window.jsQR) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = window.jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' })
          if (code) { handleQRResult(code.data); return }
        }
        setError('No QR code found. Try a clearer photo with better lighting.')
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleQRResult = (text) => {
    setScanned(text)
    // Extract Cloud ID — usually alphanumeric string like F32FE9WN1000150467
    const idMatch = text.match(/([A-Z0-9]{10,30})/)
    setCloudId(idMatch ? idMatch[1] : text.slice(0, 20))

    // Auto-detect brand from QR content
    const lower = text.toLowerCase()
    if (lower.includes('trueview') || lower.includes('warner') || lower.includes('tcloud')) {
      setForm(f => ({ ...f, camera_brand: 'trueview' }))
    } else if (lower.includes('hik') || lower.includes('hikvision')) {
      setForm(f => ({ ...f, camera_brand: 'hikvision' }))
    } else if (lower.includes('dahua')) {
      setForm(f => ({ ...f, camera_brand: 'dahua' }))
    }
  }

  // ✅ KEY FIX: Create RTMP slot — customer configures camera app with our push URL
  // This replaces the old RTSP approach which required port forwarding
  const handleSave = async () => {
    if (!form.name.trim()) { setError('Camera name is required'); return }
    setSaving(true); setError('')
    try {
      const res = await addRTMPCamera({
        name: form.name,
        camera_brand: form.camera_brand,
        has_ptz: false,
        has_audio: true,
      })
      onSuccess(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create camera slot')
    } finally {
      setSaving(false)
    }
  }

  // ── After QR scanned ──────────────────────────────────────
  if (scanned) {
    return (
      <div className="p-6 space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="font-bold text-green-800">✅ QR Code scanned!</p>
          <p className="text-green-700 text-xs mt-1">
            Cloud ID: <span className="font-mono font-bold">{cloudId}</span>
          </p>
          <p className="text-green-600 text-xs mt-2">
            We'll create an RTMP stream slot. You'll get a push URL to enter in your camera app.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Camera Name *</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
            placeholder="e.g. Front Door, Living Room"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Camera Brand</label>
          <div className="grid grid-cols-4 gap-2">
            {BRANDS.map(b => (
              <button key={b.brand}
                onClick={() => setForm(f => ({ ...f, camera_brand: b.brand }))}
                className={`text-xs px-2 py-2 rounded-lg border transition-colors
                  ${form.camera_brand === b.brand
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-200 text-gray-600'}`}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
          <p className="font-semibold mb-1">📡 How this works:</p>
          <p>1. We create a stream slot on NeuralWatch cloud</p>
          <p>2. You get an RTMP push URL</p>
          <p>3. Enter it in your camera app (Advanced Settings → RTMP)</p>
          <p>4. Camera streams directly to NeuralWatch — no other app needed</p>
        </div>

        {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg p-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={() => { setScanned(null); setForm(f => ({ ...f, name: '' })) }}
            className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">
            ← Rescan
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-40">
            {saving ? 'Creating slot...' : 'Create Stream Slot →'}
          </button>
        </div>
      </div>
    )
  }

  // ── Scanner UI ────────────────────────────────────────────
  return (
    <div className="p-5 space-y-4">
      <div className="flex gap-2 p-1 rounded-xl bg-gray-100">
        <button onClick={() => { setMode('camera'); setError('') }}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors
            ${mode === 'camera' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
          📷 Live Scan
        </button>
        <button onClick={() => { stopCamera(); setMode('upload'); setError('') }}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors
            ${mode === 'upload' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
          🖼️ Upload Photo
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
      )}

      {mode === 'camera' && (
        <>
          <div className="relative rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}
            onClick={async () => {
              const track = streamRef.current?.getVideoTracks()[0]
              if (!track) return
              try {
                await track.applyConstraints({ advanced: [{ focusMode: 'manual' }] })
                setTimeout(() => track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }), 800)
              } catch {}
            }}>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover cursor-pointer" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute inset-0 bg-black/50" />
              <div className="relative z-10" style={{ width: '140px', height: '140px' }}>
                <div className="absolute inset-0"
                  style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)', background: 'transparent' }} />
                {[
                  'top-0 left-0 border-t-4 border-l-4 rounded-tl-lg',
                  'top-0 right-0 border-t-4 border-r-4 rounded-tr-lg',
                  'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg',
                  'bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg',
                ].map((cls, i) => (
                  <div key={i} className={`absolute w-6 h-6 ${cls} border-blue-400`} />
                ))}
                <div className="absolute left-1 right-1 h-0.5 bg-blue-400"
                  style={{ animation: 'scanLine 1.5s ease-in-out infinite', top: '10%' }} />
              </div>
              <div className="absolute text-white text-xs font-medium bg-black/40 px-3 py-1 rounded-full"
                style={{ top: 'calc(50% + 82px)' }}>
                Align QR code inside the box
              </div>
            </div>
          </div>
          <p className="text-xs text-center text-gray-500">{hint}</p>
          <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 space-y-1">
            <p>📏 Hold QR code <strong>10–15cm</strong> from camera</p>
            <p>💡 Make sure QR code is well lit</p>
            <p>🖼️ Not working? Switch to <strong>Upload Photo</strong></p>
          </div>
        </>
      )}

      {mode === 'upload' && (
        <>
          <div onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl cursor-pointer border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
            style={{ aspectRatio: '4/3' }}>
            <div className="text-4xl">🖼️</div>
            <div className="text-center px-4">
              <p className="text-sm font-semibold text-gray-800">Choose photo from gallery</p>
              <p className="text-xs text-gray-500 mt-1">Take a photo of the QR code on your camera</p>
            </div>
            <span className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl">Choose Photo</span>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        </>
      )}

      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 10%; }
          50% { top: 85%; }
        }
      `}</style>
    </div>
  )
}

// ── Tab 2: RTSP ───────────────────────────────────────────
function RTSPTab({ onSuccess }) {
  const [form, setForm] = useState({
    name: '', camera_brand: 'hikvision', local_ip: '',
    rtsp_port: 554, rtsp_path: '/Streaming/Channels/101',
    cam_username: 'admin', cam_password: '', has_ptz: false
  })
  const [probe, setProbe]       = useState(null)
  const [testing, setTesting]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')

  const set = (f) => (e) => { setForm(p => ({ ...p, [f]: e.target.value })); setProbe(null) }

  const handleBrand = (brand) => {
    const tpl = BRANDS.find(b => b.brand === brand)
    if (tpl) setForm(p => ({ ...p, camera_brand: brand, rtsp_port: tpl.port, rtsp_path: tpl.path, cam_username: tpl.user }))
    setProbe(null)
  }

  const handleTest = async () => {
    if (!form.local_ip || !form.cam_password) { setError('Enter IP and password first'); return }
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
    if (!form.cam_password) { setError('Password is required'); return }
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
        ⚠️ Best for <strong>Hikvision, Dahua, CP Plus</strong> cameras on the same network as your NeuralWatch relay.
        For home WiFi cameras, use <strong>RTMP Push</strong> tab instead.
      </div>

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
            <input type={showPass ? 'text' : 'password'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pr-12 outline-none focus:border-blue-500"
              value={form.cam_password} onChange={set('cam_password')}
              placeholder="Camera password" autoComplete="new-password" />
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

// ── Tab 3: RTMP Push ──────────────────────────────────────
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
          <p className="text-green-700 text-sm mt-1">Enter this URL in your camera's RTMP settings:</p>
        </div>
        <CopyField label="RTMP URL (use this in camera app)" value={result.rtmp_push_url}
          onCopy={() => copy(result.rtmp_push_url, 'rtmp')} copied={copied === 'rtmp'} highlight />
        <CopyField label="RTMPS URL (secure, if supported)" value={result.rtmps_push_url}
          onCopy={() => copy(result.rtmps_push_url, 'rtmps')} copied={copied === 'rtmps'} />
        <CopyField label="Stream Key" value={result.push_key}
          onCopy={() => copy(result.push_key, 'key')} copied={copied === 'key'} />
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
        <p className="font-semibold text-blue-800">📡 Works with any camera that supports RTMP</p>
        <p className="text-blue-700 mt-1">No port forwarding needed. Camera pushes stream directly to NeuralWatch cloud.</p>
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
        <div className="grid grid-cols-4 gap-2">
          {BRANDS.map(b => (
            <button key={b.brand} onClick={() => setForm(p => ({ ...p, camera_brand: b.brand }))}
              className={`text-xs px-2 py-2 rounded-lg border transition-colors
                ${form.camera_brand === b.brand
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 text-gray-600'}`}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
          <input type="checkbox" checked={form.has_ptz}
            onChange={e => setForm(p => ({ ...p, has_ptz: e.target.checked }))} className="accent-blue-600" />
          Has PTZ
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
          <input type="checkbox" checked={form.has_audio}
            onChange={e => setForm(p => ({ ...p, has_audio: e.target.checked }))} className="accent-blue-600" />
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

// ── Success screen ────────────────────────────────────────
function SuccessScreen({ camera, onDone }) {
  return (
    <div className="p-8 text-center space-y-4">
      <div className="text-5xl">🎉</div>
      <h3 className="text-xl font-bold text-gray-900">{camera.name || 'Camera'} added!</h3>
      <p className="text-gray-500 text-sm">
        {camera.connection_method === 'rtsp_pull'
          ? 'NeuralWatch is connecting to your camera stream...'
          : 'Configure your camera with the RTMP URL to start streaming.'}
      </p>
      <div className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
        ⏱️ Stream appears within 30–60 seconds after camera is configured.
      </div>
      <button onClick={onDone}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
        View in Dashboard →
      </button>
    </div>
  )
}

// ── Copy field ────────────────────────────────────────────
function CopyField({ label, value, onCopy, copied, highlight }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs font-mono text-gray-800 break-all">{value}</code>
        <button onClick={onCopy}
          className={`px-3 py-1 text-xs rounded-lg font-semibold flex-shrink-0 transition-colors
            ${copied ? 'bg-green-500 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-100'}`}>
          {copied ? '✓' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
