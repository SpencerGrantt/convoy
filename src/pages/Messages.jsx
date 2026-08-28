import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useDrivers } from '../hooks/useDrivers'
import { useMessages } from '../hooks/useMessages'
import { useUnreadCounts, useUnreadMessageCount } from '../hooks/useUnreadCounts'
import TopBar from '../components/layout/TopBar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { safeFormatDate } from '../lib/dates'
import { ChevronLeft, Send, MessageCircle, Headset } from 'lucide-react'

function Bubble({ message, isOwn }) {
  const senderName = message.sender?.full_name || (message.sender?.role === 'driver' ? 'Driver' : 'Management')
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
        isOwn ? 'theme-dark bg-brand-600 text-white' : 'bg-navy-700 border border-fg/[0.07] text-fg'
      }`}>
        {!isOwn && <p className="text-[10px] font-semibold text-brand-300 mb-0.5">{senderName}</p>}
        <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
        <p className={`text-[10px] mt-1 ${isOwn ? 'text-fg/70' : 'text-fg/35'}`}>
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
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-fg/60 hover:text-fg shrink-0 md:px-8"
        >
          <ChevronLeft size={16} />
          {headerLabel}
        </button>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 md:px-8">
        {loading && <LoadingSpinner />}
        {!loading && messages.length === 0 && (
          <p className="text-sm text-fg/40 text-center py-8">No messages yet — say hello.</p>
        )}
        {messages.map(m => (
          <Bubble key={m.id} message={m} isOwn={m.sender_id === profile?.id} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-fg/[0.08] px-4 py-3 flex items-end gap-2 md:px-8 safe-bottom">
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
          className="flex-1 resize-none bg-navy-800 border border-fg/10 text-fg rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-fg/30"
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
  const name = driver.full_name || 'Unnamed crew member'
  const initials = name !== 'Unnamed crew member'
    ? name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-navy-700 rounded-xl p-3 border border-fg/[0.07] active:bg-navy-600 transition-colors text-left"
    >
      {driver.avatar_url ? (
        <img src={driver.avatar_url} alt={name} className="h-9 w-9 rounded-full object-cover shrink-0" />
      ) : (
        <div className="h-9 w-9 rounded-full bg-brand-600/30 flex items-center justify-center text-brand-300 text-xs font-bold shrink-0">
          {initials}
        </div>
      )}
      <span className="flex-1 min-w-0 text-sm font-medium text-fg truncate">{name}</span>
      {unreadCount > 0 && (
        <span className="shrink-0 bg-brand-600 text-white text-[10px] font-bold rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}

function ManagementView({ initialDriverId }) {
  const { drivers, loading } = useDrivers()
  const unreadCounts = useUnreadCounts()
  const [clickedDriver, setClickedDriver] = useState(null)
  // A click from the TopBar notification dropdown carries which driver's
  // channel it was about — jump straight there once that driver's row has
  // loaded, instead of always landing on the plain list. Derived at render
  // time rather than synced into state via an effect: "Back" clears
  // clickedDriver, and dismissed (also set by "Back") stops the same
  // initialDriverId from re-selecting itself right after leaving it —
  // initialDriverId itself never changes once the page has mounted.
  const [dismissed, setDismissed] = useState(false)
  const initialMatch = !dismissed && initialDriverId && !loading
    ? drivers.find(d => d.id === initialDriverId)
    : null
  const selectedDriver = clickedDriver || initialMatch

  if (selectedDriver) {
    return (
      <ChatThread
        driverId={selectedDriver.id}
        onBack={() => { setClickedDriver(null); setDismissed(true) }}
        headerLabel={selectedDriver.full_name || 'Unnamed crew member'}
      />
    )
  }

  return (
    <div className="px-4 pt-4 pb-24 space-y-2 md:px-8 md:pt-6 md:pb-8">
      {loading && <LoadingSpinner />}
      {!loading && drivers.length === 0 && (
        <div className="text-center py-12">
          <MessageCircle size={28} className="mx-auto text-fg/20 mb-2" />
          <p className="text-sm text-fg/40">No drivers yet</p>
        </div>
      )}
      {drivers.map(driver => (
        <DriverListItem
          key={driver.id}
          driver={driver}
          unreadCount={unreadCounts[driver.id] ?? 0}
          onClick={() => setClickedDriver(driver)}
        />
      ))}
    </div>
  )
}

// A driver only ever has one channel, but landing straight in the thread
// (the old behavior) skipped past any sense of "this is an inbox" — a
// one-row list matches the same chat-list pattern management sees, and
// still opens directly if a notification click already knows where to go.
function DriverChatListView({ profile, autoOpen }) {
  const [opened, setOpened] = useState(!!autoOpen)
  const unread = useUnreadMessageCount()

  if (opened) {
    return (
      <ChatThread
        driverId={profile.id}
        onBack={() => setOpened(false)}
        headerLabel="Chats"
      />
    )
  }

  return (
    <div className="px-4 pt-4 pb-24 space-y-2 md:px-8 md:pt-6 md:pb-8">
      <button
        onClick={() => setOpened(true)}
        className="w-full flex items-center gap-3 bg-navy-700 rounded-xl p-3 border border-fg/[0.07] active:bg-navy-600 transition-colors text-left"
      >
        <div className="h-9 w-9 rounded-full bg-brand-600/30 flex items-center justify-center text-brand-300 shrink-0">
          <Headset size={16} />
        </div>
        <span className="flex-1 min-w-0 text-sm font-medium text-fg truncate">Management</span>
        {unread > 0 && (
          <span className="shrink-0 bg-brand-600 text-white text-[10px] font-bold rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
    </div>
  )
}

export default function Messages() {
  const { profile } = useAuth()
  const location = useLocation()
  const isDriver = profile?.role === 'driver'
  const openDriverId = location.state?.openDriverId

  // No page-level bottom padding here — ChatThread sizes itself to fill
  // the remaining viewport (accounting for MobileNav) and the list views
  // below carry their own pb-24 for scroll clearance.
  return (
    <div>
      <TopBar title="Messages" />
      {isDriver ? (
        <DriverChatListView profile={profile} autoOpen={!!openDriverId} />
      ) : (
        <ManagementView initialDriverId={openDriverId} />
      )}
    </div>
  )
}
