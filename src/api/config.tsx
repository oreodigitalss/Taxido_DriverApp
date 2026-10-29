// Use the www host: it serves the API routes and has a valid TLS certificate.
// Android debug builds reach the host's local Laravel server through `adb reverse`.
export const URL = __DEV__ ? "http://localhost:8000" : "https://www.rydap.com";
export const API_HOST_HEADER = undefined

export const ENABLE_GLOBAL_RATE_LIMIT = true
export const ENABLE_ENDPOINT_THROTTLE = false
export const ENABLE_TAB_GUARD = true
