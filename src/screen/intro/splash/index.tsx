import React, { useEffect, useState, useCallback } from "react";
import { Alert, Image, View, BackHandler, Linking, Text, TouchableOpacity, Platform } from "react-native";
import { CommonModal } from "../../../commonComponents/commonModal";
import images from "../../../utils/images/images";
import styles from "./styles";
import { getValue, setValue, deleteValue } from "../../../utils/localstorage/index";
import { selfDriverData, settingDataGet, translateDataGet, taxidosettingDataGet, languageDataGet } from "../../../api/store/action";
import { useDispatch, useSelector } from "react-redux";
import { useAppNavigation } from "../../../utils/navigation";
import DeviceInfo from "react-native-device-info";
import { AppDispatch } from "../../../api/store";
import { requestLocationPermission, requestNotificationPermission } from "../../../commonComponents/helper/permissionHelper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useValues } from "../../../utils/context";
import { resetRateLimit } from "../../../api/rateLimiter";
import { resetThrottler } from "../../../api/requestThrottler";

export function Splash() {
  const { replace } = useAppNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { settingData, taxidoSettingData, translateData } = useSelector((state: any) => state.setting);
  const [splashImage, setSplashImage] = useState<string | null>(null);
  const [showNoInternet, setShowNoInternet] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const { zoneValue } = useSelector((state: any) => state.zoneUpdate)
  const { setRtl } = useValues()


  useEffect(() => {
    const setDefaultLanguage = async () => {
      if (Array.isArray(settingData) || !settingData?.values?.general?.default_language) return;

      const defaultLang = settingData.values.general.default_language.locale;

      let storedLang = await getValue('selectedLanguage');
      if (storedLang) {
        storedLang = storedLang.replace(/^"|"$/g, '');
      }
console.log();


      if (storedLang != null) {
        const isRTL = storedLang === 'ar';
        setRtl(isRTL);
        AsyncStorage.setItem('rtl', JSON.stringify(isRTL));

      } else {
        const isRTL = defaultLang === 'ar';
        setRtl(isRTL);
        AsyncStorage.setItem('rtl', JSON.stringify(isRTL));
      }
    };

    setDefaultLanguage();
  }, [settingData]);




  useEffect(() => {
    const loadSplashImage = async () => {
      try {
        const cachedImage = await getValue('splashImage')
        if (cachedImage) {
          setSplashImage(cachedImage);
        }
      } catch (error) {

      }
    }
    loadSplashImage()
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      // Clear any session-level locks on app start
      resetRateLimit();
      resetThrottler();

      await dispatch(translateDataGet()),
        await dispatch(taxidosettingDataGet()),
        await dispatch(settingDataGet()),
        await dispatch(selfDriverData())
      // await dispatch(languageDataGet())
    };
    fetchData();
  }, [dispatch]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 2. Request permissions sequentially
        const granted = await requestLocationPermission();
        if (granted) {
          try { await requestNotificationPermission(); } catch { }

          // 3. Small delay (2s) so the user can see the brand/splash 
          // and to ensure all state updates are committed.
          setTimeout(() => {
            proceedToNextScreen();
          }, 2000);

        } else {
          Alert.alert(
            "Permission Required",
            "Location permission is needed to continue.",
            [
              { text: "Open Settings", onPress: () => Linking.openSettings() },
              { text: "Exit", style: "destructive", onPress: () => BackHandler.exitApp() },
            ],
            { cancelable: false }
          );
        }
      } catch (error) {
        console.error("[Splash] Critical Init failure:", error);
      }
    };

    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);



  useEffect(() => {
    const updateSplashImage = async () => {
      const serverImage = taxidoSettingData?.cabbooking_values?.setting?.driver_splash_screen_url
      try {
        if (serverImage && typeof serverImage === 'string') {
          await setValue('splashImage', serverImage)
        } else {
          await deleteValue('splashImage')
        }
      } catch (error) {
      }
    }
    if (taxidoSettingData) {
      updateSplashImage()
    }
  }, [taxidoSettingData])

  useEffect(() => {
    const activation = settingData?.values?.maintenance;
    const maintenance_mode = activation?.maintenance_mode;

    if (maintenance_mode == '1') {
      setShowNoInternet(true);
    }
  }, [settingData]);


  const proceedToNextScreen = useCallback(async () => {
    try {
      const token = await getValue("token");
      const versionCode = await DeviceInfo.getVersion();
      const requiredVersion = taxidoSettingData?.cabbooking_values?.setting?.driver_app_version;
      const forceUpdate = taxidoSettingData?.cabbooking_values?.activation?.force_update == "1";


      if (forceUpdate && versionCode < requiredVersion) {
        setShowUpdateModal(true);
        return;
      }




      const waitForZone = async () => {
        if (token) {
          dispatch(selfDriverData())
            .unwrap()
            .then(res => {
              if (res?.status == 403 || !res?.id) {
                replace("OnBoarding");
              } else if (res?.is_verified == 0) {
                replace("Verification");
              } else {
                replace("TabNav");
              }
            })
            .catch(err => {
              console.log('er', err);
              // A stale cached session or an unavailable API must not trap the
              // user on the splash screen.
              replace('OnBoarding');
            });
        } else {
          replace("OnBoarding");
        }
      };
      await waitForZone();
    } catch (error) {
      console.error("Error in proceedToNextScreen:", error);
    }

  }, [dispatch, replace, taxidoSettingData, zoneValue]);

  if (showNoInternet) {
    return (
      <View></View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <Image
          source={splashImage ? { uri: splashImage } : images.splashDriver}
          style={styles.img}
          onError={() => {
            setSplashImage(null)
            deleteValue('splashImage')
          }}
        />
      </View>
      <CommonModal
        isVisible={showUpdateModal}
        value={
          <View style={styles.modalContent}>
            <View style={styles.modalImageContainer}>
              <Image
                source={images.splash}
                style={styles.modalImage}
              />
            </View>
            <Text style={styles.modalTitle}>{translateData?.updateRequired}</Text>
            <Text style={styles.modalMessage}>{translateData?.newVersions}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              activeOpacity={0.7}
              onPress={() => {
                const url = taxidoSettingData?.cabbooking_values?.setting?.driver_app_url;
                if (url) {
                  Linking.openURL(url);
                } else {
                  const bundleId = DeviceInfo.getBundleId();
                  const storeUrl = Platform.OS === 'ios'
                    ? `https://apps.apple.com/app/id` // Placeholder or try to find it
                    : `market://details?id=${bundleId}`;
                  Linking.openURL(storeUrl).catch(() => { });
                }
              }}
            >
              <Text style={styles.modalButtonText}>Update</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View >
  )
}
