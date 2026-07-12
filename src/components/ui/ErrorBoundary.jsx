import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 m-4">
          <p className="text-red-300 font-semibold text-sm">Something went wrong</p>
          <p className="text-red-400/70 text-xs mt-1">{this.state.error.message}</p>
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
