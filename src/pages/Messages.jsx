import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useDrivers } from '../hooks/useDrivers'
import { useMessages } from '../hooks/useMessages'
import { useUnreadCounts } from '../hooks/useUnreadCounts'
import TopBar from '../components/layout/TopBar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { safeFormatDate } from '../lib/dates'
import { ChevronLeft, Send, MessageCircle } from 'lucide-react'

function Bubble({ message, isOwn }) {
  const senderName = message.sender?.full_name || (message.sender?.role === 'driver' ? 'Driver' : 'Management')
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
        isOwn ? 'bg-brand-600 text-white' : 'bg-navy-700 border border-white/[0.07] text-white'
      }`}>
        {!isOwn && <p className="text-[10px] font-semibold text-brand-300 mb-0.5">{senderName}</p>}
        <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
        <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/70' : 'text-white/35'}`}>
          {safeFormatDate(message.created_at, 'MMM d, h:mm a')}
        </p>
      </div>
    </div>
  )
}

function ChatThread({ driverId, onBack, headerLabel }) {
  const { profile } = useAuth()
  const { messages, loading, sendMessage, markRead } = useMessages(driverId)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (driverId) markRead()
  }, [driverId, markRead])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  async function handleSend() {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    setDraft('')
    const { error } = await sendMessage(body)
    if (error) setDraft(body) // restore on failure so the message isn't lost
    setSending(false)
  }

  return (
    // Height accounts for TopBar always, plus the fixed MobileNav bar that
    // overlays the bottom of the viewport on mobile only (desktop has no
    // bottom bar — Sidebar sits to the left instead) — otherwise the
    // pinned composer at the bottom of this flex column ends up hidden
    // behind MobileNav.
    <div className="flex flex-col h-[calc(100vh-3.5rem-4.5rem)] md:h-[calc(100vh-4.25rem)]">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-white/60 hover:text-white shrink-0 md:px-8"
        >
          <ChevronLeft size={16} />
          {headerLabel}
        </button>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 md:px-8">
        {loading && <LoadingSpinner />}
        {!loading && messages.length === 0 && (
          <p className="text-sm text-white/40 text-center py-8">No messages yet — say hello.</p>
        )}
        {messages.map(m => (
          <Bubble key={m.id} message={m} isOwn={m.sender_id === profile?.id} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-white/[0.08] px-4 py-3 flex items-end gap-2 md:px-8 safe-bottom">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Type a message…"
          rows={1}
          className="flex-1 resize-none bg-navy-800 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-white/30"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          className="bg-brand-600 text-white rounded-xl p-2.5 disabled:opacity-40 active:bg-brand-700 transition-colors shrink-0"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}

function DriverListItem({ driver, unreadCount, onClick }) {
  const name = driver.full_name || 'Unnamed driver'
  const initials = name !== 'Unnamed driver'
    ? name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-navy-700 rounded-xl p-3 border border-white/[0.07] active:bg-navy-600 transition-colors text-left"
    >
      {driver.avatar_url ? (
        <img src={driver.avatar_url} alt={name} className="h-9 w-9 rounded-full object-cover shrink-0" />
      ) : (
        <div className="h-9 w-9 rounded-full bg-brand-600/30 flex items-center justify-center text-brand-300 text-xs font-bold shrink-0">
          {initials}
        </div>
      )}
      <span className="flex-1 min-w-0 text-sm font-medium text-white truncate">{name}</span>
      {unreadCount > 0 && (
        <span className="shrink-0 bg-brand-600 text-white text-[10px] font-bold rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}

function ManagementView() {
  const { drivers, loading } = useDrivers()
  const unreadCounts = useUnreadCounts()
  const [selectedDriver, setSelectedDriver] = useState(null)

  if (selectedDriver) {
    return (
      <ChatThread
        driverId={selectedDriver.id}
        onBack={() => setSelectedDriver(null)}
        headerLabel={selectedDriver.full_name || 'Unnamed driver'}
      />
    )
  }

  return (
    <div className="px-4 pt-4 pb-24 space-y-2 md:px-8 md:pt-6 md:pb-8">
      {loading && <LoadingSpinner />}
      {!loading && drivers.length === 0 && (
        <div className="text-center py-12">
          <MessageCircle size={28} className="mx-auto text-white/20 mb-2" />
          <p className="text-sm text-white/40">No drivers yet</p>
        </div>
      )}
      {drivers.map(driver => (
        <DriverListItem
          key={driver.id}
          driver={driver}
          unreadCount={unreadCounts[driver.id] ?? 0}
          onClick={() => setSelectedDriver(driver)}
        />
      ))}
    </div>
  )
}

export default function Messages() {
  const { profile } = useAuth()
  const isDriver = profile?.role === 'driver'

  // No page-level bottom padding here — ChatThread sizes itself to fill
  // the remaining viewport (accounting for MobileNav) and the driver list
  // inside ManagementView carries its own pb-24 for scroll clearance.
  return (
    <div>
      <TopBar title="Messages" />
      {isDriver ? (
        <ChatThread driverId={profile?.id} />
      ) : (
        <ManagementView />
      )}
    </div>
  )
}
