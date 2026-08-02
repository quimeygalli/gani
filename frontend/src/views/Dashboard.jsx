import { useState, useEffect } from 'react'

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

// Distinct palette — one color per index, cycling if more categories appear
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

// ── Edit modal ────────────────────────────────────────────────────────────────

function toLocalTime(isoStr) {
  const d = new Date(isoStr)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function applyTimeToDate(originalIso, timeStr) {
  const d = new Date(originalIso)
  const [h, m] = timeStr.split(':').map(Number)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

function EditModal({ block, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(block.title)
  const [category, setCategory] = useState(block.category)
  const [startTime, setStartTime] = useState(() => toLocalTime(block.start_time))
  const [endTime, setEndTime] = useState(() => toLocalTime(block.end_time))

  function handleSave() {
    onSave(block.id, {
      title,
      category,
      start_time: applyTimeToDate(block.start_time, startTime),
      end_time: applyTimeToDate(block.end_time, endTime),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 p-6 space-y-4 text-white"
           style={{ background: 'rgba(15,15,30,0.97)' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">Edit block</h2>
          <button onClick={onClose} className="text-xl leading-none text-gray-300 hover:opacity-70">×</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs mb-1 block text-gray-300">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="text-xs mb-1 block text-gray-300">Category</label>
            <input
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block text-gray-300">Start</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block text-gray-300">End</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <button
            onClick={() => onDelete(block.id)}
            className="text-sm px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors"
          >
            Delete
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
            >
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
            <div
              key={block.id}
              title={`${block.title} (${formatTime(block.start_time)}–${formatTime(block.end_time)})`}
              className="absolute top-0 h-full transition-opacity"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: categoryColors[block.category] ?? '#6b7280',
                opacity: block.is_completed ? 0.3 : 0.9,
              }}
            />
          )
        })}
        {isPastStart && (
          <div
            className="absolute top-0 h-full w-0.5 bg-white z-10"
            style={{ left: `${nowPct}%` }}
          />
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

function ActiveBlockPanel({ block, card, tx, txMuted }) {
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
      <div className={`border rounded-2xl p-6 flex items-center justify-center min-h-[100px] text-sm ${txMuted} ${card}`}>
        No active block right now
      </div>
    )
  }

  const totalSecs = durationMinutes(block.start_time, block.end_time) * 60
  const pct = Math.min(100, (elapsed / totalSecs) * 100)
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  return (
    <div className={`border rounded-2xl p-6 ${card}`}>
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

// ── Block card ────────────────────────────────────────────────────────────────

function BlockCard({ block, onToggle, onEdit, isActive, categoryColors, card, tx, txMuted, isLight }) {
  const dur = durationMinutes(block.start_time, block.end_time)
  const color = categoryColors[block.category] ?? '#6b7280'

  return (
    <div
      className={`border rounded-xl px-4 py-3 flex items-center gap-4 transition-all ${isActive ? 'ring-2 ring-violet-500' : ''} ${block.is_completed ? 'opacity-50' : ''} ${card}`}
    >
      {/* Color dot matching timeline */}
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />

      <button
        onClick={() => onToggle(block.id)}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
          block.is_completed ? 'bg-violet-500 border-violet-500' : 'border-gray-400 hover:border-violet-400'
        }`}
      />

      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm truncate ${tx} ${block.is_completed ? 'line-through' : ''}`}>
          {block.title}
        </p>
        <p className={`text-xs mt-0.5 ${txMuted}`}>
          {formatTime(block.start_time)} – {formatTime(block.end_time)} · {dur} min
        </p>
      </div>

      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 text-white" style={{ backgroundColor: color }}>
        {block.category}
      </span>

      <button
        onClick={() => onEdit(block)}
        className={`flex-shrink-0 text-xs px-2 py-1 rounded-lg transition-colors ${
          isLight
            ? 'bg-black/10 hover:bg-black/20 text-gray-700'
            : 'bg-white/10 hover:bg-white/20 text-gray-300'
        }`}
      >
        Edit
      </button>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard({ onReset }) {
  const [blocks, setBlocks] = useState([])
  const [generating, setGenerating] = useState(false)
  const [editingBlock, setEditingBlock] = useState(null)

  const sky = useSky()
  const tx = sky.isLight ? 'text-gray-950' : 'text-gray-100'
  const txMuted = sky.isLight ? 'text-gray-700' : 'text-gray-300'
  const card = sky.isLight ? 'bg-white/70 border-black/15' : 'bg-white/5 border-white/10'
  const btn = sky.isLight ? 'bg-gray-900 hover:bg-gray-700 text-white' : 'bg-white/10 hover:bg-white/20 text-gray-200 border border-white/10'

  const categoryColors = useCategoryColors(blocks)

  async function loadBlocks() {
    try {
      const res = await fetch('/api/timeblocks/')
      setBlocks(await res.json())
    } catch {}
  }

  async function generateSchedule() {
    setGenerating(true)
    try {
      const res = await fetch('/api/schedule/generate/', { method: 'POST' })
      setBlocks(await res.json())
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
    const block = blocks.find(b => b.id === id)
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
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b))
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

  useEffect(() => { loadBlocks() }, [])

  const now = new Date()
  const activeBlock = blocks.find(
    b => !b.is_completed && new Date(b.start_time) <= now && new Date(b.end_time) >= now
  )
  const completedCount = blocks.filter(b => b.is_completed).length

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors duration-[2000ms] ${tx}`}
         style={{ background: `linear-gradient(to bottom, ${sky.color}, #0a0a1a)` }}>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${tx}`}>Today's Schedule</h1>
            <p className={`text-sm mt-0.5 ${txMuted}`}>{completedCount}/{blocks.length} blocks completed</p>
          </div>
          <div className="flex gap-2">
            <button onClick={generateSchedule} disabled={generating}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-xl transition-colors">
              {generating ? 'Generating…' : 'Generate Schedule'}
            </button>
            {blocks.length > 0 && (
              <button onClick={clearSchedule}
                className={`text-sm px-3 py-2 rounded-xl transition-colors hover:text-red-400 ${btn}`}>
                Clear
              </button>
            )}
            <button onClick={onReset} className={`text-sm px-3 py-2 rounded-xl transition-colors ${btn}`}>
              Reconfigure
            </button>
          </div>
        </div>

        {/* Timeline — above the active block */}
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
        <ActiveBlockPanel block={activeBlock} card={card} tx={tx} txMuted={txMuted} />

        {/* Block list */}
        {blocks.length === 0 ? (
          <div className={`text-center py-16 text-sm ${txMuted}`}>
            No blocks yet — click <strong>Generate Schedule</strong> to build your day.
          </div>
        ) : (
          <div className="space-y-2">
            {blocks.map(block => (
              <BlockCard
                key={block.id}
                block={block}
                onToggle={toggleComplete}
                onEdit={setEditingBlock}
                isActive={activeBlock?.id === block.id}
                categoryColors={categoryColors}
                card={card} tx={tx} txMuted={txMuted}
                isLight={sky.isLight}
              />
            ))}
          </div>
        )}
      </div>

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
