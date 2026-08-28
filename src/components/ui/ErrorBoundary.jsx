import { Component } from 'react'

// Vite content-hashes every lazy-loaded chunk's filename, and Vercel only
// serves the current deployment's assets under the production URL — once a
// newer deploy ships, a browser still running an older cached bundle tries
// to import a chunk hash that no longer exists and gets a hard failure here
// on every lazy route at once. Worse, React.lazy() caches the rejected
// import promise, so this boundary's own "Try again" (a soft state reset)
// can never actually retry the fetch — only a full reload fetches a fresh
// chunk manifest. Detect that specific failure and reload once automatically;
// guarded via sessionStorage so a genuinely broken deployment can't loop.
const CHUNK_LOAD_ERROR = /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    if (CHUNK_LOAD_ERROR.test(error?.message ?? '')) {
      const key = 'vantar_chunk_reload_attempted'
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1')
        window.location.reload()
      }
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 m-4">
          <p className="text-red-300 font-semibold text-sm">Something went wrong</p>
          <p className="text-red-400/80 text-xs mt-1">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-3 text-xs text-red-300 underline"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
