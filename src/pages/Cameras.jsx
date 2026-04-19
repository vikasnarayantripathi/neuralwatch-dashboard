import React, { useEffect, useState, useRef } from 'react'
import Hls from 'hls.js'
import {
  Camera, Plus, Trash2, RefreshCw, X,
  Play, Square, QrCode, Keyboard,
  Video, VideoOff, ChevronDown, ChevronUp,
  Calendar, Radio, Grid, List
} from 'lucide-react'
import {
  getCameras, addCamera, deleteCamera,
  startStream, stopStream, getActiveStreams,
  getPlaylist, getRecordingDates
} from '../api'
import AddCameraWizard from '../components/AddCameraWizard'
import CameraGrid from '../components/CameraGrid'

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

 const liveUrl = camera.hls_url || `https://mediamtx-production-6ed6.up.railway.app/${camera.stream_path}/index.m3u8``

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
                No recordings yet.
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
      console.error('Stream control:', e)
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
            <div className="text-xs mt-0.5 capitalize" style={{ color: '#8B94A6' }}>
              {camera.camera_brand || camera.brand || 'Generic'} ·{' '}
              <span style={{ color: camera.connection_status === 'online' ? '#10B981' : '#8B94A6' }}>
                {camera.connection_status || 'offline'}
              </span>
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

      {/* Stream path / URL */}
      <div className="px-3 py-2 rounded-lg mb-3 font-mono text-xs truncate"
        style={{ backgroundColor: '#F5F7FA', color: '#5A6478' }}>
        {camera.stream_path
          ? `MediaMTX: ${camera.stream_path}`
          : camera.stream_url || camera.rtsp_url || 'No stream URL'}
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
            <><Square className="w-3.5 h-3.5" />Stop</>
          ) : (
            <><Play className="w-3.5 h-3.5" />Start</>
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

// ── Main Cameras Page ──────────────────────────────────────
export default function Cameras() {
  const [cameras, setCameras]       = useState([])
  const [activeStreams, setActiveStreams] = useState([])
  const [loading, setLoading]       = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [viewMode, setViewMode]     = useState('list') // 'list' | 'grid'

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

  const handleCameraAdded = (newCamera) => {
    setCameras(prev => [...prev, newCamera])
  }

  const recordingCount = activeStreams.length

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
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
          {/* View toggle */}
          {cameras.length > 0 && (
            <div className="flex items-center gap-1 p-1 rounded-lg"
              style={{ backgroundColor: '#F5F7FA', border: '1px solid #E5E9F0' }}>
              <button
                onClick={() => setViewMode('list')}
                title="List view"
                className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: viewMode === 'list' ? '#FFFFFF' : 'transparent',
                  color: viewMode === 'list' ? '#0057FF' : '#8B94A6',
                  boxShadow: viewMode === 'list' ? '0 1px 3px rgba(13,27,42,0.08)' : 'none'
                }}>
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                title="Live grid view"
                className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
                  color: viewMode === 'grid' ? '#0057FF' : '#8B94A6',
                  boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(13,27,42,0.08)' : 'none'
                }}>
                <Grid className="w-4 h-4" />
              </button>
            </div>
          )}

          <button onClick={fetchAll} disabled={loading}
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E9F0' }}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              style={{ color: '#5A6478' }} />
          </button>

          <button onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: '#0057FF' }}>
            <Plus className="w-4 h-4" />
            Add Camera
          </button>
        </div>
      </div>

      {/* ── Recording banner ── */}
      {recordingCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ backgroundColor: '#D1FAE5', border: '1px solid #A7F3D0' }}>
          <div className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: '#10B981' }} />
          <span className="text-sm font-semibold" style={{ color: '#059669' }}>
            {recordingCount} camera{recordingCount !== 1 ? 's' : ''} currently recording
          </span>
        </div>
      )}

      {/* ── Content ── */}
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
            Add your first IP camera to start recording
          </p>
          <button onClick={() => setShowWizard(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: '#0057FF' }}>
            <Plus className="w-4 h-4" />
            Add Your First Camera
          </button>
        </div>

      ) : viewMode === 'grid' ? (
        /* ── Live Grid View ── */
        <div style={{ height: 'calc(100vh - 220px)' }}>
          <CameraGrid cameras={cameras} />
        </div>

      ) : (
        /* ── List View ── */
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

      {/* ── Add Camera Wizard ── */}
      {showWizard && (
        <AddCameraWizard
          onClose={() => setShowWizard(false)}
          onCameraAdded={handleCameraAdded}
        />
      )}
    </div>
  )
}
