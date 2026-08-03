import { useState, useEffect, useRef, useCallback } from 'react'

const SKY_STOPS = [
  { hour: 0,  rgb: [8,   14,  50]  },
  { hour: 5,  rgb: [15,  30,  80]  },
  { hour: 6,  rgb: [50,  90,  160] },
  { hour: 9,  rgb: [90,  180, 230] },
  { hour: 12, rgb: [130, 210, 240] },
  { hour: 17, rgb: [90,  180, 230] },
  { hour: 19, rgb: [50,  90,  160] },
  { hour: 21, rgb: [15,  30,  80]  },
  { hour: 24, rgb: [8,   14,  50]  },
]

function skyAt(date) {
  const h = date.getHours() + date.getMinutes() / 60
  const lo = [...SKY_STOPS].reverse().find(s => s.hour <= h) ?? SKY_STOPS[0]
  const hi = SKY_STOPS.find(s => s.hour > h) ?? SKY_STOPS[SKY_STOPS.length - 1]
  const t = hi.hour === lo.hour ? 0 : (h - lo.hour) / (hi.hour - lo.hour)
  const [r, g, b] = lo.rgb.map((v, i) => Math.round(v + t * (hi.rgb[i] - v)))
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  return { color: `rgb(${r},${g},${b})`, isLight: luminance > 100 }
}

function useSky() {
  const [sky, setSky] = useState(() => skyAt(new Date()))
  useEffect(() => {
    const t = setInterval(() => setSky(skyAt(new Date())), 60_000)
    return () => clearInterval(t)
  }, [])
  return sky
}

const BAR_PALETTE = [
  '#3b82f6', '#f97316', '#10b981', '#ec4899',
  '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444',
  '#84cc16', '#6366f1',
]

function useCategoryColors(blocks) {
  const cats = [...new Set(blocks.map(b => b.category))]
  const map = {}
  cats.forEach((cat, i) => { map[cat] = BAR_PALETTE[i % BAR_PALETTE.length] })
  return map
}

function formatTime(dt) {
  return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function durationMinutes(start, end) {
  return Math.round((new Date(end) - new Date(start)) / 60000)
}

// Glossy gradient overlay for the colored left tab
function glossyBg(color) {
  return `linear-gradient(160deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.07) 45%, rgba(0,0,0,0.20) 100%), ${color}`
}

// ── Edit modal ────────────────────────────────────────────────────────────────

function EditModal({ block, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(block.title)
  const [category, setCategory] = useState(block.category)

  function handleSave() {
    onSave(block.id, { title, category })
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="modal-panel w-full max-w-md rounded-2xl border border-white/10 p-6 space-y-4 text-white"
           style={{ background: 'rgba(15,15,30,0.97)' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">Edit block</h2>
          <button onClick={onClose} className="text-xl leading-none text-gray-300 hover:opacity-70 transition-opacity">×</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs mb-1 block text-gray-300">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500 transition-shadow" />
          </div>
          <div>
            <label className="text-xs mb-1 block text-gray-300">Category</label>
            <input value={category} onChange={e => setCategory(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500 transition-shadow" />
          </div>
        </div>
        <div className="flex justify-between pt-2">
          <button onClick={() => onDelete(block.id)}
            className="text-sm px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors">
            Delete
          </button>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-gray-300">
              Cancel
            </button>
            <button onClick={handleSave}
              className="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 active:scale-95 text-white transition-all">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Timeline bar ──────────────────────────────────────────────────────────────

function DayTimeline({ blocks, categoryColors, txMuted }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  if (blocks.length === 0) return null

  const dayStart = new Date(blocks[0].start_time)
  const dayEnd   = new Date(blocks[blocks.length - 1].end_time)
  const totalMs  = dayEnd - dayStart

  function pct(date) {
    return Math.min(100, Math.max(0, ((new Date(date) - dayStart) / totalMs) * 100))
  }

  const nowPct = pct(now)
  const isPastStart = now >= dayStart && now <= dayEnd

  return (
    <div className="space-y-2">
      <div className="relative h-8 rounded-xl overflow-hidden bg-black/20">
        {blocks.map(block => {
          const left  = pct(block.start_time)
          const width = pct(block.end_time) - left
          return (
            <div key={block.id}
              title={`${block.title} (${formatTime(block.start_time)}–${formatTime(block.end_time)})`}
              className="absolute top-0 h-full"
              style={{
                left: `${left}%`, width: `${width}%`,
                backgroundColor: categoryColors[block.category] ?? '#6b7280',
                opacity: block.is_completed ? 0.3 : 0.9,
                transition: 'opacity 0.4s ease, left 0.5s cubic-bezier(0.16,1,0.3,1), width 0.5s cubic-bezier(0.16,1,0.3,1)',
              }}
            />
          )
        })}
        {isPastStart && (
          <div className="absolute top-0 h-full w-0.5 bg-white z-10 transition-all duration-[30000ms] ease-linear"
               style={{ left: `${nowPct}%` }} />
        )}
      </div>
      <div className="relative h-4">
        <span className={`absolute left-0 text-xs ${txMuted}`}>{formatTime(dayStart)}</span>
        {isPastStart && (
          <span className={`absolute text-xs font-medium -translate-x-1/2 ${txMuted}`} style={{ left: `${nowPct}%` }}>
            now
          </span>
        )}
        <span className={`absolute right-0 text-xs ${txMuted}`}>{formatTime(dayEnd)}</span>
      </div>
    </div>
  )
}

// ── Active block panel ────────────────────────────────────────────────────────

function ActiveBlockPanel({ block, cardBg, cardBorder, tx, txMuted }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!block) return
    const interval = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - new Date(block.start_time)) / 1000)))
    }, 1000)
    return () => clearInterval(interval)
  }, [block])

  if (!block) {
    return (
      <div className={`border rounded-2xl p-6 flex items-center justify-center min-h-[100px] text-sm ${txMuted} ${cardBg} ${cardBorder}`}>
        No active block right now
      </div>
    )
  }

  const totalSecs = durationMinutes(block.start_time, block.end_time) * 60
  const pct = Math.min(100, (elapsed / totalSecs) * 100)
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  return (
    <div className={`border rounded-2xl p-6 ${cardBg} ${cardBorder}`}>
      <p className={`text-xs uppercase tracking-widest mb-1 ${txMuted}`}>Now Focusing</p>
      <p className={`text-xl font-semibold mb-1 ${tx}`}>{block.title}</p>
      <p className={`text-sm mb-4 ${txMuted}`}>{formatTime(block.start_time)} – {formatTime(block.end_time)}</p>
      <div className="w-full bg-black/20 rounded-full h-2 mb-2">
        <div className="h-2 rounded-full bg-violet-500 transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
      <p className={`text-right text-xs ${txMuted}`}>{mins}:{String(secs).padStart(2, '0')} elapsed</p>
    </div>
  )
}

// ── Floating drag clone ───────────────────────────────────────────────────────

function DragClone({ block, categoryColors, cardBg, tx, txMuted, y, offsetY }) {
  const color = categoryColors[block.category] ?? '#6b7280'
  const dur = durationMinutes(block.start_time, block.end_time)
  return (
    <div
      className="fixed left-4 right-4 z-[100] pointer-events-none flex rounded-xl overflow-hidden"
      style={{
        top: y - offsetY,
        transform: 'scale(1.05) rotate(1.5deg)',
        boxShadow: '0 32px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.12)',
        willChange: 'top',
      }}
    >
      <div className="flex flex-col items-center justify-center gap-1 w-14 flex-shrink-0 py-3"
           style={{ background: glossyBg(color) }}>
        <span className="text-white/60 text-xs select-none leading-none">⠿</span>
        <span className="text-white text-[10px] font-mono font-semibold select-none leading-tight text-center mt-0.5">
          {formatTime(block.start_time)}
        </span>
      </div>
      <div className={`flex-1 flex items-center gap-3 px-4 py-3 min-w-0 ${cardBg}`}>
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm truncate ${tx}`}>{block.title}</p>
          <p className={`text-xs mt-0.5 ${txMuted}`}>{dur} min</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full text-white flex-shrink-0" style={{ backgroundColor: color }}>
          {block.category}
        </span>
      </div>
    </div>
  )
}

// ── Block row (left glossy tab + card content) ────────────────────────────────

function BlockRow({ block, index, isActive, isDragging, isDragTarget, categoryColors, cardBg, cardBorder, tx, txMuted, isLight, onToggle, onEdit, onDragStart }) {
  const color = categoryColors[block.category] ?? '#6b7280'
  const dur = durationMinutes(block.start_time, block.end_time)
  const [justToggled, setJustToggled] = useState(false)

  function handleToggle(e) {
    e.stopPropagation()
    setJustToggled(true)
    onToggle(block.id)
    setTimeout(() => setJustToggled(false), 400)
  }

  return (
    <div
      data-block-id={block.id}
      className={`block-enter flex rounded-xl overflow-hidden select-none border
        transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg
        ${isActive ? 'ring-2 ring-violet-500' : ''}
        ${isDragTarget ? 'ring-2 ring-white/50 scale-[1.02] shadow-xl' : ''}
        ${cardBorder}`}
      style={{
        animationDelay: `${index * 45}ms`,
        opacity: isDragging ? 0.2 : block.is_completed ? 0.5 : 1,
        transform: isDragging ? 'scale(0.97)' : undefined,
        transition: 'opacity 0.15s, transform 0.15s, box-shadow 0.2s, translate 0.2s',
      }}
    >
      {/* Glossy colored left tab — drag handle + time */}
      <div
        className="flex flex-col items-center justify-center gap-1 w-14 flex-shrink-0 py-3 cursor-grab active:cursor-grabbing"
        style={{ background: glossyBg(color), touchAction: 'none' }}
        onPointerDown={e => onDragStart(e, block.id)}
        onContextMenu={e => e.preventDefault()}
      >
        <span className="text-white/55 text-xs select-none leading-none">⠿</span>
        <span className="text-white text-[10px] font-mono font-semibold select-none leading-tight text-center mt-0.5">
          {formatTime(block.start_time)}
        </span>
      </div>

      {/* Card content */}
      <div className={`flex-1 flex items-center gap-3 px-4 py-3 min-w-0 ${cardBg}`}>
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />

        <button
          onClick={handleToggle}
          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors duration-200
            ${justToggled ? 'check-pop' : ''}
            ${block.is_completed ? 'bg-violet-500 border-violet-500' : 'border-gray-400 hover:border-violet-400'}`}
        />

        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm truncate transition-all duration-300 ${tx} ${block.is_completed ? 'line-through opacity-60' : ''}`}>
            {block.title}
          </p>
          <p className={`text-xs mt-0.5 ${txMuted}`}>{dur} min</p>
        </div>

        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 text-white" style={{ backgroundColor: color }}>
          {block.category}
        </span>

        <button
          onClick={e => { e.stopPropagation(); onEdit(block) }}
          className={`flex-shrink-0 text-xs px-2 py-1 rounded-lg transition-all duration-150 active:scale-95 ${
            isLight
              ? 'bg-black/10 hover:bg-black/20 text-gray-700'
              : 'bg-white/10 hover:bg-white/20 text-gray-300'
          }`}
        >
          Edit
        </button>
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard({ onReset }) {
  const [blocks, setBlocks] = useState([])
  const [generating, setGenerating] = useState(false)
  const [editingBlock, setEditingBlock] = useState(null)
  const [genKey, setGenKey] = useState(0)
  const [dragVisual, setDragVisual] = useState(null)
  // dragVisual = { id, y, offsetY, overTargetId } | null

  // Mutable drag state tracked via ref — avoids stale closures in pointer handlers
  const dragRef = useRef({ id: null, overTargetId: null, offsetY: 0 })
  // blocksRef keeps blocks accessible from stable callbacks without re-subscribing
  const blocksRef = useRef(blocks)
  useEffect(() => { blocksRef.current = blocks }, [blocks])

  const sky = useSky()
  const tx      = sky.isLight ? 'text-gray-950'   : 'text-gray-100'
  const txMuted = sky.isLight ? 'text-gray-700'   : 'text-gray-300'
  const cardBg  = sky.isLight ? 'bg-white/70'     : 'bg-white/5'
  const cardBorder = sky.isLight ? 'border-black/15' : 'border-white/10'
  const btn     = sky.isLight ? 'bg-gray-900 hover:bg-gray-700 text-white' : 'bg-white/10 hover:bg-white/20 text-gray-200 border border-white/10'

  const categoryColors = useCategoryColors(blocks)

  const loadBlocks = useCallback(async () => {
    try {
      const res = await fetch('/api/timeblocks/')
      setBlocks(await res.json())
      setGenKey(k => k + 1)
    } catch {}
  }, [])

  // Uses blocksRef so it stays stable even as blocks changes
  const swapBlockTimes = useCallback(async (aId, bId) => {
    const cur = blocksRef.current
    const a = cur.find(b => b.id === aId)
    const b = cur.find(b => b.id === bId)
    if (!a || !b) return

    const patches = [
      { id: aId, start_time: b.start_time, end_time: b.end_time },
      { id: bId, start_time: a.start_time, end_time: a.end_time },
    ]

    setBlocks(prev =>
      prev.map(block => {
        const p = patches.find(p => p.id === block.id)
        return p ? { ...block, ...p } : block
      }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    )

    try {
      await Promise.all(patches.map(p =>
        fetch(`/api/timeblocks/${p.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ start_time: p.start_time, end_time: p.end_time }),
        })
      ))
    } catch {
      loadBlocks()
    }
  }, [loadBlocks])

  // Attach native window listeners while a drag is in progress.
  // This ensures move/up events are captured even when the pointer leaves the drag handle,
  // which is critical on mobile where touch moves off the element immediately.
  useEffect(() => {
    if (!dragVisual) return

    function handleMove(e) {
      e.preventDefault() // prevent scroll during drag (requires passive: false)
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const row = el?.closest('[data-block-id]')
      if (row) dragRef.current.overTargetId = parseInt(row.dataset.blockId)
      setDragVisual(v => v ? { ...v, y: e.clientY, overTargetId: dragRef.current.overTargetId } : null)
    }

    function handleEnd() {
      const { id, overTargetId } = dragRef.current
      dragRef.current.id = null
      dragRef.current.overTargetId = null
      setDragVisual(null)
      if (id && overTargetId && id !== overTargetId) swapBlockTimes(id, overTargetId)
    }

    window.addEventListener('pointermove', handleMove, { passive: false })
    window.addEventListener('pointerup', handleEnd)
    window.addEventListener('pointercancel', handleEnd)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleEnd)
      window.removeEventListener('pointercancel', handleEnd)
    }
  }, [dragVisual?.id, swapBlockTimes]) // eslint-disable-line react-hooks/exhaustive-deps

  function startDrag(e, blockId) {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const row = e.currentTarget.closest('[data-block-id]')
    const rect = row.getBoundingClientRect()
    dragRef.current = { id: blockId, overTargetId: blockId, offsetY: e.clientY - rect.top }
    setDragVisual({ id: blockId, y: e.clientY, offsetY: e.clientY - rect.top, overTargetId: blockId })
  }

  async function generateSchedule() {
    setGenerating(true)
    try {
      const res = await fetch('/api/schedule/generate/', { method: 'POST' })
      setBlocks(await res.json())
      setGenKey(k => k + 1)
    } catch {} finally {
      setGenerating(false)
    }
  }

  async function clearSchedule() {
    const prev = blocks
    setBlocks([])
    try { await fetch('/api/schedule/clear/', { method: 'POST' }) }
    catch { setBlocks(prev) }
  }

  async function toggleComplete(id) {
    const block = blocksRef.current.find(b => b.id === id)
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, is_completed: !b.is_completed } : b))
    try {
      await fetch(`/api/timeblocks/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: !block.is_completed }),
      })
    } catch {
      setBlocks(prev => prev.map(b => b.id === id ? { ...b, is_completed: block.is_completed } : b))
    }
  }

  async function saveBlock(id, patch) {
    setBlocks(prev =>
      prev.map(b => b.id === id ? { ...b, ...patch } : b)
         .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    )
    setEditingBlock(null)
    try {
      await fetch(`/api/timeblocks/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    } catch {
      loadBlocks()
    }
  }

  async function deleteBlock(id) {
    setBlocks(prev => prev.filter(b => b.id !== id))
    setEditingBlock(null)
    try {
      await fetch(`/api/timeblocks/${id}/`, { method: 'DELETE' })
    } catch {
      loadBlocks()
    }
  }

  useEffect(() => { loadBlocks() }, [loadBlocks])

  const now = new Date()
  const activeBlock = blocks.find(
    b => !b.is_completed && new Date(b.start_time) <= now && new Date(b.end_time) >= now
  )
  const completedCount = blocks.filter(b => b.is_completed).length
  const draggingBlock = dragVisual ? blocks.find(b => b.id === dragVisual.id) : null

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors duration-[2000ms] ${tx}`}
         style={{ background: `linear-gradient(to bottom, ${sky.color}, #0a0a1a)` }}>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${tx}`}>Today's Schedule</h1>
            <p className={`text-sm mt-0.5 transition-all duration-300 ${txMuted}`}>
              {completedCount}/{blocks.length} blocks completed
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={generateSchedule} disabled={generating}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 active:scale-95 text-white text-sm px-4 py-2 rounded-xl transition-all flex items-center gap-2">
              {generating && (
                <span className="spinner inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />
              )}
              {generating ? 'Generating…' : 'Generate Schedule'}
            </button>
            {blocks.length > 0 && (
              <button onClick={clearSchedule}
                className={`text-sm px-3 py-2 rounded-xl transition-all active:scale-95 hover:text-red-400 ${btn}`}>
                Clear
              </button>
            )}
            <button onClick={onReset}
              className={`text-sm px-3 py-2 rounded-xl transition-all active:scale-95 ${btn}`}>
              Reconfigure
            </button>
          </div>
        </div>

        {/* Timeline */}
        {blocks.length > 0 && (
          <div>
            <div className={`flex justify-between text-xs mb-2 ${txMuted}`}>
              <span>Day timeline</span>
              <span>{completedCount}/{blocks.length} done</span>
            </div>
            <DayTimeline blocks={blocks} categoryColors={categoryColors} txMuted={txMuted} />
          </div>
        )}

        {/* Active block */}
        <ActiveBlockPanel block={activeBlock} cardBg={cardBg} cardBorder={cardBorder} tx={tx} txMuted={txMuted} />

        {/* Block list */}
        {blocks.length === 0 ? (
          <div className={`text-center py-16 text-sm ${txMuted}`}>
            No blocks yet — click <strong>Generate Schedule</strong> to build your day.
          </div>
        ) : (
          <div className="space-y-2">
            {blocks.map((block, i) => (
              <BlockRow
                key={`${block.id}-${genKey}`}
                block={block}
                index={i}
                isActive={activeBlock?.id === block.id}
                isDragging={dragVisual?.id === block.id}
                isDragTarget={dragVisual?.overTargetId === block.id && dragVisual?.id !== block.id}
                categoryColors={categoryColors}
                cardBg={cardBg}
                cardBorder={cardBorder}
                tx={tx} txMuted={txMuted}
                isLight={sky.isLight}
                onToggle={toggleComplete}
                onEdit={setEditingBlock}
                onDragStart={startDrag}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating clone that follows the pointer during drag */}
      {draggingBlock && dragVisual && (
        <DragClone
          block={draggingBlock}
          categoryColors={categoryColors}
          cardBg={cardBg}
          tx={tx} txMuted={txMuted}
          y={dragVisual.y}
          offsetY={dragVisual.offsetY}
        />
      )}

      {editingBlock && (
        <EditModal
          block={editingBlock}
          onSave={saveBlock}
          onDelete={deleteBlock}
          onClose={() => setEditingBlock(null)}
        />
      )}
    </div>
  )
}
