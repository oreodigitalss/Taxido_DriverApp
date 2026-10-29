import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useRoute, useNavigation } from '@react-navigation/native'
import { styles } from './styles'
import {
  Button,
  Header,
  Input,
  notificationHelper,
} from '../../../commonComponents'
import { useValues } from '../../../utils/context'
import { useDispatch, useSelector } from 'react-redux'
import appColors from '../../../theme/appColors'
import {
  windowHeight,
  windowWidth,
  fontSizes,
} from '../../../theme/appConstant'
import appFonts from '../../../theme/appFonts'
import CountrySelect from 'react-native-country-select'
import { ICountry } from 'react-native-country-select/lib/interface/country'
import {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
} from '@gorhom/bottom-sheet'
import OTPTextInput from 'react-native-otp-textinput'
import {
  selfDriverData,
  updateMobileEmail,
  verifyMobileEmail,
} from '../../../api/store/action'
import { UpdateProfileInterface } from '../../../api/interface/accountInterface'
import { AppDispatch } from '../../../api/store'

export function EditDetails() {
  const route = useRoute()
  const navigation = useNavigation()
  const { field, formData } = route.params as { field: string; formData: any }
  const { isDark, viewRtlStyle, rtl } = useValues()
  const { translateData } = useSelector((state: any) => state.setting)

  const [phoneNumber, setPhoneNumber] = useState(
    formData?.phoneNumber ? String(formData.phoneNumber) : '',
  )
  const [email, setEmail] = useState(formData?.email || '')
  const [selectedCountry, setSelectedCountry] = useState<ICountry | null>(null)
  const [countryPickerVisible, setCountryPickerVisible] = useState(false)
  const [otp, setOtp] = useState('')
  const [isOtpSheetOpen, setIsOtpSheetOpen] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [otpVerifyLoading, setOtpVerifyLoading] = useState(false)
  const dispatch = useDispatch<AppDispatch>()
  const otpBottomSheetRef = useRef<BottomSheetModal>(null)
  const otpInputRef = useRef<OTPTextInput>(null)
  const textInputRef = useRef<any>()

  // Update phoneNumber and email when formData changes
  useEffect(() => {
    if (formData?.phoneNumber) {
      setPhoneNumber(String(formData.phoneNumber))
    }
    if (formData?.email) {
      setEmail(formData.email)
    }
  }, [formData])

  const getPrimaryCallingCode = useCallback(
    (country: ICountry | null): string => {
      if (!country) return '+1'
      const root = country.idd?.root || '+'
      const suffix = country.idd?.suffixes?.[0] || ''
      return root + suffix
    },
    [],
  )

  const handleCountrySelect = useCallback((country: ICountry) => {
    setSelectedCountry(country)
    setCountryPickerVisible(false)
  }, [])

  const handleVerify = useCallback(() => {
    setVerifyLoading(true)

    const isMobile = field === 'mobile'

    const payload: UpdateProfileInterface = isMobile
      ? {
          phone: phoneNumber,
          country_code: (selectedCountry?.idd?.root || '1').replace('+', ''),
        }
      : {
          email: email,
        }

    dispatch(updateMobileEmail(payload) as any)
      .unwrap()
      .then(() => {
        setVerifyLoading(false)
        setIsOtpSheetOpen(true)
        otpBottomSheetRef.current?.present()
      })
      .catch(() => {
        setVerifyLoading(false)
        notificationHelper('', translateData.somethingWrong, 'error')
      })
  }, [field, email, phoneNumber, selectedCountry])

  const handleOtpVerify = useCallback(() => {
    setOtpVerifyLoading(true)

    const isMobile = field === 'mobile'

    const payload = {
      token: otp,
      email_or_phone: isMobile ? phoneNumber : email,
      ...(isMobile && {
        country_code: (selectedCountry?.idd?.root || '1').replace('+', ''),
      }),
    }

    dispatch(verifyMobileEmail(payload) as any)
      .unwrap()
      .then(res => {
        if (res?.status === 200) {
          dispatch(selfDriverData())
            .unwrap()
            .then(res => {
              navigation.goBack()
              otpBottomSheetRef.current?.close()
              setOtpVerifyLoading(false)
            })
        }
      })
      .catch(() => {
        setOtpVerifyLoading(false)
        notificationHelper('', translateData.somethingWrong, 'error')
      })
  }, [otp, field, phoneNumber, email, selectedCountry])

  const handleOpenCountryPicker = useCallback(() => {
    setCountryPickerVisible(true)
  }, [])

  const handleCloseCountryPicker = useCallback(() => {
    setCountryPickerVisible(false)
  }, [])

  const formatPhoneNumber = useCallback((): string => {
    let code = selectedCountry
      ? getPrimaryCallingCode(selectedCountry)
      : formData?.countryCode || ''

    if (!code.startsWith('+')) {
      code = `+${code}`
    }

    return code
  }, [selectedCountry, getPrimaryCallingCode, formData?.countryCode])

  const [isFocused, setIsFocused] = useState(false)

  return (
    <BottomSheetModalProvider>
      <View
        style={{
          flex: 1,
          backgroundColor: isDark ? appColors.bgDark : appColors.lightGray,
        }}
      >
        <Header
          title={
            field === 'email'
              ? translateData.email
              : translateData?.mobileNumber
          }
        />

        <View
          style={{
            paddingHorizontal: windowWidth(2),
            backgroundColor: isDark ? appColors.bgDark : appColors.white,
            marginTop: windowHeight(2),
            borderWidth: 1,
            borderColor: isDark ? appColors.darkborder : appColors.border,
            borderRadius: windowHeight(2),
            marginHorizontal: windowWidth(2),
          }}
        >
          <Text
            style={{
              color: isDark ? appColors.white : appColors.black,
            }}
          >
            {field == 'mobile'
              ? translateData.updatePhoneNumber
              : translateData.updateEmail}
          </Text>

          {field == 'mobile' ? (
            <View style={{ marginHorizontal: windowWidth(2) }}>
              <Text
                style={{
                  color: isDark ? appColors.white : appColors.primaryFont,
                  marginBottom: windowHeight(1),
                }}
              >
                {translateData.mobileNumber}
              </Text>
              <View
                style={{
                  flexDirection: viewRtlStyle,
                  justifyContent: 'space-between',
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.countryCodeContainer,
                    isDark && styles.darkCountryCodeContainer,
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isDark
                        ? appColors.darkThemeSub
                        : appColors.lightGray,
                    },
                  ]}
                  onPress={handleOpenCountryPicker}
                  disabled={isOtpSheetOpen}
                >
                  <Text
                    style={[
                      styles.codeText,
                      {
                        color: isDark ? appColors.white : appColors.black,
                        fontSize: fontSizes.FONT3,
                      },
                    ]}
                  >
                    {formatPhoneNumber()}
                  </Text>
                </TouchableOpacity>

                <View
                  style={[
                    styles.phoneNumberInput,
                    isDark && styles.darkPhoneNumberInput,
                    {
                      width: '78%',
                      borderWidth: isFocused ? windowWidth(0.3) : 0,
                      borderColor: isFocused
                        ? appColors.primary
                        : 'transparent',
                    },
                  ]}
                >
                  <TextInput
                    ref={textInputRef}
                    editable={!isOtpSheetOpen}
                    style={{
                      left: rtl ? windowWidth(10) : windowWidth(4),
                      color: isDark ? appColors.white : appColors.black,
                      width: '90%',
                      fontFamily: appFonts.regular,
                      fontSize: fontSizes.FONT3HALF,
                    }}
                    placeholderTextColor={
                      isDark ? appColors.darkText : appColors.black
                    }
                    placeholder={translateData.enternewPhone}
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                  />
                </View>
              </View>
            </View>
          ) : (
            <View style={{ marginHorizontal: windowWidth(2) }}>
              <Input
                ref={textInputRef}
                editable={!isOtpSheetOpen}
                title={translateData.email}
                titleShow={true}
                borderColor={
                  isDark ? appColors.darkborder : appColors.lightGray
                }
                backgroundColor={
                  isDark ? appColors.darkThemeSub : appColors.lightGray
                }
                placeholder={translateData.enternewEmail}
                value={email}
                onChangeText={setEmail}
                style={styles.input}
              />
            </View>
          )}

          <View
            style={{
              marginTop: windowHeight(3),
              marginBottom: windowHeight(2),
              marginHorizontal: windowWidth(-2),
            }}
          >
            <Button
              title={translateData.verify}
              onPress={handleVerify}
              backgroundColor={appColors.primary}
              color={appColors.white}
              loading={verifyLoading}
            />
          </View>

          {countryPickerVisible && (
            <CountrySelect
              visible={true}
              onClose={handleCloseCountryPicker}
              onSelect={handleCountrySelect}
              theme={isDark ? 'dark' : 'light'}
              showAlphabetFilter={true}
              showSearchInput={true}
            />
          )}

          <BottomSheetModal
            ref={otpBottomSheetRef}
            snapPoints={['28%']}
            onChange={index => {
              if (index >= 0) setIsOtpSheetOpen(true)
              else setIsOtpSheetOpen(false)
            }}
            handleIndicatorStyle={{
              backgroundColor: appColors.primary,
              width: '13%',
            }}
            backgroundStyle={{
              backgroundColor: isDark ? appColors.bgDark : appColors.white,
            }}
          >
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <BottomSheetView
                style={{
                  padding: windowWidth(2),
                  flex: 1,
                }}
              >
                <Text
                  style={{
                    color: isDark ? appColors.white : appColors.primaryFont,
                    marginBottom: windowHeight(1),
                    fontFamily: appFonts.regular,
                  }}
                >
                  OTP sent to{' '}
                  {field === 'mobile'
                    ? `${formatPhoneNumber()} ${phoneNumber}`
                    : email}
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    marginBottom: windowHeight(3),
                  }}
                >
                  <OTPTextInput
                    ref={otpInputRef}
                    inputCount={6}
                    handleTextChange={value => {
                      setOtp(value)
                    }}
                    textInputStyle={{
                      width: windowHeight(6),
                      height: windowHeight(6),
                      borderWidth: windowWidth(0.45),
                      borderColor: isDark
                        ? appColors.darkborder
                        : appColors.border,
                      borderRadius: windowHeight(1),
                      backgroundColor: isDark
                        ? appColors.darkThemeSub
                        : appColors.lightGray,
                      borderBottomWidth: windowWidth(0.45),
                    }}
                    keyboardType="numeric"
                    tintColor={appColors.primary}
                    offTintColor={
                      isDark ? appColors.darkborder : appColors.lightGray
                    }
                    defaultValue={otp}
                  />
                </View>

                <Button
                  title={translateData.verify}
                  onPress={handleOtpVerify}
                  backgroundColor={appColors.primary}
                  color={appColors.white}
                  loading={otpVerifyLoading}
                />
              </BottomSheetView>
            </KeyboardAvoidingView>
          </BottomSheetModal>
        </View>
      </View>
    </BottomSheetModalProvider>
  )
}
