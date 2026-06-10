import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useContracts } from '../hooks/useContracts'
import { useRuns } from '../hooks/useRuns'
import { buildSystemPrompt, askAI } from '../lib/ai'
import TopBar from '../components/layout/TopBar'

const SUGGESTIONS = [
  'Any anomalies today?',
  'What contracts should I bid on?',
  'Draft my SAM renewal checklist',
  'Which drivers need recertification?',
]

export default function AiAssistant() {
  const { profile } = useAuth()
  const { contracts } = useContracts()
  const { runs } = useRuns({ limit: 50 })
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const systemPrompt = buildSystemPrompt(profile?.companies, runs, contracts)

  async function send(text) {
    const userMsg = text || input.trim()
    if (!userMsg) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)
    try {
      const reply = await askAI(userMsg, systemPrompt)
      setMessages(prev => [...prev, { role: 'assistant', text: reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${err?.message ?? JSON.stringify(err)}` }])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-[100dvh] md:h-screen">
      <TopBar title="AI Assistant" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-32 md:pb-28">
        {messages.length === 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-xs text-white/40 text-center mb-3">Quick actions</p>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                className="w-full text-left bg-navy-700 border border-white/[0.07] rounded-xl px-4 py-3 text-sm text-white/70 active:bg-navy-600"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
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
            <div className="bg-navy-700 border border-white/[0.07] rounded-2xl rounded-bl-sm px-4 py-2.5">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-20 left-0 right-0 md:bottom-0 md:left-60 bg-navy-800 border-t border-white/[0.08] px-4 py-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask anything about your business…"
          className="flex-1 bg-navy-700 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-white/30"
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="bg-brand-600 text-white rounded-xl px-4 font-semibold disabled:opacity-40 active:bg-brand-700"
        >
          Send
        </button>
      </div>
    </div>
  )
}
