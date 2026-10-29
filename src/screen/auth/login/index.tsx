import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { BackHandler, View } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'
import styles from './styles'
import appColors from '../../../theme/appColors'
import { Background, Header } from '../component'
import { LoginView } from './component/'
import { useValues } from '../../../utils/context'
import { AppDispatch } from '../../../api/store'
import {
  fleetsLogin,
  taxidosettingDataGet,
  userLogin,
} from '../../../api/store/action'
import { notificationHelper } from '../../../commonComponents'
import {
  DriverLoginInterface,
  FleetLoginInterface,
} from '../../../api/interface/authInterface'
import { getValue, setValue } from '../../../utils/localstorage'
import { useAppNavigation } from '../../../utils/navigation'
import { getFCMToken } from '../../../utils/pushNotificationHandler'

import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin'
import { selfDriverData, socialLogin } from '../../../api/store/action'
import { SocialLoginInterface } from '../../../api/interface/authInterface'

export function Login() {
  const { translateData } = useSelector((state: any) => state.setting)
  const [cca2, setCca2] = useState('IN')
  const { isDark, Google_Sign_Key, setToken } = useValues()
  const dispatch = useDispatch<AppDispatch>()
  const navigation = useAppNavigation()
  const [phoneNumber, setPhoneNumber] = useState<string>('')
  const [loginError, setLoginError] = useState('')
  const [countryCode, setCountryCode] = useState('+91')
  const [demouser, setDemouser] = useState<boolean>(false)
  const [fcmToken, setFcmToken] = useState<string>('')
  const isFocused = useIsFocused()
  const formattedCountryCode = useMemo(() => {
    return countryCode.startsWith('+') ? countryCode.substring(1) : countryCode
  }, [countryCode])
  const [driverLoading, setDriverLoading] = useState<boolean>(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [fleetLoading, setFleetLoading] = useState<boolean>(false)
  const phoneOtpRequestInProgress = useRef(false)

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: Google_Sign_Key,
      offlineAccess: true,
      hostedDomain: '',
      forceCodeForRefreshToken: true,
      scopes: ['email', 'profile'],
    })
  }, [Google_Sign_Key])

  const handleGoogleLogin = async () => {
    if (googleLoading) return
    setGoogleLoading(true)

    try {
      await GoogleSignin.hasPlayServices()
      const response = await GoogleSignin.signIn()
      if (response.type === 'cancelled') {
        notificationHelper('', 'Google sign-in was cancelled.', 'warn')
        return
      }

      const { idToken, user } = response.data
      if (!idToken || !user.email?.trim()) {
        notificationHelper('', 'Google did not return a valid identity token and email. Please try again.', 'error')
        return
      }

      const payload: SocialLoginInterface = {
        login_type: 'google',
        user: { email: user.email, name: user.name, photo: user.photo },
        id_token: idToken,
        fcm_token: fcmToken,
      }
      const responseData: any = await dispatch(socialLogin(payload)).unwrap()
      const data = responseData?.data || responseData
      const accessToken = data?.access_token || data?.token

      if (!data?.success || typeof accessToken !== 'string' || !accessToken.trim()) {
        const message = data?.message || 'Google sign-in could not be completed. Please try again.'
        notificationHelper('', message, 'error')
        return
      }

      await setValue('token', accessToken)
      await setValue('userType', 'driver')
      setToken(accessToken)
      dispatch(selfDriverData())

      if (data?.is_verified === '0' || data?.is_verified === 0) {
        navigation.navigate('Verification')
      } else {
        navigation.navigate('TabNav')
      }
    } catch (error: any) {
      const message = isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED
        ? 'Google sign-in was cancelled.'
        : error?.payload?.message || error?.message || 'Google sign-in failed. Please try again.'
      notificationHelper('', message, 'error')
    } finally {
      setGoogleLoading(false)
    }
  }

  useEffect(() => {
    dispatch(taxidosettingDataGet())
    const fetchToken = async () => {
      try {
        const token = await getValue('fcmToken')
        if (token) {
          setFcmToken(token)
        } else {
          const newToken = await getFCMToken()
          if (newToken) {
            setFcmToken(newToken)
            await setValue('fcmToken', newToken)
          }
        }
      } catch (error) { }
    }
    if (isFocused) {
      fetchToken()
    }
  }, [isFocused])

  const gotoOTP = useCallback(
    async (userType: string) => {
      if (phoneOtpRequestInProgress.current) return
      phoneOtpRequestInProgress.current = true
      setLoginError('')
      setDriverLoading(true)
      const identifier = phoneNumber.trim()
      const payload: DriverLoginInterface = {
        email_or_phone: identifier,
        country_code: formattedCountryCode,
        fcm_token: fcmToken,
      }

      try {
        const res = await dispatch(userLogin(payload)).unwrap()
        if (res?.success) {
          await setValue('userType', userType)
          navigation.navigate('Otp', {
            countryCode,
            phoneNumber: identifier,
            demouser,
            cca2,
            userType,
          })
          notificationHelper(
            '',
            translateData?.otpSend || 'OTP sent successfully',
            'success',
          )
        } else {
          const backendMessage = res?.message || 'Unable to sign in. Please try again.'
          setLoginError(backendMessage)
          notificationHelper('', backendMessage, 'error')
        }
      } catch (error: any) {
        const backendMessage =
          error?.message ||
          translateData?.loginFailed ||
          'Unable to sign in. Check the backend connection and try again.'
        setLoginError(backendMessage)
        notificationHelper('', backendMessage, 'error')
      } finally {
        phoneOtpRequestInProgress.current = false
        setDriverLoading(false)
      }
    },
    [
      dispatch,
      phoneNumber,
      formattedCountryCode,
      navigation,
      demouser,
      translateData,
      cca2,
      countryCode,
      fcmToken,
    ],
  )

  const gotoOTPFleet = useCallback(
    async (userType: string) => {
      setLoginError('')
      const identifier = phoneNumber.trim()
      const payload: FleetLoginInterface = {
        email_or_phone: identifier,
        country_code: formattedCountryCode,
        fcm_token: fcmToken,
      }

      try {
        const res = await dispatch(fleetsLogin(payload)).unwrap()
        if (res?.success) {
          await setValue('userType', userType)
          navigation.navigate('Otp', {
            countryCode,
            phoneNumber,
            demouser,
            cca2,
            userType,
          })
          notificationHelper(
            '',
            translateData?.otpSend,
            'success',
          )
          setFleetLoading(false)
        } else {
          const message = res?.message || 'Unable to sign in. Please try again.'
          setLoginError(message)
          notificationHelper('', message, 'error')
          setFleetLoading(false)
        }
      } catch (error: any) {
        const message =
          error?.message ||
          translateData?.loginFailed ||
          'Unable to sign in. Check the backend connection and try again.'
        setLoginError(message)
        notificationHelper('', message, 'error')
        setFleetLoading(false)
      }
    },
    [
      dispatch,
      phoneNumber,
      formattedCountryCode,
      navigation,
      demouser,
      translateData,
      cca2,
      countryCode,
      fcmToken,
    ],
  )


  useEffect(() => {
    const backAction = () => {
      BackHandler.exitApp()
      return true
    }

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    )

    return () => backHandler.remove()
  }, [])

  return (
    <View
      style={[
        styles.main,
        {
          backgroundColor: isDark
            ? appColors.darkThemeSub
            : appColors.graybackground,
        },
      ]}
    >
      <Header
        showBackButton={false}
        backgroundColor={isDark ? appColors.bgDark : appColors.graybackground}
      />
      <Background />
      <View style={styles.loginView}>
        <LoginView
          googleLogin={handleGoogleLogin}
          googleLoading={googleLoading}
          gotoOTP={() => {
            setDriverLoading(false)
            gotoOTP('driver')
          }}
          driverLoading={driverLoading}
          setDriverLoading={setDriverLoading}
          fleetLoading={fleetLoading}
          setFleetLoading={setFleetLoading}
          gotoOTPFleet={gotoOTPFleet}
          phoneNumber={phoneNumber}
          setPhoneNumber={setPhoneNumber}
          requestError={loginError}
          clearRequestError={() => setLoginError('')}
          cca2={cca2}
          countryCode={countryCode}
          setCountryCode={setCountryCode}
          borderColor={
            isDark ? appColors.primaryFont : appColors.graybackground
          }
          setCca2={setCca2}
          demouser={demouser}
        />
      </View>
    </View>
  )
}
