import { View, Text, TouchableOpacity, Image } from 'react-native'
import React, { useCallback, useState } from 'react'
import appColors from '../../../../../theme/appColors'
import styles from './styles'
import { Button } from '../../../../../commonComponents'
import { InputBox } from '../../../component'
import LoginViewProps from '../../types'
import { useFocusEffect, useTheme } from '@react-navigation/native'
import { useValues } from '../../../../../utils/context'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch } from '../../../../../api/store'
import { windowHeight, windowWidth } from '../../../../../theme/appConstant'
import { AuthTitle } from '../authtitle'
import {
  taxidosettingDataGet,
  translateDataGet,
} from '../../../../../api/store/action'
import {
  validateEmail,
  ValidatePhoneNumber,
} from '../../../../../utils/validation'
import CountrySelect from 'react-native-country-select'
import Icons from '../../../../../utils/icons/icons'

export function LoginView({
  gotoOTP,
  phoneNumber,
  setPhoneNumber,
  setCountryCode,
  borderColor,
  setCca2,
  driverLoading,
  setDriverLoading,

  fleetLoading,
  setFleetLoading,
  gotoOTPFleet,
  countryCode,
  cca2,
  requestError,
  clearRequestError,
  googleLogin,
  googleLoading,
}: LoginViewProps) {
  const [error, setError] = useState('')
  const [numberShow, setNumberShow] = useState(true)
  const [pickerVisible, setPickerVisible] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const { colors } = useTheme()
  const { textRtlStyle, viewRtlStyle, isDark, rtl } = useValues()
  const dispatch = useDispatch<AppDispatch>()
  const { translateData, settingData } = useSelector(
    (state: any) => state.setting,
  )

  useFocusEffect(
    useCallback(() => {
      dispatch(translateDataGet())
      dispatch(taxidosettingDataGet())
    }, [dispatch]),
  )

  const handlePhoneNumberChange = (value: string) => {
    clearRequestError?.()
    setError('')
    setPhoneNumber(value)
    setNumberShow(/^\d+$/.test(value))
  }

  const handleGetOTP = async (userType: string) => {
    setDriverLoading(true)
    const identifier = phoneNumber.trim()
    const isNumeric = /^\d+$/.test(identifier)

    if (isNumeric) {
      const msg = ValidatePhoneNumber(identifier)
      if (msg) {
        setError(msg)
        setDriverLoading(false)
        return
      }
    } else if (identifier.includes('@')) {
      const msg = validateEmail(identifier)
      if (msg) {
        setError(msg)
        setDriverLoading(false)
        return
      }
    } else {
      setError(
        translateData?.validPhoneEmail || 'Enter a valid phone number or email.',
      )
      setDriverLoading(false)
      return
    }

    setError('')
    await gotoOTP(userType)
  }

  // const handleGetOTPFleet = async (userType: string) => {
  //   if (setFleetLoading) setFleetLoading(true)
  //   const identifier = phoneNumber.trim()
  //   const isNumeric = /^\d+$/.test(identifier)

  //   if (isNumeric) {
  //     const msg = ValidatePhoneNumber(identifier)
  //     if (msg) {
  //       setError(msg)
  //       setFleetLoading?.(false)
  //       return
  //     }
  //   } else if (identifier.includes('@')) {
  //     const msg = validateEmail(identifier)
  //     if (msg) {
  //       setError(msg)
  //       setFleetLoading?.(false)
  //       return
  //     }
  //   } else {
  //     setError(
  //       translateData?.validPhoneEmail || 'Enter a valid phone number or email.',
  //     )
  //     setFleetLoading?.(false)
  //     return
  //   }

  //   setError('')
  //   await gotoOTPFleet(userType)
  // }

  return (
    <View
      style={[
        styles.main,
        { backgroundColor: isDark ? appColors.darkThemeSub : appColors.white },
      ]}
    >
      <View style={styles.subView}>
        <AuthTitle
          title={translateData?.authTitle || 'Welcome back'}
          subTitle={translateData?.subTitle || 'Sign in with your phone number or email'}
        />

        <View
          style={[
            styles.countryCodeContainer,
            {
              flexDirection: viewRtlStyle,
              justifyContent: numberShow ? 'flex-start' : 'center',
              width: '100%',
            },
          ]}
        >
          {numberShow && (
            <View
              style={[
                styles.codeComponent,
                {
                  marginRight: rtl ? 0 : windowWidth(2),
                  marginLeft: rtl ? windowWidth(2) : 0,
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.countryCode,
                  {
                    backgroundColor: isDark
                      ? appColors.primaryFont
                      : appColors.graybackground,
                    borderColor: isFocused
                      ? appColors.primary
                      : borderColor || colors.border,
                  },
                ]}
                onPress={() => {
                  setIsFocused(true)
                  setPickerVisible(true)
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.codeText,
                    { color: isDark ? appColors.white : appColors.black },
                  ]}
                >
                  {`${(cca2 || 'IN')
                    .toUpperCase()
                    .replace(/[A-Z]/g, character =>
                      String.fromCodePoint(character.charCodeAt(0) + 127397),
                    )}  ${countryCode?.startsWith('+') ? countryCode : `+${countryCode || '91'}`}`}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <InputBox
          placeholder={
            translateData?.enterPhoneandEmailBoth || 'Phone number or email'
          }
            placeholderTextColor={
              isDark ? appColors.darkText : appColors.secondaryFont
            }
            value={phoneNumber}
            onChangeText={handlePhoneNumberChange}
            keyboardType="email-address"
            backgroundColors={
              isDark ? appColors.primaryFont : appColors.graybackground
            }
            autoCapitalize="none"
            borderColor={
              isDark ? appColors.primaryFont : appColors.graybackground
            }
            style={{
              flex: 1,
              marginLeft: numberShow && !rtl ? windowWidth(1.5) : 0,
              marginRight: numberShow && rtl ? windowWidth(1.5) : 0,
              height: numberShow ? windowHeight(6) : windowHeight(6.7),
              color: isDark ? appColors.darkText : appColors.primaryFont,
              textAlign: rtl ? 'right' : 'left',
            }}
          />
        </View>

        {error ? (
          <Text style={[styles.errorText, { textAlign: textRtlStyle }]}>
            {error}
          </Text>
        ) : requestError ? (
          <Text style={[styles.errorText, { textAlign: textRtlStyle }]}>
            {requestError}
          </Text>
        ) : null}
      </View>

      <View style={styles.button}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingBottom: windowHeight(2),
          }}
        >
          <View style={{ width: '100%' }}>
            <Button
              onPress={() => handleGetOTP('driver')}
              title={translateData?.driver || 'Driver'}
              backgroundColor={appColors.primary}
              color={appColors.white}
              loading={driverLoading}
            />
          </View>

          {/*<View style={{ width: '50%' }}>
            <Button
              onPress={() => handleGetOTPFleet('fleet')}
              title={translateData?.fleet || 'Fleet'}
              backgroundColor={appColors.primary}
              color={appColors.white}
              loading={fleetLoading}
            />
          </View>*/}
        </View>
      </View>

      {settingData?.values?.activation?.social_login_enable !== '0' && (
        <View style={{ marginHorizontal: windowWidth(4), marginTop: windowHeight(2) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: windowHeight(2) }}>
            <View style={{ flex: 1, height: 1, backgroundColor: appColors.border }} />
            <Text style={{ marginHorizontal: windowWidth(3), color: appColors.secondaryFont }}>
              {translateData?.or || 'Or'}
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: appColors.border }} />
          </View>
          <TouchableOpacity
            onPress={googleLogin}
            disabled={googleLoading}
            activeOpacity={0.7}
            style={{
              minHeight: windowHeight(6),
              borderRadius: windowWidth(1.5),
              backgroundColor: isDark ? appColors.primaryFont : appColors.graybackground,
              flexDirection: viewRtlStyle,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: googleLoading ? 0.7 : 1,
            }}
          >
            <Icons.Google />
            <Text style={{ marginLeft: windowWidth(2), color: isDark ? appColors.white : appColors.primaryFont }}>
              {googleLoading ? 'Signing in...' : translateData?.google || 'Continue with Google'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {pickerVisible && (
        <CountrySelect
          visible={pickerVisible}
          onSelect={country => {
            const callingCode = country.idd.root + (country.idd.suffixes[0] || '')
            setCountryCode?.(callingCode)
            setCca2?.(country.cca2)
            setPickerVisible(false)
            setIsFocused(false)
          }}
          onClose={() => {
            setPickerVisible(false)
            setIsFocused(false)
          }}
          theme={isDark ? 'dark' : 'light'}
          modalType="bottomSheet"
        />
      )}
    </View>
  )
}
