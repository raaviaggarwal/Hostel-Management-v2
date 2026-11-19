const LOG_LEVEL = process.env.LOG_LEVEL || 'info'

const levels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const currentLevel = levels[LOG_LEVEL] ?? levels.info

function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta,
  }
  return JSON.stringify(logEntry)
}

function shouldLog(level) {
  return levels[level] >= currentLevel
}

export const logger = {
  debug: (message, meta) => {
    if (shouldLog('debug')) console.debug(formatLog('debug', message, meta))
  },
  info: (message, meta) => {
    if (shouldLog('info')) console.info(formatLog('info', message, meta))
  },
  warn: (message, meta) => {
    if (shouldLog('warn')) console.warn(formatLog('warn', message, meta))
  },
  error: (message, meta) => {
    if (shouldLog('error')) console.error(formatLog('error', message, meta))
  },
}