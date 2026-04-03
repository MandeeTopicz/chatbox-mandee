type LogLevel = 'info' | 'warn' | 'error'

interface LogMeta {
  route?: string
  userId?: string
  data?: Record<string, unknown>
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  route?: string
  event: string
  userId?: string
  data?: Record<string, unknown>
}

function emit(level: LogLevel, event: string, meta?: LogMeta) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...(meta?.route && { route: meta.route }),
    ...(meta?.userId && { userId: meta.userId }),
    ...(meta?.data && { data: meta.data }),
  }

  const line = JSON.stringify(entry)

  switch (level) {
    case 'error':
      console.error(line)
      break
    case 'warn':
      console.warn(line)
      break
    default:
      console.log(line)
  }
}

export const logger = {
  info(event: string, meta?: LogMeta) {
    emit('info', event, meta)
  },
  warn(event: string, meta?: LogMeta) {
    emit('warn', event, meta)
  },
  error(event: string, meta?: LogMeta) {
    emit('error', event, meta)
  },
}
