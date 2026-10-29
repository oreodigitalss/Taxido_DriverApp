import Geolocation from '@react-native-community/geolocation';
import { requestLocationPermission } from './permissionHelper';
import { driversStatus } from '../../api/services/zoneService';

let locationWatchId: any = null;
let lastCoords: any = null;
let totalDistanceCovered = 0;
let apiUpdateCount = 0;
let isTracking = false;

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export const startLiveLocation = async (driverId: number, selfDriver: any) => {
    // Prevent multiple watchers
    if (locationWatchId !== null) {
        Geolocation.clearWatch(locationWatchId);
        locationWatchId = null;
    }

    isTracking = true;

    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
        isTracking = false;
        return false;
    }

    const getInitialLocation = () =>
        new Promise((resolve, reject) => {
            Geolocation.getCurrentPosition(
                resolve,
                (error) => {
                    Geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: false,
                        timeout: 10000,
                        maximumAge: 10000,
                    });
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0,
                }
            );
        });

    try {
        const position: any = await getInitialLocation();
        if (!isTracking) return false;

        const { latitude, longitude } = position.coords;
        lastCoords = { latitude, longitude };
        totalDistanceCovered = 0;
        apiUpdateCount = 1;

        // Update location via API
        await driversStatus({
            is_online: 1,
            location: {
                lat: latitude,
                lng: longitude
            }
        } as any);

    } catch (error) {
        console.log("Error getting initial location or updating status:", error);
        return false;
    }

    if (!isTracking) return false;
    locationWatchId = Geolocation.watchPosition(
        async (position) => {
            if (!isTracking) return;

            const { latitude, longitude } = position.coords;

            if (!lastCoords) {
                lastCoords = { latitude, longitude };
                try {
                    await driversStatus({
                        is_online: 1,
                        location: {
                            lat: latitude,
                            lng: longitude
                        }
                    } as any);
                    apiUpdateCount++;
                } catch (error) {
                }
                return;
            }

            const distanceMoved = haversineDistance(
                lastCoords.latitude,
                lastCoords.longitude,
                latitude,
                longitude
            );

            totalDistanceCovered += distanceMoved;

            // Update every 100 meters as requested
            if (distanceMoved >= 100) {
                if (!isTracking) return;
                lastCoords = { latitude, longitude };
                try {
                    await driversStatus({
                        is_online: 1,
                        location: {
                            lat: latitude,
                            lng: longitude
                        }
                    } as any);
                    apiUpdateCount++;
                } catch (error) {
                }
            }
        },
        (error) => {
        },
        {
            enableHighAccuracy: true,
            distanceFilter: 50, // Watch position distance filter
            interval: 10000,
            fastestInterval: 5000,
            showsBackgroundLocationIndicator: true,
        }
    );

    return true;
};


export const stopLiveLocation = () => {
    isTracking = false;
    if (locationWatchId !== null) {
        Geolocation.clearWatch(locationWatchId);
        locationWatchId = null;
    }
    lastCoords = null;
    totalDistanceCovered = 0;
    apiUpdateCount = 0;
};



