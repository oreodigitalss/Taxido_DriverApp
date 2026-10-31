import Echo from 'laravel-echo';
import { getValue } from './localstorage';
import { URL } from '../api/config';

// @ts-ignore
const PusherClient =
  require('pusher-js/react-native').Pusher ||
  require('pusher-js/react-native');

PusherClient.logToConsole = __DEV__;

// @ts-ignore
window.Pusher = PusherClient;

let echoInstance: any = null;
let cachedToken: string | null = null;

const PUSHER_KEY = '32b114c5d9838fa6aa28';

const getEchoInstance = async () => {
  if (!PUSHER_KEY.trim()) {
    console.warn(
      '[Echo] Realtime is disabled: configure PUSHER_KEY in src/utils/echo.ts.',
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
      console.error('Error disconnecting stale Echo instance:', e);
    }
  }

  cachedToken = token;

  echoInstance = new Echo({
    broadcaster: 'pusher',
    key: PUSHER_KEY,
    cluster: 'ap2',
    forceTLS: true,
    disableStats: true,
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

  const connection = echoInstance.connector?.pusher?.connection;

  if (connection) {
    connection.bind('state_change', (states: any) => {
      console.log(
        `[Echo] Connection state changed from ${states.previous} to ${states.current}`,
      );
    });

    connection.bind('error', (err: any) => {
      console.error('[Echo] Connection error:', err);
    });

    connection.bind('connected', () => {
      console.log('[Echo] Connected! Socket ID:', echoInstance?.socketId());
    });

    connection.bind('disconnected', () => {
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

  cachedToken = null;
};

export default getEchoInstance;