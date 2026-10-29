import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Vibration,
  NativeModules,
  Alert,
} from 'react-native'
import React, { useState, useEffect, useMemo } from 'react'
import appColors from '../../../theme/appColors'
import { useTheme, useRoute } from '@react-navigation/native'
import styles from './styles'
import commanStyles from '../../../style/commanStyles'
import {
  Button,
  BackButton,
  notificationHelper,
} from '../../../commonComponents'
import { UserDetails } from './component/userDetails'
import { useValues } from '../../../utils/context'
import { DriverRideRequest } from '../../../api/interface/rideRequestInterface'
import { bidDataPost, rideDataGets } from '../../../api/store/action/index'
import { useDispatch, useSelector } from 'react-redux'
import { windowHeight } from '../../../theme/appConstant'
import { useAppNavigation } from '../../../utils/navigation'
import getEchoInstance from '../../../utils/echo'
import { WebView } from 'react-native-webview'

export function Ride() {
  const navigation = useAppNavigation()
  const { textRtlStyle, viewRtlStyle, isDark, Google_Map_Key } = useValues()
  const { colors } = useTheme()
  const [bidId, setBidID] = useState<number | null>(null)
  const route = useRoute()
  const { ride } = (route.params as any) || {}
  const [value, setValue] = useState(ride?.total ? String(ride.total) : '0')
  const dispatch = useDispatch()
  const { translateData, taxidoSettingData } = useSelector(
    (state: any) => state.setting,
  )
  const { zoneValue } = useSelector((state: any) => state.zoneUpdate)
  const { selfDriver } = useSelector((state: any) => state.account)
  const [bidload, setbidloading] = useState(false)
  const increaseAmount = parseFloat(
    taxidoSettingData?.cabbooking_values?.ride?.increase_amount_range ?? 10,
  )
  const minFare = parseFloat(ride?.total || '0')
  const maxPercentage = parseFloat(
    taxidoSettingData?.cabbooking_values?.ride?.max_bidding_fare_driver ?? 0,
  )
  const maxFare = minFare + (minFare * maxPercentage) / 100
  const numericFare = parseFloat(
    String(value)
      .replace(/,/g, '')
      .replace(zoneValue?.currency_symbol || '', ''),
  )
  const safeFare = isNaN(numericFare) ? minFare : numericFare
  const isPlusDisabled = safeFare >= maxFare
  const isMinusDisabled = safeFare <= minFare
  const [mapType, setMapType] = useState(
    taxidoSettingData?.cabbooking_values?.location?.map_provider,
  )

  try {
    NativeModules.RNSound.setCategory('Playback', true)
  } catch (e) {
    console.error('Failed to set Sound category in Ride:', e)
  }

  const playRingtone = () => {
    const key = Math.floor(Math.random() * 10000)
    const filename = 'seatbelt' // Native resource name (lowercase, no extension)

    if (!NativeModules.RNSound) {
      console.error('RNSound native module not found in Ride')
      return
    }

    try {
      NativeModules.RNSound.prepare(filename, key, {}, (error: any) => {
        if (error) {
          console.error('Seatbelt sound loading error in Ride:', error)
          return
        }

        NativeModules.RNSound.setVolume(key, 1.0, 1.0)
        NativeModules.RNSound.play(key, (success: boolean) => {
          if (!success) {
            console.log('Seatbelt sound play failed in Ride')
          }
          NativeModules.RNSound.release(key)
        })
      })
    } catch (e) {
      console.error('Failed to initialize seatbelt sound in Ride:', e)
    }
  }

  useEffect(() => {
    if (!selfDriver?.id || !bidId) {
      return
    }

    let activeEcho: any = null
    let isCancelled = false

    const setupEcho = async () => {
      try {
        const echoInstance = await getEchoInstance()
        if (isCancelled) {
          if (echoInstance) {
            echoInstance.leave(`bid-status.${bidId}`)
          }
          return
        }
        if (!echoInstance) return
        activeEcho = echoInstance
        const notificationChannel = `bid-status.${bidId}`

        activeEcho
          .private(notificationChannel)
          .listen('.bid.status', (data: any) => {
            const bidData = data?.bid || data

            if (String(bidData?.ride_request_id) === String(ride?.id)) {
              if (bidData?.status == 'accepted') {
                dispatch(rideDataGets() as any)
                notificationHelper(
                  '',
                  translateData.bidAccepted || 'Bid Accepted!',
                  'success',
                )

                const isSchedule =
                  bidData?.service_category_type === 'schedule' ||
                  bidData?.service_category?.service_category_type ===
                  'schedule' ||
                  data?.service_category_type === 'schedule' ||
                  data?.service_category?.service_category_type === 'schedule'

                if (isSchedule) {
                  navigation.navigate('TabNav')
                } else {
                  playRingtone()
                  navigation.navigate('AcceptFare', {
                    ride_Id: bidData.ride_id || bidData.id,
                  })
                }
              } else if (bidData?.status === 'rejected') {
                notificationHelper(
                  '',
                  translateData.bidRejected || 'Bid Rejected',
                  'error',
                )
                navigation.goBack()
              }
            }
          })
      } catch (err) {
        console.error('[Ride] Echo error:', err)
      }
    }

    setupEcho()

    return () => {
      isCancelled = true
      if (activeEcho && bidId) {
        activeEcho.leave(`bid-status.${bidId}`)
      }
    }
  }, [selfDriver?.id, bidId, ride?.id, navigation])

  // Listen for ride cancellation by user
  // Server fires .driver.ride.request with type:'cancelled' on driver-ride-request-{driverId}
  // Confirmed by Pusher log: pusher:unsubscribe on private-driver-ride-request-{driverId}
  useEffect(() => {
    const driverId = selfDriver?.id
    if (!driverId) return

    let activeEcho: any = null
    let isCancelled = false

    const setupCancellationListener = async () => {
      try {
        const echoInstance = await getEchoInstance()
        if (isCancelled) {
          if (echoInstance) {
            echoInstance.leave(`driver-ride-request-${driverId}`)
          }
          return
        }
        if (!echoInstance) return
        activeEcho = echoInstance
        const channelName = `driver-ride-request-${driverId}`
        console.log('[Ride] Registering cancellation listener on:', channelName)

        activeEcho
          .private(channelName)
          .listen('.cancel.bidding.ride.request', (data: any) => {
            console.log('[Ride] Cancellation event received on socket:', data)

            // Validate that the event's ride request ID matches our current ride's ID
            if (ride?.id && String(data?.id) !== String(ride.id)) {
              console.log(
                `[Ride] Event ride ID ${data?.id} does not match current ride ID ${ride.id}. Ignoring.`,
              )
              return
            }

            console.log('[Ride] Ride cancelled by user, navigating back')
            navigation.goBack()
          })
      } catch (err) {
        console.error('[Ride] Cancellation listener Echo error:', err)
      }
    }

    setupCancellationListener()

    return () => {
      isCancelled = true
      if (activeEcho && driverId) {
        activeEcho.leave(`driver-ride-request-${driverId}`)
      }
    }
  }, [selfDriver?.id, ride?.id, navigation])

  // Currency helpers
  const truncateToTwoDecimals = (value: number) => {
    return Math.trunc(value * 100) / 100
  }

  const gotoAcceptFare = async () => {
    setbidloading(true)
    const payload: DriverRideRequest = {
      amount: truncateToTwoDecimals(safeFare),
      ride_request_id: ride?.id,
      currency_code: zoneValue?.currency_code,
    }

    dispatch(bidDataPost(payload))
      .unwrap()
      .then(async (res: any) => {
        if (res?.id) {
          notificationHelper('', translateData.bidPlace, 'success')
          setBidID(res.id)
          setbidloading(false)
        } else {
          notificationHelper('', res?.message, 'error')
          setbidloading(false)
        }
      })
      .catch(err => {
        console.error('[Ride] Error placing bid:', err)
        setbidloading(false)
      })
  }

  const handleIncrement = () => {
    Vibration.vibrate(42)
    const newFare = safeFare + increaseAmount
    setValue(newFare >= maxFare ? String(maxFare) : String(newFare))
  }

  const handleDecrement = () => {
    Vibration.vibrate(42)
    const newFare = safeFare - increaseAmount
    setValue(newFare <= minFare ? String(minFare) : String(newFare))
  }

  const handleChange = (text: string) => {
    const numericText = text
      .replace(zoneValue?.currency_symbol || '', '')
      .replace(/,/g, '')
    const num = parseFloat(numericText)
    if (!isNaN(num)) {
      setValue(String(num))
    } else {
      setValue('0')
    }
  }

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return `${zoneValue?.currency_symbol}${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
    })}`
  }

  const buttonColor =
    safeFare >= ride?.ride_fare ? appColors.primary : appColors.disabled

  // Default fallback
  const defaultLocation = { latitude: 0, longitude: 0 }

  // Pickup (first item)
  const pickup =
    ride?.location_coordinates?.length > 0
      ? {
        latitude: parseFloat(ride?.location_coordinates[0].lat),
        longitude: parseFloat(ride?.location_coordinates[0].lng),
      }
      : defaultLocation

  // Destination (last item)
  const destination =
    ride?.location_coordinates?.length > 1
      ? {
        latitude: parseFloat(
          ride?.location_coordinates[ride?.location_coordinates?.length - 1]
            .lat,
        ),
        longitude: parseFloat(
          ride?.location_coordinates[ride?.location_coordinates?.length - 1]
            .lng,
        ),
      }
      : defaultLocation

  // Add Stops (all middle points)
  const addStops =
    ride?.location_coordinates?.length > 2
      ? ride?.location_coordinates.slice(1, -1).map(item => ({
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lng),
      }))
      : []

  const mapHtml = useMemo(() => {
    const addStopsJson = JSON.stringify(addStops || [])
    const useGoogle = mapType === 'google_map'
    const googleKey = Google_Map_Key
    const primaryColor = appColors.primary || appColors.primary
    const darkMode = isDark //  use your app’s dark mode flag

    return `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      html, body { height: 100%; margin: 0; padding: 0; background-color: ${darkMode ? '#121212' : '#fff'
      }; }
      #map { height: 100%; width: 100%; }
      .leaflet-control-zoom { display: none !important; }
    </style>

    ${useGoogle
        ? `<script src="https://maps.googleapis.com/maps/api/js?key=${googleKey}"></script>`
        : `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
           <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>`
      }

    <script>
      const appColor = "${primaryColor}";
      const useGoogle = ${useGoogle};
      const darkMode = ${darkMode};
      const pickup = { lat: ${pickup?.latitude ?? 0}, lng: ${pickup?.longitude ?? 0
      } };
      const destination = { lat: ${destination?.latitude ?? 0}, lng: ${destination?.longitude ?? 0
      } };
      const addStops = ${addStopsJson};
      const ORS_API_KEY = "5b3ce3597851110001cf62483cfa5bfc3bba4b20b1327f0fbd05417b";

      function toLatLngObj(p) {
        return { lat: parseFloat(p.latitude ?? p.lat), lng: parseFloat(p.longitude ?? p.lng) };
      }

      async function initMap() {
        const stops = (addStops || []).map(s => toLatLngObj(s));
        const allPoints = [toLatLngObj(pickup), ...stops, toLatLngObj(destination)];

        function createBoundsFromPoints(points) {
          if (useGoogle) {
            const b = new google.maps.LatLngBounds();
            points.forEach(p => b.extend(new google.maps.LatLng(p.lat, p.lng)));
            return b;
          } else {
            return L.latLngBounds(points.map(p => [p.lat, p.lng]));
          }
        }

        if (useGoogle) {
          // ================= GOOGLE MAPS =================
          const map = new google.maps.Map(document.getElementById("map"), {
            zoom: 13,
            center: new google.maps.LatLng(allPoints[0].lat, allPoints[0].lng),
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
          });

          //  Apply dark mode style
          if (darkMode) {
            const darkModeStyles = [
              { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
              { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
              { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
              {
                featureType: "administrative.locality",
                elementType: "labels.text.fill",
                stylers: [{ color: "#d59563" }]
              },
              {
                featureType: "poi",
                elementType: "labels.text.fill",
                stylers: [{ color: "#d59563" }]
              },
              {
                featureType: "poi.park",
                elementType: "geometry",
                stylers: [{ color: "#263c3f" }]
              },
              {
                featureType: "road",
                elementType: "geometry",
                stylers: [{ color: "#38414e" }]
              },
              {
                featureType: "road",
                elementType: "geometry.stroke",
                stylers: [{ color: "#212a37" }]
              },
              {
                featureType: "road.highway",
                elementType: "geometry",
                stylers: [{ color: "#746855" }]
              },
              {
                featureType: "road.highway",
                elementType: "geometry.stroke",
                stylers: [{ color: "#1f2835" }]
              },
              {
                featureType: "water",
                elementType: "geometry",
                stylers: [{ color: "#17263c" }]
              },
              {
                featureType: "water",
                elementType: "labels.text.fill",
                stylers: [{ color: "#515c6d" }]
              }
            ];
            map.setOptions({ styles: darkModeStyles });
          }

          // Markers
          const markers = [];
          markers.push(new google.maps.Marker({ position: allPoints[0], map, label: "A" }));
          stops.forEach((s, i) => {
            markers.push(new google.maps.Marker({
              position: s,
              map,
              label: (i + 1).toString()
            }));
          });
          markers.push(new google.maps.Marker({ position: allPoints[allPoints.length - 1], map, label: "B" }));

          const initialBounds = createBoundsFromPoints(allPoints);
          setTimeout(() => map.fitBounds(initialBounds, 50), 200);

          const waypoints = stops.map(s => ({ location: new google.maps.LatLng(s.lat, s.lng), stopover: true }));
          const directionsService = new google.maps.DirectionsService();
          const directionsRenderer = new google.maps.DirectionsRenderer({
            map,
            suppressMarkers: true,
            polylineOptions: { strokeColor: appColor, strokeWeight: 5, strokeOpacity: 1.0 }
          });

          directionsService.route({
            origin: allPoints[0],
            destination: allPoints[allPoints.length - 1],
            waypoints,
            optimizeWaypoints: false,
            travelMode: "DRIVING"
          }, (result, status) => {
            if (status === "OK" && result && result.routes && result.routes[0]) {
              directionsRenderer.setDirections(result);
              const rb = result.routes[0].bounds || new google.maps.LatLngBounds();
              map.fitBounds(rb);
            } else {
              console.warn("Directions request failed:", status);
              const path = allPoints.map(p => new google.maps.LatLng(p.lat, p.lng));
              const polyline = new google.maps.Polyline({
                path,
                geodesic: true,
                strokeColor: appColor,
                strokeOpacity: 1.0,
                strokeWeight: 5,
                map
              });
              const polyBounds = new google.maps.LatLngBounds();
              path.forEach(pt => polyBounds.extend(pt));
              map.fitBounds(polyBounds);
            }
          });

        } else {
          // ================= LEAFLET (OpenStreetMap) =================
          const map = L.map("map", { zoomControl: false, attributionControl: false });

          //  Use dark or light tiles
          const tileUrl = darkMode
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

          L.tileLayer(tileUrl, {
            attribution: darkMode
              ? '&copy; <a href="https://carto.com/">CARTO</a>'
              : '&copy; OpenStreetMap contributors'
          }).addTo(map);

          const markerGroup = L.featureGroup();
          markerGroup.addLayer(L.marker([allPoints[0].lat, allPoints[0].lng]).bindPopup("Pickup").openPopup());
          stops.forEach((s, i) => {
            markerGroup.addLayer(L.marker([s.lat, s.lng]).bindPopup("Stop " + (i + 1)));
          });
          markerGroup.addLayer(L.marker([allPoints[allPoints.length - 1].lat, allPoints[allPoints.length - 1].lng]).bindPopup("Destination"));
          markerGroup.addTo(map);

          const markerBounds = createBoundsFromPoints(allPoints);
          setTimeout(() => map.fitBounds(markerBounds, { padding: [40, 40] }), 150);

          try {
            const coordsForORS = allPoints.map(p => [p.lng, p.lat]);
            const orsUrl = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
            const res = await fetch(orsUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": ORS_API_KEY
              },
              body: JSON.stringify({ coordinates: coordsForORS })
            });
            const data = await res.json();
            if (data?.features?.[0]?.geometry?.coordinates) {
              const coords = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
              const route = L.polyline(coords, { color: appColor, weight: 5 }).addTo(map);
              map.fitBounds(route.getBounds(), { padding: [40, 40] });
              return;
            }
          } catch (err) {
            console.error("ORS routing failed:", err);
          }

          const fallbackLine = allPoints.map(p => [p.lat, p.lng]);
          const route = L.polyline(fallbackLine, { color: appColor, weight: 5 }).addTo(map);
          map.fitBounds(route.getBounds(), { padding: [40, 40] });
        }
      }

      window.addEventListener("load", function(){ setTimeout(initMap, 50); });
    </script>
  </head>
  <body>
    <div id="map"></div>
  </body>
</html>
`
  }, [ride?.location_coordinates, mapType, isDark, Google_Map_Key])

  return (
    <View style={commanStyles.main}>
      <View style={styles.mapSection}>
        <WebView
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          style={{ flex: 1 }}
        />
      </View>

      <View style={styles.extraSection}></View>

      <View style={[styles.backButton]}>
        <BackButton />
      </View>

      <View
        style={[
          styles.greenSection,
          { backgroundColor: isDark ? appColors.bgDark : appColors.white },
        ]}
      >
        <View style={styles.sheetDash} />
        <UserDetails RideData={ride} />
        <View
          style={[
            styles.bottomView,
            { backgroundColor: isDark ? appColors.bgDark : colors.card },
          ]}
        >
          <Text
            style={[
              styles.text,
              { color: colors.text, textAlign: textRtlStyle },
            ]}
          >
            {translateData.offerYourFare}
          </Text>

          <View
            style={[
              styles.boxContainer,
              {
                backgroundColor: colors.background,
                flexDirection: viewRtlStyle,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleDecrement}
              style={[
                styles.boxLeft,
                {
                  backgroundColor: colors.card,
                  opacity: isMinusDisabled ? 0.5 : 1,
                },
              ]}
              disabled={isMinusDisabled}
            >
              <Text
                style={[
                  styles.value,
                  { color: isDark ? appColors.white : appColors.primaryFont },
                ]}
              >
                -{increaseAmount}
              </Text>
            </TouchableOpacity>

            <View style={{ top: windowHeight(0.4) }}>
              <TextInput
                value={formatCurrency(value)}
                onChangeText={handleChange}
                keyboardType="numeric"
                style={[styles.textInput, { borderColor: colors.background }]}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleIncrement}
              style={[
                styles.boxRight,
                {
                  backgroundColor: colors.card,
                  opacity: isPlusDisabled ? 0.5 : 1,
                },
              ]}
              disabled={isPlusDisabled}
            >
              <Text
                style={[
                  styles.value,
                  { color: isDark ? appColors.white : appColors.primaryFont },
                ]}
              >
                +{increaseAmount}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.button}>
            <Button
              onPress={gotoAcceptFare}
              title={`${translateData.acceptFareon} ${zoneValue?.currency_symbol
                }${safeFare.toFixed(2)}`}
              backgroundColor={buttonColor}
              color={appColors.white}
              loading={bidload}
            />
          </View>
        </View>
      </View>
    </View>
  )
}
