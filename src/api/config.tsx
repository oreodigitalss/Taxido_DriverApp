// Production HTTPS host. Android release builds block cleartext HTTP, so a
// local development URL must only be selected for a debug build.
// Keep the API host aligned with Taxido_User; the www host does not expose the same API routes.
export const URL = 'https://rydap.com'
export const API_HOST_HEADER = undefined

export const ENABLE_GLOBAL_RATE_LIMIT = true
export const ENABLE_ENDPOINT_THROTTLE = false
export const ENABLE_TAB_GUARD = true
