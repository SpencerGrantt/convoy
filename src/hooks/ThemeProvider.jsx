import { useState } from 'react'
import { ThemeContext } from './ThemeContext'

const THEME_KEY = 'vantar_theme'

// Only tracks/persists the user's preference — it does NOT touch the DOM.
// Applying it to <html> is done by AppRoutes (App.jsx), and only while the
// authenticated app shell (sidebar/nav) is showing, so signed-out surfaces
// (landing, login, onboarding) always render dark regardless of what a
// signed-in user last picked.
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => (localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'))

  function setTheme(next) {
    setThemeState(next)
    localStorage.setItem(THEME_KEY, next)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
