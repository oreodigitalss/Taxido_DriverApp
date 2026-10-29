import React, { useCallback, useEffect, useRef } from 'react'
import {
  BackHandler,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import LottieView from 'lottie-react-native'
import Icons from '../../utils/icons/icons'
import appColors from '../../theme/appColors'
import { useValues } from '../../utils/context'
import { useDispatch, useSelector } from 'react-redux'
import styles from './styles'
import { Button } from '../../commonComponents'
import { fontSizes, windowHeight } from '../../theme/appConstant'
import appFonts from '../../theme/appFonts'
import { selfDriverData } from '../../api/store/action'
import {
  useFocusEffect,
  useIsFocused,
  useTheme,
} from '@react-navigation/native'
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet'
import { AppDispatch } from '../../api/store'
import { useAppNavigation } from '../../utils/navigation'
import getEchoInstance from '../../utils/echo'

export function Verification() {
  const { selfDriver } = useSelector((state: any) => state.account)
  const dispatch = useDispatch<AppDispatch>()
  const navigation = useAppNavigation()
  const { translateData } = useSelector((state: any) => state.setting)
  const retryTimeoutRef = useRef<any>(null)
  const echoChannelRef = useRef<any>(null)
  const bottomSheetRef = useRef<any>(null)
  const { viewRtlStyle, isDark } = useValues()
  const { colors } = useTheme()

  const isFocused = useIsFocused()

  useFocusEffect(
    useCallback(() => {
      dispatch(selfDriverData())
    }, [dispatch]),
  )

  useFocusEffect(
    useCallback(() => {
      const driverId = selfDriver?.id
      if (!driverId) {
        return
      }

      let echo: any = null
      const setupEcho = async () => {
        try {
          echo = await getEchoInstance()
          if (!echo) return
          const channelName = `document-verification.${driverId}`

          echo
            .private(channelName)
            .subscribed(() => {
            })
            .listen('.document.verified.' + driverId, (e: any) => {
              const data = e.data || e
              if (data?.is_verified == 1) {
                navigation.reset({ index: 0, routes: [{ name: 'TabNav' }] })
              }
            })
            .error((err: any) => {
              console.error('[Verification] [SOCKET] Subscription Error:', err)
            })

          // Log the global connection state
          echo.connector.pusher.connection.bind('state_change', (states: any) => {
          })

        } catch (error) {
          console.error('[Verification] Echo setup error:', error)
        }
      }

      setupEcho()

      return () => {
        if (echo) {
          const channelName = `document-verification.${driverId}`
          echo.leave(channelName)
        }
      }
    }, [selfDriver?.id]),
  )

  useEffect(() => {
    const backAction = () => {
      bottomSheetRef.current?.expand()
      return true
    }

    if (isFocused) {
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction,
      )
      return () => backHandler.remove()
    }
  }, [isFocused])

  const handleExit = () => {
    BackHandler.exitApp()
    bottomSheetRef.current?.close()
  }

  const handleCancel = () => {
    bottomSheetRef.current?.close()
  }

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        pressBehavior="close"
        appearsOnIndex={0}
        disappearsOnIndex={-1}
      />
    ),
    [],
  )

  const gotoDocUpdate = () => {
    navigation.navigate('DocumentDetail', { NavValue: 1 })
  }

  const hasRejectedDocument = Array.isArray(selfDriver?.documents)
    ? selfDriver?.documents.some((doc: any) => doc?.status === 'rejected')
    : false

  return (
    <View style={{ height: '100%' }}>
      <View
        style={{ height: '10%', backgroundColor: colors.card, width: '100%' }}
      >
        <Text
          style={{
            top: windowHeight(3.8),
            justifyContent: 'center',
            textAlign: 'center',
            fontSize: fontSizes.FONT5,
            fontFamily: appFonts.medium,
            color: colors.text,
          }}
        >
          {translateData.verification}
        </Text>
      </View>

      <View
        style={[
          styles.main,
          {
            backgroundColor: isDark
              ? appColors.bgDark
              : appColors.graybackground,
          },
        ]}
      >
        <LottieView
          source={require('../../assets/gif/under_process.json')}
          autoPlay
          loop
          style={styles.image}
        />
        <View style={[styles.container, { flexDirection: viewRtlStyle }]}>
          <Text
            style={[
              styles.title,
              { color: isDark ? appColors.white : appColors.primaryFont },
            ]}
          >
            {translateData.verificationProcess}
          </Text>
          <Icons.Info />
        </View>
        <Text
          style={[
            styles.text,
            { color: isDark ? appColors.darkText : appColors.darkBorderBlack },
          ]}
        >
          {translateData.verificationNote}
        </Text>

        <View style={[styles.btn, { marginBottom: windowHeight(2) }]}>
          <Button
            title={translateData.chatwithstaf}
            backgroundColor={appColors.primary}
            color={appColors.white}
            onPress={() =>
              navigation.navigate('Chat', {
                driverId: selfDriver?.id,
                from: 'help',
                riderName: selfDriver?.name,
              })
            }
          />
        </View>

        {hasRejectedDocument && (
          <View style={styles.btn}>
            <Button
              title={translateData.updateDocument}
              backgroundColor={appColors.primary}
              color={appColors.white}
              onPress={gotoDocUpdate}
            />
          </View>
        )}
      </View>
      <Button
        title="Back to Login"
        textDecorationLine={'underline'}
        onPress={() => {
          navigation.navigate('Login')
        }}
      />
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['20%']}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        handleIndicatorStyle={{
          backgroundColor: appColors.primary,
          width: '13%',
        }}
      >
        <BottomSheetView style={{ paddingHorizontal: windowHeight(2) }}>
          <TouchableWithoutFeedback>
            <TouchableOpacity
              style={[styles.modalContainer, { backgroundColor: colors.card }]}
              activeOpacity={1}
            >
              <Text
                style={[
                  styles.modalTitle,
                  { color: isDark ? appColors.white : appColors.primaryFont },
                ]}
              >
                {translateData.exitMsg}
              </Text>
              <View
                style={[
                  styles.buttonContainer,
                  { flexDirection: viewRtlStyle },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.button,
                    {
                      backgroundColor: isDark
                        ? colors.background
                        : appColors.graybackground,
                    },
                  ]}
                  onPress={handleExit}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      {
                        color: isDark ? appColors.white : appColors.primaryFont,
                      },
                    ]}
                  >
                    {translateData.exit}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={handleCancel}>
                  <Text style={styles.buttonText}>{translateData.cancel}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableWithoutFeedback>
        </BottomSheetView>
      </BottomSheet>
    </View>
  )
}
