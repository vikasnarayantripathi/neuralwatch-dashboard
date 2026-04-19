import { useEffect, useRef, useState, useCallback } from 'react'

export default function CameraLiveView({ camera, className = '' }) {
  const videoRef     = useRef(null)
  const hlsRef       = useRef(null)
  const reconnectRef = useRef(null)

  const [state, setState] = useState({
    loading:  true,
    playing:  false,
    error:    null,
    muted:    true,
    retries:  0,
  })

  const hlsUrl = camera?.hls_url

  const initPlayer = useCallback(() => {
    const video = videoRef.current
    if (!video || !hlsUrl) return

    // Destroy previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    setState(s => ({ ...s, loading: true, error: null }))

    // Dynamic import of hls.js
    import('hls.js').then(({ default: Hls }) => {
      if (!videoRef.current) return

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker:   true,
          lowLatencyMode: true,
          liveSyncDurationCount: 3,
          debug: false,
        })

        hlsRef.current = hls
        hls.loadSource(hlsUrl)
        hls.attachMedia(video)

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setState(s => ({ ...s, loading: false, error: null }))
          video.play().catch(() => {
            setState(s => ({ ...s, loading: false }))
          })
        })

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              handleError('Camera offline or stream not started yet')
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError()
            } else {
              handleError('Stream error — retrying...')
            }
          }
        })

      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS
        video.src = hlsUrl
        video.addEventListener('loadedmetadata', () => {
          setState(s => ({ ...s, loading: false }))
          video.play()
        })
      } else {
        setState(s => ({
          ...s,
          loading: false,
          error: 'Browser does not support HLS. Try Chrome or Firefox.'
        }))
      }
    }).catch(() => {
      setState(s => ({
        ...s,
        loading: false,
        error: 'Could not load video player. Check your internet connection.'
      }))
    })
  }, [hlsUrl])

  const handleError = (msg) => {
    setState(s => ({ ...s, loading: false, playing: false, error: msg, retries: s.retries + 1 }))
    reconnectRef.current = setTimeout(() => {
      setState(s => ({ ...s, error: null, loading: true }))
      initPlayer()
    }, 5000)
  }

  useEffect(() => {
    initPlayer()
    return () => {
      hlsRef.current?.destroy()
      clearTimeout(reconnectRef.current)
    }
  }, [initPlayer])

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setState(s => ({ ...s, muted: video.muted }))
  }

  const takeScreenshot = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const link = document.createElement('a')
    link.download = `${camera?.name || 'camera'}-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const toggleFullscreen = async () => {
    const container = videoRef.current?.parentElement
    if (!container) return
    if (!document.fullscreenElement) {
      await container.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  }

  const retry = () => {
    clearTimeout(reconnectRef.current)
    setState(s => ({ ...s, error: null, loading: true, retries: 0 }))
    initPlayer()
  }

  const { loading, playing, error, muted, retries } = state

  return (
    <div className={`relative bg-black rounded-xl overflow-hidden ${className}`}>

      {/* Video */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        muted={muted}
        onPlaying={() => setState(s => ({ ...s, playing: true, loading: false, error: null }))}
        onWaiting={() => setState(s => ({ ...s, loading: true }))}
        onPause={() => setState(s => ({ ...s, playing: false }))}
        style={{ aspectRatio: '16/9' }}
      />

      {/* Loading overlay */}
      {loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
          <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin mb-3" />
          <p className="text-white text-sm font-medium">Connecting to camera...</p>
          {retries > 0 && <p className="text-white/50 text-xs mt-1">Retry #{retries}</p>}
        </div>
      )}

      {/* Error overlay */}
      {error && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 px-6 text-center">
          <p className="text-4xl mb-3">📡</p>
          <p className="text-white font-semibold text-sm">{error}</p>
          {retries > 0 && (
            <p className="text-white/50 text-xs mt-1">Auto-reconnecting in 5s...</p>
          )}
          <button
            onClick={retry}
            className="mt-4 px-5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Retry Now
          </button>
        </div>
      )}

      {/* LIVE badge */}
      {playing && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          LIVE
        </div>
      )}

      {/* Controls bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-3 flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
        <span className="text-white text-xs font-medium flex-1 truncate">
          {camera?.name}
        </span>
        <Btn onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
          {muted ? '🔇' : '🔊'}
        </Btn>
        <Btn onClick={takeScreenshot} title="Screenshot" disabled={!playing}>
          📸
        </Btn>
        <Btn onClick={toggleFullscreen} title="Fullscreen">
          ⛶
        </Btn>
      </div>
    </div>
  )
}

function Btn({ onClick, title, disabled, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors disabled:opacity-40"
    >
      {children}
    </button>
  )
}
