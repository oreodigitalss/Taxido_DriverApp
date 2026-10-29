import React, { useEffect, useState } from 'react'
import { Keyboard, View } from 'react-native'
import { AuthTemplate } from '../component/authTemplate'
import { AuthTitle } from '../../login/component/authtitle'
import { Button, notificationHelper } from '../../../../commonComponents'
import appColors from '../../../../theme/appColors'
import Images from '../../../../utils/images/images'
import { style } from './style'
import { useRoute } from '@react-navigation/native'
import OTPTextView from 'react-native-otp-textinput'
import { useValues } from '../../../../utils/context'
import { windowWidth } from '../../../../theme/appConstant'
import { VerifyOtpInterface } from '../../../../api/interface/authInterface'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { selfDriverData, userVerifyOtp } from '../../../../api/store/action'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch } from '../../../../api/store'
import { getValue, setValue } from '../../../../utils/localstorage'
import { useAppNavigation } from '../../../../utils/navigation'

export function OtpVerify() {
  const { navigate } = useAppNavigation()
  const { isDark, viewRtlStyle } = useValues()
  const [warning, setWarning] = useState('')
  const route = useRoute<any>()
  const email = route.params?.email ?? ''
  const demouser = route.params || {}
  const [enteredOtp, setEnteredOtp] = useState(
    demouser?.demouser ? '123456' : '',
  )
  const [fcmToken, setFcmToken] = useState('')
  const dispatch = useDispatch<AppDispatch>()
  const [success, setSuccess] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')
  const { loading } = useSelector((state: any) => state.auth)
  const { translateData } = useSelector((state: any) => state.setting)

  const handleChange = (otp: string) => {
    setEnteredOtp(otp)
    if (otp.length == 6) {
      Keyboard.dismiss()
    } else {
      setWarning('')
    }
  }

  useEffect(() => {
    const fetchToken = async () => {
      let fcmToken = await AsyncStorage.getItem('fcmToken')
      if (fcmToken) {
        setFcmToken(fcmToken)
      }
    }
    fetchToken()
  }, [])

  const handleVerify = () => {
    let payload: VerifyOtpInterface = {
      email_or_phone: email,
      phone: null,
      country_code: null,
      token: enteredOtp,
      email: email,
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
        if (!data?.success && !accessToken) {
          notificationHelper('', translateData.incorrectOTP, 'error')
        } else if (isRegistered) {
          await setValue('token', accessToken)
          await setValue('userType', 'driver')
          const value = await getValue('CountinueScreen')
          // Keep the app auth context in sync with the persisted API token.
          navigate('TabNav')
          dispatch(selfDriverData())
        } else {
          if (!isRegistered) {
            const value = await getValue('CountinueScreen')

            navigate('CreateAccount')
            setSuccess(false)
            setMessage(data?.message || translateData.noLinkAccount)
          } else {
            notificationHelper(
              '',
              translateData.incorrectOTP,
              'error',
            )
            setSuccess(false)
            setMessage(translateData.incorrectOtpWarn)
          }
        }
      })
      .catch((error: any) => {
        setSuccess(false)
        setMessage(error?.message || translateData.verifyWarn)
      })
  }

  return (
    <AuthTemplate image={Images.otpVerify}>
      <AuthTitle
        title={translateData.otpVerification}
        subTitle={`${translateData.enterOtp} ${email}`}
      />
      <View style={[style.otpContainer, { flexDirection: viewRtlStyle }]}>
        <OTPTextView
          containerStyle={[style.otpContainer, { flexDirection: viewRtlStyle }]}
          textInputStyle={[
            style.otpInput,
            {
              backgroundColor: isDark
                ? appColors.primaryFont
                : appColors.graybackground,
              color: isDark ? appColors.white : appColors.primaryFont,
            },
          ]}
          handleTextChange={handleChange}
          inputCount={6}
          keyboardType="numeric"
          tintColor="transparent"
          offTintColor="transparent"
          autofillFromClipboard={false}
          defaultValue={enteredOtp}
        />
      </View>
      <View style={style.sendBtn}>
        <Button
          backgroundColor={appColors.primary}
          title={translateData.verify}
          color={appColors.white}
          onPress={handleVerify}
          margin={windowWidth(0)}
          loading={loading}
        />
      </View>
    </AuthTemplate>
  )
}
