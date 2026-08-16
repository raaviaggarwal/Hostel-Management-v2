import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const ThemeContext = createContext({ mode: 'light', toggleTheme: () => {} })

const THEME_KEY = 'theme'

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem(THEME_KEY) || 'light')

  useEffect(() => {
    localStorage.setItem(THEME_KEY, mode)
    document.documentElement.setAttribute('data-theme', mode)
  }, [mode])

  const toggleTheme = useCallback(() => {
    setMode((current) => (current === 'light' ? 'dark' : 'light'))
  }, [])

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
