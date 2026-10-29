/**
 * globalRateLimiter - Prevents the app from sending too many requests 
 * across the whole application in a short burst.
 * 
 * Limit: 20 requests per 10 seconds.
 * Cooldown: Once the burst limit is hit, the app is locked for 5 seconds to allow the server to breathe.
 */

let requestTimestamps: number[] = [];
let lockUntilUnix: number = 0;

const LIMIT = 35;
const WINDOW_MS = 10000;
const COOLDOWN_ON_LIMIT_HIT = 7000;

export const isGlobalRateLimited = (): boolean => {
  const now = Date.now();

  // 1. If we are currently in a sticky cooldown lock, block everything
  if (now < lockUntilUnix) {
    return true;
  }

  // 2. Clean up old timestamps outside the 10s window
  requestTimestamps = requestTimestamps.filter(timestamp => now - timestamp < WINDOW_MS);

  // LIVE MONITORING: Log counts for the user

  // 3. If we just hit the 20-request burst limit
  if (requestTimestamps.length >= LIMIT) {
    console.warn(`[RateLimit] CRITICAL: 20-request burst limit HIT! Locking for 5s...`);
    // Lock the global API for 5 seconds to stop the flood immediately
    lockUntilUnix = now + COOLDOWN_ON_LIMIT_HIT;
    return true;
  }

  // 4. Record current request timestamp
  requestTimestamps.push(now);
  return false;
};

export const resetRateLimit = () => {
  requestTimestamps = [];
  lockUntilUnix = 0;
  console.log('[RateLimit] Global limit reset.');
};
