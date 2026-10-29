import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { navigate } from './navigationService';

export const Verificationhelper = () => {
    const { selfDriver } = useSelector((state: any) => state.account);

    useEffect(() => {
        if (!selfDriver?.id) return;

        // Verification check is now handled via selfDriverData or WebSockets
        // For now, we ensure the user is redirected if not verified based on local state
        if (selfDriver?.is_verified == 0) {
            navigate('Verification');
        } else if (selfDriver?.is_verified == 1) {
            const { navigationRef } = require('./navigationService');
            if (navigationRef.isReady() && navigationRef.getCurrentRoute()?.name === 'Verification') {
                navigate('TabNav');
            }
        }
    }, [selfDriver?.is_verified, selfDriver?.id]);

    return null;
};
