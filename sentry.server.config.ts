import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,

  tracesSampleRate: 0.1,

  beforeSend(event) {
    // Never send message content or student PII
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((bc) => {
        if (bc.data) {
          delete bc.data.body
          delete bc.data.response_body
        }
        return bc
      })
    }
    // Strip request body from event
    if (event.request) {
      delete event.request.data
    }
    return event
  },
})
