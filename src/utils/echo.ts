import Echo from 'laravel-echo';
import { getValue } from './localstorage';
import { URL } from '../api/config';


// @ts-ignore
const PusherClient = require('pusher-js/react-native').Pusher || require('pusher-js/react-native');

PusherClient.logToConsole = true;

// @ts-ignore
window.Pusher = PusherClient;

let echoInstance: any = null;
let cachedToken: string | null = null;

// Set these to the Pusher/Reverb app credentials used by the Laravel backend.
// Leaving them empty keeps Echo from passing the template values below to URL().
const PUSHER_KEY = 'yrtdtapyoopzf7p46ved';
const PUSHER_HOST = 'rydap.com';

const getEchoInstance = async () => {
  if (!PUSHER_KEY.trim() || !PUSHER_HOST.trim()) {
    console.warn(
      '[Echo] Realtime is disabled: configure PUSHER_KEY and PUSHER_HOST in src/utils/echo.ts.',
    );
    return null;
  }

  const token = await getValue('token');

  if (echoInstance && cachedToken === token) {
    return echoInstance;
  }

  if (echoInstance) {
    try {
      echoInstance.disconnect();
    } catch (e) {
      console.error("Error disconnecting stale Echo instance:", e);
    }
  }

  cachedToken = token;

  echoInstance = new Echo({
    broadcaster: 'pusher',
    key: PUSHER_KEY,
    wsHost: PUSHER_HOST,
    wsPort: 443,
    wssPort: 443,
    forceTLS: true,
    disableStats: true,
    cluster: 'mt1',
    enabledTransports: ['ws', 'wss'],
    Pusher: PusherClient,
    authEndpoint: `${URL}/api/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  });

  if (echoInstance.connector.pusher) {
    echoInstance.connector.pusher.connection.bind('state_change', (states: any) => {
      console.log(`[Echo] Connection state changed from ${states.previous} to ${states.current}`);
    });
    echoInstance.connector.pusher.connection.bind('error', (err: any) => {
      console.error('[Echo] Connection error:', err);
      if (err?.error?.data?.code === 4004) {
        console.error('[Echo] Critical: Pusher app not found or wrong credentials.');
      }
    });
    echoInstance.connector.pusher.connection.bind('connected', () => {
      console.log('[Echo] Connected! Socket ID:', echoInstance.socketId());
    });
    echoInstance.connector.pusher.connection.bind('disconnected', () => {
      console.log('[Echo] Disconnected.');
    });
  }

  return echoInstance;
};

export const disconnectEcho = () => {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
};

export default getEchoInstance;
