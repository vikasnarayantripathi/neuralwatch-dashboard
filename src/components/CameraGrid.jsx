import { useState } from 'react'
import CameraLiveView from './CameraLiveView'

const LAYOUTS = [
  { id: 1,  label: '1',  icon: '▣',  cols: 1, rows: 1 },
  { id: 2,  label: '2',  icon: '▣▣', cols: 2, rows: 1 },
  { id: 4,  label: '4',  icon: '⊞',  cols: 2, rows: 2 },
  { id: 9,  label: '9',  icon: '⊟',  cols: 3, rows: 3 },
  { id: 16, label: '16', icon: '⊠',  cols: 4, rows: 4 },
]

export default function CameraGrid({ cameras = [] }) {
  const [layout, setLayout]       = useState(4)
  const [page, setPage]           = useState(0)
  const [fullscreen, setFullscreen] = useState(null) // camera id in fullscreen

  const current = LAYOUTS.find(l => l.id === layout) || LAYOUTS[2]
  const perPage = current.id
  const totalPages = Math.ceil(cameras.length / perPage)
  const visible = cameras.slice(page * perPage, page * perPage + perPage)

  // Fill empty slots
  const slots = [...visible]
  while (slots.length < perPage) slots.push(null)

  // Fullscreen single camera
  if (fullscreen) {
    const cam = cameras.find(c => c.id === fullscreen)
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Fullscreen header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/80">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white font-semibold">{cam?.name}</span>
            <span className="text-white/40 text-sm">LIVE</span>
          </div>
          <button
            onClick={() => setFullscreen(null)}
            className="text-white/70 hover:text-white text-sm flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            ✕ Exit Fullscreen
          </button>
        </div>

        {/* Fullscreen video */}
        <div className="flex-1">
          {cam && (
            <CameraLiveView
              camera={cam}
              className="w-full h-full rounded-none"
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-950 rounded-2xl overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">

        {/* Left: camera count */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-white/70 text-sm font-medium">
            {cameras.filter(c => c.connection_status === 'online').length} online
            <span className="text-white/30 mx-1">·</span>
            {cameras.length} total
          </span>
        </div>

        {/* Center: layout switcher */}
        <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
          {LAYOUTS.map(l => (
            <button
              key={l.id}
              onClick={() => { setLayout(l.id); setPage(0) }}
              title={`${l.id} camera view`}
              className={`
                px-3 py-1.5 rounded-md text-xs font-bold transition-colors
                ${layout === l.id
                  ? 'bg-blue-600 text-white'
                  : 'text-white/50 hover:text-white hover:bg-gray-700'}
              `}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Right: pagination */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="w-7 h-7 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm disabled:opacity-30 transition-colors"
            >‹</button>
            <span className="text-white/50 text-xs font-mono">
              {page + 1}/{totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="w-7 h-7 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm disabled:opacity-30 transition-colors"
            >›</button>
          </div>
        )}
      </div>

      {/* ── Camera grid ── */}
      <div
        className="flex-1 grid gap-1 p-1"
        style={{
          gridTemplateColumns: `repeat(${current.cols}, 1fr)`,
          gridTemplateRows:    `repeat(${current.rows}, 1fr)`,
        }}
      >
        {slots.map((camera, idx) => (
          <div
            key={camera?.id || `empty-${idx}`}
            className="relative bg-gray-900 rounded-lg overflow-hidden"
          >
            {camera ? (
              <>
                {/* Live view */}
                <CameraLiveView
                  camera={camera}
                  className="w-full h-full rounded-none"
                />

                {/* Camera label overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      camera.connection_status === 'online' ? 'bg-green-400' : 'bg-gray-500'
                    }`} />
                    <span className="text-white text-xs font-medium truncate max-w-[100px]">
                      {camera.name}
                    </span>
                  </div>

                  {/* Fullscreen button */}
                  <button
                    onClick={() => setFullscreen(camera.id)}
                    className="w-6 h-6 flex items-center justify-center bg-white/20 hover:bg-white/40 rounded text-white text-xs transition-colors opacity-0 group-hover:opacity-100"
                    title="Fullscreen"
                  >⛶</button>
                </div>

                {/* Hover overlay for fullscreen */}
                <div
                  className="absolute inset-0 cursor-pointer group"
                  onDoubleClick={() => setFullscreen(camera.id)}
                  title="Double-click for fullscreen"
                />
              </>
            ) : (
              /* Empty slot */
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-700">
                <div className="text-3xl mb-2">📷</div>
                <p className="text-xs font-medium">Empty slot</p>
                <p className="text-xs text-gray-600 mt-1">Add a camera</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Bottom bar: camera list ── */}
      {cameras.length > perPage && (
        <div className="px-4 py-2 bg-gray-900 border-t border-gray-800 flex items-center gap-2 overflow-x-auto">
          <span className="text-white/30 text-xs flex-shrink-0">All cameras:</span>
          {cameras.map((cam, idx) => {
            const camPage = Math.floor(idx / perPage)
            const isVisible = camPage === page
            return (
              <button
                key={cam.id}
                onClick={() => setPage(camPage)}
                className={`
                  flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs flex-shrink-0 transition-colors
                  ${isVisible ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white/50 hover:bg-gray-700'}
                `}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${
                  cam.connection_status === 'online' ? 'bg-green-400' : 'bg-gray-500'
                }`} />
                {cam.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
