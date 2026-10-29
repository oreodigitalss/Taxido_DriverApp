import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  View,
  Image,
  Text,
  TouchableOpacity,
  Vibration,
  BackHandler,
  Linking,
  InteractionManager,
  Modal,
  ActivityIndicator,
  NativeModules,
  AppState,
} from 'react-native'
import appColors from '../../../theme/appColors'
import {
  fontSizes,
  windowHeight,
  windowWidth,
} from '../../../theme/appConstant'
import Icons from '../../../utils/icons/icons'
import { useDispatch, useSelector } from 'react-redux'
import Images from '../../../utils/images/images'
import appFonts from '../../../theme/appFonts'
import useSmartLocation from '../../../commonComponents/helper/locationHelper'
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native'
import { Button, notificationHelper } from '../../../commonComponents'
import {
  startLiveLocation,
  stopLiveLocation,
} from '../../../commonComponents/helper/liveLocationHelper'
import {
  currentZone,
  dashBoardData,
  driversStatus,
  fleetWalletData,
  rejectRequestValue,
  rideDataGets,
  rideRequestDataGet,
  selfDriverData,
  sosAlertGet,
  sosDataGet,
  syncCurrentRideRequestData,
  taxidosettingDataGet,
  vehicleData,
  walletData,
} from '../../../api/store/action'
// import Sound from 'react-native-sound' (Removed due to RN 0.82 compatibility issues)
import { MapScreen } from '../mapScreen'
import BottomSheet, {
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetView,
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet'
import { UpcomingRide } from '../component'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useValues } from '../../../utils/context'
import { TourGuideZone, useTourGuideController } from 'rn-tourguide'
import ContentLoader, { Rect } from 'react-content-loader/native'
import { getValue, setValue } from '../../../utils/localstorage'
import notifee, { AndroidImportance } from '@notifee/react-native'
import getEchoInstance from '../../../utils/echo'
import styles from './styles'
import { AppDispatch } from '../../../api/store'
import { LowBalance } from '../../../commonComponents/lowBalance'

try {
  NativeModules.RNSound.setCategory('Playback', true)
} catch (e) {
  console.error('Failed to set Sound category:', e)
}

const PulseCircle = ({ delay = 0, color }: any) => {
  const scale = useRef(new Animated.Value(1)).current
  const opacity = useRef(new Animated.Value(0.6)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 2,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(scale, {
          toValue: 1,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }, [delay])

  return (
    <Animated.View
      style={[
        styles.pulse,
        {
          backgroundColor: color,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  )
}

interface MapRef {
  focusToCurrentLocation: () => void
}

export function Home() {
  const { currentLatitude, currentLongitude } = useSmartLocation()
  const { selfDriver } = useSelector((state: any) => state.account)
  const char = selfDriver?.name ? selfDriver?.name.charAt(0) : ''
  const { zoneValue } = useSelector((state: any) => state.zoneUpdate)
  const driverId = selfDriver?.id
  const [isOnline, setIsOnline] = useState(false)
  const { taxidoSettingData, translateData } = useSelector(
    (state: any) => state.setting,
  )
  const { sosData, loading: sosLoading } = useSelector(
    (state: any) => state.sos,
  )
  const { bidValue } = useSelector((state: any) => state.bid)

  const upcomingRideRef = useRef(null)
  const [selectedRide, setSelectedRide] = useState(null)
  const [rides, setRides] = useState<any>([])
  const dispatch = useDispatch<AppDispatch>()
  const { navigate } = useNavigation<any>()
  const navigation = useNavigation<any>()
  const [status, setStatus] = useState<'online' | 'offline'>('online')
  const bottomSheetModalRef = useRef<BottomSheetModal>(null)
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)
  const [lastRideRequestId, setLastRideRequestId] = useState<string | null>(
    null,
  )
  const [selectedRideIdForCancel, setSelectedRideIdForCancel] = useState<
    string | null
  >(null)
  const [sheetManuallyClosed, setSheetManuallyClosed] = useState(false)
  const [totalOnlineSeconds, setTotalOnlineSeconds] = useState(0)
  const [readRideRequests, setReadRideRequests] = useState<Set<string>>(
    new Set(),
  )
  const bottomSheetOfflineRef = useRef<BottomSheetModal>(null)
  const [isBottomSheetOfflineOpen, setIsBottomSheetOfflineOpen] =
    useState(false)
  const [offlineloading, setOfflineLoading] = useState(false)
  const [isAmountVisible, setIsAmountVisible] = useState(false)
  const [viewMode, setViewMode] = useState<'amount' | 'time'>('amount')
  const bottomSheetSOSRef = useRef<BottomSheetModal>(null)
  const [isBottomSheetSOSOpen, setIsBottomSheetSOSOpen] = useState(false)
  const [location, setLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)
  const { isDark, viewRtlStyle, rtl } = useValues()
  const { dashBoardList } = useSelector((state: any) => state.dashboard)
  const TodayIncome = `${zoneValue?.currency_symbol} ${
    dashBoardList?.day?.dayRevenues?.revenues?.slice(-1)[0]
  }`
  const { start, canStart, stop } = useTourGuideController()
  const [noservice, setNodervice] = useState<boolean>(false)
  const mapRef = useRef<MapRef>(null)
  const isFocused = useIsFocused()
  const bottomSheetRef = useRef<any>(null)
  const cancelbottomSheetRef = useRef<BottomSheetModal>(null)
  const [cancel, setCancel] = useState<boolean>(false)
  const snapPoints = ['30%']
  const isRingtonePlayingRef = useRef<boolean>(false)
  const soundInstanceRef = useRef<any>(null)
  const [isBottomSheetCancelOpen, setIsBottomSheetCancelOpen] =
    useState<boolean>(false)
  const [on, SetOn] = useState(false)
  const [hasShownTour, setHasShownTour] = useState<boolean>(false)
  const [loadingId, setLoadingId] = useState<null>(null)
  const [showOnline, setShowOnline] = useState<boolean>(true)
  const [mapLoaded, setMapLoaded] = useState<boolean>(false)
  const [mapKey, setMapKey] = useState<number>(0)
  const currentRideIdsRef = useRef<string[]>([])
  const shouldPlayRef = useRef<boolean>(false)
  const soundKeyRef = useRef<number | null>(null)
  const nextSoundKeyRef = useRef<number>(1000)
  const hasSyncedRef = useRef<boolean>(false)
  const playNotificationSoundRef = useRef<() => void>(() => {})
  const isBottomSheetOpenRef = useRef<boolean>(false)
  const appStateRef = useRef(AppState.currentState)

  const maskValue = (value: any) => {
    if (value == null || value === 0) {
      return '*.**'
    }
    const strValue = value.toString()
    return strValue
      .split('')
      .map((char: string) => (char === '.' ? '.' : '*'))
      .join('')
  }

  const lastRevenue =
    dashBoardList?.day?.dayRevenues?.revenues?.length > 0
      ? dashBoardList.day.dayRevenues.revenues.slice(-1)[0]
      : null

  const maskedAmount = `${zoneValue?.currency_symbol ?? ''} ${maskValue(
    lastRevenue,
  )}`

  useEffect(() => {
    if (isFocused && !hasShownTour) {
      start()
      setHasShownTour(true)
    } else if (!isFocused) {
      stop()
    }
  }, [isFocused])

  // Ensure map loads properly on first open
  useEffect(() => {
    const timer = setTimeout(() => {
      setMapLoaded(true)
    }, 100)

    // Fallback to ensure map loads even if initial load fails
    const fallbackTimer = setTimeout(() => {
      setMapLoaded(true)
    }, 500)

    return () => {
      clearTimeout(timer)
      clearTimeout(fallbackTimer)
    }
  }, [])

  const lastCoords = useRef<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  })

  const isFetching = useRef(false)

  const hasMovedEnough = (lat1, lng1, lat2, lng2) => {
    if (lat1 === null || lng1 === null) return true

    const toRad = x => (x * Math.PI) / 180
    const R = 6371e3

    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)

    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return distance > 50 // meters threshold
  }

  const handleCheckAgain = useCallback(
    async (force = false) => {
      if (!currentLatitude || !currentLongitude) return

      // prevent parallel calls
      if (isFetching.current) return

      // prevent unnecessary calls (same / small movement) unless forced
      if (
        !force &&
        !hasMovedEnough(
          lastCoords.current.lat,
          lastCoords.current.lng,
          currentLatitude,
          currentLongitude,
        )
      ) {
        return
      }

      isFetching.current = true

      try {
        const res: any = await dispatch(
          currentZone({ lat: currentLatitude, lng: currentLongitude }),
        ).unwrap()

        // Only update service availability if we got a definitive response
        if (res && res.hasOwnProperty('id')) {
          setNodervice(!res.id)
        }

        lastCoords.current = {
          lat: currentLatitude,
          lng: currentLongitude,
        }
      } catch (err) {
        // If it's a temporary error (like 429 Too Many Attempts),
        // we don't want to show the "No Service" modal.
      } finally {
        isFetching.current = false
      }
    },
    [currentLatitude, currentLongitude, dispatch],
  )

  useEffect(() => {
    handleCheckAgain()
  }, [currentLatitude, currentLongitude, handleCheckAgain])

  useEffect(() => {
    const showTourIfFirstTime = async () => {
      const hasSeenTour = await getValue('hasSeenTour')
      if (!hasSeenTour && canStart) {
        InteractionManager.runAfterInteractions(() => {
          requestAnimationFrame(() => {
            setTimeout(async () => {
              if (canStart) {
                start()
                await setValue('hasSeenTour', 'true')
              }
            }, 500)
          })
        })
      }
    }
    if (noservice == false) {
      showTourIfFirstTime()
    }
  }, [canStart])

  const fetchStoredLocation = async () => {
    try {
      const lat = await AsyncStorage.getItem('user_latitude')
      const lng = await AsyncStorage.getItem('user_longitude')
      if (lat && lng) {
        setLocation({
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
        })
      } else {
        setLocation(null)
      }
    } catch (error) {}
  }

  useFocusEffect(
    useCallback(() => {
      fetchStoredLocation()
    }, []),
  )

  useEffect(() => {
    if (!isFocused) return
    const backAction = () => {
      bottomSheetRef.current?.expand()
      return true
    }
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    )
    return () => backHandler.remove()
  }, [isFocused])

  const handleExit = () => {
    bottomSheetRef.current?.close()

    setTimeout(() => {
      BackHandler.exitApp()
    }, 150)
  }

  const handleCloseSheet = () => {
    bottomSheetRef.current?.close()
  }

  const handleCloseSheet1 = () => {
    cancelbottomSheetRef.current?.close()
    setIsBottomSheetCancelOpen(false)
  }

  const handleRideRejection = async (rideId: any) => {
    if (!rideId) return

    try {
      // Dispatch API rejection and clear sound/UI
      onRideDeclined()
      const payload: any = { ride_request_id: rideId }
      dispatch(rejectRequestValue(payload))
        .unwrap()
        .then(() => console.log('API Reject dispatched successfully'))
        .catch(err => console.error('API Reject dispatch error:', err))
    } catch (error) {
      console.error('Rejection Error:', error)
      notificationHelper('', 'Error updating ride status', 'error')
    }
  }

  const handleConfirmCancel = async () => {
    bottomSheetRef.current?.close()

    const rideId =
      selectedRideIdForCancel || (upcomingRideRef.current as any)?.getRideId()
    if (rideId) {
      handleRideRejection(rideId)
    } else {
      console.warn('No rideId found to cancel.')
    }

    setIsBottomSheetCancelOpen(false)
    cancelbottomSheetRef.current?.close()
  }

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        if (!selfDriver?.id) return
        const isOnlineStatus = selfDriver?.is_online
        setStatus(isOnlineStatus == 1 ? 'online' : 'offline')
      } catch (error) {}
    }

    fetchStatus()
  }, [selfDriver?.id, selfDriver?.is_online])

  const handlePresentModalPress = useCallback(() => {
    if (isBottomSheetOpen) {
      bottomSheetModalRef.current?.close()
      setIsBottomSheetOpen(false)
      setSheetManuallyClosed(true) // Mark that sheet was manually closed
    } else {
      bottomSheetModalRef.current?.present()
      setIsBottomSheetOpen(true)
      setSheetManuallyClosed(false) // Reset when manually opened
    }
  }, [isBottomSheetOpen])

  const statusColors = {
    online: {
      outer: appColors.primary,
      inner: appColors.primary,
      pulse1: appColors.primaryLight,
      pulse2: appColors.value,
      label: 'Online',
      icon: <Icons.Online />,
    },
    offline: {
      outer: appColors.brightRed,
      inner: appColors.vividRed,
      pulse1: appColors.darkCrimson,
      pulse2: appColors.roseTint,
      label: 'Offline',
      icon: <Icons.Stop />,
    },
  }
  const nextStatus = status === 'online' ? 'offline' : 'online'
  const current = statusColors[nextStatus]
  const [lowBalance, setLowBalance] = useState<boolean>(false)
  useEffect(() => {
    if (!taxidoSettingData || Object.keys(taxidoSettingData).length == 0) {
      dispatch(taxidosettingDataGet())
      dispatch(selfDriverData())
    }
  }, [taxidoSettingData])

  const lastGlobalFetchRef = useRef<number>(0)

  useEffect(() => {
    dispatch(rideDataGets())
    dispatch(vehicleData())
    if (selfDriver?.role == 'fleet_manager') {
      dispatch(fleetWalletData())
    } else {
      dispatch(walletData())
    }
    const unit = zoneValue?.distance_type
    const zoneId = zoneValue?.id
    const driver_id = ''
    dispatch(dashBoardData({ unit, zoneId, driver_id }))
  }, [])
  const navigateFromSyncResponse = useCallback(
    (rawData: any) => {
      console.log(
        '[SyncRide][Navigate] 🔍 Raw data:',
        JSON.stringify(rawData, null, 2),
      )

      if (!rawData) {
        console.log(
          '[SyncRide][Navigate] ❌ rawData is null/undefined — aborting',
        )
        return
      }

      // ── Normalise: API returns an array [ { id, type:"request", ... } ]
      //    OR a single object. Always work with the first/only ride item.
      const item: any = Array.isArray(rawData)
        ? rawData[0] // array shape: take first element
        : rawData?.data ?? rawData // object shape: unwrap .data if present

      if (!item) {
        console.log(
          '[SyncRide][Navigate] ⚠️  No item found after normalise — empty array or null',
        )
        return
      }

      console.log(
        '[SyncRide][Navigate] 📦 Normalised item:',
        JSON.stringify(item, null, 2),
      )

      // ── Extract state — `type` field on the item is the ride state ────────
      // The API uses "type" (e.g. "request", "timeout", "cancelled")
      // Some backends may also use current_state / status as a string.
      const rawState =
        item?.type ?? item?.current_state ?? item?.ride?.status ?? item?.status

      // Reject boolean values (common API envelope field)
      const state = typeof rawState === 'string' ? rawState : null

      console.log(
        '[SyncRide][Navigate] 🔑 Extracted state:',
        state,
        '| raw:',
        rawState,
        '| type:',
        typeof rawState,
      )

      if (!state) {
        console.log(
          '[SyncRide][Navigate] ⚠️  No valid string state found — staying on Home',
        )
        return
      }

      // ── The item itself IS the ride object ───────────────────────────────
      const ride = item?.ride ?? item

      console.log(
        '[SyncRide][Navigate] 🚗 Ride id:',
        ride?.id,
        '| Ride type:',
        ride?.type,
      )
      console.log(
        '[SyncRide][Navigate] 🔀 Matching switch case for state:',
        `"${state}"`,
      )

      switch (state) {
        case 'pending':
        case 'request': {
          if (!ride) {
            console.log(
              '[SyncRide][Navigate] ⚠️  No ride object for pending/request — aborting',
            )
            break
          }

          console.log(
            '[SyncRide][Navigate] ✅ CASE: pending/request — injecting ride & opening sheet',
          )

          // 1. Inject the ride into state so the rides-watcher useEffect fires
          setRides((prev: any[]) => {
            const alreadyExists = prev.some((r: any) => r.id === ride.id)
            if (alreadyExists) {
              console.log(
                '[SyncRide][Navigate] ℹ️  Ride already in list, skipping inject',
              )
              return prev
            }
            console.log(
              '[SyncRide][Navigate] ➕ Added ride to list, new length:',
              prev.length + 1,
            )
            return [...prev, ride]
          })

          // 2. Reset lastRideRequestId so the rides-watcher treats this as brand-new
          setLastRideRequestId(null)

          // 3. After a delay (ref is mounted), play sound and open the sheet
          //    NOTE: present() must be called imperatively OUTSIDE any setState callback.
          setTimeout(() => {
            console.log(
              '[SyncRide][Navigate] ⏱️  Timeout fired — opening BottomSheet',
            )
            console.log(
              '[SyncRide][Navigate] 📋 bottomSheetModalRef.current:',
              !!bottomSheetModalRef.current,
            )
            console.log(
              '[SyncRide][Navigate] 📋 isBottomSheetOpenRef.current:',
              isBottomSheetOpenRef.current,
            )

            try {
              playNotificationSoundRef.current()
              console.log(
                '[SyncRide][Navigate] 🔔 Notification sound triggered',
              )
            } catch (soundErr) {
              console.log('[SyncRide][Navigate] ⚠️  Sound error:', soundErr)
            }

            // Call present() imperatively — NEVER inside a setState updater function
            if (!isBottomSheetOpenRef.current) {
              console.log(
                '[SyncRide][Navigate] 📲 Calling bottomSheetModalRef.current.present()',
              )
              bottomSheetModalRef.current?.present()
              isBottomSheetOpenRef.current = true
              setIsBottomSheetOpen(true)
              setSheetManuallyClosed(false)
            } else {
              console.log(
                '[SyncRide][Navigate] ℹ️  BottomSheet already open, skipping present()',
              )
            }
          }, 800)
          break
        }

        case 'accepted':
          console.log(
            '[SyncRide][Navigate] ✅ CASE: accepted — navigating to AcceptFare',
          )
          if (ride?.id || rawData?.ride_id) {
            navigate('AcceptFare', {
              ride_Id: ride?.id ?? rawData?.ride_id,
              ride_Details: ride,
            })
          }
          break

        case 'otp':
        case 'otp_verification':
          console.log(
            '[SyncRide][Navigate] ✅ CASE: otp — navigating to OtpRide',
          )
          if (ride) {
            navigate('OtpRide', { ride })
          }
          break

        case 'active':
        case 'started':
        case 'on_ride':
          console.log(
            '[SyncRide][Navigate] ✅ CASE: active — navigating to ActiveRide',
          )
          if (ride) {
            navigate('ActiveRide', { ride })
          }
          break

        default:
          console.log(
            '[SyncRide][Navigate] ⚠️  Unknown state "' +
              state +
              '" — no navigation, staying on Home',
          )
          break
      }
    },
    [navigate, setRides],
  )

  /**
   * syncCurrentRide
   * Calls the sync API and handles the response. Guards:
   *  - Only fires once per app-open (hasSyncedRef)
   *  - Requires a logged-in driver (driverId)
   */
  const syncCurrentRide = useCallback(
    async (trigger: string = 'unknown') => {
      if (hasSyncedRef.current) {
        console.log(
          '[SyncRide] ⏭️  Skipped — already synced this session. Trigger:',
          trigger,
        )
        return
      }
      if (!driverId) {
        console.log(
          '[SyncRide] ⏭️  Skipped — no driverId yet. Trigger:',
          trigger,
        )
        return
      }

      hasSyncedRef.current = true
      console.log('─────────────────────────────────────────────────────')
      console.log('[SyncRide] 🚀 Calling /api/driver/sync-current-ride-request')
      console.log('[SyncRide] 📋 Trigger :', trigger)
      console.log('[SyncRide] 👤 Driver ID:', driverId)
      console.log('─────────────────────────────────────────────────────')

      try {
        const res: any = await dispatch(syncCurrentRideRequestData()).unwrap()

        console.log('─────────────────────────────────────────────────────')
        console.log('[SyncRide] ✅ API Response received')
        console.log(
          '[SyncRide] 📦 Full Response:',
          JSON.stringify(res, null, 2),
        )
        console.log('[SyncRide] 🔑 current_state :', res?.current_state)
        console.log('[SyncRide] 🔑 status        :', res?.status)
        console.log('[SyncRide] 🔑 ride.status   :', res?.ride?.status)
        console.log(
          '[SyncRide] 🚗 ride data     :',
          JSON.stringify(res?.ride ?? res, null, 2),
        )
        console.log('─────────────────────────────────────────────────────')

        navigateFromSyncResponse(res)
      } catch (err: any) {
        console.log('─────────────────────────────────────────────────────')
        console.log('[SyncRide] ❌ API Call Failed')
        console.log('[SyncRide] 🔴 Error         :', err?.message ?? err)
        console.log(
          '[SyncRide] 🔴 Error Detail  :',
          JSON.stringify(err, null, 2),
        )
        console.log('─────────────────────────────────────────────────────')
      }
    },
    [driverId, dispatch, navigateFromSyncResponse],
  )

  // ─── Trigger sync once on mount (handles quit-mode / cold-start) ──────────
  useEffect(() => {
    // Small delay to ensure navigation is ready and Redux is hydrated
    const timer = setTimeout(() => {
      syncCurrentRide('cold-start / mount')
    }, 800)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId])

  // ─── Trigger sync when app comes to foreground from background ────────────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        // App just came to foreground — reset the guard so it syncs once more
        hasSyncedRef.current = false
        syncCurrentRide('background → foreground')
      }
      appStateRef.current = nextState
    })
    return () => subscription.remove()
  }, [syncCurrentRide])
  const gotoRide = (ride: any) => {
    stopNotificationSound()
    if (ride?.service_category?.service_category_type === 'rental') {
      navigate('RentalDetails', { ride })
    } else {
      navigation.navigate('Ride', { ride })
    }
    bottomSheetModalRef.current?.close()
    setIsBottomSheetOpen(false)
  }

  const gotoInfo = (ride: any) => {
    if (
      ride?.service_category?.service_category_type === 'schedule' ||
      ride?.service?.service_type === 'freight' ||
      ride?.service?.service_type === 'parcel' ||
      ride?.service_category?.service_category_type === 'package'
    ) {
      navigate('RideInfo', { ride })
    } else if (ride?.service_category?.service_category_type === 'rental') {
      navigate('RentalDetails', { ride })
    }
  }

  useEffect(() => {
    const zone_id = zoneValue?.id
    if (zone_id && isFocused && isOnline) {
      const intervalId = setInterval(() => {
        dispatch(rideRequestDataGet(zone_id))
      }, 20000)
      return () => clearInterval(intervalId)
    }
  }, [dispatch, zoneValue, isFocused, isOnline])

  const selectDriver = (ride: any) => {
    setSelectedRide(ride)
  }

  const onRideDeclined = (rideId?: any) => {
    if (rideId) {
      setRides((prev: any[]) => prev.filter(r => r.id !== rideId))
    }
    if (rides?.length <= 1) {
      stopNotificationSound()
      bottomSheetModalRef.current?.close()
    }
  }
  const walletBalance = Number(selfDriver?.wallet_balance ?? 0)
  const minWalletBalance = Number(
    taxidoSettingData?.cabbooking_values?.wallet?.driver_min_wallet_balance ??
      0,
  )

  useFocusEffect(
    useCallback(() => {
      const fetchOnlineStatus = async () => {
        if (!selfDriver?.id) {
          setIsOnline(false)
          return
        }

        if (
          selfDriver?.wallet_balance < 0 &&
          taxidoSettingData?.cabbooking_values?.activation
            ?.allow_negative_balance === 0
        ) {
          setLowBalance(true)
          notificationHelper('', translateData?.lowBalance, 'error')
          setIsOnline(false)
          return
        } else if (walletBalance < minWalletBalance) {
          setLowBalance(true)
          notificationHelper(
            '',
            translateData?.insufficientWalletBalance,
            'error',
          )
          setIsOnline(false)
        }

        const online = selfDriver?.is_online === 1
        setIsOnline(online)

        if (online) {
          startLiveLocation(selfDriver.id, selfDriver)
        } else {
          stopLiveLocation()
        }
      }

      fetchOnlineStatus()
    }, [
      selfDriver?.id,
      selfDriver?.wallet_balance,
      selfDriver?.is_online,
      translateData,
    ]),
  )
  const getTodayDateStr = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  const stopNotificationSound: any = useCallback(() => {
    shouldPlayRef.current = false
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = null

    if (soundKeyRef.current !== null) {
      const key = soundKeyRef.current
      NativeModules.RNSound.stop(key, () => {
        NativeModules.RNSound.release(key)
      })
      soundKeyRef.current = null
    }

    Vibration.cancel()
    isRingtonePlayingRef.current = false
  }, [])

  const playQuickSound = () => {
    stopNotificationSound()
    const key = nextSoundKeyRef.current++
    const filename = 'status' // Native resource name (lowercase, no extension)

    if (!NativeModules.RNSound) {
      console.error('RNSound native module not found')
      return
    }

    try {
      NativeModules.RNSound.prepare(filename, key, {}, (error: any) => {
        if (error) {
          console.error('Status sound loading error:', error)
          return
        }
        NativeModules.RNSound.setVolume(key, 1.0, 1.0)
        NativeModules.RNSound.play(key, (success: boolean) => {
          NativeModules.RNSound.release(key)
        })
      })
    } catch (e: any) {
      console.error('Failed to initialize status sound:', e)
      console.error('Error stack:', e?.stack)
    }
  }

  const toggleSwitch = async () => {
    Vibration.vibrate(42)
    if (!driverId) return

    if (!isOnline) {
      SetOn(true)
      runOnlineAnimation()
      playQuickSound()
      setIsOnline(true)
      setStatus('online')

      notificationHelper(
        '',
        'You’re online! You can start receiving ride requests now.',
        'success',
      )

      if (!currentLatitude || !currentLongitude) {
        notificationHelper(
          '',
          translateData?.locationNotAvailable ||
            'Location not available yet. Please wait.',
          'error',
        )
        return
      }

      try {
        const statusPayload = {
          is_online: 1,
          location: {
            lat: currentLatitude,
            lng: currentLongitude,
          },
        }

        await dispatch(driversStatus(statusPayload)).unwrap()
        await startLiveLocation(driverId, selfDriver)
      } catch (err) {
        console.error('Error going online:', err)
        setIsOnline(false)
        setStatus('offline')
        stopLiveLocation()
        notificationHelper('', translateData.failedOnline, 'error')
      }
    } else {
      bottomSheetOfflineRef.current?.present()
      setIsBottomSheetOfflineOpen(true)
    }
  }

  const driverOffline = async () => {
    try {
      if (!driverId) return
      setOfflineLoading(true)

      const freshSelf = await dispatch(selfDriverData()).unwrap()
      if (freshSelf?.is_on_ride == 1) {
        notificationHelper('', 'Currently ride is active', 'error')
        closeDriveroffline()
        return
      }

      playQuickSound()
      Vibration.vibrate(42)

      SetOn(true)
      runOnlineAnimation()
      setIsOnline(false)
      setStatus('offline')
      closeDriveroffline()
      stopLiveLocation()

      notificationHelper(
        '',
        'You’re offline right now. Go online to start receiving ride requests.',
        'error',
      )

      const statusPayload = {
        is_online: 0,
        location: {
          lat: currentLatitude,
          lng: currentLongitude,
        },
      }

      await dispatch(driversStatus(statusPayload)).unwrap()
    } catch (err) {
      console.error('Error going offline:', err)
      notificationHelper('', err, 'error')
      setIsOnline(true)
      setStatus('online')

      if (driverId) {
        startLiveLocation(driverId, selfDriver)
      }

      notificationHelper('', translateData.failedOnline, 'error')
    } finally {
      setOfflineLoading(false)
    }
  }

  const closeDriveroffline = () => {
    bottomSheetOfflineRef.current?.close()
    setIsBottomSheetOfflineOpen(false)
  }

  const fetchTime = async () => {
    if (!selfDriver?.id) return
    // Assuming backend returns this info in dashboard or profile now
    const seconds = dashBoardList?.day?.total_online_time || 0
    setTotalOnlineSeconds(seconds)
  }
  const formatSecondsToHHMM = (totalSeconds: any) =>
    `${Math.floor(totalSeconds / 3600)
      .toString()
      .padStart(2, '0')}:${Math.floor((totalSeconds % 3600) / 60)
      .toString()
      .padStart(2, '0')}`

  const sosSheet = () => {
    if (isBottomSheetSOSOpen) {
      bottomSheetSOSRef.current?.close()
      setIsBottomSheetSOSOpen(false)
    } else {
      if (!sosData?.data || sosData.data.length === 0) {
        dispatch(sosDataGet())
      }
      bottomSheetSOSRef.current?.present()
      setIsBottomSheetSOSOpen(true)
    }
  }

  const handelCall = (rideId?: string) => {
    if (rideId) {
      setSelectedRideIdForCancel(rideId)
    }
    bottomSheetModalRef.current?.close()
    bottomSheetOfflineRef.current?.close()
    if (isBottomSheetSOSOpen) {
      cancelbottomSheetRef.current?.close()
      setIsBottomSheetCancelOpen(false)
    } else {
      cancelbottomSheetRef.current?.present()
      setIsBottomSheetCancelOpen(true)
    }
  }

  const toggleHeader = () => {
    Vibration.vibrate(52)
    setViewMode(prev => (prev === 'amount' ? 'time' : 'amount'))
    fetchTime()
  }

  const sosCall = (details: any) => {
    const payload = {
      sos_id: details?.id,
      location_coordinates: { lat: currentLatitude, lng: currentLongitude },
    }

    setLoadingId(details?.id)
    dispatch(sosAlertGet(payload))
      .unwrap()
      .then(async () => {
        Linking.openURL(`tel:${details?.phone}`)
      })
      .catch(err => {})
      .finally(() => {
        setLoadingId(null)
      })
  }

  useEffect(() => {
    if (rides?.length > 0) {
      const getTimeValue = (item: any) => {
        if (!item?.created_at) return 0
        if (item.created_at._seconds !== undefined) {
          return (
            item.created_at._seconds * 1000 +
            (item.created_at._nanoseconds || 0) / 1000000
          )
        }
        if (typeof item.created_at === 'string') {
          return new Date(item.created_at).getTime()
        }
        if (typeof item.created_at === 'number') {
          return item.created_at
        }
        return 0
      }

      const sortedRides = [...rides].sort(
        (a, b) => getTimeValue(b) - getTimeValue(a),
      )
      const latestRide = sortedRides[0]
      const latestRideId = latestRide?.id

      if (latestRideId && latestRideId !== lastRideRequestId) {
        setLastRideRequestId(latestRideId)

        if (!isBottomSheetOpen) {
          bottomSheetModalRef.current?.present()
          setIsBottomSheetOpen(true)
          setSheetManuallyClosed(false)
        }

        setReadRideRequests(prev => {
          const newSet = new Set(prev)
          newSet.add(latestRideId)
          return newSet
        })
      }
    } else if (rides?.length === 0) {
      setLastRideRequestId(null)
    }
  }, [rides, isBottomSheetOpen, lastRideRequestId])

  const handleFocusPress = () => {
    // 1. Re-mount the map component to fix "Map not loading" issues
    setMapKey(prev => prev + 1)

    // 2. Trigger a fresh position fetch and zone check
    handleCheckAgain(true)

    // 3. Request focus on current coordinates (with slight delay to allow re-mount)
    setTimeout(() => {
      mapRef.current?.focusToCurrentLocation()
    }, 500)
  }

  useEffect(() => {
    notifee.createChannel({
      id: 'ride-requests',
      name: 'Ride Requests',
      sound: 'default',
      importance: AndroidImportance.HIGH,
      vibration: true,
    })
  }, [])

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const playNotificationSound = useCallback(() => {
    if (isRingtonePlayingRef.current) return

    isRingtonePlayingRef.current = true
    shouldPlayRef.current = true
    Vibration.vibrate([0, 1000, 500, 1000], true)

    const key = nextSoundKeyRef.current++
    const url =
      'https://res.cloudinary.com/dwsbvqylx/video/upload/v1748766805/mixkit-urgent-simple-tone-loop-2976_ip7rwc.wav'

    try {
      NativeModules.RNSound.prepare(url, key, {}, (error: any) => {
        if (error) {
          console.error('Sound loading error:', error)
          stopNotificationSound()
          return
        }

        if (!shouldPlayRef.current) {
          NativeModules.RNSound.release(key)
          return
        }

        soundKeyRef.current = key
        NativeModules.RNSound.setVolume(key, 1.0, 1.0)
        if (NativeModules.RNSound.setLooping) {
          NativeModules.RNSound.setLooping(key, true)
        } else if (NativeModules.RNSound.setNumberOfLoops) {
          NativeModules.RNSound.setNumberOfLoops(key, -1)
        }
        NativeModules.RNSound.play(key, (success: boolean) => {
          if (!success) {
            stopNotificationSound()
          }
        })

        timeoutRef.current = setTimeout(() => {
          stopNotificationSound()
        }, 15000)
      })
    } catch (e) {
      console.error('Critical crash during Sound initialization:', e)
      isRingtonePlayingRef.current = false
      shouldPlayRef.current = false
    }
  }, [stopNotificationSound])

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        stopNotificationSound()
        setIsBottomSheetOpen(false)
        setSheetManuallyClosed(true) // Mark that sheet was manually closed
        if (rides?.length > 0) {
          setReadRideRequests(prev => {
            const newSet = new Set(prev)
            rides.forEach((ride: any) => {
              if (ride?.id) {
                newSet.add(ride.id)
              }
            })
            return newSet
          })
        }
      }
    },
    [stopNotificationSound, rides],
  )

  useFocusEffect(
    useCallback(() => {
      if (!driverId) {
        console.log('[HomeScreen] No driverId, skipping Echo setup')
        return
      }

      let echo: any = null

      const setupEcho = async () => {
        try {
          const token = await getValue('token')
          echo = await getEchoInstance()
          if (!echo) return

          // --- Ride Request Channel ---
          const channelName = `driver-ride-request-${driverId}`

          echo
            .private(channelName)
            .subscribed(() => {
              console.log(
                `[HomeScreen] Successfully subscribed to private channel: ${channelName}`,
              )
            })
            .error((error: any) => {
              console.error(
                `[HomeScreen] Subscription error for ${channelName}:`,
                error,
              )
            })
            .listen('.driver.ride.request', (data: any) => {
              if (!data) {
                console.error(
                  '[HomeScreen] unable to get ride request data: event payload is null',
                )
                return
              }
              const { type, id, status } = data

              // "timeout" type with status "requested" = new ride request with
              // a driver acceptance countdown window — treat as a new request.
              const isNewRideRequest =
                type === 'request' ||
                (type === 'timeout' && status === 'requested')

              // Remove ride only when it has truly expired/been rejected/cancelled
              // and is NOT a new incoming request.
              const isRideOver =
                !isNewRideRequest &&
                (type === 'timeout' ||
                  type === 'rejected' ||
                  type === 'cancelled')

              if (isNewRideRequest) {
                setRides((prevRides: any[]) => {
                  const alreadyExists = prevRides.some(r => r.id === id)
                  if (alreadyExists) {
                    return prevRides.map(r =>
                      r.id === id ? { ...r, ...data } : r,
                    )
                  }
                  try {
                    playNotificationSound()
                  } catch (soundError) {
                    console.error(
                      '[HomeScreen] Error playing notification sound:',
                      soundError,
                    )
                  }
                  return [...prevRides, data]
                })
              } else if (isRideOver) {
                setRides((prevRides: any[]) => {
                  const updated = prevRides.filter(r => r.id !== id)
                  if (updated.length !== prevRides.length) {
                    console.log(
                      '[HomeScreen] Removed ride from list. Remaining count:',
                      updated.length,
                    )
                  }
                  return updated
                })
              } else {
                console.log(
                  `[HomeScreen] Received unknown event type: ${type}`,
                  data,
                )
              }
            })

          // --- Bid Status Channel ---
          // Only subscribe when we have a valid bid ID from the Redux store.
          // bidValue is populated after POST /api/bids returns successfully.
          const bidId = bidValue?.id
          if (bidId) {
            const bidChannelName = `bid-status.${bidId}`
            echo.private(bidChannelName).listen('.bid.status', (data: any) => {
              const bidData = data?.bid || data

              if (bidData?.status === 'accepted' && bidData?.ride_id) {
                onRideDeclined(bidData.ride_id)
                navigate('AcceptFare', {
                  ride_Id: bidData.ride_id,
                  ride_Details: bidData,
                })
              } else if (bidData?.status === 'rejected') {
                console.log('[HomeScreen] Bid rejected:', data)
              }
            })
          } else {
            console.log(
              '[HomeScreen] No bidId yet — skipping bid channel subscription',
            )
          }
        } catch (error) {
          console.error('[HomeScreen] Echo setup error:', error)
        }
      }

      setupEcho()

      return () => {
        if (echo) {
          echo.leave(`driver-ride-request-${driverId}`)
          echo.leave(`driver-notification.${driverId}`)
          if (bidValue?.id) {
            echo.leave(`bid-status.${bidValue.id}`)
          }
        }
        stopNotificationSound()
      }
    }, [
      driverId,
      bidValue?.id,
      playNotificationSound,
      stopNotificationSound,
      navigate,
    ]),
  )
  const scaleAnim = useRef(new Animated.Value(1)).current

  const runOnlineAnimation = () => {
    setShowOnline(true)
    setTimeout(() => {
      setShowOnline(false)
      SetOn(false)
    }, 2000)
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }
  useEffect(() => {
    return () => stopNotificationSound()
  }, [stopNotificationSound])

  const FallbackImage = ({ uri, style }) => {
    const [imgUri, setImgUri] = React.useState(uri)

    return (
      <Image
        source={imgUri ? { uri: imgUri } : Images.sos}
        style={style}
        onError={() => setImgUri(null)}
        resizeMode="contain"
      />
    )
  }

  return (
    <View style={{ flex: 1 }}>
      {mapLoaded && (
        <MapScreen
          key={mapKey}
          ref={mapRef}
          markerIcon={selfDriver?.vehicle_info?.vehicle_type_map_icon_url}
          selfDriver={selfDriver}
          zoneValue={zoneValue}
          isBottomSheetSOSOpen={isBottomSheetSOSOpen}
          isBottomSheetCancelOpen={isBottomSheetCancelOpen}
          isBottomSheetOpen={isBottomSheetOpen}
          isBottomSheetOfflineOpen={isBottomSheetOfflineOpen}
        />
      )}
      <Modal
        visible={noservice}
        transparent
        animationType="fade"
        onRequestClose={() => setNodervice(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>
              {translateData?.serviceNotAvailable}
            </Text>
            <Text style={styles.message}>{translateData?.serviceNoDesc}</Text>
            <TouchableOpacity
              style={[
                styles.buttonModel,
                {
                  backgroundColor: appColors.primary,
                  marginTop: windowHeight(1.5),
                },
              ]}
              onPress={() => handleCheckAgain(true)}
            >
              <Text style={styles.buttonTextModel}>Check</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.buttonModel}
              onPress={() => BackHandler.exitApp()}
            >
              <Text style={styles.buttonTextModel}>{translateData?.exit}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={lowBalance} transparent animationType="fade">
        <LowBalance
          low={walletBalance < minWalletBalance ? false : true}
          setLowBalance={setLowBalance}
        />
      </Modal>
      <View
        style={{
          flexDirection: rtl ? 'row-reverse' : 'row',
          justifyContent: 'space-between',
          top: '3%',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigate('ProfileSetting')}
          style={{ left: windowHeight(2) }}
        >
          {selfDriver?.profile_image_url ? (
            <Image
              style={{
                backgroundColor: appColors.primary,
                height: windowHeight(5.5),
                width: windowHeight(5.5),
                borderRadius: windowHeight(5),
              }}
              source={{
                uri: selfDriver?.profile_image_url,
              }}
            />
          ) : (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                width: windowHeight(5.5),
                height: windowHeight(5.5),
                backgroundColor: appColors.primary,
                borderRadius: windowHeight(74),
              }}
            >
              <Text
                style={{
                  color: appColors.white,
                  fontFamily: appFonts.bold,
                  fontSize: fontSizes.FONT5,
                }}
              >
                {char}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TourGuideZone
          zone={4}
          text={`${translateData?.fleetData1}.\n${translateData?.fleetData2}\n${translateData?.fleetData3}`}
          borderRadius={12}
          isTourGuide
          style={{
            flexDirection: rtl ? 'row-reverse' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor:
              on && status === 'offline' ? appColors.red : appColors.primary,
            height: windowHeight(5.5),
            borderRadius: windowHeight(8.5),
            paddingHorizontal: windowWidth(4.3),
          }}
        >
          {showOnline && on ? (
            <View
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                width: windowWidth(25),
              }}
            >
              <Animated.Text
                style={{
                  fontSize: fontSizes.FONT4,
                  fontFamily: appFonts.medium,
                  color: appColors.white,
                  transform: [{ scale: scaleAnim }],
                }}
              >
                {status === 'offline' ? 'Offline' : 'Online'}
              </Animated.Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => toggleHeader()}
              activeOpacity={0.9}
              style={{
                flexDirection: rtl ? 'row-reverse' : 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: appColors.primary,
                height: windowHeight(5.5),
                borderRadius: windowHeight(8.5),
              }}
            >
              {viewMode === 'time' ? (
                <Icons.Clock color={appColors.white} />
              ) : (
                <TouchableOpacity
                  onPress={e => {
                    e.stopPropagation()
                    setIsAmountVisible(prev => !prev)
                  }}
                >
                  {isAmountVisible ? <Icons.Eye /> : <Icons.WalletEyeClose />}
                </TouchableOpacity>
              )}

              <View
                style={{
                  height: windowHeight(1.5),
                  width: windowHeight(0.1),
                  backgroundColor: appColors.white,
                  marginHorizontal: windowWidth(1.5),
                }}
              />

              <Text style={styles.text}>
                {viewMode === 'time'
                  ? `${formatSecondsToHHMM(totalOnlineSeconds)} hrs`
                  : isAmountVisible
                  ? TodayIncome
                  : maskedAmount}
              </Text>
            </TouchableOpacity>
          )}
        </TourGuideZone>
        <TouchableOpacity
          onPress={() => navigate('Notification')}
          activeOpacity={0.9}
          style={{
            height: windowHeight(5.5),
            width: windowHeight(5.5),
            backgroundColor: isDark ? appColors.darkThemeSub : appColors.white,
            borderRadius: windowHeight(15),
            alignItems: 'center',
            justifyContent: 'center',
            right: windowHeight(2),
            borderColor: isDark ? appColors.darkBorderBlack : appColors.white,
            borderWidth: 1,
          }}
        >
          <Icons.Notification
            color={isDark ? appColors.white : appColors.primaryFont}
          />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        activeOpacity={0.9}
        style={{
          height: windowHeight(5.5),
          width: windowHeight(5.5),
          backgroundColor: isDark ? appColors.darkThemeSub : appColors.white,
          borderRadius: windowHeight(15),
          alignItems: 'center',
          justifyContent: 'center',
          left: rtl ? windowHeight(-2) : windowHeight(2),
          top: windowHeight(4),
          position: 'relative',
          alignSelf: rtl ? 'flex-end' : 'flex-start',
          borderColor: isDark ? appColors.darkBorderBlack : appColors.white,
        }}
        onPress={handlePresentModalPress}
      >
        <TourGuideZone
          zone={3}
          text={translateData?.fleetRide1}
          borderRadius={12}
          isTourGuide
          style={{
            height: windowHeight(6.5),
            width: windowHeight(7),
            position: 'absolute',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icons.Car color={isDark ? appColors.white : appColors.primaryFont} />
          {rides?.length > 0 && !readRideRequests.has(rides[0]?.id) && (
            <View
              style={{
                position: 'absolute',
                top: windowHeight(1),
                right: windowHeight(1),
                height: windowHeight(1),
                width: windowHeight(1),
                backgroundColor: appColors.red,
                borderRadius: 5,
              }}
            />
          )}
        </TourGuideZone>
      </TouchableOpacity>
      <>
        {!isBottomSheetOpen &&
          !isBottomSheetOfflineOpen &&
          !isBottomSheetSOSOpen &&
          !isBottomSheetCancelOpen && (
            <View
              style={{
                position: 'absolute',
                left: windowHeight(2),
                height: windowHeight(7),
                bottom: windowHeight(10),
                [rtl ? 'right' : 'left']: windowWidth(4),
                zIndex: 1,
                justifyContent: 'center',
              }}
            >
              <TouchableOpacity
                onPress={sosSheet}
                style={{
                  height: windowHeight(7),
                  width: windowHeight(7),
                  borderRadius: windowHeight(4),
                  backgroundColor: isDark
                    ? appColors.alertIconBg
                    : appColors.white,
                  borderColor: isDark ? appColors.red : appColors.border,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: windowHeight(0.15),
                  alignSelf: 'flex-end',
                }}
              >
                <Icons.SOS />
              </TouchableOpacity>

              <TourGuideZone
                zone={2}
                text={translateData?.fleetSos1}
                borderRadius={12}
                isTourGuide
                style={{
                  height: windowHeight(7),
                  width: windowHeight(7),
                  position: 'absolute',
                }}
              >
                <View style={{ flex: 1 }} />
              </TourGuideZone>
            </View>
          )}
      </>

      <TouchableOpacity
        onPress={handleFocusPress}
        style={{
          position: 'absolute',
          bottom: windowHeight(10),
          height: windowHeight(7),
          width: windowHeight(7),
          borderRadius: windowHeight(4),
          borderWidth: windowHeight(0.15),
          borderColor: isDark ? appColors.darkBorderBlack : appColors.border,
          backgroundColor: isDark ? appColors.darkThemeSub : appColors.white,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 0,
          [rtl ? 'left' : 'right']: windowWidth(4),
        }}
      >
        <Icons.LocationIcon
          color={isDark ? appColors.white : appColors.primaryFont}
        />
      </TouchableOpacity>
      <TourGuideZone
        zone={1}
        text={translateData?.tourTitle}
        borderRadius={12}
        style={{
          position: 'absolute',
          marginTop: windowHeight(5),
          marginLeft: windowWidth(-15),
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2,
        }}
      />
      {!isBottomSheetOpen &&
        !isBottomSheetOfflineOpen &&
        !isBottomSheetSOSOpen &&
        !isBottomSheetCancelOpen && (
          <View style={styles.container}>
            <PulseCircle delay={0} color={current.pulse1} />
            <PulseCircle delay={600} color={current.pulse2} />
            <View
              style={[
                styles.staticOuterCircle,
                { backgroundColor: current.outer },
              ]}
            />
            <TourGuideZone
              zone={5}
              text={translateData?.fleetOnline1}
              borderRadius={12}
              style={{
                position: 'absolute',
                height: windowHeight(10),
                width: windowHeight(10),
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 2,
              }}
            >
              <TouchableOpacity
                onPress={toggleSwitch}
                style={[styles.button, { backgroundColor: current.inner }]}
              >
                {current.icon}
              </TouchableOpacity>
            </TourGuideZone>
          </View>
        )}

      <BottomSheetModalProvider>
        <BottomSheetModal
          ref={bottomSheetModalRef}
          index={0}
          snapPoints={['48%', '80%']}
          onChange={handleSheetChanges}
          onDismiss={() => setIsBottomSheetOpen(false)}
          handleIndicatorStyle={{
            backgroundColor: appColors.primary,
            width: '13%',
          }}
          backgroundStyle={{
            backgroundColor: isDark ? appColors.bgDark : appColors.white,
          }}
          enableContentPanningGesture={true}
          enableHandlePanningGesture={true}
          enableOverDrag={false}
          enablePanDownToClose={true}
        >
          <BottomSheetView style={styles.contentContainer}>
            {rides?.length > 0 ? (
              <BottomSheetFlatList
                data={[...rides]
                  .filter((ride: any) => {
                    const pass = ride?.rider_id && ride?.location_coordinates
                    if (!pass) {
                    }
                    return pass
                  })
                  .sort((a: any, b: any) => {
                    // Extract timestamp values, handling different formats
                    const getTimeValue = (item: any) => {
                      if (!item?.created_at) return 0

                      // Handle Firestore timestamp format (_seconds and _nanoseconds)
                      if (item.created_at._seconds !== undefined) {
                        return (
                          item.created_at._seconds * 1000 +
                          (item.created_at._nanoseconds || 0) / 1000000
                        )
                      }

                      // Handle string format (ISO date string)
                      if (typeof item.created_at === 'string') {
                        return new Date(item.created_at).getTime()
                      }

                      // Handle numeric timestamp
                      if (typeof item.created_at === 'number') {
                        return item.created_at
                      }

                      return 0
                    }

                    const timeA = getTimeValue(a)
                    const timeB = getTimeValue(b)

                    // Sort in descending order (latest first)
                    return timeB - timeA
                  })}
                keyExtractor={(item: any, index) =>
                  item?.id?.toString() || index.toString()
                }
                extraData={rides}
                renderItem={({ item }) => {
                  return (
                    <UpcomingRide
                      ride={item}
                      ref={upcomingRideRef}
                      gotoRide={gotoRide}
                      gotoInfo={gotoInfo}
                      selectDriver={selectDriver}
                      onRideDeclined={onRideDeclined}
                      cancelbottomSheetRef={cancelbottomSheetRef}
                      cancel={cancel}
                      handelCall={handelCall}
                      onAutoIgnore={handleRideRejection}
                      bottomSheetRef={bottomSheetRef}
                    />
                  )
                }}
                ListEmptyComponent={
                  <View>
                    <Text style={styles.noRideText}>
                      {translateData?.noUpcomingrides}
                    </Text>
                  </View>
                }
                bounces={false}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ flexGrow: 1 }}
                scrollEnabled={true}
              />
            ) : (
              <View style={styles.noRideContainer}>
                <Image
                  source={Images.noRide}
                  style={styles.noRideImg}
                  resizeMode="contain"
                />
                <Text style={styles.noRideText}>
                  {translateData?.waitNewRide}
                </Text>
              </View>
            )}
          </BottomSheetView>
        </BottomSheetModal>
      </BottomSheetModalProvider>
      <BottomSheetModalProvider>
        <BottomSheetModal
          ref={bottomSheetOfflineRef}
          index={0}
          snapPoints={['30%']}
          onChange={handleSheetChanges}
          onDismiss={() => setIsBottomSheetOfflineOpen(false)}
          style={{ zIndex: 2 }}
          handleIndicatorStyle={{
            backgroundColor: appColors.primary,
            width: '13%',
          }}
          backgroundStyle={{
            backgroundColor: isDark ? appColors.bgDark : appColors.white,
          }}
          enableOverDrag={false}
        >
          <BottomSheetView style={styles.contentContainer}>
            <View>
              <Text
                style={{
                  color: isDark ? appColors.white : appColors.primaryFont,
                  fontFamily: appFonts.medium,
                  fontSize: fontSizes.FONT4HALF,
                  textAlign: 'center',
                  marginBottom: windowHeight(5),
                }}
              >
                {translateData?.offlineMsg ||
                  'Are you sure you want to go offline?'}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ width: windowWidth(46) }}>
                  <Button
                    title={translateData?.cancel}
                    backgroundColor={
                      isDark ? appColors.darkThemeSub : appColors.graybackground
                    }
                    onPress={closeDriveroffline}
                    color={isDark ? appColors.white : appColors.black}
                  />
                </View>
                <View style={{ width: windowWidth(46) }}>
                  <Button
                    title={translateData?.confirm}
                    backgroundColor={appColors.red}
                    color={appColors.white}
                    onPress={driverOffline}
                    loading={offlineloading}
                  />
                </View>
              </View>
            </View>
          </BottomSheetView>
        </BottomSheetModal>
      </BottomSheetModalProvider>

      <BottomSheetModalProvider>
        <BottomSheetModal
          ref={bottomSheetSOSRef}
          index={0}
          snapPoints={['48%', '80%']}
          onChange={handleSheetChanges}
          onDismiss={() => setIsBottomSheetSOSOpen(false)}
          handleIndicatorStyle={{
            backgroundColor: appColors.primary,
            width: '13%',
          }}
          backgroundStyle={{
            backgroundColor: isDark ? appColors.bgDark : appColors.white,
          }}
          enableContentPanningGesture={true}
          enableHandlePanningGesture={true}
          enableOverDrag={false}
          enablePanDownToClose={true}
        >
          <BottomSheetView style={styles.contentContainer}>
            <View>
              <Text
                style={{
                  color: isDark ? appColors.white : appColors.primaryFont,
                  fontFamily: appFonts.medium,
                  fontSize: fontSizes.FONT4HALF,
                  textAlign: 'center',
                  marginBottom: windowHeight(3),
                }}
              >
                {translateData?.keepSafe}
              </Text>
            </View>
            {sosLoading ? (
              <View style={{ padding: windowWidth(1.5) }}>
                {[1, 2, 3].map((_, index) => (
                  <View
                    key={index}
                    style={{
                      borderRadius: windowHeight(0.5),
                      overflow: 'hidden',
                    }}
                  >
                    <ContentLoader
                      speed={2}
                      width={windowWidth(90)}
                      height={windowHeight(8)}
                      backgroundColor={
                        isDark ? appColors.bgDark : appColors.loaderBackground
                      }
                      foregroundColor={
                        isDark
                          ? appColors.darkThemeSub
                          : appColors.loaderLightHighlight
                      }
                    >
                      <Rect
                        x="0"
                        y="0"
                        rx="8"
                        ry="8"
                        width={windowWidth(90)}
                        height={windowHeight(6)}
                      />
                    </ContentLoader>
                  </View>
                ))}
              </View>
            ) : (
              <BottomSheetFlatList
                data={sosData?.data}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={{ paddingBottom: windowHeight(25) }}
                renderItem={({ item }) => {
                  return (
                    <TouchableOpacity
                      style={{
                        padding: windowHeight(1.5),
                        marginVertical: windowHeight(0.5),
                        backgroundColor: isDark
                          ? appColors.darkThemeSub
                          : appColors.graybackground,
                        borderRadius: 8,
                      }}
                      onPress={() => sosCall(item)}
                    >
                      <View
                        style={{
                          flexDirection: viewRtlStyle,
                          alignItems: 'center',
                        }}
                      >
                        <FallbackImage
                          uri={item?.sos_image_url}
                          style={styles.sosImage}
                        />
                        <View
                          style={[
                            styles.sideLine,
                            {
                              backgroundColor: isDark
                                ? appColors.darkBorderBlack
                                : appColors.border,
                            },
                          ]}
                        />
                        <Text
                          style={{
                            color: isDark ? appColors.white : appColors.black,
                            fontFamily: appFonts.regular,
                            fontSize: fontSizes.FONT4HALF,
                            width: windowWidth(68),
                          }}
                        >
                          {item?.title}
                        </Text>
                        {loadingId === item?.id && (
                          <ActivityIndicator
                            size={'small'}
                            color={appColors.primary}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  )
                }}
                bounces={false}
                showsVerticalScrollIndicator={true}
                scrollEnabled={true}
              />
            )}
          </BottomSheetView>
        </BottomSheetModal>
      </BottomSheetModalProvider>

      <BottomSheetModalProvider>
        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose
          handleIndicatorStyle={{
            backgroundColor: appColors.primary,
            width: '13%',
          }}
          backgroundStyle={{
            backgroundColor: isDark ? appColors.bgDark : appColors.white,
          }}
        >
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 10 }}>
              {translateData?.exitMsg}
            </Text>
            <TouchableOpacity
              onPress={handleExit}
              style={{ marginVertical: 10 }}
            >
              <Text style={{ color: 'red', fontSize: 16 }}>
                {translateData?.exit}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCloseSheet}
              style={{ marginVertical: 10 }}
            >
              <Text style={{ fontSize: 16 }}>{translateData?.cancel}</Text>
            </TouchableOpacity>
          </View>
        </BottomSheet>
      </BottomSheetModalProvider>

      <BottomSheetModalProvider>
        <BottomSheetModal
          ref={cancelbottomSheetRef}
          index={0}
          snapPoints={['32%']}
          onChange={handleSheetChanges}
          onDismiss={() => setIsBottomSheetOpen(false)}
          handleIndicatorStyle={{
            backgroundColor: appColors.primary,
            width: '13%',
          }}
          backgroundStyle={{
            backgroundColor: isDark ? appColors.bgDark : appColors.white,
          }}
          style={{ zIndex: 2 }}
        >
          <BottomSheetView style={styles.contentContainer}>
            <View style={{ padding: 20, paddingTop: windowHeight(2) }}>
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: appFonts.medium,
                  marginBottom: 15,
                }}
              >
                {translateData?.areyousure}
              </Text>
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexDirection: rtl ? 'row-reverse' : 'row',
                }}
              >
                <TouchableOpacity
                  onPress={handleConfirmCancel}
                  style={{
                    marginVertical: 10,
                    height: windowHeight(5),
                    width: windowWidth(35),
                    backgroundColor: appColors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: windowWidth(1.5),
                  }}
                >
                  <Text
                    style={{
                      color: isDark ? appColors.darkText : appColors.white,
                      fontSize: 16,
                    }}
                  >
                    {translateData?.confirm}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCloseSheet1}
                  style={{
                    marginVertical: 10,
                    height: windowHeight(5),
                    width: windowWidth(35),
                    backgroundColor: isDark
                      ? appColors.darkThemeSub
                      : appColors.graybackground,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: windowWidth(1.5),
                  }}
                >
                  <Text
                    style={{
                      color: isDark ? appColors.darkText : appColors.black,
                      fontSize: 16,
                    }}
                  >
                    {translateData?.cancel}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </BottomSheetView>
        </BottomSheetModal>
      </BottomSheetModalProvider>
    </View>
  )
}
