import { useState, useEffect } from 'react'

const CATEGORY_COLORS = {
  Study: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
  Coding: 'bg-violet-500/20 border-violet-500/50 text-violet-300',
  Rest: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
  Exercise: 'bg-orange-500/20 border-orange-500/50 text-orange-300',
  default: 'bg-gray-700/40 border-gray-600 text-gray-300',
}

function categoryClass(cat) {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.default
}

function formatTime(dt) {
  return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function durationMinutes(start, end) {
  return Math.round((new Date(end) - new Date(start)) / 60000)
}

function BlockCard({ block, onToggle, isActive }) {
  const dur = durationMinutes(block.start_time, block.end_time)
  return (
    <div
      className={`border rounded-xl px-4 py-3 flex items-center gap-4 transition-all ${
        isActive ? 'ring-2 ring-violet-500 bg-gray-800' : 'bg-gray-900'
      } ${block.is_completed ? 'opacity-50' : ''} ${categoryClass(block.category)}`}
    >
      <button
        onClick={() => onToggle(block.id)}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
          block.is_completed
            ? 'bg-violet-500 border-violet-500'
            : 'border-gray-500 hover:border-violet-400'
        }`}
      />
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm truncate ${block.is_completed ? 'line-through' : ''}`}>
          {block.title}
        </p>
        <p className="text-xs opacity-60 mt-0.5">
          {formatTime(block.start_time)} – {formatTime(block.end_time)} · {dur} min
        </p>
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full bg-black/20 opacity-70 flex-shrink-0">
        {block.category}
      </span>
    </div>
  )
}

function ActiveBlockPanel({ block }) {
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
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[160px] text-gray-500 text-sm">
        No active block right now
      </div>
    )
  }

  const totalSecs = durationMinutes(block.start_time, block.end_time) * 60
  const pct = Math.min(100, (elapsed / totalSecs) * 100)
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  return (
    <div className={`border rounded-2xl p-6 ${categoryClass(block.category)}`}>
      <p className="text-xs uppercase tracking-widest opacity-60 mb-1">Now Focusing</p>
      <p className="text-xl font-semibold mb-1">{block.title}</p>
      <p className="text-sm opacity-60 mb-4">
        {formatTime(block.start_time)} – {formatTime(block.end_time)}
      </p>
      <div className="w-full bg-black/20 rounded-full h-2 mb-2">
        <div
          className="h-2 rounded-full bg-current transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-right text-xs opacity-60">
        {mins}:{String(secs).padStart(2, '0')} elapsed
      </p>
    </div>
  )
}

export default function Dashboard({ onReset }) {
  const [blocks, setBlocks] = useState([])
  const [generating, setGenerating] = useState(false)

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
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Today's Schedule</h1>
            <p className="text-gray-400 text-sm mt-0.5">
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
              className="text-gray-500 hover:text-gray-300 text-sm px-3 py-2 rounded-xl border border-gray-800 transition-colors"
            >
              Reconfigure
            </button>
          </div>
        </div>

        {/* Active block */}
        <ActiveBlockPanel block={activeBlock} />

        {/* Block list */}
        {blocks.length === 0 ? (
          <div className="text-center py-16 text-gray-600 text-sm">
            No blocks yet — click <strong className="text-gray-400">Generate Schedule</strong> to build your day.
          </div>
        ) : (
          <div className="space-y-2">
            {blocks.map(block => (
              <BlockCard
                key={block.id}
                block={block}
                onToggle={toggleComplete}
                isActive={activeBlock?.id === block.id}
              />
            ))}
          </div>
        )}

        {/* Progress bar */}
        {blocks.length > 0 && (
          <div className="pt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{Math.round((completedCount / blocks.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-violet-500 transition-all duration-500"
                style={{ width: `${(completedCount / blocks.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
