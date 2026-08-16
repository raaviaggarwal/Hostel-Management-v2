import { createContext, useContext } from 'react'

export const ThemeContext = createContext({ mode: 'light', toggleTheme: () => {} })

export function useTheme() {
  return useContext(ThemeContext)
}
