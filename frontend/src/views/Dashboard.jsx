import { useState, useEffect, useMemo } from 'react'

// Sky color stops keyed by hour (0–24)
const SKY_STOPS = [
  { hour: 0,  rgb: [8,   14,  50]  },  // midnight
  { hour: 5,  rgb: [15,  30,  80]  },  // pre-dawn
  { hour: 6,  rgb: [50,  90,  160] },  // dawn
  { hour: 9,  rgb: [90,  180, 230] },  // morning
  { hour: 12, rgb: [130, 210, 240] },  // midday
  { hour: 17, rgb: [90,  180, 230] },  // afternoon
  { hour: 19, rgb: [50,  90,  160] },  // dusk
  { hour: 21, rgb: [15,  30,  80]  },  // evening
  { hour: 24, rgb: [8,   14,  50]  },  // midnight
]

function skyAt(date) {
  const h = date.getHours() + date.getMinutes() / 60
  const lo = [...SKY_STOPS].reverse().find(s => s.hour <= h) ?? SKY_STOPS[0]
  const hi = SKY_STOPS.find(s => s.hour > h) ?? SKY_STOPS[SKY_STOPS.length - 1]
  const t = hi.hour === lo.hour ? 0 : (h - lo.hour) / (hi.hour - lo.hour)
  const [r, g, b] = lo.rgb.map((v, i) => Math.round(v + t * (hi.rgb[i] - v)))
  // perceived luminance — if > 100 the sky is light enough to need dark text
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

const CATEGORY_COLORS = {
  Study:    { card: 'bg-blue-500/20 border-blue-500/50 text-blue-300',    bar: '#3b82f6' },
  Coding:   { card: 'bg-violet-500/20 border-violet-500/50 text-violet-300', bar: '#8b5cf6' },
  Rest:     { card: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300', bar: '#10b981' },
  Exercise: { card: 'bg-orange-500/20 border-orange-500/50 text-orange-300', bar: '#f97316' },
  default:  { card: 'bg-gray-700/40 border-gray-600 text-gray-300',       bar: '#6b7280' },
}

function categoryClass(cat) {
  return (CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.default).card
}

function categoryBarColor(cat) {
  return (CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.default).bar
}

function DayTimeline({ blocks, txMuted }) {
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
      {/* Bar */}
      <div className="relative h-8 rounded-xl overflow-hidden bg-gray-800">
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
                backgroundColor: categoryBarColor(block.category),
                opacity: block.is_completed ? 0.35 : 0.85,
              }}
            />
          )
        })}

        {/* "Now" marker */}
        {isPastStart && (
          <div
            className="absolute top-0 h-full w-0.5 bg-white z-10"
            style={{ left: `${nowPct}%` }}
          />
        )}
      </div>

      {/* Time labels */}
      <div className="relative h-4">
        <span className={`absolute left-0 text-xs ${txMuted}`}>{formatTime(dayStart)}</span>
        {isPastStart && (
          <span
            className={`absolute text-xs font-medium -translate-x-1/2 ${txMuted}`}
            style={{ left: `${nowPct}%` }}
          >
            now
          </span>
        )}
        <span className={`absolute right-0 text-xs ${txMuted}`}>{formatTime(dayEnd)}</span>
      </div>
    </div>
  )
}

function formatTime(dt) {
  return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function durationMinutes(start, end) {
  return Math.round((new Date(end) - new Date(start)) / 60000)
}

function BlockCard({ block, onToggle, isActive, card, tx, txMuted }) {
  const dur = durationMinutes(block.start_time, block.end_time)
  return (
    <div
      className={`border rounded-xl px-4 py-3 flex items-center gap-4 transition-all ${
        isActive ? 'ring-2 ring-violet-500' : ''
      } ${block.is_completed ? 'opacity-50' : ''} ${card}`}
    >
      <button
        onClick={() => onToggle(block.id)}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
          block.is_completed
            ? 'bg-violet-500 border-violet-500'
            : 'border-gray-400 hover:border-violet-400'
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
      <span
        className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 text-white"
        style={{ backgroundColor: categoryBarColor(block.category) }}
      >
        {block.category}
      </span>
    </div>
  )
}

function ActiveBlockPanel({ block, card, tx, txMuted }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!block) return
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - new Date(block.start_time)) / 1000)
      setElapsed(Math.max(0, secs))
    }, 1000)
    return () => clearInterval(interval)
  }, [block])

  if (!block) {
    return (
      <div className={`border rounded-2xl p-6 flex flex-col items-center justify-center min-h-[160px] text-sm ${txMuted} ${card}`}>
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
      <p className={`text-sm mb-4 ${txMuted}`}>
        {formatTime(block.start_time)} – {formatTime(block.end_time)}
      </p>
      <div className="w-full bg-black/20 rounded-full h-2 mb-2">
        <div
          className="h-2 rounded-full bg-current transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`text-right text-xs ${txMuted}`}>
        {mins}:{String(secs).padStart(2, '0')} elapsed
      </p>
    </div>
  )
}

export default function Dashboard({ onReset }) {
  const [blocks, setBlocks] = useState([])
  const [generating, setGenerating] = useState(false)
  const sky = useSky()
  const tx = sky.isLight ? 'text-gray-900' : 'text-gray-100'
  const txMuted = sky.isLight ? 'text-gray-600' : 'text-gray-400'
  const card = sky.isLight ? 'bg-white/50 border-black/10' : 'bg-white/5 border-white/10'
  const btn = sky.isLight ? 'bg-gray-900/80 hover:bg-gray-900 text-white' : 'bg-white/10 hover:bg-white/20 text-gray-200 border border-white/10'

  async function loadBlocks() {
    try {
      const res = await fetch('/api/timeblocks/')
      const data = await res.json()
      setBlocks(data)
    } catch {
      // handled silently — backend not yet connected
    }
  }

  async function generateSchedule() {
    setGenerating(true)
    try {
      const res = await fetch('/api/schedule/generate/', { method: 'POST' })
      const data = await res.json()
      setBlocks(data)
    } catch {
      // handled silently
    } finally {
      setGenerating(false)
    }
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
      // revert on failure
      setBlocks(prev => prev.map(b => b.id === id ? { ...b, is_completed: block.is_completed } : b))
    }
  }

  useEffect(() => { loadBlocks() }, [])

  const now = new Date()
  const activeBlock = blocks.find(
    b => !b.is_completed && new Date(b.start_time) <= now && new Date(b.end_time) >= now
  )
  const completedCount = blocks.filter(b => b.is_completed).length

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors duration-[2000ms] ${tx}`} style={{ background: `linear-gradient(to bottom, ${sky.color}, #0a0a1a)` }}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${tx}`}>Today's Schedule</h1>
            <p className={`text-sm mt-0.5 ${txMuted}`}>
              {completedCount}/{blocks.length} blocks completed
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={generateSchedule}
              disabled={generating}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-xl transition-colors"
            >
              {generating ? 'Generating…' : 'Generate Schedule'}
            </button>
            <button
              onClick={onReset}
              className={`text-sm px-3 py-2 rounded-xl transition-colors ${btn}`}
            >
              Reconfigure
            </button>
          </div>
        </div>

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
                isActive={activeBlock?.id === block.id}
                card={card}
                tx={tx}
                txMuted={txMuted}
              />
            ))}
          </div>
        )}

        {/* Day timeline */}
        {blocks.length > 0 && (
          <div className="pt-2">
            <div className={`flex justify-between text-xs mb-2 ${txMuted}`}>
              <span>Day timeline</span>
              <span>{completedCount}/{blocks.length} done</span>
            </div>
            <DayTimeline blocks={blocks} txMuted={txMuted} />
          </div>
        )}
      </div>
    </div>
  )
}
