import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 m-4">
          <p className="text-red-700 font-semibold text-sm">Something went wrong</p>
          <p className="text-red-500 text-xs mt-1">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-3 text-xs text-red-600 underline"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
