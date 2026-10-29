import React, { useEffect, useRef, useState, useMemo } from 'react'
import { View, Platform, PermissionsAndroid } from 'react-native'
import Geolocation from '@react-native-community/geolocation'
import AsyncStorage from '@react-native-async-storage/async-storage'
import getEchoInstance from '../../../utils/echo'
import appColors from '../../../theme/appColors'

import WebView from 'react-native-webview'
import { useSelector } from 'react-redux'
import { useValues } from '../../../utils/context'

export function ArrivedMap({ Pickuplocation, driverId }: any) {
  const webViewRef = useRef<any>(null)
  const { taxidoSettingData } = useSelector((state: any) => state.setting)
  const [driverLocation, setDriverLocation] = useState<null | any>(null)
  const [isWebViewReady, setIsWebViewReady] = useState<boolean>(false)
  const [cachedRoute, setCachedRoute] = useState<null | any>(null)
  const { Google_Map_Key, isDark } = useValues()
  const { selfDriver } = useSelector((state: any) => state.account)
  const [mapType, setMapType] = useState(taxidoSettingData?.cabbooking_values?.location?.map_provider);

  const pickupLocation = useMemo(() => {
    if (!Pickuplocation) return null
    return {
      latitude: parseFloat(Pickuplocation?.lat),
      longitude: parseFloat(Pickuplocation?.lng),
    }
  }, [Pickuplocation])

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    if (!driverId) return;

    let echoInstance: any = null;
    let watchId: number | null = null;

    const setupTracking = async () => {
      const isMe = Number(driverId) === Number(selfDriver?.id);

      if (isMe) {
        // Fallback 1: Check selfDriver object for lat/lng
        if (selfDriver?.lat && selfDriver?.lng) {
          setDriverLocation({
            latitude: parseFloat(selfDriver.lat),
            longitude: parseFloat(selfDriver.lng)
          });
        }

        // Fallback 2: Check AsyncStorage
        try {
          const storedLat = await AsyncStorage.getItem('user_latitude');
          const storedLng = await AsyncStorage.getItem('user_longitude');
          if (storedLat && storedLng && !driverLocation) {
            setDriverLocation({
              latitude: parseFloat(storedLat),
              longitude: parseFloat(storedLng)
            });
          }
        } catch (e) {
          console.error("[ArrivedMap] AsyncStorage error:", e);
        }

        const granted = await requestLocationPermission();
        if (granted) {
          // Get initial position immediately
          Geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              setDriverLocation({ latitude, longitude });
            },
            (error) => console.error("[ArrivedMap] Geolocation initial error:", error),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
          );

          watchId = Geolocation.watchPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              setDriverLocation({ latitude, longitude });
            },
            (error) => console.error("[ArrivedMap] Geolocation watch error:", error),
            { enableHighAccuracy: true, distanceFilter: 10 }
          );
        }
      } else {
        try {
          echoInstance = await getEchoInstance();
          if (!echoInstance) return;

          const channel = echoInstance.join(`driver-notification.${driverId}`);

          channel.here((users: any[]) => {
            const driverData = users.find((u: any) => u.driver_id === Number(driverId) || u.id === Number(driverId));
            if (driverData && driverData.lat && driverData.lng) {
              setDriverLocation({
                latitude: parseFloat(driverData.lat),
                longitude: parseFloat(driverData.lng),
              });
            }
          });

          channel.listen('.driver.track_update', (data: any) => {
            if (data && data.lat && data.lng) {
              setDriverLocation({
                latitude: parseFloat(data.lat),
                longitude: parseFloat(data.lng),
              });
            }
          });

          channel.listen('.driver.location_updated', (data: any) => {
            if (data && data.lat && data.lng) {
              setDriverLocation({
                latitude: parseFloat(data.lat),
                longitude: parseFloat(data.lng),
              });
            }
          });
        } catch (err) {
          console.error("Echo init error:", err);
        }
      }
    };

    setupTracking();

    return () => {
      if (echoInstance) {
        echoInstance.leave(`driver-notification.${driverId}`);
      }
      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
      }
    };
  }, [driverId, selfDriver?.id]);

  useEffect(() => {
    if (isWebViewReady && cachedRoute && webViewRef.current) {
      const encodedPoints = cachedRoute?.overview_polyline?.points
      if (encodedPoints) {
        webViewRef.current.injectJavaScript(`
          try {
            window.setEncodedRoute("${encodedPoints}");
          } catch(e) {
            window.ReactNativeWebView.postMessage("ERR:setEncodedRoute:" + e.message);
          }
          true;
        `)
      }
    }
  }, [isWebViewReady, cachedRoute])

  useEffect(() => {
    if (isWebViewReady && driverLocation && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        try {
          window.updateDriverLocation(${driverLocation.latitude}, ${driverLocation.longitude});
        } catch(e) {
          window.ReactNativeWebView.postMessage("ERR:updateDriver:" + e.message);
        }
        true;
      `)
    }
  }, [driverLocation, isWebViewReady])

  const vehicleIcon = JSON.stringify(
    selfDriver?.vehicle_info?.vehicle_type_map_icon_url ||
    'https://maps.gstatic.com/mapfiles/ms2/micons/car.png',
  )



  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Live Map</title>
  <style>
    html, body, #map { 
      height: 100%; 
      margin: 0; 
      padding: 0; 
      background: ${isDark ? "#000" : "#fff"}; 
    }
    .leaflet-control-zoom { display: none !important; }
    .leaflet-routing-container { display: none !important; }
    .leaflet-routing-alternatives-container { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>

  ${(mapType === "google_map" || mapType === "google")
      ? `
  <!-- GOOGLE MAP VERSION -->
  <script src="https://maps.googleapis.com/maps/api/js?key=${Google_Map_Key}"></script>
  <script>
    let map, driverMarker, pickupMarker, directionsService, directionsRenderer;
    let pendingDriverPos = null;
    let didSetInitialZoom = false;

    // Original rich dark style
    const darkStyle = [
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
        featureType: "poi.park",
        elementType: "labels.text.fill",
        stylers: [{ color: "#6b9a76" }]
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
        featureType: "road",
        elementType: "labels.text.fill",
        stylers: [{ color: "#9ca5b3" }]
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
        featureType: "road.highway",
        elementType: "labels.text.fill",
        stylers: [{ color: "#f3d19c" }]
      },
      {
        featureType: "transit",
        elementType: "geometry",
        stylers: [{ color: "#2f3948" }]
      },
      {
        featureType: "transit.station",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }]
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
      },
      {
        featureType: "water",
        elementType: "labels.text.stroke",
        stylers: [{ color: "#17263c" }]
      }
    ];

    function initMap() {
      const pickupPos = {
        lat: ${pickupLocation?.latitude || 0},
        lng: ${pickupLocation?.longitude || 0}
      };

      map = new google.maps.Map(document.getElementById('map'), {
        center: pickupPos,
        zoom: 14,
        disableDefaultUI: true,
        styles: ${isDark ? "darkStyle" : "[]"}
      });

      pickupMarker = new google.maps.Marker({
        position: pickupPos,
        map: map,
        label: "P",
      });

      directionsService = new google.maps.DirectionsService();
      directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true,
        preserveViewport: true,
        polylineOptions: {
          strokeColor: '${appColors.primary}',
          strokeOpacity: 1.0,
          strokeWeight: 4,
        },
      });

      if (pendingDriverPos) {
        const { lat, lng } = pendingDriverPos;
        pendingDriverPos = null;
        setTimeout(() => window.updateDriverLocation(lat, lng), 0);
      }

      setTimeout(() => window.ReactNativeWebView?.postMessage("WebViewReady"), 500);
    }

    function drawRoute(driverPos, pickupPos) {
      directionsService.route(
        {
          origin: driverPos,
          destination: pickupPos,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(result);
          }
        }
      );
    }

    window.updateDriverLocation = function(lat, lng) {
      if (!map) {
        pendingDriverPos = { lat, lng };
        return;
      }

      const driverPos = new google.maps.LatLng(lat, lng);
      const pickupPos = new google.maps.LatLng(
        ${pickupLocation?.latitude || 0},
        ${pickupLocation?.longitude || 0}
      );

      if (!driverMarker) {
        driverMarker = new google.maps.Marker({
          position: driverPos,
          map: map,
          icon: {
            url: ${vehicleIcon},
            scaledSize: new google.maps.Size(50, 50),
            anchor: new google.maps.Point(25, 25),
          },
        });
      } else {
        driverMarker.setPosition(driverPos);
      }

      if (!didSetInitialZoom) {
        map.setZoom(16);
        didSetInitialZoom = true;
      }

      map.panTo(driverPos);
      drawRoute(driverPos, pickupPos);
    };

    window.addEventListener("load", initMap);
  </script>
  `
      : `
  <!--  LEAFLET (OpenStreetMap) VERSION -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet-routing-machine/dist/leaflet-routing-machine.js"></script>
  <script>
    let map, driverMarker, pickupMarker, routeControl;
    let pendingDriverPos = null;
    let didSetInitialZoom = false;
    let driverIconUrl = ${vehicleIcon};

    function initMap() {
      const pickupPos = [${pickupLocation?.latitude || 0}, ${pickupLocation?.longitude || 0}];

      map = L.map('map', {
        zoomControl: false,
        center: pickupPos,
        zoom: 14,
      });

      const tileLayer = ${isDark
        ? `L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 })`
        : `L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 })`
      };
      tileLayer.addTo(map);

      pickupMarker = L.marker(pickupPos, { title: "Pickup" }).addTo(map);

      if (pendingDriverPos) {
        const { lat, lng } = pendingDriverPos;
        pendingDriverPos = null;
        setTimeout(() => window.updateDriverLocation(lat, lng), 0);
      }

      setTimeout(() => window.ReactNativeWebView?.postMessage("WebViewReady"), 500);
    }

    function drawRoute(driverPos, pickupPos) {
      if (routeControl) map.removeControl(routeControl);

      routeControl = L.Routing.control({
        waypoints: [driverPos, pickupPos],
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: false,
        showAlternatives: false,
        createMarker: function() { return null; },
        routeWhileDragging: false,
        lineOptions: {
          styles: [{ color: '${appColors.primary}', opacity: 1, weight: 4 }]
        },
        altLineOptions: { styles: [] },
        summaryTemplate: '',
        instructions: false,
        formatter: new L.Routing.Formatter({
          language: 'en',
          roundingSensitivity: 0,
          distanceTemplate: ''
        }),
        pointMarkerStyle: { radius: 0, fillColor: 'transparent', stroke: false }
      }).addTo(map);
    }

    window.updateDriverLocation = function(lat, lng) {
      if (!map) {
        pendingDriverPos = { lat, lng };
        return;
      }

      const driverPos = L.latLng(lat, lng);
      const pickupPos = L.latLng(${pickupLocation?.latitude || 0}, ${pickupLocation?.longitude || 0});

      if (!driverMarker) {
        const icon = L.icon({ iconUrl: driverIconUrl, iconSize: [50, 50], iconAnchor: [25, 25] });
        driverMarker = L.marker(driverPos, { icon }).addTo(map);
      } else {
        driverMarker.setLatLng(driverPos);
      }

      if (!didSetInitialZoom) {
        map.setZoom(16);
        didSetInitialZoom = true;
      }

      map.panTo(driverPos);
      drawRoute(driverPos, pickupPos);
    };

    window.addEventListener("load", initMap);
  </script>
  `
    }
</body>
</html>
`;




  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        style={{ flex: 1 }}
        onMessage={event => {
          const msg = event.nativeEvent.data
          if (msg === 'WebViewReady') {
            setIsWebViewReady(true)
            // Replay driver location if already available
            if (driverLocation && webViewRef.current) {
              webViewRef.current.injectJavaScript(`
                window.updateDriverLocation(${driverLocation.latitude}, ${driverLocation.longitude});
                true;
              `)
            }
          }
        }}
      />
    </View>
  )
}
