import { useRef, useCallback } from 'react';
import { ENABLE_TAB_GUARD } from '../../api/config';

/**
 * useTabGuard - Prevents rapid navigation between tabs which triggers multiple backend requests.
 * Uses a global cooldown and throttles notifications to avoid UI spam.
 */
const useTabGuard = (minInterval: number = 1000) => {

  const lastTapRef = useRef<number>(0);
  const lastNotifyRef = useRef<number>(0);

  const guardedPress = useCallback((tabKey: string, callback: () => void) => {
    const now = Date.now();

    // Check if guard is enabled globally
    if (!ENABLE_TAB_GUARD) {
      callback();
      return;
    }

    // Global cooldown to stop any tab activity if too soon
    if (now - lastTapRef.current < minInterval) {
      return; // blocked silently
    }


    lastTapRef.current = now;
    callback();
  }, [minInterval]);

  return { guardedPress };
};

export default useTabGuard;
