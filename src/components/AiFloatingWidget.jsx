import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useContracts } from '../hooks/useContracts'
import { useRuns } from '../hooks/useRuns'
import { buildSystemPrompt, askAI } from '../lib/ai'

const SUGGESTIONS = [
  'Any compliance risks?',
  'What contracts should I bid on?',
  'Summarize today\'s runs',
]

export default function AiFloatingWidget() {
  const { profile } = useAuth()
  const { contracts } = useContracts()
  const { runs } = useRuns({ limit: 20 })
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  const systemPrompt = buildSystemPrompt(profile?.companies, runs, contracts)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text) {
    const userMsg = text || input.trim()
    if (!userMsg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)
    try {
      const reply = await askAI(userMsg, systemPrompt)
      setMessages(prev => [...prev, { role: 'assistant', text: reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${err?.message ?? 'Something went wrong'}` }])
    }
    setLoading(false)
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="w-[320px] md:w-[360px] flex flex-col bg-navy-800 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden" style={{ height: 440 }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-navy-900 shrink-0">
            <div className="flex items-center gap-2">
              <Bot size={15} className="text-brand-400" />
              <span className="text-sm font-semibold text-white">AI Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white transition-colors">
              <X size={15} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {messages.length === 0 && (
              <div className="space-y-1.5 mt-1">
                <p className="text-[10px] text-white/30 text-center mb-2">Quick prompts</p>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="w-full text-left bg-navy-700 border border-white/[0.07] rounded-xl px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-navy-600 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] px-3 py-2 rounded-xl text-xs whitespace-pre-wrap leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-brand-600 text-white rounded-br-sm'
                    : 'bg-navy-700 border border-white/[0.07] text-white/90 rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-navy-700 border border-white/[0.07] rounded-xl rounded-bl-sm px-3 py-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1 h-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-3 py-2.5 border-t border-white/[0.08] flex gap-2 shrink-0">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask anything…"
              className="flex-1 bg-navy-700 border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder:text-white/25"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="bg-brand-600 text-white rounded-xl px-3 disabled:opacity-40 active:bg-brand-700 transition-colors"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(v => !v)}
        className={`h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${
          open ? 'bg-navy-700 border border-white/10' : 'bg-brand-600 hover:bg-brand-500'
        }`}
      >
        {open ? <X size={18} className="text-white" /> : <Bot size={20} className="text-white" />}
      </button>
    </div>
  )
}
