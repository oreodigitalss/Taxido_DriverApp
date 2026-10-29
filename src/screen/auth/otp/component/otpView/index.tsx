import { View, Text, TouchableOpacity, Keyboard, Alert } from 'react-native'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import styles from './styles'
import { Button, notificationHelper } from '../../../../../commonComponents'
import appColors from '../../../../../theme/appColors'
import OTPTextView from 'react-native-otp-textinput'
import { LineAnimation } from '../../../login/component'
import { useNavigation, useTheme, useRoute, useIsFocused } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../../../../navigation/main/types'
import { useValues } from '../../../../../utils/context'
import { DriverLoginInterface, FleetVerifyOtpInterface, VerifyOtpInterface } from '../../../../../api/interface/authInterface'
import { selfDriverData, settingDataGet, userVerifyOtp, userLogin, fleetsVerifyOtp } from '../../../../../api/store/action/index'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch } from '../../../../../api/store/index'
import { getValue, setValue } from '../../../../../utils/localstorage/index'

import messaging from '@react-native-firebase/messaging';

type navigation = NativeStackNavigationProp<RootStackParamList>

const OtpView: React.FC = () => {
  const route = useRoute()
  const demouser = route.params || {}
  const { translateData, settingData } = useSelector((state: any) => state.setting)
  const demoMode = settingData?.values?.activation?.demo_mode == 1
  const [warning, setWarning] = useState('')
  const [enteredOtp, setEnteredOtp] = useState(demoMode == true ? '123456' : '')
  const { colors } = useTheme()
  const { viewRtlStyle } = useValues()
  const { textRtlStyle, isDark, setToken, token } = useValues()
  const countryCode = route.params?.countryCode ?? '91'
  const phoneNumber = route.params?.phoneNumber ?? '1234567890'
  const cca2 = route?.params?.cca2 ?? 'US'
  const userType = route?.params?.userType ?? ''

  const [message, setMessage] = useState<string>('')
  const [fcmToken, setFcmToken] = useState('')
  const [success, setSuccess] = useState<boolean>(false)
  const dispatch = useDispatch<AppDispatch>()
  const { navigate } = useNavigation<navigation>()
  const [loading, setLoading] = useState(false)
  const verificationInProgress = useRef(false)
  const emailOrPhone = demouser?.email_or_phone ?? phoneNumber
  const isEmail = emailOrPhone.includes('@')
  const input = useRef<OTPTextView>(null)
  const isFocused = useIsFocused()
  // The initial OTP was just requested before navigating here. Start the
  // resend cooldown immediately to prevent rapid repeat SMS requests.
  const [resendTimer, setResendTimer] = useState(30);
  const formattedCountryCode = useMemo(() => {
    if (!countryCode) return '';
    return countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
  }, [countryCode]);


  const handleChange = (otp: string) => {
    setEnteredOtp(otp)
    if (otp.length === 6) {
      Keyboard.dismiss()
      setWarning('')
    }
    else {
      setWarning(translateData?.validOtpEnter)
    }
  }

  useEffect(() => {
    const fetchToken = async () => {
      let fcmToken = await getValue('fcmToken')
      if (fcmToken) {
        setFcmToken(fcmToken)
      }
    }
    fetchToken()
  }, [isFocused])

  const handleVerify = async () => {
    if (!enteredOtp || enteredOtp.length < 6) {
      setWarning(translateData?.validOtpEnter || 'Please enter a valid 6-digit OTP')
      return
    }

    if (verificationInProgress.current) return
    verificationInProgress.current = true
    setLoading(true)
    setMessage('')
    setWarning('')

    const cleanCountryCode = String(countryCode).replace(/^\+/, '')

    // Verify the code through the same backend that sent it from driver/login.
    let payload: VerifyOtpInterface = {
      email_or_phone: phoneNumber,
      country_code: cleanCountryCode,
      token: enteredOtp,
      fcm_token: fcmToken,
    }

    dispatch(userVerifyOtp(payload))
      .unwrap()
      .then(async (res: any) => {
        const data = res?.data || res
        const accessToken = data?.access_token || data?.token
        const isRegistered = data?.is_registered === undefined
          ? Boolean(accessToken)
          : [true, 1, '1', 'true'].includes(data.is_registered)
        const isVerified = data?.is_verified
        const userId = data?.id || data?.user?.id

        if ((data?.success || accessToken) && isRegistered) {
          if (userId) {
            messaging().subscribeToTopic(`user_${userId}`).catch(() => {})
          }

          if (accessToken) {
            await setValue('token', accessToken)
            await setValue('userType', userType || 'driver')
            setToken(accessToken)
          }

          if (isVerified == '0' || isVerified === 0) {
            navigate('Verification')
          } else {
            navigate('TabNav')
          }
          dispatch(selfDriverData())
        } else if ((data?.success || isRegistered === false) && !isRegistered) {
          if (userId) {
            messaging().subscribeToTopic(`user_${userId}`).catch(() => {})
          }

          navigate('CreateAccount', {
            countryCode,
            phoneNumber,
            cca2,
            userType,
          })
          dispatch(settingDataGet())
          setSuccess(false)
          setMessage(data?.message || translateData?.noLinkAccount || 'Account not registered. Please create an account.')
        } else {
          setSuccess(false)
          setMessage(data?.message || translateData?.verifyWarn || 'Verification failed. Please try again.')
        }
      })
      .catch((error: any) => {
        setSuccess(false)
        setMessage(
          error?.message ||
          translateData?.verifyWarn ||
          'Phone verification failed. Please check your OTP and try again.',
        )
      })
      .finally(() => {
        verificationInProgress.current = false
        setLoading(false)
      })
  }


  const handleVerifyFleet = async () => {
    if (!enteredOtp || enteredOtp.length < 6) {
      setWarning(translateData?.validOtpEnter || 'Please enter a valid 6-digit OTP')
      return
    }

    if (verificationInProgress.current) return
    verificationInProgress.current = true
    setLoading(true)
    setMessage('')
    setWarning('')

    const cleanCountryCode = String(countryCode).replace(/^\+/, '')
    let payload: FleetVerifyOtpInterface = {
      email_or_phone: phoneNumber,
      country_code: cleanCountryCode,
      token: enteredOtp,
      email: null,
      fcm_token: fcmToken,
    }

    dispatch(fleetsVerifyOtp(payload))
      .unwrap()
      .then(async (res: any) => {
        const data = res?.data || res
        const accessToken = data?.access_token || data?.token
        const isRegistered = data?.is_registered === undefined
          ? Boolean(accessToken)
          : [true, 1, '1', 'true'].includes(data.is_registered)
        const isVerified = data?.is_verified
        const userId = data?.id || data?.user?.id

        if ((data?.success || accessToken) && isRegistered) {
          if (userId) {
            messaging().subscribeToTopic(`user_${userId}`).catch(() => {})
          }

          if (accessToken) {
            await setValue('token', accessToken)
            await setValue('userType', 'fleet')
            setToken(accessToken)
          }

          if (isVerified == '0' || isVerified === 0) {
            navigate('Verification')
          } else {
            navigate('TabNav')
          }
          dispatch(selfDriverData())
        } else if ((data?.success || isRegistered === false) && !isRegistered) {
          if (userId) {
            messaging().subscribeToTopic(`user_${userId}`).catch(() => {})
          }

          navigate('CreateAccount', {
            countryCode,
            phoneNumber,
            cca2,
            userType,
          })
          dispatch(settingDataGet())
          setSuccess(false)
          setMessage(data?.message || translateData?.noLinkAccount || 'Account not registered. Please create an account.')
        } else {
          setSuccess(false)
          setMessage(data?.message || translateData?.verifyWarn || 'Verification failed. Please try again.')
        }
      })
      .catch((error: any) => {
        setSuccess(false)
        setMessage(
          error?.message ||
          translateData?.verifyWarn ||
          'Fleet verification failed. Please check your OTP and try again.',
        )
      })
      .finally(() => {
        verificationInProgress.current = false
        setLoading(false)
      })
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [resendTimer])


  const handelGetOtp = async () => {
    setResendTimer(30)
    const payload: DriverLoginInterface = {
      email_or_phone: phoneNumber,
      country_code: formattedCountryCode.replace(/^\+/, ''),
      fcm_token: fcmToken,
    }

    try {
      const loginAction = userType === 'fleet' ? fleetsLogin : userLogin
      const res: any = await dispatch(loginAction(payload)).unwrap()
      if (res?.success) {
        await setValue('userType', userType)
        notificationHelper('', translateData?.otpSent || 'OTP sent successfully', 'success')
      } else {
        notificationHelper('', res?.message || 'Failed to send OTP', 'error')
      }
    } catch (error) {
      notificationHelper('', translateData?.loginFailed || 'Failed to send OTP', 'error')
    }
  }





  return (
    <View
      style={[
        styles.otpView,
        { backgroundColor: isDark ? appColors.darkThemeSub : appColors.white },
      ]}
    >
      <View style={styles.subView}>
        <View style={styles.space} />
        <LineAnimation />
        <Text
          style={[
            styles.otpVef,
            { color: colors.text, textAlign: textRtlStyle },
          ]}
        >
          {translateData?.otpVerification}
        </Text>


        <Text style={[styles.subtitle, { textAlign: textRtlStyle }]}>
          {isEmail
            ? `${translateData?.enterOtp} ${emailOrPhone}`
            : `${translateData?.enterOtp} ${formattedCountryCode} ${emailOrPhone}`}
        </Text>

        <Text
          style={[
            styles.title,
            { color: colors.text, textAlign: textRtlStyle },
          ]}
        >
          {translateData?.otp}
        </Text>
        <View style={[styles.inputContainer, { flexDirection: viewRtlStyle }]}>
          <OTPTextView
            containerStyle={[
              styles.otpContainer,
              { flexDirection: viewRtlStyle },
            ]}
            textInputStyle={[
              styles.otpInput,
              {
                color: colors.text,
              },
            ]}
            handleTextChange={handleChange}
            inputCount={6}
            keyboardType="numeric"
            tintColor={appColors.primary}
            offTintColor={isDark ? appColors.darkborder : appColors.line}
            defaultValue={enteredOtp}
          />
        </View>
        {warning !== '' && <Text style={styles.warningText}>{warning}</Text>}
        {message !== '' && <Text style={styles.warningText}>{message}</Text>}
      </View>

      <View style={styles.buttonView}>
        <Button
          title={translateData?.verify}
          onPress={() => {
            if (userType == 'fleet') {
              handleVerifyFleet();
            } else if (userType == 'driver') {
              handleVerify();
            }
          }}
          backgroundColor={appColors.primary}
          color={appColors.white}
          loading={loading}
        />
      </View>
      <View style={styles.subView}>
        <View style={[styles.retry, { flexDirection: viewRtlStyle }]}>
          {resendTimer === 0 ? (
            <Text style={styles.notReceive}>{translateData?.notReceived}</Text>
          ) : null}
          <TouchableOpacity
            onPress={() => {
              if (resendTimer === 0) {
                handelGetOtp()
              }
            }}
            activeOpacity={resendTimer === 0 ? 0.7 : 1}
            disabled={resendTimer !== 0}
          >
            <Text style={[styles.resend, { color: resendTimer === 0 ? colors.text : 'gray' }]}>
              {resendTimer === 0 ? translateData?.resendIt : `${translateData?.resendOtp} ${resendTimer}s`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

export default OtpView
