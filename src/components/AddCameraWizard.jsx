import { useState, useEffect, useRef } from 'react'
import {
  testCameraConnection,
  addRTSPCamera,
  addRTMPCamera,
  addQRCamera,
  getCameraStatus
} from '../api'

const BRANDS = [
  { brand: 'trueview',  label: 'TrueView',    path: '/stream1',                                   port: 554, user: 'admin' },
  { brand: 'hikvision', label: 'Hikvision',   path: '/Streaming/Channels/101',                    port: 554, user: 'admin' },
  { brand: 'dahua',     label: 'Dahua',       path: '/cam/realmonitor?channel=1&subtype=0',        port: 554, user: 'admin' },
  { brand: 'cpplus',    label: 'CP Plus',     path: '/live',                                       port: 554, user: 'admin' },
  { brand: 'reolink',   label: 'Reolink',     path: '/h264Preview_01_main',                        port: 554, user: 'admin' },
  { brand: 'tapo',      label: 'Tapo',        path: '/stream1',                                    port: 554, user: 'admin' },
  { brand: 'ezviz',     label: 'Ezviz',       path: '/H.264/ch1/main/av_stream',                  port: 554, user: 'admin' },
  { brand: 'axis',      label: 'Axis',        path: '/axis-media/media.amp',                      port: 554, user: 'root'  },
  { brand: 'generic',   label: 'Other',       path: '/stream1',                                   port: 554, user: 'admin' },
]

const TABS = [
  { id: 'rtmp', label: 'RTMP Push', icon: '📡', sub: 'Camera pushes to cloud — no port forwarding', badge: 'Recommended' },
  { id: 'rtsp', label: 'RTSP URL',  icon: '🔗', sub: 'Manual entry — works with any IP camera',    badge: null },
  { id: 'qr',   label: 'QR Code',  icon: '📱', sub: 'Scan to connect — easiest setup',            badge: null },
]

export default function AddCameraWizard({ onClose, onCameraAdded }) {
  const [tab, setTab]       = useState('rtmp')
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
      <div className="flex border-b border-gray-100 px-2 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors
              ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}
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
        <p className="text-xs text-gray-500">{TABS.find(t => t.id === tab)?.sub}</p>
      </div>

      {/* Content */}
      <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
        {tab === 'rtmp' && <RTMPTab onSuccess={setSuccess} />}
        {tab === 'rtsp' && <RTSPTab onSuccess={setSuccess} />}
        {tab === 'qr'   && <QRTab   onSuccess={setSuccess} />}
      </div>
    </Overlay>
  )
}

// ── Overlay shell ─────────────────────────────────────────────────────────────
function Overlay({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden relative" style={{ maxHeight: '90vh' }}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500"
        >✕</button>
        {children}
      </div>
    </div>
  )
}

// ── RTMP Tab ──────────────────────────────────────────────────────────────────
function RTMPTab({ onSuccess }) {
  const [form, setForm]   = useState({ name: '', camera_brand: 'hikvision', has_ptz: false, has_audio: false })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(null)

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))

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
          <p className="text-green-700 text-sm mt-1">Configure your camera to push to this URL:</p>
        </div>

        <div className="space-y-3">
          <CopyField label="RTMPS URL (Recommended)" value={result.rtmps_push_url} onCopy={() => copy(result.rtmps_push_url, 'rtmps')} copied={copied === 'rtmps'} highlight />
          <CopyField label="RTMP URL (Fallback)"     value={result.rtmp_push_url}  onCopy={() => copy(result.rtmp_push_url, 'rtmp')}   copied={copied === 'rtmp'}  />
          <CopyField label="Stream Key"              value={result.push_key}        onCopy={() => copy(result.push_key, 'key')}          copied={copied === 'key'}   />
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
          ⏱️ After configuring your camera, wait up to 60 seconds for the stream to appear.
        </div>

        <button
          onClick={() => onSuccess(result)}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
        >
          Done — View in Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
        <p className="font-semibold text-blue-800">📡 How RTMP Push works</p>
        <ol className="list-decimal ml-4 mt-2 text-blue-700 space-y-1">
          <li>NeuralWatch gives you a secret push URL</li>
          <li>You enter that URL in your camera's admin panel</li>
          <li>Camera pushes its stream to NeuralWatch 24/7</li>
          <li>Watch live from anywhere — no port forwarding needed</li>
        </ol>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Camera Name *</label>
        <input
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
          placeholder="e.g. Main Entrance"
          value={form.name}
          onChange={set('name')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Camera Brand</label>
        <div className="grid grid-cols-3 gap-2">
          {['hikvision','dahua','generic'].map(b => (
            <button
              key={b}
              onClick={() => setForm(p => ({ ...p, camera_brand: b }))}
              className={`text-sm px-3 py-2 rounded-lg border transition-colors capitalize
                ${form.camera_brand === b ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600'}`}
            >
              {b === 'generic' ? 'Other' : b.charAt(0).toUpperCase() + b.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
          <input type="checkbox" checked={form.has_ptz} onChange={e => setForm(p => ({ ...p, has_ptz: e.target.checked }))} className="accent-blue-600" />
          Has PTZ
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
          <input type="checkbox" checked={form.has_audio} onChange={e => setForm(p => ({ ...p, has_audio: e.target.checked }))} className="accent-blue-600" />
          Has Audio
        </label>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        onClick={handleCreate}
        disabled={saving}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-40"
      >
        {saving ? 'Creating...' : 'Create Camera Slot & Get Push URL →'}
      </button>
    </div>
  )
}

// ── RTSP Tab ──────────────────────────────────────────────────────────────────
function RTSPTab({ onSuccess }) {
  const [form, setForm] = useState({
    name: '', camera_brand: 'generic', local_ip: '',
    rtsp_port: 554, rtsp_path: '/stream1',
    cam_username: 'admin', cam_password: '', has_ptz: false
  })
  const [probe, setProbe]     = useState(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [error, setError]     = useState('')

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
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
        ⚠️ RTSP pull requires camera to be reachable from the cloud.
        If your camera is on home WiFi (192.168.x.x), use <strong>RTMP Push</strong> tab instead or enable port forwarding.
      </div>

      {/* Brand picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Camera Brand</label>
        <div className="grid grid-cols-3 gap-2">
          {BRANDS.map(b => (
            <button key={b.brand} onClick={() => handleBrand(b.brand)}
              className={`text-sm px-2 py-2 rounded-lg border transition-colors
                ${form.camera_brand === b.brand ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600'}`}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Form fields */}
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
              value={form.cam_password} onChange={set('cam_password')} placeholder="Camera password" />
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
            <p className="font-semibold text-green-800">✅ Camera connected!</p>
            <div className="flex gap-4 mt-1 text-sm text-green-700">
              {probe.resolution && <span>📐 {probe.resolution}</span>}
              {probe.codec      && <span>🎥 {probe.codec}</span>}
              {probe.fps        && <span>⚡ {probe.fps}fps</span>}
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="font-semibold text-red-800">❌ Connection failed</p>
            <p className="text-red-700 text-sm mt-1">{probe.error}</p>
            {probe.rtmp_recommended && (
              <p className="text-sm text-red-600 mt-1 font-medium">
                💡 Switch to RTMP Push tab — no port forwarding needed
              </p>
            )}
          </div>
        )
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button onClick={handleTest} disabled={testing}
          className="flex-1 py-2.5 border-2 border-blue-500 text-blue-600 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-colors disabled:opacity-40">
          {testing ? '⟳ Testing...' : '🔌 Test Connection'}
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-40">
          {saving ? 'Adding...' : 'Add Camera →'}
        </button>
      </div>
    </div>
  )
}

// ── QR Tab ────────────────────────────────────────────────────────────────────
function QRTab({ onSuccess }) {
  const [form, setForm] = useState({ name: '', wifi_ssid: '', wifi_password: '' })
  const [saving, setSaving]   = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')
  const [polling, setPolling] = useState(false)
  const [connected, setConnected] = useState(false)
  const pollRef = useRef(null)

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleGenerate = async () => {
    if (!form.name.trim() || !form.wifi_ssid.trim() || !form.wifi_password.trim()) {
      setError('All fields are required'); return
    }
    setSaving(true); setError('')
    try {
      const res = await addQRCamera(form)
      setResult(res.data)
      setPolling(true)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to generate QR')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!polling || !result) return
    pollRef.current = setInterval(async () => {
      try {
        const res = await getCameraStatus(result.camera_id)
        if (res.data.is_streaming) {
          setConnected(true)
          setPolling(false)
          clearInterval(pollRef.current)
          setTimeout(() => onSuccess(result), 1500)
        }
      } catch {}
    }, 3000)
    return () => clearInterval(pollRef.current)
  }, [polling, result])

  if (result) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="font-bold text-gray-900 text-lg">Scan this QR Code</p>
        <p className="text-sm text-gray-500">Hold your camera in front of this QR code</p>

        <div className="flex justify-center">
          <div className="p-4 bg-white border-2 border-gray-200 rounded-2xl">
            <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <p className="text-4xl">📱</p>
                <p className="text-xs text-gray-500 mt-2 px-2 break-all font-mono">
                  {result.qr_payload?.slice(0, 40)}...
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={`rounded-xl p-3 text-sm font-medium flex items-center justify-center gap-2
          ${connected ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
          {connected ? '✅ Camera connected!' : '⟳ Waiting for camera to connect...'}
        </div>

        <button onClick={() => onSuccess(result)}
          className="text-sm text-gray-500 underline">
          Skip — I'll wait for it to connect
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm">
        <p className="font-semibold text-purple-800">📱 QR Code Provisioning</p>
        <p className="text-purple-700 mt-1">Works with NeuralWatch-certified cameras and generic RTMP cameras.</p>
        <p className="text-purple-700 mt-1">❌ Does NOT work with TrueView, Hikvision, Dahua (use RTMP or RTSP tab for those)</p>
      </div>

      {['name', 'wifi_ssid', 'wifi_password'].map((field) => (
        <div key={field}>
          <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
            {field === 'wifi_ssid' ? 'WiFi Network Name' : field === 'wifi_password' ? 'WiFi Password' : 'Camera Name'} *
          </label>
          <input
            type={field === 'wifi_password' ? 'password' : 'text'}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
            value={form[field]}
            onChange={set(field)}
            placeholder={field === 'wifi_ssid' ? 'Your WiFi network name' : field === 'wifi_password' ? 'Your WiFi password' : 'e.g. Living Room'}
          />
        </div>
      ))}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button onClick={handleGenerate} disabled={saving}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-40">
        {saving ? 'Generating...' : 'Generate QR Code →'}
      </button>
    </div>
  )
}

// ── Success screen ────────────────────────────────────────────────────────────
function SuccessScreen({ camera, onDone }) {
  return (
    <div className="p-8 text-center space-y-4">
      <div className="text-5xl">🎉</div>
      <h3 className="text-xl font-bold text-gray-900">{camera.name || 'Camera'} added!</h3>
      <p className="text-gray-500 text-sm">
        {camera.connection_method === 'rtsp_pull' ? 'NeuralWatch is connecting to your camera...' :
         camera.connection_method === 'rtmp_push' ? 'Waiting for camera to start pushing stream...' :
         'Camera slot created and ready.'}
      </p>
      <div className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
        ⏱️ First stream may take 10–30 seconds. Camera will show 🟢 Online once connected.
      </div>
      <button onClick={onDone}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
        View in Dashboard →
      </button>
    </div>
  )
}

// ── Copy field ────────────────────────────────────────────────────────────────
function CopyField({ label, value, onCopy, copied, highlight }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs font-mono text-gray-800 break-all">{value}</code>
        <button onClick={onCopy}
          className={`px-3 py-1 text-xs rounded-lg font-semibold flex-shrink-0 transition-colors
            ${copied ? 'bg-green-500 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-100'}`}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
