import {
  View,
  Text,
  Platform,
  PermissionsAndroid,
  BackHandler,
  Modal,
  TouchableOpacity,
  TextInput,
} from 'react-native'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme, useRoute, useFocusEffect } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'
import {
  rideDataGets,
  rideDataPut,
  selfDriverData,
} from '../../../api/store/action'
import styles from './styles'
import commanStyles from '../../../style/commanStyles'
import {
  BackButton,
  Button,
  notificationHelper,
} from '../../../commonComponents'
import appColors from '../../../theme/appColors'
import { DriverProfile } from '../../../commonComponents'
import { Map } from '../../mapView'
import { useValues } from '../../../utils/context'
import Geolocation from 'react-native-geolocation-service'
import OTPTextView from 'react-native-otp-textinput'
import {
  fontSizes,
  windowHeight,
  windowWidth,
} from '../../../theme/appConstant'
import appFonts from '../../../theme/appFonts'
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet'
import { FAB } from 'react-native-paper'
import Icons from '../../../utils/icons/icons'
import getEchoInstance from '../../../utils/echo'
import { rideDataGet } from '../../../api/store/action'
import { useAppNavigation } from '../../../utils/navigation'
import { AppDispatch } from '../../../api/store'


export function RideComplete() {
  const { viewRtlStyle } = useValues()
  const navigation = useAppNavigation()
  const { colors } = useTheme()
  const route = useRoute<any>()
  const dispatch = useDispatch<AppDispatch>()
  const { rideData }: any = route.params
  const [rideDataState, setRideDataState] = useState<any>(null)
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00')
  const [totalDistance, setTotalDistance] = useState<number>(0)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0)
  const [isRunning, setIsRunning] = useState<boolean>(true)
  const [endTime, setEndTime] = useState<string | null>(null)
  const [locations, setLocations] = useState<any>(null)
  const { translateData } = useSelector((state: any) => state.setting)
  const [completeLoading, setCompleteLoading] = useState<boolean>(false)
  const { isDark } = useValues()
  const [otp, setOtp] = useState<string>('')
  const [correctOtp, setCorrectOtp] = useState<string>('')
  const bottomSheetModalRef = useRef<BottomSheetModal>(null)
  const otpBottomSheetRef = useRef<BottomSheetModal>(null)
  const [isOtpSheetOpen, setIsOtpSheetOpen] = useState<boolean>(false)
  const isVerificationSuccess = useRef<boolean>(false)
  const [showActions, setShowActions] = useState<boolean>(false)
  const [showExtraFareSheet, setShowExtraFareSheet] = useState<boolean>(false)
  const [visible, setVisible] = useState<boolean>(false)

  const [extraFareCharges, setExtraFareCharges] = useState<
    Array<{ id: string; title: string; amount: string }>
  >([])
  const extraFareSheetRef = useRef<BottomSheetModal>(null)
  const inputTextColor = isDark ? appColors.white : appColors.black
  const placeholderColor = isDark ? appColors.darkText : appColors.primaryFont
  const totalAmount = extraFareCharges?.reduce((sum, item) => {
    return sum + Number(item?.amount || 0)
  }, 0)
  const { zoneValue } = useSelector((state: any) => state.zoneUpdate)

  useEffect(() => {
    if (!rideData?.id) return;

    let echoInstance: any = null;

    const setupEcho = async () => {
      try {
        echoInstance = await getEchoInstance();
        if (!echoInstance) return;

        // Fetch initial data
        dispatch(rideDataGet(rideData.id))
          .unwrap()
          .then((res: any) => {
            setRideDataState(res);
          });

        echoInstance.private(`ride-status.${rideData.id}`)
          .listen('.ride.status', (data: any) => {
            const statusData = data?.ride || data;
            setRideDataState(statusData);
          });
      } catch (err) {
        console.error('[RideComplete] Echo error:', err);
      }
    };

    setupEcho();

    return () => {
      if (echoInstance) {
        echoInstance.leave(`ride-status.${rideData.id}`);
      }
    };
  }, [rideData?.id]);

  useEffect(() => {
    bottomSheetModalRef.current?.present()
    isVerificationSuccess.current = false
  }, [])

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (isOtpSheetOpen) {
          otpBottomSheetRef.current?.close()
          return true
        } else {
          navigation.navigate('TabNav')
          return true
        }
      }

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      )

      return () => subscription.remove()
    }, [isOtpSheetOpen, navigation]),
  )

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      )
      return granted === PermissionsAndroid.RESULTS.GRANTED
    }
    return true
  }

  useEffect(() => {
    const startLocationTracking = async () => {
      const hasPermission = await requestLocationPermission()
      if (!hasPermission) {
        return
      }
      const watchId = Geolocation.watchPosition(
        position => {
          const { latitude, longitude } = position?.coords
          setLocations({ latitude, longitude })
        },
        error => { },
        { enableHighAccuracy: true, distanceFilter: 100, interval: 5000 },
      )
      return () => Geolocation.clearWatch(watchId)
    }
    startLocationTracking()
    return () => {
      Geolocation.stopObserving()
    }
  }, [])

  const getCurrentTime = () => new Date().toTimeString().slice(0, 8)

  useEffect(() => {
    if (isRunning && rideDataState?.start_time) {
      const timerInterval = setInterval(() => {
        const now = new Date()

        const startTimeDate = rideDataState.start_time.toDate
          ? rideDataState.start_time.toDate() // Firestore Timestamp object
          : new Date(rideDataState.start_time.seconds * 1000) // fallback if plain object

        const hours = startTimeDate.getHours()
        const minutes = startTimeDate.getMinutes()
        const seconds = startTimeDate.getSeconds()

        const startTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          hours,
          minutes,
          seconds,
        )

        if (!isNaN(startTime.getTime())) {
          const secondsGap = Math.floor(
            (now.getTime() - startTime.getTime()) / 1000,
          )
          setElapsedSeconds(secondsGap)

          // Format HH:MM:SS
          const hrs = Math.floor(secondsGap / 3600)
            .toString()
            .padStart(2, '0')
          const mins = Math.floor((secondsGap % 3600) / 60)
            .toString()
            .padStart(2, '0')
          const secs = (secondsGap % 60).toString().padStart(2, '0')

          setElapsedTime(`${hrs}:${mins}:${secs}`)
        }
      }, 1000)

      return () => clearInterval(timerInterval)
    }
  }, [isRunning, rideDataState?.start_time])

  const gotoComplete = async () => {
    if (rideDataState?.service?.service_type === 'parcel') {
      setCompleteLoading(true)
      try {
        dispatch(rideDataGet(rideDataState.id))
          .unwrap()
          .then((res: any) => {
            const fetchedOtp = res?.parcel_delivered_otp
            if (fetchedOtp) {
              setCorrectOtp(fetchedOtp)
              bottomSheetModalRef.current?.close()
              otpBottomSheetRef.current?.present(1)
            } else {
              notificationHelper('', translateData.deliveryOtp, 'error')
            }
          })
          .catch(() => {
            notificationHelper('', translateData.rideDetailsNotFound, 'error')
          })
          .finally(() => {
            setCompleteLoading(false)
          })
      } catch (error) {
        notificationHelper('', translateData.fetchDetails, 'error')
        setCompleteLoading(false)
      }
    } else {
      handleConfirm()
    }
  }

  const handleConfirm = (verifiedOtp: string | null = null) => {
    setCompleteLoading(true)
    const end = getCurrentTime()
    setEndTime(end)

    // Create a copy of the location coordinates array
    let updatedLocationCoordinates = [...(rideData?.location_coordinates || [])]

    // If there are location coordinates, update the last one (destination) with current GPS location
    if (updatedLocationCoordinates?.length > 0 && locations) {
      updatedLocationCoordinates[updatedLocationCoordinates?.length - 1] = {
        lat: locations.latitude.toString(),
        lng: locations.longitude.toString(),
      }
    }
    // If no location coordinates exist, create a new array with current location
    else if (locations) {
      updatedLocationCoordinates = [
        {
          lat: locations.latitude.toString(),
          lng: locations.longitude.toString(),
        },
      ]
    }

    const payloadData: any = {
      status: 'completed',
      end_time: end,
      distance: totalDistance.toFixed(2),
      distance_unit: 'km',
      location_coordinates: updatedLocationCoordinates,
      extra_charges:
        extraFareCharges?.map((item: any) => ({
          title: item?.title,
          amount: Number(item?.amount),
        })) || [],
    }

    if (verifiedOtp) {
      payloadData.parcel_delivered_otp = verifiedOtp
    }

    // Add extra fare charges to payload if any exist
    if (extraFareCharges?.length > 0) {
      payloadData.extra_fare_charges = extraFareCharges.map(charge => ({
        title: charge.title,
        amount: parseFloat(charge.amount),
      }))
    }

    dispatch(rideDataPut({ data: payloadData, ride_id: rideData?.id }))
      .then(async (res: any) => {
        if (res?.payload?.id) {
          dispatch(selfDriverData())
          dispatch(rideDataGets())
          navigation.navigate('RideDetails', { ride_Id: rideData?.id })
        } else {
          notificationHelper('', translateData.failedComplet, 'error')
        }
      })
      .catch(error => { })
      .finally(() => {
        setCompleteLoading(false)
      })
  }

  const otpVerify = () => {
    if (otp == correctOtp) {
      isVerificationSuccess.current = true
      otpBottomSheetRef.current?.close()
      handleConfirm(otp)
    } else {
      setOtp('')
      notificationHelper('', translateData.otpWrong, 'error')
    }
  }
  const otpVerify1 = (text: any) => {
    if (text == correctOtp) {
      isVerificationSuccess.current = true
      otpBottomSheetRef.current?.close()
      handleConfirm(text)
    } else {
      setOtp('')
      notificationHelper('', translateData.otpWrong, 'error')
    }
  }
  const handleOtpSheetChange = useCallback((index: number) => {
    setIsOtpSheetOpen(index >= 0)
  }, [])

  const handleOtpDismiss = useCallback(() => {
    setOtp('')
    if (!isVerificationSuccess.current) {
      bottomSheetModalRef.current?.present()
    }
  }, [])

  const gotoOtherMap = (maptype: any) => {
    navigation.navigate('MapWebView', {
      lat: rideDataState?.location_coordinates?.[
        rideDataState?.location_coordinates?.length - 1
      ]?.lat,
      lng: rideDataState?.location_coordinates?.[
        rideDataState?.location_coordinates?.length - 1
      ]?.lng,
      type: maptype,
    })
  }

  const handleAddCharge = useCallback((newCharge: any) => {
    setExtraFareCharges(prevCharges => [...prevCharges, newCharge])
  }, [])

  const handleRemoveExtraFare = (id: string) => {
    setExtraFareCharges(prev => prev.filter(charge => charge.id !== id))
  }

  const handleSaveExtraFare = () => {
    extraFareSheetRef.current?.close()
    setShowExtraFareSheet(false)
    setShowActions(false) // Hide FAB when extra fare sheet is closed
  }

  const handleExtraFareSheetChange = useCallback((index: number) => {
    setShowExtraFareSheet(index >= 0)
    if (index >= 0) {
      setShowActions(false) // Hide FAB when extra fare sheet is opened
    }
  }, [])

  useEffect(() => {
    setVisible(true)
  }, [])

  return (
    <View style={commanStyles.main}>
      {rideDataState?.service_category?.service_category_type !== 'rental' ? (
        <View style={styles.mapSection}>
          <Map
            stoplocation={
              rideDataState?.location_coordinates &&
                rideDataState.location_coordinates?.length > 2
                ? rideDataState.location_coordinates
                  .slice(1, -1)
                  .map((item: any) => ({
                    latitude: parseFloat(item.lat),
                    longitude: parseFloat(item.lng),
                  }))
                : [] // empty if no middle points
            }
            Destinationlocation={
              rideDataState?.location_coordinates?.[
              rideDataState.location_coordinates?.length - 1
              ]
            }
            driverId={rideDataState?.driver?.id}
            rideDetails={rideDataState}
          />
        </View>
      ) : (
        <View />
      )}
      <View style={styles.extraSection}></View>
      <View style={styles.backButton}>
        <BackButton />
      </View>

      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVisible(false)}
        onDismiss={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setVisible(false)}
          activeOpacity={0.9}
        >
          <View
            style={[
              styles.modalBox,
              {
                backgroundColor: isDark
                  ? appColors.darkThemeSub
                  : appColors.white,
              },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: isDark ? appColors.white : appColors.black },
              ]}
            >
              {translateData.goGoogleMap}
            </Text>
            <Text
              style={[
                styles.modalText,
                { color: isDark ? appColors.darkText : appColors.primaryFont },
              ]}
            >
              {translateData.googleMapConfirm}
            </Text>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.closeIcon}
              onPress={() => setVisible(false)}
            >
              <Icons.CloseSimple color={appColors.black} />
            </TouchableOpacity>
            <View
              style={[
                {
                  flexDirection: viewRtlStyle,
                  justifyContent: 'space-between',
                  alignItems: 'center',
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.closeButton}
                onPress={() => {
                  gotoOtherMap('google')
                  setVisible(false)
                }}
              >
                <Text style={styles.closeText}>{translateData.googleMap}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <BottomSheetModalProvider>
        {showActions && !showExtraFareSheet && (
          <>
            <FAB
              icon={Icons.GoogleMap}
              style={[
                styles.fabMini,
                {
                  backgroundColor: isDark
                    ? appColors.darkThemeSub
                    : appColors.white,
                },
                { bottom: '57.5%' },
              ]}
              onPress={() => gotoOtherMap('google')}
            />
            <FAB
              icon={Icons.Wazemap}
              style={[
                styles.fabMini,
                {
                  backgroundColor: isDark
                    ? appColors.darkThemeSub
                    : appColors.white,
                },
                { bottom: '50%' },
              ]}
              onPress={() => gotoOtherMap('waze')}
            />
            <FAB
              icon={Icons.BingMap}
              style={[
                styles.fabMini,
                {
                  backgroundColor: isDark
                    ? appColors.darkThemeSub
                    : appColors.white,
                },
                { bottom: '42.5%' },
              ]}
              onPress={() => gotoOtherMap('bing')}
            />
          </>
        )}
        {!showExtraFareSheet && (
          <FAB
            icon={Icons.Map}
            style={[
              styles.fab,
              {
                backgroundColor: isDark
                  ? appColors.darkThemeSub
                  : appColors.white,
              },
            ]}
            onPress={() => setShowActions(!showActions)}
          />
        )}

        <BottomSheetModal
          ref={bottomSheetModalRef}
          index={0}
          snapPoints={['32%']}
          enablePanDownToClose={false}
          enableContentPanningGesture={false}
          enableHandlePanningGesture={false}
          handleIndicatorStyle={{
            backgroundColor: appColors.primary,
            width: '13%',
          }}
          backgroundStyle={{
            backgroundColor: isDark ? appColors.bgDark : appColors.white,
          }}
        >
          <BottomSheetView style={styles.bottomSheetlayer}>
            {rideData?.service_category?.service_category_type === 'rental' ? (
              <View
                style={[
                  styles.rideDataMainView,
                  { flexDirection: viewRtlStyle },
                ]}
              ></View>
            ) : null}
            <View style={styles.greenSection}>
              <View
                style={[
                  styles.additionalSection,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <DriverProfile
                  userDetails={rideData?.rider}
                  borderRadius={windowHeight(25)}
                  showInfoIcon={true}
                  iconColor={appColors.primary}
                  backgroundColor={appColors.white}
                  rideDetails={rideData}
                />
              </View>
              <View style={styles.buttonContainer}>
                <View style={styles.halfButton}>
                  {totalAmount > 0 ? (
                    <View>
                      <TouchableOpacity
                        style={{
                          height: windowHeight(6.5),
                          width: windowWidth(40),
                          backgroundColor: isDark
                            ? appColors.darkThemeSub
                            : appColors.lightGray,
                          borderRadius: windowWidth(2),
                          alignItems: 'center',
                          paddingVertical: windowHeight(1.5),
                          marginHorizontal: windowWidth(5),
                        }}
                        onPress={() => {
                          extraFareSheetRef.current?.present()
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: appFonts.regular,
                            fontSize: windowWidth(3.3),
                            color: isDark ? appColors.white : appColors.black,
                          }}
                        >
                          {translateData?.extra}
                        </Text>
                        <Text
                          style={{
                            fontFamily: appFonts.regular,
                            fontSize: fontSizes.FONT4,
                            color: isDark ? appColors.white : appColors.black,
                          }}
                        >
                          {rideData?.currency_symbol}
                          {totalAmount}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Button
                      onPress={() => {
                        extraFareSheetRef.current?.present()
                      }}
                      title={translateData?.addCharge}
                      backgroundColor={
                        isDark ? appColors.darkThemeSub : appColors.lightGray
                      }
                      color={isDark ? appColors.white : appColors.black}
                    />
                  )}
                </View>
                <View style={styles.halfButton}>
                  <Button
                    onPress={gotoComplete}
                    title={translateData.completeRides}
                    backgroundColor={appColors.primary}
                    color={appColors.white}
                    loading={completeLoading}
                  />
                </View>
              </View>
            </View>
          </BottomSheetView>
        </BottomSheetModal>

        <BottomSheetModal
          ref={otpBottomSheetRef}
          index={0}
          snapPoints={['30%']}
          onChange={handleOtpSheetChange}
          onDismiss={handleOtpDismiss}
          handleIndicatorStyle={{
            backgroundColor: colors.border,
            width: '13%',
          }}
          backgroundStyle={{ backgroundColor: colors.card }}
        >
          <BottomSheetView style={styles.otpSheetContainer}>
            <View>
              <Text style={[styles.otpTitle, { color: colors.text }]}>
                {translateData.deliveryOtps}
              </Text>
              <Text style={[styles.otpSubtitle, { color: colors.text }]}>
                {translateData.otpNotice}
              </Text>
            </View>
            <OTPTextView
              handleTextChange={text => {
                setOtp(text)

                if (text?.length == 4) {
                  otpVerify1(text) // pass the real 4-digit value
                }
              }}
              inputCount={4}
              keyboardType="numeric"
              tintColor={appColors.primary}
              offTintColor={colors.border}
              containerStyle={styles.otpContainer}
              textInputStyle={[
                styles.otpInput,
                { color: isDark ? appColors.white : appColors.black },
              ]}
            />

            <View style={styles.otpButtonContainer}>
              <Button
                title={translateData.verifyDone}
                backgroundColor={appColors.primary}
                color={appColors.white}
                onPress={otpVerify}
              />
            </View>
          </BottomSheetView>
        </BottomSheetModal>

        <BottomSheetModal
          ref={extraFareSheetRef}
          index={1}
          snapPoints={['45%']}
          onChange={handleExtraFareSheetChange}
          handleIndicatorStyle={{
            backgroundColor: appColors.primary,
            width: '13%',
          }}
          backgroundStyle={{
            backgroundColor: isDark ? appColors.bgDark : appColors.white,
          }}
        >
          <ExtraFareSheetContent
            translateData={translateData}
            isDark={isDark}
            appColors={appColors}
            colors={colors}
            zoneValue={zoneValue}
            charges={extraFareCharges}
            onAdd={handleAddCharge}
            onRemove={handleRemoveExtraFare}
            onSave={handleSaveExtraFare}
          />
        </BottomSheetModal>
      </BottomSheetModalProvider>
    </View>
  )
}

const ExtraFareSheetContent = React.memo(
  ({
    translateData,
    isDark,
    appColors,
    colors,
    zoneValue,
    charges,
    onAdd,
    onRemove,
    onSave,
  }: any) => {
    const [title, setTitle] = useState('')
    const [amount, setAmount] = useState('')
    const handleSave = () => {
      if (title.trim() && amount.trim()) {
        const amountValue = parseFloat(amount.trim())
        if (!isNaN(amountValue) && amountValue > 0) {
          onAdd({
            id: Date.now().toString(),
            title: title.trim(),
            amount: amountValue.toString(),
          })
        }
      }

      setTitle('')
      setAmount('')
      onSave()
    }

    const inputTextColor = isDark ? appColors.white : appColors.black
    const placeholderColor = isDark ? appColors.darkText : appColors.primaryFont

    const handleAdd = () => {
      if (!title.trim() || !amount.trim()) {
        notificationHelper('', translateData.enterBoth, 'error')
        return
      }

      const amountValue = parseFloat(amount.trim())
      if (isNaN(amountValue) || amountValue <= 0) {
        notificationHelper('', translateData.enterValidAmount, 'error')
        return
      }

      onAdd({
        id: Date.now().toString(),
        title: title.trim(),
        amount: amountValue.toString(),
      })

      setTitle('')
      setAmount('')
    }

    return (
      <BottomSheetView style={styles.extraFareSheetContainer}>
        <Text
          style={[
            styles.extraFareTitle,
            { color: isDark ? appColors.white : appColors.black },
          ]}
        >
          {translateData?.addCharge}
        </Text>

        <View style={styles.inputContainer}>
          <Text
            style={[
              styles.inputLabel,
              { color: isDark ? appColors.white : appColors.primaryFont },
            ]}
          >
            {translateData?.additinoalCharge}
          </Text>
          <View
            style={[
              styles.inputField,
              {
                backgroundColor: isDark
                  ? appColors.darkThemeSub
                  : appColors.lightGray,
                borderColor: colors.border,
              },
            ]}
          >
            <TextInput
              style={[
                styles.textInput,
                { color: isDark ? appColors.white : appColors.black },
              ]}
              placeholder={translateData?.enteradditonalcharge}
              placeholderTextColor={
                isDark ? appColors.darkText : appColors.primaryFont
              }
              value={title}
              onChangeText={setTitle}
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text
            style={[
              styles.inputLabel,
              { color: isDark ? appColors.white : appColors.black },
            ]}
          >
            {translateData?.chargeAmount}
          </Text>
          <View
            style={[
              styles.inputField,
              {
                backgroundColor: isDark
                  ? appColors.darkThemeSub
                  : appColors.lightGray,
                borderColor: colors.border,
              },
            ]}
          >
            <TextInput
              style={[
                styles.textInput,
                { color: isDark ? appColors.white : appColors.black },
              ]}
              placeholder={translateData?.chargeAmountplace}
              placeholderTextColor={placeholderColor}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
        </View>

        {charges?.length > 0 && (
          <View style={styles.chargesList}>
            <Text
              style={{
                color: colors.text,
                fontFamily: appFonts.medium,
                fontSize: windowWidth(3.9),
                marginBottom: windowHeight(1),
              }}
            >
              {translateData?.yourChareg}
            </Text>
            {charges.map((charge: any) => (
              <View
                key={charge?.id}
                style={[
                  styles.chargeItem,
                  {
                    backgroundColor: isDark
                      ? appColors.darkThemeSub
                      : appColors.lightGray,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chargeText,
                    { color: isDark ? appColors.white : appColors.black },
                  ]}
                >
                  {charge?.title}
                </Text>
                <View style={[styles.chargeRight]}>
                  <Text
                    style={[
                      styles.chargeAmount,
                      { color: isDark ? appColors.white : appColors.black },
                    ]}
                  >
                    {zoneValue?.currency_symbol}
                    {charge?.amount}
                  </Text>
                  <TouchableOpacity
                    onPress={() => onRemove(charge?.id)}
                    style={styles.removeButton}
                  >
                    <Icons.CloseSimple color={appColors.red} size={16} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.addMoreButton,
              {
                backgroundColor: isDark
                  ? appColors.darkThemeSub
                  : appColors.lightGray,
              },
            ]}
            onPress={handleAdd}
          >
            <Text
              style={[
                styles.actionButtonText,
                { color: isDark ? appColors.white : appColors.black },
              ]}
            >
              {translateData.addMore}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.saveButton,
              { backgroundColor: appColors.primary },
            ]}
            onPress={handleSave}
          >
            <Text style={[styles.actionButtonText, { color: appColors.white }]}>
              {translateData.saveCharges}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    )
  },
)
